/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Backend Suitelet script to fetch the price of an Item. Returns value to client script.
 * And It return list of unit of measures which is related to the item unit type.
 */
define(['N/record', 'N/http', 'N/runtime', 'N/search'],

function(record, http, runtime, search) {
   
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
    		var request = context.request;
    		var response = context.response;
    		var params = request.parameters;
    		if (request.method == http.Method.GET && params.price == "false"){

    			var itemId = params.itemid;
    			var unitId = params.unitid;

    			if (itemId != '' && itemId != null){
    				var itemUnit = search.lookupFields({
    					type: search.Type.ITEM,
    					id: itemId,
    					columns: ['unitstype']
    				}).unitstype[0].value;

    				var unitType = record.load({
    					type: record.Type.UNITS_TYPE,
    					id: itemUnit
    				});

    				var returnArray = [], lineCount = unitType.getLineCount({sublistId: 'uom'});
    				if (unitId != '' && unitId != null){
    					for (var x = 0; x < lineCount; x++){
    						var internalId = unitType.getSublistValue({
    							sublistId: 'uom',
    							line: x,
    							fieldId: 'internalid'
    						});
    						if (parseInt(unitId) == parseInt(internalId)) {
    							returnArray.push({
    								rate: unitType.getSublistValue({sublistId: 'uom',line: x,fieldId: 'conversionrate'})
    							});
    							break;
    						}
    					}
    				} else {
    					for (var x = 0; x < lineCount; x++){
    						var internalId = unitType.getSublistValue({
    							sublistId: 'uom',
    							line: x,
    							fieldId: 'internalid'
    						});
    						var name = unitType.getSublistValue({
    							sublistId: 'uom',
    							line: x,
    							fieldId: 'unitname'
    						});
    						var isBase = unitType.getSublistValue({
    							sublistId: 'uom',
    							line: x,
    							fieldId: 'baseunit'
    						});
    						var conversionRate = unitType.getSublistValue({
    							sublistId: 'uom',
    							line: x,
    							fieldId: 'conversionrate'
    						});
    						returnArray.push({
    							internalId : internalId, name: name, rate : conversionRate, base: isBase 
    						});
    					}
    				}
    			} else {
    				log.error('ITEM_ID_NULL', 'No value in Item Id parameter.');
    				response.write(JSON.stringify({error:true}));
    			}
    			log.debug('JSON response', JSON.stringify({error:false, unitsList : returnArray}));
    			response.write(JSON.stringify({error:false, unitsList : returnArray}));
    			
    		}else if(request.method == http.Method.GET && params.price == "true"){
    			
    			//reading the price value according to the conditions and return the value to the field
    			var price = '';
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
    	} catch(ex) {
    		log.error(ex.name, ex.message + '; on parameters = ' + JSON.stringify(context.request.parameters));
    		console.log(log.error(ex.name, ex.message + '; on parameters = ' + JSON.stringify(context.request.parameters)));
    		context.response.write(JSON.stringify({error:true}));
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
