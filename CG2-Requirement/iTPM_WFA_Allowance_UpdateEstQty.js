/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * If user change the values in iTPM Allowance and submit record than it will load and save the appropriate EstimateQty and RetailInfo Records
 */
define(['N/record','N/search','N/runtime'],

function(record,search,runtime) {

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
			var promoDealId = scriptObj.getParameter({name:'custscript_itpm_all_updateestqty_promo'});
			var promoItem = scriptObj.getParameter({name:'custscript_itpm_all_updateestqty_item'});

			var estVolumeResult = search.create({
				type:'customrecord_itpm_estquantity',
				columns:['internalid'],
				filters:[['isinactive','is',false],'and',
					['custrecord_itpm_estqty_promodeal','anyof',promoDealId],'and',
					['custrecord_itpm_estqty_item','anyof',promoItem]]
			}).run().getRange(0,1);
			log.debug('estVolumeResult',estVolumeResult)
			//edit the estimated quantity record.
			if(estVolumeResult.length>0){
				record.load({
					type:'customrecord_itpm_estquantity',
					id:estVolumeResult[0].getValue('internalid')
				}).save({
					enableSourcing: true,
					ignoreMandatoryFields: true
				});
			}
		}catch(e){
			log.error(e.name,e.message);
		}
	}

	return {
		onAction : onAction
	};

});
