/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * check the allowance are exist for promotion deal before estimate volume create
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
    		//check the allowance are exist for promotion deal before estimate volume create
    		var promoDeal = scriptContext.newRecord.getValue('custrecord_itpm_rei_promotiondeal');
    		var item = scriptContext.newRecord.getValue('custrecord_itpm_rei_item');
    		var promoDealAllowanceSearch = search.create({
    			type:'customrecord_itpm_promotiondeal',
    			columns:['custrecord_itpm_all_promotiondeal.internalid'],
    			filters:[['internalid','is',promoDeal],'and',
    			         ['isinactive','is',false],'and',
    			         ['custrecord_itpm_all_promotiondeal.custrecord_itpm_all_item','is',item],'and',
    			         ['custrecord_itpm_all_promotiondeal.isinactive','is',false]]
    		});

    		if(promoDealAllowanceSearch.run().getRange(0,10).length == 0)
    			return true.toString();
    		else
    			return false.toString();
    	}catch (e) {
    		log.error(e.name,e.message);
    	}
    }

    return {
        onAction : onAction
    };
    
});
