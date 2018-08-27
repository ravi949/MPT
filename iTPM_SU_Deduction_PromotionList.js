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
				list.addColumn({
					id : 'custpage_itpm_netlaiblity',
					type : serverWidget.FieldType.TEXT,
					label : 'Net Liability'
				});
				list.addColumn({
					id : 'custpage_itpm_overpay',
					type : serverWidget.FieldType.TEXT,
					label : 'Overpay'
				});
				list.addColumn({
					id : 'custpage_itpm_promoestspnd',
					type : serverWidget.FieldType.TEXT,
					label : 'Est.Spend'
				});
				list.addColumn({
					id : 'custpage_itpm_lespend',
					type : serverWidget.FieldType.TEXT,
					label : 'LE Spend'
				});
				list.addColumn({
					id : 'custpage_itpm_maxliablity',
					type : serverWidget.FieldType.TEXT,
					label : 'Max Liability'
				});
				list.addColumn({
					id : 'custpage_itpm_expliablity',
					type : serverWidget.FieldType.TEXT,
					label : 'Expected Liability'
				});
				list.addColumn({
					id : 'custpage_itpm_actspend',
					type : serverWidget.FieldType.TEXT,
					label : 'Actual Spend'
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
						'custrecord_itpm_p_type'
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
				var promoDealRecordSearchLength = promoDealRecordSearch.runPaged().count;
				var promos = [];
				var suiteltUrl = url.resolveScript({
					scriptId: 'customscript_itpm_set_createeditsuitelet',
					deploymentId: 'customdeploy_itpm_set_createeditsuitelet',
					returnExternalUrl: false
				});
				if(promoDealRecordSearchLength > 0){
					listcolumn.setURL({
						url : suiteltUrl
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
						var promoRecId = e.getValue('internalid');
						var promoRecord = record.load({
							type:'customrecord_itpm_promotiondeal',
							id:promoRecId
						});	
						promoObj = {	
								'custpage_itpm_id':promoRecId,
								'custpage_itpm_prmtitle':e.getValue('name'),
								'custpage_itpm_otherrefcode':e.getValue('custrecord_itpm_p_otherrefcode'),
								'custpage_itpm_prmtype':e.getText('custrecord_itpm_p_type'),
								'custpage_itpm_prmcondn':promoRecord.getText('custrecord_itpm_p_condition'),
								'custpage_itpm_prmshipstdt':promoRecord.getText('custrecord_itpm_p_shipstart'),
								'custpage_itpm_prmshipenddt':promoRecord.getText('custrecord_itpm_p_shipend'),
								'custpage_itpm_netlaiblity':promoRecord.getText('custrecord_itpm_p_netpromotionalle'),
								'custpage_itpm_overpay':promoRecord.getText('custrecord_itpm_p_promotionaloverpayamt'),
								'custpage_itpm_promoestspnd':promoRecord.getText('custrecord_itpm_estimatedspend'),
								'custpage_itpm_lespend':promoRecord.getText('custrecord_itpm_lespend'),
								'custpage_itpm_maxliablity':promoRecord.getText('custrecord_itepm_p_incurredpromotionalle'),
								'custpage_itpm_expliablity':promoRecord.getText('custrecord_itpm_p_expliabilitypromo'),
								'custpage_itpm_actspend':promoRecord.getText('custrecord_itpm_p_promotionalactualspend')
						};
						list.addRow({
							row :promoObj
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
