/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/search'],

function(search) {
   
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
    		var promotionId = scriptContext.newRecord.getValue({fieldId: 'custrecord_itpm_all_promotiondeal'});
    		var fieldId = 'custrecord_itpm_all_account', value = null;
    		var daccSearch = search.create({
    			type: 'customrecord_itpm_promotiondeal',
    			filters: [
    			          {name: 'internalid', operator: 'anyof', values: [promotionId]}
    			          ],
    			columns: [
    			          {name: 'custrecord_itpm_pt_defaultaccount', join: 'custrecord_itpm_p_type', label: 'Default Account'}
    			          ]
    		});
    		
    		daccSearch.run().each(function(sResult){
    				value = sResult.getValue({name: 'custrecord_itpm_pt_defaultaccount', join: 'custrecord_itpm_p_type'});
    		});
    		
    		return value;
    		//scriptContext.newRecord.setValue({fieldId: fieldId, value: value});
    	} catch(ex) {
    		log.error(ex.name, ex.message);
    	}
    }

    return {
        onAction : onAction
    };
    
});
