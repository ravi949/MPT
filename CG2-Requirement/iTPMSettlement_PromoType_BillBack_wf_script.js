/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * If the promotion type does not allow Bill Back, do not show the bill back liability, request and overpay fields.
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
    	//If the promotion type does not allow Bill Back, do not show the bill back liability, request and overpay fields.
    	var promoTypeId = search.lookupFields({
    		type:'customrecord_itpm_promotiondeal',
    		id:scriptContext.newRecord.getValue('custbody_itpm_set_promo'),
    		columns:['custrecord_itpm_p_type']
    	})['custrecord_itpm_p_type'][0].value;
    	
    	var promoTypeMOP = record.load({
    		type:'customrecord_itpm_promotiontype',
    		id:promoTypeId
    	}).getValue('custrecord_itpm_pt_validmop');
    	
    	var billBackFound = promoTypeMOP.some(function(e){return e == 1}); //bill-back
    	return billBackFound.toString();
    }

    return {
        onAction : onAction
    };
    
});
