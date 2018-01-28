var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;

var atob = require('atob');
var btoa = require('btoa');
var coin = require('./coinapi');
var User = require('./user');
var configAuth = require('./auth')(coin.settings.appHost, coin.settings.chRoot);
var bcrypt = require("bcryptjs");
var validator = require('validator');
var pwgenerator = require('generate-password');
var nodemail = require('./nodemail');
var emailOpts = {
	from: coin.settings.appEmail,
	bcc: coin.settings.appEmail,
	to: '',
	subject: '',
	text: '',
	html: ''
};

module.exports = function(passport) {

	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			done(err, user);
		});
	});

	passport.use('local-signup', new LocalStrategy({
		usernameField: 'email',
		passwordField: 'password',
		passReqToCallback: true
	},
	function(req, email, password, done) {
		var first_name = req.body.first_name;
		var last_name = req.body.last_name;
		var passwordRepeat = req.body.passwordRepeat;

		if (validator.isEmpty(first_name) || !validator.isAscii(first_name)) {
			return done(null, false, req.flash('signupMessage', 'First Name is not valid. Please try again.'));
		}
		if (validator.isEmpty(last_name) || !validator.isAscii(last_name)) {
			return done(null, false, req.flash('signupMessage', 'Last Name is not valid. Please try again.'));
		}
		if (!validator.isEmail(email)) {
			return done(null, false, req.flash('signupMessage', 'That does not appear to be a valid email address.'));
		}
		if (!validator.isByteLength(password, {min:8, max:255})) {
			return done(null, false, req.flash('signupMessage', 'The password should be at least 8 alpha-numeric characters.'));
		}
		if (validator.isAlpha(password)) { // Numbers required
			return done(null, false, req.flash('signupMessage', 'The password should contain numbers and special characters.'));
		}
		if (password !== passwordRepeat) {
			return done(null, false, req.flash('signupMessage', 'The passwords do not match.'));
		}
		email = validator.normalizeEmail(email);

        setTimeout(function() {
		process.nextTick(function() {
			User.findOne({'local.id': email}, function(err, user) {
				if (err)
					return done(err);
				if (user) {
					return done(null, false, req.flash('signupMessage', 'You already have an account. Please login, instead.'));
				} else {
					var account = email, addresses = [], new_address = false;
					coin.api.exec('getaddressesbyaccount', account, function(err, res) {
						if (err) {
							// node daemon may be down - continue
							console.log("Error: err:" + err + " res:" + res);
						} else {
							addresses = res;
							if (addresses.length === 0) {
								coin.api.exec('getnewaddress', account, function(err, res) {
									if (err) {
										console.log("Error: err:" + err + " res:" + res);
									} else {
										addresses.push(res);
										new_address = true;
									}
								});
							}
						}
					});

					// If we created a new address. Capture it.
					if (new_address) {
						user.wallet.push( { node_id: coin.settings.wallet.rpchost, account: account, addresses: addresses });
					}

					// Generate a verification code
					var verify_code = pwgenerator.generate({ length: 6, numbers: true, symbols: false, strict: true });

					var newUser = new User();
					newUser.local.id = email;
					newUser.local.password = newUser.generateHash(password);
					newUser.local.changeme = false;
					newUser.profile.verified = verify_code || "";
					newUser.profile.login_type = "local";
					newUser.profile.last_login = Date.now();
					newUser.profile.role = "User";
					newUser.profile.first_name = first_name;
					newUser.profile.last_name = last_name;
					newUser.profile.email = email;
					newUser.profile.description = "";
					newUser.profile.age = "";
					newUser.profile.dob = "";
					newUser.profile.gender = "";
					newUser.profile.country = "";
					newUser.profile.terms = false;
                    newUser.profile.credit = 0;
					newUser.wallet.push( { node_id: coin.settings.wallet.rpchost, account: account, addresses: addresses });

					newUser.save(function(err) {
						if (err)
							throw err;
					});

					// Send email with verify code for verification
					emailOpts.to = email;
					emailOpts.subject = 'Welcome to ' + coin.settings.appTitle;
					emailOpts.html = '<h2>Welcome to ' + coin.settings.appTitle + '!</h2>' +
									'<p>Thank-you ' + newUser.profile.first_name + ' for signing up. Please enter the verification code ' +
									'( <b>' + newUser.profile.verified + '</b> ) on the web page to confirm your email address.</p>' +
									'<p>Web page link: https://' + coin.settings.appHost + '/verify' + '</p>' +
									'<p>Regards,<br>The ' + coin.settings.appTitle + ' Team</p>';
					nodemail.sendMail(emailOpts, (error, info) => {
						if (error) {
							return console.log(error);
						}
						console.log('Email sent: ' + info.messageId);
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
		function(req, email, password, done) {
			if (validator.isEmail(email))
				email = validator.normalizeEmail(email);
			process.nextTick(function() {
				User.findOne({'local.id': email}, function(err, user) {
					if (err)
						return done(err);
					if (!user)
						return done(null, false, req.flash('loginMessage', 'No account found. Please try again, or sign-up.'));
					if (!user.validPassword(password)) {
						return done(null, false, req.flash('loginMessage', 'Invalid password.'));
					}
					var account = email, addresses = [], new_address = false;
					// If user.wallet does not have this node with an address, create new wallet node_id/account/address.
					if (!user.wallet || user.wallet.length === 0) {
						new_address = true;
					} else {
						new_address = true;
						user.wallet.filter(function(wal) {
							if (wal.node_id === coin.settings.wallet.rpchost) {
								if (wal.addresses && wal.addresses.length) {
									new_address = false; // Found it
								}
							}
						});
					}
					if (new_address) {
						// TODO: This will not return in time to be saved below.
						coin.api.exec('getnewaddress', account, function(err, res) {
							if (err) {
								console.log("Error: err:" + err + " res:" + res);
								new_address = false;
							} else {
								addresses.push(res);
								// push new wallet node/account/addresses
								user.wallet.push( { node_id: coin.settings.wallet.rpchost, account: account, addresses: addresses });
							}
						});
					}

					// Just in case...
					if (password === 'password') {
						user.local.changeme = true;
					}
					user.profile.login_type = "local";
					user.profile.last_login = Date.now();
					user.save(function(err) {
						if (err)
							throw err;
					});
					return done(null, user);
				});
			});
		}
	));

	passport.use('local-verify', new LocalStrategy({
			usernameField: 'email',
			passwordField: 'password',
			passReqToCallback: true
		},
		function(req, email, password, done) {
			if (validator.isEmail(email))
				email = validator.normalizeEmail(email);
			process.nextTick(function() {
				User.findOne({'local.id': email}, function(err, user) {
					if (err)
						return done(err);
					if (!user)
						return done(null, false, req.flash('verifyMessage', 'No account found. Please try again, or sign-up.'));
					if (password === "resend") {
						// Re-Send email with verify code for verification
						emailOpts.to = email;
						emailOpts.subject = 'Welcome to ' + coin.settings.appTitle;
						emailOpts.html = '<h2>Welcome to ' + coin.settings.appTitle + '!</h2>' +
										'<p>Thank-you ' + user.profile.first_name + ' for signing up. Please enter the verification code ' +
										'( <b>' + user.profile.verified + '</b> ) on the web page to confirm your email address.</p>' +
										'<p>Web page link: https://' + coin.settings.appHost + '/verify' + '</p>' +
										'<p>Regards,<br>The ' + coin.settings.appTitle + ' Team</p>';
						nodemail.sendMail(emailOpts, (error, info) => {
							if (error) {
								console.log(error);
							} else {
								console.log('Email sent: ' + info.messageId);
							}
						});
						return done(null, false, req.flash('verifyMessage', 'Verification email resent.'));
					}
					if (password !== user.profile.verified) {
						return done(null, false, req.flash('verifyMessage', 'Invalid email verification code.'));
					}
					// Set verified to 'Y'
					user.profile.verified = "Y";
					user.save(function(err) {
						if (err)
							throw err;
					});
					return done(null, user);
				});
			});
		}
	));

	passport.use('local-password', new LocalStrategy({
			usernameField: 'email',
			passwordField: 'password',
			passReqToCallback: true
		},
		function(req, email, password, done) {
			var passwordNew = req.body.passwordNew || "";
			var passwordNewRepeat = req.body.passwordNewRepeat || "";
			if (typeof req.user.local === 'undefined') {
				return done(null, false, req.flash('passwordMessage', 'Please login first.'));
			}
			if (email !== req.user.local.id) {
				return done(null, false, req.flash('passwordMessage', 'Please try again?'));
			}
			if (!validator.isByteLength(passwordNew, {min:8, max:255})) {
				return done(null, false, req.flash('passwordMessage', 'The new password should be at least 8 alpha-numeric characters.'));
			}
			if (validator.isAlpha(passwordNew)) { // Numbers required
				return done(null, false, req.flash('passwordMessage', 'The new password should contain numbers and special characters.'));
			}
			if (password === passwordNew) {
				return done(null, false, req.flash('passwordMessage', 'The new password must be different.'));
			}
			if (passwordNew !== passwordNewRepeat) {
				return done(null, false, req.flash('passwordMessage', 'The new passwords do not match.'));
			}

			process.nextTick(function() {
				User.findOne({'local.id': email}, function(err, user) {
					if (err)
						return done(err);
					if (!user) {
						return done(null, false, req.flash('passwordMessage', 'You do not have an account. Please signup, first.'));
					} else {
						bcrypt.compare(password, user.local.password, function (err, match) {
							if (err)
								return done(err);
							if (!match) {
								return done(null, false, req.flash('passwordMessage', 'Your old password is invalid.'));
							} else {
								user.local.password = user.generateHash(passwordNew);
								user.local.changeme = false;
								user.save(function(err) {
									if (err)
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
			if (typeof profile.emails !== 'undefined' && profile.emails[0]) {
				email = validator.normalizeEmail(profile.emails[0].value);
			}

			var account = profile.id, addresses = [], new_address = false;
			coin.api.exec('getaddressesbyaccount', account, function(err, res) {
				if (err) {
					// node daemon may be down - continue
					console.log("Error: err:" + err + " res:" + res);
				} else {
					addresses = res;
					if (addresses.length === 0) {
						coin.api.exec('getnewaddress', account, function(err, res) {
							if (err) {
								console.log("Error: err:" + err + " res:" + res);
							} else {
								addresses.push(res);
								new_address = true;
							}
						});
					}
				}
			});

			setTimeout(function() {
	    	process.nextTick(function() {
	    		User.findOne({'facebook.id': profile.id}, function(err, user) {
	    			if (err)
	    				return done(err); // Connection error
	    			if (user) {
						// If we created a new address. Capture it.
						if (new_address) {
							user.wallet.push( { node_id: coin.settings.wallet.rpchost, account: account, addresses: addresses });
						}

						// Record last login
						user.profile.login_type = "facebook";
						user.profile.last_login = Date.now();
						user.save(function(err) {
							if (err)
								throw err;
						});
	    				return done(null, user); // User found
	    			} else {
						// Generate a verification code
						var verify_code = pwgenerator.generate({ length: 6, numbers: true, symbols: false, strict: true });
						var fullName = profile.displayName.split(' '),
							first_name = fullName.length > 0 ? fullName[0] : "",
							last_name = fullName.length > 1 ? fullName[fullName.length - 1] : "";
	    				var newUser = new User(); // User not found, create one
	    				newUser.facebook.id = profile.id;
	    				newUser.facebook.token = accessToken;
						newUser.profile.verified = verify_code || "";
						newUser.profile.login_type = "facebook";
						newUser.profile.last_login = Date.now();
						newUser.profile.role = "User";
	    				newUser.profile.first_name = first_name;
	    				newUser.profile.last_name = last_name;
	    				newUser.profile.email = email;
						newUser.profile.description = "";
						newUser.profile.age = "";
						newUser.profile.dob = "";
						newUser.profile.gender = "";
						newUser.profile.country = "";
						newUser.profile.terms = false;
	                    newUser.profile.credit = 0;
						newUser.wallet.push( { node_id: coin.settings.wallet.rpchost, account: account, addresses: addresses });

	    				newUser.save(function(err) {
	    					if (err)
	    						throw err;
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
			if (typeof profile.emails !== 'undefined' && profile.emails[0]) {
				email = validator.normalizeEmail(profile.emails[0].value);
			}

			var account = profile.id, addresses = [], new_address = false;
			coin.api.exec('getaddressesbyaccount', account, function(err, res) {
				if (err) {
					// node daemon may be down - continue
					console.log("Error: err:" + err + " res:" + res);
				} else {
					addresses = res;
					if (addresses.length === 0) {
						coin.api.exec('getnewaddress', account, function(err, res) {
							if (err) {
								console.log("Error: err:" + err + " res:" + res);
							} else {
								addresses.push(res);
								new_address = true;
							}
						});
					}
				}
			});

			setTimeout(function() {
	    	process.nextTick(function() {
	    		User.findOne({'google.id': profile.id}, function(err, user) {
	    			if (err)
	    				return done(err); // Connection error
	    			if (user) {
						// If we created a new address. Capture it.
						if (new_address) {
							user.wallet.push( { node_id: coin.settings.wallet.rpchost, account: account, addresses: addresses });
						}

						// Record last login
						user.profile.login_type = "google";
						user.profile.last_login = Date.now();
						user.save(function(err) {
							if (err)
								throw err;
						});
	    				return done(null, user); // User found
					} else {
						// Generate a verification code
						var verify_code = pwgenerator.generate({ length: 6, numbers: true, symbols: false, strict: true });
						var fullName = profile.displayName.split(' '),
							first_name = fullName.length > 0 ? fullName[0] : "",
							last_name = fullName.length > 1 ? fullName[fullName.length - 1] : "";
	    				var newUser = new User(); // User not found, create one
	    				newUser.google.id = profile.id;
	    				newUser.google.token = accessToken;
						newUser.profile.verified = verify_code || "";
						newUser.profile.login_type = "google";
						newUser.profile.last_login = Date.now();
						newUser.profile.role = "User";
	    				newUser.profile.first_name = first_name;
	    				newUser.profile.last_name = last_name;
	    				newUser.profile.email = email;
						newUser.profile.description = "";
						newUser.profile.age = "";
						newUser.profile.dob = "";
						newUser.profile.gender = "";
						newUser.profile.country = "";
						newUser.profile.terms = false;
	                    newUser.profile.credit = 0;
						newUser.wallet.push( { node_id: coin.settings.wallet.rpchost, account: account, addresses: addresses });

	    				newUser.save(function(err) {
	    					if (err)
	    						throw err;
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
			if (typeof profile.emails !== 'undefined' && profile.emails[0]) {
				email = validator.normalizeEmail(profile.emails[0].value);
			}

			var account = profile.id, addresses = [], new_address = false;
			coin.api.exec('getaddressesbyaccount', account, function(err, res) {
				if (err) {
					// node daemon may be down - continue
					console.log("Error: err:" + err + " res:" + res);
				} else {
					addresses = res;
					if (addresses.length === 0) {
						coin.api.exec('getnewaddress', account, function(err, res) {
							if (err) {
								console.log("Error: err:" + err + " res:" + res);
							} else {
								addresses.push(res);
								new_address = true;
							}
						});
					}
				}
			});

			setTimeout(function() {
	    	process.nextTick(function() {
	    		User.findOne({'twitter.id': profile.id}, function(err, user) {
	    			if (err)
	    				return done(err); // Connection error
	    			if (user) {
						// If we created a new address. Capture it.
						if (new_address) {
							user.wallet.push( { node_id: coin.settings.wallet.rpchost, account: account, addresses: addresses });
						}

						// Record last login
						user.profile.login_type = "twitter";
						user.profile.last_login = Date.now();
						user.save(function(err) {
							if (err)
								throw err;
						});
	    				return done(null, user); // User found
	    			} else {
						// Generate a verification code
						var verify_code = pwgenerator.generate({ length: 6, numbers: true, symbols: false, strict: true });
						var fullName = profile.displayName.split(' '),
							first_name = fullName.length > 0 ? fullName[0] : "",
							last_name = fullName.length > 1 ? fullName[fullName.length - 1] : "";
	    				var newUser = new User(); // User not found, create one
	    				newUser.twitter.id = profile.id;
	    				newUser.twitter.token = token;
						newUser.profile.verified = verify_code || "";
						newUser.profile.login_type = "twitter";
						newUser.profile.last_login = Date.now();
						newUser.profile.role = "User";
	    				newUser.profile.first_name = first_name;
	    				newUser.profile.last_name = last_name;
	    				newUser.profile.email = email;
						newUser.profile.description = "";
						newUser.profile.age = "";
						newUser.profile.dob = "";
						newUser.profile.gender = "";
						newUser.profile.country = "";
						newUser.profile.terms = false;
	                    newUser.profile.credit = 0;
						newUser.wallet.push( { node_id: coin.settings.wallet.rpchost, account: account, addresses: addresses });

	    				newUser.save(function(err) {
	    					if (err)
	    						throw err;
	    				});
						return done(null, newUser);
	    			}
	    		});
	    	});
	        },1000); // end timeout
	    }
	));
};
