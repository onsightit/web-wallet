define(['knockout'],function(ko){
    var newAddressDialogType = function(options){
        var self = this;
        self.parent = options.parent || {};
    };

    newAddressDialogType.prototype.newAddressConfirm = function(){
        this.parent.newAddressConfirm();
    };

    newAddressDialogType.prototype.newAddressCancel = function(){
        this.parent.newAddressCancel();
    };

    return newAddressDialogType;
});
