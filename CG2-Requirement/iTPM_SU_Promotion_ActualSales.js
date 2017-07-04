/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Suitelet script to generate and return a report of actual sales based on Invoice records for the items selected in the Allowances of a Promotion.
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
			var request = context.request,response = context.response;

			if(request.method == 'GET'){

				var startno = request.parameters.st;
				var yearResult = request.parameters.yr;//0 for current year, 1 for previous year
				var endno = parseInt(startno)+20;
				var form = serverWidget.createForm({
					title : 'Actual Sales'
				});
				log.error('yearResult',yearResult);

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
					id:'custpage_actualsales',
					label:'Actual Sales'
				});

				//Actual Sales subtab and fields
				var actualSalesSublist = form.addSublist({
					id : 'custpage_actual_sales_subtab',
					tab:'custpage_actualsales',
					type : serverWidget.SublistType.LIST,
					label : 'Actual Sales'
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
					id : 'custpage_invoiceid',
					type : serverWidget.FieldType.TEXT,
					label : 'INVOICE ID'
				});

				actualSalesSublist.addField({
					id : 'custpage_invoice_uom',
					type : serverWidget.FieldType.TEXT,
					label : 'INVOICE UOM'
				});

				actualSalesSublist.addField({
					id : 'custpage_invoice_qty',
					type : serverWidget.FieldType.TEXT,
					label : 'INVOICE QTY'
				});

				actualSalesSublist.addField({
					id : 'custpage_actual_price',
					type : serverWidget.FieldType.TEXT,
					label : 'ACTUAL PRICE'
				});


				actualSalesSublist.addField({
					id : 'custpage_actual_revenue',
					type : serverWidget.FieldType.TEXT,
					label : 'ACTUAL REVENUE'
				});



				//promoDeal Record Load
				var promoDealRecord = search.lookupFields({
					type: 'customrecord_itpm_promotiondeal',
					id: request.parameters.pid,
					columns: ['internalid','name','custrecord_itpm_p_description','custrecord_itpm_p_shipstart','custrecord_itpm_p_shipend','custrecord_itpm_p_customer']
				});

				var startDate = new Date(promoDealRecord['custrecord_itpm_p_shipstart']),
				endDate = new Date(promoDealRecord['custrecord_itpm_p_shipend']);

				if(yearResult == 1){
					startDate.setFullYear(startDate.getFullYear()-1);
					endDate.setFullYear(endDate.getFullYear()-1);
				}
				var startDateYear = format.format({
					value: startDate,
					type: format.Type.DATE
				}),
				endDateYear = format.format({
					value: endDate,
					type: format.Type.DATE
				});
				promotionField.defaultValue = promoDealRecord.internalid[0].value;
				promotionRefernece.defaultValue = promoDealRecord["name"];
				promotionDesc.defaultValue = promoDealRecord["custrecord_itpm_p_description"];
				promotionStdate.defaultValue = startDateYear;
				promotionEndate.defaultValue = endDateYear;    		

				var CustId = promoDealRecord['custrecord_itpm_p_customer'][0].value,
				customerRecord = record.load({
					type : record.Type.CUSTOMER,
					id : CustId
				});    		    		    		
				customerDescription.defaultValue = customerRecord.getValue('entityid');

				//estimated volume search to get the items list
				var estVolumeItems = [];
				search.create({
					type:'customrecord_itpm_estquantity',
					columns:['custrecord_itpm_estqty_item'],
					filters:[['custrecord_itpm_estqty_promodeal','is',request.parameters.pid],'and',
					         ['isinactive','is',false]]
				}).run().each(function(e){
					estVolumeItems.push(e.getValue('custrecord_itpm_estqty_item'));
					return true;
				});


				//Actual Sales search
				if(estVolumeItems.length > 0){
					//search for invoice filters are ship start,end date and est volume items and with status Open and Paid in full
					var invResult = search.create({
						type:search.Type.INVOICE,
						columns:['internalid','item','item.description','amount','rate','quantity','unit'],
						filters:[['item','anyof',estVolumeItems],'and',
						         ['entity','is',customerRecord.getValue('entityid')],'and',
						         ['trandate','within',startDateYear,endDateYear],'and',
						         ['status','anyof',['CustInvc:A','CustInvc:B']],'and',
						         ['taxline','is',false],'and',
						         ['cogs','is',false],'and',
						         ['shipping','is',false],'and',
						         ['item.isinactive','is',false]]
					});
					
					var pagedData = invResult.runPaged({
					    pageSize:20
				    });
					
					var totalResultCount = pagedData.count;
					var listOfPages = pagedData["pageRanges"];
					var numberOfPages = listOfPages.length;
					
					if(numberOfPages > 0){
						var paginationField = form.addField({
							id : 'custpage_ss_pagination',
							type : serverWidget.FieldType.SELECT,
							label : 'Pages',
							container:'custpage_actualsales'
						});


						paginationField.updateDisplaySize({
							height:50,
							width : 120
						});
						
						for(var i = 0;i < numberOfPages;i++){
							var paginationTextEnd = (totalResultCount >= (i*20)+20)?((i * 20)+20):totalResultCount;
							paginationField.addSelectOption({
								value :listOfPages[i].index,
								text : ((i*20)+1)+' to '+paginationTextEnd,
								isSelected:(startno == i)
							});
						}
					}
					
					
					var page = pagedData.fetch({
					    index:startno
					});
					
					var dataCount = page.data.length;
					for(var i = 0;i < dataCount;i++){
						if(page.data[i].getValue('item') != ''){

							var quantity = page.data[i].getValue('quantity'),
							rate = page.data[i].getValue('rate'),
							unit = page.data[i].getValue('unit');
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
								id:'custpage_invoiceid',
								line:i,
								value:page.data[i].getValue('internalid')
							});

							if(unit != ''){
								actualSalesSublist.setSublistValue({
									id:'custpage_invoice_uom',
									line:i,
									value:unit
								});
							}

							if(quantity != ''){
								actualSalesSublist.setSublistValue({
									id:'custpage_invoice_qty',
									line:i,
									value:quantity
								});
							}

							if(rate != ''){
								actualSalesSublist.setSublistValue({
									id:'custpage_actual_price',
									line:i,
									value:parseFloat(rate)
								});
							}

							actualSalesSublist.setSublistValue({
								id:'custpage_actual_revenue',
								line:i,
								value:parseFloat(page.data[i].getValue('amount'))
							});
						}
					}	
				}
				
				log.debug('runtime',runtime.getCurrentScript().getRemainingUsage());
				form.clientScriptModulePath = './iTPM_Attach_Promotion_ActualSalesShipmentsPagination.js';
				response.writePage(form);	
			}

		}catch(e){
			log.error(e.name,'record type = iTPM promotion, record id = '+context.request.parameters.pid+', message = '+e.message);
//			throw Error(e.message)
		}

	}

	return{
		onRequest:onRequest
	}

})