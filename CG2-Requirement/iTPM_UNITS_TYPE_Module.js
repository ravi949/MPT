define(['N/record','N/search'],
/**
* @param {record} record
*/
function(record,search) {

	function getUnits(itemId){
		try{
			var fieldLookUp = search.lookupFields({
				type:search.Type.ITEM,
				id:itemId ,
				columns:['unitstype']
			}),
			unitRecId = fieldLookUp.unitstype[0].value;

			var unitRec = record.load({
				type:record.Type.UNITS_TYPE,
				id:unitRecId
			}),
			unitLineCount = unitRec.getLineCount('uom'),
			units = [];

			for(var i = 0;i<unitLineCount;i++){
				units.push({
					id:unitRec.getSublistValue({sublistId:'uom',fieldId:'internalid',line:i}),
					rate:parseFloat(unitRec.getSublistValue({sublistId:'uom',fieldId:'conversionrate',line:i}))
				})
			}
			
			return units;
		
		}catch(e){
			log.debug('exception in unit module',e);
		}
	}

	return {
		getUnits:getUnits
	};

});
