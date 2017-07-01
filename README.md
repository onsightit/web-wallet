# Web-Wallet

Web-Wallet for altcoin daemons.

## Prerequisites:

A running RPC coin daemon. See: https://github.com/YourApp/YourCoin

Mongo DB for storing account info. See: https://www.mongodb.com/

 Create DB and user:
 > use database-name
 > db.createUser( { user: "{user}", pwd: "{password}", roles: [ { role: "readWrite" } ] } )

Node.js 6.x for running YourApp. For debian installations:

 If running 4.x:
 > sudo apt-get purge nodejs npm

 Install 6.x:
 > curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
 > sudo apt-get install -y nodejs

If YourApp is not running locally, https is the default protocol.  To set up a self-signed SSL certificate in debian/apache2 environments, run:

 > sudo mkdir /etc/apache2/certs
 > sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/apache2/certs/{domain name}.key -out /etc/apache2/certs/{domain name}.crt

 Note: Also copy the crt and key file to the {nodejs}/sslcert directory. Change the owner to that of the nodejs process, then make sure your settings.json SSL parameters have the correct file-names for your key and crt files.


## Configuring:

Configure the database connection parameters, localizations and features of YourApp by copying 'settings.json.template' to 'settings.json' and making your changes in 'settings.json'.

Configure YourApp and daemon for local or non-local operation, or a combination of both. For instance:

If the coin daemon is running on the same machine as YourApp, the daemon's config file will be used. It can be found at:

 // Mac OS
 '$HOME/Library/Application Support/YourCoin/yourcoin.conf'

 // Linux
 '$HOME/.yourcoin/yourcoin.conf'

 // Windows
 '$APPDATA/YourCoin/yourcoin.conf'

(Substitute your coin's name for 'YourCoin' above.)

If the daemon is running on another machine, you will need to configure node.js's coin.conf file to match the daemon's config file. coin.conf is found in: lib/coin.conf

Either way, the config file will need at a minimum the following parameters:

 > rpcuser=rpcuser
 > rpcpassword=password  # Change me!
 > rpcconnect=localhost  # RPC daemon
 > rpcport=18181
 > server=1              # If not running a daemon

Local vs Not-Local configuration:

The config file parameter 'rpcconnect' determines whether the daemon is local or not-local, even if the daemon and YourApp are both running on the same machine. YourApp's boolean flag 'isLocal' is determined to be true if 'rpcconnect' is one of the following:

 > rpcconnect=127.0.0.1
 > rpcconnect=localhost
 > rpcconnect=192.168.x.x
 > rpcconnect=hostname_with_no_tld

The last two examples allow for YourApp to be considered 'local', even though the node and daemon may be running on different machines on the same local network.

If the daemon and YourApp are both running on the same machine, you can still define YourApp as NOT-local by setting the 'rpcconnect' parameter to a fully qualified domain name (i.e. myhost.homelan.net), which requirs a simple modification to the machine's hosts file. (e.g. 192.168.1.246 myhost.homelan.net)

If 'isLocal' is true, more control over YourApp is allowed. (i.e. encrypting the wallet, locking/unlocking the wallet for sending/staking, and more wallet stats and features are available.)

[See 'rpcconnect' in the coin's source code, init.cpp, for more information.]

If you need to run YourApp app from a "sub directory" of the main web-site (e.g. https://example.com/wallet/), change the settings.json parameter, chRoot to: "".


## Running:

Windows:

 > YourApp.bat

 (If supervisor is not installed, run 'npm install supervisor'.)

Linux:

 > YourApp.sh

 (If 'daemon' is not installed, please consult your Linux distro's documentation for installing 'daemon'.)

YourApp has an admin account pre-defined which you can login with:

 > Login:    MASTER_ACCOUNT
 > Password: password  (you will be required to change this)

The MASTER_ACOUNT always sees YourApp as 'local' and has views into the wallet as if you were running a Qt wallet (i.e. the full wallet balance).

To setup individual accounts, use YourApp's Signup page, or login with a social media account.
