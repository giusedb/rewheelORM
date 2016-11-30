'use strict';
var cachedKeyIdx = 0;
var cached = function(func, key){
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
}

var $POST = function(url, data, callBack, errorBack, context){
    var opts = {
        accepts : 'application/json',
        url : url,
        data : JSON.stringify(data),
        success : callBack,
        error : errorBack,
        method : 'POST',
        contentType : 'application/json'
    };
    if (context) {
        opts.context = context;
    }
    return $.ajax(opts);
}

function reWheelConnection(endPoint){
    // main 
    var self = this;
    this.events = new NamedEventManager()
    this.$POST = $POST.bind(this);
    this.options = {endPoint : endPoint};
    this.on = this.events.on.bind(this);
};
reWheelConnection.prototype.status = function(callBack){
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
            self._status_calling = false;
            for (var x in status){
               self.options[x] = status[x]; 
            }
            callBack && callBack(self.options);
        });        
    }
};

reWheelConnection.prototype.$post = function(url, data,callBack){
    var ths = this;
    var promise = $POST(this.options.endPoint + url, data,function(responseData, status, xhr){
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
        });
    return promise;
};
reWheelConnection.prototype.login = function(username, password){
    var url = this.options.endPoint + 'api/login';
    return new Promise(function(accept,reject){
        $.ajax({
            url : url,
            data : { username: username, password : password},
            method : 'POST',
            success : accept,
            error : reject
            
        })
    });
};
reWheelConnection.prototype.connect = function(callBack){
    var self = this;
    return this.status(function(status){
        if ('token' in self.options){
            callBack && callBack(status);
        } else {
            console.log('connecting to ' + this.options.endPoint);
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
            self.wsConnection = new utils.wsConnect(status);
            self.wsConnection.onConnect(function(){
                self.events.emit('ws-connected', self.wsConnection);
            });
            self.wsConnection.onDisconnect(function(){
                self.events.emit('ws-disconnected', self.wsConnection);
                self.wsConnection = new utils.wsConnect(status);
            });
        }
    });
};

var utils = {
    renameFunction : function (name, fn) {
        return (new Function("return function (call) { return function " + name +
            " () { return call(this, arguments) }; };")())(Function.apply.bind(fn));
    },

    log: function(){ 
        console.log(arguments);
    },
    
    setToParent : function (scope,name,value){
        if (name in scope){
            var scp = scope;
            var child = scp;
            while (scp && (name in scp)){
                child = scp;
                scp = scp.$parent;
            }
            if (name in child){
                child[name] = value;
            }
        }
    },
    
    capitalize : function (s) {
        return s[0].toUpperCase() + s.slice(1).toLowerCase();
    },

    hash : function(str){
        str = str.toString();
        var ret = 1;
        for (var x = 0;x<str.length;x++){
            ret *= (1 + str.charCodeAt(x));
        }
        return (ret % 34958374957).toString();
    },

    makeListCacheKey : function(filter, model){
        return JSON.stringify(Lazy(filter).map(function(v,k){
            return [k,Lazy(v).map(function(x){
                return x + '';
            }).sort().toArray()]
        }).toObject());
    },

    makeFilter : function (model, filter) {
        var nvFilter = Lazy(filter).map(function (v, k) {
            if (v.constructor == Array) {
                v = Lazy(v).map(function (x) {
                    return [x, 1];
                }).toObject();
            } else if (isFinite(v) || (typeof(v) == 'Number')) {
                var o = {};
                o[v] = 1;
                v = o;
            }
            if (Lazy(model.references).contains(k)) {
                k = '_' + k;
            }
            return [k, v];
        }).toObject();
        return function (x) {
            return Lazy(nvFilter).all(function (v, k) {
                return x[k] in v
            });
        }
    },

    sameAs : function (x, y) {
        for (var k in x) {
            if (y[k] != x[k]) {
                return false;
            }
        }
        return true;
    },


    wsConnect : function (options) {
        var self = this;
        
        // registering all event handlers

        this.handlers = {
            wizard : new Handler(),
            onConnection : new Handler(),
            onDisconnection : new Handler(),
            onMessageJson : new Handler(),
            onMessageText : new Handler()
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
            connection.send('TENANT:' + self.options.application)
        }
    },

    pluralize : function(str, model){
        return str + 's';
    },

    beforeCall : function(func, before){
        var decorator = function(){
            before().then(func)
        };
        return decorator;
    },

    cleanStorage : function(){
        Lazy(localStorage).keys().each(function(k){
            delete localStorage[k];
        })
    },
    
    reverse : function (chr, str) {
        return str.split(chr).reverse().join(chr);
    },

    bool: Boolean,

    noop : function(){}
};

var tzOffset = new Date().getTimezoneOffset() * 60000;

var findControllerScope = function (scope) {
    var _scope = scope;
    var _prev = undefined;
    var f = true;
    var myI = Lazy(Lazy(scope).find(function (v, k) {
        return v && v.constructor.$inject
    }).constructor.$inject);
    while (_scope) {
        f = false;
        var found = Lazy(_scope).find(function (v, k) {
            return v && v.constructor.$inject
        });
        if (found) {
            f = myI.difference(found.constructor.$inject).size() == 0;
        }
        if (f) {
            _prev = _scope;
            _scope = _scope.$parent;
        } else {
            return _prev || scope.$parent;
        }
    }
    return scope.$parent;
};

var findControllerAs = function (scope, findFunc) {
    var _scope = scope;
    while (_scope) {
        var is = findFunc(_scope);
        if (is) {
            return _scope;
        }
        _scope = _scope.$parent;
    }
};
