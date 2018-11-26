/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * @description This will return the false then condition will show the submit button on promotion.
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
			log.debug('scriptContext.newRecord.id',scriptContext.newRecord.id);
			var ppSearch = search.create({
				type:'customrecord_itpm_promotion_planning',
				columns:['internalid','custrecord_itpm_pp_processed'],
				filters:[['custrecord_itpm_pp_promotion','anyof',scriptContext.newRecord.id],'and',
						 ['custrecord_itpm_pp_processed','is',false]]		    		
			});

			log.debug(!(ppSearch.run().getRange(0,2).length > 0));
			return (!(ppSearch.run().getRange(0,2).length > 0))? 'T' : 'F';
		}catch(e){
			log.error(e.name,e.message);
			return 'F';
		}
	}

	return {
		onAction : onAction
	};
});