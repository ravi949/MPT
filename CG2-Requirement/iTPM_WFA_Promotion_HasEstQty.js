/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Workflow action script to check whether an iTPM Estimated Quantity record already exists for an Item and Promotion record.
 */
define(['N/search','N/runtime','N/util'],
/**
 * @param {search} search
 */
function(search,runtime,util) {
   
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
    		var scriptObj = runtime.getCurrentScript(),
    		promotion = scriptObj.getParameter({name:'custscript_itpm_all_hasestqty_promotion'}),
    		item = scriptObj.getParameter({name:'custscript_itpm_all_hasestqty_item'});
    		
    		var searchFilter = [['custrecord_itpm_estqty_promodeal','is',promotion],'and',
				['custrecord_itpm_estqty_item','is',item],'and',
				['isinactive','is',false]
			];
    		var recordId = scriptContext.newRecord.id;
    		
    		if(util.isNumber(recordId)){
    			searchFilter.push('and',['internalid','noneof',recordId]);
    		}
    		
    		var estqtyPresent = search.create({
    			type:'customrecord_itpm_estquantity',
    			columns:['internalid'],
    			filters:searchFilter
    		}).run().getRange(0,2).length >0; 
    		
    		return estqtyPresent?'T':'F';
    	}catch(e){
    		log.error(e.name,'error in promotion has est qty, message = '+e.message);
    	}
    }

    return {
        onAction : onAction
    };
    
});
