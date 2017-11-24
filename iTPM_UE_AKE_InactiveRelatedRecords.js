/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/record', 
		'N/search',
		'N/runtime',
		'N/redirect'
		],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, runtime, redirect) {
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

    		switch(scriptContext.type){
    		case scriptContext.UserEventType.EDIT:
    			if(scriptContext.newRecord.getValue('isinactive'))
    				actions[scriptContext.newRecord.type]["method"](scriptContext,actions,false);
    			else{
    				if(scriptContext.oldRecord.getValue('isinactive') && !scriptContext.newRecord.getValue('isinactive'))
    					actions[scriptContext.newRecord.type]["method"](scriptContext,actions,true);
    			}
    			break;
    		}
    	}catch(e){
    		log.error(e.name,e.message);
    	}
    }

    /**
     * @param context - scriptContext
     * @param actions - actions object
     * @description delete the related the EstQty and Kpi records
     */
    function deleteEstQtyAndKpi(context,actions,isinactive){
    	var allwResults = getResults('customrecord_itpm_promoallowance',context,actions,isinactive).results.run().getRange(0,2);

    	if(allwResults.length == 0 || isinactive){
    		deleteRecords(getResults('customrecord_itpm_estquantity',context,actions,isinactive),isinactive);
        	deleteRecords(getResults('customrecord_itpm_kpi',context,actions,isinactive),isinactive);
        	deleteRecords(getResults('customrecord_itpm_promoretailevent',context,actions,isinactive),isinactive);
    	}
    }
    
    /**
     * @param context - scriptContext
     * @param actions - actions object
     * @description delete the related the Allownces and EstQty records
     */
    function deleteAllAndEstQty(context,actions,isinactive){
    	deleteRecords(getResults('customrecord_itpm_promoallowance',context,actions,isinactive),isinactive);
        deleteRecords(getResults('customrecord_itpm_estquantity',context,actions,isinactive),isinactive);
    	deleteRecords(getResults('customrecord_itpm_promoretailevent',context,actions,isinactive),isinactive);
    }
    
    /**
     * @param context - scriptContext
     * @param actions - actions object
     * @description delete the related the Allowances and Kpi records
     */
    function deleteAllAndKpi(context,actions,isinactive){
    	deleteRecords(getResults('customrecord_itpm_promoallowance',context,actions,isinactive),isinactive);
    	deleteRecords(getResults('customrecord_itpm_kpi',context,actions,isinactive),isinactive);
    	deleteRecords(getResults('customrecord_itpm_promoretailevent',context,actions,isinactive),isinactive);
    }
    
    /**
     * @param obj - contains record type,resultSet
     * @description delete the related records or inactive 
     */
    function deleteRecords(obj,isinactive){
    	obj.results.run().each(function(e){
    		record.submitFields({
			    type: obj.type,
			    id: e.getValue('internalid'),
			    values: {
			        isinactive: !isinactive
			    },
			    options: {
			        enableSourcing: false,
			        ignoreMandatoryFields : true
			    }
			});
    		return true;
    	});
    }
    
    /**
     * @param type - record type
     * @param context - scriptContext
     * @param actions - actions object
     * @returns type,resultSet
     * @description search for the related records and return result
     */
    function getResults(type,context,actions,isinactive){		
    	var promoid = actions[type].promoid;
    	var promoInternalid = context.oldRecord.getValue(actions[context.newRecord.type].promoid);
    	var itemid = actions[type].itemid;
    	var itemInternalid = context.oldRecord.getValue(actions[context.newRecord.type].itemid);
    	
        var searchResults = search.create({
	    		type:type,
	    		columns:['internalid'],
	    		filters:[
	    			[promoid,'anyof',promoInternalid],'and',
	   			 	[itemid,'anyof',itemInternalid],'and',
	   			 	['isinactive','is',isinactive]
	    		]
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
