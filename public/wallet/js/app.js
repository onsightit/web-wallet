define( [
        "jquery",
        "sammy",
        "moment",
        "chart",
        "bootstrap",
        "bootstrap-editable",
        "bootstrap-slider",
        "knockout",
        "knockout-amd-helpers",
        "knockout-validation",
        "knockout-x-editable",
        "knockout-chart",
        "knockout-file-bindings",
        "common/dialog",
        "viewmodels/wallet",
        "socket.io",
        "bindinghandlers/modal",
        "bindinghandlers/slider",
        "bindinghandlers/numeric-text",
        "bindinghandlers/numeric-input",
        ], function(jQuery, Sammy, moment, chart, bootstrap, bse, slider, ko, koah, kov, koxe, koc, kofb, dialog, Wallet, io){
    var App = function(){
    };
    ko.amdTemplateEngine.defaultPath = "../views";
    ko.amdTemplateEngine.defaultSuffix = ".html";
    ko.amdTemplateEngine.defaultRequireTextPluginName = "text";
    ko.bindingHandlers.module.baseDir = "viewmodels";

    App.prototype.init = function() {
        var wallet = new Wallet();

        var port = (window.location.port === '' ? '' : ":" + window.location.port);
        var sockOpt = {
            "force new connection" : true,
            "reconnectionAttempts": "Infinity",
            "timeout" : 10000,
            "transports" : ["websocket"]
        };

        var socket = io.connect(window.location.protocol + '//' + window.location.hostname + port + '/', sockOpt);
        socket.on('news', function (data) {
            console.log(data);
        });
        socket.on('abort', function(page) {
            // handle abort request and redirect to page.
            window.location = wallet.settings().chRoot + '/' + page;
        });
        socket.on('connect_error', function(err) {
            // handle server error
            console.log('Error connecting to server. ' + err);
        });

        //$('.editable').editable.defaults.mode = 'inline'; // Comment or change to 'popup' (default)

        ko.applyBindings(wallet, $('#wrapper')[0]);
        dialog.init($('#defaultModal')[0]);

        Sammy(function() {
            this.get('#home', function() {
                wallet.currentView('home');
            });
            this.get('#send', function() {
                wallet.currentView('send');
            });
 
            this.get('#receive', function() {
                wallet.currentView('receive');
            });

            this.get('#history', function() {
                wallet.currentView('history');
            });

            this.get('#explore', function() {
                wallet.currentView('explore');
            });

            this.get('#console', function() {
                wallet.currentView('console');
            });

            this.get('#profile', function() {
                wallet.currentView('profile');
            });
        }).run('#home');
    };
    return new App();
});
