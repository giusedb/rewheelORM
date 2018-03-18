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
                        return utils.mock;
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
                    if (!x) {
                        console.error('makeFilter x is null');
                    } else if (x === orm.utils.mock) {
                        console.error('makeFilter with Mock Object');
                    }
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
        mock: mockObject()
    };
    'use strict';
    var STATUSKEY = 'lastRWTConnectionStatus';
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
                var error = 'Could not receive error from server';
                if (xhr.responseData && 'error' in xhr.responseData) {
                    error = xhr.responseData.error;
                }
                accept({
                    error: error,
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
                //            return getter.call(this);
                if (!(this.id in result)) {
                    result[this.id] = getter.call(this);
                }
                return result[this.id];
            }
        };
        if (setter) {
            propertyDef['set'] = function (value) {
                if (!isFinite(value)) {
                    if (this.id in result) {
                        delete result[this.id];
                    }
                } else {
                    //            if (value !== result[this.id]){
                    setter.call(this, value);
                    if (this.id in result) {
                        delete result[this.id];
                    }    //            }
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
        window.IDB = IDB;
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
                if (ID) {
                    o.id = ID;
                }
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
                    var ddata = 'var data = {id : this.id';
                    if (args.length)
                        ddata += ', ' + Lazy(args).map(function (x) {
                            return x + ' : ' + x;
                        }).join(',');
                    ddata += '};\n';
                    args = [
                        'post',
                        'gotData'
                    ].concat(args);
                    args.push('cb');
                    var code = ddata + ' return post("' + Klass.modelName + '/' + funcName + '", data,cb);';
                    var func = new Function(args, code);
                    Klass.prototype[funcName] = function () {
                        var args = [
                            W2PRESOURCE.$post,
                            W2PRESOURCE.gotData
                        ].concat(Array.prototype.slice.call(arguments, 0));
                        return func.apply(this, args);
                    };
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
                    if (!this[local_ref]) {
                        return utils.mock;
                    }
                    ;
                    if (!(ext_ref in IDB)) {
                        var ths = this;
                        W2PRESOURCE.describe(ext_ref, function (x) {
                            linker.mainIndex[ext_ref].ask(ths[local_ref], true);
                        });
                    }
                    var result = ext_ref in IDB && this[local_ref] && IDB[ext_ref].get(this[local_ref]);
                    if (!result && ext_ref in linker.mainIndex) {
                        // asking to linker
                        if (typeof this[local_ref] === 'number') {
                            linker.mainIndex[ext_ref].ask(this[local_ref], true);
                        } else {
                            console.warn('null reference for ' + local_ref + '(' + this.id + ') resource ' + Klass.modelName);
                        }
                        return utils.mock;
                    }
                    return result;
                }, function (value) {
                    if (value) {
                        if (value.constructor !== utils.mock && value.constructor.modelName !== ext_ref) {
                            throw new TypeError('You can assign only ' + ext_ref + ' to ' + ref.id);
                        }
                        this[local_ref] = value.id;
                    } else {
                        this[local_ref] = null;
                    }
                }, 'new-' + ext_ref, 'deleted-' + ext_ref, 'updated-' + ext_ref, 'new-model-' + ext_ref    /*, 'updated-' + Klass.modelName*/);
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
                    return extORM.get(ref.by, opts);
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
                    var idx = results.indexBy('id').toObject();
                    var ik = Lazy(idx).keys();
                    var nnew = ik.difference(itab.keys().map(function (x) {
                        return parseInt(x);
                    }));
                    var updated = ik.difference(nnew);
                    // removing old identical values
                    updated = updated.filter(function (x) {
                        return !utils.sameAs(idx[x], table[x].asRaw());
                    }).toArray();
                    // classify records
                    var perms = data.permissions ? Lazy(data.permissions) : Lazy({});
                    var newObjects = nnew.map(function (x) {
                        return new modelClass(idx[x], perms.get(x));
                    });
                    //// classifying updated
                    //var updatedObjects = updated.map(function(x){return new modelClass(idx.get(x),perms.get(x))});
                    //var uo = updatedObjects.toArray();
                    //updatedObjects = Lazy(uo).map(function(x){return [x,table[x.id]]}).toArray();
                    // Updating single objects
                    var changed = [];
                    //                var DATEFIELDS = MODEL_DATEFIELDS[modelName];
                    //                var BOOLFIELDS = MODEL_BOOLFIELDS[modelName];
                    var modelReferences = Lazy(model.references).map(function (k) {
                        return [
                            k,
                            1
                        ];
                    }).toObject();
                    updated.forEach(function (x) {
                        var oldItem = table[x];
                        var oldCopy = oldItem.copy();
                        var newItem = idx.get(x);
                        // updating each attribute singularly
                        Lazy(model.fields).each(function (field, fieldName) {
                            switch (field.type) {
                            case 'reference': {
                                    oldItem['_' + fieldName] = newItem[fieldName];
                                    // NaN is convntionally a cache deleter
                                    oldItem[fieldName] = NaN;
                                    break;
                                }
                                ;
                            case 'date': {
                                    oldItem[fieldName] = new Date(newItem[fieldName] * 1000);
                                    break;
                                }
                                ;
                            case 'datetime': {
                                    oldItem[fieldName] = new Date(newItem[fieldName] * 1000);
                                    break;
                                }
                                ;
                            case 'boolean': {
                                    switch (newItem[fieldName]) {
                                    case null: {
                                            oldItem[fieldName] = null;
                                            break;
                                        }
                                        ;
                                    case 'T': {
                                            oldItem[fieldName] = true;
                                            break;
                                        }
                                        ;
                                    case 'F': {
                                            oldItem[fieldName] = false;
                                            break;
                                        }
                                        ;
                                    case true: {
                                            oldItem[fieldName] = true;
                                            break;
                                        }
                                        ;
                                    case false: {
                                            oldItem[fieldName] = false;
                                            break;
                                        }
                                        ;
                                    }
                                    break;
                                }
                                ;
                            default: {
                                    oldItem[fieldName] = newItem[fieldName];
                                }
                            }    //                        oldItem[fieldName] = newItem[fieldName];
                        });
                        changed.push([
                            newItem,
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
            /*        
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
      
*/
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
        var filter;
        if (typeof ids === 'number') {
            single = true;
            filter = { id: [ids] };
        } else if (Array.isArray(ids)) {
            filter = { id: ids };
        } else if (typeof ids === 'object') {
            filter = ids;
        } else if (ids === null) {
            filter = {};
        }
        return new Promise(function (accept, reject) {
            try {
                self.$orm.connect(function () {
                    self.$orm.query(modelName, filter, null, function (data) {
                        if (single) {
                            accept(data.length ? data[0] : null);
                        } else {
                            accept(data);
                        }
                    });
                });
            } catch (e) {
                reject(e);
            }
        });
    };
    /*
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
*/
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJjb25uZWN0aW9uLmpzIiwidG91Y2hlci5qcyIsInZhY3V1bWNhY2hlci5qcyIsImF1dG9saW5rZXIuanMiLCJsaXN0Y2FjaGVyLmpzIiwibWFueXRvbWFueS5qcyIsImNhY2hlci5qcyIsIm9ybS5qcyJdLCJuYW1lcyI6WyJIYW5kbGVyIiwiaGFuZGxlcnMiLCJzdHJIYW5kbGVycyIsInByb3RvdHlwZSIsImFkZEhhbmRsZXIiLCJoYW5kbGVyIiwic3RySGFuZGxlciIsInV0aWxzIiwiaGFzaCIsInRvU3RyaW5nIiwicHVzaCIsImhhbmRsZSIsImFyZ3MiLCJBcnJheSIsInNsaWNlIiwiY2FsbCIsImFyZ3VtZW50cyIsImZvckVhY2giLCJmdW5jIiwiYXBwbHkiLCJoYW5kbGVCeSIsInRocyIsIk5hbWVkRXZlbnRNYW5hZ2VyIiwiZXZlbnRzIiwiaGFuZGxlcklkIiwiaWR4SWQiLCJvbiIsIm5hbWUiLCJpZCIsImVtaXQiLCJldmVudCIsInVuYmluZCIsImNvdW50IiwiTGF6eSIsImVhY2giLCJ2IiwiayIsImlkeCIsIm4iLCJyZXZlcnNlIiwieCIsInNwbGljZSIsIm9uY2UiLCJldmVudE5hbWUiLCJoYW5kbGVyRnVuY3Rpb24iLCJzZWxmIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsIm1vY2siLCJyZW5hbWVGdW5jdGlvbiIsImZuIiwiRnVuY3Rpb24iLCJiaW5kIiwiY2FjaGVkIiwia2V5Iiwid3JhcHBlciIsImxvZyIsImNvbnNvbGUiLCJ4ZHIiLCJ1cmwiLCJkYXRhIiwiYXBwbGljYXRpb24iLCJ0b2tlbiIsImZvcm1FbmNvZGUiLCJQcm9taXNlIiwiYWNjZXB0IiwicmVqZWN0IiwicmVxIiwiWE1MSHR0cFJlcXVlc3QiLCJvbnJlYWR5c3RhdGVjaGFuZ2UiLCJyZWFkeVN0YXRlIiwicmVzcG9uc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwicmVzcG9uc2VUZXh0IiwiYSIsInJlc3BvbnNlIiwic3RhdHVzIiwicmVxdWVzdCIsIlhEb21haW5SZXF1ZXN0Iiwib25sb2FkIiwic3RhdHVzVGV4dCIsIkVycm9yIiwib3BlbiIsIm9uZXJyb3IiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiX190b2tlbl9fIiwic2l6ZSIsInN0cmluZ2lmeSIsIm1hcCIsImVuY29kZVVSSSIsInRvQXJyYXkiLCJqb2luIiwic2VuZCIsImNhcGl0YWxpemUiLCJzIiwidG9VcHBlckNhc2UiLCJ0b0xvd2VyQ2FzZSIsInN0ciIsInJldCIsImxlbmd0aCIsImNoYXJDb2RlQXQiLCJtYWtlRmlsdGVyIiwibW9kZWwiLCJmaWx0ZXIiLCJ1bmlmaWVyIiwiZG9udFRyYW5zbGF0ZUZpbHRlciIsInNvdXJjZSIsInZhbHMiLCJmaWVsZCIsImlzQXJyYXkiLCJmaWVsZHMiLCJ0eXBlIiwiY29uc3RydWN0b3IiLCJOdW1iZXIiLCJlcnJvciIsIm9ybSIsInNhbWVBcyIsInkiLCJwbHVyYWxpemUiLCJiZWZvcmVDYWxsIiwiYmVmb3JlIiwiZGVjb3JhdG9yIiwidGhlbiIsImNsZWFuU3RvcmFnZSIsImxvY2FsU3RvcmFnZSIsImtleXMiLCJjbGVhbkRlc2NyaXB0aW9uIiwic3RhcnRzV2l0aCIsImNociIsInNwbGl0IiwicGVybXV0YXRpb25zIiwiYXJyIiwid2FpdEZvciIsImNhbGxCYWNrIiwid2FpdGVyIiwic2V0VGltZW91dCIsImJvb2wiLCJCb29sZWFuIiwibm9vcCIsInR6T2Zmc2V0IiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwidHJhbnNGaWVsZFR5cGUiLCJkYXRlIiwiZGF0ZXRpbWUiLCJzdHJpbmciLCJ0ZXh0IiwiaW50ZWdlciIsInBhcnNlSW50IiwiZmxvYXQiLCJwYXJzZUZsb2F0IiwiU1RBVFVTS0VZIiwiUmVhbHRpbWVDb25uZWN0aW9uIiwiZW5kUG9pbnQiLCJyd3RDb25uZWN0aW9uIiwiY29ubmVjdGlvbiIsIlNvY2tKUyIsIm9ub3BlbiIsInRlbmFudCIsIm9ubWVzc2FnZSIsImUiLCJvbmNsb3NlIiwid3NDb25uZWN0IiwiY2FjaGVkU3RhdHVzIiwiY2xvc2UiLCJyZVdoZWVsQ29ubmVjdGlvbiIsImdldExvZ2luIiwiZW5kc1dpdGgiLCJpc0Nvbm5lY3RlZCIsImlzTG9nZ2VkSW4iLCIkcG9zdCIsInByb21pc2UiLCJ4aHIiLCJmb3JjZSIsInN0YXR1c1dhaXRpbmciLCJ1cGRhdGVTdGF0dXMiLCJsYXN0QnVpbGQiLCJsYXN0X2J1aWxkIiwidXNlcl9pZCIsIm9sZFN0YXR1cyIsImxvZ2luSW5mbyIsIk9iamVjdCIsImxvZ2luIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsIm9iaiIsInJlYWx0aW1lRW5kUG9pbnQiLCJ3c0Nvbm5lY3Rpb24iLCJ1c2VyaWQiLCJsb2dvdXQiLCJvayIsImNvbm5lY3QiLCJUb3VjaGVyIiwidG91Y2hlZCIsInRvdWNoIiwidCIsIlZhY3V1bUNhY2hlciIsImFza2VkIiwicGtJbmRleCIsIm1pc3NpbmciLCJhc2siLCJsYXp5IiwiY29udGFpbnMiLCJnZXRBc2tlZEluZGV4IiwibWlzc2luZ3MiLCJ1bmlxdWUiLCJBdXRvTGlua2VyIiwiYWN0aXZlcyIsIklEQiIsIlcyUFJFU09VUkNFIiwibGlzdENhY2hlIiwibWFpbkluZGV4IiwiZm9yZWlnbktleXMiLCJtMm0iLCJtMm1JbmRleCIsInBlcm1pc3Npb25zIiwiaW5kZXgiLCJnZXRJbmRleEZvciIsInJlZmVyZW5jZXMiLCJyZWZlcmVuY2UiLCJpbmRleE5hbWUiLCJ0byIsInJlZmVyZW5jZWRCeSIsImJ5IiwibWFueVRvTWFueSIsInJlbGF0aW9uIiwiTWFueVRvTWFueVJlbGF0aW9uIiwibTJtR2V0IiwiY29sbGVjdGlvbiIsImdvdERhdGEiLCJnZXRNMk0iLCJsaW5rVW5saW5rZWQiLCJ2YWx1ZXMiLCJzdW0iLCJjaGFuZ2VkIiwiaW5kZXhlcyIsIklOREVYIiwiZ2V0dGVyIiwiaWRzIiwib3RoZXJJbmRleCIsImRlc2NyaWJlIiwiZmxhdHRlbiIsIm1vZGVsTmFtZSIsImlkYiIsImZldGNoIiwibWFpblJlc291cmNlIiwiZmllbGROYW1lIiwidG9PYmplY3QiLCJyZXNvdXJjZU5hbWUiLCJnb3RQZXJtaXNzaW9ucyIsIlBFUk1JU1NJT05TIiwic2V0SW50ZXJ2YWwiLCJMaXN0Q2FjaGVyIiwiZ290QWxsIiwiY29tcG9zaXRlQXNrZWQiLCJjYXJ0ZXNpYW5Qcm9kdWN0MSIsImIiLCJjYXJ0ZXNpYW5Qcm9kdWN0IiwiZXhwbG9kZUZpbHRlciIsInByb2R1Y3QiLCJyIiwiZmlsdGVyU2luZ2xlIiwidGVzdE9ubHkiLCJkaWZmZXJlbmNlIiwiY2xlYW5Db21wb3NpdGVzIiwiZmlsdGVyTGVuIiwiaXRlbXMiLCJpdGVtIiwiZ290Iiwic2luZ2xlIiwic29tZSIsImYiLCJleHBsb2RlZCIsInBhcnRpYWxzIiwiYmFkIiwicGx1Y2siLCJhZGQiLCJmaW5kIiwiZ2V0MCIsImdldDEiLCJkZWwiLCJsIiwiY2FjaGVkUHJvcGVydHlCeUV2ZW50cyIsInByb3RvIiwicHJvcGVydHlOYW1lIiwic2V0dGVyIiwicmVzdWx0IiwicHJvcGVydHlEZWYiLCJ2YWx1ZSIsImlzRmluaXRlIiwiZGVmaW5lUHJvcGVydHkiLCJWYWxpZGF0aW9uRXJyb3IiLCJyZXNvdXJjZSIsIl9yZXNvdXJjZSIsImZvcm1JZHgiLCJlcnJvcnMiLCJiYXNlT1JNIiwib3B0aW9ucyIsImV4dE9STSIsIlN0cmluZyIsImNvbm5lY3RlZCIsIndzIiwiaW5mbyIsIm9uTWVzc2FnZUpzb24iLCJvbk1lc3NhZ2VUZXh0IiwibWVzc2FnZSIsInNlbnREYXRhIiwid2FpdGluZ0Nvbm5lY3Rpb25zIiwiYXV0aF9ncm91cCIsIklEWCIsIlJFVklEWCIsImJ1aWxkZXJIYW5kbGVycyIsImJ1aWxkZXJIYW5kbGVyVXNlZCIsInBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiZXZlbnRIYW5kbGVycyIsInBlcm1pc3Npb25XYWl0aW5nIiwibW9kZWxDYWNoZSIsImZhaWxlZE1vZGVscyIsImxpbmtlciIsIndpbmRvdyIsInZhbGlkYXRpb25FdmVudCIsImN1cnJlbnRDb250ZXh0Iiwic2F2aW5nRXJyb3JIYW5sZGVyIiwiZ2V0SW5kZXgiLCJnZXRVbmxpbmtlZCIsIlVOTElOS0VEIiwiUGVybWlzc2lvblRhYmxlIiwia2xhc3MiLCJzYXZlIiwiY2IiLCJteVBlcm1zIiwiZ3JvdXBfaWQiLCJwZXJtaXNzaW9uTGlzdCIsInAiLCJwZXJtcyIsImFsbFBlcm1pc3Npb25zIiwiaW5kZXhPZiIsIm1ha2VNb2RlbENsYXNzIiwiX21vZGVsIiwicmVhZGFibGUiLCJ3cml0YWJsZSIsInByaXZhdGVBcmdzIiwibWVyZ2UiLCJmdW5jU3RyaW5nIiwiS2xhc3MiLCJyZWZfdHJhbnNsYXRpb25zIiwiaW52ZXJzZV9yZWZlcmVuY2VzIiwicmVmZXJlbnRzIiwiZmllbGRzT3JkZXIiLCJmaWVsZE9yZGVyIiwicmVwcmVzZW50YXRpb24iLCJkZWxldGUiLCJfcGVybWlzc2lvbnMiLCJhbGxfcGVybXMiLCJvYmplY3RfaWQiLCJncm91cGVkIiwidW5rbm93bl9ncm91cHMiLCJncm91cEJ5IiwibyIsImFzUmF3IiwiSUQiLCJhcmciLCJjb250ZXh0IiwiY29weSIsImFzciIsImNvbmNhdCIsInNhdmVNdWx0aSIsIm9iamVjdHMiLCJzY29wZSIsInJhdyIsImRlbGV0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsImNvZGUiLCJzYXZlUEEiLCJUIiwib28iLCJQQSIsIkZzIiwiZmllbGRJZHgiLCJ0YXAiLCJpbmRleEJ5Iiwid2lkZ2V0IiwicmVmIiwiZXh0X3JlZiIsImxvY2FsX3JlZiIsIndhcm4iLCJUeXBlRXJyb3IiLCJyZXZJbmRleCIsImhhc093blByb3BlcnR5Iiwib3B0cyIsImZpcnN0Iiwib21vZGVsTmFtZSIsInZhbGlkYXRvcnMiLCJ1bmxpbmtSZWZlcmVuY2UiLCJpbnN0YW5jZSIsImluc3RhbmNlcyIsIm9tb2RlbCIsImxpbmtSZWZlcmVuY2UiLCJyZWZzIiwiSU5ERVhfTTJNIiwiVzJQX1BPU1QiLCJfZXh0cmEiLCJUT09ORSIsIlRPTUFOWSIsIk1BTllUT01BTlkiLCJtb2RlbENsYXNzIiwiemlwIiwiZGVsZXRlZCIsIk1QQSIsInJlY29yZCIsIml0YWIiLCJ0YWJsZSIsImlrIiwibm5ldyIsInVwZGF0ZWQiLCJuZXdPYmplY3RzIiwibW9kZWxSZWZlcmVuY2VzIiwib2xkSXRlbSIsIm9sZENvcHkiLCJuZXdJdGVtIiwiTmFOIiwibm8iLCJ0b3RhbFJlc3VsdHMiLCJnb3RNMk0iLCJyb3ciLCJtIiwidmVyYiIsInRvZ2V0aGVyIiwic2VuZERhdGEiLCJHT1RfQUxMIiwiZ290TW9kZWwiLCJjYWNoZUtleSIsIm1vZGVsTm90Rm91bmQiLCJhZGRNb2RlbEhhbmRsZXIiLCJhZGRQZXJzaXN0ZW50QXR0cmlidXRlcyIsImF0dHJpYnV0ZXMiLCJhZGRQcm9wZXJ0eSIsInZhbCIsImthdHRyIiwic2V0IiwiYXR0cnMiLCJuZXdBdHRycyIsInF1ZXJ5IiwiZmlsdGVyRnVuY3Rpb24iLCJyZVdoZWVsT1JNIiwibG9naW5GdW5jIiwiJG9ybSIsImdldE1vZGVsIiwibW9kTmFtZSIsImdldExvZ2dlZFVzZXIiLCJ1c2VyIiwiJHNlbmRUb0VuZHBvaW50Il0sIm1hcHBpbmdzIjoiOzs7SUFBQSxhO0lBRUEsU0FBQUEsT0FBQSxHQUFBO0FBQUEsUUFDQSxLQUFBQyxRQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsUUFFQSxLQUFBQyxXQUFBLEdBQUEsRUFBQSxDQUZBO0FBQUEsSztJQUdBLEM7SUFFQUYsT0FBQSxDQUFBRyxTQUFBLENBQUFDLFVBQUEsR0FBQSxVQUFBQyxPQUFBLEVBQUE7QUFBQSxRQUNBLElBQUFDLFVBQUEsR0FBQUMsS0FBQSxDQUFBQyxJQUFBLENBQUFILE9BQUEsQ0FBQUksUUFBQSxFQUFBLENBQUEsQ0FEQTtBQUFBLFFBRUEsSUFBQSxDQUFBLENBQUFILFVBQUEsSUFBQSxLQUFBSixXQUFBLENBQUEsRUFBQTtBQUFBLFlBQ0EsS0FB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VUFBQSxDQUFBMkIsS0FBQSxDQUFBQyxRQUFBLEVBQUFDLFFBQUEsQ0FBQSxDQURBO0FBQUEsS0FBQSxDIiwiZmlsZSI6InJ3dC5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gSGFuZGxlcigpe1xuICAgIHRoaXMuaGFuZGxlcnMgPSBbXTtcbiAgICB0aGlzLnN0ckhhbmRsZXJzID0ge307XG59O1xuXG5IYW5kbGVyLnByb3RvdHlwZS5hZGRIYW5kbGVyID0gZnVuY3Rpb24gKGhhbmRsZXIpe1xuICAgIHZhciBzdHJIYW5kbGVyID0gdXRpbHMuaGFzaChoYW5kbGVyLnRvU3RyaW5nKCkpO1xuICAgIGlmICghKHN0ckhhbmRsZXIgaW4gdGhpcy5zdHJIYW5kbGVycykpe1xuICAgICAgICB0aGlzLnN0ckhhbmRsZXJzW3N0ckhhbmRsZXJdID0gaGFuZGxlcjtcbiAgICAgICAgdGhpcy5oYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH1cbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApO1xuICAgIHRoaXMuaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihmdW5jKXtcbiAgICAgICAgZnVuYy5hcHBseShudWxsLGFyZ3MpO1xuICAgIH0pXG59O1xuSGFuZGxlci5wcm90b3R5cGUuaGFuZGxlQnkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgIHZhciB0aHMgPSBhcmd1bWVudHNbMF07XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KHRocyxhcmdzKTtcbiAgICB9KVxufTtcblxuXG5mdW5jdGlvbiBOYW1lZEV2ZW50TWFuYWdlciAoKXtcbiAgICB2YXIgZXZlbnRzID0ge307XG4gICAgdmFyIGhhbmRsZXJJZCA9IHt9O1xuICAgIHZhciBpZHhJZCA9IDA7XG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKG5hbWUsIGZ1bmMpe1xuICAgICAgICBpZiAoIShuYW1lIGluIGV2ZW50cykpe1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdID0gbmV3IEFycmF5KCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkID0gaWR4SWQgKys7XG4gICAgICAgIGV2ZW50c1tuYW1lXS5wdXNoKGZ1bmMpO1xuICAgICAgICBoYW5kbGVySWRbaWRdID0gZnVuYztcbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH07XG4gICAgdGhpcy5lbWl0ID0gZnVuY3Rpb24obmFtZSl7XG4gICAgICAgIGlmIChuYW1lIGluIGV2ZW50cyl7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKTtcbiAgICAgICAgICAgIGV2ZW50c1tuYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgICAgICBldmVudC5hcHBseShudWxsLGFyZ3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMudW5iaW5kID0gZnVuY3Rpb24oaGFuZGxlcil7XG4gICAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICAgIGlmIChoYW5kbGVyIGluIGhhbmRsZXJJZCl7XG4gICAgICAgICAgICB2YXIgZnVuYyA9IGhhbmRsZXJJZFtoYW5kbGVyICsgJyddO1xuICAgICAgICAgICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbiBpbiB2KXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZbbl0gPT09IGZ1bmMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWR4LnB1c2gobik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlkeC5yZXZlcnNlKCkuZm9yRWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgdi5zcGxpY2UoeCwxKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBoYW5kbGVySWRbaGFuZGxlcl07XG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENhbGwgZXZlbnQgb25jZVxuICAgICAqL1xuICAgIHRoaXMub25jZSA9IGZ1bmN0aW9uKGV2ZW50TmFtZSwgaGFuZGxlckZ1bmN0aW9uKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGhhbmRsZXIgPSB0aGlzLm9uKGV2ZW50TmFtZSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGhhbmRsZXJGdW5jdGlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgc2VsZi51bmJpbmQoaGFuZGxlcik7XG4gICAgICAgIH0pXG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2FjaGVkS2V5SWR4ID0gMDtcblxudmFyIG51bGxTdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICcnfTtcblxuZnVuY3Rpb24gbW9ja09iamVjdCgpe1xuICAgIHJldHVybiBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbih0YXJnZXQsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbmFtZSAgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSA9PT0gJ3RvU3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbFN0cmluZztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXRpbHMubW9jaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRbbmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG4vKlxudmFyICRQT1NUID0gZnVuY3Rpb24odXJsLCBkYXRhLCBjYWxsQmFjaywgZXJyb3JCYWNrLGhlYWRlcnMpe1xuICAgIHZhciBvcHRzID0ge1xuICAgICAgICBhY2NlcHRzIDogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICB1cmwgOiB1cmwsXG4gICAgICAgIGRhdGEgOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgZGF0YVR5cGUgOiAnanNvbicsXG4gICAgICAgIHN1Y2Nlc3MgOiBjYWxsQmFjayxcbiAgICAgICAgZXJyb3IgOiBlcnJvckJhY2ssXG4gICAgICAgIG1ldGhvZCA6ICdQT1NUJyxcbiAgICAgICAgY29udGVudFR5cGUgOiAnYXBwbGljYXRpb24vanNvbidcbiAgICB9O1xuICAgIGlmIChoZWFkZXJzKXtcbiAgICAgICAgb3B0cy5oZWFkZXJzID0gaGVhZGVycztcbiAgICAgICAgb3B0cy5jcm9zc0RvbWFpbiA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiAkLmFqYXgob3B0cyk7XG59XG5cblxuZnVuY3Rpb24gcmVXaGVlbENvbm5lY3Rpb24oZW5kUG9pbnQsIGdldExvZ2luKXtcbiAgICAvLyBtYWluIFxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmdldExvZ2luID0gZ2V0TG9naW47XG4gICAgdGhpcy5ldmVudHMgPSBuZXcgTmFtZWRFdmVudE1hbmFnZXIoKVxuICAgIHRoaXMuJFBPU1QgPSAkUE9TVC5iaW5kKHRoaXMpO1xuICAgIHRoaXMub3B0aW9ucyA9IHtlbmRQb2ludCA6IGVuZFBvaW50fTtcbiAgICB0aGlzLm9uID0gdGhpcy5ldmVudHMub24uYmluZCh0aGlzKTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbihzdGF0dXMsIGNhbGxCYWNrLCBlcnJvcikge1xuICAgIGlmIChzdGF0dXMpIHtcbiAgICAgICAgdmFyIGlzTG9nZ2VkID0gKHN0YXR1cy51c2VyX2lkICYmICF0aGlzLm9wdGlvbnMudXNlcl9pZCApO1xuICAgICAgICBmb3IgKHZhciB4IGluIHN0YXR1cyl7IHRoaXMub3B0aW9uc1t4XSA9IHN0YXR1c1t4XTsgfVxuICAgICAgICBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG4gICAgICAgIGlmIChpc0xvZ2dlZCkge1xuICAgICAgICAgICAgdGhpcy5ldmVudHMuZW1pdCgnbG9naW4nLCB0aGlzLm9wdGlvbnMudXNlcl9pZCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudXNlcl9pZCAmJiB0aGlzLmdldExvZ2luKXtcbiAgICAgICAgdmFyIGxvZ0luZm8gPSB0aGlzLmdldExvZ2luKGVycm9yKTtcbiAgICAgICAgaWYgKGxvZ0luZm8uY29uc3RydWN0b3IgPT09IE9iamVjdCl7XG4gICAgICAgICAgICB0aGlzLmxvZ2luKGxvZ0luZm8udXNlcm5hbWUsIGxvZ0luZm8ucGFzc3dvcmQpXG4gICAgICAgICAgICAudGhlbigoZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhzdGF0dXMsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgICAgICB9IGVsc2UgaWYgKGxvZ0luZm8uY29uc3RydWN0b3IgPT09IFByb21pc2UpIHtcbiAgICAgICAgICAgIGxvZ0luZm8udGhlbigoZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgICAgICB2YXIgeCA9IHRoaXMubG9naW4ob2JqLnVzZXJuYW1lLG9iai5wYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgdmFyIG1hbmFnZUVycm9yID0gKGZ1bmN0aW9uKGJhZCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKG51bGwsY2FsbEJhY2ssYmFkLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9KS5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgICAgIGlmIChjYWxsQmFjayl7XG4gICAgICAgICAgICAgICAgICAgIHgudGhlbihjYWxsQmFjayxtYW5hZ2VFcnJvcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgeC50aGVuKG51bGwsIG1hbmFnZUVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHRoaXMub3B0aW9ucyk7XG4gICAgfSAgICBcbn1cblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnN0YXR1cyA9IGZ1bmN0aW9uKGNhbGxCYWNrLCBmb3JjZSl7XG4gICAgaWYgKCgnbGFzdFJXVFN0YXR1cycgaW4gbG9jYWxTdG9yYWdlKSAmJiAhZm9yY2UpIHtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgdmFyIHN0YXR1cyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoc3RhdHVzLGNhbGxCYWNrKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdGF0dXMoY2FsbEJhY2ssIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYWxsQmFjayAmJiBjYWxsQmFjayhzdGF0dXMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fc3RhdHVzX2NhbGxpbmcpe1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLnN0YXR1cyhjYWxsQmFjayk7XG4gICAgICAgIH0sNTApO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy50aW1lc3RhbXApe1xuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayh0aGlzLm9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXR1c19jYWxsaW5nID0gdHJ1ZTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdCgnYXBpL3N0YXR1cycsbnVsbCxmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMgPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xuICAgICAgICAgICAgc2VsZi5fc3RhdHVzX2NhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHNlbGYudXBkYXRlU3RhdHVzKHN0YXR1cyxjYWxsQmFjayk7XG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgfVxufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLiRwb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLGNhbGxCYWNrKXtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIGlmICghZGF0YSl7XG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIHZhciBoZWFkZXJzID0geyBcbiAgICAgICAgICAgIHRva2VuIDogdGhpcy5vcHRpb25zLnRva2VuLFxuICAgICAgICAgICAgYXBwbGljYXRpb24gOiB0aGlzLm9wdGlvbnMuYXBwbGljYXRpb25cbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaGVhZGVycyA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5vcHRpb25zLmVuZFBvaW50ICsgdXJsLCBkYXRhLCB0aHMub3B0aW9ucy5hcHBsaWNhdGlvbiwgdGhzLm9wdGlvbnMudG9rZW4pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZScsIHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzICsgJy1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7IGNhbGxCYWNrKCB4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQgKX07XG4gICAgICAgICAgICAgICAgYWNjZXB0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItanNvbicsIHhoci5yZXNwb25zZURhdGEsIHhoci5zdGF0dXMsIHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1qc29uLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VEYXRhLHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1odHRwJyx4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItaHR0cC0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCl7XG4gICAgdmFyIHVybCA9IHRoaXMub3B0aW9ucy5lbmRQb2ludCArICdhcGkvbG9naW4nO1xuICAgIHZhciBjb25uZWN0aW9uID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih1cmwseyB1c2VybmFtZTogdXNlcm5hbWUsIHBhc3N3b3JkIDogcGFzc3dvcmR9LCBudWxsLGNvbm5lY3Rpb24ub3B0aW9ucy50b2tlbiwgdHJ1ZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbi51cGRhdGVTdGF0dXMoeGhyLnJlc3BvbnNlRGF0YSk7XG4gICAgICAgICAgICAgICAgYWNjZXB0KHN0YXR1cyk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKGNhbGxCYWNrKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHdzY29ubmVjdCA9IGZ1bmN0aW9uKHNlbGYpe1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbiA9IG5ldyB1dGlscy53c0Nvbm5lY3Qoc2VsZi5vcHRpb25zKTtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24ub25Db25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLmV2ZW50cy5lbWl0KCd3cy1jb25uZWN0ZWQnLCBzZWxmLndzQ29ubmVjdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbi5vbkRpc2Nvbm5lY3QoZnVuY3Rpb24oKXsgXG4gICAgICAgICAgICBpZiAoc2VsZi5vcHRpb25zICYmIHNlbGYub3B0aW9ucy5yZWFsdGltZUVuZFBvaW50KXtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHdzY29ubmVjdChzZWxmKTsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSwxMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0aGlzLnN0YXR1cygoZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgaWYgKCd0b2tlbicgaW4gc2VsZi5vcHRpb25zKXtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGluZyB0byAnICsgc2VsZi5vcHRpb25zLmVuZFBvaW50KTtcbiAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMudXNlcm5hbWUgJiYgc2VsZi5vcHRpb25zLnBhc3N3b3JkKXtcbiAgICAgICAgICAgICAgICBzZWxmLmxvZ2luKFxuICAgICAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucy5wYXNzd29yZCxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZW5ld2luZyBjb25uZWN0aW9uJylcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc2VsZi5vcHRpb25zLnRva2VuICYmIHNlbGYub3B0aW9ucy5yZWFsdGltZUVuZFBvaW50ICYmICghc2VsZi53c0Nvbm5lY3Rpb24pKXtcbiAgICAgICAgICAgIHdzY29ubmVjdChzZWxmKTtcbiAgICAgICAgfVxuICAgIH0pLmJpbmQodGhpcykpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ091dCA9IGZ1bmN0aW9uKHVybCwgY2FsbEJhY2spe1xuICAgIHJldHVybiB0aGlzLiRwb3N0KCdhcGkvbG9nb3V0Jyx7fSwoZnVuY3Rpb24oc3RhdHVzKSB7XG4gICAgICAgIGlmICgnbGFzdFJXVFN0YXR1cycgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0ge2VuZFBvaW50OiB0aGlzLm9wdGlvbnMuZW5kUG9pbnR9O1xuICAgICAgICBpZiAodGhpcy53c0Nvbm5lY3Rpb24pIHsgXG4gICAgICAgICAgICB0aGlzLndzQ29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24gPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cmwpIHsgbG9jYXRpb24gPSB1cmw7IH1cbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICB9KS5iaW5kKHRoaXMpKTtcbn1cbiovXG52YXIgdXRpbHMgPSB7XG4gICAgcmVuYW1lRnVuY3Rpb24gOiBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgICAgICAgcmV0dXJuIChuZXcgRnVuY3Rpb24oXCJyZXR1cm4gZnVuY3Rpb24gKGNhbGwpIHsgcmV0dXJuIGZ1bmN0aW9uIFwiICsgbmFtZSArXG4gICAgICAgICAgICBcIiAoKSB7IHJldHVybiBjYWxsKHRoaXMsIGFyZ3VtZW50cykgfTsgfTtcIikoKSkoRnVuY3Rpb24uYXBwbHkuYmluZChmbikpO1xuICAgIH0sXG4gICAgY2FjaGVkIDogZnVuY3Rpb24oZnVuYywga2V5KXtcbiAgICAgICAgaWYgKCFrZXkpeyAgICBcbiAgICAgICAgICAgIGtleSA9ICdfJyArIGNhY2hlZEtleUlkeCsrO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHdyYXBwZXIoKXtcbiAgICAgICAgICAgIGlmICghdGhpc1trZXldKXtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBmdW5jLmNhbGwodGhpcyxbYXJndW1lbnRzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpc1trZXldO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gd3JhcHBlcjtcbiAgICB9LFxuLy8gICAgJFBPU1QgOiAkUE9TVCxcbi8vICAgIHJlV2hlZWxDb25uZWN0aW9uOiByZVdoZWVsQ29ubmVjdGlvbixcbiAgICBsb2c6IGZ1bmN0aW9uKCl7IFxuICAgICAgICBjb25zb2xlLmxvZyhhcmd1bWVudHMpO1xuICAgIH0sXG5cbiAgICB4ZHI6IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGFwcGxpY2F0aW9uLHRva2VuLCBmb3JtRW5jb2RlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlIGFuIEhUVFAgUmVxdWVzdCBhbmQgcmV0dXJuIGl0cyBwcm9taXNlLlxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgcmVxO1xuICAgICAgICAgICAgaWYgKCFkYXRhKSB7IGRhdGEgPSB7fTt9XG5cbiAgICAgICAgICAgIGlmKFhNTEh0dHBSZXF1ZXN0KSB7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgICAgICAgICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2VEYXRhID0gSlNPTi5wYXJzZShyZXEucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZURhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlID0ge3Jlc3BvbnNlRGF0YTogcmVzcG9uc2VEYXRhLCByZXNwb25zZVRleHQ6IHJlcS5yZXNwb25zZVRleHQsc3RhdHVzOiByZXEuc3RhdHVzLCByZXF1ZXN0OiByZXF9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcS5zdGF0dXMgPj0gMjAwICYmIHJlcS5zdGF0dXMgPCA0MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihYRG9tYWluUmVxdWVzdCl7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFhEb21haW5SZXF1ZXN0KCk7XG4gICAgICAgICAgICAgICAgcmVxLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBhY2NlcHQocmVxLnJlc3BvbnNlVGV4dCxyZXEuc3RhdHVzVGV4dCwgcmVxKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdDT1JTIG5vdCBzdXBwb3J0ZWQnKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlcS5vcGVuKCdQT1NUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgICAgIHJlcS5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICAgIGlmICh0b2tlbikgeyBkYXRhLl9fdG9rZW5fXyA9IHRva2VuIH1cbiAgICAgICAgICAgIGlmICghZm9ybUVuY29kZSl7XG4gICAgICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ3RleHQvcGxhaW4nKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5zaXplKCk/SlNPTi5zdHJpbmdpZnkoZGF0YSk6Jyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBrICsgJz0nICsgZW5jb2RlVVJJKHYudG9TdHJpbmcoKSk7ICBcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCkuam9pbignJicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVxLnNlbmQoZGF0YSk7XG4gICAgLy8gICAgICAgIHJlcS5zZW5kKG51bGwpO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgY2FwaXRhbGl6ZSA6IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHJldHVybiBzWzBdLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgfSxcblxuICAgIGhhc2ggOiBmdW5jdGlvbihzdHIpe1xuICAgICAgICAvKipcbiAgICAgICAgICogSGFzaGVkIGZ1bmN0aW9uXG4gICAgICAgICAqL1xuICAgICAgICBzdHIgPSBzdHIudG9TdHJpbmcoKTtcbiAgICAgICAgdmFyIHJldCA9IDE7XG4gICAgICAgIGZvciAodmFyIHggPSAwO3g8c3RyLmxlbmd0aDt4Kyspe1xuICAgICAgICAgICAgcmV0ICo9ICgxICsgc3RyLmNoYXJDb2RlQXQoeCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAocmV0ICUgMzQ5NTgzNzQ5NTcpLnRvU3RyaW5nKCk7XG4gICAgfSxcblxuICAgIG1ha2VGaWx0ZXIgOiBmdW5jdGlvbiAobW9kZWwsIGZpbHRlciwgdW5pZmllciwgZG9udFRyYW5zbGF0ZUZpbHRlcikge1xuICAgICAgICAvKipcbiAgICAgICAgICogTWFrZSBmaWx0ZXIgZm9yIEFycmF5LmZpbHRlciBmdW5jdGlvbiBhcyBhbiBhbmQgb2Ygb3JcbiAgICAgICAgICovXG4gICAgICAgIGlmICghdW5pZmllcikgeyB1bmlmaWVyID0gJyAmJiAnO31cbiAgICAgICAgaWYgKExhenkoZmlsdGVyKS5zaXplKCkgPT09IDApe1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpeyByZXR1cm4gdHJ1ZSB9O1xuICAgICAgICB9XG4gICAgICAgIHZhciBzb3VyY2UgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHZhbHMsIGZpZWxkKXtcbiAgICAgICAgICAgIGlmICghdmFscykgeyB2YWxzID0gW251bGxdfVxuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHMpKXtcbiAgICAgICAgICAgICAgICB2YWxzID0gW3ZhbHNdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFkb250VHJhbnNsYXRlRmlsdGVyICYmIChtb2RlbC5maWVsZHNbZmllbGRdLnR5cGUgPT09ICdyZWZlcmVuY2UnKSkge1xuICAgICAgICAgICAgICAgIGZpZWxkID0gJ18nICsgZmllbGQ7XG4gICAgICAgICAgICAgICAgdmFscyA9IExhenkodmFscykubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoeCAmJiAoeC5jb25zdHJ1Y3RvciAhPT0gTnVtYmVyKSl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtb2RlbC5maWVsZHNbZmllbGRdLnR5cGUgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICB2YWxzID0gdmFscy5tYXAoSlNPTi5zdHJpbmdpZnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICcoJyArICBMYXp5KHZhbHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICBpZiAoIXgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignbWFrZUZpbHRlciB4IGlzIG51bGwnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYoeCA9PT0gb3JtLnV0aWxzLm1vY2spIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignbWFrZUZpbHRlciB3aXRoIE1vY2sgT2JqZWN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAnKHguJyArIGZpZWxkICsgJyA9PT0gJyArIHggKyAnKSc7XG4gICAgICAgICAgICB9KS5qb2luKCcgfHwgJykgICsnKSc7XG4gICAgICAgIH0pLnRvQXJyYXkoKS5qb2luKHVuaWZpZXIpO1xuICAgICAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKFwieFwiLCBcInJldHVybiBcIiArIHNvdXJjZSk7XG4gICAgfSxcblxuICAgIHNhbWVBcyA6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWVwIGVxdWFsXG4gICAgICAgICAqL1xuICAgICAgICBmb3IgKHZhciBrIGluIHgpIHtcbiAgICAgICAgICAgIGlmICh5W2tdICE9IHhba10pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBcbiAgICBwbHVyYWxpemUgOiBmdW5jdGlvbihzdHIsIG1vZGVsKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIExleGljYWxseSByZXR1cm5zIGVuZ2xpc2ggcGx1cmFsIGZvcm1cbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBzdHIgKyAncyc7XG4gICAgfSxcblxuICAgIGJlZm9yZUNhbGwgOiBmdW5jdGlvbihmdW5jLCBiZWZvcmUpe1xuICAgICAgICB2YXIgZGVjb3JhdG9yID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGJlZm9yZSgpLnRoZW4oZnVuYylcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGRlY29yYXRvcjtcbiAgICB9LFxuXG4gICAgY2xlYW5TdG9yYWdlIDogZnVuY3Rpb24oKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENsZWFuIGxvY2FsU3RvcmFnZSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIExhenkobG9jYWxTdG9yYWdlKS5rZXlzKCkuZWFjaChmdW5jdGlvbihrKXtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2Vba107XG4gICAgICAgIH0pXG4gICAgfSxcblxuICAgIGNsZWFuRGVzY3JpcHRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICBMYXp5KGxvY2FsU3RvcmFnZSlcbiAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24odiwgbikgeyByZXR1cm4gTGF6eShuKS5zdGFydHNXaXRoKCdkZXNjcmlwdGlvbjonKX0pXG4gICAgICAgICAgICAua2V5cygpXG4gICAgICAgICAgICAuZWFjaChmdW5jdGlvbihuKSB7IGRlbGV0ZSBsb2NhbFN0b3JhZ2Vbbl0gfSk7XG4gICAgfSxcbiAgICBcbiAgICByZXZlcnNlIDogZnVuY3Rpb24gKGNociwgc3RyKSB7XG4gICAgICAgIHJldHVybiBzdHIuc3BsaXQoY2hyKS5yZXZlcnNlKCkuam9pbihjaHIpO1xuICAgIH0sXG4gICAgcGVybXV0YXRpb25zOiBmdW5jdGlvbihhcnIpe1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGZvciAodmFyIHggPSBhcnIubGVuZ3RoLTE7IHggPj0gMDt4LS0pe1xuICAgICAgICAgICAgZm9yICh2YXIgeSA9IGFyci5sZW5ndGgtMTsgeSA+PSAwOyB5LS0pe1xuICAgICAgICAgICAgICAgIGlmICh4ICE9PSB5KVxuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChbYXJyW3hdLCBhcnJbeV1dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG5cbiAgICB3YWl0Rm9yOiBmdW5jdGlvbihmdW5jLCBjYWxsQmFjaykge1xuICAgICAgICB2YXIgd2FpdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoZnVuYygpKSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh3YWl0ZXIsNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZXRUaW1lb3V0KHdhaXRlciwgNTAwKTtcbiAgICB9LFxuXG4gICAgYm9vbDogQm9vbGVhbixcblxuICAgIG5vb3AgOiBmdW5jdGlvbigpe30sXG5cbiAgICB0ek9mZnNldDogbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDAsXG5cbiAgICB0cmFuc0ZpZWxkVHlwZToge1xuICAgICAgICBkYXRlOiBmdW5jdGlvbih4KSB7IHJldHVybiBuZXcgRGF0ZSh4ICogMTAwMCArIHV0aWxzLnR6T2Zmc2V0ICkgfSxcbiAgICAgICAgZGF0ZXRpbWU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG5ldyBEYXRlKHggKiAxMDAwICsgdXRpbHMudHpPZmZzZXQgKSB9LFxuICAgICAgICBzdHJpbmc6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG9TdHJpbmcoKTsgfSxcbiAgICAgICAgdGV4dDogZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b1N0cmluZygpOyB9LFxuICAgICAgICBpbnRlZ2VyOiBmdW5jdGlvbih4KSB7IHJldHVybiBwYXJzZUludCh4KTsgfSxcbiAgICAgICAgZmxvYXQ6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBhcnNlRmxvYXQoeCk7IH1cbiAgICB9LCBcbiAgICBtb2NrIDogbW9ja09iamVjdCgpXG59O1xuXG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFNUQVRVU0tFWSA9ICdsYXN0UldUQ29ubmVjdGlvblN0YXR1cyc7XG5cbmZ1bmN0aW9uIFJlYWx0aW1lQ29ubmVjdGlvbihlbmRQb2ludCwgcnd0Q29ubmVjdGlvbil7XG4gICAgLyoqXG4gICAgICogQ29ubmVjdHMgYSB3ZWJzb2NrZXQgd2l0aCByZVdoZWVsIGNvbm5lY3Rpb25cbiAgICAgKi9cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgY29ubmVjdGlvbiA9IG5ldyBTb2NrSlMoZW5kUG9pbnQpO1xuICAgIGNvbm5lY3Rpb24ub25vcGVuID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ29wZW4gOiAnICsgeCk7XG4gICAgICAgIGNvbm5lY3Rpb24udGVuYW50KCk7XG4gICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtY29ubmVjdGlvbi1vcGVuJyx4KTtcbiAgICB9O1xuICAgIGNvbm5lY3Rpb24ub25tZXNzYWdlID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgaWYgKHgudHlwZSA9PSAnbWVzc2FnZScpIHtcbiAgICAgICAgICAgIC8vJC5ub3RpZnkoeC5kYXRhKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy9UT0RPIHNldCBmcm9tUmVhbHRpbWVcbiAgICAgICAgICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLW1lc3NhZ2UtanNvbicsIEpTT04ucGFyc2UoeC5kYXRhKSk7XG4gICAgICAgICAgICAgICAgLy9UT0RPIHVuc2V0IGZyb21SZWFsdGltZVxuICAgICAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1tZXNzYWdlLXRleHQnLCBKU09OLnBhcnNlKHguZGF0YSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Zyb20gcmVhbHRpbWUgJyx4KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzZXRUaW1lb3V0KHV0aWxzLndzQ29ubmVjdCwxMDAwKTtcbiAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1jb25uZWN0aW9uLWNsb3NlZCcpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi50ZW5hbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uc2VuZCgnVEVOQU5UOicgKyByd3RDb25uZWN0aW9uLmNhY2hlZFN0YXR1cy5hcHBsaWNhdGlvbiArICc6JyArIHJ3dENvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnRva2VuKTtcbiAgICB9XG4gICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgfVxufSAgICBcblxuZnVuY3Rpb24gcmVXaGVlbENvbm5lY3Rpb24oZW5kUG9pbnQsIGdldExvZ2luKXtcbiAgICAvKipcbiAgICAgKiBDb25uZWN0aW9uIGJhc2ljIGZvciByZVdoZWVsXG4gICAgICogQHBhcmFtIGVuZFBvaW50OiBzdHJpbmcgYmFzZSB1cmwgZm9yIGFsbCBjb211bmljYXRpb25cbiAgICAgKiBAcGFyYW0gZ2V0TG9naW46IGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBpbiBjYXNlIG9mIG1pc3NpbmcgbG9naW4uXG4gICAgICogIHRoaXMgZnVuY3Rpb24gY291bGQgcmV0dXJuIDpcbiAgICAgKiAgLSAgIGEgeyB1c2VybmFtZSA6IDx1c2VybmFtZT4gLCBwYXNzd29yZDogPHBhc3N3b3JkPn0gb3JcbiAgICAgKiAgLSAgIGIgUHJvbWlzZSAtPiB7IHVzZXJuYW1lIDogPHVzZXJuYW1lPiAsIHBhc3N3b3JkOiA8cGFzc3dvcmQ+fVxuICAgICAqL1xuICAgIC8vIG1haW4gaW5pdGlhbGl6YXRpb25cbiAgICB2YXIgZXZlbnRzID0gbmV3IE5hbWVkRXZlbnRNYW5hZ2VyKCk7XG4gICAgdGhpcy5nZXRMb2dpbiA9IGdldExvZ2luO1xuICAgIHRoaXMuZW5kUG9pbnQgPSBlbmRQb2ludC5lbmRzV2l0aCgnLycpPyBlbmRQb2ludDogKGVuZFBvaW50ICsgJy8nKTtcbiAgICB0aGlzLm9uID0gZXZlbnRzLm9uO1xuICAgIHRoaXMudW5iaW5kID0gZXZlbnRzLnVuYmluZDtcbiAgICB0aGlzLmVtaXQgPSBldmVudHMuZW1pdDtcbiAgICB0aGlzLm9uY2UgPSBldmVudHMub25jZTtcbiAgICB0aGlzLmNhY2hlZFN0YXR1cyA9IHt9O1xuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmlzTG9nZ2VkSW4gPSBmYWxzZTtcbiAgICAvLyByZWdpc3RlcmluZyB1cGRhdGUgc3RhdHVzXG4gICAgdmFyIHRocyA9IHRoaXM7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuJHBvc3QgPSBmdW5jdGlvbih1cmwsIGRhdGEsY2FsbEJhY2spe1xuICAgIC8qKlxuICAgICAqIEFKQVggY2FsbCBmb3IgZmV0Y2ggYWxsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAcGFyYW0gdXJsOiBsYXN0IHVybCBwYXJ0IGZvciBhamF4IGNhbGxcbiAgICAgKiBAcGFyYW0gZGF0YTogZGF0YSBvYmplY3QgdG8gYmUgc2VudFxuICAgICAqIEBwYXJhbSBjYWxsQmFjazogZnVuY3Rpb24oeGhyKSB3aWxsIGJlIGNhbGxlZCB3aGVuIGRhdGEgYXJyaXZlc1xuICAgICAqIEByZXR1cm5zIFByb21pc2U8eGhyPiBzYW1lIG9mIGNhbGxCYWNrXG4gICAgICovXG4gICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLmVuZFBvaW50ICsgdXJsLCBkYXRhLCB0aHMuY2FjaGVkU3RhdHVzLmFwcGxpY2F0aW9uLCB0aHMuY2FjaGVkU3RhdHVzLnRva2VuKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICB0aHMuZW1pdCgnaHR0cC1yZXNwb25zZScsIHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cyArICctanNvbicsIHhoci5yZXNwb25zZURhdGEsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYWxsQmFjaykgeyBjYWxsQmFjayggeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0ICl9O1xuICAgICAgICAgICAgICAgIGFjY2VwdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItanNvbicsIHhoci5yZXNwb25zZURhdGEsIHhoci5zdGF0dXMsIHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWpzb24tJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZURhdGEsdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItaHR0cCcseGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cyx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItaHR0cC0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbi8qKlxuICogQ2hlY2sgY3VycmVudCBzdGF0dXMgYW5kIGNhbGxiYWNrIGZvciByZXN1bHRzLlxuICogSXQgY2FjaGVzIHJlc3VsdHMgZm9yIGZ1cnRoZXIuXG4gKiBAcGFyYW0gY2FsbGJhY2s6IChzdGF0dXMgb2JqZWN0KVxuICogQHBhcmFtIGZvcmNlOiBib29sZWFuIGlmIHRydWUgZW1wdGllcyBjYWNoZSAgXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnN0YXR1cyA9IGZ1bmN0aW9uKGNhbGxCYWNrLCBmb3JjZSkge1xuICAgIC8vIGlmIGZvcmNlLCBjbGVhciBhbGwgY2FjaGVkIHZhbHVlc1xuICAgIHZhciBrZXkgPSAndG9rZW46JyArIHRoaXMuZW5kUG9pbnQ7XG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgaWYgKGZvcmNlKSB7XG4gICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzID0ge307XG4gICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2Vba2V5XTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3RhdHVzV2FpdGluZykge1xuICAgICAgICAvLyB3YWl0IGZvciBzdGF0dXNcbiAgICAgICAgdXRpbHMud2FpdEZvcihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAhdGhzLnN0YXR1c1dhaXRpbmc7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aHMuc3RhdHVzKGNhbGxCYWNrLGZvcmNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gdHJ5IGZvciB2YWx1ZSByZXNvbHV0aW9uXG4gICAgLy8gZmlyc3Qgb24gbWVtb3J5XG4gICAgaWYgKExhenkodGhpcy5jYWNoZWRTdGF0dXMpLnNpemUoKSl7XG4gICAgICAgIGNhbGxCYWNrKHRoaXMuY2FjaGVkU3RhdHVzKVxuICAgIC8vIHRoZW4gaW4gbG9jYWxTdG9yYWdlXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgaWYgKGtleSBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgIGRhdGEuX190b2tlbl9fID0gbG9jYWxTdG9yYWdlW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGF0dXNXYWl0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy4kcG9zdCgnYXBpL3N0YXR1cycsZGF0YSwgZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgIHRocy51cGRhdGVTdGF0dXMoc3RhdHVzKTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtrZXldID0gc3RhdHVzLnRva2VuO1xuICAgICAgICAgICAgY2FsbEJhY2soc3RhdHVzKTtcbiAgICAgICAgICAgIHRocy5zdGF0dXNXYWl0aW5nID0gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBkb2Vzbid0IGNhbGwgY2FsbGJhY2tcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNhbGxCYWNrKHRoaXMuY2FjaGVkU3RhdHVzKTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbihzdGF0dXMpe1xuICAgIHZhciBsYXN0QnVpbGQgPSBwYXJzZUZsb2F0KGxvY2FsU3RvcmFnZS5sYXN0QnVpbGQpIHx8IDE7XG4gICAgaWYgKGxhc3RCdWlsZCA8IHN0YXR1cy5sYXN0X2J1aWxkKXtcbiAgICAgICAgdXRpbHMuY2xlYW5EZXNjcmlwdGlvbigpO1xuICAgICAgICBsb2NhbFN0b3JhZ2UubGFzdEJ1aWxkID0gc3RhdHVzLmxhc3RfYnVpbGQ7XG4gICAgfVxuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBCb29sZWFuKHN0YXR1cy50b2tlbik7XG4gICAgdGhpcy5pc0xvZ2dlZEluID0gQm9vbGVhbihzdGF0dXMudXNlcl9pZCk7XG4gICAgdmFyIG9sZFN0YXR1cyA9IHRoaXMuY2FjaGVkU3RhdHVzO1xuICAgIHRoaXMuY2FjaGVkU3RhdHVzID0gc3RhdHVzO1xuICAgIGlmICghb2xkU3RhdHVzLnVzZXJfaWQgJiYgc3RhdHVzLnVzZXJfaWQpe1xuICAgICAgICB0aGlzLmVtaXQoJ2xvZ2dlZC1pbicsc3RhdHVzLnVzZXJfaWQpO1xuICAgIH0gZWxzZSBpZiAob2xkU3RhdHVzLnVzZXJfaWQgJiYgIXN0YXR1cy51c2VyX2lkKXtcbiAgICAgICAgdGhpcy5lbWl0KCdsb2dnZWQtb3V0Jyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzQ29ubmVjdGVkICYmICF0aGlzLmlzTG9nZ2VkSW4pe1xuICAgICAgICB0aGlzLmVtaXQoJ2xvZ2luLXJlcXVpcmVkJyk7XG4gICAgICAgIGlmICh0aGlzLmdldExvZ2luKXtcbiAgICAgICAgICAgIHZhciBsb2dpbkluZm8gPSB0aGlzLmdldExvZ2luKCk7XG4gICAgICAgICAgICBpZiAobG9naW5JbmZvLmNvbnN0cnVjdG9yID09PSBPYmplY3Qpe1xuICAgICAgICAgICAgICAgIHRoaXMubG9naW4obG9naW5JbmZvLnVzZXJuYW1lLCBsb2dpbkluZm8ucGFzc3dvcmQsIGxvZ2luSW5mby5jYWxsQmFjayk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxvZ2luSW5mby5jb25zdHJ1Y3RvciA9PT0gUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIGxvZ2luSW5mby50aGVuKGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9naW4ob2JqLnVzZXJuYW1lLCBvYmoucGFzc3dvcmQsIG9iai5jYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyByZWFsdGltZSBjb25uZWN0aW9uIGlzIHNldHRlZFxuICAgIGlmICghb2xkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQgJiYgc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24gPSBuZXcgUmVhbHRpbWVDb25uZWN0aW9uKHN0YXR1cy5yZWFsdGltZUVuZFBvaW50LCB0aGlzKTtcbiAgICAvLyByZWFsdGltZSBjb25uZWN0aW9uIGlzIGNsb3NlZFxuICAgIH0gZWxzZSBpZiAob2xkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQgJiYgIXN0YXR1cy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgIHRoaXMud3NDb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLndzQ29ubmVjdGlvbjtcbiAgICB9XG4gICAgdGhpcy5lbWl0KCd1cGRhdGUtY29ubmVjdGlvbi1zdGF0dXMnLCBzdGF0dXMsIG9sZFN0YXR1cyk7XG4gICAgbG9jYWxTdG9yYWdlW1NUQVRVU0tFWV0gPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xufVxuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIC8qKlxuICAgICAqIG1ha2UgbG9naW4gYW5kIHJldHVybiBhIHByb21pc2UuIElmIGxvZ2luIHN1Y2NlZCwgcHJvbWlzZSB3aWxsIGJlIGFjY2VwdGVkXG4gICAgICogSWYgbG9naW4gZmFpbHMgcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGggZXJyb3JcbiAgICAgKiBAcGFyYW0gdXNlcm5hbWU6IHVzZXJuYW1lXG4gICAgICogQHBhcmFtIHBhc3N3b3JkOiBwYXNzd29yZFxuICAgICAqIEByZXR1cm4gUHJvbWlzZSAodXNlciBvYmplY3QpXG4gICAgICovXG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5lbmRQb2ludCArICdhcGkvbG9naW4nLCB7dXNlcm5hbWU6IHVzZXJuYW1lIHx8ICcnLCBwYXNzd29yZDogcGFzc3dvcmQgfHwgJyd9LG51bGwsdGhzLmNhY2hlZFN0YXR1cy50b2tlbiwgdHJ1ZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIHN0YXR1c1xuICAgICAgICAgICAgICAgIHRocy51cGRhdGVTdGF0dXMoeGhyLnJlc3BvbnNlRGF0YSk7XG4gICAgICAgICAgICAgICAgLy8gY2FsbCB3aXRoIHVzZXIgaWRcbiAgICAgICAgICAgICAgICBhY2NlcHQoe3N0YXR1cyA6ICdzdWNjZXNzJywgdXNlcmlkOiB0aHMuY2FjaGVkU3RhdHVzLnVzZXJfaWR9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIC8vIGlmIGVycm9yIGNhbGwgZXJyb3IgbWFuYWdlciB3aXRoIGVycm9yXG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0gJ0NvdWxkIG5vdCByZWNlaXZlIGVycm9yIGZyb20gc2VydmVyJztcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSAmJiAoJ2Vycm9yJyBpbiB4aHIucmVzcG9uc2VEYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvciA9IHhoci5yZXNwb25zZURhdGEuZXJyb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFjY2VwdCh7ZXJyb3I6IGVycm9yLCBzdGF0dXM6ICdlcnJvcid9KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KSB7XG4gICAgICAgIHRocy4kcG9zdCgnYXBpL2xvZ291dCcpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihvayl7XG4gICAgICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyh7fSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtTVEFUVVNLRVldO1xuICAgICAgICAgICAgICAgIGFjY2VwdCgpXG4gICAgICAgICAgICB9LCByZWplY3QpO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbihjYWxsQmFjaykge1xuICAgIGlmICh0aGlzLmlzTG9nZ2VkSW4pIHtcbiAgICAgICAgY2FsbEJhY2sodGhpcy5jYWNoZWRTdGF0dXMudXNlcl9pZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gd2FpdCBmb3IgbG9naW5cbiAgICAgICAgdGhpcy5vbmNlKCdsb2dnZWQtaW4nLGZ1bmN0aW9uKHVzZXJfaWQpe1xuICAgICAgICAgICAgY2FsbEJhY2sodXNlcl9pZCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnN0YXR1cyhjYWxsQmFjayB8fCB1dGlscy5ub29wKTtcbiAgICB9XG59XG5cbnV0aWxzLnJlV2hlZWxDb25uZWN0aW9uID0gcmVXaGVlbENvbm5lY3Rpb247IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBUb3VjaGVyKCl7XG4gICAgdmFyIHRvdWNoZWQgPSBmYWxzZVxuICAgIHRoaXMudG91Y2ggPSBmdW5jdGlvbigpe1xuICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcbiAgICB9O1xuICAgIHRoaXMudG91Y2hlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB0ID0gdG91Y2hlZDtcbiAgICAgICAgdG91Y2hlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gdDtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cblxuZnVuY3Rpb24gVmFjdXVtQ2FjaGVyKHRvdWNoLCBhc2tlZCwgbmFtZSwgcGtJbmRleCl7XG4vKlxuICAgIGlmIChuYW1lKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdjcmVhdGVkIFZhY3V1bUNhY2hlciBhcyAnICsgbmFtZSk7XG4gICAgfVxuKi9cbiAgICBpZiAoIWFza2VkKXtcbiAgICAgICAgdmFyIGFza2VkID0gW107XG4gICAgfVxuICAgIHZhciBtaXNzaW5nID0gW107XG4gICAgXG4gICAgdGhpcy5hc2sgPSBmdW5jdGlvbiAoaWQsbGF6eSl7XG4gICAgICAgIGlmIChwa0luZGV4ICYmIChpZCBpbiBwa0luZGV4LnNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIUxhenkoYXNrZWQpLmNvbnRhaW5zKGlkKSl7XG4vLyAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnYXNraW5nICgnICsgaWQgKyAnKSBmcm9tICcgKyBuYW1lKTtcbiAgICAgICAgICAgIG1pc3NpbmcucHVzaChpZCk7XG4gICAgICAgICAgICBpZiAoIWxhenkpXG4gICAgICAgICAgICAgICAgYXNrZWQucHVzaChpZCk7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICB9IFxuLy8gICAgICAgIGVsc2UgY29uc29sZS53YXJuKCcoJyArIGlkICsgJykgd2FzIGp1c3QgYXNrZWQgb24gJyArIG5hbWUpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEFza2VkSW5kZXggPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gYXNrZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5taXNzaW5ncyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBMYXp5KG1pc3Npbmcuc3BsaWNlKDAsbWlzc2luZy5sZW5ndGgpKS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgfVxufVxuIiwiZnVuY3Rpb24gQXV0b0xpbmtlcihhY3RpdmVzLCBJREIsIFcyUFJFU09VUkNFLCBsaXN0Q2FjaGUpe1xuICAgIHZhciB0b3VjaCA9IG5ldyBUb3VjaGVyKCk7XG4gICAgdmFyIG1haW5JbmRleCA9IHt9O1xuICAgIHZhciBmb3JlaWduS2V5cyA9IHt9O1xuICAgIHZhciBtMm0gPSB7fTtcbiAgICB2YXIgbTJtSW5kZXggPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbnMgPSB7fTtcbiAgICB0aGlzLm1haW5JbmRleCA9IG1haW5JbmRleDtcbiAgICB0aGlzLmZvcmVpZ25LZXlzID0gZm9yZWlnbktleXM7XG4gICAgdGhpcy5tMm0gPSBtMm07XG4gICAgdGhpcy5tMm1JbmRleCA9IG0ybUluZGV4O1xuICAgIHRoaXMucGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucztcblxuICAgIFcyUFJFU09VUkNFLm9uKCdtb2RlbC1kZWZpbml0aW9uJyxmdW5jdGlvbihtb2RlbCwgaW5kZXgpe1xuICAgICAgICAvLyBkZWZpbmluZyBhbGwgaW5kZXhlcyBmb3IgcHJpbWFyeSBrZXlcbiAgICAgICAgdmFyIHBrSW5kZXggPSBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IobW9kZWwubmFtZSwgJ2lkJyk7XG4gICAgICAgIG1haW5JbmRleFttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIHBrSW5kZXgsICdtYWluSW5kZXguJyArIG1vZGVsLm5hbWUsIGluZGV4KTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0aW5nIHBlcm1pc3Npb24gaW5kZXhlc1xuICAgICAgICBwZXJtaXNzaW9uc1ttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwgJ3Blcm1pc3Npb25zLicgKyBtb2RlbC5uYW1lKTtcblxuICAgICAgICAvLyBjcmVhdGluZyBpbmRleGVzIGZvciBmb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uKHJlZmVyZW5jZSl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWwubmFtZSArICdfJyArIHJlZmVyZW5jZS5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IocmVmZXJlbmNlLnRvLCAnaWQnKSwgcmVmZXJlbmNlLnRvICsgJy5pZCBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGNyZWF0aW5nIHJldmVyc2UgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkO1xuICAgICAgICAgICAgZm9yZWlnbktleXNbaW5kZXhOYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIGxpc3RDYWNoZS5nZXRJbmRleEZvcihmaWVsZC5ieSxmaWVsZC5pZCksIGZpZWxkLmJ5ICsgJy4nICsgZmllbGQuaWQgKyAnIGZvcmVpZ25LZXlzLicgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtb2RlbC5tYW55VG9NYW55KS5lYWNoKGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm0pKVxuICAgICAgICAgICAgICAgIG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdID0gW25ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUgKyAnWzBdJyksIG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUrJ1sxXScpXTtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm1JbmRleCkpXG4gICAgICAgICAgICAgICAgbTJtSW5kZXhbcmVsYXRpb24uaW5kZXhOYW1lXSA9IG5ldyBNYW55VG9NYW55UmVsYXRpb24ocmVsYXRpb24sbTJtW3JlbGF0aW9uLmluZGV4TmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgbTJtR2V0ID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayl7XG4gICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KChuID8gdXRpbHMucmV2ZXJzZSgnLycsIGluZGV4TmFtZSkgOiBpbmRleE5hbWUpICsgJ3MnICsgJy9saXN0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgZGVsZXRlIGFjdGl2ZXNbaW5kZXhOYW1lXVxuICAgICAgICB9KTsgICAgICAgIFxuICAgIH07XG5cbiAgICB2YXIgZ2V0TTJNID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBjb2xsZWN0aW9uLCBuLCBjYWxsQmFjayl7XG4gICAgICAgIC8vIGFzayBhbGwgaXRlbXMgaW4gY29sbGVjdGlvbiB0byBtMm0gaW5kZXhcbiAgICAgICAgTGF6eShjb2xsZWN0aW9uKS5lYWNoKG0ybVtpbmRleE5hbWVdW25dLmFzay5iaW5kKG0ybVtpbmRleE5hbWVdW25dKSk7XG4gICAgICAgIC8vIHJlbmV3aW5nIGNvbGxlY3Rpb24gd2l0aG91dCBhc2tlZFxuICAgICAgICBjb2xsZWN0aW9uID0gbTJtW2luZGV4TmFtZV1bbl0ubWlzc2luZ3MoKTtcbiAgICAgICAgLy8gY2FsbGluZyByZW1vdGUgZm9yIG0ybSBjb2xsZWN0aW9uIGlmIGFueVxuICAgICAgICBpZiAoY29sbGVjdGlvbi5sZW5ndGgpe1xuICAgICAgICAgICAgYWN0aXZlc1tpbmRleE5hbWVdID0gMTtcbiAgICAgICAgICAgIG0ybUdldChpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGNhbGxCYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuZ2V0TTJNID0gZ2V0TTJNO1xuXG4gICAgdmFyIGxpbmtVbmxpbmtlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIHBlcmZvcm0gYSBEYXRhQmFzZSBzeW5jaHJvbml6YXRpb24gd2l0aCBzZXJ2ZXIgbG9va2luZyBmb3IgdW5rbm93biBkYXRhXG4gICAgICAgIGlmICghdG91Y2gudG91Y2hlZCgpKSByZXR1cm47XG4gICAgICAgIGlmIChMYXp5KGFjdGl2ZXMpLnZhbHVlcygpLnN1bSgpKSB7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGluZGV4ZXMsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICBMYXp5KGluZGV4ZXMpLmVhY2goZnVuY3Rpb24gKGluZGV4LG4pIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IGluZGV4Lm1pc3NpbmdzKCk7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IExhenkoY29sbGVjdGlvbikuZmlsdGVyKEJvb2xlYW4pLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIElOREVYID0gbTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdldHRlciA9IElOREVYWydnZXQnICsgKDEgLSBuKV0uYmluZChJTkRFWCk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBjb2xsZWN0aW9uLm1hcChnZXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvdGhlckluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcvJylbMSAtIG5dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG90aGVySW5kZXgsZnVuY3Rpb24oKXtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2gobWFpbkluZGV4W290aGVySW5kZXhdLmFzayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoaWRzKS5mbGF0dGVuKCkudW5pcXVlKCkuZWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1haW5JbmRleFtvdGhlckluZGV4XS5hc2soeCx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtYWluSW5kZXgpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIHZhciBpZHMgPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgaWRiID0gbW9kZWxOYW1lIGluIElEQiA/IElEQlttb2RlbE5hbWVdLmtleXMoKSA6IExhenkoKTtcbiAgICAgICAgICAgICAgICAvL2xvZygnbGlua2luZy4nICsgbW9kZWxOYW1lICsgJyA9ICcgKyBXMlBSRVNPVVJDRS5saW5raW5nLnNvdXJjZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIHtpZDogaWRzfSxudWxsLHV0aWxzLm5vb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gRm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkoZm9yZWlnbktleXMpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICAgICAgICByZXR1cm4gdlsxXS5sZW5ndGhcbiAgICAgICAgfSkuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICB2YXIgaWRzID0geFsxXTtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSB4WzBdO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgbWFpblJlc291cmNlID0gaW5kZXhbMF07XG4gICAgICAgICAgICB2YXIgZmllbGROYW1lID0gaW5kZXhbMV07XG4gICAgICAgICAgICB2YXIgZmlsdGVyID0ge307XG4gICAgICAgICAgICBmaWx0ZXJbZmllbGROYW1lXSA9IGlkcztcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1haW5SZXNvdXJjZSwgZmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBMYXp5KExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgcmV0dXJuIFtrLCB2Lm1pc3NpbmdzKCldXG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLnRvT2JqZWN0KCkpLmVhY2goZnVuY3Rpb24gKGlkcywgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICBhY3RpdmVzW3Jlc291cmNlTmFtZV0gPSAxO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHJlc291cmNlTmFtZSArICcvbXlfcGVybXMnLCB7aWRzOiBMYXp5KGlkcykudW5pcXVlKCkudG9BcnJheSgpfSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoZGF0YS5QRVJNSVNTSU9OUyk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW3Jlc291cmNlTmFtZV1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHNldEludGVydmFsKGxpbmtVbmxpbmtlZCw1MCk7XG59O1xuXG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBMaXN0Q2FjaGVyKCl7XG4gICAgdmFyIGdvdEFsbCA9IHt9O1xuICAgIHZhciBhc2tlZCA9IHt9OyAvLyBtYXAgb2YgYXJyYXlcbiAgICB2YXIgY29tcG9zaXRlQXNrZWQgPSB7fTtcbiAgICB2YXIgY2FydGVzaWFuUHJvZHVjdDEgPSBmdW5jdGlvbih4LHksaXNBcnJheSl7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgaWYgKGlzQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4geCl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYiBpbiB5KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goTGF6eShbeFthXSx5W2JdXSkuZmxhdHRlbigpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgYSBpbiB4KXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBiIGluIHkpe1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChbeFthXSx5W2JdXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICB2YXIgY2FydGVzaWFuUHJvZHVjdCA9IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciBpc0FycmF5ID0gZmFsc2U7XG4gICAgICAgIHZhciByZXQgPSBhcnJbMF07IFxuICAgICAgICBmb3IgKHZhciB4ID0gMTsgeCA8IGFyci5sZW5ndGg7ICsreCl7XG4gICAgICAgICAgICByZXQgPSBjYXJ0ZXNpYW5Qcm9kdWN0MShyZXQsIGFyclt4XSwgaXNBcnJheSk7XG4gICAgICAgICAgICBpc0FycmF5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgICB2YXIgZXhwbG9kZUZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICB2YXIgcHJvZHVjdCA9IGNhcnRlc2lhblByb2R1Y3QoTGF6eShmaWx0ZXIpLnZhbHVlcygpLnRvQXJyYXkoKSk7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLmtleXMoKS50b0FycmF5KCk7XG4gICAgICAgIHJldHVybiBwcm9kdWN0Lm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhciByID0ge307XG4gICAgICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oYSxuKXtcbiAgICAgICAgICAgICAgICByW2FdID0geFtuXTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH07XG4gICAgdmFyIGZpbHRlclNpbmdsZSA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIsIHRlc3RPbmx5KXtcbiAgICAgICAgLy8gTGF6eSBhdXRvIGNyZWF0ZSBpbmRleGVzXG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG4gICAgICAgIHZhciBnZXRJbmRleEZvciA9IHRoaXMuZ2V0SW5kZXhGb3I7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2LGtleSl7IHJldHVybiBba2V5LCBtb2RlbE5hbWUgKyAnLicgKyBrZXldOyB9KS50b09iamVjdCgpO1xuICAgICAgICB2YXIgaW5kZXhlcyA9IExhenkoZmlsdGVyKS5rZXlzKCkubWFwKGZ1bmN0aW9uKGtleSl7IHJldHVybiBba2V5LCBnZXRJbmRleEZvcihtb2RlbE5hbWUsIGtleSldfSkudG9PYmplY3QoKTsgXG4gICAgICAgIC8vIGZha2UgZm9yIChpdCB3aWxsIGN5Y2xlIG9uY2UpXG4gICAgICAgIGZvciAodmFyIHggaW4gZmlsdGVyKXtcbiAgICAgICAgICAgIC8vIGdldCBhc2tlZCBpbmRleCBhbmQgY2hlY2sgcHJlc2VuY2VcbiAgICAgICAgICAgIHZhciBkaWZmZXJlbmNlID0gTGF6eShmaWx0ZXJbeF0pLmRpZmZlcmVuY2UoaW5kZXhlc1t4XSkudG9BcnJheSgpO1xuICAgICAgICAgICAgaWYgKGRpZmZlcmVuY2UubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAvLyBnZW5lcmF0ZSBuZXcgZmlsdGVyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IExhenkoW1t4LCBkaWZmZXJlbmNlXV0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgLy8gcmVtZW1iZXIgYXNrZWRcbiAgICAgICAgICAgICAgICBpZiAoIXRlc3RPbmx5KVxuICAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShpbmRleGVzW3hdLCBkaWZmZXJlbmNlKTtcbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUgZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikgKyAnXFxuT3V0IDonICsgSlNPTi5zdHJpbmdpZnkocmV0KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6IG51bGwnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY2xlYW5Db21wb3NpdGVzID0gZnVuY3Rpb24obW9kZWwsZmlsdGVyKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGNsZWFuIGNvbXBvc2l0ZUFza2VkXG4gICAgICAgICAqL1xuICAgICAgICAvLyBsYXp5IGNyZWF0ZSBjb25kaXRpb25hbCBhc2tlZCBpbmRleFxuICAgICAgICBpZiAoIShtb2RlbC5uYW1lIGluIGNvbXBvc2l0ZUFza2VkKSkgeyBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXSA9IFtdIH07XG4gICAgICAgIHZhciBpbmRleCA9IGNvbXBvc2l0ZUFza2VkW21vZGVsLm5hbWVdO1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGFsbCBlbGVtZW50cyB3aG8gaGF2ZSBzYW1lIHBhcnRpYWxcbiAgICAgICAgdmFyIGZpbHRlckxlbiA9IExhenkoZmlsdGVyKS5zaXplKCk7XG4gICAgICAgIHZhciBpdGVtcyA9IGluZGV4LmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIsICcgJiYgJyx0cnVlKSkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0peyBMYXp5KGl0ZW0pLnNpemUoKSA+IGZpbHRlckxlbiB9KTtcbi8vICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgOicgKyBKU09OLnN0cmluZ2lmeShpdGVtcykpO1xuICAgIH07XG5cbiAgICB0aGlzLmZpbHRlciA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIpe1xuLy8gICAgICAgIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLS0tLS0tLS1cXG5maWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSk7XG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG5cbiAgICAgICAgLy8gaWYgeW91IGZldGNoIGFsbCBvYmplY3RzIGZyb20gc2VydmVyLCB0aGlzIG1vZGVsIGhhcyB0byBiZSBtYXJrZWQgYXMgZ290IGFsbDtcbiAgICAgICAgdmFyIGZpbHRlckxlbiAgPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICBzd2l0Y2ggKGZpbHRlckxlbikge1xuICAgICAgICAgICAgY2FzZSAwIDoge1xuICAgICAgICAgICAgICAgIC8vIHJldHVybiBudWxsIG9yIGFsbFxuICAgICAgICAgICAgICAgIHZhciBnb3QgPSBnb3RBbGxbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICBnb3RBbGxbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBhc2tlZCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhc2tlZFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdXQgOiBudWxsIChnb3QgYWxsKScpO1xuICAgICAgICAgICAgICAgIC8vIGNvbmRpdGlvbmFsIGNsZWFuXG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBjb21wb3NpdGVBc2tlZCl7IFxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGdvdClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAxIDoge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBmaWx0ZXJTaW5nbGUuY2FsbCh0aGlzLCBtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgICAgICBjbGVhbkNvbXBvc2l0ZXMuY2FsbCh0aGlzLCBtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICB2YXIgc2luZ2xlID0gTGF6eShmaWx0ZXIpLmtleXMoKS5zb21lKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdmFyIGYgPSB7fTtcbiAgICAgICAgICAgIGZba2V5XSA9IGZpbHRlcltrZXldO1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlclNpbmdsZS5jYWxsKHRocywgbW9kZWwsIGYsIHRydWUpID09IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc2luZ2xlKSB7IHJldHVybiBudWxsIH1cbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29tcG9zaXRlQXNrZWRcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGNvbXBvc2l0ZUFza2VkKSl7IGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0gPSBbXTsgfVxuICAgICAgICAvLyBleHBsb2RlIGZpbHRlclxuICAgICAgICB2YXIgZXhwbG9kZWQgPSBleHBsb2RlRmlsdGVyKGZpbHRlcik7XG4gICAgICAgIC8vIGNvbGxlY3QgcGFydGlhbHNcbiAgICAgICAgdmFyIHBhcnRpYWxzID0gY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXS5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnIHx8ICcsdHJ1ZSkpO1xuICAgICAgICAvLyBjb2xsZWN0IG1pc3NpbmdzIChleHBsb2RlZCAtIHBhcnRpYWxzKVxuICAgICAgICBpZiAocGFydGlhbHMubGVuZ3RoKXtcbiAgICAgICAgICAgIHZhciBiYWQgID0gW107XG4gICAgICAgICAgICAvLyBwYXJ0aWFsIGRpZmZlcmVuY2VcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gcGFydGlhbHMpe1xuICAgICAgICAgICAgICAgIGJhZC5wdXNoLmFwcGx5KGJhZCxleHBsb2RlZC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgcGFydGlhbHNbeF0sJyAmJiAnLCB0cnVlKSkpO1xuICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICBjb25zb2xlLmxvZygnZXhwbG9kZWQgLSBwYXJ0aWFsIDogJyArIEpTT04uc3RyaW5naWZ5KGJhZCkpO1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gTGF6eShleHBsb2RlZCkuZGlmZmVyZW5jZShiYWQpLnRvQXJyYXkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IGV4cGxvZGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZmlsdGVyIHBhcnRpYWxzXG4gICAgICAgIGlmIChtaXNzaW5ncy5sZW5ndGgpe1xuICAgICAgICAgICAgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXS5wdXNoLmFwcGx5KGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0sbWlzc2luZ3MpO1xuICAgICAgICAgICAgLy8gYWdncmVnYXRlIG1pc3NpbmdzXG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBMYXp5KGZpbHRlcikua2V5cygpLm1hcChmdW5jdGlvbihrZXkpe1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBMYXp5KG1pc3NpbmdzKS5wbHVjayhrZXkpLnVuaXF1ZSgpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2tleSwgcmV0Lmxlbmd0aD9yZXQ6ZmlsdGVyW2tleV1dO1xuICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbi8vICAgICAgICAgICAgY29uc29sZS5sb2coJ291dCA6ICcgKyBKU09OLnN0cmluZ2lmeShtaXNzaW5ncykpO1xuICAgICAgICAgICAgLy8gY2xlYW4gY29uZGl0aW9uYWxcbiAgICAgICAgICAgIGNsZWFuQ29tcG9zaXRlcyhtb2RlbCwgbWlzc2luZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIG1pc3NpbmdzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEluZGV4Rm9yID0gZnVuY3Rpb24obW9kZWxOYW1lLCBmaWVsZE5hbWUpe1xuICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWxOYW1lICsgJy4nICsgZmllbGROYW1lO1xuICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gYXNrZWQpKXtcbiAgICAgICAgICAgIGFza2VkW2luZGV4TmFtZV0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXNrZWRbaW5kZXhOYW1lXTtcbiAgICB9XG59OyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybSl7XG4gICAgdmFyIGl0ZW1zID0gW107XG4gICAgdGhpcy5hZGQgPSBpdGVtcy5wdXNoLmJpbmQoaXRlbXMpO1xuICAgIHRoaXMuYWRkID0gZnVuY3Rpb24oaXRlbSl7XG4gIC8vICAgICAgY29uc29sZS5sb2coJ2FkZGluZyAnICsgaXRlbSk7XG4gICAgICAgIGlmICghKExhenkoaXRlbXMpLmZpbmQoaXRlbSkpKXtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmdldDAgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVsxXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjFcIikudG9BcnJheSgpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldDEgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVswXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMV0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjBcIikudG9BcnJheSgpO1xuICAgIH07XG4gICAgdGhpc1snZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVsYXRpb24uaW5kZXhOYW1lLnNwbGl0KCcvJylbMV0pXSA9IHRoaXMuZ2V0MTtcbiAgICB0aGlzWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWxhdGlvbi5pbmRleE5hbWUuc3BsaXQoJy8nKVswXSldID0gdGhpcy5nZXQwO1xuXG4gICAgdGhpcy5kZWwgPSBmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgdmFyIGwgPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgIHZhciBpZHggPSBudWxsO1xuICAgICAgICBmb3IgKHZhciBhID0gMDsgYSA8IGw7IGErKyl7IFxuICAgICAgICAgICAgaWYgKChpdGVtc1thXVswXSA9PT0gaXRlbVswXSkgJiYgKGl0ZW1zW2FdWzFdID09PSBpdGVtWzFdKSl7XG4gICAgICAgICAgICAgICAgaWR4ID0gYTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaWR4KXtcbiAgICAgICAgICAgIGl0ZW1zLnNwbGljZShhLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgJywgaXRlbSk7XG4gICAgfTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGNhY2hlZFByb3BlcnR5QnlFdmVudHMocHJvdG8sIHByb3BlcnR5TmFtZSxnZXR0ZXIsIHNldHRlcil7XG4gICAgdmFyIGV2ZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyw0KTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgXG4gICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICBwcm90by5vcm0ub24oZXZlbnQsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJlc3VsdCA9IHt9O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgcHJvcGVydHlEZWYgPSB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gY2FjaGVkKCl7XG4vLyAgICAgICAgICAgIHJldHVybiBnZXR0ZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIGlmICghKHRoaXMuaWQgaW4gcmVzdWx0KSl7XG4gICAgICAgICAgICAgICAgcmVzdWx0W3RoaXMuaWRdID0gZ2V0dGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpZiAoc2V0dGVyKXtcbiAgICAgICAgcHJvcGVydHlEZWZbJ3NldCddID0gZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCBpbiByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICBpZiAodmFsdWUgIT09IHJlc3VsdFt0aGlzLmlkXSl7XG4gICAgICAgICAgICAgICAgc2V0dGVyLmNhbGwodGhpcyx2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaWQgaW4gcmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIHByb3BlcnR5TmFtZSxwcm9wZXJ0eURlZik7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvcihkYXRhKXtcbiAgICB0aGlzLnJlc291cmNlID0gZGF0YS5fcmVzb3VyY2U7XG4gICAgdGhpcy5mb3JtSWR4ID0gZGF0YS5mb3JtSWR4O1xuICAgIHRoaXMuZmllbGRzID0gZGF0YS5lcnJvcnM7XG59XG52YXIgYmFzZU9STSA9IGZ1bmN0aW9uKG9wdGlvbnMsIGV4dE9STSl7XG4gICAgXG4gICAgLy8gY3JlYXRpbmcgcmV3aGVlbCBjb25uZWN0aW9uXG4gICAgaWYgKG9wdGlvbnMuY29uc3RydWN0b3IgPT09IFN0cmluZyl7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gbmV3IHJlV2hlZWxDb25uZWN0aW9uKG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gdXRpbHMucmVXaGVlbENvbm5lY3Rpb24pe1xuICAgICAgICB2YXIgY29ubmVjdGlvbiA9IG9wdGlvbnM7XG4gICAgfVxuICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgY29ubmVjdGlvbi5vbignY29ubmVjdGVkJywgZnVuY3Rpb24oKXsgXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICB9KTtcbiAgICB0aGlzLm9uID0gY29ubmVjdGlvbi5vbjtcbiAgICB0aGlzLmVtaXQgPSBjb25uZWN0aW9uLmVtaXQ7XG4gICAgdGhpcy51bmJpbmQgPSBjb25uZWN0aW9uLnVuYmluZDtcbiAgICB0aGlzLm9uY2UgPSBjb25uZWN0aW9uLm9uY2U7XG4gICAgdGhpcy4kcG9zdCA9IGNvbm5lY3Rpb24uJHBvc3QuYmluZChjb25uZWN0aW9uKTtcblxuICAgIC8vIGhhbmRsaW5nIHdlYnNvY2tldCBldmVudHNcbiAgICB0aGlzLm9uKCd3cy1jb25uZWN0ZWQnLGZ1bmN0aW9uKHdzKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdXZWJzb2NrZXQgY29ubmVjdGVkJyk7XG4gICAgICAgIC8vIGFsbCBqc29uIGRhdGEgaGFzIHRvIGJlIHBhcnNlZCBieSBnb3REYXRhXG4gICAgICAgIHdzLm9uTWVzc2FnZUpzb24oVzJQUkVTT1VSQ0UuZ290RGF0YS5iaW5kKFcyUFJFU09VUkNFKSk7XG4gICAgICAgIC8vXG4gICAgICAgIHdzLm9uTWVzc2FnZVRleHQoZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8oJ1dTIG1lc3NhZ2UgOiAnICsgbWVzc2FnZSlcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5vbignd3MtZGlzY29ubmVjdGVkJywgZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmVycm9yKCdXZWJzb2NrZXQgZGlzY29ubmVjdGVkJylcbiAgICB9KTtcbiAgICB0aGlzLm9uKCdlcnJvci1qc29uLTQwNCcsZnVuY3Rpb24oZXJyb3IsdXJsLCBzZW50RGF0YSwgeGhyKXsgXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0pTT04gZXJyb3IgJywgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1t1cmwuc3BsaXQoJy8nKVswXV07XG4gICAgfSk7XG4gICAgdGhpcy5vbigncmVhbHRpbWUtbWVzc2FnZS1qc29uJywgZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEobWVzc2FnZSk7XG4gICAgfSk7XG5cbiAgICAvLyBpbml0aWFsaXphdGlvblxuICAgIHZhciBXMlBSRVNPVVJDRSA9IHRoaXM7XG4gICAgdmFyIElEQiA9IHthdXRoX2dyb3VwIDogTGF6eSh7fSl9OyAvLyB0YWJsZU5hbWUgLT4gZGF0YSBhcyBBcnJheVxuICAgIHZhciBJRFggPSB7fTsgLy8gdGFibGVOYW1lIC0+IExhenkoaW5kZXhCeSgnaWQnKSkgLT4gSURCW2RhdGFdXG4gICAgdmFyIFJFVklEWCA9IHt9OyAvLyB0YWJsZU5hbWUgLT4gZmllbGROYW1lIC0+IExhenkuZ3JvdXBCeSgpIC0+IElEQltEQVRBXVxuICAgIHZhciBidWlsZGVySGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgYnVpbGRlckhhbmRsZXJVc2VkID0ge307XG4gICAgdmFyIHBlcnNpc3RlbnRBdHRyaWJ1dGVzID0ge307XG4gICAgdmFyIGV2ZW50SGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbldhaXRpbmcgPSB7fTtcbiAgICB2YXIgbW9kZWxDYWNoZSA9IHt9O1xuICAgIHZhciBmYWlsZWRNb2RlbHMgPSB7fTtcbiAgICB2YXIgd2FpdGluZ0Nvbm5lY3Rpb25zID0ge30gLy8gYWN0dWFsIGNvbm5lY3Rpb24gd2hvIGknbSB3YWl0aW5nIGZvclxuICAgIHZhciBsaXN0Q2FjaGUgPSBuZXcgTGlzdENhY2hlcihMYXp5KTtcbiAgICB2YXIgbGlua2VyID0gbmV3IEF1dG9MaW5rZXIod2FpdGluZ0Nvbm5lY3Rpb25zLElEQiwgdGhpcywgbGlzdENhY2hlKTtcbi8qICAgIHdpbmRvdy5sbCA9IGxpbmtlcjtcbiAgICB3aW5kb3cubGMgPSBsaXN0Q2FjaGU7XG4qL1xuICAgIHdpbmRvdy5JREIgPSBJREI7XG4gICAgdGhpcy52YWxpZGF0aW9uRXZlbnQgPSB0aGlzLm9uKCdlcnJvci1qc29uLTUxMycsIGZ1bmN0aW9uKGRhdGEsIHVybCwgc2VudERhdGEsIHhocil7XG4gICAgICAgIGlmIChjdXJyZW50Q29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIpe1xuICAgICAgICAgICAgY3VycmVudENvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyKG5ldyBWYWxpZGF0aW9uRXJyb3IoZGF0YSkpO1xuICAgICAgICB9XG4gICAgfSlcblxuICAgIHZhciBnZXRJbmRleCA9IGZ1bmN0aW9uIChpbmRleE5hbWUpIHtcbiAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJREIpXG4gICAgICAgICAgICByZXR1cm4gSURCW2luZGV4TmFtZV07XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSURCW2luZGV4TmFtZV0gPSBMYXp5KHt9KTtcbiAgICAgICAgICAgIHJldHVybiBJREJbaW5kZXhOYW1lXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGdldFVubGlua2VkID0gZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICBpZiAoaW5kZXhOYW1lIGluIFVOTElOS0VEKVxuICAgICAgICAgICAgcmV0dXJuIFVOTElOS0VEW2luZGV4TmFtZV07XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgVU5MSU5LRURbaW5kZXhOYW1lXSA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIFVOTElOS0VEW2luZGV4TmFtZV07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gUGVybWlzc2lvblRhYmxlKGlkLCBrbGFzcywgcGVybWlzc2lvbnMpIHtcbiAgICAgICAgLy8gY3JlYXRlIFBlcm1pc3Npb25UYWJsZSBjbGFzc1xuICAgICAgICB0aGlzLmtsYXNzID0ga2xhc3M7XG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICBmb3IgKHZhciBrIGluIHBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICB0aGlzLnB1c2guYXBwbHkodGhpcywgW2ssIHBlcm1pc3Npb25zW2tdXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgUGVybWlzc2lvblRhYmxlLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIC8vIHNhdmUgT2JqZWN0IHRvIHNlcnZlclxuICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgIHBlcm1pc3Npb25zOiBMYXp5KHRoaXMucGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeFswXS5pZCwgeFsxXV1cbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KClcbiAgICAgICAgfTtcbiAgICAgICAgZGF0YS5pZCA9IHRoaXMuaWQ7XG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSB0aGlzLmtsYXNzLm1vZGVsTmFtZTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5rbGFzcy5tb2RlbE5hbWUgKyAnL3NldF9wZXJtaXNzaW9ucycsIGRhdGEsIGZ1bmN0aW9uIChteVBlcm1zLCBhLCBiLCByZXEpIHtcbiAgICAgICAgICAgIGNiKG15UGVybXMpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIFBlcm1pc3Npb25UYWJsZS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChncm91cF9pZCwgcGVybWlzc2lvbkxpc3QpIHtcbiAgICAgICAgdmFyIHAgPSBMYXp5KHBlcm1pc3Npb25MaXN0KTtcbiAgICAgICAgdmFyIHBlcm1zID0gTGF6eSh0aGlzLmtsYXNzLmFsbFBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBbeCwgcC5jb250YWlucyh4KV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgdmFyIGwgPSBMYXp5KHRoaXMucGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0uaWRcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChsLmNvbnRhaW5zKGdyb3VwX2lkKSlcbiAgICAgICAgICAgIHRoaXMucGVybWlzc2lvbnNbbC5pbmRleE9mKGdyb3VwX2lkKV1bMV0gPSBwZXJtcztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5wZXJtaXNzaW9ucy5wdXNoKFtJREIuYXV0aF9ncm91cC5nZXQoZ3JvdXBfaWQpLCBwZXJtc10pO1xuICAgIH07XG5cbiAgICAvLyBjcmVhdGVzIGR5bmFtaWNhbCBtb2RlbHNcbiAgICB2YXIgbWFrZU1vZGVsQ2xhc3MgPSBmdW5jdGlvbiAobW9kZWwpIHtcbiAgICAgICAgdmFyIF9tb2RlbCA9IG1vZGVsO1xuICAgICAgICBtb2RlbC5maWVsZHMuaWQucmVhZGFibGUgPSBmYWxzZTtcbiAgICAgICAgbW9kZWwuZmllbGRzLmlkLndyaXRhYmxlID0gZmFsc2U7XG4gICAgICAgIHZhciBmaWVsZHMgPSBMYXp5KG1vZGVsLmZpZWxkcyk7XG4gICAgICAgIGlmIChtb2RlbC5wcml2YXRlQXJncykge1xuICAgICAgICAgICAgZmllbGRzID0gZmllbGRzLm1lcmdlKG1vZGVsLnByaXZhdGVBcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdtb2RlbC1kZWZpbml0aW9uJywgbW9kZWwsIGdldEluZGV4KG1vZGVsLm5hbWUpKTtcbiAgICAgICAgLy8gZ2V0dGluZyBmaWVsZHMgb2YgdHlwZSBkYXRlIGFuZCBkYXRldGltZVxuLypcbiAgICAgICAgdmFyIERBVEVGSUVMRFMgPSBmaWVsZHMuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHgudHlwZSA9PSAnZGF0ZScpIHx8ICh4LnR5cGUgPT0gJ2RhdGV0aW1lJylcbiAgICAgICAgfSkubWFwKGZ1bmN0aW9uICh4LCB2KSB7XG4gICAgICAgICAgICByZXR1cm4gW3YsIHRydWVdXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG5cbiAgICAgICAgLy8gZ2V0dGluZyBib29sZWFuIGZpZWxkc1xuICAgICAgICB2YXIgQk9PTEZJRUxEUyA9IGZpZWxkcy5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoeC50eXBlID09ICdib29sZWFuJylcbiAgICAgICAgfSkubWFwKGZ1bmN0aW9uICh4LCB2KSB7XG4gICAgICAgICAgICByZXR1cm4gW3YsIHRydWVdXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG5cbiAgICAgICAgLy8gYm9vbGVhbnMgYW5kIGRhdGV0aW1lcyBzdG9yYWdlIGV4dGVybmFsIFxuICAgICAgICBNT0RFTF9EQVRFRklFTERTW21vZGVsLm5hbWVdID0gREFURUZJRUxEUztcbiAgICAgICAgTU9ERUxfQk9PTEZJRUxEU1ttb2RlbC5uYW1lXSA9IEJPT0xGSUVMRFM7XG4qL1xuICAgICAgICAvLyBpbml0aWFsaXphdGlvblxuICAgICAgICB2YXIgZnVuY1N0cmluZyA9IFwiaWYgKCFyb3cpIHsgcm93ID0ge319O1xcblwiO1xuICAgICAgICBmdW5jU3RyaW5nICs9IG1vZGVsLnJlZmVyZW5jZXMubWFwKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHJldHVybiAndGhpcy5fJyArIGZpZWxkLmlkICsgJyA9IHJvdy4nICsgZmllbGQuaWQgKyAnOyc7XG4gICAgICAgIH0pLmpvaW4oJztcXG4nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGRhdGVmaWVsZCBjb252ZXJzaW9uXG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gZmllbGRzLm1hcChmdW5jdGlvbiAoeCxrKSB7XG4gICAgICAgICAgICBpZiAoKHgudHlwZSA9PSAnZGF0ZScpIHx8ICh4LnR5cGUgPT0gJ2RhdGV0aW1lJykpe1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSByb3cuJyArIGsgKyAnP25ldyBEYXRlKHJvdy4nICsgayArICcgKiAxMDAwIC0gJyArIHV0aWxzLnR6T2Zmc2V0ICsgJyk6bnVsbDtcXG4nOyBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeC50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSAocm93LicgKyBrICsgJyA9PT0gXCJUXCIpIHx8IChyb3cuJyArIGsgKyAnID09PSB0cnVlKTtcXG4nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gcm93LicgKyBrICsgJztcXG4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS50b1N0cmluZygnXFxuJyk7ICsgJ1xcbic7XG5cbiAgICAgICAgZnVuY1N0cmluZyArPSBcImlmIChwZXJtaXNzaW9ucykge3RoaXMuX3Blcm1pc3Npb25zID0gcGVybWlzc2lvbnMgJiYgTGF6eShwZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7IHJldHVybiBbeCwgdHJ1ZV0gfSkudG9PYmplY3QoKTt9XCJcblxuICAgICAgICBcbiAgICAgICAgLy8gbWFzdGVyIGNsYXNzIGZ1bmN0aW9uXG4gICAgICAgIHZhciBLbGFzcyA9IG5ldyBGdW5jdGlvbigncm93JywgJ3Blcm1pc3Npb25zJyxmdW5jU3RyaW5nKVxuXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5vcm0gPSBleHRPUk07XG4gICAgICAgIEtsYXNzLnJlZl90cmFuc2xhdGlvbnMgPSB7fTtcbiAgICAgICAgS2xhc3MubW9kZWxOYW1lID0gbW9kZWwubmFtZTtcbiAgICAgICAgS2xhc3MucmVmZXJlbmNlcyA9IExhenkobW9kZWwucmVmZXJlbmNlcykucGx1Y2soJ2lkJykudG9BcnJheSgpO1xuXG4gICAgICAgIEtsYXNzLmludmVyc2VfcmVmZXJlbmNlcyA9IG1vZGVsLnJlZmVyZW5jZWRCeS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIC8vIG1hbmFnaW5nIHJlZmVyZW5jZXMgd2hlcmUgXG4gICAgICAgICAgICByZXR1cm4geC5ieSArICdfJyArIHguaWQgKyAnX3NldCdcbiAgICAgICAgfSk7XG4gICAgICAgIEtsYXNzLnJlZmVyZW50cyA9IG1vZGVsLnJlZmVyZW5jZWRCeS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBbeC5ieSwgeC5pZF1cbiAgICAgICAgfSk7XG4gICAgICAgIEtsYXNzLmZpZWxkc09yZGVyID0gbW9kZWwuZmllbGRPcmRlcjtcbiAgICAgICAgS2xhc3MuYWxsUGVybWlzc2lvbnMgPSBtb2RlbC5wZXJtaXNzaW9ucztcblxuICAgICAgICAvLyByZWRlZmluaW5nIHRvU3RyaW5nIG1ldGhvZFxuICAgICAgICBpZiAoTGF6eShtb2RlbC5yZXByZXNlbnRhdGlvbikuc2l6ZSgpKXtcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS50b1N0cmluZyA9IG5ldyBGdW5jdGlvbigncmV0dXJuIHRoaXMuJyArIExhenkobW9kZWwucmVwcmVzZW50YXRpb24pLnRvU3RyaW5nKCcgKyBcIiBcIiArIHRoaXMuJykpO1xuICAgICAgICB9XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS50b1VwcGVyQ2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIHJlZGVmaW5lIHRvIFVwcGVyQ2FzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICB9O1xuICAgICAgXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS50b0xvd2VyQ2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBkZWxldGUgaW5zdGFuY2UgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIHJldHVybiBleHRPUk0uZGVsZXRlKHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lLCBbdGhpcy5pZF0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHBlcm1pc3Npb24gZ2V0dGVyIHByb3BlcnR5XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShLbGFzcy5wcm90b3R5cGUsICdwZXJtaXNzaW9ucycsIHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9wZXJtaXNzaW9ucylcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Blcm1pc3Npb25zO1xuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsaW5rZXIucGVybWlzc2lvbnNbdGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWVdLmFzayh0aGlzLmlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBnZXR0aW5nIGZ1bGwgcGVybWlzc2lvbiB0YWJsZSBmb3IgYW4gb2JqZWN0XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5hbGxfcGVybXMgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgIHZhciBvYmplY3RfaWQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUgKyAnL2FsbF9wZXJtcycsIHtpZDogdGhpcy5pZH0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBlcm1pc3Npb25zID0gZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXBlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciB1bmtub3duX2dyb3VwcyA9IExhenkocGVybWlzc2lvbnMpLnBsdWNrKCdncm91cF9pZCcpLnVuaXF1ZSgpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJycgKyB4XG4gICAgICAgICAgICAgICAgfSkuZGlmZmVyZW5jZShJREIuYXV0aF9ncm91cC5rZXlzKCkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KHBlcm1pc3Npb25zKS5ncm91cEJ5KGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4Lmdyb3VwX2lkXG4gICAgICAgICAgICAgICAgfSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICBncm91cGVkW2tdID0gTGF6eSh2KS5wbHVjaygnbmFtZScpLnRvQXJyYXkoKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHZhciBjYWxsID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2IobmV3IFBlcm1pc3Npb25UYWJsZShvYmplY3RfaWQsIEtsYXNzLCBncm91cGVkKSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAodW5rbm93bl9ncm91cHMubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nZXQoJ2F1dGhfZ3JvdXAnLHVua25vd25fZ3JvdXBzLGNhbGwpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgY2FsbCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgdmFyIG8gPSB0aGlzLmFzUmF3KCk7XG4gICAgICAgICAgICB2YXIgZmllbGRzID0gS2xhc3MuZmllbGRzO1xuICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgIHZhciBtb2RlbE5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXJnIGluIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgb1thcmddID0gYXJnc1thcmddO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGVsaW1pbmF0ZSB1bndyaXRhYmxlc1xuICAgICAgICAgICAgTGF6eShLbGFzcy5maWVsZHNPcmRlcikuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgIHJldHVybiAhZmllbGRzW3hdLndyaXRhYmxlO1xuICAgICAgICAgICAgfSkuZWFjaChmdW5jdGlvbihmaWVsZE5hbWUpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgaW4gbykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgb1tmaWVsZE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKElEKSB7IG8uaWQgPSBJRDsgfVxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBXMlBSRVNPVVJDRS4kcG9zdChtb2RlbE5hbWUgKyAoSUQgPyAnL3Bvc3QnIDogJy9wdXQnKSwgbyk7XG4gICAgICAgICAgICBpZiAoYXJncyAmJiAoYXJncy5jb25zdHJ1Y3RvciA9PT0gRnVuY3Rpb24pKXtcbiAgICAgICAgICAgICAgICAvLyBwbGFjaW5nIGNhbGxiYWNrIGluIGEgY29tbW9uIHBsYWNlXG4gICAgICAgICAgICAgICAgcHJvbWlzZS5jb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlciA9IGFyZ3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZVxuICAgICAgICB9O1xuICAgICAgICBLbGFzcy5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBvYmogPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih0aGlzLmFzUmF3KCkpO1xuICAgICAgICAgICAgb2JqLl9wZXJtaXNzaW9ucyA9IHRoaXMuX3Blcm1pc3Npb25zO1xuICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBidWlsZGluZyBzZXJpYWxpemF0aW9uIGZ1bmN0aW9uXG4gICAgICAgIHZhciBhc3IgPSAncmV0dXJuIHtcXG4nICsgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5tYXAoZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgcmV0dXJuIGZpZWxkLmlkICsgJyA6IHRoaXMuXycgKyBmaWVsZC5pZDtcbiAgICAgICAgfSkuY29uY2F0KGZpZWxkcy5tYXAoZnVuY3Rpb24gKHgsaykge1xuICAgICAgICAgICAgaWYgKCh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiAodGhpcy4nICsgayArICc/KE1hdGgucm91bmQodGhpcy4nICsgayArICcuZ2V0VGltZSgpIC0gdGhpcy4nICsgayArICcuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIDYwMDAwKSAvIDEwMDApOm51bGwpJzsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHgudHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiB0aGlzLicgKyBrICsgJz9cIlRcIjpcIkZcIic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6IHRoaXMuJyArIGs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKS50b1N0cmluZygnLFxcbicpICsgJ307JztcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmFzUmF3ID0gbmV3IEZ1bmN0aW9uKGFzcik7XG5cbiAgICAgICAgS2xhc3Muc2F2ZU11bHRpID0gZnVuY3Rpb24gKG9iamVjdHMsIGNiLCBzY29wZSkge1xuICAgICAgICAgICAgdmFyIHJhdyA9IFtdO1xuICAgICAgICAgICAgdmFyIGRlbGV0YWJsZSA9IExhenkoS2xhc3MuZmllbGRzKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICF4LndyaXRhYmxlXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAucGx1Y2soJ2lkJylcbiAgICAgICAgICAgICAgICAudG9BcnJheSgpO1xuICAgICAgICAgICAgTGF6eShvYmplY3RzKVxuICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguYXNSYXcoKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShkZWxldGFibGUpLmVhY2goZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB4W3ldO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmF3LnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUsICdwdXQnLCB7bXVsdGlwbGU6IHJhdywgZm9ybUlkeCA6IFcyUFJFU09VUkNFLmZvcm1JZHgrK30sIGZ1bmN0aW9uIChlbGVtcykge1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZWxlbXMpO1xuICAgICAgICAgICAgICAgIHZhciB0YWIgPSBJREJbS2xhc3MubW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB2YXIgb2JqcyA9IExhenkoZWxlbXNbS2xhc3MubW9kZWxOYW1lXS5yZXN1bHRzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhYi5nZXQoeClcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNiKSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKG9ianMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHNjb3BlKTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCdleHRyYV92ZXJicycgaW4gbW9kZWwpXG4gICAgICAgICAgICBMYXp5KG1vZGVsLmV4dHJhX3ZlcmJzKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGZ1bmNOYW1lID0geFswXTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHhbMV07XG4gICAgICAgICAgICAgICAgdmFyIGRkYXRhID0gJ3ZhciBkYXRhID0ge2lkIDogdGhpcy5pZCc7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBkZGF0YSArPSAnLCAnICsgTGF6eShhcmdzKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geCArICcgOiAnICsgeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJywnKTtcbiAgICAgICAgICAgICAgICBkZGF0YSArPSAnfTtcXG4nO1xuICAgICAgICAgICAgICAgIGFyZ3MgPSBbJ3Bvc3QnLCdnb3REYXRhJ10uY29uY2F0KGFyZ3MpO1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCgnY2InKTtcbiAgICAgICAgICAgICAgICB2YXIgY29kZSA9IGRkYXRhICsgJyByZXR1cm4gcG9zdChcIicgKyBLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBmdW5jTmFtZSArICdcIiwgZGF0YSxjYik7JztcbiAgICAgICAgICAgICAgICB2YXIgZnVuYyA9IG5ldyBGdW5jdGlvbihhcmdzLCBjb2RlKTtcbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbZnVuY05hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gW1cyUFJFU09VUkNFLiRwb3N0LCBXMlBSRVNPVVJDRS5nb3REYXRhXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJncylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKCdwcml2YXRlQXJncycgaW4gbW9kZWwpIHtcbiAgICAgICAgICAgIEtsYXNzLnByaXZhdGVBcmdzID0gTGF6eShtb2RlbC5wcml2YXRlQXJncykua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgdHJ1ZV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmVQQSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgdmFyIFQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBvbyA9IHtpZDogdGhpcy5pZH07XG4gICAgICAgICAgICAgICAgdmFyIFBBID0gdGhpcy5jb25zdHJ1Y3Rvci5wcml2YXRlQXJncztcbiAgICAgICAgICAgICAgICB2YXIgRnMgPSB0aGlzLmNvbnN0cnVjdG9yLmZpZWxkcztcbiAgICAgICAgICAgICAgICB2YXIgdCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG8pLmFzUmF3KCk7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkSWR4ID0gTGF6eShQQSkua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIEZzW3hdXVxuICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgTGF6eShvKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoayBpbiBQQSkgJiYgZmllbGRJZHhba10ud3JpdGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9vW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9zYXZlUEEnLCBvbywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG9vKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBUW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbW9kZWxDYWNoZVtLbGFzcy5tb2RlbE5hbWVdID0gS2xhc3M7XG4gICAgICAgIC8vIGFkZGluZyBpZCB0byBmaWVsZHNcbiAgICAgICAgZm9yICh2YXIgZiBpbiBtb2RlbC5maWVsZHMpIHtcbiAgICAgICAgICAgIG1vZGVsLmZpZWxkc1tmXS5pZCA9IGY7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MuZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpLmNvbmNhdChMYXp5KG1vZGVsLnByaXZhdGVBcmdzKSkuY29uY2F0KExhenkobW9kZWwucmVmZXJlbmNlcykudGFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICB4LnR5cGUgPSB4LnR5cGUgfHwgJ3JlZmVyZW5jZSdcbiAgICAgICAgfSkpLmluZGV4QnkoJ2lkJykudG9PYmplY3QoKTtcbiAgICAgICAgLy8gc2V0dGluZyB3aWRnZXRzIGZvciBmaWVsZHNcbiAgICAgICAgTGF6eShLbGFzcy5maWVsZHMpLmVhY2goZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgaWYgKCFmaWVsZC53aWRnZXQpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZC50eXBlID09PSAncmVmZXJlbmNlJyl7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9ICdjaG9pY2VzJ1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9IGZpZWxkLnR5cGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAobWFueSB0byBvbmUpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGV4dF9yZWYgPSByZWYudG87XG4gICAgICAgICAgICB2YXIgbG9jYWxfcmVmID0gJ18nICsgcmVmLmlkO1xuICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5pZCxmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzW2xvY2FsX3JlZl0pIHsgcmV0dXJuIHV0aWxzLm1vY2sgfTtcbiAgICAgICAgICAgICAgICBpZiAoIShleHRfcmVmIGluIElEQikpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUoZXh0X3JlZixmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtlci5tYWluSW5kZXhbZXh0X3JlZl0uYXNrKHRoc1tsb2NhbF9yZWZdLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IChleHRfcmVmIGluIElEQikgJiYgdGhpc1tsb2NhbF9yZWZdICYmIElEQltleHRfcmVmXS5nZXQodGhpc1tsb2NhbF9yZWZdKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdCAmJiAoZXh0X3JlZiBpbiBsaW5rZXIubWFpbkluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBhc2tpbmcgdG8gbGlua2VyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpc1tsb2NhbF9yZWZdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLm1haW5JbmRleFtleHRfcmVmXS5hc2sodGhpc1tsb2NhbF9yZWZdLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdudWxsIHJlZmVyZW5jZSBmb3IgJyArIGxvY2FsX3JlZiArICcoJyArIHRoaXMuaWQgKyAnKSByZXNvdXJjZSAnICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXRpbHMubW9jaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHZhbHVlLmNvbnN0cnVjdG9yICE9PSB1dGlscy5tb2NrKSAmJiAodmFsdWUuY29uc3RydWN0b3IubW9kZWxOYW1lICE9PSBleHRfcmVmKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IGNhbiBhc3NpZ24gb25seSAnICsgZXh0X3JlZiArICcgdG8gJyArIHJlZi5pZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpc1tsb2NhbF9yZWZdID0gdmFsdWUuaWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tsb2NhbF9yZWZdID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAnbmV3LScgKyBleHRfcmVmLCAnZGVsZXRlZC0nICsgZXh0X3JlZiwndXBkYXRlZC0nICsgZXh0X3JlZiwgJ25ldy1tb2RlbC0nICsgZXh0X3JlZi8qLCAndXBkYXRlZC0nICsgS2xhc3MubW9kZWxOYW1lKi8pO1xuXG5cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVmLmlkKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5nZXQoZXh0X3JlZix0aGlzW2xvY2FsX3JlZl0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9idWlsZGluZyByZWZlcmVuY2VzIHRvIChvbmUgdG8gbWFueSkgZmllbGRzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSByZWYuYnkgKyAnLicgKyByZWYuaWQ7XG4gICAgICAgICAgICB2YXIgcHJvcGVydHlOYW1lID0gcmVmLmJ5ICsgJ18nICsgdXRpbHMucGx1cmFsaXplKHJlZi5pZCk7XG4gICAgICAgICAgICB2YXIgcmV2SW5kZXggPSByZWYuYnk7XG4gICAgICAgICAgICBpZiAoS2xhc3MucHJvdG90eXBlLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcnllZCB0byByZWRlZmluZSBwcm9wZXJ0eSAnICsgcHJvcGVydHlOYW1lICsgJ3MnICsgJyBmb3IgJyArIEtsYXNzLm1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCBwcm9wZXJ0eU5hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IChyZXZJbmRleCBpbiBJREIpID8gUkVWSURYW2luZGV4TmFtZV0uZ2V0KHRoaXMuaWQgKyAnJyk6bnVsbDtcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLmZvcmVpZ25LZXlzW2luZGV4TmFtZV0uYXNrKHRoaXMuaWQsdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgfSwgbnVsbCwgJ25ldy0nICsgcmV2SW5kZXgsICd1cGRhdGVkLScgKyByZXZJbmRleCwgJ2RlbGV0ZWQtJyArIHJldkluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUodXRpbHMucGx1cmFsaXplKHJlZi5ieSkpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0cyA9IHt9O1xuICAgICAgICAgICAgICAgIG9wdHNbcmVmLmlkXSA9IFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0T1JNLmdldChyZWYuYnksb3B0cyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2J1aWxkaW5nIHJlZmVyZW5jZSB0byAobWFueSB0byBtYW55KSBmaWVsZHNcbiAgICAgICAgaWYgKG1vZGVsLm1hbnlUb01hbnkpIHtcbiAgICAgICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHJlZi5pbmRleE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcmVmLmZpcnN0PyAwIDogMTtcbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsTmFtZSA9IHJlZi5tb2RlbDtcbi8vICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBnZXRJbmRleChvbW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgZ2V0dGVyID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyAoMSAtIGZpcnN0KV07XG5cbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcmVmLm1vZGVsICsgJ3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZXQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0ID0gZ2V0SW5kZXgob21vZGVsTmFtZSkuZ2V0LmJpbmQoSURCW29tb2RlbE5hbWVdKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcyAmJiBnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0ID0gTGF6eShpZHMpLm1hcChnZXQpLmZpbHRlcih1dGlscy5ib29sKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgICAgICB9LCBudWxsLCAncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUsICdyZWNlaXZlZC0nICsgb21vZGVsTmFtZSk7XG5cbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShvbW9kZWxOYW1lKSldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLmdldE0yTShpbmRleE5hbWUsIFt0aHMuaWRdLCBmaXJzdCxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGdldHRlcih0aHMuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChvbW9kZWxOYW1lLCB7aWQgOiBpZHN9LG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gSURCW29tb2RlbE5hbWVdLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KFtdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgICAgIEtsYXNzLmZpZWxkc1t1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICByZWFkYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ00yTScsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcnM6IFtdXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS51bmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IFtbSUQsIGluc3RhbmNlLmlkXV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL2RlbGV0ZScsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUubGlua1JlZmVyZW5jZSA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lID09ICdBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZXMgPSBpbnN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBpbnN0YW5jZXNbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJTkRFWF9NMk0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZnMgPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykuZGlmZmVyZW5jZShMYXp5KElOREVYX00yTVtpbmRleE5hbWVdWzBdLmdldCh0aGlzLmlkKSkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBvbW9kZWwgKyAnLycgKyBLbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlZnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkocmVmcykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtJRCwgeF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUF9QT1NUKEtsYXNzLm1vZGVsTmFtZSwgb21vZGVsICsgJ3MvcHV0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGluZGV4TmFtZSBpbiBsaW5rZXIubTJtSW5kZXgpICYmIExhenkobGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKG9tb2RlbCldKGluc3RhbmNlLmlkKSkuZmluZCh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL3B1dCcsIHtjb2xsZWN0aW9uOiBbW3RoaXMuaWQsIGluc3RhbmNlLmlkXV19KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ25ldy1tb2RlbCcsIEtsYXNzKTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbmV3LW1vZGVsLScgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICByZXR1cm4gS2xhc3M7XG4gICAgfTtcblxuICAgIHRoaXMuZ290RGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBjYWxsQmFjaykge1xuICAgICAgICAvLyByZWNlaXZlIGFsbCBkYXRhIGZyb20gZXZlcnkgZW5kIHBvaW50XG4gICAgICAgIGNvbnNvbGUuaW5mbygnZ290RGF0YScpO1xuICAgICAgICBpZiAodHlwZW9mKGRhdGEpID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGF0YSAnICsgZGF0YSArICcgcmVmdXNlZCBmcm9tIGdvdERhdGEoKScpO1xuICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNsZWFuIGRhdGEgZnJvbSByZWxhdGlvbnMgYW5kIHBlcm1pc3Npb25zIGZvciB1c2luZyBpdCBhZnRlciBtb2RlbCBwYXJzaW5nXG4gICAgICAgIGlmICgnX2V4dHJhJyBpbiBkYXRhKXsgZGVsZXRlIGRhdGEuX2V4dHJhIH1cbiAgICAgICAgdmFyIFRPT05FID0gZGF0YS5UT09ORTtcbiAgICAgICAgdmFyIFRPTUFOWSA9IGRhdGEuVE9NQU5ZO1xuICAgICAgICB2YXIgTUFOWVRPTUFOWSA9IGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgdmFyIFBFUk1JU1NJT05TID0gZGF0YS5QRVJNSVNTSU9OUztcbiAgICAgICAgdmFyIFBBID0gZGF0YS5QQTtcbiAgICAgICAgZGVsZXRlIGRhdGEuVE9PTkU7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBBO1xuICAgICAgICBpZiAoIVBBKSB7IFBBID0ge307IH1cblxuICAgICAgICAvLyBjbGVhbmluZyBmcm9tIHVzZWxlc3MgZGVsZXRlZCBkYXRhXG4gICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLmZpbHRlcihmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgcmV0dXJuICghKCdkZWxldGVkJyBpbiB2KSB8fCAoKGsgaW4gbW9kZWxDYWNoZSkpKTtcbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgnbTJtJyBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbTJtID0gZGF0YS5tMm07XG4gICAgICAgICAgICBkZWxldGUgZGF0YVsnbTJtJ107XG4gICAgICAgIH1cbiAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uIChkYXRhLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsQ2xhc3MgPSBtb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXN1bHRzICYmIChkYXRhLnJlc3VsdHMubGVuZ3RoID4gMCkgJiYgKGRhdGEucmVzdWx0c1swXS5jb25zdHJ1Y3RvciA9PSBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMYXp5KG1vZGVsQ2xhc3MuZmllbGRzT3JkZXIpLnppcCh4KS50b09iamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBMYXp5KGRhdGEucmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgdmFyIGRlbGV0ZWQgPSBkYXRhLmRlbGV0ZWQ7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBQQSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgTVBBID0gUEFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShyZXN1bHRzKS5lYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmQuaWQgaW4gTVBBKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShNUEFbcmVjb3JkLmlkXSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGluZGV4aW5nIHJlZmVyZW5jZXMgYnkgaXRzIElEXG4gICAgICAgICAgICAgICAgdmFyIGl0YWIgPSBnZXRJbmRleChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZSA9IGl0YWIuc291cmNlO1xuXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGVkLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGFibGVbeF07XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuLypcbiAgICAgICAgICAgICAgICBMYXp5KGRlbGV0ZWQpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgIH0pO1xuKi9cbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gcmVzdWx0cy5pbmRleEJ5KCdpZCcpLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgdmFyIGlrID0gTGF6eShpZHgpLmtleXMoKTtcbiAgICAgICAgICAgICAgICB2YXIgbm5ldyA9IGlrLmRpZmZlcmVuY2UoaXRhYi5rZXlzKCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh4KVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB2YXIgdXBkYXRlZCA9IGlrLmRpZmZlcmVuY2Uobm5ldyk7XG4gICAgICAgICAgICAgICAgLy8gcmVtb3Zpbmcgb2xkIGlkZW50aWNhbCB2YWx1ZXNcbiAgICAgICAgICAgICAgICB1cGRhdGVkID0gdXBkYXRlZC5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICF1dGlscy5zYW1lQXMoaWR4W3hdLCB0YWJsZVt4XS5hc1JhdygpKTtcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy8gY2xhc3NpZnkgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIHZhciBwZXJtcyA9IGRhdGEucGVybWlzc2lvbnMgPyBMYXp5KGRhdGEucGVybWlzc2lvbnMpIDogTGF6eSh7fSk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld09iamVjdHMgPSBubmV3Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IG1vZGVsQ2xhc3MoaWR4W3hdLCBwZXJtcy5nZXQoeCkpXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLy8vIGNsYXNzaWZ5aW5nIHVwZGF0ZWRcbiAgICAgICAgICAgICAgICAvL3ZhciB1cGRhdGVkT2JqZWN0cyA9IHVwZGF0ZWQubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBuZXcgbW9kZWxDbGFzcyhpZHguZ2V0KHgpLHBlcm1zLmdldCh4KSl9KTtcbiAgICAgICAgICAgICAgICAvL3ZhciB1byA9IHVwZGF0ZWRPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvL3VwZGF0ZWRPYmplY3RzID0gTGF6eSh1bykubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBbeCx0YWJsZVt4LmlkXV19KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRpbmcgc2luZ2xlIG9iamVjdHNcbiAgICAgICAgICAgICAgICB2YXIgY2hhbmdlZCA9IFtdO1xuLy8gICAgICAgICAgICAgICAgdmFyIERBVEVGSUVMRFMgPSBNT0RFTF9EQVRFRklFTERTW21vZGVsTmFtZV07XG4vLyAgICAgICAgICAgICAgICB2YXIgQk9PTEZJRUxEUyA9IE1PREVMX0JPT0xGSUVMRFNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB2YXIgbW9kZWxSZWZlcmVuY2VzID0gTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5tYXAoZnVuY3Rpb24oaykgeyByZXR1cm4gW2ssMV19KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQuZm9yRWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSXRlbSA9IHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ29weSA9IG9sZEl0ZW0uY29weSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3SXRlbSA9IGlkeC5nZXQoeCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGluZyBlYWNoIGF0dHJpYnV0ZSBzaW5ndWxhcmx5XG5cbiAgICAgICAgICAgICAgICAgICAgTGF6eShtb2RlbC5maWVsZHMpLmVhY2goZnVuY3Rpb24oZmllbGQsIGZpZWxkTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGZpZWxkLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdyZWZlcmVuY2UnIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtWydfJyArIGZpZWxkTmFtZV0gPSBuZXdJdGVtW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5hTiBpcyBjb252bnRpb25hbGx5IGEgY2FjaGUgZGVsZXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtW2ZpZWxkTmFtZV0gPSBOYU47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdkYXRlJzoge29sZEl0ZW1bZmllbGROYW1lXSA9IG5ldyBEYXRlKG5ld0l0ZW1bZmllbGROYW1lXSAqIDEwMDApOyBicmVha307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGF0ZXRpbWUnOiB7b2xkSXRlbVtmaWVsZE5hbWVdID0gbmV3IERhdGUobmV3SXRlbVtmaWVsZE5hbWVdICogMTAwMCk7IGJyZWFrfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJyA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChuZXdJdGVtW2ZpZWxkTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgbnVsbCA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gbnVsbDsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdUJyA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gdHJ1ZTsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdGJyA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gZmFsc2U7IGJyZWFrOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0cnVlIDogeyBvbGRJdGVtW2ZpZWxkTmFtZV0gPSB0cnVlOyBicmVhazsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgZmFsc2UgOiB7IG9sZEl0ZW1bZmllbGROYW1lXSA9IGZhbHNlOyBicmVhazsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHtvbGRJdGVtW2ZpZWxkTmFtZV0gPSBuZXdJdGVtW2ZpZWxkTmFtZV19XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICAgICAgICAgIG9sZEl0ZW1bZmllbGROYW1lXSA9IG5ld0l0ZW1bZmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChbbmV3SXRlbSwgb2xkQ29weV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBzZW5kaW5nIHNpZ25hbCBmb3IgdXBkYXRlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAoY2hhbmdlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgndXBkYXRlZC0nICsgbW9kZWxOYW1lLCBjaGFuZ2VkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8qKioqKioqKiBVcGRhdGUgdW5pdmVyc2UgKioqKioqKipcbiAgICAgICAgICAgICAgICB2YXIgbm8gPSBuZXdPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KG5vKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRhYmxlW3guaWRdID0geFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHJlYnVsZGluZyByZXZlcnNlIGluZGV4ZXNcbiAgICAgICAgICAgICAgICBMYXp5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXS5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgICAgICAgICAgUkVWSURYW21vZGVsTmFtZSArICcuJyArIHJlZl0gPSBJREJbbW9kZWxOYW1lXS5ncm91cEJ5KCdfJyArIHJlZik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIG5ldyB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAobm8ubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCduZXctJyArIG1vZGVsTmFtZSwgTGF6eShubyksIGRhdGEudG90YWxSZXN1bHRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdkZWxldGVkLScgKyBtb2RlbE5hbWUsIGRlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgZGF0YSBhcnJpdmVkXG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtJyArIG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbi8qICAgICAgICBcbiAgICAgICAgaWYgKFRPT05FKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUT09ORScpO1xuICAgICAgICAgICAgTGF6eShUT09ORSkuZWFjaChmdW5jdGlvbiAodmFscywgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgdWR4ID0gZ2V0VW5saW5rZWQobW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChUT01BTlkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RPTUFOWScpO1xuICAgICAgICAgICAgTGF6eShUT01BTlkpLmVhY2goZnVuY3Rpb24gKHZhbHMsIGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBBU0tFRF9VTkxJTktFRCkpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfVU5MSU5LRURbaW5kZXhOYW1lXSA9IExhenkoW10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBMYXp5KHZhbHMpLmVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX1VOTElOS0VEW2luZGV4TmFtZV0uc291cmNlLnB1c2goaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE1BTllUT01BTlkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ01BTllUT01BTlknKTtcbiAgICAgICAgICAgIExhenkoTUFOWVRPTUFOWSkuZWFjaChmdW5jdGlvbiAodmFscywgaW5kZXhOYW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcGFyc2VJbnQoaW5kZXhOYW1lLnNwbGl0KCd8JylbMV0pO1xuICAgICAgICAgICAgICAgIGluZGV4TmFtZSA9IGluZGV4TmFtZS5zcGxpdCgnfCcpWzBdO1xuICAgICAgICAgICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBBU0tFRF9NMk0pKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX00yTVtpbmRleE5hbWVdID0gW3t9LCB7fV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBNSURYID0gQVNLRURfTTJNW2luZGV4TmFtZV1bZmlyc3RdO1xuICAgICAgICAgICAgICAgIExhenkodmFscykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBNSURYW3ggKyAnJ10gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBNSURYW3hdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICBcbiovXG4gICAgICAgIGlmIChtMm0pIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdE0yTShtMm0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChQRVJNSVNTSU9OUykge1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoUEVSTUlTU0lPTlMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdnb3QtZGF0YScpO1xuICAgIH07XG4gICAgdGhpcy5nb3RQZXJtaXNzaW9ucyA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbiAodiwgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBMYXp5KHZbMF0pLmVhY2goZnVuY3Rpb24gKHJvdywgaWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoKHJlc291cmNlTmFtZSBpbiBJREIpICYmIChpZCBpbiBJREJbcmVzb3VyY2VOYW1lXS5zb3VyY2UpKXtcbiAgICAgICAgICAgICAgICAgICAgSURCW3Jlc291cmNlTmFtZV0uZ2V0KGlkKS5fcGVybWlzc2lvbnMgPSBMYXp5KHJvdykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHRydWVdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoTGF6eSh2WzBdKS5zaXplKCkpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3VwZGF0ZS1wZXJtaXNzaW9ucy0nICsgcmVzb3VyY2VOYW1lLCBMYXp5KHZbMF0pLmtleXMoKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMnKTtcbiAgICB9O1xuXG5cbiAgICB0aGlzLmdvdE0yTSA9IGZ1bmN0aW9uKG0ybSl7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICB2YXIgbTJtSW5kZXggPSBsaW5rZXIubTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbihtKXtcbiAgICAgICAgICAgICAgICBMYXp5KG0pLmVhY2goZnVuY3Rpb24oZGF0YSx2ZXJiKXtcbiAgICAgICAgICAgICAgICAgICAgbTJtSW5kZXhbdmVyYl0oZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLW0ybScpO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmZldGNoID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spIHsgIC8vXG4gICAgICAgIC8vIGlmIGEgY29ubmVjdGlvbiBpcyBjdXJyZW50bHkgcnVubmluZywgd2FpdCBmb3IgY29ubmVjdGlvbi5cbiAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpe1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spO1xuICAgICAgICAgICAgfSw1MDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZmV0Y2hpbmcgYXN5bmNocm9tb3VzIG1vZGVsIGZyb20gc2VydmVyXG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIChmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgICAgICAgICAgLy8gaWYgZGF0YSBjYW1lcyBmcm9tIHJlYWx0aW1lIGNvbm5lY3Rpb25cbiAgICAgICAgICAgICAgICBpZiAoVzJQUkVTT1VSQ0UuY29ubmVjdGlvbi5jYWNoZWRTdGF0dXMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBnZXR0aW5nIGZpbHRlciBmaWx0ZXJlZCBieSBjYWNoaW5nIHN5c3RlbVxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXIgPSBsaXN0Q2FjaGUuZmlsdGVyKG1vZGVsLGZpbHRlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgc29tdGhpbmcgaXMgbWlzc2luZyBvbiBteSBsb2NhbCBEQiBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbHRlcil7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhc2sgZm9yIG1pc3NpbmdzIGFuZCBwYXJzZSBzZXJ2ZXIgcmVzcG9uc2UgaW4gb3JkZXIgdG8gZW5yaWNoIG15IGxvY2FsIERCLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGxhY2luZyBsb2NrIGZvciB0aGlzIG1vZGVsXG4gICAgICAgICAgICAgICAgICAgICAgICB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChtb2RlbE5hbWUgKyAnL2xpc3QnLCB7ZmlsdGVyIDogZmlsdGVyfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShkYXRhLGNhbGxCYWNrKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWxlYXNlIGxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHJldCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgbG9ja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2xpc3QnLCBzZW5kRGF0YSxmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdPVF9BTEwuc291cmNlLnB1c2gobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShkYXRhLCBjYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmdldCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzLCBjYWxsQmFjayl7XG4gICAgICAgIC8vIHNlYXJjaCBvYmplY3RzIGZyb20gSURCLiBJZiBzb21lIGlkIGlzIG1pc3NpbmcsIGl0IHJlc29sdmUgaXQgYnkgdGhlIHNlcnZlclxuICAgICAgICAvLyBpZiBhIHJlcXVlc3QgdG8gdGhlIHNhbWUgbW9kZWwgaXMgcGVuZGluZywgd2FpdCBmb3IgaXRzIGNvbXBsZXRpb25cbiAgICAgICAgXG4gICAgICAgIGlmIChpZHMuY29uc3RydWN0b3IgIT09IEFycmF5KXtcbiAgICAgICAgICAgIGlkcyA9IFtpZHNdO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIHNvbWUgZW50aXR5IGlzIG1pc3NpbmcgXG4gICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSAsIHtpZDogaWRzfSwgbnVsbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgdmFyIGl0YWIgPSBJREJbbW9kZWxOYW1lXVxuICAgICAgICAgICAgZm9yICh2YXIgaWQgaW4gaWRzKXtcbiAgICAgICAgICAgICAgICByZXQucHVzaChpdGFiLnNvdXJjZVtpZHNbaWRdXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsQmFjayhyZXQpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5nb3RNb2RlbCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGZvciAodmFyIG1vZGVsTmFtZSBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSBkYXRhW21vZGVsTmFtZV07XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2VbJ2Rlc2NyaXB0aW9uOicgKyBtb2RlbE5hbWVdID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBtb2RlbENhY2hlW21vZGVsTmFtZV0gPSBtYWtlTW9kZWxDbGFzcyhtb2RlbCk7XG4gICAgICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gSURCKSkge1xuICAgICAgICAgICAgICAgIElEQlttb2RlbE5hbWVdID0gTGF6eSh7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5kZXNjcmliZSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgY2FsbEJhY2spe1xuICAgICAgICB2YXIgcmV0ID0gbW9kZWxDYWNoZVttb2RlbE5hbWVdO1xuICAgICAgICBpZiAocmV0KSB7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhyZXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHdhaXRpbmdDb25uZWN0aW9ucykpe1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gZmFpbGVkTW9kZWxzKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBjYWNoZUtleSA9ICdkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChjYWNoZUtleSBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nb3RNb2RlbChKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVtjYWNoZUtleV0pKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sobW9kZWxDYWNoZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9kZXNjcmliZScsbnVsbCwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RNb2RlbChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbE5vdEZvdW5kLmhhbmRsZShtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbGVkTW9kZWxzW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGNvbm5lY3Rpb25cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gICAgICAgIFxuICAgIH07XG4gICAgdGhpcy5hZGRNb2RlbEhhbmRsZXIgPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBkZWNvcmF0b3IpIHtcbiAgICAgICAgdmFyIGtleSA9IHV0aWxzLmhhc2goZGVjb3JhdG9yKTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVycykpIGJ1aWxkZXJIYW5kbGVyc1ttb2RlbE5hbWVdID0gbmV3IEhhbmRsZXIoKTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVyVXNlZCkpIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdID0ge307XG4gICAgICAgIGlmIChrZXkgaW4gYnVpbGRlckhhbmRsZXJVc2VkW21vZGVsTmFtZV0pe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVpbGRlckhhbmRsZXJVc2VkW21vZGVsTmFtZV1ba2V5XSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBtb2RlbENhY2hlKSB7XG4gICAgICAgICAgICBkZWNvcmF0b3IobW9kZWxDYWNoZVttb2RlbE5hbWVdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyc1ttb2RlbE5hbWVdLmFkZEhhbmRsZXIoZGVjb3JhdG9yKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgYXR0cmlidXRlcyl7XG4gICAgICAgIHZhciBhZGRQcm9wZXJ0eSA9IGZ1bmN0aW9uKG1vZGVsLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgYXR0cmlidXRlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbCl7XG4gICAgICAgICAgICB2YXIga2V5ID0gJ3BBOicgKyBtb2RlbC5tb2RlbE5hbWUgKyAnOicgKyB2YWw7XG4gICAgICAgICAgICB2YXIga2F0dHIgPSAnX18nICsgdmFsO1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG1vZGVsLnByb3RvdHlwZSwgdmFsLCB7XG4gICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIShrYXR0ciBpbiB0aGlzKSl7XG4gICAgICAgICAgICAgICAgICB2YXIgdiA9IGxvY2FsU3RvcmFnZVtrZXkgKyB0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICAgIHRoaXNba2F0dHJdID0gdj9KU09OLnBhcnNlKHYpOm51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW2thdHRyXTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgICAgICAgICAgdGhpc1trYXR0cl0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Vba2V5ICsgdGhpcy5pZF0gPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gcGVyc2lzdGVudEF0dHJpYnV0ZXMpKSB7IHBlcnNpc3RlbnRBdHRyaWJ1dGVzW21vZGVsTmFtZV0gPSBbXTsgfVxuICAgICAgICB2YXIgYXR0cnMgPSBwZXJzaXN0ZW50QXR0cmlidXRlc1ttb2RlbE5hbWVdO1xuICAgICAgICBpZiAoYXR0cmlidXRlcykge1xuICAgICAgICAgICAgdmFyIG5ld0F0dHJzID0gTGF6eShhdHRyaWJ1dGVzKS5kaWZmZXJlbmNlKGF0dHJzKS50b0FycmF5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3QXR0cnMgPSBhdHRycztcbiAgICAgICAgfVxuICAgICAgICBpZiAobmV3QXR0cnMubGVuZ3RoKXtcbiAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gbW9kZWxDYWNoZSl7XG4gICAgICAgICAgICAgICAgYWRkUHJvcGVydHkobW9kZWxDYWNoZVttb2RlbE5hbWVdLCBuZXdBdHRycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlcyl7XG4gICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoYXR0cnMsbmV3QXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLm9uKCduZXctbW9kZWwnLCBmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgIGlmIChtb2RlbC5tb2RlbE5hbWUgaW4gYnVpbGRlckhhbmRsZXJzKXtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyc1ttb2RlbC5tb2RlbE5hbWVdLmhhbmRsZShtb2RlbENhY2hlW21vZGVsLm1vZGVsTmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbC5tb2RlbE5hbWUgaW4gcGVyc2lzdGVudEF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMobW9kZWwubW9kZWxOYW1lKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5xdWVyeSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spe1xuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdGhpcy5kZXNjcmliZShtb2RlbE5hbWUsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgLy8gYXJyYXlmaXkgYWxsIGZpbHRlciB2YWx1ZXNcbiAgICAgICAgICAgIGZpbHRlciA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odixrKXsgcmV0dXJuIFtrLEFycmF5LmlzQXJyYXkodik/djpbdl1dfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgIHZhciBmaWx0ZXJGdW5jdGlvbiA9IHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICB2YXIgaWR4ID0gZ2V0SW5kZXgobW9kZWxOYW1lKTtcbiAgICAgICAgICAgIHRocy5mZXRjaChtb2RlbE5hbWUsZmlsdGVyLHRvZ2V0aGVyLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhpZHguZmlsdGVyKGZpbHRlckZ1bmN0aW9uKS52YWx1ZXMoKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzLCBjYWxsQmFjayl7XG4gICAgICAgIHJldHVybiB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVsZXRlJywgeyBpZCA6IGlkc30sIGNhbGxCYWNrKTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb25uZWN0ID0gZnVuY3Rpb24gKGNhbGxCYWNrKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbm5lY3Rpb24uaXNMb2dnZWRJbikge1xuICAgICAgICAgICAgY2FsbEJhY2soKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5jb25uZWN0KGNhbGxCYWNrKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmZ1bmN0aW9uIHJlV2hlZWxPUk0oZW5kUG9pbnQsIGxvZ2luRnVuYyl7XG4gICAgdGhpcy4kb3JtID0gbmV3IGJhc2VPUk0obmV3IHV0aWxzLnJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBsb2dpbkZ1bmMpLHRoaXMpO1xuICAgIHRoaXMub24gPSB0aGlzLiRvcm0ub24uYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuZW1pdCA9IHRoaXMuJG9ybS5lbWl0LmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLnVuYmluZCA9IHRoaXMuJG9ybS51bmJpbmQuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMub25jZSA9IHRoaXMuJG9ybS5vbmNlO1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gdGhpcy4kb3JtLmFkZE1vZGVsSGFuZGxlci5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyA9IHRoaXMuJG9ybS5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcy5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy51dGlscyA9IHV0aWxzO1xuICAgIHRoaXMubG9nb3V0ID0gdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9nb3V0LmJpbmQodGhpcy4kb3JtLmNvbm5lY3Rpb24pO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXMuJG9ybS5jb25uZWN0aW9uO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoZnVuY3Rpb24oY2FsbEJhY2sscmVqZWN0KXtcbiAgICAgICAgY29ubmVjdGlvbi5jb25uZWN0KGNhbGxCYWNrKTtcbiAgICB9KSk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9naW4odXNlcm5hbWUsIHBhc3N3b3JkLCBhY2NlcHQpOyAgICBcbiAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICBcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ291dCA9IGZ1bmN0aW9uKHVybCl7XG4gICAgcmV0dXJuIHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ291dCgpO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRNb2RlbCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5kZXNjcmliZShtb2RlbE5hbWUsYWNjZXB0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obW9kZWxOYW1lLCBpZHMpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2luZ2xlID0gZmFsc2U7XG4gICAgdmFyIG1vZE5hbWUgPSBtb2RlbE5hbWU7XG4gICAgdmFyIGZpbHRlcjtcbiAgICBpZiAodHlwZW9mIGlkcyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgc2luZ2xlID0gdHJ1ZTtcbiAgICAgICAgZmlsdGVyID0geyBpZCA6IFtpZHNdfTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaWRzKSl7XG4gICAgICAgIGZpbHRlciA9IHsgaWQgOiBpZHMgfTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBpZHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGZpbHRlciA9IGlkcztcbiAgICB9IGVsc2UgaWYgKGlkcyA9PT0gbnVsbCkge1xuICAgICAgICBmaWx0ZXIgPSB7fTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIG51bGwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNpbmdsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KGRhdGEubGVuZ3RoID8gZGF0YVswXSA6IG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5xdWVyeSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgcmVsYXRlZCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHZhciB0b2dldGhlciA9IG51bGw7XG4gICAgICAgIGlmIChyZWxhdGVkICYmIChyZWxhdGVkLmNvbnN0cnVjdG9yID09PSBBcnJheSkgJiYgKHJlbGF0ZWQubGVuZ3RoKSl7XG4gICAgICAgICAgICB0b2dldGhlciA9IHJlbGF0ZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRlZCAmJiAocmVsYXRlZC5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKSAmJiAocmVsYXRlZC5sZW5ndGgpKXtcbiAgICAgICAgICAgIHRvZ2V0aGVyID0gcmVsYXRlZC5zcGxpdCgnLCcpO1xuICAgICAgICB9XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLnF1ZXJ5KG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuKi9cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgaWRzKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVsZXRlKG1vZGVsTmFtZSwgaWRzLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldExvZ2dlZFVzZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHRoaXMuJG9ybS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy51c2VyX2lkKVxuICAgICAgICByZXR1cm4gdGhpcy5nZXQoJ2F1dGhfdXNlcicsdGhpcy4kb3JtLmNvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnVzZXJfaWQpO1xuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3QpIHtcbiAgICAgICAgICAgIHNlbGYub25jZSgnbG9nZ2VkLWluJyxmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5nZXQoJ2F1dGhfdXNlcicsIHVzZXIpLnRoZW4oYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLiRzZW5kVG9FbmRwb2ludCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uJHBvc3QodXJsLCBkYXRhKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dpbih1c2VybmFtZSxwYXNzd29yZCk7XG59XG4iXX0=
