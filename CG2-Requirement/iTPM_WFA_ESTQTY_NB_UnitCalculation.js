/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/runtime',
	    'N/search',
	    './iTPM_UNITS_Module'	
],

function(runtime,search,unitModule) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	var estqtyRec = scriptContext.newRecord,
		scriptObj = runtime.getCurrentScript(),
		itemId = scriptObj.getParameter({name:'custscript_itpm_estqty_itemnb'}),
		estqtyUnitId = scriptObj.getParameter({name:'custscript_itpm_estqty_unitnb'}),
		estqtyPromoId = scriptObj.getParameter({name:'custscript_itpm_estqty_promonb'}),
		unitsList = unitModule.getUnits(itemId),ratePerUnitNB = 0,percentRateUnitNB = 0,
		estqtyRate = unitsList.filter(function(e){return e.id == estqtyUnitId})[0].rate;
		log.debug('estqtyRate',estqtyRate);
		//searching for the allowances records with Promo,Item and MOP.
		var allSearch = search.create({
			type:'customrecord_itpm_promoallowance',
			columns:['custrecord_itpm_all_rateperuom','custrecord_itpm_all_percentperuom','custrecord_itpm_all_uom'],
			filters:[['custrecord_itpm_all_promotiondeal','is',estqtyPromoId],'and',
				     ['custrecord_itpm_all_item','is',itemId],'and',
				     ['isinactive','is',false],'and',
				     ['custrecord_itpm_all_mop','is',2] //mop Net-bill
			]
		}).run(),
		allResult = [],start = 0,end = 1000,result,allUnitId,allRate,allRatePerUnit,allPercentUnit;
		
		do{
			result = allSearch.getRange(start,end);
			allResult = allResult.concat(result);
			start  = start + end;
		}while(result.length == 1000);
		
		allResult.forEach(function(result){
			allUnitId = result.getValue({name:'custrecord_itpm_all_uom'});
			allRatePerUnit = parseFloat(result.getValue({name:'custrecord_itpm_all_rateperuom'}));
			allPercentUnit = parseFloat(result.getValue({name:'custrecord_itpm_all_percentperuom'}));
			if(estqtyUnitId == allUnitId){
				ratePerUnitNB += allRatePerUnit;
				percentRateUnitNB += allPercentUnit;
			}else{
				allRate = unitsList.filter(function(e){return e.id == allUnitId})[0].rate;
				ratePerUnitNB += allRatePerUnit * (estqtyRate/allRate);
				percentRateUnitNB += allPercentUnit * (estqtyRate/allRate);
			}
		})
		
		log.debug('ratePerUnitNB',ratePerUnitNB)
		log.debug('percentRateUnitNB',percentRateUnitNB)
    }

    return {
        onAction : onAction
    };
    
});
