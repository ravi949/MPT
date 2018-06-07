/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/search',
        'N/record',
        './iTPM_Module.js'
        ],

function(search, record, itpm) {
   
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
        		           {name: 'internalid'},
        		           {name: 'custrecord_itpm_rq_promotion'},
        		           {name: 'custrecord_itpm_rq_deduction'},
        		           {name: 'custrecord_itpm_rq_mop'},
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
    		
    		var queue_id = data['internalid'];
    		var promotion_id = data['custrecord_itpm_rq_promotion'].value;
    		var deduction_id = data['custrecord_itpm_rq_deduction'].value;
    		var resolution_amount = data['custrecord_itpm_rq_amount'];
    		var mop = data['custrecord_itpm_rq_mop'].text;
    		log.debug('Queue ID, Promotion, Deduction, Amount & MOP', queue_id+', '+promotion_id+', '+deduction_id+', '+resolution_amount+'& '+mop);
    		
    		//Fetching Promotion Data
    		var promotion_data = search.lookupFields({
    			type 	: 'customrecord_itpm_promotiondeal',
    			id		: promotion_id,
    			columns	: ['custrecord_itpm_p_status','custrecord_itpm_p_condition','custrecord_itpm_p_customer','custrecord_itpm_promo_allocationcontrbtn']
    		});
    		var promotion_status =  promotion_data.custrecord_itpm_p_status[0].value;
    		var promotion_condition =  promotion_data.custrecord_itpm_p_condition[0].value;
    		var promotion_customer =  promotion_data.custrecord_itpm_p_customer[0].value;
    		var allocationContribution_done = promotion_data.custrecord_itpm_promo_allocationcontrbtn;
    		log.debug('promotion_status, promotion_condition, promotion_customer & allocationContribution_done',promotion_status+', '+promotion_condition+', '+promotion_customer+', '+!allocationContribution_done);
    		
    		var allocationFactorCalculated_done = search.create({
				type: "customrecord_itpm_kpi",
				filters: [
					["custrecord_itpm_kpi_allocfactcalculated","is","F"],  "AND", 
					["custrecord_itpm_kpi_promotiondeal","anyof",promotion_id]
					],
					columns: [ 'custrecord_itpm_kpi_promotiondeal']
			}).run().getRange(0,10).length > 0;
			log.debug('allocationFactorCalculated_done',!allocationFactorCalculated_done);
			
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
    		
    		//Checking whether customer is ACTIVE or NOT
    		var isCustomerActive = search.lookupFields({
        		type 	: 'customer',
                        id: deduction_customer,
        		columns : ['isinactive']
        	});
    		log.debug('isCustomerActive',!(isCustomerActive.isinactive));
    		
    		//Is Deduction Open balance id greater than ZERO?
    		if(deduction_openBal > 0){
    			//Is Resolution Amount is EQUAL TO Deduction Open Balance?
    			if(resolution_amount == deduction_openBal){ 
    				//Is the Customer is under Promotion's customer hierarchy? AND Is customer is active?
    				if(subcustomers.includes(deduction_customer) && !(isCustomerActive.isinactive)){ 
    					//Is Promotion status is APPROVED? AND Is condition is ACTIVE/COMPLETED? && Is Allocation Contribution compete? AND Is Allocation factors calculated?
    					if(promotion_status == 3 && (promotion_condition == 2 || promotion_condition == 3) && !allocationFactorCalculated_done && !allocationContribution_done){ 
    						
    					}else{
    						var feedback = 'Promotions status is NOT APPROVED (or) condition is NOT ACTIVE/COMPLETED (or) Settlements are NOT Allowed, hence not processed';
                			//updateResolutionQueue(queue_id, feedback);
                			log.debug('feedback', feedback);
    					}
    				}else{
    					var feedback = 'Customer on the Promotion is not matching with the customer on the Deduction linked to this Queue record (or) customer is NOT ACTIVE, hence not processed';
            			//updateResolutionQueue(queue_id, feedback);
            			log.debug('feedback', feedback);
    				}
    			}else{
    				var feedback = 'Resolution Amount('+resolution_amount+') is not equal to the Open balance of the Deduction('+deduction_openBal+') in this Queue Record, hence not processed';
        			//updateResolutionQueue(queue_id, feedback);
        			log.debug('feedback', feedback);
    			}
    		}else{
    			var feedback = 'The Open balance of the Deduction in this queue record is '+deduction_openBal+', hence not processed.';
    			//updateResolutionQueue(queue_id, feedback);
    			log.debug('feedback', feedback);
    		}
    	}catch(e){
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
    function updateResolutionQueue(queueid, feedback){
    	try{
    		var recid = record.submitFields({
    			type	: 'customrecord_itpm_resolutionqueue',
    			id		: queueid,
    			values	: {
    				custrecord_itpm_rq_processingnotes : feedback
    			},
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
        reduce: reduce,
        summarize: summarize
    };
    
});
