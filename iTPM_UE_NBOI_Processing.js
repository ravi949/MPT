/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/redirect', 'N/search', 'N/runtime', 'N/record'],
		/**
		 * @param {redirect} redirect
		 */
		function(redirect,search,runtime,record) {
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
			var transRec = record.load({
				type: scriptContext.newRecord.type, 
				id: scriptContext.newRecord.id,
				isDynamic: true
			});
			if(scriptContext.type == 'create' && transRec.getValue('custbody_itpm_applydiscounts')){				
				var customer = transRec.getValue('entity');
				var date = transRec.getText('trandate'); 

				var estGov = 0;
				//fetching Preferance data
				var prefDatesType = getPrefDiscountDateValue();
				estGov = estGov + 12;
				//load transaction
				estGov = estGov + 10;
				var itemCount = transRec.getLineCount({
					sublistId: 'item'
				});
				//for loop start
				for(var i=0; i<itemCount; i++){
					var lineItem = transRec.getSublistValue({
						sublistId : 'item',
						fieldId   : 'item',
						line      : i
					});
					estGov = estGov + 6;
					var itemResults = getAllowanceItems(prefDatesType, lineItem, customer, date);

					itemResults.each(function(result){
						estGov = estGov + 10; //record validation
						estGov = estGov + 12; //to create DL & DLL custom records (approx)
						return true;
					});
					//for loop end
					estGov = estGov + 10;
				}
				//transaction record commit after discount'
				estGov = estGov + 20;
				log.debug('Usage : Final', estGov);
				log.debug('UE FINAL: ', runtime.getCurrentScript().getRemainingUsage());
				if(estGov < 900){
					redirect.toSuitelet({
						scriptId: 'customscript_itpm_nb_processing' ,
						deploymentId: 'customdeploy_itpm_nb_processing',
						parameters: {'id':transRec.id,'type':transRec.type} 
					});
				}
			}
		}catch(ex){
			log.error(ex.name ,ex.message);
		}

	}
	function getAllowanceItems(prefDatesType, item, customer, trandate){
		var tranFilters = [
		                   ['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_status','anyof','3'], //here 3 means status is Approved
		                   'AND', 
		                   ['custrecord_itpm_all_mop','anyof','3'], //here  means Method of Payment is  Off Invoice
		                   'AND', 
		                   ['custrecord_itpm_all_item','anyof',item], //item from transaction line
		                   'AND', 
		                   ['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_customer','anyof',customer] //customer from transaction
		                   ];

		//Adding the filters to the tranFilters array
		switch(prefDatesType){
		case 'Ship Date':
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate]); 
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]);
			break;
		case 'Order Date':
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate]);
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]);
			break;
		case 'Both':
			tranFilters.push('AND',[
			                        [['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]],
			                        'AND',
			                        [['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]]
			                        ]);
			break;
		case 'Either':
			tranFilters.push('AND',[
			                        [['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]],
			                        'OR',
			                        [['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]]
			                        ]);	
			break;
		}
		var tranColumns = [
		                   "custrecord_itpm_all_item",
		                   "CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.name",
		                   "CUSTRECORD_ITPM_ALL_PROMOTIONDEAL.internalid",
		                   "id",
		                   "custrecord_itpm_all_mop",
		                   "custrecord_itpm_all_type",
		                   "custrecord_itpm_all_rateperuom",
		                   "custrecord_itpm_all_percentperuom",
		                   "custrecord_itpm_all_uom"
		                   ];

		var searchObj = search.create({
			type: 'customrecord_itpm_promoallowance',
			filters: tranFilters,
			columns: tranColumns
		});    	
		return searchObj.run();
	}
	function getPrefDiscountDateValue(){
		try{
			var searchObj = search.create({
				type: 'customrecord_itpm_preferences',
				columns : [{name: 'internalid'}]
			});

			var searchResults = searchObj.run().getRange({
				start: 0,
				end  : 2
			});
			var loadedRec = record.load({
				type:'customrecord_itpm_preferences',	 
				id:searchResults[0].getValue('internalid')
			});
			return loadedRec.getText({fieldId: 'custrecord_itpm_pref_discountdates'});
		}catch(e){
			log.error(e.name, e.message);
		}    	
	}
	return {
		afterSubmit: afterSubmit
	};

});
