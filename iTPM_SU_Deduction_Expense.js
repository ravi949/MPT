/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Suitelet script to create an expense Journal Entry and link it to an itpm Deduction record.
 */
define(['N/record',
		'N/search',
		'N/runtime',
		'./iTPM_Module.js'
		],

function(record, search, runtime, itpm) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
		try{
			if(context.request.method == 'GET'){
				var deductionRec = record.load({
					type:'customtransaction_itpm_deduction',
					id:context.request.parameters.ddn
				});

				if(deductionRec.getValue('transtatus') != 'A'){
					context.response.write(JSON.stringify({
						success:false,
						message:'Expense can be created if the deduction status is OPEN. Please refresh the page to check the status.'
					}));
					return;
				}
				
				var subsidiaryExists = itpm.subsidiariesEnabled();
				var currencyExists = itpm.currenciesEnabled();
				var subsidiaryID = (subsidiaryExists)? deductionRec.getValue('subsidiary') : undefined;
				var itpmPreferences = itpm.getPrefrenceValues(subsidiaryID);
				var expAccount = itpmPreferences.expenseAccnt;
				var ddnId = context.request.parameters.ddn; 
				var ddnAccount = null,				
					journalEntry = null,
					journalId = null,
					subsidiary = null,
					currency = null,
					openBalance = null,
					ddnFields = ['tranid',	 
					             'custbody_itpm_ddn_openbal'],
					memo = 'Expense for Deduction ';

				if (subsidiaryExists){
					ddnFields.push('subsidiary');
				}
				if (currencyExists){
					ddnFields.push('currency');
				}

				ddnFields = search.lookupFields({
					type: search.Type.TRANSACTION,
					id: ddnId,
					columns: ddnFields
				});
				
				if (util.isObject(ddnFields)){
					openBalance = parseFloat(ddnFields.custbody_itpm_ddn_openbal)
					if (subsidiaryExists){
						subsidiary = ddnFields.subsidiary[0].value;
					}
					if (currencyExists){
						currency = ddnFields.currency[0].value;
					}
					
				} else {
					throw {
						name: 'SU_DDN_Expense_DDNFIELDS',
						message: 'DDN Fields did not return object for Deduction Id ' + ddnId
					}
				}

				ddnAccount = search.create({
					type: search.Type.TRANSACTION,
					filters:[['internalid', 'anyof', ddnId],'and',
						['debitamount', 'greaterthan', '0']],
						columns:[{name:'account'}]
				}).run().getRange(0,1);
				
				if (ddnAccount) ddnAccount = ddnAccount[0].getValue({name:'account'});

				journalEntry = record.create({
					type: record.Type.JOURNAL_ENTRY,
					isDynamic: true
				});
				journalEntry.setValue({
					fieldId:'custbody_itpm_appliedto',
					value:ddnId
				}).setValue({
					fieldId:'memo',
					value:memo + ddnFields.tranid
				});
				if (subsidiaryExists){
					journalEntry.setValue({
						fieldId:'subsidiary',
						value:subsidiary
					});
				}
				
				if(currencyExists){
					journalEntry.setValue({
						fieldId:'currency',
						value:currency
					});
				}
				
				//Checking for JE Approval preference from NetSuite "Accounting Preferences" under "General/Approval Routing" tabs.
				var prefJE = itpm.getJEPreferences();
				if(prefJE.featureEnabled){
					if(prefJE.featureName == 'Approval Routing'){
						log.debug('prefJE.featureName', prefJE.featureName);
						journalEntry.setValue({
        					fieldId:'approvalstatus',
        					value:1
        				});
					}else if(prefJE.featureName == 'General'){
						log.debug('prefJE.featureName', prefJE.featureName);
						journalEntry.setValue({
        					fieldId:'approved',
        					value:false
        				});
					}
				}
				
				//CREDIT LINE ON DDN ACCOUNT
				journalEntry.selectNewLine({
					sublistId: 'line'
				});
				journalEntry.setCurrentSublistValue({
					sublistId: 'line',
					fieldId:'account',
					value:ddnAccount
				}).setCurrentSublistValue({
					sublistId: 'line',
					fieldId:'credit',
					value:openBalance
				}).setCurrentSublistValue({
					sublistId: 'line',
					fieldId:'memo',
					value:memo + ddnFields.tranid
				}).setCurrentSublistValue({
					sublistId: 'line',
					fieldId:'entity',
					value:deductionRec.getValue('custbody_itpm_customer')
				}).commitLine({
					sublistId: 'line'
				});
				//DEBIT LINE ON EXPENSE ACCOUNT
				journalEntry.selectNewLine({
					sublistId: 'line'
				});
				journalEntry.setCurrentSublistValue({
					sublistId: 'line',
					fieldId:'account',
					value:expAccount
				}).setCurrentSublistValue({
					sublistId: 'line',
					fieldId:'debit',
					value:openBalance
				}).setCurrentSublistValue({
					sublistId: 'line',
					fieldId:'memo',
					value:memo + ddnFields.tranid
				}).setCurrentSublistValue({
					sublistId: 'line',
					fieldId:'entity',
					value:deductionRec.getValue('custbody_itpm_customer')
				}).commitLine({
					sublistId: 'line'
				});

				journalId = journalEntry.save({
					enableSourcing: true,
					ignoreMandatoryFields: true
				});

				if (journalId){
					record.submitFields({
						type: 'customtransaction_itpm_deduction',
						id: ddnId,
						values: {custbody_itpm_ddn_openbal : 0},
						options: {enableSourcing: true, ignoreMandatoryFields: true}
					});
				} else {
					throw {
						name: 'SU_DDN_Expense',
						message: 'Journal Entry not created successfully. Journal ID empty.'
					}
				}
				context.response.write(JSON.stringify({success:true,journalId:journalId}));
			}
		} catch(ex) {
			log.error(ex.name, ex.message + '; Deduction: ' + context.request.parameters.ddn );
		}
    }

    return {
        onRequest: onRequest
    };
    
});
