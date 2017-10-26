/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/record',
		'N/redirect',
		'N/search',
		'./iTPM_Module_Settlement.js',
		'./iTPM_Module.js'
		],
/**
 * @param {record} record
 * @param {redirect} redirect
 * @param {search} search
 */
function(record, redirect, search, ST_Module,itpm) {
   
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
    		var parameters = request.parameters;
    		
			
    		//loading the settlement record
    		var settlementRec = record.load({
    		     type: 'customtransaction_itpm_settlement',
    		     id: parameters.sid
    		 });
    		
    		if(settlementRec.getValue('transtatus') != 'A'){
    			throw {
					name:'SETTLEMENT_INVALID_STATUS',
					message:'This settlement cannot be applied to the check.'
				};
    		}
    		
    		var subsidiaryExists = itpm.subsidiariesEnabled();
			var currencyExists = itpm.currenciesEnabled();
			var locationsExists = itpm.locationsEnabled();
			var departmentsExists = itpm.departmentsEnabled();
			var classesExists = itpm.classesEnabled();
    		
    		//search the promotion record based on settlement record for the account field and promotion type account field value
    		var promotionRecSer = search.create({
    			type: 'customrecord_itpm_promotiondeal',
    			columns: ['internalid'
    			          ,'custrecord_itpm_p_account'
    			          ,'custrecord_itpm_p_type'
    			          ,'custrecord_itpm_p_type.custrecord_itpm_pt_defaultaccount'
    			          ],
    			          filters: [['internalid','anyof',settlementRec.getValue('custbody_itpm_set_promo')]]
    		}).run().getRange(0,1);
    		log.debug('currne',promotionRecSer[0].getValue('custrecord_itpm_p_currency'));

    		var JERecId = ST_Module.createReverseJE(settlementRec);
    		log.debug('JERecId',JERecId)
    		if(JERecId){
    			//creating the check record
        		var checkRecord = record.create({
        			type: record.Type.CHECK 
        		});
        		//setting the body fields of the check record
        		checkRecord.setValue({
        			fieldId: 'entity',
        			value:  settlementRec.getValue('custbody_itpm_customer'),
        			ignoreFieldChange: true
        		});
        		checkRecord.setValue({
        			fieldId: 'usertotal',
        			value:  settlementRec.getValue('custbody_itpm_amount'),
        			ignoreFieldChange: true
        		});
        		
        		if(subsidiaryExists){
        			checkRecord.setValue({
            			fieldId: 'subsidiary',
            			value:  settlementRec.getValue('subsidiary'),
            			ignoreFieldChange: true
            		});
        		}
        		
        		if(currencyExists){
        			checkRecord.setValue({
            			fieldId: 'currency',
            			value:  settlementRec.getValue('currency'),
            			ignoreFieldChange: true
            		});
        		}
        		
        		checkRecord.setValue({
        			fieldId: 'memo',
        			value:  ' From Settlement #'+ settlementRec.getValue('tranid'),
        			ignoreFieldChange: true
        		});
        		checkRecord.setValue({
        			fieldId: 'custbody_itpm_settlementrec',
        			value:  settlementRec.getValue('id'),
        			ignoreFieldChange: true
        		});
        		checkRecord.setValue({
        			fieldId: 'custbody_itpm_promotion',
        			value:  settlementRec.getValue('custbody_itpm_set_promo'),
        			ignoreFieldChange: true
        		});
        		checkRecord.setValue({
        			fieldId: 'tobeprinted',
        			value:  true,
        			ignoreFieldChange: true
        		});
        		
        		//adding line items in the check record    		
        		var expenseLineCount = 0;//increasing line count after adding record
      
        		//adding lump sum,bb and off-invoice expense line in check record
        		//if Promotion record don't have any account in lump sum then adding the Promotion Type default account to this field
        		var checkLines = [{
        			'account':(promotionRecSer[0].getValue('custrecord_itpm_p_account'))?promotionRecSer[0].getValue('custrecord_itpm_p_account'):promotionRecSer[0].getValue({name:'custrecord_itpm_pt_defaultaccount',join:'custrecord_itpm_p_type'}),
        			'amount':(settlementRec.getValue('custbody_itpm_set_reqls') > 0)?settlementRec.getValue('custbody_itpm_set_reqls'):0,
        			'memo':'Lump Sum Settlement #'+ settlementRec.getValue('tranid'),
        			'mop':1
        		},{
        			'account':promotionRecSer[0].getValue({name:'custrecord_itpm_pt_defaultaccount',join:'custrecord_itpm_p_type'}),
        			'amount':(settlementRec.getValue('custbody_itpm_set_reqbb') > 0)?settlementRec.getValue('custbody_itpm_set_reqbb'):0,
        			'memo':'Bill Back Settlement #'+ settlementRec.getValue('tranid'),
        			'mop':2
        		},{
        			'account':promotionRecSer[0].getValue({name:'custrecord_itpm_pt_defaultaccount',join:'custrecord_itpm_p_type'}),
        			'amount':(settlementRec.getValue('custbody_itpm_set_reqoi') > 0)?settlementRec.getValue('custbody_itpm_set_reqoi'):0,
        			'memo':'Missed Off Invoice Settlement #'+ settlementRec.getValue('tranid'),
        			'mop':3
        		}];
        		
        		//setting the location,class and department values to the lines
        		var expenseLineCount = checkLines.length;
        		for(var v = 0; v < expenseLineCount; v++){
        			
        			checkRecord.setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'account',
        				line: v,
        				value: checkLines[v].account
        			}).setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'amount',
        				line: v,
        				value: checkLines[v].amount
        			}).setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'memo',
        				line: v,
        				value: checkLines[v].memo
        			}).setSublistValue({
        				sublistId: 'expense',
        				fieldId: 'custcol_itpm_lsbboi', 
        				line: v,
        				value: checkLines[v].mop
        			}).setSublistValue({
        				sublistId: 'expense',
            			fieldId: 'customer',
            			line: v,
            			value: settlementRec.getValue('custbody_itpm_customer')
            		}).setSublistValue({
            			sublistId: 'expense',
            			fieldId: 'isbillable',
            			line: v,
            			value: false
            		});
        			
        			
        			if(departmentsExists){
        				checkRecord.setSublistValue({
                			sublistId: 'expense',
                			fieldId: 'department',
                			line: v,
                			value: settlementRec.getValue('department')
                		});
        			}
        			
            		if(classesExists){
            			checkRecord.setSublistValue({
                			sublistId: 'expense',
                			fieldId: 'class',
                			line: v,
                			value: settlementRec.getValue('class')
                		});
            		}
            		
            		if(locationsExists){
            			checkRecord.setSublistValue({
                			sublistId: 'expense',
                			fieldId: 'location',
                			line: v,
                			value: settlementRec.getValue('location')
                		});
            		}
        		}
        		//saving the check record
        		var checkRecordId = checkRecord.save({
        			enableSourcing: true,
        			ignoreMandatoryFields: true
        		});
        		//place the check details in the settlement record
        		settlementRec.setValue({
        		    fieldId: 'transtatus',
        		    value: 'B',
        		    ignoreFieldChange: true
        		});
        		settlementRec.setValue({
        		    fieldId: 'custbody_itpm_appliedto',
        		    value: checkRecordId,
        		    ignoreFieldChange: true
        		});
        		settlementRec.save({
        		    enableSourcing: true,
        		    ignoreMandatoryFields: true
        		});
        		//after saving the records show the check record.
        		redirect.toRecord({
        			type : record.Type.CHECK, 
        			id : checkRecordId 
        		});
    		}
    		
    	}catch(e){
    		log.error(e.name,'record type = iTPM Settlement, record id='+request.parameters.sid+', message='+e.message);
    		if(e.name == 'SETTLEMENT_INVALID_STATUS'){
    			throw Error(e.message);
    		}
    	}
    }

    return {
        onRequest: onRequest
    };
    
});
