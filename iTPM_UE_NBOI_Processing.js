/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define(['N/redirect', 
        'N/search', 
        'N/runtime', 
        'N/record',
        'N/ui/serverWidget',
        'N/ui/message',
        './iTPM_Module.js'        
        ],
	/**
	* @param {redirect} redirect
	* @param {search} search
	* @param {runtime} runtime
	* @param {record} record
	* @param {serverWidget} serverWidget
	*/
	function(redirect, search, runtime, record, serverWidget, message, itpm) {

	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {string} scriptContext.type - Trigger type
	 * @param {Form} scriptContext.form - Current form
	 * @Since 2015.2
	 */
	function beforeLoad(scriptContext) {
		try{
			var tranRec = scriptContext.newRecord;
			//after Planing Completed showing the progress message while batch process running
			var tranItpmDiscount = tranRec.getValue('custbody_itpm_applydiscounts');
			var tranItpmDisApplied = tranRec.getValue('custbody_itpm_discounts_applied');
			if((scriptContext.type == 'view' || scriptContext.type == 'edit') && 
					tranItpmDiscount && !tranItpmDisApplied){
				var msgText = message.create({
					title: "Please wait...", 
					message: "Please wait! iTPM is processing off-invoice and net-bill allowances for this sales order."+
					" To prevent invoicing errors, wait to approve and/or fulfill this order until processing is completed. This process runs every 15 minutes. ", 
					type: message.Type.INFORMATION
				});
				scriptContext.form.addPageInitMessage({message: msgText});
			}
		} catch(ex) {
			log.error('NBOI_UE_BeforeLoad', ex.name + '; message: ' + ex.message +'; Id:' + scriptContext.newRecord.id);
		}
	}
	
	
	/**
	 * Function definition to be triggered before record is loaded.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.oldRecord - Old record
	 * @param {string} scriptContext.type - Trigger type
	 * @Since 2015.2
	 */
	function beforeSubmit(scriptContext) {
		try{
			var transRecord = scriptContext.newRecord;
			if(scriptContext.type == 'edit' && transRecord.getValue('custbody_itpm_applydiscounts')){
				transRecord.setValue({
					fieldId:'custbody_itpm_discounts_applied',
					value:false
				});
			}
		}catch(ex){
			log.error(ex.name ,ex.message);
		}
	}
	
	
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
			var transRecord = scriptContext.newRecord;
			if((scriptContext.type == 'create' || scriptContext.type == 'edit') && 
				transRecord.getValue('custbody_itpm_applydiscounts') && 
				!transRecord.getValue('custbody_itpm_discounts_applied')){

				//fetching Preferance data
				var prefDatesType = getPrefDiscountDateValue();
				log.debug('prefDatesType',prefDatesType);
				var nbEstGov = getEstGovernance('2', transRecord.id, transRecord.type, prefDatesType);
				var oiEstGov = getEstGovernance('3', transRecord.id, transRecord.type, prefDatesType);

				log.debug('Usage : nbEstGov', nbEstGov);
				log.debug('Usage : oiEstGov', oiEstGov);
				log.debug('UE FINAL: ', runtime.getCurrentScript().getRemainingUsage());
				if(nbEstGov < 500 && oiEstGov < 500){
					redirect.toSuitelet({
						scriptId: 'customscript_itpm_nb_processing' ,
						deploymentId: 'customdeploy_itpm_nb_processing',
						parameters: {'id':transRecord.id,'type':transRecord.type} 
					});
				}
			}
		}catch(ex){
			log.error(ex.name ,ex.message);
		}

	}
	
	/**
	 * @param {string} allowanceType
	 * @param {string} transRecId
	 * @param {string} transRecType
	 * @param {string} prefDatesType
	 */
	function getEstGovernance(allowanceType, transRecId, transRecType, prefDatesType){
		
		var transRec = record.load({
			type: transRecType, 
			id: transRecId,
			isDynamic: true
		});
		
		var customer = transRec.getValue('entity');
		var date = transRec.getText('trandate'); 
		var estGov = 0;
		estGov = estGov + 12;//For Preferance data
		if(allowanceType == '2'){
			estGov = estGov + 10;//Transaction load(NB)
		}
		else{
			estGov = estGov + 20;//Transaction load(OI)
		}
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
			var itemResults = getAllowanceItems(prefDatesType, lineItem, customer, date, allowanceType);

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
		return estGov;
	}
	
	/**
	 * @param {string} prefDatesType
	 * @param {string} item
	 * @param {string} customer
	 * @param {string} trandate
	 * @param {string} allowanceType
	 * @return {object} searchObject
	 */
	function getAllowanceItems(prefDatesType, item, customer, trandate, allowanceType){
		//Create hierarchical customers array		
		var subCustIds = itpm.getParentCustomers(customer);
		log.debug('Realted Customers',subCustIds);
		var tranFilters = [
			['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_status','anyof','3'], //here 3 means status is Approved
			'AND', 
			['custrecord_itpm_all_mop','anyof',allowanceType], //here  means Method of Payment is  Net Bill/Off Invoice
			'AND', 
			['custrecord_itpm_all_item','anyof',item], //item from transaction line
			'AND', 
			['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_customer','anyof',subCustIds] //customer from transaction
			];

		//Adding the filters to the tranFilters array
		switch(prefDatesType){
		case '1':
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate]); 
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]);
			break;
		case '2':
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate]);
			tranFilters.push('AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]);
			break;
		case '3':
			tranFilters.push('AND',[
				[['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_shipend','onorafter',trandate]],
				'AND',
				[['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderstart','onorbefore',trandate],'AND',['custrecord_itpm_all_promotiondeal.custrecord_itpm_p_orderend','onorafter',trandate]]
				]);
			break;
		case '4':
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
	
	/**
	 * @return discount date value
	 */
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
			return loadedRec.getValue({fieldId: 'custrecord_itpm_pref_discountdates'});
		}catch(ex){
			log.error(ex.name, ex.message);
		}    	
	}
	
	
	return {
		beforeLoad: beforeLoad,
		beforeSubmit: beforeSubmit,
		afterSubmit: afterSubmit
	};

});
