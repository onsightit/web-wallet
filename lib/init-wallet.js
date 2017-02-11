// NOTE: The rpc command setaccount has a "bug" that creates an unlabeled address after executing.
//       See: GetAccountAddress(strOldAccount, true) in rpcwallet.cpp.
//       You have to go into the Qt wallet to label it if you really want it.
//		 So, at every startup, we sweep the wallet for new "" accounts to assign to MASTER_ACCOUNT

var User       = require('./user');
var coin = require('../app.js');

var foundUserWallet = false;
var masterAddress = "";
var accountAddresses = [];

// Interval iterations
var doneGetAccountAddresses = 30;
var doneSetAccountAddresses = 30;
var doneFindUserWallet = 30;

function GetAccountAddresses(account) {
	coin.api.exec('getaddressesbyaccount', account, function(err, res){
		if (typeof res !== 'undefined'){
			accountAddresses = res;
			// If a new wallet needs to be created for MASTER_ACCOUNT,
			// but no empty labeled addresses exist, create one.
			if ((!accountAddresses || !accountAddresses.length) && !foundUserWallet && account === ""){
				coin.api.exec('getnewaddress', account, function(err, res){
					masterAddress = res;
					accountAddresses = [masterAddress];
					doneGetAccountAddresses = 0;
					});
			} else {
				doneGetAccountAddresses = 0;
			}
		}
	});
}

function SetAccountAddresses(account, addresses) {
	// Foreach address: setaccount <address> <acccount>
	if (addresses && addresses.length){
		for (var k in addresses){
			if (addresses.hasOwnProperty(k) && addresses[k].substring(0,1) === coin.settings.coinChar){
				coin.api.exec('setaccount', addresses[k], account, function(err, res){
					if (err) console.log("Init-Wallet: Error: err:" + err + " res:" + res);
					if (doneSetAccountAddresses){
						// Make sure we have a master address.
						if (masterAddress === ""){
							masterAddress = addresses[0]; // Use first address
						}
						doneSetAccountAddresses = 0;
					}
				});
			}
		}
	}
}

function Init() {

	// Find existing node_id for masterAccount.
	User.findOne({'local.id': coin.settings.masterAccount, 'wallet.node_id': coin.rpcHost}, function(err, user){
		if (user){
			foundUserWallet = true;
			console.log("Init-Wallet: Found " + coin.settings.masterAccount + "'s wallet for node_id: " + coin.rpcHost);
			// Sweep up any unlabeled "" accounts for masterAccount.
			GetAccountAddresses("");
			var intervalFirst = setInterval(function(){
				if (!doneGetAccountAddresses){
					clearInterval(intervalFirst);

					// If we found any.
					if (accountAddresses && accountAddresses.length){
						// No need to wait on this command, we already have an address for the node_id.
						SetAccountAddresses(coin.settings.masterAccount, accountAddresses);
					}
					doneFindUserWallet = 0;
				} else { doneGetAccountAddresses--; }
			},1000); // end timeout
		} else {
			doneFindUserWallet = 0;
			console.log("Init-Wallet: " + coin.settings.masterAccount + "'s wallet was NOT found for node_id: " + coin.rpcHost);
		}
	});

	// If this node_id was not found for masterAccount,
	// create a new wallet for masterAccount,
	// or create a new masterAccount.
	var intervalSecond = setInterval(function(){
		if (!doneFindUserWallet){
			clearInterval(intervalSecond);

			if (!foundUserWallet){
				User.findOne({'local.id': coin.settings.masterAccount}, function(err, user){
					var interval1 = null, interval2 = null, interval3 = null;
					if(err)
						return err;
					if(user){
						console.log("Init-Wallet: Creating a new wallet for " + coin.settings.masterAccount + " for node_id: " + coin.rpcHost);
						// Create a new wallet for masterAccount.
						GetAccountAddresses("");
						interval1 = setInterval(function(){
							if (!doneGetAccountAddresses){
								clearInterval(interval1);

								// If the node is down, addresses will be null.
								if (accountAddresses && accountAddresses.length){
									// Make sure we have an address.
									masterAddress = accountAddresses[0]; // Use the first address
									SetAccountAddresses(coin.settings.masterAccount, accountAddresses);
									interval2 = setInterval(function(){
										if (!doneSetAccountAddresses){
											clearInterval(interval2);

											// Push the new wallet to user.
											user.wallet.push( { node_id: coin.rpcHost, account: coin.settings.masterAccount, addresses: accountAddresses });
											user.save(function(err){
												if(err)
													throw err;
											});
										} else { doneSetAccountAddresses--; }
									},1000); // end timeout
								} else {
									// Node is down and DB is up.
									console.log("Init-Wallet: Error 1: Is the RPC wallet daemon running?");
									user = null;
									process.abort();
								}
							} else { doneGetAccountAddresses--; }
						},1000); // end timeout
					} else {
						// Create the masterAccount.
						console.log("Init-Wallet: Creating a new account for " + coin.settings.masterAccount + " for node_id: " + coin.rpcHost);
						GetAccountAddresses("");
						interval1 = setInterval(function(){
							if (!doneGetAccountAddresses){
								clearInterval(interval1);

								// If the node is down, addresses will be null.
								if (accountAddresses && accountAddresses.length){
									// Make sure we have an address.
									masterAddress = accountAddresses[0]; // Use the first address
									SetAccountAddresses(coin.settings.masterAccount, accountAddresses);
									interval2 = setInterval(function(){
										if (!doneSetAccountAddresses){
											clearInterval(interval2);

											// Just waiting till complete...
										} else { doneSetAccountAddresses--; }
									},1000); // end timeout
			
								} else {
									// Node is down and DB is up.
									console.log("Init-Wallet: Error 2: Is the RPC wallet daemon running?");
									user = null;
									process.abort();
								}
							} else { doneGetAccountAddresses--; }
						},1000); // end timeout

						var doneNewUser = 30;
						interval3 = setInterval(function(){
							if (!doneGetAccountAddresses && !doneSetAccountAddresses){
								clearInterval(interval3);

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
								newUser.profile.employer = coin.settings.coinName;
								newUser.profile.email = coin.settings.masterEmail;
								newUser.profile.description = "Keeper of Coins";
								newUser.profile.age = "";
								newUser.profile.dob = "";
								newUser.profile.gender = "";
								newUser.profile.ethnicity = "";
								newUser.profile.country = "";
								newUser.profile.terms = false;
								newUser.profile.credit = 0;
								newUser.wallet.push( { node_id: coin.rpcHost, account: coin.settings.masterAccount, addresses: accountAddresses });

								newUser.save(function(err){
									if(err)
										throw err;
								});
							} else {
								doneNewUser--;
								if (!doneNewUser) {
									console.log("Init-Wallet: Error 3: Is the RPC wallet daemon running?");
									process.abort();
								}
							}
						},1000); // end timeout
					}
				});
			} // else foundUserWallet is true, exit init-wallet...
		} else { doneFindUserWallet--; }
	},1000); // end timeout
}

module.exports = function() {
    Init();
};
