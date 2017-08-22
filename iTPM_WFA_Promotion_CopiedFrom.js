/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Copying the old Promotion id and returning to workflow
 */
define([],
/**
 * @param {record} record
 */
function() {
   
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
    		var newRec = scriptContext.newRecord;
//  		log.debug('newRec',newRec.getValue('entryformquerystring').split('&')[1].split('=')[1]);
//  		log.debug('scriptContext',newRec.getValue('linenumber'));

    		return newRec.getValue('linenumber').toString();
    	}catch(e){
    		log.error(e.name,'record id = '+scriptContext.newRecord.id+', message = '+e.message);
    		return '';
    	}
    }

    return {
        onAction : onAction
    };
    
});
