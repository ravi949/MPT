/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Retail info duplicate detection.
 */
define(['N/search'],

function(search) {
   
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
    		var reatailRec = scriptContext.newRecord;
    		var promoDeal = reatailRec.getValue('custrecord_itpm_rei_promotiondeal');
    		var item = reatailRec.getValue('custrecord_itpm_rei_item');

    		var reatailFilter = [['custrecord_itpm_rei_promotiondeal','anyof',promoDeal],'and',
    		                     ['custrecord_itpm_rei_item','anyof',item],'and',
    		                     ['isinactive','is',false]];

    		if(reatailRec.id){
    			reatailFilter.push('and',['internalid','noneof',reatailRec.id]);
    		}

    		var duplicateDetected = search.create({
    			type:'customrecord_itpm_promoretailevent',
    			columns:['internalid'],
    			filters:reatailFilter
    		}).run().getRange(0,2).length > 0;

    		return duplicateDetected?'T':'F';	
    	}catch (e) {
    		log.error(e.name,e.message);
    	}
    	
    }

    return {
        onAction : onAction
    };
    
});
