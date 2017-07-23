/**
 *  YourCoin App
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

// coin Object - Localization settings and wallet daemon api calls.
var coin = require('./lib/coinapi');
module.exports = coin;

var fs = require('fs');
var path = require('path');
var atob = require('atob');
var btoa = require('btoa');

var privateKey  = coin.settings.ssl ? fs.readFileSync(coin.settings.sslKey, 'utf8') : null;
var certificate = coin.settings.ssl ? fs.readFileSync(coin.settings.sslCrt, 'utf8') : null;
var credentials = {key: privateKey, cert: certificate};

var express = require('express');
var app = express();

var async = require('async');
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
app.set('host', coin.settings.appHost);
app.set('port', coin.settings.ssl ? coin.settings.sslPort : coin.settings.port);

app.use(cors());
app.use(express.static(path.join(__dirname, 'public' + coin.settings.chRoot)));
app.use(favicon(path.join(__dirname, coin.settings.favicon)));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: false, limit: '2mb'})); // TODO: Put this limit in settings.json
app.use(bodyParser.json({limit: '2mb'})); // TODO: Put this limit in settings.json
app.use(session({name: coin.settings.appTitle,
                secret: coin.settings.supersecret,
                genid: function(req) {
                    return uuid.v4(); // use UUIDs
                },
                // Cookie expires in 30 days
                cookie: {secure: coin.settings.ssl, maxAge: 30 * 24 * 60 * 60 * 1000, domain: coin.settings.appHost},
                saveUninitialized: false,
                resave: true}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash());            // use connect-flash for flash messages stored in session (Bug: Has to come after session and before router.)

// DB Functions
var mdb = require('./lib/database');
var dbString = 'mongodb://' + coin.settings.mdb.user +
                        ':' + coin.settings.mdb.password +
                        '@' + coin.settings.mdb.host +
                        ':' + coin.settings.mdb.port +
                        '/' + coin.settings.mdb.database;

console.log('Database: ' + coin.settings.mdb.host + ':' + coin.settings.mdb.port + '/' + coin.settings.mdb.database);

coin.settings.mdb.password = "XXXXXXXX";
coin.settings.mdb = null; // garbage collection

// Connect to Database
function databaseConnect(){
    mdb.connect(dbString, function(err) {
        if (err){
            app.set('status', coin.settings.appTitle + ' Maintenance');
        } else {
            app.set('status', '');
        }
    });
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

////////// Routes //////////

// Add CORS headers to all requests
app.all('*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-AUTHENTICATION, X-IP, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    next();
});

// Auth routes (includes: '/', '/signup', '/login', '/logout', '/profile', '/password', + oauth routes)
require('./routes/auth.js')(app, passport);
// Passport.use functions
require('./lib/passport')(passport);

// Coin RPC routes / functions
require('./routes/coin.js')(app, coin);

// User routes //
require('./routes/user.js')(app, coin, mdb);

// Misc routes //

// Returns the wallet's rpc node info and localization settings.
app.get(chRoot + '/getnodeinfo', function(req,res){
    var response = {
        error: null,
        result: {
            settings: coin.settings
        }
    };
    res.send(JSON.stringify(response));
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
    console.log("Express " + (coin.settings.ssl ? "Secure " : "") + "Server starting...");
    var protocol = coin.settings.ssl ? require('https') : require('http');
    var server = coin.settings.ssl ? protocol.createServer(credentials, app) : protocol.createServer(app);
    var port = app.get('port'); // 8181 or 8383
    var host = app.get('host');

    var listener = server.listen(port, function() {
        console.log('Server is listening on: ' + (coin.settings.ssl ? 'https://' : 'http://') + host + ':' + port);
        console.log('Wallet is listening on: ' + (coin.settings.wallet.ssl ? 'https://' : 'http://') + coin.settings.wallet.rpchost + ':' + coin.settings.wallet.rpcport);

        // Init MASTER_ACCOUNT in wallet and database for this node_id.
        require('./lib/init-wallet')();

        var io = require('socket.io')(server, { port: port });
        //Allow Cross Domain Requests
        io.set('transports', [ 'websocket' ]);
        io.on('connection', function (socket) {
            socket.on('news', function (data) {
                console.log(data);
            });
            socket.on('abort', function (data) {
                console.log('Told clients to abort for: ' + data);
            });
            socket.on('continue', function (data) {
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
            app.set('status', coin.settings.appTitle + ' Wallet daemon is down.');
            // Send abort message to all clients
            io.sockets.emit('news', 'Wallet is down for maintenance...');
            io.sockets.emit('wallet', 'down');
        });
        process.on('rpc_connected', function (err) {
            console.log(err);
            app.set('status', '');
            // Send continue message to all clients
            io.sockets.emit('news', 'Wallet is connected...');
            io.sockets.emit('wallet', 'up');
        });
        process.on('database_error', function (err) {
            console.log(err);
            app.set('status', coin.settings.appTitle + ' Database error.');
            // Send abort message to all clients
            io.sockets.emit('news', 'Database error...');
            io.sockets.emit('abort', 'maintenance');
        });
        process.on('database_disconnected', function (err) {
            console.log(err);
            app.set('status', coin.settings.appTitle + ' Database disconnected.');
            // Send abort message to all clients
            io.sockets.emit('news', 'Database is down for maintenance...');
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
            app.set('status', coin.settings.appTitle + ' Down for Maintenance');
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
                    // Wallet daemon down.
                    // TODO: Uncomment console logging when wallet daemon is installed.
                    //console.log(status);
                } else {
                    if (status.indexOf('Database') > 0){
                        // Reconnect DB
                        console.log(status);
                        console.log('Attempting to reconnect database...');
                        databaseConnect();
                    }
                }
            }
        }, 5000);
    });
}
startApp(app);
