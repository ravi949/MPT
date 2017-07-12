/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 * Client script to perform actions on the iTPM Allowance record during Create or Edit.
 */
define(['N/ui/message','N/url','N/https','N/search','N/ui/dialog'],

function(message,url,https, search,dialog) {
	
	/**
	 * Function to be executed after page is initialized.
	 *
	 * @param {Object} sc
	 * @param {Record} sc.currentRecord - Current form record
	 * @param {string} sc.mode - The mode in which the record is being accessed (create, copy, or edit)
	 * @since 2015.2
	 */
	var mode;
	function pageInit(sc){
		try{
			var rec = sc.currentRecord;
			mode = sc.mode;
			//clear the allowance type field value when get the error duplicate
			if(rec.id==''){
				rec.setValue({
					fieldId:'custrecord_itpm_all_type',
					value:''
				});
			}
			if(mode == 'edit' || mode =='copy'){
				var objResponse = getUnits(rec.getValue({fieldId: 'custrecord_itpm_all_item'}));
				var unitField = rec.getField({fieldId: 'custpage_itpm_all_unit'});
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
							isSelected:rec.getValue('custrecord_itpm_all_uom') == unitsList[x].internalId
						});
					}
				}
				if(mode == 'edit'){
					var disableADD = checkForAllowaceDuplicates(mode,rec);
					if(disableADD != 0){
						var checkBoxField = rec.getField('custrecord_itpm_all_allowaddnaldiscounts');
						checkBoxField.isDisabled = disableADD;
					}
				}
			}
		}catch(ex){
			log.error(ex.name,'record type = iTPM Allowance,function name = pageInit, message = '+ex.message);
			console.log(ex.name,'record type = iTPM Allowance, function name = pageInit, message = '+ex.message);
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
	    	var fieldId = sc.fieldId, rec = sc.currentRecord;
			var unitField = rec.getField({fieldId: 'custpage_itpm_all_unit'});
	    	if (fieldId == 'custpage_itpm_all_unit'){
				var dynFieldValue = rec.getValue({fieldId: 'custpage_itpm_all_unit'});
				var unitFieldValue = rec.getValue({fieldId: 'custrecord_itpm_all_uom'});
				if (dynFieldValue != unitFieldValue){
					rec.setValue({
						fieldId: 'custrecord_itpm_all_uom',
						value : dynFieldValue
					});
				}
			} else if (fieldId == 'custrecord_itpm_all_item'){
	    		var itemId = rec.getValue({fieldId:'custrecord_itpm_all_item'});
	    		var priceLevel = rec.getValue({fieldId:'custrecord_itpm_all_pricelevel'});
	    		var promoId = rec.getValue({fieldId:'custrecord_itpm_all_promotiondeal'});
	    		var impactBasePrice = rec.getValue({fieldId:'custrecord_itpm_all_itembaseprice'});
	    		if (itemId == '' || priceLevel == ''){
	    			sc.currentRecord.setValue({
	    				fieldId:'custrecord_itpm_all_impactprice', 
	    				value: 0
	    			});
	    			if(itemId == '')
	    				unitField.removeSelectOption({value:null});
	    		} else {
	    			https.get.promise({
	    				url : url.resolveScript({
	    					scriptId:'customscript_itpm_su_getitemunits',
	    					deploymentId:'customdeploy_itpm_su_getitemunits',
	        				returnExternalUrl: true,
	        				params: {
	        					itemid: itemId,
	        					pid:promoId,
	        					pricelevel: priceLevel,
	        					baseprice:impactBasePrice,
	        					price:true
	        				}
	        			})
	    			}).then(function(response) {
	    					var body = JSON.parse(response.body);
	    					if(body.success){
	    						rec.setValue({
									fieldId:'custrecord_itpm_all_impactprice',value:body.price
								});
	    					}else{
	    					    console.log(body);	
	    					}
					});
	    			rec.setValue({
	    				fieldId:'custrecord_itpm_all_uom',value:''
	    			}).setValue({
	    				fieldId:'custrecord_itpm_all_uomprice',value:''
	    			});

	    			var objResponse = getUnits(itemId);
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
	    				log.error('Response Object', 'Error returned in compiling the list of applicable units.');
	    			}
	    			if(mode == 'create'|| mode == 'edit' || mode == 'copy'){
	        			if(itemId != ""){
	        				var disableADD = checkForAllowaceDuplicates(mode,rec);
	        				var checkBoxField = rec.getField('custrecord_itpm_all_allowaddnaldiscounts');
	        				if(disableADD != -1){
	        					checkBoxField.isDisabled = true;
	        					//if previous allowane ADD checked than we showing the popup for other allowances
	        					if(disableADD){
	        						dialog.confirm({title:'Confirm',message:'You selected an item that is already being used on another allowance on this promotion. Are you sure?'})
	            					.then(function(result){
	            						if(!result){
	            							disableADD = false;
	            							rec.setValue({fieldId:'custrecord_itpm_all_item',value:''})
	            							.setValue({fieldId:'custrecord_itpm_all_allowaddnaldiscounts',value:false});
	            						}
	            						checkBoxField.isDisabled = disableADD;
	            					}).catch(function(error){
	            						console.log(error.name,'record type = iTPM Allowance, message = '+error.message);
	            						return false
	            					});
	        					}
	        					
	        				}else{
	        					checkBoxField.isDisabled = false; 
	        				}
	        			}
	        		}
	    		}
			}else if(fieldId == 'custrecord_itpm_all_uom'){
				var unitId = rec.getValue({fieldId: 'custrecord_itpm_all_uom'});
				if(unitId > 0){
					var itemId = rec.getValue({fieldId: 'custrecord_itpm_all_item'});
					var dynUnit = rec.getValue({fieldId: 'custpage_itpm_all_unit'});
					var itemSaleUnit = search.lookupFields({type:search.Type.ITEM,id:itemId,columns:['saleunit']})['saleunit'][0].value;
					var itemUnitRate = parseFloat(getConversionRate(itemId, itemSaleUnit).unitsList[0].rate);
					var objResponse = getConversionRate(itemId, unitId);
					if (!(objResponse.error)){
						var rate = (dynUnit)? parseFloat(objResponse.unitsList[0].rate) : 0;
						rec.setValue({
							fieldId: 'custrecord_itpm_all_uomprice',
//							value: rate * parseFloat(rec.getValue({fieldId: 'custrecord_itpm_all_impactprice'})),
							value: parseFloat(rec.getValue({fieldId: 'custrecord_itpm_all_impactprice'}))*(rate/itemUnitRate),
							ignoreFieldChange: true
						});
					} else {
						log.error('Response Object', 'Error returned in conversion rate.');
					}
				}else{
					rec.setValue({
						fieldId: 'custrecord_itpm_all_uomprice',
						value: '',
						ignoreFieldChange: true
					});
				}
				
			}
    	} catch(ex) {
    		log.error(ex.name,'record type = iTPM Allowance, function name = fieldchange, message = '+ex.message);
    		console.log(ex.name,'record type = iTPM Allowance, function name = fieldchange, message = '+ex.message);
    	}
    }
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
				params: {itemid : id, unitid: null, price:false},
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
			log.error(ex.name,'record type = iTPM Allowance, function name = getUnits message = '+ex.message);
			console.log(ex.name,'record type = iTPM Allowance, function name = getUnits message = '+ex.message);
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
				params: {itemid : itemid, unitid: unitid, price:false},
				returnExternalUrl: true
			});
			var response = https.get({
				url: output
			});
			var jsonResponse =  JSON.parse(response.body);
			return jsonResponse;
		} catch(ex) {
			log.error(ex.name,'record type = iTPM Allowance, function name = getConversionRate, message = '+ex.message);
			console.log(ex.name,'record type = iTPM Allowance, function name = getConversionRate, message = '+ex.message);
		}
	}
	
	
	//check for allowance duplicate and return allow additional checkbox true or false
	function checkForAllowaceDuplicates(mode,allRec){
		try{
			var allAddChecked = -1;
			var item = allRec.getValue('custrecord_itpm_all_item'),promo = allRec.getValue('custrecord_itpm_all_promotiondeal');
			var allFilter = [['custrecord_itpm_all_promotiondeal','is',promo],'and',
			             ['custrecord_itpm_all_item','is',item],'and',
			             ['isinactive','is',false]];

			if(mode == 'edit'){
				allFilter.push('and',['internalid','noneof',allRec.id]);
			}

			search.create({
				type:'customrecord_itpm_promoallowance',
				columns:['internalid','custrecord_itpm_all_allowaddnaldiscounts'],
				filters:allFilter
			}).run().each(function(e){
				allRec.setValue({fieldId:'custrecord_itpm_all_allowaddnaldiscounts',value:e.getValue({name:'custrecord_itpm_all_allowaddnaldiscounts'})})
				allAddChecked = e.getValue({name:'custrecord_itpm_all_allowaddnaldiscounts'});
				return false;
			});

			return allAddChecked;
		} catch(ex) {
			log.error(ex.name,'record type = iTPM Allowance, function name = checkForAllowaceDuplicates, message = '+ex.message);
			console.log(ex.name,'record type = iTPM Allowance, function name = checkForAllowaceDuplicates, message = '+ex.message);
		}
    }

    
    return {
    	pageInit:pageInit,
        fieldChanged: fieldChanged
    };
    
});
