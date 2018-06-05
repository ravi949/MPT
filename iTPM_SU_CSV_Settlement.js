/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget'],

function(ui) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	try{
    		var request = context.request;
    		var response = context.response;
    		
    		if(request.method == 'GET'){
    			var form = ui.createForm({
    				title: 'CSV Settlement Form'
    			});
    			
    			form.addField({
    	    	    id : 'custom_itpm_csvupload',
    	    	    type : serverWidget.FieldType.FILE,
    	    	    label : 'Upload CSV File'
    	    	}).isMandatory = true;
    			
    			form.addSubmitButton({
    				label: 'Submit'
    			});
    			
    			form.addButton({
    	    		id : 'custom_itpm_tcacel',
    	    	    label : 'Cancel',
    	    	    functionName:"redirectToBack"
    	    	});
    	    	
    	    	form.clientScriptModulePath =  './iTPM_Bulk_Settlements_ClientMethods.js';
    			
    			response.writePage();
    		}
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    return {
        onRequest: onRequest
    };
    
});
