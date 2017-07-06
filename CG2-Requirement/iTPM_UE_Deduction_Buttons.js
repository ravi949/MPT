/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * if parent deduction amount is less than new deduction amount then.
 * split the deduction into two and creating the two journal entries for each deduction and changed the parent deduction status to resolved.
 */
define(['N/url','N/record','N/search', 'N/ui/serverWidget', 'N/runtime', 'N/redirect'],

function(url,record,search, widget, runtime, redirect) {

	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} sc
	 * @param {Record} sc.newRecord - New record
	 * @param {string} sc.type - Trigger type
	 * @param {Form} sc.form - Current form
	 * @Since 2015.2
	 */
	function beforeLoad(sc) {
		try{
			var openBalance = sc.newRecord.getValue({fieldId:'custbody_itpm_ddn_openbal'}),
				status = sc.newRecord.getValue({fieldId:'transtatus'}),
				clientScriptPath = runtime.getCurrentScript().getParameter({name:'custscript_itpm_ue_ddn_cspath'}),
				eventType = sc.type,
				runtimeContext = runtime.executionContext; 
			log.debug('UE_DDN_BeforeLoad', 'openBalance: ' + openBalance + '; status: ' + status + '; csPath: ' + clientScriptPath + '; eventType: ' + eventType + '; runtimeContext: ' + runtimeContext);
			if(
				eventType == sc.UserEventType.VIEW && 
				runtimeContext == runtime.ContextType.USER_INTERFACE &&
				openBalance != 0 &&
				status == 'A' && 
				clientScriptPath
					){
				log.debug('UE_DDN_BeforeLoad_IF', 'type: ' + sc.type + '; context: ' + runtime.executionContext);
				sc.form.clientScriptModulePath = clientScriptPath;
				var btn_split = sc.form.addButton({
					id: 'custpage_itpm_split',
					label: 'Split',
					functionName: 'iTPMsplit(' + sc.newRecord.id + ')'
				});
				var btn_settlement = sc.form.addButton({
					id: 'custpage_itpm_settlement',
					label: 'Settlement',
					functionName: 'iTPMsettlement(' + sc.newRecord.id + ')'
				});
				var btn_expense = sc.form.addButton({
					id: 'custpage_itpm_expense',
					label: 'Expense',
					functionName: 'iTPMexpense(' + sc.newRecord.id + ')'
				});
				var btn_invoice = sc.form.addButton({
					id: 'custpage_itpm_invoice',
					label: 'Re-Invoice',
					functionName: 'iTPMinvoice(' + sc.newRecord.id + ')'
				});
			} else if (eventType == sc.UserEventType.EDIT && runtimeContext == runtime.ContextType.USER_INTERFACE) {
				redirect.toSuitelet({
					scriptId:'customscript_itpm_ddn_assnt_view',
					deploymentId:'customdeploy_itpm_ddn_assnt_view',
					returnExternalUrl: false,
					parameters:{fid:sc.newRecord.id,from:'ddn',type:'edit'}
				}); 
			}
		} catch(ex) {
			log.error('DDN_UE_BeforeLoad', ex.name + '; message: ' + ex.message +'; Id:' + sc.newRecord.id);
			throw ex;
		}
	}

	return {
		beforeLoad: beforeLoad
	};

});
