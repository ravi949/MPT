/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/file', 
		'N/search',
		'N/record',
		'N/redirect',
		'N/ui/serverWidget'],
/**
 * @param {file} file
 * @param {search} search
 * @param {record} record
 * @param {redirect} redirect
 * @param {serverWidget} serverWidget
 */
function(file, search, record, redirect, serverWidget) {
   
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
    		var objectMethods = {
    				'GET':createCSVSplitForm,
    				'POST':submitCSVSplitForm
    		};
    		objectMethods[request.method](request,response);
    	}catch(ex){
    		log.error(ex.name,ex.message);
    		if(ex.name == 'INVALID FILE'){
    			throw Error(ex.message);
    		}else if(ex.name == 'ZERO AMOUNT FOUND'){
    			throw Error(ex.message);
    		}else if(ex.name == 'INVALID TOTAL'){
    			throw Error(ex.message);
    		}else if(ex.name == 'INVALID STATUS'){
    			throw Error(ex.message);
    		}else if(ex.name == 'INVALID EXTERNALID'){
    			throw Error(ex.message);
    		}
    	}
    }

    /**
     * @param request
     * @param response
     */
    function createCSVSplitForm(request,response){
    	
    	//Validate the deduction status
    	var ddnStatus = search.lookupFields({
    		type:'customtransaction_itpm_deduction',
    		id:request.parameters.ddn,
    		columns:['status']
    	})['status'][0]['value'];
    	
    	if(ddnStatus != 'statusA'){
    		throw{
    			name:'INVALID STATUS',
    			message:'Deduction status should be OPEN.'
    		}
    	}
    	
    	//Create the form.
    	var form = serverWidget.createForm({
    	    title : 'Simple Form'
    	});
    	
    	form.addField({
    	    id : 'custom_itpm_splitupload',
    	    type : serverWidget.FieldType.FILE,
    	    label : 'Upload CSV File'
    	}).isMandatory = true;
    	
    	form.addField({
    	    id : 'custom_itpm_ddnno',
    	    type : serverWidget.FieldType.TEXT,
    	    label : 'Deduction ID'
    	}).updateDisplayType({
    	    displayType : serverWidget.FieldDisplayType.INLINE
    	}).defaultValue = '- iTPM Deduction #'+search.lookupFields({
    		type:'customtransaction_itpm_deduction',
    		id:request.parameters.ddn,
    		columns:['tranid']
    	})['tranid'];
    	
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
    	
    	//If file format is not CSV it will return the error to the user.
    	if(fileName[fileName.length - 1] != 'csv'){
    		throw{
    			name:'INVALID FILE',
    			message:'Please upload valid CSV file.'
    		}
    	}
    	log.debug('fileObj lines',fileObj.getContents());
    	
    	var ddnLookup = search.lookupFields({
    		type:'customtransaction_itpm_deduction',
    		id:request.parameters.custom_itpm_ddnsplit,
    		columns:['tranid','custbody_itpm_ddn_openbal']
    	});
    	var totalAmount = 0;
    	var openBalance = parseFloat(ddnLookup['custbody_itpm_ddn_openbal']);
    	
    	//Converting the csv to json object
		var csvToJsonArr = new Base64().decode(fileObj.getContents());
		csvToJsonArr = CSV2JSON(csvToJsonArr);
		var csvToJsonArrLength = csvToJsonArr.length;
		log.debug('csvToJsonArrLength',csvToJsonArrLength);
		log.debug('csvToJsonArr',csvToJsonArr);
		
		if(csvToJsonArr.length <= 1){
			throw{
				name:'SINGLE LINE',
				message:'Please add more than one line.'
			}
		}
		
		//Loop through the lines and validate the lines
		csvToJsonArr.forEach(function(e){
			//validate the Deduction#
			if(e["Deduction ID"] != '- iTPM Deduction #'+ddnLookup['tranid']){
				throw{
					name:'INVALID EXTERNALID',
					message:'Invalid Deduction#.'
				}
			}
			
			//Validate the iTPM Amount 
			if(parseFloat(e["iTPM Amount"]) < 0){
				throw{
					name:'ZERO AMOUNT FOUND',
					message:'Line amount should be greater than zero.'
				}
			}
			totalAmount += parseFloat(e["iTPM Amount"]);
		});
		
		//Sum of line amounts is greater than open balance throw error to the user 
		if(totalAmount != openBalance){
			throw{
				name:'INVALID TOTAL',
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
		
		//Redirec to the deduction record
		redirect.toRecord({
			type: 'customtransaction_itpm_deduction',
		    id: request.parameters.custom_itpm_ddnsplit
		});
    }
    
    
    /**
     * @description Decode the Base64 code
     */
    function Base64(){
		// public method for decoding
		function decode(input) {
			this. _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
			var output = "";
			var chr1, chr2, chr3;
			var enc1, enc2, enc3, enc4;
			var i = 0;

			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

			while (i < input.length) {

				enc1 = this._keyStr.indexOf(input.charAt(i++));
				enc2 = this._keyStr.indexOf(input.charAt(i++));
				enc3 = this._keyStr.indexOf(input.charAt(i++));
				enc4 = this._keyStr.indexOf(input.charAt(i++));

				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;

				output = output + String.fromCharCode(chr1);

				if (enc3 != 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
					output = output + String.fromCharCode(chr3);
				}

			}
			return output;
		}
		return{
			decode:decode
		}
    }
    
    /**
     * @param strData
     * @param strDelimiter
     * @description converts the csv decoded data into array
     */
    function CSVToArray(strData, strDelimiter) {
	    // Check to see if the delimiter is defined. If not,
	    // then default to comma.
	    strDelimiter = (strDelimiter || ",");
	    // Create a regular expression to parse the CSV values.
	    var objPattern = new RegExp((
	    // Delimiters.
	    "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
	    // Quoted fields.
	    "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
	    // Standard fields.
	    "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");
	    // Create an array to hold our data. Give the array
	    // a default empty first row.
	    var arrData = [[]];
	    // Create an array to hold our individual pattern
	    // matching groups.
	    var arrMatches = null;
	    // Keep looping over the regular expression matches
	    // until we can no longer find a match.
	    while (arrMatches = objPattern.exec(strData)) {
	        // Get the delimiter that was found.
	        var strMatchedDelimiter = arrMatches[1];
	        // Check to see if the given delimiter has a length
	        // (is not the start of string) and if it matches
	        // field delimiter. If id does not, then we know
	        // that this delimiter is a row delimiter.
	        if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
	            // Since we have reached a new row of data,
	            // add an empty row to our data array.
	            arrData.push([]);
	        }
	        // Now that we have our delimiter out of the way,
	        // let's check to see which kind of value we
	        // captured (quoted or unquoted).
	        if (arrMatches[2]) {
	            // We found a quoted value. When we capture
	            // this value, unescape any double quotes.
	            var strMatchedValue = arrMatches[2].replace(
	            new RegExp("\"\"", "g"), "\"");
	        } else {
	            // We found a non-quoted value.
	            var strMatchedValue = arrMatches[3];
	        }
	        // Now that we have our value string, let's add
	        // it to the data array.
	        arrData[arrData.length - 1].push(strMatchedValue);
	    }
	    // Return the parsed data.
	    log.debug('arrData',arrData)
	    return arrData.filter(function(e){return e.length > 1});
	}
    
    /**
     * @param csv
     * @description Converts the csv data into json of array.
     */
	function CSV2JSON(csv) {
	    var array = CSVToArray(csv);
	    var objArray = [];
	    for (var i = 1; i < array.length; i++) {
	        objArray[i - 1] = {};
	        for (var k = 0; k < array[0].length && k < array[i].length; k++) {
	            var key = array[0][k];
	            objArray[i - 1][key] = array[i][k]
	        }
	    }

	    return objArray;
	}
    
    
    return {
        onRequest: onRequest
    };
    
});
