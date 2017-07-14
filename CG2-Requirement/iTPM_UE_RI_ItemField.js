/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/ui/serverWidget', 'N/runtime'],
/**
 * @param {search} search
 * @param {serverWidget} serverWidget
 */
function(search, serverWidget, runtime) {
   
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
    		if(runtime.executionContext === runtime.ContextType.USER_INTERFACE){
    			var type = scriptContext.type,
    			retailRec = scriptContext.newRecord,
    			promoId = retailRec.getValue('custrecord_itpm_rei_promotiondeal'),
    			reiItem = retailRec.getValue('custrecord_itpm_rei_item'),
    			retailItems = [];
    			
    			if(type == 'create' || type == 'edit' || type == 'copy'){
    				var itemField = scriptContext.form.addField({
    				    id : 'custpage_rei_itemfield',
    				    type : serverWidget.FieldType.SELECT,
    				    label : 'Item'
    				});
    				
    				itemField.addSelectOption({text:' ',value:' '});
    				itemField.isMandatory = true;
    				itemField.setHelpText('Select the item for this Retail Event Information',true);
    				scriptContext.form.insertField({
    				    field : itemField,
    				    nextfield : 'custrecord_itpm_rei_itemdescription'
    				});
    				
    				var retailInfoItemsFilter = [['custrecord_itpm_all_promotiondeal','anyof',promoId],'and',
						 ['isinactive','is',false]];
    				
    				//Not performing this operation while edit record
    				if(type != 'edit'){
    					//search for retail info items
        				search.create({
        					type:'customrecord_itpm_promoretailevent',
        					columns:['custrecord_itpm_rei_item'],
        					filters:[['custrecord_itpm_rei_promotiondeal','anyof',promoId]]
        				}).run().each(function(e){
        					retailItems.push(e.getValue('custrecord_itpm_rei_item'));
        					return true;
        				});
        				
        				// if retail info items existed then adding the noneof filter to the allowance search
        				if(retailItems.length > 0){
        					retailInfoItemsFilter.push('and',['custrecord_itpm_all_item','noneof',retailItems]);
        				}
    				}
    				
    				var itemColumn = search.createColumn({
    				    name: 'custrecord_itpm_all_item',
    				    summary: search.Summary.GROUP
    				});
    				
    				//search for the items in allowances
    				search.create({
    					type:'customrecord_itpm_promoallowance',
    					columns:[itemColumn],
    					filters:retailInfoItemsFilter
    				}).run().each(function(e){
    					itemField.addSelectOption({
    						text:e.getText({name:'custrecord_itpm_all_item', summary: search.Summary.GROUP}),
    						value:e.getValue({name:'custrecord_itpm_all_item', summary: search.Summary.GROUP}),
    						isSelected:reiItem == e.getValue({name:'custrecord_itpm_all_item', summary: search.Summary.GROUP})
    					})
    					return true;
    				})
    				
    				
    			}
    		}
    	}catch(e){
    		log.error(e.name,e.message);
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
