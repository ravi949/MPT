/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 */
define(['N/record',
		'N/search',
		'N/ui/dialog'
		],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, dialog) {    

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
    	try{
    		var promoPlanRec = scriptContext.currentRecord;
    		if(scriptContext.fieldId == 'custrecord_itpm_pp_mop'){
    			var isValidMOP =  validMOP(promoPlanRec.getValue('custrecord_itpm_pp_promotion'),promoPlanRec.getValue('custrecord_itpm_pp_mop'));
    		}
    	}catch(e){
			log.error(e.name,e.message);
			console.log(e.name,'function name = validateLine, message = '+e.message);
		}
    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
    	try{
    		var promoPlanRec = scriptContext.currentRecord;
    		var isValidMOP = validMOP(promoPlanRec.getValue('custrecord_itpm_pp_promotion'),promoPlanRec.getValue('custrecord_itpm_pp_mop'));
    		if(isValidMOP){    			
    	    	return false;
    		}else{
    	    	return true;
    		} 
    	}catch(e){
			log.error(e.name,e.message);
			console.log(e.name,'function name = validateLine, message = '+e.message);
		}
    }
    
    /**
     * Validating the Method Of Payment
     * @param {promoId} promoId
     * @param {promoPlanMOP} promoPlanMOP
     * 
     * return boolean
     */
    function validMOP(promoId, promoPlanMOP){

		//console.log(promoPlanRec.getValue('custrecord_itpm_pp_promotion'));
		
		var promoTypeId = search.lookupFields({
		    type:'customrecord_itpm_promotiondeal',
		    id:promoId,
		    columns:['custrecord_itpm_p_type']
		}).custrecord_itpm_p_type[0].value;
		
		var promoTypeLookup = search.lookupFields({
			type:'customrecord_itpm_promotiontype',
			id:promoTypeId,
			columns:['custrecord_itpm_pt_validmop']
		});
		
		//console.log(promoPlanMOP);
		
		var isValidMOP = promoTypeLookup.custrecord_itpm_pt_validmop.some(function(e){return e.value == promoPlanMOP});
		//console.log(isValidMOP);
		
		if(!isValidMOP){
			dialog.alert({
				title: 'Warning',
				message: 'The selected Method Of Payment is not valid. <br>'+
				'<br> Valid Method Of Payments are "'+
				promoTypeLookup.custrecord_itpm_pt_validmop.map(function(e){ return e.text}).join(",")+'".'
			});
			return false;
		}else{
	    	return true;
		} 
	
    }
    return {
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
    
});
