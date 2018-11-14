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
				var recordType = scriptContext.newRecord.type;
				//Deduction record type id
				var ddnRecTypeId = runtime.getCurrentScript().getParameter('custscript_itpm_inv_ddn_rectypeid');
				log.debug('recordType',recordType);
				log.debug('ddnRecTypeId',ddnRecTypeId);

				var functionObjects = {
						'invoice':addButtonOnInvoice,
						'creditmemo':addButtonOnCreditMemo
				}

				functionObjects[recordType](scriptContext, ddnRecTypeId);
			}
		}catch(e){
			log.error(e.name,' record type = invoice, record id='+scriptContext.newRecord.id+' message='+e.message);
		}
	}

	/**
	 * @param scriptContext
	 * @description Adding the Deduction button on invoice record
	 */
	function addButtonOnInvoice(scriptContext, ddnRecTypeId){

		//invoice status not equal to PAID IN FULL
		var invStatus = scriptContext.newRecord.getValue('status');
		//log.debug('dddn rec tyep',ddnRecTypeId);
		log.debug('newRecord',scriptContext.newRecord);
		//invoice dont have any ITPM DEDUCTION records which is not Open,Pending
		var deductionStatuses = ["Custom"+ddnRecTypeId+":A","Custom"+ddnRecTypeId+":B"];
		var invoiceDeductionsAreEmpty = deductionsAreEmpty(scriptContext.newRecord.id, deductionStatuses);
		var ddnPermission = itpm.getUserPermission(runtime.getCurrentScript().getParameter('custscript_itpm_inv_ddn_permsn_rectypeid'));
		log.debug('ddnPermission',ddnPermission);
		var postingPeriodId = scriptContext.newRecord.getValue({fieldId:'postingperiod'});
		
		//attach the client script on the forms
		scriptContext.form.clientScriptModulePath = './iTPM_Attach_Invoice_ClientMethods.js';
		
		if(invStatus == 'Open' && invoiceDeductionsAreEmpty ){
			//itpm deduction permission should be create or edit or full
			if(ddnPermission >= 2){
				scriptContext.form.addButton({
					id:'custpage_itpm_newddn',
					label:'Deduction',
					functionName:'iTPMDeduction('+postingPeriodId+','+scriptContext.newRecord.id+')'
				});
			}
		}
	}

	/**
	 * @param scriptContext
	 * @description Adding the Deduction button on credit memo record
	 */
	function addButtonOnCreditMemo(scriptContext, ddnRecTypeId){
		//invoice status not equal to PAID IN FULL
		var creditMemoStatus = scriptContext.newRecord.getValue('status');
		//gettting the iTPM Applied To value
		var itpmAppliedTo = scriptContext.newRecord.getValue('custbody_itpm_appliedto');
		log.debug('creditMemoStatus',creditMemoStatus);
		//log.debug('dddn rec tyep',ddnRecTypeId);
		log.debug('newRecord',scriptContext.newRecord);
		var ddnPermission = itpm.getUserPermission(runtime.getCurrentScript().getParameter('custscript_itpm_inv_ddn_permsn_rectypeid'));
		log.debug('ddnPermission',ddnPermission);
		log.debug('itpmAppliedTo',!itpmAppliedTo);
		var JEPermission = runtime.getCurrentUser().getPermission('TRAN_JOURNAL');
		var postingPeriodId = scriptContext.newRecord.getValue({fieldId:'postingperiod'});
		
		//attach the client script on the forms
		scriptContext.form.clientScriptModulePath = './iTPM_Attach_CreditMemo_ClientMethods.js';
		
		//Credit Memo dont have any ITPM DEDUCTION records which is not Open,Pending and Resolved
		var hasDeductions = true;
		
		//Check for credit memo related ddn's with the following statuses Open,Pending and Resolved
		hasDeductions = deductionsAreEmpty(scriptContext.newRecord.id,["Custom"+ddnRecTypeId+":A","Custom"+ddnRecTypeId+":B","Custom"+ddnRecTypeId+":C"]);
		
		log.debug('hasDeductions',hasDeductions);
		
		//for deduction button credit memo status should be open or full applied
		if((creditMemoStatus == 'Open' || creditMemoStatus == 'Fully Applied') && 
		   !hasDeductions && !itpmAppliedTo){
			//itpm deduction permission should be create or edit or full
			if(ddnPermission >= 2 && JEPermission >= 2){
				scriptContext.form.addButton({
					id:'custpage_itpm_newddn',
					label:'Deduction',
					functionName:'iTPMDeduction('+scriptContext.newRecord.id+','+postingPeriodId+')'
				});
			}
		}
		
		//for match to deduction buttion credit memo status should be open and JE permission >= create
		if(creditMemoStatus == 'Open' && JEPermission >= 2 && hasDeductions){
			scriptContext.form.addButton({
				id:'custpage_itpm_matchtoddn',
				label:'Match to Deduction',
				functionName:'iTPMMatchToDdn('+scriptContext.newRecord.id+','+postingPeriodId+')'
			});
		}
	}

	/**
	 * @param recordId invoice or creditmemo id
	 * @param statuses deduction statusses
	 * @returns boolean
	 */
	function deductionsAreEmpty(recordId,statuses){
		log.debug('statuses',statuses);
		return search.create({
			type:'customtransaction_itpm_deduction',
			columns:['internalid'],
			filters:[
		         ['custbody_itpm_ddn_invoice','anyof',recordId],'and',
		         ['status','anyof',statuses]
			]
		}).run().getRange(0,5).length <= 0;
	}

	return {
		beforeLoad: beforeLoad
	};

});
