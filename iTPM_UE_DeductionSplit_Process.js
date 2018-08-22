/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/record',
	'N/runtime',
	'N/search',
	'N/ui/serverWidget',
	'./iTPM_Module.js'
	],

	function(record, runtime, search, serverWidget, itpm) {

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
			if(scriptContext.type == 'create'){
				var params = scriptContext.request.parameters;
				var ddnSplitRec = scriptContext.newRecord;
				log.debug('params',params.ddn);

				//validate the deduction is validat 
				if(params.ddn){
					itpm.validateDeduction(params.ddn);
					scriptContext.form.getField({
						id:'custrecord_itpm_split_deduction'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.DISABLED
					});
				}else{
					scriptContext.form.getField({
						id:'custrecord_itpm_split_deduction'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.NORMAL
					});
				}

				scriptContext.form.addField({
					id : 'custpage_itpm_ddsplit_totallineamount',
					type : serverWidget.FieldType.CURRENCY,
					label : 'Total Line Amount'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				});

				scriptContext.newRecord.setValue({
					fieldId:'custrecord_itpm_split_deduction',
					value:params.ddn
				});       		
			}
			if(scriptContext.type == 'view'){				
					var msgText = "Click on the Deduction to navigate to the iTPM Deduction record, or use the menu bar. Do NOT click on Back"
						scriptContext.form.addField({
							id:'custpage_copyinprg_message',
							type:serverWidget.FieldType.INLINEHTML,
							label:'script'
						}).defaultValue = '<script language="javascript">require(["N/ui/message"],function(msg){msg.create({title:"Do NOT Click on Back Button",message:"'+msgText+'",type: msg.Type.INFORMATION}).show()})</script>'
				
				
			}
		}catch(ex){
			log.error(ex.name,ex.message);
			if(ex.name == 'INVALID_STATUS'){
				throw Error(ex.message);
			}
		}
	}



	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.newRecord.oldRecord - Old record
	 * @param {string} scriptContext.newRecord.type - Trigger type
	 * @Since 2015.2
	 */
	function beforeSubmit(scriptContext) {
		try{
			var ddnSplitRec = scriptContext.newRecord;
			var splitProcessCompleted = ddnSplitRec.getValue('custrecord_itpm_ddn_splitprocesscompletd');
			if(scriptContext.type != 'delete' && !splitProcessCompleted){
				var lineAmount = 0,totalAmount = 0;
				var lineCount = ddnSplitRec.getLineCount('recmachcustrecord_itpm_split');
				var createFrom = ddnSplitRec.getValue('custrecord_itpm_createfrom');
				log.debug('lineCount',lineCount);
				log.debug('createFrom',createFrom);
				//if line count empty or equal to one than we throws the error.
				if(createFrom != 'CSV_SPLIT' && lineCount <= 1){
					throw{
						name:'LINES_NOT_FOUND',
						message:'Line should be more than one.'
					}
				}

				scriptContext.newRecord.setValue({
					fieldId:'custrecord_itpm_import_completed',
					value:(createFrom != 'CSV_SPLIT')
				});

				//loading the deduction record
				var openBalance = record.load({
					type:'customtransaction_itpm_deduction',
					id:ddnSplitRec.getValue('custrecord_itpm_split_deduction')
				}).getValue('custbody_itpm_ddn_openbal');

				//loop through the lines and check the any zero lines are entered or not and sum the line amounts
				for(var i = 0;i < lineCount;i++){
					lineAmount = ddnSplitRec.getSublistValue({
						sublistId:'recmachcustrecord_itpm_split',
						fieldId:'custrecord_split_amount',
						line:i
					});
					//if line amount is zero it throws the error to the user
					if(parseFloat(lineAmount) <= 0){
						throw{
							name:'ZERO_AMOUNT_FOUND',
							message:'Line amount should be greater than zero.'
						}
					}
					totalAmount += parseFloat(lineAmount);
				}

				totalAmount = totalAmount.toFixed(2);
				//if line count > 0 and line total amount is greater than open balance throw error to the user 
				if(lineCount > 0 && (totalAmount != parseFloat(openBalance))){
					throw{
						name:'INVALID_TOTAL',
						message:'Sum of line amounts should be equal to Deduction Open balance.'
					}
				}
			}
		}catch(ex){
			log.error(ex.name,ex.message);
			if(ex.name == 'ZERO_AMOUNT_FOUND'){
				throw Error(ex.message);
			}else if(ex.name == 'INVALID_TOTAL'){
				throw Error(ex.message);
			}else if(ex.name == 'LINES_NOT_FOUND'){
				throw Error(ex.message);
			}
		}
	}


	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.oldRecord - Old record
	 * @param {string} scriptContext.type - Trigger type
	 * @Since 2015.2
	 */
	function afterSubmit(scriptContext) {
		try{
			var ddnSplitRec = scriptContext.newRecord;
			var splitProcessCompleted = ddnSplitRec.getValue('custrecord_itpm_ddn_splitprocesscompletd');
			if(scriptContext.type != 'delete' && !splitProcessCompleted){
				//changing the split record status
				record.submitFields({
					type:'customtransaction_itpm_deduction',
					id:ddnSplitRec.getValue('custrecord_itpm_split_deduction'),
					values:{
						'transtatus':'E',
						'custbody_itpm_ddn_splitoff': ddnSplitRec.getValue('custrecord_itpm_split_ddnopenbal')
					},
					options:{
						enableSourcing:false,
						ignoreMandatoryFields:true
					}
				});
			}

			//setting the externalid after record submit
			if(scriptContext.type == 'create' && !ddnSplitRec.getValue('externalid')){
				var tranId = search.lookupFields({
					type:'customtransaction_itpm_deduction',
					id:ddnSplitRec.getValue('custrecord_itpm_split_deduction'),
					columns:['tranid','custbody_itpm_ddn_openbal']
				})['tranid'];

				record.load({
					type:'customrecord_itpm_deductionsplit',
					id:ddnSplitRec.id
				}).setValue({
					fieldId:'externalid',
					value:'- iTPM Deduction #'+tranId
				}).save({
					enableSourcing:false,
					ignoreMandatoryFields:true
				});
			}
		}catch(ex){
			log.error(ex.name,ex.message);
		}
	}

	return {
		beforeLoad: beforeLoad,
		beforeSubmit: beforeSubmit,
		afterSubmit: afterSubmit
	};

});
