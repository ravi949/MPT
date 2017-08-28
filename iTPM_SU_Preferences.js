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
	 * @param { string } type Discount 
	 * @return { search } item search
	 */
	function getItems(type){
		if(type == 'Discount'){
			return search.create({
				type:search.Type.ITEM,
				columns:['internalid','itemid'],
				filters:[['type','is','Discount'],'and',['isinactive','is',false]]
			}).run();
		}
	}
	
	/**
	 * @param {string} type Expense, AcctPay, All
	 * @return { JSON object }error and accouts array
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
	 * @return { JSON object } error and form values
	 * 
	 * @description create the form with fields
	 */
	function createPreferenceForm(expenseAccounts, deductionAccounts, settlementAccounts, discountItemSearch){
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
			
			//Expense account
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
			
			//Deduction account
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
			
			//Apply iTPM Discount Item
			var discountItemField = form.addField({
				id: 'custpage_itpm_pref_discountitem',
				type: serverWidget.FieldType.SELECT,
				label: 'iTPM Discount Item',
				container:'custpage_setup_preference'
			}); 
			discountItemField.isMandatory = true;
			discountItemField.addSelectOption({
				value:' ',
				text:' '
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
			
			//Apply iTPM Net Bill Discount only on List Price? Field
			var ApplyiTPMNetBillDiscountChk = form.addField({
				id: 'custpage_itpm_pref_nblistprice',
				type: serverWidget.FieldType.CHECKBOX,
				label: 'Apply iTPM Net Bill Discount only on List Price?',
				container:'custpage_setup_preference'
			});
			ApplyiTPMNetBillDiscountChk.setHelpText({
			    help : 'Check this box if the system should apply Net Bill discounts on Sales Transaction lines only if the line\'s Price Level is \"List / Base\" price. This is usually the default price level of an item in NetSuite.'
			});
			
			//iTPM Discount Dates Radio Button (it is a List type on Preference record
			var discountDatesField = form.addField({
				id: 'custpage_itpm_ddlabel',
				type: serverWidget.FieldType.LABEL,
				label: 'iTPM Discount Dates',
				container:'custpage_setup_preference'
			});
			discountDatesField.setHelpText({
			    help : 'Select the dates that should be used while searching for promotional off invoice and net bill discounts to apply to a transaction.'
			});
			
			discountDatesField.isMandatory = true;
			
			var radioITPMDiscountDate = form.addField({
				id: 'custpage_itpm_disdate',
				type: serverWidget.FieldType.RADIO,
				label: 'Ship Date',
				source:'custpage_sd',
				container:'custpage_setup_preference'
			});
			form.addField({
				id: 'custpage_itpm_disdate',
				type: serverWidget.FieldType.RADIO,
				label: 'Order Date',
				source:'custpage_od',
				container:'custpage_setup_preference'
			});
			
			form.addField({
				id: 'custpage_itpm_disdate',
				type: serverWidget.FieldType.RADIO,
				label: 'Both',
				source:'custpage_both',
				container:'custpage_setup_preference'
			});
			form.addField({
				id: 'custpage_itpm_disdate',
				type: serverWidget.FieldType.RADIO,
				label: 'Either',
				source:'custpage_either',
				container:'custpage_setup_preference'
			});
			
			form.addSubmitButton({
				label: 'Submit'
			});
			
			var deductionId, expenseId, settlementId, matchls, matchbb, discountItemId;
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
				deductionId = preferanceRecord.getValue('custrecord_itpm_pref_ddnaccount');
				expenseId = preferanceRecord.getValue('custrecord_itpm_pref_expenseaccount');
				settlementId =  preferanceRecord.getValue('custrecord_itpm_pref_settlementsaccount');
				matchls = preferanceRecord.getValue('custrecord_itpm_pref_matchls');
				matchbb = preferanceRecord.getValue('custrecord_itpm_pref_matchbb');
				radioBtn.defaultValue = (matchls == true)?'custpage_ls':'custpage_bb';
				ApplyiTPMNetBillDiscountChk.defaultValue = preferanceRecord.getValue('custrecord_itpm_pref_nblistprice')?'T':'F';
				discountItemId = preferanceRecord.getValue('custrecord_itpm_pref_discountitem');
				
				switch(preferanceRecord.getValue('custrecord_itpm_pref_discountdates')){
				case '1' : 
					radioITPMDiscountDate.defaultValue = 'custpage_sd';
					break;
				case '2' : 
					radioITPMDiscountDate.defaultValue = 'custpage_od';
					break;
				case '3' : 
					radioITPMDiscountDate.defaultValue = 'custpage_both';
					break;
				case '4' : 
					radioITPMDiscountDate.defaultValue = 'custpage_either';
					break;
				default : 
					radioITPMDiscountDate.defaultValue = 'custpage_sd';
					break;
				}
			}
						
			//setting the accounts values into the fields
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
			
			//add discount items to the iTPM Discount Item field
			discountItemSearch.each(function(e){
				discountItemField.addSelectOption({
					value:e.getValue('internalid'),
					text:e.getValue('itemid'),
					isSelected:e.getValue('internalid') == discountItemId
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
			return {error: true, errorObject: ex, expenseAccounts: expenseAccounts, deductionAccounts: deductionAccounts, settlementAccounts: settlementAccounts}
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
				var discountItemSearch = getItems('Discount');
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
				var form = createPreferenceForm(expenseResult, expenseResult, accountPayResult, discountItemSearch);
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
				throw ex.message + '; Method: ' + request.method;
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
					savePreferenceRecord(preferanceRecord,request);
				}
				//if preferences record is available then updates the preferences record 
				if(prefSearchRes.length > 0){
					var prefSearchResId = prefSearchRes[0].getValue('internalid');
					var preferanceRecord = record.load({
					    type: 'customrecord_itpm_preferences', 
					    id: prefSearchResId,
					    isDynamic: true,
					});
					savePreferenceRecord(preferanceRecord,request);
				}
				
				redirect.toSuitelet({
				    scriptId: scriptObj.id,
				    deploymentId: scriptObj.deploymentId
				});
				
			}catch(ex){
				log.error(ex.name, ex.message + '; Method: ' + request.method);
				throw ex.message + '; Method: ' + request.method;
			}			
		}

	}
	
	function savePreferenceRecord(preferanceRecord,request){
		
		var deductionAccount = request.parameters.custpage_itpm_pref_ddnaccount,
		expenseAccount = request.parameters.custpage_itpm_pref_expenseaccount,
		settlementsType = request.parameters.custpage_match,
		accountPayableId = request.parameters.custpage_itpm_pref_accountpayable,
		applyiTPMNetBillDiscount = request.parameters.custpage_itpm_pref_nblistprice,
		discountItemId = request.parameters.custpage_itpm_pref_discountitem;
		discountDates = request.parameters.custpage_itpm_disdate;
		
		preferanceRecord.setValue({
		    fieldId: 'custrecord_itpm_pref_ddnaccount',
		    value: deductionAccount,
		    ignoreFieldChange: true
		}).setValue({
		    fieldId: 'custrecord_itpm_pref_expenseaccount',
		    value: expenseAccount,
		    ignoreFieldChange: true
		}).setValue({
			fieldId:'custrecord_itpm_pref_settlementsaccount',
			value:accountPayableId,
			ignoreFieldChange:true
		}).setValue({
			fieldId:'custrecord_itpm_pref_nblistprice',
			value:(applyiTPMNetBillDiscount == 'T'),
			ignoreFieldChange:true
		}).setValue({
			fieldId:'custrecord_itpm_pref_discountitem',
			value:discountItemId,
			ignoreFieldChange:true
		});
		
		switch(discountDates){
			case 'custpage_sd' : 
				preferanceRecord.setValue({
					fieldId:'custrecord_itpm_pref_discountdates',
					value:1,
					ignoreFieldChange:true
				});
				break;
			case 'custpage_od' : 
				preferanceRecord.setValue({
					fieldId:'custrecord_itpm_pref_discountdates',
					value:2,
					ignoreFieldChange:true
				});
				break;
			case 'custpage_both' : 
				preferanceRecord.setValue({
					fieldId:'custrecord_itpm_pref_discountdates',
					value:3,
					ignoreFieldChange:true
				});
				break;
			case 'custpage_either' : 
				preferanceRecord.setValue({
					fieldId:'custrecord_itpm_pref_discountdates',
					value:4,
					ignoreFieldChange:true
				});
				break;
			default : 
				preferanceRecord.setValue({
					fieldId:'custrecord_itpm_pref_discountdates',
					value:1,
					ignoreFieldChange:true
				});
				break;
		}
		
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
