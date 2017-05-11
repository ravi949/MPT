/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Dec 2016     sayyadtajuddin
 * set the activity dynamic field value to the main field on before record submit.
 */

/**
 * @returns {Void} Any or no return value
 */
function setActivityValue() {
  //before submit we have to set the main Activity field values.	
  var selectedActvities = nlapiGetFieldValue('custpage_itpm_activity_field');
  nlapiSetFieldValue('custrecord_itpm_rei_activity',selectedActvities.split(','));
}
