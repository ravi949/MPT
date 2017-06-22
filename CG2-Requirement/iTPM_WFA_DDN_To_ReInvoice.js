/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * @NModuleScope TargetAccount
 */
define(['N/record', 'N/redirect', 'N/search', 'N/config'],
/**
 * @param {record} record
 * @param {redirect} redirect
 * @param {search} search
 */
function(record, redirect, search, config) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
    	log.error('asdfasfsdf','asdfasdfgsadg');
    	try{
    		var DeductionRec = scriptContext.newRecord,
    		customerRec = record.load({
    			type:record.Type.CUSTOMER,
    			id:DeductionRec.getValue('custbody_itpm_ddn_customer')
    		}),
    		configObj = config.load({
    			type:config.Type.ACCOUNTING_PREFERENCES
    		}),
    		defaultRecvAccnt = customerRec.getValue('receivablesaccount'),
    		recieveableAccnts = search.create({
    			type:search.Type.INVOICE,
    			columns:['internalid','account.type','account.name','account.internalid'],
    			filters:[['internalid','is',DeductionRec.getValue('custbody_itpm_ddn_invoice')],'and',['account.type','anyof',["AcctRec"]]]
    		}),recievableAccntId;

    		recieveableAccnts.run().each(function(e){
    			if(e.getValue({name:'type',join:'account'}) == 'AcctRec')
    				recievableAccntId = e.getValue({name:'internalid',join:'account'});
    			return true
    		})
    		if(defaultRecvAccnt == "-10"){
    			defaultRecvAccnt = configObj.getValue('ARACCOUNT');	
    			defaultRecvAccnt = (defaultRecvAccnt == '')?recievableAccntId:defaultRecvAccnt;
    		}
    		var JERec = record.create({
    			type:record.Type.JOURNAL_ENTRY
    		})

    		JERec.setValue({
    			fieldId:'subsidiary',
    			value:DeductionRec.getValue('subsidiary')
    		}).setValue({
    			fieldId:'currency',
    			value:DeductionRec.getValue('currency')
    		}).setValue({
    			fieldId:'custbody_itpm_set_deduction',
    			value:DeductionRec.id
    		}).setValue({
    			fieldId:'memo',
    			value:DeductionRec.getValue('memo')
    		}).setSublistValue({
    			sublistId:'line',
    			fieldId:'account',
    			value:defaultRecvAccnt,
    			line:0
    		}).setSublistValue({
    			sublistId:'line',
    			fieldId:'debit',
    			value:DeductionRec.getValue('custbody_itpm_ddn_openbal'),
    			line:0
    		}).setSublistValue({
    			sublistId:'line',
    			fieldId:'entity',
    			value:DeductionRec.getValue('custbody_itpm_ddn_customer'),
    			line:0
    		}).setSublistValue({
    			sublistId:'line',
    			fieldId:'memo',
    			value:DeductionRec.getValue('memo'),
    			line:0
    		})

    		JERec.setSublistValue({
    			sublistId:'line',
    			fieldId:'account',
    			value:DeductionRec.getSublistValue({sublistId: 'line',fieldId: 'account',line: 1}),
    			line:1
    		}).setSublistValue({
    			sublistId:'line',
    			fieldId:'credit',
    			value:DeductionRec.getValue('custbody_itpm_ddn_openbal'),
    			line:1
    		}).setSublistValue({
    			sublistId:'line',
    			fieldId:'memo',
    			value:DeductionRec.getValue('memo'),
    			line:1
    		})

    		JERecId = JERec.save({enableSourcing:false,ignoreMandatoryFields:true});
    		log.error('je record',JERecId);
    		//changing the status of the deduction record to resolved
    		if(JERecId){
    			record.load({
    				type:'customtransaction_itpm_deduction',
    				id:DeductionRec.id
    			}).setValue({
        			fieldId:'custbody_itpm_ddn_openbal',
        			value: 0
        		}).save({
        			enableSourcing: false,
					ignoreMandatoryFields : true
        		});
    		}


    	}catch(e){
    		log.error(e.name,e.message);
    	}
    
    }

    return {
        onAction : onAction
    };
    
});
