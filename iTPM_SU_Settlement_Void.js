/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/record',
		'N/redirect',
		'./iTPM_Module.js',
		'N/search'
	   ],

function(record, redirect, itpm, search) {
   
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
    		if (context.request.method === 'GET') {
    			var SetRec = record.load({
       			 	type : 'customtransaction_itpm_settlement',
       			 	id   : context.request.parameters.sid
       		 	});
    			
    			var settlementStatus = SetRec.getValue('transtatus');
    			
    			if(settlementStatus == 'C' || settlementStatus == 'D'){
    				throw {
    					name:'SETTLEMENT_INVALID_STATUS',
    					message:'This settlement has been voided.'
    				};
    			}
    			
    			var subsidiaryExists = itpm.subsidiariesEnabled();
    			var currencyExists = itpm.currenciesEnabled();
    			var lineCount = SetRec.getLineCount('line');
    			var prefObj = itpm.getPrefrenceValues();
        		
       		    if(lineCount > 0){
    				var JERec = record.create({
    					type:record.Type.JOURNAL_ENTRY
    				});
    				
    				if(subsidiaryExists){
        				var subsidiary = SetRec.getValue('subsidiary');
        				
        				JERec.setValue({
        					fieldId:'subsidiary',
        					value:subsidiary
        				});
        			}
    				
        			if(currencyExists){
        				var currency = SetRec.getValue('currency');
        				
        				JERec.setValue({
        					fieldId:'currency',
        					value:currency
        				});
        			}
    				
        			//Checking for JE Approval preference from NetSuite "Accounting Preferences" under "General/Approval Routing" tabs.
    				var prefJE = itpm.getJEPreferences();
    				if(prefJE.featureEnabled){
    					if(prefJE.featureName == 'Approval Routing'){
    						log.debug('prefJE.featureName', prefJE.featureName);
    						JERec.setValue({
    							fieldId:'approvalstatus',
    							value:1
    						});
    					}else if(prefJE.featureName == 'General'){
    						log.debug('prefJE.featureName', prefJE.featureName);
    						JERec.setValue({
    							fieldId:'approved',
    							value:false
    						});
    					}
    				}
        				
        			JERec.setValue({
    					fieldId:'custbody_itpm_appliedto',
    					value:SetRec.id
    				}).setValue({
    					fieldId:'memo',
    					value:'Voiding Settlement # '+SetRec.getValue('tranid')
    				});
    			}
   			
    			for(var i = 0;i < lineCount;i++){
    				var account = SetRec.getSublistValue({sublistId:'line',fieldId:'account',line:i});
    				var credit = SetRec.getSublistValue({sublistId:'line',fieldId:'credit',line:i});
    				var debit = SetRec.getSublistValue({sublistId:'line',fieldId:'debit',line:i});
    				var lumsumType = SetRec.getSublistValue({sublistId:'line',fieldId:'custcol_itpm_lsbboi',line:i});

    				log.debug(i,'account ='+account+' credit='+credit+' debit='+debit+' lumsumType='+lumsumType);
    				log.debug('JERec',JERec);
       			
    				JERec.setSublistValue({
    					sublistId:'line',
    					fieldId:'account',
    					value:account,
    					line:i
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:'credit',
    					value:(debit != '')?debit:0,
    					line:i
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:'debit',
    					value:(credit != '')?credit:0,
    					line:i
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:'memo',
    					value:'Voiding Settlement # '+SetRec.getValue('tranid'),
    					line:i
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:'entity',
    					value:SetRec.getValue('custbody_itpm_customer'),
    					line:i
    				});
       			
    			}
       		
    			var JERecId = JERec.save({
    				enableSourcing:false,
    				ignoreMandatoryFields:true
    			});
       		
    			log.debug('JERecId',JERecId);
       		
    			if(JERecId){
    				var transactionId = SetRec.getValue('custbody_itpm_appliedto');
    				var setReq = parseFloat(SetRec.getValue('custbody_itpm_amount'));
    				SetRec.setValue({
    					fieldId:'transtatus',
    					value:'C'
    				}).save({
    					enableSourcing:false,
    					ignoreMandatoryFields:true
    				});
    				if(transactionId && setReq > 0){
    					//getting the type of transaction
    					var transType = search.lookupFields({
    					    type: search.Type.TRANSACTION,
    					    id: transactionId,
    					    columns: ['type']
    					});
    					if(transType.type[0].text == '- iTPM Deduction'){
    						var deductionRec = record.load({
        						type:'customtransaction_itpm_deduction',
        						id:transactionId
        					});
            				var deductionOpenBal = parseFloat(deductionRec.getValue('custbody_itpm_ddn_openbal'));
            				deductionOpenBal = (deductionOpenBal > 0)?deductionOpenBal:0;
            				deductionRec.setValue({
            					fieldId:'custbody_itpm_ddn_openbal',
            					value:deductionOpenBal + setReq
            				}).save({
            					enableSourcing:false,
            					ignoreMandatoryFields:true
            				});    						
    					}        				
    				}
    			}
    			redirect.toRecord({
    				type:record.Type.JOURNAL_ENTRY,
    				id:JERecId
    			});
    		}
    	}catch(e){
    		log.error(e.name,'record id = '+context.request.parameters.sid+', message = '+e.message);
    		if(e.name == 'SETTLEMENT_INVALID_STATUS'){
    			throw Error(e.message);
    		}
    	}
    }

    return {
        onRequest: onRequest
    };
    
});