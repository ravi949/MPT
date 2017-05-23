/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {
   
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
    		var parameters = scriptContext.request.parameters,JERec = scriptContext.newRecord;
        	if(parameters.ddn != '' && scriptContext.type == 'create'){
        		var ddnRec = record.load({
        			type:'customtransaction_itpm_deduction',
        			id:parameters.ddn
        		});

        		log.debug('subsidiary',ddnRec.getValue('subsidiary'))
        		
        		JERec.setValue({
        			fieldId:'subsidiary',
        			value:ddnRec.getValue('subsidiary'),
        			ignoreFieldChange:false
        		}).setValue({
        			fieldId:'memo',
        			value:'Expense for Deduction # '+ddnRec.getValue('tranid')
        		}).setValue({
        			fieldId:'custbody_itpm_set_deduction',
        			value:parameters.ddn
        		});
        		
//        		JERec.setValue({
//        			fieldId:'currency',
//        			value:ddnRec.getValue('currency')
//        		})

        		JERec.setSublistValue({
        			sublistId:'line',
        			fieldId:'account',
        			value:ddnRec.getSublistValue({sublistId:'line',fieldId:'account',line:0}),
        			line:0
        		}).setSublistValue({
        			sublistId:'line',
        			fieldId:'credit',
        			value:ddnRec.getValue('custbody_itpm_ddn_openbal'),
        			line:0
        		}).setSublistValue({
        			sublistId:'line',
        			fieldId:'entity',
        			value:ddnRec.getValue('custbody_itpm_ddn_customer'),
        			line:0
        		}).setSublistValue({
        			sublistId:'line',
        			fieldId:'memo',
        			value:'Expense for Deduction # '+ddnRec.getValue('tranid'),
        			line:0
        		})
            	
        	}
    	}catch(e){
    		log.debug('exception in journal entry from ddn',e)
    	}
    	
    }

    return {
        beforeLoad: beforeLoad
    };
    
});
