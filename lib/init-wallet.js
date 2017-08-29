// NOTE: The rpc command setaccount has a "bug" that creates an unlabeled address after executing.
//       See: GetAccountAddress(strOldAccount, true) in rpcwallet.cpp.
//       You have to go into the Qt wallet to label it if you really want it.
//		 So, at every startup, we sweep the wallet for new "" accounts to assign to MASTER_ACCOUNT
var atob = require('atob');
var btoa = require('btoa');

var coin = require('../wallet.js');
var User = require('./user');

// Globals
var foundUserWallet = false;
var accountAddresses = [];

// Interval iterations
var doneGetAccountAddresses = 30;
var doneFindUserWallet = 30;

function SetAccountAddresses(account, accountAddresses) {
	// Create a copy as accountAddresses will get nulled later
	var addresses = accountAddresses;
	// Foreach address: setaccount <address> <acccount>
	// NOTE: The wallet likes to have one blank ("") account address,
	// so only do this if more than one address was found for "".
	if (addresses && addresses.length > 1) {
		for (var k in addresses) {
			if (addresses.hasOwnProperty(k)) {
				coin.api.exec('setaccount', addresses[k], account, function(err, res) {
					if (err) {
						console.log("Init-Wallet: Error: err:" + err + " res:" + res);
					}
				});
			}
		}
	}
}

function GetAccountAddresses(account) {
	accountAddresses = []; // Null it out every call
	doneGetAccountAddresses = 30; // Reset interval counter every call
	coin.api.exec('getaddressesbyaccount', account, function(err, res) {
		//console.log("DEBUG: Account '" + account + "' node_id: " + coin.settings.wallet.rpchost);
		if (typeof res !== 'undefined') {
			accountAddresses = res;

			// If a new wallet needs to be created for MASTER_ACCOUNT,
			// but no empty labeled addresses exist, create one.
			if (!accountAddresses || !accountAddresses.length) {
				coin.api.exec('getnewaddress', account, function(err, res) {
					if (err) {
						console.log("Init-Wallet: Error: err:" + err + " res:" + res);
					} else {
						accountAddresses = [res];
					}
					doneGetAccountAddresses = 0; // set global flag-counter to break out of interval
				});
			} else {
				doneGetAccountAddresses = 0; // set global flag-counter to break out of interval
			}
		}
		else {
			console.log("Error: No addresses for account: " + account + " node_id: " + coin.settings.wallet.rpchost);
			console.log(err);
			doneGetAccountAddresses = 0; // set global flag-counter to break out of interval
		}
	});
}

function Init() {
	// Sweep for empty account labels to assign to masterAccount.
	GetAccountAddresses("");
	var interval1 = setInterval(function() {
		if (!doneGetAccountAddresses) {
			clearInterval(interval1);

			// No need to wait on this.
			SetAccountAddresses(coin.settings.masterAccount, accountAddresses);

			// Find existing node_id for masterAccount.
			User.findOne({'local.id': coin.settings.masterAccount, 'wallet.node_id': coin.settings.wallet.rpchost}, function(err, user) {
				if (user) {
					foundUserWallet = true;
					console.log("Init-Wallet: Found " + coin.settings.masterAccount + "'s wallet for the " + coin.settings.coinName + " node_id on: " + coin.settings.wallet.rpchost);
					// Get addresses for masterAccount.
					GetAccountAddresses(coin.settings.masterAccount);
					var interval = setInterval(function() {
						if (!doneGetAccountAddresses) {
							clearInterval(interval);

							// If the node is down, addresses will be null.
							if (!accountAddresses || !accountAddresses.length) {
								// Node is down and DB is up.
								console.log("Init-Wallet: Error 1: Is the RPC wallet daemon running?");
							}
							doneFindUserWallet = 0; // set global flag-counter break out of interval
						} else { doneGetAccountAddresses--; }
					},1000); // end timeout
				} else {
					doneFindUserWallet = 0; // set global flag-counter break out of interval
					console.log("Init-Wallet: " + coin.settings.masterAccount + "'s wallet was NOT found for node_id: " + coin.settings.wallet.rpchost);
				}
			});

			// If this node_id was not found for masterAccount,
			// create a new wallet for masterAccount,
			// or create a new masterAccount.
			var interval2 = setInterval(function() {
				if (!doneFindUserWallet && !doneGetAccountAddresses) {
					clearInterval(interval2);

					if (!foundUserWallet) {
						User.findOne({'local.id': coin.settings.masterAccount}, function(err, user) {
							if (err)
								return err;
							if (user) {
								console.log("Init-Wallet: Creating a new wallet for " + coin.settings.masterAccount + " for node_id: " + coin.settings.wallet.rpchost);
								// Get addresses for masterAccount.
								GetAccountAddresses(coin.settings.masterAccount);
								var interval = setInterval(function() {
									if (!doneGetAccountAddresses) {
										clearInterval(interval);

										// If the node is down, addresses will be null.
										if (accountAddresses && accountAddresses.length) {
											// Push the new wallet to user.
											user.wallet.push( { node_id: coin.settings.wallet.rpchost, account: coin.settings.masterAccount, addresses: accountAddresses });
											user.save(function(err) {
												if (err)
													throw err;
											});
										} else {
											// Node is down and DB is up.
											console.log("Init-Wallet: Error 2: Is the RPC wallet daemon running?");
										}
									} else { doneGetAccountAddresses--; }
								},1000); // end timeout
							} else {
								// Create the masterAccount.
								console.log("Init-Wallet: Creating a new account for " + coin.settings.masterAccount + " for node_id: " + coin.settings.wallet.rpchost);
								// Get addresses for masterAccount.
								GetAccountAddresses(coin.settings.masterAccount);
								var interval = setInterval(function() {
									if (!doneGetAccountAddresses) {
										clearInterval(interval);

										// If the node is down, addresses will be null.
										if (!accountAddresses || !accountAddresses.length) {
											// Node is down and DB is up.
											console.log("Init-Wallet: Error 3: Is the RPC wallet daemon running?");
										}
									} else { doneGetAccountAddresses--; }
								},1000); // end timeout

								var doneNewUser = 30;
								interval2 = setInterval(function() {
									if (!doneGetAccountAddresses) {
										clearInterval(interval2);

										// Create the masterAccount
										var newUser = new User();
										newUser.local.id = coin.settings.masterAccount;
										newUser.local.password = newUser.local.generateHash("password");
										newUser.local.changeme = true;
										newUser.profile.login_type = "local";
										newUser.profile.last_login = Date.now();
										newUser.profile.role = "Admin";
										newUser.profile.first_name = "";
										newUser.profile.last_name = "";
										newUser.profile.email = coin.settings.masterEmail;
										newUser.profile.description = "Keeper of Coins";
										newUser.profile.age = "";
										newUser.profile.dob = "";
										newUser.profile.gender = "";
										newUser.profile.country = "";
										newUser.profile.terms = false;
										newUser.profile.credit = 0;
										newUser.wallet.push( { node_id: coin.settings.wallet.rpchost, account: coin.settings.masterAccount, addresses: accountAddresses });

										newUser.save(function(err) {
											if (err)
												throw err;
										});
									} else {
										doneNewUser--;
										if (!doneNewUser) {
											console.log("Init-Wallet: Error 3: Is the RPC wallet daemon running?");
										}
									}
								},1000); // end timeout
							}
						});
					} // else foundUserWallet is true, exit init-wallet...
				} else { doneFindUserWallet--; }
			},1000); // end interval2
		} else { doneGetAccountAddresses--; }
	},1000); // end interval1
}

module.exports = function() {
    Init();
};
