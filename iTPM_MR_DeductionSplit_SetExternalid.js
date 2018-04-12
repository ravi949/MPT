/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/record', 
        'N/search'
        ],
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
    		return search.create({
    			type:'customrecord_itpm_deductionsplit',
    			columns:['internalid','custrecord_itpm_split_deduction'],
    			filters:[['externalid','anyof','@NONE@']]
    		 });
    	}catch(ex){
    		log.error(ex.name,ex.message);
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
        	var obj = JSON.parse(context.value);
        	var externalid = obj.values['custrecord_itpm_split_deduction']['text'];
        	
        	log.debug('context',obj.values);
        	log.debug('key',context.key);
        	
        	record.submitFields({
        		type:'customrecord_itpm_deductionsplit',
        		id:context.key,
        		values:{
        			'externalid':externalid
        		},
        		options:{
        			ignoreMandatoryFields:true,
        			enableSourcing:false
        		}
        	});
    	}catch(ex){
    		log.error(ex.name,ex.message);
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
    	log.debug('summary',summary);
    }

    return {
        getInputData: getInputData,
        map: map,
//        reduce: reduce,
        summarize: summarize
    };
    
});
