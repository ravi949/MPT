/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget',
		'N/search',
		'N/url',
		'N/redirect',
		'N/record',
		'N/runtime',
		'./iTPM_Module.js'
	],

function(serverWidget, search, url, redirect, record, runtime, itpm) {
   
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
			
			var output = url.resolveScript({
			    scriptId: 'customscript_itpm_ded_matchtocreditmemo',
			    deploymentId: 'customdeploy_itpm_ded_matchtocreditmemo',
			    returnExternalUrl: false
			});
			
			var deductionRec = record.load({
				type: 'customtransaction_itpm_deduction',
    		    id: parameters.did
			});
			
			if(request.method == 'GET' && parameters.submit == 'true')
			{
				//1. Need to create the JE
                var subsidiaryExists = itpm.subsidiariesEnabled();
				var creditmemoid = parameters.cm;
              
                //getting remaining amount from credit memo
				var cmRemainingAmount = search.lookupFields({
					type    : search.Type.CREDIT_MEMO,
					id      : creditmemoid,
					columns : ['amountremaining']
				});
              
				var deductionid = parameters.did;
				var jememo = 'Journal Entry for -iTPM Deduction #'+deductionRec.getValue('tranid');
				var jesubsidiary = deductionRec.getValue('subsidiary');
                var jeamount = cmRemainingAmount.amountremaining;
				var jecustomer = parameters.customer;
				var jecreditaccount;
				var jedebitaccount;
				
				//fetching JE credit account from deduction record header
				ddnAccount = search.create({
					type    : search.Type.TRANSACTION,
					filters : [['internalid', 'anyof', deductionid],'and',
						       ['debitamount', 'greaterthan', '0']],
					columns : [{name:'account'}]
				}).run().getRange(0,1);
				
				if (ddnAccount) jecreditaccount = ddnAccount[0].getValue({name:'account'});
				
				//fetching JE credit account from credit memo record header
				cmAccount = search.create({
					type    : search.Type.CREDIT_MEMO,
					filters : [['internalid', 'anyof', creditmemoid]],
					columns : [{name:'account'}]
				}).run().getRange(0,1);
				
				if (cmAccount) jedebitaccount = cmAccount[0].getValue({name:'account'});
				
				//creating JE record
                var journalEntry = record.create({
					type    : record.Type.JOURNAL_ENTRY,
                    isDynamic : true
				});
				
                //setting body fields Subsidiary and iTPM Applied To
				journalEntry.setValue({
					fieldId : 'subsidiary',
					value   : jesubsidiary
				});
              
				journalEntry.setValue({
					fieldId : 'custbody_itpm_appliedto',
					value   : deductionid
				});
				//CREDIT LINE
				journalEntry.selectNewLine({
					sublistId: 'line'
				});
				journalEntry.setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'account',
					value     : jecreditaccount.toString()
				}).setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'credit',
					value     : jeamount
				}).setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'memo',
					value     : jememo
				}).setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'entity',
					value     : jecustomer
				}).commitLine({
					sublistId: 'line'
				});
				//DEBIT LINE
				journalEntry.selectNewLine({
					sublistId: 'line'
				});
				journalEntry.setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'account',
					value     : jedebitaccount.toString()
				}).setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'debit',
					value     : jeamount
				}).setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'memo',
					value     : jememo
				}).setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'entity',
					value     : jecustomer
				}).commitLine({
					sublistId: 'line'
				});

				journalId = journalEntry.save({
					enableSourcing: true,
					ignoreMandatoryFields: true
				});
				log.debug('journalId',journalId);
								
				ddnOpenBal = parseFloat(deductionRec.getValue('custbody_itpm_ddn_openbal'))-parseFloat(jeamount);
				log.debug('ddnOpenBal',ddnOpenBal);
				var recordDedId;
				if (journalId){
					recordDedId = record.submitFields({
						type    : 'customtransaction_itpm_deduction',
						id      : deductionid,
						values  : {custbody_itpm_ddn_openbal : ddnOpenBal},
						options : {enableSourcing: true, ignoreMandatoryFields: true}
					});
				} else {
					throw {
						name: 'SU_DDN_JECM',
						message: 'Journal Entry not created successfully. Journal ID empty.'
					}
				}
				response.write(JSON.stringify({error:false,journalId:journalId}));
				
				if(recordDedId){

					var cmRecord = record.load({
						type: record.Type.CREDIT_MEMO,
						id: creditmemoid,
					});

					cmRecord.setValue({
						fieldId : 'custbody_itpm_appliedto',
						value   : recordDedId
					});
									
					sublistLineCount = cmRecord.getLineCount('apply');

					for(var a =0; a < sublistLineCount;a++){
						var type = cmRecord.getSublistValue({
							sublistId: 'apply',
							fieldId: 'type',
							line: a
						}); 
						if(type == 'Journal'){
							var internalid = cmRecord.getSublistValue({
								sublistId: 'apply',
								fieldId: 'internalid',
								line: a
							});
						}
						if(internalid == journalId){
							cmRecord.setSublistValue({
								sublistId: 'apply',
								fieldId: 'apply',
								line: a,
								value: true
							});
						}
						/*else{
							cmRecord.setSublistValue({
								sublistId: 'apply',
								fieldId: 'apply',
								line: a,
								value: false
							});
						}*/
					}

					var cmrecordId = cmRecord.save({
						enableSourcing: false,
						ignoreMandatoryFields: true
					});

					log.debug('cmrecordId ',cmrecordId);
				}else {
					throw {
						name: 'SU_DDN_DEDCM',
						message: 'There was a problem while saving Deduction record'
					}
				}
              
				redirect.toRecord({
					type : 'customtransaction_itpm_deduction',
					id : parameters.did					
				});
			}else if(request.method == 'GET' && parameters.submit == 'false') {
				//Script Parameters
	        	var scriptObj = runtime.getCurrentScript();
	    		var creditmemosearchid = scriptObj.getParameter({name: 'custscript_creditmemo_searchid'});
	    		
				//Fetching credit memo saved search
				var creditMemoSearchObj = search.load({
					id : creditmemosearchid
				 });
				
				creditMemoSearchObj.filters.push(search.createFilter({
				    name    : 'amountremaining',
				    operator: search.Operator.LESSTHANOREQUALTO,
				    values  : deductionRec.getValue('custbody_itpm_ddn_openbal')
				}));
				creditMemoSearchObj.filters.push(search.createFilter({
				    name    : 'entity',
				    operator: search.Operator.IS,
				    values  : parameters.customer
				}));
              
				var list = serverWidget.createList({
				    title : 'Credit Memo List'
				});
				
				list.addButton({id:'custom_cancelbtn',label:'Cancel',functionName:'redirectToBack'});
				list.clientScriptModulePath = './iTPM_Attach_Deduction_Buttons.js';
				
				
				var listcolumn;
				var listIds = [];
				var ids = [];
				//adding column headers dynamically
				creditMemoSearchObj.columns.forEach(function(result){
					if(result.name == 'internalid'){
						listcolumn=list.addColumn({
							id : 'custpage_'+result.name,
							type : serverWidget.FieldType.URL,
							label : 'Apply To'
						});
					}
					else{
						list.addColumn({
							id : 'custpage_'+result.name,
							type : serverWidget.FieldType.TEXT,
							label : result.label
						});
					}
					
					listIds.push('custpage_'+result.name);
					ids.push(result.name);
					
				});
				
				log.debug('listIds.length', listIds);
				log.debug('listIds.length', ids);
				
				listcolumn.setURL({
				    url : output
				});
				
				listcolumn.addParamToURL({
				    param : 'submit',
				    value : 'true'
				});
				
				listcolumn.addParamToURL({
				    param : 'did',
				    value : parameters.did
				});
				
				listcolumn.addParamToURL({
				    param : 'customer',
				    value : parameters.customer
				});
				
				//
				var a = [];
				
				var searchLength = creditMemoSearchObj.run().getRange(0,2).length;
				
				if(searchLength > 1){

					listcolumn.addParamToURL({
					    param : 'cm',
					    value : 'custpage_internalid',
					    dynamic:true
					});
					
					creditMemoSearchObj.run().each(function(result){

						var temp = {};
						for(var i=0; i<listIds.length; i++){
							
							if(listIds[i] == 'custpage_entity'){
								temp[listIds[i]] = result.getText(''+ids[i]+'');
								log.debug('temp',temp);
							}else{
								temp[listIds[i]] = result.getValue(''+ids[i]+'');
								log.debug('temp',temp);
							}
							
							if(i==(listIds.length)-1){
								a.push(temp);
								log.debug('a',a);
								var temp = {};
							}
						}
						
						return true;
					});
					
					list.addRows({
						rows : a
					});
				}else if(searchLength > 0){
					var result = creditMemoSearchObj.run().getRange(0,1)[0];
					listcolumn.addParamToURL({
					    param : 'cm',
					    value : result.getValue(''+ids[0]+'')
					});
					
					var temp = {};
					for(var i=0; i<listIds.length; i++){
						
						if(listIds[i] == 'custpage_entity'){
							temp[listIds[i]] = result.getText(''+ids[i]+'');
							log.debug('temp',temp);
						}else{
							temp[listIds[i]] = result.getValue(''+ids[i]+'');
							log.debug('temp',temp);
						}
						
						if(i==(listIds.length)-1){
							a.push(temp);
							log.debug('a',a);
							var temp = {};
						}
					}
					
					list.addRow({
						row: a[0]
					});
				}
				
				response.writePage(list);
			}
			
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    return {
        onRequest: onRequest
    };
    
});
