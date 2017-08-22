/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * When user clicks on new promotion type then it redirects to assistant view and In that form it Enable or Disable the Stackable Field based on condition.
 */
define(['N/redirect',
		'N/ui/serverWidget',
		'N/runtime'
		],

function(redirect,serverWidget,runtime) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {
    	try{
    		if(scriptContext.type == 'create' && runtime.executionContext == 'USERINTERFACE'){
    			var listId = scriptContext.request.parameters.rectype; //this is promotion type list id
    			redirect.toSuitelet({
    				scriptId:'customscript_itpm_promtiontype_assistant',
    				deploymentId:'customdeploy_itpm_promtiontype_assistant',
    				parameters:{listId:listId},
    				isExternal:false
    			});  
    		}	
    	}catch(e){
    		log.error(e.name,'record id = '+scriptContext.newRecord.id+', function name = beforeload, message = '+e.message);
    	}
    }

    
   
    return {
        beforeLoad: beforeLoad
    };
    
});
