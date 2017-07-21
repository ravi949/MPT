/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/record',
		'N/redirect',
		'N/search',
		'./iTPM_Module_Settlement.js',
		'./iTPM_Module.js'
		],
/**
 * @param {record} record
 * @param {redirect} redirect
 * @param {search} search
 */
function(record, redirect, search, ST_Module,iTPM_Module) {
   
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
    		var request = context.request;
    		var response = context.response;
    		var parameters = request.parameters;
    		
			
    		//loading the settlement record
    		var settlementRec = record.load({
    		     type: 'customtransaction_itpm_settlement',
    		     id: parameters.sid
    		 });
    		
    		if(settlementRec.getValue('transtatus') != 'A'){
    			throw {
					name:'SETTLEMENT_INVALID_STATUS',
					message:'This settlement cannot be applied to the check.'
				};
    		}
    		
    		var subsidiaryExists = iTPM_Module.subsidiariesEnabled();
			var currencyExists = iTPM_Module.currenciesEnabled();
			var locationsExists = iTPM_Module.locationsEnabled();
			var departmentsExists = iTPM_Module.departmentsEnabled();
			var classesExists = iTPM_Module.classesEnabled();
    		
    		//search the promotion record based on settlement record for the account field and promotion type account field value
    		var promotionRecSer = search.create({
    			type: 'customrecord_itpm_promotiondeal',
    			columns: ['internalid'
    			          ,'custrecord_itpm_p_account'
    			          ,'custrecord_itpm_p_type'
    			          ,'custrecord_itpm_p_type.custrecord_itpm_pt_defaultaccount'
    			          ],
    			          filters: [['internalid','anyof',settlementRec.getValue('custbody_itpm_set_promo')]]
    		}).run().getRange(0,1);
    		log.debug('currne',promotionRecSer[0].getValue('custrecord_itpm_p_currency'));

    		var JERecId = ST_Module.createReverseJE(settlementRec);
    		log.debug('JERecId',JERecId)
    		if(JERecId){
    			//creating the check record
        		var checkRecord = record.create({
        			type: record.Type.CHECK 
        		});
        		//setting the body fields of the check record
        		checkRecord.setValue({
        			fieldId: 'entity',
        			value:  settlementRec.getValue('custbody_itpm_set_customer'),
        			ignoreFieldChange: true
        		});
        		checkRecord.setValue({
        			fieldId: 'usertotal',
        			value:  settlementRec.getValue('custbody_itpm_set_amount'),
        			ignoreFieldChange: true
        		});
        		
        		if(subsidiaryExists){
        			checkRecord.setValue({
            			fieldId: 'subsidiary',
            			value:  settlementRec.getValue('subsidiary'),
            			ignoreFieldChange: true
            		});
        		}
        		
        		if(currencyExists){
        			checkRecord.setValue({
            			fieldId: 'currency',
            			value:  settlementRec.getValue('currency'),
            			ignoreFieldChange: true
            		});
        		}
        		
        		checkRecord.setValue({
        			fieldId: 'memo',
        			value:  ' From Settlement #'+ settlementRec.getValue('tranid'),
        			ignoreFieldChange: true
        		});
        		checkRecord.setValue({
        			fieldId: 'custbody_itpm_settlementrec',
        			value:  settlementRec.getValue('id'),
        			ignoreFieldChange: true
        		});
        		checkRecord.setValue({
        			fieldId: 'custbody_itpm_promotion',
        			value:  settlementRec.getValue('custbody_itpm_set_promo'),
        			ignoreFieldChange: true
        		});
        		checkRecord.setValue({
        			fieldId: 'tobeprinted',
        			value:  true,
        			ignoreFieldChange: true
        		});
        		
        		//adding line items in the check record    		
        		var expenseLineCount = 0;//increasing line count after adding record
        		//adding lump sum expense line in check record
        		if(settlementRec.getValue('custbody_itpm_set_reqls') > 0){
        			//if Promotion record don't have any account in lump sum then adding the Promotion Type default account to this field
        			if(promotionRecSer[0].getValue('custrecord_itpm_p_account')){
        				checkRecord.setSublistValue({
            				sublistId: 'expense',
            				fieldId: 'account',
            				line: expenseLineCount,
            				value: promotionRecSer[0].getValue('custrecord_itpm_p_account')
            			});
        			} else {
        				checkRecord.setSublistValue({
            				sublistId: 'expense',
            				fieldId: 'account',
            				line: expenseLineCount,
            				value: promotionRecSer[0].getValue({name:'custrecord_itpm_pt_defaultaccount',join:'custrecord_itpm_p_type'})
            			});
        			}
        			
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'amount',
        				line: expenseLineCount,
        				value: settlementRec.getValue('custbody_itpm_set_reqls')
        			}); 
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'memo', 
        				line: expenseLineCount,
        				value: 'Lump Sum Settlement #'+ settlementRec.getValue('tranid')
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'custcol_itpm_lsbboi', 
        				line: expenseLineCount,
        				value: 1
        			});
            		expenseLineCount = 1+expenseLineCount;
        		} else {
        			if(promotionRecSer[0].getValue('custrecord_itpm_p_account')){
        				checkRecord.setSublistValue({
            				sublistId: 'expense',
            				fieldId: 'account',
            				line: expenseLineCount,
            				value: promotionRecSer[0].getValue('custrecord_itpm_p_account')
            			});
        			} else {
        				checkRecord.setSublistValue({
            				sublistId: 'expense',
            				fieldId: 'account',
            				line: expenseLineCount,
            				value: promotionRecSer[0].getValue({name:'custrecord_itpm_pt_defaultaccount',join:'custrecord_itpm_p_type'})
            			});
        			}
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'amount',
        				line: expenseLineCount,
        				value: 0
        			}); 
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'memo', 
        				line: expenseLineCount,
        				value: 'Lump Sum Settlement #'+ settlementRec.getValue('tranid')
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'custcol_itpm_lsbboi', 
        				line: expenseLineCount,
        				value: 1
        			});
            		expenseLineCount = 1+expenseLineCount;
        		}
        		//adding bill back expense line in check record
        		if(settlementRec.getValue('custbody_itpm_set_reqbb') > 0){
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'account',
        				line: expenseLineCount,
        				value: promotionRecSer[0].getValue({name:'custrecord_itpm_pt_defaultaccount',join:'custrecord_itpm_p_type'})
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'amount',
        				line: expenseLineCount,
        				value: settlementRec.getValue('custbody_itpm_set_reqbb')
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'memo',
        				line: expenseLineCount,
        				value: 'Bill Back Settlement #'+ settlementRec.getValue('tranid')
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'custcol_itpm_lsbboi', 
        				line: expenseLineCount,
        				value: 2
        			});
            		expenseLineCount = 1+expenseLineCount;
        		} else {
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'account',
        				line: expenseLineCount,
        				value: promotionRecSer[0].getValue({name:'custrecord_itpm_pt_defaultaccount',join:'custrecord_itpm_p_type'})
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'amount',
        				line: expenseLineCount,
        				value: 0
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'memo',
        				line: expenseLineCount,
        				value: 'Bill Back Settlement #'+ settlementRec.getValue('tranid')
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'custcol_itpm_lsbboi', 
        				line: expenseLineCount,
        				value: 2
        			});
            		expenseLineCount = 1+expenseLineCount;
        		}
        		//adding off-invoice expense line in check record
        		if(settlementRec.getValue('custbody_itpm_set_reqoi') > 0){
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'account',
        				line: expenseLineCount,
        				value: promotionRecSer[0].getValue({name:'custrecord_itpm_pt_defaultaccount',join:'custrecord_itpm_p_type'})
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'amount',
        				line: expenseLineCount,
        				value: settlementRec.getValue('custbody_itpm_set_reqoi')
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'memo',
        				line: expenseLineCount,
        				value: 'Missed Off Invoice Settlement #'+ settlementRec.getValue('tranid')
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'custcol_itpm_lsbboi', 
        				line: expenseLineCount,
        				value: 3
        			});
        		} else {
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'account',
        				line: expenseLineCount,
        				value: promotionRecSer[0].getValue({name:'custrecord_itpm_pt_defaultaccount',join:'custrecord_itpm_p_type'})
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'amount',
        				line: expenseLineCount,
        				value: 0
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'memo',
        				line: expenseLineCount,
        				value: 'Missed Off Invoice Settlement #'+ settlementRec.getValue('tranid')
        			});
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'custcol_itpm_lsbboi', 
        				line: expenseLineCount,
        				value: 3
        			});
        		}
        		for(var v =0; v<= expenseLineCount; v++){
        			if(departmentsExists){
        				checkRecord.setSublistValue({
                			sublistId: 'expense',
                			fieldId: 'department',
                			line: v,
                			value: settlementRec.getValue('department')
                		});
        			}
        			
            		if(classesExists){
            			checkRecord.setSublistValue({
                			sublistId: 'expense',
                			fieldId: 'class',
                			line: v,
                			value: settlementRec.getValue('class')
                		});
            		}
            		
            		if(locationsExists){
            			checkRecord.setSublistValue({
                			sublistId: 'expense',
                			fieldId: 'location',
                			line: v,
                			value: settlementRec.getValue('location')
                		});
            		}
            		
            		checkRecord.setSublistValue({
            			sublistId: 'expense',
            			fieldId: 'isbillable',
            			line: v,
            			value: false
            		});
        		}
        		//saving the check record
        		var checkRecordId = checkRecord.save({
        			enableSourcing: true,
        			ignoreMandatoryFields: true
        		});
        		//place the check details in the settlement record
        		settlementRec.setValue({
        		    fieldId: 'transtatus',
        		    value: 'B',
        		    ignoreFieldChange: true
        		});
        		settlementRec.setValue({
        		    fieldId: 'custbody_itpm_set_deduction',
        		    value: checkRecordId,
        		    ignoreFieldChange: true
        		});
        		settlementRec.save({
        		    enableSourcing: true,
        		    ignoreMandatoryFields: true
        		});
        		//after saving the records show the check record.
        		redirect.toRecord({
        			type : record.Type.CHECK, 
        			id : checkRecordId 
        		});
    		}
    		
    	}catch(e){
    		log.error(e.name,'record type = iTPM Settlement, record id='+request.parameters.sid+', message='+e.message);
    		if(e.name == 'SETTLEMENT_INVALID_STATUS'){
    			throw Error(e.message);
    		}
    	}
    }

    return {
        onRequest: onRequest
    };
    
});
