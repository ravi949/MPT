/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record',
		'N/search',
		'N/runtime'
		],
/**
 * @param {record} record
 * @param {search} search
*/
function(record, search, runtime) {

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
			var allowanceRec = scriptContext.newRecord;
			var scriptObj = runtime.getCurrentScript();
			var promoDealId = scriptObj.getParameter({name:'custscript_itpm_all_updateretail_promo'});
			var promoItem = scriptObj.getParameter({name:'custscript_itpm_all_updateretail_item'});

			//edit the Retail info record	
			var retailInfoSearch = search.create({
				type:'customrecord_itpm_promoretailevent',
				columns:['internalid'],
				filters:[['custrecord_itpm_rei_item','anyof',promoItem],'and',
					['custrecord_itpm_rei_promotiondeal','anyof',promoDealId],'and',
					['isinactive','is',false]]
			}).run().getRange(0,1);
			if(retailInfoSearch.length > 0){
				record.load({
					type:'customrecord_itpm_promoretailevent',
					id:retailInfoSearch[0].getValue('internalid')
				}).save({
					enableSourcing: true,
					ignoreMandatoryFields: true
				});
			}
		}catch(e){
			log.error(e.name,'record id = '+scriptContext.newRecord.id+', message = '+e.message);
		}
	}

	return {
		onAction : onAction
	};

});
