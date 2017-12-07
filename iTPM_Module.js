/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 */
define(['N/search', 
		'N/record', 
		'N/util',
		'N/runtime'
		],

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
						 'custrecord_itpm_pref_matchls',
						 'custrecord_itpm_pref_matchbb',
						 'custrecord_itpm_pref_settlementsaccount',
						 'custrecord_itpm_pref_expenseaccount',
						 'custrecord_itpm_pref_discountdates',
						 'custrecord_itpm_pref_defaultalltype',
						 'custrecord_itpm_pref_defaultpricelevel'
						],
				filters:[]
			}).run().each(function(e){
				prefObj = {
						perferenceLS : e.getValue('custrecord_itpm_pref_matchls'),
						perferenceBB : e.getValue('custrecord_itpm_pref_matchbb'),
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
	
    /**
     * @param Object obj
     */
    function calculateEstAllocationsBBOIDraft(obj){
    	try{
    		log.debug('obj',obj);
    		
    		//Commenting: If throws error please use "promestspendbb" instead of "totalestspend"
            var promSearchObj = record.load({
    			type: "customrecord_itpm_promotiondeal",
    			id: obj['promoId']
    		});
    		var totalestspend = promSearchObj.getValue(obj['promoEstimatedSpend']);
    		log.debug('totalestspend', totalestspend);
    		
        	//Fetching Estimated Spend: BB from Promotion record
    		var promSearchObjbb = search.create({
    			type: "customrecord_itpm_promotiondeal",
    			filters: [
    				["internalid", "anyof", obj['promoId']],
    				"AND",
    				["custrecord_itpm_kpi_promotiondeal.isinactive", "is", "F"]
    				],
    			columns: [ 
    				search.createColumn({
    					name: obj['kpiEstimatedSpend'],
    					join: "CUSTRECORD_ITPM_KPI_PROMOTIONDEAL",
    					summary: "SUM",
    					sort: search.Sort.ASC
    				})
    				]
    		});
    	
    		var promestspendbb = promSearchObjbb.run().getRange(0,1)[0].getValue({
    			name:obj['kpiEstimatedSpend'],
    			join: "CUSTRECORD_ITPM_KPI_PROMOTIONDEAL",
    			summary:search.Summary.SUM
    		});
    		log.debug('Promotion Estimate Spend: BB(SUM)', promestspendbb);
    		
    		//validating whether Estimated Spend: BB is GREATER THAN ZERO: If YES
    		if(promestspendbb > 0){
    			log.debug('<<<<< BB or OI YES >>>>>', obj['mop']);
    			//Counting Items IF MOP is BB
    			var promoallowanceSearchObj = search.create({
    				type: "customrecord_itpm_promoallowance",
    				filters: [
    					["custrecord_itpm_all_promotiondeal","anyof",obj['promoId']], 
    					"AND", 
    					["isinactive","is","F"], 
    					"AND", 
    					["custrecord_itpm_all_mop","anyof",obj['mop']]
    					],
    				columns: [
    				      "custrecord_itpm_all_item"
    					]
    			});
    			
    			var items = [];
    			
    			promoallowanceSearchObj.run().each(function(result){
    				items.push(result.getValue('custrecord_itpm_all_item'));
    				return true;
    			});

    			var kpiitemcount_searchObj = search.create({
    				type: "customrecord_itpm_kpi",
    				filters: [
    					["isinactive","is","F"], 
    					"AND", 
    					["custrecord_itpm_kpi_promotiondeal","anyof",obj['promoId']], 
    					"AND", 
    					["custrecord_itpm_kpi_item","anyof",items]
    					],
    					columns: [
    						search.createColumn({
    							name: "id",
    							sort: search.Sort.ASC
    						})
    					]
    			});
    				
    			var itemcount = kpiitemcount_searchObj.runPaged().count;
    			log.debug('KPI Item Count on Promotion', itemcount);
    			
    			if(itemcount == 1){
    				obj['kpiValues'][Object.keys(obj.kpiValues)[1]] = true;
    				log.audit('checkbox', obj['kpiValues']);
    				//Updating the related KPI record
        			var kpiRecUpdate = record.submitFields({
                		type: 'customrecord_itpm_kpi',
                		id: (kpiitemcount_searchObj.run().getRange({start:0, end:1}))[0].getValue({ name:'id'}),
                		values: obj['kpiValues'],
                		options: {enablesourcing: true, ignoreMandatoryFields: true}
                	});
        			log.debug('kpiRecUpdate(only 1 item)',kpiRecUpdate);
    			}
    			else if(itemcount > 1){
    				var i = itemcount;
    				var sumallfactors_except_last = 0;
    				kpiitemcount_searchObj.run().each(function(result){
    					log.debug('id', result.getValue({name:'id'}));
    					
    					//fetching Total Est.Qty. and Est.Qty. from KPI record
    					var fieldLookUp = search.lookupFields({
    	    	    	    type    : 'customrecord_itpm_kpi',
    	    	    	    id      : result.getValue({name:'id'}),
    	    	    	    columns : [obj['kpiEstimatedSpend']]
    	    	    	});
    	    	    	var eq = fieldLookUp[obj['kpiEstimatedSpend']];
    	    	    	
    	    	    	if(i==1){
    	    				obj['kpiValues'][Object.keys(obj.kpiValues)[1]] = true;
    	    	    		obj['kpiValues'][Object.keys(obj.kpiValues)[0]] = parseInt(((1-sumallfactors_except_last).toFixed(6)*100000))/100000;
    						//Updating the related KPI record
    	        			var kpiRecUpdate = record.submitFields({
    	                		type: 'customrecord_itpm_kpi',
    	                		id: result.getValue({name:'id'}),
    	                		values: obj['kpiValues'],
    	                		options: {enablesourcing: true, ignoreMandatoryFields: true}
    	                	});
    	        			
    	        			log.debug('kpiRecUpdate(last item)',kpiRecUpdate);
    					}else{
    						log.debug('BEFORE: sumallfactors_except_last', sumallfactors_except_last);
    						final_total_eq = (totalestspend <= 0)?0:(parseFloat((eq/totalestspend)));
    						obj['kpiValues'][Object.keys(obj.kpiValues)[0]] = parseInt(final_total_eq.toFixed(6)*100000)/100000;
    						sumallfactors_except_last = (parseFloat(sumallfactors_except_last)+final_total_eq).toFixed(6);
    						sumallfactors_except_last = parseInt((sumallfactors_except_last*100000))/100000;
    						log.debug('AFTER: sumallfactors_except_last', sumallfactors_except_last);
    						//Updating the related KPI record
    	        			var kpiRecUpdate = record.submitFields({
    	                		type: 'customrecord_itpm_kpi',
    	                		id: result.getValue({name:'id'}),
    	                		values:obj['kpiValues'],
    	                		options: {enablesourcing: true, ignoreMandatoryFields: true}
    	                	});
    	        			log.debug('kpiRecUpdate',kpiRecUpdate);
    					}
    					i--;
    					return true;
    				});
    			}
    		}
    		//If NO
    		else{
    			log.debug('<<<<< BB or OI NO >>>>>', obj['mop']);
    			var promoallowanceSearchObj = search.create({
    				type: "customrecord_itpm_promoallowance",
    				filters: [
    					["custrecord_itpm_all_promotiondeal","anyof",obj['promoId']], 
    					"AND", 
    					["isinactive","is","F"], 
    					"AND", 
    					["custrecord_itpm_all_mop","anyof",obj['mop']]
    					],
    				columns: [
    				      "custrecord_itpm_all_item"
    					]
    			});
    			
    			var totalitemCountOnProm = promoallowanceSearchObj.runPaged().count;
    			log.debug('totalitemCountOnProm', totalitemCountOnProm);
    			
    			if(totalitemCountOnProm > 0){
    				var items = [];
    				
    				promoallowanceSearchObj.run().each(function(result){
    					items.push(result.getValue('custrecord_itpm_all_item'));
    					return true;
    				});

    				var kpiitemcount_searchObj = search.create({
    					type: "customrecord_itpm_kpi",
    					filters: [
    						["isinactive","is","F"], 
    						"AND", 
    						["custrecord_itpm_kpi_promotiondeal","anyof",obj['promoId']], 
    						"AND", 
    						["custrecord_itpm_kpi_item","anyof",items]
    						],
    						columns: [
    							search.createColumn({
    								name: "id",
    								sort: search.Sort.ASC
    							})
    						]
    				});
    					
    				var itemcount = kpiitemcount_searchObj.runPaged().count;
    				log.debug('KPI Item Count on Promotion', itemcount);
    				
    				if(itemcount == 1){
    					obj['kpiValues'][Object.keys(obj.kpiValues)[1]] = true;
    					//Updating the related KPI record
    	    			var kpiRecUpdate = record.submitFields({
    	            		type: 'customrecord_itpm_kpi',
    	            		id: (kpiitemcount_searchObj.run().getRange({start:0, end:1}))[0].getValue({ name:'id'}),
    	            		values:obj['kpiValues'],
    	            		options: {enablesourcing: true, ignoreMandatoryFields: true}
    	            	});
    	    			log.debug('kpiRecUpdate(only 1 item)',kpiRecUpdate);
    				}
    				else if(itemcount > 1){
    					var i = itemcount;
    					var sumallfactors_except_last = 0;
    					kpiitemcount_searchObj.run().each(function(result){
    						log.debug('id', result.getValue({name:'id'}));
    						
    						//fetching Total Est.Qty. and Est.Qty. from KPI record
    						var fieldLookUp = search.lookupFields({
    		    	    	    type    : 'customrecord_itpm_kpi',
    		    	    	    id      : result.getValue({name:'id'}),
    		    	    	    columns : [obj['kpiEstimatedSpend']]
    		    	    	});
    						
    		    	    	var eq = fieldLookUp[obj['kpiEstimatedSpend']];
    						
    						if(i==1){
    							obj['kpiValues'][Object.keys(obj.kpiValues)[1]] = true;
    							obj['kpiValues'][Object.keys(obj.kpiValues)[0]] = (1-sumallfactors_except_last).toFixed(5);
    							//Updating the related KPI record
    		        			var kpiRecUpdate = record.submitFields({
    		                		type: 'customrecord_itpm_kpi',
    		                		id: result.getValue({name:'id'}),
    		                		values:obj['kpiValues'],
    		                		options: {enablesourcing: true, ignoreMandatoryFields: true}
    		                	});
    		        			
    		        			log.debug('kpiRecUpdate(last item)',kpiRecUpdate);
    						}else{
    							log.debug('BEFORE: sumallfactors_except_last', sumallfactors_except_last);
    							sumallfactors_except_last = (parseFloat(sumallfactors_except_last)+(parseFloat(1/totalitemCountOnProm))).toFixed(5);
    							log.debug('AFTER: sumallfactors_except_last', sumallfactors_except_last);
    							obj['kpiValues'][Object.keys(obj.kpiValues)[0]] = parseFloat(1/totalitemCountOnProm).toFixed(5);
    							//Updating the related KPI record
    		        			var kpiRecUpdate = record.submitFields({
    		                		type: 'customrecord_itpm_kpi',
    		                		id: result.getValue({name:'id'}),
    		                		values:obj['kpiValues'],
    		                		options: {enablesourcing: true, ignoreMandatoryFields: true}
    		                	});
    		        			log.debug('kpiRecUpdate',kpiRecUpdate);
    						}
    						   
    						   
    						i--;
    						return true;
    					});
    				}
    			}
    		}
    	}catch(e){
    		log.error(e.name, 'calculateEstAllocationsBBOIDraft'+e.message);
    	}
    }
    
    /**
     * @param String promID
     */
    function calculateAllocationsLSforDraft(promID){
		try{
			//Getting Promoted Quantity AT LEAST ONE
			var kpiSearchObj_promQty = search.create({
				type: "customrecord_itpm_kpi",
				filters: [
					["isinactive","is","F"], 
					"AND", 
					["custrecord_itpm_kpi_promotiondeal","anyof",promID], 
					"AND", 
					["custrecord_itpm_kpi_esttotalqty","greaterthan",0]
					],
					columns: [
						"custrecord_itpm_kpi_esttotalqty"
						]
			});

			var iskpipromQty = kpiSearchObj_promQty.runPaged().count;
			log.debug('iskpipromQty', iskpipromQty);

			if(iskpipromQty > 0){
				//Counting Items for LS
				log.debug('<<<<< LS YES >>>>>');
				var promoallowanceSearchObj = search.create({
					type: "customrecord_itpm_promoallowance",
					filters: [
						["custrecord_itpm_all_promotiondeal","anyof",promID], 
						"AND", 
						["isinactive","is","F"]
						],
						columns: [
							"custrecord_itpm_all_item"
							]
				});

				var totalitemCountOnProm = promoallowanceSearchObj.runPaged().count;
				log.debug('totalitemCountOnProm', totalitemCountOnProm);

				var kpiitemcount_searchObj = search.create({
					type: "customrecord_itpm_kpi",
					filters: [
						["isinactive","is","F"], 
						"AND", 
						["custrecord_itpm_kpi_promotiondeal","anyof",promID]
						],
						columns: [
							search.createColumn({
								name: "id",
								sort: search.Sort.ASC
							}), 
							'custrecord_itpm_kpi_item',
							'custrecord_itpm_kpi_uom'
							]
				});

				var itemcount = kpiitemcount_searchObj.runPaged().count;
				log.debug('KPI Item Count on Promotion', itemcount);

				if(itemcount == 1){
					//Updating the related KPI record
					var kpiRecUpdate = record.submitFields({
						type: 'customrecord_itpm_kpi',
						id: (kpiitemcount_searchObj.run().getRange({start:0, end:1}))[0].getValue({ name:'id'}),
						values: {
							'custrecord_itpm_kpi_factorestls' : 1,
							'custrecord_itpm_kpi_adjustedls' : true
						},
						options: {enablesourcing: true, ignoreMandatoryFields: true}
					});
					log.debug('kpiRecUpdate(only 1 item)',kpiRecUpdate);
				}
				else if(itemcount > 1){
					var i = itemcount;
					var sumallfactors_except_last = 0;
					kpiitemcount_searchObj.run().each(function(result){
						log.debug('id', result.getValue({name:'id'}));
						log.debug('Item ID', result.getValue({name:'custrecord_itpm_kpi_item'}));

						//fetching Total Est.Qty. and Est.Qty. from KPI record
						var fieldLookUp = search.lookupFields({
							type    : 'customrecord_itpm_kpi',
							id      : result.getValue({name:'id'}),
							columns : ['custrecord_itpm_kpi_estimatedrevenue']
						});

						var estimatedRevenue = fieldLookUp.custrecord_itpm_kpi_estimatedrevenue;
						log.debug('estimatedRevenue', +estimatedRevenue);

						var customrecord_itpm_kpiSearchObj = search.create({
							type: "customrecord_itpm_kpi",
							filters: [
								["isinactive","is","F"], 
								"AND", 
								["custrecord_itpm_kpi_promotiondeal","anyof",promID]
								],
								columns: [
									search.createColumn({
										name: "custrecord_itpm_kpi_estimatedrevenue",
										summary: "SUM",
										sort: search.Sort.ASC
									})
									]
						});

						var totEstRev = customrecord_itpm_kpiSearchObj.run().getRange(0,1)[0].getValue({name:"custrecord_itpm_kpi_estimatedrevenue",summary:search.Summary.SUM});
						log.debug('totEstRev', totEstRev);

						var totalEstimatedRevenue = parseFloat(totEstRev);
						log.debug('totalEstimatedRevenue', totalEstimatedRevenue);

						if(i==1){
							//Updating the related KPI record
							var kpiRecUpdate = record.submitFields({
								type: 'customrecord_itpm_kpi',
								id: result.getValue({name:'id'}),
								values: {
									'custrecord_itpm_kpi_factorestls' : parseInt(((1-sumallfactors_except_last).toFixed(6)*100000))/100000,
									'custrecord_itpm_kpi_adjustedls' : true
								},
								options: {enablesourcing: true, ignoreMandatoryFields: true}
							});

							log.debug('kpiRecUpdate(last item)',kpiRecUpdate);
						}else{
							log.debug('BEFORE: sumallfactors_except_last', sumallfactors_except_last);
							final_total_eq = (totalEstimatedRevenue <= 0)?0:(parseFloat((estimatedRevenue/totalEstimatedRevenue)));
							final_total_eq = parseInt(final_total_eq.toFixed(6)*100000)/100000;
							sumallfactors_except_last = (parseFloat(sumallfactors_except_last)+final_total_eq).toFixed(6);
							sumallfactors_except_last = parseInt((sumallfactors_except_last*100000))/100000;
							log.debug('AFTER: sumallfactors_except_last', sumallfactors_except_last);
							//Updating the related KPI record
							var kpiRecUpdate = record.submitFields({
								type: 'customrecord_itpm_kpi',
								id: result.getValue({name:'id'}),
								values: {
									'custrecord_itpm_kpi_factorestls' : final_total_eq,
									'custrecord_itpm_kpi_adjustedls' : false
								},
								options: {enablesourcing: true, ignoreMandatoryFields: true}
							});
							log.debug('kpiRecUpdate',kpiRecUpdate);
						}


						i--;
						return true;
					});
				}
			}
			//If NO
			else{
				//Counting Items for LS
				log.debug('<<<<< LS NO >>>>>');
				var promoallowanceSearchObj = search.create({
					type: "customrecord_itpm_promoallowance",
					filters: [
						["custrecord_itpm_all_promotiondeal","anyof",promID], 
						"AND", 
						["isinactive","is","F"]
						],
						columns: [
							"custrecord_itpm_all_item"
							]
				});

				var totalitemCountOnProm = promoallowanceSearchObj.runPaged().count;
				log.debug('totalitemCountOnProm', totalitemCountOnProm);

				var kpiitemcount_searchObj = search.create({
					type: "customrecord_itpm_kpi",
					filters: [
						["isinactive","is","F"], 
						"AND", 
						["custrecord_itpm_kpi_promotiondeal","anyof",promID]
						],
						columns: [
							search.createColumn({
								name: "id",
								sort: search.Sort.ASC
							})
							]
				});

				var itemcount = kpiitemcount_searchObj.runPaged().count;
				log.debug('KPI Item Count on Promotion', itemcount);

				if(itemcount == 1){
					//Updating the related KPI record
					var kpiRecUpdate = record.submitFields({
						type: 'customrecord_itpm_kpi',
						id: (kpiitemcount_searchObj.run().getRange({start:0, end:1}))[0].getValue({ name:'id'}),
						values: {
							'custrecord_itpm_kpi_factorestls' : 1,
							'custrecord_itpm_kpi_adjustedls' : true
						},
						options: {enablesourcing: true, ignoreMandatoryFields: true}
					});
					log.debug('kpiRecUpdate(only 1 item)',kpiRecUpdate);
				}
				else if(itemcount > 1){
					var i = itemcount;
					var sumallfactors_except_last = 0;
					kpiitemcount_searchObj.run().each(function(result){
						log.debug('id', result.getValue({name:'id'}));

						if(i==1){
							//Updating the related KPI record
							var kpiRecUpdate = record.submitFields({
								type: 'customrecord_itpm_kpi',
								id: result.getValue({name:'id'}),
								values: {
									'custrecord_itpm_kpi_factorestls' : (1-sumallfactors_except_last).toFixed(5),
									'custrecord_itpm_kpi_adjustedls' : true
								},
								options: {enablesourcing: true, ignoreMandatoryFields: true}
							});

							log.debug('kpiRecUpdate(last item)',kpiRecUpdate);
						}else{
							log.debug('BEFORE: sumallfactors_except_last', sumallfactors_except_last);
							sumallfactors_except_last = (parseFloat(sumallfactors_except_last)+(parseFloat(1/totalitemCountOnProm))).toFixed(5);
							log.debug('AFTER: sumallfactors_except_last', sumallfactors_except_last);
							//Updating the related KPI record
							var kpiRecUpdate = record.submitFields({
								type: 'customrecord_itpm_kpi',
								id: result.getValue({name:'id'}),
								values: {
									'custrecord_itpm_kpi_factorestls' : parseFloat(1/totalitemCountOnProm).toFixed(5),
									'custrecord_itpm_kpi_adjustedls' : false
								},
								options: {enablesourcing: true, ignoreMandatoryFields: true}
							});
							log.debug('kpiRecUpdate',kpiRecUpdate);
						}

						i--;
						return true;
					});
				}
			}
		}catch(e){
			log.error(e.name, 'calculateAllocationsLSforDraft'+e.message);
		}
	}
    
    /**
     * @param String promID
     */
    function updateKPIActualEvenly(promID){
    	try{
    		var kpiItemsSearchObj = search.create({
    			type: "customrecord_itpm_kpi",
    			filters: [
    				["isinactive","is","F"], 
    				"AND", 
    				["custrecord_itpm_kpi_promotiondeal","anyof",promID]
    				],
    				columns: [
    					search.createColumn({
    						name: "id",
    						sort: search.Sort.ASC
    					})
    					]
    		});

    		kpiItemsSearchObj.run().each(function(result){
    			var fieldLookUp = search.lookupFields({
    				type    : 'customrecord_itpm_kpi',
    				id      : result.getValue('id'),
    				columns : ['custrecord_itpm_kpi_factorestls', 'custrecord_itpm_kpi_factorestbb','custrecord_itpm_kpi_factorestoi']
    			});

    			lsFactorEst = fieldLookUp.custrecord_itpm_kpi_factorestls;
    			bbFactorEst = fieldLookUp.custrecord_itpm_kpi_factorestbb;
    			oiFactorEst = fieldLookUp.custrecord_itpm_kpi_factorestoi;
    			log.debug('LS: AF-Est, BB: AF-Est & OI: AF-Est', lsFactorEst+' , '+bbFactorEst+' & '+oiFactorEst);
    			
    			//updating KPI Actual Allocation factors
    			var kpiRecUpdate = record.submitFields({
    				type: 'customrecord_itpm_kpi',
    				id: result.getValue('id'),
    				values: {
    					'custrecord_itpm_kpi_factoractualls' : lsFactorEst,
    					'custrecord_itpm_kpi_factoractualbb' : bbFactorEst,
    					'custrecord_itpm_kpi_factoractualoi' : oiFactorEst
    				},
    				options: {enablesourcing: true, ignoreMandatoryFields: true}
    			});
    			log.debug('updated KPI',kpiRecUpdate);
    			
    			return true;
    		});
    	}catch(e){
    		log.error(e.name, 'updateKPIActualEvenly'+e.message);
    	}
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
    	getUserPermission:getUserPermission,
    	calculateEstAllocationsBBOIDraft:calculateEstAllocationsBBOIDraft,
    	calculateAllocationsLSforDraft:calculateAllocationsLSforDraft,
    	updateKPIActualEvenly:updateKPIActualEvenly
    };
    
});
