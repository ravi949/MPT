/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/runtime',
		'N/redirect',
		'N/search',
		'N/ui/serverWidget',
		'./iTPM_Module.js'
	],

	function(runtime, redirect, search, serverWidget, itpm) {

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

			//prevent copy of the deduction record
			if(sc.type == 'copy'){
				throw{
					name:'COPY_NOT_ALLOWED',
					message:'Copying a deduction is not allowed.'
				};
			}
			
			var status = sc.newRecord.getValue({fieldId:'transtatus'});
			var contextType = contextType = runtime.executionContext;
			
			//Restrict the user edit deduction record if status is Processing
			if(contextType == 'USERINTERFACE' && sc.type == 'edit' && status == 'E'){
				throw{
					name:'INVALID_EDIT',
					message:'The Deduction is in Processing status, It cannot be Edited.'
				};
			}
			
			//Getting the Internal Id's of custom records through script parameters
			var scriptObj = runtime.getCurrentScript();
			//Getting the Deduction permissions
			var ddnPermission = itpm.getUserPermission(scriptObj.getParameter('custscript_itpm_ddn_ddn_permsn_rectypeid'));
			//Getting the Settlement permissions
			var setPermission = itpm.getUserPermission(scriptObj.getParameter('custscript_itpm_ddn_set_permsn_rectypeid'));
			//Getting Journal Entry Permissions
			var JE_Permssion = runtime.getCurrentUser().getPermission('TRAN_JOURNAL');
			log.debug('JE_Permssion',JE_Permssion)
			log.debug('ddnPermission',ddnPermission);
			log.debug('setPermission',setPermission);

			var openBalance = sc.newRecord.getValue({fieldId:'custbody_itpm_ddn_openbal'});
			var status = sc.newRecord.getValue({fieldId:'transtatus'});
			var itpmAmount = sc.newRecord.getValue({fieldId:'custbody_itpm_amount'});
			var parentDeduction = sc.newRecord.getValue({fieldId:'custbody_itpm_ddn_parentddn'});
			var clientScriptPath = './iTPM_Attach_Deduction_Buttons.js';
			var eventType = sc.type;
			var runtimeContext = runtime.executionContext; 

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
				
				//Show banner on the Deduction when Resolution Queue is filled with this deduction
				try{
					var resolutionQueue = search.create({
						type : 'customrecord_itpm_resolutionqueue',
						columns: ['internalid'],
						filters: [
						          ["custrecord_itpm_rq_deduction","anyof",sc.newRecord.id], 
						          "AND", 
						          ["custrecord_itpm_rq_processingnotes","isempty",""], 
						          "AND", 
						          ["custrecord_itpm_rq_settlement","anyof","@NONE@"]
						         ]
					});
					
					var expenseQueue = search.create({
						type : 'customrecord_itpm_expensequeue',
						columns: ['internalid'],
						filters: [
						          ["custrecord_itpm_eq_deduction","anyof",sc.newRecord.id], 
						          "AND", 
						          ["custrecord_itpm_eq_processingnotes","isempty",""], 
						          "AND", 
						          ["custrecord_itpm_eq_journalentry","anyof","@NONE@"]
						         ],
					});
					
					if((resolutionQueue.runPaged().count != 0) || (expenseQueue.runPaged().count != 0)){
						var msgText = "To prevent errors, please do NOT edit this deduction, or use this deduction for any other process "+
						              "until after processing is completed. This deduction is queued up in the <b>Resolution or Expense Queues</b> "+
						              "and processing is pending.";
						sc.form.addField({
							id	  : 'custpage_warn_message',
							type  : serverWidget.FieldType.INLINEHTML,
							label : 'script'
						}).defaultValue = '<script language="javascript">require(["N/ui/message"],function(msg){msg.create({title:"Please DO NOT modify this Deduction.",message:"'+msgText+'",type: msg.Type.INFORMATION}).show()})</script>'
					}
				}catch(e){
					log.debug(e.name, e.message);
				}
				
				//Get JE with Pending Approval, if there is any open deduction created a JE
				var count = jeSearchToShowDeductionButtons(sc.newRecord.id);
				
				//show button only when user have EDIT or FULL permission on -iTPM Deduction Permission custom record
				if(ddnPermission >= 3 && count == 0){ 
          
					var ddnSplitRecTypeId = scriptObj.getParameter('custscript_itpm_ddn_split_rectypeid');
          
					var btn_split = sc.form.addButton({
						id: 'custpage_itpm_split',
						label: 'Quick Split',
						functionName: 'iTPMsplit(' + sc.newRecord.id + ',"DEFAULT")'
					});
					
					var btn_split_csv = sc.form.addButton({
						id: 'custpage_itpm_split',
						label: 'Split (CSV)',
						functionName: 'iTPMsplit(' + sc.newRecord.id + ',"CSV")'
					});
					
					var btn_quick_split = sc.form.addButton({
						id: 'custpage_itpm_split',
						label: 'Split',
						functionName: 'iTPMsplit(' + sc.newRecord.id + ',"RECORD",' + ddnSplitRecTypeId + ')'
					});
					
					//show button only when user have permissions greater than or equal to CREATE for Deductions and Journal Entry
					if(JE_Permssion >= 2){
						var btn_invoice = sc.form.addButton({
							id: 'custpage_itpm_invoice',
							label: 'Re-Invoice',
							functionName: 'iTPMinvoice(' + sc.newRecord.id + ','+openBalance+')'
						});			
						var customer = sc.newRecord.getValue({fieldId:'custbody_itpm_customer'});
						if(customer){
							var btn_creditmemo = sc.form.addButton({
								id: 'custpage_itpm_match_creditmemo',
								label: 'Match To Credit Memo',
								functionName: 'iTPMcreditmemo(' + sc.newRecord.id + ',' + customer + ')'
							});
						}
						var btn_expense = sc.form.addButton({
							id: 'custpage_itpm_expense',
							label: 'Expense',
							functionName: 'iTPMexpense(' + sc.newRecord.id + ',' + openBalance + ')'
						});
					}
				}

				//show button only when user have CREATE or EDIT or FULL permission on -iTPM Settlement Permission custom record
				if(setPermission >= 2 && count == 0){
					var btn_settlement = sc.form.addButton({
						id: 'custpage_itpm_settlement',
						label: 'Settlement',
						functionName: 'iTPMsettlement(' + sc.newRecord.id + ')'
					});
				}				
				
				log.audit('JE_Permssion, ddnPermission', JE_Permssion+' & '+ddnPermission);  
	    		log.audit('Openbal, itpmAmount and parentDeduction', openBalance+' & '+itpmAmount+' & '+parentDeduction);
				if(JE_Permssion == 4 && ddnPermission == 4 && openBalance == itpmAmount && !parentDeduction){
					var btn_delete = sc.form.addButton({
						id: 'custpage_itpm_delete',
						label: 'Delete',
						functionName: 'iTPMDeleteDeduction(' + sc.newRecord.id + ')'
					});
				}
				
			} else if (eventType == sc.UserEventType.EDIT && runtimeContext == runtime.ContextType.USER_INTERFACE) {
				redirect.toSuitelet({
					scriptId:'customscript_itpm_ddn_createeditsuitelet',
					deploymentId:'customdeploy_itpm_ddn_createeditsuitelet',
					returnExternalUrl: false,
					parameters:{fid:sc.newRecord.id,from:'ddn',type:'edit'}
				}); 
			}
		} catch(ex) {
			log.error('DDN_UE_BeforeLoad', ex.name + '; message: ' + ex.message +'; Id:' + sc.newRecord.id);
			if(ex.name == 'COPY_NOT_ALLOWED'){
				throw new Error(ex.message);
			}else if(ex.name == 'INVALID_EDIT'){
				throw new Error(ex.message);
			}
		}
	}

	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} sc
	 * @param {Record} sc.newRecord - New record
	 * @param {Record} sc.oldRecord - Old record
	 * @param {string} sc.type - Trigger type
	 * @Since 2015.2
	 */
	function beforeSubmit(sc) {
		try{
			if (sc.type == sc.UserEventType.EDIT || sc.type == sc.UserEventType.XEDIT){
				var exc = runtime.executionContext;
				log.debug('UserEventType: ' + sc.type + '; ExecutionContext: ' + exc + '; RecordId: ' + sc.newRecord.id);
				if (exc == runtime.ContextType.USEREVENT || exc == runtime.ContextType.SUITELET || exc == runtime.ContextType.MAP_REDUCE){
					var openBalance = sc.newRecord.getValue({fieldId:'custbody_itpm_ddn_openbal'});
					var status = sc.oldRecord.getValue({fieldId:'transtatus'});
					log.debug('OpenBal: ' + openBalance + '; Status: ' + status);
					openBalance = parseFloat(openBalance);
					log.debug('Parsed Open Balance', openBalance);
					if (openBalance > 0 && status != 'A' && status != 'E'){
						log.debug('Setting status to OPEN (status Ref A)');
						sc.newRecord.setValue({
							fieldId: 'transtatus',
							value: 'A'
						});
						log.debug('OpenBal: ' + openBalance + '; New Status: ' + sc.newRecord.getValue({fieldId: 'transtatus'}));
					} else if (openBalance == 0 && status != 'C'){
						log.debug('Setting status to RESOLVED (status Ref C)');
						sc.newRecord.setValue({
							fieldId: 'transtatus',
							value: 'C'
						});
						log.debug('OpenBal: ' + openBalance + '; New Status: ' + sc.newRecord.getValue({fieldId: 'transtatus'}));
					}
				}
			}
		} catch(ex) {
			log.error(ex.name, ex.message + '; RecordId: ' + sc.newRecord.id);
		}
	}
	
	/**
	 * @param {String} deductionId
	 * 
	 * @return {Number} count
	 * 
	 * @description This function is used to get all the Journal entries under pending approval which were created from any of open deductions.
	 *              For now, it supports for Match To Credit Memo process
	 */
	function jeSearchToShowDeductionButtons(deductionId){
		var jeSearchObj = search.create({
			type: "journalentry",
			filters: [
				["type","anyof","Journal"], 
				"AND",
				["status","anyof","Journal:A"],
				"AND", 
				["custbody_itpm_createdfrom","anyof",deductionId],
				],
				columns: [
					"internalid"
					]
		});
		log.debug('count',jeSearchObj.runPaged().count);
		
		return jeSearchObj.runPaged().count;
	}
	
	return {
		beforeLoad: beforeLoad,
		beforeSubmit:beforeSubmit
	};

});