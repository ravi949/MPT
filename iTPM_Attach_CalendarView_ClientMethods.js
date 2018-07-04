/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 */
define(['N/url',
		'N/ui/message',
		'N/record',
		'N/format'
	   ],

function(url, message, record, format) {
	
	/**
	 * Validation function to be executed when record is saved.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.currentRecord - Current form record
	 * @returns {boolean} Return true if record is valid
	 *
	 * @since 2015.2
	 */
	function saveRecord(scriptContext) {
		try{
			var recObj = scriptContext.currentRecord;
			
			//comparing ship start and end
            var shipStart = new Date(recObj.getValue('custrecord_itpm_cal_startdate'));
            var shipEnd = new Date(recObj.getValue('custrecord_itpm_cal_enddate'));
			if(shipStart > shipEnd){
				alert('Start date should not be GREATER THAN the end date');
				return false;
			}
			
			//Checking promotion type validations
			var isAllPromoTypes = recObj.getValue('custrecord_itpm_cal_allpromotiontypes');
			var promoTypes = recObj.getValue('custrecord_itpm_cal_promotiontypes');
			if(!isAllPromoTypes && promoTypes == ''){
				alert('Either "All Promotion Type(s)?" checkbox is checked, or AT LEAST ONE Promotion Type is selected in the multiselect box');
				return false;
			}
			
			//Checking customer validations
			var isAllCustomersChecked = recObj.getValue('custrecord_itpm_cal_allcustomers');
			var customers = recObj.getValue('custrecord_itpm_cal_customer');
			if(!isAllCustomersChecked && customers == ''){
				alert('Either "All Customer(s)?" checkbox is checked, or AT LEAST ONE Customer is selected in the multiselect box');
				return false;
			}
			
			//Checking ITEM validations
			var isAllItemsChecked = recObj.getValue('custrecord_itpm_cal_allitems');
			var items = recObj.getValue('custrecord_itpm_cal_items');
			var itemGroups = recObj.getValue('custrecord_itpm_cal_itemgroups');
			if(!isAllItemsChecked && items == '' && itemGroups == ''){
				alert('Either "All Item(s)?" checkbox is checked, or AT LEAST ONE Item or AT LEAST ONE Item Group  is selected in the multiselect box');
				return false;
			}
			
			//Checking ITEM validations
			var promoStatuses = recObj.getValue('custrecord_itpm_cal_promotionstatus');
			if(promoStatuses == ''){
				recObj.setValue('custrecord_itpm_cal_promotionstatus', 3);
				return true;
			}
			
			return true;
		}catch(ex){
			log.error(ex.name, ex.message);
			return true;
		}
	}
	
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
			var calendarRecType = new URL(location.href).searchParams.get('rectype');
			var outputURL = url.resolveScript({
				scriptId:'customscript_itpm_calendar_report',
				deploymentId:'customdeploy_itpm_calendar_report',
				returnExternalUrl: false,
				params:{cid:cid,rectype:calendarRecType}
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
    	saveRecord : saveRecord,
    	newCalendarReport : newCalendarReport,
    	redirectToBack: redirectToBack
    };

});
