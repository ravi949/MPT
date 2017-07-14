/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * Adding the Deduction button on invoice if invoice has atlease on payment and dont have any deduction records(Open and Pending)
 */
define(['N/search', 'N/ui/serverWidget', 'N/runtime'],
/**
 * @param {search} search
 * @param {serverWidget} serverWidget
 */
function(search, serverWidget, runtime) {
   
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
    			//invoice has atleast one PAYMENTS and invoice status not equal to PAID IN FULL
    			var invConditionsMet = search.create({
    				type:search.Type.INVOICE,
    				columns:['internalid'],
    				filters:[
    					['internalid','anyof',scriptContext.newRecord.id],'and',
    					['applyingtransaction','noneof','none'],'and',
    					['applyingtransaction.type','anyof','CustPymt'],'and',
    					['mainline','is','T'],'and',
    					['status','noneof','CustInvc:B']
    					] 
    			}).run().getRange(0,5).length>0;

    			//invoice dont have any ITPM DEDUCTION records which is not Open,Pending
    			var invoiceDeductionsAreEmpty = search.create({
    				type:'customtransaction_itpm_deduction',
    				columns:['internalid'],
    				filters:[['custbody_itpm_ddn_invoice','is',scriptContext.newRecord.id],'and',
    					['status','anyof',["Custom100:A","Custom100:B"]]]
    			}).run().getRange(0,5).length == 0;
    			log.debug('asdf',invConditionsMet && invoiceDeductionsAreEmpty)
    			if(invConditionsMet && invoiceDeductionsAreEmpty){
    				scriptContext.form.clientScriptModulePath = './iTPM_Attach_Invoice_ClientMethods.js';
    				scriptContext.form.addButton({
    					id:'custpage_itpm_newddn',
    					label:'Deduction',
    					functionName:'iTPMDeduction('+scriptContext.newRecord.id+')'
    				})
    			}
    			
    		}
    	}catch(e){
    		log.error(e.name,' record type = invoice, record id='+scriptContext.newRecord.id+' message='+e.message);
    	}
    }

    return {
        beforeLoad: beforeLoad
    };
    
});
