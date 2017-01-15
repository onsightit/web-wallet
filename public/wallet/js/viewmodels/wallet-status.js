define(['knockout',
    'viewmodels/common/command'], function(ko,Command){
    var walletStatusType = function(options){
        var self = this;
        self.wallet = options.parent;

        self.total = ko.observable(0.0000);
        self.stake = ko.observable(0.0000);
        self.available = ko.observable(0.0000);
        self.blocks = ko.observable(0);
        self.isEncrypted = ko.observable("No");
        self.isUnlocked = ko.observable("No");
        self.unlockedUntil = ko.observable(-1);

        self.decimalPlaces = ko.observable(4);
        self.totalFmt = ko.observable("0.0000");
        self.stakeFmt = ko.observable("0.0000");
        self.availableFmt = ko.observable("0.0000");

        self.total.subscribe(function (){self.totalFmt(self.wallet.formatNumber(self.total(), self.decimalPlaces(), '.', ','));});
        self.stake.subscribe(function (){self.stakeFmt(self.wallet.formatNumber(self.stake(), self.decimalPlaces(), '.', ','));});
        self.available.subscribe(function (){self.availableFmt(self.wallet.formatNumber(self.available(), self.decimalPlaces(), '.', ','));});
    };

    walletStatusType.prototype.refresh = function(){
        var self = this;
        self.decimalPlaces(self.wallet.settings().decimalPlaces);
        var getInfoCommand = new Command('getinfo', [],
                                         self.wallet.settings().chRoot,
                                         self.wallet.settings().env),
            getBalanceCommand = new Command('getbalance', [self.wallet.account()],
                                         self.wallet.settings().chRoot,
                                         self.wallet.settings().env);
        var statusPromise = $.when(getInfoCommand.execute(), getBalanceCommand.execute())
            .done(function(getInfoData, getBalanceData){
                if (typeof getInfoData.unlocked_until !== 'undefined'){
                    self.isEncrypted("Yes");
                    self.unlockedUntil(getInfoData.unlocked_until);
                    if (self.unlockedUntil() > 0){
                        self.isUnlocked("Yes");
                    } else {
                        self.isUnlocked("No");
                    }
                }
                if (self.wallet.account() === self.wallet.settings().masterAccount){
                    self.total(getInfoData.balance + self.stake());
                    self.stake(getInfoData.stake);
                } else {
                    // Only show details related to user account
                    self.total((!isNaN(getBalanceData) ? getBalanceData : 0));
                    self.stake(0);
                }
                self.available(self.total() - self.stake());
                self.blocks(getInfoData.blocks);
            });
        return statusPromise;
    };

    return walletStatusType;
});
