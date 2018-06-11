/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
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
	
	function refreshKPIs(promoID){
		try{
			//console.log(promoID);
			var recObj = record.create({
				type: 'customrecord_itpm_kpiqueue',
				isDynamic: true
			});
			recObj.setValue({
	            fieldId: 'custrecord_itpm_kpiq_promotion',
	            value: promoID
	        });
			recObj.setValue({
	            fieldId: 'custrecord_itpm_kpiq_queuerequest',
	            value: 4  //Ad-hoc
	        });
			
			var recordId = recObj.save({
	            enableSourcing: false,
	            ignoreMandatoryFields: true
	        });
			//console.log('KPI Queue record ID: '+recordId);
			
			//redirect to the same promotion
			window.location.reload();
		}catch(e){
			console.log(e.name,'function name = refreshKPIs, message = '+e.message);
		}
	}
	
	function bulkSettlements(promoid,promocustomer){
		try{
			var msgObj = displayMessage('Bulk Resolve Deductions','Please wait while you are redirected to the Resolved Deductions page.');
			msgObj.show();
			var outputURL = url.resolveScript({
				scriptId:'customscript_itpm_bulk_settlements',
				deploymentId:'customdeploy_itpm_bulk_settlements',
				returnExternalUrl: false,
				params:{pid:promoid,pcustomer:promocustomer}
			});
			window.open(outputURL,'_self');
		}catch(e){
			console.log(e.name,'function name = bulkSettlement, message = '+e.message);
		}
	}
	
	function redirectToBack(){
		history.go(-1);
	}
	
	return {
        newSettlement:newSettlement,
        refreshKPIs : refreshKPIs,
        bulkSettlements : bulkSettlements,
        redirectToBack : redirectToBack
    };
    
});
