/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/search',
        'N/runtime',
        './iTPM_Module.js'
        ],
/**
 * @param {search} search
 */
function(search, runtime, itpm) {
   
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
    		var scriptObj = runtime.getCurrentScript();
    		log.debug('start getinput usage',scriptObj.getRemainingUsage());
    		var arrObjs = [];
        	[37,36,46].forEach(function(promoid){
        		search.create({
        			type:'customrecord_itpm_promotiondeal',
        			columns:['custrecord_itpm_p_status',
        			         'custrecord_itpm_p_condition',
        			         'custrecord_itpm_p_lumpsum',
        			         'custrecord_itpm_p_shipstart',
        			         'custrecord_itpm_p_shipend',
        			         'custrecord_itpm_p_customer',
        			         'custrecord_itpm_p_itempricelevel',
        			         'custrecord_itpm_p_allocationtype',
        			         'custrecord_itpm_p_type.custrecord_itpm_pt_dontupdate_lbonactual',
        			         'custrecord_itpm_kpi_promotiondeal.internalid',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_item',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_lespendbb',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_lespendoi',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_lespendnb'
        			         ],
        			filters:[['internalid','anyof',promoid],'and',
        			         ['isinactive','is',false]]
        		}).run().each(function(promo){
        			arrObjs.push({
        				kpi_id		  	:	promo.getValue({name:'internalid',join:'custrecord_itpm_kpi_promotiondeal'}),
        				kpi_queue_id	: 	1,
        				promo_details 	: 	{
        						promo_id		: 	promoid,
        						promo_status	:   promo.getValue('custrecord_itpm_p_status'),
        						promo_condition	: 	promo.getValue('custrecord_itpm_p_condition'),
        						promo_lumpsum	:	promo.getValue('custrecord_itpm_p_lumpsum'),
        						promo_start		:	promo.getValue('custrecord_itpm_p_shipstart'),
        						promo_end		:	promo.getValue('custrecord_itpm_p_shipend'),
        						promo_customer	:	promo.getValue('custrecord_itpm_p_customer'),
        						promo_pricelevel:	promo.getValue('custrecord_itpm_p_customer'),
        						promo_alltype	: 	promo.getValue('custrecord_itpm_p_allocationtype')
        				},
        				kpi_details		:	{
        						kpi_item 	: 	promo.getValue({name:'custrecord_itpm_kpi_item',join:'custrecord_itpm_kpi_promotiondeal'}),
        						kpi_leSpBB	:	promo.getValue({name:'custrecord_itpm_kpi_lespendbb',join:'custrecord_itpm_kpi_promotiondeal'}),
        						kpi_leSpOI	:	promo.getValue({name:'custrecord_itpm_kpi_lespendoi',join:'custrecord_itpm_kpi_promotiondeal'}),
        						kpi_leSpNB	:	promo.getValue({name:'custrecord_itpm_kpi_lespendnb',join:'custrecord_itpm_kpi_promotiondeal'})
        				},
        				promotype_details:	{
        						donotupdatelib : promo.getValue({name:'custrecord_itpm_pt_dontupdate_lbonactual',join:'custrecord_itpm_p_type'})		
        				},
        				
        			});
        			return true;
        		});
        	});
        	log.debug('arrObjs',arrObjs);
        	log.debug('end getinput usage',scriptObj.getRemainingUsage());
        	return arrObjs;
    	}catch(ex){
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
    		var scriptObj = runtime.getCurrentScript();
    		log.debug('start map usage',scriptObj.getRemainingUsage());
    		var resultObj = JSON.parse(context.value);
    		var promoDetails = resultObj['promo_details'];
    		log.debug('resultObj',resultObj);
    		var estQty = {};
        	var estQtyResult = search.create({
        		type:'customrecord_itpm_estquantity',
        		columns:['custrecord_itpm_estqty_qtyby',
        		         'custrecord_itpm_estqty_totalqty',
        		         'custrecord_itpm_estqty_estpromotedqty',
        		         'custrecord_itpm_estqty_totalrate',
        		         'custrecord_itpm_estqty_totalpercent',
        		         'custrecord_itpm_estqty_rateperunitbb',
        		         'custrecord_itpm_estqty_rateperunitoi',
        		         'custrecord_itpm_estqty_rateperunitnb',
        		         'custrecord_itpm_estqty_redemption'],
        		filters:[['custrecord_itpm_estqty_promodeal','anyof',resultObj['promo_details'].promo_id],'and',
        		         ['isinactive','is',false]]
        	}).run().getRange(0,1);
        	
        	//if estqty search returns zero or more than one result
        	if (estQtyResult.length == 0 || estQtyResult.length > 1){
    			throw {
    				name: 'ESTQTY_SEARCH_ERROR', 
    				message:'Saved search for EstQty returned zero or more than one results PromotionId: ' + resultObj['promo_details'].promo_id + '; ItemID: ' + resultObj['kpi_details'].kpi_item 
    			};
    		}else{
    			estQty.estid = estQtyResult[0].getValue({name:'id'});
    			estQty.estUnit = estQtyResult[0].getValue({name:'custrecord_itpm_estqty_qtyby'});
    			estQty.estTotal = estQtyResult[0].getValue({name:'custrecord_itpm_estqty_totalqty'});
    			estQty.estPromoted = estQtyResult[0].getValue({name:'custrecord_itpm_estqty_estpromotedqty'});
    			estQty.estRate = estQtyResult[0].getValue({name:'custrecord_itpm_estqty_totalrate'});
    			estQty.estPercent = estQtyResult[0].getValue({name:'custrecord_itpm_estqty_totalpercent'});
    			estQty.estRateBB = estQtyResult[0].getValue({name:'custrecord_itpm_estqty_rateperunitbb'});
    			estQty.estRateOI = estQtyResult[0].getValue({name:'custrecord_itpm_estqty_rateperunitoi'});
    			estQty.estRateNB = estQtyResult[0].getValue({name:'custrecord_itpm_estqty_rateperunitnb'});
    			estQty.estRedemption = estQtyResult[0].getValue({name:'custrecord_itpm_estqty_redemption'});
    		}

        	var estimatedSpend = itpm.getSpend({
        		returnZero: false, 
        		quantity: estQty.estPromoted, 
        		rateBB: estQty.estRateBB, 
        		rateOI: estQty.estRateOI, 
        		rateNB: estQty.estRateNB
        	});
        	var actualSpend = itpm.getSpend({
				returnZero: false, 
				actual: true, 
				promotionId: promoDetails.promo_id,
				itemId: resultObj['kpi_details'].kpi_item, 
				quantity: actQty, 
				rateBB: estQty.estRateBB, 
				rateOI: estQty.estRateOI, 
				rateNB: estQty.estRateNB
			});
        	var kpi_actualQty = itpm.getActualQty(resultObj['kpi_details'].kpi_item, promoDetails.promo_customer, promoDetails.promo_start, promoDetails.promo_end);
        	kpi_actualQty.quantity = (util.isNumber(kpi_actualQty.quantity))? kpi_actualQty.quantity : 0;
        	var actQty = (kpi_actualQty.error)? 0 : kpi_actualQty.quantity;
        	var expectedLiability, maxLiability, leSpendLS;
        	var leSpend = {
					error: false,
					spend: 0,
					bb: 0,
					oi: 0,
					nb: 0,
					ls: 0
			};
        	
        	//calculating expected and maximum liabilities
			expectedLiability = itpm.getLiability({
				returnZero: false, 
				quantity: (resultObj['promotype_details'].donotupdatelib)? estQty.estTotal : actQty, 
				rateBB: estQty.estRateBB, 
				rateOI: estQty.estRateOI, 
				rateNB: estQty.estRateNB, 
				redemption: estQty.estRedemption
			});

			maxLiability = itpm.getLiability({
				returnZero: false, 
				quantity: (resultObj['promotype_details'].donotupdatelib)? estQty.estTotal : actQty, 
				rateBB: estQty.estRateBB, 
				rateOI: estQty.estRateOI, 
				rateNB: estQty.estRateNB, 
				redemption: '100%'
			});
        	
        	//logic works base on promotion status
        	switch(promoDetails.promo_status){
        	case '5':
        		leSpend = itpm.getSpend({returnZero: true});				//should return object zero
        		actualSpend = itpm.getSpend({returnZero: true});			//should return object zero
        		expectedLiability = itpm.getLiability({returnZero: true});	//should return object zero
        		maxLiability = itpm.getLiability({returnZero: true});		//should return object zero
        		break;
        	case '6':	//CLOSED
        		leSpend = actualSpend;
        		break;
        	case '3':	//APPROVED
        		
        		if (promoDetails.promo_condition == '1'){	//condition == Future
        			leSpend = estimatedSpend;
        			expectedLiability = itpm.getLiability({returnZero: true});	//should return object zero
        			maxLiability = itpm.getLiability({returnZero: true});		//should return object zero
        		} else if (promoDetails.promo_condition == '2') {	//condition == Active
        			//if functions return values without any errors
        			if (!estimatedSpend.error && !expectedLiability.error && !actualSpend.error){
        				leSpend = {
        						error: false,
        						bb: (estimatedSpend.bb > expectedLiability.bb) ? estimatedSpend.bb : expectedLiability.bb,
        						oi: (estimatedSpend.oi > expectedLiability.oi) ? estimatedSpend.oi : expectedLiability.oi,
        						nb: (estimatedSpend.nb > expectedLiability.nb) ? estimatedSpend.nb : expectedLiability.nb,
        						ls: (estimatedSpend.ls > actualSpend.ls) ? estimatedSpend.ls : actualSpend.ls
        				};
        			}
        			
        			leSpend = (resultObj['promotype_details'].donotupdatelib)? estimatedSpend : leSpend;
        			
        		}else if (promoDetails.promo_condition == '3') {	//condition == Completed

        			if (!actualSpend.error){
        				leSpend.oi = actualSpend.oi;
        				leSpend.nb = actualSpend.nb;
        				
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
			default:
				leSpend = estimatedSpend;
				expectedLiability = itpm.getLiability({returnZero: true});	//should return object zero
				maxLiability = itpm.getLiability({returnZero: true});		//should return object zero
				break;
        	}
        	log.debug('le spend '+resultObj.kpi_id,leSpend);
    		log.debug('end map usage '+resultObj.kpi_id,scriptObj.getRemainingUsage());
    		context.write({
    			key	:	{ 
    				kpi_id		:	resultObj.kpi_id,
    				kpi_item	:	resultObj['kpi_details'].kpi_item
    			},
    			value:{
    				promo_details : promoDetails, 
    				kpi_details	  :	{
    					'custrecord_itpm_kpi_lespendbb' : leSpend.bb,
            			'custrecord_itpm_kpi_lespendoi' : leSpend.oi,
            			'custrecord_itpm_kpi_lespendnb' : leSpend.nb,
            			'custrecord_itpm_kpi_maximumliabilitybb' : maxLiability.bb,
            			'custrecord_itpm_kpi_maximumliabilityoi' : maxLiability.oi,
            			'custrecord_itpm_kpi_maximumliabilitynb' : maxLiability.nb,
            			'custrecord_itpm_kpi_expectedliabilitybb' : expectedLiability.bb,
            			'custrecord_itpm_kpi_expectedliabilityoi' : expectedLiability.oi,
            			'custrecord_itpm_kpi_expectedliabilitynb' : expectedLiability.nb
    				}
    			}
    		});
    	}catch(ex){
    		log.error('MAP_ERROR', ex.name + '; ' + ex.message + '; Key: ' + context.key);
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
    		var detailsObj = JSON.parse(context.values[0]);
        	var keyObj = JSON.parse(context.key);
        	log.debug('context reduce ' + keyObj.kpi_id,detailsObj);
    	}catch(ex){
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

    }
    
    
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
