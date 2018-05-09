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
/**
 * @param {search} search
 */
function(search, runtime, record, formatModule, itpm) {
   
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
    		log.audit('start getinput usage',scriptObj.getRemainingUsage());
    		var arrObjs = [];
    		var noEstTotalQty = false;
    		var promo_hasSales = false;
    		var sales_exist = false;
    		var total_rev = 0, promoid;
    		
    		//kpi queue record search
    		search.create({
    			type:'customrecord_itpm_kpiqueue',
    			columns:[search.createColumn({name:'internalid',sort:search.Sort.ASC}),
    			         'custrecord_itpm_kpiq_promotion'],
    			filters:[['custrecord_itpm_kpiq_start','isempty',null],'and',
    			         ['custrecord_itpm_kpiq_end','isempty',null],'and',
    			         ['custrecord_itpm_kpiq_queuerequest','noneof',1]]
    		}).run().each(function(kpiQueue){
    			 //update the kpi queue record with start date
    			 record.submitFields({
    				 type:'customrecord_itpm_kpiqueue',
    				 id:kpiQueue.getValue('internalid'),
    				 values:{
    					 'custrecord_itpm_kpiq_start':formatModule.format({value:new Date(),type:formatModule.Type.DATETIME})
    				 },
    				 options:{
    					 enableSourcing:false,
    					 ignoreMandatoryFields:true
    				 }
    			 });
    			
    			log.audit('getinput create promo search usage '+kpiQueue.getValue('internalid'),scriptObj.getRemainingUsage());
    			
    			promoid = kpiQueue.getValue('custrecord_itpm_kpiq_promotion');
        		noEstTotalQty = sales_exist = false;
        		total_rev = 0;
        		
        		//search for promotion and kpi records
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
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_estimatedspendbb',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_estimatedspendoi',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_estimatedrevenue',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_esttotalqty',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_item',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_lespendbb',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_lespendoi',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_lespendnb',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_factorestls',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_factoractualls'
        			         ],
        			filters:[['internalid','anyof',promoid],'and',
        			         ['isinactive','is',false]]
        		}).run().each(function(promo){
        			if(!noEstTotalQty){
        				noEstTotalQty = parseFloat(promo.getValue({name:'custrecord_itpm_kpi_esttotalqty',join:'custrecord_itpm_kpi_promotiondeal'})) <= 0
        			}
        			
        			if(!sales_exist){
        				promo_hasSales = itpm.hasSales({
        	        		promotionId: promoid,
        	        		shipStart: promo.getValue('custrecord_itpm_p_shipstart'),
        	        		shipEnd: promo.getValue('custrecord_itpm_p_shipend'),
        	        		customerId: promo.getValue('custrecord_itpm_p_customer')
        				});
        				total_rev = promo_hasSales.totalRev;
        				promo_hasSales = promo_hasSales.hasSales;
        				sales_exist = true;
        				log.audit('getinput hassales usage',scriptObj.getRemainingUsage());
        			}
        			
        			arrObjs.push({
        				kpi_id		  	:	promo.getValue({name:'internalid',join:'custrecord_itpm_kpi_promotiondeal'}),
        				kpi_queue_id	: 	kpiQueue.getValue('internalid'),
        				noEstTotalQty	: 	noEstTotalQty,
        				promo_details 	: 	{
        						promo_id		: 	promoid,
        						promo_status	:   promo.getValue('custrecord_itpm_p_status'),
        						promo_condition	: 	promo.getValue('custrecord_itpm_p_condition'),
        						promo_lumpsum	:	promo.getValue('custrecord_itpm_p_lumpsum'),
        						promo_start		:	promo.getValue('custrecord_itpm_p_shipstart'),
        						promo_end		:	promo.getValue('custrecord_itpm_p_shipend'),
        						promo_customer	:	promo.getValue('custrecord_itpm_p_customer'),
        						promo_pricelevel:	promo.getValue('custrecord_itpm_p_itempricelevel'),
        						promo_alltype	: 	promo.getValue('custrecord_itpm_p_allocationtype'),
        						promo_hasSales	: 	promo_hasSales,
        						donotupdatelib  : 	promo.getValue({name:'custrecord_itpm_pt_dontupdate_lbonactual',join:'custrecord_itpm_p_type'}),
        						total_rev	    : 	total_rev,
        						estimated_spendbb_sum : 0,
        						estimated_spendoi_sum : 0
        				},
        				kpi_details		:	{
        						kpi_item 	  :   promo.getValue({name:'custrecord_itpm_kpi_item',join:'custrecord_itpm_kpi_promotiondeal'}),
        						kpi_leSpBB	  :	  promo.getValue({name:'custrecord_itpm_kpi_lespendbb',join:'custrecord_itpm_kpi_promotiondeal'}),
        						kpi_leSpOI	  :	  promo.getValue({name:'custrecord_itpm_kpi_lespendoi',join:'custrecord_itpm_kpi_promotiondeal'}),
        						kpi_leSpNB	  :   promo.getValue({name:'custrecord_itpm_kpi_lespendnb',join:'custrecord_itpm_kpi_promotiondeal'}),
        						kpi_estrev	  :   promo.getValue({name:'custrecord_itpm_kpi_estimatedrevenue',join:'custrecord_itpm_kpi_promotiondeal'}),
        						kpi_estspendbb:   promo.getValue({name:'custrecord_itpm_kpi_estimatedspendbb',join:'custrecord_itpm_kpi_promotiondeal'}),
        						kpi_estspendoi:   promo.getValue({name:'custrecord_itpm_kpi_estimatedspendoi',join:'custrecord_itpm_kpi_promotiondeal'}),
        						kpi_factor_estls :   promo.getValue({name:'custrecord_itpm_kpi_factorestls',join:'custrecord_itpm_kpi_promotiondeal'}),
        						kpi_factor_actls : 	 promo.getValue({name:'custrecord_itpm_kpi_factoractualls',join:'custrecord_itpm_kpi_promotiondeal'})
        				}
        			});
        			log.audit('per kpi getinput usage',scriptObj.getRemainingUsage());
        			return true;
        		});
        		return true;
        	});
    		log.audit('before catch getinput usage',scriptObj.getRemainingUsage());
    	}catch(ex){
    		log.error('GetInputData Error', ex.name + '; ' + ex.message);
    	}finally{
    		log.debug('arrObjs',arrObjs);
        	log.audit('end getinput usage',scriptObj.getRemainingUsage());
        	return arrObjs;
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
    		log.audit('start map usage',scriptObj.getRemainingUsage());
    		var resultObj = JSON.parse(context.value);
    		log.debug('resultObj',resultObj);
    		var promoDetails = resultObj['promo_details'];
    		var kpiDetails	= resultObj['kpi_details'];
//    		log.debug('resultObj',resultObj);
    		
        	//creating the kpi queue detail record
        	createKpiQueueDetailRecord(1, resultObj.kpi_queue_id, context.key ,context.value);
    		
    		var estQty = {};
        	var estQtyResult = getEstQtyResults(promoDetails.promo_id, kpiDetails.kpi_item, false); //consider the item in search filter
        	
        	//calculating the kpiFactorEstLS
        	var kpi_factor_estls = parseFloat(kpiDetails.kpi_factor_estls), kpi_factor_actls = parseFloat(kpiDetails.kpi_factor_actls);
        	var estQtyCount = getEstQtyResults(promoDetails.promo_id, kpiDetails.kpi_item, true); //neglect the item in search filter
    		estQtyCount = estQtyCount[0].getValue({name:'internalid',summary:search.Summary.COUNT});
    		
    		//calculating the LS Estimated Allocation Factor
    		if(promoDetails.promo_status == '3' && promoDetails.promo_alltype != '4'){
            	if(resultObj.noEstTotalQty){
            		kpi_factor_estls = (1/parseFloat(estQtyCount));
            	}else{
            		var totalEstRev = search.create({
    	        			type:'customrecord_itpm_kpi',
    	        			columns:[
    		        			search.createColumn({
    			        			name:'custrecord_itpm_kpi_estimatedrevenue',
    			        			summary:search.Summary.SUM
    		        			})
    	        			],
    	        			filters:[
    		        			['custrecord_itpm_kpi_promotiondeal','anyof',promoDetails.promo_id],'and',
    		        			['isinactive','is',false]
    	        			]
            		}).run().getRange(0,1)[0].getValue({name:'custrecord_itpm_kpi_estimatedrevenue',summary:search.Summary.SUM});
            		log.debug('kpi_estrev',kpiDetails.kpi_estrev);
            		kpi_factor_estls = (parseFloat(kpiDetails.kpi_estrev)/parseFloat(totalEstRev));
            		kpi_factor_estls = isNaN(kpi_factor_estls)? 0 : kpi_factor_estls;
            	}
            	log.debug('kpi_factor_estls',kpi_factor_estls);
            	//calculating the LS Actual Allocation Factor
            	if(promoDetails.donotupdatelib || !promoDetails.promo_hasSales){
            		kpi_factor_actls = kpi_factor_estls;
            	}else{
            		var kpi_item_rev = itpm.hasSales({
            			promotionId: promoDetails.promo_id,
            			shipStart: promoDetails.promo_start,
            			shipEnd: promoDetails.promo_end,
            			customerId: promoDetails.promo_customer,
            			kpiItem: kpiDetails.kpi_item
            		}).totalRev;
            		kpi_factor_actls = (parseFloat(kpi_item_rev)/parseFloat(promoDetails.total_rev));
            		kpi_factor_actls = isNaN(kpi_factor_actls)? 0 : kpi_factor_actls;
            	}
        	}
    		
        	//if estqty search returns zero or more than one result
        	if (estQtyResult.length == 0 || estQtyResult.length > 1){
    			throw {
    				name: 'ESTQTY_SEARCH_ERROR', 
    				message:'Saved search for EstQty returned zero or more than one results PromotionId: ' + resultObj['promo_details'].promo_id + '; ItemID: ' + resultObj['kpi_details'].kpi_item 
    			};
    		}else{
    			estQty.estid = estQtyResult[0].getValue({name:'internalid'});
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
        	estimatedSpend.ls = (parseFloat(kpi_factor_estls)* parseFloat(promoDetails.promo_lumpsum)).toFixed(2);
        	
        	log.debug('estimatedSpend',estimatedSpend);
        	
        	var kpi_actualQty = itpm.getActualQty(kpiDetails.kpi_item, promoDetails.promo_customer, promoDetails.promo_start, promoDetails.promo_end);
        	var actQty = (util.isNumber(kpi_actualQty.quantity))? kpi_actualQty.quantity : 0;
        	var leSpend = {
					error: false,
					spend: 0,
					bb: 0,
					oi: 0,
					nb: 0,
					ls: 0
			};
        	
        	var actualSpend = itpm.getSpend({
				returnZero: false, 
				actual: true, 
				promotionId: promoDetails.promo_id,
				itemId: kpiDetails.kpi_item, 
				quantity: actQty, 
				rateBB: estQty.estRateBB, 
				rateOI: estQty.estRateOI, 
				rateNB: estQty.estRateNB
			});
        	
        	//calculating expected and maximum liabilities
			var expectedLiability = itpm.getLiability({
				returnZero: false, 
				quantity: (promoDetails.donotupdatelib)? estQty.estTotal : actQty, 
				rateBB: estQty.estRateBB, 
				rateOI: estQty.estRateOI, 
				rateNB: estQty.estRateNB, 
				redemption: estQty.estRedemption
			});
			log.debug('expectedlib '+resultObj.kpi_id,expectedLiability);
			
			var maxLiability = itpm.getLiability({
				returnZero: false, 
				quantity: (promoDetails.donotupdatelib)? estQty.estTotal : actQty, 
				rateBB: estQty.estRateBB, 
				rateOI: estQty.estRateOI, 
				rateNB: estQty.estRateNB, 
				redemption: '100%'
			});
        	
        	//logic works base on promotion status
        	switch(promoDetails.promo_status){
        	case '5': //VOIDED
        		leSpend = itpm.getSpend({returnZero: true});				//should return object zero
        		actualSpend = itpm.getSpend({returnZero: true});			//should return object zero
        		expectedLiability = itpm.getLiability({returnZero: true});	//should return object zero
        		maxLiability = itpm.getLiability({returnZero: true});		//should return object zero
        		break;
        	case '6':	//CLOSED
        		leSpend = actualSpend;
        		if(promoDetails.donotupdatelib){
        			expectedLiability.ls = maxLiability.ls = estimatedSpend.ls;
        		}else{
        			expectedLiability.ls = maxLiability.ls = (kpi_factor_actls * parseFloat(promoDetails.promo_lumpsum)).toFixed(2);
        		}
        		break;
        	case '3':	//APPROVED
        		
        		if (promoDetails.promo_condition == '1'){	//condition == Future
        			
        			leSpend = estimatedSpend;
        			actualSpend = itpm.getSpend({returnZero:true});				//should return object zero
        			expectedLiability = itpm.getLiability({returnZero: true});	//should return object zero
        			maxLiability = itpm.getLiability({returnZero: true});		//should return object zero
        			expectedLiability.ls = maxLiability.ls = estimatedSpend.ls;
        			
        		} else if (promoDetails.promo_condition == '2') {	//condition == Active
        			
        			expectedLiability.ls = maxLiability.ls = estimatedSpend.ls;
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
        			leSpend = (promoDetails.donotupdatelib)? estimatedSpend : leSpend;
        			
        		}else if (promoDetails.promo_condition == '3') {	//condition == Completed
        			
        			expectedLiability.ls = maxLiability.ls = estimatedSpend.ls;
        			if (!actualSpend.error){
        				leSpend.oi = actualSpend.oi;
        				leSpend.nb = actualSpend.nb;
        				
        				if (!estimatedSpend.error){
							leSpend.ls = (actualSpend.ls > estimatedSpend.ls) ? actualSpend.ls : estimatedSpend.ls;
						}
        				
        				if (!expectedLiability.error){
        					leSpend.bb = (actualSpend.bb > expectedLiability.bb) ? actualSpend.bb : expectedLiability.bb;
        				}
        			}
        			
        		}
        		break;
			default:
				leSpend = estimatedSpend;
				actualSpend = itpm.getSpend({returnZero: true});			//should return object zero
				expectedLiability = itpm.getLiability({returnZero: true});	//should return object zero
				maxLiability = itpm.getLiability({returnZero: true});		//should return object zero
				break;
        	}
        	
        	//creating the context write object
        	var contextObj = {
        			key	:	{
        				promo_id : promoDetails.promo_id,
        				kpi_queue_id : resultObj.kpi_queue_id,
        				donotupdatelib : promoDetails.donotupdatelib,
        				promo_hasSales : promoDetails.promo_hasSales,
        				promo_status   : promoDetails.promo_status,
        				promo_alltype  : promoDetails.promo_alltype,
        				est_qty_count : estQtyCount,
        			},
        			value	:	{
        				kpi_id : resultObj.kpi_id,
        				kpi_expect_bb : expectedLiability.bb.toFixed(2),
        				kpi_expect_oi : expectedLiability.oi.toFixed(2),
        				update_fields:{
        					'custrecord_itpm_kpi_actualtotalqty' : actQty,
        					'custrecord_itpm_kpi_lespendbb' : leSpend.bb.toFixed(2),
        					'custrecord_itpm_kpi_lespendoi' : leSpend.oi.toFixed(2),
        					'custrecord_itpm_kpi_lespendnb' : leSpend.nb.toFixed(2),
        					'custrecord_itpm_kpi_lespendls' : leSpend.ls,
        					'custrecord_itpm_kpi_maximumliabilitybb' : maxLiability.bb.toFixed(2),
        					'custrecord_itpm_kpi_maximumliabilityoi' : maxLiability.oi.toFixed(2),
        					'custrecord_itpm_kpi_maximumliabilitynb' : maxLiability.nb.toFixed(2),
        					'custrecord_itpm_kpi_maximumliabilityls' : maxLiability.ls,
        					'custrecord_itpm_kpi_expectedliabilitybb' : expectedLiability.bb.toFixed(2),
        					'custrecord_itpm_kpi_expectedliabilityoi' : expectedLiability.oi.toFixed(2),
        					'custrecord_itpm_kpi_expectedliabilitynb' : expectedLiability.nb.toFixed(2),
        					'custrecord_itpm_kpi_expectedliabilityls' : expectedLiability.ls,
        					'custrecord_itpm_kpi_factorestls' : kpi_factor_estls.toFixed(6),
        					'custrecord_itpm_kpi_factoractualls' : kpi_factor_actls.toFixed(6),
        					'custrecord_itpm_kpi_allocfactcalculated' : true
        				}
        			}
        	}
        	
        	//calculating the BB,OI Estimated Allocation Factor (EST allocation factor)
        	if(promoDetails.promo_status == '3' && promoDetails.promo_alltype != '4'){
        		//dividing the allowance items based on item MOP
            	var allowance_BB = [], allowance_OI = [];
            	var allowanceResult = search.create({
    	        		type: "customrecord_itpm_promoallowance",
    	        		filters: [
    		        		["custrecord_itpm_all_promotiondeal","anyof",promoDetails.promo_id], 
    		        		"AND", 
    		        		["isinactive","is","F"], 
    		        		"AND", 
    		        		["custrecord_itpm_all_mop","anyof",[1,3]]
    	        		],
    	        		columns: ["custrecord_itpm_all_item", "custrecord_itpm_all_mop"]
            	}).run().each(function(e){
            		if(e.getValue({name:'custrecord_itpm_all_mop'}) == 1){
            			allowance_BB.push({
            				item: e.getValue({name:'custrecord_itpm_all_item'}),	
                			mop: e.getValue({name:'custrecord_itpm_all_mop'})
            			});
            		}else if(e.getValue({name:'custrecord_itpm_all_mop'}) == 3){
            			allowance_OI.push({
            				item: e.getValue({name:'custrecord_itpm_all_item'}),	
                			mop: e.getValue({name:'custrecord_itpm_all_mop'})
            			});
            		}
            		return true;
            	});
            	
            	contextObj['value']['item_mop_bb'] = allowance_BB.some(function(e){ return e.item == kpiDetails.kpi_item});
            	contextObj['value']['item_mop_oi'] = allowance_OI.some(function(e){ return e.item == kpiDetails.kpi_item});
            	
            	//calculating the BB,OI Estimated Allocation Factor (EST allocation factor)
            	if(contextObj['value']['item_mop_bb']){
            		
            		promoDetails.estimated_spendbb_sum = getEstimtedSpendSummary(promoDetails.promo_id, 'custrecord_itpm_kpi_estimatedspendbb');
            		
            		if(promoDetails.estimated_spendbb_sum <= 0){
                		kpiDetails['custrecord_itpm_kpi_factorestbb'] = parseFloat((1/allowance_BB.length).toFixed(6));
                	}else{
                		kpiDetails['custrecord_itpm_kpi_factorestbb'] = parseFloat((kpiDetails.kpi_estspendbb/promoDetails.estimated_spendbb_sum).toFixed(6));
                	}
            	}
            	
            	if(contextObj['value']['item_mop_oi']){
            		
            		promoDetails.estimated_spendoi_sum = getEstimtedSpendSummary(promoDetails.promo_id, 'custrecord_itpm_kpi_estimatedspendoi');
                	
            		if(promoDetails.estimated_spendoi_sum <= 0){
                		kpiDetails['custrecord_itpm_kpi_factorestoi'] = parseFloat((1/allowance_OI.length).toFixed(6));
                	}else{
                		kpiDetails['custrecord_itpm_kpi_factorestoi'] = parseFloat((kpiDetails.kpi_estspendoi/promoDetails.estimated_spendoi_sum).toFixed(6));
                	}
            	}
            	
            	//calculating BB,OI Actual Allocation Factor (Actual)
            	if(promoDetails.donotupdatelib || !promoDetails.promo_hasSales){
            		kpiDetails['custrecord_itpm_kpi_factoractualbb'] = kpiDetails['custrecord_itpm_kpi_factorestbb'];
            		kpiDetails['custrecord_itpm_kpi_factoractualoi'] = kpiDetails['custrecord_itpm_kpi_factorestoi'];
            	}
            	contextObj['value'].update_fields['custrecord_itpm_kpi_factorestbb'] = isNaN(kpiDetails['custrecord_itpm_kpi_factorestbb'])? 0 : kpiDetails['custrecord_itpm_kpi_factorestbb'];
            	contextObj['value'].update_fields['custrecord_itpm_kpi_factorestoi'] = isNaN(kpiDetails['custrecord_itpm_kpi_factorestoi'])? 0 : kpiDetails['custrecord_itpm_kpi_factorestoi'];
            	contextObj['value'].update_fields['custrecord_itpm_kpi_factoractualbb'] = isNaN(kpiDetails['custrecord_itpm_kpi_factoractualbb'])? 0 : kpiDetails['custrecord_itpm_kpi_factoractualbb'];
            	contextObj['value'].update_fields['custrecord_itpm_kpi_factoractualoi'] = isNaN(kpiDetails['custrecord_itpm_kpi_factoractualoi'])? 0 : kpiDetails['custrecord_itpm_kpi_factoractualoi'];
        	}
        	
    		log.audit('end map usage '+resultObj.kpi_id,scriptObj.getRemainingUsage());
    		
    		context.write(contextObj);
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
    		var scriptObj = runtime.getCurrentScript();
    		log.audit('start reduce usage',scriptObj.getRemainingUsage());
    		log.debug('context reduce',context);
        	var keyObj = JSON.parse(context.key);
        	keyObj.est_qty_count = parseFloat(keyObj.est_qty_count);
        	log.debug('keyObj',keyObj);
        	
        	//creating the kpi queue detail record
        	createKpiQueueDetailRecord(2, keyObj.kpi_queue_id, keyObj ,JSON.stringify(context.values));
        	
        	if(keyObj.promo_status == '3' && keyObj.promo_alltype != '4'){
        		//calculating BB,OI Actual Allocation Factor (Actual)
        		var detailsArr = context.values.map(function(e){
        			e = JSON.parse(e);
        			return { expec_bb : parseFloat(e.kpi_expect_bb), expec_oi : parseFloat(e.kpi_expect_oi) };
        		});
        		var expec_bb_sum = detailsArr.reduce(function(a,b){ return {expec_bb: a.expec_bb + b.expec_bb} })['expec_bb'];
        		var expec_oi_sum = detailsArr.reduce(function(a,b){ return {expec_oi: a.expec_oi + b.expec_oi} })['expec_oi'];
        	}
        	
        	var kpi_actualbb_sum = 0,kpi_acutaloi_sum = 0;
        	context.values.forEach(function(kpiObj){
        		kpiObj = JSON.parse(kpiObj);
        		if(keyObj.promo_status == '3' && keyObj.promo_alltype != '4'){
        			if(!keyObj.donotupdatelib && keyObj.promo_hasSales){
        				kpi_actualbb_sum = parseFloat((parseFloat(kpiObj.kpi_expect_bb)/parseFloat(expec_bb_sum)).toFixed(6));
        				kpi_acutaloi_sum = parseFloat((parseFloat(kpiObj.kpi_expect_oi)/parseFloat(expec_oi_sum)).toFixed(6));
            			if(kpiObj.item_mop_bb){
            				kpi_actualbb_sum = isNaN(kpi_actualbb_sum)? 0 : kpi_actualbb_sum;
            				kpiObj.update_fields['custrecord_itpm_kpi_factoractualbb'] = (keyObj.est_qty_count == 1)? 1 : kpi_actualbb_sum;
            			}
            			if(kpiObj.item_mop_oi){
            				kpi_acutaloi_sum = isNaN(kpi_acutaloi_sum)? 0 : kpi_acutaloi_sum;
            				kpiObj.update_fields['custrecord_itpm_kpi_factoractualoi'] = (keyObj.est_qty_count == 1)? 1 : kpi_acutaloi_sum;
            			}
            		}
        		}
        		
        		//update the kpi field values
        		record.submitFields({
        			type:'customrecord_itpm_kpi',
        			id:kpiObj.kpi_id,
        			values:kpiObj.update_fields,
        			options:{
        				enableSourcing:false,
        				ignoreMandatoryFields:true
        			}
        		});
        		
        		log.debug('reduce kpi update fields'+kpiObj.kpi_id,kpiObj.update_fields);
        	});
        	
        	//update the kpi queue record with end date
        	record.submitFields({
        		type:'customrecord_itpm_kpiqueue',
        		id: keyObj.kpi_queue_id,
        		values:{
        			'custrecord_itpm_kpiq_end':formatModule.format({value:new Date(),type:formatModule.Type.DATETIME})
        		},
        		options:{
        			enableSourcing:false,
        			ignoreMandatoryFields:true
        		}
        	});
        	
    		log.audit('end reduce usage',scriptObj.getRemainingUsage());
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
    
    /**
     * @param {boolean} returnCount 
     * @description search for the est quantity records on the promotion
     */
    function getEstQtyResults(promoId, kpiItem, returnCount){
    	var searchColumns = [],
    	searchFilters = [['custrecord_itpm_estqty_promodeal','anyof',promoId],'and',
    	            	 ['isinactive','is',false]];
    	if(returnCount){ 
    		searchColumns.push(search.createColumn({
    		    name: 'internalid',
    		    summary: search.Summary.COUNT
    		}))
    	}else{
    		searchFilters.push('and',['custrecord_itpm_estqty_item','anyof',kpiItem]);
    		searchColumns = ['internalid',
	         'custrecord_itpm_estqty_qtyby',
	         'custrecord_itpm_estqty_totalqty',
	         'custrecord_itpm_estqty_estpromotedqty',
	         'custrecord_itpm_estqty_totalrate',
	         'custrecord_itpm_estqty_totalpercent',
	         'custrecord_itpm_estqty_rateperunitbb',
	         'custrecord_itpm_estqty_rateperunitoi',
	         'custrecord_itpm_estqty_rateperunitnb',
	         'custrecord_itpm_estqty_redemption'];
    	}
    	
    	return search.create({
    		type:'customrecord_itpm_estquantity',
    		columns:searchColumns,
    		filters:searchFilters
    	}).run().getRange(0,1);
    }
    
    /**
     * @params {Number} promoid
     * @param  {String} fieldId
     * @description getting the estimated spend summary on the promotion
     * @return estimatedSpendSummary
     */
    function getEstimtedSpendSummary(promoId, fieldId){
    	var estimateSpendSummary = search.create({
    		type: "customrecord_itpm_promotiondeal",
    		filters: [
		        ["internalid", "anyof", promoId],
		        "AND",
		        ["custrecord_itpm_kpi_promotiondeal.isinactive", "is", "F"]
    		 ],
    		 columns: [ 
	           search.createColumn({
	        	   name: fieldId,
	        	   join: "CUSTRECORD_ITPM_KPI_PROMOTIONDEAL",
	        	   summary: "SUM",
	        	   sort: search.Sort.ASC
	           })
    		 ]
    	}).run().getRange(0,1)[0].getValue({name:fieldId, join:'CUSTRECORD_ITPM_KPI_PROMOTIONDEAL', summary:search.Summary.SUM});
    	
    	return estimateSpendSummary = (estimateSpendSummary)? estimateSpendSummary : 0;
    }
    
    /**
     * @param {type} status type
     * @param {kpiQueueID} kpi queue record id
     * @param {key} key 
     * @param {value} value
     */
    function createKpiQueueDetailRecord(type, kpiQueueID, key, value){
    	record.create({
    		type:'customrecord_itpm_kpiqueuedetail',
    		isDynamic:true
    	}).setValue({
    		fieldId:'custrecord_itpm_kpiqmap_parent',
    		value:kpiQueueID
    	}).setValue({
    		fieldId:'custrecord_itpm_kpiqd_type',
    		value:type
    	}).setValue({
    		fieldId:'custrecord_itpm_kpiqd_key',
    		value:JSON.stringify(key)
    	}).setValue({
    		fieldId:'custrecord_itpm_kpiqd_value',
    		value:value.substring(0,1000000)
    	}).save({
    		enableSourcing:false,
    		ignoreMandatoryFields:true
    	});
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
