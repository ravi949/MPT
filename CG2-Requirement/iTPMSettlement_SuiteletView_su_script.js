/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * Designing the view of settlement
 */
define(['N/ui/serverWidget','N/search','N/record','N/redirect','N/config','N/format','N/url'],

function(serverWidget,search,record,redirect,config,format,url) {
   
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

    			settlementForm.clientScriptModulePath = './iTPMSettlement_ClientValidations_cs_script.js';

    			response.writePage(settlementForm);
    		}

    		if(request.method == 'POST'){
    			//log.debug('parameters',request.parameters)
    			saveTheSettlement(request.parameters);
    		}
    	}catch(e){
    		log.debug('exception in settlemet suitlet',e);
    		throw Error(e.message)
    	}
    }
    
    //adding the fields to the settlement form
    function addFieldsToTheSettlementForm(settlementForm,params){
    	
    	//created from settlement record
    	settlementForm.addField({
    		id:'custom_itpm_st_created_frm',
    		type:serverWidget.FieldType.TEXT,
    		label:'created from'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.HIDDEN
		}).defaultValue = params.from;
    	
    	
    	if(params.from == 'promo' || params.from == 'ddn'){
    		var pid = params.pid,createdFromDDN = (params.from == 'ddn');
        	
    		var promoDealRec = search.lookupFields({
        		type:'customrecord_itpm_promotiondeal',
        		id:pid,
        		columns:['internalid','name','custrecord_itpm_p_lumpsum','custrecord_itpm_p_type.custrecord_itpm_pt_validmop','custrecord_itpm_p_description','custrecord_itpm_p_shipstart','custrecord_itpm_p_shipend','custrecord_itpm_p_netpromotionalle','custrecord_itpm_p_subsidiary','custrecord_itpm_p_currency','custrecord_itpm_p_customer','custrecord_itepm_p_incurredpromotionalle']
    		}),
    		//loading the record for NET PROMOTIONAL LIABLIITY, INCURRED PROMOTIONAL LIABILITY fields(These are did not return a value in lookupFields method)
    		promotionRec = record.load({
				type:'customrecord_itpm_promotiondeal',
				id:pid
			}),
//    		incrdPromotionLiablty = (promoDealRec['custrecord_itepm_p_incurredpromotionalle'] == '' || promoDealRec['custrecord_itepm_p_incurredpromotionalle'] == 'ERROR: Invalid Expression')?0:promoDealRec['custrecord_itepm_p_incurredpromotionalle'],
//        	netPromotionLiablty = (promoDealRec['custrecord_itpm_p_netpromotionalle'] == '' || promoDealRec['custrecord_itpm_p_netpromotionalle'] == 'ERROR: Invalid Expression')?0:promoDealRec['custrecord_itpm_p_netpromotionalle'],
			incrdPromotionLiablty = promotionRec.getValue({fieldId:'custrecord_itepm_p_incurredpromotionalle'}),
			netPromotionLiablty = promotionRec.getValue({fieldId:'custrecord_itpm_p_netpromotionalle'}),
        	promoLumSum = parseFloat(promoDealRec['custrecord_itpm_p_lumpsum']),
        	promoTypeMOP = promoDealRec['custrecord_itpm_p_type.custrecord_itpm_pt_validmop'],
        	subsid = promoDealRec['custrecord_itpm_p_subsidiary'][0].value,
        	subsText = promoDealRec['custrecord_itpm_p_subsidiary'][0].text,
        	currencyId = promoDealRec['custrecord_itpm_p_currency'][0].value,
        	currencyText = promoDealRec['custrecord_itpm_p_currency'][0].text,
        	customerId = promoDealRec['custrecord_itpm_p_customer'][0].value,
        	customerText = promoDealRec['custrecord_itpm_p_customer'][0].text,
        	customerRec = record.load({
        		type:record.Type.CUSTOMER,
        		id:customerId
        	}),
        	customerParentId = customerRec.getValue('parent'),
			customerParentText = customerRec.getText('parent'),
			promoDealURL = url.resolveRecord({
			    recordType: 'customrecord_itpm_promotiondeal',
			    recordId: pid,
			    isEditMode: false
			});
        	
        	if(params.from == 'ddn'){
        		//loading the deduction values
            	if(createdFromDDN){
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
            	}
        		
        		//deduction open bal value
        		settlementForm.addField({
            		id:'custom_itpm_st_ddn_openbal',
            		type:serverWidget.FieldType.TEXT,
            		label:'Deduction open balance'
            	}).updateDisplayType({
        			displayType : serverWidget.FieldDisplayType.HIDDEN
        		}).defaultValue = deductionRec.getValue('custbody_itpm_ddn_openbal');
        	}
    	}
    	
    	settlementForm.addFieldGroup({
		    id : 'custom_primaryinfo_group',
		    label : 'Primary Information'
		});
    	
    	//primary info group fields
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
    	
    	//subsidiary
		settlementForm.addField({
	    	id : 'custom_itpm_st_subsidiary',
			type : serverWidget.FieldType.SELECT,
			label:'Subsidiary',
			container:'custom_primaryinfo_group'
		}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).updateBreakType({
			breakType : serverWidget.FieldBreakType.STARTCOL
		}).addSelectOption({
			text:subsText,
			value:subsid
		})
    	
    	
		//currency
	    settlementForm.addField({
	    	id : 'custom_itpm_st_currency',
			type : serverWidget.FieldType.SELECT,
			label:'Currency',
			container:'custom_primaryinfo_group'
		}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).addSelectOption({
			text:currencyText,
			value:currencyId
		})
    	
    	//class
    	var classField = settlementForm.addField({
    		id:'custom_itpm_st_class',
    		type:serverWidget.FieldType.SELECT,
    		label:'Class',
    		container:'custom_primaryinfo_group'
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
    	

    	//department
    	var deptField = settlementForm.addField({
    		id:'custom_itpm_st_department',
    		type:serverWidget.FieldType.SELECT,
    		label:'Department',
    		container:'custom_primaryinfo_group'
    	})
    	
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
    	
    	//location
    	var locationField = settlementForm.addField({
    		id:'custom_itpm_st_location',
    		type:serverWidget.FieldType.SELECT,
    		label:'Location',
    		container:'custom_primaryinfo_group'
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
	    
	   
	    //promotion field group
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
	    
	   //net promotion liablity
	    settlementForm.addField({
    		id:'custom_itpm_st_net_promolbty',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'NET PROMOTIONAL LIABLIITY',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).defaultValue = netPromotionLiablty;
	    
	  //INCURRED PROMOTIONAL LIABILITY
	    settlementForm.addField({
    		id:'custom_itpm_st_incrd_promolbty',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'INCURRED PROMOTIONAL LIABILITY',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).defaultValue = incrdPromotionLiablty;
	    
		//setting the deduction id for post method
	    if(createdFromDDN){
	    	settlementForm.addField({
	    		id:'custom_itpm_st_ddn_id',
	    		type:serverWidget.FieldType.SELECT,
	    		label:'Apply To Deduction'
	    	}).updateDisplayType({
				displayType : serverWidget.FieldDisplayType.HIDDEN
			}).defaultValue = params.ddn;
	    	
	    	settlementForm.addField({
	    		id:'custom_itpm_st_ddn_idlink',
	    		type:serverWidget.FieldType.INLINEHTML,
	    		label:'Apply To Deduction',
	    		container:'custom_promotioninfo_group'
	    	}).defaultValue = '<tr><td><div class="uir-field-wrapper" data-field-type="text" style="margin-top:5px"><span id="custom_itpm_st_promotion_desc_fs_lbl" class="smallgraytextnolink uir-label" style="">'+
	    	'<a class="smallgraytextnolink">Apply To Deduction</a></span>'+
	    	'<span class="uir-field"><span style="white-space: nowrap" id="custom_itpm_st_promotion_desc_fs" class="effectStatic" data-fieldtype="" data-helperbutton-count="0">'+
	    	'<a href="'+deductionURL+'" class="dottedlink">'+deductionRec.getValue('tranid')+'</a></span></span></div></td></tr>';
	    }

	    //ship start date
	    settlementForm.addField({
    		id:'custom_itpm_st_shp_stdate',
    		type:serverWidget.FieldType.TEXT,
    		label:'Ship Start Date',
    		container:'custom_promotioninfo_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
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
	    
	    if(createdFromDDN){
	    	//deduction open balance value for reference 
		    settlementForm.addField({
	    		id:'custom_itpm_ddn_openbal',
	    		type:serverWidget.FieldType.CURRENCY,
	    		label:'Deduction Open Balance',
	    		container:'custom_promotioninfo_group'
	    	}).updateDisplayType({
				displayType : serverWidget.FieldDisplayType.DISABLED
			}).defaultValue = ddnOpenBal;
	    }
	    
	  //Detailed Information
	    settlementForm.addFieldGroup({
		    id : 'custom_detailedinfo_group',
		    label : 'Detailed Information'
		});
	    
	    //settlement request
	    var settlementReqValue = (createdFromDDN)?(ddnOpenBal>netPromotionLiablty)?netPromotionLiablty:ddnOpenBal:0;
	    var settlementReqField = settlementForm.addField({
    		id:'custom_itpm_st_reql',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'Settlement Request',
    		container:'custom_detailedinfo_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.INLINE
    	});
	    
    	settlementReqField.defaultValue = settlementReqValue;
    	
    	//st:Lum Sum
    	settlementForm.addField({
    		id:'custpage_lumsum_setreq',
    		type:serverWidget.FieldType.CURRENCY,
    		label:'SETTLEMENT REQUEST : LUMP SUM',
    		container:'custom_detailedinfo_group'
    	}).updateDisplayType({
			displayType : (promoLumSum != 0 && promoLumSum != '')?serverWidget.FieldDisplayType.NORMAL:serverWidget.FieldDisplayType.INLINE
    	}).defaultValue = 0;
    	
    	//st:Bill-Back
    	settlementForm.addField({
    		id : 'custpage_billback_setreq',
    		type : serverWidget.FieldType.CURRENCY,
    		label : 'Settlement request : Bill back',
    		container:'custom_detailedinfo_group'
    	}).updateDisplayType({
			displayType : (promoTypeMOP.some(function(e){return e.value == 1}))?serverWidget.FieldDisplayType.NORMAL:serverWidget.FieldDisplayType.INLINE
    	}).defaultValue = 0;
    	
    	//st:Off-Invoice
    	settlementForm.addField({
    		id : 'custpage_offinvoice_setreq',
    		type : serverWidget.FieldType.CURRENCY,
    		label : 'Settlement request : Missed off-invoice',
    		container:'custom_detailedinfo_group'
    	}).updateDisplayType({
			displayType : (promoTypeMOP.some(function(e){return e.value == 3 || e.value == 2 }))?serverWidget.FieldDisplayType.NORMAL:serverWidget.FieldDisplayType.INLINE
    	}).defaultValue = 0;
    	
	    //reason code
	    settlementForm.addField({
    		id:'custom_itpm_st_reason_code',
    		type:serverWidget.FieldType.SELECT,
    		label:'Reason Code',
    		source:'customlist_itpm_set_reasoncode',
    		container:'custom_detailedinfo_group'
    	}).isMandatory = true;
	    
	   //Date
	    settlementForm.addField({
    		id:'custom_itpm_st_date',
    		type:serverWidget.FieldType.TEXT,
    		label:'Date',
    		container:'custom_detailedinfo_group'
    	}).updateDisplayType({
			displayType : serverWidget.FieldDisplayType.DISABLED
		}).defaultValue = format.format({
		    value:new Date(),
		    type: format.Type.DATE
		});
	    
	    settlementForm.clientScriptModulePath = './iTPMSettlement_ClientValidations_cs_script.js'
    }
    
    
    //adding the values to settlement record and saving the record
    function saveTheSettlement(params){
    	log.debug('params',params);
    	 //loading the deduction record
    	 var createdFromDDN = (params.custom_itpm_st_created_frm == 'ddn')
    	 if(createdFromDDN){
    		 var deductionRec = record.load({
    			 type:'customtransaction_itpm_deduction',
    			 id:params.custom_itpm_st_ddn_id
    		 }),
    		 ddnOpenBal = deductionRec.getValue('custbody_itpm_ddn_openbal'),
    		 perferenceLS,perferenceBB,dednExpAccnt;
    		 
    		 search.create({
    			 type:'customrecord_itpm_preferences',
    			 columns:['custrecord_itpm_pref_ddnaccount','custrecord_itpm_pref_matchls','custrecord_itpm_pref_matchbb'],
    			 filters:[]
    		 }).run().each(function(e){
    			 perferenceLS = e.getValue('custrecord_itpm_pref_matchls');
    			 perferenceBB = e.getValue('custrecord_itpm_pref_matchbb');
    			 dednExpAccnt = e.getValue('custrecord_itpm_pref_ddnaccount');
    		 }) 
    	 }
    	
    	 //Since the settlement record will be created with the Lump Sum, Off-Invoice and BIll Back request values set to zero, the system to should check to see whether there already exists a settlement record for the same promotion with ALL these three field values at zero. If yes, then prevent submit and return a user error - "There already seems to be a new (zero) settlement request on this promotion. Please complete that settlement request before attempting to create another Settlement on the same promotion."
    	 var searchResultFound = search.create({
     		type:'customtransaction_itpm_settlement',
     		columns:['internalid'],
     		filters:[['custbody_itpm_set_promo','is',params['custom_itpm_st_promotion_no']],'and',
     		         ['custbody_itpm_set_reqbb','equalto',0],'and',
     		         ['custbody_itpm_set_reqoi','equalto',0],'and',['custbody_itpm_set_reqls','equalto',0]]
     	}).run().getRange(0,2).length > 0;
     	
     	if(searchResultFound)
     		throw Error("There already seems to be a new (zero) settlement request on this promotion. Please complete that settlement request before attempting to create another Settlement on the same promotion.");

     	var loadedPromoRec = search.lookupFields({
    		type:'customrecord_itpm_promotiondeal',
    		id:params['custom_itpm_st_promotion_no'],
    		columns:['custrecord_itpm_p_lumpsum','custrecord_itpm_p_netbillbackle','custrecord_itpm_p_netlsle','custrecord_itpm_p_netpromotionalle','custrecord_itpm_p_account','custrecord_itpm_p_type.custrecord_itpm_pt_defaultaccount']
    	}),
    	//loading the record for NET PROMOTIONAL LIABLIITY, INCURRED PROMOTIONAL LIABILITY fields(These are did not return a value in lookupFields method)
		promotionRec = record.load({
			type:'customrecord_itpm_promotiondeal',
			id:params['custom_itpm_st_promotion_no']
		}),//
    	promoRectypeId = record.create({type:'customrecord_itpm_promotiondeal'}).getValue('rectype'),
    	promoNetBBLiablty = loadedPromoRec['custrecord_itpm_p_netbillbackle'],
    	promoLS = loadedPromoRec['custrecord_itpm_p_lumpsum'],
//    	netPromoLSLiablty = loadedPromoRec['custrecord_itpm_p_netlsle'],
    	netPromoLSLiablty = promotionRec.getValue({fieldId:'custrecord_itpm_p_netlsle'}),
//    	netPromotionLiablty = (loadedPromoRec['custrecord_itpm_p_netpromotionalle'] == '' || loadedPromoRec['custrecord_itpm_p_netpromotionalle'] == 'ERROR: Invalid Expression')?0:loadedPromoRec['custrecord_itpm_p_netpromotionalle'],
    	netPromotionLiablty = promotionRec.getValue({fieldId:'custrecord_itpm_p_netpromotionalle'}),
    	promoTypeDefaultAccnt = loadedPromoRec['custrecord_itpm_p_type.custrecord_itpm_pt_defaultaccount'][0].value,
    	promoDealLumsumAccnt = loadedPromoRec['custrecord_itpm_p_account'].length >0 ?loadedPromoRec['custrecord_itpm_p_account'][0].value:promoTypeDefaultAccnt,
    	customerRec = record.load({type:record.Type.CUSTOMER,id:params.custom_itpm_st_cust}),
		creditAccnt = customerRec.getValue('receivablesaccount');
		creditAccnt = (creditAccnt != "-10")?creditAccnt:config.load({
				 type:config.Type.ACCOUNTING_PREFERENCES
		}).getValue('ARACCOUNT');
		
		
    	var newSettlementRecord = record.create({
    		type:'customtransaction_itpm_settlement',
    		isDynamic:true
    	});
    	
    	newSettlementRecord.setValue({
    		fieldId:'memo',
    		value:(createdFromDDN)?'Settlement Created From Deduction #'+deductionRec.getValue('tranid'):'Settlement Created From Promotion # '+params['custom_itpm_st_promotion_no']
    	});
    	
    	newSettlementRecord.setValue({
    		fieldId:'custbody_itpm_set_fromtype',
    		value:(createdFromDDN)?'- iTPM Deduction':'- iTPM Promotion'
    	}).setValue({
    		fieldId:'custbody_itpm_set_fromtypeid',
    		value:(createdFromDDN)?deductionRec.getValue('ntype'):promoRectypeId
    	}).setValue({
    		fieldId:'custbody_itpm_set_fromid',
    		value:(createdFromDDN)?String(deductionRec.id):String(params['custom_itpm_st_promotion_no'])
    	})
    	
    	//it's creating from the dedcution record
    	//Scenario 1: Preference set to Match Lump Sum (this means overpay is posted on Bill Back by default)
    	//If Promotion HAS Lump Sum then Lump Sum Request = LESSER OF [Net Lump Sum Liability OR Settlement Request] AND Bill Back Request = Settlement Request - Lump Sum Request
    	//If Promotion DOES NOT HAVE Lump Sum, then Bill Back Request = Settlement Request
    	
    	//Scenario 2: Preference set to Match Bill Back (this means overpay is posted on Lump Sum by default)
    	//If Promotion HAS Lump Sum then Bill Back Request = LESSER OF [Net Bill Back Liability OR Settlement Request] AND Lump Sum Request = Settlement Request - Bill Back Request
    	//If Promotion DOES NOT HAVE Lump Sum, then Bill Back Request = Settlement Request
    	var lumsumSetReq = params['custpage_lumsum_setreq'].replace(/,/g,''),billbackSetReq = params['custpage_billback_setreq'].replace(/,/g,''),
    	offinvoiceSetReq = params['custpage_offinvoice_setreq'].replace(/,/g,''), 
    	setReqAmount = params['custom_itpm_st_reql'].replace(/,/g,'');
    	
    	if(createdFromDDN){
    		newSettlementRecord.setValue({
        		fieldId:'transtatus',
        		value:'B'
    		}).setValue({
    			fieldId:'custbody_itpm_set_deduction',
    			value:params.custom_itpm_st_ddn_id
    		});
    		
    		if(parseFloat(promoLS)>0){
        		if(perferenceLS){
        			lumsumSetReq = (netPromoLSLiablty > parseFloat(setReqAmount))?setReqAmount:netPromoLSLiablty;
        			billbackSetReq = parseFloat(setReqAmount) - lumsumSetReq;
        		}
        		
        		if(perferenceBB){
        			billbackSetReq = (promoNetBBLiablty > parseFloat(setReqAmount))?setReqAmount:promoNetBBLiablty;
        			lumsumSetReq = parseFloat(setReqAmount) - billbackSetReq;
        		}
    		}else{
    			billbackSetReq = setReqAmount;
    		}
    		
    		lumsumSetReq = (parseFloat(lumsumSetReq) >0)?lumsumSetReq:0;
    		billbackSetReq = (parseFloat(billbackSetReq) > 0)?billbackSetReq:0;
    		offinvoiceSetReq = (parseFloat(offinvoiceSetReq) > 0)?offinvoiceSetReq:0;
    	}else{
    		newSettlementRecord.setValue({
        		fieldId:'transtatus',
        		value:'A'
    		})
    	}
    	
    	//Set the following fields to zero:-Lump Sum Settlement Request,Bill-Back Settlement Request,Missed Off-Invoice Settlement Request
//    	newSettlementRecord.setValue({
//    		fieldId:'custbody_itpm_set_reqls',
////    		value:lumsumSetReq
//    		value:0
//    	}).setValue({
//    		fieldId:'custbody_itpm_set_reqbb',
////    		value:billbackSetReq
//    		value:0
//    	}).setValue({
//    		fieldId:'custbody_itpm_set_reqoi',
//    		value:0
//    	});
    	
    	
    	var lineVlaues = [{
    		lineType:'ls',
    		id:'1',
    		account:promoDealLumsumAccnt,
    		type:'debit',
    		isDebit:true,
    		amount:lumsumSetReq
    	},{
    		lineType:'ls',
    		id:'1',
    		account:(createdFromDDN)?dednExpAccnt:creditAccnt,
    		type:'credit',
    		isDebit:false,
    		amount:lumsumSetReq
    	},{
    		lineType:'bb',
    		id:'2',
    		account:promoTypeDefaultAccnt,
    		type:'debit',
    		isDebit:true,
    		amount:billbackSetReq
    	},{
    		lineType:'bb',
    		id:'2',
    		account:(createdFromDDN)?dednExpAccnt:creditAccnt,
    		type:'credit',
    		isDebit:false,
    		amount:billbackSetReq
    	},{
    		lineType:'inv',
    		id:'3',
    		account:promoTypeDefaultAccnt,
    		type:'debit',
    		isDebit:true,
    		amount:offinvoiceSetReq
    	},{
    		lineType:'inv',
    		id:'3',
    		account:(createdFromDDN)?dednExpAccnt:creditAccnt,
    		type:'credit',
    		isDebit:false,
    		amount:offinvoiceSetReq
    	}];
    	
    	if(params['custom_itpm_st_incrd_promolbty'] != ''){
        	newSettlementRecord.setValue({
        		fieldId:'custbody_itpm_set_incrd_promoliability',
        		value:params['custom_itpm_st_incrd_promolbty']
        	});
    	}
    	
    	//customer value
    	newSettlementRecord.setValue({
    		fieldId:'custbody_itpm_set_customer',
    		value:params['custom_itpm_st_cust']
    	})
    	//customer parent
    	newSettlementRecord.setValue({
    		fieldId:'custbody_itpm_set_custparent',
    		value:params['custom_itpm_st_cust_parent']
    	});
    	//subsidiary
    	newSettlementRecord.setValue({
    		fieldId:'subsidiary',
    		value:params['custom_itpm_st_subsidiary']
    	});
    	//currency
    	newSettlementRecord.setValue({
    		fieldId:'currency',
    		value:params['custom_itpm_st_currency']
    	});
    	//class
    	newSettlementRecord.setValue({
    		fieldId:'class',
    		value:params['custom_itpm_st_class']
    	});
    	//department
    	newSettlementRecord.setValue({
    		fieldId:'department',
    		value:params['custom_itpm_st_department']
    	});
    	//location
    	newSettlementRecord.setValue({
    		fieldId:'location',
    		value:params['custom_itpm_st_location']
    	});
    	//promotion number
    	newSettlementRecord.setValue({
    		fieldId:'custbody_itpm_set_promonum',
    		value:params['custom_itpm_st_promotion_no']
    	});
    	//promotion/deal
    	newSettlementRecord.setValue({
    		fieldId:'custbody_itpm_set_promo',
    		value:params['custom_itpm_st_promotiondeal']
    	});
    	//promotion description
    	newSettlementRecord.setValue({
    		fieldId:'custbody_itpm_set_promodesc',
    		value:params['custom_itpm_st_promotion_desc']
    	});
    	//net promotion liability
    	if(params['custom_itpm_st_net_promolbty'] != ''){
        	newSettlementRecord.setValue({ 
        		fieldId:'custbody_itpm_set_netliability',
        		value:params['custom_itpm_st_net_promolbty']
        	});
    	}
    	//start date
    	newSettlementRecord.setValue({
    		fieldId:'custbody_itpm_set_promoshipstart',
    		value:new Date(params['custom_itpm_st_shp_stdate'])
    	});
    	//end date
    	newSettlementRecord.setValue({
    		fieldId:'custom_itpm_st_shp_endate',
    		value:new Date(params['custom_itpm_st_shp_endate'])
       	});
    	//settlement request 
    	log.debug('params[custom_itpm_st_reql]',params['custom_itpm_st_reql']);   	
    	newSettlementRecord.setValue({
    		fieldId:'custbody_itpm_set_amount',
    		value:setReqAmount
    	}).setValue({
    		fieldId:'custbody_itpm_set_reqls',
    		value:lumsumSetReq
    	}).setValue({
    		fieldId:'custbody_itpm_set_reqoi',
    		value:offinvoiceSetReq
    	}).setValue({
    		fieldId:'custbody_itpm_set_reqbb',
    		value:billbackSetReq
    	});
    	//Reason code
    	newSettlementRecord.setValue({
    		fieldId:'custbody_itpm_set_reason',
    		value:params['custom_itpm_st_reason_code']
    	});
    	//Date
    	newSettlementRecord.setValue({
    		fieldId:'trandate',
    		value:new Date(params['custom_itpm_st_date'])
    	});

    	lineVlaues.forEach(function(e){
    		newSettlementRecord.selectNewLine({sublistId: 'line'});
    		newSettlementRecord.setCurrentSublistValue({
    			sublistId:'line',
    			fieldId:'account',
    			value:e.account
    		});
    		//if off-invoice value is present then what happens here
//    		if(createdFromDDN && (e.lineType == 'ls' || e.lineType == 'bb') ){
//    			newSettlementRecord.setCurrentSublistValue({
//        			sublistId:'line',
//        			fieldId:e.type,
//        			value:(e.lineType == 'ls')?lumsumSetReq:billbackSetReq
//        		});
//    		}else{
    			newSettlementRecord.setCurrentSublistValue({
        			sublistId:'line',
        			fieldId:e.type,
        			value:e.amount
        		});
//    		}
    		
    		newSettlementRecord.setCurrentSublistValue({
    			sublistId:'line',
    			fieldId:'custcol_itpm_lsbboi',
    			value:e.id
    		});
    		
    		newSettlementRecord.setCurrentSublistValue({
    			sublistId:'line',
    			fieldId:'custcol_itpm_set_isdebit',
    			value:e.isDebit
    		});

    	    		
    		newSettlementRecord.setCurrentSublistValue({
    			sublistId:'line',
    			fieldId:'memo',
    			value:(createdFromDDN)?'Settlement Created From Deduction #'+deductionRec.getValue('tranid'):'Settlement Created From Promotion # '+params['custom_itpm_st_promotion_no']
    		});
    		
    		newSettlementRecord.setCurrentSublistValue({
    			sublistId:'line',
    			fieldId:'entity',
    			value:params['custom_itpm_st_cust']
    		});
    		    		
    		newSettlementRecord.commitLine({
    		    sublistId: 'line'
    		});
    	});
    	
    	log.debug('custbody_itpm_set_reqbb',newSettlementRecord.getValue('custbody_itpm_set_reqbb'));
    	redirect.toRecord({
			id : newSettlementRecord.save({enableSourcing:false,ignoreMandatoryFields:true}),
			type : 'customtransaction_itpm_settlement', 
			isEditMode:false
		});
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
