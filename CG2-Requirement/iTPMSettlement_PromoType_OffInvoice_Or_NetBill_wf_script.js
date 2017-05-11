/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/search','N/record'],

function(search,record) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	//If the promotion type does not allow Off-Invoice or Net Bill, do not show the off-invoice liability, request and overpay fields.
    	var promoTypeId = search.lookupFields({
    		type:'customrecord_itpm_promotiondeal',
    		id:scriptContext.newRecord.getValue('custbody_itpm_set_promo'),
    		columns:['custrecord_itpm_p_type']
    	})['custrecord_itpm_p_type'][0].value;
    	
    	var promoTypeMOP = record.load({
    		type:'customrecord_itpm_promotiontype',
    		id:promoTypeId
    	}).getValue('custrecord_itpm_pt_validmop')
    	
    	var offInvFound = promoTypeMOP.some(function(e){return e == 3}); //off-invoice
    	var netBillFound = promoTypeMOP.some(function(e){return e == 2});//net-bill

    	return (offInvFound && netBillFound).toString();
    }

    return {
        onAction : onAction
    };
    
});
