/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * @NModuleScope TargetAccount
 * Checks whether subsidiaries are enabled, via a workflow action and returns boolean.
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
        	try{
        		return runtime.isFeatureInEffect('SUBSIDIARIES')?'T':'F';
        	}catch(e){
        		log.error(e.name,'record id = '+scriptContext.newRecord.id+', message = '+e.message);
        	}
        }
    };
    
});
