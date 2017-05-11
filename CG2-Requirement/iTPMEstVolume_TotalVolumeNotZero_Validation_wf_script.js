/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record'],

		function(record) {

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
			// If the promotion type has "volume required" checked,
			//then total volume can't be zero.  If un checked, then total volume can be zero.

			var estVolumeRec = scriptContext.newRecord,
			item = estVolumeRec.getValue('custrecord_itpm_estqty_item'),
			promoDealId = estVolumeRec.getValue('custrecord_itpm_estqty_promodeal'),
			totalVolume = estVolumeRec.getValue('custrecord_itpm_estqty_totalqty'),
			totalAllowanceUOM = estVolumeRec.getValue('custrecord_itpm_estqty_totalrate');

			var promoTypeRecId = record.load({
				type:'customrecord_itpm_promotiondeal',
				id:promoDealId
			}).getValue('custrecord_itpm_p_type'),

			volumeRequiredChecked = record.load({
				type:'customrecord_itpm_promotiontype',
				id:promoTypeRecId
			}).getValue('custrecord_itpm_pt_estqty');

			if(volumeRequiredChecked && totalVolume == 0){
				return true.toString();
			}

			return false.toString();
		}catch(e){
			log.debug('exception in total volume zero validation',e);
		}
	}

	return {
		onAction : onAction
	};

});
