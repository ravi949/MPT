/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record','N/redirect'],
/**
 * @param {record} record
 */
function(record,redirect) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	try{
    		var SetRec = scriptContext.newRecord,
    		subsidiary = SetRec.getValue('subsidiary'),
    		currency = SetRec.getValue('currency'),
    		lineCount = SetRec.getLineCount('line');
    		
			if(lineCount > 0){
				var JERec = record.create({
    				type:record.Type.JOURNAL_ENTRY
    			}).setValue({
    				fieldId:'subsidiary',
    				value:subsidiary
    			}) .setValue({
    				fieldId:'currency',
    				value:currency
    			}).setValue({
    				fieldId:'custbody_itpm_set_deduction',
    				value:SetRec.id
    			});
			}
			
    		for(var i = 0;i < lineCount;i++){
    			var account = SetRec.getSublistValue({sublistId:'line',fieldId:'account',line:i}),
    			credit = SetRec.getSublistValue({sublistId:'line',fieldId:'credit',line:i}),
    			debit = SetRec.getSublistValue({sublistId:'line',fieldId:'debit',line:i}),
    			lumsumType = SetRec.getSublistValue({sublistId:'line',fieldId:'custcol_itpm_lsbboi',line:i});
    			log.debug(i,'account ='+account+' credit='+credit+' debit='+debit+' lumsumType='+lumsumType);
    			log.debug('JERec',JERec)
    			
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
    		
    		log.debug('JERecId',JERecId)
    		
    		if(JERecId){
    			record.load({
    				type:'customtransaction_itpm_settlement',
    				id:SetRec.id
    			}).setValue({
    				fieldId:'transtatus',
    				value:'C'
    			}).save({
    				enableSourcing:false,
    				ignoreMandatoryFields:true
    			})
    		}
			redirect.toRecord({
				type:record.Type.JOURNAL_ENTRY,
				id:JERecId
			})
			
    	}catch(e){
    		log.error('exception',e)
    	}
    }

    return {
        onAction : onAction
    };
    
});
