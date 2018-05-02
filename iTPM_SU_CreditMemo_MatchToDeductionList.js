/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/record',
		'N/redirect', 
		'N/runtime', 
		'N/search', 
		'N/ui/serverWidget', 
		'N/url'
		],
/**
 * @param {record} record
 * @param {redirect} redirect
 * @param {runtime} runtime
 * @param {search} search
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(record, redirect, runtime, search, serverWidget, url) {
   
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
    		log.debug('asdf', 'asdf');
    		context.response.writePage("This is suitelet");
    	}catch(e){
			log.error(e.name, e.message);
		}
    }

    return {
        onRequest: onRequest
    };
    
});
