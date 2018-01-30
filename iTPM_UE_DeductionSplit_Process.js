/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/record',
		'N/runtime',
		'N/ui/serverWidget'],

function(record, runtime, serverWidget) {
   
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
        	if(scriptContext.type == 'create'){
        		var params = scriptContext.request.parameters;
        		var ddnSplitRec = scriptContext.newRecord;
        		log.debug('params',params.ddn);
        		
        		var ddnStatus = search.lookupFields({
            		type:'customtransaction_itpm_deduction',
            		id:params.ddn,
            		columns:['status']
            	})['status'][0]['value'];
            	
            	if(ddnStatus != 'statusA'){
            		throw{
            			name:'INVALID STATUS',
            			message:'Deduction status should be OPEN.'
            		}
            	}
        		
        		
        		scriptContext.form.getField({
        			id:'custrecord_itpm_split_deduction'
        		}).updateDisplayType({
        		    displayType : serverWidget.FieldDisplayType.DISABLED
        		});
        		
        		
        		//loading the deduction record
        		var ddnRec = record.load({
        			type:'customtransaction_itpm_deduction',
        			id:params.ddn
        		});
        		
        		//set the deduction values into the deduction split record fields
        		ddnSplitRec.setValue({
        			fieldId:'custrecord_itpm_split_deduction',
        			value:ddnRec.id
        		}).setValue({
        			fieldId:'custrecord_itpm_split_ddnamount',
        			value:ddnRec.getValue('custbody_itpm_amount')
        		}).setValue({
        			fieldId:'custrecord_itpm_split_ddnopenbal',
        			value:ddnRec.getValue('custbody_itpm_ddn_openbal')
        		});
        		
        	}
    	}catch(ex){
    		log.error(ex.name,ex.message);
    		if(ex.name == 'INVALID STATUS'){
    			throw new Error(ex.message);
    		}
    	}
    }
    
    

	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.newRecord.oldRecord - Old record
	 * @param {string} scriptContext.newRecord.type - Trigger type
	 * @Since 2015.2
	 */
    function beforeSubmit(scriptContext) {
    	try{
    		var ddnSplitRec = scriptContext.newRecord;
    		var lineAmount = 0,totalAmount = 0;
    		var lineCount = ddnSplitRec.getLineCount('recmachcustrecord_itpm_split');
    		log.debug('lineCount',lineCount);
    		
    		//if line count is equal to 1 than it will return the error to user
    		if(lineCount == 1){
    			throw{
    				name:'SINGLE LINE',
    				message:'Please add more than one line.'
    			}
    		}
    		
    		//loading the deduction record
    		var openBalance = record.load({
    			type:'customtransaction_itpm_deduction',
    			id:ddnSplitRec.getValue('custrecord_itpm_split_deduction')
    		}).getValue('custbody_itpm_ddn_openbal');
    		
    		//loop through the lines and check the any zero lines are entered or not and sum the line amounts
    		for(var i = 0;i < lineCount;i++){
    			lineAmount = ddnSplitRec.getSublistValue({
    				sublistId:'recmachcustrecord_itpm_split',
    				fieldId:'custrecord_split_amount',
    				line:i
    			});
    			//if line amount is zero it throws the error to the user
    			if(parseFloat(lineAmount) <= 0){
    				throw{
    					name:'ZERO AMOUNT FOUND',
    					message:'Line amount should be greater than zero.'
    				}
    			}
    			totalAmount += parseFloat(lineAmount);
    		}
    		
    		
    		//if line count > 0 and line total amount is greater than open balance throw error to the user 
    		if(lineCount > 0 && (totalAmount != parseFloat(openBalance))){
    			throw{
    				name:'INVALID TOTAL',
    				message:'Sum of line amounts should be greater than zero. less than or equal to Deduction Open balance.'
    			}
    		}
    		
    	}catch(ex){
    		log.error(ex.name,ex.message);
    		if(ex.name == 'ZERO AMOUNT FOUND'){
    			throw new Error(ex.message);
    		}else if(ex.name == 'INVALID TOTAL'){
    			throw new Error(ex.message);
    		}else if(ex.name == 'SINGLE LINE'){
    			throw new Error(ex.message);
    		}
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
    function afterSubmit(scriptContext) {
    	try{
    		//changing the split record status
    		record.submitFields({
    			type:'customtransaction_itpm_deduction',
    			id:scriptContext.newRecord.getValue('custrecord_itpm_split_deduction'),
    			values:{
    				'transtatus':'E'
    			},
    			options:{
    				enableSourcing:false,
    				ignoreMandatoryFields:true
    			}
    		});
    	}catch(ex){
    		log.error(ex.name,ex.message);
    	}
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
