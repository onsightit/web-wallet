define([],function(){
    var utility = { };
    
    utility.time = {
        unixToDate: function(unixTime){
            return new Date(unixTime * 1000);
        },

        formatDate: function(date){
        	var dateopts = { year: 'numeric', month: 'numeric', day: 'numeric' };
        	var timeopts = { hour12: false };
            return (date.toLocaleDateString(navigator.language, dateopts)) + ' ' +  (date.toLocaleTimeString(navigator.language, timeopts)); 
        },

        unixToString: function(unixTime){
            return this.formatDate(this.unixToDate(unixTime));
        },
    };

    return utility;
});
