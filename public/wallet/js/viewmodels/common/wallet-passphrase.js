define(['knockout','common/dialog','viewmodels/common/confirmation-dialog','viewmodels/common/command'],
    function(ko,dialog,ConfirmationDialog,Command) {
    var defaultWalletStakingUnlockTime = 999999;
    var walletPassphraseType = function(options){
        var self = this,
            opts = options || {};
        this.forEncryption = ko.observable(opts.forEncryption) || ko.observable(false);
        this.walletPassphrase = ko.observable(opts.walletPassphrase || '');
        this.walletPassphraseConfirm = ko.observable('');
        this.stakingOnly = opts.stakingOnly === false ? ko.observable(false) : ko.observable(true);
        this.canSpecifyStaking = opts.canSpecifyStaking === true ? ko.observable(true) : ko.observable(false);
        this.chRoot = ko.observable(opts.chRoot || '');
        this.env = ko.observable(opts.env || 'production');
        this.canSubmit = ko.computed(function(){
            //return true;
            var passphrase = self.walletPassphrase(),
                passphraseConfirm = self.walletPassphraseConfirm();    

            return passphrase.length > 0 && (self.forEncryption() ? passphrase === passphraseConfirm : true) ;
        });
    };

    walletPassphraseType.prototype.userPrompt = function(encrypt, title, message, affirmativeButtonText){
        var self = this, 
            walletPassphraseDeferred = $.Deferred(),
            passphraseDialog = new ConfirmationDialog({
                title: title || 'Wallet Passphrase',
                contentTemplate: "modals/password-prompt",
                context: self,
                canAffirm: self.canSubmit,
                allowClose: true,
                showNegativeButton: false,
                message: encrypt ? "Specify a passphrase for encrypting your wallet" : "",
                affirmativeButtonText: affirmativeButtonText,
                affirmativeHandler: function(){
                    if(self.canSubmit()){
                        self.openWallet(encrypt)
                            .done(function(result){
                                walletPassphraseDeferred.resolve($.extend(result, { passphrase: self.walletPassphrase() } ));
                            })
                            .fail(function(error){
                                walletPassphraseDeferred.reject(error);
                            });
                    }
                }
            });
            self.forEncryption(encrypt);
            passphraseDialog.open();

        return walletPassphraseDeferred.promise();
    };

    walletPassphraseType.prototype.openWallet = function(encrypt){
        var self = this,
            openWalletDeferred = $.Deferred(),
            // TODO: Use encryption instead of base64
            walletPassphraseCommand = encrypt ?
                new Command('encryptwallet',
                            [encodeURIComponent(btoa(self.walletPassphrase()))],
                            self.chRoot(),
                            self.env())     :
                new Command('walletpassphrase',
                            [encodeURIComponent(btoa(self.walletPassphrase())), defaultWalletStakingUnlockTime,  self.stakingOnly()],
                            self.chRoot(),
                            self.env());

        walletPassphraseCommand.execute()
            .done(function(result){
                openWalletDeferred.resolve(result);
            })
            .fail(function(error){
                //Consider creating a custom error object with message, static codes, etc...
                openWalletDeferred.reject(error);
            })
            .always(function(){
                //Close the dialog 
            });

        return openWalletDeferred.promise();
    };
    return walletPassphraseType;
});
