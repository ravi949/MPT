/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * It shows the preferences record.If user have no preferences then user can creates the preferences.
 */
define(['N/record', 'N/redirect', 'N/ui/serverWidget', 'N/search','N/runtime'],
/**
 * @param {record} record
 * @param {redirect} redirect
 * @param {serverWidget} serverWidget
 */
function(record, redirect, serverWidget, search, runtime) {

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
					filters: [ ['type','is','Expense'],'and',
							   ['isinactive','is',false]
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
					filters: [['isinactive','is',false]]
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
					label: 'Deduction Account',
					container:'custpage_setup_preference'
				});
				//add Default items to select field
				selectExpense.addSelectOption({
					value : ' ',
					text : ' '
				});

				//Expense account field which is mandatory
				var expenseAccntField = form.addField({
					id: 'custpage_itpm_pref_expenseaccount',
					type: serverWidget.FieldType.SELECT,
					label: 'Expense Account',
					container:'custpage_setup_preference'
				}).updateLayoutType({
				    layoutType : serverWidget.FieldLayoutType.ENDROW
				});
				expenseAccntField.isMandatory = true;
				//add Default items to select field
				expenseAccntField.addSelectOption({
					value : ' ',
					text : ' '
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

				form.addSubmitButton({
					label: 'Submit'
				});
				
				var prefSearchRes = search.create({
					type:'customrecord_itpm_preferences',
					columns:['internalid'],
					filters: []
				}).run().getRange(0,1),
				AccountRecordId,DdnExpenseId,ExpenseId,matchls,matchbb;
				//if The user have Preferences then showing his Preferences 
				if(prefSearchRes.length > 0){
					var prefSearchResId = prefSearchRes[0].getValue('internalid');
					var preferanceRecord = record.load({
					    type: 'customrecord_itpm_preferences', 
					    id: prefSearchResId,
					    isDynamic: true,
					});
					
					AccountRecordId = preferanceRecord.getValue('custrecord_itpm_pref_overpayaccount'),
					DdnExpenseId = preferanceRecord.getValue('custrecord_itpm_pref_ddnaccount'),
					ExpenseId = preferanceRecord.getValue('custrecord_itpm_pref_expenseaccount'),
					matchls = preferanceRecord.getValue('custrecord_itpm_pref_matchls'),
					matchbb = preferanceRecord.getValue('custrecord_itpm_pref_matchbb');
					radioBtn.defaultValue = (matchls == true)?'custpage_ls':'custpage_bb';
				}
				
				//setting the accounts values into the fields
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
						isSelected : e.getValue('internalid') == DdnExpenseId
					});
				});
				log.debug('ExpenseId',ExpenseId)
				//add items of type Expense in Account records to select field
				finalExpenseResult.forEach(function(e){
					expenseAccntField.addSelectOption({
						value : e.getValue('internalid'),
						text : e.getValue('name'),
						isSelected : e.getValue('internalid') == ExpenseId
					});
				});
				
				
				
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
				var scriptObj = runtime.getCurrentScript(), 
				prefSearchRes = search.create({
					type:'customrecord_itpm_preferences',
					columns:['internalid'],
					filters: []
				}).run().getRange(0,1);
				//if preferences record is new then creates a preferences record 
				if(prefSearchRes.length == 0){					
					log.debug('expenseAccount',expenseAccount)
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
				log.error('Exeception',e);
			}			
		}

	}
	
	function savePreferenceRecord(preferanceRecord,request){
		var deductionAccount = request.parameters.custpage_itpm_pref_ddnaccount,
		overpayAccount = request.parameters.custpage_itpm_pref_overpayaccount,
		expenseAccount = request.parameters.custpage_itpm_pref_expenseaccount,
		settlementsType = request.parameters.custpage_matc;
		
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
	}

	return {
		onRequest: onRequest
	};

});
