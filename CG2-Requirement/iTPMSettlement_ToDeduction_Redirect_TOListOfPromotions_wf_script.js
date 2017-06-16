/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * This Workflow redirect the user to list of promotions page from deduction
 */
define(['N/redirect'],

function(redirect) {
   
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
    		var deductionRec = scriptContext.newRecord;
    		redirect.toSuitelet({
    			scriptId:'customscript_itpm_settlemnt_listpromotns',
    			deploymentId:'customdeploy_itpm_settlemnt_listpromotns',
    			returnExternalUrl: false,
    			parameters:{ddn:deductionRec.id}
    		});
    	}catch (e) {
    		log.error(e.name,e.message);
    	}
    }

    return {
        onAction : onAction
    };
    
});
