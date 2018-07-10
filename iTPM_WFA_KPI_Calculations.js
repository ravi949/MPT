/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 *
 */
define(['N/search',
        'N/record',
        'N/runtime',
        './iTPM_Module.js'
    ],
/**
 * @param {record} record
 */
function(search, record, runtime, itpm) {
   
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
    		var isEstQtyRecord = runtime.getCurrentScript().getParameter({name: 'custscript_itpm_is_estqty_record'});
    		var isKPIRecordCreate = runtime.getCurrentScript().getParameter({name: 'custscript_itpm_is_kpi_record'});
    		log.error('Script Parameters: isEstQty? & isKPI?', isEstQtyRecord+' & '+isKPIRecordCreate);
    		
    		var recIdEQ = scriptContext.newRecord.getValue('id');
            
	        //Fetching Promotion, Item, Total est. Qty. and unit values from Estimated Quantity
    		var promotionIdEQ = scriptContext.newRecord.getValue('custrecord_itpm_estqty_promodeal');
    		var itemIdEQ = scriptContext.newRecord.getValue('custrecord_itpm_estqty_item');
    		var redemptionFactor = scriptContext.newRecord.getValue('custrecord_itpm_estqty_redemption');
    		var totalestqty = scriptContext.newRecord.getValue('custrecord_itpm_estqty_totalqty');
			var unit = scriptContext.newRecord.getValue('custrecord_itpm_estqty_qtyby');
			log.debug('EQ: recIdEQ, promotionIdEQ, itemIdEQ, totalestqty, unit, redemptionFactor', recIdEQ+'& '+promotionIdEQ+' & '+itemIdEQ+' & '+totalestqty+' & '+unit+' & '+redemptionFactor);
        
    		//Fetching Status and Price Level values from Promotion
    		var fieldLookUpEQProm = search.lookupFields({
    			type   : 'customrecord_itpm_promotiondeal',
    			id     : promotionIdEQ,
    			columns: ['custrecord_itpm_p_itempricelevel', 'custrecord_itpm_p_status', 'custrecord_itpm_p_condition']
    		});
    
    		var eqPromPriceLevel = fieldLookUpEQProm.custrecord_itpm_p_itempricelevel[0].value;
    		var eqPromStatus = fieldLookUpEQProm.custrecord_itpm_p_status[0].value;
    		var eqPromCondition = fieldLookUpEQProm.custrecord_itpm_p_condition[0].value;
    		log.debug('EQ: eqPromPriceLevel, eqPromStatus & eqPromCondition', eqPromPriceLevel+' & '+eqPromStatus+' & '+eqPromCondition);
    		
    		//Run for all promotion statuses
    		var kpiInternalID = '';
			
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
			});
        	log.debug("EQ: kpiInternalID", kpiInternalID);
        
			//Fetching required values from Estimated Quantity
			var eqPromQty = parseInt(totalestqty)*(parseInt(redemptionFactor)/100);
			eqPromQty = Math.floor(eqPromQty);
			var ratePerUnitBB = scriptContext.newRecord.getValue('custrecord_itpm_estqty_rateperunitbb');
			var ratePerUnitOI = scriptContext.newRecord.getValue('custrecord_itpm_estqty_rateperunitoi');
			var ratePerUnitNB = scriptContext.newRecord.getValue('custrecord_itpm_estqty_rateperunitnb');
			log.debug('EQ: eqPromQty, rpuBB, rpuOI, rpuNB', eqPromQty+' & '+ratePerUnitBB+' & '+ratePerUnitOI+' & '+ratePerUnitNB);
			
			//Calculating Estimated Revenue real time: Step 1
			var itemImpactPrice = itpm.getImpactPrice({pid: promotionIdEQ, itemid: itemIdEQ, pricelevel: eqPromPriceLevel, baseprice: 0});
			
			//Calculating Estimated Revenue real time(Calculating Item 'sale unit rate' and 'unit rate'): Step 2
			var itemSaleUnit = search.lookupFields({type:search.Type.ITEM,id:itemIdEQ,columns:['saleunit']})['saleunit'][0].value;
			var itemunits = itpm.getItemUnits(itemIdEQ)['unitArray'];
			var unitrate = parseFloat(itemunits.filter(function(obj){return obj.id == unit})[0].conversionRate);
			var saleunitrate = parseFloat(itemunits.filter(function(obj){return obj.id == itemSaleUnit})[0].conversionRate);
			log.debug('EQ: itemSaleUnit, unitrate, saleunitrate',itemSaleUnit+' & '+unitrate+' & '+saleunitrate);
			
			//Calculating Estimated Revenue: Step 3
			var estimatedRevenue = parseFloat(eqPromQty) * parseFloat(itemImpactPrice.price) * (unitrate / saleunitrate);
			log.debug('EQ: estimatedRevenue',estimatedRevenue);
			
			//Trigger only IF Est. Qty. record is edited
    		if(isEstQtyRecord){
    			//Updating the related KPI record
				var kpiRecUpdate = updateKPI(kpiInternalID, eqPromQty, ratePerUnitBB, ratePerUnitOI, ratePerUnitNB, estimatedRevenue, unit)
    			log.audit('EQ: kpiRecUpdate', kpiRecUpdate);
        		
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
        			log.debug('EQ: searchCount', searchCount);
        			
        			if(searchCount == 0){
        				//Creating New KPI Queue Record
        				itpm.createKPIQueue(promotionIdEQ, 2); //1.Scheduled, 2.Edited, 3.Status Changed, 4.Ad-hoc and 5.Settlement Status Changed
        			}
        		}
    		}
    		
    		//Trigger only IF Est. Qty. record is created
    		if(isKPIRecordCreate){
    			//Updating the related KPI record
				var kpiRecUpdate = updateKPI(kpiInternalID, eqPromQty, ratePerUnitBB, ratePerUnitOI, ratePerUnitNB, estimatedRevenue, unit)
    			log.audit('KPI: kpiRecUpdate', kpiRecUpdate);
    		}
    	}catch(e){
    		log.error(e.name,e.message);
    	}
    }

    function updateKPI(kpiInternalID, eqPromQty, ratePerUnitBB, ratePerUnitOI, ratePerUnitNB, estimatedRevenue, unit){
    	try{
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
        			'custrecord_itpm_kpi_estimatedrevenue' : parseFloat(estimatedRevenue),
        			'custrecord_itpm_kpi_uom' : unit
        		},
        		options: {enablesourcing: true, ignoreMandatoryFields: true}
        	});
    		
    		return kpiRecUpdate;
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }
    
    return {
        onAction : onAction
    };
    
});