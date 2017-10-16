/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 *
 */
define(['N/search',
        'N/record'
    ],
/**
 * @param {record} record
 */
function(search, record) {
   
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
    		var recIdEQ = scriptContext.newRecord.getValue('id');
            
	        //Fetching Promotion and Item values from Estimated Quantity
    		var promotionIdEQ = scriptContext.newRecord.getValue('custrecord_itpm_estqty_promodeal');
    		var itemIdEQ = scriptContext.newRecord.getValue('custrecord_itpm_estqty_item');
    		log.debug('recIdEQ, promotionIdEQ, itemIdEQ', recIdEQ+'& '+promotionIdEQ+' & '+itemIdEQ);
        
    		//Validate whether the Promotion status is DRAFT or not
    		var fieldLookUpEQProm = search.lookupFields({
    			type   : 'customrecord_itpm_promotiondeal',
    			id     : promotionIdEQ,
    			columns: ['custrecord_itpm_p_status']
    		});
    
    		var eqPromStatus = fieldLookUpEQProm.custrecord_itpm_p_status[0].text;
        
    		//Run if Promotion STATUS is Draft
    		if(eqPromStatus == 'Draft'){
    			log.debug("PROMOTION STATUS", "PROMOTIONS is "+eqPromStatus);
    			var kpiInternalID = '';
    			var kpiPromQnty = '';
            
    			//Finding related KPI to update
    			var kpiSearchObj = search.create({
    				type: "customrecord_itpm_kpi",
    				filters: [
    					["custrecord_itpm_kpi_promotiondeal","anyof",promotionIdEQ], 
    					"AND", 
    					["custrecord_itpm_kpi_item","anyof",itemIdEQ], 
    					],
    					columns: [
    						search.createColumn({
    							name: "internalid"
    						}),
    						search.createColumn({
    							name: "custrecord_itpm_kpi_esttotalqty"
    						})
    					]
    			});

    			kpiSearchObj.run().each(function(result){
    				kpiInternalID = result.getValue({name:'internalid'});
    				kpiPromQnty = result.getValue({name:'custrecord_itpm_kpi_esttotalqty'});
    			});
            
    			log.debug("kpiInternalID & kpiPromQnty", kpiInternalID+' & '+kpiPromQnty);
            
    			//Fetching required values from Estimated Quantity
    			var eqPromQty = scriptContext.newRecord.getValue('custrecord_itpm_estqty_estpromotedqty');
    			var ratePerUnitBB = scriptContext.newRecord.getValue('custrecord_itpm_estqty_rateperunitbb');
    			var ratePerUnitOI = scriptContext.newRecord.getValue('custrecord_itpm_estqty_rateperunitoi');
    			var ratePerUnitNB = scriptContext.newRecord.getValue('custrecord_itpm_estqty_rateperunitnb');
            
    			log.debug('rpuBB, rpuOI, rpuNB', ratePerUnitBB+' & '+ratePerUnitOI+' & '+ratePerUnitNB);
    			
    			//Updating the related KPI record
    			var kpiRecUpdate = record.submitFields({
            		type: 'customrecord_itpm_kpi',
            		id: kpiInternalID,
            		values: {
            			'custrecord_itpm_kpi_esttotalqty' : eqPromQty,
            			'custrecord_itpm_kpi_estimatedspendbb' : parseFloat(eqPromQty)+parseFloat(ratePerUnitBB),
            			'custrecord_itpm_kpi_estimatedspendoi' : parseFloat(eqPromQty)+parseFloat(ratePerUnitOI),
            			'custrecord_itpm_kpi_estimatedspendnb' : parseFloat(eqPromQty)+parseFloat(ratePerUnitNB),
            			'custrecord_itpm_kpi_lespendbb' : parseFloat(eqPromQty)+parseFloat(ratePerUnitBB),
            			'custrecord_itpm_kpi_lespendoi' : parseFloat(eqPromQty)+parseFloat(ratePerUnitOI),
            			'custrecord_itpm_kpi_lespendnb' : parseFloat(eqPromQty)+parseFloat(ratePerUnitNB),
            		},
            		options: {enablesourcing: true, ignoreMandatoryFields: true}
            	});
    			
    			log.debug('kpiRecUpdate', kpiRecUpdate);
            }	
    	}catch(e){
    		log.error(e.name,e.message);
    	}
    }

    return {
        onAction : onAction
    };
    
});