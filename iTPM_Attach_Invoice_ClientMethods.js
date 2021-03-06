/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 * Client script to be attached with UserEvent script to iTPM Invoice records.
 * This will call the respective suitelet scripts upon button click.
 */
define(['N/url',
		'N/ui/message',
		'N/search',
		'N/https',
		'N/ui/dialog'
	],
	/**
	 * @param {url} url
	 */
	function(url,message,search,https,dialog) {
	
	/**
	 * @description Global api call to resolve and get the url
	 */
	var postingPeriodURL = url.resolveScript({
	    scriptId: 'customscript_itpm_getaccntngprd_status',
	    deploymentId: 'customdeploy_itpm_getaccntngprd_status',
	    returnExternalUrl: false
	});

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
	
	/**
	 * @param {number} postingPeriodId
	 * @param {number} invId
	 * @param {array} multiInv
	 */
	function iTPMDeduction(postingPeriodId, invId, multiInv){
		try{			
				//Checking for multiple Invoice
				var invCount =(!multiInv)?multiInvoices(invId):0;
				console.log('invCount',invCount);
				
				if(invCount > 25){
					dialog.create({
						title:"Warning!",
						message:"There are more than 25 open invoices associated with the payment corresponding to this invoice. Please create one or more credit memos to close the invoices and then create a deduction from the credit memo(s)."
					});
				}

				if(invCount >= 2 && invCount <= 25){
					var ddnMultiInvSuiteletURL = url.resolveScript({
						scriptId:'customscript_itpm_ddn_mulinvlist',
						deploymentId:'customdeploy_itpm_ddn_mulinvlist',
						params:{fid:invId}
					});
					window.open(ddnMultiInvSuiteletURL,'_self');
				}
				if(invCount <= 1 || invCount == undefined){
					console.log(true);
					var msg = displayMessage('New Deduction','Please wait while you are redirected to the new deduction screen.');
					msg.show();
					var ddnRecordURL = url.resolveRecord({
						recordType: 'customtransaction_itpm_deduction',
						recordId: 0,
						params:{
							custom_tranids : encodeURIComponent(JSON.stringify([invId])), 
							custom_multi : (multiInv == "yes")
						},
						isEditMode: true
					});
					console.log(ddnRecordURL);
					window.open(ddnRecordURL,'_self');					
				}
			
		}catch(e){
			console.log(e.name,' record type = invoice, record id='+invId+', function name = iTPMDeduction, message='+e.message);
		}
	}

	/**
	 * @description redirect the user to back
	 */
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
