/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget', 
        'N/search', 
        'N/url', 
        'N/record',
        './iTPM_Module.js'
        ],

function(ui, search, url, record, itpm) {
   
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
    			//Fetching all info from the Invoice record
    			var invoiceFieldsLookUp = search.lookupFields({
    			    type: search.Type.INVOICE,
    			    id: params.fid,
    			    columns: ['entity', 'trandate', 'amount', 'amountremaining','postingperiod']
    			});
    			
    			var postingPeriod = invoiceFieldsLookUp['postingperiod'][0].value;
    			
    			log.debug('invoiceFieldsLookUp', invoiceFieldsLookUp);
    			log.debug('entity', invoiceFieldsLookUp.entity[0].value);
    			log.debug('trandate', invoiceFieldsLookUp.trandate);
    			log.debug('amount', invoiceFieldsLookUp.amount);
    			log.debug('amountremaining', invoiceFieldsLookUp.amountremaining);
    			
    			var form = ui.createForm({
    				title : '- iTPM Deduction'
    			});
    			
    			form.addFieldGroup({
					id:'custpage_fieldgroup_message',
					label:' '
				}).isBorderHidden = true;
    			
    			form.addField({
    			    id : 'custpage_message',
    			    type : ui.FieldType.INLINEHTML,
    			    label : ' ',
    			    container:'custpage_fieldgroup_message'
    			}).defaultValue ="<html><h1><font size='2'>The payment applied to this Invoice was also applied to other Invoices. "
                    +"The list below shows the other Invoices to which the payment was applied, but were not paid in full. "
                    +"Would you like to apply the iTPM Deduction to all related open Invoices?</font></h1></html>";
    			
    			form.addFieldGroup({
					id:'custpage_fieldgroup_curinv',
					label:'Current Invoice'
				});
    			
    			form.addField({
					id : 'custpage_invoiceno',
					type : ui.FieldType.SELECT,
					label:'Invoice Number',
					source : 'invoice',
					container:'custpage_fieldgroup_curinv'
				}).updateDisplayType({
					displayType : ui.FieldDisplayType.INLINE
				}).defaultValue =params.fid;
    			
    			form.addField({
					id : 'custpage_customer',
					type : ui.FieldType.SELECT,
					label:'Customer',
					source : 'customer',
					container:'custpage_fieldgroup_curinv'
				}).updateDisplayType({
					displayType : ui.FieldDisplayType.INLINE
				}).defaultValue =invoiceFieldsLookUp.entity[0].value;
    			
    			form.addField({
					id : 'custpage_date',
					type : ui.FieldType.DATE,
					label:'Date',
					container:'custpage_fieldgroup_curinv'
				}).updateDisplayType({
					displayType : ui.FieldDisplayType.INLINE
				}).defaultValue =invoiceFieldsLookUp.trandate;
    			
    			form.addField({
					id : 'custpage_amountrem',
					type : ui.FieldType.CURRENCY,
					label:'Amount Remaining',
					container:'custpage_fieldgroup_curinv'
				}).updateDisplayType({
					displayType : ui.FieldDisplayType.INLINE
				}).defaultValue =invoiceFieldsLookUp.amountremaining;
    			
    			form.addField({
					id : 'custpage_amount',
					type : ui.FieldType.CURRENCY,
					label:'Total Amount',
					container:'custpage_fieldgroup_curinv'
				}).updateDisplayType({
					displayType : ui.FieldDisplayType.INLINE
				}).defaultValue =invoiceFieldsLookUp.amount;
    			
    			form.addField({
					id : 'custpage_dedamountsingleinv',
					type : ui.FieldType.CURRENCY,
					label:'Deduction Amount if Applied to THIS Invoice',
					container:'custpage_fieldgroup_curinv'
				}).updateDisplayType({
					displayType : ui.FieldDisplayType.INLINE
				}).defaultValue =invoiceFieldsLookUp.amountremaining;
    			
    			var totalMultiInvDedAmount = form.addField({
					id : 'custpage_dedamountmultiinv',
					type : ui.FieldType.CURRENCY,
					label:'Deduction Amount if Applied To All Invoices',
					container:'custpage_fieldgroup_curinv'
				}).updateDisplayType({
					displayType : ui.FieldDisplayType.INLINE
				});
    			
    			var invlist = form.addSublist({
            	    id : 'custpage_invoicelist',
            	    type : ui.SublistType.LIST,
            	    label : 'Other Related Invoices'
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
    			var results = itpm.getMultiInvoiceList(params.fid);    			
    			var i = 0;
    						
//    			var domain = url.resolveDomain({
//				    hostType: url.HostType.APPLICATION
//				});
				
    			results.forEach(function(result){
    				totalamount = totalamount + parseFloat(result.inv_remaining_amount);
    				if(result.inv_id != params.fid){
    					invlist.setSublistValue({
                			id : 'custpage_date',
                    	    line : i,
                    	    value : result.inv_date
                    	});
        				
//        				var recURL = url.resolveRecord({
//        				    recordType: 'invoice',
//        				    recordId: result.getValue({name: "internalid", join: "appliedToTransaction"})
//        				});
//        				
//        				invlist.setSublistValue({
//                			id : 'custpage_url',
//                    	    line : i,
//                    	    value : 'https://'+domain+''+recURL
//                    	});
//        				
        				invlist.setSublistValue({
                			id : 'custpage_invnum',
                    	    line : i,
                    	    value : result.inv_id
                    	});
        				
        				invlist.setSublistValue({
                			id : 'custpage_amounttotal',
                    	    line : i,
                    	    value : result.inv_total
                    	});
        				
        				invlist.setSublistValue({
                			id : 'custpage_amountremaining',
                    	    line : i,
                    	    value : result.inv_remaining_amount
                    	});
        				
        				i++;
    				}
    			});
    			
    			totalMultiInvDedAmount.defaultValue = totalamount;
    			
    			form.clientScriptModulePath = './iTPM_Attach_Invoice_ClientMethods.js';
    			
    			form.addButton({
    			    id : 'custpage_button_yes',
    			    label : 'Yes',
    			    functionName : 'iTPMDeduction("'+postingPeriod+'",'+params.fid+', "yes")'
    			});
    			
    			form.addButton({
    			    id : 'custpage_button_no',
    			    label : 'No',
    			    functionName : 'iTPMDeduction("'+postingPeriod+'",'+params.fid+', "no")'
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
    
    return {
        onRequest: onRequest
    };
    
});
