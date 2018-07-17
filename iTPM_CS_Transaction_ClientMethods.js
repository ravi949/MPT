/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 */
define(['N/ui/dialog'],
/**
 * @param {dialog} dialog
 */
function(dialog) {
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
    	try{
        	var transRecord = scriptContext.currentRecord;
        	if(transRecord.getValue('custbody_itpm_applydiscounts') && 
        	   transRecord.getValue('custbody_itpm_discounts_applied')){
        		dialog.alert({
        			title:'alert',
        			message:'iTPM previously processed and applied off-invoice and net--bill allowances to this sales order.'+ 
        			'If you proceed, you may create duplicate allowances on this sales order. Manually review and confirm the accuracy of all discounts and net-bill amounts.'
        		}).then(function(success){
        			console.log(success);
        		});
        	}
        	return true;
    	}catch(ex){
    		console.log(ex.name, ex.message);
    	}
    }

    return {
        saveRecord: saveRecord
    };
    
});
