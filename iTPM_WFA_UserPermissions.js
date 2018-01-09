/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/runtime',
		'./iTPM_Module.js'
		],
/**
 * @param {runtime} runtime
 */
function(runtime, itpm) {
   
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
    		return itpm.getUserPermission(runtime.getCurrentScript().getParameter('custscript_itpm_recordtype'));
    	}catch(ex){
    		log.error(ex.name,ex.message);
    		return 0;
    	}
    }

    return {
        onAction : onAction
    };
    
});
