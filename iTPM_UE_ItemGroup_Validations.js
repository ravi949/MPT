/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search',
		'./iTPM_Module.js'
		],
/**
 * @param {search} search
 * @param {module} iTPM_Module
 */
function(search, itpm) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {
    	try{
    		var currentRec = scriptContext.newRecord;
        	if(scriptContext.type == 'create' || scriptContext.type == 'edit'){
        		if(currentRec.getValue('custitem_itpm_available')){
            		var memberItems = itpm.getItemGroupItems(currentRec.id);
            		log.error('lenght',memberItems.length);
            		if(memberItems.length > 25){
            			throw {
            				name:"INVALID_TOTAL",
            				message:"Member items should be lessthan or equal to 25."
            			};
            		}
            	}
        	}
    	}catch(ex){
    		if(ex.name == "INVALID_TOTAL")
    			throw new Error(ex.message);
    		log.error(ex.name,ex.message);
    	}
    }


    return {
        beforeSubmit: beforeSubmit
    };
    
});
