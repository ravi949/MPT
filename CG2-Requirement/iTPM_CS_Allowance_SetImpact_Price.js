/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * It is used to show the duplicate allowance record message and set the price value while calling the suitelet
 */
define(['N/ui/message','N/url','N/https'],

function(message,url,https) {
	
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
			//clear the allowance type field value when get the error duplicate
			if(sc.currentRecord.id==''){
				sc.currentRecord.setValue({
					fieldId:'custrecord_itpm_all_type',
					value:''
				});
			}
		}catch(ex){
			log.error(ex.name,ex.message);
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
	    	if (sc.fieldId == 'custrecord_itpm_all_pricelevel' || sc.fieldId == 'custrecord_itpm_all_item'){
	    		var itemId = sc.currentRecord.getValue({fieldId:'custrecord_itpm_all_item'}),
	    			priceLevel = sc.currentRecord.getValue({fieldId:'custrecord_itpm_all_pricelevel'}),
	    			promoId = sc.currentRecord.getValue({fieldId:'custrecord_itpm_all_promotiondeal'}),
	    			impactBasePrice = sc.currentRecord.getValue({fieldId:'custrecord_itpm_all_itembaseprice'}),
	    			currency = sc.currentRecord.getValue({fieldId:'custrecord_itpm_all_currency'});
	    		if (itemId == '' || priceLevel == '' || currency == ''){
	    			sc.currentRecord.setValue({
	    				fieldId:'custrecord_itpm_all_impactprice', 
	    				value: 0
	    			});
	    		} else {
	    			https.get.promise({
	    				url : url.resolveScript({
	        				scriptId: 'customscript_itpm_allowance_price_val',
	        				deploymentId: 'customdeploy_itpm_allowance_price_val',
	        				returnExternalUrl: true,
	        				params: {
	        					itemid: itemId,
	        					pid:promoId,
	        					pricelevel: priceLevel,
	        					baseprice:impactBasePrice,
	        					curr: currency
	        				}
	        			})
	    			}).then(function(response) {
	    					var body = JSON.parse(response.body);
	    					if(body.success){
	    						sc.currentRecord.setValue({
									fieldId:'custrecord_itpm_all_impactprice',value:body.price
								});
	    					}else{
	    					    console.log(body);	
	    					}
					});
	    		}
	    	}
    	} catch(ex) {
    		console.log(ex.name,'record type = iTPM Allowance, record id = ',scriptContext.newRecord.id+', message = '+e.message);
    	}
    }
    
    return {
    	pageInit:pageInit,
        fieldChanged: fieldChanged
    };
    
});
