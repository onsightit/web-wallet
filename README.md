# Web-Wallet

A Web-Wallet for altcoin daemons.


## Prerequisites:

A running RPC coin daemon. See: https://github.com/Web-Wallet/YourCoin

Mongo DB for storing account info. See: https://www.mongodb.com/

 Create DB and user:
 > use database-name
 > db.createUser( { user: "{user}", pwd: "{password}", roles: [ { role: "readWrite" } ] } )

Node.js 6.x for running Web-Wallet. For debian installations:

 If running 4.x:
 > sudo apt-get purge nodejs npm

 Install 6.x:
 > curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
 > sudo apt-get install -y nodejs

If Web-Wallet is not running locally, https is the default protocol.  To set up a self-signed SSL certificate in debian/apache2 environments, run:

 > sudo mkdir /etc/apache2/certs
 > sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/apache2/certs/{domain name}.key -out /etc/apache2/certs/{domain name}.crt

 Note: Also copy the crt and key file to the {nodejs}/sslcert directory. Change the owner to that of the nodejs process, then make sure your settings.json SSL parameters have the correct file-names for your key and crt files.


## Configuring:

Configure the database connection parameters, localizations and features of Web-Wallet by copying 'settings.json.template' to 'settings.json' and making your changes in 'settings.json'.

Configure Web-Wallet and daemon for local or non-local operation, or a combination of both. For instance:

If the coin daemon is running on the same machine as Web-Wallet, the daemon's config file will be used. It can be found at:

 // Mac OS
 '$HOME/Library/Application Support/YourCoin/yourcoin.conf'

 // Linux
 '$HOME/.yourcoin/yourcoin.conf'

 // Windows
 '$APPDATA/YourCoin/yourcoin.conf'

(Substitute your coin's name for 'YourCoin' above.)

You will need to configure wallet params in settings.conf to match the wallet daemon's config file.  The wallet daemon's config file will need the following parameters:

 > rpcuser=rpcuser       # Change me.
 > rpcpassword=password  # Change me!
 > rpcport=19184
 > server=1
 > listen=1
 > daemon=1
 > staking=1
 > rpcallowip=<your IP address>

If you need to run Web-Wallet app from a "sub directory" of the main web-site (e.g. https://example.com/web-wallet/), change the settings.json parameter, chRoot to: "".


## Running:

Windows:

 > Web-Wallet.bat

 (If supervisor is not installed, run 'npm install supervisor'.)

Linux:

 > Web-Wallet.sh

 (If 'daemon' is not installed, please consult your Linux distro's documentation for installing 'daemon'.)

Web-Wallet has an admin account pre-defined which you can login with:

 > Login:    MASTER_ACCOUNT
 > Password: password  (you will be required to change this)

The MASTER_ACOUNT always sees Web-Wallet as 'local' and has views into the wallet as if you were running a Qt wallet (i.e. the full wallet balance).

To setup individual accounts, use Web-Wallet's Signup page, or login with a social media account.
