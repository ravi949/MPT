/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/url',
		'N/ui/message'
		],

function(url, message) {
   
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
	function iTPMDeduction(creditmemoId){
		var msg = displayMessage('New Deduction','Please wait while you are redirected to the new deduction screen.');
		msg.show();
		var ddnSuiteletURL = url.resolveScript({
			scriptId:'customscript_itpm_ddn_createeditsuitelet',
			deploymentId:'customdeploy_itpm_ddn_createeditsuitelet',
			params:{fid:creditmemoId,from:'creditmemo',type:'create', multi:'no'}
		});
		window.open(ddnSuiteletURL,'_self');	
	}
	/**
	 * @param 
	 * function creditmemoId
	 */
	function iTPMMatchToDdn(creditmemoId){
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
    return {
    	iTPMDeduction:iTPMDeduction,
    	iTPMMatchToDdn:iTPMMatchToDdn
    };
    
});
