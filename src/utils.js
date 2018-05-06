'use strict';

var cachedKeyIdx = 0;

var nullString = function() { return ''};

function mockObject(){
    return new Proxy({}, {
        get: function(target, name) {
            if (typeof name  === 'string'){
                if (name === 'toString') {
                    return nullString;
                } else {
                    return utils.mock;
                }
            } else {
                return target[name];
            }
        }
    })
}

/*
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
    this.events = new NamedEventManager()
    this.$POST = $POST.bind(this);
    this.options = {endPoint : endPoint};
    this.on = this.events.on.bind(this);
};

reWheelConnection.prototype.updateStatus = function(status, callBack, error) {
    if (status) {
        var isLogged = (status.user_id && !this.options.user_id );
        for (var x in status){ this.options[x] = status[x]; }
        localStorage.lastRWTStatus = JSON.stringify(status);
        if (isLogged) {
            this.events.emit('login', this.options.user_id);
        }
    }
    if (!this.options.user_id && this.getLogin){
        var logInfo = this.getLogin(error);
        if (logInfo.constructor === Object){
            this.login(logInfo.username, logInfo.password)
            .then((function(status){
                this.updateStatus(status, callBack);
            }).bind(this));
        } else if (logInfo.constructor === Promise) {
            logInfo.then((function(obj){
                var x = this.login(obj.username,obj.password);
                var manageError = (function(bad){
                    this.updateStatus(null,callBack,bad.error);
                }).bind(this);
                if (callBack){
                    x.then(callBack,manageError);
                } else {
                    x.then(null, manageError);
                }
            }).bind(this));
        }
    } else {
        callBack && callBack(this.options);
    }    
}

reWheelConnection.prototype.status = function(callBack, force){
    if (('lastRWTStatus' in localStorage) && !force) {
        try{
            var status = JSON.parse(localStorage.lastRWTStatus);
            this.updateStatus(status,callBack);
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
            self.updateStatus(status,callBack);
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

    var promise = new Promise(function(accept,reject){
        utils.xdr(ths.options.endPoint + url, data, ths.options.application, ths.options.token)
            .then(function(xhr){
                ths.events.emit('http-response', xhr.responseText, xhr.status, url, data);
                ths.events.emit('http-response-' + xhr.status, xhr.responseText, url, data);
                if (xhr.responseData){
                    ths.events.emit('http-response-' + xhr.status + '-json', xhr.responseData, url, data);
                }
                if (callBack) { callBack( xhr.responseData || xhr.responseText )};
                accept(xhr.responseData || xhr.responseText);
            }, function(xhr) {
                if (xhr.responseData){
                    ths.events.emit('error-json', xhr.responseData, xhr.status, url, data, xhr);
                    ths.events.emit('error-json-' + xhr.status, xhr.responseData,url, data, xhr);
                } else {                
                    ths.events.emit('error-http',xhr.responseText, xhr.status,url,data,xhr);
                    ths.events.emit('error-http-' + xhr.status, xhr.responseText,url,data,xhr);
                }
                reject(xhr.responseData || xhr.responseText);
            });
        });
    return promise;
};

reWheelConnection.prototype.login = function(username, password){
    var url = this.options.endPoint + 'api/login';
    var connection = this;
    return new Promise(function(accept,reject){
        utils.xdr(url,{ username: username, password : password}, null,connection.options.token, true)
            .then(function(xhr){
                connection.updateStatus(xhr.responseData);
                accept(status);
            }, function(xhr){
                reject(xhr.responseData || xhr.responseText);
            });
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
            if (self.options && self.options.realtimeEndPoint){
                setTimeout(function(){
                    wsconnect(self);                
                },1000);
            }
        });
    }
    
    return this.status((function(status){
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
        if (self.options.token && self.options.realtimeEndPoint && (!self.wsConnection)){
            wsconnect(self);
        }
    }).bind(this));
};

reWheelConnection.prototype.logOut = function(url, callBack){
    return this.$post('api/logout',{},(function(status) {
        if ('lastRWTStatus' in localStorage) {
            delete localStorage.lastRWTStatus;
        }
        this.options = {endPoint: this.options.endPoint};
        if (this.wsConnection) { 
            this.wsConnection.close();
            this.wsConnection = null;
        }
        if (url) { location = url; }
        callBack && callBack();
    }).bind(this));
}
*/
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
//    $POST : $POST,
//    reWheelConnection: reWheelConnection,
    log: function(){ 
        console.log(arguments);
    },

    xdr: function (url, data, application,token, formEncode) {
        /**
         * Make an HTTP Request and return its promise.
         */
        return new Promise(function(accept, reject) {
            var req;
            if (!data) { data = {};}

            if(XMLHttpRequest) {
                req = new XMLHttpRequest();
                req.onreadystatechange = function() {
                    if (req.readyState === 4) {
                        try{
                            var responseData = JSON.parse(req.responseText);
                        } catch (a){
                            var responseData = null;
                        }
                        var response = {responseData: responseData, responseText: req.responseText,status: req.status, request: req};
                        if (req.status >= 200 && req.status < 400) {
                            accept(response);
                        } else {
                            reject(response);
                        }
                    }
                };
            } else if(XDomainRequest){
                req = new XDomainRequest();
                req.onload = function() {
                    accept(req.responseText,req.statusText, req);
                };
            } else {
                reject(new Error('CORS not supported'));
            }

            req.open('POST', url, true);
            req.onerror = reject;
            req.setRequestHeader('Accept','application/json');
            if (token) { data.__token__ = token }
            if (!formEncode){
                req.setRequestHeader('Content-Type','text/plain');
                data = Lazy(data).size()?JSON.stringify(data):'';
            } else {
                req.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
                data = Lazy(data).map(function(v,k){
                  return k + '=' + encodeURI(v.toString());  
                }).toArray().join('&');
            }
            req.send(data);
    //        req.send(null);
        })
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

    makeFilter : function (model, filter, unifier, dontTranslateFilter) {
        /**
         * Make filter for Array.filter function as an and of or
         */
        if (!unifier) { unifier = ' && ';}
        if (Lazy(filter).size() === 0){
            return function(x){ return true };
        }
        var source = Lazy(filter).map(function(vals, field){
            if (!vals) { vals = [null]}
            if (!Array.isArray(vals)){
                vals = [vals];
            }
            if (!dontTranslateFilter && (model.fields[field].type === 'reference')) {
                field = '_' + field;
                vals = Lazy(vals).map(function(x){
                    if (x && (x.constructor !== Number)){
                        return x.id;
                    } else 
                        return x;
                }).toArray();
            } else if (model.fields[field].type === 'string'){
                vals = vals.map(JSON.stringify);
            }
            return '(' +  Lazy(vals).map(function(x){
                if (!x) {
                    console.error('makeFilter x is null');
                } else if(x === orm.utils.mock) {
                    console.error('makeFilter with Mock Object');
                }
                return '(x.' + field + ' === ' + x + ')';
            }).join(' || ')  +')';
        }).toArray().join(unifier);
        return new Function("x", "return " + source);
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

    cleanDescription: function() {
        Lazy(localStorage)
            .filter(function(v, n) { return Lazy(n).startsWith('description:')})
            .keys()
            .each(function(n) { delete localStorage[n] });
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

    waitFor: function(func, callBack) {
        var waiter = function() {
            if (func()) {
                callBack();
            } else {
                setTimeout(waiter,500);
            }
        }
        setTimeout(waiter, 500);
    },

    bool: Boolean,

    noop : function(){},

    tzOffset: new Date().getTimezoneOffset() * 60000,

    transFieldType: {
        date: function(x) { return new Date(x * 1000 + utils.tzOffset ) },
        datetime: function(x) { return new Date(x * 1000 + utils.tzOffset ) },
        string: function(x) { return x.toString(); },
        text: function(x) { return x.toString(); },
        integer: function(x) { return parseInt(x); },
        float: function(x) { return parseFloat(x); }
    }, 
    mock : mockObject()
};


