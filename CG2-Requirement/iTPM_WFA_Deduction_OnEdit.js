/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record', 'N/redirect', 'N/search'],
/**
 * @param {record} record
 * @param {redirect} redirect
 * @param {search} search
 */
function(record, redirect, search) {
   
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
				scriptId:'customscript_itpm_deduction_editview',
				deploymentId:'customdeploy_itpm_deduction_editview',
				returnExternalUrl: false,
				parameters:{fid:deductionRec.id,form:'edit'}
			}); 
		}catch(e){
			log.debug('Exception redirect to Deduction edit mode ',e);
		}
    }

    return {
        onAction : onAction
    };
    
});
