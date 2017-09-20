/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * 
 * Adds a field to the form that will allow the user to select Unit after Item is selected.
 */
define(['N/runtime',
		'N/ui/serverWidget',
		'N/search'
		],

function(runtime, sWidget, search) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} sc
     * @param {Record} sc.newRecord - New record
     * @param {string} sc.type - Trigger type
     * @param {Form} sc.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(sc) {
    	try{
    		
    		setDefaultValidMOP(sc);
    		
    		if (runtime.executionContext != runtime.ContextType.USER_INTERFACE) return;
	    	if(sc.newRecord.getValue({fieldId: 'custrecord_itpm_all_promotiondeal'})== '') return;
	    	if (sc.type == 'create' || sc.type == 'edit' || sc.type == 'copy'){
	    		var dynamicUnitField = sc.form.addField({
	    			id : 'custpage_itpm_all_unit',
	        		type : sWidget.FieldType.SELECT,
	        		label : 'Allowance Unit'
	    		});
	    		dynamicUnitField.isMandatory = true;
	    		dynamicUnitField.updateLayoutType({
	    			layoutType : sWidget.FieldLayoutType.OUTSIDEABOVE
	    		});
	    		dynamicUnitField.updateBreakType({
	    			breakType : sWidget.FieldBreakType.STARTCOL
	    		});
	    		dynamicUnitField.setHelpText({
	    			help: 'Once you select an Item, the allowed Units will populate here. Select an applicable unit for this allowance.'
	    		});
	    		sc.form.insertField({
	    			field: dynamicUnitField,
	    			nextfield : 'custrecord_itpm_all_uom'
	    		});
	    	}
    	} catch(ex){
    		log.error(ex.name, ex.message);
    	}
    }
    
    /**
     * @param sc record object
     * @returns NONE
     * @description it sets the default valid mop
     */
    function setDefaultValidMOP(sc){
    	if(sc.type == 'create' || sc.type == 'copy'){
    		var ptMOP = search.lookupFields({
    			type:'customrecord_itpm_promotiontype',
    			id:sc.newRecord.getValue('custrecord_itpm_all_promotiontype'),
    			columns:['custrecord_itpm_pt_validmop']
    		});
    		var defaultMOP;
    		
    		ptMOP['custrecord_itpm_pt_validmop'].forEach(function(e){
    			switch(e.value){
    			case '1':
    				defaultMOP = 1;
    				break;
    			case '2':
    				defaultMOP = (defaultMOP != 1)?2:defaultMOP;
    				break;
    			case '3':
    				defaultMOP = (defaultMOP != 1)?3:defaultMOP;
    				break;
    			}
    			sc.newRecord.setValue({
    				fieldId:'custrecord_itpm_all_mop',
    				value:defaultMOP
    			});
    		});
    	}
    }

    return {
        beforeLoad: beforeLoad
    };
    
});
