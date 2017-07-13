/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Redirecting to suitelet(iTPMSettlement_SuiteletView_su_script.js)
 */
define(['N/redirect','N/runtime'],

function(redirect,runtime) {

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
				scriptId:'customscript_itpm_set_createeditsuitelet',
				deploymentId:'customdeploy_itpm_set_createeditsuitelet',
				returnExternalUrl: false,
				parameters:{pid:scriptContext.newRecord.id,from:'promo'}
			});
		}catch(e){
			log.error('exception in redirection to settlement',e);
//			throw Error(e.message)
		}
	}

	return {
		onAction : onAction
	};

});
