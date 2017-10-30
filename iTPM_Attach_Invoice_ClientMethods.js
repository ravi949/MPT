/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 * Client script to be attached with UserEvent script to iTPM Invoice records.
 * This will call the respective suitelet scripts upon button click.
 */
define(['N/url',
		'N/ui/message',
		'N/search'
		],
/**
 * @param {url} url
 */
function(url,message,search) {
	
	function displayMessage(title,text){
		try{
			var msg = message.create({
				type: message.Type.INFORMATION,
				title: title,
				message: text
			});
			return msg;
		} catch(ex) {
			console.log(ex);
		}
	}
	
	function multiInvoices(invId){
    	try{
    		var custPayId;
    		//console.log(invId);
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
        	//console.log(custPayId);
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

        	return customerpaymentSearchObj.runPaged().count;
    	}catch(e){
    		console.log(e);
    	}
    }
	
	function iTPMDeduction(invId, multiInv){
		try{
			//Checking for multiple Invoice
			var invCount =(!multiInv)?multiInvoices(invId):0;
			
			if(invCount >= 2){
				var ddnMultiInvSuiteletURL = url.resolveScript({
					scriptId:'customscript_itpm_ddn_mulinvlist',
					deploymentId:'customdeploy_itpm_ddn_mulinvlist',
					params:{fid:invId}
				});
				window.open(ddnMultiInvSuiteletURL,'_self');
			}else{
				var msg = displayMessage('New Deduction','Please wait while you are redirected to the new deduction screen.');
				msg.show();
				var ddnSuiteletURL = url.resolveScript({
					scriptId:'customscript_itpm_ddn_createeditsuitelet',
					deploymentId:'customdeploy_itpm_ddn_createeditsuitelet',
					params:{fid:invId,from:'inv',type:'create', multi:(!multiInv)?'no':multiInv}
				});
				window.open(ddnSuiteletURL,'_self');					
			}
		}catch(e){
			console.log(e.name,' record type = invoice, record id='+invId+', function name = iTPMDeduction, message='+e.message);
		}
	}
	
	function iTPMDeductionRedirectToHome(){
		try{
			history.go(-1);
		}catch(e){
			console.log(e.name,'iTPMDeductionRedirectToHome, message='+e.message);
		}
	}
	
    return {
       iTPMDeduction:iTPMDeduction,
       iTPMDeductionRedirectToHome : iTPMDeductionRedirectToHome
    };
    
});
