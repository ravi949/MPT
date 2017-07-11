/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 */
define(['N/url', 'N/https','N/search'],

		function(url, https, search) {

	

	/**
	 * Function to be executed after page is initialized.
	 *
	 * @param {Object} sc
	 * @param {Record} sc.currentRecord - Current form record
	 * @param {string} sc.mode - The mode in which the record is being accessed (create, copy, or edit)
	 * @since 2015.2
	 */

	function pageInit(sc){
		
	}

	/**
	 * Function to be executed when field is changed.
	 *
	 * @param {Object} sc
	 * @param {Record} sc.currentRecord - Current form record
	 * @param {string} sc.sublistId - Sublist name
	 * @param {string} sc.fieldId - Field name
	 * @param {number} sc.lineNum - Line number. Will be undefined if not a sublist or matrix field
	 * @param {number} sc.columnNum - Line number. Will be undefined if not a matrix field
	 *
	 * @since 2015.2
	 */
	function fieldChanged(sc) {
		
	}
	
	return {
		pageInit:pageInit,
		fieldChanged: fieldChanged
	};

});
