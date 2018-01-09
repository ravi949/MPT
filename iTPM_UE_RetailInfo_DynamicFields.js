/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/search',
		'N/ui/serverWidget',
		'N/runtime'
		],
/**
 * @param {search} search
 * @param {serverWidget} serverWidget
 * @param {runtime} runtime
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
    			var type = scriptContext.type;
    			var retailRec = scriptContext.newRecord;
    			var promoId = retailRec.getValue('custrecord_itpm_rei_promotiondeal');
    			var reiItem = retailRec.getValue('custrecord_itpm_rei_item');
    			var selectedActivities = retailRec.getValue('custrecord_itpm_rei_activity');
    			var retailItems = [];
    			
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
        					filters:[['custrecord_itpm_rei_promotiondeal','anyof',promoId],'and',['isinactive','is',false]]
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
    				});
    				
    				
    			   //Activity Dynamic field
    			   var promotionLookup = search.lookupFields({
    				   type:'customrecord_itpm_promotiondeal',
    				   id:promoId,
    				   columns:['custrecord_itpm_p_type.custrecord_itpm_pt_merchtypes']
    			   });
    				
    			   var ptMerchantList = promotionLookup['custrecord_itpm_p_type.custrecord_itpm_pt_merchtypes'].map(function(e){
    				   return e.value
    			   });
    			   log.debug('ptMerchantList',ptMerchantList)
    			   //creating the dynamic field for ACTIVITY field.
    			   var activityField = scriptContext.form.addField({
    				   id : 'custpage_itpm_activity_field',
    				   type : serverWidget.FieldType.MULTISELECT,
    				   label : 'ACTIVITY'
    			   });
    			   activityField.setHelpText({help:'Select the Activity for this Retail Event Information'});
    				
    			   search.create({
						type:'customrecord_itpm_promotionactivity',
						columns:['internalid','name'],
						filters:[['custrecord_itpm_activity_type','anyof',ptMerchantList],'and',['isinactive','is',false]]
					}).run().each(function(activity){
						activityField.addSelectOption({
							value : activity.getValue('internalid'),
							text : activity.getValue('name'),
							isSelected:selectedActivities.some(function(selectList){
								return selectList == activity.getValue('internalid') 
							})
						});
						return true;
					});
    			}
    		}
    	}catch(e){
    		log.error(e.name,e.message);
    	}
    }

    return {
        beforeLoad: beforeLoad
    };
    
});
