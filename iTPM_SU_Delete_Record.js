	/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/record',
		'N/search'
        ],

function(record, search) {
   
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
    		if(context.request.method == 'GET'){
            	var params = context.request.parameters;
            	var responseObj;
            	log.debug('params', params);
            	
            	//Loading the record
            	var recObj = record.load({
            		type:params.recordid,
            		id:params.id
            	});
            	
            	//If record type is Deduction.
            	if(params.rectype == 'ddn'){
            		var creditMemos = recObj.getValue('custbody_itpm_ddn_invoice');
            		var createFrom = search.lookupFields({
            			type:search.Type.TRANSACTION,
            			id:creditMemos[0],
            			columns:['type']
            		})['type'][0]['value'];
            		log.debug('createFrom', createFrom);
            		if(createFrom == 'CustCred'){
            			var creditmemoRecObj = record.load({
            				type:'creditmemo',
            				id: creditMemos[0]
            			});

            			//This condition only triggers for credit memo's which has iTPM Applied To value
            			if(creditmemoRecObj.getValue('custbody_itpm_appliedto')){
            				var accountingPrd = creditmemoRecObj.getValue('postingperiod');
            				var accountingperiodSearchObj = search.create({
            					type: "accountingperiod",
            					filters:
            						[
            						 ["alllocked","is","T"], 
            						 "AND", 
            						 ["internalid","anyof",accountingPrd],
            						 "AND",
            						 ["allownonglchanges","is","F"]
            						 ],
            						 columns:['internalid']
            				});
            				var isAcntngprdClosed = accountingperiodSearchObj.runPaged().count;            			
            				if(isAcntngprdClosed == 0){
            					creditMemos.forEach(function(cid){
            						record.submitFields({
            							type:record.Type.CREDIT_MEMO,
            							id:cid,
            							values:{
            								'custbody_itpm_appliedto':' '
            							},
            							options:{
            								enableSourcing:false,
            								ignoreMandatoryFields:true
            							}
            						});
            					});
            				}else{
            					context.response.write(JSON.stringify({success:false,message:'Deduction cant be deleted because Related Creditmemo posting period is closed or locked. Please Contact administrator to enable allow non G/L S for creditmemo posting period'}));
            					return;
            				}
            			}
            		}

            		var ddnRecord = record.delete({
            			type: params.recordid,
            			id: params.id,
            			isDynamic: true                       
            		});

            		var ddnListId = search.load({
            			id:'customsearch_itpm_deduction_defaultview'
            		}).searchId;

            		responseObj = JSON.stringify({success:true,searchid:ddnListId});
            	}
            	context.response.write(responseObj);
    		}
    	}catch(ex){
    		log.error(ex.name,ex.message);
    		context.response.write(JSON.stringify({success:false,message:ex.message.split('Summary of impact changes')[0]}));
    	}	    	
    }

    return {
        onRequest: onRequest
    };
    
});
