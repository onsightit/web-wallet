fs = require('fs-extra');

// Get the user defined application settings.
settings = require('./settings');

// You will need to configure the config file found in: coin.conf
// Otherwise, if the daemon is running on the same machine as the node, its config file will be used.
// See README.md for more information.
filepath = 'coin.conf';
console.log("Reading " + filepath + " parameters...");
if (fs.existsSync(filepath) === false){
    console.log("WARNING: " + filepath + " does not exists. Using the coin's config file...");
    if (process.platform == 'darwin'){
        // Mac OS
        filepath = process.env.HOME + '/Library/Application Support/' + settings.coinName + '/' + settings.coinName + '.conf';
    } else if (process.platform == 'linux'){
        // Linux
        filepath = process.env.HOME + '/.' + settings.coinName.toLowerCase() + '/' + settings.coinName.toLowerCase() + '.conf';
    } else {
        // Windows
        filepath = process.env.APPDATA + '/' + settings.coinName + '/' + settings.coinName + '.conf';
    }
    if (fs.existsSync(filepath) === false){
        console.log("ERROR: " + filepath + " does not exists. Exiting.");
        process.exit(3);
    }
}

conf_data = fs.readFileSync(filepath, 'utf8', function (err) {
  if (err) {
    return console.log(err);
  }
});

function wordTrim(str){
    str.trim();
    var idx = str.search(/\s/); // look for whitespace after first word (ie. comments)
    if (idx !== -1){
        str = str.substring(0, idx);
    }
    return str;
}

arrayFromConf = conf_data.match(/[^\r\n]+/g); // Turn lines into array

var rpcUser = "";
var rpcPass = "";
var rpcHost = "";
var rpcPort = "";

for (var k in arrayFromConf){
    if (arrayFromConf.hasOwnProperty(k)){
        // Get specific parm and value before and after '='
        var p = wordTrim(arrayFromConf[k].substring(0, arrayFromConf[k].indexOf("=")));
        var v = wordTrim(arrayFromConf[k].substring(arrayFromConf[k].indexOf("=") + 1));
        switch(p){
            case ("rpcuser"):
                rpcUser = v;
                break;
            case ("rpcpassword"):
                rpcPass = v;
                break;
            case ("rpcconnect"):
                rpcHost = v.toLowerCase();
                break;
            case ("rpcport"):
                rpcPort = v;
                break;
            default:
                break;
        }
    }
}
// Validation checks
if (rpcHost === "")
    console.log("WARNING: " + filepath + " does not contain rpcconnect setting!");
if (rpcPort === "")
    console.log("WARNING: " + filepath + " does not contain rpcport setting!");
if (rpcUser === "")
    console.log("WARNING: " + filepath + " does not contain rpcuser setting!");
if (rpcPass === "")
    console.log("WARNING: " + filepath + " does not contain rpcpassword setting!");

var isLocal = false;
if (rpcHost === "localhost" || rpcHost === "127.0.0.1" || rpcHost.indexOf("192.168.") === 0 || rpcHost.indexOf(".") === -1){
    isLocal = true;
}

var Client  = require('./coin-client');
var client = new Client();
client.set('host', rpcHost);
client.set('port', rpcPort);
client.set('user', rpcUser);
client.set('pass', rpcPass);
if (!isLocal) client.set('https', true);
if (!isLocal) client.set('rejectUnauthorized', false); // Use false if using a self-signed certificate. TODO: Bring boolean in from settings.json

client.auth();

module.exports.api = client;
module.exports.settings = settings;
module.exports.isLocal = isLocal;
module.exports.rpcHost = rpcHost;
module.exports.rpcPort = rpcPort;
