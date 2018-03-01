/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Backend Suitelet script to fetch the price of an Item. Returns value to client script.
 * And It return list of unit of measures which is related to the item unit type.
 */
define(['N/record',
		'N/http',
		'N/search',
		'N/runtime',
		'./iTPM_Module.js'
		],

function(record, http, search, runtime, itpm) {
   
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
    				response.write(JSON.stringify({success:false}));
    			}
    			log.debug('JSON response', JSON.stringify({success:true, unitsList : returnArray}));
    			response.write(JSON.stringify({success:true, unitsList : returnArray}));
    			
    		}else if(request.method == http.Method.GET && params.price == "true"){
    			
    			//reading the price value according to the conditions and return the value to the field
    			var price = itpm.getImpactPrice(params)['price'];
    			response.write(JSON.stringify({success:true,price:price}));
    		}
    	} catch(ex) {
    		log.error(ex.name, ex.message + '; by User:' + JSON.stringify(runtime.getCurrentUser()) + '; on parameters : ' + JSON.stringify(context.request.parameters));
    		//console.log(log.error(ex.name, ex.message + '; on parameters = ' + JSON.stringify(context.request.parameters)));
    		context.response.write(JSON.stringify({success:false}));
    	}
    	
    }

  
    
    return {
        onRequest: onRequest
    };
    
});
