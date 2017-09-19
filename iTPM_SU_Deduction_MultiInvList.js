/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget', 'N/search', 'N/url'],

function(ui, search, url) {
   
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
    		
    		if (context.request.method === 'GET'){
    			var form = ui.createForm({
    				title : '- iTPM Deduction'
    			});
    			
    			var messageField = form.addField({
    			    id : 'custpage_message',
    			    type : ui.FieldType.INLINEHTML,
    			    label : ' '
    			});
    			
    			messageField.defaultValue = "<html><h1>There are other short-pays associated with the payment on this invoice. Do you want to create only ONE deduction for $x,xxx.xx?</h1></html>";
    			
    			var invlist = form.addSublist({
            	    id : 'custpage_invoicelist',
            	    type : ui.SublistType.LIST,
            	    label : 'Invoice List'
            	});
    			
    			invlist.addField({
            	    id : 'custpage_date',
            	    type : ui.FieldType.DATE,
            	    label : 'Date'
            	});
    			
    			invlist.addField({
            	    id : 'custpage_url',
            	    type : ui.FieldType.URL,
            	    label : 'Link'
            	}).linkText = 'Invoice';
            	
    			invlist.addField({
            	    id : 'custpage_invnum',
            	    type : ui.FieldType.SELECT,
            	    label : 'Title',
            	    source:'invoice'
            	}).updateDisplayType({
					displayType : ui.FieldDisplayType.INLINE
				});
    			
    			invlist.addField({
            	    id : 'custpage_amounttotal',
            	    type : ui.FieldType.CURRENCY,
            	    label : 'Amount(Total)'
            	});
    			
    			invlist.addField({
            	    id : 'custpage_amountremaining',
            	    type : ui.FieldType.CURRENCY,
            	    label : 'Amount Remaining'
            	});
    			
    			//Adding values to the sublist
    			var results = multiInvoicesList(params.fid);
    			var i = 0;
    			
    			var domain = url.resolveDomain({
				    hostType: url.HostType.APPLICATION
				});
				
    			results.each(function(result){
    				invlist.setSublistValue({
            			id : 'custpage_date',
                	    line : i,
                	    value : result.getValue({name: "trandate", join: "appliedToTransaction"})
                	});
    				
    				var recURL = url.resolveRecord({
    				    recordType: 'invoice',
    				    recordId: result.getValue({name: "internalid", join: "appliedToTransaction"})
    				});
    				
    				invlist.setSublistValue({
            			id : 'custpage_url',
                	    line : i,
                	    value : 'https://'+domain+''+recURL
                	});
    				
    				invlist.setSublistValue({
            			id : 'custpage_invnum',
                	    line : i,
                	    value : result.getValue({name: "internalid", join: "appliedToTransaction"})
                	});
    				
    				i++;
    				return true;
    			});
    			
    			form.addSubmitButton({
					label : 'Yes'
				});
    			
    			form.addButton({
    			    id : 'custpage_button_no',
    			    label : 'No'
    			    //functionName : ''
    			});
    			
    			form.addButton({
    			    id : 'custpage_button_no',
    			    label : 'Cancel'
    			    //functionName : ''
    			});
    			
    			context.response.writePage(form);
    		}
    	}catch(ex){
    		log.error(ex.name, ex.message);
    	}
    }
    
    /**
     * @param {String} invId
     * 
     * @return {Integer} count
     */
    function multiInvoicesList(invId){
    	try{
    		var custPayId;
        	log.debug('invId', invId);
        	var invoiceSearchObj = search.create({
        		type: search.Type.INVOICE,
        		filters: [
        			["internalid","anyof",invId], 
        			"AND", 
        			["applyingtransaction","noneof","@NONE@"], 
        			"AND", 
        			["applyingtransaction.type","anyof","CustPymt"], 
        			"AND", 
        			["mainline","is","T"], 
        			"AND", 
        			["status","noneof","CustInvc:B"]
        			],
        			columns: [
        				search.createColumn({
        					name: "type",
        					join: "applyingTransaction"
        				}),
        				search.createColumn({
        					name: "trandate",
        					join: "applyingTransaction",
        					sort: search.Sort.DESC
        				}),
        				search.createColumn({
        					name: "internalid",
        					join: "applyingTransaction",
        					sort: search.Sort.DESC
        				})
        				]
        	});

        	invoiceSearchObj.run().each(function(result){
        		custPayId = result.getValue({name:'internalid', join:'applyingTransaction'});
        	});
        	log.debug('custPayId', custPayId);
        	var customerpaymentSearchObj = search.create({
        		type: "customerpayment",
        		filters: [
        			["type","anyof","CustPymt"], 
        			"AND", 
        			["internalid","anyof",custPayId], 
        			"AND", 
        			["mainline","is","F"],
        			"AND", 
        			["appliedtotransaction.status","anyof","CustInvc:A"]
        			],
        			columns: [
        				search.createColumn({
        					name: "internalid",
        					sort: search.Sort.ASC
        				}),
        				search.createColumn({
        					name: "type",
        					join: "appliedToTransaction"
        				}),
        				search.createColumn({
        					name: "trandate",
        					join: "appliedToTransaction"
        				}),
        				search.createColumn({
        					name: "internalid",
        					join: "appliedToTransaction"
        				})
        			]
        	});

        	return customerpaymentSearchObj.run();
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }
    
    return {
        onRequest: onRequest
    };
    
});
