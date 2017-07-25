/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Front-end suitelet for iTPM Preferences. The preferences record is set to not be available via UI.
 */
define(['N/record',
		'N/redirect',
		'N/ui/serverWidget',
		'N/search',
		'N/runtime'
		],
/**
 * @param {record} record
 * @param {redirect} redirect
 * @param {serverWidget} serverWidget
 */
function(record, redirect, serverWidget, search, runtime) {
	
	/**
	 * @param {string} type Expense, AcctPay, All
	 */
	function getAccounts(type){
		try{
			var perm_accounts = runtime.getCurrentUser().getPermission({name: 'LIST_ACCOUNT'});
			if (perm_accounts == runtime.Permission.NONE) {
				throw {
					name:'getAccounts_Error',
					message:'The current role does not have permissions to view Accounts list. Minimum permission of VIEW is required.'
				}
			}
			var searchFilters = [['isinactive','is',false]];
			if (! type){
				throw{
					name:'getAccounts_Error',
					message:'Type not specified for getAccounts(type)'
				}
			} else if (type == 'Expense'){
				searchFilters.push('and');
				searchFilters.push(['type', 'is', type]);
			} else if (type == 'AcctPay'){
				searchFilters.push('and');
				searchFilters.push(['type', 'is', type]);
			} else {type == 'All'
				
			}
			var searchResult = search.create({
				type: search.Type.ACCOUNT,
				columns: ['internalid','name'],
				filters: searchFilters
			}).run();
			if (! searchResult) {
				throw{
					name:'getAccounts_Error',
					message:'Search create failed.'
				}
			} else {
				var results = null, returnObject = [], resultStep = 999, resultIndex = 0;
				do {
					results = searchResult.getRange(resultIndex, resultIndex + resultStep);
					returnObject = returnObject.concat(results);
				} while (results && results.length == resultStep)
				return {error: false, accounts: returnObject}
			}
		} catch(ex) {
			return {error: true, errorObject:ex, type: type}
		}
	}
	
	/**
	 * @param {Object} expenseAccounts
	 * @param {Object} deductionAccounts
	 * @param {Object} settlmentAccounts
	 * @param {Object} overpayAccounts
	 */
	function createPreferenceForm(expenseAccounts, deductionAccounts, settlementAccounts, overpayAccounts){
		try{
			var form = serverWidget.createForm({
				title: 'iTPM Preferences'
			});
			var tab = form.addTab({
				id : 'custpage_setup_preference',
				label : 'Setup'
			});
			var radioBtn = form.addField({
				id: 'custpage_match',
				type: serverWidget.FieldType.RADIO,
				label: 'First match Lump Sum on Settlements',
				source:'custpage_ls',
				container:'custpage_setup_preference'
			});
			form.addField({
				id: 'custpage_match',
				type: serverWidget.FieldType.RADIO,
				label: 'First match Bill Back on Settlements',
				source:'custpage_bb',
				container:'custpage_setup_preference'
			});
			var expenseAccntField = form.addField({
				id: 'custpage_itpm_pref_expenseaccount',
				type: serverWidget.FieldType.SELECT,
				label: 'Expense Account',
				container:'custpage_setup_preference'
			}).updateBreakType({
			    breakType : serverWidget.FieldBreakType.STARTCOL
			});
			expenseAccntField.isMandatory = true;
			//add Default items to select field
			expenseAccntField.addSelectOption({
				value : ' ',
				text : ' '
			});
			
			var selectExpense = form.addField({
				id: 'custpage_itpm_pref_ddnaccount',
				type: serverWidget.FieldType.SELECT,
				label: 'Deduction Account',
				container:'custpage_setup_preference'
			});
			selectExpense.isMandatory = true;
			//add Default items to select field
			selectExpense.addSelectOption({
				value : ' ',
				text : ' '
			});

			//Accounts Payable account field
			var accountPayableField = form.addField({
				id: 'custpage_itpm_pref_accountpayable',
				type: serverWidget.FieldType.SELECT,
				label: 'Accounts Payable',
				container:'custpage_setup_preference'
			}).updateBreakType({
			    breakType : serverWidget.FieldBreakType.STARTCOL
			});
			accountPayableField.isMandatory = true;
			//add Default items to select field
			accountPayableField.addSelectOption({
				value : ' ',
				text : ' '
			});
			
			//Over pay account field
			var selectAccountRecords = form.addField({
				id: 'custpage_itpm_pref_overpayaccount',
				type: serverWidget.FieldType.SELECT,
				label: 'Overpay Account',
				container:'custpage_setup_preference'
			});
			selectAccountRecords.isMandatory = true;
			//add Default items to select field
			selectAccountRecords.addSelectOption({
				value : ' ',
				text : ' '
			});
			
			form.addSubmitButton({
				label: 'Submit'
			});
			
			var overpayId, deductionId, expenseId, settlementId, matchls, matchbb;
			var prefSearchRes = search.create({
				type:'customrecord_itpm_preferences',
				columns:['internalid']
			}).run().getRange(0,2);
			if (! prefSearchRes) {
				throw{
					name: 'createPreferenceForm_Error',
					message: 'CUSTOMRECORD_ITPM_PREFERENCES search returned empty.'
				}
			} else if (prefSearchRes.length > 1){
				throw {
					name: 'createPreferenceForm_Error',
					message: 'CUSTOMRECORD_ITPM_PREFERENCES search returned multiple.'
				}
			} else if (prefSearchRes.length == 1){
				var prefSearchResId = prefSearchRes[0].getValue('internalid');
				var preferanceRecord = record.load({
				    type: 'customrecord_itpm_preferences', 
				    id: prefSearchResId
				});
				
				overpayId = preferanceRecord.getValue('custrecord_itpm_pref_overpayaccount');
				deductionId = preferanceRecord.getValue('custrecord_itpm_pref_ddnaccount');
				expenseId = preferanceRecord.getValue('custrecord_itpm_pref_expenseaccount');
				settlementId =  preferanceRecord.getValue('custrecord_itpm_pref_settlementsaccount');
				matchls = preferanceRecord.getValue('custrecord_itpm_pref_matchls');
				matchbb = preferanceRecord.getValue('custrecord_itpm_pref_matchbb');
				radioBtn.defaultValue = (matchls == true)?'custpage_ls':'custpage_bb';
			} else {
				
			}
						
			//setting the accounts values into the fields
			overpayAccounts.accounts.forEach(function(e){
				selectAccountRecords.addSelectOption({
					value : e.getValue('internalid'),
					text : e.getValue('name'),
					isSelected : e.getValue('internalid') == overpayId
				});					
			});
			deductionAccounts.accounts.forEach(function(e){
				selectExpense.addSelectOption({
					value : e.getValue('internalid'),
					text : e.getValue('name'),
					isSelected : e.getValue('internalid') == deductionId
				});
			});
			
			//add items of type Expense in Account records to select field
			expenseAccounts.accounts.forEach(function(e){
				expenseAccntField.addSelectOption({
					value : e.getValue('internalid'),
					text : e.getValue('name'),
					isSelected : e.getValue('internalid') == expenseId
				});
			});
			
			//add items of type Account Payable in Account records to select field
			settlementAccounts.accounts.forEach(function(e){
				accountPayableField.addSelectOption({
					value : e.getValue('internalid'),
					text : e.getValue('name'),
					isSelected : e.getValue('internalid') == settlementId
				});
			});
			
			
			//adding a button to redirecting to the previous form
			form.addButton({
				label:'Cancel',
				id : 'custpage_itpm_cancelbtn',
				functionName:"redirectToBack"
			});
			form.clientScriptModulePath =  './iTPM_Attach_Preferences_ClientMethods.js';
			
			return {error: false, form: form}
		} catch(ex) {
			return {error: true, errorObject: ex, expenseAccounts: expenseAccounts, deductionAccounts: deductionAccounts, settlementAccounts: settlementAccounts, overpayAccounts: overpayAccounts}
		}
	}

	/**
	 * Definition of the Suitelet script trigger point.
	 *
	 * @param {Object} context
	 * @param {ServerRequest} context.request - Encapsulation of the incoming request
	 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
	 * @Since 2015.2
	 */
	function onRequest(context) {

		var request = context.request,response = context.response;
		
		if(request.method == 'GET'){
			try{
				var expenseResult = getAccounts('Expense');
				if (expenseResult.error){
					throw {
						name: expenseResult.errorObject.name,
						message: expenseResult.errorObject.message + '; Type: ' + expenseResult.type
					}
				}
				var accountResult = getAccounts('All');
				if (accountResult.error){
					throw {
						name: accountResult.errorObject.name,
						message: accountResult.errorObject.message + '; Type: ' + accountResult.type
					}
				}
				var accountPayResult = getAccounts('AcctPay');
				if (accountPayResult.error){
					throw {
						name: accountPayResult.errorObject.name,
						message: accountPayResult.errorObject.message + '; Type: ' + accountPayResult.type
					}
				}

				var form = createPreferenceForm(expenseResult, expenseResult, accountPayResult, expenseResult);
				if (form.error){
					throw {
						name: 'createPreferenceForm_Error',
						message: form.errorObject.name + '; ' + form.errorObject.message
					}
				} else {
					context.response.writePage(form.form);
				}
			}
			catch(ex){
				log.error(ex.name, ex.message + '; Method: ' + request.method);
				throw ex;
			}
		}
		if(request.method == 'POST'){
			try{
				var scriptObj = runtime.getCurrentScript(), 
				prefSearchRes = search.create({
					type:'customrecord_itpm_preferences',
					columns:['internalid']
				}).run().getRange(0,1);
				if(prefSearchRes.length == 0){
					var preferanceRecord = record.create({
						 type: 'customrecord_itpm_preferences',
						 isDynamic: true
					});
					savePreferenceRecord(preferanceRecord,request)
				}
				//if preferences record is available then updates the preferences record 
				if(prefSearchRes.length > 0){
					var prefSearchResId = prefSearchRes[0].getValue('internalid');
					var preferanceRecord = record.load({
					    type: 'customrecord_itpm_preferences', 
					    id: prefSearchResId,
					    isDynamic: true,
					});
					savePreferenceRecord(preferanceRecord,request)
				}
				
				redirect.toSuitelet({
				    scriptId: scriptObj.id,
				    deploymentId: scriptObj.deploymentId
				});
				
			}catch(e){
				log.error(ex.name, ex.message + '; Method: ' + request.method);
				throw ex;
			}			
		}

	}
	
	function savePreferenceRecord(preferanceRecord,request){
		var deductionAccount = request.parameters.custpage_itpm_pref_ddnaccount,
		overpayAccount = request.parameters.custpage_itpm_pref_overpayaccount,
		expenseAccount = request.parameters.custpage_itpm_pref_expenseaccount,
		settlementsType = request.parameters.custpage_match,
		accountPayableId = request.parameters.custpage_itpm_pref_accountpayable;
		
		preferanceRecord.setValue({
		    fieldId: 'custrecord_itpm_pref_ddnaccount',
		    value: deductionAccount,
		    ignoreFieldChange: true
		}).setValue({
		    fieldId: 'custrecord_itpm_pref_overpayaccount',
		    value: overpayAccount,
		    ignoreFieldChange: true
		}).setValue({
		    fieldId: 'custrecord_itpm_pref_expenseaccount',
		    value: expenseAccount,
		    ignoreFieldChange: true
		}).setValue({
			fieldId:'custrecord_itpm_pref_settlementsaccount',
			value:accountPayableId,
			ignoreFieldChange:true
		})
		
		
		if(settlementsType == 'custpage_ls'){
			preferanceRecord.setValue({
			    fieldId: 'custrecord_itpm_pref_matchls',
			    value: true,
			    ignoreFieldChange: true
			});
		}else{
			preferanceRecord.setValue({
			    fieldId: 'custrecord_itpm_pref_matchls',
			    value: false,
			    ignoreFieldChange: true
			});
		}
		if(settlementsType == 'custpage_bb'){
			preferanceRecord.setValue({
			    fieldId: 'custrecord_itpm_pref_matchbb',
			    value: true,
			    ignoreFieldChange: true
			});
		}else{
			preferanceRecord.setValue({
			    fieldId: 'custrecord_itpm_pref_matchbb',
			    value: false,
			    ignoreFieldChange: true
			});
		}
		preferanceRecord.save({
		    enableSourcing: true,
		    ignoreMandatoryFields: true
		});
	}

	return {
		onRequest: onRequest
	};

});
