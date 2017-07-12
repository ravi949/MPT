/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 */
define(['N/ui/message', 'N/url'],
/**
 * @param {message} message
 * @param {url} url
 */
function(message, url) {
	
	function displayMessage(title,text){
		try{
			var msg = message.create({
				type: message.Type.INFORMATION,
				title: title,
				message: text
			});
			return msg;
		} catch(ex) {
			console.log(ex.name,'function name = displayMessage, message = '+ex.message);
		}
	}

    
   function redirectToDeductionList(settlementId){
	   try{
		  var msg = displayMessage('Deducitons List','Please wait while you are redirected to the deductions list screen.');
		  msg.show();
		  var deductionListURL = url.resolveScript({
   			scriptId:'customscript_itpm_settlement_applyto_ddn',
   			deploymentId:'customdeploy_itpm_settlement_applyto_ddn',
   			params:{sid:settlementId}
   		  }); 
		  window.open(deductionListURL,'_self');
	   }catch(e){
		   console.log(e.name,'error in redirection to deduction list, function name = redirectToDeductionList,  message='+e.message);
	   }
   }
   function redirectToCheck(settlementId){
	   try{
		  var msg = displayMessage('Applying to Check','Please wait while the check is created and applied.');
		  msg.show();
		  var deductionListURL = url.resolveScript({
	   			scriptId:'customscript_itpm_settlemnt_aplyto_check',
	   			deploymentId:'customdeploy_itpm_settlemnt_aplyto_check',
	   			params:{sid:settlementId}
	   		  }); 
			  window.open(deductionListURL,'_self');
	   }catch(e){
		   console.log(e.name,'error in apply settlement to check, function name = redirectToCheck, message='+e.message);
	   }
   }
    return {
        redirectToDeductionList:redirectToDeductionList,
        redirectToCheck:redirectToCheck
    };
    
});
