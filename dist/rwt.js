(function (root, Lazy, SockJS) {
    'use strict';
    var isNode = false;
    'use strict';
    function Handler() {
        this.handlers = [];
        this.strHandlers = {};
    }
    ;
    Handler.prototype.addHandler = function (handler) {
        var strHandler = utils.hash(handler.toString());
        if (!(strHandler in this.strHandlers)) {
            this.strHandlers[strHandler] = handler;
            this.handlers.push(handler);
        }
    };
    Handler.prototype.handle = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        this.handlers.forEach(function (func) {
            func.apply(null, args);
        });
    };
    Handler.prototype.handleBy = function () {
        var args = Array.prototype.slice.call(arguments, 1);
        var ths = arguments[0];
        this.handlers.forEach(function (func) {
            func.apply(ths, args);
        });
    };
    function NamedEventManager() {
        var events = {};
        var handlerId = {};
        var idxId = 0;
        this.on = function (name, func) {
            if (!(name in events)) {
                events[name] = new Array();
            }
            var id = idxId++;
            events[name].push(func);
            handlerId[id] = func;
            return id;
        };
        this.emit = function (name) {
            if (name in events) {
                var args = Array.prototype.slice.call(arguments, 1);
                events[name].forEach(function (event) {
                    event.apply(null, args);
                });
            }
        };
        this.unbind = function (handler) {
            var count = 0;
            if (handler in handlerId) {
                var func = handlerId[handler + ''];
                Lazy(events).each(function (v, k) {
                    var idx = [];
                    for (var n in v) {
                        if (v[n] === func) {
                            idx.push(n);
                            count++;
                        }
                    }
                    idx.reverse().forEach(function (x) {
                        v.splice(x, 1);
                    });
                });
            }
            delete handlerId[handler];
            return count;
        };
        /**
     * Call event once
     */
        this.once = function (eventName, handlerFunction) {
            var self = this;
            var handler = this.on(eventName, function () {
                handlerFunction.apply(this, arguments);
                self.unbind(handler);
            });
        };
    }
    'use strict';
    var cachedKeyIdx = 0;
    var nullString = function () {
        return '';
    };
    function mockObject() {
        return new Proxy({}, {
            get: function (target, name) {
                if (typeof name === 'string') {
                    if (name === 'toString') {
                        return nullString;
                    } else {
                        return mockObject();
                    }
                } else {
                    return target[name];
                }
            }
        });
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
        renameFunction: function (name, fn) {
            return new Function('return function (call) { return function ' + name + ' () { return call(this, arguments) }; };')()(Function.apply.bind(fn));
        },
        cached: function (func, key) {
            if (!key) {
                key = '_' + cachedKeyIdx++;
            }
            function wrapper() {
                if (!this[key]) {
                    this[key] = func.call(this, [arguments]);
                }
                return this[key];
            }
            ;
            return wrapper;
        },
        //    $POST : $POST,
        //    reWheelConnection: reWheelConnection,
        log: function () {
            console.log(arguments);
        },
        xdr: function (url, data, application, token, formEncode) {
            /**
         * Make an HTTP Request and return its promise.
         */
            return new Promise(function (accept, reject) {
                var req;
                if (!data) {
                    data = {};
                }
                if (XMLHttpRequest) {
                    req = new XMLHttpRequest();
                    req.onreadystatechange = function () {
                        if (req.readyState === 4) {
                            try {
                                var responseData = JSON.parse(req.responseText);
                            } catch (a) {
                                var responseData = null;
                            }
                            var response = {
                                responseData: responseData,
                                responseText: req.responseText,
                                status: req.status,
                                request: req
                            };
                            if (req.status >= 200 && req.status < 400) {
                                accept(response);
                            } else {
                                reject(response);
                            }
                        }
                    };
                } else if (XDomainRequest) {
                    req = new XDomainRequest();
                    req.onload = function () {
                        accept(req.responseText, req.statusText, req);
                    };
                } else {
                    reject(new Error('CORS not supported'));
                }
                req.open('POST', url, true);
                req.onerror = reject;
                req.setRequestHeader('Accept', 'application/json');
                if (token) {
                    data.__token__ = token;
                }
                if (!formEncode) {
                    req.setRequestHeader('Content-Type', 'text/plain');
                    data = Lazy(data).size() ? JSON.stringify(data) : '';
                } else {
                    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                    data = Lazy(data).map(function (v, k) {
                        return k + '=' + encodeURI(v.toString());
                    }).toArray().join('&');
                }
                req.send(data);    //        req.send(null);
            });
        },
        capitalize: function (s) {
            return s[0].toUpperCase() + s.slice(1).toLowerCase();
        },
        hash: function (str) {
            /**
         * Hashed function
         */
            str = str.toString();
            var ret = 1;
            for (var x = 0; x < str.length; x++) {
                ret *= 1 + str.charCodeAt(x);
            }
            return (ret % 34958374957).toString();
        },
        makeFilter: function (model, filter, unifier, dontTranslateFilter) {
            /**
         * Make filter for Array.filter function as an and of or
         */
            if (!unifier) {
                unifier = ' && ';
            }
            if (Lazy(filter).size() === 0) {
                return function (x) {
                    return true;
                };
            }
            var source = Lazy(filter).map(function (vals, field) {
                if (!vals) {
                    vals = [null];
                }
                if (!Array.isArray(vals)) {
                    vals = [vals];
                }
                if (!dontTranslateFilter && model.fields[field].type === 'reference') {
                    field = '_' + field;
                    vals = Lazy(vals).map(function (x) {
                        if (x && x.constructor !== Number) {
                            return x.id;
                        } else
                            return x;
                    }).toArray();
                } else if (model.fields[field].type === 'string') {
                    vals = vals.map(JSON.stringify);
                }
                return '(' + Lazy(vals).map(function (x) {
                    return '(x.' + field + ' === ' + x + ')';
                }).join(' || ') + ')';
            }).toArray().join(unifier);
            return new Function('x', 'return ' + source);
        },
        sameAs: function (x, y) {
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
        pluralize: function (str, model) {
            /**
         * Lexically returns english plural form
         */
            return str + 's';
        },
        beforeCall: function (func, before) {
            var decorator = function () {
                before().then(func);
            };
            return decorator;
        },
        cleanStorage: function () {
            /**
         * Clean localStorage object
         */
            Lazy(localStorage).keys().each(function (k) {
                delete localStorage[k];
            });
        },
        reverse: function (chr, str) {
            return str.split(chr).reverse().join(chr);
        },
        permutations: function (arr) {
            var ret = [];
            for (var x = arr.length - 1; x >= 0; x--) {
                for (var y = arr.length - 1; y >= 0; y--) {
                    if (x !== y)
                        ret.push([
                            arr[x],
                            arr[y]
                        ]);
                }
            }
            return ret;
        },
        bool: Boolean,
        noop: function () {
        },
        tzOffset: new Date().getTimezoneOffset() * 60000,
        transFieldType: {
            date: function (x) {
                return new Date(x * 1000 + utils.tzOffset);
            },
            datetime: function (x) {
                return new Date(x * 1000 + utils.tzOffset);
            },
            string: function (x) {
                return x.toString();
            },
            text: function (x) {
                return x.toString();
            },
            integer: function (x) {
                return parseInt(x);
            },
            float: function (x) {
                return parseFloat(x);
            }
        },
        mock: mockObject
    };
    'use strict';
    const STATUSKEY = 'lastRWTConnectionStatus';
    function RealtimeConnection(endPoint, rwtConnection) {
        /**
     * Connects a websocket with reWheel connection
     */
        var self = this;
        var connection = new SockJS(endPoint);
        connection.onopen = function (x) {
            console.log('open : ' + x);
            connection.tenant();
            rwtConnection.emit('realtime-connection-open', x);
        };
        connection.onmessage = function (x) {
            if (x.type == 'message') {
                //$.notify(x.data);
                try {
                    //TODO set fromRealtime
                    rwtConnection.emit('realtime-message-json', JSON.parse(x.data));    //TODO unset fromRealtime
                } catch (e) {
                    rwtConnection.emit('realtime-message-text', JSON.parse(x.data));
                }
            } else {
                console.log('from realtime ', x);
            }
        };
        connection.onclose = function () {
            setTimeout(utils.wsConnect, 1000);
            rwtConnection.emit('realtime-connection-closed');
        };
        connection.tenant = function () {
            connection.send('TENANT:' + rwtConnection.cachedStatus.application + ':' + rwtConnection.cachedStatus.token);
        };
        this.close = function () {
            connection.close();
        };
    }
    function reWheelConnection(endPoint, getLogin) {
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
        this.endPoint = endPoint.endsWith('/') ? endPoint : endPoint + '/';
        this.on = events.on;
        this.unbind = events.unbind;
        this.emit = events.emit;
        this.once = events.once;
        this.cachedStatus = {};
        this.isConnected = false;
        this.isLoggedIn = false;
        // registering update status
        var ths = this;
    }
    ;
    reWheelConnection.prototype.$post = function (url, data, callBack) {
        /**
     * AJAX call for fetch all data from server
     * @param url: last url part for ajax call
     * @param data: data object to be sent
     * @param callBack: function(xhr) will be called when data arrives
     * @returns Promise<xhr> same of callBack
     */
        // initialization
        var ths = this;
        var promise = new Promise(function (accept, reject) {
            utils.xdr(ths.endPoint + url, data, ths.cachedStatus.application, ths.cachedStatus.token).then(function (xhr) {
                ths.emit('http-response', xhr.responseText, xhr.status, url, data);
                ths.emit('http-response-' + xhr.status, xhr.responseText, url, data);
                if (xhr.responseData) {
                    ths.emit('http-response-' + xhr.status + '-json', xhr.responseData, url, data);
                }
                if (callBack) {
                    callBack(xhr.responseData || xhr.responseText);
                }
                ;
                accept(xhr.responseData || xhr.responseText);
            }, function (xhr) {
                if (xhr.responseData) {
                    ths.emit('error-json', xhr.responseData, xhr.status, url, data, xhr);
                    ths.emit('error-json-' + xhr.status, xhr.responseData, url, data, xhr);
                } else {
                    ths.emit('error-http', xhr.responseText, xhr.status, url, data, xhr);
                    ths.emit('error-http-' + xhr.status, xhr.responseText, url, data, xhr);
                }
                reject(xhr.responseData || xhr.responseText);
            });
        });
        return promise;
    };
    reWheelConnection.prototype.status = function (callBack, force) {
        /**
     * Check current status and callback for results.
     * It caches results for further.
     * @param callback: (status object)
     * @param force: boolean if true empties cache  
     * @return void
     */
        // if force, clear all cached values
        if (force) {
            this.cachedStatus = {};
            if (STATUSKEY in localStorage) {
                delete localStorage[STATUSKEY];
            }
        }
        // try for value resolution
        // first on memory
        if (Lazy(this.cachedStatus).size()) {
        } else if (STATUSKEY in localStorage) {
            this.updateStatus(JSON.parse(localStorage[STATUSKEY]));    // then on server
        } else {
            var ths = this;
            this.$post('api/status', {}, function (status) {
                callBack(status);
                ths.updateStatus(status);
            });
            // doesn't call callback
            return;
        }
        callBack(this.cachedStatus);
    };
    reWheelConnection.prototype.updateStatus = function (status) {
        this.isConnected = Boolean(status.token);
        this.isLoggedIn = Boolean(status.user_id);
        var oldStatus = this.cachedStatus;
        this.cachedStatus = status;
        if (!oldStatus.user_id && status.user_id) {
            this.emit('logged-in', status.user_id);
        } else if (oldStatus.user_id && !status.user_id) {
            this.emit('logged-out');
        } else if (this.isConnected && !this.isLoggedIn) {
            this.emit('login-required');
            if (this.getLogin) {
                var loginInfo = this.getLogin();
                if (loginInfo.constructor === Object) {
                    this.login(loginInfo.username, loginInfo.password, loginInfo.callBack);
                } else if (loginInfo.constructor === Promise) {
                    loginInfo.then(function (obj) {
                        this.login(obj.username, obj.password, obj.callBack);
                    });
                }
            }
        }
        // realtime connection is setted
        if (!oldStatus.realtimeEndPoint && status.realtimeEndPoint) {
            this.wsConnection = new RealtimeConnection(status.realtimeEndPoint, this);    // realtime connection is closed
        } else if (oldStatus.realtimeEndPoint && !status.realtimeEndPoint) {
            this.wsConnection.close();
            delete this.wsConnection;
        }
        this.emit('update-connection-status', status, oldStatus);
        localStorage[STATUSKEY] = JSON.stringify(status);
    };
    reWheelConnection.prototype.login = function (username, password) {
        /**
     * make login and return a promise. If login succed, promise will be accepted
     * If login fails promise will be rejected with error
     * @param username: username
     * @param password: password
     * @return Promise (user object)
     */
        var ths = this;
        return new Promise(function (accept, reject) {
            utils.xdr(ths.endPoint + 'api/login', {
                username: username || '',
                password: password || ''
            }, null, ths.cachedStatus.token, true).then(function (xhr) {
                // update status
                ths.updateStatus(xhr.responseData);
                // call with user id
                accept({
                    status: 'success',
                    userid: ths.cachedStatus.user_id
                });
            }, function (xhr) {
                // if error call error manager with error
                accept({
                    error: xhr.responseData.error,
                    status: 'error'
                });
            });
        });
    };
    reWheelConnection.prototype.logout = function () {
        var ths = this;
        return new Promise(function (accept, reject) {
            ths.$post('api/logout').then(function (ok) {
                ths.updateStatus({});
                delete localStorage[STATUSKEY];
                accept();
            }, reject);
        });
    };
    reWheelConnection.prototype.connect = function (callBack) {
        if (this.isLoggedIn) {
            callBack(this.cachedStatus.user_id);
        } else {
            // wait for login
            this.once('logged-in', function (user_id) {
                callBack(user_id);
            });
            this.status(utils.noop);
        }
    };
    utils.reWheelConnection = reWheelConnection;
    'use strict';
    function Toucher() {
        var touched = false;
        this.touch = function () {
            touched = true;
        };
        this.touched = function () {
            var t = touched;
            touched = false;
            return t;
        };
    }
    'use strict';
    function VacuumCacher(touch, asked, name, pkIndex) {
        /*
    if (name){
        console.info('created VacuumCacher as ' + name);
    }
*/
        if (!asked) {
            var asked = [];
        }
        var missing = [];
        this.ask = function (id, lazy) {
            if (pkIndex && id in pkIndex.source) {
                return;
            }
            if (!Lazy(asked).contains(id)) {
                //            console.info('asking (' + id + ') from ' + name);
                missing.push(id);
                if (!lazy)
                    asked.push(id);
                touch.touch();
            }    //        else console.warn('(' + id + ') was just asked on ' + name);
        };
        this.getAskedIndex = function () {
            return asked;
        };
        this.missings = function () {
            return Lazy(missing.splice(0, missing.length)).unique().toArray();
        };
    }
    function AutoLinker(actives, IDB, W2PRESOURCE, listCache) {
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
        W2PRESOURCE.on('model-definition', function (model, index) {
            // defining all indexes for primary key
            var pkIndex = listCache.getIndexFor(model.name, 'id');
            mainIndex[model.name] = new VacuumCacher(touch, pkIndex, 'mainIndex.' + model.name, index);
            // creating permission indexes
            permissions[model.name] = new VacuumCacher(touch, null, 'permissions.' + model.name);
            // creating indexes for foreign keys
            Lazy(model.references).each(function (reference) {
                var indexName = model.name + '_' + reference.id;
                foreignKeys[indexName] = new VacuumCacher(touch, listCache.getIndexFor(reference.to, 'id'), reference.to + '.id foreignKeys.' + indexName);
            });
            // creating reverse foreign keys
            Lazy(model.referencedBy).each(function (field) {
                var indexName = field.by + '.' + field.id;
                foreignKeys[indexName] = new VacuumCacher(touch, listCache.getIndexFor(field.by, field.id), field.by + '.' + field.id + ' foreignKeys.' + indexName);
            });
            Lazy(model.manyToMany).each(function (relation) {
                if (!(relation.indexName in m2m))
                    m2m[relation.indexName] = [
                        new VacuumCacher(touch, null, 'm2m.' + relation.indexName + '[0]'),
                        new VacuumCacher(touch, null, 'm2m.' + relation.indexName + '[1]')
                    ];
                if (!(relation.indexName in m2mIndex))
                    m2mIndex[relation.indexName] = new ManyToManyRelation(relation, m2m[relation.indexName]);
            });
        });
        var m2mGet = function (indexName, n, collection, callBack) {
            W2PRESOURCE.$post((n ? utils.reverse('/', indexName) : indexName) + 's' + '/list', { collection: collection }, function (data) {
                W2PRESOURCE.gotData(data, callBack);
                delete actives[indexName];
            });
        };
        var getM2M = function (indexName, collection, n, callBack) {
            // ask all items in collection to m2m index
            Lazy(collection).each(m2m[indexName][n].ask.bind(m2m[indexName][n]));
            // renewing collection without asked
            collection = m2m[indexName][n].missings();
            // calling remote for m2m collection if any
            if (collection.length) {
                actives[indexName] = 1;
                m2mGet(indexName, n, collection, callBack);
            } else {
                callBack && callBack();
            }
        };
        this.getM2M = getM2M;
        var linkUnlinked = function () {
            // perform a DataBase synchronization with server looking for unknown data
            if (!touch.touched())
                return;
            if (Lazy(actives).values().sum()) {
                touch.touch();
                return;
            }
            var changed = false;
            Lazy(m2m).each(function (indexes, indexName) {
                Lazy(indexes).each(function (index, n) {
                    var collection = index.missings();
                    collection = Lazy(collection).filter(Boolean).map(function (x) {
                        return parseInt(x);
                    }).toArray();
                    if (collection.length) {
                        var INDEX = m2mIndex[indexName];
                        var getter = INDEX['get' + (1 - n)].bind(INDEX);
                        changed = true;
                        m2mGet(indexName, n, collection, function (data) {
                            var ids = collection.map(getter);
                            if (ids.length) {
                                var otherIndex = indexName.split('/')[1 - n];
                                W2PRESOURCE.describe(otherIndex, function () {
                                    //                                Lazy(ids).flatten().unique().each(mainIndex[otherIndex].ask);
                                    Lazy(ids).flatten().unique().each(function (x) {
                                        mainIndex[otherIndex].ask(x, true);
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
                    W2PRESOURCE.fetch(modelName, { id: ids }, null, utils.noop);
                }
            });
            // Foreign keys
            Lazy(foreignKeys).map(function (v, k) {
                return [
                    k,
                    v.missings()
                ];
            }).filter(function (v) {
                return v[1].length;
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
            Lazy(Lazy(permissions).map(function (v, k) {
                return [
                    k,
                    v.missings()
                ];
            }).filter(function (v) {
                return v[1].length;
            }).toObject()).each(function (ids, resourceName) {
                changed = true;
                if (ids.length) {
                    actives[resourceName] = 1;
                    W2PRESOURCE.$post(resourceName + '/my_perms', { ids: Lazy(ids).unique().toArray() }, function (data) {
                        W2PRESOURCE.gotPermissions(data.PERMISSIONS);
                        delete actives[resourceName];
                    });
                }
            });
        };
        setInterval(linkUnlinked, 50);
    }
    ;
    'use strict';
    function ListCacher() {
        var gotAll = {};
        var asked = {};
        // map of array
        var compositeAsked = {};
        var cartesianProduct1 = function (x, y, isArray) {
            var ret = [];
            if (isArray) {
                for (var a in x) {
                    for (var b in y) {
                        ret.push(Lazy([
                            x[a],
                            y[b]
                        ]).flatten().toArray());
                    }
                }
            } else {
                for (var a in x) {
                    for (var b in y) {
                        ret.push([
                            x[a],
                            y[b]
                        ]);
                    }
                }
            }
            return ret;
        };
        var cartesianProduct = function (arr) {
            var isArray = false;
            var ret = arr[0];
            for (var x = 1; x < arr.length; ++x) {
                ret = cartesianProduct1(ret, arr[x], isArray);
                isArray = true;
            }
            return ret;
        };
        var explodeFilter = function (filter) {
            var product = cartesianProduct(Lazy(filter).values().toArray());
            var keys = Lazy(filter).keys().toArray();
            return product.map(function (x) {
                var r = {};
                keys.forEach(function (a, n) {
                    r[a] = x[n];
                });
                return r;
            });
        };
        var filterSingle = function (model, filter, testOnly) {
            // Lazy auto create indexes
            var modelName = model.modelName;
            var getIndexFor = this.getIndexFor;
            var keys = Lazy(filter).map(function (v, key) {
                return [
                    key,
                    modelName + '.' + key
                ];
            }).toObject();
            var indexes = Lazy(filter).keys().map(function (key) {
                return [
                    key,
                    getIndexFor(modelName, key)
                ];
            }).toObject();
            // fake for (it will cycle once)
            for (var x in filter) {
                // get asked index and check presence
                var difference = Lazy(filter[x]).difference(indexes[x]).toArray();
                if (difference.length) {
                    // generate new filter
                    var ret = Lazy([[
                            x,
                            difference
                        ]]).toObject();
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
        var cleanComposites = function (model, filter) {
            /**
         * clean compositeAsked
         */
            // lazy create conditional asked index
            if (!(model.name in compositeAsked)) {
                compositeAsked[model.name] = [];
            }
            ;
            var index = compositeAsked[model.name];
            // search for all elements who have same partial
            var filterLen = Lazy(filter).size();
            var items = index.filter(utils.makeFilter(model, filter, ' && ', true)).filter(function (item) {
                Lazy(item).size() > filterLen;
            });    //        console.log('deleting :' + JSON.stringify(items));
        };
        this.filter = function (model, filter) {
            //        console.log('------------------\nfilter : ' + JSON.stringify(filter));
            var modelName = model.modelName;
            // if you fetch all objects from server, this model has to be marked as got all;
            var filterLen = Lazy(filter).size();
            switch (filterLen) {
            case 0: {
                    // return null or all
                    var got = gotAll[modelName];
                    gotAll[modelName] = true;
                    if (modelName in asked) {
                        delete asked[modelName];
                    }
                    //                console.log('out : null (got all)');
                    // conditional clean
                    if (modelName in compositeAsked) {
                        delete compositeAsked[modelName];
                    }
                    if (got)
                        return null;
                    return {};
                }
            case 1: {
                    var ret = filterSingle.call(this, model, filter);
                    cleanComposites.call(this, model, filter);
                    return ret;
                }
            }
            var ths = this;
            var single = Lazy(filter).keys().some(function (key) {
                var f = {};
                f[key] = filter[key];
                return filterSingle.call(ths, model, f, true) == null;
            });
            if (single) {
                return null;
            }
            // lazy create compositeAsked
            if (!(modelName in compositeAsked)) {
                compositeAsked[modelName] = [];
            }
            // explode filter
            var exploded = explodeFilter(filter);
            // collect partials
            var partials = compositeAsked[modelName].filter(utils.makeFilter(model, filter, ' || ', true));
            // collect missings (exploded - partials)
            if (partials.length) {
                var bad = [];
                // partial difference
                for (var x in partials) {
                    bad.push.apply(bad, exploded.filter(utils.makeFilter(model, partials[x], ' && ', true)));
                }
                //            console.log('exploded - partial : ' + JSON.stringify(bad));
                var missings = Lazy(exploded).difference(bad).toArray();
            } else {
                var missings = exploded;
            }
            // filter partials
            if (missings.length) {
                compositeAsked[modelName].push.apply(compositeAsked[modelName], missings);
                // aggregate missings
                var missings = Lazy(filter).keys().map(function (key) {
                    var ret = Lazy(missings).pluck(key).unique().toArray();
                    return [
                        key,
                        ret.length ? ret : filter[key]
                    ];
                }).toObject();
                //            console.log('out : ' + JSON.stringify(missings));
                // clean conditional
                cleanComposites(model, missings);
                return missings;
            }
            return null;
        };
        this.getIndexFor = function (modelName, fieldName) {
            var indexName = modelName + '.' + fieldName;
            if (!(indexName in asked)) {
                asked[indexName] = [];
            }
            return asked[indexName];
        };
    }
    ;
    'use strict';
    function ManyToManyRelation(relation, m2m) {
        var items = [];
        this.add = items.push.bind(items);
        this.add = function (item) {
            //      console.log('adding ' + item);
            if (!Lazy(items).find(item)) {
                items.push(item);
            }
        };
        this.get0 = function (id) {
            m2m[1].ask(id);
            return Lazy(items).filter(function (x) {
                return x[0] === id;
            }).pluck('1').toArray();
        };
        this.get1 = function (id) {
            m2m[0].ask(id);
            return Lazy(items).filter(function (x) {
                return x[1] === id;
            }).pluck('0').toArray();
        };
        this['get' + utils.capitalize(relation.indexName.split('/')[1])] = this.get1;
        this['get' + utils.capitalize(relation.indexName.split('/')[0])] = this.get0;
        this.del = function (item) {
            var l = items.length;
            var idx = null;
            for (var a = 0; a < l; a++) {
                if (items[a][0] === item[0] && items[a][1] === item[1]) {
                    idx = a;
                    break;
                }
            }
            if (idx) {
                items.splice(a, 1);
            }
            console.log('deleting ', item);
        };
    }
    'use strict';
    function cachedPropertyByEvents(proto, propertyName, getter, setter) {
        var events = Array.prototype.slice.call(arguments, 4);
        var result = {};
        Lazy(events).each(function (event) {
            proto.orm.on(event, function () {
                result = {};
            });
        });
        var propertyDef = {
            get: function cached() {
                if (!(this.id in result)) {
                    result[this.id] = getter.call(this);
                }
                return result[this.id];
            }
        };
        if (setter) {
            propertyDef['set'] = function (value) {
                if (value !== result[this.id]) {
                    setter.call(this, value);
                    if (this.id in result) {
                        delete result[this.id];
                    }
                }
            };
        }
        Object.defineProperty(proto, propertyName, propertyDef);
    }
    'use strict';
    function ValidationError(data) {
        this.resource = data._resource;
        this.formIdx = data.formIdx;
        this.fields = data.errors;
    }
    var baseORM = function (options, extORM) {
        // creating rewheel connection
        if (options.constructor === String) {
            var connection = new reWheelConnection(options);
        } else if (options.constructor === utils.reWheelConnection) {
            var connection = options;
        }
        this.connection = connection;
        connection.on('connected', function () {
            this.connected = true;
        });
        this.on = connection.on;
        this.emit = connection.emit;
        this.unbind = connection.unbind;
        this.once = connection.once;
        this.$post = connection.$post.bind(connection);
        // handling websocket events
        this.on('ws-connected', function (ws) {
            console.info('Websocket connected');
            // all json data has to be parsed by gotData
            ws.onMessageJson(W2PRESOURCE.gotData.bind(W2PRESOURCE));
            //
            ws.onMessageText(function (message) {
                console.info('WS message : ' + message);
            });
        });
        this.on('ws-disconnected', function (ws) {
            console.error('Websocket disconnected');
        });
        this.on('error-json-404', function (error, url, sentData, xhr) {
            console.error('JSON error ', JSON.stringify(error));
            delete waitingConnections[url.split('/')[0]];
        });
        this.on('realtime-message-json', function (message) {
            W2PRESOURCE.gotData(message);
        });
        // initialization
        var W2PRESOURCE = this;
        var IDB = { auth_group: Lazy({}) };
        // tableName -> data as Array
        var IDX = {};
        // tableName -> Lazy(indexBy('id')) -> IDB[data]
        var REVIDX = {};
        // tableName -> fieldName -> Lazy.groupBy() -> IDB[DATA]
        var builderHandlers = {};
        var builderHandlerUsed = {};
        var persistentAttributes = {};
        var eventHandlers = {};
        var permissionWaiting = {};
        var modelCache = {};
        var failedModels = {};
        var waitingConnections = {};
        // actual connection who i'm waiting for
        var listCache = new ListCacher(Lazy);
        var linker = new AutoLinker(waitingConnections, IDB, this, listCache);
        /*    window.ll = linker;
    window.lc = listCache;
*/
        this.validationEvent = this.on('error-json-513', function (data, url, sentData, xhr) {
            if (currentContext.savingErrorHanlder) {
                currentContext.savingErrorHanlder(new ValidationError(data));
            }
        });
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
                this.push.apply(this, [
                    k,
                    permissions[k]
                ]);
            }
        }
        PermissionTable.prototype.save = function (cb) {
            // save Object to server
            var data = {
                permissions: Lazy(this.permissions).map(function (x) {
                    return [
                        x[0].id,
                        x[1]
                    ];
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
                return [
                    x,
                    p.contains(x)
                ];
            }).toObject();
            var l = Lazy(this.permissions).map(function (x) {
                return x[0].id;
            });
            if (l.contains(group_id))
                this.permissions[l.indexOf(group_id)][1] = perms;
            else
                this.permissions.push([
                    IDB.auth_group.get(group_id),
                    perms
                ]);
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
            var funcString = 'if (!row) { row = {}};\n';
            funcString += model.references.map(function (field) {
                return 'this._' + field.id + ' = row.' + field.id + ';';
            }).join(';\n');
            // datefield conversion
            funcString += fields.map(function (x, k) {
                if (x.type == 'date' || x.type == 'datetime') {
                    return 'this.' + k + ' = row.' + k + '?new Date(row.' + k + ' * 1000 - ' + utils.tzOffset + '):null;\n';
                } else if (x.type == 'boolean') {
                    return 'this.' + k + ' = (row.' + k + ' === "T") || (row.' + k + ' === true);\n';
                } else {
                    return 'this.' + k + ' = row.' + k + ';\n';
                }
            }).toString('\n');
            +'\n';
            funcString += 'if (permissions) {this._permissions = permissions && Lazy(permissions).map(function (x) { return [x, true] }).toObject();}';
            // master class function
            var Klass = new Function('row', 'permissions', funcString);
            Klass.prototype.orm = extORM;
            Klass.ref_translations = {};
            Klass.modelName = model.name;
            Klass.references = Lazy(model.references).pluck('id').toArray();
            Klass.inverse_references = model.referencedBy.map(function (x) {
                // managing references where 
                return x.by + '_' + x.id + '_set';
            });
            Klass.referents = model.referencedBy.map(function (x) {
                return [
                    x.by,
                    x.id
                ];
            });
            Klass.fieldsOrder = model.fieldOrder;
            Klass.allPermissions = model.permissions;
            // redefining toString method
            if (Lazy(model.representation).size()) {
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
                W2PRESOURCE.$post(this.constructor.modelName + '/all_perms', { id: this.id }, function (data) {
                    var permissions = data;
                    var grouped = {};
                    var unknown_groups = Lazy(permissions).pluck('group_id').unique().map(function (x) {
                        return '' + x;
                    }).difference(IDB.auth_group.keys()).toArray();
                    Lazy(permissions).groupBy(function (x) {
                        return x.group_id;
                    }).each(function (v, k) {
                        grouped[k] = Lazy(v).pluck('name').toArray();
                    });
                    var call = function (x) {
                        cb(new PermissionTable(object_id, Klass, grouped));
                    };
                    if (unknown_groups.length)
                        W2PRESOURCE.get('auth_group', unknown_groups, call);
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
                Lazy(Klass.fieldsOrder).filter(function (x) {
                    return !fields[x].writable;
                }).each(function (fieldName) {
                    if (fieldName in o) {
                        delete o[fieldName];
                    }
                });
                var promise = W2PRESOURCE.$post(modelName + (ID ? '/post' : '/put'), o);
                if (args && args.constructor === Function) {
                    // placing callback in a common place
                    promise.context.savingErrorHanlder = args;
                }
                return promise;
            };
            Klass.prototype.copy = function () {
                var obj = new this.constructor(this.asRaw());
                obj._permissions = this._permissions;
                return obj;
            };
            // building serialization function
            var asr = 'return {\n' + Lazy(model.references).map(function (field) {
                return field.id + ' : this._' + field.id;
            }).concat(fields.map(function (x, k) {
                if (x.type == 'date' || x.type == 'datetime') {
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
                var deletable = Lazy(Klass.fields).filter(function (x) {
                    return !x.writable;
                }).pluck('id').toArray();
                Lazy(objects).map(function (x) {
                    return x.asRaw();
                }).each(function (x) {
                    Lazy(deletable).each(function (y) {
                        delete x[y];
                    });
                    raw.push(x);
                });
                W2PRESOURCE.$post(Klass.modelName, 'put', {
                    multiple: raw,
                    formIdx: W2PRESOURCE.formIdx++
                }, function (elems) {
                    W2PRESOURCE.gotData(elems);
                    var tab = IDB[Klass.modelName];
                    var objs = Lazy(elems[Klass.modelName].results).pluck('id').map(function (x) {
                        return tab.get(x);
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
                    Klass.prototype[funcName] = new Function(args, ddata + 'W2S.W2P_POST(this.constructor.modelName,"' + funcName + '", data,function(data,status,headers,x){' + 'try{\n' + '   if (!headers("nomodel")) {window.W2S.gotData(data,cb);}\n' + '   else {if (cb) {cb(data)}}\n' + '} catch(e){\n' + 'if (cb) {cb(data);}\n' + '}\n' + '});\n');
                });
            if ('privateArgs' in model) {
                Klass.privateArgs = Lazy(model.privateArgs).keys().map(function (x) {
                    return [
                        x,
                        true
                    ];
                }).toObject();
                Klass.prototype.savePA = function (o) {
                    var T = this;
                    var oo = { id: this.id };
                    var PA = this.constructor.privateArgs;
                    var Fs = this.constructor.fields;
                    var t = new this.constructor(o).asRaw();
                    var fieldIdx = Lazy(PA).keys().map(function (x) {
                        return [
                            x,
                            Fs[x]
                        ];
                    }).toObject();
                    Lazy(o).each(function (v, k) {
                        if (k in PA && fieldIdx[k].writable) {
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
                x.type = x.type || 'reference';
            })).indexBy('id').toObject();
            // setting widgets for fields
            Lazy(Klass.fields).each(function (field) {
                if (!field.widget) {
                    if (field.type === 'reference') {
                        field.widget = 'choices';
                    } else {
                        field.widget = field.type;
                    }
                }
            });
            // building references to (many to one) fields
            Lazy(model.references).each(function (ref) {
                var ext_ref = ref.to;
                var local_ref = '_' + ref.id;
                cachedPropertyByEvents(Klass.prototype, ref.id, function () {
                    if (!(ext_ref in IDB)) {
                        var ths = this;
                        W2PRESOURCE.describe(ext_ref, function (x) {
                            linker.mainIndex[ext_ref].ask(ths[local_ref], true);
                        });
                    }
                    var result = ext_ref in IDB && this[local_ref] && IDB[ext_ref].get(this[local_ref]);
                    if (!result && ext_ref in linker.mainIndex) {
                        // asking to linker
                        linker.mainIndex[ext_ref].ask(this[local_ref], true);
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
                }, 'new-' + ext_ref, 'deleted-' + ext_ref, 'updated-' + ext_ref, 'new-model-' + ext_ref);
                Klass.prototype['get' + utils.capitalize(ref.id)] = function () {
                    return extORM.get(ext_ref, this[local_ref]);
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
                        var ret = revIndex in IDB ? REVIDX[indexName].get(this.id + '') : null;
                        linker.foreignKeys[indexName].ask(this.id, true);
                        return ret;
                    }, null, 'new-' + revIndex, 'updated-' + revIndex, 'deleted-' + revIndex);
                }
                Klass.prototype['get' + utils.capitalize(utils.pluralize(ref.by))] = function () {
                    var opts = {};
                    opts[ref.id] = [this.id];
                    return extORM.query(ref.by, opts);
                };
            });
            //building reference to (many to many) fields
            if (model.manyToMany) {
                Lazy(model.manyToMany).each(function (ref) {
                    var indexName = ref.indexName;
                    var first = ref.first ? 0 : 1;
                    var omodelName = ref.model;
                    //                var omodel = getIndex(omodelName);
                    var getter = linker.m2mIndex[indexName]['get' + (1 - first)];
                    cachedPropertyByEvents(Klass.prototype, ref.model + 's', function () {
                        var ths = this;
                        var ret = [];
                        var ids = getter(ths.id);
                        var get = null;
                        if (ids.length) {
                            //W2PRESOURCE.fetch(omodelName, {id : ids});
                            get = getIndex(omodelName).get.bind(IDB[omodelName]);
                        }
                        if (ids && get)
                            ret = Lazy(ids).map(get).filter(utils.bool).toArray();
                        return ret;
                    }, null, 'received-m2m-' + indexName, 'received-' + omodelName);
                    Klass.prototype['get' + utils.capitalize(utils.pluralize(omodelName))] = function () {
                        var ths = this;
                        return new Promise(function (accept, reject) {
                            try {
                                linker.getM2M(indexName, [ths.id], first, function (data) {
                                    var ids = getter(ths.id);
                                    if (ids.length) {
                                        W2PRESOURCE.fetch(omodelName, { id: ids }, null, function () {
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
                        });
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
                            return [
                                ID,
                                x
                            ];
                        }).toArray();
                    } else {
                        var collection = [[
                                ID,
                                instance.id
                            ]];
                    }
                    W2PRESOURCE.$post(Klass.modelName + '/' + omodel + 's/delete', { collection: collection });
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
                                return [
                                    ID,
                                    x
                                ];
                            }).toArray();
                            W2P_POST(Klass.modelName, omodel + 's/put', { collection: collection }, function (data) {
                            });
                        }
                    } else {
                        if (indexName in linker.m2mIndex && Lazy(linker.m2mIndex[indexName]['get' + utils.capitalize(omodel)](instance.id)).find(this)) {
                            return;
                        }
                        W2PRESOURCE.$post(Klass.modelName + '/' + omodel + 's/put', {
                            collection: [[
                                    this.id,
                                    instance.id
                                ]]
                        });
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
            if (typeof data == 'string') {
                console.log('data ' + data + ' refused from gotData()');
                if (callBack) {
                    return callBack(data);
                }
                return;
            }
            // clean data from relations and permissions for using it after model parsing
            if ('_extra' in data) {
                delete data._extra;
            }
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
            if (!PA) {
                PA = {};
            }
            // cleaning from useless deleted data
            data = Lazy(data).filter(function (v, k) {
                return !('deleted' in v) || k in modelCache;
            }).toObject();
            if ('m2m' in data) {
                var m2m = data.m2m;
                delete data['m2m'];
            }
            Lazy(data).each(function (data, modelName) {
                W2PRESOURCE.describe(modelName, function (model) {
                    var modelClass = model;
                    if (data.results && data.results.length > 0 && data.results[0].constructor == Array) {
                        data.results = Lazy(data.results).map(function (x) {
                            return Lazy(modelClass.fieldsOrder).zip(x).toObject();
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
                        });
                    }
                    // indexing references by its ID
                    var itab = getIndex(modelName);
                    var table = itab.source;
                    // object deletion
                    if (deleted) {
                        deleted.forEach(function (x) {
                            delete table[x];
                        });
                    }
                    /*
                Lazy(deleted).each(function (x) {
                    delete table[x];
                });
*/
                    var idx = results.indexBy('id');
                    var ik = idx.keys();
                    var nnew = ik.difference(itab.keys().map(function (x) {
                        return parseInt(x);
                    }));
                    var updated = ik.difference(nnew);
                    // removing old identical values
                    updated = updated.filter(function (x) {
                        return !utils.sameAs(idx.get(x), itab.get(x).asRaw());
                    });
                    // classify records
                    var perms = data.permissions ? Lazy(data.permissions) : Lazy({});
                    var newObjects = nnew.map(function (x) {
                        return new modelClass(idx.get(x), perms.get(x));
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
                        Lazy(model.fields).keys().each(function (k) {
                            oldItem[k] = newItem[k];
                        });
                        changed.push([
                            oldItem,
                            oldCopy
                        ]);
                    });
                    //// sending signal for updated values
                    if (changed.length) {
                        W2PRESOURCE.emit('updated-' + modelName, changed);
                    }
                    //******** Update universe ********
                    var no = newObjects.toArray();
                    Lazy(no).each(function (x) {
                        table[x.id] = x;
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
                        ASKED_M2M[indexName] = [
                            {},
                            {}
                        ];
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
                    if (resourceName in IDB && id in IDB[resourceName].source) {
                        IDB[resourceName].get(id)._permissions = Lazy(row).map(function (x) {
                            return [
                                x,
                                true
                            ];
                        }).toObject();
                    }
                });
                if (Lazy(v[0]).size()) {
                    W2PRESOURCE.emit('update-permissions-' + resourceName, Lazy(v[0]).keys().toArray());
                }
            });
            this.emit('update-permissions');
        };
        this.gotM2M = function (m2m) {
            Lazy(m2m).each(function (data, indexName) {
                var m2mIndex = linker.m2mIndex[indexName];
                Lazy(data).each(function (m) {
                    Lazy(m).each(function (data, verb) {
                        m2mIndex[verb](data);
                    });
                });
                W2PRESOURCE.emit('received-m2m');
                W2PRESOURCE.emit('received-m2m-' + indexName);
            });
        };
        this.fetch = function (modelName, filter, together, callBack) {
            //
            // if a connection is currently running, wait for connection.
            if (modelName in waitingConnections) {
                setTimeout(function () {
                    W2PRESOURCE.fetch(modelName, filter, together, callBack);
                }, 500);
            } else {
                // fetching asynchromous model from server
                W2PRESOURCE.describe(modelName, function (model) {
                    // if data cames from realtime connection
                    if (W2PRESOURCE.connection.cachedStatus.realtimeEndPoint) {
                        // getting filter filtered by caching system
                        filter = listCache.filter(model, filter);
                        // if somthing is missing on my local DB 
                        if (filter) {
                            // ask for missings and parse server response in order to enrich my local DB.
                            // placing lock for this model
                            waitingConnections[modelName] = true;
                            W2PRESOURCE.$post(modelName + '/list', { filter: filter }).then(function (data) {
                                W2PRESOURCE.gotData(data, callBack);
                                // release lock
                                delete waitingConnections[modelName];
                            }, function (ret) {
                                // release lock
                                delete waitingConnections[modelName];
                            });
                        } else {
                            callBack && callBack();
                        }
                        return filter;
                    } else {
                        this.$post(modelName + '/list', sendData, function (data) {
                            if (!filter) {
                                GOT_ALL.source.push(modelName);
                            }
                            W2PRESOURCE.gotData(data, callBack);
                        });
                    }
                }.bind(this));
            }
        };
        this.get = function (modelName, ids, callBack) {
            // search objects from IDB. If some id is missing, it resolve it by the server
            // if a request to the same model is pending, wait for its completion
            if (ids.constructor !== Array) {
                ids = [ids];
            }
            // if some entity is missing 
            W2PRESOURCE.fetch(modelName, { id: ids }, null, function () {
                var ret = [];
                var itab = IDB[modelName];
                for (var id in ids) {
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
        this.describe = function (modelName, callBack) {
            var ret = modelCache[modelName];
            if (ret) {
                callBack && callBack(ret);
            } else {
                if (!(modelName in waitingConnections)) {
                    if (modelName in failedModels) {
                        return;
                    }
                    var cacheKey = 'description:' + modelName;
                    if (cacheKey in localStorage) {
                        this.gotModel(JSON.parse(localStorage[cacheKey]));
                        callBack && callBack(modelCache[modelName]);
                    } else {
                        waitingConnections[modelName] = true;
                        this.$post(modelName + '/describe', null, function (data) {
                            W2PRESOURCE.gotModel(data);
                            callBack && callBack(modelCache[modelName]);
                            delete waitingConnections[modelName];
                        }, function (data) {
                            this.modelNotFound.handle(modelName);
                            failedModels[modelName] = true;
                        });
                    }
                } else {
                    // wait for connection
                    setTimeout(function () {
                        W2PRESOURCE.describe(modelName, callBack);
                    }, 500);
                }
            }
        };
        this.addModelHandler = function (modelName, decorator) {
            var key = utils.hash(decorator);
            if (!(modelName in builderHandlers))
                builderHandlers[modelName] = new Handler();
            if (!(modelName in builderHandlerUsed))
                builderHandlerUsed[modelName] = {};
            if (key in builderHandlerUsed[modelName]) {
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
        this.addPersistentAttributes = function (modelName, attributes) {
            var addProperty = function (model, attributes) {
                attributes.forEach(function (val) {
                    var key = 'pA:' + model.modelName + ':' + val;
                    var kattr = '__' + val;
                    Object.defineProperty(model.prototype, val, {
                        get: function () {
                            if (!(kattr in this)) {
                                var v = localStorage[key + this.id];
                                this[kattr] = v ? JSON.parse(v) : null;
                            }
                            return this[kattr];
                        },
                        set: function (value) {
                            this[kattr] = value;
                            localStorage[key + this.id] = JSON.stringify(value);
                        }
                    });
                });
            };
            if (!(modelName in persistentAttributes)) {
                persistentAttributes[modelName] = [];
            }
            var attrs = persistentAttributes[modelName];
            if (attributes) {
                var newAttrs = Lazy(attributes).difference(attrs).toArray();
            } else {
                var newAttrs = attrs;
            }
            if (newAttrs.length) {
                if (modelName in modelCache) {
                    addProperty(modelCache[modelName], newAttrs);
                }
                if (attributes) {
                    Array.prototype.push.apply(attrs, newAttrs);
                }
            }
        };
        this.on('new-model', function (model) {
            if (model.modelName in builderHandlers) {
                builderHandlers[model.modelName].handle(modelCache[model.modelName]);
            }
            if (model.modelName in persistentAttributes) {
                W2PRESOURCE.addPersistentAttributes(model.modelName);
            }
        });
        this.query = function (modelName, filter, together, callBack) {
            var ths = this;
            this.describe(modelName, function (model) {
                // arrayfiy all filter values
                filter = Lazy(filter).map(function (v, k) {
                    return [
                        k,
                        Array.isArray(v) ? v : [v]
                    ];
                }).toObject();
                var filterFunction = utils.makeFilter(model, filter);
                var idx = getIndex(modelName);
                ths.fetch(modelName, filter, together, function (e) {
                    callBack(idx.filter(filterFunction).values().toArray());
                });
            });
        };
        this.delete = function (modelName, ids, callBack) {
            return this.$post(modelName + '/delete', { id: ids }, callBack);
        };
        this.connect = function (callBack) {
            if (this.connection.isLoggedIn) {
                callBack();
            } else {
                this.connection.connect(callBack);
            }
        };
    };
    function reWheelORM(endPoint, loginFunc) {
        this.$orm = new baseORM(new utils.reWheelConnection(endPoint, loginFunc), this);
        this.on = this.$orm.on.bind(this.$orm);
        this.emit = this.$orm.emit.bind(this.$orm);
        this.unbind = this.$orm.unbind.bind(this.$orm);
        this.once = this.$orm.once;
        this.addModelHandler = this.$orm.addModelHandler.bind(this.$orm);
        this.addPersistentAttributes = this.$orm.addPersistentAttributes.bind(this.$orm);
        this.utils = utils;
        this.logout = this.$orm.connection.logout.bind(this.$orm.connection);
    }
    reWheelORM.prototype.connect = function () {
        var connection = this.$orm.connection;
        return new Promise(function (callBack, reject) {
            connection.connect(callBack);
        });
    };
    reWheelORM.prototype.login = function (username, password) {
        return new Promise(function (accept, reject) {
            this.$orm.connection.login(username, password, accept);
        }.bind(this));
    };
    reWheelORM.prototype.logout = function (url) {
        return this.$orm.connection.logout();
    };
    reWheelORM.prototype.getModel = function (modelName) {
        var self = this;
        return new Promise(function (accept, reject) {
            try {
                self.$orm.connect(function () {
                    self.$orm.describe(modelName, accept);
                });
            } catch (e) {
                reject(e);
            }
        });
    };
    reWheelORM.prototype.get = function (modelName, ids) {
        var self = this;
        var single = false;
        var modName = modelName;
        if (ids.constructor !== Array) {
            single = true;
            ids = [ids];
        }
        return new Promise(function (accept, reject) {
            try {
                self.$orm.connect(function () {
                    if (single) {
                        self.$orm.get(modName, ids, function (items) {
                            accept(items[0]);
                        });
                    } else {
                        self.$orm.get(modName, ids, accept);
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    };
    reWheelORM.prototype.query = function (modelName, filter, related) {
        var self = this;
        return new Promise(function (accept, reject) {
            var together = null;
            if (related && related.constructor === Array && related.length) {
                together = related;
            } else if (related && related.constructor === String && related.length) {
                together = related.split(',');
            }
            try {
                self.$orm.connect(function () {
                    self.$orm.query(modelName, filter, together, accept);
                });
            } catch (e) {
                reject(e);
            }
        });
    };
    reWheelORM.prototype.delete = function (modelName, ids) {
        var self = this;
        return new Promise(function (accept, reject) {
            try {
                self.$orm.connect(function () {
                    self.$orm.delete(modelName, ids, accept);
                });
            } catch (e) {
                reject(e);
            }
        });
    };
    reWheelORM.prototype.getLoggedUser = function () {
        var self = this;
        if (this.$orm.connection.cachedStatus.user_id)
            return this.get('auth_user', this.$orm.connection.cachedStatus.user_id);
        else {
            return new Promise(function (accept, reject) {
                self.once('logged-in', function (user) {
                    self.get('auth_user', user).then(accept);
                });
            });
        }
    };
    reWheelORM.prototype.$sendToEndpoint = function (url, data) {
        return this.$orm.$post(url, data);
    };
    reWheelORM.prototype.login = function (username, password) {
        return this.$orm.connection.login(username, password);
    };
    root.rwt = reWheelORM;
}(window, Lazy, SockJS));
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJjb25uZWN0aW9uLmpzIiwidG91Y2hlci5qcyIsInZhY3V1bWNhY2hlci5qcyIsImF1dG9saW5rZXIuanMiLCJsaXN0Y2FjaGVyLmpzIiwibWFueXRvbWFueS5qcyIsImNhY2hlci5qcyIsIm9ybS5qcyJdLCJuYW1lcyI6WyJIYW5kbGVyIiwiaGFuZGxlcnMiLCJzdHJIYW5kbGVycyIsInByb3RvdHlwZSIsImFkZEhhbmRsZXIiLCJoYW5kbGVyIiwic3RySGFuZGxlciIsInV0aWxzIiwiaGFzaCIsInRvU3RyaW5nIiwicHVzaCIsImhhbmRsZSIsImFyZ3MiLCJBcnJheSIsInNsaWNlIiwiY2FsbCIsImFyZ3VtZW50cyIsImZvckVhY2giLCJmdW5jIiwiYXBwbHkiLCJoYW5kbGVCeSIsInRocyIsIk5hbWVkRXZlbnRNYW5hZ2VyIiwiZXZlbnRzIiwiaGFuZGxlcklkIiwiaWR4SWQiLCJvbiIsIm5hbWUiLCJpZCIsImVtaXQiLCJldmVudCIsInVuYmluZCIsImNvdW50IiwiTGF6eSIsImVhY2giLCJ2IiwiayIsImlkeCIsIm4iLCJyZXZlcnNlIiwieCIsInNwbGljZSIsIm9uY2UiLCJldmVudE5hbWUiLCJoYW5kbGVyRnVuY3Rpb24iLCJzZWxmIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsInJlbmFtZUZ1bmN0aW9uIiwiZm4iLCJGdW5jdGlvbiIsImJpbmQiLCJjYWNoZWQiLCJrZXkiLCJ3cmFwcGVyIiwibG9nIiwiY29uc29sZSIsInhkciIsInVybCIsImRhdGEiLCJhcHBsaWNhdGlvbiIsInRva2VuIiwiZm9ybUVuY29kZSIsIlByb21pc2UiLCJhY2NlcHQiLCJyZWplY3QiLCJyZXEiLCJYTUxIdHRwUmVxdWVzdCIsIm9ucmVhZHlzdGF0ZWNoYW5nZSIsInJlYWR5U3RhdGUiLCJyZXNwb25zZURhdGEiLCJKU09OIiwicGFyc2UiLCJyZXNwb25zZVRleHQiLCJhIiwicmVzcG9uc2UiLCJzdGF0dXMiLCJyZXF1ZXN0IiwiWERvbWFpblJlcXVlc3QiLCJvbmxvYWQiLCJzdGF0dXNUZXh0IiwiRXJyb3IiLCJvcGVuIiwib25lcnJvciIsInNldFJlcXVlc3RIZWFkZXIiLCJfX3Rva2VuX18iLCJzaXplIiwic3RyaW5naWZ5IiwibWFwIiwiZW5jb2RlVVJJIiwidG9BcnJheSIsImpvaW4iLCJzZW5kIiwiY2FwaXRhbGl6ZSIsInMiLCJ0b1VwcGVyQ2FzZSIsInRvTG93ZXJDYXNlIiwic3RyIiwicmV0IiwibGVuZ3RoIiwiY2hhckNvZGVBdCIsIm1ha2VGaWx0ZXIiLCJtb2RlbCIsImZpbHRlciIsInVuaWZpZXIiLCJkb250VHJhbnNsYXRlRmlsdGVyIiwic291cmNlIiwidmFscyIsImZpZWxkIiwiaXNBcnJheSIsImZpZWxkcyIsInR5cGUiLCJjb25zdHJ1Y3RvciIsIk51bWJlciIsInNhbWVBcyIsInkiLCJwbHVyYWxpemUiLCJiZWZvcmVDYWxsIiwiYmVmb3JlIiwiZGVjb3JhdG9yIiwidGhlbiIsImNsZWFuU3RvcmFnZSIsImxvY2FsU3RvcmFnZSIsImtleXMiLCJjaHIiLCJzcGxpdCIsInBlcm11dGF0aW9ucyIsImFyciIsImJvb2wiLCJCb29sZWFuIiwibm9vcCIsInR6T2Zmc2V0IiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwidHJhbnNGaWVsZFR5cGUiLCJkYXRlIiwiZGF0ZXRpbWUiLCJzdHJpbmciLCJ0ZXh0IiwiaW50ZWdlciIsInBhcnNlSW50IiwiZmxvYXQiLCJwYXJzZUZsb2F0IiwibW9jayIsIlNUQVRVU0tFWSIsIlJlYWx0aW1lQ29ubmVjdGlvbiIsImVuZFBvaW50Iiwicnd0Q29ubmVjdGlvbiIsImNvbm5lY3Rpb24iLCJTb2NrSlMiLCJvbm9wZW4iLCJ0ZW5hbnQiLCJvbm1lc3NhZ2UiLCJlIiwib25jbG9zZSIsInNldFRpbWVvdXQiLCJ3c0Nvbm5lY3QiLCJjYWNoZWRTdGF0dXMiLCJjbG9zZSIsInJlV2hlZWxDb25uZWN0aW9uIiwiZ2V0TG9naW4iLCJlbmRzV2l0aCIsImlzQ29ubmVjdGVkIiwiaXNMb2dnZWRJbiIsIiRwb3N0IiwiY2FsbEJhY2siLCJwcm9taXNlIiwieGhyIiwiZm9yY2UiLCJ1cGRhdGVTdGF0dXMiLCJ1c2VyX2lkIiwib2xkU3RhdHVzIiwibG9naW5JbmZvIiwiT2JqZWN0IiwibG9naW4iLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwib2JqIiwicmVhbHRpbWVFbmRQb2ludCIsIndzQ29ubmVjdGlvbiIsInVzZXJpZCIsImVycm9yIiwibG9nb3V0Iiwib2siLCJjb25uZWN0IiwiVG91Y2hlciIsInRvdWNoZWQiLCJ0b3VjaCIsInQiLCJWYWN1dW1DYWNoZXIiLCJhc2tlZCIsInBrSW5kZXgiLCJtaXNzaW5nIiwiYXNrIiwibGF6eSIsImNvbnRhaW5zIiwiZ2V0QXNrZWRJbmRleCIsIm1pc3NpbmdzIiwidW5pcXVlIiwiQXV0b0xpbmtlciIsImFjdGl2ZXMiLCJJREIiLCJXMlBSRVNPVVJDRSIsImxpc3RDYWNoZSIsIm1haW5JbmRleCIsImZvcmVpZ25LZXlzIiwibTJtIiwibTJtSW5kZXgiLCJwZXJtaXNzaW9ucyIsImluZGV4IiwiZ2V0SW5kZXhGb3IiLCJyZWZlcmVuY2VzIiwicmVmZXJlbmNlIiwiaW5kZXhOYW1lIiwidG8iLCJyZWZlcmVuY2VkQnkiLCJieSIsIm1hbnlUb01hbnkiLCJyZWxhdGlvbiIsIk1hbnlUb01hbnlSZWxhdGlvbiIsIm0ybUdldCIsImNvbGxlY3Rpb24iLCJnb3REYXRhIiwiZ2V0TTJNIiwibGlua1VubGlua2VkIiwidmFsdWVzIiwic3VtIiwiY2hhbmdlZCIsImluZGV4ZXMiLCJJTkRFWCIsImdldHRlciIsImlkcyIsIm90aGVySW5kZXgiLCJkZXNjcmliZSIsImZsYXR0ZW4iLCJtb2RlbE5hbWUiLCJpZGIiLCJmZXRjaCIsIm1haW5SZXNvdXJjZSIsImZpZWxkTmFtZSIsInRvT2JqZWN0IiwicmVzb3VyY2VOYW1lIiwiZ290UGVybWlzc2lvbnMiLCJQRVJNSVNTSU9OUyIsInNldEludGVydmFsIiwiTGlzdENhY2hlciIsImdvdEFsbCIsImNvbXBvc2l0ZUFza2VkIiwiY2FydGVzaWFuUHJvZHVjdDEiLCJiIiwiY2FydGVzaWFuUHJvZHVjdCIsImV4cGxvZGVGaWx0ZXIiLCJwcm9kdWN0IiwiciIsImZpbHRlclNpbmdsZSIsInRlc3RPbmx5IiwiZGlmZmVyZW5jZSIsImNsZWFuQ29tcG9zaXRlcyIsImZpbHRlckxlbiIsIml0ZW1zIiwiaXRlbSIsImdvdCIsInNpbmdsZSIsInNvbWUiLCJmIiwiZXhwbG9kZWQiLCJwYXJ0aWFscyIsImJhZCIsInBsdWNrIiwiYWRkIiwiZmluZCIsImdldDAiLCJnZXQxIiwiZGVsIiwibCIsImNhY2hlZFByb3BlcnR5QnlFdmVudHMiLCJwcm90byIsInByb3BlcnR5TmFtZSIsInNldHRlciIsInJlc3VsdCIsIm9ybSIsInByb3BlcnR5RGVmIiwidmFsdWUiLCJkZWZpbmVQcm9wZXJ0eSIsIlZhbGlkYXRpb25FcnJvciIsInJlc291cmNlIiwiX3Jlc291cmNlIiwiZm9ybUlkeCIsImVycm9ycyIsImJhc2VPUk0iLCJvcHRpb25zIiwiZXh0T1JNIiwiU3RyaW5nIiwiY29ubmVjdGVkIiwid3MiLCJpbmZvIiwib25NZXNzYWdlSnNvbiIsIm9uTWVzc2FnZVRleHQiLCJtZXNzYWdlIiwic2VudERhdGEiLCJ3YWl0aW5nQ29ubmVjdGlvbnMiLCJhdXRoX2dyb3VwIiwiSURYIiwiUkVWSURYIiwiYnVpbGRlckhhbmRsZXJzIiwiYnVpbGRlckhhbmRsZXJVc2VkIiwicGVyc2lzdGVudEF0dHJpYnV0ZXMiLCJldmVudEhhbmRsZXJzIiwicGVybWlzc2lvbldhaXRpbmciLCJtb2RlbENhY2hlIiwiZmFpbGVkTW9kZWxzIiwibGlua2VyIiwidmFsaWRhdGlvbkV2ZW50IiwiY3VycmVudENvbnRleHQiLCJzYXZpbmdFcnJvckhhbmxkZXIiLCJnZXRJbmRleCIsImdldFVubGlua2VkIiwiVU5MSU5LRUQiLCJQZXJtaXNzaW9uVGFibGUiLCJrbGFzcyIsInNhdmUiLCJjYiIsIm15UGVybXMiLCJncm91cF9pZCIsInBlcm1pc3Npb25MaXN0IiwicCIsInBlcm1zIiwiYWxsUGVybWlzc2lvbnMiLCJpbmRleE9mIiwibWFrZU1vZGVsQ2xhc3MiLCJfbW9kZWwiLCJyZWFkYWJsZSIsIndyaXRhYmxlIiwicHJpdmF0ZUFyZ3MiLCJtZXJnZSIsImZ1bmNTdHJpbmciLCJLbGFzcyIsInJlZl90cmFuc2xhdGlvbnMiLCJpbnZlcnNlX3JlZmVyZW5jZXMiLCJyZWZlcmVudHMiLCJmaWVsZHNPcmRlciIsImZpZWxkT3JkZXIiLCJyZXByZXNlbnRhdGlvbiIsImRlbGV0ZSIsIl9wZXJtaXNzaW9ucyIsImFsbF9wZXJtcyIsIm9iamVjdF9pZCIsImdyb3VwZWQiLCJ1bmtub3duX2dyb3VwcyIsImdyb3VwQnkiLCJvIiwiYXNSYXciLCJJRCIsImFyZyIsImNvbnRleHQiLCJjb3B5IiwiYXNyIiwiY29uY2F0Iiwic2F2ZU11bHRpIiwib2JqZWN0cyIsInNjb3BlIiwicmF3IiwiZGVsZXRhYmxlIiwibXVsdGlwbGUiLCJlbGVtcyIsInRhYiIsIm9ianMiLCJyZXN1bHRzIiwiZXh0cmFfdmVyYnMiLCJmdW5jTmFtZSIsImRkYXRhIiwic2F2ZVBBIiwiVCIsIm9vIiwiUEEiLCJGcyIsImZpZWxkSWR4IiwidGFwIiwiaW5kZXhCeSIsIndpZGdldCIsInJlZiIsImV4dF9yZWYiLCJsb2NhbF9yZWYiLCJUeXBlRXJyb3IiLCJyZXZJbmRleCIsImhhc093blByb3BlcnR5Iiwib3B0cyIsInF1ZXJ5IiwiZmlyc3QiLCJvbW9kZWxOYW1lIiwidmFsaWRhdG9ycyIsInVubGlua1JlZmVyZW5jZSIsImluc3RhbmNlIiwiaW5zdGFuY2VzIiwib21vZGVsIiwibGlua1JlZmVyZW5jZSIsInJlZnMiLCJJTkRFWF9NMk0iLCJXMlBfUE9TVCIsIl9leHRyYSIsIlRPT05FIiwiVE9NQU5ZIiwiTUFOWVRPTUFOWSIsIm1vZGVsQ2xhc3MiLCJ6aXAiLCJkZWxldGVkIiwiTVBBIiwicmVjb3JkIiwiaXRhYiIsInRhYmxlIiwiaWsiLCJubmV3IiwidXBkYXRlZCIsIm5ld09iamVjdHMiLCJvbGRJdGVtIiwib2xkQ29weSIsIm5ld0l0ZW0iLCJubyIsInRvdGFsUmVzdWx0cyIsInVkeCIsIkFTS0VEX1VOTElOS0VEIiwiQVNLRURfTTJNIiwiTUlEWCIsImdvdE0yTSIsInJvdyIsIm0iLCJ2ZXJiIiwidG9nZXRoZXIiLCJzZW5kRGF0YSIsIkdPVF9BTEwiLCJnb3RNb2RlbCIsImNhY2hlS2V5IiwibW9kZWxOb3RGb3VuZCIsImFkZE1vZGVsSGFuZGxlciIsImFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiYXR0cmlidXRlcyIsImFkZFByb3BlcnR5IiwidmFsIiwia2F0dHIiLCJzZXQiLCJhdHRycyIsIm5ld0F0dHJzIiwiZmlsdGVyRnVuY3Rpb24iLCJyZVdoZWVsT1JNIiwibG9naW5GdW5jIiwiJG9ybSIsImdldE1vZGVsIiwibW9kTmFtZSIsInJlbGF0ZWQiLCJnZXRMb2dnZWRVc2VyIiwidXNlciIsIiRzZW5kVG9FbmRwb2ludCJdLCJtYXBwaW5ncyI6Ijs7O0lBQUEsYTtJQUVBLFNBQUFBLE9BQUEsR0FBQTtBQUFBLFFBQ0EsS0FBQUMsUUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLFFBRUEsS0FBQUMsV0FBQSxHQUFBLEVBQUEsQ0FGQTtBQUFBLEs7SUFHQSxDO0lBRUFGLE9BQUEsQ0FBQUcsU0FBQSxDQUFBQyxVQUFBLEdBQUEsVUFBQUMsT0FBQSxFQUFBO0FBQUEsUUFDQSxJQUFBQyxVQUFBLEdBQUFDLEtBQUEsQ0FBQUMsSUFBQSxDQUFBSCxPQUFBLENBQUFJLFFBQUEsRUFBQSxDQUFBLENBREE7QUFBQSxRQUVBLElBQUEsQ0FBQSxDQUFBSCxVQUFBLElBQUEsS0FBQUosV0FBQSxDQUFBLEVBQUE7QUFBQSxZQUNBLEtBQUFBLFdBQUEsQ0FBQUksVUFBQSxJQUFBRCxPQUFBLENBREE7QUFBQSxZQUVBLEtBQUFKLFFBQUEsQ0FBQVMsSUFBQSxDQUFBTCxPQUFBLEVBRkE7QUFBQSxTQUZBO0FBQUEs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QUFBO0FBQUEsb0JBQ0EsSUFBQUEsSUFBQSxLQUFBLFVBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUFvQixVQUFBLENBREE7QUFBQSxxQkFBQSxNQUVBO0FBQUEsd0JBQ0EsT0FBQUMsVUFBQSxFQUFBLENBREE7QUFBQSxxQkFIQTtBQUFBLGlCQUFBLE1BTUE7QUFBQSxvQkFDQSxPQUFBRyxNQUFBLENBQUF4QixJQUFBLENBQUEsQ0FEQTtBQUFBLGlCQVBBO0FBQUEsYUFEQTtBQUFBLFNBQUEsQ0FBQSxDQURBO0FBQUEsSztJQXVOQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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REE7QUFBQSxLQUFBLEM7SUFJQWdZLFVBQUEsQ0FBQTViLFNBQUEsQ0FBQStLLEtBQUEsR0FBQSxVQUFBQyxRQUFBLEVBQUFDLFFBQUEsRUFBQTtBQUFBLFFBQ0EsT0FBQSxLQUFBNlEsSUFBQSxDQUFBelMsVUFBQSxDQUFBMEIsS0FBQSxDQUFBQyxRQUFBLEVBQUFDLFFBQUEsQ0FBQSxDQURBO0FBQUEsS0FBQSxDIiwiZmlsZSI6InJ3dC5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gSGFuZGxlcigpe1xuICAgIHRoaXMuaGFuZGxlcnMgPSBbXTtcbiAgICB0aGlzLnN0ckhhbmRsZXJzID0ge307XG59O1xuXG5IYW5kbGVyLnByb3RvdHlwZS5hZGRIYW5kbGVyID0gZnVuY3Rpb24gKGhhbmRsZXIpe1xuICAgIHZhciBzdHJIYW5kbGVyID0gdXRpbHMuaGFzaChoYW5kbGVyLnRvU3RyaW5nKCkpO1xuICAgIGlmICghKHN0ckhhbmRsZXIgaW4gdGhpcy5zdHJIYW5kbGVycykpe1xuICAgICAgICB0aGlzLnN0ckhhbmRsZXJzW3N0ckhhbmRsZXJdID0gaGFuZGxlcjtcbiAgICAgICAgdGhpcy5oYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH1cbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApO1xuICAgIHRoaXMuaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihmdW5jKXtcbiAgICAgICAgZnVuYy5hcHBseShudWxsLGFyZ3MpO1xuICAgIH0pXG59O1xuSGFuZGxlci5wcm90b3R5cGUuaGFuZGxlQnkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgIHZhciB0aHMgPSBhcmd1bWVudHNbMF07XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KHRocyxhcmdzKTtcbiAgICB9KVxufTtcblxuXG5mdW5jdGlvbiBOYW1lZEV2ZW50TWFuYWdlciAoKXtcbiAgICB2YXIgZXZlbnRzID0ge307XG4gICAgdmFyIGhhbmRsZXJJZCA9IHt9O1xuICAgIHZhciBpZHhJZCA9IDA7XG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKG5hbWUsIGZ1bmMpe1xuICAgICAgICBpZiAoIShuYW1lIGluIGV2ZW50cykpe1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdID0gbmV3IEFycmF5KCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkID0gaWR4SWQgKys7XG4gICAgICAgIGV2ZW50c1tuYW1lXS5wdXNoKGZ1bmMpO1xuICAgICAgICBoYW5kbGVySWRbaWRdID0gZnVuYztcbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH07XG4gICAgdGhpcy5lbWl0ID0gZnVuY3Rpb24obmFtZSl7XG4gICAgICAgIGlmIChuYW1lIGluIGV2ZW50cyl7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKTtcbiAgICAgICAgICAgIGV2ZW50c1tuYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgICAgICBldmVudC5hcHBseShudWxsLGFyZ3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMudW5iaW5kID0gZnVuY3Rpb24oaGFuZGxlcil7XG4gICAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICAgIGlmIChoYW5kbGVyIGluIGhhbmRsZXJJZCl7XG4gICAgICAgICAgICB2YXIgZnVuYyA9IGhhbmRsZXJJZFtoYW5kbGVyICsgJyddO1xuICAgICAgICAgICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbiBpbiB2KXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZbbl0gPT09IGZ1bmMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWR4LnB1c2gobik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlkeC5yZXZlcnNlKCkuZm9yRWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgdi5zcGxpY2UoeCwxKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBoYW5kbGVySWRbaGFuZGxlcl07XG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENhbGwgZXZlbnQgb25jZVxuICAgICAqL1xuICAgIHRoaXMub25jZSA9IGZ1bmN0aW9uKGV2ZW50TmFtZSwgaGFuZGxlckZ1bmN0aW9uKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGhhbmRsZXIgPSB0aGlzLm9uKGV2ZW50TmFtZSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGhhbmRsZXJGdW5jdGlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgc2VsZi51bmJpbmQoaGFuZGxlcik7XG4gICAgICAgIH0pXG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2FjaGVkS2V5SWR4ID0gMDtcblxudmFyIG51bGxTdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICcnfTtcblxuZnVuY3Rpb24gbW9ja09iamVjdCgpe1xuICAgIHJldHVybiBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbih0YXJnZXQsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbmFtZSAgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSA9PT0gJ3RvU3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbFN0cmluZztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbW9ja09iamVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtuYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG59XG5cbi8qXG52YXIgJFBPU1QgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGNhbGxCYWNrLCBlcnJvckJhY2ssaGVhZGVycyl7XG4gICAgdmFyIG9wdHMgPSB7XG4gICAgICAgIGFjY2VwdHMgOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIHVybCA6IHVybCxcbiAgICAgICAgZGF0YSA6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICBkYXRhVHlwZSA6ICdqc29uJyxcbiAgICAgICAgc3VjY2VzcyA6IGNhbGxCYWNrLFxuICAgICAgICBlcnJvciA6IGVycm9yQmFjayxcbiAgICAgICAgbWV0aG9kIDogJ1BPU1QnLFxuICAgICAgICBjb250ZW50VHlwZSA6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIH07XG4gICAgaWYgKGhlYWRlcnMpe1xuICAgICAgICBvcHRzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgICAgICBvcHRzLmNyb3NzRG9tYWluID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuICQuYWpheChvcHRzKTtcbn1cblxuXG5mdW5jdGlvbiByZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgZ2V0TG9naW4pe1xuICAgIC8vIG1haW4gXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZ2V0TG9naW4gPSBnZXRMb2dpbjtcbiAgICB0aGlzLmV2ZW50cyA9IG5ldyBOYW1lZEV2ZW50TWFuYWdlcigpXG4gICAgdGhpcy4kUE9TVCA9ICRQT1NULmJpbmQodGhpcyk7XG4gICAgdGhpcy5vcHRpb25zID0ge2VuZFBvaW50IDogZW5kUG9pbnR9O1xuICAgIHRoaXMub24gPSB0aGlzLmV2ZW50cy5vbi5iaW5kKHRoaXMpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHN0YXR1cywgY2FsbEJhY2ssIGVycm9yKSB7XG4gICAgaWYgKHN0YXR1cykge1xuICAgICAgICB2YXIgaXNMb2dnZWQgPSAoc3RhdHVzLnVzZXJfaWQgJiYgIXRoaXMub3B0aW9ucy51c2VyX2lkICk7XG4gICAgICAgIGZvciAodmFyIHggaW4gc3RhdHVzKXsgdGhpcy5vcHRpb25zW3hdID0gc3RhdHVzW3hdOyB9XG4gICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgaWYgKGlzTG9nZ2VkKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50cy5lbWl0KCdsb2dpbicsIHRoaXMub3B0aW9ucy51c2VyX2lkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VyX2lkICYmIHRoaXMuZ2V0TG9naW4pe1xuICAgICAgICB2YXIgbG9nSW5mbyA9IHRoaXMuZ2V0TG9naW4oZXJyb3IpO1xuICAgICAgICBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KXtcbiAgICAgICAgICAgIHRoaXMubG9naW4obG9nSW5mby51c2VybmFtZSwgbG9nSW5mby5wYXNzd29yZClcbiAgICAgICAgICAgIC50aGVuKChmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHN0YXR1cywgY2FsbEJhY2spO1xuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH0gZWxzZSBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gUHJvbWlzZSkge1xuICAgICAgICAgICAgbG9nSW5mby50aGVuKChmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgICAgIHZhciB4ID0gdGhpcy5sb2dpbihvYmoudXNlcm5hbWUsb2JqLnBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICB2YXIgbWFuYWdlRXJyb3IgPSAoZnVuY3Rpb24oYmFkKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMobnVsbCxjYWxsQmFjayxiYWQuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pLmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKXtcbiAgICAgICAgICAgICAgICAgICAgeC50aGVuKGNhbGxCYWNrLG1hbmFnZUVycm9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB4LnRoZW4obnVsbCwgbWFuYWdlRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sodGhpcy5vcHRpb25zKTtcbiAgICB9ICAgIFxufVxuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuc3RhdHVzID0gZnVuY3Rpb24oY2FsbEJhY2ssIGZvcmNlKXtcbiAgICBpZiAoKCdsYXN0UldUU3RhdHVzJyBpbiBsb2NhbFN0b3JhZ2UpICYmICFmb3JjZSkge1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICB2YXIgc3RhdHVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhzdGF0dXMsY2FsbEJhY2spO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YXR1cyhjYWxsQmFjaywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9zdGF0dXNfY2FsbGluZyl7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuc3RhdHVzKGNhbGxCYWNrKTtcbiAgICAgICAgfSw1MCk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnRpbWVzdGFtcCl7XG4gICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHRoaXMub3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhdHVzX2NhbGxpbmcgPSB0cnVlO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiB0aGlzLiRwb3N0KCdhcGkvc3RhdHVzJyxudWxsLGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG4gICAgICAgICAgICBzZWxmLl9zdGF0dXNfY2FsbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi51cGRhdGVTdGF0dXMoc3RhdHVzLGNhbGxCYWNrKTtcbiAgICAgICAgfSk7ICAgICAgICBcbiAgICB9XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuJHBvc3QgPSBmdW5jdGlvbih1cmwsIGRhdGEsY2FsbEJhY2spe1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnRva2VuKXtcbiAgICAgICAgaWYgKCFkYXRhKXtcbiAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnRva2VuKXtcbiAgICAgICAgdmFyIGhlYWRlcnMgPSB7IFxuICAgICAgICAgICAgdG9rZW4gOiB0aGlzLm9wdGlvbnMudG9rZW4sXG4gICAgICAgICAgICBhcHBsaWNhdGlvbiA6IHRoaXMub3B0aW9ucy5hcHBsaWNhdGlvblxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBoZWFkZXJzID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLm9wdGlvbnMuZW5kUG9pbnQgKyB1cmwsIGRhdGEsIHRocy5vcHRpb25zLmFwcGxpY2F0aW9uLCB0aHMub3B0aW9ucy50b2tlbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlJywgeGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cywgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMgKyAnLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FsbEJhY2spIHsgY2FsbEJhY2soIHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCApfTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgeGhyLnN0YXR1cywgdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWpzb24tJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZURhdGEsdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWh0dHAnLHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1odHRwLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICB2YXIgdXJsID0gdGhpcy5vcHRpb25zLmVuZFBvaW50ICsgJ2FwaS9sb2dpbic7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHVybCx7IHVzZXJuYW1lOiB1c2VybmFtZSwgcGFzc3dvcmQgOiBwYXNzd29yZH0sIG51bGwsY29ubmVjdGlvbi5vcHRpb25zLnRva2VuLCB0cnVlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uLnVwZGF0ZVN0YXR1cyh4aHIucmVzcG9uc2VEYXRhKTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoc3RhdHVzKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oY2FsbEJhY2spe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgd3Njb25uZWN0ID0gZnVuY3Rpb24oc2VsZil7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uID0gbmV3IHV0aWxzLndzQ29ubmVjdChzZWxmLm9wdGlvbnMpO1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbi5vbkNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuZXZlbnRzLmVtaXQoJ3dzLWNvbm5lY3RlZCcsIHNlbGYud3NDb25uZWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uLm9uRGlzY29ubmVjdChmdW5jdGlvbigpeyBcbiAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMgJiYgc2VsZi5vcHRpb25zLnJlYWx0aW1lRW5kUG9pbnQpe1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgd3Njb25uZWN0KHNlbGYpOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9LDEwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzKChmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICBpZiAoJ3Rva2VuJyBpbiBzZWxmLm9wdGlvbnMpe1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW5nIHRvICcgKyBzZWxmLm9wdGlvbnMuZW5kUG9pbnQpO1xuICAgICAgICAgICAgaWYgKHNlbGYub3B0aW9ucy51c2VybmFtZSAmJiBzZWxmLm9wdGlvbnMucGFzc3dvcmQpe1xuICAgICAgICAgICAgICAgIHNlbGYubG9naW4oXG4gICAgICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucy51c2VybmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLnBhc3N3b3JkLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3JlbmV3aW5nIGNvbm5lY3Rpb24nKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzZWxmLm9wdGlvbnMudG9rZW4gJiYgc2VsZi5vcHRpb25zLnJlYWx0aW1lRW5kUG9pbnQgJiYgKCFzZWxmLndzQ29ubmVjdGlvbikpe1xuICAgICAgICAgICAgd3Njb25uZWN0KHNlbGYpO1xuICAgICAgICB9XG4gICAgfSkuYmluZCh0aGlzKSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9nT3V0ID0gZnVuY3Rpb24odXJsLCBjYWxsQmFjayl7XG4gICAgcmV0dXJuIHRoaXMuJHBvc3QoJ2FwaS9sb2dvdXQnLHt9LChmdW5jdGlvbihzdGF0dXMpIHtcbiAgICAgICAgaWYgKCdsYXN0UldUU3RhdHVzJyBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB7ZW5kUG9pbnQ6IHRoaXMub3B0aW9ucy5lbmRQb2ludH07XG4gICAgICAgIGlmICh0aGlzLndzQ29ubmVjdGlvbikgeyBcbiAgICAgICAgICAgIHRoaXMud3NDb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLndzQ29ubmVjdGlvbiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVybCkgeyBsb2NhdGlvbiA9IHVybDsgfVxuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgIH0pLmJpbmQodGhpcykpO1xufVxuKi9cbnZhciB1dGlscyA9IHtcbiAgICByZW5hbWVGdW5jdGlvbiA6IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICAgICAgICByZXR1cm4gKG5ldyBGdW5jdGlvbihcInJldHVybiBmdW5jdGlvbiAoY2FsbCkgeyByZXR1cm4gZnVuY3Rpb24gXCIgKyBuYW1lICtcbiAgICAgICAgICAgIFwiICgpIHsgcmV0dXJuIGNhbGwodGhpcywgYXJndW1lbnRzKSB9OyB9O1wiKSgpKShGdW5jdGlvbi5hcHBseS5iaW5kKGZuKSk7XG4gICAgfSxcbiAgICBjYWNoZWQgOiBmdW5jdGlvbihmdW5jLCBrZXkpe1xuICAgICAgICBpZiAoIWtleSl7ICAgIFxuICAgICAgICAgICAga2V5ID0gJ18nICsgY2FjaGVkS2V5SWR4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gd3JhcHBlcigpe1xuICAgICAgICAgICAgaWYgKCF0aGlzW2tleV0pe1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IGZ1bmMuY2FsbCh0aGlzLFthcmd1bWVudHNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzW2tleV07XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB3cmFwcGVyO1xuICAgIH0sXG4vLyAgICAkUE9TVCA6ICRQT1NULFxuLy8gICAgcmVXaGVlbENvbm5lY3Rpb246IHJlV2hlZWxDb25uZWN0aW9uLFxuICAgIGxvZzogZnVuY3Rpb24oKXsgXG4gICAgICAgIGNvbnNvbGUubG9nKGFyZ3VtZW50cyk7XG4gICAgfSxcblxuICAgIHhkcjogZnVuY3Rpb24gKHVybCwgZGF0YSwgYXBwbGljYXRpb24sdG9rZW4sIGZvcm1FbmNvZGUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ha2UgYW4gSFRUUCBSZXF1ZXN0IGFuZCByZXR1cm4gaXRzIHByb21pc2UuXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciByZXE7XG4gICAgICAgICAgICBpZiAoIWRhdGEpIHsgZGF0YSA9IHt9O31cblxuICAgICAgICAgICAgaWYoWE1MSHR0cFJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZURhdGEgPSBKU09OLnBhcnNlKHJlcS5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoYSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB7cmVzcG9uc2VEYXRhOiByZXNwb25zZURhdGEsIHJlc3BvbnNlVGV4dDogcmVxLnJlc3BvbnNlVGV4dCxzdGF0dXM6IHJlcS5zdGF0dXMsIHJlcXVlc3Q6IHJlcX07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVxLnN0YXR1cyA+PSAyMDAgJiYgcmVxLnN0YXR1cyA8IDQwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmKFhEb21haW5SZXF1ZXN0KXtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWERvbWFpblJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXEucmVzcG9uc2VUZXh0LHJlcS5zdGF0dXNUZXh0LCByZXEpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0NPUlMgbm90IHN1cHBvcnRlZCcpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxLm9wZW4oJ1BPU1QnLCB1cmwsIHRydWUpO1xuICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgaWYgKHRva2VuKSB7IGRhdGEuX190b2tlbl9fID0gdG9rZW4gfVxuICAgICAgICAgICAgaWYgKCFmb3JtRW5jb2RlKXtcbiAgICAgICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLnNpemUoKT9KU09OLnN0cmluZ2lmeShkYXRhKTonJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUkkodi50b1N0cmluZygpKTsgIFxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKS5qb2luKCcmJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXEuc2VuZChkYXRhKTtcbiAgICAvLyAgICAgICAgcmVxLnNlbmQobnVsbCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBjYXBpdGFsaXplIDogZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgcmV0dXJuIHNbMF0udG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICB9LFxuXG4gICAgaGFzaCA6IGZ1bmN0aW9uKHN0cil7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIYXNoZWQgZnVuY3Rpb25cbiAgICAgICAgICovXG4gICAgICAgIHN0ciA9IHN0ci50b1N0cmluZygpO1xuICAgICAgICB2YXIgcmV0ID0gMTtcbiAgICAgICAgZm9yICh2YXIgeCA9IDA7eDxzdHIubGVuZ3RoO3grKyl7XG4gICAgICAgICAgICByZXQgKj0gKDEgKyBzdHIuY2hhckNvZGVBdCh4KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChyZXQgJSAzNDk1ODM3NDk1NykudG9TdHJpbmcoKTtcbiAgICB9LFxuXG4gICAgbWFrZUZpbHRlciA6IGZ1bmN0aW9uIChtb2RlbCwgZmlsdGVyLCB1bmlmaWVyLCBkb250VHJhbnNsYXRlRmlsdGVyKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlIGZpbHRlciBmb3IgQXJyYXkuZmlsdGVyIGZ1bmN0aW9uIGFzIGFuIGFuZCBvZiBvclxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKCF1bmlmaWVyKSB7IHVuaWZpZXIgPSAnICYmICc7fVxuICAgICAgICBpZiAoTGF6eShmaWx0ZXIpLnNpemUoKSA9PT0gMCl7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCl7IHJldHVybiB0cnVlIH07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNvdXJjZSA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odmFscywgZmllbGQpe1xuICAgICAgICAgICAgaWYgKCF2YWxzKSB7IHZhbHMgPSBbbnVsbF19XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFscykpe1xuICAgICAgICAgICAgICAgIHZhbHMgPSBbdmFsc107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWRvbnRUcmFuc2xhdGVGaWx0ZXIgJiYgKG1vZGVsLmZpZWxkc1tmaWVsZF0udHlwZSA9PT0gJ3JlZmVyZW5jZScpKSB7XG4gICAgICAgICAgICAgICAgZmllbGQgPSAnXycgKyBmaWVsZDtcbiAgICAgICAgICAgICAgICB2YWxzID0gTGF6eSh2YWxzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgIGlmICh4ICYmICh4LmNvbnN0cnVjdG9yICE9PSBOdW1iZXIpKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmlkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vZGVsLmZpZWxkc1tmaWVsZF0udHlwZSA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgIHZhbHMgPSB2YWxzLm1hcChKU09OLnN0cmluZ2lmeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJygnICsgIExhenkodmFscykubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgIHJldHVybiAnKHguJyArIGZpZWxkICsgJyA9PT0gJyArIHggKyAnKSc7XG4gICAgICAgICAgICB9KS5qb2luKCcgfHwgJykgICsnKSc7XG4gICAgICAgIH0pLnRvQXJyYXkoKS5qb2luKHVuaWZpZXIpO1xuICAgICAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKFwieFwiLCBcInJldHVybiBcIiArIHNvdXJjZSk7XG4gICAgfSxcblxuICAgIHNhbWVBcyA6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWVwIGVxdWFsXG4gICAgICAgICAqL1xuICAgICAgICBmb3IgKHZhciBrIGluIHgpIHtcbiAgICAgICAgICAgIGlmICh5W2tdICE9IHhba10pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBcbiAgICBwbHVyYWxpemUgOiBmdW5jdGlvbihzdHIsIG1vZGVsKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIExleGljYWxseSByZXR1cm5zIGVuZ2xpc2ggcGx1cmFsIGZvcm1cbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBzdHIgKyAncyc7XG4gICAgfSxcblxuICAgIGJlZm9yZUNhbGwgOiBmdW5jdGlvbihmdW5jLCBiZWZvcmUpe1xuICAgICAgICB2YXIgZGVjb3JhdG9yID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGJlZm9yZSgpLnRoZW4oZnVuYylcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGRlY29yYXRvcjtcbiAgICB9LFxuXG4gICAgY2xlYW5TdG9yYWdlIDogZnVuY3Rpb24oKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENsZWFuIGxvY2FsU3RvcmFnZSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIExhenkobG9jYWxTdG9yYWdlKS5rZXlzKCkuZWFjaChmdW5jdGlvbihrKXtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2Vba107XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICByZXZlcnNlIDogZnVuY3Rpb24gKGNociwgc3RyKSB7XG4gICAgICAgIHJldHVybiBzdHIuc3BsaXQoY2hyKS5yZXZlcnNlKCkuam9pbihjaHIpO1xuICAgIH0sXG4gICAgcGVybXV0YXRpb25zOiBmdW5jdGlvbihhcnIpe1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGZvciAodmFyIHggPSBhcnIubGVuZ3RoLTE7IHggPj0gMDt4LS0pe1xuICAgICAgICAgICAgZm9yICh2YXIgeSA9IGFyci5sZW5ndGgtMTsgeSA+PSAwOyB5LS0pe1xuICAgICAgICAgICAgICAgIGlmICh4ICE9PSB5KVxuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChbYXJyW3hdLCBhcnJbeV1dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG5cbiAgICBib29sOiBCb29sZWFuLFxuXG4gICAgbm9vcCA6IGZ1bmN0aW9uKCl7fSxcblxuICAgIHR6T2Zmc2V0OiBuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCxcblxuICAgIHRyYW5zRmllbGRUeXBlOiB7XG4gICAgICAgIGRhdGU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG5ldyBEYXRlKHggKiAxMDAwICsgdXRpbHMudHpPZmZzZXQgKSB9LFxuICAgICAgICBkYXRldGltZTogZnVuY3Rpb24oeCkgeyByZXR1cm4gbmV3IERhdGUoeCAqIDEwMDAgKyB1dGlscy50ek9mZnNldCApIH0sXG4gICAgICAgIHN0cmluZzogZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b1N0cmluZygpOyB9LFxuICAgICAgICB0ZXh0OiBmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvU3RyaW5nKCk7IH0sXG4gICAgICAgIGludGVnZXI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBhcnNlSW50KHgpOyB9LFxuICAgICAgICBmbG9hdDogZnVuY3Rpb24oeCkgeyByZXR1cm4gcGFyc2VGbG9hdCh4KTsgfVxuICAgIH0sIFxuICAgIG1vY2sgOiBtb2NrT2JqZWN0XG59O1xuXG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgU1RBVFVTS0VZID0gJ2xhc3RSV1RDb25uZWN0aW9uU3RhdHVzJztcblxuZnVuY3Rpb24gUmVhbHRpbWVDb25uZWN0aW9uKGVuZFBvaW50LCByd3RDb25uZWN0aW9uKXtcbiAgICAvKipcbiAgICAgKiBDb25uZWN0cyBhIHdlYnNvY2tldCB3aXRoIHJlV2hlZWwgY29ubmVjdGlvblxuICAgICAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBjb25uZWN0aW9uID0gbmV3IFNvY2tKUyhlbmRQb2ludCk7XG4gICAgY29ubmVjdGlvbi5vbm9wZW4gPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICBjb25zb2xlLmxvZygnb3BlbiA6ICcgKyB4KTtcbiAgICAgICAgY29ubmVjdGlvbi50ZW5hbnQoKTtcbiAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1jb25uZWN0aW9uLW9wZW4nLHgpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAoeC50eXBlID09ICdtZXNzYWdlJykge1xuICAgICAgICAgICAgLy8kLm5vdGlmeSh4LmRhdGEpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvL1RPRE8gc2V0IGZyb21SZWFsdGltZVxuICAgICAgICAgICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtbWVzc2FnZS1qc29uJywgSlNPTi5wYXJzZSh4LmRhdGEpKTtcbiAgICAgICAgICAgICAgICAvL1RPRE8gdW5zZXQgZnJvbVJlYWx0aW1lXG4gICAgICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLW1lc3NhZ2UtdGV4dCcsIEpTT04ucGFyc2UoeC5kYXRhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZnJvbSByZWFsdGltZSAnLHgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9uY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNldFRpbWVvdXQodXRpbHMud3NDb25uZWN0LDEwMDApO1xuICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLWNvbm5lY3Rpb24tY2xvc2VkJyk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLnRlbmFudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29ubmVjdGlvbi5zZW5kKCdURU5BTlQ6JyArIHJ3dENvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLmFwcGxpY2F0aW9uICsgJzonICsgcnd0Q29ubmVjdGlvbi5jYWNoZWRTdGF0dXMudG9rZW4pO1xuICAgIH1cbiAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICB9XG59ICAgIFxuXG5mdW5jdGlvbiByZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgZ2V0TG9naW4pe1xuICAgIC8qKlxuICAgICAqIENvbm5lY3Rpb24gYmFzaWMgZm9yIHJlV2hlZWxcbiAgICAgKiBAcGFyYW0gZW5kUG9pbnQ6IHN0cmluZyBiYXNlIHVybCBmb3IgYWxsIGNvbXVuaWNhdGlvblxuICAgICAqIEBwYXJhbSBnZXRMb2dpbjogZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGluIGNhc2Ugb2YgbWlzc2luZyBsb2dpbi5cbiAgICAgKiAgdGhpcyBmdW5jdGlvbiBjb3VsZCByZXR1cm4gOlxuICAgICAqICAtICAgYSB7IHVzZXJuYW1lIDogPHVzZXJuYW1lPiAsIHBhc3N3b3JkOiA8cGFzc3dvcmQ+fSBvclxuICAgICAqICAtICAgYiBQcm9taXNlIC0+IHsgdXNlcm5hbWUgOiA8dXNlcm5hbWU+ICwgcGFzc3dvcmQ6IDxwYXNzd29yZD59XG4gICAgICovXG4gICAgLy8gbWFpbiBpbml0aWFsaXphdGlvblxuICAgIHZhciBldmVudHMgPSBuZXcgTmFtZWRFdmVudE1hbmFnZXIoKTtcbiAgICB0aGlzLmdldExvZ2luID0gZ2V0TG9naW47XG4gICAgdGhpcy5lbmRQb2ludCA9IGVuZFBvaW50LmVuZHNXaXRoKCcvJyk/IGVuZFBvaW50OiAoZW5kUG9pbnQgKyAnLycpO1xuICAgIHRoaXMub24gPSBldmVudHMub247XG4gICAgdGhpcy51bmJpbmQgPSBldmVudHMudW5iaW5kO1xuICAgIHRoaXMuZW1pdCA9IGV2ZW50cy5lbWl0O1xuICAgIHRoaXMub25jZSA9IGV2ZW50cy5vbmNlO1xuICAgIHRoaXMuY2FjaGVkU3RhdHVzID0ge307XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlO1xuICAgIHRoaXMuaXNMb2dnZWRJbiA9IGZhbHNlO1xuICAgIC8vIHJlZ2lzdGVyaW5nIHVwZGF0ZSBzdGF0dXNcbiAgICB2YXIgdGhzID0gdGhpcztcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS4kcG9zdCA9IGZ1bmN0aW9uKHVybCwgZGF0YSxjYWxsQmFjayl7XG4gICAgLyoqXG4gICAgICogQUpBWCBjYWxsIGZvciBmZXRjaCBhbGwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAqIEBwYXJhbSB1cmw6IGxhc3QgdXJsIHBhcnQgZm9yIGFqYXggY2FsbFxuICAgICAqIEBwYXJhbSBkYXRhOiBkYXRhIG9iamVjdCB0byBiZSBzZW50XG4gICAgICogQHBhcmFtIGNhbGxCYWNrOiBmdW5jdGlvbih4aHIpIHdpbGwgYmUgY2FsbGVkIHdoZW4gZGF0YSBhcnJpdmVzXG4gICAgICogQHJldHVybnMgUHJvbWlzZTx4aHI+IHNhbWUgb2YgY2FsbEJhY2tcbiAgICAgKi9cbiAgICAvLyBpbml0aWFsaXphdGlvblxuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih0aHMuZW5kUG9pbnQgKyB1cmwsIGRhdGEsIHRocy5jYWNoZWRTdGF0dXMuYXBwbGljYXRpb24sIHRocy5jYWNoZWRTdGF0dXMudG9rZW4pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHRocy5lbWl0KCdodHRwLXJlc3BvbnNlJywgeGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cywgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB0aHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzICsgJy1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7IGNhbGxCYWNrKCB4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQgKX07XG4gICAgICAgICAgICAgICAgYWNjZXB0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgeGhyLnN0YXR1cywgdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItanNvbi0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlRGF0YSx1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1odHRwJyx4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1odHRwLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnN0YXR1cyA9IGZ1bmN0aW9uKGNhbGxCYWNrLCBmb3JjZSkge1xuICAgIC8qKlxuICAgICAqIENoZWNrIGN1cnJlbnQgc3RhdHVzIGFuZCBjYWxsYmFjayBmb3IgcmVzdWx0cy5cbiAgICAgKiBJdCBjYWNoZXMgcmVzdWx0cyBmb3IgZnVydGhlci5cbiAgICAgKiBAcGFyYW0gY2FsbGJhY2s6IChzdGF0dXMgb2JqZWN0KVxuICAgICAqIEBwYXJhbSBmb3JjZTogYm9vbGVhbiBpZiB0cnVlIGVtcHRpZXMgY2FjaGUgIFxuICAgICAqIEByZXR1cm4gdm9pZFxuICAgICAqL1xuICAgIC8vIGlmIGZvcmNlLCBjbGVhciBhbGwgY2FjaGVkIHZhbHVlc1xuICAgIGlmIChmb3JjZSkge1xuICAgICAgICB0aGlzLmNhY2hlZFN0YXR1cyA9IHt9O1xuICAgICAgICBpZiAoU1RBVFVTS0VZIGluIGxvY2FsU3RvcmFnZSl7XG4gICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW1NUQVRVU0tFWV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gdHJ5IGZvciB2YWx1ZSByZXNvbHV0aW9uXG4gICAgLy8gZmlyc3Qgb24gbWVtb3J5XG4gICAgaWYgKExhenkodGhpcy5jYWNoZWRTdGF0dXMpLnNpemUoKSl7XG4gICAgXG4gICAgLy8gdGhlbiBpbiBsb2NhbFN0b3JhZ2VcbiAgICB9IGVsc2UgaWYgKFNUQVRVU0tFWSBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbU1RBVFVTS0VZXSkpO1xuICAgIC8vIHRoZW4gb24gc2VydmVyXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHRoaXMuJHBvc3QoJ2FwaS9zdGF0dXMnLHt9LCBmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgY2FsbEJhY2soc3RhdHVzKTtcbiAgICAgICAgICAgIHRocy51cGRhdGVTdGF0dXMoc3RhdHVzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGRvZXNuJ3QgY2FsbCBjYWxsYmFja1xuICAgICAgICByZXR1cm5cbiAgICB9XG4gICAgY2FsbEJhY2sodGhpcy5jYWNoZWRTdGF0dXMpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IEJvb2xlYW4oc3RhdHVzLnRva2VuKTtcbiAgICB0aGlzLmlzTG9nZ2VkSW4gPSBCb29sZWFuKHN0YXR1cy51c2VyX2lkKTtcbiAgICB2YXIgb2xkU3RhdHVzID0gdGhpcy5jYWNoZWRTdGF0dXM7XG4gICAgdGhpcy5jYWNoZWRTdGF0dXMgPSBzdGF0dXM7XG4gICAgaWYgKCFvbGRTdGF0dXMudXNlcl9pZCAmJiBzdGF0dXMudXNlcl9pZCl7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9nZ2VkLWluJyxzdGF0dXMudXNlcl9pZCk7XG4gICAgfSBlbHNlIGlmIChvbGRTdGF0dXMudXNlcl9pZCAmJiAhc3RhdHVzLnVzZXJfaWQpe1xuICAgICAgICB0aGlzLmVtaXQoJ2xvZ2dlZC1vdXQnKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNDb25uZWN0ZWQgJiYgIXRoaXMuaXNMb2dnZWRJbil7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9naW4tcmVxdWlyZWQnKTtcbiAgICAgICAgaWYgKHRoaXMuZ2V0TG9naW4pe1xuICAgICAgICAgICAgdmFyIGxvZ2luSW5mbyA9IHRoaXMuZ2V0TG9naW4oKTtcbiAgICAgICAgICAgIGlmIChsb2dpbkluZm8uY29uc3RydWN0b3IgPT09IE9iamVjdCl7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dpbihsb2dpbkluZm8udXNlcm5hbWUsIGxvZ2luSW5mby5wYXNzd29yZCwgbG9naW5JbmZvLmNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9naW5JbmZvLmNvbnN0cnVjdG9yID09PSBQcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgbG9naW5JbmZvLnRoZW4oZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2dpbihvYmoudXNlcm5hbWUsIG9iai5wYXNzd29yZCwgb2JqLmNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIHJlYWx0aW1lIGNvbm5lY3Rpb24gaXMgc2V0dGVkXG4gICAgaWYgKCFvbGRTdGF0dXMucmVhbHRpbWVFbmRQb2ludCAmJiBzdGF0dXMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICB0aGlzLndzQ29ubmVjdGlvbiA9IG5ldyBSZWFsdGltZUNvbm5lY3Rpb24oc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQsIHRoaXMpO1xuICAgIC8vIHJlYWx0aW1lIGNvbm5lY3Rpb24gaXMgY2xvc2VkXG4gICAgfSBlbHNlIGlmIChvbGRTdGF0dXMucmVhbHRpbWVFbmRQb2ludCAmJiAhc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICAgICAgZGVsZXRlIHRoaXMud3NDb25uZWN0aW9uO1xuICAgIH1cbiAgICB0aGlzLmVtaXQoJ3VwZGF0ZS1jb25uZWN0aW9uLXN0YXR1cycsIHN0YXR1cywgb2xkU3RhdHVzKTtcbiAgICBsb2NhbFN0b3JhZ2VbU1RBVFVTS0VZXSA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG59XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCl7XG4gICAgLyoqXG4gICAgICogbWFrZSBsb2dpbiBhbmQgcmV0dXJuIGEgcHJvbWlzZS4gSWYgbG9naW4gc3VjY2VkLCBwcm9taXNlIHdpbGwgYmUgYWNjZXB0ZWRcbiAgICAgKiBJZiBsb2dpbiBmYWlscyBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aCBlcnJvclxuICAgICAqIEBwYXJhbSB1c2VybmFtZTogdXNlcm5hbWVcbiAgICAgKiBAcGFyYW0gcGFzc3dvcmQ6IHBhc3N3b3JkXG4gICAgICogQHJldHVybiBQcm9taXNlICh1c2VyIG9iamVjdClcbiAgICAgKi9cbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLmVuZFBvaW50ICsgJ2FwaS9sb2dpbicsIHt1c2VybmFtZTogdXNlcm5hbWUgfHwgJycsIHBhc3N3b3JkOiBwYXNzd29yZCB8fCAnJ30sbnVsbCx0aHMuY2FjaGVkU3RhdHVzLnRva2VuLCB0cnVlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgc3RhdHVzXG4gICAgICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyh4aHIucmVzcG9uc2VEYXRhKTtcbiAgICAgICAgICAgICAgICAvLyBjYWxsIHdpdGggdXNlciBpZFxuICAgICAgICAgICAgICAgIGFjY2VwdCh7c3RhdHVzIDogJ3N1Y2Nlc3MnLCB1c2VyaWQ6IHRocy5jYWNoZWRTdGF0dXMudXNlcl9pZH0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgZXJyb3IgY2FsbCBlcnJvciBtYW5hZ2VyIHdpdGggZXJyb3JcbiAgICAgICAgICAgICAgICBhY2NlcHQoe2Vycm9yOiB4aHIucmVzcG9uc2VEYXRhLmVycm9yLCBzdGF0dXM6ICdlcnJvcid9KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KSB7XG4gICAgICAgIHRocy4kcG9zdCgnYXBpL2xvZ291dCcpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihvayl7XG4gICAgICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyh7fSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtTVEFUVVNLRVldO1xuICAgICAgICAgICAgICAgIGFjY2VwdCgpXG4gICAgICAgICAgICB9LCByZWplY3QpO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbihjYWxsQmFjaykge1xuICAgIGlmICh0aGlzLmlzTG9nZ2VkSW4pIHtcbiAgICAgICAgY2FsbEJhY2sodGhpcy5jYWNoZWRTdGF0dXMudXNlcl9pZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gd2FpdCBmb3IgbG9naW5cbiAgICAgICAgdGhpcy5vbmNlKCdsb2dnZWQtaW4nLGZ1bmN0aW9uKHVzZXJfaWQpe1xuICAgICAgICAgICAgY2FsbEJhY2sodXNlcl9pZCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnN0YXR1cyh1dGlscy5ub29wKTtcbiAgICB9XG59XG5cbnV0aWxzLnJlV2hlZWxDb25uZWN0aW9uID0gcmVXaGVlbENvbm5lY3Rpb247IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBUb3VjaGVyKCl7XG4gICAgdmFyIHRvdWNoZWQgPSBmYWxzZVxuICAgIHRoaXMudG91Y2ggPSBmdW5jdGlvbigpe1xuICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcbiAgICB9O1xuICAgIHRoaXMudG91Y2hlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB0ID0gdG91Y2hlZDtcbiAgICAgICAgdG91Y2hlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gdDtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cblxuZnVuY3Rpb24gVmFjdXVtQ2FjaGVyKHRvdWNoLCBhc2tlZCwgbmFtZSwgcGtJbmRleCl7XG4vKlxuICAgIGlmIChuYW1lKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdjcmVhdGVkIFZhY3V1bUNhY2hlciBhcyAnICsgbmFtZSk7XG4gICAgfVxuKi9cbiAgICBpZiAoIWFza2VkKXtcbiAgICAgICAgdmFyIGFza2VkID0gW107XG4gICAgfVxuICAgIHZhciBtaXNzaW5nID0gW107XG4gICAgXG4gICAgdGhpcy5hc2sgPSBmdW5jdGlvbiAoaWQsbGF6eSl7XG4gICAgICAgIGlmIChwa0luZGV4ICYmIChpZCBpbiBwa0luZGV4LnNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIUxhenkoYXNrZWQpLmNvbnRhaW5zKGlkKSl7XG4vLyAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnYXNraW5nICgnICsgaWQgKyAnKSBmcm9tICcgKyBuYW1lKTtcbiAgICAgICAgICAgIG1pc3NpbmcucHVzaChpZCk7XG4gICAgICAgICAgICBpZiAoIWxhenkpXG4gICAgICAgICAgICAgICAgYXNrZWQucHVzaChpZCk7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICB9IFxuLy8gICAgICAgIGVsc2UgY29uc29sZS53YXJuKCcoJyArIGlkICsgJykgd2FzIGp1c3QgYXNrZWQgb24gJyArIG5hbWUpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEFza2VkSW5kZXggPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gYXNrZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5taXNzaW5ncyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBMYXp5KG1pc3Npbmcuc3BsaWNlKDAsbWlzc2luZy5sZW5ndGgpKS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgfVxufVxuIiwiZnVuY3Rpb24gQXV0b0xpbmtlcihhY3RpdmVzLCBJREIsIFcyUFJFU09VUkNFLCBsaXN0Q2FjaGUpe1xuICAgIHZhciB0b3VjaCA9IG5ldyBUb3VjaGVyKCk7XG4gICAgdmFyIG1haW5JbmRleCA9IHt9O1xuICAgIHZhciBmb3JlaWduS2V5cyA9IHt9O1xuICAgIHZhciBtMm0gPSB7fTtcbiAgICB2YXIgbTJtSW5kZXggPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbnMgPSB7fTtcbiAgICB0aGlzLm1haW5JbmRleCA9IG1haW5JbmRleDtcbiAgICB0aGlzLmZvcmVpZ25LZXlzID0gZm9yZWlnbktleXM7XG4gICAgdGhpcy5tMm0gPSBtMm07XG4gICAgdGhpcy5tMm1JbmRleCA9IG0ybUluZGV4O1xuICAgIHRoaXMucGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucztcblxuICAgIFcyUFJFU09VUkNFLm9uKCdtb2RlbC1kZWZpbml0aW9uJyxmdW5jdGlvbihtb2RlbCwgaW5kZXgpe1xuICAgICAgICAvLyBkZWZpbmluZyBhbGwgaW5kZXhlcyBmb3IgcHJpbWFyeSBrZXlcbiAgICAgICAgdmFyIHBrSW5kZXggPSBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IobW9kZWwubmFtZSwgJ2lkJyk7XG4gICAgICAgIG1haW5JbmRleFttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIHBrSW5kZXgsICdtYWluSW5kZXguJyArIG1vZGVsLm5hbWUsIGluZGV4KTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0aW5nIHBlcm1pc3Npb24gaW5kZXhlc1xuICAgICAgICBwZXJtaXNzaW9uc1ttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwgJ3Blcm1pc3Npb25zLicgKyBtb2RlbC5uYW1lKTtcblxuICAgICAgICAvLyBjcmVhdGluZyBpbmRleGVzIGZvciBmb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uKHJlZmVyZW5jZSl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWwubmFtZSArICdfJyArIHJlZmVyZW5jZS5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IocmVmZXJlbmNlLnRvLCAnaWQnKSwgcmVmZXJlbmNlLnRvICsgJy5pZCBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGNyZWF0aW5nIHJldmVyc2UgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkO1xuICAgICAgICAgICAgZm9yZWlnbktleXNbaW5kZXhOYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIGxpc3RDYWNoZS5nZXRJbmRleEZvcihmaWVsZC5ieSxmaWVsZC5pZCksIGZpZWxkLmJ5ICsgJy4nICsgZmllbGQuaWQgKyAnIGZvcmVpZ25LZXlzLicgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtb2RlbC5tYW55VG9NYW55KS5lYWNoKGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm0pKVxuICAgICAgICAgICAgICAgIG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdID0gW25ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUgKyAnWzBdJyksIG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUrJ1sxXScpXTtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm1JbmRleCkpXG4gICAgICAgICAgICAgICAgbTJtSW5kZXhbcmVsYXRpb24uaW5kZXhOYW1lXSA9IG5ldyBNYW55VG9NYW55UmVsYXRpb24ocmVsYXRpb24sbTJtW3JlbGF0aW9uLmluZGV4TmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgbTJtR2V0ID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayl7XG4gICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KChuID8gdXRpbHMucmV2ZXJzZSgnLycsIGluZGV4TmFtZSkgOiBpbmRleE5hbWUpICsgJ3MnICsgJy9saXN0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgZGVsZXRlIGFjdGl2ZXNbaW5kZXhOYW1lXVxuICAgICAgICB9KTsgICAgICAgIFxuICAgIH07XG5cbiAgICB2YXIgZ2V0TTJNID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBjb2xsZWN0aW9uLCBuLCBjYWxsQmFjayl7XG4gICAgICAgIC8vIGFzayBhbGwgaXRlbXMgaW4gY29sbGVjdGlvbiB0byBtMm0gaW5kZXhcbiAgICAgICAgTGF6eShjb2xsZWN0aW9uKS5lYWNoKG0ybVtpbmRleE5hbWVdW25dLmFzay5iaW5kKG0ybVtpbmRleE5hbWVdW25dKSk7XG4gICAgICAgIC8vIHJlbmV3aW5nIGNvbGxlY3Rpb24gd2l0aG91dCBhc2tlZFxuICAgICAgICBjb2xsZWN0aW9uID0gbTJtW2luZGV4TmFtZV1bbl0ubWlzc2luZ3MoKTtcbiAgICAgICAgLy8gY2FsbGluZyByZW1vdGUgZm9yIG0ybSBjb2xsZWN0aW9uIGlmIGFueVxuICAgICAgICBpZiAoY29sbGVjdGlvbi5sZW5ndGgpe1xuICAgICAgICAgICAgYWN0aXZlc1tpbmRleE5hbWVdID0gMTtcbiAgICAgICAgICAgIG0ybUdldChpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGNhbGxCYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuZ2V0TTJNID0gZ2V0TTJNO1xuXG4gICAgdmFyIGxpbmtVbmxpbmtlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIHBlcmZvcm0gYSBEYXRhQmFzZSBzeW5jaHJvbml6YXRpb24gd2l0aCBzZXJ2ZXIgbG9va2luZyBmb3IgdW5rbm93biBkYXRhXG4gICAgICAgIGlmICghdG91Y2gudG91Y2hlZCgpKSByZXR1cm47XG4gICAgICAgIGlmIChMYXp5KGFjdGl2ZXMpLnZhbHVlcygpLnN1bSgpKSB7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGluZGV4ZXMsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICBMYXp5KGluZGV4ZXMpLmVhY2goZnVuY3Rpb24gKGluZGV4LG4pIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IGluZGV4Lm1pc3NpbmdzKCk7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IExhenkoY29sbGVjdGlvbikuZmlsdGVyKEJvb2xlYW4pLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIElOREVYID0gbTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdldHRlciA9IElOREVYWydnZXQnICsgKDEgLSBuKV0uYmluZChJTkRFWCk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBjb2xsZWN0aW9uLm1hcChnZXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvdGhlckluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcvJylbMSAtIG5dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG90aGVySW5kZXgsZnVuY3Rpb24oKXtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2gobWFpbkluZGV4W290aGVySW5kZXhdLmFzayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoaWRzKS5mbGF0dGVuKCkudW5pcXVlKCkuZWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1haW5JbmRleFtvdGhlckluZGV4XS5hc2soeCx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtYWluSW5kZXgpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIHZhciBpZHMgPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgaWRiID0gbW9kZWxOYW1lIGluIElEQiA/IElEQlttb2RlbE5hbWVdLmtleXMoKSA6IExhenkoKTtcbiAgICAgICAgICAgICAgICAvL2xvZygnbGlua2luZy4nICsgbW9kZWxOYW1lICsgJyA9ICcgKyBXMlBSRVNPVVJDRS5saW5raW5nLnNvdXJjZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIHtpZDogaWRzfSxudWxsLHV0aWxzLm5vb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gRm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkoZm9yZWlnbktleXMpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICAgICAgICByZXR1cm4gdlsxXS5sZW5ndGhcbiAgICAgICAgfSkuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICB2YXIgaWRzID0geFsxXTtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSB4WzBdO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgbWFpblJlc291cmNlID0gaW5kZXhbMF07XG4gICAgICAgICAgICB2YXIgZmllbGROYW1lID0gaW5kZXhbMV07XG4gICAgICAgICAgICB2YXIgZmlsdGVyID0ge307XG4gICAgICAgICAgICBmaWx0ZXJbZmllbGROYW1lXSA9IGlkcztcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1haW5SZXNvdXJjZSwgZmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBMYXp5KExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgcmV0dXJuIFtrLCB2Lm1pc3NpbmdzKCldXG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLnRvT2JqZWN0KCkpLmVhY2goZnVuY3Rpb24gKGlkcywgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICBhY3RpdmVzW3Jlc291cmNlTmFtZV0gPSAxO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHJlc291cmNlTmFtZSArICcvbXlfcGVybXMnLCB7aWRzOiBMYXp5KGlkcykudW5pcXVlKCkudG9BcnJheSgpfSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoZGF0YS5QRVJNSVNTSU9OUyk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW3Jlc291cmNlTmFtZV1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHNldEludGVydmFsKGxpbmtVbmxpbmtlZCw1MCk7XG59O1xuXG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBMaXN0Q2FjaGVyKCl7XG4gICAgdmFyIGdvdEFsbCA9IHt9O1xuICAgIHZhciBhc2tlZCA9IHt9OyAvLyBtYXAgb2YgYXJyYXlcbiAgICB2YXIgY29tcG9zaXRlQXNrZWQgPSB7fTtcbiAgICB2YXIgY2FydGVzaWFuUHJvZHVjdDEgPSBmdW5jdGlvbih4LHksaXNBcnJheSl7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgaWYgKGlzQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4geCl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYiBpbiB5KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goTGF6eShbeFthXSx5W2JdXSkuZmxhdHRlbigpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgYSBpbiB4KXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBiIGluIHkpe1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChbeFthXSx5W2JdXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICB2YXIgY2FydGVzaWFuUHJvZHVjdCA9IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciBpc0FycmF5ID0gZmFsc2U7XG4gICAgICAgIHZhciByZXQgPSBhcnJbMF07IFxuICAgICAgICBmb3IgKHZhciB4ID0gMTsgeCA8IGFyci5sZW5ndGg7ICsreCl7XG4gICAgICAgICAgICByZXQgPSBjYXJ0ZXNpYW5Qcm9kdWN0MShyZXQsIGFyclt4XSwgaXNBcnJheSk7XG4gICAgICAgICAgICBpc0FycmF5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgICB2YXIgZXhwbG9kZUZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICB2YXIgcHJvZHVjdCA9IGNhcnRlc2lhblByb2R1Y3QoTGF6eShmaWx0ZXIpLnZhbHVlcygpLnRvQXJyYXkoKSk7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLmtleXMoKS50b0FycmF5KCk7XG4gICAgICAgIHJldHVybiBwcm9kdWN0Lm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhciByID0ge307XG4gICAgICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oYSxuKXtcbiAgICAgICAgICAgICAgICByW2FdID0geFtuXTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH07XG4gICAgdmFyIGZpbHRlclNpbmdsZSA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIsIHRlc3RPbmx5KXtcbiAgICAgICAgLy8gTGF6eSBhdXRvIGNyZWF0ZSBpbmRleGVzXG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG4gICAgICAgIHZhciBnZXRJbmRleEZvciA9IHRoaXMuZ2V0SW5kZXhGb3I7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2LGtleSl7IHJldHVybiBba2V5LCBtb2RlbE5hbWUgKyAnLicgKyBrZXldOyB9KS50b09iamVjdCgpO1xuICAgICAgICB2YXIgaW5kZXhlcyA9IExhenkoZmlsdGVyKS5rZXlzKCkubWFwKGZ1bmN0aW9uKGtleSl7IHJldHVybiBba2V5LCBnZXRJbmRleEZvcihtb2RlbE5hbWUsIGtleSldfSkudG9PYmplY3QoKTsgXG4gICAgICAgIC8vIGZha2UgZm9yIChpdCB3aWxsIGN5Y2xlIG9uY2UpXG4gICAgICAgIGZvciAodmFyIHggaW4gZmlsdGVyKXtcbiAgICAgICAgICAgIC8vIGdldCBhc2tlZCBpbmRleCBhbmQgY2hlY2sgcHJlc2VuY2VcbiAgICAgICAgICAgIHZhciBkaWZmZXJlbmNlID0gTGF6eShmaWx0ZXJbeF0pLmRpZmZlcmVuY2UoaW5kZXhlc1t4XSkudG9BcnJheSgpO1xuICAgICAgICAgICAgaWYgKGRpZmZlcmVuY2UubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAvLyBnZW5lcmF0ZSBuZXcgZmlsdGVyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IExhenkoW1t4LCBkaWZmZXJlbmNlXV0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgLy8gcmVtZW1iZXIgYXNrZWRcbiAgICAgICAgICAgICAgICBpZiAoIXRlc3RPbmx5KVxuICAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShpbmRleGVzW3hdLCBkaWZmZXJlbmNlKTtcbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUgZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikgKyAnXFxuT3V0IDonICsgSlNPTi5zdHJpbmdpZnkocmV0KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6IG51bGwnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY2xlYW5Db21wb3NpdGVzID0gZnVuY3Rpb24obW9kZWwsZmlsdGVyKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGNsZWFuIGNvbXBvc2l0ZUFza2VkXG4gICAgICAgICAqL1xuICAgICAgICAvLyBsYXp5IGNyZWF0ZSBjb25kaXRpb25hbCBhc2tlZCBpbmRleFxuICAgICAgICBpZiAoIShtb2RlbC5uYW1lIGluIGNvbXBvc2l0ZUFza2VkKSkgeyBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXSA9IFtdIH07XG4gICAgICAgIHZhciBpbmRleCA9IGNvbXBvc2l0ZUFza2VkW21vZGVsLm5hbWVdO1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGFsbCBlbGVtZW50cyB3aG8gaGF2ZSBzYW1lIHBhcnRpYWxcbiAgICAgICAgdmFyIGZpbHRlckxlbiA9IExhenkoZmlsdGVyKS5zaXplKCk7XG4gICAgICAgIHZhciBpdGVtcyA9IGluZGV4LmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIsICcgJiYgJyx0cnVlKSkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0peyBMYXp5KGl0ZW0pLnNpemUoKSA+IGZpbHRlckxlbiB9KTtcbi8vICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgOicgKyBKU09OLnN0cmluZ2lmeShpdGVtcykpO1xuICAgIH07XG5cbiAgICB0aGlzLmZpbHRlciA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIpe1xuLy8gICAgICAgIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLS0tLS0tLS1cXG5maWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSk7XG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG5cbiAgICAgICAgLy8gaWYgeW91IGZldGNoIGFsbCBvYmplY3RzIGZyb20gc2VydmVyLCB0aGlzIG1vZGVsIGhhcyB0byBiZSBtYXJrZWQgYXMgZ290IGFsbDtcbiAgICAgICAgdmFyIGZpbHRlckxlbiAgPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICBzd2l0Y2ggKGZpbHRlckxlbikge1xuICAgICAgICAgICAgY2FzZSAwIDoge1xuICAgICAgICAgICAgICAgIC8vIHJldHVybiBudWxsIG9yIGFsbFxuICAgICAgICAgICAgICAgIHZhciBnb3QgPSBnb3RBbGxbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICBnb3RBbGxbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBhc2tlZCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhc2tlZFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdXQgOiBudWxsIChnb3QgYWxsKScpO1xuICAgICAgICAgICAgICAgIC8vIGNvbmRpdGlvbmFsIGNsZWFuXG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBjb21wb3NpdGVBc2tlZCl7IFxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGdvdClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAxIDoge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBmaWx0ZXJTaW5nbGUuY2FsbCh0aGlzLCBtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgICAgICBjbGVhbkNvbXBvc2l0ZXMuY2FsbCh0aGlzLCBtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICB2YXIgc2luZ2xlID0gTGF6eShmaWx0ZXIpLmtleXMoKS5zb21lKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdmFyIGYgPSB7fTtcbiAgICAgICAgICAgIGZba2V5XSA9IGZpbHRlcltrZXldO1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlclNpbmdsZS5jYWxsKHRocywgbW9kZWwsIGYsIHRydWUpID09IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc2luZ2xlKSB7IHJldHVybiBudWxsIH1cbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29tcG9zaXRlQXNrZWRcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGNvbXBvc2l0ZUFza2VkKSl7IGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0gPSBbXTsgfVxuICAgICAgICAvLyBleHBsb2RlIGZpbHRlclxuICAgICAgICB2YXIgZXhwbG9kZWQgPSBleHBsb2RlRmlsdGVyKGZpbHRlcik7XG4gICAgICAgIC8vIGNvbGxlY3QgcGFydGlhbHNcbiAgICAgICAgdmFyIHBhcnRpYWxzID0gY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXS5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnIHx8ICcsdHJ1ZSkpO1xuICAgICAgICAvLyBjb2xsZWN0IG1pc3NpbmdzIChleHBsb2RlZCAtIHBhcnRpYWxzKVxuICAgICAgICBpZiAocGFydGlhbHMubGVuZ3RoKXtcbiAgICAgICAgICAgIHZhciBiYWQgID0gW107XG4gICAgICAgICAgICAvLyBwYXJ0aWFsIGRpZmZlcmVuY2VcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gcGFydGlhbHMpe1xuICAgICAgICAgICAgICAgIGJhZC5wdXNoLmFwcGx5KGJhZCxleHBsb2RlZC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgcGFydGlhbHNbeF0sJyAmJiAnLCB0cnVlKSkpO1xuICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICBjb25zb2xlLmxvZygnZXhwbG9kZWQgLSBwYXJ0aWFsIDogJyArIEpTT04uc3RyaW5naWZ5KGJhZCkpO1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gTGF6eShleHBsb2RlZCkuZGlmZmVyZW5jZShiYWQpLnRvQXJyYXkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IGV4cGxvZGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZmlsdGVyIHBhcnRpYWxzXG4gICAgICAgIGlmIChtaXNzaW5ncy5sZW5ndGgpe1xuICAgICAgICAgICAgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXS5wdXNoLmFwcGx5KGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0sbWlzc2luZ3MpO1xuICAgICAgICAgICAgLy8gYWdncmVnYXRlIG1pc3NpbmdzXG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBMYXp5KGZpbHRlcikua2V5cygpLm1hcChmdW5jdGlvbihrZXkpe1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBMYXp5KG1pc3NpbmdzKS5wbHVjayhrZXkpLnVuaXF1ZSgpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2tleSwgcmV0Lmxlbmd0aD9yZXQ6ZmlsdGVyW2tleV1dO1xuICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbi8vICAgICAgICAgICAgY29uc29sZS5sb2coJ291dCA6ICcgKyBKU09OLnN0cmluZ2lmeShtaXNzaW5ncykpO1xuICAgICAgICAgICAgLy8gY2xlYW4gY29uZGl0aW9uYWxcbiAgICAgICAgICAgIGNsZWFuQ29tcG9zaXRlcyhtb2RlbCwgbWlzc2luZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIG1pc3NpbmdzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEluZGV4Rm9yID0gZnVuY3Rpb24obW9kZWxOYW1lLCBmaWVsZE5hbWUpe1xuICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWxOYW1lICsgJy4nICsgZmllbGROYW1lO1xuICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gYXNrZWQpKXtcbiAgICAgICAgICAgIGFza2VkW2luZGV4TmFtZV0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXNrZWRbaW5kZXhOYW1lXTtcbiAgICB9XG59OyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybSl7XG4gICAgdmFyIGl0ZW1zID0gW107XG4gICAgdGhpcy5hZGQgPSBpdGVtcy5wdXNoLmJpbmQoaXRlbXMpO1xuICAgIHRoaXMuYWRkID0gZnVuY3Rpb24oaXRlbSl7XG4gIC8vICAgICAgY29uc29sZS5sb2coJ2FkZGluZyAnICsgaXRlbSk7XG4gICAgICAgIGlmICghKExhenkoaXRlbXMpLmZpbmQoaXRlbSkpKXtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmdldDAgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVsxXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjFcIikudG9BcnJheSgpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldDEgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVswXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMV0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjBcIikudG9BcnJheSgpO1xuICAgIH07XG4gICAgdGhpc1snZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVsYXRpb24uaW5kZXhOYW1lLnNwbGl0KCcvJylbMV0pXSA9IHRoaXMuZ2V0MTtcbiAgICB0aGlzWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWxhdGlvbi5pbmRleE5hbWUuc3BsaXQoJy8nKVswXSldID0gdGhpcy5nZXQwO1xuXG4gICAgdGhpcy5kZWwgPSBmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgdmFyIGwgPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgIHZhciBpZHggPSBudWxsO1xuICAgICAgICBmb3IgKHZhciBhID0gMDsgYSA8IGw7IGErKyl7IFxuICAgICAgICAgICAgaWYgKChpdGVtc1thXVswXSA9PT0gaXRlbVswXSkgJiYgKGl0ZW1zW2FdWzFdID09PSBpdGVtWzFdKSl7XG4gICAgICAgICAgICAgICAgaWR4ID0gYTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaWR4KXtcbiAgICAgICAgICAgIGl0ZW1zLnNwbGljZShhLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgJywgaXRlbSk7XG4gICAgfTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGNhY2hlZFByb3BlcnR5QnlFdmVudHMocHJvdG8sIHByb3BlcnR5TmFtZSxnZXR0ZXIsIHNldHRlcil7XG4gICAgdmFyIGV2ZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyw0KTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgXG4gICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICBwcm90by5vcm0ub24oZXZlbnQsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJlc3VsdCA9IHt9O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgcHJvcGVydHlEZWYgPSB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gY2FjaGVkKCl7XG4gICAgICAgICAgICBpZiAoISh0aGlzLmlkIGluIHJlc3VsdCkpe1xuICAgICAgICAgICAgICAgIHJlc3VsdFt0aGlzLmlkXSA9IGdldHRlci5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaWYgKHNldHRlcil7XG4gICAgICAgIHByb3BlcnR5RGVmWydzZXQnXSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gcmVzdWx0W3RoaXMuaWRdKXtcbiAgICAgICAgICAgICAgICBzZXR0ZXIuY2FsbCh0aGlzLHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCBpbiByZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIHByb3BlcnR5TmFtZSxwcm9wZXJ0eURlZik7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvcihkYXRhKXtcbiAgICB0aGlzLnJlc291cmNlID0gZGF0YS5fcmVzb3VyY2U7XG4gICAgdGhpcy5mb3JtSWR4ID0gZGF0YS5mb3JtSWR4O1xuICAgIHRoaXMuZmllbGRzID0gZGF0YS5lcnJvcnM7XG59XG52YXIgYmFzZU9STSA9IGZ1bmN0aW9uKG9wdGlvbnMsIGV4dE9STSl7XG4gICAgXG4gICAgLy8gY3JlYXRpbmcgcmV3aGVlbCBjb25uZWN0aW9uXG4gICAgaWYgKG9wdGlvbnMuY29uc3RydWN0b3IgPT09IFN0cmluZyl7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gbmV3IHJlV2hlZWxDb25uZWN0aW9uKG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gdXRpbHMucmVXaGVlbENvbm5lY3Rpb24pe1xuICAgICAgICB2YXIgY29ubmVjdGlvbiA9IG9wdGlvbnM7XG4gICAgfVxuICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgY29ubmVjdGlvbi5vbignY29ubmVjdGVkJywgZnVuY3Rpb24oKXsgXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICB9KTtcbiAgICB0aGlzLm9uID0gY29ubmVjdGlvbi5vbjtcbiAgICB0aGlzLmVtaXQgPSBjb25uZWN0aW9uLmVtaXQ7XG4gICAgdGhpcy51bmJpbmQgPSBjb25uZWN0aW9uLnVuYmluZDtcbiAgICB0aGlzLm9uY2UgPSBjb25uZWN0aW9uLm9uY2U7XG4gICAgdGhpcy4kcG9zdCA9IGNvbm5lY3Rpb24uJHBvc3QuYmluZChjb25uZWN0aW9uKTtcblxuICAgIC8vIGhhbmRsaW5nIHdlYnNvY2tldCBldmVudHNcbiAgICB0aGlzLm9uKCd3cy1jb25uZWN0ZWQnLGZ1bmN0aW9uKHdzKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdXZWJzb2NrZXQgY29ubmVjdGVkJyk7XG4gICAgICAgIC8vIGFsbCBqc29uIGRhdGEgaGFzIHRvIGJlIHBhcnNlZCBieSBnb3REYXRhXG4gICAgICAgIHdzLm9uTWVzc2FnZUpzb24oVzJQUkVTT1VSQ0UuZ290RGF0YS5iaW5kKFcyUFJFU09VUkNFKSk7XG4gICAgICAgIC8vXG4gICAgICAgIHdzLm9uTWVzc2FnZVRleHQoZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8oJ1dTIG1lc3NhZ2UgOiAnICsgbWVzc2FnZSlcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5vbignd3MtZGlzY29ubmVjdGVkJywgZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmVycm9yKCdXZWJzb2NrZXQgZGlzY29ubmVjdGVkJylcbiAgICB9KTtcbiAgICB0aGlzLm9uKCdlcnJvci1qc29uLTQwNCcsZnVuY3Rpb24oZXJyb3IsdXJsLCBzZW50RGF0YSwgeGhyKXsgXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0pTT04gZXJyb3IgJywgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1t1cmwuc3BsaXQoJy8nKVswXV07XG4gICAgfSk7XG4gICAgdGhpcy5vbigncmVhbHRpbWUtbWVzc2FnZS1qc29uJywgZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEobWVzc2FnZSk7XG4gICAgfSk7XG5cbiAgICAvLyBpbml0aWFsaXphdGlvblxuICAgIHZhciBXMlBSRVNPVVJDRSA9IHRoaXM7XG4gICAgdmFyIElEQiA9IHthdXRoX2dyb3VwIDogTGF6eSh7fSl9OyAvLyB0YWJsZU5hbWUgLT4gZGF0YSBhcyBBcnJheVxuICAgIHZhciBJRFggPSB7fTsgLy8gdGFibGVOYW1lIC0+IExhenkoaW5kZXhCeSgnaWQnKSkgLT4gSURCW2RhdGFdXG4gICAgdmFyIFJFVklEWCA9IHt9OyAvLyB0YWJsZU5hbWUgLT4gZmllbGROYW1lIC0+IExhenkuZ3JvdXBCeSgpIC0+IElEQltEQVRBXVxuICAgIHZhciBidWlsZGVySGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgYnVpbGRlckhhbmRsZXJVc2VkID0ge307XG4gICAgdmFyIHBlcnNpc3RlbnRBdHRyaWJ1dGVzID0ge307XG4gICAgdmFyIGV2ZW50SGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbldhaXRpbmcgPSB7fTtcbiAgICB2YXIgbW9kZWxDYWNoZSA9IHt9O1xuICAgIHZhciBmYWlsZWRNb2RlbHMgPSB7fTtcbiAgICB2YXIgd2FpdGluZ0Nvbm5lY3Rpb25zID0ge30gLy8gYWN0dWFsIGNvbm5lY3Rpb24gd2hvIGknbSB3YWl0aW5nIGZvclxuICAgIHZhciBsaXN0Q2FjaGUgPSBuZXcgTGlzdENhY2hlcihMYXp5KTtcbiAgICB2YXIgbGlua2VyID0gbmV3IEF1dG9MaW5rZXIod2FpdGluZ0Nvbm5lY3Rpb25zLElEQiwgdGhpcywgbGlzdENhY2hlKTtcbi8qICAgIHdpbmRvdy5sbCA9IGxpbmtlcjtcbiAgICB3aW5kb3cubGMgPSBsaXN0Q2FjaGU7XG4qL1xuICAgIHRoaXMudmFsaWRhdGlvbkV2ZW50ID0gdGhpcy5vbignZXJyb3ItanNvbi01MTMnLCBmdW5jdGlvbihkYXRhLCB1cmwsIHNlbnREYXRhLCB4aHIpe1xuICAgICAgICBpZiAoY3VycmVudENvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyKXtcbiAgICAgICAgICAgIGN1cnJlbnRDb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlcihuZXcgVmFsaWRhdGlvbkVycm9yKGRhdGEpKTtcbiAgICAgICAgfVxuICAgIH0pXG5cbiAgICB2YXIgZ2V0SW5kZXggPSBmdW5jdGlvbiAoaW5kZXhOYW1lKSB7XG4gICAgICAgIGlmIChpbmRleE5hbWUgaW4gSURCKVxuICAgICAgICAgICAgcmV0dXJuIElEQltpbmRleE5hbWVdO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIElEQltpbmRleE5hbWVdID0gTGF6eSh7fSk7XG4gICAgICAgICAgICByZXR1cm4gSURCW2luZGV4TmFtZV07XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBnZXRVbmxpbmtlZCA9IGZ1bmN0aW9uIChpbmRleE5hbWUpIHtcbiAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBVTkxJTktFRClcbiAgICAgICAgICAgIHJldHVybiBVTkxJTktFRFtpbmRleE5hbWVdO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIFVOTElOS0VEW2luZGV4TmFtZV0gPSB7fTtcbiAgICAgICAgICAgIHJldHVybiBVTkxJTktFRFtpbmRleE5hbWVdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIFBlcm1pc3Npb25UYWJsZShpZCwga2xhc3MsIHBlcm1pc3Npb25zKSB7XG4gICAgICAgIC8vIGNyZWF0ZSBQZXJtaXNzaW9uVGFibGUgY2xhc3NcbiAgICAgICAgdGhpcy5rbGFzcyA9IGtsYXNzO1xuICAgICAgICB0aGlzLnBlcm1pc3Npb25zID0gW107XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgZm9yICh2YXIgayBpbiBwZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgdGhpcy5wdXNoLmFwcGx5KHRoaXMsIFtrLCBwZXJtaXNzaW9uc1trXV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIFBlcm1pc3Npb25UYWJsZS5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAvLyBzYXZlIE9iamVjdCB0byBzZXJ2ZXJcbiAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICBwZXJtaXNzaW9uczogTGF6eSh0aGlzLnBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3hbMF0uaWQsIHhbMV1dXG4gICAgICAgICAgICB9KS50b09iamVjdCgpXG4gICAgICAgIH07XG4gICAgICAgIGRhdGEuaWQgPSB0aGlzLmlkO1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gdGhpcy5rbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMua2xhc3MubW9kZWxOYW1lICsgJy9zZXRfcGVybWlzc2lvbnMnLCBkYXRhLCBmdW5jdGlvbiAobXlQZXJtcywgYSwgYiwgcmVxKSB7XG4gICAgICAgICAgICBjYihteVBlcm1zKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBQZXJtaXNzaW9uVGFibGUucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoZ3JvdXBfaWQsIHBlcm1pc3Npb25MaXN0KSB7XG4gICAgICAgIHZhciBwID0gTGF6eShwZXJtaXNzaW9uTGlzdCk7XG4gICAgICAgIHZhciBwZXJtcyA9IExhenkodGhpcy5rbGFzcy5hbGxQZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW3gsIHAuY29udGFpbnMoeCldXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIHZhciBsID0gTGF6eSh0aGlzLnBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4WzBdLmlkXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAobC5jb250YWlucyhncm91cF9pZCkpXG4gICAgICAgICAgICB0aGlzLnBlcm1pc3Npb25zW2wuaW5kZXhPZihncm91cF9pZCldWzFdID0gcGVybXM7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMucGVybWlzc2lvbnMucHVzaChbSURCLmF1dGhfZ3JvdXAuZ2V0KGdyb3VwX2lkKSwgcGVybXNdKTtcbiAgICB9O1xuXG4gICAgLy8gY3JlYXRlcyBkeW5hbWljYWwgbW9kZWxzXG4gICAgdmFyIG1ha2VNb2RlbENsYXNzID0gZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgIHZhciBfbW9kZWwgPSBtb2RlbDtcbiAgICAgICAgbW9kZWwuZmllbGRzLmlkLnJlYWRhYmxlID0gZmFsc2U7XG4gICAgICAgIG1vZGVsLmZpZWxkcy5pZC53cml0YWJsZSA9IGZhbHNlO1xuICAgICAgICB2YXIgZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpO1xuICAgICAgICBpZiAobW9kZWwucHJpdmF0ZUFyZ3MpIHtcbiAgICAgICAgICAgIGZpZWxkcyA9IGZpZWxkcy5tZXJnZShtb2RlbC5wcml2YXRlQXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbW9kZWwtZGVmaW5pdGlvbicsIG1vZGVsLCBnZXRJbmRleChtb2RlbC5uYW1lKSk7XG4gICAgICAgIC8vIGdldHRpbmcgZmllbGRzIG9mIHR5cGUgZGF0ZSBhbmQgZGF0ZXRpbWVcbi8qXG4gICAgICAgIHZhciBEQVRFRklFTERTID0gZmllbGRzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGdldHRpbmcgYm9vbGVhbiBmaWVsZHNcbiAgICAgICAgdmFyIEJPT0xGSUVMRFMgPSBmaWVsZHMuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHgudHlwZSA9PSAnYm9vbGVhbicpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGJvb2xlYW5zIGFuZCBkYXRldGltZXMgc3RvcmFnZSBleHRlcm5hbCBcbiAgICAgICAgTU9ERUxfREFURUZJRUxEU1ttb2RlbC5uYW1lXSA9IERBVEVGSUVMRFM7XG4gICAgICAgIE1PREVMX0JPT0xGSUVMRFNbbW9kZWwubmFtZV0gPSBCT09MRklFTERTO1xuKi9cbiAgICAgICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdmFyIGZ1bmNTdHJpbmcgPSBcImlmICghcm93KSB7IHJvdyA9IHt9fTtcXG5cIjtcbiAgICAgICAgZnVuY1N0cmluZyArPSBtb2RlbC5yZWZlcmVuY2VzLm1hcChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICByZXR1cm4gJ3RoaXMuXycgKyBmaWVsZC5pZCArICcgPSByb3cuJyArIGZpZWxkLmlkICsgJzsnO1xuICAgICAgICB9KS5qb2luKCc7XFxuJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBkYXRlZmllbGQgY29udmVyc2lvblxuICAgICAgICBmdW5jU3RyaW5nICs9IGZpZWxkcy5tYXAoZnVuY3Rpb24gKHgsaykge1xuICAgICAgICAgICAgaWYgKCh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gcm93LicgKyBrICsgJz9uZXcgRGF0ZShyb3cuJyArIGsgKyAnICogMTAwMCAtICcgKyB1dGlscy50ek9mZnNldCArICcpOm51bGw7XFxuJzsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHgudHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gKHJvdy4nICsgayArICcgPT09IFwiVFwiKSB8fCAocm93LicgKyBrICsgJyA9PT0gdHJ1ZSk7XFxuJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IHJvdy4nICsgayArICc7XFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudG9TdHJpbmcoJ1xcbicpOyArICdcXG4nO1xuXG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gXCJpZiAocGVybWlzc2lvbnMpIHt0aGlzLl9wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zICYmIExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkgeyByZXR1cm4gW3gsIHRydWVdIH0pLnRvT2JqZWN0KCk7fVwiXG5cbiAgICAgICAgXG4gICAgICAgIC8vIG1hc3RlciBjbGFzcyBmdW5jdGlvblxuICAgICAgICB2YXIgS2xhc3MgPSBuZXcgRnVuY3Rpb24oJ3JvdycsICdwZXJtaXNzaW9ucycsZnVuY1N0cmluZylcblxuICAgICAgICBLbGFzcy5wcm90b3R5cGUub3JtID0gZXh0T1JNO1xuICAgICAgICBLbGFzcy5yZWZfdHJhbnNsYXRpb25zID0ge307XG4gICAgICAgIEtsYXNzLm1vZGVsTmFtZSA9IG1vZGVsLm5hbWU7XG4gICAgICAgIEtsYXNzLnJlZmVyZW5jZXMgPSBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLnBsdWNrKCdpZCcpLnRvQXJyYXkoKTtcblxuICAgICAgICBLbGFzcy5pbnZlcnNlX3JlZmVyZW5jZXMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAvLyBtYW5hZ2luZyByZWZlcmVuY2VzIHdoZXJlIFxuICAgICAgICAgICAgcmV0dXJuIHguYnkgKyAnXycgKyB4LmlkICsgJ19zZXQnXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5yZWZlcmVudHMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW3guYnksIHguaWRdXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5maWVsZHNPcmRlciA9IG1vZGVsLmZpZWxkT3JkZXI7XG4gICAgICAgIEtsYXNzLmFsbFBlcm1pc3Npb25zID0gbW9kZWwucGVybWlzc2lvbnM7XG5cbiAgICAgICAgLy8gcmVkZWZpbmluZyB0b1N0cmluZyBtZXRob2RcbiAgICAgICAgaWYgKExhenkobW9kZWwucmVwcmVzZW50YXRpb24pLnNpemUoKSl7XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9TdHJpbmcgPSBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzLicgKyBMYXp5KG1vZGVsLnJlcHJlc2VudGF0aW9uKS50b1N0cmluZygnICsgXCIgXCIgKyB0aGlzLicpKTtcbiAgICAgICAgfVxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9VcHBlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyByZWRlZmluZSB0byBVcHBlckNhc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKTtcbiAgICAgICAgfTtcbiAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9Mb3dlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gZGVsZXRlIGluc3RhbmNlIGZyb20gc2VydmVyXG4gICAgICAgICAgICByZXR1cm4gZXh0T1JNLmRlbGV0ZSh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSwgW3RoaXMuaWRdKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBwZXJtaXNzaW9uIGdldHRlciBwcm9wZXJ0eVxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoS2xhc3MucHJvdG90eXBlLCAncGVybWlzc2lvbnMnLCB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcGVybWlzc2lvbnMpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLnBlcm1pc3Npb25zW3RoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lXS5hc2sodGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gZ2V0dGluZyBmdWxsIHBlcm1pc3Npb24gdGFibGUgZm9yIGFuIG9iamVjdFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuYWxsX3Blcm1zID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICB2YXIgb2JqZWN0X2lkID0gdGhpcy5pZDtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9hbGxfcGVybXMnLCB7aWQ6IHRoaXMuaWR9LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBwZXJtaXNzaW9ucyA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgdW5rbm93bl9ncm91cHMgPSBMYXp5KHBlcm1pc3Npb25zKS5wbHVjaygnZ3JvdXBfaWQnKS51bmlxdWUoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnICsgeFxuICAgICAgICAgICAgICAgIH0pLmRpZmZlcmVuY2UoSURCLmF1dGhfZ3JvdXAua2V5cygpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgTGF6eShwZXJtaXNzaW9ucykuZ3JvdXBCeShmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5ncm91cF9pZFxuICAgICAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBlZFtrXSA9IExhenkodikucGx1Y2soJ25hbWUnKS50b0FycmF5KClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKG5ldyBQZXJtaXNzaW9uVGFibGUob2JqZWN0X2lkLCBLbGFzcywgZ3JvdXBlZCkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKHVua25vd25fZ3JvdXBzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ2V0KCdhdXRoX2dyb3VwJyx1bmtub3duX2dyb3VwcyxjYWxsKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGNhbGwoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIHZhciBvID0gdGhpcy5hc1JhdygpO1xuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IEtsYXNzLmZpZWxkcztcbiAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICB2YXIgbW9kZWxOYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICBpZiAoYXJncykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGFyZyBpbiBhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG9bYXJnXSA9IGFyZ3NbYXJnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBlbGltaW5hdGUgdW53cml0YWJsZXNcbiAgICAgICAgICAgIExhenkoS2xhc3MuZmllbGRzT3JkZXIpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWZpZWxkc1t4XS53cml0YWJsZTtcbiAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24oZmllbGROYW1lKXtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGROYW1lIGluIG8pIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG9bZmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgKElEID8gJy9wb3N0JyA6ICcvcHV0JyksIG8pO1xuICAgICAgICAgICAgaWYgKGFyZ3MgJiYgKGFyZ3MuY29uc3RydWN0b3IgPT09IEZ1bmN0aW9uKSl7XG4gICAgICAgICAgICAgICAgLy8gcGxhY2luZyBjYWxsYmFjayBpbiBhIGNvbW1vbiBwbGFjZVxuICAgICAgICAgICAgICAgIHByb21pc2UuY29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIgPSBhcmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2VcbiAgICAgICAgfTtcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb2JqID0gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy5hc1JhdygpKTtcbiAgICAgICAgICAgIG9iai5fcGVybWlzc2lvbnMgPSB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYnVpbGRpbmcgc2VyaWFsaXphdGlvbiBmdW5jdGlvblxuICAgICAgICB2YXIgYXNyID0gJ3JldHVybiB7XFxuJyArIExhenkobW9kZWwucmVmZXJlbmNlcykubWFwKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHJldHVybiBmaWVsZC5pZCArICcgOiB0aGlzLl8nICsgZmllbGQuaWQ7XG4gICAgICAgIH0pLmNvbmNhdChmaWVsZHMubWFwKGZ1bmN0aW9uICh4LGspIHtcbiAgICAgICAgICAgIGlmICgoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogKHRoaXMuJyArIGsgKyAnPyhNYXRoLnJvdW5kKHRoaXMuJyArIGsgKyAnLmdldFRpbWUoKSAtIHRoaXMuJyArIGsgKyAnLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCkgLyAxMDAwKTpudWxsKSc7IFxuICAgICAgICAgICAgfSBlbHNlIGlmICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogdGhpcy4nICsgayArICc/XCJUXCI6XCJGXCInO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiB0aGlzLicgKyBrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSkudG9TdHJpbmcoJyxcXG4nKSArICd9Oyc7XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5hc1JhdyA9IG5ldyBGdW5jdGlvbihhc3IpO1xuXG4gICAgICAgIEtsYXNzLnNhdmVNdWx0aSA9IGZ1bmN0aW9uIChvYmplY3RzLCBjYiwgc2NvcGUpIHtcbiAgICAgICAgICAgIHZhciByYXcgPSBbXTtcbiAgICAgICAgICAgIHZhciBkZWxldGFibGUgPSBMYXp5KEtsYXNzLmZpZWxkcylcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAheC53cml0YWJsZVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnBsdWNrKCdpZCcpXG4gICAgICAgICAgICAgICAgLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIExhenkob2JqZWN0cylcbiAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmFzUmF3KClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIExhenkoZGVsZXRhYmxlKS5lYWNoKGZ1bmN0aW9uICh5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgeFt5XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJhdy5wdXNoKHgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lLCAncHV0Jywge211bHRpcGxlOiByYXcsIGZvcm1JZHggOiBXMlBSRVNPVVJDRS5mb3JtSWR4Kyt9LCBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGVsZW1zKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFiID0gSURCW0tsYXNzLm1vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgdmFyIG9ianMgPSBMYXp5KGVsZW1zW0tsYXNzLm1vZGVsTmFtZV0ucmVzdWx0cykucGx1Y2soJ2lkJykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YWIuZ2V0KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICAgICAgICBjYihvYmpzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBzY29wZSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmICgnZXh0cmFfdmVyYnMnIGluIG1vZGVsKVxuICAgICAgICAgICAgTGF6eShtb2RlbC5leHRyYV92ZXJicykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHZhciBmdW5jTmFtZSA9IHhbMF07XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSB4WzFdO1xuICAgICAgICAgICAgICAgIHZhciBkZGF0YSA9ICdkYXRhID0ge2lkIDogdGhpcy5pZCc7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBkZGF0YSArPSAnLCAnICsgTGF6eShhcmdzKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geCArICcgOiAnICsgeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJywnKTtcbiAgICAgICAgICAgICAgICBkZGF0YSArPSAnfTsnO1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCgnY2InKTtcbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbZnVuY05hbWVdID0gbmV3IEZ1bmN0aW9uKGFyZ3MsIGRkYXRhICsgJ1cyUy5XMlBfUE9TVCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSxcIicgKyBmdW5jTmFtZSArICdcIiwgZGF0YSxmdW5jdGlvbihkYXRhLHN0YXR1cyxoZWFkZXJzLHgpeycgK1xuICAgICAgICAgICAgICAgICAgICAndHJ5e1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAnICAgaWYgKCFoZWFkZXJzKFwibm9tb2RlbFwiKSkge3dpbmRvdy5XMlMuZ290RGF0YShkYXRhLGNiKTt9XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICcgICBlbHNlIHtpZiAoY2IpIHtjYihkYXRhKX19XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICd9IGNhdGNoKGUpe1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAnaWYgKGNiKSB7Y2IoZGF0YSk7fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfSk7XFxuJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKCdwcml2YXRlQXJncycgaW4gbW9kZWwpIHtcbiAgICAgICAgICAgIEtsYXNzLnByaXZhdGVBcmdzID0gTGF6eShtb2RlbC5wcml2YXRlQXJncykua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgdHJ1ZV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmVQQSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgdmFyIFQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBvbyA9IHtpZDogdGhpcy5pZH07XG4gICAgICAgICAgICAgICAgdmFyIFBBID0gdGhpcy5jb25zdHJ1Y3Rvci5wcml2YXRlQXJncztcbiAgICAgICAgICAgICAgICB2YXIgRnMgPSB0aGlzLmNvbnN0cnVjdG9yLmZpZWxkcztcbiAgICAgICAgICAgICAgICB2YXIgdCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG8pLmFzUmF3KCk7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkSWR4ID0gTGF6eShQQSkua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIEZzW3hdXVxuICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgTGF6eShvKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoayBpbiBQQSkgJiYgZmllbGRJZHhba10ud3JpdGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9vW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9zYXZlUEEnLCBvbywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG9vKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBUW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbW9kZWxDYWNoZVtLbGFzcy5tb2RlbE5hbWVdID0gS2xhc3M7XG4gICAgICAgIC8vIGFkZGluZyBpZCB0byBmaWVsZHNcbiAgICAgICAgZm9yICh2YXIgZiBpbiBtb2RlbC5maWVsZHMpIHtcbiAgICAgICAgICAgIG1vZGVsLmZpZWxkc1tmXS5pZCA9IGY7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MuZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpLmNvbmNhdChMYXp5KG1vZGVsLnByaXZhdGVBcmdzKSkuY29uY2F0KExhenkobW9kZWwucmVmZXJlbmNlcykudGFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICB4LnR5cGUgPSB4LnR5cGUgfHwgJ3JlZmVyZW5jZSdcbiAgICAgICAgfSkpLmluZGV4QnkoJ2lkJykudG9PYmplY3QoKTtcbiAgICAgICAgLy8gc2V0dGluZyB3aWRnZXRzIGZvciBmaWVsZHNcbiAgICAgICAgTGF6eShLbGFzcy5maWVsZHMpLmVhY2goZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgaWYgKCFmaWVsZC53aWRnZXQpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZC50eXBlID09PSAncmVmZXJlbmNlJyl7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9ICdjaG9pY2VzJ1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9IGZpZWxkLnR5cGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAobWFueSB0byBvbmUpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGV4dF9yZWYgPSByZWYudG87XG4gICAgICAgICAgICB2YXIgbG9jYWxfcmVmID0gJ18nICsgcmVmLmlkO1xuICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5pZCxmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZXh0X3JlZiBpbiBJREIpKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKGV4dF9yZWYsZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rZXIubWFpbkluZGV4W2V4dF9yZWZdLmFzayh0aHNbbG9jYWxfcmVmXSx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSAoZXh0X3JlZiBpbiBJREIpICYmIHRoaXNbbG9jYWxfcmVmXSAmJiBJREJbZXh0X3JlZl0uZ2V0KHRoaXNbbG9jYWxfcmVmXSk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgJiYgKGV4dF9yZWYgaW4gbGlua2VyLm1haW5JbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYXNraW5nIHRvIGxpbmtlclxuICAgICAgICAgICAgICAgICAgICBsaW5rZXIubWFpbkluZGV4W2V4dF9yZWZdLmFzayh0aGlzW2xvY2FsX3JlZl0sdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1dGlscy5tb2NrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSAhPSBleHRfcmVmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgY2FuIGFzc2lnbiBvbmx5ICcgKyBleHRfcmVmICsgJyB0byAnICsgcmVmLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzW2xvY2FsX3JlZl0gPSB2YWx1ZS5pZDtcbiAgICAgICAgICAgIH0sICduZXctJyArIGV4dF9yZWYsICdkZWxldGVkLScgKyBleHRfcmVmLCd1cGRhdGVkLScgKyBleHRfcmVmLCAnbmV3LW1vZGVsLScgKyBleHRfcmVmKTtcblxuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlZi5pZCldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRPUk0uZ2V0KGV4dF9yZWYsdGhpc1tsb2NhbF9yZWZdKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAob25lIHRvIG1hbnkpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZWRCeSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gcmVmLmJ5ICsgJy4nICsgcmVmLmlkO1xuICAgICAgICAgICAgdmFyIHByb3BlcnR5TmFtZSA9IHJlZi5ieSArICdfJyArIHV0aWxzLnBsdXJhbGl6ZShyZWYuaWQpO1xuICAgICAgICAgICAgdmFyIHJldkluZGV4ID0gcmVmLmJ5O1xuICAgICAgICAgICAgaWYgKEtsYXNzLnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJ5ZWQgdG8gcmVkZWZpbmUgcHJvcGVydHkgJyArIHByb3BlcnR5TmFtZSArICdzJyArICcgZm9yICcgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcHJvcGVydHlOYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSAocmV2SW5kZXggaW4gSURCKSA/IFJFVklEWFtpbmRleE5hbWVdLmdldCh0aGlzLmlkICsgJycpOm51bGw7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtlci5mb3JlaWduS2V5c1tpbmRleE5hbWVdLmFzayh0aGlzLmlkLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgIH0sIG51bGwsICduZXctJyArIHJldkluZGV4LCAndXBkYXRlZC0nICsgcmV2SW5kZXgsICdkZWxldGVkLScgKyByZXZJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShyZWYuYnkpKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdHMgPSB7fTtcbiAgICAgICAgICAgICAgICBvcHRzW3JlZi5pZF0gPSBbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5xdWVyeShyZWYuYnksb3B0cyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2J1aWxkaW5nIHJlZmVyZW5jZSB0byAobWFueSB0byBtYW55KSBmaWVsZHNcbiAgICAgICAgaWYgKG1vZGVsLm1hbnlUb01hbnkpIHtcbiAgICAgICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHJlZi5pbmRleE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcmVmLmZpcnN0PyAwIDogMTtcbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsTmFtZSA9IHJlZi5tb2RlbDtcbi8vICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBnZXRJbmRleChvbW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgZ2V0dGVyID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyAoMSAtIGZpcnN0KV07XG5cbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcmVmLm1vZGVsICsgJ3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZXQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0ID0gZ2V0SW5kZXgob21vZGVsTmFtZSkuZ2V0LmJpbmQoSURCW29tb2RlbE5hbWVdKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcyAmJiBnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0ID0gTGF6eShpZHMpLm1hcChnZXQpLmZpbHRlcih1dGlscy5ib29sKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgICAgICB9LCBudWxsLCAncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUsICdyZWNlaXZlZC0nICsgb21vZGVsTmFtZSk7XG5cbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShvbW9kZWxOYW1lKSldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLmdldE0yTShpbmRleE5hbWUsIFt0aHMuaWRdLCBmaXJzdCxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGdldHRlcih0aHMuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChvbW9kZWxOYW1lLCB7aWQgOiBpZHN9LG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gSURCW29tb2RlbE5hbWVdLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KFtdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgICAgIEtsYXNzLmZpZWxkc1t1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICByZWFkYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ00yTScsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcnM6IFtdXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS51bmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IFtbSUQsIGluc3RhbmNlLmlkXV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL2RlbGV0ZScsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUubGlua1JlZmVyZW5jZSA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lID09ICdBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZXMgPSBpbnN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBpbnN0YW5jZXNbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJTkRFWF9NMk0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZnMgPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykuZGlmZmVyZW5jZShMYXp5KElOREVYX00yTVtpbmRleE5hbWVdWzBdLmdldCh0aGlzLmlkKSkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBvbW9kZWwgKyAnLycgKyBLbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlZnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkocmVmcykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtJRCwgeF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUF9QT1NUKEtsYXNzLm1vZGVsTmFtZSwgb21vZGVsICsgJ3MvcHV0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGluZGV4TmFtZSBpbiBsaW5rZXIubTJtSW5kZXgpICYmIExhenkobGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKG9tb2RlbCldKGluc3RhbmNlLmlkKSkuZmluZCh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL3B1dCcsIHtjb2xsZWN0aW9uOiBbW3RoaXMuaWQsIGluc3RhbmNlLmlkXV19KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ25ldy1tb2RlbCcsIEtsYXNzKTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbmV3LW1vZGVsLScgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICByZXR1cm4gS2xhc3M7XG4gICAgfTtcblxuICAgIHRoaXMuZ290RGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBjYWxsQmFjaykge1xuICAgICAgICAvLyByZWNlaXZlIGFsbCBkYXRhIGZyb20gZXZlcnkgZW5kIHBvaW50XG4gICAgICAgIGNvbnNvbGUuaW5mbygnZ290RGF0YScpO1xuICAgICAgICBpZiAodHlwZW9mKGRhdGEpID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGF0YSAnICsgZGF0YSArICcgcmVmdXNlZCBmcm9tIGdvdERhdGEoKScpO1xuICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNsZWFuIGRhdGEgZnJvbSByZWxhdGlvbnMgYW5kIHBlcm1pc3Npb25zIGZvciB1c2luZyBpdCBhZnRlciBtb2RlbCBwYXJzaW5nXG4gICAgICAgIGlmICgnX2V4dHJhJyBpbiBkYXRhKXsgZGVsZXRlIGRhdGEuX2V4dHJhIH1cbiAgICAgICAgdmFyIFRPT05FID0gZGF0YS5UT09ORTtcbiAgICAgICAgdmFyIFRPTUFOWSA9IGRhdGEuVE9NQU5ZO1xuICAgICAgICB2YXIgTUFOWVRPTUFOWSA9IGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgdmFyIFBFUk1JU1NJT05TID0gZGF0YS5QRVJNSVNTSU9OUztcbiAgICAgICAgdmFyIFBBID0gZGF0YS5QQTtcbiAgICAgICAgZGVsZXRlIGRhdGEuVE9PTkU7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBBO1xuICAgICAgICBpZiAoIVBBKSB7IFBBID0ge307IH1cblxuICAgICAgICAvLyBjbGVhbmluZyBmcm9tIHVzZWxlc3MgZGVsZXRlZCBkYXRhXG4gICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLmZpbHRlcihmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgcmV0dXJuICghKCdkZWxldGVkJyBpbiB2KSB8fCAoKGsgaW4gbW9kZWxDYWNoZSkpKTtcbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgnbTJtJyBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbTJtID0gZGF0YS5tMm07XG4gICAgICAgICAgICBkZWxldGUgZGF0YVsnbTJtJ107XG4gICAgICAgIH1cbiAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uIChkYXRhLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsQ2xhc3MgPSBtb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXN1bHRzICYmIChkYXRhLnJlc3VsdHMubGVuZ3RoID4gMCkgJiYgKGRhdGEucmVzdWx0c1swXS5jb25zdHJ1Y3RvciA9PSBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMYXp5KG1vZGVsQ2xhc3MuZmllbGRzT3JkZXIpLnppcCh4KS50b09iamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBMYXp5KGRhdGEucmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgdmFyIGRlbGV0ZWQgPSBkYXRhLmRlbGV0ZWQ7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBQQSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgTVBBID0gUEFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShyZXN1bHRzKS5lYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmQuaWQgaW4gTVBBKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShNUEFbcmVjb3JkLmlkXSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGluZGV4aW5nIHJlZmVyZW5jZXMgYnkgaXRzIElEXG4gICAgICAgICAgICAgICAgdmFyIGl0YWIgPSBnZXRJbmRleChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZSA9IGl0YWIuc291cmNlO1xuXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGVkLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGFibGVbeF07XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuLypcbiAgICAgICAgICAgICAgICBMYXp5KGRlbGV0ZWQpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgIH0pO1xuKi9cbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gcmVzdWx0cy5pbmRleEJ5KCdpZCcpO1xuICAgICAgICAgICAgICAgIHZhciBpayA9IGlkeC5rZXlzKCk7XG4gICAgICAgICAgICAgICAgdmFyIG5uZXcgPSBpay5kaWZmZXJlbmNlKGl0YWIua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWQgPSBpay5kaWZmZXJlbmNlKG5uZXcpO1xuICAgICAgICAgICAgICAgIC8vIHJlbW92aW5nIG9sZCBpZGVudGljYWwgdmFsdWVzXG4gICAgICAgICAgICAgICAgdXBkYXRlZCA9IHVwZGF0ZWQuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhdXRpbHMuc2FtZUFzKGlkeC5nZXQoeCksIGl0YWIuZ2V0KHgpLmFzUmF3KCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIGNsYXNzaWZ5IHJlY29yZHNcbiAgICAgICAgICAgICAgICB2YXIgcGVybXMgPSBkYXRhLnBlcm1pc3Npb25zID8gTGF6eShkYXRhLnBlcm1pc3Npb25zKSA6IExhenkoe30pO1xuICAgICAgICAgICAgICAgIHZhciBuZXdPYmplY3RzID0gbm5ldy5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCksIHBlcm1zLmdldCh4KSlcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vLy8gY2xhc3NpZnlpbmcgdXBkYXRlZFxuICAgICAgICAgICAgICAgIC8vdmFyIHVwZGF0ZWRPYmplY3RzID0gdXBkYXRlZC5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkscGVybXMuZ2V0KHgpKX0pO1xuICAgICAgICAgICAgICAgIC8vdmFyIHVvID0gdXBkYXRlZE9iamVjdHMudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIC8vdXBkYXRlZE9iamVjdHMgPSBMYXp5KHVvKS5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIFt4LHRhYmxlW3guaWRdXX0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGluZyBzaW5nbGUgb2JqZWN0c1xuICAgICAgICAgICAgICAgIHZhciBjaGFuZ2VkID0gW107XG4vLyAgICAgICAgICAgICAgICB2YXIgREFURUZJRUxEUyA9IE1PREVMX0RBVEVGSUVMRFNbbW9kZWxOYW1lXTtcbi8vICAgICAgICAgICAgICAgIHZhciBCT09MRklFTERTID0gTU9ERUxfQk9PTEZJRUxEU1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSXRlbSA9IGl0YWIuZ2V0KHgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ29weSA9IG9sZEl0ZW0uY29weSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3SXRlbSA9IG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkpO1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG1vZGVsLmZpZWxkcykua2V5cygpLmVhY2goZnVuY3Rpb24oayl7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtW2tdID0gbmV3SXRlbVtrXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChbb2xkSXRlbSwgb2xkQ29weV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBzZW5kaW5nIHNpZ25hbCBmb3IgdXBkYXRlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAoY2hhbmdlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgndXBkYXRlZC0nICsgbW9kZWxOYW1lLCBjaGFuZ2VkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8qKioqKioqKiBVcGRhdGUgdW5pdmVyc2UgKioqKioqKipcbiAgICAgICAgICAgICAgICB2YXIgbm8gPSBuZXdPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KG5vKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRhYmxlW3guaWRdID0geFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHJlYnVsZGluZyByZXZlcnNlIGluZGV4ZXNcbiAgICAgICAgICAgICAgICBMYXp5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXS5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgICAgICAgICAgUkVWSURYW21vZGVsTmFtZSArICcuJyArIHJlZl0gPSBJREJbbW9kZWxOYW1lXS5ncm91cEJ5KCdfJyArIHJlZik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIG5ldyB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAobm8ubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCduZXctJyArIG1vZGVsTmFtZSwgTGF6eShubyksIGRhdGEudG90YWxSZXN1bHRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdkZWxldGVkLScgKyBtb2RlbE5hbWUsIGRlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgZGF0YSBhcnJpdmVkXG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtJyArIG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChUT09ORSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVE9PTkUnKTtcbiAgICAgICAgICAgIExhenkoVE9PTkUpLmVhY2goZnVuY3Rpb24gKHZhbHMsIG1vZGVsTmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIHVkeCA9IGdldFVubGlua2VkKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVE9NQU5ZKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUT01BTlknKTtcbiAgICAgICAgICAgIExhenkoVE9NQU5ZKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBpbmRleE5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gQVNLRURfVU5MSU5LRUQpKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX1VOTElOS0VEW2luZGV4TmFtZV0gPSBMYXp5KFtdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgTGF6eSh2YWxzKS5lYWNoKGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9VTkxJTktFRFtpbmRleE5hbWVdLnNvdXJjZS5wdXNoKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChNQU5ZVE9NQU5ZKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdNQU5ZVE9NQU5ZJyk7XG4gICAgICAgICAgICBMYXp5KE1BTllUT01BTlkpLmVhY2goZnVuY3Rpb24gKHZhbHMsIGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCA9IHBhcnNlSW50KGluZGV4TmFtZS5zcGxpdCgnfCcpWzFdKTtcbiAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBpbmRleE5hbWUuc3BsaXQoJ3wnKVswXTtcbiAgICAgICAgICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gQVNLRURfTTJNKSkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9NMk1baW5kZXhOYW1lXSA9IFt7fSwge31dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgTUlEWCA9IEFTS0VEX00yTVtpbmRleE5hbWVdW2ZpcnN0XTtcbiAgICAgICAgICAgICAgICBMYXp5KHZhbHMpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgTUlEWFt4ICsgJyddID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgTUlEWFt4XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobTJtKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RNMk0obTJtKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoUEVSTUlTU0lPTlMpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdFBlcm1pc3Npb25zKFBFUk1JU1NJT05TKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjYWxsQmFjaykge1xuICAgICAgICAgICAgY2FsbEJhY2soZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnZ290LWRhdGEnKTtcbiAgICB9O1xuICAgIHRoaXMuZ290UGVybWlzc2lvbnMgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24gKHYsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgTGF6eSh2WzBdKS5lYWNoKGZ1bmN0aW9uIChyb3csIGlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKChyZXNvdXJjZU5hbWUgaW4gSURCKSAmJiAoaWQgaW4gSURCW3Jlc291cmNlTmFtZV0uc291cmNlKSl7XG4gICAgICAgICAgICAgICAgICAgIElEQltyZXNvdXJjZU5hbWVdLmdldChpZCkuX3Blcm1pc3Npb25zID0gTGF6eShyb3cpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCB0cnVlXVxuICAgICAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKExhenkodlswXSkuc2l6ZSgpKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMtJyArIHJlc291cmNlTmFtZSwgTGF6eSh2WzBdKS5rZXlzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZW1pdCgndXBkYXRlLXBlcm1pc3Npb25zJyk7XG4gICAgfTtcblxuXG4gICAgdGhpcy5nb3RNMk0gPSBmdW5jdGlvbihtMm0pe1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihkYXRhLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgdmFyIG0ybUluZGV4ID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24obSl7XG4gICAgICAgICAgICAgICAgTGF6eShtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsdmVyYil7XG4gICAgICAgICAgICAgICAgICAgIG0ybUluZGV4W3ZlcmJdKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdyZWNlaXZlZC1tMm0nKTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLW0ybS0nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5mZXRjaCA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKSB7ICAvL1xuICAgICAgICAvLyBpZiBhIGNvbm5lY3Rpb24gaXMgY3VycmVudGx5IHJ1bm5pbmcsIHdhaXQgZm9yIGNvbm5lY3Rpb24uXG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gd2FpdGluZ0Nvbm5lY3Rpb25zKXtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0sNTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGZldGNoaW5nIGFzeW5jaHJvbW91cyBtb2RlbCBmcm9tIHNlcnZlclxuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUobW9kZWxOYW1lLCAoZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgICAgIC8vIGlmIGRhdGEgY2FtZXMgZnJvbSByZWFsdGltZSBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKFcyUFJFU09VUkNFLmNvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gZ2V0dGluZyBmaWx0ZXIgZmlsdGVyZWQgYnkgY2FjaGluZyBzeXN0ZW1cbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyID0gbGlzdENhY2hlLmZpbHRlcihtb2RlbCxmaWx0ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHNvbXRoaW5nIGlzIG1pc3Npbmcgb24gbXkgbG9jYWwgREIgXG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXNrIGZvciBtaXNzaW5ncyBhbmQgcGFyc2Ugc2VydmVyIHJlc3BvbnNlIGluIG9yZGVyIHRvIGVucmljaCBteSBsb2NhbCBEQi5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBsYWNpbmcgbG9jayBmb3IgdGhpcyBtb2RlbFxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywge2ZpbHRlciA6IGZpbHRlcn0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSxjYWxsQmFjayk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVsZWFzZSBsb2NrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihyZXQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWxlYXNlIGxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywgc2VuZERhdGEsZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbHRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHT1RfQUxMLnNvdXJjZS5wdXNoKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXQgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICAvLyBzZWFyY2ggb2JqZWN0cyBmcm9tIElEQi4gSWYgc29tZSBpZCBpcyBtaXNzaW5nLCBpdCByZXNvbHZlIGl0IGJ5IHRoZSBzZXJ2ZXJcbiAgICAgICAgLy8gaWYgYSByZXF1ZXN0IHRvIHRoZSBzYW1lIG1vZGVsIGlzIHBlbmRpbmcsIHdhaXQgZm9yIGl0cyBjb21wbGV0aW9uXG4gICAgICAgIFxuICAgICAgICBpZiAoaWRzLmNvbnN0cnVjdG9yICE9PSBBcnJheSl7XG4gICAgICAgICAgICBpZHMgPSBbaWRzXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBzb21lIGVudGl0eSBpcyBtaXNzaW5nIFxuICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUgLCB7aWQ6IGlkc30sIG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgIHZhciBpdGFiID0gSURCW21vZGVsTmFtZV1cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIGlkcyl7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goaXRhYi5zb3VyY2VbaWRzW2lkXV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ290TW9kZWwgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBmb3IgKHZhciBtb2RlbE5hbWUgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gZGF0YVttb2RlbE5hbWVdO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlWydkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lXSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgbW9kZWxDYWNoZVttb2RlbE5hbWVdID0gbWFrZU1vZGVsQ2xhc3MobW9kZWwpO1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIElEQikpIHtcbiAgICAgICAgICAgICAgICBJREJbbW9kZWxOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZGVzY3JpYmUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHJldCA9IG1vZGVsQ2FjaGVbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpKXtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGZhaWxlZE1vZGVscyl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY2FjaGVLZXkgPSAnZGVzY3JpcHRpb246JyArIG1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoY2FjaGVLZXkgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ290TW9kZWwoSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbY2FjaGVLZXldKSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVzY3JpYmUnLG51bGwsIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290TW9kZWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZWxOb3RGb3VuZC5oYW5kbGUobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxlZE1vZGVsc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9ICAgICAgICBcbiAgICB9O1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZGVjb3JhdG9yKSB7XG4gICAgICAgIHZhciBrZXkgPSB1dGlscy5oYXNoKGRlY29yYXRvcik7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlcnMpKSBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXSA9IG5ldyBIYW5kbGVyKCk7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlclVzZWQpKSBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXSA9IHt9O1xuICAgICAgICBpZiAoa2V5IGluIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdW2tleV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gbW9kZWxDYWNoZSkge1xuICAgICAgICAgICAgZGVjb3JhdG9yKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXS5hZGRIYW5kbGVyKGRlY29yYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGF0dHJpYnV0ZXMpe1xuICAgICAgICB2YXIgYWRkUHJvcGVydHkgPSBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlcykge1xuICAgICAgICAgIGF0dHJpYnV0ZXMuZm9yRWFjaChmdW5jdGlvbih2YWwpe1xuICAgICAgICAgICAgdmFyIGtleSA9ICdwQTonICsgbW9kZWwubW9kZWxOYW1lICsgJzonICsgdmFsO1xuICAgICAgICAgICAgdmFyIGthdHRyID0gJ19fJyArIHZhbDtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtb2RlbC5wcm90b3R5cGUsIHZhbCwge1xuICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2F0dHIgaW4gdGhpcykpe1xuICAgICAgICAgICAgICAgICAgdmFyIHYgPSBsb2NhbFN0b3JhZ2Vba2V5ICsgdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgICB0aGlzW2thdHRyXSA9IHY/SlNPTi5wYXJzZSh2KTpudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1trYXR0cl07XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgICAgIHRoaXNba2F0dHJdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW2tleSArIHRoaXMuaWRdID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKSkgeyBwZXJzaXN0ZW50QXR0cmlidXRlc1ttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgdmFyIGF0dHJzID0gcGVyc2lzdGVudEF0dHJpYnV0ZXNbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHZhciBuZXdBdHRycyA9IExhenkoYXR0cmlidXRlcykuZGlmZmVyZW5jZShhdHRycykudG9BcnJheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5ld0F0dHJzID0gYXR0cnM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld0F0dHJzLmxlbmd0aCl7XG4gICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIG1vZGVsQ2FjaGUpe1xuICAgICAgICAgICAgICAgIGFkZFByb3BlcnR5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSwgbmV3QXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGF0dHJzLG5ld0F0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbignbmV3LW1vZGVsJywgZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVycyl7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWwubW9kZWxOYW1lXS5oYW5kbGUobW9kZWxDYWNoZVttb2RlbC5tb2RlbE5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzKG1vZGVsLm1vZGVsTmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMucXVlcnkgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHRoaXMuZGVzY3JpYmUobW9kZWxOYW1lLGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgIC8vIGFycmF5Zml5IGFsbCBmaWx0ZXIgdmFsdWVzXG4gICAgICAgICAgICBmaWx0ZXIgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHYsayl7IHJldHVybiBbayxBcnJheS5pc0FycmF5KHYpP3Y6W3ZdXX0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICB2YXIgZmlsdGVyRnVuY3Rpb24gPSB1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgdmFyIGlkeCA9IGdldEluZGV4KG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB0aHMuZmV0Y2gobW9kZWxOYW1lLGZpbHRlcix0b2dldGhlciwgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soaWR4LmZpbHRlcihmaWx0ZXJGdW5jdGlvbikudmFsdWVzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2RlbGV0ZScsIHsgaWQgOiBpZHN9LCBjYWxsQmFjayk7XG4gICAgfTtcblxuICAgIHRoaXMuY29ubmVjdCA9IGZ1bmN0aW9uIChjYWxsQmFjaykge1xuICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmlzTG9nZ2VkSW4pIHtcbiAgICAgICAgICAgIGNhbGxCYWNrKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29ubmVjdChjYWxsQmFjayk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5mdW5jdGlvbiByZVdoZWVsT1JNKGVuZFBvaW50LCBsb2dpbkZ1bmMpe1xuICAgIHRoaXMuJG9ybSA9IG5ldyBiYXNlT1JNKG5ldyB1dGlscy5yZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgbG9naW5GdW5jKSx0aGlzKTtcbiAgICB0aGlzLm9uID0gdGhpcy4kb3JtLm9uLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLmVtaXQgPSB0aGlzLiRvcm0uZW1pdC5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy51bmJpbmQgPSB0aGlzLiRvcm0udW5iaW5kLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLm9uY2UgPSB0aGlzLiRvcm0ub25jZTtcbiAgICB0aGlzLmFkZE1vZGVsSGFuZGxlciA9IHRoaXMuJG9ybS5hZGRNb2RlbEhhbmRsZXIuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSB0aGlzLiRvcm0uYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMudXRpbHMgPSB1dGlscztcbiAgICB0aGlzLmxvZ291dCA9IHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ291dC5iaW5kKHRoaXMuJG9ybS5jb25uZWN0aW9uKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzLiRvcm0uY29ubmVjdGlvbjtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKGZ1bmN0aW9uKGNhbGxCYWNrLHJlamVjdCl7XG4gICAgICAgIGNvbm5lY3Rpb24uY29ubmVjdChjYWxsQmFjayk7XG4gICAgfSkpO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ2luKHVzZXJuYW1lLCBwYXNzd29yZCwgYWNjZXB0KTsgICAgXG4gICAgfSkuYmluZCh0aGlzKSk7XG4gICAgXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dvdXQgPSBmdW5jdGlvbih1cmwpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dvdXQoKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0TW9kZWwgPSBmdW5jdGlvbihtb2RlbE5hbWUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVzY3JpYmUobW9kZWxOYW1lLGFjY2VwdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNpbmdsZSA9IGZhbHNlO1xuICAgIHZhciBtb2ROYW1lID0gbW9kZWxOYW1lO1xuICAgIGlmIChpZHMuY29uc3RydWN0b3IgIT09IEFycmF5KXtcbiAgICAgICAgc2luZ2xlID0gdHJ1ZTtcbiAgICAgICAgaWRzID0gW2lkc11cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoc2luZ2xlKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kb3JtLmdldChtb2ROYW1lLCBpZHMsIGZ1bmN0aW9uKGl0ZW1zKXsgXG4gICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQoaXRlbXNbMF0pO31cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZ2V0KG1vZE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLnF1ZXJ5ID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZmlsdGVyLCByZWxhdGVkKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdmFyIHRvZ2V0aGVyID0gbnVsbDtcbiAgICAgICAgaWYgKHJlbGF0ZWQgJiYgKHJlbGF0ZWQuY29uc3RydWN0b3IgPT09IEFycmF5KSAmJiAocmVsYXRlZC5sZW5ndGgpKXtcbiAgICAgICAgICAgIHRvZ2V0aGVyID0gcmVsYXRlZDtcbiAgICAgICAgfSBlbHNlIGlmIChyZWxhdGVkICYmIChyZWxhdGVkLmNvbnN0cnVjdG9yID09PSBTdHJpbmcpICYmIChyZWxhdGVkLmxlbmd0aCkpe1xuICAgICAgICAgICAgdG9nZXRoZXIgPSByZWxhdGVkLnNwbGl0KCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGlkcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlbGV0ZShtb2RlbE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRMb2dnZWRVc2VyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLiRvcm0uY29ubmVjdGlvbi5jYWNoZWRTdGF0dXMudXNlcl9pZClcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KCdhdXRoX3VzZXInLHRoaXMuJG9ybS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy51c2VyX2lkKTtcbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KSB7XG4gICAgICAgICAgICBzZWxmLm9uY2UoJ2xvZ2dlZC1pbicsZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgICAgIHNlbGYuZ2V0KCdhdXRoX3VzZXInLCB1c2VyKS50aGVuKGFjY2VwdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS4kc2VuZFRvRW5kcG9pbnQgPSBmdW5jdGlvbiAodXJsLCBkYXRhKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLiRwb3N0KHVybCwgZGF0YSk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9naW4odXNlcm5hbWUscGFzc3dvcmQpO1xufVxuIl19
