/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 * Showing the overlapping promotions in a list view(comparing with the Estimated quantity items in that promotion to other promotions which are in between start & end Dates of current promotion)
 */

define(['N/render',
		'N/search'
		],

function(render,search) {
	function onRequest(context){
		try{
			var request = context.request,response = context.response,params = request.parameters;

			if(request.method == 'GET'){
				var estQtyItems = [],overlap = [];
				var renderer = render.create();
//				var scriptString = 'var app=angular.module("overlapdeals",[]);app.controller("overlapCtrl",function($scope,$http){$scope.lists=${OVERLAP_LIST.list};})</script>'
//					renderer.templateContent = '<html ng-app=overlapdeals><link href=https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css rel=stylesheet><script src=https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.5.6/angular.min.js></script><style>'+
//					'table>td{border: none !important;border-bottom: 1px solid #EBEBEB !important;}'+
//					'th{color: #4a4a4a;font-size:11px;background-color:#E5E5E5!important;font-weight:inherit!important}'+
//					'td{font-size:13px;border-bottom: 1px solid #EBEBEB !important;}.form-control{width:11%}'+
//					'table{ border: none !important;}</style>'+
//					'<body ng-controller=overlapCtrl>'+
//					'<table class="table table-striped"><thead><tr><th>ITEM<th>ITEM CODE<th>PROMOTION / DEAL<th>SHIP START<th>SHIP END<th>DAYS OVERLAPPING<th>PROMOTION/DEAL STATUS<th>PROMOTION/DEAL CONDITION<th>PROMOTION/DEAL ID<th>PROMOTION TYPE<th>TOTAL ALLOWANCES AS %<th>TOTAL ALLOWANCE PER UOM<th>UOM</thead>'+
//					'<tbody><tr ng-repeat="list in lists track by $index"><td>{{list.itemName}}<td>{{list.itemCode}}<td>{{list.promoDealName}}<td>{{list.startDate}}<td>{{list.endDate}}<td>{{list.dayOverLap}}<td>{{list.promoDealStatus}}<td>{{list.promoDealCondition}}<td><a href="/app/common/custom/custrecordentry.nl?rectype='+params.rectype+'&id={{list.promoDealId}}" target="_blank">{{list.promoDealId}}</a><td>{{list.promoType}}<td>{{list.totaluom}}<td>{{list.totalPercent}}<td>{{list.uom}}<tr ng-if="lists.length == 0"><td colspan=13>No records to show.</table><script>'+scriptString;
			
				var customStyle = '<style>html{font-family: sans-serif}body{margin: 0;}th{text-align:left}.table{width:100%;max-width:100%;margin-bottom:20px}.table-striped>tbody>tr:nth-of-type(odd){background-color:#f9f9f9}table{background-color:transparent;border-spacing:0;border-collapse:collapse}.table>tbody>tr>td,.table>tbody>tr>th,.table>tfoot>tr>td,.table>tfoot>tr>th,.table>thead>tr>td,.table>thead>tr>th{padding:8px;line-height:1.42857143;vertical-align:top;border-top:1px solid #ddd}a{color: #23527c;text-decoration: none}a:focus,a:hover{text-decoration: underline}'+
				'table>td{border: none !important;border-bottom: 1px solid #EBEBEB !important;}'+
				'th{color: #4a4a4a;font-size:11px;background-color:#E5E5E5!important;font-weight:inherit!important}'+
				'td{font-size:13px;border-bottom: 1px solid #EBEBEB !important;}.form-control{width:11%}'+
				'table{ border: none !important;}</style>';
				
				var scriptString = '<script>var list = ${OVERLAP_LIST.list};var i=0;var t=document.getElementById("overlap-tbody");if(0==list.length){var newRow=t.insertRow(i),newCell0=newRow.insertCell(0),newText=document.createTextNode("No records to show.");newCell0.setAttribute("colspan","13");newCell0.appendChild(newText)}list.forEach(function(e){d=t.insertRow(i),a=d.insertCell(0),n=d.insertCell(1),l=d.insertCell(2),o=d.insertCell(3),r=d.insertCell(4),p=d.insertCell(5),c=d.insertCell(6),C=d.insertCell(7),m=d.insertCell(8),s=d.insertCell(9),u=d.insertCell(10),h=d.insertCell(11),v=d.insertCell(12),N=document.createTextNode(e.itemName);a.appendChild(N);var N=document.createTextNode(e.itemCode);n.appendChild(N);var N=document.createTextNode(e.promoDealName);l.appendChild(N);var N=document.createTextNode(e.startDate);o.appendChild(N);var N=document.createTextNode(e.endDate);r.appendChild(N);var N=document.createTextNode(e.dayOverLap);p.appendChild(N);var N=document.createTextNode(e.promoDealStatus);c.appendChild(N);var N=document.createTextNode(e.promoDealCondition);C.appendChild(N);var N=document.createElement("a");N.setAttribute("href","/app/common/custom/custrecordentry.nl?rectype='+params.rectype+'&id="+e.promoDealId);N.setAttribute("target","_blank");N.innerHTML=e.promoDealId;m.appendChild(N);var N=document.createTextNode(e.promoType);s.appendChild(N);var N=document.createTextNode(e.totaluom);u.appendChild(N);var N=document.createTextNode(e.totalPercent);h.appendChild(N);var N=document.createTextNode(e.uom);v.appendChild(N),i++});</script>';
				
					renderer.templateContent = '<html>'+customStyle+
					'<body>'+
					'<table class="table table-striped"><thead><tr><th>ITEM<th>ITEM CODE<th>PROMOTION / DEAL<th>SHIP START<th>SHIP END<th>DAYS OVERLAPPING<th>PROMOTION/DEAL STATUS<th>PROMOTION/DEAL CONDITION<th>PROMOTION/DEAL ID<th>PROMOTION TYPE<th>TOTAL ALLOWANCES AS %<th>TOTAL ALLOWANCE PER UOM<th>UOM</thead>'+
					'<tbody id="overlap-tbody"></tbody></table>'+scriptString;
				
				

				//getting the Promotion/Deal Estimated Qty list
				search.create({
					type:'customrecord_itpm_estquantity',
					columns:['custrecord_itpm_estqty_item'],
					filters:[['custrecord_itpm_estqty_promodeal','anyof',params.pdid]]
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
								['custrecord_itpm_p_customer','anyof',params.cid],'and',['custrecord_itpm_p_status','noneof',[5,7]]]	    		
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
							filters:[['custrecord_itpm_estqty_promodeal','anyof',promoDealSearchId],'and',
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
			log.error(e.name,'record type = iTPM Promotion, record id='+params.pdid+', message = '+e.message);
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
	
	return {
		onRequest:onRequest
	}
})   