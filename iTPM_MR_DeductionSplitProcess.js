/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 
		'N/search'],
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
    	return search.create({
    		type:'customrecord_itpm_deductionsplit',
    		columns:[
    			'internalid',
    			'custrecord_itpm_split_deduction',
    			search.createColumn({
    				name:'internalid',
    				join:'custrecord_itpm_split',
    				sort:search.Sort.ASC
    			})
    		],
    		filters:[["custrecord_itpm_split.internalid","noneof","@NONE@"],'and',
    				 ['custrecord_itpm_ddn_splitprocessed','is',false]]
    	});
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	var value = JSON.parse(context.value);
    	var jsonObj = value["values"];
    	var ddnSplitRecId = jsonObj["internalid"].value;
    	var ddnId = jsonObj["custrecord_itpm_split_deduction"].value;
    	var ddnSplitLineRecId = jsonObj["internalid.custrecord_itpm_split"].value;
    	log.debug('ddnSplitRecId',ddnSplitRecId);
    	log.debug('ddnId',ddnId);
    	log.debug('ddnSplitLineRecId',ddnSplitLineRecId);
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
