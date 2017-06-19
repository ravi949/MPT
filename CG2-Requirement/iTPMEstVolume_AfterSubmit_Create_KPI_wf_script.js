/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Create the iTPM Kpi Record After Estimated Qty record is created.
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
			var estVolumeRec = scriptContext.newRecord,
			promoDealId = estVolumeRec.getValue('custrecord_itpm_estqty_promodeal'),
			promoItem = estVolumeRec.getValue('custrecord_itpm_estqty_item'),
			estVolumeBy = estVolumeRec.getValue('custrecord_itpm_estqty_qtyby'),
			promoDealRec = record.load({
				type:'customrecord_itpm_promotiondeal',
				id:promoDealId
			});

			//creating the KPI's record after estimate record created.
			record.create({
				type:'customrecord_itpm_kpi'
			}).setValue({
				fieldId:'custrecord_itpm_kpi_promotiondeal',
				value:promoDealId,
				ignoreFieldChange:true
			}).setValue({
				fieldId:'custrecord_itpm_kpi_item',
				value:promoItem,
				ignoreFieldChange:true
			}).setValue({
				fieldId:'custrecord_itpm_kpi_uom',
				value:estVolumeBy
			}).save({
				enableSourcing: true,
				ignoreMandatoryFields: true
			});
		}catch(e){
			log.error('exception in kpi creation',e);
//			throw Error(e.message)
		}

	}

	return {
		onAction : onAction
	};

});
