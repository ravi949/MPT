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


		scriptContext.form.addField({
			id	  : 'custpage_inv_accntgprd',
			type  : serverWidget.FieldType.INLINEHTML,
			label : 'script'
		}).defaultValue = '<script language="javascript">require(["N/ui/message","N/https"],function(msg,https){'+
		'var response = https.get({url:"/app/site/hosting/scriptlet.nl?script=1123&deploy=1&popid='+postingPeriodId+'"});console.log(JSON.parse(response.body));'+
		'if(JSON.parse(response.body).period_closed){ msg.create({title:"Warning!",message:"This Invoice Posting Period is Closed",type: msg.Type.WARNING}).show(); }'+
		'})</script>';


		log.debug('UE_DDN_BeforeLoad', 'openBalance: ' + openBalance + '; status: ' + status + '; csPath: ' + clientScriptPath + '; eventType: ' + eventType + '; runtimeContext: ' + runtimeContext);

		if(invStatus == 'Open' && invoiceDeductionsAreEmpty ){
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

	/**
	 * @param scriptContext
	 * @description Adding the Deduction button on credit memo record
	 */
	function addButtonOnCreditMemo(scriptContext, ddnRecTypeId){
		//invoice status not equal to PAID IN FULL
		var creditMemoStatus = scriptContext.newRecord.getValue('status');
		creditMemoStatus = (creditMemoStatus == 'Open' || creditMemoStatus == 'Fully Applied');
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

		//Showing the banner if the accounting period is closed
		scriptContext.form.addField({
			id	  : 'custpage_cm_accntgprd',
			type  : serverWidget.FieldType.INLINEHTML,
			label : 'script'
		}).defaultValue = '<script language="javascript">require(["N/ui/message","N/https"],function(msg,https){'+
		'var response = https.get({url:"/app/site/hosting/scriptlet.nl?script=1123&deploy=1&popid='+postingPeriodId+'"});console.log(JSON.parse(response.body));'+
		'if(JSON.parse(response.body).period_closed){ msg.create({title:"Warning!",message:"This Credit Memo Posting Period is Closed",type: msg.Type.WARNING}).show(); }'+
		'})</script>';

		//Credit Memo dont have any ITPM DEDUCTION records which is not Open,Pending and Resolved
		var ddnStatus = true;
		if(itpmAppliedTo){
			ddnStatus = search.lookupFields({
				type:'customtransaction_itpm_deduction',
				id:itpmAppliedTo,
				columns:['internalid','status']
			})['status'][0].value;
			ddnStatus = (ddnStatus != 'statusA' && ddnStatus != 'statusB' && ddnStatus != 'statusC');
		}

		log.debug('ddnStatus',ddnStatus);
		if(creditMemoStatus && ddnStatus){
			scriptContext.form.clientScriptModulePath = './iTPM_Attach_CreditMemo_ClientMethods.js';
			//itpm deduction permission should be create or edit or full
			if(ddnPermission >= 2 && JEPermission >= 2){
				scriptContext.form.addButton({
					id:'custpage_itpm_newddn',
					label:'Deduction',
					functionName:'iTPMDeduction('+scriptContext.newRecord.id+')'
				});
				var JE_Permssion = runtime.getCurrentUser().getPermission('TRAN_JOURNAL');
				log.debug('JE_Permssion',JE_Permssion);
				if(JE_Permssion >= 2){
					scriptContext.form.addButton({
						id:'custpage_itpm_matchtoddn',
						label:'Match to Deduction',
						functionName:'iTPMMatchToDdn('+scriptContext.newRecord.id+')'
					});
				}
			}
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
			filters:[['custbody_itpm_ddn_invoice','is',recordId],'and',
				['status','anyof',statuses]]
		}).run().getRange(0,5).length == 0;
	}

	return {
		beforeLoad: beforeLoad
	};

});
