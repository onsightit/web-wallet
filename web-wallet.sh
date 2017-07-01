#!/bin/bash
echo "*** Starting web-wallet..."
#sudo npm install supervisor -g
supervisor --watch wallet.js,lib,public,routes,views wallet.js
