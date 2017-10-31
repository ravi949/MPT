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
    	var userObj = runtime.getCurrentUser()
    	log.debug('userObj ',userObj );
    	if(userObj.getPermission() == runtime.Permission.FULL){
    		return true;
    	}else{
    		return false;
    	}    	

    }

    return {
        onAction : onAction
    };
    
});
