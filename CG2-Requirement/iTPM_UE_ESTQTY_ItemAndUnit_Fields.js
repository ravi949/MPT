/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * Adds two dynamic fields - Item & Unit - to EstQty records.
 */
define(['N/record','N/search','N/ui/serverWidget','N/runtime', 'N/url', 'N/https'],

function(record, search, serverWidget, runtime, url, https) {
	
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
			var estQty = sc.newRecord,
				promotionId = estQty.getValue({fieldId:'custrecord_itpm_estqty_promodeal'}),
				itemSearchId = runtime.getCurrentScript().getParameter({name: 'custscript_itpm_estqty_itemsearch'}),
				rangeStart = 0, rangeStep = 50;
			
			if (!promotionId) return;
			if (runtime.executionContext != runtime.ContextType.USER_INTERFACE) return;
			if (sc.type == 'create' || sc.type == 'edit' || sc.type == 'copy'){
				
				var itemField = sc.form.addField({
					id : 'custpage_itpm_estqty_item',
					type : serverWidget.FieldType.SELECT,
					label : 'Item'
				});
				itemField.isMandatory = true;
				itemField.setHelpText({help:'Select the Item for which this quantity will be estimated.'});
				itemField.updateLayoutType({
	    			layoutType : serverWidget.FieldLayoutType.OUTSIDEABOVE
	    		});
	    		itemField.updateBreakType({
	    			breakType : serverWidget.FieldBreakType.STARTCOL
	    		});
				// add blank value
				itemField.addSelectOption({
					value: '0',
					text: ' '
				});
				
				var unitField = sc.form.addField({
					id : 'custpage_itpm_estqty_unit',
					type : serverWidget.FieldType.SELECT,
					label : 'Unit'
				});
				unitField.isMandatory = true;
				unitField.setHelpText({help:'Select the Unit in which this quantity will be estimated.'});
				unitField.updateLayoutType({
	    			layoutType : serverWidget.FieldLayoutType.OUTSIDEABOVE
	    		});
	    		unitField.updateBreakType({
	    			breakType : serverWidget.FieldBreakType.STARTCOL
	    		});
	    		sc.form.insertField({
	    			field: unitField,
	    			nextfield: 'custrecord_itpm_estqty_itemdescripttion'
	    		});
	    		sc.form.insertField({
	    			field: itemField,
	    			nextfield: 'custpage_itpm_estqty_unit'
	    		});
				var itemSearch = search.load({
					id: itemSearchId
				});
				itemSearch.filters.push(search.createFilter({
					name: 'custrecord_itpm_all_promotiondeal',
					operator: search.Operator.ANYOF,
					values: [promotionId]
				}));
				
				//filtering the already existed estimated quantity items from the list
				var estExistedItems = [];
				if(sc.type == 'create'||sc.type=='copy'){
					search.create({
						  type:'customrecord_itpm_estquantity',
						  columns:['internalid','custrecord_itpm_estqty_item'],
						  filters:[['custrecord_itpm_estqty_promodeal','anyof',promotionId],'and',['isinactive','is',false]]
					  }).run().each(function(e){
						  estExistedItems.push(e.getValue('custrecord_itpm_estqty_item'));
						  return true
					  });
					log.debug('estExistedItems',estExistedItems)
					if(estExistedItems.length>0){
						itemSearch.filters.push(search.createFilter({
							name: 'custrecord_itpm_all_item',
							operator: search.Operator.NONEOF,
							values:estExistedItems
						}));
					}

				}
				//end
				
				do{
					var items = itemSearch.run().getRange(rangeStart, rangeStart + rangeStep);
					for (var x = 0; x < items.length; x++){
						itemField.addSelectOption({
							value: items[x].getValue({name:'internalid', join:'custrecord_itpm_all_item'}),
							text: items[x].getValue({name: 'itemid', join:'custrecord_itpm_all_item'})
						});
					}
				} while(items.length >= rangeStep);
				if(sc.type == 'edit' || sc.type == 'copy'){
					estQty.setValue({
						fieldId: itemField.id,
						value: estQty.getValue({fieldId: 'custrecord_itpm_estqty_item'})
					});
					var output = url.resolveScript({
						scriptId:'customscript_itpm_su_getitemunits',
						deploymentId:'customdeploy_itpm_su_getitemunits',
						params: {itemid : estQty.getValue({fieldId: 'custrecord_itpm_estqty_item'}), 
							unitid: null},
						returnExternalUrl: true
					});
					var response = https.get({
						url: output
					});
					var unitsList = JSON.parse(response.body);
					if (!unitsList.error){
						for (x in unitsList.unitsList){
							unitField.addSelectOption({
								value: unitsList.unitsList[x].internalId,
	    						text: unitsList.unitsList[x].name
							});
						}
						estQty.setValue({
							fieldId: unitField.id,
							value: estQty.getValue({fieldId:'custrecord_itpm_estqty_qtyby'})
						});
					} else {
						log.error('UnitsList', 'Error retrieving units for selected item.')
					}
				}
			}
		}catch(e){
			log.error(e.name,e.message);
//			throw Error(e.message)
		}
	}
	
	
	
	return {
		beforeLoad: beforeLoad
	};

});
