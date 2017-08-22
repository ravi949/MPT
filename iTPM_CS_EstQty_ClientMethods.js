/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 * Client script to perform actions on the iTPM EstimatedQuantity record during Create or Edit.
 * Sets the select options on Item and Unit dynamic fields
 */
define(['N/https',
		'N/url'
		],
/**
 * @param {https} https
 * @param {serverWidget} serverWidget
 * @param {url} url
 */
function(https, url) {
	
	/**
	 * Function to be executed after page is initialized.
	 *
	 * @param {Object} sc
	 * @param {Record} sc.currentRecord - Current form record
	 * @param {string} sc.mode - The mode in which the record is being accessed (create, copy, or edit)
	 * @since 2015.2
	 */
	function pageInit(sc){
		try{
			var estqty = sc.currentRecord;
			var mode = sc.mode;
			if(mode == 'edit'){
				setUnits(estqty,mode);
			}
		}catch(e){
			console.log(ex.name,'function name = pageInit, message = '+ex.message);
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
    		var dynItemField = estqty.getValue({fieldId:'custpage_itpm_estqty_item'}),
			itemField = estqty.getValue({fieldId:'custrecord_itpm_estqty_item'});
    		if (fieldId == 'custpage_itpm_estqty_item'){
    			if(itemField != dynItemField){
	    			estqty.setValue({
	    				fieldId: 'custrecord_itpm_estqty_item',
	    				value: dynItemField
	    			});
    			}
    		} else if(fieldId == 'custrecord_itpm_estqty_item'){
    			if (itemField != '' && itemField != null){
    				setUnits(estqty,null);
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
    
    //get the units and insert them into field as a values.
    function setUnits(estqty,mode){
    	try{
    		var itemField = estqty.getValue({fieldId:'custrecord_itpm_estqty_item'});
    		var output = url.resolveScript({
    			scriptId:'customscript_itpm_su_getitemunits',
    			deploymentId:'customdeploy_itpm_su_getitemunits',
    			params: {itemid : itemField, unitid: null, price:false}
    		});
    		var response = https.get.promise({
    			url: output
    		}).then(function(objResponse){
    			objResponse = JSON.parse(objResponse.body);
    			if(!objResponse.error){
    				var unitField = estqty.getField({fieldId:'custpage_itpm_estqty_unit'});
    				unitField.removeSelectOption({value:null});
    				var unitsList = objResponse.unitsList;
    				
    				if(mode == null){
    					unitField.insertSelectOption({
    						value: " ",
    						text: " "
    					});
    				}

    				for (x in unitsList){
    					log.debug('unitOption', unitsList[x].name);
    					unitField.insertSelectOption({
    						value: unitsList[x].internalId,
    						text: unitsList[x].name,
    						isSelected:unitsList[x].internalId == estqty.getValue('	custrecord_itpm_estqty_qtyby')
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
    	}catch(ex) {
    		console.log(ex.name,'function name = setUnits, message = '+ex.message);
    	}
    }

    return {
    	pageInit:pageInit,
        fieldChanged: fieldChanged
    };
    
});
