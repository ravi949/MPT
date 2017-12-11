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
		try{

			var recType = scriptContext.newRecord.type;
			//for Est.Qty deployment
			if(recType == 'customrecord_itpm_estquantity'){
				var estqtyRecord = scriptContext.newRecord;
				log.debug('estqtyRecord',estqtyRecord.id);
				allocationContributionCalculation(estqtyRecord);
			}
			//for Allowance deployment
			if(recType == 'customrecord_itpm_promoallowance'){
				var allRecord = scriptContext.newRecord;
				var estqtySearch =  search.create({
					type:'customrecord_itpm_estquantity',
					columns:['custrecord_itpm_estqty_qtyby'],
					filters:[['custrecord_itpm_estqty_promodeal','anyof',allRecord.getValue('custrecord_itpm_all_promotiondeal')],'and',
						['custrecord_itpm_estqty_item','anyof',allRecord.getValue('custrecord_itpm_all_item')],'and',
						['isinactive','is',false]
					]
				}).run().getRange(0,1);
				var estqtyRecord = record.load({
				    type: 'customrecord_itpm_estquantity', 
				    id: estqtySearch[0].id 
				});
				return allocationContributionCalculation(estqtyRecord,allRecord.id);
			}
		}catch(e){
			log.error(e.name,e.message + '; RecordId: ' + scriptContext.newRecord.id);
		}
	}
	/**
     * @param itemId
     * @returns Array
     * @description it created the array of member items from item group
     */
	function allocationContributionCalculation(estqtyRecord,allRecID){
		var allAllocationContribution = 0;
		var estqtyPromoId = estqtyRecord.getValue('custrecord_itpm_estqty_promodeal');
		var itemId = estqtyRecord.getValue('custrecord_itpm_estqty_item');
		var estqtyUnitId = estqtyRecord.getValue('custrecord_itpm_estqty_qtyby');
		var estqtyRatePerUnitBB = estqtyRecord.getValue('custrecord_itpm_estqty_rateperunitbb');
		var estqtyRatePerUnitOI = estqtyRecord.getValue('custrecord_itpm_estqty_rateperunitoi');
		var estqtyRatePerUnitNB = estqtyRecord.getValue('custrecord_itpm_estqty_rateperunitnb');
		var unitsList = itpm.getItemUnits(itemId).unitArray;
		var estqtyRate = unitsList.filter(function(e){return e.id == estqtyUnitId})[0].conversionRate;
		log.debug('Conversion_Rate',estqtyRate);
		//searching for the allowances records with Promo,Item and MOP.
		var allSearch = search.create({
			type:'customrecord_itpm_promoallowance',
			columns:['custrecord_itpm_all_rateperuom'
				     ,'custrecord_itpm_all_uom'
				     ,'custrecord_itpm_all_type'
				     ,'custrecord_itpm_all_mop'],
			filters:[['custrecord_itpm_all_promotiondeal','anyof',estqtyPromoId],'and',
				['custrecord_itpm_all_item','anyof',itemId],'and',
				['isinactive','is',false]
			]
		}).run();
		var allResult = [],start = 0,end = 1000,result,allUnitId,allRate,allRatePerUnit,allUnitPrice;
		do{
			result = allSearch.getRange(start,end);
			allResult = allResult.concat(result);
			start  = start + end;
		}while(result.length == 1000);
		log.debug('allResult',allResult);

		allResult.forEach(function(result){
			var ratePerUnit = 0;
			var allocationContribution = 0;
			var allMOP = result.getValue({name:'custrecord_itpm_all_mop'});
			allUnitId = result.getValue({name:'custrecord_itpm_all_uom'});
			allRatePerUnit = parseFloat(result.getValue({name:'custrecord_itpm_all_rateperuom'}));
			if(estqtyUnitId == allUnitId){
				ratePerUnit = allRatePerUnit;
			}else{
				allRate = unitsList.filter(function(e){return e.id == allUnitId})[0].conversionRate;
				allRate = (allRate)? (allrate!=0)? allRate : 1 : 1;
				ratePerUnit = allRatePerUnit * (estqtyRate/allRate);
			}
			if(allMOP == 1 ){
				allocationContribution = ratePerUnit/estqtyRatePerUnitBB;
			}
			if(allMOP == 2 ){
				allocationContribution = ratePerUnit/estqtyRatePerUnitNB;
			}					
			if(allMOP == 3 ){
				allocationContribution = ratePerUnit/estqtyRatePerUnitOI;
			}	
			if(allRecID == result.id){
				allAllocationContribution = allocationContribution;
			}else{
				var allId = record.submitFields({
				    type: 'customrecord_itpm_promoallowance',
				    id: result.id,
				    values: {
				        'custrecord_itpm_all_contribution': allocationContribution
				    },
				    options: {
				        enableSourcing: false,
				        ignoreMandatoryFields : true
				    }
				});
				log.debug('allId',allId);
			}
			
		});
		return allAllocationContribution;
		
	}

	return {
		onAction : onAction
	};

});
