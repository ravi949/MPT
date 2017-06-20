/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * List out the deductions in the new suitelet view.
 */
define(['N/record',
		'N/search',
		'N/ui/serverWidget',
		'N/runtime',
		'N/config',
		'N/redirect',
		'N/url',
		'./iTPM_ST_Module.js'],
 /**
  * @param {record} record
  * @param {search} search
 */
function(record, search, serverWidget,runtime,config,redirect,url,ST_Module) {

	/**
	 * Definition of the Suitelet script trigger point.
	 *
	 * @param {Object} context
	 * @param {ServerRequest} context.request - Encapsulation of the incoming request
	 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
	 * @Since 2015.2
	 */
	function onRequest(context) 
	{
		try{
			var request = context.request,response = context.response,parameters = request.parameters;

			var output = url.resolveScript({
			    scriptId: 'customscript_itpm_settlement_applyto_ddn',
			    deploymentId: 'customdeploy_itpm_settlement_applyto_ddn',
			    returnExternalUrl: false
			});

			if(request.method == 'GET' && parameters.submit == 'true')
			{
				var SettlementRecId = ST_Module.applyToSettlement(parameters);
//				var deductionRec = record.load({
//					type:'customtransaction_itpm_deduction',
//					id: parameters.ddn,
//					isDynamic: true,
//				});
//
//				var customer=deductionRec.getValue('custbody_itpm_ddn_customer');
//				var DeductionId=deductionRec.getValue('id');
//				var DeductionNum = deductionRec.getValue('tranid');
//				var CustomerRec=record.load({
//					type:record.Type.CUSTOMER,
//					id:customer,
//					isDynamic: true
//				});
//
//				var receivablesaccount=CustomerRec.getValue('receivablesaccount');
//
//				var configRec = config.load({
//					type: config.Type.ACCOUNTING_PREFERENCES
//				});
//				var ARACCOUNT= configRec.getValue({
//					fieldId: 'ARACCOUNT'
//				});
//
//				var numLines = deductionRec.getLineCount({
//					sublistId: 'line'
//				});
//
//				var Account,Debit,Credit;
//
//				for(var i=0; i<numLines; i++)
//				{
//					var lineAccount = deductionRec.getSublistValue({
//						sublistId: 'line',
//						fieldId: 'account',
//						line: i
//					});
//					var lineDebit = deductionRec.getSublistValue({
//						sublistId: 'line',
//						fieldId: 'debit',
//						line: i
//					});
//
//					var lineCredit = deductionRec.getSublistValue({
//						sublistId: 'line',
//						fieldId: 'credit',
//						line: i
//					});		
//
//					var AccountRec=record.load({
//						type:record.Type.ACCOUNT,
//						id:lineAccount
//					});
//
//					var AccountType= AccountRec.getValue('accttype2');	
//
//					if(AccountType == 'Expense'){
//						Account = lineAccount;
//						if(lineDebit != '')
//							Debit = lineDebit;
//					}
//
//					if(lineCredit != '')
//						Credit = lineCredit;
//				}
//
//				var journalRecord = record.create({
//					type: record.Type.JOURNAL_ENTRY		
//				});
//
//				journalRecord.setValue({
//					fieldId: 'subsidiary',
//					value: deductionRec.getValue('subsidiary')
//				}).setValue({
//					fieldId:'memo',
//					value:'Reversal Journal applied on Deduction #'+DeductionNum
//				});						
//
//				journalRecord.setSublistValue({
//					sublistId: 'line',
//					fieldId: 'account',
//					line: 0,
//					value: lineAccount
//				});		
//				journalRecord.setSublistValue({
//	    			sublistId:'line',
//	    			fieldId:'memo',
//					line: 0,
//	    			value:'Reversal Journal applied on Deduction #'+DeductionNum
//	    		});
//				journalRecord.setSublistValue({
//					sublistId: 'line',
//					fieldId: 'credit',
//					line: 0,
//					value: Credit
//				});	
//
//				journalRecord.setSublistValue({
//					sublistId: 'line',
//					fieldId: 'account',
//					line: 1,
//					value: (receivablesaccount != "-10")?receivablesaccount:ARACCOUNT
//				});
//				journalRecord.setSublistValue({
//	    			sublistId:'line',
//	    			fieldId:'memo',
//					line: 1,
//	    			value:'Reversal Journal applied on Deduction #'+DeductionNum
//	    		});
//
//				journalRecord.setSublistValue({
//					sublistId: 'line',
//					fieldId: 'debit',
//					line: 1,
//					value: Debit
//				});
//
//
//				var JournalId = journalRecord.save({
//					enableSourcing: true,
//					ignoreMandatoryFields: true
//				});	
//				log.debug('JournalId',JournalId);
//				var SettlementRec= record.load({
//					type:'customtransaction_itpm_settlement',
//					id: parameters.sid,
//					isDynamic: true
//				});
//				SettlementRec.setValue({
//					fieldId : 'transtatus',
//					value	: "B"
//				});
//				SettlementRec.setValue({
//					fieldId : 'custbody_itpm_set_deduction',
//					value	: DeductionId
//				});
//				var SettlementRecId = SettlementRec.save({
//					enableSourcing: true,
//					ignoreMandatoryFields: true
//				});
				redirect.toRecord({
					type : 'customtransaction_itpm_settlement',
					id : SettlementRecId					
				});


			}else if(request.method == 'GET') {
			
				var list = serverWidget.createList({
				    title : 'Deductions List'
				});
				var listcolumn=list.addColumn({
					id : 'custpage_ddnid',
					type : serverWidget.FieldType.URL,
					label : 'Apply To'
				});
				list.addColumn({
					id : 'custpage_ddnnum',
					type : serverWidget.FieldType.TEXT,
					label : 'Deduction #'
				});
				list.addColumn({
					id : 'custpage_customer',
					type : serverWidget.FieldType.TEXT,
					label : 'Customer'
				});
				list.addColumn({
					id : 'custpage_ddnotherrefcode',
					type : serverWidget.FieldType.TEXT,
					label : 'Other Reference Code'
				});
				list.addColumn({
					id : 'custpage_ddnopenbalance',
					type : serverWidget.FieldType.TEXT,
					label : 'Open Balance'
				});
				list.addColumn({
					id : 'custpage_ddntotalamount',
					type : serverWidget.FieldType.TEXT,
					label : 'Total Amount'
				});
				list.addColumn({
					id : 'custpage_parentddn',
					type : serverWidget.FieldType.TEXT,
					label : 'Parent Deduction'
				});
				list.addColumn({
					id : 'custpage_invoice',
					type : serverWidget.FieldType.TEXT,
					label : 'Invoice #'
				});
				listcolumn.setURL({
				    url : output
				});
				
				listcolumn.addParamToURL({
				    param : 'submit',
				    value : 'true'
				});
				listcolumn.addParamToURL({
				    param : 'sid',
				    value : parameters.sid
				})
				list.addButton({id:'custom_cancelbtn',label:'Cancel',functionName:'redirectToBack'})
				list.clientScriptModulePath = './iTPMSettlement_ClientValidations_cs_script.js'
				
				//getting the settlement request amount from the settlement record.
				var settlementRec = record.load({
					type:'customtransaction_itpm_settlement',
					id:parameters.sid
				}),a = [],
				DeductionSearch = search.create({
					type:'customtransaction_itpm_deduction',
					columns:['internalid'
					         ,'tranid'
					         ,'custbody_itpm_ddn_openbal'
					         ,'custbody_itpm_ddn_customer'
					         ,'custbody_itpm_ddn_otherrefcode'
					         ,'custbody_itpm_ddn_openbal'
					         ,'custbody_itpm_ddn_amount'
					         ,'custbody_itpm_ddn_originalddn'
					         ,'custbody_itpm_ddn_invoice'
					         ,'statusRef'
					         ],
					filters:[
						['custbody_itpm_ddn_openbal','GREATERTHAN', 0],'and'
						,['mainline','is','T'],'and'
						,['custbody_itpm_ddn_openbal','greaterthanorequalto',settlementRec.getValue('custbody_itpm_set_amount')],'and'
						,['custbody_itpm_ddn_customer','is',settlementRec.getValue('custbody_itpm_set_customer')]
						]		    		
				}),searchLength = DeductionSearch.run().getRange(0,2).length;
				
				if(searchLength > 1){

					listcolumn.addParamToURL({
					    param : 'ddn',
					    value : 'custpage_ddnid',
					    dynamic:true
					})
					
					DeductionSearch.run().each(function(k){
						if(k.getValue('statusRef') == 'statusA'){					 
							 a.push({ 
								     'custpage_ddnid':k.getValue('internalid')
									,'custpage_ddnnum' : k.getValue('tranid')
									,'custpage_customer' :  k.getText('custbody_itpm_ddn_customer')
									,'custpage_ddnotherrefcode': k.getValue('custbody_itpm_ddn_otherrefcode')
									,'custpage_ddnopenbalance' :  k.getValue('custbody_itpm_ddn_openbal')
									,'custpage_ddntotalamount' :  k.getValue('custbody_itpm_ddn_amount')
									,'custpage_parentddn': k.getText('custbody_itpm_ddn_originalddn')
									,'custpage_invoice' :  k.getText('custbody_itpm_ddn_invoice')
						       })
						}
						return true;
					});
					list.addRows({
						rows :a
					});
				}else if(searchLength > 0){
					var k = DeductionSearch.run().getRange(0,1)[0];
					listcolumn.addParamToURL({
					    param : 'ddn',
					    value : k.getValue('internalid')
					})
					list.addRow({
						row:{ 
							 'custpage_ddnid':k.getValue('internalid')
								,'custpage_ddnnum' : k.getValue('tranid')
								,'custpage_customer' :  k.getText('custbody_itpm_ddn_customer')
								,'custpage_ddnotherrefcode': k.getValue('custbody_itpm_ddn_otherrefcode')
								,'custpage_ddnopenbalance' :  k.getValue('custbody_itpm_ddn_openbal')
								,'custpage_ddntotalamount' :  k.getValue('custbody_itpm_ddn_amount')
								,'custpage_parentddn': k.getText('custbody_itpm_ddn_originalddn')
								,'custpage_invoice' :  k.getText('custbody_itpm_ddn_invoice')
						 }
					})
				}
				
				response.writePage(list); 
			}
		}catch (e) {
    		log.error(e.name,e.message);
    	}
	}
	return {
		onRequest: onRequest
	};

});
