/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * Create the Settlement view on edit the settlement record.
 */
define(['N/ui/serverWidget','N/record','N/search','N/redirect','N/url'],

		function(serverWidget,record,search,redirect,url) {

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
			if(request.method == 'GET'){

				var settlementRec = record.load({
					type:'customtransaction_itpm_settlement',
					id:params.sid
				});

				var promotDealSearch = search.create({
					type:'customrecord_itpm_promotiondeal',
					columns:['custrecord_itpm_p_lumpsum','custrecord_itpm_p_type.custrecord_itpm_pt_validmop'],
					filters:[['internalid','is',settlementRec.getValue('custbody_itpm_set_promo')]]
				}).run(),
				promoDealURL = url.resolveRecord({
					recordType:'customrecord_itpm_promotiondeal',
					recordId:settlementRec.getValue('custbody_itpm_set_promo'),
					isEditMode:false
				});


				var form = serverWidget.createForm({
					title : '- iTPM Settlement'
				});

				//HIDDEN fields
				//if settlement record created from deduction
				var applyToDeduction = settlementRec.getValue('custbody_itpm_set_deduction');
				if(applyToDeduction != ''){
					var deductionRec = record.load({
						type:'customtransaction_itpm_deduction',
						id:parseInt(settlementRec.getValue('custbody_itpm_set_deduction'))
					});

					form.addField({
						id:'custom_itpm_st_ddn_openbal',
						type:serverWidget.FieldType.CURRENCY,
						label:'Deduction open balance'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.HIDDEN
					}).defaultValue = settlementRec.getValue('custbody_itpm_ddn_openbal')
				}

				form.addField({
					id:'custpage_settlement_id',
					type:serverWidget.FieldType.TEXT,
					label:'SETTLEMENT Id'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				}).defaultValue = params.sid

				/*  PRIMARY INFORMATION Start  */
				form.addFieldGroup({
					id : 'custom_primaryinfo_group',
					label : 'Primary Information'
				});

				//ENTRY NO. field
				form.addField({
					id:'custpage_settlementno',
					type:serverWidget.FieldType.TEXT,
					label:'ENTRY NO.',
					container:'custom_primaryinfo_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).defaultValue = settlementRec.getValue('tranid')

				//Other Reference Code field
				var otherRefCodeField = form.addField({
					id : 'custpage_otherref_code',
					type : serverWidget.FieldType.TEXT,
					label : 'OTHER REFERENCE CODE',
					container:'custom_primaryinfo_group'
				});
				otherRefCodeField.defaultValue = settlementRec.getValue('custbody_itpm_set_otherrefcode');
				
				//CUSTOMER field
				form.addField({
					id:'custpage_customer',
					type:serverWidget.FieldType.TEXT,
					label:'CUSTOMER',
					container:'custom_primaryinfo_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).defaultValue = settlementRec.getText('custbody_itpm_set_customer')

				//Date field
				form.addField({
					id:'custpage_date',
					type:serverWidget.FieldType.TEXT,
					label:'DATE',
					container:'custom_primaryinfo_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				}).defaultValue = settlementRec.getText('trandate')

				//STATUS field 
				form.addField({
					id:'custpage_status',
					type:serverWidget.FieldType.TEXT,
					label:'STATUS',
					container:'custom_primaryinfo_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).defaultValue = settlementRec.getText('transtatus')

				//APPLIED TO field
				var deductionID = settlementRec.getValue('custbody_itpm_set_deduction'),
				checkID = settlementRec.getValue('custbody_itpm_set_check');
				if(deductionID != ''){
					form.addField({
						id : 'custpage_applyto_deduction',
						type : serverWidget.FieldType.TEXT,
						label : 'Apply To',
						container:'custom_primaryinfo_group'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.HIDDEN
					}).defaultValue = settlementRec.getText('custbody_itpm_set_deduction')

					var deductionURL = url.resolveRecord({
						recordType: 'customtransaction_itpm_deduction',
						recordId: deductionID,
						isEditMode: false
					});

					//apply to deduction field display as link
					form.addField({
						id:'custpage_applyto_deductionlink',
						type:serverWidget.FieldType.INLINEHTML,
						label:'Applied To',
						container:'custom_primaryinfo_group'
					}).updateBreakType({
						breakType : serverWidget.FieldBreakType.STARTCOL
					}).defaultValue = '<tr><td><div class="uir-field-wrapper" data-field-type="text" style="margin-top:5px"><span id="custom_itpm_st_promotion_desc_fs_lbl" class="smallgraytextnolink uir-label" style="">'+
					'<a class="smallgraytextnolink">Applied To</a></span>'+
					'<span class="uir-field"><span style="white-space: nowrap" id="custom_itpm_st_promotion_desc_fs" class="effectStatic" data-fieldtype="" data-helperbutton-count="0">'+
					'<a href="'+deductionURL+'" class="dottedlink">'+'- iTPM Deduction #'+deductionRec.getValue('tranid')+'</a></span></span></div></td></tr>';
				}else if(checkID != ''){
					form.addField({
						id : 'custpage_applyto_check',
						type : serverWidget.FieldType.TEXT,
						label : 'Applied To',
						container:'custom_primaryinfo_group'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.HIDDEN
					}).defaultValue = settlementRec.getText('custbody_itpm_set_deduction')

					var checkURL = url.resolveRecord({
						recordType: 'check',
						recordId: checkID,
						isEditMode: false
					}),
					checkRec = record.load({
						type: record.Type.CHECK,
						id: checkID
					});

					//apply to deduction field display as link
					form.addField({
						id:'custpage_applyto_checklink',
						type:serverWidget.FieldType.INLINEHTML,
						label:'Applied To',
						container:'custom_primaryinfo_group'
					}).updateBreakType({
						breakType : serverWidget.FieldBreakType.STARTCOL
					}).defaultValue = '<tr><td><div class="uir-field-wrapper" data-field-type="text" style="margin-top:5px"><span id="custom_itpm_st_promotion_desc_fs_lbl" class="smallgraytextnolink uir-label" style="">'+
					'<a class="smallgraytextnolink">Applied To</a></span>'+
					'<span class="uir-field"><span style="white-space: nowrap" id="custom_itpm_st_promotion_desc_fs" class="effectStatic" data-fieldtype="" data-helperbutton-count="0">'+
					'<a href="'+checkURL+'" class="dottedlink">'+'Check #'+checkRec.getValue('tranid')+'</a></span></span></div></td></tr>';
				} else{
					form.addField({
						id : 'custpage_applyto_empty',
						type : serverWidget.FieldType.TEXT,
						label : 'Applied To',
						container:'custom_primaryinfo_group'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.INLINE
					}).updateBreakType({
						breakType : serverWidget.FieldBreakType.STARTCOL
					});
				}
				
				/*  PRIMARY INFORMATION End  */
				
				/*  CLASSIFICATION Start  */
				form.addFieldGroup({
					id : 'custom_classification_group',
					label : 'Classification'
				});

				//Subsidary field
				form.addField({
					id:'custpage_subsidiary',
					type:serverWidget.FieldType.TEXT,
					label:'subsidiary',
					container:'custom_classification_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).defaultValue = settlementRec.getText('subsidiary');
				
				var subsid = settlementRec.getValue('subsidiary'),
				ddndept = settlementRec.getValue('department'),
				ddnclass = settlementRec.getValue('class'),
				ddnlocation = settlementRec.getValue('location');

				//currency
				form.addField({
					id : 'custom_itpm_st_currency',
					type : serverWidget.FieldType.SELECT,
					label:'Currency',
					container:'custom_classification_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).addSelectOption({
					text:settlementRec.getText('currency'),
					value:settlementRec.getValue('currency')
				})


				//location
				var locationField = form.addField({
					id:'custom_itpm_st_location',
					type:serverWidget.FieldType.SELECT,
					label:'Location',
					container:'custom_classification_group'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});

				locationField.addSelectOption({
					value:' ',
					text:' '
				});

				getList(subsid,'location').run().each(function(e){
					locationField.addSelectOption({
						value:e.getValue('internalid'),
						text:e.getValue('name'),
						isSelected:(ddnlocation == e.getValue('internalid'))
					})
					return true;
				});

				//department
				var deptField = form.addField({
					id:'custom_itpm_st_department',
					type:serverWidget.FieldType.SELECT,
					label:'Department',
					container:'custom_classification_group'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});

				deptField.addSelectOption({
					value:' ',
					text:' '
				});

				getList(subsid,'dept').run().each(function(e){
					deptField.addSelectOption({
						value:e.getValue('internalid'),
						text:e.getValue('name'),
						isSelected:(ddndept == e.getValue('internalid'))
					})
					return true;
				});

				//class
				var classField = form.addField({
					id:'custom_itpm_st_class',
					type:serverWidget.FieldType.SELECT,
					label:'Class',
					container:'custom_classification_group'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});


				classField.addSelectOption({
					value:' ',
					text:' '
				});

				getList(subsid,'class').run().each(function(e){
					classField.addSelectOption({
						value:e.getValue('internalid'),
						text:e.getValue('name'),
						isSelected:(ddnclass == e.getValue('internalid'))
					})
					return true;
				})
				/*  CLASSIFICATION End  */
				
				/*  PROMOTION INFORMATION Start  */
				form.addFieldGroup({
					id : 'custom_promoinfo_group',
					label : 'Promotion Information'
				});

				//Promotion Number field
				form.addField({
					id:'custpage_promono',
					type:serverWidget.FieldType.TEXT,
					label:'PROMOTION NUMBER',
					container:'custom_promoinfo_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).defaultValue = String(settlementRec.getValue('custbody_itpm_set_promonum'));

				//promotion/deal field to get the value in post
				form.addField({
					id:'custpage_promo_deal',
					type:serverWidget.FieldType.TEXT,
					label:'PROMOTION / DEAL'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				}).defaultValue = settlementRec.getText('custbody_itpm_set_promo');

				//Promotion field
				form.addField({
					id:'custpage_promo_deallink',
					type:serverWidget.FieldType.INLINEHTML,
					label:'PROMOTION / DEAL',
					container:'custom_promoinfo_group'
				}).defaultValue = '<tr><td><div class="uir-field-wrapper" data-field-type="text"><span id="custpage_promo_deal_fs_lbl_uir_label" class="smallgraytextnolink uir-label ">'+
				'<span id="custpage_promo_deal_fs_lbl" class="smallgraytextnolink" style=""><a class="smallgraytextnolink">PROMOTION / DEAL</a></span>'+
				'</span><span class="uir-field inputreadonly">'+
				'<a href="'+promoDealURL+'" class="dottedlink">'+settlementRec.getText('custbody_itpm_set_promo')+'</a></span></div></td></tr>'
				
				//Promotion Description field
				form.addField({
					id:'custpage_promo_desc',
					type:serverWidget.FieldType.TEXT,
					label:'PROMOTION DESCRIPTION',
					container:'custom_promoinfo_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).defaultValue = settlementRec.getValue('custbody_itpm_set_promodesc')

				//Ship start date field
				form.addField({
					id:'custpage_shstart_date',
					type:serverWidget.FieldType.TEXT,
					label:'Ship start Date',
					container:'custom_promoinfo_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				}).defaultValue = settlementRec.getText('custbody_itpm_set_promoshipstart')

				//Ship end date field
				form.addField({
					id:'custpage_shpend_date',
					type:serverWidget.FieldType.TEXT,
					label:'Ship end Date',
					container:'custom_promoinfo_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).defaultValue = settlementRec.getText('custbody_itpm_set_promoshipend')


				/*  PROMOTION INFORMATION End  */
				
				/*  TRANSACTION DETAIL Start  */
				form.addFieldGroup({
					id : 'custom_transdetail_group',
					label : 'Transaction Detail'
				});
				//Amount Field
				var settlementReqField = form.addField({
					id : 'custom_itpm_st_reql',
					type : serverWidget.FieldType.CURRENCY,
					label : 'Settlement Request',
					container:'custom_transdetail_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				});
				
				//lump sum fields
				/*var netLumSumLbltyField = form.addField({
					id : 'custpage_netlumsum_liablty',
					type : serverWidget.FieldType.CURRENCY,
					label : 'Net Liability : Lump Sum',
					container:'custom_transdetail_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				});
				netLumSumLbltyField.defaultValue = settlementRec.getValue('custbody_itpm_set_netliabilityls');*/

				//editable field
				var lumsumSetField = form.addField({
					id : 'custpage_lumsum_setreq',
					type : serverWidget.FieldType.CURRENCY,
					label : 'Settlement Request : Lump Sum',
					container:'custom_transdetail_group'
				});


				/*var lumsumOverPayField = form.addField({
					id : 'custpage_lumsum_overpay',
					type : serverWidget.FieldType.CURRENCY,
					label : 'UNDER (OVER) PAID : LUMP SUM',
					container:'custom_transdetail_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				})

				lumsumOverPayField.defaultValue = settlementRec.getValue('custbody_itpm_set_paidls');*/
				
				//off-invoice fields
			/*	var netOffInvLiabltyField = form.addField({
					id : 'custpage_netoffinvoice_liablty',
					type : serverWidget.FieldType.CURRENCY,
					label : 'Net Liability : Off-Invoice',
					container:'custom_transdetail_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				})
				netOffInvLiabltyField.defaultValue = settlementRec.getValue('custbody_itpm_set_netliabilityoi');
*/
				//editable field
				var offinvSetReqField = form.addField({
					id : 'custpage_offinvoice_setreq',
					type : serverWidget.FieldType.CURRENCY,
					label : 'Settlement request : Missed off-invoice',
					container:'custom_transdetail_group'
				})

				var reqoiValue = settlementRec.getValue('custbody_itpm_set_reqoi');
				offinvSetReqField.defaultValue = reqoiValue>0?reqoiValue:0;
				/*var offinvOverPayField = form.addField({
					id : 'custpage_offinv_overpay',
					type : serverWidget.FieldType.CURRENCY,
					label : ' UNDER (OVER) PAID : Off-Invoice',
					container:'custom_transdetail_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				})

				offinvOverPayField.defaultValue = settlementRec.getValue('custbody_itpm_set_paidoi');*/

				//bill-back fields
				/*var netBillLiabltyField = form.addField({
					id : 'custpage_netbillback_liablty',
					type : serverWidget.FieldType.CURRENCY,
					label : 'Net Liability : Bill-back',
					container:'custom_transdetail_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				})
				netBillLiabltyField.defaultValue = settlementRec.getValue('custbody_itpm_set_netliabilitybb');*/

				//editable field
				var netbillBackSetReqField = form.addField({
					id : 'custpage_billback_setreq',
					type : serverWidget.FieldType.CURRENCY,
					label : 'Settlement request : Bill back',
					container:'custom_transdetail_group'
				})

				/*var billbackOverPayField = form.addField({
					id : 'custpage_billback_overpay',
					type : serverWidget.FieldType.CURRENCY,
					label : 'UNDER (OVER) PAID : BILL-BACK',
					container:'custom_transdetail_group'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				})

				billbackOverPayField.defaultValue = settlementRec.getValue('custbody_itpm_set_paidbb');*/


				/*  TRANSACTION DETAIL End  */
				


				//promotion information
				form.addFieldGroup({
					id : 'custom_promotion_information',
					label : 'Promotion Information'
				});

				var netPromotionLiabltyField = form.addField({
					id : 'custpage_netpromo_liablty',
					type : serverWidget.FieldType.CURRENCY,
					label : 'Net Promotional Liabliity',
					container:'custom_promotion_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				});

				netPromotionLiabltyField.defaultValue = settlementRec.getValue('custbody_itpm_set_netliability');

				
				form.addField({
					id : 'custpage_memo',
					type : serverWidget.FieldType.TEXT,
					label : 'Memo',
					container:'custom_detailed_information'
				}).defaultValue = settlementRec.getValue('memo')


				promotDealSearch.each(function(e){
					var promoTypeMOP = e.getValue({name:'custrecord_itpm_pt_validmop',join:'custrecord_itpm_p_type'})
					promoTypeMOP = promoTypeMOP.split(','),
					promoTypeMOPBillBack = promoTypeMOP.some(function(b){return b == 1}),
					promoTypeMOPNetBill = promoTypeMOP.some(function(b){return b == 2}),
					promoTypeMOPOffInvoice = promoTypeMOP.some(function(b){return b == 3});

					form.addField({
						id : 'custpage_off_invallowed',
						type : serverWidget.FieldType.TEXT,
						label : 'Off invoice allowed'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.HIDDEN
					}).defaultValue = promoTypeMOPOffInvoice;

					//Validation before record load for event EDIT (in User Interface)    			 
					//If the promotion type does not allow Off-Invoice or Net Bill, do not show the off-invoice liability, request and overpay fields.
					//If the promotion type does not allow Bill Back, do not show the bill back liability, request and overpay fields.
					//If the promotion record does not have a lump sum, do not show the lump sum liability, request and overpay fields.

					if(!promoTypeMOPOffInvoice || !promoTypeMOPNetBill){
						netOffInvLiabltyField.updateDisplayType({
							displayType : serverWidget.FieldDisplayType.HIDDEN
						});
						offinvSetReqField.updateDisplayType({
							displayType : serverWidget.FieldDisplayType.HIDDEN
						});
						offinvOverPayField.updateDisplayType({
							displayType : serverWidget.FieldDisplayType.HIDDEN
						});
					}

					if(!promoTypeMOPBillBack){
						netBillLiabltyField.updateDisplayType({
							displayType : serverWidget.FieldDisplayType.HIDDEN
						});
						netbillBackSetReqField.updateDisplayType({
							displayType : serverWidget.FieldDisplayType.HIDDEN
						});
						billbackOverPayField.updateDisplayType({
							displayType : serverWidget.FieldDisplayType.HIDDEN
						});
					}

					if(e.getValue('custrecord_itpm_p_lumpsum') < 0){
						netLumSumLbltyField.updateDisplayType({
							displayType : serverWidget.FieldDisplayType.HIDDEN
						});
						lumsumSetField.updateDisplayType({
							displayType : serverWidget.FieldDisplayType.HIDDEN
						});
						lumsumOverPayField.updateDisplayType({
							displayType : serverWidget.FieldDisplayType.HIDDEN
						});
					}

				})


				//if Lump Sum Request AND Bill Back Request field values are ZERO
				//The Settlement Request field value will default to the Net Promotional Liability value.
				//The Bill Back Settlement Request field value will default to the Net Bill Back Liability field value.
				//The Lump Sum Settlement request field value will default to the difference between Settlement Request and Net Bill Back Settlement Request. 

				var billBackReq =  settlementRec.getValue('custbody_itpm_set_reqbb'),
				lumsumSetReq = settlementRec.getValue('custbody_itpm_set_reqls'); 

				if(billBackReq == 0 && lumsumSetReq == 0){
					settlementReqField.defaultValue = settlementRec.getValue('custbody_itpm_set_netliability'),
					netbillBackSetReqField.defaultValue = settlementRec.getValue('custbody_itpm_set_netliabilitybb'),
					lumsumSetField.defaultValue = settlementRec.getValue('custbody_itpm_set_amount') - settlementRec.getValue('custbody_itpm_set_reqbb');
				}else{
					settlementReqField.defaultValue = settlementRec.getValue('custbody_itpm_set_amount'),
					netbillBackSetReqField.defaultValue = settlementRec.getValue('custbody_itpm_set_reqbb'),
					lumsumSetField.defaultValue = settlementRec.getValue('custbody_itpm_set_reqls');
				}

				settlementReqField.defaultValue = settlementRec.getValue('custbody_itpm_set_amount');

				form.addSubmitButton({
					label : 'Submit'
				});

				form.addButton({
					label : 'Cancel',
					id:'custpage_cancelbtn',
					functionName:'redirectToBack'
				});

				form.clientScriptModulePath = './iTPMSettlement_ClientValidations_cs_script.js'

			    response.writePage(form)
			}


			if(request.method == 'POST'){
				log.debug('params',params)
				log.debug('otherref',params.custpage_otherref_code);
				log.debug('st_reql',params.custom_itpm_st_reql);
				log.debug('lumsum',params.custpage_lumsum_setreq);
				log.debug('billback',params.custpage_billback_setreq);
				log.debug('offinvoice',params.custpage_offinvoice_setreq);
				log.debug('memo',params.custpage_memo);

				try{
					var loadedSettlementRec = record.load({
						type:'customtransaction_itpm_settlement',
						id:params.custpage_settlement_id
					}),linecount = loadedSettlementRec.getLineCount({sublistId:'line'});
					loadedSettlementRec.setValue({
						fieldId:'custbody_itpm_set_otherrefcode',
						value:params.custpage_otherref_code
					}).setValue({
						fieldId:'custbody_itpm_set_amount',
						value:parseFloat(params.custom_itpm_st_reql.replace(/,/g,''))
					}).setValue({
						fieldId:'custbody_itpm_set_reqls',
						value:parseFloat(params.custpage_lumsum_setreq.replace(/,/g,''))
					}).setValue({
						fieldId:'custbody_itpm_set_reqoi',
						value:parseFloat(params.custpage_offinvoice_setreq.replace(/,/g,''))
					}).setValue({
						fieldId:'custbody_itpm_set_reqbb',
						value:parseFloat(params.custpage_billback_setreq.replace(/,/g,''))
					}).setValue({
						fieldId:'memo',
						value:params.custpage_memo
					});


					var sid = loadedSettlementRec.save({enableSourcing:false,ignoreMandatoryFields:true});

					redirect.toRecord({
						type:'customtransaction_itpm_settlement',
						id:sid
					});

				}catch(e){
					log.error('eerrror',e.message);
//					throw Error(e.message);
				}

			}

		}catch(e){
			log.error('excetpion in settlement on edit',e.message);
//			throw Error(e.message)
		}
		//for Location,class and department
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

	}

	return {
		onRequest: onRequest
	};

});
