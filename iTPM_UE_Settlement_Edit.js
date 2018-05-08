/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * Calling suitelet to edit settlement and validate then saving the settlement 
 */
define(['N/redirect',
		'N/runtime',
		'N/search',
		'./iTPM_Module_Settlement.js',
		'./iTPM_Module.js'
		],

function(redirect,runtime,search,ST_Module, itpm) {
   
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
    			//restrict the user to editing an Processed Settlement 
    			var setlStatus = settlementRec.getValue('transtatus');
    			if(setlStatus == 'E'){
					throw {error:'custom',message:" The settlement is in Processing status, It cannot be Edited"};
				}else if(setlStatus == 'C'){
					throw {error:'custom',message:" The settlement is Voided, It cannot be Edited"};
				}else{
					redirect.toSuitelet({
	    				scriptId:'customscript_itpm_set_createeditsuitelet',
	    				deploymentId:'customdeploy_itpm_set_createeditsuitelet',
	    				returnExternalUrl: false,
	    				parameters:{sid:settlementRec.id,from:'setrec',type:'edit'}
	    			});
				}    			
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
    		var settlementRec = scriptContext.newRecord,settlementOldRec;
    		var settlementReq = parseFloat(settlementRec.getValue('custbody_itpm_amount'));
			var lumsumSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqls'));
			var billbackSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqbb'));
			var offInvSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqoi'));
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
    			// All settlement request values MUST be greater than zero. (Do NOT allow Lump Sum AND Bill Back to be zero during submit, on EDIT. Either of the fields can individually be zero, but not both.)
    			if(promoLS <= 0 && !promoHasAllNB){
					if(lumsumSetReq > 0){
						throw {error:'custom',message:"Lump sum request value should be zero"};
					}
				}
    			//If Lump sum value in settlement record have a value and LS Amount on promotion is zero then we throw error 
    			if(lumsumSetReq > 0){
    				if(promoLS <= 0){
    					throw {error:'custom',message:" Promotion: "+promoDealRec['name']+" Lump sum should be greater than Zero"};
    				}
    			}
//    			if(lumsumSetReq <= 0 && billbackSetReq <= 0){
//    				throw {error:'custom',message:"Lump Sum AND Bill Back Either of the fields can individually be zero, but not both"};
//    			}else if(settlementReq <= 0 && offInvSetReq <= 0){
//    				throw {error:'custom',message:"All settlement request values MUST be greater than zero"}
//    			} 
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
			var oldStatus = settlementOldRec.getValue('transtatus');
			var newStatus = settlementNewRec.getValue('transtatus');
			var promoId = settlementNewRec.getValue('custbody_itpm_set_promo');
			
    		if(eventType == 'edit'){
    			var searchCount = search.create({type : 'customrecord_itpm_kpiqueue',filters : ['custrecord_itpm_kpiq_promotion', 'is', promoId]}).runPaged().count;
    			log.debug('searchCount', searchCount);
    			log.debug('Old Status & New Status', oldStatus+' & '+newStatus);
    			
    			if(searchCount == 0){
    				if((oldStatus == 'E' && (newStatus == 'A' || newStatus == 'B')) || (oldStatus == 'A' && newStatus == 'C')){
    					//Creating New KPI Queue Record
    					itpm.createKPIQueue(promoId, 5); //1.Scheduled, 2.Edited, 3.Status Changed, 4.Ad-hoc and 5.Settlement Status Changed
    				}
    			}
    		}
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
