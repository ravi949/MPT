/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/search',
	    'N/runtime',
	    'N/record',
	    'N/redirect',
	    './iTPM_Module'
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
    			var insertAtLine = 1;
    			//Getting Preference Data
    			var prefData = getPreferencesData();
    			var prefDatesType = prefData.discountdates;
    			var prefDiscountItem = prefData.discountitem;
    			
    			//newRecord: used to apply all discounts and commit
    			var newTranRecObj = record.load({
    			    type: context.request.parameters.type, 
    			    id: context.request.parameters.id,
    			    isDynamic: true
    			});
    			
    			//oldRecord: Loading the transaction type record with the ID coming from the parameters
    			var tranRecObj = record.load({
    			    type: context.request.parameters.type, 
    			    id: context.request.parameters.id,
    			    isDynamic: true
    			});
    			
    			var trandate = tranRecObj.getText({fieldId : 'trandate'});
    			var customer = tranRecObj.getValue({fieldId : 'entity'});
    			var itemCount = tranRecObj.getLineCount({
    			    sublistId: 'item'
    			});
    			//log.debug('Item Count', itemCount);
    			
    			for(var i=0; i<itemCount; i++){
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
    				//log.debug('unitsList', unitsList);
    				var transconversionRate = unitsList.filter(function(e){return e.id == lineUnit})[0].conversionRate;
     				log.debug('transconversionRate', transconversionRate);
     				
    				//Fetching allowances related to the each item which is coming from Transaction Line
    				var perItemResults = getAllowanceItems(prefDatesType, lineItem, customer, trandate);
    				var j = 0;
    	        	
    	        	perItemResults.each(function(result){
    					//log.debug('result: '+j,result.getValue({name:'id'}));
    					
    					//Calculating Conversion rate per allowance
    					var allowanceType = result.getValue({name:'custrecord_itpm_all_type'});
     					var allowanceUnitId = result.getValue('custrecord_itpm_all_uom');
     					var allowancePercentperuom =  parseFloat(result.getValue('custrecord_itpm_all_percentperuom'));
     					var allowanceRateperuom = result.getValue({name:'custrecord_itpm_all_rateperuom'});
     					var tranItemFinalRate = 0;
     					
     					if(allowanceType == 1){
     						var allConversionRate = unitsList.filter(function(e){return e.id == allowanceUnitId})[0].conversionRate;
     						log.debug('allConversionRate', allConversionRate);
             				tranItemFinalRate = parseFloat(allowanceRateperuom * transconversionRate/allConversionRate);
     					}else{
     						tranItemFinalRate = (allowancePercentperuom/100) * lineRate;
     					}
         				log.debug('tranItemFinalRate', tranItemFinalRate);
         	    		
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
    						'sline_calcrate' : tranItemFinalRate,
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
    						//log.debug('IF: discountRec Exists',discountRecExists['recordExists']+' & '+discountRecExists['discountId']);
    						//Adding lines to the existed Discount Log record
    						addDiscountLogLine(discountRecExists['discountId'], discountLogLineValues);
    					}
    					//If not exists, then create a sales discount log (custom record). Populate the fields. 
    					//Then create the sales discount line records (custom record, child of sales discount log)
    					else
    					{
    						//log.debug('ELSE: discountRec NOT Exists',discountRecExists['recordExists']);
    						var discountLogValues = {
    							'name' : 'iTPM_DL_'+(i+1),
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
    						var discountLogRecInternalID = addDiscountLog(discountLogValues);
    						
    						//Adding Discount Log Lines
    						addDiscountLogLine(discountLogRecInternalID, discountLogLineValues);
    					}
    					
    					//Adding Discount Line Items to the transaction line
    					newTranRecObj.insertLine({
    		                sublistId: "item",
    		                line: insertAtLine
    		            });
    					newTranRecObj.setCurrentSublistValue({
    		                sublistId: "item",
    		                fieldId: "item",
    		                value: prefDiscountItem
    		            });
    					newTranRecObj.setCurrentSublistValue({
    		                sublistId: "item",
    		                fieldId: "price",
    		                value: "-1"
    		            });
    					newTranRecObj.setCurrentSublistValue({
    		                sublistId: "item",
    		                fieldId: "rate",
    		                value: -tranItemFinalRate
    		            });
    					newTranRecObj.commitLine({
    		                sublistId:"item"
    		            });
    					
    		            //increment the next line within tranItem loop for each allowance
    		            insertAtLine++;
    		            //log.debug('insertAtLine', insertAtLine);
    					
    					j++;
    					return true;
    	        	});
    	        	
    	        	//Adding the global line by 1 after completion of every tranItem iteration
    	        	insertAtLine++;
		            //log.debug('insertAtLine<after Loop>', insertAtLine);
    	        }
    			
    			//Saving the transaction record after applying all discounts
    			newTranRecObj.setValue({
	                fieldId: "custbody_itpm_applydiscounts",
	                value: false
	            });
    			
    			newTranRecObj.save({
    				enableSourcing: true,
    			    ignoreMandatoryFields: true
    			});
    			
    			redirect.toRecord({
        		    type : context.request.parameters.type,
        		    id   : context.request.parameters.id
        		});
    			log.debug('Available Usage:', runtime.getCurrentScript().getRemainingUsage());
    		}
    	}catch(e){
    		log.error(e.anme, e.message);
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
    			    'discountdates' : loadedRec.getText({fieldId: 'custrecord_itpm_pref_discountdates'}),
    			    'discountitem' : loadedRec.getValue({fieldId: 'custrecord_itpm_pref_discountitem'})
    		};
    		
    		return prefRecData;
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
		case "Ship Date":
			tranFilters.push("AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart","onorbefore",trandate]); 
			tranFilters.push("AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend","onorafter",trandate]);
			break;
		case "Order Date":
			tranFilters.push("AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart","onorbefore",trandate]);
			tranFilters.push("AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend","onorafter",trandate]);
			break;
		case "Both":
			tranFilters.push("AND",[
				[["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart","onorbefore",trandate],"AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend","onorafter",trandate]],
				"AND",
				[["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart","onorbefore",trandate],"AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend","onorafter",trandate]]
			]);
			break;
		case "Either":
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
