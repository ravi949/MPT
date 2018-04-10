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
				type:'customrecord_itpm_promoallowance',
				columns:['internalid','custrecord_itpm_all_item','custrecord_itpm_all_promotiondeal'],
				filters:[['isinactive','is',true]]
			});
		}catch(ex){
			log.error('getInputData '+ex.name,ex.message);
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
	    	var allowanceObj = JSON.parse(context.value);
			var itemId = allowanceObj['values']['custrecord_itpm_all_item'].value;
			var promoId = allowanceObj['values']['custrecord_itpm_all_promotiondeal'].value;
			context.write({key:{promoid:promoId,itemid:itemId},value:allowanceObj.id});
		}catch(ex){
			log.error('map '+ex.name,ex.message);
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
    		var keyObj = JSON.parse(context.key);
    		context.values.forEach(function(allwid){
    			//deleting the allowance record
        		record.delete({
        			type:'customrecord_itpm_promoallowance',
        			id:allwid
        		});
    		});
    		
        	//Array of objects with record type and field ids
    		var searchRecs = [{
    			type:'customrecord_itpm_estquantity',
    			itemFieldId:'custrecord_itpm_estqty_item',
    			promoFieldId:'custrecord_itpm_estqty_promodeal'
    		},{
    			type:'customrecord_itpm_promoretailevent',
    			itemFieldId:'custrecord_itpm_rei_item',
    			promoFieldId:'custrecord_itpm_rei_promotiondeal'
    		},{
    			type:'customrecord_itpm_kpi',
    			itemFieldId:'custrecord_itpm_kpi_item',
    			promoFieldId:'custrecord_itpm_kpi_promotiondeal'
    		}];
    		
    		//Loop through the array and create the EstQty,Retail Info and kpi inactive records
    		searchRecs.forEach(function(obj,index){
    			search.create({
    				type:obj.type,
    				columns:['internalid'],
    				filters:[[obj.itemFieldId,'anyof',keyObj.itemid],'and',
    						 [obj.promoFieldId,'anyof',keyObj.promoid]]
    			}).run().each(function(result){
    				record.delete({
    					type:obj.type,
    					id:result.getValue('internalid')
    				});
    				return true;
    			});
    		});
    	}catch(ex){
    		log.error('reduce '+ex.name,ex.message);
    	}

    }

	/**
	 * Executes when the summarize entry point is triggered and applies to the result set.
	 *
	 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
	 * @since 2015.1
	 */
	function summarize(summary) {
		log.debug('summary','completed');
	}

	return {
		getInputData: getInputData,
		map: map,
		reduce:reduce,
		summarize: summarize
	};

});
