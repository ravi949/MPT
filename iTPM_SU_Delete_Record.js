/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/record',
		'N/search'],

function(record, search) {
   
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
    		if(context.request.method == 'GET'){
            	var params = context.request.parameters;
            	log.debug('Deduction ID', params.did);
            	
            	var ddnRecord = record.delete({
         	       type: params.rectype,
         	       id: params.did,
         	       isDynamic: true                       
         	   	});
            	
            	var ddnListId = search.load({
            		id:'customsearch_itpm_deduction_defaultview'
            	}).searchId;
            	
            	context.response.write(JSON.stringify({success:true,searchid:ddnListId}));
        	}
    	}catch(ex){
    		log.error(ex.name,ex.message);
    		context.response.write(JSON.stringify({success:false,message:ex.message}));
    	}	    	
    }

    return {
        onRequest: onRequest
    };
    
});
