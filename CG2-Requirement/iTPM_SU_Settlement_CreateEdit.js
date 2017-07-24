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
		'./iTPM_Module'
		],

function(serverWidget,search,record,redirect,format,url,ST_Module,itpm) {
   
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

    			addFieldsToTheSettlementForm(settlementForm,request.parameters);

    			response.writePage(settlementForm);
    		}

    		if(request.method == 'POST'){
//    			saveTheSettlement(request.parameters);
    			var eventType = request.parameters.custom_user_eventype;
    			var setId = null;
    			if(eventType != 'edit'){
    				setId = ST_Module.createSettlement(params);
        			if(params.custom_itpm_st_created_frm == 'ddn'){
        				params.ddn = params.custom_itpm_st_ddn_id,
        				params.sid = setId;
        				setId = ST_Module.applyToDeduction(params);
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
    	}catch(e){
    		var errObj = undefined;
    		if(e.message.search('{') > -1){
    			errObj = JSON.parse(e.message.replace(/Error: /g,''));
    		}
    		
    		if(e.message == 'settlement not completed')
    			throw Error("There already seems to be a new (zero) settlement request on this promotion. Please complete that settlement request before attempting to create another Settlement on the same promotion.");
    		else if(errObj && errObj.error == 'custom')
    			throw Error(errObj.message);
    		else if(e.name == "DEDUCTION_INVALID_STATUS")
    			throw Error(e.message);
    		else
    			log.error(e.name,'record type = -iTPM Settlement, record id = '+JSON.stringify(params)+', message = '+e.message);
    	}
    }
    
    
    //adding the fields to the settlement form
    function addFieldsToTheSettlementForm(settlementForm,params){
    	var eventType = params.type;
    	var subsidiaryExists = itpm.subsidiariesEnabled();
		var currencyExists = itpm.currenciesEnabled();
		var locationsExists = itpm.locationsEnabled();
		var departmentsExists = itpm.departmentsEnabled();
		var classesExists = itpm.classesEnabled();
		
		var isEdit = (eventType == 'edit');
		var displayTypeSetup = (isEdit)?serverWidget.FieldDisplayType.INLINE:serverWidget.FieldDisplayType.DISABLED;
		
		//iTPM prefernce record values.
		var prefObj = itpm.getPrefrenceValues();
		var perferenceLS = prefObj.perferenceLS;
		var perferenceBB = prefObj.perferenceBB;
    	
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
        	var promoTypeMOP = promoDealRec['custrecord_itpm_p_type.custrecord_itpm_pt_validmop'];
        	var customerId = promoDealRec['custrecord_itpm_p_customer'][0].value;
        	var customerText = promoDealRec['custrecord_itpm_p_customer'][0].text;
        	var promotionDesc = promoDealRec['custrecord_itpm_p_description'];
        	var promoShipStDate = promoDealRec['custrecord_itpm_p_shipstart'];
        	var promoShipEdDate = promoDealRec['custrecord_itpm_p_shipend'];
        	var promoId = pid;
        	var promoName = promoDealRec['name'];
        	
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
    		var otherRefCode = settlementRec.getValue('custbody_itpm_set_otherrefcode');
    		var defaultDate = settlementRec.getValue('trandate');
    		var appliedToTransaction = settlementRec.getValue('custbody_itpm_set_deduction');
    		var status = settlementRec.getText('transtatus');
    		var customerId = settlementRec.getValue('custbody_itpm_set_customer');
    		var customerText = settlementRec.getText('custbody_itpm_set_customer');
    		var memo = settlementRec.getValue('memo');
    		var settlementReqValue = settlementRec.getValue('custbody_itpm_set_amount');
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
        	var promoTypeMOP = promoDealRec['custrecord_itpm_p_type.custrecord_itpm_pt_validmop'];
    		
    		var promoDealURL = url.resolveRecord({
			    recordType: 'customrecord_itpm_promotiondeal',
			    recordId: settlementRec.getValue('custbody_itpm_set_promo'),
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
    		type:serverWidget.FieldType.TEXT,
    		label:'Date',
    		container:'custom_primaryinfo_group'
    	}).updateDisplayType({
			displayType : displayTypeSetup
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
	    var memoField = settlementForm.addField({
			id : 'custpage_memo',
			type : serverWidget.FieldType.TEXT,
			label : 'Memo',
			container:'custom_primaryinfo_group'
		});
	    if(!isEdit){
	    	memoField.updateDisplayType({
	    		displayType : serverWidget.FieldDisplayType.DISABLED
	    	});
	    }
	    memoField.defaultValue = (isEdit)?memo:'';
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
		    })
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
    		type:serverWidget.FieldType.TEXT,
    		label:'Promotion Description',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : displayTypeSetup
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
			}).defaultValue = ddnOpenBal;
	    }
	    
	    //settlement request
	    if(!isEdit){
	    	var settlementReqValue = (createdFromDDN)?(ddnOpenBal>netPromotionLiablty)?netPromotionLiablty:ddnOpenBal:0;
	    }
	    var settlementReqField = settlementForm.addField({
    		id:'custom_itpm_st_reql',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'AMOUNT',
    		container:'custom_transdetail_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.INLINE
    	}).defaultValue = settlementReqValue;
    	
    	//SETTLEMENT REQUEST : LUMP SUM
    	var amountLSField = settlementForm.addField({
    		id:'custpage_lumsum_setreq',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'AMOUNT : LUMP SUM',
    		container:'custom_transdetail_group'
    	}).updateDisplayType({
			displayType : (promoLumSum != 0 && promoLumSum != '')?serverWidget.FieldDisplayType.NORMAL:serverWidget.FieldDisplayType.INLINE
    	})
    	
    	if(!isEdit){
    		//reason code
    	    settlementForm.addField({
        		id:'custom_itpm_st_reason_code',
        		type:serverWidget.FieldType.SELECT,
        		label:'Reason Code',
        		source:'customlist_itpm_set_reasoncode',
        		container:'custom_transdetail_group'
        	}).updateBreakType({
    			breakType : serverWidget.FieldBreakType.STARTCOL
    		}).isMandatory = true;
    	}
    	
    	//Settlement request : Bill back
    	var amountBBField = settlementForm.addField({
    		id : 'custpage_billback_setreq',
    		type : serverWidget.FieldType.CURRENCY,
    		label : 'AMOUNT : Bill back',
    		container:'custom_transdetail_group'
    	}).updateDisplayType({
			displayType : (promoTypeMOP.some(function(e){return e.value == 1}))?serverWidget.FieldDisplayType.NORMAL:serverWidget.FieldDisplayType.INLINE
    	})
    	
    	//Settlement request : Missed off-invoice
    	settlementForm.addField({
    		id : 'custpage_offinvoice_setreq',
    		type : serverWidget.FieldType.CURRENCY,
    		label : 'AMOUNT : Missed off-invoice',
    		container:'custom_transdetail_group'
    	}).updateBreakType({
			breakType : serverWidget.FieldBreakType.STARTCOL
		}).updateDisplayType({
			displayType : (promoTypeMOP.some(function(e){return e.value == 3 || e.value == 2 }))?serverWidget.FieldDisplayType.NORMAL:serverWidget.FieldDisplayType.INLINE
    	}).defaultValue = (isEdit)?settlementRec.getValue('custbody_itpm_set_reqoi'):0;
    	
    	//setting the amount lum sum and amount bill back field values based on iTPM preferences feature
    	if(createdFromDDN && perferenceLS){
    		amountLSField.defaultValue = settlementReqValue; 
    	}else{
    		amountLSField.defaultValue = (isEdit)?settlementRec.getValue('custbody_itpm_set_reqls'):0;
    	}

    	if(createdFromDDN && perferenceBB){
    		amountBBField.defaultValue = settlementReqValue; 
    	}else{
    		amountBBField.defaultValue = (isEdit)?settlementRec.getValue('custbody_itpm_set_reqbb'):0;
    	}
    	
    	
    	/*  TRANSACTION DETAIL Start  */
	    
	    settlementForm.clientScriptModulePath = './iTPM_Attach_Settlement_ClientMethods.js';
    }
    
    return {
        onRequest: onRequest
    };
    
});
