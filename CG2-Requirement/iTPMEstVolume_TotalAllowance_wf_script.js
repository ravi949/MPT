/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Bring allowances from promotion and setting total rate and total percent in estimated quantity
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
		try{
			var estVolumeRec = scriptContext.newRecord,itemRecord,ratePerUOM,percentBasePrice,
			sumOfAllowancePerUOM = 0,sumOfAllowancePercentPerUOM = 0,
			item = estVolumeRec.getValue('custrecord_itpm_estqty_item'),
			promoDeal = estVolumeRec.getValue('custrecord_itpm_estqty_promodeal'),
			estVolumeBy = estVolumeRec.getValue('custrecord_itpm_estqty_qtyby'),
			allowanceHasValues = false;

			if(item){
				var itemResult = search.create({
					type:search.Type.ITEM,
					columns:['unitstype'],
					filters:[['internalid','is',item],'and',['isinactive','is',false]]
				}).run().getRange(0,1);
			}

			var unitTypeId = itemResult[0].getValue('unitstype'),
			baseUnitsList = [];

			if(unitTypeId != '' && estVolumeBy != ''){

				//loading the unit type record for line item values
				var unitTypeRec = record.load({
					type:record.Type.UNITS_TYPE,
					id:unitTypeId
				}),
				lineCount = unitTypeRec.getLineCount('uom');

				//loop throught the list of units and push into the array
				for(var i=0;i<lineCount;i++){
					baseUnitsList.push({
						isBase:unitTypeRec.getSublistValue({sublistId:'uom',fieldId:'baseunit',line:i}),
						baseId:unitTypeRec.getSublistValue({sublistId:'uom',fieldId:'internalid',line:i}),
						convertionRate : unitTypeRec.getSublistValue({sublistId:'uom',fieldId:'conversionrate',line:i})
					})
				}

				//filter the base unit list
				var filteredBaseList = baseUnitsList.filter(function(list){return list.isBase == true})[0];

				//searching for allowance with promotional/deal and item which are in active stage
				search.create({
					type:'customrecord_itpm_promoallowance',
					columns:['custrecord_itpm_all_uom','custrecord_itpm_all_rateperuom','custrecord_itpm_all_percentperuom'],
					filters:[['custrecord_itpm_all_promotiondeal','is',promoDeal],'and',
						['custrecord_itpm_all_item','is',item],'and',['isinactive','is',false]
					]
				}).run().each(function(e){
					var allowanceConvertionRate = baseUnitsList.filter(function(list){return list.baseId == e.getValue('custrecord_itpm_all_uom')})[0];
					var allowanceRatePerUOM = e.getValue('custrecord_itpm_all_rateperuom'),
					allowancePercentUOM = e.getValue('custrecord_itpm_all_percentperuom');

					if(allowanceConvertionRate.baseId == estVolumeBy && allowanceRatePerUOM != ''){
						sumOfAllowancePerUOM += parseFloat(allowanceRatePerUOM);
					}else if(allowanceRatePerUOM != ''){
						var estVolumeByRate = baseUnitsList.filter(function(e){return e.baseId == estVolumeBy})[0].convertionRate,
						baseConvertionFactor = estVolumeByRate / allowanceConvertionRate.convertionRate;
						sumOfAllowancePerUOM += parseFloat(e.getValue('custrecord_itpm_all_rateperuom'))*baseConvertionFactor;
					}

					if(allowancePercentUOM != ''){
						sumOfAllowancePercentPerUOM += parseFloat(allowancePercentUOM);
					}

					return true;
				})

				log.debug('sumOfAllowancePerUOM',sumOfAllowancePerUOM);
				log.debug('sumOfAllowancePercentPerUOM',sumOfAllowancePercentPerUOM);
				estVolumeRec.setValue({
					fieldId:'custrecord_itpm_estqty_totalrate',
					value:sumOfAllowancePerUOM
				}).setValue({
					fieldId:'custrecord_itpm_estqty_totalpercent',
					value:sumOfAllowancePercentPerUOM
				});       		
			}
		}catch(e){
			log.debug('exception in estqty total allowance cal',e);
		}
	}

	return {
		onAction : onAction
	};

});
