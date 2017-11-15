/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record'],
/**
 * @param {record} record
 */
function(record) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	if(scriptContext.newRecord.getValue('isinactive')){
    		record.delete({
    			type:scriptContext.newRecord.type,
    			id:scriptContext.newRecord.id
    		});
    	}
    }

    return {
        onAction : onAction
    };
    
});
