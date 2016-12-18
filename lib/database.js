var mongoose = require('mongoose');
var User = require('./user');

module.exports = {
    // Initialize DB
    connect: function(database, cb) {
        mongoose.connect(database, function(err) {
            if (err) {
                console.log('Unable to connect to database: %s', database);
                process.exit(1);
            }
            return cb();
        });
    },

    // Save the user's profile
    saveUserProfile: function(id, profile) {
        //console.log("DEBUG: " + JSON.stringify(profile));
        User.findOne({'_id': id}, function(err, user){
            if (user){
                user.profile = profile;
                user.save(function(err){
                    if(err)
                        return err;
                });
                return "Success!";
            } else {
                return err;
            }
        });
    }
};
