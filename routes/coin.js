/*
 * Coin RPC Routes.
 */
var atob = require('atob');
var btoa = require('btoa');

module.exports = function(app, coin) {
	var chRoot = app.get('chRoot');

    // Handler for indirect calls to the coin daemon.
    function callCoin(command, res, handler) {
        var args = Array.prototype.slice.call(arguments, 3);   // Args are after the 3rd parameter
        var callargs = args.concat([handler.bind({res:res})]); // Add the handler function to args
        return coin.api[command].apply(coin.api, callargs, coin.settings.env);
    }

    function coinHandler(err, result) {
        var Error = null;
        if (err) {
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
        if (Error && typeof Error.code !== 'undefined') {
            process.emit('rpc_error', 'RPC Error: ' + Error.code);
        } else {
            if (app.get('status').length > 0) {
                process.emit('rpc_connected', 'RPC Connected.');
            }
            if (this.res && typeof this.res.send !== 'undefined') {
                this.res.send(response);
            }
        }
    }

    app.get(chRoot + '/getinfo', function(req,res) { callCoin('getInfo', res, coinHandler); } );
    app.get(chRoot + '/getpeerinfo', function(req,res) { callCoin('getPeerInfo', res, coinHandler); } );
    app.get(chRoot + '/getinterestrate', function(req,res) { callCoin('getInterestRate', res, coinHandler); } );
    app.get(chRoot + '/getinflationrate', function(req,res) { callCoin('getInflationRate', res, coinHandler); } );
    app.get(chRoot + '/getblockcount', function(req,res) { callCoin('getBlockCount', res, coinHandler); } );
    app.get(chRoot + '/getstakinginfo', function(req,res) { callCoin('getStakingInfo', res, coinHandler); } );

    // pagination view
    app.get(chRoot + '/listtransactions/:account/:page', function(req, res) {
        var account = (req.params.account || ''),
            page = (req.params.page || 1),
            count = coin.settings.historyRowsPP,
            from = 0;
        if (page < 1) page = 1;
        from = count * page - count;
        if (account.length > 1) {
            if (account === coin.settings.masterAccount) account = "*";
            callCoin('listTransactions', res, coinHandler, account, count, from);
        }
        else
            res.send(JSON.stringify("Error: Invalid Account."));
    });

    app.get(chRoot + '/makekeypair', function(req, res) {
        callCoin('makekeypair', res, coinHandler);
    });

    app.get(chRoot + '/getbalance/:account', function(req, res) {
        var account = req.params.account || '';
        if(account.length > 1)
            callCoin('getbalance', res, coinHandler, account);
        else
            res.send(JSON.stringify("Error: Invalid Account."));
    });

    // Note: The wallet is account based. Always use accounts!
    app.get(chRoot + '/sendfrom/:fromaccount/:toaddress/:amount/:minconf?/:comment?/:commentto?/:txcomment?', function(req, res) {
        var fromaccount = req.params.fromaccount || '';
        var toaddress = req.params.toaddress || '';
        var amount = parseFloat(req.params.amount) || 0.0;
        var minconf = parseInt(req.params.minconf || 1);
        var comment = req.params.comment || '';
        var commentto = req.params.commentto || '';
        var txcomment = (req.params.txcomment ? atob(decodeURIComponent(req.params.txcomment)) : '');
        var maxSendAmount = parseFloat(coin.settings.maxSendAmount) || 0.0001; // Haha
        if(fromaccount.length && toaddress.length && amount && amount <= maxSendAmount) {
            callCoin('sendfrom', res, coinHandler, fromaccount, toaddress, amount, minconf, comment, commentto, txcomment);
        } else {
            if (amount > maxSendAmount)
                res.send(JSON.stringify("Error: Amount is greater than the maximum of " + maxSendAmount + "."));
            else
                res.send(JSON.stringify("Error: Invalid sendfrom parameters."));
        }
    });

    // Note: Use sendfrom instead as the wallet is account based
    app.get(chRoot + '/sendtoaddress/:toaddress/:amount', function(req, res) {
        var amount = parseFloat(req.params.amount);
        callCoin('sendtoaddress', res, coinHandler, req.params.toaddress, amount);
    });

    app.get(chRoot + '/move/:fromaccount/:toaccount/:amount/:minconf?/:comment?', function(req, res) {
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

    app.get(chRoot + '/getnewaddress/:account', function(req, res) {
        var account = req.params.account || '';
        if(account.length > 1)
            callCoin('getnewaddress', res, coinHandler, account);
        else
            res.send(JSON.stringify("Error: Invalid Account."));
    });

    app.get(chRoot + '/setaccount/:address/:account', function(req, res) {
        coin.api.setaccount(req.params.address, req.params.account, function(err, result) {
            console.log("err:"+err+" result:"+result);
            if(err)
                res.send(err);
            else
                res.send(JSON.stringify(result));
        });
    });

    app.get(chRoot + '/validateaddress/:address', function(req, res) {
        var address = req.params.address || 'blah';
        callCoin('validateaddress', res, coinHandler, address);
    });

    app.get(chRoot + '/encryptwallet/:passphrase', function(req,res) {
        var passphrase = atob(req.params.passphrase); // TODO: Use encryption instead of base64
        if (passphrase) {
            callCoin('encryptwallet', res, coinHandler, passphrase);
        }
    });

    app.get(chRoot + '/walletpassphrase/:passphrase/:timeout/:stakingonly', function(req,res) {
        var stakingOnly = req.params.stakingonly === 'true',
            timeout = parseInt(req.params.timeout),
            passphrase = atob(req.params.passphrase); // TODO: Use encryption instead of base64
        if (passphrase) {
            callCoin('walletpassphrase', res, coinHandler, passphrase, timeout, stakingOnly);
        }
    });

    app.get(chRoot + '/walletlock', function(req,res) { callCoin('walletlock', res, coinHandler); });

    app.get(chRoot + '/help/:commandname?', function(req, res) {
        if (req.params.commandname !== undefined)
            callCoin('help', res, coinHandler, req.params.commandname);
        else
            callCoin('help', res, coinHandler);
    });

    app.get(chRoot + '/listreceivedbyaddress/:minconf?/:includeempty?', function(req, res) {
        var includeEmpty = (req.params.includeempty || false) === 'true',
            minConf = parseInt(req.params.minconf || 1);
        callCoin('listreceivedbyaddress', res, coinHandler, minConf, includeEmpty);
    });

    app.get(chRoot + '/getaddressesbyaccount/:account', function(req, res) {
        var account = req.params.account || '';
        callCoin('getaddressesbyaccount', res, coinHandler, account);
    });

    app.get(chRoot + '/getaccount/:address', function(req, res) {
        coin.api.getaccount(req.params.address, function(err, result) {
            console.log("err:"+err+" result:"+result);
            if(err)
                res.send(err);
            else
                res.send(JSON.stringify(result));
        });
    });

    app.get(chRoot + '/listaddressgroupings', function(req, res) {
        coin.api.listaddressgroupings(function(err, result) {
            console.log("err:"+err+" result:"+result);
            if(err)
                res.send(err);
            else
                res.send(JSON.stringify(result));
        });
    });

    app.get(chRoot + '/setadressbookname/:address/:label', function(req, res) {
        coin.api.setadressbookname(req.params.address, req.params.label, function(err, result) {
            console.log("err:"+err+" result:"+result);
            if(err)
                res.send(err);
            else
                res.send(JSON.stringify(result));
        });
    });
};
