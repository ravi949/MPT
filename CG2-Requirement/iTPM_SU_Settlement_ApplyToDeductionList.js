/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Suitelet script to fetch and return a list of iTPM Deduction records that are available for the iTPM Settlement to be applied.
 */
define(['N/record',
		'N/search',
		'N/ui/serverWidget',
		'N/redirect',
		'N/url',
		'./iTPM_Module_Settlement.js'
		],
 /**
  * @param {record} record
  * @param {search} search
 */
function(record, search, serverWidget,redirect,url,ST_Module) {

	/**
	 * Definition of the Suitelet script trigger point.
	 *
	 * @param {Object} context
	 * @param {ServerRequest} context.request - Encapsulation of the incoming request
	 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
	 * @Since 2015.2
	 */
	function onRequest(context) 
	{
		try{
			var request = context.request;
			var response = context.response;
			var parameters = request.parameters;

			var output = url.resolveScript({
			    scriptId: 'customscript_itpm_set_applytodeduction',
			    deploymentId: 'customdeploy_itpm_set_applytodeduction',
			    returnExternalUrl: false
			});

			if(request.method == 'GET' && parameters.submit == 'true')
			{
				var SettlementRecId = ST_Module.applyToDeduction(parameters);
				redirect.toRecord({
					type : 'customtransaction_itpm_settlement',
					id : SettlementRecId					
				});
			}else if(request.method == 'GET') {
				
				var settlementRec = record.load({
					type: 'customtransaction_itpm_settlement',
	    		     id: parameters.sid
				});
				
				if(settlementRec.getValue('transtatus') != 'A'){
	    			throw {
						name:'SETTLEMENT_INVALID_STATUS',
						message:'This settlement cannot be apply to dedcution'
					};
	    		}
			
				var list = serverWidget.createList({
				    title : 'Deductions List'
				});
				var listcolumn=list.addColumn({
					id : 'custpage_ddnid',
					type : serverWidget.FieldType.URL,
					label : 'Apply To'
				});
				list.addColumn({
					id : 'custpage_ddnnum',
					type : serverWidget.FieldType.TEXT,
					label : 'Deduction #'
				});
				list.addColumn({
					id : 'custpage_customer',
					type : serverWidget.FieldType.TEXT,
					label : 'Customer'
				});
				list.addColumn({
					id : 'custpage_ddnotherrefcode',
					type : serverWidget.FieldType.TEXT,
					label : 'Other Reference Code'
				});
				list.addColumn({
					id : 'custpage_ddnopenbalance',
					type : serverWidget.FieldType.TEXT,
					label : 'Open Balance'
				});
				list.addColumn({
					id : 'custpage_ddntotalamount',
					type : serverWidget.FieldType.TEXT,
					label : 'Total Amount'
				});
				list.addColumn({
					id : 'custpage_parentddn',
					type : serverWidget.FieldType.TEXT,
					label : 'Parent Deduction'
				});
				list.addColumn({
					id : 'custpage_invoice',
					type : serverWidget.FieldType.TEXT,
					label : 'Invoice #'
				});
				listcolumn.setURL({
				    url : output
				});
				
				listcolumn.addParamToURL({
				    param : 'submit',
				    value : 'true'
				});
				listcolumn.addParamToURL({
				    param : 'sid',
				    value : parameters.sid
				});
				list.addButton({id:'custom_cancelbtn',label:'Cancel',functionName:'redirectToBack'});
				list.clientScriptModulePath = './iTPM_Attach_Settlement_ClientMethods.js';
				
				//getting the settlement request amount from the settlement record.
				var settlementRec = record.load({
					type:'customtransaction_itpm_settlement',
					id:parameters.sid
				});
				var a = [];
				var DeductionSearch = search.create({
					type:'customtransaction_itpm_deduction',
					columns:['internalid'
					         ,'tranid'
					         ,'custbody_itpm_ddn_openbal'
					         ,'custbody_itpm_ddn_customer'
					         ,'custbody_itpm_ddn_otherrefcode'
					         ,'custbody_itpm_ddn_openbal'
					         ,'custbody_itpm_ddn_amount'
					         ,'custbody_itpm_ddn_originalddn'
					         ,'custbody_itpm_ddn_invoice'
					         ,'statusRef'
					         ],
					filters:[
						['custbody_itpm_ddn_openbal','GREATERTHAN', 0],'and'
						,['mainline','is','T'],'and'
						,['custbody_itpm_ddn_openbal','greaterthanorequalto',settlementRec.getValue('custbody_itpm_set_amount')],'and'
						,['custbody_itpm_ddn_customer','anyof',settlementRec.getValue('custbody_itpm_set_customer')]
						]		    		
				});
				var searchLength = DeductionSearch.run().getRange(0,2).length;
				
				if(searchLength > 1){

					listcolumn.addParamToURL({
					    param : 'ddn',
					    value : 'custpage_ddnid',
					    dynamic:true
					});
					
					DeductionSearch.run().each(function(k){
						if(k.getValue('statusRef') == 'statusA'){					 
							 a.push({ 
								     'custpage_ddnid':k.getValue('internalid')
									,'custpage_ddnnum' : k.getValue('tranid')
									,'custpage_customer' :  k.getText('custbody_itpm_ddn_customer')
									,'custpage_ddnotherrefcode': k.getValue('custbody_itpm_ddn_otherrefcode')
									,'custpage_ddnopenbalance' :  k.getValue('custbody_itpm_ddn_openbal')
									,'custpage_ddntotalamount' :  k.getValue('custbody_itpm_ddn_amount')
									,'custpage_parentddn': k.getText('custbody_itpm_ddn_originalddn')
									,'custpage_invoice' :  k.getText('custbody_itpm_ddn_invoice')
						       });
						}
						return true;
					});
					list.addRows({
						rows :a
					});
				}else if(searchLength > 0){
					var k = DeductionSearch.run().getRange(0,1)[0];
					listcolumn.addParamToURL({
					    param : 'ddn',
					    value : k.getValue('internalid')
					});
					list.addRow({
						row:{ 
							 'custpage_ddnid':k.getValue('internalid')
								,'custpage_ddnnum' : k.getValue('tranid')
								,'custpage_customer' :  k.getText('custbody_itpm_ddn_customer')
								,'custpage_ddnotherrefcode': k.getValue('custbody_itpm_ddn_otherrefcode')
								,'custpage_ddnopenbalance' :  k.getValue('custbody_itpm_ddn_openbal')
								,'custpage_ddntotalamount' :  k.getValue('custbody_itpm_ddn_amount')
								,'custpage_parentddn': k.getText('custbody_itpm_ddn_originalddn')
								,'custpage_invoice' :  k.getText('custbody_itpm_ddn_invoice')
						 }
					});
				}
				
				response.writePage(list); 
			}
		}catch (e) {
    		log.error(e.name,'record type = iTPM Settlement, record id='+parameters.sid+', message='+e.messsage);
    		if(e.name == 'SETTLEMENT_INVALID_STATUS'){
    			throw Error(e.message);
    		}
    	}
	}
	return {
		onRequest: onRequest
	};

});
