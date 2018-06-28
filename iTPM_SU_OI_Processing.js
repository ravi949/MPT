/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/search',
		'N/runtime',
		'N/record',
		'N/redirect',
		'./iTPM_Module.js'
	 ],

	function(search, runtime, record, redirect, itpm) {

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
			if(context.request.method == 'GET'){
				log.debug('Usage: Start', runtime.getCurrentScript().getRemainingUsage());
				
				//transaction Record: Loading the transaction type record with the ID coming from the parameters
				var tranRecObj = record.load({
					type: context.request.parameters.type, 
					id: context.request.parameters.id,
					isDynamic: true
				});
				var subsidairyId = (itpm.subsidiariesEnabled())?tranRecObj.getValue('subsidiary'):undefined;
				//Getting Preference Data
				var prefData = itpm.getPrefrenceValues(subsidairyId);
				var prefDatesType = prefData['prefDiscountDate'];
				var prefDiscountItem = prefData['dicountItem'];
				log.error('prefDatesType',prefDatesType);
				log.error('prefDiscountItem',prefDiscountItem);
				log.debug('Usage: After PrefData', runtime.getCurrentScript().getRemainingUsage());
				log.debug('Usage: After Loading TranRec 1st', runtime.getCurrentScript().getRemainingUsage());
//				log.debug('Usage: After Loading TranRec 2nd', runtime.getCurrentScript().getRemainingUsage());

				var trandate = tranRecObj.getText({fieldId : 'trandate'});
				var tranId = tranRecObj.getText({fieldId : 'tranid'});
				var customer = tranRecObj.getValue({fieldId : 'entity'});
				var itemCount = tranRecObj.getLineCount({
					sublistId: 'item'
				});
				
				for(var i=itemCount-1; i>=0; i--){
					//Fetching transaction line item values
					var lineItem = tranRecObj.getSublistValue({
						sublistId : 'item',
						fieldId   : 'item',
						line      : i
					});

					var quantity = tranRecObj.getSublistValue({
						sublistId : 'item',
						fieldId   : 'quantity',
						line      : i
					});

					var priceLevel = tranRecObj.getSublistValue({
						sublistId : 'item',
						fieldId   : 'price',
						line      : i
					});

					var lineUnit = tranRecObj.getSublistValue({
						sublistId : 'item',
						fieldId   : 'units',
						line      : i
					});

					var lineRate = tranRecObj.getSublistValue({
						sublistId : 'item',
						fieldId   : 'rate',
						line      : i
					});

					var lineAmount = tranRecObj.getSublistValue({
						sublistId : 'item',
						fieldId   : 'amount',
						line      : i
					});

					//Calculating Conversion
					var unitsList = itpm.getItemUnits(lineItem).unitArray;
					log.debug('Usage: After Unit List', runtime.getCurrentScript().getRemainingUsage());
//					log.debug('unitsList', unitsList);
					var transconversionRate = unitsList.filter(function(e){return e.id == lineUnit})[0].conversionRate;
//					log.debug('transconversionRate', transconversionRate);

					//Fetching allowances related to the each item which is coming from Transaction Line
					var perItemResults = getAllowanceItems(prefDatesType, lineItem, customer, trandate);
					var j = 0;

					perItemResults.each(function(result){
						//Calculating Conversion rate per allowance
						var allowanceType = result.getValue({name:'custrecord_itpm_all_type'});
						var allowanceUnitId = result.getValue('custrecord_itpm_all_uom');
						var allowancePercentperuom =  parseFloat(result.getValue('custrecord_itpm_all_percentperuom'));
						var allowanceRateperuom = result.getValue({name:'custrecord_itpm_all_rateperuom'});
						var tranItemFinalRate = 0;
						var tranItemFinalAmount = 0;

						if(allowanceType == 1){
							var allConversionRate = unitsList.filter(function(e){return e.id == allowanceUnitId})[0].conversionRate;
//							log.debug('Usage: After allConversionRate', runtime.getCurrentScript().getRemainingUsage());
//							log.debug('allConversionRate', allConversionRate);
							tranItemFinalRate = parseFloat(allowanceRateperuom * transconversionRate/allConversionRate);
							tranItemFinalAmount = tranItemFinalRate * quantity;
//							log.debug('tranItemFinalAmount', tranItemFinalAmount);
						}else{
							tranItemFinalRate = (allowancePercentperuom/100) * lineRate;
							tranItemFinalAmount = tranItemFinalRate * quantity;
//							log.debug('tranItemFinalAmount', tranItemFinalAmount);
						}
//						log.debug('tranItemFinalRate', tranItemFinalRate);

						//Validating the Discount log custom record whether exist or not for the current transaction internalid
						var discountRecExists = itpm.validateDiscountLog(context.request.parameters.id, lineItem, i);
						log.debug('Usage: Validation(discountRecExists)', runtime.getCurrentScript().getRemainingUsage());

						var discountLogLineValues = {
								'sline_log' : discountRecExists['discountId'],
								'name' : tranId+'_iTPM_DLL_'+(i+1)+'_'+(j+1),
								'sline_allpromotion' : result.getValue({name:'internalid', join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL'}),
								'sline_allowance' : result.getValue({name:'id'}),
								//'sline_allid' : result.getValue({name:'id'}),
								'sline_allmop' : result.getValue({name:'custrecord_itpm_all_mop'}),
								'sline_alltype' : allowanceType,
								'sline_allunit' : allowanceUnitId,
								'sline_allpercent' : allowancePercentperuom,
								'sline_allrate' : allowanceRateperuom,
								'sline_calcrate' : tranItemFinalRate.toFixed(4),
								//'sline_item' : lineItem,
								//'sline_tranqty' : quantity,
								//'sline_tranunit' : lineUnit,
								//'sline_tranrate' : lineRate,
								//'sline_tranamt' : lineAmount
						};

						//If it exists, then add record lines to the record(If the sales discount log record exists, 
						//it means that the line has Net Bill allowances applied)
						if(discountRecExists['recordExists'])
						{
							//Adding lines to the existed Discount Log record
//							log.debug('IF: discountRec Exists',discountRecExists['recordExists']+' & '+discountRecExists['discountId']);
							itpm.createDiscountLogLine(discountRecExists['discountId'], discountLogLineValues);
						}
						//If not exists, then create a sales discount log (custom record). Populate the fields. 
						//Then create the sales discount line records (custom record, child of sales discount log)
						else
						{
//							log.debug('ELSE: discountRec NOT Exists',discountRecExists['recordExists']);
							var discountLogValues = {
									'name' : tranId+'_iTPM_DL_'+(i+1),
									'slog_customer'      : customer,
									'slog_transaction'   : context.request.parameters.id,
									'slog_linenumber'    : (i+1),
									'slog_lineitem'      : lineItem,
									'slog_linequantity'  : quantity,
									'slog_linepricelevel': priceLevel,
									'slog_lineunit'      : lineUnit,
									'slog_linerate'      : lineRate,
									'slog_lineamount'    : lineAmount
							};
							//Creating Discount Log record
							var discountLogRecInternalID = itpm.createDiscountLog(discountLogValues);

							//Adding Discount Log Lines
							itpm.createDiscountLogLine(discountLogRecInternalID, discountLogLineValues);
							log.debug('Usage: ELSE: DL Complete', runtime.getCurrentScript().getRemainingUsage());
						}

						//Adding Discount Line Items to the transaction line
						tranRecObj.insertLine({
							sublistId: "item",
							line: i+1
						});
						tranRecObj.setCurrentSublistValue({
							sublistId: "item",
							fieldId: "item",
							value: prefDiscountItem
						});
						tranRecObj.setCurrentSublistValue({
							sublistId: "item",
							fieldId: "description",
							value: 'Off Invoice discount for Item '+result.getText({name:'custrecord_itpm_all_item'})+' from Promotion '+result.getValue({name:'name', join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL'})
						});
						tranRecObj.setCurrentSublistValue({
							sublistId: "item",
							fieldId: "price",
							value: "-1"
						});
						tranRecObj.setCurrentSublistValue({
							sublistId: "item",
							fieldId: "rate",
							value: -tranItemFinalAmount.toFixed(4)
						});
//						newTranRecObj.setCurrentSublistValue({
//						sublistId: "item",
//						fieldId: "amount",
//						value: tranItemFinalAmount
//						});
						tranRecObj.commitLine({
							sublistId:"item"
						});

						j++;
						return true;
					});
					log.debug('Usage: End of For Loop: '+(i+1), runtime.getCurrentScript().getRemainingUsage());
				}
								

				tranRecObj.setValue({
					fieldId: "custbody_itpm_applydiscounts",
					value: false
				});
				tranRecObj.save({
					enableSourcing: true,
					ignoreMandatoryFields: true
				});
			
				redirect.toRecord({
					type : context.request.parameters.type,
					id   : context.request.parameters.id
				});
				log.debug('Usage: Final', runtime.getCurrentScript().getRemainingUsage());
			}
		}catch(e){
			log.error(e.anme, e.message);
		}
	}
	
	/**
	 * @param {String} prefDatesType
	 * @param {String} item
	 * @param {String} customer
	 * @param {String} trandate
	 * 
	 * @return {Array} searchResults (allowance)
	 */
	function getAllowanceItems(prefDatesType, item, customer, trandate){
		var tranFilters = [
			["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_status","anyof","3"], //here 3 means status is Approved
			"AND", 
			["custrecord_itpm_all_mop","anyof","3"], //here 3 means Method of Payment is  Off Invoice
			"AND", 
			["custrecord_itpm_all_item","anyof",item], //item from transaction line
			"AND", 
			["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_customer","anyof",customer] //customer from transaction
			];

		//Adding the filters to the tranFilters array
		switch(prefDatesType){
		case "1":
			tranFilters.push("AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart","onorbefore",trandate]); 
			tranFilters.push("AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend","onorafter",trandate]);
			break;
		case "2":
			tranFilters.push("AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart","onorbefore",trandate]);
			tranFilters.push("AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend","onorafter",trandate]);
			break;
		case "3":
			tranFilters.push("AND",[
				[["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart","onorbefore",trandate],"AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend","onorafter",trandate]],
				"AND",
				[["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart","onorbefore",trandate],"AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend","onorafter",trandate]]
				]);
			break;
		case "4":
			tranFilters.push("AND",[
				[["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart","onorbefore",trandate],"AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend","onorafter",trandate]],
				"OR",
				[["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart","onorbefore",trandate],"AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend","onorafter",trandate]]
				]);	
			break;
		}

		var tranColumns = [
			"custrecord_itpm_all_item",
			"CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.name",
			"CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.internalid",
			"id",
			"custrecord_itpm_all_mop",
			"custrecord_itpm_all_type",
			"custrecord_itpm_all_rateperuom",
			"custrecord_itpm_all_percentperuom",
			"custrecord_itpm_all_uom"
			];

		var searchObj = search.create({
			type: "customrecord_itpm_promoallowance",
			filters: tranFilters,
			columns: tranColumns
		});

		//log.debug('search Count', searchObj.runPaged().count);
		return searchObj.run();
	}

	return {
		onRequest: onRequest
	};

});
