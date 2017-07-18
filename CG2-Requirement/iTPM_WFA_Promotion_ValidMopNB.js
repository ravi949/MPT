/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Based on Methods of payment field value in Promotion type record show/hiding Net-Bill related fields
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
			var promoTypeRec = record.load({
				type:'customrecord_itpm_promotiontype',
				id:scriptContext.newRecord.getValue('custrecord_itpm_p_type')
			});

			var MOPCondition = promoTypeRec.getValue('custrecord_itpm_pt_validmop').some(function(e){
				return (e == 2);
			});
			return (MOPCondition)?'T':'F';
		}catch(e){
			log.error(e.name,e.message);
			return 'F';
		}
	}

	return {
		onAction : onAction
	};

});
