/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/record', 
		'N/search',
		'N/runtime'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, runtime) {
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
    		case scriptContext.UserEventType.DELETE:
    			log.debug('delete','delete all records');
    			actions[scriptContext.newRecord.type]["method"](scriptContext,actions);
    			break;
    		case scriptContext.UserEventType.EDIT:
    			if(scriptContext.newRecord.getValue('isinactive')){
    				log.debug('edit','delete edit while inactive');
    				actions[scriptContext.newRecord.type]["method"](scriptContext,actions);
    			}
    			break;
    		case scriptContext.UserEventType.CREATE:
    			log.debug('create','delete inactives');
    			deleteInactiveRecords(scriptContext,actions);
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
    function deleteEstQtyAndKpi(context,actions){
    	var allwResults = getResults('customrecord_itpm_promoallowance',context,actions,true);
    	var allResultLength = allwResults.results.run().getRange(0,1000).length;
    	log.debug('allResultLength',allResultLength);
    	if(allResultLength == 0){
    		deleteRecords(getResults('customrecord_itpm_estquantity',context,actions));
        	deleteRecords(getResults('customrecord_itpm_kpi',context,actions));
        	deleteRecords(getResults('customrecord_itpm_promoretailevent',context,actions));
    	}
    }
    
    /**
     * @param context - scriptContext
     * @param actions - actions object
     * @description delete the related the Allownces and EstQty records
     */
    function deleteAllAndEstQty(context,actions){
    	var allwResults = getResults('customrecord_itpm_promoallowance',context,actions,true);
    	var allResultLength = allwResults.results.run().getRange(0,1000);

    	deleteRecords(getResults('customrecord_itpm_promoallowance',context,actions),(allResultLength > 238));
        deleteRecords(getResults('customrecord_itpm_estquantity',context,actions),(allResultLength > 238));
    	deleteRecords(getResults('customrecord_itpm_promoretailevent',context,actions));
    }
    
    /**
     * @param context - scriptContext
     * @param actions - actions object
     * @description delete the related the Allowances and Kpi records
     */
    function deleteAllAndKpi(context,actions){
    	var allwResults = getResults('customrecord_itpm_promoallowance',context,actions,true);
    	var allResultLength = allwResults.results.run().getRange(0,1000);

    	deleteRecords(getResults('customrecord_itpm_promoallowance',context,actions),(allResultLength > 238));
    	deleteRecords(getResults('customrecord_itpm_kpi',context,actions));
    	deleteRecords(getResults('customrecord_itpm_promoretailevent',context,actions));
    }
    
    /**
     * @param context
     * @param actions
     * @returns
     */
    function deleteInactiveRecords(context,actions){
        var searchResults = getResults(context.newRecord.type,context,actions,false,true);
        var searchResultLength = searchResults.results.run().getRange(0,1000).length;
        if(searchResultLength <= 250){
        	searchResults.results.run().each(function(e){
        		record.delete({
        			type:context.newRecord.type,
        			id:e.getValue('internalid')
        		});
        		return true;
        	});
        }
    }
    
    /**
     * @param obj - contains record type,resultSet
     * @description delete the related records or inactive 
     */
    function deleteRecords(obj,makeInactive){
    	obj.results.run().each(function(e){
    		if(makeInactive){    			
    			record.submitFields({
    			    type: obj.type,
    			    id: e.getValue('internalid'),
    			    values: {
    			        isinactive: makeInactive
    			    },
    			    options: {
    			        enableSourcing: false,
    			        ignoreMandatoryFields : true
    			    }
    			});
    		}else{
    			record.delete({
        			type:obj.type,
        			id:e.getValue('internalid')
        		});
    		}
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
    function getResults(type,context,actions,deleteInactive,searchInactive){		
    	if(deleteInactive && context.type == context.UserEventType.EDIT){
    		record.delete({
    			type:context.newRecord.type,
    			id:context.newRecord.id
    		});
    	}
    	var rec = (context.type == context.UserEventType.CREATE)?context.newRecord:context.oldRecord;
    	var promoid = actions[type].promoid;
    	var promoInternalid = rec.getValue(actions[context.newRecord.type].promoid);
    	var itemid = actions[type].itemid;
    	var itemInternalid = rec.getValue(actions[context.newRecord.type].itemid);
    	
    	var searchFilters = [[promoid,'anyof',promoInternalid],'and',
			 [itemid,'anyof',itemInternalid]];
    	
    	if(searchInactive){
    		searchFilters.push('and',['isinactive','is',true]);
    	}
    	
        var searchResults = search.create({
	    		type:type,
	    		columns:['internalid'],
	    		filters:searchFilters
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
