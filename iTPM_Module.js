/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 */
define(['N/search', 
		'N/record', 
		'N/util',
		'N/runtime',
		'N/config',
		'N/redirect'
		],

	function(search, record, util, runtime, config, redirect) {
	/**
	 * @function hasSales()
	 * @param {Object} obj
	 * @param {String} obj.promotionId
	 * @param {String} obj.shipStart
	 * @param {String} obj.shipEnd
	 * @param {String} obj.orderStart
	 * @param {String} obj.orderEnd
	 * @param {String} obj.customerId
	 * @returns {Object}
	 */
	function hasSales(obj){
		try{
			if (!obj.promotionId &&
					!obj.shipStart && !obj.shipEnd &&
					!obj.customerId){
				throw {
					name: 'Missing required parameter.',
					message: 'Missing a required parameter. Object should have {promotionId, shipStart, shipEnd, orderStart, orderEnd, customerId}'
				}
			}
			//1 = Ship Date, 2 = Order Date, 3 = Both, 4 = Either
//			log.audit('getPrefrenceValues().prefDiscountDate;',getPrefrenceValues().prefDiscountDate);
//			var datePref = getPrefrenceValues().prefDiscountDate; //need to correct spelling
			var start, end, items = [];
//			switch (datePref){
//			case '2':
//				start = obj.orderStart;
//				end = obj.orderEnd;
//				break;
//			case '3':
//				start = (Date.parse(obj.shipStart) >= Date.parse(obj.orderStart)) ? obj.shipStart : obj.orderStart;
//				end = (Date.parse(obj.shipEnd) >= Date.parse(obj.orderEnd)) ? obj.orderEnd : obj.shipEnd;
//				break;
//			case '4':
//				start = (Date.parse(obj.shipStart) <= Date.parse(obj.orderStart)) ? obj.shipStart : obj.orderStart;
//				end = (Date.parse(obj.shipEnd) <= Date.parse(obj.orderEnd)) ? obj.orderEnd : obj.shipEnd;
//				break;
//			default: //default use ship dates
				start = obj.shipStart;
				end = obj.shipEnd;
//			break;
//			}
			log.audit('obj',obj);
			//get promotion items
			if(obj.kpiItem){
				items.push(obj.kpiItem);
			}else{
				var itemSearch = search.create({
					type: 'customrecord_itpm_kpi',
					filters: [
						['custrecord_itpm_kpi_promotiondeal', 'anyof', obj.promotionId], 'and',
						['isinactive', 'is', 'F']
						],
						columns: ['custrecord_itpm_kpi_item']
				});
				itemSearch.run().each(function(result){
					items.push(result.getValue('custrecord_itpm_kpi_item'));
					return true;
				});
			}
			
			//getting the sub customers of the customer
			var subCustIds = getSubCustomers(obj.customerId);
			log.debug('hasSales:subCustIds',subCustIds);
			//get invoices
			var invoiceSearch = search.create({
				type: search.Type.INVOICE,
				filters: [
						['item', 'anyof', items], 'and',
						['entity', 'anyof', subCustIds], 'and',
						['trandate', 'within', start, end]
					],
					columns: [
					    search.createColumn({
							name:'amount',
							summary: "SUM"
						})
					]
			});
			var totalRev = parseFloat(invoiceSearch.run().getRange(0,1)[0].getValue({name:'amount',summary:search.Summary.SUM}));
			totalRev = (totalRev)? totalRev : 0;
			if (totalRev > 0) {
				return {error: false, totalRev: totalRev, hasSales: true}
			} else {
				return {error: false, totalRev: totalRev, hasSales: false}
			}
		} catch(ex){
			log.error ('module_hasSales', ex.name +'; ' + ex.message + '; ' + JSON.stringify(obj));
			return {error: true, hasSales: false}
		}
	}

//	/**
//	 * @function hasEstQty()
//	 * @param {Object} obj
//	 * @param {String} obj.promotionId
//	 * @returns {Object}
//	 */
//	function hasEstQty(obj){
//		try{
//			if(!obj.promotionId) throw {name: 'Missing Promotion Id.', message: 'No promotion Id parameter in object.'};
//			var pSearch = search.create({
//				type: 'customrecord_itpm_estquantity',
//				columns: ['internalid']
//			});
//			pSearch.filters.push(search.createFilter({
//				name: 'custrecord_itpm_estqty_totalqty',
//				operator: search.Operator.GREATERTHAN,
//				values: 0
//			}));
//			pSearch.filters.push(search.createFilter({
//				name: 'isinactive',
//				operator: search.Operator.IS,
//				values: 'F'
//			}));
//			//Added Promotion id filter to search
//			pSearch.filters.push(search.createFilter({
//				name: 'custrecord_itpm_estqty_promodeal',
//				operator: search.Operator.ANYOF,
//				values: obj.promotionId
//			}));
//
//			var results = [];
//			results = pSearch.run().getRange(0,1);
//			if (results.length == 1){
//				return {error: false, hasEstQty: true}
//			} else {
//				return {error: false, hasEstQty: false}
//			}
//		} catch(ex) {
//			log.error ('module_hasEstQty', ex.name +'; ' + ex.message + '; ' + JSON.stringify(obj));
//			return {error: true, hasEstQty: false}
//		}
//	}

	/**
	 * Check whether Quantity Pricing is enabled
	 * @function quantityPricingEnabled()
	 * @return {Boolean}
	 */
	function quantityPricingEnabled(){
		try{
			var featureEnabled = runtime.isFeatureInEffect({feature:'QUANTITYPRICING'});
			var currentUser = runtime.getCurrentUser();
			var currentScript = runtime.getCurrentScript();
			var currentSession = runtime.getCurrentSession();
			return featureEnabled;
		} catch(ex){
			var message = JSON.stringify(runtime.getCurrentUser()) + '\r\n ' + JSON.stringify(runtime.getCurrentSession()) + '\r\n ' + JSON.stringify(runtime.getCurrentScript());
			log.error('module_quantityPricingEnabled', ex.name +'; '+ ex.message + '; additionalDetails: ' + message);
			return false;
		}
	}

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
			if(objParameter.returnZero) return {error: false, spend: 0, bb: 0, oi: 0, nb: 0, ls: 0};
			var qty = parseFloat(objParameter.quantity),
			rateBB = (objParameter.rateBB == '' || objParameter.rateBB == null || !objParameter.rateBB)? 0 : parseFloat(objParameter.rateBB),
			rateOI = (objParameter.rateOI == '' || objParameter.rateOI == null || !objParameter.rateOI)? 0 : parseFloat(objParameter.rateOI),
			rateNB = (objParameter.rateNB == '' || objParameter.rateNB == null || !objParameter.rateNB)? 0 : parseFloat(objParameter.rateNB);

			if(objParameter.actual){//actual spend also includes lines from settlements
				if (objParameter.promotionId && objParameter.itemId){
					var spendSearch = search.load({
						id: 'customsearch_itpm_getactualspend'
					});
					spendSearch.filters.push(search.createFilter({
						name: 'custbody_itpm_set_promo', 
						operator: search.Operator.ANYOF,
						values: objParameter.promotionId
					}));
					spendSearch.filters.push(search.createFilter({
						name: 'custcol_itpm_set_item', 
						operator: search.Operator.ANYOF,
						values: objParameter.itemId
					}));
					/*
					spendSearch.filters.push(search.createFilter({
						name: 'status', 
						operator: search.Operator.NONEOF,
						values: ['C', 'E']
					}));
					 */

					log.debug('spendSearch', spendSearch);
					var spendLS = spendBB = spendOI = 0;
					spendSearch.run().each(function(result){
						var lsbboi = result.getValue({name:'custcol_itpm_lsbboi', summary: search.Summary.GROUP});
						var amount = parseFloat(result.getValue({name:'amount', summary: search.Summary.SUM}));
						if(lsbboi == 1){
							//lump sum
							spendLS = amount;
						} else if(lsbboi == 2){
							//bill back
							spendBB = amount;
						} else if(lsbboi == 3){
							//off-invoice
							spendOI = amount;
						}
						return true;
					});
					return {
						error: false,
						spend: spendBB + spendOI + qty*rateOI + qty*rateNB,
						bb: spendBB,
						oi: spendOI + qty*rateOI,
						nb: qty*rateNB,
						ls: spendLS
					};
				}
			} else {//estimated & LE spend based on qty and rate
				return {error: false, spend: qty*(rateBB + rateOI + rateNB), bb: qty*rateBB, oi: qty*rateOI, nb: qty*rateNB, ls: 0};
			}
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
			if(objParameter.returnZero) return {error: false, liability: 0, bb: 0, oi: 0, nb: 0};
			var qty = parseFloat(objParameter.quantity),
			rateBB = (objParameter.rateBB == '' || objParameter.rateBB == null || !objParameter.rateBB)? 0 : parseFloat(objParameter.rateBB),
			rateOI = (objParameter.rateOI == '' || objParameter.rateOI == null || !objParameter.rateOI)? 0 : parseFloat(objParameter.rateOI),
			rateNB = (objParameter.rateNB == '' || objParameter.rateNB == null || !objParameter.rateNB)? 0 : parseFloat(objParameter.rateNB),
			rFactor = (objParameter.redemption == '' || objParameter.redemption == null || !objParameter.redemption)? 0 : parseFloat(objParameter.redemption);
			rFactor /= 100;
			return {error: false, liability: qty*((rateBB*rFactor)+rateOI+rateNB), bb: qty*rateBB*rFactor, oi: qty*rateOI, nb: qty*rateNB, ls: 0};
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
			return {error: true, unitArray: [], name: 'ITEM_UNITS_MODULE', message: ex.name + '; ' + ex.message + '; itemId: ' + itemId};
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
			//getting the sub customers of the customer
			var subCustIds = getSubCustomers(customerId);
			log.debug('getActualQty:subCustIds',subCustIds);
			qtySearch.filters.push(search.createFilter({
				name: 'entity',
				operator: search.Operator.ANYOF,
				values: subCustIds
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
	function getPrefrenceValues(subid){
		try{
			var prefObj = {};
			search.create({
				type:'customrecord_itpm_preferences',
				columns:['custrecord_itpm_pref_ddnaccount',
					'custrecord_itpm_pref_settlementsaccount',
					'custrecord_itpm_pref_expenseaccount',
					'custrecord_itpm_pref_discountdates',
					'custrecord_itpm_pref_defaultalltype',
					'custrecord_itpm_pref_defaultpricelevel',
					'custrecord_itpm_pref_remvcust_frmsplit',
					'custrecord_itpm_pref_discountitem'
					],
					filters:(subid)? ['custrecord_itpm_pref_subsidiary','anyof',subid] : [] 
			}).run().each(function(e){
				prefObj = {
						dednExpAccnt : e.getValue('custrecord_itpm_pref_ddnaccount'),
						expenseAccnt : e.getValue('custrecord_itpm_pref_expenseaccount'),
						accountPayable : e.getValue('custrecord_itpm_pref_settlementsaccount'),
						prefDiscountDate: e.getValue('custrecord_itpm_pref_discountdates'),
						defaultAllwType: e.getValue('custrecord_itpm_pref_defaultalltype'),
						defaultPriceLevel:e.getValue('custrecord_itpm_pref_defaultpricelevel'),
						removeCustomer: e.getValue('custrecord_itpm_pref_remvcust_frmsplit'),
						dicountItem : e.getValue('custrecord_itpm_pref_discountitem')
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
	 * @function getImpactPrice(params)
	 * @param {Object} params
	 * @param {number} params.pid - Promotion ID
	 * @param {number} params.itemid - Item internal ID
	 * @param {number} params.pricelevel - Price Level internal ID
	 * @param {string} params.baseprice - Base Price of item
	 * @returns
	 * @description setting the Impact Price Value in allowance record.
	 */
	function getImpactPrice(params){
		try{
			log.debug('params',params);
			var price = undefined;
			var currencyId = search.lookupFields({
				type:'customrecord_itpm_promotiondeal',
				id:params.pid,
				columns:['custrecord_itpm_p_currency']
			})['custrecord_itpm_p_currency'][0].value;
			var itemResult = search.create({
				type:search.Type.ITEM,
				columns:[
					//'pricing.pricelevel',
					'pricing.unitprice',
					'baseprice',
					'saleunit'
					],
					filters:[['internalid','anyof',params.itemid],'and',
						['pricing.pricelevel','is',params.pricelevel],'and',
						['isinactive','is',false]
					]
			});
			if(quantityPricingEnabled()) {
				itemResult.columns.push(search.createColumn({
					name: 'quantityrange',
					join:'pricing',
					sort: search.Sort.ASC
				}));
			}
			if(currenciesEnabled()){
				//['pricing.currency','is',currencyId],'and',
				itemResult.filters.push(search.createFilter({
					name: 'currency',
					join: 'pricing',
					operator: search.Operator.IS,
					values: currencyId
				}));
			}
			itemResult = itemResult.run().getRange(0,1);
			if(itemResult.length > 0){
				log.audit('itemResult in if',itemResult);
				price = itemResult[0].getValue({name:'unitprice',join:'pricing'});
				log.debug('price',price);
				price = (isNaN(price))?params.baseprice:price;
				return {
					price:price,
					baseprice:itemResult[0].getValue({name:'baseprice'}),
					saleunit:itemResult[0].getValue({name:'saleunit'})
				};
			}else{
				itemResult = search.create({
					type:search.Type.ITEM,
					columns:[
						'saleunit'
						],
						filters:[['internalid','anyof',params.itemid],'and',
							['isinactive','is',false]
						]
				});
				itemResult = itemResult.run().getRange(0,1);
				log.audit('itemResult in else',itemResult);
				return {
					price:0,
					baseprice:0,
					saleunit:itemResult[0].getValue({name:'saleunit'})
				};
			}
		}catch(e){
			log.error(e.name,e.message + '; params: ' + JSON.stringify(params));
			return {
				price: 0,
				baseprice: 0,
				saleunit: 0
			};
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
						saleunit:(itemLookup['saleunit'].length > 0)?itemLookup['saleunit'][0].value:0,
						unitstype:(itemLookup['unitstype'].length > 0)?itemLookup['unitstype'][0].value:0,
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
	 * @return {Object} JSON
	 * @description This function is used to get the info related to "JE Approval" features under "Accounting Preferences"
	 */
	function getJEPreferences(){
		try{
			var jePref = {featureEnabled:false};
			var configRecObj = config.load({
				type: config.Type.ACCOUNTING_PREFERENCES
			});

			if(configRecObj.getValue('CUSTOMAPPROVALJOURNAL')){ //JOURNAL ENTRIES (under Setup >> Accounting >> PREFERENCES >> Accounting Preferences >> Approval Routing)
				jePref = {featureEnabled:configRecObj.getValue('CUSTOMAPPROVALJOURNAL'), featureName:'Approval Routing'};
			}else if(configRecObj.getValue('JOURNALAPPROVALS')){ //REQUIRE APPROVALS ON JOURNAL ENTRIES (under Setup >> Accounting >> PREFERENCES >> Accounting Preferences >> General)
				jePref = {featureEnabled:configRecObj.getValue('JOURNALAPPROVALS'), featureName:'General'};
			}

			return jePref;
		}catch(e){
			log.error(e.name, 'getJEPreferences: '+e.message);
		}
	}

//	/**
//	 * @param {String} promID
//	 * @param {Integer} promAllocType
//	 */
//	function processAllocationsDraft(promID, promAllocType){
//		try{
//			//Updating BB Allocation Factors
//			var objbb = {
//					promoId:promID,
//					promoEstimatedSpend:'custrecord_itpm_estimatedspendbb',
//					kpiEstimatedSpend:'custrecord_itpm_kpi_estimatedspendbb',
//					mop:1, // 1 or 3
//					kpiValues:{
//						'custrecord_itpm_kpi_factorestbb' : 1
//					}
//			}
//			calculateEstAllocationsBBOIDraft(objbb);
//
//			//Updating OI Allocation Factors
//			var objoi = {
//					promoId:promID,
//					promoEstimatedSpend:'custrecord_itpm_estimatedspendoi',
//					kpiEstimatedSpend:'custrecord_itpm_kpi_estimatedspendoi',
//					mop:3, // 1 or 3
//					kpiValues:{
//						'custrecord_itpm_kpi_factorestoi' : 1
//					}
//			}
//			calculateEstAllocationsBBOIDraft(objoi);
//
//			//Need to maintain the same values for "EST. & ACTUAL" if Allocation Type is "Evenly" OR "By % Revenue"
//			if(promAllocType == 3 || promAllocType == 1){
//				updateKPIActualEvenly(promID);
//			}
//		}catch(e){
//			log.error(e.name, 'processAllocationsDraft: '+e.message);
//		}
//	}

	/**
	 * @function getEstAllocationFactor()
	 * @param {Object} obj
	 * @param {String} obj.promotionId
	 * @param {String} obj.mop
	 * @param {String} obj.estimatedSpend
	 * @param {String} obj.kpiId
	 * @returns {Object}
	 */
	function getEstAllocationFactor(obj){
		try{
			var itemCount;
			var itemSearch = search.create({
				type: 'customrecord_itpm_promoallowance',
				filters: [
					['isinactive', 'is', false], 'and',
					['custrecord_itpm_all_promotiondeal', 'anyof', obj.promotionId], 'and',
					['custrecord_itpm_all_mop', 'anyof', obj.mop]
					],
					columns: [
						search.createColumn({
							name: 'custrecord_itpm_all_item',
							summary: search.Summary.GROUP
						})
						]
			});
			itemCount = itemSearch.runPaged().count;
			log.debug('module_getEstAllocationFactor', 'itemCount: ' + itemCount);

			var fieldId;
			if (obj.mop == 1){	//bill back
				fieldId = 'custrecord_itpm_kpi_estimatedspendbb';
			} else if (obj.mop == 3) {	//off invoice
				fieldId = 'custrecord_itpm_kpi_estimatedspendoi';
			}

			var kpiSpendSearch = search.create({
				type: 'customrecord_itpm_kpi',
				filters: [
					['isinactive', 'is', false], 'and',
					['custrecord_itpm_kpi_promotiondeal', 'anyof', obj.promotionId]
					],
				columns: [
					search.createColumn({
						name: fieldId,
						summary: search.Summary.SUM
					})
					]
			});
			//KPI adjusted checkboxes related code has been removed except this block of code
			var spend = kpiSpendSearch.run().getRange(0,1);
			spend = (spend.length == 1) ? spend[0].getValue({name: fieldId, summary: 'SUM'}) : 0;
			log.debug('module_getEstAllocationFactor', 'spend: ' + spend);

			if(itemCount == 1){
				return {error: false, factor: 1};
			} else {
				var mopItems = [];
				itemSearch.run().each(function(result){
					mopItems.push(result.getValue({name: 'custrecord_itpm_all_item', summary: 'GROUP'}));
				});
				var kpiSearch = search.create({
					type: 'customrecord_itpm_kpi',
					filters: [
						['isinactive', 'is', false], 'and',
						['custrecord_itpm_kpi_item', 'anyof', mopItems]
						],
					columns: [
						search.createColumn({
							name: 'id',
							sort: search.Sort.DESC
						})
						]
				});
				var adjustedKpi = kpiSearch.run().getRange(0,1)[0].getValue('id');
				log.debug('adjustedKpi', adjustedKpi);
				if (spend == 0){
					//allocate evenly
				} else {

				}
			}

		} catch(ex) {
			log.error('module_getEstAllocationFactor', ex.name +'; ' + ex.message + JSON.stringify(obj));
			return {error: true, factor: 0}
		}
	}
	
//	/**
//	 * @param {Object} obj
//	 */
//	function calculateEstAllocationsBBOIDraft(obj){
//		try{
//			log.debug('obj',obj);
//			var promSearchObjbb = search.create({
//				type: "customrecord_itpm_promotiondeal",
//				filters: [
//					["internalid", "anyof", obj['promoId']],
//					"AND",
//					["custrecord_itpm_kpi_promotiondeal.isinactive", "is", "F"]
//					],
//				columns: [ 
//					search.createColumn({
//						name: obj['kpiEstimatedSpend'],
//						join: "CUSTRECORD_ITPM_KPI_PROMOTIONDEAL",
//						summary: "SUM",
//						sort: search.Sort.ASC
//					})
//					]
//			});
//
//			var promestspendbb = promSearchObjbb.run().getRange(0,1)[0].getValue({
//				name: obj['kpiEstimatedSpend'],
//				join: "CUSTRECORD_ITPM_KPI_PROMOTIONDEAL",
//				summary:search.Summary.SUM
//			});
//			promestspendbb = (promestspendbb)?promestspendbb:0;
//			log.debug('Promotion Estimate Spend: BB(SUM)', promestspendbb);
//
//			//validating whether Estimated Spend: BB (or) Estimated Spend: OI is GREATER THAN ZERO: If YES
//			if(promestspendbb > 0){
//				log.debug(' BB or OI YES ', obj['mop']);
//
//				//Allowance search to get BB or OI related items
//				var promoallowanceSearchObj = promAllowanceSearch(obj['promoId'], obj['mop']);
//
//				var items = [];
//
//				promoallowanceSearchObj.run().each(function(result){
//					items.push(result.getValue('custrecord_itpm_all_item'));
//					return true;
//				});
//
//				//Adding Filters for KPI search
//				var searchFilter = [];
//				searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
//				searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator: search.Operator.ANYOF, values:obj['promoId']}));
//				searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_item', operator:search.Operator.ANYOF, values:items}));
//
//				//Adding Columns for KPI search
//				var searchColumn = [];
//				searchColumn.push(search.createColumn({name: "id",sort: search.Sort.ASC}));
//
//				//KPI search to get particular items based on BB or OI
//				var kpiitemcount_searchObj = kpiSearch(searchFilter, searchColumn);
//				var itemcount = kpiitemcount_searchObj.runPaged().count;
//				log.debug('KPI Item Count on Promotion', itemcount);
//
//				if(itemcount == 1){    				
//					//Updating the related KPI record
//					var kpiRecUpdate = updateKPI((kpiitemcount_searchObj.run().getRange({start:0, end:1}))[0].getValue({ name:'id'}), obj['kpiValues']);
//					log.debug('kpiRecUpdate(only 1 item)',kpiRecUpdate);
//				}
//				else if(itemcount > 1){
//					kpiitemcount_searchObj.run().each(function(result){
//						log.debug('id', result.getValue({name:'id'}));
//
//						//fetching estimated spend from KPI record
//						var fieldLookUp = search.lookupFields({
//							type    : 'customrecord_itpm_kpi',
//							id      : result.getValue({name:'id'}),
//							columns : [obj['kpiEstimatedSpend']]
//						});
//						var eq = fieldLookUp[obj['kpiEstimatedSpend']];
//						eq = (eq)?eq:0;
//
//						final_total_eq = (promestspendbb <= 0)?0:(parseFloat((eq/promestspendbb)));
//						obj['kpiValues'][Object.keys(obj.kpiValues)[0]] = final_total_eq.toFixed(6);
//						//Updating the related KPI record
//						var kpiRecUpdate = updateKPI(result.getValue({name:'id'}), obj['kpiValues']);
//						log.debug('kpiRecUpdate',kpiRecUpdate);
//						return true;
//					});
//				}
//			}
//			//If NO
//			else{
//				log.debug('<<<<< BB or OI NO >>>>>', obj['mop']);
//				//Allowance search to get BB or OI related items
//				var promoallowanceSearchObj = promAllowanceSearch(obj['promoId'], obj['mop']);
//				var totalitemCountOnProm = promoallowanceSearchObj.runPaged().count;
//				log.debug('totalitemCountOnProm', totalitemCountOnProm);
//
//				if(totalitemCountOnProm > 0){ //validation to prevent null results error
//					var items = [];
//
//					promoallowanceSearchObj.run().each(function(result){
//						items.push(result.getValue('custrecord_itpm_all_item'));
//						return true;
//					});
//
//					//Adding Filters for KPI search
//					var searchFilter = [];
//					searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
//					searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator: search.Operator.ANYOF, values:obj['promoId']}));
//					searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_item', operator:search.Operator.ANYOF, values:items}));
//
//					//Adding Columns for KPI search
//					var searchColumn = [];
//					searchColumn.push(search.createColumn({name: "id",sort: search.Sort.ASC}));
//
//					var kpiitemcount_searchObj = kpiSearch(searchFilter, searchColumn);
//					var itemcount = kpiitemcount_searchObj.runPaged().count;
//					log.debug('KPI Item Count on Promotion', itemcount);
//
//					if(itemcount == 1){
//						//Updating the related KPI record
//						var kpiRecUpdate = updateKPI((kpiitemcount_searchObj.run().getRange({start:0, end:1}))[0].getValue({ name:'id'}), obj['kpiValues']);
//						log.debug('kpiRecUpdate(only 1 item)',kpiRecUpdate);
//					}
//					else if(itemcount > 1){
//						kpiitemcount_searchObj.run().each(function(result){
//							log.debug('id', result.getValue({name:'id'}));
//
//							var fieldLookUp = search.lookupFields({
//								type    : 'customrecord_itpm_kpi',
//								id      : result.getValue({name:'id'}),
//								columns : [obj['kpiEstimatedSpend']]
//							});    						
//							var eq = fieldLookUp[obj['kpiEstimatedSpend']];    						
//							obj['kpiValues'][Object.keys(obj.kpiValues)[0]] = parseFloat(1/itemcount).toFixed(6);    							
//							//Updating the related KPI record
//							var kpiRecUpdate = updateKPI(result.getValue({name:'id'}), obj['kpiValues']);
//							log.debug('kpiRecUpdate',kpiRecUpdate);
//							return true;
//						});
//					}
//				}
//			}
//		}catch(e){
//			log.error(e.name, 'calculateEstAllocationsBBOIDraft'+e.message);
//		}
//	}

//	/**
//	 * @function getActAllocationFactorLS()
//	 * @param {Object} obj
//	 * @param {String} obj.promotionId
//	 * @param {String} obj.shipStart
//	 * @param {String} obj.shipEnd
//	 * @param {String} obj.orderStart
//	 * @param {String} obj.orderEnd
//	 * @param {String} obj.customerId,
//	 * @param {String} obj.kpiId,
//	 * @param {String} obj.adjusted
//	 * @returns {Object}
//	 */
//	function getActAllocationFactorLS(obj){
//		try{
//			//1 = Ship Date, 2 = Order Date, 3 = Both, 4 = Either
////			var datePref = getPrefrenceValues().prefDiscountDate; //need to correct spelling
//			var start, end, items = [], kpiItems = [], thisItem, thisFactor, thisRevenue, revenue, totalRevenue;
////			switch (datePref){
////			case '2':
////				start = obj.orderStart;
////				end = obj.orderEnd;
////				break;
////			case '3':
////				start = (Date.parse(obj.shipStart) >= Date.parse(obj.orderStart)) ? obj.shipStart : obj.orderStart;
////				end = (Date.parse(obj.shipEnd) >= Date.parse(obj.orderEnd)) ? obj.orderEnd : obj.shipEnd;
////				break;
////			case '4':
////				start = (Date.parse(obj.shipStart) <= Date.parse(obj.orderStart)) ? obj.shipStart : obj.orderStart;
////				end = (Date.parse(obj.shipEnd) <= Date.parse(obj.orderEnd)) ? obj.orderEnd : obj.shipEnd;
////				break;
////			default: //default use ship dates
//				start = obj.shipStart;
//				end = obj.shipEnd;
////			break;
////			}
//			//get promotion items
//			var itemSearch = search.create({
//				type: 'customrecord_itpm_kpi',
//				filters: [
//					['custrecord_itpm_kpi_promotiondeal', 'anyof', obj.promotionId], 'and',
//					['isinactive', 'is', 'F']
//					],
//				columns: ['id', 'custrecord_itpm_kpi_item']
//			});
//			itemSearch.run().each(function(result){
//				items.push(result.getValue('custrecord_itpm_kpi_item'));
//				if (result.id == obj.kpiId){
//					thisItem = result.getValue('custrecord_itpm_kpi_item');
//				}
//			});
//			//getting the sub customers of the customer
//			var subCustIds = getSubCustomers(obj.customerId);
//			log.debug('getActAllocationFactorLS:subCustIds',subCustIds);
//			//get invoices
//			var invoiceSearch = search.create({
//				type: search.Type.INVOICE,
//				filters: [
//					['item', 'anyof', items], 'and',
//					['entity', 'anyof', subCustIds], 'and',
//					['trandate', 'within', start, end], 'and',
//					['status','anyof',['CustInvc:A','CustInvc:B']],'and',
//					['taxline', 'is', false], 'and',
//					['cogs','is',false],'and',
//					['shipping','is',false],'and',
//					['mainline', 'is', false]
//					],
//				columns: [
//					search.createColumn({
//						name: 'item',
//						summary: search.Summary.GROUP
//					}),
//					search.createColumn({
//						name: 'amount',
//						summary: search.Summary.SUM
//					})
//					]
//			});
//			invoiceSearch.run().each(function(result){
//				var itemRevenue = result.getValue({name: 'amount', summary: 'SUM'});
//				itemRevenue = (itemRevenue) ? parseFloat(itemRevenue) : 0;
//				totalRevenue += itemRevenue;
//				if (result.getValue({name: 'item', summary: 'GROUP'}) != thisItem){
//					revenue += itemRevenue;
//				} else {
//					thisRevenue = itemRevenue;
//				}
//			});
//			totalRevenue = (totalRevenue) ? totalRevenue : 1;
//			thisFactor = thisRevenue / totalRevenue;
//			thisFactor = thisFactor.toFixed(6);
//			return {error: false, factor: thisFactor};
//		} catch(ex){
//			log.error ('module_getActAllocationFactorLS', ex.name +'; ' + ex.message + '; ' + JSON.stringify(obj));
//			return {error: true, factor: 0};
//		}
//	}

//	/**
//	 * @function getEstAllocationFactorLS()
//	 * @param {Object} obj
//	 * @param {number} obj.promotionId
//	 * @param {Boolean} obj.hasEstQty
//	 * @param {number} obj.priceLevel
//	 * @param {number} obj.kpiId
//	 * @param {number} obj.itemId
//	 * @param {string} obj.estQtySearch
//	 * @returns {Object} 
//	 */
//	function getEstAllocationFactorLS(obj){
//		try{
//			if (!obj.promotionId || typeof(obj.hasEstQty) == undefined || !obj.kpiId || !obj.itemId || !obj.estQtySearch) {
//				throw {
//					name: 'Missing Parameter', 
//					message: 'Missing required parameter. Object should have {promotionId, hasEstQty, priceLevel, kpiId, itemId, estQtySearch}'
//				};
//			}
//
//			//=============================================================================================
//			var estQtySearch = search.load({
//				id: obj.estQtySearch
//			});
//			estQtySearch.filters.push(search.createFilter({
//				name: 'custrecord_itpm_estqty_promodeal',
//				operator: search.Operator.ANYOF,
//				values: [obj.promotionId]
//			}));
//			estQtySearch.filters.push(search.createFilter({
//				name: 'isinactive',
//				operator: search.Operator.IS,
//				values: false
//			}));
//			var estQuantities = [], thisItem = {item: 0, unit: 0, qty: 0};
//			estQtySearch.run().each(function(result){
//				estQuantities.push({
//					item: result.getValue({name:'custrecord_itpm_estqty_item'}),
//					unit: result.getValue({name:'custrecord_itpm_estqty_qtyby'}),
//					qty: result.getValue({name:'custrecord_itpm_estqty_totalqty'})
//				});
//				return true;
//			});
//			//=============================================================================================
//
//			if(estQuantities.length == 1){ //regardless of hasEstQty
//				return {error: false, factor: 1};
//			} else if(estQuantities.length > 1){
//
//				var thisFactor = 0;
//
//				if (obj.hasEstQty){
//					//ALLOCATE BY ESTIMATED REVENUE
//					var totalEstimatedRevenue = 0, thisEstimatedRevenue = 0;
//					for(var x = 0; x < estQuantities.length; x++){
//						var itemPrice = getImpactPrice({
//							pid: obj.promotionId, 
//							itemid: estQuantities[x].item, 
//							pricelevel: obj.priceLevel, 
//							baseprice: 0
//						});
//						var itemUnits = getItemUnits(estQuantities[x].item);
//						var estConversion, saleConversion;
//						for (var i = 0; i < itemUnits.unitArray.length; i++){
//							if (itemUnits.unitArray[i].id == estQuantities[x].unit){
//								estConversion = parseFloat(itemUnits.unitArray[i].conversionRate);
//							}
//							if (itemUnits.unitArray[i].id == itemPrice.saleunit){
//								saleConversion = parseFloat(itemUnits.unitArray[i].conversionRate);
//							}
//						}
//						estConversion = (estConversion <= 0) ? 1 : estConversion;
//						log.debug('module_getEstAllocationFactorLS', 'estConversion : '+estConversion);
//						log.debug('module_getEstAllocationFactorLS', 'saleConversion : '+saleConversion);
//						if (estQuantities[x].item == obj.itemId){
//							thisEstimatedRevenue = parseFloat(estQuantities[x].qty) * parseFloat(itemPrice.price) * (estConversion / saleConversion); 
//						}
//						totalEstimatedRevenue += parseFloat(estQuantities[x].qty) * parseFloat(itemPrice.price) * (estConversion / saleConversion);
//					}
//
//					log.debug('module_getEstAllocationFactorLS', 'thisEstimatedRevenue : ' + thisEstimatedRevenue +'; '+JSON.stringify(obj));
//					log.debug('module_getEstAllocationFactorLS', 'totalEstimatedRevenue : ' + totalEstimatedRevenue +'; '+JSON.stringify(obj));
//
//					thisFactor = (thisEstimatedRevenue / totalEstimatedRevenue).toFixed(6);
//
//				} else {
//					//ALLOCATE EVENLY
//					thisFactor = (1 / estQuantities.length).toFixed(6);
//					log.debug('module_getEstAllocationFactorLS', 'allocatedEvenly : ' + thisFactor +'; '+JSON.stringify(obj));
//				}
//				log.debug('module_getEstAllocationFactorLS', 'thisFactor : ' + thisFactor + '; ' + JSON.stringify(obj));
//				return {error: false, factor: thisFactor};
//			}
//		}catch(ex){
//			log.error('module_getEstAllocationFactorLS', ex.name +'; ' + ex.message + '; ' + JSON.stringify(obj));
//			return {error: true, factor: 0};
//		}
//	}

//	/**
//	 * @param {String} promID
//	 */
//	function calculateAllocationsLSforDraft(promID){
//		try{
//			//Adding Filters for KPI search
//			var searchFilter = [];
//			searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
//			searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator: search.Operator.ANYOF, values:promID}));
//			searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_esttotalqty', operator:search.Operator.GREATERTHAN, values:0}));
//
//			//Adding Columns for KPI search
//			var searchColumn = [];
//			searchColumn.push(search.createColumn({name: "custrecord_itpm_kpi_esttotalqty"}));
//
//			//KPI search
//			var kpiSearchObj_promQty = kpiSearch(searchFilter, searchColumn);
//
//			//Getting Promoted Quantity AT LEAST ONE
//			var iskpipromQty = kpiSearchObj_promQty.runPaged().count;
//			log.debug('iskpipromQty', iskpipromQty);
//
//			if(iskpipromQty > 0){
//				log.debug('<<<<< LS YES >>>>>');
//
//				//Adding Filters for KPI search
//				var searchFilter = [];
//				searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
//				searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator: search.Operator.ANYOF, values:promID}));
//
//				//Adding Columns for KPI search
//				var searchColumn = [];
//				searchColumn.push(search.createColumn({name: "id", sort: search.Sort.ASC}));
//
//				//KPI search
//				var kpiitemcount_searchObj = kpiSearch(searchFilter, searchColumn);
//
//				var itemcount = kpiitemcount_searchObj.runPaged().count;
//				log.debug('KPI Item Count on Promotion', itemcount);
//
//				if(itemcount == 1){
//					var objvalueskpi = {
//							kpiValues:{
//								'custrecord_itpm_kpi_factorestls' : 1
//							}
//					}
//					//Updating the related KPI record
//					var kpiRecUpdate = updateKPI((kpiitemcount_searchObj.run().getRange({start:0, end:1}))[0].getValue({ name:'id'}), objvalueskpi['kpiValues']);
//					log.debug('kpiRecUpdate(only 1 item)',kpiRecUpdate);
//				}
//				else if(itemcount > 1){
//					kpiitemcount_searchObj.run().each(function(result){
//						log.debug('id', result.getValue({name:'id'}));
//
//						//fetching Total Est.Qty. and Est.Qty. from KPI record
//						var fieldLookUp = search.lookupFields({
//							type    : 'customrecord_itpm_kpi',
//							id      : result.getValue({name:'id'}),
//							columns : ['custrecord_itpm_kpi_estimatedrevenue']
//						});
//
//						var estimatedRevenue = fieldLookUp.custrecord_itpm_kpi_estimatedrevenue;
//						estimatedRevenue = (estimatedRevenue)?estimatedRevenue:0;
//						log.debug('estimatedRevenue', +estimatedRevenue);
//
//						//Adding Filters for KPI search
//						var searchFilter = [];
//						searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
//						searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator: search.Operator.ANYOF, values:promID}));
//
//						//Adding Columns for KPI search
//						var searchColumn = [];
//						searchColumn.push(search.createColumn({name: "custrecord_itpm_kpi_estimatedrevenue", summary: "SUM", sort: search.Sort.ASC}));
//
//						//KPI search
//						var customrecord_itpm_kpiSearchObj = kpiSearch(searchFilter, searchColumn);
//
//						//Fetching Total Estimated Revenue
//						var totalEstimatedRevenue = parseFloat(customrecord_itpm_kpiSearchObj.run().getRange(0,1)[0].getValue({name:"custrecord_itpm_kpi_estimatedrevenue",summary:search.Summary.SUM}));
//						totalEstimatedRevenue = (totalEstimatedRevenue)?totalEstimatedRevenue:0;
//						log.debug('totalEstimatedRevenue', totalEstimatedRevenue);
//						final_total_eq = (totalEstimatedRevenue <= 0)?0:(parseFloat((estimatedRevenue/totalEstimatedRevenue)));
//						final_total_eq = final_total_eq.toFixed(6);
//
//						var objvalueskpi = {
//								kpiValues:{
//									'custrecord_itpm_kpi_factorestls' : final_total_eq
//								}
//						}
//						//Updating the related KPI record
//						var kpiRecUpdate = updateKPI(result.getValue({name:'id'}), objvalueskpi['kpiValues']);
//						log.debug('kpiRecUpdate',kpiRecUpdate);
//						return true;
//					});
//				}
//			}
//			//If NO
//			else{
//				//Counting Items for LS
//				log.debug('<<<<< LS NO >>>>>');
//				//Adding Filters for KPI search
//				var searchFilter = [];
//				searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
//				searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator: search.Operator.ANYOF, values:promID}));
//
//				//Adding Columns for KPI search
//				var searchColumn = [];
//				searchColumn.push(search.createColumn({name: "id", sort: search.Sort.ASC}));
//
//				//KPI search
//				var kpiitemcount_searchObj = kpiSearch(searchFilter, searchColumn);
//
//				var itemcount = kpiitemcount_searchObj.runPaged().count;
//				log.debug('KPI Item Count on Promotion', itemcount);
//
//				if(itemcount == 1){
//					var objvalueskpi = {
//							kpiValues:{
//								'custrecord_itpm_kpi_factorestls' : 1
//							}
//					}
//					//Updating the related KPI record
//					var kpiRecUpdate = updateKPI((kpiitemcount_searchObj.run().getRange({start:0, end:1}))[0].getValue({ name:'id'}), objvalueskpi['kpiValues']);
//					log.debug('kpiRecUpdate(only 1 item)',kpiRecUpdate);
//				}
//				else if(itemcount > 1){
//					kpiitemcount_searchObj.run().each(function(result){
//						log.debug('id', result.getValue({name:'id'}));
//
//						var objvalueskpi = {
//								kpiValues:{
//									'custrecord_itpm_kpi_factorestls' : parseFloat(1/itemcount).toFixed(6)
//								}
//						}
//						//Updating the related KPI record
//						var kpiRecUpdate = updateKPI(result.getValue({name:'id'}), objvalueskpi['kpiValues']);
//						log.debug('kpiRecUpdate',kpiRecUpdate);
//						return true;
//					});
//				}
//			}
//		}catch(e){
//			log.error(e.name, 'calculateAllocationsLSforDraft'+e.message);
//		}
//	}

//	/**
//	 * @param {String} promID
//	 */
//	function updateKPIActualEvenly(promID){
//		try{
//			//fetching Start  Date, End Date and Customer from Promotion
//			var fieldLookUp = search.lookupFields({
//				type    : 'customrecord_itpm_promotiondeal',
//				id      : promID,
//				columns : ['custrecord_itpm_p_type']
//			});
//
//			pType = fieldLookUp.custrecord_itpm_p_type[0].value;
//			log.debug('Promotion Type', pType);
//
//			//Fetching the DO NOT UPDATE LIABILITY BASED ON ACTUALS from Promotion type record
//			var fieldLookUpProType = search.lookupFields({
//				type    : 'customrecord_itpm_promotiontype',
//				id      : pType,
//				columns : ['custrecord_itpm_pt_dontupdate_lbonactual']
//			});
//
//			checkBox = fieldLookUpProType.custrecord_itpm_pt_dontupdate_lbonactual;
//			log.debug('checkBox on Promotion type ', checkBox);
//
//			//Adding Filters for KPI search
//			var searchFilter = [];
//			searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
//			searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator: search.Operator.ANYOF, values:promID}));
//
//			//Adding Columns for KPI search
//			var searchColumn = [];
//			searchColumn.push(search.createColumn({name: "id", sort: search.Sort.ASC}));
//
//			//KPI search
//			var kpiItemsSearchObj = kpiSearch(searchFilter, searchColumn);
//
//			var itemcount = kpiItemsSearchObj.runPaged().count;
//			log.debug('KPI Item Count on Promotion', itemcount);
//
//			kpiItemsSearchObj.run().each(function(result){
//				var fieldLookUp = search.lookupFields({
//					type    : 'customrecord_itpm_kpi',
//					id      : result.getValue('id'),
//					columns : ['custrecord_itpm_kpi_factorestls', 'custrecord_itpm_kpi_factorestbb','custrecord_itpm_kpi_factorestoi']
//				});
//
//				log.debug('LS: AF-Est, BB: AF-Est & OI: AF-Est', fieldLookUp.custrecord_itpm_kpi_factorestls+' , '+fieldLookUp.custrecord_itpm_kpi_factorestbb+' & '+fieldLookUp.custrecord_itpm_kpi_factorestoi);
//				var objvalueskpi = {
//						kpiValues:{
//							'custrecord_itpm_kpi_factoractualls' : fieldLookUp.custrecord_itpm_kpi_factorestls,
//							'custrecord_itpm_kpi_factoractualbb' : fieldLookUp.custrecord_itpm_kpi_factorestbb,
//							'custrecord_itpm_kpi_factoractualoi' : fieldLookUp.custrecord_itpm_kpi_factorestoi
//						}
//				}
//				if(checkBox){  //if "DO NOT UPDATE LIABILITY BASED ON ACTUALS" is checked/true
//					//Updating the related KPI record
//					var kpiRecUpdate = updateKPI(result.getValue({name:'id'}), objvalueskpi['kpiValues']);
//					log.debug('updated KPI',kpiRecUpdate);
//				}
//
//				return true;
//			});
//		}catch(e){
//			log.error(e.name, 'updateKPIActualEvenly'+e.message);
//		}
//	}

//	/**
//	 * @param {String} promID
//	 */
//	function approvedAllocationFactorActual(promID){
//		try{
//			var scriptObj = runtime.getCurrentScript();
//			log.debug('START',scriptObj.getRemainingUsage());
//			log.debug('================ APPROVED =================');
//			//fetching Start  Date, End Date and Customer from Promotion
//			var fieldLookUp = search.lookupFields({
//				type    : 'customrecord_itpm_promotiondeal',
//				id      : promID,
//				columns : ['custrecord_itpm_p_shipstart', 'custrecord_itpm_p_shipend', 'custrecord_itpm_p_customer','custrecord_itpm_p_type']
//			});
//
//			shipStartDate = fieldLookUp.custrecord_itpm_p_shipstart;
//			shipEndDate = fieldLookUp.custrecord_itpm_p_shipend;
//			customer = fieldLookUp.custrecord_itpm_p_customer[0].value;
//			pType = fieldLookUp.custrecord_itpm_p_type[0].value;
//			log.debug('customer, shipStartDate & shipEndDate', customer+' , '+shipStartDate+' & '+shipEndDate);
//
//			//Fetching the DO NOT UPDATE LIABILITY BASED ON ACTUALS from Promotion type record
//			var fieldLookUpProType = search.lookupFields({
//				type    : 'customrecord_itpm_promotiontype',
//				id      : pType,
//				columns : ['custrecord_itpm_pt_dontupdate_lbonactual']
//			});
//
//			checkBox = fieldLookUpProType.custrecord_itpm_pt_dontupdate_lbonactual;
//			log.debug('checkBox on Promotion type ', checkBox);
//
//			//Validating the DO NOT UPDATE LIABILITY BASED ON ACTUALS from Promotion type record
//			if(checkBox == false){
//				log.debug('checkBox on Promotion type FALSE', checkBox);
//				//Getting all items from KPI
//				var kpiItems = [];
//
//				//Adding Filters for KPI search
//				var searchFilter = [];
//				searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
//				searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator: search.Operator.ANYOF, values:promID}));
//
//				//Adding Columns for KPI search
//				var searchColumn = [];
//				searchColumn.push(search.createColumn({name: "custrecord_itpm_kpi_item"}));
//
//				//KPI search
//				var kpiitems_searchObj = kpiSearch(searchFilter, searchColumn);
//
//				kpiitems_searchObj.run().each(function(result){
//					kpiItems.push(result.getValue('custrecord_itpm_kpi_item'));
//					return true;
//				});
//
//				var actualSalesCount = 0;
//
//				for(var i=0; i<kpiItems.length; i++){
//					//Adding Columns
//					var searchColumn = [];
//					searchColumn.push(search.createColumn({
//						name:'internalid'
//					}));
//
//					var actualSaleSearchObj = getInvoiceSearch(searchColumn,kpiItems[i],customer,shipStartDate,shipEndDate);
//
//					if(actualSaleSearchObj.runPaged().count){
//						actualSalesCount++;
//					}
//				}
//				log.debug('actualSalesCount', actualSalesCount);
//
//				if(actualSalesCount > 0){
//					log.debug('ACTUAL YES');
//					objBB = {
//							promoId: promID,
//							promoESorEL: 'custrecord_itpm_p_expliabilitybb', //or oi
//							kpiESorEL: 'custrecord_itpm_kpi_expectedliabilitybb', //or oi
//							mop: 1, // for BB
//							kpiValues: {
//								'custrecord_itpm_kpi_factoractualbb': 1
//							}
//					}
//
//					calculateActualBBandOIApproved(objBB);
//					objOI = {
//							promoId: promID,
//							promoESorEL: 'custrecord_itpm_expectedliabilityoi', 
//							kpiESorEL: 'custrecord_itpm_kpi_expectedliabilityoi', 
//							mop: 3, // for OI
//							kpiValues: {
//								'custrecord_itpm_kpi_factoractualoi': 1,
//								'custrecord_itpm_kpi_allocfactcalculated': true
//							}
//					}			
//					calculateActualBBandOIApproved(objOI);
//					//Setting "true" value to the Is Allocation Factor Calculations Completed? check-box after updating the allocation calculations
//					//Based on the function call we added in the function calculateActualLSApproved() for checking that value
//					calculateActualLSApproved(promID);
//				}else{
//					log.debug('ACTUAL NO');
//					processActualNO(promID);
//				}
//				log.debug('END',scriptObj.getRemainingUsage());
//			}else{
//				log.debug('checkBox on Promotion type TRUE', checkBox);
//				processActualNO(promID);
//			}
//		}catch(e){
//			log.error(e.name, 'approvedAllocationFactorActual'+e.message);
//		}
//	}

//	/**
//	 * @param {Object} obj
//	 */
//	function calculateActualBBandOIApproved(obj){
//		try{
//			log.debug('============== Actual BB or OI ===============',obj['mop']);
//			//Fetching Expected liability: BB from Promotion record
//			var promSearchObjbb = search.create({
//				type: "customrecord_itpm_promotiondeal",
//				filters: [
//					["internalid", "anyof", obj['promoId']],
//					"AND",
//					["custrecord_itpm_kpi_promotiondeal.isinactive", "is", "F"]
//					],
//				columns: [ 
//					search.createColumn({
//						name: obj['kpiESorEL'],
//						join: "CUSTRECORD_ITPM_KPI_PROMOTIONDEAL",
//						summary: "SUM",
//						sort: search.Sort.ASC
//					})
//					]
//			});
//
//			var totalexpliability = promSearchObjbb.run().getRange(0,1)[0].getValue({
//				name: obj['kpiESorEL'],
//				join: "CUSTRECORD_ITPM_KPI_PROMOTIONDEAL",
//				summary:search.Summary.SUM
//			});
//			totalexpliability = (totalexpliability)?totalexpliability:0;
//			log.debug('Expected liability:'+obj['mop'], totalexpliability);
//
//			//Counting Items IF MOP is BB or OI
//			var promoallowanceSearchObj = promAllowanceSearch(obj['promoId'], obj['mop']);
//
//			var items = [],itemcount = 0;
//
//			promoallowanceSearchObj.run().each(function(result){
//				items.push(result.getValue('custrecord_itpm_all_item'));
//				return true;
//			});
//
//			if(items.length > 0){
//				//Adding Filters for KPI search
//				var searchFilter = [];
//				searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
//				searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator: search.Operator.ANYOF, values:obj['promoId']}));
//				searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_item', operator:search.Operator.ANYOF, values:items}));
//
//				//Adding Columns for KPI search
//				var searchColumn = [];
//				searchColumn.push(search.createColumn({name: "id", sort: search.Sort.ASC}));
//
//				//KPI search
//				var kpiitemcount_searchObj = kpiSearch(searchFilter, searchColumn);
//
//				itemcount = kpiitemcount_searchObj.runPaged().count;
//				log.debug('KPI Item Count on Promotion', itemcount);
//			}
//
//
//			if(itemcount == 1){
//				//Updating the related KPI record
//				var kpiRecUpdate = updateKPI((kpiitemcount_searchObj.run().getRange({start:0, end:1}))[0].getValue({ name:'id'}), obj['kpiValues']);
//				log.debug('kpiRecUpdate',kpiRecUpdate);
//			}
//			else if(itemcount > 1){
//				kpiitemcount_searchObj.run().each(function(result){
//					log.debug('id', result.getValue({name:'id'}));
//
//					//fetching Expected liability BB from KPI record
//					var fieldLookUp = search.lookupFields({
//						type    : 'customrecord_itpm_kpi',
//						id      : result.getValue({name:'id'}),
//						columns : obj['kpiESorEL']
//					});
//					var el = fieldLookUp[obj['kpiESorEL']];	
//					el = (el)?el:0;
//					log.debug('el',el);
//
//					final_total_eq = (totalexpliability <= 0)?0:(parseFloat((el/totalexpliability)));
//					final_total_eq = final_total_eq.toFixed(6);
//					obj['kpiValues'][Object.keys(obj.kpiValues)[0]] = final_total_eq;
//
//					//Updating the related KPI record
//					var kpiRecUpdate = updateKPI(result.getValue({name:'id'}), obj['kpiValues']);
//					log.debug('kpiRecUpdate',kpiRecUpdate);
//					return true;
//				});
//			}
//		}catch(e){
//			log.error(e.name, 'calculateActualBBandOIApproved'+e.message);
//		}
//	}

//	/**
//	 * @param {String} promID
//	 */
//	function calculateActualLSApproved(promID){
//		try{
//			log.debug('==================== ACTUAL LS ==================');
//			//fetching Start  Date, End Date and Customer from Promotion
//			var fieldLookUp = search.lookupFields({
//				type    : 'customrecord_itpm_promotiondeal',
//				id      : promID,
//				columns : ['custrecord_itpm_p_shipstart', 'custrecord_itpm_p_shipend', 'custrecord_itpm_p_customer']
//			});
//
//			shipStartDate = fieldLookUp.custrecord_itpm_p_shipstart;
//			shipEndDate = fieldLookUp.custrecord_itpm_p_shipend;
//			customer = fieldLookUp.custrecord_itpm_p_customer[0].value;
//			log.debug('customer, shipStartDate & shipEndDate', customer+' , '+shipStartDate+' & '+shipEndDate);
//
//			//Getting all items from KPI
//			var kpiItems = [];
//
//			//Adding Filters for KPI search
//			var searchFilter = [];
//			searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
//			searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator: search.Operator.ANYOF, values:promID}));
//
//			//Adding Columns for KPI search
//			var searchColumn = [];
//			searchColumn.push(search.createColumn({name: "id", sort: search.Sort.ASC}));
//			searchColumn.push(search.createColumn({name: "custrecord_itpm_kpi_item"}));
//
//			//KPI search
//			var kpiitemcount_searchObj = kpiSearch(searchFilter, searchColumn);
//
//			kpiitemcount_searchObj.run().each(function(result){
//				kpiItems.push(result.getValue('custrecord_itpm_kpi_item'));
//				return true;
//			});
//
//			//Adding Columns
//			var searchColumn = [];
//			searchColumn.push(search.createColumn({
//				name:'amount',
//				summary: "SUM"
//			}));
//
//			var actualSaleSearchObj = getInvoiceSearch(searchColumn,kpiItems,customer,shipStartDate,shipEndDate);
//
//			var totalrevenue = actualSaleSearchObj.run().getRange(0,1)[0].getValue({
//				name:"amount",
//				summary:search.Summary.SUM
//			});
//			totalrevenue = (totalrevenue)?totalrevenue:0;
//			log.debug('totalrevenue',totalrevenue);
//
//			var itemcount = kpiitemcount_searchObj.runPaged().count;
//			log.debug('KPI Item Count on Promotion', itemcount);
//
//			if(itemcount == 1){
//				var objvalueskpi = {
//						kpiValues:{
//							'custrecord_itpm_kpi_factoractualls' : 1,
//							'custrecord_itpm_kpi_allocfactcalculated': true
//						}
//				}
//				//Updating the related KPI record
//				//Setting "true" value to the Is Allocation Factor Calculations Completed? check-box after updating the allocation calculations
//				var kpiRecUpdate = updateKPI((kpiitemcount_searchObj.run().getRange({start:0, end:1}))[0].getValue({ name:'id'}), objvalueskpi['kpiValues']);
//				log.debug('kpiRecUpdate(only 1 item)',kpiRecUpdate);
//			}
//			else if(itemcount > 1){
//				kpiitemcount_searchObj.run().each(function(result){
//					log.debug('id', result.getValue({name:'id'}));
//					log.debug('Item ID', result.getValue({name:'custrecord_itpm_kpi_item'}));
//
//					var searchCol = [];
//					searchCol.push(search.createColumn({
//						name:'amount',
//						summary: "SUM"
//					}));
//
//					var aSaleSearchObj = getInvoiceSearch(searchCol,result.getValue({name:'custrecord_itpm_kpi_item'}),customer,shipStartDate,shipEndDate);
//
//					var actualRevenue = aSaleSearchObj.run().getRange(0,1)[0].getValue({
//						name:"amount",
//						summary:search.Summary.SUM
//					});
//					actualRevenue = (actualRevenue)?actualRevenue:0;
//					log.debug('actualRevenue',actualRevenue);
//					final_total_eq = (totalrevenue <= 0)?0:(parseFloat((actualRevenue/totalrevenue)));
//					final_total_eq = final_total_eq.toFixed(6);
//					//Updating the related KPI record
//					//Setting "true" value to the Is Allocation Factor Calculations Completed? check-box after updating the allocation calculations
//					var objvalueskpi = {
//							kpiValues:{
//								'custrecord_itpm_kpi_factoractualls' : final_total_eq,
//								'custrecord_itpm_kpi_allocfactcalculated': true
//							}
//					}
//					var kpiRecUpdate = updateKPI(result.getValue({name:'id'}), objvalueskpi['kpiValues']);
//					log.debug('kpiRecUpdate',kpiRecUpdate);
//					return true;
//				});
//			}
//		}catch(e){
//			log.error(e.name, 'calculateActualLSApproved'+e.message);
//		}
//	}

//	/**
//	 * @param {String} promID
//	 */
//	function processActualNO(promID){
//		try{
//			//Adding Filters for KPI search
//			var searchFilter = [];
//			searchFilter.push(search.createFilter({name:'isinactive', operator:search.Operator.IS, values:"F"}));
//			searchFilter.push(search.createFilter({name:'custrecord_itpm_kpi_promotiondeal', operator: search.Operator.ANYOF, values:promID}));
//
//			//Adding Columns for KPI search
//			var searchColumn = [];
//			searchColumn.push(search.createColumn({name: "id", sort: search.Sort.ASC}));
//			searchColumn.push(search.createColumn({name: "custrecord_itpm_kpi_item"}));
//			searchColumn.push(search.createColumn({name: "custrecord_itpm_kpi_factorestls"}));
//			searchColumn.push(search.createColumn({name: "custrecord_itpm_kpi_factorestbb"}));
//			searchColumn.push(search.createColumn({name: "custrecord_itpm_kpi_factorestoi"}));
//
//			//KPI search
//			var kpiitemcount_searchObj = kpiSearch(searchFilter, searchColumn);
//			log.debug('kpiitemcount_searchObj',kpiitemcount_searchObj);
//
//			kpiitemcount_searchObj.run().each(function(result){
//				//Updating the related KPI record
//				var objvalueskpi = {
//						kpiValues:{
//							'custrecord_itpm_kpi_factoractualls' : result.getValue('custrecord_itpm_kpi_factorestls'),
//							'custrecord_itpm_kpi_factoractualbb' : result.getValue('custrecord_itpm_kpi_factorestbb'),
//							'custrecord_itpm_kpi_factoractualoi' : result.getValue('custrecord_itpm_kpi_factorestoi'),
//							'custrecord_itpm_kpi_allocfactcalculated' : true
//						}
//				}
//
//				var kpiRecUpdate = updateKPI(result.getValue({name:'id'}), objvalueskpi['kpiValues']);
//				log.debug('kpiRecUpdate',kpiRecUpdate);
//
//				return true;
//			});
//		}catch(e){
//			log.error(e.name, 'processActualNO'+e.message);
//		}
//	}

//	/**
//	 * @param {String}
//	 * @param {Integer}
//	 * 
//	 * @returns {Object}
//	 */
//	function promAllowanceSearch(promID, mop){
//		try{
//			return search.create({
//				type: "customrecord_itpm_promoallowance",
//				filters: [
//					["custrecord_itpm_all_promotiondeal","anyof",promID], 
//					"AND", 
//					["isinactive","is","F"], 
//					"AND", 
//					["custrecord_itpm_all_mop","anyof",mop]
//					],
//					columns: [
//						"custrecord_itpm_all_item"
//						]
//			});
//		}catch(e){
//			log.error(e.name, 'promAllowanceSearch'+e.message);
//		}
//	}

//	/**
//	 * @param {Array} searchFilter
//	 * @returns {Object} search
//	 */
//	function kpiSearch(searchFilter, searchColumn){
//		try{
//			return search.create({
//				type: "customrecord_itpm_kpi",
//				filters: searchFilter,
//				columns: searchColumn
//			});
//		}catch(e){
//			log.error(e.name, 'kpiSearch'+e.message);
//		}
//	}

//	/**
//	 * @param {String} internalid
//	 * @param {Object} objvalues
//	 * 
//	 * @returns {String} internalid
//	 */
//	function updateKPI(id, objvalues){
//		try{
//			var kpiRecUpdate = record.submitFields({
//				type: 'customrecord_itpm_kpi',
//				id: id,
//				values: objvalues,
//				options: {enablesourcing: true, ignoreMandatoryFields: true}
//			});
//
//			return kpiRecUpdate;
//		}catch(e){
//			log.error(e.name, 'updateKPI: '+e.message);
//		}
//	}

//	/**
//	 * @param {Array} searchColumn
//	 * @param {String} items
//	 * @param {String} entityId - customerId
//	 * @param {String} st - start date
//	 * @param {String} end - end date
//	 * @returns {Object} search
//	 */
//	function getInvoiceSearch(searchColumn,items,custId,st,end){
//		try{
//			//getting the sub customers of the customer
//			var subCustIds = getSubCustomers(custId);
//			log.debug('getActualQty:subCustIds',subCustIds);
//			
//			return search.create({
//				type:search.Type.INVOICE,
//				columns:searchColumn,
//				filters:[
//					['item','anyof',items],'and',
//					['entity','anyof',subCustIds],'and',
//					['trandate','within',st,end],'and',
//					['status','anyof',['CustInvc:A','CustInvc:B']],'and',
//					['taxline','is',false],'and',
//					['cogs','is',false],'and',
//					['shipping','is',false],'and',
//					['item.isinactive','is',false]
//					]
//			});
//		}catch(e){
//			log.error(e.name, 'getInvoiceSearch'+e.message);
//		}
//	}

	/**
	 * @param promoId
	 * @param itemId
	 * @returns SUM of Expected Liability LS for other items
	 */
	function getOtherKpiExpectedLibSUM(promoId,itemId){
		//get the SUM of Expected Liability LS for other items
		var kpiSearch = search.create({
			type:'customrecord_itpm_kpi',
			columns:[
				search.createColumn({
					name:'custrecord_itpm_kpi_expectedliabilityls',
					summary:search.Summary.SUM
				})
				],
				filters:[
					['custrecord_itpm_kpi_promotiondeal','anyof',promoId],'and',
					['custrecord_itpm_kpi_item','noneof',itemId],'and',
					['isinactive','is',false]
					]
		}).run().getRange(0,1);
		return parseFloat(kpiSearch[0].getValue({name:'custrecord_itpm_kpi_expectedliabilityls',summary:search.Summary.SUM}));
	}

//	/**
//	 * @param promoId
//	 * @param itemId
//	 * @returns SUM of Maximum Liability LS for other items
//	 */
//	function getOtherItemLiabilitySUM(promoId,itemId,fieldId){
//		//get the SUM of Maximum Liability LS for other items
//		var kpiSearch = search.create({
//			type:'customrecord_itpm_kpi',
//			columns:[
//				search.createColumn({
//					name:fieldId,
//					summary:search.Summary.SUM
//				})
//				],
//				filters:[
//					['custrecord_itpm_kpi_promotiondeal','anyof',promoId],'and',
//					['custrecord_itpm_kpi_item','noneof',itemId],'and',
//					['isinactive','is',false]
//					]
//		}).run().getRange(0,1);
//		return parseFloat(kpiSearch[0].getValue({name:fieldId,summary:search.Summary.SUM}));
//	}

	/**
	 * @param {String} customer
	 * @param {String} deductionOpenBal
	 * @param {String} jeamount
	 * @param {String} journalId
	 * @param {String} creditmemoid
	 * @param {String} dedid
	 * @param {Boolean} locationExists
	 * @param {Boolean} classExists
	 * @param {Boolean} departmentExists
	 * 
	 * @returns
	 * 
	 * @description This function is used to apply the credit memo from a deduction. 
	 *              Functionality: Match To Credit Memo from a Deduction.
	 *              Used Scripts:  iTPM_SU_Deduction_MatchToCreditMemoList.js, iTPM_UE_Journal_Entry_Process.js
	 */
	function applyCreditMemo(customer, deductionOpenBal, jeamount, journalId, creditmemoid, dedid, locationExists, classExists, departmentExists){
		try{
			/*log.audit('applyCreditMemo - customer', customer);
			log.audit('applyCreditMemo - deductionOpenBal', deductionOpenBal);
			log.audit('applyCreditMemo - jeamount', jeamount);
			log.audit('applyCreditMemo - journalId', journalId);
			log.audit('applyCreditMemo - creditmemoid', creditmemoid);
			log.audit('applyCreditMemo - dedid', dedid);
			log.audit('applyCreditMemo - locationExists', locationExists);
			log.audit('applyCreditMemo - classExists', classExists);
			log.audit('applyCreditMemo - departmentExists', departmentExists);*/
			//Applying Credit memo on JE(created for Deduction) through customer payment
			var paymentId = createCustomerPayment(customer, journalId, creditmemoid, locationExists, classExists, departmentExists);
			log.debug('Customer Payment ',paymentId);

			//getting credit memo status
			var cmLookup = search.lookupFields({
				type    : search.Type.CREDIT_MEMO,
				id      : creditmemoid,
				columns : ['status']
			});
			log.debug('CM Status', cmLookup.status[0].text);

			//Validate and deduct credit memo applied amount from 
			if(cmLookup.status[0].text == 'Fully Applied'){
				//Decrease and set the open balance amount on Deduction
				var ddnOpenBal = parseFloat(deductionOpenBal)-parseFloat(jeamount);
				log.debug('ddnOpenBal',ddnOpenBal);

				DedRecId = record.submitFields({
					type    : 'customtransaction_itpm_deduction',
					id      : dedid,
					values  : {'custbody_itpm_ddn_openbal' : ddnOpenBal},
					options : {enableSourcing: true, ignoreMandatoryFields: true}
				});
				log.debug('Decreasing the open balance from deduction after applying the same amount on Credit Memo',DedRecId);

				//Setting iTPM JE Applied status into Processed
				jeRecId = record.submitFields({
					type    : record.Type.JOURNAL_ENTRY,
					id      : journalId,
					values  : {'custbody_itpm_je_applied_status' : 'Processed'},
					options : {enableSourcing: true, ignoreMandatoryFields: true}
				});
				log.debug('setting iTPM JE Applied Status',jeRecId);

				//Redirect To Deduction
				redirect.toRecord({
					type : 'customtransaction_itpm_deduction',
					id : DedRecId					
				});
			}else{
				//Redirect To Journal Entry
				redirect.toRecord({
					type : record.Type.JOURNAL_ENTRY,
					id : journalId					
				});
			}
		}catch(e){
			log.error(e.name, 'applyCreditMemo'+e.message);
		}
	}

	/**
	 * @param {String} customer
	 * @param {String} journalId
	 * @param {String} creditmemoid
	 * @param {Boolean} locationExists
	 * @param {Boolean} classExists
	 * @param {Boolean} departmentExists
	 * 
	 * @returns
	 * 
	 * @description This function is used to apply the credit memo from a deduction. 
	 *              Functionality: Match To Credit Memo from a Deduction.
	 *              Used Scripts:  iTPM_SU_Deduction_MatchToCreditMemoList.js, iTPM_UE_Journal_Entry_Process.js
	 */
	function createCustomerPayment(customer, journalId, creditmemoid, locationExists, classExists, departmentExists){
		try{
			/*log.audit('createCustomerPayment - customer', customer);
			log.audit('createCustomerPayment - journalId', journalId);
			log.audit('createCustomerPayment - creditmemoid', creditmemoid);
			log.audit('createCustomerPayment - locationExists', locationExists);
			log.audit('createCustomerPayment - classExists', classExists);
			log.audit('createCustomerPayment - departmentExists', departmentExists);*/
			//getting location, class and department
			var cmLookup = search.lookupFields({
				type    : search.Type.CREDIT_MEMO,
				id      : creditmemoid,
				columns : ['location', 'class', 'department']
			});

			var customerTransformRec = record.transform({
				fromType: record.Type.CUSTOMER,
				fromId: customer,
				toType: record.Type.CUSTOMER_PAYMENT
			});

			if(classExists && cmLookup.class.length > 0){
				customerTransformRec.setValue({
					fieldId:'class',
					value:cmLookup.class[0].value
				});
			}

			if(locationExists && cmLookup.location.length > 0){
				customerTransformRec.setValue({
					fieldId:'location',
					value:cmLookup.location[0].value
				});
			}

			if(departmentExists && cmLookup.department.length > 0){
				customerTransformRec.setValue({
					fieldId:'department',
					value:cmLookup.department[0].value
				});
			}

			for(var j=0; j < customerTransformRec.getLineCount('apply');j++){
				var type = customerTransformRec.getSublistValue({
					sublistId: 'apply',
					fieldId: 'trantype',
					line: j
				}); 
				log.audit('createCustomerPayment - type', type);
				if(type == 'Journal'){
					var jeId = customerTransformRec.getSublistValue({
						sublistId: 'apply',
						fieldId: 'internalid',
						line: j
					});
					log.audit('createCustomerPayment - jeId', jeId);

					if(journalId == jeId){
						log.audit('jeid @ '+j, jeId);
						customerTransformRec.setSublistValue({
							sublistId: 'apply',
							fieldId: 'apply',
							line: j,
							value: true
						});
					}
				}
			}

			for(var c =0; c < customerTransformRec.getLineCount('credit');c++){
				var type = customerTransformRec.getSublistValue({
					sublistId: 'credit',
					fieldId: 'trantype',
					line: c
				}); 

				if(type == 'CustCred'){
					var cmId = customerTransformRec.getSublistValue({
						sublistId: 'credit',
						fieldId: 'internalid',
						line: c
					});

					if(creditmemoid == cmId){
						log.debug('cmid @ '+c, cmId);
						customerTransformRec.setSublistValue({
							sublistId: 'credit',
							fieldId: 'apply',
							line: c,
							value: true
						});

					}
				}
			}

			var paymentId = customerTransformRec.save({
				enableSourcing: false,
				ignoreMandatoryFields: true
			});
			log.debug('customerTransformRec(paymentId)',paymentId);
		}catch(e){
			log.error(e.name, 'createCustomerPayment'+e.message);
		}
	}

	/**
	 * @param parentDdnRec
	 * @param remainingAmount
	 * @param ddnExpnseAccount
	 * @returns {Number} child deduction record id
	 * @description creating the automated Deduction record 
	 */
	function createSplitDeduction(parentDdnRec,obj){
		var remainingAmount = parseFloat(obj.amount).toFixed(2);

		//creating the Deduction record for remaining amount
		var copiedDeductionRec = record.create({
			type:'customtransaction_itpm_deduction',
			isDynamic:true
		});
		var originalDDN = parentDdnRec.getValue('custbody_itpm_ddn_originalddn');

		//setting the applied to and parent deduction values and other main values.
		copiedDeductionRec.setValue({
			fieldId:'custbody_itpm_ddn_invoice',
			value:parentDdnRec.getValue('custbody_itpm_ddn_invoice')
		}).setValue({
			fieldId:'custbody_itpm_ddn_originalddn',
			value:(originalDDN)? originalDDN : parentDdnRec.id
		}).setValue({
			fieldId:'subsidiary',
			value:parentDdnRec.getValue('subsidiary')
		}).setValue({
			fieldId:'class',
			value:parentDdnRec.getValue('class')
		}).setValue({
			fieldId:'department',
			value:parentDdnRec.getValue('department')
		}).setValue({
			fieldId:'location',
			value:parentDdnRec.getValue('location')
		}).setValue({
			fieldId:'currecny',
			value:parentDdnRec.getValue('currency')
		}).setValue({
			fieldId:'custbody_itpm_ddn_assignedto',
			value:parentDdnRec.getValue('custbody_itpm_ddn_assignedto')
		}).setValue({
			fieldId:'custbody_itpm_customer',
			value:parentDdnRec.getValue('custbody_itpm_customer')
		}).setValue({
			fieldId:'custbody_itpm_ddn_parentddn',
			value:parentDdnRec.id
		}).setValue({
			fieldId:'custbody_itpm_appliedto',
			value:parentDdnRec.id
		}).setValue({
			fieldId:'custbody_itpm_otherrefcode',
			value:obj.refCode
		}).setValue({
			fieldId:'custbody_itpm_ddn_disputed',
			value:(obj.ddnDisputed)? obj.ddnDisputed : false //when split the deduction if first one checked second set to false
		}).setValue({
			fieldId:'custbody_itpm_amount',
			value:remainingAmount  //setting the remaining the amount value to the Amount field
		}).setValue({
			fieldId:'custbody_itpm_ddn_openbal',
			value:remainingAmount
		}).setValue({
			fieldId:'memo',
			value:(obj.memo)?obj.memo : 'Deduction split from Deduction #'+parentDdnRec.getText('tranid')
		}).setValue({ 
			fieldId:'custbody_itpm_ddn_splitoff',
			value: 0
		});
		
		log.debug('obj',obj);
		//setting the line values to copied deduction record
		for(var i = 0;i < 2;i++){
			copiedDeductionRec.selectNewLine({
				sublistId: 'line'
			});
			copiedDeductionRec.setCurrentSublistValue({
				sublistId:'line',
				fieldId:'account',
				value:obj.ddnExpenseId
			}).setCurrentSublistValue({
				sublistId:'line',
				fieldId:(i==0)?'credit':'debit',
						value:remainingAmount
			}).setCurrentSublistValue({
				sublistId:'line',
				fieldId:'memo',
				value:(obj.memo)?obj.memo : 'Deduction split from Deduction #'+parentDdnRec.getText('tranid')
			}).setCurrentSublistValue({
				sublistId:'line',
				fieldId:'entity',
				value:(obj.removeCustomer)?'':parentDdnRec.getValue('custbody_itpm_customer')
			});
			copiedDeductionRec.commitLine({
				sublistId: 'line'
			});
		}

		//save the new child deduction record
		return copiedDeductionRec.save({enableSourcing:false,ignoreMandatoryFields:true});
	}

	/**
	 * @param ddnID
	 * @returns error if deduction not open
	 */
	function validateDeduction(ddnID){
		//Validate the deduction status
		var ddnStatus = search.lookupFields({
			type:'customtransaction_itpm_deduction',
			id:ddnID,
			columns:['status']
		})['status'][0]['value'];

		if(ddnStatus != 'statusA'){
			throw{
				name:'INVALID_STATUS',
				message:'Deduction status should be OPEN.'
			}
		}
	}

	/**
     * @param ddnId
     * @param setReqAmount
     * @returns Throws Error if Deduction Open Balance is less than Settlement Request Amount
     */
    function validateDeductionOpenBal(ddnId,setReqAmount){
    	var ddnOpenBal = search.lookupFields({
			type:'customtransaction_itpm_deduction',
			id:ddnId,
			columns:['custbody_itpm_ddn_openbal']
		})["custbody_itpm_ddn_openbal"];
		var diff = parseFloat(ddnOpenBal) - parseFloat(setReqAmount);
		if(diff < 0){
			throw{
				name:'INVALID_AMOUNT',
				message:'Deduction Open Balance should be greater or equal to applied amount.'
			}
		}
    }
    
    /**
     * @param custId
     * @returns sub-customers ID's of a parent customer 
     */
    function getSubCustomers(custId){
    	try{
    		var custIds = [];
    		search.create({
				type: "customer",
				filters: [["parent",'anyof',custId]],
				columns: ['internalid']
			}).run().each(function(k){ 
				custIds.push(k.getValue({name:'internalid'}));	
				return true;
			});
    		return custIds;
    	} catch(ex){
    		log.error ('module_getSubCustomers', ex.name +'; ' + ex.message + '; ');
    		return [custId];
    	}
    }
    
    /**
     * @param {String} promId
     * @param {Number} requestType
     * 
     * @description This function is used to create KPI Queue record based on the trigger conditions
     * Used Scripts: iTPM_UE_Promotion_Processing.js, iTPM_Attach_Promotion_ClientMethods.js, iTPM_UE_Settlement_Edit.js
     *  iTPM_UE_Allowance_Dynamic_Fields.js, iTPM_WFA_KPI_Calculations.js
     */
    function createKPIQueue(promId, requestType){
    	try{
    		var recObj = record.create({
    			type: 'customrecord_itpm_kpiqueue',
    			isDynamic: true
    		});
    		recObj.setValue({
    			fieldId: 'custrecord_itpm_kpiq_promotion',
    			value: promId
    		});
    		recObj.setValue({
    			fieldId: 'custrecord_itpm_kpiq_queuerequest',
    			value: requestType  //1.Scheduled, 2.Edited, 3.Status Changed, 4.Ad-hoc and 5.Settlement Status Changed
    		});

    		var recordId = recObj.save({
    			enableSourcing: false,
    			ignoreMandatoryFields: true
    		});
    		log.debug('KPI Queue record ID: '+recordId);
    	} catch(ex){
    		log.error ('module_createKPIQueue', ex.name +'; ' + ex.message + '; ');
    	}
    }
    
    
    /**
     * @param {Object} discountLogValues
     */
    function createDiscountLog(discountLogValues){
		var discountLogRecObj = record.create({
			type: 'customrecord_itpm_discountlog',
			isDynamic: true
		});

		discountLogRecObj.setValue({
			fieldId: 'name',
			value: discountLogValues.name,
			ignoreFieldChange: true
		});
		discountLogRecObj.setValue({
			fieldId: 'custrecord_itpm_slog_customer',
			value: discountLogValues.slog_customer,
			ignoreFieldChange: true
		});
		discountLogRecObj.setValue({
			fieldId: 'custrecord_itpm_slog_transaction',
			value: discountLogValues.slog_transaction,
			ignoreFieldChange: true
		});
		discountLogRecObj.setValue({
			fieldId: 'custrecord_itpm_slog_linenumber',
			value: discountLogValues.slog_linenumber,
			ignoreFieldChange: true
		});
		discountLogRecObj.setValue({
			fieldId: 'custrecord_itpm_slog_lineitem',
			value: discountLogValues.slog_lineitem,
			ignoreFieldChange: true
		});
		discountLogRecObj.setValue({
			fieldId: 'custrecord_itpm_slog_linequantity',
			value: discountLogValues.slog_linequantity,
			ignoreFieldChange: true
		});
		discountLogRecObj.setValue({
			fieldId: 'custrecord_itpm_slog_linepricelevel',
			value: discountLogValues.slog_linepricelevel,
			ignoreFieldChange: true
		});
		discountLogRecObj.setValue({
			fieldId: 'custrecord_itpm_slog_lineunit',
			value: discountLogValues.slog_lineunit,
			ignoreFieldChange: true
		});
		discountLogRecObj.setValue({
			fieldId: 'custrecord_itpm_slog_linerate',
			value: discountLogValues.slog_linerate,
			ignoreFieldChange: true
		});
		discountLogRecObj.setValue({
			fieldId: 'custrecord_itpm_slog_lineamount',
			value: discountLogValues.slog_lineamount,
			ignoreFieldChange: true
		});

		var discountLogRecID = discountLogRecObj.save({
			enableSourcing: true,
			ignoreMandatoryFields: true
		});

		return discountLogRecID;
	}
    
    /**
     * @param {Number} recID
     * @param {Object} discountLogLineValues
     */
    function createDiscountLogLine(recID, discountLogLineValues){
		var discountLogLineRecObj = record.create({
			type: 'customrecord_itpm_discountlogline',
			isDynamic: true
		});

		discountLogLineRecObj.setValue({
			fieldId: 'custrecord_itpm_sline_log',
			value: recID,
			ignoreFieldChange: true
		});
		discountLogLineRecObj.setValue({
			fieldId: 'name',
			value: discountLogLineValues.name,
			ignoreFieldChange: true
		});
		discountLogLineRecObj.setValue({
			fieldId: 'custrecord_itpm_sline_allpromotion',
			value: discountLogLineValues.sline_allpromotion,
			ignoreFieldChange: true
		});
		discountLogLineRecObj.setValue({
			fieldId: 'custrecord_itpm_sline_allowance',
			value: discountLogLineValues.sline_allowance,
			ignoreFieldChange: true
		});
//		discountLogLineRecObj.setValue({
//		fieldId: 'custrecord_itpm_sline_allid',
//		value: discountLogLineValues.sline_allid,
//		ignoreFieldChange: true
//		});
		discountLogLineRecObj.setValue({
			fieldId: 'custrecord_itpm_sline_allmop',
			value: discountLogLineValues.sline_allmop,
			ignoreFieldChange: true
		});
		discountLogLineRecObj.setValue({
			fieldId: 'custrecord_itpm_sline_alltype',
			value: discountLogLineValues.sline_alltype,
			ignoreFieldChange: true
		});
		discountLogLineRecObj.setValue({
			fieldId: 'custrecord_itpm_sline_allunit',
			value: discountLogLineValues.sline_allunit,
			ignoreFieldChange: true
		});
		discountLogLineRecObj.setValue({
			fieldId: 'custrecord_itpm_sline_allpercent',
			value: discountLogLineValues.sline_allpercent,
			ignoreFieldChange: true
		});
		discountLogLineRecObj.setValue({
			fieldId: 'custrecord_itpm_sline_allrate',
			value: discountLogLineValues.sline_allrate,
			ignoreFieldChange: true
		});
		discountLogLineRecObj.setValue({
			fieldId: 'custrecord_itpm_sline_calcrate',
			value: discountLogLineValues.sline_calcrate,
			ignoreFieldChange: true
		});
//		discountLogLineRecObj.setValue({
//		fieldId: 'custrecord_itpm_sline_item',
//		value: discountLogLineValues.sline_item,
//		ignoreFieldChange: true
//		});
//		discountLogLineRecObj.setValue({
//		fieldId: 'custrecord_itpm_sline_tranqty',
//		value: discountLogLineValues.sline_tranqty,
//		ignoreFieldChange: true
//		});
//		discountLogLineRecObj.setValue({
//		fieldId: 'custrecord_itpm_sline_tranunit',
//		value: discountLogLineValues.sline_tranunit,
//		ignoreFieldChange: true
//		});
//		discountLogLineRecObj.setValue({
//		fieldId: 'custrecord_itpm_sline_tranrate',
//		value: discountLogLineValues.sline_tranrate,
//		ignoreFieldChange: true
//		});
//		discountLogLineRecObj.setValue({
//		fieldId: 'custrecord_itpm_sline_tranamt',
//		value: discountLogLineValues.sline_tranamt,
//		ignoreFieldChange: true
//		});

		discountLogLineRecObj.save({
			enableSourcing: true,
			ignoreMandatoryFields: true
		});
	}
    
    
	/**
	 * @param {String} tranInternalid
	 * 
	 * @return {Array} Validation
	 */
	function validateDiscountLog(tranInternalid, itemID, line){
		var validation = [];
		var searchObj = search.create({
			type: 'customrecord_itpm_discountlog',
			filters : [["custrecord_itpm_slog_transaction", "anyof", tranInternalid],
			           "AND", 
			           ["custrecord_itpm_slog_linenumber","is",line],
			           "AND",
			           ["custrecord_itpm_slog_lineitem","anyof",itemID]],
			           columns : [{name: 'name'},{name: 'internalid'}]
		});

		var searchResults = searchObj.run().getRange({
			start: 0,
			end  : 999
		});

		if(searchResults.length == 0){
			validation['recordExists'] = false;

		}
		else{
			validation['recordExists'] = true;
			validation['discountId'] = searchResults[0].getValue('internalid');
		}
		return validation;
	}
    
    
    
    /**
     * @description Decode the Base64 code
     */
    function Base64(){
		// public method for decoding
		function decode(input) {
			this. _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
			var output = "";
			var chr1, chr2, chr3;
			var enc1, enc2, enc3, enc4;
			var i = 0;

			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

			while (i < input.length) {

				enc1 = this._keyStr.indexOf(input.charAt(i++));
				enc2 = this._keyStr.indexOf(input.charAt(i++));
				enc3 = this._keyStr.indexOf(input.charAt(i++));
				enc4 = this._keyStr.indexOf(input.charAt(i++));

				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;

				output = output + String.fromCharCode(chr1);

				if (enc3 != 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
					output = output + String.fromCharCode(chr3);
				}

			}
			return output;
		}
		return{
			decode:decode
		}
    }
    
    /**
     * @param strData
     * @param strDelimiter
     * @description converts the csv decoded data into array
     */
    function CSVToArray(strData, strDelimiter) {
	    // Check to see if the delimiter is defined. If not,
	    // then default to comma.
	    strDelimiter = (strDelimiter || ",");
	    // Create a regular expression to parse the CSV values.
	    var objPattern = new RegExp((
	    // Delimiters.
	    "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
	    // Quoted fields.
	    "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
	    // Standard fields.
	    "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");
	    // Create an array to hold our data. Give the array
	    // a default empty first row.
	    var arrData = [[]];
	    // Create an array to hold our individual pattern
	    // matching groups.
	    var arrMatches = null;
	    // Keep looping over the regular expression matches
	    // until we can no longer find a match.
	    while (arrMatches = objPattern.exec(strData)) {
	        // Get the delimiter that was found.
	        var strMatchedDelimiter = arrMatches[1];
	        // Check to see if the given delimiter has a length
	        // (is not the start of string) and if it matches
	        // field delimiter. If id does not, then we know
	        // that this delimiter is a row delimiter.
	        if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
	            // Since we have reached a new row of data,
	            // add an empty row to our data array.
	            arrData.push([]);
	        }
	        // Now that we have our delimiter out of the way,
	        // let's check to see which kind of value we
	        // captured (quoted or unquoted).
	        if (arrMatches[2]) {
	            // We found a quoted value. When we capture
	            // this value, unescape any double quotes.
	            var strMatchedValue = arrMatches[2].replace(
	            new RegExp("\"\"", "g"), "\"");
	        } else {
	            // We found a non-quoted value.
	            var strMatchedValue = arrMatches[3];
	        }
	        // Now that we have our value string, let's add
	        // it to the data array.
	        arrData[arrData.length - 1].push(strMatchedValue);
	    }
	    // Return the parsed data.
	    log.debug('arrData',arrData)
	    return arrData.filter(function(e){return e.length > 1});
	}
    
    /**
     * @param csv
     * @description Converts the csv data into json of array.
     */
	function CSV2JSON(csv) {
	    var array = CSVToArray(csv);
	    var objArray = [];
	    for (var i = 1; i < array.length; i++) {
	        objArray[i - 1] = {};
	        for (var k = 0; k < array[0].length && k < array[i].length; k++) {
	            var key = array[0][k];
	            objArray[i - 1][key] = array[i][k]
	        }
	    }

	    return objArray;
	}
    

	return {
		getItemUnits 						: 	getItemUnits,
		getActualQty 						: 	getActualQty,
		getLiability 						: 	getLiability,
		getSpend 							: 	getSpend,
		getImpactPrice						:	getImpactPrice,
		getDefaultValidMOP					:	getDefaultValidMOP,
		getPrefrenceValues					:	getPrefrenceValues,
		getItemGroupItems					:	getItemGroupItems,
		locationsEnabled 					: 	locationsEnabled,
		departmentsEnabled 					: 	departmentsEnabled,
		classesEnabled 						: 	classesEnabled,
		subsidiariesEnabled					:	subsidiariesEnabled,
		currenciesEnabled					:	currenciesEnabled,
		getClassifications					:	getClassifications,
		getUserPermission					:	getUserPermission,
		getJEPreferences					:	getJEPreferences,
//		processAllocationsDraft 			: 	processAllocationsDraft,
//		calculateEstAllocationsBBOIDraft 	: 	calculateEstAllocationsBBOIDraft,
//		calculateAllocationsLSforDraft 		: 	calculateAllocationsLSforDraft,
//		updateKPIActualEvenly 				: 	updateKPIActualEvenly,
//		approvedAllocationFactorActual 		: 	approvedAllocationFactorActual,
//		calculateActualBBandOIApproved 		: 	calculateActualBBandOIApproved,
//		calculateActualLSApproved 			: 	calculateActualLSApproved,
//		processActualNO 					: 	processActualNO,
//		promAllowanceSearch 				: 	promAllowanceSearch,
//		kpiSearch 							: 	kpiSearch,
//		updateKPI 							: 	updateKPI,
//		getInvoiceSearch 					: 	getInvoiceSearch,
//		getOtherItemLiabilitySUM			:	getOtherItemLiabilitySUM,
//		hasEstQty 							: 	hasEstQty,
//		getEstAllocationFactorLS 			: 	getEstAllocationFactorLS,
//		getActAllocationFactorLS 			: 	getActAllocationFactorLS,
		hasSales 							: 	hasSales,
		createSplitDeduction				:	createSplitDeduction,
		validateDeduction					:	validateDeduction,
		validateDeductionOpenBal			:	validateDeductionOpenBal,
		applyCreditMemo 					: 	applyCreditMemo,
		createCustomerPayment 				: 	createCustomerPayment,
		getSubCustomers 					: 	getSubCustomers,
		createKPIQueue 						: 	createKPIQueue,
		createDiscountLog					: 	createDiscountLog,
		createDiscountLogLine				: 	createDiscountLogLine,
		validateDiscountLog					:	validateDiscountLog,
		Base64								:	Base64,
		CSV2JSON							:	CSV2JSON
	};
});