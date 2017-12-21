/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
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
//					["internalid","anyof",[8304,8304]]
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
    		
    		var setId = searchResult.values["GROUP(internalid)"]["value"];
			var promoID = searchResult.values["GROUP(custbody_itpm_set_promo)"]["value"];
			
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
    						       ['custrecord_itpm_all_promotiondeal.custrecord_itpm_all_mop','anyof','1','3']
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
						rate:result.getValue({name:'custrecord_itpm_all_allowancerate',join:'custrecord_itpm_all_promotiondeal'})
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
		log.debug('key in Reduce',key); 
    	try{
    		
    		//creating empty arrays to store settlement lines
    		var setlLines = [];
    		var lsLines = [];
    		var bbLines = [];
    		var oiLines = [];
    		var tempAmountLS = 0;
    		var tempAmountBB = 0;
    		var tempAmountOI = 0;
    		var settlementRec = record.load({
    			type:'customtransaction_itpm_settlement',
    			id:key.setId
    		});
    		var linecount = settlementRec.getLineCount({sublistId:'line'});
    		var setCreditMemo = settlementRec.getSublistValue({ sublistId: 'line',fieldId: 'memo',line: linecount-1});
    		var accountPayable = itpm.getPrefrenceValues().accountPayable;
    		var lumsumSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqls'));
    		var billbackSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqbb'));
    		var offinvoiceSetReq = parseFloat(settlementRec.getValue('custbody_itpm_set_reqoi'));
    		var setCust = settlementRec.getValue('custbody_itpm_customer');
    		var setIsApplied = settlementRec.getValue('custbody_itpm_appliedto');
//    		log.debug('setIsApplied in Reduce',setCreditMemo); 
    		
    		var promoLineSearchForKPI = search.create({
    			type:'customrecord_itpm_promotiondeal',
    			columns:[
    				'name'
    				,'custrecord_itpm_p_account'
    				,'custrecord_itpm_kpi_promotiondeal.internalid'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_item'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_factoractualbb'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_factoractualoi'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_factoractualls'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_adjustedls'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_adjustedbb'
    				,'custrecord_itpm_kpi_promotiondeal.custrecord_itpm_kpi_adjsutedoi'
    				],
    				filters:[['internalid','anyof',key.promoId]]
    		}).run().getRange(0,1000);
    		var kpilength = promoLineSearchForKPI.length;
    		if(billbackSetReq > 0 || offinvoiceSetReq > 0){
    			//Adding BB & OI line values to jsonArray 
    			context.values.forEach(function(val){
    				var allValues = JSON.parse(val);
    				log.debug('allValues  in Reduce',allValues);
    				var allType = allValues.type;
    				var allMOP = allValues.mop;
    				var setlmemo = " ";
    				var adjustSetlmemo = " ";		    			
    				var factorActualBB = 1;
    				var factorActualOI = 1;
    				var lineAmount = 0;
    				var kpiAdjustedItemBB = 0;
    				var kpiAdjustedItemOI = 0;
    				//Getting KPI values for relative item on Allowances
    				for(var i = 0; i< kpilength; i++){
    					var kpiItem = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_item'});
    					
    					if(promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_adjustedbb'})){
    						kpiAdjustedItemBB = kpiItem;
    					}
    					if(promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_adjsutedoi'})){
    						kpiAdjustedItemOI = kpiItem;
    					}
    					if(allValues.item == kpiItem){
    						factorActualBB = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factoractualbb'});
    						factorActualOI = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factoractualoi'});
    					}
    				}
    				//for Line memo value
    				if(allType == 1){//Rate per Unit
    					setlmemo = ((allMOP == 1)?" BB ":" OI ") 
    					+ " Settlement for Item : " + allValues.itemtxet + " on Promotion "+allValues.promoname;
    					adjustSetlmemo = allValues.rate + "  per " + allValues.uom;
    				}else if(allType == 2){//% per Unit
    					setlmemo = ((allMOP == 1)?" BB ":" OI ")
    					+"Settlement for Item : " +allValues.itemtxet +" on Promotion "+allValues.promoname;
    					adjustSetlmemo = "% "+allValues.rate+"  per " + allValues.uom;
    				} 
    				log.debug('allType  in Reduce',setlmemo);
    				//For Bill-back Lines lines
    				if(allMOP == 1 && billbackSetReq > 0){                      
    					log.audit('--billbackSetReq & factorActualBB & contribution--'+key.setId, billbackSetReq+' & '+factorActualBB+' & '+allValues.contribution);
    					log.audit('--BB AMOUNT--'+key.setId, billbackSetReq * factorActualBB * allValues.contribution);
    					lineAmount = (billbackSetReq * parseFloat(factorActualBB) * parseFloat(allValues.contribution)).toFixed(2);
    					tempAmountBB += parseFloat(lineAmount);
    					if(lineAmount > 0 || allValues.item == kpiAdjustedItemBB){
    						bbLines.push({ lineType:'bb',
        						id:'2',
        						item:allValues.item,
        						account:allValues.account,
        						type:'debit',
        						memo:setlmemo,
        						amount:parseFloat(lineAmount),
        						adjustItem:kpiAdjustedItemBB,
        						adjustmemo:adjustSetlmemo
        					});
    					}
    					
    				}else if(allMOP == 3 && offinvoiceSetReq > 0){//For Off-Invoice lines
    					lineAmount = (offinvoiceSetReq * parseFloat(factorActualOI) * parseFloat(allValues.contribution)).toFixed(2);
    					tempAmountOI += parseFloat(lineAmount);
    					if(lineAmount > 0 || allValues.item == kpiAdjustedItemOI){
    						oiLines.push({ lineType:'inv',
    							id:'3',
    							item:allValues.item,
    							account:allValues.account,
    							type:'debit',
    							memo:setlmemo,
    							amount: parseFloat(lineAmount),
    							adjustItem:kpiAdjustedItemOI,
        						adjustmemo:adjustSetlmemo
    						});
    					}
    				}
    			});
    		}
    		//For Lump-Sum lines
    		if(lumsumSetReq > 0){
    			for(var i = 0; i< kpilength; i++){
    				var lsLineAmount = (lumsumSetReq * parseFloat(promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factoractualls'}))).toFixed(2);
    				var kpiIsAdjust = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_adjustedls'});
    				tempAmountLS += parseFloat(lsLineAmount);
    				var kpisitem = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_item'});
    				if(lsLineAmount > 0 || kpiIsAdjust){
    					lsLines.push({ 
    						lineType:'ls',
    						id:'1',
    						item:kpisitem,
    						account:promoLineSearchForKPI[i].getValue('custrecord_itpm_p_account'),
    						type:'debit',
    						memo:"LS Settlement for Item : "
    							 +promoLineSearchForKPI[i].getText({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_item'})
    						     +" on Promotion "+promoLineSearchForKPI[i].getValue('name'),
    						amount:parseFloat(lsLineAmount),
    						adjustItem:(kpiIsAdjust)?kpisitem:0,
            				adjustmemo:''
    					});
    				}
    			}
    		}

    		//Adjusting the line Values
    		var lsLinesLength = lsLines.length;
    		var bblinesLength = bbLines.length;
    		var oiLinesLength = oiLines.length;
    		if(lsLinesLength > 0){//LS line amount adjusting   
    			for(var i = 0; i< lsLinesLength; i++){
    				if(lsLines[i].adjustItem == lsLines[i].item && lumsumSetReq != tempAmountLS){
//    					log.audit(key.setId+' lsLines[i].isAdjust item '+lsLines[i].item,lsLines[i].adjustItem+'  tempAmountBB: '+tempAmountLS+' billbackSetReq: '+lumsumSetReq);
    					tempAmountLS = parseFloat(tempAmountLS) - parseFloat(lsLines[i].amount);
    					var lsmemo = lsLines[i].memo;
    					lsLines[i].amount = (lumsumSetReq - tempAmountLS).toFixed(2);
    					lsLines[i].memo = 'Adjusted '+lsmemo;
    					tempAmountLS = parseFloat(tempAmountLS) + parseFloat(lsLines[i].amount);
    				}
    			}
    		}
    		if(bblinesLength > 0){//LS line amount adjusting  
    			for(var i = 0; i < bblinesLength; i++){ 
					var bbmemo = bbLines[i].memo;
    				if(bbLines[i].adjustItem == bbLines[i].item && billbackSetReq != tempAmountBB){  
//    					log.audit(key.setId+' bbLines[i].isAdjust item '+bbLines[i].item,bbLines[i].adjustItem+'  tempAmountBB: '+tempAmountBB+' billbackSetReq: '+billbackSetReq);
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
    				if(oiLines[i].adjustItem == oiLines[i].item && offinvoiceSetReq != tempAmountOI){
//    					log.audit(key.setId+' bbLines[i].isAdjust item '+oiLines[i].item,oiLines[i].adjustItem+'  tempAmountBB: '+tempAmountOI+' billbackSetReq: '+offinvoiceSetReq);
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
    				account:accountPayable,
    				type:'credit',
    				memo:setCreditMemo,
    				amount:lumsumSetReq,
    				adjustItem:0,
					adjustmemo:''
    			});
    		}
//    		log.debug('lsLines  in Reduce',lsLines);
    		if(bblinesLength > 0){
    			bbLines.push({
    				lineType:'bb',
    				id:'2',
    				item:'',
    				account:accountPayable,
    				type:'credit',
    				memo:setCreditMemo,
    				amount:billbackSetReq,
    				adjustItem:0,
					adjustmemo:''
    			});
    		}
//    		log.debug('bbLines  in Reduce',bbLines);
    		if(oiLinesLength > 0){
    			oiLines.push({
    				lineType:'inv',
    				id:'3',
    				item:'',
    				account:accountPayable,
    				type:'credit',
    				memo:setCreditMemo,
    				amount:offinvoiceSetReq,
    				adjustItem:0,
					adjustmemo:''
    			});
    		}		
//    		log.debug('oiLines  in Reduce',oiLines);
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
    		for(var i = 0; i< setlLinesLength; i++){
    			settlementRec.setSublistValue({
    				sublistId:'line',
    				fieldId:'account',
    				value:setlLines[i].account,
    				line:i
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:setlLines[i].type,
    				value:setlLines[i].amount,
    				line:i
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'custcol_itpm_lsbboi',
    				value:setlLines[i].id,
    				line:i
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'memo',
    				value:setlLines[i].memo,
    				line:i
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'custcol_itpm_set_item',
    				value:setlLines[i].item,
    				line:i
    			}).setSublistValue({
    				sublistId:'line',
    				fieldId:'entity',
    				value:setCust,
    				line:i 
    			});
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
    		
    		settlementRec.save({enableSourcing:false,ignoreMandatoryFields:true});
    		
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
    	var serResult = search.create({
			   type: "customtransaction_itpm_settlement",
			   filters: [
				  ["custcol_itpm_lsbboi","anyof",mop], 
				  "AND", 
				  ["custbody_itpm_set_promo","anyof",promoId], 
				  "AND", 
				  ["custcol_itpm_set_item","anyof",kpiItem]
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
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
