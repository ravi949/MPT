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
        			'custrecord_itpm_split.custrecord_split_memo',
        			'custrecord_itpm_split.custrecord_split_refcode',
        			'custrecord_itpm_split.custrecord_split_disputed',
        			'custrecord_itpm_split.custrecord_split_amount',
        			search.createColumn({
        				name:'internalid',
        				join:'custrecord_itpm_split',
        				sort:search.Sort.ASC
        			})
        		],
        		filters:[["custrecord_itpm_split.internalid","noneof","@NONE@"],'and',['custrecord_itpm_ddn_splitprocesscompletd','is',false]]
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
    		log.debug('value',value);
        	var jsonObj = value["values"];
        	//Dedcution Split record value
        	var ddnSplitRecId = jsonObj["internalid"].value;
        	
        	//Main Deduction record values
        	var ddnId = jsonObj["custrecord_itpm_split_deduction"].value;
        	
        	//Deduction Split Line record values
        	var ddnSplitLineRecId = jsonObj["internalid.custrecord_itpm_split"].value;
        	var ddnSplitLineRecAmount = parseFloat(jsonObj["custrecord_split_amount.custrecord_itpm_split"]);
        	
        	var ddnSplitLineMemo = jsonObj['custrecord_split_memo.custrecord_itpm_split'];
        	var ddnSplitLineRefCode = jsonObj['custrecord_split_refcode.custrecord_itpm_split'];
        	var ddnDisputed = jsonObj['custrecord_split_disputed.custrecord_itpm_split'];
        	
        	log.debug('ddnSplitRecId',ddnSplitRecId);
        	log.debug('ddnId',ddnId);
        	log.debug('ddnSplitLineRecId',ddnSplitLineRecId);
        	
        	//Loading the Main Deduction Record
        	var parentRec = record.load({
        		type:'customtransaction_itpm_deduction',
        		id:ddnId
        	});
        	var ddnOpenBalance = parseFloat(parentRec.getValue('custbody_itpm_ddn_openbal'));
        	var removeCustFromSplit = itpm.getPrefrenceValues().removeCustomer;
        	var ddnExpenseId = parentRec.getSublistValue({sublistId:'line',fieldId:'account',line:parentRec.getLineCount('line') - 1});
        	
        	log.debug('removeCustFromSplit', itpm.getPrefrenceValues());
        	log.debug('ddnSplitLineRecAmount',ddnSplitLineRecAmount);
        	log.debug('sadf',{
        		amount : parseFloat(ddnSplitLineRecAmount),
        		ddnExpenseId : ddnExpenseId,
        		removeCustomer : removeCustFromSplit,
        		memo : ddnSplitLineMemo,
        		refCode : ddnSplitLineRefCode,
        		ddnDisputed : ddnDisputed == 'T'
        	});
        	//It will create the auto split deduction
        	var splitRecordCreated = itpm.createSplitDeduction(parentRec,{
        		amount : parseFloat(ddnSplitLineRecAmount),
        		ddnExpenseId : ddnExpenseId,
        		removeCustomer : removeCustFromSplit,
        		memo : ddnSplitLineMemo,
        		refCode : ddnSplitLineRefCode,
        		ddnDisputed : ddnDisputed == 'T'
        	});
        	
        	log.debug('splitRecordCreated',splitRecordCreated);
        	log.debug('(ddnOpenBalance - ddnSplitLineRecAmount)',(ddnOpenBalance - ddnSplitLineRecAmount))
        	if(splitRecordCreated){
        		//loading the parent record again why because parentDeductionRec already save 
        		//thats why we are loading the record newly	
        		parentRec.setValue({
        			fieldId:'custbody_itpm_ddn_openbal',
        			value: (ddnOpenBalance - ddnSplitLineRecAmount).toFixed(2)
        		}).setValue({
        			fieldId:'transtatus',
        			value:'C'
        		}).save({
        			enableSourcing: false,
        			ignoreMandatoryFields : true
        		});

        		if((ddnOpenBalance - ddnSplitLineRecAmount) <= 0){
        			record.submitFields({
        				type:'customrecord_itpm_deductionsplit',
        				id:ddnSplitRecId,
        				values:{
        					'custrecord_itpm_ddn_splitprocesscompletd':true
        				},
        				options:{
        					enableSourcing:false,
        					ignoreMandatoryFields:false
        				}
        			});
        		}
        	}
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
