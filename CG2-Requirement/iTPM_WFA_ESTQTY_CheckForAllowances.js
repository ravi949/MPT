/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
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
	function checkPromoDealAllowances(scriptContext) {  
		try{
			var promoDeal = scriptContext.newRecord.getValue('custrecord_itpm_estqty_promodeal'),
			allowancesPresent = false; 

			//before load searching the promoDeal have any allowances or not.
			//if not we are return the error
			var promoDealAllowanceSearch = search.create({
				type:'customrecord_itpm_promotiondeal',
				columns:['custrecord_itpm_all_promotiondeal.internalid'],
				filters:[['internalid','is',promoDeal],'and',['isinactive','is',false],'and',
					     ['custrecord_itpm_all_promotiondeal.isinactive','is',false]
				]
			});

			promoDealAllowanceSearch.run().each(function(result){
				if(result.getValue({name:'internalid',join:'custrecord_itpm_all_promotiondeal'}) !='')
					allowancesPresent = true
					return false;	   
			})

			return allowancesPresent?'T':'F';
			
		}catch(e){
			log.debug('exception in check allowances are exist or not',e);
		}
	}

	return {
		onAction : checkPromoDealAllowances
	};

});
