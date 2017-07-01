@echo off
echo *** Starting web-wallet...
REM npm install supervisor -g
start /min supervisor --watch wallet.js,lib,public,routes,views wallet.js
timeout 5 > NUL
start "" http://localhost:8181/
exit
