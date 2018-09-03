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
        'N/runtime',
        'N/url',
        './iTPM_Module.js'
        ],
/**
* @param {record} record
* @param {redirect} redirect
* @param {serverWidget} serverWidget
*/
function(record, redirect, serverWidget, search, runtime, url, itpm) {

	var scriptObj = runtime.getCurrentScript();
	var subsidiariesEnabled = itpm.subsidiariesEnabled();
	
	/**
	 * @param { string } type Discount 
	 * @return { search } item search
	 */
	function getItems(type, subid){
		try{
			if(type == 'Discount'){
				var searchFilters = [['type','is','Discount'],'and',
							         ['isinactive','is',false]];
				if(subsidiariesEnabled){
					searchFilters.push('and',['subsidiary','anyof',subid]);
				}
				return search.create({
					type:search.Type.ITEM,
					columns:['internalid','itemid'],
					filters:searchFilters
				}).run();
			}
		}catch(ex){
			throw {
				name:ex.name,
				message:ex.message
			};
		}
	}
	
	/**
	 * @param {number} subid
	 * @description filter the accounts with subsidiary and return the result set
	 */
	function getAccounts(subid){
		try{
			return search.create({
				type:search.Type.ACCOUNT,
				columns:['internalid','name'],
				filters:[['subsidiary','anyof',subid],'and',
					     ['isinactive','is',false]]
			}).run();
		}catch(ex){
			throw {
				name:ex.name,
				message:ex.message
			};
		}
	}
	
	/*
	 * @description returning the preferences records resultset
	 */
	function getPreferences(id, subid){
		try{
			var searchOptions = {
					type:'customrecord_itpm_preferences',
					columns:['internalid',
					         'custrecord_itpm_pref_ddnaccount',
					         'custrecord_itpm_pref_expenseaccount',
					         'custrecord_itpm_pref_settlementsaccount',
					         'custrecord_itpm_pref_nblistprice',
					         'custrecord_itpm_pref_discountitem',
					         'custrecord_itpm_pref_defaultalltype',
					         'custrecord_itpm_pref_defaultpricelevel',
					         'custrecord_itpm_pref_remvcust_frmsplit',
					         'custrecord_itpm_pref_discountdates',
					         'custrecord_itpm_pref_version']
			};
			if(id){
				searchOptions['filters'] = ['internalid','anyof',id];
			}
			if(subsidiariesEnabled && subid){
				searchOptions['filters'] = ['custrecord_itpm_pref_subsidiary','anyof',subid];
			}
			if(subsidiariesEnabled){
				searchOptions['columns'].push('custrecord_itpm_pref_subsidiary');
			}
			
			return search.create(searchOptions).run();
		}catch(ex){
			throw {
				name:ex.name,
				message:ex.message
			};
		}
	}
	
	
	/**
	 * @param {Number} id
	 * @param {String} label
	 * @param {String} source
	 * @description create the field options object and return
	 */
	function getFieldOptions(id, label, source){
		var fieldOptions = {
				id: id,
				type: serverWidget.FieldType.SELECT,
				label: label,
				container:'custpage_setup_preference'
			};
		if(!subsidiariesEnabled){
			fieldOptions['source'] = source;
		}
		return fieldOptions;
	}

	
  /**
	 * @param {Object} request
	 * @return { JSON object } error and form values
	 * 
	 * @description create the form with fields
	 */
	function createPreferenceForm(request){
		try{
			var params = request.parameters;
			params.subid = (subsidiariesEnabled)? params.subid : 1;
			var prefSublist;
			var form = serverWidget.createForm({
				title: '- iTPM Preferences'
			});
			var tab = form.addTab({
				id : 'custpage_setup_preference',
				label : 'Setup'
			});
			
			//showing the form based on user event types
			if(params.type == 'create' || params.type == 'edit' || params.type == 'view'){
				createPreferenceUIRecord(form, params);
			}else{
				createPreferenceList(form, params);
			}

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
	 * @param {Object} form
	 * @param {Object} params
	 * @description create the create,edit form view for the user
	 */
	function createPreferenceUIRecord(form, params){

		//if event type is create and subsidiary defined than we are searching and show warning
		if(params.type == 'create' && subsidiariesEnabled && params.subid){
			var prefLength = getPreferences(undefined, params.subid).getRange(0,2).length;
			if(prefLength > 0){
				//showing the warning message about the subsidiary
				form.addField({
					id : 'custpage_itpm_warningmsg',
					type : serverWidget.FieldType.INLINEHTML,
					label : 'Warning Message'
				}).defaultValue = '<script>require(["N/ui/message"],function(message){'+
								  'var myMsg2 = message.create({title: "Duplicate Subsidiary",'+
								  'message: "You cannot create a another record for same subsidiary",'+
								  'type: message.Type.WARNING});'+
								  'myMsg2.show();})</script>';
			}
		}
		
		//setting the event type
		form.addField({
			id : 'custpage_itpm_eventtype',
			type : serverWidget.FieldType.TEXT,
			label : 'Event Type'
		}).updateDisplayType({
		    displayType : serverWidget.FieldDisplayType.HIDDEN
		}).defaultValue = params.type;
		
		//preference record id
		//setting the event type
		form.addField({
			id : 'custpage_itpm_pfid',
			type : serverWidget.FieldType.SELECT,
			label : 'Preference Record',
			source:'customrecord_itpm_preferences'
		}).updateDisplayType({
		    displayType : serverWidget.FieldDisplayType.HIDDEN
		}).defaultValue = params.pfid;
		
		if(subsidiariesEnabled){
			//Subsidiary Field
			var subsidiaryField = form.addField({
				id: 'custpage_itpm_pref_subsidiary',
				label: 'Subsidiary',
				type: serverWidget.FieldType.SELECT,
				source:'subsidiary',
				container:'custpage_setup_preference'
			});
			subsidiaryField.isMandatory = true;
		}
		
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
		
		//Apply iTPM Discount Item
		var discountItemField = form.addField({
			id: 'custpage_itpm_pref_discountitem',
			type: serverWidget.FieldType.SELECT,
			label: 'iTPM Discount Item',
			container:'custpage_setup_preference'
		}); 
		discountItemField.isMandatory = true;

		//Expense account
		var expenseAccntField = form.addField(getFieldOptions('custpage_itpm_pref_expenseaccount', 'Expense Account', 'account')).updateBreakType({
			breakType : serverWidget.FieldBreakType.STARTCOL
		});
		expenseAccntField.isMandatory = true;

       //Deduction account
		var deductionAccntField = form.addField(getFieldOptions('custpage_itpm_pref_ddnaccount', 'Deduction Account', 'account'));
		deductionAccntField.isMandatory = true;

		//Accounts Payable account field
		var accountPayableField = form.addField(getFieldOptions('custpage_itpm_pref_accountpayable', 'Accounts Payable', 'account'));
		accountPayableField.isMandatory = true;
		
		//iTpm Version field
		var iTpmVersionField = form.addField({
			id: 'custpage_itpm_pref_itpmversion',
			type: serverWidget.FieldType.TEXT,
			label: 'iTPM Version',
			container:'custpage_setup_preference'
		}).updateDisplayType({
		    displayType : serverWidget.FieldDisplayType.INLINE
		});
		
		//Checkbox for Remove customer from split deduction transactions
		var removeCustomerSplitDDNField = form.addField({
			id: 'custpage_itpm_pref_remvcust_frmsplitddn',
			type: serverWidget.FieldType.CHECKBOX,
			label: 'Remove customer from split deduction transactions?',
			container:'custpage_setup_preference'
		}).updateBreakType({
			breakType : serverWidget.FieldBreakType.STARTCOL
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
//		form.addField({
//			id: 'custpage_itpm_disdate',
//			type: serverWidget.FieldType.RADIO,
//			label: 'Order Date',
//			source:'custpage_od',
//			container:'custpage_setup_preference'
//		});
//
//		form.addField({
//			id: 'custpage_itpm_disdate',
//			type: serverWidget.FieldType.RADIO,
//			label: 'Both',
//			source:'custpage_both',
//			container:'custpage_setup_preference'
//		});
//		form.addField({
//			id: 'custpage_itpm_disdate',
//			type: serverWidget.FieldType.RADIO,
//			label: 'Either',
//			source:'custpage_either',
//			container:'custpage_setup_preference'
//		});
		
		//if subsidiary value defined than we are filtering the values
		if(params.subid){
			
			//setting the discount item values to the field
			getItems('Discount', params.subid).each(function(e){
				discountItemField.addSelectOption({
					value:e.getValue('internalid'),
					text:e.getValue('itemid')
				});
				return true;
			});
			
			if(subsidiariesEnabled){
				subsidiaryField.updateDisplayType({
				    displayType :(params.type == 'view')? serverWidget.FieldDisplayType.INLINE : serverWidget.FieldDisplayType.DISABLED
				});
				subsidiaryField.defaultValue = params.subid;
				
				//get the account the with selected subsidiary
				getAccounts(params.subid).each(function(e){
					expenseAccntField.addSelectOption({
					    value : e.getValue('internalid'),
					    text : e.getValue('name'),
					    isSelected:false
					});
					deductionAccntField.addSelectOption({
					    value : e.getValue('internalid'),
					    text : e.getValue('name'),
					    isSelected:false
					});
					accountPayableField.addSelectOption({
					    value : e.getValue('internalid'),
					    text : e.getValue('name'),
					    isSelected:false
					});
					return true;
				});
			}
		}
		
		//set the values to the fields if already prefernce record existed
		getPreferences(params.pfid).each(function(preferanceRecord){
			if(params.type == 'edit' || params.type == 'view'){
				deductionAccntField.defaultValue = preferanceRecord.getValue('custrecord_itpm_pref_ddnaccount');
				expenseAccntField.defaultValue = preferanceRecord.getValue('custrecord_itpm_pref_expenseaccount');
				accountPayableField.defaultValue =  preferanceRecord.getValue('custrecord_itpm_pref_settlementsaccount');
				discountItemField.defaultValue = preferanceRecord.getValue('custrecord_itpm_pref_discountitem');
				
				if(subsidiariesEnabled){
					subsidiaryField.defaultValue = (params.type == 'create')? params.subid : preferanceRecord.getValue('custrecord_itpm_pref_subsidiary');
				}
			}
			
			iTpmVersionField.defaultValue = preferanceRecord.getValue('custrecord_itpm_pref_version'); //iTPM Version Field
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
		});
		
		//on view mode changing the field display types
		if(params.type == 'view'){
			radioITPMDiscountDate.updateDisplayType({
			    displayType : serverWidget.FieldDisplayType.DISABLED
			});
			removeCustomerSplitDDNField.updateDisplayType({
			    displayType : serverWidget.FieldDisplayType.DISABLED
			});
			ApplyiTPMNetBillDiscountChk.updateDisplayType({
			    displayType : serverWidget.FieldDisplayType.DISABLED
			});
			deductionAccntField.updateDisplayType({
			    displayType : serverWidget.FieldDisplayType.INLINE
			});
			expenseAccntField.updateDisplayType({
			    displayType : serverWidget.FieldDisplayType.INLINE
			});
			accountPayableField.updateDisplayType({
			    displayType : serverWidget.FieldDisplayType.INLINE
			});
			discountItemField.updateDisplayType({
			    displayType : serverWidget.FieldDisplayType.INLINE
			});
			defaultPriceLevel.updateDisplayType({
			    displayType : serverWidget.FieldDisplayType.INLINE
			});
			defaultAllType.updateDisplayType({
			    displayType : serverWidget.FieldDisplayType.INLINE
			});
		}else{
			form.addSubmitButton({
				label: 'Submit'
			});
		}
	}
	
	/**
	 * @param {Object} form
	 * @param {Object} param
	 * @description create the preference record list view
	 */
	function createPreferenceList(form, params){
		
		var iTPMPrefTypeID = scriptObj.getParameter({name:'custscript_itpm_pref_rectypeid'})
		var iTPMPrefPermission = runtime.getCurrentUser().getPermission('LIST_CUSTRECORDENTRY'+iTPMPrefTypeID);

		prefSublist = form.addSublist({
		    id : 'custpage_itpm_prefrecords',
		    type : serverWidget.SublistType.LIST,
		    label : 'Preference Records'
		});
		
		prefSublist.addField({
			id : 'custpage_itpm_editview',
			type : serverWidget.FieldType.TEXT,
			label : 'Edit | View'
		}).updateDisplayType({
		    displayType : serverWidget.FieldDisplayType.INLINE
		});
		
		prefSublist.addField({
			id : 'custpage_itpm_internalid',
			type : serverWidget.FieldType.TEXT,
			label : 'Internalid'
		}).updateDisplayType({
		    displayType : serverWidget.FieldDisplayType.INLINE
		});
		
		if(subsidiariesEnabled && iTPMPrefPermission >= 3){
			//body Subsidiary Field
			var subsidiaryField = form.addField({
				id: 'custpage_itpm_pref_listsubsidiary',
				label: 'Subsidiary',
				type: serverWidget.FieldType.SELECT,
				source:'subsidiary'
			});
			subsidiaryField.isMandatory = true;
			
			//subsidiary sublist field
			prefSublist.addField({
				id : 'custpage_itpm_subsidiary',
				type : serverWidget.FieldType.SELECT,
				label : 'Subsidiary',
				source:'subsidiary'
			}).updateDisplayType({
			    displayType : serverWidget.FieldDisplayType.INLINE
			});
		}

		prefSublist.addField({
			id : 'custpage_itpm_expaccount',
			type : serverWidget.FieldType.SELECT,
			label : 'Expense Account',
			source:'account'
		}).updateDisplayType({
		    displayType : serverWidget.FieldDisplayType.INLINE
		});
		
		prefSublist.addField({
			id : 'custpage_itpm_ddnaccount',
			type : serverWidget.FieldType.SELECT,
			label : 'Deduction Account',
			source:'account'
		}).updateDisplayType({
		    displayType : serverWidget.FieldDisplayType.INLINE
		});
		
		prefSublist.addField({
			id : 'custpage_itpm_accntpayable',
			type : serverWidget.FieldType.SELECT,
			label : 'Accounts Payable',
			source:'account'
		}).updateDisplayType({
		    displayType : serverWidget.FieldDisplayType.INLINE
		});
		
		prefSublist.addField({
			id : 'custpage_itpm_discountitem',
			type : serverWidget.FieldType.SELECT,
			label : 'iTPM Discount Item',
			source:'item'
		}).updateDisplayType({
		    displayType : serverWidget.FieldDisplayType.INLINE
		});
		
		prefSublist.addField({
			id : 'custpage_itpm_version',
			type : serverWidget.FieldType.TEXT,
			label : 'iTPM Version'
		}).updateDisplayType({
		    displayType : serverWidget.FieldDisplayType.INLINE
		});
		
		var i = 0,editURL = '';
		var prefereceResult = getPreferences();
		prefereceResult.each(function(e){
			if(iTPMPrefPermission >= 3){
				editURL = "<a href="+url.resolveScript({
				    scriptId: scriptObj.id,
				    deploymentId: scriptObj.deploymentId,
				    returnExternalUrl: false,
				    params:{whence:'=',type:'edit',pfid:e.getValue('internalid'),subid:e.getValue('custrecord_itpm_pref_subsidiary')}
				})+">Edit</a> |"; 
			}
			prefSublist.setSublistValue({
				id:'custpage_itpm_editview',
				value:editURL + "<a href="+url.resolveScript({
				    scriptId: scriptObj.id,
				    deploymentId: scriptObj.deploymentId,
				    returnExternalUrl: false,
				    params:{whence:'=',type:'view',pfid:e.getValue('internalid'),subid:e.getValue('custrecord_itpm_pref_subsidiary')}
				})+">View</a>",
				line:i
			});
			
			prefSublist.setSublistValue({
				id:'custpage_itpm_internalid',
				value:e.getValue('internalid'),
				line:i
			});
			
			if(subsidiariesEnabled && e.getValue('custrecord_itpm_pref_subsidiary')){
				prefSublist.setSublistValue({
					id:'custpage_itpm_subsidiary',
					value:e.getValue('custrecord_itpm_pref_subsidiary'),
					line:i
				});
			}
			
			if(e.getValue('custrecord_itpm_pref_ddnaccount')){
				prefSublist.setSublistValue({
					id:'custpage_itpm_ddnaccount',
					value:e.getValue('custrecord_itpm_pref_ddnaccount'),
					line:i
				});
			}
			
			if(e.getValue('custrecord_itpm_pref_expenseaccount')){
				prefSublist.setSublistValue({
					id:'custpage_itpm_expaccount',
					value:e.getValue('custrecord_itpm_pref_expenseaccount'),
					line:i
				});
			}
			
			if(e.getValue('custrecord_itpm_pref_settlementsaccount')){
				prefSublist.setSublistValue({
					id:'custpage_itpm_accntpayable',
					value:e.getValue('custrecord_itpm_pref_settlementsaccount'),
					line:i
				});
			}
			
			if(e.getValue('custrecord_itpm_pref_discountitem')){
				prefSublist.setSublistValue({
					id:'custpage_itpm_discountitem',
					value:e.getValue('custrecord_itpm_pref_discountitem'),
					line:i
				});
			}
			
			if(e.getValue('custrecord_itpm_pref_version')){
				prefSublist.setSublistValue({
					id:'custpage_itpm_version',
					value:e.getValue('custrecord_itpm_pref_version'),
					line:i
				});
			}

			i++;
			return true;
		});
		
		if(subsidiariesEnabled && iTPMPrefPermission >= 3){
			form.addButton({
				label:'New Preference',
				id : 'custpage_itpm_newpreference',
				functionName:"newPreference('T')"
			});
		}
	}
	
	/**
	 * @param {Object} preferenceRecord
	 * @param {Object} request
	 */
	function savePreferenceRecord(request){
		
		log.debug('error usage',runtime.getCurrentScript().getRemainingUsage());
		
		//reading the values from request parameters
		var deductionAccount = request.parameters.custpage_itpm_pref_ddnaccount,
		expenseAccount = request.parameters.custpage_itpm_pref_expenseaccount,
		accountPayableId = request.parameters.custpage_itpm_pref_accountpayable,
		applyiTPMNetBillDiscount = request.parameters.custpage_itpm_pref_nblistprice,
		discountItemId = request.parameters.custpage_itpm_pref_discountitem,
		removeCustomer = request.parameters.custpage_itpm_pref_remvcust_frmsplitddn,
		discountDates = request.parameters.custpage_itpm_disdate,
		itpmVersion = request.parameters.custpage_itpm_pref_itpmversion;
		subsidiary = (subsidiariesEnabled)? request.parameters.custpage_itpm_pref_subsidiary : 1;
		var defaultalltype = request.parameters.custpage_itpm_pref_defaultalltype;
		var defaultPriceLevel = request.parameters.custpage_itpm_pref_defaultpricelevel;
		var eventType = request.parameters.custpage_itpm_eventtype;
		var pfid = request.parameters.custpage_itpm_pfid;
		var preferanceRecord;

		//searching for the records with same subsidiary before saving the record
		//these below conditions for one-world and non-oneworld accounts
		var prefLength = getPreferences(undefined, subsidiary).getRange(0,2).length;
		if(eventType == 'create' && prefLength > 0){
			throw{
				name:'DUPLICATE_SUBSIDIARY',
				message:(!subsidiariesEnabled)? 'You cannot create another -iTPM Preference record.':'There are already have the record with same subsidiary'
			}
		}
		
		if(eventType == 'create'){
			preferanceRecord = record.create({
				type: 'customrecord_itpm_preferences',
				isDynamic: true
			});
		}else{
			preferanceRecord = record.load({
			    type: 'customrecord_itpm_preferences', 
			    id: getPreferences(pfid).getRange(0,1)[0].getValue('internalid'),
			    isDynamic: true,
			});
		}
				
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
		
		if(subsidiariesEnabled){
			preferanceRecord.setValue({
				fieldId:'custrecord_itpm_pref_subsidiary',
				value:subsidiary,
				ignoreFieldChange:true
			});
		}
		
		if(itpmVersion){
			preferanceRecord.setValue({
				fieldId: 'custrecord_itpm_pref_version',      //itpm pref version
				value: itpmVersion,
				ignoreFieldChange: true
			});
		}
		
		var dateValue;
		switch(discountDates){
		case 'custpage_sd' : 
			dateValue = 1;
			break;
		case 'custpage_od' : 
			dateValue = 2;
			break;
		case 'custpage_both' : 
			dateValue = 3;
			break;
		case 'custpage_either' : 
			dateValue = 4;
			break;
		default : 
			dateValue = 1;
		break;
		}
			
		preferanceRecord.setValue({
			fieldId:'custrecord_itpm_pref_discountdates',
			value:dateValue,
			ignoreFieldChange:true
		});

		var preferenceRecID = preferanceRecord.save({
			enableSourcing: true,
			ignoreMandatoryFields: true
		});
		
		//updating the other record non-based subsidiary field values with new changes
		if(subsidiariesEnabled && preferenceRecID){
			getPreferences().each(function(e){
				if(e.getValue('internalid') != preferenceRecID){
					record.submitFields({
						type:'customrecord_itpm_preferences',
						id:e.getValue('internalid'),
						values:{
							'custrecord_itpm_pref_nblistprice':(applyiTPMNetBillDiscount == 'T'),
							'custrecord_itpm_pref_defaultalltype':defaultalltype,
							'custrecord_itpm_pref_defaultpricelevel':defaultPriceLevel,
							'custrecord_itpm_pref_remvcust_frmsplit':(removeCustomer == 'T'),
							'custrecord_itpm_pref_discountdates':dateValue
						},
						options:{
							enableSourcing:false,
							ignoreMandatoryFields:true
						}
					});
				}
				return true;
			});
		}
		
		log.error('end usage',runtime.getCurrentScript().getRemainingUsage());
		
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
				var form = createPreferenceForm(request);
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
				//invoke the function to save the record
				savePreferenceRecord(request);
				//after save redirect to the same suitelet
				redirect.toSuitelet({
				    scriptId: scriptObj.id,
				    deploymentId: scriptObj.deploymentId
				});
				
			}catch(ex){
				if(ex.name == 'DUPLICATE_SUBSIDIARY' || ex.name == 'ATTEMP_ANOTHER_CREATION'){
					throw new Error(ex.message);
				}
				log.error(ex.name, ex.message + '; Method: ' + request.method);
				throw ex.message + '; Method: ' + request.method;
			}			
		}

	}

	return {
		onRequest: onRequest
	};

});
