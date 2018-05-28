/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * Adds two dynamic fields - Item & Unit - to EstQty records.
 */
define(['N/search',
		'N/ui/serverWidget',
		'N/runtime',
		'N/url',
		'N/http',
		'./iTPM_Module.js'
		],

function(search, serverWidget, runtime, url, http, itpm) {
	
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
					value: ' ',
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
				var existingEstItems = [];
				if(sc.type == 'create'||sc.type=='copy'){
					search.create({
						  type:'customrecord_itpm_estquantity',
						  columns:['internalid','custrecord_itpm_estqty_item'],
						  filters:[['custrecord_itpm_estqty_promodeal','anyof',promotionId],'and',['isinactive','is',false]]
					  }).run().each(function(e){
						  existingEstItems.push(e.getValue('custrecord_itpm_estqty_item'));
						  return true
					  });
					log.debug('existingEstItems',existingEstItems)
					if(existingEstItems.length>0){
						itemSearch.filters.push(search.createFilter({
							name: 'custrecord_itpm_all_item',
							operator: search.Operator.NONEOF,
							values:existingEstItems
						}));
					}
				}
				//end
				
				//searching for the items
				itemSearch.run().each(function(e){
					itemField.addSelectOption({
						value: e.getValue({name:'internalid', join:'custrecord_itpm_all_item'}),
						text: e.getValue({name: 'itemid', join:'custrecord_itpm_all_item'}),
						isSelected:e.getValue({name:'internalid', join:'custrecord_itpm_all_item'}) == estQty.getValue({fieldId: 'custrecord_itpm_estqty_item'})
					});
					return true;
				});
				
				if(sc.type == 'edit' || sc.type == 'copy'){
					estQty.setValue({
						fieldId: itemField.id,
						value: estQty.getValue({fieldId: 'custrecord_itpm_estqty_item'})
					});
					var recordUnit = estQty.getValue({fieldId: 'custrecord_itpm_estqty_item'});
					var unitsList = itpm.getItemUnits(recordUnit);
					if (!unitsList.error){
						for (x in unitsList.unitArray) {
							unitField.addSelectOption({
								value: unitsList.unitArray[x].id,
								text: unitsList.unitArray[x].name
							});
						}
						estQty.setValue({
							fieldId: unitField.id,
							value: estQty.getValue({fieldId:'custrecord_itpm_estqty_qtyby'})
						});
					} else {
						log.error('UnitsList', 'Error retrieving units for selected item. record id = '+sc.newRecord.id);
					}
				}
			}
		}catch(e){
			log.error(e.name,'record id = '+sc.newRecord.id+', function name = beforeload, message = '+e.message);
		}
	}
	
	
	
	return {
		beforeLoad: beforeLoad
	};

});
