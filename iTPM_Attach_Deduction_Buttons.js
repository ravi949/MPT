/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 * This will call the respective suitelet scripts upon button click.
 * Client script to be attached to the iTPM Deduction record, via UE, for Deduction Buttons.
 */

define(['N/url',
		'N/https',
		'N/ui/message',
		'N/ui/dialog'
	],

	function(url, https, message, dialog) {

	var postingPeriodURL = url.resolveScript({
	    scriptId: 'customscript_itpm_getaccntngprd_status',
	    deploymentId: 'customdeploy_itpm_getaccntngprd_status',
	    returnExternalUrl: false
	});

	/**
	 * @param type
	 * @param title
	 * @param text
	 * @description displays the message on the record
	 */
	function displayMessage(type,title,text){
		try{
			var msg = message.create({
				type: (type == 'info')?message.Type.INFORMATION:message.Type.ERROR,
						title: title,
						message: text
			});
			return msg;
		} catch(ex) {
			console.log(ex);
		}
	}

	/**
	 * @param id
	 * @param splitMethod
	 * @param ddnSplitTypeID
	 * @description call the deduction split suitelet
	 */
	function iTPMsplit(postingPeriodId, id, splitMethod, ddnSplitTypeID) {
		try{

			//checking postingperiod status
			var response = https.get({url:postingPeriodURL+'&popid='+postingPeriodId});
			console.log(response)
			if(JSON.parse(response.body).period_closed){ 
				dialog.create({
					title:"Warning!",
					message:"<b>iTPM</b> cannot perform the requested action because the Deduction Accounting Period is either closed, or locked.<br><br>Contact your administrator to turn on <b>allow non-G/L changes</b> for the locked or closed period."
				});
			}else{
				var redirectURL;
				switch(splitMethod){
				case "DEFAULT":
					var msg = displayMessage('info','Splitting Deduction','Please wait while you are redirected to the split deduction screen.');
					msg.show();
					redirectURL = url.resolveRecord({
						recordType: 'customtransaction_itpm_deduction',
						recordId: 0,
						params:{
							custom_tranids : encodeURIComponent(JSON.stringify([id])),
							custom_from:'ddn',
							custom_multi : false
						},
						isEditMode: true
					});
					break;
				case "CSV":
					var msg = displayMessage('info','CSV Split Record','Please wait while you are redirected to the CSV split record screen.');
					msg.show();
					redirectURL = url.resolveScript({
						scriptId:'customscript_itpm_ddn_csvsplit',
						deploymentId:'customdeploy_itpm_ddn_csvsplit',
						params:{ddn:id}
					});
					break;
				case "RECORD":
					var msg = displayMessage('info','Split Record','Please wait while you are redirected to the split record screen.');
					msg.show();
					redirectURL = url.resolveTaskLink({
						id:'EDIT_CUST_'+ddnSplitTypeID,
						params:{ddn:id}
					});
					break;
				}
				window.open(redirectURL, '_self');
			}
		} catch(ex) {
			console.log(ex.name,'function name = iTPMsplit, message'+ex.message);
		}
	}

	/**
	 * @param id
	 * @description call the expense suitelet
	 */
	function iTPMexpense(postingPeriodId,id, openbal) {
		try{
			//checking postingperiod status
			var response = https.get({url:postingPeriodURL+'&popid='+postingPeriodId});
			console.log(response)
			if(JSON.parse(response.body).period_closed){ 
				dialog.create({
					title:"Warning!",
					message:"<b>iTPM</b> cannot perform the requested action because the Deduction Accounting Period is either closed, or locked.<br><br>Contact your administrator to turn on <b>allow non-G/L changes</b> for the locked or closed period."
				});
			}else{
				var popMessage = "Click CONTINUE to expense <b>$"+openbal+'</b><br><br>To expense less, CANCEL and SPLIT this deduction.'
				+'<br><br>Change the expense chart-of-account before saving the Journal Entry.'
				dialog.create({
					title: "Are you sure?",
					message: popMessage,
					buttons:[{label:'Continue',value:true},{label:'Cancel',value:false}]
				}).then(function(result){
					if(result){
						var msg = displayMessage('info','Expensing Deduction','Please wait while Redirecting to Journal Entry Form....');
						msg.show();

						//redirecting to journal entry
						Url = url.resolveTaskLink('EDIT_TRAN_JOURNAL',{'did':id});			
						window.open(Url,'_self');
					}
				}).catch(function(reason){
					console.log(reason);
				});
			}
		} catch(ex) {
			console.log(ex.name,'function name = iTPMexpense, message'+ex.message);
		}
	}

	/**
	 * @param id
	 * @param openBalance
	 * @description call the re-invoice suitelet
	 */
	function iTPMinvoice(id, openBalance,postingPeriodId) {
		try{
			//checking postingperiod status
			var response = https.get({url:postingPeriodURL+'&popid='+postingPeriodId});
			console.log(response)
			if(JSON.parse(response.body).period_closed){ 
				dialog.create({
					title:"Warning!",
					message:"<b>iTPM</b> cannot perform the requested action because the Deduction Accounting Period is either closed, or locked.<br><br>Contact your administrator to turn on <b>allow non-G/L changes</b> for the locked or closed period."
				});
			}else{
				dialog.create({
					title: "Are you sure?",
					message: "You are about to REINVOICE <b>$"+openBalance+'</b>',
					buttons:[{label:'Continue',value:true},{label:'Cancel',value:false}]
				}).then(function(result){
					if(result){
						//Re-invoice the deduction logic
						var msg = displayMessage('info','Re-Invoicing Deduction','Please wait while the open balance is moved to A/R.');
						msg.show();
						var suiteletUrl = url.resolveScript({
							scriptId:'customscript_itpm_ddn_reinvoice_script',
							deploymentId:'customdeploy_itpm_ddn_reinvoice_script',
							params:{ddn:id}
						});
						https.get.promise({
							url: suiteletUrl
						}).then(function(response){
							msg.hide();
							var bodyObj = JSON.parse(response.body);
							if(!bodyObj.success){
								var errMsg = displayMessage('error','Error',bodyObj.message);
								errMsg.show({duration: 5000});
							}else{
								var recUrl = url.resolveRecord({
									recordType: 'customtransaction_itpm_deduction',
									recordId: id,
									params:{itpm:'invoice'}
								});
								window.open(recUrl, '_self');
							}
						}).catch(function(ex){
							console.log(ex);
						});

					}
				}).catch(function(reason){
					console.log(reason);
				});
			}
		} catch(ex) {
			console.log(ex.name,'function name = iTPMinvoice, message'+ex.message);
		}
	}

	/**
	 * @param id
	 * @description redirect to the settlement creation suitelet
	 */
	function iTPMsettlement(id, postingPeriodId) {
		try{
			//checking postingperiod status
			var response = https.get({url:postingPeriodURL+'&popid='+postingPeriodId});
			console.log(response)
			if(JSON.parse(response.body).period_closed){ 
				dialog.create({
					title:"Warning!",
					message:"<b>iTPM</b> cannot perform the requested action because the Deduction Accounting Period is either closed, or locked.<br><br>Contact your administrator to turn on <b>allow non-G/L changes</b> for the locked or closed period."
				});
			}else{
				var msg = displayMessage('info','New Settlement','Please wait while the iTPM Settlement screen is loaded.');
				msg.show();
				var suiteletUrl = url.resolveScript({
					scriptId:'customscript_itpm_set_promotionlist',
					deploymentId:'customdeploy_itpm_set_promotionlist',
					params:{ddn:id}
				});
				window.open(suiteletUrl, '_self');
			}
		} catch(ex) {
			console.log(ex.name,'function name = iTPMsettlement, message'+ex.message);
		}
	}

	/**
	 * @param id
	 * @param customerid
	 * @description redirect to the credit memo creation suitelet
	 */
	function iTPMcreditmemo(id, customerid, postingPeriodId) {
		try{
			//checking postingperiod status
			var response = https.get({url:postingPeriodURL+'&popid='+postingPeriodId});
			console.log(response)
			if(JSON.parse(response.body).period_closed){ 
				dialog.create({
					title:"Warning!",
					message:"<b>iTPM</b> cannot perform the requested action because the Deduction Accounting Period is either closed, or locked.<br><br>Contact your administrator to turn on <b>allow non-G/L changes</b> for the locked or closed period."
				});
			}else{
				var msg = displayMessage('info','Credit Memo List','Please wait while you are redirected to the Credit Memo list screen.');
				msg.show();
				var suiteletUrl = url.resolveScript({
					scriptId:'customscript_itpm_ded_matchtocreditmemo',
					deploymentId:'customdeploy_itpm_ded_matchtocreditmemo',
					params:{did:id,customer:customerid,submit:'false'}
				});
				window.open(suiteletUrl, '_self');
			}
		} catch(ex) {
			console.log(ex.name, 'function name = iTPMcreditmemo, message'+ex.message);
		}
	}

	/**
	 * @param from
	 * @param id
	 * @description redirect to previous page
	 */
	function redirectToBack(from,id){
		history.go(-1);
	}

	/**
	 * @param id
	 * @description delete the deduction
	 */
	function iTPMDeleteDeduction(id,postingPeriodId){
		try{			
				var msg = displayMessage('info','Deleting Deduction','Please wait while deleting the Deduction.');
				msg.show();

				var suiteletUrl = url.resolveScript({
					scriptId:'customscript_itpm_delete_record',
					deploymentId:'customdeploy_itpm_delete_record',
					params:{recordid:'customtransaction_itpm_deduction',rectype:'ddn',id:id}
				});

				https.get.promise({
					url: suiteletUrl
				}).then(function(response){
					console.log(response);
					var responseBody = JSON.parse(response.body);
					if(responseBody.success){
						window.location.href = window.location.origin+'/app/common/search/searchresults.nl?searchid='+responseBody.searchid;
					}else{
						alert(responseBody.message);
						window.location.reload();
					}
					console.log(response);
				})
				.catch(function onRejected(reason) {
					console.log(reason);
				});

		}catch(ex) {
			console.log(ex.name, 'function name = deleteDeduction, message'+ex.message);
		}
	}

	return {
		iTPMsplit : iTPMsplit,
		iTPMexpense : iTPMexpense,
		iTPMinvoice : iTPMinvoice,
		iTPMsettlement : iTPMsettlement,
		iTPMcreditmemo : iTPMcreditmemo,
		redirectToBack : redirectToBack,
		iTPMDeleteDeduction: iTPMDeleteDeduction
	};

});
