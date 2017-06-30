/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount 
 * Attached client script to enable pagination for Actual Sales and Shipment report suitelet pages
 */
define([],

function() {

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
    	if(scriptContext.fieldId == 'custpage_ss_pagination'){
    		var startno = scriptContext.currentRecord.getValue(scriptContext.fieldId),
    		url = window.location.search;
    		url = url.substring(0, url.indexOf('&st'));
    		window.location.search = url + '&st='+startno;
    	}
    }
    
    return {
        fieldChanged: fieldChanged
    };
    
});
