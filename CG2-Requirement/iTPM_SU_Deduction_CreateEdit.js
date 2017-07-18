/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Front-end suitelet script for creating and editing iTPM Deduction records.
 */
define(['N/ui/serverWidget','N/record','N/search','N/runtime','N/redirect','N/config','N/format'],

function(serverWidget,record,search,runtime,redirect,config,format) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
	function onRequest(context) {
		try{
			var request = context.request,response = context.response,params = request.parameters;
			var subsidiaryExists = runtime.isFeatureInEffect('subsidiaries');
			var currencyExists = runtime.isFeatureInEffect('multicurrency');
			
			if(request.method == 'GET'){

				//validation on passed id
				if(params.type != 'edit'){
					var statusObj = checkWhetherIdValidOrNot(params.fid,params.from);
					if(!statusObj.success){
						throw Error(statusObj.errormessage);
					}
				}
				
				if(params.from == 'inv'){
					var invoiceRec = record.load({
						type:record.Type.INVOICE,
						id:params.fid
					});
					var invoiceId = invoiceRec.id;
					var invoiceText = invoiceRec.getText('tranid');
					var customerId = invoiceRec.getValue('entity');
					var customerEntity = invoiceRec.getText('entity');
					var invAmount = invoiceRec.getValue('amountremainingtotalbox');
					
				}else if(params.from == 'ddn'){
					var deductionRec = record.load({
						type:'customtransaction_itpm_deduction',
						id:params.fid
					});

					//taking the values from the parent deduction record.
					var originalDddno = deductionRec.getValue('custbody_itpm_ddn_originalddn');
					var deductnNo = deductionRec.getValue('tranid');
					var invoiceId = deductionRec.getValue('custbody_itpm_ddn_invoice');
					var invoiceText = deductionRec.getText('custbody_itpm_ddn_invoice');
					var customerId = deductionRec.getValue('custbody_itpm_ddn_customer'); 
					var customerEntity = deductionRec.getText('custbody_itpm_ddn_customer'); 
					var invAmount = deductionRec.getValue('custbody_itpm_ddn_amount');
				}
				
				//reading the values same intenralid values from the deduciton or invoice record.
				var recObj = (params.from == 'ddn')?deductionRec:invoiceRec;
				var invclass = recObj.getValue('class');
				var invdept = recObj.getValue('department');
				var invlocation = recObj.getValue('location');
				var subsid = recObj.getValue('subsidiary');
				var currentUserId = (params.type == 'edit')?recObj.getValue('custbody_itpm_ddn_assignedto'):runtime.getCurrentUser().id;
				var totalSettlements = 0;
				var customerRec = record.load({
					type:record.Type.CUSTOMER,
					id:customerId
				});
				var defaultRecvAccnt = customerRec.getValue('receivablesaccount');
				var customerParentId = customerRec.getValue('parent');
				
				//Deduction form creation
				var ddnForm = serverWidget.createForm({
					title: '- ITPM Deduction'
				});

				/*-------------------Set the Parent Deduction value----------*/
				ddnForm.addField({
					id : 'custom_parent_recid',
					type : serverWidget.FieldType.INTEGER,
					label:'Parent Record id'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				}).defaultValue = (params.type != 'edit')?params.fid:deductionRec.id;  

				ddnForm.addField({
					id : 'custom_cfrom',
					type : serverWidget.FieldType.TEXT,
					label:'Created From'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				}).defaultValue = params.from;
				
				ddnForm.addField({
					id : 'custom_user_eventype',
					type : serverWidget.FieldType.TEXT,
					label:'Record Event Type'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				}).defaultValue = params.type;  
				

				/*-----------------------------end--------------------------*/

				/*--------------Default Account Recivable------------------*/
				ddnForm.addField({
					id : 'custom_def_accnt_recv',
					type : serverWidget.FieldType.TEXT,
					label:'Date'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				}).defaultValue = defaultRecvAccnt
				/*-------------------------End-------------------------------*/


				/*------PRIMARY INFORMATION start-----*/

				ddnForm.addFieldGroup({
					id:'custom_primry_information',
					label:'Primary Information'
				});

				//setting the Entry no value
				ddnForm.addField({
					id : 'custom_tranid',
					type : serverWidget.FieldType.TEXT,
					label:'ENTRY NO.',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).defaultValue =(params.type != 'edit')?"To Be Generated":recObj.getValue('tranid');
				
				//setting the INVOICE Value
				var invoice = ddnForm.addField({
					id : 'custom_itpm_ddn_invoice',
					type : serverWidget.FieldType.SELECT,
					label:'Invoice',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});

				invoice.addSelectOption({
					value : invoiceId,
					text : invoiceText,
					isSelected:true
				});

				//setting the ORIGINAL NUMBER value
				var originnoField = ddnForm.addField({
					id : 'custom_itpm_ddn_originalddn',
					type : serverWidget.FieldType.SELECT,
					label:'ORIGINAL DEDUCTION',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});
				
				if(originalDddno != ''){
					originnoField.addSelectOption({
						value:(params.from =='inv')?' ':deductionRec.getValue('custbody_itpm_ddn_originalddn'),
						text:(params.from =='inv')?' ':deductionRec.getText('custbody_itpm_ddn_originalddn')
					})
				}
				
				//parent deduciton field
				var parentDDNField = ddnForm.addField({
					id : 'custom_itpm_ddn_parentddn',
					type : serverWidget.FieldType.SELECT,
					label:'Parent DEDUCTION',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});

				//setting the OTHER REFERENCE CODE value
				ddnForm.addField({
					id : 'custom_itpm_ddn_otherrefcode',
					type : serverWidget.FieldType.TEXT,
					label:'OTHER REFERENCE CODE',
					container:'custom_primry_information'
				}).defaultValue = (params.from == 'inv' || params.type != 'edit')?'':deductionRec.getValue('custbody_itpm_ddn_otherrefcode');

				
				if(customerParentId != ''){
					//setting the parent value from the customer
					var customerParent = ddnForm.addField({
						id : 'custom_parent',
						type : serverWidget.FieldType.SELECT,
						label:'Parent',
						container:'custom_primry_information'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.HIDDEN
					});

					customerParent.addSelectOption({
						value : customerParentId,
						text : customerRec.getText('parent'),
						isSelected:true
					});
				}	

				//setting the todate
				ddnForm.addField({
					id : 'custom_trandate',
					type : serverWidget.FieldType.DATE,
					label:'Date',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				}).defaultValue = format.format({
					value:new Date(),
					type: format.Type.DATE
				});

				//setting the STATUS to open
				var status = ddnForm.addField({
					id : 'custom_status',
					type : serverWidget.FieldType.SELECT,
					label:'Status',
					container:'custom_primry_information'
				});
				status.updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});

				status.addSelectOption({
					value : (params.type != 'edit')?'A':deductionRec.getValue('transtatus'),
					text : (params.type != 'edit')?'Open':deductionRec.getText('transtatus'),
					isSelected:true
				});


				//setting the CUSTOMER Value
				var customer = ddnForm.addField({
					id : 'custom_customer',
					type : serverWidget.FieldType.SELECT,
					label:'Customer',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				})

				customer.addSelectOption({
					text:customerEntity,
					value:customerId,
					isSelected:true
				});

				//setting the Disputed value
				ddnForm.addField({
					id : 'custom_itpm_ddn_disputed',
					type : serverWidget.FieldType.CHECKBOX,
					label:'DISPUTED?',
					container:'custom_primry_information'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				}).defaultValue = (params.type != 'edit')?'F':deductionRec.getValue('custbody_itpm_ddn_disputed')?'T':'F';
				
				//iTPM Applied To Transaction field 				
				var aplydToTrans = ddnForm.addField({
					id : 'custom_itpm_ddn_appliedto',
					type : serverWidget.FieldType.SELECT,
					label:'APPLIED TO',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});
				
				
				//If deduction is edited then we are setting the parent and apply to deduction values
				if(params.type == 'edit' && deductionRec.getValue('custbody_itpm_set_deduction') != ''){
					var selectionObj = {
							value:deductionRec.getValue('custbody_itpm_set_deduction'),
							text:deductionRec.getText('custbody_itpm_set_deduction')
					};
					aplydToTrans.addSelectOption(selectionObj);
					parentDDNField.addSelectOption(selectionObj);
				}
				
				//If deduction is split then we are setting the parent and apply to deduction values
				if(params.type != 'edit' && params.from == 'ddn'){
					var deductionText = record.load({type:'customtransaction_itpm_deduction',id:params.fid}).getText('tranid');
					var selectionObj = {
							value:params.fid,
							text:'- iTPM Deduction #'+deductionText
					};
					parentDDNField.addSelectOption(selectionObj);
					aplydToTrans.addSelectOption(selectionObj);
				}
				
				/*-----PRIMARY INFORMATION end-----*/

				/*------CLASSIFICATION start ------*/
				ddnForm.addFieldGroup({
					id : 'custom_classification',
					label : 'Classification'
				});

				//if subsidiary feature in effect
				if(subsidiaryExists){
					//setting the SUBSIDIARY Value
					var subsidiary = ddnForm.addField({
						id : 'custom_subsidiary',
						type : serverWidget.FieldType.SELECT,
						label:'Subsidiary',
						container:'custom_classification'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.DISABLED
					});

					subsidiary.addSelectOption({
						value : subsid,
						text : recObj.getText('subsidiary'),
						isSelected:true
					});
				}

				//if multicurrnecy feature in effect
				if(currencyExists){
					//setting the CURRENCY value
					var currency = ddnForm.addField({
						id : 'custom_currency',
						type : serverWidget.FieldType.SELECT,
						label:'Currency',
						container:'custom_classification'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.DISABLED
					});

					currency.addSelectOption({
						value : recObj.getValue('currency'),
						text : recObj.getText('currency'),
						isSelected:true
					});
				}		
				
				
				//setting the LOCATION value
				var location = ddnForm.addField({
					id : 'custom_location',
					type : serverWidget.FieldType.SELECT,
					label:'Location',
					container:'custom_classification'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});

				location.addSelectOption({
					value:' ',
					text:' '
				});

				getList(subsid,'location').run().each(function(e){
					location.addSelectOption({
						value:e.getValue('internalid'),
						text:e.getValue('name'),
						isSelected:(invlocation == e.getValue('internalid'))
					})
					return true;
				});


				//setting the DEPARTMENT value
				var dept = ddnForm.addField({
					id : 'custom_department',
					type : serverWidget.FieldType.SELECT,
					label:'Department',
					container:'custom_classification'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});

				dept.addSelectOption({
					value:' ',
					text:' '
				});

				getList(subsid,'dept').run().each(function(e){
					dept.addSelectOption({
						value:e.getValue('internalid'),
						text:e.getValue('name'),
						isSelected:(invdept == e.getValue('internalid'))
					})
					return true;
				});

				//setting the CLASS value
				var classField = ddnForm.addField({
					id : 'custom_class',
					type : serverWidget.FieldType.SELECT,
					label:'Class',
					container:'custom_classification'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});

				classField.addSelectOption({
					value :' ',
					text : ' '
				});

				getList(subsid,'class').run().each(function(e){
					classField.addSelectOption({
						value :e.getValue('internalid'),
						text : e.getValue('name'),
						isSelected:(invclass == e.getValue('internalid'))
					});
					return true;
				});

				/*------CLASSIFICATION end --------*/
				
				/*------- TASK DETAIL start --------*/
				
				ddnForm.addFieldGroup({
					id : 'custom_itpm_ddn_taskdetails',
					label : 'Task Detail'
				});

				//setting the employees list to this select field
				var assignto = ddnForm.addField({
					id : 'custom_itpm_ddn_assignedto',
					type : serverWidget.FieldType.SELECT,
					label:'Assigned To',
					container:'custom_itpm_ddn_taskdetails'
				});

				assignto.isMandatory = true;
				getEmployees(subsid).run().each(function(e){
					assignto.addSelectOption({
						value :e.getValue('internalid'),
						text : e.getValue('entityid'),
						isSelected:currentUserId == e.getValue('internalid')
					});
					return true;
				});

				//setting the DUE DATE/FOLLOW UP
				//setting the 2 week date from today
				var twoWeekDate = new Date(new Date().setDate(new Date().getDate()+14));
				var followupDate = ddnForm.addField({
					id : 'custom_itpm_ddn_nextaction',
					type : serverWidget.FieldType.DATE,
					label:'Due Date',
					container:'custom_itpm_ddn_taskdetails'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});
				followupDate.isMandatory = true;
				followupDate.defaultValue = format.format({
					value:twoWeekDate,
					type: format.Type.DATE
				});
				
				//setting the MEMO
				ddnForm.addField({
					id : 'custom_memo',
					type : serverWidget.FieldType.TEXT,
					label:'Memo',
					container:'custom_itpm_ddn_taskdetails'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				}).defaultValue = (params.from == 'inv' || params.type != 'edit')?' ':deductionRec.getValue('memo');

				/*------- TASK DETAIL End --------*/

				/*------- TRANSACTION DETAIL start --------*/
				
				ddnForm.addFieldGroup({
					id : 'custom_itpm_ddn_transdetails',
					label : 'Transaction Detail'
				});
				
				//setting the AMOUNT
				var amountField = ddnForm.addField({
					id : 'custom_itpm_ddn_amount',
					type : serverWidget.FieldType.CURRENCY,
					label:'Amount',
					container:'custom_itpm_ddn_transdetails'
				});
				amountField.updateDisplayType({
					displayType : (params.from =='inv'||params.type == 'edit')?serverWidget.FieldDisplayType.DISABLED:serverWidget.FieldDisplayType.NORMAL
				}).defaultValue = invAmount;

				amountField.isMandatory = true;

				//setting the TOTAL SETTLEMENT value
				ddnForm.addField({
					id : 'custom_total_settlements',
					type : serverWidget.FieldType.INTEGER,
					label:'Total Settlements',
					container:'custom_itpm_ddn_transdetails'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).defaultValue = (params.from == 'inv')?'':0;				

				//setting the OPEN BALANCE value
				ddnForm.addField({
					id : 'custom_itpm_ddn_openbal',
					type : serverWidget.FieldType.CURRENCY,
					label:'Open Balance',
					container:'custom_itpm_ddn_transdetails'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				}).defaultValue = invAmount - totalSettlements;

				//setting the TOTAL EXPENSES value
				ddnForm.addField({
					id : 'custom_itpm_ddn_totalexpense',
					type : serverWidget.FieldType.CURRENCY,
					label:'TOTAL EXPENSES',
					container:'custom_itpm_ddn_transdetails'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).defaultValue = 0;
				/*------- TRANSACTION DETAIL End --------*/

				ddnForm.addSubmitButton({label:'Submit'});
				ddnForm.addButton({label:'Cancel',id : 'custom_itpm_cancelbtn',functionName:"redirectToBack"})
				ddnForm.clientScriptModulePath =  './iTPM_Attach_Deduction_ClientMethods.js';
				//ddnForm.clientScriptFileId = runtime.getCurrentScript().getParameter({name:'custscript_itpm_su_ddn_csfileid'});
				response.writePage(ddnForm);

			}else if(request.method == 'POST'){
				var originalno = params['custom_itpm_ddn_originalddn'],
				otherrefno = params['custom_itpm_ddn_otherrefcode'],
				invoiceno = params['custom_itpm_ddn_invoice'],
				invoiceLookup =  search.lookupFields({
					type: search.Type.INVOICE,
					id: invoiceno,
					columns: ['tranid']
				}),
				customerno = params['custom_customer'],
				parentno = params['custom_parent'],
				classno = params['custom_class'],
				deptno = params['custom_department'],
				locationno = params['custom_location'],
				assignto = params['custom_itpm_ddn_assignedto'],
				amount = params['custom_itpm_ddn_amount'].replace(/,/g,''),
				totalsettlement = params['custom_total_settlements'],
				disputed = params['custom_itpm_ddn_disputed'],
				openbal = params['custom_itpm_ddn_openbal'],
				followup = params['custom_itpm_ddn_nextaction'],
				memo = params['custom_memo'],
				status = params['custom_status'],
				defaultRecvAccnt = params['custom_def_accnt_recv'],
				deductionRec = null;

				
				if(params['custom_user_eventype'] != 'edit'){
					deductionRec = record.create({
						type:'customtransaction_itpm_deduction',
						isDynamic:true
					})
				}else{
					deductionRec = record.load({
						type:'customtransaction_itpm_deduction',
						id:params['custom_parent_recid'],
						isDynamic:true
					})
				}
				

				deductionRec.setValue({
					fieldId:'custbody_itpm_ddn_otherrefcode',
					value:otherrefno,
					ignoreFieldChange:true
				}).setValue({
					fieldId:'memo',
					value:memo,
					ignoreFieldChange:true
				}).setValue({
					fieldId:'custbody_itpm_ddn_amount',
					value:amount,
					ignoreFieldChange:true
				}).setValue({
					fieldId:'custbody_itpm_ddn_disputed',
					value:(disputed == "T")?true:false,
					ignoreFieldChange:true
				});
				
				if(params['custom_user_eventype'] != 'edit'){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_openbal',
						value:amount,
						ignoreFieldChange:true
					});
					
					if(params['custom_cfrom'] == 'ddn'){
						deductionRec.setValue({
							fieldId:'custbody_itpm_ddn_parentddn',
							value:params['custom_parent_recid'],
							ignoreFieldChange:true
						}).setValue({
							fieldId:'custbody_itpm_set_deduction',
							value:params['custom_parent_recid'],
							ignoreFieldChange:true
						});
					}
				}

				if(originalno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_originalddn',
						value:originalno,
						ignoreFieldChange:true
					})
				}
				
				if(invoiceno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_invoice',
						value:invoiceno,
						ignoreFieldChange:true
					})
				}
				if(customerno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_customer',
						value:customerno,
						ignoreFieldChange:true
					})
				}
				if(parentno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_custparent',
						value:parentno,
						ignoreFieldChange:true
					})
				}
				
				if(subsidiaryExists){
					deductionRec.setValue({
						fieldId:'subsidiary',
						value:params['custom_subsidiary'],
						ignoreFieldChange:true
					})
				}
				
				if(currencyExists){
					deductionRec.setValue({
						fieldId:'currency',
						value:params['custom_currency'],
						ignoreFieldChange:true
					});
				}

				if(classno != ''){
					deductionRec.setValue({
						fieldId:'class',
						value:classno,
						ignoreFieldChange:true
					})
				}

				if(deptno != ''){
					deductionRec.setValue({
						fieldId:'location',
						value:locationno,
						ignoreFieldChange:true
					})
				}

				if(locationno != ''){
					deductionRec.setValue({
						fieldId:'department',
						value:deptno,
						ignoreFieldChange:true
					})
				}

				if(assignto != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_assignedto',
						value:assignto,
						ignoreFieldChange:true
					})
				}

				if(totalsettlement != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_totsett',
						value:totalsettlement,
						ignoreFieldChange:true
					})
				}

				if(followup != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_nextaction',
						value:new Date(followup),
						ignoreFieldChange:true
					})
				}


				if(status != ''){
					deductionRec.setValue({
						fieldId:'transtatus',
						value:status,
						ignoreFieldChange:true
					});
				}

				if(params['custom_user_eventype'] != 'edit'){
					//getting the line value for the deduction
					var expenseId,lineMemo,createdFrom = params['custom_cfrom'],
					receivbaleAccntsList;
					if(createdFrom == 'inv'){
						var recieveableAccnts = search.create({
							type:search.Type.INVOICE,
							columns:['internalid','account.type','account.name','account.internalid'],
							filters:[['internalid','anyof',invoiceno],'and',['account.type','anyof',["AcctRec","Expense"]]]
						});
						
						lineMemo = 'Deduction applied on Invoice #'+invoiceLookup.tranid;
						
						var recievableAccntId;
						recieveableAccnts.run().each(function(e){
							if(e.getValue({name:'type',join:'account'}) == 'AcctRec')
								recievableAccntId = e.getValue({name:'internalid',join:'account'});
							return true
						});

						var configObj = config.load({
							type:config.Type.ACCOUNTING_PREFERENCES
						});
						
						var itpmPreferenceSearch = search.create({
							type:'customrecord_itpm_preferences',
							columns:['custrecord_itpm_pref_ddnaccount'],
							filters:[]
						}).run().getRange(0,1);

						expenseId = itpmPreferenceSearch[0].getValue('custrecord_itpm_pref_ddnaccount');

						if(defaultRecvAccnt == "-10"){
							defaultRecvAccnt = configObj.getValue('ARACCOUNT');	
							defaultRecvAccnt = (defaultRecvAccnt == '')?recievableAccntId:defaultRecvAccnt;
						}

						receivbaleAccntsList = [{accountId:defaultRecvAccnt,amount:amount,fid:'credit',memo:lineMemo},{accountId:expenseId,amount:amount,fid:'debit',memo:lineMemo}];

					}else if(createdFrom == 'ddn'){
						var dedRec = record.load({
							type:'customtransaction_itpm_deduction',
							id:originalno
						});					
						lineMemo = 'Deduction split from Deduction #'+dedRec.getText({fieldId:'tranid'});
						expenseId = dedRec.getSublistValue({sublistId:'line',fieldId:'account',line:1});

						receivbaleAccntsList = [{accountId:expenseId,amount:amount,fid:'credit',memo:lineMemo},{accountId:expenseId,amount:amount,fid:'debit',memo:lineMemo}];
					}

					//adding the memo value in deduction record
					deductionRec.setValue({
						fieldId:'memo',
						value:(memo!='')?memo:lineMemo,
						ignoreFieldChange:true
					});
					
					receivbaleAccntsList.forEach(function(e){
						deductionRec.selectNewLine({sublistId: 'line'});
						deductionRec.setCurrentSublistValue({
							sublistId:'line',
							fieldId:'account',
							value:e.accountId
						}).setCurrentSublistValue({
							sublistId:'line',
							fieldId:e.fid,
							value:e.amount
						}).setCurrentSublistValue({
							sublistId:'line',
							fieldId:'memo',
							value:e.memo
						})
						if(e.fid == 'credit'){
							deductionRec.setCurrentSublistValue({
								sublistId:'line',
								fieldId:'entity',
								value:customerno
							});
						}
						deductionRec.commitLine({
							sublistId: 'line'
						});

					});

					var deductionId = deductionRec.save({enableSourcing:false,ignoreMandatoryFields:true});
					
					//creating the other deduction record when click the split
					if(deductionId && createdFrom == 'ddn'){
						var parentRec = record.load({type:'customtransaction_itpm_deduction',id:params['custom_parent_recid']});
						var parentDdnId = params['custom_itpm_ddn_parentddn'];
						var parentDdnAmount = parseFloat(parentRec.getValue('custbody_itpm_ddn_amount'));
						var newDdnAmount = parseFloat(amount);
						if(parentDdnAmount > newDdnAmount){
							createAutomatedDeductionRecord(parentRec,parentDdnAmount - newDdnAmount,expenseId);
						}
						
						//loading the parent record again why because parentDeductionRec already save 
						//thats why we are loading the record newly	
						parentRec.setValue({
							fieldId:'custbody_itpm_ddn_openbal',
							value:0 
						}).setValue({
							fieldId:'transtatus',
							value:'C'  //changed the parent status to Resolved
						}).save({
							enableSourcing: false,
							ignoreMandatoryFields : true
						});
						
					}
					
					//when a deduction is created from invoice then the invoice is converted into payment fulfillment
					if(createdFrom == 'inv'){
						var deductionCreatedRec = record.load({type:'customtransaction_itpm_deduction',id:deductionId}),
						invId = params['custom_itpm_ddn_invoice'],
						invTransformRec = record.transform({
							fromType: record.Type.INVOICE,
							fromId: invId,
							toType: record.Type.CUSTOMER_PAYMENT
						}),
						transFormRecLineCount = invTransformRec.getLineCount('credit');

						invTransformRec.setValue({
							fieldId:'class',
							value:classno
						}).setValue({
							fieldId:'location',
							value:locationno
						}).setValue({
							fieldId:'department',
							value:deptno
						}).setValue({
							fieldId:'memo',
							value:'Deduction '+deductionCreatedRec.getValue('tranid')+' applied to Invoice '+invoiceLookup.tranid
						});

						deductionId = deductionCreatedRec.setValue({
							fieldId:'custbody_itpm_ddn_originalddn',
							value:deductionId
						}).save({enableSourcing:false,ignoreMandatoryFields:true});


						for(var v =0; v < transFormRecLineCount;v++){
							var ddId = invTransformRec.getSublistValue({
								sublistId: 'credit',
								fieldId: 'internalid',
								line: v
							});

							if(deductionId == ddId){
								invTransformRec.setSublistValue({
									sublistId: 'credit',
									fieldId: 'apply',
									line: v,
									value: true
								});
								var lastId =invTransformRec.save({
									enableSourcing: false,
									ignoreMandatoryFields: true
								});
								log.debug('invTransformRecId ',lastId );
							}
						}
					}
				}else{
					var deductionId = deductionRec.save({enableSourcing:false,ignoreMandatoryFields:true});
				}
				
				redirect.toRecord({
					id : deductionId,
					type : 'customtransaction_itpm_deduction', 
					isEditMode:false
				});
			}
		}catch(e){
			if(e.message == 'you cannot make a deduction from this invoice'){
				throw Error(e.message);
			}else if(e.message == 'you cannot make a deduction from this deduction'){
				throw Error(e.message);
			}else if(e.message == 'invalid parameters'){
				throw Error(e.message);
			}else{
				var recType = (params.from == 'inv')?'Invoice':'iTPM Deduction';
				var eventType = (params.type != 'edit')?'create':'edit';
				log.error(e.name,'record type = '+recType+', record id='+params.fid+', event type = '+eventType+' message='+e);
			}
		}
	}

	
	//creating the automated Deduction record
	function createAutomatedDeductionRecord(parentDdnRec,remainingAmount,ddnExpnseAccount){
		remainingAmount = remainingAmount.toFixed(2);
		//copying the previous child into the new child deduction record
		var copiedDeductionRec = record.copy({
			type:'customtransaction_itpm_deduction',
			id:parentDdnRec.id //scriptContext.newRecord.id
		});

		//setting the applied to and parent deduction values and other main values.
		copiedDeductionRec.setValue({
			fieldId:'custbody_itpm_ddn_parentddn',
			value:parentDdnRec.id
		}).setValue({
			fieldId:'custbody_itpm_set_deduction',
			value:parentDdnRec.id
		}).setValue({
			fieldId:'custbody_itpm_ddn_otherrefcode',
			value:''
		}).setValue({
			fieldId:'custbody_itpm_ddn_disputed',
			value:false //when split the deduction if first one checked second set to false
		}).setValue({
			fieldId:'custbody_itpm_ddn_amount',
			value:remainingAmount  //setting the remaining the amount value to the Amount field
		}).setValue({
			fieldId:'custbody_itpm_ddn_openbal',
			value:remainingAmount
		}).setValue({
			fieldId:'memo',
			value:'Deduction split from Deduction #'+parentDdnRec.getText('tranid')
		});
		log.debug('remaining amount',remainingAmount)
		//setting the line values to copied deduction record
		var lineCount = copiedDeductionRec.getLineCount('line');
		for(var i = 0;i<lineCount;i++){
			copiedDeductionRec.setSublistValue({
				sublistId:'line',
				fieldId:'account',
				value:ddnExpnseAccount,
				line:i
			}).setSublistValue({
				sublistId:'line',
				fieldId:(i==0)?'credit':'debit',
				value:remainingAmount,
				line:i
			}).setSublistValue({
				sublistId:'line',
				fieldId:'memo',
				value:'Deduction split from Deduction #'+parentDdnRec.getText('tranid'),
				line:i
			});
		}

		//save the new child deduction record
		var newChildDedid = copiedDeductionRec.save({enableSourcing:false,ignoreMandatoryFields:true});		
	}
	
	
	
	
    //getting the Class,Department and Location list based on subsidiary.
    function getList(subid,rectype){
    	switch(rectype){
    	case 'class':
    		rectype = search.Type.CLASSIFICATION;
    		break;
    	case 'dept':
    		rectype = search.Type.DEPARTMENT;
    		break;
    	case 'location':
    		rectype = search.Type.LOCATION;
    		break;
    	}
    	
    	return search.create({
    		type:rectype,
    		columns:['internalid','name'],
    		filters:[['isinactive','is',false],'and',['subsidiary','anyof',subid]]
    	});
    }
    
    //getting the Employees list based on subsidiary.
    function getEmployees(subid){
    	return search.create({
    		type:search.Type.EMPLOYEE,
    		columns:['internalid','entityid'],
    		filters:[['isinactive','is',false],'and',['subsidiary','anyof',subid]]
    	});
    }
    
    
    //check id is equal to deduction or invoice
    function checkWhetherIdValidOrNot(id,from){
    	try{
    		var loadedRec;
    		if(from == 'inv'){
    			loadedRec = record.load({
    				type:record.Type.INVOICE,
    				id:id
    			});

    			var invConditionsMet = search.create({
    				type:search.Type.INVOICE,
    				columns:['internalid'],
    				filters:[
    				         ['internalid','anyof',id],'and',
    				         ['applyingtransaction','noneof','none'],'and',
    				         ['applyingtransaction.type','anyof','CustPymt'],'and',
    				         ['mainline','is','T'],'and',
    				         ['status','noneof','CustInvc:B']
    				         ] 
    			}).run().getRange(0,5).length>0;

    			//invoice dont have any ITPM DEDUCTION records
    			var invoiceDeductionsAreEmpty = search.create({
    				type:'customtransaction_itpm_deduction',
    				columns:['internalid'],
    				filters:[['custbody_itpm_ddn_invoice','anyof',id],'and',
    				         ['status','anyof',["Custom100:A","Custom100:B"]]]
    			}).run().getRange(0,5).length == 0;

    			if(invConditionsMet && invoiceDeductionsAreEmpty)
    				return {success:true}
    			else
    				return {success:false,errormessage:'you cannot make a deduction from this invoice'}

    		}else if(from == 'ddn'){
    			
    			loadedRec = record.load({
    				type:'customtransaction_itpm_deduction',
    				id:id
    			});
    			return (loadedRec.getValue('transtatus') == 'A')?{success:true}:{success:false,errormessage:'you cannot make a deduction from this deduction'};

    		}
    		return {success:true}   		
    	}catch(e){
    		return {success:false,errormessage:'invalid parameters'}
    	}
    }
    
    return {
        onRequest: onRequest
    };
    
});
