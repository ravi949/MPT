/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 * Client script to be attached to the front-end suitelet scripts for iTPM Settlement record Create or Edit.
 */
define(['N/ui/message',
	    'N/record',
	    'N/url',
	    'N/https',
	    'N/ui/dialog'
	    ],
  /**
  * @param {record} record
  * @param {url} url
  */
  function(message, record, url, https, dialog) {

	/**
	 * Function to be executed when field is changed.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.currentRecord - Current form record
	 * @param {string} scriptContext.sublistId - Sublist name
	 * @param {string} scriptContext.fieldId - Field name
	 * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
	 * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
	 *
	 * @since 2015.2
	 */
	function fieldChanged(scriptContext){
		try{
			var currentRecord = scriptContext.currentRecord;
			var fieldName = scriptContext.fieldId;
			var settlementReq = currentRecord.getValue('custom_itpm_st_reql');
			var billBackSetReq = currentRecord.getValue('custpage_billback_setreq');
			billBackSetReq = (billBackSetReq)?billBackSetReq:0;
			
			var netBillbackLiblty = currentRecord.getValue('custpage_netbillback_liablty');
			var netPromotionalLiablty = currentRecord.getValue('custpage_netpromo_liablty');
			var lumpsumSetReqAmnt = currentRecord.getValue('custpage_lumsum_setreq');
			lumpsumSetReqAmnt = (lumpsumSetReqAmnt)?lumpsumSetReqAmnt:0;
			
			var offinvReq = currentRecord.getValue('custpage_offinvoice_setreq')>0?currentRecord.getValue('custpage_offinvoice_setreq'):0;
			offinvReq = (offinvReq)?offinvReq:0;
			
			var totalSettlementReqAmnt = 0;
			var settlementLS = lumpsumSetReqAmnt > 0?lumpsumSetReqAmnt:0;
			var settlementBB = billBackSetReq > 0?billBackSetReq:0;
			var settlementOI = offinvReq > 0?offinvReq:0;

			//this fields changes are trigger when settlement record is edited 
			if(fieldName == 'custpage_lumsum_setreq' || fieldName == 'custpage_billback_setreq' || fieldName == 'custpage_offinvoice_setreq'){    					
				totalSettlementReqAmnt = settlementLS + settlementBB+ settlementOI;
				currentRecord.setValue({
					fieldId:'custom_itpm_st_reql',
					value:totalSettlementReqAmnt
				});
			}
			
			//this field change get the net promotion liability while creating the settlement from list promotions
			if(fieldName == 'custpage_promotion'){
				var promoId = currentRecord.getValue('custpage_promotion');
				if(promoId != ' '){
					var promotionRec = record.load({
						type:'customrecord_itpm_promotiondeal',
						id:promoId
					});
					var netPromoLblty = promotionRec.getValue({fieldId:'custrecord_itpm_p_netpromotionalle'});
					netPromoLblty = (netPromoLblty == '' || netPromoLblty == 'ERROR: Invalid Expression')?0:netPromoLblty;
				}

				currentRecord.setValue({
					fieldId:'custpage_promotion_customer',
					value:(promoId == ' ')?'':promotionRec.getText({fieldId:"custrecord_itpm_p_customer"})
				});
				currentRecord.setValue({
					fieldId:'custpage_promotion_ship_startdate',
					value:(promoId == ' ')?'':promotionRec.getText({fieldId:"custrecord_itpm_p_shipstart"})
				});
				currentRecord.setValue({
					fieldId:'custpage_promotion_ship_enddate',
					value:(promoId == ' ')?'':promotionRec.getText({fieldId:"custrecord_itpm_p_shipend"})
				});
				currentRecord.setValue({
					fieldId: 'custpage_promotion_liability',
					value:(promoId == ' ')?'':netPromoLblty
				}); 

//				document.getElementById('promolink').text = (promoId != ' ')?currentRecord.getText('custpage_promotion'):'';
//				document.getElementById('promolink').href = (promoId != ' ')?url.resolveRecord({recordType:'customrecord_itpm_promotiondeal',recordId:promoId}):''; 
			}

		}catch(ex){
			console.log(ex.name,'record type = iTPM Settlement, record id='+scriptContext.currentRecord.id+', function name = fieldChanged, message='+ex.message);
		}
	}
	/**
	 * Function to be executed when field is changed.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.currentRecord - Current form record
	 * @param {string} scriptContext.sublistId - Sublist name
	 * @param {string} scriptContext.fieldId - Field name
	 * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
	 * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
	 *
	 * @since 2015.2
	 */
	function saveRecord(scriptContext){
		try{
			var currentRecord = scriptContext.currentRecord;
			var settReq = parseFloat(currentRecord.getValue('custom_itpm_st_reql'));
			if(settReq > 0 ){
				if(currentRecord.getValue('custom_itpm_st_ddn_openbal') < currentRecord.getValue('custom_itpm_st_reql')){
					alert('The Settlement Request CANNOT be GREATER THAN the Open Balance on the Deduction');
					return false
				}
			}else if(settReq <= 0){
				alert('The Settlement Request CANNOT be Zero');
				return false
			}
			return true
		}catch(ex){
			console.log(ex.name,'record type = iTPM Settlement, record id='+scriptContext.currentRecord.id+', function name = saveRecord, message='+ex.message);
		}
	}

	//when user click on cancel it redirect to previous page.
	function redirectToBack(){
		history.go(-1);
	}

	//Displaying the message when user clicks on buttons on settlement.
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

	//When user clicks on apply to Deduction button then it redirects to Deduction create suitelet.
	function redirectToDeductionList(settlementId,postingPeriodId){
		try{
			var postingPeriodURL = url.resolveScript({
			    scriptId: 'customscript_itpm_getaccntngprd_status',
			    deploymentId: 'customdeploy_itpm_getaccntngprd_status',
			    returnExternalUrl: false
			});
			//checking postingperiod status
			var response = https.get({url:postingPeriodURL+'&popid='+postingPeriodId});
			console.log(response)
			if(JSON.parse(response.body).period_closed){ 
				dialog.create({
					title:"Warning!",
					message:"<b>iTPM</b> cannot perform the requested action because the Settlement Accounting Period is either closed, or locked.<br><br>Contact your administrator to turn on <b>allow non-G/L changes</b> for the locked or closed period."
				});
			}else{
				var msg = displayMessage('Deducitons List','Please wait while you are redirected to the deductions list screen.');
				msg.show();
				var deductionListURL = url.resolveScript({
					scriptId:'customscript_itpm_set_applytodeduction',
					deploymentId:'customdeploy_itpm_set_applytodeduction',
					params:{sid:settlementId}
				}); 
				window.open(deductionListURL,'_self');
			}
		}catch(e){
			console.log(e.name,'error in redirection to deduction list, function name = redirectToDeductionList,  message='+e.message);
			}
		}

	//When user clicks on apply to Check button then it redirects to Check record.
	function redirectToCheck(settlementId,postingPeriodId){
		try{
			var postingPeriodURL = url.resolveScript({
			    scriptId: 'customscript_itpm_getaccntngprd_status',
			    deploymentId: 'customdeploy_itpm_getaccntngprd_status',
			    returnExternalUrl: false
			});
			//checking postingperiod status
			var response = https.get({url:postingPeriodURL+'&popid='+postingPeriodId});
			console.log(response)
			if(JSON.parse(response.body).period_closed){ 
				dialog.create({
					title:"Warning!",
					message:"<b>iTPM</b> cannot perform the requested action because the Settlement Accounting Period is either closed, or locked.<br><br>Contact your administrator to turn on <b>allow non-G/L changes</b> for the locked or closed period."
				});
			}else{
				var msg = displayMessage('Applying to Check','Please wait while the check is created and applied.');
				msg.show();
				var ApplyToCheckURL = url.resolveScript({
					scriptId:'customscript_itpm_set_applytocheck',
					deploymentId:'customdeploy_itpm_set_applytocheck',
					params:{sid:settlementId}
				}); 
				window.open(ApplyToCheckURL,'_self');
			}
		}catch(e){
			console.log(e.name,'error in apply settlement to check, function name = redirectToCheck, message='+e.message);
		}
	}

	//When user clicks on Void button then it redirects to Settlement suitelet to void the Settlement.
	function voidSettlement(settlementId, postingPeriodId){
		try{
			var postingPeriodURL = url.resolveScript({
			    scriptId: 'customscript_itpm_getaccntngprd_status',
			    deploymentId: 'customdeploy_itpm_getaccntngprd_status',
			    returnExternalUrl: false
			});
			//checking postingperiod status
			var postingPeriodURL = url.resolveScript({
			    scriptId: 'customscript_itpm_getaccntngprd_status',
			    deploymentId: 'customdeploy_itpm_getaccntngprd_status',
			    params:{popid:postingPeriodId},
			    returnExternalUrl: false
			});
			var response = https.get({url:postingPeriodURL});
			console.log(response)
			if(JSON.parse(response.body).period_closed){ 
				dialog.create({
					title:"Warning!",
					message:"<b>iTPM</b> cannot perform the requested action because the Settlement Accounting Period is either closed, or locked.<br><br>Contact your administrator to turn on <b>allow non-G/L changes</b> for the locked or closed period."
				});
			}else{
				var msg = displayMessage('Voiding the settlement','Please wait while void the settlement and redirect to JE.');
				msg.show();
				var voidSetlmntURL = url.resolveScript({
					scriptId:'customscript_itpm_set_void',
					deploymentId:'customdeploy_itpm_set_void',
					params:{sid:settlementId}
				}); 
				window.open(voidSetlmntURL,'_self');
			}
		}catch(e){
			console.log(e.name,'error in void the settlement, function name = voidTheSettlement, message = '+e.message);
		}
	}

	return {
		fieldChanged: fieldChanged,
		saveRecord: saveRecord,
		redirectToBack: redirectToBack,
		redirectToDeductionList: redirectToDeductionList,
		redirectToCheck: redirectToCheck,
		voidSettlement: voidSettlement
	};

});
