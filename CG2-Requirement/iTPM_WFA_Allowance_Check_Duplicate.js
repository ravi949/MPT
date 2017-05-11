/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * It is used to detect the duplicate allowance and return the values to workflow.
 */
define(['N/search','N/runtime'],

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
			var iTPMAllowanceId = scriptContext.newRecord.id,
			allowDuplicates = runtime.getCurrentScript().getParameter({name:'custscript_itpm_allowadditionaldiscounts'}),    
			allowanceFilter =[['custrecord_itpm_all_promotiondeal','is',runtime.getCurrentScript().getParameter({name:'custscript_itpm_promotion'})],'and',
				['custrecord_itpm_all_item','is',runtime.getCurrentScript().getParameter({name:'custscript_itpm_all_item'})],'and',
				['custrecord_itpm_all_type','is',runtime.getCurrentScript().getParameter({name:'custscript_itpm_all_allowancetype'})],'and',
				['isinactive','is',false]];

			if(iTPMAllowanceId){
				allowanceFilter.push('and',['internalid','noneof',iTPMAllowanceId]);
			}

			//searching the for the allowance which have the duplicates
			var duplicateAllFound = search.create({
				type:'customrecord_itpm_promoallowance',
				columns:['internalid'],
				filters:allowanceFilter
			}).run().getRange(0,1).length>0
			//if allowDuplicates false and allowanceFound length (allowances found) 
			//than restricting the allowance to create duplicates
			return (!allowDuplicates && duplicateAllFound)?'T':'F';
		}catch(e){
			log.debug('exception',e.message);
		}
	}

	return {
		onAction : onAction
	};

});
