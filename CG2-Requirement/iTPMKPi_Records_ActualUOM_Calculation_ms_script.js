/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *Calculating the Estimated Spend w/o LS, Actual Total Quantity, Total Estimated Quantity, Maximum Liability w/o LS fields in KPI record
 */
define(['N/search','N/record','N/runtime'],
function(search,record,runtime) {

	function getInputData() {

		return search.create({
			type:'customrecord_itpm_kpi',
			columns:['internalid','custrecord_itpm_kpi_item','custrecord_itpm_kpi_uom','custrecord_itpm_kpi_item.unitstype','custrecord_itpm_kpi_promotiondeal','custrecord_itpm_kpi_promotiondeal.custrecord_itpm_p_shipstart','custrecord_itpm_kpi_promotiondeal.custrecord_itpm_p_shipend','custrecord_itpm_kpi_promotiondeal.custrecord_itpm_p_customer','custrecord_itpm_kpi_promotiondeal.custrecord_itpm_p_vendor'],
			filters:[['isinactive','is',false]]
		})
	}

	function map(context) {
		try{
			var kpiValue = JSON.parse(context.value),kpiList = [],
			kpiSearch = kpiValue.values,promoDealId = kpiSearch['custrecord_itpm_kpi_promotiondeal'].value;		

			//getting the values for calculation
			if(promoDealId != ''){
				var kpiId = kpiSearch['internalid'].value,
                kpiUOM = kpiSearch['custrecord_itpm_kpi_uom'].value;
				startDate = kpiSearch['custrecord_itpm_p_shipstart.custrecord_itpm_kpi_promotiondeal'],
				endDate = kpiSearch['custrecord_itpm_p_shipend.custrecord_itpm_kpi_promotiondeal'],
				itemId = kpiSearch['custrecord_itpm_kpi_item'].value,
				itemUnitType = kpiSearch['unitstype.custrecord_itpm_kpi_item'].value;
				var promoDealLookup = search.lookupFields({
				    type: 'customrecord_itpm_promotiondeal',
				    id: promoDealId,
				    columns: ['custrecord_itpm_p_lumpsum','custrecord_itpm_p_status','custrecord_itpm_p_condition','CUSTRECORD_ITPM_P_TYPE.custrecord_itpm_pt_financialimpact']
				}),
				promoDealImpact = promoDealLookup['CUSTRECORD_ITPM_P_TYPE.custrecord_itpm_pt_financialimpact'][0].value,
				customerObj = kpiSearch['custrecord_itpm_p_customer.custrecord_itpm_kpi_promotiondeal'],
				vendorObj = kpiSearch['custrecord_itpm_p_vendor.custrecord_itpm_kpi_promotiondeal'];
				customerId = (promoDealImpact == '13')?customerObj.value:vendorObj.value,
				promoStatus = promoDealLookup['custrecord_itpm_p_status'][0].value,
				promoCondition = promoDealLookup['custrecord_itpm_p_condition'][0].value;
				
                fixedAmnt = parseFloat(promoDealLookup['custrecord_itpm_p_lumpsum']); //LUMP SUM

				var estVolumeResult = search.create({
					type:'customrecord_itpm_estquantity',
					columns:['custrecord_itpm_estqty_qtyby','custrecord_itpm_estqty_estspendwithoutls','custrecord_itpm_estqty_totalqty'],
					filters:[['custrecord_itpm_estqty_item','is',itemId],'and',
					         ['custrecord_itpm_estqty_promodeal','is',promoDealId],'and',
					         ['isinactive','is',false]]
				}).run().getRange(0,1),estVolumeBy,estTotalPending;
				if(estVolumeResult.length>0){
					estVolumeBy = estVolumeResult[0].getValue('custrecord_itpm_estqty_qtyby'),
					estTotalPending = estVolumeResult[0].getValue('custrecord_itpm_estqty_estspendwithoutls');
					estTotalQty = estVolumeResult[0].getValue('custrecord_itpm_estqty_totalqty')
				}
			}
			
			
			
			//searching for the item fulfillment or item reciept 
			//if IMPACT is 13 than item fulfillment search, else item reciept search
			
			var result = search.create({
				type:(promoDealImpact == '13')?search.Type.ITEM_FULFILLMENT:search.Type.ITEM_RECEIPT,
				columns:['internalid'],
				filters:[['entity','is',customerId],'and',['trandate','within',startDate,endDate],'and',
						 ['mainline','is','T']]
			}),resultNotFound = true;			
			result.run().each(function(itemF){
				resultNotFound = false;
				var itemFRec = record.load({
					type:(promoDealImpact == '13')?search.Type.ITEM_FULFILLMENT:search.Type.ITEM_RECEIPT,
					id:itemF.getValue('internalid')
				});
				var lineCount = itemFRec.getLineCount('item');
				for(var i=0;i<lineCount;i++){
					var sublistItemId = itemFRec.getSublistValue({
						sublistId:'item',
						fieldId:'item',
						line:i
					});

					var lineItemUnit='',quantity = '';
					if(itemId == sublistItemId){
						lineItemUnit = itemFRec.getSublistValue({
							sublistId:'item',
							fieldId:'units',
							line:i
						});
						quantity = itemFRec.getSublistValue({sublistId:'item',fieldId:'quantity',line:i});
					}
					
					context.write({
						key:{expense:(promoDealImpact == '13'),kpiId:kpiId,kpiUOM:kpiUOM,itemId:itemId,startDate:startDate,endDate:endDate,customerId:customerId,promoDealId:promoDealId,promoStatus:promoStatus,promoCondition:promoCondition,fixedAmnt:fixedAmnt,itemUnitType:itemUnitType,estVolumeBy:estVolumeBy,estPlanSpend:estTotalPending,estTotalQty:estTotalQty},
						value:{lineItemUnit:lineItemUnit,quantity:itemFRec.getSublistValue({sublistId:'item',fieldId:'quantity',line:i})}
					});
				}
				return true;
			});
			
			//if item fulfillment or item receipt result count is zero
			if(resultNotFound){
				context.write({
					key:{expense:(promoDealImpact == '13'),kpiId:kpiId,kpiUOM:kpiUOM,itemId:itemId,startDate:startDate,endDate:endDate,customerId:customerId,promoDealId:promoDealId,promoStatus:promoStatus,promoCondition:promoCondition,fixedAmnt:fixedAmnt,itemUnitType:itemUnitType,estVolumeBy:estVolumeBy,estPlanSpend:estTotalPending,estTotalQty:estTotalQty},
					value:{lineItemUnit:'',quantity:''}
				});
			}
//			log.debug('remaining usage',runtime.getCurrentScript().getRemainingUsage());
		}catch(e){
			log.debug('map exe'+promoDealId,e)
		}
	}


	function reduce(context){
		try{
			log.debug('reduce',context)
			var key = JSON.parse(context.key),unitsList=[],
			unitTypeRec = record.load({
				type:record.Type.UNITS_TYPE,
				id:key.itemUnitType
			}),
			lineCount = unitTypeRec.getLineCount('uom');

			//loop through the list of units and push into the array
			for(var i=0;i<lineCount;i++){
				unitsList.push({
					id:unitTypeRec.getSublistValue({sublistId:'uom',fieldId:'internalid',line:i}),
					convertionRate : unitTypeRec.getSublistValue({sublistId:'uom',fieldId:'conversionrate',line:i})
				})
			}

			var estVolumeBy = unitsList.filter(function(unit){return unit.id == key.estVolumeBy})[0],
			actualUOM = 0;

			for(i in context.values){
				var value = JSON.parse(context.values[i]);
				if((value.hasOwnProperty('lineItemUnit') && value.hasOwnProperty('quantity'))  && (value.lineItemUnit !='' && value.quantity != '')){
					if(estVolumeBy.id == value.lineItemUnit){
						actualUOM += parseFloat(value.quantity);
					}else{
						var lineItemConvtnRate = unitsList.filter(function(e){return e.id == value.lineItemUnit})[0],
						convertedFactor = parseFloat(estVolumeBy.convertionRate)/parseFloat(lineItemConvtnRate.convertionRate);
						actualUOM += convertedFactor*parseFloat(value.quantity);
					}
				}
			}

			//Incurred Liability calculation
			if(key.expense){
				var incrdLiblty = 0;
				search.create({
					type:'customrecord_itpm_promoallowance',
					columns:['custrecord_itpm_all_mop','custrecord_itpm_all_uom','custrecord_itpm_all_type','custrecord_itpm_all_rateperuom','custrecord_itpm_all_percentperuom','custrecord_itpm_all_redemptionfactor'],
					filters:[['custrecord_itpm_all_item','is',key.itemId],'and',
					         ['custrecord_itpm_all_promotiondeal','is',key.promoDealId],'and',
					         ['isinactive','is',false]]
				}).run().each(function(allowance){
					var mop = allowance.getValue('custrecord_itpm_all_mop'),
					allowanceType = allowance.getValue('custrecord_itpm_all_type'),
					allowanceUOM = allowance.getValue('custrecord_itpm_all_uom'),
					allowanceRateUOM = allowance.getValue('custrecord_itpm_all_rateperuom'),
					allowancePercentUOM = allowance.getValue('custrecord_itpm_all_percentperuom'),
					allowanceRedemption = allowance.getValue('custrecord_itpm_all_redemptionfactor'),
					allowanceConvertionRate = parseInt(unitsList.filter(function(unit){return unit.id == allowanceUOM})[0].convertionRate);
					kpiConversionRate = unitsList.filter(function(unit){return unit.id == key.kpiUOM});

					kpiConversionRate = (kpiConversionRate.length > 0)?kpiConversionRate[0].convertionRate:undefined;
					//log.debug('allowanceConvertionRate',allowanceConvertionRate);
					//log.debug('kpiConversionRate',kpiConversionRate);

					if(kpiConversionRate && (key.promoStatus == '3' && (key.promoCondition == '2' || key.promoCondition == '3' ))  || (key.promoStatus == '7' && key.promoCondition == '3')){
//						if(mop == '1' && key.fixedAmnt != 0){
//							incrdLiblty = parseFloat(key.fixedAmnt);
//						}else{
							switch(allowanceType){
							case '1':
								incrdLiblty += (actualUOM *(kpiConversionRate/allowanceConvertionRate))
								break;
							case '2':
								//search on invioce based on CUSTOMER and Start and End Dates
								search.create({
									type:search.Type.INVOICE,
									columns:['internalid'],
									filters:[['entity','is',key.customerId],'and',['mainline','is','T'],'and',
									         ['trandate','within',key.startDate,key.endDate]]
								}).run().each(function(inv){
									var invRec = record.load({type:record.Type.INVOICE,id:inv.getValue('internalid')}),itemLineCount,
									status = invRec.getValue('status');
									if(status == 'Open'|| status == 'Paid In Full'){
										itemLineCount = invRec.getLineCount('item');
										for(var i = 0;i<itemLineCount;i++){
											if(key.itemId == invRec.getSublistValue({sublistId:'item',fieldId:'item',line:i})){
												incrdLiblty += parseFloat(invRec.getSublistValue({sublistId:'item',fieldId:'amount',line:i}));
											}
										}
									}
									return true;
								})
								break;
							}
//						}
					}
					return true;
				})
			}

			//log.debug('incrdLiblty',incrdLiblty);

			//kpi record creation
			var kpi = record.load({
				type:'customrecord_itpm_kpi',
				id:key.kpiId,
				isDynamic:true
			})

			if(key.estPlanSpend != ''){
				kpi.setValue({
					fieldId:'custrecord_itpm_kpi_estspendwols',     //Estimated Spend w/o LS
					value:key.estPlanSpend,
					ignoreFieldChange:true
				})
			}

			if(actualUOM != ''){
				kpi.setValue({
					fieldId:'custrecord_itpm_kpi_actualtotalqty',   //ACTUAL TOTAL QUANTITY
					value:actualUOM,
					ignoreFieldChange:true
				})
			}

			if(key.estTotalQty != ''){
				kpi.setValue({
					fieldId:'custrecord_itpm_kpi_esttotalqty',    //Total Estimated Quantity
					value:key.estTotalQty,
					ignoreFieldChange:true
				})
			}
						
			kpi.setValue({
				fieldId:'custrecord_itpm_kpi_incurredlewols',    //	Maximum Liability w/o LS
				value:incrdLiblty,
				ignoreFieldChange:true
			})

			kpi.save({
				enableSourcing:false,
				ignoreMandatoryFields:true
			})
			//kpi record end

			//log.debug('kpiId',key.kpiId+' est plan spend'+key.estPlanSpend+' actual uom'+actualUOM+'est volmeby'+estVolumeBy+'conv'+lineItemConvtnRate)

		}catch(e){
			log.debug('reduce exp',e);
		}

	}

	function summarize(summary) {
		log.debug('summary',summary);
	}

	return {
		getInputData: getInputData,
		map: map,
		reduce:reduce,
		summarize: summarize
	};
});
