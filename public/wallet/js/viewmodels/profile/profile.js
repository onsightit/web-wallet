define(['knockout',
    'viewmodels/common/command',
    '../common/profile-pulldown',
    'moment'], function(ko,Command,ProfilePulldown,Moment){
    var profileType = function(options){
        var self = this;
        self.wallet = options.parent || {};

        self.statusMessage = ko.observable("");

        // Source value arrays for pulldown menues
        self.profilePulldown = new ProfilePulldown();

        self.node_id = ko.observable("");
        self.account = ko.observable("");
        self.address = ko.observable("");

        self.profileComplete = ko.observable(false);
        self.role = ko.observable("");
        self.login_type = ko.observable("");
        self.login_id = ko.observable("");
        self.credit = ko.observable(0.0000); // TODO: Make this Coins Earned (use Coinstream output)
        self.creditFmt = ko.pureComputed(function(){return self.wallet.formatNumber(self.credit(), 4, '.', ',');});
        self.facebookUrl = ko.observable("https://facebook.com/");
        self.googleUrl = ko.observable("https://plus.google.com/");
        self.twitterUrl = ko.observable("https://twitter.com/");

        // User changeables
        self.first_name = ko.observable("");
        self.last_name = ko.observable("");
        self.employer = ko.observable("");
        self.email = ko.observable("");
        self.description = ko.observable("");
        self.age = ko.observable("");
        self.dob = ko.observable(Moment(Date.now()).utc().format("YYYY-MM-DD"));
        self.gender = ko.observable("");
        self.ethnicity = ko.observable("");
        self.country = ko.observable("");
        self.terms = ko.observable(false);

        self.dirtyFlag = ko.observable(false);
        self.isDirty = ko.computed(function() {
            return self.dirtyFlag();
        });

        // User changeables subscriptions
        self.first_name.subscribe(function (){self.dirtyFlag(true);});
        self.last_name.subscribe(function (){self.dirtyFlag(true);});
        self.employer.subscribe(function (){self.dirtyFlag(true);});
        self.email.subscribe(function (){self.dirtyFlag(true);});
        self.description.subscribe(function (){self.dirtyFlag(true);});
        self.dob.subscribe(function (){
            var now = Moment().utc();
            var dob = Moment(self.dob()).utc();
            var curDateYY = now.format("YYYY");
            var curDateMM = now.format("MM");
            var curDateDD = now.format("DD");
            var dobDateYY = dob.format("YYYY");
            var dobDateMM = dob.format("MM");
            var dobDateDD = dob.format("DD");
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
        });
        self.gender.subscribe(function (){self.dirtyFlag(true);});
        self.ethnicity.subscribe(function (){self.dirtyFlag(true);});
        self.country.subscribe(function (){self.dirtyFlag(true);});
        self.terms.subscribe(function (){self.dirtyFlag(true);});

        self.canSubmit = ko.computed(function(){
            var canSubmit = self.first_name() !== "" &&
                            self.last_name() !== "" &&
                            self.employer() !== "" &&
                            self.email() !== "" &&
                            self.dob() !== "" &&
                            self.age() >= 18 &&
                            self.gender() !== "" &&
                            self.ethnicity() !== "" &&
                            self.country() !== "";
            // Bottom to top messages
            if (canSubmit && !self.terms()){
                canSubmit = false;
                self.statusMessage("Please agree to the Terms & Conditions to continue.");
            }
            if (canSubmit && self.description().length > 1000){
                canSubmit = false;
                self.statusMessage("Please limit your description to 1000 characters.");
            }
            if (self.age() < 18){
                canSubmit = false;
                self.statusMessage("You must be 18 years-old or older.");
            }
            if (canSubmit){
                self.statusMessage("");
            }
            return canSubmit;
        });
    };

    profileType.prototype.refresh = function(timerRefresh){
        var self = this;
        if (timerRefresh && !self.isDirty()){
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
            self.role(self.wallet.User().profile.role || "User");
            self.node_id(self.wallet.node_id());
            self.account(self.wallet.account());
            self.address(self.wallet.address());

            self.first_name(self.wallet.User().profile.first_name || "");
            self.last_name(self.wallet.User().profile.last_name || "");
            self.employer(self.wallet.User().profile.employer || "");
            self.email(self.wallet.User().profile.email || "");
            self.description(self.wallet.User().profile.description || "");
            self.age(self.wallet.User().profile.age || 0);
            if (self.wallet.User().profile.dob && self.wallet.User().profile.dob !== ""){
                self.dob(Moment(self.wallet.User().profile.dob).utc().format("YYYY-MM-DD"));
            } else {
                self.dob(Moment(Date.now()).utc().format("YYYY-MM-DD"));
            }
            self.gender(self.wallet.User().profile.gender || "");
            self.ethnicity(self.wallet.User().profile.ethnicity || "");
            self.country(self.wallet.User().profile.country || "");
            self.terms(self.wallet.User().profile.terms || false);
            self.credit(self.wallet.User().profile.credit || 0);

            // Do not allow MASTER_ACCOUNT to change Employer. It's set in init-wallet.
            if (self.wallet.account() === self.wallet.settings().masterAccount){
                self.profilePulldown.employerValues([self.employer()]);
            }
            // This has to be inside the !isDirty check
            if (!self.wallet.profileComplete()){
                self.profileComplete(false);
                self.statusMessage("Please complete your profile before continuing.");
            } else {
                self.profileComplete(true);
            }
            self.dirtyFlag(false);
        }
        if (!timerRefresh && !self.isDirty()){
            self.statusMessage("");
        }
    };

    profileType.prototype.Reset = function(){
        var self = this;
        self.dirtyFlag(false);
        this.refresh(true);
    };

    profileType.prototype.Submit = function(){
        var self = this;
        // Save User changeables
        self.wallet.User().profile.first_name = self.first_name();
        self.wallet.User().profile.last_name = self.last_name();
        self.wallet.User().profile.employer = self.employer();
        self.wallet.User().profile.email = self.email();
        self.wallet.User().profile.description = self.description();
        self.wallet.User().profile.age = self.age();
        self.wallet.User().profile.dob = self.dob();
        self.wallet.User().profile.gender = self.gender();
        self.wallet.User().profile.ethnicity = self.ethnicity();
        self.wallet.User().profile.country = self.country();
        self.wallet.User().profile.terms = self.terms();
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
