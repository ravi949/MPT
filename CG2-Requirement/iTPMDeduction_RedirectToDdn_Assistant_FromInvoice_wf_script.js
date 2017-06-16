/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * When user click on Deduction button on invoice it will redirect the user to Deduction Assistant view.
 */
define(['N/redirect'],

		function(redirect) {

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
			redirect.toSuitelet({
				scriptId:'customscript_itpm_ddn_assnt_view',
				deploymentId:'customdeploy_itpm_ddn_assnt_view',
				isExternal: false,
				parameters:{fid:scriptContext.newRecord.id,from:'inv'}
			});
		}catch(e){
			log.error('e',e);
		}
	}

	return {
		onAction : onAction
	};

});
