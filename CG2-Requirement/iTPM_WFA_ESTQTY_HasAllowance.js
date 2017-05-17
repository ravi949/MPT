/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/search','N/record','N/runtime'],

function(search,record,runtime) {

	/**
	 * Definition of the Suitelet script trigger point.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.oldRecord - Old record
	 * @Since 2016.1
	 */
	function checkAllowanceForPromoDealWithItem(scriptContext) {
		try{
			//check the allowance are exist for promotion deal before estimate volume create
			var estVolumeRec = scriptContext.newRecord,
			scriptObj = runtime.getCurrentScript();
			
			var promoDealId = scriptObj.getParameter({name:'custscript_itpm_estqty_hasallownce_promo'}),
			estVolumeItemId = scriptObj.getParameter({name:'custscript_itpm_estqty_hasallowance_item'});
			
			var promoDealAllowanceSearch = search.create({
				type:'customrecord_itpm_promotiondeal',
				columns:['custrecord_itpm_all_promotiondeal.internalid'],
				filters:[['internalid','is',promoDealId],'and',
					['isinactive','is',false],'and',
					['custrecord_itpm_all_promotiondeal.custrecord_itpm_all_item','is',estVolumeItemId],'and',
					['custrecord_itpm_all_promotiondeal.isinactive','is',false]]
			});

			return (promoDealAllowanceSearch.run().getRange(0,10).length > 0)?'T':'F';
			
		}catch(e){
			log.debug('exception in allowance duplicated detection',e)
		}
	}

	return {
		onAction : checkAllowanceForPromoDealWithItem
	};

});
