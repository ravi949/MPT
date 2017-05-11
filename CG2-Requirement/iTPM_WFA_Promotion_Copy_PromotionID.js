/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Copying the old Promotion id and returning to workflow
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
    	var newRec = scriptContext.newRecord;
//    	oldRecId = scriptContext.oldRecord;
//    	log.debug('newRec',newRec.getValue('entryformquerystring').split('&')[1].split('=')[1]);
//    	log.debug('scriptContext',newRec.getValue('linenumber'));
    	
    	return newRec.getValue('linenumber').toString()
    }

    return {
        onAction : onAction
    };
    
});
