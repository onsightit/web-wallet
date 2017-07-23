define(['knockout',
    'common/dialog',
    'viewmodels/receive/receive-address',
    'viewmodels/common/command',
    'viewmodels/receive/new-address-dialog'], function(ko,dialog,ReceiveAddress,Command,NewAddressDialog) {
    var receiveType = function(options) {
        var self = this;
        self.wallet = options.parent || {};

        self.statusMessage = ko.observable("");

        self.addresses = ko.observableArray([]);
        self.isLoadingReceiveAddresses = ko.observable(false);
        self.isLoading = ko.computed(function() {
            var trans = self.isLoadingReceiveAddresses();
            return trans;
        });
        self.newAddressDialog = new NewAddressDialog({parent: self});
        self.showNewAddressDialog = ko.observable(false);
    };

    receiveType.prototype.refresh = function(timerRefresh) {
        var self = this;
        if (self.wallet.account() !== "") {
            if (self.wallet.account() === self.wallet.settings().masterAccount) {
                self.statusMessage("Master Account Receive Addresses");
            }
        }
        if (!timerRefresh) {
            self.statusMessage("");
            self.getAddressesByAccount(self.wallet.account());
        }
    };

    receiveType.prototype.getAddressesByAccount = function(account) {
        var self = this,
            getAddressesByAccountCommand = new Command('getaddressesbyaccount', [account],
                                                         self.wallet.settings().chRoot,
                                                         self.wallet.settings().env);
        self.isLoadingReceiveAddresses(true);
        var receivePromise = getAddressesByAccountCommand.execute()
            .done(function(data) {
                var addresses = [];
                for (var k in data) {
                    //console.log("data[k]:" + JSON.stringify(data[k]));
                    addresses.push(new ReceiveAddress({ addressObj: { account: account, address: data[k] } }));
                }
                addresses.sort(function(a, b) {return b.amount - a.amount;}); // Sort by amount descending
                if (addresses.length > self.addresses().length) {
                    self.addresses(ko.utils.arrayMap(addresses, function(addressObj) {
                        return new ReceiveAddress({addressObj: addressObj});
                    }));
                    var saveUserWalletCommand = new Command('saveuserwallet',
                                                            [encodeURIComponent(btoa(self.wallet.account())),
                                                             encodeURIComponent(btoa(JSON.stringify(addresses)))],
                                                            self.wallet.settings().chRoot,
                                                            self.wallet.settings().env);
                    saveUserWalletCommand.execute()
                        .done(function(data) {
                            self.wallet.initUser(); // wallet needs updating.
                        })
                        .fail(function() {
                            self.statusMessage("Addresses Save Error!");
                        });
                }
                self.isLoadingReceiveAddresses(false);
            });
        return receivePromise;
    };

    receiveType.prototype.newAddress = function() {
        dialog.openDialog(this.newAddressDialog, 'modals/new-address');
    };

    receiveType.prototype.newAddressConfirm = function() {
        var self = this,
            getNewAddressCommand = new Command('getnewaddress', [self.wallet.account()],
                                               self.wallet.settings().chRoot,
                                               self.wallet.settings().env);

        getNewAddressCommand.execute()
            .done(function(address) {
                if (address && address.length === 34) {
                    var addresses = [];
                    for (var k in self.addresses()) {
                        if (self.addresses()[k].account === self.wallet.account()) {
                            // Save the address object
                            addresses.push(self.addresses()[k]);
                        }
                    }
                    addresses.push(new ReceiveAddress({ addressObj: { account: self.wallet.account(), address: address } }));
                    addresses.sort(function(a, b) {return b.amount - a.amount;}); // Sort by amount descending
                    self.addresses(ko.utils.arrayMap(addresses, function(addressObj) {
                        return new ReceiveAddress({addressObj: addressObj});
                    }));
                    var saveUserWalletCommand = new Command('saveuserwallet',
                                                            [encodeURIComponent(btoa(self.wallet.account())),
                                                             encodeURIComponent(btoa(JSON.stringify(addresses)))],
                                                            self.wallet.settings().chRoot,
                                                            self.wallet.settings().env);
                    saveUserWalletCommand.execute()
                        .done(function(data) {
                            self.statusMessage("New Address Added!");
                            self.wallet.initUser(); // wallet needs updating.
                        })
                        .fail(function() {
                            self.statusMessage("New Address Save Error!");
                        });
                } else {
                    self.statusMessage("There was a problem creating a new address.");
                }
            })
            .fail(function() {
            })
            .always(function() {
            });

        dialog.closeDialog();
    };

    receiveType.prototype.newAddressCancel = function() {
        dialog.closeDialog();
    };

    receiveType.prototype.listReceivedByAddresses = function() {
        var self = this,
            masterAccount = (self.wallet.account() === self.wallet.settings().masterAccount),
            listReceivedByAddressesCommand = new Command('listreceivedbyaddress', ['1', true],
                                                         self.wallet.settings().chRoot,
                                                         self.wallet.settings().env);
        self.isLoadingReceiveAddresses(true);
        var receivePromise = listReceivedByAddressesCommand.execute()
            .done(function(data) {
                var addresses = [];
                for (var k in data) {
                    //console.log("data[k]:" + JSON.stringify(data[k]));
                    if (masterAccount || data[k].account === self.wallet.account()) {
                        addresses.push(data[k]);
                    }
                }
                addresses.sort(function(a, b) {return b.amount - a.amount;}); // Sort by amount descending
                self.addresses(ko.utils.arrayMap(addresses, function(addressObj) {
                    return new ReceiveAddress({addressObj: addressObj});
                }));
                self.isLoadingReceiveAddresses(false);
            });
        return receivePromise;
    };

    return receiveType; 
});
