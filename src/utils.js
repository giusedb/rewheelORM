'use strict';

var Lazy = require('lazy.js');
var utils = require('./utils.js');
var handlers = require('./handlers.js');
var sockjs = require('sockjs');
var SockJS = sockjs.listen;
var cachedKeyIdx = 0;

var isNode = false;
try {
    localStorage['test'] = 1
} catch(e) {
    var localStorage = {};
    isNode = true;
}

var $POST = function(url, data, callBack, errorBack,headers){
    var opts = {
        accepts : 'application/json',
        url : url,
        data : JSON.stringify(data),
        dataType : 'json',
        success : callBack,
        error : errorBack,
        method : 'POST',
        contentType : 'application/json'
    };
    if (headers){
        opts.headers = headers;
        opts.crossDomain = true;
    }
    return $.ajax(opts);
}

function reWheelConnection(endPoint, getLogin){
    // main 
    var self = this;
    this.getLogin = getLogin;
    this.events = new handlers.NamedEventManager()
    this.$POST = $POST.bind(this);
    this.options = {endPoint : endPoint};
    this.on = this.events.on.bind(this);
};
reWheelConnection.prototype.status = function(callBack, force){
    if (('lastRWTStatus' in localStorage) && !force) {
        try{
            var status = JSON.parse(localStorage.lastRWTStatus);
            for (var x in status){ this.options[x] = status[x]; }
        } catch (e){
            return this.status(callBack, true);
        }
        return callBack && callBack(status);
    }
    if (this._status_calling){
        var self = this;
        return setTimeout(function(){
            self.status(callBack);
        },50);
    }
    if (this.options && this.options.timestamp){
        callBack && callBack(this.options);
    } else {
        this._status_calling = true;
        var self = this;
        return this.$post('api/status',null,function(status){
            localStorage.lastRWTStatus = JSON.stringify(status);
            self._status_calling = false;
            for (var x in status){ self.options[x] = status[x]; }
            if (!status.user_id && self.getLogin){
                var logInfo = self.getLogin();
                if (logInfo.constructor === Object){
                    self.login(logInfo.username, logInfo.password)
                    .then(function(status){
                        for (var x in status){ self.options[x] = status[x]; }
                        localStorage.lastRWTStatus = JSON.stringify(status);
                        callBack && callBack(status)
                    })
                }
            } else {
                callBack && callBack(self.options);
            }
        });        
    }
};

reWheelConnection.prototype.$post = function(url, data,callBack){
    var ths = this;
    if (this.options && this.options.token){
        if (!data){
            data = {};
        }
    }
    if (this.options.token){
        var headers = { 
            token : this.options.token,
            application : this.options.application
        };
    } else {
        var headers = null;
    }

    var promise = utils.xdr(this.options.endPoint + url, data,function(responseData, status, xhr){
            ths.events.emit('http-response', responseData, xhr.status, url, data);
            ths.events.emit('http-response-' + xhr.status, responseData, url, data);
            if (callBack) { callBack( responseData )};
        }, function(xhr) {
            try{
                var responseData = JSON.parse(xhr.responseText)
                ths.events.emit('error-json', responseData, xhr.status, url, data, xhr);
                ths.events.emit('error-json-' + xhr.status, responseData,url, data, xhr);
            } catch (e){
                ths.events.emit('error-http',xhr.responseText, xhr.status,url,data,xhr);
                ths.events.emit('error-http-' + xhr.status, xhr.responseText,url,data,xhr);
            }
        }, this.options.application, this.options.token);
    return promise;
};
reWheelConnection.prototype.login = function(username, password){
    var url = this.options.endPoint + 'api/login';
    var connection = this;
    var headers = null;
    if (this.options.token){
        headers = { token : this.options.token };
    }
    return new Promise(function(accept,reject){
        utils.xdr(url,{ username: username, password : password}, function(status){
                for (var x in status){ connection.options[x] = status[x]; }
                accept(status);
        }, function(xhr,data, status){
            reject(xhr.responseJSON);
        },null,null, true);
/*        $.ajax({
//            headers : headers,
            url : url,
            data : { username: username, password : password},
            dataType : 'json',
            method : 'POST',
//            contentType : 'application/json',
            mimeType : 'application/json',
            crossDomain : true,
            success : function(status){
                for (var x in status){ connection.options[x] = status[x]; }
                accept(status);
            },
            error : function(xhr,data, status){
                reject(xhr.responseJSON);
            }
            
        })
*/
    });
};
reWheelConnection.prototype.connect = function(callBack){
    var self = this;
    var wsconnect = function(self){
        self.wsConnection = new utils.wsConnect(self.options);
        self.wsConnection.onConnect(function(){
            self.events.emit('ws-connected', self.wsConnection);
        });
        self.wsConnection.onDisconnect(function(){ 
            setTimeout(function(){
                wsconnect(self);                
            },1000);
        });
    }

    return this.status(function(status){
        if ('token' in self.options){
            callBack && callBack(status);
        } else {
            console.log('connecting to ' + self.options.endPoint);
            if (self.options.username && self.options.password){
                self.login(
                    self.options.username,
                    self.options.password,
                    function(data){
                        callBack && callBack(data);
                        console.log('renewing connection')
                });
            }
        }
        if (status.token && status.realtimeEndPoint && (!self.wsConnection)){
            wsconnect(self);
        }
    });
};

var utils = {
    renameFunction : function (name, fn) {
        return (new Function("return function (call) { return function " + name +
            " () { return call(this, arguments) }; };")())(Function.apply.bind(fn));
    },
    cached : function(func, key){
        if (!key){    
            key = '_' + cachedKeyIdx++;
        }
        function wrapper(){
            if (!this[key]){
                this[key] = func.call(this,[arguments]);
            }
            return this[key];
        };
        return wrapper;
    },
    $POST : $POST,
    reWheelConnection: reWheelConnection,
    log: function(){ 
        console.log(arguments);
    },

    xdr: function (url, data, callback, errback, application,token) {
        /**
         * Make an HTTP Request and return its promise.
         */
        var req;
        if (data && data.constructor === Object){
            data = JSON.stringify(data);
        }
        
        if(XMLHttpRequest) {
            req = new XMLHttpRequest();

            if('withCredentials' in req) {
                req.open('POST', url, true);
                
                req.onerror = errback;
                req.onreadystatechange = function() {
                    if (req.readyState === 4) {
                        if (req.status >= 200 && req.status < 400) {
                            try{
                                var responseText = JSON.parse(req.responseText);
                            } catch (a){
                                var responseText = req.responseText;
                            }
                            callback(responseText,req.statusText, req);
                        } else {
                            errback(new Error('Response returned with non-OK status'));
                        }
                    }
                };
                if (application)
                    req.setRequestHeader('application', application);
                if (token)
                    req.setRequestHeader('token', token);
                req.setRequestHeader('Accept','application/json');
                req.send(data);
            }
        } else if(XDomainRequest) {
            req = new XDomainRequest();
            req.open('POST', url);
            req.onerror = errback;
            req.onload = function() {
                callback(req.responseText,req.statusText, req);
            };
            if (application)
                req.setRequestHeader('application', application);
            if (token)
                req.setRequestHeader('token', token);
            req.send(data);
        } else {
            errback(new Error('CORS not supported'));
        }
    },
    
    capitalize : function (s) {
        return s[0].toUpperCase() + s.slice(1).toLowerCase();
    },

    hash : function(str){
        /**
         * Hashed function
         */
        str = str.toString();
        var ret = 1;
        for (var x = 0;x<str.length;x++){
            ret *= (1 + str.charCodeAt(x));
        }
        return (ret % 34958374957).toString();
    },

    makeFilter : function (model, filter, unifier) {
        /**
         * Make filter for Array.filter function as an and of or
         */
        if (!unifier) { unifier = ' && ';}
        if (Lazy(filter).size() === 0){
            return function(x){ return true };
        }
        var source = Lazy(filter).map(function(vals, field){
            if (vals.constructor !== Array){
                vals = [vals];
            }
            if (model.fields[field].type === 'reference') {
                field = '_' + field;
                vals = Lazy(vals).filter(Boolean).map(function(x){
                    if (x.constructor !== Number){
                        return x.id;
                    } else 
                        return x;
                }).toArray();
            }
            return '(' +  Lazy(vals).map(function(x){
                return '(x.' + field + ' === ' + x + ')';
            }).join(' || ')  +')';
        }).toArray().join(unifier);
    },

    sameAs : function (x, y) {
        /**
         * Deep equal
         */
        for (var k in x) {
            if (y[k] != x[k]) {
                return false;
            }
        }
        return true;
    },


    wsConnect : function (options) {
        /**
         * Connects a websocket with reWheel connection
         */
        if(!options){
            return;
        }
        var self = this;
        
        // registering all event handlers

        this.handlers = {
            wizard : new handlers.Handler(),
            onConnection : new handlers.Handler(),
            onDisconnection : new handlers.Handler(),
            onMessageJson : new handlers.Handler(),
            onMessageText : new handlers.Handler()
        }
        this.onWizard = this.handlers.wizard.addHandler.bind(this.handlers.wizard);
        this.onConnect = this.handlers.onConnection.addHandler.bind(this.handlers.onConnection);
        this.onDisconnect = this.handlers.onDisconnection.addHandler.bind(this.handlers.onDisconnection);
        this.onMessageJson = this.handlers.onMessageJson.addHandler.bind(this.handlers.onMessageJson);
        this.onMessageText = this.handlers.onMessageText.addHandler.bind(this.handlers.onMessageText);

        this.options = options

        var connection = new SockJS(options.realtimeEndPoint);
        connection.onopen = function (x) {
            console.log('open : ' + x);
            connection.tenant();
            self.handlers.onConnection.handle(x);
        };
        connection.onmessage = function (x) {
            if (x.type == 'message') {
                //$.notify(x.data);
                try {
                    //TODO set fromRealtime
                    self.handlers.onMessageJson.handle($.parseJSON(x.data));
                    //TODO unset fromRealtime
                } catch (e){
                    self.handlers.onMessageText.handle(x.data);
                }
            } else {
                console.log(x);
            }
        };
        connection.onclose = function () {
            setTimeout(utils.wsConnect,1000);
            self.handlers.onDisconnection.handle();
        };
        connection.tenant = function () {
            connection.send('TENANT:' + self.options.application + ':' + self.options.token);
        }
    },

    pluralize : function(str, model){
        /**
         * Lexically returns english plural form
         */
        return str + 's';
    },

    beforeCall : function(func, before){
        var decorator = function(){
            before().then(func)
        };
        return decorator;
    },

    cleanStorage : function(){
        /**
         * Clean localStorage object
         */
        Lazy(localStorage).keys().each(function(k){
            delete localStorage[k];
        })
    },
    
    reverse : function (chr, str) {
        return str.split(chr).reverse().join(chr);
    },
    permutations: function(arr){
        var ret = [];
        for (var x = arr.length-1; x >= 0;x--){
            for (var y = arr.length-1; y >= 0; y--){
                if (x !== y)
                    ret.push([arr[x], arr[y]]);
            }
        }
        return ret;
    },

    bool: Boolean,

    noop : function(){},

    tzOffset: new Date().getTimezoneOffset() * 60000
};


if (isNode){
    utils.xdr = function (url, data, callback, errback, application,token,form){
        var request = require('request');
        var headers = {};
        if (application) {
            headers.application = application;
        }
        if (token) {
            headers.token = token;
        }
        var options = {
            url : url,
            method : 'POST',
            headers : headers
        };
        if (data){
            if (form)
                options.form = data;
            else {
                options.json = data;
            }
        }
        var res = request(options, function(error, response, body){
            try { 
                body = JSON.parse(body);
            } catch (e) { }
            callback(body, 'Ok', res);
        }, function(body){
            errorBack(body, 'Boh', res);
        });
    }
}

var exports = module.exports = utils;