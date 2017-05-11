/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * This is used in Promotion Workflow Approval.
 * if Promotion Type has volume required checked, then promotion have at least one estimated quantity record.
 * and each item must have a non-zero volume estimate(Estimated Total Quantity).
 */
define(['N/search','N/record'],

		function(search,record) {

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
			//If the promotion type has volume is required checked, 
			//then each item must have a non-zero volume estimate

			//if not found est volume records than returning false
			var promoDealRec = scriptContext.newRecord,
			estimatedQtyFound = true,
			promoTypeRec = record.load({
				type:'customrecord_itpm_promotiontype',
				id:promoDealRec.getValue('custrecord_itpm_p_type')
			}),
			requiredEstVolume = promoTypeRec.getValue({
				fieldId:'custrecord_itpm_pt_estqty'
			});

			if(requiredEstVolume){
				var estVolumeRecords = search.create({
					type:'customrecord_itpm_estquantity',
					columns:['internalid','custrecord_itpm_estqty_totalqty'],
					filters:[['custrecord_itpm_estqty_promodeal','is',promoDealRec.id],'and',
						['isinactive','is',false]
					]
				}).run(),estTotalQty;

				//checking the estimated volume records greater than zero or not.
				estimatedQtyFound = estVolumeRecords.getRange(0,10).length > 0;

				//checking the each estimated qty record est total qty is non zero.
				estVolumeRecords.each(function(e){
					estTotalQty = e.getValue('custrecord_itpm_estqty_totalqty');
					if(estTotalQty =='' || estTotalQty  == 0){
						estimatedQtyFound = false;
						return false;
					} 
					return true;
				})
			}

			return estimatedQtyFound.toString();
		}catch(e){
			log.debug('exception estqty records existance',e);
		}
	}

	return {
		onAction : onAction
	};

});
