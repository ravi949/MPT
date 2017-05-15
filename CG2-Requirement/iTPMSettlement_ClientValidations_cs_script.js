/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 * Validating the Settlement request amount based on user entered value
 */
define(['N/record', 'N/search','N/url'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search, url) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {

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
    function fieldChanged(scriptContext) 
    {
    	var currentRecord = scriptContext.currentRecord;
		var fieldName = scriptContext.fieldId,
		settlementReq = currentRecord.getValue('custom_itpm_st_reql'),
		billBackSetReq = currentRecord.getValue('custpage_billback_setreq'),
		netBillbackLiblty = currentRecord.getValue('custpage_netbillback_liablty'),
		netPromotionalLiablty = currentRecord.getValue('custpage_netpromo_liablty'),
		lumpsumSetReqAmnt = currentRecord.getValue('custpage_lumsum_setreq'),
		offinvReq = currentRecord.getValue('custpage_offinvoice_setreq')>0?currentRecord.getValue('custpage_offinvoice_setreq'):0,
		totalSettlementReqAmnt = 0,
		settlementLS = lumpsumSetReqAmnt > 0?lumpsumSetReqAmnt:0,
		settlementBB = billBackSetReq > 0?billBackSetReq:0,
		settlementOI = offinvReq > 0?offinvReq:0;

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
    		console.log(promoId == ' ')
    		if(promoId != ' '){
        		var promoLookup = search.lookupFields({
        			type:'customrecord_itpm_promotiondeal',
        			id:currentRecord.getValue('custpage_promotion'),
        			columns:['custrecord_itpm_p_customer','custrecord_itpm_p_shipstart','custrecord_itpm_p_shipend','custrecord_itpm_p_netpromotionalle']
        		});
    		}
    		
    		currentRecord.setValue({
    			fieldId:'custpage_promotion_customer',
    			value:(promoId == ' ')?'':promoLookup["custrecord_itpm_p_customer"][0].text
    		}).setValue({
    			fieldId:'custpage_promotion_ship_startdate',
    			value:(promoId == ' ')?'':promoLookup["custrecord_itpm_p_shipstart"]
    		}).setValue({
    			fieldId:'custpage_promotion_ship_enddate',
    			value:(promoId == ' ')?'':promoLookup["custrecord_itpm_p_shipend"]
    		}).setValue({
    			fieldId: 'custpage_promotion_liability',
    			value:(promoId == ' ')?'':promoLookup["custrecord_itpm_p_netpromotionalle"]
    		}); 

    		document.getElementById('promolink').text = (promoId != ' ')?currentRecord.getText('custpage_promotion'):'';
    		document.getElementById('promolink').href = (promoId != ' ')?url.resolveRecord({recordType:'customrecord_itpm_promotiondeal',recordId:promoId}):''; 
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
    	var currentRecord = scriptContext.currentRecord;
    	if(currentRecord.getValue('custom_itpm_st_reql') > 0 ){
    		if(currentRecord.getValue('custom_itpm_st_ddn_openbal') < currentRecord.getValue('custom_itpm_st_reql')){
        		alert('The Settlement Request CANNOT be GREATER THAN the Open Balance on the Deduction');
        		return false
        	}
    	}else{
    		alert('The Settlement Request CANNOT be Zero');
    		return false
    	}
    	
    	return true
    }
    
    //when user click on cancel it redirect to previous page.
    function redirectToBack(){
    	history.go(-1);
    }
    

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
       /* postSourcing: postSourcing,
        sublistChanged: sublistChanged,
        lineInit: lineInit,
        validateField: validateField,
        validateLine: validateLine,
        validateInsert: validateInsert,
        validateDelete: validateDelete,*/
        saveRecord: saveRecord,
        redirectToBack:redirectToBack
    };
    
});
