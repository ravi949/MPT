/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/search','N/runtime'],
/**
 * @param {search} search
 */
function(search,runtime) {
   
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
    		item = scriptObj.getParameter({name:'custscript_itpm_all_hasestqty_item'})
    		
    		var estqtyPresent = search.create({
    			type:'customrecord_itpm_estquantity',
    			columns:['internalid'],
    			filters:[['custrecord_itpm_estqty_promodeal','is',promotion],'and',
    				['custrecord_itpm_estqty_item','is',item],'and',
    				['isinactive','is',false]
    			]
    		}).run().getRange(0,2).length >0; 
    		
    		return estqtyPresent?'T':'F';
    	}catch(e){
    		log.debug('exception has estqty',e)
    	}
    }

    return {
        onAction : onAction
    };
    
});
