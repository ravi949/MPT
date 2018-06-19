/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget',
        'N/redirect',
        'N/runtime',
        'N/search',
        'N/file'
       ],

function(ui, redirect, runtime, search, file) {
   
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
    		
    		if(request.method == 'GET'){
    			showCalendarView(request, response);
    		}else{
    			calendarViewFormPost(request, response);
    		}
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    /**
     *@param {Object} request 
     *@param {Object} response
     */
    function showCalendarView(request, response){
    	try{
    		var params = request.parameters;
    		var formdata = {};
    		
    		if(!params.formnum){
    			formdata = {
    				formTitle 	: 'iTPM Calendar View',
    				formMessage : "<html><font size='2'>1. Enter the Start Date and End Date for the calendar view you want to create. "
            						+"These dates are required to define the calendar view.<br>"
            						+"2. Select the iTPM Promotion Type(s) to include in the calendar view. If you do not select any, "
            						+"then ALL iTPM Promotion Types will be included. <br>"
            						+"3. Select the iTPM Promotion Status(es) to include in the calendar view. "
            						+"If you do not select any, then ALL iTPM Promotions except those that are VOIDED and those that are REJECTED will be included.<br></font></html>",
                	formValue 	: '1',
                	fileValue 	: '',
                    pTypes		: '',
                	pTypeView	: 'NORMAL',
                	pStatusView	: 'NORMAL'
                }
    			
    			calendarViewFormGet(request, response, formdata);
    		}else if(params.formnum == '2' ){
    			
    			formdata = {
        				formTitle 	: 'iTPM Calendar View - Customers',
        				formMessage : "<html><font size='2'>1. Select the customer(s) to include in this calendar view. "
            							+"If you do not select any, then ALL customers that have iTPM Promotions will be included. <br></font></html>",
                    	formValue 	: '2',
                    	fileValue 	: (params.fileid)?(params.fileid):0,
                    	pTypes		: (params.fileid)?(file.load(params.fileid).getContents()):0,
                    	pTypeView	: 'DISABLED',
                    	pStatusView	: 'DISABLED'
                }
    			calendarViewFormGet(request, response, formdata);
    		}else if(params.formnum == '3' ){
    			formdata = {
        				formTitle 	: 'iTPM Calendar View - Items & Item Groups',
        				formMessage : "<html><font size='2'>1. Select the Item(s) and Item Group(s) to include in this calendar view.<br>"
        	                +"2. If you do not select any Item(s), then ALL item(s) available on iTPM Promotions will be included.<br>"
        	                +"3. If you do not select any Item Group(s), then Item Group(s) will NOT be included.<br>"
        	        		+"4. If you DO select Item Group(s), then applicable items from the group(s) will be included in the calendar view. "
        	        		+"However, if the group(s) selection overlaps with the Item(s) selection, the Item(s) will only be included once. <br></font></html>",
                    	formValue 	: '3',
                    	fileValue 	: (params.fileid)?(params.fileid):0,
                        pTypes		: (params.fileid)?(file.load(params.fileid).getContents()):0,
                    	pTypeView	: 'DISABLED',
                    	pStatusView	: 'DISABLED'
                }
    			calendarViewFormGet(request, response, formdata);
    		}
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }
    
    /**
     *@param {Object} request
     *@param {Object} response
     *@param {Object} formdata
     */
    function calendarViewFormGet(request, response, formdata){
    	try{
    		var form = ui.createForm({
				title: formdata.formTitle
			});
    		
			form.addFieldGroup({
    			id:'custpage_fieldgroup_p_message',
    			label:' '
    		}).isBorderHidden = true;
    		
    		var message = form.addField({
    			id : 'custpage_itpm_p_message',
    		    type : ui.FieldType.INLINEHTML,
    		    label : ' ',
    		    container:'custpage_fieldgroup_p_message'
    		}).updateLayoutType({
    		    layoutType: ui.FieldLayoutType.OUTSIDEABOVE
    		});
    		
    		message.defaultValue = formdata.formMessage;
    		
    		form.addFieldGroup({
    			id		: 'custpage_fieldgroup_p_details',
    			label	: ' '
    		}).isBorderHidden = true;
    		
    		
    		var formvalue = form.addField({
    			id		: 'custpage_itpm_p_form',
    			type	: ui.FieldType.TEXT,
    			label	: 'Form',
    			container: 'custpage_fieldgroup_p_details'
    		}).updateBreakType({
			    breakType : ui.FieldBreakType.STARTCOL
			}).updateDisplayType({
			    displayType : ui.FieldDisplayType.HIDDEN
			});
    		
    		formvalue.defaultValue = formdata.formValue;
    		
    		var filevalue = form.addField({
    			id		: 'custpage_itpm_p_file',
    			type	: ui.FieldType.TEXT,
    			label	: 'File ID',
    			container: 'custpage_fieldgroup_p_details'
    		}).updateBreakType({
			    breakType : ui.FieldBreakType.STARTCOL
			}).updateDisplayType({
			    displayType : ui.FieldDisplayType.HIDDEN
			});
    		
    		(!formdata.fileValue)?(filevalue.defaultValue = formdata.fileValue):filevalue.defaultValue = 0;
    		
    		var sdate = form.addField({
    			id		: 'custpage_itpm_p_startdate',
    			type	: ui.FieldType.DATE,
    			label	: 'Start Date',
    			container: 'custpage_fieldgroup_p_details'
    		}).updateBreakType({
			    breakType : ui.FieldBreakType.STARTCOL
			}).isMandatory = true;

    		var edate = form.addField({
    			id		: 'custpage_itpm_p_enddate',
    			type	: ui.FieldType.DATE,
    			label	: 'End Date',
    			container: 'custpage_fieldgroup_p_details'
    		}).isMandatory = true;
    		
    		var ptypes = form.addField({
				id		: 'custpage_itpm_p_prmotype',
				label	: 'iTPM Promotion Type(s)',
				type	: ui.FieldType.MULTISELECT,
				container: 'custpage_fieldgroup_p_details'
			});
    		ptypes.padding = 1;
    		(formdata.pTypeView == 'NORMAL') ? ptypes.updateDisplayType({displayType : ui.FieldDisplayType.NORMAL}) : ptypes.updateDisplayType({displayType : ui.FieldDisplayType.DISABLED});
    		//Adding Promotion Type records to Suitelet field
    		var ptypeResults = search.create({
    			type: 'customrecord_itpm_promotiontype',
    			columns: ['internalid', 'name'],
    			filters: [['isinactive','is', false]]
    		});
    		
    		ptypeResults.run().each(function(result){
    			ptypes.addSelectOption({
    				value : result.id,
    				text : result.getValue('name')
    			});
    			
    			return true;
    		});
    		
    		var pstatus = form.addField({
				id		: 'custpage_itpm_p_prmostatus',
				label	: 'iTPM Promotion Status(e)',
				type	: ui.FieldType.MULTISELECT,
				container: 'custpage_fieldgroup_p_details'
			});
    		pstatus.padding = 1;
    		(formdata.pTypeView == 'NORMAL') ? pstatus.updateDisplayType({displayType : ui.FieldDisplayType.NORMAL}) : pstatus.updateDisplayType({displayType : ui.FieldDisplayType.DISABLED});
    		//Adding Promotion Statuses to Suitelet field
    		var pstatusResults = search.create({
    			type: 'customlist_itpm_promotionstatus',
    			columns: ['name'],
    			filters: []
    		});
    		
    		pstatusResults.run().each(function(result){
    			pstatus.addSelectOption({
    				value : result.id,
    				text : result.getValue('name')
    			});
    			
    			return true;
    		});
    		
    		form.addSubmitButton({
				label : 'Submit'
			});
    			
    		form.addButton({
    			id	: 'custpage_button_cancel',
    			label	: 'Cancel',
    			functionName: "redirectToBack()"
    		});
    		form.clientScriptModulePath =  './iTPM_Attach_CalendarView_ClientMethods.js';
    		
    		log.debug('Available Usage', runtime.getCurrentScript().getRemainingUsage());
    		
    		response.writePage(form);
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }
    
    /**
     * 
     */
    function calendarViewFormPost(request, response){
    	try{
    		var params = request.parameters;
    		log.debug('POST params', params.custpage_itpm_p_form);
    		log.debug('PTYPES', params.custpage_itpm_p_prmotype.replace(/\u0005/g,','));
    		//log.debug('PSTATUS', params.custpage_itpm_p_prmostatus.replace(/\u0005/g,',').split(","));
    		if(params.custpage_itpm_p_form == '1'){
    			var fileObj = file.create({
    			    name: 'temp.txt',
    			    fileType: file.Type.PLAINTEXT,
    			    contents: params.custpage_itpm_p_prmotype.replace(/\u0005/g,',')
    			    });
    			fileObj.folder = -15;
    			var fileId = fileObj.save();
    			
    			redirect.toSuitelet({
    				scriptId:'customscript_itpm_calendar_view',
    				deploymentId:'customdeploy_itpm_calendar_view',
    				parameters:{formnum:'2',fileid:fileId}
    			});
    		}

    		if(params.custpage_itpm_p_form == '2'){
    			redirect.toSuitelet({
    				scriptId:'customscript_itpm_calendar_view',
    				deploymentId:'customdeploy_itpm_calendar_view',
    				parameters:{formnum:'3'}
    			});
    		}
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }
    
    return {
        onRequest: onRequest
    };
    
});
