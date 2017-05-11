/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * When user clicks on Split Button on deduction then redirect the user to deduciton assistant view.
 */
define(['N/redirect'],
		/**
		 * @param {record} record
		 * @param {redirect} redirect
		 * @param {search} search
		 */
		function(redirect) {

	/**
	 * Definition of the Suitelet script trigger point.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.oldRecord - Old record
	 * @Since 2016.1
	 * Redirect to the Deduction to Deduction creation
	 */
	function onAction(scriptContext){ 
		try{
			var deductionRec = scriptContext.newRecord;
			redirect.toSuitelet({
				scriptId:'customscript_itpm_ddn_assnt_view',
				deploymentId:'customdeploy_itpm_ddn_assnt_view',
				returnExternalUrl: false,
				parameters:{fid:deductionRec.id,from:'ddn'}
			}); 
		}catch(e){
			log.debug('exception redirect to deduction',e);
		}
	}

	return {
		onAction : onAction
	};

});
