/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search','N/ui/dialog'],
/**
 * @param {search} search
 */
function(search,dialog) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
	var mode;
    function pageInit(scriptContext) {
    	try{
    		mode = scriptContext.mode;
    		if(mode == 'edit'){
    			var disableADD = checkForAllowaceDuplicates(scriptContext.currentRecord);
    			if(disableADD != 0){
    				var checkBoxField = scriptContext.currentRecord.getField('custrecord_itpm_all_allowaddnaldiscounts');
    				checkBoxField.isDisabled = disableADD;
    			}
    		}
    	}catch(e){
    		log.debug('exception in pageint allowance',e)
    	}
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
    	try{
    		if((mode == 'create'|| mode == 'edit' || mode == 'copy') && scriptContext.fieldId == 'custrecord_itpm_all_item'){
    			var item = scriptContext.currentRecord.getValue('custrecord_itpm_all_item');
    			if(item != ""){
    				var disableADD = checkForAllowaceDuplicates(scriptContext.currentRecord),
    				checkBoxField = scriptContext.currentRecord.getField('custrecord_itpm_all_allowaddnaldiscounts');
    				if(disableADD != -1){
    					checkBoxField.isDisabled = true;
    					//if previous allowane ADD checked than we showing the popup for other allowances
    					if(disableADD){
    						dialog.confirm({title:'Confirm',message:'You selected an item that is already being used on another allowance on this promotion. Are you sure?'})
        					.then(function(result){
        						if(!result){
        							disableADD = false;
        							scriptContext.currentRecord.setValue('custrecord_itpm_all_item','')
        							.setValue({fieldId:'custrecord_itpm_all_allowaddnaldiscounts',value:false});
        						}
        						checkBoxField.isDisabled = disableADD;
        					})
        					.catch(function(){return false});
    					}
    					
    				}else{
    					checkBoxField.isDisabled = false; 
    				}
    			}
    		}
    	}catch(e){
    		log.debug('exception in field change item in allowance',e);
    	}
    }
    
    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
    	return true
    }
    
    function checkForAllowaceDuplicates(allRec){
    	var allAddChecked = -1,
		item = allRec.getValue('custrecord_itpm_all_item'),promo = allRec.getValue('custrecord_itpm_all_promotiondeal');

    	search.create({
    		type:'customrecord_itpm_promoallowance',
    		columns:['internalid','custrecord_itpm_all_allowaddnaldiscounts'],
    		filters:[['custrecord_itpm_all_promotiondeal','is',promo],'and',
    			['custrecord_itpm_all_item','is',item],'and',
    			['isinactive','is',false]]
    	}).run().each(function(e){
    		allRec.setValue({fieldId:'custrecord_itpm_all_allowaddnaldiscounts',value:e.getValue({name:'custrecord_itpm_all_allowaddnaldiscounts'})})
    		allAddChecked = e.getValue({name:'custrecord_itpm_all_allowaddnaldiscounts'});
    		return false;
    	});
    	
    	return allAddChecked;
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
//        postSourcing: postSourcing,
//        sublistChanged: sublistChanged,
//        lineInit: lineInit,
//        validateField: validateField,
//        validateLine: validateLine,
//        validateInsert: validateInsert,
//        validateDelete: validateDelete,
//        saveRecord: saveRecord
    };
    
});
