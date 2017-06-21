#!/bin/bash
echo "*** Starting web-wallet..."
#sudo npm install supervisor -g
supervisor --watch app.js,settings.json,lib,public,routes,views app.js
