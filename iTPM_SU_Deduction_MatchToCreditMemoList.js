/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget',
		'N/search',
		'N/url',
		'N/redirect'
	],

function(serverWidget, search, url, redirect) {
   
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
			
			var output = url.resolveScript({
			    scriptId: 'customscript_itpm_ded_matchtocreditmemo',
			    deploymentId: 'customdeploy_itpm_ded_matchtocreditmemo',
			    returnExternalUrl: false
			});
			
			if(request.method == 'GET' && parameters.submit == 'true')
			{
				//Need to add logic here
				
				
				redirect.toRecord({
					type : 'customtransaction_itpm_deduction',
					id : parameters.did					
				});
			}else if(request.method == 'GET' && parameters.submit == 'false') {
				var list = serverWidget.createList({
				    title : 'Credit Memo List'
				});
				
				list.addButton({id:'custom_cancelbtn',label:'Cancel',functionName:'redirectToBack'});
				list.clientScriptModulePath = './iTPM_Attach_Deduction_Buttons.js';
				
				var listcolumn=list.addColumn({
					id : 'custpage_cmid',
					type : serverWidget.FieldType.URL,
					label : 'Apply To'
				});
				
				list.addColumn({
					id : 'custpage_customer',
					type : serverWidget.FieldType.TEXT,
					label : 'Customer'
				});
				
				listcolumn.setURL({
				    url : output
				});
				
				listcolumn.addParamToURL({
				    param : 'submit',
				    value : 'true'
				});
				listcolumn.addParamToURL({
				    param : 'did',
				    value : parameters.did
				});
				var creditMemoSearchObj = search.create({
		    		type : search.Type.CREDIT_MEMO,	 
		    		filters : [
		    			["mainline","is","T"],
		    			"AND",
		    			["entity", "is", parameters.customer]
		    		],
		            columns : [
		            	search.createColumn({
		            		name: "internalid",
		            		sort: search.Sort.ASC
		            	}),
		            	search.createColumn({
		            		name: "entity"
		            	})
		            ]
		    	});
				
				//
				var a = [];
				var searchLength = creditMemoSearchObj.run().getRange(0,2).length;
				
				if(searchLength > 1){

					listcolumn.addParamToURL({
					    param : 'cm',
					    value : 'custpage_cmid',
					    dynamic:true
					});
					
					creditMemoSearchObj.run().each(function(result){
						a.push({ 
						     'custpage_cmid': result.getValue('internalid'),
						     'custpage_customer' : result.getText('entity')
						});
						
						return true;
					});
					
					list.addRows({
						rows : a
					});
				}
				else if(searchLength > 0){
					var result = creditMemoSearchObj.run().getRange(0,1)[0];
					listcolumn.addParamToURL({
					    param : 'cm',
					    value : result.getValue('internalid')
					});
					list.addRow({
						row:{ 
							'custpage_cmid': result.getValue('internalid'),
						    'custpage_customer' : result.getText('entity')
						 }
					});
				}
				
				response.writePage(list);
			}
			
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    return {
        onRequest: onRequest
    };
    
});
