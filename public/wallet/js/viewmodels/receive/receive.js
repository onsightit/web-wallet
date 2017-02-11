define(['knockout',
    'common/dialog',
    'viewmodels/receive/receive-address',
    'viewmodels/common/command',
    'viewmodels/receive/new-address-dialog'], function(ko,dialog,ReceiveAddress,Command,NewAddressDialog){
    var receiveType = function(options){
        var self = this;
        self.wallet = options.parent || {};

        self.statusMessage = ko.observable("");

        self.addresses = ko.observableArray([]);
        self.isLoadingReceiveAddresses = ko.observable(false);
        self.isLoading = ko.computed(function(){
            var trans = self.isLoadingReceiveAddresses();
            return trans;
        });
        self.newAddressDialog = new NewAddressDialog({parent: self});
        self.showNewAddressDialog = ko.observable(false);
    };

    receiveType.prototype.refresh = function(timerRefresh){
        var self = this;
        if (self.wallet.account() !== ""){
            if (self.wallet.account() === self.wallet.settings().masterAccount){
                self.statusMessage("Master Receive Addresses View");
            }
        }
        if (!timerRefresh){
            self.getReceiveAddresses();
        }
    };

    receiveType.prototype.newAddress = function(){
        dialog.openDialog(this.newAddressDialog, 'modals/new-address');
    };

    receiveType.prototype.newAddressConfirm = function(){
        var self = this,
            getNewAddressCommand = new Command('getnewaddress', [self.wallet.account()],
                                               self.wallet.settings().chRoot,
                                               self.wallet.settings().env);

        getNewAddressCommand.execute()
            .done(function(address){
                if (address && address.length === 34){
                    var addresses = [];
                    self.addresses().push(new ReceiveAddress({addressObj:{address: address, account: self.wallet.account()}}));
                    for (var k in self.addresses()){
                        if (self.addresses()[k].account === self.wallet.account()){
                            // Save the address object
                            addresses.push(self.addresses()[k]);
                        }
                    }
                    var saveUserWalletCommand = new Command('saveuserwallet',
                                                            [encodeURIComponent(btoa(self.wallet.account())),
                                                             encodeURIComponent(btoa(JSON.stringify(addresses)))],
                                                            self.wallet.settings().chRoot,
                                                            self.wallet.settings().env);
                    saveUserWalletCommand.execute()
                        .done(function(data){
                            self.statusMessage(data);
                            self.wallet.initUser(); // wallet needs updating.
                        })
                        .fail(function(){
                            self.statusMessage("Save Error!");
                        });
                } else {
                    self.statusMessage("There was a problem creating a new address.");
                }
            })
            .fail(function(){
            })
            .always(function(){
            });

        dialog.closeDialog();
    };

    receiveType.prototype.newAddressCancel = function(){
        dialog.closeDialog();        
    };

    receiveType.prototype.getReceiveAddresses = function(){
        var self = this,
            listReceivedByAddressesCommand = new Command('listreceivedbyaddress', ['1','true'],
                                                         self.wallet.settings().chRoot,
                                                         self.wallet.settings().env);
        self.isLoadingReceiveAddresses(true);
        var receivePromise = listReceivedByAddressesCommand.execute()
            .done(function(data){
                var addresses = [],
                    masterAccount = (self.wallet.account() === self.wallet.settings().masterAccount);
                for (var k in data){
                    //console.log("data[k]:" + JSON.stringify(data[k]));
                    if (masterAccount || data[k].account === self.wallet.account()){
                        addresses.push(data[k]);
                    }
                }
                addresses.sort(function(a, b){return b.amount - a.amount;}); // Sort by amount descending
                self.addresses(ko.utils.arrayMap(addresses, function(addressObj){
                    return new ReceiveAddress({addressObj: addressObj});
                }));
                self.isLoadingReceiveAddresses(false);
            });
        return receivePromise;
    };

    return receiveType; 
});
