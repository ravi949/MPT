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
		'N/runtime',
		'./iTPM_Module_Settlement.js'
		],

function(serverWidget,search,record,redirect,format,url,runtime,ST_Module) {
   
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

    			settlementForm.clientScriptModulePath = './iTPM_Attach_Settlement_Validation.js';

    			response.writePage(settlementForm);
    		}

    		if(request.method == 'POST'){
//    			saveTheSettlement(request.parameters);
    			var setId = ST_Module.createSettlement(params);
    			
    			if(params.custom_itpm_st_created_frm == 'ddn'){
    				params.ddn = params.custom_itpm_st_ddn_id,
    				params.sid = setId;
    				setId = ST_Module.applyToSettlement(params);
    			}
    			
    	    	redirect.toRecord({
    				id : setId,
    				type : 'customtransaction_itpm_settlement', 
    				isEditMode:false
    			});
    		}
    	}catch(e){
    		if(e.message == 'settlement not completed')
    			throw Error("There already seems to be a new (zero) settlement request on this promotion. Please complete that settlement request before attempting to create another Settlement on the same promotion.")
    		else
    			log.error(e.name,'record type = -iTPM Settlement, record id = '+params.sid+', message = '+e.message);
    	}
    }
    
    //adding the fields to the settlement form
    function addFieldsToTheSettlementForm(settlementForm,params){
    	var eventType = params.type;
    	var subsidiaryExists = runtime.isFeatureInEffect('subsidiaries');
		var currencyExists = runtime.isFeatureInEffect('multicurrency');
    	
    	if(eventType == 'edit'){
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
        		deductionURL = url.resolveRecord({
        			recordType: 'customtransaction_itpm_deduction',
        			recordId: params.ddn,
        			isEditMode: false
        		}),
        		ddnOpenBal = deductionRec.getValue('custbody_itpm_ddn_openbal');
        		
        		//deduction open bal value
        		settlementForm.addField({
            		id:'custom_itpm_st_ddn_openbal',
            		type:serverWidget.FieldType.TEXT,
            		label:'Deduction open balance'
            	}).updateDisplayType({
        			displayType : serverWidget.FieldDisplayType.HIDDEN
        		}).defaultValue = deductionRec.getValue('custbody_itpm_ddn_openbal');
        	}        	
    	}else if(params.from == 'setrec'){
    		var settlementRec = record.load({
    			type:'customtransaction_itpm_settlement',
    			id:params.sid
    		});
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
			displayType : serverWidget.FieldDisplayType.DISABLED
		});
		
    	//Other Reference Code
    	var otherRefCodeField = settlementForm.addField({
    		id:'custom_itpm_st_otherref_code',
    		type:serverWidget.FieldType.TEXT,
    		label:'Other Reference Code',
    		container:'custom_primaryinfo_group'
    	})
    	
    	//customer
	    settlementForm.addField({
    		id:'custom_itpm_st_cust',
    		type:serverWidget.FieldType.SELECT,
    		label:'Customer',
    		container:'custom_primaryinfo_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).addSelectOption({
			text:customerText,
			value:customerId
		})
    	
		if(customerParentId != ''){
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
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).updateBreakType({
			breakType : serverWidget.FieldBreakType.STARTCOL
		}).defaultValue = format.format({
		    value:new Date(),
		    type: format.Type.DATE
		});
	  //STATUS field 
	    settlementForm.addField({
			id:'custom_itpm_status',
			type:serverWidget.FieldType.TEXT,
			label:'STATUS',
			container:'custom_primaryinfo_group'
		}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).defaultValue = ' ';

	    //APPLIED TO

		//setting the deduction id for post method
	    if(createdFromDDN){
	    	settlementForm.addField({
	    		id:'custom_itpm_st_ddn_id',
	    		type:serverWidget.FieldType.SELECT,
	    		label:'APPLIED TO'
	    	}).updateDisplayType({
				displayType : serverWidget.FieldDisplayType.HIDDEN
			}).defaultValue = params.ddn;
	    	
	    	settlementForm.addField({
	    		id:'custom_itpm_st_ddn_idlink',
	    		type:serverWidget.FieldType.INLINEHTML,
	    		label:'Applied To',
	    		container:'custom_primaryinfo_group'
	    	}).updateBreakType({
				breakType : serverWidget.FieldBreakType.STARTCOL
			}).defaultValue = '<tr><td><div class="uir-field-wrapper" data-field-type="text" style="margin-top:5px"><span id="custom_itpm_st_promotion_desc_fs_lbl" class="smallgraytextnolink uir-label" style="">'+
	    	'<a class="smallgraytextnolink">APPLIED TO</a></span>'+
	    	'<span class="uir-field"><span style="white-space: nowrap" id="custom_itpm_st_promotion_desc_fs" class="effectStatic" data-fieldtype="" data-helperbutton-count="0">'+
	    	'<a href="'+deductionURL+'" class="dottedlink">'+'- iTPM Deduction #'+deductionRec.getValue('tranid')+'</a></span></span></div></td></tr>';
	    }else{
	    	settlementForm.addField({
		    	id : 'custpage_applyto_deduction',
		    	type : serverWidget.FieldType.TEXT,
		    	label : 'APPLIED TO',
		    	container:'custom_primaryinfo_group'
		    }).updateDisplayType({
		    	displayType : serverWidget.FieldDisplayType.DISABLED
		    }).updateBreakType({
				breakType : serverWidget.FieldBreakType.STARTCOL
			});
	    }
	    
	  //memo field
	    settlementForm.addField({
			id : 'custpage_memo',
			type : serverWidget.FieldType.TEXT,
			label : 'Memo',
			container:'custom_primaryinfo_group'
		})
		
	    /*  PRIMARY INFORMATION End  */
	    
	    /*  CLASSIFICATION Start  */
	    settlementForm.addFieldGroup({
			id : 'custom_classification_group',
			label : 'Classification'
		});
	    
	    if(subsidiaryExists){
	    	//subsidiary
			settlementForm.addField({
		    	id : 'custom_itpm_st_subsidiary',
				type : serverWidget.FieldType.SELECT,
				label:'Subsidiary',
				container:'custom_classification_group'
			}).updateDisplayType({
				displayType : serverWidget.FieldDisplayType.DISABLED
			}).addSelectOption({
				text:subsText,
				value:subsid
			})
	    }
    	
	    if(currencyExists){
	    	//currency
		    settlementForm.addField({
		    	id : 'custom_itpm_st_currency',
				type : serverWidget.FieldType.SELECT,
				label:'Currency',
				container:'custom_classification_group'
			}).updateDisplayType({
				displayType : serverWidget.FieldDisplayType.DISABLED
			}).addSelectOption({
				text:currencyText,
				value:currencyId
			})
	    }
	    
    	//location
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

	    getList(subsid,'location').run().each(function(e){
	    	locationField.addSelectOption({
			   value:e.getValue('internalid'),
			   text:e.getValue('name')
	    	})
	    	return true;
	    });

    	//department
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

	    getList(subsid,'dept').run().each(function(e){
	    	deptField.addSelectOption({
			   value:e.getValue('internalid'),
			   text:e.getValue('name')
	    	})
	    	return true;
	    });
    	
	  //class
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

	    getList(subsid,'class').run().each(function(e){
	    	classField.addSelectOption({
  			   value:e.getValue('internalid'),
  			   text:e.getValue('name')
	    	})
	    	return true;
	    })
    	
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
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).defaultValue = String(promoDealRec['internalid'][0].value)
	    
	    //promotion deal
	    settlementForm.addField({
    		id:'custom_itpm_st_promotiondeal',
    		type:serverWidget.FieldType.TEXT,
    		label:'PROMOTION / DEAL'
    	}).updateDisplayType({
		    displayType : serverWidget.FieldDisplayType.HIDDEN
		}).defaultValue = promoDealRec['internalid'][0].value;
		// promotion deal inline html field with redirection link
		settlementForm.addField({
    		id:'custom_itpm_st_promotiondeallink',
    		type:serverWidget.FieldType.INLINEHTML,
    		label:'PROMOTION / DEAL',
    		container:'custom_promotioninfo_group',
    	}).defaultValue = '<tr><td><div class="uir-field-wrapper" data-field-type="text" style="margin-top:5px"><span id="custom_itpm_st_promotion_desc_fs_lbl" class="smallgraytextnolink uir-label" style="">'+
    	'<a class="smallgraytextnolink">Promotion / Deal</a></span>'+
    	'<span class="uir-field"><span style="white-space: nowrap" id="custom_itpm_st_promotion_desc_fs" class="effectStatic" data-fieldtype="" data-helperbutton-count="0">'+
    	'<a href="'+promoDealURL+'" class="dottedlink">'+promoDealRec['name']+'</a></span></span></div></td></tr>';
		
		
	    //promotion description
	    settlementForm.addField({
    		id:'custom_itpm_st_promotion_desc',
    		type:serverWidget.FieldType.TEXT,
    		label:'Promotion Description',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).defaultValue = promoDealRec['custrecord_itpm_p_description'];
	    
	  //INCURRED PROMOTIONAL LIABILITY
	    settlementForm.addField({
    		id:'custom_itpm_st_incrd_promolbty',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'MAXIMUM PROMOTION LIABILITY',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
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
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).defaultValue = netPromotionLiablty;
	    
	  

	    //ship start date
	    settlementForm.addField({
    		id:'custom_itpm_st_shp_stdate',
    		type:serverWidget.FieldType.TEXT,
    		label:'Ship Start Date',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).updateBreakType({
			breakType : serverWidget.FieldBreakType.STARTCOL
		}).defaultValue = promoDealRec['custrecord_itpm_p_shipstart'];

	    //ship end date
	    settlementForm.addField({
    		id:'custom_itpm_st_shp_endate',
    		type:serverWidget.FieldType.TEXT,
    		label:'Ship End Date',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).defaultValue = promoDealRec['custrecord_itpm_p_shipend'];
	    
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
	    var settlementReqValue = (createdFromDDN)?(ddnOpenBal>netPromotionLiablty)?netPromotionLiablty:ddnOpenBal:0;
	    var settlementReqField = settlementForm.addField({
    		id:'custom_itpm_st_reql',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'AMOUNT',
    		container:'custom_transdetail_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.INLINE
    	});
	    
    	settlementReqField.defaultValue = settlementReqValue;
    	
    	//SETTLEMENT REQUEST : LUMP SUM
    	settlementForm.addField({
    		id:'custpage_lumsum_setreq',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'AMOUNT : LUMP SUM',
    		container:'custom_transdetail_group'
    	}).updateDisplayType({
			displayType : (promoLumSum != 0 && promoLumSum != '')?serverWidget.FieldDisplayType.NORMAL:serverWidget.FieldDisplayType.INLINE
    	}).defaultValue = 0;
    	
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
	    
    	//Settlement request : Bill back
    	settlementForm.addField({
    		id : 'custpage_billback_setreq',
    		type : serverWidget.FieldType.CURRENCY,
    		label : 'AMOUNT : Bill back',
    		container:'custom_transdetail_group'
    	}).updateDisplayType({
			displayType : (promoTypeMOP.some(function(e){return e.value == 1}))?serverWidget.FieldDisplayType.NORMAL:serverWidget.FieldDisplayType.INLINE
    	}).defaultValue = 0;
    	
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
    	}).defaultValue = 0;
    	
    	/*  TRANSACTION DETAIL Start  */
	    
	    settlementForm.clientScriptModulePath = './iTPM_Attach_Settlement_Validation.js'
    }
    
    //get the class,location and department
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
    		filters:[['isinactive','is',false],'and',['subsidiary','is',subid]]
    	});
    }
    
    return {
        onRequest: onRequest
    };
    
});
