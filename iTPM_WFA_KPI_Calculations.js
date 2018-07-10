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
    		var isKPIRecord = runtime.getCurrentScript().getParameter({name: 'custscript_itpm_is_kpi_record'});
    		log.error('Script Parameters: isEstQty? & isKPI?', isEstQtyRecord+' & '+isKPIRecord);
    			
    		if(isEstQtyRecord){
    			var recIdEQ = scriptContext.newRecord.getValue('id');
                
    	        //Fetching Promotion, Item, Total est. Qty. and unit values from Estimated Quantity
        		var promotionIdEQ = scriptContext.newRecord.getValue('custrecord_itpm_estqty_promodeal');
        		var itemIdEQ = scriptContext.newRecord.getValue('custrecord_itpm_estqty_item');
        		var redemptionFactor = scriptContext.newRecord.getValue('custrecord_itpm_estqty_redemption');
        		var totalestqty = scriptContext.newRecord.getValue('custrecord_itpm_estqty_totalqty');
    			var unit = scriptContext.newRecord.getValue('custrecord_itpm_estqty_qtyby');
    			log.debug('EQ: recIdEQ, promotionIdEQ, itemIdEQ, totalestqty, unit', recIdEQ+'& '+promotionIdEQ+' & '+itemIdEQ+' & '+totalestqty+' & '+unit);
            
        		//Fetching Status and Price Level values from Promotion
        		var fieldLookUpEQProm = search.lookupFields({
        			type   : 'customrecord_itpm_promotiondeal',
        			id     : promotionIdEQ,
        			columns: ['custrecord_itpm_p_status', 'custrecord_itpm_p_itempricelevel', 'custrecord_itpm_p_condition']
        		});
        
        		var eqPromStatus = fieldLookUpEQProm.custrecord_itpm_p_status[0].value;
        		var eqPromCondition = fieldLookUpEQProm.custrecord_itpm_p_condition[0].value;
        		var eqPromPriceLevel = fieldLookUpEQProm.custrecord_itpm_p_itempricelevel[0].value;
        		log.debug('EQ: eqPromStatus & eqPromCondition & eqPromPriceLevel', eqPromStatus+' & '+eqPromCondition+' & '+eqPromPriceLevel);
        		
        		//Run for all promotion statuses
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
            
    			log.debug("EQ: kpiInternalID & kpiPromQntye", kpiInternalID+' & '+kpiPromQnty);
            
    			//Fetching required values from Estimated Quantity
    			var eqPromQty = scriptContext.newRecord.getValue('custrecord_itpm_estqty_estpromotedqty');
    			eqPromQty = Math.round(eqPromQty);
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
            			'custrecord_itpm_kpi_estimatedrevenue' : parseFloat(estimatedRevenue),
            			'custrecord_itpm_kpi_uom' : unit
            		},
            		options: {enablesourcing: true, ignoreMandatoryFields: true}
            	});
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
    		
    		if(isKPIRecord){
    			//var recIdKPI = scriptContext.newRecord.id;
    			var allIdKPI = scriptContext.newRecord.id;
    			log.debug('KPI: allIdKPI', allIdKPI);
    			
                
    			
    	        //Fetching Promotion, Item, Total est. Qty. and unit values from KPI
        		//var promotionIdKPI = scriptContext.newRecord.getValue('custrecord_itpm_kpi_promotiondeal');
        		//var itemIdKPI = scriptContext.newRecord.getValue('custrecord_itpm_kpi_item');
    			//log.debug('KPI: recIdKPI & promotionIdKPI & itemIdKPI', recIdKPI+' & '+promotionIdKPI+' & '+itemIdKPI);
    			var promotionIdKPI = scriptContext.newRecord.getValue('custrecord_itpm_all_promotiondeal');
        		var itemIdKPI = scriptContext.newRecord.getValue('custrecord_itpm_all_item');
        		log.debug('KPI: promotionIdKPI & itemIdKPI', promotionIdKPI+' & '+itemIdKPI);
        		
        		var kpi_data = search.create({
        			type: 'customrecord_itpm_kpi',
        			columns: ['internalid'],
        			filters: [
        			          ['custrecord_itpm_kpi_promotiondeal', 'is', promotionIdKPI],
        			           'AND',
        			          ['custrecord_itpm_kpi_item', 'is', itemIdKPI]
        					 ]
        		}).run().getRange(0,2);
        		var recIdKPI = kpi_data[0].getValue('internalid');
        		log.debug('KPI: recIdKPI', recIdKPI);
        		
        		//Fetching required values for related Est. Qty. record 
        		var estqtyrec_data = search.create({
        			type: 'customrecord_itpm_estquantity',
        			columns: [
        			          'internalid',
        			          'custrecord_itpm_estqty_totalqty',
        			          'custrecord_itpm_estqty_redemption',
        			          'custrecord_itpm_estqty_qtyby',
        			          'custrecord_itpm_estqty_rateperunitbb',
        			          'custrecord_itpm_estqty_rateperunitoi',
        			          'custrecord_itpm_estqty_rateperunitnb'
        			         ],
        			filters: [
        			          ['custrecord_itpm_estqty_promodeal', 'is', promotionIdKPI],
        			           'AND',
        			          ['custrecord_itpm_estqty_item', 'is', itemIdKPI]
        					 ]
        		}).run().getRange(0,2);
        		log.debug('KPI: searchDataEQ', estqtyrec_data);
        		log.debug('KPI: eqID', estqtyrec_data[0].getValue('internalid'));
        		log.debug('KPI: eqTotalQty', estqtyrec_data[0].getValue('custrecord_itpm_estqty_totalqty'));
        		log.debug('KPI: eqRedemptionFact', estqtyrec_data[0].getValue('custrecord_itpm_estqty_redemption'));
        		        		
        		//Run only If there is any TOTAL QUANTITY on Est.Qty. record
        		if(estqtyrec_data[0].getValue('custrecord_itpm_estqty_totalqty')){
        			var promotedQtyOnEQ = (parseInt(estqtyrec_data[0].getValue('custrecord_itpm_estqty_totalqty')))*(parseFloat(estqtyrec_data[0].getValue('custrecord_itpm_estqty_redemption'))/100);
        			promotedQtyOnEQ = Math.round(promotedQtyOnEQ);
        			var unitOnEQ = estqtyrec_data[0].getValue('custrecord_itpm_estqty_qtyby');
        			var ratePerUnitBB = (estqtyrec_data[0].getValue('custrecord_itpm_estqty_rateperunitbb'))?estqtyrec_data[0].getValue('custrecord_itpm_estqty_rateperunitbb'):0;
        			var ratePerUnitOI = (estqtyrec_data[0].getValue('custrecord_itpm_estqty_rateperunitoi'))?estqtyrec_data[0].getValue('custrecord_itpm_estqty_rateperunitoi'):0;
        			var ratePerUnitNB = (estqtyrec_data[0].getValue('custrecord_itpm_estqty_rateperunitnb'))?estqtyrec_data[0].getValue('custrecord_itpm_estqty_rateperunitnb'):0;
        			log.debug('KPI: promotedQtyOnEQ & unitOnEQ', promotedQtyOnEQ+' & '+unitOnEQ);
        			log.debug('KPI: ratePerUnitBB', ratePerUnitBB);
            		log.debug('KPI: ratePerUnitOI', ratePerUnitOI);
            		log.debug('KPI: ratePerUnitNB', ratePerUnitNB);
                
            		//Fetching Status and Price Level values from the Promotion
            		var fieldLookUpKPIProm = search.lookupFields({
            			type   : 'customrecord_itpm_promotiondeal',
            			id     : promotionIdKPI,
            			columns: ['custrecord_itpm_p_itempricelevel']
            		});
            
            		var kpiPromPriceLevel = fieldLookUpKPIProm.custrecord_itpm_p_itempricelevel[0].value;
            		log.debug('KPI: kpiPromPriceLevel', kpiPromPriceLevel);
            		
            		//Calculating Estimated Revenue real time(calculate Impact Price): Step 1
        			var itemImpactPrice = itpm.getImpactPrice({pid: promotionIdKPI, itemid: itemIdKPI, pricelevel: kpiPromPriceLevel, baseprice: 0});
        			
        			//Calculating Estimated Revenue real time(Calculating Item 'sale unit rate' and 'unit rate'): Step 2
        			var itemSaleUnit = search.lookupFields({type:search.Type.ITEM,id:itemIdKPI,columns:['saleunit']})['saleunit'][0].value;
    				var itemunits = itpm.getItemUnits(itemIdKPI)['unitArray'];
    				var unitrate = parseFloat(itemunits.filter(function(obj){return obj.id == unitOnEQ})[0].conversionRate);
    				var saleunitrate = parseFloat(itemunits.filter(function(obj){return obj.id == itemSaleUnit})[0].conversionRate);
    				log.debug('KPI: itemSaleUnit, unitrate, saleunitrate',itemSaleUnit+' & '+unitrate+' & '+saleunitrate);
    				
    				//Calculating Estimated Revenue: Step 3
    				var estimatedRevenue = parseFloat(promotedQtyOnEQ) * parseFloat(itemImpactPrice.price) * (unitrate / saleunitrate);
    				log.debug('KPI: estimatedRevenue',estimatedRevenue);
    				
    				//Updating the related KPI record
//        			var kpiRecUpdate = record.submitFields({
//                		type: 'customrecord_itpm_kpi',
//                		id: recIdKPI,
//                		values: {
//                			'custrecord_itpm_kpi_esttotalqty' : promotedQtyOnEQ,
//                			'custrecord_itpm_kpi_estimatedspendbb' : parseFloat(promotedQtyOnEQ)*parseFloat(ratePerUnitBB),
//                			'custrecord_itpm_kpi_estimatedspendoi' : parseFloat(promotedQtyOnEQ)*parseFloat(ratePerUnitOI),
//                			'custrecord_itpm_kpi_estimatedspendnb' : parseFloat(promotedQtyOnEQ)*parseFloat(ratePerUnitNB),
//                			'custrecord_itpm_kpi_lespendbb' : parseFloat(promotedQtyOnEQ)*parseFloat(ratePerUnitBB),
//                			'custrecord_itpm_kpi_lespendoi' : parseFloat(promotedQtyOnEQ)*parseFloat(ratePerUnitOI),
//                			'custrecord_itpm_kpi_lespendnb' : parseFloat(promotedQtyOnEQ)*parseFloat(ratePerUnitNB),
//                			'custrecord_itpm_kpi_estimatedrevenue' : parseFloat(estimatedRevenue),
//                			'custrecord_itpm_kpi_uom' : unitOnEQ
//                		},
//                		options: {enablesourcing: true, ignoreMandatoryFields: true}
//                	});
//        			log.audit('KPI: kpiRecUpdate', kpiRecUpdate);
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