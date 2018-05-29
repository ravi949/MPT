/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/record', 
		'N/search'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {
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
    		var ddnParentSplitRecID = scriptContext.newRecord.getValue('custrecord_itpm_split');
        	var ddnParentSplitRec = record.load({
        		type:'customrecord_itpm_deductionsplit',
        		id:ddnParentSplitRecID
        	});
        	log.debug('ddnParentSplitRecID',ddnParentSplitRecID);
        	
        	//Search for iTPM deduction split line records with total amount
        	var sumOfSplitAmount = search.createColumn({
        	    name: 'custrecord_split_amount',
        	    summary: search.Summary.SUM
        	});
        	var splitLineSearch = search.create({
        		type:'customrecord_itpm_deductionsplitline',
        		columns:[sumOfSplitAmount],
        		filters:[['custrecord_itpm_split','anyof',ddnParentSplitRecID]]
        	}).run().getRange(0,1);
        	
        	log.debug('splitLineSearch',splitLineSearch);
        	//Split line sum of the total amount
        	var splitAmountTotal = splitLineSearch[0].getValue({name:'custrecord_split_amount',summary: search.Summary.SUM});
        	
        	log.debug('splitAmountTotal',splitAmountTotal);
        	log.debug('open bal amount',ddnParentSplitRec.getValue('custrecord_itpm_split_ddnopenbal'));
        	
        	//Comparing the Deduction split parent amount with split line total amount
        	if(ddnParentSplitRec.getValue('custrecord_itpm_split_ddnopenbal') == splitAmountTotal){
        		ddnParentSplitRec.setValue({
        			fieldId:'custrecord_itpm_import_completed',
        			value:true
        		}).save({
        			enableSourcing:false,
        			ignoreMandatoryFields:true
        		});
        	}
    	}catch(ex){
    		log.error(ex.name,ex.message);
    	}
    }

    return {
        afterSubmit: afterSubmit
    };
    
});
