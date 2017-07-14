/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/search','N/record','N/runtime','./iTPM_Module'],

function(search,record,runtime,iTPM_Module) {
   
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
    		var estVolumeRec = scriptContext.newRecord,
    		scriptObj = runtime.getCurrentScript(),
			sumOfAllowancePerUOM = 0,
			itemId = scriptObj.getParameter({name:'custscript_itpm_estqty_totalrate_item'}),
			promoDealId = scriptObj.getParameter({name:'custscript_itpm_estqty_totalrate_promo'}),
			estqtyUnit = scriptObj.getParameter({name:'custscript_itpm_estqty_totalrate_unit'});

    		var unitsList = iTPM_Module.getItemUnits(itemId).unitArray;
    		//filter the base unit list
    		var filteredBaseList = unitsList.filter(function(list){return list.isBase == true})[0];

    		//searching for allowance with promotional/deal and item which are in active stage
    		search.create({
    			type:'customrecord_itpm_promoallowance',
    			columns:['custrecord_itpm_all_uom','custrecord_itpm_all_rateperuom','custrecord_itpm_all_percentperuom'],
    			filters:[['custrecord_itpm_all_promotiondeal','anyof',promoDealId],'and',
    				['custrecord_itpm_all_item','anyof',itemId],'and',['isinactive','is',false]
    			]
    		}).run().each(function(e){
    			var allowanceConvertionRate = unitsList.filter(function(list){return list.id == e.getValue('custrecord_itpm_all_uom')})[0];
    			var allowanceRatePerUOM = e.getValue('custrecord_itpm_all_rateperuom');

    			if(allowanceConvertionRate.id == estqtyUnit){
    				sumOfAllowancePerUOM += parseFloat(allowanceRatePerUOM);
    			}else{
    				var estVolumeByRate = unitsList.filter(function(e){return e.id == estqtyUnit})[0].conversionRate,
    				baseConvertionFactor = estVolumeByRate / allowanceConvertionRate.conversionRate;
    				sumOfAllowancePerUOM += parseFloat(e.getValue('custrecord_itpm_all_rateperuom'))*baseConvertionFactor;
    			}
    			return true;
    		})

    		log.debug('sumOfAllowancePerUOM',sumOfAllowancePerUOM);
    		return sumOfAllowancePerUOM;  		
			
    	}catch(e){
    		log.error('exception in estqty total rate cal',e);
    	}
    }

    return {
        onAction : onAction
    };
    
});
