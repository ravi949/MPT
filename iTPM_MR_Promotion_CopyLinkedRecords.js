/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 * Map / Reduce script to copy linked records from original iTPM Promotion record to the new (copied) iTPM Promotion record.
 */
define(['N/record',
		'N/search'
		],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {

	/**
	 * Marks the beginning of the Map/Reduce process and generates input data.
	 *
	 * @typedef {Object} ObjectRef
	 * @property {number} id - Internal ID of the record instance
	 * @property {string} type - Record type id
	 *
	 * @return {Array|Object|Search|RecordRef} inputSummary
	 * @since 2015.1
	 */
	function getInputData() {
		try{
			/********* Getting Promotion/Deal InternalIDs which has COPY LINKED RECORDS? check-box is checked  **********/
			return search.create({
				type:'customrecord_itpm_promotiondeal',
				columns: [
					search.createColumn({
						name: "internalid"
					}),
					search.createColumn({
						name: "internalid",
						join: "CUSTRECORD_ITPM_P_COPIEDFROM"
					})
				],
				filters: [
					["custrecord_itpm_p_copiedfrom","noneof","@NONE@"], "and" ,
				    ["custrecord_itpm_p_copy","is","T"]
				]  
			})
		}catch(e){
			log.error(e.name,'getInputData state, message = '+e.message);
		}		 
	}

	/**
	 * Executes when the map entry point is triggered and applies to each key/value pair.
	 *
	 * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
	 * @since 2015.1
	 */
	function map(context) {
		try{
		/********* Dividing the Promotion Id's into key and Linked record Id's into value pair **********/
			var searchResult = JSON.parse(context.value),
			arrResult = searchResult.values,
			promoID = arrResult.internalid.value,
			copyPromoId = arrResult['internalid.CUSTRECORD_ITPM_P_COPIEDFROM'].value,
			contextObj = null,executeResultSet = [];
			

			//getting the iTPM Planning record search results
			getSearchResults("CUSTRECORD_ITPM_PP_PROMOTION",copyPromoId).run().each(function(e){
				if(e.getValue({join:'CUSTRECORD_ITPM_PP_PROMOTION',name:'internalid'})){
					contextObj = {promoID:promoID,copyPromoId:copyPromoId,recId:e.getValue({join:'CUSTRECORD_ITPM_PP_PROMOTION',name:'internalid'}),type:'planning'};
					executeResultSet.push({id:contextObj.recId,type:contextObj.type});
				}
				return true;
			});
			
			//getting the iTPM Allowance record search results
			getSearchResults("CUSTRECORD_ITPM_ALL_PROMOTIONDEAL",copyPromoId).run().each(function(e){
				if(e.getValue({join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL',name:'internalid'})){
					contextObj = {promoID:promoID,copyPromoId:copyPromoId,recId:e.getValue({join:'CUSTRECORD_ITPM_ALL_PROMOTIONDEAL',name:'internalid'}),type:'all'};
					executeResultSet.push({id:contextObj.recId,type:contextObj.type});					
				}
				return true;
			});
			
			//getting the iTPM Est Qty record search results
			getSearchResults("CUSTRECORD_ITPM_ESTQTY_PROMODEAL",copyPromoId).run().each(function(e){
				if(e.getValue({join:'CUSTRECORD_ITPM_ESTQTY_PROMODEAL',name:'internalid'})){
					contextObj = {type:'estqty',promoID:promoID,copyPromoId:copyPromoId,recId:e.getValue({join:'CUSTRECORD_ITPM_ESTQTY_PROMODEAL',name:'internalid'})}
					executeResultSet.push({id:contextObj.recId,type:contextObj.type});
				}
				return true;
			});
			
			//getting the iTPM Retail Info record search results
			getSearchResults("CUSTRECORD_ITPM_REI_PROMOTIONDEAL",copyPromoId).run().each(function(e){
				if(e.getValue({join:'CUSTRECORD_ITPM_REI_PROMOTIONDEAL',name:'internalid'})){
					contextObj = {type:'retail',promoID:promoID,copyPromoId:copyPromoId,recId:e.getValue({join:'CUSTRECORD_ITPM_REI_PROMOTIONDEAL',name:'internalid'})}
					executeResultSet.push({id:contextObj.recId,type:contextObj.type});
				}
				return true;
			});

			log.debug('executeResultSet',executeResultSet);
			
			//Write the data into the context.
			var resultLength = executeResultSet.length-1;
			executeResultSet.forEach(function(e,index){
				if(e.type == 'all'){
					context.write({promoID:promoID,copyPromoId:copyPromoId,recId:e.id,type:e.type,lastResult:resultLength == index})
				}else{
					context.write({type:e.type,promoID:promoID,copyPromoId:copyPromoId,recId:e.id,lastResult:resultLength == index});
				}
			})

			if(executeResultSet.length <= 0){
				record.submitFields({
					type: 'customrecord_itpm_promotiondeal',
					id: promoID,
					values: {
						custrecord_itpm_p_copy: false,
						custrecord_itpm_p_copyinprogress:false
					},
					options: {
						enableSourcing: false,
						ignoreMandatoryFields : true
					}
				});
			}
		
		}catch(e){
			log.error(e.name,'Map state, message = '+e.message+' promoId'+promoID+' copypromoid'+copyPromoId);
		}		
	}

	/**
	 * Executes when the reduce entry point is triggered and applies to each group.
	 *
	 * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
	 * @since 2015.1
	 */
	function reduce(context) {
		try{
			
			var keyObj = JSON.parse(context.key);
			var a = +new Date();
			log.debug('keyObh '+a,keyObj);
			switch(keyObj.type){
			/********* Copying Promotion/Deal Allowances and Saving them into Copied Promotion/Deal Allowances **********/
			case 'all':
				var allRec = record.load({
					type: 'customrecord_itpm_promoallowance',
					id:keyObj.recId
				});
				var itemAvailForITPM = isAvailForITPMChecked(allRec.getValue({fieldId: 'custrecord_itpm_all_item'}));
				log.audit('itemAvailForITPM   '+keyObj.recId,itemAvailForITPM);
				if(itemAvailForITPM){
					var copyRecord = record.copy({
						type: 'customrecord_itpm_promoallowance',
						id:keyObj.recId
					}).setValue({
						fieldId: 'custrecord_itpm_all_account',
						value:allRec.getValue({fieldId: 'custrecord_itpm_all_account'}),
						ignoreFieldChange: true
					}).setValue({
						fieldId: 'custrecord_itpm_all_mop',
						value:allRec.getValue({fieldId: 'custrecord_itpm_all_mop'}),
						ignoreFieldChange: true
					}).setValue({
						fieldId: 'custrecord_itpm_all_promotiondeal',
						value: keyObj.promoID,
						ignoreFieldChange: true
					}).setValue({
						fieldId:'custrecord_itpm_all_estqty',
						value:''
					}).setValue({
						fieldId:'custrecord_itpm_all_contribution',
						value:0
					}).setValue({
						fieldId:'custrecord_itpm_all_contributionadjusted',
						value:false
					}).save({
						enableSourcing: false,
						ignoreMandatoryFields: true
					});
				}			
				break;
			/********* Copying Promotion/Deal Estimate Quantities and Saving them into Copied Promotion/Deal Estimate Quantities **********/
			case 'estqty':
				var copyRecord = record.copy({
					type: 'customrecord_itpm_estquantity',
					id:keyObj.recId
				});
				var itemAvailForITPM = isAvailForITPMChecked(copyRecord.getValue({fieldId: 'custrecord_itpm_estqty_item'}));
				log.audit('itemAvailForITPM   '+keyObj.recId,itemAvailForITPM);
				if(itemAvailForITPM){
					var copiedRecordId = copyRecord.setValue({
						fieldId: 'custrecord_itpm_estqty_promodeal',
						value:keyObj.promoID,
						ignoreFieldChange: true
					}).save({
						enableSourcing: false,
						ignoreMandatoryFields: true
					});

					/************Set EstQty ID in allowance record***********/
					search.create({
						type:'customrecord_itpm_promoallowance',
						columns:['internalid'],
						filters:[['isinactive','is',false],'and',
							['custrecord_itpm_all_promotiondeal','anyof',keyObj.promoID],'and',
							['custrecord_itpm_all_item','anyof',copyRecord.getValue('custrecord_itpm_estqty_item')]]
					}).run().each(function(result){
						record.submitFields({
							type: 'customrecord_itpm_promoallowance',
							id: result.getValue('internalid'),
							values: {
								custrecord_itpm_all_estqty: copiedRecordId
							},
							options: {
								enableSourcing: false,
								ignoreMandatoryFields : true
							}
						});
						return true;
					});
				}
				break;
			/********* Copying Promotion/Deal Retail Info and Saving them into Copied Promotion/Deal Retail Info **********/
			case 'retail':
				var copyRecord = record.copy({
					type: 'customrecord_itpm_promoretailevent',
					id:keyObj.recId
				})
				var itemAvailForITPM = isAvailForITPMChecked(copyRecord.getValue({fieldId: 'custrecord_itpm_rei_item'}));
				log.audit('itemAvailForITPM   '+keyObj.recId,itemAvailForITPM);
				if(itemAvailForITPM){
					copyRecord.setValue({
						fieldId: 'custrecord_itpm_rei_promotiondeal',
						value:keyObj.promoID,
						ignoreFieldChange: true
					}).save({
						enableSourcing: false,
						ignoreMandatoryFields: true
					});
				}				 
				break;
			case 'planning':
				record.copy({
					type: 'customrecord_itpm_promotion_planning',
					id:keyObj.recId
				}).setValue({
					fieldId: 'custrecord_itpm_pp_promotion',
					value:keyObj.promoID,
					ignoreFieldChange: true
				}).save({
					enableSourcing: false,
					ignoreMandatoryFields: true
				});
				break;
			}
			
			//changing the field values of the promotion deal record.
			if(keyObj.lastResult){
		/********* UN-checking the COPY LINKED RECORDS? and Copy In Progress? fields  **********/
				
				var id = record.submitFields({
				    type: 'customrecord_itpm_promotiondeal',
				    id: keyObj.promoID,
				    values: {
				    	custrecord_itpm_p_copy: false,
				    	custrecord_itpm_p_copyinprogress:false
				    },
				    options: {
				        enableSourcing: false,
				        ignoreMandatoryFields : true
				    }
				});
//				log.debug('id',id);
			}
			
		}catch (e) {
			log.error(e.name,'Reduce state, message = '+e.message+' copyPromoId'+keyObj.promoID);
		}
	}


	/**
	 * Executes when the summarize entry point is triggered and applies to the result set.
	 *
	 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
	 * @since 2015.1
	 */
	function summarize(summary) {
		log.debug('summary state',summary)
	}

	/**
	 * Returns the true/false based on the  AVAILABLE FOR ITPM? check-box on item record
	 * @param itemId
	 */
	function isAvailForITPMChecked(itemID) {
		return search.lookupFields({
			type:search.Type.ITEM,
			id:itemID,
			columns:['custitem_itpm_available']
		}).custitem_itpm_available
	}
	
	/**
	 * Returns search object to get Promotion linked records
	 * @param {string} lineType
	 * @param {number} copyPromoId
	 */
	function getSearchResults(lineType, copyPromoId){
		return search.create({
			   type: "customrecord_itpm_promotiondeal",
			   filters: [
				   ["internalid",'is',copyPromoId],"AND",
				   [(lineType+".isinactive").toString(),"is",false]
			   ],
			   columns: [
			      search.createColumn({
			         name: "internalid"
			      }),
			      search.createColumn({
			    	  name: "internalid",
			    	  join: lineType
			      }),
			      search.createColumn({
			         name: "internalid",
			         join: "CUSTRECORD_ITPM_P_COPIEDFROM"
			      })
			   ]
			});
	}
	
	return {
		getInputData: getInputData,
		map: map,
		reduce: reduce,
		summarize: summarize
	};

});
