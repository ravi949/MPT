/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/search','N/runtime'],
		/**
		 * @param {record} record
		 */
		function(search,runtime) {

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
			isSubsidiaryExist = runtime.isFeatureInEffect('SUBSIDIARIES');
			return getPromotionTypeRecords(scriptContext.newRecord,isSubsidiaryExist).toString();
		}catch(e){
			log.debug('exception',e.message)
		}
	}


	function getPromotionTypeRecords(iTPMRecord,isSubsidiaryExist){
		var financialImpact = iTPMRecord.getValue('custrecord_itpm_pt_financialimpact'),
		promotionTypeFilter =[['internalid','noneof',iTPMRecord.id],'and',
			['custrecord_itpm_pt_financialimpact','is',financialImpact],'and',
			['custrecord_itpm_pt_stackable','is',true],'and',
			['isinactive','is',false]]; 

		//checking the subsidiary is enabled or not
		if(isSubsidiaryExist){
			var subsidiary =  iTPMRecord.getValue('custrecord_itpm_pt_subsidiary');
			promotionTypeFilter.push('and',['custrecord_itpm_pt_subsidiary','is',subsidiary]);
		}
		log.debug('financialImpact',promotionTypeFilter)
		return search.create({
			type:'customrecord_itpm_promotiontype',
			columns:['internalid'],
			filters:promotionTypeFilter
		}).run().getRange(0,2).length > 0;
	}


	return {
		onAction : onAction
	};

});
