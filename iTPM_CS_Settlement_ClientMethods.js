/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
    	try{
    		//set first line with same existed value to avoid transaction line alert popup
        	var currentRec = scriptContext.currentRecord;         	
        	console.log(currentRec.getLineCount('line'));
        	var accountId = currentRec.getSublistValue({
        		sublistId:'line',
        		fieldId:'account',
        		line:0
        	});
        	console.log(accountId);
        	currentRec.selectLine({
        	    sublistId: 'line',
        	    line: 0
        	});
        	
        	currentRec.setCurrentSublistValue({
        		sublistId:'line',
        		fieldId:'account',
        		value:accountId
        	}).commitLine('line');
    	}catch(ex){
    		console.error(ex.name,ex.message);
    	}
    }

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

    }

    return {
        pageInit: pageInit,
//        fieldChanged: fieldChanged,
//        saveRecord: saveRecord
    };
    
});
