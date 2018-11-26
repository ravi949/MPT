/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record',
	    'N/runtime',
	    'N/search',
        './iTPM_Module.js'
	    ],
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(record, runtime, search, itpm) {
   
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
    			      ["lastmodified","on","yesterday"], 
    			      "AND", 
    			      ["custrecord_itpm_p_status","anyof","3","7","5"], 
    			      "AND", 
    			      ["custrecord_itpm_p_condition","anyof","2","3"]
    			   ],
    			   columns: [ "internalid", "custrecord_itpm_p_lumpsum", "custrecord_itpm_p_status" ]
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
    		log.debug('context' , context);
    		var obj = JSON.parse(context.value);
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
    		var obj = JSON.parse(context.values[0]);
    		log.debug('obj',obj);
    		var promoId = obj.values.internalid.value;
    		var promoLS = obj.values.custrecord_itpm_p_lumpsum;
    		var promoStatus = obj.values.custrecord_itpm_p_status.value;
    		log.debug('promoId',promoId);
    		log.debug('promoLS',promoLS);
    		log.debug('promoStatus',promoStatus);

    		var accObj = {};
    		accObj.promoid = promoId;
    		accObj.accDate = new Date();
    		accObj.accrual_amount = promoLS;
    		var accrualSearch = search.create({
    			type	: 'customrecord_itpm_accruallog',
    			filters	: [
    				['custrecord_itpm_acc_promotion', 'is', promoId], 
    				"AND", 
    				["custrecord_itpm_acc_item","anyof","@NONE@"], 
    				"AND", 
    				["custrecord_itpm_acc_quantity","equalto","0"], 
    				"AND", 
    				["custrecord_itpm_acc_transaction","anyof","@NONE@"], 
    				"AND", 
    				["custrecord_itpm_acc_unit","anyof","@NONE@"]
    				],
    				columns	: [
    					search.createColumn({
    						name: 'internalid',
    						sort: search.Sort.DESC
    					}),
    					search.createColumn({
    						name: 'custrecord_itpm_acc_amount'
    					})
    					]
    		}).run().getRange(0,10);
    		log.debug('accrualSearch', accrualSearch);
    		if(accrualSearch.length > 0){
    			var accAmount = accrualSearch[0].getValue('custrecord_itpm_acc_amount');
    			var accID = accrualSearch[0].getValue('internalid');
    			log.debug('Existing Accrual Log Id', accID);
    			log.debug('Existing Accrual accAmount', accAmount);
    			accObj.acctype = 3;//3-Edit Promotion On Accrual log record type
    			//creating reverse accrual log record while promotion changed the status from 3-Approved to 7-Closed/5-Voided 
    			if(promoStatus == 7 || promoStatus == 5){
    				accObj.accrual_amount = accAmount;
    				var reverse_accid_status = createNewAccrualLog(accObj, true);
    				log.audit('Reversal Accrual Status changed Log ID', reverse_accid_status);
    			}else{
    				log.audit('Validating LS amount', accAmount != promoLS);
    				if(accAmount != promoLS){
    					accObj.accrual_amount = accAmount;
    					var reverse_accid = createNewAccrualLog(accObj, true);
    					log.audit('Reversal Accrual Log ID', reverse_accid);
    					if(promoLS > 0){
        					accObj.accrual_amount = promoLS;
        					var accid = createNewAccrualLog(accObj, false);
        					log.audit('Accrual Log ID', accid);
    					}
    				}							
    			}						
    		}else if(promoLS > 0 && promoStatus != 7 && promoStatus != 5){
    			accObj.acctype = 2;//2-New Promotion On Accrual log record type
    			var accid = createNewAccrualLog(accObj, false);
    			log.audit('Accrual Log ID', accid);
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
    	try{
    		
    	}catch(ex){
    		log.error('error in summary '+ex.name, ex.message);
    	}
    }

    /**
     * @param {Object} accObj - holds all required data to create iTPM Accrual Log
     * @param {boolean} isNegativeAmount - if true needs -ve amount
     * @returns {String} accrualid - internalid of the new iTPM Accrual Log record
     */
    function createNewAccrualLog(accObj, isNegativeAmount){
    	try{
    		log.debug('accObj ', accObj);
    		var accruedAmount = parseFloat(accObj.accrual_amount).toFixed(2);
    		var finalAmount = (isNegativeAmount) ? accruedAmount*(-1) : accruedAmount;
    		log.debug('finalAmount', finalAmount);
    		
    		var recObj = record.create({
    			type	: 'customrecord_itpm_accruallog'
    		});
    		
    		recObj.setValue({fieldId:'custrecord_itpm_acc_event', value:accObj.acctype});
    		recObj.setValue({fieldId:'custrecord_itpm_acc_promotion', value:accObj.promoid}); //Promo id
    		recObj.setValue({fieldId:'custrecord_itpm_acc_dateaccrued', value:accObj.accDate}); //accrued date   
    			recObj.setValue({fieldId:'custrecord_itpm_acc_reverse', value:finalAmount < 0}); //Reversal/Released
    		recObj.setValue({fieldId:'custrecord_itpm_acc_amount', value:finalAmount}); //Accrued Amount    		
    		return accrualid = recObj.save({
    			enableSourcing: false,
    		    ignoreMandatoryFields: true
    		});
    	}catch(ex){
    		log.error(ex.name,'function name = createNewAccrualLog, message = '+ ex);
    	}
    }
    
    return {
        getInputData: getInputData,
//        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
