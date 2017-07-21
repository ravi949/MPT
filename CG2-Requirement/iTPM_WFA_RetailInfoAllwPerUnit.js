/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * retail merge margin calculation,setting the values to the %Discount at Retail
 */
define(['N/search',
		'N/runtime',
		'./iTPM_Module'
		],

function(search, runtime, iTPM_Module) {

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
			//before record submit we calculation the values
			var retailRec = scriptContext.newRecord;
			var scriptObj = runtime.getCurrentScript();
			var promoId = scriptObj.getParameter({name:'custscript_itpm_rei_calculation_promo'});
			var itemId = scriptObj.getParameter({name:'custscript_itpm_rei_calculation_item'});
			//setting the value to the Allowance Per Unit
			if(promoId != '' && itemId != ''){				
				var unitsList = iTPM_Module.getItemUnits(itemId);
				if(!unitsList.error){
					unitsList = unitsList.unitArray;
					var baseConversionRate = unitsList.filter(function(e){return e.isBase})[0].conversionRate;
					var allowancePerUnit = 0;
					search.create({
						type:'customrecord_itpm_promoallowance',
						columns:['custrecord_itpm_all_uom','custrecord_itpm_all_rateperuom'],
						filters:[['custrecord_itpm_all_promotiondeal','anyof',promoId],'and',
							['custrecord_itpm_all_item','anyof',itemId],'and',
							['isinactive','is',false]]
					}).run().each(function(result){
						var allowanceUOMRate = unitsList.filter(function(e){return e.id == result.getValue('custrecord_itpm_all_uom')})[0].conversionRate;
						var conversionFactor = baseConversionRate/allowanceUOMRate;
						allowancePerUnit += conversionFactor * parseFloat(result.getValue('custrecord_itpm_all_rateperuom'));
					});
				}else{
					log.error('unitslist',unitsList);
				}
			}
			return allowancePerUnit;
		}catch(e){
			log.error(e.name,e.message);
			return 0;
		}
	}

	return {
		onAction : onAction
	};

});
