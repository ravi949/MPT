/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * This script add the Apply To Deduction button on settlement based on conditions.
 */
define(['N/runtime', 'N/ui/serverWidget'],
/**
 * @param {runtime} runtime
 * @param {serverWidget} serverWidget
 */
function(runtime, serverWidget) {
   
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
    		if(runtime.executionContext == runtime.ContextType.USER_INTERFACE){
    			var settlementRec = scriptContext.newRecord,
    			setStatus = settlementRec.getValue('transtatus'), //Requested / Unapplied => A
    			setReqAmount = settlementRec.getValue('custbody_itpm_set_amount'),
    			setLumSum = settlementRec.getValue('custbody_itpm_set_reqls'),
    			setBB = settlementRec.getValue('custbody_itpm_set_reqbb'),
    			setOffInv = settlementRec.getValue('custbody_itpm_set_reqoi');
    			
    			if(setStatus == 'A' && setReqAmount > 0 && (setLumSum > 0 || setBB > 0 || setOffInv > 0)){
    				scriptContext.form.clientScriptModulePath = './iTPM_Attach_Settlement_ClientMethods.js';
    				scriptContext.form.addButton({
    					id:'custpage_itpm_applytoddn',
    					label:'Apply To Deduction',
    					functionName:'redirectToDeductionList('+scriptContext.newRecord.id+')'
    				});
    				scriptContext.form.addButton({
    					id:'custpage_itpm_applytocheck',
    					label:'Apply To Check',
    					functionName:'redirectToCheck('+scriptContext.newRecord.id+')'
    				});
    			}
    		}
    	}catch(e){
    		log.error(e.name,'record type = iTPM Settlement, record id='+scriptContext.newRecord.id+', message='+e.message);
    	}
    }

    return {
        beforeLoad: beforeLoad
    };
    
});