/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * This script add the Apply To Deduction button on settlement based on conditions.
 */
define(['N/runtime',
		'N/ui/serverWidget',
		'./iTPM_Module.js'
		],
/**
 * @param {runtime} runtime
 * @param {serverWidget} serverWidget
 */
function(runtime, serverWidget, itpm) {
   
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
    			    message: "Copying a settlement is not allowed."
        		}
        	}
    		if(runtime.executionContext == runtime.ContextType.USER_INTERFACE){
    			var settlementRec = scriptContext.newRecord;
    			var setStatus = settlementRec.getValue('transtatus'); //Requested / Unapplied => A
    			var setReqAmount = settlementRec.getValue('custbody_itpm_amount');
    			var setLumSum = settlementRec.getValue('custbody_itpm_set_reqls');
    			var setBB = settlementRec.getValue('custbody_itpm_set_reqbb');
    			var setOffInv = settlementRec.getValue('custbody_itpm_set_reqoi');
    			
    			//getting the user permission on JE,-iTPM Deduction Permission and -iTPM Settlemet Permission records 
    			var scriptObj = runtime.getCurrentScript();
    			var JEPermission = runtime.getCurrentUser().getPermission('TRAN_JOURNAL');
    			var checkPermission = runtime.getCurrentUser().getPermission('TRAN_CHECK');
    			var ddnPermission = itpm.getUserPermission(scriptObj.getParameter('custscript_itpm_set_ddn_permsn_rectypeid'));
    			var setPermission = itpm.getUserPermission(scriptObj.getParameter('custscript_itpm_set_set_permsn_rectypeid'));
    			log.debug('JE Permission',JEPermission);
    			log.debug('ddn Permission',ddnPermission);
    			log.debug('ddn Permission',setPermission);
    			
    			if(setStatus == 'A' && setReqAmount > 0 && (setLumSum > 0 || setBB > 0 || setOffInv > 0)){
    				//-iTPM Settlement Permission and -iTPM Deduction Permission = Edit or greater and Journal Entry permission = CREATE or FULL
    				if(setPermission >= 3 && ddnPermission >= 3 && JEPermission >= 2){
        				scriptContext.form.addButton({
        					id:'custpage_itpm_applytoddn',
        					label:'Apply To Deduction',
        					functionName:'redirectToDeductionList('+scriptContext.newRecord.id+')'
        				});
    				}

    				//Check Permission = CREATE or greater and Journal Entry permission = CREATE or FULL
    				if (checkPermission >= 2 && JEPermission >= 2 && (setLumSum > 0 || setBB > 0)){
    					scriptContext.form.addButton({
        					id:'custpage_itpm_applytocheck',
        					label:'Apply To Check',
        					functionName:'redirectToCheck('+scriptContext.newRecord.id+')'
        				});
    				}
    			}
    			
    			//-iTPM Settlement Permission = FULL and Journal Entry permission = CREATE or FULL
    			if(setStatus == 'B' && setPermission == 4 && JEPermission >= 2){
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
