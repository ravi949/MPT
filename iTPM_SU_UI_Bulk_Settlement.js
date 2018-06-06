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
    			csvFieUploadForm(request, response);
    		}else{
    			validateCSVFile(request, response);
    		}
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    /**
     * @param {Object} request
     * @param {Object} response
     */
    function csvFieUploadForm(request, response){
    	var form = ui.createForm({
			title: 'CSV Settlement'
		});
		
		form.addField({
    	    id : 'custom_itpm_csvfile',
    	    type : ui.FieldType.FILE,
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
    	
    	//form.clientScriptModulePath =  './iTPM_Bulk_Settlements_ClientMethods.js';
		
		response.writePage(form);
    }
    
    /**
     * @param {Object} request
     * @param {Object} response
     */
    function validateCSVFile(request, response){
    	var file = request.files.custom_itpm_csvfile;
    	
    	//throw user error for invalid file error other than .csv
    	if(file.name.split('.')[1] == 'csv'){
    		log.debug('file', file.name.split('.')[1]);
    	}else{
    		throw{
    			name:'INVALID_FILE',
    			message:'Please upload valid CSV file.'
    		}
    	}
    }
    
    return {
        onRequest: onRequest
    };
    
});
