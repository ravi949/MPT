/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/redirect', 'N/search', 'N/runtime', 'N/record'],
/**
 * @param {redirect} redirect
 */
function(redirect,search,runtime,record) {
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
    	try{
    		var transRec = scriptContext.newRecord;
        	if(scriptContext.type == 'create' && transRec.getValue('custbody_itpm_applydiscounts')){

    		log.debug('getPrefDiscountDateValue  Before: ', runtime.getCurrentScript().getRemainingUsage());
    		 var prefDatesType = getPrefDiscountDateValue();
    		log.debug('getPrefDiscountDateValue After: ', runtime.getCurrentScript().getRemainingUsage());
    		var nbEstGov = getEstGovernance('2', transRec, prefDatesType);
    		var oiEstGov = getEstGovernance('3', transRec, prefDatesType);
    		log.debug('nbEstGov',nbEstGov);
    		log.debug('oiEstGov',oiEstGov);
            	redirect.toSuitelet({
            	    scriptId: 'customscript_itpm_nb_processing' ,
            	    deploymentId: 'customdeploy_itpm_nb_processing',
            	    parameters: {'id':transRec.id,'type':transRec.type} 
            	});        	
        	}
    	}catch(ex){
    		log.error(ex.name ,ex.message);
    	}
    	
    }
    
    function getEstGovernance(allowanceType, transRec, prefDatesType){
    	var estGov = 0;
    	
    	//fetching Preferance data
		estGov = estGov + 2;
		//load transaction
    	if(allowanceType == '2'){
    		estGov = estGov + 10;
    	}
    	else{
    		estGov = estGov + 20;
    	}
		
		var itemCount = transRec.getLineCount({
			    sublistId: 'item'
			});
		
		//for loop start
		 for(var i=0; i<itemCount; i++){
			 var lineItem = transRec.getSublistValue({
				 sublistId : 'item',
				 fieldId   : 'item',
				 line      : i
			 });
			 log.debug('getAllowanceItems Before: '+allowanceType, runtime.getCurrentScript().getRemainingUsage());
			 var itemResults = getAllowanceItems(prefDatesType, lineItem, transRec.getValue('entity'), transRec.getText('trandate'), allowanceType);
			 log.debug('getAllowanceItems After: '+allowanceType, runtime.getCurrentScript().getRemainingUsage());
			 itemResults.each(function(result){
				 	log.debug('# Lines per Item: ', (i+1));
				 	estGov = estGov + 22;
				 return true;
			 });
			 
			//for loop end
     		estGov = estGov + 10;
		 }
		
		 //transaction record commit after discount'
		 estGov = estGov + 20;
		 	return estGov;
    }
    
    function getAllowanceItems(prefDatesType, item, customer, trandate, allType){
    	var tranFilters = [
    		['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_status','anyof','3'], //here 3 means status is Approved
            'AND', 
            ['custrecord_itpm_all_mop','anyof',allType], //here 2 means Method of Payment is  Net Bill
            'AND', 
            ['custrecord_itpm_all_item','anyof',item], //item from transaction line
            'AND', 
            ['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_customer','anyof',customer] //customer from transaction
    	];
    	
    	//Adding the filters to the tranFilters array
		switch(prefDatesType){
		case 'Ship Date':
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate]); 
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]);
			break;
		case 'Order Date':
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate]);
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]);
			break;
		case 'Both':
			tranFilters.push('AND',[
				[['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]],
				'AND',
				[['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]]
			]);
			break;
		case 'Either':
			tranFilters.push('AND',[
				[['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]],
				'OR',
				[['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]]
			]);	
			break;
		}
    	var tranColumns = [
    	                   "custrecord_itpm_all_item",
    	                   "CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.name",
    	                   "CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.internalid",
    	                   "id",
    	                   "custrecord_itpm_all_mop",
    	                   "custrecord_itpm_all_type",
    	                   "custrecord_itpm_all_rateperuom",
    	                   "custrecord_itpm_all_percentperuom",
    	                   "custrecord_itpm_all_uom"
    	                   ];
    	
    	var searchObj = search.create({
    	      type: 'customrecord_itpm_promoallowance',
    	      filters: tranFilters,
    	      columns: tranColumns
    	});    	
//    	log.debug('Usage: Search getAllowanceItems', runtime.getCurrentScript().getRemainingUsage());
    	return searchObj.run();
    }
    function getPrefDiscountDateValue(){
    	try{
    		var searchObj = search.create({
    		    type: 'customrecord_itpm_preferences',
    		    columns : [{name: 'internalid'}]
    		});
    		
    		var searchResults = searchObj.run().getRange({
    		    start: 0,
    		    end  : 2
    		 });
    		var loadedRec = record.load({
				type:'customrecord_itpm_preferences',	 
				id:searchResults[0].getValue('internalid')
			 });
    		return loadedRec.getText({fieldId: 'custrecord_itpm_pref_discountdates'});
    	}catch(e){
    		log.error(e.name, e.message);
    	}    	
    }
    return {
        afterSubmit: afterSubmit
    };
    
});
