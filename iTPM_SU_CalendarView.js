/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope TargetAccount
 */
define(['N/ui/serverWidget'],
/**
 * @param {serverWidget} serverWidget
 */
function(serverWidget) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	var form = serverWidget.createForm({
    		title:'iTPM Calendar Report'
    	});
    	form.addField({
    		 id : 'custpage_itpm_test',
    		 type : serverWidget.FieldType.INLINEHTML,
    		 label : 'iTPM Report'
    	}).defaultValue = '<iframe src="https://debugger.netsuite.com/app/site/hosting/scriptlet.nl?script=2569&deploy=1&compid=TSTDRV1500369&cid=1" style="width: 100%; height: 1000px;border:none" />';
    	context.response.writePage(form);
    }

    return {
        onRequest: onRequest
    };
    
});
