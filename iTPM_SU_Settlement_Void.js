/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/record',
	'N/redirect',
	'N/search',
	'./iTPM_Module.js'
	],

	function(record, redirect, search, itpm) {

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
			if (context.request.method === 'GET') {
				var SetID = context.request.parameters.sid;
				var SetRec = record.load({
					type : 'customtransaction_itpm_settlement',
					id   : SetID
				});

				var settlementStatus = SetRec.getValue('transtatus');

				if(settlementStatus == 'C' || settlementStatus == 'D'){
					throw {
						name:'SETTLEMENT_INVALID_STATUS',
						message:'This settlement has been voided.'
					};
				}

				var subsidiaryExists = itpm.subsidiariesEnabled();
				var currencyExists = itpm.currenciesEnabled();
				var locationexists = itpm.locationsEnabled();
				var lineCount = SetRec.getLineCount('line');


				if(lineCount > 0){
					var SettelementRec = record.create({
						type:'customtransaction_itpm_settlement'
					});

					//Setting primary information field group values

					var setRefCode = SetRec.getValue('custbody_itpm_otherrefcode');
					var customer = SetRec.getValue('custbody_itpm_customer');
					SettelementRec.setValue({
						fieldId:'custbody_itpm_otherrefcode',
						value: setRefCode
					}).setValue({
						fieldId:'trandate',
						value: new Date()
					}).setValue({
						fieldId:'custbody_itpm_customer',
						value: customer
					}).setValue({
						fieldId:'custbody_itpm_appliedto',
						value: SetID
					}).setValue({
						fieldId:'transtatus',
						value: 'B'
					});

					// Setting Classification field group values

					if(subsidiaryExists){
						var subsidiary = SetRec.getValue('subsidiary');
						SettelementRec.setValue({
							fieldId:'subsidiary',
							value:subsidiary
						});
					}
					if(locationexists){
						var location = SetRec.getValue('location');
						SettelementRec.setValue({
							fieldId:'location',
							value:location
						});
					}

					// Setting Promotion Detail field group values

					var promotion = SetRec.getValue('custbody_itpm_set_promo'),
						promotionNo = SetRec.getValue('custbody_itpm_set_promonum'),
						promoDesc = SetRec.getValue('custbody_itpm_set_promodesc'),
						shipStart = SetRec.getValue('custbody_itpm_set_promoshipstart'),
						shiEnd = SetRec.getValue('custbody_itpm_set_promoshipend'),
						netpromoLiability = SetRec.getValue('custbody_itpm_set_netliability'),
						maxpromoLiability = SetRec.getValue('custbody_itpm_set_incrd_promoliability');

					if(promotion){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_promo',
							value:promotion
						}).setValue({
							fieldId:'custbody_itpm_set_promonum',
							value:promotionNo
						}).setValue({
							fieldId:'custbody_itpm_set_promoshipstart',
							value:shipStart
						}).setValue({
							fieldId:'custbody_itpm_set_promoshipend',
							value:shiEnd
						});						
					}

					if(promoDesc){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_promodesc',
							value:promoDesc
						});
					}
					if(netpromoLiability){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_netliability',
							value:netpromoLiability
						});
					}
					if(maxpromoLiability){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_incrd_promoliability',
							value:maxpromoLiability
						});
					}

					//Setting transaction Detail field group values

					var itpmAmount = SetRec.getValue('custbody_itpm_amount'),
						netliabilityLS = SetRec.getValue('custbody_itpm_set_netliabilityls'),
						setReqLS = SetRec.getValue('custbody_itpm_set_reqls'),
						underpaidLS = SetRec.getValue('custbody_itpm_set_paidls'),
						netliabilityBB = SetRec.getValue('custbody_itpm_set_netliabilitybb'),
						setReqBB = SetRec.getValue('custbody_itpm_set_reqbb'),
						underpaidBB = SetRec.getValue('custbody_itpm_set_paidbb'),
						netliabilityOI = SetRec.getValue('custbody_itpm_set_netliabilityoi'),
						setReqOI = SetRec.getValue('custbody_itpm_set_reqoi'),
						underpaidOI = SetRec.getValue('custbody_itpm_set_paidoi')


					SettelementRec.setValue({
						fieldId:'custbody_itpm_amount',
						value:(itpmAmount)?itpmAmount:0
					}).setValue({
						fieldId:'memo',
						value:'Voiding Settlement # '+SetRec.getValue('tranid')
					});

					log.debug('netliabilityLS,setReqLS,underpaidLS',typeof netliabilityLS+','+setReqLS+','+underpaidLS);
					if(netliabilityLS){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_netliabilityls',
							value:netliabilityLS
						});
					}
					if(setReqLS){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_reqls',
							value:setReqLS
						});
					}
					if(underpaidLS){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_paidls',
							value:underpaidLS
						});
					}
					if(netliabilityBB){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_netliabilitybb',
							value:netliabilityBB
						});
					}
					if(setReqBB){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_reqbb',
							value:setReqBB
						});
					}
					if(underpaidBB){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_paidbb',
							value:underpaidBB
						});
					}
					if(netliabilityOI){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_netliabilityoi',
							value:netliabilityOI
						});
					}
					if(setReqOI){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_reqoi',
							value:setReqOI
						});
					}
					if(underpaidOI){
						SettelementRec.setValue({
							fieldId:'custbody_itpm_set_paidoi',
							value:underpaidOI
						});
					}



					//Setting line level values						


					for(var i = 0;i < lineCount;i++){
						var account = SetRec.getSublistValue({sublistId:'line',fieldId:'account',line:i});
						var credit = SetRec.getSublistValue({sublistId:'line',fieldId:'credit',line:i});
						var debit = SetRec.getSublistValue({sublistId:'line',fieldId:'debit',line:i});
						var memo = SetRec.getSublistValue({sublistId:'line',fieldId:'memo',line:i});
						var department = SetRec.getSublistValue({sublistId:'line',fieldId:'department',line:i});
						var Class = SetRec.getSublistValue({sublistId:'line',fieldId:'class',line:i});
						var department = SetRec.getSublistValue({sublistId:'line',fieldId:'department',line:i});
						var lumsumType = SetRec.getSublistValue({sublistId:'line',fieldId:'custcol_itpm_lsbboi',line:i});
						var itpmItem = SetRec.getSublistValue({sublistId:'line',fieldId:'custcol_itpm_set_item',line:i});
						var allocationFactor = SetRec.getSublistValue({sublistId:'line',fieldId:'custcol_itpm_set_allocationfactor',line:i});
						var itpmAllowance = SetRec.getSublistValue({sublistId:'line',fieldId:'custcol_itpm_set_allowance',line:i});

						log.debug(i,'account ='+account+' credit='+credit+' debit='+debit+' lumsumType='+lumsumType);
						log.debug('SettelementRec',SettelementRec);					
						SettelementRec.setSublistValue({
							sublistId:'line',
							fieldId:'account',
							value:account,
							line:i
						}).setSublistValue({
							sublistId:'line',
							fieldId:'credit',
							value:(debit != '')?debit:0,
									line:i
						}).setSublistValue({
							sublistId:'line',
							fieldId:'debit',
							value:(credit != '')?credit:0,
									line:i
						}).setSublistValue({
							sublistId:'line',
							fieldId:'entity',
							value:SetRec.getValue('custbody_itpm_customer'),
							line:i
						});
						if(memo){
							SettelementRec.setSublistValue({
								sublistId:'line',
								fieldId:'memo',
								value:memo,
								line:i
							});
						}					
						if(itpm.departmentsEnabled()){
							if(department){
								SettelementRec.setSublistValue({
									sublistId:'line',
									fieldId:'department',
									value:department,
									line:i
								});
							}
						}
						if(itpm.classesEnabled()){
							if(Class){
								SettelementRec.setSublistValue({
									sublistId:'line',
									fieldId:'class',
									value:Class,
									line:i
								});
							}
						}
						if(lumsumType){
							SettelementRec.setSublistValue({
								sublistId:'line',
								fieldId:'custcol_itpm_lsbboi',
								value:lumsumType,
								line:i
							});
						}
						if(itpmItem){
							SettelementRec.setSublistValue({
								sublistId:'line',
								fieldId:'custcol_itpm_set_item',
								value:itpmItem,
								line:i
							});
						}
						if(allocationFactor){
							SettelementRec.setSublistValue({
								sublistId:'line',
								fieldId:'custcol_itpm_set_allocationfactor',
								value:allocationFactor,
								line:i
							});
						}
						if(itpmAllowance){
							SettelementRec.setSublistValue({
								sublistId:'line',
								fieldId:'custcol_itpm_set_allowance',
								value:itpmAllowance,
								line:i
							});
						}

					}

					var SettlementRecId = SettelementRec.save({
						enableSourcing:false,
						ignoreMandatoryFields:true
					});

					log.debug('SettlementRecId',SettlementRecId);
				}

				if(SettlementRecId){
					var transactionId = SetRec.getValue('custbody_itpm_appliedto');
					var setReq = parseFloat(SetRec.getValue('custbody_itpm_amount'));
					SetRec.setValue({
						fieldId:'transtatus',
						value:'C'
					}).save({
						enableSourcing:false,
						ignoreMandatoryFields:true
					});
					if(transactionId && setReq > 0){
						//getting the type of transaction
						var transType = search.lookupFields({
							type: search.Type.TRANSACTION,
							id: transactionId,
							columns: ['type']
						});
						if(transType.type[0].text == '- iTPM Deduction'){
							var deductionRec = record.load({
								type:'customtransaction_itpm_deduction',
								id:transactionId
							});
							var deductionOpenBal = parseFloat(deductionRec.getValue('custbody_itpm_ddn_openbal'));
							deductionOpenBal = (deductionOpenBal > 0)?deductionOpenBal:0;
							deductionRec.setValue({
								fieldId:'custbody_itpm_ddn_openbal',
								value:deductionOpenBal + setReq
							}).save({
								enableSourcing:false,
								ignoreMandatoryFields:true
							});	
							//getting the Journal Entry record which created when the settlement is created from Deduction
							var jeser = search.create({
								type:'journalentry',
								column:['tranid'],
								filters:[['custbody_itpm_appliedto','is',SetID]]
							}).run().getRange(0,1);
							log.debug('jeserlenngth',jeser.length);
							if(jeser.length > 0){
								var JEcopy = record.copy({
									type: 'journalentry',
									id: jeser[0].id,
									isDynamic: true
								});
								var parentJEtranid = search.lookupFields({
									type: 'journalentry',
									id: jeser[0].id,
									columns: ['tranid']
								}).tranid ;
								log.debug('parentJEtranid ',parentJEtranid );
								var JEcopyMemo = 'Reversing JE '+ parentJEtranid +' for Voiding Settlement # '+SetRec.getValue('tranid');
								JEcopy.setValue({
									fieldId:'memo',
									value:JEcopyMemo
								});
								log.debug('JEcopyMemo   ',JEcopyMemo);
								var JElineCount = JEcopy.getLineCount('line');
								for(var i = 0;i < JElineCount;i++){
									var JEcredit = JEcopy.getSublistValue({sublistId:'line',fieldId:'credit',line:i});
									var JEdebit = JEcopy.getSublistValue({sublistId:'line',fieldId:'debit',line:i});
									var selectJELine = JEcopy.selectLine({ sublistId: 'line', line: i });

									selectJELine.setCurrentSublistValue({
										sublistId:'line',
										fieldId:'debit',
										value:(JEcredit > 0)?JEcredit:'',
												line:i
									}).setCurrentSublistValue({
										sublistId:'line',
										fieldId:'credit',
										value:(JEdebit > 0)?JEdebit:'',
												line:i
									}).setCurrentSublistValue({
										sublistId:'line',
										fieldId:'memo',
										value:JEcopyMemo,
										line:i
									});
									JEcopy.commitLine({
										sublistId: 'line'
									});
								}
								var JECopyRecId = JEcopy.save({
									enableSourcing:false,
									ignoreMandatoryFields:true
								});
								log.debug('JECopyRecId',JECopyRecId);
							}
						}        				
					}
				}
				redirect.toRecord({
					type:'customtransaction_itpm_settlement',
					id:SettlementRecId
				});
			}
		}catch(e){
			log.error(e.name,'record id = '+context.request.parameters.sid+', message = '+e.message);
			if(e.name == 'SETTLEMENT_INVALID_STATUS'){
				throw Error(e.message);
			}
			if(e.name == 'SETTLEMENT_PROCESSING_STATUS'){
				throw Error(e.message);
			}
		}
	}

	return {
		onRequest: onRequest
	};
});