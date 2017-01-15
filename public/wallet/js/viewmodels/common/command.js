define(['knockout'],function(ko){

    var commandType = function(commandName, args, chRoot, env){
        this.commandName = ko.observable(commandName);
        this.args = ko.observableArray(args);
        this.chRoot = ko.observable(chRoot || '');
        this.env = ko.observable(env || '');
    };

    function parseGetCommand(commandName, args, chRoot){
        var port = (window.location.port === '' ? '' : ":" + window.location.port);
        var url = window.location.protocol + '//' + window.location.hostname + port; // Allow CORS
        url = url.concat(chRoot + '/');
        url = url.concat(commandName.concat('/'));
        if(args && args.length > 0){
            url = url.concat(args.join('/'));
        }
        return url;
    }

    function parsePostCommand(commandName, chRoot){
        var port = (window.location.port === '' ? '' : ":" + window.location.port);
        var url = window.location.protocol + '//' + window.location.hostname + port; // Allow CORS
        url = url.concat(chRoot + '/');
        url = url.concat(commandName);
        return url;
    }

    commandType.prototype.post = function(){
        var self = this, deferred = $.Deferred();
        var url = parsePostCommand(self.commandName(), self.chRoot());
        var data = self.args()[0]; // Format: { key: value, key2: value2 }
        //console.log("DEBUG: data = " + JSON.stringify(data));
        $.ajax({
            async: true,
            method: 'POST',
            url: url,
            data: data,
            dataType: 'json'
        }).done(function(data){
            if (self.env() === 'development'){
                console.log("Command Data For:\n" + url);
                console.log(data);
            }
            if(data.error){
                if (self.env() === 'development'){
                    console.log("Command Error For:\n" + url);
                }
                deferred.reject(data.error.error);
            } else {
                deferred.resolve(data.result);
            }
        }).fail(function(jqXHR){
            if (self.env() === 'development'){
                console.log("Ajax call failure: ");
                console.log(jqXHR);
            }
            deferred.reject({ code: jqXHR.status, message: "Request failed: " + jqXHR.responseText });
        });
        return deferred.promise();
    };

    commandType.prototype.execute = function(){
        var self = this, deferred = $.Deferred();
        var url = parseGetCommand(self.commandName(), self.args(), self.chRoot());
        $.ajax({
            async: true,
            method: 'GET',
            url: url,
            dataType: 'json'
        }).done(function(data){
            if (self.env() === 'development'){
                console.log("Command Data For:\n" + url);
                console.log(data);
            }
            if(data.error){
                if (self.env() === 'development'){
                    console.log("Command Error For:\n" + url);
                }
                deferred.reject(data.error.error);
            } else {
                deferred.resolve(data.result);
            }
        }).fail(function(jqXHR){
            if (self.env() === 'development'){
                console.log("Ajax call failure: ");
                console.log(jqXHR);
            }
            deferred.reject({ code: jqXHR.status, message: "Request failed: " + jqXHR.responseText });
        });
        return deferred.promise();
    };

    return commandType;
});
