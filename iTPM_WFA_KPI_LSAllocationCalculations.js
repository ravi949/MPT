/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/search',
		'N/runtime'],
/**
 * @param {search} search
 * @param {runtime} runtime
 */
function(search, runtime) {
   
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
    		var scriptObj = runtime.getCurrentScript();
    		var calEstSpend = scriptObj.getParameter('custscript_itpm_kpi_calestspendls');
    		var calExpLib = scriptObj.getParameter('custscript_itpm_kpi_calexecptedlbls');
    		var calMaxLib = scriptObj.getParameter('custscript_itpm_kpi_calmaxlbls');
    		
    		var promoId = scriptContext.newRecord.getValue('custrecord_itpm_kpi_promotiondeal');
    		var itemId = scriptContext.newRecord.getValue('custrecord_itpm_kpi_item');
    		var promoLookup = search.lookupFields({
    			type:'customrecord_itpm_promotiondeal',
    			id:promoId,
    			columns:['custrecord_itpm_p_status','custrecord_itpm_p_condition','custrecord_itpm_p_lumpsum']
    		});
    		var promoLumSum = parseFloat(promoLookup['custrecord_itpm_p_lumpsum']);
    		var promoStatus = promoLookup['custrecord_itpm_p_status'][0].value;
    		var promoCondition = promoLookup['custrecord_itpm_p_condition'][0].value;
    		//LS ALLOCATION FACTOR : EST.
    		var allocationFactor = parseFloat(scriptContext.newRecord.getValue('custrecord_itpm_kpi_factorestls'));
    		//LS ALLOCATION ADJUSTED?
    		var adjusted = scriptContext.newRecord.getValue('custrecord_itpm_kpi_adjustedls');
    		
    		if(promoLumSum == 0){
    			return 0;
    		}
    		
    		//ESTIMATED SPEND : LS
    		if(calEstSpend){
        		return allocationFactor * promoLumSum;
    		}
    		
    		//Expected Liability : LS
    		if(calExpLib){
        		var expectedLiabilityLS = 0;    		
        		if(promoStatus == 3 || promoStatus == 7){
        			if(promoCondition == 3 || promoCondition == 2){
        				if(!adjusted){
        					expectedLiabilityLS = promoLumSum * allocationFactor;
        				}else{
        					expectedLiabilityLS = promoLumSum - getOtherKpiExpectedLibSUM(promoId,itemId);
        				}
        			}
        		}
        		return expectedLiabilityLS;
    		}
    		
    		//Maximum Liability : LS
    		if(calMaxLib){
    			var maxLiabilityLS = 0; 
    			//LS ALLOCATION FACTOR : ACTUAL
    			allocationFactor = scriptContext.newRecord.getValue('custrecord_itpm_kpi_factoractualls');
        		if(promoStatus == 3 || promoStatus == 7){
        			if(promoCondition == 3 || promoCondition == 2){
        				if(!adjusted){
        					maxLiabilityLS = promoLumSum * allocationFactor;
        				}else{
        					maxLiabilityLS = promoLumSum - getOtherKpiMaxLibSUM(promoId,itemId);
        				}
        			}
        		}
        		return maxLiabilityLS;
    		}
    	}catch(ex){
    		log.error(ex.name,ex.message);
    		return 0;
    	}
    }

    /**
     * @param promoId
     * @param itemId
     * @returns SUM of Expected Liability LS for other items
     */
   function getOtherKpiExpectedLibSUM(promoId,itemId){
    	//get the SUM of Expected Liability LS for other items
    	var kpiSearch = search.create({
    		type:'customrecord_itpm_kpi',
    		columns:[
    			search.createColumn({
    				name:'custrecord_itpm_kpi_expectedliabilityls',
    				summary:search.Summary.SUM
    			})
    		],
    		filters:[
    			['custrecord_itpm_kpi_promotiondeal','anyof',promoId],'and',
    			['custrecord_itpm_kpi_item','noneof',itemId],'and',
    			['isinactive','is',false]
    		]
    	}).run().getRange(0,1);
    	return parseFloat(kpiSearch[0].getValue({name:'custrecord_itpm_kpi_expectedliabilityls',summary:search.Summary.SUM}));
    }
    
   /**
    * @param promoId
    * @param itemId
    * @returns SUM of Maximum Liability LS for other items
    */
    function getOtherKpiMaxLibSUM(promoId,itemId){
    	//get the SUM of Maximum Liability LS for other items
    	var kpiSearch = search.create({
    		type:'customrecord_itpm_kpi',
    		columns:[
    			search.createColumn({
    				name:'custrecord_itpm_kpi_maximumliabilityls',
    				summary:search.Summary.SUM
    			})
    		],
    		filters:[
    			['custrecord_itpm_kpi_promotiondeal','anyof',promoId],'and',
    			['custrecord_itpm_kpi_item','noneof',itemId],'and',
    			['isinactive','is',false]
    		]
    	}).run().getRange(0,1);
    	return parseFloat(kpiSearch[0].getValue({name:'custrecord_itpm_kpi_maximumliabilityls',summary:search.Summary.SUM}));
    }
    
    return {
        onAction : onAction
    };
    
});
