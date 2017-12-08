/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 */
define(['N/search', 'N/record', 'N/util', 'N/runtime'],

function(search, record, util, runtime) {
	
	/**
	 * function locationEnabled()
	 * Returns a boolean to indicate whether the Locations feature is enabled.
	 * @returns {string}
	 */
	function locationsEnabled() {
		try{
			var featureEnabled = runtime.isFeatureInEffect({feature:'LOCATIONS'});
			var currentUser = runtime.getCurrentUser();
			var currentScript = runtime.getCurrentScript();
			var currentSession = runtime.getCurrentSession();
//			log.debug('locationsEnabled', featureEnabled + '\r\n User: ' + JSON.stringify(currentUser) + '\r\n Session: ' + JSON.stringify(currentSession) + '\r\n Script: ' + JSON.stringify(currentScript));
			return featureEnabled;
		} catch(ex) {
			var message = JSON.stringify(runtime.getCurrentUser()) + '\r\n ' + JSON.stringify(runtime.getCurrentSession()) + '\r\n ' + JSON.stringify(runtime.getCurrentScript());
			log.error(ex.name, ex.message + '; additionalDetails: ' + message);
			return false;
		}
	}
	
	/**
	 * function departmentEnabled()
	 * Returns a boolean to indicate whether the Departments feature is enabled.
	 * @returns {string}
	 */
	function departmentsEnabled() {
		try{
			var featureEnabled = runtime.isFeatureInEffect({feature:'DEPARTMENTS'});
			var currentUser = runtime.getCurrentUser();
			var currentScript = runtime.getCurrentScript();
			var currentSession = runtime.getCurrentSession();
//			log.debug('departmentsEnabled', featureEnabled + '\r\n User: ' + JSON.stringify(currentUser) + '\r\n Session: ' + JSON.stringify(currentSession) + '\r\n Script: ' + JSON.stringify(currentScript));
			return featureEnabled;
		} catch(ex) {
			var message = JSON.stringify(runtime.getCurrentUser()) + '\r\n ' + JSON.stringify(runtime.getCurrentSession()) + '\r\n ' + JSON.stringify(runtime.getCurrentScript());
			log.error(ex.name, ex.message + '; additionalDetails: ' + message);
			return false;
		}
	}
	
	/**
	 * function classesEnabled()
	 * Returns a boolean to indicate whether the Classes feature is enabled.
	 * @returns {string}
	 */
	function classesEnabled() {
		try{
			var featureEnabled = runtime.isFeatureInEffect({feature:'CLASSES'});
			var currentUser = runtime.getCurrentUser();
			var currentScript = runtime.getCurrentScript();
			var currentSession = runtime.getCurrentSession();
//			log.debug('classesEnabled', featureEnabled + '\r\n User: ' + JSON.stringify(currentUser) + '\r\n Session: ' + JSON.stringify(currentSession) + '\r\n Script: ' + JSON.stringify(currentScript));
			return featureEnabled;
		} catch(ex) {
			var message = JSON.stringify(runtime.getCurrentUser()) + '\r\n ' + JSON.stringify(runtime.getCurrentSession()) + '\r\n ' + JSON.stringify(runtime.getCurrentScript());
			log.error(ex.name, ex.message + '; additionalDetails: ' + message);
			return false;
		}
	}
	
	/**
	 * function subsidiariesEnabled()
	 * Returns a boolean to indicate whether the Subsidiaries feature is enabled.
	 * @returns {string}
	 */
	function subsidiariesEnabled() {
		try{
			var featureEnabled = runtime.isFeatureInEffect({feature:'SUBSIDIARIES'});
			var currentUser = runtime.getCurrentUser();
			var currentScript = runtime.getCurrentScript();
			var currentSession = runtime.getCurrentSession();
//			log.debug('subsidiariesEnabled', featureEnabled + '\r\n User: ' + JSON.stringify(currentUser) + '\r\n Session: ' + JSON.stringify(currentSession) + '\r\n Script: ' + JSON.stringify(currentScript));
			return featureEnabled;
		} catch(ex) {
			var message = JSON.stringify(runtime.getCurrentUser()) + '\r\n ' + JSON.stringify(runtime.getCurrentSession()) + '\r\n ' + JSON.stringify(runtime.getCurrentScript());
			log.error(ex.name, ex.message + '; additionalDetails: ' + message);
			return false;
		}
	}
	
	/**
	 * function currenciesEnabled()
	 * Returns a boolean to indicate whether the Subsidiaries feature is enabled.
	 * @returns {string}
	 */
	function currenciesEnabled() {
		try{
			var featureEnabled = runtime.isFeatureInEffect({feature:'MULTICURRENCY'});
			var currentUser = runtime.getCurrentUser();
			var currentScript = runtime.getCurrentScript();
			var currentSession = runtime.getCurrentSession();
//			log.debug('currenciesEnabled', featureEnabled + '\r\n User: ' + JSON.stringify(currentUser) + '\r\n Session: ' + JSON.stringify(currentSession) + '\r\n Script: ' + JSON.stringify(currentScript));
			return featureEnabled;
		} catch(ex) {
			var message = JSON.stringify(runtime.getCurrentUser()) + '\r\n ' + JSON.stringify(runtime.getCurrentSession()) + '\r\n ' + JSON.stringify(runtime.getCurrentScript());
			log.error(ex.name, ex.message + '; additionalDetails: ' + message);
			return false;
		}
	}
	
	
    
	/**
     * function getSpend({returnZero: false, quantity: leQuantity, rateBB: values.estRateBB, rateOI: values.estRateOI, rateNB: values.estRateNB})
     * Function to calculate the spend amount
     * 
     * @params {object} objParameter {returnZero: boolean, quantity: string, rateBB: string, rateOI: string, rateNB: string}
     * @returns {object}
     */
    function getSpend(objParameter) {
    	try{
//    		log.debug('getSpend', objParameter);
    		if(objParameter.returnZero) return {error: false, spend: 0, bb: 0, oi: 0, nb: 0};
    		var qty = parseFloat(objParameter.quantity),
			rateBB = (objParameter.rateBB == '' || objParameter.rateBB == null || !objParameter.rateBB)? 0 : parseFloat(objParameter.rateBB),
			rateOI = (objParameter.rateOI == '' || objParameter.rateOI == null || !objParameter.rateOI)? 0 : parseFloat(objParameter.rateOI),
			rateNB = (objParameter.rateNB == '' || objParameter.rateNB == null || !objParameter.rateNB)? 0 : parseFloat(objParameter.rateNB);
//    		log.debug('getSpend_Values', 'qty: ' + qty + ', rateBB: ' + rateBB + ', rateOI: ' + rateOI + ', rateNB: ' + rateNB);
		var eSpendBB = qty * rateBB;
		var eSpendOI = qty * rateOI; 
		var eSpendNB = qty * rateNB;
//		log.debug('getSpend_Spends', 'qty: ' + qty + ', eSpendBB: ' + eSpendBB + ', eSpendOI: ' + eSpendOI + ', eSpendNB: ' + eSpendNB);
		//return {error: false, spend: eSpendBB + eSpendOI + eSpendNB, bb: eSpendBB, oi: eSpendOI, nb: eSpendNB};
		return {error: false, spend: qty*(rateBB + rateOI + rateNB), bb: qty*rateBB, oi: qty*rateOI, nb: qty*rateNB};
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
//    		log.debug('getLiability', objParameter);
    		if(objParameter.returnZero) return {error: false, liability: 0, bb: 0, oi: 0, nb: 0};
    		var qty = parseFloat(objParameter.quantity),
			rateBB = (objParameter.rateBB == '' || objParameter.rateBB == null || !objParameter.rateBB)? 0 : parseFloat(objParameter.rateBB),
			rateOI = (objParameter.rateOI == '' || objParameter.rateOI == null || !objParameter.rateOI)? 0 : parseFloat(objParameter.rateOI),
			rateNB = (objParameter.rateNB == '' || objParameter.rateNB == null || !objParameter.rateNB)? 0 : parseFloat(objParameter.rateNB),
			rFactor = (objParameter.redemption == '' || objParameter.redemption == null || !objParameter.redemption)? 0 : parseFloat(objParameter.redemption);
    		rFactor /= 100;
//    		log.debug('getLiability_Values', 'qty: ' + qty + ', rateBB: ' + rateBB + ', rateOI: ' + rateOI + ', rateNB: ' + rateNB + ', rFactor: ' + rFactor);
		//var expBB = qty * rateBB * rFactor, expOI = qty * rateOI, expNB = qty * rateNB;
		//return {error: false, liability: expBB + expOI + expNB, bb: expBB, oi: expOI, nb: expNB};
    		return {error: false, liability: qty*((rateBB*rFactor)+rateOI+rateNB), bb: qty*rateBB*rFactor, oi: qty*rateOI, nb: qty*rateNB};
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
        		type: search.Type.ITEM,
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
        	qty = qty[0].getValue({name: 'quantity', summary:'SUM'});
        	qty = (qty == '' || qty == null || !qty)? 0 : parseFloat(qty);
        	return {error:false, quantity: qty};
    	} catch(ex) {
    		return {error: true, name: 'ACTUAL_QTY_MODULE', message: ex.name + '; ' + ex.message + '; item: ' + itemId +'; customer: ' + customerId +'; between: ' + shipStart + ' & ' + shipEnd};
    	}
    }
    
    
    /**
	 * function getPrefrenceValues()
     * @returns {object}
     */
	function getPrefrenceValues(){
		try{
			var prefObj = {}
			search.create({
				type:'customrecord_itpm_preferences',
				columns:['custrecord_itpm_pref_ddnaccount',
						 'custrecord_itpm_pref_settlementsaccount',
						 'custrecord_itpm_pref_expenseaccount',
						 'custrecord_itpm_pref_discountdates',
						 'custrecord_itpm_pref_defaultalltype',
						 'custrecord_itpm_pref_defaultpricelevel'
						],
				filters:[]
			}).run().each(function(e){
				prefObj = {
						dednExpAccnt : e.getValue('custrecord_itpm_pref_ddnaccount'),
						expenseAccnt : e.getValue('custrecord_itpm_pref_expenseaccount'),
						accountPayable : e.getValue('custrecord_itpm_pref_settlementsaccount'),
						prefDiscountDate: e.getText('custrecord_itpm_pref_discountdates'),
						defaultAllwType: e.getValue('custrecord_itpm_pref_defaultalltype'),
						defaultPriceLevel:e.getValue('custrecord_itpm_pref_defaultpricelevel')
				}
			})
			return prefObj;
		}catch(e){
			return{error:true,name:'Preference error',message:e.message};
		}
	}
    
	/**
	 * function getClassifications(subid, rectype, subsidiaryExists)
	 * @subid {Number}
	 * @rectype {String}
	 * @subsidiaryExists {Boolean}
	 * 
	 * @returns {Array}
	 */
	//getting the Class,Department and Location list based on subsidiary.
    function getClassifications(subid, rectype, subsidiariesEnabled){
    	try{
    		switch(rectype){
        	case 'class':
        		rectype = search.Type.CLASSIFICATION;
        		break;
        	case 'dept':
        		rectype = search.Type.DEPARTMENT;
        		break;
        	case 'location':
        		rectype = search.Type.LOCATION;
        		break;
        	}
        	
        	var classificationFilter = [['isinactive','is',false]];
        	var listOfClassifications = [];
        	
        	if(subsidiariesEnabled){
        		classificationFilter.push('and');
        		classificationFilter.push(['subsidiary','anyof',subid]);
        	}
        	search.create({
        		type:rectype,
        		columns:['internalid','name'],
        		filters:classificationFilter
        	}).run().each(function(e){
        		listOfClassifications.push({name:e.getValue('name'),id:e.getValue('internalid')});
        		return true;
        	});
        	
        	return listOfClassifications;
        	
    	}catch(e){
    		log.error(e.name,'error in classifications '+e.message);
    	}
    	
    }
    
    /**
     * @param params
     * @returns
     * @description setting the Impact Price Value in allowance record.
     */
	function getImpactPrice(params){
		try{
			var price = undefined;
			var itemResult = search.create({
				type:search.Type.ITEM,
				columns:['pricing.pricelevel','pricing.unitprice','baseprice','saleunit'],
				filters:[['internalid','anyof',params.itemid],'and',
					['pricing.pricelevel','is',params.pricelevel],'and',
					['isinactive','is',false]
				]
			}).run().getRange(0,1);
			price = itemResult[0].getValue({name:'unitprice',join:'pricing'});
			price = (isNaN(price))?params.baseprice:price;
			return {
				price:price,
				baseprice:itemResult[0].getValue({name:'baseprice'}),
				saleunit:itemResult[0].getValue({name:'saleunit'})
			};
		}catch(e){
			log.error(e.name,'error ocurred in function = setPriceValue');
		}
	}
	
	/**
	 * allid {String} Allownace id
	 * @returns
	 * @description getting the Allownace Default MOP value
	 */
	function getDefaultValidMOP(allid){
		var ptMOP = search.lookupFields({
			type:'customrecord_itpm_promotiontype',
			id:allid,
			columns:['custrecord_itpm_pt_validmop']
		});
		var defaultMOP;
		ptMOP['custrecord_itpm_pt_validmop'].forEach(function(e){
			switch(e.value){
			case '1':
				defaultMOP = 1;
				break;
			case '3':
				defaultMOP = (defaultMOP != 1)?3:defaultMOP;
				break;
			default:
				defaultMOP = (defaultMOP != 1 && defaultMOP != 3)?2:defaultMOP;
			break;
			}
		});
		return defaultMOP;
	}
    
	/**
     * @param itemId
     * @returns Array
     * @description it created the array of member items from item group
     */
    function getItemGroupItems(itemGroupRec,needDuplicates,needNotAllowed){
    	var itemCount = itemGroupRec.getLineCount('member');
    	var items = [{memberid:''}];
    	var memberid;
    	for(var i = 0;i<itemCount;i++){
    		memberid = itemGroupRec.getSublistValue({
				sublistId:'member',
				fieldId:'item',
				line:i
			});
    		var itemLookup = search.lookupFields({
    			type:search.Type.ITEM,
    			id:memberid,
    			columns:['custitem_itpm_available','saleunit','baseprice','unitstype','itemid']
    		});
    		if(needNotAllowed || itemLookup['custitem_itpm_available']){
    			if(needDuplicates || items.some(function(e){return e.memberid != memberid})){
    				items.push({
        				memberid:memberid,
        				saleunit:itemLookup['saleunit'][0].value,
        				unitstype:itemLookup['unitstype'][0].value,
        				baseprice:itemLookup['baseprice'],
        				isAvailable:itemLookup['custitem_itpm_available']
        			});
    			}
    		}
    	}
    	items.shift();
    	return items;
    }
	
    /**
     * @param recordtype id
     * @return permission id
     */
    function getUserPermission(rectypeId){
    	var userObj = runtime.getCurrentUser();
		var scriptObj = runtime.getCurrentScript();
		return userObj.getPermission('LIST_CUSTRECORDENTRY'+rectypeId);
    }
	
    return {
    	getItemUnits : getItemUnits,
    	getActualQty : getActualQty,
    	getLiability : getLiability,
    	getSpend : getSpend,
    	getImpactPrice:getImpactPrice,
    	getDefaultValidMOP:getDefaultValidMOP,
    	getPrefrenceValues:getPrefrenceValues,
    	getItemGroupItems:getItemGroupItems,
    	locationsEnabled : locationsEnabled,
    	departmentsEnabled : departmentsEnabled,
    	classesEnabled : classesEnabled,
    	subsidiariesEnabled:subsidiariesEnabled,
    	currenciesEnabled:currenciesEnabled,
    	getClassifications:getClassifications,
    	getUserPermission:getUserPermission
    };
    
});
