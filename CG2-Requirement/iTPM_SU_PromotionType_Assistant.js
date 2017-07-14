/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget','N/search','N/redirect','N/record','N/runtime'],

function(serverWidget,search,redirect,record,runtime) {
   
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
    		var response = context.response,request = context.request,
    		listId, //this id used to redirect the page to promotype list of records
    		isSubsidiaryExist = runtime.isFeatureInEffect('SUBSIDIARIES'),
    		userId = runtime.getCurrentUser().id,
    		userSubsidiary = record.load({type:record.Type.EMPLOYEE,id:userId}).getValue('subsidiary');

    		var assistant = serverWidget.createAssistant({
    			title: 'New Promotion Type'
    		}),
    		assistantStep1 = assistant.addStep({
    			id : 'id_1',
    			label :'Impact'
    		}),
    		assistantStep2 = assistant.addStep({
    			id : 'id_2',
    			label : 'Valid Accounts'
    		}),
    		assistantStep3 = assistant.addStep({
    			id : 'id_3',
    			label : 'Default Account'
    		}),
    		assistantStep4 = assistant.addStep({
    			id : 'id_4',
    			label : 'Complete'
    		}),
    		validAccounts,subsidiaryId,finanImpact;

    		//setting the first step if when method is GET
    		if(request.method == "GET"){
    			assistant.currentStep = assistantStep1;
    			listId = request.parameters.listId;
    		}


    		//getting the field Values
    		function getStepFieldValues(){
    			subsidiaryId = assistantStep1.getValue({
    				id: 'custpage_itpm_pt_subsidiary'
    			});
    			finanImpact = assistantStep1.getValue({
    				id: 'custpage_financial_impact'
    			});
    			validAccounts = assistantStep2.getValue({
    				id: 'custpage_valid_accnt'
    			});
    		}

    		//when user click on next or back buttons
    		if(request.method == 'POST'){
    			var step = assistant.currentStep,
    			defaultAccount = assistantStep3.getValue({
    				id: 'custpage_default_accnt'
    			});

    			switch(assistant.getLastAction()){
    			case 'next':
    				assistant.currentStep = assistant.getNextStep();
    				break;
    			case 'back':
    				if(step.stepNumber === 2)
    					assistant.currentStep = assistantStep1;
    				else if(step.stepNumber === 3)
    					assistant.currentStep = assistantStep2;
    				else if(step.stepNumber == 4)
    					assistant.currentStep = assistantStep3;
    				break;
    			case 'finish':
    				getStepFieldValues();
    				var defaultAccount = assistantStep3.getValue({
    					id: 'custpage_default_accnt'
    				}),
    				//creating the new promotion record.
    				newPromotionTypeId = record.create({
    					type:'customrecord_itpm_promotiontype',
    					isDynamic: true
    				}).setValue({
    					fieldId:'custrecord_itpm_pt_financialimpact',
    					value:finanImpact == 'income'?11:13,
    							ignoreFieldChange:true
    				}).setValue({
    					fieldId:'custrecord_itpm_pt_subsidiary',
    					value:(isSubsidiaryExist)?subsidiaryId:1,
    							ignoreFieldChange:true
    				}).setValue({
    					fieldId:'custrecord_itpm_pt_defaultaccount',
    					value:defaultAccount,
    					ignoreFieldChange:true
    				}).setValue({
    					fieldId:'custrecord_itpm_pt_validaccounts',
    					value:validAccounts.split('\u0005'),
    					ignoreFieldChange:true
    				}).save({
    					enableSourcing: true,
    					ignoreMandatoryFields: true
    				});

    				//redirect the user to new created promotion type record in edit mode
    				redirect.toRecord({
    					type:'customrecord_itpm_promotiontype',
    					id:newPromotionTypeId,
    					isEditMode:true
    				})
    				return        
    				break;

    			case 'cancel':
    				redirect.toTaskLink({
    					id:'LIST_CUST_'+assistantStep1.getValue({id:'custpage_list_id'})
    				});
    				return
    				break;
    			}
    		}

    		//navigate to the previous step if values doesn't exist
    		switch(assistant.currentStep.stepNumber){
    		case 2:
    			getStepFieldValues();
    			if(!subsidiaryId && !finanImpact){
    				assistant.currentStep = assistantStep1;
    			}
    			break;
    		case 3:
    			getStepFieldValues();
    			if(!validAccounts){
    				assistant.currentStep = assistantStep2;
    			}else{
    				validAccounts = validAccounts.split('\u0005');
    			}
    			break;	 
    		}

    		//getting the present step where we located.
    		var step = assistant.currentStep;

    		//Step 1:- adding the financial impact and subsidiary fields
    		if(step.stepNumber === 1){
    			//help text for users.
    			assistant.addField({
    				id : 'custom_impact_helptext',
    				type : serverWidget.FieldType.INLINEHTML,
    				label:'Help Text'
    			}).defaultValue = (isSubsidiaryExist)?'<p style="font-size:15px;">Select Financial Impact and Subsidiary.</p>':'<p style="font-size:15px;">Select Financial Impact.</p>';


    			//Impact label on assistant view
    			assistant.addField({
    				id : 'custom_label',
    				type : serverWidget.FieldType.LABEL,
    				label : 'Impact'
    			}).padding = 1;

    			//income and expense radio fields
    			var incomeField = assistant.addField({
    				id : 'custpage_financial_impact_income',  //changed the id and field type.
    				type : serverWidget.FieldType.TEXT,
    				source:'income',
    				label : 'Income'
    			}).updateDisplayType({displayType : serverWidget.FieldDisplayType.HIDDEN}),
    			expenseField = assistant.addField({
    				id : 'custpage_financial_impact',
    				type : serverWidget.FieldType.RADIO,
    				source:'expense',
    				label : 'Expense'
    			}),
    			finanAccountId = assistantStep1.getValue('custpage_financial_impact'); //financial account field value id

    			if(assistant.getLastAction() == 'back')
    				assistant.getField('custpage_financial_impact').defaultValue = finanAccountId;
    			else 
    				assistant.getField('custpage_financial_impact').defaultValue = 'expense'; //changed default value to expense

    			//checking the account have the subsidiary or not 
    			if(isSubsidiaryExist){	
    				var subsidiaryField = assistant.addField({
    					id : 'custpage_itpm_pt_subsidiary',
    					type : serverWidget.FieldType.SELECT,
    					label : 'Subsidiary'
    				});
    				subsidiaryField.padding = 1;
    				subsidiaryField.isMandatory = true;

    				//search for user subsidiaries list
    				search.create({
    					type:search.Type.SUBSIDIARY,
    					columns:['internalid','name','parent'],
    					filters:[['isinactive','is',false],'and',['parent','anyof',userSubsidiary]]
    				}).run().each(function(e){
    					subsidiaryField.addSelectOption({
    						value:e.getValue('internalid'),
    						text:e.getValue('name'),
    						isSelected:e.getValue('internalid') == userSubsidiary
    					});
    					return true;
    				});
    			}

    			//list id means promotion record type id which is used to redirect the user to promotion records list
    			var redirectionIdField = assistant.addField({
    				id:'custpage_list_id',
    				type:serverWidget.FieldType.TEXT,
    				label:'redirectId'
    			}).updateDisplayType({
    				displayType : serverWidget.FieldDisplayType.HIDDEN
    			});

    			if(listId){
    				redirectionIdField.defaultValue = listId;	
    			}

    		}


    		//Step 2:- adding the valid account based on financial impact and subsidiary
    		if(step.stepNumber === 2){
    			//help text for users.
    			assistant.addField({
    				id : 'custom_validacnt_helptext',
    				type : serverWidget.FieldType.INLINEHTML,
    				label:'Help Text'
    			}).defaultValue = '<p style="font-size:15px;">Select Valid Accounts.</p><br>';

    			var validAccountField = assistant.addField({
    				id : 'custpage_valid_accnt',
    				type : serverWidget.FieldType.MULTISELECT,
    				label : 'VALID ACCOUNTS'
    			});
    			validAccountField.isMandatory = true;

    			//checking the subsidiaries feature is enabled or not
    			var validAccountFilter = [['type','is',finanImpact.charAt(0).toUpperCase()+finanImpact.slice(1)],'and',['isinactive','is',false]];
    			(isSubsidiaryExist)? validAccountFilter.push('and',['subsidiary','anyof',subsidiaryId]):'';

    			//search all accounts using above filter and added the accounts list to the VALID ACCOUNTS FIELD.
    			search.create({
    				type:search.Type.ACCOUNT,
    				columns:['internalid','name'],
    				filters:validAccountFilter
    			}).run().each(function(e){
    				validAccountField.addSelectOption({
    					value:e.getValue('internalid'),
    					text:e.getValue('name'),
    					isSelected:false
    				});
    				return true;
    			});
    		}  


    		//Step 3:- adding the default account field based on valid accounts
    		if(step.stepNumber === 3){
    			//help text for users.
    			assistant.addField({
    				id : 'custom_defaultacnt_helptext',
    				type : serverWidget.FieldType.INLINEHTML,
    				label:'Help Text'
    			}).defaultValue = '<p style="font-size:15px;">Select Default Account.</p><br>';

    			var defaultAccountField = assistant.addField({
    				id : 'custpage_default_accnt',
    				type : serverWidget.FieldType.SELECT,
    				label : 'DEFAULT ACCOUNT'
    			});
    			defaultAccountField.isMandatory = true;

    			//search for accounts from the previous step accounts list and added to the DEFAULT ACCOUNT FIELD.
    			search.create({
    				type:search.Type.ACCOUNT,
    				columns:['internalid','name'],
    				filters:[['internalid','anyof',validAccounts],'and',['isinactive','is',false]]
    			}).run().each(function(e){
    				defaultAccountField.addSelectOption({
    					value:e.getValue('internalid'),
    					text:e.getValue('name'),
    					isSelected:false
    				});
    				return true;
    			})
    		} 


    		//Step 4:- finish the assistant and create the record
    		if(step.stepNumber == 4){
    			var msgField = assistant.addField({
    				id : 'custpage_msg_label',
    				type : serverWidget.FieldType.INLINEHTML,
    				label : 'Congratulations'
    			});
    			msgField.defaultValue="<br><h1>Click on Finish to save the record.</h1><br><h1>Please Click back to make any changes on the previous screens</h1>";
    		}

    		response.writePage(assistant);
    	}catch(e){
    		log.error(e.name,e.message);
    	}
    }

    return {
        onRequest: onRequest
    };
    
});
