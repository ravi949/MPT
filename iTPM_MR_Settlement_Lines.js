/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope TargetAccount
 */
define(['N/record',
		'N/search',
		'N/runtime',
		'./iTPM_Module.js'
		],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, runtime, itpm) {
   
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
    		var settlementRectypeId = runtime.getCurrentScript().getParameter('custscript_itpm_setlment_rec_type');
    		log.debug('settlementRectypeId in getInputData',settlementRectypeId); 
    		return search.create({
				type:'customtransaction_itpm_settlement',
				columns: [
					 search.createColumn({
				         name: "internalid",
				         summary: "GROUP"
				      }),
				      search.createColumn({
				         name: "custbody_itpm_set_promo",
				         summary: "GROUP"
				      })
				],
				filters: [
					["internalid","noneof","@NONE@"], 
				    "AND", 
				    ["status","anyof","Custom"+settlementRectypeId+":E"]
				]  
			})
    		
    	}catch(e){
    		log.error(e.name+'  getInputData',e.message);
    	}

    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	var searchResult = JSON.parse(context.value);
		log.debug('searchResult in map',searchResult); 
    	try{
    		var departmentsExists = itpm.departmentsEnabled();
    		var classesExists = itpm.classesEnabled();
    		var setId = searchResult.values["GROUP(internalid)"]["value"];
    		var promoID = searchResult.values["GROUP(custbody_itpm_set_promo)"]["value"];
    		//If all allowances rates are zero then we calculate evenly
    		var allCount = 0;
    		//Getting the greater than 0.00 rate per unit allowances
    		var allRateGrtThanZeroSearch = search.create({
    			type: "customrecord_itpm_promoallowance",
    			columns:[
    						search.createColumn({
    							name:'internalid',
    							summary:search.Summary.COUNT
    						})
    			         ],
    			filters: [
    					   ["custrecord_itpm_all_promotiondeal","anyof",promoID], 
    					   "AND", 
    					   ["custrecord_itpm_all_rateperuom","greaterthan","0.00"]
    					 ]  
    		}).run().getRange(0,1);
    		allCount = parseFloat(allRateGrtThanZeroSearch[0].getValue({name:'internalid',summary:search.Summary.COUNT}));
    		log.debug('allRateGrtThanZeroSearch for setId'+setId, allCount);
    		//Getting the Promotion Type ID
    		var promoTypeId = search.lookupFields({
    		    type:'customrecord_itpm_promotiondeal',
    		    id:promoID,
    		    columns:['custrecord_itpm_p_type']
    		}).custrecord_itpm_p_type[0].value;
    		log.debug('promoTypeId  ',promoTypeId);
    		//Getting the 	DO NOT update Liability based on Actuals value
    		var updateOnActuals = search.lookupFields({
    		    type:'customrecord_itpm_promotiontype',
    		    id:promoTypeId ,
    		    columns:['custrecord_itpm_pt_dontupdate_lbonactual']
    		}).custrecord_itpm_pt_dontupdate_lbonactual;
    		log.debug('updateOnActuals  ',updateOnActuals);
    		
    		var promoLineSearch = search.create({
    			type:'customrecord_itpm_promotiondeal',
    			columns:['name'
    				     ,'custrecord_itpm_all_promotiondeal.internalid'
    					 ,'custrecord_itpm_all_promotiondeal.custrecord_itpm_all_item'
    					 ,'custrecord_itpm_all_promotiondeal.custrecord_itpm_all_mop'
    					 ,'custrecord_itpm_all_promotiondeal.custrecord_itpm_all_account'
    					 ,'custrecord_itpm_all_promotiondeal.custrecord_itpm_all_contribution'
    					 ,'custrecord_itpm_all_promotiondeal.custrecord_itpm_all_type'
    					 ,'custrecord_itpm_all_promotiondeal.custrecord_itpm_all_allowancepercent'
    					 ,'custrecord_itpm_all_promotiondeal.custrecord_itpm_all_uom'
    					 ,'custrecord_itpm_all_promotiondeal.custrecord_itpm_all_allowancerate'
    					 ],
    					 filters:[
    						       ['internalid','anyof',promoID], 'and', 
    						       ['custrecord_itpm_all_promotiondeal.isinactive','is','F']
    						     ]
    		}).run().each(function(result){
    			context.write({
					key:{
						promoId:promoID,
						setId:setId
					},
					value:{
						promoname:result.getValue('name'),
						allid:result.getValue({name:'internalid',join:'custrecord_itpm_all_promotiondeal'}),
						item:result.getValue({name:'custrecord_itpm_all_item',join:'custrecord_itpm_all_promotiondeal'}),
						itemtxet:result.getText({name:'custrecord_itpm_all_item',join:'custrecord_itpm_all_promotiondeal'}),
						mop:result.getValue({name:'custrecord_itpm_all_mop',join:'custrecord_itpm_all_promotiondeal'}),
						account:result.getValue({name:'custrecord_itpm_all_account',join:'custrecord_itpm_all_promotiondeal'}),
						contribution:result.getValue({name:'custrecord_itpm_all_contribution',join:'custrecord_itpm_all_promotiondeal'}),
						type:result.getValue({name:'custrecord_itpm_all_type',join:'custrecord_itpm_all_promotiondeal'}),
						percent:result.getValue({name:'custrecord_itpm_all_allowancepercent',join:'custrecord_itpm_all_promotiondeal'}),
						uom:result.getValue({name:'custrecord_itpm_all_uom',join:'custrecord_itpm_all_promotiondeal'}),
						rate:result.getValue({name:'custrecord_itpm_all_allowancerate',join:'custrecord_itpm_all_promotiondeal'}),
						allcount:allCount,
						updateonactuals:updateOnActuals,
						clsenable:classesExists,
						deptenable:departmentsExists
					}
				});
    			return true;
    		});    		
    	}catch(e){
    		log.error(e.name+'  MAP',e.message+'settlement Id:- '+searchResult.values["GROUP(internalid)"]["value"]);
    	}

    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
    	var key = JSON.parse(context.key);
    	var val = JSON.parse(context.values[0]);
		log.debug('key in Reduce',key); 
		log.debug('Value in Reduce',val);
    	try{
    		
    		//creating empty arrays to store settlement lines
    		var setlLines = [];
    		var lsLines = [];
    		var bbLines = [];
    		var oiLines = [];
    		var tempAmountLS = 0;
    		var tempAmountBB = 0;
    		var tempAmountOI = 0;
    		var allCount = val.allcount;//If all allowances rates are zero then we calculate evenly
    		var updateOnActuals = val.updateonactuals//If all allowances rates are zero then we calculate evenly
    		var settlementRec = record.load({
    			type:'customtransaction_itpm_settlement',
    			id:key.setId
    		});
    		log.debug('settlementRec Status in Reduce',settlementRec.getValue('transtatus'));
    		if(settlementRec.getValue('transtatus') == 'C') return;
    		
    		var linecount = settlementRec.getLineCount({sublistId:'line'});
    		var setCreditMemo = settlementRec.getSublistValue({ sublistId: 'line',fieldId: 'memo',line: linecount-1});
    		var lumsumSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqls'));
    		var billbackSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqbb'));
    		var offinvoiceSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqoi'));
    		var setCust = settlementRec.getValue('custbody_itpm_customer');
    		var setIsApplied = settlementRec.getValue('custbody_itpm_appliedto');
//    		log.debug('setIsApplied in Reduce',setCreditMemo); 
    		
    		var subsidiaryID = (itpm.subsidiariesEnabled())? settlementRec.getValue('subsidiary') : undefined;
    		var settlementAccnt = itpm.getPrefrenceValues(subsidiaryID).settlementAccnt;
    		//For line level classification
    		var departmentsExists = val.departmentsExists;
    		var classesExists = val.clsenable;
    		var promoLineSearchForKPI = search.create({
    			type:'customrecord_itpm_promotiondeal',
    			columns:[
    				'name'
    				,'custrecord_itpm_p_account'
    				,'custrecord_itpm_kpi_promotiondeal.internalid'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_item'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_factorestbb'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_factorestoi'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_factorestls'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_factoractualbb'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_factoractualoi'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_factoractualls'
                    ,'custrecord_itpm_p_type.custrecord_itpm_pt_defaultaccount'
    				],
    				filters:[
    							['internalid','anyof',key.promoId], 'and', 
    							['custrecord_itpm_kpi_promotiondeal.isinactive','is','F']
    						]
    		}).run().getRange(0,1000);
    		var kpilength = promoLineSearchForKPI.length;
    		
    		//Checking for shipments for promotion 
    		//promoDeal Record Load
			var promoDealRecord = search.lookupFields({
				type: 'customrecord_itpm_promotiondeal',
				id: key.promoId,
				columns: ['custrecord_itpm_p_shipstart','custrecord_itpm_p_shipend','custrecord_itpm_p_customer']
			});
    		//estimated volume search to get the items list
			var estVolumeItems = [];
			search.create({
				type:'customrecord_itpm_estquantity',
				columns:['custrecord_itpm_estqty_item'],
				filters:[['custrecord_itpm_estqty_promodeal','anyof',key.promoId],'and',
					['isinactive','is',false]]
			}).run().each(function(e){
				estVolumeItems.push(e.getValue('custrecord_itpm_estqty_item'));
				return true;
			});
    		var promoHasShippments = promoHasShipments(estVolumeItems
    												 ,promoDealRecord['custrecord_itpm_p_customer'][0].value
    												 ,promoDealRecord['custrecord_itpm_p_shipstart']
    												 ,promoDealRecord['custrecord_itpm_p_shipend']
    												);
    		log.debug('promoHasShippments',promoHasShippments);
    		
    		if(billbackSetReq > 0 || offinvoiceSetReq > 0){
    			//Adding BB & OI line values to jsonArray 
    			context.values.forEach(function(val){
    				var allValues = JSON.parse(val);
    				log.debug('allValues  in Reduce',allValues);
    				var allType = allValues.type;
    				var allMOP = allValues.mop;
    				var setlmemo = " ";
    				var adjustSetlmemo = " ";		    			
    				var factorBB = 1;
    				var factorOI = 1;
    				var lineAmount = 0;
    				//Getting KPI values for relative item on Allowances
    				for(var i = 0; i< kpilength; i++){
    					var kpiItem = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_item'});
    					if(allValues.item == kpiItem){
    						if(promoHasShippments){
    							factorBB = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factoractualbb'});
    							factorOI = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factoractualoi'});
    						}else{
    							factorBB = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factorestbb'});
    							factorOI = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factorestoi'});
    						}
    						if(allCount == 0 && !updateOnActuals){
    							factorBB = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factorestbb'});
    							factorOI = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factorestoi'});
    						}
    					}
    				}
    				//for Line memo value
    					setlmemo = ((allMOP == 1)?" BB ":" OI ")
    					+ " Settlement for Item : " + allValues.itemtxet + " on Promotion "+allValues.promoname;
    					adjustSetlmemo = ((allType == 1)?allValues.rate:allValues.percent) + "  per " + allValues.uom;
    					
    				log.debug('allType  in Reduce',setlmemo);
    				//Creating the Bill-back lines to the settlement record based on the BB allowance lines in the promotion
    				if(allMOP == 1 && billbackSetReq > 0){                      
    					log.audit('--billbackSetReq & factorBB & contribution--'+key.setId, billbackSetReq+' & '+factorBB+' & '+allValues.contribution);
    					log.audit('--BB AMOUNT--'+key.setId, billbackSetReq * factorBB * allValues.contribution);
    					lineAmount = (billbackSetReq * parseFloat(factorBB) * parseFloat(allValues.contribution)).toFixed(2);
    					//If all allowances rates are zero then we calculate evenly
    					if(lineAmount == 0){ 
    						if(allCount == 0) 
							lineAmount = (billbackSetReq * parseFloat(factorBB)).toFixed(2);
    					}
    					tempAmountBB += parseFloat(lineAmount);
    					if(lineAmount > 0 ){	
    						bbLines.push({ lineType:'bb',
        						id:'2',
        						item:allValues.item,
        						account:allValues.account,
        						type:'debit',
        						memo:setlmemo,
        						amount:parseFloat(lineAmount),
        						adjustmemo:adjustSetlmemo,
        						allocationFactor:factorBB,
        						allId:allValues.allid,
        						cls:(classesExists)?itemClass(allValues.item):'',
        						dept:(departmentsExists)?itemDepartment(allValues.item):''
        					});
    					}
    					//Creating the Off-Invoice lines to the settlement record based on the OI allowance lines in the promotion
    				}else if(allMOP == 3 && offinvoiceSetReq > 0){
    					log.audit('--offinvoiceSetReq & factorOI & contribution--'+key.setId, offinvoiceSetReq+' & '+factorOI+' & '+allValues.contribution);
    					lineAmount = (offinvoiceSetReq * parseFloat(factorOI) * parseFloat(allValues.contribution)).toFixed(2);
    					//If all allowances rates are zero then we calculate evenly
    					if(lineAmount == 0){ 
    						if(allCount == 0)
    							lineAmount = (offinvoiceSetReq * parseFloat(factorOI)).toFixed(2);
    					}
    					tempAmountOI += parseFloat(lineAmount);
    					if(lineAmount > 0 ){
    						oiLines.push({ lineType:'inv',
    							id:'3',
    							item:allValues.item,
    							account:allValues.account,
    							type:'debit',
    							memo:setlmemo,
    							amount: parseFloat(lineAmount),
        						adjustmemo:adjustSetlmemo,
        						allocationFactor:factorOI,
        						allId:allValues.allid,
        						cls:(classesExists)?itemClass(allValues.item):'',
        						dept:(departmentsExists)?itemDepartment(allValues.item):''
    						});
    					}
    				}
    			});
    		}
    		//Creating the Lump-Sum lines to the settlement record based on the line items in the promotion
    		if(lumsumSetReq > 0){
    			for(var i = 0; i< kpilength; i++){
    				var factorLs = 1;
    				if(promoHasShippments){
    					factorLs = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factoractualls'});
    				}else{
    					factorLs = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factorestls'});
    				} 
    				if(allCount == 0 && !updateOnActuals){
    					factorLs = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factorestls'});
					}
    				log.audit('--lumsumSetReq & factorLs --'+key.setId, lumsumSetReq+' & '+factorLs);
    				var lsLineAmount = (lumsumSetReq * parseFloat(factorLs)).toFixed(2);
    				tempAmountLS += parseFloat(lsLineAmount);
    				var kpisitem = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_item'});
    				if(lsLineAmount > 0){
    					var promoLsAcc = promoLineSearchForKPI[i].getValue('custrecord_itpm_p_account');
    					if(promoLsAcc == ''){
    						promoLsAcc = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_p_type',name:'custrecord_itpm_pt_defaultaccount'});
    					}
    					lsLines.push({ 
    						lineType:'ls',
    						id:'1',
    						item:kpisitem,
    						account:promoLsAcc,
    						type:'debit',
    						memo:"LS Settlement for Item : "
    							 +promoLineSearchForKPI[i].getText({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_item'})
    						     +" on Promotion "+promoLineSearchForKPI[i].getValue('name'),
    						amount:parseFloat(lsLineAmount),
            				adjustmemo:'',
            				allocationFactor:parseFloat(factorLs),
    						allId:'',
    						cls:(classesExists)?itemClass(kpisitem):'',
    						dept:(departmentsExists)?itemDepartment(kpisitem):''
    					});
    				}
    			}
    		}

    		//Adjusting the line Values
    		var lsLinesLength = lsLines.length;
    		var bblinesLength = bbLines.length;
    		var oiLinesLength = oiLines.length;
    		if(lsLinesLength > 0){//LS line amount adjusting   
   				if(lumsumSetReq != tempAmountLS){
    					tempAmountLS = parseFloat(tempAmountLS) - parseFloat(lsLines[lsLinesLength-1].amount);
    					var lsmemo = lsLines[lsLinesLength-1].memo;
    					lsLines[lsLinesLength-1].amount = (lumsumSetReq - tempAmountLS).toFixed(2);
    					lsLines[lsLinesLength-1].memo = 'Adjusted '+lsmemo;
    					tempAmountLS = parseFloat(tempAmountLS) + parseFloat(lsLines[lsLinesLength-1].amount);
    				}
//    			}
    		}
    		if(bblinesLength > 0){//LS line amount adjusting  
    			for(var i = 0; i < bblinesLength; i++){ 
					var bbmemo = bbLines[i].memo;
					if(billbackSetReq != tempAmountBB && i == bblinesLength-1){
    					tempAmountBB = parseFloat(tempAmountBB) - parseFloat(bbLines[i].amount);
    					bbLines[i].amount = (billbackSetReq - tempAmountBB).toFixed(2);
    					bbLines[i].memo = 'Adjusted '+bbmemo;
    					tempAmountBB = parseFloat(tempAmountBB) + parseFloat(bbLines[i].amount);
    				}else{
    					bbLines[i].memo = bbLines[i].adjustmemo + bbmemo;
    				}
    			}
    		}
    		if(oiLinesLength > 0){//LS line amount adjusting  
    			for(var i = 0; i< oiLinesLength; i++){
					var oimemo = oiLines[i].memo;
					if(offinvoiceSetReq != tempAmountOI && i == oiLinesLength -1){
    					tempAmountOI = parseFloat(tempAmountOI) - parseFloat(oiLines[i].amount);
    					oiLines[i].amount = (offinvoiceSetReq - tempAmountOI).toFixed(2);
    					oiLines[i].memo = 'Adjusted '+oimemo;
    					tempAmountOI = parseFloat(tempAmountOI) + parseFloat(oiLines[i].amount);
    				}else{
    					oiLines[i].memo = oiLines[i].adjustmemo + oimemo;
    				}
    			}
    		}
    		//Credit Lines
    		if(lsLinesLength > 0){
    			lsLines.push({
    				lineType:'ls',
    				id:'1',
    				item:'',
    				account:settlementAccnt,
    				type:'credit',
    				memo:setCreditMemo,
    				amount:lumsumSetReq,
					adjustmemo:'',
					allocationFactor:0,
					allId:'',
					cls:'',
					dept:''
    			});
    		}
//    		log.debug('lsLines  in Reduce',lsLines);
    		if(bblinesLength > 0){
    			bbLines.push({
    				lineType:'bb',
    				id:'2',
    				item:'',
    				account:settlementAccnt,
    				type:'credit',
    				memo:setCreditMemo,
    				amount:billbackSetReq,
					adjustmemo:'',
					allocationFactor:0,
					allId:'',
					cls:'',
					dept:''
    			});
    		}
//    		log.debug('bbLines  in Reduce',bbLines);
    		if(oiLinesLength > 0){
    			oiLines.push({
    				lineType:'inv',
    				id:'3',
    				item:'',
    				account:settlementAccnt,
    				type:'credit',
    				memo:setCreditMemo,
    				amount:offinvoiceSetReq,
					adjustmemo:'',
					allocationFactor:0,
					allId:'',
					cls:'',
					dept:''
    			});
    		}		
//    		log.error('oiLines  in Reduce',oiLines);
    		if(lsLinesLength > 0)
    			setlLines = setlLines.concat(lsLines);
    		if(bblinesLength > 0)
    			setlLines = setlLines.concat(bbLines);
    		if(oiLinesLength > 0)
    			setlLines = setlLines.concat(oiLines);

    		log.audit('setlLines '+key.setId,setlLines);
    		var setlLinesLength = setlLines.length;
    		
    		for(var i = linecount-1;i >= 0;i--){
    			settlementRec.removeLine({
				    sublistId: 'line',
				    line: i
				});
    		}

    		for(var i = 0,v = 0; i< setlLinesLength; i++){
    			if(setlLines[i].amount > 0){
    				settlementRec.setSublistValue({
    					sublistId:'line',
    					fieldId:'account',
    					value:setlLines[i].account,
    					line:v
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:setlLines[i].type,
    					value:setlLines[i].amount,
    					line:v
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:'custcol_itpm_lsbboi',
    					value:setlLines[i].id,
    					line:v
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:'memo',
    					value:setlLines[i].memo,
    					line:v
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:'custcol_itpm_set_item',
    					value:setlLines[i].item,
    					line:v
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:'custcol_itpm_set_allocationfactor',
    					value:setlLines[i].allocationFactor,
    					line:v
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:'entity',
    					value:setCust,
    					line:v
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:'custcol_itpm_set_allowance',
    					value:setlLines[i].allId,
    					line:v
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:'class',
    					value:setlLines[i].cls,
    					line:v
    				}).setSublistValue({
    					sublistId:'line',
    					fieldId:'department',
    					value:setlLines[i].dept,
    					line:v
    				});
    				v++;
    			}
    		}
    		if(setIsApplied){
    			settlementRec.setValue({
    				fieldId:'transtatus',
    				value:'B'
    			});
    		}else{
    			settlementRec.setValue({
    				fieldId:'transtatus',
    				value:'A'
    			});
    		}    
    		var setStatus = search.lookupFields({
    		    type: 'customtransaction_itpm_settlement',
    		    id: key.setId,
    		    columns: ['status']
    		});
    		log.debug('setStatus in Reduce',setStatus.status[0].value);
    		// If the settlement status is VOID, then we are preventing to save the record. 
    		if(setStatus.status[0].value != 'statusC'){
        		settlementRec.save({enableSourcing:false,ignoreMandatoryFields:true});
    		}
    		
    		for(var i = 0; i< kpilength; i++){
    			var kpiItem = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_item'});
    			
    			/**** SET KPI FIELD VALUES ****/
            	var kpiUpdated = record.submitFields({
            		type: 'customrecord_itpm_kpi',
            		id: promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'internalid'}),
            		values: {
            			'custrecord_itpm_kpi_actualspendls' : getSumOfLSBBOIsettlementLines(1,key.promoId,kpiItem),
            			'custrecord_itpm_kpi_actualspendbb' : getSumOfLSBBOIsettlementLines(2,key.promoId,kpiItem),
            			'custrecord_itpm_kpi_actualspendoi' : getSumOfLSBBOIsettlementLines(3,key.promoId,kpiItem)
            		},
            		options: {enablesourcing: true, ignoreMandatoryFields: true}
            	});    			
    		}
    		
    	}catch(e){
    		log.error(e.name+'  Reduce',e.message+' settlement Id:- '+key.setId);
    	}    	
    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
    	log.debug('summary state',summary);
    }

    function getSumOfLSBBOIsettlementLines(mop,promoId,kpiItem){
    	var settlementRectypeId = runtime.getCurrentScript().getParameter('custscript_itpm_setlment_rec_type');
    	var serResult = search.create({
			   type: "customtransaction_itpm_settlement",
			   filters: [
				  ["custcol_itpm_lsbboi","anyof",mop], 
				  "AND", 
				  ["custbody_itpm_set_promo","anyof",promoId], 
				  "AND", 
				  ["custcol_itpm_set_item","anyof",kpiItem],
				  "AND",
				  ["status","noneof","Custom"+settlementRectypeId+":C"]
			   ],
			   columns: [
			      search.createColumn({
			         name: "debitamount",
			         summary: "SUM"
			      })
			   ]
			}).run().getRange(0,1);
    	
    	return serResult[0].getValue({name:'debitamount',summary:'SUM'})
    }
    
	/**
	 * @param {String} items - estimated qty items
	 * @param {String} entityId - customerId
	 * @param {String} st - start date
	 * @param {String} end - end date
	 * @returns {Object} search
	 */
	function promoHasShipments(items,custId,st,end){
		var custIds = itpm.getSubCustomers(custId);
		return search.create({
			type:search.Type.ITEM_FULFILLMENT,
			columns:['internalid','tranid','item'],
			filters:[
				['item','anyof',items],'and',
				['entity','anyof', custIds],'and',
				['trandate','within',st,end],'and',
				['status','anyof','ItemShip:C'],'and', //item shipped
				['taxline','is',false],'and',
				['cogs','is',false],'and',
				['shipping','is',false],'and',
				['item.isinactive','is',false]
				]
		}).run().getRange(0,10).length > 0;
	}
	
	/**
	 * @param {Integer} itemId
	 */
	function itemClass(itemId){
		var itemlookup = search.lookupFields({
			type: search.Type.ITEM,
			id: itemId,
			columns:['class']
		});
		return  (itemlookup.class.length > 0)?itemlookup.class[0].value:'';
	}
	/**
	 * @param {Integer} itemId
	 */
	function itemDepartment(itemId){
		var itemlookup1 = search.lookupFields({
			type: search.Type.ITEM,
			id: itemId,
			columns:['department']
		});
		return  (itemlookup1.department.length > 0)?itemlookup1.department[0].value:'';
	}
	
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
