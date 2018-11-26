/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/record', 
        'N/search',
        'N/runtime',
        'N/task',
        './iTPM_Module.js'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @param {task} task
 * @param {itpm} module
 */
function(record, search, runtime, task, itpm) {
   
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
    			//return the estimated quantity search
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
					    ['custrecord_itpm_estqty_promodeal.custrecord_itpm_p_status','anyof','3'],'and',
		                ['custrecord_itpm_estqty_promodeal.custrecord_itpm_p_condition','anyof',['2','3']],'and',
					    ['isinactive','is',false]
					]
				});
    		}else{
    			//return the allowance search
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
	                  ['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_status','anyof','3'],'and',
	                  ['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_condition','anyof',['2','3']],'and',
	                  ['custrecord_itpm_all_mop','anyof',1],'and',
	                  ['isinactive','is',false]
			        ]
    			});
    		}
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

    		var scriptObj = runtime.getCurrentScript();
    		log.debug('map start time',scriptObj.getRemainingUsage());
    		
    		//parsing the context value
    		var obj = JSON.parse(context.value);
    		
    		//getting the script parameter values to identify the which process is triggered
    		var isEstimatedQtyModified = scriptObj.getParameter({name:"custscript_itpm_mr_estqty_modified"});
    		var mapContextObj = {};
    		log.debug('obj',obj);
    		log.debug('isEstimatedQtyModified',isEstimatedQtyModified);
    		
    		//if estimated qty modified trigger
    		if(isEstimatedQtyModified){
    			mapContextObj = {
    				promo_id: obj.values["custrecord_itpm_estqty_promodeal"].value,
    				promotype_id: obj.values["custrecord_itpm_p_type.custrecord_itpm_estqty_promodeal"].value,
    				est_unit: obj.values["custrecord_itpm_estqty_qtyby"].value,
    				est_promotedqty: obj.values["custrecord_itpm_estqty_estpromotedqty"],
    				item: obj.values["custrecord_itpm_estqty_item"].value
    			};
    			//searching for those allowance which has related to this estimate quantity
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
    				    ['custrecord_itpm_all_mop','anyof',1],'and',
    				    ['isinactive','is',false]
    				]
    			}).run().each(function(all){
    				//loop through all the allowances and passing to the reduce state
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
    			//searching for estqty which has related to this allowance
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
        			value: mapContextObj
        		});
    		}
    		log.debug('map end time',scriptObj.getRemainingUsage());
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
    		var scriptObj = runtime.getCurrentScript();
    		log.debug('reduce start time',scriptObj.getRemainingUsage());
    		var keyObj = JSON.parse(context.values[0]);
    		log.debug('keyObj',keyObj);
    		
    		//getting the promotion type "DO NOT UPDATE LIABILITY BASED ON ACTUALS"
    		var doNotUpdateLibBasedOnActuals = search.lookupFields({
    			type:'customrecord_itpm_promotiontype',
    			id:keyObj.promotype_id,
    			columns:['custrecord_itpm_pt_dontupdate_lbonactual']
    		})["custrecord_itpm_pt_dontupdate_lbonactual"];
    		
    		//if "DO NOT UPDATE LIABILITY BASED ON ACTUALS" if false do nothing..
    		if(!doNotUpdateLibBasedOnActuals){
    			return;
    		}
    		
    		//search for the accrual log record with existing allowane and promotion
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
				    ['custrecord_itpm_acc_event','anyof',3],'and',
				    ['custrecord_itpm_acc_promotion','anyof',keyObj.promo_id],'and',
				    ['custrecord_itpm_acc_allowance','anyof',keyObj.all_id],'and',
				    ['isinactive','is',false]
				]
			}).run().getRange(0,1);
			
			//getting the item unit type - units list
			var unitsList = itpm.getItemUnits(keyObj.item).unitArray;
			var estqty_conversion_rate;
			all_conversion_rate = parseFloat(unitsList.filter(function(e){return e.id == keyObj.all_unit})[0].conversionRate);
			
			
			//if accrual present converting accrual log unit into allowance unit else esqty unit into allowance unit
//			if(accrualResult.length > 0){
//				estqty_conversion_rate = parseFloat(unitsList.filter(function(e){return e.id == accrualResult[0].getValue('custrecord_itpm_acc_unit')})[0].conversionRate);
//			}else{
				estqty_conversion_rate = parseFloat(unitsList.filter(function(e){return e.id == keyObj.est_unit})[0].conversionRate);
//			}

		    //converting the estqty unit into allowance unit and multiply with est:promotedqty and all:rate
			var calculatedAmount = (all_conversion_rate/estqty_conversion_rate) * parseFloat(keyObj.est_promotedqty);
			calculatedAmount = (calculatedAmount * parseFloat(keyObj.all_rate)).toFixed(2);
			
			log.debug('All id = '+keyObj.all_id,'===============start=====================');
			log.debug('unitsList',unitsList);
			log.debug('all_conversion_rate',all_conversion_rate);
			log.debug('estqty_conversion_rate',estqty_conversion_rate);
			log.debug('calculatedAmount',calculatedAmount);
			log.debug('All id = '+keyObj.id,'==============end======================');
			
			//adding the allowance id and calculated amount in keyobject
			keyObj.calculated_amnt = calculatedAmount;
			//accrual event type promotion edited 3
			keyObj.acc_event_type = 3;
			
			//creating new accrual log
			accrualId = (accrualResult.length > 0)? accrualResult[0].getValue('internalid') : undefined;
			createNewAccrualLog(accrualId,keyObj);
			log.debug('reduce end time',scriptObj.getRemainingUsage());
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
    	var scriptObj = runtime.getCurrentScript();
    	var isEstimatedQtyModified = scriptObj.getParameter({name:"custscript_itpm_mr_estqty_modified"});
    	if(!isEstimatedQtyModified){
    		var triggerEstimatedQtyModified = task.create({
    			taskType: task.TaskType.MAP_REDUCE,
    			scriptId: 'customscript_itpm_mr_estimate_accruals',
    			deploymentId: 'customdeploy_itpm_mr_estimate_accruals2',
    		}).submit();
    		log.debug('summarize estimated qty modified accrual triggered id',triggerEstimatedQtyModified);	
    	}
    }
    
    /**
     * @param {number} id
     * @param {object} accrual data
     */
    function createNewAccrualLog(accrualId, keyObj){
    	try{
    		log.debug('create accrual function accrual id',accrualId);
        	log.debug('create accrual function keyObj',keyObj);
        	
        	var copiedAccrl, reverseAccrualId, newAccrualId;
        	if(accrualId){
        		copiedAccrl = record.copy({
            		type:'customrecord_itpm_accruallog',
            		id:accrualId
            	});
        		
        		//if the calculated and existed accrual log amount is same then do nothing...
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
        	
        	//if calculated amount is zero than we not creating the new Accrual Log record
        	if(keyObj.calculated_amnt <= 0){
        		return;
        	}
        	
        	newAccrualId = record.create({
        		type:'customrecord_itpm_accruallog'
        	}).setValue({
        		fieldId:'custrecord_itpm_acc_event',
        		value:keyObj.acc_event_type
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
        		value:keyObj.item
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
    	}catch(ex){
    		log.error('error in createNewAccrualLog function', ex.message);
    	}
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
