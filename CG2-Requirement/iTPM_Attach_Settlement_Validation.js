/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope TargetAccount
 * Client script to be attached to the front-end suitelet scripts for iTPM Settlement record Create or Edit.
 */
define(['N/record', 'N/search','N/url'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, url) {
    
    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) 
    {
      try{
    	  var currentRecord = scriptContext.currentRecord;
    	  var fieldName = scriptContext.fieldId;
    	  var settlementReq = currentRecord.getValue('custom_itpm_st_reql');
    	  var billBackSetReq = currentRecord.getValue('custpage_billback_setreq');
    	  var netBillbackLiblty = currentRecord.getValue('custpage_netbillback_liablty');
    	  var netPromotionalLiablty = currentRecord.getValue('custpage_netpromo_liablty');
    	  var lumpsumSetReqAmnt = currentRecord.getValue('custpage_lumsum_setreq');
    	  var offinvReq = currentRecord.getValue('custpage_offinvoice_setreq')>0?currentRecord.getValue('custpage_offinvoice_setreq'):0;
    	  var totalSettlementReqAmnt = 0;
    	  var settlementLS = lumpsumSetReqAmnt > 0?lumpsumSetReqAmnt:0;
    	  var settlementBB = billBackSetReq > 0?billBackSetReq:0;
    	  var settlementOI = offinvReq > 0?offinvReq:0;

    	//this fields changes are trigger when settlement record is edited 
    	if(fieldName == 'custpage_lumsum_setreq'){    					
    		totalSettlementReqAmnt = settlementLS + settlementBB+ settlementOI;
    		currentRecord.setValue({
    			fieldId:'custom_itpm_st_reql',
    			value:totalSettlementReqAmnt,
    			ignoreFieldChange:true
    		});
    	}
    	
    	if(fieldName == 'custpage_billback_setreq'){
    		totalSettlementReqAmnt = settlementLS + settlementBB+ settlementOI;
    		currentRecord.setValue({
    			fieldId:'custom_itpm_st_reql',
    			value:totalSettlementReqAmnt,
    			ignoreFieldChange:true
    		});
    	}
    	if(fieldName == 'custpage_offinvoice_setreq'){
    		//if user enters SETTLEMENT REQUEST : MISSED OFF-INVOICE then add the entered value to SETTLEMENT REQUEST
    		totalSettlementReqAmnt = settlementLS + settlementBB+ settlementOI;
    		currentRecord.setValue({
    			fieldId:'custom_itpm_st_reql',
    			value:totalSettlementReqAmnt,
    			ignoreFieldChange:true
    		});
    	}
    	
    	//this field change get the net promotion liability while creating the settlement from list promotions
    	if(fieldName == 'custpage_promotion'){
    		var promoId = currentRecord.getValue('custpage_promotion');
    		if(promoId != ' '){
    			var promotionRec = record.load({
    				type:'customrecord_itpm_promotiondeal',
    				id:promoId
    			});
    			var netPromoLblty = promotionRec.getValue({fieldId:'custrecord_itpm_p_netpromotionalle'});
    			netPromoLblty = (netPromoLblty == '' || netPromoLblty == 'ERROR: Invalid Expression')?0:netPromoLblty;
    		}

    		currentRecord.setValue({
    			fieldId:'custpage_promotion_customer',
    			value:(promoId == ' ')?'':promotionRec.getText({fieldId:"custrecord_itpm_p_customer"})
    		});
    		currentRecord.setValue({
    			fieldId:'custpage_promotion_ship_startdate',
    			value:(promoId == ' ')?'':promotionRec.getText({fieldId:"custrecord_itpm_p_shipstart"})
    		});
    		currentRecord.setValue({
    			fieldId:'custpage_promotion_ship_enddate',
    			value:(promoId == ' ')?'':promotionRec.getText({fieldId:"custrecord_itpm_p_shipend"})
    		});
    		currentRecord.setValue({
    			fieldId: 'custpage_promotion_liability',
    			value:(promoId == ' ')?'':netPromoLblty
    		}); 

//    		document.getElementById('promolink').text = (promoId != ' ')?currentRecord.getText('custpage_promotion'):'';
//    		document.getElementById('promolink').href = (promoId != ' ')?url.resolveRecord({recordType:'customrecord_itpm_promotiondeal',recordId:promoId}):''; 
    	}
    	
    	}catch(ex){
    		console.log(ex.name,'record type = iTPM Settlement, record id='+scriptContext.currentRecord.id+', function name = fieldChanged, message='+ex.message);
    	}
    }
    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext){
    	try{
    		var currentRecord = scriptContext.currentRecord;
    		var settReq = parseFloat(currentRecord.getValue('custom_itpm_st_reql'));
    		if(settReq > 0 ){
    			if(currentRecord.getValue('custom_itpm_st_ddn_openbal') < currentRecord.getValue('custom_itpm_st_reql')){
    				alert('The Settlement Request CANNOT be GREATER THAN the Open Balance on the Deduction');
    				return false
    			}
    		}else if(settReq <= 0){
    			alert('The Settlement Request CANNOT be Zero');
    			return false
    		}
    		return true
    	}catch(ex){
    		console.log(ex.name,'record type = iTPM Settlement, record id='+scriptContext.currentRecord.id+', function name = saveRecord, message='+ex.message);
    	}
    }
    
    //when user click on cancel it redirect to previous page.
    function redirectToBack(){
    	history.go(-1);
    }
    

    return {
        fieldChanged: fieldChanged,
        saveRecord: saveRecord,
        redirectToBack:redirectToBack
    };
    
});
