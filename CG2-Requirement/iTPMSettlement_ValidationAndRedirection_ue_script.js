/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
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
    				scriptId:'customscript_itpm_set_suview_onedit',
    				deploymentId:'customdeploy_itpm_set_suview_onedit',
    				returnExternalUrl: false,
    				parameters:{sid:settlementRec.id}
    			});   
    		}
    	}catch (e) {
    		log.error(e.name,e.message);
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
    				throw Error("amount exceed on edit");

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
    						throw Error('oi req zero');
    					}
    				}

    				if(!promoTypeMOPBillBack){
    					if(settlementRec.getValue('custbody_itpm_set_reqbb')>0){
    						throw Error('bb zero');
    					}
    				}

    				if(e.getValue('custrecord_itpm_p_lumpsum') <= 0){
    					if(settlementRec.getValue('custbody_itpm_set_reqls')>0){
    						throw Error('ls zero');
    					}
    				}

    				if(!promoTypeMOPOffInvoice && !promoTypeMOPNetBill){
    					if((lumsumSetReq+billbackSetReq) != settlementReq){
    						throw Error('ls bb total not match')
    					}
    				}else{
    					if(settlementReq != (lumsumSetReq+billbackSetReq+offInvSetReq)){
    						throw Error('ls bb oi total not match');
    					}
    				}

    				// All settlement request values MUST be greater than zero. (Do NOT allow Lump Sum AND Bill Back to be zero during submit, on EDIT. Either of the fields can individually be zero, but not both.)
    				if(lumsumSetReq <= 0 && billbackSetReq <= 0){
    					throw Error('ls bb both zero');
    				}else if(settlementReq <= 0 && offInvSetReq <= 0){
    					throw Error('all set req zero');
    				}
    			});		
    		}
    	}catch(e){
    		if(e.message == 'amount exceed on edit')
    			throw Error("The settlement amount cannot exceed the amount set at the time of record creation by the deduction Open Balance.")
    		else if(e.message == 'oi req zero')
    			throw Error("Off invoice request value should be zero");
    		else if(e.message == 'bb zero')
    			throw Error('Bill back request value should be zero');
    		else if(e.message == 'ls zero')
    			throw Error("Lum sum request value should be zero");
    		else if(e.message == 'ls bb total not match')
    			throw Error("The sum of bill back and lump sum settlement requests must be equal to the settlement request");
    		else if(e.message == 'ls bb oi total not match')
    			throw Error("settlement request must be equal to the sum of bill back, off-invoice and lump sum");
    		else if(e.message == 'ls bb both zero')
    			throw Error("Lump Sum AND Bill Back Either of the fields can individually be zero, but not both");
    		else if(e.message == 'all set req zero')
    			throw Error("All settlement request values MUST be greater than zero")
    		else
    			log.error('exception in settlement validation scirpt',e);
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
    		if(scriptContext.type == 'edit'){
        		var loadedSettlementRec = record.load({
            		type:'customtransaction_itpm_settlement',
            		id:scriptContext.newRecord.id
            	}),
            	lumpsumSetReqAmnt = loadedSettlementRec.getValue('custbody_itpm_set_reqls'),
            	bbSetReqAmnt = loadedSettlementRec.getValue('custbody_itpm_set_reqbb'),
            	offinvSetReqAmnt = loadedSettlementRec.getValue('custbody_itpm_set_reqoi'),
            	linecount = loadedSettlementRec.getLineCount({sublistId:'line'});
        		for(var i = 0;i < linecount;i++){
        			var isDebit = loadedSettlementRec.getSublistValue({
        			    sublistId: 'line',
        			    fieldId: 'custcol_itpm_set_isdebit',
        			    line: i
        			});
        			var lsbboi = loadedSettlementRec.getSublistValue({
        			    sublistId: 'line',
        			    fieldId: 'custcol_itpm_lsbboi',
        			    line: i
        			});
        			var lineValue = (lsbboi == 1)?lumpsumSetReqAmnt:(lsbboi == 2)?bbSetReqAmnt:offinvSetReqAmnt;
        			if(lineValue != '' && lineValue > 0){
        				log.debug('lineValue '+i,lineValue)
        				if(isDebit){
        					loadedSettlementRec.setSublistValue({
        						sublistId:'line',
        						fieldId:'debit',
        						line:i,
        						value:lineValue
        					})
        				}else{
        					loadedSettlementRec.setSublistValue({
        						sublistId:'line',
        						fieldId:'credit',
        						line:i,
        						value:lineValue
        					})
        				}
        			}
        		}
        		loadedSettlementRec.save({enableSourcing:false,ignoreMandatoryFields:true});
        	}
    	}catch(e){
    		throw new Error(e.message);
    	}
    	
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
