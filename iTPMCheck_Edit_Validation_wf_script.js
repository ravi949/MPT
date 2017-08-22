/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Validating the check Credit and Debit lines with old check record 
 */
define(['N/record', 'N/search'],
		/**
		 * @param {record} record
		 * @param {search} search
		 */
		function(record, search) {

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
			var checkRecord = scriptContext.newRecord;
			var settlementRecId = checkRecord.getValue('custbody_itpm_settlementrec');
			//checking weather the check is created from settlement are not
			if(settlementRecId){
				var checkAmount = checkRecord.getValue('usertotal');
				var settlementRec =  record.load({
					type: 'customtransaction_itpm_settlement' ,
					id: settlementRecId
				});
				/*var settlementRec =  search.create({
					type: 'customtransaction_itpm_settlement' ,
					columns: ['custbody_itpm_set_amount','line'],
					filters: [['internalid', 'is', 7757],'and',['mainline','is',true]]
				}).run().getRange(0,10);*/
				var setlReqAmount = settlementRec.getValue('custbody_itpm_set_amount');

				//checking The Amount on the check is exceed the Settlement Request Amount of the Settlement record or not.
				if(checkAmount > setlReqAmount)
					return false.toString();

				var trueCount =0,checkLineAmounts =[],setLineDebits=[],checkLineCount = checkRecord.getLineCount({ sublistId: 'expense'	})
				,setlLineCount = settlementRec.getLineCount({ sublistId: 'line'	});
				
				for(var v=0,i=0;v<setlLineCount;v++,i++){
					//getting the line items of check record
					if(i<checkLineCount){
						var checkLineAmount = checkRecord.getSublistValue({
							sublistId: 'expense',
							fieldId: 'amount',
							line:i
						});
						var checkLineAccount = checkRecord.getSublistValue({
							sublistId: 'expense',
							fieldId: 'account',
							line: i
						});
						var checkLineAmountType = checkRecord.getSublistValue({
							sublistId: 'expense',
							fieldId: 'custcol_itpm_lsbboi',
							line: i
						});
						checkLineAmounts.push({account:checkLineAccount,amount:checkLineAmount,type:checkLineAmountType});
					}
					//getting the expense account type line items of Settlement record 
					var setlDebit =settlementRec.getSublistValue({
						sublistId: 'line',
						fieldId: 'debit',
						line: v
					});
					var setlDebitAccount =settlementRec.getSublistValue({
						sublistId: 'line',
						fieldId: 'account',
						line: v
					});
					var setlDebitAmountType =settlementRec.getSublistValue({
						sublistId: 'line',
						fieldId: 'custcol_itpm_lsbboi',
						line: v
					});
					setLineDebits.push({account:setlDebitAccount,amount:setlDebit,type:setlDebitAmountType});
				}
				var lumpsumLine = setLineDebits.some(function(e,index){
					if(e.amount == checkLineAmounts[0].amount&&e.account == checkLineAmounts[0].account&&e.type==checkLineAmounts[0].type){
						setLineDebits.splice(index,1);checkLineAmounts.splice(0,1);
						return true;
					}else 
						return false;
				}); 
				var bbLine = setLineDebits.some(function(e,index){
					if(e.amount == checkLineAmounts[0].amount&&e.account == checkLineAmounts[0].account&&e.type==checkLineAmounts[0].type){
						setLineDebits.splice(index,1);checkLineAmounts.splice(0,1);
						return true;
					}else 
						return false;
				}); 
				var oiLine = setLineDebits.some(function(e,index){
					if(e.amount == checkLineAmounts[0].amount&&e.account == checkLineAmounts[0].account&&e.type==checkLineAmounts[0].type){
						setLineDebits.splice(index,1);checkLineAmounts.splice(0,1);
						return true;
					}else 
						return false;
				});
				if(lumpsumLine && bbLine && oiLine)
					return true.toString();
				else
					return false.toString();
				
			}	
			else
				return true.toString();
		}catch(e){
			log.error('Exception occurs',e);
		}
	}
	return {
		onAction : onAction
	};

});
