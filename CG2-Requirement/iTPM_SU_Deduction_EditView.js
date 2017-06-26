/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
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
			
			var request = context.request,response = context.response;
			if(request.method == 'GET'){
//				log.debug('context',request.parameters.fid);
				var deductionRec = record.load({
					type:'customtransaction_itpm_deduction',
					id: request.parameters.fid
				});
//				log.error('ddnRec',deductionRec);
				
				var subsid = deductionRec.getValue('subsidiary'), //subsidiary from original dedution
				customerId = deductionRec.getValue('custbody_itpm_ddn_customer'), //customer from original dedution
				ddnclass = deductionRec.getValue('class'), //class from original dedution
				ddndept = deductionRec.getValue('department'), //dept from original dedution
				ddnlocation = deductionRec.getValue('location'), //location from original dedution
				currentUserId = deductionRec.getValue('custbody_itpm_ddn_assignedto'),
				originalDdnValue = deductionRec.getValue({ fieldId: 'custbody_itpm_ddn_originalddn'}),
				originalDdnText = deductionRec.getText({ fieldId: 'custbody_itpm_ddn_originalddn'});
				
				var ddnForm = serverWidget.createForm({
					title: '- ITPM Deduction'
				});
				/*------Adding a hidden field for Deduction Id-----*/
				ddnForm.addField({
					id : 'custom_recid',
					type : serverWidget.FieldType.TEXT,
					label:'Record id'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				}).defaultValue = request.parameters.fid; 
				/*------PRIMARY INFORMATION start-----*/

				ddnForm.addFieldGroup({
					id:'custom_primry_information',
					label:'Primary Information'
				});

				ddnForm.addField({
					id : 'custom_tranid',
					type : serverWidget.FieldType.TEXT,
					label:'ENTRY NO.',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).defaultValue = deductionRec.getValue('tranid');

				var invoice = ddnForm.addField({
					id : 'custom_itpm_ddn_invoice',
					type : serverWidget.FieldType.SELECT,
					label:'Invoice',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});
				invoice.addSelectOption({
					value : deductionRec.getValue('custbody_itpm_ddn_invoice'),
					text : deductionRec.getText('custbody_itpm_ddn_invoice'),
					isSelected:true
				});
				
				var originnoField = ddnForm.addField({
					id : 'custom_itpm_ddn_originalddn',
					type : serverWidget.FieldType.SELECT,
					label:'Original Deduction',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});
				originnoField.addSelectOption({
					value:(originalDdnValue =='')?' ':originalDdnValue,
					text:(originalDdnText =='')?' ':originalDdnText
				})

				//OTHER REFERENCE CODE Field
				ddnForm.addField({
					id : 'custom_itpm_ddn_otherrefcode',
					type : serverWidget.FieldType.TEXT,
					label:'OTHER REFERENCE CODE',
					container:'custom_primry_information'
				}).defaultValue = deductionRec.getValue({ fieldId: 'custbody_itpm_ddn_otherrefcode'});

				//Date field
				ddnForm.addField({
					id : 'custom_trandate',
					type : serverWidget.FieldType.DATE,
					label:'Date',
					container:'custom_primry_information'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				}).defaultValue = format.format({
					value: deductionRec.getValue({ fieldId:'trandate'}),
					type: format.Type.DATE
				});

				//Posting Period field
				var postPeriod = ddnForm.addField({
					id : 'custom_postingperiod',
					type : serverWidget.FieldType.SELECT,
					label:'POSTING PERIOD',
					container:'custom_primry_information'
				}),
				ppid = deductionRec.getValue({ fieldId:'postingperiod'});
				postPeriod.addSelectOption({
					value :' ',
					text : ' '
				});
				var accountingperiodSearchObj = search.create({
					   type: "accountingperiod",
					   filters: [["isquarter","is","F"],"AND",["isyear","is","F"] ],
					   columns: ["periodname"]
					}).run().each(function(e){
						postPeriod.addSelectOption({
							value :e.id,
							text : e.getValue('periodname'),
							isSelected:(ppid == e.id)
						});
						return true;
					});
				
				//Status field
				var status = ddnForm.addField({
					id : 'custom_status',
					type : serverWidget.FieldType.SELECT,
					label:'Status',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});

				status.addSelectOption({
					value : deductionRec.getValue({ fieldId: 'transtatus'}),
					text : deductionRec.getText({ fieldId: 'transtatus'}),
					isSelected:true
				});

				//Customer field
				var customer = ddnForm.addField({
					id : 'custom_customer',
					type : serverWidget.FieldType.SELECT,
					label:'Customer',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});
				customer.addSelectOption({
					text:deductionRec.getText('custbody_itpm_ddn_customer'),
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
				}).defaultValue = deductionRec.getValue({ fieldId: 'custbody_itpm_ddn_disputed'})?'T':'F';
				
				//iTPM Applied To Transaction field 				
				var aplydToTrans = ddnForm.addField({
					id : 'custom_itpm_ddn_appliedto',
					type : serverWidget.FieldType.SELECT,
					label:'Applied To',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});
				if(deductionRec.getValue('custbody_itpm_set_deduction')){
					aplydToTrans.addSelectOption({
						text:deductionRec.getText('custbody_itpm_set_deduction'),
						value:deductionRec.getValue('custbody_itpm_set_deduction'),
						isSelected:true
					});
				}else{
					aplydToTrans.addSelectOption({
						text:' ',
						value:' ',
						isSelected:true
					});
				}
				
				/*-----PRIMARY INFORMATION end-----*/

				/*------CLASSIFICATION start ------*/
				ddnForm.addFieldGroup({
					id : 'custom_classification',
					label : 'Classification'
				});

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
					text : deductionRec.getText('subsidiary'),
					isSelected:true
				});
				
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
					value : deductionRec.getValue('currency'),
					text : deductionRec.getText('currency'),
					isSelected:true
				});
				
				//Location field
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
				})
				getList(subsid,'location').run().each(function(e){
					location.addSelectOption({
						value:e.getValue('internalid'),
						text:e.getValue('name'),
						isSelected:(ddnlocation == e.getValue('internalid'))
					})
					return true;
				})
				//Department field
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
				})
				getList(subsid,'dept').run().each(function(e){
					dept.addSelectOption({
						value:e.getValue('internalid'),
						text:e.getValue('name'),
						isSelected:(ddndept == e.getValue('internalid'))
					})
					return true;
				})
				
				//Class field
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
						isSelected:(ddnclass == e.getValue('internalid'))
					});
					return true;
				})
				 
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
				assignto.isMandatory = true;
				 
				//setting the DUE DATE/FOLLOW UP
				//setting the 2 week date from today
				var followupDate = ddnForm.addField({
					id : 'custom_itpm_ddn_nextaction',
					type : serverWidget.FieldType.DATE,
					label:'Due Date',
					container:'custom_itpm_ddn_taskdetails'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				}).defaultValue = format.format({
					value: deductionRec.getValue({ fieldId:'custbody_itpm_ddn_nextaction'}),
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
				}).defaultValue = deductionRec.getValue({ fieldId: 'memo'});
				
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
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).defaultValue = deductionRec.getValue('custbody_itpm_ddn_amount')

				//setting the TOTAL SETTLEMENT value
				ddnForm.addField({
					id : 'custom_total_settlements',
					type : serverWidget.FieldType.INTEGER,
					label:'TOTAL SETTLEMENTS',
					container:'custom_itpm_ddn_transdetails'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).defaultValue = deductionRec.getValue({ fieldId: 'custbody_itpm_ddn_totsett'});
				
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
				}).defaultValue = deductionRec.getValue({ fieldId: 'custbody_itpm_ddn_openbal'});
				
				//setting the TOTAL EXPENSES value
				ddnForm.addField({
					id : 'custom_itpm_ddn_totalexpense',
					type : serverWidget.FieldType.CURRENCY,
					label:'TOTAL EXPENSES',
					container:'custom_itpm_ddn_transdetails'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).defaultValue = deductionRec.getValue({ fieldId: 'custbody_itpm_ddn_totexp'});
				
				/*------- TRANSACTION DETAIL End --------*/
				
				ddnForm.addSubmitButton({label:'Submit'});
				ddnForm.addButton({label:'Cancel',id : 'custom_itpm_cancelbtn',functionName:"redirectToBack"})
				ddnForm.clientScriptModulePath =  './iTPMDeduction_ToDeduction_Validations_cs_script.js';
				response.writePage(ddnForm);
				
			}else if(request.method == 'POST'){
//				log.debug('request',request); 
				var otherrefno = request.parameters['custom_itpm_ddn_otherrefcode'],//Other Reference Code				
				classno = request.parameters['custom_class'],//Class
				deptno = request.parameters['custom_department'],//Department
				locationno = request.parameters['custom_location'],  //Location
				assignto = request.parameters['custom_itpm_ddn_assignedto'],//Assigned To
				amount = request.parameters['custom_itpm_ddn_amount'], //For validating
				disputed = request.parameters['custom_itpm_ddn_disputed'],//Disputed
				followup = request.parameters['custom_itpm_ddn_nextaction'],//Due Date
				memo = request.parameters['custom_memo'],//Memo
				ddnId = request.parameters['custom_recid'],
				date = request.parameters['custom_trandate'],//Date
				ppValue = request.parameters['custom_postingperiod'];//Posting Period
//				log.debug('ppValue in post',ppValue);
//				log.debug('disputed',disputed); 				
//				log.debug('openbal',openbal); 
//				log.debug('memo',memo); 
//				log.debug('otherrefno',otherrefno);
//				log.debug('amount',amount);
				
				var deductionRec = record.load({
					type:'customtransaction_itpm_deduction',
					id: ddnId
				})
				if(otherrefno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_otherrefcode',
						value:otherrefno,
						ignoreFieldChange:true
					})
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
						fieldId:'department',
						value:deptno,
						ignoreFieldChange:true
					})
				}
				if(locationno != ''){					
					deductionRec.setValue({
						fieldId:'location',
						value:locationno,
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
				if(disputed != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_disputed',
						value:(disputed == "T")?true:false,
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
				if(memo != ''){
					deductionRec.setValue({
						fieldId:'memo',
						value:memo,
						ignoreFieldChange:true
					})
				}
				if(date != ''){
					deductionRec.setValue({
						fieldId:'trandate',
						value:new Date(date),
						ignoreFieldChange:true
					})
				}
				if(ppValue != ''){
					deductionRec.setValue({
						fieldId:'postingperiod',
						value:ppValue,
						ignoreFieldChange:true
					})
				}
				if(amount == deductionRec.getValue('custbody_itpm_ddn_amount')){
					var deductionId = deductionRec.save({enableSourcing:false,ignoreMandatoryFields:true});
					redirect.toRecord({
						id : deductionId,
						type : 'customtransaction_itpm_deduction', 
						isEditMode:false
					});
				}else{
					throw Error("invalid amount");
				}
				
			}
		}catch(e){
			log.error('Error Occures',e);
			if(e.message == "invalid amount"){
				throw "Amount not matched to the original Amount";
			}
		}    	
	}
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
			filters:[['subsidiary','is',subid],'and',['isinactive','is',false]]
		});
	}
	  //getting the Employees list based on subsidiary.
    function getEmployees(subid){
    	return search.create({
    		type:search.Type.EMPLOYEE,
    		columns:['internalid','entityid'],
    		filters:[['subsidiary','is',subid],'and',['isinactive','is',false]]
    	});
    }
	return {
		onRequest: onRequest
	};

});
