/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * The promotion has at least one allowance.  (Lum Sum : Fixed Amount),If there are no allowances, then promotion has to have a non-zero fixed-fee.
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
			//The promotion has at least one allowance.  (Lum Sum : Fixed Amount)
			//If there are no allowances, then promotion has to have a non-zero fixed-fee.
			var promoDealRec = scriptContext.newRecord,
			promoDealId = promoDealRec.id,
			fixedAmount = promoDealRec.getValue('custrecord_itpm_p_lumpsum'), //LUMP SUM
			fixedAmountNotZero = true;

			var allowanceRecords = search.create({
				type:'customrecord_itpm_promoallowance',
				columns:['internalid'],
				filters:[['custrecord_itpm_all_promotiondeal','is',promoDealId],'and',
					['isinactive','is',false]
				]
			}).run().getRange(0,2);

			if(allowanceRecords.length == 0){
				if(fixedAmount == "" && parseFloat(fixedAmount) == 0){
					fixedAmountNotZero = false;
				}
			}

			return fixedAmountNotZero.toString();
		}catch(e){
			log.error('exception in fixed amount validation',e);
		}
	}

	return {
		onAction : onAction
	};

});
