/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record',
		'N/redirect'
	   ],
/**
 * @param {record} record
 */
function(record, redirect) {
   
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
    		if(context.request.parameters.allid){
        		var allowRec = record.load({
        			type:'customrecord_itpm_promoallowance',
        			id:context.request.parameters.allid
        		});
        		allowRec.save({
        			enableSourcing:false,
        			ignoreMandatoryFields:true
        		});
        		
        		redirect.toRecord({
        		    type : "customrecord_itpm_promotiondeal", 
        		    id : allowRec.getValue('custrecord_itpm_all_promotiondeal')
        		});
        	}
    	}catch(ex){
    		log.error(ex.name,ex.message);
    	}
    }

    return {
        onRequest: onRequest
    };
    
});
