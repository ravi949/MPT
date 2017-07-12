/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define([
	'N/runtime',
	'N/search',
	'./iTPM_Module'
	],

function(runtime,search,iTPM_Module) {
   
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
    		itemId = scriptObj.getParameter({name:'custscript_itpm_estqty_rate_item'}),
    		estqtyUnitId = scriptObj.getParameter({name:'custscript_itpm_estqty_rate_unit'}),
    		estqtyPromoId = scriptObj.getParameter({name:'custscript_itpm_estqty_rate_promo'}),
    		allMop = scriptObj.getParameter({name:'custscript_itpm_estqty_rate_allmop'}),
    		unitsList = iTPM_Module.getItemUnits(itemId).unitArray,ratePerUnit = 0,
    		estqtyRate = unitsList.filter(function(e){return e.id == estqtyUnitId})[0].conversionRate;
    		log.debug('estqtyRate',estqtyRate);
    		//searching for the allowances records with Promo,Item and MOP.
    		var allSearch = search.create({
    			type:'customrecord_itpm_promoallowance',
    			columns:['custrecord_itpm_all_rateperuom','custrecord_itpm_all_uom'],
    			filters:[['custrecord_itpm_all_promotiondeal','is',estqtyPromoId],'and',
					     ['custrecord_itpm_all_item','is',itemId],'and',
					     ['isinactive','is',false],'and',
					     ['custrecord_itpm_all_mop','is',allMop] //mop
    			]
    		}).run(),
    		allResult = [],start = 0,end = 1000,result,allUnitId,allRate,allRatePerUnit,allUnitPrice;
    		
    		do{
    			result = allSearch.getRange(start,end);
    			allResult = allResult.concat(result);
    			start  = start + end;
    		}while(result.length == 1000);
    		
    		allResult.forEach(function(result){
    			allUnitId = result.getValue({name:'custrecord_itpm_all_uom'});
    			allRatePerUnit = parseFloat(result.getValue({name:'custrecord_itpm_all_rateperuom'}));
    			if(estqtyUnitId == allUnitId){
    				ratePerUnit += allRatePerUnit;
    			}else{
    				allRate = unitsList.filter(function(e){return e.id == allUnitId})[0].conversionRate;
    				ratePerUnit += allRatePerUnit * (estqtyRate/allRate);
    			}
    		});
    		
    		log.debug('ratePerUnit',ratePerUnit)
    		return ratePerUnit;
    	}catch(e){
    		log.error('exception in rate per unit',e);
    	}
    }

    return {
        onAction : onAction
    };
    
});
