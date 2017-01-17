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
            console.log('adding ' + item);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJjb25uZWN0aW9uLmpzIiwidG91Y2hlci5qcyIsInZhY3V1bWNhY2hlci5qcyIsImF1dG9saW5rZXIuanMiLCJsaXN0Y2FjaGVyLmpzIiwibWFueXRvbWFueS5qcyIsImNhY2hlci5qcyIsIm9ybS5qcyJdLCJuYW1lcyI6WyJIYW5kbGVyIiwiaGFuZGxlcnMiLCJzdHJIYW5kbGVycyIsInByb3RvdHlwZSIsImFkZEhhbmRsZXIiLCJoYW5kbGVyIiwic3RySGFuZGxlciIsInV0aWxzIiwiaGFzaCIsInRvU3RyaW5nIiwicHVzaCIsImhhbmRsZSIsImFyZ3MiLCJBcnJheSIsInNsaWNlIiwiY2FsbCIsImFyZ3VtZW50cyIsImZvckVhY2giLCJmdW5jIiwiYXBwbHkiLCJoYW5kbGVCeSIsInRocyIsIk5hbWVkRXZlbnRNYW5hZ2VyIiwiZXZlbnRzIiwiaGFuZGxlcklkIiwiaWR4SWQiLCJvbiIsIm5hbWUiLCJpZCIsImVtaXQiLCJldmVudCIsInVuYmluZCIsImNvdW50IiwiTGF6eSIsImVhY2giLCJ2IiwiayIsImlkeCIsIm4iLCJyZXZlcnNlIiwieCIsInNwbGljZSIsIm9uY2UiLCJldmVudE5hbWUiLCJoYW5kbGVyRnVuY3Rpb24iLCJzZWxmIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsInJlbmFtZUZ1bmN0aW9uIiwiZm4iLCJGdW5jdGlvbiIsImJpbmQiLCJjYWNoZWQiLCJrZXkiLCJ3cmFwcGVyIiwibG9nIiwiY29uc29sZSIsInhkciIsInVybCIsImRhdGEiLCJhcHBsaWNhdGlvbiIsInRva2VuIiwiZm9ybUVuY29kZSIsIlByb21pc2UiLCJhY2NlcHQiLCJyZWplY3QiLCJyZXEiLCJYTUxIdHRwUmVxdWVzdCIsIm9ucmVhZHlzdGF0ZWNoYW5nZSIsInJlYWR5U3RhdGUiLCJyZXNwb25zZURhdGEiLCJKU09OIiwicGFyc2UiLCJyZXNwb25zZVRleHQiLCJhIiwicmVzcG9uc2UiLCJzdGF0dXMiLCJyZXF1ZXN0IiwiWERvbWFpblJlcXVlc3QiLCJvbmxvYWQiLCJzdGF0dXNUZXh0IiwiRXJyb3IiLCJvcGVuIiwib25lcnJvciIsInNldFJlcXVlc3RIZWFkZXIiLCJfX3Rva2VuX18iLCJzaXplIiwic3RyaW5naWZ5IiwibWFwIiwiZW5jb2RlVVJJIiwidG9BcnJheSIsImpvaW4iLCJzZW5kIiwiY2FwaXRhbGl6ZSIsInMiLCJ0b1VwcGVyQ2FzZSIsInRvTG93ZXJDYXNlIiwic3RyIiwicmV0IiwibGVuZ3RoIiwiY2hhckNvZGVBdCIsIm1ha2VGaWx0ZXIiLCJtb2RlbCIsImZpbHRlciIsInVuaWZpZXIiLCJkb250VHJhbnNsYXRlRmlsdGVyIiwic291cmNlIiwidmFscyIsImZpZWxkIiwiaXNBcnJheSIsImZpZWxkcyIsInR5cGUiLCJjb25zdHJ1Y3RvciIsIk51bWJlciIsInNhbWVBcyIsInkiLCJwbHVyYWxpemUiLCJiZWZvcmVDYWxsIiwiYmVmb3JlIiwiZGVjb3JhdG9yIiwidGhlbiIsImNsZWFuU3RvcmFnZSIsImxvY2FsU3RvcmFnZSIsImtleXMiLCJjaHIiLCJzcGxpdCIsInBlcm11dGF0aW9ucyIsImFyciIsImJvb2wiLCJCb29sZWFuIiwibm9vcCIsInR6T2Zmc2V0IiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwidHJhbnNGaWVsZFR5cGUiLCJkYXRlIiwiZGF0ZXRpbWUiLCJzdHJpbmciLCJ0ZXh0IiwiaW50ZWdlciIsInBhcnNlSW50IiwiZmxvYXQiLCJwYXJzZUZsb2F0IiwibW9jayIsIlNUQVRVU0tFWSIsIlJlYWx0aW1lQ29ubmVjdGlvbiIsImVuZFBvaW50Iiwicnd0Q29ubmVjdGlvbiIsImNvbm5lY3Rpb24iLCJTb2NrSlMiLCJvbm9wZW4iLCJ0ZW5hbnQiLCJvbm1lc3NhZ2UiLCJlIiwib25jbG9zZSIsInNldFRpbWVvdXQiLCJ3c0Nvbm5lY3QiLCJjYWNoZWRTdGF0dXMiLCJjbG9zZSIsInJlV2hlZWxDb25uZWN0aW9uIiwiZ2V0TG9naW4iLCJlbmRzV2l0aCIsImlzQ29ubmVjdGVkIiwiaXNMb2dnZWRJbiIsIiRwb3N0IiwiY2FsbEJhY2siLCJwcm9taXNlIiwieGhyIiwiZm9yY2UiLCJ1cGRhdGVTdGF0dXMiLCJ1c2VyX2lkIiwib2xkU3RhdHVzIiwibG9naW5JbmZvIiwiT2JqZWN0IiwibG9naW4iLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwib2JqIiwicmVhbHRpbWVFbmRQb2ludCIsIndzQ29ubmVjdGlvbiIsInVzZXJpZCIsImVycm9yIiwibG9nb3V0Iiwib2siLCJjb25uZWN0IiwiVG91Y2hlciIsInRvdWNoZWQiLCJ0b3VjaCIsInQiLCJWYWN1dW1DYWNoZXIiLCJhc2tlZCIsInBrSW5kZXgiLCJtaXNzaW5nIiwiYXNrIiwibGF6eSIsImNvbnRhaW5zIiwiZ2V0QXNrZWRJbmRleCIsIm1pc3NpbmdzIiwidW5pcXVlIiwiQXV0b0xpbmtlciIsImFjdGl2ZXMiLCJJREIiLCJXMlBSRVNPVVJDRSIsImxpc3RDYWNoZSIsIm1haW5JbmRleCIsImZvcmVpZ25LZXlzIiwibTJtIiwibTJtSW5kZXgiLCJwZXJtaXNzaW9ucyIsImluZGV4IiwiZ2V0SW5kZXhGb3IiLCJyZWZlcmVuY2VzIiwicmVmZXJlbmNlIiwiaW5kZXhOYW1lIiwidG8iLCJyZWZlcmVuY2VkQnkiLCJieSIsIm1hbnlUb01hbnkiLCJyZWxhdGlvbiIsIk1hbnlUb01hbnlSZWxhdGlvbiIsIm0ybUdldCIsImNvbGxlY3Rpb24iLCJnb3REYXRhIiwiZ2V0TTJNIiwibGlua1VubGlua2VkIiwidmFsdWVzIiwic3VtIiwiY2hhbmdlZCIsImluZGV4ZXMiLCJJTkRFWCIsImdldHRlciIsImlkcyIsIm90aGVySW5kZXgiLCJkZXNjcmliZSIsImZsYXR0ZW4iLCJtb2RlbE5hbWUiLCJpZGIiLCJmZXRjaCIsIm1haW5SZXNvdXJjZSIsImZpZWxkTmFtZSIsInRvT2JqZWN0IiwicmVzb3VyY2VOYW1lIiwiZ290UGVybWlzc2lvbnMiLCJQRVJNSVNTSU9OUyIsInNldEludGVydmFsIiwiTGlzdENhY2hlciIsImdvdEFsbCIsImNvbXBvc2l0ZUFza2VkIiwiY2FydGVzaWFuUHJvZHVjdDEiLCJiIiwiY2FydGVzaWFuUHJvZHVjdCIsImV4cGxvZGVGaWx0ZXIiLCJwcm9kdWN0IiwiciIsImZpbHRlclNpbmdsZSIsInRlc3RPbmx5IiwiZGlmZmVyZW5jZSIsImNsZWFuQ29tcG9zaXRlcyIsImZpbHRlckxlbiIsIml0ZW1zIiwiaXRlbSIsImdvdCIsInNpbmdsZSIsInNvbWUiLCJmIiwiZXhwbG9kZWQiLCJwYXJ0aWFscyIsImJhZCIsInBsdWNrIiwiYWRkIiwiZmluZCIsImdldDAiLCJnZXQxIiwiZGVsIiwibCIsImNhY2hlZFByb3BlcnR5QnlFdmVudHMiLCJwcm90byIsInByb3BlcnR5TmFtZSIsInNldHRlciIsInJlc3VsdCIsIm9ybSIsInByb3BlcnR5RGVmIiwidmFsdWUiLCJkZWZpbmVQcm9wZXJ0eSIsIlZhbGlkYXRpb25FcnJvciIsInJlc291cmNlIiwiX3Jlc291cmNlIiwiZm9ybUlkeCIsImVycm9ycyIsImJhc2VPUk0iLCJvcHRpb25zIiwiZXh0T1JNIiwiU3RyaW5nIiwiY29ubmVjdGVkIiwid3MiLCJpbmZvIiwib25NZXNzYWdlSnNvbiIsIm9uTWVzc2FnZVRleHQiLCJtZXNzYWdlIiwic2VudERhdGEiLCJ3YWl0aW5nQ29ubmVjdGlvbnMiLCJhdXRoX2dyb3VwIiwiSURYIiwiUkVWSURYIiwiYnVpbGRlckhhbmRsZXJzIiwiYnVpbGRlckhhbmRsZXJVc2VkIiwicGVyc2lzdGVudEF0dHJpYnV0ZXMiLCJldmVudEhhbmRsZXJzIiwicGVybWlzc2lvbldhaXRpbmciLCJtb2RlbENhY2hlIiwiZmFpbGVkTW9kZWxzIiwibGlua2VyIiwidmFsaWRhdGlvbkV2ZW50IiwiY3VycmVudENvbnRleHQiLCJzYXZpbmdFcnJvckhhbmxkZXIiLCJnZXRJbmRleCIsImdldFVubGlua2VkIiwiVU5MSU5LRUQiLCJQZXJtaXNzaW9uVGFibGUiLCJrbGFzcyIsInNhdmUiLCJjYiIsIm15UGVybXMiLCJncm91cF9pZCIsInBlcm1pc3Npb25MaXN0IiwicCIsInBlcm1zIiwiYWxsUGVybWlzc2lvbnMiLCJpbmRleE9mIiwibWFrZU1vZGVsQ2xhc3MiLCJfbW9kZWwiLCJwcml2YXRlQXJncyIsIm1lcmdlIiwiZnVuY1N0cmluZyIsIktsYXNzIiwicmVmX3RyYW5zbGF0aW9ucyIsImludmVyc2VfcmVmZXJlbmNlcyIsInJlZmVyZW50cyIsImZpZWxkc09yZGVyIiwiZmllbGRPcmRlciIsInJlcHJlc2VudGF0aW9uIiwiZGVsZXRlIiwiX3Blcm1pc3Npb25zIiwiYWxsX3Blcm1zIiwib2JqZWN0X2lkIiwiZ3JvdXBlZCIsInVua25vd25fZ3JvdXBzIiwiZ3JvdXBCeSIsIm8iLCJhc1JhdyIsIklEIiwiYXJnIiwid3JpdGFibGUiLCJjb250ZXh0IiwiY29weSIsImFzciIsImNvbmNhdCIsInNhdmVNdWx0aSIsIm9iamVjdHMiLCJzY29wZSIsInJhdyIsImRlbGV0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsInNhdmVQQSIsIlQiLCJvbyIsIlBBIiwiRnMiLCJmaWVsZElkeCIsInRhcCIsImluZGV4QnkiLCJ3aWRnZXQiLCJyZWYiLCJleHRfcmVmIiwibG9jYWxfcmVmIiwiVHlwZUVycm9yIiwicmV2SW5kZXgiLCJoYXNPd25Qcm9wZXJ0eSIsIm9wdHMiLCJxdWVyeSIsImZpcnN0Iiwib21vZGVsTmFtZSIsInJlYWRhYmxlIiwidmFsaWRhdG9ycyIsInVubGlua1JlZmVyZW5jZSIsImluc3RhbmNlIiwiaW5zdGFuY2VzIiwib21vZGVsIiwibGlua1JlZmVyZW5jZSIsInJlZnMiLCJJTkRFWF9NMk0iLCJXMlBfUE9TVCIsIl9leHRyYSIsIlRPT05FIiwiVE9NQU5ZIiwiTUFOWVRPTUFOWSIsIm1vZGVsQ2xhc3MiLCJ6aXAiLCJkZWxldGVkIiwiTVBBIiwicmVjb3JkIiwiaXRhYiIsInRhYmxlIiwiaWsiLCJubmV3IiwidXBkYXRlZCIsIm5ld09iamVjdHMiLCJvbGRJdGVtIiwib2xkQ29weSIsIm5ld0l0ZW0iLCJubyIsInRvdGFsUmVzdWx0cyIsInVkeCIsIkFTS0VEX1VOTElOS0VEIiwiQVNLRURfTTJNIiwiTUlEWCIsImdvdE0yTSIsInJvdyIsIm0iLCJ2ZXJiIiwidG9nZXRoZXIiLCJzZW5kRGF0YSIsIkdPVF9BTEwiLCJnb3RNb2RlbCIsImNhY2hlS2V5IiwibW9kZWxOb3RGb3VuZCIsImFkZE1vZGVsSGFuZGxlciIsImFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiYXR0cmlidXRlcyIsImFkZFByb3BlcnR5IiwidmFsIiwia2F0dHIiLCJzZXQiLCJhdHRycyIsIm5ld0F0dHJzIiwiZmlsdGVyRnVuY3Rpb24iLCJyZVdoZWVsT1JNIiwibG9naW5GdW5jIiwiJG9ybSIsImdldE1vZGVsIiwibW9kTmFtZSIsInJlbGF0ZWQiLCJnZXRMb2dnZWRVc2VyIiwidXNlciIsIiRzZW5kVG9FbmRwb2ludCJdLCJtYXBwaW5ncyI6Ijs7O0lBQUEsYTtJQUVBLFNBQUFBLE9BQUEsR0FBQTtBQUFBLFFBQ0EsS0FBQUMsUUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLFFBRUEsS0FBQUMsV0FBQSxHQUFBLEVBQUEsQ0FGQTtBQUFBLEs7SUFHQSxDO0lBRUFGLE9BQUEsQ0FBQUcsU0FBQSxDQUFBQyxVQUFBLEdBQUEsVUFBQUMsT0FBQSxFQUFBO0FBQUEsUUFDQSxJQUFBQyxVQUFBLEdBQUFDLEtBQUEsQ0FBQUMsSUFBQSxDQUFBSCxPQUFBLENBQUFJLFFBQUEsRUFBQSxDQUFBLENBREE7QUFBQSxRQUVBLElBQUEsQ0FBQSxDQUFBSCxVQUFBLElBQUEsS0FBQUosV0FBQSxDQUFBLEVBQUE7QUFBQSxZQUNBLEtBQUFBLFdBQUEsQ0FBQUksVUFBQSxJQUFBRCxPQUFBLENBREE7QUFBQSxZQUVBLEtBQUFKLFFBQUEsQ0FBQVMsSUFBQSxDQUFBTCxPQUFBLEVBRkE7QUFBQSxTQUZBO0FBQUEs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QUFBO0FBQUEsb0JBQ0EsSUFBQUEsSUFBQSxLQUFBLFVBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUFvQixVQUFBLENBREE7QUFBQSxxQkFBQSxNQUVBO0FBQUEsd0JBQ0EsT0FBQUMsVUFBQSxFQUFBLENBREE7QUFBQSxxQkFIQTtBQUFBLGlCQUFBLE1BTUE7QUFBQSxvQkFDQSxPQUFBRyxNQUFBLENBQUF4QixJQUFBLENBQUEsQ0FEQTtBQUFBLGlCQVBBO0FBQUEsYUFEQTtBQUFBLFNBQUEsQ0FBQSxDQURBO0FBQUEsSztJQXVOQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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QUNBLE9BQUEsS0FBQTZRLElBQUEsQ0FBQXpTLFVBQUEsQ0FBQTBCLEtBQUEsQ0FBQUMsUUFBQSxFQUFBQyxRQUFBLENBQUEsQ0FEQTtBQUFBLEtBQUEsQyIsImZpbGUiOiJyd3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEhhbmRsZXIoKXtcbiAgICB0aGlzLmhhbmRsZXJzID0gW107XG4gICAgdGhpcy5zdHJIYW5kbGVycyA9IHt9O1xufTtcblxuSGFuZGxlci5wcm90b3R5cGUuYWRkSGFuZGxlciA9IGZ1bmN0aW9uIChoYW5kbGVyKXtcbiAgICB2YXIgc3RySGFuZGxlciA9IHV0aWxzLmhhc2goaGFuZGxlci50b1N0cmluZygpKTtcbiAgICBpZiAoIShzdHJIYW5kbGVyIGluIHRoaXMuc3RySGFuZGxlcnMpKXtcbiAgICAgICAgdGhpcy5zdHJIYW5kbGVyc1tzdHJIYW5kbGVyXSA9IGhhbmRsZXI7XG4gICAgICAgIHRoaXMuaGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9XG59O1xuSGFuZGxlci5wcm90b3R5cGUuaGFuZGxlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywwKTtcbiAgICB0aGlzLmhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oZnVuYyl7XG4gICAgICAgIGZ1bmMuYXBwbHkobnVsbCxhcmdzKTtcbiAgICB9KVxufTtcbkhhbmRsZXIucHJvdG90eXBlLmhhbmRsZUJ5ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKTtcbiAgICB2YXIgdGhzID0gYXJndW1lbnRzWzBdO1xuICAgIHRoaXMuaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihmdW5jKXtcbiAgICAgICAgZnVuYy5hcHBseSh0aHMsYXJncyk7XG4gICAgfSlcbn07XG5cblxuZnVuY3Rpb24gTmFtZWRFdmVudE1hbmFnZXIgKCl7XG4gICAgdmFyIGV2ZW50cyA9IHt9O1xuICAgIHZhciBoYW5kbGVySWQgPSB7fTtcbiAgICB2YXIgaWR4SWQgPSAwO1xuICAgIHRoaXMub24gPSBmdW5jdGlvbihuYW1lLCBmdW5jKXtcbiAgICAgICAgaWYgKCEobmFtZSBpbiBldmVudHMpKXtcbiAgICAgICAgICAgIGV2ZW50c1tuYW1lXSA9IG5ldyBBcnJheSgpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpZCA9IGlkeElkICsrO1xuICAgICAgICBldmVudHNbbmFtZV0ucHVzaChmdW5jKTtcbiAgICAgICAgaGFuZGxlcklkW2lkXSA9IGZ1bmM7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9O1xuICAgIHRoaXMuZW1pdCA9IGZ1bmN0aW9uKG5hbWUpe1xuICAgICAgICBpZiAobmFtZSBpbiBldmVudHMpe1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSk7XG4gICAgICAgICAgICBldmVudHNbbmFtZV0uZm9yRWFjaChmdW5jdGlvbihldmVudCl7XG4gICAgICAgICAgICAgICAgZXZlbnQuYXBwbHkobnVsbCxhcmdzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLnVuYmluZCA9IGZ1bmN0aW9uKGhhbmRsZXIpe1xuICAgICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgICBpZiAoaGFuZGxlciBpbiBoYW5kbGVySWQpe1xuICAgICAgICAgICAgdmFyIGZ1bmMgPSBoYW5kbGVySWRbaGFuZGxlciArICcnXTtcbiAgICAgICAgICAgIExhenkoZXZlbnRzKS5lYWNoKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIG4gaW4gdil7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2W25dID09PSBmdW5jKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkeC5wdXNoKG4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZHgucmV2ZXJzZSgpLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgIHYuc3BsaWNlKHgsMSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgaGFuZGxlcklkW2hhbmRsZXJdO1xuICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDYWxsIGV2ZW50IG9uY2VcbiAgICAgKi9cbiAgICB0aGlzLm9uY2UgPSBmdW5jdGlvbihldmVudE5hbWUsIGhhbmRsZXJGdW5jdGlvbikge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBoYW5kbGVyID0gdGhpcy5vbihldmVudE5hbWUsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBoYW5kbGVyRnVuY3Rpb24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHNlbGYudW5iaW5kKGhhbmRsZXIpO1xuICAgICAgICB9KVxuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNhY2hlZEtleUlkeCA9IDA7XG5cbnZhciBudWxsU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiAnJ307XG5cbmZ1bmN0aW9uIG1vY2tPYmplY3QoKXtcbiAgICByZXR1cm4gbmV3IFByb3h5KHt9LCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24odGFyZ2V0LCBuYW1lKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG5hbWUgID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgaWYgKG5hbWUgPT09ICd0b1N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGxTdHJpbmc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1vY2tPYmplY3QoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRbbmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG4vKlxudmFyICRQT1NUID0gZnVuY3Rpb24odXJsLCBkYXRhLCBjYWxsQmFjaywgZXJyb3JCYWNrLGhlYWRlcnMpe1xuICAgIHZhciBvcHRzID0ge1xuICAgICAgICBhY2NlcHRzIDogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICB1cmwgOiB1cmwsXG4gICAgICAgIGRhdGEgOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgZGF0YVR5cGUgOiAnanNvbicsXG4gICAgICAgIHN1Y2Nlc3MgOiBjYWxsQmFjayxcbiAgICAgICAgZXJyb3IgOiBlcnJvckJhY2ssXG4gICAgICAgIG1ldGhvZCA6ICdQT1NUJyxcbiAgICAgICAgY29udGVudFR5cGUgOiAnYXBwbGljYXRpb24vanNvbidcbiAgICB9O1xuICAgIGlmIChoZWFkZXJzKXtcbiAgICAgICAgb3B0cy5oZWFkZXJzID0gaGVhZGVycztcbiAgICAgICAgb3B0cy5jcm9zc0RvbWFpbiA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiAkLmFqYXgob3B0cyk7XG59XG5cblxuZnVuY3Rpb24gcmVXaGVlbENvbm5lY3Rpb24oZW5kUG9pbnQsIGdldExvZ2luKXtcbiAgICAvLyBtYWluIFxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmdldExvZ2luID0gZ2V0TG9naW47XG4gICAgdGhpcy5ldmVudHMgPSBuZXcgTmFtZWRFdmVudE1hbmFnZXIoKVxuICAgIHRoaXMuJFBPU1QgPSAkUE9TVC5iaW5kKHRoaXMpO1xuICAgIHRoaXMub3B0aW9ucyA9IHtlbmRQb2ludCA6IGVuZFBvaW50fTtcbiAgICB0aGlzLm9uID0gdGhpcy5ldmVudHMub24uYmluZCh0aGlzKTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbihzdGF0dXMsIGNhbGxCYWNrLCBlcnJvcikge1xuICAgIGlmIChzdGF0dXMpIHtcbiAgICAgICAgdmFyIGlzTG9nZ2VkID0gKHN0YXR1cy51c2VyX2lkICYmICF0aGlzLm9wdGlvbnMudXNlcl9pZCApO1xuICAgICAgICBmb3IgKHZhciB4IGluIHN0YXR1cyl7IHRoaXMub3B0aW9uc1t4XSA9IHN0YXR1c1t4XTsgfVxuICAgICAgICBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG4gICAgICAgIGlmIChpc0xvZ2dlZCkge1xuICAgICAgICAgICAgdGhpcy5ldmVudHMuZW1pdCgnbG9naW4nLCB0aGlzLm9wdGlvbnMudXNlcl9pZCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudXNlcl9pZCAmJiB0aGlzLmdldExvZ2luKXtcbiAgICAgICAgdmFyIGxvZ0luZm8gPSB0aGlzLmdldExvZ2luKGVycm9yKTtcbiAgICAgICAgaWYgKGxvZ0luZm8uY29uc3RydWN0b3IgPT09IE9iamVjdCl7XG4gICAgICAgICAgICB0aGlzLmxvZ2luKGxvZ0luZm8udXNlcm5hbWUsIGxvZ0luZm8ucGFzc3dvcmQpXG4gICAgICAgICAgICAudGhlbigoZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhzdGF0dXMsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgICAgICB9IGVsc2UgaWYgKGxvZ0luZm8uY29uc3RydWN0b3IgPT09IFByb21pc2UpIHtcbiAgICAgICAgICAgIGxvZ0luZm8udGhlbigoZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgICAgICB2YXIgeCA9IHRoaXMubG9naW4ob2JqLnVzZXJuYW1lLG9iai5wYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgdmFyIG1hbmFnZUVycm9yID0gKGZ1bmN0aW9uKGJhZCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKG51bGwsY2FsbEJhY2ssYmFkLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9KS5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgICAgIGlmIChjYWxsQmFjayl7XG4gICAgICAgICAgICAgICAgICAgIHgudGhlbihjYWxsQmFjayxtYW5hZ2VFcnJvcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgeC50aGVuKG51bGwsIG1hbmFnZUVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHRoaXMub3B0aW9ucyk7XG4gICAgfSAgICBcbn1cblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnN0YXR1cyA9IGZ1bmN0aW9uKGNhbGxCYWNrLCBmb3JjZSl7XG4gICAgaWYgKCgnbGFzdFJXVFN0YXR1cycgaW4gbG9jYWxTdG9yYWdlKSAmJiAhZm9yY2UpIHtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgdmFyIHN0YXR1cyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoc3RhdHVzLGNhbGxCYWNrKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdGF0dXMoY2FsbEJhY2ssIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYWxsQmFjayAmJiBjYWxsQmFjayhzdGF0dXMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fc3RhdHVzX2NhbGxpbmcpe1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLnN0YXR1cyhjYWxsQmFjayk7XG4gICAgICAgIH0sNTApO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy50aW1lc3RhbXApe1xuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayh0aGlzLm9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXR1c19jYWxsaW5nID0gdHJ1ZTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdCgnYXBpL3N0YXR1cycsbnVsbCxmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMgPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xuICAgICAgICAgICAgc2VsZi5fc3RhdHVzX2NhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHNlbGYudXBkYXRlU3RhdHVzKHN0YXR1cyxjYWxsQmFjayk7XG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgfVxufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLiRwb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLGNhbGxCYWNrKXtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIGlmICghZGF0YSl7XG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIHZhciBoZWFkZXJzID0geyBcbiAgICAgICAgICAgIHRva2VuIDogdGhpcy5vcHRpb25zLnRva2VuLFxuICAgICAgICAgICAgYXBwbGljYXRpb24gOiB0aGlzLm9wdGlvbnMuYXBwbGljYXRpb25cbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaGVhZGVycyA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5vcHRpb25zLmVuZFBvaW50ICsgdXJsLCBkYXRhLCB0aHMub3B0aW9ucy5hcHBsaWNhdGlvbiwgdGhzLm9wdGlvbnMudG9rZW4pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZScsIHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzICsgJy1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7IGNhbGxCYWNrKCB4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQgKX07XG4gICAgICAgICAgICAgICAgYWNjZXB0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItanNvbicsIHhoci5yZXNwb25zZURhdGEsIHhoci5zdGF0dXMsIHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1qc29uLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VEYXRhLHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1odHRwJyx4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItaHR0cC0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCl7XG4gICAgdmFyIHVybCA9IHRoaXMub3B0aW9ucy5lbmRQb2ludCArICdhcGkvbG9naW4nO1xuICAgIHZhciBjb25uZWN0aW9uID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih1cmwseyB1c2VybmFtZTogdXNlcm5hbWUsIHBhc3N3b3JkIDogcGFzc3dvcmR9LCBudWxsLGNvbm5lY3Rpb24ub3B0aW9ucy50b2tlbiwgdHJ1ZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbi51cGRhdGVTdGF0dXMoeGhyLnJlc3BvbnNlRGF0YSk7XG4gICAgICAgICAgICAgICAgYWNjZXB0KHN0YXR1cyk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKGNhbGxCYWNrKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHdzY29ubmVjdCA9IGZ1bmN0aW9uKHNlbGYpe1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbiA9IG5ldyB1dGlscy53c0Nvbm5lY3Qoc2VsZi5vcHRpb25zKTtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24ub25Db25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLmV2ZW50cy5lbWl0KCd3cy1jb25uZWN0ZWQnLCBzZWxmLndzQ29ubmVjdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbi5vbkRpc2Nvbm5lY3QoZnVuY3Rpb24oKXsgXG4gICAgICAgICAgICBpZiAoc2VsZi5vcHRpb25zICYmIHNlbGYub3B0aW9ucy5yZWFsdGltZUVuZFBvaW50KXtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHdzY29ubmVjdChzZWxmKTsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSwxMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0aGlzLnN0YXR1cygoZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgaWYgKCd0b2tlbicgaW4gc2VsZi5vcHRpb25zKXtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGluZyB0byAnICsgc2VsZi5vcHRpb25zLmVuZFBvaW50KTtcbiAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMudXNlcm5hbWUgJiYgc2VsZi5vcHRpb25zLnBhc3N3b3JkKXtcbiAgICAgICAgICAgICAgICBzZWxmLmxvZ2luKFxuICAgICAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucy5wYXNzd29yZCxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZW5ld2luZyBjb25uZWN0aW9uJylcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc2VsZi5vcHRpb25zLnRva2VuICYmIHNlbGYub3B0aW9ucy5yZWFsdGltZUVuZFBvaW50ICYmICghc2VsZi53c0Nvbm5lY3Rpb24pKXtcbiAgICAgICAgICAgIHdzY29ubmVjdChzZWxmKTtcbiAgICAgICAgfVxuICAgIH0pLmJpbmQodGhpcykpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ091dCA9IGZ1bmN0aW9uKHVybCwgY2FsbEJhY2spe1xuICAgIHJldHVybiB0aGlzLiRwb3N0KCdhcGkvbG9nb3V0Jyx7fSwoZnVuY3Rpb24oc3RhdHVzKSB7XG4gICAgICAgIGlmICgnbGFzdFJXVFN0YXR1cycgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0ge2VuZFBvaW50OiB0aGlzLm9wdGlvbnMuZW5kUG9pbnR9O1xuICAgICAgICBpZiAodGhpcy53c0Nvbm5lY3Rpb24pIHsgXG4gICAgICAgICAgICB0aGlzLndzQ29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24gPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cmwpIHsgbG9jYXRpb24gPSB1cmw7IH1cbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICB9KS5iaW5kKHRoaXMpKTtcbn1cbiovXG52YXIgdXRpbHMgPSB7XG4gICAgcmVuYW1lRnVuY3Rpb24gOiBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgICAgICAgcmV0dXJuIChuZXcgRnVuY3Rpb24oXCJyZXR1cm4gZnVuY3Rpb24gKGNhbGwpIHsgcmV0dXJuIGZ1bmN0aW9uIFwiICsgbmFtZSArXG4gICAgICAgICAgICBcIiAoKSB7IHJldHVybiBjYWxsKHRoaXMsIGFyZ3VtZW50cykgfTsgfTtcIikoKSkoRnVuY3Rpb24uYXBwbHkuYmluZChmbikpO1xuICAgIH0sXG4gICAgY2FjaGVkIDogZnVuY3Rpb24oZnVuYywga2V5KXtcbiAgICAgICAgaWYgKCFrZXkpeyAgICBcbiAgICAgICAgICAgIGtleSA9ICdfJyArIGNhY2hlZEtleUlkeCsrO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHdyYXBwZXIoKXtcbiAgICAgICAgICAgIGlmICghdGhpc1trZXldKXtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBmdW5jLmNhbGwodGhpcyxbYXJndW1lbnRzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpc1trZXldO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gd3JhcHBlcjtcbiAgICB9LFxuLy8gICAgJFBPU1QgOiAkUE9TVCxcbi8vICAgIHJlV2hlZWxDb25uZWN0aW9uOiByZVdoZWVsQ29ubmVjdGlvbixcbiAgICBsb2c6IGZ1bmN0aW9uKCl7IFxuICAgICAgICBjb25zb2xlLmxvZyhhcmd1bWVudHMpO1xuICAgIH0sXG5cbiAgICB4ZHI6IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGFwcGxpY2F0aW9uLHRva2VuLCBmb3JtRW5jb2RlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlIGFuIEhUVFAgUmVxdWVzdCBhbmQgcmV0dXJuIGl0cyBwcm9taXNlLlxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgcmVxO1xuICAgICAgICAgICAgaWYgKCFkYXRhKSB7IGRhdGEgPSB7fTt9XG5cbiAgICAgICAgICAgIGlmKFhNTEh0dHBSZXF1ZXN0KSB7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgICAgICAgICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2VEYXRhID0gSlNPTi5wYXJzZShyZXEucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZURhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlID0ge3Jlc3BvbnNlRGF0YTogcmVzcG9uc2VEYXRhLCByZXNwb25zZVRleHQ6IHJlcS5yZXNwb25zZVRleHQsc3RhdHVzOiByZXEuc3RhdHVzLCByZXF1ZXN0OiByZXF9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcS5zdGF0dXMgPj0gMjAwICYmIHJlcS5zdGF0dXMgPCA0MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihYRG9tYWluUmVxdWVzdCl7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFhEb21haW5SZXF1ZXN0KCk7XG4gICAgICAgICAgICAgICAgcmVxLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBhY2NlcHQocmVxLnJlc3BvbnNlVGV4dCxyZXEuc3RhdHVzVGV4dCwgcmVxKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdDT1JTIG5vdCBzdXBwb3J0ZWQnKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlcS5vcGVuKCdQT1NUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgICAgIHJlcS5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICAgIGlmICh0b2tlbikgeyBkYXRhLl9fdG9rZW5fXyA9IHRva2VuIH1cbiAgICAgICAgICAgIGlmICghZm9ybUVuY29kZSl7XG4gICAgICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ3RleHQvcGxhaW4nKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5zaXplKCk/SlNPTi5zdHJpbmdpZnkoZGF0YSk6Jyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBrICsgJz0nICsgZW5jb2RlVVJJKHYudG9TdHJpbmcoKSk7ICBcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCkuam9pbignJicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVxLnNlbmQoZGF0YSk7XG4gICAgLy8gICAgICAgIHJlcS5zZW5kKG51bGwpO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgY2FwaXRhbGl6ZSA6IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHJldHVybiBzWzBdLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgfSxcblxuICAgIGhhc2ggOiBmdW5jdGlvbihzdHIpe1xuICAgICAgICAvKipcbiAgICAgICAgICogSGFzaGVkIGZ1bmN0aW9uXG4gICAgICAgICAqL1xuICAgICAgICBzdHIgPSBzdHIudG9TdHJpbmcoKTtcbiAgICAgICAgdmFyIHJldCA9IDE7XG4gICAgICAgIGZvciAodmFyIHggPSAwO3g8c3RyLmxlbmd0aDt4Kyspe1xuICAgICAgICAgICAgcmV0ICo9ICgxICsgc3RyLmNoYXJDb2RlQXQoeCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAocmV0ICUgMzQ5NTgzNzQ5NTcpLnRvU3RyaW5nKCk7XG4gICAgfSxcblxuICAgIG1ha2VGaWx0ZXIgOiBmdW5jdGlvbiAobW9kZWwsIGZpbHRlciwgdW5pZmllciwgZG9udFRyYW5zbGF0ZUZpbHRlcikge1xuICAgICAgICAvKipcbiAgICAgICAgICogTWFrZSBmaWx0ZXIgZm9yIEFycmF5LmZpbHRlciBmdW5jdGlvbiBhcyBhbiBhbmQgb2Ygb3JcbiAgICAgICAgICovXG4gICAgICAgIGlmICghdW5pZmllcikgeyB1bmlmaWVyID0gJyAmJiAnO31cbiAgICAgICAgaWYgKExhenkoZmlsdGVyKS5zaXplKCkgPT09IDApe1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpeyByZXR1cm4gdHJ1ZSB9O1xuICAgICAgICB9XG4gICAgICAgIHZhciBzb3VyY2UgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHZhbHMsIGZpZWxkKXtcbiAgICAgICAgICAgIGlmICghdmFscykgeyB2YWxzID0gW251bGxdfVxuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHMpKXtcbiAgICAgICAgICAgICAgICB2YWxzID0gW3ZhbHNdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFkb250VHJhbnNsYXRlRmlsdGVyICYmIChtb2RlbC5maWVsZHNbZmllbGRdLnR5cGUgPT09ICdyZWZlcmVuY2UnKSkge1xuICAgICAgICAgICAgICAgIGZpZWxkID0gJ18nICsgZmllbGQ7XG4gICAgICAgICAgICAgICAgdmFscyA9IExhenkodmFscykubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoeCAmJiAoeC5jb25zdHJ1Y3RvciAhPT0gTnVtYmVyKSl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtb2RlbC5maWVsZHNbZmllbGRdLnR5cGUgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICB2YWxzID0gdmFscy5tYXAoSlNPTi5zdHJpbmdpZnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICcoJyArICBMYXp5KHZhbHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyh4LicgKyBmaWVsZCArICcgPT09ICcgKyB4ICsgJyknO1xuICAgICAgICAgICAgfSkuam9pbignIHx8ICcpICArJyknO1xuICAgICAgICB9KS50b0FycmF5KCkuam9pbih1bmlmaWVyKTtcbiAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcInhcIiwgXCJyZXR1cm4gXCIgKyBzb3VyY2UpO1xuICAgIH0sXG5cbiAgICBzYW1lQXMgOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogRGVlcCBlcXVhbFxuICAgICAgICAgKi9cbiAgICAgICAgZm9yICh2YXIgayBpbiB4KSB7XG4gICAgICAgICAgICBpZiAoeVtrXSAhPSB4W2tdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgcGx1cmFsaXplIDogZnVuY3Rpb24oc3RyLCBtb2RlbCl7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMZXhpY2FsbHkgcmV0dXJucyBlbmdsaXNoIHBsdXJhbCBmb3JtXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gc3RyICsgJ3MnO1xuICAgIH0sXG5cbiAgICBiZWZvcmVDYWxsIDogZnVuY3Rpb24oZnVuYywgYmVmb3JlKXtcbiAgICAgICAgdmFyIGRlY29yYXRvciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBiZWZvcmUoKS50aGVuKGZ1bmMpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBkZWNvcmF0b3I7XG4gICAgfSxcblxuICAgIGNsZWFuU3RvcmFnZSA6IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDbGVhbiBsb2NhbFN0b3JhZ2Ugb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBMYXp5KGxvY2FsU3RvcmFnZSkua2V5cygpLmVhY2goZnVuY3Rpb24oayl7XG4gICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW2tdO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgcmV2ZXJzZSA6IGZ1bmN0aW9uIChjaHIsIHN0cikge1xuICAgICAgICByZXR1cm4gc3RyLnNwbGl0KGNocikucmV2ZXJzZSgpLmpvaW4oY2hyKTtcbiAgICB9LFxuICAgIHBlcm11dGF0aW9uczogZnVuY3Rpb24oYXJyKXtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBmb3IgKHZhciB4ID0gYXJyLmxlbmd0aC0xOyB4ID49IDA7eC0tKXtcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSBhcnIubGVuZ3RoLTE7IHkgPj0gMDsgeS0tKXtcbiAgICAgICAgICAgICAgICBpZiAoeCAhPT0geSlcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goW2Fyclt4XSwgYXJyW3ldXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuXG4gICAgYm9vbDogQm9vbGVhbixcblxuICAgIG5vb3AgOiBmdW5jdGlvbigpe30sXG5cbiAgICB0ek9mZnNldDogbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDAsXG5cbiAgICB0cmFuc0ZpZWxkVHlwZToge1xuICAgICAgICBkYXRlOiBmdW5jdGlvbih4KSB7IHJldHVybiBuZXcgRGF0ZSh4ICogMTAwMCArIHV0aWxzLnR6T2Zmc2V0ICkgfSxcbiAgICAgICAgZGF0ZXRpbWU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG5ldyBEYXRlKHggKiAxMDAwICsgdXRpbHMudHpPZmZzZXQgKSB9LFxuICAgICAgICBzdHJpbmc6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG9TdHJpbmcoKTsgfSxcbiAgICAgICAgdGV4dDogZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b1N0cmluZygpOyB9LFxuICAgICAgICBpbnRlZ2VyOiBmdW5jdGlvbih4KSB7IHJldHVybiBwYXJzZUludCh4KTsgfSxcbiAgICAgICAgZmxvYXQ6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBhcnNlRmxvYXQoeCk7IH1cbiAgICB9LCBcbiAgICBtb2NrIDogbW9ja09iamVjdFxufTtcblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IFNUQVRVU0tFWSA9ICdsYXN0UldUQ29ubmVjdGlvblN0YXR1cyc7XG5cbmZ1bmN0aW9uIFJlYWx0aW1lQ29ubmVjdGlvbihlbmRQb2ludCwgcnd0Q29ubmVjdGlvbil7XG4gICAgLyoqXG4gICAgICogQ29ubmVjdHMgYSB3ZWJzb2NrZXQgd2l0aCByZVdoZWVsIGNvbm5lY3Rpb25cbiAgICAgKi9cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgY29ubmVjdGlvbiA9IG5ldyBTb2NrSlMoZW5kUG9pbnQpO1xuICAgIGNvbm5lY3Rpb24ub25vcGVuID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ29wZW4gOiAnICsgeCk7XG4gICAgICAgIGNvbm5lY3Rpb24udGVuYW50KCk7XG4gICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtY29ubmVjdGlvbi1vcGVuJyx4KTtcbiAgICB9O1xuICAgIGNvbm5lY3Rpb24ub25tZXNzYWdlID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgaWYgKHgudHlwZSA9PSAnbWVzc2FnZScpIHtcbiAgICAgICAgICAgIC8vJC5ub3RpZnkoeC5kYXRhKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy9UT0RPIHNldCBmcm9tUmVhbHRpbWVcbiAgICAgICAgICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLW1lc3NhZ2UtanNvbicsIEpTT04ucGFyc2UoeC5kYXRhKSk7XG4gICAgICAgICAgICAgICAgLy9UT0RPIHVuc2V0IGZyb21SZWFsdGltZVxuICAgICAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1tZXNzYWdlLXRleHQnLCBKU09OLnBhcnNlKHguZGF0YSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Zyb20gcmVhbHRpbWUgJyx4KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzZXRUaW1lb3V0KHV0aWxzLndzQ29ubmVjdCwxMDAwKTtcbiAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1jb25uZWN0aW9uLWNsb3NlZCcpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi50ZW5hbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uc2VuZCgnVEVOQU5UOicgKyByd3RDb25uZWN0aW9uLmNhY2hlZFN0YXR1cy5hcHBsaWNhdGlvbiArICc6JyArIHJ3dENvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnRva2VuKTtcbiAgICB9XG4gICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgfVxufSAgICBcblxuZnVuY3Rpb24gcmVXaGVlbENvbm5lY3Rpb24oZW5kUG9pbnQsIGdldExvZ2luKXtcbiAgICAvKipcbiAgICAgKiBDb25uZWN0aW9uIGJhc2ljIGZvciByZVdoZWVsXG4gICAgICogQHBhcmFtIGVuZFBvaW50OiBzdHJpbmcgYmFzZSB1cmwgZm9yIGFsbCBjb211bmljYXRpb25cbiAgICAgKiBAcGFyYW0gZ2V0TG9naW46IGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBpbiBjYXNlIG9mIG1pc3NpbmcgbG9naW4uXG4gICAgICogIHRoaXMgZnVuY3Rpb24gY291bGQgcmV0dXJuIDpcbiAgICAgKiAgLSAgIGEgeyB1c2VybmFtZSA6IDx1c2VybmFtZT4gLCBwYXNzd29yZDogPHBhc3N3b3JkPn0gb3JcbiAgICAgKiAgLSAgIGIgUHJvbWlzZSAtPiB7IHVzZXJuYW1lIDogPHVzZXJuYW1lPiAsIHBhc3N3b3JkOiA8cGFzc3dvcmQ+fVxuICAgICAqL1xuICAgIC8vIG1haW4gaW5pdGlhbGl6YXRpb25cbiAgICB2YXIgZXZlbnRzID0gbmV3IE5hbWVkRXZlbnRNYW5hZ2VyKCk7XG4gICAgdGhpcy5nZXRMb2dpbiA9IGdldExvZ2luO1xuICAgIHRoaXMuZW5kUG9pbnQgPSBlbmRQb2ludC5lbmRzV2l0aCgnLycpPyBlbmRQb2ludDogKGVuZFBvaW50ICsgJy8nKTtcbiAgICB0aGlzLm9uID0gZXZlbnRzLm9uO1xuICAgIHRoaXMudW5iaW5kID0gZXZlbnRzLnVuYmluZDtcbiAgICB0aGlzLmVtaXQgPSBldmVudHMuZW1pdDtcbiAgICB0aGlzLm9uY2UgPSBldmVudHMub25jZTtcbiAgICB0aGlzLmNhY2hlZFN0YXR1cyA9IHt9O1xuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmlzTG9nZ2VkSW4gPSBmYWxzZTtcbiAgICAvLyByZWdpc3RlcmluZyB1cGRhdGUgc3RhdHVzXG4gICAgdmFyIHRocyA9IHRoaXM7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuJHBvc3QgPSBmdW5jdGlvbih1cmwsIGRhdGEsY2FsbEJhY2spe1xuICAgIC8qKlxuICAgICAqIEFKQVggY2FsbCBmb3IgZmV0Y2ggYWxsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAcGFyYW0gdXJsOiBsYXN0IHVybCBwYXJ0IGZvciBhamF4IGNhbGxcbiAgICAgKiBAcGFyYW0gZGF0YTogZGF0YSBvYmplY3QgdG8gYmUgc2VudFxuICAgICAqIEBwYXJhbSBjYWxsQmFjazogZnVuY3Rpb24oeGhyKSB3aWxsIGJlIGNhbGxlZCB3aGVuIGRhdGEgYXJyaXZlc1xuICAgICAqIEByZXR1cm5zIFByb21pc2U8eGhyPiBzYW1lIG9mIGNhbGxCYWNrXG4gICAgICovXG4gICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLmVuZFBvaW50ICsgdXJsLCBkYXRhLCB0aHMuY2FjaGVkU3RhdHVzLmFwcGxpY2F0aW9uLCB0aHMuY2FjaGVkU3RhdHVzLnRva2VuKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICB0aHMuZW1pdCgnaHR0cC1yZXNwb25zZScsIHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cyArICctanNvbicsIHhoci5yZXNwb25zZURhdGEsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYWxsQmFjaykgeyBjYWxsQmFjayggeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0ICl9O1xuICAgICAgICAgICAgICAgIGFjY2VwdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItanNvbicsIHhoci5yZXNwb25zZURhdGEsIHhoci5zdGF0dXMsIHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWpzb24tJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZURhdGEsdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItaHR0cCcseGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cyx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItaHR0cC0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5zdGF0dXMgPSBmdW5jdGlvbihjYWxsQmFjaywgZm9yY2UpIHtcbiAgICAvKipcbiAgICAgKiBDaGVjayBjdXJyZW50IHN0YXR1cyBhbmQgY2FsbGJhY2sgZm9yIHJlc3VsdHMuXG4gICAgICogSXQgY2FjaGVzIHJlc3VsdHMgZm9yIGZ1cnRoZXIuXG4gICAgICogQHBhcmFtIGNhbGxiYWNrOiAoc3RhdHVzIG9iamVjdClcbiAgICAgKiBAcGFyYW0gZm9yY2U6IGJvb2xlYW4gaWYgdHJ1ZSBlbXB0aWVzIGNhY2hlICBcbiAgICAgKiBAcmV0dXJuIHZvaWRcbiAgICAgKi9cbiAgICAvLyBpZiBmb3JjZSwgY2xlYXIgYWxsIGNhY2hlZCB2YWx1ZXNcbiAgICBpZiAoZm9yY2UpIHtcbiAgICAgICAgdGhpcy5jYWNoZWRTdGF0dXMgPSB7fTtcbiAgICAgICAgaWYgKFNUQVRVU0tFWSBpbiBsb2NhbFN0b3JhZ2Upe1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtTVEFUVVNLRVldO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIHRyeSBmb3IgdmFsdWUgcmVzb2x1dGlvblxuICAgIC8vIGZpcnN0IG9uIG1lbW9yeVxuICAgIGlmIChMYXp5KHRoaXMuY2FjaGVkU3RhdHVzKS5zaXplKCkpe1xuICAgIFxuICAgIC8vIHRoZW4gaW4gbG9jYWxTdG9yYWdlXG4gICAgfSBlbHNlIGlmIChTVEFUVVNLRVkgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKEpTT04ucGFyc2UobG9jYWxTdG9yYWdlW1NUQVRVU0tFWV0pKTtcbiAgICAvLyB0aGVuIG9uIHNlcnZlclxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICB0aGlzLiRwb3N0KCdhcGkvc3RhdHVzJyx7fSwgZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgICAgICAgICB0aHMudXBkYXRlU3RhdHVzKHN0YXR1cyk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBkb2Vzbid0IGNhbGwgY2FsbGJhY2tcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNhbGxCYWNrKHRoaXMuY2FjaGVkU3RhdHVzKTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbihzdGF0dXMpe1xuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBCb29sZWFuKHN0YXR1cy50b2tlbik7XG4gICAgdGhpcy5pc0xvZ2dlZEluID0gQm9vbGVhbihzdGF0dXMudXNlcl9pZCk7XG4gICAgdmFyIG9sZFN0YXR1cyA9IHRoaXMuY2FjaGVkU3RhdHVzO1xuICAgIHRoaXMuY2FjaGVkU3RhdHVzID0gc3RhdHVzO1xuICAgIGlmICghb2xkU3RhdHVzLnVzZXJfaWQgJiYgc3RhdHVzLnVzZXJfaWQpe1xuICAgICAgICB0aGlzLmVtaXQoJ2xvZ2dlZC1pbicsc3RhdHVzLnVzZXJfaWQpO1xuICAgIH0gZWxzZSBpZiAob2xkU3RhdHVzLnVzZXJfaWQgJiYgIXN0YXR1cy51c2VyX2lkKXtcbiAgICAgICAgdGhpcy5lbWl0KCdsb2dnZWQtb3V0Jyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzQ29ubmVjdGVkICYmICF0aGlzLmlzTG9nZ2VkSW4pe1xuICAgICAgICB0aGlzLmVtaXQoJ2xvZ2luLXJlcXVpcmVkJyk7XG4gICAgICAgIGlmICh0aGlzLmdldExvZ2luKXtcbiAgICAgICAgICAgIHZhciBsb2dpbkluZm8gPSB0aGlzLmdldExvZ2luKCk7XG4gICAgICAgICAgICBpZiAobG9naW5JbmZvLmNvbnN0cnVjdG9yID09PSBPYmplY3Qpe1xuICAgICAgICAgICAgICAgIHRoaXMubG9naW4obG9naW5JbmZvLnVzZXJuYW1lLCBsb2dpbkluZm8ucGFzc3dvcmQsIGxvZ2luSW5mby5jYWxsQmFjayk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxvZ2luSW5mby5jb25zdHJ1Y3RvciA9PT0gUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIGxvZ2luSW5mby50aGVuKGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9naW4ob2JqLnVzZXJuYW1lLCBvYmoucGFzc3dvcmQsIG9iai5jYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyByZWFsdGltZSBjb25uZWN0aW9uIGlzIHNldHRlZFxuICAgIGlmICghb2xkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQgJiYgc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24gPSBuZXcgUmVhbHRpbWVDb25uZWN0aW9uKHN0YXR1cy5yZWFsdGltZUVuZFBvaW50LCB0aGlzKTtcbiAgICAvLyByZWFsdGltZSBjb25uZWN0aW9uIGlzIGNsb3NlZFxuICAgIH0gZWxzZSBpZiAob2xkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQgJiYgIXN0YXR1cy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgIHRoaXMud3NDb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLndzQ29ubmVjdGlvbjtcbiAgICB9XG4gICAgdGhpcy5lbWl0KCd1cGRhdGUtY29ubmVjdGlvbi1zdGF0dXMnLCBzdGF0dXMsIG9sZFN0YXR1cyk7XG4gICAgbG9jYWxTdG9yYWdlW1NUQVRVU0tFWV0gPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xufVxuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIC8qKlxuICAgICAqIG1ha2UgbG9naW4gYW5kIHJldHVybiBhIHByb21pc2UuIElmIGxvZ2luIHN1Y2NlZCwgcHJvbWlzZSB3aWxsIGJlIGFjY2VwdGVkXG4gICAgICogSWYgbG9naW4gZmFpbHMgcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGggZXJyb3JcbiAgICAgKiBAcGFyYW0gdXNlcm5hbWU6IHVzZXJuYW1lXG4gICAgICogQHBhcmFtIHBhc3N3b3JkOiBwYXNzd29yZFxuICAgICAqIEByZXR1cm4gUHJvbWlzZSAodXNlciBvYmplY3QpXG4gICAgICovXG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5lbmRQb2ludCArICdhcGkvbG9naW4nLCB7dXNlcm5hbWU6IHVzZXJuYW1lIHx8ICcnLCBwYXNzd29yZDogcGFzc3dvcmQgfHwgJyd9LG51bGwsdGhzLmNhY2hlZFN0YXR1cy50b2tlbiwgdHJ1ZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIHN0YXR1c1xuICAgICAgICAgICAgICAgIHRocy51cGRhdGVTdGF0dXMoeGhyLnJlc3BvbnNlRGF0YSk7XG4gICAgICAgICAgICAgICAgLy8gY2FsbCB3aXRoIHVzZXIgaWRcbiAgICAgICAgICAgICAgICBhY2NlcHQoe3N0YXR1cyA6ICdzdWNjZXNzJywgdXNlcmlkOiB0aHMuY2FjaGVkU3RhdHVzLnVzZXJfaWR9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIC8vIGlmIGVycm9yIGNhbGwgZXJyb3IgbWFuYWdlciB3aXRoIGVycm9yXG4gICAgICAgICAgICAgICAgYWNjZXB0KHtlcnJvcjogeGhyLnJlc3BvbnNlRGF0YS5lcnJvciwgc3RhdHVzOiAnZXJyb3InfSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dvdXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCkge1xuICAgICAgICB0aHMuJHBvc3QoJ2FwaS9sb2dvdXQnKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ob2spe1xuICAgICAgICAgICAgICAgIHRocy51cGRhdGVTdGF0dXMoe30pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2VbU1RBVFVTS0VZXTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoKVxuICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICB9KTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oY2FsbEJhY2spIHtcbiAgICBpZiAodGhpcy5pc0xvZ2dlZEluKSB7XG4gICAgICAgIGNhbGxCYWNrKHRoaXMuY2FjaGVkU3RhdHVzLnVzZXJfaWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHdhaXQgZm9yIGxvZ2luXG4gICAgICAgIHRoaXMub25jZSgnbG9nZ2VkLWluJyxmdW5jdGlvbih1c2VyX2lkKXtcbiAgICAgICAgICAgIGNhbGxCYWNrKHVzZXJfaWQpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5zdGF0dXModXRpbHMubm9vcCk7XG4gICAgfVxufVxuXG51dGlscy5yZVdoZWVsQ29ubmVjdGlvbiA9IHJlV2hlZWxDb25uZWN0aW9uOyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVG91Y2hlcigpe1xuICAgIHZhciB0b3VjaGVkID0gZmFsc2VcbiAgICB0aGlzLnRvdWNoID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdG91Y2hlZCA9IHRydWU7XG4gICAgfTtcbiAgICB0aGlzLnRvdWNoZWQgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdCA9IHRvdWNoZWQ7XG4gICAgICAgIHRvdWNoZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHQ7XG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5cbmZ1bmN0aW9uIFZhY3V1bUNhY2hlcih0b3VjaCwgYXNrZWQsIG5hbWUsIHBrSW5kZXgpe1xuLypcbiAgICBpZiAobmFtZSl7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnY3JlYXRlZCBWYWN1dW1DYWNoZXIgYXMgJyArIG5hbWUpO1xuICAgIH1cbiovXG4gICAgaWYgKCFhc2tlZCl7XG4gICAgICAgIHZhciBhc2tlZCA9IFtdO1xuICAgIH1cbiAgICB2YXIgbWlzc2luZyA9IFtdO1xuICAgIFxuICAgIHRoaXMuYXNrID0gZnVuY3Rpb24gKGlkLGxhenkpe1xuICAgICAgICBpZiAocGtJbmRleCAmJiAoaWQgaW4gcGtJbmRleC5zb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFMYXp5KGFza2VkKS5jb250YWlucyhpZCkpe1xuLy8gICAgICAgICAgICBjb25zb2xlLmluZm8oJ2Fza2luZyAoJyArIGlkICsgJykgZnJvbSAnICsgbmFtZSk7XG4gICAgICAgICAgICBtaXNzaW5nLnB1c2goaWQpO1xuICAgICAgICAgICAgaWYgKCFsYXp5KVxuICAgICAgICAgICAgICAgIGFza2VkLnB1c2goaWQpO1xuICAgICAgICAgICAgdG91Y2gudG91Y2goKTtcbiAgICAgICAgfSBcbi8vICAgICAgICBlbHNlIGNvbnNvbGUud2FybignKCcgKyBpZCArICcpIHdhcyBqdXN0IGFza2VkIG9uICcgKyBuYW1lKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRBc2tlZEluZGV4ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIGFza2VkO1xuICAgIH1cblxuICAgIHRoaXMubWlzc2luZ3MgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gTGF6eShtaXNzaW5nLnNwbGljZSgwLG1pc3NpbmcubGVuZ3RoKSkudW5pcXVlKCkudG9BcnJheSgpO1xuICAgIH1cbn1cbiIsImZ1bmN0aW9uIEF1dG9MaW5rZXIoYWN0aXZlcywgSURCLCBXMlBSRVNPVVJDRSwgbGlzdENhY2hlKXtcbiAgICB2YXIgdG91Y2ggPSBuZXcgVG91Y2hlcigpO1xuICAgIHZhciBtYWluSW5kZXggPSB7fTtcbiAgICB2YXIgZm9yZWlnbktleXMgPSB7fTtcbiAgICB2YXIgbTJtID0ge307XG4gICAgdmFyIG0ybUluZGV4ID0ge307XG4gICAgdmFyIHBlcm1pc3Npb25zID0ge307XG4gICAgdGhpcy5tYWluSW5kZXggPSBtYWluSW5kZXg7XG4gICAgdGhpcy5mb3JlaWduS2V5cyA9IGZvcmVpZ25LZXlzO1xuICAgIHRoaXMubTJtID0gbTJtO1xuICAgIHRoaXMubTJtSW5kZXggPSBtMm1JbmRleDtcbiAgICB0aGlzLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG5cbiAgICBXMlBSRVNPVVJDRS5vbignbW9kZWwtZGVmaW5pdGlvbicsZnVuY3Rpb24obW9kZWwsIGluZGV4KXtcbiAgICAgICAgLy8gZGVmaW5pbmcgYWxsIGluZGV4ZXMgZm9yIHByaW1hcnkga2V5XG4gICAgICAgIHZhciBwa0luZGV4ID0gbGlzdENhY2hlLmdldEluZGV4Rm9yKG1vZGVsLm5hbWUsICdpZCcpO1xuICAgICAgICBtYWluSW5kZXhbbW9kZWwubmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBwa0luZGV4LCAnbWFpbkluZGV4LicgKyBtb2RlbC5uYW1lLCBpbmRleCk7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGluZyBwZXJtaXNzaW9uIGluZGV4ZXNcbiAgICAgICAgcGVybWlzc2lvbnNbbW9kZWwubmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsICdwZXJtaXNzaW9ucy4nICsgbW9kZWwubmFtZSk7XG5cbiAgICAgICAgLy8gY3JlYXRpbmcgaW5kZXhlcyBmb3IgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbihyZWZlcmVuY2Upe1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsLm5hbWUgKyAnXycgKyByZWZlcmVuY2UuaWQ7XG4gICAgICAgICAgICBmb3JlaWduS2V5c1tpbmRleE5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgbGlzdENhY2hlLmdldEluZGV4Rm9yKHJlZmVyZW5jZS50bywgJ2lkJyksIHJlZmVyZW5jZS50byArICcuaWQgZm9yZWlnbktleXMuJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBjcmVhdGluZyByZXZlcnNlIGZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZWRCeSkuZWFjaChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gZmllbGQuYnkgKyAnLicgKyBmaWVsZC5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IoZmllbGQuYnksZmllbGQuaWQpLCBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkICsgJyBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgICAgICAgICBpZiAoIShyZWxhdGlvbi5pbmRleE5hbWUgaW4gbTJtKSlcbiAgICAgICAgICAgICAgICBtMm1bcmVsYXRpb24uaW5kZXhOYW1lXSA9IFtuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsJ20ybS4nICsgcmVsYXRpb24uaW5kZXhOYW1lICsgJ1swXScpLCBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsJ20ybS4nICsgcmVsYXRpb24uaW5kZXhOYW1lKydbMV0nKV07XG4gICAgICAgICAgICBpZiAoIShyZWxhdGlvbi5pbmRleE5hbWUgaW4gbTJtSW5kZXgpKVxuICAgICAgICAgICAgICAgIG0ybUluZGV4W3JlbGF0aW9uLmluZGV4TmFtZV0gPSBuZXcgTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIG0ybUdldCA9IGZ1bmN0aW9uKGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgY2FsbEJhY2spe1xuICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCgobiA/IHV0aWxzLnJldmVyc2UoJy8nLCBpbmRleE5hbWUpIDogaW5kZXhOYW1lKSArICdzJyArICcvbGlzdCcsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW2luZGV4TmFtZV1cbiAgICAgICAgfSk7ICAgICAgICBcbiAgICB9O1xuXG4gICAgdmFyIGdldE0yTSA9IGZ1bmN0aW9uKGluZGV4TmFtZSwgY29sbGVjdGlvbiwgbiwgY2FsbEJhY2spe1xuICAgICAgICAvLyBhc2sgYWxsIGl0ZW1zIGluIGNvbGxlY3Rpb24gdG8gbTJtIGluZGV4XG4gICAgICAgIExhenkoY29sbGVjdGlvbikuZWFjaChtMm1baW5kZXhOYW1lXVtuXS5hc2suYmluZChtMm1baW5kZXhOYW1lXVtuXSkpO1xuICAgICAgICAvLyByZW5ld2luZyBjb2xsZWN0aW9uIHdpdGhvdXQgYXNrZWRcbiAgICAgICAgY29sbGVjdGlvbiA9IG0ybVtpbmRleE5hbWVdW25dLm1pc3NpbmdzKCk7XG4gICAgICAgIC8vIGNhbGxpbmcgcmVtb3RlIGZvciBtMm0gY29sbGVjdGlvbiBpZiBhbnlcbiAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgIGFjdGl2ZXNbaW5kZXhOYW1lXSA9IDE7XG4gICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLmdldE0yTSA9IGdldE0yTTtcblxuICAgIHZhciBsaW5rVW5saW5rZWQgPSBmdW5jdGlvbigpe1xuICAgICAgICAvLyBwZXJmb3JtIGEgRGF0YUJhc2Ugc3luY2hyb25pemF0aW9uIHdpdGggc2VydmVyIGxvb2tpbmcgZm9yIHVua25vd24gZGF0YVxuICAgICAgICBpZiAoIXRvdWNoLnRvdWNoZWQoKSkgcmV0dXJuO1xuICAgICAgICBpZiAoTGF6eShhY3RpdmVzKS52YWx1ZXMoKS5zdW0oKSkge1xuICAgICAgICAgICAgdG91Y2gudG91Y2goKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihpbmRleGVzLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgTGF6eShpbmRleGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCxuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSBMYXp5KGNvbGxlY3Rpb24pLmZpbHRlcihCb29sZWFuKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjb2xsZWN0aW9uLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBJTkRFWCA9IG0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBnZXR0ZXIgPSBJTkRFWFsnZ2V0JyArICgxIC0gbildLmJpbmQoSU5ERVgpO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbTJtR2V0KGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gY29sbGVjdGlvbi5tYXAoZ2V0dGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgb3RoZXJJbmRleCA9IGluZGV4TmFtZS5zcGxpdCgnLycpWzEgLSBuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShvdGhlckluZGV4LGZ1bmN0aW9uKCl7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShpZHMpLmZsYXR0ZW4oKS51bmlxdWUoKS5lYWNoKG1haW5JbmRleFtvdGhlckluZGV4XS5hc2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYWluSW5kZXhbb3RoZXJJbmRleF0uYXNrKHgsdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIExhenkobWFpbkluZGV4KS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaWRzID0gaW5kZXgubWlzc2luZ3MoKTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIGlkYiA9IG1vZGVsTmFtZSBpbiBJREIgPyBJREJbbW9kZWxOYW1lXS5rZXlzKCkgOiBMYXp5KCk7XG4gICAgICAgICAgICAgICAgLy9sb2coJ2xpbmtpbmcuJyArIG1vZGVsTmFtZSArICcgPSAnICsgVzJQUkVTT1VSQ0UubGlua2luZy5zb3VyY2VbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lLCB7aWQ6IGlkc30sbnVsbCx1dGlscy5ub29wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KGZvcmVpZ25LZXlzKVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICByZXR1cm4gW2ssIHYubWlzc2luZ3MoKV1cbiAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uKHYpe1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGlkcyA9IHhbMV07XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0geFswXTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGluZGV4TmFtZS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgdmFyIG1haW5SZXNvdXJjZSA9IGluZGV4WzBdO1xuICAgICAgICAgICAgdmFyIGZpZWxkTmFtZSA9IGluZGV4WzFdO1xuICAgICAgICAgICAgdmFyIGZpbHRlciA9IHt9O1xuICAgICAgICAgICAgZmlsdGVyW2ZpZWxkTmFtZV0gPSBpZHM7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtYWluUmVzb3VyY2UsIGZpbHRlcik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgTGF6eShMYXp5KHBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIHJldHVybiB2WzFdLmxlbmd0aFxuICAgICAgICB9KS50b09iamVjdCgpKS5lYWNoKGZ1bmN0aW9uIChpZHMsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgYWN0aXZlc1tyZXNvdXJjZU5hbWVdID0gMTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChyZXNvdXJjZU5hbWUgKyAnL215X3Blcm1zJywge2lkczogTGF6eShpZHMpLnVuaXF1ZSgpLnRvQXJyYXkoKX0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdFBlcm1pc3Npb25zKGRhdGEuUEVSTUlTU0lPTlMpO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYWN0aXZlc1tyZXNvdXJjZU5hbWVdXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzZXRJbnRlcnZhbChsaW5rVW5saW5rZWQsNTApO1xufTtcblxuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gTGlzdENhY2hlcigpe1xuICAgIHZhciBnb3RBbGwgPSB7fTtcbiAgICB2YXIgYXNrZWQgPSB7fTsgLy8gbWFwIG9mIGFycmF5XG4gICAgdmFyIGNvbXBvc2l0ZUFza2VkID0ge307XG4gICAgdmFyIGNhcnRlc2lhblByb2R1Y3QxID0gZnVuY3Rpb24oeCx5LGlzQXJyYXkpe1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGlmIChpc0FycmF5KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhIGluIHgpe1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGIgaW4geSl7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKExhenkoW3hbYV0seVtiXV0pLmZsYXR0ZW4oKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4geCl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYiBpbiB5KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goW3hbYV0seVtiXV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgdmFyIGNhcnRlc2lhblByb2R1Y3QgPSBmdW5jdGlvbihhcnIpe1xuICAgICAgICB2YXIgaXNBcnJheSA9IGZhbHNlO1xuICAgICAgICB2YXIgcmV0ID0gYXJyWzBdOyBcbiAgICAgICAgZm9yICh2YXIgeCA9IDE7IHggPCBhcnIubGVuZ3RoOyArK3gpe1xuICAgICAgICAgICAgcmV0ID0gY2FydGVzaWFuUHJvZHVjdDEocmV0LCBhcnJbeF0sIGlzQXJyYXkpO1xuICAgICAgICAgICAgaXNBcnJheSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gICAgdmFyIGV4cGxvZGVGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgdmFyIHByb2R1Y3QgPSBjYXJ0ZXNpYW5Qcm9kdWN0KExhenkoZmlsdGVyKS52YWx1ZXMoKS50b0FycmF5KCkpO1xuICAgICAgICB2YXIga2V5cyA9IExhenkoZmlsdGVyKS5rZXlzKCkudG9BcnJheSgpO1xuICAgICAgICByZXR1cm4gcHJvZHVjdC5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YXIgciA9IHt9O1xuICAgICAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGEsbil7XG4gICAgICAgICAgICAgICAgclthXSA9IHhbbl07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9O1xuICAgIHZhciBmaWx0ZXJTaW5nbGUgPSBmdW5jdGlvbihtb2RlbCwgZmlsdGVyLCB0ZXN0T25seSl7XG4gICAgICAgIC8vIExhenkgYXV0byBjcmVhdGUgaW5kZXhlc1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gbW9kZWwubW9kZWxOYW1lO1xuICAgICAgICB2YXIgZ2V0SW5kZXhGb3IgPSB0aGlzLmdldEluZGV4Rm9yO1xuICAgICAgICB2YXIga2V5cyA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odixrZXkpeyByZXR1cm4gW2tleSwgbW9kZWxOYW1lICsgJy4nICsga2V5XTsgfSkudG9PYmplY3QoKTtcbiAgICAgICAgdmFyIGluZGV4ZXMgPSBMYXp5KGZpbHRlcikua2V5cygpLm1hcChmdW5jdGlvbihrZXkpeyByZXR1cm4gW2tleSwgZ2V0SW5kZXhGb3IobW9kZWxOYW1lLCBrZXkpXX0pLnRvT2JqZWN0KCk7IFxuICAgICAgICAvLyBmYWtlIGZvciAoaXQgd2lsbCBjeWNsZSBvbmNlKVxuICAgICAgICBmb3IgKHZhciB4IGluIGZpbHRlcil7XG4gICAgICAgICAgICAvLyBnZXQgYXNrZWQgaW5kZXggYW5kIGNoZWNrIHByZXNlbmNlXG4gICAgICAgICAgICB2YXIgZGlmZmVyZW5jZSA9IExhenkoZmlsdGVyW3hdKS5kaWZmZXJlbmNlKGluZGV4ZXNbeF0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIGlmIChkaWZmZXJlbmNlLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgLy8gZ2VuZXJhdGUgbmV3IGZpbHRlclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBMYXp5KFtbeCwgZGlmZmVyZW5jZV1dKS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIC8vIHJlbWVtYmVyIGFza2VkXG4gICAgICAgICAgICAgICAgaWYgKCF0ZXN0T25seSlcbiAgICAgICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoaW5kZXhlc1t4XSwgZGlmZmVyZW5jZSk7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6JyArIEpTT04uc3RyaW5naWZ5KHJldCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZSBmaWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSArICdcXG5PdXQgOiBudWxsJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNsZWFuQ29tcG9zaXRlcyA9IGZ1bmN0aW9uKG1vZGVsLGZpbHRlcil7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBjbGVhbiBjb21wb3NpdGVBc2tlZFxuICAgICAgICAgKi9cbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29uZGl0aW9uYWwgYXNrZWQgaW5kZXhcbiAgICAgICAgaWYgKCEobW9kZWwubmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpIHsgY29tcG9zaXRlQXNrZWRbbW9kZWwubmFtZV0gPSBbXSB9O1xuICAgICAgICB2YXIgaW5kZXggPSBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXTtcbiAgICAgICAgLy8gc2VhcmNoIGZvciBhbGwgZWxlbWVudHMgd2hvIGhhdmUgc2FtZSBwYXJ0aWFsXG4gICAgICAgIHZhciBmaWx0ZXJMZW4gPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICB2YXIgaXRlbXMgPSBpbmRleC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnICYmICcsdHJ1ZSkpLmZpbHRlcihmdW5jdGlvbihpdGVtKXsgTGF6eShpdGVtKS5zaXplKCkgPiBmaWx0ZXJMZW4gfSk7XG4vLyAgICAgICAgY29uc29sZS5sb2coJ2RlbGV0aW5nIDonICsgSlNPTi5zdHJpbmdpZnkoaXRlbXMpKTtcbiAgICB9O1xuXG4gICAgdGhpcy5maWx0ZXIgPSBmdW5jdGlvbihtb2RlbCwgZmlsdGVyKXtcbi8vICAgICAgICBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0tLS0tXFxuZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikpO1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gbW9kZWwubW9kZWxOYW1lO1xuXG4gICAgICAgIC8vIGlmIHlvdSBmZXRjaCBhbGwgb2JqZWN0cyBmcm9tIHNlcnZlciwgdGhpcyBtb2RlbCBoYXMgdG8gYmUgbWFya2VkIGFzIGdvdCBhbGw7XG4gICAgICAgIHZhciBmaWx0ZXJMZW4gID0gTGF6eShmaWx0ZXIpLnNpemUoKTtcbiAgICAgICAgc3dpdGNoIChmaWx0ZXJMZW4pIHtcbiAgICAgICAgICAgIGNhc2UgMCA6IHtcbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gbnVsbCBvciBhbGxcbiAgICAgICAgICAgICAgICB2YXIgZ290ID0gZ290QWxsW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgZ290QWxsW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gYXNrZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYXNrZWRbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb3V0IDogbnVsbCAoZ290IGFsbCknKTtcbiAgICAgICAgICAgICAgICAvLyBjb25kaXRpb25hbCBjbGVhblxuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gY29tcG9zaXRlQXNrZWQpeyBcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChnb3QpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgMSA6IHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gZmlsdGVyU2luZ2xlLmNhbGwodGhpcywgbW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICAgICAgY2xlYW5Db21wb3NpdGVzLmNhbGwodGhpcywgbW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdmFyIHNpbmdsZSA9IExhenkoZmlsdGVyKS5rZXlzKCkuc29tZShmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciBmID0ge307XG4gICAgICAgICAgICBmW2tleV0gPSBmaWx0ZXJba2V5XTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXJTaW5nbGUuY2FsbCh0aHMsIG1vZGVsLCBmLCB0cnVlKSA9PSBudWxsO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHNpbmdsZSkgeyByZXR1cm4gbnVsbCB9XG4gICAgICAgIC8vIGxhenkgY3JlYXRlIGNvbXBvc2l0ZUFza2VkXG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpeyBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgLy8gZXhwbG9kZSBmaWx0ZXJcbiAgICAgICAgdmFyIGV4cGxvZGVkID0gZXhwbG9kZUZpbHRlcihmaWx0ZXIpO1xuICAgICAgICAvLyBjb2xsZWN0IHBhcnRpYWxzXG4gICAgICAgIHZhciBwYXJ0aWFscyA9IGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0uZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlciwgJyB8fCAnLHRydWUpKTtcbiAgICAgICAgLy8gY29sbGVjdCBtaXNzaW5ncyAoZXhwbG9kZWQgLSBwYXJ0aWFscylcbiAgICAgICAgaWYgKHBhcnRpYWxzLmxlbmd0aCl7XG4gICAgICAgICAgICB2YXIgYmFkICA9IFtdO1xuICAgICAgICAgICAgLy8gcGFydGlhbCBkaWZmZXJlbmNlXG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIHBhcnRpYWxzKXtcbiAgICAgICAgICAgICAgICBiYWQucHVzaC5hcHBseShiYWQsZXhwbG9kZWQuZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIHBhcnRpYWxzW3hdLCcgJiYgJywgdHJ1ZSkpKTtcbiAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgY29uc29sZS5sb2coJ2V4cGxvZGVkIC0gcGFydGlhbCA6ICcgKyBKU09OLnN0cmluZ2lmeShiYWQpKTtcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IExhenkoZXhwbG9kZWQpLmRpZmZlcmVuY2UoYmFkKS50b0FycmF5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBleHBsb2RlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZpbHRlciBwYXJ0aWFsc1xuICAgICAgICBpZiAobWlzc2luZ3MubGVuZ3RoKXtcbiAgICAgICAgICAgIGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0ucHVzaC5hcHBseShjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLG1pc3NpbmdzKTtcbiAgICAgICAgICAgIC8vIGFnZ3JlZ2F0ZSBtaXNzaW5nc1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gTGF6eShmaWx0ZXIpLmtleXMoKS5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gTGF6eShtaXNzaW5ncykucGx1Y2soa2V5KS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtrZXksIHJldC5sZW5ndGg/cmV0OmZpbHRlcltrZXldXTtcbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdXQgOiAnICsgSlNPTi5zdHJpbmdpZnkobWlzc2luZ3MpKTtcbiAgICAgICAgICAgIC8vIGNsZWFuIGNvbmRpdGlvbmFsXG4gICAgICAgICAgICBjbGVhbkNvbXBvc2l0ZXMobW9kZWwsIG1pc3NpbmdzKTtcbiAgICAgICAgICAgIHJldHVybiBtaXNzaW5ncztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRJbmRleEZvciA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmllbGROYW1lKXtcbiAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsTmFtZSArICcuJyArIGZpZWxkTmFtZTtcbiAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIGFza2VkKSl7XG4gICAgICAgICAgICBhc2tlZFtpbmRleE5hbWVdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFza2VkW2luZGV4TmFtZV07XG4gICAgfVxufTsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1hbnlUb01hbnlSZWxhdGlvbihyZWxhdGlvbixtMm0pe1xuICAgIHZhciBpdGVtcyA9IFtdO1xuICAgIHRoaXMuYWRkID0gaXRlbXMucHVzaC5iaW5kKGl0ZW1zKTtcbiAgICB0aGlzLmFkZCA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICBjb25zb2xlLmxvZygnYWRkaW5nICcgKyBpdGVtKTtcbiAgICAgICAgaWYgKCEoTGF6eShpdGVtcykuZmluZChpdGVtKSkpe1xuICAgICAgICAgICAgaXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZ2V0MCA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgbTJtWzFdLmFzayhpZCk7XG4gICAgICAgIHJldHVybiBMYXp5KGl0ZW1zKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICByZXR1cm4geFswXSA9PT0gaWQ7XG4gICAgICAgIH0pLnBsdWNrKFwiMVwiKS50b0FycmF5KCk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0MSA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgbTJtWzBdLmFzayhpZCk7XG4gICAgICAgIHJldHVybiBMYXp5KGl0ZW1zKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICByZXR1cm4geFsxXSA9PT0gaWQ7XG4gICAgICAgIH0pLnBsdWNrKFwiMFwiKS50b0FycmF5KCk7XG4gICAgfTtcbiAgICB0aGlzWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWxhdGlvbi5pbmRleE5hbWUuc3BsaXQoJy8nKVsxXSldID0gdGhpcy5nZXQxO1xuICAgIHRoaXNbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlbGF0aW9uLmluZGV4TmFtZS5zcGxpdCgnLycpWzBdKV0gPSB0aGlzLmdldDA7XG5cbiAgICB0aGlzLmRlbCA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICB2YXIgbCA9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgdmFyIGlkeCA9IG51bGw7XG4gICAgICAgIGZvciAodmFyIGEgPSAwOyBhIDwgbDsgYSsrKXsgXG4gICAgICAgICAgICBpZiAoKGl0ZW1zW2FdWzBdID09PSBpdGVtWzBdKSAmJiAoaXRlbXNbYV1bMV0gPT09IGl0ZW1bMV0pKXtcbiAgICAgICAgICAgICAgICBpZHggPSBhO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpZHgpe1xuICAgICAgICAgICAgaXRlbXMuc3BsaWNlKGEsIDEpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdkZWxldGluZyAnLCBpdGVtKTtcbiAgICB9O1xufSIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhwcm90bywgcHJvcGVydHlOYW1lLGdldHRlciwgc2V0dGVyKXtcbiAgICB2YXIgZXZlbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDQpO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBcbiAgICBMYXp5KGV2ZW50cykuZWFjaChmdW5jdGlvbihldmVudCl7XG4gICAgICAgIHByb3RvLm9ybS5vbihldmVudCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmVzdWx0ID0ge307XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHZhciBwcm9wZXJ0eURlZiA9IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBjYWNoZWQoKXtcbiAgICAgICAgICAgIGlmICghKHRoaXMuaWQgaW4gcmVzdWx0KSl7XG4gICAgICAgICAgICAgICAgcmVzdWx0W3RoaXMuaWRdID0gZ2V0dGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpZiAoc2V0dGVyKXtcbiAgICAgICAgcHJvcGVydHlEZWZbJ3NldCddID0gZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9PSByZXN1bHRbdGhpcy5pZF0pe1xuICAgICAgICAgICAgICAgIHNldHRlci5jYWxsKHRoaXMsdmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlkIGluIHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHRbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgcHJvcGVydHlOYW1lLHByb3BlcnR5RGVmKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKGRhdGEpe1xuICAgIHRoaXMucmVzb3VyY2UgPSBkYXRhLl9yZXNvdXJjZTtcbiAgICB0aGlzLmZvcm1JZHggPSBkYXRhLmZvcm1JZHg7XG4gICAgdGhpcy5maWVsZHMgPSBkYXRhLmVycm9ycztcbn1cbnZhciBiYXNlT1JNID0gZnVuY3Rpb24ob3B0aW9ucywgZXh0T1JNKXtcbiAgICBcbiAgICAvLyBjcmVhdGluZyByZXdoZWVsIGNvbm5lY3Rpb25cbiAgICBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKXtcbiAgICAgICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgcmVXaGVlbENvbm5lY3Rpb24ob3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmNvbnN0cnVjdG9yID09PSB1dGlscy5yZVdoZWVsQ29ubmVjdGlvbil7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gb3B0aW9ucztcbiAgICB9XG4gICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICBjb25uZWN0aW9uLm9uKCdjb25uZWN0ZWQnLCBmdW5jdGlvbigpeyBcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMub24gPSBjb25uZWN0aW9uLm9uO1xuICAgIHRoaXMuZW1pdCA9IGNvbm5lY3Rpb24uZW1pdDtcbiAgICB0aGlzLnVuYmluZCA9IGNvbm5lY3Rpb24udW5iaW5kO1xuICAgIHRoaXMub25jZSA9IGNvbm5lY3Rpb24ub25jZTtcbiAgICB0aGlzLiRwb3N0ID0gY29ubmVjdGlvbi4kcG9zdC5iaW5kKGNvbm5lY3Rpb24pO1xuXG4gICAgLy8gaGFuZGxpbmcgd2Vic29ja2V0IGV2ZW50c1xuICAgIHRoaXMub24oJ3dzLWNvbm5lY3RlZCcsZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmluZm8oJ1dlYnNvY2tldCBjb25uZWN0ZWQnKTtcbiAgICAgICAgLy8gYWxsIGpzb24gZGF0YSBoYXMgdG8gYmUgcGFyc2VkIGJ5IGdvdERhdGFcbiAgICAgICAgd3Mub25NZXNzYWdlSnNvbihXMlBSRVNPVVJDRS5nb3REYXRhLmJpbmQoVzJQUkVTT1VSQ0UpKTtcbiAgICAgICAgLy9cbiAgICAgICAgd3Mub25NZXNzYWdlVGV4dChmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnV1MgbWVzc2FnZSA6ICcgKyBtZXNzYWdlKVxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLm9uKCd3cy1kaXNjb25uZWN0ZWQnLCBmdW5jdGlvbih3cyl7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dlYnNvY2tldCBkaXNjb25uZWN0ZWQnKVxuICAgIH0pO1xuICAgIHRoaXMub24oJ2Vycm9yLWpzb24tNDA0JyxmdW5jdGlvbihlcnJvcix1cmwsIHNlbnREYXRhLCB4aHIpeyBcbiAgICAgICAgY29uc29sZS5lcnJvcignSlNPTiBlcnJvciAnLCBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xuICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW3VybC5zcGxpdCgnLycpWzBdXTtcbiAgICB9KTtcbiAgICB0aGlzLm9uKCdyZWFsdGltZS1tZXNzYWdlLWpzb24nLCBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShtZXNzYWdlKTtcbiAgICB9KTtcblxuICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIFcyUFJFU09VUkNFID0gdGhpcztcbiAgICB2YXIgSURCID0ge2F1dGhfZ3JvdXAgOiBMYXp5KHt9KX07IC8vIHRhYmxlTmFtZSAtPiBkYXRhIGFzIEFycmF5XG4gICAgdmFyIElEWCA9IHt9OyAvLyB0YWJsZU5hbWUgLT4gTGF6eShpbmRleEJ5KCdpZCcpKSAtPiBJREJbZGF0YV1cbiAgICB2YXIgUkVWSURYID0ge307IC8vIHRhYmxlTmFtZSAtPiBmaWVsZE5hbWUgLT4gTGF6eS5ncm91cEJ5KCkgLT4gSURCW0RBVEFdXG4gICAgdmFyIGJ1aWxkZXJIYW5kbGVycyA9IHt9O1xuICAgIHZhciBidWlsZGVySGFuZGxlclVzZWQgPSB7fTtcbiAgICB2YXIgcGVyc2lzdGVudEF0dHJpYnV0ZXMgPSB7fTtcbiAgICB2YXIgZXZlbnRIYW5kbGVycyA9IHt9O1xuICAgIHZhciBwZXJtaXNzaW9uV2FpdGluZyA9IHt9O1xuICAgIHZhciBtb2RlbENhY2hlID0ge307XG4gICAgdmFyIGZhaWxlZE1vZGVscyA9IHt9O1xuICAgIHZhciB3YWl0aW5nQ29ubmVjdGlvbnMgPSB7fSAvLyBhY3R1YWwgY29ubmVjdGlvbiB3aG8gaSdtIHdhaXRpbmcgZm9yXG4gICAgdmFyIGxpc3RDYWNoZSA9IG5ldyBMaXN0Q2FjaGVyKExhenkpO1xuICAgIHZhciBsaW5rZXIgPSBuZXcgQXV0b0xpbmtlcih3YWl0aW5nQ29ubmVjdGlvbnMsSURCLCB0aGlzLCBsaXN0Q2FjaGUpO1xuLyogICAgd2luZG93LmxsID0gbGlua2VyO1xuICAgIHdpbmRvdy5sYyA9IGxpc3RDYWNoZTtcbiovXG4gICAgdGhpcy52YWxpZGF0aW9uRXZlbnQgPSB0aGlzLm9uKCdlcnJvci1qc29uLTUxMycsIGZ1bmN0aW9uKGRhdGEsIHVybCwgc2VudERhdGEsIHhocil7XG4gICAgICAgIGlmIChjdXJyZW50Q29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIpe1xuICAgICAgICAgICAgY3VycmVudENvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyKG5ldyBWYWxpZGF0aW9uRXJyb3IoZGF0YSkpO1xuICAgICAgICB9XG4gICAgfSlcblxuICAgIHZhciBnZXRJbmRleCA9IGZ1bmN0aW9uIChpbmRleE5hbWUpIHtcbiAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJREIpXG4gICAgICAgICAgICByZXR1cm4gSURCW2luZGV4TmFtZV07XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSURCW2luZGV4TmFtZV0gPSBMYXp5KHt9KTtcbiAgICAgICAgICAgIHJldHVybiBJREJbaW5kZXhOYW1lXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGdldFVubGlua2VkID0gZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICBpZiAoaW5kZXhOYW1lIGluIFVOTElOS0VEKVxuICAgICAgICAgICAgcmV0dXJuIFVOTElOS0VEW2luZGV4TmFtZV07XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgVU5MSU5LRURbaW5kZXhOYW1lXSA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIFVOTElOS0VEW2luZGV4TmFtZV07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gUGVybWlzc2lvblRhYmxlKGlkLCBrbGFzcywgcGVybWlzc2lvbnMpIHtcbiAgICAgICAgLy8gY3JlYXRlIFBlcm1pc3Npb25UYWJsZSBjbGFzc1xuICAgICAgICB0aGlzLmtsYXNzID0ga2xhc3M7XG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICBmb3IgKHZhciBrIGluIHBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICB0aGlzLnB1c2guYXBwbHkodGhpcywgW2ssIHBlcm1pc3Npb25zW2tdXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgUGVybWlzc2lvblRhYmxlLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIC8vIHNhdmUgT2JqZWN0IHRvIHNlcnZlclxuICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgIHBlcm1pc3Npb25zOiBMYXp5KHRoaXMucGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeFswXS5pZCwgeFsxXV1cbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KClcbiAgICAgICAgfTtcbiAgICAgICAgZGF0YS5pZCA9IHRoaXMuaWQ7XG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSB0aGlzLmtsYXNzLm1vZGVsTmFtZTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5rbGFzcy5tb2RlbE5hbWUgKyAnL3NldF9wZXJtaXNzaW9ucycsIGRhdGEsIGZ1bmN0aW9uIChteVBlcm1zLCBhLCBiLCByZXEpIHtcbiAgICAgICAgICAgIGNiKG15UGVybXMpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIFBlcm1pc3Npb25UYWJsZS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChncm91cF9pZCwgcGVybWlzc2lvbkxpc3QpIHtcbiAgICAgICAgdmFyIHAgPSBMYXp5KHBlcm1pc3Npb25MaXN0KTtcbiAgICAgICAgdmFyIHBlcm1zID0gTGF6eSh0aGlzLmtsYXNzLmFsbFBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBbeCwgcC5jb250YWlucyh4KV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgdmFyIGwgPSBMYXp5KHRoaXMucGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0uaWRcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChsLmNvbnRhaW5zKGdyb3VwX2lkKSlcbiAgICAgICAgICAgIHRoaXMucGVybWlzc2lvbnNbbC5pbmRleE9mKGdyb3VwX2lkKV1bMV0gPSBwZXJtcztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5wZXJtaXNzaW9ucy5wdXNoKFtJREIuYXV0aF9ncm91cC5nZXQoZ3JvdXBfaWQpLCBwZXJtc10pO1xuICAgIH07XG5cbiAgICAvLyBjcmVhdGVzIGR5bmFtaWNhbCBtb2RlbHNcbiAgICB2YXIgbWFrZU1vZGVsQ2xhc3MgPSBmdW5jdGlvbiAobW9kZWwpIHtcbiAgICAgICAgdmFyIF9tb2RlbCA9IG1vZGVsO1xuICAgICAgICB2YXIgZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpO1xuICAgICAgICBpZiAobW9kZWwucHJpdmF0ZUFyZ3MpIHtcbiAgICAgICAgICAgIGZpZWxkcyA9IGZpZWxkcy5tZXJnZShtb2RlbC5wcml2YXRlQXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbW9kZWwtZGVmaW5pdGlvbicsIG1vZGVsLCBnZXRJbmRleChtb2RlbC5uYW1lKSk7XG4gICAgICAgIC8vIGdldHRpbmcgZmllbGRzIG9mIHR5cGUgZGF0ZSBhbmQgZGF0ZXRpbWVcbi8qXG4gICAgICAgIHZhciBEQVRFRklFTERTID0gZmllbGRzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGdldHRpbmcgYm9vbGVhbiBmaWVsZHNcbiAgICAgICAgdmFyIEJPT0xGSUVMRFMgPSBmaWVsZHMuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHgudHlwZSA9PSAnYm9vbGVhbicpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGJvb2xlYW5zIGFuZCBkYXRldGltZXMgc3RvcmFnZSBleHRlcm5hbCBcbiAgICAgICAgTU9ERUxfREFURUZJRUxEU1ttb2RlbC5uYW1lXSA9IERBVEVGSUVMRFM7XG4gICAgICAgIE1PREVMX0JPT0xGSUVMRFNbbW9kZWwubmFtZV0gPSBCT09MRklFTERTO1xuKi9cbiAgICAgICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdmFyIGZ1bmNTdHJpbmcgPSBcImlmICghcm93KSB7IHJvdyA9IHt9fTtcXG5cIjtcbiAgICAgICAgZnVuY1N0cmluZyArPSBtb2RlbC5yZWZlcmVuY2VzLm1hcChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICByZXR1cm4gJ3RoaXMuXycgKyBmaWVsZC5pZCArICcgPSByb3cuJyArIGZpZWxkLmlkICsgJzsnO1xuICAgICAgICB9KS5qb2luKCc7XFxuJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBkYXRlZmllbGQgY29udmVyc2lvblxuICAgICAgICBmdW5jU3RyaW5nICs9IGZpZWxkcy5tYXAoZnVuY3Rpb24gKHgsaykge1xuICAgICAgICAgICAgaWYgKCh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gcm93LicgKyBrICsgJz9uZXcgRGF0ZShyb3cuJyArIGsgKyAnICogMTAwMCAtICcgKyB1dGlscy50ek9mZnNldCArICcpOm51bGw7XFxuJzsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHgudHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gKHJvdy4nICsgayArICcgPT09IFwiVFwiKSB8fCAocm93LicgKyBrICsgJyA9PT0gdHJ1ZSk7XFxuJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IHJvdy4nICsgayArICc7XFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudG9TdHJpbmcoJ1xcbicpOyArICdcXG4nO1xuXG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gXCJpZiAocGVybWlzc2lvbnMpIHt0aGlzLl9wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zICYmIExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkgeyByZXR1cm4gW3gsIHRydWVdIH0pLnRvT2JqZWN0KCk7fVwiXG5cbiAgICAgICAgXG4gICAgICAgIC8vIG1hc3RlciBjbGFzcyBmdW5jdGlvblxuICAgICAgICB2YXIgS2xhc3MgPSBuZXcgRnVuY3Rpb24oJ3JvdycsICdwZXJtaXNzaW9ucycsZnVuY1N0cmluZylcblxuICAgICAgICBLbGFzcy5wcm90b3R5cGUub3JtID0gZXh0T1JNO1xuICAgICAgICBLbGFzcy5yZWZfdHJhbnNsYXRpb25zID0ge307XG4gICAgICAgIEtsYXNzLm1vZGVsTmFtZSA9IG1vZGVsLm5hbWU7XG4gICAgICAgIEtsYXNzLnJlZmVyZW5jZXMgPSBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLnBsdWNrKCdpZCcpLnRvQXJyYXkoKTtcblxuICAgICAgICBLbGFzcy5pbnZlcnNlX3JlZmVyZW5jZXMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAvLyBtYW5hZ2luZyByZWZlcmVuY2VzIHdoZXJlIFxuICAgICAgICAgICAgcmV0dXJuIHguYnkgKyAnXycgKyB4LmlkICsgJ19zZXQnXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5yZWZlcmVudHMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW3guYnksIHguaWRdXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5maWVsZHNPcmRlciA9IG1vZGVsLmZpZWxkT3JkZXI7XG4gICAgICAgIEtsYXNzLmFsbFBlcm1pc3Npb25zID0gbW9kZWwucGVybWlzc2lvbnM7XG5cbiAgICAgICAgLy8gcmVkZWZpbmluZyB0b1N0cmluZyBtZXRob2RcbiAgICAgICAgaWYgKExhenkobW9kZWwucmVwcmVzZW50YXRpb24pLnNpemUoKSl7XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9TdHJpbmcgPSBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzLicgKyBMYXp5KG1vZGVsLnJlcHJlc2VudGF0aW9uKS50b1N0cmluZygnICsgXCIgXCIgKyB0aGlzLicpKTtcbiAgICAgICAgfVxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9VcHBlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyByZWRlZmluZSB0byBVcHBlckNhc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKTtcbiAgICAgICAgfTtcbiAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9Mb3dlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gZGVsZXRlIGluc3RhbmNlIGZyb20gc2VydmVyXG4gICAgICAgICAgICByZXR1cm4gZXh0T1JNLmRlbGV0ZSh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSwgW3RoaXMuaWRdKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBwZXJtaXNzaW9uIGdldHRlciBwcm9wZXJ0eVxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoS2xhc3MucHJvdG90eXBlLCAncGVybWlzc2lvbnMnLCB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcGVybWlzc2lvbnMpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLnBlcm1pc3Npb25zW3RoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lXS5hc2sodGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gZ2V0dGluZyBmdWxsIHBlcm1pc3Npb24gdGFibGUgZm9yIGFuIG9iamVjdFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuYWxsX3Blcm1zID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICB2YXIgb2JqZWN0X2lkID0gdGhpcy5pZDtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9hbGxfcGVybXMnLCB7aWQ6IHRoaXMuaWR9LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBwZXJtaXNzaW9ucyA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgdW5rbm93bl9ncm91cHMgPSBMYXp5KHBlcm1pc3Npb25zKS5wbHVjaygnZ3JvdXBfaWQnKS51bmlxdWUoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnICsgeFxuICAgICAgICAgICAgICAgIH0pLmRpZmZlcmVuY2UoSURCLmF1dGhfZ3JvdXAua2V5cygpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgTGF6eShwZXJtaXNzaW9ucykuZ3JvdXBCeShmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5ncm91cF9pZFxuICAgICAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBlZFtrXSA9IExhenkodikucGx1Y2soJ25hbWUnKS50b0FycmF5KClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKG5ldyBQZXJtaXNzaW9uVGFibGUob2JqZWN0X2lkLCBLbGFzcywgZ3JvdXBlZCkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKHVua25vd25fZ3JvdXBzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ2V0KCdhdXRoX2dyb3VwJyx1bmtub3duX2dyb3VwcyxjYWxsKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGNhbGwoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIHZhciBvID0gdGhpcy5hc1JhdygpO1xuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IEtsYXNzLmZpZWxkcztcbiAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICB2YXIgbW9kZWxOYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICBpZiAoYXJncykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGFyZyBpbiBhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG9bYXJnXSA9IGFyZ3NbYXJnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBlbGltaW5hdGUgdW53cml0YWJsZXNcbiAgICAgICAgICAgIExhenkoS2xhc3MuZmllbGRzT3JkZXIpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWZpZWxkc1t4XS53cml0YWJsZTtcbiAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24oZmllbGROYW1lKXtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGROYW1lIGluIG8pIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG9bZmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgKElEID8gJy9wb3N0JyA6ICcvcHV0JyksIG8pO1xuICAgICAgICAgICAgaWYgKGFyZ3MgJiYgKGFyZ3MuY29uc3RydWN0b3IgPT09IEZ1bmN0aW9uKSl7XG4gICAgICAgICAgICAgICAgLy8gcGxhY2luZyBjYWxsYmFjayBpbiBhIGNvbW1vbiBwbGFjZVxuICAgICAgICAgICAgICAgIHByb21pc2UuY29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIgPSBhcmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2VcbiAgICAgICAgfTtcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb2JqID0gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy5hc1JhdygpKTtcbiAgICAgICAgICAgIG9iai5fcGVybWlzc2lvbnMgPSB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYnVpbGRpbmcgc2VyaWFsaXphdGlvbiBmdW5jdGlvblxuICAgICAgICB2YXIgYXNyID0gJ3JldHVybiB7XFxuJyArIExhenkobW9kZWwucmVmZXJlbmNlcykubWFwKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHJldHVybiBmaWVsZC5pZCArICcgOiB0aGlzLl8nICsgZmllbGQuaWQ7XG4gICAgICAgIH0pLmNvbmNhdChmaWVsZHMubWFwKGZ1bmN0aW9uICh4LGspIHtcbiAgICAgICAgICAgIGlmICgoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogKHRoaXMuJyArIGsgKyAnPyhNYXRoLnJvdW5kKHRoaXMuJyArIGsgKyAnLmdldFRpbWUoKSAtIHRoaXMuJyArIGsgKyAnLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCkgLyAxMDAwKTpudWxsKSc7IFxuICAgICAgICAgICAgfSBlbHNlIGlmICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogdGhpcy4nICsgayArICc/XCJUXCI6XCJGXCInO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiB0aGlzLicgKyBrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSkudG9TdHJpbmcoJyxcXG4nKSArICd9Oyc7XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5hc1JhdyA9IG5ldyBGdW5jdGlvbihhc3IpO1xuXG4gICAgICAgIEtsYXNzLnNhdmVNdWx0aSA9IGZ1bmN0aW9uIChvYmplY3RzLCBjYiwgc2NvcGUpIHtcbiAgICAgICAgICAgIHZhciByYXcgPSBbXTtcbiAgICAgICAgICAgIHZhciBkZWxldGFibGUgPSBMYXp5KEtsYXNzLmZpZWxkcylcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAheC53cml0YWJsZVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnBsdWNrKCdpZCcpXG4gICAgICAgICAgICAgICAgLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIExhenkob2JqZWN0cylcbiAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmFzUmF3KClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIExhenkoZGVsZXRhYmxlKS5lYWNoKGZ1bmN0aW9uICh5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgeFt5XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJhdy5wdXNoKHgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lLCAncHV0Jywge211bHRpcGxlOiByYXcsIGZvcm1JZHggOiBXMlBSRVNPVVJDRS5mb3JtSWR4Kyt9LCBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGVsZW1zKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFiID0gSURCW0tsYXNzLm1vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgdmFyIG9ianMgPSBMYXp5KGVsZW1zW0tsYXNzLm1vZGVsTmFtZV0ucmVzdWx0cykucGx1Y2soJ2lkJykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YWIuZ2V0KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICAgICAgICBjYihvYmpzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBzY29wZSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmICgnZXh0cmFfdmVyYnMnIGluIG1vZGVsKVxuICAgICAgICAgICAgTGF6eShtb2RlbC5leHRyYV92ZXJicykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHZhciBmdW5jTmFtZSA9IHhbMF07XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSB4WzFdO1xuICAgICAgICAgICAgICAgIHZhciBkZGF0YSA9ICdkYXRhID0ge2lkIDogdGhpcy5pZCc7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBkZGF0YSArPSAnLCAnICsgTGF6eShhcmdzKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geCArICcgOiAnICsgeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJywnKTtcbiAgICAgICAgICAgICAgICBkZGF0YSArPSAnfTsnO1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCgnY2InKTtcbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbZnVuY05hbWVdID0gbmV3IEZ1bmN0aW9uKGFyZ3MsIGRkYXRhICsgJ1cyUy5XMlBfUE9TVCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSxcIicgKyBmdW5jTmFtZSArICdcIiwgZGF0YSxmdW5jdGlvbihkYXRhLHN0YXR1cyxoZWFkZXJzLHgpeycgK1xuICAgICAgICAgICAgICAgICAgICAndHJ5e1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAnICAgaWYgKCFoZWFkZXJzKFwibm9tb2RlbFwiKSkge3dpbmRvdy5XMlMuZ290RGF0YShkYXRhLGNiKTt9XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICcgICBlbHNlIHtpZiAoY2IpIHtjYihkYXRhKX19XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICd9IGNhdGNoKGUpe1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAnaWYgKGNiKSB7Y2IoZGF0YSk7fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfSk7XFxuJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKCdwcml2YXRlQXJncycgaW4gbW9kZWwpIHtcbiAgICAgICAgICAgIEtsYXNzLnByaXZhdGVBcmdzID0gTGF6eShtb2RlbC5wcml2YXRlQXJncykua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgdHJ1ZV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmVQQSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgdmFyIFQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBvbyA9IHtpZDogdGhpcy5pZH07XG4gICAgICAgICAgICAgICAgdmFyIFBBID0gdGhpcy5jb25zdHJ1Y3Rvci5wcml2YXRlQXJncztcbiAgICAgICAgICAgICAgICB2YXIgRnMgPSB0aGlzLmNvbnN0cnVjdG9yLmZpZWxkcztcbiAgICAgICAgICAgICAgICB2YXIgdCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG8pLmFzUmF3KCk7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkSWR4ID0gTGF6eShQQSkua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIEZzW3hdXVxuICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgTGF6eShvKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoayBpbiBQQSkgJiYgZmllbGRJZHhba10ud3JpdGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9vW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9zYXZlUEEnLCBvbywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG9vKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBUW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbW9kZWxDYWNoZVtLbGFzcy5tb2RlbE5hbWVdID0gS2xhc3M7XG4gICAgICAgIC8vIGFkZGluZyBpZCB0byBmaWVsZHNcbiAgICAgICAgZm9yICh2YXIgZiBpbiBtb2RlbC5maWVsZHMpIHtcbiAgICAgICAgICAgIG1vZGVsLmZpZWxkc1tmXS5pZCA9IGY7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MuZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpLmNvbmNhdChMYXp5KG1vZGVsLnByaXZhdGVBcmdzKSkuY29uY2F0KExhenkobW9kZWwucmVmZXJlbmNlcykudGFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICB4LnR5cGUgPSB4LnR5cGUgfHwgJ3JlZmVyZW5jZSdcbiAgICAgICAgfSkpLmluZGV4QnkoJ2lkJykudG9PYmplY3QoKTtcbiAgICAgICAgLy8gc2V0dGluZyB3aWRnZXRzIGZvciBmaWVsZHNcbiAgICAgICAgTGF6eShLbGFzcy5maWVsZHMpLmVhY2goZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgaWYgKCFmaWVsZC53aWRnZXQpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZC50eXBlID09PSAncmVmZXJlbmNlJyl7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9ICdjaG9pY2VzJ1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9IGZpZWxkLnR5cGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAobWFueSB0byBvbmUpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGV4dF9yZWYgPSByZWYudG87XG4gICAgICAgICAgICB2YXIgbG9jYWxfcmVmID0gJ18nICsgcmVmLmlkO1xuICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5pZCxmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZXh0X3JlZiBpbiBJREIpKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKGV4dF9yZWYsZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rZXIubWFpbkluZGV4W2V4dF9yZWZdLmFzayh0aHNbbG9jYWxfcmVmXSx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSAoZXh0X3JlZiBpbiBJREIpICYmIHRoaXNbbG9jYWxfcmVmXSAmJiBJREJbZXh0X3JlZl0uZ2V0KHRoaXNbbG9jYWxfcmVmXSk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgJiYgKGV4dF9yZWYgaW4gbGlua2VyLm1haW5JbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYXNraW5nIHRvIGxpbmtlclxuICAgICAgICAgICAgICAgICAgICBsaW5rZXIubWFpbkluZGV4W2V4dF9yZWZdLmFzayh0aGlzW2xvY2FsX3JlZl0sdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1dGlscy5tb2NrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSAhPSBleHRfcmVmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgY2FuIGFzc2lnbiBvbmx5ICcgKyBleHRfcmVmICsgJyB0byAnICsgcmVmLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzW2xvY2FsX3JlZl0gPSB2YWx1ZS5pZDtcbiAgICAgICAgICAgIH0sICduZXctJyArIGV4dF9yZWYsICdkZWxldGVkLScgKyBleHRfcmVmLCd1cGRhdGVkLScgKyBleHRfcmVmLCAnbmV3LW1vZGVsLScgKyBleHRfcmVmKTtcblxuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlZi5pZCldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRPUk0uZ2V0KGV4dF9yZWYsdGhpc1tsb2NhbF9yZWZdKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAob25lIHRvIG1hbnkpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZWRCeSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gcmVmLmJ5ICsgJy4nICsgcmVmLmlkO1xuICAgICAgICAgICAgdmFyIHByb3BlcnR5TmFtZSA9IHJlZi5ieSArICdfJyArIHV0aWxzLnBsdXJhbGl6ZShyZWYuaWQpO1xuICAgICAgICAgICAgdmFyIHJldkluZGV4ID0gcmVmLmJ5O1xuICAgICAgICAgICAgaWYgKEtsYXNzLnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJ5ZWQgdG8gcmVkZWZpbmUgcHJvcGVydHkgJyArIHByb3BlcnR5TmFtZSArICdzJyArICcgZm9yICcgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcHJvcGVydHlOYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSAocmV2SW5kZXggaW4gSURCKSA/IFJFVklEWFtpbmRleE5hbWVdLmdldCh0aGlzLmlkICsgJycpOm51bGw7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtlci5mb3JlaWduS2V5c1tpbmRleE5hbWVdLmFzayh0aGlzLmlkLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgIH0sIG51bGwsICduZXctJyArIHJldkluZGV4LCAndXBkYXRlZC0nICsgcmV2SW5kZXgsICdkZWxldGVkLScgKyByZXZJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShyZWYuYnkpKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdHMgPSB7fTtcbiAgICAgICAgICAgICAgICBvcHRzW3JlZi5pZF0gPSBbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5xdWVyeShyZWYuYnksb3B0cyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2J1aWxkaW5nIHJlZmVyZW5jZSB0byAobWFueSB0byBtYW55KSBmaWVsZHNcbiAgICAgICAgaWYgKG1vZGVsLm1hbnlUb01hbnkpIHtcbiAgICAgICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHJlZi5pbmRleE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcmVmLmZpcnN0PyAwIDogMTtcbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsTmFtZSA9IHJlZi5tb2RlbDtcbi8vICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBnZXRJbmRleChvbW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgZ2V0dGVyID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyAoMSAtIGZpcnN0KV07XG5cbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcmVmLm1vZGVsICsgJ3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZXQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0ID0gZ2V0SW5kZXgob21vZGVsTmFtZSkuZ2V0LmJpbmQoSURCW29tb2RlbE5hbWVdKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcyAmJiBnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0ID0gTGF6eShpZHMpLm1hcChnZXQpLmZpbHRlcih1dGlscy5ib29sKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgICAgICB9LCBudWxsLCAncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUsICdyZWNlaXZlZC0nICsgb21vZGVsTmFtZSk7XG5cbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShvbW9kZWxOYW1lKSldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLmdldE0yTShpbmRleE5hbWUsIFt0aHMuaWRdLCBmaXJzdCxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGdldHRlcih0aHMuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChvbW9kZWxOYW1lLCB7aWQgOiBpZHN9LG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gSURCW29tb2RlbE5hbWVdLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KFtdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgICAgIEtsYXNzLmZpZWxkc1t1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICByZWFkYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ00yTScsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcnM6IFtdXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS51bmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IFtbSUQsIGluc3RhbmNlLmlkXV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL2RlbGV0ZScsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUubGlua1JlZmVyZW5jZSA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lID09ICdBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZXMgPSBpbnN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBpbnN0YW5jZXNbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJTkRFWF9NMk0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZnMgPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykuZGlmZmVyZW5jZShMYXp5KElOREVYX00yTVtpbmRleE5hbWVdWzBdLmdldCh0aGlzLmlkKSkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBvbW9kZWwgKyAnLycgKyBLbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlZnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkocmVmcykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtJRCwgeF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUF9QT1NUKEtsYXNzLm1vZGVsTmFtZSwgb21vZGVsICsgJ3MvcHV0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGluZGV4TmFtZSBpbiBsaW5rZXIubTJtSW5kZXgpICYmIExhenkobGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKG9tb2RlbCldKGluc3RhbmNlLmlkKSkuZmluZCh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL3B1dCcsIHtjb2xsZWN0aW9uOiBbW3RoaXMuaWQsIGluc3RhbmNlLmlkXV19KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ25ldy1tb2RlbCcsIEtsYXNzKTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbmV3LW1vZGVsLScgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICByZXR1cm4gS2xhc3M7XG4gICAgfTtcblxuICAgIHRoaXMuZ290RGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBjYWxsQmFjaykge1xuICAgICAgICAvLyByZWNlaXZlIGFsbCBkYXRhIGZyb20gZXZlcnkgZW5kIHBvaW50XG4gICAgICAgIGNvbnNvbGUuaW5mbygnZ290RGF0YScpO1xuICAgICAgICBpZiAodHlwZW9mKGRhdGEpID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGF0YSAnICsgZGF0YSArICcgcmVmdXNlZCBmcm9tIGdvdERhdGEoKScpO1xuICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNsZWFuIGRhdGEgZnJvbSByZWxhdGlvbnMgYW5kIHBlcm1pc3Npb25zIGZvciB1c2luZyBpdCBhZnRlciBtb2RlbCBwYXJzaW5nXG4gICAgICAgIGlmICgnX2V4dHJhJyBpbiBkYXRhKXsgZGVsZXRlIGRhdGEuX2V4dHJhIH1cbiAgICAgICAgdmFyIFRPT05FID0gZGF0YS5UT09ORTtcbiAgICAgICAgdmFyIFRPTUFOWSA9IGRhdGEuVE9NQU5ZO1xuICAgICAgICB2YXIgTUFOWVRPTUFOWSA9IGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgdmFyIFBFUk1JU1NJT05TID0gZGF0YS5QRVJNSVNTSU9OUztcbiAgICAgICAgdmFyIFBBID0gZGF0YS5QQTtcbiAgICAgICAgZGVsZXRlIGRhdGEuVE9PTkU7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBBO1xuICAgICAgICBpZiAoIVBBKSB7IFBBID0ge307IH1cblxuICAgICAgICAvLyBjbGVhbmluZyBmcm9tIHVzZWxlc3MgZGVsZXRlZCBkYXRhXG4gICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLmZpbHRlcihmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgcmV0dXJuICghKCdkZWxldGVkJyBpbiB2KSB8fCAoKGsgaW4gbW9kZWxDYWNoZSkpKTtcbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgnbTJtJyBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbTJtID0gZGF0YS5tMm07XG4gICAgICAgICAgICBkZWxldGUgZGF0YVsnbTJtJ107XG4gICAgICAgIH1cbiAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uIChkYXRhLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsQ2xhc3MgPSBtb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXN1bHRzICYmIChkYXRhLnJlc3VsdHMubGVuZ3RoID4gMCkgJiYgKGRhdGEucmVzdWx0c1swXS5jb25zdHJ1Y3RvciA9PSBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMYXp5KG1vZGVsQ2xhc3MuZmllbGRzT3JkZXIpLnppcCh4KS50b09iamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBMYXp5KGRhdGEucmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgdmFyIGRlbGV0ZWQgPSBkYXRhLmRlbGV0ZWQ7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBQQSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgTVBBID0gUEFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShyZXN1bHRzKS5lYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmQuaWQgaW4gTVBBKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShNUEFbcmVjb3JkLmlkXSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGluZGV4aW5nIHJlZmVyZW5jZXMgYnkgaXRzIElEXG4gICAgICAgICAgICAgICAgdmFyIGl0YWIgPSBnZXRJbmRleChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZSA9IGl0YWIuc291cmNlO1xuXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGVkLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGFibGVbeF07XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuLypcbiAgICAgICAgICAgICAgICBMYXp5KGRlbGV0ZWQpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgIH0pO1xuKi9cbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gcmVzdWx0cy5pbmRleEJ5KCdpZCcpO1xuICAgICAgICAgICAgICAgIHZhciBpayA9IGlkeC5rZXlzKCk7XG4gICAgICAgICAgICAgICAgdmFyIG5uZXcgPSBpay5kaWZmZXJlbmNlKGl0YWIua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWQgPSBpay5kaWZmZXJlbmNlKG5uZXcpO1xuICAgICAgICAgICAgICAgIC8vIHJlbW92aW5nIG9sZCBpZGVudGljYWwgdmFsdWVzXG4gICAgICAgICAgICAgICAgdXBkYXRlZCA9IHVwZGF0ZWQuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhdXRpbHMuc2FtZUFzKGlkeC5nZXQoeCksIGl0YWIuZ2V0KHgpLmFzUmF3KCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIGNsYXNzaWZ5IHJlY29yZHNcbiAgICAgICAgICAgICAgICB2YXIgcGVybXMgPSBkYXRhLnBlcm1pc3Npb25zID8gTGF6eShkYXRhLnBlcm1pc3Npb25zKSA6IExhenkoe30pO1xuICAgICAgICAgICAgICAgIHZhciBuZXdPYmplY3RzID0gbm5ldy5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCksIHBlcm1zLmdldCh4KSlcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vLy8gY2xhc3NpZnlpbmcgdXBkYXRlZFxuICAgICAgICAgICAgICAgIC8vdmFyIHVwZGF0ZWRPYmplY3RzID0gdXBkYXRlZC5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkscGVybXMuZ2V0KHgpKX0pO1xuICAgICAgICAgICAgICAgIC8vdmFyIHVvID0gdXBkYXRlZE9iamVjdHMudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIC8vdXBkYXRlZE9iamVjdHMgPSBMYXp5KHVvKS5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIFt4LHRhYmxlW3guaWRdXX0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGluZyBzaW5nbGUgb2JqZWN0c1xuICAgICAgICAgICAgICAgIHZhciBjaGFuZ2VkID0gW107XG4vLyAgICAgICAgICAgICAgICB2YXIgREFURUZJRUxEUyA9IE1PREVMX0RBVEVGSUVMRFNbbW9kZWxOYW1lXTtcbi8vICAgICAgICAgICAgICAgIHZhciBCT09MRklFTERTID0gTU9ERUxfQk9PTEZJRUxEU1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSXRlbSA9IGl0YWIuZ2V0KHgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ29weSA9IG9sZEl0ZW0uY29weSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3SXRlbSA9IG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkpO1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG1vZGVsLmZpZWxkcykua2V5cygpLmVhY2goZnVuY3Rpb24oayl7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtW2tdID0gbmV3SXRlbVtrXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChbb2xkSXRlbSwgb2xkQ29weV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBzZW5kaW5nIHNpZ25hbCBmb3IgdXBkYXRlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAoY2hhbmdlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgndXBkYXRlZC0nICsgbW9kZWxOYW1lLCBjaGFuZ2VkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8qKioqKioqKiBVcGRhdGUgdW5pdmVyc2UgKioqKioqKipcbiAgICAgICAgICAgICAgICB2YXIgbm8gPSBuZXdPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KG5vKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRhYmxlW3guaWRdID0geFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHJlYnVsZGluZyByZXZlcnNlIGluZGV4ZXNcbiAgICAgICAgICAgICAgICBMYXp5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXS5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgICAgICAgICAgUkVWSURYW21vZGVsTmFtZSArICcuJyArIHJlZl0gPSBJREJbbW9kZWxOYW1lXS5ncm91cEJ5KCdfJyArIHJlZik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIG5ldyB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAobm8ubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCduZXctJyArIG1vZGVsTmFtZSwgTGF6eShubyksIGRhdGEudG90YWxSZXN1bHRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdkZWxldGVkLScgKyBtb2RlbE5hbWUsIGRlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgZGF0YSBhcnJpdmVkXG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtJyArIG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChUT09ORSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVE9PTkUnKTtcbiAgICAgICAgICAgIExhenkoVE9PTkUpLmVhY2goZnVuY3Rpb24gKHZhbHMsIG1vZGVsTmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIHVkeCA9IGdldFVubGlua2VkKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVE9NQU5ZKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUT01BTlknKTtcbiAgICAgICAgICAgIExhenkoVE9NQU5ZKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBpbmRleE5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gQVNLRURfVU5MSU5LRUQpKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX1VOTElOS0VEW2luZGV4TmFtZV0gPSBMYXp5KFtdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgTGF6eSh2YWxzKS5lYWNoKGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9VTkxJTktFRFtpbmRleE5hbWVdLnNvdXJjZS5wdXNoKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChNQU5ZVE9NQU5ZKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdNQU5ZVE9NQU5ZJyk7XG4gICAgICAgICAgICBMYXp5KE1BTllUT01BTlkpLmVhY2goZnVuY3Rpb24gKHZhbHMsIGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCA9IHBhcnNlSW50KGluZGV4TmFtZS5zcGxpdCgnfCcpWzFdKTtcbiAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBpbmRleE5hbWUuc3BsaXQoJ3wnKVswXTtcbiAgICAgICAgICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gQVNLRURfTTJNKSkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9NMk1baW5kZXhOYW1lXSA9IFt7fSwge31dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgTUlEWCA9IEFTS0VEX00yTVtpbmRleE5hbWVdW2ZpcnN0XTtcbiAgICAgICAgICAgICAgICBMYXp5KHZhbHMpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgTUlEWFt4ICsgJyddID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgTUlEWFt4XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobTJtKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RNMk0obTJtKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoUEVSTUlTU0lPTlMpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdFBlcm1pc3Npb25zKFBFUk1JU1NJT05TKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjYWxsQmFjaykge1xuICAgICAgICAgICAgY2FsbEJhY2soZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnZ290LWRhdGEnKTtcbiAgICB9O1xuICAgIHRoaXMuZ290UGVybWlzc2lvbnMgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24gKHYsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgTGF6eSh2WzBdKS5lYWNoKGZ1bmN0aW9uIChyb3csIGlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKChyZXNvdXJjZU5hbWUgaW4gSURCKSAmJiAoaWQgaW4gSURCW3Jlc291cmNlTmFtZV0uc291cmNlKSl7XG4gICAgICAgICAgICAgICAgICAgIElEQltyZXNvdXJjZU5hbWVdLmdldChpZCkuX3Blcm1pc3Npb25zID0gTGF6eShyb3cpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCB0cnVlXVxuICAgICAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKExhenkodlswXSkuc2l6ZSgpKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMtJyArIHJlc291cmNlTmFtZSwgTGF6eSh2WzBdKS5rZXlzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZW1pdCgndXBkYXRlLXBlcm1pc3Npb25zJyk7XG4gICAgfTtcblxuXG4gICAgdGhpcy5nb3RNMk0gPSBmdW5jdGlvbihtMm0pe1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihkYXRhLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgdmFyIG0ybUluZGV4ID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24obSl7XG4gICAgICAgICAgICAgICAgTGF6eShtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsdmVyYil7XG4gICAgICAgICAgICAgICAgICAgIG0ybUluZGV4W3ZlcmJdKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdyZWNlaXZlZC1tMm0nKTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLW0ybS0nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5mZXRjaCA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKSB7ICAvL1xuICAgICAgICAvLyBpZiBhIGNvbm5lY3Rpb24gaXMgY3VycmVudGx5IHJ1bm5pbmcsIHdhaXQgZm9yIGNvbm5lY3Rpb24uXG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gd2FpdGluZ0Nvbm5lY3Rpb25zKXtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0sNTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGZldGNoaW5nIGFzeW5jaHJvbW91cyBtb2RlbCBmcm9tIHNlcnZlclxuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUobW9kZWxOYW1lLCAoZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgICAgIC8vIGlmIGRhdGEgY2FtZXMgZnJvbSByZWFsdGltZSBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKFcyUFJFU09VUkNFLmNvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gZ2V0dGluZyBmaWx0ZXIgZmlsdGVyZWQgYnkgY2FjaGluZyBzeXN0ZW1cbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyID0gbGlzdENhY2hlLmZpbHRlcihtb2RlbCxmaWx0ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHNvbXRoaW5nIGlzIG1pc3Npbmcgb24gbXkgbG9jYWwgREIgXG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXNrIGZvciBtaXNzaW5ncyBhbmQgcGFyc2Ugc2VydmVyIHJlc3BvbnNlIGluIG9yZGVyIHRvIGVucmljaCBteSBsb2NhbCBEQi5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBsYWNpbmcgbG9jayBmb3IgdGhpcyBtb2RlbFxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywge2ZpbHRlciA6IGZpbHRlcn0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSxjYWxsQmFjayk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVsZWFzZSBsb2NrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihyZXQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWxlYXNlIGxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywgc2VuZERhdGEsZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbHRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHT1RfQUxMLnNvdXJjZS5wdXNoKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXQgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICAvLyBzZWFyY2ggb2JqZWN0cyBmcm9tIElEQi4gSWYgc29tZSBpZCBpcyBtaXNzaW5nLCBpdCByZXNvbHZlIGl0IGJ5IHRoZSBzZXJ2ZXJcbiAgICAgICAgLy8gaWYgYSByZXF1ZXN0IHRvIHRoZSBzYW1lIG1vZGVsIGlzIHBlbmRpbmcsIHdhaXQgZm9yIGl0cyBjb21wbGV0aW9uXG4gICAgICAgIFxuICAgICAgICBpZiAoaWRzLmNvbnN0cnVjdG9yICE9PSBBcnJheSl7XG4gICAgICAgICAgICBpZHMgPSBbaWRzXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBzb21lIGVudGl0eSBpcyBtaXNzaW5nIFxuICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUgLCB7aWQ6IGlkc30sIG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgIHZhciBpdGFiID0gSURCW21vZGVsTmFtZV1cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIGlkcyl7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goaXRhYi5zb3VyY2VbaWRzW2lkXV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ290TW9kZWwgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBmb3IgKHZhciBtb2RlbE5hbWUgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gZGF0YVttb2RlbE5hbWVdO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlWydkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lXSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgbW9kZWxDYWNoZVttb2RlbE5hbWVdID0gbWFrZU1vZGVsQ2xhc3MobW9kZWwpO1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIElEQikpIHtcbiAgICAgICAgICAgICAgICBJREJbbW9kZWxOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZGVzY3JpYmUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHJldCA9IG1vZGVsQ2FjaGVbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpKXtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGZhaWxlZE1vZGVscyl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY2FjaGVLZXkgPSAnZGVzY3JpcHRpb246JyArIG1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoY2FjaGVLZXkgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ290TW9kZWwoSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbY2FjaGVLZXldKSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVzY3JpYmUnLG51bGwsIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290TW9kZWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZWxOb3RGb3VuZC5oYW5kbGUobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxlZE1vZGVsc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9ICAgICAgICBcbiAgICB9O1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZGVjb3JhdG9yKSB7XG4gICAgICAgIHZhciBrZXkgPSB1dGlscy5oYXNoKGRlY29yYXRvcik7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlcnMpKSBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXSA9IG5ldyBIYW5kbGVyKCk7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlclVzZWQpKSBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXSA9IHt9O1xuICAgICAgICBpZiAoa2V5IGluIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdW2tleV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gbW9kZWxDYWNoZSkge1xuICAgICAgICAgICAgZGVjb3JhdG9yKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXS5hZGRIYW5kbGVyKGRlY29yYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGF0dHJpYnV0ZXMpe1xuICAgICAgICB2YXIgYWRkUHJvcGVydHkgPSBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlcykge1xuICAgICAgICAgIGF0dHJpYnV0ZXMuZm9yRWFjaChmdW5jdGlvbih2YWwpe1xuICAgICAgICAgICAgdmFyIGtleSA9ICdwQTonICsgbW9kZWwubW9kZWxOYW1lICsgJzonICsgdmFsO1xuICAgICAgICAgICAgdmFyIGthdHRyID0gJ19fJyArIHZhbDtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtb2RlbC5wcm90b3R5cGUsIHZhbCwge1xuICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2F0dHIgaW4gdGhpcykpe1xuICAgICAgICAgICAgICAgICAgdmFyIHYgPSBsb2NhbFN0b3JhZ2Vba2V5ICsgdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgICB0aGlzW2thdHRyXSA9IHY/SlNPTi5wYXJzZSh2KTpudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1trYXR0cl07XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgICAgIHRoaXNba2F0dHJdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW2tleSArIHRoaXMuaWRdID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKSkgeyBwZXJzaXN0ZW50QXR0cmlidXRlc1ttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgdmFyIGF0dHJzID0gcGVyc2lzdGVudEF0dHJpYnV0ZXNbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHZhciBuZXdBdHRycyA9IExhenkoYXR0cmlidXRlcykuZGlmZmVyZW5jZShhdHRycykudG9BcnJheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5ld0F0dHJzID0gYXR0cnM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld0F0dHJzLmxlbmd0aCl7XG4gICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIG1vZGVsQ2FjaGUpe1xuICAgICAgICAgICAgICAgIGFkZFByb3BlcnR5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSwgbmV3QXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGF0dHJzLG5ld0F0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbignbmV3LW1vZGVsJywgZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVycyl7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWwubW9kZWxOYW1lXS5oYW5kbGUobW9kZWxDYWNoZVttb2RlbC5tb2RlbE5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzKG1vZGVsLm1vZGVsTmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMucXVlcnkgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHRoaXMuZGVzY3JpYmUobW9kZWxOYW1lLGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgIC8vIGFycmF5Zml5IGFsbCBmaWx0ZXIgdmFsdWVzXG4gICAgICAgICAgICBmaWx0ZXIgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHYsayl7IHJldHVybiBbayxBcnJheS5pc0FycmF5KHYpP3Y6W3ZdXX0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICB2YXIgZmlsdGVyRnVuY3Rpb24gPSB1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgdmFyIGlkeCA9IGdldEluZGV4KG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB0aHMuZmV0Y2gobW9kZWxOYW1lLGZpbHRlcix0b2dldGhlciwgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soaWR4LmZpbHRlcihmaWx0ZXJGdW5jdGlvbikudmFsdWVzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2RlbGV0ZScsIHsgaWQgOiBpZHN9LCBjYWxsQmFjayk7XG4gICAgfTtcblxuICAgIHRoaXMuY29ubmVjdCA9IGZ1bmN0aW9uIChjYWxsQmFjaykge1xuICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmlzTG9nZ2VkSW4pIHtcbiAgICAgICAgICAgIGNhbGxCYWNrKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29ubmVjdChjYWxsQmFjayk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5mdW5jdGlvbiByZVdoZWVsT1JNKGVuZFBvaW50LCBsb2dpbkZ1bmMpe1xuICAgIHRoaXMuJG9ybSA9IG5ldyBiYXNlT1JNKG5ldyB1dGlscy5yZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgbG9naW5GdW5jKSx0aGlzKTtcbiAgICB0aGlzLm9uID0gdGhpcy4kb3JtLm9uLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLmVtaXQgPSB0aGlzLiRvcm0uZW1pdC5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy51bmJpbmQgPSB0aGlzLiRvcm0udW5iaW5kLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLm9uY2UgPSB0aGlzLiRvcm0ub25jZTtcbiAgICB0aGlzLmFkZE1vZGVsSGFuZGxlciA9IHRoaXMuJG9ybS5hZGRNb2RlbEhhbmRsZXIuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSB0aGlzLiRvcm0uYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMudXRpbHMgPSB1dGlscztcbiAgICB0aGlzLmxvZ291dCA9IHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ291dC5iaW5kKHRoaXMuJG9ybS5jb25uZWN0aW9uKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzLiRvcm0uY29ubmVjdGlvbjtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKGZ1bmN0aW9uKGNhbGxCYWNrLHJlamVjdCl7XG4gICAgICAgIGNvbm5lY3Rpb24uY29ubmVjdChjYWxsQmFjayk7XG4gICAgfSkpO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ2luKHVzZXJuYW1lLCBwYXNzd29yZCwgYWNjZXB0KTsgICAgXG4gICAgfSkuYmluZCh0aGlzKSk7XG4gICAgXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dvdXQgPSBmdW5jdGlvbih1cmwpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dvdXQoKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0TW9kZWwgPSBmdW5jdGlvbihtb2RlbE5hbWUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVzY3JpYmUobW9kZWxOYW1lLGFjY2VwdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNpbmdsZSA9IGZhbHNlO1xuICAgIHZhciBtb2ROYW1lID0gbW9kZWxOYW1lO1xuICAgIGlmIChpZHMuY29uc3RydWN0b3IgIT09IEFycmF5KXtcbiAgICAgICAgc2luZ2xlID0gdHJ1ZTtcbiAgICAgICAgaWRzID0gW2lkc11cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoc2luZ2xlKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kb3JtLmdldChtb2ROYW1lLCBpZHMsIGZ1bmN0aW9uKGl0ZW1zKXsgXG4gICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQoaXRlbXNbMF0pO31cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZ2V0KG1vZE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLnF1ZXJ5ID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZmlsdGVyLCByZWxhdGVkKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdmFyIHRvZ2V0aGVyID0gbnVsbDtcbiAgICAgICAgaWYgKHJlbGF0ZWQgJiYgKHJlbGF0ZWQuY29uc3RydWN0b3IgPT09IEFycmF5KSAmJiAocmVsYXRlZC5sZW5ndGgpKXtcbiAgICAgICAgICAgIHRvZ2V0aGVyID0gcmVsYXRlZDtcbiAgICAgICAgfSBlbHNlIGlmIChyZWxhdGVkICYmIChyZWxhdGVkLmNvbnN0cnVjdG9yID09PSBTdHJpbmcpICYmIChyZWxhdGVkLmxlbmd0aCkpe1xuICAgICAgICAgICAgdG9nZXRoZXIgPSByZWxhdGVkLnNwbGl0KCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGlkcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlbGV0ZShtb2RlbE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRMb2dnZWRVc2VyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLiRvcm0uY29ubmVjdGlvbi5jYWNoZWRTdGF0dXMudXNlcl9pZClcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KCdhdXRoX3VzZXInLHRoaXMuJG9ybS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy51c2VyX2lkKTtcbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KSB7XG4gICAgICAgICAgICBzZWxmLm9uY2UoJ2xvZ2dlZC1pbicsZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgICAgIHNlbGYuZ2V0KCdhdXRoX3VzZXInLCB1c2VyKS50aGVuKGFjY2VwdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS4kc2VuZFRvRW5kcG9pbnQgPSBmdW5jdGlvbiAodXJsLCBkYXRhKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLiRwb3N0KHVybCwgZGF0YSk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9naW4odXNlcm5hbWUscGFzc3dvcmQpO1xufVxuIl19
