/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Before creation of iTPM Estimate Quantity record checks for iTPM Allowance record is exist or not.
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
			//check the allowance are exist for promotion deal before estimate volume create
			var promoDeal = scriptContext.newRecord.getValue('custrecord_itpm_estqty_promodeal');
			var estVolumeItem = scriptContext.newRecord.getValue('custrecord_itpm_estqty_item');

			var estVolumeFilter = [['custrecord_itpm_estqty_promodeal','is',promoDeal],'and',
				['custrecord_itpm_estqty_item','is',estVolumeItem],'and',
				['isinactive','is',false]];

			if(scriptContext.newRecord.id){
				estVolumeFilter.push('and',['internalid','noneof',scriptContext.newRecord.id])
			}

			var estVolumeSearch = search.create({
				type:'customrecord_itpm_estquantity',
				columns:['internalid'],
				filters:estVolumeFilter
			});

			if(estVolumeSearch.run().getRange(0,2).length > 0)
				return true.toString();
			else
				return false.toString();
		}catch(e){
			log.error('estqty duplicated deduction',e);
//			throw Error(e.message)
		}

	}

	return {
		onAction : onAction
	};

});
