/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/search',
		'N/runtime',
		'./iTPM_Module'
		],
/**
 * @param {search} search
 */
function(search,runtime,iTPM_Module) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	try{
    		var itemId = runtime.getCurrentScript().getParameter({name:'custscript_itpm_rei_baseavgcost_item'});
    		var unitsList = iTPM_Module.getItemUnits(itemId);
    		var convertedAvgCost = 0;
    		
    		if(!unitsList.error){
    			var itemSearch = search.lookupFields({
        			type:search.Type.ITEM,
        			id:itemId,
        			columns:['averagecost','stockunit']
        		});
    			unitsList = unitsList.unitArray;
        		var itemAvgCost = parseFloat(itemSearch["averagecost"]).toFixed(2);
        		var baseUnitRate = unitsList.filter(function(e){return e.isBase})[0].conversionRate;
        		var itemUnitRate = unitsList.filter(function(e){return e.id == itemSearch["stockunit"][0].value})[0].conversionRate;
        		convertedAvgCost = (baseUnitRate/itemUnitRate)*itemAvgCost;
        		
    		}else{
    			log.error('units list',unitsList);
    		}
    		
    		return convertedAvgCost;
    		
    	}catch(e){
    		log.debug(e.name,e.message);
    		return 0;
    	}
    }

    return {
        onAction : onAction
    };
    
});
