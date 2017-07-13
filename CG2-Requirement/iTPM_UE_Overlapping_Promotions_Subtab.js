/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * calling the suitelet(iTPMPromoDeal_Overlapping_FrontEnd_su_script.js) to showing the overlapping promotions in a list view 
 */
define(['N/search','N/runtime','N/ui/serverWidget','N/url'],

function(search,runtime,serverWidget,url) {

	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {string} scriptContext.type - Trigger type
	 * @param {Form} scriptContext.form - Current form
	 * @Since 2015.2
	 */
	function beforeLoad(scriptContext) {
		try{
			var eventType = scriptContext.type,
			contextType = runtime.executionContext,
			promoDealRec = scriptContext.newRecord,
			promoDealImpact = promoDealRec.getValue('custrecord_itpm_p_impact');

			if(contextType == 'USERINTERFACE' && promoDealImpact == '13' && eventType!='create' && eventType!='copy'){
				//adding the dynamic subtab and added sublist and its values
				var form = scriptContext.form,
				promoDealRec = scriptContext.newRecord,
				rectype = promoDealRec.getValue('rectype'),
				customerId = promoDealRec.getValue('custrecord_itpm_p_customer'),
				startDate = promoDealRec.getText('custrecord_itpm_p_shipstart'),
				endDate = promoDealRec.getText('custrecord_itpm_p_shipend'),
				overlapDealViewUrl = url.resolveScript({
					scriptId: 'customscript_itpm_promo_overlaplist',
					deploymentId: 'customdeploy_itpm_promo_overlaplist',
					returnExternalUrl: false,
					params: {
						cid:customerId,
						pdid:promoDealRec.id,
						start:startDate,
						end:endDate,
						rectype:rectype
					}
				});
				promoDealRec.setValue({fieldId:'custrecord_itpm_p_overlappingpromotions',value:'<iframe id="boxnet_widget_frame" src="'+overlapDealViewUrl+'" align="center" style="width: 100%; height:600px; margin:0; border:0; padding:0" frameborder="0"></iframe>'});
			}
		}catch(e){
			log.error('exception',e.message);
		}
	}

	return {
		beforeLoad: beforeLoad
	};

});
