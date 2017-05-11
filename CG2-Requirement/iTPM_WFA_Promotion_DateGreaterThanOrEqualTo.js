/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/runtime', 'N/record'],

function(runtime, record) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} sc
     * @param {Record} sc.newRecord - New record
     * @param {Record} sc.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(sc) {
    	/****** Get script parameters (Dates) ******/
    	try{
	    	var date1 = runtime.getCurrentScript().getParameter({name:'custscript_itpm_wa_date_1'}),
	    		date2 = runtime.getCurrentScript().getParameter({name:'custscript_itpm_wa_date_2'});
	    	if (date1 >= date2) {
	    		return 'T';
	    	} else {
	    		return 'F';
	    	}
    	} catch(ex){
    		log.debug(ex.name, ex.message + '; ' + sc.newRecord.id + '; ' + sc.newRecord.type);
    	}
    }

    return {
        onAction : onAction
    };
    
});
