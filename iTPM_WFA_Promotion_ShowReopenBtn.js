/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record', 'N/runtime', 'N/search'],
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(record, runtime, search) {
   
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
    		var permissionOnPromo = userObj.getPermission('LIST_CUSTRECORDENTRY'+scriptContext.newRecord.getValue('rectype')); 
    		
    		var PromotypeRecord = record.load({
    		    type: 'customrecord_itpm_promotiontype', 
    		    id: scriptContext.newRecord.getValue('custrecord_itpm_p_type')    		 
    		});
    		var permissionOnPromoType = userObj.getPermission('LIST_CUSTRECORDENTRY'+PromotypeRecord.getValue('rectype'));
    		log.debug('res',(permissionOnPromo == runtime.Permission.EDIT && permissionOnPromoType == runtime.Permission.EDIT) || (permissionOnPromoType == runtime.Permission.FULL && permissionOnPromo == runtime.Permission.FULL));
    		return ((permissionOnPromo == runtime.Permission.EDIT && permissionOnPromoType == runtime.Permission.EDIT) || (permissionOnPromoType == runtime.Permission.FULL && permissionOnPromo == runtime.Permission.FULL))?'T':'F';   
    	}catch(e){
    		log.debug(e.name,e.message);
    		return 'F';
    	}
    }

    return {
        onAction : onAction
    };
    
});
