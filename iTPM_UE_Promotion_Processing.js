/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget',
		'N/record',
		'N/runtime',
		'N/url',
		'N/search'
		],
/**
 * @param {serverWidget} serverWidget
 * @param {record} record
 * @param {runtime} runtime
 * @param {url} url
 */
function(serverWidget,record,runtime,url,search) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {
    	try{
    		var promoRec = scriptContext.newRecord;
    		var promoForm = scriptContext.form;
    		if(runtime.executionContext == runtime.ContextType.USER_INTERFACE){
 
    			//this block for adding the New Settement button to Promotion record.
    			if(scriptContext.type == 'view'){
        			var status = promoRec.getValue('custrecord_itpm_p_status');
        			var condition = promoRec.getValue('custrecord_itpm_p_condition');
        			
        			//ALLOW SETTLEMENTS WHEN PROMOTION IS ACTIVE?
        			var allowForSettlement = record.load({
        				type:'customrecord_itpm_promotiontype',
        				id:promoRec.getValue('custrecord_itpm_p_type')
        			}).getValue('custrecord_itpm_pt_settlewhenpromoactive');
        			
        			var showSettlementButton = ((status == 3 && condition == 3) || (allowForSettlement && (status == 3 && condition == 2)));
        			
        			if(showSettlementButton){
        				promoForm.addButton({
        					id:'custpage_newsettlementbtn',
        					label:'New Settlement',
        					functionName:'newSettlement('+promoRec.id+')'
        				});
        				promoForm.clientScriptModulePath = './iTPM_Attach_Promotion_ClientMethods.js';
        			}
        			
        			//after copy and save the record it will show the copy in progress message
        			var copyInProgress = promoRec.getValue('custrecord_itpm_p_copyinprogress');
            		var copyRelatedRecords = promoRec.getValue('custrecord_itpm_p_copy');
            		if(copyInProgress && copyRelatedRecords){
            			var msgText = "This Promotion is queued for copying and cannot be edited until the linked records (Allowances, Estimated Quantities, and Retail Info) are copied over from the original promotion, Please be patient."
            			scriptContext.form.addField({
            					id:'custpage_copyinprg_message',
            					type:serverWidget.FieldType.INLINEHTML,
            					label:'script'
            			}).defaultValue = '<script language="javascript">require(["N/ui/message"],function(msg){msg.create({title:"Copy is in progress",message:"'+msgText+'",type: msg.Type.INFORMATION}).show()})</script>'
            		}
        		}
        		
    			//this block for showing the overlapping promotions in promotion record subtab
        		if(scriptContext.type == 'view' || scriptContext.type == 'edit'){
        			var params = {
        				rectype:promoRec.getValue('rectype'),
        				cid:promoRec.getValue('custrecord_itpm_p_customer'),
        				pdid:promoRec.id,
        				start:promoRec.getText('custrecord_itpm_p_shipstart'),
        				end:promoRec.getText('custrecord_itpm_p_shipend')
        			}   
        			//Add the overlap promotion to the new subtab
        			addOverlapSublists(promoForm,params);
        		}
    		}
    	}catch(e){
    		log.error(e.name,'record id = '+scriptContext.newRecord.id+', function name = beforeload, message = '+e.message);
    	}
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
    	try{
			if(scriptContext.newRecord.getValue('custrecord_itpm_p_impact') == '13'){
				//Actual Sales Suitelet URL
				var actualSalesURL = url.resolveScript({
					scriptId: 'customscript_itpm_promo_actualsales',
					deploymentId: 'customdeploy_itpm_promo_actualsales',
					returnExternalUrl: false,
					params: {
						'pid':scriptContext.newRecord.id,
						'yr':0,
						'st':0
					}
				});

				//Actual Sales Previous Year Suitelet URL
				var actualSalesURLPreviousYear = url.resolveScript({
					scriptId: 'customscript_itpm_promo_actualsales',
					deploymentId: 'customdeploy_itpm_promo_actualsales',
					returnExternalUrl: false,
					params: {
						'pid':scriptContext.newRecord.id,
						'yr':1,
						'st':0
					}
				});
				
				//Actual Shippments Suitelet URL
				var actualShippmentsURL = url.resolveScript({
					scriptId: 'customscript_itpm_promo_actualshippments',
					deploymentId: 'customdeploy_itpm_promo_actualshippments',
					returnExternalUrl: false,
					params: {
						'pid':scriptContext.newRecord.id,
						'yr':0,
						'st':0
					}
				});
				
				//Actual Shippments Previous Year Suitelet URL
				var actualShippmentsURLPreviousYear = url.resolveScript({
					scriptId: 'customscript_itpm_promo_actualshippments',
					deploymentId: 'customdeploy_itpm_promo_actualshippments',
					returnExternalUrl: false,
					params: {
						'pid':scriptContext.newRecord.id,
						'yr':1,
						'st':0
					}
				});
				//adding the Actual and Shipments URLs.
				record.load({
					type:'customrecord_itpm_promotiondeal',
					id:scriptContext.newRecord.id,
					isDynamic:true
				}).setValue({
					fieldId:'custrecord_itpm_p_actualsales', //Actual Sales
					value:actualSalesURL
				}).setValue({
					fieldId:'custrecord_itpm_p_actualshippments', //Actual Shippments
					value:actualShippmentsURL
				}).setValue({
					fieldId:'custrecord_itpm_p_actualsalespreviousyr', //Actual Sales Previous Year
					value:actualSalesURLPreviousYear
				}).setValue({
					fieldId:'custrecord_itpm_p_actualshippreviousyear', //Actual Shippments Previous Year
					value:actualShippmentsURLPreviousYear
				}).save({
					enableSourcing:false,
					ignoreMandatoryFields:true
				});
			}
		}catch(e){
			log.error(e.name,'record type = iTPM promotion, record id = '+scriptContext.newRecord.id+', message = '+e.message);
		}
    }
    
    
    /**
     * @param promoForm
     * @param params customerid,promotionid,startdate,enddate
     * @description add the new subtab called overlap promotions
     */
    function addOverlapSublists(promoForm,params){
    	//Adding the overlap promotions to the form
		var tab = promoForm.addTab({
		    id : 'custpage_overlappromotions',
		    label : 'Overlapping Promotions'
		});
		var sublist = promoForm.addSublist({
		    id : 'custpage_sublist_overlapromotions',
		    type : serverWidget.SublistType.INLINEEDITOR,
		    tab:'custpage_overlappromotions',
		    label : 'overlapping promotions'
		});
		sublist.addField({
		    id : 'custpage_overlappromo_item',
		    type : serverWidget.FieldType.SELECT,
		    label : 'Item',
		    source:'item'
		 });
		
		sublist.addField({
		    id : 'custpage_overlappromo_itemcode',
		    type : serverWidget.FieldType.TEXT,
		    label : 'Item Code'
		 });
		sublist.addField({
		    id : 'custpage_overlappromo_promo',
		    type : serverWidget.FieldType.SELECT,
		    label : 'Promotion/Deal',
		    source:'customrecord_itpm_promotiondeal'
		 });
		sublist.addField({
		    id : 'custpage_overlappromo_shipstart',
		    type : serverWidget.FieldType.TEXT,
		    label : 'Ship Start'
		 });
		sublist.addField({
		    id : 'custpage_overlappromo_shipend',
		    type : serverWidget.FieldType.TEXT,
		    label : 'Ship End'
		 });
		sublist.addField({
		    id : 'custpage_overlappromo_lapdays',
		    type : serverWidget.FieldType.TEXT,
		    label : 'Days Overlapping'
		 });
		sublist.addField({
		    id : 'custpage_overlappromo_status',
		    type : serverWidget.FieldType.TEXT,
		    label : 'Promotion/Deal Status'
		 });
		sublist.addField({
		    id : 'custpage_overlappromo_condition',
		    type : serverWidget.FieldType.TEXT,
		    label : 'Promotion/Deal Condition'
		 });
		sublist.addField({
		    id : 'custpage_overlappromo_id',
		    type : serverWidget.FieldType.TEXT,
		    label : 'Promotion/Deal ID'
		 });
		sublist.addField({
		    id : 'custpage_overlappromo_ptype',
		    type : serverWidget.FieldType.SELECT,
		    label : 'Promotion type',
		    source:'customrecord_itpm_promotiontype'
		 });
		sublist.addField({
		    id : 'custpage_overlappromo_totalallpercent',
		    type : serverWidget.FieldType.TEXT,
		    label : 'Total Allowances As %'
		 });
		sublist.addField({
		    id : 'custpage_overlappromo_totalallrate',
		    type : serverWidget.FieldType.TEXT,
		    label : 'Total Allowance Per UOM'
		 });
		sublist.addField({
		    id : 'custpage_overlappromo_alluom',
		    type : serverWidget.FieldType.TEXT,
		    label : 'UOM'
		 });
		
		//getting the Promotion/Deal Estimated Qty list
		var estQtyItems = [];
		search.create({
			type:'customrecord_itpm_estquantity',
			columns:['custrecord_itpm_estqty_item'],
			filters:[['custrecord_itpm_estqty_promodeal','anyof',params.pdid]]
		}).run().each(function(e){
			estQtyItems.push(e.getValue('custrecord_itpm_estqty_item'));
			return true;
		});
		
		if(estQtyItems.length>0){
			var i = 0;
			getOverlappedPromos(params).run().each(function(e){
				var promoDealSearchId = e.getValue('internalid'),
				promoDealStatus = e.getText('custrecord_itpm_p_status'),
				promoDealCondition = e.getText('custrecord_itpm_p_condition'),
				promoStartDate = e.getValue('custrecord_itpm_p_shipstart'),
				promotEndDate = e.getValue('custrecord_itpm_p_shipend');
				
				//getting the overlapping days
				overlappedDays = getOverlappingDays(params.start,params.end,promoStartDate,promotEndDate);
				
				//if over lapped days are 0 than reversing the date and calculate the overlapped days again.
				if(overlappedDays == 0){
					overlappedDays = getOverlappingDays(promoStartDate,promotEndDate,params.start,params.end);
				}

				search.create({
					type:'customrecord_itpm_estquantity',
					columns:['custrecord_itpm_estqty_item',
							 'custrecord_itpm_estqty_qtyby',
							 'custrecord_itpm_estqty_totalrate',
							 'custrecord_itpm_estqty_totalpercent'
							 ],
					filters:[
							 ['custrecord_itpm_estqty_promodeal','anyof',promoDealSearchId],'and',
						     ['isinactive','is',false],'and',
						     ['custrecord_itpm_estqty_item','anyof',estQtyItems]
							]
				}).run().each(function(estQty){
					sublist.setSublistValue({
						id : 'custpage_overlappromo_item',
						line : i,
						value : estQty.getValue('custrecord_itpm_estqty_item')
					});
					sublist.setSublistValue({
						id : 'custpage_overlappromo_itemcode',
						line : i,
						value : estQty.getValue('custrecord_itpm_estqty_item')
					});
					sublist.setSublistValue({
						id : 'custpage_overlappromo_promo',
						line : i,
						value : promoDealSearchId
					});
					sublist.setSublistValue({
						id : 'custpage_overlappromo_shipstart',
						line : i,
						value : e.getValue('custrecord_itpm_p_shipstart')
					});

					sublist.setSublistValue({
						id : 'custpage_overlappromo_shipend',
						line : i,
						value : e.getValue('custrecord_itpm_p_shipend')
					});
					sublist.setSublistValue({
						id : 'custpage_overlappromo_lapdays',
						line : i,
						value : overlappedDays.toString()
					});
					sublist.setSublistValue({
						id : 'custpage_overlappromo_status',
						line : i,
						value : promoDealStatus
					});
					sublist.setSublistValue({
						id : 'custpage_overlappromo_condition',
						line : i,
						value : promoDealCondition
					});
					sublist.setSublistValue({
						id : 'custpage_overlappromo_id',
						line : i,
						value : promoDealSearchId
					});
					sublist.setSublistValue({
						id : 'custpage_overlappromo_ptype',
						line : i,
						value : e.getValue({name:'internalid',join:'custrecord_itpm_p_type'})
					});
					sublist.setSublistValue({
						id : 'custpage_overlappromo_totalallpercent',
						line : i,
						value : estQty.getValue('custrecord_itpm_estqty_totalpercent')
					});
					sublist.setSublistValue({
						id : 'custpage_overlappromo_totalallrate',
						line : i,
						value : estQty.getValue('custrecord_itpm_estqty_totalrate')
					});
					sublist.setSublistValue({
						id : 'custpage_overlappromo_alluom',
						line : i,
						value : estQty.getText('custrecord_itpm_estqty_qtyby')
					});
					i++;
					return true;
				});
				return true;
			});
		}
    }
    
    /**
     * @param params
     * @return {Object} search object
     * @description search form overlapped promotions.
     */
    function getOverlappedPromos(params){
    	return search.create({
			type:'customrecord_itpm_promotiondeal',
			columns:['internalid',
					 'name',
					 'custrecord_itpm_p_status',
					 'custrecord_itpm_p_condition',
					 'custrecord_itpm_p_type.internalid',
					 'custrecord_itpm_p_shipstart',
					 'custrecord_itpm_p_shipend'
					 ],
			filters:[
					   [['custrecord_itpm_p_shipstart','before', params.start],'and',
						['custrecord_itpm_p_shipend','after', params.end]],'or',
					   [['custrecord_itpm_p_shipstart','within', params.start, params.end],'or',
						['custrecord_itpm_p_shipend','within', params.start, params.end]],'and',
					   ['isinactive','is',false],'and',
					   ['internalid','noneof', params.pdid],'and',
					   ['custrecord_itpm_p_customer','anyof',params.cid],'and',
					   ['custrecord_itpm_p_status','noneof',[5,7]]
					]	    		
		});
    }
    

	/**
	 * @param start1
	 * @param end1
	 * @param start2
	 * @param end2
	 * @returns {String}
	 * @description to get overlapping days
	 */
	function getOverlappingDays(start1,end1,start2,end2){
		var startIsBetween = false,EndIsBetween = false,diffDays=0;

		if(Date.parse(start1) <= Date.parse(start2) && Date.parse(end1) >= Date.parse(start2)){
			startIsBetween = true;
		}

		if(Date.parse(start1) <= Date.parse(end2) && Date.parse(end1) >= Date.parse(end2)){
			EndIsBetween = true;
		}

		if(startIsBetween && EndIsBetween){
			//difference between s2 date and e2 date
			diffDays = getDifference(end2,start2)
		}else if(!startIsBetween && EndIsBetween){
			//difference between s1 date and e2 date
			diffDays = getDifference(end2,start1)
		}else if(startIsBetween && !EndIsBetween){
			//difference between s2 date and e1 date
			diffDays = getDifference(end1,start2)
		}
		return diffDays;
	}


	/**
	 * @param date1
	 * @param date2
	 * @returns {String} 
	 * @description to get the no of days
	 */
	function getDifference(date1,date2){
		var date1 = new Date(date1),date2 = new Date(date2),
		timeDiff = Math.abs(date2.getTime() - date1.getTime());
		diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); 
		return diffDays;
	}	
    
    

    return {
        beforeLoad: beforeLoad,
        afterSubmit: afterSubmit
    };
    
});
