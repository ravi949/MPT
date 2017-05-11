/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
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
	function checkAllowanceForPromoDealWithItem(scriptContext) {
		try{
			//check the allowance are exist for promotion deal before estimate volume create
			var estVolumeRec = scriptContext.newRecord;
			var promoDeal = estVolumeRec.getValue('custrecord_itpm_estqty_promodeal');
			var estVolumeItem = estVolumeRec.getValue('custrecord_itpm_estqty_item');
			var promoDealAllowanceSearch = search.create({
				type:'customrecord_itpm_promotiondeal',
				columns:['custrecord_itpm_all_promotiondeal.internalid'],
				filters:[['internalid','is',promoDeal],'and',
					['isinactive','is',false],'and',
					['custrecord_itpm_all_promotiondeal.custrecord_itpm_all_item','is',estVolumeItem],'and',
					['custrecord_itpm_all_promotiondeal.isinactive','is',false]]
			});


			//If "Plan incremental separate from total?" is checked for the promotion type of this deal, the default volume entry option should be "Total & incremental".    
			//If "Plan incremental separate from total?"  is unchecked, the the default entry should be "Total Quantity".
			var promoDealId = estVolumeRec.getValue('custrecord_itpm_estqty_promodeal'),
			estVolumeEntryOption = estVolumeRec.getValue('custrecord_itpm_estqty_qtyentryoptions'),
			promoDealLookup = search.lookupFields({
				type:'customrecord_itpm_promotiondeal',
				id: promoDealId,
				columns: ['custrecord_itpm_p_type']
			}),
			promoTypeId = promoDealLookup.custrecord_itpm_p_type[0].value,
			promotTypeRec = record.load({
				type:'customrecord_itpm_promotiontype',
				id:promoTypeId
			}),
			planIncSeparateFromTotal = promotTypeRec.getValue('custrecord_itpm_pt_incrementalseparate');

			if(estVolumeEntryOption == ''){
				estVolumeRec.setValue({
					fieldId:'custrecord_itpm_estqty_qtyentryoptions',
					value:(planIncSeparateFromTotal)?3:1
				})  
			}
			//end


			if(promoDealAllowanceSearch.run().getRange(0,10).length == 0)
				return true.toString();
			else
				return false.toString();
		}catch(e){
			log.debug('exception in allowance duplicated detection',e)
		}
	}

	return {
		onAction : checkAllowanceForPromoDealWithItem
	};

});
