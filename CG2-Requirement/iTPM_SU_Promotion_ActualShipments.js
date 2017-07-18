/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 *  Suitelet script to generate and return a report of actual shipments based on Item Fulfillment records for the items selected in the Allowances of a Promotion.
 */
define(['N/ui/serverWidget','N/search','N/record','N/runtime','N/format'],

function(serverWidget,search,record,runtime,format) {

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
			var response = context.response;

			if(request.method == 'GET'){

				var startno = request.parameters.st;
				var yearResult = request.parameters.yr;//0 for current year, 1 for previous year
				var form = serverWidget.createForm({
					title : 'Actual Shipments'
				});
				var promotionField=form.addField({
					id : 'custpage_promotion',
					type : serverWidget.FieldType.TEXT,
					label : 'Promotion #'
				});
				promotionField.updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				});
				var promotionRefernece=form.addField({
					id : 'custpage_refernce',
					type : serverWidget.FieldType.TEXT,
					label : 'Promotion Reference Code'
				});
				promotionRefernece.updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				});
				var promotionDesc=form.addField({
					id : 'custpage_promotiondescription',
					type : serverWidget.FieldType.TEXT,
					label : 'Promotion Description'
				});
				promotionDesc.updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				});
				var promotionStdate=form.addField({
					id : 'custpage_promotionstartdate',
					type : serverWidget.FieldType.DATE,
					label : 'Promotion Start Date'
				});
				promotionStdate.updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				});
				var promotionEndate=form.addField({
					id : 'custpage_promotionenddate',
					type : serverWidget.FieldType.DATE,
					label : 'Promotion End Date'
				});
				promotionEndate.updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				});
				var customerDescription=form.addField({
					id : 'custpage_customerdescription',
					type : serverWidget.FieldType.TEXT,
					label : 'Customer Description'
				});
				customerDescription.updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				});

				var actualSalesTab = form.addSubtab({
					id:'custpage_actualshippments',
					label:'Actual Shipments'
				});

				//Actual Sales subtab and fields
				var actualSalesSublist = form.addSublist({
					id : 'custpage_actual_shippments_subtab',
					tab:'custpage_actualshippments',
					type : serverWidget.SublistType.LIST,
					label : 'Actual Shippments'
				});

				actualSalesSublist.addField({
					id : 'custpage_item',
					type : serverWidget.FieldType.TEXT,
					label : 'ITEM'
				});

				actualSalesSublist.addField({
					id : 'custpage_item_description',
					type : serverWidget.FieldType.TEXT,
					label : 'ITEM DESCRIPTION'
				});

				actualSalesSublist.addField({
					id : 'custpage_shippmentid',
					type : serverWidget.FieldType.TEXT,
					label : 'SHIPPMENT ID'
				});

				actualSalesSublist.addField({
					id : 'custpage_shippmentuom',
					type : serverWidget.FieldType.TEXT,
					label : 'SHIPPMENT UOM'
				});

				actualSalesSublist.addField({
					id : 'custpage_shippmentqty',
					type : serverWidget.FieldType.TEXT,
					label : 'SHIPPMENT QTY'
				});

				//promoDeal Record Load
				var promoDealRecord = search.lookupFields({
					type: 'customrecord_itpm_promotiondeal',
					id: request.parameters.pid,
					columns: ['internalid','name','custrecord_itpm_p_description','custrecord_itpm_p_shipstart','custrecord_itpm_p_shipend','custrecord_itpm_p_customer']
				});

				var startDate = new Date(promoDealRecord['custrecord_itpm_p_shipstart']);
				var endDate = new Date(promoDealRecord['custrecord_itpm_p_shipend']);

				if(yearResult == 1){
					startDate.setFullYear(startDate.getFullYear()-1);
					endDate.setFullYear(endDate.getFullYear()-1);
				}
				var startDateYear = format.format({
					value: startDate,
					type: format.Type.DATE
				});
				var endDateYear = format.format({
					value: endDate,
					type: format.Type.DATE
				});
				promotionField.defaultValue=promoDealRecord.internalid[0].value;
				promotionRefernece.defaultValue = promoDealRecord["name"];
				promotionDesc.defaultValue = promoDealRecord["custrecord_itpm_p_description"];
				promotionStdate.defaultValue = startDateYear;
				promotionEndate.defaultValue = endDateYear;
				
				var CustId = promoDealRecord['custrecord_itpm_p_customer'][0].value;

				var customerRecord = record.load({
					type : record.Type.CUSTOMER,
					id : CustId
				});    		    		    		
				customerDescription.defaultValue = customerRecord.getValue('entityid');

				//estimated volume search to get the items list
				var estVolumeItems = [];
				search.create({
					type:'customrecord_itpm_estquantity',
					columns:['custrecord_itpm_estqty_item'],
					filters:[['custrecord_itpm_estqty_promodeal','anyof',request.parameters.pid],'and',
						['isinactive','is',false]]
				}).run().each(function(e){
					estVolumeItems.push(e.getValue('custrecord_itpm_estqty_item'));
					return true;
				});

				if(estVolumeItems.length>0){
					//search for item fulfillment filters are ship start,end date and est volume items
					var itemFulResult = search.create({
						type:search.Type.ITEM_FULFILLMENT,
						columns:['internalid','item','item.description','quantity','unit'],
						filters:[['item','anyof',estVolumeItems],'and',
							['entity','anyof', customerRecord.getValue('entityid')],'and',
							['trandate','within',startDateYear,endDateYear],'and',
							['taxline','is',false],'and',
							['cogs','is',false],'and',
							['shipping','is',false],'and',
							['item.isinactive','is',false]]
					});

					var pagedData = itemFulResult.runPaged({
					    pageSize:20
				    });
					var totalResultCount = pagedData.count;
					var listOfPages = pagedData["pageRanges"];
					var numberOfPages = listOfPages.length;
					var page = dataCount = null;
					
					if(numberOfPages > 0){
						var paginationField = form.addField({
							id : 'custpage_ss_pagination',
							type : serverWidget.FieldType.SELECT,
							label : 'Rows',
							container:'custpage_actualshippments'
						});

						paginationField.updateDisplaySize({
							height:50,
							width : 140
						});
						
						for(var i = 0;i < numberOfPages;i++){
							var paginationTextEnd = (totalResultCount >= (i*20)+20)?((i * 20)+20):totalResultCount;
							paginationField.addSelectOption({
								value :listOfPages[i].index,
								text : ((i*20)+1)+' to '+paginationTextEnd+' of '+totalResultCount,
								isSelected:(startno == i)
							});
						}
						
						page = pagedData.fetch({
						    index:startno
						});
						
						dataCount = page.data.length;
					}
					
					for(var i = 0;dataCount != null,i < dataCount;i++){
						if(page.data[i].getValue('item') != ''){

							var quantity = page.data[i].getValue('quantity');
							var unit = page.data[i].getValue('unit');

//							log.debug('unit',unit) //not getting the uom
							actualSalesSublist.setSublistValue({
								id:'custpage_item',
								line:i,
								value:page.data[i].getText('item')
							});
							actualSalesSublist.setSublistValue({
								id:'custpage_item_description',
								line:i,
								value:page.data[i].getValue({name:'description',join:'item'})
							});

							actualSalesSublist.setSublistValue({
								id:'custpage_shippmentid',
								line:i,
								value:page.data[i].getValue('internalid')
							});

							if(quantity != ''){
								actualSalesSublist.setSublistValue({
									id:'custpage_shippmentqty',
									line:i,
									value:quantity
								});
							}

							if(unit != ''){
								actualSalesSublist.setSublistValue({
									id:'custpage_shippmentuom',
									line:i,
									value:unit
								});
							}
						}
					}
				}

				form.clientScriptModulePath = './iTPM_Attach_Promotion_ActualSalesShipmentsPagination.js';
				response.writePage(form);	
			}

		}catch(ex){
			log.error(ex.name,'record type = iTPM promotion, record id = '+context.request.parameters.pid+', message = '+ex.message);
		}
	}

	return{
		onRequest:onRequest
	}

})