/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record',
		'N/http',
		'N/redirect',
		'N/runtime',
		'./iTPM_Module.js'
		],
/**
 * @param {record} record
 */
function(record, http, redirect, runtime, itpm) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	try{
    		var request = context.request;
        	if(request.method == http.Method.GET){
        		var scriptObj = runtime.getCurrentScript();
        		var itemGroupRec = record.load({
            		type:record.Type.ITEM_GROUP,
            		id:request.parameters.itemgpid
            	});
        		var items = itpm.getItemGroupItems(itemGroupRec,false,false);
        		var unitsArray = itpm.getItemUnits(items[0].memberid)['unitArray'];
        		var baseUnit = unitsArray.filter(function(e){return e.isBase})[0].id;
        		var itemUnitRate = parseFloat(unitsArray.filter(function(e){return e.id == items[0].saleunit})[0].conversionRate);
        		var rate = parseFloat(unitsArray.filter(function(e){return e.id == baseUnit})[0].conversionRate);
        		var items = itpm.getItemGroupItems(itemGroupRec,false,false);
        		items.forEach(function(item,i){
        			if(item.memberid != request.parameters.itemid){
        				var priceObj = itpm.getImpactPrice({itemid:item.memberid,pricelevel:request.parameters.pl});
        				record.copy({
            				type:"customrecord_itpm_promoallowance",
            				id:request.parameters.allid
            			}).setValue({
                			fieldId:"custrecord_itpm_all_item",
                			value:item.memberid
                		}).setValue({
                			fieldId:"custrecord_itpm_all_uom",
                			value:baseUnit
                		}).setValue({
                			fieldId:"custrecord_itpm_all_itembaseprice",
                			value:item.baseprice
                		}).setValue({
                			fieldId:"custrecord_itpm_all_impactprice",
                			value:parseFloat(priceObj.price)
                		}).setValue({
                			fieldId:"custrecord_itpm_all_uomprice",
                			value:parseFloat(priceObj.price)*(rate/itemUnitRate)
                		}).save({
                			enableSourcing:false,
                			ignoreMandatoryFields:true
                		});
        			}
        		});
        		log.error('remaining usage',scriptObj.getRemainingUsage());
        		redirect.toRecord({
        			type : "customrecord_itpm_promotiondeal", 
        		    id : request.parameters.pi
        		});
        	}
    	}catch(ex){
    		if(ex.name == "USER_ERROR")
    			throw new Error(ex.message);
    		log.error(ex.name,ex.message);
    	}
    }

    return {
        onRequest: onRequest
    };
    
});
