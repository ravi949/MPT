/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * This script is used to return the duplicate detection of KPI record for the allowance ITEM
 */
define(['N/search',
		'N/runtime'
		],

function(search, runtime) {

	/**
	 * Definition of the Suitelet script trigger point.
	 *
	 * @param {Object} scriptContext
	 * @param {Record} scriptContext.newRecord - New record
	 * @param {Record} scriptContext.oldRecord - Old record
	 * @Since 2016.1
	 */
	function onAction(scriptContext) {
		try{
			
			var itpmKPISearchObj = search.create({
				type: 'customrecord_itpm_kpi',

				filters : [
					search.createFilter({
						name     : 'custrecord_itpm_kpi_promotiondeal',
						operator : 'anyof',
						values   : runtime.getCurrentScript().getParameter({
							name  : 'custscript_itpm_kpi_dupdetection_promo'
						})  
					}),
					search.createFilter({
						name     : 'custrecord_itpm_kpi_item',
						operator : 'anyof',
						values   : runtime.getCurrentScript().getParameter({
							name  : 'custscript_itpm_kpi_dupdetection_item'
						})
					}),
					search.createFilter({
						name     : 'isinactive',
						operator : 'is',
						values   : false
					})
				  ],

				  columns : [
					 search.createColumn({
					  name: 'internalid'
					 })
				  ]
			});

    		var itpmKPISearchResults = itpmKPISearchObj.run().getRange({
    			start: 0,
    			end : 10
    		});

			log.debug('itpmKPISearchResults Length', itpmKPISearchResults.length);
    		return (itpmKPISearchResults.length > 0) ? 'T' : 'F';
			
		}catch(e){
			log.error(e.name,e.message);
			return 'T';
		}
	}

	return {
		onAction : onAction
	};
});