/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record'],
/**
 * @param {record} record
 */
function(record) {
   
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
    		if(sc.type == 'create'){
    			var ddnId = sc.request.parameters.recId;
    			if(ddnId){
    				var ddnRec = record.load({
    		    		type:'customtransaction_itpm_deduction',
    		    		id:ddnId
    		    	}),InvRec = sc.newRecord;
//            		log.debug('InvRec',InvRec );
            		InvRec.setValue({
            		    fieldId: 'custbody_itpm_deduction',
            		    value: ddnId,
            		    ignoreFieldChange: true
            		}).setValue({
            		    fieldId: 'entity',
            		    value: ddnRec.getValue({fieldId:'custbody_itpm_ddn_customer'}),
            		    ignoreFieldChange: true
            		}).setSublistValue({
            		    sublistId: 'item',
            		    fieldId: 'item',
            		    line: 0,
            		    value: 1015
            		}).commitLine({
            		    sublistId: 'item'
            		});
    			}
    		}
//        	log.debug('sc  custbody_itpm_deduction',sc.type amount);
//        	log.debug('sc',ddnId);
        	
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
			var invRec = sc.newRecord,
	    	invHaveddn = invRec.getValue({fieldId:'custbody_itpm_deduction'});
			if(invHaveddn){
				var ddnRec = record.load({
		    		type:'customtransaction_itpm_deduction',
		    		id:invHaveddn
		    	}),
		    	ddnAmount = ddnRec.getValue({fieldId:'custbody_itpm_ddn_openbal'}),
		    	invAmount = invRec.getValue({fieldId:'total'});
//				log.debug('InvRec',invRec)		
//		    	log.debug('ddnRec',ddnRec);
		    	log.debug('ddnAmount',ddnAmount);		
		    	log.debug('invAmount',invAmount);
				if(ddnAmount != invAmount){
					  throw 'Amount on Invoice MUST BE EQUAL To deduction open balance.'					
				}else if(ddnAmount == invAmount){
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

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
//        afterSubmit: afterSubmit
    };
    
});
