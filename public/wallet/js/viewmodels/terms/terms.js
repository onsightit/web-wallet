define(['knockout',
    'viewmodels/common/command'], function(ko, Command){
    var termsType = function (options) {
        var self = this;
        self.wallet = options.parent || {};
        self.ready = ko.observable(false);

        self.termsHTML = ko.observable("");
        
        self.statusMessage = ko.observable("");

        self.role = ko.observable("");
    };

    termsType.prototype.refresh = function(timerRefresh) {
        var self = this;
        if (self.wallet) {
            if (!self.ready()) {
                // Slurp in the file
                $.get(self.wallet.settings().chRoot + "/docs/terms.txt", function(data) {
                    self.termsHTML(data);
                });
            }
            self.ready(true);
        }
        if (!timerRefresh && self.ready()){
            self.statusMessage("");
        }
    };

    return termsType;
});
