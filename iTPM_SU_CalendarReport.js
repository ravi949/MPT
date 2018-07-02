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
        'N/ui/serverWidget'],

function(render, search, runtime, file, record, serverWidget) {
   
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
    		
    		var form = serverWidget.createForm({
        		title:'iTPM Calendar Report'
        	});
        	
    		var scriptObj = runtime.getCurrentScript();  
    		
    		var request = context.request;
			var response = context.response;
			var params = request.parameters;
			
    		if(request.method == 'GET'){
    			
    			var calendarRecLookup = search.lookupFields({
    				type:'customrecord_itpm_calendar',
    				id:params.cid,
    				columns:['custrecord_itpm_cal_customer',
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
    			
    			//adding the iTPM Calendar record fields
//    			form.addField({
//    				id : 'custpage_itpm_calid',
//    				type : serverWidget.FieldType.TEXT,
//    				label : 'Name'
//    			}).defaultValue = 
//    			form.addField({
//    				id : 'custpage_itpm_cal_custname',
//    				type : serverWidget.FieldType.TEXT,
//    				label : 'Customer Name'
//    			}).defaultValue = 
//    			form.addField({
//    				id : 'custpage_itpm_cal_stdate',
//    				type : serverWidget.FieldType.TEXT,
//    				label : 'Start Date'
//    			}).defaultValue = calendarRecLookup['custrecord_itpm_cal_startdate'];
//    			form.addField({
//    				id : 'custpage_itpm_cal_enddate',
//    				type : serverWidget.FieldType.TEXT,
//    				label : 'End Date'
//    			}).defaultValue = calendarRecLookup['custrecord_itpm_cal_enddate'];
    			
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
    			var sundaysList = getSundays();
        		var promoRecTypeId = record.create({
        			type:'customrecord_itpm_promotiondeal'
        		}).getValue('rectype');
    			var promoData = getPromotionData(calendarRecLookup, promoRecTypeId);
    			
    			//Adding the custom data source to the html file content
    			renderer.addCustomDataSource({
    				format: render.DataSource.JSON,
    				alias: 'urlObj',
    				data: '{"itpm_jquery":'+JSON.stringify(iTPM_Jquery)+',"itpm_angular":'+JSON.stringify(iTPM_Angular)+',"itpm_angular_bootstrap":'+JSON.stringify(iTPM_Angular_Bootstrap)+',"itpm_angular_bootstrap_tpls":'+JSON.stringify(iTPM_Angular_Bootstrap_tpls)+',"itpm_angular_draggable":'+JSON.stringify(iTPM_Angular_Draggable)+'}'
    			});
    			log.audit('dateobj','{"startMonth":'+JSON.stringify(calendarRecLookup["custrecord_itpm_cal_startdate"])+',"endMonth":'+JSON.stringify(calendarRecLookup["custrecord_itpm_cal_enddate"])+'}');
    			var startMonth = new Date(calendarRecLookup["custrecord_itpm_cal_startdate"]).getMonth();
    			var endMonth = new Date(calendarRecLookup["custrecord_itpm_cal_enddate"]).getMonth();
    			renderer.addCustomDataSource({
    				format: render.DataSource.JSON,
    				alias: 'datesObj',
    				data: '{"startMonth":'+JSON.stringify(startMonth)+',"endMonth":'+JSON.stringify(endMonth)+'}'
    			});
    			
    			renderer.addCustomDataSource({
    			    format: render.DataSource.OBJECT,
    			    alias: 'weeks',
    			    data: {name:'list',list:JSON.stringify(sundaysList)}
    			});
    			
    			renderer.addCustomDataSource({
    			    format: render.DataSource.OBJECT,
    			    alias: 'promotionData',
    			    data: {name : 'list', list : JSON.stringify(promoData) }
    			});
    			
    			renderer.templateContent = templateFile.getContents();
    			
    			xmlOutput = renderer.renderAsString();
    			
    			if (!(xmlOutput) || xmlOutput === null) throw {name: 'xmlOutput', message:'No output from template renderer.'};
    			
    			log.debug('Available Usage', runtime.getCurrentScript().getRemainingUsage());
    			
    			context.response.write(xmlOutput);
    			form.addField({
    	    		 id : 'custpage_itpm_test',
    	    		 type : serverWidget.FieldType.INLINEHTML,
    	    		 label : 'iTPM Report'
    	    	}).defaultValue = xmlOutput;
    			context.response.writePage(form);
    		}
		}catch(e){
			log.debug(e.name, e.message);
			log.debug('Available Usage:', runtime.getCurrentScript().getRemainingUsage());
			throw e;
		}
    }

    
    /**
     * @param {Object} calendarRecLookup
     * @param {Number} promoRecTypeId
     * @return {Object} finalResults
     */
    function getPromotionData(calendarRecLookup, promoRecTypeId){
    	try{
    		var finalResults = [];
    		
    		var startdate = calendarRecLookup['custrecord_itpm_cal_startdate'];
			var enddate = calendarRecLookup['custrecord_itpm_cal_enddate'];
			var allCustomersChecked = calendarRecLookup['custrecord_itpm_cal_allcustomers'];
			var allItemsChecked =  calendarRecLookup['custrecord_itpm_cal_allitems'];
			var allPromoTypesChecked = calendarRecLookup['custrecord_itpm_cal_allpromotiontypes'];
			var promoStatus = calendarRecLookup['custrecord_itpm_cal_promotionstatus'].map(function(e){return e.value});
			var itemGroups = calendarRecLookup['custrecord_itpm_cal_itemgroups'].map(function(e){return e.value});
			
			log.audit('itemgroups',itemGroups);
			
			var promotionFilters = [
			                          ["custrecord_itpm_p_status","anyof",promoStatus], 
				      			      "AND", 
				    			      ["custrecord_itpm_p_shipstart","onorafter",startdate], 
				    			      "AND", 
				    			      ["custrecord_itpm_p_shipend","onorbefore",enddate]
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
    			      "internalid",
    			      search.createColumn({
    			         name: "custrecord_itpm_p_customer",
    			         sort: search.Sort.ASC,
    			         label: "Name"
    			      }),
    			      "name",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_percentperuom",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_rateperuom",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_item",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_uom",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_mop",
    			      "custrecord_itpm_p_description",
    			      "custrecord_itpm_p_status",
    			      "custrecord_itpm_p_type",
    			      "custrecord_itpm_p_shipstart",
    			      "custrecord_itpm_p_shipend"
    			   ]
    			});
//    			var searchResultCount = promoSearchObj.runPaged().count;
//    			log.debug("promoSearchObj result count",searchResultCount);
    			var status;
    			promoSearchObj.run().each(function(result){
    				status = result.getValue({ name:'custrecord_itpm_p_status' });
    				if(status == 1){
    					status = 'status-orange';
    				}else if(status == 2){
    					status = 'status-yellow';
    				}else if(status == 3){
    					status = 'status-green';
    				}else if(status == 4 || status == 5){
    					status = 'status-red';
    				}else if(status == 7){
    					status = 'status-blue';
    				}
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
    	    		    sweek 		  : new Date(result.getValue({ name: 'custrecord_itpm_p_shipstart' })).getWeek(),
    	    		    eweek 		  : new Date(result.getValue({ name: 'custrecord_itpm_p_shipend' })).getWeek(),
    	    		    smonth 		  : new Date(result.getValue({ name: 'custrecord_itpm_p_shipstart' })).getMonth(),
    	    		    emonth 		  : new Date(result.getValue({ name: 'custrecord_itpm_p_shipend' })).getMonth()
    		        });
    			   return true;
    			});
    		
    		return finalResults;
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
    

	var week = 1;
    function getSundays(y) {
    	y = y || new Date().getFullYear();
    	var A = [];
    	var D = new Date(y, 0, 1)
    	var day = D.getDay();
    	if (day != 0) D.setDate(D.getDate() + (7 - day));
    	A[0] = { month: 0, week: week, date: D.getDate(), count: 0};
    	var prevMonth;
    	while (D) {
    		prevMonth = D.getMonth();
    		week = week+1;
    		D.setDate(D.getDate() + 7);
    		if (D.getFullYear() != y) return A;
    		A.push({ month: D.getMonth(), week: week, date: D.getDate(), count: 0 });
    	}
    	
    	return A;
    }
    
    return {
        onRequest: onRequest
    };
    
});