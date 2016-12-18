define(['knockout',
    'common/dialog',
    'viewmodels/receive/receive-address',
    'viewmodels/common/command',
    'viewmodels/receive/new-address-dialog'], function(ko,dialog,ReceiveAddress,Command,NewAddressDialog){
    var receiveType = function(options){
        var self = this;
        self.wallet = options.parent || {};

        self.account = ko.observable("");
        self.addresses = ko.observableArray([]);
        self.isLoadingReceiveAddresses = ko.observable(false);
        self.isLoading = ko.computed(function(){
            var trans = self.isLoadingReceiveAddresses();
            return trans;
        });
        self.newAddressDialog = new NewAddressDialog({parent: self});
        self.showNewAddressDialog = ko.observable(false);

        self.statusMessage = ko.observable("");
    };

    receiveType.prototype.refresh = function(){
        var self = this;
        if (self.account() === ""){
            self.account(self.wallet.account());
            if (self.account() === self.wallet.settings().masterAccount){
                self.statusMessage("Global Receive Addresses View");
            }
        }
        self.getReceiveAddresses();
    };

    receiveType.prototype.newAddress = function(){
        dialog.openDialog(this.newAddressDialog, 'modals/new-address');
    };

    receiveType.prototype.newAddressConfirm = function(){
        var self = this,
            getNewAddressCommand = new Command('getnewaddress', [self.account()],
                                               self.wallet.settings().chRoot,
                                               self.wallet.settings().env);

        getNewAddressCommand.execute()
            .done(function(address){
                if (address && address.length === 34){
                    self.addresses.push(new ReceiveAddress({addressObj:{address: address, account: self.account()}}));
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
                if (self.account() !== self.wallet.settings().masterAccount){
                    for (var k in data){
                        //console.log("data[k]:" + JSON.stringify(data[k]));
                        if (data[k].account !== self.wallet.account()){
                            delete data[k];
                        }
                    }
                }
                self.addresses(ko.utils.arrayMap(data,function(addressObj){
                        return new ReceiveAddress({addressObj: addressObj});
                }));
                self.isLoadingReceiveAddresses(false); 
            });
        return receivePromise;
    };

    return receiveType; 
});
