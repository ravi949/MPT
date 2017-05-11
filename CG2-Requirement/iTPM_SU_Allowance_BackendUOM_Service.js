/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * It is search for Allowance UOM List and pass the list values to the client script.
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
	 * search the item unit types and passing to the client script
	 */
	function onRequest(context) {
		try{
			var request = context.request,itemRecord,
			params = request.parameters;

			if(request.method == 'GET'){
				log.debug('context',request)
				var unitList = [],uomprice = 0;	
				if(params.itemId){
					//searching for the unittype of the particular item  
					var itemSearchResult = search.create({
						type:search.Type.ITEM,
						columns:['type','unitstype','saleunit'],
						filters:[['internalid','is',params.itemId],'and',['isinactive','is',false]]
					}).run().getRange(0,1),
					unitTypeId = itemSearchResult[0].getValue('unitstype');
				}

				if(unitTypeId != '' && unitTypeId){
					//loading the unit type record 
					var unitTypeRec = record.load({
						type:record.Type.UNITS_TYPE,
						id:unitTypeId
					}),
					lineCount = unitTypeRec.getLineCount('uom');
					log.debug('item unit',itemSearchResult[0].getValue('saleunit'))
					//loop through the units and getting the unit id and converstion factor.
					for(var i=0;i<lineCount;i++){
						unitList.push({
							name : unitTypeRec.getSublistValue({sublistId:'uom',fieldId:'unitname',line:i}),
							internalid : unitTypeRec.getSublistValue({sublistId:'uom',fieldId:'internalid',line:i}),
							convertionRate : unitTypeRec.getSublistValue({sublistId:'uom',fieldId:'conversionrate',line:i})
						})
					}

					if(unitList.length>0){
						params.alluom = (params.alluom == 'false')?unitList[0].internalid:params.alluom;
						var itemConverstionRate = unitList.filter(function(e){return e.internalid == itemSearchResult[0].getValue('saleunit')})[0].convertionRate,    				
						alluomConvertionRate = unitList.filter(function(e){return e.internalid == params.alluom})[0].convertionRate,
						uomprice = params.price*(alluomConvertionRate/itemConverstionRate);
					}

					context.response.write(JSON.stringify({success:true,unitList:unitList,uomprice:uomprice}));
				}else{
					context.response.write(JSON.stringify({success:false}));
				}
			}
		}catch(e){
			log.debug('exception',e);
			context.response.write(JSON.stringify({success:false}));
		}
	}

	return {
		onRequest:onRequest
	}

})