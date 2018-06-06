/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 * Client script to perform actions on the iTPM Allowance record during Create or Edit.
 */
define(['N/ui/message',
		'N/url',
		'N/https',
		'N/search',
		'N/ui/dialog',
		'N/ui/message',
		'N/record'
		],

function(message, url, https, search, dialog, message, record) {

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
			if(rec.id=='' && mode != 'create'){
				rec.setValue({
					fieldId:'custrecord_itpm_all_type',
					value:''
				});
			}
			if(mode == 'edit' || mode =='copy'){
				var objResponse = getUnits(rec,rec.getValue({fieldId: 'custrecord_itpm_all_item'}));
				if(mode == 'edit'){
					var disableADD = checkForAllowaceDuplicates(mode,rec);
					if(disableADD != 0 && disableADD != -1){
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
			var iTemId;
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
				if(itemGroupSelected(rec,itemId)){  //setting item group units to the view
					setItemSourcePrices(rec,itemId); //set effected price values
				}
			}else if(fieldId == 'custrecord_itpm_all_uom'){
				var unitId = rec.getValue({fieldId: 'custrecord_itpm_all_uom'});
				if(unitId > 0){
					getConversionRate(rec, unitId);
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
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
    	if(mode == 'create'){
    		showPopUpBanner(scriptContext.currentRecord.getValue({fieldId:'custrecord_itpm_all_item'}));
    	}	
    	return true;
    }
	
	/**
	 * @param rec
	 * @param itemId
	 * @description Sets the price values which is based on item
	 */
	function setItemSourcePrices(rec, itemId){
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

			var objResponse = getUnits(rec,itemId);

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
   } 
	
	/**
	 * @param {object} rec
	 * @param {number} itemId
	 * @return {boolean} item group or not
	 */
	function itemGroupSelected(rec, itemId){
		var itemSearchRes = search.create({
		    type:search.Type.ITEM,
		    columns:['memberitem'],
		    filters:[['internalid','is',itemId]]
		}).run().getRange(0,1);
		var itemUnitField = rec.getField({fieldId:'custpage_itpm_all_unit'});
		if(itemSearchRes[0]['recordType'] == search.Type.ITEM_GROUP){
			getUnits(rec,itemSearchRes[0].getValue('memberitem'));
			rec.setValue({fieldId:'custrecord_itpm_all_impactprice',value:0});
			rec.setValue({fieldId:'custrecord_itpm_all_uom',value:''});
			rec.setValue({fieldId:'custrecord_itpm_all_uomprice',value:0});
			return false;
		}
		return true;
	}
	
	/**
	 * Function to call a Suitelet and return an array of key:value pairs of units
	 * @param {object} rec
	 * @param {number} id
	 */
	function getUnits(rec, id) {
		try{
			var output = url.resolveScript({
				scriptId:'customscript_itpm_su_getitemunits',
				deploymentId:'customdeploy_itpm_su_getitemunits',
				params: {itemid : id, unitid: null, price:false}
			});

			https.get.promise({
				url: output
			}).then(function(response){
				var objResponse =  JSON.parse(response.body);
				var unitField = rec.getField({fieldId: 'custpage_itpm_all_unit'});
				console.log(objResponse);
				if (objResponse.success){
					unitField.removeSelectOption({value:null});
					var unitsList = objResponse.unitsList;
					unitField.insertSelectOption({
						value: " ",
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
				}else {
					log.error('Response Object', 'Error returned in Units List.');
				}
			});
		} catch(ex) {
			log.error(ex.name,'record type = iTPM Allowance, function name = getUnits message = '+ex.message);
			console.log(ex.name,'record type = iTPM Allowance, function name = getUnits message = '+ex.message);
		}
	}

	/**
	 * Function to call a Suitelet and return a decimal number
	 * @param {object} rec
	 * @param {number} unitId
	 */
	function getConversionRate(rec, unitid) {
		try{
			var itemId = rec.getValue({fieldId: 'custrecord_itpm_all_item'});
			var dynUnit = rec.getValue({fieldId: 'custpage_itpm_all_unit'});
			var itemLookup = search.lookupFields({type:search.Type.ITEM,id:itemId,columns:['saleunit','recordtype']});
			if(itemLookup['recordtype'] != search.Type.ITEM_GROUP){
				var itemSaleUnit = itemLookup['saleunit'][0].value;
				var output = url.resolveScript({
					scriptId:'customscript_itpm_su_getitemunits',
					deploymentId:'customdeploy_itpm_su_getitemunits',
					params: {itemid : itemId, unitid: null, price:false}
				});

				https.get.promise({
					url:output
				}).then(function(response){
					var objResponse =  JSON.parse(response.body);
					console.log(objResponse);
					if (objResponse.success){
						var itemUnitRate = parseFloat(objResponse.unitsList.filter(function(e){return e.internalId == itemSaleUnit})[0].rate);
						var rate = (dynUnit)? parseFloat(objResponse.unitsList.filter(function(e){return e.internalId == dynUnit})[0].rate) : 0;
						rec.setValue({
							fieldId: 'custrecord_itpm_all_uomprice',
							value: parseFloat(rec.getValue({fieldId: 'custrecord_itpm_all_impactprice'}))*(rate/itemUnitRate),
							ignoreFieldChange: true
						});
					} else {
						log.error('Response Object', 'Error returned in conversion rate.');
					}
				});
			}else{
				rec.setValue({fieldId: 'custrecord_itpm_all_uomprice',value: 0,ignoreFieldChange: true})
				   .setValue({fieldId:'custrecord_itpm_all_itembaseprice',value:0});
			}
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
			var allFilter = [['custrecord_itpm_all_promotiondeal','anyof',promo],'and',
				['custrecord_itpm_all_item','anyof',item],'and',
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

	/**
	 * Function to Show Pop Up banner when item count exceeds 25
	 * @param {number} itemId
	 */
	function showPopUpBanner(itemId){
		try{
			var recObj = record.load({
				type:record.Type.ITEM_GROUP,
				id: itemId
			});
			var lineItemCount = recObj.getLineCount('member');
			log.debug('lineItemCount ',lineItemCount);
			
			if(lineItemCount >= 2){
				var myMsg = message.create({
			        title: "Information", 
			        message: "Please Wait", 
			        type: message.Type.CONFIRMATION
			    }).show({duration: 100000});
			}
		}
		catch(ex){
			console.log(ex.name,ex.message);
			console.log(ex.name,ex.message);
		}
	}


	return {
		pageInit:pageInit,
		fieldChanged: fieldChanged,
		saveRecord: saveRecord
	};

});
