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
    			type:'customtransaction_itpm_settlement',
    			columns: ["internalid"],
    			filters: []  
    			});
    		
    	}catch(e){
    		log.error(e.name+'  getInputData',e.message);
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
    		var searchResult = JSON.parse(context.value);
    		var arrResult = searchResult.values;
    		var internalID = arrResult.internalid.value;
    		context.write({
    			key:internalID,//'14087',//internalID,
    			value:'0'
    		});
    	}
    	catch(ex){
    		log.error(ex.name,ex.message);
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
    	try{
    		var settlementId = context.key;
    		log.debug('settlementId',settlementId);
    		
    		var settlementRecord = record.load({
    			type: 'customtransaction_itpm_settlement', 
    			id: settlementId
    		});
    		//log.debug('settlementRecord',settlementRecord);
    		var lineCount = settlementRecord.getLineCount('line')
    		log.debug('settlementRecord lineCount',lineCount);
    		
    		for(var i = 0; i < lineCount; i++){
    			var item_Id = settlementRecord.getSublistValue({
        		    sublistId: 'line',
        		    fieldId: 'custcol_itpm_set_item',
        		    line: i
        		});
    			
    			if(!item_Id)continue;
    			
        		log.debug('item_Id',item_Id);
        		
        		var item_Class = itemClass(item_Id);
        		var item_Department = itemDepartment(item_Id);
        		
        		log.debug('item_Class',item_Class + ' lineNumber ' + i);
        		log.debug('item_Department',item_Department + ' lineNumber ' + i);
        		
        		if(item_Class){
        			settlementRecord.setSublistValue({
        			    sublistId: 'line',
        			    fieldId: 'class',
        			    line: i,
        			    value: item_Class
        			});
        		}
        		if(item_Department){
        			settlementRecord.setSublistValue({
        			    sublistId: 'line',
        			    fieldId: 'department',
        			    line: i,
        			    value: item_Department
        			});
        		}
    		}
    		
    		settlementRecord.setValue({
    			fieldId: 'custpage_itpm_set_contexttype',
    			value : 'One Time Script'
    		}).save({
    			enableSourcing: true,
    			ignoreMandatoryFields: true
    		});
    		
    	}catch(ex){
    		log.debug(ex.name,ex.message);
    		log.error(ex.name,ex.message);
    	} 	
    }

    /**
	 * @param {Integer} itemId
	 */
    function itemClass(itemId){
    	try{
    		var itemlookup = search.lookupFields({
    			type: search.Type.ITEM,
    			id: itemId,
    			columns:['class']
    		});
    		return  (itemlookup.class.length > 0)?itemlookup.class[0].value:'';	
    	}catch(ex){
    		log.debug(ex.name,ex.message);
    	}    
    }
	/**
	 * @param {Integer} itemId
	 */
    function itemDepartment(itemId){
    	try{
    		var itemlookup1 = search.lookupFields({
    			type: search.Type.ITEM,
    			id: itemId,
    			columns:['department']
    		});
    		return  (itemlookup1.department.length > 0)?itemlookup1.department[0].value:'';	
    	}catch(ex){
    		log.debug(ex.name,ex.message);
    	}
    }
    

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
    	log.debug('summary state',summary);
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
