/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/runtime'],

function(runtime) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
    	if(scriptContext.type == 'create' || scriptContext.type == 'edit'){
    		try{
    			var scriptObj = runtime.getCurrentScript();
    			var allowanceRecId = scriptObj.getParameter({name: 'custscript_itpm_*******'});
    			var estqtyRecId = scriptObj.getParameter({name: 'custscript_itpm_*******'});
    			
    			
    			if(sc.newRecord.type == allowanceRecId){  //Calculate for Allowance record
    				
    			}else if(sc.newRecord.type == estqtyRecId){ //Calculate for Estimated Quantity record
    				
    			}
    			
    			
    		}catch(e){
    			log.error(e.name, e.message);
    		}
    	}
    }

    return {
        afterSubmit: afterSubmit
    };
    
});
