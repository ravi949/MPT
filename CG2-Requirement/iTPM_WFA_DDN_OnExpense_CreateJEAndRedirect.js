/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/redirect','N/search','N/record','./iTPM_Module'],
/**
 * @param {redirect} redirect
 */
function(redirect,search,record,iTPM_Module) {
   
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
    		var iTPMPrefObj = iTPM_Module.getPrefrenceValues(),
    		ddnAccnt = iTPMPrefObj.dednExpAccnt,
    		expenseAccnt = iTPMPrefObj.expenseAccnt,
    		DeductionRec = scriptContext.newRecord,
    		memo = 'Expense for Deduction # '+DeductionRec.getValue('tranid'),
    		JERecId;

    			
    			var JERec = record.create({
    				type:record.Type.JOURNAL_ENTRY
    			})
    			
    			JERec.setValue({
    				fieldId:'subsidiary',
    				value:DeductionRec.getValue('subsidiary')
    			}).setValue({
    				fieldId:'currency',
    				value:DeductionRec.getValue('currency')
    			}).setValue({
    				fieldId:'custbody_itpm_set_deduction',
    				value:DeductionRec.id
    			}).setValue({
    				fieldId:'memo',
    				value:memo
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'account',
    				value:ddnAccnt,
    				line:0
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'credit',
    				value:DeductionRec.getValue('custbody_itpm_ddn_openbal'),
    				line:0
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'memo',
    				value:memo,
    				line:0
    			})
    			
    			JERec.setSublistValue({
    				sublistId:'line',
    				fieldId:'account',
    				value:expenseAccnt,
    				line:1
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'debit',
    				value:DeductionRec.getValue('custbody_itpm_ddn_openbal'),
    				line:1
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'memo',
    				value:memo,
    				line:1
    			})
    			
    			JERecId = JERec.save({enableSourcing:false,ignoreMandatoryFields:true});
    			
    			//changing the status of the deduction record to resolved
    			if(JERecId){
    				record.load({
    					type: 'customtransaction_itpm_deduction',
  					    id: DeductionRec.id
    				}).setValue({
    					fieldId:'custbody_itpm_ddn_openbal',
    					value:0 
    				}).save({
    					enableSourcing: false,
				        ignoreMandatoryFields : true
    				});
    			}
    			
//    			redirect.toRecord({
//    				type:record.Type.JOURNAL_ENTRY,
//    				id:JERecId
//    			})
    		
    	}catch(e){
    		log.error('excrption while redirect',e)
    	}
    }

    return {
        onAction : onAction
    };
    
});
