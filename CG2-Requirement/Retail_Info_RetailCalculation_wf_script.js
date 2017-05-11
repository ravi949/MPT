/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * retail merge margin calculation,setting the values to the %Discount at Retail
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
			//before record submit we calculation the values
			var retailRec = scriptContext.newRecord,
			promoDealId = retailRec.getValue('custrecord_itpm_rei_promotiondeal'),
			itemId = retailRec.getValue('custrecord_itpm_rei_item'),
			itemBasePrice = retailRec.getValue('custrecord_itpm_rei_baseprice'),
			estMerchPrice = retailRec.getValue('custrecord_itpm_rei_estmerchprice'),
			estEveryDayPrice = retailRec.getValue('custrecord_itpm_rei_esteverydayprice');

			//setting the value to the Allowance Per Unit
			if(promoDealId != '' && itemId != ''){

				var allowanceResult = search.create({
					type:'customrecord_itpm_promoallowance',
					columns:['custrecord_itpm_all_uom','custrecord_itpm_all_rateperuom','custrecord_itpm_all_item.unitstype'],
					filters:[['custrecord_itpm_all_promotiondeal','is',promoDealId],'and',
						['custrecord_itpm_all_item','is',itemId],'and',
						['isinactive','is',false]]
				}).run().getRange(0,30),allowanceResultLength = allowanceResult.length;

				if(allowanceResultLength>0){
					var unitsList = [],
					unitTypeRec = record.load({
						type:record.Type.UNITS_TYPE,
						id:allowanceResult[0].getValue({name:'unitstype',join:'custrecord_itpm_all_item'})
					}),
					allowanceUOM = allowanceResult[0].getValue('custrecord_itpm_all_uom'),
					ratePerUOM = parseFloat(allowanceResult[0].getValue('custrecord_itpm_all_rateperuom')),	
					lineCount = unitTypeRec.getLineCount('uom'),baseRateValue;

					//loop through the list of units and push into the array
					for(var i=0;i<lineCount;i++){
						unitsList.push({
							isBase:unitTypeRec.getSublistValue({sublistId:'uom',fieldId:'baseunit',line:i}),
							baseId:unitTypeRec.getSublistValue({sublistId:'uom',fieldId:'internalid',line:i}),
							convertionRate : unitTypeRec.getSublistValue({sublistId:'uom',fieldId:'conversionrate',line:i})
						})
					}	

					var baseRateValue = unitsList.filter(function(e){return e.isBase == true})[0].convertionRate;
					allowancePerUnit=0;

					for(var i=0;i<allowanceResultLength;i++){
						var allowanceRateValue = unitsList.filter(function(e){return e.baseId == allowanceUOM})[0].convertionRate,
						convertionFactor = baseRateValue/allowanceRateValue;
						allowancePerUnit += convertionFactor * parseFloat(allowanceResult[i].getValue('custrecord_itpm_all_rateperuom'));
					}

					allowancePerUnit = (isNaN(allowancePerUnit))?0:allowancePerUnit;
					retailRec.setValue('custrecord_itpm_rei_allowancesperunit',allowancePerUnit);
				}

				//retail merge margin calculation
				//setting the values to the %Discount at Retail
				if(estMerchPrice !='' && estEveryDayPrice !=''){
					retailRec.setValue('custrecord_itpm_rei_discountpercent',((estMerchPrice - estEveryDayPrice)/estEveryDayPrice)*100);

					var mergeReatailValue = estMerchPrice-(itemBasePrice - allowancePerUnit);
					(mergeReatailValue != '')?retailRec.setValue('custrecord_itpm_rei_margin',mergeReatailValue):'';

					var mergePercent = (mergeReatailValue/estMerchPrice)*100;
					(mergePercent!='')?retailRec.setValue('custrecord_itpm_rei_marginpercent',mergePercent):''; 
				}  
			}
		}catch(e){
			log.debug('exception in retail calculation',e);
		}
	}

	return {
		onAction : onAction
	};

});
