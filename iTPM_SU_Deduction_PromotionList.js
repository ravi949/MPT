/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Front-end suitelet script to get and return a list of eligible promotions upon which a new iTPM Settlement record can be created.
 */
define(['N/ui/serverWidget',
		'N/redirect',
		'N/search',
		'N/record'
		],

function(serverWidget,redirect,search,record) {

	/**
	 * Definition of the Suitelet script trigger point.
	 *
	 * @param {Object} context
	 * @param {ServerRequest} context.request - Encapsulation of the incoming request
	 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
	 * @Since 2015.2
	 */
	function onRequest(context) 
	{
		try{
			var request = context.request,response = context.response,params = request.parameters;

			if(request.method == 'GET')
			{
				var form = serverWidget.createForm({
					title : 'New Settlement'
				});

				var promotionField = form.addField({
					id : 'custpage_promotion',
					type : serverWidget.FieldType.SELECT,
					label : 'Promotions'
				});
				promotionField.isMandatory = true;
				promotionField.addSelectOption({
					value:' ',
					text:' '
				});
				
				form.addField({
					id : 'custpage_promotion_liability',
					type : serverWidget.FieldType.CURRENCY,
					label : 'Net Promotional Liability'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).updateBreakType({
				    breakType : serverWidget.FieldBreakType.STARTCOL
				});
				
				form.addField({
					id : 'custpage_promotion_customer',
					type : serverWidget.FieldType.TEXT,
					label : 'Customer'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				});

				form.addField({
					id : 'custpage_promotion_ship_startdate',
					type : serverWidget.FieldType.TEXT,
					label : 'Ship start date'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).updateBreakType({
				    breakType : serverWidget.FieldBreakType.STARTCOL
				});
				
				form.addField({
					id : 'custpage_promotion_ship_enddate',
					type : serverWidget.FieldType.TEXT,
					label : 'Ship end date'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				});
				
				
				form.addField({
					id : 'custpage_ddn_id',
					type : serverWidget.FieldType.INTEGER,
					label : 'Deduction Id'
				}).updateDisplayType({
        			displayType : serverWidget.FieldDisplayType.HIDDEN
        		}).defaultValue =  params.ddn;

				//adding the submit and cancel button to the form
				form.addSubmitButton({
					label: 'Next'
				});

				form.addButton({
					label: 'Cancel',
					id:'custpage_cancelbtn',
					functionName:'redirectToBack'
				});

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
				var promoDealRecord = search.create({
					type:'customrecord_itpm_promotiondeal',
					columns:['internalid','name','custrecord_itpm_p_status','custrecord_itpm_p_condition','custrecord_itpm_p_customer','custrecord_itpm_p_netpromotionalle','custrecord_itpm_p_type.custrecord_itpm_pt_validmop'],
					filters:[
					    ['custrecord_itpm_p_status','anyof', 3],'and', //approved
					    ['custrecord_itpm_promo_allocationcontrbtn','is',false],'and',
					    [
					    	[['custrecord_itpm_p_type.custrecord_itpm_pt_settlewhenpromoactive','is','T'],'and',
					    	['custrecord_itpm_p_condition','anyof',2]],'or', //active if promotion type allow for settlemen in active
					    	['custrecord_itpm_p_condition','anyof', 3]  //completed
					    ],'and',
						['custrecord_itpm_p_customer','anyof', custrecIds],'and',
						['custrecord_itpm_p_type.custrecord_itpm_pt_validmop','is',1],'and',  //mop is bill-back
						['isinactive','is',false]]	    		
				}).run().each(function(k){ 
					promotionField.addSelectOption({
						value:k.getValue('internalid'),
						text:k.getValue('name')		
					});
					return true;
				});	

				form.clientScriptModulePath = './iTPM_Attach_Settlement_ClientMethods.js';
				response.writePage(form);
				
			}else if(request.method == 'POST'){
				log.debug('request',params)
				redirect.toSuitelet({
					scriptId:'customscript_itpm_set_createeditsuitelet',
					deploymentId:'customdeploy_itpm_set_createeditsuitelet',
					returnExternalUrl: false,
					parameters:{pid:params.custpage_promotion,ddn:params.custpage_ddn_id,from:'ddn',type:'create'}
				});
			}
		}catch (e) {
    		log.error(e.name,'record type = iTPM Deduction, record id='+params.ddn+', message = '+e.message);
    	}
	}
	return {
		onRequest: onRequest
	};

});
