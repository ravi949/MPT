/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search'],

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
     */
    function getInputData() {
    	return search.create({
    		type	: 'customrecord_itpm_promotiondeal',
    		columns	: ['internalid'],
    		filters	: [['custrecord_itpm_p_status', 'is', 3], //Status: Approved
    		       	   'AND',
    		       	   [['custrecord_itpm_p_condition', 'anyof', [2,3]]], //Condition: Active OR Completed
    		       	   'AND',
    		       	   [['custrecord_itpm_p_shipend', 'on', 'today'], 'OR', ['custrecord_itpm_p_shipend', 'on', 'yesterday']],
    		       	   'AND',
    		       	   ['custrecord_itpm_p_type.custrecord_itpm_pt_dontupdate_lbonactual', 'is', 'F']
    		]
    	});
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	var data = JSON.parse(context.value).values;
    	log.debug('map_data', context.value);
    	var promotionID = data['internalid'].value
    	
    	//itpm.createKPIQueue(promotionID, 1); //1.Scheduled, 2.Edited, 3.Status Changed, 4.Ad-hoc and 5.Settlement Status Changed
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
        //reduce: reduce,
        summarize: summarize
    };
    
});
