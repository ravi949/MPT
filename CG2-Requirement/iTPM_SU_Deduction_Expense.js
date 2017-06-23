/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Suitelet script to create an expense Journal Entry and link it to an iTPM Deduction record.
 */
define(['N/record', './iTPM_Module.js'],

function(record, iTPM) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	if(context.request.method == 'GET'){
    		try{
    			var itpmPreferences = iTPM.getPrefrenceValues(),
        		ddnAccount = itpmPreferences.dednExpAccnt,
        		expAccount = itpmPreferences.expenseAccnt,
        		ddnId = context.request.parameters.ddn,
        		journalEntry = null,
        		journalId = null;
    			var ddnRecord = record.load({
    				type: 'customtransaction_itpm_deduction',
    				id: ddnId
    			});
        		var memo = 'Expense for Deduction # '+ ddnRecord.getValue('tranid');
        		journalEntry = record.create({
        			type: record.Type.JOURNAL_ENTRY,
        			isDynamic: true
        		});
        		journalEntry.setValue({
    				fieldId:'subsidiary',
    				value:ddnRecord.getValue('subsidiary')
    			}).setValue({
    				fieldId:'currency',
    				value:ddnRecord.getValue('currency')
    			}).setValue({
    				fieldId:'custbody_itpm_set_deduction',
    				value:ddnId
    			}).setValue({
    				fieldId:'memo',
    				value:memo
    			});
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
    				value:ddnRecord.getValue('custbody_itpm_ddn_openbal')
    			}).setCurrentSublistValue({
    				sublistId: 'line',
    				fieldId:'memo',
    				value:memo
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
    				value:ddnRecord.getValue('custbody_itpm_ddn_openbal')
    			}).setCurrentSublistValue({
    				sublistId: 'line',
    				fieldId:'memo',
    				value:memo
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
        		context.response.write(journalId);
    		} catch(ex) {
    			log.error(ex.name, ex.message + '; Deduction: ' + ddnRecord.getValue('tranid'));
    		}
    	}
    }

    return {
        onRequest: onRequest
    };
    
});
