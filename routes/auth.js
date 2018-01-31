/*
 * Auth Routes.
 */

var https = require('https');
var fs = require('fs');
var pwgenerator = require('generate-password');
var termstxt = "";

module.exports = function(app, passport, coin) {
	var chRoot = app.get('chRoot');
	console.log("Base URL is: " + (chRoot ? chRoot : '/'));

	app.get(chRoot + '/', isLoggedIn, function(req, res) {
		if (req.user.profile.verified !== 'Y') {
			if (req.user.profile.verified.length === 6) {
				res.redirect(chRoot + '/verify');
			} else {
				res.redirect(chRoot + '/verify-reset');
			}
		} else {
			if (req.user.local.changeme) {
				res.redirect(chRoot + '/password');
			} else {
				//console.log("DEBUG: req.session: " + JSON.stringify(req.session));
				//console.log("DEBUG: req.user: " + JSON.stringify(req.user));
				res.render('home.ejs'); // If logged in, allow access to StreamSpace
			}
		}
	});

	// Local login
	app.get(chRoot + '/login', function(req, res) {
		req.logout();
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});
	app.post(chRoot + '/login',
		passport.authenticate('local-login', {
			successRedirect: chRoot + '/',
			failureRedirect: chRoot + '/login',
			failureFlash: true })
	);

	// Local signup
	app.get(chRoot + '/signup', function(req, res) {
		if (req.isAuthenticated()) {
			res.redirect(chRoot + '/');
		} else {
			var pwgenerated = generatePassword();
			fs.readFile('public/wallet/docs/terms.txt', 'utf8', function(err, data) {
				if (!err) {
					termstxt = data;
					res.render('signup.ejs', { message: req.flash('signupMessage'), pwgenerated: pwgenerated, terms: termstxt });
				} else {
					console.log("signup error: " + err);
					res.redirect(chRoot + '/');
				}
			});
		}
	});
	app.post(chRoot + '/signup', isNotLoggedIn, function (req, res, next) {
		var recaptcha = req.body['g-recaptcha-response'];
		if (recaptcha && recaptcha !== '') {
			https.get('https://www.google.com/recaptcha/api/siteverify?secret=' + coin.settings.reCaptchaSecret + '&response=' + recaptcha, function (res) {
				var data = '';
				res.on('data', function (chunk) {
					data += chunk.toString();
				});
				res.on('end', function () {
					var parseData = JSON.parse(data);
					//console.log("DEBUG: parseData = " + JSON.stringify(parseData));
					if (parseData && parseData.success === true) {
						return next();
					} else {
						var pwgenerated = generatePassword();
						res.render('signup.ejs', { message: 'ReCaptcha did not work.', pwgenerated: pwgenerated, terms: termstxt });
					}
				});
			});
		} else {
			return next();
		}
	},
	// Invoked by next() from previous middleware
	passport.authenticate('local-signup', {
		successRedirect: chRoot + '/verify',
		failureRedirect: chRoot + '/signup',
		failureFlash: true
	}));

	// Local verify email
	app.get(chRoot + '/verify', function(req, res) {
		if (!req.isAuthenticated()) {
			res.redirect(chRoot + '/login');
		} else {
			if (req.user.profile.verified === 'Y') {
				res.redirect(chRoot + '/');
			} else {
				res.render('verify.ejs', { message: req.flash('verifyMessage'), email: req.user.local.id });
			}
		}
	});
	app.post(chRoot + '/verify',
		passport.authenticate('local-verify', {
			successRedirect: chRoot + '/',
			failureRedirect: chRoot + '/verify',
			failureFlash: true })
	);

	// Local change password
	app.get(chRoot + '/password', function(req, res) {
		if (!req.isAuthenticated()) {
			res.redirect(chRoot + '/login');
		} else {
			res.render('password.ejs', { message: req.flash('passwordMessage'), email: req.user.local.id, changeme: req.user.local.changeme }); // If logged in, allow password change
		}
	});
	app.post(chRoot + '/password', passport.authenticate('local-password', {
		successRedirect: chRoot + '/login',
		failureRedirect: chRoot + '/password',
		failureFlash: true
	}));

	// Local reset password
	app.get(chRoot + '/password-reset', function(req, res) {
		if (req.isAuthenticated()) {
			res.redirect(chRoot + '/password');
		} else {
			var pwreset = "reset";
			res.render('password-reset.ejs', { message: req.flash('passwordResetMessage'), pwreset: pwreset }); // If not logged in, allow password reset
		}
	});
	app.post(chRoot + '/password-reset', isNotLoggedIn, function (req, res, next) {
		var recaptcha = req.body['g-recaptcha-response'];
		if (recaptcha && recaptcha !== '') {
			https.get('https://www.google.com/recaptcha/api/siteverify?secret=' + coin.settings.reCaptchaSecret + '&response=' + recaptcha, function (res) {
				var data = '';
				res.on('data', function (chunk) {
					data += chunk.toString();
				});
				res.on('end', function () {
					var parseData = JSON.parse(data);
					//console.log("DEBUG: parseData = " + JSON.stringify(parseData));
					if (parseData && parseData.success === true) {
						return next();
					} else {
						var pwreset = "reset";
						res.render('password-reset.ejs', { message: req.flash('passwordResetMessage'), pwreset: pwreset }); // If not logged in, allow password reset
					}
				});
			});
		} else {
			return next();
		}
	},
	// Invoked by next() from previous middleware
	passport.authenticate('local-password-reset', {
		successRedirect: chRoot + '/verify-reset',
		failureRedirect: chRoot + '/password-reset',
		failureFlash: true
	}));

	// Local verify reset password after successful request
	app.get(chRoot + '/verify-reset', function(req, res) {
		if (!req.isAuthenticated()) {
			res.redirect(chRoot + '/password-reset');
		} else {
			res.render('verify-reset.ejs', { message: req.flash('verifyResetMessage'), email: req.user.local.id }); // If logged in, allow password reset
		}
	});
	app.post(chRoot + '/verify-reset', passport.authenticate('local-verify-reset', {
		successRedirect: chRoot + '/',
		failureRedirect: chRoot + '/verify-reset',
		failureFlash: true
	}));

	// Facebook auth
	app.get(chRoot + '/auth/facebook', passport.authenticate('facebook', {scope: ['email', 'public_profile']}));
	app.get(chRoot + '/auth/facebook/callback', 
	    passport.authenticate('facebook', {
			successRedirect: chRoot + '/',
			failureRedirect: chRoot + '/' })
	);

	// Google auth
	app.get(chRoot + '/auth/google', passport.authenticate('google', {scope: ['profile', 'email']}));
	app.get(chRoot + '/auth/google/callback', 
	    passport.authenticate('google', {
			successRedirect: chRoot + '/',
			failureRedirect: chRoot + '/' })
	);

	// Twitter auth
	app.get(chRoot + '/auth/twitter', passport.authenticate('twitter', {scope: ['email']}));
	app.get(chRoot + '/auth/twitter/callback', 
	    passport.authenticate('twitter', {
			successRedirect: chRoot + '/',
			failureRedirect: chRoot + '/' })
	);

	app.get(chRoot + '/logout', function(req, res) {
		req.logout();
		res.redirect(chRoot + '/');
	});

	app.get(chRoot + '/maintenance', function(req, res) {
		req.logout();
		res.render('maintenance.ejs');
	});
};

function generatePassword() {
	return pwgenerator.generate({ length: 6, numbers: true, symbols: false, strict: true });
}

function isLoggedIn(req, res, next) {
	//console.log("DEBUG: req.isAuthenticated: " + req.isAuthenticated());
	//console.log("DEBUG: req.session: " + JSON.stringify(req.session));
	if (req.isAuthenticated() && req.session) {
		return next();
	}
	res.render('index.ejs');
}

function isNotLoggedIn(req, res, next) {
	if (!req.isAuthenticated()) {
		return next();
	}
	// Need to be logged out first
	req.logout();
	res.redirect(chRoot + '/');
}
