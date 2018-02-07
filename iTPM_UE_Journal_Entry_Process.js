/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/search',
		'N/record',
		'N/redirect',
    	'./iTPM_Module.js'
    ],

function(search, record, redirect, itpm) {
	
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
    		log.debug('Before Load: scriptContext.type', scriptContext.type);
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
    		log.debug('After Submit: scriptContext.type', scriptContext.type);
    		if (scriptContext.type === scriptContext.UserEventType.EDIT){
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
        					}
                        }
        			}
    			}
    		}
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    return {
    	beforeLoad: beforeLoad,
        afterSubmit: afterSubmit
    };
    
});