/**
 * @NApiVersion 2.x
 * @NScriptType BundleInstallationScript
 * @NModuleScope TargetAccount
 * 
 * Required features - 	ACCOUNTING, A/R, A/P
 * 						CUSTOM RECORDS
 * 						CUSTOM TRANSACTIONS
 * 						CLIENT SUITESCRIPT
 * 						SERVER SUITESCRIPT
 * 						SUITEFLOW
 * 
 */
define(['N/config'],

function(config) {
	
	function checkRequirements() {
		try{
			var objConfig = congif.load({type: config.Type.FEATURES});
			var accounting = objConfig.getValue({fieldId: 'accounting'});
			var receivables = objConfig.getValue({fieldId: 'receivables'});
			var payables = objConfig.getValue({fieldId: 'payables'});
			var customRecords = objConfig.getValue({fieldId: 'customrecords'});
			var customTransactions = objConfig.getValue({fieldId: 'customtransactions'});
			var clientScripts = objConfig.getValue({fieldId: 'customcode'});
			var serverScripts = objConfig.getValue({fieldId: 'serversidescripting'});
			var workflows = objConfig.getValue({fieldId: 'workflow'});
			
			var errorMessage = 'This bundle requires the following features to be enabled - ';
			if (!accounting) errorMessage += 'ACCOUNTING; ';
			if (!receivables) errorMessage += 'A/R; ';
			if (!payables) errorMessage += 'A/P; ';
			if (!customRecords) errorMessage += 'CUSTOM RECORDS; ';
			if (!customTransactions) errorMessage += 'CUSTOM TRANSACTIONS; ';
			if (!clientScripts) errorMessage += 'CLIENT SUITESCRIPT; ';
			if (!serverScripts) errorMessage += 'SERVER SUITESCRIPT; ';
			if (!workflows) errorMessage += 'SUITEFLOW; ';
			
			if (!(accounting && receivables && payables && customRecords && customTransactions && clientScripts && serverScripts && workflows)) {
				throw {
					name: 'iTPM_PREREQ',
					message: errorMessage
				};
			}
		} catch (ex) {
			throw ex;
		}
	}
   
    /**
     * Executes after a bundle is installed for the first time in a target account.
     *
     * @param {Object} params
     * @param {number} params.version - Version of the bundle being installed
     *
     * @since 2016.1
     */
    function beforeInstall(params) {
    	//checkForFeaturesEnableOrNot();
    	checkRequirements();
    }

    /**
     * Executes before a bundle is installed for the first time in a target account.
     *
     * @param {Object} params
     * @param {number} params.fromVersion - Version currently installed
     * @param {number} params.toVersion -  New version of the bundle being installed
     *
     * @since 2016.1
     */
    function beforeUpdate(params) {
    	//checkForFeaturesEnableOrNot();
    	checkRequirements();
    }

    function checkForFeaturesEnableOrNot(){
    	var configRecObj = config.load({
    	    type: config.Type.FEATURES
    	}),
    	isCustTransChecked = configRecObj.getValue('customtransactions'),
    	isAdavncedPDForHTMLChecked = configRecObj.getValue('advancedprinting');
    	
    	if(!isCustTransChecked || !isAdavncedPDForHTMLChecked){
    		var errorMsg = (!isCustTransChecked && !isAdavncedPDForHTMLChecked)?'CUSTOM TRANSACTIONS & Advanced PDF/HTML TEMPLATES':(!isCustTransChecked)?'CUSTOM TRANSACTIONS':'Advanced PDF/HTML TEMPLATES';
    		throw Error('iTPM requries that '+errorMsg+' Templates be enabled on your account. Please contact your account Administrator.')
    	}  
     }
    
    
    return {
        beforeInstall: beforeInstall,
        beforeUpdate: beforeUpdate
    };
    
});
