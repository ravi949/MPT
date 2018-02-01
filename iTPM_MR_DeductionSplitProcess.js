/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 
		'N/search',
		'./iTPM_Module.js'],
/**
 * @param {record} record
 * @param {search} search
 * @param {iTPM_Module} iTPM_Module
 */
function(record, search, itpm) {
   
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
        		columns:[
        			'internalid',
        			'custrecord_itpm_split_deduction',
        			'custrecord_itpm_split.custrecord_split_amount',
        			'custrecord_itpm_split_deduction.custbody_itpm_ddn_openbal',
        			search.createColumn({
        				name:'internalid',
        				join:'custrecord_itpm_split',
        				sort:search.Sort.ASC
        			})
        		],
        		filters:[['internalid','is',17],'and',["custrecord_itpm_split.internalid","noneof","@NONE@"],'and',
        				 ['custrecord_itpm_split_deduction.custbody_itpm_ddn_openbal','greaterthan',0]]
        	});
    	}catch(ex){
    		log.error('Error in getInputData '+ex.name,ex.message);
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
    		var value = JSON.parse(context.value);
        	var jsonObj = value["values"];
        	//Dedcution Split record value
        	var ddnSplitRecId = jsonObj["internalid"].value;
        	
        	//Main Deduction record values
        	var ddnId = jsonObj["custrecord_itpm_split_deduction"].value;
        	var ddnOpenBalance = parseFloat(jsonObj["custrecord_itpm_split_deduction.custbody_itpm_ddn_openbal"]);
        	
        	//Deduction Split Line record values
        	var ddnSplitLineRecId = jsonObj["internalid.custrecord_itpm_split"].value;
        	var ddnSplitLineRecAmount = parseFloat(jsonObj["custrecord_itpm_split.custrecord_split_amount"]);
        	
        	log.debug('ddnSplitRecId',ddnSplitRecId);
        	log.debug('ddnId',ddnId);
        	log.debug('ddnSplitLineRecId',ddnSplitLineRecId);
        	
        	//Loading the Main Deduction Record
        	var parentRec = record.load({
        		type:'customtransaction_itpm_deduction',
        		id:ddnId
        	});
        	var removeCustFromSplit = itpm.getPrefrenceValues().removeCustomer;
        	var ddnExpenseId = parentRec.getSublistValue({sublistId:'line',fieldId:'account',line:parentRec.getLineCount('line') - 1});
        	
        	itpm.createSplitDeduction(parentRec,ddnSplitLineRecAmount,ddnExpenseId,removeCustFromSplit);
        	
        	//loading the parent record again why because parentDeductionRec already save 
    		//thats why we are loading the record newly	
    		parentRec.setValue({
    			fieldId:'custbody_itpm_ddn_openbal',
    			value: ddnOpenBalance - ddnSplitLineRecAmount
    		}).save({
    			enableSourcing: false,
    			ignoreMandatoryFields : true
    		});
    	}catch(ex){
    		log.error('Error in Map '+ex.name,ex.message);
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
