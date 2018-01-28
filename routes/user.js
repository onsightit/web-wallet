/*
 * User Routes.
 */
var atob = require('atob');
var btoa = require('btoa');

module.exports = function(app, coin, mdb){
	var chRoot = app.get('chRoot');

    // Returns user account and address.
    app.get(chRoot + '/getuseraccount', function (req, res) {
        if (req.user) {
            var response = {
                error: null,
                result: {User: req.user}
            };
            res.send(JSON.stringify(response));
        } else {
            res.redirect(app.get('chRoot') + '/logout');
        }
    });

    // Saves user profile.
    app.get(chRoot + '/saveuserprofile/:profile', function (req, res) {
        var profile = JSON.parse(atob(decodeURIComponent(req.params.profile))) || req.user.profile;
        if (profile && profile.login_type) {
            req.user.profile = profile;
            mdb.saveUserProfile(req.user._id, profile, function (err, data) {
                if (err) {
                    res.status(500).send(JSON.stringify(data));
                } else {
                    //console.log("DEBUG: data = " + JSON.stringify(data));
                    var response = {
                        error: null,
                        result: data
                    };
                    res.send(JSON.stringify(response));
                }
            });
        } else {
            res.send(JSON.stringify("Profile error."));
        }
    });

    // Saves user wallet.
    app.get(chRoot + '/saveuserwallet/:account/:addresses', function (req, res) {
        var account = atob(decodeURIComponent(req.params.account)) || null;
        var addresses = JSON.parse(atob(decodeURIComponent(req.params.addresses))) || [];
        if (account && addresses && addresses.length) {
            mdb.saveUserWallet(req.user._id, coin.settings.wallet.rpchost, account, addresses, function(err, data) {
                if (err) {
                    res.status(500).send(JSON.stringify(data));
                } else {
                    //console.log("DEBUG: data = " + JSON.stringify(data));
                    var response = {
                        error: null,
                        result: data
                    };
                    res.send(JSON.stringify(response));
                }
            });
        } else {
            res.send(JSON.stringify("Account error."));
        }
    });
};
