/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record',
		'N/search',
		'./iTPM_Module.js'
		],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, itpm) {
   
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
					['internalid','anyof',8237]
//					['internalid','noneof','@NONE@'], 'and' ,
//				    ['status','is','E']
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
    	try{
    		var searchResult = JSON.parse(context.value);
    		log.debug('searchResult in map',searchResult); 
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
    		log.error(e.name+'  MAP',e.message);
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
    		var key = JSON.parse(context.key);
    		log.debug('key in Reduce',key); 

    		//creating empty arrays to store settlement lines
    		var setlLines = [];
    		var lsLines = [];
    		var bblines = [];
    		var oiLines = [];
    		var settlementRec = record.load({
    			type:'customtransaction_itpm_settlement',
    			id:key.setId
    		});
    		var linecount = settlementRec.getLineCount({sublistId:'line'});
    		var setCreditMemo = settlementRec.getSublistValue({ sublistId: 'line',fieldId: 'memo',line: linecount-1});
    		var accountPayable = itpm.getPrefrenceValues().accountPayable;
    		var lumsumSetReq = settlementRec.getValue('custbody_itpm_set_reqls');
    		var billbackSetReq = settlementRec.getValue('custbody_itpm_set_reqbb');
    		var offinvoiceSetReq = settlementRec.getValue('custbody_itpm_set_reqoi');
    		var setCust = settlementRec.getValue('custbody_itpm_customer');
    		var setIsApplied = settlementRec.getValue('custbody_itpm_appliedto');
    		log.debug('setIsApplied in Reduce',setCreditMemo); 
    		
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
    				],
    				filters:[['internalid','anyof',key.promoId]]
    		}).run().getRange(0,1000);
    		var kpilength = promoLineSearchForKPI.length;
    		if(billbackSetReq > 0 || offinvoiceSetReq > 0){
    			context.values.forEach(function(val){
    				var allValues = JSON.parse(val);
    				log.debug('allValues  in Reduce',allValues);
    				var allType = allValues.type;
    				var allMOP = allValues.mop;
    				var setlmemo = " ";		    			
    				var factorActualBB = 1;
    				var factorActualOI = 1;
    				for(var i = 0; i< kpilength; i++){
    					if(allValues.item == promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_item'})){
    						factorActualBB = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factoractualbb'});
    						factorActualOI = promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factoractualoi'});
    					}
    				}
    				//for Line memo value
    				if(allType == 1){
    					log.debug('allType == 1 in Reduce');
    					setlmemo = allValues.rate + "  per " + allValues.uom + ((allMOP == 1)?" BB ":" OI ") 
    					+ " Settlement for Item : " + allValues.itemtxet + " on Promotion "+allValues.promoname;
    				}else if(allType == 2){
    					log.debug('allType == 2 in Reduce');
    					setlmemo = "% "+allValues.rate+"  per "+allValues.uom+((allMOP == 1)?" BB ":" OI ")
    					+"Settlement for Item : " +allValues.itemtxet +" on Promotion "+allValues.promoname;
    				} 
    				log.debug('allType  in Reduce',setlmemo);
    				//For Bill-back Lines lines
    				if(allMOP == 1 && billbackSetReq > 0){
    					bblines.push({ lineType:'bb',
    						id:'2',
    	    				item:allValues.item,
    						account:allValues.account,
    						type:'debit',
    						memo:setlmemo,
    						amount:(billbackSetReq * factorActualBB * allValues.contribution).toFixed(2)
    					});
    				}else if(allMOP == 3 && offinvoiceSetReq > 0){//For Off-Invoice lines
    					oiLines.push({ lineType:'inv',
    						id:'3',
    	    				item:allValues.item,
    						account:allValues.account,
    						type:'debit',
    						memo:setlmemo,
    						amount:(offinvoiceSetReq * factorActualOI * allValues.contribution).toFixed(2)
    					});
    				}
    			});
    		}
    		//For Lump-Sum lines
    		if(lumsumSetReq > 0){
    			for(var i = 0; i< kpilength; i++){
    				lsLines.push({ 
    					lineType:'ls',
    					id:'1',
        				item:promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_item'}),
    					account:promoLineSearchForKPI[i].getValue('custrecord_itpm_p_account'),
    					type:'debit',
    					memo:"LS Settlement for Item : "+promoLineSearchForKPI[i].getText({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_item'})
    					+" on Promotion "+promoLineSearchForKPI[i].getValue('name'),
    					amount:(lumsumSetReq * promoLineSearchForKPI[i].getValue({join:'custrecord_itpm_kpi_promotiondeal',name:'custrecord_itpm_kpi_factoractualls'})).toFixed(2)
    				});
    			}
    		}
    		//Credit Lines
    		if(lsLines.length > 0){
    			lsLines.push({
    				lineType:'ls',
    				id:'1',
    				item:'',
    				account:accountPayable,
    				type:'credit',
    				memo:setCreditMemo,
    				amount:lumsumSetReq
    			});
    		}
    		log.debug('lsLines  in Reduce',lsLines);
    		if(bblines.length > 0){
    			bblines.push({
    				lineType:'bb',
    				id:'2',
    				item:'',
    				account:accountPayable,
    				type:'credit',
    				memo:setCreditMemo,
    				amount:billbackSetReq
    			});
    		}
    		log.debug('bblines  in Reduce',bblines);
    		if(oiLines.length > 0){
    			oiLines.push({
    				lineType:'inv',
    				id:'3',
    				item:'',
    				account:accountPayable,
    				type:'credit',
    				memo:setCreditMemo,
    				amount:offinvoiceSetReq
    			});
    		}		
    		log.debug('oiLines  in Reduce',oiLines);
    		if(lsLines.length > 0)
    			setlLines = setlLines.concat(lsLines);
    		if(bblines.length > 0)
    			setlLines = setlLines.concat(bblines);
    		if(oiLines.length > 0)
    			setlLines = setlLines.concat(oiLines);

    		log.debug('setlLines  in Reduce',setlLines);
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
    	}catch(e){
    		log.error(e.name+'  Reduce',e.message);
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

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
