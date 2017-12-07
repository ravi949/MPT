/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * Adding the Deduction button on invoice if invoice has atlease on payment and dont have any deduction records(Open and Pending)
 */
define(['N/search',
	'N/ui/serverWidget',
	'N/runtime',
	'./iTPM_Module.js'
	],
	/**
	 * @param {search} search
	 * @param {serverWidget} serverWidget
	 */
	function(search, serverWidget, runtime, itpm) {

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
			if(runtime.executionContext == runtime.ContextType.USER_INTERFACE && scriptContext.type == 'view'){
				//invoice status not equal to PAID IN FULL
				var invStatus = scriptContext.newRecord.getValue('status');

				//invoice dont have any ITPM DEDUCTION records which is not Open,Pending
				var invoiceDeductionsAreEmpty = search.create({
					type:'customtransaction_itpm_deduction',
					columns:['internalid'],
					filters:[['custbody_itpm_ddn_invoice','is',scriptContext.newRecord.id],'and',
						['status','anyof',["Custom100:A","Custom100:B"]]]
				}).run().getRange(0,5).length == 0;

				var ddnPermission = itpm.getUserPermission(runtime.getCurrentScript().getParameter('custscript_itpm_inv_ddn_permsn_rectypeid'));
				log.debug('ddnPermission',ddnPermission);

				if(invStatus == 'Open' && invoiceDeductionsAreEmpty){
					scriptContext.form.clientScriptModulePath = './iTPM_Attach_Invoice_ClientMethods.js';
					//itpm deduction permission should be create or edit or full
					if(ddnPermission >= 2){
						scriptContext.form.addButton({
							id:'custpage_itpm_newddn',
							label:'Deduction',
							functionName:'iTPMDeduction('+scriptContext.newRecord.id+')'
						});
					}
				}
			}
		}catch(e){
			log.error(e.name,' record type = invoice, record id='+scriptContext.newRecord.id+' message='+e.message);
		}
	}

	return {
		beforeLoad: beforeLoad
	};

});
