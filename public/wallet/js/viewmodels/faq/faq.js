define(['knockout',
    'viewmodels/common/command'], function(ko, Command){
    var faqType = function (options) {
        var self = this;
        self.wallet = options.parent || {};
        self.ready = ko.observable(false);

        self.faqHTML = ko.observable("");

        self.statusMessage = ko.observable("");
        
        self.role = ko.observable("");
    };

    faqType.prototype.refresh = function(timerRefresh) {
        var self = this;
        if (self.wallet) {
            if (self.ready()) {
                // Slurp in the file
                $.get(self.wallet.settings().chRoot + "/docs/faq.txt", function(data) {
                    self.faqHTML(data);
                });
            }
            self.ready(true);
        }
        if (!timerRefresh && self.ready()){
            self.statusMessage("");
        }
    };

    return faqType;
});
