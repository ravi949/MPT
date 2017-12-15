/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 
		'N/search',
		'./iTPM_Module.js'
		],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, itpm) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
    	//search for iTPM Promotion records which was approved and processing allocation contribution is true
    	return search.create({
    		type:'customrecord_itpm_promotiondeal',
    		columns:['internalid',
    				  search.createColumn({
    					  name:'internalid',
    					  join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL',
    					  sort:search.Sort.ASC
    				  }),
    				  'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.internalid',
    				  'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.custrecord_itpm_all_item',
    				  'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.custrecord_itpm_all_uom',
    				  'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.custrecord_itpm_all_mop',
    				  'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.custrecord_itpm_all_rateperuom'],
    		filters:[['custrecord_itpm_promo_allocationcontrbtn','is',true],'and',
    				 ['isinactive','is',false],'and',
    				 ['CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.isinactive','is',false],'and',
    				 ['custrecord_itpm_p_status','is',3]] //Approved
    	});
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	try{
    		var allResult = JSON.parse(context.value);
        	var allArray = allResult.values;
        	log.debug('allArray',allArray);
        	
        	//getting the allowance Unit,Rate per unit,Internalid,Item and MOP
        	var allUnitId = allArray["custrecord_itpm_all_uom.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"].value;
        	var allRatePerUnit = allArray["custrecord_itpm_all_rateperuom.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"];
        	var allwId = allArray["internalid.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"].value;
        	var allItem = allArray["custrecord_itpm_all_item.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"].value;
        	var allMOP = allArray["custrecord_itpm_all_mop.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"].value;
        	
        	log.debug('unit',allArray["custrecord_itpm_all_uom.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"].value);
        	log.debug('uom rate',allArray["custrecord_itpm_all_rateperuom.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"]);
        	log.debug('allowid',allArray["internalid.CUSTRECORD_ITPM_ALL_PROMOTIONDEAL"].value);
        	
        	//getting the item units list
        	var unitsList = itpm.getItemUnits(allItem).unitArray;
        	//searching the EstQty records with item and promotion
        	var estqtySearch = search.create({
    			type:'customrecord_itpm_estquantity',
    			columns:['custrecord_itpm_estqty_qtyby','custrecord_itpm_estqty_rateperunitoi','custrecord_itpm_estqty_rateperunitnb','custrecord_itpm_estqty_rateperunitbb'],
    			filters:[['custrecord_itpm_estqty_promodeal','anyof',allResult.id],'and',
    					 ['custrecord_itpm_estqty_item','anyof',allItem],'and',
    					 ['isinactive','is',false]]
    		}).run().getRange(0,1);
        	//getting the EstQty unit and EstQty conversion rate 
        	var estqtyUnitId = estqtySearch[0].getValue('custrecord_itpm_estqty_qtyby');
    		var estqtyRate = unitsList.filter(function(e){return e.id == estqtyUnitId})[0].conversionRate;
    		
    		//calculating the Allowance allocation contribution
    		var ratePerUnit = 0;
    		var allocationContribution = 0;
        	if(estqtyUnitId == allUnitId){
    			ratePerUnit = allRatePerUnit;
    		}else{
    			allRate = unitsList.filter(function(e){return e.id == allUnitId})[0].conversionRate;
    			ratePerUnit = allRatePerUnit * (estqtyRate/allRate);
    		}

        	switch(allMOP){
        	case '1':
        		allocationContribution = (estqtySearch[0].getValue('custrecord_itpm_estqty_rateperunitbb') == 0)?0:ratePerUnit/estqtySearch[0].getValue('custrecord_itpm_estqty_rateperunitbb');
        		break;
        	case '2':
        		allocationContribution = (estqtySearch[0].getValue('custrecord_itpm_estqty_rateperunitnb') == 0)?0:ratePerUnit/estqtySearch[0].getValue('custrecord_itpm_estqty_rateperunitnb');
        		break;
        	case '3':
        		allocationContribution = (estqtySearch[0].getValue('custrecord_itpm_estqty_rateperunitoi') == 0)?0:ratePerUnit/estqtySearch[0].getValue('custrecord_itpm_estqty_rateperunitoi');
        		break;
        	}
    		log.debug('pid',allResult.id);
    		context.write({
    			key:{
    				promoId:allResult.id,
    				mop:allMOP,
    				item:allItem
    			},
    			value:{
    				allwId:allwId,
    				allContribution:allocationContribution
    			}
    		});
    	}catch(ex){
    		log.error(ex.name,ex.message);
    	}
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
    	try{
    		log.debug('reduce context',context);
    		//submitting the records with calculated allowance contribution value
    		var allArray = context.values;
    		var lastItemIndex = allArray.length - 1;
    		var sumOfAllContribution = 0;
    		allArray.forEach(function(result,index){
    			var obj = JSON.parse(result);
    			obj.allContribution = (obj["allContribution"].toFixed(6)*1000000)/1000000;
    			record.submitFields({
				    type: 'customrecord_itpm_promoallowance',
				    id: obj.allwId,
				    values: {
				        'custrecord_itpm_all_contribution': (index == lastItemIndex)?(1-sumOfAllContribution):obj.allContribution
				    },
				    options: {
				        enableSourcing: false,
				        ignoreMandatoryFields : true
				    }
				});
    			sumOfAllContribution += obj.allContribution;
    			sumOfAllContribution = (sumOfAllContribution.toFixed(6)*1000000)/1000000;
    		});
    		
    		//changing the promotion allocation contribution status to false
    		context.write({key:JSON.parse(context.key)['promoId'], value:0});

    	}catch(ex){
    		log.error(ex.name,ex.messsage);
    	}
    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
    	try{
    		log.debug('summary',summary);
    		var processedPromos = [0];
    		summary.output.iterator().each(function (key, value){
    			if(!processedPromos.some(function(e){return e == key})){
    				log.error('key',key);
    				record.submitFields({
    					type: 'customrecord_itpm_promotiondeal',
    					id: key,
    					values: {
    						'custrecord_itpm_promo_allocationcontrbtn': false
    					},
    					options: {
    						enableSourcing: false,
    						ignoreMandatoryFields : true
    					}
    				});
    			}
    			processedPromos.push(key);
    			return true;
        	});
    	}catch(ex){
    		log.error(ex.name,ex.message);
    	}
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
