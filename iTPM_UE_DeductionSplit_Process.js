/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/record',
		'N/runtime',
		'N/ui/serverWidget'],

function(record, runtime, serverWidget) {
   
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
        	if(scriptContext.type == 'create'){
        		var params = scriptContext.request.parameters;
        		var ddnSplitRec = scriptContext.newRecord;
        		log.debug('params',params.ddn);
        		
        		scriptContext.form.getField({
        			id:'custrecord_itpm_split_deduction'
        		}).updateDisplayType({
        		    displayType : serverWidget.FieldDisplayType.DISABLED
        		});
        		
        		
        		//loading the deduction record
        		var ddnRec = record.load({
        			type:'customtransaction_itpm_deduction',
        			id:params.ddn
        		});
        		
        		//set the deduction values into the deduction split record fields
        		ddnSplitRec.setValue({
        			fieldId:'custrecord_itpm_split_deduction',
        			value:ddnRec.id
        		}).setValue({
        			fieldId:'custrecord_itpm_split_ddnamount',
        			value:ddnRec.getValue('custbody_itpm_amount')
        		}).setValue({
        			fieldId:'custrecord_itpm_split_ddnopenbal',
        			value:ddnRec.getValue('custbody_itpm_ddn_openbal')
        		});
        		
        	}
    	}catch(ex){
    		log.error(ex.name,ex.message);
    	}
    }
    
    

	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.newRecord.oldRecord - Old record
	 * @param {string} scriptContext.newRecord.type - Trigger type
	 * @Since 2015.2
	 */
    function beforeSubmit(scriptContext) {
    	try{

    	}catch(ex){
    		
    	}

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
    };
    
});
