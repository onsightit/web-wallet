var http = require('http'),
    https = require('https');

var api  = require('./commands'),
    errors = require('./errors');

function Client(options) {
    this.opts = {
        host:    'localhost',
        port:    18181,
        method:  'POST',
        user:    'rpcuser',
        pass:    'rpcpass',
        headers: {
            'Host': 'localhost',
            'Authorization': ''
        },
        https: false,
        rejectUnauthorized: true,
        ca: null,
        passphrasecallback: null,
        account: ''
    };

    if (options) {
        this.set(options);
    }
}

Client.prototype = {

    invalid:function(command) {
        var args = Array.prototype.slice.call(arguments, 1),
            fn   = args.pop();

        if (typeof fn !== 'function') {
            fn = console.log;
        }

        return fn(new Error('No such command "' + command  + '"'));
    },

    send:function(command) {
        var args = Array.prototype.slice.call(arguments, 1),
            self = this,
            fn;
        
        if (typeof args[args.length-1] === 'function') {
            fn = args.pop().bind(this);
        } else {
            fn = console.log;
        }

        var rpcData;
        rpcData = JSON.stringify({
            id: new Date().getTime(),
            method: command.toLowerCase(),
            params: args
            });

        var options = this.opts;
        options.headers['Content-Length'] = rpcData.length;

        var request = options.https ? https.request : http.request;

        //console.log("DEBUG: options = " + JSON.stringify(options));
        var req = request(options, function(res) {
            var data = '';
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                data += chunk;
            });
            res.on('end', function() {
                try {
                    data = JSON.parse(data);
                } catch(exception) {
                    var errMsg = (res.statusCode !== 200 ? 'Invalid params ' + res.statusCode : 'Failed to parse JSON');
                    // statusCode 403 is rpc auth failed. check local coin.conf params.
                    errMsg += ' : '+JSON.stringify(data);
                    return fn(new Error(errMsg));
                }
                if (data.error) {
                    if (data.error.code === errors.RPC_WALLET_UNLOCK_NEEDED &&
                        options.passphrasecallback) {
                        return self.unlock(command, args, fn);
                    } else {
                        var err = new Error(JSON.stringify(data));
                        err.code = data.error.code;
                        return fn(err);
                    }
                }
                fn(null, data.result !== null ? data.result : data);
            });
            res.on('error', function(e) {
                return fn(JSON.stringify(e));
            });
        });
        req.on('error', function(e) {
            return fn(JSON.stringify(e));
        });
        req.end(rpcData);
        return this;
    },

    exec:function(command) {
        var func = api.isCommand(command) ? 'send' : 'invalid';
        return this[func].apply(this, arguments);
    },

    auth:function() {
        var authString = ('Basic ') + Buffer.from(this.opts.user+':'+this.opts.pass).toString('base64');
        this.opts.headers.Authorization = authString;
        this.opts.pass = "XXXXXXXX";
        return this;
    },

    unlock:function(command, args, fn) {
        var self = this;
        var retry = function(err) {
            if (err) {
                fn(err);
            } else {
                var sendargs = args.slice();
                sendargs.unshift(command);
                sendargs.push(fn);
                self.send.apply(self, sendargs);
            }
        };

        this.opts.passphrasecallback(command, args, function(err, passphrase, timeout) {
            if (err) {
                 fn(err);
            } else {
                 self.send('walletpassphrase', passphrase, timeout, retry);
            }
        });
    },

    set:function(k, v) {
        if (typeof(k) === 'object') {
            for (var ky in k) {
                if (k.hasOwnProperty(ky)) {
                    this.set(ky, k[ky]);
                }
            }
            return;
        }

        var opts = this.opts,
            key = k;

        if (opts.hasOwnProperty(key)) {
            opts[key] = v;
            if (/^(user|pass)$/.test(key)) {
                if (key === 'user')
                    opts.user = v;
                else
                    opts.pass = v;
            } else if (key === 'host') {
                opts.host = v;
                opts.headers.Host = v;
            } else if (key === 'passphrasecallback' ||
                       key === 'account' ||
                       key === 'https' ||
                       key === 'rejectUnauthorized' ||
                       key === 'ca') {
                opts[key] = v;
            }
        }
        return this;
    },

    get:function(k) {
        var opt = this.opts[k.toLowerCase()];
        return opt ? opt : new Error('No such option "'+k+'" exists');
    },

    errors: errors
};

api.commands.forEach(function(command) {
    var cp  = Client.prototype;
    var tlc = [command.toLowerCase()];

    cp[command] = cp[tlc] = function() {
        cp.send.apply(this, tlc.concat(([]).slice.call(arguments)));
    };
});

module.exports = function(options) {
    return new Client(options);
};
