var mongoose = require('mongoose');
var atob = require('atob');
var btoa = require('btoa');
var User = require('./user');

var opts = {server: {
                auto_reconnect: true,
                socketOptions: { keepAlive: 1, connectTimeoutMS: 3000 },
                reconnectTries: 3, reconnectInterval: 3000
                }
            };

mongoose.Promise = global.Promise;
mongoose.connection.on('close', function () {
    console.log('Database closed.');
});
mongoose.connection.on('error', function (err) {
    mongoose.disconnect();
    console.log('Database error:' + err);
    process.emit('database_error', "Database error.");
});
mongoose.connection.on('disconnected', function () {
    process.emit('database_disconnected', "Database disconnected.");
});
mongoose.connection.on('reconnected', function () {    // If: auto_reconnect === true
    process.emit('database_reconnected', "Database reconnected.");
});
mongoose.connection.on('connected', function () {      // If: auto_reconnect === false
    process.emit('database_connected', "Database connected.");
});

module.exports = {
    // Save the user's profile
    saveUserProfile: function(id, profile, cb) {
        //console.log("DEBUG: " + JSON.stringify(profile));
        User.findOne({'_id': id}, function(err, user) {
            if (user) {
                user.profile = profile;
                user.save(function(err) {
                    if(err)
                        cb(err, "Save Error!");
                    else
                        cb(err, "Profile Saved!");
                });
            } else {
                cb(err, "User Not Found!");
            }
        });
    },

    // Save the user's wallet
    saveUserWallet: function(id, node_id, account, addresses, cb) {
        User.findOne({'_id': id}, function(err, user) {
            if (user) {
                for (var i = 0; i < user.wallet.length; i++) {
                    if (user.wallet[i].node_id === node_id && user.wallet[i].account === account) {
                        user.wallet[i].addresses = []; // Re-init addresses
                        for (var j = 0; j < addresses.length; j++) {
                            user.wallet[i].addresses.push(addresses[j].address);
                        }
                    }
                }
                user.save(function(err) {
                    if(err)
                        cb(err, "Save Error!");
                    else
                        cb(err, "Wallet Saved!");
                });
            } else {
                cb(err, "User Not Found!");
            }
        });
    },

    // Initialize DB
    connect: function(database, cb) {
        mongoose.connect(database, opts, function(err) {
            return cb(err);
        }).catch(function (e) {
            console.log("Unable to connect to database: " + e);
            return cb(e);
        });

    },

    // Close DB
    close: function(cb) {
        // mongoose.connection.readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        if (mongoose.connection && mongoose.connection.readyState && mongoose.connection.readyState < 3) {
            mongoose.connection.close(function () {
                mongoose.disconnect(function () {
                    return cb();
                }).catch(function (e) {
                    console.log("Unable to disconnect from database: " + e);
                    return cb();
                });
            });
        } else {
            return cb();
        }
    }
};
