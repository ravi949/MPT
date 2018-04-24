/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 * Client script to be attached to the front-end suitelet for iTPM Preferences record Edit.
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
	var subsidiaryFieldValue;
	function fieldChanged(scriptContext){
		if(scriptContext.fieldId == 'custpage_itpm_pref_subsidiary'){
			var params = (new URL(document.location)).searchParams;
			var type = params.get('type');
			console.log(scriptContext.currentRecord.getValue('custpage_itpm_pref_subsidiary'));
			if(type == 'edit'){
				window.location.href = window.location.href.split('&whence=')[0]+'&whence=&type='+type+'&pfid='+params.get('pfid')+'&subid='+scriptContext.currentRecord.getValue('custpage_itpm_pref_subsidiary');
			}else{
				window.location.href = window.location.href.split('&whence=')[0]+'&whence=&type='+type+'&subid='+scriptContext.currentRecord.getValue('custpage_itpm_pref_subsidiary');
			}
		}
		
		if(scriptContext.fieldId == 'custpage_itpm_pref_listsubsidiary'){
			subsidiaryFieldValue = scriptContext.currentRecord.getValue('custpage_itpm_pref_listsubsidiary');
		}
	}
	
    /*it will redirect the user to previous screen*/
    function redirectToBack(){
    	history.go(-1);
    }
    
    /**
     * @description redirect to the same page with new param value
     */
    function newPreference(sub_feature){
    	if(sub_feature == 'T'){
    		if(!subsidiaryFieldValue){
    			alert('Please select the subsidiary.');
    			return;
    		}
    	}
    	window.location.href = window.location.search+'&type=create&subid='+subsidiaryFieldValue;
    }
    
    
    return {
    	fieldChanged:fieldChanged,
        redirectToBack:redirectToBack,
        newPreference:newPreference
    };
    
});
