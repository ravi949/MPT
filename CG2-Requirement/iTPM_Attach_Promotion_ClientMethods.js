/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 */
define(['N/url','N/ui/message'],

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
			console.log(ex.name,'function name = displayMessage, message = '+ex.message);
		}
	}
	
	function newSettlement(pid){
		try{
			var msgObj = displayMessage('New Settlement','Please wait while you are redirected to the new settlement screen.');
			msgObj.show();
			var outputURL = url.resolveScript({
				scriptId:'customscript_itpm_set_createeditsuitelet',
				deploymentId:'customdeploy_itpm_set_createeditsuitelet',
				returnExternalUrl: false,
				params:{pid:pid,from:'promo'}
			});
			window.open(outputURL,'_self');
		}catch(e){
			console.log(e.name,'function name = new Settlement, message = '+e.message);
		}
	}
	
    return {
        newSettlement:newSettlement
    };
    
});
