/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Before creation of Kpi it's check for allowance records are exist or not for particular Promotion/Deal
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
			var kpiRec = scriptContext.newRecord,
			promoDealId = kpiRec.getValue('custrecord_itpm_kpi_promotiondeal'),
			item = kpiRec.getValue('custrecord_itpm_kpi_item');

			var allowanceResult = search.create({
				type:'customrecord_itpm_promoallowance',
				columns:['internalid'],
				filters:[['custrecord_itpm_all_promotiondeal','is',promoDealId],'and',
					['custrecord_itpm_all_item','is',item],'and',
					['isinactive','is',false]
				]
			}).run().getRange(0,2);

			return (allowanceResult.length ==0).toString();
		}catch(e){
			log.error('exception in before creation of kpi check for allownaces',e);
		}
	}

	return {
		onAction : onAction
	};

});
