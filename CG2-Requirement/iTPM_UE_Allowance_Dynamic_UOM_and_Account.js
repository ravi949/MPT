/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * Creating the Dynamic Field ACCOUNT and ALLOWANCE UOM in Allowance Record.
 */
define(['N/record','N/ui/serverWidget','N/runtime','N/search'],

function(record,serverWidget,runtime,search) {
   
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
    	//custrecord_itpm_all_account
    	//custrecord_itpm_all_uom
    	var iTPMAllowanceRec = scriptContext.newRecord,
    	iTPMAllownaceForm = scriptContext.form,
    	promoDealId = iTPMAllowanceRec.getValue('custrecord_itpm_all_promotiondeal'),
    	
    	eventType = scriptContext.type,
    	contextType = runtime.executionContext;
    	
    	if(promoDealId && (eventType == 'create' || eventType == 'edit' || eventType == 'copy') && contextType == 'USERINTERFACE'){
    		//adding the field group and added the dynamic fields.
    		var iTPMAllownaceFieldGroup = iTPMAllownaceForm.addFieldGroup({
    		    id : 'custpage_custom_group',
    		    label : 'Item / Account / Allowance Information'
    		}),
    		promoDealRec = record.load({
        		type:'customrecord_itpm_promotiondeal',
        		id:promoDealId
        	}),
        	promoTypeRec = record.load({
        		type:'customrecord_itpm_promotiontype',
        		id:promoDealRec.getValue('custrecord_itpm_p_type')
        	}),
        	validAccntTexts = promoTypeRec.getText('custrecord_itpm_pt_validaccounts'),
        	validAccntValues = promoTypeRec.getValue('custrecord_itpm_pt_validaccounts'),
        	promoTypeDefaultAccount = promoTypeRec.getValue('custrecord_itpm_pt_defaultaccount'),
        	promoDealAccount = promoDealRec.getValue('custrecord_itpm_p_account');

        	//allowance UOM field
        	iTPMAllownaceForm.addField({
        		id : 'custpage_custom_allownce_uom',
        		type : serverWidget.FieldType.SELECT,
        		label : 'ALLOWANCE UOM',
        		container:'custpage_custom_group'
        	}).isMandatory = true;
        	
          	//adding the item field and filter the item using ALLOW ADDITIONAL DISCOUNTS FOR THIS ITEM
        	var allowanceItemField = iTPMAllownaceForm.addField({
        		id : 'custpage_custom_allownce_item',
        		type : serverWidget.FieldType.SELECT,
        		label : 'item',
        		container:'custpage_custom_group'
        	});
        	allowanceItemField.isMandatory = true;
        	
        	
        	//allowance account field
        	var accountField = iTPMAllownaceForm.addField({
        		id : 'custpage_custom_accnt',
        		type : serverWidget.FieldType.SELECT,
        		label : 'ACCOUNT',
        		container:'custpage_custom_group'
        	});
        	accountField.isMandatory = true; 
        	
        	//adding the valid accounts id's and text values
        	validAccntValues.forEach(function(value,index){
        		accountField.addSelectOption({
        		    value : value,
        		    text : validAccntTexts[index],
        		    isSelected:(promoDealAccount != '')?promoDealAccount == value: promoTypeDefaultAccount == value
        		});
        	})
        
        	//setting the allowance items list
        	var itemSearchResultSet = getAllowedItemList(promoDealId,iTPMAllowanceRec.id),
        	editedAllowanceItem;
        	
        	allowanceItemField.addSelectOption({
    			value:' ',
    			text:' ',
    			isSelected:true
    		});
        	
        	if(eventType == 'edit'){
        		editedAllowanceItem = iTPMAllowanceRec.getValue('custrecord_itpm_all_item');
        		allowanceItemField.addSelectOption({
        			value:editedAllowanceItem,
        			text:iTPMAllowanceRec.getText('custrecord_itpm_all_item'),
        			isSelected:true
        		})
        	}
        	
        	itemSearchResultSet.forEach(function(e){
        		var itemId = e.getValue('internalid');
        		if(editedAllowanceItem != itemId){
        			allowanceItemField.addSelectOption({
            			value:itemId,
            			text:e.getValue('name')
            		})
        		}
        	});        	
    	}
    }
    
    
    //get the item list from promtional/deal which is allowed
    function getAllowedItemList(pid,allowanceRecId){

    	//allowance items search
    	var allowanceSearchFilter = [['custrecord_itpm_all_promotiondeal','is',pid],'and',['custrecord_itpm_all_allowaddnaldiscounts','is',false]];
    	
    	//allowanced id available (means allowance record is edit)
    	if(allowanceRecId){
    		allowanceSearchFilter.push('and',['internalid','noneof',allowanceRecId]);
    	}
    	
    	var allowanceSearch = search.create({
    		type:'customrecord_itpm_promoallowance',
    		columns:['custrecord_itpm_all_item'],
    		filters:allowanceSearchFilter
    	}).run(),loopStart = 0,loopEnd = 1000,allownaceSearchResult=[],allowanceItems=[],allowanceResultSet;
    	
    	//getting the list of results and concat with array until result is zero
    	do{
    		allowanceResultSet = allowanceSearch.getRange(loopStart,loopStart+loopEnd);
    		allownaceSearchResult = allownaceSearchResult.concat(allowanceResultSet);
    		loopStart = loopStart+loopEnd;
    	}while(allowanceResultSet.length>0);
    	
    	allownaceSearchResult.forEach(function(all){
    		allowanceItems.push(all.getValue('custrecord_itpm_all_item'));
    	});
    	//end
    	
    	//search for items
    	var sortByName = search.createColumn({
    	    name: 'name',
    	    sort: search.Sort.ASC
    	}),itemSearchFilter = [['isinactive','is',false]];
    	
    	//allowance search are not empty
    	if(allowanceItems.length>0){
    		itemSearchFilter.push('and',['internalid','noneof',allowanceItems]);
    	}
    	
    	var itemSearch = search.create({
    		type:search.Type.ITEM,
    		columns:['internalid',sortByName],
    		filters:itemSearchFilter
    	}).run(),itemResultSet,itemSearchResult = [];
    	
    	loopStart = 0,loopEnd = 1000;
    	
    	//getting the list of results and concat with array until result is zero
    	do{
    		itemResultSet = itemSearch.getRange(loopStart,loopStart+loopEnd);
    		itemSearchResult = itemSearchResult.concat(itemResultSet);
    		loopStart = loopStart+loopEnd;
    	}while(itemResultSet.length>0);

    	return itemSearchResult;
    	//end
    }
    
    
    return {
        beforeLoad: beforeLoad
    };
    
});
