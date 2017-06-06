/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/redirect','N/search','N/record'],
/**
 * @param {redirect} redirect
 */
function(redirect,search,record) {
   
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
    		
    		var iTPMPrefSearch = search.create({
    			type:'customrecord_itpm_preferences',
    			columns:['custrecord_itpm_pref_ddnaccount','custrecord_pref_expenseaccount'],
    			filters:[]
    		}).run(),
    		DeductionRec = scriptContext.newRecord;
    		
    		iTPMPrefSearch.each(function(e){
    			
    			var JERec = record.create({
    				type:record.Type.JOURNAL_ENTRY
    			})
    			
    			JERec.setValue({
    				fieldId:'subsidiary',
    				value:DeductionRec.getValue('subsidiary')
    			}).setValue({
    				fieldId:'currency',
    				value:DeductionRec.getValue('currency')
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'account',
    				value:e.getValue('custrecord_itpm_pref_ddnaccount'),
    				line:0
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'credit',
    				value:DeductionRec.getValue('custbody_itpm_ddn_openbal'),
    				line:0
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'entity',
    				value:DeductionRec.getValue('custbody_itpm_ddn_customer'),
    				line:0
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'memo',
    				value:'Expense for Deduction # '+DeductionRec.getValue('tranid'),
    				line:0
    			})
    			
    			JERec.setSublistValue({
    				sublistId:'line',
    				fieldId:'account',
    				value:e.getValue('custrecord_pref_expenseaccount'),
    				line:1
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'debit',
    				value:DeductionRec.getValue('custbody_itpm_ddn_openbal'),
    				line:1
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'entity',
    				value:DeductionRec.getValue('custbody_itpm_ddn_customer'),
    				line:1
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'memo',
    				value:'Expense for Deduction # '+DeductionRec.getValue('tranid'),
    				line:1
    			})
    			
    			var JERecId = JERec.save({enableSourcing:false,ignoreMandatoryFields:true})
    			
    			log.debug('id',JERecId);
    			
    			redirect.toRecord({
    				type:record.Type.JOURNAL_ENTRY,
    				id:JERecId
    			});
    			
    			return false
    		})
    	}catch(e){
    		log.debug('excrption while redirect',e)
    	}
    }

    return {
        onAction : onAction
    };
    
});
