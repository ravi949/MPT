/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/redirect'],
/**
 * @param {redirect} redirect
 */
function(redirect) {
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
    	try{
    		var transRec = scriptContext.newRecord;
        	log.debug('Condition satisfied', transRec.getValue('custbody_itpm_applydiscounts'));
        	if(scriptContext.type == 'create' && transRec.getValue('custbody_itpm_applydiscounts')){
        		log.debug('In if Condition satisfied', transRec.getValue('custbody_itpm_applydiscounts'));
//        	if(user == 1963){        		
            	redirect.toSuitelet({
            	    scriptId: 'customscript_itpm_nb_processing' ,
            	    deploymentId: 'customdeploy_itpm_nb_processing',
            	    parameters: {'id':transRec.id,'type':transRec.type} 
            	});
        	/*}else{
        		redirect.toSuitelet({
            	    scriptId: 'customscript_itpm_oi_processing' ,
            	    deploymentId: 'customdeploy_itpm_oi_processing',
            	    parameters: {'id':transRec.id,'type':transRec.type} 
            	});
        	}*/
        		/*var urla = 'https://debugger.na1.netsuite.com/app/site/hosting/scriptlet.nl?script=938&deploy=1'
        			
        			var responsewe = https.request({
        			    method: https.Method.GET,
        			    url: urla
        			});
        		log.debug('responsewe', responsewe);  */
        	}
    	}catch(ex){
    		log.debug('error',ex.message);
    	}
    	
    }

    return {
        afterSubmit: afterSubmit
    };
    
});
