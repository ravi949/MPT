/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * This script add the Apply To Deduction button on settlement based on conditions.
 */
define(['N/runtime',
		'N/ui/serverWidget'
		],
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
    		if(scriptContext.type == 'copy'){
        		throw {
    			    name: 'copy settlement',
    			    message: "You don't have permission to copy this record."
        		}
        	}
    		if(runtime.executionContext == runtime.ContextType.USER_INTERFACE){
    			var settlementRec = scriptContext.newRecord;
    			var setStatus = settlementRec.getValue('transtatus'); //Requested / Unapplied => A
    			var setReqAmount = settlementRec.getValue('custbody_itpm_set_amount');
    			var setLumSum = settlementRec.getValue('custbody_itpm_set_reqls');
    			var setBB = settlementRec.getValue('custbody_itpm_set_reqbb');
    			var setOffInv = settlementRec.getValue('custbody_itpm_set_reqoi');
    			
    			if(setStatus == 'A' && setReqAmount > 0 && (setLumSum > 0 || setBB > 0 || setOffInv > 0)){
    				scriptContext.form.addButton({
    					id:'custpage_itpm_applytoddn',
    					label:'Apply To Deduction',
    					functionName:'redirectToDeductionList('+scriptContext.newRecord.id+')'
    				});
    				if (setLumSum > 0 || setBB > 0){
    					scriptContext.form.addButton({
        					id:'custpage_itpm_applytocheck',
        					label:'Apply To Check',
        					functionName:'redirectToCheck('+scriptContext.newRecord.id+')'
        				});
    				}
    			}
    			
    			if(setStatus == 'A' || setStatus == 'B'){
    				scriptContext.form.addButton({
    					id:'custpage_itpm_settlemevoid',
    					label:'Void',
    					functionName:'voidSettlement('+scriptContext.newRecord.id+')'
    				});
    			}
    			
    			scriptContext.form.clientScriptModulePath = './iTPM_Attach_Settlement_ClientMethods.js';
    		}
    	}catch(e){
    		if(e.name == 'copy settlement')
    			throw new Error(e.message);
    		else
    			log.error(e.name,'record type = iTPM Settlement, record id='+scriptContext.newRecord.id+', message='+e.message);
    	}
    }

    return {
        beforeLoad: beforeLoad
    };
    
});
