/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Jan 2017     sayyadtajuddin
 * adding the dynamic item field to the retail info records.
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function addDynamicFieldItem(type, form, request){
	try{
		var contextType = nlapiGetContext().getExecutionContext(),
		promoDealId = nlapiGetFieldValue('custrecord_itpm_rei_promotiondeal');
		if(promoDealId != null && (type == 'create' || type == 'edit' || type == 'copy') && contextType == 'userinterface'){

			//adding the dynamic field ITEM to the retail info record
			var dynamicItemField = form.addField("custpage_rei_item", "select", "ITEM", null, null),
			mainItemValue = nlapiGetFieldValue('custrecord_itpm_rei_item');

			//allowance item search
			// Define search filters
			var filters = new Array();
			filters[0] = new nlobjSearchFilter( 'custrecord_itpm_all_promotiondeal', null, 'is',promoDealId);
			filters[1] = new nlobjSearchFilter( 'isinactive', null, 'is', false );
			// Define search columns
			var columns = new Array();
			columns[0] = new nlobjSearchColumn( 'custrecord_itpm_all_item',null,'group' );
			// Create the search
			var allowanceItems = nlapiCreateSearch( 'customrecord_itpm_promoallowance', filters, columns ).runSearch();


			//Retail-info item search
			// Define search filters
			var filters = new Array();
			filters[0] = new nlobjSearchFilter( 'custrecord_itpm_rei_promotiondeal', null, 'is',promoDealId);
			filters[1] = new nlobjSearchFilter( 'isinactive', null, 'is', false );
			// Define search columns
			var columns = new Array();
			columns[0] = new nlobjSearchColumn( 'custrecord_itpm_rei_item');
			// Create the search
			var retailInfoItems = nlapiCreateSearch( 'customrecord_itpm_promoretailevent', filters, columns ).runSearch();

			//adding the mandatory and empty option as default
			form.insertField(dynamicItemField, 'custrecord_itpm_rei_itemdescription');
			dynamicItemField.setHelpText('Select the item for this Retail Event Information',true);
			dynamicItemField.setMandatory(true);
			dynamicItemField.addSelectOption('','');

			//adding the selection option to the dynamic field
			allowanceItems.forEachResult(function(result){
				var searchItemValue = result.getValue('custrecord_itpm_all_item',null,'group'),itemMatched = false;			
				//searching for item those already created
				retailInfoItems.forEachResult(function(rei){
					if(searchItemValue == rei.getValue('custrecord_itpm_rei_item')){
						itemMatched = true;
						return false;
					}
					return true;
				})

				var selectedItem  = (mainItemValue == searchItemValue);

				if((type !='edit' && !itemMatched) || (type =='edit' && selectedItem)){
					dynamicItemField.addSelectOption(searchItemValue,result.getText('custrecord_itpm_all_item',null,'group'),searchItemValue == mainItemValue);
				}
				return true;
			})
		}
	}catch(e){
		throw Error(e.message);
	}


}
