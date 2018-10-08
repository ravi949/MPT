/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/runtime',
		'N/search',
		'./iTPM_Module_Settlement.js'
		],
/**
 * @param {Object} ST_Module
 */
function(runtime, search, ST_Module) {
   
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
    		var promoId = scriptContext.newRecord.getValue('custbody_itpm_set_promo');
    		log.debug('promoId',promoId);
        	if(promoId){
        		var mopId =  runtime.getCurrentScript().getParameter({name: 'custscript_itpm_set_mop'});
            	log.debug('mopId', mopId);
            	if(mopId == "2"){
            		var promoLumSum = search.lookupFields({
                		type:'customrecord_itpm_promotiondeal',
                		id:promoId,
                		columns:['custrecord_itpm_p_lumpsum']
            		}).custrecord_itpm_p_lumpsum;
            		log.debug('promoLumSum', promoLumSum);
            		return (ST_Module.getAllowanceMOP(promoId, mopId) || promoLumSum > 0)?'T':'F';
            	}else{
            		return (ST_Module.getAllowanceMOP(promoId, mopId))?'T':'F';
            	}            	
        	}else{
        		return 'T'
        	}        		
    		
    	}catch(e){
    		log.error(e.name,'function name = aftersubmit, message = '+e.message);
    		return 'T'
    	}
    	
    }

    return {
        onAction : onAction
    };
    
});
