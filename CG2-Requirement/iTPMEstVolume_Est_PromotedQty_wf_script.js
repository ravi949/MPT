/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * calculating the Estimated Promoted Quantity
 */
define(['N/search'],

		function(search) {

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
			totalEstQty = estVolumeRec.getValue('custrecord_itpm_estqty_totalqty'), //ESTIMATED TOTAL QUANTITY
			promoDealId  = estVolumeRec.getValue('custrecord_itpm_estqty_promodeal'),
			itemId = estVolumeRec.getValue('custrecord_itpm_estqty_item');

			if(promoDealId != '' && itemId != '' && totalEstQty != ''){
				var sortOnRedemptionFactor = search.createColumn({
					name: 'custrecord_itpm_all_redemptionfactor',
					sort: search.Sort.DESC
				});

				var allowanceResult = search.create({
					type:'customrecord_itpm_promoallowance',
					columns:[sortOnRedemptionFactor],
					filters:[['custrecord_itpm_all_promotiondeal','is',promoDealId],'and',['custrecord_itpm_all_item','is',itemId],'and',['isinactive','is',false]]
				}).run().getRange(0,1);

				//calculating the Estimated Promoted Quantity
				var promotedQty = parseInt(totalEstQty) * (parseInt(allowanceResult[0].getValue('custrecord_itpm_all_redemptionfactor'))/100);

				estVolumeRec.setValue({
					fieldId:'custrecord_itpm_estqty_estpromotedqty',
					value:parseInt(promotedQty)
				});
			}
		}catch(e){
			log.debug('exception in promoted qty',e);
		}
	}

	return {
		onAction : onAction
	};

});
