/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/runtime',
		'./iTPM_Module'
		],

function(runtime,iTPM_Module) {
   
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
    		//for any context except UI, before record submit, check whether the Estimate Volume By value is one of the applicable units based on the Units Type of the Item.
    		//IF not, return an error - "Estimate Volume By units are not applicable to the Item selected" and prevent record save.

    		var scriptObj = runtime.getCurrentScript();
    		var estVolumeBy = scriptObj.getParameter({name:'custscript_itpm_estqty_validateunit_unit'});
    		var itemId = scriptObj.getParameter({name:'custscript_itpm_estqty_validateunit_item'});

    		var unitsList = iTPM_Module.getItemUnits(itemId).unitArray;

    		return unitsList.some(function(e){return e.id == estVolumeBy})?'T':'F';

    	}catch(e){
			log.error(e.name,'record id = '+scriptContext.newRecord.id+', message = '+e.message);
			return 'F';
    	}
    }

    return {
        onAction : onAction
    };
    
});
