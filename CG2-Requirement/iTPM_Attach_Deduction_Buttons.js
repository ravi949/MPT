/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
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
			}).show();			
		} catch(ex) {
			console.log(ex);
		}
	}
	
	function split(id) {
		try{
			displayMessage('Please wait while you are redirected to the split deduction screen.');
			inactiveButton('custpage_itpm_split');
			var suiteletUrl = url.resolveScript({
				scriptId:'customscript_itpm_ddn_assnt_view',
				deploymentId:'customdeploy_itpm_ddn_assnt_view',
				returnExternalUrl: false,
				parameters:{fid:id,from:'ddn'}
			});
			https.get.promise({
				url: suiteletUrl
			});
		} catch(ex) {
			console.log(ex);
		}
	}
	function expense(id) {
		
	}
	function invoice(id) {
		
	}
	function settlement(id) {
		
	}
	function callSuitelet(suiteletId, deploymentId, tranId){
		
	}
    return {
        itpm_split : split,
        itpm_expense : expense,
        itpm_invoice : invoice,
        itpm_settlement : settlement
    };
    
});
