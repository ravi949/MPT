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
	 * @param {Object} discountItemSearch
	 * @return { JSON object } error and form values
	 * 
	 * @description create the form with fields
	 */
	function createPreferenceForm(discountItemSearch){
		try{
			var form = serverWidget.createForm({
				title: '- iTPM Preferences'
			});
			var tab = form.addTab({
				id : 'custpage_setup_preference',
				label : 'Setup'
			});
			
			//Default Allowance Type Field
			var defaultAllType = form.addField({
				id: 'custpage_itpm_pref_defaultalltype',
				label: 'Default Allowance Type',
				type: serverWidget.FieldType.SELECT,
				source:'customlist_itpm_allowancetype',
				container:'custpage_setup_preference'
			});

			//Default Price Level Field
			var defaultPriceLevel = form.addField({
				id: 'custpage_itpm_pref_defaultpricelevel',
				label: 'Default Price Level',
				type: serverWidget.FieldType.SELECT,
				source:'pricelevel',
				container:'custpage_setup_preference'
			});

			//Expense account
			var expenseAccntField = form.addField({
				id: 'custpage_itpm_pref_expenseaccount',
				type: serverWidget.FieldType.SELECT,
				label: 'Expense Account',
				container:'custpage_setup_preference',
				source:'account'
			}).updateBreakType({
				breakType : serverWidget.FieldBreakType.STARTCOL
			});
			expenseAccntField.isMandatory = true;

           //Deduction account
			var deductionAccntField = form.addField({
				id: 'custpage_itpm_pref_ddnaccount',
				type: serverWidget.FieldType.SELECT,
				label: 'Deduction Account',
				container:'custpage_setup_preference',
				source:'account'
			});
			deductionAccntField.isMandatory = true;
			
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
				container:'custpage_setup_preference',
				source:'account'
			}).updateBreakType({
				breakType : serverWidget.FieldBreakType.STARTCOL
			});
			accountPayableField.isMandatory = true;
			
			//Checkbox for Remove customer from split deduction transactions
			var removeCustomerSplitDDNField = form.addField({
				id: 'custpage_itpm_pref_remvcust_frmsplitddn',
				type: serverWidget.FieldType.CHECKBOX,
				label: 'Remove customer from split deduction transactions?',
				container:'custpage_setup_preference'
			});
			removeCustomerSplitDDNField.setHelpText({
				help:'Remove the customers from split deduction transaction lines.'
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
				deductionAccntField.defaultValue = preferanceRecord.getValue('custrecord_itpm_pref_ddnaccount');
				expenseAccntField.defaultValue = preferanceRecord.getValue('custrecord_itpm_pref_expenseaccount');
				accountPayableField.defaultValue =  preferanceRecord.getValue('custrecord_itpm_pref_settlementsaccount');
				ApplyiTPMNetBillDiscountChk.defaultValue = preferanceRecord.getValue('custrecord_itpm_pref_nblistprice')?'T':'F';
				discountItemId = preferanceRecord.getValue('custrecord_itpm_pref_discountitem');
				defaultAllType.defaultValue = preferanceRecord.getValue('custrecord_itpm_pref_defaultalltype');
				defaultPriceLevel.defaultValue = preferanceRecord.getValue('custrecord_itpm_pref_defaultpricelevel');
				removeCustomerSplitDDNField.defaultValue = (preferanceRecord.getValue('custrecord_itpm_pref_remvcust_frmsplit'))?'T':'F';
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
			return {error: true, errorObject: ex }
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
				var form = createPreferenceForm(discountItemSearch);
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
		accountPayableId = request.parameters.custpage_itpm_pref_accountpayable,
		applyiTPMNetBillDiscount = request.parameters.custpage_itpm_pref_nblistprice,
		discountItemId = request.parameters.custpage_itpm_pref_discountitem,
		removeCustomer = request.parameters.custpage_itpm_pref_remvcust_frmsplitddn,
		discountDates = request.parameters.custpage_itpm_disdate;
		var defaultalltype = request.parameters.custpage_itpm_pref_defaultalltype;
		var defaultPriceLevel = request.parameters.custpage_itpm_pref_defaultpricelevel;
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
		}).setValue({
			fieldId:'custrecord_itpm_pref_defaultalltype',
			value:defaultalltype,
			ignoreFieldChange:true
		}).setValue({
			fieldId:'custrecord_itpm_pref_defaultpricelevel',
			value:defaultPriceLevel,
			ignoreFieldChange:true
		}).setValue({
			fieldId:'custrecord_itpm_pref_remvcust_frmsplit',
			value:(removeCustomer == 'T'),
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

		preferanceRecord.save({
			enableSourcing: true,
			ignoreMandatoryFields: true
		});
	}

	return {
		onRequest: onRequest
	};

});
