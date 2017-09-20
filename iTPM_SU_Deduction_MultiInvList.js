/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget', 'N/search', 'N/url', 'N/record'],

function(ui, search, url, record) {
   
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
    		var totalamount = 0;
    		
    		if (context.request.method === 'GET'){
    			var form = ui.createForm({
    				title : '- iTPM Deduction'
    			});
    			
    			var messageField = form.addField({
    			    id : 'custpage_message',
    			    type : ui.FieldType.INLINEHTML,
    			    label : ' '
    			});
    			
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
    			
//    			invlist.addField({
//            	    id : 'custpage_url',
//            	    type : ui.FieldType.URL,
//            	    label : 'Type'
//            	}).linkText = 'Invoice';
            	
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
    				
//    				var recURL = url.resolveRecord({
//    				    recordType: 'invoice',
//    				    recordId: result.getValue({name: "internalid", join: "appliedToTransaction"})
//    				});
//    				
//    				invlist.setSublistValue({
//            			id : 'custpage_url',
//                	    line : i,
//                	    value : 'https://'+domain+''+recURL
//                	});
//    				
    				invlist.setSublistValue({
            			id : 'custpage_invnum',
                	    line : i,
                	    value : result.getValue({name: "internalid", join: "appliedToTransaction"})
                	});
    				
    				invlist.setSublistValue({
            			id : 'custpage_amounttotal',
                	    line : i,
                	    value : result.getValue({name: "amount", join: "appliedToTransaction"})
                	});
    				
    				invlist.setSublistValue({
            			id : 'custpage_amountremaining',
                	    line : i,
                	    value : result.getValue({name: "amountremaining", join: "appliedToTransaction"})
                	});
    				
    				totalamount = totalamount + parseFloat(result.getValue({name: "amountremaining", join: "appliedToTransaction"}));
    				
    				i++;
    				return true;
    			});
    			
    			messageField.defaultValue = "<html><h1><font size='2'>There are other short-pays associated with the payment on this invoice. Do you want to create only ONE deduction for $"+totalamount.toFixed(2)+"?</font></h1></html>";
    			
    			form.addSubmitButton({
					label : 'Yes'
				});
    			
    			form.clientScriptModulePath = './iTPM_Attach_Invoice_ClientMethods.js';
    			
    			form.addButton({
    			    id : 'custpage_button_no',
    			    label : 'No',
    			    functionName : 'iTPMDeduction('+params.fid+')'
    			});
    			
    			form.addButton({
    			    id : 'custpage_button_cancel',
    			    label : 'Cancel',
    			    functionName : 'iTPMDeductionRedirectToHome()'
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
        				}),
        				search.createColumn({
        					name: "amount",
        					join: "appliedToTransaction"
        				}),
        				search.createColumn({
        					name: "amountremaining",
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
