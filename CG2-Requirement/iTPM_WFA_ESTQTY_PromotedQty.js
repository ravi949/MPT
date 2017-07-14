/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * calculating the Estimated Promoted Quantity
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
			var estVolumeRec = scriptContext.newRecord,
			scriptObj = runtime.getCurrentScript(),
			totalEstQty = scriptObj.getParameter({name:'custscript_itpm_estqty_promotedqty_ttqty'}),//ESTIMATED TOTAL QUANTITY
			promoDealId  = scriptObj.getParameter({name:'custscript_itpm_estqty_promotedqty_promo'}),
			itemId = scriptObj.getParameter({name:'custscript_item_estqty_promotedqty_item'});

			if(promoDealId != '' && itemId != '' && totalEstQty != ''){
				var sortOnRedemptionFactor = search.createColumn({
					name: 'custrecord_itpm_all_redemptionfactor',
					sort: search.Sort.DESC
				});

				var allowanceResult = search.create({
					type:'customrecord_itpm_promoallowance',
					columns:[sortOnRedemptionFactor],
					filters:[['custrecord_itpm_all_promotiondeal','anyof',promoDealId],'and',
							 ['custrecord_itpm_all_item','anyof',itemId],'and',
							 ['isinactive','is',false]
					]
				}).run().getRange(0,1);

				//calculating the Estimated Promoted Quantity
				var promotedQty = parseInt(totalEstQty) * (parseInt(allowanceResult[0].getValue('custrecord_itpm_all_redemptionfactor'))/100);
				
				return parseInt(promotedQty);
				
			}else{
				return 0;
			}
		}catch(e){
			log.error('exception in promoted qty',e);
		}
	}

	return {
		onAction : onAction
	};

});
