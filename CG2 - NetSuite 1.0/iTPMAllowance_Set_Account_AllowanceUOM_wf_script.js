/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Dec 2016     sayyadtajuddin
 * setting the values to the allowance Rate and Percent fields. 
 */

/**
 * @returns {Void} Any or no return value
 */
function setAccountAndAllowanceUOM() {
	try{
		var accountValue = nlapiGetFieldValue('custrecord_itpm_all_account'), //changed from custpage_custom_account
		allowanceUOMValue = nlapiGetFieldValue('custrecord_itpm_all_uom'), //changed from dyn field
		promoDealId = nlapiGetFieldValue('custrecord_itpm_all_promotiondeal'),
		impactPrice = nlapiGetFieldValue('custrecord_itpm_all_impactprice');
		if(accountValue && accountValue !=''){
			nlapiSetFieldValue('custrecord_itpm_all_account',accountValue , true, true);
		}
		if(allowanceUOMValue && allowanceUOMValue != ''){
			nlapiSetFieldValue('custrecord_itpm_all_uom',allowanceUOMValue , true, true);
		}

		var promoDealRec = nlapiLoadRecord('customrecord_itpm_promotiondeal',promoDealId),
		itemId = nlapiGetFieldValue('custrecord_itpm_all_item'),itemRec,recordType;

		// Define search filters
		var filters = new Array();
		filters[0] = new nlobjSearchFilter( 'internalid', null, 'is', itemId);
		filters[1] = new nlobjSearchFilter( 'isinactive', null, 'is', false);
		// Define search columns
		var columns = new Array();
		columns[0] = new nlobjSearchColumn( 'type' );
		columns[1] = new nlobjSearchColumn( 'unitstype' );
		columns[2] = new nlobjSearchColumn( 'saleunit' );
		columns[3] = new nlobjSearchColumn( 'purchaseunit' );
		// Create the saved search
		var search = nlapiCreateSearch( 'item', filters, columns );

		var itemResult = search.runSearch().getResults(0, 1);

		allowanceUOM = nlapiGetFieldValue('custrecord_itpm_all_uom');

		var itemUnitType = itemResult[0].getValue('unitstype');

		//13 means Impact is Expense
		if(promoDealRec.getFieldValue('custrecord_itpm_p_impact') == '13'){
			var itemSaleOrPurchaseUnitType = itemResult[0].getValue('saleunit');
		}else{
			var itemSaleOrPurchaseUnitType = itemResult[0].getValue('purchaseunit');
		}

		var  r = nlapiLoadRecord('unitstype',itemUnitType),
		lineCount = r.getLineItemCount('uom'),conversionFactor,conversionRate,unitsList=[];

		for(var i = 1;i<=lineCount;i++){
			unitsList.push({id:r.getLineItemValue('uom','internalid',i),rate:parseFloat(r.getLineItemValue('uom', 'conversionrate', i))});
		}

		var itemUnitTypeList = unitsList.filter(function(e){return e.id == itemSaleOrPurchaseUnitType});
		if(itemUnitTypeList.length>0){
			conversionRate = itemUnitTypeList[0].rate;
		}

		var allowanceUOMList = unitsList.filter(function(e){return e.id == allowanceUOM}); 
		if(allowanceUOMList.length>0){
			var allowanceUOMRate = allowanceUOMList[0].rate;
			conversionFactor = allowanceUOMRate/conversionRate;
			//Story S-01197:-Prices on the Allowances sub-tab should be shown in the UOM that the user selected when creating the allowance
			var saleUnitList = unitsList.filter(function(e){return e.id == itemResult[0].getValue('saleunit')});
			nlapiSetFieldValue('custrecord_itpm_all_uomprice',(impactPrice)*(allowanceUOMRate/saleUnitList[0].rate))
		}
		
//		var allUnitPrice = nlapiGetFieldValue('custrecord_itpm_all_impactprice'),
		var allUnitPrice = nlapiGetFieldValue('custrecord_itpm_all_uomprice'),
		allowanceType = nlapiGetFieldValue('custrecord_itpm_all_type'),
		redemptionFactor = parseFloat(nlapiGetFieldValue('custrecord_itpm_all_redemptionfactor'))/100;

		switch(allowanceType){
		case '1': //Rate per UOM calculate %Discount price
			var allowanceRateValue = parseFloat(nlapiGetFieldValue('custrecord_itpm_all_allowancerate'));
//			var percentBasePrice = (allUnitPrice !='' && allUnitPrice != 0) ? (allowanceRateValue/(conversionFactor*allUnitPrice))*100:0;
			var percentBasePrice = (allUnitPrice !='' && allUnitPrice != 0) ? (allowanceRateValue/allUnitPrice)*100:0;
			nlapiSetFieldValue('custrecord_itpm_all_percentperuom',parseFloat(percentBasePrice));
			nlapiSetFieldValue('custrecord_itpm_all_allowancepercent',parseFloat(percentBasePrice));
			break;
		case '2': //%Discount calculate rate UOM
			var percentBasePrice = parseFloat(nlapiGetFieldValue('custrecord_itpm_all_allowancepercent'))/100;
//			var ratePerUOM = percentBasePrice * conversionFactor * allUnitPrice * redemptionFactor;
			var ratePerUOM = percentBasePrice * allUnitPrice * redemptionFactor;
			nlapiSetFieldValue('custrecord_itpm_all_rateperuom',ratePerUOM);
			nlapiSetFieldValue('custrecord_itpm_all_allowancerate',ratePerUOM);
			break;
		}
		nlapiLogExecution('DEBUG','ratePerUOM',ratePerUOM)
		nlapiLogExecution('DEBUG','percentBasePrice',percentBasePrice)
		//hide the APPLY field
//		nlapiSetFieldValue('custrecord_itpm_all_apply','https://www.google.com')
	}catch(e){
		nlapiLogExecution('DEBUG','exception',e)
	}
}
