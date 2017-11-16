/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Workflow action script to check user permission of record and returns the true or false based on the record permission.
 */
define(['N/runtime',
		'N/record'
	   ],
/**
 * @param {runtime} runtime
 */
function(runtime,record) {
   
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
			var scriptObj = runtime.getCurrentScript();
			var permissionOnPromo = userObj.getPermission('LIST_CUSTRECORDENTRY'+scriptContext.newRecord.getValue('rectype'));

			if(scriptObj.getParameter('custscript_itpm_perm_pt_promo_hasedit')){
				var PromotypeRecord = record.load({
	    		    type: 'customrecord_itpm_promotiontype', 
	    		    id: scriptContext.newRecord.getValue('custrecord_itpm_p_type')    		 
	    		});
	    		var permissionOnPromoType = userObj.getPermission('LIST_CUSTRECORDENTRY'+PromotypeRecord.getValue('rectype'));
	    		return ((permissionOnPromo == runtime.Permission.EDIT && permissionOnPromoType == runtime.Permission.EDIT) || (permissionOnPromoType == runtime.Permission.FULL && permissionOnPromo == runtime.Permission.FULL))?'T':'F';
			}else if(scriptObj.getParameter('custscript_itpm_perm_createoredit')){
				return (permissionOnPromo == runtime.Permission.EDIT || permissionOnPromo == runtime.Permission.CREATE)?'T':'F';
			}else if(scriptObj.getParameter('custscript_itpm_perm_full')){
				return (permissionOnPromo == runtime.Permission.FULL)?'T':'F';
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
