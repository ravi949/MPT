/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
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
    function onAction(scriptContext) {
    	var userObj = runtime.getCurrentUser();
    	var userPermission = userObj.getPermission('customrecord_itpm_promotiondeal');
    	log.debug('userObj ',userObj );
    	if(userPermission == runtime.Permission.FULL || userPermission == runtime.Permission.EDIT || userPermission == runtime.Permission.CREATE){
    		return 'T';
    	}else{
    		return 'F';
    	}    	

    }

    return {
        onAction : onAction
    };
    
});
