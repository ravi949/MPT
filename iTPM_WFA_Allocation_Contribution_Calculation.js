/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record', 
		'N/search',
		'./iTPM_Module.js'
		],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search,itpm) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	
    	var estRecord = scriptContext.newRecord;
    	var estqtyPromoId = estRecord.getValue('custrecord_itpm_estqty_promodeal');
    	var itemId = estRecord.getValue('custrecord_itpm_estqty_item');;
    	//searching for the allowances records with Promo,Item and MOP.
		var allSearch = search.create({
			type:'customrecord_itpm_promoallowance',
			columns:['custrecord_itpm_all_rateperuom','custrecord_itpm_all_uom'],
			filters:[['custrecord_itpm_all_promotiondeal','anyof',estqtyPromoId],'and',
				     ['custrecord_itpm_all_item','anyof',itemId],'and',
				     ['isinactive','is',false]
			]
		}).run(),
		allResult = [],start = 0,end = 1000,result,allUnitId,allRate,allRatePerUnit,allUnitPrice;
		do{
			result = allSearch.getRange(start,end);
			allResult = allResult.concat(result);
			start  = start + end;
		}while(result.length == 1000);
		log.debug('allResult',allResult[0].id);
		log.debug('allResult',allResult);

    }

    return {
        onAction : onAction
    };
    
});
