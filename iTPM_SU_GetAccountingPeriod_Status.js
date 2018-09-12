/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/search'],
		/**
		 * @param {search} search
		 */
		function(search) {

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
			if(context.request.method == 'GET'){
				log.debug('params',context.request.parameters);

				//search for account period is closed or not
				var postingPeriodId = context.request.parameters.popid;
				var accountingperiodSearchObj = search.create({
					type: "accountingperiod",
					filters:
						[
							["alllocked","is","T"], 
							"AND", 
							["internalid","anyof",postingPeriodId]
							],
							columns:['internalid']
				});
				var isAcntngprdClosed = accountingperiodSearchObj.runPaged().count;
				log.debug("accountingperiodSearchObj result count",isAcntngprdClosed);
				context.response.write(JSON.stringify({success : true, period_closed : isAcntngprdClosed > 0 }));
			}
		}catch(ex){
			log.error(ex.name,ex.message);
		}

	}

	return {
		onRequest: onRequest
	};

});
