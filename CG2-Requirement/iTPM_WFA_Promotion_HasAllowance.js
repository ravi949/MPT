/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * check the allowance are exist for promotion deal before estimate volume create
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
	function checkForAllowanceRecords(scriptContext) {
		try{
			//check the allowance are exist for promotion deal before estimate volume create
			var estVolumeRec = scriptContext.newRecord;
			var scriptObj = runtime.getCurrentScript();
			var promoDealId = scriptObj.getParameter({name:'custscript_itpm_hasallownce_promotion'});
			var itemId = scriptObj.getParameter({name:'custscript_itpm_hasallowance_item'});
			
			var allSearchFilter = [['custrecord_itpm_all_promotiondeal','anyof',promoDealId],'and',
				['isinactive','is',false]
			];
			
			if(itemId){
				allSearchFilter.push('and',['custrecord_itpm_all_item','anyof',itemId]);
			}
			
			var hasAllowance = search.create({
				type:'customrecord_itpm_promoallowance',
				columns:['internalid'],
				filters:allSearchFilter
			}).run().getRange(0,10).length > 0;
			log.debug('hasAllowance',hasAllowance);
			return (hasAllowance)?'T':'F';
			
		}catch(e){
			log.error(e.name,'record id = '+scriptContext.newRecord.id+', message = '+e.message);
			return 'F';
		}
	}

	return {
		onAction : checkForAllowanceRecords
	};

});
