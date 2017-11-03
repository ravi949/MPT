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
		try{
			var userObj = runtime.getCurrentUser();
			var userPermission = userObj.getPermission('LIST_CUSTRECORDENTRY'+scriptContext.newRecord.getValue('rectype'));
			log.debug('userObj ',userObj );
			if(userPermission == runtime.Permission.FULL || userPermission == runtime.Permission.EDIT || userPermission == runtime.Permission.CREATE){
				return 'T';
			}else{
				return 'F';
			}    	
		}catch(e){
			log.error(e.name,e.message);
			return 'F';
		}
	}

    return {
        onAction : onAction
    };
    
});
