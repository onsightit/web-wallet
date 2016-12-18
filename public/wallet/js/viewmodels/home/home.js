define(['knockout'], function(ko){
    var homeType = function(options){
        var self = this;
        self.wallet = options.parent || {};

        self.name = ko.observable("");
        self.role = ko.observable("");

        self.statusMessage = ko.observable("");
    };

    homeType.prototype.refresh = function(){
        var self = this;
        if (self.wallet.User().profile){
            self.name(self.wallet.User().profile.name);
            self.role(self.wallet.User().profile.role);
        }
        if (!self.wallet.profileComplete()){
            self.statusMessage("Please complete your profile before continuing.");
        } else {
            self.statusMessage("You have " + self.wallet.walletStatus.totalFmt() + " " + self.wallet.settings().coinSymbol + " in your wallet!");
        }
    };

    return homeType;
});
