/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * If subsidiary is false, then we are hiding the subsidiary field in promotion
 */
define(['N/runtime'],

function(runtime) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	//if subsidiary is false then we are hiding the subsidiary field in promotion/deal
    	
    	var isSubsidiaryExist = runtime.isFeatureInEffect('SUBSIDIARIES');
    	if(!isSubsidiaryExist){
    		scriptContext.newRecord.setValue({
    			fieldId:'custrecord_itpm_p_subsidiary',
    			value:1
    		});
    	}
    	
    	return isSubsidiaryExist.toString();
    }

    return {
        onAction : onAction
    };
    
});
