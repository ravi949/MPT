/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/runtime',
		'N/redirect',
		'N/search',
		'N/record',
		'N/config',
		'N/ui/serverWidget',
		'./iTPM_Module.js'
	],

	function(runtime, redirect, search, record, config, serverWidget, itpm) {

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
			
			//adding the Expense,Re-Invoice,Delete,Match To Creditmemo and SPlit buttons.
			addDeductionButtons(sc);

//			if (eventType == sc.UserEventType.EDIT && runtimeContext == runtime.ContextType.USER_INTERFACE) {
//				redirect.toSuitelet({
//					scriptId:'customscript_itpm_ddn_createeditsuitelet',
//					deploymentId:'customdeploy_itpm_ddn_createeditsuitelet',
//					returnExternalUrl: false,
//					parameters:{fid:sc.newRecord.id,from:'ddn',type:'edit'}
//				}); 
//			}
			
			//Deduction Create or Edit Process
			if(runtime.executionContext == runtime.ContextType.USER_INTERFACE){
				switch(sc.type){
					case sc.UserEventType.CREATE:
						var parentDDN = sc.newRecord.getValue('custbody_itpm_ddn_parentddn');
						var from = sc.request.parameters.from;
						if(!parentDDN){
							deductionCreateOrEdit(sc);
						}else{
							deductionCreateSplit();
						}
					  break;
				}
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
			
			if (sc.type == sc.UserEventType.CREATE || sc.type == sc.UserEventType.EDIT){
				var parentDDN = sc.newRecord.getValue('custbody_itpm_ddn_parentddn');
				log.error('transactions',sc.newRecord.getValue('custbody_itpm_ddn_invoice'));
				if(!parentDDN){
					var tranIds = sc.newRecord.getValue('custbody_itpm_ddn_invoice');
					//getting the invoice or credit memo field values
					var tranSearch = search.lookupFields({
						type:search.Type.TRANSACTION,
						id:tranIds[0],
						columns:['type','entity']
					});
					log.error('tranSearch',tranSearch);
					var tranType = tranSearch.type[0].value;
					var multi = tranIds.length > 1;
					var itpmAmount = 0;

					if(tranType == 'CustInvc'){
						if(multi){
							multiInvoicesList(tranIds[0]).each(function(result){
								tranIds.push(result.getValue({name: "internalid", join: "appliedToTransaction"}));
								itpmAmount += parseFloat(result.getValue({name: "amountremaining", join: "appliedToTransaction"}));
								return true;
							});
						}else{
							itpmAmount = record.load({
								type:record.Type.INVOICE,
								id:tranIds[0]
							}).getValue('amountremainingtotalbox');
						}
					}
					//getting the line value for the deduction
					var subsidiaryID = (itpm.subsidiariesEnabled())? sc.newRecord.getValue('subsidiary') : undefined;
					var prefObj = itpm.getPrefrenceValues(subsidiaryID);

					setDeductionLines(sc.newRecord,{
						tranType : tranType, 
						customerId : tranSearch.entity[0].value,
						tranIds: tranIds,
						multi:multi,
						itpmAmount:itpmAmount,
						expenseId:prefObj.dednExpAccnt
					});
				}else if(parentDDN){
					
				}
			}
		} catch(ex) {
			log.error(ex.name, ex.message + '; RecordId: ' + sc.newRecord.id);
		}
	}
	
	/**
	 * @param {context} scriptContext
	 * @description add the button based on permissions
	 */
	function addDeductionButtons(sc){
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
		var postingPeriodId = sc.newRecord.getValue({fieldId:'postingperiod'});
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
					functionName: 'iTPMsplit('+postingPeriodId + ','+sc.newRecord.id + ',"DEFAULT")'
				});

				var btn_split_csv = sc.form.addButton({
					id: 'custpage_itpm_split',
					label: 'Split (CSV)',
					functionName: 'iTPMsplit('+postingPeriodId + ',' + sc.newRecord.id + ',"CSV")'
				});

				var btn_quick_split = sc.form.addButton({
					id: 'custpage_itpm_split',
					label: 'Split',
					functionName: 'iTPMsplit(' +postingPeriodId + ','+ sc.newRecord.id + ',"RECORD",' + ddnSplitRecTypeId + ')'
				});

				//show button only when user have permissions greater than or equal to CREATE for Deductions and Journal Entry 
				if(JE_Permssion >= 2 ){
					var btn_invoice = sc.form.addButton({
						id: 'custpage_itpm_invoice',
						label: 'Re-Invoice',
						functionName: 'iTPMinvoice(' + sc.newRecord.id + ','+openBalance+',' + postingPeriodId +')'
					});			
					var customer = sc.newRecord.getValue({fieldId:'custbody_itpm_customer'});
					if(customer){
						var btn_creditmemo = sc.form.addButton({
							id: 'custpage_itpm_match_creditmemo',
							label: 'Match To Credit Memo',
							functionName: 'iTPMcreditmemo(' + sc.newRecord.id + ',' + customer + ','+ postingPeriodId+')'
						});
					}
					var btn_expense = sc.form.addButton({
						id: 'custpage_itpm_expense',
						label: 'Expense',
						functionName: 'iTPMexpense('+postingPeriodId + ',' + sc.newRecord.id + ',' + openBalance + ')'
					});
				}
			}

			//show button only when user have CREATE or EDIT or FULL permission on -iTPM Settlement Permission custom record
			if(setPermission >= 2 && count == 0){
				var btn_settlement = sc.form.addButton({
					id: 'custpage_itpm_settlement',
					label: 'Settlement',
					functionName: 'iTPMsettlement(' + sc.newRecord.id + ','+ postingPeriodId+')'
				});
			}				

			log.audit('JE_Permssion, ddnPermission', JE_Permssion+' & '+ddnPermission);  
			log.audit('Openbal, itpmAmount and parentDeduction', openBalance+' & '+itpmAmount+' & '+parentDeduction);
			if(JE_Permssion == 4 && ddnPermission == 4 && openBalance == itpmAmount && !parentDeduction ){
				var btn_delete = sc.form.addButton({
					id: 'custpage_itpm_delete',
					label: 'Delete',
					functionName: 'iTPMDeleteDeduction(' + sc.newRecord.id + ','+ postingPeriodId+')'
				});
			}
		} 
	}
	
	/**
	 * @param {context} scriptContext
	 * @param {string} evenType
	 */
	function deductionCreateOrEdit(sc){
		
		var subsidiariesEnabled = itpm.subsidiariesEnabled();
		var currenciesEnabled = itpm.currenciesEnabled();
		var locationsEnabled = itpm.locationsEnabled();
		var classesEnabled = itpm.classesEnabled();
		var departmentsEnabled = itpm.departmentsEnabled();
		
		var tranSearch;
		var transObj = {'itpm_amount':0,'total_nonpromotional_expense':0};
		var tranSearchCol = ['type'];
		
		if(sc.type == sc.UserEventType.CREATE){
			log.debug('parameters',sc.request.parameters);
			var multi = (sc.request.parameters.multi === "true");
			var tranIds = JSON.parse(decodeURIComponent(sc.request.parameters.tran_ids));			
			log.debug('tranIds',tranIds);
			
			//Created the column for search and push the columns based on subs,cur,loc,dept and class.
			tranSearchCol.push('entity');
			
			if(subsidiariesEnabled){
				tranSearchCol.push('subsidiary');
			}
			if(currenciesEnabled){
				tranSearchCol.push('currency');
			}
			if(locationsEnabled){
				tranSearchCol.push('location');
			}
			if(classesEnabled){
				tranSearchCol.push('class');
			}
			if(departmentsEnabled){
				tranSearchCol.push('department');
			}
			
			//getting the invoice or credit memo field values
			tranSearch = search.lookupFields({
				type:search.Type.TRANSACTION,
				id:tranIds[0],
				columns:tranSearchCol
			});
			log.error('tranSearch',tranSearch);
			var tranType = tranSearch.type[0].value;
			
			//Getting the remaining total amount from Invoice record
			if(tranType == 'CustInvc'){
				if(multi){
					var tranId = tranIds[0];
					tranIds = [];
					multiInvoicesList(tranId).each(function(result){
						tranIds.push(result.getValue({name: "internalid", join: "appliedToTransaction"}));
						transObj['itpm_amount'] += parseFloat(result.getValue({name: "amountremaining", join: "appliedToTransaction"}));
						return true;
					});
				}else{
					transObj['itpm_amount'] = record.load({
		    			type:record.Type.INVOICE,
		    			id:tranIds[0]
		    		}).getValue('amountremainingtotalbox');
				}
			}

			transObj['customer'] = tranSearch.entity[0].value;
			transObj['assginto'] = runtime.getCurrentUser().id;
			transObj['trandate'] = new Date();
			transObj['followup'] = (new Date(new Date().setDate(new Date().getDate()+14)));
			if(subsidiariesEnabled){
				transObj['subsidiary'] = tranSearch.subsidiary[0].value;
			}
			if(currenciesEnabled){
				transObj['currency'] = tranSearch.currency[0].value;
			}
			if(locationsEnabled && tranSearch.location.length > 0){
				transObj['location'] = tranSearch.location[0].value;
			}
			if(classesEnabled && tranSearch.class.length > 0){
				transObj['class'] = tranSearch.class[0].value;
			}
			if(departmentsEnabled && tranSearch.department.lenth > 0){
				transObj['department'] = tranSearch.department[0].value;
			}
			
			log.error('transObj',transObj);
			
			//setting the deduction record values
			var ddnRec = sc.newRecord;
			ddnRec.setValue({
				fieldId:'custbody_itpm_ddn_invoice',
				value:tranIds
			}).setValue({
				fieldId:'custbody_itpm_customer',
				value:transObj['customer']
			}).setValue({
				fieldId:'trandate',
				value:transObj['trandate']
			}).setValue({
				fieldId:'custbody_itpm_ddn_nextaction',
				value:transObj['followup']
			}).setValue({
				fieldId:'custbody_itpm_ddn_assignedto',
				value:transObj['assginto']
			}).setValue({
				fieldId:'custbody_itpm_amount',
				value:transObj['itpm_amount']
			}).setValue({
				fieldId:'custbody_itpm_ddn_openbal',
				value:transObj['itpm_amount']
			}).setValue({
				fieldId:'custbody_itpm_ddn_totexp',
				value:transObj['total_nonpromotional_expense']
			});
			
			if(subsidiariesEnabled){
				ddnRec.setValue({
					fieldId:'subsidiary',
					value:transObj['subsidiary']
				});
			}
			if(currenciesEnabled){
				ddnRec.setValue({
					fieldId:'currency',
					value:transObj['currency']
				});
			}
			if(locationsEnabled && transObj['location']){
				ddnRec.setValue({
					fieldId:'location',
					value:transObj['location']
				});
			}
			if(classesEnabled && transObj['class']){
				ddnRec.setValue({
					fieldId:'class',
					value:transObj['class']
				});
			}
			if(departmentsEnabled && transObj['department']){
				ddnRec.setValue({
					fieldId:'department',
					value:transObj['department']
				});
			}
			
			//getting the line value for the deduction
			var subsidiaryID = (subsidiariesEnabled)? transObj['subsidiary'] : undefined;
			var prefObj = itpm.getPrefrenceValues(subsidiaryID);
			
			setDeductionLines(ddnRec, {
				tranType : tranType, 
				customerId : transObj['customer'],
				tranIds: tranIds,
				multi:multi,
				itpmAmount:transObj['itpm_amount'],
				expenseId:prefObj.dednExpAccnt
			});
		}
	}
	
	/**
     * @param {String} invId
     * 
     * @return {Integer} count
     */
    function multiInvoicesList(invId){
    	try{
    		var custPayId;
        	//log.debug('invId', invId);
        	var invoiceSearchObj = search.create({
        		type: search.Type.INVOICE,
        		filters: [
        			["internalid","anyof",invId], 
        			"AND", 
        			["applyingtransaction","noneof","@NONE@"], 
        			"AND", 
        			["applyingtransaction.type","anyof","CustPymt"], 
        			"AND", 
        			["mainline","is","T"], 
        			"AND", 
        			["status","noneof","CustInvc:B"]
        			],
        		columns: [
        			search.createColumn({
        				name: "type",
        				join: "applyingTransaction"
        			}),
        			search.createColumn({
        				name: "trandate",
        				join: "applyingTransaction",
        				sort: search.Sort.DESC
        			}),
        			search.createColumn({
        				name: "internalid",
        				join: "applyingTransaction",
        				sort: search.Sort.DESC
        			})
        		]
        	});

        	invoiceSearchObj.run().each(function(result){
        		custPayId = result.getValue({name:'internalid', join:'applyingTransaction'});
        	});
        	//log.debug('custPayId', custPayId);
        	
        	var customerpaymentSearchObj = search.create({
        		type: "customerpayment",
        		filters: [
        			["type","anyof","CustPymt"], 
        			"AND", 
        			["internalid","anyof",custPayId], 
        			"AND", 
        			["mainline","is","F"],
        			"AND", 
        			["appliedtotransaction.status","anyof","CustInvc:A"]
        			],
        		columns: [
        			search.createColumn({
        				name: "internalid",
        				sort: search.Sort.ASC
        			}),
        			search.createColumn({
        				name: "type",
        				join: "appliedToTransaction"
        			}),
        			search.createColumn({
        				name: "trandate",
       					join: "appliedToTransaction"
       				}),
       				search.createColumn({
       					name: "internalid",
       					join: "appliedToTransaction"
       				}),
       				search.createColumn({
       					name: "amount",
       					join: "appliedToTransaction"
       				}),
       				search.createColumn({
       					name: "amountremaining",
       					join: "appliedToTransaction"
       				})
       			]
        	});

        	return customerpaymentSearchObj.run();
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }
    
    /**
     * @param {record} ddnRec
     * @param {object} obj
     */
    function setDeductionLines(ddnRec, obj){
    	if(obj.tranType == 'CustInvc'){
    		var defaultRecvAccnt = record.load({
				type:record.Type.CUSTOMER,
				id:obj.customerId
			}).getValue('receivablesaccount');
			
			var recievableAccntId = search.lookupFields({
				type:search.Type.INVOICE,
				id:obj.tranIds[0],
				columns:['internalid','account']
			})['account'][0].value; //Conflict resolved

			lineMemo = (obj.multi)?('Deduction applied on Invoices '+obj.tranIds.join(',')):('Deduction applied on Invoice #'+obj.tranIds.join(','));

			if(defaultRecvAccnt == "-10"){
				defaultRecvAccnt = config.load({
					type:config.Type.ACCOUNTING_PREFERENCES
				}).getValue('ARACCOUNT');
				defaultRecvAccnt = (defaultRecvAccnt)?defaultRecvAccnt : recievableAccntId;
			}
			
			var receivbaleAccntsList = [{
				accountId:defaultRecvAccnt,
				amount:obj.itpmAmount,
				fid:'credit',
				memo:lineMemo
			},{
				accountId:obj.expenseId,
				amount:obj.itpmAmount,
				fid:'debit',
				memo:lineMemo
			}];
    	}
    	
    	log.error('receivbaleAccntsList',receivbaleAccntsList);
    	var lineCount = ddnRec.getLineCount('line');
    	for(var i = lineCount-1; i >= 0 ; i++){
    		ddnRec.removeLine({
    			sublistId:'line',
    			line:i
    		});
    	}
    	
    	receivbaleAccntsList.forEach(function(e,index){
			ddnRec.setSublistValue({
				sublistId:'line',
				fieldId:'account',
				value:e.accountId,
				line:index
			}).setSublistValue({
				sublistId:'line',
				fieldId:e.fid,
				value:e.amount,
				line:index
			}).setSublistValue({
				sublistId:'line',
				fieldId:'memo',
				value:e.memo,
				line:index
			}).setSublistValue({
				sublistId:'line',
				fieldId:'entity',
				value:obj.customerId,
				line:index
			});
		});
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

