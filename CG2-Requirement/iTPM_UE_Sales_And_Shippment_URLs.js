/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/url','N/record'],
		/**
		 * @param {url} url
		 */
		function(url,record) {
	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.oldRecord - Old record
	 * @param {string} scriptContext.type - Trigger type
	 * @Since 2015.2
	 */
	function afterSubmit(scriptContext) {
		try{
			if(scriptContext.newRecord.getValue('custrecord_itpm_p_impact') == '13'){
				//Actual Sales Suitelet URL
				var actualSalesURL = url.resolveScript({
					scriptId: 'customscript_itpm_promodeal_actual_sales',
					deploymentId: 'customdeploy_itpm_promodeal_actual_sales',
					returnExternalUrl: false,
					params: {
						'pid':scriptContext.newRecord.id,
						'st':0
					}
				});
				//Actual Sales Previous Year Suitelet URL
				var actualSalesURLPreviousYear = url.resolveScript({
					scriptId: 'customscript_itpm_p_actual_sales_preyear',
					deploymentId: 'customdeploy_itpm_p_actual_sales_preyear',
					returnExternalUrl: false,
					params: {
						'pid':scriptContext.newRecord.id,
						'st':0
					}
				});
				
				//Actual Shippments Suitelet URL
				var actualShippmentsURL = url.resolveScript({
					scriptId: 'customscript_itpm_pd_actual_shippments',
					deploymentId: 'customdeploy_itpm_pd_actual_shippments',
					returnExternalUrl: false,
					params: {
						'pid':scriptContext.newRecord.id,
						'st':0
					}
				});

				//Actual Shippments Previous Year Suitelet URL
				var actualShippmentsURLPreviousYear = url.resolveScript({
					scriptId: 'customscript_itpm_p_actual_shpmn_preyear',
					deploymentId: 'customdeploy_itpm_p_actual_shpmn_preyear',
					returnExternalUrl: false,
					params: {
						'pid':scriptContext.newRecord.id,
						'st':0
					}
				});
				
				//adding the Actual and Shipments URLs.
				record.load({
					type:'customrecord_itpm_promotiondeal',
					id:scriptContext.newRecord.id,
					isDynamic:true
				}).setValue({
					fieldId:'custrecord_itpm_p_actualsales', //Actual Sales
					value:actualSalesURL
				}).setValue({
					fieldId:'custrecord_itpm_p_actualshippments', //Actual Shippments
					value:actualShippmentsURL
				}).setValue({
					fieldId:'custrecord_itpm_p_actualsalespreviousyr', //Actual Sales Previous Year
					value:actualSalesURLPreviousYear
				}).setValue({
					fieldId:'custrecord_itpm_p_actualshippreviousyear', //Actual Shippments Previous Year
					value:actualShippmentsURLPreviousYear
				}).save({
					enableSourcing:false,
					ignoreMandatoryFields:true
				});
			}
		}catch(e){
			log.error('exception',e.message)
		}
	}

	return {
		afterSubmit: afterSubmit
	};

});
