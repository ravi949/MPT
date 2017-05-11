/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 */
define(['N/url', 'N/https'],

		function(url, https) {

	/**
	 * Function to call a Suitelet and return an array of key:value pairs of units
	 * @param {number} itemid
	 * 
	 * @returns {array}
	 */
	function getUnits(id) {
		try{
			log.debug('GetItemUnit ID', id);
			var output = url.resolveScript({
				scriptId:'customscript_itpm_su_getitemunits',
				deploymentId:'customdeploy_itpm_su_getitemunits',
				params: {itemid : id, unitid: null},
				returnExternalUrl: true
			});
			//log.debug('GetItemUnit URL', output);
			var response = https.get({
				url: output
			});
			//log.debug('GetItemUnit Response', response.body);
			var jsonResponse =  JSON.parse(response.body);
			//log.debug('jsonResponse', jsonResponse);
			return jsonResponse;
		} catch(ex) {
			log.error(ex.name, ex.message);
		}
	}

	/**
	 * Function to call a Suitelet and return a decimal number
	 * @param {number} itemid
	 * @param {number} unitId
	 * 
	 * @returns {string}
	 */
	function getConversionRate(itemid, unitid) {
		try{
			var output = url.resolveScript({
				scriptId:'customscript_itpm_su_getitemunits',
				deploymentId:'customdeploy_itpm_su_getitemunits',
				params: {itemid : itemid, unitid: unitid},
				returnExternalUrl: true
			});
			var response = https.get({
				url: output
			});
			var jsonResponse =  JSON.parse(response.body);
			return jsonResponse;
		} catch(ex) {
			log.error(ex.name, ex.message);
		}
	}


	/**
	 * Function to be executed after page is initialized.
	 *
	 * @param {Object} sc
	 * @param {Record} sc.currentRecord - Current form record
	 * @param {string} sc.mode - The mode in which the record is being accessed (create, copy, or edit)
	 * @since 2015.2
	 */

	function pageInit(sc){
		if(sc.mode == 'edit' || sc.mode =='copy'){
			var objResponse = getUnits(sc.currentRecord.getValue({fieldId: 'custrecord_itpm_all_item'}));
			var unitField = sc.currentRecord.getField({fieldId: 'custpage_itpm_all_unit'});
			if (!(objResponse.error)){
				unitField.removeSelectOption({value:null});
				var unitsList = objResponse.unitsList;
				unitField.insertSelectOption({
					value: 0,
					text: " ",
					isSelected: true
				});
				for (x in unitsList){
					unitField.insertSelectOption({
						value: unitsList[x].internalId,
						text: unitsList[x].name,
						isSelected:sc.currentRecord.getValue('custrecord_itpm_all_uom') == unitsList[x].internalId
					});
				}
			}
		}
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
		try{
			var fieldId = sc.fieldId, allowance = sc.currentRecord;
			if (fieldId == 'custpage_itpm_all_unit'){
				var dynFieldValue = allowance.getValue({fieldId: 'custpage_itpm_all_unit'}),
				unitFieldValue = allowance.getValue({fieldId: 'custrecord_itpm_all_uom'});
				if (dynFieldValue != unitFieldValue){
					allowance.setValue({
						fieldId: 'custrecord_itpm_all_uom',
						value : dynFieldValue
					});
				}
			} else if(fieldId == 'custrecord_itpm_all_item'){
				var objResponse = getUnits(allowance.getValue({fieldId: 'custrecord_itpm_all_item'}));
				var unitField = allowance.getField({fieldId: 'custpage_itpm_all_unit'});
				if (!(objResponse.error)){
					unitField.removeSelectOption({value:null});
					var unitsList = objResponse.unitsList;
					unitField.insertSelectOption({
						value: 0,
						text: " ",
						isSelected: true
					});
					for (x in unitsList){
						unitField.insertSelectOption({
							value: unitsList[x].internalId,
							text: unitsList[x].name
						});
					}
				} else {
					log.error('Response Object', 'Error returned in compiling the list of applicable units.')
				}
			} else if (fieldId == 'custrecord_itpm_all_impactprice'){
				var unitId = allowance.getValue({fieldId: 'custrecord_itpm_all_uom'}),
				itemId = allowance.getValue({fieldId: 'custrecord_itpm_all_item'}),
				dynUnit = allowance.getValue({fieldId: 'custpage_itpm_all_unit'});
				var objResponse = getConversionRate(itemId, unitId);
				if (!(objResponse.error)){
					var rate = (dynUnit)? parseFloat(objResponse.unitsList[0].rate) : 0;
					allowance.setValue({
						fieldId: 'custrecord_itpm_all_uomprice',
						value: rate * parseFloat(allowance.getValue({fieldId: 'custrecord_itpm_all_impactprice'})),
						ignoreFieldChange: true
					});
				} else {
					log.error('Response Object', 'Error returned in conversion rate.')
				}
			}else if(fieldId == 'custrecord_itpm_all_uom'){
				var unitId = allowance.getValue({fieldId: 'custrecord_itpm_all_uom'}),
				itemId = allowance.getValue({fieldId: 'custrecord_itpm_all_item'}),
				dynUnit = allowance.getValue({fieldId: 'custpage_itpm_all_unit'});
				var objResponse = getConversionRate(itemId, unitId);
				if (!(objResponse.error)){
					var rate = (dynUnit)? parseFloat(objResponse.unitsList[0].rate) : 0;
					allowance.setValue({
						fieldId: 'custrecord_itpm_all_uomprice',
						value: rate * parseFloat(allowance.getValue({fieldId: 'custrecord_itpm_all_impactprice'})),
						ignoreFieldChange: true
					});
				} else {
					log.error('Response Object', 'Error returned in conversion rate.')
				}
			}
		} catch(ex) {
			log.error(ex.name, ex.message);
		}
	}

	return {
		pageInit:pageInit,
		fieldChanged: fieldChanged
	};

});
