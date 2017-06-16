/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * Adding the dynamic Subsidiary field and add values to it. After saving record, sets the URL to the Actual sales & shipments fields 
 */
define(['N/record','N/search','N/ui/serverWidget','N/runtime','N/url'],

function(record,search,serverWidget,runtime,url) {

	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {string} scriptContext.type - Trigger type
	 * @param {Form} scriptContext.form - Current form
	 * @Since 2015.2
	 */
	function beforeLoad(scriptContext) {
		try{
			var isSubsidiaryExist = runtime.isFeatureInEffect('SUBSIDIARIES'),
			eventType = scriptContext.type;
			contextType = runtime.executionContext,
			mainFieldSubsidiaryValue = scriptContext.newRecord.getValue('custrecord_itpm_p_subsidiary'),
			(eventType == 'copy')?scriptContext.newRecord.setValue('custrecord_itpm_p_actualsales','').setValue('custrecord_itpm_p_actualshippments','').setValue('custrecord_itpm_p_status',''):'',
					recordStatus = scriptContext.newRecord.getValue('custrecord_itpm_p_status');		

			if(isSubsidiaryExist && (eventType == 'create' || eventType == 'edit' || eventType == 'copy') && contextType == 'USERINTERFACE'){
				if(recordStatus != 3){

					var promoDealForm = scriptContext.form,
					userId = runtime.getCurrentUser().id,
					userSubsidiary = record.load({type:record.Type.EMPLOYEE,id:userId}).getValue('subsidiary');

					var subsidiaryField = promoDealForm.addField({
						id : 'custpage_subsidiary_field',
						type : serverWidget.FieldType.SELECT,
						label : 'SUBSIDIARY'
					});

					subsidiaryField.setHelpText({
						help:'Select the subsidiary to which this promotion or deal applies'
					})

					promoDealForm.insertField({
						field:subsidiaryField,
						nextfield:'custrecord_itpm_p_subsidiary'
					});

					if(eventType == 'copy'){
						var promoDealId = scriptContext.request.parameters.id
						userSubsidiary = search.lookupFields({
							type:'customrecord_itpm_promotiondeal',
							id:promoDealId,
							columns:['custrecord_itpm_p_subsidiary']
						}).custrecord_itpm_p_subsidiary[0].value
					}


					search.create({
						type:search.Type.SUBSIDIARY,
						columns:['internalid','name','parent'],
						filters:[['isinactive','is',false],'and',['parent','is',userSubsidiary]]
					}).run().each(function(e){
						subsidiaryField.addSelectOption({
							value:e.getValue('internalid'),
							text:e.getValue('name'),
							isSelected:(eventType == 'create' || eventType =='copy')?e.getValue('internalid') == userSubsidiary:e.getValue('internalid') == mainFieldSubsidiaryValue
						});
						return true;
					});
					subsidiaryField.isMandatory = true;
				}
			}
		}catch(e){
			log.error('exception',e.message);
		}
	}

	return {
		beforeLoad: beforeLoad
	};

});
