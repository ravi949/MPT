/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 *
 */
define(['N/search',
        'N/record',
        './iTPM_Module.js'
    ],
/**
 * @param {record} record
 */
function(search, record, itpm) {
   
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
            
	        //Fetching Promotion, Item, Total est. Qty. and unit values from Estimated Quantity
    		var promotionIdEQ = scriptContext.newRecord.getValue('custrecord_itpm_estqty_promodeal');
    		var itemIdEQ = scriptContext.newRecord.getValue('custrecord_itpm_estqty_item');
    		var totalestqty = scriptContext.newRecord.getValue('custrecord_itpm_estqty_totalqty');
			var unit = scriptContext.newRecord.getValue('custrecord_itpm_estqty_qtyby');
			log.debug('recIdEQ, promotionIdEQ, itemIdEQ, totalestqty, unit', recIdEQ+'& '+promotionIdEQ+' & '+itemIdEQ+' & '+totalestqty+' & '+unit);
        
    		//Fetching Status and Price Level values from Promotion
    		var fieldLookUpEQProm = search.lookupFields({
    			type   : 'customrecord_itpm_promotiondeal',
    			id     : promotionIdEQ,
    			columns: ['custrecord_itpm_p_status', 'custrecord_itpm_p_itempricelevel', 'custrecord_itpm_p_condition']
    		});
    
    		var eqPromStatus = fieldLookUpEQProm.custrecord_itpm_p_status[0].value;
    		var eqPromCondition = fieldLookUpEQProm.custrecord_itpm_p_condition[0].value;
    		var eqPromPriceLevel = fieldLookUpEQProm.custrecord_itpm_p_itempricelevel[0].value;
    		log.debug('eqPromStatus & eqPromCondition & eqPromPriceLevel', eqPromStatus+' & '+eqPromCondition+' & '+eqPromPriceLevel);
    		
    		//Run if Promotion STATUS is Draft
    		if(eqPromStatus == 1){
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
            
    			log.debug("kpiInternalID & kpiPromQntye", kpiInternalID+' & '+kpiPromQnty);
            
    			//Fetching required values from Estimated Quantity
    			var eqPromQty = scriptContext.newRecord.getValue('custrecord_itpm_estqty_estpromotedqty');
    			var ratePerUnitBB = scriptContext.newRecord.getValue('custrecord_itpm_estqty_rateperunitbb');
    			var ratePerUnitOI = scriptContext.newRecord.getValue('custrecord_itpm_estqty_rateperunitoi');
    			var ratePerUnitNB = scriptContext.newRecord.getValue('custrecord_itpm_estqty_rateperunitnb');
    			log.debug('rpuBB, rpuOI, rpuNB', ratePerUnitBB+' & '+ratePerUnitOI+' & '+ratePerUnitNB);
    			
    			//Calculating Estimated Revenue real time: Step 1
    			var itemImpactPrice = itpm.getImpactPrice({pid: promotionIdEQ, itemid: itemIdEQ, pricelevel: eqPromPriceLevel, baseprice: 0});
    			
    			//Calculating Estimated Revenue real time(Calculating Item 'sale unit rate' and 'unit rate'): Step 2
    			var itemSaleUnit = search.lookupFields({type:search.Type.ITEM,id:itemIdEQ,columns:['saleunit']})['saleunit'][0].value;
				var itemunits = itpm.getItemUnits(itemIdEQ)['unitArray'];
				var unitrate = parseFloat(itemunits.filter(function(obj){return obj.id == unit})[0].conversionRate);
				var saleunitrate = parseFloat(itemunits.filter(function(obj){return obj.id == itemSaleUnit})[0].conversionRate);
				log.debug('itemSaleUnit, unitrate, saleunitrate',itemSaleUnit+' & '+unitrate+' & '+saleunitrate);
				
				//Calculating Estimated Revenue: Step 3
				var estimatedRevenue = parseFloat(totalestqty) * parseFloat(itemImpactPrice.price) * (unitrate / saleunitrate);
				log.debug('estimatedRevenue',estimatedRevenue);
    			
    			//Updating the related KPI record
    			var kpiRecUpdate = record.submitFields({
            		type: 'customrecord_itpm_kpi',
            		id: kpiInternalID,
            		values: {
            			'custrecord_itpm_kpi_esttotalqty' : eqPromQty,
            			'custrecord_itpm_kpi_estimatedspendbb' : parseFloat(eqPromQty)*parseFloat(ratePerUnitBB),
            			'custrecord_itpm_kpi_estimatedspendoi' : parseFloat(eqPromQty)*parseFloat(ratePerUnitOI),
            			'custrecord_itpm_kpi_estimatedspendnb' : parseFloat(eqPromQty)*parseFloat(ratePerUnitNB),
            			'custrecord_itpm_kpi_lespendbb' : parseFloat(eqPromQty)*parseFloat(ratePerUnitBB),
            			'custrecord_itpm_kpi_lespendoi' : parseFloat(eqPromQty)*parseFloat(ratePerUnitOI),
            			'custrecord_itpm_kpi_lespendnb' : parseFloat(eqPromQty)*parseFloat(ratePerUnitNB),
            			'custrecord_itpm_kpi_estimatedrevenue' : parseFloat(estimatedRevenue)
            		},
            		options: {enablesourcing: true, ignoreMandatoryFields: true}
            	});
    			log.debug('kpiRecUpdate', kpiRecUpdate);
            }
    		
    		//Trigger KPI Queue logic when Est. Qty record on edit
    		if(eqPromStatus == 3 && (eqPromCondition == 2 || eqPromCondition == 3)){
    			var searchCount = search.create({
    				type : 'customrecord_itpm_kpiqueue',
    				filters : [
    				           ['custrecord_itpm_kpiq_promotion', 'is', promotionIdEQ],'and',
                               ['custrecord_itpm_kpiq_start','isempty',null],'and',
                               ['custrecord_itpm_kpiq_end','isempty',null]
    				]
    			}).runPaged().count;
    			log.debug('searchCount', searchCount);
    			
    			if(searchCount == 0){
    				//Creating New KPI Queue Record
    				itpm.createKPIQueue(promotionIdEQ, 2); //1.Scheduled, 2.Edited, 3.Status Changed, 4.Ad-hoc and 5.Settlement Status Changed
    			}
    		}
    	}catch(e){
    		log.error(e.name,e.message);
    	}
    }

    return {
        onAction : onAction
    };
    
});