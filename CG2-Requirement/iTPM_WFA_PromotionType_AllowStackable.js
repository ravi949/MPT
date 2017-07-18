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
			var subsidiaryExists = runtime.isFeatureInEffect('SUBSIDIARIES');
			var ptRec = scriptContext.newRecord;
			var financialImpact = ptRec.getValue('custrecord_itpm_pt_financialimpact');
			var promotionTypeFilter =[['internalid','noneof',ptRec.id],'and',
				['custrecord_itpm_pt_financialimpact','anyof',financialImpact],'and',
				['custrecord_itpm_pt_stackable','is',true],'and',
				['isinactive','is',false]]; 

			//checking the subsidiary is enabled or not
			if(subsidiaryExists){
				var subsidiary =  ptRec.getValue('custrecord_itpm_pt_subsidiary');
				promotionTypeFilter.push('and',['custrecord_itpm_pt_subsidiary','is',subsidiary]);
			}
			var promotionTypeExists = search.create({
				type:'customrecord_itpm_promotiontype',
				columns:['internalid'],
				filters:promotionTypeFilter
			}).run().getRange(0,2).length > 0;
			
			return promotionTypeExists?'T':'F';
		}catch(e){
			log.error(e.name,'record id = '+scriptContext.newRecord.id+', message = '+e.message);
			return 'F';
		}
	}
	return {
		onAction : onAction
	};

});
