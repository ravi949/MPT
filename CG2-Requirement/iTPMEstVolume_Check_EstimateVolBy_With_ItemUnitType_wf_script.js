/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record','N/search'],

function(record,search) {
   
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
    	
    	var estVolumeByRec = scriptContext.newRecord,recordType,estVolumeByNotFound = false;
    	var estVolumeBy = estVolumeByRec.getValue('custrecord_itpm_estqty_qtyby');
    	var itemId = estVolumeByRec.getValue('custrecord_itpm_estqty_item');
    	
    	if(itemId){
            var unitTypeId = search.create({
              type:search.Type.ITEM,
              columns:['type','unitstype'],
              filters:[['internalid','is',itemId],'and',['isinactive','is',false]]
            }).run().getRange(0,1)[0].getValue('unitstype');
         }

    	if(unitTypeId != '' && unitTypeId){

    		var unitTypeRec = record.load({
    			type:record.Type.UNITS_TYPE,
    			id:unitTypeId
    		}),
    		lineCount = unitTypeRec.getLineCount('uom');

    		for(var i=0;i<lineCount;i++){
    			var unitId = unitTypeRec.getSublistValue({sublistId:'uom',fieldId:'internalid',line:i})
    			if(estVolumeBy == unitId){
    				estVolumeByNotFound = true;
    				break;	
    			}	
    		}
    	}
    	
    	
    	return estVolumeByNotFound.toString();
    	
    	}catch(e){
    		log.debug('exception in validate item before estqty is going to save',e);
    	}
    }

    return {
        onAction : onAction
    };
    
});
