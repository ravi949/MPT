/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * @NModuleScope TargetAccount
 */
define(['N/runtime'],
/**
 * @param {runtime} runtime
 */
function(runtime) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    
    return {
        onAction : function(scriptContext){
        	return runtime.isFeatureInEffect('SUBSIDIARIES').toString();
        }
    };
    
});
