define(['knockout','common/dialog'], function(ko,dialog) {
    var termsDialogType = function(options){
        this.opts = options || { openDialog: function() { alert('No dialog container'); }, closeDialog: function() { } };
        this.context = this.opts.context || this;
        this.title = this.opts.title || "Terms and Conditions";
        this.affirmativeHandler = this.opts.affirmativeHandler;
        this.negativeHandler = this.opts.negativeHandler;
        this.allowClose = !(this.opts.allowClose === false);
        this.showNegativeButton = !(this.opts.showNegativeButton === false);
        this.template = this.opts.template || "modals/terms-dialog";
        this.canAffirm = this.opts.canAffirm || ko.observable(true);
        
        this.contentTemplate = this.opts.contentTemplate || "modals/terms-message";
        this.message = this.opts.message || "";
        this.affirmativeButtonText = this.opts.affirmativeButtonText || "Yes";
        this.negativeButtonText = this.opts.negativeButtonText || "No";
    };

    termsDialogType.prototype.open = function(){
        dialog.openDialog(this,this.template);
    };

    termsDialogType.prototype.close = function(){
        dialog.closeDialog();
    };

    termsDialogType.prototype.affirmative = function() {
        if(this.canAffirm()){
            dialog.closeDialog();
            this.affirmativeHandler.call(this.context);
        }
    };

    termsDialogType.prototype.negative = function(){
        dialog.closeDialog();
        this.negativeHandler.call(this.context);
    };

    return termsDialogType;
});
