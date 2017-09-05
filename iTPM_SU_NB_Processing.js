/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search','N/redirect','N/runtime','./iTPM_Module'],
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
//    			 log.debug('request.transRec.type',transRec);
    			 var prefDatesType = getPrefDiscountDateValue();
    			 var tranCustomer = transRec.getValue('entity');
    			 var trandate = transRec.getText('trandate');  
    			 var itemCount = transRec.getLineCount({
     			    sublistId: 'item'
     			});
//     			log.debug('Item Count', itemCount);
     			
     			for(var i=0; i<itemCount; i++){
     				//Fetching transaction line item values
    				var lineItem = transRec.getSublistValue({
    				    sublistId : 'item',
    				    fieldId   : 'item',
    				    line      : i
    				});
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
//    				log.debug('unitsList', unitsList);
     				var transconversionRate = unitsList.filter(function(e){return e.id == lineUnit})[0].conversionRate;
     				log.debug('transconversionRate', transconversionRate);
    				//Fetching allowances related to the each item which is coming from Transaction Line
     				var itemResults = getAllowanceItems(prefDatesType, lineItem, tranCustomer, trandate);
    				var j = 0;
    				var tranItemFinalRate = 0;
    				var tranItemFinalRatePer = 0;
     				//Adding the search results to the UI on sublist
     				itemResults.each(function(result){
//    					log.debug('result: '+i,result);
     					var allowanceType = result.getValue({name:'custrecord_itpm_all_type'});
     					var allowanceUnitId = result.getValue('custrecord_itpm_all_uom');
     					var allowancePercentperuom =  parseFloat(result.getValue('custrecord_itpm_all_percentperuom'));
     					var allowanceRateperuom = result.getValue({name:'custrecord_itpm_all_rateperuom'});
     					if(allowanceType == 1){     					
                 			var allConversionRate = unitsList.filter(function(e){return e.id == allowanceUnitId})[0].conversionRate;
         					log.debug('allConversionRate', allConversionRate);
             				tranItemFinalRate = tranItemFinalRate + parseFloat(allowanceRateperuom * transconversionRate/allConversionRate);
     					}else{
     						tranItemFinalRatePer = tranItemFinalRatePer + allowancePercentperuom;
     					}
         				log.debug('tranItemFinalRate', tranItemFinalRate);
         	    		log.debug('tranItemFinalRatePer',tranItemFinalRatePer);
         	    		log.debug('Allowance Id ',result.getValue({name:'id'}));
    					//Validating the Discount log custom record whether exist or not for the current transaction internalid
    					var discountRecExists = validateDiscountLogRecord(context.request.parameters.id, lineItem, i);
    					
         				var discountLogLineValues = {
        						'sline_log' : discountRecExists['discountId'],
        						'name' : 'iTPM_DL_'+(i+1)+'_'+(j+1),
        						'sline_allpromotion' : result.getValue({name:'internalid', join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL'}),
        						'sline_allowance' : result.getValue({name:'id'}),
        						'sline_allid' : result.getValue({name:'id'}),
        						'sline_allmop' : result.getValue({name:'custrecord_itpm_all_mop'}),
        						'sline_alltype' : allowanceType,
        						'sline_allunit' : allowanceUnitId,
        						'sline_allpercent' : allowancePercentperuom,
        						'sline_allrate' : allowanceRateperuom,
        						'sline_calcrate' : (allowanceType == 1)?(allowanceRateperuom * transconversionRate/allConversionRate):((allowancePercentperuom/100) * lineRate),
        						'sline_item' : lineItem,
        						'sline_tranqty' : quantity,
        						'sline_tranunit' : lineUnit,
        						'sline_tranrate' : lineRate,
        						'sline_tranamt' : lineAmount
        					};
         				//If it exists, then add record lines to the record(If the sales discount log record exists, 
    					//it means that the line has Net Bill allowances applied)
    					if(discountRecExists['recordExists'])
    					{
//    						log.debug('IF: discountRec Exists',discountRecExists['recordExists']+' & '+discountRecExists['discountId']);
    						//Adding lines to the existed Discount Log record
    						addDiscountLogLine(discountRecExists['discountId'], discountLogLineValues);
    					}
    					//If not exists, then create a sales discount log (custom record). Populate the fields. 
    					//Then create the sales discount line records (custom record, child of sales discount log)
    					else
    					{
//    						log.debug('ELSE: discountRec NOT Exists',discountRecExists['recordExists']);
    						var discountLogValues = {
    							'name' : 'iTPM_DL_'+(i+1),
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
    						var discountLogRecInternalID = addDiscountLog(discountLogValues);
    						
    						//Adding Discount Log Lines
    						addDiscountLogLine(discountLogRecInternalID, discountLogLineValues);
    					}    					
    					j++;
    					return true; 
    	        	});
     				
     				log.debug('lineRate', lineRate );
     				var itemDiscRate = lineRate - tranItemFinalRate - ((tranItemFinalRatePer/100) * lineRate);
     				log.debug('itemDiscRate', itemDiscRate );
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
     			}
     			
     			log.debug('Available Usage:' + i, runtime.getCurrentScript().getRemainingUsage());
     			transRec.save({
     			    enableSourcing: true,
     			    ignoreMandatoryFields: true
     			});
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
     * @param {Object} discountLogValues
     * 
     * @return {String} discountLogRecID
     */
    function addDiscountLog(discountLogValues){
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
    }
    

    /**
     * @param {String} recID
     * @param {Object} discountLogLineValues
     * 
     */
    function addDiscountLogLine(recID, discountLogLineValues){
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
            fieldId: 'custrecord_itpm_sline_allid',
            value: discountLogLineValues.sline_allid,
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
		discountLogLineRecObj.setValue({
            fieldId: 'custrecord_itpm_sline_item',
            value: discountLogLineValues.sline_item,
            ignoreFieldChange: true
        });
		discountLogLineRecObj.setValue({
            fieldId: 'custrecord_itpm_sline_tranqty',
            value: discountLogLineValues.sline_tranqty,
            ignoreFieldChange: true
        });
		discountLogLineRecObj.setValue({
            fieldId: 'custrecord_itpm_sline_tranunit',
            value: discountLogLineValues.sline_tranunit,
            ignoreFieldChange: true
        });
		discountLogLineRecObj.setValue({
            fieldId: 'custrecord_itpm_sline_tranrate',
            value: discountLogLineValues.sline_tranrate,
            ignoreFieldChange: true
        });
		discountLogLineRecObj.setValue({
            fieldId: 'custrecord_itpm_sline_tranamt',
            value: discountLogLineValues.sline_tranamt,
            ignoreFieldChange: true
        });
		
		discountLogLineRecObj.save({
        	enableSourcing: true,
	        ignoreMandatoryFields: true
        });
    }
    
    function getPrefDiscountDateValue(){
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
 
    		return loadedRec.getText({fieldId: 'custrecord_itpm_pref_discountdates'});
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
    function getAllowanceItems(prefDatesType, item, customer, trandate){
    	var tranFilters = [
    		['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_status','anyof','3'], //here 3 means status is Approved
            'AND', 
            ['custrecord_itpm_all_mop','anyof','2'], //here 2 means Method of Payment is  Net Bill
            'AND', 
            ['custrecord_itpm_all_item','anyof',item], //item from transaction line
            'AND', 
            ['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_customer','anyof',customer] //customer from transaction
    	];
    	
    	//Adding the filters to the tranFilters array
		switch(prefDatesType){
		case 'Ship Date':
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate]); 
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]);
			break;
		case 'Order Date':
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate]);
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]);
			break;
		case 'Both':
			tranFilters.push('AND',[
				[['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]],
				'AND',
				[['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]]
			]);
			break;
		case 'Either':
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
    /**
     * @param {String} tranInternalid
     * 
     * @return {Array} Validation
     */
    function validateDiscountLogRecord(tranInternalid, itemID, line){
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
    }
    
    return {
        onRequest: onRequest
    };
    
});
