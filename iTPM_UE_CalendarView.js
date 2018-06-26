/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope TargetAccount
 */
define([],

function() {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {
    	try{
    		var calendarRec = scriptContext.newRecord;
    		var calendarForm = scriptContext.form
    		calendarForm.clientScriptModulePath =  './iTPM_Attach_CalendarView_ClientMethods.js';	
    		
    		calendarForm.addButton({
				id:'custpage_calendarReport',
				label:'Show Report',
				functionName:'newCalendarReport('+calendarRec.id+')'
			});	
    		
    		
    	}catch(e){
    		log.error(e.name, e.message);
    	}
    }

    return {
        beforeLoad: beforeLoad
    };
    
});
