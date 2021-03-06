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
		'N/redirect',
		'./iTPM_Module.js'
		],

function(runtime, sWidget, search, record, cache, redirect, itpm) {
   
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
    		
    		if(sc.type == 'delete') return;
    		var selectedItem = sc.newRecord.getValue('custrecord_itpm_all_item');
            var promoId = sc.newRecord.getValue('custrecord_itpm_all_promotiondeal');
        	var recordType = search.lookupFields({
    		    type:search.Type.ITEM,
    		    id:selectedItem,
    		    columns:['recordtype']
    		}).recordtype;
        	log.debug('selectedItem',selectedItem);
        	if(recordType == search.Type.ITEM_GROUP){
        		var itemGroupRec = record.load({
            		type:record.Type.ITEM_GROUP,
            		id:sc.newRecord.getValue('custrecord_itpm_all_item')
            	});
        		var items = itpm.getItemGroupItems(itemGroupRec,false,false); //get the list of item members array
        		var unitsArray = itpm.getItemUnits(items[0].memberid)['unitArray']; //get the list of unists array
        		var allwUnit = sc.newRecord.getValue('custrecord_itpm_all_uom'); //allowance record selected unit
        		var itemUnitRate = parseFloat(unitsArray.filter(function(e){return e.id == items[0].saleunit})[0].conversionRate); //member item sale unit rate conversion rate
        		var rate = parseFloat(unitsArray.filter(function(e){return e.id == allwUnit})[0].conversionRate); //member item base unit conversion rate
        		
        		//already allownace created with this item
        		var listOfItems = [];
        		search.create({
    				type:'customrecord_itpm_promoallowance',
    				columns:['internalid','custrecord_itpm_all_item'],
    				filters:[['custrecord_itpm_all_item','anyof',items.map(function(e){ return e.memberid })],'and',
    						 ['custrecord_itpm_all_promotiondeal','anyof',promoId],'and',
    						 ['custrecord_itpm_all_allowaddnaldiscounts','is',false],'and',
    						 ['isinactive','is',false]]
    			}).run().each(function(e){
    				listOfItems.push(e.getValue('custrecord_itpm_all_item'));
    				return true;
    			});
        		items = items.filter(function(e){ return listOfItems.filter(function(k){return k == e.memberid}).length <= 0 });
        		log.debug('filtered items out',items);
        		
    			//validating the units and base price
        		items.forEach(function(item,i){
        			log.debug('items in',item);
        			if(items[i-1] && (items[i-1].saleunit != item.saleunit || items[i-1].unitstype != item.unitstype)){
        				throw{
        					name:"INVALID_UNITS",
        					message:"SaleUnit and UnitType must be same for all items."
        				};
        			}
        			log.debug('item.baseprice',item.baseprice);
        			if(item.baseprice <= 0){
        				throw{
        					name:"INVALID_PRICE",
        					message:"This iTPM Allowance cannot be submitted because the selected item does not have any sale price."
        				};
        			}
        		});
        		
        		var priceObj = itpm.getImpactPrice({pid:promoId,itemid:items[0].memberid,pricelevel:sc.newRecord.getValue('custrecord_itpm_all_pricelevel')});
        		sc.newRecord.setValue({
        			fieldId:"custrecord_itpm_all_item",
        			value:items[0].memberid
        		}).setValue({
        			fieldId:"custrecord_itpm_all_itembaseprice",
        			value:items[0].baseprice
        		}).setValue({
        			fieldId:"custrecord_itpm_all_impactprice",
        			value:parseFloat(priceObj.price)
        		}).setValue({
        			fieldId:"custrecord_itpm_all_uomprice",
        			value:parseFloat(priceObj.price)*(rate/itemUnitRate)
        		}).setValue({
        			fieldId:"custrecord_itpm_all_pendingcontribution",
        			value:true
        		}).setValue({
        			fieldId:"custrecord_itpm_all_allowaddnaldiscounts",
        			value:search.create({
        				type:'customrecord_itpm_promoallowance',
        				columns:['internalid'],
        				filters:[['custrecord_itpm_all_item','anyof',items[0].memberid],'and',
        						 ['custrecord_itpm_all_promotiondeal','anyof',promoId],'and',
        						 ['custrecord_itpm_all_allowaddnaldiscounts','is',true],'and',
        						 ['isinactive','is',false]]
        			}).run().getRange(0,2).length > 0 || sc.newRecord.getValue('custrecord_itpm_all_allowaddnaldiscounts')
        		});
        		cache.getCache({
        			name: 'itemGroupCache',
        			scope: cache.Scope.PRIVATE
        		}).put({
        			key: 'keyObj',
        			value: JSON.stringify({
        				itemGroupId:selectedItem,
        				neglectItem:items[0].memberid,
        				saleunit:items[0].saleunit
        			}),
        			ttl: 300
        		});
        	}else{
        		if(recordType == search.Type.ITEM_GROUP) return;
        		sc.newRecord.setValue({
        			fieldId:"custrecord_itpm_all_pendingcontribution",
        			value:true
        		});
        		var itemLookup = search.lookupFields({
        			type:search.Type.ITEM,
        			id:selectedItem,
        			columns:['baseprice']
        		});
        		log.debug('baseprice',itemLookup['baseprice']);
        		if(itemLookup['baseprice'] <= 0){
        			throw{
        				name:"INVALID_PRICE",
        				message:"This iTPM Allowance cannot be submitted because the selected item does not have any sale price."
        			};
        		}
        	}
    	}catch(ex){
    		log.error(ex.name,ex.message);
    		if(ex.name == "INVALID_UNITS" || ex.name == "INVALID_PRICE")
    			throw new Error(ex.message);
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
        	var cacheObj = cache.getCache({
    		    name: 'itemGroupCache',
    		    scope: cache.Scope.PRIVATE
    		});
        	if(sc.type == 'create'){
            	var keyObj = JSON.parse(cacheObj.get({
        			key:'keyObj'
        		}));
            	cacheObj.remove({
            		key:'keyObj'
            	});
            	if(keyObj && keyObj.itemGroupId){
            		redirect.toSuitelet({
            			scriptId: 'customscript_itpm_all_createfrmitemgroup',
            		    deploymentId: 'customdeploy_itpm_all_createfrmitemgroup',
            		    parameters: {
            		    	'itemgpid':keyObj.itemGroupId,
            		    	'itemid':keyObj.neglectItem,
            		    	'allid':sc.newRecord.id,
            		    	'pi':sc.newRecord.getValue('custrecord_itpm_all_promotiondeal'),
            		    	'pl':sc.newRecord.getValue('custrecord_itpm_all_pricelevel'),
            		    	'allow':sc.newRecord.getValue('custrecord_itpm_all_allowaddnaldiscounts')
            		    }
            		});
            	}
        	}
        	
        	var promoId = (sc.type == 'delete')?sc.oldRecord.getValue('custrecord_itpm_all_promotiondeal'):sc.newRecord.getValue('custrecord_itpm_all_promotiondeal');
        	var promDetails = search.lookupFields({
				type:'customrecord_itpm_promotiondeal',
				id:promoId,
				columns:['custrecord_itpm_p_status', 'custrecord_itpm_p_condition']
			});
        	
        	if(sc.type == 'edit' || sc.type == 'delete'){
        		log.debug('Promotion ID', promoId);
        		var promStatus = promDetails.custrecord_itpm_p_status[0].value;
        		var promCondition = promDetails.custrecord_itpm_p_condition[0].value;
        		log.debug('promStatus & promCondition', promStatus+' & '+promCondition);

        		if(promStatus == 3 && (promCondition == 2 || promCondition == 3)){
        			//Creating New KPI Queue Record
        			itpm.createKPIQueue(promoId, 2); //1.Scheduled, 2.Edited, 3.Status Changed, 4.Ad-hoc and 5.Settlement Status Changed
        		}
        	}
        	
        	/*Set Allocation Contribution check box false*/
        	if(promDetails.custrecord_itpm_p_status[0].value == 3){
        		record.submitFields({
        			type:'customrecord_itpm_promotiondeal',
        			id:sc.newRecord.getValue('custrecord_itpm_all_promotiondeal'),
        			values:{
        				'custrecord_itpm_promo_allocationcontrbtn':true
        			},
        			options:{
        				enableSourcing:false,
        				ignoreMandatoryFields:true
        			}
        		});
        	}
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
			value: itpm.getPrefrenceValues(undefined).defaultAllwType
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
