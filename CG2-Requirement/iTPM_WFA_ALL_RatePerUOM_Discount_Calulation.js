/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record'],
/**
 * @param {search} search
 */
function(record) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	try{
    		var allRec = scriptContext.newRecord;
    		var itemId = allRec.getValue('custrecord_itpm_all_item');
    		var allUOM = allRec.getValue('custrecord_itpm_all_uom'); //changed from dyn field
    		var promoId = allRec.getValue('custrecord_itpm_all_promotiondeal');
    		var allUnitPrice =  parseFloat(allRec.getValue('custrecord_itpm_all_uomprice'));
    		var allType = allRec.getValue('custrecord_itpm_all_type');
    		var redemptionFactor = parseFloat(allRec.getValue('custrecord_itpm_all_redemptionfactor'))/100;

    		switch(allType){
    		case '1': //Rate per UOM calculate %Discount price
    			var allowanceRateValue = parseFloat(allRec.getValue('custrecord_itpm_all_allowancerate'));
    			var percentBasePrice = (allUnitPrice !='' && allUnitPrice != 0) ? (allowanceRateValue/allUnitPrice)*100:0;
    			allRec.setValue('custrecord_itpm_all_allowancepercent',parseFloat(percentBasePrice));
    			break;
    		case '2': //%Discount calculate rate UOM
    			var percentBasePrice = parseFloat(allRec.getValue('custrecord_itpm_all_allowancepercent'))/100;
    			var ratePerUOM = percentBasePrice * allUnitPrice * redemptionFactor;
    			allRec.setValue('custrecord_itpm_all_rateperuom',ratePerUOM);
    			break;
    		}
    		
    	}catch(e){
    		log.error(e.name,e.message);
    	}
    	
    }

    return {
        onAction : onAction
    };
    
});
