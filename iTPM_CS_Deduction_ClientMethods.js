/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 */
define([],

function() {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
	var mode;
    function pageInit(scriptContext) {
    	try{
    		mode = scriptContext.mode;
    		//set first line with same existed value to avoid transaction line alert popup
        	var currentRec = scriptContext.currentRecord; 
        	console.log(currentRec);
        	console.log(currentRec.getLineCount('line'));
        	var accountId = currentRec.getSublistValue({
        		sublistId:'line',
        		fieldId:'account',
        		line:0
        	});
        	
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
    	try{
    		var currentRec = scriptContext.currentRecord;
    		if(scriptContext.fieldId == "trandate"){
    			var tranDate = new Date(currentRec.getValue('trandate'));
    			currentRec.setValue({
    				fieldId:'custbody_itpm_ddn_nextaction',
    				value:(new Date(tranDate.setDate(tranDate.getDate()+14)))
    			});
    		}
    	}catch(ex){
    		console.error(ex.name,ex.message);
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
    		var currentRec = scriptContext.currentRecord;
        	var url = new URLSearchParams(window.location.search);
        	//console.log(url.get('custom_from'));
        	if(url.get('custom_from') == 'ddn'){
        		if(!currentRec.getValue('custbody_itpm_ddn_parentddn')){
        			alert('Parent Deduction cannot be empty.');
        			return false;
        		}else if(!currentRec.getValue('custbody_itpm_ddn_originalddn')){
        			alert('Original Deduction cannot be empty.');
        			return false;
        		}else if(!currentRec.getValue('custbody_itpm_appliedto')){
        			alert('iTPM Applied To cannot be empty.');
        			return false;
        		}
        	}else if(mode == 'create' && url.get('custom_from') == null){
        		if(currentRec.getValue('custbody_itpm_ddn_parentddn')){
        			alert('Parent Deduction should be empty.');
        			return false;
        		}else if(currentRec.getValue('custbody_itpm_ddn_originalddn')){
        			alert('Original Deduction should be empty.');
        			return false;
        		}else if(currentRec.getValue('custbody_itpm_appliedto')){
        			alert('iTPM Applied To should be empty.');
        			return false;
        		}
        	}else if(url.get('custom_multi') == "true"){
        		if(currentRec.getValue('custbody_itpm_ddn_invoice').length <= 1){
        			alert("TRANSACTION field should contain more than one value.");
        			return false;
        		}
        	}
        	
        	return true;
    	}catch(ex){
    		return false;
    		alert(ex.message);
    		console.error(ex.name,ex.message);
    	}
    	
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
    
});
