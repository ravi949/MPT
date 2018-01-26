/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {
   
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
          log.debug('getInputData', 'Initiated');
    		return search.create({
    			 type: "customrecord_itpm_promotiondeal",
    			   filters: [
    			      ["custrecord_itpm_p_allocationtype","anyof","@NONE@"], 
    			      "AND", 
    			      ["isinactive","is","F"]
    			   ],
    			   columns: ["id", "custrecord_itpm_p_status"]
			});
    		
    	}catch(e){
    		log.error('getInputData_'+e.name, e.message);
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
    		var serResult = JSON.parse(context.value);
    		log.debug('mapContextValue',serResult);
    		var promoID = serResult.values.id;
    		var promoStatus = serResult.values.custrecord_itpm_p_status.value;
//    		log.debug('  promoID',promoID);
//    		log.debug('  promoStatus',promoStatus);
    		
    		//setting the default values to Promotion record for calculations
    		var promoUpdated = record.submitFields({
        		type: 'customrecord_itpm_promotiondeal',
        		id: promoID,
        		values: {
        			'custrecord_itpm_p_allocationtype' : '1',
        			'custrecord_itpm_promo_allocationcontrbtn' : (promoStatus == 3)?'T':'F'
        		},
        		options: {enablesourcing: true, ignoreMandatoryFields: true}
        	});  
    		log.debug('promoUpdated',promoUpdated);
    	}catch(e){
    		log.error(e.name+'  Map',e.message);
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
    	log.audit('Summary','completed the total process');
    }

    return {
        getInputData: getInputData,
        map: map,
//        reduce: reduce,
        summarize: summarize
    };
    
});
