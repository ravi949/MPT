/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/render',
        'N/search',
        'N/runtime',
        'N/file',
        'N/record',
        'N/util',
        'N/ui/serverWidget',
        './iTPM_Module.js'
        ],

function(render, search, runtime, file, record, util, serverWidget, itpm) {
   
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
			
			var scriptObj = runtime.getCurrentScript();  
			var request = context.request;
			var response = context.response;
			var params = request.parameters;
			
			if(context.request.method == "GET"){
				var form = serverWidget.createForm({
					title:'iTPM Calendar Report'
				});

				var calendarRecLookup = getCalendarValues(params.cid);

				//adding the iTPM Calendar record fields
				var calendarFieldGroup = form.addFieldGroup({
					id : 'custpage_itpm_cal_fields',
					label : 'Primary Information'
				});
				calendarFieldGroup.isBorderHidden = true;
				var htmlFieldGroup = form.addFieldGroup({
					id : 'custpage_itpm_cal_view',
					label : 'Calendar View'
				});
				htmlFieldGroup.isBorderHidden = true;

				form.addField({
					id : 'custpage_itpm_cal_mainname',
					type : serverWidget.FieldType.TEXT,
					label : 'ID',
					container:'custpage_itpm_cal_fields'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).defaultValue = calendarRecLookup['name'];

				form.addField({
					id : 'custpage_itpm_cal_name',
					type : serverWidget.FieldType.TEXT,
					label : 'Name',
					container:'custpage_itpm_cal_fields'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).defaultValue = calendarRecLookup['altname'];

				form.addField({
					id : 'custpage_itpm_cal_stdate',
					type : serverWidget.FieldType.TEXT,
					label : 'Start Date',
					container:'custpage_itpm_cal_fields'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).defaultValue = calendarRecLookup['custrecord_itpm_cal_startdate'];

				form.addField({
					id : 'custpage_itpm_cal_enddate',
					type : serverWidget.FieldType.TEXT,
					label : 'End Date',
					container:'custpage_itpm_cal_fields'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				}).defaultValue = calendarRecLookup['custrecord_itpm_cal_enddate'];

				var calendarIDField = form.addField({
					id : 'custpage_itpm_cal_id',
					type : serverWidget.FieldType.TEXT,
					label : 'Calendar Record ID',
					container:'custpage_itpm_cal_fields'
				}).updateDisplayType({
					displayType : serverWidget.FieldDisplayType.INLINE
				})
				calendarIDField.defaultValue = params.cid;
				calendarIDField.updateDisplayType({
					displayType : serverWidget.FieldDisplayType.HIDDEN
				});

				//getting the user role iTPM Calendar permission and Export Lists permission
				var calendarRecPermission = itpm.getUserPermission(params.rectype);
				var exportListPermission = runtime.getCurrentUser().getPermission('LIST_EXPORT');
				if(calendarRecPermission >= 1 && exportListPermission >= 1){
					form.addSubmitButton({
						label:'Export CSV'
					});
				}

				//Getting the Jquery library file path
				var iTPM_Jquery = search.create({
					type:search.Type.FOLDER,
					columns:[search.createColumn({
						name: "internalid",
						join: "file"
					}),search.createColumn({
						name: "url",
						join: "file"
					})],
					filters:[["file.name","is","iTPM_Jquery.min.js"]]
				}).run().getRange(0,1)[0].getValue({name:'url',join:'file'});

				//Getting the Angular library file path
				var iTPM_Angular = search.create({
					type:search.Type.FOLDER,
					columns:[search.createColumn({
						name: "internalid",
						join: "file"
					}),search.createColumn({
						name: "url",
						join: "file"
					})],
					filters:[["file.name","is","iTPM_Angular.min.js"]]
				}).run().getRange(0,1)[0].getValue({name:'url',join:'file'});

				//Getting the Angular bootstrap library file path
				var iTPM_Angular_Bootstrap = search.create({
					type:search.Type.FOLDER,
					columns:[search.createColumn({
						name: "internalid",
						join: "file"
					}),search.createColumn({
						name: "url",
						join: "file"
					})],
					filters:[["file.name","is","iTPM_Angular_Bootstrap.min.js"]]
				}).run().getRange(0,1)[0].getValue({name:'url',join:'file'});

				//Getting the Angular bootstrap tpls library file path
				var iTPM_Angular_Bootstrap_tpls = search.create({
					type:search.Type.FOLDER,
					columns:[search.createColumn({
						name: "internalid",
						join: "file"
					}),search.createColumn({
						name: "url",
						join: "file"
					})],
					filters:[["file.name","is","iTPM_Angular_Bootstrap_tpls.min.js"]]
				}).run().getRange(0,1)[0].getValue({name:'url',join:'file'});

				//Getting the Angular draggable library file path
				var iTPM_Angular_Draggable = search.create({
					type:search.Type.FOLDER,
					columns:[search.createColumn({
						name: "internalid",
						join: "file"
					}),search.createColumn({
						name: "url",
						join: "file"
					})],
					filters:[["file.name","is","iTPM_Angular_Draggable.min.js"]]
				}).run().getRange(0,1)[0].getValue({name:'url',join:'file'});

				//Getting the template html file id
				var htmlTemplateId = search.create({
					type:search.Type.FOLDER,
					columns:[search.createColumn({
						name: "internalid",
						join: "file"
					}),search.createColumn({
						name: "url",
						join: "file"
					})],
					filters:[["file.name","is","iTPM_HTML_CalendarReport_Source.html"]]
				}).run().getRange(0,1)[0].getValue({name:'internalid',join:'file'});;
				var templateFileId = htmlTemplateId;
				log.debug('templateFileId: ', templateFileId);

				//Loading template file
				var templateFile = file.load({
					id : templateFileId
				});

				var renderer = render.create();
				var xmlOutput = null;

				var promoRecTypeId = scriptObj.getParameter({name: 'custscript_itpm_promotype_recordtypeid'})

				var dataObj = getPromotionData('GET', calendarRecLookup, promoRecTypeId, params.index);    			

				//Adding the custom data source to the html file content
				renderer.addCustomDataSource({
					format: render.DataSource.JSON,
					alias: 'urlObj',
					data: '{"itpm_jquery":'+JSON.stringify(iTPM_Jquery)+',"itpm_angular":'+JSON.stringify(iTPM_Angular)+',"itpm_angular_bootstrap":'+JSON.stringify(iTPM_Angular_Bootstrap)+',"itpm_angular_bootstrap_tpls":'+JSON.stringify(iTPM_Angular_Bootstrap_tpls)+',"itpm_angular_draggable":'+JSON.stringify(iTPM_Angular_Draggable)+'}'
				});

				renderer.addCustomDataSource({
					format: render.DataSource.OBJECT,
					alias: 'monthObj',
					data: {name:'months', list:JSON.stringify(dataObj.arrOfMonths)}
				});

				renderer.addCustomDataSource({
					format: render.DataSource.OBJECT,
					alias: 'weeks',
					data: {name:'list',list:JSON.stringify(dataObj.sundaysList)}
				});

				renderer.addCustomDataSource({
					format: render.DataSource.OBJECT,
					alias: 'promotionData',
					data: {name : 'list', list : JSON.stringify(dataObj.finalResults) }
				});
				
				renderer.addCustomDataSource({
					format: render.DataSource.OBJECT,
					alias: 'pageRanges',
					data: {name : 'list', list : JSON.stringify(dataObj.totalPages) }
				});

				renderer.templateContent = templateFile.getContents();

				xmlOutput = renderer.renderAsString();

				if (!(xmlOutput) || xmlOutput === null) throw {name: 'xmlOutput', message:'No output from template renderer.'};

				log.debug('Available Usage', runtime.getCurrentScript().getRemainingUsage());

				context.response.write(xmlOutput);
				form.addField({
					id : 'custpage_itpm_test',
					type : serverWidget.FieldType.INLINEHTML,
					label : 'iTPM Report',
					container:'custpage_itpm_cal_view'
				}).defaultValue = xmlOutput;
				context.response.writePage(form);
				
			}else if(request.method == "POST"){
				
				var cid = params['custpage_itpm_cal_id'];
				var calendarLookupFields = getCalendarValues(cid);
//				var promoData = getPromotionData(calendarLookupFields, undefined);
				log.debug('cid',calendarLookupFields);

				var dataObj = getPromotionData('POST', calendarLookupFields, undefined, undefined);
				var promoData = dataObj.finalResults;
				var fileOutput = "Customer,Item,Promotion type,Promotion,Id,Start ship,End ship,UOM,MOP,%,Rate";

				//setting the months with weeks columns csv
				dataObj.arrOfMonths.forEach(function(m){
					if(m.startMonth <= m.id && m.id <= m.endMonth){
						dataObj.sundaysList.forEach(function(e){
							if(m.year == e.year && m.id == e.month){
								fileOutput += ","+m.year+"-"+m.name+"-"+e.date
							}
						});
					}
				});

				//adding the data into csv table columns
				promoData.forEach(function(promo){
					fileOutput += "\n\""+promo.entity+"\","+promo.item+",\""+promo.promo_type+"\",\""+promo.promo_desc+"\",\""+promo.promo_id+"\","+promo.ship_startdate+","+promo.ship_enddate+","+promo.uom+","+promo.mop+","+promo.percent_peruom+","+promo.rate_peruom+",";
					dataObj.sundaysList.forEach(function(e){
						if(e.startMonth <= e.month && e.month <= e.endMonth){
							if(promo.syear == promo.eyear){
								if(promo.syear == e.year && promo.sweek <= e.week && e.week <= promo.eweek){
									fileOutput += promo.promo_status.text+",";
								}else{
									fileOutput += ",";
								}
							}else if(promo.syear != promo.eyear){
								if(e.year == promo.syear && promo.sweek <= e.week){
									fileOutput += promo.promo_status.text+",";
								}else if(e.year == promo.eyear && e.week <= promo.eweek){
									fileOutput += promo.promo_status.text+",";
								}else{
									fileOutput += ",";
								}
							}else{
								fileOutput += ",";
							}
						}
					});
				});

				response.setHeader({
					name: 'Content-Type',
					value: 'text/csv',
				});
				response.setHeader({
					name:'Content-Disposition',
					value:'inline; filename ='+calendarLookupFields["name"]+'.csv'
				});
				log.debug('download csv usage', scriptObj.getRemainingUsage());
				response.write({
					output:fileOutput
				});
			}
		}catch(e){
			log.debug(e.name, e.message);
			log.debug('Available Usage:', scriptObj.getRemainingUsage());
			throw e;
		}
	}

    /**
     * @param {Number} cid
     * @return {Array} search Result
     */
    function getCalendarValues(cid){
    	return search.lookupFields({
			type:'customrecord_itpm_calendar',
			id:cid,
			columns:['name',
			         'altname',
			         'custrecord_itpm_cal_customer',
			         'custrecord_itpm_cal_allcustomers',
			         'custrecord_itpm_cal_items',
			         'custrecord_itpm_cal_allitems',
			         'custrecord_itpm_cal_itemgroups',
			         'custrecord_itpm_cal_startdate',
			         'custrecord_itpm_cal_enddate',
			         'custrecord_itpm_cal_promotiontypes',
			         'custrecord_itpm_cal_allpromotiontypes',
			         'custrecord_itpm_cal_promotionstatus']
		});
    }
    
    /**
     * @param {Object} calendarRecLookup
     * @param {Number} promoRecTypeId
     * @return {Object} finalResults
     */
    function getPromotionData(method, calendarRecLookup, promoRecTypeId, index){
    	try{
    		var finalResults = [];
    		var arrOfMonths = [{id:0,name:"Jan"},
				                 {id:1,name:"Feb"},
				                 {id:2,name:"Mar"},
				                 {id:3,name:"Apr"},
				                 {id:4,name:"May"},
				                 {id:5,name:"Jun"},
				                 {id:6,name:"Jul"},
				                 {id:7,name:"Aug"},
				                 {id:8,name:"Sept"},
				                 {id:9,name:"Oct"},
				                 {id:10,name:"Nov"},
				                 {id:11,name:"Dec"}];
    		
    		var startdate = calendarRecLookup['custrecord_itpm_cal_startdate'];
			var enddate = calendarRecLookup['custrecord_itpm_cal_enddate'];
			var allCustomersChecked = calendarRecLookup['custrecord_itpm_cal_allcustomers'];
			var allItemsChecked =  calendarRecLookup['custrecord_itpm_cal_allitems'];
			var allPromoTypesChecked = calendarRecLookup['custrecord_itpm_cal_allpromotiontypes'];
			var promoStatus = calendarRecLookup['custrecord_itpm_cal_promotionstatus'].map(function(e){return e.value});
			var itemGroups = calendarRecLookup['custrecord_itpm_cal_itemgroups'].map(function(e){return e.value});
			
			var calStartDateObj = new Date(calendarRecLookup['custrecord_itpm_cal_startdate']),
			calEndDateObj = new Date(calendarRecLookup['custrecord_itpm_cal_enddate']);
			var startDateYear = calStartDateObj.getFullYear(),
			endDateYear = calEndDateObj.getFullYear();
			var startMonth = calStartDateObj.getMonth(),
			endMonth = calEndDateObj.getMonth();
			var startWeek = calStartDateObj.getWeek(),
			endWeek = calEndDateObj.getWeek();

			var sundaysList = getSundays(startDateYear, startMonth, (startDateYear != endDateYear)?11:endMonth);
			arrOfMonths = arrOfMonths.map(function(e){ e.startMonth = startMonth;e.endMonth = (startDateYear != endDateYear)?11:endMonth;e.year = startDateYear;return e });

			if(startDateYear != endDateYear){
				arrOfMonths = arrOfMonths.concat(arrOfMonths.slice().map(function(e){ e = util.extend({}, e);e.startMonth = 0;e.endMonth = endMonth;e.year = endDateYear;return e }));
				sundaysList = sundaysList.concat(getSundays(endDateYear, 0, endMonth));
			}
			
			log.audit('itemgroups',itemGroups);
			
			/*promotion filters(to show overlapped and active promotions)*/
			var promotionFilters = [
			    ["custrecord_itpm_p_status","anyof",promoStatus], 
			    "AND", 
			    [
			     [["custrecord_itpm_p_shipstart","onorbefore",startdate],"AND",["custrecord_itpm_p_shipend","onorafter",enddate]],"OR",
			     [["custrecord_itpm_p_shipstart","within",startdate,enddate],"OR",["custrecord_itpm_p_shipend","within",startdate,enddate]]
			    ]
			];
			
			//If all customers checkbox not checked
			if(!allCustomersChecked){
				var customers = calendarRecLookup['custrecord_itpm_cal_customer'].map(function(e){return e.value});
				promotionFilters.push("AND",["custrecord_itpm_p_customer","anyof",customers]);
			}
			
			//If all item checkbox not checked
			if(!allItemsChecked){
				var items =  calendarRecLookup['custrecord_itpm_cal_items'].map(function(e){return e.value});
				if(items.length <= 0){
					search.create({
						type:search.Type.ITEM_GROUP,
						columns:['memberitem'],
						filters:[['internalid','anyof',itemGroups]]
					}).run().each(function(memberobj){
						items.push(memberobj.getValue('memberitem'));
						return true;
					});
				}
				log.debug('item',items);
				promotionFilters.push("AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_all_item","anyof",items]);
			}
			
			//If all promotion types checkbox not checked
			if(!allPromoTypesChecked){
				log.audit('promotion values', calendarRecLookup['custrecord_itpm_cal_promotiontypes']);
				var promoTypes = calendarRecLookup['custrecord_itpm_cal_promotiontypes'];
				promoTypes = (promoTypes.length == undefined)?promoTypes.value.split(",") : promoTypes.map(function(e){return e.value});
				promotionFilters.push("AND",["custrecord_itpm_p_type","anyof",promoTypes]);
			}
			
    		//Searching the allowances records based on some record filters
    		var promoSearchObj = search.create({
    			   type: "customrecord_itpm_promotiondeal",
    			   filters: promotionFilters,
    			   columns: [
    			      search.createColumn({
    			         name: "custrecord_itpm_p_customer",
    			         sort: search.Sort.ASC
    			      }),
    			      search.createColumn({
     			         name: "custrecord_itpm_p_shipstart",
     			         sort: search.Sort.ASC
     			      }),
     			      search.createColumn({
     			         name: "internalid",
     			         sort: search.Sort.ASC
     			      }),
     			      search.createColumn({
     			         name: "custrecord_itpm_all_item",
     			         join:"custrecord_itpm_all_promotiondeal",
     			         sort: search.Sort.ASC
     			      }),
     			      search.createColumn({
     			         name: "custrecord_itpm_all_mop",
     			         join:"custrecord_itpm_all_promotiondeal",
     			         sort: search.Sort.DESC
     			      }),
    			      "name",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_percentperuom",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_rateperuom",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_uom",
    			      "custrecord_itpm_p_description",
    			      "custrecord_itpm_p_status",
    			      "custrecord_itpm_p_type",
    			      "custrecord_itpm_p_shipend"
    			   ]
    			});
    		
//    			var searchResultCount = promoSearchObj.runPaged().count;
//    			log.error("promoSearchObj result count",searchResultCount);
    		
    			var pagedData = promoSearchObj.runPaged({pageSize:30});
    			var totalResultCount = pagedData.count;
    			var numberOfPages = pagedData.pageRanges.length;
    			var status, pages = [], listOfPages = [];
    			
    			//creating the new array for pagination list
    			for(var i = 0;i < numberOfPages;i++){
					var paginationTextEnd = (totalResultCount >= (i*30)+30)?((i * 30)+30):totalResultCount;
					listOfPages.push({
						index: pagedData.pageRanges[i].index,
						label: ((i*30)+1)+' to '+paginationTextEnd+' of '+totalResultCount
					});
				}
    			
    			//if method is GET we are setting pages as one array of element otherwise pages will contain full pageRanges
    			if(method == 'GET'){
    				pages = [{index:index}];
    			}else{
    				pages = pagedData.pageRanges;
    			}
    			
    			pages.forEach(function(value){
    				pagedData.fetch({index:value.index}).data.forEach(function(result){
        				status = result.getValue({ name:'custrecord_itpm_p_status' });
        				if(status == 1){
        					status = {text:'Draft',cls:'status-orange'};
        				}else if(status == 2){
        					status = {text:'Pending Approval',cls:'status-yellow'};
        				}else if(status == 3){
        					status = {text:'Approved',cls:'status-green'};
        				}else if(status == 4 || status == 5){
        					status = {text:(status)?'Rejected':'Voided',cls:'status-red'};
        				}else if(status == 7){
        					status = {text:'Closed',cls:'status-blue'};
        				}
        				
        				//this condition for to add the statuses in for promotion which are active in between the calendar start and end dates
        				var isPromoEndDateYearGreaterThanCalEndDate = parseInt(new Date(result.getValue({ name: 'custrecord_itpm_p_shipend' })).getFullYear()) > parseInt(endDateYear);
        				var isPromoStartDateYearLessThanCalStartDate = parseInt(new Date(result.getValue({ name: 'custrecord_itpm_p_shipstart' })).getFullYear()) < parseInt(startDateYear);
        				
        		        finalResults.push({
        		        	promo_desc	  : result.getValue({ name: 'name'}),
        	    		    promo_id	  : result.getValue({ name:'internalid' }),
        	    		    promo_status  : status,
        		        	promo_type	  : result.getText({ name: 'custrecord_itpm_p_type'}),
        		        	promo_rec_type: promoRecTypeId,
        	    		    ship_startdate: result.getValue({ name: 'custrecord_itpm_p_shipstart' }),
        	    		    ship_enddate  : result.getValue({ name: 'custrecord_itpm_p_shipend' }),
        		        	entity 		  : result.getText({ name: 'custrecord_itpm_p_customer' }),
        	    		    item   		  : result.getText({ name: 'custrecord_itpm_all_item', join:'custrecord_itpm_all_promotiondeal' }),
        	    		    item_desc	  : result.getText({ name:'custrecord_itpm_all_item', join:'custrecord_itpm_all_promotiondeal' }),
        	    		    rate_peruom	  : result.getValue({ name:'custrecord_itpm_all_rateperuom', join:'custrecord_itpm_all_promotiondeal' }),
        	    		    percent_peruom: result.getValue({ name:'custrecord_itpm_all_percentperuom', join:'custrecord_itpm_all_promotiondeal' }),
        	    		    uom			  : result.getText({ name:'custrecord_itpm_all_uom', join:'custrecord_itpm_all_promotiondeal' }),
        	    		    mop           : result.getText({ name:'custrecord_itpm_all_mop', join:'custrecord_itpm_all_promotiondeal' }),
        	    		    sweek 		  : (isPromoStartDateYearLessThanCalStartDate)? 0 : new Date(result.getValue({ name: 'custrecord_itpm_p_shipstart' })).getWeek(),
        	    		    eweek 		  : (isPromoEndDateYearGreaterThanCalEndDate)? 55 : new Date(result.getValue({ name: 'custrecord_itpm_p_shipend' })).getWeek(),
        	    		    smonth 		  : (isPromoStartDateYearLessThanCalStartDate)? startMonth : new Date(result.getValue({ name: 'custrecord_itpm_p_shipstart' })).getMonth(),
        	    		    emonth 		  : (isPromoEndDateYearGreaterThanCalEndDate)? endMonth : new Date(result.getValue({ name: 'custrecord_itpm_p_shipend' })).getMonth(),
        	    		    syear		  : new Date(result.getValue({ name: 'custrecord_itpm_p_shipstart' })).getFullYear(),
        	    		    eyear		  : (isPromoEndDateYearGreaterThanCalEndDate)? endDateYear : new Date(result.getValue({ name: 'custrecord_itpm_p_shipend' })).getFullYear()
        		        });
        			});
    			});
    			
    		return {
    			finalResults: finalResults, 
    			arrOfMonths: arrOfMonths,
    			sundaysList: sundaysList,
    			totalPages: listOfPages
    		};
    	}catch(e){
    		log.debug(e.name, e.message);
    		throw e;
    	}
    }
    
    Date.prototype.getWeek = function() { 
    	var onejan = new Date(this.getFullYear(),0,1); 
    	var today = new Date(this.getFullYear(),this.getMonth(),this.getDate()); 
    	var dayOfYear = ((today - onejan + 86400000)/86400000); 
    	return Math.ceil(dayOfYear/7); 
    }
    

	
    function getSundays(y, startMonth, endMonth) {
    	var week = 1;
    	y = y || new Date().getFullYear();
    	var A = [];
    	var D = new Date(y, 0, 1)
    	var day = D.getDay();
    	if (day != 0) D.setDate(D.getDate() + (7 - day));
    	A[0] = { month: 0, week: week, date: D.getDate(), startMonth:startMonth, endMonth:endMonth, year:y, count: 0};
    	var prevMonth;
    	while (D) {
    		prevMonth = D.getMonth();
    		week = week+1;
    		D.setDate(D.getDate() + 7);
    		if (D.getFullYear() != y) return A;
    		A.push({ month: D.getMonth(), week: week, date: D.getDate(), startMonth:startMonth, endMonth:endMonth, year: y, count: 0 });
    	}
    	
    	return A;
    }
    
    return {
        onRequest: onRequest
    };
    
});