/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/search', 
        'N/runtime', 
        'N/record',
        'N/format',
        './iTPM_Module.js'
        ],

function(search, runtime, record, format, itpm) {
   
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
        	var line = JSON.parse(context.value).values;
        	log.debug('map_line', JSON.stringify(line));
        	var promotionID = line['internalid'].value,
        		pCondition = line['custrecord_itpm_p_condition'].value,
        		pStatus = line['custrecord_itpm_p_status'].value,
        		pLumpSum = line['custrecord_itpm_p_lumpsum'],
        		shipStart = line['custrecord_itpm_p_shipstart'],
        		shipEnd = line['custrecord_itpm_p_shipend'],
        		orderStart = line['custrecord_itpm_p_orderstart'],
        		orderEnd = line['custrecord_itpm_p_orderend'],
        		customerId = line['custrecord_itpm_p_customer'].value,
        		pAllocationType = line['custrecord_itpm_p_allocationtype'].value,
        		pPriceLevel = line['custrecord_itpm_p_itempricelevel'].value,
        		kpiID = line['internalid.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL'].value,
        		kpiItemID = line['custrecord_itpm_kpi_item.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL'].value,
        		kpiUnitID = line['custrecord_itpm_kpi_uom.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL'].value,
        		kpiLSAllFactorEST = line['custrecord_itpm_kpi_factorestls.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL'],
        		kpiLSAllFactorActual = line['custrecord_itpm_kpi_factoractualls.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL'],
        		kpiActualSpendLS = line['custrecord_itpm_kpi_actualspendls.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL'],
        		//kpiLSAllAdjusted = line['custrecord_itpm_kpi_adjustedls.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL'] == 'T',
        		pTypeID = line['internalid.CUSTRECORD_ITPM_P_TYPE'].value,
        		pTypeImpactID = line['custrecord_itpm_pt_financialimpact.CUSTRECORD_ITPM_P_TYPE'].value,
        		pTypeValidMOP = line['custrecord_itpm_pt_validmop.CUSTRECORD_ITPM_P_TYPE'],
        		pTypeNoActuals = line['custrecord_itpm_pt_dontupdate_lbonactual.CUSTRECORD_ITPM_P_TYPE'],
        		rangeStart = 0, rangeStep = 999, allArray = [];
        	var estid, estunit, estTotal, estPromoted, estRate, estPercent, ratebb, rateoi, ratenb, estRedemption, kpiEstimatedRevenue;
        	
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
        	estQtySearch.filters.push(search.createFilter({
        		name: 'isinactive',
        		operator: search.Operator.IS,
        		values: false
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
    		
    		//LS Allocation Factor Estimated
    		var nonZeroQty;
    		if (parseFloat(estTotal) == 0){
    			nonZeroQty = itpm.hasEstQty({promotionId: promotionID});
    			nonZeroQty = nonZeroQty.hasEstQty;
    		} else {
    			nonZeroQty = true;
    		}
    		
    		kpiLSAllFactorEST = itpm.getEstAllocationFactorLS({
    			promotionId: promotionID, 
    			priceLevel: pPriceLevel,
    			hasEstQty: nonZeroQty, 
    			kpiId: kpiID,
    			itemId: kpiItemID,
    			estQtySearch: parseInt(runtime.getCurrentScript().getParameter({name:'custscript_itpm_mr_estqtysearch'}))
    			});
    		
    		log.debug('estFactorLS', kpiLSAllFactorEST);
    		
    		if(kpiLSAllFactorEST){
    			kpiLSAllFactorEST = kpiLSAllFactorEST.factor;
    			//kpiLSAllAdjusted = kpiLSAllFactorEST.adjusted;
    		} else {
    			kpiLSAllFactorEST = 0;
    			//kpiLSAllAdjusted = false;
    		}
    		
    		//LS Allocation Factor Actual
    		if (pStatus == '3'){
    			if (pTypeNoActuals != 'T') {
    				var saleExists;
        			saleExists = itpm.hasSales({
        				promotionId: promotionID,
        				shipStart: shipStart,
        				shipEnd: shipEnd,
        				orderStart: orderStart,
        				orderEnd: orderEnd,
        				customerId: customerId
        			});
        			if (!saleExists.hasSales){
        				//use est allocation factor
        				kpiLSAllFactorActual = kpiLSAllFactorEST;
        			} else {
        				kpiLSAllFactorActual = itpm.getActAllocationFactorLS({
        					promotionId: promotionID,
        					shipStart: shipStart,
        					shipEnd: shipEnd,
        					orderStart: orderStart,
        					orderEnd: orderEnd,
        					customerId: customerId,
        					kpiId: kpiID//,
        					//adjusted: kpiLSAllAdjusted
        				});
        				kpiLSAllFactorActual = (kpiLSAllFactorActual) ? kpiLSAllFactorActual.factor : 0;
        			}
    			} else {
    				kpiLSAllFactorActual = kpiLSAllFactorEST;
    			}
    		}
    		
    		context.write({
    			key:{
    				kpi : kpiID,
    				lsallfactorest: kpiLSAllFactorEST.toString(),
    				lsallfactoractual: kpiLSAllFactorActual.toString(),
    				//lsadjusted: kpiLSAllAdjusted,
    				item: kpiItemID,
    				unit: kpiUnitID,
    				actSpendLS: (kpiActualSpendLS)?parseFloat(kpiActualSpendLS):0,
    				pid: promotionID,
    				plumpsum:(pLumpSum)?parseFloat(pLumpSum):0,
        			customer: customerId,
        			ptype: pTypeID, 
        			status: pStatus,
        			condition: pCondition,
        			shipStart: shipStart,
        			shipEnd: shipEnd,
        			orderStart: orderStart,
        			orderEnd: orderEnd,
        			noActuals: (pTypeNoActuals == 'T')? true:false
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
    				}
	    		});
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
        	var values = JSON.parse(context.values[0]);
        	
        	/**** START CALCULATIONS ****/
        	// KPI Promoted Qty, Actual Qty, and Estimated Spend are the same regardless of status and condition
        	var kpi_promoQty = values.estPromoted;
        	var kpi_actualQty = itpm.getActualQty(key.item, key.customer, key.shipStart, key.shipEnd);
        	log.audit('kpi_actualQty',kpi_actualQty);
        	log.debug('kpi_actualQty', 'IsNumber: ' + util.isNumber(kpi_actualQty.quantity));
        	
        	kpi_actualQty.quantity = (util.isNumber(kpi_actualQty.quantity))? kpi_actualQty.quantity : 0; 
        	log.debug('kpi_actualQty', kpi_actualQty.quantity);
        	
        	var estimatedSpend = itpm.getSpend({
        		returnZero: false, 
        		quantity: values.estPromoted, 
        		rateBB: values.estRateBB, 
        		rateOI: values.estRateOI, 
        		rateNB: values.estRateNB
        		});
        	
        	estimatedSpend.ls = parseFloat(key.lsallfactorest)*key.plumpsum;
        	
        	log.debug('estimatedSpend', estimatedSpend);
        	
        	var leSpend, actualSpend, expectedLiability, maxLiability, leSpendLS;
        	
        	switch (key.status) {
				case '1':	//DRAFT
					leSpend = estimatedSpend;
					actualSpend = itpm.getSpend({returnZero: true});			//should return object zero
					expectedLiability = itpm.getLiability({returnZero: true});	//should return object zero
					maxLiability = itpm.getLiability({returnZero: true});		//should return object zero
					break;
				case '2':	//PENDING APPROVAL
					leSpend = estimatedSpend;
					actualSpend = itpm.getSpend({returnZero: true});			//should return object zero
					expectedLiability = itpm.getLiability({returnZero: true});	//should return object zero
					maxLiability = itpm.getLiability({returnZero: true});		//should return object zero
					break;
				case '4':	//REJECTED
					leSpend = itpm.getSpend({returnZero: true});				//should return object zero
					actualSpend = itpm.getSpend({returnZero: true});			//should return object zero
					expectedLiability = itpm.getLiability({returnZero: true});	//should return object zero
					maxLiability = itpm.getLiability({returnZero: true});		//should return object zero
					break;
				case '5':	//VOIDED
					leSpend = itpm.getSpend({returnZero: true});				//should return object zero
					actualSpend = itpm.getSpend({returnZero: true});			//should return object zero
					expectedLiability = itpm.getLiability({returnZero: true});	//should return object zero
					maxLiability = itpm.getLiability({returnZero: true});		//should return object zero
					break;
				case '3':	//APPROVED
					
					if (key.condition == '1'){	//condition == Future
						
						leSpend = estimatedSpend;
						actualSpend = itpm.getSpend({returnZero: true});			//should return object zero
						expectedLiability = itpm.getLiability({returnZero: true});	//should return object zero
						maxLiability = itpm.getLiability({returnZero: true});		//should return object zero
						expectedLiability.ls = maxLiability.ls = estimatedSpend.ls;
					
					} else if (key.condition == '2') {	//condition == Active
						
						var actQty = (kpi_actualQty.error)? 0 : kpi_actualQty.quantity;
						var leQuantity = (parseFloat(values.estPromoted)>=parseFloat(kpi_actualQty.quantity))? values.estPromoted : kpi_actualQty.quantity;
						log.debug('leQuantity', leQuantity);
						
						actualSpend = itpm.getSpend({
							returnZero: false, 
							actual: true, 
							promotionId: key.pid,
							itemId: key.item,
							quantity: actQty, 
							rateBB: values.estRateBB, 
							rateOI: values.estRateOI, 
							rateNB: values.estRateNB
							});
						
						if (key.noActuals){	//DON'T USE ACTUALS
							leSpend = estimatedSpend;
							
							expectedLiability = itpm.getLiability({
								returnZero: false, 
								quantity: values.estTotal, 
								rateBB: values.estRateBB, 
								rateOI: values.estRateOI, 
								rateNB: values.estRateNB, 
								redemption: values.estRedemption
								});
							
							maxLiability = itpm.getLiability({
								returnZero: false, 
								quantity: values.estTotal, 
								rateBB: values.estRateBB, 
								rateOI: values.estRateOI, 
								rateNB: values.estRateNB, 
								redemption: '100%'
								});
						} else {	//USE ACTUALS
							expectedLiability = itpm.getLiability({
								returnZero: false, 
								quantity: actQty, 
								rateBB: values.estRateBB, 
								rateOI: values.estRateOI, 
								rateNB: values.estRateNB, 
								redemption: values.estRedemption
								});
							
							maxLiability = itpm.getLiability({
								returnZero: false, 
								quantity: actQty, 
								rateBB: values.estRateBB, 
								rateOI: values.estRateOI, 
								rateNB: values.estRateNB, 
								redemption: '100%'
								});
							
							if (!estimatedSpend.error && !expectedLiability.error && !actualSpend.error){
								leSpend = {
									error: false,
									bb: (estimatedSpend.bb > expectedLiability.bb) ? estimatedSpend.bb : expectedLiability.bb,
									oi: (estimatedSpend.oi > expectedLiability.oi) ? estimatedSpend.oi : expectedLiability.oi,
									nb: (estimatedSpend.nb > expectedLiability.nb) ? estimatedSpend.nb : expectedLiability.nb,
									ls: (estimatedSpend.ls > actualSpend.ls) ? estimatedSpend.ls : actualSpend.ls
								};
							} else {
								leSpend = {
									error: true,
									spend: 0,
									bb: 0,
									oi: 0,
									nb: 0,
									ls: 0
								};
							}
						}
						expectedLiability.ls = maxLiability.ls = estimatedSpend.ls;
						
					} else if (key.condition == '3') {	//condition == Completed
												
						var actQty = kpi_actualQty.quantity;
						log.debug('actQty', actQty);
						
						actualSpend = itpm.getSpend({
							returnZero: false, 
							actual: true, 
							promotionId: key.pid,
							itemId: key.item, 
							quantity: actQty, 
							rateBB: values.estRateBB, 
							rateOI: values.estRateOI, 
							rateNB: values.estRateNB
							});
						
						if (key.noActuals){
							expectedLiability = itpm.getLiability({
								returnZero: false, 
								quantity: values.estTotal, 
								rateBB: values.estRateBB, 
								rateOI: values.estRateOI, 
								rateNB: values.estRateNB, 
								redemption: values.estRedemption
								});
							
							maxLiability = itpm.getLiability({
								returnZero: false, 
								quantity: values.estTotal, 
								rateBB: values.estRateBB, 
								rateOI: values.estRateOI, 
								rateNB: values.estRateNB, 
								redemption: '100%'
								});
						} else {
							expectedLiability = itpm.getLiability({
								returnZero: false, 
								quantity: actQty, 
								rateBB: values.estRateBB, 
								rateOI: values.estRateOI, 
								rateNB: values.estRateNB, 
								redemption: values.estRedemption
								});
							
							maxLiability = itpm.getLiability({
								returnZero: false, 
								quantity: actQty, 
								rateBB: values.estRateBB, 
								rateOI: values.estRateOI, 
								rateNB: values.estRateNB, 
								redemption: '100%'
								});
						}
						
						expectedLiability.ls = maxLiability.ls = estimatedSpend.ls;
						
						leSpend = {
								error: false,
								spend: 0,
								bb: 0,
								oi: 0,
								nb: 0,
								ls: 0
							};
						
						if (!actualSpend.error){
							leSpend.oi = actualSpend.oi;
							leSpend.nb = actualSpend.nb;
							
							if (!estimatedSpend.error){
								leSpend.ls = (actualSpend.ls > estimatedSpend.ls) ? actualSpend.ls : estimatedSpend.ls;
							} else {
								leSpend.error = true;
							}
							
							if (!expectedLiability.error){
								leSpend.bb = (actualSpend.bb > expectedLiability.bb) ? actualSpend.bb : expectedLiability.bb;
							} else {
								leSpend.error = true;
							}
						} else {
							leSpend.error = true;
						}
					}
					break;
				case '6':	//CLOSED
					var actQty = kpi_actualQty.quantity;
					leSpendLS = (key.actSpendLS)?parseFloat(key.actSpendLS):0;
					
					actualSpend = itpm.getSpend({
						returnZero: false, 
						actual: true, 
						promotionId: key.pid,
						itemId: key.item, 
						quantity: actQty, 
						rateBB: values.estRateBB, 
						rateOI: values.estRateOI, 
						rateNB: values.estRateNB
						});
					
					leSpend = actualSpend;
					
					if (key.noActuals){
						expectedLiability = itpm.getLiability({
							returnZero: false, 
							quantity: values.estTotal, 
							rateBB: values.estRateBB, 
							rateOI: values.estRateOI, 
							rateNB: values.estRateNB, 
							redemption: values.estRedemption
							});
						
						maxLiability = itpm.getLiability({
							returnZero: false, 
							quantity: values.estTotal, 
							rateBB: values.estRateBB, 
							rateOI: values.estRateOI, 
							rateNB: values.estRateNB, 
							redemption: '100%'
							});
						expectedLiability.ls = maxLiability.ls = estimatedSpend.ls;
					} else {
						expectedLiability = itpm.getLiability({
							returnZero: false, 
							quantity: actQty, 
							rateBB: values.estRateBB, 
							rateOI: values.estRateOI, 
							rateNB: values.estRateNB, 
							redemption: values.estRedemption
							});
						
						maxLiability = itpm.getLiability({
							returnZero: false, 
							quantity: actQty, 
							rateBB: values.estRateBB, 
							rateOI: values.estRateOI, 
							rateNB: values.estRateNB, 
							redemption: '100%'
							});
						expectedLiability.ls = maxLiability.ls = parseFloat(key.lsallfactoractual)*plumpsum;
					}
					break;
				default:
					leSpend = estimatedSpend;
					actualSpend = itpm.getSpend({returnZero: true});			//should return object zero
					expectedLiability = itpm.getLiability({returnZero: true});	//should return object zero
					maxLiability = itpm.getLiability({returnZero: true});		//should return object zero
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
        	
        	//creating the comment for last update message
        	var lastUpdateMsg = "Last calculated on "+format.format({
        			value: new Date(),
        			type: format.Type.DATE
        	    })+" at time "+format.format({
        	    	value: new Date(),
        	    	type: format.Type.TIMEOFDAY
        	    })+".";
        	
        	/**** SET KPI FIELD VALUES ****/
        	var kpiUpdated = record.submitFields({
        		type: 'customrecord_itpm_kpi',
        		id: key.kpi,
        		values: {
        			'custrecord_itpm_kpi_esttotalqty' : kpi_promoQty,
        			'custrecord_itpm_kpi_actualtotalqty' : kpi_actualQty.quantity,
        			'custrecord_itpm_kpi_maximumliabilityls' : maxLiability.ls,
        			'custrecord_itpm_kpi_maximumliabilitybb' : maxLiability.bb,
        			'custrecord_itpm_kpi_maximumliabilityoi' : maxLiability.oi,
        			'custrecord_itpm_kpi_maximumliabilitynb' : maxLiability.nb,
        			'custrecord_itpm_kpi_expectedliabilityls' : expectedLiability.ls,
        			'custrecord_itpm_kpi_expectedliabilitybb' : expectedLiability.bb,
        			'custrecord_itpm_kpi_expectedliabilityoi' : expectedLiability.oi,
        			'custrecord_itpm_kpi_expectedliabilitynb' : expectedLiability.nb,
        			'custrecord_itpm_kpi_estimatedspendls' : estimatedSpend.ls,
        			'custrecord_itpm_kpi_estimatedspendbb' : estimatedSpend.bb,
        			'custrecord_itpm_kpi_estimatedspendoi' : estimatedSpend.oi,
        			'custrecord_itpm_kpi_estimatedspendnb' : estimatedSpend.nb,
        			'custrecord_itpm_kpi_lespendls' : leSpend.ls,
        			'custrecord_itpm_kpi_lespendbb' : leSpend.bb,
        			'custrecord_itpm_kpi_lespendoi' : leSpend.oi,
        			'custrecord_itpm_kpi_lespendnb' : leSpend.nb,
        			'custrecord_itpm_kpi_actualspendls' :actualSpend.ls,
        			'custrecord_itpm_kpi_actualspendbb' :actualSpend.bb,
        			'custrecord_itpm_kpi_actualspendoi' :actualSpend.oi,
        			'custrecord_itpm_kpi_actualspendnb' :actualSpend.nb,
                  	'custrecord_itpm_kpi_factorestls':key.lsallfactorest,
        			'custrecord_itpm_kpi_lastupdatemessage':lastUpdateMsg
        		},
        		options: {enablesourcing: true, ignoreMandatoryFields: true}
        	});
        	log.debug('KPI Updated', kpiUpdated);
        	
        	//---------------------------------------------------
        	//====== Logic to calculate Allocation Factors ======
        	//---------------------------------------------------
        	log.debug('====== Allocation Factors Calculations =======');
        	
        	if (key.pAllocationType != 4) {
        		if (key.status == 1){
        			itpm.processAllocationsDraft(key.pid, key.pAllocationType);
        		} else if (key.status == 3){
        			itpm.processAllocationsDraft(key.pid, key.pAllocationType);
        			itpm.approvedAllocationFactorActual(key.pid);
        		}
        	}
        	
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
