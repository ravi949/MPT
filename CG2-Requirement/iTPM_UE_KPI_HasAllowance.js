/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * Validates whether the Promotion has at least one allowance for that Item before allowing the creation of a KPI record.
 */
define(['N/search','N/runtime'],
/**
 * @param {search} search
 * @param {runtime} runtime
 */
function(search,runtime) {

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
    		var eventType = scriptContext.type;
        	var exeType = runtime.executionContext;
        	log.debug('exeType',exeType)
    		if(eventType == 'create' && 
    		   (exeType == runtime.ContextType.USER_INTERFACE || 
    			exeType == runtime.ContextType.USEREVENT || 
    			exeType == runtime.ContextType.CSV_IMPORT)
    		 ){
    			var kpiRec = scriptContext.newRecord,
        		promoDealId = kpiRec.getValue('custrecord_itpm_kpi_promotiondeal'),
        		item = kpiRec.getValue('custrecord_itpm_kpi_item');

        		var allowanceResult = search.create({
        			type:'customrecord_itpm_promoallowance',
        			columns:['internalid'],
        			filters:[['custrecord_itpm_all_promotiondeal','is',promoDealId],'and',
        				['custrecord_itpm_all_item','is',item],'and',
        				['isinactive','is',false]
        			]
        		}).run().getRange(0,2);

        		if(allowanceResult.length == 0){
    				throw Error('Allowance not set');
    			}
        	}
    	}catch(e){
    		if(e.message == 'Allowance not set'){
    			throw Error('Promotion Allowances must be set before Estimated Volume can be entered');
    		}else{
    			log.error('exception in before creation of kpi check for allownaces',e);
    		}
    	}
    }


    return {
        beforeSubmit: beforeSubmit
    };
    
});
