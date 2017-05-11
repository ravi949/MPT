/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 Dec 2016     sayyadtajuddin
 * on item field change getting the valid estimated volume by list and adding to the field.
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function estVolumePageInit(type){
	if(type == 'create'){
		nlapiSetFieldValue('custpage_estvol_item','');
	}else if(type == 'edit'){
		var responseBody = getEstimatedVolume(name),
		selectedEstVolBy = nlapiGetFieldValue('custrecord_itpm_estqty_qtyby');
		if(responseBody.success){
			var list = responseBody.unitList;
			for(i in list){
				nlapiInsertSelectOption('custpage_est_vol_by',list[i].internalid , list[i].name,list[i].internalid  == selectedEstVolBy);
			}
		}
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function estVolumeByChanged(type, name, linenum){
	if(name == 'custrecord_itpm_estqty_item'){
		var responseBody = getEstimatedVolume(name);
		if(responseBody.success){
			var list = responseBody.unitList;
			for(i in list){
				nlapiInsertSelectOption('custpage_est_vol_by',list[i].internalid , list[i].name,false);
			}
		}	
	}
}

//get estimated volume options
function getEstimatedVolume(){
	var requestURL = nlapiResolveURL('SUITELET','customscript_itpm_allownc_item_unit_type','customdeploy_itpm_allownc_item_unit_type'),
	itemId = nlapiGetFieldValue('custrecord_itpm_estqty_item'),
	response = nlapiRequestURL(requestURL+'&itemId='+itemId+'&alluom=false',null,null,'GET'),
	responseBody = JSON.parse(response.body);
	nlapiRemoveSelectOption('custpage_est_vol_by');
	return responseBody;
}
