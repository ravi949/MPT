/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Dec 2016     sayyadtajuddin
 * setting the subsidiary field value from the dyanmic field value.
 * before submit the record.
 */

/**
 * @returns {Void} Any or no return value
 */
function setSubsidiaryValue() {
   //setting the subsidiary value to the main subsidiary before submit
   var subsidiaryValue = nlapiGetFieldValue('custpage_subsidiary_field');
   if(subsidiaryValue){
	   nlapiSetFieldValue('custrecord_itpm_p_subsidiary', subsidiaryValue, false);
   }
}
