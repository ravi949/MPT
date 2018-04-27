/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/search',
        'N/runtime'],
/**
 * @param {search} search
 */
function(search, runtime) {
   
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
    		log.debug('start usage',scriptObj.getRemainingUsage());
    		var arrObjs = [];
        	[37,36].forEach(function(promoid){
        		search.create({
        			type:'customrecord_itpm_promotiondeal',
        			columns:['custrecord_itpm_p_status',
        			         'custrecord_itpm_p_condition',
        			         'custrecord_itpm_p_lumpsum',
        			         'custrecord_itpm_p_shipstart',
        			         'custrecord_itpm_p_shipend',
        			         'custrecord_itpm_p_customer',
        			         'custrecord_itpm_p_itempricelevel',
        			         'custrecord_itpm_p_type.custrecord_itpm_pt_dontupdate_lbonactual',
        			         'custrecord_itpm_kpi_promotiondeal.internalid',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_lespendbb',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_lespendoi',
        			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_lespendnb'
        			         ],
        			filters:[['internalid','anyof',promoid]]
        		}).run().each(function(promo){
        			arrObjs.push({
        				kpiId		  	:	promo.getValue({name:'internalid',join:'custrecord_itpm_kpi_promotiondeal'}),
        				promo_details 	: 	{
        						promoid			: 	promoid,
        						promo_status	:   promo.getValue('custrecord_itpm_p_status'),
        						promo_condition	: 	promo.getValue('custrecord_itpm_p_condition'),
        						promo_lumpsum	:	promo.getValue('custrecord_itpm_p_lumpsum'),
        						promo_start		:	promo.getValue('custrecord_itpm_p_shipstart'),
        						promo_end		:	promo.getValue('custrecord_itpm_p_shipend'),
        						promo_customer	:	promo.getValue('custrecord_itpm_p_customer'),
        						promo_pricelevel:	promo.getValue('custrecord_itpm_p_customer')
        				},
        				kpi_details		:	{
        						leSpBB		:	promo.getValue({name:'custrecord_itpm_kpi_lespendbb',join:'custrecord_itpm_kpi_promotiondeal'}),
        						leSpOI		:	promo.getValue({name:'custrecord_itpm_kpi_lespendoi',join:'custrecord_itpm_kpi_promotiondeal'}),
        						leSpNB		:	promo.getValue({name:'custrecord_itpm_kpi_lespendnb',join:'custrecord_itpm_kpi_promotiondeal'})
        				},
        				promotype_details:	{
        						donotupdatelib : promo.getValue({name:'custrecord_itpm_pt_dontupdate_lbonactual',join:'custrecord_itpm_p_type'})		
        				}
        			});
        			return true;
        		});
        	});
        	log.debug('end usage',scriptObj.getRemainingUsage());
        	return arrObjs;
    	}catch(ex){
    		log.error('Error In Map: '+ex.name,ex.message)
    	}
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	var resultObj = context.value;
    	var estQty = {};
    	search.create({
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
    		filters:[['custrecord_itpm_estqty_promodeal','anyof',resultObj['promo_details'].promoid]]
    	}).run().each(function(est){
    		
    		return true;
    	});
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

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
//        reduce: reduce,
//        summarize: summarize
    };
    
});
