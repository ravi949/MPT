/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/record', 
        'N/search',
        'N/redirect',
        'N/runtime',
        './iTPM_Module.js'
        ],
		/**
		 * @param {record} record
		 * @param {search} search
		 */
		function(record, search,redirect,runtime,itpm) {

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

			if(request.method == 'GET'){

				var transRec = record.load({
					type: request.parameters.type, 
					id: request.parameters.id,
					isDynamic: true
				});
				var subsidairyId = (itpm.subsidiariesEnabled())?transRec.getValue('subsidiary'):undefined;
//				log.debug('Usage: After Loading TranRec ', runtime.getCurrentScript().getRemainingUsage());
				log.debug('request.transRec.type',runtime.getCurrentScript().getRemainingUsage());
				var prefDatesType = itpm.getPrefrenceValues(subsidairyId)['prefDiscountDate'];
				log.debug('Usage: After getPrefDiscountDateValue ', runtime.getCurrentScript().getRemainingUsage());
				var tranCustomer = transRec.getValue('entity');
				var trandate = transRec.getText('trandate');  
				var tranId = transRec.getText({fieldId : 'tranid'});
				var itemCount = transRec.getLineCount({
					sublistId: 'item'
				});
//				log.debug('Item Count', itemCount);

				for(var i=0; i<itemCount; i++){
					log.debug('Usage: For loop  '+i, runtime.getCurrentScript().getRemainingUsage());
					//Fetching transaction line item values
					var lineItem = transRec.getSublistValue({
						sublistId : 'item',
						fieldId   : 'item',
						line      : i
					});
					
					//skipping the discount item from the list
					var itemType = search.lookupFields({
						type:search.Type.ITEM,
						id:lineItem,
						columns:['recordtype']
					}).recordtype;
					
					if(itemType == "discountitem"){
						continue;
					}
					
					var quantity = transRec.getSublistValue({
						sublistId : 'item',
						fieldId   : 'quantity',
						line      : i
					});
					var priceLevel = transRec.getSublistValue({
						sublistId : 'item',
						fieldId   : 'price',
						line      : i
					});
					var lineUnit = transRec.getSublistValue({
						sublistId : 'item',
						fieldId   : 'units',
						line      : i
					});
					var lineRate = transRec.getSublistValue({
						sublistId : 'item',
						fieldId   : 'rate',
						line      : i
					});
					var lineAmount = transRec.getSublistValue({
						sublistId : 'item',
						fieldId   : 'amount',
						line      : i
					});

					var unitsList = itpm.getItemUnits(lineItem).unitArray;
//					log.debug('Usage: After Unit List', runtime.getCurrentScript().getRemainingUsage());
//					log.debug('unitsList', unitsList);
					var transconversionRate = unitsList.filter(function(e){return e.id == lineUnit})[0].conversionRate;
//					log.debug('Usage: transconversionRate', runtime.getCurrentScript().getRemainingUsage());
//					log.debug('transconversionRate', transconversionRate);
					//Fetching allowances related to the each item which is coming from Transaction Line
					var itemResults = getAllowanceItems(prefDatesType, lineItem, tranCustomer, trandate);
//					log.debug('Usage: After getAllowanceItems ', runtime.getCurrentScript().getRemainingUsage());
					var j = 0;
					var tranItemFinalRate = 0;
					var tranItemFinalRatePer = 0;
					//Adding the search results to the UI on sublist
					itemResults.each(function(result){
						log.debug('Usage: For each  '+i, runtime.getCurrentScript().getRemainingUsage());
//						log.debug('result: '+i,result);
						var allowanceType = result.getValue({name:'custrecord_itpm_all_type'});
						var allowanceUnitId = result.getValue('custrecord_itpm_all_uom');
						var allowancePercentperuom =  parseFloat(result.getValue('custrecord_itpm_all_percentperuom'));
						var allowanceRateperuom = result.getValue({name:'custrecord_itpm_all_rateperuom'});
						if(allowanceType == 1){     					
							var allConversionRate = unitsList.filter(function(e){return e.id == allowanceUnitId})[0].conversionRate;
//							log.debug('Usage:  allConversionRate', runtime.getCurrentScript().getRemainingUsage());
//							log.debug('allConversionRate', allConversionRate);
							tranItemFinalRate = tranItemFinalRate + parseFloat(allowanceRateperuom * transconversionRate/allConversionRate);
						}else{
							tranItemFinalRatePer = tranItemFinalRatePer + allowancePercentperuom;
						}
//						log.debug('tranItemFinalRate', tranItemFinalRate);
//						log.debug('tranItemFinalRatePer',tranItemFinalRatePer);
//						log.debug('Allowance Id ',result.getValue({name:'id'}));
						//Validating the Discount log custom record whether exist or not for the current transaction internalid
						var discountRecExists = itpm.validateDiscountLog(context.request.parameters.id, lineItem, i);
//						log.debug('Usage: After discountRecExists ', runtime.getCurrentScript().getRemainingUsage());
						var discountLogLineValues = {
								'sline_log' : discountRecExists['discountId'],
								'name' : tranId+'_iTPM_DLL_'+(i+1)+'_'+(j+1),
								'sline_allpromotion' : result.getValue({name:'internalid', join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL'}),
								'sline_allowance' : result.getValue({name:'id'}),
//								'sline_allid' : result.getValue({name:'id'}),
								'sline_allmop' : result.getValue({name:'custrecord_itpm_all_mop'}),
								'sline_alltype' : allowanceType,
								'sline_allunit' : allowanceUnitId,
								'sline_allpercent' : allowancePercentperuom,
								'sline_allrate' : allowanceRateperuom,
								'sline_calcrate' : (allowanceType == 1)?(allowanceRateperuom * transconversionRate/allConversionRate):((allowancePercentperuom/100) * lineRate),
//										'sline_item' : lineItem,
//										'sline_tranqty' : quantity,
//										'sline_tranunit' : lineUnit,
//										'sline_tranrate' : lineRate,
//										'sline_tranamt' : lineAmount
						};
						//If it exists, then add record lines to the record(If the sales discount log record exists, 
						//it means that the line has Net Bill allowances applied)
						if(discountRecExists['recordExists'])
						{
//							log.debug('IF: discountRec Exists',discountRecExists['recordExists']+' & '+discountRecExists['discountId']);
							//Adding lines to the existed Discount Log record
							itpm.createDiscountLogLine(discountRecExists['discountId'], discountLogLineValues);
//							log.debug('Usage: After createDiscountLogLine if', runtime.getCurrentScript().getRemainingUsage());
						}
						//If not exists, then create a sales discount log (custom record). Populate the fields. 
						//Then create the sales discount line records (custom record, child of sales discount log)
						else
						{
//							log.debug('ELSE: discountRec NOT Exists',discountRecExists['recordExists']);
							var discountLogValues = {
									'name' : tranId+'_iTPM_DL_'+(i+1),
									'slog_customer'      : tranCustomer,
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
//							log.debug('Usage: After discountLogRecInternalID else', runtime.getCurrentScript().getRemainingUsage());
							//Adding Discount Log Lines
							itpm.createDiscountLogLine(discountLogRecInternalID, discountLogLineValues);
//							log.debug('Usage: After createDiscountLogLine else', runtime.getCurrentScript().getRemainingUsage());
						}    					
						j++;
						log.debug('Usage: For each END  '+i, runtime.getCurrentScript().getRemainingUsage());
						return true; 
					});

//					log.debug('lineRate', lineRate );
					var itemDiscRate = lineRate - tranItemFinalRate - ((tranItemFinalRatePer/100) * lineRate);
//					log.debug('itemDiscRate', itemDiscRate );
					var line = transRec.selectLine({
						sublistId: 'item',
						line: i
					});
					transRec.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'rate',
						value: itemDiscRate
					});
					transRec.commitLine({
						sublistId: 'item'
					});
//					log.debug('Usage: transRec.commitLine', runtime.getCurrentScript().getRemainingUsage());
					log.debug('Usage: For loop  END '+i, runtime.getCurrentScript().getRemainingUsage());
				}

//				log.debug('Final Available Usage:' + i, runtime.getCurrentScript().getRemainingUsage());
				transRec.save({
					enableSourcing: true,
					ignoreMandatoryFields: true
				});
				log.debug('Usage Final: After transRec.save ', runtime.getCurrentScript().getRemainingUsage());
				/*	redirect.toRecord({
        		    type :request.parameters.type,
        		    id : request.parameters.id
        		});*/
				redirect.toSuitelet({
					scriptId: 'customscript_itpm_oi_processing' ,
					deploymentId: 'customdeploy_itpm_oi_processing',
					parameters: {'id':transRec.id,'type':transRec.type} 
				});
			}
		}catch(ex){
			log.error(ex.name ,ex.message);
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
		//Create hierarchical customers array		
		var subCustIds = itpm.getParentCustomers(customer);
		log.debug('Realted Customers',subCustIds);
		var tranFilters = [
			['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_status','anyof','3'], //here 3 means status is Approved
			'AND', 
			['custrecord_itpm_all_mop','anyof','2'], //here 2 means Method of Payment is  Net Bill
			'AND', 
			['custrecord_itpm_all_item','anyof',item], //item from transaction line
			'AND', 
			['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_customer','anyof',subCustIds] //customer from transaction
			];

		//Adding the filters to the tranFilters array
		switch(prefDatesType){
		case '1':
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate]); 
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]);
			break;
		case '2':
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate]);
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]);
			break;
		case '3':
			tranFilters.push('AND',[
				[['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]],
				'AND',
				[['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]]
				]);
			break;
		case '4':
			tranFilters.push('AND',[
				[['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]],
				'OR',
				[['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]]
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
			type: 'customrecord_itpm_promoallowance',
			filters: tranFilters,
			columns: tranColumns
		});    	
		return searchObj.run();
	}
	
	return {
		onRequest: onRequest
	};

});
