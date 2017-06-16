/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * This is an assistant view to create a deduction
 */
define(['N/ui/serverWidget','N/record','N/search','N/runtime','N/redirect','N/config','N/format'],

function(serverWidget,record,search,runtime,redirect,config,format) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
	function onRequest(context) {
		try{
			var request = context.request,response = context.response,params = request.parameters;

			if(request.method == 'GET'){

				//validation on passed id
				var statusObj = checkWhetherIdValidOrNot(params.fid,params.from);
				if(!statusObj.success){
					throw Error(statusObj.errormessage);
				}

				if(params.from == 'inv'){
					var invoiceRec = record.load({
						type:record.Type.INVOICE,
						id:params.fid
					}),
					invoiceId = invoiceRec.id,
					invoiceText = invoiceRec.getText('tranid'),
					subsid = invoiceRec.getValue('subsidiary'),
					subsidiaryText = invoiceRec.getText('subsidiary'),
					customerId = invoiceRec.getValue('entity'),
					customerEntity = invoiceRec.getText('entity'),
					invAmount = invoiceRec.getValue('amountremainingtotalbox'),
					invclass = invoiceRec.getValue('class'),
					invdept = invoiceRec.getValue('department'),
					invlocation = invoiceRec.getValue('location'),
					currencyId = invoiceRec.getValue('currency'),
					currencyText = invoiceRec.getText('currency'),
					currentUserId = runtime.getCurrentUser().id,
					totalSettlements = 0,
					customerRec = record.load({
						type:record.Type.CUSTOMER,
						id:customerId
					}),
					defaultRecvAccnt = customerRec.getValue('receivablesaccount'),
					customerParentId = customerRec.getValue('parent');
				}

				if(params.from == 'ddn'){
					var deductionRec = originalDddnRec = record.load({
						type:'customtransaction_itpm_deduction',
						id:params.fid
					});
					var originalDddno = deductionRec.getValue('custbody_itpm_ddn_originalddn'),
					originalDdnText = deductionRec.getText('custbody_itpm_ddn_originalddn');
					if(originalDddno !=''){
						originalDddnRec = record.load({
							type:'customtransaction_itpm_deduction',
							id:originalDddno
						});
					}

					var deductnNo = deductionRec.getValue('tranid'),
					invoiceId = deductionRec.getValue('custbody_itpm_ddn_invoice'),
					invoiceText = deductionRec.getText('custbody_itpm_ddn_invoice'),
					subsid = originalDddnRec.getValue('subsidiary'), //subsidiary from original dedution
					subsidiaryText = originalDddnRec.getText('subsidiary'), //subsidiary from original dedution
					customerId = originalDddnRec.getValue('custbody_itpm_ddn_customer'), //customer from original dedution
					customerEntity = originalDddnRec.getText('custbody_itpm_ddn_customer'), //customer from original dedution
					invAmount = deductionRec.getValue('custbody_itpm_ddn_amount'),
					invclass = originalDddnRec.getValue('class'), //class from original dedution
					invdept = originalDddnRec.getValue('department'), //dept from original dedution
					invlocation = originalDddnRec.getValue('location'), //location from original dedution
					currencyId = originalDddnRec.getValue('currency'), //currency from original dedution
					currencyText = originalDddnRec.getText('currency'), //currency from original dedution
					currentUserId = runtime.getCurrentUser().id,
					totalSettlements = 0,
					customerRec = record.load({
						type:record.Type.CUSTOMER,
						id:customerId
					}),
					defaultRecvAccnt = customerRec.getValue('receivablesaccount'),
					customerParentId = customerRec.getValue('parent');
				}

				var ddnForm = serverWidget.createForm({
					title: '- ITPM Deduction'
				});

				/*-------------------Set the Parent Deduction value----------*/
				ddnForm.addField({
					id : 'custom_parent_recid',
					type : serverWidget.FieldType.TEXT,
					label:'Parent Record id'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				}).defaultValue = params.fid;  

				ddnForm.addField({
					id : 'custom_cfrom',
					type : serverWidget.FieldType.TEXT,
					label:'Created From'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				}).defaultValue = params.from;

				/*-----------------------------end--------------------------*/

				/*--------------Default Account Recivable------------------*/
				ddnForm.addField({
					id : 'custom_def_accnt_recv',
					type : serverWidget.FieldType.TEXT,
					label:'Date'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				}).defaultValue = defaultRecvAccnt
				/*-------------------------End-------------------------------*/


				/*------primary info start-----*/

				ddnForm.addFieldGroup({
					id:'custom_primry_information',
					label:'Primary Information'
				});

				//setting the Entry no value
				ddnForm.addField({
					id : 'custom_tranid',
					type : serverWidget.FieldType.TEXT,
					label:'ENTRY NO.',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).defaultValue = "To Be Generated"

					//setting the ORIGINAL NUMBER value
					var originnoField = ddnForm.addField({
						id : 'custom_itpm_ddn_originalddn',
						type : serverWidget.FieldType.SELECT,
						label:'Original Number',
						container:'custom_primry_information'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.DISABLED
					});

				originnoField.addSelectOption({
					value:(params.from =='inv')?' ':originalDddnRec.id,
							text:(params.from =='inv')?' ':originalDddnRec.getValue('tranid')
				})	

				//setting the OTHER REFERENCE CODE value
				ddnForm.addField({
					id : 'custom_itpm_ddn_otherrefcode',
					type : serverWidget.FieldType.TEXT,
					label:'OTHER REFERENCE CODE',
					container:'custom_primry_information'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});

				if(customerParentId != ''){
					//setting the parent value from the customer
					var customerParent = ddnForm.addField({
						id : 'custom_parent',
						type : serverWidget.FieldType.SELECT,
						label:'Parent',
						container:'custom_primry_information'
					}).updateDisplayType({
						displayType : serverWidget.FieldDisplayType.DISABLED
					});

					customerParent.addSelectOption({
						value : customerParentId,
						text : customerRec.getText('parent'),
						isSelected:true
					});
				}	

				//setting the todate
				ddnForm.addField({
					id : 'custom_trandate',
					type : serverWidget.FieldType.DATE,
					label:'Date',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).defaultValue = format.format({
					value:new Date(),
					type: format.Type.DATE
				});

				//setting the INVOICE Value
				var invoice = ddnForm.addField({
					id : 'custom_itpm_ddn_invoice',
					type : serverWidget.FieldType.SELECT,
					label:'Invoice',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});

				invoice.addSelectOption({
					value : invoiceId,
					text : invoiceText,
					isSelected:true
				});


				//setting the CUSTOMER Value
				var customer = ddnForm.addField({
					id : 'custom_customer',
					type : serverWidget.FieldType.SELECT,
					label:'Customer',
					container:'custom_primry_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				})

				customer.addSelectOption({
					text:customerEntity,
					value:customerId,
					isSelected:true
				})
				/*-----primary info end-----*/

				/*------Classification start ------*/
				ddnForm.addFieldGroup({
					id : 'custom_classification',
					label : 'Classification'
				});

				//setting the CLASS value
				var classField = ddnForm.addField({
					id : 'custom_class',
					type : serverWidget.FieldType.SELECT,
					label:'Class',
					container:'custom_classification'
				})

				classField.addSelectOption({
					value :' ',
					text : ' '
				});

				getList(subsid,'class').run().each(function(e){
					classField.addSelectOption({
						value :e.getValue('internalid'),
						text : e.getValue('name'),
						isSelected:(invclass == e.getValue('internalid'))
					});
					return true;
				})

				//setting the LOCATION value
				var location = ddnForm.addField({
					id : 'custom_location',
					type : serverWidget.FieldType.SELECT,
					label:'Location',
					container:'custom_classification'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});

				location.addSelectOption({
					value:' ',
					text:' '
				})

				getList(subsid,'location').run().each(function(e){
					location.addSelectOption({
						value:e.getValue('internalid'),
						text:e.getValue('name'),
						isSelected:(invlocation == e.getValue('internalid'))
					})
					return true;
				})


				//setting the DEPARTMENT value
				var dept = ddnForm.addField({
					id : 'custom_department',
					type : serverWidget.FieldType.SELECT,
					label:'Department',
					container:'custom_classification'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});

				dept.addSelectOption({
					value:' ',
					text:' '
				})

				getList(subsid,'dept').run().each(function(e){
					dept.addSelectOption({
						value:e.getValue('internalid'),
						text:e.getValue('name'),
						isSelected:(invdept == e.getValue('internalid'))
					})
					return true;
				})
				/*------Classification end --------*/	

				/*------- Detail info start --------*/

				ddnForm.addFieldGroup({
					id : 'custom_detail_information',
					label : 'Detail Information'
				});

				//setting the SUBSIDIARY Value
				var subsidiary = ddnForm.addField({
					id : 'custom_subsidiary',
					type : serverWidget.FieldType.SELECT,
					label:'Subsidiary',
					container:'custom_detail_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});

				subsidiary.addSelectOption({
					value : subsid,
					text : subsidiaryText,
					isSelected:true
				});


				//setting the CURRENCY value
				var currency = ddnForm.addField({
					id : 'custom_currency',
					type : serverWidget.FieldType.SELECT,
					label:'Currency',
					container:'custom_detail_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});

				currency.addSelectOption({
					value : currencyId,
					text : currencyText,
					isSelected:true
				});

				//setting the TOTAL SETTLEMENT value
				ddnForm.addField({
					id : 'custom_total_settlements',
					type : serverWidget.FieldType.INTEGER,
					label:'Total Settlements',
					container:'custom_detail_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).defaultValue = (params.from == 'inv')?'':0;

				//setting the Disputed value
				ddnForm.addField({
					id : 'custom_itpm_ddn_disputed',
					type : serverWidget.FieldType.CHECKBOX,
					label:'DISPUTED?',
					container:'custom_detail_information'
				})

				//setting the OPEN BALANCE value
				ddnForm.addField({
					id : 'custom_itpm_ddn_openbal',
					type : serverWidget.FieldType.CURRENCY,
					label:'Open Balance',
					container:'custom_detail_information'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				}).defaultValue = invAmount - totalSettlements;

				//setting the AMOUNT
				var amountField = ddnForm.addField({
					id : 'custom_itpm_ddn_amount',
					type : serverWidget.FieldType.CURRENCY,
					label:'Amount',
					container:'custom_detail_information'
				});
				amountField.updateDisplayType({
					displayType : (params.from =='inv')?serverWidget.FieldDisplayType.DISABLED:serverWidget.FieldDisplayType.NORMAL
				}).defaultValue = invAmount;

				amountField.isMandatory = true;

				//setting the MEMO
				ddnForm.addField({
					id : 'custom_memo',
					type : serverWidget.FieldType.TEXT,
					label:'Memo',
					container:'custom_detail_information'
				});

				//setting the employees list to this select field
				var assignto = ddnForm.addField({
					id : 'custom_itpm_ddn_assignedto',
					type : serverWidget.FieldType.SELECT,
					label:'Assigned To',
					container:'custom_detail_information'
				}).updateBreakType({
					breakType : serverWidget.FieldBreakType.STARTCOL
				});

				assignto.isMandatory = true;
				getEmployees(subsid).run().each(function(e){
					assignto.addSelectOption({
						value :e.getValue('internalid'),
						text : e.getValue('entityid'),
						isSelected:currentUserId == e.getValue('internalid')
					});
					return true;
				});

				//setting the STATUS to open
				var status = ddnForm.addField({
					id : 'custom_status',
					type : serverWidget.FieldType.SELECT,
					label:'Status',
					container:'custom_detail_information'
				});
				status.updateDisplayType({
					displayType : serverWidget.FieldDisplayType.DISABLED
				});

				status.addSelectOption({
					value : 'A',
					text : 'Open',
					isSelected:true
				});

				//setting the DUE DATE/FOLLOW UP
				//setting the 2 week date from today
				var twoWeekDate = new Date(new Date().setDate(new Date().getDate()+14));
				var followupDate = ddnForm.addField({
					id : 'custom_itpm_ddn_nextaction',
					type : serverWidget.FieldType.DATE,
					label:'Due Date / Follow Up',
					container:'custom_detail_information'
				});
				followupDate.isMandatory = true;
				followupDate.defaultValue = format.format({
					value:twoWeekDate,
					type: format.Type.DATE
				});
				/*------- Detail info end --------*/  


				ddnForm.addSubmitButton({label:'Submit'});
				ddnForm.addButton({label:'Cancel',id : 'custom_itpm_cancelbtn',functionName:"redirectToBack"})
				ddnForm.clientScriptModulePath =  './iTPMDeduction_ToDeduction_Validations_cs_script.js';
				response.writePage(ddnForm);

			}else if(request.method == 'POST'){
				var originalno = params['custom_itpm_ddn_originalddn'],
				otherrefno = params['custom_itpm_ddn_otherrefcode'],
				invoiceno = params['custom_itpm_ddn_invoice'],
				invoiceLookup =  search.lookupFields({
					type: search.Type.INVOICE,
					id: invoiceno,
					columns: ['tranid']
				}),
				customerno = params['custom_customer'],
				parentno = params['custom_parent'],
				classno = params['custom_class'],
				deptno = params['custom_department'],
				locationno = params['custom_location'],
				subsidiaryno = params['custom_subsidiary'],
				currencyno = params['custom_currency'],
				assignto = params['custom_itpm_ddn_assignedto'],
				amount = params['custom_itpm_ddn_amount'].replace(/,/g,''),
				totalsettlement = params['custom_total_settlements'],
				disputed = params['custom_itpm_ddn_disputed'],
				openbal = params['custom_itpm_ddn_openbal'],
				followup = params['custom_itpm_ddn_nextaction'],
				memo = params['custom_memo'],
				status = params['custom_status'],
				defaultRecvAccnt = params['custom_def_accnt_recv'];

				var deductionRec = record.create({
					type:'customtransaction_itpm_deduction',
					isDynamic:true
				})

				if(params['custom_cfrom'] == 'ddn'){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_parentddn',
						value:params['custom_parent_recid'],
						ignoreFieldChange:true
					})
				}

				if(originalno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_originalddn',
						value:originalno,
						ignoreFieldChange:true
					})
				}
				if(otherrefno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_otherrefcode',
						value:otherrefno,
						ignoreFieldChange:true
					})
				}
				if(invoiceno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_invoice',
						value:invoiceno,
						ignoreFieldChange:true
					})
				}
				if(customerno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_customer',
						value:customerno,
						ignoreFieldChange:true
					})
				}
				if(parentno != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_custparent',
						value:parentno,
						ignoreFieldChange:true
					})
				}

				if(subsidiaryno != ''){
					deductionRec.setValue({
						fieldId:'subsidiary',
						value:subsidiaryno,
						ignoreFieldChange:true
					})
				}

				if(classno != ''){
					deductionRec.setValue({
						fieldId:'class',
						value:classno,
						ignoreFieldChange:true
					})
				}

				if(deptno != ''){
					deductionRec.setValue({
						fieldId:'location',
						value:locationno,
						ignoreFieldChange:true
					})
				}

				if(locationno != ''){
					deductionRec.setValue({
						fieldId:'department',
						value:deptno,
						ignoreFieldChange:true
					})
				}

				if(currencyno != ''){
					deductionRec.setValue({
						fieldId:'currency',
						value:currencyno,
						ignoreFieldChange:true
					})
				}

				if(assignto != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_assignedto',
						value:assignto,
						ignoreFieldChange:true
					})
				}

				if(amount != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_amount',
						value:amount,
						ignoreFieldChange:true
					}).setValue({
						fieldId:'custbody_itpm_ddn_openbal',
						value:amount,
						ignoreFieldChange:true
					})
				}

				if(totalsettlement != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_totsett',
						value:totalsettlement,
						ignoreFieldChange:true
					})
				}

				if(disputed != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_disputed',
						value:(disputed == "T")?true:false,
								ignoreFieldChange:true
					})
				}

				if(followup != ''){
					deductionRec.setValue({
						fieldId:'custbody_itpm_ddn_nextaction',
						value:new Date(followup),
						ignoreFieldChange:true
					})
				}


				if(status != ''){
					deductionRec.setValue({
						fieldId:'transtatus',
						value:status,
						ignoreFieldChange:true
					});
				}

				//getting the line value for the deduction
				var expenseId,defaultRecvAccnt,lineMemo,createdFrom = params['custom_cfrom'];
				if(createdFrom == 'inv'){
					var recieveableAccnts = search.create({
						type:search.Type.INVOICE,
						columns:['internalid','account.type','account.name','account.internalid'],
						filters:[['internalid','is',invoiceno],'and',['account.type','anyof',["AcctRec","Expense"]]]
					}),recievableAccntId;

					lineMemo = 'Deduction applied on Invoice #'+invoiceLookup.tranid;

					recieveableAccnts.run().each(function(e){
						if(e.getValue({name:'type',join:'account'}) == 'AcctRec')
							recievableAccntId = e.getValue({name:'internalid',join:'account'});
						return true
					})

					var configObj = config.load({
						type:config.Type.ACCOUNTING_PREFERENCES
					}),
					itpmPreferenceSearch = search.create({
						type:'customrecord_itpm_preferences',
						columns:['custrecord_itpm_pref_ddnaccount'],
						filters:[]
					}).run().getRange(0,1);

					expenseId = itpmPreferenceSearch[0].getValue('custrecord_itpm_pref_ddnaccount');

					if(defaultRecvAccnt == "-10"){
						defaultRecvAccnt = configObj.getValue('ARACCOUNT');	
						defaultRecvAccnt = (defaultRecvAccnt == '')?recievableAccntId:defaultRecvAccnt;
					}
				}else if(createdFrom == 'ddn'){
					var dedRec = record.load({
						type:'customtransaction_itpm_deduction',
						id:originalno
					}),lineCount = dedRec.getLineCount('line');
					for(var i = 0;i<lineCount;i++){
						lineMemo = 'Deduction split from Deduction #'+dedRec.getText({fieldId:'tranid'});
						if(i == 0)
							defaultRecvAccnt = dedRec.getSublistValue({sublistId:'line',fieldId:'account',line:i});
						else
							expenseId = dedRec.getSublistValue({sublistId:'line',fieldId:'account',line:i});
					}
				}

				//adding the memo value in deduction record
				deductionRec.setValue({
					fieldId:'memo',
					value:(memo!='')?memo:lineMemo,
							ignoreFieldChange:true
				})


				var receivbaleAccntsList = [{accountId:defaultRecvAccnt,amount:amount,fid:'credit',memo:lineMemo},{accountId:expenseId,amount:amount,fid:'debit',memo:lineMemo}];
				log.debug('receivableAccntsList',receivbaleAccntsList)
				receivbaleAccntsList.forEach(function(e){
					deductionRec.selectNewLine({sublistId: 'line'});
					deductionRec.setCurrentSublistValue({
						sublistId:'line',
						fieldId:'account',
						value:e.accountId
					}).setCurrentSublistValue({
						sublistId:'line',
						fieldId:e.fid,
						value:e.amount
					}).setCurrentSublistValue({
						sublistId:'line',
						fieldId:'memo',
						value:e.memo
					}).setCurrentSublistValue({
						sublistId:'line',
						fieldId:'entity',
						value:customerno
					}).commitLine({
						sublistId: 'line'
					});

				});


				var deductionId = deductionRec.save({enableSourcing:false,ignoreMandatoryFields:true});

				//when a deduction is created from invoice then the invoice is converted into payment fulfillment
				if(params['custom_cfrom'] == 'inv'){
					var deductionCreatedRec = record.load({type:'customtransaction_itpm_deduction',id:deductionId}),
					invId = params['custom_itpm_ddn_invoice'],
					invTransformRec = record.transform({
						fromType: record.Type.INVOICE,
						fromId: invId,
						toType: record.Type.CUSTOMER_PAYMENT
					}),
					transFormRecLineCount = invTransformRec.getLineCount('credit');

					invTransformRec.setValue({
						fieldId:'class',
						value:classno
					}).setValue({
						fieldId:'location',
						value:locationno
					}).setValue({
						fieldId:'department',
						value:deptno
					}).setValue({
						fieldId:'memo',
						value:'Deduction '+deductionCreatedRec.getValue('tranid')+' applied to Invoice '+invoiceLookup.tranid
					});
					
					deductionId = deductionCreatedRec.setValue({
						fieldId:'custbody_itpm_ddn_originalddn',
						value:deductionId
					}).save({enableSourcing:false,ignoreMandatoryFields:true});
					

					for(var v =0; v < transFormRecLineCount;v++){
						var ddId = invTransformRec.getSublistValue({
							sublistId: 'credit',
							fieldId: 'internalid',
							line: v
						});

						if(deductionId == ddId){
							invTransformRec.setSublistValue({
								sublistId: 'credit',
								fieldId: 'apply',
								line: v,
								value: true
							});
							var lastId =invTransformRec.save({
								enableSourcing: false,
								ignoreMandatoryFields: true
							});
							log.debug('invTransformRecId ',lastId );
						}
					}
				}
				
				redirect.toRecord({
					id : deductionId,
					type : 'customtransaction_itpm_deduction', 
					isEditMode:false
				});
			}
		}catch(e){
			
			if(e.message == 'invoice'){
				throw Error('you cannot make a deduction from this invoice');
			}else if(e.message == 'deduction'){
				throw Error('you cannot make a deduction from this deduction');
			}else if(e.message == 'invalid'){
				throw Error('invalid parameters');
			}else{
				log.error('exception in deduction creation',e.message);
			}
		}
	}

    //getting the Class,Department and Location list based on subsidiary.
    function getList(subid,rectype){
    	switch(rectype){
    	case 'class':
    		rectype = search.Type.CLASSIFICATION;
    		break;
    	case 'dept':
    		rectype = search.Type.DEPARTMENT;
    		break;
    	case 'location':
    		rectype = search.Type.LOCATION;
    		break;
    	}
    	
    	return search.create({
    		type:rectype,
    		columns:['internalid','name'],
    		filters:[['isinactive','is',false],'and',['subsidiary','is',subid]]
    	});
    }
    
    //getting the Employees list based on subsidiary.
    function getEmployees(subid){
    	return search.create({
    		type:search.Type.EMPLOYEE,
    		columns:['internalid','entityid'],
    		filters:[['isinactive','is',false],'and',['subsidiary','is',subid]]
    	});
    }
    
    
    //check id is equal to deduction or invoice
    function checkWhetherIdValidOrNot(id,from){
    	try{
    		var loadedRec;
    		if(from == 'inv'){
    			loadedRec = record.load({
    				type:record.Type.INVOICE,
    				id:id
    			});

    			var invConditionsMet = search.create({
    				type:search.Type.INVOICE,
    				columns:['internalid'],
    				filters:[
    				         ['internalid','is',id],'and',
    				         ['applyingtransaction','noneof','none'],'and',
    				         ['applyingtransaction.type','anyof','CustPymt'],'and',
    				         ['mainline','is','T'],'and',
    				         ['status','noneof','CustInvc:B']
    				         ] 
    			}).run().getRange(0,5).length>0;

    			//invoice dont have any ITPM DEDUCTION records
    			var invoiceDeductionsAreEmpty = search.create({
    				type:'customtransaction_itpm_deduction',
    				columns:['internalid'],
    				filters:[['custbody_itpm_ddn_invoice','is',id],'and',
    				         ['status','anyof',["Custom100:A","Custom100:B"]]]
    			}).run().getRange(0,5).length == 0;

    			if(invConditionsMet && invoiceDeductionsAreEmpty)
    				return {success:true}
    			else
    				return {success:false,errormessage:'invoice'}

    		}else if(from == 'ddn'){
    			
    			loadedRec = record.load({
    				type:'customtransaction_itpm_deduction',
    				id:id
    			});
    			return (loadedRec.getValue('transtatus') == 'A')?{success:true}:{success:false,errormessage:'deduction'};

    		}
    		return {success:true}   		
    	}catch(e){
    		return {success:false,errormessage:'invalid'}
    	}
    }
    
    return {
        onRequest: onRequest
    };
    
});
