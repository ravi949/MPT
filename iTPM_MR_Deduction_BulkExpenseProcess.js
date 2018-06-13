/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/search',
        'N/record',
        './iTPM_Module.js'
        ],

function(search, record, itpm) {
   
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
        		type:'customrecord_itpm_expensequeue',
        		columns:[search.createColumn({
		        		    name: 'internalid',
		        		    sort: search.Sort.ASC
				 		 }),
        		         'custrecord_itpm_eq_amount',
        		         'custrecord_itpm_eq_account',
        		         'custrecord_itpm_eq_openbalance',
        		         'custrecord_itpm_eq_deduction'],
        		filters:[['custrecord_itpm_eq_journalentry','anyof','@NONE@'],'and',
        		         ['custrecord_itpm_eq_processingnotes','isempty',null]]
        	});
    	}catch(ex){
    		log.error(ex.name,ex.message);
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
    		var obj = JSON.parse(context.value).values;
    		var expenseQueueId = obj['internalid'].value;
    		var expenseAmount = parseFloat(obj['custrecord_itpm_eq_amount']);
    		var expenseAccount = obj['custrecord_itpm_eq_account'].value;
    		var ddnOpenBal = parseFloat(obj['custrecord_itpm_eq_openbalance']);
    		
    		var ddnId = obj['custrecord_itpm_eq_deduction'].value;
			var deductionRecordObj = record.load({
				type:'customtransaction_itpm_deduction',
				id:ddnId
			});
			var ddnStatus = deductionRecordObj.getValue('transtatus');
			
    		if(ddnStatus == 'A' && expenseAmount > 0 && expenseAmount == ddnOpenBal){
    			log.debug('context',obj);
    			log.debug('expenseAccount',expenseAccount);
				var subsidiaryExists = itpm.subsidiariesEnabled();
				var currencyExists = itpm.currenciesEnabled();
				var prefJE = itpm.getJEPreferences();
			
    			var ddnAccount = search.create({
					type: search.Type.TRANSACTION,
					filters:[['internalid', 'anyof', ddnId],'and',
					         ['debitamount', 'greaterthan', '0']],
					columns:[{name:'account'}]
				}).run().getRange(0,1)[0].getValue({name:'account'});
    			
    			//creating the journal entry and resolving the deductions
    			var jeRec = record.create({
    				type:record.Type.JOURNAL_ENTRY
    			});
    			
    			//Setting JE Record with Preloaded values from deduction
				if (subsidiaryExists){
					jeRec.setValue({
    					fieldId: 'subsidiary',
    					value: deductionRecordObj.getValue('subsidiary')
    				});
				}
				if(currencyExists){
					jeRec.setValue({
    					fieldId: 'currency',
    					value: deductionRecordObj.getValue('currency')
    				});
				}
				jeRec.setValue({
					fieldId: 'custbody_itpm_appliedto',
					value: ddnId
				});
				jeRec.setValue({
					fieldId: 'memo',
					value: 'Expense for Deduction '+deductionRecordObj.getValue('tranid')
				});
				
				//Checking for JE Approval preference from NetSuite "Accounting Preferences" under "General/Approval Routing" tabs.
				if(prefJE.featureEnabled){
					if(prefJE.featureName == 'Approval Routing'){
						log.debug('prefJE.featureName', prefJE.featureName);
						jeRec.setValue({
        					fieldId:'approvalstatus',
        					value:1
        				});
					}else if(prefJE.featureName == 'General'){
						log.debug('prefJE.featureName', prefJE.featureName);
						jeRec.setValue({
        					fieldId:'approved',
        					value:false
        				});
					}
				}
				
				//Adding Credit Line
				jeRec.setSublistValue({
					sublistId: 'line',
					fieldId:'account',
					value:ddnAccount,
					line:0
				});
				jeRec.setSublistValue({
					sublistId: 'line',
					fieldId:'credit',
					value: deductionRecordObj.getValue('custbody_itpm_ddn_openbal'),
					line:0
				});
				jeRec.setSublistValue({
					sublistId: 'line',
					fieldId:'memo',
					value: 'Expense for Deduction '+ deductionRecordObj.getValue('tranid'),
					line:0
				});
				jeRec.setSublistValue({
					sublistId: 'line',
					fieldId:'entity',
					value: deductionRecordObj.getValue('custbody_itpm_customer'),
					line:0
				});
				
				//Adding Debit Line
				jeRec.setSublistValue({
					sublistId: 'line',
					fieldId:'account',
					value:expenseAccount,
					line:1
				});
				jeRec.setSublistValue({
					sublistId: 'line',
					fieldId:'debit',
					value: deductionRecordObj.getValue('custbody_itpm_ddn_openbal'),
					line:1
				});
				jeRec.setSublistValue({
					sublistId: 'line',
					fieldId:'memo',
					value: 'Expense for Deduction '+ deductionRecordObj.getValue('tranid'),
					line:1
				});
				jeRec.setSublistValue({
					sublistId: 'line',
					fieldId:'entity',
					value: deductionRecordObj.getValue('custbody_itpm_customer'),
					line:1
				});
				
				//setting the expense queue record JE field value
				record.submitFields({
					type:'customrecord_itpm_expensequeue',
					id:expenseQueueId,
					values:{
						'custrecord_itpm_eq_journalentry':jeRec.save({enableSourcing:false,ignoreMandatoryFields:true})
					},
					options:{
						enableSourcing:false,
						ignoreMandatoryFields:true
					}
				});
				
    		}else{
    			if(ddnStatus != 'A'){
    				throw {
    					name:"INVALID_DEDUCTION_STATUS",
    					message: "Invalid Deduction"
    				}
    			}else{
        			throw {
        				name:"INVALID_AMOUNT",
        				message:"Please enter the valid amount"
        			}
    			}
    		}
    	}catch(ex){
    		log.error(ex.name,ex.message);
    		record.submitFields({
				type:'customrecord_itpm_expensequeue',
				id:expenseQueueId,
				values:{
					'custrecord_itpm_eq_processingnotes':ex.message
				},
				options:{
					enableSourcing:false,
					ignoreMandatoryFields:true
				}
			});
    	}
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

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
//        reduce: reduce,
        summarize: summarize
    };
    
});
