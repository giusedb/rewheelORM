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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJjb25uZWN0aW9uLmpzIiwidG91Y2hlci5qcyIsInZhY3V1bWNhY2hlci5qcyIsImF1dG9saW5rZXIuanMiLCJsaXN0Y2FjaGVyLmpzIiwibWFueXRvbWFueS5qcyIsImNhY2hlci5qcyIsIm9ybS5qcyJdLCJuYW1lcyI6WyJIYW5kbGVyIiwiaGFuZGxlcnMiLCJzdHJIYW5kbGVycyIsInByb3RvdHlwZSIsImFkZEhhbmRsZXIiLCJoYW5kbGVyIiwic3RySGFuZGxlciIsInV0aWxzIiwiaGFzaCIsInRvU3RyaW5nIiwicHVzaCIsImhhbmRsZSIsImFyZ3MiLCJBcnJheSIsInNsaWNlIiwiY2FsbCIsImFyZ3VtZW50cyIsImZvckVhY2giLCJmdW5jIiwiYXBwbHkiLCJoYW5kbGVCeSIsInRocyIsIk5hbWVkRXZlbnRNYW5hZ2VyIiwiZXZlbnRzIiwiaGFuZGxlcklkIiwiaWR4SWQiLCJvbiIsIm5hbWUiLCJpZCIsImVtaXQiLCJldmVudCIsInVuYmluZCIsImNvdW50IiwiTGF6eSIsImVhY2giLCJ2IiwiayIsImlkeCIsIm4iLCJyZXZlcnNlIiwieCIsInNwbGljZSIsIm9uY2UiLCJldmVudE5hbWUiLCJoYW5kbGVyRnVuY3Rpb24iLCJzZWxmIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsInJlbmFtZUZ1bmN0aW9uIiwiZm4iLCJGdW5jdGlvbiIsImJpbmQiLCJjYWNoZWQiLCJrZXkiLCJ3cmFwcGVyIiwibG9nIiwiY29uc29sZSIsInhkciIsInVybCIsImRhdGEiLCJhcHBsaWNhdGlvbiIsInRva2VuIiwiZm9ybUVuY29kZSIsIlByb21pc2UiLCJhY2NlcHQiLCJyZWplY3QiLCJyZXEiLCJYTUxIdHRwUmVxdWVzdCIsIm9ucmVhZHlzdGF0ZWNoYW5nZSIsInJlYWR5U3RhdGUiLCJyZXNwb25zZURhdGEiLCJKU09OIiwicGFyc2UiLCJyZXNwb25zZVRleHQiLCJhIiwicmVzcG9uc2UiLCJzdGF0dXMiLCJyZXF1ZXN0IiwiWERvbWFpblJlcXVlc3QiLCJvbmxvYWQiLCJzdGF0dXNUZXh0IiwiRXJyb3IiLCJvcGVuIiwib25lcnJvciIsInNldFJlcXVlc3RIZWFkZXIiLCJfX3Rva2VuX18iLCJzaXplIiwic3RyaW5naWZ5IiwibWFwIiwiZW5jb2RlVVJJIiwidG9BcnJheSIsImpvaW4iLCJzZW5kIiwiY2FwaXRhbGl6ZSIsInMiLCJ0b1VwcGVyQ2FzZSIsInRvTG93ZXJDYXNlIiwic3RyIiwicmV0IiwibGVuZ3RoIiwiY2hhckNvZGVBdCIsIm1ha2VGaWx0ZXIiLCJtb2RlbCIsImZpbHRlciIsInVuaWZpZXIiLCJkb250VHJhbnNsYXRlRmlsdGVyIiwic291cmNlIiwidmFscyIsImZpZWxkIiwiaXNBcnJheSIsImZpZWxkcyIsInR5cGUiLCJjb25zdHJ1Y3RvciIsIk51bWJlciIsInNhbWVBcyIsInkiLCJwbHVyYWxpemUiLCJiZWZvcmVDYWxsIiwiYmVmb3JlIiwiZGVjb3JhdG9yIiwidGhlbiIsImNsZWFuU3RvcmFnZSIsImxvY2FsU3RvcmFnZSIsImtleXMiLCJjaHIiLCJzcGxpdCIsInBlcm11dGF0aW9ucyIsImFyciIsImJvb2wiLCJCb29sZWFuIiwibm9vcCIsInR6T2Zmc2V0IiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwidHJhbnNGaWVsZFR5cGUiLCJkYXRlIiwiZGF0ZXRpbWUiLCJzdHJpbmciLCJ0ZXh0IiwiaW50ZWdlciIsInBhcnNlSW50IiwiZmxvYXQiLCJwYXJzZUZsb2F0IiwibW9jayIsIlNUQVRVU0tFWSIsIlJlYWx0aW1lQ29ubmVjdGlvbiIsImVuZFBvaW50Iiwicnd0Q29ubmVjdGlvbiIsImNvbm5lY3Rpb24iLCJTb2NrSlMiLCJvbm9wZW4iLCJ0ZW5hbnQiLCJvbm1lc3NhZ2UiLCJlIiwib25jbG9zZSIsInNldFRpbWVvdXQiLCJ3c0Nvbm5lY3QiLCJjYWNoZWRTdGF0dXMiLCJjbG9zZSIsInJlV2hlZWxDb25uZWN0aW9uIiwiZ2V0TG9naW4iLCJlbmRzV2l0aCIsImlzQ29ubmVjdGVkIiwiaXNMb2dnZWRJbiIsIiRwb3N0IiwiY2FsbEJhY2siLCJwcm9taXNlIiwieGhyIiwiZm9yY2UiLCJ1cGRhdGVTdGF0dXMiLCJ1c2VyX2lkIiwib2xkU3RhdHVzIiwibG9naW5JbmZvIiwiT2JqZWN0IiwibG9naW4iLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwib2JqIiwicmVhbHRpbWVFbmRQb2ludCIsIndzQ29ubmVjdGlvbiIsInVzZXJpZCIsImVycm9yIiwibG9nb3V0Iiwib2siLCJjb25uZWN0IiwiVG91Y2hlciIsInRvdWNoZWQiLCJ0b3VjaCIsInQiLCJWYWN1dW1DYWNoZXIiLCJhc2tlZCIsInBrSW5kZXgiLCJtaXNzaW5nIiwiYXNrIiwibGF6eSIsImNvbnRhaW5zIiwiZ2V0QXNrZWRJbmRleCIsIm1pc3NpbmdzIiwidW5pcXVlIiwiQXV0b0xpbmtlciIsImFjdGl2ZXMiLCJJREIiLCJXMlBSRVNPVVJDRSIsImxpc3RDYWNoZSIsIm1haW5JbmRleCIsImZvcmVpZ25LZXlzIiwibTJtIiwibTJtSW5kZXgiLCJwZXJtaXNzaW9ucyIsImluZGV4IiwiZ2V0SW5kZXhGb3IiLCJyZWZlcmVuY2VzIiwicmVmZXJlbmNlIiwiaW5kZXhOYW1lIiwidG8iLCJyZWZlcmVuY2VkQnkiLCJieSIsIm1hbnlUb01hbnkiLCJyZWxhdGlvbiIsIk1hbnlUb01hbnlSZWxhdGlvbiIsIm0ybUdldCIsImNvbGxlY3Rpb24iLCJnb3REYXRhIiwiZ2V0TTJNIiwibGlua1VubGlua2VkIiwidmFsdWVzIiwic3VtIiwiY2hhbmdlZCIsImluZGV4ZXMiLCJJTkRFWCIsImdldHRlciIsImlkcyIsIm90aGVySW5kZXgiLCJkZXNjcmliZSIsImZsYXR0ZW4iLCJtb2RlbE5hbWUiLCJpZGIiLCJmZXRjaCIsIm1haW5SZXNvdXJjZSIsImZpZWxkTmFtZSIsInRvT2JqZWN0IiwicmVzb3VyY2VOYW1lIiwiZ290UGVybWlzc2lvbnMiLCJQRVJNSVNTSU9OUyIsInNldEludGVydmFsIiwiTGlzdENhY2hlciIsImdvdEFsbCIsImNvbXBvc2l0ZUFza2VkIiwiY2FydGVzaWFuUHJvZHVjdDEiLCJiIiwiY2FydGVzaWFuUHJvZHVjdCIsImV4cGxvZGVGaWx0ZXIiLCJwcm9kdWN0IiwiciIsImZpbHRlclNpbmdsZSIsInRlc3RPbmx5IiwiZGlmZmVyZW5jZSIsImNsZWFuQ29tcG9zaXRlcyIsImZpbHRlckxlbiIsIml0ZW1zIiwiaXRlbSIsImdvdCIsInNpbmdsZSIsInNvbWUiLCJmIiwiZXhwbG9kZWQiLCJwYXJ0aWFscyIsImJhZCIsInBsdWNrIiwiYWRkIiwiZmluZCIsImdldDAiLCJnZXQxIiwiZGVsIiwibCIsImNhY2hlZFByb3BlcnR5QnlFdmVudHMiLCJwcm90byIsInByb3BlcnR5TmFtZSIsInNldHRlciIsInJlc3VsdCIsIm9ybSIsInByb3BlcnR5RGVmIiwidmFsdWUiLCJkZWZpbmVQcm9wZXJ0eSIsIlZhbGlkYXRpb25FcnJvciIsInJlc291cmNlIiwiX3Jlc291cmNlIiwiZm9ybUlkeCIsImVycm9ycyIsImJhc2VPUk0iLCJvcHRpb25zIiwiZXh0T1JNIiwiU3RyaW5nIiwiY29ubmVjdGVkIiwid3MiLCJpbmZvIiwib25NZXNzYWdlSnNvbiIsIm9uTWVzc2FnZVRleHQiLCJtZXNzYWdlIiwic2VudERhdGEiLCJ3YWl0aW5nQ29ubmVjdGlvbnMiLCJhdXRoX2dyb3VwIiwiSURYIiwiUkVWSURYIiwiYnVpbGRlckhhbmRsZXJzIiwiYnVpbGRlckhhbmRsZXJVc2VkIiwicGVyc2lzdGVudEF0dHJpYnV0ZXMiLCJldmVudEhhbmRsZXJzIiwicGVybWlzc2lvbldhaXRpbmciLCJtb2RlbENhY2hlIiwiZmFpbGVkTW9kZWxzIiwibGlua2VyIiwidmFsaWRhdGlvbkV2ZW50IiwiY3VycmVudENvbnRleHQiLCJzYXZpbmdFcnJvckhhbmxkZXIiLCJnZXRJbmRleCIsImdldFVubGlua2VkIiwiVU5MSU5LRUQiLCJQZXJtaXNzaW9uVGFibGUiLCJrbGFzcyIsInNhdmUiLCJjYiIsIm15UGVybXMiLCJncm91cF9pZCIsInBlcm1pc3Npb25MaXN0IiwicCIsInBlcm1zIiwiYWxsUGVybWlzc2lvbnMiLCJpbmRleE9mIiwibWFrZU1vZGVsQ2xhc3MiLCJfbW9kZWwiLCJwcml2YXRlQXJncyIsIm1lcmdlIiwiZnVuY1N0cmluZyIsIktsYXNzIiwicmVmX3RyYW5zbGF0aW9ucyIsImludmVyc2VfcmVmZXJlbmNlcyIsInJlZmVyZW50cyIsImZpZWxkc09yZGVyIiwiZmllbGRPcmRlciIsInJlcHJlc2VudGF0aW9uIiwiZGVsZXRlIiwiX3Blcm1pc3Npb25zIiwiYWxsX3Blcm1zIiwib2JqZWN0X2lkIiwiZ3JvdXBlZCIsInVua25vd25fZ3JvdXBzIiwiZ3JvdXBCeSIsIm8iLCJhc1JhdyIsIklEIiwiYXJnIiwid3JpdGFibGUiLCJjb250ZXh0IiwiY29weSIsImFzciIsImNvbmNhdCIsInNhdmVNdWx0aSIsIm9iamVjdHMiLCJzY29wZSIsInJhdyIsImRlbGV0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsInNhdmVQQSIsIlQiLCJvbyIsIlBBIiwiRnMiLCJmaWVsZElkeCIsInRhcCIsImluZGV4QnkiLCJ3aWRnZXQiLCJyZWYiLCJleHRfcmVmIiwibG9jYWxfcmVmIiwiVHlwZUVycm9yIiwicmV2SW5kZXgiLCJoYXNPd25Qcm9wZXJ0eSIsIm9wdHMiLCJxdWVyeSIsImZpcnN0Iiwib21vZGVsTmFtZSIsInJlYWRhYmxlIiwidmFsaWRhdG9ycyIsInVubGlua1JlZmVyZW5jZSIsImluc3RhbmNlIiwiaW5zdGFuY2VzIiwib21vZGVsIiwibGlua1JlZmVyZW5jZSIsInJlZnMiLCJJTkRFWF9NMk0iLCJXMlBfUE9TVCIsIl9leHRyYSIsIlRPT05FIiwiVE9NQU5ZIiwiTUFOWVRPTUFOWSIsIm1vZGVsQ2xhc3MiLCJ6aXAiLCJkZWxldGVkIiwiTVBBIiwicmVjb3JkIiwiaXRhYiIsInRhYmxlIiwiaWsiLCJubmV3IiwidXBkYXRlZCIsIm5ld09iamVjdHMiLCJvbGRJdGVtIiwib2xkQ29weSIsIm5ld0l0ZW0iLCJubyIsInRvdGFsUmVzdWx0cyIsInVkeCIsIkFTS0VEX1VOTElOS0VEIiwiQVNLRURfTTJNIiwiTUlEWCIsImdvdE0yTSIsInJvdyIsIm0iLCJ2ZXJiIiwidG9nZXRoZXIiLCJzZW5kRGF0YSIsIkdPVF9BTEwiLCJnb3RNb2RlbCIsImNhY2hlS2V5IiwibW9kZWxOb3RGb3VuZCIsImFkZE1vZGVsSGFuZGxlciIsImFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiYXR0cmlidXRlcyIsImFkZFByb3BlcnR5IiwidmFsIiwia2F0dHIiLCJzZXQiLCJhdHRycyIsIm5ld0F0dHJzIiwiZmlsdGVyRnVuY3Rpb24iLCJyZVdoZWVsT1JNIiwibG9naW5GdW5jIiwiJG9ybSIsImdldE1vZGVsIiwibW9kTmFtZSIsInJlbGF0ZWQiLCJnZXRMb2dnZWRVc2VyIiwidXNlciIsIiRzZW5kVG9FbmRwb2ludCJdLCJtYXBwaW5ncyI6Ijs7O0lBQUEsYTtJQUVBLFNBQUFBLE9BQUEsR0FBQTtBQUFBLFFBQ0EsS0FBQUMsUUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLFFBRUEsS0FBQUMsV0FBQSxHQUFBLEVBQUEsQ0FGQTtBQUFBLEs7SUFHQSxDO0lBRUFGLE9BQUEsQ0FBQUcsU0FBQSxDQUFBQyxVQUFBLEdBQUEsVUFBQUMsT0FBQSxFQUFBO0FBQUEsUUFDQSxJQUFBQyxVQUFBLEdBQUFDLEtBQUEsQ0FBQUMsSUFBQSxDQUFBSCxPQUFBLENBQUFJLFFBQUEsRUFBQSxDQUFBLENBREE7QUFBQSxRQUVBLElBQUEsQ0FBQSxDQUFBSCxVQUFBLElBQUEsS0FBQUosV0FBQSxDQUFBLEVBQUE7QUFBQSxZQUNBLEtBQUFBLFdBQUEsQ0FBQUksVUFBQSxJQUFBRCxPQUFBLENBREE7QUFBQSxZQUVBLEtBQUFKLFFBQUEsQ0FBQVMsSUFBQSxDQUFBTCxPQUFBLEVBRkE7QUFBQSxTQUZBO0FBQUEs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QUFBO0FBQUEsb0JBQ0EsSUFBQUEsSUFBQSxLQUFBLFVBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUFvQixVQUFBLENBREE7QUFBQSxxQkFBQSxNQUVBO0FBQUEsd0JBQ0EsT0FBQUMsVUFBQSxFQUFBLENBREE7QUFBQSxxQkFIQTtBQUFBLGlCQUFBLE1BTUE7QUFBQSxvQkFDQSxPQUFBRyxNQUFBLENBQUF4QixJQUFBLENBQUEsQ0FEQTtBQUFBLGlCQVBBO0FBQUEsYUFEQTtBQUFBLFNBQUEsQ0FBQSxDQURBO0FBQUEsSztJQXVOQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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LENBQUFDLFFBQUEsRUFBQUMsUUFBQSxDQUFBLENBREE7QUFBQSxLQUFBLEMiLCJmaWxlIjoicnd0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBIYW5kbGVyKCl7XG4gICAgdGhpcy5oYW5kbGVycyA9IFtdO1xuICAgIHRoaXMuc3RySGFuZGxlcnMgPSB7fTtcbn07XG5cbkhhbmRsZXIucHJvdG90eXBlLmFkZEhhbmRsZXIgPSBmdW5jdGlvbiAoaGFuZGxlcil7XG4gICAgdmFyIHN0ckhhbmRsZXIgPSB1dGlscy5oYXNoKGhhbmRsZXIudG9TdHJpbmcoKSk7XG4gICAgaWYgKCEoc3RySGFuZGxlciBpbiB0aGlzLnN0ckhhbmRsZXJzKSl7XG4gICAgICAgIHRoaXMuc3RySGFuZGxlcnNbc3RySGFuZGxlcl0gPSBoYW5kbGVyO1xuICAgICAgICB0aGlzLmhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfVxufTtcbkhhbmRsZXIucHJvdG90eXBlLmhhbmRsZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMCk7XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KG51bGwsYXJncyk7XG4gICAgfSlcbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGVCeSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSk7XG4gICAgdmFyIHRocyA9IGFyZ3VtZW50c1swXTtcbiAgICB0aGlzLmhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oZnVuYyl7XG4gICAgICAgIGZ1bmMuYXBwbHkodGhzLGFyZ3MpO1xuICAgIH0pXG59O1xuXG5cbmZ1bmN0aW9uIE5hbWVkRXZlbnRNYW5hZ2VyICgpe1xuICAgIHZhciBldmVudHMgPSB7fTtcbiAgICB2YXIgaGFuZGxlcklkID0ge307XG4gICAgdmFyIGlkeElkID0gMDtcbiAgICB0aGlzLm9uID0gZnVuY3Rpb24obmFtZSwgZnVuYyl7XG4gICAgICAgIGlmICghKG5hbWUgaW4gZXZlbnRzKSl7XG4gICAgICAgICAgICBldmVudHNbbmFtZV0gPSBuZXcgQXJyYXkoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWQgPSBpZHhJZCArKztcbiAgICAgICAgZXZlbnRzW25hbWVdLnB1c2goZnVuYyk7XG4gICAgICAgIGhhbmRsZXJJZFtpZF0gPSBmdW5jO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfTtcbiAgICB0aGlzLmVtaXQgPSBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgaWYgKG5hbWUgaW4gZXZlbnRzKXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICAgICAgICAgIGV2ZW50LmFwcGx5KG51bGwsYXJncyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy51bmJpbmQgPSBmdW5jdGlvbihoYW5kbGVyKXtcbiAgICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgICAgaWYgKGhhbmRsZXIgaW4gaGFuZGxlcklkKXtcbiAgICAgICAgICAgIHZhciBmdW5jID0gaGFuZGxlcklkW2hhbmRsZXIgKyAnJ107XG4gICAgICAgICAgICBMYXp5KGV2ZW50cykuZWFjaChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBuIGluIHYpe1xuICAgICAgICAgICAgICAgICAgICBpZiAodltuXSA9PT0gZnVuYyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHgucHVzaChuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWR4LnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICB2LnNwbGljZSh4LDEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGhhbmRsZXJJZFtoYW5kbGVyXTtcbiAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ2FsbCBldmVudCBvbmNlXG4gICAgICovXG4gICAgdGhpcy5vbmNlID0gZnVuY3Rpb24oZXZlbnROYW1lLCBoYW5kbGVyRnVuY3Rpb24pIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgaGFuZGxlciA9IHRoaXMub24oZXZlbnROYW1lLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaGFuZGxlckZ1bmN0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBzZWxmLnVuYmluZChoYW5kbGVyKTtcbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjYWNoZWRLZXlJZHggPSAwO1xuXG52YXIgbnVsbFN0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJyd9O1xuXG5mdW5jdGlvbiBtb2NrT2JqZWN0KCl7XG4gICAgcmV0dXJuIG5ldyBQcm94eSh7fSwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBuYW1lICA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgIGlmIChuYW1lID09PSAndG9TdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsU3RyaW5nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtb2NrT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W25hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSlcbn1cblxuLypcbnZhciAkUE9TVCA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgY2FsbEJhY2ssIGVycm9yQmFjayxoZWFkZXJzKXtcbiAgICB2YXIgb3B0cyA9IHtcbiAgICAgICAgYWNjZXB0cyA6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgdXJsIDogdXJsLFxuICAgICAgICBkYXRhIDogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIGRhdGFUeXBlIDogJ2pzb24nLFxuICAgICAgICBzdWNjZXNzIDogY2FsbEJhY2ssXG4gICAgICAgIGVycm9yIDogZXJyb3JCYWNrLFxuICAgICAgICBtZXRob2QgOiAnUE9TVCcsXG4gICAgICAgIGNvbnRlbnRUeXBlIDogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgfTtcbiAgICBpZiAoaGVhZGVycyl7XG4gICAgICAgIG9wdHMuaGVhZGVycyA9IGhlYWRlcnM7XG4gICAgICAgIG9wdHMuY3Jvc3NEb21haW4gPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gJC5hamF4KG9wdHMpO1xufVxuXG5cbmZ1bmN0aW9uIHJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBnZXRMb2dpbil7XG4gICAgLy8gbWFpbiBcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5nZXRMb2dpbiA9IGdldExvZ2luO1xuICAgIHRoaXMuZXZlbnRzID0gbmV3IE5hbWVkRXZlbnRNYW5hZ2VyKClcbiAgICB0aGlzLiRQT1NUID0gJFBPU1QuYmluZCh0aGlzKTtcbiAgICB0aGlzLm9wdGlvbnMgPSB7ZW5kUG9pbnQgOiBlbmRQb2ludH07XG4gICAgdGhpcy5vbiA9IHRoaXMuZXZlbnRzLm9uLmJpbmQodGhpcyk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24oc3RhdHVzLCBjYWxsQmFjaywgZXJyb3IpIHtcbiAgICBpZiAoc3RhdHVzKSB7XG4gICAgICAgIHZhciBpc0xvZ2dlZCA9IChzdGF0dXMudXNlcl9pZCAmJiAhdGhpcy5vcHRpb25zLnVzZXJfaWQgKTtcbiAgICAgICAgZm9yICh2YXIgeCBpbiBzdGF0dXMpeyB0aGlzLm9wdGlvbnNbeF0gPSBzdGF0dXNbeF07IH1cbiAgICAgICAgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMgPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xuICAgICAgICBpZiAoaXNMb2dnZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzLmVtaXQoJ2xvZ2luJywgdGhpcy5vcHRpb25zLnVzZXJfaWQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5vcHRpb25zLnVzZXJfaWQgJiYgdGhpcy5nZXRMb2dpbil7XG4gICAgICAgIHZhciBsb2dJbmZvID0gdGhpcy5nZXRMb2dpbihlcnJvcik7XG4gICAgICAgIGlmIChsb2dJbmZvLmNvbnN0cnVjdG9yID09PSBPYmplY3Qpe1xuICAgICAgICAgICAgdGhpcy5sb2dpbihsb2dJbmZvLnVzZXJuYW1lLCBsb2dJbmZvLnBhc3N3b3JkKVxuICAgICAgICAgICAgLnRoZW4oKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoc3RhdHVzLCBjYWxsQmFjayk7XG4gICAgICAgICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfSBlbHNlIGlmIChsb2dJbmZvLmNvbnN0cnVjdG9yID09PSBQcm9taXNlKSB7XG4gICAgICAgICAgICBsb2dJbmZvLnRoZW4oKGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgICAgICAgdmFyIHggPSB0aGlzLmxvZ2luKG9iai51c2VybmFtZSxvYmoucGFzc3dvcmQpO1xuICAgICAgICAgICAgICAgIHZhciBtYW5hZ2VFcnJvciA9IChmdW5jdGlvbihiYWQpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhudWxsLGNhbGxCYWNrLGJhZC5lcnJvcik7XG4gICAgICAgICAgICAgICAgfSkuYmluZCh0aGlzKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbEJhY2spe1xuICAgICAgICAgICAgICAgICAgICB4LnRoZW4oY2FsbEJhY2ssbWFuYWdlRXJyb3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHgudGhlbihudWxsLCBtYW5hZ2VFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayh0aGlzLm9wdGlvbnMpO1xuICAgIH0gICAgXG59XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5zdGF0dXMgPSBmdW5jdGlvbihjYWxsQmFjaywgZm9yY2Upe1xuICAgIGlmICgoJ2xhc3RSV1RTdGF0dXMnIGluIGxvY2FsU3RvcmFnZSkgJiYgIWZvcmNlKSB7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHZhciBzdGF0dXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHN0YXR1cyxjYWxsQmFjayk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzKGNhbGxCYWNrLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3N0YXR1c19jYWxsaW5nKXtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5zdGF0dXMoY2FsbEJhY2spO1xuICAgICAgICB9LDUwKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMudGltZXN0YW1wKXtcbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sodGhpcy5vcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGF0dXNfY2FsbGluZyA9IHRydWU7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHRoaXMuJHBvc3QoJ2FwaS9zdGF0dXMnLG51bGwsZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgICAgIHNlbGYuX3N0YXR1c19jYWxsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZVN0YXR1cyhzdGF0dXMsY2FsbEJhY2spO1xuICAgICAgICB9KTsgICAgICAgIFxuICAgIH1cbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS4kcG9zdCA9IGZ1bmN0aW9uKHVybCwgZGF0YSxjYWxsQmFjayl7XG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgaWYgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMudG9rZW4pe1xuICAgICAgICBpZiAoIWRhdGEpe1xuICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMudG9rZW4pe1xuICAgICAgICB2YXIgaGVhZGVycyA9IHsgXG4gICAgICAgICAgICB0b2tlbiA6IHRoaXMub3B0aW9ucy50b2tlbixcbiAgICAgICAgICAgIGFwcGxpY2F0aW9uIDogdGhpcy5vcHRpb25zLmFwcGxpY2F0aW9uXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGhlYWRlcnMgPSBudWxsO1xuICAgIH1cblxuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih0aHMub3B0aW9ucy5lbmRQb2ludCArIHVybCwgZGF0YSwgdGhzLm9wdGlvbnMuYXBwbGljYXRpb24sIHRocy5vcHRpb25zLnRva2VuKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UnLCB4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cyArICctanNvbicsIHhoci5yZXNwb25zZURhdGEsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYWxsQmFjaykgeyBjYWxsQmFjayggeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0ICl9O1xuICAgICAgICAgICAgICAgIGFjY2VwdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItanNvbi0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlRGF0YSx1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItaHR0cCcseGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cyx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWh0dHAtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIHZhciB1cmwgPSB0aGlzLm9wdGlvbnMuZW5kUG9pbnQgKyAnYXBpL2xvZ2luJztcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodXJsLHsgdXNlcm5hbWU6IHVzZXJuYW1lLCBwYXNzd29yZCA6IHBhc3N3b3JkfSwgbnVsbCxjb25uZWN0aW9uLm9wdGlvbnMudG9rZW4sIHRydWUpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24udXBkYXRlU3RhdHVzKHhoci5yZXNwb25zZURhdGEpO1xuICAgICAgICAgICAgICAgIGFjY2VwdChzdGF0dXMpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbihjYWxsQmFjayl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB3c2Nvbm5lY3QgPSBmdW5jdGlvbihzZWxmKXtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24gPSBuZXcgdXRpbHMud3NDb25uZWN0KHNlbGYub3B0aW9ucyk7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uLm9uQ29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5ldmVudHMuZW1pdCgnd3MtY29ubmVjdGVkJywgc2VsZi53c0Nvbm5lY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24ub25EaXNjb25uZWN0KGZ1bmN0aW9uKCl7IFxuICAgICAgICAgICAgaWYgKHNlbGYub3B0aW9ucyAmJiBzZWxmLm9wdGlvbnMucmVhbHRpbWVFbmRQb2ludCl7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB3c2Nvbm5lY3Qoc2VsZik7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0sMTAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdGhpcy5zdGF0dXMoKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgIGlmICgndG9rZW4nIGluIHNlbGYub3B0aW9ucyl7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhzdGF0dXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RpbmcgdG8gJyArIHNlbGYub3B0aW9ucy5lbmRQb2ludCk7XG4gICAgICAgICAgICBpZiAoc2VsZi5vcHRpb25zLnVzZXJuYW1lICYmIHNlbGYub3B0aW9ucy5wYXNzd29yZCl7XG4gICAgICAgICAgICAgICAgc2VsZi5sb2dpbihcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLnVzZXJuYW1lLFxuICAgICAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMucGFzc3dvcmQsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncmVuZXdpbmcgY29ubmVjdGlvbicpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNlbGYub3B0aW9ucy50b2tlbiAmJiBzZWxmLm9wdGlvbnMucmVhbHRpbWVFbmRQb2ludCAmJiAoIXNlbGYud3NDb25uZWN0aW9uKSl7XG4gICAgICAgICAgICB3c2Nvbm5lY3Qoc2VsZik7XG4gICAgICAgIH1cbiAgICB9KS5iaW5kKHRoaXMpKTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dPdXQgPSBmdW5jdGlvbih1cmwsIGNhbGxCYWNrKXtcbiAgICByZXR1cm4gdGhpcy4kcG9zdCgnYXBpL2xvZ291dCcse30sKGZ1bmN0aW9uKHN0YXR1cykge1xuICAgICAgICBpZiAoJ2xhc3RSV1RTdGF0dXMnIGluIGxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHtlbmRQb2ludDogdGhpcy5vcHRpb25zLmVuZFBvaW50fTtcbiAgICAgICAgaWYgKHRoaXMud3NDb25uZWN0aW9uKSB7IFxuICAgICAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICAgICAgICAgIHRoaXMud3NDb25uZWN0aW9uID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodXJsKSB7IGxvY2F0aW9uID0gdXJsOyB9XG4gICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgfSkuYmluZCh0aGlzKSk7XG59XG4qL1xudmFyIHV0aWxzID0ge1xuICAgIHJlbmFtZUZ1bmN0aW9uIDogZnVuY3Rpb24gKG5hbWUsIGZuKSB7XG4gICAgICAgIHJldHVybiAobmV3IEZ1bmN0aW9uKFwicmV0dXJuIGZ1bmN0aW9uIChjYWxsKSB7IHJldHVybiBmdW5jdGlvbiBcIiArIG5hbWUgK1xuICAgICAgICAgICAgXCIgKCkgeyByZXR1cm4gY2FsbCh0aGlzLCBhcmd1bWVudHMpIH07IH07XCIpKCkpKEZ1bmN0aW9uLmFwcGx5LmJpbmQoZm4pKTtcbiAgICB9LFxuICAgIGNhY2hlZCA6IGZ1bmN0aW9uKGZ1bmMsIGtleSl7XG4gICAgICAgIGlmICgha2V5KXsgICAgXG4gICAgICAgICAgICBrZXkgPSAnXycgKyBjYWNoZWRLZXlJZHgrKztcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiB3cmFwcGVyKCl7XG4gICAgICAgICAgICBpZiAoIXRoaXNba2V5XSl7XG4gICAgICAgICAgICAgICAgdGhpc1trZXldID0gZnVuYy5jYWxsKHRoaXMsW2FyZ3VtZW50c10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNba2V5XTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHdyYXBwZXI7XG4gICAgfSxcbi8vICAgICRQT1NUIDogJFBPU1QsXG4vLyAgICByZVdoZWVsQ29ubmVjdGlvbjogcmVXaGVlbENvbm5lY3Rpb24sXG4gICAgbG9nOiBmdW5jdGlvbigpeyBcbiAgICAgICAgY29uc29sZS5sb2coYXJndW1lbnRzKTtcbiAgICB9LFxuXG4gICAgeGRyOiBmdW5jdGlvbiAodXJsLCBkYXRhLCBhcHBsaWNhdGlvbix0b2tlbiwgZm9ybUVuY29kZSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogTWFrZSBhbiBIVFRQIFJlcXVlc3QgYW5kIHJldHVybiBpdHMgcHJvbWlzZS5cbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIHJlcTtcbiAgICAgICAgICAgIGlmICghZGF0YSkgeyBkYXRhID0ge307fVxuXG4gICAgICAgICAgICBpZihYTUxIdHRwUmVxdWVzdCkge1xuICAgICAgICAgICAgICAgIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2VEYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZSA9IHtyZXNwb25zZURhdGE6IHJlc3BvbnNlRGF0YSwgcmVzcG9uc2VUZXh0OiByZXEucmVzcG9uc2VUZXh0LHN0YXR1czogcmVxLnN0YXR1cywgcmVxdWVzdDogcmVxfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXEuc3RhdHVzID49IDIwMCAmJiByZXEuc3RhdHVzIDwgNDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYoWERvbWFpblJlcXVlc3Qpe1xuICAgICAgICAgICAgICAgIHJlcSA9IG5ldyBYRG9tYWluUmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgIHJlcS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgYWNjZXB0KHJlcS5yZXNwb25zZVRleHQscmVxLnN0YXR1c1RleHQsIHJlcSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignQ09SUyBub3Qgc3VwcG9ydGVkJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXEub3BlbignUE9TVCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgICAgICByZXEub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgICAgICBpZiAodG9rZW4pIHsgZGF0YS5fX3Rva2VuX18gPSB0b2tlbiB9XG4gICAgICAgICAgICBpZiAoIWZvcm1FbmNvZGUpe1xuICAgICAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCd0ZXh0L3BsYWluJyk7XG4gICAgICAgICAgICAgICAgZGF0YSA9IExhenkoZGF0YSkuc2l6ZSgpP0pTT04uc3RyaW5naWZ5KGRhdGEpOicnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyk7XG4gICAgICAgICAgICAgICAgZGF0YSA9IExhenkoZGF0YSkubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gayArICc9JyArIGVuY29kZVVSSSh2LnRvU3RyaW5nKCkpOyAgXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpLmpvaW4oJyYnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcS5zZW5kKGRhdGEpO1xuICAgIC8vICAgICAgICByZXEuc2VuZChudWxsKTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIGNhcGl0YWxpemUgOiBmdW5jdGlvbiAocykge1xuICAgICAgICByZXR1cm4gc1swXS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgIH0sXG5cbiAgICBoYXNoIDogZnVuY3Rpb24oc3RyKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhhc2hlZCBmdW5jdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgc3RyID0gc3RyLnRvU3RyaW5nKCk7XG4gICAgICAgIHZhciByZXQgPSAxO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDt4PHN0ci5sZW5ndGg7eCsrKXtcbiAgICAgICAgICAgIHJldCAqPSAoMSArIHN0ci5jaGFyQ29kZUF0KHgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHJldCAlIDM0OTU4Mzc0OTU3KS50b1N0cmluZygpO1xuICAgIH0sXG5cbiAgICBtYWtlRmlsdGVyIDogZnVuY3Rpb24gKG1vZGVsLCBmaWx0ZXIsIHVuaWZpZXIsIGRvbnRUcmFuc2xhdGVGaWx0ZXIpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ha2UgZmlsdGVyIGZvciBBcnJheS5maWx0ZXIgZnVuY3Rpb24gYXMgYW4gYW5kIG9mIG9yXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoIXVuaWZpZXIpIHsgdW5pZmllciA9ICcgJiYgJzt9XG4gICAgICAgIGlmIChMYXp5KGZpbHRlcikuc2l6ZSgpID09PSAwKXtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KXsgcmV0dXJuIHRydWUgfTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc291cmNlID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2YWxzLCBmaWVsZCl7XG4gICAgICAgICAgICBpZiAoIXZhbHMpIHsgdmFscyA9IFtudWxsXX1cbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWxzKSl7XG4gICAgICAgICAgICAgICAgdmFscyA9IFt2YWxzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZG9udFRyYW5zbGF0ZUZpbHRlciAmJiAobW9kZWwuZmllbGRzW2ZpZWxkXS50eXBlID09PSAncmVmZXJlbmNlJykpIHtcbiAgICAgICAgICAgICAgICBmaWVsZCA9ICdfJyArIGZpZWxkO1xuICAgICAgICAgICAgICAgIHZhbHMgPSBMYXp5KHZhbHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHggJiYgKHguY29uc3RydWN0b3IgIT09IE51bWJlcikpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobW9kZWwuZmllbGRzW2ZpZWxkXS50eXBlID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgdmFscyA9IHZhbHMubWFwKEpTT04uc3RyaW5naWZ5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAnKCcgKyAgTGF6eSh2YWxzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcoeC4nICsgZmllbGQgKyAnID09PSAnICsgeCArICcpJztcbiAgICAgICAgICAgIH0pLmpvaW4oJyB8fCAnKSAgKycpJztcbiAgICAgICAgfSkudG9BcnJheSgpLmpvaW4odW5pZmllcik7XG4gICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJ4XCIsIFwicmV0dXJuIFwiICsgc291cmNlKTtcbiAgICB9LFxuXG4gICAgc2FtZUFzIDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZXAgZXF1YWxcbiAgICAgICAgICovXG4gICAgICAgIGZvciAodmFyIGsgaW4geCkge1xuICAgICAgICAgICAgaWYgKHlba10gIT0geFtrXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIHBsdXJhbGl6ZSA6IGZ1bmN0aW9uKHN0ciwgbW9kZWwpe1xuICAgICAgICAvKipcbiAgICAgICAgICogTGV4aWNhbGx5IHJldHVybnMgZW5nbGlzaCBwbHVyYWwgZm9ybVxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIHN0ciArICdzJztcbiAgICB9LFxuXG4gICAgYmVmb3JlQ2FsbCA6IGZ1bmN0aW9uKGZ1bmMsIGJlZm9yZSl7XG4gICAgICAgIHZhciBkZWNvcmF0b3IgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgYmVmb3JlKCkudGhlbihmdW5jKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZGVjb3JhdG9yO1xuICAgIH0sXG5cbiAgICBjbGVhblN0b3JhZ2UgOiBmdW5jdGlvbigpe1xuICAgICAgICAvKipcbiAgICAgICAgICogQ2xlYW4gbG9jYWxTdG9yYWdlIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgTGF6eShsb2NhbFN0b3JhZ2UpLmtleXMoKS5lYWNoKGZ1bmN0aW9uKGspe1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtrXTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHJldmVyc2UgOiBmdW5jdGlvbiAoY2hyLCBzdHIpIHtcbiAgICAgICAgcmV0dXJuIHN0ci5zcGxpdChjaHIpLnJldmVyc2UoKS5qb2luKGNocik7XG4gICAgfSxcbiAgICBwZXJtdXRhdGlvbnM6IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgeCA9IGFyci5sZW5ndGgtMTsgeCA+PSAwO3gtLSl7XG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gYXJyLmxlbmd0aC0xOyB5ID49IDA7IHktLSl7XG4gICAgICAgICAgICAgICAgaWYgKHggIT09IHkpXG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKFthcnJbeF0sIGFyclt5XV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcblxuICAgIGJvb2w6IEJvb2xlYW4sXG5cbiAgICBub29wIDogZnVuY3Rpb24oKXt9LFxuXG4gICAgdHpPZmZzZXQ6IG5ldyBEYXRlKCkuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIDYwMDAwLFxuXG4gICAgdHJhbnNGaWVsZFR5cGU6IHtcbiAgICAgICAgZGF0ZTogZnVuY3Rpb24oeCkgeyByZXR1cm4gbmV3IERhdGUoeCAqIDEwMDAgKyB1dGlscy50ek9mZnNldCApIH0sXG4gICAgICAgIGRhdGV0aW1lOiBmdW5jdGlvbih4KSB7IHJldHVybiBuZXcgRGF0ZSh4ICogMTAwMCArIHV0aWxzLnR6T2Zmc2V0ICkgfSxcbiAgICAgICAgc3RyaW5nOiBmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvU3RyaW5nKCk7IH0sXG4gICAgICAgIHRleHQ6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG9TdHJpbmcoKTsgfSxcbiAgICAgICAgaW50ZWdlcjogZnVuY3Rpb24oeCkgeyByZXR1cm4gcGFyc2VJbnQoeCk7IH0sXG4gICAgICAgIGZsb2F0OiBmdW5jdGlvbih4KSB7IHJldHVybiBwYXJzZUZsb2F0KHgpOyB9XG4gICAgfSwgXG4gICAgbW9jayA6IG1vY2tPYmplY3Rcbn07XG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBTVEFUVVNLRVkgPSAnbGFzdFJXVENvbm5lY3Rpb25TdGF0dXMnO1xuXG5mdW5jdGlvbiBSZWFsdGltZUNvbm5lY3Rpb24oZW5kUG9pbnQsIHJ3dENvbm5lY3Rpb24pe1xuICAgIC8qKlxuICAgICAqIENvbm5lY3RzIGEgd2Vic29ja2V0IHdpdGggcmVXaGVlbCBjb25uZWN0aW9uXG4gICAgICovXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgU29ja0pTKGVuZFBvaW50KTtcbiAgICBjb25uZWN0aW9uLm9ub3BlbiA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdvcGVuIDogJyArIHgpO1xuICAgICAgICBjb25uZWN0aW9uLnRlbmFudCgpO1xuICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLWNvbm5lY3Rpb24tb3BlbicseCk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9ubWVzc2FnZSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGlmICh4LnR5cGUgPT0gJ21lc3NhZ2UnKSB7XG4gICAgICAgICAgICAvLyQubm90aWZ5KHguZGF0YSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vVE9ETyBzZXQgZnJvbVJlYWx0aW1lXG4gICAgICAgICAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1tZXNzYWdlLWpzb24nLCBKU09OLnBhcnNlKHguZGF0YSkpO1xuICAgICAgICAgICAgICAgIC8vVE9ETyB1bnNldCBmcm9tUmVhbHRpbWVcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtbWVzc2FnZS10ZXh0JywgSlNPTi5wYXJzZSh4LmRhdGEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmcm9tIHJlYWx0aW1lICcseCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGNvbm5lY3Rpb24ub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2V0VGltZW91dCh1dGlscy53c0Nvbm5lY3QsMTAwMCk7XG4gICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtY29ubmVjdGlvbi1jbG9zZWQnKTtcbiAgICB9O1xuICAgIGNvbm5lY3Rpb24udGVuYW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25uZWN0aW9uLnNlbmQoJ1RFTkFOVDonICsgcnd0Q29ubmVjdGlvbi5jYWNoZWRTdGF0dXMuYXBwbGljYXRpb24gKyAnOicgKyByd3RDb25uZWN0aW9uLmNhY2hlZFN0YXR1cy50b2tlbik7XG4gICAgfVxuICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgIH1cbn0gICAgXG5cbmZ1bmN0aW9uIHJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBnZXRMb2dpbil7XG4gICAgLyoqXG4gICAgICogQ29ubmVjdGlvbiBiYXNpYyBmb3IgcmVXaGVlbFxuICAgICAqIEBwYXJhbSBlbmRQb2ludDogc3RyaW5nIGJhc2UgdXJsIGZvciBhbGwgY29tdW5pY2F0aW9uXG4gICAgICogQHBhcmFtIGdldExvZ2luOiBmdW5jdGlvbiB0byBiZSBjYWxsZWQgaW4gY2FzZSBvZiBtaXNzaW5nIGxvZ2luLlxuICAgICAqICB0aGlzIGZ1bmN0aW9uIGNvdWxkIHJldHVybiA6XG4gICAgICogIC0gICBhIHsgdXNlcm5hbWUgOiA8dXNlcm5hbWU+ICwgcGFzc3dvcmQ6IDxwYXNzd29yZD59IG9yXG4gICAgICogIC0gICBiIFByb21pc2UgLT4geyB1c2VybmFtZSA6IDx1c2VybmFtZT4gLCBwYXNzd29yZDogPHBhc3N3b3JkPn1cbiAgICAgKi9cbiAgICAvLyBtYWluIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIGV2ZW50cyA9IG5ldyBOYW1lZEV2ZW50TWFuYWdlcigpO1xuICAgIHRoaXMuZ2V0TG9naW4gPSBnZXRMb2dpbjtcbiAgICB0aGlzLmVuZFBvaW50ID0gZW5kUG9pbnQuZW5kc1dpdGgoJy8nKT8gZW5kUG9pbnQ6IChlbmRQb2ludCArICcvJyk7XG4gICAgdGhpcy5vbiA9IGV2ZW50cy5vbjtcbiAgICB0aGlzLnVuYmluZCA9IGV2ZW50cy51bmJpbmQ7XG4gICAgdGhpcy5lbWl0ID0gZXZlbnRzLmVtaXQ7XG4gICAgdGhpcy5vbmNlID0gZXZlbnRzLm9uY2U7XG4gICAgdGhpcy5jYWNoZWRTdGF0dXMgPSB7fTtcbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2U7XG4gICAgdGhpcy5pc0xvZ2dlZEluID0gZmFsc2U7XG4gICAgLy8gcmVnaXN0ZXJpbmcgdXBkYXRlIHN0YXR1c1xuICAgIHZhciB0aHMgPSB0aGlzO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLiRwb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLGNhbGxCYWNrKXtcbiAgICAvKipcbiAgICAgKiBBSkFYIGNhbGwgZm9yIGZldGNoIGFsbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICogQHBhcmFtIHVybDogbGFzdCB1cmwgcGFydCBmb3IgYWpheCBjYWxsXG4gICAgICogQHBhcmFtIGRhdGE6IGRhdGEgb2JqZWN0IHRvIGJlIHNlbnRcbiAgICAgKiBAcGFyYW0gY2FsbEJhY2s6IGZ1bmN0aW9uKHhocikgd2lsbCBiZSBjYWxsZWQgd2hlbiBkYXRhIGFycml2ZXNcbiAgICAgKiBAcmV0dXJucyBQcm9taXNlPHhocj4gc2FtZSBvZiBjYWxsQmFja1xuICAgICAqL1xuICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5lbmRQb2ludCArIHVybCwgZGF0YSwgdGhzLmNhY2hlZFN0YXR1cy5hcHBsaWNhdGlvbiwgdGhzLmNhY2hlZFN0YXR1cy50b2tlbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2h0dHAtcmVzcG9uc2UnLCB4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIHRocy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMgKyAnLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FsbEJhY2spIHsgY2FsbEJhY2soIHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCApfTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1qc29uLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VEYXRhLHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWh0dHAnLHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWh0dHAtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuc3RhdHVzID0gZnVuY3Rpb24oY2FsbEJhY2ssIGZvcmNlKSB7XG4gICAgLyoqXG4gICAgICogQ2hlY2sgY3VycmVudCBzdGF0dXMgYW5kIGNhbGxiYWNrIGZvciByZXN1bHRzLlxuICAgICAqIEl0IGNhY2hlcyByZXN1bHRzIGZvciBmdXJ0aGVyLlxuICAgICAqIEBwYXJhbSBjYWxsYmFjazogKHN0YXR1cyBvYmplY3QpXG4gICAgICogQHBhcmFtIGZvcmNlOiBib29sZWFuIGlmIHRydWUgZW1wdGllcyBjYWNoZSAgXG4gICAgICogQHJldHVybiB2b2lkXG4gICAgICovXG4gICAgLy8gaWYgZm9yY2UsIGNsZWFyIGFsbCBjYWNoZWQgdmFsdWVzXG4gICAgaWYgKGZvcmNlKSB7XG4gICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzID0ge307XG4gICAgICAgIGlmIChTVEFUVVNLRVkgaW4gbG9jYWxTdG9yYWdlKXtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2VbU1RBVFVTS0VZXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyB0cnkgZm9yIHZhbHVlIHJlc29sdXRpb25cbiAgICAvLyBmaXJzdCBvbiBtZW1vcnlcbiAgICBpZiAoTGF6eSh0aGlzLmNhY2hlZFN0YXR1cykuc2l6ZSgpKXtcbiAgICBcbiAgICAvLyB0aGVuIGluIGxvY2FsU3RvcmFnZVxuICAgIH0gZWxzZSBpZiAoU1RBVFVTS0VZIGluIGxvY2FsU3RvcmFnZSkge1xuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVtTVEFUVVNLRVldKSk7XG4gICAgLy8gdGhlbiBvbiBzZXJ2ZXJcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdGhpcy4kcG9zdCgnYXBpL3N0YXR1cycse30sIGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICBjYWxsQmFjayhzdGF0dXMpO1xuICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyhzdGF0dXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gZG9lc24ndCBjYWxsIGNhbGxiYWNrXG4gICAgICAgIHJldHVyblxuICAgIH1cbiAgICBjYWxsQmFjayh0aGlzLmNhY2hlZFN0YXR1cyk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24oc3RhdHVzKXtcbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gQm9vbGVhbihzdGF0dXMudG9rZW4pO1xuICAgIHRoaXMuaXNMb2dnZWRJbiA9IEJvb2xlYW4oc3RhdHVzLnVzZXJfaWQpO1xuICAgIHZhciBvbGRTdGF0dXMgPSB0aGlzLmNhY2hlZFN0YXR1cztcbiAgICB0aGlzLmNhY2hlZFN0YXR1cyA9IHN0YXR1cztcbiAgICBpZiAoIW9sZFN0YXR1cy51c2VyX2lkICYmIHN0YXR1cy51c2VyX2lkKXtcbiAgICAgICAgdGhpcy5lbWl0KCdsb2dnZWQtaW4nLHN0YXR1cy51c2VyX2lkKTtcbiAgICB9IGVsc2UgaWYgKG9sZFN0YXR1cy51c2VyX2lkICYmICFzdGF0dXMudXNlcl9pZCl7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9nZ2VkLW91dCcpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0Nvbm5lY3RlZCAmJiAhdGhpcy5pc0xvZ2dlZEluKXtcbiAgICAgICAgdGhpcy5lbWl0KCdsb2dpbi1yZXF1aXJlZCcpO1xuICAgICAgICBpZiAodGhpcy5nZXRMb2dpbil7XG4gICAgICAgICAgICB2YXIgbG9naW5JbmZvID0gdGhpcy5nZXRMb2dpbigpO1xuICAgICAgICAgICAgaWYgKGxvZ2luSW5mby5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KXtcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ2luKGxvZ2luSW5mby51c2VybmFtZSwgbG9naW5JbmZvLnBhc3N3b3JkLCBsb2dpbkluZm8uY2FsbEJhY2spO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb2dpbkluZm8uY29uc3RydWN0b3IgPT09IFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICBsb2dpbkluZm8udGhlbihmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ2luKG9iai51c2VybmFtZSwgb2JqLnBhc3N3b3JkLCBvYmouY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gcmVhbHRpbWUgY29ubmVjdGlvbiBpcyBzZXR0ZWRcbiAgICBpZiAoIW9sZFN0YXR1cy5yZWFsdGltZUVuZFBvaW50ICYmIHN0YXR1cy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgIHRoaXMud3NDb25uZWN0aW9uID0gbmV3IFJlYWx0aW1lQ29ubmVjdGlvbihzdGF0dXMucmVhbHRpbWVFbmRQb2ludCwgdGhpcyk7XG4gICAgLy8gcmVhbHRpbWUgY29ubmVjdGlvbiBpcyBjbG9zZWRcbiAgICB9IGVsc2UgaWYgKG9sZFN0YXR1cy5yZWFsdGltZUVuZFBvaW50ICYmICFzdGF0dXMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICB0aGlzLndzQ29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICBkZWxldGUgdGhpcy53c0Nvbm5lY3Rpb247XG4gICAgfVxuICAgIHRoaXMuZW1pdCgndXBkYXRlLWNvbm5lY3Rpb24tc3RhdHVzJywgc3RhdHVzLCBvbGRTdGF0dXMpO1xuICAgIGxvY2FsU3RvcmFnZVtTVEFUVVNLRVldID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbn1cblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICAvKipcbiAgICAgKiBtYWtlIGxvZ2luIGFuZCByZXR1cm4gYSBwcm9taXNlLiBJZiBsb2dpbiBzdWNjZWQsIHByb21pc2Ugd2lsbCBiZSBhY2NlcHRlZFxuICAgICAqIElmIGxvZ2luIGZhaWxzIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoIGVycm9yXG4gICAgICogQHBhcmFtIHVzZXJuYW1lOiB1c2VybmFtZVxuICAgICAqIEBwYXJhbSBwYXNzd29yZDogcGFzc3dvcmRcbiAgICAgKiBAcmV0dXJuIFByb21pc2UgKHVzZXIgb2JqZWN0KVxuICAgICAqL1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih0aHMuZW5kUG9pbnQgKyAnYXBpL2xvZ2luJywge3VzZXJuYW1lOiB1c2VybmFtZSB8fCAnJywgcGFzc3dvcmQ6IHBhc3N3b3JkIHx8ICcnfSxudWxsLHRocy5jYWNoZWRTdGF0dXMudG9rZW4sIHRydWUpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBzdGF0dXNcbiAgICAgICAgICAgICAgICB0aHMudXBkYXRlU3RhdHVzKHhoci5yZXNwb25zZURhdGEpO1xuICAgICAgICAgICAgICAgIC8vIGNhbGwgd2l0aCB1c2VyIGlkXG4gICAgICAgICAgICAgICAgYWNjZXB0KHtzdGF0dXMgOiAnc3VjY2VzcycsIHVzZXJpZDogdGhzLmNhY2hlZFN0YXR1cy51c2VyX2lkfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiBlcnJvciBjYWxsIGVycm9yIG1hbmFnZXIgd2l0aCBlcnJvclxuICAgICAgICAgICAgICAgIGFjY2VwdCh7ZXJyb3I6IHhoci5yZXNwb25zZURhdGEuZXJyb3IsIHN0YXR1czogJ2Vycm9yJ30pO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9nb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3QpIHtcbiAgICAgICAgdGhzLiRwb3N0KCdhcGkvbG9nb3V0JylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKG9rKXtcbiAgICAgICAgICAgICAgICB0aHMudXBkYXRlU3RhdHVzKHt9KTtcbiAgICAgICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW1NUQVRVU0tFWV07XG4gICAgICAgICAgICAgICAgYWNjZXB0KClcbiAgICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKGNhbGxCYWNrKSB7XG4gICAgaWYgKHRoaXMuaXNMb2dnZWRJbikge1xuICAgICAgICBjYWxsQmFjayh0aGlzLmNhY2hlZFN0YXR1cy51c2VyX2lkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyB3YWl0IGZvciBsb2dpblxuICAgICAgICB0aGlzLm9uY2UoJ2xvZ2dlZC1pbicsZnVuY3Rpb24odXNlcl9pZCl7XG4gICAgICAgICAgICBjYWxsQmFjayh1c2VyX2lkKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc3RhdHVzKHV0aWxzLm5vb3ApO1xuICAgIH1cbn1cblxudXRpbHMucmVXaGVlbENvbm5lY3Rpb24gPSByZVdoZWVsQ29ubmVjdGlvbjsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFRvdWNoZXIoKXtcbiAgICB2YXIgdG91Y2hlZCA9IGZhbHNlXG4gICAgdGhpcy50b3VjaCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRvdWNoZWQgPSB0cnVlO1xuICAgIH07XG4gICAgdGhpcy50b3VjaGVkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHQgPSB0b3VjaGVkO1xuICAgICAgICB0b3VjaGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybiB0O1xuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuXG5mdW5jdGlvbiBWYWN1dW1DYWNoZXIodG91Y2gsIGFza2VkLCBuYW1lLCBwa0luZGV4KXtcbi8qXG4gICAgaWYgKG5hbWUpe1xuICAgICAgICBjb25zb2xlLmluZm8oJ2NyZWF0ZWQgVmFjdXVtQ2FjaGVyIGFzICcgKyBuYW1lKTtcbiAgICB9XG4qL1xuICAgIGlmICghYXNrZWQpe1xuICAgICAgICB2YXIgYXNrZWQgPSBbXTtcbiAgICB9XG4gICAgdmFyIG1pc3NpbmcgPSBbXTtcbiAgICBcbiAgICB0aGlzLmFzayA9IGZ1bmN0aW9uIChpZCxsYXp5KXtcbiAgICAgICAgaWYgKHBrSW5kZXggJiYgKGlkIGluIHBrSW5kZXguc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghTGF6eShhc2tlZCkuY29udGFpbnMoaWQpKXtcbi8vICAgICAgICAgICAgY29uc29sZS5pbmZvKCdhc2tpbmcgKCcgKyBpZCArICcpIGZyb20gJyArIG5hbWUpO1xuICAgICAgICAgICAgbWlzc2luZy5wdXNoKGlkKTtcbiAgICAgICAgICAgIGlmICghbGF6eSlcbiAgICAgICAgICAgICAgICBhc2tlZC5wdXNoKGlkKTtcbiAgICAgICAgICAgIHRvdWNoLnRvdWNoKCk7XG4gICAgICAgIH0gXG4vLyAgICAgICAgZWxzZSBjb25zb2xlLndhcm4oJygnICsgaWQgKyAnKSB3YXMganVzdCBhc2tlZCBvbiAnICsgbmFtZSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0QXNrZWRJbmRleCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBhc2tlZDtcbiAgICB9XG5cbiAgICB0aGlzLm1pc3NpbmdzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIExhenkobWlzc2luZy5zcGxpY2UoMCxtaXNzaW5nLmxlbmd0aCkpLnVuaXF1ZSgpLnRvQXJyYXkoKTtcbiAgICB9XG59XG4iLCJmdW5jdGlvbiBBdXRvTGlua2VyKGFjdGl2ZXMsIElEQiwgVzJQUkVTT1VSQ0UsIGxpc3RDYWNoZSl7XG4gICAgdmFyIHRvdWNoID0gbmV3IFRvdWNoZXIoKTtcbiAgICB2YXIgbWFpbkluZGV4ID0ge307XG4gICAgdmFyIGZvcmVpZ25LZXlzID0ge307XG4gICAgdmFyIG0ybSA9IHt9O1xuICAgIHZhciBtMm1JbmRleCA9IHt9O1xuICAgIHZhciBwZXJtaXNzaW9ucyA9IHt9O1xuICAgIHRoaXMubWFpbkluZGV4ID0gbWFpbkluZGV4O1xuICAgIHRoaXMuZm9yZWlnbktleXMgPSBmb3JlaWduS2V5cztcbiAgICB0aGlzLm0ybSA9IG0ybTtcbiAgICB0aGlzLm0ybUluZGV4ID0gbTJtSW5kZXg7XG4gICAgdGhpcy5wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zO1xuXG4gICAgVzJQUkVTT1VSQ0Uub24oJ21vZGVsLWRlZmluaXRpb24nLGZ1bmN0aW9uKG1vZGVsLCBpbmRleCl7XG4gICAgICAgIC8vIGRlZmluaW5nIGFsbCBpbmRleGVzIGZvciBwcmltYXJ5IGtleVxuICAgICAgICB2YXIgcGtJbmRleCA9IGxpc3RDYWNoZS5nZXRJbmRleEZvcihtb2RlbC5uYW1lLCAnaWQnKTtcbiAgICAgICAgbWFpbkluZGV4W21vZGVsLm5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgcGtJbmRleCwgJ21haW5JbmRleC4nICsgbW9kZWwubmFtZSwgaW5kZXgpO1xuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRpbmcgcGVybWlzc2lvbiBpbmRleGVzXG4gICAgICAgIHBlcm1pc3Npb25zW21vZGVsLm5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCxudWxsLCAncGVybWlzc2lvbnMuJyArIG1vZGVsLm5hbWUpO1xuXG4gICAgICAgIC8vIGNyZWF0aW5nIGluZGV4ZXMgZm9yIGZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24ocmVmZXJlbmNlKXtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBtb2RlbC5uYW1lICsgJ18nICsgcmVmZXJlbmNlLmlkO1xuICAgICAgICAgICAgZm9yZWlnbktleXNbaW5kZXhOYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIGxpc3RDYWNoZS5nZXRJbmRleEZvcihyZWZlcmVuY2UudG8sICdpZCcpLCByZWZlcmVuY2UudG8gKyAnLmlkIGZvcmVpZ25LZXlzLicgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gY3JlYXRpbmcgcmV2ZXJzZSBmb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VkQnkpLmVhY2goZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IGZpZWxkLmJ5ICsgJy4nICsgZmllbGQuaWQ7XG4gICAgICAgICAgICBmb3JlaWduS2V5c1tpbmRleE5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgbGlzdENhY2hlLmdldEluZGV4Rm9yKGZpZWxkLmJ5LGZpZWxkLmlkKSwgZmllbGQuYnkgKyAnLicgKyBmaWVsZC5pZCArICcgZm9yZWlnbktleXMuJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBMYXp5KG1vZGVsLm1hbnlUb01hbnkpLmVhY2goZnVuY3Rpb24ocmVsYXRpb24pe1xuICAgICAgICAgICAgaWYgKCEocmVsYXRpb24uaW5kZXhOYW1lIGluIG0ybSkpXG4gICAgICAgICAgICAgICAgbTJtW3JlbGF0aW9uLmluZGV4TmFtZV0gPSBbbmV3IFZhY3V1bUNhY2hlcih0b3VjaCxudWxsLCdtMm0uJyArIHJlbGF0aW9uLmluZGV4TmFtZSArICdbMF0nKSwgbmV3IFZhY3V1bUNhY2hlcih0b3VjaCxudWxsLCdtMm0uJyArIHJlbGF0aW9uLmluZGV4TmFtZSsnWzFdJyldO1xuICAgICAgICAgICAgaWYgKCEocmVsYXRpb24uaW5kZXhOYW1lIGluIG0ybUluZGV4KSlcbiAgICAgICAgICAgICAgICBtMm1JbmRleFtyZWxhdGlvbi5pbmRleE5hbWVdID0gbmV3IE1hbnlUb01hbnlSZWxhdGlvbihyZWxhdGlvbixtMm1bcmVsYXRpb24uaW5kZXhOYW1lXSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHZhciBtMm1HZXQgPSBmdW5jdGlvbihpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGNhbGxCYWNrKXtcbiAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoKG4gPyB1dGlscy5yZXZlcnNlKCcvJywgaW5kZXhOYW1lKSA6IGluZGV4TmFtZSkgKyAncycgKyAnL2xpc3QnLCB7Y29sbGVjdGlvbjogY29sbGVjdGlvbn0sIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShkYXRhLCBjYWxsQmFjayk7XG4gICAgICAgICAgICBkZWxldGUgYWN0aXZlc1tpbmRleE5hbWVdXG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgfTtcblxuICAgIHZhciBnZXRNMk0gPSBmdW5jdGlvbihpbmRleE5hbWUsIGNvbGxlY3Rpb24sIG4sIGNhbGxCYWNrKXtcbiAgICAgICAgLy8gYXNrIGFsbCBpdGVtcyBpbiBjb2xsZWN0aW9uIHRvIG0ybSBpbmRleFxuICAgICAgICBMYXp5KGNvbGxlY3Rpb24pLmVhY2gobTJtW2luZGV4TmFtZV1bbl0uYXNrLmJpbmQobTJtW2luZGV4TmFtZV1bbl0pKTtcbiAgICAgICAgLy8gcmVuZXdpbmcgY29sbGVjdGlvbiB3aXRob3V0IGFza2VkXG4gICAgICAgIGNvbGxlY3Rpb24gPSBtMm1baW5kZXhOYW1lXVtuXS5taXNzaW5ncygpO1xuICAgICAgICAvLyBjYWxsaW5nIHJlbW90ZSBmb3IgbTJtIGNvbGxlY3Rpb24gaWYgYW55XG4gICAgICAgIGlmIChjb2xsZWN0aW9uLmxlbmd0aCl7XG4gICAgICAgICAgICBhY3RpdmVzW2luZGV4TmFtZV0gPSAxO1xuICAgICAgICAgICAgbTJtR2V0KGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgY2FsbEJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5nZXRNMk0gPSBnZXRNMk07XG5cbiAgICB2YXIgbGlua1VubGlua2VkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gcGVyZm9ybSBhIERhdGFCYXNlIHN5bmNocm9uaXphdGlvbiB3aXRoIHNlcnZlciBsb29raW5nIGZvciB1bmtub3duIGRhdGFcbiAgICAgICAgaWYgKCF0b3VjaC50b3VjaGVkKCkpIHJldHVybjtcbiAgICAgICAgaWYgKExhenkoYWN0aXZlcykudmFsdWVzKCkuc3VtKCkpIHtcbiAgICAgICAgICAgIHRvdWNoLnRvdWNoKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgTGF6eShtMm0pLmVhY2goZnVuY3Rpb24oaW5kZXhlcywgaW5kZXhOYW1lKXtcbiAgICAgICAgICAgIExhenkoaW5kZXhlcykuZWFjaChmdW5jdGlvbiAoaW5kZXgsbikge1xuICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gaW5kZXgubWlzc2luZ3MoKTtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uID0gTGF6eShjb2xsZWN0aW9uKS5maWx0ZXIoQm9vbGVhbikubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh4KVxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBpZiAoY29sbGVjdGlvbi5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgSU5ERVggPSBtMm1JbmRleFtpbmRleE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0dGVyID0gSU5ERVhbJ2dldCcgKyAoMSAtIG4pXS5iaW5kKElOREVYKTtcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIG0ybUdldChpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGNvbGxlY3Rpb24ubWFwKGdldHRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG90aGVySW5kZXggPSBpbmRleE5hbWUuc3BsaXQoJy8nKVsxIC0gbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUob3RoZXJJbmRleCxmdW5jdGlvbigpe1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoaWRzKS5mbGF0dGVuKCkudW5pcXVlKCkuZWFjaChtYWluSW5kZXhbb3RoZXJJbmRleF0uYXNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShpZHMpLmZsYXR0ZW4oKS51bmlxdWUoKS5lYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFpbkluZGV4W290aGVySW5kZXhdLmFzayh4LHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBMYXp5KG1haW5JbmRleCkuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG1vZGVsTmFtZSkge1xuICAgICAgICAgICAgdmFyIGlkcyA9IGluZGV4Lm1pc3NpbmdzKCk7XG4gICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZhciBpZGIgPSBtb2RlbE5hbWUgaW4gSURCID8gSURCW21vZGVsTmFtZV0ua2V5cygpIDogTGF6eSgpO1xuICAgICAgICAgICAgICAgIC8vbG9nKCdsaW5raW5nLicgKyBtb2RlbE5hbWUgKyAnID0gJyArIFcyUFJFU09VUkNFLmxpbmtpbmcuc291cmNlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSwge2lkOiBpZHN9LG51bGwsdXRpbHMubm9vcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBGb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShmb3JlaWduS2V5cylcbiAgICAgICAgLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgcmV0dXJuIFtrLCB2Lm1pc3NpbmdzKCldXG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbih2KXtcbiAgICAgICAgICAgIHJldHVybiB2WzFdLmxlbmd0aFxuICAgICAgICB9KS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBpZHMgPSB4WzFdO1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHhbMF07XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBpbmRleE5hbWUuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgIHZhciBtYWluUmVzb3VyY2UgPSBpbmRleFswXTtcbiAgICAgICAgICAgIHZhciBmaWVsZE5hbWUgPSBpbmRleFsxXTtcbiAgICAgICAgICAgIHZhciBmaWx0ZXIgPSB7fTtcbiAgICAgICAgICAgIGZpbHRlcltmaWVsZE5hbWVdID0gaWRzO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobWFpblJlc291cmNlLCBmaWx0ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIExhenkoTGF6eShwZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICByZXR1cm4gW2ssIHYubWlzc2luZ3MoKV1cbiAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICByZXR1cm4gdlsxXS5sZW5ndGhcbiAgICAgICAgfSkudG9PYmplY3QoKSkuZWFjaChmdW5jdGlvbiAoaWRzLCByZXNvdXJjZU5hbWUpIHtcbiAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIGFjdGl2ZXNbcmVzb3VyY2VOYW1lXSA9IDE7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QocmVzb3VyY2VOYW1lICsgJy9teV9wZXJtcycsIHtpZHM6IExhenkoaWRzKS51bmlxdWUoKS50b0FycmF5KCl9LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RQZXJtaXNzaW9ucyhkYXRhLlBFUk1JU1NJT05TKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGFjdGl2ZXNbcmVzb3VyY2VOYW1lXVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgc2V0SW50ZXJ2YWwobGlua1VubGlua2VkLDUwKTtcbn07XG5cblxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIExpc3RDYWNoZXIoKXtcbiAgICB2YXIgZ290QWxsID0ge307XG4gICAgdmFyIGFza2VkID0ge307IC8vIG1hcCBvZiBhcnJheVxuICAgIHZhciBjb21wb3NpdGVBc2tlZCA9IHt9O1xuICAgIHZhciBjYXJ0ZXNpYW5Qcm9kdWN0MSA9IGZ1bmN0aW9uKHgseSxpc0FycmF5KXtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBpZiAoaXNBcnJheSkge1xuICAgICAgICAgICAgZm9yICh2YXIgYSBpbiB4KXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBiIGluIHkpe1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChMYXp5KFt4W2FdLHlbYl1dKS5mbGF0dGVuKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhIGluIHgpe1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGIgaW4geSl7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKFt4W2FdLHlbYl1dKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIHZhciBjYXJ0ZXNpYW5Qcm9kdWN0ID0gZnVuY3Rpb24oYXJyKXtcbiAgICAgICAgdmFyIGlzQXJyYXkgPSBmYWxzZTtcbiAgICAgICAgdmFyIHJldCA9IGFyclswXTsgXG4gICAgICAgIGZvciAodmFyIHggPSAxOyB4IDwgYXJyLmxlbmd0aDsgKyt4KXtcbiAgICAgICAgICAgIHJldCA9IGNhcnRlc2lhblByb2R1Y3QxKHJldCwgYXJyW3hdLCBpc0FycmF5KTtcbiAgICAgICAgICAgIGlzQXJyYXkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICAgIHZhciBleHBsb2RlRmlsdGVyID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgICAgIHZhciBwcm9kdWN0ID0gY2FydGVzaWFuUHJvZHVjdChMYXp5KGZpbHRlcikudmFsdWVzKCkudG9BcnJheSgpKTtcbiAgICAgICAgdmFyIGtleXMgPSBMYXp5KGZpbHRlcikua2V5cygpLnRvQXJyYXkoKTtcbiAgICAgICAgcmV0dXJuIHByb2R1Y3QubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFyIHIgPSB7fTtcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihhLG4pe1xuICAgICAgICAgICAgICAgIHJbYV0gPSB4W25dO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgfTtcbiAgICB2YXIgZmlsdGVyU2luZ2xlID0gZnVuY3Rpb24obW9kZWwsIGZpbHRlciwgdGVzdE9ubHkpe1xuICAgICAgICAvLyBMYXp5IGF1dG8gY3JlYXRlIGluZGV4ZXNcbiAgICAgICAgdmFyIG1vZGVsTmFtZSA9IG1vZGVsLm1vZGVsTmFtZTtcbiAgICAgICAgdmFyIGdldEluZGV4Rm9yID0gdGhpcy5nZXRJbmRleEZvcjtcbiAgICAgICAgdmFyIGtleXMgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHYsa2V5KXsgcmV0dXJuIFtrZXksIG1vZGVsTmFtZSArICcuJyArIGtleV07IH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIHZhciBpbmRleGVzID0gTGF6eShmaWx0ZXIpLmtleXMoKS5tYXAoZnVuY3Rpb24oa2V5KXsgcmV0dXJuIFtrZXksIGdldEluZGV4Rm9yKG1vZGVsTmFtZSwga2V5KV19KS50b09iamVjdCgpOyBcbiAgICAgICAgLy8gZmFrZSBmb3IgKGl0IHdpbGwgY3ljbGUgb25jZSlcbiAgICAgICAgZm9yICh2YXIgeCBpbiBmaWx0ZXIpe1xuICAgICAgICAgICAgLy8gZ2V0IGFza2VkIGluZGV4IGFuZCBjaGVjayBwcmVzZW5jZVxuICAgICAgICAgICAgdmFyIGRpZmZlcmVuY2UgPSBMYXp5KGZpbHRlclt4XSkuZGlmZmVyZW5jZShpbmRleGVzW3hdKS50b0FycmF5KCk7XG4gICAgICAgICAgICBpZiAoZGlmZmVyZW5jZS5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIC8vIGdlbmVyYXRlIG5ldyBmaWx0ZXJcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gTGF6eShbW3gsIGRpZmZlcmVuY2VdXSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgICAgICAvLyByZW1lbWJlciBhc2tlZFxuICAgICAgICAgICAgICAgIGlmICghdGVzdE9ubHkpXG4gICAgICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGluZGV4ZXNbeF0sIGRpZmZlcmVuY2UpO1xuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZSBmaWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSArICdcXG5PdXQgOicgKyBKU09OLnN0cmluZ2lmeShyZXQpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUgZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikgKyAnXFxuT3V0IDogbnVsbCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBjbGVhbkNvbXBvc2l0ZXMgPSBmdW5jdGlvbihtb2RlbCxmaWx0ZXIpe1xuICAgICAgICAvKipcbiAgICAgICAgICogY2xlYW4gY29tcG9zaXRlQXNrZWRcbiAgICAgICAgICovXG4gICAgICAgIC8vIGxhenkgY3JlYXRlIGNvbmRpdGlvbmFsIGFza2VkIGluZGV4XG4gICAgICAgIGlmICghKG1vZGVsLm5hbWUgaW4gY29tcG9zaXRlQXNrZWQpKSB7IGNvbXBvc2l0ZUFza2VkW21vZGVsLm5hbWVdID0gW10gfTtcbiAgICAgICAgdmFyIGluZGV4ID0gY29tcG9zaXRlQXNrZWRbbW9kZWwubmFtZV07XG4gICAgICAgIC8vIHNlYXJjaCBmb3IgYWxsIGVsZW1lbnRzIHdobyBoYXZlIHNhbWUgcGFydGlhbFxuICAgICAgICB2YXIgZmlsdGVyTGVuID0gTGF6eShmaWx0ZXIpLnNpemUoKTtcbiAgICAgICAgdmFyIGl0ZW1zID0gaW5kZXguZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlciwgJyAmJiAnLHRydWUpKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSl7IExhenkoaXRlbSkuc2l6ZSgpID4gZmlsdGVyTGVuIH0pO1xuLy8gICAgICAgIGNvbnNvbGUubG9nKCdkZWxldGluZyA6JyArIEpTT04uc3RyaW5naWZ5KGl0ZW1zKSk7XG4gICAgfTtcblxuICAgIHRoaXMuZmlsdGVyID0gZnVuY3Rpb24obW9kZWwsIGZpbHRlcil7XG4vLyAgICAgICAgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tLVxcbmZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpKTtcbiAgICAgICAgdmFyIG1vZGVsTmFtZSA9IG1vZGVsLm1vZGVsTmFtZTtcblxuICAgICAgICAvLyBpZiB5b3UgZmV0Y2ggYWxsIG9iamVjdHMgZnJvbSBzZXJ2ZXIsIHRoaXMgbW9kZWwgaGFzIHRvIGJlIG1hcmtlZCBhcyBnb3QgYWxsO1xuICAgICAgICB2YXIgZmlsdGVyTGVuICA9IExhenkoZmlsdGVyKS5zaXplKCk7XG4gICAgICAgIHN3aXRjaCAoZmlsdGVyTGVuKSB7XG4gICAgICAgICAgICBjYXNlIDAgOiB7XG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIG51bGwgb3IgYWxsXG4gICAgICAgICAgICAgICAgdmFyIGdvdCA9IGdvdEFsbFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIGdvdEFsbFttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGFza2VkKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGFza2VkW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ291dCA6IG51bGwgKGdvdCBhbGwpJyk7XG4gICAgICAgICAgICAgICAgLy8gY29uZGl0aW9uYWwgY2xlYW5cbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGNvbXBvc2l0ZUFza2VkKXsgXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZ290KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIDEgOiB7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IGZpbHRlclNpbmdsZS5jYWxsKHRoaXMsIG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgICAgIGNsZWFuQ29tcG9zaXRlcy5jYWxsKHRoaXMsIG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHZhciBzaW5nbGUgPSBMYXp5KGZpbHRlcikua2V5cygpLnNvbWUoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICB2YXIgZiA9IHt9O1xuICAgICAgICAgICAgZltrZXldID0gZmlsdGVyW2tleV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyU2luZ2xlLmNhbGwodGhzLCBtb2RlbCwgZiwgdHJ1ZSkgPT0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChzaW5nbGUpIHsgcmV0dXJuIG51bGwgfVxuICAgICAgICAvLyBsYXp5IGNyZWF0ZSBjb21wb3NpdGVBc2tlZFxuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gY29tcG9zaXRlQXNrZWQpKXsgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXSA9IFtdOyB9XG4gICAgICAgIC8vIGV4cGxvZGUgZmlsdGVyXG4gICAgICAgIHZhciBleHBsb2RlZCA9IGV4cGxvZGVGaWx0ZXIoZmlsdGVyKTtcbiAgICAgICAgLy8gY29sbGVjdCBwYXJ0aWFsc1xuICAgICAgICB2YXIgcGFydGlhbHMgPSBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIsICcgfHwgJyx0cnVlKSk7XG4gICAgICAgIC8vIGNvbGxlY3QgbWlzc2luZ3MgKGV4cGxvZGVkIC0gcGFydGlhbHMpXG4gICAgICAgIGlmIChwYXJ0aWFscy5sZW5ndGgpe1xuICAgICAgICAgICAgdmFyIGJhZCAgPSBbXTtcbiAgICAgICAgICAgIC8vIHBhcnRpYWwgZGlmZmVyZW5jZVxuICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBwYXJ0aWFscyl7XG4gICAgICAgICAgICAgICAgYmFkLnB1c2guYXBwbHkoYmFkLGV4cGxvZGVkLmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBwYXJ0aWFsc1t4XSwnICYmICcsIHRydWUpKSk7XG4gICAgICAgICAgICB9XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKCdleHBsb2RlZCAtIHBhcnRpYWwgOiAnICsgSlNPTi5zdHJpbmdpZnkoYmFkKSk7XG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBMYXp5KGV4cGxvZGVkKS5kaWZmZXJlbmNlKGJhZCkudG9BcnJheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gZXhwbG9kZWQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmaWx0ZXIgcGFydGlhbHNcbiAgICAgICAgaWYgKG1pc3NpbmdzLmxlbmd0aCl7XG4gICAgICAgICAgICBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLnB1c2guYXBwbHkoY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXSxtaXNzaW5ncyk7XG4gICAgICAgICAgICAvLyBhZ2dyZWdhdGUgbWlzc2luZ3NcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IExhenkoZmlsdGVyKS5rZXlzKCkubWFwKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IExhenkobWlzc2luZ3MpLnBsdWNrKGtleSkudW5pcXVlKCkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBba2V5LCByZXQubGVuZ3RoP3JldDpmaWx0ZXJba2V5XV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuLy8gICAgICAgICAgICBjb25zb2xlLmxvZygnb3V0IDogJyArIEpTT04uc3RyaW5naWZ5KG1pc3NpbmdzKSk7XG4gICAgICAgICAgICAvLyBjbGVhbiBjb25kaXRpb25hbFxuICAgICAgICAgICAgY2xlYW5Db21wb3NpdGVzKG1vZGVsLCBtaXNzaW5ncyk7XG4gICAgICAgICAgICByZXR1cm4gbWlzc2luZ3M7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SW5kZXhGb3IgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGZpZWxkTmFtZSl7XG4gICAgICAgIHZhciBpbmRleE5hbWUgPSBtb2RlbE5hbWUgKyAnLicgKyBmaWVsZE5hbWU7XG4gICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBhc2tlZCkpe1xuICAgICAgICAgICAgYXNrZWRbaW5kZXhOYW1lXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhc2tlZFtpbmRleE5hbWVdO1xuICAgIH1cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBNYW55VG9NYW55UmVsYXRpb24ocmVsYXRpb24sbTJtKXtcbiAgICB2YXIgaXRlbXMgPSBbXTtcbiAgICB0aGlzLmFkZCA9IGl0ZW1zLnB1c2guYmluZChpdGVtcyk7XG4gICAgdGhpcy5hZGQgPSBmdW5jdGlvbihpdGVtKXtcbiAgLy8gICAgICBjb25zb2xlLmxvZygnYWRkaW5nICcgKyBpdGVtKTtcbiAgICAgICAgaWYgKCEoTGF6eShpdGVtcykuZmluZChpdGVtKSkpe1xuICAgICAgICAgICAgaXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZ2V0MCA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgbTJtWzFdLmFzayhpZCk7XG4gICAgICAgIHJldHVybiBMYXp5KGl0ZW1zKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICByZXR1cm4geFswXSA9PT0gaWQ7XG4gICAgICAgIH0pLnBsdWNrKFwiMVwiKS50b0FycmF5KCk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0MSA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgbTJtWzBdLmFzayhpZCk7XG4gICAgICAgIHJldHVybiBMYXp5KGl0ZW1zKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICByZXR1cm4geFsxXSA9PT0gaWQ7XG4gICAgICAgIH0pLnBsdWNrKFwiMFwiKS50b0FycmF5KCk7XG4gICAgfTtcbiAgICB0aGlzWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWxhdGlvbi5pbmRleE5hbWUuc3BsaXQoJy8nKVsxXSldID0gdGhpcy5nZXQxO1xuICAgIHRoaXNbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlbGF0aW9uLmluZGV4TmFtZS5zcGxpdCgnLycpWzBdKV0gPSB0aGlzLmdldDA7XG5cbiAgICB0aGlzLmRlbCA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICB2YXIgbCA9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgdmFyIGlkeCA9IG51bGw7XG4gICAgICAgIGZvciAodmFyIGEgPSAwOyBhIDwgbDsgYSsrKXsgXG4gICAgICAgICAgICBpZiAoKGl0ZW1zW2FdWzBdID09PSBpdGVtWzBdKSAmJiAoaXRlbXNbYV1bMV0gPT09IGl0ZW1bMV0pKXtcbiAgICAgICAgICAgICAgICBpZHggPSBhO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpZHgpe1xuICAgICAgICAgICAgaXRlbXMuc3BsaWNlKGEsIDEpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdkZWxldGluZyAnLCBpdGVtKTtcbiAgICB9O1xufSIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhwcm90bywgcHJvcGVydHlOYW1lLGdldHRlciwgc2V0dGVyKXtcbiAgICB2YXIgZXZlbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDQpO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBcbiAgICBMYXp5KGV2ZW50cykuZWFjaChmdW5jdGlvbihldmVudCl7XG4gICAgICAgIHByb3RvLm9ybS5vbihldmVudCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmVzdWx0ID0ge307XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHZhciBwcm9wZXJ0eURlZiA9IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBjYWNoZWQoKXtcbiAgICAgICAgICAgIGlmICghKHRoaXMuaWQgaW4gcmVzdWx0KSl7XG4gICAgICAgICAgICAgICAgcmVzdWx0W3RoaXMuaWRdID0gZ2V0dGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpZiAoc2V0dGVyKXtcbiAgICAgICAgcHJvcGVydHlEZWZbJ3NldCddID0gZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9PSByZXN1bHRbdGhpcy5pZF0pe1xuICAgICAgICAgICAgICAgIHNldHRlci5jYWxsKHRoaXMsdmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlkIGluIHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHRbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgcHJvcGVydHlOYW1lLHByb3BlcnR5RGVmKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKGRhdGEpe1xuICAgIHRoaXMucmVzb3VyY2UgPSBkYXRhLl9yZXNvdXJjZTtcbiAgICB0aGlzLmZvcm1JZHggPSBkYXRhLmZvcm1JZHg7XG4gICAgdGhpcy5maWVsZHMgPSBkYXRhLmVycm9ycztcbn1cbnZhciBiYXNlT1JNID0gZnVuY3Rpb24ob3B0aW9ucywgZXh0T1JNKXtcbiAgICBcbiAgICAvLyBjcmVhdGluZyByZXdoZWVsIGNvbm5lY3Rpb25cbiAgICBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKXtcbiAgICAgICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgcmVXaGVlbENvbm5lY3Rpb24ob3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmNvbnN0cnVjdG9yID09PSB1dGlscy5yZVdoZWVsQ29ubmVjdGlvbil7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gb3B0aW9ucztcbiAgICB9XG4gICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICBjb25uZWN0aW9uLm9uKCdjb25uZWN0ZWQnLCBmdW5jdGlvbigpeyBcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMub24gPSBjb25uZWN0aW9uLm9uO1xuICAgIHRoaXMuZW1pdCA9IGNvbm5lY3Rpb24uZW1pdDtcbiAgICB0aGlzLnVuYmluZCA9IGNvbm5lY3Rpb24udW5iaW5kO1xuICAgIHRoaXMub25jZSA9IGNvbm5lY3Rpb24ub25jZTtcbiAgICB0aGlzLiRwb3N0ID0gY29ubmVjdGlvbi4kcG9zdC5iaW5kKGNvbm5lY3Rpb24pO1xuXG4gICAgLy8gaGFuZGxpbmcgd2Vic29ja2V0IGV2ZW50c1xuICAgIHRoaXMub24oJ3dzLWNvbm5lY3RlZCcsZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmluZm8oJ1dlYnNvY2tldCBjb25uZWN0ZWQnKTtcbiAgICAgICAgLy8gYWxsIGpzb24gZGF0YSBoYXMgdG8gYmUgcGFyc2VkIGJ5IGdvdERhdGFcbiAgICAgICAgd3Mub25NZXNzYWdlSnNvbihXMlBSRVNPVVJDRS5nb3REYXRhLmJpbmQoVzJQUkVTT1VSQ0UpKTtcbiAgICAgICAgLy9cbiAgICAgICAgd3Mub25NZXNzYWdlVGV4dChmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnV1MgbWVzc2FnZSA6ICcgKyBtZXNzYWdlKVxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLm9uKCd3cy1kaXNjb25uZWN0ZWQnLCBmdW5jdGlvbih3cyl7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dlYnNvY2tldCBkaXNjb25uZWN0ZWQnKVxuICAgIH0pO1xuICAgIHRoaXMub24oJ2Vycm9yLWpzb24tNDA0JyxmdW5jdGlvbihlcnJvcix1cmwsIHNlbnREYXRhLCB4aHIpeyBcbiAgICAgICAgY29uc29sZS5lcnJvcignSlNPTiBlcnJvciAnLCBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xuICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW3VybC5zcGxpdCgnLycpWzBdXTtcbiAgICB9KTtcbiAgICB0aGlzLm9uKCdyZWFsdGltZS1tZXNzYWdlLWpzb24nLCBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShtZXNzYWdlKTtcbiAgICB9KTtcblxuICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIFcyUFJFU09VUkNFID0gdGhpcztcbiAgICB2YXIgSURCID0ge2F1dGhfZ3JvdXAgOiBMYXp5KHt9KX07IC8vIHRhYmxlTmFtZSAtPiBkYXRhIGFzIEFycmF5XG4gICAgdmFyIElEWCA9IHt9OyAvLyB0YWJsZU5hbWUgLT4gTGF6eShpbmRleEJ5KCdpZCcpKSAtPiBJREJbZGF0YV1cbiAgICB2YXIgUkVWSURYID0ge307IC8vIHRhYmxlTmFtZSAtPiBmaWVsZE5hbWUgLT4gTGF6eS5ncm91cEJ5KCkgLT4gSURCW0RBVEFdXG4gICAgdmFyIGJ1aWxkZXJIYW5kbGVycyA9IHt9O1xuICAgIHZhciBidWlsZGVySGFuZGxlclVzZWQgPSB7fTtcbiAgICB2YXIgcGVyc2lzdGVudEF0dHJpYnV0ZXMgPSB7fTtcbiAgICB2YXIgZXZlbnRIYW5kbGVycyA9IHt9O1xuICAgIHZhciBwZXJtaXNzaW9uV2FpdGluZyA9IHt9O1xuICAgIHZhciBtb2RlbENhY2hlID0ge307XG4gICAgdmFyIGZhaWxlZE1vZGVscyA9IHt9O1xuICAgIHZhciB3YWl0aW5nQ29ubmVjdGlvbnMgPSB7fSAvLyBhY3R1YWwgY29ubmVjdGlvbiB3aG8gaSdtIHdhaXRpbmcgZm9yXG4gICAgdmFyIGxpc3RDYWNoZSA9IG5ldyBMaXN0Q2FjaGVyKExhenkpO1xuICAgIHZhciBsaW5rZXIgPSBuZXcgQXV0b0xpbmtlcih3YWl0aW5nQ29ubmVjdGlvbnMsSURCLCB0aGlzLCBsaXN0Q2FjaGUpO1xuLyogICAgd2luZG93LmxsID0gbGlua2VyO1xuICAgIHdpbmRvdy5sYyA9IGxpc3RDYWNoZTtcbiovXG4gICAgdGhpcy52YWxpZGF0aW9uRXZlbnQgPSB0aGlzLm9uKCdlcnJvci1qc29uLTUxMycsIGZ1bmN0aW9uKGRhdGEsIHVybCwgc2VudERhdGEsIHhocil7XG4gICAgICAgIGlmIChjdXJyZW50Q29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIpe1xuICAgICAgICAgICAgY3VycmVudENvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyKG5ldyBWYWxpZGF0aW9uRXJyb3IoZGF0YSkpO1xuICAgICAgICB9XG4gICAgfSlcblxuICAgIHZhciBnZXRJbmRleCA9IGZ1bmN0aW9uIChpbmRleE5hbWUpIHtcbiAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJREIpXG4gICAgICAgICAgICByZXR1cm4gSURCW2luZGV4TmFtZV07XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSURCW2luZGV4TmFtZV0gPSBMYXp5KHt9KTtcbiAgICAgICAgICAgIHJldHVybiBJREJbaW5kZXhOYW1lXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGdldFVubGlua2VkID0gZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICBpZiAoaW5kZXhOYW1lIGluIFVOTElOS0VEKVxuICAgICAgICAgICAgcmV0dXJuIFVOTElOS0VEW2luZGV4TmFtZV07XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgVU5MSU5LRURbaW5kZXhOYW1lXSA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIFVOTElOS0VEW2luZGV4TmFtZV07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gUGVybWlzc2lvblRhYmxlKGlkLCBrbGFzcywgcGVybWlzc2lvbnMpIHtcbiAgICAgICAgLy8gY3JlYXRlIFBlcm1pc3Npb25UYWJsZSBjbGFzc1xuICAgICAgICB0aGlzLmtsYXNzID0ga2xhc3M7XG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICBmb3IgKHZhciBrIGluIHBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICB0aGlzLnB1c2guYXBwbHkodGhpcywgW2ssIHBlcm1pc3Npb25zW2tdXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgUGVybWlzc2lvblRhYmxlLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIC8vIHNhdmUgT2JqZWN0IHRvIHNlcnZlclxuICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgIHBlcm1pc3Npb25zOiBMYXp5KHRoaXMucGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeFswXS5pZCwgeFsxXV1cbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KClcbiAgICAgICAgfTtcbiAgICAgICAgZGF0YS5pZCA9IHRoaXMuaWQ7XG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSB0aGlzLmtsYXNzLm1vZGVsTmFtZTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5rbGFzcy5tb2RlbE5hbWUgKyAnL3NldF9wZXJtaXNzaW9ucycsIGRhdGEsIGZ1bmN0aW9uIChteVBlcm1zLCBhLCBiLCByZXEpIHtcbiAgICAgICAgICAgIGNiKG15UGVybXMpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIFBlcm1pc3Npb25UYWJsZS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChncm91cF9pZCwgcGVybWlzc2lvbkxpc3QpIHtcbiAgICAgICAgdmFyIHAgPSBMYXp5KHBlcm1pc3Npb25MaXN0KTtcbiAgICAgICAgdmFyIHBlcm1zID0gTGF6eSh0aGlzLmtsYXNzLmFsbFBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBbeCwgcC5jb250YWlucyh4KV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgdmFyIGwgPSBMYXp5KHRoaXMucGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0uaWRcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChsLmNvbnRhaW5zKGdyb3VwX2lkKSlcbiAgICAgICAgICAgIHRoaXMucGVybWlzc2lvbnNbbC5pbmRleE9mKGdyb3VwX2lkKV1bMV0gPSBwZXJtcztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5wZXJtaXNzaW9ucy5wdXNoKFtJREIuYXV0aF9ncm91cC5nZXQoZ3JvdXBfaWQpLCBwZXJtc10pO1xuICAgIH07XG5cbiAgICAvLyBjcmVhdGVzIGR5bmFtaWNhbCBtb2RlbHNcbiAgICB2YXIgbWFrZU1vZGVsQ2xhc3MgPSBmdW5jdGlvbiAobW9kZWwpIHtcbiAgICAgICAgdmFyIF9tb2RlbCA9IG1vZGVsO1xuICAgICAgICB2YXIgZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpO1xuICAgICAgICBpZiAobW9kZWwucHJpdmF0ZUFyZ3MpIHtcbiAgICAgICAgICAgIGZpZWxkcyA9IGZpZWxkcy5tZXJnZShtb2RlbC5wcml2YXRlQXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbW9kZWwtZGVmaW5pdGlvbicsIG1vZGVsLCBnZXRJbmRleChtb2RlbC5uYW1lKSk7XG4gICAgICAgIC8vIGdldHRpbmcgZmllbGRzIG9mIHR5cGUgZGF0ZSBhbmQgZGF0ZXRpbWVcbi8qXG4gICAgICAgIHZhciBEQVRFRklFTERTID0gZmllbGRzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGdldHRpbmcgYm9vbGVhbiBmaWVsZHNcbiAgICAgICAgdmFyIEJPT0xGSUVMRFMgPSBmaWVsZHMuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHgudHlwZSA9PSAnYm9vbGVhbicpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGJvb2xlYW5zIGFuZCBkYXRldGltZXMgc3RvcmFnZSBleHRlcm5hbCBcbiAgICAgICAgTU9ERUxfREFURUZJRUxEU1ttb2RlbC5uYW1lXSA9IERBVEVGSUVMRFM7XG4gICAgICAgIE1PREVMX0JPT0xGSUVMRFNbbW9kZWwubmFtZV0gPSBCT09MRklFTERTO1xuKi9cbiAgICAgICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdmFyIGZ1bmNTdHJpbmcgPSBcImlmICghcm93KSB7IHJvdyA9IHt9fTtcXG5cIjtcbiAgICAgICAgZnVuY1N0cmluZyArPSBtb2RlbC5yZWZlcmVuY2VzLm1hcChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICByZXR1cm4gJ3RoaXMuXycgKyBmaWVsZC5pZCArICcgPSByb3cuJyArIGZpZWxkLmlkICsgJzsnO1xuICAgICAgICB9KS5qb2luKCc7XFxuJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBkYXRlZmllbGQgY29udmVyc2lvblxuICAgICAgICBmdW5jU3RyaW5nICs9IGZpZWxkcy5tYXAoZnVuY3Rpb24gKHgsaykge1xuICAgICAgICAgICAgaWYgKCh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gcm93LicgKyBrICsgJz9uZXcgRGF0ZShyb3cuJyArIGsgKyAnICogMTAwMCAtICcgKyB1dGlscy50ek9mZnNldCArICcpOm51bGw7XFxuJzsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHgudHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gKHJvdy4nICsgayArICcgPT09IFwiVFwiKSB8fCAocm93LicgKyBrICsgJyA9PT0gdHJ1ZSk7XFxuJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IHJvdy4nICsgayArICc7XFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudG9TdHJpbmcoJ1xcbicpOyArICdcXG4nO1xuXG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gXCJpZiAocGVybWlzc2lvbnMpIHt0aGlzLl9wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zICYmIExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkgeyByZXR1cm4gW3gsIHRydWVdIH0pLnRvT2JqZWN0KCk7fVwiXG5cbiAgICAgICAgXG4gICAgICAgIC8vIG1hc3RlciBjbGFzcyBmdW5jdGlvblxuICAgICAgICB2YXIgS2xhc3MgPSBuZXcgRnVuY3Rpb24oJ3JvdycsICdwZXJtaXNzaW9ucycsZnVuY1N0cmluZylcblxuICAgICAgICBLbGFzcy5wcm90b3R5cGUub3JtID0gZXh0T1JNO1xuICAgICAgICBLbGFzcy5yZWZfdHJhbnNsYXRpb25zID0ge307XG4gICAgICAgIEtsYXNzLm1vZGVsTmFtZSA9IG1vZGVsLm5hbWU7XG4gICAgICAgIEtsYXNzLnJlZmVyZW5jZXMgPSBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLnBsdWNrKCdpZCcpLnRvQXJyYXkoKTtcblxuICAgICAgICBLbGFzcy5pbnZlcnNlX3JlZmVyZW5jZXMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAvLyBtYW5hZ2luZyByZWZlcmVuY2VzIHdoZXJlIFxuICAgICAgICAgICAgcmV0dXJuIHguYnkgKyAnXycgKyB4LmlkICsgJ19zZXQnXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5yZWZlcmVudHMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW3guYnksIHguaWRdXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5maWVsZHNPcmRlciA9IG1vZGVsLmZpZWxkT3JkZXI7XG4gICAgICAgIEtsYXNzLmFsbFBlcm1pc3Npb25zID0gbW9kZWwucGVybWlzc2lvbnM7XG5cbiAgICAgICAgLy8gcmVkZWZpbmluZyB0b1N0cmluZyBtZXRob2RcbiAgICAgICAgaWYgKExhenkobW9kZWwucmVwcmVzZW50YXRpb24pLnNpemUoKSl7XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9TdHJpbmcgPSBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzLicgKyBMYXp5KG1vZGVsLnJlcHJlc2VudGF0aW9uKS50b1N0cmluZygnICsgXCIgXCIgKyB0aGlzLicpKTtcbiAgICAgICAgfVxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9VcHBlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyByZWRlZmluZSB0byBVcHBlckNhc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKTtcbiAgICAgICAgfTtcbiAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9Mb3dlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gZGVsZXRlIGluc3RhbmNlIGZyb20gc2VydmVyXG4gICAgICAgICAgICByZXR1cm4gZXh0T1JNLmRlbGV0ZSh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSwgW3RoaXMuaWRdKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBwZXJtaXNzaW9uIGdldHRlciBwcm9wZXJ0eVxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoS2xhc3MucHJvdG90eXBlLCAncGVybWlzc2lvbnMnLCB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcGVybWlzc2lvbnMpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLnBlcm1pc3Npb25zW3RoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lXS5hc2sodGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gZ2V0dGluZyBmdWxsIHBlcm1pc3Npb24gdGFibGUgZm9yIGFuIG9iamVjdFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuYWxsX3Blcm1zID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICB2YXIgb2JqZWN0X2lkID0gdGhpcy5pZDtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9hbGxfcGVybXMnLCB7aWQ6IHRoaXMuaWR9LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBwZXJtaXNzaW9ucyA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgdW5rbm93bl9ncm91cHMgPSBMYXp5KHBlcm1pc3Npb25zKS5wbHVjaygnZ3JvdXBfaWQnKS51bmlxdWUoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnICsgeFxuICAgICAgICAgICAgICAgIH0pLmRpZmZlcmVuY2UoSURCLmF1dGhfZ3JvdXAua2V5cygpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgTGF6eShwZXJtaXNzaW9ucykuZ3JvdXBCeShmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5ncm91cF9pZFxuICAgICAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBlZFtrXSA9IExhenkodikucGx1Y2soJ25hbWUnKS50b0FycmF5KClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKG5ldyBQZXJtaXNzaW9uVGFibGUob2JqZWN0X2lkLCBLbGFzcywgZ3JvdXBlZCkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKHVua25vd25fZ3JvdXBzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ2V0KCdhdXRoX2dyb3VwJyx1bmtub3duX2dyb3VwcyxjYWxsKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGNhbGwoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIHZhciBvID0gdGhpcy5hc1JhdygpO1xuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IEtsYXNzLmZpZWxkcztcbiAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICB2YXIgbW9kZWxOYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICBpZiAoYXJncykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGFyZyBpbiBhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG9bYXJnXSA9IGFyZ3NbYXJnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBlbGltaW5hdGUgdW53cml0YWJsZXNcbiAgICAgICAgICAgIExhenkoS2xhc3MuZmllbGRzT3JkZXIpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWZpZWxkc1t4XS53cml0YWJsZTtcbiAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24oZmllbGROYW1lKXtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGROYW1lIGluIG8pIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG9bZmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgKElEID8gJy9wb3N0JyA6ICcvcHV0JyksIG8pO1xuICAgICAgICAgICAgaWYgKGFyZ3MgJiYgKGFyZ3MuY29uc3RydWN0b3IgPT09IEZ1bmN0aW9uKSl7XG4gICAgICAgICAgICAgICAgLy8gcGxhY2luZyBjYWxsYmFjayBpbiBhIGNvbW1vbiBwbGFjZVxuICAgICAgICAgICAgICAgIHByb21pc2UuY29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIgPSBhcmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2VcbiAgICAgICAgfTtcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb2JqID0gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy5hc1JhdygpKTtcbiAgICAgICAgICAgIG9iai5fcGVybWlzc2lvbnMgPSB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYnVpbGRpbmcgc2VyaWFsaXphdGlvbiBmdW5jdGlvblxuICAgICAgICB2YXIgYXNyID0gJ3JldHVybiB7XFxuJyArIExhenkobW9kZWwucmVmZXJlbmNlcykubWFwKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHJldHVybiBmaWVsZC5pZCArICcgOiB0aGlzLl8nICsgZmllbGQuaWQ7XG4gICAgICAgIH0pLmNvbmNhdChmaWVsZHMubWFwKGZ1bmN0aW9uICh4LGspIHtcbiAgICAgICAgICAgIGlmICgoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogKHRoaXMuJyArIGsgKyAnPyhNYXRoLnJvdW5kKHRoaXMuJyArIGsgKyAnLmdldFRpbWUoKSAtIHRoaXMuJyArIGsgKyAnLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCkgLyAxMDAwKTpudWxsKSc7IFxuICAgICAgICAgICAgfSBlbHNlIGlmICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogdGhpcy4nICsgayArICc/XCJUXCI6XCJGXCInO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiB0aGlzLicgKyBrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSkudG9TdHJpbmcoJyxcXG4nKSArICd9Oyc7XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5hc1JhdyA9IG5ldyBGdW5jdGlvbihhc3IpO1xuXG4gICAgICAgIEtsYXNzLnNhdmVNdWx0aSA9IGZ1bmN0aW9uIChvYmplY3RzLCBjYiwgc2NvcGUpIHtcbiAgICAgICAgICAgIHZhciByYXcgPSBbXTtcbiAgICAgICAgICAgIHZhciBkZWxldGFibGUgPSBMYXp5KEtsYXNzLmZpZWxkcylcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAheC53cml0YWJsZVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnBsdWNrKCdpZCcpXG4gICAgICAgICAgICAgICAgLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIExhenkob2JqZWN0cylcbiAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmFzUmF3KClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIExhenkoZGVsZXRhYmxlKS5lYWNoKGZ1bmN0aW9uICh5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgeFt5XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJhdy5wdXNoKHgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lLCAncHV0Jywge211bHRpcGxlOiByYXcsIGZvcm1JZHggOiBXMlBSRVNPVVJDRS5mb3JtSWR4Kyt9LCBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGVsZW1zKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFiID0gSURCW0tsYXNzLm1vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgdmFyIG9ianMgPSBMYXp5KGVsZW1zW0tsYXNzLm1vZGVsTmFtZV0ucmVzdWx0cykucGx1Y2soJ2lkJykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YWIuZ2V0KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICAgICAgICBjYihvYmpzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBzY29wZSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmICgnZXh0cmFfdmVyYnMnIGluIG1vZGVsKVxuICAgICAgICAgICAgTGF6eShtb2RlbC5leHRyYV92ZXJicykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHZhciBmdW5jTmFtZSA9IHhbMF07XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSB4WzFdO1xuICAgICAgICAgICAgICAgIHZhciBkZGF0YSA9ICdkYXRhID0ge2lkIDogdGhpcy5pZCc7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBkZGF0YSArPSAnLCAnICsgTGF6eShhcmdzKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geCArICcgOiAnICsgeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJywnKTtcbiAgICAgICAgICAgICAgICBkZGF0YSArPSAnfTsnO1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCgnY2InKTtcbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbZnVuY05hbWVdID0gbmV3IEZ1bmN0aW9uKGFyZ3MsIGRkYXRhICsgJ1cyUy5XMlBfUE9TVCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSxcIicgKyBmdW5jTmFtZSArICdcIiwgZGF0YSxmdW5jdGlvbihkYXRhLHN0YXR1cyxoZWFkZXJzLHgpeycgK1xuICAgICAgICAgICAgICAgICAgICAndHJ5e1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAnICAgaWYgKCFoZWFkZXJzKFwibm9tb2RlbFwiKSkge3dpbmRvdy5XMlMuZ290RGF0YShkYXRhLGNiKTt9XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICcgICBlbHNlIHtpZiAoY2IpIHtjYihkYXRhKX19XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICd9IGNhdGNoKGUpe1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAnaWYgKGNiKSB7Y2IoZGF0YSk7fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfSk7XFxuJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKCdwcml2YXRlQXJncycgaW4gbW9kZWwpIHtcbiAgICAgICAgICAgIEtsYXNzLnByaXZhdGVBcmdzID0gTGF6eShtb2RlbC5wcml2YXRlQXJncykua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgdHJ1ZV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmVQQSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgdmFyIFQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBvbyA9IHtpZDogdGhpcy5pZH07XG4gICAgICAgICAgICAgICAgdmFyIFBBID0gdGhpcy5jb25zdHJ1Y3Rvci5wcml2YXRlQXJncztcbiAgICAgICAgICAgICAgICB2YXIgRnMgPSB0aGlzLmNvbnN0cnVjdG9yLmZpZWxkcztcbiAgICAgICAgICAgICAgICB2YXIgdCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG8pLmFzUmF3KCk7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkSWR4ID0gTGF6eShQQSkua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIEZzW3hdXVxuICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgTGF6eShvKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoayBpbiBQQSkgJiYgZmllbGRJZHhba10ud3JpdGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9vW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9zYXZlUEEnLCBvbywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG9vKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBUW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbW9kZWxDYWNoZVtLbGFzcy5tb2RlbE5hbWVdID0gS2xhc3M7XG4gICAgICAgIC8vIGFkZGluZyBpZCB0byBmaWVsZHNcbiAgICAgICAgZm9yICh2YXIgZiBpbiBtb2RlbC5maWVsZHMpIHtcbiAgICAgICAgICAgIG1vZGVsLmZpZWxkc1tmXS5pZCA9IGY7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MuZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpLmNvbmNhdChMYXp5KG1vZGVsLnByaXZhdGVBcmdzKSkuY29uY2F0KExhenkobW9kZWwucmVmZXJlbmNlcykudGFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICB4LnR5cGUgPSB4LnR5cGUgfHwgJ3JlZmVyZW5jZSdcbiAgICAgICAgfSkpLmluZGV4QnkoJ2lkJykudG9PYmplY3QoKTtcbiAgICAgICAgLy8gc2V0dGluZyB3aWRnZXRzIGZvciBmaWVsZHNcbiAgICAgICAgTGF6eShLbGFzcy5maWVsZHMpLmVhY2goZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgaWYgKCFmaWVsZC53aWRnZXQpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZC50eXBlID09PSAncmVmZXJlbmNlJyl7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9ICdjaG9pY2VzJ1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9IGZpZWxkLnR5cGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAobWFueSB0byBvbmUpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGV4dF9yZWYgPSByZWYudG87XG4gICAgICAgICAgICB2YXIgbG9jYWxfcmVmID0gJ18nICsgcmVmLmlkO1xuICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5pZCxmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZXh0X3JlZiBpbiBJREIpKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKGV4dF9yZWYsZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rZXIubWFpbkluZGV4W2V4dF9yZWZdLmFzayh0aHNbbG9jYWxfcmVmXSx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSAoZXh0X3JlZiBpbiBJREIpICYmIHRoaXNbbG9jYWxfcmVmXSAmJiBJREJbZXh0X3JlZl0uZ2V0KHRoaXNbbG9jYWxfcmVmXSk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgJiYgKGV4dF9yZWYgaW4gbGlua2VyLm1haW5JbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYXNraW5nIHRvIGxpbmtlclxuICAgICAgICAgICAgICAgICAgICBsaW5rZXIubWFpbkluZGV4W2V4dF9yZWZdLmFzayh0aGlzW2xvY2FsX3JlZl0sdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1dGlscy5tb2NrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSAhPSBleHRfcmVmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgY2FuIGFzc2lnbiBvbmx5ICcgKyBleHRfcmVmICsgJyB0byAnICsgcmVmLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzW2xvY2FsX3JlZl0gPSB2YWx1ZS5pZDtcbiAgICAgICAgICAgIH0sICduZXctJyArIGV4dF9yZWYsICdkZWxldGVkLScgKyBleHRfcmVmLCd1cGRhdGVkLScgKyBleHRfcmVmLCAnbmV3LW1vZGVsLScgKyBleHRfcmVmKTtcblxuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlZi5pZCldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRPUk0uZ2V0KGV4dF9yZWYsdGhpc1tsb2NhbF9yZWZdKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAob25lIHRvIG1hbnkpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZWRCeSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gcmVmLmJ5ICsgJy4nICsgcmVmLmlkO1xuICAgICAgICAgICAgdmFyIHByb3BlcnR5TmFtZSA9IHJlZi5ieSArICdfJyArIHV0aWxzLnBsdXJhbGl6ZShyZWYuaWQpO1xuICAgICAgICAgICAgdmFyIHJldkluZGV4ID0gcmVmLmJ5O1xuICAgICAgICAgICAgaWYgKEtsYXNzLnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJ5ZWQgdG8gcmVkZWZpbmUgcHJvcGVydHkgJyArIHByb3BlcnR5TmFtZSArICdzJyArICcgZm9yICcgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcHJvcGVydHlOYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSAocmV2SW5kZXggaW4gSURCKSA/IFJFVklEWFtpbmRleE5hbWVdLmdldCh0aGlzLmlkICsgJycpOm51bGw7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtlci5mb3JlaWduS2V5c1tpbmRleE5hbWVdLmFzayh0aGlzLmlkLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgIH0sIG51bGwsICduZXctJyArIHJldkluZGV4LCAndXBkYXRlZC0nICsgcmV2SW5kZXgsICdkZWxldGVkLScgKyByZXZJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShyZWYuYnkpKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdHMgPSB7fTtcbiAgICAgICAgICAgICAgICBvcHRzW3JlZi5pZF0gPSBbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5xdWVyeShyZWYuYnksb3B0cyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2J1aWxkaW5nIHJlZmVyZW5jZSB0byAobWFueSB0byBtYW55KSBmaWVsZHNcbiAgICAgICAgaWYgKG1vZGVsLm1hbnlUb01hbnkpIHtcbiAgICAgICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHJlZi5pbmRleE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcmVmLmZpcnN0PyAwIDogMTtcbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsTmFtZSA9IHJlZi5tb2RlbDtcbi8vICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBnZXRJbmRleChvbW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgZ2V0dGVyID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyAoMSAtIGZpcnN0KV07XG5cbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcmVmLm1vZGVsICsgJ3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZXQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0ID0gZ2V0SW5kZXgob21vZGVsTmFtZSkuZ2V0LmJpbmQoSURCW29tb2RlbE5hbWVdKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcyAmJiBnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0ID0gTGF6eShpZHMpLm1hcChnZXQpLmZpbHRlcih1dGlscy5ib29sKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgICAgICB9LCBudWxsLCAncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUsICdyZWNlaXZlZC0nICsgb21vZGVsTmFtZSk7XG5cbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShvbW9kZWxOYW1lKSldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLmdldE0yTShpbmRleE5hbWUsIFt0aHMuaWRdLCBmaXJzdCxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGdldHRlcih0aHMuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChvbW9kZWxOYW1lLCB7aWQgOiBpZHN9LG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gSURCW29tb2RlbE5hbWVdLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KFtdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgICAgIEtsYXNzLmZpZWxkc1t1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICByZWFkYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ00yTScsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcnM6IFtdXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS51bmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IFtbSUQsIGluc3RhbmNlLmlkXV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL2RlbGV0ZScsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUubGlua1JlZmVyZW5jZSA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lID09ICdBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZXMgPSBpbnN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBpbnN0YW5jZXNbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJTkRFWF9NMk0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZnMgPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykuZGlmZmVyZW5jZShMYXp5KElOREVYX00yTVtpbmRleE5hbWVdWzBdLmdldCh0aGlzLmlkKSkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBvbW9kZWwgKyAnLycgKyBLbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlZnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkocmVmcykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtJRCwgeF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUF9QT1NUKEtsYXNzLm1vZGVsTmFtZSwgb21vZGVsICsgJ3MvcHV0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGluZGV4TmFtZSBpbiBsaW5rZXIubTJtSW5kZXgpICYmIExhenkobGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKG9tb2RlbCldKGluc3RhbmNlLmlkKSkuZmluZCh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL3B1dCcsIHtjb2xsZWN0aW9uOiBbW3RoaXMuaWQsIGluc3RhbmNlLmlkXV19KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ25ldy1tb2RlbCcsIEtsYXNzKTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbmV3LW1vZGVsLScgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICByZXR1cm4gS2xhc3M7XG4gICAgfTtcblxuICAgIHRoaXMuZ290RGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBjYWxsQmFjaykge1xuICAgICAgICAvLyByZWNlaXZlIGFsbCBkYXRhIGZyb20gZXZlcnkgZW5kIHBvaW50XG4gICAgICAgIGNvbnNvbGUuaW5mbygnZ290RGF0YScpO1xuICAgICAgICBpZiAodHlwZW9mKGRhdGEpID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGF0YSAnICsgZGF0YSArICcgcmVmdXNlZCBmcm9tIGdvdERhdGEoKScpO1xuICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNsZWFuIGRhdGEgZnJvbSByZWxhdGlvbnMgYW5kIHBlcm1pc3Npb25zIGZvciB1c2luZyBpdCBhZnRlciBtb2RlbCBwYXJzaW5nXG4gICAgICAgIGlmICgnX2V4dHJhJyBpbiBkYXRhKXsgZGVsZXRlIGRhdGEuX2V4dHJhIH1cbiAgICAgICAgdmFyIFRPT05FID0gZGF0YS5UT09ORTtcbiAgICAgICAgdmFyIFRPTUFOWSA9IGRhdGEuVE9NQU5ZO1xuICAgICAgICB2YXIgTUFOWVRPTUFOWSA9IGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgdmFyIFBFUk1JU1NJT05TID0gZGF0YS5QRVJNSVNTSU9OUztcbiAgICAgICAgdmFyIFBBID0gZGF0YS5QQTtcbiAgICAgICAgZGVsZXRlIGRhdGEuVE9PTkU7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBBO1xuICAgICAgICBpZiAoIVBBKSB7IFBBID0ge307IH1cblxuICAgICAgICAvLyBjbGVhbmluZyBmcm9tIHVzZWxlc3MgZGVsZXRlZCBkYXRhXG4gICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLmZpbHRlcihmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgcmV0dXJuICghKCdkZWxldGVkJyBpbiB2KSB8fCAoKGsgaW4gbW9kZWxDYWNoZSkpKTtcbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgnbTJtJyBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbTJtID0gZGF0YS5tMm07XG4gICAgICAgICAgICBkZWxldGUgZGF0YVsnbTJtJ107XG4gICAgICAgIH1cbiAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uIChkYXRhLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsQ2xhc3MgPSBtb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXN1bHRzICYmIChkYXRhLnJlc3VsdHMubGVuZ3RoID4gMCkgJiYgKGRhdGEucmVzdWx0c1swXS5jb25zdHJ1Y3RvciA9PSBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMYXp5KG1vZGVsQ2xhc3MuZmllbGRzT3JkZXIpLnppcCh4KS50b09iamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBMYXp5KGRhdGEucmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgdmFyIGRlbGV0ZWQgPSBkYXRhLmRlbGV0ZWQ7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBQQSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgTVBBID0gUEFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShyZXN1bHRzKS5lYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmQuaWQgaW4gTVBBKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShNUEFbcmVjb3JkLmlkXSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGluZGV4aW5nIHJlZmVyZW5jZXMgYnkgaXRzIElEXG4gICAgICAgICAgICAgICAgdmFyIGl0YWIgPSBnZXRJbmRleChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZSA9IGl0YWIuc291cmNlO1xuXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGVkLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGFibGVbeF07XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuLypcbiAgICAgICAgICAgICAgICBMYXp5KGRlbGV0ZWQpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgIH0pO1xuKi9cbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gcmVzdWx0cy5pbmRleEJ5KCdpZCcpO1xuICAgICAgICAgICAgICAgIHZhciBpayA9IGlkeC5rZXlzKCk7XG4gICAgICAgICAgICAgICAgdmFyIG5uZXcgPSBpay5kaWZmZXJlbmNlKGl0YWIua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWQgPSBpay5kaWZmZXJlbmNlKG5uZXcpO1xuICAgICAgICAgICAgICAgIC8vIHJlbW92aW5nIG9sZCBpZGVudGljYWwgdmFsdWVzXG4gICAgICAgICAgICAgICAgdXBkYXRlZCA9IHVwZGF0ZWQuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhdXRpbHMuc2FtZUFzKGlkeC5nZXQoeCksIGl0YWIuZ2V0KHgpLmFzUmF3KCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIGNsYXNzaWZ5IHJlY29yZHNcbiAgICAgICAgICAgICAgICB2YXIgcGVybXMgPSBkYXRhLnBlcm1pc3Npb25zID8gTGF6eShkYXRhLnBlcm1pc3Npb25zKSA6IExhenkoe30pO1xuICAgICAgICAgICAgICAgIHZhciBuZXdPYmplY3RzID0gbm5ldy5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCksIHBlcm1zLmdldCh4KSlcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vLy8gY2xhc3NpZnlpbmcgdXBkYXRlZFxuICAgICAgICAgICAgICAgIC8vdmFyIHVwZGF0ZWRPYmplY3RzID0gdXBkYXRlZC5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkscGVybXMuZ2V0KHgpKX0pO1xuICAgICAgICAgICAgICAgIC8vdmFyIHVvID0gdXBkYXRlZE9iamVjdHMudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIC8vdXBkYXRlZE9iamVjdHMgPSBMYXp5KHVvKS5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIFt4LHRhYmxlW3guaWRdXX0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGluZyBzaW5nbGUgb2JqZWN0c1xuICAgICAgICAgICAgICAgIHZhciBjaGFuZ2VkID0gW107XG4vLyAgICAgICAgICAgICAgICB2YXIgREFURUZJRUxEUyA9IE1PREVMX0RBVEVGSUVMRFNbbW9kZWxOYW1lXTtcbi8vICAgICAgICAgICAgICAgIHZhciBCT09MRklFTERTID0gTU9ERUxfQk9PTEZJRUxEU1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSXRlbSA9IGl0YWIuZ2V0KHgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ29weSA9IG9sZEl0ZW0uY29weSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3SXRlbSA9IG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkpO1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG1vZGVsLmZpZWxkcykua2V5cygpLmVhY2goZnVuY3Rpb24oayl7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtW2tdID0gbmV3SXRlbVtrXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChbb2xkSXRlbSwgb2xkQ29weV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBzZW5kaW5nIHNpZ25hbCBmb3IgdXBkYXRlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAoY2hhbmdlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgndXBkYXRlZC0nICsgbW9kZWxOYW1lLCBjaGFuZ2VkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8qKioqKioqKiBVcGRhdGUgdW5pdmVyc2UgKioqKioqKipcbiAgICAgICAgICAgICAgICB2YXIgbm8gPSBuZXdPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KG5vKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRhYmxlW3guaWRdID0geFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHJlYnVsZGluZyByZXZlcnNlIGluZGV4ZXNcbiAgICAgICAgICAgICAgICBMYXp5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXS5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgICAgICAgICAgUkVWSURYW21vZGVsTmFtZSArICcuJyArIHJlZl0gPSBJREJbbW9kZWxOYW1lXS5ncm91cEJ5KCdfJyArIHJlZik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIG5ldyB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAobm8ubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCduZXctJyArIG1vZGVsTmFtZSwgTGF6eShubyksIGRhdGEudG90YWxSZXN1bHRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdkZWxldGVkLScgKyBtb2RlbE5hbWUsIGRlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgZGF0YSBhcnJpdmVkXG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtJyArIG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChUT09ORSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVE9PTkUnKTtcbiAgICAgICAgICAgIExhenkoVE9PTkUpLmVhY2goZnVuY3Rpb24gKHZhbHMsIG1vZGVsTmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIHVkeCA9IGdldFVubGlua2VkKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVE9NQU5ZKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUT01BTlknKTtcbiAgICAgICAgICAgIExhenkoVE9NQU5ZKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBpbmRleE5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gQVNLRURfVU5MSU5LRUQpKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX1VOTElOS0VEW2luZGV4TmFtZV0gPSBMYXp5KFtdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgTGF6eSh2YWxzKS5lYWNoKGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9VTkxJTktFRFtpbmRleE5hbWVdLnNvdXJjZS5wdXNoKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChNQU5ZVE9NQU5ZKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdNQU5ZVE9NQU5ZJyk7XG4gICAgICAgICAgICBMYXp5KE1BTllUT01BTlkpLmVhY2goZnVuY3Rpb24gKHZhbHMsIGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCA9IHBhcnNlSW50KGluZGV4TmFtZS5zcGxpdCgnfCcpWzFdKTtcbiAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBpbmRleE5hbWUuc3BsaXQoJ3wnKVswXTtcbiAgICAgICAgICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gQVNLRURfTTJNKSkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9NMk1baW5kZXhOYW1lXSA9IFt7fSwge31dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgTUlEWCA9IEFTS0VEX00yTVtpbmRleE5hbWVdW2ZpcnN0XTtcbiAgICAgICAgICAgICAgICBMYXp5KHZhbHMpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgTUlEWFt4ICsgJyddID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgTUlEWFt4XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobTJtKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RNMk0obTJtKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoUEVSTUlTU0lPTlMpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdFBlcm1pc3Npb25zKFBFUk1JU1NJT05TKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjYWxsQmFjaykge1xuICAgICAgICAgICAgY2FsbEJhY2soZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnZ290LWRhdGEnKTtcbiAgICB9O1xuICAgIHRoaXMuZ290UGVybWlzc2lvbnMgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24gKHYsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgTGF6eSh2WzBdKS5lYWNoKGZ1bmN0aW9uIChyb3csIGlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKChyZXNvdXJjZU5hbWUgaW4gSURCKSAmJiAoaWQgaW4gSURCW3Jlc291cmNlTmFtZV0uc291cmNlKSl7XG4gICAgICAgICAgICAgICAgICAgIElEQltyZXNvdXJjZU5hbWVdLmdldChpZCkuX3Blcm1pc3Npb25zID0gTGF6eShyb3cpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCB0cnVlXVxuICAgICAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKExhenkodlswXSkuc2l6ZSgpKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMtJyArIHJlc291cmNlTmFtZSwgTGF6eSh2WzBdKS5rZXlzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZW1pdCgndXBkYXRlLXBlcm1pc3Npb25zJyk7XG4gICAgfTtcblxuXG4gICAgdGhpcy5nb3RNMk0gPSBmdW5jdGlvbihtMm0pe1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihkYXRhLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgdmFyIG0ybUluZGV4ID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24obSl7XG4gICAgICAgICAgICAgICAgTGF6eShtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsdmVyYil7XG4gICAgICAgICAgICAgICAgICAgIG0ybUluZGV4W3ZlcmJdKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdyZWNlaXZlZC1tMm0nKTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLW0ybS0nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5mZXRjaCA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKSB7ICAvL1xuICAgICAgICAvLyBpZiBhIGNvbm5lY3Rpb24gaXMgY3VycmVudGx5IHJ1bm5pbmcsIHdhaXQgZm9yIGNvbm5lY3Rpb24uXG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gd2FpdGluZ0Nvbm5lY3Rpb25zKXtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0sNTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGZldGNoaW5nIGFzeW5jaHJvbW91cyBtb2RlbCBmcm9tIHNlcnZlclxuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUobW9kZWxOYW1lLCAoZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgICAgIC8vIGlmIGRhdGEgY2FtZXMgZnJvbSByZWFsdGltZSBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKFcyUFJFU09VUkNFLmNvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gZ2V0dGluZyBmaWx0ZXIgZmlsdGVyZWQgYnkgY2FjaGluZyBzeXN0ZW1cbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyID0gbGlzdENhY2hlLmZpbHRlcihtb2RlbCxmaWx0ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHNvbXRoaW5nIGlzIG1pc3Npbmcgb24gbXkgbG9jYWwgREIgXG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXNrIGZvciBtaXNzaW5ncyBhbmQgcGFyc2Ugc2VydmVyIHJlc3BvbnNlIGluIG9yZGVyIHRvIGVucmljaCBteSBsb2NhbCBEQi5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBsYWNpbmcgbG9jayBmb3IgdGhpcyBtb2RlbFxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywge2ZpbHRlciA6IGZpbHRlcn0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSxjYWxsQmFjayk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVsZWFzZSBsb2NrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihyZXQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWxlYXNlIGxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywgc2VuZERhdGEsZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbHRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHT1RfQUxMLnNvdXJjZS5wdXNoKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXQgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICAvLyBzZWFyY2ggb2JqZWN0cyBmcm9tIElEQi4gSWYgc29tZSBpZCBpcyBtaXNzaW5nLCBpdCByZXNvbHZlIGl0IGJ5IHRoZSBzZXJ2ZXJcbiAgICAgICAgLy8gaWYgYSByZXF1ZXN0IHRvIHRoZSBzYW1lIG1vZGVsIGlzIHBlbmRpbmcsIHdhaXQgZm9yIGl0cyBjb21wbGV0aW9uXG4gICAgICAgIFxuICAgICAgICBpZiAoaWRzLmNvbnN0cnVjdG9yICE9PSBBcnJheSl7XG4gICAgICAgICAgICBpZHMgPSBbaWRzXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBzb21lIGVudGl0eSBpcyBtaXNzaW5nIFxuICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUgLCB7aWQ6IGlkc30sIG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgIHZhciBpdGFiID0gSURCW21vZGVsTmFtZV1cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIGlkcyl7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goaXRhYi5zb3VyY2VbaWRzW2lkXV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ290TW9kZWwgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBmb3IgKHZhciBtb2RlbE5hbWUgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gZGF0YVttb2RlbE5hbWVdO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlWydkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lXSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgbW9kZWxDYWNoZVttb2RlbE5hbWVdID0gbWFrZU1vZGVsQ2xhc3MobW9kZWwpO1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIElEQikpIHtcbiAgICAgICAgICAgICAgICBJREJbbW9kZWxOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZGVzY3JpYmUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHJldCA9IG1vZGVsQ2FjaGVbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpKXtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGZhaWxlZE1vZGVscyl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY2FjaGVLZXkgPSAnZGVzY3JpcHRpb246JyArIG1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoY2FjaGVLZXkgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ290TW9kZWwoSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbY2FjaGVLZXldKSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVzY3JpYmUnLG51bGwsIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290TW9kZWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZWxOb3RGb3VuZC5oYW5kbGUobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxlZE1vZGVsc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9ICAgICAgICBcbiAgICB9O1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZGVjb3JhdG9yKSB7XG4gICAgICAgIHZhciBrZXkgPSB1dGlscy5oYXNoKGRlY29yYXRvcik7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlcnMpKSBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXSA9IG5ldyBIYW5kbGVyKCk7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlclVzZWQpKSBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXSA9IHt9O1xuICAgICAgICBpZiAoa2V5IGluIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdW2tleV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gbW9kZWxDYWNoZSkge1xuICAgICAgICAgICAgZGVjb3JhdG9yKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXS5hZGRIYW5kbGVyKGRlY29yYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGF0dHJpYnV0ZXMpe1xuICAgICAgICB2YXIgYWRkUHJvcGVydHkgPSBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlcykge1xuICAgICAgICAgIGF0dHJpYnV0ZXMuZm9yRWFjaChmdW5jdGlvbih2YWwpe1xuICAgICAgICAgICAgdmFyIGtleSA9ICdwQTonICsgbW9kZWwubW9kZWxOYW1lICsgJzonICsgdmFsO1xuICAgICAgICAgICAgdmFyIGthdHRyID0gJ19fJyArIHZhbDtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtb2RlbC5wcm90b3R5cGUsIHZhbCwge1xuICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2F0dHIgaW4gdGhpcykpe1xuICAgICAgICAgICAgICAgICAgdmFyIHYgPSBsb2NhbFN0b3JhZ2Vba2V5ICsgdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgICB0aGlzW2thdHRyXSA9IHY/SlNPTi5wYXJzZSh2KTpudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1trYXR0cl07XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgICAgIHRoaXNba2F0dHJdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW2tleSArIHRoaXMuaWRdID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKSkgeyBwZXJzaXN0ZW50QXR0cmlidXRlc1ttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgdmFyIGF0dHJzID0gcGVyc2lzdGVudEF0dHJpYnV0ZXNbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHZhciBuZXdBdHRycyA9IExhenkoYXR0cmlidXRlcykuZGlmZmVyZW5jZShhdHRycykudG9BcnJheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5ld0F0dHJzID0gYXR0cnM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld0F0dHJzLmxlbmd0aCl7XG4gICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIG1vZGVsQ2FjaGUpe1xuICAgICAgICAgICAgICAgIGFkZFByb3BlcnR5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSwgbmV3QXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGF0dHJzLG5ld0F0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbignbmV3LW1vZGVsJywgZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVycyl7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWwubW9kZWxOYW1lXS5oYW5kbGUobW9kZWxDYWNoZVttb2RlbC5tb2RlbE5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzKG1vZGVsLm1vZGVsTmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMucXVlcnkgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHRoaXMuZGVzY3JpYmUobW9kZWxOYW1lLGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgIC8vIGFycmF5Zml5IGFsbCBmaWx0ZXIgdmFsdWVzXG4gICAgICAgICAgICBmaWx0ZXIgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHYsayl7IHJldHVybiBbayxBcnJheS5pc0FycmF5KHYpP3Y6W3ZdXX0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICB2YXIgZmlsdGVyRnVuY3Rpb24gPSB1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgdmFyIGlkeCA9IGdldEluZGV4KG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB0aHMuZmV0Y2gobW9kZWxOYW1lLGZpbHRlcix0b2dldGhlciwgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soaWR4LmZpbHRlcihmaWx0ZXJGdW5jdGlvbikudmFsdWVzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2RlbGV0ZScsIHsgaWQgOiBpZHN9LCBjYWxsQmFjayk7XG4gICAgfTtcblxuICAgIHRoaXMuY29ubmVjdCA9IGZ1bmN0aW9uIChjYWxsQmFjaykge1xuICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmlzTG9nZ2VkSW4pIHtcbiAgICAgICAgICAgIGNhbGxCYWNrKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29ubmVjdChjYWxsQmFjayk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5mdW5jdGlvbiByZVdoZWVsT1JNKGVuZFBvaW50LCBsb2dpbkZ1bmMpe1xuICAgIHRoaXMuJG9ybSA9IG5ldyBiYXNlT1JNKG5ldyB1dGlscy5yZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgbG9naW5GdW5jKSx0aGlzKTtcbiAgICB0aGlzLm9uID0gdGhpcy4kb3JtLm9uLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLmVtaXQgPSB0aGlzLiRvcm0uZW1pdC5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy51bmJpbmQgPSB0aGlzLiRvcm0udW5iaW5kLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLm9uY2UgPSB0aGlzLiRvcm0ub25jZTtcbiAgICB0aGlzLmFkZE1vZGVsSGFuZGxlciA9IHRoaXMuJG9ybS5hZGRNb2RlbEhhbmRsZXIuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSB0aGlzLiRvcm0uYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMudXRpbHMgPSB1dGlscztcbiAgICB0aGlzLmxvZ291dCA9IHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ291dC5iaW5kKHRoaXMuJG9ybS5jb25uZWN0aW9uKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzLiRvcm0uY29ubmVjdGlvbjtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKGZ1bmN0aW9uKGNhbGxCYWNrLHJlamVjdCl7XG4gICAgICAgIGNvbm5lY3Rpb24uY29ubmVjdChjYWxsQmFjayk7XG4gICAgfSkpO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ2luKHVzZXJuYW1lLCBwYXNzd29yZCwgYWNjZXB0KTsgICAgXG4gICAgfSkuYmluZCh0aGlzKSk7XG4gICAgXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dvdXQgPSBmdW5jdGlvbih1cmwpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dvdXQoKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0TW9kZWwgPSBmdW5jdGlvbihtb2RlbE5hbWUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVzY3JpYmUobW9kZWxOYW1lLGFjY2VwdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNpbmdsZSA9IGZhbHNlO1xuICAgIHZhciBtb2ROYW1lID0gbW9kZWxOYW1lO1xuICAgIGlmIChpZHMuY29uc3RydWN0b3IgIT09IEFycmF5KXtcbiAgICAgICAgc2luZ2xlID0gdHJ1ZTtcbiAgICAgICAgaWRzID0gW2lkc11cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoc2luZ2xlKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kb3JtLmdldChtb2ROYW1lLCBpZHMsIGZ1bmN0aW9uKGl0ZW1zKXsgXG4gICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQoaXRlbXNbMF0pO31cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZ2V0KG1vZE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLnF1ZXJ5ID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZmlsdGVyLCByZWxhdGVkKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdmFyIHRvZ2V0aGVyID0gbnVsbDtcbiAgICAgICAgaWYgKHJlbGF0ZWQgJiYgKHJlbGF0ZWQuY29uc3RydWN0b3IgPT09IEFycmF5KSAmJiAocmVsYXRlZC5sZW5ndGgpKXtcbiAgICAgICAgICAgIHRvZ2V0aGVyID0gcmVsYXRlZDtcbiAgICAgICAgfSBlbHNlIGlmIChyZWxhdGVkICYmIChyZWxhdGVkLmNvbnN0cnVjdG9yID09PSBTdHJpbmcpICYmIChyZWxhdGVkLmxlbmd0aCkpe1xuICAgICAgICAgICAgdG9nZXRoZXIgPSByZWxhdGVkLnNwbGl0KCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGlkcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlbGV0ZShtb2RlbE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRMb2dnZWRVc2VyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLiRvcm0uY29ubmVjdGlvbi5jYWNoZWRTdGF0dXMudXNlcl9pZClcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KCdhdXRoX3VzZXInLHRoaXMuJG9ybS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy51c2VyX2lkKTtcbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KSB7XG4gICAgICAgICAgICBzZWxmLm9uY2UoJ2xvZ2dlZC1pbicsZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgICAgIHNlbGYuZ2V0KCdhdXRoX3VzZXInLCB1c2VyKS50aGVuKGFjY2VwdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS4kc2VuZFRvRW5kcG9pbnQgPSBmdW5jdGlvbiAodXJsLCBkYXRhKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLiRwb3N0KHVybCwgZGF0YSk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9naW4odXNlcm5hbWUscGFzc3dvcmQpO1xufVxuIl19
