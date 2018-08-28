/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/record',
		'N/redirect', 
		'N/runtime', 
		'N/search', 
		'N/ui/serverWidget', 
		'N/url',
		'./iTPM_Module.js'
		],
/**
 * @param {record} record
 * @param {redirect} redirect
 * @param {runtime} runtime
 * @param {search} search
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(record, redirect, runtime, search, serverWidget, url, itpm) {
   
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
			var creditmemoid = parameters.cmid;
    		log.debug('response', response);
    		log.debug('parameters', parameters);
    		//getting remaining amount from credit memo
    		var cmRec = record.load({
				type: search.Type.CREDIT_MEMO,
				id: parameters.cmid
			});
    		var output = url.resolveScript({
				scriptId: 'customscript_itpm_creditmemo_matchtoddn',
				deploymentId: 'customdeploy_itpm_creditmemo_matchtoddn',
				returnExternalUrl: false
			});
			if(request.method == 'GET' && parameters.submit == 'true'){
				log.debug('GET METHOD(parameters.submit)', parameters.submit);

				var subsidiaryExists = itpm.subsidiariesEnabled();
				var locationExists = itpm.locationsEnabled();
				var classExists = itpm.classesEnabled();
				var departmentExists = itpm.departmentsEnabled();
				var creditmemoid = parameters.cmid;
				var deductionid = parameters.ddnid;
				var ddnLookup = search.lookupFields({
					type    : 'customtransaction_itpm_deduction',
					id      : deductionid,
					columns : ['tranid','custbody_itpm_ddn_openbal']
				});
				var jememo = 'Match To -iTPM Deduction #'+ddnLookup.tranid+' on Credit Memo #'+cmRec.getValue('tranid');
				var jesubsidiary = cmRec.getValue('subsidiary');
				var jeamount = cmRec.getValue('amountremaining');
				var jecustomer = cmRec.getValue('entity');
				var jecreditaccount;
				var jedebitaccount;
				var recordDedId;
				
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

				var jeDetails = createJERecord(subsidiaryExists, jesubsidiary, deductionid, jecreditaccount, jeamount, jememo, jecustomer, jedebitaccount, creditmemoid);
				
				if (jeDetails.jeID){
					//Set iTPM Applied To field on Credit Memo
					var cmRecId = record.submitFields({
		        		type: record.Type.CREDIT_MEMO,
		        		id: creditmemoid,
		        		values: {
		        			'custbody_itpm_appliedto': deductionid
		        		}, 
		        		options: {enablesourcing: true, ignoreMandatoryFields: true}
		        	});
					log.debug('cmRecId',cmRecId);
					
					if(jeDetails.jePreference){
						//Redirect To Journal Entry
						redirect.toRecord({
							type : record.Type.JOURNAL_ENTRY,
							id : jeDetails.jeID					
						});
					}else{
						log.audit('From jeDetails.jePreference', jeDetails.jePreference);
						//Applying Credit Memo
						itpm.applyCreditMemo(jecustomer, ddnLookup.custbody_itpm_ddn_openbal, jeamount, jeDetails.jeID, creditmemoid, deductionid, locationExists, classExists, departmentExists);
					}
				} else {
					throw {
						name: 'SU_DDN_JECM',
						message: 'Journal Entry was not created. Journal ID is empty.'
					}
				}
				response.write(JSON.stringify({success:true,journalId:jeDetails.jeID}));
			}else if(request.method == 'GET' && parameters.submit == 'false') {
				log.debug('GET METHOD(parameters.submit)', parameters.submit);
				
				var list = ddnList(cmRec.getValue('amountremaining'), cmRec.getValue('entity'), parameters.cmid, output);
				response.writePage(list);
			}
    	}catch(e){
			log.error(e.name, e.message);
		}
    }
    /**
	 * @param {Boolean} subsidiaryExists
	 * @param {String} jesubsidiary
	 * @param {String} deductionid
	 * @param {String} jecreditaccount
	 * @param {String} jeamount
	 * @param {String} jememo
	 * @param {String} jecustomer
	 * @param {String} jedebitaccount
	 * 
	 * @returns {Object} JSON
	 * 
	 * @description This function is used to create a Journal Entry record
	 */
	function createJERecord(subsidiaryExists, jesubsidiary, deductionid, jecreditaccount, jeamount, jememo, jecustomer, jedebitaccount, creditmemoid){
		try{
			var jedetails = {};
			//Loading credit memo record
			var cmRecord = record.load({
				type: search.Type.CREDIT_MEMO,
				id: creditmemoid
			});
			//creating JE record
			var journalEntry = record.create({
				type    : record.Type.JOURNAL_ENTRY,
				isDynamic : true
			});

			if(subsidiaryExists){
				journalEntry.setValue({
					fieldId : 'subsidiary',
					value   : jesubsidiary
				});
			}

			//setting body fields Subsidiary and iTPM Applied To
			journalEntry.setValue({
				fieldId : 'custbody_itpm_appliedto',
				value   : creditmemoid
			});
			
			//setting body fields Subsidiary and iTPM Created From
			journalEntry.setValue({
				fieldId : 'custbody_itpm_createdfrom',
				value   : deductionid
			});
			
			//setting body fields memo
			journalEntry.setValue({
				fieldId : 'memo',
				value   : jememo
			});
			
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
				value     : parseFloat(jeamount)
			}).setCurrentSublistValue({
				sublistId : 'line',
				fieldId   : 'memo',
				value     : jememo
			}).setCurrentSublistValue({
				sublistId : 'line',
				fieldId   : 'entity',
				value     : jecustomer
			});
			if(itpm.departmentsEnabled()){
				journalEntry.setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'department',
					value     : cmRecord.getValue('department')
				});
			}
			if(itpm.locationsEnabled()){
				journalEntry.setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'location',
					value     : cmRecord.getValue('location')
				});
			}
			if(itpm.classesEnabled()){
				journalEntry.setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'class',
					value     : cmRecord.getValue('class')
				});
			}
			journalEntry.commitLine({
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
				value     : parseFloat(jeamount)
			}).setCurrentSublistValue({
				sublistId : 'line',
				fieldId   : 'memo',
				value     : jememo
			}).setCurrentSublistValue({
				sublistId : 'line',
				fieldId   : 'entity',
				value     : jecustomer
			});
			if(itpm.departmentsEnabled()){
				journalEntry.setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'department',
					value     : cmRecord.getValue('department')
				});
			}
			if(itpm.locationsEnabled()){
				journalEntry.setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'location',
					value     : cmRecord.getValue('location')
				});
			}
			if(itpm.classesEnabled()){
				journalEntry.setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'class',
					value     : cmRecord.getValue('class')
				});
			}
			journalEntry.commitLine({
				sublistId: 'line'
			});

			var journalId = journalEntry.save({
				enableSourcing: true,
				ignoreMandatoryFields: true
			});
			
			if(journalId){
				jedetails = {jeID:journalId, jePreference:prefJE.featureEnabled};
			}
			
			return jedetails;
		}catch(e){
			log.error(e.name, e.message);
		}
	}

    /**
	 * @param {String} creditmemosearchid
	 * @param {Number} deductionAmount
	 * @param {String} customer
	 * @param {String} did
	 * @param {String} output
	 * 
	 * @returns {Object} list
	 * 
	 * @description This function is used create the Custom form using Suitelet to show the Credit memo(s) based on the business criteria(from Saved Search: "- iTPM Credit Memo To Apply Deduction")
	 */
	function ddnList(cmAmount, cmcustomer, cmid, output){
		try{
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
			    param : 'cmid',
			    value : cmid
			});

			list.addButton({id:'custom_cancelbtn',label:'Cancel',functionName:'redirectToBack'});
			list.clientScriptModulePath = './iTPM_Attach_CreditMemo_ClientMethods.js';
			var DeductionSearch = search.create({
				type:'customtransaction_itpm_deduction',
				columns:['internalid'
				         ,'tranid'
				         ,'custbody_itpm_ddn_openbal'
				         ,'custbody_itpm_customer'
				         ,'custbody_itpm_otherrefcode'
				         ,'custbody_itpm_amount'
				         ,'custbody_itpm_ddn_originalddn'
				         ,'custbody_itpm_ddn_invoice'
				         ,'statusRef'
				         ],
				filters:[
					 ['custbody_itpm_ddn_openbal','greaterthanorequalto', cmAmount],'and'
					,['mainline','is','T'],'and'
					,['custbody_itpm_customer','anyof',cmcustomer],'and'
					,["linesequencenumber","equalto","0"]
					]		    		
			});
			var searchLength = DeductionSearch.run().getRange(0,2).length;
			
			if(searchLength > 1){

				listcolumn.addParamToURL({
				    param : 'ddnid',
				    value : 'custpage_ddnid',
				    dynamic:true
				});
				var a = [];
				DeductionSearch.run().each(function(k){
					if(k.getValue('statusRef') == 'statusA'){					 
						 a.push({ 
							     'custpage_ddnid':k.getValue('internalid')
								,'custpage_ddnnum' : k.getValue('tranid')
								,'custpage_customer' :  k.getText('custbody_itpm_customer')
								,'custpage_ddnotherrefcode': k.getValue('custbody_itpm_otherrefcode')
								,'custpage_ddnopenbalance' :  k.getValue('custbody_itpm_ddn_openbal')
								,'custpage_ddntotalamount' :  k.getValue('custbody_itpm_amount')
								,'custpage_parentddn': k.getText('custbody_itpm_ddn_originalddn')
								,'custpage_invoice' :  k.getText('custbody_itpm_ddn_invoice')
					       });
					}
					return true;
				});
				list.addRows({
					rows :a
				});
			}else if(searchLength > 0){
				var k = DeductionSearch.run().getRange(0,1)[0];
				listcolumn.addParamToURL({
				    param : 'ddnid',
				    value : k.getValue('internalid')
				});
				list.addRow({
					row:{ 
						 'custpage_ddnid':k.getValue('internalid')
							,'custpage_ddnnum' : k.getValue('tranid')
							,'custpage_customer' :  k.getText('custbody_itpm_customer')
							,'custpage_ddnotherrefcode': k.getValue('custbody_itpm_otherrefcode')
							,'custpage_ddnopenbalance' :  k.getValue('custbody_itpm_ddn_openbal')
							,'custpage_ddntotalamount' :  k.getValue('custbody_itpm_amount')
							,'custpage_parentddn': k.getText('custbody_itpm_ddn_originalddn')
							,'custpage_invoice' :  k.getText('custbody_itpm_ddn_invoice')
					 }
				});
			}

			return list;
			
		}catch(e){
			log.error(e.name, e.message);
		}
	}

    return {
        onRequest: onRequest
    };
    
});


