/**
 *  Web Wallet
 *  Author: Steve Woods OnsightIT@gmail.com
 *          https://github.com/onsightit
 *
 *  (Pending Open Source GNU License)
 */

Object.defineProperty(Error.prototype, 'toJSON', {
    value: function () {
        var alt = {};
        Object.getOwnPropertyNames(this).forEach(function (key) {
            alt[key] = this[key];
        }, this);
        return alt;
    },
    configurable: true
});


////////// Config //////////


// coin Object - Localization settings and Node api calls for the client.
var coin = require('./lib/coinapi');
module.exports = coin;

var fs = require('fs');
var path = require('path');
var atob = require('atob');
var btoa = require('btoa');

var privateKey  = fs.readFileSync(coin.settings.sslKey, 'utf8');
var certificate = fs.readFileSync(coin.settings.sslCrt, 'utf8');
var credentials = {key: privateKey, cert: certificate};

var express = require('express');
var app = express();

var cors = require('cors');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');
var uuid = require('uuid');
var session = require('express-session');

var passport = require('passport');
var flash = require('connect-flash');

// All environments
app.set('env', coin.settings.env || 'production');
app.set('status', '');    // Public status message (Important: Init to "")
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('port', coin.isLocal ? coin.settings.port : coin.settings.sslPort);

app.use(cors());
app.use(express.static(path.join(__dirname, 'public' + coin.settings.chRoot)));
app.use(favicon(path.join(__dirname, coin.settings.favicon)));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: false, limit: '2mb'})); // TODO: Put this limit in settings.json
app.use(bodyParser.json({limit: '2mb'})); // TODO: Put this limit in settings.json
app.use(session({name: coin.settings.coinName,
                secret: coin.settings.coinName + ' is the best ' + coin.settings.coinTitle,
                genid: function(req) {
                    return uuid.v4(); // use UUIDs
                },
                // Cookie expires in 30 days
                cookie: {secure: coin.isLocal ? false : true, maxAge: 30 * 24 * 60 * 60 * 1000, domain: coin.settings.appHost},
                saveUninitialized: false,
                resave: true}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash());            // use connect-flash for flash messages stored in session (Bug: Has to come after session and before router.)

// DB Functions
var mdb = require('./lib/database');

var dbString = 'mongodb://' + coin.settings.mdb.user;
dbString = dbString + ':' + coin.settings.mdb.password;
dbString = dbString + '@' + coin.settings.mdb.host;
dbString = dbString + ':' + coin.settings.mdb.port;
dbString = dbString + '/' + coin.settings.mdb.database;
coin.settings.mdb.password = "XXXXXXXX";
coin.settings.mdb = null; // garbage collection

// Connect to Database
function databaseConnect(){
    //mdb.close(function() {
        mdb.connect(dbString, function(err) {
            if (err){
                app.set('status', coin.settings.coinName + ' Maintenance');
            } else {
                app.set('status', '');
            }
        });
    //});
}
databaseConnect();

// Localizations for EJS rendering [MUST COME AFTER DB FUNCTIONS AND BEFORE AUTH ROUTES]
for (var s in coin.settings){
    if (coin.settings.hasOwnProperty(s)){
        if (s === "chRoot"){
            // Need to flip relativeness for routes/auth.js.
            if (coin.settings[s] === ""){
                // We chrooted to public
                coin.settings[s] = "/wallet";
            } else {
                // We chrooted to public/wallet
                coin.settings[s] = "";
            }
        }
        // Don't overwrite!
        if (app.get(s) === undefined)
            app.set(s, coin.settings[s]);
    }
}
var chRoot = app.get('chRoot') || '';

// Auth routes / functions
require('./routes/auth.js')(app, passport); // Auth routes (includes: '/', '/signup', '/login', '/logout', '/profile', '/password', + oauth routes).
require('./lib/passport')(passport);        // Requires exported 'coin'

// Add CORS headers to all requests
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-AUTHENTICATION, X-IP, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

// Handler for indirect calls to the coin daemon.
function callCoin(command, res, handler){
    var args = Array.prototype.slice.call(arguments, 3);   // Args are after the 3rd parameter
    var callargs = args.concat([handler.bind({res:res})]); // Add the handler function to args
    return coin.api[command].apply(coin.api, callargs, coin.settings.env);
}

function coinHandler(err, result){
    var Error = null;
    if (err) {
        //console.log("DEBUG: err=" + err);
        try {
            Error = JSON.parse(err);
        } catch (e) {
            Error = JSON.stringify(err);
        }
    }
    var response = {
        error: Error,
        result: result
    };
    if (Error && typeof Error.code !== 'undefined'){
        process.emit('rpc_error', 'RPC Error: ' + Error.code);
    } else {
        if (app.get('status').length > 0){
            process.emit('rpc_connected', 'RPC Connected.');
        }
        if (this.res && typeof this.res.send !== 'undefined'){
            this.res.send(response);
        }
    }
}

////////// Routes //////////

// Non-RPC routes //

// Returns this rpc wallet node info and some localized settings.
app.get(chRoot + '/getnodeinfo', function(req,res){
    var response = {
        error: null,
        result: {
            node_id: coin.rpcHost,
            isLocal: coin.isLocal,
            settings: coin.settings
        }
    };
    res.send(JSON.stringify(response));
});

// Returns user account and address.
app.get(chRoot + '/getuseraccount', function(req,res){
    if (req.user) {
        var response = {
            error: null,
            result: { User: req.user }
        };
        res.send(JSON.stringify(response));
    } else {
        res.redirect(app.get('chRoot') + '/logout');
    }
});

// Saves user profile.
app.get(chRoot + '/saveuserprofile/:profile', function(req,res){
    var profile = JSON.parse(atob(decodeURIComponent(req.params.profile))) || req.user.profile;
    if (profile && profile.login_type){
        req.user.profile = profile;
        mdb.saveUserProfile(req.user._id, profile, function(err, data){
            if (err) {
                res.status(500).send(JSON.stringify(data));
            } else {
                //console.log("DEBUG: data = " + JSON.stringify(data));
                var response = {
                    error: null,
                    result: data
                };
                res.send(JSON.stringify(response));
            }
        });
    }
});

// RPC routes //

app.get(chRoot + '/getinfo', function(req,res){ callCoin('getInfo', res, coinHandler); } );
app.get(chRoot + '/getinterestrate', function(req,res){ callCoin('getInterestRate', res, coinHandler); } );
app.get(chRoot + '/getinflationrate', function(req,res){ callCoin('getInflationRate', res, coinHandler); } );
app.get(chRoot + '/getblockcount', function(req,res){ callCoin('getBlockCount', res, coinHandler); } );
app.get(chRoot + '/getstakinginfo', function(req,res) { callCoin('getStakingInfo', res, coinHandler); } );

// pagination view
app.get(chRoot + '/listtransactions/:account/:page', function(req, res){
    var account = (req.params.account || ''),
        page = (req.params.page || 1),
        count = coin.settings.historyRowsPP,
        from = 0;
    if (page < 1) page = 1;
    from = count * page - count;
    if (account.length > 1){
        if (account === coin.settings.masterAccount) account = "*";
        callCoin('listTransactions', res, coinHandler, account, count, from);
    }
    else
        res.send(JSON.stringify("Error: Invalid Account."));
});

app.get(chRoot + '/makekeypair', function(req, res){
    callCoin('makekeypair', res, coinHandler);
});

app.get(chRoot + '/getbalance/:account', function(req, res){
    var account = req.params.account || '';
    if(account.length > 1)
        callCoin('getbalance', res, coinHandler, account);
    else
        res.send(JSON.stringify("Error: Invalid Account."));
});

// Note: The wallet is account based. Always use accounts!
app.get(chRoot + '/sendfrom/:fromaccount/:toaddress/:amount/:minconf?/:comment?/:commentto?/:txcomment?', function(req, res){
    var fromaccount = req.params.fromaccount || '';
    var toaddress = req.params.toaddress || '';
    var amount = parseFloat(req.params.amount) || 0.0;
    var minconf = parseInt(req.params.minconf || 1);
    var comment = req.params.comment || '';
    var commentto = req.params.commentto || '';
    var txcomment = (req.params.txcomment ? atob(decodeURIComponent(req.params.txcomment)) : '');
    var maxSendAmount = parseFloat(coin.settings.maxSendAmount) || 0.0001; // Haha
    if(fromaccount.length && toaddress.length && amount && amount <= maxSendAmount){
        callCoin('sendfrom', res, coinHandler, fromaccount, toaddress, amount, minconf, comment, commentto, txcomment);
    } else {
        if (amount > maxSendAmount)
            res.send(JSON.stringify("Error: Amount is greater than the maximum of " + maxSendAmount + "."));
        else
            res.send(JSON.stringify("Error: Invalid sendfrom parameters."));
    }
});

// Note: Use sendfrom instead as the wallet is account based
app.get(chRoot + '/sendtoaddress/:toaddress/:amount', function(req, res){
    var amount = parseFloat(req.params.amount);
    callCoin('sendtoaddress', res, coinHandler, req.params.toaddress, amount);
});

app.get(chRoot + '/move/:fromaccount/:toaccount/:amount/:minconf?/:comment?', function(req, res){
    var fromaccount = req.params.fromaccount || '';
    var toaccount = req.params.toaccount || '';
    var amount = parseFloat(req.params.amount) || 0.0;
    var maxSendAmount = parseFloat(coin.settings.maxSendAmount) || 0.0001; // Haha
    var minconf = parseInt(req.params.minconf || 1);
    var comment = req.params.comment || ''; // Not txcomment
    if(fromaccount.length > 1 && toaccount.length > 1 && amount > 0 && amount <= maxSendAmount)
        callCoin('move', res, coinHandler, fromaccount, toaccount, amount, minconf, comment);
    else
        res.send(JSON.stringify("Error: Invalid move."));
});

app.get(chRoot + '/getnewaddress/:account', function(req, res){
    var account = req.params.account || '';
    if(account.length > 1)
        callCoin('getnewaddress', res, coinHandler, account);
    else
        res.send(JSON.stringify("Error: Invalid Account."));
});

app.get(chRoot + '/setaccount/:address/:account', function(req, res){
    coin.api.setaccount(req.params.address, req.params.account, function(err, result){
        console.log("err:"+err+" result:"+result);
        if(err)
            res.send(err);
        else
            res.send(JSON.stringify(result));
    });
});

app.get(chRoot + '/validateaddress/:address', function(req, res){
    var address = req.params.address || 'blah';
    callCoin('validateaddress', res, coinHandler, address);
});

app.get(chRoot + '/encryptwallet/:passphrase', function(req,res){
    var passphrase = atob(req.params.passphrase); // TODO: Use encryption instead of base64
    if (passphrase){
        callCoin('encryptwallet', res, coinHandler, passphrase);
    }
});

app.get(chRoot + '/walletpassphrase/:passphrase/:timeout/:stakingonly', function(req,res){
    var stakingOnly = req.params.stakingonly === 'true',
        timeout = parseInt(req.params.timeout),
        passphrase = atob(req.params.passphrase); // TODO: Use encryption instead of base64
    if (passphrase){
        callCoin('walletpassphrase', res, coinHandler, passphrase, timeout, stakingOnly);
    }
});

app.get(chRoot + '/walletlock', function(req,res){ callCoin('walletlock', res, coinHandler); });

app.get(chRoot + '/help/:commandname?', function(req, res){
    if (req.params.commandname !== undefined)
        callCoin('help', res, coinHandler, req.params.commandname);
    else
        callCoin('help', res, coinHandler);
});

app.get(chRoot + '/listreceivedbyaddress/:minconf?/:includeempty?', function(req, res){
    var includeEmpty = (req.params.includeempty || false) === 'true', 
        minConf = parseInt(req.params.minconf || 1);
    callCoin('listreceivedbyaddress', res, coinHandler, minConf, includeEmpty);
});

app.get(chRoot + '/getaccount/:address', function(req, res){
    coin.api.getaccount(req.params.address, function(err, result){
        console.log("err:"+err+" result:"+result);
        if(err)
            res.send(err);
        else
            res.send(JSON.stringify(result));
    });
});

app.get(chRoot + '/listaddressgroupings', function(req, res){
    coin.api.listaddressgroupings(function(err, result){
        console.log("err:"+err+" result:"+result);
        if(err)
            res.send(err);
        else
            res.send(JSON.stringify(result));
    });
});

app.get(chRoot + '/setadressbookname/:address/:label', function(req, res){
    coin.api.setadressbookname(req.params.address, req.params.label, function(err, result){
        console.log("err:"+err+" result:"+result);
        if(err)
            res.send(err);
        else
            res.send(JSON.stringify(result));
    });
});

// Custom routes //

// This never gets hit
app.get(chRoot + '/', function(req, res){
    res.render('index');
});

// This goes last.
app.get('*', function(req, res) {
    var err = 'The document you requested was not found.';
    if (req.accepts('html')) {
        res.render('error', {
            message: err,
            error: 404
        });
        return;
    }
    if (req.accepts('json')) {
        res.send({ error: err });
        return;
    }
    res.type('txt').send(err);
});

// *** Express 4.x requires these app.use calls to be after any app.get or app.post routes.
// *** "Your code should move any calls to app.use that came after app.use(app.router) after any routes (HTTP verbs)."

app.use(function(err, req, res, next) {
    // Handle error message display
    var msg = app.get('env') === 'production' ? 'An internal error occurred. Please try again later.': err;
    if (req.accepts('html')) {
        res.render('error', {
            message: msg,
            error: 500
        });
        return;
    }
    if (req.accepts('json')) {
        res.send({ error: msg });
        return;
    }
    res.type('txt').send(msg);
    next();
});

// Catch session timeout
app.use(function(req, res, next) {
    if (req.session && Date.now() <= req.session.cookie.expires){
        next();
    } else {
   		res.redirect(app.get('chRoot') + '/');
    }
});

// Start it up!
function startApp(app) {
    // Start the Express server
    console.log("Express " + (coin.isLocal ? "" : "Secure ") + "Server starting...");
    var protocol = coin.isLocal ? require('http') : require('https');
    var server = coin.isLocal ? protocol.createServer(app) : protocol.createServer(credentials, app);
    var port = app.get('port'); // 8181 or 8383 depending on coin.isLocal

    var listener = server.listen(port, function(){
        console.log('  Server listening on port ' + port);
        console.log('  Wallet is: ' + (coin.isLocal ? 'Local' : 'Not-Local'));

        // Init MASTER_ACCOUNT in wallet and database for this node_id (Requires exported 'coin')
        require('./lib/init-wallet')();

        var io = require('socket.io')(server, { port: port });
        //Allow Cross Domain Requests
        io.set('transports', [ 'websocket' ]);
        io.on('connection', function (socket){
            socket.on('news', function (data){
                console.log(data);
            });
            socket.on('abort', function (data){
                console.log('Told clients to abort for: ' + data);
            });
            socket.on('continue', function (data){
                console.log('Told clients to continue to: /' + data);
                app.set('status', '');
            });
            socket.on('connect_error', function (err) {
                console.log("Socket connection error: " + err);
            });
            // Send a message to newly connected client
            socket.emit('news', 'Socket connected!');
        });
        process.on('rpc_error', function (err) {
            console.log(err);
            app.set('status', coin.settings.coinName + ' Wallet Maintenance');
            // Send abort message to all clients
            io.sockets.emit('news', 'Down for wallet maintenance...');
            io.sockets.emit('abort', 'maintenance');
        });
        process.on('rpc_connected', function (err) {
            console.log(err);
            app.set('status', '');
            // Send continue message to all clients
            io.sockets.emit('news', 'Wallet is connected...');
            io.sockets.emit('continue', '');
        });
        process.on('database_error', function (err) {
            console.log(err);
            app.set('status', coin.settings.coinName + ' Database Maintenance');
            // Send abort message to all clients
            io.sockets.emit('news', 'Database error...');
            io.sockets.emit('abort', 'maintenance');
        });
        process.on('database_disconnected', function (err) {
            console.log(err);
            app.set('status', coin.settings.coinName + ' Database Maintenance');
            // Send abort message to all clients
            io.sockets.emit('news', 'Down for database maintenance...');
            io.sockets.emit('abort', 'maintenance');
        });
        process.on('database_reconnected', function (err) {
            console.log(err);
            app.set('status', '');
            // Send continue message to all clients
            io.sockets.emit('news', 'Database is reconnected...');
            io.sockets.emit('continue', '');
        });
        process.on('database_connected', function (err) {
            console.log(err);
            app.set('status', '');
            // Send continue message to all clients
            io.sockets.emit('news', 'Database is connected...');
            io.sockets.emit('continue', '');
        });
        process.on('SIGINT', function(err){
            console.log('SIGINT Received: ' + err);
            app.set('status', coin.settings.coinName + ' Down for Maintenance');
            // Send abort message to all clients
            io.sockets.emit('news', 'Going down for maintenance...');
            io.sockets.emit('abort', 'maintenance');
            mdb.close(function() {
                listener.close(function(err) {
                    if (err) throw err;
                    console.log('Exiting App.');
                    process.exit(2);
                });
            });
        });
        process.on('uncaughtException', function (err) {
            console.log('Caught unknown exception: ' + err);
        });
        process.on('unhandledRejection', function (reason, p) {
            console.log('Caught unhandled rejection: ' + reason + ' (' + JSON.stringify(p) + ')');
        });
        process.on('rejectionHandled', function (p) {
            console.log('Caught rejection handled: ' + JSON.stringify(p));
        });
        // Poll Status
        setInterval(function(){
            var status = app.get('status');
            if (status.length > 0){
                if (status.indexOf('Wallet') > 0){
                    // Recconnect Wallet
                    console.log('Attempting to reconnect wallet...');
                    callCoin('getBlockCount', null, coinHandler);
                } else {
                    if (status.indexOf('Database') > 0){
                        // Reconnect DB
                        console.log('Attempting to reconnect database...');
                        databaseConnect();
                    }
                }
            }
        }, 5000);
    });
}
startApp(app);
