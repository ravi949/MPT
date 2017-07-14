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
    		var allRec = scriptContext.newRecord,
    		itemId = allRec.getValue('custrecord_itpm_all_item'),
    		allUOM = allRec.getValue('custrecord_itpm_all_uom'), //changed from dyn field
    		promoId = allRec.getValue('custrecord_itpm_all_promotiondeal'),
    		allUnitPrice =  parseFloat(allRec.getValue('custrecord_itpm_all_uomprice')),
    		allType = allRec.getValue('custrecord_itpm_all_type'),
    		redemptionFactor = parseFloat(allRec.getValue('custrecord_itpm_all_redemptionfactor'))/100;
    		
    		//for this you need to load the iTPM_Module.js file
//    		var unitsList = iTPM_Module.getItemUnits(itemId).unitArray;

    		//allowance uom price calculation based on item converstion rate 
//    		if(allowanceUOMList.length>0){
//    			var allowanceUOMRate = allowanceUOMList[0].rate;
//    			conversionFactor = allowanceUOMRate/conversionRate;
//    			//Story S-01197:-Prices on the Allowances sub-tab should be shown in the UOM that the user selected when creating the allowance
//    			var saleUnitList = unitsList.filter(function(e){return e.id == itemResult[0].getValue('saleunit')});
//    			nlapiSetFieldValue('custrecord_itpm_all_uomprice',(impactPrice)*(allowanceUOMRate/saleUnitList[0].rate))
//    		}
    		
    		
//    		var promoImpact = record.load({
//    			type:'customrecord_itpm_promotiondeal',
//    			id:promoId
//    		}).getValue('custrecord_itpm_p_impact');
//    		
//    		var itemSearch = search.create({
//    			type:search.Type.ITEM,
//    			columns:['unitstype','saleunit','purchaseunit'],
//    			filters:[['internalid','is',itemId],'and',['isinactive','is',false]]
//    		}).run().getRange(0,1),
//    		itemRecItemType = itemSearch[0].getValue('unitstype'),
//    		itemSaleOrPurchaseUnitType;
//    		
//    		if(promoImpact == '13'){
//    			itemSaleOrPurchaseUnitType = itemSearch[0].getValue('saleunit');
//    		}else{
//    			itemSaleOrPurchaseUnitType = itemSearch[0].getValue('purchaseunit');
//    		}
    		
    		switch(allType){
    		case '1': //Rate per UOM calculate %Discount price
    			var allowanceRateValue = parseFloat(allRec.getValue('custrecord_itpm_all_allowancerate'));
//    			var percentBasePrice = (allUnitPrice !='' && allUnitPrice != 0) ? (allowanceRateValue/(conversionFactor*allUnitPrice))*100:0;
    			var percentBasePrice = (allUnitPrice !='' && allUnitPrice != 0) ? (allowanceRateValue/allUnitPrice)*100:0;
    			allRec.setValue('custrecord_itpm_all_percentperuom',parseFloat(percentBasePrice));
    			allRec.setValue('custrecord_itpm_all_allowancepercent',parseFloat(percentBasePrice));
    			break;
    		case '2': //%Discount calculate rate UOM
    			var percentBasePrice = parseFloat(allRec.getValue('custrecord_itpm_all_allowancepercent'))/100;
//    			var ratePerUOM = percentBasePrice * conversionFactor * allUnitPrice * redemptionFactor;
    			var ratePerUOM = percentBasePrice * allUnitPrice * redemptionFactor;
    			allRec.setValue('custrecord_itpm_all_rateperuom',ratePerUOM);
    			allRec.setValue('custrecord_itpm_all_allowancerate',ratePerUOM);
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
