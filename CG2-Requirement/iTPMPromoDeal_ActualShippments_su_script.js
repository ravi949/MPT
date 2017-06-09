/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *  Displays the Actual Shipments record in that shows item fulfillments as line items and added pagination to it
 */
define(['N/ui/serverWidget','N/search','N/record','N/runtime'],

		function(serverWidget,search,record,runtime) {

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

				var startno = request.parameters.st,
				endno = parseInt(startno)+(10*2),
				form = serverWidget.createForm({
					title : 'Actual Shipments'
				}),
				promotionField=form.addField({
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

				promotionField.defaultValue=promoDealRecord.internalid[0].value;
				promotionRefernece.defaultValue = promoDealRecord["name"];
				promotionDesc.defaultValue = promoDealRecord["custrecord_itpm_p_description"]
				promotionStdate.defaultValue = promoDealRecord["custrecord_itpm_p_shipstart"]
				promotionEndate.defaultValue = promoDealRecord["custrecord_itpm_p_shipend"]
				
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
				})

				if(estVolumeItems.length>0){
					//search for item fulfillment filters are ship start,end date and est volume items
					var itemFulResult = search.create({
						type:search.Type.ITEM_FULFILLMENT,
						columns:['internalid','item','item.description','quantity','unit'],
						filters:[['item','anyof',estVolumeItems],'and',
							['entity','is', customerRecord.getValue('entityid')],'and',
							['trandate','within',promoDealRecord['custrecord_itpm_p_shipstart'],promoDealRecord['custrecord_itpm_p_shipend']],'and',
							['taxline','is',false],'and',
							['cogs','is',false],'and',
							['shipping','is',false],'and',
							['item.isinactive','is',false]]
					}).run();

					//getting the total number of pages existed in search
					var totalPageCount = 0,
					count = 0, pageSize = 1000,
					currentIndex = 0;
					do{
						count = itemFulResult.getRange(currentIndex, currentIndex + pageSize).length;
						currentIndex += pageSize;
						totalPageCount += count;
					}while(count == pageSize);


					if(totalPageCount>0){
						//pagination for shippments list
						var paginationField = form.addField({
							id : 'custpage_ss_pagination',
							type : serverWidget.FieldType.SELECT,
							label : 'Pages',
							container:'custpage_actualshippments'
						});


						paginationField.updateDisplaySize({
							height:50,
							width : 120
						});

						var endCount = 0;
						for(var i=0;i<=totalPageCount;i+=20){
							endCount = (i+20);
							paginationField.addSelectOption({
								value : i+1,
								text : (i+1)+' to '+(endCount < totalPageCount? endCount:totalPageCount),
								isSelected:(startno == i+1)
							});
						}
					}

					//getting the values from item fulfillment search
					var itemFulResultList = itemFulResult.getRange(startno,endno),itemFulResultLength = itemFulResultList.length,
					lineNo = 0,rate = 0,unit ='';
					for(var i=0;i<itemFulResultLength;i++){
						if(itemFulResultList[i].getValue('item') != ''){
							var quantity = itemFulResultList[i].getValue('quantity'),
							unit = itemFulResultList[i].getValue('unit');

//							log.debug('unit',unit) //not getting the uom
							actualSalesSublist.setSublistValue({
								id:'custpage_item',
								line:lineNo,
								value:itemFulResultList[i].getText('item')
							})
							actualSalesSublist.setSublistValue({
								id:'custpage_item_description',
								line:lineNo,
								value:itemFulResultList[i].getValue({name:'description',join:'item'})
							})

							actualSalesSublist.setSublistValue({
								id:'custpage_shippmentid',
								line:lineNo,
								value:itemFulResultList[i].getValue('internalid')
							})

							if(quantity != ''){
								actualSalesSublist.setSublistValue({
									id:'custpage_shippmentqty',
									line:lineNo,
									value:quantity
								})
							}

							if(unit != ''){
								actualSalesSublist.setSublistValue({
									id:'custpage_shippmentuom',
									line:lineNo,
									value:unit
								})
							}
							lineNo++;
						}
					}


				}

				form.clientScriptModulePath = './iTPMPromoDeal_ActualSales_And_Shippment_Pagination_cs_script.js';
				response.writePage(form);	
			}

		}catch(ex)
		{
			log.error('Exception', ex);
		}

	}

	return{
		onRequest:onRequest
	}

})