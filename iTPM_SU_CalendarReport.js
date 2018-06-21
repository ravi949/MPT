/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/render',
        'N/search',
        'N/runtime',
        'N/file',
        'N/ui/serverWidget'],

function(render, search, runtime, file, ui) {
   
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
    			
    			var scriptObj = runtime.getCurrentScript();
    			var templateFileId = '12781';
    			log.debug('templateFileId: ', templateFileId);
    			
    			//Loading template file
    			var templateFile = file.load({
    			    id : templateFileId
    			});
    			
    			var renderer = render.create();
    			var xmlOutput = null;
    			var sundaysList = getSundays();
    			
    			renderer.addCustomDataSource({
    			    format: render.DataSource.OBJECT,
    			    alias: 'weeks',
    			    data: {name:'list',list:JSON.stringify(sundaysList)}
    			});
    			
    			renderer.addCustomDataSource({
    			    format: render.DataSource.OBJECT,
    			    alias: 'promotionData',
    			    data: {name : 'list', list : JSON.stringify(getRenderDataWeeks(calendarRecLookup)) }
    			});
    			
    			renderer.templateContent = templateFile.getContents();
    			
    			xmlOutput = renderer.renderAsString();
    			
    			if (!(xmlOutput) || xmlOutput === null) throw {name: 'xmlOutput', message:'No output from template renderer.'};
    			
    			log.debug('Available Usage', runtime.getCurrentScript().getRemainingUsage());
    			
    			context.response.write(xmlOutput);
    		}
		}catch(e){
			log.debug(e.name, e.message);
			log.debug('Available Usage:', runtime.getCurrentScript().getRemainingUsage());
		}
    }

    function getRenderDataWeeks(calendarRecLookup){
    	try{
    		var finalResults = [];
    		
    		var startdate = calendarRecLookup['custrecord_itpm_cal_startdate'] //'1/1/2018'
			var enddate = calendarRecLookup['custrecord_itpm_cal_enddate'] //'6/30/2018'
			var customers = calendarRecLookup['custrecord_itpm_cal_customer'];
			var allCustomersChecked = calendarRecLookup['custrecord_itpm_cal_allcustomers'];
			var items =  calendarRecLookup['custrecord_itpm_cal_items'];
			var allItemsChecked =  calendarRecLookup['custrecord_itpm_cal_allitems'];
			var promoTypes = calendarRecLookup['custrecord_itpm_cal_promotiontypes'];
			var allPromoTypesChecked = calendarRecLookup['custrecord_itpm_cal_allpromotiontypes'];
			var promoStatus = calendarRecLookup['custrecord_itpm_cal_promotionstatus'][0].value;
			
			var promotionFilters = [
			                          ["custrecord_itpm_p_status","anyof",3], 
				      			      "AND", 
				    			      ["custrecord_itpm_p_shipstart","onorafter",startdate], 
				    			      "AND", 
				    			      ["custrecord_itpm_p_shipend","onorbefore",enddate]
									];
			if(!allCustomersChecked){
				promotionFilters.push("AND",["custrecord_itpm_p_customer","anyof",customers]);
			}
			if(!allItemsChecked){
				promotionFilters.push("AND",["custrecord_itpm_all_promotiondeal.custrecord_itpm_all_item","anyof",customers]);
			}
			if(!allPromoTypesChecked){
				promotionFilters.push("AND",["custrecord_itpm_p_type","anyof",promoTypes]);
			}
    		
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
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_percentperuom",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_rateperuom",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_item",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_itemdescription",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_uom",
    			      "custrecord_itpm_all_promotiondeal.custrecord_itpm_all_mop",
    			      "custrecord_itpm_p_description",
    			      "custrecord_itpm_p_type",
    			      "custrecord_itpm_p_shipstart",
    			      "custrecord_itpm_p_shipend"
    			   ]
    			});
//    			var searchResultCount = promoSearchObj.runPaged().count;
//    			log.debug("promoSearchObj result count",searchResultCount);
    			promoSearchObj.run().each(function(result){
    		        finalResults.push({
    		        	promo_desc	  : result.getValue({ name: 'custrecord_itpm_p_description'}),
    	    		    promo_id		  : result.getValue({ name:'internalid' }),
    		        	promo_type	  : result.getText({ name: 'custrecord_itpm_p_type'}),
    	    		    ship_startdate : result.getValue({ name: 'custrecord_itpm_p_shipstart' }),
    	    		    ship_enddate   : result.getValue({ name: 'custrecord_itpm_p_shipend' }),
    		        	entity 		  : result.getText({ name: 'custrecord_itpm_p_customer' }),
    	    		    item   		  : result.getText({ name: 'custrecord_itpm_all_item', join:'custrecord_itpm_all_promotiondeal' }),
    	    		    item_desc	  : result.getText({ name:'custrecord_itpm_all_itemdescription', join:'custrecord_itpm_all_promotiondeal' }),
    	    		    rate_peruom	  : result.getValue({ name:'custrecord_itpm_all_rateperuom', join:'custrecord_itpm_all_promotiondeal' }),
    	    		    percent_peruom : result.getValue({ name:'custrecord_itpm_all_percentperuom', join:'custrecord_itpm_all_promotiondeal' }),
    	    		    uom			  : result.getText({ name:'custrecord_itpm_all_uom', join:'custrecord_itpm_all_promotiondeal' }),
    	    		    mop           : result.getText({ name:'custrecord_itpm_all_mop', join:'custrecord_itpm_all_promotiondeal' }),
    	    		    sweek 		  : new Date(result.getValue({ name: 'custrecord_itpm_p_shipstart' })).getWeek(),
    	    		    eweek 		  : new Date(result.getValue({ name: 'custrecord_itpm_p_shipend' })).getWeek(),
    	    		    smonth 		  : new Date(result.getValue({ name: 'custrecord_itpm_p_shipstart' })).getMonth()
    		        });
    			   return true;
    			});
    		
    		return finalResults;
    	}catch(e){
    		log.debug(e.name, e.message);
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