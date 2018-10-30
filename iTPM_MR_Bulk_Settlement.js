/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/search',
        'N/record',
        'N/format',
        './iTPM_Module.js',
        './iTPM_Module_Settlement.js',
        ],

function(search, record, formatModule, itpm, ST_Module) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
    	try{
    		return search.create({
        		type 	: 'customrecord_itpm_resolutionqueue',
        		columns : [
        		           {name: 'internalid', sort: search.Sort.ASC},
        		           {name: 'custrecord_itpm_rq_promotion'},
        		           {name: 'custrecord_itpm_rq_deduction'},
        		           {name: 'custrecord_itpm_rq_mop'},
        		           {name: 'custrecord_itpm_rq_memo'},
        		           {name: 'custrecord_itpm_rq_amount'}
            		      ],
        		filters : [
        		           {name: 'custrecord_itpm_rq_settlement', operator: 'anyof', values: '@NONE@'},
        		           {name: 'custrecord_itpm_rq_processingnotes', operator: 'isempty', values: ''}
        		          ]
        	});
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	try{
    		var data = JSON.parse(context.value).values;
    		log.debug('map_data', context.value);
    		
    		var queue_id = data['internalid'].value;
    		var promotion_id = data['custrecord_itpm_rq_promotion'].value;
    		var deduction_id = data['custrecord_itpm_rq_deduction'].value;
    		var resolution_amount = data['custrecord_itpm_rq_amount'];
    		var resolution_memo = data['custrecord_itpm_rq_memo'];
    		var mop = data['custrecord_itpm_rq_mop'].value;
    		log.debug('Queue ID, Promotion, Deduction, Amount & MOP', queue_id+', '+promotion_id+', '+deduction_id+', '+resolution_amount+'& '+mop);
    		
    		//Fetching Promotion Data
    		var promorecObj = record.load({
    			type : 'customrecord_itpm_promotiondeal',
    			id		: promotion_id
    		});
    		
    		var promotion_status =  promorecObj.getValue('custrecord_itpm_p_status');
    		var promotion_condition =  promorecObj.getValue('custrecord_itpm_p_condition');
    		var promotion_customer =  promorecObj.getValue('custrecord_itpm_p_customer');
    		var allocationContribution_done = promorecObj.getValue('custrecord_itpm_promo_allocationcontrbtn');
    		var promoType = promorecObj.getValue('custrecord_itpm_p_type');
    		var promoNum = promorecObj.getValue('recordid');
    		var promoDescription = promorecObj.getValue('custrecord_itpm_p_description');
    		var promoNetLia = promorecObj.getValue('custrecord_itpm_p_netpromotionalle');
    		var promoMaxLia = promorecObj.getValue('custrecord_itepm_p_incurredpromotionalle');
    		var promoShipStartDate = promorecObj.getText('custrecord_itpm_p_shipstart');
    		var promoShipEndDate = promorecObj.getText('custrecord_itpm_p_shipend');
    		var promoSubsidiary = promorecObj.getValue('custrecord_itpm_p_subsidiary');
    		var promoCurrency = promorecObj.getValue('custrecord_itpm_p_currency');
    		var promoLumpsum = parseFloat(promorecObj.getValue('custrecord_itpm_p_lumpsum'));
    		
    		//If MOP is not valid throw the error update queue with processing notes
    		if(mop == 1){ //lump-sum as per Resolution queue record
        		var promoHasAllNB = ST_Module.getAllowanceMOP(promotion_id,2); //here 2 as per MOP list as per promotion Type
        		if(!(promoLumSum > 0 || promoHasAllNB)){
        			throw {
        				name: 'INVALID MOP',
        				message: 'With the selected MOP, Allowances were not present on the Promotion'
        			}
        		}
        	}else if(mop == 2){ //bill-back as per Resolution queue record
        		var promoHasAllBB = ST_Module.getAllowanceMOP(promotion_id,1); //here 1 as per MOP list as per promotion Type
        		if(!promoHasAllBB){
        			throw {
        				name: 'INVALID MOP',
        				message: 'With the selected MOP, Allowances were not present on the Promotion'
        			}
        		}
        	}else if(mop == 3){ //off-Invoice as per Resolution queue record
        		var promoHasAllOI = ST_Module.getAllowanceMOP(promotion_id,3); //here 3 as per MOP list as per promotion Type
        		if(!promoHasAllOI){
        			throw {
        				name: 'INVALID MOP',
        				message: 'With the selected MOP, Allowances were not present on the Promotion'
        			}
        		}
        	}
    		
    		//Checking whether the customer is ACTIVE or NOT
    		var isCustomerActive = search.lookupFields({
        		type: 'customer',
                id	: promotion_customer,
        		columns : ['isinactive', 'parent']
        	});
    		log.debug('isCustomerActive & parent',!(isCustomerActive.isinactive)+' & '+isCustomerActive.parent[0].value);
    		log.debug('promotion_status, promotion_condition, promotion_customer, allocationContribution_done & promoType',promotion_status+', '+promotion_condition+', '+promotion_customer+', '+!allocationContribution_done+', '+promoType);
    		log.debug('promoNum, promoDescription, promoNetLia, promoMaxLia',promoNum+', '+promoDescription+', '+promoNetLia+', '+promoMaxLia);
    		log.debug('promoShipStartDate, promoShipEndDate, promotion_customer, promoSubsidiary, promoCurrency',promoShipStartDate+', '+promoShipEndDate+', '+promotion_customer+', '+promoSubsidiary+', '+promoCurrency);
    		
    		var allocationFactorCalculated_done = search.create({
				type: "customrecord_itpm_kpi",
				filters: [
					["custrecord_itpm_kpi_allocfactcalculated","is","F"],  "AND", 
					["custrecord_itpm_kpi_promotiondeal","anyof",promotion_id]
					],
					columns: [ 'custrecord_itpm_kpi_promotiondeal']
			}).run().getRange(0,10).length > 0;
			log.debug('allocationFactorCalculated_done',!allocationFactorCalculated_done);
			
			//ALLOW SETTLEMENTS WHEN PROMOTION IS ACTIVE?
			var allowForSettlement = search.lookupFields({
				type	: 'customrecord_itpm_promotiontype',
				id		: promoType, 
				columns	: ['custrecord_itpm_pt_settlewhenpromoactive']
			}).custrecord_itpm_pt_settlewhenpromoactive;
			log.debug('allowForSettlement',allowForSettlement);
			
			//Fetching all sub customers	
    		var subcustomers = itpm.getSubCustomers(promotion_customer);
    		log.debug('subcustomers',subcustomers);
    		
    		//Deduction Status and Open balance
    		var deduction_data = search.lookupFields({
    			type 	: 'customtransaction_itpm_deduction',
    			id		: deduction_id,
    			columns	: ['custbody_itpm_ddn_openbal','custbody_itpm_customer']
    		});
    		var deduction_openBal =  deduction_data.custbody_itpm_ddn_openbal;
    		var deduction_customer =  deduction_data.custbody_itpm_customer[0].value;
    		log.debug('deduction_open_balance',deduction_openBal);
    		log.debug('deduction_customer',deduction_customer);
    		log.debug('Are both Customers are same?', subcustomers.indexOf(deduction_customer) > -1);
    		//Is Deduction Open balance id greater than ZERO?
    		if(deduction_openBal > 0){
    			//Is Resolution Amount is EQUAL TO Deduction Open Balance?
    			if(resolution_amount == deduction_openBal){ 
    				//Is the Customer is under Promotion's customer hierarchy? AND Is customer is active?
    				if(subcustomers.indexOf(deduction_customer) > -1 && !(isCustomerActive.isinactive)){ 
    					//Is Promotion status is APPROVED? AND Is condition is ACTIVE/COMPLETED? && Is Allocation Contribution compete? AND Is Allocation factors calculated?
    					if(promotion_status == 3 && ((promotion_condition == 2 && allowForSettlement) || promotion_condition == 3) && !allocationFactorCalculated_done && !allocationContribution_done){ 
    						var params = {
    							custom_itpm_st_created_frm	: 'ddn',
    							custom_itpm_st_appliedtransction : deduction_id,
    							custom_itpm_ddn_openbal : deduction_openBal,
    							custom_itpm_st_promotion_no : promoNum,
    							custom_itpm_st_promotiondeal : promotion_id,
    							custom_itpm_st_promotion_desc : promoDescription,
    							custom_itpm_st_net_promolbty : promoNetLia,
    							custom_itpm_st_incrd_promolbty : promoMaxLia,
    							custom_itpm_st_shp_stdate : promoShipStartDate,
    							custom_itpm_st_shp_endate : promoShipEndDate,
    							custpage_memo : resolution_memo,
    							custpage_lumsum_setreq : (mop == 1)?resolution_amount:0,
    							custpage_billback_setreq : (mop == 2)?resolution_amount:0,
    							custpage_offinvoice_setreq : (mop == 3)?resolution_amount:0,
    							custom_itpm_st_reql : resolution_amount,
    							custom_itpm_st_otherref_code : '',
    							custom_itpm_st_cust: promotion_customer,
    							custom_itpm_st_cust_parent : isCustomerActive.parent[0].value,
    							custom_itpm_st_subsidiary : promoSubsidiary,
    							custom_itpm_st_currency : promoCurrency,
    							custom_itpm_st_class : '',
    							custom_itpm_st_department : '',
    							custom_itpm_st_location : '',
    							custom_itpm_st_date : formatModule.format({value: new Date(),type: formatModule.Type.DATE})
    						}
    						log.audit('params', params);
    						
    						var settlementId = ST_Module.createSettlement(params);
    						log.audit('settlementId', settlementId);
    						
    						if(settlementId){
    							var updatedQueueId = updateResolutionQueue(queue_id, feedback, 'pass', settlementId);
    							log.audit('updatedQueueId', updatedQueueId);
    						}
    					}else{
    						var feedback = 'Promotions status is NOT APPROVED (or) condition is NOT ACTIVE/COMPLETED (or) Settlements are NOT Allowed (or) Allocation Factors and Allocation Contribution calculations are not calculated, hence not processed';
                			updateResolutionQueue(queue_id, feedback, 'fail');
                			log.debug('feedback', feedback);
    					}
    				}else{
    					var feedback = 'Customer on the Promotion is not matching with the customer on the Deduction linked to this Queue record (or) customer is NOT ACTIVE, hence not processed';
            			updateResolutionQueue(queue_id, feedback, 'fail');
            			log.debug('feedback', feedback);
    				}
    			}else{
    				var feedback = 'Resolution Amount('+resolution_amount+') is not equal to the Open balance of the Deduction('+deduction_openBal+') in this Queue Record, hence not processed';
        			updateResolutionQueue(queue_id, feedback, 'fail');
        			log.debug('feedback', feedback);
    			}
    		}else{
    			var feedback = 'The Open balance of the Deduction in this queue record is '+deduction_openBal+', hence not processed.';
    			updateResolutionQueue(queue_id, feedback, 'fail');
    			log.debug('feedback', feedback);
    		}
    	}catch(e){
    		updateResolutionQueue(queue_id, e.message+', hence not processed', 'fail');
			log.error(e.name, e.message);
    	}
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
    	
    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    /**
     * @param {String} feedback
     */
    function updateResolutionQueue(queueid, feedback, reason, setId){
    	try{
    		var recid = record.submitFields({
    			type	: 'customrecord_itpm_resolutionqueue',
    			id		: queueid,
    			values	: (reason == 'fail')?{custrecord_itpm_rq_processingnotes : feedback}:{custrecord_itpm_rq_settlement : setId},
    			options	: {
    				enableSourcing: false,
    				ignoreMandatoryFields : true
    			}
    		});
    		log.debug('Resolution Queue ID', recid);
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }
    
    return {
        getInputData: getInputData,
        map: map,
        //reduce: reduce,
        summarize: summarize
    };
    
});
