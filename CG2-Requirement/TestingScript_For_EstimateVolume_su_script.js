/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/record'],

function(record) {
	
	
	function onRequest(){
		var estVolRec = record.create({
			type:'customrecord_itpm_promovolume'
		});
		
		estVolRec.setValue({
			fieldId:'custrecord_itpm_vol_promotiondeal',
			value:4
		}).setValue({
			fieldId:'custrecord_itpm_vol_item',
			value:506
		}).setValue({
			fieldId:'custrecord_itpm_vol_total',
			value:10
		}).setValue({
			fieldId:'custrecord_itpm_vol_incremental',
			value:4
		}).setValue({
			fieldId:'custrecord_itpm_vol_units',
			value:1
		}).save({
			fieldChangeIgnore:true,
			ignoreMandatory:true
		})
	}
	
	return {
		onRequest:onRequest
	}
})   