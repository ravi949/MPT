/**
 * @NApiVersion 2.x
 * @NScriptType BundleInstallationScript
 * @NModuleScope SameAccount
 */
define(['N/config'],

function(config) {
   
    /**
     * Executes after a bundle is installed for the first time in a target account.
     *
     * @param {Object} params
     * @param {number} params.version - Version of the bundle being installed
     *
     * @since 2016.1
     */
    function beforeInstall(params) {
    	checkForFeaturesEnableOrNot();
    }

    /**
     * Executes after a bundle in a target account is updated.
     *
     * @param {Object} params
     * @param {number} params.version - Version of the bundle being installed
     *
     * @since 2016.1
     */
    function afterInstall(params) {

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
    	checkForFeaturesEnableOrNot();
    }

    /**
     * Executes before a bundle is uninstalled from a target account.
     *
     * @param {Object} params
     * @param {number} params.fromVersion - Version currently installed
     * @param {number} params.toVersion -  New version of the bundle being installed
     *
     * @since 2016.1
     */
    function afterUpdate(params) {

    }

    /**
     * Executes before a bundle in a target account is updated.
     *
     * @param {Object} params
     * @param {number} params.version - Version of the bundle being unistalled
     *
     * @since 2016.1
     */
    function beforeUninstsall(params) {

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
//        afterInstall: afterInstall,
        beforeUpdate: beforeUpdate,
//        afterUpdate: afterUpdate,
//        beforeUninstall: beforeUninstsall
    };
    
});
