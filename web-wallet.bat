@echo off
echo *** Starting web-wallet...
REM npm install supervisor -g
start /min supervisor --watch app.js,settings.json,lib,public,routes,views app.js
timeout 5 > NUL
start "" http://localhost:8181/
exit
