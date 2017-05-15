/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/redirect'],
/**
 * @param {redirect} redirect
 */
function(redirect) {
   
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
    		redirect.toTaskLink({
    			id:'EDIT_TRAN_JOURNAL',
    			parameters:{ddn:scriptContext.newRecord.id}
    		})
    	}catch(e){
    		log.debug('excrption while redirect',e)
    	}
    }

    return {
        onAction : onAction
    };
    
});
