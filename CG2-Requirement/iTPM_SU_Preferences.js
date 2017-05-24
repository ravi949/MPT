/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * It shows the preferences record.If user have no preferences then user can creates the preferences.
 */
define(['N/record', 'N/redirect', 'N/ui/serverWidget', 'N/search'],
		/**
		 * @param {record} record
		 * @param {redirect} redirect
		 * @param {serverWidget} serverWidget
		 */
		function(record, redirect, serverWidget, search) {

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
		//creating a form to enter user Preferences
		if(request.method == 'GET'){
			try{
				var expenseResult = search.create({
					type: search.Type.ACCOUNT,
					columns: ['internalid','name'],
					filters: [ ['type','is','Expense']
					]
				}).run();
				//getting the total number of records in Accounts of type Expense
				var totalExpRecCount = 0,
				expRecCount = 0, expRecMax = 1000,
				expRecCurrentIndex = 0, finalExpenseResult=[]
				do{
					var res = expenseResult.getRange(expRecCurrentIndex, expRecCurrentIndex + expRecMax);
					finalExpenseResult=finalExpenseResult.concat(res);
					expRecCount = res.length;
					expRecCurrentIndex += expRecMax;
					totalExpRecCount += expRecCount;
				}while(expRecCount == expRecMax);

				var accountResult = search.create({
					type: search.Type.ACCOUNT,
					columns: ['internalid','name'],
					filters: [ 	]
				}).run();
				//getting the total number of records in Accounts
				var totalAccRecCount = 0,
				accRecCount = 0, accRecMax = 1000,
				accRecCurrentIndex = 0, finalAccountResult=[]
				do{
					var res = accountResult.getRange(accRecCurrentIndex, accRecCurrentIndex + accRecMax);
					finalAccountResult=finalAccountResult.concat(res);
					accRecCount = res.length;
					accRecCurrentIndex += accRecMax;
					totalAccRecCount += accRecCount;
				}while(accRecCount == accRecMax);

				var form = serverWidget.createForm({
					title: 'iTPM Preferences'
				});
				var tab = form.addTab({
					id : 'custpage_setup_preference',
					label : 'Setup'
				});
				var radioBtn = form.addField({
					id: 'custpage_matc',
					type: serverWidget.FieldType.RADIO,
					label: 'First match Lump Sum on Settlements',
					source:'custpage_ls',
					container:'custpage_setup_preference'
				});
				form.addField({
					id: 'custpage_matc',
					type: serverWidget.FieldType.RADIO,
					label: 'First match Bill Back on Settlements',
					source:'custpage_bb',
					container:'custpage_setup_preference'
				});
				var selectExpense = form.addField({
					id: 'custpage_itpm_pref_ddnaccount',
					type: serverWidget.FieldType.SELECT,
					label: 'Deduction Expense Account',
					container:'custpage_setup_preference'
				});
				//add Default items to select field
				selectExpense.addSelectOption({
					value : ' ',
					text : ' '
				});
				//add items of type Expense in Account records to select field
				finalExpenseResult.forEach(function(e){
					selectExpense.addSelectOption({
						value : e.getValue('internalid'),
						text : e.getValue('name')
					});
				});
				var selectAccountRecords = form.addField({
					id: 'custpage_itpm_pref_overpayaccount',
					type: serverWidget.FieldType.SELECT,
					label: 'Overpay Account',
					container:'custpage_setup_preference'
				});
				//add Default items to select field
				selectAccountRecords.addSelectOption({
					value : ' ',
					text : ' '
				});
				//add items of type Account records to select field
				finalAccountResult.forEach(function(e){
					selectAccountRecords.addSelectOption({
						value : e.getValue('internalid'),
						text : e.getValue('name')
					});
				});
				form.addSubmitButton({
					label: 'Submit'
				});
				
				var prefSearchRes = search.create({
					type:'customrecord_itpm_preferences',
					columns:['internalid'],
					filters: [ ]
				}).run().getRange(0,1);
				//if The user have Preferences then showing his Preferences 
				if(prefSearchRes.length > 0){
					var prefSearchResId = prefSearchRes[0].getValue('internalid');
					var preferanceRecord = record.load({
					    type: 'customrecord_itpm_preferences', 
					    id: prefSearchResId,
					    isDynamic: true,
					});
					var AccountRecordId = preferanceRecord.getValue('custrecord_itpm_pref_overpayaccount'),
					ExpenseId = preferanceRecord.getValue('custrecord_itpm_pref_ddnaccount'),
					matchls= preferanceRecord.getValue('custrecord_itpm_pref_matchls'),
					matchbb= preferanceRecord.getValue('custrecord_itpm_pref_matchbb');
					finalAccountResult.forEach(function(e){
							selectAccountRecords.addSelectOption({
								value : e.getValue('internalid'),
								text : e.getValue('name'),
								isSelected : e.getValue('internalid') == AccountRecordId
							});					
					});
					finalExpenseResult.forEach(function(e){
							selectExpense.addSelectOption({
								value : e.getValue('internalid'),
								text : e.getValue('name'),
								isSelected : e.getValue('internalid') == ExpenseId
							});
					});

					radioBtn.defaultValue = (matchls == true)?'custpage_ls':'custpage_bb';
				}
				//adding a button to redirecting to the previous form
				form.addButton({
					label:'Cancel',
					id : 'custpage_itpm_cancelbtn',
					functionName:"redirectToBack"
				});
				form.clientScriptModulePath =  './iTPM_CS_Preferences_ClientMethods.js';
				context.response.writePage(form);
			}
			catch(e){
				log.debug('Exeception',e);
			}
		}
		if(request.method == 'POST'){
			try{
				var deductionAccount = request.parameters.custpage_itpm_pref_ddnaccount,
				overpayAccount = request.parameters.custpage_itpm_pref_overpayaccount,
				settlementsType = request.parameters.custpage_matc,
				prefSearchRes = search.create({
					type:'customrecord_itpm_preferences',
					columns:['internalid'],
					filters: [ ]
				}).run().getRange(0,1);
				//if preferences record is new then creates a preferences record 
				if(prefSearchRes.length == 0){					
					
					var preferanceRecord = record.create({
						 type: 'customrecord_itpm_preferences',
						 isDynamic: true
					});
					
					preferanceRecord.setValue({
					    fieldId: 'custrecord_itpm_pref_ddnaccount',
					    value: deductionAccount,
					    ignoreFieldChange: true
					});
					preferanceRecord.setValue({
					    fieldId: 'custrecord_itpm_pref_overpayaccount',
					    value: overpayAccount,
					    ignoreFieldChange: true
					});
					if(settlementsType == 'custpage_ls'){
						preferanceRecord.setValue({
						    fieldId: 'custrecord_itpm_pref_matchls',
						    value: true,
						    ignoreFieldChange: true
						});
					}
					if(settlementsType == 'custpage_bb'){
						preferanceRecord.setValue({
						    fieldId: 'custrecord_itpm_pref_matchbb',
						    value: true,
						    ignoreFieldChange: true
						});
					}
					preferanceRecord.save({
					    enableSourcing: true,
					    ignoreMandatoryFields: true
					});
				}
				//if preferences record is available then updates the preferences record 
				if(prefSearchRes.length > 0){
					var prefSearchResId = prefSearchRes[0].getValue('internalid');
					var preferanceRecord = record.load({
					    type: 'customrecord_itpm_preferences', 
					    id: prefSearchResId,
					    isDynamic: true,
					});
					preferanceRecord.setValue({
					    fieldId: 'custrecord_itpm_pref_ddnaccount',
					    value: deductionAccount,
					    ignoreFieldChange: true
					});
					preferanceRecord.setValue({
					    fieldId: 'custrecord_itpm_pref_overpayaccount',
					    value: overpayAccount,
					    ignoreFieldChange: true
					});
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
					redirect.toSuitelet({
					    scriptId: 'customscript_itpm_preference',
					    deploymentId: 'customdeploy_itpm_preference'
					});
				}
			}catch(e){
				log.debug('Exeception',e);
			}			
		}

	}

	return {
		onRequest: onRequest
	};

});
