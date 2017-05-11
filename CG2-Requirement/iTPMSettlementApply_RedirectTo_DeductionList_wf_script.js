/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Redirect the user to list of deductions suitelet view.
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
    	redirect.toSuitelet({
    		scriptId:'customscript_itpm_settlement_applyto_ddn',
     	    deploymentId:'customdeploy_itpm_settlement_applyto_ddn',
     	   	returnExternalUrl: false,
     	    parameters:{sid:scriptContext.newRecord.id}
    	});   
    }

    return {
        onAction : onAction
    };
    
});
