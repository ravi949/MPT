/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 * This will call the respective suitelet scripts upon button click.
 * Client script to be attached to the iTPM Deduction record, via UE, for Deduction Buttons.
 */

define(['N/url',
		'N/https',
		'N/ui/message'
		],

function(url, https, message) {
	
	function displayMessage(type,title,text){
		try{
			var msg = message.create({
				type: (type == 'info')?message.Type.INFORMATION:message.Type.ERROR,
				title: title,
				message: text
			});
			return msg;
		} catch(ex) {
			console.log(ex);
		}
	}
	
	
	function iTPMsplit(id, splitMethod, ddnSplitTypeID) {
		try{
			var suiteletUrl;
			switch(splitMethod){
			case "DEFAULT":
				var msg = displayMessage('info','Splitting Deduction','Please wait while you are redirected to the split deduction screen.');
				msg.show();
				suiteletUrl = url.resolveScript({
					scriptId:'customscript_itpm_ddn_createeditsuitelet',
					deploymentId:'customdeploy_itpm_ddn_createeditsuitelet',
					params:{fid:id,from:'ddn',type:'create'}
				});
				break;
			case "CSV":
				var msg = displayMessage('info','CSV Split Record','Please wait while you are redirected to the CSV split record screen.');
				msg.show();
				suiteletUrl = url.resolveScript({
					scriptId:'customscript_itpm_ddn_csvsplit',
					deploymentId:'customdeploy_itpm_ddn_csvsplit',
					params:{ddn:id}
				});
				break;
			case "RECORD":
				var msg = displayMessage('info','Split Record','Please wait while you are redirected to the split record screen.');
				msg.show();
				suiteletUrl = url.resolveTaskLink({
					id:'EDIT_CUST_'+ddnSplitTypeID,
					params:{ddn:id}
				});
				break;
			}
			window.open(suiteletUrl, '_self');
		} catch(ex) {
			console.log(ex.name,'function name = iTPMsplit, message'+ex.message);
		}
	}
	
	
	function iTPMexpense(id) {
		try{
			var msg = displayMessage('info','Expensing Deduction','Please wait while the expense is created and applied.');
			msg.show();
			var suiteletUrl = url.resolveScript({
				scriptId:'customscript_itpm_ddn_expense',
				deploymentId:'customdeploy_itpm_ddn_expense',
				params:{ddn:id}
			});
			console.log(suiteletUrl);
			https.get.promise({
				url: suiteletUrl
			}).then(function(response){
				msg.hide();
				var bodyObj = JSON.parse(response.body);
				if(bodyObj.error){
					var errMsg = displayMessage('error','Error',bodyObj.message);
					errMsg.show({duration: 5000});
				}else{
					var recUrl = url.resolveRecord({
						recordType: 'customtransaction_itpm_deduction',
						recordId: id,
						params:{itpm:'expense'}
					});
					window.open(recUrl, '_self');
				}
			}).catch(function(ex){
				console.log(ex);
			});
		} catch(ex) {
			console.log(ex.name,'function name = iTPMexpense, message'+ex.message);
		}
	}
	
	function iTPMinvoice(id) {
		try{
			var msg = displayMessage('info','Re-Invoicing Deduction','Please wait while the open balance is moved to A/R.');
			msg.show();
			var suiteletUrl = url.resolveScript({
				scriptId:'customscript_itpm_ddn_reinvoice_script',
				deploymentId:'customdeploy_itpm_ddn_reinvoice_script',
				params:{ddn:id}
			});
			https.get.promise({
				url: suiteletUrl
			}).then(function(response){
				msg.hide();
				var bodyObj = JSON.parse(response.body);
				if(bodyObj.error){
					var errMsg = displayMessage('error','Error',bodyObj.message);
					errMsg.show({duration: 5000});
				}else{
					var recUrl = url.resolveRecord({
						recordType: 'customtransaction_itpm_deduction',
						recordId: id,
						params:{itpm:'invoice'}
					});
					window.open(recUrl, '_self');
				}
			}).catch(function(ex){
				console.log(ex);
			});
		} catch(ex) {
			console.log(ex.name,'function name = iTPMinvoice, message'+ex.message);
		}
	}
	
	function iTPMsettlement(id) {
		try{
			var msg = displayMessage('info','New Settlement','Please wait while the iTPM Settlement screen is loaded.');
			msg.show();
			var suiteletUrl = url.resolveScript({
				scriptId:'customscript_itpm_set_promotionlist',
    			deploymentId:'customdeploy_itpm_set_promotionlist',
    			params:{ddn:id}
			});
			window.open(suiteletUrl, '_self');
		} catch(ex) {
			console.log(ex.name,'function name = iTPMsettlement, message'+ex.message);
		}
	}
	
	function iTPMcreditmemo(id, customerid) {
		try{
			var msg = displayMessage('info','Credit Memo List','Please wait while you are redirected to the Credit Memo list screen.');
			msg.show();
			var suiteletUrl = url.resolveScript({
				scriptId:'customscript_itpm_ded_matchtocreditmemo',
    			deploymentId:'customdeploy_itpm_ded_matchtocreditmemo',
    			params:{did:id,customer:customerid,submit:'false'}
			});
			window.open(suiteletUrl, '_self');
		} catch(ex) {
			console.log(ex.name, 'function name = iTPMcreditmemo, message'+ex.message);
		}
	}
	
	function redirectToBack(from,id){
    	history.go(-1);
    }
	
	function deleteDeduction(id){
		try{
			var msg = displayMessage('info','Deleting Deduction','Please wait while deleting the Deduction.');
			msg.show();
			
			var suiteletUrl = url.resolveScript({
				scriptId:'customscript_itpm_delete_record',
				deploymentId:'customdeploy_itpm_delete_record',
				params:{rectype:'customtransaction_itpm_deduction',did:id}
			});
			console.log(suiteletUrl);
			https.get.promise({
				url: suiteletUrl
			})
			.then(function(response){
				var responseBody = JSON.parse(response.body);
				if(responseBody.success){
					window.location.href = window.location.origin+'/app/common/search/searchresults.nl?searchid='+responseBody.searchid;
				}
				console.log(response);
			})
			.catch(function onRejected(reason) {
				console.log(reason);
			});
			
		}catch(ex) {
			console.log(ex.name, 'function name = deleteDeduction, message'+ex.message);
		}
	}
	
    return {
        iTPMsplit : iTPMsplit,
        iTPMexpense : iTPMexpense,
        iTPMinvoice : iTPMinvoice,
        iTPMsettlement : iTPMsettlement,
        iTPMcreditmemo : iTPMcreditmemo,
        redirectToBack : redirectToBack,
        deleteDeduction: deleteDeduction
    };
    
});
