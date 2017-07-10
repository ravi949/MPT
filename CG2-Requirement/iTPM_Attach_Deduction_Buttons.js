/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * Client script to be attached with UserEvent script to iTPM Deduction records.
 * This will call the respective suitelet scripts upon button click.
 */

define(['N/url', 'N/https', 'N/ui/message'],

function(url, https, message) {
	
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
	
	function iTPMsplit(id) {
		try{
			var msg = displayMessage('Splitting Deduction','Please wait while you are redirected to the split deduction screen.');
			msg.show();
			var suiteletUrl = url.resolveScript({
				scriptId:'customscript_itpm_ddn_assnt_view',
				deploymentId:'customdeploy_itpm_ddn_assnt_view',
				params:{fid:id,from:'ddn',type:'create'}
			});
			window.open(suiteletUrl, '_self');
		} catch(ex) {
			console.log(ex);
		}
	}
	
	function iTPMexpense(id) {
		try{
			var msg = displayMessage('Expensing Deduction','Please wait while the expense is created and applied.');
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
				window.open(recUrl, '_self');
			}).catch(function(ex){
				console.log(ex);
			});
		} catch(ex) {
			console.log(ex);
		}
	}
	
	function iTPMinvoice(id) {
		try{
			var msg = displayMessage('Re-Invoicing Deduction','Please wait while the open balance is moved to A/R.');
			msg.show();
			var suiteletUrl = url.resolveScript({
				scriptId:'customscript_itpm_su_ddn_invoice',
				deploymentId:'customdeploy_itpm_su_ddn_invoice',
				params:{ddn:id}
			});
			https.get.promise({
				url: suiteletUrl
			}).then(function(response){
				msg.hide();
				var recUrl = url.resolveRecord({
					recordType: 'customtransaction_itpm_deduction',
					recordId: id,
					params:{itpm:'invoice'}
				});
				window.open(recUrl, '_self');
			}).catch(function(ex){
				console.log(ex);
			});
		} catch(ex) {
			console.log(ex);
		}
	}
	
	function iTPMsettlement(id) {
		try{
			var msg = displayMessage('New Settlement','Please wait while the iTPM Settlement screen is loaded.');
			msg.show();
			var suiteletUrl = url.resolveScript({
				scriptId:'customscript_itpm_settlemnt_listpromotns',
    			deploymentId:'customdeploy_itpm_settlemnt_listpromotns',
    			params:{ddn:id}
			});
			window.open(suiteletUrl, '_self');
		} catch(ex) {
			console.log(ex);
		}
	}
	
    return {
        iTPMsplit : iTPMsplit,
        iTPMexpense : iTPMexpense,
        iTPMinvoice : iTPMinvoice,
        iTPMsettlement : iTPMsettlement
    };
    
});
