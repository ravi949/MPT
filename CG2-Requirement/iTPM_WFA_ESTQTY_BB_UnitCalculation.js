/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/runtime',
		'N/search',
		'./iTPM_UNITS_TYPE_Module'
		],
/**
 * @param {search} search
 */
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
		itemId = scriptObj.getParameter({name:'custscript_itpm_estqty_itembb'}),
		estqtyUnitId = scriptObj.getParameter({name:'custscript_itpm_estqty_unitbb'}),
		estqtyPromoId = scriptObj.getParameter({name:'custscript_itpm_estqty_promobb'}),
		unitsList = unitModule.getUnits(itemId),ratePerUnitBB = 0,percentRateUnitBB = 0,
		estqtyRate = unitsList.filter(function(e){return e.id == estqtyUnitId})[0].rate;
		log.debug('estqtyRate',estqtyRate);
		//searching for the allowances records with Promo,Item and MOP.
		var allSearch = search.create({
			type:'customrecord_itpm_promoallowance',
			columns:['custrecord_itpm_all_rateperuom','custrecord_itpm_all_percentperuom','custrecord_itpm_all_uom'],
			filters:[['custrecord_itpm_all_promotiondeal','is',estqtyPromoId],'and',
				     ['custrecord_itpm_all_item','is',itemId],'and',
				     ['isinactive','is',false],'and',
				     ['custrecord_itpm_all_mop','is',1] //mop bill-back
			]
		}).run(),
		allResult = [],start = 0,end = 1000,result,allUnitId,allRate,allRatePerUnit,allPercentUnit,allUnitPrice;
		
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
				ratePerUnitBB += allRatePerUnit;
			}else{
				allRate = unitsList.filter(function(e){return e.id == allUnitId})[0].rate;
				ratePerUnitBB += allRatePerUnit * (estqtyRate/allRate);
			}
			percentRateUnitBB += allPercentUnit;
		})
		
		log.debug('ratePerUnitBB',ratePerUnitBB)
		log.debug('percentRateUnitBB',percentRateUnitBB)
		
		estqtyRec.setValue({
			fieldId:'custrecord_itpm_estqty_rateperunitbb',
			value:ratePerUnitBB
		}).setValue({
			fieldId:'custrecord_itpm_estqty_percentbb',
			value:percentRateUnitBB
		});
    }

    return {
        onAction : onAction
    };
    
});
