/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define([
        'N/search',
        'N/record',
        'N/runtime',
        'N/format',
        './iTPM_Module.js'
       ],

function(search, record, runtime, format, itpm) {
   
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
    	try{log.debug('Get Input Data');
    		return {
    			type : 'search',
    			id	 : parseInt(runtime.getCurrentScript().getParameter({name:'custscript_itpm_mr_tran_accrual_search'}))
    		}
    	}catch(ex){
    		log.error(ex.name, ex.message);
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
    		var obj = JSON.parse(context.value).values;
    		log.debug('MAP: Obj', obj);
    		
    		var tsr_tranid = obj["internalid"].value;
    		var tsr_event = 1; //Need to assign based on the List value of Event in iTPM Accrual Log record
    		var tsr_trandate = obj["trandate"];
    		var tsr_tran_type = obj["type"].value; //Expected values are ItemShip (OR) Custom
    		var tsr_tran_status = obj["statusref"].value;
    		var tsr_customer  = obj["entity"].value;
    		var tsr_date_created = format.format({value: new Date(obj["datecreated"]), type: format.Type.DATE});
    		var tsr_promoid = obj["internalid.CUSTBODY_ITPM_SET_PROMO"].value
    		var tsr_item = (tsr_tran_type == 'ItemShip') ? obj["item"].value : obj["custcol_itpm_set_item"].value;
    		var tsr_quantity = (tsr_tran_type == 'ItemShip') ? obj["quantity"] : 0;  //This value will be zero for Settlement
    		var tsr_unit = (tsr_tran_type == 'ItemShip') ? obj["unit"] : ''; //This value will be empty for Settlement
    		var tsr_amount = (tsr_tran_type == 'ItemShip') ? 0 : obj["amount"];
    		var tsr_allowance = obj["custcol_itpm_set_allowance"].value;
    		var tsr_item_type = (tsr_tran_type == 'Custom') ? obj["custcol_itpm_lsbboi"].value : '';
    		
    		if(tsr_tran_type == 'ItemShip'){
    			log.debug('tsr_tran_type', tsr_tran_type);
    			//If transaction type is Shipments, then we need to check for the parent customers
        		var customer_hierarchy = itpm.getParentCustomers(tsr_customer);
        		
        		//Scriptable Promotion search
        		var promo_filters = [
        		    ["custrecord_itpm_p_customer","anyof",customer_hierarchy],"AND", 
        		    ["custrecord_itpm_p_status","anyof","3"],"AND", 
        		    ["custrecord_itpm_p_shipstart","onorbefore",tsr_date_created],"AND", 
        		    ["custrecord_itpm_p_shipend","onorafter",tsr_date_created],"AND", 
        		    ["isinactive","is","F"],"AND", 
        		    ["custrecord_itpm_all_promotiondeal.isinactive","is","F"],"AND", 
        		    ["custrecord_itpm_all_promotiondeal.custrecord_itpm_all_item","anyof",tsr_item],"AND", 
        		    ["custrecord_itpm_all_promotiondeal.custrecord_itpm_all_mop","anyof","1"],"AND", 
        		    ["custrecord_itpm_p_type.custrecord_itpm_pt_dontupdate_lbonactual","is","F"],"AND", 
        		    ["custrecord_itpm_p_type.isinactive","is","F"] 
        		];
        		
        		if(itpm.subsidiariesEnabled()){
        			promo_filters.push("AND",["custrecord_itpm_p_subsidiary","anyof",obj["subsidiary"].value]);
        		}
        		
        		var promo_columns = [
        		    'internalid',
        		    'CUSTRECORD_ITPM_P_TYPE.internalid',
        		    'custrecord_itpm_p_customer',
        		    'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.internalid',
        		    'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.custrecord_itpm_all_item',
        		    'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.custrecord_itpm_all_rateperuom',
        		    'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.custrecord_itpm_all_uom'
        		];
        		
        		var promotionSearchObj = search.create({
        			type	: "customrecord_itpm_promotiondeal",
        			filters	: promo_filters,
        			columns	: promo_columns
        		});
        		
        		var mapObj = {};
        		
        		promotionSearchObj.run().each(function(result){
        			mapObj = {
            				key		: {
            					acc_psr_allowance_id	: result.getValue({join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL', name:'internalid'}),
            					acc_tsr_trig_tran		: tsr_tranid
            				},
            				value 	: {
            					acc_psr_promo_id		: result.getValue('internalid'),
            					acc_psr_promo_type 		: result.getValue({join:'CUSTRECORD_ITPM_P_TYPE', name:'internalid'}),
            					acc_psr_promo_customer	: result.getValue('custrecord_itpm_p_customer'),
            					acc_psr_allowance_item	: result.getValue({join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL', name:'custrecord_itpm_all_item'}),
            					acc_psr_allowance_rate	: result.getValue({join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL', name:'custrecord_itpm_all_rateperuom'}),
            					acc_psr_allowance_unit	: result.getValue({join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL', name:'custrecord_itpm_all_uom'}),
            					acc_tsr_event			: tsr_event,
            					acc_tsr_date_accrued	: tsr_trandate,
            					acc_tsr_quantity		: tsr_quantity,
            					acc_tsr_unit			: tsr_unit,
            					acc_tsr_amount			: tsr_amount,
            					acc_tsr_tran_type		: tsr_tran_type,
            					acc_tsr_tran_status		: tsr_tran_status,
            					acc_tsr_subsidiary		: (itpm.subsidiariesEnabled())?obj["subsidiary"].value:''
            				}
            			};
        			log.debug('Shipment: map constructed object', mapObj);
        			context.write(mapObj);
        				
        			return true;
        		});
    		}else{
    			mapObj = {
        				key		: {
        					acc_tsr_allowance_id	: tsr_allowance,
        					acc_tsr_trig_tran		: tsr_tranid
        				},
        				value 	: {
        					acc_tsr_promo_id		: tsr_promoid,
        					acc_tsr_allowance_item	: tsr_item,
        					acc_tsr_item_type		: tsr_item_type,
        					acc_tsr_event			: tsr_event,
        					acc_tsr_date_accrued	: tsr_trandate,
        					acc_tsr_amount			: tsr_amount,
        					acc_tsr_tran_type		: tsr_tran_type,
        					acc_tsr_tran_status		: tsr_tran_status,
        					acc_tsr_subsidiary		: (itpm.subsidiariesEnabled())?obj["subsidiary"].value:''
        				}
        			};
    			log.debug('Settlement: map constructed object', mapObj);
    			context.write(mapObj);
    		}
    	}catch(ex){
    		log.error('Map :- '+ex.name, ex);
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
    		
    		//log.audit('Usage: START', runtime.getCurrentScript().getRemainingUsage());
    		reducevalues.forEach(function(result){
    			var results = JSON.parse(result);
    			//log.audit('results', results);
    			var dataObj = {};
    			
    			//Accrual process for shipments
    			if(results.acc_tsr_tran_type == 'ItemShip'){
    				if(itpm.subsidiariesEnabled()){
    					dataObj.subsidiary = results.acc_tsr_subsidiary;
    	    		}
    				dataObj.trantype = results.acc_tsr_tran_type;
        			dataObj.event = 1;
    				dataObj.promoid = results.acc_psr_promo_id;
    				dataObj.tranid = reducekeydata.acc_tsr_trig_tran;
    				dataObj.accDate = results.acc_tsr_date_accrued;
    				dataObj.allowance = reducekeydata.acc_psr_allowance_id;
    				dataObj.all_item = results.acc_psr_allowance_item;
    				dataObj.shipment_unit = results.acc_tsr_unit;
    				dataObj.all_unitid = results.acc_psr_allowance_unit;
    				dataObj.shipment_quantity = results.acc_tsr_quantity;
    				dataObj.all_rate = results.acc_psr_allowance_rate;
    				
    				//Fetch redemption factor from Est. Qty. related to allowance item
    				var redemption_factor = search.create({
            			type : 'customrecord_itpm_estquantity',
            			filters : [['custrecord_itpm_estqty_promodeal','is',dataObj.promoid],'AND',
            			           ['custrecord_itpm_estqty_item','is',dataObj.all_item]
            			],
            			columns : ['custrecord_itpm_estqty_redemption']
            		}).run().getRange(0,1)[0].getValue('custrecord_itpm_estqty_redemption');
            		dataObj.redemption = parseFloat(redemption_factor)/100;
            		
            		//Since we are getting text value from the results object, we need to fetch the value of unit id from text value
            		if(dataObj.shipment_unit){
            			//Need to calculate the accrued amount for Shipment type
                		var unitsList = itpm.getItemUnits(dataObj.all_item).unitArray;
                		dataObj.shipment_unitid = unitsList.filter(function(e){return e.name == dataObj.shipment_unit})[0].id;
                		log.audit("shipment_unitid", dataObj.shipment_unitid);
                		dataObj.transconversionRate = unitsList.filter(function(e){return e.id == dataObj.shipment_unitid})[0].conversionRate;
                		log.audit("transconversionRate", dataObj.transconversionRate);
                		dataObj.allConversionRate = unitsList.filter(function(e){return e.id == dataObj.all_unitid})[0].conversionRate;
                		log.audit("allConversionRate", dataObj.allConversionRate);
                		dataObj.conversion_amount = parseFloat(dataObj.allConversionRate/dataObj.transconversionRate);
                		log.audit('conversion_amount', dataObj.conversion_amount);
                		dataObj.accrual_amount = parseFloat(dataObj.shipment_quantity * dataObj.redemption * dataObj.all_rate * dataObj.conversion_amount);
                		log.audit('dataObj', dataObj);
                		
                		//Searching for Existing Accrual Log
                		var accrualSearch = search.create({
                			type	: 'customrecord_itpm_accruallog',
                			filters	: [['custrecord_itpm_acc_transaction', 'is', dataObj.tranid],'AND',
                			       	   ['custrecord_itpm_acc_item', 'is', dataObj.all_item],'AND',
                			       	   ['custrecord_itpm_acc_reverse','is', false]
                			],
                			columns	: [
                			       	   search.createColumn({
                			       		   name: 'internalid',
                			       		   sort: search.Sort.DESC
                			       	   })
                			]
                		});
                		
                		//If record exists create a reverse accrual else create accrual
                		log.audit('Accrual Count', accrualSearch.runPaged().count);
                		var accid = (accrualSearch.runPaged().count) ? createNewAccrualLog(dataObj, true, true) :  createNewAccrualLog(dataObj, false, false);
                		log.audit('Shipment: New Accrual Log ID', accid);
                	}
            	}else{ //Accrual process for settlements
            		if(itpm.subsidiariesEnabled()){
    					dataObj.subsidiary = results.acc_tsr_subsidiary;
    	    		}
            		dataObj.trantype = results.acc_tsr_tran_type;
        			dataObj.transtatus = results.acc_tsr_tran_status;
        			dataObj.event = 1;
        			dataObj.promoid = results.acc_tsr_promo_id;
    				dataObj.tranid = reducekeydata.acc_tsr_trig_tran;
    				dataObj.accDate = results.acc_tsr_date_accrued;
    				dataObj.allowance = reducekeydata.acc_tsr_allowance_id;
    				dataObj.all_item = results.acc_tsr_allowance_item;
    				dataObj.item_type = results.acc_tsr_item_type;
    				dataObj.accrual_amount = results.acc_tsr_amount;
    				
    				log.audit('dataObj', dataObj);
					//Searching for Existing Accrual Log
            		var acc_filters = [['custrecord_itpm_acc_transaction', 'is', dataObj.tranid],'AND',
                			       	   ['custrecord_itpm_acc_item', 'is', dataObj.all_item],'AND',
                			       	   
                			       	   ['custrecord_itpm_acc_reverse','is', false]
                			];
    				if(dataObj.item_type == '2'){ //only for Bill-Back
    					acc_filters.push('AND',['custrecord_itpm_acc_allowance', 'is', dataObj.allowance]);
    				}
    				var accrualSearch = search.create({
            			type	: 'customrecord_itpm_accruallog',
            			filters	: acc_filters,
            			columns	: [
            			       	   search.createColumn({
            			       		   name: 'internalid',
            			       		   sort: search.Sort.DESC
            			       	   }),
            			       	   search.createColumn({
            			       		   name: 'custrecord_itpm_acc_amount'
            			       	   })
            			]
            		});
    				
            		log.audit('Accrual Count & Settlement Status(Void means statusC)', accrualSearch.runPaged().count+' & '+dataObj.transtatus);
            		//If status id Applied/Void AND accrual count exists
            		if((dataObj.transtatus != 'statusC' || dataObj.transtatus != 'statusC') && accrualSearch.runPaged().count){
            			dataObj.accrual_amount = accrualSearch.run().getRange(0,1)[0].getValue('custrecord_itpm_acc_amount');
            			var accid = createNewAccrualLog(dataObj, true, true);
                		log.audit('Settlement(Applied/Void, count exists): New Accrual Log ID', accid);
            		}else if(dataObj.transtatus != 'statusC' && !(accrualSearch.runPaged().count)){ //If Applied status and no accrual log count
            			var accid = createNewAccrualLog(dataObj, true, false);
                		log.audit('Settlement(Applied, No count): New Accrual Log ID', accid);
            		}
    			}
    			
    			return true;
    		});
    		
    		//log.audit('Usage: END', runtime.getCurrentScript().getRemainingUsage());
    	}catch(ex){
    		log.error('Reduce:- '+ex.name, ex);
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
     * @param {Object} accObj - holds all required data to create iTPM Accrual Log
     * @param {boolean} isNegativeAmount - if true needs -ve amount
     * @param {boolean} isReversal - if true, will create reverse accrual
     * @returns {String} accrualid - internalid of the new iTPM Accrual Log record
     */
    function createNewAccrualLog(accObj, isNegativeAmount, isReversal){
    	try{
    		var accruedAmount = parseFloat(accObj.accrual_amount).toFixed(2);
    		var finalAmount = (isNegativeAmount) ? accruedAmount*(-1) : accruedAmount;
    		log.debug('finalAmount', finalAmount+' for '+accObj.trantype);
    		
    		var recObj = record.create({
    			type	: 'customrecord_itpm_accruallog'
    		});
    		
    		recObj.setValue({fieldId:'custrecord_itpm_acc_event', value:1});
    		recObj.setValue({fieldId:'custrecord_itpm_acc_promotion', value:accObj.promoid}); //Promo id
    		
    		if(itpm.subsidiariesEnabled()){
    			recObj.setValue('custrecord_itpm_acc_subsidiary', accObj.subsidiary); //subsidiary
    		}
    		
    		recObj.setValue({fieldId:'custrecord_itpm_acc_transaction', value:accObj.tranid}); //TriggerTran id
    		recObj.setValue({fieldId:'custrecord_itpm_acc_dateaccrued', value:new Date(accObj.accDate)}); //accrued date
    		
    		//set allowance on Accrual Log, if item type is Bill-Back (Allowance is not available for Lump Sum on Settlement lines)
    		if(accObj.allowance && accObj.item_type == '2'){
    			recObj.setValue({fieldId:'custrecord_itpm_acc_allowance', value:accObj.allowance}); //allowanceid
    		}
    		    		
    		recObj.setValue({fieldId:'custrecord_itpm_acc_item', value:accObj.all_item}); //item
    		
    		if(accObj.trantype == 'ItemShip'){
    			recObj.setValue({fieldId:'custrecord_itpm_acc_allowance', value:accObj.allowance});
    			recObj.setValue({fieldId:'custrecord_itpm_acc_quantity', value:accObj.shipment_quantity}); //quantity
        		recObj.setValue({fieldId:'custrecord_itpm_acc_unit', value:accObj.shipment_unitid}); //unit
    		}
    		
    		if(isReversal){
    			recObj.setValue({fieldId:'custrecord_itpm_acc_reverse', value:true}); //Reversal/Released
    		}
    		
    		recObj.setValue({fieldId:'custrecord_itpm_acc_amount', value:finalAmount}); //Accrued Amount
    		
    		return accrualid = recObj.save({
    			enableSourcing: false,
    		    ignoreMandatoryFields: true
    		});
    	}catch(ex){
    		log.error(ex.name, ex);
    	}
    }
    
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
