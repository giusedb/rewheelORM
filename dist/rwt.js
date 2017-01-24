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
        cleanDescription: function () {
            Lazy(localStorage).filter(function (v, n) {
                return Lazy(n).startsWith('description:');
            }).keys().each(function (n) {
                delete localStorage[n];
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
        waitFor: function (func, callBack) {
            var waiter = function () {
                if (func()) {
                    callBack();
                } else {
                    setTimeout(waiter, 500);
                }
            };
            setTimeout(waiter, 500);
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
    /**
 * Check current status and callback for results.
 * It caches results for further.
 * @param callback: (status object)
 * @param force: boolean if true empties cache  
 * @return void
 */
    reWheelConnection.prototype.status = function (callBack, force) {
        // if force, clear all cached values
        var key = 'token:' + this.endPoint;
        var ths = this;
        if (force) {
            this.cachedStatus = {};
            delete localStorage[key];
        }
        if (this.statusWaiting) {
            // wait for status
            utils.waitFor(function () {
                return !ths.statusWaiting;
            }, function () {
                ths.status(callBack, force);
            });
            return;
        }
        // try for value resolution
        // first on memory
        if (Lazy(this.cachedStatus).size()) {
            callBack(this.cachedStatus)    // then in localStorage
;
        } else {
            var data = {};
            if (key in localStorage) {
                data.__token__ = localStorage[key];
            }
            this.statusWaiting = true;
            this.$post('api/status', data, function (status) {
                ths.updateStatus(status);
                localStorage[key] = status.token;
                callBack(status);
                ths.statusWaiting = false;
            });
            // doesn't call callback
            return;
        }
        callBack(this.cachedStatus);
    };
    reWheelConnection.prototype.updateStatus = function (status) {
        var lastBuild = parseFloat(localStorage.lastBuild) || 1;
        if (lastBuild < status.last_build) {
            utils.cleanDescription();
            localStorage.lastBuild = status.last_build;
        }
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
            this.status(callBack || utils.noop);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJjb25uZWN0aW9uLmpzIiwidG91Y2hlci5qcyIsInZhY3V1bWNhY2hlci5qcyIsImF1dG9saW5rZXIuanMiLCJsaXN0Y2FjaGVyLmpzIiwibWFueXRvbWFueS5qcyIsImNhY2hlci5qcyIsIm9ybS5qcyJdLCJuYW1lcyI6WyJIYW5kbGVyIiwiaGFuZGxlcnMiLCJzdHJIYW5kbGVycyIsInByb3RvdHlwZSIsImFkZEhhbmRsZXIiLCJoYW5kbGVyIiwic3RySGFuZGxlciIsInV0aWxzIiwiaGFzaCIsInRvU3RyaW5nIiwicHVzaCIsImhhbmRsZSIsImFyZ3MiLCJBcnJheSIsInNsaWNlIiwiY2FsbCIsImFyZ3VtZW50cyIsImZvckVhY2giLCJmdW5jIiwiYXBwbHkiLCJoYW5kbGVCeSIsInRocyIsIk5hbWVkRXZlbnRNYW5hZ2VyIiwiZXZlbnRzIiwiaGFuZGxlcklkIiwiaWR4SWQiLCJvbiIsIm5hbWUiLCJpZCIsImVtaXQiLCJldmVudCIsInVuYmluZCIsImNvdW50IiwiTGF6eSIsImVhY2giLCJ2IiwiayIsImlkeCIsIm4iLCJyZXZlcnNlIiwieCIsInNwbGljZSIsIm9uY2UiLCJldmVudE5hbWUiLCJoYW5kbGVyRnVuY3Rpb24iLCJzZWxmIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsInJlbmFtZUZ1bmN0aW9uIiwiZm4iLCJGdW5jdGlvbiIsImJpbmQiLCJjYWNoZWQiLCJrZXkiLCJ3cmFwcGVyIiwibG9nIiwiY29uc29sZSIsInhkciIsInVybCIsImRhdGEiLCJhcHBsaWNhdGlvbiIsInRva2VuIiwiZm9ybUVuY29kZSIsIlByb21pc2UiLCJhY2NlcHQiLCJyZWplY3QiLCJyZXEiLCJYTUxIdHRwUmVxdWVzdCIsIm9ucmVhZHlzdGF0ZWNoYW5nZSIsInJlYWR5U3RhdGUiLCJyZXNwb25zZURhdGEiLCJKU09OIiwicGFyc2UiLCJyZXNwb25zZVRleHQiLCJhIiwicmVzcG9uc2UiLCJzdGF0dXMiLCJyZXF1ZXN0IiwiWERvbWFpblJlcXVlc3QiLCJvbmxvYWQiLCJzdGF0dXNUZXh0IiwiRXJyb3IiLCJvcGVuIiwib25lcnJvciIsInNldFJlcXVlc3RIZWFkZXIiLCJfX3Rva2VuX18iLCJzaXplIiwic3RyaW5naWZ5IiwibWFwIiwiZW5jb2RlVVJJIiwidG9BcnJheSIsImpvaW4iLCJzZW5kIiwiY2FwaXRhbGl6ZSIsInMiLCJ0b1VwcGVyQ2FzZSIsInRvTG93ZXJDYXNlIiwic3RyIiwicmV0IiwibGVuZ3RoIiwiY2hhckNvZGVBdCIsIm1ha2VGaWx0ZXIiLCJtb2RlbCIsImZpbHRlciIsInVuaWZpZXIiLCJkb250VHJhbnNsYXRlRmlsdGVyIiwic291cmNlIiwidmFscyIsImZpZWxkIiwiaXNBcnJheSIsImZpZWxkcyIsInR5cGUiLCJjb25zdHJ1Y3RvciIsIk51bWJlciIsInNhbWVBcyIsInkiLCJwbHVyYWxpemUiLCJiZWZvcmVDYWxsIiwiYmVmb3JlIiwiZGVjb3JhdG9yIiwidGhlbiIsImNsZWFuU3RvcmFnZSIsImxvY2FsU3RvcmFnZSIsImtleXMiLCJjbGVhbkRlc2NyaXB0aW9uIiwic3RhcnRzV2l0aCIsImNociIsInNwbGl0IiwicGVybXV0YXRpb25zIiwiYXJyIiwid2FpdEZvciIsImNhbGxCYWNrIiwid2FpdGVyIiwic2V0VGltZW91dCIsImJvb2wiLCJCb29sZWFuIiwibm9vcCIsInR6T2Zmc2V0IiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwidHJhbnNGaWVsZFR5cGUiLCJkYXRlIiwiZGF0ZXRpbWUiLCJzdHJpbmciLCJ0ZXh0IiwiaW50ZWdlciIsInBhcnNlSW50IiwiZmxvYXQiLCJwYXJzZUZsb2F0IiwibW9jayIsIlNUQVRVU0tFWSIsIlJlYWx0aW1lQ29ubmVjdGlvbiIsImVuZFBvaW50Iiwicnd0Q29ubmVjdGlvbiIsImNvbm5lY3Rpb24iLCJTb2NrSlMiLCJvbm9wZW4iLCJ0ZW5hbnQiLCJvbm1lc3NhZ2UiLCJlIiwib25jbG9zZSIsIndzQ29ubmVjdCIsImNhY2hlZFN0YXR1cyIsImNsb3NlIiwicmVXaGVlbENvbm5lY3Rpb24iLCJnZXRMb2dpbiIsImVuZHNXaXRoIiwiaXNDb25uZWN0ZWQiLCJpc0xvZ2dlZEluIiwiJHBvc3QiLCJwcm9taXNlIiwieGhyIiwiZm9yY2UiLCJzdGF0dXNXYWl0aW5nIiwidXBkYXRlU3RhdHVzIiwibGFzdEJ1aWxkIiwibGFzdF9idWlsZCIsInVzZXJfaWQiLCJvbGRTdGF0dXMiLCJsb2dpbkluZm8iLCJPYmplY3QiLCJsb2dpbiIsInVzZXJuYW1lIiwicGFzc3dvcmQiLCJvYmoiLCJyZWFsdGltZUVuZFBvaW50Iiwid3NDb25uZWN0aW9uIiwidXNlcmlkIiwiZXJyb3IiLCJsb2dvdXQiLCJvayIsImNvbm5lY3QiLCJUb3VjaGVyIiwidG91Y2hlZCIsInRvdWNoIiwidCIsIlZhY3V1bUNhY2hlciIsImFza2VkIiwicGtJbmRleCIsIm1pc3NpbmciLCJhc2siLCJsYXp5IiwiY29udGFpbnMiLCJnZXRBc2tlZEluZGV4IiwibWlzc2luZ3MiLCJ1bmlxdWUiLCJBdXRvTGlua2VyIiwiYWN0aXZlcyIsIklEQiIsIlcyUFJFU09VUkNFIiwibGlzdENhY2hlIiwibWFpbkluZGV4IiwiZm9yZWlnbktleXMiLCJtMm0iLCJtMm1JbmRleCIsInBlcm1pc3Npb25zIiwiaW5kZXgiLCJnZXRJbmRleEZvciIsInJlZmVyZW5jZXMiLCJyZWZlcmVuY2UiLCJpbmRleE5hbWUiLCJ0byIsInJlZmVyZW5jZWRCeSIsImJ5IiwibWFueVRvTWFueSIsInJlbGF0aW9uIiwiTWFueVRvTWFueVJlbGF0aW9uIiwibTJtR2V0IiwiY29sbGVjdGlvbiIsImdvdERhdGEiLCJnZXRNMk0iLCJsaW5rVW5saW5rZWQiLCJ2YWx1ZXMiLCJzdW0iLCJjaGFuZ2VkIiwiaW5kZXhlcyIsIklOREVYIiwiZ2V0dGVyIiwiaWRzIiwib3RoZXJJbmRleCIsImRlc2NyaWJlIiwiZmxhdHRlbiIsIm1vZGVsTmFtZSIsImlkYiIsImZldGNoIiwibWFpblJlc291cmNlIiwiZmllbGROYW1lIiwidG9PYmplY3QiLCJyZXNvdXJjZU5hbWUiLCJnb3RQZXJtaXNzaW9ucyIsIlBFUk1JU1NJT05TIiwic2V0SW50ZXJ2YWwiLCJMaXN0Q2FjaGVyIiwiZ290QWxsIiwiY29tcG9zaXRlQXNrZWQiLCJjYXJ0ZXNpYW5Qcm9kdWN0MSIsImIiLCJjYXJ0ZXNpYW5Qcm9kdWN0IiwiZXhwbG9kZUZpbHRlciIsInByb2R1Y3QiLCJyIiwiZmlsdGVyU2luZ2xlIiwidGVzdE9ubHkiLCJkaWZmZXJlbmNlIiwiY2xlYW5Db21wb3NpdGVzIiwiZmlsdGVyTGVuIiwiaXRlbXMiLCJpdGVtIiwiZ290Iiwic2luZ2xlIiwic29tZSIsImYiLCJleHBsb2RlZCIsInBhcnRpYWxzIiwiYmFkIiwicGx1Y2siLCJhZGQiLCJmaW5kIiwiZ2V0MCIsImdldDEiLCJkZWwiLCJsIiwiY2FjaGVkUHJvcGVydHlCeUV2ZW50cyIsInByb3RvIiwicHJvcGVydHlOYW1lIiwic2V0dGVyIiwicmVzdWx0Iiwib3JtIiwicHJvcGVydHlEZWYiLCJ2YWx1ZSIsImRlZmluZVByb3BlcnR5IiwiVmFsaWRhdGlvbkVycm9yIiwicmVzb3VyY2UiLCJfcmVzb3VyY2UiLCJmb3JtSWR4IiwiZXJyb3JzIiwiYmFzZU9STSIsIm9wdGlvbnMiLCJleHRPUk0iLCJTdHJpbmciLCJjb25uZWN0ZWQiLCJ3cyIsImluZm8iLCJvbk1lc3NhZ2VKc29uIiwib25NZXNzYWdlVGV4dCIsIm1lc3NhZ2UiLCJzZW50RGF0YSIsIndhaXRpbmdDb25uZWN0aW9ucyIsImF1dGhfZ3JvdXAiLCJJRFgiLCJSRVZJRFgiLCJidWlsZGVySGFuZGxlcnMiLCJidWlsZGVySGFuZGxlclVzZWQiLCJwZXJzaXN0ZW50QXR0cmlidXRlcyIsImV2ZW50SGFuZGxlcnMiLCJwZXJtaXNzaW9uV2FpdGluZyIsIm1vZGVsQ2FjaGUiLCJmYWlsZWRNb2RlbHMiLCJsaW5rZXIiLCJ2YWxpZGF0aW9uRXZlbnQiLCJjdXJyZW50Q29udGV4dCIsInNhdmluZ0Vycm9ySGFubGRlciIsImdldEluZGV4IiwiZ2V0VW5saW5rZWQiLCJVTkxJTktFRCIsIlBlcm1pc3Npb25UYWJsZSIsImtsYXNzIiwic2F2ZSIsImNiIiwibXlQZXJtcyIsImdyb3VwX2lkIiwicGVybWlzc2lvbkxpc3QiLCJwIiwicGVybXMiLCJhbGxQZXJtaXNzaW9ucyIsImluZGV4T2YiLCJtYWtlTW9kZWxDbGFzcyIsIl9tb2RlbCIsInJlYWRhYmxlIiwid3JpdGFibGUiLCJwcml2YXRlQXJncyIsIm1lcmdlIiwiZnVuY1N0cmluZyIsIktsYXNzIiwicmVmX3RyYW5zbGF0aW9ucyIsImludmVyc2VfcmVmZXJlbmNlcyIsInJlZmVyZW50cyIsImZpZWxkc09yZGVyIiwiZmllbGRPcmRlciIsInJlcHJlc2VudGF0aW9uIiwiZGVsZXRlIiwiX3Blcm1pc3Npb25zIiwiYWxsX3Blcm1zIiwib2JqZWN0X2lkIiwiZ3JvdXBlZCIsInVua25vd25fZ3JvdXBzIiwiZ3JvdXBCeSIsIm8iLCJhc1JhdyIsIklEIiwiYXJnIiwiY29udGV4dCIsImNvcHkiLCJhc3IiLCJjb25jYXQiLCJzYXZlTXVsdGkiLCJvYmplY3RzIiwic2NvcGUiLCJyYXciLCJkZWxldGFibGUiLCJtdWx0aXBsZSIsImVsZW1zIiwidGFiIiwib2JqcyIsInJlc3VsdHMiLCJleHRyYV92ZXJicyIsImZ1bmNOYW1lIiwiZGRhdGEiLCJzYXZlUEEiLCJUIiwib28iLCJQQSIsIkZzIiwiZmllbGRJZHgiLCJ0YXAiLCJpbmRleEJ5Iiwid2lkZ2V0IiwicmVmIiwiZXh0X3JlZiIsImxvY2FsX3JlZiIsIlR5cGVFcnJvciIsInJldkluZGV4IiwiaGFzT3duUHJvcGVydHkiLCJvcHRzIiwicXVlcnkiLCJmaXJzdCIsIm9tb2RlbE5hbWUiLCJ2YWxpZGF0b3JzIiwidW5saW5rUmVmZXJlbmNlIiwiaW5zdGFuY2UiLCJpbnN0YW5jZXMiLCJvbW9kZWwiLCJsaW5rUmVmZXJlbmNlIiwicmVmcyIsIklOREVYX00yTSIsIlcyUF9QT1NUIiwiX2V4dHJhIiwiVE9PTkUiLCJUT01BTlkiLCJNQU5ZVE9NQU5ZIiwibW9kZWxDbGFzcyIsInppcCIsImRlbGV0ZWQiLCJNUEEiLCJyZWNvcmQiLCJpdGFiIiwidGFibGUiLCJpayIsIm5uZXciLCJ1cGRhdGVkIiwibmV3T2JqZWN0cyIsIm9sZEl0ZW0iLCJvbGRDb3B5IiwibmV3SXRlbSIsIm5vIiwidG90YWxSZXN1bHRzIiwidWR4IiwiQVNLRURfVU5MSU5LRUQiLCJBU0tFRF9NMk0iLCJNSURYIiwiZ290TTJNIiwicm93IiwibSIsInZlcmIiLCJ0b2dldGhlciIsInNlbmREYXRhIiwiR09UX0FMTCIsImdvdE1vZGVsIiwiY2FjaGVLZXkiLCJtb2RlbE5vdEZvdW5kIiwiYWRkTW9kZWxIYW5kbGVyIiwiYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMiLCJhdHRyaWJ1dGVzIiwiYWRkUHJvcGVydHkiLCJ2YWwiLCJrYXR0ciIsInNldCIsImF0dHJzIiwibmV3QXR0cnMiLCJmaWx0ZXJGdW5jdGlvbiIsInJlV2hlZWxPUk0iLCJsb2dpbkZ1bmMiLCIkb3JtIiwiZ2V0TW9kZWwiLCJtb2ROYW1lIiwicmVsYXRlZCIsImdldExvZ2dlZFVzZXIiLCJ1c2VyIiwiJHNlbmRUb0VuZHBvaW50Il0sIm1hcHBpbmdzIjoiOzs7SUFBQSxhO0lBRUEsU0FBQUEsT0FBQSxHQUFBO0FBQUEsUUFDQSxLQUFBQyxRQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsUUFFQSxLQUFBQyxXQUFBLEdBQUEsRUFBQSxDQUZBO0FBQUEsSztJQUdBLEM7SUFFQUYsT0FBQSxDQUFBRyxTQUFBLENBQUFDLFVBQUEsR0FBQSxVQUFBQyxPQUFBLEVBQUE7QUFBQSxRQUNBLElBQUFDLFVBQUEsR0FBQUMsS0FBQSxDQUFBQyxJQUFBLENBQUFILE9BQUEsQ0FBQUksUUFBQSxFQUFBLENBQUEsQ0FEQTtBQUFBLFFBRUEsSUFBQSxDQUFBLENBQUFILFVBQUEsSUFBQSxLQUFBSixXQUFBLENBQUEsRUFBQTtBQUFBLFlBQ0EsS0FBQUEsV0FB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RUFBQTtBQUFBLFlBQ0FDLEdBQUEsRUFBQSxVQUFBQyxNQUFBLEVBQUF4QixJQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBLE9BQUFBLElBQUEsS0FBQSxRQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBQSxJQUFBLEtBQUEsVUFBQSxFQUFBO0FBQUEsd0JBQ0EsT0FBQW9CLFVBQUEsQ0FEQTtBQUFBLHFCQUFBLE1BRUE7QUFBQSx3QkFDQSxPQUFBQyxVQUFBLEVBQUEsQ0FEQTtBQUFBLHFCQUhBO0FBQUEsaUJBQUEsTUFNQTtBQUFBLG9CQUNBLE9BQUFHLE1BQUEsQ0FBQXhCLElBQUEsQ0FBQSxDQURBO0FBQUEsaUJBUEE7QUFBQSxhQURBO0FBQUEsU0FBQSxDQUFBLENBREE7QUFBQSxLO0lBdU5BO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtB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QUFBLFdBQUEsRUFBQSxLQUFBc1osSUFBQSxDQUFBMVMsVUFBQSxDQUFBUSxZQUFBLENBQUFlLE9BQUEsQ0FBQSxDQURBO0FBQUEsYUFFQTtBQUFBLFlBQ0EsT0FBQSxJQUFBbEgsT0FBQSxDQUFBLFVBQUFDLE1BQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsZ0JBQ0F4QixJQUFBLENBQUFILElBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQW1hLElBQUEsRUFBQTtBQUFBLG9CQUNBaGEsSUFBQSxDQUFBSyxHQUFBLENBQUEsV0FBQSxFQUFBMlosSUFBQSxFQUFBalYsSUFBQSxDQUFBeEQsTUFBQSxFQURBO0FBQUEsaUJBQUEsRUFEQTtBQUFBLGFBQUEsQ0FBQSxDQURBO0FBQUEsU0FKQTtBQUFBLEtBQUEsQztJQWFBa1ksVUFBQSxDQUFBbmMsU0FBQSxDQUFBMmMsZUFBQSxHQUFBLFVBQUFoWixHQUFBLEVBQUFDLElBQUEsRUFBQTtBQUFBLFFBQ0EsT0FBQSxLQUFBeVksSUFBQSxDQUFBM1IsS0FBQSxDQUFBL0csR0FBQSxFQUFBQyxJQUFBLENBQUEsQ0FEQTtBQUFBLEtBQUEsQztJQUlBdVksVUFBQSxDQUFBbmMsU0FBQSxDQUFBc0wsS0FBQSxHQUFBLFVBQUFDLFFBQUEsRUFBQUMsUUFBQSxFQUFBO0FBQUEsUUFDQSxPQUFBLEtBQUE2USxJQUFBLENBQUExUyxVQUFBLENBQUEyQixLQUFBLENBQUFDLFFBQUEsRUFBQUMsUUFBQSxDQUFBLENBREE7QUFBQSxLQUFBLEMiLCJmaWxlIjoicnd0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBIYW5kbGVyKCl7XG4gICAgdGhpcy5oYW5kbGVycyA9IFtdO1xuICAgIHRoaXMuc3RySGFuZGxlcnMgPSB7fTtcbn07XG5cbkhhbmRsZXIucHJvdG90eXBlLmFkZEhhbmRsZXIgPSBmdW5jdGlvbiAoaGFuZGxlcil7XG4gICAgdmFyIHN0ckhhbmRsZXIgPSB1dGlscy5oYXNoKGhhbmRsZXIudG9TdHJpbmcoKSk7XG4gICAgaWYgKCEoc3RySGFuZGxlciBpbiB0aGlzLnN0ckhhbmRsZXJzKSl7XG4gICAgICAgIHRoaXMuc3RySGFuZGxlcnNbc3RySGFuZGxlcl0gPSBoYW5kbGVyO1xuICAgICAgICB0aGlzLmhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfVxufTtcbkhhbmRsZXIucHJvdG90eXBlLmhhbmRsZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMCk7XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KG51bGwsYXJncyk7XG4gICAgfSlcbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGVCeSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSk7XG4gICAgdmFyIHRocyA9IGFyZ3VtZW50c1swXTtcbiAgICB0aGlzLmhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oZnVuYyl7XG4gICAgICAgIGZ1bmMuYXBwbHkodGhzLGFyZ3MpO1xuICAgIH0pXG59O1xuXG5cbmZ1bmN0aW9uIE5hbWVkRXZlbnRNYW5hZ2VyICgpe1xuICAgIHZhciBldmVudHMgPSB7fTtcbiAgICB2YXIgaGFuZGxlcklkID0ge307XG4gICAgdmFyIGlkeElkID0gMDtcbiAgICB0aGlzLm9uID0gZnVuY3Rpb24obmFtZSwgZnVuYyl7XG4gICAgICAgIGlmICghKG5hbWUgaW4gZXZlbnRzKSl7XG4gICAgICAgICAgICBldmVudHNbbmFtZV0gPSBuZXcgQXJyYXkoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWQgPSBpZHhJZCArKztcbiAgICAgICAgZXZlbnRzW25hbWVdLnB1c2goZnVuYyk7XG4gICAgICAgIGhhbmRsZXJJZFtpZF0gPSBmdW5jO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfTtcbiAgICB0aGlzLmVtaXQgPSBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgaWYgKG5hbWUgaW4gZXZlbnRzKXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICAgICAgICAgIGV2ZW50LmFwcGx5KG51bGwsYXJncyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy51bmJpbmQgPSBmdW5jdGlvbihoYW5kbGVyKXtcbiAgICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgICAgaWYgKGhhbmRsZXIgaW4gaGFuZGxlcklkKXtcbiAgICAgICAgICAgIHZhciBmdW5jID0gaGFuZGxlcklkW2hhbmRsZXIgKyAnJ107XG4gICAgICAgICAgICBMYXp5KGV2ZW50cykuZWFjaChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBuIGluIHYpe1xuICAgICAgICAgICAgICAgICAgICBpZiAodltuXSA9PT0gZnVuYyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHgucHVzaChuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWR4LnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICB2LnNwbGljZSh4LDEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGhhbmRsZXJJZFtoYW5kbGVyXTtcbiAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ2FsbCBldmVudCBvbmNlXG4gICAgICovXG4gICAgdGhpcy5vbmNlID0gZnVuY3Rpb24oZXZlbnROYW1lLCBoYW5kbGVyRnVuY3Rpb24pIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgaGFuZGxlciA9IHRoaXMub24oZXZlbnROYW1lLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaGFuZGxlckZ1bmN0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBzZWxmLnVuYmluZChoYW5kbGVyKTtcbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjYWNoZWRLZXlJZHggPSAwO1xuXG52YXIgbnVsbFN0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJyd9O1xuXG5mdW5jdGlvbiBtb2NrT2JqZWN0KCl7XG4gICAgcmV0dXJuIG5ldyBQcm94eSh7fSwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBuYW1lICA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgIGlmIChuYW1lID09PSAndG9TdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsU3RyaW5nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtb2NrT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W25hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSlcbn1cblxuLypcbnZhciAkUE9TVCA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgY2FsbEJhY2ssIGVycm9yQmFjayxoZWFkZXJzKXtcbiAgICB2YXIgb3B0cyA9IHtcbiAgICAgICAgYWNjZXB0cyA6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgdXJsIDogdXJsLFxuICAgICAgICBkYXRhIDogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIGRhdGFUeXBlIDogJ2pzb24nLFxuICAgICAgICBzdWNjZXNzIDogY2FsbEJhY2ssXG4gICAgICAgIGVycm9yIDogZXJyb3JCYWNrLFxuICAgICAgICBtZXRob2QgOiAnUE9TVCcsXG4gICAgICAgIGNvbnRlbnRUeXBlIDogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgfTtcbiAgICBpZiAoaGVhZGVycyl7XG4gICAgICAgIG9wdHMuaGVhZGVycyA9IGhlYWRlcnM7XG4gICAgICAgIG9wdHMuY3Jvc3NEb21haW4gPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gJC5hamF4KG9wdHMpO1xufVxuXG5cbmZ1bmN0aW9uIHJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBnZXRMb2dpbil7XG4gICAgLy8gbWFpbiBcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5nZXRMb2dpbiA9IGdldExvZ2luO1xuICAgIHRoaXMuZXZlbnRzID0gbmV3IE5hbWVkRXZlbnRNYW5hZ2VyKClcbiAgICB0aGlzLiRQT1NUID0gJFBPU1QuYmluZCh0aGlzKTtcbiAgICB0aGlzLm9wdGlvbnMgPSB7ZW5kUG9pbnQgOiBlbmRQb2ludH07XG4gICAgdGhpcy5vbiA9IHRoaXMuZXZlbnRzLm9uLmJpbmQodGhpcyk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24oc3RhdHVzLCBjYWxsQmFjaywgZXJyb3IpIHtcbiAgICBpZiAoc3RhdHVzKSB7XG4gICAgICAgIHZhciBpc0xvZ2dlZCA9IChzdGF0dXMudXNlcl9pZCAmJiAhdGhpcy5vcHRpb25zLnVzZXJfaWQgKTtcbiAgICAgICAgZm9yICh2YXIgeCBpbiBzdGF0dXMpeyB0aGlzLm9wdGlvbnNbeF0gPSBzdGF0dXNbeF07IH1cbiAgICAgICAgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMgPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xuICAgICAgICBpZiAoaXNMb2dnZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzLmVtaXQoJ2xvZ2luJywgdGhpcy5vcHRpb25zLnVzZXJfaWQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5vcHRpb25zLnVzZXJfaWQgJiYgdGhpcy5nZXRMb2dpbil7XG4gICAgICAgIHZhciBsb2dJbmZvID0gdGhpcy5nZXRMb2dpbihlcnJvcik7XG4gICAgICAgIGlmIChsb2dJbmZvLmNvbnN0cnVjdG9yID09PSBPYmplY3Qpe1xuICAgICAgICAgICAgdGhpcy5sb2dpbihsb2dJbmZvLnVzZXJuYW1lLCBsb2dJbmZvLnBhc3N3b3JkKVxuICAgICAgICAgICAgLnRoZW4oKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoc3RhdHVzLCBjYWxsQmFjayk7XG4gICAgICAgICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfSBlbHNlIGlmIChsb2dJbmZvLmNvbnN0cnVjdG9yID09PSBQcm9taXNlKSB7XG4gICAgICAgICAgICBsb2dJbmZvLnRoZW4oKGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgICAgICAgdmFyIHggPSB0aGlzLmxvZ2luKG9iai51c2VybmFtZSxvYmoucGFzc3dvcmQpO1xuICAgICAgICAgICAgICAgIHZhciBtYW5hZ2VFcnJvciA9IChmdW5jdGlvbihiYWQpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhudWxsLGNhbGxCYWNrLGJhZC5lcnJvcik7XG4gICAgICAgICAgICAgICAgfSkuYmluZCh0aGlzKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbEJhY2spe1xuICAgICAgICAgICAgICAgICAgICB4LnRoZW4oY2FsbEJhY2ssbWFuYWdlRXJyb3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHgudGhlbihudWxsLCBtYW5hZ2VFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayh0aGlzLm9wdGlvbnMpO1xuICAgIH0gICAgXG59XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5zdGF0dXMgPSBmdW5jdGlvbihjYWxsQmFjaywgZm9yY2Upe1xuICAgIGlmICgoJ2xhc3RSV1RTdGF0dXMnIGluIGxvY2FsU3RvcmFnZSkgJiYgIWZvcmNlKSB7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHZhciBzdGF0dXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHN0YXR1cyxjYWxsQmFjayk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzKGNhbGxCYWNrLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3N0YXR1c19jYWxsaW5nKXtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5zdGF0dXMoY2FsbEJhY2spO1xuICAgICAgICB9LDUwKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMudGltZXN0YW1wKXtcbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sodGhpcy5vcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGF0dXNfY2FsbGluZyA9IHRydWU7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHRoaXMuJHBvc3QoJ2FwaS9zdGF0dXMnLG51bGwsZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgICAgIHNlbGYuX3N0YXR1c19jYWxsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZVN0YXR1cyhzdGF0dXMsY2FsbEJhY2spO1xuICAgICAgICB9KTsgICAgICAgIFxuICAgIH1cbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS4kcG9zdCA9IGZ1bmN0aW9uKHVybCwgZGF0YSxjYWxsQmFjayl7XG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgaWYgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMudG9rZW4pe1xuICAgICAgICBpZiAoIWRhdGEpe1xuICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMudG9rZW4pe1xuICAgICAgICB2YXIgaGVhZGVycyA9IHsgXG4gICAgICAgICAgICB0b2tlbiA6IHRoaXMub3B0aW9ucy50b2tlbixcbiAgICAgICAgICAgIGFwcGxpY2F0aW9uIDogdGhpcy5vcHRpb25zLmFwcGxpY2F0aW9uXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGhlYWRlcnMgPSBudWxsO1xuICAgIH1cblxuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih0aHMub3B0aW9ucy5lbmRQb2ludCArIHVybCwgZGF0YSwgdGhzLm9wdGlvbnMuYXBwbGljYXRpb24sIHRocy5vcHRpb25zLnRva2VuKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UnLCB4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cyArICctanNvbicsIHhoci5yZXNwb25zZURhdGEsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYWxsQmFjaykgeyBjYWxsQmFjayggeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0ICl9O1xuICAgICAgICAgICAgICAgIGFjY2VwdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItanNvbi0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlRGF0YSx1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItaHR0cCcseGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cyx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWh0dHAtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIHZhciB1cmwgPSB0aGlzLm9wdGlvbnMuZW5kUG9pbnQgKyAnYXBpL2xvZ2luJztcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodXJsLHsgdXNlcm5hbWU6IHVzZXJuYW1lLCBwYXNzd29yZCA6IHBhc3N3b3JkfSwgbnVsbCxjb25uZWN0aW9uLm9wdGlvbnMudG9rZW4sIHRydWUpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24udXBkYXRlU3RhdHVzKHhoci5yZXNwb25zZURhdGEpO1xuICAgICAgICAgICAgICAgIGFjY2VwdChzdGF0dXMpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbihjYWxsQmFjayl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB3c2Nvbm5lY3QgPSBmdW5jdGlvbihzZWxmKXtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24gPSBuZXcgdXRpbHMud3NDb25uZWN0KHNlbGYub3B0aW9ucyk7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uLm9uQ29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5ldmVudHMuZW1pdCgnd3MtY29ubmVjdGVkJywgc2VsZi53c0Nvbm5lY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24ub25EaXNjb25uZWN0KGZ1bmN0aW9uKCl7IFxuICAgICAgICAgICAgaWYgKHNlbGYub3B0aW9ucyAmJiBzZWxmLm9wdGlvbnMucmVhbHRpbWVFbmRQb2ludCl7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB3c2Nvbm5lY3Qoc2VsZik7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0sMTAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdGhpcy5zdGF0dXMoKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgIGlmICgndG9rZW4nIGluIHNlbGYub3B0aW9ucyl7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhzdGF0dXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RpbmcgdG8gJyArIHNlbGYub3B0aW9ucy5lbmRQb2ludCk7XG4gICAgICAgICAgICBpZiAoc2VsZi5vcHRpb25zLnVzZXJuYW1lICYmIHNlbGYub3B0aW9ucy5wYXNzd29yZCl7XG4gICAgICAgICAgICAgICAgc2VsZi5sb2dpbihcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLnVzZXJuYW1lLFxuICAgICAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMucGFzc3dvcmQsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncmVuZXdpbmcgY29ubmVjdGlvbicpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNlbGYub3B0aW9ucy50b2tlbiAmJiBzZWxmLm9wdGlvbnMucmVhbHRpbWVFbmRQb2ludCAmJiAoIXNlbGYud3NDb25uZWN0aW9uKSl7XG4gICAgICAgICAgICB3c2Nvbm5lY3Qoc2VsZik7XG4gICAgICAgIH1cbiAgICB9KS5iaW5kKHRoaXMpKTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dPdXQgPSBmdW5jdGlvbih1cmwsIGNhbGxCYWNrKXtcbiAgICByZXR1cm4gdGhpcy4kcG9zdCgnYXBpL2xvZ291dCcse30sKGZ1bmN0aW9uKHN0YXR1cykge1xuICAgICAgICBpZiAoJ2xhc3RSV1RTdGF0dXMnIGluIGxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHtlbmRQb2ludDogdGhpcy5vcHRpb25zLmVuZFBvaW50fTtcbiAgICAgICAgaWYgKHRoaXMud3NDb25uZWN0aW9uKSB7IFxuICAgICAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICAgICAgICAgIHRoaXMud3NDb25uZWN0aW9uID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodXJsKSB7IGxvY2F0aW9uID0gdXJsOyB9XG4gICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgfSkuYmluZCh0aGlzKSk7XG59XG4qL1xudmFyIHV0aWxzID0ge1xuICAgIHJlbmFtZUZ1bmN0aW9uIDogZnVuY3Rpb24gKG5hbWUsIGZuKSB7XG4gICAgICAgIHJldHVybiAobmV3IEZ1bmN0aW9uKFwicmV0dXJuIGZ1bmN0aW9uIChjYWxsKSB7IHJldHVybiBmdW5jdGlvbiBcIiArIG5hbWUgK1xuICAgICAgICAgICAgXCIgKCkgeyByZXR1cm4gY2FsbCh0aGlzLCBhcmd1bWVudHMpIH07IH07XCIpKCkpKEZ1bmN0aW9uLmFwcGx5LmJpbmQoZm4pKTtcbiAgICB9LFxuICAgIGNhY2hlZCA6IGZ1bmN0aW9uKGZ1bmMsIGtleSl7XG4gICAgICAgIGlmICgha2V5KXsgICAgXG4gICAgICAgICAgICBrZXkgPSAnXycgKyBjYWNoZWRLZXlJZHgrKztcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiB3cmFwcGVyKCl7XG4gICAgICAgICAgICBpZiAoIXRoaXNba2V5XSl7XG4gICAgICAgICAgICAgICAgdGhpc1trZXldID0gZnVuYy5jYWxsKHRoaXMsW2FyZ3VtZW50c10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNba2V5XTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHdyYXBwZXI7XG4gICAgfSxcbi8vICAgICRQT1NUIDogJFBPU1QsXG4vLyAgICByZVdoZWVsQ29ubmVjdGlvbjogcmVXaGVlbENvbm5lY3Rpb24sXG4gICAgbG9nOiBmdW5jdGlvbigpeyBcbiAgICAgICAgY29uc29sZS5sb2coYXJndW1lbnRzKTtcbiAgICB9LFxuXG4gICAgeGRyOiBmdW5jdGlvbiAodXJsLCBkYXRhLCBhcHBsaWNhdGlvbix0b2tlbiwgZm9ybUVuY29kZSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogTWFrZSBhbiBIVFRQIFJlcXVlc3QgYW5kIHJldHVybiBpdHMgcHJvbWlzZS5cbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIHJlcTtcbiAgICAgICAgICAgIGlmICghZGF0YSkgeyBkYXRhID0ge307fVxuXG4gICAgICAgICAgICBpZihYTUxIdHRwUmVxdWVzdCkge1xuICAgICAgICAgICAgICAgIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2VEYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZSA9IHtyZXNwb25zZURhdGE6IHJlc3BvbnNlRGF0YSwgcmVzcG9uc2VUZXh0OiByZXEucmVzcG9uc2VUZXh0LHN0YXR1czogcmVxLnN0YXR1cywgcmVxdWVzdDogcmVxfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXEuc3RhdHVzID49IDIwMCAmJiByZXEuc3RhdHVzIDwgNDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYoWERvbWFpblJlcXVlc3Qpe1xuICAgICAgICAgICAgICAgIHJlcSA9IG5ldyBYRG9tYWluUmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgIHJlcS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgYWNjZXB0KHJlcS5yZXNwb25zZVRleHQscmVxLnN0YXR1c1RleHQsIHJlcSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignQ09SUyBub3Qgc3VwcG9ydGVkJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXEub3BlbignUE9TVCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgICAgICByZXEub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgICAgICBpZiAodG9rZW4pIHsgZGF0YS5fX3Rva2VuX18gPSB0b2tlbiB9XG4gICAgICAgICAgICBpZiAoIWZvcm1FbmNvZGUpe1xuICAgICAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCd0ZXh0L3BsYWluJyk7XG4gICAgICAgICAgICAgICAgZGF0YSA9IExhenkoZGF0YSkuc2l6ZSgpP0pTT04uc3RyaW5naWZ5KGRhdGEpOicnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyk7XG4gICAgICAgICAgICAgICAgZGF0YSA9IExhenkoZGF0YSkubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gayArICc9JyArIGVuY29kZVVSSSh2LnRvU3RyaW5nKCkpOyAgXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpLmpvaW4oJyYnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcS5zZW5kKGRhdGEpO1xuICAgIC8vICAgICAgICByZXEuc2VuZChudWxsKTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIGNhcGl0YWxpemUgOiBmdW5jdGlvbiAocykge1xuICAgICAgICByZXR1cm4gc1swXS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgIH0sXG5cbiAgICBoYXNoIDogZnVuY3Rpb24oc3RyKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhhc2hlZCBmdW5jdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgc3RyID0gc3RyLnRvU3RyaW5nKCk7XG4gICAgICAgIHZhciByZXQgPSAxO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDt4PHN0ci5sZW5ndGg7eCsrKXtcbiAgICAgICAgICAgIHJldCAqPSAoMSArIHN0ci5jaGFyQ29kZUF0KHgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHJldCAlIDM0OTU4Mzc0OTU3KS50b1N0cmluZygpO1xuICAgIH0sXG5cbiAgICBtYWtlRmlsdGVyIDogZnVuY3Rpb24gKG1vZGVsLCBmaWx0ZXIsIHVuaWZpZXIsIGRvbnRUcmFuc2xhdGVGaWx0ZXIpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ha2UgZmlsdGVyIGZvciBBcnJheS5maWx0ZXIgZnVuY3Rpb24gYXMgYW4gYW5kIG9mIG9yXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoIXVuaWZpZXIpIHsgdW5pZmllciA9ICcgJiYgJzt9XG4gICAgICAgIGlmIChMYXp5KGZpbHRlcikuc2l6ZSgpID09PSAwKXtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KXsgcmV0dXJuIHRydWUgfTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc291cmNlID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2YWxzLCBmaWVsZCl7XG4gICAgICAgICAgICBpZiAoIXZhbHMpIHsgdmFscyA9IFtudWxsXX1cbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWxzKSl7XG4gICAgICAgICAgICAgICAgdmFscyA9IFt2YWxzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZG9udFRyYW5zbGF0ZUZpbHRlciAmJiAobW9kZWwuZmllbGRzW2ZpZWxkXS50eXBlID09PSAncmVmZXJlbmNlJykpIHtcbiAgICAgICAgICAgICAgICBmaWVsZCA9ICdfJyArIGZpZWxkO1xuICAgICAgICAgICAgICAgIHZhbHMgPSBMYXp5KHZhbHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHggJiYgKHguY29uc3RydWN0b3IgIT09IE51bWJlcikpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobW9kZWwuZmllbGRzW2ZpZWxkXS50eXBlID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgdmFscyA9IHZhbHMubWFwKEpTT04uc3RyaW5naWZ5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAnKCcgKyAgTGF6eSh2YWxzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcoeC4nICsgZmllbGQgKyAnID09PSAnICsgeCArICcpJztcbiAgICAgICAgICAgIH0pLmpvaW4oJyB8fCAnKSAgKycpJztcbiAgICAgICAgfSkudG9BcnJheSgpLmpvaW4odW5pZmllcik7XG4gICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJ4XCIsIFwicmV0dXJuIFwiICsgc291cmNlKTtcbiAgICB9LFxuXG4gICAgc2FtZUFzIDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZXAgZXF1YWxcbiAgICAgICAgICovXG4gICAgICAgIGZvciAodmFyIGsgaW4geCkge1xuICAgICAgICAgICAgaWYgKHlba10gIT0geFtrXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIHBsdXJhbGl6ZSA6IGZ1bmN0aW9uKHN0ciwgbW9kZWwpe1xuICAgICAgICAvKipcbiAgICAgICAgICogTGV4aWNhbGx5IHJldHVybnMgZW5nbGlzaCBwbHVyYWwgZm9ybVxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIHN0ciArICdzJztcbiAgICB9LFxuXG4gICAgYmVmb3JlQ2FsbCA6IGZ1bmN0aW9uKGZ1bmMsIGJlZm9yZSl7XG4gICAgICAgIHZhciBkZWNvcmF0b3IgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgYmVmb3JlKCkudGhlbihmdW5jKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZGVjb3JhdG9yO1xuICAgIH0sXG5cbiAgICBjbGVhblN0b3JhZ2UgOiBmdW5jdGlvbigpe1xuICAgICAgICAvKipcbiAgICAgICAgICogQ2xlYW4gbG9jYWxTdG9yYWdlIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgTGF6eShsb2NhbFN0b3JhZ2UpLmtleXMoKS5lYWNoKGZ1bmN0aW9uKGspe1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtrXTtcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgY2xlYW5EZXNjcmlwdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIExhenkobG9jYWxTdG9yYWdlKVxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbih2LCBuKSB7IHJldHVybiBMYXp5KG4pLnN0YXJ0c1dpdGgoJ2Rlc2NyaXB0aW9uOicpfSlcbiAgICAgICAgICAgIC5rZXlzKClcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKG4pIHsgZGVsZXRlIGxvY2FsU3RvcmFnZVtuXSB9KTtcbiAgICB9LFxuICAgIFxuICAgIHJldmVyc2UgOiBmdW5jdGlvbiAoY2hyLCBzdHIpIHtcbiAgICAgICAgcmV0dXJuIHN0ci5zcGxpdChjaHIpLnJldmVyc2UoKS5qb2luKGNocik7XG4gICAgfSxcbiAgICBwZXJtdXRhdGlvbnM6IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgeCA9IGFyci5sZW5ndGgtMTsgeCA+PSAwO3gtLSl7XG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gYXJyLmxlbmd0aC0xOyB5ID49IDA7IHktLSl7XG4gICAgICAgICAgICAgICAgaWYgKHggIT09IHkpXG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKFthcnJbeF0sIGFyclt5XV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcblxuICAgIHdhaXRGb3I6IGZ1bmN0aW9uKGZ1bmMsIGNhbGxCYWNrKSB7XG4gICAgICAgIHZhciB3YWl0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChmdW5jKCkpIHtcbiAgICAgICAgICAgICAgICBjYWxsQmFjaygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHdhaXRlciw1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQod2FpdGVyLCA1MDApO1xuICAgIH0sXG5cbiAgICBib29sOiBCb29sZWFuLFxuXG4gICAgbm9vcCA6IGZ1bmN0aW9uKCl7fSxcblxuICAgIHR6T2Zmc2V0OiBuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCxcblxuICAgIHRyYW5zRmllbGRUeXBlOiB7XG4gICAgICAgIGRhdGU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG5ldyBEYXRlKHggKiAxMDAwICsgdXRpbHMudHpPZmZzZXQgKSB9LFxuICAgICAgICBkYXRldGltZTogZnVuY3Rpb24oeCkgeyByZXR1cm4gbmV3IERhdGUoeCAqIDEwMDAgKyB1dGlscy50ek9mZnNldCApIH0sXG4gICAgICAgIHN0cmluZzogZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b1N0cmluZygpOyB9LFxuICAgICAgICB0ZXh0OiBmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvU3RyaW5nKCk7IH0sXG4gICAgICAgIGludGVnZXI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBhcnNlSW50KHgpOyB9LFxuICAgICAgICBmbG9hdDogZnVuY3Rpb24oeCkgeyByZXR1cm4gcGFyc2VGbG9hdCh4KTsgfVxuICAgIH0sIFxuICAgIG1vY2sgOiBtb2NrT2JqZWN0XG59O1xuXG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgU1RBVFVTS0VZID0gJ2xhc3RSV1RDb25uZWN0aW9uU3RhdHVzJztcblxuZnVuY3Rpb24gUmVhbHRpbWVDb25uZWN0aW9uKGVuZFBvaW50LCByd3RDb25uZWN0aW9uKXtcbiAgICAvKipcbiAgICAgKiBDb25uZWN0cyBhIHdlYnNvY2tldCB3aXRoIHJlV2hlZWwgY29ubmVjdGlvblxuICAgICAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBjb25uZWN0aW9uID0gbmV3IFNvY2tKUyhlbmRQb2ludCk7XG4gICAgY29ubmVjdGlvbi5vbm9wZW4gPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICBjb25zb2xlLmxvZygnb3BlbiA6ICcgKyB4KTtcbiAgICAgICAgY29ubmVjdGlvbi50ZW5hbnQoKTtcbiAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1jb25uZWN0aW9uLW9wZW4nLHgpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAoeC50eXBlID09ICdtZXNzYWdlJykge1xuICAgICAgICAgICAgLy8kLm5vdGlmeSh4LmRhdGEpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvL1RPRE8gc2V0IGZyb21SZWFsdGltZVxuICAgICAgICAgICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtbWVzc2FnZS1qc29uJywgSlNPTi5wYXJzZSh4LmRhdGEpKTtcbiAgICAgICAgICAgICAgICAvL1RPRE8gdW5zZXQgZnJvbVJlYWx0aW1lXG4gICAgICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLW1lc3NhZ2UtdGV4dCcsIEpTT04ucGFyc2UoeC5kYXRhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZnJvbSByZWFsdGltZSAnLHgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9uY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNldFRpbWVvdXQodXRpbHMud3NDb25uZWN0LDEwMDApO1xuICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLWNvbm5lY3Rpb24tY2xvc2VkJyk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLnRlbmFudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29ubmVjdGlvbi5zZW5kKCdURU5BTlQ6JyArIHJ3dENvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLmFwcGxpY2F0aW9uICsgJzonICsgcnd0Q29ubmVjdGlvbi5jYWNoZWRTdGF0dXMudG9rZW4pO1xuICAgIH1cbiAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICB9XG59ICAgIFxuXG5mdW5jdGlvbiByZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgZ2V0TG9naW4pe1xuICAgIC8qKlxuICAgICAqIENvbm5lY3Rpb24gYmFzaWMgZm9yIHJlV2hlZWxcbiAgICAgKiBAcGFyYW0gZW5kUG9pbnQ6IHN0cmluZyBiYXNlIHVybCBmb3IgYWxsIGNvbXVuaWNhdGlvblxuICAgICAqIEBwYXJhbSBnZXRMb2dpbjogZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGluIGNhc2Ugb2YgbWlzc2luZyBsb2dpbi5cbiAgICAgKiAgdGhpcyBmdW5jdGlvbiBjb3VsZCByZXR1cm4gOlxuICAgICAqICAtICAgYSB7IHVzZXJuYW1lIDogPHVzZXJuYW1lPiAsIHBhc3N3b3JkOiA8cGFzc3dvcmQ+fSBvclxuICAgICAqICAtICAgYiBQcm9taXNlIC0+IHsgdXNlcm5hbWUgOiA8dXNlcm5hbWU+ICwgcGFzc3dvcmQ6IDxwYXNzd29yZD59XG4gICAgICovXG4gICAgLy8gbWFpbiBpbml0aWFsaXphdGlvblxuICAgIHZhciBldmVudHMgPSBuZXcgTmFtZWRFdmVudE1hbmFnZXIoKTtcbiAgICB0aGlzLmdldExvZ2luID0gZ2V0TG9naW47XG4gICAgdGhpcy5lbmRQb2ludCA9IGVuZFBvaW50LmVuZHNXaXRoKCcvJyk/IGVuZFBvaW50OiAoZW5kUG9pbnQgKyAnLycpO1xuICAgIHRoaXMub24gPSBldmVudHMub247XG4gICAgdGhpcy51bmJpbmQgPSBldmVudHMudW5iaW5kO1xuICAgIHRoaXMuZW1pdCA9IGV2ZW50cy5lbWl0O1xuICAgIHRoaXMub25jZSA9IGV2ZW50cy5vbmNlO1xuICAgIHRoaXMuY2FjaGVkU3RhdHVzID0ge307XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlO1xuICAgIHRoaXMuaXNMb2dnZWRJbiA9IGZhbHNlO1xuICAgIC8vIHJlZ2lzdGVyaW5nIHVwZGF0ZSBzdGF0dXNcbiAgICB2YXIgdGhzID0gdGhpcztcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS4kcG9zdCA9IGZ1bmN0aW9uKHVybCwgZGF0YSxjYWxsQmFjayl7XG4gICAgLyoqXG4gICAgICogQUpBWCBjYWxsIGZvciBmZXRjaCBhbGwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAqIEBwYXJhbSB1cmw6IGxhc3QgdXJsIHBhcnQgZm9yIGFqYXggY2FsbFxuICAgICAqIEBwYXJhbSBkYXRhOiBkYXRhIG9iamVjdCB0byBiZSBzZW50XG4gICAgICogQHBhcmFtIGNhbGxCYWNrOiBmdW5jdGlvbih4aHIpIHdpbGwgYmUgY2FsbGVkIHdoZW4gZGF0YSBhcnJpdmVzXG4gICAgICogQHJldHVybnMgUHJvbWlzZTx4aHI+IHNhbWUgb2YgY2FsbEJhY2tcbiAgICAgKi9cbiAgICAvLyBpbml0aWFsaXphdGlvblxuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih0aHMuZW5kUG9pbnQgKyB1cmwsIGRhdGEsIHRocy5jYWNoZWRTdGF0dXMuYXBwbGljYXRpb24sIHRocy5jYWNoZWRTdGF0dXMudG9rZW4pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHRocy5lbWl0KCdodHRwLXJlc3BvbnNlJywgeGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cywgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB0aHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzICsgJy1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7IGNhbGxCYWNrKCB4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQgKX07XG4gICAgICAgICAgICAgICAgYWNjZXB0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgeGhyLnN0YXR1cywgdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItanNvbi0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlRGF0YSx1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1odHRwJyx4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1odHRwLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xufTtcblxuLyoqXG4gKiBDaGVjayBjdXJyZW50IHN0YXR1cyBhbmQgY2FsbGJhY2sgZm9yIHJlc3VsdHMuXG4gKiBJdCBjYWNoZXMgcmVzdWx0cyBmb3IgZnVydGhlci5cbiAqIEBwYXJhbSBjYWxsYmFjazogKHN0YXR1cyBvYmplY3QpXG4gKiBAcGFyYW0gZm9yY2U6IGJvb2xlYW4gaWYgdHJ1ZSBlbXB0aWVzIGNhY2hlICBcbiAqIEByZXR1cm4gdm9pZFxuICovXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuc3RhdHVzID0gZnVuY3Rpb24oY2FsbEJhY2ssIGZvcmNlKSB7XG4gICAgLy8gaWYgZm9yY2UsIGNsZWFyIGFsbCBjYWNoZWQgdmFsdWVzXG4gICAgdmFyIGtleSA9ICd0b2tlbjonICsgdGhpcy5lbmRQb2ludDtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICBpZiAoZm9yY2UpIHtcbiAgICAgICAgdGhpcy5jYWNoZWRTdGF0dXMgPSB7fTtcbiAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtrZXldO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdGF0dXNXYWl0aW5nKSB7XG4gICAgICAgIC8vIHdhaXQgZm9yIHN0YXR1c1xuICAgICAgICB1dGlscy53YWl0Rm9yKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICF0aHMuc3RhdHVzV2FpdGluZztcbiAgICAgICAgfSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRocy5zdGF0dXMoY2FsbEJhY2ssZm9yY2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyB0cnkgZm9yIHZhbHVlIHJlc29sdXRpb25cbiAgICAvLyBmaXJzdCBvbiBtZW1vcnlcbiAgICBpZiAoTGF6eSh0aGlzLmNhY2hlZFN0YXR1cykuc2l6ZSgpKXtcbiAgICAgICAgY2FsbEJhY2sodGhpcy5jYWNoZWRTdGF0dXMpXG4gICAgLy8gdGhlbiBpbiBsb2NhbFN0b3JhZ2VcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICBpZiAoa2V5IGluIGxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgICAgZGF0YS5fX3Rva2VuX18gPSBsb2NhbFN0b3JhZ2Vba2V5XTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0YXR1c1dhaXRpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLiRwb3N0KCdhcGkvc3RhdHVzJyxkYXRhLCBmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyhzdGF0dXMpO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlW2tleV0gPSBzdGF0dXMudG9rZW47XG4gICAgICAgICAgICBjYWxsQmFjayhzdGF0dXMpO1xuICAgICAgICAgICAgdGhzLnN0YXR1c1dhaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGRvZXNuJ3QgY2FsbCBjYWxsYmFja1xuICAgICAgICByZXR1cm5cbiAgICB9XG4gICAgY2FsbEJhY2sodGhpcy5jYWNoZWRTdGF0dXMpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgdmFyIGxhc3RCdWlsZCA9IHBhcnNlRmxvYXQobG9jYWxTdG9yYWdlLmxhc3RCdWlsZCkgfHwgMTtcbiAgICBpZiAobGFzdEJ1aWxkIDwgc3RhdHVzLmxhc3RfYnVpbGQpe1xuICAgICAgICB1dGlscy5jbGVhbkRlc2NyaXB0aW9uKCk7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0QnVpbGQgPSBzdGF0dXMubGFzdF9idWlsZDtcbiAgICB9XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IEJvb2xlYW4oc3RhdHVzLnRva2VuKTtcbiAgICB0aGlzLmlzTG9nZ2VkSW4gPSBCb29sZWFuKHN0YXR1cy51c2VyX2lkKTtcbiAgICB2YXIgb2xkU3RhdHVzID0gdGhpcy5jYWNoZWRTdGF0dXM7XG4gICAgdGhpcy5jYWNoZWRTdGF0dXMgPSBzdGF0dXM7XG4gICAgaWYgKCFvbGRTdGF0dXMudXNlcl9pZCAmJiBzdGF0dXMudXNlcl9pZCl7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9nZ2VkLWluJyxzdGF0dXMudXNlcl9pZCk7XG4gICAgfSBlbHNlIGlmIChvbGRTdGF0dXMudXNlcl9pZCAmJiAhc3RhdHVzLnVzZXJfaWQpe1xuICAgICAgICB0aGlzLmVtaXQoJ2xvZ2dlZC1vdXQnKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNDb25uZWN0ZWQgJiYgIXRoaXMuaXNMb2dnZWRJbil7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9naW4tcmVxdWlyZWQnKTtcbiAgICAgICAgaWYgKHRoaXMuZ2V0TG9naW4pe1xuICAgICAgICAgICAgdmFyIGxvZ2luSW5mbyA9IHRoaXMuZ2V0TG9naW4oKTtcbiAgICAgICAgICAgIGlmIChsb2dpbkluZm8uY29uc3RydWN0b3IgPT09IE9iamVjdCl7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dpbihsb2dpbkluZm8udXNlcm5hbWUsIGxvZ2luSW5mby5wYXNzd29yZCwgbG9naW5JbmZvLmNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9naW5JbmZvLmNvbnN0cnVjdG9yID09PSBQcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgbG9naW5JbmZvLnRoZW4oZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2dpbihvYmoudXNlcm5hbWUsIG9iai5wYXNzd29yZCwgb2JqLmNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIHJlYWx0aW1lIGNvbm5lY3Rpb24gaXMgc2V0dGVkXG4gICAgaWYgKCFvbGRTdGF0dXMucmVhbHRpbWVFbmRQb2ludCAmJiBzdGF0dXMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICB0aGlzLndzQ29ubmVjdGlvbiA9IG5ldyBSZWFsdGltZUNvbm5lY3Rpb24oc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQsIHRoaXMpO1xuICAgIC8vIHJlYWx0aW1lIGNvbm5lY3Rpb24gaXMgY2xvc2VkXG4gICAgfSBlbHNlIGlmIChvbGRTdGF0dXMucmVhbHRpbWVFbmRQb2ludCAmJiAhc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICAgICAgZGVsZXRlIHRoaXMud3NDb25uZWN0aW9uO1xuICAgIH1cbiAgICB0aGlzLmVtaXQoJ3VwZGF0ZS1jb25uZWN0aW9uLXN0YXR1cycsIHN0YXR1cywgb2xkU3RhdHVzKTtcbiAgICBsb2NhbFN0b3JhZ2VbU1RBVFVTS0VZXSA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG59XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCl7XG4gICAgLyoqXG4gICAgICogbWFrZSBsb2dpbiBhbmQgcmV0dXJuIGEgcHJvbWlzZS4gSWYgbG9naW4gc3VjY2VkLCBwcm9taXNlIHdpbGwgYmUgYWNjZXB0ZWRcbiAgICAgKiBJZiBsb2dpbiBmYWlscyBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aCBlcnJvclxuICAgICAqIEBwYXJhbSB1c2VybmFtZTogdXNlcm5hbWVcbiAgICAgKiBAcGFyYW0gcGFzc3dvcmQ6IHBhc3N3b3JkXG4gICAgICogQHJldHVybiBQcm9taXNlICh1c2VyIG9iamVjdClcbiAgICAgKi9cbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLmVuZFBvaW50ICsgJ2FwaS9sb2dpbicsIHt1c2VybmFtZTogdXNlcm5hbWUgfHwgJycsIHBhc3N3b3JkOiBwYXNzd29yZCB8fCAnJ30sbnVsbCx0aHMuY2FjaGVkU3RhdHVzLnRva2VuLCB0cnVlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgc3RhdHVzXG4gICAgICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyh4aHIucmVzcG9uc2VEYXRhKTtcbiAgICAgICAgICAgICAgICAvLyBjYWxsIHdpdGggdXNlciBpZFxuICAgICAgICAgICAgICAgIGFjY2VwdCh7c3RhdHVzIDogJ3N1Y2Nlc3MnLCB1c2VyaWQ6IHRocy5jYWNoZWRTdGF0dXMudXNlcl9pZH0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgZXJyb3IgY2FsbCBlcnJvciBtYW5hZ2VyIHdpdGggZXJyb3JcbiAgICAgICAgICAgICAgICBhY2NlcHQoe2Vycm9yOiB4aHIucmVzcG9uc2VEYXRhLmVycm9yLCBzdGF0dXM6ICdlcnJvcid9KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KSB7XG4gICAgICAgIHRocy4kcG9zdCgnYXBpL2xvZ291dCcpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihvayl7XG4gICAgICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyh7fSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtTVEFUVVNLRVldO1xuICAgICAgICAgICAgICAgIGFjY2VwdCgpXG4gICAgICAgICAgICB9LCByZWplY3QpO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbihjYWxsQmFjaykge1xuICAgIGlmICh0aGlzLmlzTG9nZ2VkSW4pIHtcbiAgICAgICAgY2FsbEJhY2sodGhpcy5jYWNoZWRTdGF0dXMudXNlcl9pZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gd2FpdCBmb3IgbG9naW5cbiAgICAgICAgdGhpcy5vbmNlKCdsb2dnZWQtaW4nLGZ1bmN0aW9uKHVzZXJfaWQpe1xuICAgICAgICAgICAgY2FsbEJhY2sodXNlcl9pZCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnN0YXR1cyhjYWxsQmFjayB8fCB1dGlscy5ub29wKTtcbiAgICB9XG59XG5cbnV0aWxzLnJlV2hlZWxDb25uZWN0aW9uID0gcmVXaGVlbENvbm5lY3Rpb247IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBUb3VjaGVyKCl7XG4gICAgdmFyIHRvdWNoZWQgPSBmYWxzZVxuICAgIHRoaXMudG91Y2ggPSBmdW5jdGlvbigpe1xuICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcbiAgICB9O1xuICAgIHRoaXMudG91Y2hlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB0ID0gdG91Y2hlZDtcbiAgICAgICAgdG91Y2hlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gdDtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cblxuZnVuY3Rpb24gVmFjdXVtQ2FjaGVyKHRvdWNoLCBhc2tlZCwgbmFtZSwgcGtJbmRleCl7XG4vKlxuICAgIGlmIChuYW1lKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdjcmVhdGVkIFZhY3V1bUNhY2hlciBhcyAnICsgbmFtZSk7XG4gICAgfVxuKi9cbiAgICBpZiAoIWFza2VkKXtcbiAgICAgICAgdmFyIGFza2VkID0gW107XG4gICAgfVxuICAgIHZhciBtaXNzaW5nID0gW107XG4gICAgXG4gICAgdGhpcy5hc2sgPSBmdW5jdGlvbiAoaWQsbGF6eSl7XG4gICAgICAgIGlmIChwa0luZGV4ICYmIChpZCBpbiBwa0luZGV4LnNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIUxhenkoYXNrZWQpLmNvbnRhaW5zKGlkKSl7XG4vLyAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnYXNraW5nICgnICsgaWQgKyAnKSBmcm9tICcgKyBuYW1lKTtcbiAgICAgICAgICAgIG1pc3NpbmcucHVzaChpZCk7XG4gICAgICAgICAgICBpZiAoIWxhenkpXG4gICAgICAgICAgICAgICAgYXNrZWQucHVzaChpZCk7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICB9IFxuLy8gICAgICAgIGVsc2UgY29uc29sZS53YXJuKCcoJyArIGlkICsgJykgd2FzIGp1c3QgYXNrZWQgb24gJyArIG5hbWUpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEFza2VkSW5kZXggPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gYXNrZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5taXNzaW5ncyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBMYXp5KG1pc3Npbmcuc3BsaWNlKDAsbWlzc2luZy5sZW5ndGgpKS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgfVxufVxuIiwiZnVuY3Rpb24gQXV0b0xpbmtlcihhY3RpdmVzLCBJREIsIFcyUFJFU09VUkNFLCBsaXN0Q2FjaGUpe1xuICAgIHZhciB0b3VjaCA9IG5ldyBUb3VjaGVyKCk7XG4gICAgdmFyIG1haW5JbmRleCA9IHt9O1xuICAgIHZhciBmb3JlaWduS2V5cyA9IHt9O1xuICAgIHZhciBtMm0gPSB7fTtcbiAgICB2YXIgbTJtSW5kZXggPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbnMgPSB7fTtcbiAgICB0aGlzLm1haW5JbmRleCA9IG1haW5JbmRleDtcbiAgICB0aGlzLmZvcmVpZ25LZXlzID0gZm9yZWlnbktleXM7XG4gICAgdGhpcy5tMm0gPSBtMm07XG4gICAgdGhpcy5tMm1JbmRleCA9IG0ybUluZGV4O1xuICAgIHRoaXMucGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucztcblxuICAgIFcyUFJFU09VUkNFLm9uKCdtb2RlbC1kZWZpbml0aW9uJyxmdW5jdGlvbihtb2RlbCwgaW5kZXgpe1xuICAgICAgICAvLyBkZWZpbmluZyBhbGwgaW5kZXhlcyBmb3IgcHJpbWFyeSBrZXlcbiAgICAgICAgdmFyIHBrSW5kZXggPSBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IobW9kZWwubmFtZSwgJ2lkJyk7XG4gICAgICAgIG1haW5JbmRleFttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIHBrSW5kZXgsICdtYWluSW5kZXguJyArIG1vZGVsLm5hbWUsIGluZGV4KTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0aW5nIHBlcm1pc3Npb24gaW5kZXhlc1xuICAgICAgICBwZXJtaXNzaW9uc1ttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwgJ3Blcm1pc3Npb25zLicgKyBtb2RlbC5uYW1lKTtcblxuICAgICAgICAvLyBjcmVhdGluZyBpbmRleGVzIGZvciBmb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uKHJlZmVyZW5jZSl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWwubmFtZSArICdfJyArIHJlZmVyZW5jZS5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IocmVmZXJlbmNlLnRvLCAnaWQnKSwgcmVmZXJlbmNlLnRvICsgJy5pZCBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGNyZWF0aW5nIHJldmVyc2UgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkO1xuICAgICAgICAgICAgZm9yZWlnbktleXNbaW5kZXhOYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIGxpc3RDYWNoZS5nZXRJbmRleEZvcihmaWVsZC5ieSxmaWVsZC5pZCksIGZpZWxkLmJ5ICsgJy4nICsgZmllbGQuaWQgKyAnIGZvcmVpZ25LZXlzLicgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtb2RlbC5tYW55VG9NYW55KS5lYWNoKGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm0pKVxuICAgICAgICAgICAgICAgIG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdID0gW25ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUgKyAnWzBdJyksIG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUrJ1sxXScpXTtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm1JbmRleCkpXG4gICAgICAgICAgICAgICAgbTJtSW5kZXhbcmVsYXRpb24uaW5kZXhOYW1lXSA9IG5ldyBNYW55VG9NYW55UmVsYXRpb24ocmVsYXRpb24sbTJtW3JlbGF0aW9uLmluZGV4TmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgbTJtR2V0ID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayl7XG4gICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KChuID8gdXRpbHMucmV2ZXJzZSgnLycsIGluZGV4TmFtZSkgOiBpbmRleE5hbWUpICsgJ3MnICsgJy9saXN0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgZGVsZXRlIGFjdGl2ZXNbaW5kZXhOYW1lXVxuICAgICAgICB9KTsgICAgICAgIFxuICAgIH07XG5cbiAgICB2YXIgZ2V0TTJNID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBjb2xsZWN0aW9uLCBuLCBjYWxsQmFjayl7XG4gICAgICAgIC8vIGFzayBhbGwgaXRlbXMgaW4gY29sbGVjdGlvbiB0byBtMm0gaW5kZXhcbiAgICAgICAgTGF6eShjb2xsZWN0aW9uKS5lYWNoKG0ybVtpbmRleE5hbWVdW25dLmFzay5iaW5kKG0ybVtpbmRleE5hbWVdW25dKSk7XG4gICAgICAgIC8vIHJlbmV3aW5nIGNvbGxlY3Rpb24gd2l0aG91dCBhc2tlZFxuICAgICAgICBjb2xsZWN0aW9uID0gbTJtW2luZGV4TmFtZV1bbl0ubWlzc2luZ3MoKTtcbiAgICAgICAgLy8gY2FsbGluZyByZW1vdGUgZm9yIG0ybSBjb2xsZWN0aW9uIGlmIGFueVxuICAgICAgICBpZiAoY29sbGVjdGlvbi5sZW5ndGgpe1xuICAgICAgICAgICAgYWN0aXZlc1tpbmRleE5hbWVdID0gMTtcbiAgICAgICAgICAgIG0ybUdldChpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGNhbGxCYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuZ2V0TTJNID0gZ2V0TTJNO1xuXG4gICAgdmFyIGxpbmtVbmxpbmtlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIHBlcmZvcm0gYSBEYXRhQmFzZSBzeW5jaHJvbml6YXRpb24gd2l0aCBzZXJ2ZXIgbG9va2luZyBmb3IgdW5rbm93biBkYXRhXG4gICAgICAgIGlmICghdG91Y2gudG91Y2hlZCgpKSByZXR1cm47XG4gICAgICAgIGlmIChMYXp5KGFjdGl2ZXMpLnZhbHVlcygpLnN1bSgpKSB7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGluZGV4ZXMsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICBMYXp5KGluZGV4ZXMpLmVhY2goZnVuY3Rpb24gKGluZGV4LG4pIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IGluZGV4Lm1pc3NpbmdzKCk7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IExhenkoY29sbGVjdGlvbikuZmlsdGVyKEJvb2xlYW4pLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIElOREVYID0gbTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdldHRlciA9IElOREVYWydnZXQnICsgKDEgLSBuKV0uYmluZChJTkRFWCk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBjb2xsZWN0aW9uLm1hcChnZXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvdGhlckluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcvJylbMSAtIG5dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG90aGVySW5kZXgsZnVuY3Rpb24oKXtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2gobWFpbkluZGV4W290aGVySW5kZXhdLmFzayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoaWRzKS5mbGF0dGVuKCkudW5pcXVlKCkuZWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1haW5JbmRleFtvdGhlckluZGV4XS5hc2soeCx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtYWluSW5kZXgpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIHZhciBpZHMgPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgaWRiID0gbW9kZWxOYW1lIGluIElEQiA/IElEQlttb2RlbE5hbWVdLmtleXMoKSA6IExhenkoKTtcbiAgICAgICAgICAgICAgICAvL2xvZygnbGlua2luZy4nICsgbW9kZWxOYW1lICsgJyA9ICcgKyBXMlBSRVNPVVJDRS5saW5raW5nLnNvdXJjZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIHtpZDogaWRzfSxudWxsLHV0aWxzLm5vb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gRm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkoZm9yZWlnbktleXMpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICAgICAgICByZXR1cm4gdlsxXS5sZW5ndGhcbiAgICAgICAgfSkuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICB2YXIgaWRzID0geFsxXTtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSB4WzBdO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgbWFpblJlc291cmNlID0gaW5kZXhbMF07XG4gICAgICAgICAgICB2YXIgZmllbGROYW1lID0gaW5kZXhbMV07XG4gICAgICAgICAgICB2YXIgZmlsdGVyID0ge307XG4gICAgICAgICAgICBmaWx0ZXJbZmllbGROYW1lXSA9IGlkcztcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1haW5SZXNvdXJjZSwgZmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBMYXp5KExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgcmV0dXJuIFtrLCB2Lm1pc3NpbmdzKCldXG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLnRvT2JqZWN0KCkpLmVhY2goZnVuY3Rpb24gKGlkcywgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICBhY3RpdmVzW3Jlc291cmNlTmFtZV0gPSAxO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHJlc291cmNlTmFtZSArICcvbXlfcGVybXMnLCB7aWRzOiBMYXp5KGlkcykudW5pcXVlKCkudG9BcnJheSgpfSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoZGF0YS5QRVJNSVNTSU9OUyk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW3Jlc291cmNlTmFtZV1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHNldEludGVydmFsKGxpbmtVbmxpbmtlZCw1MCk7XG59O1xuXG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBMaXN0Q2FjaGVyKCl7XG4gICAgdmFyIGdvdEFsbCA9IHt9O1xuICAgIHZhciBhc2tlZCA9IHt9OyAvLyBtYXAgb2YgYXJyYXlcbiAgICB2YXIgY29tcG9zaXRlQXNrZWQgPSB7fTtcbiAgICB2YXIgY2FydGVzaWFuUHJvZHVjdDEgPSBmdW5jdGlvbih4LHksaXNBcnJheSl7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgaWYgKGlzQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4geCl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYiBpbiB5KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goTGF6eShbeFthXSx5W2JdXSkuZmxhdHRlbigpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgYSBpbiB4KXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBiIGluIHkpe1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChbeFthXSx5W2JdXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICB2YXIgY2FydGVzaWFuUHJvZHVjdCA9IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciBpc0FycmF5ID0gZmFsc2U7XG4gICAgICAgIHZhciByZXQgPSBhcnJbMF07IFxuICAgICAgICBmb3IgKHZhciB4ID0gMTsgeCA8IGFyci5sZW5ndGg7ICsreCl7XG4gICAgICAgICAgICByZXQgPSBjYXJ0ZXNpYW5Qcm9kdWN0MShyZXQsIGFyclt4XSwgaXNBcnJheSk7XG4gICAgICAgICAgICBpc0FycmF5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgICB2YXIgZXhwbG9kZUZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICB2YXIgcHJvZHVjdCA9IGNhcnRlc2lhblByb2R1Y3QoTGF6eShmaWx0ZXIpLnZhbHVlcygpLnRvQXJyYXkoKSk7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLmtleXMoKS50b0FycmF5KCk7XG4gICAgICAgIHJldHVybiBwcm9kdWN0Lm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhciByID0ge307XG4gICAgICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oYSxuKXtcbiAgICAgICAgICAgICAgICByW2FdID0geFtuXTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH07XG4gICAgdmFyIGZpbHRlclNpbmdsZSA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIsIHRlc3RPbmx5KXtcbiAgICAgICAgLy8gTGF6eSBhdXRvIGNyZWF0ZSBpbmRleGVzXG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG4gICAgICAgIHZhciBnZXRJbmRleEZvciA9IHRoaXMuZ2V0SW5kZXhGb3I7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2LGtleSl7IHJldHVybiBba2V5LCBtb2RlbE5hbWUgKyAnLicgKyBrZXldOyB9KS50b09iamVjdCgpO1xuICAgICAgICB2YXIgaW5kZXhlcyA9IExhenkoZmlsdGVyKS5rZXlzKCkubWFwKGZ1bmN0aW9uKGtleSl7IHJldHVybiBba2V5LCBnZXRJbmRleEZvcihtb2RlbE5hbWUsIGtleSldfSkudG9PYmplY3QoKTsgXG4gICAgICAgIC8vIGZha2UgZm9yIChpdCB3aWxsIGN5Y2xlIG9uY2UpXG4gICAgICAgIGZvciAodmFyIHggaW4gZmlsdGVyKXtcbiAgICAgICAgICAgIC8vIGdldCBhc2tlZCBpbmRleCBhbmQgY2hlY2sgcHJlc2VuY2VcbiAgICAgICAgICAgIHZhciBkaWZmZXJlbmNlID0gTGF6eShmaWx0ZXJbeF0pLmRpZmZlcmVuY2UoaW5kZXhlc1t4XSkudG9BcnJheSgpO1xuICAgICAgICAgICAgaWYgKGRpZmZlcmVuY2UubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAvLyBnZW5lcmF0ZSBuZXcgZmlsdGVyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IExhenkoW1t4LCBkaWZmZXJlbmNlXV0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgLy8gcmVtZW1iZXIgYXNrZWRcbiAgICAgICAgICAgICAgICBpZiAoIXRlc3RPbmx5KVxuICAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShpbmRleGVzW3hdLCBkaWZmZXJlbmNlKTtcbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUgZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikgKyAnXFxuT3V0IDonICsgSlNPTi5zdHJpbmdpZnkocmV0KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6IG51bGwnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY2xlYW5Db21wb3NpdGVzID0gZnVuY3Rpb24obW9kZWwsZmlsdGVyKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGNsZWFuIGNvbXBvc2l0ZUFza2VkXG4gICAgICAgICAqL1xuICAgICAgICAvLyBsYXp5IGNyZWF0ZSBjb25kaXRpb25hbCBhc2tlZCBpbmRleFxuICAgICAgICBpZiAoIShtb2RlbC5uYW1lIGluIGNvbXBvc2l0ZUFza2VkKSkgeyBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXSA9IFtdIH07XG4gICAgICAgIHZhciBpbmRleCA9IGNvbXBvc2l0ZUFza2VkW21vZGVsLm5hbWVdO1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGFsbCBlbGVtZW50cyB3aG8gaGF2ZSBzYW1lIHBhcnRpYWxcbiAgICAgICAgdmFyIGZpbHRlckxlbiA9IExhenkoZmlsdGVyKS5zaXplKCk7XG4gICAgICAgIHZhciBpdGVtcyA9IGluZGV4LmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIsICcgJiYgJyx0cnVlKSkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0peyBMYXp5KGl0ZW0pLnNpemUoKSA+IGZpbHRlckxlbiB9KTtcbi8vICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgOicgKyBKU09OLnN0cmluZ2lmeShpdGVtcykpO1xuICAgIH07XG5cbiAgICB0aGlzLmZpbHRlciA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIpe1xuLy8gICAgICAgIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLS0tLS0tLS1cXG5maWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSk7XG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG5cbiAgICAgICAgLy8gaWYgeW91IGZldGNoIGFsbCBvYmplY3RzIGZyb20gc2VydmVyLCB0aGlzIG1vZGVsIGhhcyB0byBiZSBtYXJrZWQgYXMgZ290IGFsbDtcbiAgICAgICAgdmFyIGZpbHRlckxlbiAgPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICBzd2l0Y2ggKGZpbHRlckxlbikge1xuICAgICAgICAgICAgY2FzZSAwIDoge1xuICAgICAgICAgICAgICAgIC8vIHJldHVybiBudWxsIG9yIGFsbFxuICAgICAgICAgICAgICAgIHZhciBnb3QgPSBnb3RBbGxbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICBnb3RBbGxbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBhc2tlZCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhc2tlZFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdXQgOiBudWxsIChnb3QgYWxsKScpO1xuICAgICAgICAgICAgICAgIC8vIGNvbmRpdGlvbmFsIGNsZWFuXG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBjb21wb3NpdGVBc2tlZCl7IFxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGdvdClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAxIDoge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBmaWx0ZXJTaW5nbGUuY2FsbCh0aGlzLCBtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgICAgICBjbGVhbkNvbXBvc2l0ZXMuY2FsbCh0aGlzLCBtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICB2YXIgc2luZ2xlID0gTGF6eShmaWx0ZXIpLmtleXMoKS5zb21lKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdmFyIGYgPSB7fTtcbiAgICAgICAgICAgIGZba2V5XSA9IGZpbHRlcltrZXldO1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlclNpbmdsZS5jYWxsKHRocywgbW9kZWwsIGYsIHRydWUpID09IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc2luZ2xlKSB7IHJldHVybiBudWxsIH1cbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29tcG9zaXRlQXNrZWRcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGNvbXBvc2l0ZUFza2VkKSl7IGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0gPSBbXTsgfVxuICAgICAgICAvLyBleHBsb2RlIGZpbHRlclxuICAgICAgICB2YXIgZXhwbG9kZWQgPSBleHBsb2RlRmlsdGVyKGZpbHRlcik7XG4gICAgICAgIC8vIGNvbGxlY3QgcGFydGlhbHNcbiAgICAgICAgdmFyIHBhcnRpYWxzID0gY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXS5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnIHx8ICcsdHJ1ZSkpO1xuICAgICAgICAvLyBjb2xsZWN0IG1pc3NpbmdzIChleHBsb2RlZCAtIHBhcnRpYWxzKVxuICAgICAgICBpZiAocGFydGlhbHMubGVuZ3RoKXtcbiAgICAgICAgICAgIHZhciBiYWQgID0gW107XG4gICAgICAgICAgICAvLyBwYXJ0aWFsIGRpZmZlcmVuY2VcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gcGFydGlhbHMpe1xuICAgICAgICAgICAgICAgIGJhZC5wdXNoLmFwcGx5KGJhZCxleHBsb2RlZC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgcGFydGlhbHNbeF0sJyAmJiAnLCB0cnVlKSkpO1xuICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICBjb25zb2xlLmxvZygnZXhwbG9kZWQgLSBwYXJ0aWFsIDogJyArIEpTT04uc3RyaW5naWZ5KGJhZCkpO1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gTGF6eShleHBsb2RlZCkuZGlmZmVyZW5jZShiYWQpLnRvQXJyYXkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IGV4cGxvZGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZmlsdGVyIHBhcnRpYWxzXG4gICAgICAgIGlmIChtaXNzaW5ncy5sZW5ndGgpe1xuICAgICAgICAgICAgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXS5wdXNoLmFwcGx5KGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0sbWlzc2luZ3MpO1xuICAgICAgICAgICAgLy8gYWdncmVnYXRlIG1pc3NpbmdzXG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBMYXp5KGZpbHRlcikua2V5cygpLm1hcChmdW5jdGlvbihrZXkpe1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBMYXp5KG1pc3NpbmdzKS5wbHVjayhrZXkpLnVuaXF1ZSgpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2tleSwgcmV0Lmxlbmd0aD9yZXQ6ZmlsdGVyW2tleV1dO1xuICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbi8vICAgICAgICAgICAgY29uc29sZS5sb2coJ291dCA6ICcgKyBKU09OLnN0cmluZ2lmeShtaXNzaW5ncykpO1xuICAgICAgICAgICAgLy8gY2xlYW4gY29uZGl0aW9uYWxcbiAgICAgICAgICAgIGNsZWFuQ29tcG9zaXRlcyhtb2RlbCwgbWlzc2luZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIG1pc3NpbmdzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEluZGV4Rm9yID0gZnVuY3Rpb24obW9kZWxOYW1lLCBmaWVsZE5hbWUpe1xuICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWxOYW1lICsgJy4nICsgZmllbGROYW1lO1xuICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gYXNrZWQpKXtcbiAgICAgICAgICAgIGFza2VkW2luZGV4TmFtZV0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXNrZWRbaW5kZXhOYW1lXTtcbiAgICB9XG59OyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybSl7XG4gICAgdmFyIGl0ZW1zID0gW107XG4gICAgdGhpcy5hZGQgPSBpdGVtcy5wdXNoLmJpbmQoaXRlbXMpO1xuICAgIHRoaXMuYWRkID0gZnVuY3Rpb24oaXRlbSl7XG4gIC8vICAgICAgY29uc29sZS5sb2coJ2FkZGluZyAnICsgaXRlbSk7XG4gICAgICAgIGlmICghKExhenkoaXRlbXMpLmZpbmQoaXRlbSkpKXtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmdldDAgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVsxXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjFcIikudG9BcnJheSgpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldDEgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVswXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMV0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjBcIikudG9BcnJheSgpO1xuICAgIH07XG4gICAgdGhpc1snZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVsYXRpb24uaW5kZXhOYW1lLnNwbGl0KCcvJylbMV0pXSA9IHRoaXMuZ2V0MTtcbiAgICB0aGlzWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWxhdGlvbi5pbmRleE5hbWUuc3BsaXQoJy8nKVswXSldID0gdGhpcy5nZXQwO1xuXG4gICAgdGhpcy5kZWwgPSBmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgdmFyIGwgPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgIHZhciBpZHggPSBudWxsO1xuICAgICAgICBmb3IgKHZhciBhID0gMDsgYSA8IGw7IGErKyl7IFxuICAgICAgICAgICAgaWYgKChpdGVtc1thXVswXSA9PT0gaXRlbVswXSkgJiYgKGl0ZW1zW2FdWzFdID09PSBpdGVtWzFdKSl7XG4gICAgICAgICAgICAgICAgaWR4ID0gYTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaWR4KXtcbiAgICAgICAgICAgIGl0ZW1zLnNwbGljZShhLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgJywgaXRlbSk7XG4gICAgfTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGNhY2hlZFByb3BlcnR5QnlFdmVudHMocHJvdG8sIHByb3BlcnR5TmFtZSxnZXR0ZXIsIHNldHRlcil7XG4gICAgdmFyIGV2ZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyw0KTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgXG4gICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICBwcm90by5vcm0ub24oZXZlbnQsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJlc3VsdCA9IHt9O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgcHJvcGVydHlEZWYgPSB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gY2FjaGVkKCl7XG4gICAgICAgICAgICBpZiAoISh0aGlzLmlkIGluIHJlc3VsdCkpe1xuICAgICAgICAgICAgICAgIHJlc3VsdFt0aGlzLmlkXSA9IGdldHRlci5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaWYgKHNldHRlcil7XG4gICAgICAgIHByb3BlcnR5RGVmWydzZXQnXSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gcmVzdWx0W3RoaXMuaWRdKXtcbiAgICAgICAgICAgICAgICBzZXR0ZXIuY2FsbCh0aGlzLHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCBpbiByZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIHByb3BlcnR5TmFtZSxwcm9wZXJ0eURlZik7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvcihkYXRhKXtcbiAgICB0aGlzLnJlc291cmNlID0gZGF0YS5fcmVzb3VyY2U7XG4gICAgdGhpcy5mb3JtSWR4ID0gZGF0YS5mb3JtSWR4O1xuICAgIHRoaXMuZmllbGRzID0gZGF0YS5lcnJvcnM7XG59XG52YXIgYmFzZU9STSA9IGZ1bmN0aW9uKG9wdGlvbnMsIGV4dE9STSl7XG4gICAgXG4gICAgLy8gY3JlYXRpbmcgcmV3aGVlbCBjb25uZWN0aW9uXG4gICAgaWYgKG9wdGlvbnMuY29uc3RydWN0b3IgPT09IFN0cmluZyl7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gbmV3IHJlV2hlZWxDb25uZWN0aW9uKG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gdXRpbHMucmVXaGVlbENvbm5lY3Rpb24pe1xuICAgICAgICB2YXIgY29ubmVjdGlvbiA9IG9wdGlvbnM7XG4gICAgfVxuICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgY29ubmVjdGlvbi5vbignY29ubmVjdGVkJywgZnVuY3Rpb24oKXsgXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICB9KTtcbiAgICB0aGlzLm9uID0gY29ubmVjdGlvbi5vbjtcbiAgICB0aGlzLmVtaXQgPSBjb25uZWN0aW9uLmVtaXQ7XG4gICAgdGhpcy51bmJpbmQgPSBjb25uZWN0aW9uLnVuYmluZDtcbiAgICB0aGlzLm9uY2UgPSBjb25uZWN0aW9uLm9uY2U7XG4gICAgdGhpcy4kcG9zdCA9IGNvbm5lY3Rpb24uJHBvc3QuYmluZChjb25uZWN0aW9uKTtcblxuICAgIC8vIGhhbmRsaW5nIHdlYnNvY2tldCBldmVudHNcbiAgICB0aGlzLm9uKCd3cy1jb25uZWN0ZWQnLGZ1bmN0aW9uKHdzKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdXZWJzb2NrZXQgY29ubmVjdGVkJyk7XG4gICAgICAgIC8vIGFsbCBqc29uIGRhdGEgaGFzIHRvIGJlIHBhcnNlZCBieSBnb3REYXRhXG4gICAgICAgIHdzLm9uTWVzc2FnZUpzb24oVzJQUkVTT1VSQ0UuZ290RGF0YS5iaW5kKFcyUFJFU09VUkNFKSk7XG4gICAgICAgIC8vXG4gICAgICAgIHdzLm9uTWVzc2FnZVRleHQoZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8oJ1dTIG1lc3NhZ2UgOiAnICsgbWVzc2FnZSlcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5vbignd3MtZGlzY29ubmVjdGVkJywgZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmVycm9yKCdXZWJzb2NrZXQgZGlzY29ubmVjdGVkJylcbiAgICB9KTtcbiAgICB0aGlzLm9uKCdlcnJvci1qc29uLTQwNCcsZnVuY3Rpb24oZXJyb3IsdXJsLCBzZW50RGF0YSwgeGhyKXsgXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0pTT04gZXJyb3IgJywgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1t1cmwuc3BsaXQoJy8nKVswXV07XG4gICAgfSk7XG4gICAgdGhpcy5vbigncmVhbHRpbWUtbWVzc2FnZS1qc29uJywgZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEobWVzc2FnZSk7XG4gICAgfSk7XG5cbiAgICAvLyBpbml0aWFsaXphdGlvblxuICAgIHZhciBXMlBSRVNPVVJDRSA9IHRoaXM7XG4gICAgdmFyIElEQiA9IHthdXRoX2dyb3VwIDogTGF6eSh7fSl9OyAvLyB0YWJsZU5hbWUgLT4gZGF0YSBhcyBBcnJheVxuICAgIHZhciBJRFggPSB7fTsgLy8gdGFibGVOYW1lIC0+IExhenkoaW5kZXhCeSgnaWQnKSkgLT4gSURCW2RhdGFdXG4gICAgdmFyIFJFVklEWCA9IHt9OyAvLyB0YWJsZU5hbWUgLT4gZmllbGROYW1lIC0+IExhenkuZ3JvdXBCeSgpIC0+IElEQltEQVRBXVxuICAgIHZhciBidWlsZGVySGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgYnVpbGRlckhhbmRsZXJVc2VkID0ge307XG4gICAgdmFyIHBlcnNpc3RlbnRBdHRyaWJ1dGVzID0ge307XG4gICAgdmFyIGV2ZW50SGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbldhaXRpbmcgPSB7fTtcbiAgICB2YXIgbW9kZWxDYWNoZSA9IHt9O1xuICAgIHZhciBmYWlsZWRNb2RlbHMgPSB7fTtcbiAgICB2YXIgd2FpdGluZ0Nvbm5lY3Rpb25zID0ge30gLy8gYWN0dWFsIGNvbm5lY3Rpb24gd2hvIGknbSB3YWl0aW5nIGZvclxuICAgIHZhciBsaXN0Q2FjaGUgPSBuZXcgTGlzdENhY2hlcihMYXp5KTtcbiAgICB2YXIgbGlua2VyID0gbmV3IEF1dG9MaW5rZXIod2FpdGluZ0Nvbm5lY3Rpb25zLElEQiwgdGhpcywgbGlzdENhY2hlKTtcbi8qICAgIHdpbmRvdy5sbCA9IGxpbmtlcjtcbiAgICB3aW5kb3cubGMgPSBsaXN0Q2FjaGU7XG4qL1xuICAgIHRoaXMudmFsaWRhdGlvbkV2ZW50ID0gdGhpcy5vbignZXJyb3ItanNvbi01MTMnLCBmdW5jdGlvbihkYXRhLCB1cmwsIHNlbnREYXRhLCB4aHIpe1xuICAgICAgICBpZiAoY3VycmVudENvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyKXtcbiAgICAgICAgICAgIGN1cnJlbnRDb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlcihuZXcgVmFsaWRhdGlvbkVycm9yKGRhdGEpKTtcbiAgICAgICAgfVxuICAgIH0pXG5cbiAgICB2YXIgZ2V0SW5kZXggPSBmdW5jdGlvbiAoaW5kZXhOYW1lKSB7XG4gICAgICAgIGlmIChpbmRleE5hbWUgaW4gSURCKVxuICAgICAgICAgICAgcmV0dXJuIElEQltpbmRleE5hbWVdO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIElEQltpbmRleE5hbWVdID0gTGF6eSh7fSk7XG4gICAgICAgICAgICByZXR1cm4gSURCW2luZGV4TmFtZV07XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBnZXRVbmxpbmtlZCA9IGZ1bmN0aW9uIChpbmRleE5hbWUpIHtcbiAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBVTkxJTktFRClcbiAgICAgICAgICAgIHJldHVybiBVTkxJTktFRFtpbmRleE5hbWVdO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIFVOTElOS0VEW2luZGV4TmFtZV0gPSB7fTtcbiAgICAgICAgICAgIHJldHVybiBVTkxJTktFRFtpbmRleE5hbWVdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIFBlcm1pc3Npb25UYWJsZShpZCwga2xhc3MsIHBlcm1pc3Npb25zKSB7XG4gICAgICAgIC8vIGNyZWF0ZSBQZXJtaXNzaW9uVGFibGUgY2xhc3NcbiAgICAgICAgdGhpcy5rbGFzcyA9IGtsYXNzO1xuICAgICAgICB0aGlzLnBlcm1pc3Npb25zID0gW107XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgZm9yICh2YXIgayBpbiBwZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgdGhpcy5wdXNoLmFwcGx5KHRoaXMsIFtrLCBwZXJtaXNzaW9uc1trXV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIFBlcm1pc3Npb25UYWJsZS5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAvLyBzYXZlIE9iamVjdCB0byBzZXJ2ZXJcbiAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICBwZXJtaXNzaW9uczogTGF6eSh0aGlzLnBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3hbMF0uaWQsIHhbMV1dXG4gICAgICAgICAgICB9KS50b09iamVjdCgpXG4gICAgICAgIH07XG4gICAgICAgIGRhdGEuaWQgPSB0aGlzLmlkO1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gdGhpcy5rbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMua2xhc3MubW9kZWxOYW1lICsgJy9zZXRfcGVybWlzc2lvbnMnLCBkYXRhLCBmdW5jdGlvbiAobXlQZXJtcywgYSwgYiwgcmVxKSB7XG4gICAgICAgICAgICBjYihteVBlcm1zKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBQZXJtaXNzaW9uVGFibGUucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoZ3JvdXBfaWQsIHBlcm1pc3Npb25MaXN0KSB7XG4gICAgICAgIHZhciBwID0gTGF6eShwZXJtaXNzaW9uTGlzdCk7XG4gICAgICAgIHZhciBwZXJtcyA9IExhenkodGhpcy5rbGFzcy5hbGxQZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW3gsIHAuY29udGFpbnMoeCldXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIHZhciBsID0gTGF6eSh0aGlzLnBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4WzBdLmlkXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAobC5jb250YWlucyhncm91cF9pZCkpXG4gICAgICAgICAgICB0aGlzLnBlcm1pc3Npb25zW2wuaW5kZXhPZihncm91cF9pZCldWzFdID0gcGVybXM7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMucGVybWlzc2lvbnMucHVzaChbSURCLmF1dGhfZ3JvdXAuZ2V0KGdyb3VwX2lkKSwgcGVybXNdKTtcbiAgICB9O1xuXG4gICAgLy8gY3JlYXRlcyBkeW5hbWljYWwgbW9kZWxzXG4gICAgdmFyIG1ha2VNb2RlbENsYXNzID0gZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgIHZhciBfbW9kZWwgPSBtb2RlbDtcbiAgICAgICAgbW9kZWwuZmllbGRzLmlkLnJlYWRhYmxlID0gZmFsc2U7XG4gICAgICAgIG1vZGVsLmZpZWxkcy5pZC53cml0YWJsZSA9IGZhbHNlO1xuICAgICAgICB2YXIgZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpO1xuICAgICAgICBpZiAobW9kZWwucHJpdmF0ZUFyZ3MpIHtcbiAgICAgICAgICAgIGZpZWxkcyA9IGZpZWxkcy5tZXJnZShtb2RlbC5wcml2YXRlQXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbW9kZWwtZGVmaW5pdGlvbicsIG1vZGVsLCBnZXRJbmRleChtb2RlbC5uYW1lKSk7XG4gICAgICAgIC8vIGdldHRpbmcgZmllbGRzIG9mIHR5cGUgZGF0ZSBhbmQgZGF0ZXRpbWVcbi8qXG4gICAgICAgIHZhciBEQVRFRklFTERTID0gZmllbGRzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGdldHRpbmcgYm9vbGVhbiBmaWVsZHNcbiAgICAgICAgdmFyIEJPT0xGSUVMRFMgPSBmaWVsZHMuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHgudHlwZSA9PSAnYm9vbGVhbicpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGJvb2xlYW5zIGFuZCBkYXRldGltZXMgc3RvcmFnZSBleHRlcm5hbCBcbiAgICAgICAgTU9ERUxfREFURUZJRUxEU1ttb2RlbC5uYW1lXSA9IERBVEVGSUVMRFM7XG4gICAgICAgIE1PREVMX0JPT0xGSUVMRFNbbW9kZWwubmFtZV0gPSBCT09MRklFTERTO1xuKi9cbiAgICAgICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdmFyIGZ1bmNTdHJpbmcgPSBcImlmICghcm93KSB7IHJvdyA9IHt9fTtcXG5cIjtcbiAgICAgICAgZnVuY1N0cmluZyArPSBtb2RlbC5yZWZlcmVuY2VzLm1hcChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICByZXR1cm4gJ3RoaXMuXycgKyBmaWVsZC5pZCArICcgPSByb3cuJyArIGZpZWxkLmlkICsgJzsnO1xuICAgICAgICB9KS5qb2luKCc7XFxuJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBkYXRlZmllbGQgY29udmVyc2lvblxuICAgICAgICBmdW5jU3RyaW5nICs9IGZpZWxkcy5tYXAoZnVuY3Rpb24gKHgsaykge1xuICAgICAgICAgICAgaWYgKCh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gcm93LicgKyBrICsgJz9uZXcgRGF0ZShyb3cuJyArIGsgKyAnICogMTAwMCAtICcgKyB1dGlscy50ek9mZnNldCArICcpOm51bGw7XFxuJzsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHgudHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gKHJvdy4nICsgayArICcgPT09IFwiVFwiKSB8fCAocm93LicgKyBrICsgJyA9PT0gdHJ1ZSk7XFxuJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IHJvdy4nICsgayArICc7XFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudG9TdHJpbmcoJ1xcbicpOyArICdcXG4nO1xuXG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gXCJpZiAocGVybWlzc2lvbnMpIHt0aGlzLl9wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zICYmIExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkgeyByZXR1cm4gW3gsIHRydWVdIH0pLnRvT2JqZWN0KCk7fVwiXG5cbiAgICAgICAgXG4gICAgICAgIC8vIG1hc3RlciBjbGFzcyBmdW5jdGlvblxuICAgICAgICB2YXIgS2xhc3MgPSBuZXcgRnVuY3Rpb24oJ3JvdycsICdwZXJtaXNzaW9ucycsZnVuY1N0cmluZylcblxuICAgICAgICBLbGFzcy5wcm90b3R5cGUub3JtID0gZXh0T1JNO1xuICAgICAgICBLbGFzcy5yZWZfdHJhbnNsYXRpb25zID0ge307XG4gICAgICAgIEtsYXNzLm1vZGVsTmFtZSA9IG1vZGVsLm5hbWU7XG4gICAgICAgIEtsYXNzLnJlZmVyZW5jZXMgPSBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLnBsdWNrKCdpZCcpLnRvQXJyYXkoKTtcblxuICAgICAgICBLbGFzcy5pbnZlcnNlX3JlZmVyZW5jZXMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAvLyBtYW5hZ2luZyByZWZlcmVuY2VzIHdoZXJlIFxuICAgICAgICAgICAgcmV0dXJuIHguYnkgKyAnXycgKyB4LmlkICsgJ19zZXQnXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5yZWZlcmVudHMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW3guYnksIHguaWRdXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5maWVsZHNPcmRlciA9IG1vZGVsLmZpZWxkT3JkZXI7XG4gICAgICAgIEtsYXNzLmFsbFBlcm1pc3Npb25zID0gbW9kZWwucGVybWlzc2lvbnM7XG5cbiAgICAgICAgLy8gcmVkZWZpbmluZyB0b1N0cmluZyBtZXRob2RcbiAgICAgICAgaWYgKExhenkobW9kZWwucmVwcmVzZW50YXRpb24pLnNpemUoKSl7XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9TdHJpbmcgPSBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzLicgKyBMYXp5KG1vZGVsLnJlcHJlc2VudGF0aW9uKS50b1N0cmluZygnICsgXCIgXCIgKyB0aGlzLicpKTtcbiAgICAgICAgfVxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9VcHBlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyByZWRlZmluZSB0byBVcHBlckNhc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKTtcbiAgICAgICAgfTtcbiAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9Mb3dlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gZGVsZXRlIGluc3RhbmNlIGZyb20gc2VydmVyXG4gICAgICAgICAgICByZXR1cm4gZXh0T1JNLmRlbGV0ZSh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSwgW3RoaXMuaWRdKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBwZXJtaXNzaW9uIGdldHRlciBwcm9wZXJ0eVxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoS2xhc3MucHJvdG90eXBlLCAncGVybWlzc2lvbnMnLCB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcGVybWlzc2lvbnMpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLnBlcm1pc3Npb25zW3RoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lXS5hc2sodGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gZ2V0dGluZyBmdWxsIHBlcm1pc3Npb24gdGFibGUgZm9yIGFuIG9iamVjdFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuYWxsX3Blcm1zID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICB2YXIgb2JqZWN0X2lkID0gdGhpcy5pZDtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9hbGxfcGVybXMnLCB7aWQ6IHRoaXMuaWR9LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBwZXJtaXNzaW9ucyA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgdW5rbm93bl9ncm91cHMgPSBMYXp5KHBlcm1pc3Npb25zKS5wbHVjaygnZ3JvdXBfaWQnKS51bmlxdWUoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnICsgeFxuICAgICAgICAgICAgICAgIH0pLmRpZmZlcmVuY2UoSURCLmF1dGhfZ3JvdXAua2V5cygpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgTGF6eShwZXJtaXNzaW9ucykuZ3JvdXBCeShmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5ncm91cF9pZFxuICAgICAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBlZFtrXSA9IExhenkodikucGx1Y2soJ25hbWUnKS50b0FycmF5KClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKG5ldyBQZXJtaXNzaW9uVGFibGUob2JqZWN0X2lkLCBLbGFzcywgZ3JvdXBlZCkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKHVua25vd25fZ3JvdXBzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ2V0KCdhdXRoX2dyb3VwJyx1bmtub3duX2dyb3VwcyxjYWxsKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGNhbGwoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIHZhciBvID0gdGhpcy5hc1JhdygpO1xuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IEtsYXNzLmZpZWxkcztcbiAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICB2YXIgbW9kZWxOYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICBpZiAoYXJncykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGFyZyBpbiBhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG9bYXJnXSA9IGFyZ3NbYXJnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBlbGltaW5hdGUgdW53cml0YWJsZXNcbiAgICAgICAgICAgIExhenkoS2xhc3MuZmllbGRzT3JkZXIpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWZpZWxkc1t4XS53cml0YWJsZTtcbiAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24oZmllbGROYW1lKXtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGROYW1lIGluIG8pIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG9bZmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgKElEID8gJy9wb3N0JyA6ICcvcHV0JyksIG8pO1xuICAgICAgICAgICAgaWYgKGFyZ3MgJiYgKGFyZ3MuY29uc3RydWN0b3IgPT09IEZ1bmN0aW9uKSl7XG4gICAgICAgICAgICAgICAgLy8gcGxhY2luZyBjYWxsYmFjayBpbiBhIGNvbW1vbiBwbGFjZVxuICAgICAgICAgICAgICAgIHByb21pc2UuY29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIgPSBhcmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2VcbiAgICAgICAgfTtcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb2JqID0gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy5hc1JhdygpKTtcbiAgICAgICAgICAgIG9iai5fcGVybWlzc2lvbnMgPSB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYnVpbGRpbmcgc2VyaWFsaXphdGlvbiBmdW5jdGlvblxuICAgICAgICB2YXIgYXNyID0gJ3JldHVybiB7XFxuJyArIExhenkobW9kZWwucmVmZXJlbmNlcykubWFwKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHJldHVybiBmaWVsZC5pZCArICcgOiB0aGlzLl8nICsgZmllbGQuaWQ7XG4gICAgICAgIH0pLmNvbmNhdChmaWVsZHMubWFwKGZ1bmN0aW9uICh4LGspIHtcbiAgICAgICAgICAgIGlmICgoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogKHRoaXMuJyArIGsgKyAnPyhNYXRoLnJvdW5kKHRoaXMuJyArIGsgKyAnLmdldFRpbWUoKSAtIHRoaXMuJyArIGsgKyAnLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCkgLyAxMDAwKTpudWxsKSc7IFxuICAgICAgICAgICAgfSBlbHNlIGlmICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogdGhpcy4nICsgayArICc/XCJUXCI6XCJGXCInO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiB0aGlzLicgKyBrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSkudG9TdHJpbmcoJyxcXG4nKSArICd9Oyc7XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5hc1JhdyA9IG5ldyBGdW5jdGlvbihhc3IpO1xuXG4gICAgICAgIEtsYXNzLnNhdmVNdWx0aSA9IGZ1bmN0aW9uIChvYmplY3RzLCBjYiwgc2NvcGUpIHtcbiAgICAgICAgICAgIHZhciByYXcgPSBbXTtcbiAgICAgICAgICAgIHZhciBkZWxldGFibGUgPSBMYXp5KEtsYXNzLmZpZWxkcylcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAheC53cml0YWJsZVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnBsdWNrKCdpZCcpXG4gICAgICAgICAgICAgICAgLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIExhenkob2JqZWN0cylcbiAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmFzUmF3KClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIExhenkoZGVsZXRhYmxlKS5lYWNoKGZ1bmN0aW9uICh5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgeFt5XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJhdy5wdXNoKHgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lLCAncHV0Jywge211bHRpcGxlOiByYXcsIGZvcm1JZHggOiBXMlBSRVNPVVJDRS5mb3JtSWR4Kyt9LCBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGVsZW1zKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFiID0gSURCW0tsYXNzLm1vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgdmFyIG9ianMgPSBMYXp5KGVsZW1zW0tsYXNzLm1vZGVsTmFtZV0ucmVzdWx0cykucGx1Y2soJ2lkJykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YWIuZ2V0KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICAgICAgICBjYihvYmpzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBzY29wZSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmICgnZXh0cmFfdmVyYnMnIGluIG1vZGVsKVxuICAgICAgICAgICAgTGF6eShtb2RlbC5leHRyYV92ZXJicykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHZhciBmdW5jTmFtZSA9IHhbMF07XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSB4WzFdO1xuICAgICAgICAgICAgICAgIHZhciBkZGF0YSA9ICdkYXRhID0ge2lkIDogdGhpcy5pZCc7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBkZGF0YSArPSAnLCAnICsgTGF6eShhcmdzKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geCArICcgOiAnICsgeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJywnKTtcbiAgICAgICAgICAgICAgICBkZGF0YSArPSAnfTsnO1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCgnY2InKTtcbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbZnVuY05hbWVdID0gbmV3IEZ1bmN0aW9uKGFyZ3MsIGRkYXRhICsgJ1cyUy5XMlBfUE9TVCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSxcIicgKyBmdW5jTmFtZSArICdcIiwgZGF0YSxmdW5jdGlvbihkYXRhLHN0YXR1cyxoZWFkZXJzLHgpeycgK1xuICAgICAgICAgICAgICAgICAgICAndHJ5e1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAnICAgaWYgKCFoZWFkZXJzKFwibm9tb2RlbFwiKSkge3dpbmRvdy5XMlMuZ290RGF0YShkYXRhLGNiKTt9XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICcgICBlbHNlIHtpZiAoY2IpIHtjYihkYXRhKX19XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICd9IGNhdGNoKGUpe1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAnaWYgKGNiKSB7Y2IoZGF0YSk7fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfSk7XFxuJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKCdwcml2YXRlQXJncycgaW4gbW9kZWwpIHtcbiAgICAgICAgICAgIEtsYXNzLnByaXZhdGVBcmdzID0gTGF6eShtb2RlbC5wcml2YXRlQXJncykua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgdHJ1ZV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmVQQSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgdmFyIFQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBvbyA9IHtpZDogdGhpcy5pZH07XG4gICAgICAgICAgICAgICAgdmFyIFBBID0gdGhpcy5jb25zdHJ1Y3Rvci5wcml2YXRlQXJncztcbiAgICAgICAgICAgICAgICB2YXIgRnMgPSB0aGlzLmNvbnN0cnVjdG9yLmZpZWxkcztcbiAgICAgICAgICAgICAgICB2YXIgdCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG8pLmFzUmF3KCk7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkSWR4ID0gTGF6eShQQSkua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIEZzW3hdXVxuICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgTGF6eShvKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoayBpbiBQQSkgJiYgZmllbGRJZHhba10ud3JpdGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9vW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9zYXZlUEEnLCBvbywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG9vKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBUW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbW9kZWxDYWNoZVtLbGFzcy5tb2RlbE5hbWVdID0gS2xhc3M7XG4gICAgICAgIC8vIGFkZGluZyBpZCB0byBmaWVsZHNcbiAgICAgICAgZm9yICh2YXIgZiBpbiBtb2RlbC5maWVsZHMpIHtcbiAgICAgICAgICAgIG1vZGVsLmZpZWxkc1tmXS5pZCA9IGY7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MuZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpLmNvbmNhdChMYXp5KG1vZGVsLnByaXZhdGVBcmdzKSkuY29uY2F0KExhenkobW9kZWwucmVmZXJlbmNlcykudGFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICB4LnR5cGUgPSB4LnR5cGUgfHwgJ3JlZmVyZW5jZSdcbiAgICAgICAgfSkpLmluZGV4QnkoJ2lkJykudG9PYmplY3QoKTtcbiAgICAgICAgLy8gc2V0dGluZyB3aWRnZXRzIGZvciBmaWVsZHNcbiAgICAgICAgTGF6eShLbGFzcy5maWVsZHMpLmVhY2goZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgaWYgKCFmaWVsZC53aWRnZXQpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZC50eXBlID09PSAncmVmZXJlbmNlJyl7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9ICdjaG9pY2VzJ1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9IGZpZWxkLnR5cGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAobWFueSB0byBvbmUpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGV4dF9yZWYgPSByZWYudG87XG4gICAgICAgICAgICB2YXIgbG9jYWxfcmVmID0gJ18nICsgcmVmLmlkO1xuICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5pZCxmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZXh0X3JlZiBpbiBJREIpKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKGV4dF9yZWYsZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rZXIubWFpbkluZGV4W2V4dF9yZWZdLmFzayh0aHNbbG9jYWxfcmVmXSx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSAoZXh0X3JlZiBpbiBJREIpICYmIHRoaXNbbG9jYWxfcmVmXSAmJiBJREJbZXh0X3JlZl0uZ2V0KHRoaXNbbG9jYWxfcmVmXSk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgJiYgKGV4dF9yZWYgaW4gbGlua2VyLm1haW5JbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYXNraW5nIHRvIGxpbmtlclxuICAgICAgICAgICAgICAgICAgICBsaW5rZXIubWFpbkluZGV4W2V4dF9yZWZdLmFzayh0aGlzW2xvY2FsX3JlZl0sdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1dGlscy5tb2NrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSAhPSBleHRfcmVmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgY2FuIGFzc2lnbiBvbmx5ICcgKyBleHRfcmVmICsgJyB0byAnICsgcmVmLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzW2xvY2FsX3JlZl0gPSB2YWx1ZS5pZDtcbiAgICAgICAgICAgIH0sICduZXctJyArIGV4dF9yZWYsICdkZWxldGVkLScgKyBleHRfcmVmLCd1cGRhdGVkLScgKyBleHRfcmVmLCAnbmV3LW1vZGVsLScgKyBleHRfcmVmKTtcblxuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlZi5pZCldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRPUk0uZ2V0KGV4dF9yZWYsdGhpc1tsb2NhbF9yZWZdKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAob25lIHRvIG1hbnkpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZWRCeSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gcmVmLmJ5ICsgJy4nICsgcmVmLmlkO1xuICAgICAgICAgICAgdmFyIHByb3BlcnR5TmFtZSA9IHJlZi5ieSArICdfJyArIHV0aWxzLnBsdXJhbGl6ZShyZWYuaWQpO1xuICAgICAgICAgICAgdmFyIHJldkluZGV4ID0gcmVmLmJ5O1xuICAgICAgICAgICAgaWYgKEtsYXNzLnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJ5ZWQgdG8gcmVkZWZpbmUgcHJvcGVydHkgJyArIHByb3BlcnR5TmFtZSArICdzJyArICcgZm9yICcgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcHJvcGVydHlOYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSAocmV2SW5kZXggaW4gSURCKSA/IFJFVklEWFtpbmRleE5hbWVdLmdldCh0aGlzLmlkICsgJycpOm51bGw7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtlci5mb3JlaWduS2V5c1tpbmRleE5hbWVdLmFzayh0aGlzLmlkLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgIH0sIG51bGwsICduZXctJyArIHJldkluZGV4LCAndXBkYXRlZC0nICsgcmV2SW5kZXgsICdkZWxldGVkLScgKyByZXZJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShyZWYuYnkpKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdHMgPSB7fTtcbiAgICAgICAgICAgICAgICBvcHRzW3JlZi5pZF0gPSBbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5xdWVyeShyZWYuYnksb3B0cyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2J1aWxkaW5nIHJlZmVyZW5jZSB0byAobWFueSB0byBtYW55KSBmaWVsZHNcbiAgICAgICAgaWYgKG1vZGVsLm1hbnlUb01hbnkpIHtcbiAgICAgICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHJlZi5pbmRleE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcmVmLmZpcnN0PyAwIDogMTtcbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsTmFtZSA9IHJlZi5tb2RlbDtcbi8vICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBnZXRJbmRleChvbW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgZ2V0dGVyID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyAoMSAtIGZpcnN0KV07XG5cbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcmVmLm1vZGVsICsgJ3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZXQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0ID0gZ2V0SW5kZXgob21vZGVsTmFtZSkuZ2V0LmJpbmQoSURCW29tb2RlbE5hbWVdKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcyAmJiBnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0ID0gTGF6eShpZHMpLm1hcChnZXQpLmZpbHRlcih1dGlscy5ib29sKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgICAgICB9LCBudWxsLCAncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUsICdyZWNlaXZlZC0nICsgb21vZGVsTmFtZSk7XG5cbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShvbW9kZWxOYW1lKSldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLmdldE0yTShpbmRleE5hbWUsIFt0aHMuaWRdLCBmaXJzdCxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGdldHRlcih0aHMuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChvbW9kZWxOYW1lLCB7aWQgOiBpZHN9LG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gSURCW29tb2RlbE5hbWVdLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KFtdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgICAgIEtsYXNzLmZpZWxkc1t1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICByZWFkYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ00yTScsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcnM6IFtdXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS51bmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IFtbSUQsIGluc3RhbmNlLmlkXV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL2RlbGV0ZScsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUubGlua1JlZmVyZW5jZSA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lID09ICdBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZXMgPSBpbnN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBpbnN0YW5jZXNbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJTkRFWF9NMk0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZnMgPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykuZGlmZmVyZW5jZShMYXp5KElOREVYX00yTVtpbmRleE5hbWVdWzBdLmdldCh0aGlzLmlkKSkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBvbW9kZWwgKyAnLycgKyBLbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlZnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkocmVmcykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtJRCwgeF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUF9QT1NUKEtsYXNzLm1vZGVsTmFtZSwgb21vZGVsICsgJ3MvcHV0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGluZGV4TmFtZSBpbiBsaW5rZXIubTJtSW5kZXgpICYmIExhenkobGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKG9tb2RlbCldKGluc3RhbmNlLmlkKSkuZmluZCh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL3B1dCcsIHtjb2xsZWN0aW9uOiBbW3RoaXMuaWQsIGluc3RhbmNlLmlkXV19KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ25ldy1tb2RlbCcsIEtsYXNzKTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbmV3LW1vZGVsLScgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICByZXR1cm4gS2xhc3M7XG4gICAgfTtcblxuICAgIHRoaXMuZ290RGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBjYWxsQmFjaykge1xuICAgICAgICAvLyByZWNlaXZlIGFsbCBkYXRhIGZyb20gZXZlcnkgZW5kIHBvaW50XG4gICAgICAgIGNvbnNvbGUuaW5mbygnZ290RGF0YScpO1xuICAgICAgICBpZiAodHlwZW9mKGRhdGEpID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGF0YSAnICsgZGF0YSArICcgcmVmdXNlZCBmcm9tIGdvdERhdGEoKScpO1xuICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNsZWFuIGRhdGEgZnJvbSByZWxhdGlvbnMgYW5kIHBlcm1pc3Npb25zIGZvciB1c2luZyBpdCBhZnRlciBtb2RlbCBwYXJzaW5nXG4gICAgICAgIGlmICgnX2V4dHJhJyBpbiBkYXRhKXsgZGVsZXRlIGRhdGEuX2V4dHJhIH1cbiAgICAgICAgdmFyIFRPT05FID0gZGF0YS5UT09ORTtcbiAgICAgICAgdmFyIFRPTUFOWSA9IGRhdGEuVE9NQU5ZO1xuICAgICAgICB2YXIgTUFOWVRPTUFOWSA9IGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgdmFyIFBFUk1JU1NJT05TID0gZGF0YS5QRVJNSVNTSU9OUztcbiAgICAgICAgdmFyIFBBID0gZGF0YS5QQTtcbiAgICAgICAgZGVsZXRlIGRhdGEuVE9PTkU7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBBO1xuICAgICAgICBpZiAoIVBBKSB7IFBBID0ge307IH1cblxuICAgICAgICAvLyBjbGVhbmluZyBmcm9tIHVzZWxlc3MgZGVsZXRlZCBkYXRhXG4gICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLmZpbHRlcihmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgcmV0dXJuICghKCdkZWxldGVkJyBpbiB2KSB8fCAoKGsgaW4gbW9kZWxDYWNoZSkpKTtcbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgnbTJtJyBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbTJtID0gZGF0YS5tMm07XG4gICAgICAgICAgICBkZWxldGUgZGF0YVsnbTJtJ107XG4gICAgICAgIH1cbiAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uIChkYXRhLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsQ2xhc3MgPSBtb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXN1bHRzICYmIChkYXRhLnJlc3VsdHMubGVuZ3RoID4gMCkgJiYgKGRhdGEucmVzdWx0c1swXS5jb25zdHJ1Y3RvciA9PSBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMYXp5KG1vZGVsQ2xhc3MuZmllbGRzT3JkZXIpLnppcCh4KS50b09iamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBMYXp5KGRhdGEucmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgdmFyIGRlbGV0ZWQgPSBkYXRhLmRlbGV0ZWQ7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBQQSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgTVBBID0gUEFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShyZXN1bHRzKS5lYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmQuaWQgaW4gTVBBKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShNUEFbcmVjb3JkLmlkXSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGluZGV4aW5nIHJlZmVyZW5jZXMgYnkgaXRzIElEXG4gICAgICAgICAgICAgICAgdmFyIGl0YWIgPSBnZXRJbmRleChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZSA9IGl0YWIuc291cmNlO1xuXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGVkLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGFibGVbeF07XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuLypcbiAgICAgICAgICAgICAgICBMYXp5KGRlbGV0ZWQpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgIH0pO1xuKi9cbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gcmVzdWx0cy5pbmRleEJ5KCdpZCcpO1xuICAgICAgICAgICAgICAgIHZhciBpayA9IGlkeC5rZXlzKCk7XG4gICAgICAgICAgICAgICAgdmFyIG5uZXcgPSBpay5kaWZmZXJlbmNlKGl0YWIua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWQgPSBpay5kaWZmZXJlbmNlKG5uZXcpO1xuICAgICAgICAgICAgICAgIC8vIHJlbW92aW5nIG9sZCBpZGVudGljYWwgdmFsdWVzXG4gICAgICAgICAgICAgICAgdXBkYXRlZCA9IHVwZGF0ZWQuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhdXRpbHMuc2FtZUFzKGlkeC5nZXQoeCksIGl0YWIuZ2V0KHgpLmFzUmF3KCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIGNsYXNzaWZ5IHJlY29yZHNcbiAgICAgICAgICAgICAgICB2YXIgcGVybXMgPSBkYXRhLnBlcm1pc3Npb25zID8gTGF6eShkYXRhLnBlcm1pc3Npb25zKSA6IExhenkoe30pO1xuICAgICAgICAgICAgICAgIHZhciBuZXdPYmplY3RzID0gbm5ldy5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCksIHBlcm1zLmdldCh4KSlcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vLy8gY2xhc3NpZnlpbmcgdXBkYXRlZFxuICAgICAgICAgICAgICAgIC8vdmFyIHVwZGF0ZWRPYmplY3RzID0gdXBkYXRlZC5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkscGVybXMuZ2V0KHgpKX0pO1xuICAgICAgICAgICAgICAgIC8vdmFyIHVvID0gdXBkYXRlZE9iamVjdHMudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIC8vdXBkYXRlZE9iamVjdHMgPSBMYXp5KHVvKS5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIFt4LHRhYmxlW3guaWRdXX0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGluZyBzaW5nbGUgb2JqZWN0c1xuICAgICAgICAgICAgICAgIHZhciBjaGFuZ2VkID0gW107XG4vLyAgICAgICAgICAgICAgICB2YXIgREFURUZJRUxEUyA9IE1PREVMX0RBVEVGSUVMRFNbbW9kZWxOYW1lXTtcbi8vICAgICAgICAgICAgICAgIHZhciBCT09MRklFTERTID0gTU9ERUxfQk9PTEZJRUxEU1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSXRlbSA9IGl0YWIuZ2V0KHgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ29weSA9IG9sZEl0ZW0uY29weSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3SXRlbSA9IG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkpO1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG1vZGVsLmZpZWxkcykua2V5cygpLmVhY2goZnVuY3Rpb24oayl7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtW2tdID0gbmV3SXRlbVtrXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChbb2xkSXRlbSwgb2xkQ29weV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBzZW5kaW5nIHNpZ25hbCBmb3IgdXBkYXRlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAoY2hhbmdlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgndXBkYXRlZC0nICsgbW9kZWxOYW1lLCBjaGFuZ2VkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8qKioqKioqKiBVcGRhdGUgdW5pdmVyc2UgKioqKioqKipcbiAgICAgICAgICAgICAgICB2YXIgbm8gPSBuZXdPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KG5vKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRhYmxlW3guaWRdID0geFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHJlYnVsZGluZyByZXZlcnNlIGluZGV4ZXNcbiAgICAgICAgICAgICAgICBMYXp5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXS5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgICAgICAgICAgUkVWSURYW21vZGVsTmFtZSArICcuJyArIHJlZl0gPSBJREJbbW9kZWxOYW1lXS5ncm91cEJ5KCdfJyArIHJlZik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIG5ldyB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAobm8ubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCduZXctJyArIG1vZGVsTmFtZSwgTGF6eShubyksIGRhdGEudG90YWxSZXN1bHRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdkZWxldGVkLScgKyBtb2RlbE5hbWUsIGRlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgZGF0YSBhcnJpdmVkXG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtJyArIG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChUT09ORSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVE9PTkUnKTtcbiAgICAgICAgICAgIExhenkoVE9PTkUpLmVhY2goZnVuY3Rpb24gKHZhbHMsIG1vZGVsTmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIHVkeCA9IGdldFVubGlua2VkKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVE9NQU5ZKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUT01BTlknKTtcbiAgICAgICAgICAgIExhenkoVE9NQU5ZKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBpbmRleE5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gQVNLRURfVU5MSU5LRUQpKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX1VOTElOS0VEW2luZGV4TmFtZV0gPSBMYXp5KFtdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgTGF6eSh2YWxzKS5lYWNoKGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9VTkxJTktFRFtpbmRleE5hbWVdLnNvdXJjZS5wdXNoKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChNQU5ZVE9NQU5ZKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdNQU5ZVE9NQU5ZJyk7XG4gICAgICAgICAgICBMYXp5KE1BTllUT01BTlkpLmVhY2goZnVuY3Rpb24gKHZhbHMsIGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCA9IHBhcnNlSW50KGluZGV4TmFtZS5zcGxpdCgnfCcpWzFdKTtcbiAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBpbmRleE5hbWUuc3BsaXQoJ3wnKVswXTtcbiAgICAgICAgICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gQVNLRURfTTJNKSkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9NMk1baW5kZXhOYW1lXSA9IFt7fSwge31dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgTUlEWCA9IEFTS0VEX00yTVtpbmRleE5hbWVdW2ZpcnN0XTtcbiAgICAgICAgICAgICAgICBMYXp5KHZhbHMpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgTUlEWFt4ICsgJyddID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgTUlEWFt4XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobTJtKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RNMk0obTJtKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoUEVSTUlTU0lPTlMpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdFBlcm1pc3Npb25zKFBFUk1JU1NJT05TKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjYWxsQmFjaykge1xuICAgICAgICAgICAgY2FsbEJhY2soZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnZ290LWRhdGEnKTtcbiAgICB9O1xuICAgIHRoaXMuZ290UGVybWlzc2lvbnMgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24gKHYsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgTGF6eSh2WzBdKS5lYWNoKGZ1bmN0aW9uIChyb3csIGlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKChyZXNvdXJjZU5hbWUgaW4gSURCKSAmJiAoaWQgaW4gSURCW3Jlc291cmNlTmFtZV0uc291cmNlKSl7XG4gICAgICAgICAgICAgICAgICAgIElEQltyZXNvdXJjZU5hbWVdLmdldChpZCkuX3Blcm1pc3Npb25zID0gTGF6eShyb3cpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCB0cnVlXVxuICAgICAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKExhenkodlswXSkuc2l6ZSgpKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMtJyArIHJlc291cmNlTmFtZSwgTGF6eSh2WzBdKS5rZXlzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZW1pdCgndXBkYXRlLXBlcm1pc3Npb25zJyk7XG4gICAgfTtcblxuXG4gICAgdGhpcy5nb3RNMk0gPSBmdW5jdGlvbihtMm0pe1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihkYXRhLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgdmFyIG0ybUluZGV4ID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24obSl7XG4gICAgICAgICAgICAgICAgTGF6eShtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsdmVyYil7XG4gICAgICAgICAgICAgICAgICAgIG0ybUluZGV4W3ZlcmJdKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdyZWNlaXZlZC1tMm0nKTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLW0ybS0nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5mZXRjaCA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKSB7ICAvL1xuICAgICAgICAvLyBpZiBhIGNvbm5lY3Rpb24gaXMgY3VycmVudGx5IHJ1bm5pbmcsIHdhaXQgZm9yIGNvbm5lY3Rpb24uXG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gd2FpdGluZ0Nvbm5lY3Rpb25zKXtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0sNTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGZldGNoaW5nIGFzeW5jaHJvbW91cyBtb2RlbCBmcm9tIHNlcnZlclxuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUobW9kZWxOYW1lLCAoZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgICAgIC8vIGlmIGRhdGEgY2FtZXMgZnJvbSByZWFsdGltZSBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKFcyUFJFU09VUkNFLmNvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gZ2V0dGluZyBmaWx0ZXIgZmlsdGVyZWQgYnkgY2FjaGluZyBzeXN0ZW1cbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyID0gbGlzdENhY2hlLmZpbHRlcihtb2RlbCxmaWx0ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHNvbXRoaW5nIGlzIG1pc3Npbmcgb24gbXkgbG9jYWwgREIgXG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXNrIGZvciBtaXNzaW5ncyBhbmQgcGFyc2Ugc2VydmVyIHJlc3BvbnNlIGluIG9yZGVyIHRvIGVucmljaCBteSBsb2NhbCBEQi5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBsYWNpbmcgbG9jayBmb3IgdGhpcyBtb2RlbFxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywge2ZpbHRlciA6IGZpbHRlcn0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSxjYWxsQmFjayk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVsZWFzZSBsb2NrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihyZXQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWxlYXNlIGxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywgc2VuZERhdGEsZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbHRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHT1RfQUxMLnNvdXJjZS5wdXNoKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXQgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICAvLyBzZWFyY2ggb2JqZWN0cyBmcm9tIElEQi4gSWYgc29tZSBpZCBpcyBtaXNzaW5nLCBpdCByZXNvbHZlIGl0IGJ5IHRoZSBzZXJ2ZXJcbiAgICAgICAgLy8gaWYgYSByZXF1ZXN0IHRvIHRoZSBzYW1lIG1vZGVsIGlzIHBlbmRpbmcsIHdhaXQgZm9yIGl0cyBjb21wbGV0aW9uXG4gICAgICAgIFxuICAgICAgICBpZiAoaWRzLmNvbnN0cnVjdG9yICE9PSBBcnJheSl7XG4gICAgICAgICAgICBpZHMgPSBbaWRzXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBzb21lIGVudGl0eSBpcyBtaXNzaW5nIFxuICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUgLCB7aWQ6IGlkc30sIG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgIHZhciBpdGFiID0gSURCW21vZGVsTmFtZV1cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIGlkcyl7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goaXRhYi5zb3VyY2VbaWRzW2lkXV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ290TW9kZWwgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBmb3IgKHZhciBtb2RlbE5hbWUgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gZGF0YVttb2RlbE5hbWVdO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlWydkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lXSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgbW9kZWxDYWNoZVttb2RlbE5hbWVdID0gbWFrZU1vZGVsQ2xhc3MobW9kZWwpO1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIElEQikpIHtcbiAgICAgICAgICAgICAgICBJREJbbW9kZWxOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZGVzY3JpYmUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHJldCA9IG1vZGVsQ2FjaGVbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpKXtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGZhaWxlZE1vZGVscyl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY2FjaGVLZXkgPSAnZGVzY3JpcHRpb246JyArIG1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoY2FjaGVLZXkgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ290TW9kZWwoSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbY2FjaGVLZXldKSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVzY3JpYmUnLG51bGwsIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290TW9kZWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZWxOb3RGb3VuZC5oYW5kbGUobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxlZE1vZGVsc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9ICAgICAgICBcbiAgICB9O1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZGVjb3JhdG9yKSB7XG4gICAgICAgIHZhciBrZXkgPSB1dGlscy5oYXNoKGRlY29yYXRvcik7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlcnMpKSBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXSA9IG5ldyBIYW5kbGVyKCk7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlclVzZWQpKSBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXSA9IHt9O1xuICAgICAgICBpZiAoa2V5IGluIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdW2tleV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gbW9kZWxDYWNoZSkge1xuICAgICAgICAgICAgZGVjb3JhdG9yKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXS5hZGRIYW5kbGVyKGRlY29yYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGF0dHJpYnV0ZXMpe1xuICAgICAgICB2YXIgYWRkUHJvcGVydHkgPSBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlcykge1xuICAgICAgICAgIGF0dHJpYnV0ZXMuZm9yRWFjaChmdW5jdGlvbih2YWwpe1xuICAgICAgICAgICAgdmFyIGtleSA9ICdwQTonICsgbW9kZWwubW9kZWxOYW1lICsgJzonICsgdmFsO1xuICAgICAgICAgICAgdmFyIGthdHRyID0gJ19fJyArIHZhbDtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtb2RlbC5wcm90b3R5cGUsIHZhbCwge1xuICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2F0dHIgaW4gdGhpcykpe1xuICAgICAgICAgICAgICAgICAgdmFyIHYgPSBsb2NhbFN0b3JhZ2Vba2V5ICsgdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgICB0aGlzW2thdHRyXSA9IHY/SlNPTi5wYXJzZSh2KTpudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1trYXR0cl07XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgICAgIHRoaXNba2F0dHJdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW2tleSArIHRoaXMuaWRdID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKSkgeyBwZXJzaXN0ZW50QXR0cmlidXRlc1ttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgdmFyIGF0dHJzID0gcGVyc2lzdGVudEF0dHJpYnV0ZXNbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHZhciBuZXdBdHRycyA9IExhenkoYXR0cmlidXRlcykuZGlmZmVyZW5jZShhdHRycykudG9BcnJheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5ld0F0dHJzID0gYXR0cnM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld0F0dHJzLmxlbmd0aCl7XG4gICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIG1vZGVsQ2FjaGUpe1xuICAgICAgICAgICAgICAgIGFkZFByb3BlcnR5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSwgbmV3QXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGF0dHJzLG5ld0F0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbignbmV3LW1vZGVsJywgZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVycyl7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWwubW9kZWxOYW1lXS5oYW5kbGUobW9kZWxDYWNoZVttb2RlbC5tb2RlbE5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzKG1vZGVsLm1vZGVsTmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMucXVlcnkgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHRoaXMuZGVzY3JpYmUobW9kZWxOYW1lLGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgIC8vIGFycmF5Zml5IGFsbCBmaWx0ZXIgdmFsdWVzXG4gICAgICAgICAgICBmaWx0ZXIgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHYsayl7IHJldHVybiBbayxBcnJheS5pc0FycmF5KHYpP3Y6W3ZdXX0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICB2YXIgZmlsdGVyRnVuY3Rpb24gPSB1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgdmFyIGlkeCA9IGdldEluZGV4KG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB0aHMuZmV0Y2gobW9kZWxOYW1lLGZpbHRlcix0b2dldGhlciwgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soaWR4LmZpbHRlcihmaWx0ZXJGdW5jdGlvbikudmFsdWVzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2RlbGV0ZScsIHsgaWQgOiBpZHN9LCBjYWxsQmFjayk7XG4gICAgfTtcblxuICAgIHRoaXMuY29ubmVjdCA9IGZ1bmN0aW9uIChjYWxsQmFjaykge1xuICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmlzTG9nZ2VkSW4pIHtcbiAgICAgICAgICAgIGNhbGxCYWNrKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29ubmVjdChjYWxsQmFjayk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5mdW5jdGlvbiByZVdoZWVsT1JNKGVuZFBvaW50LCBsb2dpbkZ1bmMpe1xuICAgIHRoaXMuJG9ybSA9IG5ldyBiYXNlT1JNKG5ldyB1dGlscy5yZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgbG9naW5GdW5jKSx0aGlzKTtcbiAgICB0aGlzLm9uID0gdGhpcy4kb3JtLm9uLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLmVtaXQgPSB0aGlzLiRvcm0uZW1pdC5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy51bmJpbmQgPSB0aGlzLiRvcm0udW5iaW5kLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLm9uY2UgPSB0aGlzLiRvcm0ub25jZTtcbiAgICB0aGlzLmFkZE1vZGVsSGFuZGxlciA9IHRoaXMuJG9ybS5hZGRNb2RlbEhhbmRsZXIuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSB0aGlzLiRvcm0uYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMudXRpbHMgPSB1dGlscztcbiAgICB0aGlzLmxvZ291dCA9IHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ291dC5iaW5kKHRoaXMuJG9ybS5jb25uZWN0aW9uKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzLiRvcm0uY29ubmVjdGlvbjtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKGZ1bmN0aW9uKGNhbGxCYWNrLHJlamVjdCl7XG4gICAgICAgIGNvbm5lY3Rpb24uY29ubmVjdChjYWxsQmFjayk7XG4gICAgfSkpO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ2luKHVzZXJuYW1lLCBwYXNzd29yZCwgYWNjZXB0KTsgICAgXG4gICAgfSkuYmluZCh0aGlzKSk7XG4gICAgXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dvdXQgPSBmdW5jdGlvbih1cmwpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dvdXQoKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0TW9kZWwgPSBmdW5jdGlvbihtb2RlbE5hbWUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVzY3JpYmUobW9kZWxOYW1lLGFjY2VwdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNpbmdsZSA9IGZhbHNlO1xuICAgIHZhciBtb2ROYW1lID0gbW9kZWxOYW1lO1xuICAgIGlmIChpZHMuY29uc3RydWN0b3IgIT09IEFycmF5KXtcbiAgICAgICAgc2luZ2xlID0gdHJ1ZTtcbiAgICAgICAgaWRzID0gW2lkc11cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoc2luZ2xlKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kb3JtLmdldChtb2ROYW1lLCBpZHMsIGZ1bmN0aW9uKGl0ZW1zKXsgXG4gICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQoaXRlbXNbMF0pO31cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZ2V0KG1vZE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLnF1ZXJ5ID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZmlsdGVyLCByZWxhdGVkKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdmFyIHRvZ2V0aGVyID0gbnVsbDtcbiAgICAgICAgaWYgKHJlbGF0ZWQgJiYgKHJlbGF0ZWQuY29uc3RydWN0b3IgPT09IEFycmF5KSAmJiAocmVsYXRlZC5sZW5ndGgpKXtcbiAgICAgICAgICAgIHRvZ2V0aGVyID0gcmVsYXRlZDtcbiAgICAgICAgfSBlbHNlIGlmIChyZWxhdGVkICYmIChyZWxhdGVkLmNvbnN0cnVjdG9yID09PSBTdHJpbmcpICYmIChyZWxhdGVkLmxlbmd0aCkpe1xuICAgICAgICAgICAgdG9nZXRoZXIgPSByZWxhdGVkLnNwbGl0KCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGlkcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlbGV0ZShtb2RlbE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRMb2dnZWRVc2VyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLiRvcm0uY29ubmVjdGlvbi5jYWNoZWRTdGF0dXMudXNlcl9pZClcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KCdhdXRoX3VzZXInLHRoaXMuJG9ybS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy51c2VyX2lkKTtcbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KSB7XG4gICAgICAgICAgICBzZWxmLm9uY2UoJ2xvZ2dlZC1pbicsZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgICAgIHNlbGYuZ2V0KCdhdXRoX3VzZXInLCB1c2VyKS50aGVuKGFjY2VwdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS4kc2VuZFRvRW5kcG9pbnQgPSBmdW5jdGlvbiAodXJsLCBkYXRhKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLiRwb3N0KHVybCwgZGF0YSk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9naW4odXNlcm5hbWUscGFzc3dvcmQpO1xufVxuIl19
