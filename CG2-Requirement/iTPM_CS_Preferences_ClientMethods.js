/**
 * @NApiVersion 2.x
 * @NModuleScope TargetAccount
 * Client script to be attached to the front-end suitelet for iTPM Preferences record Edit.
 */
define([],

function() {
    /*it will redirect the user to previous screen*/
    function redirectToBack(from,id){
    	history.go(-1);
    }
    return {
        redirectToBack:redirectToBack
    };
    
});
