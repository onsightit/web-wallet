define(['knockout','common/dialog'], function(ko,dialog) {
    var confirmationDialogType = function(options){
        this.wallet = options.wallet || options.context.parent || { openDialog: function() { alert('No dialog container'); }, closeDialog: function() { } };
        this.context = options.context || this;
        this.title = options.title || "Notification";
        this.affirmativeHandler = options.affirmativeHandler;
        this.negativeHandler = options.negativeHandler;
        this.allowClose = !(options.allowClose === false);
        this.showNegativeButton = !(options.showNegativeButton === false);
        this.template = options.template || "modals/confirmation-dialog";
        this.canAffirm = options.canAffirm || ko.observable(true);
        
        this.contentTemplate = options.contentTemplate || "modals/confirmation-message";
        this.message = options.message || "";
        this.affirmativeButtonText = options.affirmativeButtonText || "OK";
        this.negativeButtonText = options.negativeButtonText || "Cancel";
    };

    confirmationDialogType.prototype.open = function(){
        dialog.openDialog(this,this.template);
    };

    confirmationDialogType.prototype.close = function(){
        dialog.closeDialog();
    };

    confirmationDialogType.prototype.affirmative = function() {
        if(this.canAffirm()){
            dialog.closeDialog();
            this.affirmativeHandler.call(this.context);
        }
    };

    confirmationDialogType.prototype.negative = function(){
        dialog.closeDialog();
        this.negativeHandler.call(this.context);
    };

    return confirmationDialogType;
});
