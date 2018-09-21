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
				log.debug('GET METHOD(parameters.submit)', parameters.submit);
				var subsidiaryExists = itpm.subsidiariesEnabled();
				var locationExists = itpm.locationsEnabled();
				var classExists = itpm.classesEnabled();
				var departmentExists = itpm.departmentsEnabled();
				var creditmemoid = parameters.cm;

				var dept = (itpm.departmentsEnabled())? deductionRec.getValue('department') : undefined,
					loc = (itpm.locationsEnabled())? deductionRec.getValue('location'): undefined,
					clas = (itpm.classesEnabled())? deductionRec.getValue('class'): undefined;
					
								//getting remaining amount from credit memo
								var cmLookup = search.lookupFields({
									type    : search.Type.CREDIT_MEMO,
									id      : creditmemoid,
									columns : ['amountremaining','tranid']
								});

								var deductionid = parameters.did;
								var jememo = 'Match To Credit Memo '+cmLookup.tranid+' on - iTPM Deduction #'+deductionRec.getValue('tranid');
								var jesubsidiary = deductionRec.getValue('subsidiary');
								var jeamount = cmLookup.amountremaining;
								var jecustomer = parameters.customer;
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

								var jeDetails = createJERecord(subsidiaryExists, jesubsidiary, deductionid, jecreditaccount, jeamount, jememo, jecustomer, jedebitaccount, creditmemoid,dept,clas,loc);

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
										itpm.applyCreditMemo(jecustomer, deductionRec.getValue('custbody_itpm_ddn_openbal'), jeamount, jeDetails.jeID, creditmemoid, deductionid, locationExists, classExists, departmentExists);
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
				//Script Parameters
				var scriptObj = runtime.getCurrentScript();
				var creditmemosearchid = scriptObj.getParameter({name: 'custscript_creditmemo_searchid'});

				var list = creditMemoList(creditmemosearchid, deductionRec.getValue('custbody_itpm_ddn_openbal'), parameters.customer, parameters.did, output);
				response.writePage(list);
			}

		}catch(e){
			log.error(e.name, e.message);
			throw new Error(e.message);
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
	function createJERecord(subsidiaryExists, jesubsidiary, deductionid, jecreditaccount, jeamount, jememo, jecustomer, jedebitaccount, creditmemoid,dept,clas,loc){
		try{
			var jedetails = {};


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
					value     : dept
				});
			}
			if(itpm.classesEnabled()){
				journalEntry.setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'class',
					value     : clas
				});
			}
			if(itpm.locationsEnabled()){
				journalEntry.setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'location',
					value     : loc
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
					value     : dept
				});
			}
			if(itpm.classesEnabled()){
				journalEntry.setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'class',
					value     : clas
				});
			}
			if(itpm.locationsEnabled()){
				journalEntry.setCurrentSublistValue({
					sublistId : 'line',
					fieldId   : 'location',
					value     : loc
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
	function creditMemoList(creditmemosearchid, deductionAmount, customer, did, output){
		try{
			//Fetching credit memo saved search
			var creditMemoSearchObj = search.load({
				id : creditmemosearchid
			});

			//Additional filters adding to "- iTPM Credit Memo To Apply Deduction" search
			creditMemoSearchObj.filters.push(search.createFilter({
				name    : 'amountremaining',
				operator: search.Operator.LESSTHANOREQUALTO,
				values  : deductionAmount
			}));
			creditMemoSearchObj.filters.push(search.createFilter({
				name    : 'entity',
				operator: search.Operator.IS,
				values  : customer
			}));

			var list = serverWidget.createList({
				title : 'Credit Memo List'
			});
			log.debug('id',creditMemoSearchObj)
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
				}else{
					list.addColumn({
						id : 'custpage_'+result.name,
						type : serverWidget.FieldType.TEXT,
						label : result.label
					});
				}

				listIds.push('custpage_'+result.name);
				ids.push(result.name);
				log.debug('ids',ids);

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
				value : did
			});

			listcolumn.addParamToURL({
				param : 'customer',
				value : customer
			});

			//
			var a = [];

			var searchLength = creditMemoSearchObj.run().getRange(0,2).length;

			if(searchLength > 0){

				listcolumn.addParamToURL({
					param : 'cm',
					value : 'custpage_internalid',
					dynamic:true
				});

				creditMemoSearchObj.run().each(function(result){

					var temp = {};
					for(var i=0; i<listIds.length; i++){
						//get url for Credit Memo
						var cmurl = url.resolveRecord({
							recordType: 'creditmemo',
							recordId: result.id,
							isEditMode: false
						});

						if(listIds[i] == 'custpage_entity'){
							temp[listIds[i]] = result.getText(''+ids[i]+'');
							log.debug('temp',temp);
						}else if(listIds[i] == 'custpage_tranid'){
							temp[listIds[i]] = "<a href="+cmurl+">"+result.getValue(''+ids[i]+'')+"</a>";
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