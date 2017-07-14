/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget','N/record'],
/**
 * @param {serverWidget} serverWidget
 * @param {record} record
 */
function(serverWidget,record) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {
    	try{
    		var promoRec = scriptContext.newRecord;
    		var promoForm = scriptContext.form;
    		if(scriptContext.type == 'view'){
    			var status = promoRec.getValue('custrecord_itpm_p_status');
    			var condition = promoRec.getValue('custrecord_itpm_p_condition');
    			
    			//ALLOW SETTLEMENTS WHEN PROMOTION IS ACTIVE?
    			var allowForSettlement = record.load({
    				type:'customrecord_itpm_promotiontype',
    				id:promoRec.getValue('custrecord_itpm_p_type')
    			}).getValue('custrecord_itpm_pt_settlewhenpromoactive');
    			
    			var showSettlementButton = ((status == 3 && condition == 3) || (allowForSettlement && (status == 3 && condition == 2)));
    			
    			if(showSettlementButton){
    				promoForm.addButton({
    					id:'custpage_newsettlementbtn',
    					label:'New Settlement',
    					functionName:'newSettlement('+promoRec.id+')'
    				});
    				promoForm.clientScriptModulePath = './iTPM_Attach_Promotion_ClientMethods.js';
    			}
    		}
    	}catch(e){
    		log.error(e.name,'record id = '+scriptContext.newRecord.id+', function name = beforeload, message = '+e.message);
    	}
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {
    }

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
    	
    }

    return {
        beforeLoad: beforeLoad,
/*        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit*/
    };
    
});
