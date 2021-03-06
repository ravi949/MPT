/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Designing the view of settlement
 */
define(['N/ui/serverWidget',
		'N/search',
		'N/record',
		'N/redirect',
		'N/format',
		'N/url',
		'./iTPM_Module_Settlement.js',
		'./iTPM_Module.js'
		],

function(serverWidget, search, record, redirect, format, url, ST_Module, itpm) {
   
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
    			createSettlementForm(request,response);
    		}else if(request.method == 'POST'){
    			submitSettlementForm(request,response);
    		}
    	}catch(e){    	
    		log.error(e.name,e.message);
    		if(e.name == 'SETTLEMENT_NOT_COMPLETED')
    			throw Error(e.message);
    		else if(e.name == 'CUSTOM')
    			throw Error(e.message);
    		else if(e.name == "DEDUCTION_INVALID_STATUS")
    			throw Error(e.message);
    		else if(e.name == "INVALID_AMOUNT")
    			throw Error(e.message);
    		else{
    			log.error(e.name,'record type = -iTPM Settlement, record id = '+JSON.stringify(params)+', message = '+e.message);
    			throw Error(e.message);
    		}
    	}
    }
    
    
    /**
     * @param request
     * @param response
     * @Description Create the settlement form
     */
    function createSettlementForm(request, response){
    	var params = request.parameters;
    	var settlementForm = serverWidget.createForm({
			title : '- iTPM Settlement'
		});

		settlementForm.addSubmitButton({
			label : 'Submit'
		});

		settlementForm.addButton({
			label : 'Cancel',
			id:'custpage_cancelbtn',
			functionName:'redirectToBack'
		});
    	
    	var eventType = params.type;
    	var subsidiaryExists = itpm.subsidiariesEnabled();
		var currencyExists = itpm.currenciesEnabled();
		var locationsExists = itpm.locationsEnabled();
		var departmentsExists = itpm.departmentsEnabled();
		var classesExists = itpm.classesEnabled();		
		var isEdit = (eventType == 'edit');
		var displayTypeSetup = (isEdit)?serverWidget.FieldDisplayType.INLINE:serverWidget.FieldDisplayType.DISABLED;
    	
    	if(isEdit){
    		settlementForm.addField({
				id : 'custom_user_eventype',
				type : serverWidget.FieldType.TEXT,
				label:'Record Event Type'
			}).updateDisplayType({
				displayType : serverWidget.FieldDisplayType.HIDDEN
			}).defaultValue = params.type;
    	}
    	
    	
    	if(params.from == 'promo' || params.from == 'ddn'){    		
    		var pid = params.pid,createdFromDDN = (params.from == 'ddn');
    		
    		//it checks for deduction record status
    		if(createdFromDDN){
    			var deductionRec = record.load({
    				type:'customtransaction_itpm_deduction',
    				id:params.ddn
    			});
    			
    			if(deductionRec.getValue('transtatus') != 'A'){
    				throw {
    					name:'DEDUCTION_INVALID_STATUS',
    					message:'You cannot create a settlement for this deduction'
    				};
    			}
    		}
        	
    		var promoDealRec = search.lookupFields({
        		type:'customrecord_itpm_promotiondeal',
        		id:pid,
        		columns:['internalid','name','custrecord_itpm_p_lumpsum','custrecord_itpm_p_type.custrecord_itpm_pt_validmop','custrecord_itpm_p_description','custrecord_itpm_p_shipstart','custrecord_itpm_p_shipend','custrecord_itpm_p_netpromotionalle','custrecord_itpm_p_subsidiary','custrecord_itpm_p_currency','custrecord_itpm_p_customer','custrecord_itepm_p_incurredpromotionalle']
    		});
    		//loading the record for NET PROMOTIONAL LIABLIITY, INCURRED PROMOTIONAL LIABILITY fields(These are did not return a value in lookupFields method)
    		var promotionRec = record.load({
				type:'customrecord_itpm_promotiondeal',
				id:pid
			});
//    		incrdPromotionLiablty = (promoDealRec['custrecord_itepm_p_incurredpromotionalle'] == '' || promoDealRec['custrecord_itepm_p_incurredpromotionalle'] == 'ERROR: Invalid Expression')?0:promoDealRec['custrecord_itepm_p_incurredpromotionalle'],
//        	netPromotionLiablty = (promoDealRec['custrecord_itpm_p_netpromotionalle'] == '' || promoDealRec['custrecord_itpm_p_netpromotionalle'] == 'ERROR: Invalid Expression')?0:promoDealRec['custrecord_itpm_p_netpromotionalle'],
			var incrdPromotionLiablty = promotionRec.getValue({fieldId:'custrecord_itepm_p_incurredpromotionalle'});
			var netPromotionLiablty = promotionRec.getValue({fieldId:'custrecord_itpm_p_netpromotionalle'});
        	var promoLumSum = parseFloat(promoDealRec['custrecord_itpm_p_lumpsum']);
        	var customerId = promoDealRec['custrecord_itpm_p_customer'][0].value;
        	var customerText = promoDealRec['custrecord_itpm_p_customer'][0].text;
        	var promotionDesc = promoDealRec['custrecord_itpm_p_description'];
        	var promoShipStDate = promoDealRec['custrecord_itpm_p_shipstart'];
        	var promoShipEdDate = promoDealRec['custrecord_itpm_p_shipend'];
        	var promoId = pid;
        	var promoName = promoDealRec['name'];
        	var promoHasAllBB = ST_Module.getAllowanceMOP(promoId,1);
        	var promoHasAllOI = ST_Module.getAllowanceMOP(promoId,3);
        	var promoHasAllNB = ST_Module.getAllowanceMOP(promoId,2);
        	if(subsidiaryExists){
        		var subsid = promoDealRec['custrecord_itpm_p_subsidiary'][0].value;
            	var subsText = promoDealRec['custrecord_itpm_p_subsidiary'][0].text;
        	}
        	
        	if(currencyExists){
        		var currencyId = promoDealRec['custrecord_itpm_p_currency'][0].value;
            	var currencyText = promoDealRec['custrecord_itpm_p_currency'][0].text;
        	}
        	
        	var customerRec = record.load({
        		type:record.Type.CUSTOMER,
        		id:customerId
        	});
        	var customerParentId = customerRec.getValue('parent');
			var customerParentText = customerRec.getText('parent');
			var defaultDate = new Date();
			
			var promoDealURL = url.resolveRecord({
			    recordType: 'customrecord_itpm_promotiondeal',
			    recordId: pid,
			    isEditMode: false
			});
    		
    		//created from settlement record
        	settlementForm.addField({
        		id:'custom_itpm_st_created_frm',
        		type:serverWidget.FieldType.TEXT,
        		label:'created from'
        	}).updateDisplayType({
    			displayType : serverWidget.FieldDisplayType.HIDDEN
    		}).defaultValue = params.from;
    		
        	
        	if(params.from == 'ddn'){
        		//loading the deduction values
        		var deductionRec = record.load({
        			type:'customtransaction_itpm_deduction',
        			id:params.ddn
        		}),
        		appliedToURL = url.resolveRecord({
        			recordType: 'customtransaction_itpm_deduction',
        			recordId: params.ddn,
        			isEditMode: false
        		}),
        		ddnOpenBal = deductionRec.getValue('custbody_itpm_ddn_openbal');
        		
        		var appliedToText = deductionRec.getValue('tranid');
        		
        		//deduction open bal value
        		settlementForm.addField({
            		id:'custom_itpm_st_ddn_openbal',
            		type:serverWidget.FieldType.TEXT,
            		label:'Deduction open balance'
            	}).updateDisplayType({
        			displayType : serverWidget.FieldDisplayType.HIDDEN
        		}).defaultValue = deductionRec.getValue('custbody_itpm_ddn_openbal');
        	}        	
    	}else if(isEdit){
    		var settlementRec = record.load({
    			type:'customtransaction_itpm_settlement',
    			id:params.sid
    		});
    		var entryNo = settlementRec.getValue('tranid');
    		var otherRefCode = settlementRec.getValue('custbody_itpm_otherrefcode');
    		var defaultDate = settlementRec.getValue('trandate');
    		var appliedToTransaction = settlementRec.getValue('custbody_itpm_appliedto');
    		var status = settlementRec.getText('transtatus');
    		var customerId = settlementRec.getValue('custbody_itpm_customer');
    		var customerText = settlementRec.getText('custbody_itpm_customer');
    		var memo = settlementRec.getValue('memo');
    		var settlementReqValue = settlementRec.getValue('custbody_itpm_amount');
    		var incrdPromotionLiablty = settlementRec.getValue('custbody_itpm_set_incrd_promoliability');
			var netPromotionLiablty = settlementRec.getValue('custbody_itpm_set_netliability');
			var promotionDesc = settlementRec.getValue('custbody_itpm_set_promodesc');
        	var promoShipStDate = settlementRec.getValue('custbody_itpm_set_promoshipstart');
        	var promoShipEdDate = settlementRec.getValue('custbody_itpm_set_promoshipend');
        	var promoId = settlementRec.getValue('custbody_itpm_set_promo');
        	var promoName = settlementRec.getText('custbody_itpm_set_promo');
        	var promoDealRec = search.lookupFields({
        		type:'customrecord_itpm_promotiondeal',
        		id:promoId,
        		columns:['internalid','name','custrecord_itpm_p_lumpsum','custrecord_itpm_p_type.custrecord_itpm_pt_validmop']
    		}); 
        	
        	var promoLumSum = parseFloat(promoDealRec['custrecord_itpm_p_lumpsum']);
        	var promoHasAllBB = ST_Module.getAllowanceMOP(promoId,1);
        	var promoHasAllOI = ST_Module.getAllowanceMOP(promoId,3);
        	var promoHasAllNB = ST_Module.getAllowanceMOP(promoId,2);
        	
    		var promoDealURL = url.resolveRecord({
			    recordType: 'customrecord_itpm_promotiondeal',
			    recordId: promoId,
			    isEditMode: false
			});
    		
    		var promoName = settlementRec.getText('custbody_itpm_set_promo');
    		
    		if(subsidiaryExists){
    			var subsid = settlementRec.getValue('subsidiary');
          		var subsText = settlementRec.getText('subsidiary');
    		}
    		if(currencyExists){
    			var currencyText = settlementRec.getText('currency');
    		}
    		if(locationsExists){
    			var locationSet = settlementRec.getValue('location');
    		}
    		if(departmentsExists){
        		var deptSet = settlementRec.getValue('department');
    		}
    		if(classesExists){
    			var classSet = settlementRec.getValue('class');
    		}
    		
    		settlementForm.addField({
        		id:'custom_itpm_st_recordid',
        		type:serverWidget.FieldType.TEXT,
        		label:'Settlement Rec Id'
        	}).updateDisplayType({
    			displayType :  serverWidget.FieldDisplayType.HIDDEN
    		}).defaultValue = params.sid;
    	}
    	
    	/*  PRIMARY INFORMATION Start  */
    	settlementForm.addFieldGroup({
		    id : 'custom_primaryinfo_group',
		    label : 'Primary Information'
		});
    	
    	 //ENTRY NO.
	    settlementForm.addField({
    		id:'custom_itpm_st_entry_no',
    		type:serverWidget.FieldType.TEXT,
    		label:'ENTRY NO.',
    		container:'custom_primaryinfo_group'
    	}).updateDisplayType({
			displayType : displayTypeSetup
		}).defaultValue = (isEdit)?entryNo:'';
		
    	//Other Reference Code
    	settlementForm.addField({
    		id:'custom_itpm_st_otherref_code',
    		type:serverWidget.FieldType.TEXT,
    		label:'Other Reference Code',
    		container:'custom_primaryinfo_group'
    	}).updateDisplayType({
			displayType : (isEdit)?serverWidget.FieldDisplayType.INLINE:serverWidget.FieldDisplayType.NORMAL
		}).defaultValue = (isEdit)?otherRefCode:'';

    	//customer
	    var customerField = settlementForm.addField({
    		id:'custom_itpm_st_cust',
    		type:(isEdit)?serverWidget.FieldType.TEXT:serverWidget.FieldType.SELECT,
    		label:'Customer',
    		container:'custom_primaryinfo_group'
    	}).updateDisplayType({
			displayType : displayTypeSetup
		})
		
		if(isEdit){
			customerField.defaultValue = customerText;
		}else{
			customerField.addSelectOption({
				text:customerText,
				value:customerId
			})
		}
		
    	
		if(customerParentId && customerParentId != ''){
		    //customer parent
		    settlementForm.addField({
	    		id:'custom_itpm_st_cust_parent',
	    		type:serverWidget.FieldType.SELECT,
	    		label:'Customer Parent',
	    		container:'custom_primaryinfo_group'
	    	}).updateDisplayType({
				displayType : serverWidget.FieldDisplayType.DISABLED
			}).addSelectOption({
				text:customerParentText,
				value:customerParentId
			})
		}
		
    	//Date
	    settlementForm.addField({
    		id:'custom_itpm_st_date',
    		type:serverWidget.FieldType.DATE,
    		label:'Date',
    		container:'custom_primaryinfo_group'
    	}).updateBreakType({
			breakType : serverWidget.FieldBreakType.STARTCOL
		}).defaultValue = format.format({
		    value:defaultDate,
		    type: format.Type.DATE
		});
		
	  //STATUS field 
	    settlementForm.addField({
			id:'custom_itpm_status',
			type:serverWidget.FieldType.TEXT,
			label:'STATUS',
			container:'custom_primaryinfo_group'
		}).updateDisplayType({
			displayType : displayTypeSetup
		}).defaultValue = (isEdit)?status:' ';

	    //APPLIED TO
		//setting the deduction id for post method
	    var appliedToTransactionField = settlementForm.addField({
	    	id : 'custom_itpm_st_appliedtransction',
	    	type : serverWidget.FieldType.SELECT,
	    	label : 'APPLIED TO TRANSACTION',
	    	container:'custom_primaryinfo_group',
	    	source:'transaction'
	    }).updateBreakType({
			breakType : serverWidget.FieldBreakType.STARTCOL
		});
	    
	    if(createdFromDDN){
	    	//deduction record id for apply to deduction operation
		    settlementForm.addField({
	    		id:'custom_itpm_st_ddn_id',
	    		type:serverWidget.FieldType.INTEGER,
	    		label:'Deduction Record Id',
	    		container:'custom_transdetail_group'
	    	}).updateDisplayType({
				displayType : serverWidget.FieldDisplayType.HIDDEN
			}).defaultValue = params.ddn;
	    	
		    //applied to transaction value
	    	appliedToTransactionField.updateDisplayType({
				displayType : serverWidget.FieldDisplayType.INLINE
			}).defaultValue = params.ddn;
	    }else{
	    	appliedToTransactionField.updateDisplayType({
		    	displayType : displayTypeSetup
		    });
	    	
	    	if(appliedToTransaction)
	    		appliedToTransactionField.defaultValue = appliedToTransaction;
	    }
	    
	    //memo field
	    settlementForm.addField({
			id : 'custpage_memo',
			type : serverWidget.FieldType.TEXT,
			label : 'Memo',
			container:'custom_primaryinfo_group'
		}).defaultValue = (isEdit)?memo:'';
	    
	    /*  PRIMARY INFORMATION End  */
	    
	    /*  CLASSIFICATION Start  */
	    settlementForm.addFieldGroup({
			id : 'custom_classification_group',
			label : 'Classification'
		});
	    
	    if(subsidiaryExists){
	    	//subsidiary
			var subsidiaryField = settlementForm.addField({
		    	id : 'custom_itpm_st_subsidiary',
				type : (isEdit)?serverWidget.FieldType.TEXT:serverWidget.FieldType.SELECT,
				label:'Subsidiary',
				container:'custom_classification_group'
			}).updateDisplayType({
				displayType :displayTypeSetup
			})
			
			if(isEdit){
				subsidiaryField.defaultValue = subsText;
			}else{
				subsidiaryField.addSelectOption({
					text:subsText,
					value:subsid
				})
			}
	    }
    	
	    
	    if(currencyExists){
	    	//currency
		    var currencyField = settlementForm.addField({
		    	id : 'custom_itpm_st_currency',
				type : (isEdit)?serverWidget.FieldType.TEXT:serverWidget.FieldType.SELECT,
				label:'Currency',
				container:'custom_classification_group'
			}).updateDisplayType({
				displayType : displayTypeSetup
			})
			
			if(isEdit){
				currencyField.defaultValue = currencyText;
			}else{
				currencyField.addSelectOption({
					text:currencyText,
					value:currencyId
				})
			}
	    }
	    
	  //department
	    if(departmentsExists){
	    	var deptField = settlementForm.addField({
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

		    itpm.getClassifications(subsid, 'dept', subsidiaryExists).forEach(function(e){
		    	deptField.addSelectOption({
				   value:e.id,
				   text:e.name,
				   isSelected:deptSet == e.id
		    	})
		    	return true;
		    });
	    }
    	
	    //class
	    if(classesExists){
	    	var classField = settlementForm.addField({
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

	    	itpm.getClassifications(subsid, 'class', subsidiaryExists).forEach(function(e){
		    	classField.addSelectOption({
	  			   value:e.id,
	  			   text:e.name,
	  			 isSelected:classSet == e.id
		    	})
		    	return true;
		    });
	    }
	    
    	//location
	    if(locationsExists){
	    	var locationField = settlementForm.addField({
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

		    itpm.getClassifications(subsid, 'location', subsidiaryExists).forEach(function(e){
		    	locationField.addSelectOption({
				   value:e.id,
				   text:e.name,
				   isSelected:locationSet == e.id
		    	})
		    	return true;
		    });
	    }

	    /*  CLASSIFICATION end  */
	   
	    /*  PROMOTION INFORMATION Start  */
	    settlementForm.addFieldGroup({
		    id : 'custom_promotioninfo_group',
		    label : 'Promotion Information'
		});
	    
	    //promotion number
	    settlementForm.addField({
    		id:'custom_itpm_st_promotion_no',
    		type:serverWidget.FieldType.TEXT,
    		label:'Promotion Number',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : displayTypeSetup
		}).defaultValue = promoId;
	    
	    //promotion deal
	    settlementForm.addField({
	    	id:'custom_itpm_st_promotiondeal',
	    	type:serverWidget.FieldType.SELECT,
	    	label:'PROMOTION / DEAL',
	    	container:'custom_promotioninfo_group',
	    	source:'customrecord_itpm_promotiondeal'
	    }).updateDisplayType({
	    	displayType : serverWidget.FieldDisplayType.INLINE
	    }).defaultValue = promoId;
		
		
	    //promotion description
	    settlementForm.addField({
    		id:'custom_itpm_st_promotion_desc',
    		type:serverWidget.FieldType.TEXTAREA,
    		label:'Promotion Description',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : displayTypeSetup
		}).updateBreakType({
			breakType : serverWidget.FieldBreakType.STARTCOL
		}).defaultValue = promotionDesc;
	    
	  //INCURRED PROMOTIONAL LIABILITY
	    settlementForm.addField({
    		id:'custom_itpm_st_incrd_promolbty',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'MAXIMUM PROMOTION LIABILITY',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : displayTypeSetup
		}).updateBreakType({
			breakType : serverWidget.FieldBreakType.STARTCOL
		}).defaultValue = incrdPromotionLiablty;
	    
	   //NET PROMOTIONAL LIABLIITY
	    settlementForm.addField({
    		id:'custom_itpm_st_net_promolbty',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'NET PROMOTIONAL LIABLIITY',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : displayTypeSetup
		}).defaultValue = netPromotionLiablty;
	   
	    //ship start date
	    settlementForm.addField({
    		id:'custom_itpm_st_shp_stdate',
    		type:serverWidget.FieldType.TEXT,
    		label:'Ship Start Date',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType :displayTypeSetup
		}).updateBreakType({
			breakType : serverWidget.FieldBreakType.STARTCOL
		}).defaultValue = promoShipStDate;

	    //ship end date
	    settlementForm.addField({
    		id:'custom_itpm_st_shp_endate',
    		type:serverWidget.FieldType.TEXT,
    		label:'Ship End Date',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : displayTypeSetup
		}).defaultValue = promoShipEdDate;
	    
	    /*  PROMOTION INFORMATION End  */
	    
	    /*  TRANSACTION DETAIL Start  */
	    
	    settlementForm.addFieldGroup({
		    id : 'custom_transdetail_group',
		    label : 'Transaction Detail'
		});
	    
	    if(createdFromDDN){
	    	//deduction open balance value for reference 
		    settlementForm.addField({
	    		id:'custom_itpm_ddn_openbal',
	    		type:serverWidget.FieldType.CURRENCY,
	    		label:'Deduction Open Balance',
	    		container:'custom_transdetail_group'
	    	}).updateDisplayType({
				displayType : serverWidget.FieldDisplayType.DISABLED
			}).defaultValue = format.parse({value:ddnOpenBal, type: format.Type.CURRENCY}).toFixed(2);
		    if(departmentsExists){deptField.defaultValue = deductionRec.getValue('department');}
		    if(locationsExists){locationField.defaultValue = deductionRec.getValue('location');}	    
		    if(locationsExists){classField.defaultValue = deductionRec.getValue('class');}
	    }
	    
	    //settlement request
	    settlementReqValue = (isEdit)?settlementReqValue:0;
	    
	    var settlementReqField = settlementForm.addField({
    		id:'custom_itpm_st_reql',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'AMOUNT',
    		container:'custom_transdetail_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
    	}).defaultValue = format.parse({value:settlementReqValue, type: format.Type.CURRENCY}).toFixed(2);
    	
    	//SETTLEMENT REQUEST : LUMP SUM
    	var amountLSField = settlementForm.addField({
    		id:'custpage_lumsum_setreq',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'AMOUNT : LUMP SUM',
    		container:'custom_transdetail_group'
    	}).updateDisplayType({
			displayType : (promoLumSum > 0 || promoHasAllNB)?serverWidget.FieldDisplayType.NORMAL:serverWidget.FieldDisplayType.DISABLED
    	});
    	
    	//Settlement request : Bill back
    	var amountBBField = settlementForm.addField({
    		id : 'custpage_billback_setreq',
    		type : serverWidget.FieldType.CURRENCY,
    		label : 'AMOUNT : Bill back',
    		container:'custom_transdetail_group'
    	}).updateDisplayType({
			displayType : (promoHasAllBB)?serverWidget.FieldDisplayType.NORMAL:serverWidget.FieldDisplayType.DISABLED
    	});
    	
    	//Settlement request : Missed off-invoice
    	settlementForm.addField({
    		id : 'custpage_offinvoice_setreq',
    		type : serverWidget.FieldType.CURRENCY,
    		label : 'AMOUNT : Missed off-invoice',
    		container:'custom_transdetail_group'
    	}).updateBreakType({
			breakType : serverWidget.FieldBreakType.STARTCOL
		}).updateDisplayType({
			displayType : (promoHasAllOI)?serverWidget.FieldDisplayType.NORMAL:serverWidget.FieldDisplayType.DISABLED
    	}).defaultValue = (isEdit)?format.parse({value:settlementRec.getValue('custbody_itpm_set_reqoi'), type: format.Type.CURRENCY}).toFixed(2):0;
    	
    	//setting the amount lum sum and amount bill back field values based on iTPM preferences feature
    	amountLSField.defaultValue = (isEdit)?format.parse({value:settlementRec.getValue('custbody_itpm_set_reqls'), type: format.Type.CURRENCY}).toFixed(2):0;
    	amountBBField.defaultValue = (isEdit)?format.parse({value:settlementRec.getValue('custbody_itpm_set_reqbb'), type: format.Type.CURRENCY}).toFixed(2):0;
    	
    	/*  TRANSACTION DETAIL Start  */
	    
	    settlementForm.clientScriptModulePath = './iTPM_Attach_Settlement_ClientMethods.js';
	    response.writePage(settlementForm);
    }
    
    
    /**
     * @param request
     * @param response
     * @Description submit the settlement record to the server
     */
    function submitSettlementForm(request, response){
    	var params = request.parameters;
    	//validation for creating settlement from deduction
		if(params.custom_itpm_st_created_frm == 'ddn'){
			itpm.validateDeductionOpenBal(params.custom_itpm_st_ddn_id,params['custom_itpm_st_reql'].replace(/,/g,''));
		}

		var eventType = request.parameters.custom_user_eventype;
		var setId = null;
		if(eventType != 'edit'){
			setId = ST_Module.createSettlement(params);
			if(params.custom_itpm_st_created_frm == 'ddn'){
				params.ddn = params.custom_itpm_st_ddn_id,
				params.sid = setId;
				setId = ST_Module.applyToDeduction(params,'D');//Here 'D' indicating Deduction.
			}
		}else if(eventType == 'edit'){
			setId = ST_Module.editSettlement(params);
		}
		
    	redirect.toRecord({
			id : setId,
			type : 'customtransaction_itpm_settlement', 
			isEditMode:false
		});
    }
    
    return {
        onRequest: onRequest
    };
    
});
