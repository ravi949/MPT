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
				log.debug('context',request.parameters.fid);
				var deductionRec = record.load({
					type:'customtransaction_itpm_deduction',
					id: request.parameters.fid
				});
				log.debug('ddnRec',deductionRec);
				
				var deductnNo = deductionRec.getValue('tranid'),
				invoiceId = deductionRec.getValue('custbody_itpm_ddn_invoice'),
				invoiceText = deductionRec.getText('custbody_itpm_ddn_invoice'),
				subsid = deductionRec.getValue('subsidiary'), //subsidiary from original dedution
				subsidiaryText = deductionRec.getText('subsidiary'), //subsidiary from original dedution
				customerId = deductionRec.getValue('custbody_itpm_ddn_customer'), //customer from original dedution
				customerEntity = deductionRec.getText('custbody_itpm_ddn_customer'), //customer from original dedution
				invAmount = deductionRec.getValue('custbody_itpm_ddn_amount'),
				invclass = deductionRec.getValue('class'), //class from original dedution
				invdept = deductionRec.getValue('department'), //dept from original dedution
				invlocation = deductionRec.getValue('location'), //location from original dedution
				currencyId = deductionRec.getValue('currency'), //currency from original dedution
				currencyText = deductionRec.getText('currency'), //currency from original dedution
				currentUserId = runtime.getCurrentUser().id,
				totalSettlements = 0,
				customerRec = record.load({
					type:record.Type.CUSTOMER,
					id:customerId
				}),
				defaultRecvAccnt = customerRec.getValue('receivablesaccount'),
				customerParentId = customerRec.getValue('parent');
				
				
				var ddnForm = serverWidget.createForm({
					title: '- ITPM Deduction'
				});

				/*------primary info start-----*/

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
				}).defaultValue = deductnNo;

				var originnoField = ddnForm.addField({
					id : 'custom_itpm_ddn_originalddn',
					type : serverWidget.FieldType.SELECT,
					label:'Original Deduction',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).addSelectOption({
					value: deductionRec.getValue({ fieldId: 'custbody_itpm_ddn_originalddn'}),
					text: deductionRec.getText({ fieldId: 'custbody_itpm_ddn_originalddn'})
				})	

				ddnForm.addField({
					id : 'custom_itpm_ddn_otherrefcode',
					type : serverWidget.FieldType.TEXT,
					label:'OTHER REFERENCE CODE',
					container:'custom_primry_information'
				})//.defaultValue = ddnRec.getValue({ fieldId: 'custbody_itpm_ddn_otherrefcode'});

				if(customerParentId != ''){
					var customerParent = ddnForm.addField({
						id : 'custom_parent',
						type : serverWidget.FieldType.SELECT,
						label:'Parent',
						container:'custom_primry_information'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.DISABLED
					}).updateBreakType({
						breakType : serverWidget.FieldBreakType.STARTCOL
					}).addSelectOption({
						value : customerParentId,
						text : customerRec.getText('parent'),
						isSelected:true
					});
				}
				ddnForm.addField({
					id : 'custom_trandate',
					type : serverWidget.FieldType.DATE,
					label:'Date',
					container:'custom_primry_information'
				});//.defaultValue = ddnRec.getValue({ fieldId:'trandate'});
//				log.debug('date',ddnRec.getValue({ fieldId:'trandate'}));
				ddnForm.addField({
					id : 'custom_postingperiod',
					type : serverWidget.FieldType.DATE,
					label:'POSTING PERIOD',
					container:'custom_primry_information'
				});//.defaultValue = ddnRec.getValue({ fieldId: 'postingperiod'});
				var invoice = ddnForm.addField({
					id : 'custom_itpm_ddn_invoice',
					type : serverWidget.FieldType.SELECT,
					label:'Invoice',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});
				invoice.addSelectOption({
					value : invoiceId,
					text : invoiceText,
					isSelected:true
				});

				var customer = ddnForm.addField({
					id : 'custom_customer',
					type : serverWidget.FieldType.SELECT,
					label:'Customer',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				})//.defaultValue = ddnRec.getValue({ fieldId: 'custbody_itpm_ddn_customer'})
				customer.addSelectOption({
					text:customerEntity,
					value:customerId,
					isSelected:true
				})
				/*-----primary info end-----*/

				/*------Classification start ------*/
				ddnForm.addFieldGroup({
					id : 'custom_classification',
					label : 'Classification'
				});

				var classField = ddnForm.addField({
					id : 'custom_class',
					type : serverWidget.FieldType.SELECT,
					label:'Class',
					container:'custom_classification'
				})//.defaultValue = ddnRec.getValue({ fieldId: 'class'})

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
				})

				var location = ddnForm.addField({
					id : 'custom_location',
					type : serverWidget.FieldType.SELECT,
					label:'Location',
					container:'custom_classification'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				})///.defaultValue = ddnRec.getValue({ fieldId: 'location'});

				location.addSelectOption({
					value:' ',
					text:' '
				})
				getList(subsid,'location').run().each(function(e){
					location.addSelectOption({
						value:e.getValue('internalid'),
						text:e.getValue('name'),
						isSelected:(invlocation == e.getValue('internalid'))
					})
					return true;
				})
				var dept = ddnForm.addField({
					id : 'custom_department',
					type : serverWidget.FieldType.SELECT,
					label:'Department',
					container:'custom_classification'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				})//.defaultValue = ddnRec.getValue({ fieldId: 'department'});

				dept.addSelectOption({
					value:' ',
					text:' '
				})
				getList(subsid,'dept').run().each(function(e){
					dept.addSelectOption({
						value:e.getValue('internalid'),
						text:e.getValue('name'),
						isSelected:(invdept == e.getValue('internalid'))
					})
					return true;
				})
				/*------Classification end --------*/	

				/*------- Detail info start --------*/

				ddnForm.addFieldGroup({
					id : 'custom_detail_information',
					label : 'Detailed Information'
				});

				//setting the SUBSIDIARY Value
				var subsidiary = ddnForm.addField({
					id : 'custom_subsidiary',
					type : serverWidget.FieldType.SELECT,
					label:'Subsidiary',
					container:'custom_detail_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				})//.defaultValue = ddnRec.getValue({ fieldId: 'subsidiary'});


				//setting the CURRENCY value
				var currency = ddnForm.addField({
					id : 'custom_currency',
					type : serverWidget.FieldType.SELECT,
					label:'Currency',
					container:'custom_detail_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				})//.defaultValue = ddnRec.getValue({ fieldId: 'currency'});


				//setting the TOTAL SETTLEMENT value
				ddnForm.addField({
					id : 'custom_total_settlements',
					type : serverWidget.FieldType.INTEGER,
					label:'Total Settlements',
					container:'custom_detail_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				})//.defaultValue = ddnRec.getValue({ fieldId: 'custbody_itpm_ddn_totsett'});

				//setting the Disputed value
				ddnForm.addField({
					id : 'custom_itpm_ddn_disputed',
					type : serverWidget.FieldType.CHECKBOX,
					label:'DISPUTED?',
					container:'custom_detail_information'
				})//.defaultValue = ddnRec.getValue({ fieldId: 'custbody_itpm_ddn_disputed'})

				//setting the OPEN BALANCE value
				ddnForm.addField({
					id : 'custom_itpm_ddn_openbal',
					type : serverWidget.FieldType.CURRENCY,
					label:'Open Balance',
					container:'custom_detail_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				})//.defaultValue = ddnRec.getValue({ fieldId: 'custbody_itpm_ddn_openbal'});

				//setting the AMOUNT
				var amountField = ddnForm.addField({
					id : 'custom_itpm_ddn_amount',
					type : serverWidget.FieldType.CURRENCY,
					label:'Amount',
					container:'custom_detail_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				})//.defaultValue = ddnRec.getValue({ fieldId: 'custbody_itpm_ddn_amount'});

				amountField.isMandatory = true;

				//setting the MEMO
				ddnForm.addField({
					id : 'custom_memo',
					type : serverWidget.FieldType.TEXT,
					label:'Memo',
					container:'custom_detail_information'
				})//.defaultValue = ddnRec.getValue({ fieldId: 'memo'});

				//setting the employees list to this select field
				var assignto = ddnForm.addField({
					id : 'custom_itpm_ddn_assignedto',
					type : serverWidget.FieldType.SELECT,
					label:'Assigned To',
					container:'custom_detail_information'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				})//.defaultValue = ddnRec.getValue({ fieldId: 'custbody_itpm_ddn_assignedto'});

				assignto.isMandatory = true;

				//setting the STATUS to open
				var status = ddnForm.addField({
					id : 'custom_status',
					type : serverWidget.FieldType.SELECT,
					label:'Status',
					container:'custom_detail_information'
				})//.defaultValue = ddnRec.getValue({ fieldId: 'transtatus'});
				status.updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});

				status.addSelectOption({
					value : 'A',
					text : 'Open',
					isSelected:true
				});

				//setting the DUE DATE/FOLLOW UP
				//setting the 2 week date from today
				var twoWeekDate = new Date(new Date().setDate(new Date().getDate()+14));
				var followupDate = ddnForm.addField({
					id : 'custom_itpm_ddn_nextaction',
					type : serverWidget.FieldType.DATE,
					label:'Due Date / Follow Up',
					container:'custom_detail_information'
				})//.defaultValue = ddnRec.getValue({ fieldId: ''});
//				followupDate.isMandatory = true;
//				followupDate.defaultValue = format.format({
//					value:twoWeekDate,
//					type: format.Type.DATE
//				});
				/*------- Detail info end --------*/  
				  //getting the Class,Department and Location list based on subsidiary.
			  

				ddnForm.addSubmitButton({label:'Submit'});
				ddnForm.addButton({label:'Cancel',id : 'custom_itpm_cancelbtn',functionName:"redirectToBack"})
				ddnForm.clientScriptModulePath =  './iTPMDeduction_ToDeduction_Validations_cs_script.js';
				response.writePage(ddnForm);
			}
		}catch(e){
			log.debug('Error Occures',e);
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
			filters:['subsidiary','is',subid]
		});
	}
	return {
		onRequest: onRequest
	};

});
