/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define([
        'N/search',
        'N/record',
        'N/runtime',
        './iTPM_Module'
        ],

function(search, record, runtime, itpm) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
    	try{
    		return search.create({
    			type	: search.Type.TRANSACTION,
    			columns	: [
    			       	   'internalid',
    			       	   'type',
    			       	   'entity',
    			       	   'tranid',
    			       	   'trandate',
    			       	   'line',
    			       	   'item',
    			       	   'quantity',
    			       	   'pricelevel',
    			       	   'rate',
    			       	   'amount',
    			       	   'item.saleunit'
    			       	   ],
    			filters	: [
    			       	   ["type","anyof","SalesOrd","CustInvc"], 
    			       	   	"AND",
    			       	   ["taxline","is","F"], 
   			       	   		"AND",
   			       	   	   ["item","noneof","@NONE@"], 
    			       	   	"AND", 
    			       	   ["custbody_itpm_applydiscounts","is","T"]//, 
   			       	   		//"AND", 
   			       	   	  // ["internalid","is","18037"]
    			       	  ]
    		});
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	try{
    		var mapData = JSON.parse(context.value).values;
    		log.debug('mapData', JSON.parse(context.value));
    		
    		var recordtype = JSON.parse(context.value).recordType;
    		var tranInternlaid = mapData.internalid.value;
    		var tranCustomer = mapData.entity.value;
			var trandate = mapData.trandate;  
			var tranId = mapData.tranid;
			var line = mapData.line;
    		var lineItem = mapData.item.value;
    		var quantity = mapData.quantity;
    		var priceLevel = mapData.pricelevel.value;
    		var lineUnit = mapData['saleunit.item'].value;
    		var lineRate = mapData.rate;
    		var lineAmount = mapData.amount;
    		
    		log.audit('Usage: START', runtime.getCurrentScript().getRemainingUsage());
    		var prefData = getPreferencesData();
			var prefDatesType = prefData.discountdates;
			var prefDiscountItem = prefData.discountitem;
			var unitsList = itpm.getItemUnits(lineItem).unitArray;
    		log.debug('unitsList', unitsList);
			var transconversionRate = unitsList.filter(function(e){return e.id == lineUnit})[0].conversionRate;
			log.debug('transconversionRate', transconversionRate);
			
			//Processing both Net-Bill and Off-Invoice
			var nbItemDiscRate = nbProcess(tranInternlaid, tranId, unitsList, transconversionRate, line, lineItem, tranCustomer, trandate, lineRate, quantity, priceLevel, lineUnit, lineAmount);
			log.debug('nbItemDiscRate', nbItemDiscRate);
			var oiDiscountItems = oiProcess(tranInternlaid, tranId, unitsList, prefDatesType, transconversionRate, line, lineItem, tranCustomer, trandate, nbItemDiscRate, quantity, priceLevel, lineUnit, parseFloat(nbItemDiscRate*quantity));
			log.debug('oiDiscountItems', oiDiscountItems);
			log.audit('Usage: END', runtime.getCurrentScript().getRemainingUsage());
			
    		context.write({
                key: {
                	id 		: tranInternlaid,
                	type 	: recordtype
                },
                value: {
                	r_item 				: lineItem,
                	r_nbItemDiscRate 	: (parseFloat(lineAmount) == parseFloat(nbItemDiscRate*quantity))?0:parseFloat(nbItemDiscRate),
                	r_oiDiscountItems	: (oiDiscountItems.length == 0)?0:oiDiscountItems,
                	r_discountItem		: prefDiscountItem,
                	r_line				: parseInt(line)
                }
            });
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
    	try{
    		var reducekeydata = JSON.parse(context.key);
    		log.audit('reducekeydata',reducekeydata);
    		var reducevalues = context.values;
    		log.debug('reducevalues',reducevalues);
    		
    		log.audit('Usage: START', runtime.getCurrentScript().getRemainingUsage());
    		var tranRecObj = record.load({
    			type: reducekeydata.type,
    			id	: reducekeydata.id,
    			isDynamic : true
    		});
    		
    		var itemCount = tranRecObj.getLineCount({
				sublistId: 'item'
			});
    		
    		//Sales Order Lines loop started
    		for(var i=(itemCount-1); i>=0; i--){
    			var lineItem = tranRecObj.getSublistValue({
					sublistId : 'item',
					fieldId   : 'item',
					line      : i
				});
    			
    			//Checking every line in the REDUCE data
    			reducevalues.forEach(function(result){
        			result = JSON.parse(result);
        			if(lineItem == result.r_item && i+1 == result.r_line){
        				log.debug('result.r_nbItemDiscRate', result.r_nbItemDiscRate);
        				log.debug('result.r_oiDiscountItems.length', result.r_oiDiscountItems.length);
        				
        				if(result.r_nbItemDiscRate && result.r_oiDiscountItems.length){
        					log.audit('NB OI: r_line & r_item', result.r_line+' & '+result.r_item);
        					//CHANGING NetBill Discount on item line directly
        					tranRecObj.selectLine({
        						sublistId: 'item',
        						line: i
        					});
        					tranRecObj.setCurrentSublistValue({
        						sublistId: 'item',
        						fieldId: 'rate',
        						value: result.r_nbItemDiscRate
        					});
        					tranRecObj.commitLine({
        						sublistId: 'item'
        					});
        					
        					//ADDING New Discount Item line for OffInvoice Discount
        					for(var iTemp=0; iTemp<result.r_oiDiscountItems.length; iTemp++){
        						tranRecObj.insertLine({
        							sublistId: "item",
        							line: (i+1)+iTemp
        						});
        						tranRecObj.setCurrentSublistValue({
        							sublistId: "item",
        							fieldId: "item",
        							value: result.r_discountItem
        						});
            					tranRecObj.setCurrentSublistValue({
        							sublistId: "item",
        							fieldId: "description",
        							value: result.r_oiDiscountItems[iTemp].memo
        						});
            					tranRecObj.setCurrentSublistValue({
        							sublistId: "item",
        							fieldId: "price",
        							value: "-1"
        						});
            					tranRecObj.setCurrentSublistValue({
        							sublistId: "item",
        							fieldId: "rate",
        							value: -(result.r_oiDiscountItems[iTemp].tranItemFinalAmount)
        						});
            					tranRecObj.commitLine({
        							sublistId:"item"
        						});
        					}
        				}else if(result.r_nbItemDiscRate){
        					log.audit('NB: r_line & r_item', result.r_line+' & '+result.r_item);
        					//CHANGING NetBill Discount on item line directly
        					tranRecObj.selectLine({
        						sublistId: 'item',
        						line: i
        					});
        					tranRecObj.setCurrentSublistValue({
        						sublistId: 'item',
        						fieldId: 'rate',
        						value: result.r_nbItemDiscRate
        					});
        					tranRecObj.commitLine({
        						sublistId: 'item'
        					});
        				}else if(result.r_oiDiscountItems.length){
        					log.audit('OI: r_line & r_item', result.r_line+' & '+result.r_item);
        					//ADDING New Discount Item line for OffInvoice Discount
    						for(var jTemp=0; jTemp<result.r_oiDiscountItems.length; jTemp++){
        						tranRecObj.insertLine({
        							sublistId: "item",
        							line: (i+1)+jTemp
        						});
            					tranRecObj.setCurrentSublistValue({
        							sublistId: "item",
        							fieldId: "item",
        							value: result.r_discountItem
        						});
            					tranRecObj.setCurrentSublistValue({
        							sublistId: "item",
        							fieldId: "description",
        							value: result.r_oiDiscountItems[jTemp].memo
        						});
            					tranRecObj.setCurrentSublistValue({
        							sublistId: "item",
        							fieldId: "price",
        							value: "-1"
        						});
            					tranRecObj.setCurrentSublistValue({
        							sublistId: "item",
        							fieldId: "rate",
        							value: -(result.r_oiDiscountItems[jTemp].tranItemFinalAmount)
        						});
            					tranRecObj.commitLine({
        							sublistId:"item"
        						});
        					}
    					}
					}
    				
            		return true;
            	});
    		}
    		
    		tranRecObj.setValue({
				fieldId: "custbody_itpm_applydiscounts",
				value: false
			});
    		tranRecObj.save({
				enableSourcing: true,
				ignoreMandatoryFields: true
			});
    		log.audit('Usage: END', runtime.getCurrentScript().getRemainingUsage());
    	}catch(e){
    		log.error(e.name, e.messsage);
    	}
    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    /**
	 * @param {String} tranInternalid
	 * 
	 * @return {Array} Validation
	 */
	function validateDiscountLogRecord(tranInternalid, itemID, line){
		try{
			var validation = [];
			var searchObj = search.create({
				type: 'customrecord_itpm_discountlog',
				filters : [["custrecord_itpm_slog_transaction", "anyof", tranInternalid],
				           "AND", 
				           ["custrecord_itpm_slog_linenumber","is",line],
				           "AND",
				           ["custrecord_itpm_slog_lineitem","anyof",itemID]],
				           columns : [{name: 'name'},{name: 'internalid'}]
			});

			var searchResults = searchObj.run().getRange({
				start: 0,
				end  : 999
			});

			if(searchResults.length == 0){
				validation['recordExists'] = false;

			}
			else{
				validation['recordExists'] = true;
				validation['discountId'] = searchResults[0].getValue('internalid');
			}
			return validation;
		}catch(e){
			log.error(e.name, e.message);
		}
	}
	
	/**
	 * @param {Object} unitsList
	 * @param {Numeric} line
	 * @param {String} lineItem
	 * @param {String} tranCustomer
	 * @param {String} trandate
	 */
	function nbProcess(tranID, tranId, unitsList, transconversionRate, line, lineItem, tranCustomer, trandate, lineRate, quantity, priceLevel, lineUnit, lineAmount){
		try{
			//Fetching allowances related to the each item which is coming from Transaction Line
			var itemResults = getAllowanceItems(1, lineItem, tranCustomer, trandate, 2);
			var j = 0;
			var tranItemFinalRate = 0;
			var tranItemFinalRatePer = 0;
			
			itemResults.each(function(result){
				var allowanceType = result.getValue({name:'custrecord_itpm_all_type'});
				var allowanceUnitId = result.getValue('custrecord_itpm_all_uom');
				var allowancePercentperuom =  parseFloat(result.getValue('custrecord_itpm_all_percentperuom'));
				var allowanceRateperuom = result.getValue({name:'custrecord_itpm_all_rateperuom'});
				
				if(allowanceType == 1){     					
					var allConversionRate = unitsList.filter(function(e){return e.id == allowanceUnitId})[0].conversionRate;
					tranItemFinalRate = tranItemFinalRate + parseFloat(allowanceRateperuom * transconversionRate/allConversionRate);
				}else{
					tranItemFinalRatePer = tranItemFinalRatePer + allowancePercentperuom;
				}
				
				//Validating the Discount log custom record whether exist or not for the current transaction internalid
				var discountRecExists = validateDiscountLogRecord(tranID, lineItem, parseInt(line));
								
				var discountLogLineValues = {
						'sline_log' : discountRecExists['discountId'],
						'name' : tranId+'_iTPM_DLL_'+(parseInt(line))+'_'+(j+1),
						'sline_allpromotion' : result.getValue({name:'internalid', join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL'}),
						'sline_allowance' : result.getValue({name:'id'}),
						'sline_allmop' : result.getValue({name:'custrecord_itpm_all_mop'}),
						'sline_alltype' : allowanceType,
						'sline_allunit' : allowanceUnitId,
						'sline_allpercent' : allowancePercentperuom,
						'sline_allrate' : allowanceRateperuom,
						'sline_calcrate' : (allowanceType == 1)?(allowanceRateperuom * transconversionRate/allConversionRate):((allowancePercentperuom/100) * lineRate)
				};
				log.debug('NB: discountLogLineValues', discountLogLineValues);
				//If it exists, then add record lines to the record(If the sales discount log record exists, 
				//it means that the line has Net Bill allowances applied)
				if(discountRecExists['recordExists'])
				{
					addDiscountLogLine(discountRecExists['discountId'], discountLogLineValues);
				}
				//If not exists, then create a sales discount log (custom record). Populate the fields. 
				//Then create the sales discount line records (custom record, child of sales discount log)
				else
				{
					var discountLogValues = {
							'name' : tranId+'_iTPM_DL_'+(parseInt(line)),
							'slog_customer'      : tranCustomer,
							'slog_transaction'   : tranID,
							'slog_linenumber'    : (parseInt(line)),
							'slog_lineitem'      : lineItem,
							'slog_linequantity'  : quantity,
							'slog_linepricelevel': priceLevel,
							'slog_lineunit'      : lineUnit,
							'slog_linerate'      : lineRate,
							'slog_lineamount'    : lineAmount
					};
					log.debug('NB: DL Values', discountLogValues);
					//Creating Discount Log record
					var discountLogRecInternalID = addDiscountLog(discountLogValues);
					//Adding Discount Log Lines
					addDiscountLogLine(discountLogRecInternalID, discountLogLineValues);
				}    					
				j++;
				return true; 
			});
			
			return lineRate - tranItemFinalRate - ((tranItemFinalRatePer/100) * lineRate);
		}catch(e){
			log.error(e.name, e.message);
		}
	}
	
	/**
	 * 
	 */
	function oiProcess(tranID, tranId, unitsList, prefDatesType, transconversionRate, line, lineItem, customer, trandate, lineRate, quantity, priceLevel, lineUnit, lineAmount){
		try{
			//Fetching allowances related to the each item which is coming from Transaction Line
			var perItemResults = getAllowanceItems(1, lineItem, customer, trandate, 3);
			var j = 0;
			var tranItemFinalRate = 0;
			var tranItemFinalAmount = 0;
			var oiProcessData = [];
			
			perItemResults.each(function(result){
				//Calculating Conversion rate per allowance
				var allowanceType = result.getValue({name:'custrecord_itpm_all_type'});
				var allowanceUnitId = result.getValue('custrecord_itpm_all_uom');
				var allowancePercentperuom =  parseFloat(result.getValue('custrecord_itpm_all_percentperuom'));
				var allowanceRateperuom = result.getValue({name:'custrecord_itpm_all_rateperuom'});
				

				if(allowanceType == 1){
					var allConversionRate = unitsList.filter(function(e){return e.id == allowanceUnitId})[0].conversionRate;
					tranItemFinalRate = parseFloat(allowanceRateperuom * transconversionRate/allConversionRate);
					tranItemFinalAmount = tranItemFinalRate * quantity;
					log.debug('tranItemFinalAmount', tranItemFinalAmount);
				}else{
					tranItemFinalRate = (allowancePercentperuom/100) * lineRate;
					tranItemFinalAmount = tranItemFinalRate * quantity;
					log.debug('tranItemFinalAmount', tranItemFinalAmount);
				}
				log.debug('tranItemFinalRate', tranItemFinalRate);

				//Validating the Discount log custom record whether exist or not for the current transaction internalid
				var discountRecExists = validateDiscountLogRecord(tranID, lineItem, parseInt(line));
				
				var discountLogLineValues = {
						'sline_log' : discountRecExists['discountId'],
						'name' : tranId+'_iTPM_DLL_'+(parseInt(line))+'_'+(j+1),
						'sline_allpromotion' : result.getValue({name:'internalid', join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL'}),
						'sline_allowance' : result.getValue({name:'id'}),
						'sline_allmop' : result.getValue({name:'custrecord_itpm_all_mop'}),
						'sline_alltype' : allowanceType,
						'sline_allunit' : allowanceUnitId,
						'sline_allpercent' : allowancePercentperuom,
						'sline_allrate' : allowanceRateperuom,
						'sline_calcrate' : tranItemFinalRate.toFixed(4)
				};

				//If it exists, then add record lines to the record(If the sales discount log record exists, 
				//it means that the line has Net Bill allowances applied)
				if(discountRecExists['recordExists'])
				{
					//Adding lines to the existed Discount Log record
					//log.debug('IF: discountRec Exists',discountRecExists['recordExists']+' & '+discountRecExists['discountId']);
					addDiscountLogLine(discountRecExists['discountId'], discountLogLineValues);
				}
				//If not exists, then create a sales discount log (custom record). Populate the fields. 
				//Then create the sales discount line records (custom record, child of sales discount log)
				else
				{
					log.debug('ELSE: discountRec NOT Exists',discountRecExists['recordExists']);
					var discountLogValues = {
							'name' : tranId+'_iTPM_DL_'+(parseInt(line)),
							'slog_customer'      : customer,
							'slog_transaction'   : tranID,
							'slog_linenumber'    : (parseInt(line)),
							'slog_lineitem'      : lineItem,
							'slog_linequantity'  : quantity,
							'slog_linepricelevel': priceLevel,
							'slog_lineunit'      : lineUnit,
							'slog_linerate'      : lineRate,
							'slog_lineamount'    : lineAmount
					};
					//Creating Discount Log record
					var discountLogRecInternalID = addDiscountLog(discountLogValues);
					//Adding Discount Log Lines
					addDiscountLogLine(discountLogRecInternalID, discountLogLineValues);
				}

				oiProcessData.push({
					'tranItemFinalAmount' : tranItemFinalAmount.toFixed(4),
					'memo' : 'Off Invoice discount for Item '+result.getText({name:'custrecord_itpm_all_item'})+' from Promotion '+result.getValue({name:'name', join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL'})
				});
				j++;
				return true;
			});
			
			return oiProcessData;
		}catch(e){
			log.error(e.name, e.message);
		}
	}
	
	/**
	 * return {Object} prefRecData
	 */
	function getPreferencesData(){
		try{
			var searchObj = search.create({
				type: 'customrecord_itpm_preferences',
				columns : [{name: 'internalid'}]
			});

			var searchResults = searchObj.run().getRange({
				start: 0,
				end  : 2
			});

			var loadedRec = record.load({
				type:'customrecord_itpm_preferences',	 
				id:searchResults[0].getValue('internalid')
			});

			var prefRecData = {
					'discountdates' : loadedRec.getValue({fieldId: 'custrecord_itpm_pref_discountdates'}),
					'discountitem' : loadedRec.getValue({fieldId: 'custrecord_itpm_pref_discountitem'})
			};

			return prefRecData;
		}catch(e){
			log.error(e.name, e.message);
		}
	}
	
	/**
	 * @param {Object} discountLogValues
	 * 
	 * @return {String} discountLogRecID
	 */
	function addDiscountLog(discountLogValues){
		try{
			var discountLogRecObj = record.create({
				type: 'customrecord_itpm_discountlog',
				isDynamic: true
			});

			discountLogRecObj.setValue({
				fieldId: 'name',
				value: discountLogValues.name,
				ignoreFieldChange: true
			});
			discountLogRecObj.setValue({
				fieldId: 'custrecord_itpm_slog_customer',
				value: discountLogValues.slog_customer,
				ignoreFieldChange: true
			});
			discountLogRecObj.setValue({
				fieldId: 'custrecord_itpm_slog_transaction',
				value: discountLogValues.slog_transaction,
				ignoreFieldChange: true
			});
			discountLogRecObj.setValue({
				fieldId: 'custrecord_itpm_slog_linenumber',
				value: discountLogValues.slog_linenumber,
				ignoreFieldChange: true
			});
			discountLogRecObj.setValue({
				fieldId: 'custrecord_itpm_slog_lineitem',
				value: discountLogValues.slog_lineitem,
				ignoreFieldChange: true
			});
			discountLogRecObj.setValue({
				fieldId: 'custrecord_itpm_slog_linequantity',
				value: discountLogValues.slog_linequantity,
				ignoreFieldChange: true
			});
			discountLogRecObj.setValue({
				fieldId: 'custrecord_itpm_slog_linepricelevel',
				value: discountLogValues.slog_linepricelevel,
				ignoreFieldChange: true
			});
			discountLogRecObj.setValue({
				fieldId: 'custrecord_itpm_slog_lineunit',
				value: discountLogValues.slog_lineunit,
				ignoreFieldChange: true
			});
			discountLogRecObj.setValue({
				fieldId: 'custrecord_itpm_slog_linerate',
				value: discountLogValues.slog_linerate,
				ignoreFieldChange: true
			});
			discountLogRecObj.setValue({
				fieldId: 'custrecord_itpm_slog_lineamount',
				value: discountLogValues.slog_lineamount,
				ignoreFieldChange: true
			});

			var discountLogRecID = discountLogRecObj.save({
				enableSourcing: true,
				ignoreMandatoryFields: true
			});
			return discountLogRecID;
		}catch(e){
			log.error(e.name, e.message);
		}
	}


	/**
	 * @param {String} recID
	 * @param {Object} discountLogLineValues
	 * 
	 */
	function addDiscountLogLine(recID, discountLogLineValues){
		try{
			var discountLogLineRecObj = record.create({
				type: 'customrecord_itpm_discountlogline',
				isDynamic: true
			});

			discountLogLineRecObj.setValue({
				fieldId: 'custrecord_itpm_sline_log',
				value: recID,
				ignoreFieldChange: true
			});
			discountLogLineRecObj.setValue({
				fieldId: 'name',
				value: discountLogLineValues.name,
				ignoreFieldChange: true
			});
			discountLogLineRecObj.setValue({
				fieldId: 'custrecord_itpm_sline_allpromotion',
				value: discountLogLineValues.sline_allpromotion,
				ignoreFieldChange: true
			});
			discountLogLineRecObj.setValue({
				fieldId: 'custrecord_itpm_sline_allowance',
				value: discountLogLineValues.sline_allowance,
				ignoreFieldChange: true
			});
			discountLogLineRecObj.setValue({
				fieldId: 'custrecord_itpm_sline_allmop',
				value: discountLogLineValues.sline_allmop,
				ignoreFieldChange: true
			});
			discountLogLineRecObj.setValue({
				fieldId: 'custrecord_itpm_sline_alltype',
				value: discountLogLineValues.sline_alltype,
				ignoreFieldChange: true
			});
			discountLogLineRecObj.setValue({
				fieldId: 'custrecord_itpm_sline_allunit',
				value: discountLogLineValues.sline_allunit,
				ignoreFieldChange: true
			});
			discountLogLineRecObj.setValue({
				fieldId: 'custrecord_itpm_sline_allpercent',
				value: discountLogLineValues.sline_allpercent,
				ignoreFieldChange: true
			});
			discountLogLineRecObj.setValue({
				fieldId: 'custrecord_itpm_sline_allrate',
				value: discountLogLineValues.sline_allrate,
				ignoreFieldChange: true
			});
			discountLogLineRecObj.setValue({
				fieldId: 'custrecord_itpm_sline_calcrate',
				value: discountLogLineValues.sline_calcrate,
				ignoreFieldChange: true
			});

			discountLogLineRecObj.save({
				enableSourcing: true,
				ignoreMandatoryFields: true
			});
		}catch(e){
			log.error(e.name, e.message);
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
	function getAllowanceItems(prefDatesType, item, customer, trandate, mop){
		try{
			var tranFilters = [
			                   ['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_status','anyof','3'], //here 3 means status is Approved
			                   'AND', 
			                   ['custrecord_itpm_all_mop','anyof',mop], //here 2 means MOP is  NB, 3 means OI
			                   'AND', 
			                   ['custrecord_itpm_all_item','anyof',item], //item from transaction line
			                   'AND', 
			                   ['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_customer','anyof',customer] //customer from transaction
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
		}catch(e){
			log.error(e.name, e.message);
		}
	}
	
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
