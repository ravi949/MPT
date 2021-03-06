/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope TargetAccount
 */
define(['N/file',
		'N/search', 
		'N/task'],
/**
 * @param {file} file
 * @param {search} search
 * @param {task} task
 */
function(file, search, task) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {
    	try{
    		
    		if(scriptContext.type != scriptContext.InvocationType.SCHEDULED)return;
    		
    		search.create({
                type:'customrecord_itpm_deductionsplit',
                columns:[
                	search.createColumn({
                        name: "internalid",
                        summary: search.Summary.GROUP
                     }),
                     search.createColumn({
                        name: "internalid",
                        join:'file',
                        summary: search.Summary.GROUP
                     })
                ],
                filters:[['file.name','isnotempty',null],'and',
                		 ["custrecord_itpm_split.internalid","anyof","@NONE@"],'and',
                		 ['custrecord_itpm_ddn_splitprocesscompletd','is',false],'and',
                		 ["custrecord_itpm_import_completed","is",false]]
             }).run().each(function(e){
            	 try{
            		 log.debug('file id',e.getValue({name:'internalid',join:'file',summary:search.Summary.GROUP}));
            		 var csvTaskStatus = task.create({
            			 taskType: task.TaskType.CSV_IMPORT,
            			 mappingId: 'CUSTIMPORT_ITPM_DDN_SPLITIMPRT',
            			 importFile: file.load({id:e.getValue({name:'internalid',join:'file',summary:search.Summary.GROUP})})
            		 }).submit();
            		 log.debug('csvTaskStatus ',csvTaskStatus);
            	 }catch(ex){
            		 log.error('task trigger error ',ex.message);
            	 }
            	 return true;
             });
    	}catch(ex){
    		log.error(ex.name,ex.message);
    	}
    }

    return {
        execute: execute
    };
    
});
