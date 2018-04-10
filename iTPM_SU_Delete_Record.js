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
            	var responseObj;
            	log.debug('params', params);
            	
            	//Loading the record
            	var recObj = record.load({
            		type:params.recordid,
            		id:params.id
            	});
            	
            	//If record type is Deduction.
            	if(params.rectype == 'ddn'){
            		var creditMemos = recObj.getValue('custbody_itpm_ddn_invoice');
            		var createFrom = search.lookupFields({
            			type:search.Type.TRANSACTION,
            			id:creditMemos[0],
            			columns:['type']
            		})['type'][0]['value'];
            		log.debug('createFrom', createFrom);
            		if(createFrom == 'CustCred'){
            			creditMemos.forEach(function(cid){
            				record.submitFields({
            					type:record.Type.CREDIT_MEMO,
            					id:cid,
            					values:{
            						'custbody_itpm_appliedto':' '
            					},
            					options:{
            						enableSourcing:false,
            						ignoreMandatoryFields:true
            					}
            				});
            			});
            		}

            		var ddnRecord = record.delete({
            			type: params.recordid,
            			id: params.id,
            			isDynamic: true                       
            		});

            		var ddnListId = search.load({
            			id:'customsearch_itpm_deduction_defaultview'
            		}).searchId;

            		responseObj = JSON.stringify({success:true,searchid:ddnListId});
            	}
            	context.response.write(responseObj);
    		}
    	}catch(ex){
    		log.error(ex.name,ex.message);
    		context.response.write(JSON.stringify({success:false,message:ex.message.split('Summary of impact changes')[0]}));
    	}	    	
    }

    return {
        onRequest: onRequest
    };
    
});
