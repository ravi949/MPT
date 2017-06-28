define(['N/config', 'N/record', 'N/search','./iTPM_Module.js'],
/**
 * @param {config} config
 * @param {record} record
 * @param {search} search
 */
function(config, record, search, iTPM_Module) {
   
	//create the settlement record.
	function createSettlement(params){
		log.debug('params',params);
		//loading the deduction record
		var createdFromDDN = (params.custom_itpm_st_created_frm == 'ddn');
		if(createdFromDDN){
			var deductionRec = record.load({
				type:'customtransaction_itpm_deduction',
				id:params.custom_itpm_st_ddn_id
			}),
			ddnOpenBal = deductionRec.getValue('custbody_itpm_ddn_openbal');
		}
	
		//iTPM prefernce record values.
		var prefObj = iTPM_Module.getPrefrenceValues();
		var perferenceLS = prefObj.perferenceLS,
		perferenceBB = prefObj.perferenceBB,
		dednExpAccnt = prefObj.dednExpAccnt,
		accountPayable = prefObj.accountPayable;
		
   	
		//Since the settlement record will be created with the Lump Sum, Off-Invoice and BIll Back request values set to zero, the system to should check to see whether there already exists a settlement record for the same promotion with ALL these three field values at zero. If yes, then prevent submit and return a user error - "There already seems to be a new (zero) settlement request on this promotion. Please complete that settlement request before attempting to create another Settlement on the same promotion."
		var searchResultFound = search.create({
			type:'customtransaction_itpm_settlement',
			columns:['internalid'],
			filters:[['custbody_itpm_set_promo','is',params['custom_itpm_st_promotion_no']],'and',
				['custbody_itpm_set_reqbb','equalto',0],'and',
				['custbody_itpm_set_reqoi','equalto',0],'and',['custbody_itpm_set_reqls','equalto',0]]
		}).run().getRange(0,2).length > 0;

		if(searchResultFound)
			throw Error("settlement not completed");

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
		netPromoLSLiablty = promotionRec.getValue({fieldId:'custrecord_itpm_p_netlsle'}),
		netPromotionLiablty = promotionRec.getValue({fieldId:'custrecord_itpm_p_netpromotionalle'}),
		promoTypeDefaultAccnt = loadedPromoRec['custrecord_itpm_p_type.custrecord_itpm_pt_defaultaccount'][0].value,
		promoDealLumsumAccnt = (loadedPromoRec['custrecord_itpm_p_account'].length >0)?loadedPromoRec['custrecord_itpm_p_account'][0].value:promoTypeDefaultAccnt,
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
				fieldId:'custbody_itpm_set_deduction',
				value:params.custom_itpm_st_ddn_id
			}).setValue({
				fieldId:'custbody_itpm_ddn_openbal',
				value:params.custom_itpm_ddn_openbal
			});
		}
		
		newSettlementRecord.setValue({
			fieldId:'transtatus',
			value:'A'
		});
	
	   	log.debug('accountPayable',accountPayable)
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
	   		account:accountPayable,
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
	   		account:accountPayable,
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
	   		account:accountPayable,
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
	   	//other reference code value
	   	newSettlementRecord.setValue({
	   		fieldId:'custbody_itpm_set_otherrefcode',
	   		value:params['custom_itpm_st_otherref_code']
	   	})
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

	   		newSettlementRecord.setCurrentSublistValue({
	   			sublistId:'line',
	   			fieldId:e.type,
	   			value:e.amount
	   		});

	   		newSettlementRecord.setCurrentSublistValue({
	   			sublistId:'line',
	   			fieldId:'custcol_itpm_lsbboi',
	   			value:e.id
	   		}).setCurrentSublistValue({
	   			sublistId:'line',
	   			fieldId:'custcol_itpm_set_isdebit',
	   			value:e.isDebit
	   		}).setCurrentSublistValue({
	   			sublistId:'line',
	   			fieldId:'memo',
	   			value:(createdFromDDN)?'Settlement Created From Deduction #'+deductionRec.getValue('tranid'):'Settlement Created From Promotion # '+params['custom_itpm_st_promotion_no']
	   		}).commitLine({
	   			sublistId: 'line'
	   		});
	   	});
	   	
	   return newSettlementRecord.save({enableSourcing:false,ignoreMandatoryFields:true})
	}
	
	
	//Apply the Settlement to Deduction record.
	function applyToSettlement(parameters){
		
		var deductionRec = record.load({
			type:'customtransaction_itpm_deduction',
			id: parameters.ddn,
			isDynamic: true,
		}),
		SettlementRec = record.load({
			type:'customtransaction_itpm_settlement',
			id: parameters.sid,
			isDynamic: true
		});
		

		var customer = deductionRec.getValue('custbody_itpm_ddn_customer');
		var DeductionId = deductionRec.getValue('id');
		var DeductionNum = deductionRec.getValue('tranid');
		
		var prefObj = iTPM_Module.getPrefrenceValues();
		var dednExpAccnt = prefObj.dednExpAccnt,
		accountPayable = prefObj.accountPayable;
		
		var lumsum = SettlementRec.getSublistValue({
			sublistId: 'line',
			fieldId: 'debit',
			line: 0
		}),
		bB = SettlementRec.getSublistValue({
			sublistId: 'line',
			fieldId: 'debit',
			line: 2
		}),
		oI = SettlementRec.getSublistValue({
			sublistId: 'line',
			fieldId: 'debit',
			line: 4
		}),
		JEAmount = parseFloat(lumsum)+parseFloat(bB)+parseFloat(oI);

		var memo = 'Applying Settlement #'+SettlementRec.getValue('tranid')+' to Deduction #'+DeductionNum;

		var JELines = [
			{account:dednExpAccnt,memo:memo,type:'credit',amount:JEAmount},
			{account:accountPayable,memo:memo,type:'debit',amount:JEAmount}
			];
		
		var JournalId = setJELines(parameters.sid,deductionRec.getValue('subsidiary'),JELines);

		log.debug('JournalId',JournalId);
		
		if(JournalId){	
			
			DeductionId = deductionRec.setValue({
				fieldId:'custbody_itpm_ddn_openbal',
				value:parseFloat(deductionRec.getValue('custbody_itpm_ddn_openbal')) - JEAmount
			}).save({enableSourcing: true,ignoreMandatoryFields: true});
			
			SettlementRec.setValue({
				fieldId : 'transtatus',
				value	: "B"
			}).setValue({
				fieldId : 'custbody_itpm_set_deduction',
				value	: DeductionId
			});
			
			return  SettlementRec.save({enableSourcing: true,ignoreMandatoryFields: true});
		}
		
	}
	
	//create the Reverse JE for settlement
	function createReverseJE(settlementRec){
		var lineCount = settlementRec.getLineCount('line'),JELines = [];
		for(var i=0;i<lineCount;i++){
			var credit = settlementRec.getSublistValue({sublistId:'line',fieldId:'credit',line:i}),
			    debit = settlementRec.getSublistValue({sublistId:'line',fieldId:'debit',line:i}); 
			JELines.push({
				account:settlementRec.getSublistValue({sublistId:'line',fieldId:'account',line:i}),
			    type:(parseFloat(credit) > 0 || credit != "")?'debit':'credit',
			    amount:(parseFloat(credit) > 0 || credit != "")?credit:debit,
			    memo:'Reverse Journal For Settlement #'+settlementRec.getValue('tranid')
			});
		}
		var JERecId = setJELines(settlementRec.id,settlementRec.getValue('subsidiary'),JELines);
		return JERecId;
	}
	
	//setting the JE lines values
	function setJELines(setId,subsId,JELines){
		var journalRecord = record.create({
			type: record.Type.JOURNAL_ENTRY		
		});
		
		journalRecord.setValue({
			fieldId: 'subsidiary',
			value:subsId
		}).setValue({
			fieldId:'memo',
			value:JELines[0].memo
		}).setValue({
			fieldId:'custbody_itpm_set_deduction',
			value:setId
		});
		
		var linesCount = JELines.length;
		log.debug('JELines',JELines)
		for(var i=0;i<linesCount;i++){
			journalRecord.setSublistValue({
				sublistId: 'line',
				fieldId: 'account',
				line: i,
				value: JELines[i].account
			});
			journalRecord.setSublistValue({
				sublistId:'line',
				fieldId:'memo',
				line: i,
				value:JELines[i].memo
			});

			journalRecord.setSublistValue({
				sublistId: 'line',
				fieldId:JELines[i].type,
				line: i,
				value: JELines[i].amount
			});
		}
		
		
		return journalRecord.save({
			enableSourcing: true,
			ignoreMandatoryFields: true
		});	
	}

	
	
    return {
        createSettlement:createSettlement,
        applyToSettlement:applyToSettlement,
        createReverseJE:createReverseJE
    };
    
});
