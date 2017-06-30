/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * It is acts as backend suitelet it return the Price value to the client script.
 */
define(['N/record','N/search'],

		function(record,search) {

	/**
	 * Definition of the Suitelet script trigger point.
	 *
	 * @param {Object} context
	 * @param {ServerRequest} context.request - Encapsulation of the incoming request
	 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
	 * @Since 2015.2
	 */
	function onRequest(context) {
		try{
			//reading the price value according to the conditions and return the value to the field
			var request = context.request,response = context.response;
			if(request.method == 'GET'){
				var params = request.parameters;
			 
				allowanceItemId = params.itemid,priceValue = '',
				itemBasePrice = params.baseprice,
				promoDealLookup = search.lookupFields({
					type:'customrecord_itpm_promotiondeal',
					id:params.pid,
					columns:['custrecord_itpm_p_type','custrecord_itpm_p_incomepricingtype','custrecord_itpm_p_itempricelevel','custrecord_itpm_p_subsidiary','custrecord_itpm_p_vendor','custrecord_itpm_p_customer']
				}),
				promoTypeRec = record.load({type:'customrecord_itpm_promotiontype',id:promoDealLookup['custrecord_itpm_p_type'][0].value}),
				promoDealImpact = promoTypeRec.getValue('custrecord_itpm_pt_financialimpact'),
				promoSubsidiaryId =  promoDealLookup['custrecord_itpm_p_subsidiary'][0].value,
				promoVendorId = (promoDealLookup['custrecord_itpm_p_vendor'].length>0)?promoDealLookup['custrecord_itpm_p_vendor'][0].value:'',
				promoDealValuesObj = {subId:promoSubsidiaryId,vendorId:promoVendorId};

				switch(promoDealImpact){
				case "11":
					var incomePricingTypeText = promoDealLookup['custrecord_itpm_p_incomepricingtype'][0].value;
					priceValue = setAllowancePriceValue(incomePricingTypeText,allowanceItemId,promoDealValuesObj);
					priceValue = (priceValue)?priceValue:itemBasePrice;
					break;
				case "13":
//					var expensePricingTypeText = promoDealLookup['custrecord_itpm_p_expensepricingtype'][0].value;

//					if(expensePricingTypeText != ''){
//						if(expensePricingTypeText != 'Customer Price'){
//							if(expensePricingTypeText == 'Price Level'){
								var allowancePriceLevel = params.pricelevel;
//							}
							priceValue = setPriceValue((allowancePriceLevel =='')?undefined:allowancePriceLevel,allowanceItemId);
//						}else{
//							log.debug('price not customer',priceValue)
//							//setting the price value from customer record if expensePricingTypeText is Customer Price 
//							var customerRec = record.load({
//								type:record.Type.CUSTOMER,
//								id:promoDealLookup['custrecord_itpm_p_customer'][0].value
//							});
//
//							var itemPricingCount = customerRec.getLineCount('itempricing');
//
//							for(var i = 0; i< itemPricingCount;i++){
//								var itemPriceItemId = customerRec.getSublistValue({sublistId:'itempricing',fieldId:'item',line:i});
//								if(itemPriceItemId == allowanceItemId){
//									var customerItemPriceLevel  = customerRec.getSublistValue({sublistId:'itempricing',fieldId:'level',line:i});
//									if(customerItemPriceLevel == -1){
//										priceValue = customerRec.getSublistValue({sublistId:'itempricing',fieldId:'price',line:i});
//										break;
//									}else{
//										var priceResult = getItemPriceValue(['pricing.pricelevel','pricing.unitprice'],['pricing.pricelevel','is',customerItemPriceLevel],itemPriceItemId);
//										priceValue = priceResult[0].getValue({name:'unitprice',join:'pricing'});
//										break;
//									}
//								}
//							}
//						}
//					}
					priceValue = (isNaN(priceValue))?itemBasePrice:priceValue;
					break;
				}  
				
				response.write(JSON.stringify({success:true,price:priceValue}));
			}
		}catch(e){
			log.error('exception',e)
			response.write(JSON.stringify({success:false}));
		}
	}



	//setting the Price Value in allowance record.
	function setPriceValue(priceLevel,itemId){
		var priceValue = undefined,itemResult;
		itemResult = getItemPriceValue(['pricing.pricelevel','pricing.unitprice'],['pricing.pricelevel','is',priceLevel],itemId);
		priceValue = itemResult[0].getValue({name:'unitprice',join:'pricing'});

		return priceValue;
	}


	//set the allowance price value
	function setAllowancePriceValue(incomePricingTypeText,itemId,promoDealValuesObj){

		var itemResult = search.create({
			type:search.Type.ITEM,
			columns:['averagecost','cost','lastpurchaseprice'],
			filters:[['internalid','is',itemId]]
		}).run().getRange(0,1)[0]


		var priceValue;
		switch(incomePricingTypeText){
		case 'Vendor Price':
		case 'Purchase Price':
			priceValue = (incomePricingTypeText == 'Vendor Price')?getVendorItemPrice(itemId,promoDealValuesObj): itemRecord.getValue('cost');

			if(priceValue == '' && incomePricingTypeText == 'Vendor Price'){
				priceValue = itemResult.getValue('cost'); //puchase price
			}else if(priceValue == ''){
				priceValue = getVendorItemPrice(itemId,promoDealValuesObj);
			}

			if(priceValue == ''){
				priceValue =  itemResult.getValue('lastpurchaseprice');  //last purchase price
			}
			if(priceValue == ''){
				priceValue = itemResult.getValue('averagecost');  // average cost
			}

			break;	   
		case 'Average Cost':
		case 'Last Purchase Price':
			priceValue = (incomePricingTypeText == 'Average Cost')?itemResult.getValue('averagecost'):itemResult.getValue('lastpurchaseprice');

			if(priceValue == ''){
				priceValue = getVendorItemPrice(itemId,promoDealValuesObj); //vendor price
			}
			if(priceValue == ''){
				priceValue = itemResult.getValue('cost'); //purchase price
			}
			if(priceValue == '' && incomePricingTypeText == 'Average Cost'){
				priceValue = itemResult.getValue('averagecost'); //average cost
			}
			break;

		}

		return (priceValue != '' && priceValue !=null && parseFloat(priceValue)!=0)?priceValue:undefined;
	}


	//get vendor price
	function getVendorItemPrice(itemId,promoDealValuesObj){    	
		var subsidiaryCurrencyId = record.load({
			type:record.Type.SUBSIDIARY,
			id:promoDealValuesObj.subId
		}).getValue('currency');

		var itemResult = search.create({
			type:search.Type.ITEM,
			columns:['othervendor','vendorpricecurrency','vendorcostentered'],
			filters:[['internalid','is',itemId],'and',
				['vendorpricecurrency','is',subsidiaryCurrencyId],'and',
				['othervendor','is',promoDealValuesObj.vendorId],'and',
				['subsidiary','is',promoDealValuesObj.subId]]
		}).run().getRange(0,1);

		priceValue = (itemResult.length>0)?itemResult[0].getValue('vendorcostentered'):'';

		return (priceValue != '')?priceValue:'';
	}


	//get the search results
	function getItemPriceValue(itemSearchColumn,customFilter,itemId){
		var itemSearchFilter = [['internalid','is',itemId],'and',
			['isinactive','is',false]
		]
		if(customFilter){
			itemSearchFilter.push('and',customFilter);
		}
		return search.create({
			type:search.Type.ITEM,
			columns:itemSearchColumn,
			filters:itemSearchFilter
		}).run().getRange(0,1);
	}






	return {
		onRequest: onRequest
	};

});
