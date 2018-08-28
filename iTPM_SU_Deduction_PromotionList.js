/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Front-end suitelet script to get and return a list of eligible promotions upon which a new iTPM Settlement record can be created.
 */
define(['N/ui/serverWidget',
		'N/redirect',
		'N/search',
		'N/record',
		'N/url',
		'N/ui/message'
	],

	function(serverWidget,redirect,search,record,url,message) {

	/**
	 * Definition of the Suitelet script trigger point.
	 *
	 * @param {Object} context
	 * @param {ServerRequest} context.request - Encapsulation of the incoming request
	 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
	 * @Since 2015.2
	 */
	function onRequest(context){
		try{
			var request = context.request,response = context.response,params = request.parameters;

			if(request.method == 'GET'){
				
				//adding list to form
				var list = serverWidget.createList({
					title : 'Promotions List'
				});
				var listcolumn =  list.addColumn({
					id : 'custpage_itpm_id',
					type : serverWidget.FieldType.URL,
					label : 'Apply To'
				});
				list.addColumn({
					id : 'custpage_itpm_prmtitle',
					type : serverWidget.FieldType.TEXT,
					label : 'Promotion Title'
				});
				list.addColumn({
					id : 'custpage_itpm_otherrefcode',
					type : serverWidget.FieldType.TEXT,
					label : 'Other Ref Code'
				});
				list.addColumn({
					id : 'custpage_itpm_prmtype',
					type : serverWidget.FieldType.TEXT,
					label : ' Promotion Type'
				});
				list.addColumn({
					id : 'custpage_itpm_prmcondn',
					type : serverWidget.FieldType.TEXT,
					label : 'Condition'
				});
				list.addColumn({
					id : 'custpage_itpm_prmshipstdt',
					type : serverWidget.FieldType.TEXT,
					label : 'Ship Start Date'
				});
				list.addColumn({
					id : 'custpage_itpm_prmshipenddt',
					type : serverWidget.FieldType.TEXT,
					label : 'Ship End Date'
				});

				list.addButton({id:'custom_cancelbtn',label:'Cancel',functionName:'redirectToBack'});
				list.clientScriptModulePath = './iTPM_Attach_Settlement_ClientMethods.js';

				//search on deduction customer and another search on promotion/deal based on customer and other conditions
				var deductionRec = search.lookupFields({
					type:'customtransaction_itpm_deduction',
					id:params.ddn,
					columns:['custbody_itpm_customer']
				});
				//Create hierarchical promotions
				var iteratorVal = false;
				var custRange = 4;//Variable to limit the customer relations to a maximum of 4. 
				var CustId = deductionRec.custbody_itpm_customer[0].value;
				var custrecIds = [];
				custrecIds.push(CustId); 
				do{
					//loading the customer record to get the parent customer
					var customerRecord = record.load({
						type: record.Type.CUSTOMER,
						id: CustId
					});
					CustId = customerRecord.getValue('parent');
					if(CustId){ 
						iteratorVal = true;
						custrecIds.push(CustId);
					}
					else{
						iteratorVal = false;
					}
					custRange--;
				}while(iteratorVal && custRange > 0);
				var promoDealRecordSearch = search.create({
					type:'customrecord_itpm_promotiondeal',
					columns:['internalid',
						'name',
						'custrecord_itpm_p_status',
						'custrecord_itpm_p_condition',
						'custrecord_itpm_p_customer',
						'custrecord_itpm_p_netpromotionalle',
						'custrecord_itpm_p_type.custrecord_itpm_pt_validmop',
						'custrecord_itpm_p_otherrefcode',
						'custrecord_itpm_p_type',
						'custrecord_itpm_p_shipstart',
						'custrecord_itpm_p_shipend'
						],
						filters:[
							['custrecord_itpm_p_status','anyof', 3],'and', //approved
							['custrecord_itpm_promo_allocationcontrbtn','is',false],'and',
							[
								[['custrecord_itpm_p_type.custrecord_itpm_pt_settlewhenpromoactive','is','T'],'and',
									['custrecord_itpm_p_condition','anyof',2]],'or', //active if promotion type allow for settlement in active
									['custrecord_itpm_p_condition','anyof', 3]  //completed
								],'and',
								['custrecord_itpm_p_customer','anyof', custrecIds],'and',
								['custrecord_itpm_p_type.custrecord_itpm_pt_validmop','is',1],'and',  //mop is bill-back
								['isinactive','is',false]]	    		
				});

				if(promoDealRecordSearch.runPaged().count > 0){
					listcolumn.setURL({
						url : url.resolveScript({
							scriptId: 'customscript_itpm_set_createeditsuitelet',
							deploymentId: 'customdeploy_itpm_set_createeditsuitelet',
							returnExternalUrl: false
						})
					});
					listcolumn.addParamToURL({
						param : 'pid',
						value : 'custpage_itpm_id',
						dynamic:true
					});
					listcolumn.addParamToURL({
						param : 'type',
						value : 'create'
					});
					listcolumn.addParamToURL({
						param : 'ddn',
						value : params.ddn
					});
					listcolumn.addParamToURL({
						param : 'from',
						value : 'ddn'
					});
					promoDealRecordSearch.run().each(function(e){
						list.addRow({
							row :{	
								'custpage_itpm_id':e.getValue('internalid'),
								'custpage_itpm_prmtitle':e.getValue('name'),
								'custpage_itpm_otherrefcode':e.getValue('custrecord_itpm_p_otherrefcode'),
								'custpage_itpm_prmtype':e.getText('custrecord_itpm_p_type'),
								'custpage_itpm_prmcondn':e.getText('custrecord_itpm_p_condition'),
								'custpage_itpm_prmshipstdt':e.getValue('custrecord_itpm_p_shipstart'),
								'custpage_itpm_prmshipenddt':e.getValue('custrecord_itpm_p_shipend')
							}
						});
						return true;
					});
				}
				response.writePage(list); 
			}			
		}catch (e) {
			log.error(e.name,'record type = iTPM Deduction, record id='+params.ddn+', message = '+e.message);
		}
	}

	return {
		onRequest: onRequest
	};

});
