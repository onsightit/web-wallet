/**
* The Settings Module reads the settings out of settings.json and provides
* this information to other modules. No need to modify anything here.
*
* See: settings.json.template
*/

var fs = require("fs");
var jsonminify = require("jsonminify");

// Runtime environment: 'development' or 'production'
exports.env = "development";

// The app title, visible in browser window
exports.coinTitle = "Healthcoin Web Wallet";

// Coin description
exports.coinDescription = "Healthcoin keeps track of the user's biomarker progress in diabetic and pre-diabetic patients. Biomarker data is sent anonymously to the blockchain for research purposes later.";

// The copyright for the footer
exports.copyRight = "Copyright (c) 2016, The Healthcoin Developers. All rights reserved.";

// Coin name / page heading
exports.coinName = "healthcoin";

// Coin symbol, e.g. BTC, VRC, SLR, HCN, ...
exports.coinSymbol = "HCN";

// Coin addresses start with this character
exports.coinChar = "H";

// Coin has transaction txcomment feature
exports.txComment = false;

// chRoot allows you to put the app in a "subfolder" of an existing website,
// then use mod_proxy (or equivolent) to proxy requests for /wallet to the node.
// e.g. ProxyPass /wallet/ https://192.168.1.246:8383/wallet/ KeepAlive=On
//      ProxyPassReverse /wallet/ https://192.168.1.246:8383/wallet/
// If your website is Wordpress, you will need to change the .htaccess rule to:
//      # ORIGINAL RewriteRule . /index.php [L]
//      RewriteRule ./ /index.php [L]
// Set to "" to allow the sub-folder 'wallet' to be exposed for proxying.
// Set to "/wallet" to chroot the node to /public/wallet/ (Normal for stand-alone web wallet).
exports.chRoot = "/wallet";

// Logo
exports.logo = "./public/wallet/images/Icon.png";

// The app favicon fully specified url, visible e.g. in the browser window
exports.favicon = "./public/wallet/favicon.ico";

// History rows per page
exports.historyRowsPP = 10;

// Minimum transaction fee
exports.minTxFee = 0.0001;

// Amount to send new users at sign-up
exports.newUserAmount  = 1.0;

// Some control over how much can be sent at one time
exports.maxSendAmount  = 1000.0;                      

// The url hosting the app. e.g. myhost.homelan.net
exports.appHost = "localhost";

// The ports express should listen on
exports.port = process.env.PORT || 8181;
exports.sslPort = process.env.SSLPORT || 8383;

// SSL certs
exports.sslKey = "./sslcert/server.key";
exports.sslCrt = "./sslcert/server.crt";

// This setting is passed to MongoDB to set up the database
exports.mdb = {
  "user": "healthcoin",
  "password": "password",
  "database": "healthcoin",
  "host" : "127.0.0.1",
  "port" : 27017
};

// MASTER_ACCOUNT will become an address label in the wallet.
// ***  DO NOT CHANGE THE ACCOUNT NAME AFTER FIRST RUN!  ***
exports.masterAccount  = "MASTER_ACCOUNT";            // Master UI login account, and Label to assign to "" wallet accounts.
exports.masterEmail    = "admin@healthcoin.com";      // Master email account.
exports.masterCanEncrypt = false;                     // Allow wallet encryption by MASTER_ACCOUNT


exports.reloadSettings = function reloadSettings() {
    // Discover where the settings file lives
    var settingsFilename = "./settings.json";

    var settingsStr;
    try {
        settingsStr = fs.readFileSync(settingsFilename).toString();
    } catch(e) {
        console.warn('No settings.json file found. Continuing using defaults!');
    }

    // Parse the settings
    var settings;
    try {
        if (settingsStr) {
            settingsStr = jsonminify(settingsStr).replace(",]","]").replace(",}","}");
            settings = JSON.parse(settingsStr);
        }
    } catch(e) {
        console.error('There was an error processing your settings.json file: '+e.message);
        process.exit(1);
    }

    // Loop trough the settings
    for (var i in settings) {
        if (i) {
            // Test if the setting start with a low character
            if (i.charAt(0).search("[a-z]") !== 0) {
                console.warn("Settings should start with a low character: '" + i + "'");
            }
            // We know this setting, so overwrite the exported value
            if(exports[i] !== undefined) {
                // Normalize on localhost (prevent cookie confusion)
                if (settings[i] === "127.0.0.1")
                    settings[i] = "localhost";
                exports[i] = settings[i];
            } else {
                console.warn("Unknown Setting: '" + i + "'. This setting doesn't exist or it was removed.");
            }
        }
    }
};

// Initial load settings
exports.reloadSettings();
