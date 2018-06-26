/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
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
							["internalid","noneof","@NONE@"], 
							"AND", 
							["custrecord_itpm_p_ispromoplancomplete","is","T"], 
							"AND", 
							["isinactive","is","F"]
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
  		log.debug('promotionID',promoID);
  		log.debug('arrResult',arrResult);
    		/*
    		 Deleting the Promotion Related records
    		 */
    		//Array of objects with record type and field ids
    		var searchRecs = [{
    			type:'customrecord_itpm_promoallowance',
    			promoFieldId:'custrecord_itpm_all_promotiondeal'
    		},{
    			type:'customrecord_itpm_estquantity',
    			promoFieldId:'custrecord_itpm_estqty_promodeal'
    		},{
    			type:'customrecord_itpm_promoretailevent',
    			promoFieldId:'custrecord_itpm_rei_promotiondeal'
    		},{
    			type:'customrecord_itpm_kpi',
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
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_mop"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_rate"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_percent"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_additionaldisc"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_base"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_incremental"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_redemption"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_esteverydayprice"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_estmerchprice"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_estacvdisplay"
	    				}),
	    				search.createColumn({
	    					name: "custrecord_itpm_pp_activity"
	    				})
    				],
    				filters: [
    					["custrecord_itpm_pp_promotion","anyof",promoID], 
    					"AND", 
    					["isinactive","is","false"]
    					]  
    		});
    		/*var searchResultCount = promoPlanRecSearch.runPaged().count;
    		log.debug("transactionSearchObj count",searchResultCount);
    		if(searchResultCount <= 0){
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
    			var allMOP = result.getValue({
    				name: 'custrecord_itpm_pp_mop'
    			});
    			var allRate = result.getValue({
    				name: 'custrecord_itpm_pp_rate'
    			});
    			var allPer = result.getValue({
    				name: 'custrecord_itpm_pp_percent'
    			});
    			var additionalDisc = result.getValue({
    				name: 'custrecord_itpm_pp_additionaldisc'
    			});
    			var baseQty = result.getValue({
    				name: 'custrecord_itpm_pp_base'
    			});
    			var incrementalQty = result.getValue({
    				name: 'custrecord_itpm_pp_incremental'
    			});
    			var redemptionFactor = result.getValue({
    				name: 'custrecord_itpm_pp_redemption'
    			});
    			var estEverydayPrice = result.getValue({
    				name: 'custrecord_itpm_pp_esteverydayprice'
    			});
    			var estMerchPrice = result.getValue({
    				name: 'custrecord_itpm_pp_estmerchprice'
    			});
    			var estAcvDisplay = result.getValue({
    				name: 'custrecord_itpm_pp_estacvdisplay'
    			});
    			var ReatailActivity = result.getValue({
    				name: 'custrecord_itpm_pp_activity'
    			});
//    			log.debug('map promoPlanRecId',promoPlanRecId);
//    			log.debug('map itemId',itemId);
    			context.write({
        			key:{
        				promoID:promoID,
        				promoPlanRecId:promoPlanRecId
        			},
        			value:{
        				itemId:itemId,
        				itemUnit:itemUnit,
        				allMOP:allMOP,
        				allRate:allRate,
        				allPer:allPer,
        				additionalDisc:additionalDisc,
        				baseQty:baseQty,
        				incrementalQty:incrementalQty,
        				redemptionFactor:redemptionFactor,
        				estEverydayPrice:estEverydayPrice,
        				estMerchPrice:estMerchPrice,
        				estAcvDisplay:estAcvDisplay,
        				ReatailActivity:ReatailActivity
        			}
        		});
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
//    		log.debug('reduce context',context);
    		//submitting the records with calculated allowance contribution value

    		var promoPalnKey = JSON.parse(context.key);
    		log.debug('promoPalnKey',promoPalnKey);
    		var promoPlanValues = JSON.parse(context.values[0]);
    		log.debug('promoPlanValues',promoPlanValues);
    		var promoId = promoPalnKey.promoID;
    		var promoPlanRecId = promoPalnKey.promoPlanRecId;    		
    		var itemId = promoPlanValues.itemId;
    		var itemUnit = promoPlanValues.itemUnit;
    		var allMOP = promoPlanValues.allMOP;
    		var allRate = (promoPlanValues.allRate)?parseFloat(promoPlanValues.allRate):0;
    		var allPer = (promoPlanValues.allPer)?parseFloat(promoPlanValues.allPer):0;
    		var additionalDisc = promoPlanValues.additionalDisc;
    		var baseQty = (promoPlanValues.baseQty)?parseFloat(promoPlanValues.baseQty):0;    		
    		var incrementalQty = promoPlanValues.incrementalQty;
    		var redemptionFactor = (promoPlanValues.redemptionFactor)?parseFloat(promoPlanValues.redemptionFactor):0;
    		var estEverydayPrice = (promoPlanValues.estEverydayPrice)?parseFloat(promoPlanValues.estEverydayPrice):0;
    		var estMerchPrice = (promoPlanValues.estMerchPrice)?parseFloat(promoPlanValues.estMerchPrice):0;
    		var estAcvDisplay = (promoPlanValues.estAcvDisplay)?parseFloat(promoPlanValues.estAcvDisplay):0;
    		var ReatailActivity = promoPlanValues.ReatailActivity;
//  		log.debug('reduce promoID',promoID);
//  		log.debug('reduce promoPlanRecId',promoPlanRecId);
//  		log.debug('reduce itemId',itemId);
//    		log.debug('itemUnit',itemUnit);
//    		log.debug('allRate',allRate);
//    		log.debug('allPer',allPer);
    		var promoLookup = search.lookupFields({
    		    type:'customrecord_itpm_promotiondeal',
    		    id:promoId,
    		    columns:['custrecord_itpm_p_itempricelevel',
    		    		 'custrecord_itpm_p_type',
    		    		 'custrecord_itpm_p_subsidiary'
    		    		]
    		});
    		//log.debug('promoLookup',promoLookup);
    		var promoLookupForPL = promoLookup.custrecord_itpm_p_itempricelevel[0].value;
    		var promoType = promoLookup.custrecord_itpm_p_type[0].value
    		//log.debug('promoLookupForPL ',promoLookupForPL +'   promoType  '+promoType);
    		var prefObj = itpm.getPrefrenceValues(promoLookup.custrecord_itpm_p_subsidiary[0].value);
    		
    		var promoTypeLookupForAccount = search.lookupFields({
    		    type:'customrecord_itpm_promotiontype',
    		    id:promoType,
    		    columns:['custrecord_itpm_pt_defaultaccount']
    		}).custrecord_itpm_pt_defaultaccount[0].value;
//    		log.debug('promoTypeLookupForAccount',promoTypeLookupForAccount);
        	var recordType = search.lookupFields({
    		    type:search.Type.ITEM,
    		    id:itemId,
    		    columns:['recordtype']
    		}).recordtype;
        	//log.debug('itemId',itemId);
        	if(recordType == search.Type.ITEM_GROUP){
        		var itemGroupRec = record.load({
            		type:record.Type.ITEM_GROUP,
            		id:itemId
            	});
//        		log.debug('itemGroupRec',itemGroupRec);
        		var items = itpm.getItemGroupItems(itemGroupRec,false,false); //get the list of item members array
//        		log.debug('items',items);
        		
        		
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
//        		log.debug('filtered items out',items);
        		
    			//validating the units and base price
        		items.forEach(function(item,i){
        			//log.debug('items in I  '+ i,item);
        			if(items[i-1] && (items[i-1].saleunit != item.saleunit || items[i-1].unitstype != item.unitstype)){
        				//return
        			}else if(item.baseprice <= 0){
        				//return
        			} else {
        				var unitsArray = itpm.getItemUnits(item.memberid)['unitArray']; //get the list of unists array
                		//log.debug('unitsArray',unitsArray);
                		var itemUnitRate = parseFloat(unitsArray.filter(function(e){return e.id == item.saleunit})[0].conversionRate); //member item sale unit rate conversion rate
                		//log.debug('itemUnitRate',itemUnitRate);
                		var rate = parseFloat(unitsArray.filter(function(e){return e.id == itemUnit})[0].conversionRate); //member item base unit conversion rate
                		//log.debug('rate',rate);
                		var allowAddinalDiscounts = search.create({
            				type:'customrecord_itpm_promoallowance',
            				columns:['internalid'],
            				filters:[['custrecord_itpm_all_item','anyof',item.memberid],'and',
            						 ['custrecord_itpm_all_promotiondeal','anyof',promoId],'and',
            						 ['custrecord_itpm_all_allowaddnaldiscounts','is',true],'and',
            						 ['isinactive','is',false]]
            			}).run().getRange(0,2).length > 0 || itemGroupRec.getValue('custrecord_itpm_pp_additionaldisc')
//            			log.debug('allowAddinalDiscounts',allowAddinalDiscounts);
        				var priceObj = itpm.getImpactPrice({pid:promoId,itemid:item.memberid,pricelevel:promoLookupForPL,baseprice:item.baseprice});
//        				log.debug('priceObj',priceObj);
            			
            			//Allowance record creation
        				var allNewRec = record.create({
        				       type: 'customrecord_itpm_promoallowance'                      
        				});
        				//log.audit('allNewRec ',allNewRec);
        				allNewRec.setValue({
                			fieldId:'custrecord_itpm_all_promotiondeal',
                			value:promoId
                		}).setValue({
                			fieldId:"custrecord_itpm_all_item",
                			value:item.memberid
                		}).setValue({
                			fieldId:"custrecord_itpm_all_itembaseprice",
                			value:item.baseprice
                		}).setValue({
                			fieldId:"custrecord_itpm_all_impactprice",
                			value:priceObj.price
                		}).setValue({
                			fieldId:"custrecord_itpm_all_uom",
                			value:itemUnit
                		}).setValue({
                			fieldId:"custrecord_itpm_all_uomprice",
                			value:parseFloat(priceObj.price)*(rate/itemUnitRate)
                		}).setValue({
                			fieldId:"custrecord_itpm_all_allowaddnaldiscounts",
                			value:(allowAddinalDiscounts)?true:false
                		}).setValue({
                			fieldId:"custrecord_itpm_all_account",
                			value:promoTypeLookupForAccount
                		}).setValue({
                			fieldId:"custrecord_itpm_all_type",
                			value:prefObj.defaultAllwType
                		}).setValue({
                			fieldId:"custrecord_itpm_all_mop",
                			value:allMOP
                		}).setValue({
                			fieldId:"custrecord_itpm_all_allowancepercent",
                			value:allPer
                		}).setValue({
                			fieldId:"custrecord_itpm_all_allowancerate",
                			value:allRate
                		});//custrecord_itpm_all_pricelevel
        				var allNewRecId = allNewRec.save({
                			enableSourcing:false,
                			ignoreMandatoryFields:true
                		});
        				log.audit('allNewRecId',allNewRecId);
        				
        				//Est.Qty record creation
        				var estQtyNewRec = record.create({
     				       type: 'customrecord_itpm_estquantity'                      
        				});
        				estQtyNewRec.setValue({
                			fieldId:'custrecord_itpm_estqty_promodeal',
                			value:promoId
                		}).setValue({
                			fieldId:"custrecord_itpm_estqty_item",
                			value:item.memberid
                		}).setValue({
                			fieldId:"custpage_itpm_estqty_unit",
                			value:itemUnit
                		}).setValue({
                			fieldId:"custrecord_itpm_estqty_qtyentryoptions",
                			value:4
                		}).setValue({
                			fieldId:"custrecord_itpm_estqty_baseqty",
                			value:baseQty
                		})/*.setValue({
                			fieldId:"custrecord_itpm_estqty_totalqty",
                			value:''
                		})*/.setValue({
                			fieldId:"custrecord_itpm_estqty_incrementalqty",
                			value:incrementalQty
                		}).setValue({
                			fieldId:"custrecord_itpm_estqty_redemption",
                			value:redemptionFactor
                		});
        				var estQtyNewRecId = estQtyNewRec.save({
                			enableSourcing:false,
                			ignoreMandatoryFields:true
                		});
        				log.audit('estQtyNewRecId',estQtyNewRecId);
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
