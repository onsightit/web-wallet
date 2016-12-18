define(['knockout',
    'viewmodels/common/command',
    './profile-pulldown',
    'lib/dateformat',
    'viewmodels/wallet-status'], function(ko,Command,Pulldown,Dateformat){
    var profileType = function(options){
        var self = this;
        self.wallet = options.parent || {};

        // Source value arrays for pulldown menues
        self.pulldown = new Pulldown();

        self.node_id = ko.observable("");
        self.account = ko.observable("");
        self.address = ko.observable("");

        self.profileComplete = ko.observable(false);
        self.role = ko.observable("");
        self.login_type = ko.observable("");
        self.login_id = ko.observable("");
        self.credit = ko.observable(0.0000);
        self.creditFmt = ko.pureComputed(function(){return self.wallet.formatNumber(self.credit(), 4, '.', ',');});
        self.facebookUrl = ko.observable("https://facebook.com/");
        self.googleUrl = ko.observable("https://plus.google.com/");
        self.twitterUrl = ko.observable("https://twitter.com/");

        // User changeables
        self.name = ko.observable("");
        self.email = ko.observable("");
        self.description = ko.observable("");
        self.age = ko.observable("");
        self.dob = ko.observable("");
        self.gender = ko.observable("");
        self.country = ko.observable("");

        self.dirtyFlag = ko.observable(false);
        self.isDirty = ko.computed(function() {
            return self.dirtyFlag();
        });

        // User changeables subscriptions
        self.name.subscribe(function (){self.dirtyFlag(true);});
        self.email.subscribe(function (){self.dirtyFlag(true);});
        self.description.subscribe(function (){self.dirtyFlag(true);});
        self.dob.subscribe(function (){
            if (self.dob() !== ""){
                var curDateYY = Dateformat(Date.now(), "yyyy");
                var curDateMM = Dateformat(Date.now(), "mm");
                var curDateDD = Dateformat(Date.now(), "dd");
                var dobDateYY = Dateformat(self.dob(), "yyyy");
                var dobDateMM = Dateformat(self.dob(), "mm");
                var dobDateDD = Dateformat(self.dob(), "dd");
                var age = curDateYY - dobDateYY;
                if (curDateMM < dobDateMM){
                    age--;
                } else {
                    if (curDateMM === dobDateMM && curDateDD < dobDateDD){
                        age--; // Almost birthday time!
                    }
                }
                self.age(age);
                self.dirtyFlag(true);
            }
        });
        self.gender.subscribe(function (){self.dirtyFlag(true);});
        self.country.subscribe(function (){self.dirtyFlag(true);});

        self.canSubmit = ko.computed(function(){
            var canSubmit = self.name() !== "" &&
                            self.email() !== "" &&
                            self.age() >= 18 &&
                            self.dob() !== "" &&
                            self.gender() !== "" &&
                            self.country() !== "";
            return canSubmit;
        });

        self.statusMessage = ko.observable("");
    };

    profileType.prototype.refresh = function(){
        var self = this;
        if (!self.isDirty()){
            self.login_type(self.wallet.User().profile.login_type);
            switch(self.login_type()){
                case ("local"):
                    self.login_id(self.wallet.User().local.id);
                    break;
                case ("facebook"):
                    self.login_id(self.wallet.User().facebook.id);
                    break;
                case ("google"):
                    self.login_id(self.wallet.User().google.id);
                    break;
                case ("twitter"):
                    self.login_id(self.wallet.User().twitter.id);
                    break;
                default:
                    break;
            }
            self.node_id(self.wallet.node_id());
            self.account(self.wallet.account());
            self.address(self.wallet.address());

            self.role(self.wallet.User().profile.role);
            self.name(self.wallet.User().profile.name);
            self.email(self.wallet.User().profile.email);
            self.description(self.wallet.User().profile.description);
            self.age(self.wallet.User().profile.age);
            if (self.wallet.User().profile.dob && self.wallet.User().profile.dob !== ""){
                self.dob(Dateformat(self.wallet.User().profile.dob, "GMT:yyyy-mm-dd")); // Dates from db need conversion to GMT
            }
            self.gender(self.wallet.User().profile.gender);
            self.country(self.wallet.User().profile.country);
            self.credit(self.wallet.User().profile.credit);

            if (!self.wallet.profileComplete()){
                self.profileComplete(false);
                self.statusMessage("Please complete your profile before continuing.");
            } else {
                self.profileComplete(true);
                self.statusMessage("");
            }
            self.dirtyFlag(false);
        }
    };

    profileType.prototype.Reset = function(){
        var self = this;
        self.dirtyFlag(false);
        this.refresh();
    };

    profileType.prototype.Submit = function(){
        var self = this;
        // Save User changeables
        self.wallet.User().profile.name = self.name();
        self.wallet.User().profile.email = self.email();
        self.wallet.User().profile.description = self.description();
        self.wallet.User().profile.age = self.age();
        self.wallet.User().profile.dob = self.dob();
        self.wallet.User().profile.gender = self.gender();
        self.wallet.User().profile.country = self.country();
        var saveUserProfileCommand = new Command('saveuserprofile',
                                                [encodeURIComponent(btoa(JSON.stringify(self.wallet.User().profile)))],
                                                self.wallet.settings().chRoot,
                                                self.wallet.settings().env);
        saveUserProfileCommand.execute()
            .done(function(){
                console.log("Profile Saved!");
                self.statusMessage("Profile Saved!");
                self.dirtyFlag(false);
                self.wallet.initUser(); // wallet needs updating.
            })
            .fail(function(error){
                console.log("Error:" + error.toString());
                self.statusMessage("Save Error!");
            });
    };

    return profileType;
});
