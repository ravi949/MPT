/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record','N/runtime'],

function(record,runtime) {

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
			//for any context except UI, if the prmotion type's "PLAN INCREMENTAL SEPARATE FROM TOTAL?" is checked,
			//return an error before record submit if the Incremental Volume field is empty
			var estVolumeRec = scriptContext.newRecord,
			scriptObj = runtime.getCurrentScript();
			
			promoTypeRec = record.load({
				type:'customrecord_itpm_promotiontype',
				id:scriptObj.getParameter({name:'custscript_itpm_estqty_planinc_promotype'})
			});

			return promoTypeRec.getValue('custrecord_itpm_pt_incrementalseparate')?'T':'F';
			
		}catch(e){
			log.debug('exception in planincremental seperate vaildation',e);
		}
	}

	return {
		onAction : onAction
	};

});
