var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;

var coin = require('../app.js');
var User = require('./user');
var configAuth = require('./auth')(coin.settings.appHost, coin.settings.chRoot);
var bcrypt = require("bcryptjs");
var validator = require('validator');

module.exports = function(passport) {

	passport.serializeUser(function(user, done){
		done(null, user.id);
	});

	passport.deserializeUser(function(id, done){
		User.findById(id, function(err, user){
			done(err, user);
		});
	});

	passport.use('local-signup', new LocalStrategy({
		usernameField: 'email',
		passwordField: 'password',
		passReqToCallback: true
	},
	function(req, email, password, done){
		var first_name = req.body.first_name;
		var last_name = req.body.last_name;
		var passwordRepeat = req.body.passwordRepeat;

		if (validator.isEmpty(first_name) || !validator.isAscii(first_name)){
			return done(null, false, req.flash('signupMessage', 'First Name is not valid. Please try again.'));
		}
		if (validator.isEmpty(last_name) || !validator.isAscii(last_name)){
			return done(null, false, req.flash('signupMessage', 'Last Name is not valid. Please try again.'));
		}
		if (!validator.isEmail(email)){
			return done(null, false, req.flash('signupMessage', 'That does not appear to be a valid email address.'));
		}
		if (!validator.isByteLength(password, {min:8, max:255})){
			return done(null, false, req.flash('signupMessage', 'The password should be at least 8 alpha-numeric characters.'));
		}
		if (validator.isAlpha(password)){ // Numbers required
			return done(null, false, req.flash('signupMessage', 'The password should contain numbers and special characters.'));
		}
		if (password !== passwordRepeat){
			return done(null, false, req.flash('signupMessage', 'The passwords do not match.'));
		}
		email = validator.normalizeEmail(email);

		var account = email, addresses = [], new_address = false;
		coin.api.exec('getaddressesbyaccount', account, function(err, res){
			if (err) console.log("Error: err:" + err + " res:" + res);
			addresses = res;
			if (addresses.length === 0){
				coin.api.exec('getnewaddress', account, function(err, res){
					if (err){
						console.log("Error: err:" + err + " res:" + res);
					} else {
						addresses.push(res);
						new_address = true;
					}
				});
			}
		});

        setTimeout(function(){
		process.nextTick(function(){
			if (addresses.length === 0){
				return done(null, false, req.flash('signupMessage', 'There was an error creating your account. Please try again later.'));
			}
			User.findOne({'local.id': email}, function(err, user){
				if(err)
					return done(err);
				if(user){
					// If we created a new address. Capture it.
					if (new_address){
						user.wallet.push( { node_id: coin.rpcHost, account: account, addresses: addresses });
						// sendfrom <fromaccount> <toaddress> <amount> [minconf=1] [comment] [comment-to] [txcomment]
						coin.api.exec('sendfrom', coin.settings.masterAccount, addresses[0], coin.settings.newUserAmount, 1, "New Account", addresses[0], "Welcome to " + coin.settings.coinName + "!", function(err, res){
							if (err) console.log("Error: err:" + err + " res:" + res);
							});
					}

					// Record last login
					user.profile.login_type = "local";
					user.profile.last_login = Date.now();
					user.save(function(err){
						if(err)
							throw err;
					});
					return done(null, false, req.flash('signupMessage', 'You already have an account. Please login, instead.'));
				} else {
					var newUser = new User();
					newUser.local.id = email;
					newUser.local.password = newUser.local.generateHash(password);
					newUser.local.changeme = false;
					newUser.profile.login_type = "local";
					newUser.profile.last_login = Date.now();
					newUser.profile.role = "User";
					newUser.profile.first_name = first_name;
					newUser.profile.last_name = last_name;
					newUser.profile.employer = "";
					newUser.profile.email = email;
					newUser.profile.description = "";
					newUser.profile.age = "";
					newUser.profile.dob = "";
					newUser.profile.gender = "";
					newUser.profile.ethnicity = "";
					newUser.profile.country = "";
					newUser.profile.terms = false;
                    newUser.profile.credit = 0;
					newUser.wallet.push( { node_id: coin.rpcHost, account: account, addresses: addresses });

					newUser.save(function(err){
						if(err)
							throw err;
						// sendfrom <fromaccount> <toaddress> <amount> [minconf=1] [comment] [comment-to] [txcomment]
						coin.api.exec('sendfrom', coin.settings.masterAccount, addresses[0], coin.settings.newUserAmount, 1, "New Account", addresses[0], "Welcome to " + coin.settings.coinName + "!",
							function(err, res){
								if (err) console.log("Error: err:" + err + " res:" + res);
							}
						);
					});
					return done(null, newUser);
				}
			});
		});
        },1000); // end timeout
	}));

	passport.use('local-login', new LocalStrategy({
			usernameField: 'email',
			passwordField: 'password',
			passReqToCallback: true
		},
		function(req, email, password, done){
			// Allow for non-email logins (ie. masterAccount)
			if (validator.isEmail(email))
				email = validator.normalizeEmail(email);
			process.nextTick(function(){
				User.findOne({ 'local.id': email}, function(err, user){
					if(err)
						return done(err);
					if(!user)
						return done(null, false, req.flash('loginMessage', 'No user account found.'));
					if(!user.validPassword(password)){
						return done(null, false, req.flash('loginMessage', 'Invalid password.'));
					}

					var account = email, addresses = [], new_address = true;
					// If user.wallet does not have this node, create new wallet node_id/account/address.
					user.wallet.filter(function(wal){
						if(wal.node_id === coin.rpcHost){
							new_address = false; // Found one
						}
					});
					if (new_address){
						coin.api.exec('getnewaddress', account, function(err, res){
							if (err){
								console.log("Error: err:" + err + " res:" + res);
							} else {
								addresses.push(res);
							}
							// push new wallet node/account/addresses
							user.wallet.push( { node_id: coin.rpcHost, account: account, addresses: addresses });
						});
					}

					// This only ocurrs w/ masterAccount
					if(password === 'password'){
						user.local.changeme = true;
					}

					setTimeout(function(){
						if (new_address){
							// sendfrom <fromaccount> <toaddress> <amount> [minconf=1] [comment] [comment-to] [txcomment]
							coin.api.exec('sendfrom', coin.settings.masterAccount, addresses[0], coin.settings.newUserAmount, 1, "New Account", addresses[0], "Welcome to " + coin.settings.coinName + "!", function(err, res){
								if (err) console.log("Error: err:" + err + " res:" + res);
								});
						}

						// Record last login
						user.profile.login_type = "local";
						user.profile.last_login = Date.now();
						user.save(function(err){
							if(err)
								throw err;
						});
						return done(null, user);
					},1000);
				});
			});
		}
	));

	passport.use('local-password', new LocalStrategy({
			usernameField: 'email',
			passwordField: 'password',
			passReqToCallback: true
		},
		function(req, email, password, done){
			var passwordNew = req.body.passwordNew || "";
			var passwordNewRepeat = req.body.passwordNewRepeat || "";
			if (typeof req.user.local === 'undefined'){
				return done(null, false, req.flash('passwordMessage', 'Please login first.'));
			}
			if (email !== req.user.local.id){
				return done(null, false, req.flash('passwordMessage', 'Please try again?'));
			}
			if (!validator.isByteLength(passwordNew, {min:8, max:255})){
				return done(null, false, req.flash('passwordMessage', 'The new password should be at least 8 alpha-numeric characters.'));
			}
			if (validator.isAlpha(passwordNew)){ // Numbers required
				return done(null, false, req.flash('passwordMessage', 'The new password should contain numbers and special characters.'));
			}
			if (password === passwordNew){
				return done(null, false, req.flash('passwordMessage', 'The new password must be different.'));
			}
			if (passwordNew !== passwordNewRepeat){
				return done(null, false, req.flash('passwordMessage', 'The new passwords do not match.'));
			}

			process.nextTick(function(){
				User.findOne({'local.id': email}, function(err, user){
					if(err)
						return done(err);
					if(!user){
						return done(null, false, req.flash('passwordMessage', 'You do not have an account. Please signup, first.'));
					} else {
						bcrypt.compare(password, user.local.password, function (err, match){
							if (err)
								return done(err);
							if (!match){
								return done(null, false, req.flash('passwordMessage', 'Your old password is invalid.'));
							} else {
								user.local.password = user.local.generateHash(passwordNew);
								user.local.changeme = false;

								user.save(function(err){
									if(err)
										throw err;
								});
								return done(null, user);
							}
						});
					}
				});
			});
		}
	));

	passport.use(new FacebookStrategy({
	    clientID: configAuth.facebookAuth.clientID,
	    clientSecret: configAuth.facebookAuth.clientSecret,
	    callbackURL: configAuth.facebookAuth.callbackURL
	  },
	  function(accessToken, refreshToken, profile, done) {
			var	email = "";
			if (typeof profile.emails !== 'undefined' && profile.emails[0]){
				email = validator.normalizeEmail(profile.emails[0].value);
			}

			var account = profile.id, addresses = [], new_address = false;
			coin.api.exec('getaddressesbyaccount', account, function(err, res){
				if (err) console.log("Error: err:" + err + " res:" + res);
				addresses = res;
				if (addresses.length === 0){
					coin.api.exec('getnewaddress', account, function(err, res){
						if (err){
							console.log("Error: err:" + err + " res:" + res);
						} else {
							addresses.push(res);
							new_address = true;
						}
					});
				}
			});

			setTimeout(function(){
	    	process.nextTick(function(){
				if (addresses.length === 0){
					return done(null, false, req.flash('signupMessage', 'There was an error creating your account. Please try again later.'));
				}
	    		User.findOne({'facebook.id': profile.id}, function(err, user){
	    			if(err)
	    				return done(err); // Connection error
	    			if(user){
						// If we created a new address. Capture it.
						if (new_address){
							user.wallet.push( { node_id: coin.rpcHost, account: account, addresses: addresses });
							// sendfrom <fromaccount> <toaddress> <amount> [minconf=1] [comment] [comment-to] [txcomment]
							coin.api.exec('sendfrom', coin.settings.masterAccount, addresses[0], coin.settings.newUserAmount, 1, "New Account", addresses[0], "Welcome to " + coin.settings.coinName + "!", function(err, res){
								if (err) console.log("Error: err:" + err + " res:" + res);
								});
						}

						// Record last login
						user.profile.login_type = "facebook";
						user.profile.last_login = Date.now();
						user.save(function(err){
							if(err)
								throw err;
						});
	    				return done(null, user); // User found
	    			}
	    			else {
						var fullName = profile.displayName.split(' '),
							first_name = fullName.length > 0 ? fullName[0] : "",
							last_name = fullName.length > 1 ? fullName[fullName.length - 1] : "";
	    				var newUser = new User(); // User not found, create one
	    				newUser.facebook.id = profile.id;
	    				newUser.facebook.token = accessToken;
						newUser.profile.login_type = "facebook";
						newUser.profile.last_login = Date.now();
						newUser.profile.role = "User";
	    				newUser.profile.first_name = first_name;
	    				newUser.profile.last_name = last_name;
						newUser.profile.employer = "";
	    				newUser.profile.email = email;
						newUser.profile.description = "";
						newUser.profile.age = "";
						newUser.profile.dob = "";
						newUser.profile.gender = "";
						newUser.profile.ethnicity = "";
						newUser.profile.country = "";
						newUser.profile.terms = false;
	                    newUser.profile.credit = 0;
						newUser.wallet.push( { node_id: coin.rpcHost, account: account, addresses: addresses });

	    				newUser.save(function(err){
	    					if(err)
	    						throw err;
							// sendfrom <fromaccount> <toaddress> <amount> [minconf=1] [comment] [comment-to] [txcomment]
							coin.api.exec('sendfrom', coin.settings.masterAccount, addresses[0], coin.settings.newUserAmount, 1, "New Account", addresses[0], "Welcome to " + coin.settings.coinName + "!",
								function(err, res){
									if (err) console.log("Error: err:" + err + " res:" + res);
								}
							);
	    				});
						return done(null, newUser);
	    			}
	    		});
	    	});
	        },1000); // end timeout
	    }
	));

	passport.use(new GoogleStrategy({
	    clientID: configAuth.googleAuth.clientID,
	    clientSecret: configAuth.googleAuth.clientSecret,
	    callbackURL: configAuth.googleAuth.callbackURL
	  },
	  function(accessToken, refreshToken, profile, done) {
			var	email = "";
			if (typeof profile.emails !== 'undefined' && profile.emails[0]){
				email = validator.normalizeEmail(profile.emails[0].value);
			}

			var account = profile.id, addresses = [], new_address = false;
			coin.api.exec('getaddressesbyaccount', account, function(err, res){
				if (err) console.log("Error: err:" + err + " res:" + res);
				addresses = res;
				if (addresses.length === 0){
					coin.api.exec('getnewaddress', account, function(err, res){
						if (err){
							console.log("Error: err:" + err + " res:" + res);
						} else {
							addresses.push(res);
							new_address = true;
						}
					});
				}
			});

			setTimeout(function(){
	    	process.nextTick(function(){
				if (addresses.length === 0){
					return done(null, false, req.flash('signupMessage', 'There was an error creating your account. Please try again later.'));
				}
	    		User.findOne({'google.id': profile.id}, function(err, user){
	    			if(err)
	    				return done(err); // Connection error
	    			if(user){
						// If we created a new address. Capture it.
						if (new_address){
							user.wallet.push( { node_id: coin.rpcHost, account: account, addresses: addresses });
							// sendfrom <fromaccount> <toaddress> <amount> [minconf=1] [comment] [comment-to] [txcomment]
							coin.api.exec('sendfrom', coin.settings.masterAccount, addresses[0], coin.settings.newUserAmount, 1, "New Account", addresses[0], "Welcome to " + coin.settings.coinName + "!", function(err, res){
								if (err) console.log("Error: err:" + err + " res:" + res);
								});
						}

						// Record last login
						user.profile.login_type = "google";
						user.profile.last_login = Date.now();
						user.save(function(err){
							if(err)
								throw err;
						});
	    				return done(null, user); // User found
	    			}
	    			else {
						var fullName = profile.displayName.split(' '),
							first_name = fullName.length > 0 ? fullName[0] : "",
							last_name = fullName.length > 1 ? fullName[fullName.length - 1] : "";
	    				var newUser = new User(); // User not found, create one
	    				newUser.google.id = profile.id;
	    				newUser.google.token = accessToken;
						newUser.profile.login_type = "google";
						newUser.profile.last_login = Date.now();
						newUser.profile.role = "User";
	    				newUser.profile.first_name = first_name;
	    				newUser.profile.last_name = last_name;
						newUser.profile.employer = "";
	    				newUser.profile.email = email;
						newUser.profile.description = "";
						newUser.profile.age = "";
						newUser.profile.dob = "";
						newUser.profile.gender = "";
						newUser.profile.ethnicity = "";
						newUser.profile.country = "";
						newUser.profile.terms = false;
	                    newUser.profile.credit = 0;
						newUser.wallet.push( { node_id: coin.rpcHost, account: account, addresses: addresses });

	    				newUser.save(function(err){
	    					if(err)
	    						throw err;
							// sendfrom <fromaccount> <toaddress> <amount> [minconf=1] [comment] [comment-to] [txcomment]
							coin.api.exec('sendfrom', coin.settings.masterAccount, addresses[0], coin.settings.newUserAmount, 1, "New Account", addresses[0], "Welcome to " + coin.settings.coinName + "!",
								function(err, res){
									if (err) console.log("Error: err:" + err + " res:" + res);
								}
							);
	    				});
						return done(null, newUser);
	    			}
	    		});
	    	});
	        },1000); // end timeout
	    }
	));

	passport.use(new TwitterStrategy({
	    consumerKey: configAuth.twitterAuth.consumerKey,
	    consumerSecret: configAuth.twitterAuth.consumerSecret,
	    callbackURL: configAuth.twitterAuth.callbackURL
	  },
	  function(token, tokenSecret, profile, done) {
			var	email = "";
			if (typeof profile.emails !== 'undefined' && profile.emails[0]){
				email = validator.normalizeEmail(profile.emails[0].value);
			}

			var account = profile.id, addresses = [], new_address = false;
			coin.api.exec('getaddressesbyaccount', account, function(err, res){
				if (err) console.log("Error: err:" + err + " res:" + res);
				addresses = res;
				if (addresses.length === 0){
					coin.api.exec('getnewaddress', account, function(err, res){
						if (err){
							console.log("Error: err:" + err + " res:" + res);
						} else {
							addresses.push(res);
							new_address = true;
						}
					});
				}
			});

			setTimeout(function(){
	    	process.nextTick(function(){
				if (addresses.length === 0){
					return done(null, false, req.flash('signupMessage', 'There was an error creating your account. Please try again later.'));
				}
	    		User.findOne({'twitter.id': profile.id}, function(err, user){
	    			if(err)
	    				return done(err); // Connection error
	    			if(user){
						// If we created a new address. Capture it.
						if (new_address){
							user.wallet.push( { node_id: coin.rpcHost, account: account, addresses: addresses });
							// sendfrom <fromaccount> <toaddress> <amount> [minconf=1] [comment] [comment-to] [txcomment]
							coin.api.exec('sendfrom', coin.settings.masterAccount, addresses[0], coin.settings.newUserAmount, 1, "New Account", addresses[0], "Welcome to " + coin.settings.coinName + "!", function(err, res){
								if (err) console.log("Error: err:" + err + " res:" + res);
								});
						}

						// Record last login
						user.profile.login_type = "twitter";
						user.profile.last_login = Date.now();
						user.save(function(err){
							if(err)
								throw err;
						});
	    				return done(null, user); // User found
	    			}
	    			else {
						var fullName = profile.displayName.split(' '),
							first_name = fullName.length > 0 ? fullName[0] : "",
							last_name = fullName.length > 1 ? fullName[fullName.length - 1] : "";
	    				var newUser = new User(); // User not found, create one
	    				newUser.twitter.id = profile.id;
	    				newUser.twitter.token = token;
						newUser.profile.login_type = "twitter";
						newUser.profile.last_login = Date.now();
						newUser.profile.role = "User";
	    				newUser.profile.first_name = first_name;
	    				newUser.profile.last_name = last_name;
						newUser.profile.employer = "";
	    				newUser.profile.email = email;
						newUser.profile.description = "";
						newUser.profile.age = "";
						newUser.profile.dob = "";
						newUser.profile.gender = "";
						newUser.profile.ethnicity = "";
						newUser.profile.country = "";
						newUser.profile.terms = false;
	                    newUser.profile.credit = 0;
						newUser.wallet.push( { node_id: coin.rpcHost, account: account, addresses: addresses });

	    				newUser.save(function(err){
	    					if(err)
	    						throw err;
							// sendfrom <fromaccount> <toaddress> <amount> [minconf=1] [comment] [comment-to] [txcomment]
							coin.api.exec('sendfrom', coin.settings.masterAccount, addresses[0], coin.settings.newUserAmount, 1, "New Account", addresses[0], "Welcome to " + coin.settings.coinName + "!",
								function(err, res){
									if (err) console.log("Error: err:" + err + " res:" + res);
								}
							);
	    				});
						return done(null, newUser);
	    			}
	    		});
	    	});
	        },1000); // end timeout
	    }
	));
};
