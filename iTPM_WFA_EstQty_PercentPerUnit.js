/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/runtime',
	    'N/search'	
		],

function(runtime,search) {
   
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
    		var estqtyRec = scriptContext.newRecord;
    		var scriptObj = runtime.getCurrentScript();
    		var itemId = scriptObj.getParameter({name:'custscript_itpm_estqty_percent_item'});
    		var estqtyUnitId = scriptObj.getParameter({name:'custscript_itpm_estqty_percent_unit'});
    		var estqtyPromoId = scriptObj.getParameter({name:'custscript_itpm_estqty_percent_promo'});
    		var allMop = scriptObj.getParameter({name:'custscript_itpm_estqty_precent_allmop'}),percentRateUnit = 0;
    		//searching for the allowances records with Promo,Item and MOP.
    		var allSearch = search.create({
    			type:'customrecord_itpm_promoallowance',
    			columns:['custrecord_itpm_all_percentperuom'],
    			filters:[['custrecord_itpm_all_promotiondeal','anyof',estqtyPromoId],'and',
    				['custrecord_itpm_all_item','anyof',itemId],'and',
    				['isinactive','is',false],'and',
    				['custrecord_itpm_all_mop','is',allMop] //mop
    			]
    		}).run();
    		var allResult = [];
    		var start = 0;
    		var end = 1000;
    		var result;
    		var allPercentUnit = 0;
    		do{
    			result = allSearch.getRange(start,end);
    			allResult = allResult.concat(result);
    			start  = start + end;
    		}while(result.length == 1000);

    		allResult.forEach(function(result){
    			allPercentUnit = parseFloat(result.getValue({name:'custrecord_itpm_all_percentperuom'}));
    			percentRateUnit += (allPercentUnit)? allPercentUnit : 0;
    		});

    		//log.debug('percentRateUnit',percentRateUnit);
		log.debug('EstQty_Percent', 'Record: ' + estqtyRec.id + '; Item: ' + itemId + '; Unit: ' + estqtyUnitId + '; Promotion: ' + estqtyPromoId + '; MOP: ' + allMop + '; Percent: ' + percentRateUnit);
    		return percentRateUnit;
    	}catch(e){
			//log.error(e.name,'record id = '+scriptContext.newRecord.id+', message = '+e.message);
		log.error(e.name, e.message + '; RecordId: ' + scriptContext.newRecord.id);
		return 0;
    	}
    }

    return {
        onAction : onAction
    };
    
});
