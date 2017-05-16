/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/runtime',
	    'N/search'	
],

function(runtime,search) {
   
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
    		var estqtyRec = scriptContext.newRecord,
    		scriptObj = runtime.getCurrentScript(),
    		itemId = scriptObj.getParameter({name:'custscript_itpm_estqty_percent_item'}),
    		estqtyUnitId = scriptObj.getParameter({name:'custscript_itpm_estqty_percent_unit'}),
    		estqtyPromoId = scriptObj.getParameter({name:'custscript_itpm_estqty_percent_promo'}),
    		allMop = scriptObj.getParameter({name:'custscript_itpm_estqty_precent_allmop'}),percentRateUnit = 0;
    		//searching for the allowances records with Promo,Item and MOP.
    		var allSearch = search.create({
    			type:'customrecord_itpm_promoallowance',
    			columns:['custrecord_itpm_all_percentperuom'],
    			filters:[['custrecord_itpm_all_promotiondeal','is',estqtyPromoId],'and',
    				['custrecord_itpm_all_item','is',itemId],'and',
    				['isinactive','is',false],'and',
    				['custrecord_itpm_all_mop','is',allMop] //mop
    			]
    		}).run(),
    		allResult = [],start = 0,end = 1000,result,allPercentUnit;

    		do{
    			result = allSearch.getRange(start,end);
    			allResult = allResult.concat(result);
    			start  = start + end;
    		}while(result.length == 1000);

    		allResult.forEach(function(result){
    			allPercentUnit = parseFloat(result.getValue({name:'custrecord_itpm_all_percentperuom'}));
    			percentRateUnit += allPercentUnit;
    		})

    		log.debug('percentRateUnit',percentRateUnit)
    		return percentRateUnit;
    	}catch(e){
    		log.debug('exception in percent per unit',e);
    	}
    }

    return {
        onAction : onAction
    };
    
});
