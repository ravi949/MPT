/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/record', 
        'N/search',
        'N/runtime',
        './iTPM_Module.js'],
/**
 * @param {record} record
 * @param {search} search
 * @param {rutime} runtime
 * @param {itpm} module
 */
function(record, search, runtime, itpm) {
   
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
    		var scriptObj = runtime.getCurrentScript();
    		var isEstimatedQtyModified = scriptObj.getParameter({name:"custscript_itpm_mr_estqty_modified"});
    		if(isEstimatedQtyModified){
    			return search.create({
					type:'customrecord_itpm_estquantity',
					columns:[
				         'internalid',
				         'custrecord_itpm_estqty_item',
				         'custrecord_itpm_estqty_promodeal',
				         'custrecord_itpm_estqty_promodeal.custrecord_itpm_p_type',
				         'custrecord_itpm_estqty_estpromotedqty',
				         'custrecord_itpm_estqty_qtyby'
					],
					filters:[
					    ['lastmodified','on','yesterday'],'and',
					    ['isinactive','is',false]
					]
				});
    		}else{
    			return search.create({
    				type:'customrecord_itpm_promoallowance',
    				columns:[
				         'internalid',
				         'custrecord_itpm_all_item',
				         'custrecord_itpm_all_promotiondeal',
				         'custrecord_itpm_all_promotiondeal.custrecord_itpm_p_type',
				         'custrecord_itpm_all_uom',
				         'custrecord_itpm_all_rateperuom'
    				],
			        filters:[
	                  ['lastmodified','on','yesterday'],'and',
	                  ['isinactive','is',false]
			        ]
    			});
    		}
//    		return search.create({
//    			   type: "customrecord_itpm_promotiondeal",
//    			   filters:
//    			   [
//    			      ["custrecord_itpm_p_status","anyof","3"], 
//    			      "AND", 
//    			      ["custrecord_itpm_p_condition","anyof","3"], 
//    			      "AND", 
//    			      ["custrecord_itpm_p_type.custrecord_itpm_pt_dontupdate_lbonactual","is","T"], 
//    			      "AND", 
//    			      ["custrecord_itpm_all_promotiondeal.isinactive","is","F"], 
//    			      "AND", 
//    			      ["custrecord_itpm_estqty_promodeal.isinactive","is","F"], 
//    			      "AND", 
//    			      ["isinactive","is","F"], 
//    			      "AND", 
//    			      [["custrecord_itpm_all_promotiondeal.lastmodified","on","today"],"OR",
//    			       ["custrecord_itpm_all_promotiondeal.lastmodified","on","yesterday"],"OR",
//    			       ["custrecord_itpm_estqty_promodeal.lastmodified","on","today"],"OR",
//    			       ["custrecord_itpm_estqty_promodeal.lastmodified","on","yesterday"]
//    			      ]
//    			   ],
//    			   columns:
//    			   [
//    			    search.createColumn({name: "internalid", label: "Internal ID"}),
//    			    //Allowance columns
//    			    search.createColumn({
//    			    	name: "internalid",
//    			    	join: "CUSTRECORD_ITPM_ALL_PROMOTIONDEAL",
//    			    	label: "Internal ID"
//    			    }),
//    			    search.createColumn({
//    			    	name: "custrecord_itpm_all_rateperuom",
//    			    	join: "CUSTRECORD_ITPM_ALL_PROMOTIONDEAL",
//    			    	label: "Rate Per Unit"
//    			    }),
//    			    search.createColumn({
//    			    	name: "custrecord_itpm_all_item",
//    			    	join: "CUSTRECORD_ITPM_ALL_PROMOTIONDEAL",
//    			    	label: "Item"
//    			    }),
//    			    search.createColumn({
//    			    	name: "custrecord_itpm_all_uom",
//    			    	join: "CUSTRECORD_ITPM_ALL_PROMOTIONDEAL",
//    			    	label: "Unit"
//    			    }),
//    			    //EstQty columns
//    			    search.createColumn({
//    			    	name: "internalid",
//    			    	join: "CUSTRECORD_ITPM_ESTQTY_PROMODEAL",
//    			    	label: "Internal ID"
//    			    }),
//    			    search.createColumn({
//    			    	name: "custrecord_itpm_estqty_estpromotedqty",
//    			    	join: "CUSTRECORD_ITPM_ESTQTY_PROMODEAL",
//    			    	label: "Estimated Promoted Quantity"
//    			    }),
//    			    search.createColumn({
//    			    	name: "custrecord_itpm_estqty_qtyby",
//    			    	join: "CUSTRECORD_ITPM_ESTQTY_PROMODEAL",
//    			    	label: "Unit"
//    			    }),
//    			    search.createColumn({
//    			    	name: "custrecord_itpm_estqty_item",
//    			    	join: "CUSTRECORD_ITPM_ESTQTY_PROMODEAL",
//    			    	label: "Item"
//    			    })
//    			   ]
//    			});
    	}catch(ex){
    		log.error('error in getinputdata '+ex.name, ex.message);
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
    		var obj = JSON.parse(context.value);
    		var scriptObj = runtime.getCurrentScript();
    		var isEstimatedQtyModified = scriptObj.getParameter({name:"custscript_itpm_mr_estqty_modified"});
    		log.debug('obj',obj);
    		log.debug('isEstimatedQtyModified',isEstimatedQtyModified);
    		
    		var mapContextObj = {};
    		
    		//if estimated qty modified trigger
    		if(isEstimatedQtyModified){
    			mapContextObj = {
    				promo_id: obj.values["custrecord_itpm_estqty_promodeal"].value,
    				promotype_id: obj.values["custrecord_itpm_p_type.custrecord_itpm_estqty_promodeal"].value,
    				est_unit: obj.values["custrecord_itpm_estqty_qtyby"].value,
    				est_promotedqty: obj.values["custrecord_itpm_estqty_estpromotedqty"],
    				item: obj.values["custrecord_itpm_estqty_item"].value
    			};
    			//searching for those allowance which was related to this estimate quantity
				search.create({
    				type:'customrecord_itpm_promoallowance',
    				columns:[
				         'internalid',
				         'custrecord_itpm_all_uom',
				         'custrecord_itpm_all_rateperuom'
    				],
    				filters:[
    				    ['custrecord_itpm_all_promotiondeal','anyof',mapContextObj.promo_id],'and',
    				    ['custrecord_itpm_all_item','anyof',mapContextObj.item],'and',
    				    ['isinactive','is',false]
    				]
    			}).run().each(function(all){
    				mapContextObj.all_id = all.getValue('internalid');
    				mapContextObj.all_rate = all.getValue('custrecord_itpm_all_rateperuom');
    				mapContextObj.all_unit = all.getValue('custrecord_itpm_all_uom');
    	    		
    	    		context.write({
    	    			key: mapContextObj.all_id,
    	    			value:mapContextObj
    	    		});
    				return true;
    			});
    			
    		}else{
    			mapContextObj = {
    					all_id: obj.values["internalid"].value,
        				promo_id: obj.values["custrecord_itpm_all_promotiondeal"].value,
        				promotype_id: obj.values["custrecord_itpm_p_type.custrecord_itpm_all_promotiondeal"].value,
        				all_unit: obj.values["custrecord_itpm_all_uom"].value,
        				all_rate: obj.values["custrecord_itpm_all_rateperuom"],
        				item: obj.values["custrecord_itpm_all_item"].value
        		};
    			log.debug('mapContextObj',mapContextObj);
    			//estimated quantity search
    			search.create({
    				type:'customrecord_itpm_estquantity',
    				columns:['internalid',
    				         'custrecord_itpm_estqty_estpromotedqty',
    				         'custrecord_itpm_estqty_qtyby'
    				],
    				filters:[
    				    ['custrecord_itpm_estqty_promodeal','anyof',mapContextObj.promo_id],'and',
    				    ['custrecord_itpm_estqty_item','anyof',mapContextObj.item],'and',
    				    ['isinactive','is',false]
    				]
    			}).run().each(function(est){
    				mapContextObj.est_unit = est.getValue('custrecord_itpm_estqty_qtyby');
    				mapContextObj.est_promotedqty = est.getValue('custrecord_itpm_estqty_estpromotedqty');
    			});
        		
        		context.write({
        			key: mapContextObj.all_id,
        			value:mapContextObj
        		});
    		}
    		
    		
//    		//passing the allowance internalid
//    		context.write({
//    			key:{
//    				type: "all",
//    				promo_id: obj.values["internalid"].value,
//    				id: obj.values["internalid.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"].value,
//    				all_item: obj.values["custrecord_itpm_all_item.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"].value,
//    				all_rate: obj.values["custrecord_itpm_all_rateperuom.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"],
//    				all_unit: obj.values["custrecord_itpm_all_uom.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"].value,
//    			},
//    			value:0
//    		});
//    		//passing the estqty internalid
//    		context.write({
//    			key:{
//    				type: "estqty",
//    				promo_id: obj.values["internalid"].value,
//    				id: obj.values["internalid.CUSTRECORD_ITPM_ESTQTY_PROMODEAL"].value,
//    				estqty_item: obj.values["custrecord_itpm_estqty_item.CUSTRECORD_ITPM_ESTQTY_PROMODEAL"].value,
//    				estqty_promotedqty : obj.values["custrecord_itpm_estqty_estpromotedqty.CUSTRECORD_ITPM_ESTQTY_PROMODEAL"],
//    				estqty_unit: obj.values["custrecord_itpm_estqty_qtyby.CUSTRECORD_ITPM_ESTQTY_PROMODEAL"].value
//    			},
//    			value:0
//    		});
    	}catch(ex){
    		log.error('error in map '+ex.name, ex.message);
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
    		var keyObj = JSON.parse(context.values[0]);
    		log.debug('keyObj',keyObj);
//    		var scriptObj = runtime.getCurrentScript();
//    		log.debug('start time',scriptObj.getRemainingUsage());
//    		var keyObj = JSON.parse(context.key);
//    		log.debug('keyObj',keyObj);
//    		var accrualId, unitsList, all_conversion_rate, estqty_conversion_rate, calculatedAmount, accrualResult;
//    		
//    		if(keyObj.type == "all"){
//    			//accrual Log search
//    			accrualResult = search.create({
//    				type:'customrecord_itpm_accruallog',
//    				columns:[
//				         search.createColumn({
//				        	name:'internalid',
//				        	sort:search.Sort.DESC
//				         }),
//				         'custrecord_itpm_acc_unit'
//    				],
//    				filters:[
//    				    ['custrecord_itpm_acc_transaction','anyof','@NONE@'],'and',
//    				    ['custrecord_itpm_acc_promotion','anyof',keyObj.promo_id],'and',
//    				    ['custrecord_itpm_acc_allowance','anyof',keyObj.id],'and',
//    				    ['isinactive','is',false]
//    				]
//    			}).run().getRange(0,1);
//    			
//    			log.debug('accrualResult',accrualResult);
//    			
//    			//estimated quantity search
//    			var estQtyResult = search.create({
//    				type:'customrecord_itpm_estquantity',
//    				columns:['internalid',
//    				         'custrecord_itpm_estqty_estpromotedqty',
//    				         'custrecord_itpm_estqty_qtyby'
//    				],
//    				filters:[
//    				    ['custrecord_itpm_estqty_promodeal','anyof',keyObj.promo_id],'and',
//    				    ['custrecord_itpm_estqty_item','anyof',keyObj.all_item],'and',
//    				    ['isinactive','is',false]
//    				]
//    			}).run().getRange(0,1);
//    			
//    			log.debug('estQtyResult',estQtyResult);
//    			
//    			
//				unitsList = itpm.getItemUnits(keyObj.all_item).unitArray;
//				all_conversion_rate = parseFloat(unitsList.filter(function(e){return e.id == keyObj.all_unit})[0].conversionRate);
//				
//				//if accrual present converting accrual log unit into allowance unit else esqty unit into allowance unit
//				if(accrualResult.length > 0){
//					estqty_conversion_rate = parseFloat(unitsList.filter(function(e){return e.id == accrualResult[0].getValue('custrecord_itpm_acc_unit')})[0].conversionRate);
//				}else{
//					estqty_conversion_rate = parseFloat(unitsList.filter(function(e){return e.id == estQtyResult[0].getValue('custrecord_itpm_estqty_qtyby')})[0].conversionRate);
//				}
//				
//				calculatedAmount = (all_conversion_rate/estqty_conversion_rate) * parseFloat(estQtyResult[0].getValue('custrecord_itpm_estqty_estpromotedqty'));
//				calculatedAmount = (calculatedAmount * parseFloat(keyObj.all_rate)).toFixed(2);
//				
//				log.debug('All id = '+keyObj.id,'===============start=====================');
//				log.debug('unitsList',unitsList);
//				log.debug('all_conversion_rate',all_conversion_rate);
//				log.debug('estqty_conversion_rate',estqty_conversion_rate);
//				log.debug('calculatedAmount',calculatedAmount);
//				log.debug('All id = '+keyObj.id,'==============end======================');
//    			
//				//adding the allowance id and calculated amount in keyobject
//				keyObj.calculated_amnt = calculatedAmount;
//				keyObj.all_id = keyObj.id;
//				
//				//adding the estqty values into the keyobj for reuse
//				keyObj.est_unit = estQtyResult[0].getValue('custrecord_itpm_estqty_qtyby');
//				keyObj.est_promotedqty = estQtyResult[0].getValue('custrecord_itpm_estqty_estpromotedqty');
//				
//				//create accrual log
//				accrualId = (accrualResult.length > 0)? accrualResult[0].getValue('internalid') : undefined;
//				createNewAccrualLog(accrualId,keyObj);
//	    		log.debug('end time',scriptObj.getRemainingUsage());
//				
//    		}else if(keyObj.type == "estqty"){
//    			log.debug('estqty start time',scriptObj.getRemainingUsage());
//    			unitsList = itpm.getItemUnits(keyObj.estqty_item).unitArray;
//				keyObj.all_item = keyObj.estqty_item;
//
//    			//searching for those allowance which was related to this estimate quantity
//				search.create({
//    				type:'customrecord_itpm_promoallowance',
//    				columns:[
//				         'internalid',
//				         'custrecord_itpm_all_uom',
//				         'custrecord_itpm_all_rateperuom'
//    				],
//    				filters:[
//    				    ['custrecord_itpm_all_promotiondeal','anyof',keyObj.promo_id],'and',
//    				    ['custrecord_itpm_all_item','anyof',keyObj.estqty_item],'and',
//    				    ['isinactive','is',false]
//    				]
//    			}).run().each(function(all){
//    				
//    				//accrual Log search
//        			accrualResult = search.create({
//        				type:'customrecord_itpm_accruallog',
//        				columns:[
//    				         search.createColumn({
//    				        	name:'internalid',
//    				        	sort:search.Sort.DESC
//    				         }),
//    				         'custrecord_itpm_acc_unit'
//        				],
//        				filters:[
//        				    ['custrecord_itpm_acc_transaction','anyof','@NONE@'],'and',
//        				    ['custrecord_itpm_acc_promotion','anyof',keyObj.promo_id],'and',
//        				    ['custrecord_itpm_acc_allowance','anyof',all.getValue('internalid')],'and',
//        				    ['isinactive','is',false]
//        				]
//        			}).run().getRange(0,1);
//        			
//        			if(accrualResult.length > 0){
//        				estqty_conversion_rate = parseFloat(unitsList.filter(function(e){return e.id == accrualResult[0].getValue('custrecord_itpm_acc_unit')})[0].conversionRate);
//        			}else{
//        				estqty_conversion_rate = parseFloat(unitsList.filter(function(e){return e.id == keyObj.est_unit})[0].conversionRate);
//        			}
//        			
//        			all_conversion_rate = parseFloat(unitsList.filter(function(e){return e.id == all.getValue('custrecord_itpm_all_uom')})[0].conversionRate);
//    				calculatedAmount = (all_conversion_rate/estqty_conversion_rate) * parseFloat(keyObj.estqty_promotedqty);
//    				calculatedAmount = (calculatedAmount * parseFloat(all.getValue('custrecord_itpm_all_rateperuom'))).toFixed(2);
//    				
//    				//adding the allowance id and calculated amount in keyobject
//    				accrualId = (accrualResult.length > 0)? accrualResult[0].getValue('internalid') : undefined;
//    				keyObj.calculated_amnt = calculatedAmount;
//    				keyObj.all_id = all.getValue('internalid');
//    				createNewAccrualLog(accrualId,keyObj);
//    				return true;
//    			});
//				log.debug('estqty end time',scriptObj.getRemainingUsage());
//    		}
    	}catch(ex){
    		log.error('error in reduce '+ex.name, ex.message);
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
    
    /**
     * @param {number} id
     * @param {object} accrual data
     */
    function createNewAccrualLog(accrualId, keyObj){
    	
    	log.debug('create accrual function accrual id',accrualId);
    	log.debug('create accrual function keyObj',keyObj);
    	
    	var copiedAccrl, reverseAccrualId, newAccrualId;
    	if(accrualId){
    		copiedAccrl = record.copy({
        		type:'customrecord_itpm_accruallog',
        		id:accrualId
        	});
    		
    		//if the calculated and existed accrual log amount is same do nothing...
    		if(copiedAccrl.getValue('custrecord_itpm_acc_amount') == keyObj.calculated_amnt){
        		return;
    		}
    		
    		reverseAccrualId = copiedAccrl.setValue({
        		fieldId:'custrecord_itpm_acc_amount',
        		value:(parseFloat(copiedAccrl.getValue('custrecord_itpm_acc_amount')) * -1)
        	}).setValue({
        		fieldId:'custrecord_itpm_acc_reverse',
        		value:true
        	}).save({
        		enableSourcing:false,
        		ignoreMandatoryFields:true
        	});
    		
    		log.debug('reverseAccrualId promoid'+keyObj.promo_id,reverseAccrualId);
    	}
    	
    	newAccrualId = record.create({
    		type:'customrecord_itpm_accruallog'
    	}).setValue({
    		fieldId:'custrecord_itpm_acc_promotion',
    		value:keyObj.promo_id
    	}).setValue({
    		fieldId:'custrecord_itpm_acc_allowance',
    		value:keyObj.all_id
    	}).setValue({
    		fieldId:'custrecord_itpm_acc_unit',
    		value:keyObj.est_unit
    	}).setValue({
    		fieldId:'custrecord_itpm_acc_item',
    		value:keyObj.all_item
    	}).setValue({
    		fieldId:'custrecord_itpm_acc_quantity',
    		value:keyObj.est_promotedqty
    	}).setValue({
    		fieldId:'custrecord_itpm_acc_amount',
    		value:keyObj.calculated_amnt
    	}).save({
    		enableSourcing:false,
    		ignoreMandatoryFields:true
    	});
    	log.debug('newAccrualId promoid'+keyObj.promo_id,newAccrualId);
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
