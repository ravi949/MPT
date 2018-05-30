/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 */
define(['N/record',
	'N/ui/message'],

	function(record, message) {

	/**
	 * Function to be executed after page is initialized.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.currentRecord - Current form record
	 * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
	 *
	 * @since 2015.2
	 */
	function pageInit(scriptContext) {
	}


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
		var msg = 'Total Line amount = <b>'+totalAmount+'</b>';
		if(totalAmount != openBalance){
			msg += (totalAmount > openBalance)? 
				'\nyou have entered <b>'+(totalAmount -openBalance)+'</b> greater than open Balance':
				'\nyou have Reamining <b>'+(openBalance - totalAmount)+'</b> amount to split';
			message.create({
				title: "Warning!", 
				message: msg, 
				type: (totalAmount > openBalance)? message.Type.WARNING : message.Type.INFORMATION
			}).show({ duration : 3000 });		
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
		var ddnSplitRec = scriptContext.currentRecord;
		var totalAmount = 0;				
		console.log(ddnSplitRec.getValue('custrecord_itpm_split_ddnopenbal'));
		var lineCount = ddnSplitRec.getLineCount('recmachcustrecord_itpm_split');
		console.log(lineCount);
		for(var i = 0;i < lineCount;i++){
			lineAmount = ddnSplitRec.getSublistValue({
				sublistId:'recmachcustrecord_itpm_split',
				fieldId:'custrecord_split_amount',
				line:i
			});
			totalAmount += parseFloat(lineAmount);			
		}
		console.log(totalAmount);
		var openBalance = scriptContext.currentRecord.getValue('custrecord_itpm_split_ddnopenbal');
		if(totalAmount > openBalance){			
			alert('Total Line amount ='+totalAmount+'\nyou have entered '+(totalAmount -openBalance)+' greater than open Balance');
			return false;
		}else if(totalAmount < openBalance){			
			alert('Total Line amount ='+totalAmount+'\nyou have entered '+(openBalance- totalAmount)+' less than open Balance');
			return false;
		}
		console.log(scriptContext.currentRecord.getValue('custrecord_itpm_split_ddnopenbal'));		
		return true;
	}

	return {
//		pageInit: pageInit,
		lineInit: lineInit,
		saveRecord:saveRecord
	};

});
