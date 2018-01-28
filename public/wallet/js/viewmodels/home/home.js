define(['knockout',
    'viewmodels/common/command'], function(ko, Command) {
    var homeType = function (options) {
        var self = this;
        self.wallet = options.parent || {};
        self.ready = ko.observable(false);

        self.statusMessage = ko.observable("");

        self.emailVerified = ko.observable(false);
        self.profileComplete = ko.observable(false);
        self.role = ko.observable("");
        self.first_name = ko.observable("");
        self.last_name = ko.observable("");
    };

    homeType.prototype.refresh = function(timerRefresh) {
        var self = this;
        if (self.wallet) {
            if (!self.wallet.emailVerified()) {
                window.location = self.wallet.settings().chRoot + '/verify';
            }
            if (!self.wallet.profileComplete()) {
                if (!(self.wallet.currentView() === 'terms' || self.wallet.currentView() === 'faq')) {
                    window.location = self.wallet.settings().chRoot + '/#profile';
                }

            }
            self.ready(true);
        }
        if (!timerRefresh && self.ready()){
            self.statusMessage("");
        }
    };

    return homeType;
});
