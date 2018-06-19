/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/url',
		'N/ui/message',
		'N/record'
	   ],

function(url, message, record) {
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
	
    function newCalendarReport(cid){
		try{
			var msgObj = displayMessage('New Report','Please wait while you are redirected to the new Calendar Report screen.');
			msgObj.show();
			var outputURL = url.resolveScript({
				scriptId:'customscript_itpm_calendar_report',
				deploymentId:'customdeploy_itpm_calendar_report',
				returnExternalUrl: false,
				params:{cid:cid}
			});
			window.open(outputURL,'_self');
		}catch(e){
			console.log(e.name,'function name = newCalendarReport, message = '+e.message);
		}
	}
    
    function redirectToBack(){
		history.go(-1);
	}
    
    return {
    	newCalendarReport : newCalendarReport,
    	redirectToBack: redirectToBack
    };

});
