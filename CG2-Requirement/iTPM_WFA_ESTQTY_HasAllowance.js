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
			
			var promoDealId = scriptObj.getParameter({name:'custscript_itpm_estqty_hasallownce_promo'}),
			estVolumeItemId = scriptObj.getParameter({name:'custscript_itpm_estqty_hasallowance_item'});
			
			var promoDealAllowanceSearch = search.create({
				type:'customrecord_itpm_promotiondeal',
				columns:['custrecord_itpm_all_promotiondeal.internalid'],
				filters:[['internalid','anyof',promoDealId],'and',
					['isinactive','is',false],'and',
					['custrecord_itpm_all_promotiondeal.custrecord_itpm_all_item','anyof',estVolumeItemId],'and',
					['custrecord_itpm_all_promotiondeal.isinactive','is',false]]
			});

			return (promoDealAllowanceSearch.run().getRange(0,10).length > 0)?'T':'F';
			
		}catch(e){
			log.error(e.name,'record id = '+scriptContext.newRecord.id+', message = '+e.message);
			return 'F';
		}
	}

	return {
		onAction : checkForAllowanceRecords
	};

});
