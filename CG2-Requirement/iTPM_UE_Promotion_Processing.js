/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget','N/record','N/runtime','N/url'],
/**
 * @param {serverWidget} serverWidget
 * @param {record} record
 * @param {runtime} runtime
 * @param {url} url
 */
function(serverWidget,record,runtime,url) {
   
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
    		if(runtime.executionContext == runtime.ContextType.USER_INTERFACE){
 
    			//this block for adding the New Settement button to Promotion record.
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
        			
        			//after copy and save the record it will show the copy in progress message
        			var copyInProgress = promoRec.getValue('custrecord_itpm_p_copyinprogress');
            		var copyRelatedRecords = promoRec.getValue('custrecord_itpm_p_copy');
            		if(copyInProgress && copyRelatedRecords){
            			var msgText = "This Promotion is queued for copying and cannot be edited until the linked records (Allowances, Estimated Quantities, and Retail Info) are copied over from the original promotion, Please be patient."
            			scriptContext.form.addField({
            					id:'custpage_copyinprg_message',
            					type:serverWidget.FieldType.INLINEHTML,
            					label:'script'
            			}).defaultValue = '<script language="javascript">require(["N/ui/message"],function(msg){msg.create({title:"Copy In Progress",message:"'+msgText+'",type: msg.Type.INFORMATION}).show()})</script>'
            		}
        		}
        		
    			//this block for showing the overlapping promotions in promotion record subtab
        		if(scriptContext.type == 'view' || scriptContext.type == 'edit'){
        			var customerId = promoRec.getValue('custrecord_itpm_p_customer');
        			var startDate = promoRec.getText('custrecord_itpm_p_shipstart');
        			var endDate = promoRec.getText('custrecord_itpm_p_shipend');
        			//setting the overlap promotion suitelet url as value to inline html field.
        			var overlapSuiteletURL = url.resolveScript({
    					scriptId: 'customscript_itpm_promo_overlaplist',
    					deploymentId: 'customdeploy_itpm_promo_overlaplist',
    					returnExternalUrl: false,
    					params: {
    						cid:customerId,
    						pdid:promoRec.id,
    						start:startDate,
    						end:endDate
    					}
    				});
        			promoRec.setValue({
    					fieldId:'custrecord_itpm_p_overlappingpromotions',
    					value:'<iframe id="boxnet_widget_frame" src="'+overlapSuiteletURL+'" align="center" style="width: 100%; height:600px; margin:0; border:0; padding:0" frameborder="0"></iframe>'
    				});
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
