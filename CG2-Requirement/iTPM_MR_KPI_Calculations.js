/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/search', 
        'N/runtime', 
        'N/record',
        './iTPM_Module.js'
        ],

function(search, runtime, record, iTPM) {
   
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
        		rangeStart = 0, rangeStep = 999, allArray = [];
        	var estid, estunit, estTotal, estPromoted, estRate, estPercent, ratebb, rateoi, ratenb, estRedemption;
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
				estid = estQuantities[0].getValue({name:'id'});
				estUnit = estQuantities[0].getValue({name:'custrecord_itpm_estqty_qtyby'});
				estTotal = estQuantities[0].getValue({name:'custrecord_itpm_estqty_totalqty'});
				estPromoted = estQuantities[0].getValue({name:'custrecord_itpm_estqty_estpromotedqty'});
				estRate = estQuantities[0].getValue({name:'custrecord_itpm_estqty_totalrate'});
				estPercent = estQuantities[0].getValue({name:'custrecord_itpm_estqty_totalpercent'});
				estRateBB = estQuantities[0].getValue({name:'custrecord_itpm_estqty_rateperunitbb'});
				estRateOI = estQuantities[0].getValue({name:'custrecord_itpm_estqty_rateperunitoi'});
				estRateNB = estQuantities[0].getValue({name:'custrecord_itpm_estqty_rateperunitnb'});
				estRedemption = estQuantities[0].getValue({name:'custrecord_itpm_estqty_redemption'});
    		}
    		/**** Get Allowances for each MOP ****/
        	/*
        	for(var i = 0; i<pTypeValidMOP.length; i++){
        		rangeStart = 0;
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
        	}
        	*/
    		//if (allArray.length > 0){
	    		context.write({
	    			key:{
	    				kpi : kpiID, 
	    				item: kpiItemID,
	    				unit: kpiUnitID,
	    				pid: promotionID,
	        			customer: customerId,
	        			ptype: pTypeID, 
	        			status: pStatus,
	        			condition: pCondition,
	        			shipStart: shipStart,
	        			shipEnd: shipEnd,
	        			orderStart: orderStart,
	        			orderEnd: orderEnd
	    				},
	    			value:{
	    				estid : estid,
	    				estUnit : estUnit,
	    				estTotal : estTotal,
	    				estPromoted : estPromoted,
	    				estRate : estRate,
	    				estPercent :estPercent,
	    				estRateBB : estRateBB,
	    				estRateOI : estRateOI,
	    				estRateNB : estRateNB,
	    				estRedemption : estRedemption
	    				//allowances: allArray
	    				}
	    		});
    		//}
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
        	var key = JSON.parse(context.key);
        	//log.audit('Reduce_Key', key);
        	var values = JSON.parse(context.values[0]);
        	//log.audit('Reduce_Values', values);
        	/**** START CALCULATIONS ****/
        	// KPI Promoted Qty, Actual Qty, and Estimated Spend are the same regardless of status and condition
        	var kpi_promoQty = values.estPromoted;
        	var kpi_actualQty = iTPM.getActualQty(key.item, key.customer, key.shipStart, key.shipEnd);
        	log.debug('kpi_actualQty', 'IsNumber: ' + util.isNumber(kpi_actualQty.quantity));
        	kpi_actualQty.quantity = (util.isNumber(kpi_actualQty.quantity))? kpi_actualQty.quantity : 0; 
        	log.debug('kpi_actualQty', kpi_actualQty.quantity);
        	var estimatedSpend = iTPM.getSpend({returnZero: false, quantity: values.estPromoted, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB});
        	log.debug('estimatedSpend', estimatedSpend);
        	var leSpend, actualSpend, expectedLiability, maxLiability;
        	switch (key.status) {
				case '1':	//DRAFT
				case '2':	//PENDING APPROVAL
					leSpend = estimatedSpend;
					actualSpend = iTPM.getSpend({returnZero: true});			//should return object zero
					expectedLiability = iTPM.getLiability({returnZero: true});	//should return object zero
					maxLiability = iTPM.getLiability({returnZero: true});		//should return object zero
					break;
				case '4':	//REJECTED
				case '5':	//VOIDED
					leSpend = iTPM.getSpend({returnZero: true});				//should return object zero
					actualSpend = iTPM.getSpend({returnZero: true});			//should return object zero
					expectedLiability = iTPM.getLiability({returnZero: true});	//should return object zero
					maxLiability = iTPM.getLiability({returnZero: true});		//should return object zero
					break;
				case '3':	//APPROVED
					if (key.condition == '1'){
						//condition == Future
						leSpend = estimatedSpend;
						actualSpend = iTPM.getSpend({returnZero: true});			//should return object zero
						expectedLiability = iTPM.getLiability({returnZero: true});	//should return object zero
						maxLiability = iTPM.getLiability({returnZero: true});		//should return object zero
					} else if (key.condition == '2') {
						//condition == Active
						//var leQuantity = (kpi_actualQty.error)? 0 : (parseFloat(values.estPromoted)>=parseFloat(kpi_actualQty.qty))? values.estPromoted : kpi_actualQty.qty;
						var leQuantity = (parseFloat(values.estPromoted)>=parseFloat(kpi_actualQty.quantity))? values.estPromoted : kpi_actualQty.quantity;
						log.debug('leQuantity', leQuantity);
						leSpend = iTPM.getSpend({returnZero: false, quantity: leQuantity, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB});
						var actQty = (kpi_actualQty.error)? 0 : kpi_actualQty.quantity;
						actualSpend = iTPM.getSpend({returnZero: false, quantity: actQty, rateBB: '0', rateOI: values.estRateOI, rateNB: values.estRateNB});
						expectedLiability = iTPM.getLiability({returnZero: false, quantity: actQty, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB, redemption: values.estRedemption});
						maxLiability = iTPM.getLiability({returnZero: false, quantity: actQty, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB, redemption: '100%'});
					} else if (key.condition == '3') {
						//condition == Completed
						//var actQty = (kpi_actualQty.error) ? 0 : kpi_actualQty.quantity;
						var actQty = kpi_actualQty.quantity;
						log.debug('actQty', actQty);
						leSpend = iTPM.getSpend({returnZero: false, quantity: actQty, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB});
						actualSpend = iTPM.getSpend({returnZero: false, quantity: actQty, rateBB: '0', rateOI: values.estRateOI, rateNB: values.estRateNB});
						expectedLiability = iTPM.getLiability({returnZero: false, quantity: actQty, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB, redemption: values.estRedemption});
						maxLiability = iTPM.getLiability({returnZero: false, quantity: actQty, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB, redemption: '100%'});
					}
					break;
				case '6':	//CLOSED
					var actQty = kpi_actualQty.quantity;
					leSpend = iTPM.getSpend({returnZero: false, quantity: actQty, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB});
					actualSpend = iTPM.getSpend({returnZero: false, quantity: actQty, rateBB: '0', rateOI: values.estRateOI, rateNB: values.estRateNB});
					expectedLiability = iTPM.getLiability({returnZero: false, quantity: actQty, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB, redemption: values.estRedemption});
					maxLiability = iTPM.getLiability({returnZero: false, quantity: actQty, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB, redemption: '100%'});
					break;
				default:
					leSpend = estimatedSpend;
					actualSpend = iTPM.getSpend({returnZero: true});			//should return object zero
					expectedLiability = iTPM.getLiability({returnZero: true});	//should return object zero
					maxLiability = iTPM.getLiability({returnZero: true});		//should return object zero
					break;
			}
        	log.debug('KPI_Values', 
        			'"KPI": ' + key.kpi + 
        			',"kpi_promoQty": ' + kpi_promoQty + 
        			',"kpi_actualQty": ' + JSON.stringify(kpi_actualQty) + 
        			',"estimatedSpend": ' + JSON.stringify(estimatedSpend) + 
        			',"leSpend": ' + JSON.stringify(leSpend) + 
        			',"actualSpend": ' + JSON.stringify(actualSpend) + 
        			',"expectedLiability": ' + JSON.stringify(expectedLiability) + 
        			',"maxLiability": ' + JSON.stringify(maxLiability)
        			);
        	if (kpi_actualQty.error){
        		throw {name: kpi_actualQty.name, message: kpi_actualQty.message};
        	} else if (leSpend.error){
        		throw {name: leSpend.name, message: leSpend.message};
        	} else if (actualSpend.error){
        		throw {name: actualSpend.name, message: actualSpend.message};
        	} else if (expectedLiability.error){
        		throw {name: expectedLiability.name, message: expectedLiability.message};
        	} else if (maxLiability.error){
        		throw {name: maxLiability.name, message: maxLiability.message};
        	}
        	/**** SET KPI FIELD VALUES ****/
        	var kpiUpdated = record.submitFields({
        		type: 'customrecord_itpm_kpi',
        		id: key.kpi,
        		values: {
        			'custrecord_itpm_kpi_esttotalqty' : kpi_promoQty,
        			'custrecord_itpm_kpi_actualtotalqty' : kpi_actualQty.quantity,
        			'custrecord_itpm_kpi_maximumliabilitybb' : maxLiability.bb,
        			'custrecord_itpm_kpi_maximumliabilityoi' : maxLiability.oi,
        			'custrecord_itpm_kpi_maximumliabilitynb' : maxLiability.nb,
        			'custrecord_itpm_kpi_expectedliabilitybb' : expectedLiability.bb,
        			'custrecord_itpm_kpi_expectedliabilityoi' : expectedLiability.oi,
        			'custrecord_itpm_kpi_expectedliabilitynb' : expectedLiability.nb,
        			'custrecord_itpm_kpi_estimatedspendbb' : estimatedSpend.bb,
        			'custrecord_itpm_kpi_estimatedspendoi' : estimatedSpend.oi,
        			'custrecord_itpm_kpi_estimatedspendnb' : estimatedSpend.nb,
        			'custrecord_itpm_kpi_lespendbb' : leSpend.bb,
        			'custrecord_itpm_kpi_lespendoi' : leSpend.oi,
        			'custrecord_itpm_kpi_lespendnb' : leSpend.nb,
        			'custrecord_itpm_kpi_actualspendbb' :actualSpend.bb,
        			'custrecord_itpm_kpi_actualspendoi' :actualSpend.oi,
        			'custrecord_itpm_kpi_actualspendnb' :actualSpend.nb
        		},
        		options: {enablesourcing: true, ignoreMandatoryFields: true}
        	});
        	log.debug('KPI Updated', kpiUpdated);
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
    
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
