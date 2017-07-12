/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Backend Suitelet script to fetch the price of an Item. Returns value to client script.
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
				var params = request.parameters,price = '';
				var itemBasePrice = params.baseprice;
				var promotionLookup = search.lookupFields({
					type:'customrecord_itpm_promotiondeal',
					id:params.pid,
					columns:['custrecord_itpm_p_type']
				});
				var promoTypeRec = record.load({
					type:'customrecord_itpm_promotiontype',
					id:promotionLookup['custrecord_itpm_p_type'][0].value
				});
				var promotionImpact = promoTypeRec.getValue('custrecord_itpm_pt_financialimpact');
			
				switch(promotionImpact){
				case "13": //Expense
					price = setPriceValue((params.pricelevel =='')?undefined:params.pricelevel,params.itemid);
					price = (isNaN(price))?itemBasePrice:price;
					break;
				}
				response.write(JSON.stringify({success:true,price:price}));
			}
		}catch(e){
			log.error(e.name,'record type = iTPM Promotion,  record id='+params.pid+', error in price level , message = '+e.message);
			response.write(JSON.stringify({success:false,message:e.message}));
		}
	}


	//setting the Price Value in allowance record.
	function setPriceValue(priceLevel,itemId){
		var price = undefined;
		var itemResult = search.create({
			type:search.Type.ITEM,
			columns:['pricing.pricelevel','pricing.unitprice'],
			filters:[['internalid','is',itemId],'and',
					 ['pricing.pricelevel','is',priceLevel],'and',
					 ['isinactive','is',false]
			]
		}).run().getRange(0,1);
		price = itemResult[0].getValue({name:'unitprice',join:'pricing'});
		return price;
	}


	return {
		onRequest: onRequest
	};

});
