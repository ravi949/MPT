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
//	  		log.debug('promotionID',promoID);
//	  		log.debug('arrResult',arrResult);    		
    		
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
    		var searchResultCount = promoPlanRecSearch.runPaged().count;
//    		log.debug("transactionSearchObj count",searchResultCount);
    		if(searchResultCount <= 0){
				record.submitFields({
					type: 'customrecord_itpm_promotiondeal',
					id: promoID,
					values: {
						'custrecord_itpm_p_ispromoplancomplete': false
					},
					options: {
						enableSourcing: false,
						ignoreMandatoryFields : true
					}
				});
			}

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
//    		log.debug('promoPalnKey',promoPalnKey);
    		var promoPlanValues = JSON.parse(context.values[0]);
//    		log.debug('promoPlanValues',promoPlanValues);
    		var promoId = promoPalnKey.promoID;
    		var promoPlanRecId = promoPalnKey.promoPlanRecId;    		
    		var itemId = promoPlanValues.itemId;
    		var groupItems = [];//for Est.Qty search
    		var unitMisMatchedItems = []; // Unit miss matched items to show in Promotion Planning record RESPONSE field.
    		var promoLookup = search.lookupFields({
    		    type:'customrecord_itpm_promotiondeal',
    		    id:promoId,
    		    columns:['custrecord_itpm_p_itempricelevel',
    		    		 'custrecord_itpm_p_type',
    		    		 'custrecord_itpm_p_subsidiary',
                          'custrecord_itpm_p_isplanlinkrecdeleted'
    		    		]
    		});
//    		log.debug('promoLookup',promoLookup);
    		log.debug('promoLookup  ',promoLookup.custrecord_itpm_p_isplanlinkrecdeleted);
    		if(!promoLookup.custrecord_itpm_p_isplanlinkrecdeleted){
    			log.debug('Delelting linked records for promo: '+promoId,!promoLookup.custrecord_itpm_p_isplanlinkrecdeleted);
    	   		//Deleting the Promotion Related records    	   		 
    	   		//Array of objects with record type and field id's
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
    	   		searchRecs.forEach(function(obj){
    	   			search.create({
    	   				type:obj.type,
    	   				columns:['internalid'],
    	   				filters:[[obj.promoFieldId,'anyof',promoId]]
    	   			}).run().each(function(result){
    	   				record.delete({
    	   					type:obj.type,
    	   					id:result.getValue('internalid')
    	   				});
    	   				return true;
    	   			});
    	   		});
    	   		record.submitFields({
    			    type: 'customrecord_itpm_promotiondeal',
    			    id: promoId,
    			    values: {
    			    	'custrecord_itpm_p_isplanlinkrecdeleted': 'T'
    			    },
    			    options: {
    			        enableSourcing: false,
    			        ignoreMandatoryFields : true
    			    }
    			});	
    		}
    	 
    		
    		promoPlanValues.promoLookupForPL = promoLookup.custrecord_itpm_p_itempricelevel[0].value;
    		var prefObj = itpm.getPrefrenceValues(promoLookup.custrecord_itpm_p_subsidiary[0].value);
//    		checking the record for validating the MOP with p.getValue('custrecord_itpm_pt_validmop')
    		var promoTypeLookup = search.lookupFields({
    		    type:'customrecord_itpm_promotiontype',
    		    id:promoLookup.custrecord_itpm_p_type[0].value,
    		    columns:['custrecord_itpm_pt_defaultaccount','custrecord_itpm_pt_validmop']
    		});
    		var isValidMOP = promoTypeLookup.custrecord_itpm_pt_validmop.some(function(e){return e.value == promoPlanValues.allMOP});
    		log.debug('isValidMOP',isValidMOP);
    		if(!isValidMOP){
    			record.submitFields({
        			type: 'customrecord_itpm_promotion_planning',
        			id: promoPlanRecId,
        			values: {
        				'custrecord_itpm_pp_response': 'Selected Method Of Payment is not valid to create Allowances',
        			},
        			options: {
        				enableSourcing: false,
        				ignoreMandatoryFields : true
        			}
        		});
    			return;
    		}
    		promoPlanValues.promoTypeLookupForAccount = promoTypeLookup.custrecord_itpm_pt_defaultaccount[0].value;
//    		log.debug('promoTypeLookupForAccount',promoPlanValues.promoTypeLookupForAccount);
        	var recordType = search.lookupFields({
    		    type:search.Type.ITEM,
    		    id:itemId,
    		    columns:['recordtype']
    		}).recordtype;
        	log.debug('recordType',recordType);
        	if(recordType == search.Type.ITEM_GROUP){
        		var itemGroupRec = record.load({
            		type:record.Type.ITEM_GROUP,
            		id:itemId
            	});
        		
//        		log.debug('itemCount',itemCount);
        		var items = itpm.getItemGroupItems(itemGroupRec,false,false); //get the list of item members array
//        		log.debug('items',items);
        		//already allownace created with this item
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
        		log.debug('items after removing invalid listOfItems',listOfItems);
        		items = items.filter(function(e){ return listOfItems.filter(function(k){return k == e.memberid}).length <= 0 });
        		log.debug('items after removing invalid items',items);
        		var itemCount = items.length;
    			//validating the units and base price
        		items.forEach(function(item,i){
//        			log.debug('items in I  '+ i,item);
        			if(items[i-1] && (items[i-1].saleunit != item.saleunit || items[i-1].unitstype != item.unitstype)){
        				//return
        			}else if(item.baseprice <= 0){
        				//return
        			} else {
        				var unitsArray = itpm.getItemUnits(item.memberid)['unitArray']; //get the list of unists array
        				//log.debug('unitsArray',unitsArray);
        				var itemUnitRate = parseFloat(unitsArray.filter(function(e){return e.id == item.saleunit})[0].conversionRate); //member item sale unit rate conversion rate
        				//log.debug('itemUnitRate',itemUnitRate);
        				var rateArray = unitsArray.filter(function(e){return e.id == promoPlanValues.itemUnit}); //member item base unit conversion rate
//      				log.debug('rate',rateArray);
        				if(rateArray.length > 0){
        					var rate = parseFloat(rateArray[0].conversionRate);
//        					log.debug('rate in If',rate); 
        					groupItems.push(item.memberid);
        					allowanceRecordCreate(  item,				//item record values
				        							promoPlanValues,	//promotion plan record values 
				        							promoPalnKey,		//promoId, PromoPlanId 
				        							prefObj,			//Preference record values
				        							itemUnitRate,
				        							rate
				        					     );
        					estQtyRecordCreate( item,				//item record values
			        							promoPlanValues,	//promotion plan record values 
			        							promoPalnKey,		//promoId, PromoPlanId 
			        							groupItems,			//ItemGroup record items for Est.Qty values
			        							itemCount,			//ItemGroup record total items count for Est.Qty values
			        							(i+1) == itemCount	//Is This last item in ItemGroup or not
			        					      );
        					retailInfoRecordCreate( item,				//item record values
				        							promoPlanValues,	//promotion plan record values 
				        							promoPalnKey,		//promoId, PromoPlanId
				        							(i+1) == itemCount,
				        							listOfItems
				        					       );
        				} else {
        					unitMisMatchedItems.push(item.memberid);
        				}
        			}
        		});
        		
        	 }else{
        		 if(recordType == search.Type.ITEM_GROUP) return;
        		 var itemLookup = search.lookupFields({
        			 type:search.Type.ITEM,
        			 id:itemId,
        			 columns:['baseprice']
        		 });
        		 log.audit('baseprice',itemLookup['baseprice']);
        		 if(itemLookup['baseprice'] <= 0){
        			 record.submitFields({
             			type: 'customrecord_itpm_promotion_planning',
             			id: promoPlanRecId,
             			values: {
             				'custrecord_itpm_pp_response': 'Base Price Of selected Item is Zero.',
             			},
             			options: {
             				enableSourcing: false,
             				ignoreMandatoryFields : true
             			}
             		});
        		 }else{
        			 var itemLookup = search.lookupFields({
        					type:search.Type.ITEM,
        					id:itemId,
        					columns:['custitem_itpm_available','saleunit','baseprice','unitstype','itemid']
        				});
        			 var item = {
     						memberid:itemId,
    						saleunit:(itemLookup['saleunit'].length > 0)?itemLookup['saleunit'][0].value:0,
    						unitstype:(itemLookup['unitstype'].length > 0)?itemLookup['unitstype'][0].value:0,
    						baseprice:itemLookup['baseprice'],
    						isAvailable:itemLookup['custitem_itpm_available']
    					}
//        			 log.debug('item in individual item',item);
        			 var unitsArray = itpm.getItemUnits(item.memberid)['unitArray']; //get the list of unists array
//        				log.debug('unitsArray',unitsArray);
        				var itemUnitRate = parseFloat(unitsArray.filter(function(e){return e.id == item.saleunit})[0].conversionRate); //member item sale unit rate conversion rate
//        				log.debug('itemUnitRate',itemUnitRate);
        				var rateArray = unitsArray.filter(function(e){return e.id == promoPlanValues.itemUnit}); //member item base unit conversion rate
//        				log.debug('rate',rateArray);
        				
        				if(rateArray.length > 0){
        					var rate = parseFloat(rateArray[0].conversionRate);
//        					log.debug('rate in If',rate); 
        					allowanceRecordCreate(  item,           	//item record values
				        							promoPlanValues, 	//promotion plan record values 
				        							promoPalnKey, 	  	//promoId, PromoPlanId 
				        							prefObj, 			//Preference record values
				        							itemUnitRate,
				        							rate
				        						);
        					estQtyRecordCreate( item,           	//item record values
			        							promoPlanValues, 	//promotion plan record values 
			        							promoPalnKey, 	  	//promoId, PromoPlanId 
			        							groupItems,		    //ItemGroup record items for Est.Qty values
			        							1,					//total items count for Est.Qty values
			        							false				// is This last item 
			        						  );
        					retailInfoRecordCreate( item,           	//item record values
				        							promoPlanValues, 	//promotion plan record values 
				        							promoPalnKey, 	  	//promoId, PromoPlanId 
				        							false,
				        							[]
				        						   );
        				}else{
        					unitMisMatchedItems.push(item.memberid);
        				}
        				
        		 }
        	 }
        	/*if(promoPlanValues.estEverydayPrice <= 0){
        		record.submitFields({
        			type: 'customrecord_itpm_promotion_planning',
        			id: promoPlanRecId,
        			values: {
        				'custrecord_itpm_pp_response': 'iTPM Retail Event Information records are not created since There is no EST. EVERYDAY PRICE ',
        			},
        			options: {
        				enableSourcing: false,
        				ignoreMandatoryFields : true
        			}
        		});
        	}*/
        	if(unitMisMatchedItems.length > 0){
        		record.submitFields({
        			type: 'customrecord_itpm_promotion_planning',
        			id: promoPlanRecId,
        			values: {
        				'custrecord_itpm_pp_response': 'Selected Item units are not mcthed with Item units',
        			},
        			options: {
        				enableSourcing: false,
        				ignoreMandatoryFields : true
        			}
        		});
        	}
        	//For unchecking the Promotion Is Planning Completed Check-box.
        	context.write({key:promoId, value:0});
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
    	log.debug('summary ', summary);
    	try{
    		log.debug('summary',summary);
    		var processedPromos = [0];
    		summary.output.iterator().each(function (key, value){
    			if(!processedPromos.some(function(e){return e == key})){
        			log.debug('key in summary',key);
    				record.submitFields({
    					type: 'customrecord_itpm_promotiondeal',
    					id: key,
    					values: {
    						'custrecord_itpm_p_ispromoplancomplete': 'F'
    					},
    					options: {
    						enableSourcing: false,
    						ignoreMandatoryFields : true
    					}
    				});
    			}
    			processedPromos.push(key);
    			return true;
        	});
    	}catch(ex){
    		log.error(ex.name,ex.message);
    	}
    }
    
    function allowanceRecordCreate(item, promoPlanValues, promoPalnKey, prefObj, itemUnitRate, rate){
    	var priceObj = itpm.getImpactPrice({pid:promoPalnKey.promoID,itemid:item.memberid,pricelevel:promoPlanValues.promoLookupForPL,baseprice:item.baseprice});
//		log.debug('priceObj',priceObj);
		var allowAddinalDiscounts = search.create({
			type:'customrecord_itpm_promoallowance',
			columns:['internalid'],
			filters:[['custrecord_itpm_all_item','anyof',item.memberid],'and',
					 ['custrecord_itpm_all_promotiondeal','anyof',promoPalnKey.promoID],'and',
					 ['custrecord_itpm_all_allowaddnaldiscounts','is',true],'and',
					 ['isinactive','is',false]]
		}).run().getRange(0,2).length > 0 || promoPlanValues.additionalDisc
//		log.debug('allowAddinalDiscounts',allowAddinalDiscounts);
    	//Allowance record creation
		var allNewRec = record.create({
		       type: 'customrecord_itpm_promoallowance'                      
		});
		//Setting Allowance Type Dynamically
		var tempAllPer = (promoPlanValues.allPer)?parseFloat(promoPlanValues.allPer):0;
		var tempAllRate = (promoPlanValues.allRate)?parseFloat(promoPlanValues.allRate):0;
		var allType = prefObj.defaultAllwType;
		if(tempAllPer > 0 && tempAllRate > 0)
			allType = prefObj.defaultAllwType;
		else if(tempAllPer > 0)
			allType = 1;
		else 
			allType = 2;
		//log.audit('allNewRec ',allNewRec);
		allNewRec.setValue({
			fieldId:'custrecord_itpm_all_promotiondeal',
			value:promoPalnKey.promoID
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
			value:promoPlanValues.itemUnit
		}).setValue({
			fieldId:"custrecord_itpm_all_uomprice",
			value:parseFloat(priceObj.price)*(rate/itemUnitRate)
		}).setValue({
			fieldId:"custrecord_itpm_all_allowaddnaldiscounts",
			value:(allowAddinalDiscounts)?true:false
		}).setValue({
			fieldId:"custrecord_itpm_all_account",
			value:promoPlanValues.promoTypeLookupForAccount
		}).setValue({
			fieldId:"custrecord_itpm_all_type",
			value:prefObj.defaultAllwType
		}).setValue({
			fieldId:"custrecord_itpm_all_mop",
			value:promoPlanValues.allMOP
		}).setValue({
			fieldId:"custrecord_itpm_all_allowancepercent",
			value:tempAllPer
		}).setValue({
			fieldId:"custrecord_itpm_all_allowancerate",
			value:tempAllRate
		});//custrecord_itpm_all_pricelevel
		var allNewRecId = allNewRec.save({
			enableSourcing:false,
			ignoreMandatoryFields:true
		});
		log.audit('allNewRecId',allNewRecId);
    }
    function estQtyRecordCreate(item, promoPlanValues, promoPalnKey, groupItems, itemCount, isLast){
    	var baseQty = 0;
		var incrementalQty = 0;
		var tempBaseQty = (promoPlanValues.baseQty)?parseFloat(promoPlanValues.baseQty):0;
		var tempIncrementalQty = (promoPlanValues.incrementalQty)?parseFloat(promoPlanValues.incrementalQty):0;
		log.audit('tempIncrementalQty',tempIncrementalQty);
		if(tempBaseQty>0) 
			baseQty = Math.round(tempBaseQty/itemCount);
		if(tempIncrementalQty>0) 
			incrementalQty = Math.round(tempIncrementalQty/itemCount);
		if(isLast){
			var estQtyTotal = search.create({
			   type: "customrecord_itpm_estquantity",
			   filters:
			   [
			      ["custrecord_itpm_estqty_promodeal","anyof",promoPalnKey.promoID], 
			      "AND", 
			      ["custrecord_itpm_estqty_item","anyof",groupItems]
			   ],
			   columns:
			   [
			      search.createColumn({
			         name: "custrecord_itpm_estqty_baseqty",
			         summary: "SUM"
			      }),
			      search.createColumn({
			         name: "custrecord_itpm_estqty_incrementalqty",
			         summary: "SUM"
			      })
			   ]
			}).run().getRange(0,1);
			var baseQtyTotal = estQtyTotal[0].getValue({name:'custrecord_itpm_estqty_baseqty',summary:search.Summary.SUM});
			var incrQtyTotal = estQtyTotal[0].getValue({name:'custrecord_itpm_estqty_incrementalqty',summary:search.Summary.SUM});
			log.debug("baseQtyTotal for promoId: "+promoPalnKey.promoID,baseQtyTotal );
			log.debug("incrQtyTotal for promoId: "+promoPalnKey.promoID,incrQtyTotal );

			baseQty = tempBaseQty - parseFloat(baseQtyTotal);
			incrementalQty = tempIncrementalQty - parseFloat(incrQtyTotal);
		}
		//Checks If Est. Qty is present with the same item
		var estVolumeResult = search.create({
			type:'customrecord_itpm_estquantity',
			columns:['internalid'],
			filters:[['isinactive','is',false],'and',
				['custrecord_itpm_estqty_promodeal','anyof',promoPalnKey.promoID],'and',
				['custrecord_itpm_estqty_item','anyof',item.memberid]]
		}).run().getRange(0,1);
//		log.debug('estVolumeResult',estVolumeResult)
		
		if(estVolumeResult.length>0){ // Math.round(5.8);
			var estQtyOldRec = record.load({
				type:'customrecord_itpm_estquantity',
				id:estVolumeResult[0].getValue('internalid')
			});
			estQtyOldRec.setValue({
				fieldId:"custrecord_itpm_estqty_qtyby",
				value:promoPlanValues.itemUnit
			}).setValue({
				fieldId:"custrecord_itpm_estqty_qtyentryoptions",
				value:4
			}).setValue({
				fieldId:"custrecord_itpm_estqty_baseqty",
				value:(baseQty>0)?baseQty:0
			}).setValue({
				fieldId:"custrecord_itpm_estqty_incrementalqty",
				value:(incrementalQty>0)?incrementalQty:0
			}).setValue({
				fieldId:"custrecord_itpm_estqty_redemption",
				value:(promoPlanValues.redemptionFactor)?parseFloat(promoPlanValues.redemptionFactor):0
			});
			var estQtyOldRecId = estQtyOldRec.save({
				enableSourcing:false,
				ignoreMandatoryFields:true
			});
			log.audit('estQtyOldRecId',estQtyOldRecId);
		} else {
			//Est.Qty record creation
			var estQtyNewRec = record.create({
			       type: 'customrecord_itpm_estquantity'                      
			});
			estQtyNewRec.setValue({
				fieldId:'custrecord_itpm_estqty_promodeal',
				value:promoPalnKey.promoID
			}).setValue({
				fieldId:"custrecord_itpm_estqty_item",
				value:item.memberid
			}).setValue({
				fieldId:"custrecord_itpm_estqty_qtyby",
				value:promoPlanValues.itemUnit
			}).setValue({
				fieldId:"custrecord_itpm_estqty_qtyentryoptions",
				value:4
			}).setValue({
				fieldId:"custrecord_itpm_estqty_baseqty",
				value:(baseQty>0)?baseQty:0
			}).setValue({
				fieldId:"custrecord_itpm_estqty_incrementalqty",
				value:(incrementalQty>0)?incrementalQty:0
			}).setValue({
				fieldId:"custrecord_itpm_estqty_redemption",
				value:(promoPlanValues.redemptionFactor)?parseFloat(promoPlanValues.redemptionFactor):0
			});
			var estQtyNewRecId = estQtyNewRec.save({
				enableSourcing:false,
				ignoreMandatoryFields:true
			});
			log.audit('estQtyNewRecId',estQtyNewRecId);
		}

    }
    function retailInfoRecordCreate(item, promoPlanValues, promoPalnKey, isLast, listOfItems){
    	//Checks If Retail Info is present with the same item
    	log.debug('promoPlanValues ',promoPlanValues );
    	var retailInfoSearch = search.create({
    		type:'customrecord_itpm_promoretailevent',
    		columns:['internalid'],
    		filters:[['custrecord_itpm_rei_item','anyof',item.memberid],'and',
    			['custrecord_itpm_rei_promotiondeal','anyof',promoPalnKey.promoID],'and',
    			['isinactive','is',false]]
    	}).run().getRange(0,1);
    	if(retailInfoSearch.length > 0){
    		var retalInfoOldRec = record.load({
    			type:'customrecord_itpm_promoretailevent',
    			id:retailInfoSearch[0].getValue('internalid')
    		});
    		retalInfoOldRec.setValue({
    			fieldId:"custrecord_itpm_rei_unit",
    			value:promoPlanValues.itemUnit
    		}).setValue({
    			fieldId:"custrecord_itpm_rei_esteverydayprice",
    			value:(promoPlanValues.estEverydayPrice)?parseFloat(promoPlanValues.estEverydayPrice):0
    		}).setValue({
    			fieldId:"custrecord_itpm_rei_estmerchprice",
    			value:(promoPlanValues.estMerchPrice)?parseFloat(promoPlanValues.estMerchPrice):0
    		}).setValue({
    			fieldId:"custrecord_itpm_rei_estacvdisplay",
    			value:(promoPlanValues.estAcvDisplay)?parseFloat(promoPlanValues.estAcvDisplay):0
    		}).setValue({
    			fieldId:"custrecord_itpm_rei_activity",
    			value:promoPlanValues.ReatailActivity
    		});
    		var retalInfoOldRecId = retalInfoOldRec.save({
    			enableSourcing:false,
    			ignoreMandatoryFields:true
    		});
    		log.audit('retalInfoOldRecId ',retalInfoOldRecId);
    	} else {
    		//Retail.Info record creation
    		var retalInfoNewRec = record.create({
    			type: 'customrecord_itpm_promoretailevent'                      
    		});
    		retalInfoNewRec.setValue({
    			fieldId:'custrecord_itpm_rei_promotiondeal',
    			value:promoPalnKey.promoID
    		}).setValue({
    			fieldId:"custrecord_itpm_rei_item",
    			value:item.memberid
    		}).setValue({
    			fieldId:"custrecord_itpm_rei_unit",
    			value:promoPlanValues.itemUnit
    		}).setValue({
    			fieldId:"custrecord_itpm_rei_esteverydayprice",
    			value:(promoPlanValues.estEverydayPrice)?parseFloat(promoPlanValues.estEverydayPrice):0
    		}).setValue({
    			fieldId:"custrecord_itpm_rei_estmerchprice",
    			value:(promoPlanValues.estMerchPrice)?parseFloat(promoPlanValues.estMerchPrice):0
    		}).setValue({
    			fieldId:"custrecord_itpm_rei_estacvdisplay",
    			value:(promoPlanValues.estAcvDisplay)?parseFloat(promoPlanValues.estAcvDisplay):0
    		}).setValue({
    			fieldId:"custrecord_itpm_rei_activity",
    			value:promoPlanValues.ReatailActivity
    		});
    		var retalInfoNewRecId = retalInfoNewRec.save({
    			enableSourcing:false,
    			ignoreMandatoryFields:true
    		});
    		log.audit('retalInfoNewRecId ',retalInfoNewRecId);
    	}
    	if(isLast){
    		listOfItems.forEach(function(item,i){
    			var retailInfoSearch = search.create({
            		type:'customrecord_itpm_promoretailevent',
            		columns:['internalid'],
            		filters:[['custrecord_itpm_rei_item','anyof',item],'and',
            			['custrecord_itpm_rei_promotiondeal','anyof',promoPalnKey.promoID],'and',
            			['isinactive','is',false]]
            	}).run().getRange(0,30);
    			if(retailInfoSearch.length > 0){
    	    		var retalInfoOldRec = record.load({
    	    			type:'customrecord_itpm_promoretailevent',
    	    			id:retailInfoSearch[0].getValue('internalid')
    	    		});
    	    		retalInfoOldRec.setValue({
    	    			fieldId:"custrecord_itpm_rei_unit",
    	    			value:promoPlanValues.itemUnit
    	    		}).setValue({
    	    			fieldId:"custrecord_itpm_rei_esteverydayprice",
    	    			value:(promoPlanValues.estEverydayPrice)?parseFloat(promoPlanValues.estEverydayPrice):0
    	    		}).setValue({
    	    			fieldId:"custrecord_itpm_rei_estmerchprice",
    	    			value:(promoPlanValues.estMerchPrice)?parseFloat(promoPlanValues.estMerchPrice):0
    	    		}).setValue({
    	    			fieldId:"custrecord_itpm_rei_estacvdisplay",
    	    			value:(promoPlanValues.estAcvDisplay)?parseFloat(promoPlanValues.estAcvDisplay):0
    	    		}).setValue({
    	    			fieldId:"custrecord_itpm_rei_activity",
    	    			value:promoPlanValues.ReatailActivity
    	    		});
    	    		var retalInfoOldRecId = retalInfoOldRec.save({
    	    			enableSourcing:false,
    	    			ignoreMandatoryFields:true
    	    		});
    	    		log.audit('retalInfoOldRecId ',retalInfoOldRecId);
    	    	}
    		});
    		
    	}

    }
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
