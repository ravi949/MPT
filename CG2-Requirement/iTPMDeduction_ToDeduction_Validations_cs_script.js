/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 * In pageinit setting the date and disputed value to empty or false.
 * before save the record amount shouldn't greaterthan open balance.
 */
define([],

function() {
    
	 /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @since 2015.2
     */

	function pageInit(scriptContext){
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
    	var isFromEdit = window.location.href.search('&from=edit');
    	var deductionAsstRec = scriptContext.currentRecord;
    	if(isFromEdit == -1){
    		if(deductionAsstRec.getValue('custom_itpm_ddn_openbal') < deductionAsstRec.getValue('custom_itpm_ddn_amount')){
        	    alert('Amount must be less than or equal to Parent Deduction Amount');
        	    return false
        	}
    	}
    	return true
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
