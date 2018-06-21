/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record',
		'N/search',
		'./iTPM_Module.js'
		],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, itpm) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
    	try{
			/********* Getting Promotion/Deal InternalIDs which has Is Promotion Planning Complete? check-box is checked  **********/
			return search.create({
				type:'customrecord_itpm_promotiondeal',
				columns: [
					search.createColumn({
						name: "internalid"
					})
				],
				filters: [
					["custrecord_itpm_p_copiedfrom","noneof","@NONE@"], "and" ,
				    ["custrecord_itpm_p_ispromoplancomplete","is","T"], "and", 
					["isinactive","is","false"]
				]  
			})
		}catch(ex){
			log.error(ex.name,'getInputData state, message = '+ex.message);
		}
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	try{
    		var searchResult = JSON.parse(context.value);
    		var arrResult = searchResult.values;
    		var promoID = arrResult.internalid.value;
    		var contextObj = null,executeResultSet = []

//  		log.debug('searchResult',searchResult);
//  		log.debug('promotionID',promoID);
//  		log.debug('arrResult',arrResult);
    		/*
    		 Deleting the Promotion Related records
    		 */
    		//Array of objects with record type and field ids
    		var searchRecs = [{
    			type:'customrecord_itpm_promoallowance',
    			itemFieldId:'custrecord_itpm_all_item',
    			promoFieldId:'custrecord_itpm_all_promotiondeal'
    		},{
    			type:'customrecord_itpm_estquantity',
    			itemFieldId:'custrecord_itpm_estqty_item',
    			promoFieldId:'custrecord_itpm_estqty_promodeal'
    		},{
    			type:'customrecord_itpm_promoretailevent',
    			itemFieldId:'custrecord_itpm_rei_item',
    			promoFieldId:'custrecord_itpm_rei_promotiondeal'
    		},{
    			type:'customrecord_itpm_kpi',
    			itemFieldId:'custrecord_itpm_kpi_item',
    			promoFieldId:'custrecord_itpm_kpi_promotiondeal'
    		}];
    		
    		//Loop through the array and create the EstQty,Retail Info and kpi inactive records
    		searchRecs.forEach(function(obj,index){
    			search.create({
    				type:obj.type,
    				columns:['internalid'],
    				filters:[[obj.promoFieldId,'anyof',promoID]]
    			}).run().each(function(result){
    				record.delete({
    					type:obj.type,
    					id:result.getValue('internalid')
    				});
    				return true;
    			});
    		});
    		
    		
    		var promoPlanRecSearch = search.create({
    			type: "customrecord_itpm_promotion_planning",
    			columns:[
	    				search.createColumn({
	    					name: "internalid"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_promotion"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_item"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_unit"
	    				})
    				],
    				filters: [
    					["custrecord_itpm_pp_promotion","anyof",promoID], 
    					"AND", 
    					["isinactive","is","false"]
    					]  
    		});
    		var searchResultCount = promoPlanRecSearch.runPaged().count;
//    		log.debug("transactionSearchObj count",searchResultCount);
    		/*if(searchResultCount <= 0){
				record.submitFields({
					type: 'customrecord_itpm_promotiondeal',
					id: promoID,
					values: {
						custrecord_itpm_p_ispromoplancomplete: false
					},
					options: {
						enableSourcing: false,
						ignoreMandatoryFields : true
					}
				});
			}*/

    		//Write the data into the context.
    		promoPlanRecSearch.run().each(function(result) {
    			var promoPlanRecId = result.getValue({
    				name: 'internalid'
    			});
    			var itemId = result.getValue({
    				name: 'custrecord_itpm_pp_item'
    			});
    			var itemUnit = result.getValue({
    				name: 'custrecord_itpm_pp_unit'
    			});
//    			log.debug('map promoPlanRecId',promoPlanRecId);
//    			log.debug('map itemId',itemId);
    			context.write({promoID:promoID,promoPlanRecId:promoPlanRecId,itemId:itemId,itemUnit:itemUnit});
    			return true;
    		});
    	}catch(ex){
    		log.error(ex.name, ex.message);
    	}

    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
    	try{
    		var searchResult = JSON.parse(context.key);
    		var promoId = searchResult.promoID;
    		var promoPlanRecId = searchResult.promoPlanRecId;
    		var itemId = searchResult.itemId;
    		var itemUnit = searchResult.itemUnit;

//  		log.debug('reduce promoID',promoID);
//  		log.debug('reduce promoPlanRecId',promoPlanRecId);
//  		log.debug('reduce itemId',itemId);
    		log.debug('itemUnit',itemUnit);
    		var promoLookup = search.lookupFields({
    		    type:'customrecord_itpm_promotiondeal',
    		    id:promoId,
    		    columns:['custrecord_itpm_p_itempricelevel']
    		}).custrecord_itpm_p_itempricelevel;
        	var recordType = search.lookupFields({
    		    type:search.Type.ITEM,
    		    id:itemId,
    		    columns:['recordtype']
    		}).recordtype;
        	log.debug('itemId',itemId);
        	if(recordType == search.Type.ITEM_GROUP){
        		var itemGroupRec = record.load({
            		type:record.Type.ITEM_GROUP,
            		id:itemId
            	});
//        		log.debug('itemGroupRec',itemGroupRec);
        		var items = itpm.getItemGroupItems(itemGroupRec,false,false); //get the list of item members array
        		log.debug('items',items);
        		
        		
        		//already allowance created with this item
        		var listOfItems = [];
        		search.create({
    				type:'customrecord_itpm_promoallowance',
    				columns:['internalid','custrecord_itpm_all_item'],
    				filters:[['custrecord_itpm_all_item','anyof',items.map(function(e){ return e.memberid })],'and',
    						 ['custrecord_itpm_all_promotiondeal','anyof',promoId],'and',
    						 ['custrecord_itpm_all_allowaddnaldiscounts','is',false],'and',
    						 ['isinactive','is',false]]
    			}).run().each(function(e){
    				listOfItems.push(e.getValue('custrecord_itpm_all_item'));
    				return true;
    			});
        		items = items.filter(function(e){ return listOfItems.filter(function(k){return k == e.memberid}).length <= 0 });
        		log.debug('filtered items out',items);
        		
    			//validating the units and base price
        		items.forEach(function(item,i){
        			log.debug('items in',item);
        			if(items[i-1] && (items[i-1].saleunit != item.saleunit || items[i-1].unitstype != item.unitstype)){
        				return
        			}else if(item.baseprice <= 0){
        				return
        			} else {
        				var unitsArray = itpm.getItemUnits(items[0].memberid)['unitArray']; //get the list of unists array
                		log.debug('unitsArray',unitsArray);
                		var itemUnitRate = parseFloat(unitsArray.filter(function(e){return e.id == items[0].saleunit})[0].conversionRate); //member item sale unit rate conversion rate
                		log.debug('itemUnitRate',itemUnitRate);
                		var rate = parseFloat(unitsArray.filter(function(e){return e.id == itemUnit})[0].conversionRate); //member item base unit conversion rate
                		log.debug('rate',rate);
                		var allowAddinalDiscounts = search.create({
            				type:'customrecord_itpm_promoallowance',
            				columns:['internalid'],
            				filters:[['custrecord_itpm_all_item','anyof',items[0].memberid],'and',
            						 ['custrecord_itpm_all_promotiondeal','anyof',promoId],'and',
            						 ['custrecord_itpm_all_allowaddnaldiscounts','is',true],'and',
            						 ['isinactive','is',false]]
            			}).run().getRange(0,2).length > 0 || itemGroupRec.getValue('custrecord_itpm_pp_additionaldisc')
            			log.debug('allowAddinalDiscounts',allowAddinalDiscounts);
        				var priceObj = itpm.getImpactPrice({pid:promoId,itemid:items[0].memberid,pricelevel:promoLookup});
        				var allNewRec = record.create({
        				       type: 'customrecord_itpm_promoallowance',
        				       isDynamic: true                       
        				   });
        				allNewRec.setValue({
                			fieldId:"custrecord_itpm_all_item",
                			value:items[0].memberid
                		}).setValue({
                			fieldId:"custrecord_itpm_all_itembaseprice",
                			value:items[0].baseprice
                		}).setValue({
                			fieldId:"custrecord_itpm_all_impactprice",
                			value:parseFloat(priceObj.price)
                		}).setValue({
                			fieldId:"custrecord_itpm_all_uomprice",
                			value:parseFloat(priceObj.price)*(rate/itemUnitRate)
                		}).setValue({
                			fieldId:"custrecord_itpm_all_allowaddnaldiscounts",
                			value:(allowAddinalDiscounts)?true:false
                		});
        				/*var allNewRecId = allNewRec.save({
                			enableSourcing:false,
                			ignoreMandatoryFields:true
                		});
        				log.audit('allNewRecId',allNewRecId);*/
        			}
        		});
        		
        		
        	}else{
        		if(recordType == search.Type.ITEM_GROUP) return;
        		var itemLookup = search.lookupFields({
        			type:search.Type.ITEM,
        			id:itemId,
        			columns:['baseprice']
        		});
        		log.debug('baseprice',itemLookup['baseprice']);
        		if(itemLookup['baseprice'] <= 0){
        			throw{
        				name:"INVALID_PRICE",
        				message:"This iTPM Allowance cannot be submitted because the selected item does not have any sale price."
        			};
        		}
        	}
    		
    	}catch(ex){
			log.error(ex.name, ex.message);
		}
    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
