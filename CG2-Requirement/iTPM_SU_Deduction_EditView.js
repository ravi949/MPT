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
				var ddnForm = serverWidget.createForm({
					title: '- ITPM Deduction'
				});

				/*-------------------Set the Parent Deduction value----------*/
				ddnForm.addField({
					id : 'custom_parent_recid',
					type : serverWidget.FieldType.TEXT,
					label:'Parent Record id'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				});  

				ddnForm.addField({
					id : 'custom_cfrom',
					type : serverWidget.FieldType.TEXT,
					label:'Created From'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				});

				/*-----------------------------end--------------------------*/

				/*--------------Default Account Recivable------------------*/
				ddnForm.addField({
					id : 'custom_def_accnt_recv',
					type : serverWidget.FieldType.TEXT,
					label:'Date'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				})
				/*-------------------------End-------------------------------*/


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
				})

				var originnoField = ddnForm.addField({
					id : 'custom_itpm_ddn_originalddn',
					type : serverWidget.FieldType.SELECT,
					label:'Original Number',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});

				ddnForm.addField({
					id : 'custom_itpm_ddn_otherrefcode',
					type : serverWidget.FieldType.TEXT,
					label:'OTHER REFERENCE CODE',
					container:'custom_primry_information'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});

				var customerParent = ddnForm.addField({
					id : 'custom_parent',
					type : serverWidget.FieldType.SELECT,
					label:'Parent',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});

				ddnForm.addField({
					id : 'custom_trandate',
					type : serverWidget.FieldType.DATE,
					label:'Date',
					container:'custom_primry_information'
				});
				ddnForm.addField({
					id : 'custom_postingperiod',
					type : serverWidget.FieldType.DATE,
					label:'POSTING PERIOD',
					container:'custom_primry_information'
				});
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

				var customer = ddnForm.addField({
					id : 'custom_customer',
					type : serverWidget.FieldType.SELECT,
					label:'Customer',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
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
				})

				classField.addSelectOption({
					value :' ',
					text : ' '
				});

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
				});


				//setting the CURRENCY value
				var currency = ddnForm.addField({
					id : 'custom_currency',
					type : serverWidget.FieldType.SELECT,
					label:'Currency',
					container:'custom_detail_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});


				//setting the TOTAL SETTLEMENT value
				ddnForm.addField({
					id : 'custom_total_settlements',
					type : serverWidget.FieldType.INTEGER,
					label:'Total Settlements',
					container:'custom_detail_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});

				//setting the Disputed value
				ddnForm.addField({
					id : 'custom_itpm_ddn_disputed',
					type : serverWidget.FieldType.CHECKBOX,
					label:'DISPUTED?',
					container:'custom_detail_information'
				})

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
				});

				//setting the AMOUNT
				var amountField = ddnForm.addField({
					id : 'custom_itpm_ddn_amount',
					type : serverWidget.FieldType.CURRENCY,
					label:'Amount',
					container:'custom_detail_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});

				amountField.isMandatory = true;

				//setting the MEMO
				ddnForm.addField({
					id : 'custom_memo',
					type : serverWidget.FieldType.TEXT,
					label:'Memo',
					container:'custom_detail_information'
				});

				//setting the employees list to this select field
				var assignto = ddnForm.addField({
					id : 'custom_itpm_ddn_assignedto',
					type : serverWidget.FieldType.SELECT,
					label:'Assigned To',
					container:'custom_detail_information'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});

				assignto.isMandatory = true;

				//setting the STATUS to open
				var status = ddnForm.addField({
					id : 'custom_status',
					type : serverWidget.FieldType.SELECT,
					label:'Status',
					container:'custom_detail_information'
				});
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
				});
				followupDate.isMandatory = true;
				followupDate.defaultValue = format.format({
					value:twoWeekDate,
					type: format.Type.DATE
				});
				/*------- Detail info end --------*/  


				ddnForm.addSubmitButton({label:'Submit'});
				ddnForm.addButton({label:'Cancel',id : 'custom_itpm_cancelbtn',functionName:"redirectToBack"})
				ddnForm.clientScriptModulePath =  './iTPMDeduction_ToDeduction_Validations_cs_script.js';
				response.writePage(ddnForm);
			}
		}catch(e){
			log.debug('Error Occures',e);
		}    	
	}

	return {
		onRequest: onRequest
	};

});
