/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Retail info duplicate detection.
 */
define(['N/search',
		'N/runtime'
		],

function(search,runtime) {
   
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
    		var scriptObj = runtime.getCurrentScript();
    		var promoDeal = scriptObj.getParameter({name:'custscript_itpm_rei_dupdetection_promo'});
    		var item = scriptObj.getParameter({name:'custscript_itpm_rei_dupdetection_item'});

    		var reatailFilter = [['custrecord_itpm_rei_promotiondeal','anyof',promoDeal],'and',
    		                     ['custrecord_itpm_rei_item','anyof',item],'and',
    		                     ['isinactive','is',false]];

    		if(reatailRec.id && reatailRec.type == 'customrecord_itpm_promoretailevent'){
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
    		return 'F';
    	}
    	
    }

    return {
        onAction : onAction
    };
    
});
