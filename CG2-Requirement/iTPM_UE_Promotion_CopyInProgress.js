/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget'],

function(serverWidget) {
   
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
    	var type = scriptContext.type,
    	copyInProgress = scriptContext.newRecord.getValue('custrecord_itpm_p_copyinprogress'),
    	copyRelatedRecords = scriptContext.newRecord.getValue('custrecord_itpm_p_copy')
    	if(type == 'view' && copyInProgress && copyRelatedRecords){
    		var msgText = "This Promotion is queued for copying and cannot be edited until the linked records (Allowances, Estimated Quantities, and Retail Info) are copied over from the original promotion, Please be patient."
    		scriptContext.form.addField({
    			id:'custpage_copyinprg_message',
    			type:serverWidget.FieldType.INLINEHTML,
    			label:'script'
    		}).defaultValue = '<script language="javascript">require(["N/ui/message"],function(msg){msg.create({title:"Copy In Progress",message:"'+msgText+'",type: msg.Type.INFORMATION}).show()})</script>'
    	}
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {

    }

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

    }

    return {
        beforeLoad: beforeLoad,
//        beforeSubmit: beforeSubmit,
//        afterSubmit: afterSubmit
    };
    
});
