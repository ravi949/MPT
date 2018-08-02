/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/file', 
		'N/search',
		'N/record',
		'N/redirect',
		'N/runtime',
		'N/ui/serverWidget',
		'./iTPM_Module.js'
		],
/**
 * @param {file} file
 * @param {search} search
 * @param {record} record
 * @param {redirect} redirect
 * @param {runtime} runtime
 * @param {serverWidget} serverWidget
 */
function(file, search, record, redirect, runtime, serverWidget, itpm) {
   
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
    		//Methods assign to the json object
    		var objectMethods = {
    				'GET':createCSVSplitForm,
    				'POST':submitCSVSplitForm
    		};
    		//Invoke the method which was associate to json object
    		objectMethods[request.method](request,response);
    		
    	}catch(ex){
    		log.error(ex.name,ex);
    		if(ex.name == 'INVALID_FILE'){
    			throw Error(ex.message);
    		}else if(ex.name == 'ZERO_AMOUNT_FOUND'){
    			throw Error(ex.message);
    		}else if(ex.name == 'INVALID_TOTAL'){
    			throw Error(ex.message);
    		}else if(ex.name == 'INVALID_STATUS'){
    			throw Error(ex.message);
    		}else if(ex.name == 'INVALID_DEDUCTIONID'){
    			throw Error(ex.message);
    		}else if(ex.name == 'LINES_NOT_FOUND'){
    			throw Error(ex.message);
    		}else if(ex.name == 'MISSING_HEADER'){
    			throw Error(ex.message);
    		}
    	}
    }

    /**
     * @param request
     * @param response
     */
    function createCSVSplitForm(request,response){
    	
    	//validate the deduction 
    	itpm.validateDeduction(request.parameters.ddn);
    	
    	//Deduction body field values
    	var ddnLookup = search.lookupFields({
    		type:'customtransaction_itpm_deduction',
    		id:request.parameters.ddn,
    		columns:['tranid','custbody_itpm_ddn_openbal']
    	});
    	
    	//Create the form.
    	var form = serverWidget.createForm({
    	    title : 'Deduction Split (CSV) Form'
    	});
    	
    	form.addField({
    	    id : 'custom_itpm_splitupload',
    	    type : serverWidget.FieldType.FILE,
    	    label : 'Upload CSV File'
    	}).isMandatory = true;
    	
    	form.addField({
    	    id : 'custom_itpm_ddnopenbal',
    	    type : serverWidget.FieldType.CURRENCY,
    	    label : 'Open Balance'
    	}).updateDisplayType({
    	    displayType : serverWidget.FieldDisplayType.INLINE
    	}).defaultValue = ddnLookup['custbody_itpm_ddn_openbal'];
    	
    	form.addField({
    	    id : 'custom_itpm_ddnno',
    	    type : serverWidget.FieldType.TEXT,
    	    label : 'Deduction ID'
    	}).updateDisplayType({
    	    displayType : serverWidget.FieldDisplayType.INLINE
    	}).updateLayoutType({
    	    layoutType: serverWidget.FieldLayoutType.MIDROW
    	}).defaultValue = '- iTPM Deduction #'+ddnLookup['tranid'];
   
    	form.addField({
    		id : 'custom_itpm_ddnsplit',
    	    type : serverWidget.FieldType.SELECT,
    	    label : 'Split',
    		source:'customtransaction_itpm_deduction'
    	}).updateDisplayType({
    	    displayType : serverWidget.FieldDisplayType.HIDDEN
    	}).defaultValue = request.parameters.ddn;
    	
    	form.addSubmitButton({
    	    label : 'Submit'
    	});
    	
    	form.addButton({
    		id : 'custom_itpm_ddnsplitcacel',
    	    label : 'Cancel',
    	    functionName:"redirectToBack"
    	});
    	
    	form.clientScriptModulePath =  './iTPM_Attach_Preferences_ClientMethods.js';
    	
    	response.writePage(form);
    }
    
    /**
     * @param request
     * @param response
     */
    function submitCSVSplitForm(request,response){
    	var fileObj = request.files.custom_itpm_splitupload;
    	var fileName = fileObj.name.split('.');
    	log.debug('fileName',fileObj);
    	log.debug('parameters',request.parameters);
    	log.debug('runtime',runtime.getCurrentScript().getRemainingUsage());
    	log.debug('encodeing',fileObj.encoding);
    	
    	//If file format is not CSV it will return the error to the user.
    	if(fileName[fileName.length - 1] != 'csv'){
    		throw{
    			name:'INVALID_FILE',
    			message:'Please upload valid CSV file.'
    		}
    	}
    	
    	//validating the headers of the lines
    	var iterator = fileObj.lines.iterator(),
    	mainHeaders = ["Deduction_ID","Split_Amount","Split_Memo","Split_ReferenceCode","Split_Disputed?"];
		mandatoryFieldsIndexs = [];
		
		//headers validation
		iterator.each(function (e) {
		  var headers = e.value.split(','),  
		  lineCount = mainHeaders.length,headerFound = true;
		  log.debug('headers',headers);
		  for(var h = 0;h<lineCount;h++){
			 headerFound = headers.some(function(e){return e == mainHeaders[h]});
			 if(!headerFound){
				throw{
					name:'MISSING_HEADER',
					message:'Required headers are missing.'
				}
			 }else{
				 switch(mainHeaders[h]){
				 case "Deduction_ID":
					 mandatoryFieldsIndexs.push({index:headers.indexOf("Deduction_ID"),field:"Deduction_ID"});break;
				 case "Split_Amount":
					 mandatoryFieldsIndexs.push({index:headers.indexOf("Split_Amount"),field:"Split_Amount"});break;
				 case "Split_Memo":
					 mandatoryFieldsIndexs.push({index:headers.indexOf("Split_Memo"),field:"Split_Memo"});break;
				 case "Split_ReferenceCode":
					 mandatoryFieldsIndexs.push({index:headers.indexOf("Split_ReferenceCode"),field:"Split_ReferenceCode"});break;
				 case "Split_Disputed?":
					 mandatoryFieldsIndexs.push({index:headers.indexOf("Split_Disputed?"),field:"Split_Disputed?"});break;
				 }
			 }  
		  }
		  return false
		});
    	
    	
		//Loaded deduction record and Convert the csv file into json
    	log.debug('fileObj lines',fileObj.getContents());
    	
    	var ddnLookup = search.lookupFields({
    		type:'customtransaction_itpm_deduction',
    		id:request.parameters.custom_itpm_ddnsplit,
    		columns:['tranid','custbody_itpm_ddn_openbal']
    	});
    	var totalAmount = 0;
    	var openBalance = parseFloat(ddnLookup['custbody_itpm_ddn_openbal']);
    	
    	//Converting the csv to json based on fileType (Actually the file type is given like this MISCBINARY and CSV) object
    	if(fileObj.fileType == 'MISCBINARY'){
    		var csvToJsonArr = new itpm.Base64().decode(fileObj.getContents());
    	}else if(fileObj.fileType == 'CSV'){
    		csvToJsonArr = fileObj.getContents();
    	}
		
		log.debug('before convertions',csvToJsonArr);
		csvToJsonArr = itpm.CSV2JSON(csvToJsonArr);
		var csvToJsonArrLength = csvToJsonArr.length;
		log.debug('csvToJsonArrLength',csvToJsonArrLength);
		log.debug('after csvToJsonArr',csvToJsonArr);
		
		if(csvToJsonArr.length <= 1){
			throw{
				name:'LINES_NOT_FOUND',
				message:'Lines should be more than one.'
			}
		}
		
		//Loop through the lines and validate the lines
		csvToJsonArr.forEach(function(e){
			//validate the Deduction#
			if(e["Deduction_ID"] != '- iTPM Deduction #'+ddnLookup['tranid']){
				throw{
					name:'INVALID_DEDUCTIONID',
					message:'Invalid Deduction ID.'
				}
			}
			
			//Validate the iTPM Amount 
			if(parseFloat(e["Split_Amount"]) <= 0){
				throw{
					name:'ZERO_AMOUNT_FOUND',
					message:'Line amount should be greater than zero.'
				}
			}
			totalAmount += parseFloat(e["Split_Amount"]);
		});
		
		//Currency value fixing to 2 decimal places
		totalAmount = totalAmount.toFixed(2);
		
		log.debug('totalAmount',totalAmount);
		log.debug('openBalance',openBalance);
		log.debug('end 1 runtime',runtime.getCurrentScript().getRemainingUsage());
		
		//Sum of line amounts is greater than open balance throw error to the user 
		if(totalAmount != openBalance){
			throw{
				name:'INVALID_TOTAL',
				message:'Sum of line amounts should be equal to Deduction Open balance.'
			}
		}
		
		//Save the uploaded csv file into SuiteScripts folder
		fileObj.folder = '-15';
		var fileId = fileObj.save();
		log.debug('fileId',fileId);
		
		//Create new deduction split record
		var newSplitRecId = record.create({
			type:'customrecord_itpm_deductionsplit'
		}).setValue({
			fieldId:'externalid',
			value:'- iTPM Deduction #'+ddnLookup['tranid']
		}).setValue({
			fieldId:'custrecord_itpm_split_deduction',
			value:request.parameters.custom_itpm_ddnsplit 
		}).setValue({
			fieldId:'custrecord_itpm_split_ddnamount',
			value:ddnLookup['custbody_itpm_ddn_openbal']
		}).setValue({
			fieldId:'custrecord_itpm_split_ddnopenbal',
			value:ddnLookup['custbody_itpm_ddn_openbal']
		}).setValue({
			fieldId:'custrecord_itpm_createfrom',
			value:'CSV_SPLIT'
		}).save({
			enableSourcing:false,
			ignoreMandatoryFields:true
		});
		
		//Attach the saved csv file to new split record
		record.attach({
		    record: {
		        type: 'file',
		        id: fileId
		    },
		    to: {
		        type: 'customrecord_itpm_deductionsplit',
		        id: newSplitRecId
		    }
		});
		log.debug('newSplitRecId',newSplitRecId);
    	log.debug('end 2 runtime',runtime.getCurrentScript().getRemainingUsage());
		
		//Redirec to the deduction record
		redirect.toRecord({
			type: 'customtransaction_itpm_deduction',
		    id: request.parameters.custom_itpm_ddnsplit
		});
    }
    
    return {
        onRequest: onRequest
    };
    
});
