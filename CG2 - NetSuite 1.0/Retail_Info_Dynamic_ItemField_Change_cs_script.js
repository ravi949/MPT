/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Jan 2017     sayyadtajuddin
 * on field change dynamic field item set the value to the main item field.
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function itemFieldChanged(type, name, linenum){
    if(name == 'custpage_rei_item'){
    	var itemFieldValue = nlapiGetFieldValue(name);
    	nlapiSetFieldValue('custrecord_itpm_rei_item',itemFieldValue);
    }
}
