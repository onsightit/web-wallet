#!/bin/bash
### executed by cron every 10 minutes. ###

# Note: To stop run: daemon --stop --name web-wallet

/usr/bin/daemon --running --name web-wallet

if [ $? == 1 ] ; then
        echo "*** Starting web-wallet..."
        cd ${HOME}/
        /bin/mv web-wallet.log.gz web-wallet.log.gz.bak
        /bin/gzip web-wallet.log
        /usr/bin/daemon --name "web-wallet" -D ${HOME}/web-wallet -o ${HOME}/web-wallet.log -- /usr/bin/nodejs --stack-size=10000 ${HOME}/web-wallet/app.js
else
        echo "*** The web-wallet is already running."
fi
