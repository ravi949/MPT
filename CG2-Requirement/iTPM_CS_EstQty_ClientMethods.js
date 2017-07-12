/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 * Client script to perform actions on the iTPM EstimatedQuantity record during Create or Edit.
 * Sets the select options on Item and Unit dynamic fields
 */
define(['N/https', 'N/url'],
/**
 * @param {https} https
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(https, url) {
	
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
			var jsonResponse = null;
			var response = https.get.promise({
				url: output
			}).then(function(response){
				log.debug('.then Response', response);
				log.debug('Response Body', response.body);
				jsonResponse =  JSON.parse(response.body);
				log.debug('httpsget Response', response);
				log.debug('jsonResponse', jsonResponse);
				//var jsonResponse =  JSON.parse(response.body);
				return jsonResponse;
			});
			log.debug('httpsget Response', response);
			log.debug('jsonResponse', jsonResponse);
			//var jsonResponse =  JSON.parse(response.body);
			return jsonResponse;
		} catch(ex) {
			console.log(ex.name,'function name = getUnits, message = '+ex.message);
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
    		var fieldId = sc.fieldId, estqty = sc.currentRecord;
    		if (fieldId == 'custpage_itpm_estqty_item'){
    			var dynItemField = estqty.getValue({fieldId:'custpage_itpm_estqty_item'}),
    				itemField = estqty.getValue({fieldId:'custrecord_itpm_estqty_item'});
    			if(itemField != dynItemField){
	    			estqty.setValue({
	    				fieldId: 'custrecord_itpm_estqty_item',
	    				value: dynItemField
	    			});
    			}
    		} else if(fieldId == 'custrecord_itpm_estqty_item'){
    			var itemField = estqty.getValue({fieldId:'custrecord_itpm_estqty_item'});
    			if (itemField != '' && itemField != null){
    				var output = url.resolveScript({
    					scriptId:'customscript_itpm_su_getitemunits',
    					deploymentId:'customdeploy_itpm_su_getitemunits',
    					params: {itemid : itemField, unitid: null},
    					returnExternalUrl: true
    				});
    				var response = https.get.promise({
    					url: output
    				}).then(function(objResponse){
    					log.debug('Response Body', objResponse.body);
    					objResponse = objResponse.body;
    					log.debug('objResponse', objResponse);
    					if(!objResponse.error){
        					var unitField = estqty.getField({fieldId:'custpage_itpm_estqty_unit'});
        					log.debug('UnitField', unitField);
        					unitField.removeSelectOption({value:null});
        					var unitsList = JSON.parse(objResponse).unitsList;
        					log.debug('UnitsList', unitsList);
        					unitField.insertSelectOption({
        						value: 0,
        						text: " "
        					});
        					for (x in unitsList){
        						log.debug('unitOption', unitsList[x].name);
            					unitField.insertSelectOption({
            						value: unitsList[x].internalId,
            						text: unitsList[x].name
            					});
            				}
        					estqty.setValue({
        						fieldId: 'custpage_itpm_estqty_unit',
        						value: 0,
        						ignoreFieldChange: true
        					});
        				} else {
        					console.log('Response Object', 'Error returned in compiling the list of applicable units.');
        				}
    				});
    			}    			
    		} else if(fieldId == 'custpage_itpm_estqty_unit'){
    			var dynUnitField = estqty.getValue({fieldId: 'custpage_itpm_estqty_unit'}),
				unitField = estqty.getValue({fieldId: 'custrecord_itpm_estqty_qtyby'});
				if (dynUnitField != unitField){
					estqty.setValue({
						fieldId: 'custrecord_itpm_estqty_qtyby',
						value : dynUnitField
					});
				}    			
    		}
    		
    	} catch(ex) {
    		console.log(ex.name,'function name = fieldchange, message = '+ex.message);
    	}
    }

    return {
        fieldChanged: fieldChanged
    };
    
});
