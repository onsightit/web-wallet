define(['knockout',
        'common/dialog',
        'viewmodels/common/confirmation-dialog',
        'viewmodels/common/wallet-passphrase',
        'viewmodels/common/command',
        'patterns'], function(ko,dialog,ConfirmationDialog,WalletPassphrase,Command,patterns){
    var sendType = function(options){
        var self = this;
        self.wallet = options.parent || {};

        self.statusMessage = ko.observable("");

        self.txcomment = ko.observable("");

        self.recipientAddress = ko.observable("").extend( 
            {
                pattern: { params: patterns.coin, message: 'Not a valid address.' }
            });

        self.label = ko.observable("");

        self.amount = ko.observable(0.00).extend(
            {
                number: true,
                required: true
            });
        self.available = ko.observable(0.00);
        self.maxSendAmount = ko.observable(0.00);
        self.coinSymbol = ko.observable("");

        self.minTxFee = ko.observable(0.0001);

        self.canSend = ko.computed(function(){
            var address = self.recipientAddress(),
                addressValid = (address.length > 0 && self.recipientAddress.isValid()),
                //label = self.label,
                amount = self.amount(),
                available = self.available(),
                amountValid = !isNaN(amount) && amount > 0.00 && amount < available && self.amount.isValid() && amount <= self.maxSendAmount();

            return (addressValid && amountValid);
        });

        self.isEncrypted = ko.computed(function(){
            return (self.wallet.walletStatus.isEncrypted() === 'Yes');
        });
    };

    sendType.prototype.refresh = function(timerRefresh){
        var self = this;
        self.available(self.wallet.walletStatus.available());
        self.maxSendAmount(self.wallet.settings().maxSendAmount);
        self.coinSymbol(self.wallet.settings().coinSymbol);
        self.minTxFee(self.wallet.settings().minTxFee);

        self.statusMessage("Available: " + self.available() + " " + self.wallet.settings().coinSymbol + " ( Maximum send allowed: " + self.maxSendAmount() + " )");
    };

    sendType.prototype.lockWallet = function(){
        var self = this;
        var sendCommand = new Command('walletlock', [],
                                      self.wallet.settings().chRoot,
                                      self.wallet.settings().env).execute()
            .done(function(){
                console.log('Wallet relocked');
            })
            .fail(function(error){
                dialog.notification(error.message, "Failed to re-lock wallet");
            });
        return sendCommand;
    };

    sendType.prototype.unlockWallet = function(){
        var self = this;
        var walletPassphrase = new WalletPassphrase({canSpecifyStaking:true,
                                                    stakingOnly:false,
                                                    chRoot: self.wallet.settings().chRoot,
                                                    env: self.wallet.settings().env
                                                    }
            ), passphraseDialogPromise = $.Deferred();

        walletPassphrase.userPrompt(false, 'Wallet Unlock', 'Unlock the wallet for sending','OK')
            .done(function(){
                passphraseDialogPromise.resolve(walletPassphrase.walletPassphrase());                            
            })
            .fail(function(error){
                passphraseDialogPromise.reject(error);
            });
        return passphraseDialogPromise;
    };

    sendType.prototype.sendSubmit = function(){
        var self = this;
        console.log("Send request submitted.");
        if(self.canSend()){
            if (self.isEncrypted()){
                console.log("Unlocking wallet for sending.");
                self.lockWallet().done(function(){
                    console.log('Wallet locked. Prompting for confirmation...');
                    self.sendConfirm(self.amount())
                        .done(function(){
                            self.unlockWallet()
                                .done(function(result){
                                    console.log("Wallet successfully unlocked, sending...");
                                    self.sendToAddress(result);
                                })
                                .fail(function(error){
                                    dialog.notification(error.message);
                                });
                        })
                        .fail(function(error){
                            dialog.notification(error.message);
                        });
                });
            } else {
                console.log("Sending...");
                self.sendToAddress(null);
            }
        }
        else{
            console.log("Can't send. Form in invalid state.");
        }
    };

    sendType.prototype.sendConfirm = function(amount){
        var self = this,
            sendConfirmDeferred = $.Deferred(),
            sendConfirmDialog = new ConfirmationDialog({
                title: 'Send Confirm',
                context: self,
                allowClose: false,
                message: 'You are about to send ' + amount + ' ' + self.wallet.settings().coinSymbol + ', in addition to the minimum transaction fee (' + self.minTxFee() + '). Do you wish to continue?',
                affirmativeButtonText: 'Yes',
                negativeButtonText: 'No',
                affirmativeHandler: function(){ sendConfirmDeferred.resolve(); },
                negativeHandler: function(){ sendConfirmDeferred.reject(); }
            });
        sendConfirmDialog.open();
        return sendConfirmDeferred.promise();
    };
    
    sendType.prototype.sendToAddress = function(auth) { 
        var self = this;
        // Encode base64 before sending.
        var txcomment = encodeURIComponent(btoa(self.txcomment()));
        var sendCommand = new Command('sendfrom',
                                      [self.wallet.account(), self.recipientAddress(), self.amount(), 1, 'SEND', self.recipientAddress(), txcomment],
                                      self.wallet.settings().chRoot,
                                      self.wallet.settings().env).execute()
            .done(function(txid){
                console.log("TxId: " + JSON.stringify(txid));
                if (typeof txid !== 'undefined') {
                    self.statusMessage(self.amount() + " " + self.wallet.settings().coinSymbol + " successfully sent!");
                } else {
                    self.statusMessage("Your transaction was not sent. Try a smaller ammount.");
                }
                // Reset Send button
                self.recipientAddress("");
                self.amount(0);
                self.txcomment("");

                if (self.isEncrypted()){
                    self.lockWallet()
                        .done(function(){
                            var walletPassphrase = new WalletPassphrase({
                                walletPassphrase: auth,
                                forEncryption: false,
                                stakingOnly: true,
                                chRoot: self.wallet.settings().chRoot,
                                env: self.wallet.settings().env
                            });
                            console.log("Wallet successfully relocked. Opening for staking...");
                            walletPassphrase.openWallet(false)
                                .done(function() {
                                    auth = "";
                                    console.log("Wallet successfully re-opened for staking");
                                });
                        });
                }
            })
            .fail(function(error){
                self.statusMessage("Sorry, there was a problem sending.");
                console.log("Send error:");
                console.log(error);
                dialog.notification(error.message);
            });
        return sendCommand;
    };   

    return sendType; 
});
