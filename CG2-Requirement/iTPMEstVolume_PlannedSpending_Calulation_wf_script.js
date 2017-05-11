/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * calculation the Estimated Spend w/o Fixed Fee (or) ESTIMATED SPEND W/O LS
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
			item = estVolumeRec.getValue('custrecord_itpm_estqty_item'),
			promoDealId = estVolumeRec.getValue('custrecord_itpm_estqty_promodeal'),
			totalVolume = estVolumeRec.getValue('custrecord_itpm_estqty_totalqty'), //ESTIMATED TOTAL QUANTITY
			totalAllowanceUOM = estVolumeRec.getValue('custrecord_itpm_estqty_totalrate'), //TOTAL ALLOWANCE PER UOM
			promotedQty = estVolumeRec.getValue('custrecord_itpm_estqty_estpromotedqty'); //ESTIMATED PROMOTED QUANTITY

			if(totalVolume != '' && totalAllowanceUOM != ''){

				var sortOnRedemptionFactor = search.createColumn({
					name: 'custrecord_itpm_all_redemptionfactor',
					sort: search.Sort.DESC
				});

				var allowanceResult = search.create({
					type:'customrecord_itpm_promoallowance',
					columns:[sortOnRedemptionFactor],
					filters:[['custrecord_itpm_all_promotiondeal','is',promoDealId],'and',['custrecord_itpm_all_item','is',item],'and',['isinactive','is',false]]
				}).run().getRange(0,1);

				//calculation the Estimated Spend w/o Fixed Fee (or) ESTIMATED SPEND W/O LS
				if(allowanceResult.length > 0){
//					var redemptionFactor = parseFloat(allowanceResult[0].getValue('custrecord_itpm_all_redemptionfactor')),
					var plannedSpending = totalAllowanceUOM * promotedQty;
					estVolumeRec.setValue({
						fieldId:'custrecord_itpm_estqty_estspendwithoutls',
						value:plannedSpending
					})
				}

			}
		}catch(e){
			log.debug('exception estqty plan spending cal',e);
		}
	}

	return {
		onAction : onAction
	};

});
