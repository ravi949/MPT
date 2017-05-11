/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 * 
 * this script undeployed
 */
function itemFieldChanged(type, name, linenum){
	if(name == 'custrecord_itpm_all_uom'){
		console.log(nlapiGetFieldValue('custrecord_itpm_all_uom'));
		//calculate UOM Price after field change in price (in allowance)
		// when entering or editing an allowance, I need to see price in all valid UOMs (UOM Price)
		getUnitList('custrecord_itpm_all_uom',true);
	}	
}

function getUnitList(name,finduomprice){
	var requestURL = nlapiResolveURL('SUITELET','customscript_itpm_allownc_item_unit_type','customdeploy_itpm_allownc_item_unit_type'),
	itemId = nlapiGetFieldValue('custrecord_itpm_all_item'),
	price = nlapiGetFieldValue('custrecord_itpm_all_impactprice'),
	alluom = (!finduomprice)?finduomprice:nlapiGetFieldValue(name),
	response = nlapiRequestURL(requestURL+'&itemId='+itemId+'&alluom='+alluom+'&price='+price,null,null,'GET'),
	responseBody = JSON.parse(response.body);
	//here it setting the all valid UOM's price values and return value is used in list out the unit list.
	console.log(responseBody)
	nlapiSetFieldValue('custrecord_itpm_all_uomprice',(responseBody.uomprice)?responseBody.uomprice.toFixed(2):'');
	return responseBody;
}

