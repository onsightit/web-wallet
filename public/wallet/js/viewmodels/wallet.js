Number.prototype.formatNumber = function(p, d, c){
        var n = this,
        p = isNaN(p = Math.abs(p)) ? 2 : p,
        d = d === undefined ? "." : d,
        c = c === undefined ? "," : c,
        s = n < 0 ? "-" : "",
        i = parseInt(n = Math.abs(+n || 0).toFixed(p)) + "",
        j = (j = i.length) > 3 ? j % 3 : 0;
       return s + (j ? i.substr(0, j) + c : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + c) + (p ? d + Math.abs(n - i).toFixed(p).slice(2) : "");
};

define(['knockout',
    'common/dialog',
    'viewmodels/wallet-status',
    'viewmodels/home/home',
    'viewmodels/send/send',
    'viewmodels/receive/receive',
    'viewmodels/history/history',
    'viewmodels/explore/explore',
    'viewmodels/console/console',
    'viewmodels/profile/profile',
    'bindinghandlers/modal',
    'viewmodels/common/wallet-passphrase',
    'viewmodels/common/command'], function(ko, dialog, WalletStatus, Home, Send, Receive, History, Explore, Console, Profile, Modal, WalletPassphrase, Command){

    var walletType = function(){
        var self = this;

        self.sessionTimeout = ko.observable(2 * 60 * 60 * 1000); // Application session timeout = 2 Hours between change of views.
        self.sessionExpires = ko.observable(Date.now() + self.sessionTimeout());

        self.User = ko.observable({});
        self.role = ko.observable("");             // For features control
        self.gender = ko.observable("");           // For personalization of wallet

        self.node_id = ko.observable("");
        self.account = ko.observable("");
        self.address = ko.observable("");

        self.isLocalWallet = ko.observable(false);  // Is the node local?
        self.settings = ko.observable({});          // Some settings from settings.json

        // Get node_id and settings, and User account
        self.initNode('/wallet'); // Set unknown chRoot to common production environment.

        self.walletStatus = new WalletStatus({parent: self});

        self.currentView = ko.observable('home');
        self.sidebarToggled = ko.observable(true);

        this.home = new Home({parent: self});
        this.send = new Send({parent: self});
        this.receive = new Receive({parent: self});
        this.history = new History({parent: self});
        this.explore = new Explore({parent: self});
        this.console = new Console({parent: self});
        this.profile = new Profile({parent: self});

        self.currentView.subscribe(function (){
            self.sessionExpires(Date.now() + self.sessionTimeout());
        });

        self.profileComplete = ko.computed(function(){
            var isComplete = false;
            if (self.User().profile && self.User().profile.name !== 'undefined') {
                isComplete = self.User().profile.name !== "" &&
                             self.User().profile.age > 0 &&
                             self.User().profile.dob && self.User().profile.dob !== "" &&
                             self.User().profile.weight > 0 &&
                             self.User().profile.waist > 0 &&
                             self.User().profile.gender !== "" &&
                             self.User().profile.ethnicity !== "" &&
                             self.User().profile.country !== "";
            }
            return isComplete;
        });

        self.initComplete = false;
        self.isLoadingStatus = ko.observable(true);

        self.timeout = 1000;

        // Start polling!
        self.pollWalletStatus();
    };

    // Called once at startup.
    walletType.prototype.initNode = function(chRoot){
        var self = this;
        // Catch-22: We don't know if the Web Wallet is chRoot'd to /public or /public/wallet,
        // because 'settings' has not been set yet, so we need to test for a failure first
        // to determine if settings().chRoot is "" or "/wallet".
        var getNodeInfoCommand = new Command('getnodeinfo', [],
                                             chRoot, // unknown chRoot on first call.
                                             'production'); // Gets the wallet info and settings quietly
        $.when(getNodeInfoCommand.execute())
            .done(function(getNodeInfoData){
                if (typeof getNodeInfoData.node_id !== 'undefined'){
                    self.node_id(getNodeInfoData.node_id);
                    self.isLocalWallet(getNodeInfoData.isLocal);
                    self.settings(getNodeInfoData.settings);
                    if (self.settings().env !== 'production'){
                        console.log("WARNING: Not running in production mode!\n  (settings.env=" + self.settings().env + ")");
                    }
                } else {
                    // Bailing...
                    console.log("ERROR: Aborting! Node_ID not found.");
                    window.location = 'logout';
                }
                self.initUser();
            }).fail(function(jqXHR){
                // If the second call to initNode fails, we bail.
                if (chRoot === '/wallet'){
                    self.initNode(''); // Set unknown chRoot to normal '' mode.
                } else {
                    // Bailing...
                    console.log("ERROR: Aborting! Unknown chRoot!");
                    console.log("jqXHR: " + JSON.stringify(jqXHR));
                    window.location = 'logout';
                }
            });
    };

    // Called once at startup.
    walletType.prototype.initUser = function(){
        var self = this;
        var getUserAccountCommand = new Command('getuseraccount', [],
                                                self.settings().chRoot,
                                                'production'); // Gets the User from the session quietly
        $.when(getUserAccountCommand.execute())
            .done(function(getUserAccountData){
                if (typeof getUserAccountData.User !== 'undefined'){
                    self.User(getUserAccountData.User);
                    self.role(self.User().profile.role);
                    self.gender(self.User().profile.gender);
                    // Get the user's wallet account info for this node_id
                    var wallet = self.User().wallet.filter(function(wal){
                        if(wal.node_id && wal.node_id === self.node_id()){
                            self.account(wal.account);
                            self.address(wal.address);
                            return wal;
                        }
                    });
                    if (!wallet) {
                        // Bailing...
                        console.log("ERROR: Aborting! User wallet not found.");
                        window.location = 'logout';
                    }
                } else {
                    // Bailing...
                    console.log("ERROR: Aborting! User account not found.");
                    window.location = 'logout';
                }
                self.initComplete = true;
            });
    };

    // Refresh the universe every 'self.timeout' miliseconds.
    walletType.prototype.pollWalletStatus = function(){
        var self = this;
        setTimeout(function(){
            if (!self.initComplete){
                // Prevent polling forever if init never finishes.
                if (Date.now() <= self.sessionExpires()){
                        self.pollWalletStatus();
                } else {
                    console.log("Session Expired. Polling stopped.");
                    window.location = 'logout';
                }
            } else {
                // Normal polling
                if (Date.now() <= self.sessionExpires()){
                    $.when(self.refresh()).done(function(){
                        if (self.timeout < 60000){ // First timeout
                            self.timeout = 60000;
                            // Turn off initial loading icon
                            self.isLoadingStatus(false);
                            // One-time call after first refresh
                            self.checkEncryptionStatus();
                        }
                        // This gets re-called until the user completes their profile.
                        // TODO: Find a better way to do this!
                        if (!self.profileComplete()){
                            self.initUser();
                        }
                        self.pollWalletStatus();
                    });
                } else {
                    console.log("Session Expired. Polling stopped.");
                    window.location = 'logout';
                }
            }
        },self.timeout);
    };

    // Refresh the universe.
    walletType.prototype.refresh = function(){
        var self = this;
        var refreshPromise = $.when(self.walletStatus.refresh())
            .done(function(){
                self.home.refresh();
                self.send.refresh();
                self.receive.refresh();
                self.history.refresh();
                self.explore.refresh();
                self.console.refresh();
                self.profile.refresh();
	    });
        return refreshPromise;
    };

    walletType.prototype.checkEncryptionStatus = function(){
        var self = this;
        // Do not allow non-local wallets to be encrypted except by MASTER_ACCOUNT!
        if (self.isLocalWallet() || (self.account() === self.settings().masterAccount && self.settings().masterCanEncrypt === true)){
            switch(self.walletStatus.unlockedUntil()){
            case -1: // wallet is unencrypted
                self.promptToEncrypt();
                break;
            case 0:  // wallet is locked
                self.promptToUnlockForStaking();
                break;
            default: // 999999 - wallet is already unlocked for staking
                break;
            }
        }
    };

    walletType.prototype.unlockWallet = function(){
        var self = this;
        if (self.isLocalWallet() || self.account() === self.settings().masterAccount){
            new WalletPassphrase({canSpecifyStaking: true}).userPrompt(false, 'Unlock Wallet', 'This action will unlock the wallet for sending or staking','OK')
            .done(function(result){
                //console.log(result);
                self.walletStatus.refresh(self.account());
                result.passphrase = "XXXXXXXX"; // Clear password in memory
            })
            .fail(function(error){
                console.log(error);
                dialog.notification(error.message);
                self.walletStatus.refresh(self.account());
            });
        }
    };

    walletType.prototype.lockWallet = function(){
        var self = this;
        if (self.isLocalWallet() || self.account() === self.settings().masterAccount){
            var walletLockCommand = new Command('walletlock', [],
                                                self.settings().chRoot,
                                                self.settings().env).execute()
            .done(function(){
                dialog.notification("Wallet is now locked. To send transactions or stake you must unlock the wallet.");
                self.walletStatus.refresh(self.account());
            })
            .fail(function(){
                dialog.notification("Wallet is already locked.");
                self.walletStatus.refresh(self.account());
            });
            return walletLockCommand;
        }
    };

    walletType.prototype.promptToEncrypt = function(){
        new WalletPassphrase().userPrompt(true, 'Encrypt Wallet', 'Encrypt','OK')
            .done(function(result){
                console.log(result);
                dialog.notification("Wallet successfully encrypted. Restart your coin daemon to continue.");
            })
            .fail(function(error){
                console.log(error);
                dialog.notification(error.message);
            });
    };

    walletType.prototype.promptToUnlockForStaking = function(){
        new WalletPassphrase({canSpecifyStaking: true}).userPrompt(false, 'Unlock Wallet', 'Unlock the wallet','OK')
            .done(function(result){
                result.passphrase = "XXXXXXXX"; // Clear password in memory
                console.log(result);
            })
            .fail(function(error){
                console.log(error);
                dialog.notification(error.message);
            });
    };

    walletType.prototype.formatNumber = function(value, precision, decimalPoint, commaSeparator){
        return value.formatNumber(precision, decimalPoint, commaSeparator);
    };

    walletType.prototype.toggleSidebar = function(){
        this.sidebarToggled(!this.sidebarToggled());
    };

    return walletType; 
});
