/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       14 Dec 2016     sayyadtajuddin
 * dynamic subsidiary field change set the value to the main subsidiary field.
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
function setSubFieldValue(type, name, linenum){
   if(name == 'custpage_subsidiary_field'){
	   nlapiSetFieldValue('custrecord_itpm_p_subsidiary',nlapiGetFieldValue(name));
   }
}
