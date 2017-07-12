/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * Calling suitelet to edit settlement and validate then saving the settlement 
 */
define(['N/redirect','N/runtime','N/search','N/record'],

function(redirect,runtime,search,record) {
   
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
    		var eventType = scriptContext.type,contextType = runtime.executionContext
    		if(contextType == 'USERINTERFACE' && eventType == 'edit'){
    			var settlementRec = scriptContext.newRecord;
    			redirect.toSuitelet({
    				scriptId:'customscript_itpm_settlement_using_su',
    				deploymentId:'customdeploy_itpm_settlement_using_su',
    				returnExternalUrl: false,
    				parameters:{sid:settlementRec.id,from:'setrec',type:'edit'}
    			});
    		}
    	}catch (e) {
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
    		var settlementRec = scriptContext.newRecord,settlementOldRec;
    		if(scriptContext.type == 'edit'){
    			settlementOldRec = scriptContext.oldRecord;
    			var settlementReq = parseFloat(settlementRec.getValue('custbody_itpm_set_amount'));
    			var lumsumSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqls'));
    			var billbackSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqbb'));
    			var offInvSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqoi'));
    			log.debug('settlementRec',settlementRec);
    			log.debug('st_reql',settlementReq);
    			log.debug('lumsum',lumsumSetReq);
    			log.debug('billback',billbackSetReq);
    			log.debug('offinvoice',offInvSetReq);
    			//the new record value is less than or equal to old record value for this field. If yes, 
    			//allow record to be saved. If not, return a user error (before user submit) - "The settlement amount cannot exceed the amount set at the time of record creation by the deduction Open Balance."
    			var oldSettlementReq = settlementOldRec.getValue('custbody_itpm_set_amount'),
    			applyToDeduction = settlementOldRec.getValue('custbody_itpm_set_deduction');
    			if(applyToDeduction !='' && (settlementReq > oldSettlementReq))
    				throw {error:'custom',message:"The settlement amount cannot exceed the amount set at the time of record creation by the deduction Open Balance."}

    			var promotDealSearch = search.create({
    				type:'customrecord_itpm_promotiondeal',
    				columns:['custrecord_itpm_p_lumpsum','custrecord_itpm_p_type.custrecord_itpm_pt_validmop'],
    				filters:[['internalid','is',settlementRec.getValue('custbody_itpm_set_promo')]]
    			}).run();

    			promotDealSearch.each(function(e){
    				var promoTypeMOP = e.getValue({name:'custrecord_itpm_pt_validmop',join:'custrecord_itpm_p_type'})
    				promoTypeMOP = promoTypeMOP.split(','),
    				promoTypeMOPBillBack = promoTypeMOP.some(function(b){return b == 1}),
    				promoTypeMOPNetBill = promoTypeMOP.some(function(b){return b == 2}),
    				promoTypeMOPOffInvoice = promoTypeMOP.some(function(b){return b == 3});

    				//If the promotion type does not allow Off-Invoice and Net Bill, do not allow record to be submitted with a positive value in off-invoice request.
    				//If the promotion type does not allow Bill Back, do not allow record to be submitted with a positive value in bill back request.
    				//If the promotion record does not have a lump sum, do not allow record to be submitted with a positive value in lump sum request.
    				if(!promoTypeMOPOffInvoice && !promoTypeMOPNetBill){
    					if(settlementRec.getValue('custbody_itpm_set_reqoi') > 0){
    						throw {error:'custom',message:"Off invoice request value should be zero"};
    					}
    				}

    				if(!promoTypeMOPBillBack){
    					if(settlementRec.getValue('custbody_itpm_set_reqbb')>0){
    						throw {error:'custom',message:'Bill back request value should be zero'};
    					}
    				}

    				if(e.getValue('custrecord_itpm_p_lumpsum') <= 0){
    					if(settlementRec.getValue('custbody_itpm_set_reqls')>0){
    						throw {error:'custom',message:"Lum sum request value should be zero"};
    					}
    				}

    				if(!promoTypeMOPOffInvoice && !promoTypeMOPNetBill){
    					if((lumsumSetReq+billbackSetReq) != settlementReq){
    						throw {error:'custom',message:"The sum of bill back and lump sum settlement requests must be equal to the settlement request"};
    					}
    				}else{
    					if(settlementReq != (lumsumSetReq+billbackSetReq+offInvSetReq)){
    						throw {error:'custom',message:"settlement request must be equal to the sum of bill back, off-invoice and lump sum"};
    					}
    				}
    			});		
    		}
    		
    		if(scriptContext.type == 'edit' || scriptContext.type == 'create'){
    			// All settlement request values MUST be greater than zero. (Do NOT allow Lump Sum AND Bill Back to be zero during submit, on EDIT. Either of the fields can individually be zero, but not both.)
    			if(lumsumSetReq <= 0 && billbackSetReq <= 0){
    				throw {error:'custom',message:"Lump Sum AND Bill Back Either of the fields can individually be zero, but not both"};
    			}else if(settlementReq <= 0 && offInvSetReq <= 0){
    				throw {error:'custom',message:"All settlement request values MUST be greater than zero"}
    			}
    		}
    	}catch(e){
    		if(e.error == 'custom')
    			throw Error(JSON.stringify(e));
    		else
    			log.error(e.name,'function name = beforesubmit, message = '+e.message);
    	}
    }

 
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
    };
    
});
