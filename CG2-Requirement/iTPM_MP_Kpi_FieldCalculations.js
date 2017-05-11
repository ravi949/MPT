/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(["N/search"],
/**
 * @param {search} search
 */
function(search) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     * 
     * Map/Reduce script 1 for kpi's calculations
     */
    function getInputData() {
    	try{
          
          return [search.load({id:'customsearch_itpm_calc_draft_kpi'}),search.load({id:'customsearch_itpm_calc_draft_estqty'})]
    		/*return search.create({
    			type: "customrecord_itpm_kpi",
    			filters: [["custrecord_itpm_kpi_promotiondeal.isinactive","is","F"],'and',
    					  ["custrecord_itpm_kpi_promotiondeal.custrecord_itpm_p_status","anyof","3"],'and', //approved
    					  ["custrecord_itpm_kpi_promotiondeal.custrecord_itpm_p_condition","anyof","2","3"] //active or completed
    				],
    			columns: [
    				"internalid",
    				"custrecord_itpm_kpi_promotiondeal",
    				"custrecord_itpm_kpi_item",
    				"custrecord_itpm_kpi_uom",
    				search.createColumn({
    					name: "custrecord_itpm_p_status",
    					join: "CUSTRECORD_ITPM_KPI_PROMOTIONDEAL"
    				}),
    				search.createColumn({
    					name: "custrecord_itpm_p_condition",
    					join: "CUSTRECORD_ITPM_KPI_PROMOTIONDEAL"
    				}),
    				search.createColumn({
    					name: "custrecord_itpm_p_shipstart",
    					join: "CUSTRECORD_ITPM_KPI_PROMOTIONDEAL"
    				}),
    				search.createColumn({
    					name: "custrecord_itpm_p_shipend",
    					join: "CUSTRECORD_ITPM_KPI_PROMOTIONDEAL"
    				}),
    				search.createColumn({
    					name: "custrecord_itpm_p_customer",
    					join: "CUSTRECORD_ITPM_KPI_PROMOTIONDEAL"
    				})
    				]
    		})*/
    	}catch(e){
    		log.debug("exception in getinput data",e)
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
            log.debug('context',typeof context.value)
    		/*var kpiValues = JSON.parse(context.value).values,
    		kpiItem = kpiValues["custrecord_itpm_kpi_item"].value,
    		kpiPromoId = kpiValues["custrecord_itpm_kpi_promotiondeal"].value,
    		promoShipStartDate = kpiValues["custrecord_itpm_p_shipstart.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL"],
    		promoShipEndDate = kpiValues["custrecord_itpm_p_shipend.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL"],
    		promoCustomer = kpiValues["custrecord_itpm_p_customer.CUSTRECORD_ITPM_KPI_PROMOTIONDEAL"].value,
    		promoTypeImpactId = search.lookupFields({
    			type:"customrecord_itpm_promotiondeal",
    			id:kpiPromoId,
    			columns:["custrecord_itpm_p_type.custrecord_itpm_pt_financialimpact"]
    		})["custrecord_itpm_p_type.custrecord_itpm_pt_financialimpact"].value,
    		
    		//search for estimated qty record for BB,NB and OI values
    		estimateQtyResult = search.create({
    			type:"customrecord_itpm_estquantity",
    			columns:["custrecord_itpm_estqty_rateperunitbb",
    				"custrecord_itpm_estqty_rateperunitoi",
    				"custrecord_itpm_estqty_rateperunitnb"
    				],
    				filters:[
    					["custrecord_itpm_estqty_item","is",kpiItem],"and",
    					["custrecord_itpm_estqty_promodeal","is",kpiPromoId]
    					]
    		}).run().getRange(0,1)[0];

//    		log.debug("estimateQtyResult "+kpiItem+" promo id "+kpiPromoDeal,estimateQtyResult)
    		log.debug("kpiValues",kpiValues);
    		//searching for item fulfillment records with customer,item and within the ship-start and ship-end dates
    		var itemShipmentResult = [],result,count,start = 0,end = 1000,
    		itemShipmentSearch = search.create({
    			type:search.Type.ITEM_FULFILLMENT,
    			columns:["item","quantity","unit"],
    			filters:[
    				["item","anyof",kpiItem],"and",
    				["customermain.internalid","anyof",promoCustomer],"and",
    				["trandate","within",promoShipStartDate,promoShipEndDate],"and",
    				["cogs","is","F"],"and", 
    			    ["taxline","is","F"],"and", 
    			    ["shipping","is","F"]
    			]
    		}).run();
    		
    		do{
    			result = itemShipmentSearch.getRange(start,end);
    			count = result.length;
    			itemShipmentResult = itemShipmentResult.concat(result);
    			end = start+end;
    		}while(count == 1000);
    		
    		log.debug("itemShipmentResult",itemShipmentResult)*/
    		
    	}catch(e){
    		//log.debug("exception in map",e);
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
        reduce: reduce,
        summarize: summarize
    };
    
});
