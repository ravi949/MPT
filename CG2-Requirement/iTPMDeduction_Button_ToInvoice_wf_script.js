/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * To show the Deduction Button on invoice depends upon return value (true or false).
 */
define(['N/search'],

		function(search) {

	/**
	 * Definition of the Suitelet script trigger point.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.oldRecord - Old record
	 * @Since 2016.1
	 */
	function onAction(scriptContext) {
		try{
			//invoice has atleast one PAYMENTS and invoice status not equal to PAID IN FULL
			var invConditionsMet = search.create({
				type:search.Type.INVOICE,
				columns:['internalid'],
				filters:[
					['internalid','is',scriptContext.newRecord.id],'and',
					['applyingtransaction','noneof','none'],'and',
					['applyingtransaction.type','anyof','CustPymt'],'and',
					['mainline','is','T'],'and',
					['status','noneof','CustInvc:B']
					] 
			}).run().getRange(0,5).length>0;

			//invoice dont have any ITPM DEDUCTION records which is not Open,Pending
			var invoiceDeductionsAreEmpty = search.create({
				type:'customtransaction_itpm_deduction',
				columns:['internalid'],
				filters:[['custbody_itpm_ddn_invoice','is',scriptContext.newRecord.id],'and',
					['status','anyof',["Custom100:A","Custom100:B"]]]
			}).run().getRange(0,5).length == 0;

			return (invConditionsMet && invoiceDeductionsAreEmpty).toString();
		}catch(e){
			log.debug('exception',e)
		}
	}

	return {
		onAction : onAction
	};

});
