/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/search',
		'N/record',
		'N/redirect',
		'N/runtime',
    	'./iTPM_Module.js'
    ],

function(search, record, redirect, runtime, itpm) {
	
	/**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {
    	try{
    		//TRIGGER ONLY IN CREATE MODE
    		if(scriptContext.type == 'create' && runtime.executionContext === runtime.ContextType.USER_INTERFACE){
    			log.debug('Before Load: scriptContext.type', scriptContext.type);
    			
    			if(scriptContext.request.parameters.did){
    				log.debug('IF Parameters Exists');
    				log.debug('params: deduction ID',scriptContext.request.parameters.did);
    				var subsidiaryExists = itpm.subsidiariesEnabled();
    				var currencyExists = itpm.currenciesEnabled();
    				var prefJE = itpm.getJEPreferences();
    				    				
    				var deductionRecordObj = record.load({
    					type: 'customtransaction_itpm_deduction',
    					id: scriptContext.request.parameters.did,
    					isDynamic: true
    				});
    				
    				var subsidiaryID = (subsidiaryExists)? deductionRecordObj.getValue('subsidiary') : undefined;
    	    		var itpmPreferences = itpm.getPrefrenceValues(subsidiaryID);
    				
    				var ddnAccount = search.create({
    					type: search.Type.TRANSACTION,
    					filters:[['internalid', 'anyof', scriptContext.request.parameters.did],'and',
    						['debitamount', 'greaterthan', '0']],
    						columns:[{name:'account'}]
    				}).run().getRange(0,1);
    				
    				ddnAccount = ddnAccount[0].getValue({name:'account'});
    				var expAccount = itpmPreferences.expenseAccnt;
    				
    				//Setting JE Record with Preloaded values from deduction
    				if (subsidiaryExists){
    					scriptContext.newRecord.setValue({
        					fieldId: 'subsidiary',
        					value: deductionRecordObj.getValue('subsidiary')
        				});
    				}
    				if(currencyExists){
    					scriptContext.newRecord.setValue({
        					fieldId: 'currency',
        					value: deductionRecordObj.getValue('currency')
        				});
    				}
    				scriptContext.newRecord.setValue({
    					fieldId: 'custbody_itpm_appliedto',
    					value: scriptContext.request.parameters.did
    				});
    				scriptContext.newRecord.setValue({
    					fieldId: 'memo',
    					value: 'Expense for Deduction '+deductionRecordObj.getValue('tranid')
    				});
    				
    				//Checking for JE Approval preference from NetSuite "Accounting Preferences" under "General/Approval Routing" tabs.
    				if(prefJE.featureEnabled){
    					if(prefJE.featureName == 'Approval Routing'){
    						log.debug('prefJE.featureName', prefJE.featureName);
    						scriptContext.newRecord.setValue({
            					fieldId:'approvalstatus',
            					value:1
            				});
    					}else if(prefJE.featureName == 'General'){
    						log.debug('prefJE.featureName', prefJE.featureName);
    						scriptContext.newRecord.setValue({
            					fieldId:'approved',
            					value:false
            				});
    					}
    				}
    				
    				//Adding Credit Line
    				scriptContext.newRecord.setSublistValue({
    					sublistId: 'line',
    					fieldId:'account',
    					value:ddnAccount,
    					line:0
    				});
    				scriptContext.newRecord.setSublistValue({
    					sublistId: 'line',
    					fieldId:'credit',
    					value: deductionRecordObj.getValue('custbody_itpm_ddn_openbal'),
    					line:0
    				});
    				scriptContext.newRecord.setSublistValue({
    					sublistId: 'line',
    					fieldId:'memo',
    					value: 'Expense for Deduction '+ deductionRecordObj.getValue('tranid'),
    					line:0
    				});
    				scriptContext.newRecord.setSublistValue({
    					sublistId: 'line',
    					fieldId:'entity',
    					value: deductionRecordObj.getValue('custbody_itpm_customer'),
    					line:0
    				});
    				
    				//Adding Debit Line
    				scriptContext.newRecord.setSublistValue({
    					sublistId: 'line',
    					fieldId:'account',
    					value:expAccount,
    					line:1
    				});
    				scriptContext.newRecord.setSublistValue({
    					sublistId: 'line',
    					fieldId:'debit',
    					value: deductionRecordObj.getValue('custbody_itpm_ddn_openbal'),
    					line:1
    				});
    				scriptContext.newRecord.setSublistValue({
    					sublistId: 'line',
    					fieldId:'memo',
    					value: 'Expense for Deduction '+ deductionRecordObj.getValue('tranid'),
    					line:1
    				});
    				scriptContext.newRecord.setSublistValue({
    					sublistId: 'line',
    					fieldId:'entity',
    					value: deductionRecordObj.getValue('custbody_itpm_customer'),
    					line:1
    				});
   				}
    		}
    		
    		//TRIGGER ONLY IN VIEW MODE
    		if(scriptContext.type === scriptContext.UserEventType.VIEW){
        		log.debug('JE Record VIEW: Before Load');
        		var jeNewRecordObj = scriptContext.newRecord;
    			var jeAppliedTo = jeNewRecordObj.getValue({fieldId : 'custbody_itpm_appliedto'});
                var jeCreatedFrom = jeNewRecordObj.getValue({fieldId : 'custbody_itpm_createdfrom'});
                
        		if(jeAppliedTo){
        			log.debug('jeAppliedTo', jeAppliedTo);
        			var locationExists = itpm.locationsEnabled();
        			var classExists = itpm.classesEnabled();
        			var departmentExists = itpm.departmentsEnabled();
        			var prefJE = itpm.getJEPreferences();
        			
        			if(prefJE.featureEnabled && prefJE.featureName == 'General'){
        				log.debug('prefJE.featureName', prefJE.featureName);
        				
        				if(jeNewRecordObj.getValue('approved') && jeNewRecordObj.getValue('custbody_itpm_je_applied_status') === 'Open'){
        					log.debug('BL: Approved', jeNewRecordObj.getValue('approved'));
        		    		log.debug('BL: Script Changed', jeNewRecordObj.getValue('custbody_itpm_je_applied_status'));
        		    		
        		    		record.submitFields({
        		    		    type: record.Type.JOURNAL_ENTRY,
        		    		    id: scriptContext.newRecord.id,
        		    		    values: {'custbody_itpm_je_applied_status': 'In Process'},
        		    		    options : {enableSourcing: true, ignoreMandatoryFields: true}
        		    		});
        		    		
        		    		redirect.toRecord({
        						type : record.Type.JOURNAL_ENTRY,
        						id : jeNewRecordObj.id					
        					});
        		    	}else if(jeNewRecordObj.getValue('approved') && jeNewRecordObj.getValue('custbody_itpm_je_applied_status') === 'In Process'){
        		    		log.debug('BL: Approved', jeNewRecordObj.getValue('approved'));
        		    		log.debug('BL: Script Changed', jeNewRecordObj.getValue('custbody_itpm_je_applied_status'));
        		    		    	            
        	                var searchObj = search.create({
        					    type: search.Type.TRANSACTION,
        					    columns : ['internalid'],
        					    filters: [['internalid','anyof', jeAppliedTo]]
        					});

        					log.debug('iTPM Applied To: Record Type', searchObj.run().getRange(0,1)[0].recordType);
        					
        					if(searchObj.run().getRange(0,1)[0].recordType == 'creditmemo'){
        						log.debug('Credit Memo is Processing...');
            	            	
        						//getting open balance from deduction
            					var dedLookup = search.lookupFields({
            						type    : 'customtransaction_itpm_deduction',
            						id      : jeCreatedFrom,
            						columns : ['custbody_itpm_ddn_openbal']
            					});
            					log.debug('Deduction Open balance', dedLookup.custbody_itpm_ddn_openbal);
            					
        						//getting remaining amount from credit memo
            					var cmLookup = search.lookupFields({
            						type    : search.Type.CREDIT_MEMO,
            						id      : jeAppliedTo,
            						columns : ['amountremaining', 'entity']
            					});
            					log.debug('Customer', cmLookup.entity[0].value);
            					log.debug('Credit Memo Amount remaining', cmLookup.amountremaining);
            					
        						itpm.applyCreditMemo(cmLookup.entity[0].value, dedLookup.custbody_itpm_ddn_openbal, cmLookup.amountremaining, jeNewRecordObj.id, jeAppliedTo, jeCreatedFrom, locationExists, classExists, departmentExists);
        					}
        					else if(searchObj.run().getRange(0,1)[0].recordType == 'customtransaction_itpm_deduction'){
        						updateDeduction(jeAppliedTo, jeNewRecordObj);
        					}
        	            }
                    }
        		}
        	}
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }
    
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
    	try{
    		if(scriptContext.type === scriptContext.UserEventType.CREATE && runtime.executionContext === runtime.ContextType.USER_INTERFACE){
    			log.debug('After Submit: scriptContext.type', scriptContext.type);
        		var jeNewRecordObj = scriptContext.newRecord;
    			var jeAppliedTo = jeNewRecordObj.getValue({fieldId : 'custbody_itpm_appliedto'});
    			if(jeAppliedTo){
    				var prefJE = itpm.getJEPreferences();
    				if(prefJE.featureEnabled && (prefJE.featureName == 'General' || prefJE.featureName == 'Approval Routing')){
        				//Adding New Logic April-11-2018
                    	log.debug("Entered into New Logic: prefJE.featureEnabled", prefJE.featureEnabled);
                    	log.debug("NL: Ded Id", jeAppliedTo);
                    	
                    	var searchObj = search.create({
    					    type: search.Type.TRANSACTION,
    					    columns : ['internalid'],
    					    filters: [['internalid','anyof', jeAppliedTo]]
    					});

    					log.debug('NL: iTPM Applied To: Record Type', searchObj.run().getRange(0,1)[0].recordType);
    					
                    	//Updating the related Deduction record to change status to Pending(B)
            			if(searchObj.run().getRange(0,1)[0].recordType == 'customtransaction_itpm_deduction'){
            				var dedRecUpdate = record.submitFields({
                        		type: 'customtransaction_itpm_deduction',
                        		id: jeAppliedTo,
                        		values: {
                        			'transtatus' : 'B',
                        		},
                        		options: {enablesourcing: true, ignoreMandatoryFields: true}
                        	});
            				
            				log.debug("NL: Deduction Status Updated");
            			}
            			//********* ----- *******
        			}else{
        				log.debug("Entered into New Logic: prefJE.featureEnabled", prefJE.featureEnabled);
                    	log.debug("NL: Ded Id", jeAppliedTo);
                    	
        				var jeamount = jeNewRecordObj.getSublistValue({
						    sublistId: 'line',
						    fieldId: 'credit',
						    line: 0
						});
						log.debug('NL: Amount in Credit Line', jeamount);
						
						var ddnLookup = search.lookupFields({
							type    : 'customtransaction_itpm_deduction',
							id      : jeAppliedTo,
							columns : ['custbody_itpm_ddn_openbal']
						});
						
						var ddnOpenBal = parseFloat(ddnLookup.custbody_itpm_ddn_openbal)-parseFloat(jeamount);
						log.debug('NL: Deduction Open Balance after expensing', ddnOpenBal);
						var dedStatus = (ddnOpenBal > 0)?'A':'C';
						DedRecId = record.submitFields({
							type    : 'customtransaction_itpm_deduction',
							id      : jeAppliedTo,
							values  : {'custbody_itpm_ddn_openbal' : ddnOpenBal, 'transtatus' : dedStatus},
							options : {enableSourcing: true, ignoreMandatoryFields: true}
						});
						log.debug('Decreasing the open balance from deduction after expensing',DedRecId);
        			}
    			}
    		}
    		else if(scriptContext.type === scriptContext.UserEventType.EDIT){
    			log.debug('JE Record was edited');
    			var jeNewRecordObj = scriptContext.newRecord;
    			var jeAppliedTo = jeNewRecordObj.getValue({fieldId : 'custbody_itpm_appliedto'});
                var jeCreatedFrom = jeNewRecordObj.getValue({fieldId : 'custbody_itpm_createdfrom'});
                
    			if(jeAppliedTo){
    				log.debug('jeAppliedTo', jeAppliedTo);
        			var locationExists = itpm.locationsEnabled();
    				var classExists = itpm.classesEnabled();
    				var departmentExists = itpm.departmentsEnabled();
        			var jeOldRecordObj = scriptContext.oldRecord;
        			var prefJE = itpm.getJEPreferences();
        			
        			if(prefJE.featureEnabled && prefJE.featureName == 'Approval Routing'){
    					log.debug('prefJE.featureEnabled', prefJE.featureEnabled);
        				log.debug('prefJE.featureName', prefJE.featureName);
        				
        				var oldstatus = jeOldRecordObj.getValue({fieldId : 'approvalstatus'});
        				log.debug('JE OLD Status', oldstatus);
        				
        				var newstatus = jeNewRecordObj.getValue({fieldId : 'approvalstatus'});
        				log.debug('JE New Status', newstatus);

                        if(oldstatus == '1' && newstatus == '2'){
                        	var searchObj = search.create({
        					    type: search.Type.TRANSACTION,
        					    columns : ['internalid'],
        					    filters: [['internalid','anyof', jeAppliedTo]]
        					});

        					log.debug('iTPM Applied To: Record Type', searchObj.run().getRange(0,1)[0].recordType);
        					
        					if(searchObj.run().getRange(0,1)[0].recordType == 'creditmemo'){
        						log.debug('Credit Memo Processing...');
        						
        						//getting open balance from deduction
                				var dedLookup = search.lookupFields({
                					type    : 'customtransaction_itpm_deduction',
                					id      : jeCreatedFrom,
                					columns : ['custbody_itpm_ddn_openbal']
                				});
                				log.debug('Deduction Open balance', dedLookup.custbody_itpm_ddn_openbal);
                				
        						//getting remaining amount from credit memo
                				var cmLookup = search.lookupFields({
                					type    : search.Type.CREDIT_MEMO,
                					id      : jeAppliedTo,
                					columns : ['amountremaining', 'entity']
                				});
                				log.debug('Customer', cmLookup.entity[0].value);
                				log.debug('Credit Memo Amount remaining', cmLookup.amountremaining);
                				
        						itpm.applyCreditMemo(cmLookup.entity[0].value, dedLookup.custbody_itpm_ddn_openbal, cmLookup.amountremaining, jeNewRecordObj.id, jeAppliedTo, jeCreatedFrom, locationExists, classExists, departmentExists);
        					}else if(searchObj.run().getRange(0,1)[0].recordType == 'customtransaction_itpm_deduction'){
        						updateDeduction(jeAppliedTo, jeNewRecordObj);
        					}
                        }
        			}	
    			}
    		}
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }
    
    function updateDeduction(jeAppliedTo, jeNewRecordObj){
    	log.debug('Deduction is Processing...');
		
		var ddnLookup = search.lookupFields({
			type    : 'customtransaction_itpm_deduction',
			id      : jeAppliedTo,
			columns : ['custbody_itpm_ddn_openbal', 'status']
		});
		log.debug('NL: Deduction Open Balance', ddnLookup.custbody_itpm_ddn_openbal);
		log.debug('NL: Deduction Status', ddnLookup.status[0].text);
		
		if(ddnLookup.status[0].text != 'Resolved'){
			var jeamount = jeNewRecordObj.getSublistValue({
			    sublistId: 'line',
			    fieldId: 'credit',
			    line: 0
			});
			log.debug('NL: Amount in Credit Line', jeamount);
			
			var ddnOpenBal = parseFloat(ddnLookup.custbody_itpm_ddn_openbal)-parseFloat(jeamount);
			log.debug('NL: Deduction Open Balance after expensing', ddnOpenBal);
			var dedStatus = (ddnOpenBal > 0)?'A':'C';
			DedRecId = record.submitFields({
				type    : 'customtransaction_itpm_deduction',
				id      : jeAppliedTo,
				values  : {'custbody_itpm_ddn_openbal' : ddnOpenBal, 'transtatus' : dedStatus},
				options : {enableSourcing: true, ignoreMandatoryFields: true}
			});
			log.debug('Decreasing the open balance from deduction after expensing',DedRecId);
		}
    }
    
    return {
    	beforeLoad: beforeLoad,
        afterSubmit: afterSubmit
    };
    
});