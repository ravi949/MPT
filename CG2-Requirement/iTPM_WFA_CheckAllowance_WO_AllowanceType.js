/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/search','N/runtime'],

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
    		var iTPMAllowanceId = scriptContext.newRecord.id,estimatedQtyId = -1,
//    		allowDuplicates = runtime.getCurrentScript().getParameter({name:'custscript_itpm_allowadditionaldiscounts'}),    
    		allowanceFilter =[['custrecord_itpm_all_promotiondeal','anyof',runtime.getCurrentScript().getParameter({name:'custscript_itpm_all_woalltypepromotion'})],'and',
    			['custrecord_itpm_all_item','anyof',runtime.getCurrentScript().getParameter({name:'custscript_itpm_all_woalltypeitem'})],'and',
    			['isinactive','is',false]];

    		if(iTPMAllowanceId){
    			allowanceFilter.push('and',['internalid','noneof',iTPMAllowanceId]);
    		}

    		//searching the for the allowance which have the duplicates 
    		var allowancesSearch = search.create({
    			type:'customrecord_itpm_promoallowance',
    			columns:['internalid','custrecord_itpm_all_allowaddnaldiscounts','custrecord_itpm_all_estqty'],
    			filters:allowanceFilter
    		}).run();

    		allowancesSearch.each(function(e){
    			estimatedQtyId = e.getValue('custrecord_itpm_all_estqty')
    			return false;
    		})
    		
    		return estimatedQtyId;
    	}catch(e){
    		log.error('exception in wo allowance type',e)
    	}
    
    }

    return {
        onAction : onAction
    };
    
});
