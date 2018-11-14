/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * This script add buttons on settlement based on conditions and validating the settlement on edit and create.
 */
define(['N/record',
		'N/redirect',
		'N/runtime',
		'N/search',
		'N/format',
		'N/ui/serverWidget',
		'./iTPM_Module_Settlement.js',
		'./iTPM_Module.js'
		],

	function(record, redirect, runtime, search, format, serverWidget, ST_Module, itpm) {
	
	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {string} scriptContext.type - Trigger type
	 * @param {Form} scriptContext.form - Current form
	 * @Since 2015.2
	 */
	function beforeLoad(scriptContext) {
		try{
			if(scriptContext.type == 'copy'){
				throw {
					name: 'copy settlement',
					message: "Copying a settlement is not allowed."
				}
			}
			if(runtime.executionContext == runtime.ContextType.USER_INTERFACE){
				var settlementRec = scriptContext.newRecord;
				var setStatus = settlementRec.getValue('transtatus'); //Requested / Unapplied => A
//				var setReqAmount = settlementRec.getValue('custbody_itpm_amount');
//				var setLumSum = settlementRec.getValue('custbody_itpm_set_reqls');
//				var setBB = settlementRec.getValue('custbody_itpm_set_reqbb');
//				var setOffInv = settlementRec.getValue('custbody_itpm_set_reqoi');

				//getting the user permission on JE,-iTPM Deduction Permission and -iTPM Settlemet Permission records 
				var scriptObj = runtime.getCurrentScript();
				var JEPermission = runtime.getCurrentUser().getPermission('TRAN_JOURNAL');
				var checkPermission = runtime.getCurrentUser().getPermission('TRAN_CHECK');
//				var ddnPermission = itpm.getUserPermission(scriptObj.getParameter('custscript_itpm_set_ddn_permsn_rectypeid'));
				var setPermission = itpm.getUserPermission(scriptObj.getParameter('custscript_itpm_set_set_permsn_rectypeid'));
				log.debug('JE Permission',JEPermission);
//				log.debug('ddn Permission',ddnPermission);
				log.debug('ddn Permission',setPermission);
				var postingPeriodId = settlementRec.getValue({fieldId:'postingperiod'});

				/*if(setStatus == 'A' && setReqAmount > 0 && (setLumSum > 0 || setBB > 0 || setOffInv > 0)){
					//-iTPM Settlement Permission and -iTPM Deduction Permission = Edit or greater and Journal Entry permission = CREATE or FULL
					if(setPermission >= 3 && ddnPermission >= 3 && JEPermission >= 2){
						scriptContext.form.addButton({
							id:'custpage_itpm_applytoddn',
							label:'Apply To Deduction',
							functionName:'redirectToDeductionList('+scriptContext.newRecord.id+','+ postingPeriodId+')'
						});
					}

					//Check Permission = CREATE or greater and Journal Entry permission = CREATE or FULL
					if (setPermission >= 3 && checkPermission >= 2 && JEPermission >= 2 && (setLumSum > 0 || setBB > 0)){
						scriptContext.form.addButton({
							id:'custpage_itpm_applytocheck',
							label:'Apply To Check',
							functionName:'redirectToCheck('+scriptContext.newRecord.id+','+ postingPeriodId+')'
						});
					}
				}*/

				//-iTPM Settlement Permission = EDIT or FULL and Journal Entry permission = CREATE or FULL
				// Based on the itpm applied to field getting transaction type and hiding void button if the type is settlement 
				var transactionId = settlementRec.getValue('custbody_itpm_appliedto');
				var transactionType;
				if(transactionId){
					var transType = search.lookupFields({
						type: search.Type.TRANSACTION,
						id: transactionId,
						columns: ['type']
					});
					transactionType = transType.type[0].text;
					log.debug('type',transType.type[0].text);
				}
				if((setStatus == 'B' || setStatus == 'A' || setStatus == 'E') && 
					scriptContext.type == scriptContext.UserEventType.VIEW &&
					setPermission >= 3 && JEPermission >= 2 && 
					transactionType != '- iTPM Settlement'){
						scriptContext.form.addButton({
							id:'custpage_itpm_settlemevoid',
							label:'Void',
							functionName:'voidSettlement('+scriptContext.newRecord.id+','+ postingPeriodId+')'
						});
				}

				scriptContext.form.clientScriptModulePath = './iTPM_Attach_Settlement_ClientMethods.js';
				var eventType = scriptContext.type;
				if(eventType == 'edit'){
					//restrict the user to editing an Processed Settlement 
					if(setStatus == 'E'){
						throw {error:'custom',message:" The settlement is in Processing status, It cannot be Edited"};
					}else if(setStatus == 'C'){
						throw {error:'custom',message:" The settlement is Voided, It cannot be Edited"};
					}  			
				}
				if(eventType == 'create'){
					if(scriptContext.request.parameters.custom_from != 'promo'){
						var setlAplyToField = scriptContext.form.getField({
						    id : 'custbody_itpm_appliedto'
						});
						log.debug('setlAplyToField',setlAplyToField);
						setlAplyToField.updateDisplayType({
						    displayType: serverWidget.FieldDisplayType.INLINE
						});
					}
					createSettlement(scriptContext.request.parameters, settlementRec);    			
				}
			}
		}catch(e){
			if(e.name == 'copy settlement')
				throw new Error(e.message);
			else if(e.error == 'custom')
				throw e.message;
			else
				log.error(e.name,'record type = iTPM Settlement, function name = beforeload, record id='+scriptContext.newRecord.id+', message='+e.message);
		}
	}

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {
    	try{
    		var contextType = runtime.executionContext;
    		if(contextType != runtime.ContextType.USER_INTERFACE)return;
			if(scriptContext.type == 'edit' || scriptContext.type == 'create'){ 
	    		log.debug('type',scriptContext.type);
	    		//not getting the Thousands in the values of currency fields 
	    		var settlementRec = scriptContext.newRecord;
				//it is new field on settlement record.
	        	var offsetTranGLImpact = settlementRec.getValue('custbody_itpm_set_ofset_tran_gl_impact');	    		
	    		var settlementReq = parseFloat(settlementRec.getValue('custbody_itpm_amount'));
	    		settlementReq = (offsetTranGLImpact)?Math.abs(settlementReq):settlementReq;	        	
				var lumsumSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqls'));
				lumsumSetReq = (lumsumSetReq)?lumsumSetReq:0;
				lumsumSetReq = (offsetTranGLImpact)?Math.abs(lumsumSetReq):lumsumSetReq;
				var billbackSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqbb'));
				billbackSetReq = (billbackSetReq)?billbackSetReq:0;
				billbackSetReq = (offsetTranGLImpact)?Math.abs(billbackSetReq):billbackSetReq;
				var offInvSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqoi'));
				offInvSetReq = (offInvSetReq)?offInvSetReq:0;
				offInvSetReq = (offsetTranGLImpact)?Math.abs(offInvSetReq):offInvSetReq;
				var promoId = settlementRec.getValue('custbody_itpm_set_promo');
				var promoDealRec = search.lookupFields({
	        		type:'customrecord_itpm_promotiondeal',
	        		id:promoId,
	        		columns:[	'name',
	        					'custrecord_itpm_p_lumpsum',
	        					'custrecord_itpm_p_type',
	        					'custrecord_itpm_p_account',
	        					'custrecord_itpm_p_type.custrecord_itpm_pt_defaultaccount']
	    		});
				var promoLS = promoDealRec['custrecord_itpm_p_lumpsum']; 
				var promoHasAllBB = ST_Module.getAllowanceMOP(promoId,1);
	        	var promoHasAllOI = ST_Module.getAllowanceMOP(promoId,3);
	        	var promoHasAllNB = ST_Module.getAllowanceMOP(promoId,2);
				log.debug('settlementRec',settlementRec);
				log.debug('st_reql',settlementReq);
				log.debug('lumsum',lumsumSetReq);
				log.debug('billback',billbackSetReq);
				log.debug('offinvoice',offInvSetReq);
				//overriding the settlement lines
				var applyToDeduction = settlementRec.getValue('custbody_itpm_appliedto');
				var numLines = settlementRec.getLineCount({
					sublistId: 'line'
				});
				var promoTypeDefaultAccnt = promoDealRec['custrecord_itpm_p_type.custrecord_itpm_pt_defaultaccount'][0].value;
				var promoDealLumsumAccnt = (promoDealRec['custrecord_itpm_p_account'].length >0)?promoDealRec['custrecord_itpm_p_account'][0].value:promoTypeDefaultAccnt;
				var subsid = (itpm.subsidiariesEnabled())? settlementRec.getValue({fieldId:'subsidiary'}) : undefined;
				var prefObj = itpm.getPrefrenceValues(subsid);
	        	prefObj.lumsumSetReq = lumsumSetReq;
	        	prefObj.billbackSetReq = billbackSetReq;
	        	prefObj.offinvoiceSetReq = offInvSetReq;
	        	prefObj.promoTypeDefaultAccnt = promoTypeDefaultAccnt;
	        	prefObj.promoDealLumsumAccnt = promoDealLumsumAccnt;
				
				//If Lump sum value in settlement record have a value and LS Amount on promotion is zero then we throw error 
				if(lumsumSetReq > 0 && !promoHasAllNB){
					if(promoLS <= 0){
						throw {error:'custom',message:" Promotion: "+promoDealRec['name']+" Lump sum should be greater than Zero"};
					}
				}
				if(lumsumSetReq <= 0 && billbackSetReq <= 0 && offInvSetReq <= 0){
					throw {error:'custom',message:"Atleast any one settlement request value MUST be greater than zero"}
				}
				if(!promoHasAllOI){
					if(offInvSetReq > 0){
						throw {error:'custom',message:"Off invoice request value should be zero"};
					}
				}
				if(!promoHasAllBB){
					if(billbackSetReq > 0){
						throw {error:'custom',message:'Bill back request value should be zero'};
					}
				}
				if(settlementReq.toFixed(2) != (lumsumSetReq+billbackSetReq+offInvSetReq).toFixed(2)){
					throw {error:'custom',message:"settlement request must be equal to the sum of bill back, off-invoice and lump sum"};
				}
				
				if(scriptContext.type == 'edit'){
					var settlementOldRec = scriptContext.oldRecord;
					//the new record value is less than or equal to old record value for this field. If yes, 
					//allow record to be saved. If not, return a user error (before user submit) - 
					//"The settlement amount cannot exceed the amount set at the time of record creation by the deduction Open Balance."
					var oldSettlementReq = settlementOldRec.getValue('custbody_itpm_amount');					
					//Changed the Settlement status when user changed the Settlement Request LS/BB/OI values
//					var oldLS = settlementOldRec.getValue('custbody_itpm_set_reqls');
//					oldLS = (oldLS)?parseFloat(oldLS):0;
//					var oldBB = settlementOldRec.getValue('custbody_itpm_set_reqbb');
//					oldBB = (oldBB)?parseFloat(oldBB):0;
//					var oldOI = settlementOldRec.getValue('custbody_itpm_set_reqoi');
//					oldOI = (oldOI)?parseFloat(oldOI):0;
					if(applyToDeduction && (settlementReq > oldSettlementReq)){
						throw {error:'custom',message:"The settlement amount cannot exceed the amount set at the time of record creation by the deduction Open Balance."}
					}	
					
//					if(oldLS != lumsumSetReq || oldBB != billbackSetReq || oldOI != offInvSetReq){
						settlementRec.setValue({
							fieldId: 'transtatus',
							value: 'E'
						});
//					}				
				}
				var stMemo = 'Settlement Created From Promotion # '+promoDealRec.name;
				var createdFromDDN = undefined;
				if(applyToDeduction){
					createdFromDDN = search.lookupFields({
						type:search.Type.TRANSACTION,
						id:applyToDeduction,
						columns:['recordtype']
					})['recordtype'] == 'customtransaction_itpm_deduction';
					
					if(createdFromDDN){
						var ddnLookUp = record.load({
							type:'customtransaction_itpm_deduction',
							id:applyToDeduction
						});

						log.debug('ddnLookUp ',ddnLookUp.getValue('tranid'));
						log.audit('ddnLookUp ',ddnLookUp.getValue('custbody_itpm_ddn_openbal'));
						stMemo = (ddnLookUp.getValue('tranid') != undefined)?'Settlement Created From Deduction #'+ddnLookUp.getValue('tranid'):stMemo;
						
						if(contextType == 'USERINTERFACE' && scriptContext.type == 'create'){
							//Validating the Deduction amount should be greater than zero.
							if(parseFloat(ddnLookUp.getValue('custbody_itpm_ddn_openbal')) <= 0){
								throw {error:'custom',message:"The Deduction Open Balance should be greater than zero."};
							}
							//Validating the Deduction Amount with the Settlement Request Amount
							if(settlementReq > parseFloat(ddnLookUp.getValue('custbody_itpm_ddn_openbal'))){
								throw {error:'custom',message:"The settlement amount cannot exceed the deduction Open Balance."};
							}
						} 
					}
				}
				for(var v = numLines - 1 ; v >= 0; v--){    					
					settlementRec.removeLine({
						sublistId: 'line',
						line: v
					});
				}	
				
				ST_Module.getSettlementLines(prefObj).forEach(function(e, index){
					if(e.amount > 0){
						if(offsetTranGLImpact){
	        				e.account = prefObj.settlementAccnt;
	        			}
						settlementRec.setSublistValue({
							sublistId:'line',
							fieldId:'account',
							value:(e.type == 'credit' && createdFromDDN)? ddnLookUp.getSublistValue({sublistId:'line',fieldId:'account',line:ddnLookUp.getLineCount('line') - 1}) : e.account,
							line:index
						}).setSublistValue({
							sublistId:'line',
							fieldId:e.type,
							value:e.amount,
							line:index
						}).setSublistValue({
							sublistId:'line',
							fieldId:'custcol_itpm_lsbboi',
							value:e.id,
							line:index
						}).setSublistValue({
							sublistId:'line',
							fieldId:'memo',
							value: stMemo,
							line:index
						}).setSublistValue({
							sublistId:'line',
							fieldId:'entity',
							value:settlementRec.getValue('custbody_itpm_customer'),
							line:index
						});
					}				
				});
			}
    	}catch(e){
    		if(e.error == 'custom'){
    			throw e.message;
    		}else{
    			log.error(e.name,'function name = beforesubmit, message = '+e.message);
    		}
    	}
    }
    
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
    	try{
    		var contextType = runtime.executionContext;
    		var eventType = scriptContext.type;
    		var settlementOldRec = scriptContext.oldRecord;
			var settlementNewRec = scriptContext.newRecord;
			if(contextType == 'USERINTERFACE' && eventType == 'create'){
				var ddnId = settlementNewRec.getValue('custbody_itpm_appliedto');
				if(ddnId){
					ST_Module.applyToDeduction({
						ddn:ddnId, 
						settlement_amount: parseFloat(settlementNewRec.getValue('custbody_itpm_amount'))
					});
				}
			} 		
			if(contextType == 'USERINTERFACE' && eventType == 'edit'){
				var oldStatus = settlementOldRec.getValue('transtatus');
				var newStatus = settlementNewRec.getValue('transtatus');
				var promoId = settlementNewRec.getValue('custbody_itpm_set_promo');	
				log.debug('Old Status & New Status', oldStatus+' & '+newStatus);
				if((oldStatus == 'E' && (newStatus == 'A' || newStatus == 'B')) || ((oldStatus == 'A' || oldStatus == 'B') && newStatus == 'C')){
					//Creating New KPI Queue Record
					itpm.createKPIQueue(promoId, 5); //1.Scheduled, 2.Edited, 3.Status Changed, 4.Ad-hoc and 5.Settlement Status Changed
				}
			}  
    	}catch(e){
    		log.error(e.name,'function name = aftersubmit, message = '+e.message);
    	}
    }
    /**
	 * function createSettlement(params)
	 * 
	 *  @param {Object} scriptParms
	 *   @param {Object} settlementRec
	 */
	function createSettlement(scriptParms, settlementRec){
		try{
			log.debug('scriptParms', scriptParms);
        	var promoId = scriptParms.custom_promoid;
        	var createdFromDDN = (scriptParms.custom_from == 'ddn');
			//Adding values to the Settlement fields
			//loading the record for NET PROMOTIONAL LIABLIITY, INCURRED PROMOTIONAL LIABILITY fields(These are did not return a value in lookupFields method)
    		var promotionRec = record.load({
				type:'customrecord_itpm_promotiondeal',
				id: promoId
			});
    		
    		var promoTypeRecLookup = search.lookupFields({
        		type:'customrecord_itpm_promotiontype',
        		id:promotionRec.getValue({fieldId:'custrecord_itpm_p_type'}),
        		columns:['custrecord_itpm_pt_defaultaccount']
    		});
    		var subsidiaryExists = itpm.subsidiariesEnabled();
    		var customerId = promotionRec.getValue({fieldId:'custrecord_itpm_p_customer'});
    		var promoNetLiabilityLS = promotionRec.getValue({fieldId:'custrecord_itpm_p_netlsle'});
    		promoNetLiabilityLS = format.parse({value:promoNetLiabilityLS, type: format.Type.CURRENCY}).toFixed(2);        	
			var promoOverpayLS = promotionRec.getValue({fieldId:'custrecord_itpm_p_lsoverpayamount'});
			promoOverpayLS = format.parse({value:promoOverpayLS, type: format.Type.CURRENCY}).toFixed(2);
        	var promoNetLiabilityBB = parseFloat(promotionRec.getValue({fieldId:'custrecord_itpm_p_netbillbackle'}));
        	promoNetLiabilityBB = format.parse({value:promoNetLiabilityBB, type: format.Type.CURRENCY}).toFixed(2);
        	var promoOverpayBB = promotionRec.getValue({fieldId:'custrecord_itpm_p_billbackoverpayamount'});
        	promoOverpayBB = format.parse({value:promoOverpayBB, type: format.Type.CURRENCY}).toFixed(2);
        	var promoNetLiabilityOI = promotionRec.getValue({fieldId:'custrecord_itpm_netliabilityoi'});
        	promoNetLiabilityOI = format.parse({value:promoNetLiabilityOI, type: format.Type.CURRENCY}).toFixed(2);
        	var promoOverpayOI = promotionRec.getValue({fieldId:'custrecord_itpm_p_missedoioverpayamount'});
        	promoOverpayOI = format.parse({value:promoOverpayOI, type: format.Type.CURRENCY}).toFixed(2);
        	var promoTypeDefaultAccnt = promoTypeRecLookup['custrecord_itpm_pt_defaultaccount'][0].value;
			var promoDealLumsumAccnt = promotionRec.getValue({fieldId:'custrecord_itpm_p_account'});
			log.audit('promoDealLumsumAccnt',promoDealLumsumAccnt);
			promoDealLumsumAccnt = (promoDealLumsumAccnt)?promoDealLumsumAccnt:promoTypeDefaultAccnt;
			log.audit('promoDealLumsumAccnt after condition',promoDealLumsumAccnt);
        	var promoName = promotionRec.getValue({fieldId:'name'});
        	var currencyExists = itpm.currenciesEnabled();       	
				
    		var subsid = undefined;
    		if(subsidiaryExists){
        		subsid = promotionRec.getValue({fieldId:'custrecord_itpm_p_subsidiary'});
            	var subsText = promotionRec.getValue({fieldId:'custrecord_itpm_p_subsidiary'});
            	settlementRec.setValue({
            	    fieldId: 'subsidiary',
            	    value: subsid
            	});
        	}
    		if(currencyExists){
        		var currencyId = promotionRec.getValue({fieldId:'custrecord_itpm_p_currency'});
        		settlementRec.setValue({
            	    fieldId: 'currency',
            	    value: currencyId
            	});
        	}
        	settlementRec.setValue({
        	    fieldId: 'custbody_itpm_customer',
        	    value: customerId
        	});
        	settlementRec.setValue({
        		fieldId: 'transtatus',
        		value: 'E'
        	});
        	if(createdFromDDN){
        		var locationsExists = itpm.locationsEnabled();
        		var departmentsExists = itpm.departmentsEnabled();
        		var classesExists = itpm.classesEnabled();
        		
        		settlementRec.setValue({
            	    fieldId: 'custbody_itpm_appliedto',
            	    value: scriptParms.custom_ddn
            	});
        		var ddnLookUp = record.load({
        			type:'customtransaction_itpm_deduction',
        			id:scriptParms.custom_ddn
        		});
        		log.debug('ddnLookUp ',ddnLookUp);
        		
        		if(locationsExists){
        			settlementRec.setValue({
                	    fieldId: 'location',
                	    value: ddnLookUp.getValue('location')
                	});
        		}
        	}
        	settlementRec.setValue({
        	    fieldId: 'custbody_itpm_set_promo',
        	    value: promoId
        	});
        	settlementRec.setValue({
        	    fieldId: 'custbody_itpm_set_netliabilityls',
        	    value: promoNetLiabilityLS
        	});
        	settlementRec.setValue({
        	    fieldId: 'custbody_itpm_set_paidls',
        	    value: promoOverpayLS
        	});
        	settlementRec.setValue({
        	    fieldId: 'custbody_itpm_set_netliabilitybb',
        	    value: promoNetLiabilityBB
        	});
        	settlementRec.setValue({
        	    fieldId: 'custbody_itpm_set_paidbb',
        	    value: promoOverpayBB
        	});
        	settlementRec.setValue({
        	    fieldId: 'custbody_itpm_set_netliabilityoi',
        	    value: promoNetLiabilityOI
        	});
        	settlementRec.setValue({
        	    fieldId: 'custbody_itpm_set_paidoi',
        	    value: promoOverpayOI
        	});
        	var prefObj = itpm.getPrefrenceValues(subsid);
        	prefObj.lumsumSetReq = 0;//lumsumSetReq;
        	prefObj.billbackSetReq = 0;//billbackSetReq;
        	prefObj.offinvoiceSetReq = 0;//offinvoiceSetReq;
        	prefObj.promoTypeDefaultAccnt = promoTypeDefaultAccnt;
        	prefObj.promoDealLumsumAccnt = promoDealLumsumAccnt;
        	
        	//it is new field on settlement record.
        	if(scriptParms.custom_from == 'promo'){
        		settlementRec.setValue({
        			fieldId: 'custbody_itpm_set_ofset_tran_gl_impact',
        			value: true
        		});
        	}
        	
        	ST_Module.getSettlementLines(prefObj).forEach(function(e, index){
				//if(e.amount == 0){
        			if(!createdFromDDN){
        				e.account = prefObj.settlementAccnt;
        			}
					settlementRec.setSublistValue({
						sublistId:'line',
						fieldId:'account',
						value:(e.type == 'credit' && createdFromDDN)? ddnLookUp.getSublistValue({sublistId:'line',fieldId:'account',line:ddnLookUp.getLineCount('line') - 1}) : e.account,
						line:index
					}).setSublistValue({
						sublistId:'line',
						fieldId:e.type,
						value:e.amount,
						line:index
					}).setSublistValue({
						sublistId:'line',
						fieldId:'custcol_itpm_lsbboi',
						value:e.id,
						line:index
					}).setSublistValue({
						sublistId:'line',
						fieldId:'memo',
						value:(createdFromDDN)?'Settlement Created From Deduction #'+ddnLookUp.getValue('tranid'):'Settlement Created From Promotion # '+promoName,
    					line:index
					}).setSublistValue({
						sublistId:'line',
						fieldId:'entity',
						value:customerId,
						line:index
					});
				//}				
			});
		}catch(e){
    		log.error(e.name,'function name = createSettlement, message = '+e.message);
    	}
	}
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});