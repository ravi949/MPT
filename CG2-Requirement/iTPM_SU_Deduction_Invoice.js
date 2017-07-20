/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/record', 'N/search', 'N/runtime', './iTPM_Module.js'],

function(record, search, runtime, iTPM) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	if (context.request.method == 'GET'){
    		try{
    			var subsidiaryExists = runtime.isFeatureInEffect('subsidiaries');
    			var ddnId = context.request.parameters.ddn;
    			if (!ddnId) throw {name:'SU_DDN_Invoice_DDNID', message:'Deduction ID not specified.'};
    			
    			var deductionRec = record.load({
					type:'customtransaction_itpm_deduction',
					id:ddnId
				});

				if(deductionRec.getValue('transtatus') != 'A'){
					context.response.write(JSON.stringify({
						error:true,
						message:'You cannot re-invoice this deduction'
					}));
					return;
				}
    			
    			
    			var ddnAccount = null,
    			journalEntry = null,
    			journalId = null,
    			customerId = null,
    			invoiceId = null,
    			accountReceivables = null,
    			openBalance = null,
    			subsidiary = null,
    			currency = null,
    			ddnRecord = null,
    			ddnFields = ['tranid',
    			             'custbody_itpm_ddn_invoice', 
    			             'custbody_itpm_ddn_customer', 
    			             'custbody_itpm_ddn_openbal'
    			             ],
    			invoiceFields = ['account'],
    			memo = 'Moving open balance to A/R for Deduction ';
    			
    			if (subsidiaryExists){
    				ddnFields.push('subsidiary');
    				ddnFields.push('subsidiary.currency');
    			}
    			
    			ddnFields = search.lookupFields({
    				type: search.Type.TRANSACTION,
    				id: ddnId,
    				columns: ddnFields
    			});
    			if (util.isObject(ddnFields)){
    				customerId = ddnFields.custbody_itpm_ddn_customer[0].value;
    				invoiceId = ddnFields.custbody_itpm_ddn_invoice[0].value;
    				openBalance = parseFloat(ddnFields.custbody_itpm_ddn_openbal)
    				if (invoiceId){
    					accountReceivables = search.lookupFields({
    						type: search.Type.TRANSACTION,
    	    				id: invoiceId,
    	    				columns: 'account'
    					}).account[0].value;
    				} else {
    					throw {
    						name: 'SU_DDN_Invoice_DDNFIELDS',
        					message: 'DDN Fields did not return Invoice Id for Deduction Id ' + ddnId
    					}
    				}
    				if (subsidiaryExists){
    					subsidiary = ddnFields.subsidiary[0].value;
    					currency = ddnFields['subsidiary.currency'];
    					currency = currency[0].value;
    				}
    			} else {
    				throw {
    					name: 'SU_DDN_Invoice_DDNFIELDS',
    					message: 'DDN Fields did not return object for Deduction Id ' + ddnId
    				}
    			}
    			ddnAccount = search.create({
    				type: search.Type.TRANSACTION,
    				filters:[['internalid', 'anyof', ddnId],'and',
    				         ['debitamount', 'greaterthan', '0']],
    				columns:[{name:'account'}]
    			}).run().getRange(0,1)[0].getValue({name:'account'});
    			journalEntry = record.create({
    				type: record.Type.JOURNAL_ENTRY,
    				isDynamic: true
    			}).setValue({
    				fieldId:'custbody_itpm_set_deduction',
    				value:ddnId
    			}).setValue({
    				fieldId:'memo',
    				value:memo + ddnFields.tranid
    			});
    			if (subsidiaryExists){
    				journalEntry.setValue({
        				fieldId:'subsidiary',
        				value:subsidiary
        			}).setValue({
        				fieldId:'currency',
        				value:currency
        			});
    			}
        		//DEBIT LINE ON A/R
        		journalEntry.selectNewLine({
        			sublistId: 'line'
        		});
        		journalEntry.setCurrentSublistValue({
        			sublistId: 'line',
        			fieldId:'account',
    				value:accountReceivables
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
    				value:customerId
    			}).commitLine({
    				sublistId: 'line'
    			});
        		//CREDIT LINE ON EXPENSE ACCOUNT
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
    			}).commitLine({
    				sublistId: 'line'
    			});
        		
        		journalId = journalEntry.save({
        			enableSourcing: true,
        			ignoreMandatoryFields: true
        		});
        		
        		if(journalId){
        			record.submitFields({
        				type: 'customtransaction_itpm_deduction',
        				id: ddnId,
        				values: {custbody_itpm_ddn_openbal : 0},
        				options: {enableSourcing: true, ignoreMandatoryFields: true}
        			});
        		} else {
        			throw {
        				name: 'SU_DDN_Invoice_JE',
        				message: 'Journal Entry not created successfully. Journal ID empty.'
        			}
        		}
        		context.response.write(journalId);
    		} catch(ex) {
    			log.error(ex.name, ex.message + '; ddnId: ' + ddnId);
    		}
    	}
    }

    return {
        onRequest: onRequest
    };
    
});
