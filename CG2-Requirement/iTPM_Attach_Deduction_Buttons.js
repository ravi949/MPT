/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * Client script to be attached with UserEvent script to iTPM Deduction records.
 * This will call the respective suitelet scripts upon button click.
 */

define(['N/url', 'N/https', 'N/ui/message'],

function(url, https, message) {
	
	function displayMessage(text){
		try{
			var msg = message.create({
				type: message.Type.INFORMATION,
				title: 'Splitting Deduction',
				message: text
			});
			return msg;
		} catch(ex) {
			console.log(ex);
		}
	}
	
	function iTPMsplit(id) {
		try{
			var msg = displayMessage('Please wait while you are redirected to the split deduction screen.');
			msg.show();
			var suiteletUrl = url.resolveScript({
				scriptId:'customscript_itpm_ddn_assnt_view',
				deploymentId:'customdeploy_itpm_ddn_assnt_view',
				returnExternalUrl: false,
				params:{fid:id,from:'ddn'}
			});
			console.log(suiteletUrl);
			https.get.promise({
				url: suiteletUrl
			});
			return;
		} catch(ex) {
			console.log(ex);
		}
	}
	
	function iTPMexpense(id) {
		try{
			var msg = displayMessage('Please wait while the expense is created and applied.');
			msg.show();
			var suiteletUrl = url.resolveScript({
				scriptId:'customscript_itpm_su_ddn_expense',
				deploymentId:'customdeploy_itpm_su_ddn_expense',
				params:{ddn:id}
			});
			console.log(suiteletUrl);
			https.get.promise({
				url: suiteletUrl
			}).then(function(response){
				msg.hide();
				var recUrl = url.resolveRecord({
					recordType: 'customtransaction_itpm_deduction',
					recordId: id,
					params:{itpm:'expense'}
				});
				window.load(recUrl);
			}).catch(function(ex){
				throw ex;
			});
			return;
		} catch(ex) {
			console.log(ex);
		}
	}
	
	function iTPMinvoice(id) {
		return;
	}
	
	function iTPMsettlement(id) {
		return;
	}
	
	function iTPMcallSuitelet(suiteletId, deploymentId, tranId){
		return;
	}
	
    return {
        iTPMsplit : iTPMsplit,
        iTPMexpense : iTPMexpense,
        iTPMinvoice : iTPMinvoice,
        iTPMsettlement : iTPMsettlement
    };
    
});