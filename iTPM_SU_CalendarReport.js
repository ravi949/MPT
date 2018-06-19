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
    			//Script Parameters
    			var calendarId = params.cid;
    			var startdate = '1/1/2018'//params.custpage_stratdate;
    			var enddate = '6/30/2018'//params.custpage_enddate;
    			log.debug('startdate &  enddate', startdate+' & '+enddate);
    			var scriptObj = runtime.getCurrentScript();
    			var templateFileId = '12781';
    			log.debug('templateFileId: ', templateFileId);
    			
    			//Loading template file
    			var templateFile = file.load({
    			    id : templateFileId
    			});
    			
    			var renderer = render.create();
    			var xmlOutput = null;
    			
    			renderer.addCustomDataSource({
    			    format: render.DataSource.OBJECT,
    			    alias: 'period',
    			    data: {name:'period',list:JSON.stringify([{sdate: startdate, edate: enddate}])}
    			});
    			
    			var sundaysList = getSundays();
    			    			
    			renderer.addCustomDataSource({
    			    format: render.DataSource.OBJECT,
    			    alias: 'jweeks',
    			    data: {name:'jweeks',list:JSON.stringify(sundaysList)}
    			});
    			
//    			renderer.addCustomDataSource({
//    			    format: render.DataSource.OBJECT,
//    			    alias: 'data',
//    			    data: {type : 'data', list : JSON.stringify(getRenderDataWeeks(startdate, enddate, sundaysList)) }
//    			});
    			
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

    function getRenderDataWeeks(startdate, enddate, sundaysList){
    	try{
    		var finalResults = [];
    		
    		var promoSearchObj = search.create({
    			   type: "customrecord_itpm_promotiondeal",
    			   filters: [
    			      ["custrecord_itpm_p_status","anyof",3], 
    			      "AND", 
    			      ["custrecord_itpm_p_shipstart","onorafter",startdate], 
    			      "AND", 
    			      ["custrecord_itpm_p_shipend","onorbefore",enddate], 
    			      "AND", 
    			      ["custrecord_itpm_p_customer","anyof",customer]
    			   ],
    			   columns: [
    			      search.createColumn({
    			         name: "custrecord_itpm_p_customer",
    			         sort: search.Sort.ASC,
    			         label: "Name"
    			      }),
    			      search.createColumn({name: "custrecord_itpm_kpi_promotiondeal.custrecord_itpm_p_type", label: "Promo Type"}),
    			      search.createColumn({name: "custrecord_itpm_p_shipstart", label: "Start Date"}),
    			      search.createColumn({name: "custrecord_itpm_p_shipend", label: "End Date"})
    			   ]
    			});
    			var searchResultCount = promoSearchObj.runPaged().count;
    			log.debug("promoSearchObj result count",searchResultCount);
    			promoSearchObj.run().each(function(result){
    				var source = {};
    		        var loopsource = {};
    		        
    		        source.entity = result.getText({ name: 'entity' });
    		        source.item = result.getText({ name: 'item' });
    		        source.transactionnumber = result.getValue({ name: 'transactionnumber' });
    		        source.trandate = result.getValue({ name: 'trandate' });
    		        source.duedate = result.getValue({ name: 'duedate' });
    		        source.sweek = new Date(source.trandate).getWeek();
    		        source.eweek = new Date(source.duedate).getWeek();
    		        source.smonth = new Date(source.trandate).getMonth();
    		        source.sundays = sundaysList;
    		        
    		        loopsource.values = source;
    		        finalResults.push(loopsource);
    				
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