/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
    	try{
    		var actions = {
    			'customrecord_itpm_promoallowance':{
    				method:deleteEstQtyAndKpi,
    				promoid:'custrecord_itpm_all_promotiondeal',
    				itemid:'custrecord_itpm_all_item'
    			},
    			'customrecord_itpm_estquantity':{
    				method:deleteAllAndKpi,
    				promoid:'custrecord_itpm_estqty_promodeal',
    				itemid:'custrecord_itpm_estqty_item'
    			},
    			'customrecord_itpm_kpi':{
    				method:deleteAllAndEstQty,
    				promoid:'custrecord_itpm_kpi_promotiondeal',
    				itemid:'custrecord_itpm_kpi_item'
    			},
    			'customrecord_itpm_promoretailevent':{
    				promoid:'custrecord_itpm_rei_promotiondeal',
    				itemid:'custrecord_itpm_rei_item'
    			}
    		};
    		
    		if(scriptContext.type == scriptContext.UserEventType.DELETE)
    			actions[scriptContext.newRecord.type]["method"](scriptContext,actions);
    		
    	}catch(e){
    		log.error(e.name,e.message);
    	}
    }

    //delete the related the EstQty and Kpi records
    function deleteEstQtyAndKpi(context,actions){
    	var allwResults = getResults('customrecord_itpm_promoallowance',context,actions);

    	if(allwResults.results.run().getRange(0,10).length == 0){
    		deleteRecords(getResults('customrecord_itpm_estquantity',context,actions));
        	deleteRecords(getResults('customrecord_itpm_kpi',context,actions));
        	deleteRecords(getResults('customrecord_itpm_promoretailevent',context,actions));
    	}
    }
    
    //delete the related the Allownces and EstQty records
    function deleteAllAndEstQty(context,actions){
    	deleteRecords(getResults('customrecord_itpm_promoallowance',context,actions));
    	deleteRecords(getResults('customrecord_itpm_estquantity',context,actions));
    	deleteRecords(getResults('customrecord_itpm_promoretailevent',context,actions));
    }
    
    //delete the related the Allowances and Kpi records
    function deleteAllAndKpi(context,actions){
    	deleteRecords(getResults('customrecord_itpm_promoallowance',context,actions));
    	deleteRecords(getResults('customrecord_itpm_kpi',context,actions));
    	deleteRecords(getResults('customrecord_itpm_promoretailevent',context,actions));
    }
    
    //get EstQty list
    function deleteRecords(obj){
    	obj.results.run().each(function(e){
    		record.delete({
    			type:obj.type,
    			id:e.getValue('internalid')
    		});
    	});
    }
    
    function getResults(type,context,actions){
    	log.debug('actions',actions[type].itemid);
    	var range = (type == 'customrecord_itpm_promoallowance')?1000:1;
    	var promoid = actions[type].promoid;
    	var promoInternalid = context.newRecord.getValue(actions[context.newRecord.type].promoid);
    	var itemid = actions[type].itemid;
    	var itemInternalid = context.newRecord.getValue(actions[context.newRecord.type].itemid);
        var searchResults = search.create({
	    		type:type,
	    		columns:['internalid'],
	    		filters:[[promoid,'anyof',promoInternalid],'and',
	    				 [itemid,'anyof',itemInternalid],'and',
	    				 ['isinactive','is',false]]
    	});
        
        
        
        return {
        	results:searchResults,
        	type:type
        };
    }
    
    
    return {
    	afterSubmit: afterSubmit
    };
    
});
