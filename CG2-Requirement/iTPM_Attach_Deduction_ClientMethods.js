/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 * Client script to be attached to the front-end suitelet used for iTPM Deduction records.
 */
define([],

function() {
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
    		var isFromEdit = window.location.href.search('&type=edit');
        	var deductionAsstRec = scriptContext.currentRecord;
        	if(isFromEdit == -1){
        		if(deductionAsstRec.getValue('custom_itpm_ddn_openbal') < deductionAsstRec.getValue('custom_itpm_ddn_amount')){
            	    alert('Amount must be less than or equal to Parent Deduction Amount');
            	    return false
            	}
        	}
        	return true
    	}catch(ex){
    		console.log(ex.name,'record type = iTPM deduction, record id='+scriptContext.currentRecord.id+', function name = saveRecord, message='+ex.message);
    	}
    	
    }
    
    /*it will redirect the user to previous screen*/
    function redirectToBack(from,id){
    	history.go(-1);
    }

    return {
        saveRecord: saveRecord,
        redirectToBack:redirectToBack
    };
    
});
