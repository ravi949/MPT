/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 Dec 2016     sayyadtajuddin
 * set the value estimated quantity by from the dynamic field estimate volume by.
 * 
 * undeployed the script
 */

/**
 * @returns {Void} Any or no return value
 */
function setEstVolumeByValue() {
    var estVolByDynamicFieldValue = nlapiGetFieldValue('custpage_est_vol_by');
    nlapiSetFieldValue('custrecord_itpm_estqty_qtyby', estVolByDynamicFieldValue, false);
}
