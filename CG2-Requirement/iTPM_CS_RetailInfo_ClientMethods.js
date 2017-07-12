/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record'],
/**
 * @param {record} record
 */
function(record) {
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
    		var rec = scriptContext.currentRecord;
    		if(scriptContext.fieldId == 'custpage_rei_itemfield'){
    			var itemFieldValue = rec.getValue({
    				fieldId: 'custpage_rei_itemfield'
    			});
    			rec.setValue({
    				fieldId: 'custrecord_itpm_rei_item',
    				value: itemFieldValue
    			});
    		} else if(scriptContext.fieldId == 'custpage_itpm_activity_field'){
    			rec.setValue({
    				fieldId: 'custrecord_itpm_rei_activity',
    				value: rec.getValue({fieldId: 'custpage_itpm_activity_field'})
    			});
    		}
    	}catch(ex){
    		console.log(ex.name,'function name = fieldchange, message = '+ex.message);
    	}
    }

    return {
        fieldChanged: fieldChanged
    };
    
});
