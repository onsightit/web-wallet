define(['knockout'], function(ko){
    var consoleType = function(options){
        var self = this;
        self.wallet = options.parent || {};

        self.role = ko.observable("");

        self.commandText = ko.observable('help');
        self.commandOutput = ko.observable('');
        self.decodeText = ko.observable('');
        self.decodeOutput = ko.observable('');

        self.isLoading = ko.observable(false);
    };

    function parseCommand(commandText){
        var port = (window.location.port === '' ? '' : ":" + window.location.port);
        var url = window.location.protocol + '//' + window.location.hostname + port + '/'; // Allow CORS
        commandText.replace(new RegExp(' ','g') );
        url = url.concat(commandText.replace(new RegExp(' ','g'), '/'));
        return url;
    }

    consoleType.prototype.refresh = function(){
        var self = this;
        if (self.wallet.User().profile){
            self.role(self.wallet.User().profile.role);
        }
    };

    consoleType.prototype.runCommand = function(){
        var self = this;
        if (self.role() === "Admin"){
            self.isLoading(true);
            $.ajax({
                async: true,
                method: 'GET',
                url: parseCommand(self.commandText()),
                dataType: 'json'
            }).done(function(data){
                var result = data.error ? data.error.error.message : data.result;
                if( toString.call(result) === "[object String]"){
                    self.commandOutput(result);
                } else {
                    if( result !== undefined){
                        self.commandOutput(JSON.stringify(result, null, 4));
                    } else {
                        self.commandOutput(JSON.stringify(data, null, 4));
                    }
                }
            }).fail(function(jqXHR, textStatus, errorThrown){
                console.log(jqXHR);
                console.log(textStatus);
                console.log(errorThrown);
                self.commandOutput(errorThrown);
            }).always(function(){
                self.isLoading(false);
            });
        } else {
            self.commandOutput("Error: You are not authorized to run Console commands.");
        }
    };

    consoleType.prototype.runDecode = function(){
        var self = this;
        if (self.role() === "Admin"){
            self.isLoading(true);
            self.decodeOutput(atob(self.decodeText()));
            self.isLoading(false);
        } else {
            self.decodeOutput("Error: You are not authorized to run Console commands.");
        }
    };

    return consoleType; 
});
