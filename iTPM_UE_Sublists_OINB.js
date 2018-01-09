/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 * 
 * @description This script will show a subtab (iTPM) with three different sublists like Promotions,Off-Invoice and Net-Bill
 */
define(['N/runtime',
		'N/ui/serverWidget',
		'N/search',
		'N/record',
		'./iTPM_Module.js'
	],

function(runtime, serverWidget, search, record, itpm) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoadiTPMSublists(sc) {
    	try{
    		//Script should work in "VIEW" mode and "UI" contextType
        	if(runtime.executionContext != runtime.ContextType.USER_INTERFACE) return;
        	if(sc.type != sc.UserEventType.VIEW) return;
        	//log.debug('iTPMSublists', 'Mode: '+sc.UserEventType.VIEW+' & Execution Context: '+runtime.ContextType.USER_INTERFACE);
        	
        	
        	var prefDatesType = itpm.getPrefrenceValues().prefDiscountDate;
        	var customerId = sc.newRecord.getValue('entity');
        	var trandate = sc.newRecord.getText('trandate');
        	var transhipdate = sc.newRecord.getText('shipdate');
        	var showShipDates = (prefDatesType == "Ship Date" || prefDatesType == "Both" || prefDatesType == "Either");
        	var showOrderDates = (prefDatesType == "Order Date" || prefDatesType == "Both" || prefDatesType == "Either");
        	var orderStartDate,orderEndDate;
        	var tranShipDateNotEmpty = (((prefDatesType == 'Ship Date' || prefDatesType == 'Both') && transhipdate) || prefDatesType == 'Either' || prefDatesType == 'Order Date');
        	//Adding tab(iTPM) to the form
        	sc.form.addTab({
        	    id    : 'custpage_itpm_tab',
        	    label : 'iTPM Discounts'
        	});
        	
        	//#############################  Promotions (UI) - START ###############################
        	//Adding sublist(Promotions) to the subtab(iTPM)
        	var sublistPromotions = sc.form.addSublist({
        	    id : 'custpage_itpm_promotions',
        	    type : serverWidget.SublistType.INLINEEDITOR,
        	    label : 'Promotions',
        	    tab : 'custpage_itpm_tab'
        	});
        	
        	//Adding required fields to Promotions subtab
        	var promotionSLP = sublistPromotions.addField({
        	    id : 'custpage_psl_promotion',
        	    type : serverWidget.FieldType.TEXT,
        	    label : 'Promotion #'
        	});
        	
        	sublistPromotions.addField({
        	    id : 'custpage_psl_title',
        	    type : serverWidget.FieldType.SELECT,
        	    label : 'Title',
        	    source:'customrecord_itpm_promotiondeal'
        	});
        	
        	if(showShipDates){
        		sublistPromotions.addField({
            	    id : 'custpage_psl_ship_sd',
            	    type : serverWidget.FieldType.DATE,
            	    label : 'Ship Start Date'
            	});
            	
            	sublistPromotions.addField({
            	    id : 'custpage_psl_ship_ed',
            	    type : serverWidget.FieldType.DATE,
            	    label : 'Ship End Date'
            	});
        	}
        	
        	if(showOrderDates){
        		sublistPromotions.addField({
            	    id : 'custpage_psl_order_sd',
            	    type : serverWidget.FieldType.DATE,
            	    label : 'Order Start Date'
            	});
            	
            	sublistPromotions.addField({
            	    id : 'custpage_psl_order_ed',
            	    type : serverWidget.FieldType.DATE,
            	    label : 'Order End Date'
            	});
        	}
        	
        	//fetching the results from promotions
        	if(tranShipDateNotEmpty){
        		var resultsSLPR = getSearchResults(customerId,'pr',prefDatesType,trandate,transhipdate);
        		var i = 0;

        		//Adding the search results to the UI on sublist
        		resultsSLPR.each(function(result){
        			sublistPromotions.setSublistValue({
        				id : 'custpage_psl_promotion',
        				line : i,
        				value : result.getValue({name:'internalid'})
        			});

        			sublistPromotions.setSublistValue({
        				id : 'custpage_psl_title',
        				line : i,
        				value : result.getValue({name:'internalid'})
        			});

        			if(showShipDates){
        				sublistPromotions.setSublistValue({
        					id : 'custpage_psl_ship_sd',
        					line : i,
        					value : result.getValue({name:'custrecord_itpm_p_shipstart'})
        				});

        				sublistPromotions.setSublistValue({
        					id : 'custpage_psl_ship_ed',
        					line : i,
        					value : result.getValue({name:'custrecord_itpm_p_shipend'})
        				});
        			}

        			if(showOrderDates){
        				orderStartDate = result.getValue({name:'custrecord_itpm_p_orderstart'});
        				orderEndDate = result.getValue({name:'custrecord_itpm_p_orderend'});

        				if(orderStartDate){
        					sublistPromotions.setSublistValue({
        						id : 'custpage_psl_order_sd',
        						line : i,
        						value : orderStartDate
        					});
        				}
        				if(orderEndDate){
        					sublistPromotions.setSublistValue({
        						id : 'custpage_psl_order_ed',
        						line : i,
        						value : orderEndDate
        					});
        				}
        			}
        			i++;
        			return true;
        		});
        	}
        	//#############################  Promotions (UI) - END #######################################
        	
        	//*********************  Off Invoice (UI) - START ******************************
        	//Adding sublist(Off Invoice) to the subtab(iTPM)
        	var sublistOffInvoice = sc.form.addSublist({
        	    id : 'custpage_itpm_offinvoice',
        	    type : serverWidget.SublistType.INLINEEDITOR,
        	    label : 'Off Invoice',
        	    tab : 'custpage_itpm_tab'
        	});
        	
        	//Adding required fields to "Off-Invoice" subtab
        	sublistOffInvoice.addField({
        	    id : 'custpage_oisl_promotion',
        	    type : serverWidget.FieldType.TEXT,
        	    label : 'Promotion #',
        	    //source:'customrecord_itpm_promotiondeal'
        	});
        	
        	sublistOffInvoice.addField({
        	    id : 'custpage_oisl_title',
        	    type : serverWidget.FieldType.SELECT,
        	    label : 'Title',
        	    source:'customrecord_itpm_promotiondeal'
        	});
        	
        	sublistOffInvoice.addField({
        	    id : 'custpage_oisl_item',
        	    type : serverWidget.FieldType.SELECT,
        	    label : 'Item',
        	    source:'item'
        	});
        	
        	if(showShipDates){
        		sublistOffInvoice.addField({
        			id : 'custpage_oisl_ship_sd',
        			type : serverWidget.FieldType.DATE,
        			label : 'Ship Start Date'
        		});

        		sublistOffInvoice.addField({
        			id : 'custpage_oisl_ship_ed',
        			type : serverWidget.FieldType.DATE,
        			label : 'Ship End Date'
        		});
        	}
        	
        	if(showOrderDates){

        		sublistOffInvoice.addField({
        			id : 'custpage_oisl_order_sd',
        			type : serverWidget.FieldType.DATE,
        			label : 'Order Start Date'
        		});

        		sublistOffInvoice.addField({
        			id : 'custpage_oisl_order_ed',
        			type : serverWidget.FieldType.DATE,
        			label : 'Order End Date'
        		});
        	}
        	
        	sublistOffInvoice.addField({
        	    id : 'custpage_oisl_nb_pu',
        	    type : serverWidget.FieldType.CURRENCY,
        	    label : 'Off Invoice: Rate Per Unit'
        	});
        	
        	sublistOffInvoice.addField({
        	    id : 'custpage_oisl_nb_ppu',
        	    type : serverWidget.FieldType.PERCENT,
        	    label : 'Off Invoice: % Per Unit'
        	});
        	
        	sublistOffInvoice.addField({
        	    id : 'custpage_oisl_unit',
        	    type : serverWidget.FieldType.TEXT,
        	    label : 'Unit'
        	});
        	
        	if(tranShipDateNotEmpty){
        		//fetching the results from promotions
        		var resultsSLOI = getSearchResults(customerId,'oi',prefDatesType,trandate,transhipdate);
        		var i = 0;

        		//Adding the search results to the UI on sublist
        		resultsSLOI.each(function(result){
        			sublistOffInvoice.setSublistValue({
        				id : 'custpage_oisl_promotion',
        				line : i,
        				value : result.getValue({name:'internalid'})
        			});

        			sublistOffInvoice.setSublistValue({
        				id : 'custpage_oisl_title',
        				line : i,
        				value : result.getValue({name:'internalid'})
        			});

        			sublistOffInvoice.setSublistValue({
        				id : 'custpage_oisl_item',
        				line : i,
        				value : result.getValue({name:'custrecord_itpm_estqty_item', join:'CUSTRECORD_ITPM_ESTQTY_PROMODEAL'})
        			});

        			if(showShipDates){
        				sublistOffInvoice.setSublistValue({
        					id : 'custpage_oisl_ship_sd',
        					line : i,
        					value : result.getValue({name:'custrecord_itpm_p_shipstart'})
        				});

        				sublistOffInvoice.setSublistValue({
        					id : 'custpage_oisl_ship_ed',
        					line : i,
        					value : result.getValue({name:'custrecord_itpm_p_shipend'})
        				});
        			}

        			if(showOrderDates){
        				orderStartDate = result.getValue({name:'custrecord_itpm_p_orderstart'});
        				orderEndDate = result.getValue({name:'custrecord_itpm_p_orderend'});

        				if(orderStartDate){
        					sublistOffInvoice.setSublistValue({
        						id : 'custpage_oisl_order_sd',
        						line : i,
        						value : orderStartDate
        					});
        				}
        				if(orderEndDate){
        					sublistOffInvoice.setSublistValue({
        						id : 'custpage_oisl_order_ed',
        						line : i,
        						value : orderEndDate
        					});
        				}

        			}

        			sublistOffInvoice.setSublistValue({
        				id : 'custpage_oisl_nb_pu',
        				line : i,
        				value : result.getValue({name:'custrecord_itpm_estqty_rateperunitoi', join:'CUSTRECORD_ITPM_ESTQTY_PROMODEAL'})
        			});

        			sublistOffInvoice.setSublistValue({
        				id : 'custpage_oisl_nb_ppu',
        				line : i,
        				value : result.getValue({name:'custrecord_itpm_estqty_percentoi', join:'CUSTRECORD_ITPM_ESTQTY_PROMODEAL'})
        			});

        			sublistOffInvoice.setSublistValue({
        				id : 'custpage_oisl_unit',
        				line : i,
        				value : result.getText({name:'custrecord_itpm_estqty_qtyby', join:'CUSTRECORD_ITPM_ESTQTY_PROMODEAL'})
        			});

        			i++;
        			return true;
        		});
        	}
        	
        	//**************************** Off Invoice (UI) - END **************************
        	
        	
        	//=============================  Net Bill (UI) - START ========================================
        	//Adding sublist(Net Bill) to the subtab(iTPM)
        	var sublistNetBill = sc.form.addSublist({
        	    id : 'custpage_itpm_netbill',
        	    type : serverWidget.SublistType.INLINEEDITOR,
        	    label : 'Net Bill',
        	    tab : 'custpage_itpm_tab'
        	});
        	
        	//Adding required fields to "Net Bill" subtab
        	sublistNetBill.addField({
        	    id : 'custpage_nbsl_promotion',
        	    type : serverWidget.FieldType.TEXT,
        	    label : 'Promotion #',
        	    //source:'customrecord_itpm_promotiondeal'
        	});
        	
        	sublistNetBill.addField({
        	    id : 'custpage_nbsl_title',
        	    type : serverWidget.FieldType.SELECT,
        	    label : 'Title',
        	    source:'customrecord_itpm_promotiondeal'
        	});
        	
        	sublistNetBill.addField({
        	    id : 'custpage_nbsl_item',
        	    type : serverWidget.FieldType.SELECT,
        	    label : 'Item',
        	    source:'item'
        	});
        	
        	if(showShipDates){
        		sublistNetBill.addField({
            	    id : 'custpage_nbsl_ship_sd',
            	    type : serverWidget.FieldType.DATE,
            	    label : 'Ship Start Date'
            	});
            	
        		sublistNetBill.addField({
            	    id : 'custpage_nbsl_ship_ed',
            	    type : serverWidget.FieldType.DATE,
            	    label : 'Ship End Date'
            	});
        	}
        	
        	if(showOrderDates){
        		sublistNetBill.addField({
            	    id : 'custpage_nbsl_order_sd',
            	    type : serverWidget.FieldType.DATE,
            	    label : 'Order Start Date'
            	});
            	
        		sublistNetBill.addField({
            	    id : 'custpage_nbsl_order_ed',
            	    type : serverWidget.FieldType.DATE,
            	    label : 'Order End Date'
            	});
        	}
        	
        	sublistNetBill.addField({
        	    id : 'custpage_nbsl_nb_pu',
        	    type : serverWidget.FieldType.CURRENCY,
        	    label : 'Net Bill: Rate Per Unit'
        	});
        	
        	sublistNetBill.addField({
        	    id : 'custpage_nbsl_nb_ppu',
        	    type : serverWidget.FieldType.PERCENT,
        	    label : 'Net Bill: % Per Unit'
        	});
        	
        	sublistNetBill.addField({
        	    id : 'custpage_nbsl_unit',
        	    type : serverWidget.FieldType.TEXT,
        	    label : 'Unit'
        	});
        	
        	if(tranShipDateNotEmpty){
        		//fetching the results from promotions
        		var resultsSLNB = getSearchResults(customerId,'nb',prefDatesType,trandate,transhipdate);
        		var i = 0;

        		//Adding the search results to the UI on sublist
        		resultsSLNB.each(function(result){
        			sublistNetBill.setSublistValue({
        				id : 'custpage_nbsl_promotion',
        				line : i,
        				value : result.getValue({name:'internalid'})
        			});

        			sublistNetBill.setSublistValue({
        				id : 'custpage_nbsl_title',
        				line : i,
        				value : result.getValue({name:'internalid'})
        			});


        			sublistNetBill.setSublistValue({
        				id : 'custpage_nbsl_item',
        				line : i,
        				value : result.getValue({name:'custrecord_itpm_estqty_item', join:'CUSTRECORD_ITPM_ESTQTY_PROMODEAL', sort: search.Sort.ASC})
        			});

        			if(showShipDates){
        				sublistNetBill.setSublistValue({
        					id : 'custpage_nbsl_ship_sd',
        					line : i,
        					value : result.getValue({name:'custrecord_itpm_p_shipstart'})
        				});

        				sublistNetBill.setSublistValue({
        					id : 'custpage_nbsl_ship_ed',
        					line : i,
        					value : result.getValue({name:'custrecord_itpm_p_shipend'})
        				});
        			}

        			if(showOrderDates){
        				orderStartDate = result.getValue({name:'custrecord_itpm_p_orderstart'});
        				orderEndDate = result.getValue({name:'custrecord_itpm_p_orderend'});
        				if(orderStartDate){
        					sublistNetBill.setSublistValue({
        						id : 'custpage_nbsl_order_sd',
        						line : i,
        						value : orderStartDate
        					});
        				}
        				if(orderEndDate){
        					sublistNetBill.setSublistValue({
        						id : 'custpage_nbsl_order_ed',
        						line : i,
        						value : orderEndDate
        					});
        				}

        			}

        			sublistNetBill.setSublistValue({
        				id : 'custpage_nbsl_nb_pu',
        				line : i,
        				value : result.getValue({name:'custrecord_itpm_estqty_rateperunitnb', join:'CUSTRECORD_ITPM_ESTQTY_PROMODEAL'})
        			});

        			sublistNetBill.setSublistValue({
        				id : 'custpage_nbsl_nb_ppu',
        				line : i,
        				value : result.getValue({name:'custrecord_itpm_estqty_percentnb', join:'CUSTRECORD_ITPM_ESTQTY_PROMODEAL'})
        			});

        			sublistNetBill.setSublistValue({
        				id : 'custpage_nbsl_unit',
        				line : i,
        				value : result.getText({name:'custrecord_itpm_estqty_qtyby', join:'CUSTRECORD_ITPM_ESTQTY_PROMODEAL'})
        			});

        			i++;
        			return true;
        		});
        	}
        	//=====================================  Net Bill (UI) - END ===================================
        	
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }
    
    /**
     * @param {String} type - sublist type any of Off Invoice, Net bill
     * 
     * @return {Array} searchResults (promotions)
     */
    function getSearchResults(customerId,type,prefDatesType,trandate,transhipdate){
    	try{
    		var tranColumns = [  
 				"internalid"
 			 ];
    		
    		var tranFilters = [  
 				["custrecord_itpm_p_customer","anyof",customerId],
				 "AND",
				["custrecord_itpm_p_status","anyof","3"]   //Approved - 3
			 ];
    		
    		if(type == 'oi'){
    			tranFilters.push("AND",["custrecord_itpm_p_type.custrecord_itpm_pt_validmop","anyof",3]); // off-invoice
    			tranFilters.push("AND",["CUSTRECORD_ITPM_ESTQTY_PROMODEAL.custrecord_itpm_estqty_rateperunitoi","notequalto",0]);
    			tranFilters.push("AND",["CUSTRECORD_ITPM_ESTQTY_PROMODEAL.custrecord_itpm_estqty_percentoi","notequalto",0]);
    		}else if(type == 'nb'){
    			tranFilters.push("AND",["custrecord_itpm_p_type.custrecord_itpm_pt_validmop","anyof",2]); // net-bill
    			tranFilters.push("AND",["CUSTRECORD_ITPM_ESTQTY_PROMODEAL.custrecord_itpm_estqty_rateperunitnb","notequalto",0]);
    			tranFilters.push("AND",["CUSTRECORD_ITPM_ESTQTY_PROMODEAL.custrecord_itpm_estqty_percentnb","notequalto",0]);
    		}else{
    			tranFilters.push("AND",["custrecord_itpm_p_type.custrecord_itpm_pt_validmop","anyof",[2,3]]); //net-bill or off-invoice
    		}
    		
    		//Adding the sort columns to the tranColumns array
    		if(type == 'nb' || type == 'oi'){
    			tranColumns.push(search.createColumn({
    				name:'custrecord_itpm_estqty_item',
    				join:'CUSTRECORD_ITPM_ESTQTY_PROMODEAL',
					sort:search.Sort.ASC
    			}),"custrecord_itpm_p_shipstart", 
 				"custrecord_itpm_p_shipend", 
 				"custrecord_itpm_p_orderstart", 
 				"custrecord_itpm_p_orderend",
 				"CUSTRECORD_ITPM_ESTQTY_PROMODEAL.custrecord_itpm_estqty_rateperunitnb", 
 				"CUSTRECORD_ITPM_ESTQTY_PROMODEAL.custrecord_itpm_estqty_percentnb", 
 				"CUSTRECORD_ITPM_ESTQTY_PROMODEAL.custrecord_itpm_estqty_rateperunitoi", 
 				"CUSTRECORD_ITPM_ESTQTY_PROMODEAL.custrecord_itpm_estqty_percentoi", 
 				"CUSTRECORD_ITPM_ESTQTY_PROMODEAL.custrecord_itpm_estqty_qtyby");
    			
    		}else{
    			tranColumns.push(search.createColumn({
    				name:'custrecord_itpm_p_shipstart',
    				sort:search.Sort.ASC
    			}),search.createColumn({
    				name:'custrecord_itpm_p_orderstart',
    				sort:search.Sort.ASC
    			}),search.createColumn({
    				name:'custrecord_itpm_p_shipend',
    				sort:search.Sort.ASC
    			}),search.createColumn({
    				name:'custrecord_itpm_p_orderend',
    				sort:search.Sort.ASC
    			}));
    		}
    		
    		//Adding the filters to the tranFilters array
    		switch(prefDatesType){
    		case "Ship Date":
    			tranFilters.push("AND",["custrecord_itpm_p_shipstart","onorbefore",transhipdate]);
    			tranFilters.push("AND",["custrecord_itpm_p_shipend","onorafter",transhipdate]);
    			break;
    		case "Order Date":
    			tranFilters.push("AND",["custrecord_itpm_p_orderstart","onorbefore",trandate]);
    			tranFilters.push("AND",["custrecord_itpm_p_orderend","onorafter",trandate]);
    			break;
    		case "Both":
    			tranFilters.push("AND",[
    				[["custrecord_itpm_p_shipstart","onorbefore",transhipdate],"AND",["custrecord_itpm_p_shipend","onorafter",transhipdate]],
    				"AND",
    				[["custrecord_itpm_p_orderstart","onorbefore",trandate],"AND",["custrecord_itpm_p_orderend","onorafter",trandate]]
    			]);
    			break;
    		case "Either":
    			var eitherFil = [
    				[["custrecord_itpm_p_orderstart","onorbefore",trandate],"AND",["custrecord_itpm_p_orderend","onorafter",trandate]]
    			];
    			if(transhipdate){
    				eitherFil.push("OR",[["custrecord_itpm_p_shipstart","onorbefore",transhipdate],"AND",["custrecord_itpm_p_shipend","onorafter",transhipdate]]);
    			}
    			tranFilters.push("AND",eitherFil);	
    			break;
    		}
    		
    		//creating the search on promotions
    		var searchObj = search.create({ 
    		 	type: "customrecord_itpm_promotiondeal", 
    		 	filters: tranFilters, 
    		 	columns: tranColumns 
    		 });

    		 var searchResults = searchObj.run();
    		 return searchResults;
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }
    
    return {
        beforeLoad: beforeLoadiTPMSublists
    };
    
});
