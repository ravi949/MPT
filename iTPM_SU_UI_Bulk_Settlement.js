/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define([
        'N/ui/serverWidget',
        'N/search',
        'N/redirect',
        'N/record',
        './iTPM_Module.js'
        ],

function(ui, search, redirect, record, itpm) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	try{
    		var request = context.request;
    		var response = context.response;
    		var params = request.parameters;
    		
    		if(request.method == 'GET'){
    			bulkSettlementUIForm(request, response, params);
    		}else{
    			resolvedeductions(request, response);
    		}
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    /**
     * @param {Object} request
     * @param {Object} response
     */
    function bulkSettlementUIForm(request, response, params){
    	/*var promoallowanceSearchObj = promAllowanceSearch(params.pid);
    	var mops = [];
    	promoallowanceSearchObj.run().each(function(result){
    		mops.push(result.getValue('custrecord_itpm_all_mop'));
    		return true;
    	});
    	log.debug('MOP on the Allowance Items', mops);*/
    	
    	//Searching Reolution Queue Record for already inserted Deductions
    	var queueSearchObj = queueSearch(params.pid);
    	var deductions = [];
    	
    	queueSearchObj.run().each(function(result){
    		deductions.push(result.getValue('custrecord_itpm_rq_deduction'));
    		return true;
    	});
    	log.debug('deductions already in Queue', deductions);
    	
    	var form = ui.createForm({
			title: 'Resolve Deductions'
		});
		
    	form.addFieldGroup({
			id:'custpage_fieldgroup_message',
			label:' '
		}).isBorderHidden = true;
    	
    	form.addField({
		    id : 'custpage_itpm_message',
		    type : ui.FieldType.INLINEHTML,
		    label : ' ',
		    container:'custpage_fieldgroup_message'
		}).defaultValue ="<html><font size='2'>Use this tool to request settlements for more than one deduction. Please note-</font> <br>"
            +"<font size='1'>&nbsp&nbsp* The deductions selected below will be <b>QUEUED</b> for resolution. For IMMEDIATE resolution of deductions, do not use this tool. Resolve them individually.<br>"
            +"&nbsp&nbsp* The entire deduction open balance will be resolved by the settlement.<br>"
            +"&nbsp&nbsp* The entire settlement amount will be entered against the MOP selected below, for ALL settlements created in this process.<br>"
    		+"&nbsp&nbsp* If the deduction open balance changes between now and the time of settlement creation, the settlement will not be created.</font></html>";
    	
    	form.addFieldGroup({
			id:'custpage_fieldgroup_details',
			label:' '
		}).isBorderHidden = true;
    	
		form.addField({
    	    id : 'custpage_itpm_promo_id',
    	    type : ui.FieldType.SELECT,
    	    label : 'Promotion',
    	    source : 'customrecord_itpm_promotiondeal',
		    container:'custpage_fieldgroup_details'
    	}).updateDisplayType({
			displayType : ui.FieldDisplayType.INLINE
		}).defaultValue = params.pid;
		
		form.addField({
    	    id : 'custpage_itpm_customer_id',
    	    type : ui.FieldType.SELECT,
    	    label : 'Customer',
    	    source : 'customer',
		    container:'custpage_fieldgroup_details'
    	}).updateDisplayType({
			displayType : ui.FieldDisplayType.INLINE
		}).defaultValue = params.pcustomer;
		
		var mopField = form.addField({
			id : 'custpage_itpm_mop',
			type : ui.FieldType.SELECT,
			label : 'MOP',
			//source : 'customlist_itpm_lsbboi',
		    container:'custpage_fieldgroup_details'
		});
		mopField.isMandatory = true;

		mopField.addSelectOption({
			value : '',
			text : ''
		});
		mopField.addSelectOption({
			value : '1',
			text : 'Lump Sum'
		});
		//if(mops.indexOf("1") > -1){
			mopField.addSelectOption({
				value : '2',
				text : 'Bill-Back'
			});
		//}
		//if(mops.indexOf("3") > -1){
			mopField.addSelectOption({
				value : '3',
				text : 'Off-Invoice'
			});
		//}
		
		var deductionList = form.addSublist({
    	    id : 'custpage_deduction_list',
    	    type : ui.SublistType.LIST,
    	    label: 'Deductions'
    	});
		//deductionList.addMarkAllButtons(); //future requirements
		deductionList.addField({
    	    id : 'custpage_resolve_checkbox',
    	    type : ui.FieldType.CHECKBOX,
    	    label : 'Resolve'
    	});
		deductionList.addField({
    	    id : 'custpage_ddn_internalid',
    	    type : ui.FieldType.TEXT,
    	    label : ' '
    	}).updateDisplayType({
    		displayType : ui.FieldDisplayType.HIDDEN
    	});
		deductionList.addField({
    	    id : 'custpage_ddn_number',
    	    type : ui.FieldType.TEXT,
    	    label : 'Deduction NUmber'
    	});
		deductionList.addField({
    	    id : 'custpage_date_created',
    	    type : ui.FieldType.DATE,
    	    label : 'Date Created'
    	});
		deductionList.addField({
    	    id : 'custpage_ddn_customer',
    	    type : ui.FieldType.TEXT,
    	    label : 'Customer'
    	});
		deductionList.addField({
    	    id : 'custpage_original_amount',
    	    type : ui.FieldType.CURRENCY,
    	    label : 'Original Amount'
    	});
		deductionList.addField({
    	    id : 'custpage_parent_ddn',
    	    type : ui.FieldType.TEXT,
    	    label : 'Parent Deduction'
    	});
		deductionList.addField({
    	    id : 'custpage_original_ddn',
    	    type : ui.FieldType.TEXT,
    	    label : 'Original Deduction'
    	});
		deductionList.addField({
    	    id : 'custpage_ddn_open_balance',
    	    type : ui.FieldType.CURRENCY,
    	    label : 'Open balance'
    	});
		
		form.addSubmitButton({
			label: 'Submit'
		});
		
		form.addButton({
    		id : 'custom_itpm_cacel',
    	    label : 'Cancel',
    	    functionName:"redirectToBack"
    	});
    	//Attaching client script for redirect to back
    	form.clientScriptModulePath =  './iTPM_Attach_Deduction_Buttons.js';
		
		//Fetching all sub-customers of customer on the Promotion
		var subcustomers = itpm.getSubCustomers(params.pcustomer);
		log.debug('subcustomers',subcustomers);
		
		//Adding Deduction data to the deduction list
		var tranFilters = [['mainline','is','T'],'AND',['custbody_itpm_customer','anyof', subcustomers]];
		if(deductions.length != 0){
			tranFilters.push("AND",['internalid','noneof', deductions]);
		}
		
		var deductionSearch = search.create({
			type:'customtransaction_itpm_deduction',
			columns:[
			         'internalid',
			         'statusRef',
			         'tranid',
			         'trandate',
			         'custbody_itpm_customer',
			         'custbody_itpm_amount',
			         'custbody_itpm_ddn_parentddn',
			         'custbody_itpm_ddn_originalddn',
			         'custbody_itpm_ddn_openbal'
			         ],
			filters: tranFilters		    		
		});
		
		var i=0;
		deductionSearch.run().each(function(result){
			if(result.getValue('statusRef') == 'statusA'){
				deductionList.setSublistValue({
	    			id : 'custpage_ddn_internalid',
	        	    line : i,
	        	    value : result.getValue('internalid')
	        	});
				deductionList.setSublistValue({
	    			id : 'custpage_ddn_number',
	        	    line : i,
	        	    value : result.getValue('tranid')
	        	});
				deductionList.setSublistValue({
	    			id : 'custpage_date_created',
	        	    line : i,
	        	    value : result.getValue('trandate')
	        	});
				deductionList.setSublistValue({
	    			id : 'custpage_ddn_customer',
	        	    line : i,
	        	    value : result.getText('custbody_itpm_customer')
	        	});
				deductionList.setSublistValue({
	    			id : 'custpage_original_amount',
	        	    line : i,
	        	    value : result.getValue('custbody_itpm_amount')
	        	});
				deductionList.setSublistValue({
	    			id : 'custpage_parent_ddn',
	        	    line : i,
	        	    value : result.getText('custbody_itpm_ddn_parentddn')
	        	});
				deductionList.setSublistValue({
	    			id : 'custpage_original_ddn',
	        	    line : i,
	        	    value : result.getText('custbody_itpm_ddn_originalddn')
	        	});
				deductionList.setSublistValue({
	    			id : 'custpage_ddn_open_balance',
	        	    line : i,
	        	    value : result.getValue('custbody_itpm_ddn_openbal')
	        	});
				
				i++;
			}
			return true;
		})
		
		response.writePage(form);
    }
    
    /**
     * @param {Object} request
     * @param {Object} response
     */
    function resolvedeductions(request, response){
    	var promoid = request.parameters.custpage_itpm_promo_id;
    	log.debug('promoid',promoid);
    	var mop = request.parameters.custpage_itpm_mop;
    	log.debug('mop',mop);
    	var lines = request.getLineCount({
		    group: 'custpage_deduction_list'
		});
    	log.debug('lines',lines);
		for(var iTemp =0; iTemp<lines; iTemp++){
			var resolve = request.getSublistValue({
			    group: 'custpage_deduction_list',
			    name: 'custpage_resolve_checkbox',
			    line: iTemp
			});
			
			if(resolve == 'T'){
				var ddn_internalid = request.getSublistValue({
				    group: 'custpage_deduction_list',
				    name: 'custpage_ddn_internalid',
				    line: iTemp
				});
				var openBal = request.getSublistValue({
				    group: 'custpage_deduction_list',
				    name: 'custpage_ddn_open_balance',
				    line: iTemp
				});
				log.debug('ddn_internalid',ddn_internalid);
				log.debug('openBal',openBal);
				
				var queue_recObj = record.create({
					type	: 'customrecord_itpm_resolutionqueue',
					isDynamic: true
				});
				
				queue_recObj.setValue({
					fieldId : 'custrecord_itpm_rq_promotion',
					value 	: promoid
				}).setValue({
					fieldId : 'custrecord_itpm_rq_deduction',
					value 	: ddn_internalid
				}).setValue({
					fieldId : 'custrecord_itpm_rq_mop',
					value 	: mop
				}).setValue({
					fieldId : 'custrecord_itpm_rq_amount',
					value 	: openBal
				})
				
				var recid = queue_recObj.save({
				    enableSourcing: true,
				    ignoreMandatoryFields: true
				});
				log.debug('Resolution Queue ID', recid);
			}
		}
		
		redirect.toRecord({
		    type : 'customrecord_itpm_promotiondeal', 
		    id : promoid
		});
    }
    
    /**
     * @param {String} promID
     */
    function promAllowanceSearch(promID){
    	try{
    		return search.create({
    			type: "customrecord_itpm_promoallowance",
    			filters: [
    			          ["custrecord_itpm_all_promotiondeal","anyof",promID], 
    			          "AND", 
    			          ["isinactive","is","F"]
    			          ],
    			columns: [
    			          "custrecord_itpm_all_mop"
    			          ]
    		});
    	}catch(e){
    		log.error(e.name, 'promAllowanceSearch'+e.message);
    	}
    }
    
    /**
     * @param {String} promID
     */
    function queueSearch(promID){
    	try{
    		return search.create({
    			type: "customrecord_itpm_resolutionqueue",
    			filters: [
    			          ["custrecord_itpm_rq_promotion","anyof",promID],
    			          "AND",
    			          ["custrecord_itpm_rq_processingnotes","isempty",''],
    			          "AND",
    			          ["custrecord_itpm_rq_settlement","anyof",'@NONE@']
    			          ],
    			columns: [
    			          "custrecord_itpm_rq_deduction"
    			          ]
    		});
    	}catch(e){
    		log.error(e.name, 'queueSearch'+e.message);
    	}
    }
    
    return {
        onRequest: onRequest
    };
    
});
