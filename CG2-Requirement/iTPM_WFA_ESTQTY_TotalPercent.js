/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/search','N/runtime'],
/**
 * @param {search} search
 */
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
    		var estVolumeRec = scriptContext.newRecord,
    		scriptObj = runtime.getCurrentScript(),
    		sumOfAllowancePercentPerUOM = 0,
			itemId = scriptObj.getParameter({name:'custscript_itpm_esqty_totalpercent_item'}),
			promoDealId = scriptObj.getParameter({name:'custscript_itpm_estqty_totalprcent_promo'});

    		//searching for allowance with promotional/deal and item which are in active stage
    		search.create({
    			type:'customrecord_itpm_promoallowance',
    			columns:['custrecord_itpm_all_uom','custrecord_itpm_all_rateperuom','custrecord_itpm_all_percentperuom'],
    			filters:[['custrecord_itpm_all_promotiondeal','anyof',promoDealId],'and',
    				['custrecord_itpm_all_item','anyof',itemId],'and',['isinactive','is',false]
    			]
    		}).run().each(function(e){
    			allowancePercentUOM = e.getValue('custrecord_itpm_all_percentperuom');
    			sumOfAllowancePercentPerUOM += parseFloat(allowancePercentUOM);
    			return true;
    		})

    		log.debug('sumOfAllowancePercentPerUOM',sumOfAllowancePercentPerUOM);
    		return sumOfAllowancePercentPerUOM
    	}catch(e){
    		log.error('exception in estqty total percent cal',e)
    	}
    }

    return {
        onAction : onAction
    };
    
});
