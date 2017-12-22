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

				//Adding Filters
				var searchFilter = [];
        		searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
        		searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator:search.Operator.ANYOF, values:promID}));
				
        		//Fetching KPI Item count
				var itemcountOnKPI = kpiSearch(searchFilter).runPaged().count;
				log.debug('KPI Item Count for Promotion', itemcountOnKPI);

				if(itemcountOnKPI <= 5){
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
						itpm.processAllocationsDraft(promID, promAllocType);
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

				if(promStatus == 1){ //Draft
					var params = {
							'itemid'     : item,
							'pricelevel' : pricelevel,
							'pid'		 : promID	
					}
					
					var itemObj = itpm.getImpactPrice(params);
					var itemunits = itpm.getItemUnits(item)['unitArray'];
					var unitrate = parseFloat(itemunits.filter(function(obj){return obj.id == unit})[0].conversionRate);
					var saleunitrate = parseFloat(itemunits.filter(function(obj){return obj.id == itemObj.saleunit})[0].conversionRate);
					log.debug('itemSaleUnit, unitrate, saleunitrate, price',itemObj.saleunit+' , '+unitrate+' , '+saleunitrate+' , '+itemObj.price); 

					var itemprice = (itemObj.price)*(unitrate/saleunitrate);
					log.debug('itemprice',itemprice);

					var estimatedRevenue = totalestqty*itemprice;
					log.debug('estimatedRevenue',estimatedRevenue);

					//Adding Filters
					var searchFilter = [];
	        		searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
	        		searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator: search.Operator.ANYOF, values:promID}));
	        		searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_item', operator:search.Operator.ANYOF, values:item}));
					
					//fetching KPIon the same Promotion for the same Item to update
	        		var kpiID = (kpiSearch(searchFilter).run().getRange({start:0, end:1}))[0].getValue({ name:'id'});
					log.debug('Estimated Revenue: kpiID',kpiID);

					//Updating Allocation Factors
					var kpiRecUpdate = record.submitFields({
						type: 'customrecord_itpm_kpi',
						id: kpiID,
						values: {
							'custrecord_itpm_kpi_estimatedrevenue' : parseFloat(estimatedRevenue),
						},
						options: {enablesourcing: true, ignoreMandatoryFields: true}
					});
					log.debug('updated KPI',kpiRecUpdate);

					//Fetching Item count on KPI record to update the Allocation Factors 
					var searchFilter = [];
	        		searchFilter.push(search.createFilter({name:'isinactive',operator:search.Operator.IS,values:"F"}));
	        		searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal',operator: search.Operator.ANYOF,values:promID}));

	        		var itemcountOnKPI = kpiSearch(searchFilter).runPaged().count;
					log.debug('KPI Item Count for Promotion', itemcountOnKPI);

					if(itemcountOnKPI <= 5){
						itpm.processAllocationsDraft(promID, promAllocType);
					}
				}

				log.debug('======= Remaining Usage: Est. Qty=======',runtime.getCurrentScript().getRemainingUsage());
			}
		}catch(e){
			log.error(e.name, e.message);
		}
	}

	function kpiSearch(searchFilter){
		try{
			return search.create({
				type: "customrecord_itpm_kpi",
				filters: searchFilter,
				columns: [search.createColumn({name: "id",sort: search.Sort.ASC})]
			});
		}catch(e){
			log.error(e.name, 'kpiSearch'+e.message);
		}
	}
	
	return {
		onAction : onAction
	};
});