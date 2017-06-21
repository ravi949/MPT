/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * Creating the Dynamic Field ACTIVITY in Retail Info Record.
 */
define(['N/search','N/ui/serverWidget','N/runtime'],

function(search,serverWidget,runtime) {
   
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
    		var eventType = scriptContext.type,
    		contextType = runtime.executionContext;

    		if((eventType == 'create' || eventType == 'edit' || eventType == 'copy') && contextType == 'USERINTERFACE'){

    			var retailInfoForm = scriptContext.form,
    			promoDealRecId = scriptContext.newRecord.getValue('custrecord_itpm_rei_promotiondeal'),
    			selectedActivities = scriptContext.newRecord.getValue('custrecord_itpm_rei_activity');

    			retailInfoForm.getField({
    				id:'custrecord_itpm_rei_activity'
    			}).updateDisplayType({
    				displayType : serverWidget.FieldDisplayType.HIDDEN
    			});

    			//creating the dynamic field for ACTIVITY field.
    			var activityField = retailInfoForm.addField({
    				id : 'custpage_itpm_activity_field',
    				type : serverWidget.FieldType.MULTISELECT,
    				label : 'ACTIVITY'
    			});
    			activityField.setHelpText({help:'Select the Activity for this Retail Event Information'});

    			if(promoDealRecId!=''){
    				//search on Promotion/Deal Record and get the promotion type record id
    				search.create({
    					type:'customrecord_itpm_promotiondeal',
    					columns:['custrecord_itpm_p_type','custrecord_itpm_p_type.custrecord_itpm_pt_merchtypes'],
    					filters:[['internalid','is',promoDealRecId],'and',['isinactive','is',false]]
    				}).run().each(function(e){

    					var promotTypeValidMerchantList = e.getValue({name:'custrecord_itpm_pt_merchtypes',join:'custrecord_itpm_p_type'});
    					if(promotTypeValidMerchantList !=''){
    						//search on activity records, used the Promotion Type Record VALID MERCHANDISING TYPES values in filter.
    						search.create({
    							type:'customrecord_itpm_promotionactivity',
    							columns:['internalid','name'],
    							filters:[['custrecord_itpm_activity_type','is',promotTypeValidMerchantList.split(',')],'and',['isinactive','is',false]]
    						}).run().each(function(activity){
    							activityField.addSelectOption({
    								value : activity.getValue('internalid'),
    								text : activity.getValue('name'),
    								isSelected:selectedActivities.some(function(selectList){
    									return selectList == activity.getValue('internalid') 
    								})
    							});

    							return true;
    						})
    					}
    					return false;

    				});
    			}
    		} 	
    	}catch (e) {
    		log.error(e.name,e.message);
    	}
    }

    return {
        beforeLoad: beforeLoad
    };
    
});
