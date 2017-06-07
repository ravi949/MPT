/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record', 'N/redirect', 'N/runtime'],
/**
 * @param {record} record
 * @param {redirect} redirect
 * @param {runtime} runtime
 */
function(record, redirect, runtime) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	var DeductionRec = scriptContext.newRecord;
    	log.debug('DeductionRec',DeductionRec.id);
    	log.debug('DeductionRec',DeductionRec.getValue({fieldId:'custbody_itpm_ddn_disputed' }));
    	redirect.toTaskLink({
    		id:'EDIT_TRAN_CUSTINVC',
    		parameters:{recId:DeductionRec.id}

    		});
//    	return DeductionRec.getValue({fieldId:'custbody_itpm_ddn_disputed' })
    }

    return {
        onAction : onAction
    };
    
});
