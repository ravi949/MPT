/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 */
define(['N/record',
	'N/ui/message'],

function(record, message) {

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
		var msg = 'Total Line amount = '+totalAmount;
		showMsg.inValid = (totalAmount != openBalance);
		if(showMsg.inValid){
			msg += (totalAmount > openBalance)? 
					'\nyou have entered '+(totalAmount -openBalance)+' greater than open Balance':
					'\nyou have Reamining '+(openBalance - totalAmount)+' amount to split';
			message.create({
				title: "Alert", 
				message: msg, 
				type: (totalAmount > openBalance)? message.Type.WARNING : message.Type.INFORMATION
			}).show({ duration : 2500 });
			showMsg.msg = msg;
			return false;
		}				
		return true;
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
		if(showMsg.inValid){
			alert(showMsg.msg);
			return false;
		}
		return true;
	}

	return {
		lineInit: lineInit,
		saveRecord:saveRecord
	};

});
