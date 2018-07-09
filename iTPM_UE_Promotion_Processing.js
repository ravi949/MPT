/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget',
	'N/record',
	'N/runtime',
	'N/url',
	'N/search',
	'./iTPM_Module.js'
	],
	/**
	 * @param {serverWidget} serverWidget
	 * @param {record} record
	 * @param {runtime} runtime
	 * @param {url} url
	 * @param {search} search
	 */
	function(serverWidget,record,runtime,url,search,itpm) {

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

				if(scriptContext.type == 'create'){
					promoRec.setValue({
						fieldId: 'custrecord_itpm_p_itempricelevel',
						value: itpm.getPrefrenceValues(undefined)['defaultPriceLevel']
					});
				}
				
				//for copy promotion validating promotion type is active or not
				if(scriptContext.type == 'copy'){					
					var promoTypeRec = record.load({
						type:'customrecord_itpm_promotiontype',
						id:promoRec.getValue('custrecord_itpm_p_type')
					});
					var checkPromotypeRecActive = promoTypeRec.getValue('isinactive');
					var checkPromotypeRecAvailable = promoTypeRec.getValue('custrecord_itpm_pt_expiredorunavailable');
					log.error('checkPromotypeRecActive',checkPromotypeRecActive);
					if(checkPromotypeRecActive == true || checkPromotypeRecAvailable == false){						
						throw{
							name:'PROMOTIONTYPE_RECORD_IS_INACTIVE',
							message :'Sorry, this promotion type is no longer valid for new promotions, and can not be copied.'
						}				
					}
				}
				
				//this block for adding the New Settement button to Promotion record.
				if(scriptContext.type == 'view'){
					var status = promoRec.getValue('custrecord_itpm_p_status');
					var condition = promoRec.getValue('custrecord_itpm_p_condition');
					var customer = promoRec.getValue('custrecord_itpm_p_customer');					

					//ALLOW SETTLEMENTS WHEN PROMOTION IS ACTIVE?
					var allowForSettlement = record.load({
						type:'customrecord_itpm_promotiontype',
						id:promoRec.getValue('custrecord_itpm_p_type')
					}).getValue('custrecord_itpm_pt_settlewhenpromoactive');

					//role based permission allow permissions (CREATE,EDIT and FULL)
					var settlementRectypeId = runtime.getCurrentScript().getParameter('custscript_itpm_settlementpermissionsrec');
					var rolePermission = runtime.getCurrentUser().getPermission('LIST_CUSTRECORDENTRY'+settlementRectypeId);
					log.debug('rolePermission',rolePermission);
					rolePermission = (rolePermission == runtime.Permission.CREATE || rolePermission == runtime.Permission.EDIT || rolePermission == runtime.Permission.FULL);
					var showSettlementButton = (rolePermission  && ((status == 3 && condition == 3) || (allowForSettlement && (status == 3 && condition == 2))));
					//checking promotion permission
					var promotionRectypeId = runtime.getCurrentScript().getParameter('custscript_itpm_promopermissionrec');
					var promoPermission = runtime.getCurrentUser().getPermission('LIST_CUSTRECORDENTRY'+promotionRectypeId);
					var user = runtime.getCurrentUser();
					//checking promotionType permission
					var promotionTypeRectypeId = runtime.getCurrentScript().getParameter('custscriptitpm_promotypepermission');
					var promoTypePermission = runtime.getCurrentUser().getPermission('LIST_CUSTRECORDENTRY'+promotionTypeRectypeId);
					var owner = promoRec.getValue('owner');	
					var kpiAlocationCalcIsComplete = search.create({
						type: "customrecord_itpm_kpi",
						filters: [
							["custrecord_itpm_kpi_allocfactcalculated","is","F"],  "AND", 
							["custrecord_itpm_kpi_promotiondeal","anyof",promoRec.id]
							],
							columns: [ 'custrecord_itpm_kpi_promotiondeal', 'custrecord_itpm_kpi_item', 'custrecord_itpm_kpi_esttotalqty' ]
					}).run().getRange(0,10).length > 0;

					if(showSettlementButton && !promoRec.getValue('custrecord_itpm_promo_allocationcontrbtn') && !kpiAlocationCalcIsComplete){
						promoForm.addButton({
							id:'custpage_newsettlementbtn',
							label:'Request Settlement',
							functionName:'newSettlement('+promoRec.id+')'
						});

						promoForm.addButton({
							id:'custpage_bulksettlementbtn',
							label:'Resolve Deductions',
							functionName:'bulkSettlements('+promoRec.id+','+customer+')'
						});

						promoForm.clientScriptModulePath = './iTPM_Attach_Promotion_ClientMethods.js';
					}

					//Showing Refresh KPIs button only for APPROVED and CLOSED statuses (Don't show if this Promotion was already exist in KPI Queue)
					var searchCount = search.create({
						type : 'customrecord_itpm_kpiqueue',
						filters : [
							['custrecord_itpm_kpiq_promotion', 'is', promoRec.id],'and',
							['custrecord_itpm_kpiq_start','isempty',null],'and',
							['custrecord_itpm_kpiq_end','isempty',null]
							]
					}).runPaged().count;
					log.debug('REFRESH KPIs button: searchCount', searchCount);
					if((status == 3 || status == 7) && searchCount == 0){
						promoForm.addButton({
							id:'custpage_refresh_kpis',
							label:'Refresh KPIs',
							functionName:'refreshKPIs('+promoRec.id+')'
						});
						promoForm.clientScriptModulePath = './iTPM_Attach_Promotion_ClientMethods.js';
					}
					
					//Getting Promotion Planning Records count w.r.t Promotion ID
		    		var promoPlanRecSearch = search.create({
		    			type: "customrecord_itpm_promotion_planning",
		    			columns:[
		    						search.createColumn({
		    							name:'internalid',
		    							summary:search.Summary.COUNT
		    						})
		    			         ],
		    			filters: [
		    					   ["custrecord_itpm_pp_promotion","anyof",promoRec.id], 
		    					   "AND", 
		    					   ["isinactive","is","false"]
		    					 ]  
		    		}).run().getRange(0,1);
		    		promoPlanRecCount = parseFloat(promoPlanRecSearch[0].getValue({name:'internalid',summary:search.Summary.COUNT}));
		    		log.debug('promoPlanRecCount', promoPlanRecCount);
		    		log.debug('promoPermission', promoPermission);
		    		log.debug('promoTypePermission', promoTypePermission);
		    		log.debug('owner', owner);
		    		log.debug('user', user.id);
		    		
					//adding Planning Complete button on promotion record if it has a promotion planning lines.
		    		if((promoPlanRecCount > 0 && promoRec.getValue('custrecord_itpm_p_ispromoplancomplete')== false && (status == 1 || status == 2 || status == 3) && (promoPermission == 4 || promoTypePermission >= 3 ||(promoPermission >= 2 && owner == user.id && (status == 1 || (status == 2 && condition == 1)))))){
		    			log.audit(true);
		    			promoForm.addButton({
							id:'custpage_planning_completed',
							label:'Planning Completed',
							functionName:'planningComplete('+promoRec.id+')'
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
					
					//after Planing Completed showing the progress message while batch process running
					var promoPlaningProgress = promoRec.getValue('custrecord_itpm_p_ispromoplancomplete');
					if(promoPlaningProgress){
						var msgText = "Please wait while your planned allowances, estimated quantities, and retail information is processed "+
						              "and made available under the subtabs by the same name. This process runs at 0, 15, 30 and 45 minutes "+
						              "after the hour. Any allowances by item groups will be expanded to the associated items.";
							scriptContext.form.addField({
								id:'custpage_planingprogress_message',
								type:serverWidget.FieldType.INLINEHTML,
								label:'script'
							}).defaultValue = '<script language="javascript">require(["N/ui/message"],function(msg){msg.create({title:"Please wait...",message:"'+msgText+'",type: msg.Type.INFORMATION}).show()})</script>'
					}
				}

				if (scriptContext.type == 'view' || scriptContext.type == 'edit'){
					var actualSalesURL = url.resolveScript({
						scriptId: 'customscript_itpm_promo_actualsales',
						deploymentId: 'customdeploy_itpm_promo_actualsales',
						returnExternalUrl: false,
						params: {
							'pid':scriptContext.newRecord.id,
							'yr':'current',
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
							'yr':'previous',
							'st':0
						}
					});

					//Actual Sales Last 52 weeks Suitelet URL
					var actualSalesURLForLast52Weeks = url.resolveScript({
						scriptId: 'customscript_itpm_promo_actualsales',
						deploymentId: 'customdeploy_itpm_promo_actualsales',
						returnExternalUrl: false,
						params: {
							'pid':scriptContext.newRecord.id,
							'yr':'last52',
							'st':0
						}
					});

					//Actual Shipments Suitelet URL
					var actualShippmentsURL = url.resolveScript({
						scriptId: 'customscript_itpm_promo_actualshippments',
						deploymentId: 'customdeploy_itpm_promo_actualshippments',
						returnExternalUrl: false,
						params: {
							'pid':scriptContext.newRecord.id,
							'yr':'current',
							'st':0
						}
					});

					//Actual Shipments Previous Year Suitelet URL
					var actualShippmentsURLPreviousYear = url.resolveScript({
						scriptId: 'customscript_itpm_promo_actualshippments',
						deploymentId: 'customdeploy_itpm_promo_actualshippments',
						returnExternalUrl: false,
						params: {
							'pid':scriptContext.newRecord.id,
							'yr':'previous',
							'st':0
						}
					});

					//Actual Shipments Last 52 weeks Suitelet URL
					var actualShippmentsURLForLast52Weeks = url.resolveScript({
						scriptId: 'customscript_itpm_promo_actualshippments',
						deploymentId: 'customdeploy_itpm_promo_actualshippments',
						returnExternalUrl: false,
						params: {
							'pid':scriptContext.newRecord.id,
							'yr':'last52',
							'st':0
						}
					});
					//adding the Actual and Shipments URLs.
					var promoRec = scriptContext.newRecord;
					promoRec.setValue({
						fieldId:'custrecord_itpm_p_actualsales', //Actual Sales
						value:actualSalesURL,
						ignoreFieldChange: true
					});
					promoRec.setValue({
						fieldId:'custrecord_itpm_p_actualshippments', //Actual Shipments
						value:actualShippmentsURL,
						ignoreFieldChange: true
					});
					promoRec.setValue({
						fieldId:'custrecord_itpm_p_actualsalespreviousyr', //Actual Sales Previous Year
						value:actualSalesURLPreviousYear,
						ignoreFieldChange: true
					});
					promoRec.setValue({
						fieldId:'custrecord_itpm_p_actualshippreviousyear', //Actual Shipments Previous Year
						value:actualShippmentsURLPreviousYear,
						ignoreFieldChange: true
					});
					promoRec.setValue({
						fieldId:'custrecord_itpm_p_actualsales52week', //Actual Sales Last 52 weeks
						value:actualSalesURLForLast52Weeks,
						ignoreFieldChange: true
					});
					promoRec.setValue({
						fieldId:'custrecord_itpm_p_actualshipmnts52weeks', //Actual Shipments Last 52 weeks
						value:actualShippmentsURLForLast52Weeks,
						ignoreFieldChange: true
					});
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
					addOverlapSublists(promoForm,params,scriptContext.type);
				}

			}
			var scriptObj = runtime.getCurrentScript();
			log.debug("Remaining governance units: " + scriptObj.getRemainingUsage());
		}catch(ex){
			log.error(ex.name, ex.message +'; beforeLoad; trigger type: ' + scriptContext.type + '; recordID: ' + scriptContext.newRecord.id + '; recordType: ' + scriptContext.newRecord.type);
			if(ex.name == 'PROMOTIONTYPE_RECORD_IS_INACTIVE'){
				throw new Error(ex.message);
			}
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
			var eventType = scriptContext.type;
			var promoOldRec = scriptContext.oldRecord;
			var promoNewRec = scriptContext.newRecord;
			var oldStatus = promoOldRec.getValue('custrecord_itpm_p_status');
			var newStatus = promoNewRec.getValue('custrecord_itpm_p_status');
			var condition = promoNewRec.getValue('custrecord_itpm_p_condition');
			var promoId = promoNewRec.id;
			
			if(eventType == 'edit'){
				log.error('oldStatus', oldStatus);
				log.error('newStatus', newStatus);
				log.error('condition', condition);
				if(
						(oldStatus == 3 && newStatus == 3 && (condition == 2 || condition == 3)) || 
						(oldStatus == 2 && newStatus == 3 && (condition == 2 || condition == 3)) || 
						(oldStatus == 7 && newStatus == 3 && (condition == 2 || condition == 3)) ||
						(oldStatus == 3 && (newStatus == 7 || newStatus == 5) && (condition == 2 || condition == 3))
				){
					log.error('promoId', promoId);
					var searchCount = search.create({
						type : 'customrecord_itpm_kpiqueue',
						filters : [
							['custrecord_itpm_kpiq_promotion', 'is', promoNewRec.id],'and',
							['custrecord_itpm_kpiq_start','isempty',null],'and',
							['custrecord_itpm_kpiq_end','isempty',null]
							]
					}).runPaged().count;
					log.debug('searchCount', searchCount);

					if(searchCount == 0){
						var queueType = (oldStatus == 3 && newStatus == 3 && (condition == 2 || condition == 3)) ? 2 : 3;
						//Creating New KPI Queue Record
						itpm.createKPIQueue(promoId, queueType); //1.Scheduled, 2.Edited, 3.Status Changed, 4.Ad-hoc and 5.Settlement Status Changed
					}
				}
			}
		}catch(e){
			log.error(e.name, e.message);
		}
	}

	/**
	 * @param {Object} promoForm
	 * @param {Object} params customerid,promotionid,startdate,enddate
	 * @param {String} eventType (userevent type)
	 * @description add the new subtab called overlap promotions
	 */
	function addOverlapSublists(promoForm,params,eventType){
		//Adding the overlap promotions to the form
		var tab = promoForm.addTab({
			id : 'custpage_overlappromotions',
			label : 'Overlapping Promotions'
		});

		//summary sublist
		var Summarysublist = promoForm.addSublist({
			id : 'custpage_sublist_summary_overlapromotions',
			type : (eventType == 'view')?serverWidget.SublistType.INLINEEDITOR:serverWidget.SublistType.LIST,
					tab:'custpage_overlappromotions',
					label : 'Summary'
		});
		Summarysublist.addField({
			id : 'custpage_summary_overlappromo_id',
			type : serverWidget.FieldType.TEXT,
			label : 'Promotion/Deal ID'
		});
		var promoField = Summarysublist.addField({
			id : 'custpage_summary_overlappromo_promo',
			type : serverWidget.FieldType.SELECT,
			label : 'Promotion/Deal',
			source:'customrecord_itpm_promotiondeal'
		});
		Summarysublist.addField({
			id : 'custpage_summary_overlappromo_shipstart',
			type : serverWidget.FieldType.TEXT,
			label : 'Ship Start'
		});
		Summarysublist.addField({
			id : 'custpage_summary_overlappromo_shipend',
			type : serverWidget.FieldType.TEXT,
			label : 'Ship End'
		});
		Summarysublist.addField({
			id : 'custpage_summary_overlappromo_lapdays',
			type : serverWidget.FieldType.TEXT,
			label : 'Days Overlapping'
		});
		Summarysublist.addField({
			id : 'custpage_summary_overlappromo_status',
			type : serverWidget.FieldType.TEXT,
			label : 'Promotion/Deal Status'
		});
		Summarysublist.addField({
			id : 'custpage_summary_overlappromo_condition',
			type : serverWidget.FieldType.TEXT,
			label : 'Promotion/Deal Condition'
		});		
		var promotTypeField = Summarysublist.addField({
			id : 'custpage_summary_overlappromo_ptype',
			type : serverWidget.FieldType.SELECT,
			label : 'Promotion type',
			source:'customrecord_itpm_promotiontype'
		});

		// Detail sublist
		var sublist = promoForm.addSublist({
			id : 'custpage_sublist_overlapromotions',
			type : (eventType == 'view')?serverWidget.SublistType.INLINEEDITOR:serverWidget.SublistType.LIST,
					tab:'custpage_overlappromotions',
					label : 'Detail'
		});
		var itemField = sublist.addField({
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
		var promoField = sublist.addField({
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
		var promotTypeField = sublist.addField({
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

		//if event type is edit Field display type is set to INLINE
		if(eventType == 'edit'){
			itemField.updateDisplayType({
				displayType:serverWidget.FieldDisplayType.INLINE
			});
			promoField.updateDisplayType({
				displayType:serverWidget.FieldDisplayType.INLINE
			});
			promotTypeField.updateDisplayType({
				displayType:serverWidget.FieldDisplayType.INLINE
			});
		}

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

		//if estqty have items then only it going to search for the results
		if(estQtyItems.length>0){
			var i = 0,k = 0;
			log.debug('promos',getOverlappedPromos(params));

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

				//setting Summary sublist Values	
				log.debug('promoDealSearchId',promoDealSearchId);
				log.debug('start',e.getValue('custrecord_itpm_p_shipstart'));
				log.debug('end',promoDealSearchId);
				log.debug('promoDealSearchId',e.getValue('custrecord_itpm_p_shipend'));
				log.debug('days',overlappedDays.toString());
				log.debug('s',promoDealStatus);

				var oldPromoId = promoDealSearchId,newPromoid;
				var promos = []; 
				var uniques = [] ;
				search.create({
					type:'customrecord_itpm_estquantity',
					columns:['custrecord_itpm_estqty_item',
						'custrecord_itpm_estqty_qtyby',
						'custrecord_itpm_estqty_totalrate',
						'custrecord_itpm_estqty_totalpercent',
						'custrecord_itpm_estqty_promodeal'
						],
						filters:[
							['custrecord_itpm_estqty_promodeal','anyof',promoDealSearchId],'and',
							['isinactive','is',false],'and',
							['custrecord_itpm_estqty_item','anyof',estQtyItems]
							]
				}).run().each(function(estQty){
					if(oldPromoId != newPromoid){
						newPromoid = estQty.getValue('custrecord_itpm_estqty_promodeal');
						log.debug(true);
						Summarysublist.setSublistValue({
							id : 'custpage_summary_overlappromo_id',
							line : k,
							value : promoDealSearchId
						});
						Summarysublist.setSublistValue({
							id : 'custpage_summary_overlappromo_promo',
							line : k,
							value : promoDealSearchId
						});
						Summarysublist.setSublistValue({
							id : 'custpage_summary_overlappromo_shipstart',
							line : k,
							value : e.getValue('custrecord_itpm_p_shipstart')
						});
						Summarysublist.setSublistValue({
							id : 'custpage_summary_overlappromo_shipend',
							line : k,
							value : e.getValue('custrecord_itpm_p_shipend')
						});
						Summarysublist.setSublistValue({
							id : 'custpage_summary_overlappromo_lapdays',
							line : k,
							value : overlappedDays.toString()
						});
						Summarysublist.setSublistValue({
							id : 'custpage_summary_overlappromo_status',
							line : k,
							value : promoDealStatus
						});
						Summarysublist.setSublistValue({
							id : 'custpage_summary_overlappromo_condition',
							line : k,
							value : promoDealCondition
						});				
						Summarysublist.setSublistValue({
							id : 'custpage_summary_overlappromo_ptype',
							line : k,
							value : e.getValue({name:'internalid',join:'custrecord_itpm_p_type'})
						});
						k++;
					}

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
//				i++;
				return true;
			});
		}

	}

	/**
	 * @param params startdate,enddate,customer id,promotion id
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
