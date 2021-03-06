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
		'N/ui/message',
		'./iTPM_Module.js'
	],
	/**
	 * @param {serverWidget} serverWidget
	 * @param {record} record
	 * @param {runtime} runtime
	 * @param {url} url
	 * @param {search} search
	 */
	function(serverWidget, record, runtime, url, search, message, itpm) {

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
					log.debug('checkPromotypeRecActive',checkPromotypeRecActive);
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

					//'Request Settlement' and 'Resolve Deductions' Buttons
					try{
						//ALLOW SETTLEMENTS WHEN PROMOTION IS ACTIVE?
						var allowForSettlement = record.load({
							type:'customrecord_itpm_promotiontype',
							id:promoRec.getValue('custrecord_itpm_p_type')
						}).getValue('custrecord_itpm_pt_settlewhenpromoactive');

						//role based permission allow permissions (CREATE,EDIT and FULL)
						var settlementRecPermission = itpm.getUserPermission(runtime.getCurrentScript().getParameter('custscript_itpm_settlementpermissionsrec'));
						log.debug('settlementRecPermission',settlementRecPermission);
						
						var kpiAlocationCalcIsComplete = search.create({
							type: "customrecord_itpm_kpi",
							filters: [
								["custrecord_itpm_kpi_allocfactcalculated","is","F"],  "AND", 
								["custrecord_itpm_kpi_promotiondeal","anyof",promoRec.id]
								],
								columns: [ 'custrecord_itpm_kpi_promotiondeal', 'custrecord_itpm_kpi_item', 'custrecord_itpm_kpi_esttotalqty' ]
						}).run().getRange(0,10).length > 0;

						var showSettlementButton = (settlementRecPermission >= 2  && ((status == 3 && condition == 3) || (allowForSettlement && (status == 3 && condition == 2))));
						try{
							var promoTypePermission = itpm.getUserPermission(runtime.getCurrentScript().getParameter('custscriptitpm_promotypepermission'));
							var preferencesPermission = itpm.getUserPermission(runtime.getCurrentScript().getParameter('custscript_itpm_preferences_permission'));
							log.debug('preferencesPermission', preferencesPermission);
							log.debug('promoTypePermission', promoTypePermission);
							//Adjust Spend Button is available only for NS Admin and iTPM Admin
							if(showSettlementButton  && (promoTypePermission >= 3 || preferencesPermission >= 3)){
								promoForm.addButton({
									id:'custpage_newsettlementbtn',
									label:'Adjust Spend',
									functionName:'newSettlement('+promoRec.id+')'
								});
							}
						}catch(nex){
							log.error(nex.name+' For "Adjust Spend" Button',nex.message);
						}
						if(showSettlementButton && !promoRec.getValue('custrecord_itpm_promo_allocationcontrbtn') && !kpiAlocationCalcIsComplete){							
							promoForm.addButton({
								id:'custpage_bulksettlementbtn',
								label:'Resolve Deductions',
								functionName:'bulkSettlements('+promoRec.id+','+customer+')'
							});
						}
					}catch(nex){
						log.error(nex.name+' For "Resolve Deductions" Button',nex.message);
					}

					//'Refresh KPIs' Button
					try{
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

						if((status == 3 || status == 7) && condition != 1 && searchCount == 0){
							promoForm.addButton({
								id:'custpage_refresh_kpis',
								label:'Refresh KPIs',
								functionName:'refreshKPIs('+promoRec.id+')'
							});
						}
					}catch(nex){
						log.error(nex.name+' For "Refresh KPIs" button',nex.message);
					}

					//'Process Plan' Button
					try{
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
									["isinactive","is",false]
									]  
						}).run().getRange(0,1);
						promoPlanRecCount = parseFloat(promoPlanRecSearch[0].getValue({name:'internalid',summary:search.Summary.COUNT}));
						log.debug('promoPlanRecCount', promoPlanRecCount);

						//checking promotion permission
						var promoPermission = itpm.getUserPermission(runtime.getCurrentScript().getParameter('custscript_itpm_promopermissionrec'));
						log.debug('promoPermission', promoPermission);
						//checking promotionType permission
						var promoTypePermission = itpm.getUserPermission(runtime.getCurrentScript().getParameter('custscriptitpm_promotypepermission'));
						log.debug('promoTypePermission', promoTypePermission);

						var owner = promoRec.getValue('owner');
						log.debug('owner', owner);
						var user = runtime.getCurrentUser();
						log.debug('user', user.id);

						//Checking If the promotion is used/Processed in other records
						var IsPromoUsed = false;
						if(status == 3){
							var allowanceResult = [];
							search.create({
								type: "customrecord_itpm_promoallowance",
								filters: [
									["custrecord_itpm_all_promotiondeal","anyof",promoRec.id], 
									"AND", 
									["isinactive","is","F"]							                                        
									],
									columns: ["id"]
							}).run().each(function(e){
								allowanceResult.push(e.getValue({name:'id'}));							            		
								return true;
							});
							IsPromoUsed = search.create({
								type : 'customrecord_itpm_discountlogline',
								filters : ['custrecord_itpm_sline_allowance', 'anyof', allowanceResult],
								columns: ['custrecord_itpm_sline_allpromotion','custrecord_itpm_sline_allowance']

							}).run().getRange(0,10).length > 0;

							log.audit('is DLL created for Promotion '+promoRec.id, IsPromoUsed );
							IsPromoUsed = search.create({
								type : 'customtransaction_itpm_settlement',
								filters : ['custbody_itpm_set_promo', 'anyof', promoRec.id],
								columns: ['custbody_itpm_set_promo']
							}).run().getRange(0,10).length > 0;
							log.audit('is Settlement Created for Promotion '+promoRec.id, IsPromoUsed);
						}

						//Checking weather all the lines in the promotion planning is processed or not.
						var planning_processed = promoPlanningSearch(promoRec.id);
						log.debug('planning_processed',planning_processed);
						//adding Planning Complete button on promotion record if it has a promotion planning lines.
						if(
								(promoPlanRecCount > 0 && 
										promoRec.getValue('custrecord_itpm_p_ispromoplancomplete')== false && 
										(status == 1 || status == 2) && 
										(
												promoPermission == 4 || promoTypePermission >= 3 ||(promoPermission >= 2 && 
														owner == user.id && 
														(status == 1 || (status == 2 && condition == 1))))
								) &&
								!IsPromoUsed
						){
							promoForm.addButton({
								id:'custpage_planning_completed',
								label:'Process Plan',
								functionName:'planningComplete('+promoRec.id+','+planning_processed+')'
							});
						}
					}catch(nex){
						log.error(nex.name+' For "Process Plan" button',nex.message);
					}

					//Show message while the after the promotion is being saved & copy is in progess.
					var copyInProgress = promoRec.getValue('custrecord_itpm_p_copyinprogress');
					var copyRelatedRecords = promoRec.getValue('custrecord_itpm_p_copy');
					if(copyInProgress && copyRelatedRecords){
						var msgText = message.create({
							title: "Copy is in progress", 
							message: "This Promotion is queued for copying and cannot be edited until the linked records (Allowances, Estimated Quantities, and Retail Info) are copied over from the original promotion, Please be patient.",
							type: message.Type.INFORMATION
						});
						scriptContext.form.addPageInitMessage({message: msgText});
					
					}

					//Showing banner message to users on the promotion which used to copy promotion, and show up-to completion of the copy process
					var copyProcess,childRecCopyProcess;
					var isThisUsedForCopy = search.create({
						type	: 'customrecord_itpm_promotiondeal',
						columns : ['custrecord_itpm_p_copyinprogress', 'custrecord_itpm_p_copy'],
						filters : [["custrecord_itpm_p_copiedfrom","anyof",promoRec.id]]
					});

					isThisUsedForCopy.run().each(function(result){
						if(result.getValue('custrecord_itpm_p_copyinprogress') && result.getValue('custrecord_itpm_p_copy')){
							copyProcess = result.getValue('custrecord_itpm_p_copyinprogress');
							childRecCopyProcess = result.getValue('custrecord_itpm_p_copy');
						}
						return true;
					});

					// Show Message on the Original Promotion form where the promotion is being copied.
					if(copyProcess && childRecCopyProcess){
						var msgText = message.create({
							title: "Please Do NOT edit this promotion.", 
							message: "To prevent errors, please don't edit this promotion until completion of the copy process. "+
							"This promotion is being used to create one or more new promotions. <br>"+
							"You can still make more copies of this promotion while the copy is in process.",
							type: message.Type.WARNING
						});
						scriptContext.form.addPageInitMessage({message: msgText});

					}

					//after Planning Completed showing the progress message while batch process running(newly copied promotion)
					var promoPlaningProgress = promoRec.getValue('custrecord_itpm_p_ispromoplancomplete');

					if(promoPlaningProgress){
						var msgText = message.create({
							title: "Please wait...", 
							message: "Please wait while your planned allowances, estimated quantities, and retail information is processed "+
							"and made available under the subtabs by the same name. Please wait for processing to complete. "+ 
							"Any allowances by item groups will be expanded to the associated items.",
							type: message.Type.INFORMATION
						});
						scriptContext.form.addPageInitMessage({message: msgText});

					}
					promoForm.clientScriptModulePath = './iTPM_Attach_Promotion_ClientMethods.js';
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
			log.debug('promoOldRec',promoOldRec.getValue('sublists'));
			log.debug('promoNewRec',promoNewRec);
			log.debug('type',eventType+''+scriptContext.newRecord.id+''+scriptContext.oldRecord.id);

			var oldStatus = promoOldRec.getValue('custrecord_itpm_p_status');
			var newStatus = promoNewRec.getValue('custrecord_itpm_p_status');
			var condition = promoNewRec.getValue('custrecord_itpm_p_condition');
			var promoId = promoNewRec.id;
			if(eventType == 'edit' || eventType == 'create'){

				//search lookup for getting the account value from promotion
				var promoLookup = search.lookupFields({
					type:'customrecord_itpm_promotiondeal',
					id: promoId,
					columns: ['custrecord_itpm_p_allaccount']
				});			
				log.debug('fieldLookUp',promoLookup.custrecord_itpm_p_allaccount[0].value);
				var account = promoLookup.custrecord_itpm_p_allaccount[0].value;

				//search for promotion planning records which are linked with promotion and updating account value.
				var promoplanningSearchObj = search.create({
					type:'customrecord_itpm_promotion_planning',
					columns:['internalid'],
					filters:['custrecord_itpm_pp_promotion','anyof',promoId]
				}).run().each(function(e){
					log.debug('a',e.getValue('internalid'));
					var id = record.submitFields({
						type: 'customrecord_itpm_promotion_planning',
						id: e.getValue('internalid'),
						values: {
							'custrecord_itpm_pp_account': account
						},
						options: {
							enableSourcing: true,
							ignoreMandatoryFields : true
						}
					});
					return true;
				});
			}

			if(eventType == 'edit'){
				log.debug('oldStatus', oldStatus);
				log.debug('newStatus', newStatus);
				log.debug('condition', condition);
				if(
						(oldStatus == 3 && newStatus == 3 && (condition == 2 || condition == 3)) || 
						(oldStatus == 2 && newStatus == 3 && (condition == 2 || condition == 3)) || 
						(oldStatus == 7 && newStatus == 3 && (condition == 2 || condition == 3)) ||
						(oldStatus == 3 && (newStatus == 7 || newStatus == 5) && (condition == 2 || condition == 3))
				){
					log.debug('promoId', promoId);
					var queueType = (oldStatus == 3 && newStatus == 3 && (condition == 2 || condition == 3)) ? 2 : 3;
					//Creating New KPI Queue Record
					itpm.createKPIQueue(promoId, queueType); //1.Scheduled, 2.Edited, 3.Status Changed, 4.Ad-hoc and 5.Settlement Status Changed
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
					label : 'Promotions'
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
					label : 'Allowances'
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

		//	Setting the Promotions sublist values
		var k= 0;
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
			return true;
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
		var uniquepromos = [];


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

			//setting PromotionsSublist  Values	
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

			log.debug('promoDealSearchId',promoDealSearchId);
			log.debug('start',e.getValue('custrecord_itpm_p_shipstart'));
			log.debug('end',promoDealSearchId);
			log.debug('promoDealSearchId',e.getValue('custrecord_itpm_p_shipend'));
			log.debug('days',overlappedDays.toString());
			log.debug('promoDealStatus',promoDealStatus);

			var promos = []; 
			//if estqty have items then only it going to search for the results
			if(estQtyItems.length>0){
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

					//Setting Allowances Sublist Values
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
			}
			return true;
		});
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
					[['custrecord_itpm_p_shipstart','onorbefore', params.start],'and',
						['custrecord_itpm_p_shipend','onorafter', params.end]],'or',
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

	/**
	 * @param params promoId, promoForm
	 * @return {Object} search object.
	 * @description search from planning processing records.
	 */
	function promoPlanningSearch(promoId){
		try{
			var ppSearch = search.create({
				type:'customrecord_itpm_promotion_planning',
				columns:['internalid','custrecord_itpm_pp_processed'],
				filters:[['custrecord_itpm_pp_promotion','anyof',promoId],'and',['custrecord_itpm_pp_processed','is',false]]		    		
			});
			return !(ppSearch.run().getRange(0,2).length > 0);
		}catch(ex){
			log.debug(ex.name,ex.message);
			log.error(ex.name,ex.message);
			log.audit(ex.name,ex.message);
		}
	}

	return {
		beforeLoad: beforeLoad,
		afterSubmit: afterSubmit
	};

});


