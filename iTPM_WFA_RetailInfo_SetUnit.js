/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['./iTPM_Module.js'],

		function(itpm) {

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
			var unitsList = itpm.getItemUnits(scriptContext.newRecord.getValue('custrecord_itpm_rei_item'))["unitArray"];
			log.debug('unitsList',unitsList);
			log.error('unitsList',unitsList);
			log.audit('unitsList',unitsList);
			return unitsList.filter(function(e){return e.isBase})[0].id;
		}
		catch(ex){
			log.debug(ex.name,ex.message);
			log.error(ex.name,ex.message);
			log.audit(ex.name,ex.message);
		}
	}

	return {
		onAction : onAction
	};

});
