/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 * Validating the Start(shipStartDate,orderStartDate,perfomanceStartDate) and End dates(shipEndDate,orderEndDate,perfomanceEndDate) of promotion for submitting the promotion
 */
define(['N/runtime','N/record'],

		function(runtime,record) {

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
			var promoDealRec = scriptContext.newRecord,
			role = runtime.getCurrentUser().role,
			promoTypeRec = record.load({type:'customrecord_itpm_promotiontype',id:scriptContext.newRecord.getValue('custrecord_itpm_p_type')}),
			orderDateEnabled = promoTypeRec.getValue('custrecord_itpm_pt_orderdates'),
			performanceDateEnabled = promoTypeRec.getValue('custrecord_itpm_pt_performancedates'); 

			//start date checking with today date
			var orderStartDate = promoDealRec.getValue('custrecord_itpm_p_orderstart'),
			shipStartDate = promoDealRec.getValue('custrecord_itpm_p_shipstart'),
			perfomanceStartDate = promoDealRec.getValue('custrecord_itpm_p_perfstart'),
			today = new Date();

			//getting the end date from the promotion deal record
			var orderEndDate = promoDealRec.getValue('custrecord_itpm_p_orderend'),
			shipEndDate = promoDealRec.getValue('custrecord_itpm_p_shipend'),
			performanceEndDate = promoDealRec.getValue('custrecord_itpm_p_perfend');


			var startDatesArray = [];
			if(orderDateEnabled && performanceDateEnabled){
				startDatesArray = [shipStartDate,orderStartDate,perfomanceStartDate];
				var startDateNotWithToday = (orderStartDate >= today && shipStartDate >= today && perfomanceStartDate >= today);
				var endDateNotMatchWithStartDate =(orderEndDate > orderStartDate && shipEndDate > shipStartDate && performanceEndDate > perfomanceStartDate);
				var startAndEndDateConditionNotMatch = (orderStartDate <= shipStartDate && orderEndDate <= shipEndDate && perfomanceStartDate >= shipStartDate && performanceEndDate >= shipEndDate);
			}   		
			else if(orderDateEnabled && !performanceDateEnabled){
				startDatesArray = [shipStartDate,orderStartDate];
				var startDateNotWithToday = (orderStartDate >= today && shipStartDate >= today);
				var endDateNotMatchWithStartDate =(orderEndDate > orderStartDate && shipEndDate > shipStartDate);
				var startAndEndDateConditionNotMatch = (orderStartDate <= shipStartDate && orderEndDate <= shipEndDate);
			}
			else if(!orderDateEnabled && performanceDateEnabled){
				startDatesArray = [shipStartDate,perfomanceStartDate];
				var startDateNotWithToday = (shipStartDate >= today && perfomanceStartDate >= today);
				var endDateNotMatchWithStartDate =(shipEndDate > shipStartDate && performanceEndDate > perfomanceStartDate);
				var startAndEndDateConditionNotMatch = (perfomanceStartDate >= shipStartDate && performanceEndDate >= shipEndDate);
			}
			else{
				startDatesArray = [shipStartDate];
				var startDateNotWithToday = (shipStartDate >= today);
				var endDateNotMatchWithStartDate =(shipEndDate > shipStartDate);
				var startAndEndDateConditionNotMatch = true
			}


			//start date checking with today date
			if(!startDateNotWithToday && role != 3){
				return startDateNotWithToday.toString();
			}

			//checking with end date are greather than start date 
			if(!endDateNotMatchWithStartDate){
				return endDateNotMatchWithStartDate.toString();
			}

			//checking the ship start and end dates with other end date condition
			if(!startAndEndDateConditionNotMatch){
				return startAndEndDateConditionNotMatch.toString();
			}

			//checking dates have no of months difference b/w stardates and today date lessthan or equal to 24 months
			return startDatesArray.some(function(e){
				return monthDiff(new Date(e.getFullYear(),e.getDate(),e.getMonth()),today) == true;
			}).toString();
		}catch(e){
			log.error('exception in date validation',e);
		}
	}


	//finding the number of months difference between dates
	function monthDiff(d1, d2) {
		var months;
		months = (d2.getFullYear() - d1.getFullYear()) * 12;
		months -= d1.getMonth() + 1;
		months += d2.getMonth();
		months = months <= 0 ? 0 : months;
		return months <= 24;
	}


	return {
		onAction : onAction
	};

});
