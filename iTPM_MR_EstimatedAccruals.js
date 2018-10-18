/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/record', 
        'N/search',
        './iTPM_Module.js'],
/**
 * @param {record} record
 * @param {search} search
 * @param {itpm} module
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
    		return search.create({
    			   type: "customrecord_itpm_promotiondeal",
    			   filters:
    			   [
    			      ["custrecord_itpm_p_status","anyof","3"], 
    			      "AND", 
    			      ["custrecord_itpm_p_condition","anyof","3"], 
    			      "AND", 
    			      ["custrecord_itpm_p_type.custrecord_itpm_pt_dontupdate_lbonactual","is","T"], 
    			      "AND", 
    			      ["custrecord_itpm_all_promotiondeal.isinactive","is","F"], 
    			      "AND", 
    			      ["custrecord_itpm_estqty_promodeal.isinactive","is","F"], 
    			      "AND", 
    			      ["isinactive","is","F"], 
    			      "AND", 
    			      [["custrecord_itpm_all_promotiondeal.lastmodified","on","today"],"OR",
    			       ["custrecord_itpm_all_promotiondeal.lastmodified","on","yesterday"],"OR",
    			       ["custrecord_itpm_estqty_promodeal.lastmodified","on","today"],"OR",
    			       ["custrecord_itpm_estqty_promodeal.lastmodified","on","yesterday"]
    			      ]
    			   ],
    			   columns:
    			   [
    			    search.createColumn({name: "internalid", label: "Internal ID"}),
    			    //Allowance columns
    			    search.createColumn({
    			    	name: "internalid",
    			    	join: "CUSTRECORD_ITPM_ALL_PROMOTIONDEAL",
    			    	label: "Internal ID"
    			    }),
    			    search.createColumn({
    			    	name: "custrecord_itpm_all_rateperuom",
    			    	join: "CUSTRECORD_ITPM_ALL_PROMOTIONDEAL",
    			    	label: "Rate Per Unit"
    			    }),
    			    search.createColumn({
    			    	name: "custrecord_itpm_all_item",
    			    	join: "CUSTRECORD_ITPM_ALL_PROMOTIONDEAL",
    			    	label: "Item"
    			    }),
    			    search.createColumn({
    			    	name: "custrecord_itpm_all_uom",
    			    	join: "CUSTRECORD_ITPM_ALL_PROMOTIONDEAL",
    			    	label: "Unit"
    			    }),
    			    //EstQty columns
    			    search.createColumn({
    			    	name: "internalid",
    			    	join: "CUSTRECORD_ITPM_ESTQTY_PROMODEAL",
    			    	label: "Internal ID"
    			    }),
    			    search.createColumn({
    			    	name: "custrecord_itpm_estqty_estpromotedqty",
    			    	join: "CUSTRECORD_ITPM_ESTQTY_PROMODEAL",
    			    	label: "Estimated Promoted Quantity"
    			    }),
    			    search.createColumn({
    			    	name: "custrecord_itpm_estqty_qtyby",
    			    	join: "CUSTRECORD_ITPM_ESTQTY_PROMODEAL",
    			    	label: "Unit"
    			    }),
    			    search.createColumn({
    			    	name: "custrecord_itpm_estqty_item",
    			    	join: "CUSTRECORD_ITPM_ESTQTY_PROMODEAL",
    			    	label: "Item"
    			    })
    			   ]
    			});
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
    		//passing the allowance internalid
    		context.write({
    			key:{
    				type: "all",
    				promo_id: obj.values["internalid"].value,
    				id: obj.values["internalid.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"].value,
    				all_item: obj.values["custrecord_itpm_all_item.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"].value,
    				all_rate: obj.values["custrecord_itpm_all_rateperuom.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"],
    				all_unit: obj.values["custrecord_itpm_all_uom.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"].value,
    			},
    			value:0
    		});
    		//passing the estqty internalid
    		context.write({
    			key:{
    				type: "estqty",
    				promo_id: obj.values["internalid"].value,
    				id: obj.values["internalid.CUSTRECORD_ITPM_ESTQTY_PROMODEAL"].value,
    				estqty_item: obj.values["custrecord_itpm_estqty_item.CUSTRECORD_ITPM_ESTQTY_PROMODEAL"].value,
    				estqty_promotedqty : obj.values["custrecord_itpm_estqty_estpromotedqty.CUSTRECORD_ITPM_ESTQTY_PROMODEAL"],
    				estqty_unit: obj.values["custrecord_itpm_estqty_qtyby.CUSTRECORD_ITPM_ESTQTY_PROMODEAL"].value
    			},
    			value:0
    		});
    		log.debug('obj',obj);
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
    		var keyObj = JSON.parse(context.key);
    		log.debug('keyObj',keyObj);
    		if(keyObj.type == "all"){
    			//accrual Log search
    			var accrualResult = search.create({
    				type:'customrecord_itpm_accruallog',
    				columns:[
				         search.createColumn({
				        	name:'internalid',
				        	sort:search.Sort.DESC
				         }),
				         'custrecord_itpm_acc_unit'
    				],
    				filters:[
    				    ['custrecord_itpm_acc_transaction','anyof','@NONE@'],'and',
    				    ['custrecord_itpm_acc_promotion','anyof',keyObj.promo_id],'and',
    				    ['custrecord_itpm_acc_allowance','anyof',keyObj.id]
    				]
    			}).run().getRange(0,1);
    			
    			log.debug('accrualResult',accrualResult);
    			
    			//estimated quantity search
    			var estQtyResult = search.create({
    				type:'customrecord_itpm_estquantity',
    				columns:['internalid',
    				         'custrecord_itpm_estqty_estpromotedqty',
    				         'custrecord_itpm_estqty_qtyby'
    				],
    				filters:[
    				    ['custrecord_itpm_estqty_promodeal','anyof',keyObj.promo_id],'and',
    				    ['custrecord_itpm_estqty_item','anyof',keyObj.all_item]
    				]
    			}).run().getRange(0,1);
    			
    			log.debug('estQtyResult',estQtyResult);
    			
//    			if(accrualResult.length > 0){
//    				var copiedAccrl = record.copy({
//    					type:'customrecord_itpm_accruallog',
//    					id:accrualResult[0].getValue('internalid')
//    				});
//    				copiedAccrl.setValue({
//    					fieldId:'custrecord_itpm_acc_amount',
//    					value:(parseFloat(copiedAccrl.getValue('custrecord_itpm_acc_amount')) * -1)
//    				}).save({
//    					enableSourcing:false,
//    					ignoreMandatoryFields:true
//    				});
//    				
//    				var unitsList = itpm.getItemUnits(keyObj.all_item);
//    				var all_convertion_rate = parseFloat(unitsList.filter(function(e){return e.id == keyObj.all_unit})[0].conversionRate);
//    				var estqty_convertion_rate = parseFloat(unitsList.filter(function(e){return e.id == estQtyResult[0].getValue('custrecord_itpm_estqty_qtyby')})[0].conversionRate);
//    				var calculatedAmount = (estqty_convertion_rate/all_convertion_rate) * parseFloat(estQtyResult[0].getValue('custrecord_itpm_estqty_estpromotedqty'));
//    				calculatedAmount = calculatedAmount.toFixed(2);
//    				
//    				record.create({
//    					type:'customrecord_itpm_accruallog'
//    				}).setValue({
//    					fieldId:'custrecord_itpm_acc_promotion',
//    					value:keyObj.promo_id
//    				}).setValue({
//    					fieldId:'custrecord_itpm_acc_allowance',
//    					value:keyObj.id
//    				}).setValue({
//    					fieldId:'custrecord_itpm_acc_unit',
//    					value:estQtyResult[0].getValue('custrecord_itpm_estqty_qtyby')
//    				}).setValue({
//    					fieldId:'custrecord_itpm_acc_item',
//    					value:keyObj.all_item
//    				}).setValue({
//    					fieldId:'custrecord_itpm_acc_quantity',
//    					value:estQtyResult[0].getValue('custrecord_itpm_estqty_estpromotedqty')
//    				}).setValue({
//    					fieldId:'custrecord_itpm_acc_amount',
//    					value:calculatedAmount
//    				}).save({
//    					enableSourcing:false,
//    					ignoreMandatoryFields:true
//    				});
//    			}
    			
    		}else if(keyObj.type == "estqty"){
    			
    		}
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

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
