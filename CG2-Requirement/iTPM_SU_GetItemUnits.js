/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
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
    		//log.debug('ServerRequest', 'Method: ' + context.request.method);
    		if (context.request.method == http.Method.GET){
    			//log.debug('ServerRequest', 'Parameters: ' + JSON.stringify(context.request.parameters));
    			var itemId = context.request.parameters.itemid;
    			var unitId = context.request.parameters.unitid;
    			//log.debug('ItemId', itemId);
    			if (itemId != '' && itemId != null){
    				var itemUnit = search.lookupFields({
    					type: search.Type.ITEM,
    					id: itemId,
    					columns: ['unitstype']
    				}).unitstype[0].value;
    				//log.debug('ItemUnit', itemUnit);
    				var unitType = record.load({
    					type: record.Type.UNITS_TYPE,
    					id: itemUnit
    				});
    				//log.debug('Unit', JSON.stringify(unitType));
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
    				context.response.write(JSON.stringify({error:true}));
    			}
    			log.debug('JSON response', JSON.stringify({error:false, unitsList : returnArray}));
    			context.response.write(JSON.stringify({error:false, unitsList : returnArray}));
    		}
    	} catch(ex) {
    		log.error(ex.name, ex.message + '; on parameters = ' + JSON.stringify(context.request.parameters));
    		context.response.write(JSON.stringify({error:true}));
    	}
    }

    return {
        onRequest: onRequest
    };
    
});
