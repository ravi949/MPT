/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search',
		'./iTPM_Module.js'
		],
/**
 * @param {search} search
 * @param {module} iTPM_Module
 */
function(search, itpm) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {
    	try{
    		var currentRec = scriptContext.newRecord;
        	if(scriptContext.type == 'create' || scriptContext.type == 'edit'){
        		if(currentRec.getValue('custitem_itpm_available')){
            		var memberItems = itpm.getItemGroupItems(currentRec,true,true);
            		var duplicateItems = [];
            		log.error('lenght',memberItems.length);	
            		if(memberItems.length == 0){
            			throw {
            				name:"MEMBERS_EMPTY",
            				message:"Member items should have atleast 1."
            			};
            		}else if(memberItems.length > 25){
            			throw {
            				name:"INVALID_TOTAL",
            				message:"Member items should be lessthan or equal to 25."
            			};
            		}else{
            			memberItems.forEach(function(item,i){
                			if(!item.isAvailable){
                				throw{
                					name:"NOT_ALLOWED",
                					message:"Please make sure all items 'AVAILABLE FOR ITPM?' checkbox is checked."
                				};
                			}
                			if(duplicateItems.some(function(e){return e.memberid == item.memberid})){
                				throw{
                					name:"DUPLICATE_ITEMS",
                					message:"Duplicate items not allowed."
                				};
                			}
                			if(!item.baseprice){
                				throw{
                					name:"INVALID_BASEPRICE",
                					message:"Item base price should not be empty."
                				};
                			}
                			if(memberItems[i-1] && (memberItems[i-1].saleunit != item.saleunit || memberItems[i-1].unitstype != item.unitstype)){
                				throw{
                					name:"INVALID_UNITS",
                					message:"SaleUnit and UnitType must be same for all items."
                				};
                			}
                			duplicateItems.push(item);
                		});
            		}
            	}
        	}
    	}catch(ex){
    		if(ex.name == "MEMBERS_EMPTY" || ex.name == "INVALID_TOTAL" || ex.name == "INVALID_UNITS" || ex.name == "NOT_ALLOWED" || ex.name == "DUPLICATE_ITEMS" || ex.name =="INVALID_BASEPRICE")
    			throw new Error(ex.message);
    		log.error(ex.name,ex.message);
    	}
    }


    return {
        beforeSubmit: beforeSubmit
    };
    
});
