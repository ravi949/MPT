/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 */
define(['N/ui/message',
	    'N/format'],

function(message,format) {

	/**
	 * Validation function to be executed when sublist line is committed.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.currentRecord - Current form record
	 * @param {string} scriptContext.sublistId - Sublist name
	 *
	 * @returns {boolean} Return true if sublist line is valid
	 *
	 * @since 2015.2
	 */
	var showMsg = {};
	function lineInit(scriptContext) {
		try{
			var ddnSplitRec = scriptContext.currentRecord;
			var totalAmount = 0;
			var lineCount = ddnSplitRec.getLineCount('recmachcustrecord_itpm_split');

			//Getting all lines amount
			for(var i = 0;i < lineCount;i++){
				lineAmount = ddnSplitRec.getSublistValue({
					sublistId:'recmachcustrecord_itpm_split',
					fieldId:'custrecord_split_amount',
					line:i
				});
				totalAmount += parseFloat(lineAmount);			
			}	
			//getting open balance from deduction record
			var openBalance = scriptContext.currentRecord.getValue('custrecord_itpm_split_ddnopenbal');
			scriptContext.currentRecord.setValue('custpage_itpm_ddsplit_totallineamount',totalAmount);
			var msg = 'Total Line amount: $'+totalAmount;
			showMsg.inValid = (totalAmount != openBalance);
			var remainingAmount = format.parse({value:(totalAmount -openBalance), type: format.Type.CURRENCY}).toFixed(2);
			var maxAmount = format.parse({value:(openBalance - totalAmount), type: format.Type.CURRENCY}).toFixed(2);
			if(showMsg.inValid){
				msg += (totalAmount > openBalance)? 
						'\nYou have entered more than the Open Balance i.e. $'+remainingAmount:
						'\nYou have Reamining $'+maxAmount+' of Open Balance to Split';
				showMsg.msg = msg;				
				return false;
			}				
			return true;
		}catch(ex){
			console.log(ex);
			return false;
		}
	}


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
			if(showMsg.inValid){
				alert(showMsg.msg);
				return false;
			}
			return true;
		}catch(ex){
			console.log(ex);
			return false;
		}
	}

	return {
		lineInit: lineInit,
		saveRecord:saveRecord
	};

});
