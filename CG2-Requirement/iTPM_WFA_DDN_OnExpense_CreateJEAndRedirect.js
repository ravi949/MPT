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
    			columns:['custrecord_itpm_pref_ddnaccount','custrecord_itpm_pref_expenseaccount'],
    			filters:[]
    		}).run(),
    		DeductionRec = scriptContext.newRecord,
    		memo = 'Expense for Deduction # '+DeductionRec.getValue('tranid'),
    		JERecId;
    		
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
    			}).setValue({
    				fieldId:'custbody_itpm_set_deduction',
    				value:DeductionRec.id
    			}).setValue({
    				fieldId:'memo',
    				value:memo
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
    				fieldId:'memo',
    				value:memo,
    				line:0
    			})
    			
    			JERec.setSublistValue({
    				sublistId:'line',
    				fieldId:'account',
    				value:e.getValue('custrecord_itpm_pref_expenseaccount'),
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
//					    values: {
//					    	custbody_itpm_ddn_openbal: 0,
//					    	transtatus:'C'
//					    }
    				
    				record.submitFields({
					    type: 'customtransaction_itpm_deduction',
					    id: DeductionRec.id,
					    values: {
					    	custbody_itpm_ddn_openbal: 0
					    },
					    options: {
					        enableSourcing: false,
					        ignoreMandatoryFields : true
					    }
					});
    			}
    			
//    			redirect.toRecord({
//    				type:record.Type.JOURNAL_ENTRY,
//    				id:JERecId
//    			})
    			return false
    		});
    		
    	}catch(e){
    		log.error('excrption while redirect',e)
    	}
    }

    return {
        onAction : onAction
    };
    
});
