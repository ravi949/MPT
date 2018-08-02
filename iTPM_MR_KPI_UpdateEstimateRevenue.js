/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/record', 
        'N/search',
        'N/runtime',
        './iTPM_Module.js'
        ],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 * @param {itpm} itpm
 */
function(record, search, runtime, itpm) {
   
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
    			type:'customrecord_itpm_kpi',
    			columns:['internalid',
    			         'custrecord_itpm_kpi_promotiondeal',
    			         'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_p_itempricelevel',
    			         'custrecord_itpm_kpi_item'],
    			filters:[['custrecord_itpm_kpi_estimatedrevenue','lessthanorequalto',0],'or',
                         ['custrecord_itpm_kpi_estimatedrevenue','isempty',null]]
    		});
    	}catch(ex){
    		log.debug(ex.name, ex.message);
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
    		log.debug('start map time',scriptObj.getRemainingUsage());
//    		log.debug('context map',context.value);
    		var JSONObj = JSON.parse(context.value)['values'];
    		var itemIdEQ = JSONObj['custrecord_itpm_kpi_item']['value'];
    		var promotionIdEQ = JSONObj['custrecord_itpm_kpi_promotiondeal']['value'];
    		var eqPromPriceLevel = JSONObj['custrecord_itpm_p_itempricelevel.custrecord_itpm_kpi_promotiondeal']['value'];
    		
    		var estQtyResult = search.create({
    			type:'customrecord_itpm_estquantity',
    			columns:['custrecord_itpm_estqty_qtyby','custrecord_itpm_estqty_totalqty','custrecord_itpm_estqty_redemption'],
    			filters:[['custrecord_itpm_estqty_promodeal','anyof',promotionIdEQ],'and',
    			         ['custrecord_itpm_estqty_item','anyof',itemIdEQ]]
    		}).run().getRange(0,1)[0];
    		var totalestqty = parseFloat(estQtyResult.getValue('custrecord_itpm_estqty_totalqty'));
    		var redemptionFactor = parseInt(estQtyResult.getValue('custrecord_itpm_estqty_redemption'));
    		var estPromotedQty = Math.floor(totalestqty*(redemptionFactor/100));
    		var unit = estQtyResult.getValue('custrecord_itpm_estqty_qtyby');
    		
    		//Calculating Estimated Revenue real time: Step 1
    		var itemImpactPrice = itpm.getImpactPrice({pid: promotionIdEQ, itemid: itemIdEQ, pricelevel: eqPromPriceLevel, baseprice: 0});

    		//Calculating Estimated Revenue real time(Calculating Item 'sale unit rate' and 'unit rate'): Step 2
    		var itemSaleUnit = search.lookupFields({type:search.Type.ITEM,id:itemIdEQ,columns:['saleunit']})['saleunit'][0].value;
    		var itemunits = itpm.getItemUnits(itemIdEQ)['unitArray'];
    		var unitrate = parseFloat(itemunits.filter(function(obj){return obj.id == unit})[0].conversionRate);
    		var saleunitrate = parseFloat(itemunits.filter(function(obj){return obj.id == itemSaleUnit})[0].conversionRate);
//    		log.debug('itemSaleUnit, unitrate, saleunitrate',itemSaleUnit+' & '+unitrate+' & '+saleunitrate);

    		//Calculating Estimated Revenue: Step 3
    		var estimatedRevenue = parseFloat(estPromotedQty) * parseFloat(itemImpactPrice.price) * (unitrate / saleunitrate);
    		log.audit('estimatedRevenue '+JSONObj['internalid']['value'],estimatedRevenue);

    		record.submitFields({
    			type:'customrecord_itpm_kpi',
    			id:JSONObj['internalid']['value'],
    			values:{
    				'custrecord_itpm_kpi_estimatedrevenue':estimatedRevenue
    			},
    			options:{
    				enableSourcing:false,
    				ignoreMandatoryFields:true
    			}
    		});

    		log.debug('end map time',scriptObj.getRemainingUsage());
    		
    	}catch(ex){
    		log.debug(ex.name,ex.message);
    	}
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
        summarize: summarize
    };
    
});
