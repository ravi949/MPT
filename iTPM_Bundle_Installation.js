/**
 * @NApiVersion 2.x
 * @NScriptType BundleInstallationScript
 * @NModuleScope TargetAccount
 * 
 * Required features - 	ACCOUNTING, A/R, A/P
 * 						CUSTOM RECORDS
 * 						CUSTOM TRANSACTIONS
 * 						CLIENT SUITESCRIPT
 * 						SERVER SUITESCRIPT
 * 						SUITEFLOW
 * 
 */
define(['N/config',
		'N/task',
		'N/search',
		'N/record',
		'N/runtime'
		],

function(config, task, search, record, runtime) {
	
	function checkRequirements() {
		try{
			var objConfig = config.load({type: config.Type.FEATURES});
			var accounting = objConfig.getValue({fieldId: 'accounting'});
			var receivables = objConfig.getValue({fieldId: 'receivables'});
			var payables = objConfig.getValue({fieldId: 'payables'});
			var customRecords = objConfig.getValue({fieldId: 'customrecords'});
			var customTransactions = objConfig.getValue({fieldId: 'customtransactions'});
			var clientScripts = objConfig.getValue({fieldId: 'customcode'});
			var serverScripts = objConfig.getValue({fieldId: 'serversidescripting'});
			var workflows = objConfig.getValue({fieldId: 'workflow'});
			
			var errorMessage = 'This bundle requires the following features to be enabled - ';
			if (!accounting) errorMessage += 'ACCOUNTING; ';
			if (!receivables) errorMessage += 'A/R; ';
			if (!payables) errorMessage += 'A/P; ';
			if (!customRecords) errorMessage += 'CUSTOM RECORDS; ';
			if (!customTransactions) errorMessage += 'CUSTOM TRANSACTIONS; ';
			if (!clientScripts) errorMessage += 'CLIENT SUITESCRIPT; ';
			if (!serverScripts) errorMessage += 'SERVER SUITESCRIPT; ';
			if (!workflows) errorMessage += 'SUITEFLOW; ';
			
			if (!(accounting && receivables && payables && customRecords && customTransactions && clientScripts && serverScripts && workflows)) {
				throw {
					name: 'iTPM_PREREQ',
					message: errorMessage
				};
			}
		} catch (ex) {
			throw ex;
		}
	}
   
    /**
     * Executes after a bundle is installed for the first time in a target account.
     *
     * @param {Object} params
     * @param {number} params.version - Version of the bundle being installed
     *
     * @since 2016.1
     */
    function beforeInstall(params) {
    	checkRequirements();
    }

    /**
     * Executes after a bundle in a target account is updated.
     *
     * @param {Object} params
     * @param {number} params.version - Version of the bundle being installed
     *
     * @since 2016.1
     */
    function afterInstall(params) {
    	log.debug('version after install',params);
    	
    	//script to modify status filter on all iTPM saved searches
    	//updateSearchFilters();
    	//create preference records
    	createPreferenceRecords(params.version);
    }
    
    /**
     * Executes before a bundle is installed for the first time in a target account.
     *
     * @param {Object} params
     * @param {number} params.fromVersion - Version currently installed
     * @param {number} params.toVersion -  New version of the bundle being installed
     *
     * @since 2016.1
     */
    function beforeUpdate(params) {
    	checkRequirements();
    }

    /**
     * Executes before a bundle is uninstalled from a target account.
     *
     * @param {Object} params
     * @param {number} params.fromVersion - Version currently installed
     * @param {number} params.toVersion -  New version of the bundle being installed
     *
     * @since 2016.1
     */
    function afterUpdate(params) {
    	log.debug('version after update',params);
    	
    	//task for set the promotion default values
    	task.create({
    		taskType: task.TaskType.MAP_REDUCE,
    		scriptId: 'customscript_itpm_mr_setpromodefaultval',
    		deploymentId: 'customdeploy_itpm_mr_setpromodefaultval'
    	}).submit();
    	
    	//task for set the externalid on deduction split record
    	task.create({
    		taskType: task.TaskType.MAP_REDUCE,
    		scriptId: 'customscript_itpm_ddn_spilt_externalid',
    		deploymentId: 'customdeploy_itpm_ddn_spilt_externalid'
    	}).submit();
    	
    	//task for update estimated revenue on kpi record
    	task.create({
    		taskType: task.TaskType.MAP_REDUCE,
    		scriptId: 'customscript_itpm_mr_kpi_updateestreven',
    		deploymentId: 'customdeploy_itpm_mr_kpi_updateestreven'
    	}).submit();
    	
    	//script to modify status filter on all iTPM saved searches
    	//updateSearchFilters();
    	
    	//create and update the preference records
    	createPreferenceRecords(params.toVersion);
    }
    
    
    function updateSearchFilters(){
    	try{
    		//Getting Record Type Id's for both "- iTPM Settlement Record" and "- iTPM Deduction Record"
    		var deductionRecID = record.create({
    			type:'customtransaction_itpm_deduction'
    		}).getValue('customtype');

    		log.error('deduction type',deductionRecID);

    		var settlemntRecID = record.create({
    			type:'customtransaction_itpm_settlement'
    		}).getValue('customtype');

    		log.error('settlement type',settlemntRecID);
    		
    		//1. Adding Filters to Saved Search: - iTPM Bill Back Actual Spend
    		var mySettlementSearch1 = search.load({
    			id: 'customsearch_itpm_billbackactualspend'
    		});
    		
    		mySettlementSearch1.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch1.filters.push(search.createFilter({
    			"name"    : "mainline",
    			"operator": "is",
    			"values"  : 'T'
    		}));
    		mySettlementSearch1.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "anyof",
    			"values"  : ["Custom"+settlemntRecID+":B","Custom"+settlemntRecID+":E","Custom"+settlemntRecID+":A"]
    		}));
    		mySettlementSearch1.filters.push(search.createFilter({
    			"name"    : "custbody_itpm_set_reqbb",
    			"operator": "greaterthan",
    			"values"  : 0.00
    		}));
    		
    		mySettlementSearch1.save();
    		
    		//2. Adding Filters to Saved Search: - iTPM DDN Settlements Applied
    		var mySettlementSearch2 = search.load({
    			id: 'customsearch_itpm_ddn_settlements'
    		});
    		
    		mySettlementSearch2.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch2.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "anyof",
    			"values"  : ["Custom"+settlemntRecID+":B","Custom"+settlemntRecID+":E"]
    		}));
    		mySettlementSearch2.filters.push(search.createFilter({
    			"name"    : "mainline",
    			"operator": "is",
    			"values"  : 'T'
    		}));
    		
    		mySettlementSearch2.save();
    		
    		//3. Adding Filters to Saved Search: - iTPM Lump Sum Actual Spend
    		var mySettlementSearch3 = search.load({
    			id: 'customsearch_itpm_lsactualspend'
    		});
    		
    		mySettlementSearch3.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch3.filters.push(search.createFilter({
    			"name"    : "mainline",
    			"operator": "is",
    			"values"  : 'T'
    		}));
    		mySettlementSearch3.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "anyof",
    			"values"  : ["Custom"+settlemntRecID+":B","Custom"+settlemntRecID+":E","Custom"+settlemntRecID+":A"]
    		}));
    		mySettlementSearch3.filters.push(search.createFilter({
    			"name"    : "custbody_itpm_set_reqls",
    			"operator": "greaterthanorequalto",
    			"values"  : 0.00
    		}));
    		
    		mySettlementSearch3.save();
    		
    		//4. Adding Filters to Saved Search: - iTPM Overpay : Missed OI
    		var mySettlementSearch4 = search.load({
    			id: 'customsearch_itpm_missedoffinvoverpayamt'
    		});
    		
    		mySettlementSearch4.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch4.filters.push(search.createFilter({
    			"name"    : "mainline",
    			"operator": "is",
    			"values"  : 'T'
    		}));
    		mySettlementSearch4.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "anyof",
    			"values"  : ["Custom"+settlemntRecID+":B","Custom"+settlemntRecID+":E","Custom"+settlemntRecID+":A"]
    		}));
    		mySettlementSearch4.filters.push(search.createFilter({
    			"name"    : "custbody_itpm_set_reqoi",
    			"operator": "greaterthan",
    			"values"  : 0.00
    		}));
    		
    		mySettlementSearch4.save();
    		
    		//5. Adding Filters to Saved Search: - iTPM Promotion Settlements BB
    		var mySettlementSearch5 = search.load({
    			id: 'customsearch_itpm_promosettlementsbb'
    		});
    		
    		mySettlementSearch5.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch5.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "noneof",
    			"values"  : ["Custom"+settlemntRecID+":C","Custom"+settlemntRecID+":V"]
    		}));
    		mySettlementSearch5.filters.push(search.createFilter({
    			"name"    : "custcol_itpm_lsbboi",
    			"operator": "anyof",
    			"values"  : '2'
    		}));
    		mySettlementSearch5.filters.push(search.createFilter({
    			"name"    : "debitamount",
    			"operator": "greaterthan",
    			"values"  : 0.00
    		}));
    		
    		mySettlementSearch5.save();
    		
    		//6. Adding Filters to Saved Search: - iTPM Promotion Settlements BB Pending
    		var mySettlementSearch6 = search.load({
    			id: 'customsearch_itpm_promosettlementsbbpend'
    		});
    		
    		mySettlementSearch6.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch6.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "anyof",
    			"values"  : ["Custom"+settlemntRecID+":E"]
    		}));
    		mySettlementSearch6.filters.push(search.createFilter({
    			"name"    : "custcol_itpm_lsbboi",
    			"operator": "anyof",
    			"values"  : '2'
    		}));
    		mySettlementSearch6.filters.push(search.createFilter({
    			"name"    : "debitamount",
    			"operator": "greaterthan",
    			"values"  : 0.00
    		}));
    		
    		mySettlementSearch6.save();
    		
    		//7. Adding Filters to Saved Search: - iTPM Promotion Settlements LS
    		var mySettlementSearch7 = search.load({
    			id: 'customsearch_itpm_promosettlementsls'
    		});
    		
    		mySettlementSearch7.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch7.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "noneof",
    			"values"  : ["Custom"+settlemntRecID+":C","Custom"+settlemntRecID+":V"]
    		}));
    		mySettlementSearch7.filters.push(search.createFilter({
    			"name"    : "debitamount",
    			"operator": "greaterthan",
    			"values"  : 0.00
    		}));
    		mySettlementSearch7.filters.push(search.createFilter({
    			"name"    : "custcol_itpm_lsbboi",
    			"operator": "anyof",
    			"values"  : '1'
    		}));
    				
    		mySettlementSearch7.save();
    		
    		//8. Adding Filters to Saved Search: - iTPM Promotion Settlements LS Pending
    		var mySettlementSearch8 = search.load({
    			id: 'customsearch_itpm_promosettlementslspend'
    		});
    		
    		mySettlementSearch8.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch8.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "anyof",
    			"values"  : ["Custom"+settlemntRecID+":E"]
    		}));
    		mySettlementSearch8.filters.push(search.createFilter({
    			"name"    : "debitamount",
    			"operator": "greaterthan",
    			"values"  : 0.00
    		}));
    		mySettlementSearch8.filters.push(search.createFilter({
    			"name"    : "custcol_itpm_lsbboi",
    			"operator": "anyof",
    			"values"  : '1'
    		}));
    				
    		mySettlementSearch8.save();
    		
    		//9. Adding Filters to Saved Search: - iTPM Promotion Settlements OI
    		var mySettlementSearch9 = search.load({
    			id: 'customsearch_itpm_promosettlementsoi'
    		});
    		
    		mySettlementSearch9.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch9.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "noneof",
    			"values"  : ["Custom"+settlemntRecID+":C","Custom"+settlemntRecID+":V"]
    		}));
    		mySettlementSearch9.filters.push(search.createFilter({
    			"name"    : "custcol_itpm_lsbboi",
    			"operator": "anyof",
    			"values"  : '3'
    		}));
    		mySettlementSearch9.filters.push(search.createFilter({
    			"name"    : "debitamount",
    			"operator": "greaterthan",
    			"values"  : 0.00
    		}));
    						
    		mySettlementSearch9.save();
    		
    		//10. Adding Filters to Saved Search: - iTPM Promotion Settlements OI Pending
    		var mySettlementSearch10 = search.load({
    			id: 'customsearch_itpm_promosettlementsoipend'
    		});
    		
    		mySettlementSearch10.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch10.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "anyof",
    			"values"  : ["Custom"+settlemntRecID+":E"]
    		}));
    		mySettlementSearch10.filters.push(search.createFilter({
    			"name"    : "custcol_itpm_lsbboi",
    			"operator": "anyof",
    			"values"  : '3'
    		}));
    		mySettlementSearch10.filters.push(search.createFilter({
    			"name"    : "debitamount",
    			"operator": "greaterthan",
    			"values"  : 0.00
    		}));
    						
    		mySettlementSearch10.save();
    		
    		//11. Adding Filters to Saved Search: - iTPM Promotion Settlements Total
    		var mySettlementSearch11 = search.load({
    			id: 'customsearch_itpm_promosettlementstotal'
    		});
    		
    		mySettlementSearch11.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch11.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "noneof",
    			"values"  : ["Custom"+settlemntRecID+":C","Custom"+settlemntRecID+":V"]
    		}));
    		mySettlementSearch11.filters.push(search.createFilter({
    			"name"    : "debitamount",
    			"operator": "greaterthan",
    			"values"  : 0.00
    		}));
    						
    		mySettlementSearch11.save();
    		
    		//12. Adding Filters to Saved Search: - iTPM Promotional Actual Spend
    		var mySettlementSearch12 = search.load({
    			id: 'customsearch_itpm_promotionalactualspend'
    		});
    		
    		mySettlementSearch12.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch12.filters.push(search.createFilter({
    			"name"    : "mainline",
    			"operator": "is",
    			"values"  : "T"
    		}));
    		mySettlementSearch12.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "anyof",
    			"values"  : ["Custom"+settlemntRecID+":B","Custom"+settlemntRecID+":E","Custom"+settlemntRecID+":A"]
    		}));
    		mySettlementSearch12.filters.push(search.createFilter({
    			"name"    : "custbody_itpm_amount",
    			"operator": "greaterthan",
    			"values"  : 0.00
    		}));
    						
    		mySettlementSearch12.save();
    		
    		//13. Adding Filters to Saved Search: - iTPM Get Actual Spend
    		var mySettlementSearch13 = search.load({
    			id: 'customsearch_itpm_getactualspend'
    		});
    		
    		mySettlementSearch13.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+settlemntRecID
    		});
    		mySettlementSearch13.filters.push(search.createFilter({
    			"name"    : "custcol_itpm_set_item",
    			"operator": "noneof",
    			"values"  : "@NONE@"
    		}));
    		mySettlementSearch13.filters.push(search.createFilter({
    			"name"    : "status",
    			"operator": "noneof",
    			"values"  : ["Custom"+settlemntRecID+":C","Custom"+settlemntRecID+":V"]
    		}));
    						
    		mySettlementSearch13.save();
    		
    		//14. Adding Filters to Saved Search: - iTPM Settlements Applied To Deduction
    		var myDeductionSearch = search.load({
    			id: 'customsearch_itpm_ddn_settlementsapplied'
    		});
    		
    		myDeductionSearch.filters = search.createFilter({
    			"name"    : "type",
    			"operator": "anyof",
    			"values"  : "Custom"+deductionRecID
    		});
    		
    		myDeductionSearch.filters.push(search.createFilter({
    			"name"    : "status",
    			"join"    : "custbody_itpm_settlementrec",
    			"operator": "anyof",
    			"values"  : ["Custom"+settlemntRecID+":B","Custom"+settlemntRecID+":E"]
    		}));
    			
    		myDeductionSearch.save();

    		//Adding Port-let Filters
    		//15. Adding Filters to Saved Search: - iTPM All Promotions Pending Approval
//    		var promoWaitingAprovalSearchAll = search.load({
//    			id: 'customsearch_itpm_promo_pendingapproval'
//    		});    	
//    		promoWaitingAprovalSearchAll.filterExpression =[
//    			["isinactive","is","F"], 
//    			"AND", 
//    			["custrecord_itpm_p_status","anyof","2"]
//    			];
//    		promoWaitingAprovalSearchAll.save();

    		//16. Adding Filters to Saved Search: - iTPM My Promotions Pending Approval   
//    		var promoWaitingAprovalSearchMine = search.load({
//    			id: 'customsearch_itpm_promo_pendinapprov_own'
//    		});    	
//    		promoWaitingAprovalSearchMine.filterExpression =[
//    			["isinactive","is","F"], 
//    			"AND", 
//    			["custrecord_itpm_p_status","anyof","2"], 
//    			"AND", 
//    			["owner","anyof","@CURRENT@"]
//    			];
//    		promoWaitingAprovalSearchMine.save();

    		//17. Adding Filters to Saved Search: - iTPM All Requested / Unapplied Settlements   
    		var setWaitingToBeAppliedSearchAll = search.load({
    			id: 'customsearch_itpm_set_requestedunapplied'
    		});    	
    		setWaitingToBeAppliedSearchAll.filterExpression =[
    			["type","anyof","Custom"+settlemntRecID], 
    			"AND", 
    			["status","anyof","Custom"+settlemntRecID+":A"], 
    			"AND", 
    			["count(internalid)","isnotempty",""]
    			];
    		setWaitingToBeAppliedSearchAll.save();

    		//18. Adding Filters to Saved Search: - iTPM My Active Promotions  
//    		var iTPMPromoActiveTodaySearchOwner = search.load({
//    			id: 'customsearch_itpm_myactivepromo'
//    		});    	
//    		iTPMPromoActiveTodaySearchOwner.filterExpression =[
//    			["isinactive","is","F"], 
//    			"AND", 
//    			["custrecord_itpm_p_condition","anyof","2"], 
//    			"AND", 
//    			["owner","anyof","@CURRENT@"]
//    			];
//    		iTPMPromoActiveTodaySearchOwner.save();

    		//19. Adding Filters to Saved Search: - iTPM Promotions Active Today 
//    		var iTPMPromoActiveTodaySearch = search.load({
//    			id: 'customsearch_itpm_promo_active'
//    		});    	
//    		iTPMPromoActiveTodaySearch.filterExpression =[
//    			["isinactive","is","F"], 
//    			"AND", 
//    			["custrecord_itpm_p_condition","anyof","2"]
//    			];
//    		iTPMPromoActiveTodaySearch.save();

    		//20. Adding Filters to Saved Search: - iTPM Promotions Active in Next 30 days 
//    		var iTPMPromoActiveInNext30DaysSearch = search.load({
//    			id: 'customsearch_itpm_promo_active_in_30'
//    		});    	
//    		iTPMPromoActiveInNext30DaysSearch.filterExpression =[
//    			["custrecord_itpm_p_condition","anyof","1"], 
//    			"AND", 
//    			["custrecord_itpm_p_status","anyof","3","2","1"], 
//    			"AND", 
//    			[["formuladate: {custrecord_itpm_p_shipstart}","after","thirtydaysfromnow"],"OR",["formuladate: {custrecord_itpm_p_shipend}","after","thirtydaysfromnow"]]
//    			];
//    		iTPMPromoActiveInNext30DaysSearch.save();

    		//21. Adding Filters to Saved Search: - iTPM My Open Deductions
    		var iTPMOpenDdnsAssignedToMeSearch = search.load({
    			id: 'customsearch_itpm_ddn_open_my'
    		});    	
    		iTPMOpenDdnsAssignedToMeSearch.filterExpression = [
    			["type","anyof","Custom"+deductionRecID], 
    			"AND", 
    			["custbody_itpm_ddn_assignedto","anyof","@CURRENT@"], 
    			"AND", 
    			["status","anyof","Custom"+deductionRecID+":A"]
    			];
    		iTPMOpenDdnsAssignedToMeSearch.save();

    		//22. Adding Filters to Saved Search: - iTPM Open Deductions (90+ Days)
    		var iTPMOpenDeductionsOver90DaysOldSearch = search.load({
    			id: 'customsearch_itpm_ddn_open_90plus'
    		});    	
    		iTPMOpenDeductionsOver90DaysOldSearch.filterExpression = [
    			["type","anyof","Custom"+deductionRecID], 
    			"AND", 
    			["status","anyof","Custom"+deductionRecID+":A"], 
    			"AND", 
    			["custbody_itpm_ddn_daysaged","greaterthan","90"]
    			];
    		iTPMOpenDeductionsOver90DaysOldSearch.save();

    		//23. Adding Filters to Saved Search: - iTPM Open Deductions (60 - 90 Days)
    		var iTPMOpenDdnBetween60To90DaysOldSearch = search.load({
    			id: 'customsearch_itpm_ddn_open_60to90'
    		});    	
    		iTPMOpenDdnBetween60To90DaysOldSearch.filterExpression = [
    			["type","anyof","Custom"+deductionRecID], 
    			"AND", 
    			["status","anyof","Custom"+deductionRecID+":A"], 
    			"AND", 
    			["custbody_itpm_ddn_daysaged","between","60","90"]
    			];
    		iTPMOpenDdnBetween60To90DaysOldSearch.save();

    		//24. Adding Filters to Saved Search: - iTPM Open Deductions (30 - 60 Days)
    		var iTPMOpenDdnBetween30To60DaysOldSearch = search.load({
    			id: 'customsearch_itpm_ddn_open_30to60'
    		});    	
    		iTPMOpenDdnBetween30To60DaysOldSearch.filterExpression = [
    			["type","anyof","Custom"+deductionRecID], 
    			"AND", 
    			["status","anyof","Custom"+deductionRecID+":A"], 
    			"AND", 
    			["custbody_itpm_ddn_daysaged","between","30","60"]
    			];
    		iTPMOpenDdnBetween30To60DaysOldSearch.save();

    		//25. Adding Filters to Saved Search: - iTPM Open Deductions (0 - 30 Days)
    		var iTPMOpenDdnLessThan30DaysSearch= search.load({
    			id: 'customsearch_itpm_ddn_open_0to30'
    		});    	
    		iTPMOpenDdnLessThan30DaysSearch.filterExpression = [
    			["type","anyof","Custom"+deductionRecID], 
    			"AND", 
    			["status","anyof","Custom"+deductionRecID+":A"], 
    			"AND", 
    			["custbody_itpm_ddn_daysaged","lessthan","30"]
    			];
    		iTPMOpenDdnLessThan30DaysSearch.save();

    		//26. Adding Filters to Saved Search: - iTPM Active / Completed Promotions Pending Approval  
//    		var iTPMPromoPendingApprovalButActiveOrCompletedSearch = search.load({
//    			id: 'customsearch_itpm_promopending_actcom'
//    		});    	
//    		iTPMPromoPendingApprovalButActiveOrCompletedSearch.filterExpression = [
//    			["isinactive","is","F"], 
//    			"AND", 
//    			["custrecord_itpm_p_status","anyof","2"], 
//    			"AND", 
//    			["custrecord_itpm_p_condition","anyof","2","3"]
//    			];
//    		iTPMPromoPendingApprovalButActiveOrCompletedSearch.save();

    		//27. Adding Filters to Saved Search: - iTPM Settlements in Processing
    		var iTPMSetInProcessingSearch= search.load({
    			id: 'customsearch_itpm_set_inprocessing'
    		});    	
    		iTPMSetInProcessingSearch.filterExpression = [
    			["type","anyof","Custom"+settlemntRecID], 
    			"AND", 
    			["status","anyof","Custom"+settlemntRecID+":E"], 
    			"AND", 
    			["mainline","is","T"]
    			];
    		iTPMSetInProcessingSearch.save();

    		//28. Adding Filters to Saved Search: - iTPM Deductions in Processing 
    		var iTPMDdnInProcessingSearch = search.load({
    			id: 'customsearch_itpm_ddn_inprocessing'
    		});    	
    		iTPMDdnInProcessingSearch.filterExpression = [
    			["type","anyof","Custom"+deductionRecID], 
    			"AND", 
    			["status","anyof","Custom"+deductionRecID+":E"], 
    			"AND", 
    			["mainline","is","T"]
    			];
    		iTPMDdnInProcessingSearch.save();

    		//29. Adding Filters to Saved Search: - iTPM Promotions being Copied  
//    		var iTPMPromoBeingCopiedSearch = search.load({
//    			id: 'customsearch_itpm_promo_copyinprogress'
//    		});    	
//    		iTPMPromoBeingCopiedSearch.filterExpression = [
//    			["isinactive","is","F"], 
//    			"AND", 
//    			["custrecord_itpm_p_copyinprogress","is","T"]
//    			];
//    		iTPMPromoBeingCopiedSearch.save();

    		//30. Adding Filters to Saved Search: - iTPM My Approved Promotions (90+ Days)  
//    		var iTPMOwnApprovedPromo90DaysOrOlderSearch = search.load({
//    			id: 'customsearch_itpm_myapprovedpromo_90plus'
//    		});    	
//    		iTPMOwnApprovedPromo90DaysOrOlderSearch.filterExpression = [
//    			["isinactive","is","F"], 
//    			"AND", 
//    			["custrecord_itpm_p_status","anyof","3"], 
//    			"AND", 
//    			["owner","anyof","@CURRENT@"], 
//    			"AND", 
//    			["custrecord_itpm_p_shipend","onorbefore","ninetydaysago"]
//    			];
//    		iTPMOwnApprovedPromo90DaysOrOlderSearch.save();

    		//31. Adding Filters to Saved Search: - iTPM Approved Promotions (90+ Days)  
//    		var iTPMApprovedPromo90DaysOrOlderSearch = search.load({
//    			id: 'customsearch_itpm_approvedpromo_90plus'
//    		});    	
//    		iTPMApprovedPromo90DaysOrOlderSearch.filterExpression = [
//    			["isinactive","is","F"], 
//    			"AND", 
//    			["custrecord_itpm_p_status","anyof","3"], 
//    			"AND", 
//    			["custrecord_itpm_p_shipend","onorbefore","ninetydaysago"]
//    			];
//    		iTPMApprovedPromo90DaysOrOlderSearch.save();

    		//32. Adding Filters to Saved Search: - iTPM My Requested / Unapplied Settlements  
    		var setWaitingToBeAppliedSearchMine = search.load({
    			id: 'customsearch_itpm_set_my_unapplied'
    		});    	
    		setWaitingToBeAppliedSearchMine.filterExpression =[
    			["type","anyof","Custom"+settlemntRecID], 
    			"AND", 
    			["status","anyof","Custom"+settlemntRecID+":A"], 
    			"AND", 
    			["createdby","anyof","@CURRENT@"]
    			];
    		setWaitingToBeAppliedSearchMine.save();
    		
    		//update the settlement search columns and place the settlement id as link
    		settlementLink();
    		
    	}catch(ex){
    		log.error(ex.name, ex.message);
    		throw ex;
    	}
    }
    
    /**
     * @description creating the subsidiary based on preference records
     */
    function createPreferenceRecords(iTPM_Version){
    	try{
    		var featureEnabled = runtime.isFeatureInEffect({feature:'SUBSIDIARIES'});
    		var eventType = 'create';
    		
        	var preferenceResult = search.create({
    			type:'customrecord_itpm_preferences',
    			columns:['internalid']
    		}).run().getRange(0,10);
    		var prefResultLength = preferenceResult.length;
    		preferenceResult = (prefResultLength == 0)? undefined : preferenceResult[0].getValue('internalid');
    				
        	if(featureEnabled){
        		var subsidiaryResult = search.create({
            		type:search.Type.SUBSIDIARY,
            		columns:['internalid','parent'],
            		filters:[['isinactive','is',false]]
            	}).run();
        		
        		if(prefResultLength <= 1){
            		subsidiaryResult.each(function(e){
            			if(prefResultLength == 1){
            				eventType = (!e.getValue('parent'))? 'edit' : 'copy';
            			}
        				createOrEditPreferenceRecord(preferenceResult,eventType,e.getValue('internalid'),iTPM_Version);
        				return true;
        			});
        		}else{
        			//set iTPM version on iTPM Preference record
        			setItpmVersion(iTPM_Version);
        		}    		
        	}else{
        		(prefResultLength == 0)? createOrEditPreferenceRecord(undefined,eventType,undefined,iTPM_Version) : setItpmVersion(iTPM_Version);
        	}
    	}catch(ex){
    		log.error(ex.name, ex.message);
    		throw ex;
    	}
    }
    
    /**
     * @param {Number} id
     * @param {String} event
     * @param {Object} subid
     * @description create the prefernce record for specific subsidiary
     */
    function createOrEditPreferenceRecord(id, event, subid, iTPM_Version){
    	var preferenceRec;
    	switch(event){
    	case 'create':
    		preferenceRec = record.create({
    			type:'customrecord_itpm_preferences'
    		});
    		break;
    	case 'edit':
    		preferenceRec = record.load({
    			type:'customrecord_itpm_preferences',
    			id:id
    		});
    		break;
    	case 'copy':
    		preferenceRec = record.copy({
    			type:'customrecord_itpm_preferences',
    			id:id
    		});
    		break;
    	}
    	
    	//if subsidiary is enabled
    	if(subid){
    		preferenceRec.setValue({
        		fieldId:'custrecord_itpm_pref_subsidiary',
        		value:subid
        	});
    	}
    	
    	preferenceRec.setValue({
    		fieldId:'custrecord_itpm_pref_version',
    		value:iTPM_Version
    	}).save({
    		enableSourcing:false,
    		ignoreMandatoryFields:true
    	});
    }
    
    /**
     * @description sets iTPM Version under iTPM preferences.
     */
    function setItpmVersion(iTPM_Version){
    	try{
    		search.create({
    			type:'customrecord_itpm_preferences',
    		}).run().each(function(e){
    			record.submitFields({
    				type: 'customrecord_itpm_preferences',
    				id: e.id,
    				values: {
    					'custrecord_itpm_pref_version': iTPM_Version
    				},
    				options:{
    					enableSourcing:false,
    					ignoreMandatoryFields:true
    				}
    			});
    			return true;
    		});
    	}catch(ex){
    		log.error(ex.name,ex.message);
    		throw ex;
    	}
    }
      
    /**
     * @description creating settlement id as a clickable link in the settlement subtab under the promotion.
     */
    function settlementLink(){
    	try{
    		var settlemntRecID = record.create({
    			type:'customtransaction_itpm_settlement'
    		}).getValue('customtype');

    		var settlementSearch = search.load({
    			id:"customsearch_itpm_promosettlementsummary",
    		});

    		settlementSearch.columns[1]=search.createColumn({
    			name: 'formulatext',
    			label: 'Settlement #',
    			formula: "'<a href=/app/accounting/transactions/custom.nl?id='|| {internalid} ||'&customtype=" + settlemntRecID + "&whence= target=_blank>'|| {tranid} ||'</a>'",
    			summary: search.Summary.GROUP
    		});

    		settlementSearch.save();
    	}catch(ex){
    		log.error(ex.name,ex.message);
    		throw ex;
    	}
    }
    
    
    return {
        beforeInstall: beforeInstall,
        afterInstall: afterInstall,
        beforeUpdate: beforeUpdate,
        afterUpdate: afterUpdate
    };
    
});
