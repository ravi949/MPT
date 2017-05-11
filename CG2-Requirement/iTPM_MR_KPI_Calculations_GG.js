/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/runtime', 'N/record'],

function(search, runtime, record) {
   
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
    		//log.debug('GetInputData Search', runtime.getCurrentScript().getParameter({name:'custscript_itpm_mr_kpisearch'}));
    		return {
        		type: 'search',
        		id: parseInt(runtime.getCurrentScript().getParameter({name:'custscript_itpm_mr_kpisearch'}))
        	}
    	} catch(ex) {
    		log.error('GetInputData Error', ex.name + '; ' + ex.message);
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
    		//log.debug('MapSummary', context);
        	var line = JSON.parse(context.value).values;
        	//log.debug('line', line);
        	var promotionID = line['internalid'].value,
        		pCondition = line['custrecord_itpm_p_condition'].value,
        		pStatus = line['custrecord_itpm_p_status'].value,
        		shipStart = line['custrecord_itpm_p_shipstart'],
        		shipEnd = line['custrecord_itpm_p_shipend'],
        		orderStart = line['custrecord_itpm_p_orderstart'],
        		orderEnd = line['custrecord_itpm_p_orderend'],
        		customerId = line['custrecord_itpm_p_customer'],
        		kpiID = line['internalid.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL'].value,
        		kpiItemID = line['custrecord_itpm_kpi_item.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL'].value,
        		kpiUnitID = line['custrecord_itpm_kpi_uom.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL'].value,
        		pTypeID = line['internalid.CUSTRECORD_ITPM_P_TYPE'].value,
        		pTypeImpactID = line['custrecord_itpm_pt_financialimpact.CUSTRECORD_ITPM_P_TYPE'].value,
        		pTypeValidMOP = line['custrecord_itpm_pt_validmop.CUSTRECORD_ITPM_P_TYPE'],
        		rangeStart = 0, rangeStep = 999,
        		allArray = [], estUnit = null, estQty = {};
        	
        	//log.debug('EstQty Search', runtime.getCurrentScript().getParameter({name:'custscript_itpm_mr_estqtysearch'}));
        	//log.debug('Allowances Search', runtime.getCurrentScript().getParameter({name:'custscript_itpm_mr_allowancesearch'}));
        	
        	/**** Get EstQty for each KPI ****/
        	var estQtySearch = search.load({
        		id: parseInt(runtime.getCurrentScript().getParameter({name:'custscript_itpm_mr_estqtysearch'}))
        	});
        	estQtySearch.filters.push(search.createFilter({
            		name: 'custrecord_itpm_estqty_promodeal',
            		operator: search.Operator.ANYOF,
            		values: [promotionID]
            }));
        	estQtySearch.filters.push(search.createFilter({
            		name: 'custrecord_itpm_estqty_item',
            		operator: search.Operator.ANYOF,
            		values: [kpiItemID]
        	}));
    		var estQuantities = estQtySearch.run().getRange(0, 2);
    		if (estQuantities.length > 1){
    			throw {
    				name: 'ESTQTY_SEARCH_ERROR', 
    				message:'Saved search for EstQty returned more than one result. PromotionId: ' + promotionID + '; ItemID: ' + kpiItemID
    				};
    		} else {
    			estQty = {
    					id: estQuantities[0].getValue({name:'id'}),
    					unit: estQuantities[0].getValue({name:'custrecord_itpm_estqty_qtyby'}),
    					total: estQuantities[0].getValue({name:'custrecord_itpm_estqty_totalqty'}),
    					promoted: estQuantities[0].getValue({name:'custrecord_itpm_estqty_estpromotedqty'}),
    					rate: estQuantities[0].getValue({name:'custrecord_itpm_estqty_totalrate'}),
    					percent: estQuantities[0].getValue({name:'custrecord_itpm_estqty_totalpercent'})
    					}
    		}
        	
        	/**** Create a key-value pair for each MOP value ****/
        	for(var i = 0; i<pTypeValidMOP.length; i++){
        		rangeStart = 0;
        		/**** Get Allowances for each KPI Item + Promotion + MOP ****/
            	var allowanceSearch = search.load({
            		id: parseInt(runtime.getCurrentScript().getParameter({name:'custscript_itpm_mr_allowancesearch'}))
            	});
            	allowanceSearch.filters.push(search.createFilter({
            		name: 'custrecord_itpm_all_promotiondeal',
            		operator: search.Operator.ANYOF,
            		values: [promotionID]
            	}));
            	allowanceSearch.filters.push(search.createFilter({
            		name: 'custrecord_itpm_all_item',
            		operator: search.Operator.ANYOF,
            		values: [kpiItemID]
            	}));
            	allowanceSearch.filters.push(search.createFilter({
            		name: 'custrecord_itpm_all_mop',
            		operator: search.Operator.ANYOF,
            		values: [pTypeValidMOP[i]]
            	}));
            	//log.debug('AllowanceSearch', allowanceSearch);
            	//log.debug('AllowanceSearch Columns', allowanceSearch.run().columns);
        		do {
        			var allowances = allowanceSearch.run().getRange(rangeStart, rangeStart + rangeStep);
        			for (var j = 0; j < allowances.length; j++) {
        				allArray.push({
        					id: allowances[j].getValue({name:'id'}),
        					mop: allowances[j].getValue({name:'custrecord_itpm_all_mop'}), 
        					unit: allowances[j].getValue({name:'custrecord_itpm_all_uom'}),
        					rate: allowances[j].getValue({name:'custrecord_itpm_all_rateperuom'}),
        					percent: allowances[j].getValue({name:'custrecord_itpm_all_percentperuom'})
        					});
        			}
        			rangeStart += rangeStep;
        		} while (util.isArray(allowances) && allowances.length >= rangeStep);
        		
        		if (allArray.length > 0){
	        		context.write({
	        			key:{
	        				kpi : kpiID, 
	        				item: kpiItemID,
	        				unit: kpiUnitID,
	        				promotion: {
	        					id: promotionID,
		        				customer: customerId,
		        				type: pTypeID, 
		        				status: pStatus,
		        				condition: pCondition,
		        				shipstart: shipStart,
		        				shipend: shipEnd,
		        				orderstart: orderStart,
		        				orderend: orderEnd
		        				},
	        				estqty: estQty
	        				},
	        			value:{
	        				allowances: allArray
	        				}
	        		});
        		}
        		
        	}
        	
    	} catch(ex) {
    		log.error('Map', ex.name + '; ' + ex.message + '; PromotionID: ' + context.key);
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
        	var key = JSON.parse(context.key), values = JSON.parse(context.values), unitArray = [];
        	log.debug('Reduce Key', key);
        	log.debug('Reduce Values', values);
        	
        	/**** Get Units Table for Item ****/
        	var unitsType = search.lookupFields({
        		type: search.Type.INVENTORY_ITEM,
        		id: key.item,
        		columns: 'unitstype'
        	});
        	if (!unitsType.unitstype){
        		throw {
        			name: 'UNITS_TYPE_ERROR',
        			message: 'Item units type search returned null. PromotionID: ' + key.promotion.id  + '; ItemID: ' + key.item
        		};
        	}
        	var unitRecord = record.load({
        		type: record.Type.UNITS_TYPE,
        		id: unitsType.unitstype[0].value
        	});
        	var sublistLines = unitRecord.getLineCount({sublistId: 'uom'});
        	for (var u = 0; u < sublistLines; u++){
        		unitArray.push({
        			id: unitRecord.getSublistValue({sublistId: 'uom', line: u, fieldId: 'internalid'}),
        			name: unitRecord.getSublistValue({sublistId: 'uom', line: u, fieldId: 'unitname'}),
        			isBase: unitRecord.getSublistValue({sublistId: 'uom', line: u, fieldId: 'baseunit'}),
        			conversionRate: unitRecord.getSublistValue({sublistId: 'uom', line: u, fieldId: 'conversionrate'})
        		});
        	}
        	log.debug('Units Array', unitArray);
        	
        	/**** START CALCULATIONS ****/
        	// KPI Promoted Qty, Actual Qty, and Estimated Spend are the same regardless of status and condition
        	var kpi_promoQty = key.promotedQty;
        	var kpi_actualQty = getActualQty(key.itemId, key.customerId, key.shipStart, key.shipEnd);
        	var kpi_estimatedSpendBB = getEstimatedSpend();
        	
    	} catch(ex) {
    		log.error('REDUCE_ERROR', ex.name + '; ' + ex.message + '; Key: ' + context.key);
    	}
    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
    	log.debug('Summarize', summary);
    }
    
    /**
     * Function to search for item fulfillments based on Item Id, Customer Id, and date range
     * and return a decimal number
     * 
     * @params {string} itemId Internal ID of the Item
     * @params {string} customerId Internal ID of the customer
     * @params {string} shipStart  Date
     * @params {string} shipEnd
     * 
     * @returns {string}
     */
    function getActualQty(itemId, customerId, shipStart, shipEnd){
    	return 0;
    }
    
    /**
     * Function to search for item fulfillments based on Item Id, Customer Id, and date range
     * and return a decimal number
     * 
     * @params {string} itemId Internal ID of the Item
     * @params {string} customerId Internal ID of the customer
     * @params {string} shipStart  Date
     * @params {string} shipEnd
     * 
     * @returns {string}
     */
    function getEstimatedSpend(){
    	return 0;
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
