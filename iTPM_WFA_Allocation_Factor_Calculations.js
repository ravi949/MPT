/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/search',
	'N/record',
	'N/runtime',
	'./iTPM_Module.js'
	],

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
			//Script Parameters
			var scriptObj = runtime.getCurrentScript();
			var isKpiRec = scriptObj.getParameter({name: 'custscript_itpm_is_kpirec'});
			var isEstqtyRec = scriptObj.getParameter({name: 'custscript_is_estqty_rec'});

			//Trigger only if Record is KPI
			if(isKpiRec){
				log.debug('Is KPI Record?', isKpiRec);

				//Fetching all Promotion record required fields
				var promID = scriptContext.newRecord.getValue('custrecord_itpm_kpi_promotiondeal');
				log.debug('Promotion ID', promID);

				//Fetching KPI Item count
				var itemcountsearchObj = search.create({
					type: "customrecord_itpm_kpi",
					filters: [
						["isinactive","is","F"], 
						"AND", 
						["custrecord_itpm_kpi_promotiondeal","anyof",promID]
						],
						columns: [
							search.createColumn({
								name: "id",
								sort: search.Sort.ASC
							})
							]
				});

				var itemcountOnKPI = itemcountsearchObj.runPaged().count;
				log.debug('KPI Item Count for Promotion', itemcountOnKPI);

				if(itemcountOnKPI <= 10){
					var fieldLookUp = search.lookupFields({
						type    : 'customrecord_itpm_promotiondeal',
						id      : promID,
						columns : ['custrecord_itpm_p_status', 'custrecord_itpm_p_lsallocation']
					});

					promStatus = fieldLookUp.custrecord_itpm_p_status[0].value;
					promAllocType = fieldLookUp.custrecord_itpm_p_lsallocation[0].value;
					log.debug('Promotion Status & Allocation type', promStatus+' & '+promAllocType);

					//Allocation factor calculation when promotion is DRAFT and Allocation Type is EVENLY
					if(promStatus == 1){    
						//Calculating BB Allocation Factors
						objbb = {
								promoId:promID,
								promoEstimatedSpend:'custrecord_itpm_estimatedspendbb',
								kpiEstimatedSpend:'custrecord_itpm_kpi_estimatedspendbb',
								mop:1, // 1 or 3
								kpiValues:{
									'custrecord_itpm_kpi_factorestbb' : 1,
									'custrecord_itpm_kpi_adjustedbb' : false
								}
						}
						itpm.calculateEstAllocationsBBOIDraft(objbb);

						//Calculating OI Allocation Factors
						objoi = {
								promoId:promID,
								promoEstimatedSpend:'custrecord_itpm_estimatedspendoi',
								kpiEstimatedSpend:'custrecord_itpm_kpi_estimatedspendoi',
								mop:3, // 1 or 3
								kpiValues:{
									'custrecord_itpm_kpi_factorestoi' : 1,
									'custrecord_itpm_kpi_adjsutedoi' : false
								}
						}
						itpm.calculateEstAllocationsBBOIDraft(objoi);

						//Calculating LS Allocation Factors
						itpm.calculateAllocationsLSforDraft(promID);
					}

					//Need to maintain the same values for ACTUAL if Allocation Type is Evenly (3)
					if(promAllocType == 3){
						//updating Actual Allocation factors if Allocation Type is "Evenly"
						itpm.updateKPIActualEvenly(promID);
					}
				}

				log.debug('======= Remaining Usage: KPI =======',runtime.getCurrentScript().getRemainingUsage());
			}
			//Trigger only if Record is Estimated Quantity
			else if(isEstqtyRec){
				log.debug('Is EstQty Record?', isEstqtyRec);

				//Fetching all Est.Qty. record required fields
				var totalestqty = scriptContext.newRecord.getValue('custrecord_itpm_estqty_totalqty');
				var unit = scriptContext.newRecord.getValue('custrecord_itpm_estqty_qtyby');
				var item = scriptContext.newRecord.getValue('custrecord_itpm_estqty_item');
				log.debug('totalestqty, unit & item', totalestqty+' , '+unit+' , '+item);

				//Fetching all Promotion record required fields
				var promID = scriptContext.newRecord.getValue('custrecord_itpm_estqty_promodeal');
				log.debug('Promotion ID', promID);

				var fieldLookUp = search.lookupFields({
					type    : 'customrecord_itpm_promotiondeal',
					id      : promID,
					columns : ['custrecord_itpm_p_itempricelevel', 'custrecord_itpm_p_status','custrecord_itpm_p_lsallocation']
				});

				pricelevel = fieldLookUp.custrecord_itpm_p_itempricelevel[0].value;
				promStatus = fieldLookUp.custrecord_itpm_p_status[0].value;
				promAllocType = fieldLookUp.custrecord_itpm_p_lsallocation[0].value;
				log.debug('pricelevel & Status& promAllocType', +pricelevel+' & '+promStatus+' ,'+promAllocType);

				if(promStatus == 1){
					var itemSaleUnit = search.lookupFields({type:search.Type.ITEM,id:item,columns:['saleunit']})['saleunit'][0].value;
					var itemunits = itpm.getItemUnits(item)['unitArray'];

					var unitrate = parseFloat(itemunits.filter(function(obj){return obj.id == unit})[0].conversionRate);
					var saleunitrate = parseFloat(itemunits.filter(function(obj){return obj.id == itemSaleUnit})[0].conversionRate);
					log.debug('itemSaleUnit, unitrate, saleunitrate',itemSaleUnit+' , '+unitrate+' , '+saleunitrate); 

					var allowanceSearchObj = search.create({
						type: "customrecord_itpm_promoallowance",
						filters: [
							["custrecord_itpm_all_promotiondeal","anyof",promID], 
							"AND", 
							["custrecord_itpm_all_item","anyof",item], 
							"AND", 
							["isinactive","is","F"]
							],
							columns: [
								"custrecord_itpm_all_impactprice"
								]
					});

					var impactprice = parseFloat((allowanceSearchObj.run().getRange({start:0, end:1}))[0].getValue({ name:'custrecord_itpm_all_impactprice'}));
					log.debug('impactprice',impactprice); 
					var itemprice = impactprice*(unitrate/saleunitrate);
					log.debug('itemprice',itemprice);

					var estimatedRevenue = totalestqty*itemprice;
					log.debug('estimatedRevenue',estimatedRevenue);

					//fetching KPIon the same Promotion for the same Item to update
					var kpiSearchObj = search.create({
						type: "customrecord_itpm_kpi",
						filters: [
							["isinactive","is","F"], 
							"AND", 
							["custrecord_itpm_kpi_promotiondeal","anyof",promID], 
							"AND", 
							["custrecord_itpm_kpi_item","anyof",item]
							],
							columns: [
								search.createColumn({
									name: "id",
									sort: search.Sort.ASC
								})
								]
					});

					var kpiID = (kpiSearchObj.run().getRange({start:0, end:1}))[0].getValue({ name:'id'});
					log.debug('kpiID',kpiID);

					var kpiRecUpdate = record.submitFields({
						type: 'customrecord_itpm_kpi',
						id: kpiID,
						values: {
							'custrecord_itpm_kpi_estimatedrevenue' : parseFloat(estimatedRevenue),
						},
						options: {enablesourcing: true, ignoreMandatoryFields: true}
					});
					log.debug('updated KPI',kpiRecUpdate);

					//Fetching Item count on Est. Qty. record to restrict to update KPI All. Fact's 
					var estqtyitemcount_searchObj = search.create({
						type: "customrecord_itpm_estquantity",
						filters: [
							["isinactive","is","F"], 
							"AND", 
							["custrecord_itpm_estqty_promodeal","anyof",promID]
							],
							columns: [
								search.createColumn({
									name: "id",
									sort: search.Sort.ASC
								})
								]
					});

					var itemcount = estqtyitemcount_searchObj.runPaged().count;
					log.debug('Est. Qty. Item Count on Promotion', itemcount);

					if(itemcount <= 10){
						//Updating BB Allocation Factors
						objbb = {
								promoId:promID,
								promoEstimatedSpend:'custrecord_itpm_estimatedspendbb',
								kpiEstimatedSpend:'custrecord_itpm_kpi_estimatedspendbb',
								mop:1, // 1 or 3
								kpiValues:{
									'custrecord_itpm_kpi_factorestbb' : 1,
									'custrecord_itpm_kpi_adjustedbb' : false
								}
						}
						itpm.calculateEstAllocationsBBOIDraft(objbb);

						//Updating OI Allocation Factors
						objoi = {
								promoId:promID,
								promoEstimatedSpend:'custrecord_itpm_estimatedspendoi',
								kpiEstimatedSpend:'custrecord_itpm_kpi_estimatedspendoi',
								mop:3, // 1 or 3
								kpiValues:{
									'custrecord_itpm_kpi_factorestoi' : 1,
									'custrecord_itpm_kpi_adjsutedoi' : false
								}
						}
						itpm.calculateEstAllocationsBBOIDraft(objoi);

						//Updating LS Allocation Factors
						itpm.calculateAllocationsLSforDraft(promID);
						
						//Need to maintain the same values for ACTUAL if Allocation Type is Evenly (3)
						if(promAllocType == 3){
							//updating Actual Allocation factors if Allocation Type is "Evenly"
							itpm.updateKPIActualEvenly(promID);
						}
					}
				}

				log.debug('======= Remaining Usage: Est. Qty=======',runtime.getCurrentScript().getRemainingUsage());
			}
		}catch(e){
			log.error(e.name, e.message);
		}
	}

	return {
		onAction : onAction
	};

});

