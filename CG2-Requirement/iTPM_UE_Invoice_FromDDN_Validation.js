/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/record', 'N/runtime', 'N/search'],
/**
 * @param {record} record
 */
function(record, runtime, search) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} sc
     * @param {Record} sc.newRecord - New record
     * @param {string} sc.type - Trigger type
     * @param {Form} sc.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(sc) {
    	
    	try{
    		var ddnId = sc.request.parameters.ddn;
    		if (!ddnId) return;
    		var ddnSearchId = runtime.getCurrentScript().getParameter({name:'custscript_itpm_reinvoiceddnsearch'});
    		if (!ddnSearchId) throw {name:'UE_BeforeLoad', message:'DDN Search ID Parameter empty.'};
    		var ddnSearch = search.load({id: ddnSearchId});
    		ddnSearch.filters.push(search.createFilter({
    			name: 'internalid',
    			operator: search.Operator.ANYOF,
    			values: [ddnId]
    		}));
    		var ddnResult = ddnSearch.run().getRange(0,1);
    		if (ddnResult.length != 1) throw {name:'UE_BeforeLoad', message:'DDN Search Result empty'};
    		var ddnCustomer = ddnResult[0].getValue({name:'entity'}),
    			ddnBalance = ddnResult[0].getValue({name:'custbody_itpm_ddn_openbal'}),
    			ddnNumber = ddnResult[0].getValue({name: 'tranid'}),
    			ddnInvoice = ddnResult[0].getText({name: 'custbody_itpm_ddn_invoice'});
    		if(sc.type == 'create'){
    				invoice = sc.newRecord;
            		invoice.setValue({
            		    fieldId: 'custbody_itpm_deduction',
            		    value: ddnId,
            		    ignoreFieldChange: true
            		});
            		invoice.setValue({
            		    fieldId: 'custbody_itpm_set_deduction',
            		    value: ddnId,
            		    ignoreFieldChange: true
            		});
            		invoice.setValue({
            		    fieldId: 'entity',
            		    value: ddnCustomer,
            		    ignoreFieldChange: true
            		});
            		var items = sc.form.getSublist({id: 'item'});
            		// CHANGE BLOCK BELOW AFTER MODIFYING THE ITPM PREFERENCES
            		// REMOVE HARDOCDING VALUE
            		items.setSublistValue({
            			id: 'item',
            			line: 0,
            			value: 1016
            		});
            		// END CHANGE 
            		items.setSublistValue({
            			line: 0,
            			id: 'rate',
            			value: ddnBalance
            		});
            		items.setSublistValue({
            			line: 0,
            			id: 'price',
            			value: '-1'
            		});
            		items.setSublistValue({
            			line: 0,
            			id: 'description',
            			value: 'Disputed amount for shortpay (deduction #' + ddnNumber +') on Invoice #' + ddnInvoice
            		});
            		items.setSublistValue({
            			line: 0,
            			id: 'amount',
            			value: ddnBalance
            		});
    		}
    	}catch(e){
    		log.error('Error Occures',e);
    	}

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} sc
     * @param {Record} sc.newRecord - New record
     * @param {Record} sc.oldRecord - Old record
     * @param {string} sc.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(sc) {
    	if(sc.type == 'create'){
			var invoice = sc.newRecord,
	    	invHaveddn = invoice.getValue({fieldId:'custbody_itpm_set_deduction'});
			if(invHaveddn){
				var ddnRec = record.load({
		    		type:'customtransaction_itpm_deduction',
		    		id:invHaveddn
		    	}),
		    	ddnAmount = ddnRec.getValue({fieldId:'custbody_itpm_ddn_openbal'}),
		    	invAmount = invoice.getValue({fieldId:'total'});
//				log.debug('invoice',invoice)		
//		    	log.debug('ddnRec',ddnRec);
		    	log.debug('ddnAmount',ddnAmount);		
		    	log.debug('invAmount',invAmount);
				if(ddnAmount != invAmount){
					  throw 'Amount on Invoice MUST BE EQUAL To deduction open balance.'					
				}
			}
		}
    	
    	
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} sc
     * @param {Record} sc.newRecord - New record
     * @param {Record} sc.oldRecord - Old record
     * @param {string} sc.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(sc) {
    	if(sc.type == 'create'){
			var invoice = sc.newRecord,
				invHaveddn = invoice.getValue({fieldId:'custbody_itpm_set_deduction'});
			if(invHaveddn){
				var ddnRec = record.load({
		    		type:'customtransaction_itpm_deduction',
		    		id:invHaveddn
		    	}),
		    	ddnAmount = ddnRec.getValue({fieldId:'custbody_itpm_ddn_openbal'}),
		    	invAmount = invoice.getValue({fieldId:'total'});
				if(ddnAmount == invAmount){
					ddnRec.setValue({
					    fieldId: 'transtatus',
					    value: 'C',
					    ignoreFieldChange: true
					});
					var recordId = ddnRec.save({
					    enableSourcing: true,
					    ignoreMandatoryFields: true
					});
					log.debug('recordId ',recordId );
				} else {
					throw {name:'UE_AfterSubmit', message:'DDN Amount does not match Invoice Amount.'};
				}
				}
			}
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
