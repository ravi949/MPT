/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * Getting the promotions which are approved, completed, same customer and active to show in a drop down view  
 */
define(['N/ui/serverWidget','N/redirect','N/search','N/record'],

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
		    		id:'custom_itpm_list_promotiondeallink',
		    		type:serverWidget.FieldType.INLINEHTML,
		    		label:'Selected PROMOTION / DEAL'
		    	}).defaultValue = '<div class="uir-field-wrapper" data-field-type="text"><span id="custpage_promo_deal_fs_lbl_uir_label" class="smallgraytextnolink uir-label ">'+
	    		'<span id="custpage_promo_deal_fs_lbl" class="smallgraytextnolink" style=""><a class="smallgraytextnolink">PROMOTION / DEAL</a></span>'+
	    		'</span><span class="uir-field inputreadonly">'+
	    		'<a href="" target="_blank" id="promolink" class="dottedlink"></a></span></div>'
		    	
				form.addField({
					id : 'custpage_promotion_liability',
					type : serverWidget.FieldType.INTEGER,
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
					label: 'Submit'
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
					columns:['custbody_itpm_ddn_customer']
				})
				
				var promoDealRecord = search.create({
					type:'customrecord_itpm_promotiondeal',
					columns:['internalid','name','custrecord_itpm_p_status','custrecord_itpm_p_condition','custrecord_itpm_p_customer','custrecord_itpm_p_netpromotionalle','custrecord_itpm_p_type.custrecord_itpm_pt_validmop'],
					filters:[
					    ['custrecord_itpm_p_status','is', 3],'and', //approved
						['custrecord_itpm_p_condition','is', 3],'and', //completed
						['custrecord_itpm_p_customer','is', deductionRec.custbody_itpm_ddn_customer[0].value],'and',
						['custrecord_itpm_p_type.custrecord_itpm_pt_validmop','is',1],'and',  //mop is bill-back
//						['custrecord_itpm_p_netpromotionalle','GREATERTHAN', 0],'and',  //custrecord_itpm_p_netpromotionalle
						['isinactive','is',false]]	    		
				}).run().each(function(k){ 
					promotionField.addSelectOption({
						value:k.getValue('internalid'),
						text:k.getValue('name')		
					});
					return true;
				});	

				form.clientScriptModulePath = './iTPMSettlement_ClientValidations_cs_script.js';

				response.writePage(form);				
			}else if(request.method == 'POST')
			{
				log.debug('request',params)
				redirect.toSuitelet({
					scriptId:'customscript_itpm_settlement_using_su',
					deploymentId:'customdeploy_itpm_settlement_using_su',
					returnExternalUrl: false,
					parameters:{pid:params.custpage_promotion,ddn:params.custpage_ddn_id,from:'ddn'}
				});
			}
		}catch(ex)
		{
			log.debug('Exception',ex);
		}
	}
	return {
		onRequest: onRequest
	};

});
