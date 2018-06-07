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
    			bulkSettlementUIForm(request, response);
    		}else{
    			//validateCSVFile(request, response);
    		}
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    /**
     * @param {Object} request
     * @param {Object} response
     */
    function bulkSettlementUIForm(request, response){
    	var form = ui.createForm({
			title: 'Bulk Resolve Deductions Form'
		});
		
    	
    	
    	form.addField({
    	    id : 'custpage_itpm_promo_id',
    	    type : ui.FieldType.TEXT,
    	    label : 'Promotion'
    	}).updateDisplayType({
			displayType : ui.FieldDisplayType.INLINE
		});//.defaultValue = params.promoid;
		form.addField({
    	    id : 'custpage_itpm_customer_id',
    	    type : ui.FieldType.TEXT,
    	    label : 'Customer'
    	}).updateDisplayType({
			displayType : ui.FieldDisplayType.INLINE
		})//.defaultValue = params.customer;
		
		form.addSubmitButton({
			label: 'Submit'
		});
		
		form.addButton({
    		id : 'custom_itpm_cacel',
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
