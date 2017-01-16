# Web Wallet


## Prerequisites:

A running RPC coin daemon. See: https://github.com/onsightit/solarcoin

Mongo DB for storing account info. See: https://www.mongodb.com/

 Create DB and user:
 > use solarcoin
 > db.createUser( { user: "solarcoin", pwd: "{password}", roles: [ { role: "readWrite" } ] } )

Node.js 6.x for running the Web Wallet. For debian installations:

 If running 4.x:
 > sudo apt-get purge nodejs npm

 Install 6.x:
 > curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
 > sudo apt-get install -y nodejs

If the Web Wallet is not running locally, https is the default protocol.  To set up a self-signed SSL certificate in debian/apache2 environments, run:

 > sudo mkdir /etc/apache2/certs
 > sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/apache2/certs/{domain name}.key -out /etc/apache2/certs/{domain name}.crt

 Note: Also copy the crt and key file to the {nodejs}/sslcert directory. Change the owner to that of the nodejs process, then make sure your settings.json SSL parameters have the correct file-names for your key and crt files.


## Configuring:

Configure the database connection parameters, localizations and features of the Web Wallet by copying 'settings.json.template' to 'settings.json' and making your changes in 'settings.json'.

Configure the Web Wallet and daemon for local or non-local operation, or a combination of both. For instance:

If the daemon is running on the same machine as the Web Wallet, the daemon's config file will be used. It can be found at:

 // Mac OS
 '$HOME/Library/Application Support/SolarCoin/solarcoin.conf'

 // Linux
 '$HOME/.solarcoin/solarcoin.conf'

 // Windows
 '$APPDATA/SolarCoin/solarcoin.conf'

(Substitute your coin's name for 'SolarCoin' above.)

If the daemon is running on another machine, you will need to configure node.js's coin.conf file to match the daemon's config file. coin.conf is found in: lib/coin.conf

Either way, the config file will need at a minimum the following parameters:

 > rpcuser=rpcuser
 > rpcpassword=password  # Change me!
 > rpcconnect=localhost  # RPC daemon
 > rpcport=18181
 > server=1              # If not running a daemon

Local vs Not-Local configuration:

The config file parameter 'rpcconnect' determines whether the daemon (and thus the Web Wallet) is local or not-local, even if the daemon and Web Wallet are both running on the same machine. The Web Wallet's boolean flag 'isLocal' is determined to be true if 'rpcconnect' is one of the following:

 > rpcconnect=127.0.0.1
 > rpcconnect=localhost
 > rpcconnect=192.168.x.x
 > rpcconnect=hostname_with_no_tld

The last two examples allow for the Web Wallet to be considered 'local', even though the node and daemon may be running on different machines on the same local network.

If the daemon and Web Wallet are both running on the same machine, you can still define the Web Wallet as NOT-local by setting the 'rpcconnect' parameter to a fully qualified domain name (i.e. myhost.homelan.net), which requirs a simple modification to the machine's hosts file. (e.g. 192.168.1.246 myhost.homelan.net)

If 'isLocal' is true, more control over the Web Wallet is allowed. (i.e. encrypting the wallet, locking/unlocking the wallet for sending/staking, and more wallet stats and features are available.)

[See 'rpcconnect' in the Qt coin's source code, init.cpp, for more information.]

If you need to run the Web Wallet app from a "sub directory" of the main web-site (e.g. https://example.com/wallet/), change the settings.json parameter, chRoot to: "".


## Running:

Windows:

 > web-wallet.bat

 (If supervisor is not installed, run 'npm install supervisor'.)

Linux:

 > web-wallet.sh

 (If 'daemon' is not installed, please consult your Linux distro's documentation for installing 'daemon'.)

The Web Wallet has an admin account pre-defined which you can login with:

 > Login:    MASTER_ACCOUNT
 > Password: password  (you will be required to change this)

The MASTER_ACOUNT always sees the Web Wallet as 'local' and has views into the wallet as if you were running a Qt wallet (i.e. the full wallet balance).

To setup individual accounts, use the Web Wallet's Signup page, or login with a social media account.
