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
	    		//setting the Allowance Type field value based on the Preferences
	    		if (sc.type == 'create'){
	    			prefSearchRes = search.create({
						type:'customrecord_itpm_preferences',
						columns:['custrecord_itpm_pref_defaultalltype']
					}).run().getRange(0,1);
	    			log.error('prefSearchRes',prefSearchRes);
	    			if(prefSearchRes.length > 0){
	    				log.error('prefSearchRes',prefSearchRes[0].getValue('custrecord_itpm_pref_defaultalltype'));
	    				//custrecord_itpm_all_type
	    				sc.newRecord.setValue({
	    				    fieldId: 'custrecord_itpm_all_type',
	    				    value: prefSearchRes[0].getValue('custrecord_itpm_pref_defaultalltype')
	    				});
	    			}
	    		}
	    	}
    	} catch(ex){
    		log.error(ex.name, ex.message);
    	}
    }

    return {
        beforeLoad: beforeLoad
    };
    
});
