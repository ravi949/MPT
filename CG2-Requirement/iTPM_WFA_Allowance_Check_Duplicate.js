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
			var iTPMAllowanceId = scriptContext.newRecord.id,estimatedQtyId = 0,
			allowanceFilter =[['custrecord_itpm_all_promotiondeal','anyof',runtime.getCurrentScript().getParameter({name:'custscript_itpm_promotion'})],'and',
				['custrecord_itpm_all_item','anyof',runtime.getCurrentScript().getParameter({name:'custscript_itpm_all_item'})],'and',
				['isinactive','is',false]];

			if(iTPMAllowanceId){
				allowanceFilter.push('and',['internalid','noneof',iTPMAllowanceId]);
			}

			//searching the for the allowance which have the duplicates 
			var allowancesSearch = search.create({
				type:'customrecord_itpm_promoallowance',
				columns:['internalid','custrecord_itpm_all_allowaddnaldiscounts','custrecord_itpm_all_estqty'],
				filters:allowanceFilter
			}).run();

			allowancesSearch.each(function(e){
				if(e.getValue('custrecord_itpm_all_allowaddnaldiscounts')){
					estimatedQtyId = e.getValue('custrecord_itpm_all_estqty')
				}
				return false;
			})
			//if allowDuplicates false and allowanceFound length (allowances found) 
			//than restricting the allowance to create duplicates
			estimatedQtyId = allowancesSearch.getRange(0,2).length <= 0?-1:estimatedQtyId;
			return estimatedQtyId;

		}catch(e){
			log.error('exception',e.message);
		}
	}

	return {
		onAction : onAction
	};

});
