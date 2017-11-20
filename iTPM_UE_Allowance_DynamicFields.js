/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * 
 * Adds a field to the form that will allow the user to select Unit after Item is selected.
 */
define(['N/runtime',
		'N/ui/serverWidget',
		'N/search',
		'N/record',
		'N/cache',
		'./iTPM_Module.js'
		],

function(runtime, sWidget, search, record, cache, itpm) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} sc
     * @param {Record} sc.newRecord - New record
     * @param {string} sc.type - Trigger type
     * @param {Form} sc.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(sc) {
    	try{
    		
    		setDefaultValidMOP(sc);
    		
    		if (runtime.executionContext != runtime.ContextType.USER_INTERFACE) return;
	    	if(sc.newRecord.getValue({fieldId: 'custrecord_itpm_all_promotiondeal'})== '') return;
	    	if (sc.type == 'create' || sc.type == 'edit' || sc.type == 'copy'){	    		
	    		var dynamicUnitField = sc.form.addField({
	    			id : 'custpage_itpm_all_unit',
	        		type : sWidget.FieldType.SELECT,
	        		label : 'Allowance Unit'
	    		});
	    		dynamicUnitField.isMandatory = true;
	    		dynamicUnitField.updateLayoutType({
	    			layoutType : sWidget.FieldLayoutType.OUTSIDEABOVE
	    		});
	    		dynamicUnitField.updateBreakType({
	    			breakType : sWidget.FieldBreakType.STARTCOL
	    		});
	    		dynamicUnitField.setHelpText({
	    			help: 'Once you select an Item, the allowed Units will populate here. Select an applicable unit for this allowance.'
	    		});
	    		sc.form.insertField({
	    			field: dynamicUnitField,
	    			nextfield : 'custrecord_itpm_all_uom'
	    		});
	    		//setting the Allowance Type field value based on the Preferences
	    		if (sc.type == 'create'|| sc.type == 'copy'){
	    			defaultValForAllType(sc);
	    		}
	    	}
    	} catch(ex){
    		log.error(ex.name, ex.message);
    	}
    }
    
    /**
     * Function definition to be triggered before record is submit.
     *
     * @param {Object} sc
     * @param {Record} sc.newRecord - New record
     * @param {string} sc.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(sc){
    	try{
    		var selectedItem = sc.newRecord.getValue('custrecord_itpm_all_item');
        	var recordType = search.lookupFields({
    		    type:search.Type.ITEM,
    		    id:selectedItem,
    		    columns:['recordtype']
    		}).recordtype;
        	var unitsArray = [],baseUnit,itemUnitRate,rate;
    		
        	if(recordType == search.Type.ITEM_GROUP){
        		var items = itpm.getItemGroupItems(sc.newRecord.getValue('custrecord_itpm_all_item'));
        		if(items.length == 0){
        			throw {
        				name:"MEMBERS_EMPTY",
        				message:"Please add the line items to item group."
        			};
        		}else{
        			if(items.length > 25){
        				throw{
        					name:"INVALID_TOTAL",
        					message:"Member items should be lessthan or equal to 25."
        				};
        			}
        			unitsArray = itpm.getItemUnits(items[0].memberid)['unitArray'];
        			baseUnit = unitsArray.filter(function(e){return e.isBase})[0].id;
        			itemUnitRate = parseFloat(unitsArray.filter(function(e){return e.id == items[0].saleunit})[0].conversionRate);
    				rate = parseFloat(unitsArray.filter(function(e){return e.id == baseUnit})[0].conversionRate);
        		}
        		items.forEach(function(item,i){
        			if(items[i-1] && (items[i-1].saleunit != item.saleunit || items[i-1].unitstype != item.unitstype)){
        				throw{
        					name:"INVALID_UNITS",
        					message:"SaleUnit and UnitType must be same for all items."
        				};
        			}
        			if(i == 0){
        				var priceObj = itpm.getImpactPrice({itemid:item.memberid,pricelevel:sc.newRecord.getValue('custrecord_itpm_all_pricelevel')});
        				sc.newRecord.setValue({
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
        				});
        				cache.getCache({
        				    name: 'itemGroupCache',
        				    scope: cache.Scope.PRIVATE
        				}).put({
        					key: 'keyObj',
        					value: JSON.stringify({
        							itemGroupId:selectedItem,
        							neglectItem:item.memberid,
        							saleunit:item.saleunit
        						}),
        					ttl: 300
        				});
        			}
        		});
        	}
    	}catch(ex){
    		if(ex.name == "MEMBERS_EMPTY" || ex.name == "INVALID_TOTAL" || ex.name == "INVALID_UNITS")
    			throw new Error(ex.message);
    		log.error(ex.name,ex.message);
    	}
    	
    }
    
    /**
     * Function definition to be triggered after record is submit.
     *
     * @param {Object} sc
     * @param {Record} sc.newRecord - New record
     * @param {string} sc.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(sc){
    	try{
    		var scriptObj = runtime.getCurrentScript();
        	log.error('start',scriptObj.getRemainingUsage());
        	var cacheObj = cache.getCache({
    		    name: 'itemGroupCache',
    		    scope: cache.Scope.PRIVATE
    		});
        	if(sc.type == 'create'){
            	var keyObj = JSON.parse(cacheObj.get({
        			key:'keyObj'
        		}));
            	if(keyObj && keyObj.itemGroupId){
            		var items = itpm.getItemGroupItems(keyObj.itemGroupId);
            		unitsArray = itpm.getItemUnits(keyObj.neglectItem)['unitArray'];
        			baseUnit = unitsArray.filter(function(e){return e.isBase})[0].id;
        			var itemUnitRate = parseFloat(unitsArray.filter(function(e){return e.id == keyObj.saleunit})[0].conversionRate);
    				var rate = parseFloat(unitsArray.filter(function(e){return e.id == baseUnit})[0].conversionRate);
            		items.forEach(function(item){
            			if(item.memberid != keyObj.neglectItem){
            				var priceObj = itpm.getImpactPrice({itemid:item.memberid,pricelevel:sc.newRecord.getValue('custrecord_itpm_all_pricelevel')});
                			record.copy({
                				type:sc.newRecord.type,
                				id:sc.newRecord.id
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
            	}
        	}
        	cacheObj.remove({
        		key:'keyObj'
        	});
        	log.error('end',scriptObj.getRemainingUsage());
    	}catch(ex){
    		log.error(ex.name,ex.message);
    	}
    }
    
    
    /**
     *  @param {Object} sc
     */
    function defaultValForAllType(sc){
		sc.newRecord.setValue({
			fieldId: 'custrecord_itpm_all_type',
			value: itpm.getPrefrenceValues().defaultAllwType
		});
	}		
      
    /**
     * @param sc record object
     * @returns NONE
     * @description it sets the default valid mop
     */
    function setDefaultValidMOP(sc){
    	if(sc.type == 'create' || sc.type == 'copy'){
    		sc.newRecord.setValue({
				fieldId:'custrecord_itpm_all_mop',
				value:itpm.getDefaultValidMOP(sc.newRecord.getValue('custrecord_itpm_all_promotiontype'))
			});
    	}
    }
    
    return {
        beforeLoad: beforeLoad,
        beforeSubmit:beforeSubmit,
        afterSubmit:afterSubmit
    };
    
});
