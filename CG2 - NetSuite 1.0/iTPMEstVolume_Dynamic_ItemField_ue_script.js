/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Jan 2017     sayyadtajuddin
 * adding the items to estimated quantity dynamic item field.
 * items are getting from the allowances.
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 * 
 * undeployed  the script
 */
function addDynamicItemField(type, form, request){
	try{
		var contextType = nlapiGetContext().getExecutionContext(),
		promoDealId = nlapiGetFieldValue('custrecord_itpm_estqty_promodeal');
		if(promoDealId != null && (type == 'create' || type == 'edit' || type == 'copy') && contextType == 'userinterface'){

			//adding the dynamic field ITEM to the retail info record
			var dynamicItemField = form.addField("custpage_estvol_item", "select", "ITEM", null, null),
			mainItemValue = nlapiGetFieldValue('custrecord_itpm_estqty_item');

			// Define search filters
			var filters = new Array();
			filters[0] = new nlobjSearchFilter( 'custrecord_itpm_all_promotiondeal', null, 'is',promoDealId);
			filters[1] = new nlobjSearchFilter( 'isinactive', null, 'is', false );
			// Define search columns
			var columns = new Array();
			columns[0] = new nlobjSearchColumn( 'custrecord_itpm_all_item',null,'group' );
			// Create the search
			var allowanceItems = nlapiCreateSearch( 'customrecord_itpm_promoallowance', filters, columns ).runSearch();

			form.insertField(dynamicItemField,'custpage_est_vol_by');
			dynamicItemField.setHelpText('Select the item for this Estimated Quantity',true)
			dynamicItemField.setMandatory(true);
			dynamicItemField.addSelectOption('','');

			//adding the selection option to the dynamic field
			allowanceItems.forEachResult(function(result){
				var searchItemValue = result.getValue('custrecord_itpm_all_item',null,'group');
				dynamicItemField.addSelectOption(searchItemValue,result.getText('custrecord_itpm_all_item',null,'group'),searchItemValue == mainItemValue)
				return true;
			})
		}
	}catch(e){
		throw Error(e.message);
	}
}
