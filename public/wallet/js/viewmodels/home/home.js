define(['knockout'], function(ko){
    var homeType = function(options){
        var self = this;
        self.wallet = options.parent || {};

        self.statusMessage = ko.observable("");

        self.role = ko.observable("");
        self.first_name = ko.observable("");
        self.last_name = ko.observable("");
    };

    homeType.prototype.refresh = function(timerRefresh){
        var self = this;
        if (self.wallet.User().profile){
            self.role(self.wallet.User().profile.role);
            self.first_name(self.wallet.User().profile.first_name);
            self.last_name(self.wallet.User().profile.last_name);
        }
        if (timerRefresh && !self.wallet.profileComplete()){
            window.location = self.wallet.settings().chRoot + '/#profile';
        } else {
            self.statusMessage("You have " + self.wallet.walletStatus.totalFmt() + " " + self.wallet.settings().coinSymbol + " in your wallet!");
        }
    };

    return homeType;
});
