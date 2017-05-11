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
			//for any context except UI, if the prmotion type's "PLAN INCREMENTAL SEPARATE FROM TOTAL?" is checked,
			//return an error before record submit if the Incremental Volume field is empty
			var estVolumeRec = scriptContext.newRecord,
			incrementalQty = estVolumeRec.getValue('custrecord_itpm_estqty_incrementalqty'),
			promoDealId = estVolumeRec.getValue('custrecord_itpm_estqty_promodeal'),
			promoDealRec = record.load({
				type:'customrecord_itpm_promotiondeal',
				id:promoDealId
			}),
			promoTypeRec = record.load({
				type:'customrecord_itpm_promotiontype',
				id:promoDealRec.getValue('custrecord_itpm_p_type')
			});

			if(promoTypeRec.getValue('custrecord_itpm_pt_incrementalseparate'))
				return (incrementalQty == '' && incrementalQty != 0).toString();
			else
				return false.toString();
		}catch(e){
			log.debug('exception in planincremental seperate vaildation',e);
		}
	}

	return {
		onAction : onAction
	};

});
