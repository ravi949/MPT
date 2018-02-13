/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Front-end suitelet script for creating and editing iTPM Deduction records.
 */
define(['N/ui/serverWidget',
		'N/record',
		'N/search',
		'N/runtime',
		'N/redirect',
		'N/config',
		'N/format',
		'./iTPM_Module.js'],

function(serverWidget,record,search,runtime,redirect,config,format,itpm) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
	var subsidiariesEnabled = itpm.subsidiariesEnabled();
	var currenciesEnabled = itpm.currenciesEnabled();
	var locationsEnabled = itpm.locationsEnabled();
	var classesEnabled = itpm.classesEnabled();
	var departmentsEnabled = itpm.departmentsEnabled();
	
	function onRequest(context) {
		try{
			var request = context.request,response = context.response,params = request.parameters;		
			
			//validation on passed id
			var userEventType = (request.method == 'GET')?params.type:params['custom_itpm_usereventype'];
			params.fid = (request.method == 'GET')?params.fid:params['custom_itpm_ddn_invoice'].replace(/\u0005/g,',').split(",")[0];
			params.from = (request.method == 'GET')?params.from:params['custom_itpm_ddn_createdfrom'];
			params.fid = (request.method == 'POST' && params.from == 'ddn')?params['custom_itpm_ddn_parentrecid']:params.fid;
			if(userEventType == 'create'){
				var statusObj = checkWhetherIdValidOrNot(params.fid,params.from);
				if(!statusObj.success){
					throw Error(statusObj.errormessage);
				}
			}
			
			if(request.method == 'GET'){
				createDeductionForm(request,response,params);
			}else if(request.method == 'POST'){
				submitDeductionForm(request,response,params);
			}
		}catch(e){
			var recType = (params.from == 'inv')?'Invoice':'iTPM Deduction';
			var eventType = (params.type != 'edit')?'create':'edit';
			log.error(e.name,'record type = '+recType+', record id='+params.fid+', event type = '+eventType+' message='+e);
			throw Error(e.message);
		}
	}
	
	
    /**
     * @param id record id
     * @param from created from (invoice or deduction)
     * @returns {Object} error
     * @description checking for the id valid or not
     */
    function checkWhetherIdValidOrNot(id,from){
    	try{
    		var loadedRec;
    		//Deduction record type id
			var ddnRecTypeId = runtime.getCurrentScript().getParameter('custscript_itpm_ddn_createedit_rectypeid');
			log.debug('from',from);
    		if(from == 'inv'){
    			log.debug('inv',from);
    			loadedRec = record.load({
    				type:record.Type.INVOICE,
    				id:id
    			});

    			var invStatus = loadedRec.getValue('status');
    			
    			//invoice dont have any ITPM DEDUCTION records
    			var invoiceDeductionsAreEmpty = search.create({
    				type:'customtransaction_itpm_deduction',
    				columns:['internalid'],
    				filters:[
    					['custbody_itpm_ddn_invoice','anyof',id],'and',
    					['status','anyof',["Custom"+ddnRecTypeId+":A","Custom"+ddnRecTypeId+":B"]]
    				]
    			}).run().getRange(0,5).length == 0;

    			if (invStatus != 'Paid In Full' && invoiceDeductionsAreEmpty){
    				return {success:true};
    			} else {
    				throw {
    					name: 'checkWhetherIdValidOrNot',
    					message: 'Invoice conditions not met, OR, Invoice Deductions not empty.'
    				};
    			}
    		} else if(from == 'ddn'){
    			log.debug('ddn',from);
    			loadedRec = record.load({
    				type:'customtransaction_itpm_deduction',
    				id:id
    			});
    			if (loadedRec.getValue('transtatus') == 'A') {
    				return {success:true};
    			} else {
    				throw {
    					name: 'checkWhetherIdValidOrNot', 
    					message: 'Deduction status not OPEN.'
    				};
    			}
    		}else if(from == 'creditmemo'){
    			log.debug('cre',from);
    			//deduction should not be applied to any deduction
    			var itpmAppliedTo = search.lookupFields({
    				type:search.Type.TRANSACTION,
    				id:id,
    				columns:['custbody_itpm_appliedto']
    			})['custbody_itpm_appliedto'][0]['value'];
    			
    			//searching for exists deduction which is not Open,Pending and Resolved
    			var ddnStatus = true;
    			if(itpmAppliedTo != ""){
    				ddnStatus = search.lookupFields({
    					type:'customtransaction_itpm_deduction',
    					id:itpmAppliedTo,
    					columns:['internalid','status']
    				})['status'][0].value;
    				ddnStatus = (ddnStatus != 'statusA' && ddnStatus != 'statusB' && ddnStatus != 'statusC');
    			}
    			log.debug('itpmAppliedTo',itpmAppliedTo == "");
    			log.debug('ddnStatus',ddnStatus);
    			if(ddnStatus){
    				return {success:true};
    			}else{
    				throw {
    					name: 'checkWhetherIdValidOrNot', 
    					message: 'Credit Memo already applied to a deduction.'
    				};
    			}
    		}
    		// if neither of the IF statement clauses are satisfied
    		throw {
				name: 'checkWhetherIdValidOrNot', 
				message: 'Could not find required parameter FROM in request.'
			};
    	}catch(e){
    		return {success:false,errormessage:e.message}
    	}
    }
    
    
    /**
     * @param request 
     * @param response
     * @param params
     */
    function createDeductionForm(request, response, params){
    	
		var invAmount = 0;
    	var totalSettlements = 0;
		var tranIds = [];
		var customerId,customerEntity;
		var originalDddno;
		var recObj;
		
		//load the record object according to the record type
		switch(params.from){
		case 'inv':
			recObj = record.load({
    			type:record.Type.INVOICE,
    			id:params.fid
    		});
    		customerId = recObj.getValue('entity');
    		customerEntity = recObj.getText('entity');

    		if(params.multi == 'yes'){
    			//total amount calculation for single Deduction on multiple Invoices
    			var tranIds = [];
    			multiInvoicesList(params.fid).each(function(result){
    				tranIds.push(result.getValue({name: "internalid", join: "appliedToTransaction"}));
    				invAmount += parseFloat(result.getValue({name: "amountremaining", join: "appliedToTransaction"}));
    				return true;
    			});
    			invAmount = invAmount.toFixed(2);
    		}else{
    			tranIds = recObj.id;
    			invAmount = recObj.getValue('amountremainingtotalbox');
    		}
    		break;
		case 'ddn':
			recObj = record.load({
    			type:'customtransaction_itpm_deduction',
    			id:params.fid
    		});

    		//taking the values from the parent deduction record.
    		originalDddno = recObj.getValue('custbody_itpm_ddn_originalddn');
    		var deductnNo = recObj.getValue('tranid');
    		tranIds = recObj.getValue('custbody_itpm_ddn_invoice');
    		customerId = recObj.getValue('custbody_itpm_customer');  //Conflict resolved
    		customerEntity = recObj.getText('custbody_itpm_customer');  //Conflict resolved 
    		invAmount = recObj.getValue('custbody_itpm_ddn_openbal');  //Conflict resolved
    		break;
		case 'creditmemo':
			recObj = record.load({
    			type:record.Type.CREDIT_MEMO,
    			id:params.fid
    		});
    		customerId = recObj.getValue('entity');
    		customerEntity = recObj.getText('entity');
    		invAmount = recObj.getValue('total');
    		tranIds = recObj.id;
			break;
		}

    	//reading the values same intenralid values from the deduciton or invoice record.
    	if (subsidiariesEnabled) var subsid = recObj.getValue('subsidiary');

    	var currentUserId = (params.type == 'edit')?recObj.getValue('custbody_itpm_ddn_assignedto'):runtime.getCurrentUser().id;
    	var customerRec = record.load({
    		type:record.Type.CUSTOMER,
    		id:customerId
    	});
    	var defaultRecvAccnt = customerRec.getValue('receivablesaccount');
    	var customerParentId = customerRec.getValue('parent');

    	//Deduction form creation
    	var ddnForm = serverWidget.createForm({
    		title: '- ITPM Deduction'
    	});

    	/*-------------------Set the Parent Deduction value----------*/
    	ddnForm.addField({
    		id : 'custom_itpm_ddn_parentrecid',
    		type : serverWidget.FieldType.INTEGER,
    		label:'Parent Record id'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.HIDDEN
    	}).defaultValue = (params.type != 'edit')?params.fid:recObj.id;  

    	ddnForm.addField({
    		id : 'custom_itpm_ddn_createdfrom', // custom_cfrom
    		type : serverWidget.FieldType.TEXT,
    		label:'Created From'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.HIDDEN
    	}).defaultValue = params.from;

    	//Added for multi Invoice Deduction
    	ddnForm.addField({
    		id : 'custom_itpm_ddn_multiinv', //custom_itpm_ddn_multiinv
    		type : serverWidget.FieldType.TEXT,
    		label:'Multi'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.HIDDEN
    	}).defaultValue = params.multi;

    	ddnForm.addField({
    		id : 'custom_itpm_usereventype',
    		type : serverWidget.FieldType.TEXT,
    		label:'Record Event Type'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.HIDDEN
    	}).defaultValue = params.type;  
    	/*-----------------------------end--------------------------*/

    	/*--------------Default Account Recivable------------------*/
    	ddnForm.addField({
    		id : 'custom_itpm_ddn_defaultrecvaccnt',
    		type : serverWidget.FieldType.TEXT,
    		label:'Date'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.HIDDEN
    	}).defaultValue = defaultRecvAccnt
    	/*-------------------------End-------------------------------*/


    	/*------PRIMARY INFORMATION start-----*/

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
    	}).defaultValue = (params.type == 'create')?"To Be Generated":recObj.getValue('tranid');

    	//setting the INVOICE Value
    	var invoice = ddnForm.addField({
    		id : 'custom_itpm_ddn_invoice',
    		type : serverWidget.FieldType.MULTISELECT,  //Added new line of code as changed from SELECT to MULTISELECT 9/22
    		label:'Invoice',
    		source: 'invoice',
    		container:'custom_primry_information'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.DISABLED
    	}).defaultValue = tranIds;

    	//setting the ORIGINAL NUMBER value
    	var originnoField = ddnForm.addField({
    		id : 'custom_itpm_ddn_originalddn',
    		type : serverWidget.FieldType.SELECT,
    		label:'ORIGINAL DEDUCTION',
    		container:'custom_primry_information'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.DISABLED
    	});

    	if(originalDddno){
    		originnoField.addSelectOption({
    			value:recObj.getValue('custbody_itpm_ddn_originalddn'),
    			text:recObj.getText('custbody_itpm_ddn_originalddn')
    		});
    	}

    	//parent deduciton field
    	var parentDDNField = ddnForm.addField({
    		id : 'custom_itpm_ddn_parentddn',
    		type : serverWidget.FieldType.SELECT,
    		label:'Parent DEDUCTION',
    		container:'custom_primry_information'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.DISABLED
    	});

    	//setting the OTHER REFERENCE CODE value
    	ddnForm.addField({
    		id : 'custom_itpm_ddn_otherrefcode',
    		type : serverWidget.FieldType.TEXT,
    		label:'OTHER REFERENCE CODE',
    		container:'custom_primry_information'
    	}).defaultValue = (params.type == 'edit')?recObj.getValue('custbody_itpm_otherrefcode'):'';


    	if(customerParentId != ''){
    		//setting the parent value from the customer
    		ddnForm.addField({
    			id : 'custom_itpm_ddn_parentcustomer',
    			type : serverWidget.FieldType.SELECT,
    			label:'Parent',
    			container:'custom_primry_information'
    		}).updateDisplayType({
    			displayType : serverWidget.FieldDisplayType.HIDDEN
    		}).addSelectOption({
    			value : customerParentId,
    			text : customerRec.getText('parent'),
    			isSelected:true
    		});
    	}	

    	//setting the todate
    	var trandateField = ddnForm.addField({
    		id : 'custom_itpm_ddn_trandate',
    		type : serverWidget.FieldType.DATE,
    		label:'Date',
    		container:'custom_primry_information'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.NORMAL
    	}).updateBreakType({
    		breakType : serverWidget.FieldBreakType.STARTCOL
    	});
    	trandateField.isMandatory = true;
    	trandateField.defaultValue = format.format({
    		value:(params.type == 'edit')?recObj.getValue('trandate'):new Date(),
    		type: format.Type.DATE
    	});

    	//setting the STATUS to open
    	var status = ddnForm.addField({
    		id : 'custom_itpm_ddn_status',
    		type : serverWidget.FieldType.SELECT,
    		label:'Status',
    		container:'custom_primry_information'
    	});
    	status.updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.DISABLED
    	});

    	status.addSelectOption({
    		value : (params.type == 'create')?'A':recObj.getValue('transtatus'),
    		text : (params.type == 'create')?'Open':recObj.getText('transtatus'),
    		isSelected:true
    	});


    	//setting the CUSTOMER Value
    	ddnForm.addField({
    		id : 'custom_itpm_ddn_customer',
    		type : serverWidget.FieldType.SELECT,
    		label:'Customer',
    		container:'custom_primry_information'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.DISABLED
    	}).addSelectOption({
    		text:customerEntity,
    		value:customerId,
    		isSelected:true
    	});

    	//setting the Disputed value
    	ddnForm.addField({
    		id : 'custom_itpm_ddn_disputed',
    		type : serverWidget.FieldType.CHECKBOX,
    		label:'DISPUTED?',
    		container:'custom_primry_information'
    	}).updateBreakType({
    		breakType : serverWidget.FieldBreakType.STARTCOL
    	}).defaultValue = (params.type == 'create')?'F':recObj.getValue('custbody_itpm_ddn_disputed')?'T':'F';

    	//iTPM Applied To Transaction field 				
    	var aplydToTrans = ddnForm.addField({
    		id : 'custom_itpm_ddn_appliedto',
    		type : serverWidget.FieldType.SELECT,
    		label:'APPLIED TO TRANSACTION',
    		container:'custom_primry_information'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.DISABLED
    	});

    	//If deduction is edited then we are setting the parent and apply to deduction values
    	if(params.from == 'ddn'){
    			var itpmAppliedTo = recObj.getValue('custbody_itpm_appliedto');
    			itpmAppliedTo = (params.type == 'edit')?itpmAppliedTo:'create';
    			if(itpmAppliedTo){
        			var selectionObj = {
            				value:(itpmAppliedTo != 'create')?recObj.getValue('custbody_itpm_appliedto'):params.fid,
            				text:(itpmAppliedTo != 'create')?recObj.getText('custbody_itpm_appliedto'):'- iTPM Deduction #'+recObj.getText('tranid')
            		};
            		aplydToTrans.addSelectOption(selectionObj);
            		parentDDNField.addSelectOption(selectionObj);
    			}
    	}
    	/*-----PRIMARY INFORMATION end-----*/

    	/*------CLASSIFICATION start ------*/
    	ddnForm.addFieldGroup({
    		id : 'custom_classification',
    		label : 'Classification'
    	});

    	//if subsidiary feature in effect
    	if(subsidiariesEnabled){
    		//setting the SUBSIDIARY Value
    		ddnForm.addField({
    			id : 'custom_subsidiary',
    			type : serverWidget.FieldType.SELECT,
    			label:'Subsidiary',
    			container:'custom_classification'
    		}).updateDisplayType({
    			displayType : serverWidget.FieldDisplayType.DISABLED
    		}).addSelectOption({
    			value : subsid,
    			text : recObj.getText('subsidiary'),
    			isSelected:true
    		});
    	}

    	//if multicurrnecy feature in effect
    	if(currenciesEnabled){
    		//setting the CURRENCY value
    		ddnForm.addField({
    			id : 'custom_currency',
    			type : serverWidget.FieldType.SELECT,
    			label:'Currency',
    			container:'custom_classification'
    		}).updateDisplayType({
    			displayType : serverWidget.FieldDisplayType.DISABLED
    		}).addSelectOption({
    			value : recObj.getValue('currency'),
    			text : recObj.getText('currency'),
    			isSelected:true
    		});
    	}	
    	
    	//if departments feature in effect
    	if (departmentsEnabled){
    		//setting the DEPARTMENT value
    		var dept = ddnForm.addField({
    			id : 'custom_itpm_ddn_department',
    			type : serverWidget.FieldType.SELECT,
    			label:'Department',
    			container:'custom_classification'
    		}).updateBreakType({
    			breakType : serverWidget.FieldBreakType.STARTCOL
    		});

    		dept.addSelectOption({
    			value:' ',
    			text:' '
    		});

    		itpm.getClassifications(subsid, 'dept', subsidiariesEnabled).forEach(function(e){
    			dept.addSelectOption({
    				value:e.id,
    				text:e.name,
    				isSelected:(recObj.getValue('department') == e.id)
    			});
    			return true;
    		});
    	}

    	//if class feature in effect
    	if (classesEnabled){
    		//setting the CLASS value
    		var classField = ddnForm.addField({
    			id : 'custom_itpm_ddn_class',
    			type : serverWidget.FieldType.SELECT,
    			label:'Class',
    			container:'custom_classification'
    		}).updateBreakType({
    			breakType : serverWidget.FieldBreakType.STARTCOL
    		});

    		classField.addSelectOption({
    			value :' ',
    			text : ' '
    		});

    		itpm.getClassifications(subsid, 'class', subsidiariesEnabled).forEach(function(e){
    			classField.addSelectOption({
    				value :e.id,
    				text : e.name,
    				isSelected:(recObj.getValue('class') == e.id)
    			});
    			return true;
    		});
    	}
    	
    	//if location feature in effect
    	if (locationsEnabled){
    		//setting the LOCATION value
    		var location = ddnForm.addField({
    			id : 'custom_itpm_ddn_location',
    			type : serverWidget.FieldType.SELECT,
    			label:'Location',
    			container:'custom_classification'
    		}).updateBreakType({
    			breakType : serverWidget.FieldBreakType.STARTCOL
    		});

    		location.addSelectOption({
    			value:' ',
    			text:' '
    		});

    		itpm.getClassifications(subsid, 'location', subsidiariesEnabled).forEach(function(e){
    			location.addSelectOption({
    				value:e.id,
    				text:e.name,
    				isSelected:(recObj.getValue('location') == e.id)
    			});
    			return true;
    		});
    	}
    	/*------CLASSIFICATION end --------*/

    	/*------- TASK DETAIL start --------*/

    	ddnForm.addFieldGroup({
    		id : 'custom_itpm_ddn_taskdetails',
    		label : 'Task Detail'
    	});

    	//setting the employees list to this select field
    	var assignto = ddnForm.addField({
    		id : 'custom_itpm_ddn_assignedto',
    		type : serverWidget.FieldType.SELECT,
    		label:'Assigned To',
    		container:'custom_itpm_ddn_taskdetails'
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

    	//setting the DUE DATE/FOLLOW UP
    	//setting the 2 week date from today
    	var followupDate = ddnForm.addField({
    		id : 'custom_itpm_ddn_nextaction',
    		type : serverWidget.FieldType.DATE,
    		label:'Due Date',
    		container:'custom_itpm_ddn_taskdetails'
    	}).updateBreakType({
    		breakType : serverWidget.FieldBreakType.STARTCOL
    	});
    	followupDate.isMandatory = true;
    	followupDate.defaultValue = format.format({
    		value:(params.type == 'edit')?recObj.getValue('custbody_itpm_ddn_nextaction'):(new Date(new Date().setDate(new Date().getDate()+14))),
    		type: format.Type.DATE
    	});

    	//setting the MEMO
    	ddnForm.addField({
    		id : 'custom_itpm_ddn_memo',
    		type : serverWidget.FieldType.TEXT,
    		label:'Memo',
    		container:'custom_itpm_ddn_taskdetails'
    	}).updateBreakType({
    		breakType : serverWidget.FieldBreakType.STARTCOL
    	}).defaultValue = (params.type == 'create')?' ':recObj.getValue('memo');

    	/*------- TASK DETAIL End --------*/

    	/*------- TRANSACTION DETAIL start --------*/

    	ddnForm.addFieldGroup({
    		id : 'custom_itpm_ddn_transdetails',
    		label : 'Transaction Detail'
    	});

    	//setting the AMOUNT
    	var amountField = ddnForm.addField({
    		id : 'custom_itpm_ddn_amount',
    		type : serverWidget.FieldType.CURRENCY,
    		label:'Amount',
    		container:'custom_itpm_ddn_transdetails'
    	});
    	amountField.updateDisplayType({
    		displayType : (params.from != 'ddn' ||params.type == 'edit')?serverWidget.FieldDisplayType.DISABLED:serverWidget.FieldDisplayType.NORMAL
    	}).defaultValue = (params.type != 'edit')?invAmount:recObj.getValue('custbody_itpm_amount');

    	amountField.isMandatory = true;

    	//setting the TOTAL SETTLEMENT value
    	ddnForm.addField({
    		id : 'custom_itpm_ddn_totalsettlements',
    		type : serverWidget.FieldType.INTEGER,
    		label:'Total Settlements',
    		container:'custom_itpm_ddn_transdetails'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.DISABLED
    	}).defaultValue = (params.type == 'create')? totalSettlements : recObj.getValue('custbody_itpm_ddn_totsett');				

    	//setting the OPEN BALANCE value
    	ddnForm.addField({
    		id : 'custom_itpm_ddn_openbal',
    		type : serverWidget.FieldType.CURRENCY,
    		label:'Open Balance',
    		container:'custom_itpm_ddn_transdetails'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.DISABLED
    	}).updateBreakType({
    		breakType : serverWidget.FieldBreakType.STARTCOL
    	}).defaultValue = invAmount - totalSettlements;

    	//setting the TOTAL EXPENSES value
    	ddnForm.addField({
    		id : 'custom_itpm_ddn_totalexpense',
    		type : serverWidget.FieldType.CURRENCY,
    		label:'TOTAL EXPENSES',
    		container:'custom_itpm_ddn_transdetails'
    	}).updateDisplayType({
    		displayType : serverWidget.FieldDisplayType.DISABLED
    	}).defaultValue = (params.type == 'create')? 0 : recObj.getValue('custbody_itpm_ddn_totexp');;
    	/*------- TRANSACTION DETAIL End --------*/

    	ddnForm.addSubmitButton({label:'Submit'});
    	ddnForm.addButton({label:'Cancel',id : 'custom_itpm_cancelbtn',functionName:"redirectToBack"});
    	ddnForm.clientScriptModulePath =  './iTPM_Attach_Deduction_ClientMethods.js';
    	//ddnForm.clientScriptFileId = runtime.getCurrentScript().getParameter({name:'custscript_itpm_su_ddn_csfileid'});
    	response.writePage(ddnForm);
    }

    
	/**
	 * @param subid
	 * @returns {search} search object
	 * @description getting the Employees list based on subsidiary.
	 */
    function getEmployees(subid){
    	var filters = [['isinactive','is',false]];
    	if (subid){
    		filters.push('and');
    		filters.push(['subsidiary','anyof',subid]);
    	}
    	return search.create({
    		type:search.Type.EMPLOYEE,
    		columns:['internalid','entityid'],
    		filters: filters
    	});
    }
    
    
    /**
     * @param request 
     * @param response
     * @param params
     */
    function submitDeductionForm(request, response, params){
    	log.debug('request',request);
		var originalno = params['custom_itpm_ddn_originalddn'];
		var otherrefno = params['custom_itpm_ddn_otherrefcode'];
		var invoiceno = params['custom_itpm_ddn_invoice'].replace(/\u0005/g,',').split(",");
		var createdFrom = params['custom_itpm_ddn_createdfrom'];
		var userEventType = params['custom_itpm_usereventype'];
		var trandate = format.parse({ value:params['custom_itpm_ddn_trandate'], type: format.Type.DATE });
		var deductionId;
		var invoiceLookup = '';
		log.debug('createdFrom',createdFrom);
		log.debug('invoiceno',invoiceno);
		log.debug('trandate',typeof trandate);
		

		//Fetching tranid's for multiple invoices to set the memo
		if(userEventType == 'create' && createdFrom != 'ddn'){
			var transIdsLength = invoiceno.length;
			var invoiceLookups;
			for(var i = 0; i < transIdsLength; i++){
				invoiceLookups = search.lookupFields({
					type: search.Type.TRANSACTION,
					id: invoiceno[i],
					columns: ['tranid']
				});
				invoiceLookup = invoiceLookup+invoiceLookups.tranid+' ';
			}
		}
			
		customerno = params['custom_itpm_ddn_customer'];
		parentno = params['custom_itpm_ddn_parentcustomer'];
		classno = params['custom_itpm_ddn_class'];
		deptno = params['custom_itpm_ddn_department'];
		locationno = params['custom_itpm_ddn_location'];
		assignto = params['custom_itpm_ddn_assignedto'];
		amount = params['custom_itpm_ddn_amount'].replace(/,/g,'');
		totalsettlement = params['custom_itpm_ddn_totalsettlements'];
		disputed = params['custom_itpm_ddn_disputed'];
		openbal = params['custom_itpm_ddn_openbal'];
		followup = params['custom_itpm_ddn_nextaction'];
		memo = params['custom_itpm_ddn_memo'];
		status = params['custom_itpm_ddn_status'];
		defaultRecvAccnt = params['custom_itpm_ddn_defaultrecvaccnt'];
		deductionRec = null;

		if(userEventType == 'create'){
			deductionRec = record.create({
				type:'customtransaction_itpm_deduction',
				isDynamic:true
			});
		}else{
			deductionRec = record.load({
				type:'customtransaction_itpm_deduction',
				id:params['custom_itpm_ddn_parentrecid'],
				isDynamic:true
			});
		}
		
		if(userEventType == 'create'){
			deductionRec.setValue({
				fieldId:'custbody_itpm_ddn_openbal',
				value:amount,
				ignoreFieldChange:true
			});

			if(createdFrom == 'ddn'){
				deductionRec.setValue({
					fieldId:'custbody_itpm_ddn_parentddn',
					value:params['custom_itpm_ddn_parentrecid'],
					ignoreFieldChange:true
				}).setValue({
					fieldId:'custbody_itpm_appliedto',
					value:params['custom_itpm_ddn_parentrecid'],
					ignoreFieldChange:true
				});
			}
		}
		
		//create or edit it will set the body field values
		deductionRec.setValue({
			fieldId:'custbody_itpm_otherrefcode',
			value:otherrefno,
			ignoreFieldChange:true
		}).setValue({
			fieldId:'memo',
			value:memo,
			ignoreFieldChange:true
		}).setValue({
			fieldId:'custbody_itpm_amount',
			value:amount,
			ignoreFieldChange:true
		}).setValue({
			fieldId:'custbody_itpm_ddn_disputed',
			value:(disputed == "T")?true:false,
			ignoreFieldChange:true
		}).setValue({
			fieldId:'custbody_itpm_ddn_invoice',
			value:invoiceno,
			ignoreFieldChange:true
		}).setValue({
			fieldId:'custbody_itpm_customer',
			value:customerno,
			ignoreFieldChange:true
		}).setValue({
			fieldId:'transtatus',
			value:status,
			ignoreFieldChange:true
		}).setValue({
			fieldId:'trandate',
			value:trandate
		});
		
		
		if(originalno != ''){
			deductionRec.setValue({
				fieldId:'custbody_itpm_ddn_originalddn',
				value:originalno,
				ignoreFieldChange:true
			});
		}
		
		if(parentno != ''){
			deductionRec.setValue({
				fieldId:'custbody_itpm_ddn_custparent',
				value:parentno,
				ignoreFieldChange:true
			});
		}
		
		if(subsidiariesEnabled){
			deductionRec.setValue({
				fieldId:'subsidiary',
				value:params['custom_subsidiary'],
				ignoreFieldChange:true
			});
		}
		
		if(currenciesEnabled){
			deductionRec.setValue({
				fieldId:'currency',
				value:params['custom_currency'],
				ignoreFieldChange:true
			});
		}

		if(classno != ''){
			deductionRec.setValue({
				fieldId:'class',
				value:classno,
				ignoreFieldChange:true
			});
		}

		if(locationno != ''){
			deductionRec.setValue({
				fieldId:'location',
				value:locationno,
				ignoreFieldChange:true
			});
		}

		if(deptno != ''){
			deductionRec.setValue({
				fieldId:'department',
				value:deptno,
				ignoreFieldChange:true
			});
		}

		if(assignto != ''){
			deductionRec.setValue({
				fieldId:'custbody_itpm_ddn_assignedto',
				value:assignto,
				ignoreFieldChange:true
			});
		}

		if(totalsettlement != ''){
			deductionRec.setValue({
				fieldId:'custbody_itpm_ddn_totsett',
				value:totalsettlement,
				ignoreFieldChange:true
			});
		}

		if(followup != ''){
			deductionRec.setValue({
				fieldId:'custbody_itpm_ddn_nextaction',
				value:new Date(followup),
				ignoreFieldChange:true
			});
		}

		//creating the array of lines for deduction record
		if(userEventType == 'create'){
			//getting the line value for the deduction
			var expenseId = (createdFrom != 'ddn')?itpm.getPrefrenceValues().dednExpAccnt:'';
			var lineMemo,receivbaleAccntsList = [];
			var removeCustFromSplit = (createdFrom == 'ddn' && itpm.getPrefrenceValues().removeCustomer);
			
			log.debug('expenseId',expenseId);
			
			if(createdFrom == 'inv'){   //If deduction creating from invoice

				var recievableAccntId = search.lookupFields({
					type:search.Type.INVOICE,
					id:params['custom_itpm_ddn_parentrecid'],
					columns:['internalid','account']
				})['account'][0].value; //Conflict resolved

				lineMemo = (params['custom_itpm_ddn_multiinv'] == 'yes')?('Deduction applied on Invoices '+invoiceLookup):('Deduction applied on Invoice #'+invoiceLookup);

				if(defaultRecvAccnt == "-10"){
					defaultRecvAccnt = config.load({
						type:config.Type.ACCOUNTING_PREFERENCES
					}).getValue('ARACCOUNT');
					defaultRecvAccnt = (defaultRecvAccnt == '')?recievableAccntId:defaultRecvAccnt;
				}
				receivbaleAccntsList = [{accountId:defaultRecvAccnt,amount:amount,fid:'credit',memo:lineMemo},{accountId:expenseId,amount:amount,fid:'debit',memo:lineMemo}];

			}else if(createdFrom == 'ddn'){   //If deduction creating from deduction split

				var dedRec = record.load({
					type:'customtransaction_itpm_deduction',
					id:(params['custom_itpm_ddn_parentddn'] == "")?originalno:params['custom_itpm_ddn_parentddn']
				});		
				lineMemo = 'Deduction split from Deduction #'+dedRec.getText({fieldId:'tranid'});
				expenseId = dedRec.getSublistValue({sublistId:'line',fieldId:'account',line:dedRec.getLineCount('line') - 1});
				receivbaleAccntsList = [{accountId:expenseId,amount:amount,fid:'credit',memo:lineMemo},{accountId:expenseId,amount:amount,fid:'debit',memo:lineMemo}];

			}else if(createdFrom == 'creditmemo'){   //If deduction creating from credit memo
			
				lineMemo = 'Deduction applied on CreditMemo '+invoiceLookup;
				search.create({
					type:search.Type.CREDIT_MEMO,	 //if you want to create search on custom record type, please use the internalid.
					columns:['account','debitamount','creditamount','taxline'],
					filters:[['internalid','is',invoiceno[0]],'and',
							 ['cogs','is',false],'and',
							 ['accounttype','noneof','AcctRec']]
				}).run().each(function(r){
					if(r.getValue('account') && (r.getValue('debitamount') > 0 || r.getValue('creditamount') > 0)){
						receivbaleAccntsList.push({
							accountId:r.getValue('account'),
							amount:(r.getValue('debitamount'))?r.getValue('debitamount'):r.getValue('creditamount'),
							fid:(r.getValue('debitamount'))?'credit':'debit',
							memo:lineMemo
						});
					}
					return true;
				});
				receivbaleAccntsList.push({accountId:expenseId,amount:amount,fid:'debit',memo:lineMemo});
				log.debug('receivbaleAccntsList',receivbaleAccntsList);
			}
			
			
			//adding the memo value in deduction record
			deductionRec.setValue({
				fieldId:'memo',
				value:(memo == ' ')?lineMemo:memo,
				ignoreFieldChange:true
			});

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
					value:(removeCustFromSplit)?'':customerno
				}).commitLine({
					sublistId: 'line'
				});
			});

			deductionId = deductionRec.save({enableSourcing:false,ignoreMandatoryFields:true});
			
			//Setting the deduction value into iTPM Applied To
			if(createdFrom == 'creditmemo'){
				record.submitFields({
					type:record.Type.CREDIT_MEMO,	 //if you want to submit record fields which is custom record type, please use the internalid.
					id:invoiceno[0],
					values:{
						"custbody_itpm_appliedto":deductionId
					},
					options:{
						enableSourcing: false,
						ignoreMandatoryFields : true
					}
				});
				//setting the original deduction field value
				var deductionCreatedRec = record.load({
					type: 'customtransaction_itpm_deduction',
					id  : deductionId
				});

				deductionId = deductionCreatedRec.setValue({
					fieldId:'custbody_itpm_ddn_originalddn',
					value:deductionId
				}).save({enableSourcing:false,ignoreMandatoryFields:true});
			}
			
			//creating the other deduction record when click the split
			if(deductionId && createdFrom == 'ddn'){
				var parentRec = record.load({type:'customtransaction_itpm_deduction',id:params['custom_itpm_ddn_parentrecid']});
				var parentDdnAmount = parseFloat(parentRec.getValue('custbody_itpm_ddn_openbal'));
				var newDdnAmount = parseFloat(amount);
				log.debug('openBalance',parentDdnAmount);
				log.debug('newDdnAmount',newDdnAmount);
				if(parentDdnAmount > newDdnAmount){
					itpm.createSplitDeduction(parentRec,{
						amount : (parentDdnAmount - newDdnAmount).toFixed(2),
						ddnExpenseId : expenseId,
						removeCustomer : removeCustFromSplit,
						memo : undefined,
						refCode : '',
						ddnDisputed : false
					});
				}

				//loading the parent record again why because parentDeductionRec already save 
				//thats why we are loading the record newly	
				parentRec.setValue({
					fieldId:'custbody_itpm_ddn_openbal',
					value:0 
				}).save({
					enableSourcing: false,
					ignoreMandatoryFields : true
				});
			}
			
			//when a deduction is created from invoice then the invoice is converted into payment fulfillment
			if(createdFrom == 'inv'){
				var multiInv = params['custom_itpm_ddn_multiinv'] == 'yes';
				var memo;
				var deductionCreatedRec = record.load({
					type: 'customtransaction_itpm_deduction',
					id  : deductionId
				});

				deductionId = deductionCreatedRec.setValue({
					fieldId:'custbody_itpm_ddn_originalddn',
					value:deductionId
				}).save({enableSourcing:false,ignoreMandatoryFields:true});

				if(multiInv){ //create customer payment for all invoices
					multiInvoicesList(invoiceno[0]).each(function(result){
						memo = 'Deduction '+deductionCreatedRec.getValue('tranid')+' applied to Invoice '+result.getValue({name: "internalid", join: "appliedToTransaction"});
						params['invoiceid'] = result.getValue({name: "internalid", join: "appliedToTransaction"});
						createCustomerPayment(params, memo, deductionId, multiInv); 
						return true;
					});
				}else{ //create customer payment for one invoice
					memo = 'Deduction '+deductionCreatedRec.getValue('tranid')+' applied to Invoice '+invoiceLookup;
					params['invoiceid'] = invoiceno[0];
					createCustomerPayment(params, memo, deductionId, multiInv); 
				}
			}
		}else{
			deductionId = deductionRec.save({enableSourcing:false,ignoreMandatoryFields:true});
		}
		
		redirect.toRecord({
			id : deductionId,
			type : 'customtransaction_itpm_deduction', 
			isEditMode:false
		});
    }

    /**
     * @param {String} result
     * @param {String} memo
     * @param {Number} deductionId
     * @param {Boolean} multiInv
     */
    function createCustomerPayment(params, memo, deductionId, multiInv){
    	log.debug('invoiceId',params['invoiceid']);
    	//Customer Payment process for each invoice
    	var invTransformRec = record.transform({
    		fromType: record.Type.INVOICE,
    		fromId: params['invoiceid'],
    		toType: record.Type.CUSTOMER_PAYMENT
    	});

    	var transFormRecLineCount = invTransformRec.getLineCount('credit');
    	
    	if(classesEnabled){
    		invTransformRec.setValue({
        		fieldId:'class',
        		value:params['custom_itpm_ddn_class']
        	});
    	}
    	
    	if(locationsEnabled){
    		invTransformRec.setValue({
        		fieldId:'location',
        		value:params['custom_itpm_ddn_location']
        	});
    	}
    	
    	if(departmentsEnabled){
    		invTransformRec.setValue({
        		fieldId:'department',
        		value:params['custom_itpm_ddn_department']
        	});
    	}
    	
    	invTransformRec.setValue({
    		fieldId:'memo',
    		value:memo
    	});

    	for(var v = 0; v < transFormRecLineCount;v++){
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

    			var lastId = invTransformRec.save({
    				enableSourcing: false,
    				ignoreMandatoryFields: true
    			});
    			//log.debug('invTransformRecId ',lastId );
    		}
    	}
    }
    
    
    /**
     * @param {String} invId
     * 
     * @return {Integer} count
     */
    function multiInvoicesList(invId){
    	try{
    		var custPayId;
        	//log.debug('invId', invId);
        	var invoiceSearchObj = search.create({
        		type: search.Type.INVOICE,
        		filters: [
        			["internalid","anyof",invId], 
        			"AND", 
        			["applyingtransaction","noneof","@NONE@"], 
        			"AND", 
        			["applyingtransaction.type","anyof","CustPymt"], 
        			"AND", 
        			["mainline","is","T"], 
        			"AND", 
        			["status","noneof","CustInvc:B"]
        			],
        		columns: [
        			search.createColumn({
        				name: "type",
        				join: "applyingTransaction"
        			}),
        			search.createColumn({
        				name: "trandate",
        				join: "applyingTransaction",
        				sort: search.Sort.DESC
        			}),
        			search.createColumn({
        				name: "internalid",
        				join: "applyingTransaction",
        				sort: search.Sort.DESC
        			})
        		]
        	});

        	invoiceSearchObj.run().each(function(result){
        		custPayId = result.getValue({name:'internalid', join:'applyingTransaction'});
        	});
        	//log.debug('custPayId', custPayId);
        	
        	var customerpaymentSearchObj = search.create({
        		type: "customerpayment",
        		filters: [
        			["type","anyof","CustPymt"], 
        			"AND", 
        			["internalid","anyof",custPayId], 
        			"AND", 
        			["mainline","is","F"],
        			"AND", 
        			["appliedtotransaction.status","anyof","CustInvc:A"]
        			],
        		columns: [
        			search.createColumn({
        				name: "internalid",
        				sort: search.Sort.ASC
        			}),
        			search.createColumn({
        				name: "type",
        				join: "appliedToTransaction"
        			}),
        			search.createColumn({
        				name: "trandate",
       					join: "appliedToTransaction"
       				}),
       				search.createColumn({
       					name: "internalid",
       					join: "appliedToTransaction"
       				}),
       				search.createColumn({
       					name: "amount",
       					join: "appliedToTransaction"
       				}),
       				search.createColumn({
       					name: "amountremaining",
       					join: "appliedToTransaction"
       				})
       			]
        	});

        	return customerpaymentSearchObj.run();
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }
    
    return {
        onRequest: onRequest
    }
    
});
