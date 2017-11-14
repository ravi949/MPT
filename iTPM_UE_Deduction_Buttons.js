/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * if parent deduction amount is less than new deduction amount then.
 * split the deduction into two and creating the two journal entries for each deduction and changed the parent deduction status to resolved.
 */
define(['N/ui/serverWidget',
		'N/runtime',
		'N/redirect'
		],

function(widget, runtime, redirect) {

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
					name:'copy deduction',
					message:'Copying a deduction is not allowed.'
				};
			}
			
			var openBalance = sc.newRecord.getValue({fieldId:'custbody_itpm_ddn_openbal'}),
				status = sc.newRecord.getValue({fieldId:'transtatus'}),
//				clientScriptPath = runtime.getCurrentScript().getParameter({name:'custscript_itpm_ue_ddn_cspath'}),
				clientScriptPath = './iTPM_Attach_Deduction_Buttons.js',
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
				var disputed = sc.newRecord.getValue('custbody_itpm_ddn_disputed');
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
				
				var customer = sc.newRecord.getValue({fieldId:'custbody_itpm_customer'});
				
				if(customer){
					var btn_creditmemo = sc.form.addButton({
						id: 'custpage_itpm_match_creditmemo',
						label: 'Match to Credit Memo',
						functionName: 'iTPMcreditmemo(' + sc.newRecord.id + ',' + customer + ')'
					});
				}
				
				if(disputed){
					var btn_invoice = sc.form.addButton({
						id: 'custpage_itpm_invoice',
						label: 'Re-Invoice',
						functionName: 'iTPMinvoice(' + sc.newRecord.id + ')'
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
			if(ex.name == 'copy deduction'){
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
        		if (exc == runtime.ContextType.USEREVENT || exc == runtime.ContextType.SUITELET){
        			var openBalance = sc.newRecord.getValue({fieldId:'custbody_itpm_ddn_openbal'});
        			var status = sc.oldRecord.getValue({fieldId:'transtatus'});
        			log.debug('OpenBal: ' + openBalance + '; Status: ' + status);
        			openBalance = parseFloat(openBalance);
        			log.debug('Parsed Open Balance', openBalance);
    				if (openBalance > 0 && status != 'A'){
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

	return {
		beforeLoad: beforeLoad,
		beforeSubmit:beforeSubmit
	};

});
