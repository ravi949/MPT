/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Jan 2017     sayyadtajuddin
 * if dyanmic item field changed set the item field value from that dynamic field.
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 * 
 * undeployed the script
 */
function setItemValue(type, name, linenum){
  if(name == 'custpage_estvol_item'){
	  var itemValue = nlapiGetFieldValue(name);
	  nlapiSetFieldValue('custrecord_itpm_estqty_item',itemValue);
  }
}
