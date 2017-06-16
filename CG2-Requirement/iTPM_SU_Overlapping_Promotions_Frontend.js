/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * Showing the overlapping promotions in a list view(comparing with the Estimated quantity items in that promotion to other promotions which are in between start & end Dates of current promotion)
 */

define(['N/render','N/search'],

function(render,search) {
	function onRequest(context){
		try{
			var request = context.request,response = context.response;

			if(request.method == 'GET'){
				var params = request.parameters,estQtyItems = [],overlap = [];
				var renderer = render.create();
				var scriptString = 'var app=angular.module("overlapdeals",[]);app.controller("overlapCtrl",function($scope,$http){$scope.lists=${OVERLAP_LIST.list};})</script>'
					renderer.templateContent = '<html ng-app=overlapdeals><link href=https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css rel=stylesheet><script src=https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.5.6/angular.min.js></script><style>'+
					'table>td{border: none !important;border-bottom: 1px solid #EBEBEB !important;}'+
					'th{color: #4a4a4a;font-size:11px;background-color:#E5E5E5!important;font-weight:inherit!important}'+
					'td{font-size:13px;border-bottom: 1px solid #EBEBEB !important;}.form-control{width:11%}'+
					'table{ border: none !important;}</style>'+
					'<body ng-controller=overlapCtrl>'+
					'<table class="table table-striped"><thead><tr><th>ITEM<th>ITEM CODE<th>PROMOTION / DEAL<th>SHIP START<th>SHIP END<th>DAYS OVERLAPPING<th>PROMOTION/DEAL STATUS<th>PROMOTION/DEAL CONDITION<th>PROMOTION/DEAL ID<th>PROMOTION TYPE<th>TOTAL ALLOWANCES AS %<th>TOTAL ALLOWANCE PER UOM<th>UOM</thead>'+
					'<tbody><tr ng-repeat="list in lists track by $index"><td>{{list.itemName}}<td>{{list.itemCode}}<td>{{list.promoDealName}}<td>{{list.startDate}}<td>{{list.endDate}}<td>{{list.dayOverLap}}<td>{{list.promoDealStatus}}<td>{{list.promoDealCondition}}<td><a href="/app/common/custom/custrecordentry.nl?rectype='+params.rectype+'&id={{list.promoDealId}}" target="_blank">{{list.promoDealId}}</a><td>{{list.promoType}}<td>{{list.totaluom}}<td>{{list.totalPercent}}<td>{{list.uom}}<tr ng-if="lists.length == 0"><td colspan=13>No records to show.</table><script>'+scriptString;			

				//getting the Promotion/Deal Estimated Qty list
				search.create({
					type:'customrecord_itpm_estquantity',
					columns:['custrecord_itpm_estqty_item'],
					filters:[['custrecord_itpm_estqty_promodeal','is',params.pdid]]
				}).run().each(function(e){
					estQtyItems.push(e.getValue('custrecord_itpm_estqty_item'));
					return true;
				});


				if(estQtyItems.length>0){
					search.create({
						type:'customrecord_itpm_promotiondeal',
						columns:['internalid','name','custrecord_itpm_p_status','custrecord_itpm_p_condition','custrecord_itpm_p_type.name','custrecord_itpm_p_shipstart','custrecord_itpm_p_shipend'],
						filters:[[['custrecord_itpm_p_shipstart','before', params.start],'and',
							['custrecord_itpm_p_shipend','after', params.end]],'or',[['custrecord_itpm_p_shipstart','within', params.start, params.end],'or',
								['custrecord_itpm_p_shipend','within', params.start, params.end]],'and',
								['isinactive','is',false],'and',['internalid','noneof', params.pdid],'and',
								['custrecord_itpm_p_customer','is',params.cid],'and',['custrecord_itpm_p_status','noneof',[5,7]]]	    		
					}).run().each(function(e){
						var promoDealSearchId = e.getValue('internalid'),
						promoDealStatus = e.getText('custrecord_itpm_p_status'),
						promoDealCondition = e.getText('custrecord_itpm_p_condition');
						//getting the overlapping days
						overlappedDays = getOverlappingDays(params.start,params.end,e.getValue('custrecord_itpm_p_shipstart'),e.getValue('custrecord_itpm_p_shipend'));
						//if over lapped days are 0 than reversing the date and calculate the overlapped days again.
						if(overlappedDays == 0){
							overlappedDays = getOverlappingDays(e.getValue('custrecord_itpm_p_shipstart'),e.getValue('custrecord_itpm_p_shipend'),params.start,params.end);
						}

						search.create({
							type:'customrecord_itpm_estquantity',
							columns:['custrecord_itpm_estqty_item','custrecord_itpm_estqty_qtyby','custrecord_itpm_estqty_totalrate','custrecord_itpm_estqty_totalpercent'],
							filters:[['custrecord_itpm_estqty_promodeal','is',promoDealSearchId],'and',
								['isinactive','is',false],'and',['custrecord_itpm_estqty_item','anyof',estQtyItems]]
						}).run().each(function(estQty){
							log.debug('estQty',estQty)
							overlap.push({itemName:estQty.getText('custrecord_itpm_estqty_item'),itemCode:estQty.getValue('custrecord_itpm_estqty_item'),promoDealName:e.getValue('name'),startDate:e.getValue('custrecord_itpm_p_shipstart'),
								endDate:e.getValue('custrecord_itpm_p_shipend'),promoDealStatus:promoDealStatus,
								promoDealCondition:promoDealCondition,promoDealId:promoDealSearchId,promoType:e.getValue({name:'name',join:'custrecord_itpm_p_type'}),
								dayOverLap:overlappedDays,totaluom:estQty.getValue('custrecord_itpm_estqty_totalrate'),totalPercent:estQty.getValue('custrecord_itpm_estqty_totalpercent'),uom:estQty.getText('custrecord_itpm_estqty_qtyby')
							});
							return true;
						})
						return true;
					});
				}

				renderer.addCustomDataSource({
					format: render.DataSource.OBJECT,
					alias: "OVERLAP_LIST",
					data: {list:JSON.stringify(overlap)}
				});
				var output = renderer.renderAsString();
				response.write(output);
			}
		}catch(e){
			log.error('exception',e);
//			throw Error(e.message);
		}
	}


	//getting the overlapping days
	function getOverlappingDays(start1,end1,start2,end2){
		var startIsBetween = false,EndIsBetween = false,diffDays=0;

		if(Date.parse(start1) <= Date.parse(start2) && Date.parse(end1) >= Date.parse(start2)){
			startIsBetween = true;
		}

		if(Date.parse(start1) <= Date.parse(end2) && Date.parse(end1) >= Date.parse(end2)){
			EndIsBetween = true;
		}

		if(startIsBetween && EndIsBetween){
			//difference between s2 date and e2 date
			diffDays = getDifference(end2,start2)
		}else if(!startIsBetween && EndIsBetween){
			//difference between s1 date and e2 date
			diffDays = getDifference(end2,start1)
		}else if(startIsBetween && !EndIsBetween){
			//difference between s2 date and e1 date
			diffDays = getDifference(end1,start2)
		}
		return diffDays;
	}


	//function getDifference
	function getDifference(date1,date2){
		var date1 = new Date(date1),date2 = new Date(date2),
		timeDiff = Math.abs(date2.getTime() - date1.getTime());
		diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); 
		return diffDays;
	}	

	/*filters:[[['custrecord_itpm_p_shipstart','within',params.start,params.end],'or',
	          ['custrecord_itpm_p_shipend','within',params.start,params.end]],'and',
	          ['isinactive','is',false],'and',['internalid','noneof',params.pdid],'and',
	          ['custrecord_itpm_p_customer','is',params.cid],'and',['custrecord_itpm_p_status','noneof',[5,7]]]*/

	return {
		onRequest:onRequest
	}
})   