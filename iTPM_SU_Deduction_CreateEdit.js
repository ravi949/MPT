/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Front-end suitelet script for creating and editing iTPM Deduction records.
 */
define(['N/ui/serverWidget',
		'N/record',
		'N/search',
		'N/runtime',
		'N/redirect',
		'N/config',
		'N/format',
		'./iTPM_Module.js'],

function(serverWidget,record,search,runtime,redirect,config,format,itpm) {
   
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
			var subsidiariesEnabled = itpm.subsidiariesEnabled();
			var currenciesEnabled = itpm.currenciesEnabled();
			var locationsEnabled = itpm.locationsEnabled();
			var classesEnabled = itpm.classesEnabled();
			var departmentsEnabled = itpm.departmentsEnabled();
			var results;
			
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

					
					var customerId = invoiceRec.getValue('entity');
					var customerEntity = invoiceRec.getText('entity');
					
					if(params.multi == 'yes'){
						//total amount calculation for single Deduction on multiple Invoices
						var totalamount = 0;
						var invoiceIds = [];
						results = multiInvoicesList(params.fid);

				    	results.each(function(result){
				    		invoiceIds.push(result.getValue({name: "internalid", join: "appliedToTransaction"}));
				    		totalamount = totalamount + parseFloat(result.getValue({name: "amountremaining", join: "appliedToTransaction"}));			
				    		return true;
				    	});
				    	
				    	var invAmount = totalamount;
					}else{
						var invoiceIds = invoiceRec.id;
						var invAmount = invoiceRec.getValue('amountremainingtotalbox');
					}
				}else if(params.from == 'ddn'){
					var deductionRec = record.load({
						type:'customtransaction_itpm_deduction',
						id:params.fid
					});

					//taking the values from the parent deduction record.
					var originalDddno = deductionRec.getValue('custbody_itpm_ddn_originalddn');
					var deductnNo = deductionRec.getValue('tranid');
					var invoiceIds = deductionRec.getValue('custbody_itpm_ddn_invoice');
					var customerId = deductionRec.getValue('custbody_itpm_customer');  //Conflict resolved
					var customerEntity = deductionRec.getText('custbody_itpm_customer');  //Conflict resolved 
					var invAmount = deductionRec.getValue('custbody_itpm_ddn_openbal');  //Conflict resolved
				}
				
				//reading the values same intenralid values from the deduciton or invoice record.
				var recObj = (params.from == 'ddn')?deductionRec:invoiceRec;
				var invclass, invdept, invlocation, subsid;
				if (classesEnabled) invclass = recObj.getValue('class');
				if (departmentsEnabled) invdept = recObj.getValue('department');
				if (locationsEnabled) invlocation = recObj.getValue('location');
				if (subsidiariesEnabled) subsid = recObj.getValue('subsidiary');
				
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
				
				//Added for multi Invoice Deduction
				ddnForm.addField({
					id : 'custom_multi',
					type : serverWidget.FieldType.TEXT,
					label:'Multi'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				}).defaultValue = params.multi;
				
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
					type : serverWidget.FieldType.MULTISELECT,  //Added new line of code as changed from SELECT to MULTISELECT 9/22
					label:'Invoice',
					source: 'invoice',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).defaultValue = invoiceIds;

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
					});
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
				}).defaultValue = (params.from == 'inv' || params.type != 'edit')?'':deductionRec.getValue('custbody_itpm_otherrefcode');

				
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
				});

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
					label:'APPLIED TO TRANSACTION',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});
				
				
				//If deduction is edited then we are setting the parent and apply to deduction values
				if(params.type == 'edit' && deductionRec.getValue('custbody_itpm_appliedto') != ''){
					var selectionObj = {
							value:deductionRec.getValue('custbody_itpm_appliedto'),
							text:deductionRec.getText('custbody_itpm_appliedto')
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
				if(subsidiariesEnabled){
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
				if(currenciesEnabled){
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
				if (locationsEnabled){
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

					itpm.getClassifications(subsid, 'location', subsidiariesEnabled).forEach(function(e){
						location.addSelectOption({
							value:e.id,
							text:e.name,
							isSelected:(invlocation == e.id)
						});
						return true;
					});
				}

				if (departmentsEnabled){
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

					itpm.getClassifications(subsid, 'dept', subsidiariesEnabled).forEach(function(e){
						dept.addSelectOption({
							value:e.id,
							text:e.name,
							isSelected:(invdept == e.id)
						});
						return true;
					});
				}
				
				if (classesEnabled){
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

					itpm.getClassifications(subsid, 'class', subsidiariesEnabled).forEach(function(e){
						classField.addSelectOption({
							value :e.id,
							text : e.name,
							isSelected:(invclass == e.id)
						});
						return true;
					});
				}

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
				}).defaultValue = (params.type != 'edit')?invAmount:deductionRec.getValue('custbody_itpm_amount');

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
				ddnForm.addButton({label:'Cancel',id : 'custom_itpm_cancelbtn',functionName:"redirectToBack"});
				ddnForm.clientScriptModulePath =  './iTPM_Attach_Deduction_ClientMethods.js';
				//ddnForm.clientScriptFileId = runtime.getCurrentScript().getParameter({name:'custscript_itpm_su_ddn_csfileid'});
				response.writePage(ddnForm);

			}else if(request.method == 'POST'){
				var originalno = params['custom_itpm_ddn_originalddn'];
				var otherrefno = params['custom_itpm_ddn_otherrefcode'];
				var multiinvoices = params['custom_itpm_ddn_invoice'];
				var invoiceno = multiinvoices.replace(/\u0005/g,',').split(",");
				
				var invoiceLookup = '';
				//Fetching tranid's for multiple invoices to set the memo
				for(var i=0; i<invoiceno.length; i++){
					invoiceLookups =  search.lookupFields({
						type: search.Type.INVOICE,
						id: invoiceno[i],
						columns: ['tranid']
					});
						
					invoiceLookup = invoiceLookup+invoiceLookups.tranid+' ';
				}
					
				customerno = params['custom_customer'];
				parentno = params['custom_parent'];
				classno = params['custom_class'];
				deptno = params['custom_department'];
				locationno = params['custom_location'];
				assignto = params['custom_itpm_ddn_assignedto'];
				amount = params['custom_itpm_ddn_amount'].replace(/,/g,'');
				totalsettlement = params['custom_total_settlements'];
				disputed = params['custom_itpm_ddn_disputed'];
				openbal = params['custom_itpm_ddn_openbal'];
				followup = params['custom_itpm_ddn_nextaction'];
				memo = params['custom_memo'];
				status = params['custom_status'];
				defaultRecvAccnt = params['custom_def_accnt_recv'];
				deductionRec = null;

				if(params['custom_user_eventype'] != 'edit'){
					deductionRec = record.create({
						type:'customtransaction_itpm_deduction',
						isDynamic:true
					});
				}else{
					deductionRec = record.load({
						type:'customtransaction_itpm_deduction',
						id:params['custom_parent_recid'],
						isDynamic:true
					});
				}
				
				
				deductionRec.setValue({
					fieldId:'custbody_itpm_otherrefcode',
					value:otherrefno,
					ignoreFieldChange:true
				}).setValue({
					fieldId:'memo',
					value:memo,
					ignoreFieldChange:true
				}).setValue({
					fieldId:'custbody_itpm_amount',
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
							fieldId:'custbody_itpm_appliedto',
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
					});
				}
				
				if(invoiceno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_invoice',
						value:invoiceno,
						ignoreFieldChange:true
					});
				}
				if(customerno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_customer',
						value:customerno,
						ignoreFieldChange:true
					});
				}
				if(parentno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_custparent',
						value:parentno,
						ignoreFieldChange:true
					});
				}
				
				if(subsidiariesEnabled){
					deductionRec.setValue({
						fieldId:'subsidiary',
						value:params['custom_subsidiary'],
						ignoreFieldChange:true
					});
				}
				
				if(currenciesEnabled){
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
					});
				}

				if(deptno != ''){
					deductionRec.setValue({
						fieldId:'location',
						value:locationno,
						ignoreFieldChange:true
					});
				}

				if(locationno != ''){
					deductionRec.setValue({
						fieldId:'department',
						value:deptno,
						ignoreFieldChange:true
					});
				}

				if(assignto != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_assignedto',
						value:assignto,
						ignoreFieldChange:true
					});
				}

				if(totalsettlement != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_totsett',
						value:totalsettlement,
						ignoreFieldChange:true
					});
				}

				if(followup != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_nextaction',
						value:new Date(followup),
						ignoreFieldChange:true
					});
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
					var removeCustFromSplit = (createdFrom == 'ddn' && itpm.getPrefrenceValues().removeCustomer);
					log.debug('re',itpm.getPrefrenceValues());
					if(createdFrom == 'inv'){
						var recievableAccntId = search.lookupFields({
							type:search.Type.INVOICE,
							id:params['custom_parent_recid'],
							columns:['internalid','account']
						})['account'][0].value; //Conflict resolved
						
						//lineMemo = 'Deduction applied on Invoice #'+invoiceLookup.tranid;
						lineMemo = (params['custom_multi'] == 'yes')?('Deduction applied on Invoices '+invoiceLookup):('Deduction applied on Invoice #'+invoiceLookup);
						
						var configObj = config.load({
							type:config.Type.ACCOUNTING_PREFERENCES
						});

						//getting the itpm preference deduction account
						expenseId = itpm.getPrefrenceValues().dednExpAccnt;

						if(defaultRecvAccnt == "-10"){
							defaultRecvAccnt = configObj.getValue('ARACCOUNT');
							defaultRecvAccnt = (defaultRecvAccnt == '')?recievableAccntId:defaultRecvAccnt;
						}
						receivbaleAccntsList = [{accountId:defaultRecvAccnt,amount:amount,fid:'credit',memo:lineMemo},{accountId:expenseId,amount:amount,fid:'debit',memo:lineMemo}];

					}else if(createdFrom == 'ddn'){
						var dedRec = record.load({
							type:'customtransaction_itpm_deduction',
							id:(params['custom_itpm_ddn_parentddn'] == "")?originalno:params['custom_itpm_ddn_parentddn']
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
						}).setCurrentSublistValue({
							sublistId:'line',
							fieldId:'entity',
							value:(removeCustFromSplit)?'':customerno
						}).commitLine({
							sublistId: 'line'
						});

					});

					var deductionId = deductionRec.save({enableSourcing:false,ignoreMandatoryFields:true});
					
					//creating the other deduction record when click the split
					if(deductionId && createdFrom == 'ddn'){
						var parentRec = record.load({type:'customtransaction_itpm_deduction',id:params['custom_parent_recid']});
						var parentDdnAmount = parseFloat(parentRec.getValue('custbody_itpm_ddn_openbal'));
						var newDdnAmount = parseFloat(amount);
						if(parentDdnAmount > newDdnAmount){
							createAutomatedDeductionRecord(parentRec,parentDdnAmount - newDdnAmount,expenseId,removeCustFromSplit);
						}
						
						//loading the parent record again why because parentDeductionRec already save 
						//thats why we are loading the record newly	
						parentRec.setValue({
							fieldId:'custbody_itpm_ddn_openbal',
							value:0 
						}).save({
							enableSourcing: false,
							ignoreMandatoryFields : true
						});
						
					}
					
					//when a deduction is created from invoice then the invoice is converted into payment fulfillment
					if(createdFrom == 'inv'){
						//payment for multi invoices
						if(params['custom_multi'] == 'yes'){
							var deductionCreatedRec = record.load({
                                type: 'customtransaction_itpm_deduction',
                                id  : deductionId
                            });
							
							 deductionId = deductionCreatedRec.setValue({
	                                fieldId:'custbody_itpm_ddn_originalddn',
	                                value:deductionId
	                            }).save({enableSourcing:false,ignoreMandatoryFields:true});

                            results = multiInvoicesList(params['custom_parent_recid']);

                            results.each(function(result){
                                //Customer Payment process for each invoice
                                invTransformRec = record.transform({
                                    fromType: record.Type.INVOICE,
                                    fromId: result.getValue({name: "internalid", join: "appliedToTransaction"}),
                                    toType: record.Type.CUSTOMER_PAYMENT
                                });
                            
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
                                    value:'Deduction '+deductionCreatedRec.getValue('tranid')+' applied to Invoice '+result.getValue({name: "internalid", join: "appliedToTransaction"})
                                });

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
                                        
                                        var lastId = invTransformRec.save({
                                            enableSourcing: false,
                                            ignoreMandatoryFields: true
                                        });
                                        //log.debug('invTransformRecId ',lastId );
                                    }
                                }

                                return true;
                            });
                            
                           
						}else{  //payment for single invoice
							var deductionCreatedRec = record.load({type:'customtransaction_itpm_deduction',id:deductionId});
							multiinvoices = params['custom_itpm_ddn_invoice'];
							
							//We are using reg exp. here: while trying to get the multiple invoices from multiselect field result is coming as a string with | character
							invId = multiinvoices.replace(/\u0005/g,',').split(",");
							
							invTransformRec = record.transform({
								fromType: record.Type.INVOICE,
								fromId: invId,
								toType: record.Type.CUSTOMER_PAYMENT
							});
							
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
								value:'Deduction '+deductionCreatedRec.getValue('tranid')+' applied to Invoice '+invoiceLookup
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
									var lastId = invTransformRec.save({
										enableSourcing: false,
										ignoreMandatoryFields: true
									});
//									log.debug('invTransformRecId ',lastId );
								}
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
			var recType = (params.from == 'inv')?'Invoice':'iTPM Deduction';
			var eventType = (params.type != 'edit')?'create':'edit';
			log.error(e.name,'record type = '+recType+', record id='+params.fid+', event type = '+eventType+' message='+e);
			throw Error(e.message);
		}
	}

	/**
	 * @param parentDdnRec
	 * @param remainingAmount
	 * @param ddnExpnseAccount
	 * @returns {Number} child deduction record id
	 * @description creating the automated Deduction record 
	 */
	function createAutomatedDeductionRecord(parentDdnRec,remainingAmount,ddnExpnseAccount,removeCustFromSplit){
		remainingAmount = remainingAmount.toFixed(2);

		//creating the Deduction record for remaining amount
		var copiedDeductionRec = record.create({
			type:'customtransaction_itpm_deduction'
		});

		//setting the applied to and parent deduction values and other main values.
		copiedDeductionRec.setValue({
			fieldId:'custbody_itpm_ddn_invoice',
			value:parentDdnRec.getValue('custbody_itpm_ddn_invoice')
		}).setValue({
			fieldId:'custbody_itpm_ddn_originalddn',
			value:parentDdnRec.getValue('custbody_itpm_ddn_originalddn')
		}).setValue({
			fieldId:'class',
			value:parentDdnRec.getValue('class')
		}).setValue({
			fieldId:'department',
			value:parentDdnRec.getValue('department')
		}).setValue({
			fieldId:'location',
			value:parentDdnRec.getValue('location')
		}).setValue({
			fieldId:'subsidiary',
			value:parentDdnRec.getValue('subsidiary')
		}).setValue({
			fieldId:'currecny',
			value:parentDdnRec.getValue('currency')
		}).setValue({
			fieldId:'custbody_itpm_ddn_assignedto',
			value:parentDdnRec.getValue('custbody_itpm_ddn_assignedto')
		}).setValue({
			fieldId:'custbody_itpm_customer',
			value:parentDdnRec.getValue('custbody_itpm_customer')
		}).setValue({
			fieldId:'custbody_itpm_ddn_parentddn',
			value:parentDdnRec.id
		}).setValue({
			fieldId:'custbody_itpm_appliedto',
			value:parentDdnRec.id
		}).setValue({
			fieldId:'custbody_itpm_otherrefcode',
			value:''
		}).setValue({
			fieldId:'custbody_itpm_ddn_disputed',
			value:false //when split the deduction if first one checked second set to false
		}).setValue({
			fieldId:'custbody_itpm_amount',
			value:remainingAmount  //setting the remaining the amount value to the Amount field
		}).setValue({
			fieldId:'custbody_itpm_ddn_openbal',
			value:remainingAmount
		}).setValue({
			fieldId:'memo',
			value:'Deduction split from Deduction #'+parentDdnRec.getText('tranid')
		});

		//setting the line values to copied deduction record
		for(var i = 0;i < 2;i++){
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
			}).setSublistValue({
				sublistId:'line',
				fieldId:'entity',
				value:(removeCustFromSplit)?'':parentDdnRec.getValue('custbody_itpm_customer'),
				line:i
			});
		}

		//save the new child deduction record
		var newChildDedid = copiedDeductionRec.save({enableSourcing:false,ignoreMandatoryFields:true});		
	}
	
	/**
	 * @param subid
	 * @returns {search} search object
	 * @description getting the Employees list based on subsidiary.
	 */
    function getEmployees(subid){
    	var filters = [['isinactive','is',false]];
    	if (subid){
    		filters.push('and');
    		filters.push(['subsidiary','anyof',subid]);
    	}
    	return search.create({
    		type:search.Type.EMPLOYEE,
    		columns:['internalid','entityid'],
    		filters: filters
    	});
    }
    
    /**
     * @param id record id
     * @param from created from (invoice or deduction)
     * @returns {Object} error
     * @description checking for the id valid or not
     */
    function checkWhetherIdValidOrNot(id,from){
    	try{
    		var loadedRec;
    		if(from == 'inv'){
    			loadedRec = record.load({
    				type:record.Type.INVOICE,
    				id:id
    			});

    			var invStatus = loadedRec.getValue('status');
    			//Deduction record type id
    			var ddnRecTypeId = runtime.getCurrentScript().getParameter('custscript_itpm_ddn_createedit_rectypeid');
    			
    			//invoice dont have any ITPM DEDUCTION records
    			var invoiceDeductionsAreEmpty = search.create({
    				type:'customtransaction_itpm_deduction',
    				columns:['internalid'],
    				filters:[
    					['custbody_itpm_ddn_invoice','anyof',id],'and',
    					['status','anyof',["Custom"+ddnRecTypeId+":A","Custom"+ddnRecTypeId+":B"]]
    				]
    			}).run().getRange(0,5).length == 0;

    			if (invStatus != 'Paid In Full' && invoiceDeductionsAreEmpty){
    				return {success:true};
    			} else {
    				throw {
    					name: 'checkWhetherIdValidOrNot',
    					message: 'Invoice conditions not met, OR, Invoice Deductions not empty.'
    				};
    			}
    		} else if(from == 'ddn'){
    			loadedRec = record.load({
    				type:'customtransaction_itpm_deduction',
    				id:id
    			});
    			if (loadedRec.getValue('transtatus') == 'A') {
    				return {success:true};
    			} else {
    				throw {
    					name: 'checkWhetherIdValidOrNot', 
    					message: 'Deduction status not OPEN.'
    				};
    			}
    		}
    		// if neither of the IF statement clauses are satisfied
    		throw {
				name: 'checkWhetherIdValidOrNot', 
				message: 'Could not find required parameter FROM in request.'
			};
    	}catch(e){
    		return {success:false,errormessage:e.message}
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
    
    return {
        onRequest: onRequest
    }
    
});
