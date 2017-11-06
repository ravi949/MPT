/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Workflow action script to check user permission of record and returns the true or false based on the record permission.
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
		try{
			var userObj = runtime.getCurrentUser();
			var userPermission = userObj.getPermission('LIST_CUSTRECORDENTRY'+scriptContext.newRecord.getValue('rectype'));
			log.debug('userPermission ',userPermission );
			return (userPermission == runtime.Permission.FULL || userPermission == runtime.Permission.EDIT || userPermission == runtime.Permission.CREATE)?'T':'F';				
		}catch(e){
			log.error(e.name,e.message);
			return 'F';
		}
	}

    return {
        onAction : onAction
    };
    
});
