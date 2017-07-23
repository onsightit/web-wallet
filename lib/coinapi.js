// Get the user defined application / database / wallet configurable parameters from settings.json.
// See README.md for more information.
var settings = require('./settings');

var Client  = require('./coin-client');
var client = new Client();
client.set('user', settings.wallet.rpcuser);
client.set('pass', settings.wallet.rpcpassword);
client.set('host', settings.wallet.rpchost);
client.set('port', settings.wallet.rpcport);
client.set('https', settings.wallet.ssl);                             // Use true if wallet is not local.
client.set('strictSSL', settings.wallet.strictSSL);                   // Use false if using a self-signed certificate.
client.set('rejectUnauthorized', settings.wallet.rejectUnauthorized); // Use false if using a self-signed certificate.

client.auth();

// Clear from settings which gets passed to the client.
settings.wallet.rpcuser = "XXXXXXXX";
settings.wallet.rpcpassword = "XXXXXXXX";

module.exports.api = client;
module.exports.settings = settings;
