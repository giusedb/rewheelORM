'use strict';

function Handler(){
    this.handlers = [];
    this.strHandlers = {};
};

Handler.prototype.addHandler = function (handler){
    var strHandler = utils.hash(handler.toString());
    if (!(strHandler in this.strHandlers)){
        this.strHandlers[strHandler] = handler;
        this.handlers.push(handler);
    }
};
Handler.prototype.handle = function(){
    var args = Array.prototype.slice.call(arguments,0);
    this.handlers.forEach(function(func){
        func.apply(null,args);
    })
};
Handler.prototype.handleBy = function(){
    var args = Array.prototype.slice.call(arguments,1);
    var ths = arguments[0];
    this.handlers.forEach(function(func){
        func.apply(ths,args);
    })
};


function NamedEventManager (){
    var events = {};
    var handlerId = {};
    var idxId = 0;
    this.on = function(name, func){
        if (!(name in events)){
            events[name] = new Array();
        }
        var id = idxId ++;
        events[name].push(func);
        handlerId[id] = func;
        return id;
    };
    this.emit = function(name){
        if (name in events){
            var args = Array.prototype.slice.call(arguments,1);
            events[name].forEach(function(event){
                event.apply(null,args);
            });
        }
    };
    this.unbind = function(handler){
        var count = 0;
        if (handler in handlerId){
            var func = handlerId[handler + ''];
            Lazy(events).each(function(v,k){
                var idx = [];
                for (var n in v){
                    if (v[n] === func){
                        idx.push(n);
                        count++;
                    }
                }
                idx.reverse().forEach(function(x){
                    v.splice(x,1);
                });
            });
        }
        delete handlerId[handler];
        return count;
    };
    /**
     * Call event once
     */
    this.once = function(eventName, handlerFunction) {
        var self = this;
        var handler = this.on(eventName, function(){
            handlerFunction.apply(this, arguments);
            self.unbind(handler);
        })
    }
}

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
                    return mockObject();
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
    mock : mockObject
};



'use strict';

const STATUSKEY = 'lastRWTConnectionStatus';

function RealtimeConnection(endPoint, rwtConnection){
    /**
     * Connects a websocket with reWheel connection
     */
    var self = this;

    var connection = new SockJS(endPoint);
    connection.onopen = function (x) {
        console.log('open : ' + x);
        connection.tenant();
        rwtConnection.emit('realtime-connection-open',x);
    };
    connection.onmessage = function (x) {
        if (x.type == 'message') {
            //$.notify(x.data);
            try {
                //TODO set fromRealtime
                rwtConnection.emit('realtime-message-json', JSON.parse(x.data));
                //TODO unset fromRealtime
            } catch (e){
                rwtConnection.emit('realtime-message-text', JSON.parse(x.data));
            }
        } else {
            console.log('from realtime ',x);
        }
    };
    connection.onclose = function () {
        setTimeout(utils.wsConnect,1000);
        rwtConnection.emit('realtime-connection-closed');
    };
    connection.tenant = function () {
        connection.send('TENANT:' + rwtConnection.cachedStatus.application + ':' + rwtConnection.cachedStatus.token);
    }
    this.close = function() {
        connection.close();
    }
}    

function reWheelConnection(endPoint, getLogin){
    /**
     * Connection basic for reWheel
     * @param endPoint: string base url for all comunication
     * @param getLogin: function to be called in case of missing login.
     *  this function could return :
     *  -   a { username : <username> , password: <password>} or
     *  -   b Promise -> { username : <username> , password: <password>}
     */
    // main initialization
    var events = new NamedEventManager();
    this.getLogin = getLogin;
    this.endPoint = endPoint.endsWith('/')? endPoint: (endPoint + '/');
    this.on = events.on;
    this.unbind = events.unbind;
    this.emit = events.emit;
    this.once = events.once;
    this.cachedStatus = {};
    this.isConnected = false;
    this.isLoggedIn = false;
    // registering update status
    var ths = this;
};

reWheelConnection.prototype.$post = function(url, data,callBack){
    /**
     * AJAX call for fetch all data from server
     * @param url: last url part for ajax call
     * @param data: data object to be sent
     * @param callBack: function(xhr) will be called when data arrives
     * @returns Promise<xhr> same of callBack
     */
    // initialization
    var ths = this;
    var promise = new Promise(function(accept,reject){
        utils.xdr(ths.endPoint + url, data, ths.cachedStatus.application, ths.cachedStatus.token)
            .then(function(xhr){
                ths.emit('http-response', xhr.responseText, xhr.status, url, data);
                ths.emit('http-response-' + xhr.status, xhr.responseText, url, data);
                if (xhr.responseData){
                    ths.emit('http-response-' + xhr.status + '-json', xhr.responseData, url, data);
                }
                if (callBack) { callBack( xhr.responseData || xhr.responseText )};
                accept(xhr.responseData || xhr.responseText);
            }, function(xhr) {
                if (xhr.responseData){
                    ths.emit('error-json', xhr.responseData, xhr.status, url, data, xhr);
                    ths.emit('error-json-' + xhr.status, xhr.responseData,url, data, xhr);
                } else {                
                    ths.emit('error-http',xhr.responseText, xhr.status,url,data,xhr);
                    ths.emit('error-http-' + xhr.status, xhr.responseText,url,data,xhr);
                }
                reject(xhr.responseData || xhr.responseText);
            });
        });
    return promise;
};

/**
 * Check current status and callback for results.
 * It caches results for further.
 * @param callback: (status object)
 * @param force: boolean if true empties cache  
 * @return void
 */
reWheelConnection.prototype.status = function(callBack, force) {
    // if force, clear all cached values
    var key = 'token:' + this.endPoint;
    var ths = this;
    if (force) {
        this.cachedStatus = {};
        delete localStorage[key];
    }
    if (this.statusWaiting) {
        // wait for status
        utils.waitFor(function() {
            return !ths.statusWaiting;
        }, function(){
            ths.status(callBack,force);
        });
        return;
    }
    // try for value resolution
    // first on memory
    if (Lazy(this.cachedStatus).size()){
        callBack(this.cachedStatus)
    // then in localStorage
    } else {
        var data = {};
        if (key in localStorage) {
            data.__token__ = localStorage[key];
        }
        this.statusWaiting = true;
        this.$post('api/status',data, function(status){
            ths.updateStatus(status);
            localStorage[key] = status.token;
            callBack(status);
            ths.statusWaiting = false;
        });
        // doesn't call callback
        return
    }
    callBack(this.cachedStatus);
};

reWheelConnection.prototype.updateStatus = function(status){
    var lastBuild = parseFloat(localStorage.lastBuild) || 1;
    if (lastBuild < status.last_build){
        utils.cleanDescription();
        localStorage.lastBuild = status.last_build;
    }
    this.isConnected = Boolean(status.token);
    this.isLoggedIn = Boolean(status.user_id);
    var oldStatus = this.cachedStatus;
    this.cachedStatus = status;
    if (!oldStatus.user_id && status.user_id){
        this.emit('logged-in',status.user_id);
    } else if (oldStatus.user_id && !status.user_id){
        this.emit('logged-out');
    } else if (this.isConnected && !this.isLoggedIn){
        this.emit('login-required');
        if (this.getLogin){
            var loginInfo = this.getLogin();
            if (loginInfo.constructor === Object){
                this.login(loginInfo.username, loginInfo.password, loginInfo.callBack);
            } else if (loginInfo.constructor === Promise) {
                loginInfo.then(function(obj){
                    this.login(obj.username, obj.password, obj.callBack);
                })
            }
        }
    }
    // realtime connection is setted
    if (!oldStatus.realtimeEndPoint && status.realtimeEndPoint) {
        this.wsConnection = new RealtimeConnection(status.realtimeEndPoint, this);
    // realtime connection is closed
    } else if (oldStatus.realtimeEndPoint && !status.realtimeEndPoint) {
        this.wsConnection.close();
        delete this.wsConnection;
    }
    this.emit('update-connection-status', status, oldStatus);
    localStorage[STATUSKEY] = JSON.stringify(status);
}

reWheelConnection.prototype.login = function(username, password){
    /**
     * make login and return a promise. If login succed, promise will be accepted
     * If login fails promise will be rejected with error
     * @param username: username
     * @param password: password
     * @return Promise (user object)
     */
    var ths = this;
    return new Promise(function(accept, reject){
        utils.xdr(ths.endPoint + 'api/login', {username: username || '', password: password || ''},null,ths.cachedStatus.token, true)
            .then(function(xhr){
                // update status
                ths.updateStatus(xhr.responseData);
                // call with user id
                accept({status : 'success', userid: ths.cachedStatus.user_id});
            }, function(xhr) {
                // if error call error manager with error
                accept({error: xhr.responseData.error, status: 'error'});
            });
    });
};

reWheelConnection.prototype.logout = function() {
    var ths = this;
    return new Promise(function(accept,reject) {
        ths.$post('api/logout')
            .then(function(ok){
                ths.updateStatus({});
                delete localStorage[STATUSKEY];
                accept()
            }, reject);
    });
};

reWheelConnection.prototype.connect = function(callBack) {
    if (this.isLoggedIn) {
        callBack(this.cachedStatus.user_id);
    } else {
        // wait for login
        this.once('logged-in',function(user_id){
            callBack(user_id);
        });
        this.status(callBack || utils.noop);
    }
}

utils.reWheelConnection = reWheelConnection;
'use strict';

function Toucher(){
    var touched = false
    this.touch = function(){
        touched = true;
    };
    this.touched = function(){
        var t = touched;
        touched = false;
        return t;
    }
}

'use strict';


function VacuumCacher(touch, asked, name, pkIndex){
/*
    if (name){
        console.info('created VacuumCacher as ' + name);
    }
*/
    if (!asked){
        var asked = [];
    }
    var missing = [];
    
    this.ask = function (id,lazy){
        if (pkIndex && (id in pkIndex.source)) {
            return;
        }
        if (!Lazy(asked).contains(id)){
//            console.info('asking (' + id + ') from ' + name);
            missing.push(id);
            if (!lazy)
                asked.push(id);
            touch.touch();
        } 
//        else console.warn('(' + id + ') was just asked on ' + name);
    };

    this.getAskedIndex = function(){
        return asked;
    }

    this.missings = function(){
        return Lazy(missing.splice(0,missing.length)).unique().toArray();
    }
}

function AutoLinker(actives, IDB, W2PRESOURCE, listCache){
    var touch = new Toucher();
    var mainIndex = {};
    var foreignKeys = {};
    var m2m = {};
    var m2mIndex = {};
    var permissions = {};
    this.mainIndex = mainIndex;
    this.foreignKeys = foreignKeys;
    this.m2m = m2m;
    this.m2mIndex = m2mIndex;
    this.permissions = permissions;

    W2PRESOURCE.on('model-definition',function(model, index){
        // defining all indexes for primary key
        var pkIndex = listCache.getIndexFor(model.name, 'id');
        mainIndex[model.name] = new VacuumCacher(touch, pkIndex, 'mainIndex.' + model.name, index);
        
        // creating permission indexes
        permissions[model.name] = new VacuumCacher(touch,null, 'permissions.' + model.name);

        // creating indexes for foreign keys
        Lazy(model.references).each(function(reference){
            var indexName = model.name + '_' + reference.id;
            foreignKeys[indexName] = new VacuumCacher(touch, listCache.getIndexFor(reference.to, 'id'), reference.to + '.id foreignKeys.' + indexName);
        });
        // creating reverse foreign keys
        Lazy(model.referencedBy).each(function(field){
            var indexName = field.by + '.' + field.id;
            foreignKeys[indexName] = new VacuumCacher(touch, listCache.getIndexFor(field.by,field.id), field.by + '.' + field.id + ' foreignKeys.' + indexName);
        });
        Lazy(model.manyToMany).each(function(relation){
            if (!(relation.indexName in m2m))
                m2m[relation.indexName] = [new VacuumCacher(touch,null,'m2m.' + relation.indexName + '[0]'), new VacuumCacher(touch,null,'m2m.' + relation.indexName+'[1]')];
            if (!(relation.indexName in m2mIndex))
                m2mIndex[relation.indexName] = new ManyToManyRelation(relation,m2m[relation.indexName]);
        });
    });
    var m2mGet = function(indexName, n, collection, callBack){
        W2PRESOURCE.$post((n ? utils.reverse('/', indexName) : indexName) + 's' + '/list', {collection: collection}, function(data){
            W2PRESOURCE.gotData(data, callBack);
            delete actives[indexName]
        });        
    };

    var getM2M = function(indexName, collection, n, callBack){
        // ask all items in collection to m2m index
        Lazy(collection).each(m2m[indexName][n].ask.bind(m2m[indexName][n]));
        // renewing collection without asked
        collection = m2m[indexName][n].missings();
        // calling remote for m2m collection if any
        if (collection.length){
            actives[indexName] = 1;
            m2mGet(indexName, n, collection, callBack);
        } else {
            callBack && callBack();
        }
    };
    this.getM2M = getM2M;

    var linkUnlinked = function(){
        // perform a DataBase synchronization with server looking for unknown data
        if (!touch.touched()) return;
        if (Lazy(actives).values().sum()) {
            touch.touch();
            return;
        }
        var changed = false;
        Lazy(m2m).each(function(indexes, indexName){
            Lazy(indexes).each(function (index,n) {
                var collection = index.missings();
                collection = Lazy(collection).filter(Boolean).map(function (x) {
                    return parseInt(x)
                }).toArray();
                if (collection.length){
                    var INDEX = m2mIndex[indexName];
                    var getter = INDEX['get' + (1 - n)].bind(INDEX);
                    changed = true;
                    m2mGet(indexName, n, collection, function(data){
                        var ids = collection.map(getter);
                        if (ids.length){
                            var otherIndex = indexName.split('/')[1 - n];
                            W2PRESOURCE.describe(otherIndex,function(){
//                                Lazy(ids).flatten().unique().each(mainIndex[otherIndex].ask);
                                Lazy(ids).flatten().unique().each(function(x){
                                    mainIndex[otherIndex].ask(x,true);
                                });
                            });
                        }
                    });
                }
            });
        });
        Lazy(mainIndex).each(function (index, modelName) {
            var ids = index.missings();
            if (ids.length) {
                changed = true;
                var idb = modelName in IDB ? IDB[modelName].keys() : Lazy();
                //log('linking.' + modelName + ' = ' + W2PRESOURCE.linking.source[modelName]);
                W2PRESOURCE.fetch(modelName, {id: ids},null,utils.noop);
            }
        });
        // Foreign keys
        Lazy(foreignKeys)
        .map(function(v,k){
            return [k, v.missings()]
        }).filter(function(v){
            return v[1].length
        }).each(function (x) {
            changed = true;
            var ids = x[1];
            var indexName = x[0];
            var index = indexName.split('.');
            var mainResource = index[0];
            var fieldName = index[1];
            var filter = {};
            filter[fieldName] = ids;
            W2PRESOURCE.fetch(mainResource, filter);
        });
        
        Lazy(Lazy(permissions).map(function(v,k){
            return [k, v.missings()]
        }).filter(function (v) {
            return v[1].length
        }).toObject()).each(function (ids, resourceName) {
            changed = true;
            if (ids.length){
                actives[resourceName] = 1;
                W2PRESOURCE.$post(resourceName + '/my_perms', {ids: Lazy(ids).unique().toArray()}, function (data) {
                    W2PRESOURCE.gotPermissions(data.PERMISSIONS);
                    delete actives[resourceName]
                });
            }
        });
    }
    setInterval(linkUnlinked,50);
};



"use strict";

function ListCacher(){
    var gotAll = {};
    var asked = {}; // map of array
    var compositeAsked = {};
    var cartesianProduct1 = function(x,y,isArray){
        var ret = [];
        if (isArray) {
            for (var a in x){
                for (var b in y){
                    ret.push(Lazy([x[a],y[b]]).flatten().toArray());
                }
            }
        } else {
            for (var a in x){
                for (var b in y){
                    ret.push([x[a],y[b]]);
                }
            }
        }
        return ret;
    };
    var cartesianProduct = function(arr){
        var isArray = false;
        var ret = arr[0]; 
        for (var x = 1; x < arr.length; ++x){
            ret = cartesianProduct1(ret, arr[x], isArray);
            isArray = true;
        }
        return ret;
    }
    var explodeFilter = function(filter) {
        var product = cartesianProduct(Lazy(filter).values().toArray());
        var keys = Lazy(filter).keys().toArray();
        return product.map(function(x){
            var r = {};
            keys.forEach(function(a,n){
                r[a] = x[n];
            })
            return r;
        });
        
    };
    var filterSingle = function(model, filter, testOnly){
        // Lazy auto create indexes
        var modelName = model.modelName;
        var getIndexFor = this.getIndexFor;
        var keys = Lazy(filter).map(function(v,key){ return [key, modelName + '.' + key]; }).toObject();
        var indexes = Lazy(filter).keys().map(function(key){ return [key, getIndexFor(modelName, key)]}).toObject(); 
        // fake for (it will cycle once)
        for (var x in filter){
            // get asked index and check presence
            var difference = Lazy(filter[x]).difference(indexes[x]).toArray();
            if (difference.length){
                // generate new filter
                var ret = Lazy([[x, difference]]).toObject();
                // remember asked
                if (!testOnly)
                    Array.prototype.push.apply(indexes[x], difference);
//                console.log('single filter : ' + JSON.stringify(filter) + '\nOut :' + JSON.stringify(ret));
                return ret;
            } else {
//                console.log('single filter : ' + JSON.stringify(filter) + '\nOut : null');
                return null;
            }
        }
    };

    var cleanComposites = function(model,filter){
        /**
         * clean compositeAsked
         */
        // lazy create conditional asked index
        if (!(model.name in compositeAsked)) { compositeAsked[model.name] = [] };
        var index = compositeAsked[model.name];
        // search for all elements who have same partial
        var filterLen = Lazy(filter).size();
        var items = index.filter(utils.makeFilter(model, filter, ' && ',true)).filter(function(item){ Lazy(item).size() > filterLen });
//        console.log('deleting :' + JSON.stringify(items));
    };

    this.filter = function(model, filter){
//        console.log('------------------\nfilter : ' + JSON.stringify(filter));
        var modelName = model.modelName;

        // if you fetch all objects from server, this model has to be marked as got all;
        var filterLen  = Lazy(filter).size();
        switch (filterLen) {
            case 0 : {
                // return null or all
                var got = gotAll[modelName];
                gotAll[modelName] = true;
                if (modelName in asked){
                    delete asked[modelName];
                }
//                console.log('out : null (got all)');
                // conditional clean
                if (modelName in compositeAsked){ 
                    delete compositeAsked[modelName];
                }
                if (got)
                    return null;
                return {};
            }
            case 1 : {
                var ret = filterSingle.call(this, model, filter);
                cleanComposites.call(this, model, filter);
                return ret;
            }
        }
        var ths = this;
        var single = Lazy(filter).keys().some(function(key) {
            var f = {};
            f[key] = filter[key];
            return filterSingle.call(ths, model, f, true) == null;
        });
        if (single) { return null }
        // lazy create compositeAsked
        if (!(modelName in compositeAsked)){ compositeAsked[modelName] = []; }
        // explode filter
        var exploded = explodeFilter(filter);
        // collect partials
        var partials = compositeAsked[modelName].filter(utils.makeFilter(model, filter, ' || ',true));
        // collect missings (exploded - partials)
        if (partials.length){
            var bad  = [];
            // partial difference
            for (var x in partials){
                bad.push.apply(bad,exploded.filter(utils.makeFilter(model, partials[x],' && ', true)));
            }
//            console.log('exploded - partial : ' + JSON.stringify(bad));
            var missings = Lazy(exploded).difference(bad).toArray();
        } else {
            var missings = exploded;
        }

        // filter partials
        if (missings.length){
            compositeAsked[modelName].push.apply(compositeAsked[modelName],missings);
            // aggregate missings
            var missings = Lazy(filter).keys().map(function(key){
                var ret = Lazy(missings).pluck(key).unique().toArray();
                return [key, ret.length?ret:filter[key]];
            }).toObject();
//            console.log('out : ' + JSON.stringify(missings));
            // clean conditional
            cleanComposites(model, missings);
            return missings;
        }
        return null;
    };

    this.getIndexFor = function(modelName, fieldName){
        var indexName = modelName + '.' + fieldName;
        if (!(indexName in asked)){
            asked[indexName] = [];
        }
        return asked[indexName];
    }
};
'use strict';

function ManyToManyRelation(relation,m2m){
    var items = [];
    this.add = items.push.bind(items);
    this.add = function(item){
  //      console.log('adding ' + item);
        if (!(Lazy(items).find(item))){
            items.push(item);
        }
    }

    this.get0 = function(id){
        m2m[1].ask(id);
        return Lazy(items).filter(function(x){
            return x[0] === id;
        }).pluck("1").toArray();
    };

    this.get1 = function(id){
        m2m[0].ask(id);
        return Lazy(items).filter(function(x){
            return x[1] === id;
        }).pluck("0").toArray();
    };
    this['get' + utils.capitalize(relation.indexName.split('/')[1])] = this.get1;
    this['get' + utils.capitalize(relation.indexName.split('/')[0])] = this.get0;

    this.del = function(item){
        var l = items.length;
        var idx = null;
        for (var a = 0; a < l; a++){ 
            if ((items[a][0] === item[0]) && (items[a][1] === item[1])){
                idx = a;
                break;
            }
        }
        if (idx){
            items.splice(a, 1);
        }
        console.log('deleting ', item);
    };
}
'use strict';

function cachedPropertyByEvents(proto, propertyName,getter, setter){
    var events = Array.prototype.slice.call(arguments,4);
    var result = {};
    
    Lazy(events).each(function(event){
        proto.orm.on(event,function(){
            result = {};
        });
    });
    var propertyDef = {
        get: function cached(){
            if (!(this.id in result)){
                result[this.id] = getter.call(this);
            }
            return result[this.id];
        }
    };
    if (setter){
        propertyDef['set'] = function(value){
            if (value !== result[this.id]){
                setter.call(this,value);
                if (this.id in result){
                    delete result[this.id];
                }
            }
        }
    }
    Object.defineProperty(proto, propertyName,propertyDef);
}

'use strict';

function ValidationError(data){
    this.resource = data._resource;
    this.formIdx = data.formIdx;
    this.fields = data.errors;
}
var baseORM = function(options, extORM){
    
    // creating rewheel connection
    if (options.constructor === String){
        var connection = new reWheelConnection(options);
    } else if (options.constructor === utils.reWheelConnection){
        var connection = options;
    }
    this.connection = connection;
    connection.on('connected', function(){ 
        this.connected = true;
    });
    this.on = connection.on;
    this.emit = connection.emit;
    this.unbind = connection.unbind;
    this.once = connection.once;
    this.$post = connection.$post.bind(connection);

    // handling websocket events
    this.on('ws-connected',function(ws){
        console.info('Websocket connected');
        // all json data has to be parsed by gotData
        ws.onMessageJson(W2PRESOURCE.gotData.bind(W2PRESOURCE));
        //
        ws.onMessageText(function(message){
            console.info('WS message : ' + message)
        });
    });
    this.on('ws-disconnected', function(ws){
        console.error('Websocket disconnected')
    });
    this.on('error-json-404',function(error,url, sentData, xhr){ 
        console.error('JSON error ', JSON.stringify(error));
        delete waitingConnections[url.split('/')[0]];
    });
    this.on('realtime-message-json', function(message){
        W2PRESOURCE.gotData(message);
    });

    // initialization
    var W2PRESOURCE = this;
    var IDB = {auth_group : Lazy({})}; // tableName -> data as Array
    var IDX = {}; // tableName -> Lazy(indexBy('id')) -> IDB[data]
    var REVIDX = {}; // tableName -> fieldName -> Lazy.groupBy() -> IDB[DATA]
    var builderHandlers = {};
    var builderHandlerUsed = {};
    var persistentAttributes = {};
    var eventHandlers = {};
    var permissionWaiting = {};
    var modelCache = {};
    var failedModels = {};
    var waitingConnections = {} // actual connection who i'm waiting for
    var listCache = new ListCacher(Lazy);
    var linker = new AutoLinker(waitingConnections,IDB, this, listCache);
/*    window.ll = linker;
    window.lc = listCache;
*/
    this.validationEvent = this.on('error-json-513', function(data, url, sentData, xhr){
        if (currentContext.savingErrorHanlder){
            currentContext.savingErrorHanlder(new ValidationError(data));
        }
    })

    var getIndex = function (indexName) {
        if (indexName in IDB)
            return IDB[indexName];
        else {
            IDB[indexName] = Lazy({});
            return IDB[indexName];
        }
    };
    var getUnlinked = function (indexName) {
        if (indexName in UNLINKED)
            return UNLINKED[indexName];
        else {
            UNLINKED[indexName] = {};
            return UNLINKED[indexName];
        }
    };

    function PermissionTable(id, klass, permissions) {
        // create PermissionTable class
        this.klass = klass;
        this.permissions = [];
        this.id = id;
        for (var k in permissions) {
            this.push.apply(this, [k, permissions[k]]);
        }
    }
    PermissionTable.prototype.save = function (cb) {
        // save Object to server
        var data = {
            permissions: Lazy(this.permissions).map(function (x) {
                return [x[0].id, x[1]]
            }).toObject()
        };
        data.id = this.id;
        var modelName = this.klass.modelName;
        W2PRESOURCE.$post(this.klass.modelName + '/set_permissions', data, function (myPerms, a, b, req) {
            cb(myPerms);
        });
    };
    PermissionTable.prototype.push = function (group_id, permissionList) {
        var p = Lazy(permissionList);
        var perms = Lazy(this.klass.allPermissions).map(function (x) {
            return [x, p.contains(x)]
        }).toObject();
        var l = Lazy(this.permissions).map(function (x) {
            return x[0].id
        });
        if (l.contains(group_id))
            this.permissions[l.indexOf(group_id)][1] = perms;
        else
            this.permissions.push([IDB.auth_group.get(group_id), perms]);
    };

    // creates dynamical models
    var makeModelClass = function (model) {
        var _model = model;
        model.fields.id.readable = false;
        model.fields.id.writable = false;
        var fields = Lazy(model.fields);
        if (model.privateArgs) {
            fields = fields.merge(model.privateArgs);
        }
        W2PRESOURCE.emit('model-definition', model, getIndex(model.name));
        // getting fields of type date and datetime
/*
        var DATEFIELDS = fields.filter(function (x) {
            return (x.type == 'date') || (x.type == 'datetime')
        }).map(function (x, v) {
            return [v, true]
        }).toObject();

        // getting boolean fields
        var BOOLFIELDS = fields.filter(function (x) {
            return (x.type == 'boolean')
        }).map(function (x, v) {
            return [v, true]
        }).toObject();

        // booleans and datetimes storage external 
        MODEL_DATEFIELDS[model.name] = DATEFIELDS;
        MODEL_BOOLFIELDS[model.name] = BOOLFIELDS;
*/
        // initialization
        var funcString = "if (!row) { row = {}};\n";
        funcString += model.references.map(function(field){
            return 'this._' + field.id + ' = row.' + field.id + ';';
        }).join(';\n');
        
        // datefield conversion
        funcString += fields.map(function (x,k) {
            if ((x.type == 'date') || (x.type == 'datetime')){
                return 'this.' + k + ' = row.' + k + '?new Date(row.' + k + ' * 1000 - ' + utils.tzOffset + '):null;\n'; 
            } else if (x.type == 'boolean') {
                return 'this.' + k + ' = (row.' + k + ' === "T") || (row.' + k + ' === true);\n';
            } else {
                return 'this.' + k + ' = row.' + k + ';\n';
            }
        }).toString('\n'); + '\n';

        funcString += "if (permissions) {this._permissions = permissions && Lazy(permissions).map(function (x) { return [x, true] }).toObject();}"

        
        // master class function
        var Klass = new Function('row', 'permissions',funcString)

        Klass.prototype.orm = extORM;
        Klass.ref_translations = {};
        Klass.modelName = model.name;
        Klass.references = Lazy(model.references).pluck('id').toArray();

        Klass.inverse_references = model.referencedBy.map(function (x) {
            // managing references where 
            return x.by + '_' + x.id + '_set'
        });
        Klass.referents = model.referencedBy.map(function (x) {
            return [x.by, x.id]
        });
        Klass.fieldsOrder = model.fieldOrder;
        Klass.allPermissions = model.permissions;

        // redefining toString method
        if (Lazy(model.representation).size()){
            Klass.prototype.toString = new Function('return this.' + Lazy(model.representation).toString(' + " " + this.'));
        }
        Klass.prototype.toUpperCase = function () {
            // redefine to UpperCase
            return this.toString().toUpperCase();
        };
      
        Klass.prototype.toLowerCase = function () {
            return this.toString().toLowerCase();
        };
        
        Klass.prototype.delete = function () {
            // delete instance from server
            return extORM.delete(this.constructor.modelName, [this.id]);
        };

        // permission getter property
        Object.defineProperty(Klass.prototype, 'permissions', {
            get: function () {
                if (this._permissions)
                    return this._permissions;
                else {
                    linker.permissions[this.constructor.modelName].ask(this.id);
                }
            }
        });
        // getting full permission table for an object
        Klass.prototype.all_perms = function (cb) {
            var object_id = this.id;
            W2PRESOURCE.$post(this.constructor.modelName + '/all_perms', {id: this.id}, function (data) {
                var permissions = data;
                var grouped = {};
                var unknown_groups = Lazy(permissions).pluck('group_id').unique().map(function (x) {
                    return '' + x
                }).difference(IDB.auth_group.keys()).toArray();
                Lazy(permissions).groupBy(function (x) {
                    return x.group_id
                }).each(function (v, k) {
                    grouped[k] = Lazy(v).pluck('name').toArray()
                });
                var call = function (x) {
                    cb(new PermissionTable(object_id, Klass, grouped));
                };
                if (unknown_groups.length)
                    W2PRESOURCE.get('auth_group',unknown_groups,call);
                else
                    call();
            });
        };

        Klass.prototype.save = function (args) {
            var o = this.asRaw();
            var fields = Klass.fields;
            var ID = this.id;
            var modelName = this.constructor.modelName;
            if (args) {
                for (var arg in args) {
                    o[arg] = args[arg];
                }
            }
            // eliminate unwritables
            Lazy(Klass.fieldsOrder).filter(function(x){
                return !fields[x].writable;
            }).each(function(fieldName){
                if (fieldName in o) {
                    delete o[fieldName];
                }
            });
            var promise = W2PRESOURCE.$post(modelName + (ID ? '/post' : '/put'), o);
            if (args && (args.constructor === Function)){
                // placing callback in a common place
                promise.context.savingErrorHanlder = args;
            }
            return promise
        };
        Klass.prototype.copy = function () {
            var obj = new this.constructor(this.asRaw());
            obj._permissions = this._permissions;
            return obj;
        };

        // building serialization function
        var asr = 'return {\n' + Lazy(model.references).map(function(field){
            return field.id + ' : this._' + field.id;
        }).concat(fields.map(function (x,k) {
            if ((x.type == 'date') || (x.type == 'datetime')){
                return k + ' : (this.' + k + '?(Math.round(this.' + k + '.getTime() - this.' + k + '.getTimezoneOffset() * 60000) / 1000):null)'; 
            } else if (x.type == 'boolean') {
                return k + ' : this.' + k + '?"T":"F"';
            } else {
                return k + ' : this.' + k;
            }
        })).toString(',\n') + '};';
        Klass.prototype.asRaw = new Function(asr);

        Klass.saveMulti = function (objects, cb, scope) {
            var raw = [];
            var deletable = Lazy(Klass.fields)
                .filter(function (x) {
                    return !x.writable
                })
                .pluck('id')
                .toArray();
            Lazy(objects)
                .map(function (x) {
                    return x.asRaw()
                })
                .each(function (x) {
                    Lazy(deletable).each(function (y) {
                        delete x[y];
                    });
                    raw.push(x);
                });
            W2PRESOURCE.$post(Klass.modelName, 'put', {multiple: raw, formIdx : W2PRESOURCE.formIdx++}, function (elems) {
                W2PRESOURCE.gotData(elems);
                var tab = IDB[Klass.modelName];
                var objs = Lazy(elems[Klass.modelName].results).pluck('id').map(function (x) {
                    return tab.get(x)
                }).toArray();
                if (cb) {
                    cb(objs);
                }
            }, scope);
        };
        if ('extra_verbs' in model)
            Lazy(model.extra_verbs).each(function (x) {
                var funcName = x[0];
                var args = x[1];
                var ddata = 'data = {id : this.id';
                if (args.length)
                    ddata += ', ' + Lazy(args).map(function (x) {
                            return x + ' : ' + x;
                        }).join(',');
                ddata += '};';
                args.push('cb');
                Klass.prototype[funcName] = new Function(args, ddata + 'W2S.W2P_POST(this.constructor.modelName,"' + funcName + '", data,function(data,status,headers,x){' +
                    'try{\n' +
                    '   if (!headers("nomodel")) {window.W2S.gotData(data,cb);}\n' +
                    '   else {if (cb) {cb(data)}}\n' +
                    '} catch(e){\n' +
                    'if (cb) {cb(data);}\n' +
                    '}\n' +
                    '});\n'
                );
            });
        if ('privateArgs' in model) {
            Klass.privateArgs = Lazy(model.privateArgs).keys().map(function (x) {
                return [x, true];
            }).toObject();
            Klass.prototype.savePA = function (o) {
                var T = this;
                var oo = {id: this.id};
                var PA = this.constructor.privateArgs;
                var Fs = this.constructor.fields;
                var t = new this.constructor(o).asRaw();
                var fieldIdx = Lazy(PA).keys().map(function (x) {
                    return [x, Fs[x]]
                }).toObject();
                Lazy(o).each(function (v, k) {
                    if ((k in PA) && fieldIdx[k].writable) {
                        oo[k] = v;
                    }
                });
                W2PRESOURCE.$post(this.constructor.modelName + '/savePA', oo, function () {
                    Lazy(oo).each(function (v, k) {
                        T[k] = v;
                    });
                });
            };
        }

        modelCache[Klass.modelName] = Klass;
        // adding id to fields
        for (var f in model.fields) {
            model.fields[f].id = f;
        }
        Klass.fields = Lazy(model.fields).concat(Lazy(model.privateArgs)).concat(Lazy(model.references).tap(function (x) {
            x.type = x.type || 'reference'
        })).indexBy('id').toObject();
        // setting widgets for fields
        Lazy(Klass.fields).each(function(field){
            if (!field.widget){
                if (field.type === 'reference'){
                    field.widget = 'choices'
                } else {
                    field.widget = field.type;
                }
            }
        });
        // building references to (many to one) fields
        Lazy(model.references).each(function (ref) {
            var ext_ref = ref.to;
            var local_ref = '_' + ref.id;
            cachedPropertyByEvents(Klass.prototype, ref.id,function () {
                if (!(ext_ref in IDB)){
                    var ths = this;
                    W2PRESOURCE.describe(ext_ref,function(x){
                        linker.mainIndex[ext_ref].ask(ths[local_ref],true);
                    });
                }
                var result = (ext_ref in IDB) && this[local_ref] && IDB[ext_ref].get(this[local_ref]);
                if (!result && (ext_ref in linker.mainIndex)) {
                    // asking to linker
                    linker.mainIndex[ext_ref].ask(this[local_ref],true);
                    return utils.mock();
                }
                return result;
            }, function (value) {
                if (value) {
                    if (value.constructor.modelName != ext_ref) {
                        throw new TypeError('You can assign only ' + ext_ref + ' to ' + ref.id);
                    }
                }
                this[local_ref] = value.id;
            }, 'new-' + ext_ref, 'deleted-' + ext_ref,'updated-' + ext_ref, 'new-model-' + ext_ref);


            Klass.prototype['get' + utils.capitalize(ref.id)] = function () {
                return extORM.get(ext_ref,this[local_ref]);
            };
        });

        //building references to (one to many) fields
        Lazy(model.referencedBy).each(function (ref) {
            var indexName = ref.by + '.' + ref.id;
            var propertyName = ref.by + '_' + utils.pluralize(ref.id);
            var revIndex = ref.by;
            if (Klass.prototype.hasOwnProperty(propertyName)) {
                console.error('Tryed to redefine property ' + propertyName + 's' + ' for ' + Klass.modelName);
            } else {
                cachedPropertyByEvents(Klass.prototype, propertyName, function () {
                    var ret = (revIndex in IDB) ? REVIDX[indexName].get(this.id + ''):null;
                    linker.foreignKeys[indexName].ask(this.id,true);
                    return ret;
                }, null, 'new-' + revIndex, 'updated-' + revIndex, 'deleted-' + revIndex);
            }
            Klass.prototype['get' + utils.capitalize(utils.pluralize(ref.by))] = function () {
                var opts = {};
                opts[ref.id] = [this.id];
                return extORM.query(ref.by,opts);
            };
        });

        //building reference to (many to many) fields
        if (model.manyToMany) {
            Lazy(model.manyToMany).each(function (ref) {
                var indexName = ref.indexName;
                var first = ref.first? 0 : 1;
                var omodelName = ref.model;
//                var omodel = getIndex(omodelName);
                var getter = linker.m2mIndex[indexName]['get' + (1 - first)];

                cachedPropertyByEvents(Klass.prototype, ref.model + 's', function () {
                        var ths = this;
                        var ret = [];
                        var ids = getter(ths.id);
                        var get = null;
                        if (ids.length){
                            //W2PRESOURCE.fetch(omodelName, {id : ids});
                            get = getIndex(omodelName).get.bind(IDB[omodelName])
                        }
                        if (ids && get)
                            ret = Lazy(ids).map(get).filter(utils.bool).toArray();
                        return ret;
                    }, null, 'received-m2m-' + indexName, 'received-' + omodelName);

                Klass.prototype['get' + utils.capitalize(utils.pluralize(omodelName))] = function () {
                    var ths = this;
                    return new Promise(function(accept, reject){
                        try {
                            linker.getM2M(indexName, [ths.id], first,function(data){
                                var ids = getter(ths.id);
                                if (ids.length){
                                    W2PRESOURCE.fetch(omodelName, {id : ids},null,function(){
                                        var get = IDB[omodelName].get.bind(IDB[omodelName]);
                                        accept(Lazy(ids).map(get).filter(utils.bool).toArray());
                                    });
                                } else {
                                    accept([]);
                                }
                            });
                        } catch (e) {
                            console.error(e);
                            reject(e);
                        }
                    })
                };


                Klass.fields[utils.capitalize(omodelName)] = {
                    id: utils.capitalize(omodelName),
                    name: utils.capitalize(omodelName),
                    writable: true,
                    readable: true,
                    type: 'M2M',
                    validators: []
                };

            });
            
            Klass.prototype.unlinkReference = function (instance) {
                var multiple = false;
                var ID = this.id;
                var instances = [];
                if (instance.constructor.name == 'Array') {
                    multiple = true;
                    instances = instance;
                    instance = instances[0];
                }
                var omodel = instance.constructor.modelName;
                if (multiple) {
                    var collection = Lazy(instances).pluck('id').map(function (x) {
                        return [ID, x]
                    }).toArray();
                } else {
                    var collection = [[ID, instance.id]];
                }
                W2PRESOURCE.$post(Klass.modelName + '/' + omodel + 's/delete', {collection: collection});
            };

            Klass.prototype.linkReference = function (instance) {
                var multiple = false;
                var ID = this.id;
                var instances = [];
                if (instance.constructor.name == 'Array') {
                    multiple = true;
                    instances = instance;
                    instance = instances[0];
                }
                var omodel = instance.constructor.modelName;
                var indexName = Klass.modelName + '/' + omodel;
                if (multiple) {
                    var refs = [];
                    if (indexName in INDEX_M2M) {
                        refs = Lazy(instances).pluck('id').difference(Lazy(INDEX_M2M[indexName][0].get(this.id))).toArray();
                    }
                    indexName = omodel + '/' + Klass.modelName;
                    if (indexName in INDEX_M2M) {
                        refs = Lazy(instances).pluck('id').difference(Lazy(INDEX_M2M[indexName][0].get(this.id))).toArray();
                    }
                    if (refs.length) {
                        var collection = Lazy(refs).map(function (x) {
                            return [ID, x]
                        }).toArray();
                        W2P_POST(Klass.modelName, omodel + 's/put', {collection: collection}, function (data) {
                        });
                    }
                } else {
                    if ((indexName in linker.m2mIndex) && Lazy(linker.m2mIndex[indexName]['get' + utils.capitalize(omodel)](instance.id)).find(this)) {
                        return;
                    }
                    W2PRESOURCE.$post(Klass.modelName + '/' + omodel + 's/put', {collection: [[this.id, instance.id]]});
                }
            };
        }
        W2PRESOURCE.emit('new-model', Klass);
        W2PRESOURCE.emit('new-model-' + Klass.modelName);
        return Klass;
    };

    this.gotData = function (data, callBack) {
        // receive all data from every end point
        console.info('gotData');
        if (typeof(data) == 'string') {
            console.log('data ' + data + ' refused from gotData()');
            if (callBack) {
                return callBack(data);
            }
            return;
        }
        // clean data from relations and permissions for using it after model parsing
        if ('_extra' in data){ delete data._extra }
        var TOONE = data.TOONE;
        var TOMANY = data.TOMANY;
        var MANYTOMANY = data.MANYTOMANY;
        var PERMISSIONS = data.PERMISSIONS;
        var PA = data.PA;
        delete data.TOONE;
        delete data.TOMANY;
        delete data.MANYTOMANY;
        delete data.PERMISSIONS;
        delete data.PA;
        if (!PA) { PA = {}; }

        // cleaning from useless deleted data
        data = Lazy(data).filter(function (v, k) {
            return (!('deleted' in v) || ((k in modelCache)));
        }).toObject();
        
        if ('m2m' in data) {
            var m2m = data.m2m;
            delete data['m2m'];
        }
        Lazy(data).each(function (data, modelName) {
            W2PRESOURCE.describe(modelName, function (model) {
                var modelClass = model;
                if (data.results && (data.results.length > 0) && (data.results[0].constructor == Array)) {
                    data.results = Lazy(data.results).map(function(x){
                        return Lazy(modelClass.fieldsOrder).zip(x).toObject()
                    }).toArray();
                }
                var results = Lazy(data.results);
                var deleted = data.deleted;
                if (modelName in PA) {
                    var MPA = PA[modelName];
                    Lazy(results).each(function (record) {
                        if (record.id in MPA) {
                            Lazy(MPA[record.id]).each(function (v, k) {
                                record[k] = v;
                            });
                        }
                    })
                }

                // indexing references by its ID
                var itab = getIndex(modelName);
                var table = itab.source;

                // object deletion
                if (deleted){
                    deleted.forEach(function(x){
                        delete table[x];
                    })
                }
/*
                Lazy(deleted).each(function (x) {
                    delete table[x];
                });
*/
                var idx = results.indexBy('id');
                var ik = idx.keys();
                var nnew = ik.difference(itab.keys().map(function (x) {
                    return parseInt(x)
                }));
                var updated = ik.difference(nnew);
                // removing old identical values
                updated = updated.filter(function (x) {
                    return !utils.sameAs(idx.get(x), itab.get(x).asRaw());
                });
                // classify records
                var perms = data.permissions ? Lazy(data.permissions) : Lazy({});
                var newObjects = nnew.map(function (x) {
                    return new modelClass(idx.get(x), perms.get(x))
                });

                //// classifying updated
                //var updatedObjects = updated.map(function(x){return new modelClass(idx.get(x),perms.get(x))});
                //var uo = updatedObjects.toArray();
                //updatedObjects = Lazy(uo).map(function(x){return [x,table[x.id]]}).toArray();
                // Updating single objects
                var changed = [];
//                var DATEFIELDS = MODEL_DATEFIELDS[modelName];
//                var BOOLFIELDS = MODEL_BOOLFIELDS[modelName];
                updated.each(function (x) {
                    var oldItem = itab.get(x);
                    var oldCopy = oldItem.copy();
                    var newItem = new modelClass(idx.get(x));
                    Lazy(model.fields).keys().each(function(k){
                        oldItem[k] = newItem[k];
                    });
                    changed.push([oldItem, oldCopy]);
                });

                //// sending signal for updated values
                if (changed.length) {
                    W2PRESOURCE.emit('updated-' + modelName, changed);
                }
                //******** Update universe ********
                var no = newObjects.toArray();
                Lazy(no).each(function (x) {
                    table[x.id] = x
                });
                // rebulding reverse indexes
                Lazy(modelCache[modelName].references).each(function (ref) {
                    REVIDX[modelName + '.' + ref] = IDB[modelName].groupBy('_' + ref);
                });
                // sending events for new values
                if (no.length)
                    W2PRESOURCE.emit('new-' + modelName, Lazy(no), data.totalResults);
                if (deleted) {
                    W2PRESOURCE.emit('deleted-' + modelName, deleted);
                }
                // sending events for data arrived
                W2PRESOURCE.emit('received-' + modelName);
            });
        });
        if (TOONE) {
            console.error('TOONE');
            Lazy(TOONE).each(function (vals, modelName) {
                console.log(modelName);
                var udx = getUnlinked(modelName);
            });
        }
        if (TOMANY) {
            console.error('TOMANY');
            Lazy(TOMANY).each(function (vals, indexName) {
                if (!(indexName in ASKED_UNLINKED)) {
                    ASKED_UNLINKED[indexName] = Lazy([]);
                }
                Lazy(vals).each(function (id) {
                    ASKED_UNLINKED[indexName].source.push(id);
                });
            });
        }
        if (MANYTOMANY) {
            console.error('MANYTOMANY');
            Lazy(MANYTOMANY).each(function (vals, indexName) {
                var first = parseInt(indexName.split('|')[1]);
                indexName = indexName.split('|')[0];
                if (!(indexName in ASKED_M2M)) {
                    ASKED_M2M[indexName] = [{}, {}];
                }
                var MIDX = ASKED_M2M[indexName][first];
                Lazy(vals).each(function (x) {
                    MIDX[x + ''] = true;
                    MIDX[x] = true;
                });
            });
        }
        if (m2m) {
            W2PRESOURCE.gotM2M(m2m);
        }
        if (PERMISSIONS) {
            W2PRESOURCE.gotPermissions(PERMISSIONS);
        }

        if (callBack) {
            callBack(data);
        }
        W2PRESOURCE.emit('got-data');
    };
    this.gotPermissions = function (data) {
        Lazy(data).each(function (v, resourceName) {
            Lazy(v[0]).each(function (row, id) {
                if ((resourceName in IDB) && (id in IDB[resourceName].source)){
                    IDB[resourceName].get(id)._permissions = Lazy(row).map(function (x) {
                        return [x, true]
                    }).toObject();
                }
            });
            if (Lazy(v[0]).size()){
                W2PRESOURCE.emit('update-permissions-' + resourceName, Lazy(v[0]).keys().toArray());
            }
        });
        this.emit('update-permissions');
    };


    this.gotM2M = function(m2m){
        Lazy(m2m).each(function(data, indexName){
            var m2mIndex = linker.m2mIndex[indexName];
            Lazy(data).each(function(m){
                Lazy(m).each(function(data,verb){
                    m2mIndex[verb](data);
                });
            });
            W2PRESOURCE.emit('received-m2m');
            W2PRESOURCE.emit('received-m2m-' + indexName);
        });
    }

    this.fetch = function (modelName, filter, together, callBack) {  //
        // if a connection is currently running, wait for connection.
        if (modelName in waitingConnections){
            setTimeout(function(){
                W2PRESOURCE.fetch(modelName, filter, together, callBack);
            },500);
        } else {
            // fetching asynchromous model from server
            W2PRESOURCE.describe(modelName, (function(model){
                // if data cames from realtime connection
                if (W2PRESOURCE.connection.cachedStatus.realtimeEndPoint) {
                                        
                    // getting filter filtered by caching system
                    filter = listCache.filter(model,filter);

                    // if somthing is missing on my local DB 
                    if (filter){
                        // ask for missings and parse server response in order to enrich my local DB.
                        // placing lock for this model
                        waitingConnections[modelName] = true;
                        W2PRESOURCE.$post(modelName + '/list', {filter : filter})
                            .then(function(data){
                                W2PRESOURCE.gotData(data,callBack);

                                // release lock
                                delete waitingConnections[modelName];
                            }, function(ret){
                                // release lock
                                delete waitingConnections[modelName];
                            });
                    } else {
                        callBack && callBack();
                    }
                    return filter;
                } else {
                    this.$post(modelName + '/list', sendData,function (data) {
                            if (!filter) {
                                GOT_ALL.source.push(modelName);
                            }
                            W2PRESOURCE.gotData(data, callBack);
                        });
                }
            }).bind(this));
        }
    };

    this.get = function(modelName, ids, callBack){
        // search objects from IDB. If some id is missing, it resolve it by the server
        // if a request to the same model is pending, wait for its completion
        
        if (ids.constructor !== Array){
            ids = [ids];
        }
        // if some entity is missing 
        W2PRESOURCE.fetch(modelName , {id: ids}, null,function(){
            var ret = [];
            var itab = IDB[modelName]
            for (var id in ids){
                ret.push(itab.source[ids[id]]);
            }
            callBack(ret);
        });
    };

    this.gotModel = function (data) {
        for (var modelName in data) {
            var model = data[modelName];
            localStorage['description:' + modelName] = JSON.stringify(data);
            modelCache[modelName] = makeModelClass(model);
            if (!(modelName in IDB)) {
                IDB[modelName] = Lazy({});
            }
        }
    };

    this.describe = function(modelName, callBack){
        var ret = modelCache[modelName];
        if (ret) {
            callBack && callBack(ret);
        } else {
            if (!(modelName in waitingConnections)){
                if (modelName in failedModels){
                    return
                }
                var cacheKey = 'description:' + modelName;
                if (cacheKey in localStorage) {
                    this.gotModel(JSON.parse(localStorage[cacheKey]));
                    callBack && callBack(modelCache[modelName]);
                } else {
                    waitingConnections[modelName] = true;
                    this.$post(modelName + '/describe',null, function(data){
                        W2PRESOURCE.gotModel(data);
                        callBack && callBack(modelCache[modelName]);
                        delete waitingConnections[modelName];
                    }, function(data){
                        this.modelNotFound.handle(modelName);
                        failedModels[modelName] = true;
                    });
                }
            } else {
                // wait for connection
                setTimeout(function(){
                    W2PRESOURCE.describe(modelName, callBack);
                }, 500);
            }
        }        
    };
    this.addModelHandler = function (modelName, decorator) {
        var key = utils.hash(decorator);
        if (!(modelName in builderHandlers)) builderHandlers[modelName] = new Handler();
        if (!(modelName in builderHandlerUsed)) builderHandlerUsed[modelName] = {};
        if (key in builderHandlerUsed[modelName]){
            return;
        } else {
            builderHandlerUsed[modelName][key] = true;
        }
        if (modelName in modelCache) {
            decorator(modelCache[modelName]);
        } else {
            builderHandlers[modelName].addHandler(decorator);
        }
    };
    this.addPersistentAttributes = function(modelName, attributes){
        var addProperty = function(model, attributes) {
          attributes.forEach(function(val){
            var key = 'pA:' + model.modelName + ':' + val;
            var kattr = '__' + val;
            Object.defineProperty(model.prototype, val, {
              get: function(){
                if (!(kattr in this)){
                  var v = localStorage[key + this.id];
                  this[kattr] = v?JSON.parse(v):null;
                }
                return this[kattr];
              },
              set: function(value){
                this[kattr] = value;
                localStorage[key + this.id] = JSON.stringify(value);
              }
            });
          });
        };
        if (!(modelName in persistentAttributes)) { persistentAttributes[modelName] = []; }
        var attrs = persistentAttributes[modelName];
        if (attributes) {
            var newAttrs = Lazy(attributes).difference(attrs).toArray();
        } else {
            var newAttrs = attrs;
        }
        if (newAttrs.length){
            if (modelName in modelCache){
                addProperty(modelCache[modelName], newAttrs);
            }
            if (attributes){
                Array.prototype.push.apply(attrs,newAttrs);
            }
        }
    };
    this.on('new-model', function(model){
        if (model.modelName in builderHandlers){
            builderHandlers[model.modelName].handle(modelCache[model.modelName]);
        }
        if (model.modelName in persistentAttributes){
            W2PRESOURCE.addPersistentAttributes(model.modelName);
        }
    });

    this.query = function(modelName, filter, together, callBack){
        var ths = this;
        this.describe(modelName,function(model){
            // arrayfiy all filter values
            filter = Lazy(filter).map(function(v,k){ return [k,Array.isArray(v)?v:[v]]}).toObject();
            var filterFunction = utils.makeFilter(model, filter);
            var idx = getIndex(modelName);
            ths.fetch(modelName,filter,together, function(e){
                callBack(idx.filter(filterFunction).values().toArray());
            });
        })
    };
    this.delete = function(modelName, ids, callBack){
        return this.$post(modelName + '/delete', { id : ids}, callBack);
    };

    this.connect = function (callBack) {
        if (this.connection.isLoggedIn) {
            callBack();
        } else {
            this.connection.connect(callBack);
        }
    }
};

function reWheelORM(endPoint, loginFunc){
    this.$orm = new baseORM(new utils.reWheelConnection(endPoint, loginFunc),this);
    this.on = this.$orm.on.bind(this.$orm);
    this.emit = this.$orm.emit.bind(this.$orm);
    this.unbind = this.$orm.unbind.bind(this.$orm);
    this.once = this.$orm.once;
    this.addModelHandler = this.$orm.addModelHandler.bind(this.$orm);
    this.addPersistentAttributes = this.$orm.addPersistentAttributes.bind(this.$orm);
    this.utils = utils;
    this.logout = this.$orm.connection.logout.bind(this.$orm.connection);
}

reWheelORM.prototype.connect = function(){
    var connection = this.$orm.connection;
    return new Promise((function(callBack,reject){
        connection.connect(callBack);
    }));
}

reWheelORM.prototype.login = function(username, password) {
    return new Promise((function(accept,reject){
        this.$orm.connection.login(username, password, accept);    
    }).bind(this));
    
};

reWheelORM.prototype.logout = function(url){
    return this.$orm.connection.logout();
}

reWheelORM.prototype.getModel = function(modelName){
    var self = this;
    return new Promise(function(accept, reject){
        try {
            self.$orm.connect(function(){
                self.$orm.describe(modelName,accept);
            })
        } catch(e) {
            reject(e);
        }
    })
}

reWheelORM.prototype.get = function(modelName, ids){
    var self = this;
    var single = false;
    var modName = modelName;
    if (ids.constructor !== Array){
        single = true;
        ids = [ids]
    }
    return new Promise(function(accept, reject){
        try{
            self.$orm.connect(function(){
                if (single){
                    self.$orm.get(modName, ids, function(items){ 
                        accept(items[0]);}
                    );
                } else {
                    self.$orm.get(modName, ids, accept);
                }
            });
        } catch (e){
            reject(e);
        }
    });
};

reWheelORM.prototype.query = function (modelName, filter, related){
    var self = this;
    return new Promise(function(accept, reject){
        var together = null;
        if (related && (related.constructor === Array) && (related.length)){
            together = related;
        } else if (related && (related.constructor === String) && (related.length)){
            together = related.split(',');
        }
        try{
            self.$orm.connect(function(){
                self.$orm.query(modelName, filter, together, accept);
            });
        } catch (e){
            reject(e);
        }
    })
};

reWheelORM.prototype.delete = function (modelName, ids){
    var self = this;
    return new Promise(function(accept, reject){
        try{
            self.$orm.connect(function(){
                self.$orm.delete(modelName, ids, accept);
            });
        } catch (e){
            reject(e);
        }
    })
};

reWheelORM.prototype.getLoggedUser = function() {
    var self = this;
    if (this.$orm.connection.cachedStatus.user_id)
        return this.get('auth_user',this.$orm.connection.cachedStatus.user_id);
    else {
        return new Promise(function(accept, reject) {
            self.once('logged-in',function(user) {
                self.get('auth_user', user).then(accept);
            });
        });
    }
}

reWheelORM.prototype.$sendToEndpoint = function (url, data){
    return this.$orm.$post(url, data);
}

reWheelORM.prototype.login = function(username, password){
    return this.$orm.connection.login(username,password);
}

var Lazy = require('lazy.js');
var request = require('request');
var sockjs = require('sockjs');
var SockJS = sockjs.listen;
var localStorage = {};

exports = module.exports = reWheelORM;
exports.utils = utils;
exports.classes = {
    ListCacher : ListCacher,
    NamedHandler : NamedEventManager,
    ManyToManyRelation : ManyToManyRelation,
    AutoLinker : AutoLinker
}

utils.xdr = function (url, data, application,token,form){
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
};