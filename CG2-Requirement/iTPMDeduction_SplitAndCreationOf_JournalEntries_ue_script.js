/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * if parent deduction amount is less than new deduction amount then.
 * split the deduction into two and creating the two journal entries for each deduction and changed the parent deduction status to resolved.
 */
define(['N/url','N/record','N/search'],

function(url,record,search) {

	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {string} scriptContext.type - Trigger type
	 * @param {Form} scriptContext.form - Current form
	 * @Since 2015.2
	 */
	function beforeLoad(scriptContext) {}

	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {string} scriptContext.type - Trigger type
	 * @Since 2015.2
	 */
	function afterSubmit(scriptContext) {
		try{
			if(scriptContext.type == 'create'){
				var recordType = scriptContext.newRecord.type,
				deductionRec = record.load({
					type:recordType,
					id:scriptContext.newRecord.id
				}),
				parentDedutionRecId = deductionRec.getValue('custbody_itpm_ddn_parentddn');

				if(parentDedutionRecId != ''){
					var parentDeductionRec = record.load({
						type:recordType,
						id:parentDedutionRecId
					});

					var childDedAmount = deductionRec.getValue('custbody_itpm_ddn_amount'),
					parentDedOpenBal = parentDeductionRec.getValue('custbody_itpm_ddn_openbal'),
					childDedAmount = deductionRec.getValue('custbody_itpm_ddn_amount'),
					childDedEntryNo = deductionRec.getValue('tranid');

					//applying the reversable GL impact to the parent deduction
					var parentBalIsGreaterThanChild = (parentDedOpenBal > childDedAmount);

//					if(childDedAmount == parentDedOpenBal || parentBalIsGreaterThanChild){
//						createReversalJournalEntry(parentDedutionRecId,childDedAmount,parentDedOpenBal,childDedEntryNo);
//					}

					if(parentBalIsGreaterThanChild){

						var remainingAmount = (parentDedOpenBal - childDedAmount).toFixed(2),
						//copying the previous child into the new child deduction record
						copiedDeductionRec = record.copy({
							type:recordType,
							id:scriptContext.newRecord.id
						});

						copiedDeductionRec.setValue({
							fieldId:'custbody_itpm_ddn_disputed',
							value:false //when split the deduction if first one checked second set to false
						}).setValue({
							fieldId:'custbody_itpm_ddn_amount',
							value:remainingAmount  //setting the remaining the amount value to the Amount field
						}).setValue({
							fieldId:'custbody_itpm_ddn_openbal',
							value:remainingAmount
						})

						//setting the line values to copied deduction record
						var lineCount = copiedDeductionRec.getLineCount('line');
						for(var i = 0;i<lineCount;i++){
							copiedDeductionRec.setSublistValue({
								sublistId:'line',
								fieldId:(i==0)?'credit':'debit',
								value:remainingAmount,
								line:i
							});
						}

						//save the new child deduction record
						var newChildDedid = copiedDeductionRec.save({enableSourcing:false,ignoreMandatoryFields:true});

						//getting the lookup field Entry No value from newly generated child deduction
						childDedEntryNo = search.lookupFields({
							type:recordType,
							id:newChildDedid,
							columns:['tranid']
						}).tranid;

						//again creating the Journal entry for new child deduction record
//						createReversalJournalEntry(parentDedutionRecId,remainingAmount,remainingAmount,childDedEntryNo);
					}
					
					//loading the parent record again why because parentDeductionRec already save 
					//thats why we are loading the record newly	
					parentDeductionRec.setValue({
						fieldId:'custbody_itpm_ddn_openbal',
						value:0 
					}).setValue({
						fieldId:'transtatus',
						value:'C'  //changed the parent status to Resolved
					}).save({
						enableSourcing: false,
						ignoreMandatoryFields : true
					});
				}
			}
		}catch(e){
			log.error('exception create journal entries',e.message)
		}
	}


	//if child amount and parent deduction open balance is same 
	function createReversalJournalEntry(parentDedutionRecId,childDedAmount,parentDedOpenBal,childDedEntryNo){

		//loading the parent record again why because parentDeductionRec already save 
		//thats why we are loading the record newly
		var parentDeductionRec = record.load({
			type:'customtransaction_itpm_deduction',
			id:parentDedutionRecId
		});

		var journalEntryRec = record.create({
			type:record.Type.JOURNAL_ENTRY,
			isDynamic:true
		}),parentDedLineCount = parentDeductionRec.getLineCount('line'),lineMemo,defaultRecvAccnt,expenseId,
		lineCount = parentDeductionRec.getLineCount('line');

		journalEntryRec.setValue({
			fieldId:'subsidiary',
			value:parentDeductionRec.getValue('subsidiary')
		}).setValue({
			fieldId:'memo',
			value:'Reversal Journal applied on Child Deduction #'+childDedEntryNo
		});

		for(var i = 0;i<lineCount;i++){
			if(i == 0)
				defaultRecvAccnt = parentDeductionRec.getSublistValue({sublistId:'line',fieldId:'account',line:i});
			else
				expenseId = parentDeductionRec.getSublistValue({sublistId:'line',fieldId:'account',line:i});
		}
		var receivbaleAccntsList = [{accountId:defaultRecvAccnt,amount:childDedAmount,fid:'debit'},{accountId:expenseId,amount:childDedAmount,fid:'credit'}];

		log.debug('receivbaleAccntsList',receivbaleAccntsList)

		receivbaleAccntsList.forEach(function(e){
			journalEntryRec.selectNewLine({sublistId:'line'});

			journalEntryRec.setCurrentSublistValue({
				sublistId:'line',
				fieldId:'account',
				value:e.accountId
			});

			journalEntryRec.setCurrentSublistValue({
				sublistId:'line',
				fieldId:e.fid,
				value:e.amount
			});

			journalEntryRec.setCurrentSublistValue({
				sublistId:'line',
				fieldId:'memo',
				value:'Reversal Journal applied on Child Deduction #'+childDedEntryNo
			});

			journalEntryRec.setCurrentSublistValue({
				sublistId:'line',
				fieldId:'entity',
				value:parentDeductionRec.getValue('custbody_itpm_ddn_customer')
			})

			journalEntryRec.commitLine({
				sublistId: 'line'
			});
		});

		journalEntryRec.save({enableSourcing:false,ignoreMandatoryFields:true});

		parentDeductionRec.setValue({
			fieldId:'custbody_itpm_ddn_openbal',
			value:parentDedOpenBal - childDedAmount
		}).save({enableSourcing:false,ignoreMandatoryFields:true});
	}




	return {
		//beforeLoad: beforeLoad,
		afterSubmit:afterSubmit
	};

});
