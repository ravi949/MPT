/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
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
	function checkPromoDealAllowances(scriptContext) {  
		try{
			var promoDeal = runtime.getCurrentScript().getParameter({name:'custscript_itpm_estqty_checkallpromotion'}),
			allowancesPresent = false; 
			log.debug('promoDeal',promoDeal)
			//before load searching the promoDeal have any allowances or not.
			//if not we are return the error
			log.debug('promoDeal',promoDeal)
			var promoDealAllowanceSearch = search.create({
				type:'customrecord_itpm_promoallowance',
				columns:['internalid'],
				filters:[['custrecord_itpm_all_promotiondeal','anyof',promoDeal],'and',['isinactive','is',false],'and',
					     ['custrecord_itpm_all_promotiondeal.isinactive','is',false]
				]
			});

			promoDealAllowanceSearch.run().each(function(result){
					allowancesPresent = true
					return false;	   
			})

			return allowancesPresent?'T':'F';
			
		}catch(e){
			log.error('exception in check allowances are exist or not',e);
		}
	}

	return {
		onAction : checkPromoDealAllowances
	};

});
