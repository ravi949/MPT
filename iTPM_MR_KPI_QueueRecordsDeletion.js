/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/search',
	    'N/record'
	],

	function(search,record) {

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
			//search for KPI Queue Records which are 60 days ago
			return search.create({
				type: "customrecord_itpm_kpiqueue",
				filters:["created","before","sixtydaysago"],
				columns:
					[
						search.createColumn({name: "name", label: "ID"}),
						search.createColumn({name: "custrecord_itpm_kpiq_promotion", label: "Promotion"})
					]
			});
		}catch(e){
			log.error(e.name,e.message);
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
			var kpiQueueRecObj  = JSON.parse(context.value);
			var kpiQueueRecObjId = kpiQueueRecObj.id;
			
			//search for dependent records i.e iTPM Queue Detail records
			var kpiQueueDetailSearchObj = search.create({
				type: 'customrecord_itpm_kpiqueuedetail',
				columns:['internalid'],
				filters:['custrecord_itpm_kpiqmap_parent','anyof',kpiQueueRecObjId]
			}).run().each(function(e){
				var kpiQueueDetailRecID = e.getValue('internalid');
				log.debug('iid',e.getValue('internalid'));
				var kpiQueueRecord = record.delete({
					type: 'customrecord_itpm_kpiqueuedetail',
					id: kpiQueueDetailRecID,
				});
				return true;
			});
			
			//Deleting KPI Queue Record
			var kpiQueueRecord = record.delete({
				type: 'customrecord_itpm_kpiqueue',
				id: kpiQueueRecObjId,
			}); 
		}catch(e){
			log.error(e.name,e.message);
		}
	}

	/**
	 * Executes when the reduce entry point is triggered and applies to each group.
	 *
	 * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
	 * @since 2015.1
	 */
	function reduce(context) {

	}


	/**
	 * Executes when the summarize entry point is triggered and applies to the result set.
	 *
	 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
	 * @since 2015.1
	 */
	function summarize(summary) {

	}

	return {
		getInputData: getInputData,
		map: map,
//		reduce: reduce,
		summarize: summarize
	};

});
