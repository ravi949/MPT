/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * Calling suitelet to edit settlement and validate then saving the settlement 
 */
define(['N/record',
		'N/redirect',
		'N/runtime',
		'N/search',
		'N/format',
		'./iTPM_Module_Settlement.js',
		'./iTPM_Module.js'
		],

function(record, redirect, runtime, search, format, ST_Module, itpm) {
   
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
    		
    		var eventType = scriptContext.type;
    		var contextType = runtime.executionContext;
    		var settlementRec = scriptContext.newRecord;
    		if(contextType == 'USERINTERFACE' && eventType == 'edit'){
    			//var settlementRec = scriptContext.newRecord;
    			//restrict the user to editing an Processed Settlement 
    			var setlStatus = settlementRec.getValue('transtatus');
    			if(setlStatus == 'E'){
					throw {error:'custom',message:" The settlement is in Processing status, It cannot be Edited"};
				}else if(setlStatus == 'C'){
					throw {error:'custom',message:" The settlement is Voided, It cannot be Edited"};
				}else{
					/*redirect.toSuitelet({
	    				scriptId:'customscript_itpm_set_createeditsuitelet',
	    				deploymentId:'customdeploy_itpm_set_createeditsuitelet',
	    				returnExternalUrl: false,
	    				parameters:{sid:settlementRec.id,from:'setrec',type:'edit'}
	    			});*/
				}    			
    		}
    		if(contextType == 'USERINTERFACE' && eventType == 'create'){
    			createSettlement(scriptContext.request.parameters, settlementRec)    			
    		}
    	}catch (e) {
    		if(e.error == 'custom')
    			throw e.message;
    		else
    			log.error(e.name,'function name = beforeload, message = '+e.message);
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
    		log.debug('type',scriptContext.type)
    		//not getting the Thousands in the values of currency fields 
    		var settlementRec = scriptContext.newRecord;
    		var settlementOldRec;
    		var settlementReq = parseFloat(settlementRec.getValue('custbody_itpm_amount'));
			var lumsumSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqls'));
			lumsumSetReq = (lumsumSetReq)?lumsumSetReq:0
			var billbackSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqbb'));
			billbackSetReq = (billbackSetReq)?billbackSetReq:0
			var offInvSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqoi'));
			offInvSetReq = (offInvSetReq)?offInvSetReq:0
			var promoId = settlementRec.getValue('custbody_itpm_set_promo');
			var promoDealRec = search.lookupFields({
        		type:'customrecord_itpm_promotiondeal',
        		id:promoId,
        		columns:['name','custrecord_itpm_p_lumpsum']
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
			
    		if(scriptContext.type == 'edit'){
    			settlementOldRec = scriptContext.oldRecord;
    			//the new record value is less than or equal to old record value for this field. If yes, 
    			//allow record to be saved. If not, return a user error (before user submit) - "The settlement amount cannot exceed the amount set at the time of record creation by the deduction Open Balance."
    			var oldSettlementReq = settlementOldRec.getValue('custbody_itpm_amount'),
    			applyToDeduction = settlementOldRec.getValue('custbody_itpm_appliedto');
    			if(applyToDeduction !='' && (settlementReq > oldSettlementReq))
    				throw {error:'custom',message:"The settlement amount cannot exceed the amount set at the time of record creation by the deduction Open Balance."}
    		}
    		
    		if(scriptContext.type == 'edit' || scriptContext.type == 'create'){    			
    			if(scriptContext.type == 'create'){
    				log.debug("Val5465u465es", getSettlementLines({lumsumSetReq:lumsumSetReq,billbackSetReq:billbackSetReq,offinvoiceSetReq:offInvSetReq}));
    				getSettlementLines({lumsumSetReq:lumsumSetReq,billbackSetReq:billbackSetReq,offinvoiceSetReq:offInvSetReq}).forEach(function(e, index){
    					if(e.amount > 0){
    						settlementRec.setSublistValue({
    							sublistId:'line',
    							fieldId:e.type,
    							value:e.amount,
    							line:index
    						});
    					}				
    				});
    				var numLines = settlementRec.getLineCount({
    				    sublistId: 'line'
    				});
    				log.debug('numLines ',numLines);
    				for(var v = numLines - 1 ; v >= 0; v--){
    					log.debug('v ', v);
    					var lineCreditValue = settlementRec.getSublistValue({
    					    sublistId: 'line',
    					    fieldId: 'credit',
    					    line: v
    					});
    					lineCreditValue = (lineCreditValue)?lineCreditValue:0
    					var lineDebitValue = settlementRec.getSublistValue({
    					    sublistId: 'line',
    					    fieldId: 'debit',
    					    line: v
    					});
    					lineDebitValue = (lineDebitValue)?lineDebitValue:0
    							
    					if(parseFloat(lineCreditValue) <= 0 && parseFloat(lineDebitValue) <= 0){
    						settlementRec.removeLine({
        					    sublistId: 'line',
        					    line: v
        					});
    					}
    				}
    			}
    			    			
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
    			 			
    		}
    	}catch(e){
    		if(e.error == 'custom')
    			throw e.message;
    		else
    			log.error(e.name,'function name = beforesubmit, message = '+e.message);
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
    		var eventType = scriptContext.type;
    		var settlementOldRec = scriptContext.oldRecord;
			var settlementNewRec = scriptContext.newRecord;
			if(eventType == 'create'){
				ST_Module.applyToDeduction({sid:settlementNewRec.id,ddn:settlementNewRec.getValue('custbody_itpm_appliedto')},'D');//Here 'D' indicating Deduction.
			} 		
			if(eventType == 'edit'){
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
        		var ddnLookUp = search.lookupFields({
            		type:'customtransaction_itpm_deduction',
            		id: scriptParms.custom_ddn,
            		columns:['tranid','department','class','location','custbody_itpm_ddn_openbal']
        		});   
        		log.debug('ddnLookUp ',ddnLookUp);
        		
        		if(locationsExists){
        			settlementRec.setValue({
                	    fieldId: 'location',
                	    value: ddnLookUp.location[0].value
                	});
        		}
        		if(departmentsExists){
            		settlementRec.setValue({
                	    fieldId: 'department',
                	    value: ddnLookUp.department[0].value
                	});
        		}
        		if(classesExists){
        			var classDdn = settlementRec.getValue('');
        			settlementRec.setValue({
                	    fieldId: 'class',
                	    value: ddnLookUp.class[0].value
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
        	prefObj.promotionId = promoId;

			getSettlementLines(prefObj).forEach(function(e, index){
				//if(e.amount == 0){
					settlementRec.setSublistValue({
						sublistId:'line',
						fieldId:'account',
						value:e.account,
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
						value:(createdFromDDN)?'Settlement Created From Deduction #'+ddnLookUp.tranid:'Settlement Created From Promotion # '+promoName,
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

	/**
	 * @param lineObj
	 * @description
	 */
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
			account:lineObj.settlementAccnt,
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
			account:lineObj.settlementAccnt,
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
			account:lineObj.settlementAccnt,
			type:'credit',
			amount:lineObj.offinvoiceSetReq
		}];

	}
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
