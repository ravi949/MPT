/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/record',
		'N/redirect',
		'./iTPM_Module'
	   ],

function(record, redirect, itpm) {
   
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
    				
        			JERec.setValue({
    					fieldId:'custbody_itpm_appliedto',
    					value:SetRec.id
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
    					value:'Journal Entry for Settlement # '+SetRec.getValue('tranid'),
    					line:i
    				});
       			
    			}
       		
    			var JERecId = JERec.save({
    				enableSourcing:false,
    				ignoreMandatoryFields:true
    			});
       		
    			log.debug('JERecId',JERecId);
       		
    			if(JERecId){
    				var deductionId = SetRec.getValue('custbody_itpm_appliedto');
    				var setReq = parseFloat(SetRec.getValue('custbody_itpm_amount'));
    				SetRec.setValue({
    					fieldId:'transtatus',
    					value:'C'
    				}).save({
    					enableSourcing:false,
    					ignoreMandatoryFields:true
    				});
    				if(deductionId && setReq > 0){
        				var deductionRec = record.load({
    						type:'customtransaction_itpm_deduction',
    						id:deductionId
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