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
                    var idx = results.indexBy('id');
                    var ik = idx.keys();
                    var nnew = ik.difference(itab.keys().map(function (x) {
                        return parseInt(x);
                    }));
                    var updated = ik.difference(nnew);
                    // removing old identical values
                    updated = updated.filter(function (x) {
                        return !utils.sameAs(idx.get(x), itab.get(x).asRaw());
                    }).toArray();
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJjb25uZWN0aW9uLmpzIiwidG91Y2hlci5qcyIsInZhY3V1bWNhY2hlci5qcyIsImF1dG9saW5rZXIuanMiLCJsaXN0Y2FjaGVyLmpzIiwibWFueXRvbWFueS5qcyIsImNhY2hlci5qcyIsIm9ybS5qcyJdLCJuYW1lcyI6WyJIYW5kbGVyIiwiaGFuZGxlcnMiLCJzdHJIYW5kbGVycyIsInByb3RvdHlwZSIsImFkZEhhbmRsZXIiLCJoYW5kbGVyIiwic3RySGFuZGxlciIsInV0aWxzIiwiaGFzaCIsInRvU3RyaW5nIiwicHVzaCIsImhhbmRsZSIsImFyZ3MiLCJBcnJheSIsInNsaWNlIiwiY2FsbCIsImFyZ3VtZW50cyIsImZvckVhY2giLCJmdW5jIiwiYXBwbHkiLCJoYW5kbGVCeSIsInRocyIsIk5hbWVkRXZlbnRNYW5hZ2VyIiwiZXZlbnRzIiwiaGFuZGxlcklkIiwiaWR4SWQiLCJvbiIsIm5hbWUiLCJpZCIsImVtaXQiLCJldmVudCIsInVuYmluZCIsImNvdW50IiwiTGF6eSIsImVhY2giLCJ2IiwiayIsImlkeCIsIm4iLCJyZXZlcnNlIiwieCIsInNwbGljZSIsIm9uY2UiLCJldmVudE5hbWUiLCJoYW5kbGVyRnVuY3Rpb24iLCJzZWxmIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsIm1vY2siLCJyZW5hbWVGdW5jdGlvbiIsImZuIiwiRnVuY3Rpb24iLCJiaW5kIiwiY2FjaGVkIiwia2V5Iiwid3JhcHBlciIsImxvZyIsImNvbnNvbGUiLCJ4ZHIiLCJ1cmwiLCJkYXRhIiwiYXBwbGljYXRpb24iLCJ0b2tlbiIsImZvcm1FbmNvZGUiLCJQcm9taXNlIiwiYWNjZXB0IiwicmVqZWN0IiwicmVxIiwiWE1MSHR0cFJlcXVlc3QiLCJvbnJlYWR5c3RhdGVjaGFuZ2UiLCJyZWFkeVN0YXRlIiwicmVzcG9uc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwicmVzcG9uc2VUZXh0IiwiYSIsInJlc3BvbnNlIiwic3RhdHVzIiwicmVxdWVzdCIsIlhEb21haW5SZXF1ZXN0Iiwib25sb2FkIiwic3RhdHVzVGV4dCIsIkVycm9yIiwib3BlbiIsIm9uZXJyb3IiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiX190b2tlbl9fIiwic2l6ZSIsInN0cmluZ2lmeSIsIm1hcCIsImVuY29kZVVSSSIsInRvQXJyYXkiLCJqb2luIiwic2VuZCIsImNhcGl0YWxpemUiLCJzIiwidG9VcHBlckNhc2UiLCJ0b0xvd2VyQ2FzZSIsInN0ciIsInJldCIsImxlbmd0aCIsImNoYXJDb2RlQXQiLCJtYWtlRmlsdGVyIiwibW9kZWwiLCJmaWx0ZXIiLCJ1bmlmaWVyIiwiZG9udFRyYW5zbGF0ZUZpbHRlciIsInNvdXJjZSIsInZhbHMiLCJmaWVsZCIsImlzQXJyYXkiLCJmaWVsZHMiLCJ0eXBlIiwiY29uc3RydWN0b3IiLCJOdW1iZXIiLCJlcnJvciIsIm9ybSIsInNhbWVBcyIsInkiLCJwbHVyYWxpemUiLCJiZWZvcmVDYWxsIiwiYmVmb3JlIiwiZGVjb3JhdG9yIiwidGhlbiIsImNsZWFuU3RvcmFnZSIsImxvY2FsU3RvcmFnZSIsImtleXMiLCJjbGVhbkRlc2NyaXB0aW9uIiwic3RhcnRzV2l0aCIsImNociIsInNwbGl0IiwicGVybXV0YXRpb25zIiwiYXJyIiwid2FpdEZvciIsImNhbGxCYWNrIiwid2FpdGVyIiwic2V0VGltZW91dCIsImJvb2wiLCJCb29sZWFuIiwibm9vcCIsInR6T2Zmc2V0IiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwidHJhbnNGaWVsZFR5cGUiLCJkYXRlIiwiZGF0ZXRpbWUiLCJzdHJpbmciLCJ0ZXh0IiwiaW50ZWdlciIsInBhcnNlSW50IiwiZmxvYXQiLCJwYXJzZUZsb2F0IiwiU1RBVFVTS0VZIiwiUmVhbHRpbWVDb25uZWN0aW9uIiwiZW5kUG9pbnQiLCJyd3RDb25uZWN0aW9uIiwiY29ubmVjdGlvbiIsIlNvY2tKUyIsIm9ub3BlbiIsInRlbmFudCIsIm9ubWVzc2FnZSIsImUiLCJvbmNsb3NlIiwid3NDb25uZWN0IiwiY2FjaGVkU3RhdHVzIiwiY2xvc2UiLCJyZVdoZWVsQ29ubmVjdGlvbiIsImdldExvZ2luIiwiZW5kc1dpdGgiLCJpc0Nvbm5lY3RlZCIsImlzTG9nZ2VkSW4iLCIkcG9zdCIsInByb21pc2UiLCJ4aHIiLCJmb3JjZSIsInN0YXR1c1dhaXRpbmciLCJ1cGRhdGVTdGF0dXMiLCJsYXN0QnVpbGQiLCJsYXN0X2J1aWxkIiwidXNlcl9pZCIsIm9sZFN0YXR1cyIsImxvZ2luSW5mbyIsIk9iamVjdCIsImxvZ2luIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsIm9iaiIsInJlYWx0aW1lRW5kUG9pbnQiLCJ3c0Nvbm5lY3Rpb24iLCJ1c2VyaWQiLCJsb2dvdXQiLCJvayIsImNvbm5lY3QiLCJUb3VjaGVyIiwidG91Y2hlZCIsInRvdWNoIiwidCIsIlZhY3V1bUNhY2hlciIsImFza2VkIiwicGtJbmRleCIsIm1pc3NpbmciLCJhc2siLCJsYXp5IiwiY29udGFpbnMiLCJnZXRBc2tlZEluZGV4IiwibWlzc2luZ3MiLCJ1bmlxdWUiLCJBdXRvTGlua2VyIiwiYWN0aXZlcyIsIklEQiIsIlcyUFJFU09VUkNFIiwibGlzdENhY2hlIiwibWFpbkluZGV4IiwiZm9yZWlnbktleXMiLCJtMm0iLCJtMm1JbmRleCIsInBlcm1pc3Npb25zIiwiaW5kZXgiLCJnZXRJbmRleEZvciIsInJlZmVyZW5jZXMiLCJyZWZlcmVuY2UiLCJpbmRleE5hbWUiLCJ0byIsInJlZmVyZW5jZWRCeSIsImJ5IiwibWFueVRvTWFueSIsInJlbGF0aW9uIiwiTWFueVRvTWFueVJlbGF0aW9uIiwibTJtR2V0IiwiY29sbGVjdGlvbiIsImdvdERhdGEiLCJnZXRNMk0iLCJsaW5rVW5saW5rZWQiLCJ2YWx1ZXMiLCJzdW0iLCJjaGFuZ2VkIiwiaW5kZXhlcyIsIklOREVYIiwiZ2V0dGVyIiwiaWRzIiwib3RoZXJJbmRleCIsImRlc2NyaWJlIiwiZmxhdHRlbiIsIm1vZGVsTmFtZSIsImlkYiIsImZldGNoIiwibWFpblJlc291cmNlIiwiZmllbGROYW1lIiwidG9PYmplY3QiLCJyZXNvdXJjZU5hbWUiLCJnb3RQZXJtaXNzaW9ucyIsIlBFUk1JU1NJT05TIiwic2V0SW50ZXJ2YWwiLCJMaXN0Q2FjaGVyIiwiZ290QWxsIiwiY29tcG9zaXRlQXNrZWQiLCJjYXJ0ZXNpYW5Qcm9kdWN0MSIsImIiLCJjYXJ0ZXNpYW5Qcm9kdWN0IiwiZXhwbG9kZUZpbHRlciIsInByb2R1Y3QiLCJyIiwiZmlsdGVyU2luZ2xlIiwidGVzdE9ubHkiLCJkaWZmZXJlbmNlIiwiY2xlYW5Db21wb3NpdGVzIiwiZmlsdGVyTGVuIiwiaXRlbXMiLCJpdGVtIiwiZ290Iiwic2luZ2xlIiwic29tZSIsImYiLCJleHBsb2RlZCIsInBhcnRpYWxzIiwiYmFkIiwicGx1Y2siLCJhZGQiLCJmaW5kIiwiZ2V0MCIsImdldDEiLCJkZWwiLCJsIiwiY2FjaGVkUHJvcGVydHlCeUV2ZW50cyIsInByb3RvIiwicHJvcGVydHlOYW1lIiwic2V0dGVyIiwicmVzdWx0IiwicHJvcGVydHlEZWYiLCJ2YWx1ZSIsImlzRmluaXRlIiwiZGVmaW5lUHJvcGVydHkiLCJWYWxpZGF0aW9uRXJyb3IiLCJyZXNvdXJjZSIsIl9yZXNvdXJjZSIsImZvcm1JZHgiLCJlcnJvcnMiLCJiYXNlT1JNIiwib3B0aW9ucyIsImV4dE9STSIsIlN0cmluZyIsImNvbm5lY3RlZCIsIndzIiwiaW5mbyIsIm9uTWVzc2FnZUpzb24iLCJvbk1lc3NhZ2VUZXh0IiwibWVzc2FnZSIsInNlbnREYXRhIiwid2FpdGluZ0Nvbm5lY3Rpb25zIiwiYXV0aF9ncm91cCIsIklEWCIsIlJFVklEWCIsImJ1aWxkZXJIYW5kbGVycyIsImJ1aWxkZXJIYW5kbGVyVXNlZCIsInBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiZXZlbnRIYW5kbGVycyIsInBlcm1pc3Npb25XYWl0aW5nIiwibW9kZWxDYWNoZSIsImZhaWxlZE1vZGVscyIsImxpbmtlciIsIndpbmRvdyIsInZhbGlkYXRpb25FdmVudCIsImN1cnJlbnRDb250ZXh0Iiwic2F2aW5nRXJyb3JIYW5sZGVyIiwiZ2V0SW5kZXgiLCJnZXRVbmxpbmtlZCIsIlVOTElOS0VEIiwiUGVybWlzc2lvblRhYmxlIiwia2xhc3MiLCJzYXZlIiwiY2IiLCJteVBlcm1zIiwiZ3JvdXBfaWQiLCJwZXJtaXNzaW9uTGlzdCIsInAiLCJwZXJtcyIsImFsbFBlcm1pc3Npb25zIiwiaW5kZXhPZiIsIm1ha2VNb2RlbENsYXNzIiwiX21vZGVsIiwicmVhZGFibGUiLCJ3cml0YWJsZSIsInByaXZhdGVBcmdzIiwibWVyZ2UiLCJmdW5jU3RyaW5nIiwiS2xhc3MiLCJyZWZfdHJhbnNsYXRpb25zIiwiaW52ZXJzZV9yZWZlcmVuY2VzIiwicmVmZXJlbnRzIiwiZmllbGRzT3JkZXIiLCJmaWVsZE9yZGVyIiwicmVwcmVzZW50YXRpb24iLCJkZWxldGUiLCJfcGVybWlzc2lvbnMiLCJhbGxfcGVybXMiLCJvYmplY3RfaWQiLCJncm91cGVkIiwidW5rbm93bl9ncm91cHMiLCJncm91cEJ5IiwibyIsImFzUmF3IiwiSUQiLCJhcmciLCJjb250ZXh0IiwiY29weSIsImFzciIsImNvbmNhdCIsInNhdmVNdWx0aSIsIm9iamVjdHMiLCJzY29wZSIsInJhdyIsImRlbGV0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsImNvZGUiLCJzYXZlUEEiLCJUIiwib28iLCJQQSIsIkZzIiwiZmllbGRJZHgiLCJ0YXAiLCJpbmRleEJ5Iiwid2lkZ2V0IiwicmVmIiwiZXh0X3JlZiIsImxvY2FsX3JlZiIsIndhcm4iLCJUeXBlRXJyb3IiLCJyZXZJbmRleCIsImhhc093blByb3BlcnR5Iiwib3B0cyIsImZpcnN0Iiwib21vZGVsTmFtZSIsInZhbGlkYXRvcnMiLCJ1bmxpbmtSZWZlcmVuY2UiLCJpbnN0YW5jZSIsImluc3RhbmNlcyIsIm9tb2RlbCIsImxpbmtSZWZlcmVuY2UiLCJyZWZzIiwiSU5ERVhfTTJNIiwiVzJQX1BPU1QiLCJfZXh0cmEiLCJUT09ORSIsIlRPTUFOWSIsIk1BTllUT01BTlkiLCJtb2RlbENsYXNzIiwiemlwIiwiZGVsZXRlZCIsIk1QQSIsInJlY29yZCIsIml0YWIiLCJ0YWJsZSIsImlrIiwibm5ldyIsInVwZGF0ZWQiLCJuZXdPYmplY3RzIiwibW9kZWxSZWZlcmVuY2VzIiwib2xkSXRlbSIsIm9sZENvcHkiLCJuZXdJdGVtIiwiTmFOIiwibm8iLCJ0b3RhbFJlc3VsdHMiLCJnb3RNMk0iLCJyb3ciLCJtIiwidmVyYiIsInRvZ2V0aGVyIiwic2VuZERhdGEiLCJHT1RfQUxMIiwiZ290TW9kZWwiLCJjYWNoZUtleSIsIm1vZGVsTm90Rm91bmQiLCJhZGRNb2RlbEhhbmRsZXIiLCJhZGRQZXJzaXN0ZW50QXR0cmlidXRlcyIsImF0dHJpYnV0ZXMiLCJhZGRQcm9wZXJ0eSIsInZhbCIsImthdHRyIiwic2V0IiwiYXR0cnMiLCJuZXdBdHRycyIsInF1ZXJ5IiwiZmlsdGVyRnVuY3Rpb24iLCJyZVdoZWVsT1JNIiwibG9naW5GdW5jIiwiJG9ybSIsImdldE1vZGVsIiwibW9kTmFtZSIsImdldExvZ2dlZFVzZXIiLCJ1c2VyIiwiJHNlbmRUb0VuZHBvaW50Il0sIm1hcHBpbmdzIjoiOzs7SUFBQSxhO0lBRUEsU0FBQUEsT0FBQSxHQUFBO0FBQUEsUUFDQSxLQUFBQyxRQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsUUFFQSxLQUFBQyxXQUFBLEdBQUEsRUFBQSxDQUZBO0FBQUEsSztJQUdBLEM7SUFFQUYsT0FBQSxDQUFBRyxTQUFBLENBQUFDLFVBQUEsR0FBQSxVQUFBQyxPQUFBLEVBQUE7QUFBQSxRQUNBLElBQUFDLFVBQUEsR0FBQUMsS0FBQSxDQUFBQyxJQUFBLENBQUFILE9BQUEsQ0FBQUksUUFBQSxFQUFBLENBQUEsQ0FEQTtBQUFBLFFBRUEsSUFBQSxDQUFBLENBQUFILFVBQUEsSUFBQSxLQUFBSixXQUFBLENBQUEsRUFBQTtBQUFBLFlBQ0EsS0FB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QW1TLFVBQUEsQ0FBQXJjLFNBQUEsQ0FBQTBjLGFBQUEsR0FBQSxZQUFBO0FBQUEsUUFDQSxJQUFBaGEsSUFBQSxHQUFBLElBQUEsQ0FEQTtBQUFBLFFBRUEsSUFBQSxLQUFBNlosSUFBQSxDQUFBMVMsVUFBQSxDQUFBUSxZQUFBLENBQUFlLE9BQUE7QUFBQSxZQUNBLE9BQUEsS0FBQXJJLEdBQUEsQ0FBQSxXQUFBLEVBQUEsS0FBQXdaLElBQUEsQ0FBQTFTLFVBQUEsQ0FBQVEsWUFBQSxDQUFBZSxPQUFBLENBQUEsQ0FEQTtBQUFBLGFBRUE7QUFBQSxZQUNBLE9BQUEsSUFBQW5ILE9BQUEsQ0FBQSxVQUFBQyxNQUFBLEVBQUFDLE1BQUEsRUFBQTtBQUFBLGdCQUNBekIsSUFBQSxDQUFBSCxJQUFBLENBQUEsV0FBQSxFQUFBLFVBQUFvYSxJQUFBLEVBQUE7QUFBQSxvQkFDQWphLElBQUEsQ0FBQUssR0FBQSxDQUFBLFdBQUEsRUFBQTRaLElBQUEsRUFBQS9VLElBQUEsQ0FBQTFELE1BQUEsRUFEQTtBQUFBLGlCQUFBLEVBREE7QUFBQSxhQUFBLENBQUEsQ0FEQTtBQUFBLFNBSkE7QUFBQSxLQUFBLEM7SUFhQW1ZLFVBQUEsQ0FBQXJjLFNBQUEsQ0FBQTRjLGVBQUEsR0FBQSxVQUFBaFosR0FBQSxFQUFBQyxJQUFBLEVBQUE7QUFBQSxRQUNBLE9BQUEsS0FBQTBZLElBQUEsQ0FBQTNSLEtBQUEsQ0FBQWhILEdBQUEsRUFBQUMsSUFBQSxDQUFBLENBREE7QUFBQSxLQUFBLEM7SUFJQXdZLFVBQUEsQ0FBQXJjLFNBQUEsQ0FBQXdMLEtBQUEsR0FBQSxVQUFBQyxRQUFBLEVBQUFDLFFBQUEsRUFBQTtBQUFBLFFBQ0EsT0FBQSxLQUFBNlEsSUFBQSxDQUFBMVMsVUFBQSxDQUFBMkIsS0FBQSxDQUFBQyxRQUFBLEVBQUFDLFFBQUEsQ0FBQSxDQURBO0FBQUEsS0FBQSxDIiwiZmlsZSI6InJ3dC5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gSGFuZGxlcigpe1xuICAgIHRoaXMuaGFuZGxlcnMgPSBbXTtcbiAgICB0aGlzLnN0ckhhbmRsZXJzID0ge307XG59O1xuXG5IYW5kbGVyLnByb3RvdHlwZS5hZGRIYW5kbGVyID0gZnVuY3Rpb24gKGhhbmRsZXIpe1xuICAgIHZhciBzdHJIYW5kbGVyID0gdXRpbHMuaGFzaChoYW5kbGVyLnRvU3RyaW5nKCkpO1xuICAgIGlmICghKHN0ckhhbmRsZXIgaW4gdGhpcy5zdHJIYW5kbGVycykpe1xuICAgICAgICB0aGlzLnN0ckhhbmRsZXJzW3N0ckhhbmRsZXJdID0gaGFuZGxlcjtcbiAgICAgICAgdGhpcy5oYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH1cbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApO1xuICAgIHRoaXMuaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihmdW5jKXtcbiAgICAgICAgZnVuYy5hcHBseShudWxsLGFyZ3MpO1xuICAgIH0pXG59O1xuSGFuZGxlci5wcm90b3R5cGUuaGFuZGxlQnkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgIHZhciB0aHMgPSBhcmd1bWVudHNbMF07XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KHRocyxhcmdzKTtcbiAgICB9KVxufTtcblxuXG5mdW5jdGlvbiBOYW1lZEV2ZW50TWFuYWdlciAoKXtcbiAgICB2YXIgZXZlbnRzID0ge307XG4gICAgdmFyIGhhbmRsZXJJZCA9IHt9O1xuICAgIHZhciBpZHhJZCA9IDA7XG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKG5hbWUsIGZ1bmMpe1xuICAgICAgICBpZiAoIShuYW1lIGluIGV2ZW50cykpe1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdID0gbmV3IEFycmF5KCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkID0gaWR4SWQgKys7XG4gICAgICAgIGV2ZW50c1tuYW1lXS5wdXNoKGZ1bmMpO1xuICAgICAgICBoYW5kbGVySWRbaWRdID0gZnVuYztcbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH07XG4gICAgdGhpcy5lbWl0ID0gZnVuY3Rpb24obmFtZSl7XG4gICAgICAgIGlmIChuYW1lIGluIGV2ZW50cyl7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKTtcbiAgICAgICAgICAgIGV2ZW50c1tuYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgICAgICBldmVudC5hcHBseShudWxsLGFyZ3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMudW5iaW5kID0gZnVuY3Rpb24oaGFuZGxlcil7XG4gICAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICAgIGlmIChoYW5kbGVyIGluIGhhbmRsZXJJZCl7XG4gICAgICAgICAgICB2YXIgZnVuYyA9IGhhbmRsZXJJZFtoYW5kbGVyICsgJyddO1xuICAgICAgICAgICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbiBpbiB2KXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZbbl0gPT09IGZ1bmMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWR4LnB1c2gobik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlkeC5yZXZlcnNlKCkuZm9yRWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgdi5zcGxpY2UoeCwxKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBoYW5kbGVySWRbaGFuZGxlcl07XG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENhbGwgZXZlbnQgb25jZVxuICAgICAqL1xuICAgIHRoaXMub25jZSA9IGZ1bmN0aW9uKGV2ZW50TmFtZSwgaGFuZGxlckZ1bmN0aW9uKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGhhbmRsZXIgPSB0aGlzLm9uKGV2ZW50TmFtZSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGhhbmRsZXJGdW5jdGlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgc2VsZi51bmJpbmQoaGFuZGxlcik7XG4gICAgICAgIH0pXG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2FjaGVkS2V5SWR4ID0gMDtcblxudmFyIG51bGxTdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICcnfTtcblxuZnVuY3Rpb24gbW9ja09iamVjdCgpe1xuICAgIHJldHVybiBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbih0YXJnZXQsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbmFtZSAgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSA9PT0gJ3RvU3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbFN0cmluZztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXRpbHMubW9jaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRbbmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG4vKlxudmFyICRQT1NUID0gZnVuY3Rpb24odXJsLCBkYXRhLCBjYWxsQmFjaywgZXJyb3JCYWNrLGhlYWRlcnMpe1xuICAgIHZhciBvcHRzID0ge1xuICAgICAgICBhY2NlcHRzIDogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICB1cmwgOiB1cmwsXG4gICAgICAgIGRhdGEgOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgZGF0YVR5cGUgOiAnanNvbicsXG4gICAgICAgIHN1Y2Nlc3MgOiBjYWxsQmFjayxcbiAgICAgICAgZXJyb3IgOiBlcnJvckJhY2ssXG4gICAgICAgIG1ldGhvZCA6ICdQT1NUJyxcbiAgICAgICAgY29udGVudFR5cGUgOiAnYXBwbGljYXRpb24vanNvbidcbiAgICB9O1xuICAgIGlmIChoZWFkZXJzKXtcbiAgICAgICAgb3B0cy5oZWFkZXJzID0gaGVhZGVycztcbiAgICAgICAgb3B0cy5jcm9zc0RvbWFpbiA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiAkLmFqYXgob3B0cyk7XG59XG5cblxuZnVuY3Rpb24gcmVXaGVlbENvbm5lY3Rpb24oZW5kUG9pbnQsIGdldExvZ2luKXtcbiAgICAvLyBtYWluIFxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmdldExvZ2luID0gZ2V0TG9naW47XG4gICAgdGhpcy5ldmVudHMgPSBuZXcgTmFtZWRFdmVudE1hbmFnZXIoKVxuICAgIHRoaXMuJFBPU1QgPSAkUE9TVC5iaW5kKHRoaXMpO1xuICAgIHRoaXMub3B0aW9ucyA9IHtlbmRQb2ludCA6IGVuZFBvaW50fTtcbiAgICB0aGlzLm9uID0gdGhpcy5ldmVudHMub24uYmluZCh0aGlzKTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbihzdGF0dXMsIGNhbGxCYWNrLCBlcnJvcikge1xuICAgIGlmIChzdGF0dXMpIHtcbiAgICAgICAgdmFyIGlzTG9nZ2VkID0gKHN0YXR1cy51c2VyX2lkICYmICF0aGlzLm9wdGlvbnMudXNlcl9pZCApO1xuICAgICAgICBmb3IgKHZhciB4IGluIHN0YXR1cyl7IHRoaXMub3B0aW9uc1t4XSA9IHN0YXR1c1t4XTsgfVxuICAgICAgICBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG4gICAgICAgIGlmIChpc0xvZ2dlZCkge1xuICAgICAgICAgICAgdGhpcy5ldmVudHMuZW1pdCgnbG9naW4nLCB0aGlzLm9wdGlvbnMudXNlcl9pZCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudXNlcl9pZCAmJiB0aGlzLmdldExvZ2luKXtcbiAgICAgICAgdmFyIGxvZ0luZm8gPSB0aGlzLmdldExvZ2luKGVycm9yKTtcbiAgICAgICAgaWYgKGxvZ0luZm8uY29uc3RydWN0b3IgPT09IE9iamVjdCl7XG4gICAgICAgICAgICB0aGlzLmxvZ2luKGxvZ0luZm8udXNlcm5hbWUsIGxvZ0luZm8ucGFzc3dvcmQpXG4gICAgICAgICAgICAudGhlbigoZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhzdGF0dXMsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgICAgICB9IGVsc2UgaWYgKGxvZ0luZm8uY29uc3RydWN0b3IgPT09IFByb21pc2UpIHtcbiAgICAgICAgICAgIGxvZ0luZm8udGhlbigoZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgICAgICB2YXIgeCA9IHRoaXMubG9naW4ob2JqLnVzZXJuYW1lLG9iai5wYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgdmFyIG1hbmFnZUVycm9yID0gKGZ1bmN0aW9uKGJhZCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKG51bGwsY2FsbEJhY2ssYmFkLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9KS5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgICAgIGlmIChjYWxsQmFjayl7XG4gICAgICAgICAgICAgICAgICAgIHgudGhlbihjYWxsQmFjayxtYW5hZ2VFcnJvcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgeC50aGVuKG51bGwsIG1hbmFnZUVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHRoaXMub3B0aW9ucyk7XG4gICAgfSAgICBcbn1cblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnN0YXR1cyA9IGZ1bmN0aW9uKGNhbGxCYWNrLCBmb3JjZSl7XG4gICAgaWYgKCgnbGFzdFJXVFN0YXR1cycgaW4gbG9jYWxTdG9yYWdlKSAmJiAhZm9yY2UpIHtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgdmFyIHN0YXR1cyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoc3RhdHVzLGNhbGxCYWNrKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdGF0dXMoY2FsbEJhY2ssIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYWxsQmFjayAmJiBjYWxsQmFjayhzdGF0dXMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fc3RhdHVzX2NhbGxpbmcpe1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLnN0YXR1cyhjYWxsQmFjayk7XG4gICAgICAgIH0sNTApO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy50aW1lc3RhbXApe1xuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayh0aGlzLm9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXR1c19jYWxsaW5nID0gdHJ1ZTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdCgnYXBpL3N0YXR1cycsbnVsbCxmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMgPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xuICAgICAgICAgICAgc2VsZi5fc3RhdHVzX2NhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHNlbGYudXBkYXRlU3RhdHVzKHN0YXR1cyxjYWxsQmFjayk7XG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgfVxufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLiRwb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLGNhbGxCYWNrKXtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIGlmICghZGF0YSl7XG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIHZhciBoZWFkZXJzID0geyBcbiAgICAgICAgICAgIHRva2VuIDogdGhpcy5vcHRpb25zLnRva2VuLFxuICAgICAgICAgICAgYXBwbGljYXRpb24gOiB0aGlzLm9wdGlvbnMuYXBwbGljYXRpb25cbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaGVhZGVycyA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5vcHRpb25zLmVuZFBvaW50ICsgdXJsLCBkYXRhLCB0aHMub3B0aW9ucy5hcHBsaWNhdGlvbiwgdGhzLm9wdGlvbnMudG9rZW4pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZScsIHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzICsgJy1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7IGNhbGxCYWNrKCB4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQgKX07XG4gICAgICAgICAgICAgICAgYWNjZXB0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItanNvbicsIHhoci5yZXNwb25zZURhdGEsIHhoci5zdGF0dXMsIHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1qc29uLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VEYXRhLHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1odHRwJyx4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItaHR0cC0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCl7XG4gICAgdmFyIHVybCA9IHRoaXMub3B0aW9ucy5lbmRQb2ludCArICdhcGkvbG9naW4nO1xuICAgIHZhciBjb25uZWN0aW9uID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih1cmwseyB1c2VybmFtZTogdXNlcm5hbWUsIHBhc3N3b3JkIDogcGFzc3dvcmR9LCBudWxsLGNvbm5lY3Rpb24ub3B0aW9ucy50b2tlbiwgdHJ1ZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbi51cGRhdGVTdGF0dXMoeGhyLnJlc3BvbnNlRGF0YSk7XG4gICAgICAgICAgICAgICAgYWNjZXB0KHN0YXR1cyk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKGNhbGxCYWNrKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHdzY29ubmVjdCA9IGZ1bmN0aW9uKHNlbGYpe1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbiA9IG5ldyB1dGlscy53c0Nvbm5lY3Qoc2VsZi5vcHRpb25zKTtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24ub25Db25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLmV2ZW50cy5lbWl0KCd3cy1jb25uZWN0ZWQnLCBzZWxmLndzQ29ubmVjdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbi5vbkRpc2Nvbm5lY3QoZnVuY3Rpb24oKXsgXG4gICAgICAgICAgICBpZiAoc2VsZi5vcHRpb25zICYmIHNlbGYub3B0aW9ucy5yZWFsdGltZUVuZFBvaW50KXtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHdzY29ubmVjdChzZWxmKTsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSwxMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0aGlzLnN0YXR1cygoZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgaWYgKCd0b2tlbicgaW4gc2VsZi5vcHRpb25zKXtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGluZyB0byAnICsgc2VsZi5vcHRpb25zLmVuZFBvaW50KTtcbiAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMudXNlcm5hbWUgJiYgc2VsZi5vcHRpb25zLnBhc3N3b3JkKXtcbiAgICAgICAgICAgICAgICBzZWxmLmxvZ2luKFxuICAgICAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucy5wYXNzd29yZCxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZW5ld2luZyBjb25uZWN0aW9uJylcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc2VsZi5vcHRpb25zLnRva2VuICYmIHNlbGYub3B0aW9ucy5yZWFsdGltZUVuZFBvaW50ICYmICghc2VsZi53c0Nvbm5lY3Rpb24pKXtcbiAgICAgICAgICAgIHdzY29ubmVjdChzZWxmKTtcbiAgICAgICAgfVxuICAgIH0pLmJpbmQodGhpcykpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ091dCA9IGZ1bmN0aW9uKHVybCwgY2FsbEJhY2spe1xuICAgIHJldHVybiB0aGlzLiRwb3N0KCdhcGkvbG9nb3V0Jyx7fSwoZnVuY3Rpb24oc3RhdHVzKSB7XG4gICAgICAgIGlmICgnbGFzdFJXVFN0YXR1cycgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0ge2VuZFBvaW50OiB0aGlzLm9wdGlvbnMuZW5kUG9pbnR9O1xuICAgICAgICBpZiAodGhpcy53c0Nvbm5lY3Rpb24pIHsgXG4gICAgICAgICAgICB0aGlzLndzQ29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24gPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cmwpIHsgbG9jYXRpb24gPSB1cmw7IH1cbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICB9KS5iaW5kKHRoaXMpKTtcbn1cbiovXG52YXIgdXRpbHMgPSB7XG4gICAgcmVuYW1lRnVuY3Rpb24gOiBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgICAgICAgcmV0dXJuIChuZXcgRnVuY3Rpb24oXCJyZXR1cm4gZnVuY3Rpb24gKGNhbGwpIHsgcmV0dXJuIGZ1bmN0aW9uIFwiICsgbmFtZSArXG4gICAgICAgICAgICBcIiAoKSB7IHJldHVybiBjYWxsKHRoaXMsIGFyZ3VtZW50cykgfTsgfTtcIikoKSkoRnVuY3Rpb24uYXBwbHkuYmluZChmbikpO1xuICAgIH0sXG4gICAgY2FjaGVkIDogZnVuY3Rpb24oZnVuYywga2V5KXtcbiAgICAgICAgaWYgKCFrZXkpeyAgICBcbiAgICAgICAgICAgIGtleSA9ICdfJyArIGNhY2hlZEtleUlkeCsrO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHdyYXBwZXIoKXtcbiAgICAgICAgICAgIGlmICghdGhpc1trZXldKXtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBmdW5jLmNhbGwodGhpcyxbYXJndW1lbnRzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpc1trZXldO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gd3JhcHBlcjtcbiAgICB9LFxuLy8gICAgJFBPU1QgOiAkUE9TVCxcbi8vICAgIHJlV2hlZWxDb25uZWN0aW9uOiByZVdoZWVsQ29ubmVjdGlvbixcbiAgICBsb2c6IGZ1bmN0aW9uKCl7IFxuICAgICAgICBjb25zb2xlLmxvZyhhcmd1bWVudHMpO1xuICAgIH0sXG5cbiAgICB4ZHI6IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGFwcGxpY2F0aW9uLHRva2VuLCBmb3JtRW5jb2RlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlIGFuIEhUVFAgUmVxdWVzdCBhbmQgcmV0dXJuIGl0cyBwcm9taXNlLlxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgcmVxO1xuICAgICAgICAgICAgaWYgKCFkYXRhKSB7IGRhdGEgPSB7fTt9XG5cbiAgICAgICAgICAgIGlmKFhNTEh0dHBSZXF1ZXN0KSB7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgICAgICAgICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2VEYXRhID0gSlNPTi5wYXJzZShyZXEucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZURhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlID0ge3Jlc3BvbnNlRGF0YTogcmVzcG9uc2VEYXRhLCByZXNwb25zZVRleHQ6IHJlcS5yZXNwb25zZVRleHQsc3RhdHVzOiByZXEuc3RhdHVzLCByZXF1ZXN0OiByZXF9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcS5zdGF0dXMgPj0gMjAwICYmIHJlcS5zdGF0dXMgPCA0MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihYRG9tYWluUmVxdWVzdCl7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFhEb21haW5SZXF1ZXN0KCk7XG4gICAgICAgICAgICAgICAgcmVxLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBhY2NlcHQocmVxLnJlc3BvbnNlVGV4dCxyZXEuc3RhdHVzVGV4dCwgcmVxKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdDT1JTIG5vdCBzdXBwb3J0ZWQnKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlcS5vcGVuKCdQT1NUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgICAgIHJlcS5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICAgIGlmICh0b2tlbikgeyBkYXRhLl9fdG9rZW5fXyA9IHRva2VuIH1cbiAgICAgICAgICAgIGlmICghZm9ybUVuY29kZSl7XG4gICAgICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ3RleHQvcGxhaW4nKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5zaXplKCk/SlNPTi5zdHJpbmdpZnkoZGF0YSk6Jyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBrICsgJz0nICsgZW5jb2RlVVJJKHYudG9TdHJpbmcoKSk7ICBcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCkuam9pbignJicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVxLnNlbmQoZGF0YSk7XG4gICAgLy8gICAgICAgIHJlcS5zZW5kKG51bGwpO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgY2FwaXRhbGl6ZSA6IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHJldHVybiBzWzBdLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgfSxcblxuICAgIGhhc2ggOiBmdW5jdGlvbihzdHIpe1xuICAgICAgICAvKipcbiAgICAgICAgICogSGFzaGVkIGZ1bmN0aW9uXG4gICAgICAgICAqL1xuICAgICAgICBzdHIgPSBzdHIudG9TdHJpbmcoKTtcbiAgICAgICAgdmFyIHJldCA9IDE7XG4gICAgICAgIGZvciAodmFyIHggPSAwO3g8c3RyLmxlbmd0aDt4Kyspe1xuICAgICAgICAgICAgcmV0ICo9ICgxICsgc3RyLmNoYXJDb2RlQXQoeCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAocmV0ICUgMzQ5NTgzNzQ5NTcpLnRvU3RyaW5nKCk7XG4gICAgfSxcblxuICAgIG1ha2VGaWx0ZXIgOiBmdW5jdGlvbiAobW9kZWwsIGZpbHRlciwgdW5pZmllciwgZG9udFRyYW5zbGF0ZUZpbHRlcikge1xuICAgICAgICAvKipcbiAgICAgICAgICogTWFrZSBmaWx0ZXIgZm9yIEFycmF5LmZpbHRlciBmdW5jdGlvbiBhcyBhbiBhbmQgb2Ygb3JcbiAgICAgICAgICovXG4gICAgICAgIGlmICghdW5pZmllcikgeyB1bmlmaWVyID0gJyAmJiAnO31cbiAgICAgICAgaWYgKExhenkoZmlsdGVyKS5zaXplKCkgPT09IDApe1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpeyByZXR1cm4gdHJ1ZSB9O1xuICAgICAgICB9XG4gICAgICAgIHZhciBzb3VyY2UgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHZhbHMsIGZpZWxkKXtcbiAgICAgICAgICAgIGlmICghdmFscykgeyB2YWxzID0gW251bGxdfVxuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHMpKXtcbiAgICAgICAgICAgICAgICB2YWxzID0gW3ZhbHNdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFkb250VHJhbnNsYXRlRmlsdGVyICYmIChtb2RlbC5maWVsZHNbZmllbGRdLnR5cGUgPT09ICdyZWZlcmVuY2UnKSkge1xuICAgICAgICAgICAgICAgIGZpZWxkID0gJ18nICsgZmllbGQ7XG4gICAgICAgICAgICAgICAgdmFscyA9IExhenkodmFscykubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoeCAmJiAoeC5jb25zdHJ1Y3RvciAhPT0gTnVtYmVyKSl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtb2RlbC5maWVsZHNbZmllbGRdLnR5cGUgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICB2YWxzID0gdmFscy5tYXAoSlNPTi5zdHJpbmdpZnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICcoJyArICBMYXp5KHZhbHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICBpZiAoIXgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignbWFrZUZpbHRlciB4IGlzIG51bGwnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYoeCA9PT0gb3JtLnV0aWxzLm1vY2spIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignbWFrZUZpbHRlciB3aXRoIE1vY2sgT2JqZWN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAnKHguJyArIGZpZWxkICsgJyA9PT0gJyArIHggKyAnKSc7XG4gICAgICAgICAgICB9KS5qb2luKCcgfHwgJykgICsnKSc7XG4gICAgICAgIH0pLnRvQXJyYXkoKS5qb2luKHVuaWZpZXIpO1xuICAgICAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKFwieFwiLCBcInJldHVybiBcIiArIHNvdXJjZSk7XG4gICAgfSxcblxuICAgIHNhbWVBcyA6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWVwIGVxdWFsXG4gICAgICAgICAqL1xuICAgICAgICBmb3IgKHZhciBrIGluIHgpIHtcbiAgICAgICAgICAgIGlmICh5W2tdICE9IHhba10pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBcbiAgICBwbHVyYWxpemUgOiBmdW5jdGlvbihzdHIsIG1vZGVsKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIExleGljYWxseSByZXR1cm5zIGVuZ2xpc2ggcGx1cmFsIGZvcm1cbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBzdHIgKyAncyc7XG4gICAgfSxcblxuICAgIGJlZm9yZUNhbGwgOiBmdW5jdGlvbihmdW5jLCBiZWZvcmUpe1xuICAgICAgICB2YXIgZGVjb3JhdG9yID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGJlZm9yZSgpLnRoZW4oZnVuYylcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGRlY29yYXRvcjtcbiAgICB9LFxuXG4gICAgY2xlYW5TdG9yYWdlIDogZnVuY3Rpb24oKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENsZWFuIGxvY2FsU3RvcmFnZSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIExhenkobG9jYWxTdG9yYWdlKS5rZXlzKCkuZWFjaChmdW5jdGlvbihrKXtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2Vba107XG4gICAgICAgIH0pXG4gICAgfSxcblxuICAgIGNsZWFuRGVzY3JpcHRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICBMYXp5KGxvY2FsU3RvcmFnZSlcbiAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24odiwgbikgeyByZXR1cm4gTGF6eShuKS5zdGFydHNXaXRoKCdkZXNjcmlwdGlvbjonKX0pXG4gICAgICAgICAgICAua2V5cygpXG4gICAgICAgICAgICAuZWFjaChmdW5jdGlvbihuKSB7IGRlbGV0ZSBsb2NhbFN0b3JhZ2Vbbl0gfSk7XG4gICAgfSxcbiAgICBcbiAgICByZXZlcnNlIDogZnVuY3Rpb24gKGNociwgc3RyKSB7XG4gICAgICAgIHJldHVybiBzdHIuc3BsaXQoY2hyKS5yZXZlcnNlKCkuam9pbihjaHIpO1xuICAgIH0sXG4gICAgcGVybXV0YXRpb25zOiBmdW5jdGlvbihhcnIpe1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGZvciAodmFyIHggPSBhcnIubGVuZ3RoLTE7IHggPj0gMDt4LS0pe1xuICAgICAgICAgICAgZm9yICh2YXIgeSA9IGFyci5sZW5ndGgtMTsgeSA+PSAwOyB5LS0pe1xuICAgICAgICAgICAgICAgIGlmICh4ICE9PSB5KVxuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChbYXJyW3hdLCBhcnJbeV1dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG5cbiAgICB3YWl0Rm9yOiBmdW5jdGlvbihmdW5jLCBjYWxsQmFjaykge1xuICAgICAgICB2YXIgd2FpdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoZnVuYygpKSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCh3YWl0ZXIsNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZXRUaW1lb3V0KHdhaXRlciwgNTAwKTtcbiAgICB9LFxuXG4gICAgYm9vbDogQm9vbGVhbixcblxuICAgIG5vb3AgOiBmdW5jdGlvbigpe30sXG5cbiAgICB0ek9mZnNldDogbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDAsXG5cbiAgICB0cmFuc0ZpZWxkVHlwZToge1xuICAgICAgICBkYXRlOiBmdW5jdGlvbih4KSB7IHJldHVybiBuZXcgRGF0ZSh4ICogMTAwMCArIHV0aWxzLnR6T2Zmc2V0ICkgfSxcbiAgICAgICAgZGF0ZXRpbWU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG5ldyBEYXRlKHggKiAxMDAwICsgdXRpbHMudHpPZmZzZXQgKSB9LFxuICAgICAgICBzdHJpbmc6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG9TdHJpbmcoKTsgfSxcbiAgICAgICAgdGV4dDogZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b1N0cmluZygpOyB9LFxuICAgICAgICBpbnRlZ2VyOiBmdW5jdGlvbih4KSB7IHJldHVybiBwYXJzZUludCh4KTsgfSxcbiAgICAgICAgZmxvYXQ6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBhcnNlRmxvYXQoeCk7IH1cbiAgICB9LCBcbiAgICBtb2NrIDogbW9ja09iamVjdCgpXG59O1xuXG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFNUQVRVU0tFWSA9ICdsYXN0UldUQ29ubmVjdGlvblN0YXR1cyc7XG5cbmZ1bmN0aW9uIFJlYWx0aW1lQ29ubmVjdGlvbihlbmRQb2ludCwgcnd0Q29ubmVjdGlvbil7XG4gICAgLyoqXG4gICAgICogQ29ubmVjdHMgYSB3ZWJzb2NrZXQgd2l0aCByZVdoZWVsIGNvbm5lY3Rpb25cbiAgICAgKi9cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgY29ubmVjdGlvbiA9IG5ldyBTb2NrSlMoZW5kUG9pbnQpO1xuICAgIGNvbm5lY3Rpb24ub25vcGVuID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ29wZW4gOiAnICsgeCk7XG4gICAgICAgIGNvbm5lY3Rpb24udGVuYW50KCk7XG4gICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtY29ubmVjdGlvbi1vcGVuJyx4KTtcbiAgICB9O1xuICAgIGNvbm5lY3Rpb24ub25tZXNzYWdlID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgaWYgKHgudHlwZSA9PSAnbWVzc2FnZScpIHtcbiAgICAgICAgICAgIC8vJC5ub3RpZnkoeC5kYXRhKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy9UT0RPIHNldCBmcm9tUmVhbHRpbWVcbiAgICAgICAgICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLW1lc3NhZ2UtanNvbicsIEpTT04ucGFyc2UoeC5kYXRhKSk7XG4gICAgICAgICAgICAgICAgLy9UT0RPIHVuc2V0IGZyb21SZWFsdGltZVxuICAgICAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1tZXNzYWdlLXRleHQnLCBKU09OLnBhcnNlKHguZGF0YSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Zyb20gcmVhbHRpbWUgJyx4KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzZXRUaW1lb3V0KHV0aWxzLndzQ29ubmVjdCwxMDAwKTtcbiAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1jb25uZWN0aW9uLWNsb3NlZCcpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi50ZW5hbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uc2VuZCgnVEVOQU5UOicgKyByd3RDb25uZWN0aW9uLmNhY2hlZFN0YXR1cy5hcHBsaWNhdGlvbiArICc6JyArIHJ3dENvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnRva2VuKTtcbiAgICB9XG4gICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgfVxufSAgICBcblxuZnVuY3Rpb24gcmVXaGVlbENvbm5lY3Rpb24oZW5kUG9pbnQsIGdldExvZ2luKXtcbiAgICAvKipcbiAgICAgKiBDb25uZWN0aW9uIGJhc2ljIGZvciByZVdoZWVsXG4gICAgICogQHBhcmFtIGVuZFBvaW50OiBzdHJpbmcgYmFzZSB1cmwgZm9yIGFsbCBjb211bmljYXRpb25cbiAgICAgKiBAcGFyYW0gZ2V0TG9naW46IGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBpbiBjYXNlIG9mIG1pc3NpbmcgbG9naW4uXG4gICAgICogIHRoaXMgZnVuY3Rpb24gY291bGQgcmV0dXJuIDpcbiAgICAgKiAgLSAgIGEgeyB1c2VybmFtZSA6IDx1c2VybmFtZT4gLCBwYXNzd29yZDogPHBhc3N3b3JkPn0gb3JcbiAgICAgKiAgLSAgIGIgUHJvbWlzZSAtPiB7IHVzZXJuYW1lIDogPHVzZXJuYW1lPiAsIHBhc3N3b3JkOiA8cGFzc3dvcmQ+fVxuICAgICAqL1xuICAgIC8vIG1haW4gaW5pdGlhbGl6YXRpb25cbiAgICB2YXIgZXZlbnRzID0gbmV3IE5hbWVkRXZlbnRNYW5hZ2VyKCk7XG4gICAgdGhpcy5nZXRMb2dpbiA9IGdldExvZ2luO1xuICAgIHRoaXMuZW5kUG9pbnQgPSBlbmRQb2ludC5lbmRzV2l0aCgnLycpPyBlbmRQb2ludDogKGVuZFBvaW50ICsgJy8nKTtcbiAgICB0aGlzLm9uID0gZXZlbnRzLm9uO1xuICAgIHRoaXMudW5iaW5kID0gZXZlbnRzLnVuYmluZDtcbiAgICB0aGlzLmVtaXQgPSBldmVudHMuZW1pdDtcbiAgICB0aGlzLm9uY2UgPSBldmVudHMub25jZTtcbiAgICB0aGlzLmNhY2hlZFN0YXR1cyA9IHt9O1xuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmlzTG9nZ2VkSW4gPSBmYWxzZTtcbiAgICAvLyByZWdpc3RlcmluZyB1cGRhdGUgc3RhdHVzXG4gICAgdmFyIHRocyA9IHRoaXM7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuJHBvc3QgPSBmdW5jdGlvbih1cmwsIGRhdGEsY2FsbEJhY2spe1xuICAgIC8qKlxuICAgICAqIEFKQVggY2FsbCBmb3IgZmV0Y2ggYWxsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAcGFyYW0gdXJsOiBsYXN0IHVybCBwYXJ0IGZvciBhamF4IGNhbGxcbiAgICAgKiBAcGFyYW0gZGF0YTogZGF0YSBvYmplY3QgdG8gYmUgc2VudFxuICAgICAqIEBwYXJhbSBjYWxsQmFjazogZnVuY3Rpb24oeGhyKSB3aWxsIGJlIGNhbGxlZCB3aGVuIGRhdGEgYXJyaXZlc1xuICAgICAqIEByZXR1cm5zIFByb21pc2U8eGhyPiBzYW1lIG9mIGNhbGxCYWNrXG4gICAgICovXG4gICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLmVuZFBvaW50ICsgdXJsLCBkYXRhLCB0aHMuY2FjaGVkU3RhdHVzLmFwcGxpY2F0aW9uLCB0aHMuY2FjaGVkU3RhdHVzLnRva2VuKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICB0aHMuZW1pdCgnaHR0cC1yZXNwb25zZScsIHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cyArICctanNvbicsIHhoci5yZXNwb25zZURhdGEsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYWxsQmFjaykgeyBjYWxsQmFjayggeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0ICl9O1xuICAgICAgICAgICAgICAgIGFjY2VwdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItanNvbicsIHhoci5yZXNwb25zZURhdGEsIHhoci5zdGF0dXMsIHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWpzb24tJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZURhdGEsdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItaHR0cCcseGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cyx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItaHR0cC0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbi8qKlxuICogQ2hlY2sgY3VycmVudCBzdGF0dXMgYW5kIGNhbGxiYWNrIGZvciByZXN1bHRzLlxuICogSXQgY2FjaGVzIHJlc3VsdHMgZm9yIGZ1cnRoZXIuXG4gKiBAcGFyYW0gY2FsbGJhY2s6IChzdGF0dXMgb2JqZWN0KVxuICogQHBhcmFtIGZvcmNlOiBib29sZWFuIGlmIHRydWUgZW1wdGllcyBjYWNoZSAgXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnN0YXR1cyA9IGZ1bmN0aW9uKGNhbGxCYWNrLCBmb3JjZSkge1xuICAgIC8vIGlmIGZvcmNlLCBjbGVhciBhbGwgY2FjaGVkIHZhbHVlc1xuICAgIHZhciBrZXkgPSAndG9rZW46JyArIHRoaXMuZW5kUG9pbnQ7XG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgaWYgKGZvcmNlKSB7XG4gICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzID0ge307XG4gICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2Vba2V5XTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3RhdHVzV2FpdGluZykge1xuICAgICAgICAvLyB3YWl0IGZvciBzdGF0dXNcbiAgICAgICAgdXRpbHMud2FpdEZvcihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAhdGhzLnN0YXR1c1dhaXRpbmc7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aHMuc3RhdHVzKGNhbGxCYWNrLGZvcmNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gdHJ5IGZvciB2YWx1ZSByZXNvbHV0aW9uXG4gICAgLy8gZmlyc3Qgb24gbWVtb3J5XG4gICAgaWYgKExhenkodGhpcy5jYWNoZWRTdGF0dXMpLnNpemUoKSl7XG4gICAgICAgIGNhbGxCYWNrKHRoaXMuY2FjaGVkU3RhdHVzKVxuICAgIC8vIHRoZW4gaW4gbG9jYWxTdG9yYWdlXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgaWYgKGtleSBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgIGRhdGEuX190b2tlbl9fID0gbG9jYWxTdG9yYWdlW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGF0dXNXYWl0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy4kcG9zdCgnYXBpL3N0YXR1cycsZGF0YSwgZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgIHRocy51cGRhdGVTdGF0dXMoc3RhdHVzKTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtrZXldID0gc3RhdHVzLnRva2VuO1xuICAgICAgICAgICAgY2FsbEJhY2soc3RhdHVzKTtcbiAgICAgICAgICAgIHRocy5zdGF0dXNXYWl0aW5nID0gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBkb2Vzbid0IGNhbGwgY2FsbGJhY2tcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNhbGxCYWNrKHRoaXMuY2FjaGVkU3RhdHVzKTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbihzdGF0dXMpe1xuICAgIHZhciBsYXN0QnVpbGQgPSBwYXJzZUZsb2F0KGxvY2FsU3RvcmFnZS5sYXN0QnVpbGQpIHx8IDE7XG4gICAgaWYgKGxhc3RCdWlsZCA8IHN0YXR1cy5sYXN0X2J1aWxkKXtcbiAgICAgICAgdXRpbHMuY2xlYW5EZXNjcmlwdGlvbigpO1xuICAgICAgICBsb2NhbFN0b3JhZ2UubGFzdEJ1aWxkID0gc3RhdHVzLmxhc3RfYnVpbGQ7XG4gICAgfVxuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBCb29sZWFuKHN0YXR1cy50b2tlbik7XG4gICAgdGhpcy5pc0xvZ2dlZEluID0gQm9vbGVhbihzdGF0dXMudXNlcl9pZCk7XG4gICAgdmFyIG9sZFN0YXR1cyA9IHRoaXMuY2FjaGVkU3RhdHVzO1xuICAgIHRoaXMuY2FjaGVkU3RhdHVzID0gc3RhdHVzO1xuICAgIGlmICghb2xkU3RhdHVzLnVzZXJfaWQgJiYgc3RhdHVzLnVzZXJfaWQpe1xuICAgICAgICB0aGlzLmVtaXQoJ2xvZ2dlZC1pbicsc3RhdHVzLnVzZXJfaWQpO1xuICAgIH0gZWxzZSBpZiAob2xkU3RhdHVzLnVzZXJfaWQgJiYgIXN0YXR1cy51c2VyX2lkKXtcbiAgICAgICAgdGhpcy5lbWl0KCdsb2dnZWQtb3V0Jyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzQ29ubmVjdGVkICYmICF0aGlzLmlzTG9nZ2VkSW4pe1xuICAgICAgICB0aGlzLmVtaXQoJ2xvZ2luLXJlcXVpcmVkJyk7XG4gICAgICAgIGlmICh0aGlzLmdldExvZ2luKXtcbiAgICAgICAgICAgIHZhciBsb2dpbkluZm8gPSB0aGlzLmdldExvZ2luKCk7XG4gICAgICAgICAgICBpZiAobG9naW5JbmZvLmNvbnN0cnVjdG9yID09PSBPYmplY3Qpe1xuICAgICAgICAgICAgICAgIHRoaXMubG9naW4obG9naW5JbmZvLnVzZXJuYW1lLCBsb2dpbkluZm8ucGFzc3dvcmQsIGxvZ2luSW5mby5jYWxsQmFjayk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxvZ2luSW5mby5jb25zdHJ1Y3RvciA9PT0gUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIGxvZ2luSW5mby50aGVuKGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9naW4ob2JqLnVzZXJuYW1lLCBvYmoucGFzc3dvcmQsIG9iai5jYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyByZWFsdGltZSBjb25uZWN0aW9uIGlzIHNldHRlZFxuICAgIGlmICghb2xkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQgJiYgc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24gPSBuZXcgUmVhbHRpbWVDb25uZWN0aW9uKHN0YXR1cy5yZWFsdGltZUVuZFBvaW50LCB0aGlzKTtcbiAgICAvLyByZWFsdGltZSBjb25uZWN0aW9uIGlzIGNsb3NlZFxuICAgIH0gZWxzZSBpZiAob2xkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQgJiYgIXN0YXR1cy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgIHRoaXMud3NDb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLndzQ29ubmVjdGlvbjtcbiAgICB9XG4gICAgdGhpcy5lbWl0KCd1cGRhdGUtY29ubmVjdGlvbi1zdGF0dXMnLCBzdGF0dXMsIG9sZFN0YXR1cyk7XG4gICAgbG9jYWxTdG9yYWdlW1NUQVRVU0tFWV0gPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xufVxuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIC8qKlxuICAgICAqIG1ha2UgbG9naW4gYW5kIHJldHVybiBhIHByb21pc2UuIElmIGxvZ2luIHN1Y2NlZCwgcHJvbWlzZSB3aWxsIGJlIGFjY2VwdGVkXG4gICAgICogSWYgbG9naW4gZmFpbHMgcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGggZXJyb3JcbiAgICAgKiBAcGFyYW0gdXNlcm5hbWU6IHVzZXJuYW1lXG4gICAgICogQHBhcmFtIHBhc3N3b3JkOiBwYXNzd29yZFxuICAgICAqIEByZXR1cm4gUHJvbWlzZSAodXNlciBvYmplY3QpXG4gICAgICovXG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5lbmRQb2ludCArICdhcGkvbG9naW4nLCB7dXNlcm5hbWU6IHVzZXJuYW1lIHx8ICcnLCBwYXNzd29yZDogcGFzc3dvcmQgfHwgJyd9LG51bGwsdGhzLmNhY2hlZFN0YXR1cy50b2tlbiwgdHJ1ZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIHN0YXR1c1xuICAgICAgICAgICAgICAgIHRocy51cGRhdGVTdGF0dXMoeGhyLnJlc3BvbnNlRGF0YSk7XG4gICAgICAgICAgICAgICAgLy8gY2FsbCB3aXRoIHVzZXIgaWRcbiAgICAgICAgICAgICAgICBhY2NlcHQoe3N0YXR1cyA6ICdzdWNjZXNzJywgdXNlcmlkOiB0aHMuY2FjaGVkU3RhdHVzLnVzZXJfaWR9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIC8vIGlmIGVycm9yIGNhbGwgZXJyb3IgbWFuYWdlciB3aXRoIGVycm9yXG4gICAgICAgICAgICAgICAgYWNjZXB0KHtlcnJvcjogeGhyLnJlc3BvbnNlRGF0YS5lcnJvciwgc3RhdHVzOiAnZXJyb3InfSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dvdXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCkge1xuICAgICAgICB0aHMuJHBvc3QoJ2FwaS9sb2dvdXQnKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ob2spe1xuICAgICAgICAgICAgICAgIHRocy51cGRhdGVTdGF0dXMoe30pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2VbU1RBVFVTS0VZXTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoKVxuICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICB9KTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oY2FsbEJhY2spIHtcbiAgICBpZiAodGhpcy5pc0xvZ2dlZEluKSB7XG4gICAgICAgIGNhbGxCYWNrKHRoaXMuY2FjaGVkU3RhdHVzLnVzZXJfaWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHdhaXQgZm9yIGxvZ2luXG4gICAgICAgIHRoaXMub25jZSgnbG9nZ2VkLWluJyxmdW5jdGlvbih1c2VyX2lkKXtcbiAgICAgICAgICAgIGNhbGxCYWNrKHVzZXJfaWQpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5zdGF0dXMoY2FsbEJhY2sgfHwgdXRpbHMubm9vcCk7XG4gICAgfVxufVxuXG51dGlscy5yZVdoZWVsQ29ubmVjdGlvbiA9IHJlV2hlZWxDb25uZWN0aW9uOyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVG91Y2hlcigpe1xuICAgIHZhciB0b3VjaGVkID0gZmFsc2VcbiAgICB0aGlzLnRvdWNoID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdG91Y2hlZCA9IHRydWU7XG4gICAgfTtcbiAgICB0aGlzLnRvdWNoZWQgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdCA9IHRvdWNoZWQ7XG4gICAgICAgIHRvdWNoZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHQ7XG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5cbmZ1bmN0aW9uIFZhY3V1bUNhY2hlcih0b3VjaCwgYXNrZWQsIG5hbWUsIHBrSW5kZXgpe1xuLypcbiAgICBpZiAobmFtZSl7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnY3JlYXRlZCBWYWN1dW1DYWNoZXIgYXMgJyArIG5hbWUpO1xuICAgIH1cbiovXG4gICAgaWYgKCFhc2tlZCl7XG4gICAgICAgIHZhciBhc2tlZCA9IFtdO1xuICAgIH1cbiAgICB2YXIgbWlzc2luZyA9IFtdO1xuICAgIFxuICAgIHRoaXMuYXNrID0gZnVuY3Rpb24gKGlkLGxhenkpe1xuICAgICAgICBpZiAocGtJbmRleCAmJiAoaWQgaW4gcGtJbmRleC5zb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFMYXp5KGFza2VkKS5jb250YWlucyhpZCkpe1xuLy8gICAgICAgICAgICBjb25zb2xlLmluZm8oJ2Fza2luZyAoJyArIGlkICsgJykgZnJvbSAnICsgbmFtZSk7XG4gICAgICAgICAgICBtaXNzaW5nLnB1c2goaWQpO1xuICAgICAgICAgICAgaWYgKCFsYXp5KVxuICAgICAgICAgICAgICAgIGFza2VkLnB1c2goaWQpO1xuICAgICAgICAgICAgdG91Y2gudG91Y2goKTtcbiAgICAgICAgfSBcbi8vICAgICAgICBlbHNlIGNvbnNvbGUud2FybignKCcgKyBpZCArICcpIHdhcyBqdXN0IGFza2VkIG9uICcgKyBuYW1lKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRBc2tlZEluZGV4ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIGFza2VkO1xuICAgIH1cblxuICAgIHRoaXMubWlzc2luZ3MgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gTGF6eShtaXNzaW5nLnNwbGljZSgwLG1pc3NpbmcubGVuZ3RoKSkudW5pcXVlKCkudG9BcnJheSgpO1xuICAgIH1cbn1cbiIsImZ1bmN0aW9uIEF1dG9MaW5rZXIoYWN0aXZlcywgSURCLCBXMlBSRVNPVVJDRSwgbGlzdENhY2hlKXtcbiAgICB2YXIgdG91Y2ggPSBuZXcgVG91Y2hlcigpO1xuICAgIHZhciBtYWluSW5kZXggPSB7fTtcbiAgICB2YXIgZm9yZWlnbktleXMgPSB7fTtcbiAgICB2YXIgbTJtID0ge307XG4gICAgdmFyIG0ybUluZGV4ID0ge307XG4gICAgdmFyIHBlcm1pc3Npb25zID0ge307XG4gICAgdGhpcy5tYWluSW5kZXggPSBtYWluSW5kZXg7XG4gICAgdGhpcy5mb3JlaWduS2V5cyA9IGZvcmVpZ25LZXlzO1xuICAgIHRoaXMubTJtID0gbTJtO1xuICAgIHRoaXMubTJtSW5kZXggPSBtMm1JbmRleDtcbiAgICB0aGlzLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG5cbiAgICBXMlBSRVNPVVJDRS5vbignbW9kZWwtZGVmaW5pdGlvbicsZnVuY3Rpb24obW9kZWwsIGluZGV4KXtcbiAgICAgICAgLy8gZGVmaW5pbmcgYWxsIGluZGV4ZXMgZm9yIHByaW1hcnkga2V5XG4gICAgICAgIHZhciBwa0luZGV4ID0gbGlzdENhY2hlLmdldEluZGV4Rm9yKG1vZGVsLm5hbWUsICdpZCcpO1xuICAgICAgICBtYWluSW5kZXhbbW9kZWwubmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBwa0luZGV4LCAnbWFpbkluZGV4LicgKyBtb2RlbC5uYW1lLCBpbmRleCk7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGluZyBwZXJtaXNzaW9uIGluZGV4ZXNcbiAgICAgICAgcGVybWlzc2lvbnNbbW9kZWwubmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsICdwZXJtaXNzaW9ucy4nICsgbW9kZWwubmFtZSk7XG5cbiAgICAgICAgLy8gY3JlYXRpbmcgaW5kZXhlcyBmb3IgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbihyZWZlcmVuY2Upe1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsLm5hbWUgKyAnXycgKyByZWZlcmVuY2UuaWQ7XG4gICAgICAgICAgICBmb3JlaWduS2V5c1tpbmRleE5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgbGlzdENhY2hlLmdldEluZGV4Rm9yKHJlZmVyZW5jZS50bywgJ2lkJyksIHJlZmVyZW5jZS50byArICcuaWQgZm9yZWlnbktleXMuJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBjcmVhdGluZyByZXZlcnNlIGZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZWRCeSkuZWFjaChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gZmllbGQuYnkgKyAnLicgKyBmaWVsZC5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IoZmllbGQuYnksZmllbGQuaWQpLCBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkICsgJyBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgICAgICAgICBpZiAoIShyZWxhdGlvbi5pbmRleE5hbWUgaW4gbTJtKSlcbiAgICAgICAgICAgICAgICBtMm1bcmVsYXRpb24uaW5kZXhOYW1lXSA9IFtuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsJ20ybS4nICsgcmVsYXRpb24uaW5kZXhOYW1lICsgJ1swXScpLCBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsJ20ybS4nICsgcmVsYXRpb24uaW5kZXhOYW1lKydbMV0nKV07XG4gICAgICAgICAgICBpZiAoIShyZWxhdGlvbi5pbmRleE5hbWUgaW4gbTJtSW5kZXgpKVxuICAgICAgICAgICAgICAgIG0ybUluZGV4W3JlbGF0aW9uLmluZGV4TmFtZV0gPSBuZXcgTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIG0ybUdldCA9IGZ1bmN0aW9uKGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgY2FsbEJhY2spe1xuICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCgobiA/IHV0aWxzLnJldmVyc2UoJy8nLCBpbmRleE5hbWUpIDogaW5kZXhOYW1lKSArICdzJyArICcvbGlzdCcsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW2luZGV4TmFtZV1cbiAgICAgICAgfSk7ICAgICAgICBcbiAgICB9O1xuXG4gICAgdmFyIGdldE0yTSA9IGZ1bmN0aW9uKGluZGV4TmFtZSwgY29sbGVjdGlvbiwgbiwgY2FsbEJhY2spe1xuICAgICAgICAvLyBhc2sgYWxsIGl0ZW1zIGluIGNvbGxlY3Rpb24gdG8gbTJtIGluZGV4XG4gICAgICAgIExhenkoY29sbGVjdGlvbikuZWFjaChtMm1baW5kZXhOYW1lXVtuXS5hc2suYmluZChtMm1baW5kZXhOYW1lXVtuXSkpO1xuICAgICAgICAvLyByZW5ld2luZyBjb2xsZWN0aW9uIHdpdGhvdXQgYXNrZWRcbiAgICAgICAgY29sbGVjdGlvbiA9IG0ybVtpbmRleE5hbWVdW25dLm1pc3NpbmdzKCk7XG4gICAgICAgIC8vIGNhbGxpbmcgcmVtb3RlIGZvciBtMm0gY29sbGVjdGlvbiBpZiBhbnlcbiAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgIGFjdGl2ZXNbaW5kZXhOYW1lXSA9IDE7XG4gICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLmdldE0yTSA9IGdldE0yTTtcblxuICAgIHZhciBsaW5rVW5saW5rZWQgPSBmdW5jdGlvbigpe1xuICAgICAgICAvLyBwZXJmb3JtIGEgRGF0YUJhc2Ugc3luY2hyb25pemF0aW9uIHdpdGggc2VydmVyIGxvb2tpbmcgZm9yIHVua25vd24gZGF0YVxuICAgICAgICBpZiAoIXRvdWNoLnRvdWNoZWQoKSkgcmV0dXJuO1xuICAgICAgICBpZiAoTGF6eShhY3RpdmVzKS52YWx1ZXMoKS5zdW0oKSkge1xuICAgICAgICAgICAgdG91Y2gudG91Y2goKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihpbmRleGVzLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgTGF6eShpbmRleGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCxuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSBMYXp5KGNvbGxlY3Rpb24pLmZpbHRlcihCb29sZWFuKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjb2xsZWN0aW9uLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBJTkRFWCA9IG0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBnZXR0ZXIgPSBJTkRFWFsnZ2V0JyArICgxIC0gbildLmJpbmQoSU5ERVgpO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbTJtR2V0KGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gY29sbGVjdGlvbi5tYXAoZ2V0dGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgb3RoZXJJbmRleCA9IGluZGV4TmFtZS5zcGxpdCgnLycpWzEgLSBuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShvdGhlckluZGV4LGZ1bmN0aW9uKCl7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShpZHMpLmZsYXR0ZW4oKS51bmlxdWUoKS5lYWNoKG1haW5JbmRleFtvdGhlckluZGV4XS5hc2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYWluSW5kZXhbb3RoZXJJbmRleF0uYXNrKHgsdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIExhenkobWFpbkluZGV4KS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaWRzID0gaW5kZXgubWlzc2luZ3MoKTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIGlkYiA9IG1vZGVsTmFtZSBpbiBJREIgPyBJREJbbW9kZWxOYW1lXS5rZXlzKCkgOiBMYXp5KCk7XG4gICAgICAgICAgICAgICAgLy9sb2coJ2xpbmtpbmcuJyArIG1vZGVsTmFtZSArICcgPSAnICsgVzJQUkVTT1VSQ0UubGlua2luZy5zb3VyY2VbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lLCB7aWQ6IGlkc30sbnVsbCx1dGlscy5ub29wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KGZvcmVpZ25LZXlzKVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICByZXR1cm4gW2ssIHYubWlzc2luZ3MoKV1cbiAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uKHYpe1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGlkcyA9IHhbMV07XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0geFswXTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGluZGV4TmFtZS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgdmFyIG1haW5SZXNvdXJjZSA9IGluZGV4WzBdO1xuICAgICAgICAgICAgdmFyIGZpZWxkTmFtZSA9IGluZGV4WzFdO1xuICAgICAgICAgICAgdmFyIGZpbHRlciA9IHt9O1xuICAgICAgICAgICAgZmlsdGVyW2ZpZWxkTmFtZV0gPSBpZHM7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtYWluUmVzb3VyY2UsIGZpbHRlcik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgTGF6eShMYXp5KHBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIHJldHVybiB2WzFdLmxlbmd0aFxuICAgICAgICB9KS50b09iamVjdCgpKS5lYWNoKGZ1bmN0aW9uIChpZHMsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgYWN0aXZlc1tyZXNvdXJjZU5hbWVdID0gMTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChyZXNvdXJjZU5hbWUgKyAnL215X3Blcm1zJywge2lkczogTGF6eShpZHMpLnVuaXF1ZSgpLnRvQXJyYXkoKX0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdFBlcm1pc3Npb25zKGRhdGEuUEVSTUlTU0lPTlMpO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYWN0aXZlc1tyZXNvdXJjZU5hbWVdXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzZXRJbnRlcnZhbChsaW5rVW5saW5rZWQsNTApO1xufTtcblxuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gTGlzdENhY2hlcigpe1xuICAgIHZhciBnb3RBbGwgPSB7fTtcbiAgICB2YXIgYXNrZWQgPSB7fTsgLy8gbWFwIG9mIGFycmF5XG4gICAgdmFyIGNvbXBvc2l0ZUFza2VkID0ge307XG4gICAgdmFyIGNhcnRlc2lhblByb2R1Y3QxID0gZnVuY3Rpb24oeCx5LGlzQXJyYXkpe1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGlmIChpc0FycmF5KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhIGluIHgpe1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGIgaW4geSl7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKExhenkoW3hbYV0seVtiXV0pLmZsYXR0ZW4oKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4geCl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYiBpbiB5KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goW3hbYV0seVtiXV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgdmFyIGNhcnRlc2lhblByb2R1Y3QgPSBmdW5jdGlvbihhcnIpe1xuICAgICAgICB2YXIgaXNBcnJheSA9IGZhbHNlO1xuICAgICAgICB2YXIgcmV0ID0gYXJyWzBdOyBcbiAgICAgICAgZm9yICh2YXIgeCA9IDE7IHggPCBhcnIubGVuZ3RoOyArK3gpe1xuICAgICAgICAgICAgcmV0ID0gY2FydGVzaWFuUHJvZHVjdDEocmV0LCBhcnJbeF0sIGlzQXJyYXkpO1xuICAgICAgICAgICAgaXNBcnJheSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gICAgdmFyIGV4cGxvZGVGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgdmFyIHByb2R1Y3QgPSBjYXJ0ZXNpYW5Qcm9kdWN0KExhenkoZmlsdGVyKS52YWx1ZXMoKS50b0FycmF5KCkpO1xuICAgICAgICB2YXIga2V5cyA9IExhenkoZmlsdGVyKS5rZXlzKCkudG9BcnJheSgpO1xuICAgICAgICByZXR1cm4gcHJvZHVjdC5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YXIgciA9IHt9O1xuICAgICAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGEsbil7XG4gICAgICAgICAgICAgICAgclthXSA9IHhbbl07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9O1xuICAgIHZhciBmaWx0ZXJTaW5nbGUgPSBmdW5jdGlvbihtb2RlbCwgZmlsdGVyLCB0ZXN0T25seSl7XG4gICAgICAgIC8vIExhenkgYXV0byBjcmVhdGUgaW5kZXhlc1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gbW9kZWwubW9kZWxOYW1lO1xuICAgICAgICB2YXIgZ2V0SW5kZXhGb3IgPSB0aGlzLmdldEluZGV4Rm9yO1xuICAgICAgICB2YXIga2V5cyA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odixrZXkpeyByZXR1cm4gW2tleSwgbW9kZWxOYW1lICsgJy4nICsga2V5XTsgfSkudG9PYmplY3QoKTtcbiAgICAgICAgdmFyIGluZGV4ZXMgPSBMYXp5KGZpbHRlcikua2V5cygpLm1hcChmdW5jdGlvbihrZXkpeyByZXR1cm4gW2tleSwgZ2V0SW5kZXhGb3IobW9kZWxOYW1lLCBrZXkpXX0pLnRvT2JqZWN0KCk7IFxuICAgICAgICAvLyBmYWtlIGZvciAoaXQgd2lsbCBjeWNsZSBvbmNlKVxuICAgICAgICBmb3IgKHZhciB4IGluIGZpbHRlcil7XG4gICAgICAgICAgICAvLyBnZXQgYXNrZWQgaW5kZXggYW5kIGNoZWNrIHByZXNlbmNlXG4gICAgICAgICAgICB2YXIgZGlmZmVyZW5jZSA9IExhenkoZmlsdGVyW3hdKS5kaWZmZXJlbmNlKGluZGV4ZXNbeF0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIGlmIChkaWZmZXJlbmNlLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgLy8gZ2VuZXJhdGUgbmV3IGZpbHRlclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBMYXp5KFtbeCwgZGlmZmVyZW5jZV1dKS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIC8vIHJlbWVtYmVyIGFza2VkXG4gICAgICAgICAgICAgICAgaWYgKCF0ZXN0T25seSlcbiAgICAgICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoaW5kZXhlc1t4XSwgZGlmZmVyZW5jZSk7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6JyArIEpTT04uc3RyaW5naWZ5KHJldCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZSBmaWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSArICdcXG5PdXQgOiBudWxsJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNsZWFuQ29tcG9zaXRlcyA9IGZ1bmN0aW9uKG1vZGVsLGZpbHRlcil7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBjbGVhbiBjb21wb3NpdGVBc2tlZFxuICAgICAgICAgKi9cbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29uZGl0aW9uYWwgYXNrZWQgaW5kZXhcbiAgICAgICAgaWYgKCEobW9kZWwubmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpIHsgY29tcG9zaXRlQXNrZWRbbW9kZWwubmFtZV0gPSBbXSB9O1xuICAgICAgICB2YXIgaW5kZXggPSBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXTtcbiAgICAgICAgLy8gc2VhcmNoIGZvciBhbGwgZWxlbWVudHMgd2hvIGhhdmUgc2FtZSBwYXJ0aWFsXG4gICAgICAgIHZhciBmaWx0ZXJMZW4gPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICB2YXIgaXRlbXMgPSBpbmRleC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnICYmICcsdHJ1ZSkpLmZpbHRlcihmdW5jdGlvbihpdGVtKXsgTGF6eShpdGVtKS5zaXplKCkgPiBmaWx0ZXJMZW4gfSk7XG4vLyAgICAgICAgY29uc29sZS5sb2coJ2RlbGV0aW5nIDonICsgSlNPTi5zdHJpbmdpZnkoaXRlbXMpKTtcbiAgICB9O1xuXG4gICAgdGhpcy5maWx0ZXIgPSBmdW5jdGlvbihtb2RlbCwgZmlsdGVyKXtcbi8vICAgICAgICBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0tLS0tXFxuZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikpO1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gbW9kZWwubW9kZWxOYW1lO1xuXG4gICAgICAgIC8vIGlmIHlvdSBmZXRjaCBhbGwgb2JqZWN0cyBmcm9tIHNlcnZlciwgdGhpcyBtb2RlbCBoYXMgdG8gYmUgbWFya2VkIGFzIGdvdCBhbGw7XG4gICAgICAgIHZhciBmaWx0ZXJMZW4gID0gTGF6eShmaWx0ZXIpLnNpemUoKTtcbiAgICAgICAgc3dpdGNoIChmaWx0ZXJMZW4pIHtcbiAgICAgICAgICAgIGNhc2UgMCA6IHtcbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gbnVsbCBvciBhbGxcbiAgICAgICAgICAgICAgICB2YXIgZ290ID0gZ290QWxsW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgZ290QWxsW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gYXNrZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYXNrZWRbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb3V0IDogbnVsbCAoZ290IGFsbCknKTtcbiAgICAgICAgICAgICAgICAvLyBjb25kaXRpb25hbCBjbGVhblxuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gY29tcG9zaXRlQXNrZWQpeyBcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChnb3QpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgMSA6IHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gZmlsdGVyU2luZ2xlLmNhbGwodGhpcywgbW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICAgICAgY2xlYW5Db21wb3NpdGVzLmNhbGwodGhpcywgbW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdmFyIHNpbmdsZSA9IExhenkoZmlsdGVyKS5rZXlzKCkuc29tZShmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciBmID0ge307XG4gICAgICAgICAgICBmW2tleV0gPSBmaWx0ZXJba2V5XTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXJTaW5nbGUuY2FsbCh0aHMsIG1vZGVsLCBmLCB0cnVlKSA9PSBudWxsO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHNpbmdsZSkgeyByZXR1cm4gbnVsbCB9XG4gICAgICAgIC8vIGxhenkgY3JlYXRlIGNvbXBvc2l0ZUFza2VkXG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpeyBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgLy8gZXhwbG9kZSBmaWx0ZXJcbiAgICAgICAgdmFyIGV4cGxvZGVkID0gZXhwbG9kZUZpbHRlcihmaWx0ZXIpO1xuICAgICAgICAvLyBjb2xsZWN0IHBhcnRpYWxzXG4gICAgICAgIHZhciBwYXJ0aWFscyA9IGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0uZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlciwgJyB8fCAnLHRydWUpKTtcbiAgICAgICAgLy8gY29sbGVjdCBtaXNzaW5ncyAoZXhwbG9kZWQgLSBwYXJ0aWFscylcbiAgICAgICAgaWYgKHBhcnRpYWxzLmxlbmd0aCl7XG4gICAgICAgICAgICB2YXIgYmFkICA9IFtdO1xuICAgICAgICAgICAgLy8gcGFydGlhbCBkaWZmZXJlbmNlXG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIHBhcnRpYWxzKXtcbiAgICAgICAgICAgICAgICBiYWQucHVzaC5hcHBseShiYWQsZXhwbG9kZWQuZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIHBhcnRpYWxzW3hdLCcgJiYgJywgdHJ1ZSkpKTtcbiAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgY29uc29sZS5sb2coJ2V4cGxvZGVkIC0gcGFydGlhbCA6ICcgKyBKU09OLnN0cmluZ2lmeShiYWQpKTtcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IExhenkoZXhwbG9kZWQpLmRpZmZlcmVuY2UoYmFkKS50b0FycmF5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBleHBsb2RlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZpbHRlciBwYXJ0aWFsc1xuICAgICAgICBpZiAobWlzc2luZ3MubGVuZ3RoKXtcbiAgICAgICAgICAgIGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0ucHVzaC5hcHBseShjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLG1pc3NpbmdzKTtcbiAgICAgICAgICAgIC8vIGFnZ3JlZ2F0ZSBtaXNzaW5nc1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gTGF6eShmaWx0ZXIpLmtleXMoKS5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gTGF6eShtaXNzaW5ncykucGx1Y2soa2V5KS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtrZXksIHJldC5sZW5ndGg/cmV0OmZpbHRlcltrZXldXTtcbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdXQgOiAnICsgSlNPTi5zdHJpbmdpZnkobWlzc2luZ3MpKTtcbiAgICAgICAgICAgIC8vIGNsZWFuIGNvbmRpdGlvbmFsXG4gICAgICAgICAgICBjbGVhbkNvbXBvc2l0ZXMobW9kZWwsIG1pc3NpbmdzKTtcbiAgICAgICAgICAgIHJldHVybiBtaXNzaW5ncztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRJbmRleEZvciA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmllbGROYW1lKXtcbiAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsTmFtZSArICcuJyArIGZpZWxkTmFtZTtcbiAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIGFza2VkKSl7XG4gICAgICAgICAgICBhc2tlZFtpbmRleE5hbWVdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFza2VkW2luZGV4TmFtZV07XG4gICAgfVxufTsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1hbnlUb01hbnlSZWxhdGlvbihyZWxhdGlvbixtMm0pe1xuICAgIHZhciBpdGVtcyA9IFtdO1xuICAgIHRoaXMuYWRkID0gaXRlbXMucHVzaC5iaW5kKGl0ZW1zKTtcbiAgICB0aGlzLmFkZCA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAvLyAgICAgIGNvbnNvbGUubG9nKCdhZGRpbmcgJyArIGl0ZW0pO1xuICAgICAgICBpZiAoIShMYXp5KGl0ZW1zKS5maW5kKGl0ZW0pKSl7XG4gICAgICAgICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5nZXQwID0gZnVuY3Rpb24oaWQpe1xuICAgICAgICBtMm1bMV0uYXNrKGlkKTtcbiAgICAgICAgcmV0dXJuIExhenkoaXRlbXMpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHJldHVybiB4WzBdID09PSBpZDtcbiAgICAgICAgfSkucGx1Y2soXCIxXCIpLnRvQXJyYXkoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXQxID0gZnVuY3Rpb24oaWQpe1xuICAgICAgICBtMm1bMF0uYXNrKGlkKTtcbiAgICAgICAgcmV0dXJuIExhenkoaXRlbXMpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHJldHVybiB4WzFdID09PSBpZDtcbiAgICAgICAgfSkucGx1Y2soXCIwXCIpLnRvQXJyYXkoKTtcbiAgICB9O1xuICAgIHRoaXNbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlbGF0aW9uLmluZGV4TmFtZS5zcGxpdCgnLycpWzFdKV0gPSB0aGlzLmdldDE7XG4gICAgdGhpc1snZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVsYXRpb24uaW5kZXhOYW1lLnNwbGl0KCcvJylbMF0pXSA9IHRoaXMuZ2V0MDtcblxuICAgIHRoaXMuZGVsID0gZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgIHZhciBsID0gaXRlbXMubGVuZ3RoO1xuICAgICAgICB2YXIgaWR4ID0gbnVsbDtcbiAgICAgICAgZm9yICh2YXIgYSA9IDA7IGEgPCBsOyBhKyspeyBcbiAgICAgICAgICAgIGlmICgoaXRlbXNbYV1bMF0gPT09IGl0ZW1bMF0pICYmIChpdGVtc1thXVsxXSA9PT0gaXRlbVsxXSkpe1xuICAgICAgICAgICAgICAgIGlkeCA9IGE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkeCl7XG4gICAgICAgICAgICBpdGVtcy5zcGxpY2UoYSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ2RlbGV0aW5nICcsIGl0ZW0pO1xuICAgIH07XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKHByb3RvLCBwcm9wZXJ0eU5hbWUsZ2V0dGVyLCBzZXR0ZXIpe1xuICAgIHZhciBldmVudHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsNCk7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIFxuICAgIExhenkoZXZlbnRzKS5lYWNoKGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgcHJvdG8ub3JtLm9uKGV2ZW50LGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXN1bHQgPSB7fTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIHByb3BlcnR5RGVmID0ge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGNhY2hlZCgpe1xuLy8gICAgICAgICAgICByZXR1cm4gZ2V0dGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgICBpZiAoISh0aGlzLmlkIGluIHJlc3VsdCkpe1xuICAgICAgICAgICAgICAgIHJlc3VsdFt0aGlzLmlkXSA9IGdldHRlci5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaWYgKHNldHRlcil7XG4gICAgICAgIHByb3BlcnR5RGVmWydzZXQnXSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgICAgIGlmICghaXNGaW5pdGUodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaWQgaW4gcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHRbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgICAgaWYgKHZhbHVlICE9PSByZXN1bHRbdGhpcy5pZF0pe1xuICAgICAgICAgICAgICAgIHNldHRlci5jYWxsKHRoaXMsdmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlkIGluIHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHRbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCBwcm9wZXJ0eU5hbWUscHJvcGVydHlEZWYpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IoZGF0YSl7XG4gICAgdGhpcy5yZXNvdXJjZSA9IGRhdGEuX3Jlc291cmNlO1xuICAgIHRoaXMuZm9ybUlkeCA9IGRhdGEuZm9ybUlkeDtcbiAgICB0aGlzLmZpZWxkcyA9IGRhdGEuZXJyb3JzO1xufVxudmFyIGJhc2VPUk0gPSBmdW5jdGlvbihvcHRpb25zLCBleHRPUk0pe1xuICAgIFxuICAgIC8vIGNyZWF0aW5nIHJld2hlZWwgY29ubmVjdGlvblxuICAgIGlmIChvcHRpb25zLmNvbnN0cnVjdG9yID09PSBTdHJpbmcpe1xuICAgICAgICB2YXIgY29ubmVjdGlvbiA9IG5ldyByZVdoZWVsQ29ubmVjdGlvbihvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuY29uc3RydWN0b3IgPT09IHV0aWxzLnJlV2hlZWxDb25uZWN0aW9uKXtcbiAgICAgICAgdmFyIGNvbm5lY3Rpb24gPSBvcHRpb25zO1xuICAgIH1cbiAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICAgIGNvbm5lY3Rpb24ub24oJ2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKCl7IFxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHRydWU7XG4gICAgfSk7XG4gICAgdGhpcy5vbiA9IGNvbm5lY3Rpb24ub247XG4gICAgdGhpcy5lbWl0ID0gY29ubmVjdGlvbi5lbWl0O1xuICAgIHRoaXMudW5iaW5kID0gY29ubmVjdGlvbi51bmJpbmQ7XG4gICAgdGhpcy5vbmNlID0gY29ubmVjdGlvbi5vbmNlO1xuICAgIHRoaXMuJHBvc3QgPSBjb25uZWN0aW9uLiRwb3N0LmJpbmQoY29ubmVjdGlvbik7XG5cbiAgICAvLyBoYW5kbGluZyB3ZWJzb2NrZXQgZXZlbnRzXG4gICAgdGhpcy5vbignd3MtY29ubmVjdGVkJyxmdW5jdGlvbih3cyl7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnV2Vic29ja2V0IGNvbm5lY3RlZCcpO1xuICAgICAgICAvLyBhbGwganNvbiBkYXRhIGhhcyB0byBiZSBwYXJzZWQgYnkgZ290RGF0YVxuICAgICAgICB3cy5vbk1lc3NhZ2VKc29uKFcyUFJFU09VUkNFLmdvdERhdGEuYmluZChXMlBSRVNPVVJDRSkpO1xuICAgICAgICAvL1xuICAgICAgICB3cy5vbk1lc3NhZ2VUZXh0KGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgICAgICAgY29uc29sZS5pbmZvKCdXUyBtZXNzYWdlIDogJyArIG1lc3NhZ2UpXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMub24oJ3dzLWRpc2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKHdzKXtcbiAgICAgICAgY29uc29sZS5lcnJvcignV2Vic29ja2V0IGRpc2Nvbm5lY3RlZCcpXG4gICAgfSk7XG4gICAgdGhpcy5vbignZXJyb3ItanNvbi00MDQnLGZ1bmN0aW9uKGVycm9yLHVybCwgc2VudERhdGEsIHhocil7IFxuICAgICAgICBjb25zb2xlLmVycm9yKCdKU09OIGVycm9yICcsIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XG4gICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbdXJsLnNwbGl0KCcvJylbMF1dO1xuICAgIH0pO1xuICAgIHRoaXMub24oJ3JlYWx0aW1lLW1lc3NhZ2UtanNvbicsIGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKG1lc3NhZ2UpO1xuICAgIH0pO1xuXG4gICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICB2YXIgVzJQUkVTT1VSQ0UgPSB0aGlzO1xuICAgIHZhciBJREIgPSB7YXV0aF9ncm91cCA6IExhenkoe30pfTsgLy8gdGFibGVOYW1lIC0+IGRhdGEgYXMgQXJyYXlcbiAgICB2YXIgSURYID0ge307IC8vIHRhYmxlTmFtZSAtPiBMYXp5KGluZGV4QnkoJ2lkJykpIC0+IElEQltkYXRhXVxuICAgIHZhciBSRVZJRFggPSB7fTsgLy8gdGFibGVOYW1lIC0+IGZpZWxkTmFtZSAtPiBMYXp5Lmdyb3VwQnkoKSAtPiBJREJbREFUQV1cbiAgICB2YXIgYnVpbGRlckhhbmRsZXJzID0ge307XG4gICAgdmFyIGJ1aWxkZXJIYW5kbGVyVXNlZCA9IHt9O1xuICAgIHZhciBwZXJzaXN0ZW50QXR0cmlidXRlcyA9IHt9O1xuICAgIHZhciBldmVudEhhbmRsZXJzID0ge307XG4gICAgdmFyIHBlcm1pc3Npb25XYWl0aW5nID0ge307XG4gICAgdmFyIG1vZGVsQ2FjaGUgPSB7fTtcbiAgICB2YXIgZmFpbGVkTW9kZWxzID0ge307XG4gICAgdmFyIHdhaXRpbmdDb25uZWN0aW9ucyA9IHt9IC8vIGFjdHVhbCBjb25uZWN0aW9uIHdobyBpJ20gd2FpdGluZyBmb3JcbiAgICB2YXIgbGlzdENhY2hlID0gbmV3IExpc3RDYWNoZXIoTGF6eSk7XG4gICAgdmFyIGxpbmtlciA9IG5ldyBBdXRvTGlua2VyKHdhaXRpbmdDb25uZWN0aW9ucyxJREIsIHRoaXMsIGxpc3RDYWNoZSk7XG4vKiAgICB3aW5kb3cubGwgPSBsaW5rZXI7XG4gICAgd2luZG93LmxjID0gbGlzdENhY2hlO1xuKi9cbiAgICB3aW5kb3cuSURCID0gSURCO1xuICAgIHRoaXMudmFsaWRhdGlvbkV2ZW50ID0gdGhpcy5vbignZXJyb3ItanNvbi01MTMnLCBmdW5jdGlvbihkYXRhLCB1cmwsIHNlbnREYXRhLCB4aHIpe1xuICAgICAgICBpZiAoY3VycmVudENvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyKXtcbiAgICAgICAgICAgIGN1cnJlbnRDb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlcihuZXcgVmFsaWRhdGlvbkVycm9yKGRhdGEpKTtcbiAgICAgICAgfVxuICAgIH0pXG5cbiAgICB2YXIgZ2V0SW5kZXggPSBmdW5jdGlvbiAoaW5kZXhOYW1lKSB7XG4gICAgICAgIGlmIChpbmRleE5hbWUgaW4gSURCKVxuICAgICAgICAgICAgcmV0dXJuIElEQltpbmRleE5hbWVdO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIElEQltpbmRleE5hbWVdID0gTGF6eSh7fSk7XG4gICAgICAgICAgICByZXR1cm4gSURCW2luZGV4TmFtZV07XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBnZXRVbmxpbmtlZCA9IGZ1bmN0aW9uIChpbmRleE5hbWUpIHtcbiAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBVTkxJTktFRClcbiAgICAgICAgICAgIHJldHVybiBVTkxJTktFRFtpbmRleE5hbWVdO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIFVOTElOS0VEW2luZGV4TmFtZV0gPSB7fTtcbiAgICAgICAgICAgIHJldHVybiBVTkxJTktFRFtpbmRleE5hbWVdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIFBlcm1pc3Npb25UYWJsZShpZCwga2xhc3MsIHBlcm1pc3Npb25zKSB7XG4gICAgICAgIC8vIGNyZWF0ZSBQZXJtaXNzaW9uVGFibGUgY2xhc3NcbiAgICAgICAgdGhpcy5rbGFzcyA9IGtsYXNzO1xuICAgICAgICB0aGlzLnBlcm1pc3Npb25zID0gW107XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgZm9yICh2YXIgayBpbiBwZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgdGhpcy5wdXNoLmFwcGx5KHRoaXMsIFtrLCBwZXJtaXNzaW9uc1trXV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIFBlcm1pc3Npb25UYWJsZS5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAvLyBzYXZlIE9iamVjdCB0byBzZXJ2ZXJcbiAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICBwZXJtaXNzaW9uczogTGF6eSh0aGlzLnBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3hbMF0uaWQsIHhbMV1dXG4gICAgICAgICAgICB9KS50b09iamVjdCgpXG4gICAgICAgIH07XG4gICAgICAgIGRhdGEuaWQgPSB0aGlzLmlkO1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gdGhpcy5rbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMua2xhc3MubW9kZWxOYW1lICsgJy9zZXRfcGVybWlzc2lvbnMnLCBkYXRhLCBmdW5jdGlvbiAobXlQZXJtcywgYSwgYiwgcmVxKSB7XG4gICAgICAgICAgICBjYihteVBlcm1zKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBQZXJtaXNzaW9uVGFibGUucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoZ3JvdXBfaWQsIHBlcm1pc3Npb25MaXN0KSB7XG4gICAgICAgIHZhciBwID0gTGF6eShwZXJtaXNzaW9uTGlzdCk7XG4gICAgICAgIHZhciBwZXJtcyA9IExhenkodGhpcy5rbGFzcy5hbGxQZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW3gsIHAuY29udGFpbnMoeCldXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIHZhciBsID0gTGF6eSh0aGlzLnBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4WzBdLmlkXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAobC5jb250YWlucyhncm91cF9pZCkpXG4gICAgICAgICAgICB0aGlzLnBlcm1pc3Npb25zW2wuaW5kZXhPZihncm91cF9pZCldWzFdID0gcGVybXM7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMucGVybWlzc2lvbnMucHVzaChbSURCLmF1dGhfZ3JvdXAuZ2V0KGdyb3VwX2lkKSwgcGVybXNdKTtcbiAgICB9O1xuXG4gICAgLy8gY3JlYXRlcyBkeW5hbWljYWwgbW9kZWxzXG4gICAgdmFyIG1ha2VNb2RlbENsYXNzID0gZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgIHZhciBfbW9kZWwgPSBtb2RlbDtcbiAgICAgICAgbW9kZWwuZmllbGRzLmlkLnJlYWRhYmxlID0gZmFsc2U7XG4gICAgICAgIG1vZGVsLmZpZWxkcy5pZC53cml0YWJsZSA9IGZhbHNlO1xuICAgICAgICB2YXIgZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpO1xuICAgICAgICBpZiAobW9kZWwucHJpdmF0ZUFyZ3MpIHtcbiAgICAgICAgICAgIGZpZWxkcyA9IGZpZWxkcy5tZXJnZShtb2RlbC5wcml2YXRlQXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbW9kZWwtZGVmaW5pdGlvbicsIG1vZGVsLCBnZXRJbmRleChtb2RlbC5uYW1lKSk7XG4gICAgICAgIC8vIGdldHRpbmcgZmllbGRzIG9mIHR5cGUgZGF0ZSBhbmQgZGF0ZXRpbWVcbi8qXG4gICAgICAgIHZhciBEQVRFRklFTERTID0gZmllbGRzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGdldHRpbmcgYm9vbGVhbiBmaWVsZHNcbiAgICAgICAgdmFyIEJPT0xGSUVMRFMgPSBmaWVsZHMuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHgudHlwZSA9PSAnYm9vbGVhbicpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGJvb2xlYW5zIGFuZCBkYXRldGltZXMgc3RvcmFnZSBleHRlcm5hbCBcbiAgICAgICAgTU9ERUxfREFURUZJRUxEU1ttb2RlbC5uYW1lXSA9IERBVEVGSUVMRFM7XG4gICAgICAgIE1PREVMX0JPT0xGSUVMRFNbbW9kZWwubmFtZV0gPSBCT09MRklFTERTO1xuKi9cbiAgICAgICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdmFyIGZ1bmNTdHJpbmcgPSBcImlmICghcm93KSB7IHJvdyA9IHt9fTtcXG5cIjtcbiAgICAgICAgZnVuY1N0cmluZyArPSBtb2RlbC5yZWZlcmVuY2VzLm1hcChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICByZXR1cm4gJ3RoaXMuXycgKyBmaWVsZC5pZCArICcgPSByb3cuJyArIGZpZWxkLmlkICsgJzsnO1xuICAgICAgICB9KS5qb2luKCc7XFxuJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBkYXRlZmllbGQgY29udmVyc2lvblxuICAgICAgICBmdW5jU3RyaW5nICs9IGZpZWxkcy5tYXAoZnVuY3Rpb24gKHgsaykge1xuICAgICAgICAgICAgaWYgKCh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gcm93LicgKyBrICsgJz9uZXcgRGF0ZShyb3cuJyArIGsgKyAnICogMTAwMCAtICcgKyB1dGlscy50ek9mZnNldCArICcpOm51bGw7XFxuJzsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHgudHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gKHJvdy4nICsgayArICcgPT09IFwiVFwiKSB8fCAocm93LicgKyBrICsgJyA9PT0gdHJ1ZSk7XFxuJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IHJvdy4nICsgayArICc7XFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudG9TdHJpbmcoJ1xcbicpOyArICdcXG4nO1xuXG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gXCJpZiAocGVybWlzc2lvbnMpIHt0aGlzLl9wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zICYmIExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkgeyByZXR1cm4gW3gsIHRydWVdIH0pLnRvT2JqZWN0KCk7fVwiXG5cbiAgICAgICAgXG4gICAgICAgIC8vIG1hc3RlciBjbGFzcyBmdW5jdGlvblxuICAgICAgICB2YXIgS2xhc3MgPSBuZXcgRnVuY3Rpb24oJ3JvdycsICdwZXJtaXNzaW9ucycsZnVuY1N0cmluZylcblxuICAgICAgICBLbGFzcy5wcm90b3R5cGUub3JtID0gZXh0T1JNO1xuICAgICAgICBLbGFzcy5yZWZfdHJhbnNsYXRpb25zID0ge307XG4gICAgICAgIEtsYXNzLm1vZGVsTmFtZSA9IG1vZGVsLm5hbWU7XG4gICAgICAgIEtsYXNzLnJlZmVyZW5jZXMgPSBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLnBsdWNrKCdpZCcpLnRvQXJyYXkoKTtcblxuICAgICAgICBLbGFzcy5pbnZlcnNlX3JlZmVyZW5jZXMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAvLyBtYW5hZ2luZyByZWZlcmVuY2VzIHdoZXJlIFxuICAgICAgICAgICAgcmV0dXJuIHguYnkgKyAnXycgKyB4LmlkICsgJ19zZXQnXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5yZWZlcmVudHMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW3guYnksIHguaWRdXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5maWVsZHNPcmRlciA9IG1vZGVsLmZpZWxkT3JkZXI7XG4gICAgICAgIEtsYXNzLmFsbFBlcm1pc3Npb25zID0gbW9kZWwucGVybWlzc2lvbnM7XG5cbiAgICAgICAgLy8gcmVkZWZpbmluZyB0b1N0cmluZyBtZXRob2RcbiAgICAgICAgaWYgKExhenkobW9kZWwucmVwcmVzZW50YXRpb24pLnNpemUoKSl7XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9TdHJpbmcgPSBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzLicgKyBMYXp5KG1vZGVsLnJlcHJlc2VudGF0aW9uKS50b1N0cmluZygnICsgXCIgXCIgKyB0aGlzLicpKTtcbiAgICAgICAgfVxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9VcHBlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyByZWRlZmluZSB0byBVcHBlckNhc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKTtcbiAgICAgICAgfTtcbiAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9Mb3dlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gZGVsZXRlIGluc3RhbmNlIGZyb20gc2VydmVyXG4gICAgICAgICAgICByZXR1cm4gZXh0T1JNLmRlbGV0ZSh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSwgW3RoaXMuaWRdKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBwZXJtaXNzaW9uIGdldHRlciBwcm9wZXJ0eVxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoS2xhc3MucHJvdG90eXBlLCAncGVybWlzc2lvbnMnLCB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcGVybWlzc2lvbnMpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLnBlcm1pc3Npb25zW3RoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lXS5hc2sodGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gZ2V0dGluZyBmdWxsIHBlcm1pc3Npb24gdGFibGUgZm9yIGFuIG9iamVjdFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuYWxsX3Blcm1zID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICB2YXIgb2JqZWN0X2lkID0gdGhpcy5pZDtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9hbGxfcGVybXMnLCB7aWQ6IHRoaXMuaWR9LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBwZXJtaXNzaW9ucyA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgdW5rbm93bl9ncm91cHMgPSBMYXp5KHBlcm1pc3Npb25zKS5wbHVjaygnZ3JvdXBfaWQnKS51bmlxdWUoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnICsgeFxuICAgICAgICAgICAgICAgIH0pLmRpZmZlcmVuY2UoSURCLmF1dGhfZ3JvdXAua2V5cygpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgTGF6eShwZXJtaXNzaW9ucykuZ3JvdXBCeShmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5ncm91cF9pZFxuICAgICAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBlZFtrXSA9IExhenkodikucGx1Y2soJ25hbWUnKS50b0FycmF5KClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKG5ldyBQZXJtaXNzaW9uVGFibGUob2JqZWN0X2lkLCBLbGFzcywgZ3JvdXBlZCkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKHVua25vd25fZ3JvdXBzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ2V0KCdhdXRoX2dyb3VwJyx1bmtub3duX2dyb3VwcyxjYWxsKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGNhbGwoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIHZhciBvID0gdGhpcy5hc1JhdygpO1xuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IEtsYXNzLmZpZWxkcztcbiAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICB2YXIgbW9kZWxOYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICBpZiAoYXJncykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGFyZyBpbiBhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG9bYXJnXSA9IGFyZ3NbYXJnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBlbGltaW5hdGUgdW53cml0YWJsZXNcbiAgICAgICAgICAgIExhenkoS2xhc3MuZmllbGRzT3JkZXIpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWZpZWxkc1t4XS53cml0YWJsZTtcbiAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24oZmllbGROYW1lKXtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGROYW1lIGluIG8pIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG9bZmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChJRCkgeyBvLmlkID0gSUQ7IH1cbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgKElEID8gJy9wb3N0JyA6ICcvcHV0JyksIG8pO1xuICAgICAgICAgICAgaWYgKGFyZ3MgJiYgKGFyZ3MuY29uc3RydWN0b3IgPT09IEZ1bmN0aW9uKSl7XG4gICAgICAgICAgICAgICAgLy8gcGxhY2luZyBjYWxsYmFjayBpbiBhIGNvbW1vbiBwbGFjZVxuICAgICAgICAgICAgICAgIHByb21pc2UuY29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIgPSBhcmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2VcbiAgICAgICAgfTtcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb2JqID0gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy5hc1JhdygpKTtcbiAgICAgICAgICAgIG9iai5fcGVybWlzc2lvbnMgPSB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYnVpbGRpbmcgc2VyaWFsaXphdGlvbiBmdW5jdGlvblxuICAgICAgICB2YXIgYXNyID0gJ3JldHVybiB7XFxuJyArIExhenkobW9kZWwucmVmZXJlbmNlcykubWFwKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHJldHVybiBmaWVsZC5pZCArICcgOiB0aGlzLl8nICsgZmllbGQuaWQ7XG4gICAgICAgIH0pLmNvbmNhdChmaWVsZHMubWFwKGZ1bmN0aW9uICh4LGspIHtcbiAgICAgICAgICAgIGlmICgoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogKHRoaXMuJyArIGsgKyAnPyhNYXRoLnJvdW5kKHRoaXMuJyArIGsgKyAnLmdldFRpbWUoKSAtIHRoaXMuJyArIGsgKyAnLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCkgLyAxMDAwKTpudWxsKSc7IFxuICAgICAgICAgICAgfSBlbHNlIGlmICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogdGhpcy4nICsgayArICc/XCJUXCI6XCJGXCInO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiB0aGlzLicgKyBrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSkudG9TdHJpbmcoJyxcXG4nKSArICd9Oyc7XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5hc1JhdyA9IG5ldyBGdW5jdGlvbihhc3IpO1xuXG4gICAgICAgIEtsYXNzLnNhdmVNdWx0aSA9IGZ1bmN0aW9uIChvYmplY3RzLCBjYiwgc2NvcGUpIHtcbiAgICAgICAgICAgIHZhciByYXcgPSBbXTtcbiAgICAgICAgICAgIHZhciBkZWxldGFibGUgPSBMYXp5KEtsYXNzLmZpZWxkcylcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAheC53cml0YWJsZVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnBsdWNrKCdpZCcpXG4gICAgICAgICAgICAgICAgLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIExhenkob2JqZWN0cylcbiAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmFzUmF3KClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIExhenkoZGVsZXRhYmxlKS5lYWNoKGZ1bmN0aW9uICh5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgeFt5XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJhdy5wdXNoKHgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lLCAncHV0Jywge211bHRpcGxlOiByYXcsIGZvcm1JZHggOiBXMlBSRVNPVVJDRS5mb3JtSWR4Kyt9LCBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGVsZW1zKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFiID0gSURCW0tsYXNzLm1vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgdmFyIG9ianMgPSBMYXp5KGVsZW1zW0tsYXNzLm1vZGVsTmFtZV0ucmVzdWx0cykucGx1Y2soJ2lkJykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YWIuZ2V0KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICAgICAgICBjYihvYmpzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBzY29wZSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmICgnZXh0cmFfdmVyYnMnIGluIG1vZGVsKVxuICAgICAgICAgICAgTGF6eShtb2RlbC5leHRyYV92ZXJicykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHZhciBmdW5jTmFtZSA9IHhbMF07XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSB4WzFdO1xuICAgICAgICAgICAgICAgIHZhciBkZGF0YSA9ICd2YXIgZGF0YSA9IHtpZCA6IHRoaXMuaWQnO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgZGRhdGEgKz0gJywgJyArIExhenkoYXJncykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHggKyAnIDogJyArIHg7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5qb2luKCcsJyk7XG4gICAgICAgICAgICAgICAgZGRhdGEgKz0gJ307XFxuJztcbiAgICAgICAgICAgICAgICBhcmdzID0gWydwb3N0JywnZ290RGF0YSddLmNvbmNhdChhcmdzKTtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goJ2NiJyk7XG4gICAgICAgICAgICAgICAgdmFyIGNvZGUgPSBkZGF0YSArICcgcmV0dXJuIHBvc3QoXCInICsgS2xhc3MubW9kZWxOYW1lICsgJy8nICsgZnVuY05hbWUgKyAnXCIsIGRhdGEsY2IpOyc7XG4gICAgICAgICAgICAgICAgdmFyIGZ1bmMgPSBuZXcgRnVuY3Rpb24oYXJncywgY29kZSk7XG4gICAgICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlW2Z1bmNOYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IFtXMlBSRVNPVVJDRS4kcG9zdCwgVzJQUkVTT1VSQ0UuZ290RGF0YV0uY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywwKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3MpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIGlmICgncHJpdmF0ZUFyZ3MnIGluIG1vZGVsKSB7XG4gICAgICAgICAgICBLbGFzcy5wcml2YXRlQXJncyA9IExhenkobW9kZWwucHJpdmF0ZUFyZ3MpLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHRydWVdO1xuICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS5zYXZlUEEgPSBmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgIHZhciBUID0gdGhpcztcbiAgICAgICAgICAgICAgICB2YXIgb28gPSB7aWQ6IHRoaXMuaWR9O1xuICAgICAgICAgICAgICAgIHZhciBQQSA9IHRoaXMuY29uc3RydWN0b3IucHJpdmF0ZUFyZ3M7XG4gICAgICAgICAgICAgICAgdmFyIEZzID0gdGhpcy5jb25zdHJ1Y3Rvci5maWVsZHM7XG4gICAgICAgICAgICAgICAgdmFyIHQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihvKS5hc1JhdygpO1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZElkeCA9IExhenkoUEEpLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCBGc1t4XV1cbiAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIExhenkobykuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGsgaW4gUEEpICYmIGZpZWxkSWR4W2tdLndyaXRhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvb1trXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSArICcvc2F2ZVBBJywgb28sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShvbykuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgVFtrXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1vZGVsQ2FjaGVbS2xhc3MubW9kZWxOYW1lXSA9IEtsYXNzO1xuICAgICAgICAvLyBhZGRpbmcgaWQgdG8gZmllbGRzXG4gICAgICAgIGZvciAodmFyIGYgaW4gbW9kZWwuZmllbGRzKSB7XG4gICAgICAgICAgICBtb2RlbC5maWVsZHNbZl0uaWQgPSBmO1xuICAgICAgICB9XG4gICAgICAgIEtsYXNzLmZpZWxkcyA9IExhenkobW9kZWwuZmllbGRzKS5jb25jYXQoTGF6eShtb2RlbC5wcml2YXRlQXJncykpLmNvbmNhdChMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLnRhcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgeC50eXBlID0geC50eXBlIHx8ICdyZWZlcmVuY2UnXG4gICAgICAgIH0pKS5pbmRleEJ5KCdpZCcpLnRvT2JqZWN0KCk7XG4gICAgICAgIC8vIHNldHRpbmcgd2lkZ2V0cyBmb3IgZmllbGRzXG4gICAgICAgIExhenkoS2xhc3MuZmllbGRzKS5lYWNoKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIGlmICghZmllbGQud2lkZ2V0KXtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGQudHlwZSA9PT0gJ3JlZmVyZW5jZScpe1xuICAgICAgICAgICAgICAgICAgICBmaWVsZC53aWRnZXQgPSAnY2hvaWNlcydcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmaWVsZC53aWRnZXQgPSBmaWVsZC50eXBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGJ1aWxkaW5nIHJlZmVyZW5jZXMgdG8gKG1hbnkgdG8gb25lKSBmaWVsZHNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgIHZhciBleHRfcmVmID0gcmVmLnRvO1xuICAgICAgICAgICAgdmFyIGxvY2FsX3JlZiA9ICdfJyArIHJlZi5pZDtcbiAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCByZWYuaWQsZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICghdGhpc1tsb2NhbF9yZWZdKSB7IHJldHVybiB1dGlscy5tb2NrIH07XG4gICAgICAgICAgICAgICAgaWYgKCEoZXh0X3JlZiBpbiBJREIpKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKGV4dF9yZWYsZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rZXIubWFpbkluZGV4W2V4dF9yZWZdLmFzayh0aHNbbG9jYWxfcmVmXSx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSAoZXh0X3JlZiBpbiBJREIpICYmIHRoaXNbbG9jYWxfcmVmXSAmJiBJREJbZXh0X3JlZl0uZ2V0KHRoaXNbbG9jYWxfcmVmXSk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgJiYgKGV4dF9yZWYgaW4gbGlua2VyLm1haW5JbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYXNraW5nIHRvIGxpbmtlclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRoaXNbbG9jYWxfcmVmXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtlci5tYWluSW5kZXhbZXh0X3JlZl0uYXNrKHRoaXNbbG9jYWxfcmVmXSx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignbnVsbCByZWZlcmVuY2UgZm9yICcgKyBsb2NhbF9yZWYgKyAnKCcgKyB0aGlzLmlkICsgJykgcmVzb3VyY2UgJyArIEtsYXNzLm1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHV0aWxzLm1vY2s7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCh2YWx1ZS5jb25zdHJ1Y3RvciAhPT0gdXRpbHMubW9jaykgJiYgKHZhbHVlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSAhPT0gZXh0X3JlZikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBjYW4gYXNzaWduIG9ubHkgJyArIGV4dF9yZWYgKyAnIHRvICcgKyByZWYuaWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbbG9jYWxfcmVmXSA9IHZhbHVlLmlkO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbbG9jYWxfcmVmXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgJ25ldy0nICsgZXh0X3JlZiwgJ2RlbGV0ZWQtJyArIGV4dF9yZWYsJ3VwZGF0ZWQtJyArIGV4dF9yZWYsICduZXctbW9kZWwtJyArIGV4dF9yZWYvKiwgJ3VwZGF0ZWQtJyArIEtsYXNzLm1vZGVsTmFtZSovKTtcblxuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlZi5pZCldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRPUk0uZ2V0KGV4dF9yZWYsdGhpc1tsb2NhbF9yZWZdKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAob25lIHRvIG1hbnkpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZWRCeSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gcmVmLmJ5ICsgJy4nICsgcmVmLmlkO1xuICAgICAgICAgICAgdmFyIHByb3BlcnR5TmFtZSA9IHJlZi5ieSArICdfJyArIHV0aWxzLnBsdXJhbGl6ZShyZWYuaWQpO1xuICAgICAgICAgICAgdmFyIHJldkluZGV4ID0gcmVmLmJ5O1xuICAgICAgICAgICAgaWYgKEtsYXNzLnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJ5ZWQgdG8gcmVkZWZpbmUgcHJvcGVydHkgJyArIHByb3BlcnR5TmFtZSArICdzJyArICcgZm9yICcgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcHJvcGVydHlOYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSAocmV2SW5kZXggaW4gSURCKSA/IFJFVklEWFtpbmRleE5hbWVdLmdldCh0aGlzLmlkICsgJycpOm51bGw7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtlci5mb3JlaWduS2V5c1tpbmRleE5hbWVdLmFzayh0aGlzLmlkLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgIH0sIG51bGwsICduZXctJyArIHJldkluZGV4LCAndXBkYXRlZC0nICsgcmV2SW5kZXgsICdkZWxldGVkLScgKyByZXZJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShyZWYuYnkpKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdHMgPSB7fTtcbiAgICAgICAgICAgICAgICBvcHRzW3JlZi5pZF0gPSBbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5nZXQocmVmLmJ5LG9wdHMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9idWlsZGluZyByZWZlcmVuY2UgdG8gKG1hbnkgdG8gbWFueSkgZmllbGRzXG4gICAgICAgIGlmIChtb2RlbC5tYW55VG9NYW55KSB7XG4gICAgICAgICAgICBMYXp5KG1vZGVsLm1hbnlUb01hbnkpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSByZWYuaW5kZXhOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCA9IHJlZi5maXJzdD8gMCA6IDE7XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbE5hbWUgPSByZWYubW9kZWw7XG4vLyAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gZ2V0SW5kZXgob21vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIGdldHRlciA9IGxpbmtlci5tMm1JbmRleFtpbmRleE5hbWVdWydnZXQnICsgKDEgLSBmaXJzdCldO1xuXG4gICAgICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5tb2RlbCArICdzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gZ2V0dGVyKHRocy5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1cyUFJFU09VUkNFLmZldGNoKG9tb2RlbE5hbWUsIHtpZCA6IGlkc30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldCA9IGdldEluZGV4KG9tb2RlbE5hbWUpLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMgJiYgZ2V0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldCA9IExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICAgICAgfSwgbnVsbCwgJ3JlY2VpdmVkLW0ybS0nICsgaW5kZXhOYW1lLCAncmVjZWl2ZWQtJyArIG9tb2RlbE5hbWUpO1xuXG4gICAgICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZSh1dGlscy5wbHVyYWxpemUob21vZGVsTmFtZSkpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtlci5nZXRNMk0oaW5kZXhOYW1lLCBbdGhzLmlkXSwgZmlyc3QsZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSxudWxsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdldCA9IElEQltvbW9kZWxOYW1lXS5nZXQuYmluZChJREJbb21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChMYXp5KGlkcykubWFwKGdldCkuZmlsdGVyKHV0aWxzLmJvb2wpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChbXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgICAgICBLbGFzcy5maWVsZHNbdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWxOYW1lKV0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiB1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpLFxuICAgICAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcmVhZGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdNMk0nLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3JzOiBbXVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUudW5saW5rUmVmZXJlbmNlID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgICAgICB2YXIgaW5zdGFuY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmNvbnN0cnVjdG9yLm5hbWUgPT0gJ0FycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlcyA9IGluc3RhbmNlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IGluc3RhbmNlc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbCA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW0lELCB4XVxuICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBbW0lELCBpbnN0YW5jZS5pZF1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWwgKyAncy9kZWxldGUnLCB7Y29sbGVjdGlvbjogY29sbGVjdGlvbn0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWw7XG4gICAgICAgICAgICAgICAgaWYgKG11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWZzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaW5kZXhOYW1lID0gb21vZGVsICsgJy8nICsgS2xhc3MubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElOREVYX00yTSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVmcyA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5kaWZmZXJlbmNlKExhenkoSU5ERVhfTTJNW2luZGV4TmFtZV1bMF0uZ2V0KHRoaXMuaWQpKSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWZzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBMYXp5KHJlZnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBfUE9TVChLbGFzcy5tb2RlbE5hbWUsIG9tb2RlbCArICdzL3B1dCcsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChpbmRleE5hbWUgaW4gbGlua2VyLm0ybUluZGV4KSAmJiBMYXp5KGxpbmtlci5tMm1JbmRleFtpbmRleE5hbWVdWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWwpXShpbnN0YW5jZS5pZCkpLmZpbmQodGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWwgKyAncy9wdXQnLCB7Y29sbGVjdGlvbjogW1t0aGlzLmlkLCBpbnN0YW5jZS5pZF1dfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCduZXctbW9kZWwnLCBLbGFzcyk7XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ25ldy1tb2RlbC0nICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgcmV0dXJuIEtsYXNzO1xuICAgIH07XG5cbiAgICB0aGlzLmdvdERhdGEgPSBmdW5jdGlvbiAoZGF0YSwgY2FsbEJhY2spIHtcbiAgICAgICAgLy8gcmVjZWl2ZSBhbGwgZGF0YSBmcm9tIGV2ZXJ5IGVuZCBwb2ludFxuICAgICAgICBjb25zb2xlLmluZm8oJ2dvdERhdGEnKTtcbiAgICAgICAgaWYgKHR5cGVvZihkYXRhKSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2RhdGEgJyArIGRhdGEgKyAnIHJlZnVzZWQgZnJvbSBnb3REYXRhKCknKTtcbiAgICAgICAgICAgIGlmIChjYWxsQmFjaykge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBjbGVhbiBkYXRhIGZyb20gcmVsYXRpb25zIGFuZCBwZXJtaXNzaW9ucyBmb3IgdXNpbmcgaXQgYWZ0ZXIgbW9kZWwgcGFyc2luZ1xuICAgICAgICBpZiAoJ19leHRyYScgaW4gZGF0YSl7IGRlbGV0ZSBkYXRhLl9leHRyYSB9XG4gICAgICAgIHZhciBUT09ORSA9IGRhdGEuVE9PTkU7XG4gICAgICAgIHZhciBUT01BTlkgPSBkYXRhLlRPTUFOWTtcbiAgICAgICAgdmFyIE1BTllUT01BTlkgPSBkYXRhLk1BTllUT01BTlk7XG4gICAgICAgIHZhciBQRVJNSVNTSU9OUyA9IGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIHZhciBQQSA9IGRhdGEuUEE7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPT05FO1xuICAgICAgICBkZWxldGUgZGF0YS5UT01BTlk7XG4gICAgICAgIGRlbGV0ZSBkYXRhLk1BTllUT01BTlk7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBFUk1JU1NJT05TO1xuICAgICAgICBkZWxldGUgZGF0YS5QQTtcbiAgICAgICAgaWYgKCFQQSkgeyBQQSA9IHt9OyB9XG5cbiAgICAgICAgLy8gY2xlYW5pbmcgZnJvbSB1c2VsZXNzIGRlbGV0ZWQgZGF0YVxuICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5maWx0ZXIoZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgIHJldHVybiAoISgnZGVsZXRlZCcgaW4gdikgfHwgKChrIGluIG1vZGVsQ2FjaGUpKSk7XG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJ20ybScgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG0ybSA9IGRhdGEubTJtO1xuICAgICAgICAgICAgZGVsZXRlIGRhdGFbJ20ybSddO1xuICAgICAgICB9XG4gICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbiAoZGF0YSwgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICAgICAgICAgIHZhciBtb2RlbENsYXNzID0gbW9kZWw7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucmVzdWx0cyAmJiAoZGF0YS5yZXN1bHRzLmxlbmd0aCA+IDApICYmIChkYXRhLnJlc3VsdHNbMF0uY29uc3RydWN0b3IgPT0gQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cyA9IExhenkoZGF0YS5yZXN1bHRzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTGF6eShtb2RlbENsYXNzLmZpZWxkc09yZGVyKS56aXAoeCkudG9PYmplY3QoKVxuICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIHZhciBkZWxldGVkID0gZGF0YS5kZWxldGVkO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gUEEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIE1QQSA9IFBBW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIExhenkocmVzdWx0cykuZWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3JkLmlkIGluIE1QQSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoTVBBW3JlY29yZC5pZF0pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBpbmRleGluZyByZWZlcmVuY2VzIGJ5IGl0cyBJRFxuICAgICAgICAgICAgICAgIHZhciBpdGFiID0gZ2V0SW5kZXgobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFibGUgPSBpdGFiLnNvdXJjZTtcblxuICAgICAgICAgICAgICAgIC8vIG9iamVjdCBkZWxldGlvblxuICAgICAgICAgICAgICAgIGlmIChkZWxldGVkKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlZC5mb3JFYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbi8qXG4gICAgICAgICAgICAgICAgTGF6eShkZWxldGVkKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0YWJsZVt4XTtcbiAgICAgICAgICAgICAgICB9KTtcbiovXG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IHJlc3VsdHMuaW5kZXhCeSgnaWQnKTtcbiAgICAgICAgICAgICAgICB2YXIgaWsgPSBpZHgua2V5cygpO1xuICAgICAgICAgICAgICAgIHZhciBubmV3ID0gaWsuZGlmZmVyZW5jZShpdGFiLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgpXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkID0gaWsuZGlmZmVyZW5jZShubmV3KTtcbiAgICAgICAgICAgICAgICAvLyByZW1vdmluZyBvbGQgaWRlbnRpY2FsIHZhbHVlc1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQgPSB1cGRhdGVkLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIXV0aWxzLnNhbWVBcyhpZHguZ2V0KHgpLCBpdGFiLmdldCh4KS5hc1JhdygpKTtcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy8gY2xhc3NpZnkgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIHZhciBwZXJtcyA9IGRhdGEucGVybWlzc2lvbnMgPyBMYXp5KGRhdGEucGVybWlzc2lvbnMpIDogTGF6eSh7fSk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld09iamVjdHMgPSBubmV3Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IG1vZGVsQ2xhc3MoaWR4LmdldCh4KSwgcGVybXMuZ2V0KHgpKVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBjbGFzc2lmeWluZyB1cGRhdGVkXG4gICAgICAgICAgICAgICAgLy92YXIgdXBkYXRlZE9iamVjdHMgPSB1cGRhdGVkLm1hcChmdW5jdGlvbih4KXtyZXR1cm4gbmV3IG1vZGVsQ2xhc3MoaWR4LmdldCh4KSxwZXJtcy5nZXQoeCkpfSk7XG4gICAgICAgICAgICAgICAgLy92YXIgdW8gPSB1cGRhdGVkT2JqZWN0cy50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy91cGRhdGVkT2JqZWN0cyA9IExhenkodW8pLm1hcChmdW5jdGlvbih4KXtyZXR1cm4gW3gsdGFibGVbeC5pZF1dfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0aW5nIHNpbmdsZSBvYmplY3RzXG4gICAgICAgICAgICAgICAgdmFyIGNoYW5nZWQgPSBbXTtcbi8vICAgICAgICAgICAgICAgIHZhciBEQVRFRklFTERTID0gTU9ERUxfREFURUZJRUxEU1ttb2RlbE5hbWVdO1xuLy8gICAgICAgICAgICAgICAgdmFyIEJPT0xGSUVMRFMgPSBNT0RFTF9CT09MRklFTERTW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsUmVmZXJlbmNlcyA9IExhenkobW9kZWwucmVmZXJlbmNlcykubWFwKGZ1bmN0aW9uKGspIHsgcmV0dXJuIFtrLDFdfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVkLmZvckVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZEl0ZW0gPSB0YWJsZVt4XTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZENvcHkgPSBvbGRJdGVtLmNvcHkoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0l0ZW0gPSBpZHguZ2V0KHgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRpbmcgZWFjaCBhdHRyaWJ1dGUgc2luZ3VsYXJseVxuXG4gICAgICAgICAgICAgICAgICAgIExhenkobW9kZWwuZmllbGRzKS5lYWNoKGZ1bmN0aW9uKGZpZWxkLCBmaWVsZE5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaChmaWVsZC50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVmZXJlbmNlJyA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkSXRlbVsnXycgKyBmaWVsZE5hbWVdID0gbmV3SXRlbVtmaWVsZE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOYU4gaXMgY29udm50aW9uYWxseSBhIGNhY2hlIGRlbGV0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkSXRlbVtmaWVsZE5hbWVdID0gTmFOO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGF0ZSc6IHtvbGRJdGVtW2ZpZWxkTmFtZV0gPSBuZXcgRGF0ZShuZXdJdGVtW2ZpZWxkTmFtZV0gKiAxMDAwKTsgYnJlYWt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2RhdGV0aW1lJzoge29sZEl0ZW1bZmllbGROYW1lXSA9IG5ldyBEYXRlKG5ld0l0ZW1bZmllbGROYW1lXSAqIDEwMDApOyBicmVha307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnYm9vbGVhbicgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobmV3SXRlbVtmaWVsZE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIG51bGwgOiB7IG9sZEl0ZW1bZmllbGROYW1lXSA9IG51bGw7IGJyZWFrOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnVCcgOiB7IG9sZEl0ZW1bZmllbGROYW1lXSA9IHRydWU7IGJyZWFrOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnRicgOiB7IG9sZEl0ZW1bZmllbGROYW1lXSA9IGZhbHNlOyBicmVhazsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgdHJ1ZSA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gdHJ1ZTsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIGZhbHNlIDogeyBvbGRJdGVtW2ZpZWxkTmFtZV0gPSBmYWxzZTsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB7b2xkSXRlbVtmaWVsZE5hbWVdID0gbmV3SXRlbVtmaWVsZE5hbWVdfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtW2ZpZWxkTmFtZV0gPSBuZXdJdGVtW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkLnB1c2goW25ld0l0ZW0sIG9sZENvcHldKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vLy8gc2VuZGluZyBzaWduYWwgZm9yIHVwZGF0ZWQgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKGNoYW5nZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3VwZGF0ZWQtJyArIG1vZGVsTmFtZSwgY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vKioqKioqKiogVXBkYXRlIHVuaXZlcnNlICoqKioqKioqXG4gICAgICAgICAgICAgICAgdmFyIG5vID0gbmV3T2JqZWN0cy50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgTGF6eShubykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB0YWJsZVt4LmlkXSA9IHhcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyByZWJ1bGRpbmcgcmV2ZXJzZSBpbmRleGVzXG4gICAgICAgICAgICAgICAgTGF6eShtb2RlbENhY2hlW21vZGVsTmFtZV0ucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgICAgIFJFVklEWFttb2RlbE5hbWUgKyAnLicgKyByZWZdID0gSURCW21vZGVsTmFtZV0uZ3JvdXBCeSgnXycgKyByZWYpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHNlbmRpbmcgZXZlbnRzIGZvciBuZXcgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKG5vLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbmV3LScgKyBtb2RlbE5hbWUsIExhenkobm8pLCBkYXRhLnRvdGFsUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnZGVsZXRlZC0nICsgbW9kZWxOYW1lLCBkZWxldGVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIGRhdGEgYXJyaXZlZFxuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLScgKyBtb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4vKiAgICAgICAgXG4gICAgICAgIGlmIChUT09ORSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVE9PTkUnKTtcbiAgICAgICAgICAgIExhenkoVE9PTkUpLmVhY2goZnVuY3Rpb24gKHZhbHMsIG1vZGVsTmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIHVkeCA9IGdldFVubGlua2VkKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVE9NQU5ZKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUT01BTlknKTtcbiAgICAgICAgICAgIExhenkoVE9NQU5ZKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBpbmRleE5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gQVNLRURfVU5MSU5LRUQpKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX1VOTElOS0VEW2luZGV4TmFtZV0gPSBMYXp5KFtdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgTGF6eSh2YWxzKS5lYWNoKGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9VTkxJTktFRFtpbmRleE5hbWVdLnNvdXJjZS5wdXNoKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChNQU5ZVE9NQU5ZKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdNQU5ZVE9NQU5ZJyk7XG4gICAgICAgICAgICBMYXp5KE1BTllUT01BTlkpLmVhY2goZnVuY3Rpb24gKHZhbHMsIGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCA9IHBhcnNlSW50KGluZGV4TmFtZS5zcGxpdCgnfCcpWzFdKTtcbiAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBpbmRleE5hbWUuc3BsaXQoJ3wnKVswXTtcbiAgICAgICAgICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gQVNLRURfTTJNKSkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9NMk1baW5kZXhOYW1lXSA9IFt7fSwge31dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgTUlEWCA9IEFTS0VEX00yTVtpbmRleE5hbWVdW2ZpcnN0XTtcbiAgICAgICAgICAgICAgICBMYXp5KHZhbHMpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgTUlEWFt4ICsgJyddID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgTUlEWFt4XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgXG4qL1xuICAgICAgICBpZiAobTJtKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RNMk0obTJtKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoUEVSTUlTU0lPTlMpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdFBlcm1pc3Npb25zKFBFUk1JU1NJT05TKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjYWxsQmFjaykge1xuICAgICAgICAgICAgY2FsbEJhY2soZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnZ290LWRhdGEnKTtcbiAgICB9O1xuICAgIHRoaXMuZ290UGVybWlzc2lvbnMgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24gKHYsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgTGF6eSh2WzBdKS5lYWNoKGZ1bmN0aW9uIChyb3csIGlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKChyZXNvdXJjZU5hbWUgaW4gSURCKSAmJiAoaWQgaW4gSURCW3Jlc291cmNlTmFtZV0uc291cmNlKSl7XG4gICAgICAgICAgICAgICAgICAgIElEQltyZXNvdXJjZU5hbWVdLmdldChpZCkuX3Blcm1pc3Npb25zID0gTGF6eShyb3cpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCB0cnVlXVxuICAgICAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKExhenkodlswXSkuc2l6ZSgpKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMtJyArIHJlc291cmNlTmFtZSwgTGF6eSh2WzBdKS5rZXlzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZW1pdCgndXBkYXRlLXBlcm1pc3Npb25zJyk7XG4gICAgfTtcblxuXG4gICAgdGhpcy5nb3RNMk0gPSBmdW5jdGlvbihtMm0pe1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihkYXRhLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgdmFyIG0ybUluZGV4ID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24obSl7XG4gICAgICAgICAgICAgICAgTGF6eShtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsdmVyYil7XG4gICAgICAgICAgICAgICAgICAgIG0ybUluZGV4W3ZlcmJdKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdyZWNlaXZlZC1tMm0nKTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLW0ybS0nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5mZXRjaCA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKSB7ICAvL1xuICAgICAgICAvLyBpZiBhIGNvbm5lY3Rpb24gaXMgY3VycmVudGx5IHJ1bm5pbmcsIHdhaXQgZm9yIGNvbm5lY3Rpb24uXG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gd2FpdGluZ0Nvbm5lY3Rpb25zKXtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0sNTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGZldGNoaW5nIGFzeW5jaHJvbW91cyBtb2RlbCBmcm9tIHNlcnZlclxuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUobW9kZWxOYW1lLCAoZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgICAgIC8vIGlmIGRhdGEgY2FtZXMgZnJvbSByZWFsdGltZSBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKFcyUFJFU09VUkNFLmNvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gZ2V0dGluZyBmaWx0ZXIgZmlsdGVyZWQgYnkgY2FjaGluZyBzeXN0ZW1cbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyID0gbGlzdENhY2hlLmZpbHRlcihtb2RlbCxmaWx0ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHNvbXRoaW5nIGlzIG1pc3Npbmcgb24gbXkgbG9jYWwgREIgXG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXNrIGZvciBtaXNzaW5ncyBhbmQgcGFyc2Ugc2VydmVyIHJlc3BvbnNlIGluIG9yZGVyIHRvIGVucmljaCBteSBsb2NhbCBEQi5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBsYWNpbmcgbG9jayBmb3IgdGhpcyBtb2RlbFxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywge2ZpbHRlciA6IGZpbHRlcn0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSxjYWxsQmFjayk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVsZWFzZSBsb2NrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihyZXQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWxlYXNlIGxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywgc2VuZERhdGEsZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbHRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHT1RfQUxMLnNvdXJjZS5wdXNoKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXQgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICAvLyBzZWFyY2ggb2JqZWN0cyBmcm9tIElEQi4gSWYgc29tZSBpZCBpcyBtaXNzaW5nLCBpdCByZXNvbHZlIGl0IGJ5IHRoZSBzZXJ2ZXJcbiAgICAgICAgLy8gaWYgYSByZXF1ZXN0IHRvIHRoZSBzYW1lIG1vZGVsIGlzIHBlbmRpbmcsIHdhaXQgZm9yIGl0cyBjb21wbGV0aW9uXG4gICAgICAgIFxuICAgICAgICBpZiAoaWRzLmNvbnN0cnVjdG9yICE9PSBBcnJheSl7XG4gICAgICAgICAgICBpZHMgPSBbaWRzXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBzb21lIGVudGl0eSBpcyBtaXNzaW5nIFxuICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUgLCB7aWQ6IGlkc30sIG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgIHZhciBpdGFiID0gSURCW21vZGVsTmFtZV1cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIGlkcyl7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goaXRhYi5zb3VyY2VbaWRzW2lkXV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ290TW9kZWwgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBmb3IgKHZhciBtb2RlbE5hbWUgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gZGF0YVttb2RlbE5hbWVdO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlWydkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lXSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgbW9kZWxDYWNoZVttb2RlbE5hbWVdID0gbWFrZU1vZGVsQ2xhc3MobW9kZWwpO1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIElEQikpIHtcbiAgICAgICAgICAgICAgICBJREJbbW9kZWxOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZGVzY3JpYmUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHJldCA9IG1vZGVsQ2FjaGVbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpKXtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGZhaWxlZE1vZGVscyl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY2FjaGVLZXkgPSAnZGVzY3JpcHRpb246JyArIG1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoY2FjaGVLZXkgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ290TW9kZWwoSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbY2FjaGVLZXldKSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVzY3JpYmUnLG51bGwsIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290TW9kZWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZWxOb3RGb3VuZC5oYW5kbGUobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxlZE1vZGVsc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9ICAgICAgICBcbiAgICB9O1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZGVjb3JhdG9yKSB7XG4gICAgICAgIHZhciBrZXkgPSB1dGlscy5oYXNoKGRlY29yYXRvcik7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlcnMpKSBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXSA9IG5ldyBIYW5kbGVyKCk7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlclVzZWQpKSBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXSA9IHt9O1xuICAgICAgICBpZiAoa2V5IGluIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdW2tleV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gbW9kZWxDYWNoZSkge1xuICAgICAgICAgICAgZGVjb3JhdG9yKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXS5hZGRIYW5kbGVyKGRlY29yYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGF0dHJpYnV0ZXMpe1xuICAgICAgICB2YXIgYWRkUHJvcGVydHkgPSBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlcykge1xuICAgICAgICAgIGF0dHJpYnV0ZXMuZm9yRWFjaChmdW5jdGlvbih2YWwpe1xuICAgICAgICAgICAgdmFyIGtleSA9ICdwQTonICsgbW9kZWwubW9kZWxOYW1lICsgJzonICsgdmFsO1xuICAgICAgICAgICAgdmFyIGthdHRyID0gJ19fJyArIHZhbDtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtb2RlbC5wcm90b3R5cGUsIHZhbCwge1xuICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2F0dHIgaW4gdGhpcykpe1xuICAgICAgICAgICAgICAgICAgdmFyIHYgPSBsb2NhbFN0b3JhZ2Vba2V5ICsgdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgICB0aGlzW2thdHRyXSA9IHY/SlNPTi5wYXJzZSh2KTpudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1trYXR0cl07XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgICAgIHRoaXNba2F0dHJdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW2tleSArIHRoaXMuaWRdID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKSkgeyBwZXJzaXN0ZW50QXR0cmlidXRlc1ttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgdmFyIGF0dHJzID0gcGVyc2lzdGVudEF0dHJpYnV0ZXNbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHZhciBuZXdBdHRycyA9IExhenkoYXR0cmlidXRlcykuZGlmZmVyZW5jZShhdHRycykudG9BcnJheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5ld0F0dHJzID0gYXR0cnM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld0F0dHJzLmxlbmd0aCl7XG4gICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIG1vZGVsQ2FjaGUpe1xuICAgICAgICAgICAgICAgIGFkZFByb3BlcnR5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSwgbmV3QXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGF0dHJzLG5ld0F0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbignbmV3LW1vZGVsJywgZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVycyl7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWwubW9kZWxOYW1lXS5oYW5kbGUobW9kZWxDYWNoZVttb2RlbC5tb2RlbE5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzKG1vZGVsLm1vZGVsTmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMucXVlcnkgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHRoaXMuZGVzY3JpYmUobW9kZWxOYW1lLGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgIC8vIGFycmF5Zml5IGFsbCBmaWx0ZXIgdmFsdWVzXG4gICAgICAgICAgICBmaWx0ZXIgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHYsayl7IHJldHVybiBbayxBcnJheS5pc0FycmF5KHYpP3Y6W3ZdXX0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICB2YXIgZmlsdGVyRnVuY3Rpb24gPSB1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgdmFyIGlkeCA9IGdldEluZGV4KG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB0aHMuZmV0Y2gobW9kZWxOYW1lLGZpbHRlcix0b2dldGhlciwgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soaWR4LmZpbHRlcihmaWx0ZXJGdW5jdGlvbikudmFsdWVzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2RlbGV0ZScsIHsgaWQgOiBpZHN9LCBjYWxsQmFjayk7XG4gICAgfTtcblxuICAgIHRoaXMuY29ubmVjdCA9IGZ1bmN0aW9uIChjYWxsQmFjaykge1xuICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmlzTG9nZ2VkSW4pIHtcbiAgICAgICAgICAgIGNhbGxCYWNrKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29ubmVjdChjYWxsQmFjayk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5mdW5jdGlvbiByZVdoZWVsT1JNKGVuZFBvaW50LCBsb2dpbkZ1bmMpe1xuICAgIHRoaXMuJG9ybSA9IG5ldyBiYXNlT1JNKG5ldyB1dGlscy5yZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgbG9naW5GdW5jKSx0aGlzKTtcbiAgICB0aGlzLm9uID0gdGhpcy4kb3JtLm9uLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLmVtaXQgPSB0aGlzLiRvcm0uZW1pdC5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy51bmJpbmQgPSB0aGlzLiRvcm0udW5iaW5kLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLm9uY2UgPSB0aGlzLiRvcm0ub25jZTtcbiAgICB0aGlzLmFkZE1vZGVsSGFuZGxlciA9IHRoaXMuJG9ybS5hZGRNb2RlbEhhbmRsZXIuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSB0aGlzLiRvcm0uYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMudXRpbHMgPSB1dGlscztcbiAgICB0aGlzLmxvZ291dCA9IHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ291dC5iaW5kKHRoaXMuJG9ybS5jb25uZWN0aW9uKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzLiRvcm0uY29ubmVjdGlvbjtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKGZ1bmN0aW9uKGNhbGxCYWNrLHJlamVjdCl7XG4gICAgICAgIGNvbm5lY3Rpb24uY29ubmVjdChjYWxsQmFjayk7XG4gICAgfSkpO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ2luKHVzZXJuYW1lLCBwYXNzd29yZCwgYWNjZXB0KTsgICAgXG4gICAgfSkuYmluZCh0aGlzKSk7XG4gICAgXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dvdXQgPSBmdW5jdGlvbih1cmwpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dvdXQoKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0TW9kZWwgPSBmdW5jdGlvbihtb2RlbE5hbWUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVzY3JpYmUobW9kZWxOYW1lLGFjY2VwdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNpbmdsZSA9IGZhbHNlO1xuICAgIHZhciBtb2ROYW1lID0gbW9kZWxOYW1lO1xuICAgIHZhciBmaWx0ZXI7XG4gICAgaWYgKHR5cGVvZiBpZHMgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHNpbmdsZSA9IHRydWU7XG4gICAgICAgIGZpbHRlciA9IHsgaWQgOiBbaWRzXX07XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGlkcykpe1xuICAgICAgICBmaWx0ZXIgPSB7IGlkIDogaWRzIH07XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgaWRzID09PSAnb2JqZWN0Jykge1xuICAgICAgICBmaWx0ZXIgPSBpZHM7XG4gICAgfSBlbHNlIGlmIChpZHMgPT09IG51bGwpIHtcbiAgICAgICAgZmlsdGVyID0ge307XG4gICAgfVxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLnF1ZXJ5KG1vZGVsTmFtZSwgZmlsdGVyLCBudWxsLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzaW5nbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChkYXRhLmxlbmd0aCA/IGRhdGFbMF0gOiBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKlxucmVXaGVlbE9STS5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBmaWx0ZXIsIHJlbGF0ZWQpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB2YXIgdG9nZXRoZXIgPSBudWxsO1xuICAgICAgICBpZiAocmVsYXRlZCAmJiAocmVsYXRlZC5jb25zdHJ1Y3RvciA9PT0gQXJyYXkpICYmIChyZWxhdGVkLmxlbmd0aCkpe1xuICAgICAgICAgICAgdG9nZXRoZXIgPSByZWxhdGVkO1xuICAgICAgICB9IGVsc2UgaWYgKHJlbGF0ZWQgJiYgKHJlbGF0ZWQuY29uc3RydWN0b3IgPT09IFN0cmluZykgJiYgKHJlbGF0ZWQubGVuZ3RoKSl7XG4gICAgICAgICAgICB0b2dldGhlciA9IHJlbGF0ZWQuc3BsaXQoJywnKTtcbiAgICAgICAgfVxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5xdWVyeShtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGFjY2VwdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KVxufTtcbiovXG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGlkcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlbGV0ZShtb2RlbE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRMb2dnZWRVc2VyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLiRvcm0uY29ubmVjdGlvbi5jYWNoZWRTdGF0dXMudXNlcl9pZClcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KCdhdXRoX3VzZXInLHRoaXMuJG9ybS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy51c2VyX2lkKTtcbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KSB7XG4gICAgICAgICAgICBzZWxmLm9uY2UoJ2xvZ2dlZC1pbicsZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgICAgIHNlbGYuZ2V0KCdhdXRoX3VzZXInLCB1c2VyKS50aGVuKGFjY2VwdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS4kc2VuZFRvRW5kcG9pbnQgPSBmdW5jdGlvbiAodXJsLCBkYXRhKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLiRwb3N0KHVybCwgZGF0YSk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9naW4odXNlcm5hbWUscGFzc3dvcmQpO1xufVxuIl19
