/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 * Client script to be attached with UserEvent script to iTPM Invoice records.
 * This will call the respective suitelet scripts upon button click.
 */
define(['N/url',
		'N/ui/message'
	   ],
/**
 * @param {url} url
 */
function(url,message) {
	
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
	
	function iTPMDeduction(invId){
		try{
			var msg = displayMessage('New Deduction','Please wait while you are redirected to the new deduction screen.');
			msg.show();
			var ddnSuiteletURL = url.resolveScript({
				scriptId:'customscript_itpm_ddn_createeditsuitelet',
				deploymentId:'customdeploy_itpm_ddn_createeditsuitelet',
				params:{fid:invId,from:'inv',type:'create'}
			});
			window.open(ddnSuiteletURL,'_self');
		}catch(e){
			console.log(e.name,' record type = invoice, record id='+invId+', function name = iTPMDeduction, message='+e.message);
		}
	}
   
    return {
       iTPMDeduction:iTPMDeduction
    };
    
});
