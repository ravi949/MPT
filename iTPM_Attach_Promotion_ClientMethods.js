/**
 * @NApiVersion 2.x
 *  @NScriptType ClientScript
 * @NModuleScope TargetAccount
 */
define(['N/url',
		'N/ui/message',
		'N/record',
		'N/ui/dialog',
		'N/search'
	   ],

function(url, message, record, dialog, search) {
	
	function displayMessage(title,text){
		try{
			var msg = message.create({
				type: message.Type.INFORMATION,
				title: title,
				message: text
			});
			return msg;
		} catch(ex) {
			console.log(ex.name,'function name = displayMessage, message = '+ex.message);
		}
	}
	
	function newSettlement(pid){
		try{
			var msgObj = displayMessage('New Settlement','Please wait while you are redirected to the new settlement screen.');
			msgObj.show();
			var outputURL = url.resolveScript({
				scriptId:'customscript_itpm_set_createeditsuitelet',
				deploymentId:'customdeploy_itpm_set_createeditsuitelet',
				returnExternalUrl: false,
				params:{pid:pid,from:'promo'}
			});
			window.open(outputURL,'_self');
		}catch(e){
			console.log(e.name,'function name = new Settlement, message = '+e.message);
		}
	}
	
	function refreshKPIs(promoID){
		try{
			//console.log(promoID);
			var recObj = record.create({
				type: 'customrecord_itpm_kpiqueue',
				isDynamic: true
			});
			recObj.setValue({
	            fieldId: 'custrecord_itpm_kpiq_promotion',
	            value: promoID
	        });
			recObj.setValue({
	            fieldId: 'custrecord_itpm_kpiq_queuerequest',
	            value: 4  //Ad-hoc
	        });
			
			var recordId = recObj.save({
	            enableSourcing: false,
	            ignoreMandatoryFields: true
	        });
			//console.log('KPI Queue record ID: '+recordId);
			
			//redirect to the same promotion
			window.location.reload();
		}catch(e){
			console.log(e.name,'function name = refreshKPIs, message = '+e.message);
		}
	}
	
	function bulkSettlements(promoid,promocustomer){
		try{
			var msgObj = displayMessage('Bulk Resolve Deductions','Please wait while you are redirected to the Resolved Deductions page.');
			msgObj.show();
			var outputURL = url.resolveScript({
				scriptId:'customscript_itpm_bulk_settlements',
				deploymentId:'customdeploy_itpm_bulk_settlements',
				returnExternalUrl: false,
				params:{pid:promoid,pcustomer:promocustomer}
			});
			window.open(outputURL,'_self');
		}catch(e){
			console.log(e.name,'function name = bulkSettlement, message = '+e.message);
		}
	}
	
	
    //setting the true value to "Is Promotion Planning Complete?" check-box when user clicks the Promotion Completed button.
	function planningComplete(promoID,planning_processed){
		try{
			console.log(' Promotion ID   '+ promoID);
			console.log(' planning_processed   '+ planning_processed);

			if(planning_processed){
				var msgText = "Please wait while your planned allowances, estimated quantities, and retail information is processed "+
				"and made available under the subtabs by the same name. Please wait for processing to complete. "+
				"Any allowances by item groups will be expanded to the associated items.";		

				var popMessage = "All planning records are already processed. Do you want to submit for processing again?";

				dialog.create({
					title: "Please Confirm",
					message: popMessage,
					buttons:[{label:'Continue',value:true},{label:'Cancel',value:false}]
				}).then(function(result){
					if(result){
						var msg = displayMessage('info',msgText);
						msg.show();
						var id = record.submitFields({
							type: 'customrecord_itpm_promotiondeal',
							id: promoID,
							values: {
								'custrecord_itpm_p_ispromoplancomplete': 'T',
								'custrecord_itpm_p_isplanlinkrecdeleted': 'F'
							},
							options: {
								enableSourcing: false,
								ignoreMandatoryFields : true
							}
						});
						//redirect to the same promotion
						window.location.reload();
					}
				}).catch(function(reason){
					console.log(reason);
				});
			}
			//else if(!planning_processed){
			else{
				var id = record.submitFields({
					type: 'customrecord_itpm_promotiondeal',
					id: promoID,
					values: {
						'custrecord_itpm_p_ispromoplancomplete': 'T',
						'custrecord_itpm_p_isplanlinkrecdeleted': 'F'
					},
					options: {
						enableSourcing: false,
						ignoreMandatoryFields : true
					}
				});
				//redirect to the same promotion
				window.location.reload();
			}
			
			
		}catch(e){
			console.log(e.name,'function name = refreshKPIs, message = '+e.message);
		}
	}
	
	function redirectToBack(){
		history.go(-1);
	}
    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {
    	try{
    		var promoRec = scriptContext.currentRecord;
    		if(promoRec.getValue('custrecord_itpm_p_type')){
    			var promoTypeLookup = search.lookupFields({
        		    type:'customrecord_itpm_promotiontype',
        		    id:promoRec.getValue('custrecord_itpm_p_type'),
        		    columns:['custrecord_itpm_pt_validmop']
        		});
            	console.log('promoTypeLookup   '+promoTypeLookup.custrecord_itpm_pt_validmop[0].text);
            	var allMOP = promoRec.getCurrentSublistValue({
            	    sublistId: scriptContext.sublistId,
            	    fieldId: 'custrecord_itpm_pp_mop'
            	});
            	console.log(allMOP);
        		var isValidMOP = promoTypeLookup.custrecord_itpm_pt_validmop.some(function(e){return e.value == allMOP});
        		console.log('isValidMOP',isValidMOP);
            	if(isValidMOP){
            		return true;
            	}else{
            		dialog.alert({
                        title: 'Warning',
                        message: 'The selected Method Of Payment is not valid. <br>'+
                        		 '<br> Valid Method Of Payments are "'+
                        		 promoTypeLookup.custrecord_itpm_pt_validmop.map(function(e){ return e.text}).join(",")+'".'
                    });
            		return false;
            	}
    		}else{
    			dialog.alert({
                    title: 'Warning',
                    message: 'Select the Promotion Type.' 
                });
    			return false;
    		}
        	
    	}catch(e){
			log.error(e.name,e.message);
			console.log(e.name,'function name = validateLine, message = '+e.message);
		}
    }
    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */    
    function sublistChanged(scriptContext) {
    	var promoRec = scriptContext.currentRecord;
    	
    	var sublistName = scriptContext.sublistId;
    	var op = scriptContext.operation;

    	try{
    		var lineNumber = scriptContext.currentRecord.getCurrentSublistIndex({
    			sublistId: 'recmachcustrecord_itpm_pp_promotion'
    		});
    		console.log('LineNumber '+lineNumber);
    		console.log('sublistId ' + scriptContext.sublistId);
    		console.log('dynamic',scriptContext.currentRecord.isDynamic);
    		console.log('sublistName',scriptContext.currentRecord);

    		if (sublistName === 'recmachcustrecord_itpm_pp_promotion'){
    			
    			
//    			promoRec.setCurrentSublistText({
//    			    sublistId: 'recmachcustrecord_itpm_pp_promotion',
//    			    fieldId: 'custrecord_itpm_pp_processed',
//    			    text: 'No',
//    			    ignoreFieldChange: false,
//    			    fireSlavingSync: false
//    			});
//    			console.log(promoRec.getCurrentSublistValue({
//    				sublistId: 'recmachcustrecord_itpm_pp_promotion',
//    				fieldId: 'custrecord_itpm_pp_rate'
//    			}))
//    			promoRec.setCurrentSublistValue({
//    				sublistId: 'recmachcustrecord_itpm_pp_promotion',
//    				fieldId: 'custrecord_itpm_pp_rate',
//    				value: 100,
//    				ignoreFieldChange: false
//    			});
    			console.log('INSIDE IF BLOCK');
    			
    			promoRec.setValue({
    			    fieldId: 'custrecord_itpm_p_description',
    			    value: 'New Description',
    			    ignoreFieldChange: true,
    			    fireSlavingSync: true
    			});
    			
//    			scriptContext.newRecord.setValue({
//				    fieldId: 'custrecord_itpm_p_description',
//				    value: 'New Description',
//				    ignoreFieldChange: true
//				});
//    			
    			
    			
    			
//    			promoRec1.setSublistValue({
//    			    sublistId: 'recmachcustrecord_itpm_pp_promotion',
//    			    fieldId: 'custrecord_itpm_pp_processed',
//    			    line: lineNumber,
//    			    value: true
//    			});
//    			promoRec1.setSublistValue({
//       				
//    			});
    			
//    			var recordId = promoRec.save({
//    			    enableSourcing: true,
//    			    ignoreMandatoryFields: true
//    			});
    			
    		}    		
    	}catch(ex){
    		log.debug(ex.name,ex.message);
    	}
    }
       
	return {
        validateLine: validateLine,
        newSettlement:newSettlement,
        refreshKPIs : refreshKPIs,
        bulkSettlements : bulkSettlements,
        planningComplete : planningComplete,
        redirectToBack : redirectToBack,
        sublistChanged : sublistChanged
    };
    
});
