/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record',
		'N/http',
		'N/redirect',
		'N/search',
		'./iTPM_Module.js'
		],
/**
 * @param {record} record
 */
function(record, http, redirect, search, itpm) {
   
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
        		var itemGroupRec = record.load({
            		type:record.Type.ITEM_GROUP,
            		id:request.parameters.itemgpid
            	});
        		var allwLookup = search.lookupFields({
        			type:'customrecord_itpm_promoallowance',
        			id:request.parameters.allid,
        			columns:['custrecord_itpm_all_mop','custrecord_itpm_all_uom','custrecord_itpm_all_promotiondeal']
        		});
        		var items = itpm.getItemGroupItems(itemGroupRec,false,false); //get the list of item members array
        		var itemUnits = itpm.getItemUnits(items[0].memberid); //get the list of unists array
        		var unitsArray = itemUnits['unitArray']; 
        		var allwUnit = allwLookup['custrecord_itpm_all_uom'][0].value; //get the base unit from the units list
                var promoId = allwLookup['custrecord_itpm_all_promotiondeal'][0].value; //get the promotion id
        		var itemUnitRate = parseFloat(unitsArray.filter(function(e){return e.id == items[0].saleunit})[0].conversionRate); //member item sale unit rate conversion rate
        		var rate = parseFloat(unitsArray.filter(function(e){return e.id == allwUnit})[0].conversionRate); //member item base unit conversion rate
        		items.forEach(function(item,i){
        			if(item.memberid != request.parameters.itemid){
        				var priceObj = itpm.getImpactPrice({pid:promoId,itemid:item.memberid,pricelevel:request.parameters.pl});
        				record.copy({
            				type:"customrecord_itpm_promoallowance",
            				id:request.parameters.allid
            			}).setValue({
                			fieldId:"custrecord_itpm_all_mop",
                			value:allwLookup['custrecord_itpm_all_mop'][0].value
                		}).setValue({
                			fieldId:"custrecord_itpm_all_item",
                			value:item.memberid
                		}).setValue({
                			fieldId:"custrecord_itpm_all_itembaseprice",
                			value:item.baseprice
                		}).setValue({
                			fieldId:"custrecord_itpm_all_impactprice",
                			value:parseFloat(priceObj.price)
                		}).setValue({
                			fieldId:"custrecord_itpm_all_uomprice",
                			value:parseFloat(priceObj.price)*(rate/itemUnitRate)
                		}).setValue({
                			fieldId:"custrecord_itpm_all_allowaddnaldiscounts",
                			value:search.create({
                				type:'customrecord_itpm_promoallowance',
                				columns:['internalid'],
                				filters:[['custrecord_itpm_all_item','anyof',items[0].memberid],'and',
                						 ['custrecord_itpm_all_promotiondeal','anyof',promoId],'and',
                						 ['custrecord_itpm_all_allowaddnaldiscounts','is',true],'and',
                						 ['isinactive','is',false]]
                			}).run().getRange(0,2).length > 0
                		}).save({
                			enableSourcing:false,
                			ignoreMandatoryFields:true
                		});
        			}
        		});
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
