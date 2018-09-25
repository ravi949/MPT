/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/url',
	'N/ui/message',
	'N/ui/dialog',
	'N/https'
	],

	function(url, message,dialog,https) {

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

	/**
	 * @param creditmemoId
	 */
	function iTPMDeduction(creditmemoId,postingPeriodId){
		
		//Checking Accounting period status
		var postingPeriodURL = url.resolveScript({
		    scriptId: 'customscript_itpm_getaccntngprd_status',
		    deploymentId: 'customdeploy_itpm_getaccntngprd_status',
		    params:{popid:postingPeriodId},
		    returnExternalUrl: true
		});
		var response = https.get({url:postingPeriodURL});
		console.log(response);
		console.log(JSON.parse(response.body));
		if(JSON.parse(response.body).period_closed){ 
			dialog.create({
				title:"Warning!",
				message:"<b>iTPM</b> cannot perform the requested action because the Credit Memo Accounting Period is either closed, or locked."
			});
		}else{
			var msg = displayMessage('New Deduction','Please wait while you are redirected to the new deduction screen.');
			msg.show();
			var ddnSuiteletURL = url.resolveScript({
				scriptId:'customscript_itpm_ddn_createeditsuitelet',
				deploymentId:'customdeploy_itpm_ddn_createeditsuitelet',
				params:{fid:creditmemoId,from:'creditmemo',type:'create', multi:'no'}
			});
			window.open(ddnSuiteletURL,'_self');
		}
	}
	/**
	 * @param 
	 * function creditmemoId
	 */
	function iTPMMatchToDdn(creditmemoId,postingPeriodId){
		var postingPeriodURL = url.resolveScript({
		    scriptId: 'customscript_itpm_getaccntngprd_status',
		    deploymentId: 'customdeploy_itpm_getaccntngprd_status',
		    params:{popid:postingPeriodId},
		    returnExternalUrl: true
		});
		var response = https.get({url:postingPeriodURL});
		console.log(response);
		console.log(JSON.parse(response.body));
		if(JSON.parse(response.body).period_closed){ 
			dialog.create({
				title:"Warning!",
				message:"<b>iTPM</b> cannot perform the requested action because the Credit Memo Accounting Period is either closed, or locked."
			});
		}else{
			console.log(" client script attachment "+creditmemoId);
			var msg = displayMessage('Deduction List','Please wait while you are redirected to the Deduction list screen.');
			msg.show();
			var suiteletUrl = url.resolveScript({
				scriptId:'customscript_itpm_creditmemo_matchtoddn',
				deploymentId:'customdeploy_itpm_creditmemo_matchtoddn',
				params:{cmid:creditmemoId,submit:'false'}
			});
			window.open(suiteletUrl, '_self');
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
	return {
		iTPMDeduction:iTPMDeduction,
		iTPMMatchToDdn:iTPMMatchToDdn,
		redirectToBack:redirectToBack
	};

});
