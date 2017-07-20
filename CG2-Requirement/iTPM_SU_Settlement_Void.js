/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/record', 'N/runtime', 'N/redirect'],

function(record, runtime, redirect) {
   
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
    					message:'You cannot void this settlement'
    				};
    			}
    			
    			var subsidiaryExists = runtime.isFeatureInEffect('subsidiaries');
    			var currencyExists = runtime.isFeatureInEffect('multicurrency');
    				
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
    					fieldId:'custbody_itpm_set_deduction',
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
    				SetRec.setValue({
    					fieldId:'transtatus',
    					value:'C'
    				}).save({
    					enableSourcing:false,
    					ignoreMandatoryFields:true
    				});
    			}
    			redirect.toRecord({
    				type:record.Type.JOURNAL_ENTRY,
    				id:JERecId
    			});
    		}
    	}catch(e){
    		log.error(e.name,'record id = '+context.request.parameters.sid+', message = '+e.message);
    		if(e.name == 'SETTLEMENT_INVALID_STATUS'){
    			throw Error(e.message.replace(/Error: /g,''));
    		}
    	}
    }

    return {
        onRequest: onRequest
    };
    
});