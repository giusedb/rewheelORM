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
                    if (!this[local_ref]) {
                        return null;
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJjb25uZWN0aW9uLmpzIiwidG91Y2hlci5qcyIsInZhY3V1bWNhY2hlci5qcyIsImF1dG9saW5rZXIuanMiLCJsaXN0Y2FjaGVyLmpzIiwibWFueXRvbWFueS5qcyIsImNhY2hlci5qcyIsIm9ybS5qcyJdLCJuYW1lcyI6WyJIYW5kbGVyIiwiaGFuZGxlcnMiLCJzdHJIYW5kbGVycyIsInByb3RvdHlwZSIsImFkZEhhbmRsZXIiLCJoYW5kbGVyIiwic3RySGFuZGxlciIsInV0aWxzIiwiaGFzaCIsInRvU3RyaW5nIiwicHVzaCIsImhhbmRsZSIsImFyZ3MiLCJBcnJheSIsInNsaWNlIiwiY2FsbCIsImFyZ3VtZW50cyIsImZvckVhY2giLCJmdW5jIiwiYXBwbHkiLCJoYW5kbGVCeSIsInRocyIsIk5hbWVkRXZlbnRNYW5hZ2VyIiwiZXZlbnRzIiwiaGFuZGxlcklkIiwiaWR4SWQiLCJvbiIsIm5hbWUiLCJpZCIsImVtaXQiLCJldmVudCIsInVuYmluZCIsImNvdW50IiwiTGF6eSIsImVhY2giLCJ2IiwiayIsImlkeCIsIm4iLCJyZXZlcnNlIiwieCIsInNwbGljZSIsIm9uY2UiLCJldmVudE5hbWUiLCJoYW5kbGVyRnVuY3Rpb24iLCJzZWxmIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsIm1vY2siLCJyZW5hbWVGdW5jdGlvbiIsImZuIiwiRnVuY3Rpb24iLCJiaW5kIiwiY2FjaGVkIiwia2V5Iiwid3JhcHBlciIsImxvZyIsImNvbnNvbGUiLCJ4ZHIiLCJ1cmwiLCJkYXRhIiwiYXBwbGljYXRpb24iLCJ0b2tlbiIsImZvcm1FbmNvZGUiLCJQcm9taXNlIiwiYWNjZXB0IiwicmVqZWN0IiwicmVxIiwiWE1MSHR0cFJlcXVlc3QiLCJvbnJlYWR5c3RhdGVjaGFuZ2UiLCJyZWFkeVN0YXRlIiwicmVzcG9uc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwicmVzcG9uc2VUZXh0IiwiYSIsInJlc3BvbnNlIiwic3RhdHVzIiwicmVxdWVzdCIsIlhEb21haW5SZXF1ZXN0Iiwib25sb2FkIiwic3RhdHVzVGV4dCIsIkVycm9yIiwib3BlbiIsIm9uZXJyb3IiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiX190b2tlbl9fIiwic2l6ZSIsInN0cmluZ2lmeSIsIm1hcCIsImVuY29kZVVSSSIsInRvQXJyYXkiLCJqb2luIiwic2VuZCIsImNhcGl0YWxpemUiLCJzIiwidG9VcHBlckNhc2UiLCJ0b0xvd2VyQ2FzZSIsInN0ciIsInJldCIsImxlbmd0aCIsImNoYXJDb2RlQXQiLCJtYWtlRmlsdGVyIiwibW9kZWwiLCJmaWx0ZXIiLCJ1bmlmaWVyIiwiZG9udFRyYW5zbGF0ZUZpbHRlciIsInNvdXJjZSIsInZhbHMiLCJmaWVsZCIsImlzQXJyYXkiLCJmaWVsZHMiLCJ0eXBlIiwiY29uc3RydWN0b3IiLCJOdW1iZXIiLCJlcnJvciIsIm9ybSIsInNhbWVBcyIsInkiLCJwbHVyYWxpemUiLCJiZWZvcmVDYWxsIiwiYmVmb3JlIiwiZGVjb3JhdG9yIiwidGhlbiIsImNsZWFuU3RvcmFnZSIsImxvY2FsU3RvcmFnZSIsImtleXMiLCJjbGVhbkRlc2NyaXB0aW9uIiwic3RhcnRzV2l0aCIsImNociIsInNwbGl0IiwicGVybXV0YXRpb25zIiwiYXJyIiwid2FpdEZvciIsImNhbGxCYWNrIiwid2FpdGVyIiwic2V0VGltZW91dCIsImJvb2wiLCJCb29sZWFuIiwibm9vcCIsInR6T2Zmc2V0IiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwidHJhbnNGaWVsZFR5cGUiLCJkYXRlIiwiZGF0ZXRpbWUiLCJzdHJpbmciLCJ0ZXh0IiwiaW50ZWdlciIsInBhcnNlSW50IiwiZmxvYXQiLCJwYXJzZUZsb2F0IiwiU1RBVFVTS0VZIiwiUmVhbHRpbWVDb25uZWN0aW9uIiwiZW5kUG9pbnQiLCJyd3RDb25uZWN0aW9uIiwiY29ubmVjdGlvbiIsIlNvY2tKUyIsIm9ub3BlbiIsInRlbmFudCIsIm9ubWVzc2FnZSIsImUiLCJvbmNsb3NlIiwid3NDb25uZWN0IiwiY2FjaGVkU3RhdHVzIiwiY2xvc2UiLCJyZVdoZWVsQ29ubmVjdGlvbiIsImdldExvZ2luIiwiZW5kc1dpdGgiLCJpc0Nvbm5lY3RlZCIsImlzTG9nZ2VkSW4iLCIkcG9zdCIsInByb21pc2UiLCJ4aHIiLCJmb3JjZSIsInN0YXR1c1dhaXRpbmciLCJ1cGRhdGVTdGF0dXMiLCJsYXN0QnVpbGQiLCJsYXN0X2J1aWxkIiwidXNlcl9pZCIsIm9sZFN0YXR1cyIsImxvZ2luSW5mbyIsIk9iamVjdCIsImxvZ2luIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsIm9iaiIsInJlYWx0aW1lRW5kUG9pbnQiLCJ3c0Nvbm5lY3Rpb24iLCJ1c2VyaWQiLCJsb2dvdXQiLCJvayIsImNvbm5lY3QiLCJUb3VjaGVyIiwidG91Y2hlZCIsInRvdWNoIiwidCIsIlZhY3V1bUNhY2hlciIsImFza2VkIiwicGtJbmRleCIsIm1pc3NpbmciLCJhc2siLCJsYXp5IiwiY29udGFpbnMiLCJnZXRBc2tlZEluZGV4IiwibWlzc2luZ3MiLCJ1bmlxdWUiLCJBdXRvTGlua2VyIiwiYWN0aXZlcyIsIklEQiIsIlcyUFJFU09VUkNFIiwibGlzdENhY2hlIiwibWFpbkluZGV4IiwiZm9yZWlnbktleXMiLCJtMm0iLCJtMm1JbmRleCIsInBlcm1pc3Npb25zIiwiaW5kZXgiLCJnZXRJbmRleEZvciIsInJlZmVyZW5jZXMiLCJyZWZlcmVuY2UiLCJpbmRleE5hbWUiLCJ0byIsInJlZmVyZW5jZWRCeSIsImJ5IiwibWFueVRvTWFueSIsInJlbGF0aW9uIiwiTWFueVRvTWFueVJlbGF0aW9uIiwibTJtR2V0IiwiY29sbGVjdGlvbiIsImdvdERhdGEiLCJnZXRNMk0iLCJsaW5rVW5saW5rZWQiLCJ2YWx1ZXMiLCJzdW0iLCJjaGFuZ2VkIiwiaW5kZXhlcyIsIklOREVYIiwiZ2V0dGVyIiwiaWRzIiwib3RoZXJJbmRleCIsImRlc2NyaWJlIiwiZmxhdHRlbiIsIm1vZGVsTmFtZSIsImlkYiIsImZldGNoIiwibWFpblJlc291cmNlIiwiZmllbGROYW1lIiwidG9PYmplY3QiLCJyZXNvdXJjZU5hbWUiLCJnb3RQZXJtaXNzaW9ucyIsIlBFUk1JU1NJT05TIiwic2V0SW50ZXJ2YWwiLCJMaXN0Q2FjaGVyIiwiZ290QWxsIiwiY29tcG9zaXRlQXNrZWQiLCJjYXJ0ZXNpYW5Qcm9kdWN0MSIsImIiLCJjYXJ0ZXNpYW5Qcm9kdWN0IiwiZXhwbG9kZUZpbHRlciIsInByb2R1Y3QiLCJyIiwiZmlsdGVyU2luZ2xlIiwidGVzdE9ubHkiLCJkaWZmZXJlbmNlIiwiY2xlYW5Db21wb3NpdGVzIiwiZmlsdGVyTGVuIiwiaXRlbXMiLCJpdGVtIiwiZ290Iiwic2luZ2xlIiwic29tZSIsImYiLCJleHBsb2RlZCIsInBhcnRpYWxzIiwiYmFkIiwicGx1Y2siLCJhZGQiLCJmaW5kIiwiZ2V0MCIsImdldDEiLCJkZWwiLCJsIiwiY2FjaGVkUHJvcGVydHlCeUV2ZW50cyIsInByb3RvIiwicHJvcGVydHlOYW1lIiwic2V0dGVyIiwicmVzdWx0IiwicHJvcGVydHlEZWYiLCJ2YWx1ZSIsImlzRmluaXRlIiwiZGVmaW5lUHJvcGVydHkiLCJWYWxpZGF0aW9uRXJyb3IiLCJyZXNvdXJjZSIsIl9yZXNvdXJjZSIsImZvcm1JZHgiLCJlcnJvcnMiLCJiYXNlT1JNIiwib3B0aW9ucyIsImV4dE9STSIsIlN0cmluZyIsImNvbm5lY3RlZCIsIndzIiwiaW5mbyIsIm9uTWVzc2FnZUpzb24iLCJvbk1lc3NhZ2VUZXh0IiwibWVzc2FnZSIsInNlbnREYXRhIiwid2FpdGluZ0Nvbm5lY3Rpb25zIiwiYXV0aF9ncm91cCIsIklEWCIsIlJFVklEWCIsImJ1aWxkZXJIYW5kbGVycyIsImJ1aWxkZXJIYW5kbGVyVXNlZCIsInBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiZXZlbnRIYW5kbGVycyIsInBlcm1pc3Npb25XYWl0aW5nIiwibW9kZWxDYWNoZSIsImZhaWxlZE1vZGVscyIsImxpbmtlciIsIndpbmRvdyIsInZhbGlkYXRpb25FdmVudCIsImN1cnJlbnRDb250ZXh0Iiwic2F2aW5nRXJyb3JIYW5sZGVyIiwiZ2V0SW5kZXgiLCJnZXRVbmxpbmtlZCIsIlVOTElOS0VEIiwiUGVybWlzc2lvblRhYmxlIiwia2xhc3MiLCJzYXZlIiwiY2IiLCJteVBlcm1zIiwiZ3JvdXBfaWQiLCJwZXJtaXNzaW9uTGlzdCIsInAiLCJwZXJtcyIsImFsbFBlcm1pc3Npb25zIiwiaW5kZXhPZiIsIm1ha2VNb2RlbENsYXNzIiwiX21vZGVsIiwicmVhZGFibGUiLCJ3cml0YWJsZSIsInByaXZhdGVBcmdzIiwibWVyZ2UiLCJmdW5jU3RyaW5nIiwiS2xhc3MiLCJyZWZfdHJhbnNsYXRpb25zIiwiaW52ZXJzZV9yZWZlcmVuY2VzIiwicmVmZXJlbnRzIiwiZmllbGRzT3JkZXIiLCJmaWVsZE9yZGVyIiwicmVwcmVzZW50YXRpb24iLCJkZWxldGUiLCJfcGVybWlzc2lvbnMiLCJhbGxfcGVybXMiLCJvYmplY3RfaWQiLCJncm91cGVkIiwidW5rbm93bl9ncm91cHMiLCJncm91cEJ5IiwibyIsImFzUmF3IiwiSUQiLCJhcmciLCJjb250ZXh0IiwiY29weSIsImFzciIsImNvbmNhdCIsInNhdmVNdWx0aSIsIm9iamVjdHMiLCJzY29wZSIsInJhdyIsImRlbGV0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsInNhdmVQQSIsIlQiLCJvbyIsIlBBIiwiRnMiLCJmaWVsZElkeCIsInRhcCIsImluZGV4QnkiLCJ3aWRnZXQiLCJyZWYiLCJleHRfcmVmIiwibG9jYWxfcmVmIiwid2FybiIsIlR5cGVFcnJvciIsInJldkluZGV4IiwiaGFzT3duUHJvcGVydHkiLCJvcHRzIiwiZmlyc3QiLCJvbW9kZWxOYW1lIiwidmFsaWRhdG9ycyIsInVubGlua1JlZmVyZW5jZSIsImluc3RhbmNlIiwiaW5zdGFuY2VzIiwib21vZGVsIiwibGlua1JlZmVyZW5jZSIsInJlZnMiLCJJTkRFWF9NMk0iLCJXMlBfUE9TVCIsIl9leHRyYSIsIlRPT05FIiwiVE9NQU5ZIiwiTUFOWVRPTUFOWSIsIm1vZGVsQ2xhc3MiLCJ6aXAiLCJkZWxldGVkIiwiTVBBIiwicmVjb3JkIiwiaXRhYiIsInRhYmxlIiwiaWsiLCJubmV3IiwidXBkYXRlZCIsIm5ld09iamVjdHMiLCJtb2RlbFJlZmVyZW5jZXMiLCJvbGRJdGVtIiwib2xkQ29weSIsIm5ld0l0ZW0iLCJOYU4iLCJubyIsInRvdGFsUmVzdWx0cyIsImdvdE0yTSIsInJvdyIsIm0iLCJ2ZXJiIiwidG9nZXRoZXIiLCJzZW5kRGF0YSIsIkdPVF9BTEwiLCJnb3RNb2RlbCIsImNhY2hlS2V5IiwibW9kZWxOb3RGb3VuZCIsImFkZE1vZGVsSGFuZGxlciIsImFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiYXR0cmlidXRlcyIsImFkZFByb3BlcnR5IiwidmFsIiwia2F0dHIiLCJzZXQiLCJhdHRycyIsIm5ld0F0dHJzIiwicXVlcnkiLCJmaWx0ZXJGdW5jdGlvbiIsInJlV2hlZWxPUk0iLCJsb2dpbkZ1bmMiLCIkb3JtIiwiZ2V0TW9kZWwiLCJtb2ROYW1lIiwiZ2V0TG9nZ2VkVXNlciIsInVzZXIiLCIkc2VuZFRvRW5kcG9pbnQiXSwibWFwcGluZ3MiOiI7OztJQUFBLGE7SUFFQSxTQUFBQSxPQUFBLEdBQUE7QUFBQSxRQUNBLEtBQUFDLFFBQUEsR0FBQSxFQUFBLENBREE7QUFBQSxRQUVBLEtBQUFDLFdBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxLO0lBR0EsQztJQUVBRixPQUFBLENBQUFHLFNBQUEsQ0FBQUMsVUFBQSxHQUFBLFVBQUFDLE9BQUEsRUFBQTtBQUFBLFFBQ0EsSUFBQUMsVUFBQSxHQUFBQyxLQUFBLENBQUFDLElBQUEsQ0FBQUgsT0FBQSxDQUFBSSxRQUFBLEVBQUEsQ0FBQSxDQURBO0FBQUEsUUFFQSxJQUFBLENBQUEsQ0FBQUgsVUFBQSxJQUFBLEtBQUFKLFdBQUEsQ0FBQSxFQUFBO0FBQUEsWUFDQSxLQUFBQSxXQUFBLENBQUFJLFVBQUEsSUFBQUQsT0FBQSxDQURBO0FBQUEsWUFFQSxLQUFBSixRQUFBLENBQUFTLElBQUEsQ0FBQUwsT0FBQSxFQUZBO0FBQUEsU0FGQTtBQUFBLEtBQUEsQztJQU9BTCxPQUFBLENBQUFHLFNBQUEsQ0FBQVEsTUFBQSxHQUFBLFlBQUE7QUFBQSxRQUNBLElBQUFDLElBQUEsR0FBQUMsS0FBQSxDQUFBVixTQUFBLENBQUFXLEtBQUEsQ0FBQUMsSUFBQSxDQUFBQyxTQUFBLEVBQUEsQ0FBQSxDQUFBLENBREE7QUFBQSxRQUVBLEtBQUFmLFFBQUEsQ0FBQWdCLE9BQUEsQ0FBQSxVQUFBQyxJQUFBLEVBQUE7QUFBQSxZQUNBQSxJQUFBLENBQUFDLEtBQUEsQ0FBQSxJQUFBLEVBQUFQLElBQUEsRUFEQTtBQUFBLFNBQUEsRUFGQTtBQUFBLEtBQUEsQztJQU1BWixPQUFBLENBQUFHLFNBQUEsQ0FBQWlCLFFBQUEsR0FBQSxZQUFBO0FBQUEsUUFDQSxJQUFBUixJQUFBLEdBQUFDLEtBQUEsQ0FBQVYsU0FBQSxDQUFBVyxLQUFBLENBQUFDLElBQUEsQ0FBQUMsU0FBQSxFQUFBLENBQUEsQ0FBQSxDQURBO0FBQUEsUUFFQSxJQUFBSyxHQUFBLEdBQUFMLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FGQTtBQUFBLFFBR0EsS0FBQWYsUUFBQSxDQUFBZ0IsT0FBQSxDQUFBLFVBQUFDLElBQUEsRUFBQTtBQUFBLFlBQ0FBLElBQUEsQ0FBQUMsS0FBQSxDQUFBRSxHQUFBLEVBQUFULElBQUEsRUFEQTtBQUFBLFNBQUEsRUFIQTtBQUFBLEtBQUEsQztJQVNBLFNBQUFVLGlCQUFBLEdBQUE7QUFBQSxRQUNBLElBQUFDLE1BQUEsR0FBQSxFQUFBLENBREE7QUFBQSxRQUVBLElBQUFDLFNBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxRQUdBLElBQUFDLEtBQUEsR0FBQSxDQUFBLENBSEE7QUFBQSxRQUlBLEtBQUFDLEVBQUEsR0FBQSxVQUFBQyxJQUFBLEVBQUFULElBQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQSxDQUFB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QUFBLEVBQUE5VSxJQUFBLENBQUExRCxNQUFBLEVBREE7QUFBQSxpQkFBQSxFQURBO0FBQUEsYUFBQSxDQUFBLENBREE7QUFBQSxTQUpBO0FBQUEsS0FBQSxDO0lBYUFrWSxVQUFBLENBQUFwYyxTQUFBLENBQUEyYyxlQUFBLEdBQUEsVUFBQS9ZLEdBQUEsRUFBQUMsSUFBQSxFQUFBO0FBQUEsUUFDQSxPQUFBLEtBQUF5WSxJQUFBLENBQUExUixLQUFBLENBQUFoSCxHQUFBLEVBQUFDLElBQUEsQ0FBQSxDQURBO0FBQUEsS0FBQSxDO0lBSUF1WSxVQUFBLENBQUFwYyxTQUFBLENBQUF3TCxLQUFBLEdBQUEsVUFBQUMsUUFBQSxFQUFBQyxRQUFBLEVBQUE7QUFBQSxRQUNBLE9BQUEsS0FBQTRRLElBQUEsQ0FBQXpTLFVBQUEsQ0FBQTJCLEtBQUEsQ0FBQUMsUUFBQSxFQUFBQyxRQUFBLENBQUEsQ0FEQTtBQUFBLEtBQUEsQyIsImZpbGUiOiJyd3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEhhbmRsZXIoKXtcbiAgICB0aGlzLmhhbmRsZXJzID0gW107XG4gICAgdGhpcy5zdHJIYW5kbGVycyA9IHt9O1xufTtcblxuSGFuZGxlci5wcm90b3R5cGUuYWRkSGFuZGxlciA9IGZ1bmN0aW9uIChoYW5kbGVyKXtcbiAgICB2YXIgc3RySGFuZGxlciA9IHV0aWxzLmhhc2goaGFuZGxlci50b1N0cmluZygpKTtcbiAgICBpZiAoIShzdHJIYW5kbGVyIGluIHRoaXMuc3RySGFuZGxlcnMpKXtcbiAgICAgICAgdGhpcy5zdHJIYW5kbGVyc1tzdHJIYW5kbGVyXSA9IGhhbmRsZXI7XG4gICAgICAgIHRoaXMuaGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9XG59O1xuSGFuZGxlci5wcm90b3R5cGUuaGFuZGxlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywwKTtcbiAgICB0aGlzLmhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oZnVuYyl7XG4gICAgICAgIGZ1bmMuYXBwbHkobnVsbCxhcmdzKTtcbiAgICB9KVxufTtcbkhhbmRsZXIucHJvdG90eXBlLmhhbmRsZUJ5ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKTtcbiAgICB2YXIgdGhzID0gYXJndW1lbnRzWzBdO1xuICAgIHRoaXMuaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihmdW5jKXtcbiAgICAgICAgZnVuYy5hcHBseSh0aHMsYXJncyk7XG4gICAgfSlcbn07XG5cblxuZnVuY3Rpb24gTmFtZWRFdmVudE1hbmFnZXIgKCl7XG4gICAgdmFyIGV2ZW50cyA9IHt9O1xuICAgIHZhciBoYW5kbGVySWQgPSB7fTtcbiAgICB2YXIgaWR4SWQgPSAwO1xuICAgIHRoaXMub24gPSBmdW5jdGlvbihuYW1lLCBmdW5jKXtcbiAgICAgICAgaWYgKCEobmFtZSBpbiBldmVudHMpKXtcbiAgICAgICAgICAgIGV2ZW50c1tuYW1lXSA9IG5ldyBBcnJheSgpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpZCA9IGlkeElkICsrO1xuICAgICAgICBldmVudHNbbmFtZV0ucHVzaChmdW5jKTtcbiAgICAgICAgaGFuZGxlcklkW2lkXSA9IGZ1bmM7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9O1xuICAgIHRoaXMuZW1pdCA9IGZ1bmN0aW9uKG5hbWUpe1xuICAgICAgICBpZiAobmFtZSBpbiBldmVudHMpe1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSk7XG4gICAgICAgICAgICBldmVudHNbbmFtZV0uZm9yRWFjaChmdW5jdGlvbihldmVudCl7XG4gICAgICAgICAgICAgICAgZXZlbnQuYXBwbHkobnVsbCxhcmdzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLnVuYmluZCA9IGZ1bmN0aW9uKGhhbmRsZXIpe1xuICAgICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgICBpZiAoaGFuZGxlciBpbiBoYW5kbGVySWQpe1xuICAgICAgICAgICAgdmFyIGZ1bmMgPSBoYW5kbGVySWRbaGFuZGxlciArICcnXTtcbiAgICAgICAgICAgIExhenkoZXZlbnRzKS5lYWNoKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIG4gaW4gdil7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2W25dID09PSBmdW5jKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkeC5wdXNoKG4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZHgucmV2ZXJzZSgpLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgIHYuc3BsaWNlKHgsMSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgaGFuZGxlcklkW2hhbmRsZXJdO1xuICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDYWxsIGV2ZW50IG9uY2VcbiAgICAgKi9cbiAgICB0aGlzLm9uY2UgPSBmdW5jdGlvbihldmVudE5hbWUsIGhhbmRsZXJGdW5jdGlvbikge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBoYW5kbGVyID0gdGhpcy5vbihldmVudE5hbWUsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBoYW5kbGVyRnVuY3Rpb24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHNlbGYudW5iaW5kKGhhbmRsZXIpO1xuICAgICAgICB9KVxuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNhY2hlZEtleUlkeCA9IDA7XG5cbnZhciBudWxsU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiAnJ307XG5cbmZ1bmN0aW9uIG1vY2tPYmplY3QoKXtcbiAgICByZXR1cm4gbmV3IFByb3h5KHt9LCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24odGFyZ2V0LCBuYW1lKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG5hbWUgID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgaWYgKG5hbWUgPT09ICd0b1N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGxTdHJpbmc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHV0aWxzLm1vY2s7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0W25hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSlcbn1cblxuLypcbnZhciAkUE9TVCA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgY2FsbEJhY2ssIGVycm9yQmFjayxoZWFkZXJzKXtcbiAgICB2YXIgb3B0cyA9IHtcbiAgICAgICAgYWNjZXB0cyA6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgdXJsIDogdXJsLFxuICAgICAgICBkYXRhIDogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIGRhdGFUeXBlIDogJ2pzb24nLFxuICAgICAgICBzdWNjZXNzIDogY2FsbEJhY2ssXG4gICAgICAgIGVycm9yIDogZXJyb3JCYWNrLFxuICAgICAgICBtZXRob2QgOiAnUE9TVCcsXG4gICAgICAgIGNvbnRlbnRUeXBlIDogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgfTtcbiAgICBpZiAoaGVhZGVycyl7XG4gICAgICAgIG9wdHMuaGVhZGVycyA9IGhlYWRlcnM7XG4gICAgICAgIG9wdHMuY3Jvc3NEb21haW4gPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gJC5hamF4KG9wdHMpO1xufVxuXG5cbmZ1bmN0aW9uIHJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBnZXRMb2dpbil7XG4gICAgLy8gbWFpbiBcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5nZXRMb2dpbiA9IGdldExvZ2luO1xuICAgIHRoaXMuZXZlbnRzID0gbmV3IE5hbWVkRXZlbnRNYW5hZ2VyKClcbiAgICB0aGlzLiRQT1NUID0gJFBPU1QuYmluZCh0aGlzKTtcbiAgICB0aGlzLm9wdGlvbnMgPSB7ZW5kUG9pbnQgOiBlbmRQb2ludH07XG4gICAgdGhpcy5vbiA9IHRoaXMuZXZlbnRzLm9uLmJpbmQodGhpcyk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24oc3RhdHVzLCBjYWxsQmFjaywgZXJyb3IpIHtcbiAgICBpZiAoc3RhdHVzKSB7XG4gICAgICAgIHZhciBpc0xvZ2dlZCA9IChzdGF0dXMudXNlcl9pZCAmJiAhdGhpcy5vcHRpb25zLnVzZXJfaWQgKTtcbiAgICAgICAgZm9yICh2YXIgeCBpbiBzdGF0dXMpeyB0aGlzLm9wdGlvbnNbeF0gPSBzdGF0dXNbeF07IH1cbiAgICAgICAgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMgPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xuICAgICAgICBpZiAoaXNMb2dnZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzLmVtaXQoJ2xvZ2luJywgdGhpcy5vcHRpb25zLnVzZXJfaWQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5vcHRpb25zLnVzZXJfaWQgJiYgdGhpcy5nZXRMb2dpbil7XG4gICAgICAgIHZhciBsb2dJbmZvID0gdGhpcy5nZXRMb2dpbihlcnJvcik7XG4gICAgICAgIGlmIChsb2dJbmZvLmNvbnN0cnVjdG9yID09PSBPYmplY3Qpe1xuICAgICAgICAgICAgdGhpcy5sb2dpbihsb2dJbmZvLnVzZXJuYW1lLCBsb2dJbmZvLnBhc3N3b3JkKVxuICAgICAgICAgICAgLnRoZW4oKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoc3RhdHVzLCBjYWxsQmFjayk7XG4gICAgICAgICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfSBlbHNlIGlmIChsb2dJbmZvLmNvbnN0cnVjdG9yID09PSBQcm9taXNlKSB7XG4gICAgICAgICAgICBsb2dJbmZvLnRoZW4oKGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgICAgICAgdmFyIHggPSB0aGlzLmxvZ2luKG9iai51c2VybmFtZSxvYmoucGFzc3dvcmQpO1xuICAgICAgICAgICAgICAgIHZhciBtYW5hZ2VFcnJvciA9IChmdW5jdGlvbihiYWQpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhudWxsLGNhbGxCYWNrLGJhZC5lcnJvcik7XG4gICAgICAgICAgICAgICAgfSkuYmluZCh0aGlzKTtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbEJhY2spe1xuICAgICAgICAgICAgICAgICAgICB4LnRoZW4oY2FsbEJhY2ssbWFuYWdlRXJyb3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHgudGhlbihudWxsLCBtYW5hZ2VFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayh0aGlzLm9wdGlvbnMpO1xuICAgIH0gICAgXG59XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5zdGF0dXMgPSBmdW5jdGlvbihjYWxsQmFjaywgZm9yY2Upe1xuICAgIGlmICgoJ2xhc3RSV1RTdGF0dXMnIGluIGxvY2FsU3RvcmFnZSkgJiYgIWZvcmNlKSB7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHZhciBzdGF0dXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHN0YXR1cyxjYWxsQmFjayk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzKGNhbGxCYWNrLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3N0YXR1c19jYWxsaW5nKXtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5zdGF0dXMoY2FsbEJhY2spO1xuICAgICAgICB9LDUwKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMudGltZXN0YW1wKXtcbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sodGhpcy5vcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGF0dXNfY2FsbGluZyA9IHRydWU7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHRoaXMuJHBvc3QoJ2FwaS9zdGF0dXMnLG51bGwsZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgICAgIHNlbGYuX3N0YXR1c19jYWxsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZVN0YXR1cyhzdGF0dXMsY2FsbEJhY2spO1xuICAgICAgICB9KTsgICAgICAgIFxuICAgIH1cbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS4kcG9zdCA9IGZ1bmN0aW9uKHVybCwgZGF0YSxjYWxsQmFjayl7XG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgaWYgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMudG9rZW4pe1xuICAgICAgICBpZiAoIWRhdGEpe1xuICAgICAgICAgICAgZGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMudG9rZW4pe1xuICAgICAgICB2YXIgaGVhZGVycyA9IHsgXG4gICAgICAgICAgICB0b2tlbiA6IHRoaXMub3B0aW9ucy50b2tlbixcbiAgICAgICAgICAgIGFwcGxpY2F0aW9uIDogdGhpcy5vcHRpb25zLmFwcGxpY2F0aW9uXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGhlYWRlcnMgPSBudWxsO1xuICAgIH1cblxuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih0aHMub3B0aW9ucy5lbmRQb2ludCArIHVybCwgZGF0YSwgdGhzLm9wdGlvbnMuYXBwbGljYXRpb24sIHRocy5vcHRpb25zLnRva2VuKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UnLCB4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cyArICctanNvbicsIHhoci5yZXNwb25zZURhdGEsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYWxsQmFjaykgeyBjYWxsQmFjayggeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0ICl9O1xuICAgICAgICAgICAgICAgIGFjY2VwdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItanNvbi0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlRGF0YSx1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItaHR0cCcseGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cyx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWh0dHAtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIHZhciB1cmwgPSB0aGlzLm9wdGlvbnMuZW5kUG9pbnQgKyAnYXBpL2xvZ2luJztcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodXJsLHsgdXNlcm5hbWU6IHVzZXJuYW1lLCBwYXNzd29yZCA6IHBhc3N3b3JkfSwgbnVsbCxjb25uZWN0aW9uLm9wdGlvbnMudG9rZW4sIHRydWUpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24udXBkYXRlU3RhdHVzKHhoci5yZXNwb25zZURhdGEpO1xuICAgICAgICAgICAgICAgIGFjY2VwdChzdGF0dXMpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbihjYWxsQmFjayl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB3c2Nvbm5lY3QgPSBmdW5jdGlvbihzZWxmKXtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24gPSBuZXcgdXRpbHMud3NDb25uZWN0KHNlbGYub3B0aW9ucyk7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uLm9uQ29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5ldmVudHMuZW1pdCgnd3MtY29ubmVjdGVkJywgc2VsZi53c0Nvbm5lY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24ub25EaXNjb25uZWN0KGZ1bmN0aW9uKCl7IFxuICAgICAgICAgICAgaWYgKHNlbGYub3B0aW9ucyAmJiBzZWxmLm9wdGlvbnMucmVhbHRpbWVFbmRQb2ludCl7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB3c2Nvbm5lY3Qoc2VsZik7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH0sMTAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gdGhpcy5zdGF0dXMoKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgIGlmICgndG9rZW4nIGluIHNlbGYub3B0aW9ucyl7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhzdGF0dXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RpbmcgdG8gJyArIHNlbGYub3B0aW9ucy5lbmRQb2ludCk7XG4gICAgICAgICAgICBpZiAoc2VsZi5vcHRpb25zLnVzZXJuYW1lICYmIHNlbGYub3B0aW9ucy5wYXNzd29yZCl7XG4gICAgICAgICAgICAgICAgc2VsZi5sb2dpbihcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLnVzZXJuYW1lLFxuICAgICAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMucGFzc3dvcmQsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncmVuZXdpbmcgY29ubmVjdGlvbicpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNlbGYub3B0aW9ucy50b2tlbiAmJiBzZWxmLm9wdGlvbnMucmVhbHRpbWVFbmRQb2ludCAmJiAoIXNlbGYud3NDb25uZWN0aW9uKSl7XG4gICAgICAgICAgICB3c2Nvbm5lY3Qoc2VsZik7XG4gICAgICAgIH1cbiAgICB9KS5iaW5kKHRoaXMpKTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dPdXQgPSBmdW5jdGlvbih1cmwsIGNhbGxCYWNrKXtcbiAgICByZXR1cm4gdGhpcy4kcG9zdCgnYXBpL2xvZ291dCcse30sKGZ1bmN0aW9uKHN0YXR1cykge1xuICAgICAgICBpZiAoJ2xhc3RSV1RTdGF0dXMnIGluIGxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHtlbmRQb2ludDogdGhpcy5vcHRpb25zLmVuZFBvaW50fTtcbiAgICAgICAgaWYgKHRoaXMud3NDb25uZWN0aW9uKSB7IFxuICAgICAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICAgICAgICAgIHRoaXMud3NDb25uZWN0aW9uID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodXJsKSB7IGxvY2F0aW9uID0gdXJsOyB9XG4gICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgfSkuYmluZCh0aGlzKSk7XG59XG4qL1xudmFyIHV0aWxzID0ge1xuICAgIHJlbmFtZUZ1bmN0aW9uIDogZnVuY3Rpb24gKG5hbWUsIGZuKSB7XG4gICAgICAgIHJldHVybiAobmV3IEZ1bmN0aW9uKFwicmV0dXJuIGZ1bmN0aW9uIChjYWxsKSB7IHJldHVybiBmdW5jdGlvbiBcIiArIG5hbWUgK1xuICAgICAgICAgICAgXCIgKCkgeyByZXR1cm4gY2FsbCh0aGlzLCBhcmd1bWVudHMpIH07IH07XCIpKCkpKEZ1bmN0aW9uLmFwcGx5LmJpbmQoZm4pKTtcbiAgICB9LFxuICAgIGNhY2hlZCA6IGZ1bmN0aW9uKGZ1bmMsIGtleSl7XG4gICAgICAgIGlmICgha2V5KXsgICAgXG4gICAgICAgICAgICBrZXkgPSAnXycgKyBjYWNoZWRLZXlJZHgrKztcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiB3cmFwcGVyKCl7XG4gICAgICAgICAgICBpZiAoIXRoaXNba2V5XSl7XG4gICAgICAgICAgICAgICAgdGhpc1trZXldID0gZnVuYy5jYWxsKHRoaXMsW2FyZ3VtZW50c10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNba2V5XTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHdyYXBwZXI7XG4gICAgfSxcbi8vICAgICRQT1NUIDogJFBPU1QsXG4vLyAgICByZVdoZWVsQ29ubmVjdGlvbjogcmVXaGVlbENvbm5lY3Rpb24sXG4gICAgbG9nOiBmdW5jdGlvbigpeyBcbiAgICAgICAgY29uc29sZS5sb2coYXJndW1lbnRzKTtcbiAgICB9LFxuXG4gICAgeGRyOiBmdW5jdGlvbiAodXJsLCBkYXRhLCBhcHBsaWNhdGlvbix0b2tlbiwgZm9ybUVuY29kZSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogTWFrZSBhbiBIVFRQIFJlcXVlc3QgYW5kIHJldHVybiBpdHMgcHJvbWlzZS5cbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIHJlcTtcbiAgICAgICAgICAgIGlmICghZGF0YSkgeyBkYXRhID0ge307fVxuXG4gICAgICAgICAgICBpZihYTUxIdHRwUmVxdWVzdCkge1xuICAgICAgICAgICAgICAgIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2VEYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZSA9IHtyZXNwb25zZURhdGE6IHJlc3BvbnNlRGF0YSwgcmVzcG9uc2VUZXh0OiByZXEucmVzcG9uc2VUZXh0LHN0YXR1czogcmVxLnN0YXR1cywgcmVxdWVzdDogcmVxfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXEuc3RhdHVzID49IDIwMCAmJiByZXEuc3RhdHVzIDwgNDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYoWERvbWFpblJlcXVlc3Qpe1xuICAgICAgICAgICAgICAgIHJlcSA9IG5ldyBYRG9tYWluUmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgIHJlcS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgYWNjZXB0KHJlcS5yZXNwb25zZVRleHQscmVxLnN0YXR1c1RleHQsIHJlcSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignQ09SUyBub3Qgc3VwcG9ydGVkJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXEub3BlbignUE9TVCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgICAgICByZXEub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgICAgICBpZiAodG9rZW4pIHsgZGF0YS5fX3Rva2VuX18gPSB0b2tlbiB9XG4gICAgICAgICAgICBpZiAoIWZvcm1FbmNvZGUpe1xuICAgICAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCd0ZXh0L3BsYWluJyk7XG4gICAgICAgICAgICAgICAgZGF0YSA9IExhenkoZGF0YSkuc2l6ZSgpP0pTT04uc3RyaW5naWZ5KGRhdGEpOicnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyk7XG4gICAgICAgICAgICAgICAgZGF0YSA9IExhenkoZGF0YSkubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gayArICc9JyArIGVuY29kZVVSSSh2LnRvU3RyaW5nKCkpOyAgXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpLmpvaW4oJyYnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcS5zZW5kKGRhdGEpO1xuICAgIC8vICAgICAgICByZXEuc2VuZChudWxsKTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIGNhcGl0YWxpemUgOiBmdW5jdGlvbiAocykge1xuICAgICAgICByZXR1cm4gc1swXS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgIH0sXG5cbiAgICBoYXNoIDogZnVuY3Rpb24oc3RyKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhhc2hlZCBmdW5jdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgc3RyID0gc3RyLnRvU3RyaW5nKCk7XG4gICAgICAgIHZhciByZXQgPSAxO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDt4PHN0ci5sZW5ndGg7eCsrKXtcbiAgICAgICAgICAgIHJldCAqPSAoMSArIHN0ci5jaGFyQ29kZUF0KHgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHJldCAlIDM0OTU4Mzc0OTU3KS50b1N0cmluZygpO1xuICAgIH0sXG5cbiAgICBtYWtlRmlsdGVyIDogZnVuY3Rpb24gKG1vZGVsLCBmaWx0ZXIsIHVuaWZpZXIsIGRvbnRUcmFuc2xhdGVGaWx0ZXIpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ha2UgZmlsdGVyIGZvciBBcnJheS5maWx0ZXIgZnVuY3Rpb24gYXMgYW4gYW5kIG9mIG9yXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoIXVuaWZpZXIpIHsgdW5pZmllciA9ICcgJiYgJzt9XG4gICAgICAgIGlmIChMYXp5KGZpbHRlcikuc2l6ZSgpID09PSAwKXtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KXsgcmV0dXJuIHRydWUgfTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc291cmNlID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2YWxzLCBmaWVsZCl7XG4gICAgICAgICAgICBpZiAoIXZhbHMpIHsgdmFscyA9IFtudWxsXX1cbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWxzKSl7XG4gICAgICAgICAgICAgICAgdmFscyA9IFt2YWxzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZG9udFRyYW5zbGF0ZUZpbHRlciAmJiAobW9kZWwuZmllbGRzW2ZpZWxkXS50eXBlID09PSAncmVmZXJlbmNlJykpIHtcbiAgICAgICAgICAgICAgICBmaWVsZCA9ICdfJyArIGZpZWxkO1xuICAgICAgICAgICAgICAgIHZhbHMgPSBMYXp5KHZhbHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHggJiYgKHguY29uc3RydWN0b3IgIT09IE51bWJlcikpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobW9kZWwuZmllbGRzW2ZpZWxkXS50eXBlID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgdmFscyA9IHZhbHMubWFwKEpTT04uc3RyaW5naWZ5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAnKCcgKyAgTGF6eSh2YWxzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgaWYgKCF4KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ21ha2VGaWx0ZXIgeCBpcyBudWxsJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmKHggPT09IG9ybS51dGlscy5tb2NrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ21ha2VGaWx0ZXIgd2l0aCBNb2NrIE9iamVjdCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gJyh4LicgKyBmaWVsZCArICcgPT09ICcgKyB4ICsgJyknO1xuICAgICAgICAgICAgfSkuam9pbignIHx8ICcpICArJyknO1xuICAgICAgICB9KS50b0FycmF5KCkuam9pbih1bmlmaWVyKTtcbiAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcInhcIiwgXCJyZXR1cm4gXCIgKyBzb3VyY2UpO1xuICAgIH0sXG5cbiAgICBzYW1lQXMgOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogRGVlcCBlcXVhbFxuICAgICAgICAgKi9cbiAgICAgICAgZm9yICh2YXIgayBpbiB4KSB7XG4gICAgICAgICAgICBpZiAoeVtrXSAhPSB4W2tdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgcGx1cmFsaXplIDogZnVuY3Rpb24oc3RyLCBtb2RlbCl7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMZXhpY2FsbHkgcmV0dXJucyBlbmdsaXNoIHBsdXJhbCBmb3JtXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gc3RyICsgJ3MnO1xuICAgIH0sXG5cbiAgICBiZWZvcmVDYWxsIDogZnVuY3Rpb24oZnVuYywgYmVmb3JlKXtcbiAgICAgICAgdmFyIGRlY29yYXRvciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBiZWZvcmUoKS50aGVuKGZ1bmMpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBkZWNvcmF0b3I7XG4gICAgfSxcblxuICAgIGNsZWFuU3RvcmFnZSA6IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDbGVhbiBsb2NhbFN0b3JhZ2Ugb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBMYXp5KGxvY2FsU3RvcmFnZSkua2V5cygpLmVhY2goZnVuY3Rpb24oayl7XG4gICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW2tdO1xuICAgICAgICB9KVxuICAgIH0sXG5cbiAgICBjbGVhbkRlc2NyaXB0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgTGF6eShsb2NhbFN0b3JhZ2UpXG4gICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHYsIG4pIHsgcmV0dXJuIExhenkobikuc3RhcnRzV2l0aCgnZGVzY3JpcHRpb246Jyl9KVxuICAgICAgICAgICAgLmtleXMoKVxuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24obikgeyBkZWxldGUgbG9jYWxTdG9yYWdlW25dIH0pO1xuICAgIH0sXG4gICAgXG4gICAgcmV2ZXJzZSA6IGZ1bmN0aW9uIChjaHIsIHN0cikge1xuICAgICAgICByZXR1cm4gc3RyLnNwbGl0KGNocikucmV2ZXJzZSgpLmpvaW4oY2hyKTtcbiAgICB9LFxuICAgIHBlcm11dGF0aW9uczogZnVuY3Rpb24oYXJyKXtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBmb3IgKHZhciB4ID0gYXJyLmxlbmd0aC0xOyB4ID49IDA7eC0tKXtcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSBhcnIubGVuZ3RoLTE7IHkgPj0gMDsgeS0tKXtcbiAgICAgICAgICAgICAgICBpZiAoeCAhPT0geSlcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goW2Fyclt4XSwgYXJyW3ldXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuXG4gICAgd2FpdEZvcjogZnVuY3Rpb24oZnVuYywgY2FsbEJhY2spIHtcbiAgICAgICAgdmFyIHdhaXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGZ1bmMoKSkge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQod2FpdGVyLDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc2V0VGltZW91dCh3YWl0ZXIsIDUwMCk7XG4gICAgfSxcblxuICAgIGJvb2w6IEJvb2xlYW4sXG5cbiAgICBub29wIDogZnVuY3Rpb24oKXt9LFxuXG4gICAgdHpPZmZzZXQ6IG5ldyBEYXRlKCkuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIDYwMDAwLFxuXG4gICAgdHJhbnNGaWVsZFR5cGU6IHtcbiAgICAgICAgZGF0ZTogZnVuY3Rpb24oeCkgeyByZXR1cm4gbmV3IERhdGUoeCAqIDEwMDAgKyB1dGlscy50ek9mZnNldCApIH0sXG4gICAgICAgIGRhdGV0aW1lOiBmdW5jdGlvbih4KSB7IHJldHVybiBuZXcgRGF0ZSh4ICogMTAwMCArIHV0aWxzLnR6T2Zmc2V0ICkgfSxcbiAgICAgICAgc3RyaW5nOiBmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvU3RyaW5nKCk7IH0sXG4gICAgICAgIHRleHQ6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG9TdHJpbmcoKTsgfSxcbiAgICAgICAgaW50ZWdlcjogZnVuY3Rpb24oeCkgeyByZXR1cm4gcGFyc2VJbnQoeCk7IH0sXG4gICAgICAgIGZsb2F0OiBmdW5jdGlvbih4KSB7IHJldHVybiBwYXJzZUZsb2F0KHgpOyB9XG4gICAgfSwgXG4gICAgbW9jayA6IG1vY2tPYmplY3QoKVxufTtcblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBTVEFUVVNLRVkgPSAnbGFzdFJXVENvbm5lY3Rpb25TdGF0dXMnO1xuXG5mdW5jdGlvbiBSZWFsdGltZUNvbm5lY3Rpb24oZW5kUG9pbnQsIHJ3dENvbm5lY3Rpb24pe1xuICAgIC8qKlxuICAgICAqIENvbm5lY3RzIGEgd2Vic29ja2V0IHdpdGggcmVXaGVlbCBjb25uZWN0aW9uXG4gICAgICovXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgU29ja0pTKGVuZFBvaW50KTtcbiAgICBjb25uZWN0aW9uLm9ub3BlbiA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdvcGVuIDogJyArIHgpO1xuICAgICAgICBjb25uZWN0aW9uLnRlbmFudCgpO1xuICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLWNvbm5lY3Rpb24tb3BlbicseCk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9ubWVzc2FnZSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGlmICh4LnR5cGUgPT0gJ21lc3NhZ2UnKSB7XG4gICAgICAgICAgICAvLyQubm90aWZ5KHguZGF0YSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vVE9ETyBzZXQgZnJvbVJlYWx0aW1lXG4gICAgICAgICAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1tZXNzYWdlLWpzb24nLCBKU09OLnBhcnNlKHguZGF0YSkpO1xuICAgICAgICAgICAgICAgIC8vVE9ETyB1bnNldCBmcm9tUmVhbHRpbWVcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtbWVzc2FnZS10ZXh0JywgSlNPTi5wYXJzZSh4LmRhdGEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmcm9tIHJlYWx0aW1lICcseCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGNvbm5lY3Rpb24ub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2V0VGltZW91dCh1dGlscy53c0Nvbm5lY3QsMTAwMCk7XG4gICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtY29ubmVjdGlvbi1jbG9zZWQnKTtcbiAgICB9O1xuICAgIGNvbm5lY3Rpb24udGVuYW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25uZWN0aW9uLnNlbmQoJ1RFTkFOVDonICsgcnd0Q29ubmVjdGlvbi5jYWNoZWRTdGF0dXMuYXBwbGljYXRpb24gKyAnOicgKyByd3RDb25uZWN0aW9uLmNhY2hlZFN0YXR1cy50b2tlbik7XG4gICAgfVxuICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgIH1cbn0gICAgXG5cbmZ1bmN0aW9uIHJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBnZXRMb2dpbil7XG4gICAgLyoqXG4gICAgICogQ29ubmVjdGlvbiBiYXNpYyBmb3IgcmVXaGVlbFxuICAgICAqIEBwYXJhbSBlbmRQb2ludDogc3RyaW5nIGJhc2UgdXJsIGZvciBhbGwgY29tdW5pY2F0aW9uXG4gICAgICogQHBhcmFtIGdldExvZ2luOiBmdW5jdGlvbiB0byBiZSBjYWxsZWQgaW4gY2FzZSBvZiBtaXNzaW5nIGxvZ2luLlxuICAgICAqICB0aGlzIGZ1bmN0aW9uIGNvdWxkIHJldHVybiA6XG4gICAgICogIC0gICBhIHsgdXNlcm5hbWUgOiA8dXNlcm5hbWU+ICwgcGFzc3dvcmQ6IDxwYXNzd29yZD59IG9yXG4gICAgICogIC0gICBiIFByb21pc2UgLT4geyB1c2VybmFtZSA6IDx1c2VybmFtZT4gLCBwYXNzd29yZDogPHBhc3N3b3JkPn1cbiAgICAgKi9cbiAgICAvLyBtYWluIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIGV2ZW50cyA9IG5ldyBOYW1lZEV2ZW50TWFuYWdlcigpO1xuICAgIHRoaXMuZ2V0TG9naW4gPSBnZXRMb2dpbjtcbiAgICB0aGlzLmVuZFBvaW50ID0gZW5kUG9pbnQuZW5kc1dpdGgoJy8nKT8gZW5kUG9pbnQ6IChlbmRQb2ludCArICcvJyk7XG4gICAgdGhpcy5vbiA9IGV2ZW50cy5vbjtcbiAgICB0aGlzLnVuYmluZCA9IGV2ZW50cy51bmJpbmQ7XG4gICAgdGhpcy5lbWl0ID0gZXZlbnRzLmVtaXQ7XG4gICAgdGhpcy5vbmNlID0gZXZlbnRzLm9uY2U7XG4gICAgdGhpcy5jYWNoZWRTdGF0dXMgPSB7fTtcbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2U7XG4gICAgdGhpcy5pc0xvZ2dlZEluID0gZmFsc2U7XG4gICAgLy8gcmVnaXN0ZXJpbmcgdXBkYXRlIHN0YXR1c1xuICAgIHZhciB0aHMgPSB0aGlzO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLiRwb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLGNhbGxCYWNrKXtcbiAgICAvKipcbiAgICAgKiBBSkFYIGNhbGwgZm9yIGZldGNoIGFsbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICogQHBhcmFtIHVybDogbGFzdCB1cmwgcGFydCBmb3IgYWpheCBjYWxsXG4gICAgICogQHBhcmFtIGRhdGE6IGRhdGEgb2JqZWN0IHRvIGJlIHNlbnRcbiAgICAgKiBAcGFyYW0gY2FsbEJhY2s6IGZ1bmN0aW9uKHhocikgd2lsbCBiZSBjYWxsZWQgd2hlbiBkYXRhIGFycml2ZXNcbiAgICAgKiBAcmV0dXJucyBQcm9taXNlPHhocj4gc2FtZSBvZiBjYWxsQmFja1xuICAgICAqL1xuICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5lbmRQb2ludCArIHVybCwgZGF0YSwgdGhzLmNhY2hlZFN0YXR1cy5hcHBsaWNhdGlvbiwgdGhzLmNhY2hlZFN0YXR1cy50b2tlbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2h0dHAtcmVzcG9uc2UnLCB4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIHRocy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMgKyAnLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FsbEJhY2spIHsgY2FsbEJhY2soIHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCApfTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1qc29uLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VEYXRhLHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWh0dHAnLHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWh0dHAtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xuXG4vKipcbiAqIENoZWNrIGN1cnJlbnQgc3RhdHVzIGFuZCBjYWxsYmFjayBmb3IgcmVzdWx0cy5cbiAqIEl0IGNhY2hlcyByZXN1bHRzIGZvciBmdXJ0aGVyLlxuICogQHBhcmFtIGNhbGxiYWNrOiAoc3RhdHVzIG9iamVjdClcbiAqIEBwYXJhbSBmb3JjZTogYm9vbGVhbiBpZiB0cnVlIGVtcHRpZXMgY2FjaGUgIFxuICogQHJldHVybiB2b2lkXG4gKi9cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5zdGF0dXMgPSBmdW5jdGlvbihjYWxsQmFjaywgZm9yY2UpIHtcbiAgICAvLyBpZiBmb3JjZSwgY2xlYXIgYWxsIGNhY2hlZCB2YWx1ZXNcbiAgICB2YXIga2V5ID0gJ3Rva2VuOicgKyB0aGlzLmVuZFBvaW50O1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIGlmIChmb3JjZSkge1xuICAgICAgICB0aGlzLmNhY2hlZFN0YXR1cyA9IHt9O1xuICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW2tleV07XG4gICAgfVxuICAgIGlmICh0aGlzLnN0YXR1c1dhaXRpbmcpIHtcbiAgICAgICAgLy8gd2FpdCBmb3Igc3RhdHVzXG4gICAgICAgIHV0aWxzLndhaXRGb3IoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gIXRocy5zdGF0dXNXYWl0aW5nO1xuICAgICAgICB9LCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhzLnN0YXR1cyhjYWxsQmFjayxmb3JjZSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIHRyeSBmb3IgdmFsdWUgcmVzb2x1dGlvblxuICAgIC8vIGZpcnN0IG9uIG1lbW9yeVxuICAgIGlmIChMYXp5KHRoaXMuY2FjaGVkU3RhdHVzKS5zaXplKCkpe1xuICAgICAgICBjYWxsQmFjayh0aGlzLmNhY2hlZFN0YXR1cylcbiAgICAvLyB0aGVuIGluIGxvY2FsU3RvcmFnZVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBkYXRhID0ge307XG4gICAgICAgIGlmIChrZXkgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICBkYXRhLl9fdG9rZW5fXyA9IGxvY2FsU3RvcmFnZVtrZXldO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhdHVzV2FpdGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuJHBvc3QoJ2FwaS9zdGF0dXMnLGRhdGEsIGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICB0aHMudXBkYXRlU3RhdHVzKHN0YXR1cyk7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Vba2V5XSA9IHN0YXR1cy50b2tlbjtcbiAgICAgICAgICAgIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgICAgICAgICB0aHMuc3RhdHVzV2FpdGluZyA9IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gZG9lc24ndCBjYWxsIGNhbGxiYWNrXG4gICAgICAgIHJldHVyblxuICAgIH1cbiAgICBjYWxsQmFjayh0aGlzLmNhY2hlZFN0YXR1cyk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24oc3RhdHVzKXtcbiAgICB2YXIgbGFzdEJ1aWxkID0gcGFyc2VGbG9hdChsb2NhbFN0b3JhZ2UubGFzdEJ1aWxkKSB8fCAxO1xuICAgIGlmIChsYXN0QnVpbGQgPCBzdGF0dXMubGFzdF9idWlsZCl7XG4gICAgICAgIHV0aWxzLmNsZWFuRGVzY3JpcHRpb24oKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLmxhc3RCdWlsZCA9IHN0YXR1cy5sYXN0X2J1aWxkO1xuICAgIH1cbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gQm9vbGVhbihzdGF0dXMudG9rZW4pO1xuICAgIHRoaXMuaXNMb2dnZWRJbiA9IEJvb2xlYW4oc3RhdHVzLnVzZXJfaWQpO1xuICAgIHZhciBvbGRTdGF0dXMgPSB0aGlzLmNhY2hlZFN0YXR1cztcbiAgICB0aGlzLmNhY2hlZFN0YXR1cyA9IHN0YXR1cztcbiAgICBpZiAoIW9sZFN0YXR1cy51c2VyX2lkICYmIHN0YXR1cy51c2VyX2lkKXtcbiAgICAgICAgdGhpcy5lbWl0KCdsb2dnZWQtaW4nLHN0YXR1cy51c2VyX2lkKTtcbiAgICB9IGVsc2UgaWYgKG9sZFN0YXR1cy51c2VyX2lkICYmICFzdGF0dXMudXNlcl9pZCl7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9nZ2VkLW91dCcpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0Nvbm5lY3RlZCAmJiAhdGhpcy5pc0xvZ2dlZEluKXtcbiAgICAgICAgdGhpcy5lbWl0KCdsb2dpbi1yZXF1aXJlZCcpO1xuICAgICAgICBpZiAodGhpcy5nZXRMb2dpbil7XG4gICAgICAgICAgICB2YXIgbG9naW5JbmZvID0gdGhpcy5nZXRMb2dpbigpO1xuICAgICAgICAgICAgaWYgKGxvZ2luSW5mby5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KXtcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ2luKGxvZ2luSW5mby51c2VybmFtZSwgbG9naW5JbmZvLnBhc3N3b3JkLCBsb2dpbkluZm8uY2FsbEJhY2spO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb2dpbkluZm8uY29uc3RydWN0b3IgPT09IFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICBsb2dpbkluZm8udGhlbihmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ2luKG9iai51c2VybmFtZSwgb2JqLnBhc3N3b3JkLCBvYmouY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gcmVhbHRpbWUgY29ubmVjdGlvbiBpcyBzZXR0ZWRcbiAgICBpZiAoIW9sZFN0YXR1cy5yZWFsdGltZUVuZFBvaW50ICYmIHN0YXR1cy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgIHRoaXMud3NDb25uZWN0aW9uID0gbmV3IFJlYWx0aW1lQ29ubmVjdGlvbihzdGF0dXMucmVhbHRpbWVFbmRQb2ludCwgdGhpcyk7XG4gICAgLy8gcmVhbHRpbWUgY29ubmVjdGlvbiBpcyBjbG9zZWRcbiAgICB9IGVsc2UgaWYgKG9sZFN0YXR1cy5yZWFsdGltZUVuZFBvaW50ICYmICFzdGF0dXMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICB0aGlzLndzQ29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICBkZWxldGUgdGhpcy53c0Nvbm5lY3Rpb247XG4gICAgfVxuICAgIHRoaXMuZW1pdCgndXBkYXRlLWNvbm5lY3Rpb24tc3RhdHVzJywgc3RhdHVzLCBvbGRTdGF0dXMpO1xuICAgIGxvY2FsU3RvcmFnZVtTVEFUVVNLRVldID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbn1cblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICAvKipcbiAgICAgKiBtYWtlIGxvZ2luIGFuZCByZXR1cm4gYSBwcm9taXNlLiBJZiBsb2dpbiBzdWNjZWQsIHByb21pc2Ugd2lsbCBiZSBhY2NlcHRlZFxuICAgICAqIElmIGxvZ2luIGZhaWxzIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoIGVycm9yXG4gICAgICogQHBhcmFtIHVzZXJuYW1lOiB1c2VybmFtZVxuICAgICAqIEBwYXJhbSBwYXNzd29yZDogcGFzc3dvcmRcbiAgICAgKiBAcmV0dXJuIFByb21pc2UgKHVzZXIgb2JqZWN0KVxuICAgICAqL1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih0aHMuZW5kUG9pbnQgKyAnYXBpL2xvZ2luJywge3VzZXJuYW1lOiB1c2VybmFtZSB8fCAnJywgcGFzc3dvcmQ6IHBhc3N3b3JkIHx8ICcnfSxudWxsLHRocy5jYWNoZWRTdGF0dXMudG9rZW4sIHRydWUpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBzdGF0dXNcbiAgICAgICAgICAgICAgICB0aHMudXBkYXRlU3RhdHVzKHhoci5yZXNwb25zZURhdGEpO1xuICAgICAgICAgICAgICAgIC8vIGNhbGwgd2l0aCB1c2VyIGlkXG4gICAgICAgICAgICAgICAgYWNjZXB0KHtzdGF0dXMgOiAnc3VjY2VzcycsIHVzZXJpZDogdGhzLmNhY2hlZFN0YXR1cy51c2VyX2lkfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiBlcnJvciBjYWxsIGVycm9yIG1hbmFnZXIgd2l0aCBlcnJvclxuICAgICAgICAgICAgICAgIGFjY2VwdCh7ZXJyb3I6IHhoci5yZXNwb25zZURhdGEuZXJyb3IsIHN0YXR1czogJ2Vycm9yJ30pO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9nb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3QpIHtcbiAgICAgICAgdGhzLiRwb3N0KCdhcGkvbG9nb3V0JylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKG9rKXtcbiAgICAgICAgICAgICAgICB0aHMudXBkYXRlU3RhdHVzKHt9KTtcbiAgICAgICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW1NUQVRVU0tFWV07XG4gICAgICAgICAgICAgICAgYWNjZXB0KClcbiAgICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKGNhbGxCYWNrKSB7XG4gICAgaWYgKHRoaXMuaXNMb2dnZWRJbikge1xuICAgICAgICBjYWxsQmFjayh0aGlzLmNhY2hlZFN0YXR1cy51c2VyX2lkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyB3YWl0IGZvciBsb2dpblxuICAgICAgICB0aGlzLm9uY2UoJ2xvZ2dlZC1pbicsZnVuY3Rpb24odXNlcl9pZCl7XG4gICAgICAgICAgICBjYWxsQmFjayh1c2VyX2lkKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc3RhdHVzKGNhbGxCYWNrIHx8IHV0aWxzLm5vb3ApO1xuICAgIH1cbn1cblxudXRpbHMucmVXaGVlbENvbm5lY3Rpb24gPSByZVdoZWVsQ29ubmVjdGlvbjsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFRvdWNoZXIoKXtcbiAgICB2YXIgdG91Y2hlZCA9IGZhbHNlXG4gICAgdGhpcy50b3VjaCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRvdWNoZWQgPSB0cnVlO1xuICAgIH07XG4gICAgdGhpcy50b3VjaGVkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHQgPSB0b3VjaGVkO1xuICAgICAgICB0b3VjaGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybiB0O1xuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuXG5mdW5jdGlvbiBWYWN1dW1DYWNoZXIodG91Y2gsIGFza2VkLCBuYW1lLCBwa0luZGV4KXtcbi8qXG4gICAgaWYgKG5hbWUpe1xuICAgICAgICBjb25zb2xlLmluZm8oJ2NyZWF0ZWQgVmFjdXVtQ2FjaGVyIGFzICcgKyBuYW1lKTtcbiAgICB9XG4qL1xuICAgIGlmICghYXNrZWQpe1xuICAgICAgICB2YXIgYXNrZWQgPSBbXTtcbiAgICB9XG4gICAgdmFyIG1pc3NpbmcgPSBbXTtcbiAgICBcbiAgICB0aGlzLmFzayA9IGZ1bmN0aW9uIChpZCxsYXp5KXtcbiAgICAgICAgaWYgKHBrSW5kZXggJiYgKGlkIGluIHBrSW5kZXguc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghTGF6eShhc2tlZCkuY29udGFpbnMoaWQpKXtcbi8vICAgICAgICAgICAgY29uc29sZS5pbmZvKCdhc2tpbmcgKCcgKyBpZCArICcpIGZyb20gJyArIG5hbWUpO1xuICAgICAgICAgICAgbWlzc2luZy5wdXNoKGlkKTtcbiAgICAgICAgICAgIGlmICghbGF6eSlcbiAgICAgICAgICAgICAgICBhc2tlZC5wdXNoKGlkKTtcbiAgICAgICAgICAgIHRvdWNoLnRvdWNoKCk7XG4gICAgICAgIH0gXG4vLyAgICAgICAgZWxzZSBjb25zb2xlLndhcm4oJygnICsgaWQgKyAnKSB3YXMganVzdCBhc2tlZCBvbiAnICsgbmFtZSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0QXNrZWRJbmRleCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBhc2tlZDtcbiAgICB9XG5cbiAgICB0aGlzLm1pc3NpbmdzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIExhenkobWlzc2luZy5zcGxpY2UoMCxtaXNzaW5nLmxlbmd0aCkpLnVuaXF1ZSgpLnRvQXJyYXkoKTtcbiAgICB9XG59XG4iLCJmdW5jdGlvbiBBdXRvTGlua2VyKGFjdGl2ZXMsIElEQiwgVzJQUkVTT1VSQ0UsIGxpc3RDYWNoZSl7XG4gICAgdmFyIHRvdWNoID0gbmV3IFRvdWNoZXIoKTtcbiAgICB2YXIgbWFpbkluZGV4ID0ge307XG4gICAgdmFyIGZvcmVpZ25LZXlzID0ge307XG4gICAgdmFyIG0ybSA9IHt9O1xuICAgIHZhciBtMm1JbmRleCA9IHt9O1xuICAgIHZhciBwZXJtaXNzaW9ucyA9IHt9O1xuICAgIHRoaXMubWFpbkluZGV4ID0gbWFpbkluZGV4O1xuICAgIHRoaXMuZm9yZWlnbktleXMgPSBmb3JlaWduS2V5cztcbiAgICB0aGlzLm0ybSA9IG0ybTtcbiAgICB0aGlzLm0ybUluZGV4ID0gbTJtSW5kZXg7XG4gICAgdGhpcy5wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zO1xuXG4gICAgVzJQUkVTT1VSQ0Uub24oJ21vZGVsLWRlZmluaXRpb24nLGZ1bmN0aW9uKG1vZGVsLCBpbmRleCl7XG4gICAgICAgIC8vIGRlZmluaW5nIGFsbCBpbmRleGVzIGZvciBwcmltYXJ5IGtleVxuICAgICAgICB2YXIgcGtJbmRleCA9IGxpc3RDYWNoZS5nZXRJbmRleEZvcihtb2RlbC5uYW1lLCAnaWQnKTtcbiAgICAgICAgbWFpbkluZGV4W21vZGVsLm5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgcGtJbmRleCwgJ21haW5JbmRleC4nICsgbW9kZWwubmFtZSwgaW5kZXgpO1xuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRpbmcgcGVybWlzc2lvbiBpbmRleGVzXG4gICAgICAgIHBlcm1pc3Npb25zW21vZGVsLm5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCxudWxsLCAncGVybWlzc2lvbnMuJyArIG1vZGVsLm5hbWUpO1xuXG4gICAgICAgIC8vIGNyZWF0aW5nIGluZGV4ZXMgZm9yIGZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24ocmVmZXJlbmNlKXtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBtb2RlbC5uYW1lICsgJ18nICsgcmVmZXJlbmNlLmlkO1xuICAgICAgICAgICAgZm9yZWlnbktleXNbaW5kZXhOYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIGxpc3RDYWNoZS5nZXRJbmRleEZvcihyZWZlcmVuY2UudG8sICdpZCcpLCByZWZlcmVuY2UudG8gKyAnLmlkIGZvcmVpZ25LZXlzLicgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gY3JlYXRpbmcgcmV2ZXJzZSBmb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VkQnkpLmVhY2goZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IGZpZWxkLmJ5ICsgJy4nICsgZmllbGQuaWQ7XG4gICAgICAgICAgICBmb3JlaWduS2V5c1tpbmRleE5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgbGlzdENhY2hlLmdldEluZGV4Rm9yKGZpZWxkLmJ5LGZpZWxkLmlkKSwgZmllbGQuYnkgKyAnLicgKyBmaWVsZC5pZCArICcgZm9yZWlnbktleXMuJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBMYXp5KG1vZGVsLm1hbnlUb01hbnkpLmVhY2goZnVuY3Rpb24ocmVsYXRpb24pe1xuICAgICAgICAgICAgaWYgKCEocmVsYXRpb24uaW5kZXhOYW1lIGluIG0ybSkpXG4gICAgICAgICAgICAgICAgbTJtW3JlbGF0aW9uLmluZGV4TmFtZV0gPSBbbmV3IFZhY3V1bUNhY2hlcih0b3VjaCxudWxsLCdtMm0uJyArIHJlbGF0aW9uLmluZGV4TmFtZSArICdbMF0nKSwgbmV3IFZhY3V1bUNhY2hlcih0b3VjaCxudWxsLCdtMm0uJyArIHJlbGF0aW9uLmluZGV4TmFtZSsnWzFdJyldO1xuICAgICAgICAgICAgaWYgKCEocmVsYXRpb24uaW5kZXhOYW1lIGluIG0ybUluZGV4KSlcbiAgICAgICAgICAgICAgICBtMm1JbmRleFtyZWxhdGlvbi5pbmRleE5hbWVdID0gbmV3IE1hbnlUb01hbnlSZWxhdGlvbihyZWxhdGlvbixtMm1bcmVsYXRpb24uaW5kZXhOYW1lXSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHZhciBtMm1HZXQgPSBmdW5jdGlvbihpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGNhbGxCYWNrKXtcbiAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoKG4gPyB1dGlscy5yZXZlcnNlKCcvJywgaW5kZXhOYW1lKSA6IGluZGV4TmFtZSkgKyAncycgKyAnL2xpc3QnLCB7Y29sbGVjdGlvbjogY29sbGVjdGlvbn0sIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShkYXRhLCBjYWxsQmFjayk7XG4gICAgICAgICAgICBkZWxldGUgYWN0aXZlc1tpbmRleE5hbWVdXG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgfTtcblxuICAgIHZhciBnZXRNMk0gPSBmdW5jdGlvbihpbmRleE5hbWUsIGNvbGxlY3Rpb24sIG4sIGNhbGxCYWNrKXtcbiAgICAgICAgLy8gYXNrIGFsbCBpdGVtcyBpbiBjb2xsZWN0aW9uIHRvIG0ybSBpbmRleFxuICAgICAgICBMYXp5KGNvbGxlY3Rpb24pLmVhY2gobTJtW2luZGV4TmFtZV1bbl0uYXNrLmJpbmQobTJtW2luZGV4TmFtZV1bbl0pKTtcbiAgICAgICAgLy8gcmVuZXdpbmcgY29sbGVjdGlvbiB3aXRob3V0IGFza2VkXG4gICAgICAgIGNvbGxlY3Rpb24gPSBtMm1baW5kZXhOYW1lXVtuXS5taXNzaW5ncygpO1xuICAgICAgICAvLyBjYWxsaW5nIHJlbW90ZSBmb3IgbTJtIGNvbGxlY3Rpb24gaWYgYW55XG4gICAgICAgIGlmIChjb2xsZWN0aW9uLmxlbmd0aCl7XG4gICAgICAgICAgICBhY3RpdmVzW2luZGV4TmFtZV0gPSAxO1xuICAgICAgICAgICAgbTJtR2V0KGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgY2FsbEJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5nZXRNMk0gPSBnZXRNMk07XG5cbiAgICB2YXIgbGlua1VubGlua2VkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gcGVyZm9ybSBhIERhdGFCYXNlIHN5bmNocm9uaXphdGlvbiB3aXRoIHNlcnZlciBsb29raW5nIGZvciB1bmtub3duIGRhdGFcbiAgICAgICAgaWYgKCF0b3VjaC50b3VjaGVkKCkpIHJldHVybjtcbiAgICAgICAgaWYgKExhenkoYWN0aXZlcykudmFsdWVzKCkuc3VtKCkpIHtcbiAgICAgICAgICAgIHRvdWNoLnRvdWNoKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgTGF6eShtMm0pLmVhY2goZnVuY3Rpb24oaW5kZXhlcywgaW5kZXhOYW1lKXtcbiAgICAgICAgICAgIExhenkoaW5kZXhlcykuZWFjaChmdW5jdGlvbiAoaW5kZXgsbikge1xuICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gaW5kZXgubWlzc2luZ3MoKTtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uID0gTGF6eShjb2xsZWN0aW9uKS5maWx0ZXIoQm9vbGVhbikubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh4KVxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBpZiAoY29sbGVjdGlvbi5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgSU5ERVggPSBtMm1JbmRleFtpbmRleE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0dGVyID0gSU5ERVhbJ2dldCcgKyAoMSAtIG4pXS5iaW5kKElOREVYKTtcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIG0ybUdldChpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGNvbGxlY3Rpb24ubWFwKGdldHRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG90aGVySW5kZXggPSBpbmRleE5hbWUuc3BsaXQoJy8nKVsxIC0gbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUob3RoZXJJbmRleCxmdW5jdGlvbigpe1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoaWRzKS5mbGF0dGVuKCkudW5pcXVlKCkuZWFjaChtYWluSW5kZXhbb3RoZXJJbmRleF0uYXNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShpZHMpLmZsYXR0ZW4oKS51bmlxdWUoKS5lYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFpbkluZGV4W290aGVySW5kZXhdLmFzayh4LHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBMYXp5KG1haW5JbmRleCkuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG1vZGVsTmFtZSkge1xuICAgICAgICAgICAgdmFyIGlkcyA9IGluZGV4Lm1pc3NpbmdzKCk7XG4gICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZhciBpZGIgPSBtb2RlbE5hbWUgaW4gSURCID8gSURCW21vZGVsTmFtZV0ua2V5cygpIDogTGF6eSgpO1xuICAgICAgICAgICAgICAgIC8vbG9nKCdsaW5raW5nLicgKyBtb2RlbE5hbWUgKyAnID0gJyArIFcyUFJFU09VUkNFLmxpbmtpbmcuc291cmNlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSwge2lkOiBpZHN9LG51bGwsdXRpbHMubm9vcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBGb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShmb3JlaWduS2V5cylcbiAgICAgICAgLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgcmV0dXJuIFtrLCB2Lm1pc3NpbmdzKCldXG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbih2KXtcbiAgICAgICAgICAgIHJldHVybiB2WzFdLmxlbmd0aFxuICAgICAgICB9KS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBpZHMgPSB4WzFdO1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHhbMF07XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBpbmRleE5hbWUuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgIHZhciBtYWluUmVzb3VyY2UgPSBpbmRleFswXTtcbiAgICAgICAgICAgIHZhciBmaWVsZE5hbWUgPSBpbmRleFsxXTtcbiAgICAgICAgICAgIHZhciBmaWx0ZXIgPSB7fTtcbiAgICAgICAgICAgIGZpbHRlcltmaWVsZE5hbWVdID0gaWRzO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobWFpblJlc291cmNlLCBmaWx0ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIExhenkoTGF6eShwZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICByZXR1cm4gW2ssIHYubWlzc2luZ3MoKV1cbiAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICByZXR1cm4gdlsxXS5sZW5ndGhcbiAgICAgICAgfSkudG9PYmplY3QoKSkuZWFjaChmdW5jdGlvbiAoaWRzLCByZXNvdXJjZU5hbWUpIHtcbiAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIGFjdGl2ZXNbcmVzb3VyY2VOYW1lXSA9IDE7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QocmVzb3VyY2VOYW1lICsgJy9teV9wZXJtcycsIHtpZHM6IExhenkoaWRzKS51bmlxdWUoKS50b0FycmF5KCl9LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RQZXJtaXNzaW9ucyhkYXRhLlBFUk1JU1NJT05TKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGFjdGl2ZXNbcmVzb3VyY2VOYW1lXVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgc2V0SW50ZXJ2YWwobGlua1VubGlua2VkLDUwKTtcbn07XG5cblxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIExpc3RDYWNoZXIoKXtcbiAgICB2YXIgZ290QWxsID0ge307XG4gICAgdmFyIGFza2VkID0ge307IC8vIG1hcCBvZiBhcnJheVxuICAgIHZhciBjb21wb3NpdGVBc2tlZCA9IHt9O1xuICAgIHZhciBjYXJ0ZXNpYW5Qcm9kdWN0MSA9IGZ1bmN0aW9uKHgseSxpc0FycmF5KXtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBpZiAoaXNBcnJheSkge1xuICAgICAgICAgICAgZm9yICh2YXIgYSBpbiB4KXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBiIGluIHkpe1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChMYXp5KFt4W2FdLHlbYl1dKS5mbGF0dGVuKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhIGluIHgpe1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGIgaW4geSl7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKFt4W2FdLHlbYl1dKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIHZhciBjYXJ0ZXNpYW5Qcm9kdWN0ID0gZnVuY3Rpb24oYXJyKXtcbiAgICAgICAgdmFyIGlzQXJyYXkgPSBmYWxzZTtcbiAgICAgICAgdmFyIHJldCA9IGFyclswXTsgXG4gICAgICAgIGZvciAodmFyIHggPSAxOyB4IDwgYXJyLmxlbmd0aDsgKyt4KXtcbiAgICAgICAgICAgIHJldCA9IGNhcnRlc2lhblByb2R1Y3QxKHJldCwgYXJyW3hdLCBpc0FycmF5KTtcbiAgICAgICAgICAgIGlzQXJyYXkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICAgIHZhciBleHBsb2RlRmlsdGVyID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgICAgIHZhciBwcm9kdWN0ID0gY2FydGVzaWFuUHJvZHVjdChMYXp5KGZpbHRlcikudmFsdWVzKCkudG9BcnJheSgpKTtcbiAgICAgICAgdmFyIGtleXMgPSBMYXp5KGZpbHRlcikua2V5cygpLnRvQXJyYXkoKTtcbiAgICAgICAgcmV0dXJuIHByb2R1Y3QubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFyIHIgPSB7fTtcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihhLG4pe1xuICAgICAgICAgICAgICAgIHJbYV0gPSB4W25dO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgfTtcbiAgICB2YXIgZmlsdGVyU2luZ2xlID0gZnVuY3Rpb24obW9kZWwsIGZpbHRlciwgdGVzdE9ubHkpe1xuICAgICAgICAvLyBMYXp5IGF1dG8gY3JlYXRlIGluZGV4ZXNcbiAgICAgICAgdmFyIG1vZGVsTmFtZSA9IG1vZGVsLm1vZGVsTmFtZTtcbiAgICAgICAgdmFyIGdldEluZGV4Rm9yID0gdGhpcy5nZXRJbmRleEZvcjtcbiAgICAgICAgdmFyIGtleXMgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHYsa2V5KXsgcmV0dXJuIFtrZXksIG1vZGVsTmFtZSArICcuJyArIGtleV07IH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIHZhciBpbmRleGVzID0gTGF6eShmaWx0ZXIpLmtleXMoKS5tYXAoZnVuY3Rpb24oa2V5KXsgcmV0dXJuIFtrZXksIGdldEluZGV4Rm9yKG1vZGVsTmFtZSwga2V5KV19KS50b09iamVjdCgpOyBcbiAgICAgICAgLy8gZmFrZSBmb3IgKGl0IHdpbGwgY3ljbGUgb25jZSlcbiAgICAgICAgZm9yICh2YXIgeCBpbiBmaWx0ZXIpe1xuICAgICAgICAgICAgLy8gZ2V0IGFza2VkIGluZGV4IGFuZCBjaGVjayBwcmVzZW5jZVxuICAgICAgICAgICAgdmFyIGRpZmZlcmVuY2UgPSBMYXp5KGZpbHRlclt4XSkuZGlmZmVyZW5jZShpbmRleGVzW3hdKS50b0FycmF5KCk7XG4gICAgICAgICAgICBpZiAoZGlmZmVyZW5jZS5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIC8vIGdlbmVyYXRlIG5ldyBmaWx0ZXJcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gTGF6eShbW3gsIGRpZmZlcmVuY2VdXSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgICAgICAvLyByZW1lbWJlciBhc2tlZFxuICAgICAgICAgICAgICAgIGlmICghdGVzdE9ubHkpXG4gICAgICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGluZGV4ZXNbeF0sIGRpZmZlcmVuY2UpO1xuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZSBmaWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSArICdcXG5PdXQgOicgKyBKU09OLnN0cmluZ2lmeShyZXQpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUgZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikgKyAnXFxuT3V0IDogbnVsbCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBjbGVhbkNvbXBvc2l0ZXMgPSBmdW5jdGlvbihtb2RlbCxmaWx0ZXIpe1xuICAgICAgICAvKipcbiAgICAgICAgICogY2xlYW4gY29tcG9zaXRlQXNrZWRcbiAgICAgICAgICovXG4gICAgICAgIC8vIGxhenkgY3JlYXRlIGNvbmRpdGlvbmFsIGFza2VkIGluZGV4XG4gICAgICAgIGlmICghKG1vZGVsLm5hbWUgaW4gY29tcG9zaXRlQXNrZWQpKSB7IGNvbXBvc2l0ZUFza2VkW21vZGVsLm5hbWVdID0gW10gfTtcbiAgICAgICAgdmFyIGluZGV4ID0gY29tcG9zaXRlQXNrZWRbbW9kZWwubmFtZV07XG4gICAgICAgIC8vIHNlYXJjaCBmb3IgYWxsIGVsZW1lbnRzIHdobyBoYXZlIHNhbWUgcGFydGlhbFxuICAgICAgICB2YXIgZmlsdGVyTGVuID0gTGF6eShmaWx0ZXIpLnNpemUoKTtcbiAgICAgICAgdmFyIGl0ZW1zID0gaW5kZXguZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlciwgJyAmJiAnLHRydWUpKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSl7IExhenkoaXRlbSkuc2l6ZSgpID4gZmlsdGVyTGVuIH0pO1xuLy8gICAgICAgIGNvbnNvbGUubG9nKCdkZWxldGluZyA6JyArIEpTT04uc3RyaW5naWZ5KGl0ZW1zKSk7XG4gICAgfTtcblxuICAgIHRoaXMuZmlsdGVyID0gZnVuY3Rpb24obW9kZWwsIGZpbHRlcil7XG4vLyAgICAgICAgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tLVxcbmZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpKTtcbiAgICAgICAgdmFyIG1vZGVsTmFtZSA9IG1vZGVsLm1vZGVsTmFtZTtcblxuICAgICAgICAvLyBpZiB5b3UgZmV0Y2ggYWxsIG9iamVjdHMgZnJvbSBzZXJ2ZXIsIHRoaXMgbW9kZWwgaGFzIHRvIGJlIG1hcmtlZCBhcyBnb3QgYWxsO1xuICAgICAgICB2YXIgZmlsdGVyTGVuICA9IExhenkoZmlsdGVyKS5zaXplKCk7XG4gICAgICAgIHN3aXRjaCAoZmlsdGVyTGVuKSB7XG4gICAgICAgICAgICBjYXNlIDAgOiB7XG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIG51bGwgb3IgYWxsXG4gICAgICAgICAgICAgICAgdmFyIGdvdCA9IGdvdEFsbFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIGdvdEFsbFttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGFza2VkKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGFza2VkW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ291dCA6IG51bGwgKGdvdCBhbGwpJyk7XG4gICAgICAgICAgICAgICAgLy8gY29uZGl0aW9uYWwgY2xlYW5cbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGNvbXBvc2l0ZUFza2VkKXsgXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZ290KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIDEgOiB7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IGZpbHRlclNpbmdsZS5jYWxsKHRoaXMsIG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgICAgIGNsZWFuQ29tcG9zaXRlcy5jYWxsKHRoaXMsIG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHZhciBzaW5nbGUgPSBMYXp5KGZpbHRlcikua2V5cygpLnNvbWUoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICB2YXIgZiA9IHt9O1xuICAgICAgICAgICAgZltrZXldID0gZmlsdGVyW2tleV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyU2luZ2xlLmNhbGwodGhzLCBtb2RlbCwgZiwgdHJ1ZSkgPT0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChzaW5nbGUpIHsgcmV0dXJuIG51bGwgfVxuICAgICAgICAvLyBsYXp5IGNyZWF0ZSBjb21wb3NpdGVBc2tlZFxuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gY29tcG9zaXRlQXNrZWQpKXsgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXSA9IFtdOyB9XG4gICAgICAgIC8vIGV4cGxvZGUgZmlsdGVyXG4gICAgICAgIHZhciBleHBsb2RlZCA9IGV4cGxvZGVGaWx0ZXIoZmlsdGVyKTtcbiAgICAgICAgLy8gY29sbGVjdCBwYXJ0aWFsc1xuICAgICAgICB2YXIgcGFydGlhbHMgPSBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIsICcgfHwgJyx0cnVlKSk7XG4gICAgICAgIC8vIGNvbGxlY3QgbWlzc2luZ3MgKGV4cGxvZGVkIC0gcGFydGlhbHMpXG4gICAgICAgIGlmIChwYXJ0aWFscy5sZW5ndGgpe1xuICAgICAgICAgICAgdmFyIGJhZCAgPSBbXTtcbiAgICAgICAgICAgIC8vIHBhcnRpYWwgZGlmZmVyZW5jZVxuICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBwYXJ0aWFscyl7XG4gICAgICAgICAgICAgICAgYmFkLnB1c2guYXBwbHkoYmFkLGV4cGxvZGVkLmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBwYXJ0aWFsc1t4XSwnICYmICcsIHRydWUpKSk7XG4gICAgICAgICAgICB9XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKCdleHBsb2RlZCAtIHBhcnRpYWwgOiAnICsgSlNPTi5zdHJpbmdpZnkoYmFkKSk7XG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBMYXp5KGV4cGxvZGVkKS5kaWZmZXJlbmNlKGJhZCkudG9BcnJheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gZXhwbG9kZWQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmaWx0ZXIgcGFydGlhbHNcbiAgICAgICAgaWYgKG1pc3NpbmdzLmxlbmd0aCl7XG4gICAgICAgICAgICBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLnB1c2guYXBwbHkoY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXSxtaXNzaW5ncyk7XG4gICAgICAgICAgICAvLyBhZ2dyZWdhdGUgbWlzc2luZ3NcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IExhenkoZmlsdGVyKS5rZXlzKCkubWFwKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IExhenkobWlzc2luZ3MpLnBsdWNrKGtleSkudW5pcXVlKCkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBba2V5LCByZXQubGVuZ3RoP3JldDpmaWx0ZXJba2V5XV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuLy8gICAgICAgICAgICBjb25zb2xlLmxvZygnb3V0IDogJyArIEpTT04uc3RyaW5naWZ5KG1pc3NpbmdzKSk7XG4gICAgICAgICAgICAvLyBjbGVhbiBjb25kaXRpb25hbFxuICAgICAgICAgICAgY2xlYW5Db21wb3NpdGVzKG1vZGVsLCBtaXNzaW5ncyk7XG4gICAgICAgICAgICByZXR1cm4gbWlzc2luZ3M7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SW5kZXhGb3IgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGZpZWxkTmFtZSl7XG4gICAgICAgIHZhciBpbmRleE5hbWUgPSBtb2RlbE5hbWUgKyAnLicgKyBmaWVsZE5hbWU7XG4gICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBhc2tlZCkpe1xuICAgICAgICAgICAgYXNrZWRbaW5kZXhOYW1lXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhc2tlZFtpbmRleE5hbWVdO1xuICAgIH1cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBNYW55VG9NYW55UmVsYXRpb24ocmVsYXRpb24sbTJtKXtcbiAgICB2YXIgaXRlbXMgPSBbXTtcbiAgICB0aGlzLmFkZCA9IGl0ZW1zLnB1c2guYmluZChpdGVtcyk7XG4gICAgdGhpcy5hZGQgPSBmdW5jdGlvbihpdGVtKXtcbiAgLy8gICAgICBjb25zb2xlLmxvZygnYWRkaW5nICcgKyBpdGVtKTtcbiAgICAgICAgaWYgKCEoTGF6eShpdGVtcykuZmluZChpdGVtKSkpe1xuICAgICAgICAgICAgaXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZ2V0MCA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgbTJtWzFdLmFzayhpZCk7XG4gICAgICAgIHJldHVybiBMYXp5KGl0ZW1zKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICByZXR1cm4geFswXSA9PT0gaWQ7XG4gICAgICAgIH0pLnBsdWNrKFwiMVwiKS50b0FycmF5KCk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0MSA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgbTJtWzBdLmFzayhpZCk7XG4gICAgICAgIHJldHVybiBMYXp5KGl0ZW1zKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICByZXR1cm4geFsxXSA9PT0gaWQ7XG4gICAgICAgIH0pLnBsdWNrKFwiMFwiKS50b0FycmF5KCk7XG4gICAgfTtcbiAgICB0aGlzWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWxhdGlvbi5pbmRleE5hbWUuc3BsaXQoJy8nKVsxXSldID0gdGhpcy5nZXQxO1xuICAgIHRoaXNbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlbGF0aW9uLmluZGV4TmFtZS5zcGxpdCgnLycpWzBdKV0gPSB0aGlzLmdldDA7XG5cbiAgICB0aGlzLmRlbCA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICB2YXIgbCA9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgdmFyIGlkeCA9IG51bGw7XG4gICAgICAgIGZvciAodmFyIGEgPSAwOyBhIDwgbDsgYSsrKXsgXG4gICAgICAgICAgICBpZiAoKGl0ZW1zW2FdWzBdID09PSBpdGVtWzBdKSAmJiAoaXRlbXNbYV1bMV0gPT09IGl0ZW1bMV0pKXtcbiAgICAgICAgICAgICAgICBpZHggPSBhO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpZHgpe1xuICAgICAgICAgICAgaXRlbXMuc3BsaWNlKGEsIDEpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdkZWxldGluZyAnLCBpdGVtKTtcbiAgICB9O1xufSIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhwcm90bywgcHJvcGVydHlOYW1lLGdldHRlciwgc2V0dGVyKXtcbiAgICB2YXIgZXZlbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDQpO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBcbiAgICBMYXp5KGV2ZW50cykuZWFjaChmdW5jdGlvbihldmVudCl7XG4gICAgICAgIHByb3RvLm9ybS5vbihldmVudCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmVzdWx0ID0ge307XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHZhciBwcm9wZXJ0eURlZiA9IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBjYWNoZWQoKXtcbi8vICAgICAgICAgICAgcmV0dXJuIGdldHRlci5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgaWYgKCEodGhpcy5pZCBpbiByZXN1bHQpKXtcbiAgICAgICAgICAgICAgICByZXN1bHRbdGhpcy5pZF0gPSBnZXR0ZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHRbdGhpcy5pZF07XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGlmIChzZXR0ZXIpe1xuICAgICAgICBwcm9wZXJ0eURlZlsnc2V0J10gPSBmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgICAgICBpZiAoIWlzRmluaXRlKHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlkIGluIHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gcmVzdWx0W3RoaXMuaWRdKXtcbiAgICAgICAgICAgICAgICBzZXR0ZXIuY2FsbCh0aGlzLHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCBpbiByZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgcHJvcGVydHlOYW1lLHByb3BlcnR5RGVmKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKGRhdGEpe1xuICAgIHRoaXMucmVzb3VyY2UgPSBkYXRhLl9yZXNvdXJjZTtcbiAgICB0aGlzLmZvcm1JZHggPSBkYXRhLmZvcm1JZHg7XG4gICAgdGhpcy5maWVsZHMgPSBkYXRhLmVycm9ycztcbn1cbnZhciBiYXNlT1JNID0gZnVuY3Rpb24ob3B0aW9ucywgZXh0T1JNKXtcbiAgICBcbiAgICAvLyBjcmVhdGluZyByZXdoZWVsIGNvbm5lY3Rpb25cbiAgICBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKXtcbiAgICAgICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgcmVXaGVlbENvbm5lY3Rpb24ob3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmNvbnN0cnVjdG9yID09PSB1dGlscy5yZVdoZWVsQ29ubmVjdGlvbil7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gb3B0aW9ucztcbiAgICB9XG4gICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICBjb25uZWN0aW9uLm9uKCdjb25uZWN0ZWQnLCBmdW5jdGlvbigpeyBcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMub24gPSBjb25uZWN0aW9uLm9uO1xuICAgIHRoaXMuZW1pdCA9IGNvbm5lY3Rpb24uZW1pdDtcbiAgICB0aGlzLnVuYmluZCA9IGNvbm5lY3Rpb24udW5iaW5kO1xuICAgIHRoaXMub25jZSA9IGNvbm5lY3Rpb24ub25jZTtcbiAgICB0aGlzLiRwb3N0ID0gY29ubmVjdGlvbi4kcG9zdC5iaW5kKGNvbm5lY3Rpb24pO1xuXG4gICAgLy8gaGFuZGxpbmcgd2Vic29ja2V0IGV2ZW50c1xuICAgIHRoaXMub24oJ3dzLWNvbm5lY3RlZCcsZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmluZm8oJ1dlYnNvY2tldCBjb25uZWN0ZWQnKTtcbiAgICAgICAgLy8gYWxsIGpzb24gZGF0YSBoYXMgdG8gYmUgcGFyc2VkIGJ5IGdvdERhdGFcbiAgICAgICAgd3Mub25NZXNzYWdlSnNvbihXMlBSRVNPVVJDRS5nb3REYXRhLmJpbmQoVzJQUkVTT1VSQ0UpKTtcbiAgICAgICAgLy9cbiAgICAgICAgd3Mub25NZXNzYWdlVGV4dChmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnV1MgbWVzc2FnZSA6ICcgKyBtZXNzYWdlKVxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLm9uKCd3cy1kaXNjb25uZWN0ZWQnLCBmdW5jdGlvbih3cyl7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dlYnNvY2tldCBkaXNjb25uZWN0ZWQnKVxuICAgIH0pO1xuICAgIHRoaXMub24oJ2Vycm9yLWpzb24tNDA0JyxmdW5jdGlvbihlcnJvcix1cmwsIHNlbnREYXRhLCB4aHIpeyBcbiAgICAgICAgY29uc29sZS5lcnJvcignSlNPTiBlcnJvciAnLCBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xuICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW3VybC5zcGxpdCgnLycpWzBdXTtcbiAgICB9KTtcbiAgICB0aGlzLm9uKCdyZWFsdGltZS1tZXNzYWdlLWpzb24nLCBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShtZXNzYWdlKTtcbiAgICB9KTtcblxuICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIFcyUFJFU09VUkNFID0gdGhpcztcbiAgICB2YXIgSURCID0ge2F1dGhfZ3JvdXAgOiBMYXp5KHt9KX07IC8vIHRhYmxlTmFtZSAtPiBkYXRhIGFzIEFycmF5XG4gICAgdmFyIElEWCA9IHt9OyAvLyB0YWJsZU5hbWUgLT4gTGF6eShpbmRleEJ5KCdpZCcpKSAtPiBJREJbZGF0YV1cbiAgICB2YXIgUkVWSURYID0ge307IC8vIHRhYmxlTmFtZSAtPiBmaWVsZE5hbWUgLT4gTGF6eS5ncm91cEJ5KCkgLT4gSURCW0RBVEFdXG4gICAgdmFyIGJ1aWxkZXJIYW5kbGVycyA9IHt9O1xuICAgIHZhciBidWlsZGVySGFuZGxlclVzZWQgPSB7fTtcbiAgICB2YXIgcGVyc2lzdGVudEF0dHJpYnV0ZXMgPSB7fTtcbiAgICB2YXIgZXZlbnRIYW5kbGVycyA9IHt9O1xuICAgIHZhciBwZXJtaXNzaW9uV2FpdGluZyA9IHt9O1xuICAgIHZhciBtb2RlbENhY2hlID0ge307XG4gICAgdmFyIGZhaWxlZE1vZGVscyA9IHt9O1xuICAgIHZhciB3YWl0aW5nQ29ubmVjdGlvbnMgPSB7fSAvLyBhY3R1YWwgY29ubmVjdGlvbiB3aG8gaSdtIHdhaXRpbmcgZm9yXG4gICAgdmFyIGxpc3RDYWNoZSA9IG5ldyBMaXN0Q2FjaGVyKExhenkpO1xuICAgIHZhciBsaW5rZXIgPSBuZXcgQXV0b0xpbmtlcih3YWl0aW5nQ29ubmVjdGlvbnMsSURCLCB0aGlzLCBsaXN0Q2FjaGUpO1xuLyogICAgd2luZG93LmxsID0gbGlua2VyO1xuICAgIHdpbmRvdy5sYyA9IGxpc3RDYWNoZTtcbiovXG4gICAgd2luZG93LklEQiA9IElEQjtcbiAgICB0aGlzLnZhbGlkYXRpb25FdmVudCA9IHRoaXMub24oJ2Vycm9yLWpzb24tNTEzJywgZnVuY3Rpb24oZGF0YSwgdXJsLCBzZW50RGF0YSwgeGhyKXtcbiAgICAgICAgaWYgKGN1cnJlbnRDb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlcil7XG4gICAgICAgICAgICBjdXJyZW50Q29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIobmV3IFZhbGlkYXRpb25FcnJvcihkYXRhKSk7XG4gICAgICAgIH1cbiAgICB9KVxuXG4gICAgdmFyIGdldEluZGV4ID0gZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElEQilcbiAgICAgICAgICAgIHJldHVybiBJREJbaW5kZXhOYW1lXTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBJREJbaW5kZXhOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgcmV0dXJuIElEQltpbmRleE5hbWVdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgZ2V0VW5saW5rZWQgPSBmdW5jdGlvbiAoaW5kZXhOYW1lKSB7XG4gICAgICAgIGlmIChpbmRleE5hbWUgaW4gVU5MSU5LRUQpXG4gICAgICAgICAgICByZXR1cm4gVU5MSU5LRURbaW5kZXhOYW1lXTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBVTkxJTktFRFtpbmRleE5hbWVdID0ge307XG4gICAgICAgICAgICByZXR1cm4gVU5MSU5LRURbaW5kZXhOYW1lXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBQZXJtaXNzaW9uVGFibGUoaWQsIGtsYXNzLCBwZXJtaXNzaW9ucykge1xuICAgICAgICAvLyBjcmVhdGUgUGVybWlzc2lvblRhYmxlIGNsYXNzXG4gICAgICAgIHRoaXMua2xhc3MgPSBrbGFzcztcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IFtdO1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIGZvciAodmFyIGsgaW4gcGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgIHRoaXMucHVzaC5hcHBseSh0aGlzLCBbaywgcGVybWlzc2lvbnNba11dKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBQZXJtaXNzaW9uVGFibGUucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgLy8gc2F2ZSBPYmplY3QgdG8gc2VydmVyXG4gICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgcGVybWlzc2lvbnM6IExhenkodGhpcy5wZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFt4WzBdLmlkLCB4WzFdXVxuICAgICAgICAgICAgfSkudG9PYmplY3QoKVxuICAgICAgICB9O1xuICAgICAgICBkYXRhLmlkID0gdGhpcy5pZDtcbiAgICAgICAgdmFyIG1vZGVsTmFtZSA9IHRoaXMua2xhc3MubW9kZWxOYW1lO1xuICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmtsYXNzLm1vZGVsTmFtZSArICcvc2V0X3Blcm1pc3Npb25zJywgZGF0YSwgZnVuY3Rpb24gKG15UGVybXMsIGEsIGIsIHJlcSkge1xuICAgICAgICAgICAgY2IobXlQZXJtcyk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgUGVybWlzc2lvblRhYmxlLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKGdyb3VwX2lkLCBwZXJtaXNzaW9uTGlzdCkge1xuICAgICAgICB2YXIgcCA9IExhenkocGVybWlzc2lvbkxpc3QpO1xuICAgICAgICB2YXIgcGVybXMgPSBMYXp5KHRoaXMua2xhc3MuYWxsUGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LCBwLmNvbnRhaW5zKHgpXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICB2YXIgbCA9IExhenkodGhpcy5wZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4geFswXS5pZFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGwuY29udGFpbnMoZ3JvdXBfaWQpKVxuICAgICAgICAgICAgdGhpcy5wZXJtaXNzaW9uc1tsLmluZGV4T2YoZ3JvdXBfaWQpXVsxXSA9IHBlcm1zO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGlzLnBlcm1pc3Npb25zLnB1c2goW0lEQi5hdXRoX2dyb3VwLmdldChncm91cF9pZCksIHBlcm1zXSk7XG4gICAgfTtcblxuICAgIC8vIGNyZWF0ZXMgZHluYW1pY2FsIG1vZGVsc1xuICAgIHZhciBtYWtlTW9kZWxDbGFzcyA9IGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICB2YXIgX21vZGVsID0gbW9kZWw7XG4gICAgICAgIG1vZGVsLmZpZWxkcy5pZC5yZWFkYWJsZSA9IGZhbHNlO1xuICAgICAgICBtb2RlbC5maWVsZHMuaWQud3JpdGFibGUgPSBmYWxzZTtcbiAgICAgICAgdmFyIGZpZWxkcyA9IExhenkobW9kZWwuZmllbGRzKTtcbiAgICAgICAgaWYgKG1vZGVsLnByaXZhdGVBcmdzKSB7XG4gICAgICAgICAgICBmaWVsZHMgPSBmaWVsZHMubWVyZ2UobW9kZWwucHJpdmF0ZUFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ21vZGVsLWRlZmluaXRpb24nLCBtb2RlbCwgZ2V0SW5kZXgobW9kZWwubmFtZSkpO1xuICAgICAgICAvLyBnZXR0aW5nIGZpZWxkcyBvZiB0eXBlIGRhdGUgYW5kIGRhdGV0aW1lXG4vKlxuICAgICAgICB2YXIgREFURUZJRUxEUyA9IGZpZWxkcy5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKVxuICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKHgsIHYpIHtcbiAgICAgICAgICAgIHJldHVybiBbdiwgdHJ1ZV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcblxuICAgICAgICAvLyBnZXR0aW5nIGJvb2xlYW4gZmllbGRzXG4gICAgICAgIHZhciBCT09MRklFTERTID0gZmllbGRzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKVxuICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKHgsIHYpIHtcbiAgICAgICAgICAgIHJldHVybiBbdiwgdHJ1ZV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcblxuICAgICAgICAvLyBib29sZWFucyBhbmQgZGF0ZXRpbWVzIHN0b3JhZ2UgZXh0ZXJuYWwgXG4gICAgICAgIE1PREVMX0RBVEVGSUVMRFNbbW9kZWwubmFtZV0gPSBEQVRFRklFTERTO1xuICAgICAgICBNT0RFTF9CT09MRklFTERTW21vZGVsLm5hbWVdID0gQk9PTEZJRUxEUztcbiovXG4gICAgICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHZhciBmdW5jU3RyaW5nID0gXCJpZiAoIXJvdykgeyByb3cgPSB7fX07XFxuXCI7XG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gbW9kZWwucmVmZXJlbmNlcy5tYXAoZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgcmV0dXJuICd0aGlzLl8nICsgZmllbGQuaWQgKyAnID0gcm93LicgKyBmaWVsZC5pZCArICc7JztcbiAgICAgICAgfSkuam9pbignO1xcbicpO1xuICAgICAgICBcbiAgICAgICAgLy8gZGF0ZWZpZWxkIGNvbnZlcnNpb25cbiAgICAgICAgZnVuY1N0cmluZyArPSBmaWVsZHMubWFwKGZ1bmN0aW9uICh4LGspIHtcbiAgICAgICAgICAgIGlmICgoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IHJvdy4nICsgayArICc/bmV3IERhdGUocm93LicgKyBrICsgJyAqIDEwMDAgLSAnICsgdXRpbHMudHpPZmZzZXQgKyAnKTpudWxsO1xcbic7IFxuICAgICAgICAgICAgfSBlbHNlIGlmICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IChyb3cuJyArIGsgKyAnID09PSBcIlRcIikgfHwgKHJvdy4nICsgayArICcgPT09IHRydWUpO1xcbic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSByb3cuJyArIGsgKyAnO1xcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnRvU3RyaW5nKCdcXG4nKTsgKyAnXFxuJztcblxuICAgICAgICBmdW5jU3RyaW5nICs9IFwiaWYgKHBlcm1pc3Npb25zKSB7dGhpcy5fcGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucyAmJiBMYXp5KHBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIFt4LCB0cnVlXSB9KS50b09iamVjdCgpO31cIlxuXG4gICAgICAgIFxuICAgICAgICAvLyBtYXN0ZXIgY2xhc3MgZnVuY3Rpb25cbiAgICAgICAgdmFyIEtsYXNzID0gbmV3IEZ1bmN0aW9uKCdyb3cnLCAncGVybWlzc2lvbnMnLGZ1bmNTdHJpbmcpXG5cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLm9ybSA9IGV4dE9STTtcbiAgICAgICAgS2xhc3MucmVmX3RyYW5zbGF0aW9ucyA9IHt9O1xuICAgICAgICBLbGFzcy5tb2RlbE5hbWUgPSBtb2RlbC5uYW1lO1xuICAgICAgICBLbGFzcy5yZWZlcmVuY2VzID0gTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5wbHVjaygnaWQnKS50b0FycmF5KCk7XG5cbiAgICAgICAgS2xhc3MuaW52ZXJzZV9yZWZlcmVuY2VzID0gbW9kZWwucmVmZXJlbmNlZEJ5Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgLy8gbWFuYWdpbmcgcmVmZXJlbmNlcyB3aGVyZSBcbiAgICAgICAgICAgIHJldHVybiB4LmJ5ICsgJ18nICsgeC5pZCArICdfc2V0J1xuICAgICAgICB9KTtcbiAgICAgICAgS2xhc3MucmVmZXJlbnRzID0gbW9kZWwucmVmZXJlbmNlZEJ5Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LmJ5LCB4LmlkXVxuICAgICAgICB9KTtcbiAgICAgICAgS2xhc3MuZmllbGRzT3JkZXIgPSBtb2RlbC5maWVsZE9yZGVyO1xuICAgICAgICBLbGFzcy5hbGxQZXJtaXNzaW9ucyA9IG1vZGVsLnBlcm1pc3Npb25zO1xuXG4gICAgICAgIC8vIHJlZGVmaW5pbmcgdG9TdHJpbmcgbWV0aG9kXG4gICAgICAgIGlmIChMYXp5KG1vZGVsLnJlcHJlc2VudGF0aW9uKS5zaXplKCkpe1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnRvU3RyaW5nID0gbmV3IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcy4nICsgTGF6eShtb2RlbC5yZXByZXNlbnRhdGlvbikudG9TdHJpbmcoJyArIFwiIFwiICsgdGhpcy4nKSk7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnRvVXBwZXJDYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gcmVkZWZpbmUgdG8gVXBwZXJDYXNlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIH07XG4gICAgICBcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnRvTG93ZXJDYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGRlbGV0ZSBpbnN0YW5jZSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5kZWxldGUodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUsIFt0aGlzLmlkXSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gcGVybWlzc2lvbiBnZXR0ZXIgcHJvcGVydHlcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEtsYXNzLnByb3RvdHlwZSwgJ3Blcm1pc3Npb25zJywge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3Blcm1pc3Npb25zKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcGVybWlzc2lvbnM7XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtlci5wZXJtaXNzaW9uc1t0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZV0uYXNrKHRoaXMuaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGdldHRpbmcgZnVsbCBwZXJtaXNzaW9uIHRhYmxlIGZvciBhbiBvYmplY3RcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmFsbF9wZXJtcyA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgdmFyIG9iamVjdF9pZCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSArICcvYWxsX3Blcm1zJywge2lkOiB0aGlzLmlkfSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGVybWlzc2lvbnMgPSBkYXRhO1xuICAgICAgICAgICAgICAgIHZhciBncm91cGVkID0ge307XG4gICAgICAgICAgICAgICAgdmFyIHVua25vd25fZ3JvdXBzID0gTGF6eShwZXJtaXNzaW9ucykucGx1Y2soJ2dyb3VwX2lkJykudW5pcXVlKCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnJyArIHhcbiAgICAgICAgICAgICAgICB9KS5kaWZmZXJlbmNlKElEQi5hdXRoX2dyb3VwLmtleXMoKSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIExhenkocGVybWlzc2lvbnMpLmdyb3VwQnkoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguZ3JvdXBfaWRcbiAgICAgICAgICAgICAgICB9KS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyb3VwZWRba10gPSBMYXp5KHYpLnBsdWNrKCduYW1lJykudG9BcnJheSgpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdmFyIGNhbGwgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBjYihuZXcgUGVybWlzc2lvblRhYmxlKG9iamVjdF9pZCwgS2xhc3MsIGdyb3VwZWQpKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmICh1bmtub3duX2dyb3Vwcy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdldCgnYXV0aF9ncm91cCcsdW5rbm93bl9ncm91cHMsY2FsbCk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBjYWxsKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICB2YXIgbyA9IHRoaXMuYXNSYXcoKTtcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSBLbGFzcy5maWVsZHM7XG4gICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgdmFyIG1vZGVsTmFtZSA9IHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhcmcgaW4gYXJncykge1xuICAgICAgICAgICAgICAgICAgICBvW2FyZ10gPSBhcmdzW2FyZ107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gZWxpbWluYXRlIHVud3JpdGFibGVzXG4gICAgICAgICAgICBMYXp5KEtsYXNzLmZpZWxkc09yZGVyKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFmaWVsZHNbeF0ud3JpdGFibGU7XG4gICAgICAgICAgICB9KS5lYWNoKGZ1bmN0aW9uKGZpZWxkTmFtZSl7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSBpbiBvKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBvW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoSUQpIHsgby5pZCA9IElEOyB9XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IFcyUFJFU09VUkNFLiRwb3N0KG1vZGVsTmFtZSArIChJRCA/ICcvcG9zdCcgOiAnL3B1dCcpLCBvKTtcbiAgICAgICAgICAgIGlmIChhcmdzICYmIChhcmdzLmNvbnN0cnVjdG9yID09PSBGdW5jdGlvbikpe1xuICAgICAgICAgICAgICAgIC8vIHBsYWNpbmcgY2FsbGJhY2sgaW4gYSBjb21tb24gcGxhY2VcbiAgICAgICAgICAgICAgICBwcm9taXNlLmNvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyID0gYXJncztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlXG4gICAgICAgIH07XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG9iaiA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMuYXNSYXcoKSk7XG4gICAgICAgICAgICBvYmouX3Blcm1pc3Npb25zID0gdGhpcy5fcGVybWlzc2lvbnM7XG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGJ1aWxkaW5nIHNlcmlhbGl6YXRpb24gZnVuY3Rpb25cbiAgICAgICAgdmFyIGFzciA9ICdyZXR1cm4ge1xcbicgKyBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLm1hcChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICByZXR1cm4gZmllbGQuaWQgKyAnIDogdGhpcy5fJyArIGZpZWxkLmlkO1xuICAgICAgICB9KS5jb25jYXQoZmllbGRzLm1hcChmdW5jdGlvbiAoeCxrKSB7XG4gICAgICAgICAgICBpZiAoKHgudHlwZSA9PSAnZGF0ZScpIHx8ICh4LnR5cGUgPT0gJ2RhdGV0aW1lJykpe1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6ICh0aGlzLicgKyBrICsgJz8oTWF0aC5yb3VuZCh0aGlzLicgKyBrICsgJy5nZXRUaW1lKCkgLSB0aGlzLicgKyBrICsgJy5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDApIC8gMTAwMCk6bnVsbCknOyBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeC50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6IHRoaXMuJyArIGsgKyAnP1wiVFwiOlwiRlwiJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogdGhpcy4nICsgaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpLnRvU3RyaW5nKCcsXFxuJykgKyAnfTsnO1xuICAgICAgICBLbGFzcy5wcm90b3R5cGUuYXNSYXcgPSBuZXcgRnVuY3Rpb24oYXNyKTtcblxuICAgICAgICBLbGFzcy5zYXZlTXVsdGkgPSBmdW5jdGlvbiAob2JqZWN0cywgY2IsIHNjb3BlKSB7XG4gICAgICAgICAgICB2YXIgcmF3ID0gW107XG4gICAgICAgICAgICB2YXIgZGVsZXRhYmxlID0gTGF6eShLbGFzcy5maWVsZHMpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIXgud3JpdGFibGVcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5wbHVjaygnaWQnKVxuICAgICAgICAgICAgICAgIC50b0FycmF5KCk7XG4gICAgICAgICAgICBMYXp5KG9iamVjdHMpXG4gICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5hc1JhdygpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KGRlbGV0YWJsZSkuZWFjaChmdW5jdGlvbiAoeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHhbeV07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByYXcucHVzaCh4KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSwgJ3B1dCcsIHttdWx0aXBsZTogcmF3LCBmb3JtSWR4IDogVzJQUkVTT1VSQ0UuZm9ybUlkeCsrfSwgZnVuY3Rpb24gKGVsZW1zKSB7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShlbGVtcyk7XG4gICAgICAgICAgICAgICAgdmFyIHRhYiA9IElEQltLbGFzcy5tb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIHZhciBvYmpzID0gTGF6eShlbGVtc1tLbGFzcy5tb2RlbE5hbWVdLnJlc3VsdHMpLnBsdWNrKCdpZCcpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFiLmdldCh4KVxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBpZiAoY2IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2Iob2Jqcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgc2NvcGUpO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoJ2V4dHJhX3ZlcmJzJyBpbiBtb2RlbClcbiAgICAgICAgICAgIExhenkobW9kZWwuZXh0cmFfdmVyYnMpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZnVuY05hbWUgPSB4WzBdO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0geFsxXTtcbiAgICAgICAgICAgICAgICB2YXIgZGRhdGEgPSAnZGF0YSA9IHtpZCA6IHRoaXMuaWQnO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgZGRhdGEgKz0gJywgJyArIExhenkoYXJncykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHggKyAnIDogJyArIHg7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5qb2luKCcsJyk7XG4gICAgICAgICAgICAgICAgZGRhdGEgKz0gJ307JztcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goJ2NiJyk7XG4gICAgICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlW2Z1bmNOYW1lXSA9IG5ldyBGdW5jdGlvbihhcmdzLCBkZGF0YSArICdXMlMuVzJQX1BPU1QodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUsXCInICsgZnVuY05hbWUgKyAnXCIsIGRhdGEsZnVuY3Rpb24oZGF0YSxzdGF0dXMsaGVhZGVycyx4KXsnICtcbiAgICAgICAgICAgICAgICAgICAgJ3RyeXtcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJyAgIGlmICghaGVhZGVycyhcIm5vbW9kZWxcIikpIHt3aW5kb3cuVzJTLmdvdERhdGEoZGF0YSxjYik7fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnICAgZWxzZSB7aWYgKGNiKSB7Y2IoZGF0YSl9fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfSBjYXRjaChlKXtcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ2lmIChjYikge2NiKGRhdGEpO31cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ31cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ30pO1xcbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIGlmICgncHJpdmF0ZUFyZ3MnIGluIG1vZGVsKSB7XG4gICAgICAgICAgICBLbGFzcy5wcml2YXRlQXJncyA9IExhenkobW9kZWwucHJpdmF0ZUFyZ3MpLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHRydWVdO1xuICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS5zYXZlUEEgPSBmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgIHZhciBUID0gdGhpcztcbiAgICAgICAgICAgICAgICB2YXIgb28gPSB7aWQ6IHRoaXMuaWR9O1xuICAgICAgICAgICAgICAgIHZhciBQQSA9IHRoaXMuY29uc3RydWN0b3IucHJpdmF0ZUFyZ3M7XG4gICAgICAgICAgICAgICAgdmFyIEZzID0gdGhpcy5jb25zdHJ1Y3Rvci5maWVsZHM7XG4gICAgICAgICAgICAgICAgdmFyIHQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihvKS5hc1JhdygpO1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZElkeCA9IExhenkoUEEpLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCBGc1t4XV1cbiAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIExhenkobykuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGsgaW4gUEEpICYmIGZpZWxkSWR4W2tdLndyaXRhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvb1trXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSArICcvc2F2ZVBBJywgb28sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShvbykuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgVFtrXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1vZGVsQ2FjaGVbS2xhc3MubW9kZWxOYW1lXSA9IEtsYXNzO1xuICAgICAgICAvLyBhZGRpbmcgaWQgdG8gZmllbGRzXG4gICAgICAgIGZvciAodmFyIGYgaW4gbW9kZWwuZmllbGRzKSB7XG4gICAgICAgICAgICBtb2RlbC5maWVsZHNbZl0uaWQgPSBmO1xuICAgICAgICB9XG4gICAgICAgIEtsYXNzLmZpZWxkcyA9IExhenkobW9kZWwuZmllbGRzKS5jb25jYXQoTGF6eShtb2RlbC5wcml2YXRlQXJncykpLmNvbmNhdChMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLnRhcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgeC50eXBlID0geC50eXBlIHx8ICdyZWZlcmVuY2UnXG4gICAgICAgIH0pKS5pbmRleEJ5KCdpZCcpLnRvT2JqZWN0KCk7XG4gICAgICAgIC8vIHNldHRpbmcgd2lkZ2V0cyBmb3IgZmllbGRzXG4gICAgICAgIExhenkoS2xhc3MuZmllbGRzKS5lYWNoKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIGlmICghZmllbGQud2lkZ2V0KXtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGQudHlwZSA9PT0gJ3JlZmVyZW5jZScpe1xuICAgICAgICAgICAgICAgICAgICBmaWVsZC53aWRnZXQgPSAnY2hvaWNlcydcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmaWVsZC53aWRnZXQgPSBmaWVsZC50eXBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGJ1aWxkaW5nIHJlZmVyZW5jZXMgdG8gKG1hbnkgdG8gb25lKSBmaWVsZHNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgIHZhciBleHRfcmVmID0gcmVmLnRvO1xuICAgICAgICAgICAgdmFyIGxvY2FsX3JlZiA9ICdfJyArIHJlZi5pZDtcbiAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCByZWYuaWQsZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICghdGhpc1tsb2NhbF9yZWZdKSB7IHJldHVybiBudWxsIH07XG4gICAgICAgICAgICAgICAgaWYgKCEoZXh0X3JlZiBpbiBJREIpKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKGV4dF9yZWYsZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rZXIubWFpbkluZGV4W2V4dF9yZWZdLmFzayh0aHNbbG9jYWxfcmVmXSx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSAoZXh0X3JlZiBpbiBJREIpICYmIHRoaXNbbG9jYWxfcmVmXSAmJiBJREJbZXh0X3JlZl0uZ2V0KHRoaXNbbG9jYWxfcmVmXSk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgJiYgKGV4dF9yZWYgaW4gbGlua2VyLm1haW5JbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYXNraW5nIHRvIGxpbmtlclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRoaXNbbG9jYWxfcmVmXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtlci5tYWluSW5kZXhbZXh0X3JlZl0uYXNrKHRoaXNbbG9jYWxfcmVmXSx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignbnVsbCByZWZlcmVuY2UgZm9yICcgKyBsb2NhbF9yZWYgKyAnKCcgKyB0aGlzLmlkICsgJykgcmVzb3VyY2UgJyArIEtsYXNzLm1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHV0aWxzLm1vY2s7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCh2YWx1ZS5jb25zdHJ1Y3RvciAhPT0gdXRpbHMubW9jaykgJiYgKHZhbHVlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSAhPT0gZXh0X3JlZikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBjYW4gYXNzaWduIG9ubHkgJyArIGV4dF9yZWYgKyAnIHRvICcgKyByZWYuaWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbbG9jYWxfcmVmXSA9IHZhbHVlLmlkO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbbG9jYWxfcmVmXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgJ25ldy0nICsgZXh0X3JlZiwgJ2RlbGV0ZWQtJyArIGV4dF9yZWYsJ3VwZGF0ZWQtJyArIGV4dF9yZWYsICduZXctbW9kZWwtJyArIGV4dF9yZWYvKiwgJ3VwZGF0ZWQtJyArIEtsYXNzLm1vZGVsTmFtZSovKTtcblxuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlZi5pZCldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRPUk0uZ2V0KGV4dF9yZWYsdGhpc1tsb2NhbF9yZWZdKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAob25lIHRvIG1hbnkpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZWRCeSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gcmVmLmJ5ICsgJy4nICsgcmVmLmlkO1xuICAgICAgICAgICAgdmFyIHByb3BlcnR5TmFtZSA9IHJlZi5ieSArICdfJyArIHV0aWxzLnBsdXJhbGl6ZShyZWYuaWQpO1xuICAgICAgICAgICAgdmFyIHJldkluZGV4ID0gcmVmLmJ5O1xuICAgICAgICAgICAgaWYgKEtsYXNzLnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJ5ZWQgdG8gcmVkZWZpbmUgcHJvcGVydHkgJyArIHByb3BlcnR5TmFtZSArICdzJyArICcgZm9yICcgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcHJvcGVydHlOYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSAocmV2SW5kZXggaW4gSURCKSA/IFJFVklEWFtpbmRleE5hbWVdLmdldCh0aGlzLmlkICsgJycpOm51bGw7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtlci5mb3JlaWduS2V5c1tpbmRleE5hbWVdLmFzayh0aGlzLmlkLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgIH0sIG51bGwsICduZXctJyArIHJldkluZGV4LCAndXBkYXRlZC0nICsgcmV2SW5kZXgsICdkZWxldGVkLScgKyByZXZJbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShyZWYuYnkpKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdHMgPSB7fTtcbiAgICAgICAgICAgICAgICBvcHRzW3JlZi5pZF0gPSBbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5nZXQocmVmLmJ5LG9wdHMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9idWlsZGluZyByZWZlcmVuY2UgdG8gKG1hbnkgdG8gbWFueSkgZmllbGRzXG4gICAgICAgIGlmIChtb2RlbC5tYW55VG9NYW55KSB7XG4gICAgICAgICAgICBMYXp5KG1vZGVsLm1hbnlUb01hbnkpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSByZWYuaW5kZXhOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCA9IHJlZi5maXJzdD8gMCA6IDE7XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbE5hbWUgPSByZWYubW9kZWw7XG4vLyAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gZ2V0SW5kZXgob21vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIGdldHRlciA9IGxpbmtlci5tMm1JbmRleFtpbmRleE5hbWVdWydnZXQnICsgKDEgLSBmaXJzdCldO1xuXG4gICAgICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5tb2RlbCArICdzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gZ2V0dGVyKHRocy5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1cyUFJFU09VUkNFLmZldGNoKG9tb2RlbE5hbWUsIHtpZCA6IGlkc30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldCA9IGdldEluZGV4KG9tb2RlbE5hbWUpLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMgJiYgZ2V0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldCA9IExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICAgICAgfSwgbnVsbCwgJ3JlY2VpdmVkLW0ybS0nICsgaW5kZXhOYW1lLCAncmVjZWl2ZWQtJyArIG9tb2RlbE5hbWUpO1xuXG4gICAgICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZSh1dGlscy5wbHVyYWxpemUob21vZGVsTmFtZSkpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtlci5nZXRNMk0oaW5kZXhOYW1lLCBbdGhzLmlkXSwgZmlyc3QsZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSxudWxsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdldCA9IElEQltvbW9kZWxOYW1lXS5nZXQuYmluZChJREJbb21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChMYXp5KGlkcykubWFwKGdldCkuZmlsdGVyKHV0aWxzLmJvb2wpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChbXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgICAgICBLbGFzcy5maWVsZHNbdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWxOYW1lKV0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiB1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpLFxuICAgICAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcmVhZGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdNMk0nLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3JzOiBbXVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUudW5saW5rUmVmZXJlbmNlID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgICAgICB2YXIgaW5zdGFuY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmNvbnN0cnVjdG9yLm5hbWUgPT0gJ0FycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlcyA9IGluc3RhbmNlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IGluc3RhbmNlc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbCA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW0lELCB4XVxuICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBbW0lELCBpbnN0YW5jZS5pZF1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWwgKyAncy9kZWxldGUnLCB7Y29sbGVjdGlvbjogY29sbGVjdGlvbn0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWw7XG4gICAgICAgICAgICAgICAgaWYgKG11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWZzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaW5kZXhOYW1lID0gb21vZGVsICsgJy8nICsgS2xhc3MubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElOREVYX00yTSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVmcyA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5kaWZmZXJlbmNlKExhenkoSU5ERVhfTTJNW2luZGV4TmFtZV1bMF0uZ2V0KHRoaXMuaWQpKSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWZzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBMYXp5KHJlZnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBfUE9TVChLbGFzcy5tb2RlbE5hbWUsIG9tb2RlbCArICdzL3B1dCcsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChpbmRleE5hbWUgaW4gbGlua2VyLm0ybUluZGV4KSAmJiBMYXp5KGxpbmtlci5tMm1JbmRleFtpbmRleE5hbWVdWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWwpXShpbnN0YW5jZS5pZCkpLmZpbmQodGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWwgKyAncy9wdXQnLCB7Y29sbGVjdGlvbjogW1t0aGlzLmlkLCBpbnN0YW5jZS5pZF1dfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCduZXctbW9kZWwnLCBLbGFzcyk7XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ25ldy1tb2RlbC0nICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgcmV0dXJuIEtsYXNzO1xuICAgIH07XG5cbiAgICB0aGlzLmdvdERhdGEgPSBmdW5jdGlvbiAoZGF0YSwgY2FsbEJhY2spIHtcbiAgICAgICAgLy8gcmVjZWl2ZSBhbGwgZGF0YSBmcm9tIGV2ZXJ5IGVuZCBwb2ludFxuICAgICAgICBjb25zb2xlLmluZm8oJ2dvdERhdGEnKTtcbiAgICAgICAgaWYgKHR5cGVvZihkYXRhKSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2RhdGEgJyArIGRhdGEgKyAnIHJlZnVzZWQgZnJvbSBnb3REYXRhKCknKTtcbiAgICAgICAgICAgIGlmIChjYWxsQmFjaykge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBjbGVhbiBkYXRhIGZyb20gcmVsYXRpb25zIGFuZCBwZXJtaXNzaW9ucyBmb3IgdXNpbmcgaXQgYWZ0ZXIgbW9kZWwgcGFyc2luZ1xuICAgICAgICBpZiAoJ19leHRyYScgaW4gZGF0YSl7IGRlbGV0ZSBkYXRhLl9leHRyYSB9XG4gICAgICAgIHZhciBUT09ORSA9IGRhdGEuVE9PTkU7XG4gICAgICAgIHZhciBUT01BTlkgPSBkYXRhLlRPTUFOWTtcbiAgICAgICAgdmFyIE1BTllUT01BTlkgPSBkYXRhLk1BTllUT01BTlk7XG4gICAgICAgIHZhciBQRVJNSVNTSU9OUyA9IGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIHZhciBQQSA9IGRhdGEuUEE7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPT05FO1xuICAgICAgICBkZWxldGUgZGF0YS5UT01BTlk7XG4gICAgICAgIGRlbGV0ZSBkYXRhLk1BTllUT01BTlk7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBFUk1JU1NJT05TO1xuICAgICAgICBkZWxldGUgZGF0YS5QQTtcbiAgICAgICAgaWYgKCFQQSkgeyBQQSA9IHt9OyB9XG5cbiAgICAgICAgLy8gY2xlYW5pbmcgZnJvbSB1c2VsZXNzIGRlbGV0ZWQgZGF0YVxuICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5maWx0ZXIoZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgIHJldHVybiAoISgnZGVsZXRlZCcgaW4gdikgfHwgKChrIGluIG1vZGVsQ2FjaGUpKSk7XG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJ20ybScgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG0ybSA9IGRhdGEubTJtO1xuICAgICAgICAgICAgZGVsZXRlIGRhdGFbJ20ybSddO1xuICAgICAgICB9XG4gICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbiAoZGF0YSwgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICAgICAgICAgIHZhciBtb2RlbENsYXNzID0gbW9kZWw7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucmVzdWx0cyAmJiAoZGF0YS5yZXN1bHRzLmxlbmd0aCA+IDApICYmIChkYXRhLnJlc3VsdHNbMF0uY29uc3RydWN0b3IgPT0gQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cyA9IExhenkoZGF0YS5yZXN1bHRzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTGF6eShtb2RlbENsYXNzLmZpZWxkc09yZGVyKS56aXAoeCkudG9PYmplY3QoKVxuICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIHZhciBkZWxldGVkID0gZGF0YS5kZWxldGVkO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gUEEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIE1QQSA9IFBBW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIExhenkocmVzdWx0cykuZWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3JkLmlkIGluIE1QQSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoTVBBW3JlY29yZC5pZF0pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBpbmRleGluZyByZWZlcmVuY2VzIGJ5IGl0cyBJRFxuICAgICAgICAgICAgICAgIHZhciBpdGFiID0gZ2V0SW5kZXgobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFibGUgPSBpdGFiLnNvdXJjZTtcblxuICAgICAgICAgICAgICAgIC8vIG9iamVjdCBkZWxldGlvblxuICAgICAgICAgICAgICAgIGlmIChkZWxldGVkKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlZC5mb3JFYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbi8qXG4gICAgICAgICAgICAgICAgTGF6eShkZWxldGVkKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0YWJsZVt4XTtcbiAgICAgICAgICAgICAgICB9KTtcbiovXG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IHJlc3VsdHMuaW5kZXhCeSgnaWQnKTtcbiAgICAgICAgICAgICAgICB2YXIgaWsgPSBpZHgua2V5cygpO1xuICAgICAgICAgICAgICAgIHZhciBubmV3ID0gaWsuZGlmZmVyZW5jZShpdGFiLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgpXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkID0gaWsuZGlmZmVyZW5jZShubmV3KTtcbiAgICAgICAgICAgICAgICAvLyByZW1vdmluZyBvbGQgaWRlbnRpY2FsIHZhbHVlc1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQgPSB1cGRhdGVkLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIXV0aWxzLnNhbWVBcyhpZHguZ2V0KHgpLCBpdGFiLmdldCh4KS5hc1JhdygpKTtcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy8gY2xhc3NpZnkgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIHZhciBwZXJtcyA9IGRhdGEucGVybWlzc2lvbnMgPyBMYXp5KGRhdGEucGVybWlzc2lvbnMpIDogTGF6eSh7fSk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld09iamVjdHMgPSBubmV3Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IG1vZGVsQ2xhc3MoaWR4LmdldCh4KSwgcGVybXMuZ2V0KHgpKVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBjbGFzc2lmeWluZyB1cGRhdGVkXG4gICAgICAgICAgICAgICAgLy92YXIgdXBkYXRlZE9iamVjdHMgPSB1cGRhdGVkLm1hcChmdW5jdGlvbih4KXtyZXR1cm4gbmV3IG1vZGVsQ2xhc3MoaWR4LmdldCh4KSxwZXJtcy5nZXQoeCkpfSk7XG4gICAgICAgICAgICAgICAgLy92YXIgdW8gPSB1cGRhdGVkT2JqZWN0cy50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy91cGRhdGVkT2JqZWN0cyA9IExhenkodW8pLm1hcChmdW5jdGlvbih4KXtyZXR1cm4gW3gsdGFibGVbeC5pZF1dfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0aW5nIHNpbmdsZSBvYmplY3RzXG4gICAgICAgICAgICAgICAgdmFyIGNoYW5nZWQgPSBbXTtcbi8vICAgICAgICAgICAgICAgIHZhciBEQVRFRklFTERTID0gTU9ERUxfREFURUZJRUxEU1ttb2RlbE5hbWVdO1xuLy8gICAgICAgICAgICAgICAgdmFyIEJPT0xGSUVMRFMgPSBNT0RFTF9CT09MRklFTERTW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsUmVmZXJlbmNlcyA9IExhenkobW9kZWwucmVmZXJlbmNlcykubWFwKGZ1bmN0aW9uKGspIHsgcmV0dXJuIFtrLDFdfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVkLmZvckVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZEl0ZW0gPSB0YWJsZVt4XTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZENvcHkgPSBvbGRJdGVtLmNvcHkoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0l0ZW0gPSBpZHguZ2V0KHgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRpbmcgZWFjaCBhdHRyaWJ1dGUgc2luZ3VsYXJseVxuXG4gICAgICAgICAgICAgICAgICAgIExhenkobW9kZWwuZmllbGRzKS5lYWNoKGZ1bmN0aW9uKGZpZWxkLCBmaWVsZE5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaChmaWVsZC50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVmZXJlbmNlJyA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkSXRlbVsnXycgKyBmaWVsZE5hbWVdID0gbmV3SXRlbVtmaWVsZE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOYU4gaXMgY29udm50aW9uYWxseSBhIGNhY2hlIGRlbGV0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkSXRlbVtmaWVsZE5hbWVdID0gTmFOO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGF0ZSc6IHtvbGRJdGVtW2ZpZWxkTmFtZV0gPSBuZXcgRGF0ZShuZXdJdGVtW2ZpZWxkTmFtZV0gKiAxMDAwKTsgYnJlYWt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2RhdGV0aW1lJzoge29sZEl0ZW1bZmllbGROYW1lXSA9IG5ldyBEYXRlKG5ld0l0ZW1bZmllbGROYW1lXSAqIDEwMDApOyBicmVha307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnYm9vbGVhbicgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobmV3SXRlbVtmaWVsZE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIG51bGwgOiB7IG9sZEl0ZW1bZmllbGROYW1lXSA9IG51bGw7IGJyZWFrOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnVCcgOiB7IG9sZEl0ZW1bZmllbGROYW1lXSA9IHRydWU7IGJyZWFrOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnRicgOiB7IG9sZEl0ZW1bZmllbGROYW1lXSA9IGZhbHNlOyBicmVhazsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgdHJ1ZSA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gdHJ1ZTsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIGZhbHNlIDogeyBvbGRJdGVtW2ZpZWxkTmFtZV0gPSBmYWxzZTsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB7b2xkSXRlbVtmaWVsZE5hbWVdID0gbmV3SXRlbVtmaWVsZE5hbWVdfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtW2ZpZWxkTmFtZV0gPSBuZXdJdGVtW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkLnB1c2goW25ld0l0ZW0sIG9sZENvcHldKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vLy8gc2VuZGluZyBzaWduYWwgZm9yIHVwZGF0ZWQgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKGNoYW5nZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3VwZGF0ZWQtJyArIG1vZGVsTmFtZSwgY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vKioqKioqKiogVXBkYXRlIHVuaXZlcnNlICoqKioqKioqXG4gICAgICAgICAgICAgICAgdmFyIG5vID0gbmV3T2JqZWN0cy50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgTGF6eShubykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB0YWJsZVt4LmlkXSA9IHhcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyByZWJ1bGRpbmcgcmV2ZXJzZSBpbmRleGVzXG4gICAgICAgICAgICAgICAgTGF6eShtb2RlbENhY2hlW21vZGVsTmFtZV0ucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgICAgIFJFVklEWFttb2RlbE5hbWUgKyAnLicgKyByZWZdID0gSURCW21vZGVsTmFtZV0uZ3JvdXBCeSgnXycgKyByZWYpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHNlbmRpbmcgZXZlbnRzIGZvciBuZXcgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKG5vLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbmV3LScgKyBtb2RlbE5hbWUsIExhenkobm8pLCBkYXRhLnRvdGFsUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnZGVsZXRlZC0nICsgbW9kZWxOYW1lLCBkZWxldGVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIGRhdGEgYXJyaXZlZFxuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLScgKyBtb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4vKiAgICAgICAgXG4gICAgICAgIGlmIChUT09ORSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVE9PTkUnKTtcbiAgICAgICAgICAgIExhenkoVE9PTkUpLmVhY2goZnVuY3Rpb24gKHZhbHMsIG1vZGVsTmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIHVkeCA9IGdldFVubGlua2VkKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoVE9NQU5ZKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUT01BTlknKTtcbiAgICAgICAgICAgIExhenkoVE9NQU5ZKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBpbmRleE5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gQVNLRURfVU5MSU5LRUQpKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX1VOTElOS0VEW2luZGV4TmFtZV0gPSBMYXp5KFtdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgTGF6eSh2YWxzKS5lYWNoKGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9VTkxJTktFRFtpbmRleE5hbWVdLnNvdXJjZS5wdXNoKGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChNQU5ZVE9NQU5ZKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdNQU5ZVE9NQU5ZJyk7XG4gICAgICAgICAgICBMYXp5KE1BTllUT01BTlkpLmVhY2goZnVuY3Rpb24gKHZhbHMsIGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCA9IHBhcnNlSW50KGluZGV4TmFtZS5zcGxpdCgnfCcpWzFdKTtcbiAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBpbmRleE5hbWUuc3BsaXQoJ3wnKVswXTtcbiAgICAgICAgICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gQVNLRURfTTJNKSkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9NMk1baW5kZXhOYW1lXSA9IFt7fSwge31dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgTUlEWCA9IEFTS0VEX00yTVtpbmRleE5hbWVdW2ZpcnN0XTtcbiAgICAgICAgICAgICAgICBMYXp5KHZhbHMpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgTUlEWFt4ICsgJyddID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgTUlEWFt4XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgXG4qL1xuICAgICAgICBpZiAobTJtKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RNMk0obTJtKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoUEVSTUlTU0lPTlMpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdFBlcm1pc3Npb25zKFBFUk1JU1NJT05TKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjYWxsQmFjaykge1xuICAgICAgICAgICAgY2FsbEJhY2soZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnZ290LWRhdGEnKTtcbiAgICB9O1xuICAgIHRoaXMuZ290UGVybWlzc2lvbnMgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24gKHYsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgTGF6eSh2WzBdKS5lYWNoKGZ1bmN0aW9uIChyb3csIGlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKChyZXNvdXJjZU5hbWUgaW4gSURCKSAmJiAoaWQgaW4gSURCW3Jlc291cmNlTmFtZV0uc291cmNlKSl7XG4gICAgICAgICAgICAgICAgICAgIElEQltyZXNvdXJjZU5hbWVdLmdldChpZCkuX3Blcm1pc3Npb25zID0gTGF6eShyb3cpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCB0cnVlXVxuICAgICAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKExhenkodlswXSkuc2l6ZSgpKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMtJyArIHJlc291cmNlTmFtZSwgTGF6eSh2WzBdKS5rZXlzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZW1pdCgndXBkYXRlLXBlcm1pc3Npb25zJyk7XG4gICAgfTtcblxuXG4gICAgdGhpcy5nb3RNMk0gPSBmdW5jdGlvbihtMm0pe1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihkYXRhLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgdmFyIG0ybUluZGV4ID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24obSl7XG4gICAgICAgICAgICAgICAgTGF6eShtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsdmVyYil7XG4gICAgICAgICAgICAgICAgICAgIG0ybUluZGV4W3ZlcmJdKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdyZWNlaXZlZC1tMm0nKTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLW0ybS0nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5mZXRjaCA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKSB7ICAvL1xuICAgICAgICAvLyBpZiBhIGNvbm5lY3Rpb24gaXMgY3VycmVudGx5IHJ1bm5pbmcsIHdhaXQgZm9yIGNvbm5lY3Rpb24uXG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gd2FpdGluZ0Nvbm5lY3Rpb25zKXtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0sNTAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGZldGNoaW5nIGFzeW5jaHJvbW91cyBtb2RlbCBmcm9tIHNlcnZlclxuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUobW9kZWxOYW1lLCAoZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgICAgIC8vIGlmIGRhdGEgY2FtZXMgZnJvbSByZWFsdGltZSBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKFcyUFJFU09VUkNFLmNvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gZ2V0dGluZyBmaWx0ZXIgZmlsdGVyZWQgYnkgY2FjaGluZyBzeXN0ZW1cbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyID0gbGlzdENhY2hlLmZpbHRlcihtb2RlbCxmaWx0ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHNvbXRoaW5nIGlzIG1pc3Npbmcgb24gbXkgbG9jYWwgREIgXG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXNrIGZvciBtaXNzaW5ncyBhbmQgcGFyc2Ugc2VydmVyIHJlc3BvbnNlIGluIG9yZGVyIHRvIGVucmljaCBteSBsb2NhbCBEQi5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBsYWNpbmcgbG9jayBmb3IgdGhpcyBtb2RlbFxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywge2ZpbHRlciA6IGZpbHRlcn0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSxjYWxsQmFjayk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVsZWFzZSBsb2NrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihyZXQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWxlYXNlIGxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywgc2VuZERhdGEsZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbHRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHT1RfQUxMLnNvdXJjZS5wdXNoKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXQgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICAvLyBzZWFyY2ggb2JqZWN0cyBmcm9tIElEQi4gSWYgc29tZSBpZCBpcyBtaXNzaW5nLCBpdCByZXNvbHZlIGl0IGJ5IHRoZSBzZXJ2ZXJcbiAgICAgICAgLy8gaWYgYSByZXF1ZXN0IHRvIHRoZSBzYW1lIG1vZGVsIGlzIHBlbmRpbmcsIHdhaXQgZm9yIGl0cyBjb21wbGV0aW9uXG4gICAgICAgIFxuICAgICAgICBpZiAoaWRzLmNvbnN0cnVjdG9yICE9PSBBcnJheSl7XG4gICAgICAgICAgICBpZHMgPSBbaWRzXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBzb21lIGVudGl0eSBpcyBtaXNzaW5nIFxuICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUgLCB7aWQ6IGlkc30sIG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgIHZhciBpdGFiID0gSURCW21vZGVsTmFtZV1cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIGlkcyl7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goaXRhYi5zb3VyY2VbaWRzW2lkXV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ290TW9kZWwgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBmb3IgKHZhciBtb2RlbE5hbWUgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gZGF0YVttb2RlbE5hbWVdO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlWydkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lXSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgbW9kZWxDYWNoZVttb2RlbE5hbWVdID0gbWFrZU1vZGVsQ2xhc3MobW9kZWwpO1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIElEQikpIHtcbiAgICAgICAgICAgICAgICBJREJbbW9kZWxOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZGVzY3JpYmUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHJldCA9IG1vZGVsQ2FjaGVbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpKXtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGZhaWxlZE1vZGVscyl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY2FjaGVLZXkgPSAnZGVzY3JpcHRpb246JyArIG1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoY2FjaGVLZXkgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ290TW9kZWwoSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbY2FjaGVLZXldKSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVzY3JpYmUnLG51bGwsIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290TW9kZWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZWxOb3RGb3VuZC5oYW5kbGUobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxlZE1vZGVsc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9ICAgICAgICBcbiAgICB9O1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZGVjb3JhdG9yKSB7XG4gICAgICAgIHZhciBrZXkgPSB1dGlscy5oYXNoKGRlY29yYXRvcik7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlcnMpKSBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXSA9IG5ldyBIYW5kbGVyKCk7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlclVzZWQpKSBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXSA9IHt9O1xuICAgICAgICBpZiAoa2V5IGluIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdW2tleV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gbW9kZWxDYWNoZSkge1xuICAgICAgICAgICAgZGVjb3JhdG9yKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXS5hZGRIYW5kbGVyKGRlY29yYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGF0dHJpYnV0ZXMpe1xuICAgICAgICB2YXIgYWRkUHJvcGVydHkgPSBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlcykge1xuICAgICAgICAgIGF0dHJpYnV0ZXMuZm9yRWFjaChmdW5jdGlvbih2YWwpe1xuICAgICAgICAgICAgdmFyIGtleSA9ICdwQTonICsgbW9kZWwubW9kZWxOYW1lICsgJzonICsgdmFsO1xuICAgICAgICAgICAgdmFyIGthdHRyID0gJ19fJyArIHZhbDtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtb2RlbC5wcm90b3R5cGUsIHZhbCwge1xuICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2F0dHIgaW4gdGhpcykpe1xuICAgICAgICAgICAgICAgICAgdmFyIHYgPSBsb2NhbFN0b3JhZ2Vba2V5ICsgdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgICB0aGlzW2thdHRyXSA9IHY/SlNPTi5wYXJzZSh2KTpudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1trYXR0cl07XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgICAgIHRoaXNba2F0dHJdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW2tleSArIHRoaXMuaWRdID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKSkgeyBwZXJzaXN0ZW50QXR0cmlidXRlc1ttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgdmFyIGF0dHJzID0gcGVyc2lzdGVudEF0dHJpYnV0ZXNbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHZhciBuZXdBdHRycyA9IExhenkoYXR0cmlidXRlcykuZGlmZmVyZW5jZShhdHRycykudG9BcnJheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5ld0F0dHJzID0gYXR0cnM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld0F0dHJzLmxlbmd0aCl7XG4gICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIG1vZGVsQ2FjaGUpe1xuICAgICAgICAgICAgICAgIGFkZFByb3BlcnR5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSwgbmV3QXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGF0dHJzLG5ld0F0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbignbmV3LW1vZGVsJywgZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVycyl7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWwubW9kZWxOYW1lXS5oYW5kbGUobW9kZWxDYWNoZVttb2RlbC5tb2RlbE5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzKG1vZGVsLm1vZGVsTmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMucXVlcnkgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHRoaXMuZGVzY3JpYmUobW9kZWxOYW1lLGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgIC8vIGFycmF5Zml5IGFsbCBmaWx0ZXIgdmFsdWVzXG4gICAgICAgICAgICBmaWx0ZXIgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHYsayl7IHJldHVybiBbayxBcnJheS5pc0FycmF5KHYpP3Y6W3ZdXX0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICB2YXIgZmlsdGVyRnVuY3Rpb24gPSB1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgdmFyIGlkeCA9IGdldEluZGV4KG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB0aHMuZmV0Y2gobW9kZWxOYW1lLGZpbHRlcix0b2dldGhlciwgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soaWR4LmZpbHRlcihmaWx0ZXJGdW5jdGlvbikudmFsdWVzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2RlbGV0ZScsIHsgaWQgOiBpZHN9LCBjYWxsQmFjayk7XG4gICAgfTtcblxuICAgIHRoaXMuY29ubmVjdCA9IGZ1bmN0aW9uIChjYWxsQmFjaykge1xuICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmlzTG9nZ2VkSW4pIHtcbiAgICAgICAgICAgIGNhbGxCYWNrKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29ubmVjdChjYWxsQmFjayk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5mdW5jdGlvbiByZVdoZWVsT1JNKGVuZFBvaW50LCBsb2dpbkZ1bmMpe1xuICAgIHRoaXMuJG9ybSA9IG5ldyBiYXNlT1JNKG5ldyB1dGlscy5yZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgbG9naW5GdW5jKSx0aGlzKTtcbiAgICB0aGlzLm9uID0gdGhpcy4kb3JtLm9uLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLmVtaXQgPSB0aGlzLiRvcm0uZW1pdC5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy51bmJpbmQgPSB0aGlzLiRvcm0udW5iaW5kLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLm9uY2UgPSB0aGlzLiRvcm0ub25jZTtcbiAgICB0aGlzLmFkZE1vZGVsSGFuZGxlciA9IHRoaXMuJG9ybS5hZGRNb2RlbEhhbmRsZXIuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSB0aGlzLiRvcm0uYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMudXRpbHMgPSB1dGlscztcbiAgICB0aGlzLmxvZ291dCA9IHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ291dC5iaW5kKHRoaXMuJG9ybS5jb25uZWN0aW9uKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzLiRvcm0uY29ubmVjdGlvbjtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKGZ1bmN0aW9uKGNhbGxCYWNrLHJlamVjdCl7XG4gICAgICAgIGNvbm5lY3Rpb24uY29ubmVjdChjYWxsQmFjayk7XG4gICAgfSkpO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ2luKHVzZXJuYW1lLCBwYXNzd29yZCwgYWNjZXB0KTsgICAgXG4gICAgfSkuYmluZCh0aGlzKSk7XG4gICAgXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dvdXQgPSBmdW5jdGlvbih1cmwpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dvdXQoKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0TW9kZWwgPSBmdW5jdGlvbihtb2RlbE5hbWUpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVzY3JpYmUobW9kZWxOYW1lLGFjY2VwdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNpbmdsZSA9IGZhbHNlO1xuICAgIHZhciBtb2ROYW1lID0gbW9kZWxOYW1lO1xuICAgIHZhciBmaWx0ZXI7XG4gICAgaWYgKHR5cGVvZiBpZHMgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHNpbmdsZSA9IHRydWU7XG4gICAgICAgIGZpbHRlciA9IHsgaWQgOiBbaWRzXX07XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGlkcykpe1xuICAgICAgICBmaWx0ZXIgPSB7IGlkIDogaWRzIH07XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgaWRzID09PSAnb2JqZWN0Jykge1xuICAgICAgICBmaWx0ZXIgPSBpZHM7XG4gICAgfSBlbHNlIGlmIChpZHMgPT09IG51bGwpIHtcbiAgICAgICAgZmlsdGVyID0ge307XG4gICAgfVxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLnF1ZXJ5KG1vZGVsTmFtZSwgZmlsdGVyLCBudWxsLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzaW5nbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChkYXRhLmxlbmd0aCA/IGRhdGFbMF0gOiBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKlxucmVXaGVlbE9STS5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBmaWx0ZXIsIHJlbGF0ZWQpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB2YXIgdG9nZXRoZXIgPSBudWxsO1xuICAgICAgICBpZiAocmVsYXRlZCAmJiAocmVsYXRlZC5jb25zdHJ1Y3RvciA9PT0gQXJyYXkpICYmIChyZWxhdGVkLmxlbmd0aCkpe1xuICAgICAgICAgICAgdG9nZXRoZXIgPSByZWxhdGVkO1xuICAgICAgICB9IGVsc2UgaWYgKHJlbGF0ZWQgJiYgKHJlbGF0ZWQuY29uc3RydWN0b3IgPT09IFN0cmluZykgJiYgKHJlbGF0ZWQubGVuZ3RoKSl7XG4gICAgICAgICAgICB0b2dldGhlciA9IHJlbGF0ZWQuc3BsaXQoJywnKTtcbiAgICAgICAgfVxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5xdWVyeShtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGFjY2VwdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KVxufTtcbiovXG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGlkcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlbGV0ZShtb2RlbE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRMb2dnZWRVc2VyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICh0aGlzLiRvcm0uY29ubmVjdGlvbi5jYWNoZWRTdGF0dXMudXNlcl9pZClcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KCdhdXRoX3VzZXInLHRoaXMuJG9ybS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy51c2VyX2lkKTtcbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KSB7XG4gICAgICAgICAgICBzZWxmLm9uY2UoJ2xvZ2dlZC1pbicsZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgICAgIHNlbGYuZ2V0KCdhdXRoX3VzZXInLCB1c2VyKS50aGVuKGFjY2VwdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS4kc2VuZFRvRW5kcG9pbnQgPSBmdW5jdGlvbiAodXJsLCBkYXRhKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLiRwb3N0KHVybCwgZGF0YSk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9naW4odXNlcm5hbWUscGFzc3dvcmQpO1xufVxuIl19
