/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 */
define(['N/search', 'N/record', 'N/util'],

function(search, record, util) {
    
	/**
     * function getSpend({returnZero: false, quantity: leQuantity, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB})
     * Function to calculate the spend amount
     * 
     * @params {object} objParameter {returnZero: boolean, quantity: string, rateBB: string, rateOI: string, rateNB: string}
     * @returns {object}
     */
    function getSpend(objParameter) {
    	try{
    		if(objParameter.returnZero) return {error: false, spend: 0};
    		var qty = parseFloat(objParameter.quantity),
			rateBB = (objParameter.rateBB == '' || objParameter.rateBB == null || !objParameter.rateBB)? 0 : parseFloat(objParameter.rateBB),
			rateOI = (objParameter.rateOI == '' || objParameter.rateOI == null || !objParameter.rateOI)? 0 : parseFloat(objParameter.rateOI),
			rateNB = (objParameter.rateNB == '' || objParameter.rateNB == null || !objParameter.rateNB)? 0 : parseFloat(objParameter.rateNB);
		var eSpendBB = qty * rateOI, eSpendOI = qty * rateOI, eSpendNB = qty * rateNB;
		return {error: false, spend: eSpendBB + eSpendOI + eSpendNB, bb: eSpendBB, oi: eSpendOI, nb: eSpendNB};
    	} catch(ex) {
    		return {error: true, name: 'SPEND_MODULE', message: ex.name + '; ' + ex.message + '; objParameter: ' + JSON.stringify(objParameter)};
    	}
    }
    
    /**
     * function getLiability({returnZero: false, quantity: leQuantity, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB})
     * Function to calculate the Liability
     * 
     * @params {object} objParameter {returnZero: boolean, quantity: string, rateBB: string, rateOI: string, rateNB: string, redemption: string}
     * @returns {object}
     */
    function getLiability(objParameter) {
    	try{
    		if(objParameter.returnZero) return {error: false, liability: 0};
    		var qty = parseFloat(objParameter.quantity),
			rateBB = (objParameter.rateBB == '' || objParameter.rateBB == null || !objParameter.rateBB)? 0 : parseFloat(objParameter.rateBB),
			rateOI = (objParameter.rateOI == '' || objParameter.rateOI == null || !objParameter.rateOI)? 0 : parseFloat(objParameter.rateOI),
			rateNB = (objParameter.rateNB == '' || objParameter.rateNB == null || !objParameter.rateNB)? 0 : parseFloat(objParameter.rateNB),
			rFactor = (objParameter.redemption == '' || objParameter.redemption == null || !objParameter.redemption)? 0 : parseFloat(objParameter.redemption);
    		rFactor /= 100;
		var expBB = qty * rateBB * rFactor, expOI = qty * rateOI, expNB = qty * rateNB;
		return {error: false, liability: expBB + expOI + expNB, bb: expBB, oi: expOI, nb: expNB};
    	} catch(ex) {
    		return {error: true, name: 'LIABILITY_MODULE', message: ex.name + '; ' + ex.message + '; objParameter: ' + JSON.stringify(objParameter)};
    	}
    }
    
    /**
     * function getItemUnits(itemid)
     * Function to get all units applicable to an item
     * 
     * @params {string} itemId Internal Id of the Item record
     * @returns {object}
     */
    function getItemUnits(itemId) {
    	try{
    		var unitArray = [];
    		var unitsType = search.lookupFields({
        		type: search.Type.INVENTORY_ITEM,
        		id: itemId,
        		columns: 'unitstype'
        	});
        	if (!unitsType.unitstype){
        		throw {
        			name: 'ITEM_UNITS_MODULE',
        			message: 'Item units type search returned null. ItemID: ' + itemId
        		};
        	}
        	var unitRecord = record.load({
        		type: record.Type.UNITS_TYPE,
        		id: unitsType.unitstype[0].value
        	});
        	var sublistLines = unitRecord.getLineCount({sublistId: 'uom'});
        	for (var u = 0; u < sublistLines; u++){
        		unitArray.push({
        			id: unitRecord.getSublistValue({sublistId: 'uom', line: u, fieldId: 'internalid'}),
        			name: unitRecord.getSublistValue({sublistId: 'uom', line: u, fieldId: 'unitname'}),
        			isBase: unitRecord.getSublistValue({sublistId: 'uom', line: u, fieldId: 'baseunit'}),
        			conversionRate: unitRecord.getSublistValue({sublistId: 'uom', line: u, fieldId: 'conversionrate'})
        		});
        	}
        	return {error:false, unitArray: unitArray};
    	} catch (ex) {
    		return {error: true, name: 'ITEM_UNITS_MODULE', message: ex.name + '; ' + ex.message + '; itemId: ' + itemId};
    	}
    }
	
	/**
	 * function getActualQty(itemid, customerid, startdate, enddate)
     * Function to search for item fulfillments based on Item Id, Customer Id, and date range
     * 
     * @params {string} itemId		Internal ID of the Item
     * @params {string} customerId	Internal ID of the customer
     * @params {string} shipStart	Date
     * @params {string} shipEnd		Date
     * @returns {object}
     */
    function getActualQty(itemId, customerId, shipStart, shipEnd){
    	try{
    		var qtySearch = search.create({
        		type: search.Type.ITEM_FULFILLMENT,
        		columns: [{name: 'quantity', summary:'SUM'}]
        	});
        	qtySearch.filters.push(search.createFilter({
        		name: 'item',
        		operator: search.Operator.ANYOF,
        		values: itemId
        	}));
        	qtySearch.filters.push(search.createFilter({
        		name: 'entity',
        		operator: search.Operator.ANYOF,
        		values: customerId
        	}));
        	qtySearch.filters.push(search.createFilter({
        		name: 'trandate',
        		operator: search.Operator.WITHIN,
        		values: [shipStart, shipEnd]
        	}));
        	qtySearch.filters.push(search.createFilter({
        		name: 'status',
        		operator: search.Operator.ANYOF,
        		values: 'ItemShip:C'
        	}));
        	var qty = qtySearch.run().getRange(0,1);
        	return {error:false, qty: qty[0].getValue({name: 'quantity', summary:'SUM'})};
    	} catch(ex) {
    		return {error: true, name: 'ACTUAL_QTY_MODULE', message: ex.name + '; ' + ex.message + '; item: ' + itemId +'; customer: ' + customerId +'; between: ' + shipStart + ' & ' + shipEnd};
    	}
    }
    
    return {
    	getItemUnits : getItemUnits,
    	getActualQty : getActualQty,
    	getLiability : getLiability,
    	getSpend : getSpend
    };
    
});