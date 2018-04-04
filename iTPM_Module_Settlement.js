/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 * Custom module for operations related to iTPM Settlement records.
 */

define(['N/config',
		'N/record',
		'N/search',
		'./iTPM_Module.js'
		],
/**
 * @param {config} config
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 */
function(config, record, search, itpm) {
   
	/**
	 * function createSettlement(params)
	 * 
	 * Returns a settlement record id
	 * @returns {number}
	 */
	function createSettlement(params){
		try{
			log.debug('params',params);
			//loading the deduction record
			var createdFromDDN = (params.custom_itpm_st_created_frm == 'ddn');
			var subsidiaryExists = itpm.subsidiariesEnabled();
			var currencyExists = itpm.currenciesEnabled();
			var locationsExists = itpm.locationsEnabled();
			var departmentsExists = itpm.departmentsEnabled();
			var classesExists = itpm.classesEnabled();

			if(createdFromDDN){
				var deductionRec = record.load({
					type:'customtransaction_itpm_deduction',
					id:params.custom_itpm_st_appliedtransction
				});
			}

			//iTPM prefernce record values.
			var prefObj = itpm.getPrefrenceValues();


			//Since the settlement record will be created with the Lump Sum, Off-Invoice and BIll Back request values set to zero, the system to should check to see whether there already exists a settlement record for the same promotion with ALL these three field values at zero. If yes, then prevent submit and return a user error - "There already seems to be a new (zero) settlement request on this promotion. Please complete that settlement request before attempting to create another Settlement on the same promotion."
			var searchResultFound = search.create({
				type:'customtransaction_itpm_settlement',
				columns:['internalid'],
				filters:[['custbody_itpm_set_promo','anyof',params['custom_itpm_st_promotion_no']],'and',
					['custbody_itpm_set_reqbb','equalto',0],'and',
					['custbody_itpm_set_reqoi','equalto',0],'and',['custbody_itpm_set_reqls','equalto',0]]
			}).run().getRange(0,2).length > 0;

			if(searchResultFound)
				throw Error("settlement not completed");

			var loadedPromoRec = search.lookupFields({
				type:'customrecord_itpm_promotiondeal',
				id:params['custom_itpm_st_promotion_no'],
				columns:['name','custrecord_itpm_p_account','custrecord_itpm_p_type.custrecord_itpm_pt_defaultaccount']
			});			
			var promoTypeDefaultAccnt = loadedPromoRec['custrecord_itpm_p_type.custrecord_itpm_pt_defaultaccount'][0].value;
			var promoDealLumsumAccnt = (loadedPromoRec['custrecord_itpm_p_account'].length >0)?loadedPromoRec['custrecord_itpm_p_account'][0].value:promoTypeDefaultAccnt;		
			var newSettlementRecord = record.create({
				type:'customtransaction_itpm_settlement',
				isDynamic:true
			});
			
			newSettlementRecord.setValue({
				fieldId:'memo',
				value:params['custpage_memo']
			});

			//it's creating from the dedcution record
			//Scenario 1: Preference set to Match Lump Sum (this means overpay is posted on Bill Back by default)
			//If Promotion HAS Lump Sum then Lump Sum Request = LESSER OF [Net Lump Sum Liability OR Settlement Request] AND Bill Back Request = Settlement Request - Lump Sum Request
			//If Promotion DOES NOT HAVE Lump Sum, then Bill Back Request = Settlement Request

			//Scenario 2: Preference set to Match Bill Back (this means overpay is posted on Lump Sum by default)
			//If Promotion HAS Lump Sum then Bill Back Request = LESSER OF [Net Bill Back Liability OR Settlement Request] AND Lump Sum Request = Settlement Request - Bill Back Request
			//If Promotion DOES NOT HAVE Lump Sum, then Bill Back Request = Settlement Request
			var lumsumSetReq = params['custpage_lumsum_setreq'].replace(/,/g,'');
			var billbackSetReq = params['custpage_billback_setreq'].replace(/,/g,'');
			var offinvoiceSetReq = params['custpage_offinvoice_setreq'].replace(/,/g,''); 
			var setReqAmount = params['custom_itpm_st_reql'].replace(/,/g,'');

			if(createdFromDDN){
				newSettlementRecord.setValue({
					fieldId:'custbody_itpm_appliedto',
					value:params.custom_itpm_st_appliedtransction
				}).setValue({
					fieldId:'custbody_itpm_ddn_openbal',
					value:params.custom_itpm_ddn_openbal
				});
			}

			newSettlementRecord.setValue({
				fieldId:'transtatus',
				//value:'A'
				value:'E'
			});
			if(params['custom_itpm_st_incrd_promolbty'] != ''){
				newSettlementRecord.setValue({
					fieldId:'custbody_itpm_set_incrd_promoliability',
					value:params['custom_itpm_st_incrd_promolbty']
				});
			}
			//other reference code value
			newSettlementRecord.setValue({
				fieldId:'custbody_itpm_otherrefcode',
				value:params['custom_itpm_st_otherref_code']
			})
			//customer value
			newSettlementRecord.setValue({
				fieldId:'custbody_itpm_customer',
				value:params['custom_itpm_st_cust']
			})
			//customer parent
			newSettlementRecord.setValue({
				fieldId:'custbody_itpm_set_custparent',
				value:params['custom_itpm_st_cust_parent']
			});
			
			if(subsidiaryExists){
				//subsidiary 
				newSettlementRecord.setValue({
					fieldId:'subsidiary',
					value:params['custom_itpm_st_subsidiary']
				})
			}
			
			if(currencyExists){
				//currency
				newSettlementRecord.setValue({
					fieldId:'currency',
					value:params['custom_itpm_st_currency']
				});
			}
			
			//class
			if(classesExists){
				newSettlementRecord.setValue({
					fieldId:'class',
					value:params['custom_itpm_st_class']
				});
			}
			
			//department
			if(departmentsExists){
				newSettlementRecord.setValue({
					fieldId:'department',
					value:params['custom_itpm_st_department']
				});
			}
			
			//location
			if(locationsExists){
				newSettlementRecord.setValue({
					fieldId:'location',
					value:params['custom_itpm_st_location']
				});
			}			
			
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
				fieldId:'custbody_itpm_amount',
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
			
			//Date
			newSettlementRecord.setValue({
				fieldId:'trandate',
				value:new Date(params['custom_itpm_st_date'])
			});
			
			//Adding require values to prefObj for adding lines to the settlement record
			prefObj.lumsumSetReq = lumsumSetReq;
			prefObj.billbackSetReq = billbackSetReq;
			prefObj.offinvoiceSetReq = offinvoiceSetReq;
			prefObj.promoTypeDefaultAccnt = promoTypeDefaultAccnt;
			prefObj.promoDealLumsumAccnt = promoDealLumsumAccnt;
			prefObj.promotionId = params['custom_itpm_st_promotion_no'];

			getSettlementLines(prefObj).forEach(function(e){
				if(e.amount > 0){
					newSettlementRecord.selectNewLine({sublistId: 'line'});
					newSettlementRecord.setCurrentSublistValue({
						sublistId:'line',
						fieldId:'account',
						value:e.account
					}).setCurrentSublistValue({
						sublistId:'line',
						fieldId:e.type,
						value:e.amount
					}).setCurrentSublistValue({
						sublistId:'line',
						fieldId:'custcol_itpm_lsbboi',
						value:e.id
					}).setCurrentSublistValue({
						sublistId:'line',
						fieldId:'memo',
						value:(createdFromDDN)?'Settlement Created From Deduction #'+deductionRec.getValue('tranid'):'Settlement Created From Promotion # '+loadedPromoRec.name
					}).setCurrentSublistValue({
						sublistId:'line',
						fieldId:'entity',
						value:params['custom_itpm_st_cust']
					}).commitLine({
						sublistId: 'line'
					});
				}				
			});

			return newSettlementRecord.save({enableSourcing:false,ignoreMandatoryFields:true})

		}catch(e){
    		log.error('e error',e);
    		var errObj = undefined;
    		if(e.message.search('{') > -1){
    			errObj = JSON.parse(e.message.replace(/Error: /g,''));
    		}
			var recordType = (params.custom_itpm_st_created_frm == 'ddn')?'iTPM Deduction':'iTPM Promotion';
			if(e.message == 'settlement not completed')
				throw {name:'SETTLEMENT_NOT_COMPLETED',message:e.message};
			else if(errObj && errObj.error == 'custom')
    			throw {name:'CUSTOM',message:errObj.message};
			else
				throw Error('record type='+recordType+', module=iTPM_Module_settlement.js, function name = createSettlement, message='+e.message);
		}
	}
	
	
	/**
	 * function applyToDeduction(parameters)
	 * 
	 * Returns a settlement record id
	 * @returns {number}
	 */
	function applyToDeduction(parameters,isCreatedFrom){
		try{

			var deductionRec = record.load({
				type:'customtransaction_itpm_deduction',
				id: parameters.ddn,
				isDynamic: true,
			});
			var SettlementRec = record.load({
				type:'customtransaction_itpm_settlement',
				id: parameters.sid,
				isDynamic: true
			});


			var customer = deductionRec.getValue('custbody_itpm_customer');
			var DeductionId = deductionRec.getValue('id');
			var DeductionNum = deductionRec.getValue('tranid');

			var prefObj = itpm.getPrefrenceValues();
			var dednExpAccnt = prefObj.dednExpAccnt,
			accountPayable = prefObj.accountPayable;

			//if(loadedSettlementRec.getSublistValue({ sublistId: 'line',fieldId: 'custcol_itpm_lsbboi',line: 0}) == '1')
			var linecount = SettlementRec.getLineCount({sublistId:'line'});
			var lumsum = 0, bB = 0, oI = 0;
			for(var i = 0;i < linecount;i++){
				var lineIsLSBBOI = SettlementRec.getSublistValue({ sublistId: 'line',fieldId: 'custcol_itpm_lsbboi',line: i});
				if(lineIsLSBBOI == '1'){
					lumsum += SettlementRec.getSublistValue({
						sublistId: 'line',
						fieldId: 'debit',
						line: i
					});
					log.debug('lumsum',lumsum);
				} else if(lineIsLSBBOI == '2'){
					bB += SettlementRec.getSublistValue({
						sublistId: 'line',
						fieldId: 'debit',
						line: i
					});
					log.debug('bb',bB);
				}else if(lineIsLSBBOI == '3'){
					oI += SettlementRec.getSublistValue({
						sublistId: 'line',
						fieldId: 'debit',
						line: i
					});
					log.debug('oI',oI);
				}
    		}
			
			var JEAmount = parseFloat(lumsum)+parseFloat(bB)+parseFloat(oI);

			var memo = 'Applying Settlement #'+SettlementRec.getValue('tranid')+' to Deduction #'+DeductionNum;

			var JELines = [
				{recid:parameters.sid,account:dednExpAccnt,memo:memo,type:'credit',amount:JEAmount,subid:deductionRec.getValue('subsidiary'),custid:customer},
				{recid:parameters.sid,account:accountPayable,memo:memo,type:'debit',amount:JEAmount,subid:deductionRec.getValue('subsidiary'),custid:customer}
			];

			var JournalId = setJELines(JELines);

			log.debug('JournalId',JournalId);

			if(JournalId){	

				DeductionId = deductionRec.setValue({
					fieldId:'custbody_itpm_ddn_openbal',
					value:parseFloat(deductionRec.getValue('custbody_itpm_ddn_openbal')) - JEAmount
				}).save({enableSourcing: true,ignoreMandatoryFields: true});

				SettlementRec.setValue({
					fieldId : 'transtatus',
					value	: (isCreatedFrom == 'S')?'B':'E' //B - Applied, E - In Processing
				}).setValue({
					fieldId : 'custbody_itpm_appliedto',
					value	: DeductionId
				}).setValue({
					fieldId:'custbody_itpm_ddn_openbal',
					value:deductionRec.getValue('custbody_itpm_ddn_openbal')
				})

				return  SettlementRec.save({enableSourcing: true,ignoreMandatoryFields: true});
			}

		}catch(e){
			log.debug('error',e.message);
			throw Error(e.message);
		}
		
	}
	
	/**
	 * function createReverseJE(settlementRec)
	 * 
	 * Returns a Journal Entry record id
	 * @returns {number}
	 */
	function createReverseJE(settlementRec){
		try{
			var lineCount = settlementRec.getLineCount('line'),JELines = [];
			
			for(var i=0;i<lineCount;i++){
				var credit = settlementRec.getSublistValue({sublistId:'line',fieldId:'credit',line:i}),
				debit = settlementRec.getSublistValue({sublistId:'line',fieldId:'debit',line:i}); 
				JELines.push({
					recid:settlementRec.id,
					account:settlementRec.getSublistValue({sublistId:'line',fieldId:'account',line:i}),
					type:(parseFloat(credit) > 0 || credit != "")?'debit':'credit',
					amount:(parseFloat(credit) > 0 || credit != "")?credit:debit,
					memo:'Reverse Journal For Settlement #'+settlementRec.getValue('tranid'),
					subid:settlementRec.getValue('subsidiary'),
					custid:settlementRec.getValue('custbody_itpm_customer')
				});
			}
			log.debug('JELines',JELines);
			var JERecId = setJELines(JELines);
			return JERecId;
		}catch(e){
			throw Error('record type=iTPM Settlement, record id='+settlementRec.id+', module=iTPM_Module_Settlement.js ,function name = createReverseJE, error function = createReverseJE, message='+e.message);
		}
	}
	
	/**
	 * function setJELines(setId,subsId,JELines)
	 * @params {number} setId Internal Id of the Settlement record
	 * @params {number} subsId Internal Id of the Subsidiary
	 * @params {array} array of line values
	 * 
	 * Returns a Journal Entry record id
	 * @returns {number}
	 */
	function setJELines(JELines){
		try{
			var prefObj = itpm.getPrefrenceValues();
			var subsidiaryExists = itpm.subsidiariesEnabled();
			var journalRecord = record.create({
				type: record.Type.JOURNAL_ENTRY		
			});

			if(subsidiaryExists){
				journalRecord.setValue({
					fieldId: 'subsidiary',
					value:JELines[0].subid
				});
			}
			
			//Checking the JE Approval preference from NetSuite "Accounting Preferences" under "General/Approval Routing" tabs.
			var prefJE = itpm.getJEPreferences();
			
			if(prefJE.featureEnabled){
				if(prefJE.featureName == 'Approval Routing'){
					log.debug('prefJE.featureName', prefJE.featureName);
					journalRecord.setValue({
    					fieldId:'approvalstatus',
    					value:1
    				});
				}else if(prefJE.featureName == 'General'){
					log.debug('prefJE.featureName', prefJE.featureName);
					journalRecord.setValue({
    					fieldId:'approved',
    					value:false
    				});
				}
			}
			
			journalRecord.setValue({
				fieldId:'memo',
				value:JELines[0].memo
			}).setValue({
				fieldId:'custbody_itpm_appliedto',
				value:JELines[0].recid
			});

			var linesCount = JELines.length;
			log.debug('JELines',JELines)
			for(var i=0;i<linesCount;i++){
				journalRecord.setSublistValue({
					sublistId: 'line',
					fieldId: 'account',
					line: i,
					value: JELines[i].account
				}).setSublistValue({
					sublistId:'line',
					fieldId:'memo',
					line: i,
					value:JELines[i].memo
				}).setSublistValue({
					sublistId: 'line',
					fieldId:JELines[i].type,
					line: i,
					value: JELines[i].amount
				}).setSublistValue({
					sublistId: 'line',
					fieldId:'entity',
					line: i,
					value:JELines[i].custid
				});
			}


			return journalRecord.save({
				enableSourcing: true,
				ignoreMandatoryFields: true
			});	
			
		}catch(e){
			throw Error('error occured in iTPM_Module_Settlement, function name = setJELines, message = '+e.message);
		}
	}
	
	/**
	 * function editSettlement(params)
	 * 
	 * Returns a Settlement record id
	 * @returns {number}
	 */
	function editSettlement(params){
		try{
			
			var locationsExists = itpm.locationsEnabled();
			var departmentsExists = itpm.departmentsEnabled();
			var classesExists = itpm.classesEnabled();
			
			var loadedSettlementRec = record.load({
				type:'customtransaction_itpm_settlement',
				id:params.custom_itpm_st_recordid
			});
			var linecount = loadedSettlementRec.getLineCount({sublistId:'line'});
			loadedSettlementRec.setValue({
				fieldId:'custbody_itpm_otherrefcode',
				value:params.custom_itpm_st_otherref_code
			}).setValue({
				fieldId:'custbody_itpm_amount',
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
			
			if(locationsExists){
				loadedSettlementRec.setValue({
					fieldId:'location',
					value:params.custom_itpm_st_location
				});
			}
			
			if(classesExists){
				loadedSettlementRec.setValue({
					fieldId:'class',
					value:params.custom_itpm_st_class
				});
			}
			
			if(departmentsExists){
				loadedSettlementRec.setValue({
					fieldId:'department',
					value:params.custom_itpm_st_department
				});
			}
			
        	var loadedPromoRec = search.lookupFields({
				type:'customrecord_itpm_promotiondeal',
				id:loadedSettlementRec.getValue('custbody_itpm_set_promo'),
				columns:['custrecord_itpm_p_account','custrecord_itpm_p_type.custrecord_itpm_pt_defaultaccount']
			});
        	var promoTypeDefaultAccnt = loadedPromoRec['custrecord_itpm_p_type.custrecord_itpm_pt_defaultaccount'][0].value;
    		var promoDealLumsumAccnt = (loadedPromoRec['custrecord_itpm_p_account'].length >0)?loadedPromoRec['custrecord_itpm_p_account'][0].value:promoTypeDefaultAccnt;
    		if(loadedSettlementRec.getSublistValue({ sublistId: 'line',fieldId: 'custcol_itpm_lsbboi',line: 0}) == '1'){
    			promoDealLumsumAccnt = loadedSettlementRec.getSublistValue({ sublistId: 'line',fieldId: 'account',line: 0});
    		}
    		var setlMemo = loadedSettlementRec.getSublistValue({ sublistId: 'line',fieldId: 'memo',line:linecount-1});
    		var setlCust = loadedSettlementRec.getValue('custbody_itpm_customer');
    		var lineObj = {
    				promoDealLumsumAccnt:promoDealLumsumAccnt,
    				accountPayable:loadedSettlementRec.getSublistValue({ sublistId: 'line',fieldId: 'account',line: linecount-1}),
    				promoTypeDefaultAccnt:promoTypeDefaultAccnt,
    				lumsumSetReq:loadedSettlementRec.getValue('custbody_itpm_set_reqls'),
    				billbackSetReq:loadedSettlementRec.getValue('custbody_itpm_set_reqbb'),
    				offinvoiceSetReq:loadedSettlementRec.getValue('custbody_itpm_set_reqoi'),
    				promotionId:loadedSettlementRec.getValue('custbody_itpm_set_promo')
    			}
    		for(var i = linecount-1;i >= 0;i--){
    			loadedSettlementRec.removeLine({
				    sublistId: 'line',
				    line: i
				});
    		}
    		var indexcount = 0;
        	getSettlementLines(lineObj).forEach(function(e){
				if(e.amount > 0){					
					loadedSettlementRec.setSublistValue({
						sublistId:'line',
						fieldId:'account',
						value:e.account,
						line:indexcount
					}).setSublistValue({
						sublistId:'line',
						fieldId:e.type,
						value:e.amount,
						line:indexcount
					}).setSublistValue({
						sublistId:'line',
						fieldId:'custcol_itpm_lsbboi',
						value:e.id,
						line:indexcount
					}).setSublistValue({
						sublistId:'line',
						fieldId:'memo',
						value:setlMemo,
						line:indexcount
					}).setSublistValue({
						sublistId:'line',
						fieldId:'entity',
						value:setlCust,
						line:indexcount
					});
					indexcount++;
				}			
			});
        	loadedSettlementRec.setValue({
				fieldId:'transtatus',
				value:'E'
			});
			return loadedSettlementRec.save({enableSourcing:false,ignoreMandatoryFields:true});

		}catch(e){
			var errObj = undefined;
			if(e.message.search('{') > -1){
				errObj = JSON.parse(e.message.replace(/Error: /g,''));
			}
    		if(errObj && errObj.error == 'custom')
    			throw {name:'CUSTOM',message:errObj.message};
    		else 
    			throw Error(e.message);
    			//throw Error('error occured in iTPM_Module_Settlement , function name = editSettlement,message = '+e.message);
		}
	}
	
	function getSettlementLines(lineObj){
		log.debug('lineObj.  ',lineObj);
	   return [{
			lineType:'ls',
			id:'1',
			account:lineObj.promoDealLumsumAccnt,
			type:'debit',
			amount:lineObj.lumsumSetReq
		},{
			lineType:'ls',
			id:'1',
			account:lineObj.accountPayable,
			type:'credit',
			amount:lineObj.lumsumSetReq
		},{
			lineType:'bb',
			id:'2',
			account:lineObj.promoTypeDefaultAccnt,
			type:'debit',
			amount:lineObj.billbackSetReq
		},{
			lineType:'bb',
			id:'2',
			account:lineObj.accountPayable,
			type:'credit',
			amount:lineObj.billbackSetReq
		},{
			lineType:'inv',
			id:'3',
			account:lineObj.promoTypeDefaultAccnt,
			type:'debit',
			amount:lineObj.offinvoiceSetReq
		},{
			lineType:'inv',
			id:'3',
			account:lineObj.accountPayable,
			type:'credit',
			amount:lineObj.offinvoiceSetReq
		}];
		
	}
	//Returning True/False based on the allowances on the promotion
	function getAllowanceMOP(pId,mop){
		return search.create({
			type:'customrecord_itpm_promotiondeal',
			columns:['custrecord_itpm_all_promotiondeal.internalid'
					 ,'custrecord_itpm_all_promotiondeal.custrecord_itpm_all_item'
					 ,'custrecord_itpm_all_promotiondeal.custrecord_itpm_all_mop'
					 ],
					 filters:[
						       ['internalid','anyof',pId], 'and', 
						       ['custrecord_itpm_all_promotiondeal.custrecord_itpm_all_mop','anyof', mop], 'and', 
						       ['custrecord_itpm_all_promotiondeal.isinactive','is','F']
						     ]
		}).run().getRange(0,10).length > 0;
	}
    return {
        createSettlement:createSettlement,
        editSettlement:editSettlement,
        applyToDeduction:applyToDeduction,
        createReverseJE:createReverseJE,
        getAllowanceMOP:getAllowanceMOP
    };
    
});
