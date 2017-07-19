/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/search', './iTPM_Module'],
/**
 * @param {search} search
 */
function(search,iTPM_Module) {
   
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
    		var itemId = scriptContext.newRecord.getValue('custrecord_itpm_kpi_item');
    		
    		
    		
    	}catch(e){
    		log.debug(e.name,e.message);
    		return 0;
    	}
    }

    return {
        onAction : onAction
    };
    
});
