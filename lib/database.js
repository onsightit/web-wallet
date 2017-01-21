var mongoose = require('mongoose');
var User = require('./user');
var opts = {server: {
                socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 },
                reconnectTries: 3, reconnectInterval: 3000
                }
            };
mongoose.Promise = global.Promise;

module.exports = {
    // Save the user's profile
    saveUserProfile: function(id, profile, cb) {
        //console.log("DEBUG: " + JSON.stringify(profile));
        User.findOne({'_id': id}, function(err, user){
            if (user){
                user.profile = profile;
                user.save(function(err){
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

    // Initialize DB
    connect: function(database, cb) {
        mongoose.connect(database, opts, function(err) {
            if (err) {
                console.log('Unable to connect to database: %s', database);
                return cb(err);
            }
            return cb(null);
        });

        mongoose.connection.on('close', function (){
            process.emit('database_closed', "Database closed.");
        });
        mongoose.connection.on('error', function (err){
            process.emit('SIGINT', err);
        });
        mongoose.connection.on('disconnected', function (){
            console.log('Database disconnected.');
        });
        mongoose.connection.on('reconnected', function (){
            console.log('Database reconnected.');
        });
    },

    // Close DB
    close: function(cb) {
        mongoose.connection.close(function (){
            return cb();
        });
    }
};
