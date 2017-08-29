define(['knockout',
    'viewmodels/common/command'], function(ko,Command){
    var walletStatusType = function(options){
        var self = this;
        self.wallet = options.parent;

        self.total = ko.observable(0.0000);
        self.stake = ko.observable(0.0000);
        self.available = ko.observable(0.0000);
        self.blocks = ko.observable(0);
        self.totalBlocks = ko.observable(1);
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

        self.blockProgress = ko.pureComputed(function(){
            var progress = 100 * self.blocks() / self.totalBlocks();
            console.log("Progress: " + progress);
            return progress + '%';
        }).extend({ rateLimit: 500 });
    };

    walletStatusType.prototype.refresh = function(){
        var self = this;
        // If wallet daemon is running.
        if (self.wallet.walletUp()) {
            self.decimalPlaces(self.wallet.settings().decimalPlaces);
            var getInfoCommand = new Command('getinfo', [],
                                            self.wallet.settings().chRoot,
                                            self.wallet.settings().env);
            var getBalanceCommand = new Command('getbalance', [self.wallet.account()],
                                            self.wallet.settings().chRoot,
                                            self.wallet.settings().env);
            var getPeerInfoCommand = new Command('getpeerinfo', [],
                                            self.wallet.settings().chRoot,
                                            self.wallet.settings().env);
            var getBlockCountCommand = new Command('getblockcount', []);
            var statusPromise = $.when(getInfoCommand.execute(), getBalanceCommand.execute(), getPeerInfoCommand.execute(), getBlockCountCommand.execute())
                .done(function(getInfoData, getBalanceData, getPeerInfoData, getBlockCountData){
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
                    self.totalBlocks(self.findHighestPeerBlock(getPeerInfoData, { startingheight: getBlockCountData }));
                });
            return statusPromise;
        }
    };

    walletStatusType.prototype.findHighestPeerBlock = function(peerInfo, knownHeight){
        return peerInfo.reduce(function(previous, current){ 
            var prevheight = previous ? previous.startingheight : 0, curheight = current ? current.startingheight : 0;
            return { startingheight: curheight > prevheight ? curheight : prevheight }; 
        }, knownHeight).startingheight;
    }

    return walletStatusType;
});
