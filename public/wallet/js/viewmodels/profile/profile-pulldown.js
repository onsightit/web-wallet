define(['knockout'], function(ko){
    var pulldownType = function(){

        this.genderValues = ko.observableArray(["",
            "Female",
            "Male"
            ]);

        this.countryValues = ko.observableArray(["",
            "United States",
            "Canada",
            "Mexico"
            ]);

    };
    return pulldownType; 
});
