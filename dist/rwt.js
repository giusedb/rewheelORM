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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJjb25uZWN0aW9uLmpzIiwidG91Y2hlci5qcyIsInZhY3V1bWNhY2hlci5qcyIsImF1dG9saW5rZXIuanMiLCJsaXN0Y2FjaGVyLmpzIiwibWFueXRvbWFueS5qcyIsImNhY2hlci5qcyIsIm9ybS5qcyJdLCJuYW1lcyI6WyJIYW5kbGVyIiwiaGFuZGxlcnMiLCJzdHJIYW5kbGVycyIsInByb3RvdHlwZSIsImFkZEhhbmRsZXIiLCJoYW5kbGVyIiwic3RySGFuZGxlciIsInV0aWxzIiwiaGFzaCIsInRvU3RyaW5nIiwicHVzaCIsImhhbmRsZSIsImFyZ3MiLCJBcnJheSIsInNsaWNlIiwiY2FsbCIsImFyZ3VtZW50cyIsImZvckVhY2giLCJmdW5jIiwiYXBwbHkiLCJoYW5kbGVCeSIsInRocyIsIk5hbWVkRXZlbnRNYW5hZ2VyIiwiZXZlbnRzIiwiaGFuZGxlcklkIiwiaWR4SWQiLCJvbiIsIm5hbWUiLCJpZCIsImVtaXQiLCJldmVudCIsInVuYmluZCIsImNvdW50IiwiTGF6eSIsImVhY2giLCJ2IiwiayIsImlkeCIsIm4iLCJyZXZlcnNlIiwieCIsInNwbGljZSIsIm9uY2UiLCJldmVudE5hbWUiLCJoYW5kbGVyRnVuY3Rpb24iLCJzZWxmIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsIm1vY2siLCJyZW5hbWVGdW5jdGlvbiIsImZuIiwiRnVuY3Rpb24iLCJiaW5kIiwiY2FjaGVkIiwia2V5Iiwid3JhcHBlciIsImxvZyIsImNvbnNvbGUiLCJ4ZHIiLCJ1cmwiLCJkYXRhIiwiYXBwbGljYXRpb24iLCJ0b2tlbiIsImZvcm1FbmNvZGUiLCJQcm9taXNlIiwiYWNjZXB0IiwicmVqZWN0IiwicmVxIiwiWE1MSHR0cFJlcXVlc3QiLCJvbnJlYWR5c3RhdGVjaGFuZ2UiLCJyZWFkeVN0YXRlIiwicmVzcG9uc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwicmVzcG9uc2VUZXh0IiwiYSIsInJlc3BvbnNlIiwic3RhdHVzIiwicmVxdWVzdCIsIlhEb21haW5SZXF1ZXN0Iiwib25sb2FkIiwic3RhdHVzVGV4dCIsIkVycm9yIiwib3BlbiIsIm9uZXJyb3IiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiX190b2tlbl9fIiwic2l6ZSIsInN0cmluZ2lmeSIsIm1hcCIsImVuY29kZVVSSSIsInRvQXJyYXkiLCJqb2luIiwic2VuZCIsImNhcGl0YWxpemUiLCJzIiwidG9VcHBlckNhc2UiLCJ0b0xvd2VyQ2FzZSIsInN0ciIsInJldCIsImxlbmd0aCIsImNoYXJDb2RlQXQiLCJtYWtlRmlsdGVyIiwibW9kZWwiLCJmaWx0ZXIiLCJ1bmlmaWVyIiwiZG9udFRyYW5zbGF0ZUZpbHRlciIsInNvdXJjZSIsInZhbHMiLCJmaWVsZCIsImlzQXJyYXkiLCJmaWVsZHMiLCJ0eXBlIiwiY29uc3RydWN0b3IiLCJOdW1iZXIiLCJlcnJvciIsIm9ybSIsInNhbWVBcyIsInkiLCJwbHVyYWxpemUiLCJiZWZvcmVDYWxsIiwiYmVmb3JlIiwiZGVjb3JhdG9yIiwidGhlbiIsImNsZWFuU3RvcmFnZSIsImxvY2FsU3RvcmFnZSIsImtleXMiLCJjbGVhbkRlc2NyaXB0aW9uIiwic3RhcnRzV2l0aCIsImNociIsInNwbGl0IiwicGVybXV0YXRpb25zIiwiYXJyIiwid2FpdEZvciIsImNhbGxCYWNrIiwid2FpdGVyIiwic2V0VGltZW91dCIsImJvb2wiLCJCb29sZWFuIiwibm9vcCIsInR6T2Zmc2V0IiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwidHJhbnNGaWVsZFR5cGUiLCJkYXRlIiwiZGF0ZXRpbWUiLCJzdHJpbmciLCJ0ZXh0IiwiaW50ZWdlciIsInBhcnNlSW50IiwiZmxvYXQiLCJwYXJzZUZsb2F0IiwiU1RBVFVTS0VZIiwiUmVhbHRpbWVDb25uZWN0aW9uIiwiZW5kUG9pbnQiLCJyd3RDb25uZWN0aW9uIiwiY29ubmVjdGlvbiIsIlNvY2tKUyIsIm9ub3BlbiIsInRlbmFudCIsIm9ubWVzc2FnZSIsImUiLCJvbmNsb3NlIiwid3NDb25uZWN0IiwiY2FjaGVkU3RhdHVzIiwiY2xvc2UiLCJyZVdoZWVsQ29ubmVjdGlvbiIsImdldExvZ2luIiwiZW5kc1dpdGgiLCJpc0Nvbm5lY3RlZCIsImlzTG9nZ2VkSW4iLCIkcG9zdCIsInByb21pc2UiLCJ4aHIiLCJmb3JjZSIsInN0YXR1c1dhaXRpbmciLCJ1cGRhdGVTdGF0dXMiLCJsYXN0QnVpbGQiLCJsYXN0X2J1aWxkIiwidXNlcl9pZCIsIm9sZFN0YXR1cyIsImxvZ2luSW5mbyIsIk9iamVjdCIsImxvZ2luIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsIm9iaiIsInJlYWx0aW1lRW5kUG9pbnQiLCJ3c0Nvbm5lY3Rpb24iLCJ1c2VyaWQiLCJsb2dvdXQiLCJvayIsImNvbm5lY3QiLCJUb3VjaGVyIiwidG91Y2hlZCIsInRvdWNoIiwidCIsIlZhY3V1bUNhY2hlciIsImFza2VkIiwicGtJbmRleCIsIm1pc3NpbmciLCJhc2siLCJsYXp5IiwiY29udGFpbnMiLCJnZXRBc2tlZEluZGV4IiwibWlzc2luZ3MiLCJ1bmlxdWUiLCJBdXRvTGlua2VyIiwiYWN0aXZlcyIsIklEQiIsIlcyUFJFU09VUkNFIiwibGlzdENhY2hlIiwibWFpbkluZGV4IiwiZm9yZWlnbktleXMiLCJtMm0iLCJtMm1JbmRleCIsInBlcm1pc3Npb25zIiwiaW5kZXgiLCJnZXRJbmRleEZvciIsInJlZmVyZW5jZXMiLCJyZWZlcmVuY2UiLCJpbmRleE5hbWUiLCJ0byIsInJlZmVyZW5jZWRCeSIsImJ5IiwibWFueVRvTWFueSIsInJlbGF0aW9uIiwiTWFueVRvTWFueVJlbGF0aW9uIiwibTJtR2V0IiwiY29sbGVjdGlvbiIsImdvdERhdGEiLCJnZXRNMk0iLCJsaW5rVW5saW5rZWQiLCJ2YWx1ZXMiLCJzdW0iLCJjaGFuZ2VkIiwiaW5kZXhlcyIsIklOREVYIiwiZ2V0dGVyIiwiaWRzIiwib3RoZXJJbmRleCIsImRlc2NyaWJlIiwiZmxhdHRlbiIsIm1vZGVsTmFtZSIsImlkYiIsImZldGNoIiwibWFpblJlc291cmNlIiwiZmllbGROYW1lIiwidG9PYmplY3QiLCJyZXNvdXJjZU5hbWUiLCJnb3RQZXJtaXNzaW9ucyIsIlBFUk1JU1NJT05TIiwic2V0SW50ZXJ2YWwiLCJMaXN0Q2FjaGVyIiwiZ290QWxsIiwiY29tcG9zaXRlQXNrZWQiLCJjYXJ0ZXNpYW5Qcm9kdWN0MSIsImIiLCJjYXJ0ZXNpYW5Qcm9kdWN0IiwiZXhwbG9kZUZpbHRlciIsInByb2R1Y3QiLCJyIiwiZmlsdGVyU2luZ2xlIiwidGVzdE9ubHkiLCJkaWZmZXJlbmNlIiwiY2xlYW5Db21wb3NpdGVzIiwiZmlsdGVyTGVuIiwiaXRlbXMiLCJpdGVtIiwiZ290Iiwic2luZ2xlIiwic29tZSIsImYiLCJleHBsb2RlZCIsInBhcnRpYWxzIiwiYmFkIiwicGx1Y2siLCJhZGQiLCJmaW5kIiwiZ2V0MCIsImdldDEiLCJkZWwiLCJsIiwiY2FjaGVkUHJvcGVydHlCeUV2ZW50cyIsInByb3RvIiwicHJvcGVydHlOYW1lIiwic2V0dGVyIiwicmVzdWx0IiwicHJvcGVydHlEZWYiLCJ2YWx1ZSIsImlzRmluaXRlIiwiZGVmaW5lUHJvcGVydHkiLCJWYWxpZGF0aW9uRXJyb3IiLCJyZXNvdXJjZSIsIl9yZXNvdXJjZSIsImZvcm1JZHgiLCJlcnJvcnMiLCJiYXNlT1JNIiwib3B0aW9ucyIsImV4dE9STSIsIlN0cmluZyIsImNvbm5lY3RlZCIsIndzIiwiaW5mbyIsIm9uTWVzc2FnZUpzb24iLCJvbk1lc3NhZ2VUZXh0IiwibWVzc2FnZSIsInNlbnREYXRhIiwid2FpdGluZ0Nvbm5lY3Rpb25zIiwiYXV0aF9ncm91cCIsIklEWCIsIlJFVklEWCIsImJ1aWxkZXJIYW5kbGVycyIsImJ1aWxkZXJIYW5kbGVyVXNlZCIsInBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiZXZlbnRIYW5kbGVycyIsInBlcm1pc3Npb25XYWl0aW5nIiwibW9kZWxDYWNoZSIsImZhaWxlZE1vZGVscyIsImxpbmtlciIsIndpbmRvdyIsInZhbGlkYXRpb25FdmVudCIsImN1cnJlbnRDb250ZXh0Iiwic2F2aW5nRXJyb3JIYW5sZGVyIiwiZ2V0SW5kZXgiLCJnZXRVbmxpbmtlZCIsIlVOTElOS0VEIiwiUGVybWlzc2lvblRhYmxlIiwia2xhc3MiLCJzYXZlIiwiY2IiLCJteVBlcm1zIiwiZ3JvdXBfaWQiLCJwZXJtaXNzaW9uTGlzdCIsInAiLCJwZXJtcyIsImFsbFBlcm1pc3Npb25zIiwiaW5kZXhPZiIsIm1ha2VNb2RlbENsYXNzIiwiX21vZGVsIiwicmVhZGFibGUiLCJ3cml0YWJsZSIsInByaXZhdGVBcmdzIiwibWVyZ2UiLCJmdW5jU3RyaW5nIiwiS2xhc3MiLCJyZWZfdHJhbnNsYXRpb25zIiwiaW52ZXJzZV9yZWZlcmVuY2VzIiwicmVmZXJlbnRzIiwiZmllbGRzT3JkZXIiLCJmaWVsZE9yZGVyIiwicmVwcmVzZW50YXRpb24iLCJkZWxldGUiLCJfcGVybWlzc2lvbnMiLCJhbGxfcGVybXMiLCJvYmplY3RfaWQiLCJncm91cGVkIiwidW5rbm93bl9ncm91cHMiLCJncm91cEJ5IiwibyIsImFzUmF3IiwiSUQiLCJhcmciLCJjb250ZXh0IiwiY29weSIsImFzciIsImNvbmNhdCIsInNhdmVNdWx0aSIsIm9iamVjdHMiLCJzY29wZSIsInJhdyIsImRlbGV0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsImNvZGUiLCJzYXZlUEEiLCJUIiwib28iLCJQQSIsIkZzIiwiZmllbGRJZHgiLCJ0YXAiLCJpbmRleEJ5Iiwid2lkZ2V0IiwicmVmIiwiZXh0X3JlZiIsImxvY2FsX3JlZiIsIndhcm4iLCJUeXBlRXJyb3IiLCJyZXZJbmRleCIsImhhc093blByb3BlcnR5Iiwib3B0cyIsImZpcnN0Iiwib21vZGVsTmFtZSIsInZhbGlkYXRvcnMiLCJ1bmxpbmtSZWZlcmVuY2UiLCJpbnN0YW5jZSIsImluc3RhbmNlcyIsIm9tb2RlbCIsImxpbmtSZWZlcmVuY2UiLCJyZWZzIiwiSU5ERVhfTTJNIiwiVzJQX1BPU1QiLCJfZXh0cmEiLCJUT09ORSIsIlRPTUFOWSIsIk1BTllUT01BTlkiLCJtb2RlbENsYXNzIiwiemlwIiwiZGVsZXRlZCIsIk1QQSIsInJlY29yZCIsIml0YWIiLCJ0YWJsZSIsImlrIiwibm5ldyIsInVwZGF0ZWQiLCJuZXdPYmplY3RzIiwibW9kZWxSZWZlcmVuY2VzIiwib2xkSXRlbSIsIm9sZENvcHkiLCJuZXdJdGVtIiwiTmFOIiwibm8iLCJ0b3RhbFJlc3VsdHMiLCJnb3RNMk0iLCJyb3ciLCJtIiwidmVyYiIsInRvZ2V0aGVyIiwic2VuZERhdGEiLCJHT1RfQUxMIiwiZ290TW9kZWwiLCJjYWNoZUtleSIsIm1vZGVsTm90Rm91bmQiLCJhZGRNb2RlbEhhbmRsZXIiLCJhZGRQZXJzaXN0ZW50QXR0cmlidXRlcyIsImF0dHJpYnV0ZXMiLCJhZGRQcm9wZXJ0eSIsInZhbCIsImthdHRyIiwic2V0IiwiYXR0cnMiLCJuZXdBdHRycyIsInF1ZXJ5IiwiZmlsdGVyRnVuY3Rpb24iLCJyZVdoZWVsT1JNIiwibG9naW5GdW5jIiwiJG9ybSIsImdldE1vZGVsIiwibW9kTmFtZSIsImdldExvZ2dlZFVzZXIiLCJ1c2VyIiwiJHNlbmRUb0VuZHBvaW50Il0sIm1hcHBpbmdzIjoiOzs7SUFBQSxhO0lBRUEsU0FBQUEsT0FBQSxHQUFBO0FBQUEsUUFDQSxLQUFBQyxRQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsUUFFQSxLQUFBQyxXQUFBLEdBQUEsRUFBQSxDQUZBO0FBQUEsSztJQUdBLEM7SUFFQUYsT0FBQSxDQUFBRyxTQUFBLENBQUFDLFVBQUEsR0FBQSxVQUFBQyxPQUFBLEVBQUE7QUFBQSxRQUNBLElBQUFDLFVBQUEsR0FBQUMsS0FBQSxDQUFBQyxJQUFBLENBQUFILE9BQUEsQ0FBQUksUUFBQSxFQUFBLENBQUEsQ0FEQTtBQUFBLFFBRUEsSUFBQSxDQUFBLENBQUFILFVBQUEsSUFBQSxLQUFBSixXQUFBLENBQUEsRUFBQTtBQUFBLFlBQ0EsS0FB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QUFBcmMsU0FBQSxDQUFBMGMsYUFBQSxHQUFBLFlBQUE7QUFBQSxRQUNBLElBQUFoYSxJQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsUUFFQSxJQUFBLEtBQUE2WixJQUFBLENBQUExUyxVQUFBLENBQUFRLFlBQUEsQ0FBQWUsT0FBQTtBQUFBLFlBQ0EsT0FBQSxLQUFBckksR0FBQSxDQUFBLFdBQUEsRUFBQSxLQUFBd1osSUFBQSxDQUFBMVMsVUFBQSxDQUFBUSxZQUFBLENBQUFlLE9BQUEsQ0FBQSxDQURBO0FBQUEsYUFFQTtBQUFBLFlBQ0EsT0FBQSxJQUFBbkgsT0FBQSxDQUFBLFVBQUFDLE1BQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsZ0JBQ0F6QixJQUFBLENBQUFILElBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQW9hLElBQUEsRUFBQTtBQUFBLG9CQUNBamEsSUFBQSxDQUFBSyxHQUFBLENBQUEsV0FBQSxFQUFBNFosSUFBQSxFQUFBL1UsSUFBQSxDQUFBMUQsTUFBQSxFQURBO0FBQUEsaUJBQUEsRUFEQTtBQUFBLGFBQUEsQ0FBQSxDQURBO0FBQUEsU0FKQTtBQUFBLEtBQUEsQztJQWFBbVksVUFBQSxDQUFBcmMsU0FBQSxDQUFBNGMsZUFBQSxHQUFBLFVBQUFoWixHQUFBLEVBQUFDLElBQUEsRUFBQTtBQUFBLFFBQ0EsT0FBQSxLQUFBMFksSUFBQSxDQUFBM1IsS0FBQSxDQUFBaEgsR0FBQSxFQUFBQyxJQUFBLENBQUEsQ0FEQTtBQUFBLEtBQUEsQztJQUlBd1ksVUFBQSxDQUFBcmMsU0FBQSxDQUFBd0wsS0FBQSxHQUFBLFVBQUFDLFFBQUEsRUFBQUMsUUFBQSxFQUFBO0FBQUEsUUFDQSxPQUFBLEtBQUE2USxJQUFBLENBQUExUyxVQUFBLENBQUEyQixLQUFBLENBQUFDLFFBQUEsRUFBQUMsUUFBQSxDQUFBLENBREE7QUFBQSxLQUFBLEMiLCJmaWxlIjoicnd0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBIYW5kbGVyKCl7XG4gICAgdGhpcy5oYW5kbGVycyA9IFtdO1xuICAgIHRoaXMuc3RySGFuZGxlcnMgPSB7fTtcbn07XG5cbkhhbmRsZXIucHJvdG90eXBlLmFkZEhhbmRsZXIgPSBmdW5jdGlvbiAoaGFuZGxlcil7XG4gICAgdmFyIHN0ckhhbmRsZXIgPSB1dGlscy5oYXNoKGhhbmRsZXIudG9TdHJpbmcoKSk7XG4gICAgaWYgKCEoc3RySGFuZGxlciBpbiB0aGlzLnN0ckhhbmRsZXJzKSl7XG4gICAgICAgIHRoaXMuc3RySGFuZGxlcnNbc3RySGFuZGxlcl0gPSBoYW5kbGVyO1xuICAgICAgICB0aGlzLmhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfVxufTtcbkhhbmRsZXIucHJvdG90eXBlLmhhbmRsZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMCk7XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KG51bGwsYXJncyk7XG4gICAgfSlcbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGVCeSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSk7XG4gICAgdmFyIHRocyA9IGFyZ3VtZW50c1swXTtcbiAgICB0aGlzLmhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oZnVuYyl7XG4gICAgICAgIGZ1bmMuYXBwbHkodGhzLGFyZ3MpO1xuICAgIH0pXG59O1xuXG5cbmZ1bmN0aW9uIE5hbWVkRXZlbnRNYW5hZ2VyICgpe1xuICAgIHZhciBldmVudHMgPSB7fTtcbiAgICB2YXIgaGFuZGxlcklkID0ge307XG4gICAgdmFyIGlkeElkID0gMDtcbiAgICB0aGlzLm9uID0gZnVuY3Rpb24obmFtZSwgZnVuYyl7XG4gICAgICAgIGlmICghKG5hbWUgaW4gZXZlbnRzKSl7XG4gICAgICAgICAgICBldmVudHNbbmFtZV0gPSBuZXcgQXJyYXkoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWQgPSBpZHhJZCArKztcbiAgICAgICAgZXZlbnRzW25hbWVdLnB1c2goZnVuYyk7XG4gICAgICAgIGhhbmRsZXJJZFtpZF0gPSBmdW5jO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfTtcbiAgICB0aGlzLmVtaXQgPSBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgaWYgKG5hbWUgaW4gZXZlbnRzKXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICAgICAgICAgIGV2ZW50LmFwcGx5KG51bGwsYXJncyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy51bmJpbmQgPSBmdW5jdGlvbihoYW5kbGVyKXtcbiAgICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgICAgaWYgKGhhbmRsZXIgaW4gaGFuZGxlcklkKXtcbiAgICAgICAgICAgIHZhciBmdW5jID0gaGFuZGxlcklkW2hhbmRsZXIgKyAnJ107XG4gICAgICAgICAgICBMYXp5KGV2ZW50cykuZWFjaChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBuIGluIHYpe1xuICAgICAgICAgICAgICAgICAgICBpZiAodltuXSA9PT0gZnVuYyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHgucHVzaChuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWR4LnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICB2LnNwbGljZSh4LDEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGhhbmRsZXJJZFtoYW5kbGVyXTtcbiAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ2FsbCBldmVudCBvbmNlXG4gICAgICovXG4gICAgdGhpcy5vbmNlID0gZnVuY3Rpb24oZXZlbnROYW1lLCBoYW5kbGVyRnVuY3Rpb24pIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgaGFuZGxlciA9IHRoaXMub24oZXZlbnROYW1lLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaGFuZGxlckZ1bmN0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBzZWxmLnVuYmluZChoYW5kbGVyKTtcbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjYWNoZWRLZXlJZHggPSAwO1xuXG52YXIgbnVsbFN0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJyd9O1xuXG5mdW5jdGlvbiBtb2NrT2JqZWN0KCl7XG4gICAgcmV0dXJuIG5ldyBQcm94eSh7fSwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBuYW1lICA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgIGlmIChuYW1lID09PSAndG9TdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsU3RyaW5nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1dGlscy5tb2NrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtuYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG59XG5cbi8qXG52YXIgJFBPU1QgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGNhbGxCYWNrLCBlcnJvckJhY2ssaGVhZGVycyl7XG4gICAgdmFyIG9wdHMgPSB7XG4gICAgICAgIGFjY2VwdHMgOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIHVybCA6IHVybCxcbiAgICAgICAgZGF0YSA6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICBkYXRhVHlwZSA6ICdqc29uJyxcbiAgICAgICAgc3VjY2VzcyA6IGNhbGxCYWNrLFxuICAgICAgICBlcnJvciA6IGVycm9yQmFjayxcbiAgICAgICAgbWV0aG9kIDogJ1BPU1QnLFxuICAgICAgICBjb250ZW50VHlwZSA6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIH07XG4gICAgaWYgKGhlYWRlcnMpe1xuICAgICAgICBvcHRzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgICAgICBvcHRzLmNyb3NzRG9tYWluID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuICQuYWpheChvcHRzKTtcbn1cblxuXG5mdW5jdGlvbiByZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgZ2V0TG9naW4pe1xuICAgIC8vIG1haW4gXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZ2V0TG9naW4gPSBnZXRMb2dpbjtcbiAgICB0aGlzLmV2ZW50cyA9IG5ldyBOYW1lZEV2ZW50TWFuYWdlcigpXG4gICAgdGhpcy4kUE9TVCA9ICRQT1NULmJpbmQodGhpcyk7XG4gICAgdGhpcy5vcHRpb25zID0ge2VuZFBvaW50IDogZW5kUG9pbnR9O1xuICAgIHRoaXMub24gPSB0aGlzLmV2ZW50cy5vbi5iaW5kKHRoaXMpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHN0YXR1cywgY2FsbEJhY2ssIGVycm9yKSB7XG4gICAgaWYgKHN0YXR1cykge1xuICAgICAgICB2YXIgaXNMb2dnZWQgPSAoc3RhdHVzLnVzZXJfaWQgJiYgIXRoaXMub3B0aW9ucy51c2VyX2lkICk7XG4gICAgICAgIGZvciAodmFyIHggaW4gc3RhdHVzKXsgdGhpcy5vcHRpb25zW3hdID0gc3RhdHVzW3hdOyB9XG4gICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgaWYgKGlzTG9nZ2VkKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50cy5lbWl0KCdsb2dpbicsIHRoaXMub3B0aW9ucy51c2VyX2lkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VyX2lkICYmIHRoaXMuZ2V0TG9naW4pe1xuICAgICAgICB2YXIgbG9nSW5mbyA9IHRoaXMuZ2V0TG9naW4oZXJyb3IpO1xuICAgICAgICBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KXtcbiAgICAgICAgICAgIHRoaXMubG9naW4obG9nSW5mby51c2VybmFtZSwgbG9nSW5mby5wYXNzd29yZClcbiAgICAgICAgICAgIC50aGVuKChmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHN0YXR1cywgY2FsbEJhY2spO1xuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH0gZWxzZSBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gUHJvbWlzZSkge1xuICAgICAgICAgICAgbG9nSW5mby50aGVuKChmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgICAgIHZhciB4ID0gdGhpcy5sb2dpbihvYmoudXNlcm5hbWUsb2JqLnBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICB2YXIgbWFuYWdlRXJyb3IgPSAoZnVuY3Rpb24oYmFkKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMobnVsbCxjYWxsQmFjayxiYWQuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pLmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKXtcbiAgICAgICAgICAgICAgICAgICAgeC50aGVuKGNhbGxCYWNrLG1hbmFnZUVycm9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB4LnRoZW4obnVsbCwgbWFuYWdlRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sodGhpcy5vcHRpb25zKTtcbiAgICB9ICAgIFxufVxuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuc3RhdHVzID0gZnVuY3Rpb24oY2FsbEJhY2ssIGZvcmNlKXtcbiAgICBpZiAoKCdsYXN0UldUU3RhdHVzJyBpbiBsb2NhbFN0b3JhZ2UpICYmICFmb3JjZSkge1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICB2YXIgc3RhdHVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhzdGF0dXMsY2FsbEJhY2spO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YXR1cyhjYWxsQmFjaywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9zdGF0dXNfY2FsbGluZyl7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuc3RhdHVzKGNhbGxCYWNrKTtcbiAgICAgICAgfSw1MCk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnRpbWVzdGFtcCl7XG4gICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHRoaXMub3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhdHVzX2NhbGxpbmcgPSB0cnVlO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiB0aGlzLiRwb3N0KCdhcGkvc3RhdHVzJyxudWxsLGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG4gICAgICAgICAgICBzZWxmLl9zdGF0dXNfY2FsbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi51cGRhdGVTdGF0dXMoc3RhdHVzLGNhbGxCYWNrKTtcbiAgICAgICAgfSk7ICAgICAgICBcbiAgICB9XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuJHBvc3QgPSBmdW5jdGlvbih1cmwsIGRhdGEsY2FsbEJhY2spe1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnRva2VuKXtcbiAgICAgICAgaWYgKCFkYXRhKXtcbiAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnRva2VuKXtcbiAgICAgICAgdmFyIGhlYWRlcnMgPSB7IFxuICAgICAgICAgICAgdG9rZW4gOiB0aGlzLm9wdGlvbnMudG9rZW4sXG4gICAgICAgICAgICBhcHBsaWNhdGlvbiA6IHRoaXMub3B0aW9ucy5hcHBsaWNhdGlvblxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBoZWFkZXJzID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLm9wdGlvbnMuZW5kUG9pbnQgKyB1cmwsIGRhdGEsIHRocy5vcHRpb25zLmFwcGxpY2F0aW9uLCB0aHMub3B0aW9ucy50b2tlbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlJywgeGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cywgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMgKyAnLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FsbEJhY2spIHsgY2FsbEJhY2soIHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCApfTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgeGhyLnN0YXR1cywgdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWpzb24tJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZURhdGEsdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWh0dHAnLHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1odHRwLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICB2YXIgdXJsID0gdGhpcy5vcHRpb25zLmVuZFBvaW50ICsgJ2FwaS9sb2dpbic7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHVybCx7IHVzZXJuYW1lOiB1c2VybmFtZSwgcGFzc3dvcmQgOiBwYXNzd29yZH0sIG51bGwsY29ubmVjdGlvbi5vcHRpb25zLnRva2VuLCB0cnVlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uLnVwZGF0ZVN0YXR1cyh4aHIucmVzcG9uc2VEYXRhKTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoc3RhdHVzKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oY2FsbEJhY2spe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgd3Njb25uZWN0ID0gZnVuY3Rpb24oc2VsZil7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uID0gbmV3IHV0aWxzLndzQ29ubmVjdChzZWxmLm9wdGlvbnMpO1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbi5vbkNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuZXZlbnRzLmVtaXQoJ3dzLWNvbm5lY3RlZCcsIHNlbGYud3NDb25uZWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uLm9uRGlzY29ubmVjdChmdW5jdGlvbigpeyBcbiAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMgJiYgc2VsZi5vcHRpb25zLnJlYWx0aW1lRW5kUG9pbnQpe1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgd3Njb25uZWN0KHNlbGYpOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9LDEwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzKChmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICBpZiAoJ3Rva2VuJyBpbiBzZWxmLm9wdGlvbnMpe1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW5nIHRvICcgKyBzZWxmLm9wdGlvbnMuZW5kUG9pbnQpO1xuICAgICAgICAgICAgaWYgKHNlbGYub3B0aW9ucy51c2VybmFtZSAmJiBzZWxmLm9wdGlvbnMucGFzc3dvcmQpe1xuICAgICAgICAgICAgICAgIHNlbGYubG9naW4oXG4gICAgICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucy51c2VybmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLnBhc3N3b3JkLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3JlbmV3aW5nIGNvbm5lY3Rpb24nKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzZWxmLm9wdGlvbnMudG9rZW4gJiYgc2VsZi5vcHRpb25zLnJlYWx0aW1lRW5kUG9pbnQgJiYgKCFzZWxmLndzQ29ubmVjdGlvbikpe1xuICAgICAgICAgICAgd3Njb25uZWN0KHNlbGYpO1xuICAgICAgICB9XG4gICAgfSkuYmluZCh0aGlzKSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9nT3V0ID0gZnVuY3Rpb24odXJsLCBjYWxsQmFjayl7XG4gICAgcmV0dXJuIHRoaXMuJHBvc3QoJ2FwaS9sb2dvdXQnLHt9LChmdW5jdGlvbihzdGF0dXMpIHtcbiAgICAgICAgaWYgKCdsYXN0UldUU3RhdHVzJyBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB7ZW5kUG9pbnQ6IHRoaXMub3B0aW9ucy5lbmRQb2ludH07XG4gICAgICAgIGlmICh0aGlzLndzQ29ubmVjdGlvbikgeyBcbiAgICAgICAgICAgIHRoaXMud3NDb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLndzQ29ubmVjdGlvbiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVybCkgeyBsb2NhdGlvbiA9IHVybDsgfVxuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgIH0pLmJpbmQodGhpcykpO1xufVxuKi9cbnZhciB1dGlscyA9IHtcbiAgICByZW5hbWVGdW5jdGlvbiA6IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICAgICAgICByZXR1cm4gKG5ldyBGdW5jdGlvbihcInJldHVybiBmdW5jdGlvbiAoY2FsbCkgeyByZXR1cm4gZnVuY3Rpb24gXCIgKyBuYW1lICtcbiAgICAgICAgICAgIFwiICgpIHsgcmV0dXJuIGNhbGwodGhpcywgYXJndW1lbnRzKSB9OyB9O1wiKSgpKShGdW5jdGlvbi5hcHBseS5iaW5kKGZuKSk7XG4gICAgfSxcbiAgICBjYWNoZWQgOiBmdW5jdGlvbihmdW5jLCBrZXkpe1xuICAgICAgICBpZiAoIWtleSl7ICAgIFxuICAgICAgICAgICAga2V5ID0gJ18nICsgY2FjaGVkS2V5SWR4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gd3JhcHBlcigpe1xuICAgICAgICAgICAgaWYgKCF0aGlzW2tleV0pe1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IGZ1bmMuY2FsbCh0aGlzLFthcmd1bWVudHNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzW2tleV07XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB3cmFwcGVyO1xuICAgIH0sXG4vLyAgICAkUE9TVCA6ICRQT1NULFxuLy8gICAgcmVXaGVlbENvbm5lY3Rpb246IHJlV2hlZWxDb25uZWN0aW9uLFxuICAgIGxvZzogZnVuY3Rpb24oKXsgXG4gICAgICAgIGNvbnNvbGUubG9nKGFyZ3VtZW50cyk7XG4gICAgfSxcblxuICAgIHhkcjogZnVuY3Rpb24gKHVybCwgZGF0YSwgYXBwbGljYXRpb24sdG9rZW4sIGZvcm1FbmNvZGUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ha2UgYW4gSFRUUCBSZXF1ZXN0IGFuZCByZXR1cm4gaXRzIHByb21pc2UuXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciByZXE7XG4gICAgICAgICAgICBpZiAoIWRhdGEpIHsgZGF0YSA9IHt9O31cblxuICAgICAgICAgICAgaWYoWE1MSHR0cFJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZURhdGEgPSBKU09OLnBhcnNlKHJlcS5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoYSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB7cmVzcG9uc2VEYXRhOiByZXNwb25zZURhdGEsIHJlc3BvbnNlVGV4dDogcmVxLnJlc3BvbnNlVGV4dCxzdGF0dXM6IHJlcS5zdGF0dXMsIHJlcXVlc3Q6IHJlcX07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVxLnN0YXR1cyA+PSAyMDAgJiYgcmVxLnN0YXR1cyA8IDQwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmKFhEb21haW5SZXF1ZXN0KXtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWERvbWFpblJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXEucmVzcG9uc2VUZXh0LHJlcS5zdGF0dXNUZXh0LCByZXEpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0NPUlMgbm90IHN1cHBvcnRlZCcpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxLm9wZW4oJ1BPU1QnLCB1cmwsIHRydWUpO1xuICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgaWYgKHRva2VuKSB7IGRhdGEuX190b2tlbl9fID0gdG9rZW4gfVxuICAgICAgICAgICAgaWYgKCFmb3JtRW5jb2RlKXtcbiAgICAgICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLnNpemUoKT9KU09OLnN0cmluZ2lmeShkYXRhKTonJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUkkodi50b1N0cmluZygpKTsgIFxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKS5qb2luKCcmJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXEuc2VuZChkYXRhKTtcbiAgICAvLyAgICAgICAgcmVxLnNlbmQobnVsbCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBjYXBpdGFsaXplIDogZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgcmV0dXJuIHNbMF0udG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICB9LFxuXG4gICAgaGFzaCA6IGZ1bmN0aW9uKHN0cil7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIYXNoZWQgZnVuY3Rpb25cbiAgICAgICAgICovXG4gICAgICAgIHN0ciA9IHN0ci50b1N0cmluZygpO1xuICAgICAgICB2YXIgcmV0ID0gMTtcbiAgICAgICAgZm9yICh2YXIgeCA9IDA7eDxzdHIubGVuZ3RoO3grKyl7XG4gICAgICAgICAgICByZXQgKj0gKDEgKyBzdHIuY2hhckNvZGVBdCh4KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChyZXQgJSAzNDk1ODM3NDk1NykudG9TdHJpbmcoKTtcbiAgICB9LFxuXG4gICAgbWFrZUZpbHRlciA6IGZ1bmN0aW9uIChtb2RlbCwgZmlsdGVyLCB1bmlmaWVyLCBkb250VHJhbnNsYXRlRmlsdGVyKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlIGZpbHRlciBmb3IgQXJyYXkuZmlsdGVyIGZ1bmN0aW9uIGFzIGFuIGFuZCBvZiBvclxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKCF1bmlmaWVyKSB7IHVuaWZpZXIgPSAnICYmICc7fVxuICAgICAgICBpZiAoTGF6eShmaWx0ZXIpLnNpemUoKSA9PT0gMCl7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCl7IHJldHVybiB0cnVlIH07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNvdXJjZSA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odmFscywgZmllbGQpe1xuICAgICAgICAgICAgaWYgKCF2YWxzKSB7IHZhbHMgPSBbbnVsbF19XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFscykpe1xuICAgICAgICAgICAgICAgIHZhbHMgPSBbdmFsc107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWRvbnRUcmFuc2xhdGVGaWx0ZXIgJiYgKG1vZGVsLmZpZWxkc1tmaWVsZF0udHlwZSA9PT0gJ3JlZmVyZW5jZScpKSB7XG4gICAgICAgICAgICAgICAgZmllbGQgPSAnXycgKyBmaWVsZDtcbiAgICAgICAgICAgICAgICB2YWxzID0gTGF6eSh2YWxzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgIGlmICh4ICYmICh4LmNvbnN0cnVjdG9yICE9PSBOdW1iZXIpKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmlkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vZGVsLmZpZWxkc1tmaWVsZF0udHlwZSA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgIHZhbHMgPSB2YWxzLm1hcChKU09OLnN0cmluZ2lmeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJygnICsgIExhenkodmFscykubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgIGlmICgheCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdtYWtlRmlsdGVyIHggaXMgbnVsbCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZih4ID09PSBvcm0udXRpbHMubW9jaykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdtYWtlRmlsdGVyIHdpdGggTW9jayBPYmplY3QnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICcoeC4nICsgZmllbGQgKyAnID09PSAnICsgeCArICcpJztcbiAgICAgICAgICAgIH0pLmpvaW4oJyB8fCAnKSAgKycpJztcbiAgICAgICAgfSkudG9BcnJheSgpLmpvaW4odW5pZmllcik7XG4gICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJ4XCIsIFwicmV0dXJuIFwiICsgc291cmNlKTtcbiAgICB9LFxuXG4gICAgc2FtZUFzIDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZXAgZXF1YWxcbiAgICAgICAgICovXG4gICAgICAgIGZvciAodmFyIGsgaW4geCkge1xuICAgICAgICAgICAgaWYgKHlba10gIT0geFtrXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIHBsdXJhbGl6ZSA6IGZ1bmN0aW9uKHN0ciwgbW9kZWwpe1xuICAgICAgICAvKipcbiAgICAgICAgICogTGV4aWNhbGx5IHJldHVybnMgZW5nbGlzaCBwbHVyYWwgZm9ybVxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIHN0ciArICdzJztcbiAgICB9LFxuXG4gICAgYmVmb3JlQ2FsbCA6IGZ1bmN0aW9uKGZ1bmMsIGJlZm9yZSl7XG4gICAgICAgIHZhciBkZWNvcmF0b3IgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgYmVmb3JlKCkudGhlbihmdW5jKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZGVjb3JhdG9yO1xuICAgIH0sXG5cbiAgICBjbGVhblN0b3JhZ2UgOiBmdW5jdGlvbigpe1xuICAgICAgICAvKipcbiAgICAgICAgICogQ2xlYW4gbG9jYWxTdG9yYWdlIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgTGF6eShsb2NhbFN0b3JhZ2UpLmtleXMoKS5lYWNoKGZ1bmN0aW9uKGspe1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtrXTtcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgY2xlYW5EZXNjcmlwdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIExhenkobG9jYWxTdG9yYWdlKVxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbih2LCBuKSB7IHJldHVybiBMYXp5KG4pLnN0YXJ0c1dpdGgoJ2Rlc2NyaXB0aW9uOicpfSlcbiAgICAgICAgICAgIC5rZXlzKClcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKG4pIHsgZGVsZXRlIGxvY2FsU3RvcmFnZVtuXSB9KTtcbiAgICB9LFxuICAgIFxuICAgIHJldmVyc2UgOiBmdW5jdGlvbiAoY2hyLCBzdHIpIHtcbiAgICAgICAgcmV0dXJuIHN0ci5zcGxpdChjaHIpLnJldmVyc2UoKS5qb2luKGNocik7XG4gICAgfSxcbiAgICBwZXJtdXRhdGlvbnM6IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgeCA9IGFyci5sZW5ndGgtMTsgeCA+PSAwO3gtLSl7XG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gYXJyLmxlbmd0aC0xOyB5ID49IDA7IHktLSl7XG4gICAgICAgICAgICAgICAgaWYgKHggIT09IHkpXG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKFthcnJbeF0sIGFyclt5XV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcblxuICAgIHdhaXRGb3I6IGZ1bmN0aW9uKGZ1bmMsIGNhbGxCYWNrKSB7XG4gICAgICAgIHZhciB3YWl0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChmdW5jKCkpIHtcbiAgICAgICAgICAgICAgICBjYWxsQmFjaygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHdhaXRlciw1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQod2FpdGVyLCA1MDApO1xuICAgIH0sXG5cbiAgICBib29sOiBCb29sZWFuLFxuXG4gICAgbm9vcCA6IGZ1bmN0aW9uKCl7fSxcblxuICAgIHR6T2Zmc2V0OiBuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCxcblxuICAgIHRyYW5zRmllbGRUeXBlOiB7XG4gICAgICAgIGRhdGU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG5ldyBEYXRlKHggKiAxMDAwICsgdXRpbHMudHpPZmZzZXQgKSB9LFxuICAgICAgICBkYXRldGltZTogZnVuY3Rpb24oeCkgeyByZXR1cm4gbmV3IERhdGUoeCAqIDEwMDAgKyB1dGlscy50ek9mZnNldCApIH0sXG4gICAgICAgIHN0cmluZzogZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b1N0cmluZygpOyB9LFxuICAgICAgICB0ZXh0OiBmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvU3RyaW5nKCk7IH0sXG4gICAgICAgIGludGVnZXI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBhcnNlSW50KHgpOyB9LFxuICAgICAgICBmbG9hdDogZnVuY3Rpb24oeCkgeyByZXR1cm4gcGFyc2VGbG9hdCh4KTsgfVxuICAgIH0sIFxuICAgIG1vY2sgOiBtb2NrT2JqZWN0KClcbn07XG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgU1RBVFVTS0VZID0gJ2xhc3RSV1RDb25uZWN0aW9uU3RhdHVzJztcblxuZnVuY3Rpb24gUmVhbHRpbWVDb25uZWN0aW9uKGVuZFBvaW50LCByd3RDb25uZWN0aW9uKXtcbiAgICAvKipcbiAgICAgKiBDb25uZWN0cyBhIHdlYnNvY2tldCB3aXRoIHJlV2hlZWwgY29ubmVjdGlvblxuICAgICAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBjb25uZWN0aW9uID0gbmV3IFNvY2tKUyhlbmRQb2ludCk7XG4gICAgY29ubmVjdGlvbi5vbm9wZW4gPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICBjb25zb2xlLmxvZygnb3BlbiA6ICcgKyB4KTtcbiAgICAgICAgY29ubmVjdGlvbi50ZW5hbnQoKTtcbiAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1jb25uZWN0aW9uLW9wZW4nLHgpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAoeC50eXBlID09ICdtZXNzYWdlJykge1xuICAgICAgICAgICAgLy8kLm5vdGlmeSh4LmRhdGEpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvL1RPRE8gc2V0IGZyb21SZWFsdGltZVxuICAgICAgICAgICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtbWVzc2FnZS1qc29uJywgSlNPTi5wYXJzZSh4LmRhdGEpKTtcbiAgICAgICAgICAgICAgICAvL1RPRE8gdW5zZXQgZnJvbVJlYWx0aW1lXG4gICAgICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLW1lc3NhZ2UtdGV4dCcsIEpTT04ucGFyc2UoeC5kYXRhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZnJvbSByZWFsdGltZSAnLHgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9uY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNldFRpbWVvdXQodXRpbHMud3NDb25uZWN0LDEwMDApO1xuICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLWNvbm5lY3Rpb24tY2xvc2VkJyk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLnRlbmFudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29ubmVjdGlvbi5zZW5kKCdURU5BTlQ6JyArIHJ3dENvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLmFwcGxpY2F0aW9uICsgJzonICsgcnd0Q29ubmVjdGlvbi5jYWNoZWRTdGF0dXMudG9rZW4pO1xuICAgIH1cbiAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICB9XG59ICAgIFxuXG5mdW5jdGlvbiByZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgZ2V0TG9naW4pe1xuICAgIC8qKlxuICAgICAqIENvbm5lY3Rpb24gYmFzaWMgZm9yIHJlV2hlZWxcbiAgICAgKiBAcGFyYW0gZW5kUG9pbnQ6IHN0cmluZyBiYXNlIHVybCBmb3IgYWxsIGNvbXVuaWNhdGlvblxuICAgICAqIEBwYXJhbSBnZXRMb2dpbjogZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGluIGNhc2Ugb2YgbWlzc2luZyBsb2dpbi5cbiAgICAgKiAgdGhpcyBmdW5jdGlvbiBjb3VsZCByZXR1cm4gOlxuICAgICAqICAtICAgYSB7IHVzZXJuYW1lIDogPHVzZXJuYW1lPiAsIHBhc3N3b3JkOiA8cGFzc3dvcmQ+fSBvclxuICAgICAqICAtICAgYiBQcm9taXNlIC0+IHsgdXNlcm5hbWUgOiA8dXNlcm5hbWU+ICwgcGFzc3dvcmQ6IDxwYXNzd29yZD59XG4gICAgICovXG4gICAgLy8gbWFpbiBpbml0aWFsaXphdGlvblxuICAgIHZhciBldmVudHMgPSBuZXcgTmFtZWRFdmVudE1hbmFnZXIoKTtcbiAgICB0aGlzLmdldExvZ2luID0gZ2V0TG9naW47XG4gICAgdGhpcy5lbmRQb2ludCA9IGVuZFBvaW50LmVuZHNXaXRoKCcvJyk/IGVuZFBvaW50OiAoZW5kUG9pbnQgKyAnLycpO1xuICAgIHRoaXMub24gPSBldmVudHMub247XG4gICAgdGhpcy51bmJpbmQgPSBldmVudHMudW5iaW5kO1xuICAgIHRoaXMuZW1pdCA9IGV2ZW50cy5lbWl0O1xuICAgIHRoaXMub25jZSA9IGV2ZW50cy5vbmNlO1xuICAgIHRoaXMuY2FjaGVkU3RhdHVzID0ge307XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlO1xuICAgIHRoaXMuaXNMb2dnZWRJbiA9IGZhbHNlO1xuICAgIC8vIHJlZ2lzdGVyaW5nIHVwZGF0ZSBzdGF0dXNcbiAgICB2YXIgdGhzID0gdGhpcztcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS4kcG9zdCA9IGZ1bmN0aW9uKHVybCwgZGF0YSxjYWxsQmFjayl7XG4gICAgLyoqXG4gICAgICogQUpBWCBjYWxsIGZvciBmZXRjaCBhbGwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAqIEBwYXJhbSB1cmw6IGxhc3QgdXJsIHBhcnQgZm9yIGFqYXggY2FsbFxuICAgICAqIEBwYXJhbSBkYXRhOiBkYXRhIG9iamVjdCB0byBiZSBzZW50XG4gICAgICogQHBhcmFtIGNhbGxCYWNrOiBmdW5jdGlvbih4aHIpIHdpbGwgYmUgY2FsbGVkIHdoZW4gZGF0YSBhcnJpdmVzXG4gICAgICogQHJldHVybnMgUHJvbWlzZTx4aHI+IHNhbWUgb2YgY2FsbEJhY2tcbiAgICAgKi9cbiAgICAvLyBpbml0aWFsaXphdGlvblxuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih0aHMuZW5kUG9pbnQgKyB1cmwsIGRhdGEsIHRocy5jYWNoZWRTdGF0dXMuYXBwbGljYXRpb24sIHRocy5jYWNoZWRTdGF0dXMudG9rZW4pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHRocy5lbWl0KCdodHRwLXJlc3BvbnNlJywgeGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cywgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB0aHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzICsgJy1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7IGNhbGxCYWNrKCB4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQgKX07XG4gICAgICAgICAgICAgICAgYWNjZXB0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgeGhyLnN0YXR1cywgdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItanNvbi0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlRGF0YSx1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1odHRwJyx4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1odHRwLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xufTtcblxuLyoqXG4gKiBDaGVjayBjdXJyZW50IHN0YXR1cyBhbmQgY2FsbGJhY2sgZm9yIHJlc3VsdHMuXG4gKiBJdCBjYWNoZXMgcmVzdWx0cyBmb3IgZnVydGhlci5cbiAqIEBwYXJhbSBjYWxsYmFjazogKHN0YXR1cyBvYmplY3QpXG4gKiBAcGFyYW0gZm9yY2U6IGJvb2xlYW4gaWYgdHJ1ZSBlbXB0aWVzIGNhY2hlICBcbiAqIEByZXR1cm4gdm9pZFxuICovXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuc3RhdHVzID0gZnVuY3Rpb24oY2FsbEJhY2ssIGZvcmNlKSB7XG4gICAgLy8gaWYgZm9yY2UsIGNsZWFyIGFsbCBjYWNoZWQgdmFsdWVzXG4gICAgdmFyIGtleSA9ICd0b2tlbjonICsgdGhpcy5lbmRQb2ludDtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICBpZiAoZm9yY2UpIHtcbiAgICAgICAgdGhpcy5jYWNoZWRTdGF0dXMgPSB7fTtcbiAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtrZXldO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdGF0dXNXYWl0aW5nKSB7XG4gICAgICAgIC8vIHdhaXQgZm9yIHN0YXR1c1xuICAgICAgICB1dGlscy53YWl0Rm9yKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICF0aHMuc3RhdHVzV2FpdGluZztcbiAgICAgICAgfSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRocy5zdGF0dXMoY2FsbEJhY2ssZm9yY2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyB0cnkgZm9yIHZhbHVlIHJlc29sdXRpb25cbiAgICAvLyBmaXJzdCBvbiBtZW1vcnlcbiAgICBpZiAoTGF6eSh0aGlzLmNhY2hlZFN0YXR1cykuc2l6ZSgpKXtcbiAgICAgICAgY2FsbEJhY2sodGhpcy5jYWNoZWRTdGF0dXMpXG4gICAgLy8gdGhlbiBpbiBsb2NhbFN0b3JhZ2VcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICBpZiAoa2V5IGluIGxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgICAgZGF0YS5fX3Rva2VuX18gPSBsb2NhbFN0b3JhZ2Vba2V5XTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0YXR1c1dhaXRpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLiRwb3N0KCdhcGkvc3RhdHVzJyxkYXRhLCBmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyhzdGF0dXMpO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlW2tleV0gPSBzdGF0dXMudG9rZW47XG4gICAgICAgICAgICBjYWxsQmFjayhzdGF0dXMpO1xuICAgICAgICAgICAgdGhzLnN0YXR1c1dhaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGRvZXNuJ3QgY2FsbCBjYWxsYmFja1xuICAgICAgICByZXR1cm5cbiAgICB9XG4gICAgY2FsbEJhY2sodGhpcy5jYWNoZWRTdGF0dXMpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgdmFyIGxhc3RCdWlsZCA9IHBhcnNlRmxvYXQobG9jYWxTdG9yYWdlLmxhc3RCdWlsZCkgfHwgMTtcbiAgICBpZiAobGFzdEJ1aWxkIDwgc3RhdHVzLmxhc3RfYnVpbGQpe1xuICAgICAgICB1dGlscy5jbGVhbkRlc2NyaXB0aW9uKCk7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0QnVpbGQgPSBzdGF0dXMubGFzdF9idWlsZDtcbiAgICB9XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IEJvb2xlYW4oc3RhdHVzLnRva2VuKTtcbiAgICB0aGlzLmlzTG9nZ2VkSW4gPSBCb29sZWFuKHN0YXR1cy51c2VyX2lkKTtcbiAgICB2YXIgb2xkU3RhdHVzID0gdGhpcy5jYWNoZWRTdGF0dXM7XG4gICAgdGhpcy5jYWNoZWRTdGF0dXMgPSBzdGF0dXM7XG4gICAgaWYgKCFvbGRTdGF0dXMudXNlcl9pZCAmJiBzdGF0dXMudXNlcl9pZCl7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9nZ2VkLWluJyxzdGF0dXMudXNlcl9pZCk7XG4gICAgfSBlbHNlIGlmIChvbGRTdGF0dXMudXNlcl9pZCAmJiAhc3RhdHVzLnVzZXJfaWQpe1xuICAgICAgICB0aGlzLmVtaXQoJ2xvZ2dlZC1vdXQnKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNDb25uZWN0ZWQgJiYgIXRoaXMuaXNMb2dnZWRJbil7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9naW4tcmVxdWlyZWQnKTtcbiAgICAgICAgaWYgKHRoaXMuZ2V0TG9naW4pe1xuICAgICAgICAgICAgdmFyIGxvZ2luSW5mbyA9IHRoaXMuZ2V0TG9naW4oKTtcbiAgICAgICAgICAgIGlmIChsb2dpbkluZm8uY29uc3RydWN0b3IgPT09IE9iamVjdCl7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dpbihsb2dpbkluZm8udXNlcm5hbWUsIGxvZ2luSW5mby5wYXNzd29yZCwgbG9naW5JbmZvLmNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9naW5JbmZvLmNvbnN0cnVjdG9yID09PSBQcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgbG9naW5JbmZvLnRoZW4oZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2dpbihvYmoudXNlcm5hbWUsIG9iai5wYXNzd29yZCwgb2JqLmNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIHJlYWx0aW1lIGNvbm5lY3Rpb24gaXMgc2V0dGVkXG4gICAgaWYgKCFvbGRTdGF0dXMucmVhbHRpbWVFbmRQb2ludCAmJiBzdGF0dXMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICB0aGlzLndzQ29ubmVjdGlvbiA9IG5ldyBSZWFsdGltZUNvbm5lY3Rpb24oc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQsIHRoaXMpO1xuICAgIC8vIHJlYWx0aW1lIGNvbm5lY3Rpb24gaXMgY2xvc2VkXG4gICAgfSBlbHNlIGlmIChvbGRTdGF0dXMucmVhbHRpbWVFbmRQb2ludCAmJiAhc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICAgICAgZGVsZXRlIHRoaXMud3NDb25uZWN0aW9uO1xuICAgIH1cbiAgICB0aGlzLmVtaXQoJ3VwZGF0ZS1jb25uZWN0aW9uLXN0YXR1cycsIHN0YXR1cywgb2xkU3RhdHVzKTtcbiAgICBsb2NhbFN0b3JhZ2VbU1RBVFVTS0VZXSA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG59XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCl7XG4gICAgLyoqXG4gICAgICogbWFrZSBsb2dpbiBhbmQgcmV0dXJuIGEgcHJvbWlzZS4gSWYgbG9naW4gc3VjY2VkLCBwcm9taXNlIHdpbGwgYmUgYWNjZXB0ZWRcbiAgICAgKiBJZiBsb2dpbiBmYWlscyBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aCBlcnJvclxuICAgICAqIEBwYXJhbSB1c2VybmFtZTogdXNlcm5hbWVcbiAgICAgKiBAcGFyYW0gcGFzc3dvcmQ6IHBhc3N3b3JkXG4gICAgICogQHJldHVybiBQcm9taXNlICh1c2VyIG9iamVjdClcbiAgICAgKi9cbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLmVuZFBvaW50ICsgJ2FwaS9sb2dpbicsIHt1c2VybmFtZTogdXNlcm5hbWUgfHwgJycsIHBhc3N3b3JkOiBwYXNzd29yZCB8fCAnJ30sbnVsbCx0aHMuY2FjaGVkU3RhdHVzLnRva2VuLCB0cnVlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgc3RhdHVzXG4gICAgICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyh4aHIucmVzcG9uc2VEYXRhKTtcbiAgICAgICAgICAgICAgICAvLyBjYWxsIHdpdGggdXNlciBpZFxuICAgICAgICAgICAgICAgIGFjY2VwdCh7c3RhdHVzIDogJ3N1Y2Nlc3MnLCB1c2VyaWQ6IHRocy5jYWNoZWRTdGF0dXMudXNlcl9pZH0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgZXJyb3IgY2FsbCBlcnJvciBtYW5hZ2VyIHdpdGggZXJyb3JcbiAgICAgICAgICAgICAgICBhY2NlcHQoe2Vycm9yOiB4aHIucmVzcG9uc2VEYXRhLmVycm9yLCBzdGF0dXM6ICdlcnJvcid9KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KSB7XG4gICAgICAgIHRocy4kcG9zdCgnYXBpL2xvZ291dCcpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihvayl7XG4gICAgICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyh7fSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtTVEFUVVNLRVldO1xuICAgICAgICAgICAgICAgIGFjY2VwdCgpXG4gICAgICAgICAgICB9LCByZWplY3QpO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbihjYWxsQmFjaykge1xuICAgIGlmICh0aGlzLmlzTG9nZ2VkSW4pIHtcbiAgICAgICAgY2FsbEJhY2sodGhpcy5jYWNoZWRTdGF0dXMudXNlcl9pZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gd2FpdCBmb3IgbG9naW5cbiAgICAgICAgdGhpcy5vbmNlKCdsb2dnZWQtaW4nLGZ1bmN0aW9uKHVzZXJfaWQpe1xuICAgICAgICAgICAgY2FsbEJhY2sodXNlcl9pZCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnN0YXR1cyhjYWxsQmFjayB8fCB1dGlscy5ub29wKTtcbiAgICB9XG59XG5cbnV0aWxzLnJlV2hlZWxDb25uZWN0aW9uID0gcmVXaGVlbENvbm5lY3Rpb247IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBUb3VjaGVyKCl7XG4gICAgdmFyIHRvdWNoZWQgPSBmYWxzZVxuICAgIHRoaXMudG91Y2ggPSBmdW5jdGlvbigpe1xuICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcbiAgICB9O1xuICAgIHRoaXMudG91Y2hlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB0ID0gdG91Y2hlZDtcbiAgICAgICAgdG91Y2hlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gdDtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cblxuZnVuY3Rpb24gVmFjdXVtQ2FjaGVyKHRvdWNoLCBhc2tlZCwgbmFtZSwgcGtJbmRleCl7XG4vKlxuICAgIGlmIChuYW1lKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdjcmVhdGVkIFZhY3V1bUNhY2hlciBhcyAnICsgbmFtZSk7XG4gICAgfVxuKi9cbiAgICBpZiAoIWFza2VkKXtcbiAgICAgICAgdmFyIGFza2VkID0gW107XG4gICAgfVxuICAgIHZhciBtaXNzaW5nID0gW107XG4gICAgXG4gICAgdGhpcy5hc2sgPSBmdW5jdGlvbiAoaWQsbGF6eSl7XG4gICAgICAgIGlmIChwa0luZGV4ICYmIChpZCBpbiBwa0luZGV4LnNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIUxhenkoYXNrZWQpLmNvbnRhaW5zKGlkKSl7XG4vLyAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnYXNraW5nICgnICsgaWQgKyAnKSBmcm9tICcgKyBuYW1lKTtcbiAgICAgICAgICAgIG1pc3NpbmcucHVzaChpZCk7XG4gICAgICAgICAgICBpZiAoIWxhenkpXG4gICAgICAgICAgICAgICAgYXNrZWQucHVzaChpZCk7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICB9IFxuLy8gICAgICAgIGVsc2UgY29uc29sZS53YXJuKCcoJyArIGlkICsgJykgd2FzIGp1c3QgYXNrZWQgb24gJyArIG5hbWUpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEFza2VkSW5kZXggPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gYXNrZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5taXNzaW5ncyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBMYXp5KG1pc3Npbmcuc3BsaWNlKDAsbWlzc2luZy5sZW5ndGgpKS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgfVxufVxuIiwiZnVuY3Rpb24gQXV0b0xpbmtlcihhY3RpdmVzLCBJREIsIFcyUFJFU09VUkNFLCBsaXN0Q2FjaGUpe1xuICAgIHZhciB0b3VjaCA9IG5ldyBUb3VjaGVyKCk7XG4gICAgdmFyIG1haW5JbmRleCA9IHt9O1xuICAgIHZhciBmb3JlaWduS2V5cyA9IHt9O1xuICAgIHZhciBtMm0gPSB7fTtcbiAgICB2YXIgbTJtSW5kZXggPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbnMgPSB7fTtcbiAgICB0aGlzLm1haW5JbmRleCA9IG1haW5JbmRleDtcbiAgICB0aGlzLmZvcmVpZ25LZXlzID0gZm9yZWlnbktleXM7XG4gICAgdGhpcy5tMm0gPSBtMm07XG4gICAgdGhpcy5tMm1JbmRleCA9IG0ybUluZGV4O1xuICAgIHRoaXMucGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucztcblxuICAgIFcyUFJFU09VUkNFLm9uKCdtb2RlbC1kZWZpbml0aW9uJyxmdW5jdGlvbihtb2RlbCwgaW5kZXgpe1xuICAgICAgICAvLyBkZWZpbmluZyBhbGwgaW5kZXhlcyBmb3IgcHJpbWFyeSBrZXlcbiAgICAgICAgdmFyIHBrSW5kZXggPSBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IobW9kZWwubmFtZSwgJ2lkJyk7XG4gICAgICAgIG1haW5JbmRleFttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIHBrSW5kZXgsICdtYWluSW5kZXguJyArIG1vZGVsLm5hbWUsIGluZGV4KTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0aW5nIHBlcm1pc3Npb24gaW5kZXhlc1xuICAgICAgICBwZXJtaXNzaW9uc1ttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwgJ3Blcm1pc3Npb25zLicgKyBtb2RlbC5uYW1lKTtcblxuICAgICAgICAvLyBjcmVhdGluZyBpbmRleGVzIGZvciBmb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uKHJlZmVyZW5jZSl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWwubmFtZSArICdfJyArIHJlZmVyZW5jZS5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IocmVmZXJlbmNlLnRvLCAnaWQnKSwgcmVmZXJlbmNlLnRvICsgJy5pZCBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGNyZWF0aW5nIHJldmVyc2UgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkO1xuICAgICAgICAgICAgZm9yZWlnbktleXNbaW5kZXhOYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIGxpc3RDYWNoZS5nZXRJbmRleEZvcihmaWVsZC5ieSxmaWVsZC5pZCksIGZpZWxkLmJ5ICsgJy4nICsgZmllbGQuaWQgKyAnIGZvcmVpZ25LZXlzLicgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtb2RlbC5tYW55VG9NYW55KS5lYWNoKGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm0pKVxuICAgICAgICAgICAgICAgIG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdID0gW25ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUgKyAnWzBdJyksIG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUrJ1sxXScpXTtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm1JbmRleCkpXG4gICAgICAgICAgICAgICAgbTJtSW5kZXhbcmVsYXRpb24uaW5kZXhOYW1lXSA9IG5ldyBNYW55VG9NYW55UmVsYXRpb24ocmVsYXRpb24sbTJtW3JlbGF0aW9uLmluZGV4TmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgbTJtR2V0ID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayl7XG4gICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KChuID8gdXRpbHMucmV2ZXJzZSgnLycsIGluZGV4TmFtZSkgOiBpbmRleE5hbWUpICsgJ3MnICsgJy9saXN0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgZGVsZXRlIGFjdGl2ZXNbaW5kZXhOYW1lXVxuICAgICAgICB9KTsgICAgICAgIFxuICAgIH07XG5cbiAgICB2YXIgZ2V0TTJNID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBjb2xsZWN0aW9uLCBuLCBjYWxsQmFjayl7XG4gICAgICAgIC8vIGFzayBhbGwgaXRlbXMgaW4gY29sbGVjdGlvbiB0byBtMm0gaW5kZXhcbiAgICAgICAgTGF6eShjb2xsZWN0aW9uKS5lYWNoKG0ybVtpbmRleE5hbWVdW25dLmFzay5iaW5kKG0ybVtpbmRleE5hbWVdW25dKSk7XG4gICAgICAgIC8vIHJlbmV3aW5nIGNvbGxlY3Rpb24gd2l0aG91dCBhc2tlZFxuICAgICAgICBjb2xsZWN0aW9uID0gbTJtW2luZGV4TmFtZV1bbl0ubWlzc2luZ3MoKTtcbiAgICAgICAgLy8gY2FsbGluZyByZW1vdGUgZm9yIG0ybSBjb2xsZWN0aW9uIGlmIGFueVxuICAgICAgICBpZiAoY29sbGVjdGlvbi5sZW5ndGgpe1xuICAgICAgICAgICAgYWN0aXZlc1tpbmRleE5hbWVdID0gMTtcbiAgICAgICAgICAgIG0ybUdldChpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGNhbGxCYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuZ2V0TTJNID0gZ2V0TTJNO1xuXG4gICAgdmFyIGxpbmtVbmxpbmtlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIHBlcmZvcm0gYSBEYXRhQmFzZSBzeW5jaHJvbml6YXRpb24gd2l0aCBzZXJ2ZXIgbG9va2luZyBmb3IgdW5rbm93biBkYXRhXG4gICAgICAgIGlmICghdG91Y2gudG91Y2hlZCgpKSByZXR1cm47XG4gICAgICAgIGlmIChMYXp5KGFjdGl2ZXMpLnZhbHVlcygpLnN1bSgpKSB7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGluZGV4ZXMsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICBMYXp5KGluZGV4ZXMpLmVhY2goZnVuY3Rpb24gKGluZGV4LG4pIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IGluZGV4Lm1pc3NpbmdzKCk7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IExhenkoY29sbGVjdGlvbikuZmlsdGVyKEJvb2xlYW4pLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIElOREVYID0gbTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdldHRlciA9IElOREVYWydnZXQnICsgKDEgLSBuKV0uYmluZChJTkRFWCk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBjb2xsZWN0aW9uLm1hcChnZXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvdGhlckluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcvJylbMSAtIG5dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG90aGVySW5kZXgsZnVuY3Rpb24oKXtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2gobWFpbkluZGV4W290aGVySW5kZXhdLmFzayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoaWRzKS5mbGF0dGVuKCkudW5pcXVlKCkuZWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1haW5JbmRleFtvdGhlckluZGV4XS5hc2soeCx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtYWluSW5kZXgpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIHZhciBpZHMgPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgaWRiID0gbW9kZWxOYW1lIGluIElEQiA/IElEQlttb2RlbE5hbWVdLmtleXMoKSA6IExhenkoKTtcbiAgICAgICAgICAgICAgICAvL2xvZygnbGlua2luZy4nICsgbW9kZWxOYW1lICsgJyA9ICcgKyBXMlBSRVNPVVJDRS5saW5raW5nLnNvdXJjZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIHtpZDogaWRzfSxudWxsLHV0aWxzLm5vb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gRm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkoZm9yZWlnbktleXMpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICAgICAgICByZXR1cm4gdlsxXS5sZW5ndGhcbiAgICAgICAgfSkuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICB2YXIgaWRzID0geFsxXTtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSB4WzBdO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgbWFpblJlc291cmNlID0gaW5kZXhbMF07XG4gICAgICAgICAgICB2YXIgZmllbGROYW1lID0gaW5kZXhbMV07XG4gICAgICAgICAgICB2YXIgZmlsdGVyID0ge307XG4gICAgICAgICAgICBmaWx0ZXJbZmllbGROYW1lXSA9IGlkcztcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1haW5SZXNvdXJjZSwgZmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBMYXp5KExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgcmV0dXJuIFtrLCB2Lm1pc3NpbmdzKCldXG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLnRvT2JqZWN0KCkpLmVhY2goZnVuY3Rpb24gKGlkcywgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICBhY3RpdmVzW3Jlc291cmNlTmFtZV0gPSAxO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHJlc291cmNlTmFtZSArICcvbXlfcGVybXMnLCB7aWRzOiBMYXp5KGlkcykudW5pcXVlKCkudG9BcnJheSgpfSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoZGF0YS5QRVJNSVNTSU9OUyk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW3Jlc291cmNlTmFtZV1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHNldEludGVydmFsKGxpbmtVbmxpbmtlZCw1MCk7XG59O1xuXG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBMaXN0Q2FjaGVyKCl7XG4gICAgdmFyIGdvdEFsbCA9IHt9O1xuICAgIHZhciBhc2tlZCA9IHt9OyAvLyBtYXAgb2YgYXJyYXlcbiAgICB2YXIgY29tcG9zaXRlQXNrZWQgPSB7fTtcbiAgICB2YXIgY2FydGVzaWFuUHJvZHVjdDEgPSBmdW5jdGlvbih4LHksaXNBcnJheSl7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgaWYgKGlzQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4geCl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYiBpbiB5KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goTGF6eShbeFthXSx5W2JdXSkuZmxhdHRlbigpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgYSBpbiB4KXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBiIGluIHkpe1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChbeFthXSx5W2JdXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICB2YXIgY2FydGVzaWFuUHJvZHVjdCA9IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciBpc0FycmF5ID0gZmFsc2U7XG4gICAgICAgIHZhciByZXQgPSBhcnJbMF07IFxuICAgICAgICBmb3IgKHZhciB4ID0gMTsgeCA8IGFyci5sZW5ndGg7ICsreCl7XG4gICAgICAgICAgICByZXQgPSBjYXJ0ZXNpYW5Qcm9kdWN0MShyZXQsIGFyclt4XSwgaXNBcnJheSk7XG4gICAgICAgICAgICBpc0FycmF5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgICB2YXIgZXhwbG9kZUZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICB2YXIgcHJvZHVjdCA9IGNhcnRlc2lhblByb2R1Y3QoTGF6eShmaWx0ZXIpLnZhbHVlcygpLnRvQXJyYXkoKSk7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLmtleXMoKS50b0FycmF5KCk7XG4gICAgICAgIHJldHVybiBwcm9kdWN0Lm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhciByID0ge307XG4gICAgICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oYSxuKXtcbiAgICAgICAgICAgICAgICByW2FdID0geFtuXTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH07XG4gICAgdmFyIGZpbHRlclNpbmdsZSA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIsIHRlc3RPbmx5KXtcbiAgICAgICAgLy8gTGF6eSBhdXRvIGNyZWF0ZSBpbmRleGVzXG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG4gICAgICAgIHZhciBnZXRJbmRleEZvciA9IHRoaXMuZ2V0SW5kZXhGb3I7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2LGtleSl7IHJldHVybiBba2V5LCBtb2RlbE5hbWUgKyAnLicgKyBrZXldOyB9KS50b09iamVjdCgpO1xuICAgICAgICB2YXIgaW5kZXhlcyA9IExhenkoZmlsdGVyKS5rZXlzKCkubWFwKGZ1bmN0aW9uKGtleSl7IHJldHVybiBba2V5LCBnZXRJbmRleEZvcihtb2RlbE5hbWUsIGtleSldfSkudG9PYmplY3QoKTsgXG4gICAgICAgIC8vIGZha2UgZm9yIChpdCB3aWxsIGN5Y2xlIG9uY2UpXG4gICAgICAgIGZvciAodmFyIHggaW4gZmlsdGVyKXtcbiAgICAgICAgICAgIC8vIGdldCBhc2tlZCBpbmRleCBhbmQgY2hlY2sgcHJlc2VuY2VcbiAgICAgICAgICAgIHZhciBkaWZmZXJlbmNlID0gTGF6eShmaWx0ZXJbeF0pLmRpZmZlcmVuY2UoaW5kZXhlc1t4XSkudG9BcnJheSgpO1xuICAgICAgICAgICAgaWYgKGRpZmZlcmVuY2UubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAvLyBnZW5lcmF0ZSBuZXcgZmlsdGVyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IExhenkoW1t4LCBkaWZmZXJlbmNlXV0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgLy8gcmVtZW1iZXIgYXNrZWRcbiAgICAgICAgICAgICAgICBpZiAoIXRlc3RPbmx5KVxuICAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShpbmRleGVzW3hdLCBkaWZmZXJlbmNlKTtcbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUgZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikgKyAnXFxuT3V0IDonICsgSlNPTi5zdHJpbmdpZnkocmV0KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6IG51bGwnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY2xlYW5Db21wb3NpdGVzID0gZnVuY3Rpb24obW9kZWwsZmlsdGVyKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGNsZWFuIGNvbXBvc2l0ZUFza2VkXG4gICAgICAgICAqL1xuICAgICAgICAvLyBsYXp5IGNyZWF0ZSBjb25kaXRpb25hbCBhc2tlZCBpbmRleFxuICAgICAgICBpZiAoIShtb2RlbC5uYW1lIGluIGNvbXBvc2l0ZUFza2VkKSkgeyBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXSA9IFtdIH07XG4gICAgICAgIHZhciBpbmRleCA9IGNvbXBvc2l0ZUFza2VkW21vZGVsLm5hbWVdO1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGFsbCBlbGVtZW50cyB3aG8gaGF2ZSBzYW1lIHBhcnRpYWxcbiAgICAgICAgdmFyIGZpbHRlckxlbiA9IExhenkoZmlsdGVyKS5zaXplKCk7XG4gICAgICAgIHZhciBpdGVtcyA9IGluZGV4LmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIsICcgJiYgJyx0cnVlKSkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0peyBMYXp5KGl0ZW0pLnNpemUoKSA+IGZpbHRlckxlbiB9KTtcbi8vICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgOicgKyBKU09OLnN0cmluZ2lmeShpdGVtcykpO1xuICAgIH07XG5cbiAgICB0aGlzLmZpbHRlciA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIpe1xuLy8gICAgICAgIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLS0tLS0tLS1cXG5maWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSk7XG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG5cbiAgICAgICAgLy8gaWYgeW91IGZldGNoIGFsbCBvYmplY3RzIGZyb20gc2VydmVyLCB0aGlzIG1vZGVsIGhhcyB0byBiZSBtYXJrZWQgYXMgZ290IGFsbDtcbiAgICAgICAgdmFyIGZpbHRlckxlbiAgPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICBzd2l0Y2ggKGZpbHRlckxlbikge1xuICAgICAgICAgICAgY2FzZSAwIDoge1xuICAgICAgICAgICAgICAgIC8vIHJldHVybiBudWxsIG9yIGFsbFxuICAgICAgICAgICAgICAgIHZhciBnb3QgPSBnb3RBbGxbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICBnb3RBbGxbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBhc2tlZCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhc2tlZFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdXQgOiBudWxsIChnb3QgYWxsKScpO1xuICAgICAgICAgICAgICAgIC8vIGNvbmRpdGlvbmFsIGNsZWFuXG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBjb21wb3NpdGVBc2tlZCl7IFxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGdvdClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAxIDoge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBmaWx0ZXJTaW5nbGUuY2FsbCh0aGlzLCBtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgICAgICBjbGVhbkNvbXBvc2l0ZXMuY2FsbCh0aGlzLCBtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICB2YXIgc2luZ2xlID0gTGF6eShmaWx0ZXIpLmtleXMoKS5zb21lKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdmFyIGYgPSB7fTtcbiAgICAgICAgICAgIGZba2V5XSA9IGZpbHRlcltrZXldO1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlclNpbmdsZS5jYWxsKHRocywgbW9kZWwsIGYsIHRydWUpID09IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc2luZ2xlKSB7IHJldHVybiBudWxsIH1cbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29tcG9zaXRlQXNrZWRcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGNvbXBvc2l0ZUFza2VkKSl7IGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0gPSBbXTsgfVxuICAgICAgICAvLyBleHBsb2RlIGZpbHRlclxuICAgICAgICB2YXIgZXhwbG9kZWQgPSBleHBsb2RlRmlsdGVyKGZpbHRlcik7XG4gICAgICAgIC8vIGNvbGxlY3QgcGFydGlhbHNcbiAgICAgICAgdmFyIHBhcnRpYWxzID0gY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXS5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnIHx8ICcsdHJ1ZSkpO1xuICAgICAgICAvLyBjb2xsZWN0IG1pc3NpbmdzIChleHBsb2RlZCAtIHBhcnRpYWxzKVxuICAgICAgICBpZiAocGFydGlhbHMubGVuZ3RoKXtcbiAgICAgICAgICAgIHZhciBiYWQgID0gW107XG4gICAgICAgICAgICAvLyBwYXJ0aWFsIGRpZmZlcmVuY2VcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gcGFydGlhbHMpe1xuICAgICAgICAgICAgICAgIGJhZC5wdXNoLmFwcGx5KGJhZCxleHBsb2RlZC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgcGFydGlhbHNbeF0sJyAmJiAnLCB0cnVlKSkpO1xuICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICBjb25zb2xlLmxvZygnZXhwbG9kZWQgLSBwYXJ0aWFsIDogJyArIEpTT04uc3RyaW5naWZ5KGJhZCkpO1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gTGF6eShleHBsb2RlZCkuZGlmZmVyZW5jZShiYWQpLnRvQXJyYXkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IGV4cGxvZGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZmlsdGVyIHBhcnRpYWxzXG4gICAgICAgIGlmIChtaXNzaW5ncy5sZW5ndGgpe1xuICAgICAgICAgICAgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXS5wdXNoLmFwcGx5KGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0sbWlzc2luZ3MpO1xuICAgICAgICAgICAgLy8gYWdncmVnYXRlIG1pc3NpbmdzXG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBMYXp5KGZpbHRlcikua2V5cygpLm1hcChmdW5jdGlvbihrZXkpe1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBMYXp5KG1pc3NpbmdzKS5wbHVjayhrZXkpLnVuaXF1ZSgpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2tleSwgcmV0Lmxlbmd0aD9yZXQ6ZmlsdGVyW2tleV1dO1xuICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbi8vICAgICAgICAgICAgY29uc29sZS5sb2coJ291dCA6ICcgKyBKU09OLnN0cmluZ2lmeShtaXNzaW5ncykpO1xuICAgICAgICAgICAgLy8gY2xlYW4gY29uZGl0aW9uYWxcbiAgICAgICAgICAgIGNsZWFuQ29tcG9zaXRlcyhtb2RlbCwgbWlzc2luZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIG1pc3NpbmdzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEluZGV4Rm9yID0gZnVuY3Rpb24obW9kZWxOYW1lLCBmaWVsZE5hbWUpe1xuICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWxOYW1lICsgJy4nICsgZmllbGROYW1lO1xuICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gYXNrZWQpKXtcbiAgICAgICAgICAgIGFza2VkW2luZGV4TmFtZV0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXNrZWRbaW5kZXhOYW1lXTtcbiAgICB9XG59OyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybSl7XG4gICAgdmFyIGl0ZW1zID0gW107XG4gICAgdGhpcy5hZGQgPSBpdGVtcy5wdXNoLmJpbmQoaXRlbXMpO1xuICAgIHRoaXMuYWRkID0gZnVuY3Rpb24oaXRlbSl7XG4gIC8vICAgICAgY29uc29sZS5sb2coJ2FkZGluZyAnICsgaXRlbSk7XG4gICAgICAgIGlmICghKExhenkoaXRlbXMpLmZpbmQoaXRlbSkpKXtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmdldDAgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVsxXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjFcIikudG9BcnJheSgpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldDEgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVswXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMV0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjBcIikudG9BcnJheSgpO1xuICAgIH07XG4gICAgdGhpc1snZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVsYXRpb24uaW5kZXhOYW1lLnNwbGl0KCcvJylbMV0pXSA9IHRoaXMuZ2V0MTtcbiAgICB0aGlzWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWxhdGlvbi5pbmRleE5hbWUuc3BsaXQoJy8nKVswXSldID0gdGhpcy5nZXQwO1xuXG4gICAgdGhpcy5kZWwgPSBmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgdmFyIGwgPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgIHZhciBpZHggPSBudWxsO1xuICAgICAgICBmb3IgKHZhciBhID0gMDsgYSA8IGw7IGErKyl7IFxuICAgICAgICAgICAgaWYgKChpdGVtc1thXVswXSA9PT0gaXRlbVswXSkgJiYgKGl0ZW1zW2FdWzFdID09PSBpdGVtWzFdKSl7XG4gICAgICAgICAgICAgICAgaWR4ID0gYTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaWR4KXtcbiAgICAgICAgICAgIGl0ZW1zLnNwbGljZShhLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgJywgaXRlbSk7XG4gICAgfTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGNhY2hlZFByb3BlcnR5QnlFdmVudHMocHJvdG8sIHByb3BlcnR5TmFtZSxnZXR0ZXIsIHNldHRlcil7XG4gICAgdmFyIGV2ZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyw0KTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgXG4gICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICBwcm90by5vcm0ub24oZXZlbnQsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJlc3VsdCA9IHt9O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgcHJvcGVydHlEZWYgPSB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gY2FjaGVkKCl7XG4vLyAgICAgICAgICAgIHJldHVybiBnZXR0ZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIGlmICghKHRoaXMuaWQgaW4gcmVzdWx0KSl7XG4gICAgICAgICAgICAgICAgcmVzdWx0W3RoaXMuaWRdID0gZ2V0dGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpZiAoc2V0dGVyKXtcbiAgICAgICAgcHJvcGVydHlEZWZbJ3NldCddID0gZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCBpbiByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICBpZiAodmFsdWUgIT09IHJlc3VsdFt0aGlzLmlkXSl7XG4gICAgICAgICAgICAgICAgc2V0dGVyLmNhbGwodGhpcyx2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaWQgaW4gcmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIHByb3BlcnR5TmFtZSxwcm9wZXJ0eURlZik7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvcihkYXRhKXtcbiAgICB0aGlzLnJlc291cmNlID0gZGF0YS5fcmVzb3VyY2U7XG4gICAgdGhpcy5mb3JtSWR4ID0gZGF0YS5mb3JtSWR4O1xuICAgIHRoaXMuZmllbGRzID0gZGF0YS5lcnJvcnM7XG59XG52YXIgYmFzZU9STSA9IGZ1bmN0aW9uKG9wdGlvbnMsIGV4dE9STSl7XG4gICAgXG4gICAgLy8gY3JlYXRpbmcgcmV3aGVlbCBjb25uZWN0aW9uXG4gICAgaWYgKG9wdGlvbnMuY29uc3RydWN0b3IgPT09IFN0cmluZyl7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gbmV3IHJlV2hlZWxDb25uZWN0aW9uKG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gdXRpbHMucmVXaGVlbENvbm5lY3Rpb24pe1xuICAgICAgICB2YXIgY29ubmVjdGlvbiA9IG9wdGlvbnM7XG4gICAgfVxuICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgY29ubmVjdGlvbi5vbignY29ubmVjdGVkJywgZnVuY3Rpb24oKXsgXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICB9KTtcbiAgICB0aGlzLm9uID0gY29ubmVjdGlvbi5vbjtcbiAgICB0aGlzLmVtaXQgPSBjb25uZWN0aW9uLmVtaXQ7XG4gICAgdGhpcy51bmJpbmQgPSBjb25uZWN0aW9uLnVuYmluZDtcbiAgICB0aGlzLm9uY2UgPSBjb25uZWN0aW9uLm9uY2U7XG4gICAgdGhpcy4kcG9zdCA9IGNvbm5lY3Rpb24uJHBvc3QuYmluZChjb25uZWN0aW9uKTtcblxuICAgIC8vIGhhbmRsaW5nIHdlYnNvY2tldCBldmVudHNcbiAgICB0aGlzLm9uKCd3cy1jb25uZWN0ZWQnLGZ1bmN0aW9uKHdzKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdXZWJzb2NrZXQgY29ubmVjdGVkJyk7XG4gICAgICAgIC8vIGFsbCBqc29uIGRhdGEgaGFzIHRvIGJlIHBhcnNlZCBieSBnb3REYXRhXG4gICAgICAgIHdzLm9uTWVzc2FnZUpzb24oVzJQUkVTT1VSQ0UuZ290RGF0YS5iaW5kKFcyUFJFU09VUkNFKSk7XG4gICAgICAgIC8vXG4gICAgICAgIHdzLm9uTWVzc2FnZVRleHQoZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8oJ1dTIG1lc3NhZ2UgOiAnICsgbWVzc2FnZSlcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5vbignd3MtZGlzY29ubmVjdGVkJywgZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmVycm9yKCdXZWJzb2NrZXQgZGlzY29ubmVjdGVkJylcbiAgICB9KTtcbiAgICB0aGlzLm9uKCdlcnJvci1qc29uLTQwNCcsZnVuY3Rpb24oZXJyb3IsdXJsLCBzZW50RGF0YSwgeGhyKXsgXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0pTT04gZXJyb3IgJywgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1t1cmwuc3BsaXQoJy8nKVswXV07XG4gICAgfSk7XG4gICAgdGhpcy5vbigncmVhbHRpbWUtbWVzc2FnZS1qc29uJywgZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEobWVzc2FnZSk7XG4gICAgfSk7XG5cbiAgICAvLyBpbml0aWFsaXphdGlvblxuICAgIHZhciBXMlBSRVNPVVJDRSA9IHRoaXM7XG4gICAgdmFyIElEQiA9IHthdXRoX2dyb3VwIDogTGF6eSh7fSl9OyAvLyB0YWJsZU5hbWUgLT4gZGF0YSBhcyBBcnJheVxuICAgIHZhciBJRFggPSB7fTsgLy8gdGFibGVOYW1lIC0+IExhenkoaW5kZXhCeSgnaWQnKSkgLT4gSURCW2RhdGFdXG4gICAgdmFyIFJFVklEWCA9IHt9OyAvLyB0YWJsZU5hbWUgLT4gZmllbGROYW1lIC0+IExhenkuZ3JvdXBCeSgpIC0+IElEQltEQVRBXVxuICAgIHZhciBidWlsZGVySGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgYnVpbGRlckhhbmRsZXJVc2VkID0ge307XG4gICAgdmFyIHBlcnNpc3RlbnRBdHRyaWJ1dGVzID0ge307XG4gICAgdmFyIGV2ZW50SGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbldhaXRpbmcgPSB7fTtcbiAgICB2YXIgbW9kZWxDYWNoZSA9IHt9O1xuICAgIHZhciBmYWlsZWRNb2RlbHMgPSB7fTtcbiAgICB2YXIgd2FpdGluZ0Nvbm5lY3Rpb25zID0ge30gLy8gYWN0dWFsIGNvbm5lY3Rpb24gd2hvIGknbSB3YWl0aW5nIGZvclxuICAgIHZhciBsaXN0Q2FjaGUgPSBuZXcgTGlzdENhY2hlcihMYXp5KTtcbiAgICB2YXIgbGlua2VyID0gbmV3IEF1dG9MaW5rZXIod2FpdGluZ0Nvbm5lY3Rpb25zLElEQiwgdGhpcywgbGlzdENhY2hlKTtcbi8qICAgIHdpbmRvdy5sbCA9IGxpbmtlcjtcbiAgICB3aW5kb3cubGMgPSBsaXN0Q2FjaGU7XG4qL1xuICAgIHdpbmRvdy5JREIgPSBJREI7XG4gICAgdGhpcy52YWxpZGF0aW9uRXZlbnQgPSB0aGlzLm9uKCdlcnJvci1qc29uLTUxMycsIGZ1bmN0aW9uKGRhdGEsIHVybCwgc2VudERhdGEsIHhocil7XG4gICAgICAgIGlmIChjdXJyZW50Q29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIpe1xuICAgICAgICAgICAgY3VycmVudENvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyKG5ldyBWYWxpZGF0aW9uRXJyb3IoZGF0YSkpO1xuICAgICAgICB9XG4gICAgfSlcblxuICAgIHZhciBnZXRJbmRleCA9IGZ1bmN0aW9uIChpbmRleE5hbWUpIHtcbiAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJREIpXG4gICAgICAgICAgICByZXR1cm4gSURCW2luZGV4TmFtZV07XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSURCW2luZGV4TmFtZV0gPSBMYXp5KHt9KTtcbiAgICAgICAgICAgIHJldHVybiBJREJbaW5kZXhOYW1lXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGdldFVubGlua2VkID0gZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICBpZiAoaW5kZXhOYW1lIGluIFVOTElOS0VEKVxuICAgICAgICAgICAgcmV0dXJuIFVOTElOS0VEW2luZGV4TmFtZV07XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgVU5MSU5LRURbaW5kZXhOYW1lXSA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIFVOTElOS0VEW2luZGV4TmFtZV07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gUGVybWlzc2lvblRhYmxlKGlkLCBrbGFzcywgcGVybWlzc2lvbnMpIHtcbiAgICAgICAgLy8gY3JlYXRlIFBlcm1pc3Npb25UYWJsZSBjbGFzc1xuICAgICAgICB0aGlzLmtsYXNzID0ga2xhc3M7XG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICBmb3IgKHZhciBrIGluIHBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICB0aGlzLnB1c2guYXBwbHkodGhpcywgW2ssIHBlcm1pc3Npb25zW2tdXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgUGVybWlzc2lvblRhYmxlLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIC8vIHNhdmUgT2JqZWN0IHRvIHNlcnZlclxuICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgIHBlcm1pc3Npb25zOiBMYXp5KHRoaXMucGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeFswXS5pZCwgeFsxXV1cbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KClcbiAgICAgICAgfTtcbiAgICAgICAgZGF0YS5pZCA9IHRoaXMuaWQ7XG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSB0aGlzLmtsYXNzLm1vZGVsTmFtZTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5rbGFzcy5tb2RlbE5hbWUgKyAnL3NldF9wZXJtaXNzaW9ucycsIGRhdGEsIGZ1bmN0aW9uIChteVBlcm1zLCBhLCBiLCByZXEpIHtcbiAgICAgICAgICAgIGNiKG15UGVybXMpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIFBlcm1pc3Npb25UYWJsZS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChncm91cF9pZCwgcGVybWlzc2lvbkxpc3QpIHtcbiAgICAgICAgdmFyIHAgPSBMYXp5KHBlcm1pc3Npb25MaXN0KTtcbiAgICAgICAgdmFyIHBlcm1zID0gTGF6eSh0aGlzLmtsYXNzLmFsbFBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBbeCwgcC5jb250YWlucyh4KV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgdmFyIGwgPSBMYXp5KHRoaXMucGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0uaWRcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChsLmNvbnRhaW5zKGdyb3VwX2lkKSlcbiAgICAgICAgICAgIHRoaXMucGVybWlzc2lvbnNbbC5pbmRleE9mKGdyb3VwX2lkKV1bMV0gPSBwZXJtcztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5wZXJtaXNzaW9ucy5wdXNoKFtJREIuYXV0aF9ncm91cC5nZXQoZ3JvdXBfaWQpLCBwZXJtc10pO1xuICAgIH07XG5cbiAgICAvLyBjcmVhdGVzIGR5bmFtaWNhbCBtb2RlbHNcbiAgICB2YXIgbWFrZU1vZGVsQ2xhc3MgPSBmdW5jdGlvbiAobW9kZWwpIHtcbiAgICAgICAgdmFyIF9tb2RlbCA9IG1vZGVsO1xuICAgICAgICBtb2RlbC5maWVsZHMuaWQucmVhZGFibGUgPSBmYWxzZTtcbiAgICAgICAgbW9kZWwuZmllbGRzLmlkLndyaXRhYmxlID0gZmFsc2U7XG4gICAgICAgIHZhciBmaWVsZHMgPSBMYXp5KG1vZGVsLmZpZWxkcyk7XG4gICAgICAgIGlmIChtb2RlbC5wcml2YXRlQXJncykge1xuICAgICAgICAgICAgZmllbGRzID0gZmllbGRzLm1lcmdlKG1vZGVsLnByaXZhdGVBcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdtb2RlbC1kZWZpbml0aW9uJywgbW9kZWwsIGdldEluZGV4KG1vZGVsLm5hbWUpKTtcbiAgICAgICAgLy8gZ2V0dGluZyBmaWVsZHMgb2YgdHlwZSBkYXRlIGFuZCBkYXRldGltZVxuLypcbiAgICAgICAgdmFyIERBVEVGSUVMRFMgPSBmaWVsZHMuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHgudHlwZSA9PSAnZGF0ZScpIHx8ICh4LnR5cGUgPT0gJ2RhdGV0aW1lJylcbiAgICAgICAgfSkubWFwKGZ1bmN0aW9uICh4LCB2KSB7XG4gICAgICAgICAgICByZXR1cm4gW3YsIHRydWVdXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG5cbiAgICAgICAgLy8gZ2V0dGluZyBib29sZWFuIGZpZWxkc1xuICAgICAgICB2YXIgQk9PTEZJRUxEUyA9IGZpZWxkcy5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoeC50eXBlID09ICdib29sZWFuJylcbiAgICAgICAgfSkubWFwKGZ1bmN0aW9uICh4LCB2KSB7XG4gICAgICAgICAgICByZXR1cm4gW3YsIHRydWVdXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG5cbiAgICAgICAgLy8gYm9vbGVhbnMgYW5kIGRhdGV0aW1lcyBzdG9yYWdlIGV4dGVybmFsIFxuICAgICAgICBNT0RFTF9EQVRFRklFTERTW21vZGVsLm5hbWVdID0gREFURUZJRUxEUztcbiAgICAgICAgTU9ERUxfQk9PTEZJRUxEU1ttb2RlbC5uYW1lXSA9IEJPT0xGSUVMRFM7XG4qL1xuICAgICAgICAvLyBpbml0aWFsaXphdGlvblxuICAgICAgICB2YXIgZnVuY1N0cmluZyA9IFwiaWYgKCFyb3cpIHsgcm93ID0ge319O1xcblwiO1xuICAgICAgICBmdW5jU3RyaW5nICs9IG1vZGVsLnJlZmVyZW5jZXMubWFwKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHJldHVybiAndGhpcy5fJyArIGZpZWxkLmlkICsgJyA9IHJvdy4nICsgZmllbGQuaWQgKyAnOyc7XG4gICAgICAgIH0pLmpvaW4oJztcXG4nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGRhdGVmaWVsZCBjb252ZXJzaW9uXG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gZmllbGRzLm1hcChmdW5jdGlvbiAoeCxrKSB7XG4gICAgICAgICAgICBpZiAoKHgudHlwZSA9PSAnZGF0ZScpIHx8ICh4LnR5cGUgPT0gJ2RhdGV0aW1lJykpe1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSByb3cuJyArIGsgKyAnP25ldyBEYXRlKHJvdy4nICsgayArICcgKiAxMDAwIC0gJyArIHV0aWxzLnR6T2Zmc2V0ICsgJyk6bnVsbDtcXG4nOyBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeC50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSAocm93LicgKyBrICsgJyA9PT0gXCJUXCIpIHx8IChyb3cuJyArIGsgKyAnID09PSB0cnVlKTtcXG4nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gcm93LicgKyBrICsgJztcXG4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS50b1N0cmluZygnXFxuJyk7ICsgJ1xcbic7XG5cbiAgICAgICAgZnVuY1N0cmluZyArPSBcImlmIChwZXJtaXNzaW9ucykge3RoaXMuX3Blcm1pc3Npb25zID0gcGVybWlzc2lvbnMgJiYgTGF6eShwZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7IHJldHVybiBbeCwgdHJ1ZV0gfSkudG9PYmplY3QoKTt9XCJcblxuICAgICAgICBcbiAgICAgICAgLy8gbWFzdGVyIGNsYXNzIGZ1bmN0aW9uXG4gICAgICAgIHZhciBLbGFzcyA9IG5ldyBGdW5jdGlvbigncm93JywgJ3Blcm1pc3Npb25zJyxmdW5jU3RyaW5nKVxuXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5vcm0gPSBleHRPUk07XG4gICAgICAgIEtsYXNzLnJlZl90cmFuc2xhdGlvbnMgPSB7fTtcbiAgICAgICAgS2xhc3MubW9kZWxOYW1lID0gbW9kZWwubmFtZTtcbiAgICAgICAgS2xhc3MucmVmZXJlbmNlcyA9IExhenkobW9kZWwucmVmZXJlbmNlcykucGx1Y2soJ2lkJykudG9BcnJheSgpO1xuXG4gICAgICAgIEtsYXNzLmludmVyc2VfcmVmZXJlbmNlcyA9IG1vZGVsLnJlZmVyZW5jZWRCeS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIC8vIG1hbmFnaW5nIHJlZmVyZW5jZXMgd2hlcmUgXG4gICAgICAgICAgICByZXR1cm4geC5ieSArICdfJyArIHguaWQgKyAnX3NldCdcbiAgICAgICAgfSk7XG4gICAgICAgIEtsYXNzLnJlZmVyZW50cyA9IG1vZGVsLnJlZmVyZW5jZWRCeS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBbeC5ieSwgeC5pZF1cbiAgICAgICAgfSk7XG4gICAgICAgIEtsYXNzLmZpZWxkc09yZGVyID0gbW9kZWwuZmllbGRPcmRlcjtcbiAgICAgICAgS2xhc3MuYWxsUGVybWlzc2lvbnMgPSBtb2RlbC5wZXJtaXNzaW9ucztcblxuICAgICAgICAvLyByZWRlZmluaW5nIHRvU3RyaW5nIG1ldGhvZFxuICAgICAgICBpZiAoTGF6eShtb2RlbC5yZXByZXNlbnRhdGlvbikuc2l6ZSgpKXtcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS50b1N0cmluZyA9IG5ldyBGdW5jdGlvbigncmV0dXJuIHRoaXMuJyArIExhenkobW9kZWwucmVwcmVzZW50YXRpb24pLnRvU3RyaW5nKCcgKyBcIiBcIiArIHRoaXMuJykpO1xuICAgICAgICB9XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS50b1VwcGVyQ2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIHJlZGVmaW5lIHRvIFVwcGVyQ2FzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICB9O1xuICAgICAgXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS50b0xvd2VyQ2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBkZWxldGUgaW5zdGFuY2UgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIHJldHVybiBleHRPUk0uZGVsZXRlKHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lLCBbdGhpcy5pZF0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHBlcm1pc3Npb24gZ2V0dGVyIHByb3BlcnR5XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShLbGFzcy5wcm90b3R5cGUsICdwZXJtaXNzaW9ucycsIHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9wZXJtaXNzaW9ucylcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Blcm1pc3Npb25zO1xuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsaW5rZXIucGVybWlzc2lvbnNbdGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWVdLmFzayh0aGlzLmlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBnZXR0aW5nIGZ1bGwgcGVybWlzc2lvbiB0YWJsZSBmb3IgYW4gb2JqZWN0XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5hbGxfcGVybXMgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgIHZhciBvYmplY3RfaWQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUgKyAnL2FsbF9wZXJtcycsIHtpZDogdGhpcy5pZH0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBlcm1pc3Npb25zID0gZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXBlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciB1bmtub3duX2dyb3VwcyA9IExhenkocGVybWlzc2lvbnMpLnBsdWNrKCdncm91cF9pZCcpLnVuaXF1ZSgpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJycgKyB4XG4gICAgICAgICAgICAgICAgfSkuZGlmZmVyZW5jZShJREIuYXV0aF9ncm91cC5rZXlzKCkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KHBlcm1pc3Npb25zKS5ncm91cEJ5KGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4Lmdyb3VwX2lkXG4gICAgICAgICAgICAgICAgfSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICBncm91cGVkW2tdID0gTGF6eSh2KS5wbHVjaygnbmFtZScpLnRvQXJyYXkoKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHZhciBjYWxsID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2IobmV3IFBlcm1pc3Npb25UYWJsZShvYmplY3RfaWQsIEtsYXNzLCBncm91cGVkKSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAodW5rbm93bl9ncm91cHMubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nZXQoJ2F1dGhfZ3JvdXAnLHVua25vd25fZ3JvdXBzLGNhbGwpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgY2FsbCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgdmFyIG8gPSB0aGlzLmFzUmF3KCk7XG4gICAgICAgICAgICB2YXIgZmllbGRzID0gS2xhc3MuZmllbGRzO1xuICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgIHZhciBtb2RlbE5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXJnIGluIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgb1thcmddID0gYXJnc1thcmddO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGVsaW1pbmF0ZSB1bndyaXRhYmxlc1xuICAgICAgICAgICAgTGF6eShLbGFzcy5maWVsZHNPcmRlcikuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgIHJldHVybiAhZmllbGRzW3hdLndyaXRhYmxlO1xuICAgICAgICAgICAgfSkuZWFjaChmdW5jdGlvbihmaWVsZE5hbWUpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgaW4gbykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgb1tmaWVsZE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKElEKSB7IG8uaWQgPSBJRDsgfVxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBXMlBSRVNPVVJDRS4kcG9zdChtb2RlbE5hbWUgKyAoSUQgPyAnL3Bvc3QnIDogJy9wdXQnKSwgbyk7XG4gICAgICAgICAgICBpZiAoYXJncyAmJiAoYXJncy5jb25zdHJ1Y3RvciA9PT0gRnVuY3Rpb24pKXtcbiAgICAgICAgICAgICAgICAvLyBwbGFjaW5nIGNhbGxiYWNrIGluIGEgY29tbW9uIHBsYWNlXG4gICAgICAgICAgICAgICAgcHJvbWlzZS5jb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlciA9IGFyZ3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZVxuICAgICAgICB9O1xuICAgICAgICBLbGFzcy5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBvYmogPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih0aGlzLmFzUmF3KCkpO1xuICAgICAgICAgICAgb2JqLl9wZXJtaXNzaW9ucyA9IHRoaXMuX3Blcm1pc3Npb25zO1xuICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBidWlsZGluZyBzZXJpYWxpemF0aW9uIGZ1bmN0aW9uXG4gICAgICAgIHZhciBhc3IgPSAncmV0dXJuIHtcXG4nICsgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5tYXAoZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgcmV0dXJuIGZpZWxkLmlkICsgJyA6IHRoaXMuXycgKyBmaWVsZC5pZDtcbiAgICAgICAgfSkuY29uY2F0KGZpZWxkcy5tYXAoZnVuY3Rpb24gKHgsaykge1xuICAgICAgICAgICAgaWYgKCh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiAodGhpcy4nICsgayArICc/KE1hdGgucm91bmQodGhpcy4nICsgayArICcuZ2V0VGltZSgpIC0gdGhpcy4nICsgayArICcuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIDYwMDAwKSAvIDEwMDApOm51bGwpJzsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHgudHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiB0aGlzLicgKyBrICsgJz9cIlRcIjpcIkZcIic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6IHRoaXMuJyArIGs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKS50b1N0cmluZygnLFxcbicpICsgJ307JztcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmFzUmF3ID0gbmV3IEZ1bmN0aW9uKGFzcik7XG5cbiAgICAgICAgS2xhc3Muc2F2ZU11bHRpID0gZnVuY3Rpb24gKG9iamVjdHMsIGNiLCBzY29wZSkge1xuICAgICAgICAgICAgdmFyIHJhdyA9IFtdO1xuICAgICAgICAgICAgdmFyIGRlbGV0YWJsZSA9IExhenkoS2xhc3MuZmllbGRzKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICF4LndyaXRhYmxlXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAucGx1Y2soJ2lkJylcbiAgICAgICAgICAgICAgICAudG9BcnJheSgpO1xuICAgICAgICAgICAgTGF6eShvYmplY3RzKVxuICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguYXNSYXcoKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShkZWxldGFibGUpLmVhY2goZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB4W3ldO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmF3LnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUsICdwdXQnLCB7bXVsdGlwbGU6IHJhdywgZm9ybUlkeCA6IFcyUFJFU09VUkNFLmZvcm1JZHgrK30sIGZ1bmN0aW9uIChlbGVtcykge1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZWxlbXMpO1xuICAgICAgICAgICAgICAgIHZhciB0YWIgPSBJREJbS2xhc3MubW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB2YXIgb2JqcyA9IExhenkoZWxlbXNbS2xhc3MubW9kZWxOYW1lXS5yZXN1bHRzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhYi5nZXQoeClcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNiKSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKG9ianMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHNjb3BlKTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCdleHRyYV92ZXJicycgaW4gbW9kZWwpXG4gICAgICAgICAgICBMYXp5KG1vZGVsLmV4dHJhX3ZlcmJzKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGZ1bmNOYW1lID0geFswXTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHhbMV07XG4gICAgICAgICAgICAgICAgdmFyIGRkYXRhID0gJ3ZhciBkYXRhID0ge2lkIDogdGhpcy5pZCc7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBkZGF0YSArPSAnLCAnICsgTGF6eShhcmdzKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geCArICcgOiAnICsgeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJywnKTtcbiAgICAgICAgICAgICAgICBkZGF0YSArPSAnfTtcXG4nO1xuICAgICAgICAgICAgICAgIGFyZ3MgPSBbJ3Bvc3QnLCdnb3REYXRhJ10uY29uY2F0KGFyZ3MpO1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCgnY2InKTtcbiAgICAgICAgICAgICAgICB2YXIgY29kZSA9IGRkYXRhICsgJyByZXR1cm4gcG9zdChcIicgKyBLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBmdW5jTmFtZSArICdcIiwgZGF0YSxjYik7JztcbiAgICAgICAgICAgICAgICB2YXIgZnVuYyA9IG5ldyBGdW5jdGlvbihhcmdzLCBjb2RlKTtcbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbZnVuY05hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gW1cyUFJFU09VUkNFLiRwb3N0LCBXMlBSRVNPVVJDRS5nb3REYXRhXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJncylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKCdwcml2YXRlQXJncycgaW4gbW9kZWwpIHtcbiAgICAgICAgICAgIEtsYXNzLnByaXZhdGVBcmdzID0gTGF6eShtb2RlbC5wcml2YXRlQXJncykua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgdHJ1ZV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmVQQSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgdmFyIFQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBvbyA9IHtpZDogdGhpcy5pZH07XG4gICAgICAgICAgICAgICAgdmFyIFBBID0gdGhpcy5jb25zdHJ1Y3Rvci5wcml2YXRlQXJncztcbiAgICAgICAgICAgICAgICB2YXIgRnMgPSB0aGlzLmNvbnN0cnVjdG9yLmZpZWxkcztcbiAgICAgICAgICAgICAgICB2YXIgdCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG8pLmFzUmF3KCk7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkSWR4ID0gTGF6eShQQSkua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIEZzW3hdXVxuICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgTGF6eShvKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoayBpbiBQQSkgJiYgZmllbGRJZHhba10ud3JpdGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9vW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9zYXZlUEEnLCBvbywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG9vKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBUW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbW9kZWxDYWNoZVtLbGFzcy5tb2RlbE5hbWVdID0gS2xhc3M7XG4gICAgICAgIC8vIGFkZGluZyBpZCB0byBmaWVsZHNcbiAgICAgICAgZm9yICh2YXIgZiBpbiBtb2RlbC5maWVsZHMpIHtcbiAgICAgICAgICAgIG1vZGVsLmZpZWxkc1tmXS5pZCA9IGY7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MuZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpLmNvbmNhdChMYXp5KG1vZGVsLnByaXZhdGVBcmdzKSkuY29uY2F0KExhenkobW9kZWwucmVmZXJlbmNlcykudGFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICB4LnR5cGUgPSB4LnR5cGUgfHwgJ3JlZmVyZW5jZSdcbiAgICAgICAgfSkpLmluZGV4QnkoJ2lkJykudG9PYmplY3QoKTtcbiAgICAgICAgLy8gc2V0dGluZyB3aWRnZXRzIGZvciBmaWVsZHNcbiAgICAgICAgTGF6eShLbGFzcy5maWVsZHMpLmVhY2goZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgaWYgKCFmaWVsZC53aWRnZXQpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZC50eXBlID09PSAncmVmZXJlbmNlJyl7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9ICdjaG9pY2VzJ1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9IGZpZWxkLnR5cGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAobWFueSB0byBvbmUpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGV4dF9yZWYgPSByZWYudG87XG4gICAgICAgICAgICB2YXIgbG9jYWxfcmVmID0gJ18nICsgcmVmLmlkO1xuICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5pZCxmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzW2xvY2FsX3JlZl0pIHsgcmV0dXJuIHV0aWxzLm1vY2sgfTtcbiAgICAgICAgICAgICAgICBpZiAoIShleHRfcmVmIGluIElEQikpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUoZXh0X3JlZixmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtlci5tYWluSW5kZXhbZXh0X3JlZl0uYXNrKHRoc1tsb2NhbF9yZWZdLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IChleHRfcmVmIGluIElEQikgJiYgdGhpc1tsb2NhbF9yZWZdICYmIElEQltleHRfcmVmXS5nZXQodGhpc1tsb2NhbF9yZWZdKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdCAmJiAoZXh0X3JlZiBpbiBsaW5rZXIubWFpbkluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBhc2tpbmcgdG8gbGlua2VyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpc1tsb2NhbF9yZWZdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLm1haW5JbmRleFtleHRfcmVmXS5hc2sodGhpc1tsb2NhbF9yZWZdLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdudWxsIHJlZmVyZW5jZSBmb3IgJyArIGxvY2FsX3JlZiArICcoJyArIHRoaXMuaWQgKyAnKSByZXNvdXJjZSAnICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXRpbHMubW9jaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHZhbHVlLmNvbnN0cnVjdG9yICE9PSB1dGlscy5tb2NrKSAmJiAodmFsdWUuY29uc3RydWN0b3IubW9kZWxOYW1lICE9PSBleHRfcmVmKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IGNhbiBhc3NpZ24gb25seSAnICsgZXh0X3JlZiArICcgdG8gJyArIHJlZi5pZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpc1tsb2NhbF9yZWZdID0gdmFsdWUuaWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tsb2NhbF9yZWZdID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAnbmV3LScgKyBleHRfcmVmLCAnZGVsZXRlZC0nICsgZXh0X3JlZiwndXBkYXRlZC0nICsgZXh0X3JlZiwgJ25ldy1tb2RlbC0nICsgZXh0X3JlZi8qLCAndXBkYXRlZC0nICsgS2xhc3MubW9kZWxOYW1lKi8pO1xuXG5cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVmLmlkKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5nZXQoZXh0X3JlZix0aGlzW2xvY2FsX3JlZl0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9idWlsZGluZyByZWZlcmVuY2VzIHRvIChvbmUgdG8gbWFueSkgZmllbGRzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSByZWYuYnkgKyAnLicgKyByZWYuaWQ7XG4gICAgICAgICAgICB2YXIgcHJvcGVydHlOYW1lID0gcmVmLmJ5ICsgJ18nICsgdXRpbHMucGx1cmFsaXplKHJlZi5pZCk7XG4gICAgICAgICAgICB2YXIgcmV2SW5kZXggPSByZWYuYnk7XG4gICAgICAgICAgICBpZiAoS2xhc3MucHJvdG90eXBlLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcnllZCB0byByZWRlZmluZSBwcm9wZXJ0eSAnICsgcHJvcGVydHlOYW1lICsgJ3MnICsgJyBmb3IgJyArIEtsYXNzLm1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCBwcm9wZXJ0eU5hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IChyZXZJbmRleCBpbiBJREIpID8gUkVWSURYW2luZGV4TmFtZV0uZ2V0KHRoaXMuaWQgKyAnJyk6bnVsbDtcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLmZvcmVpZ25LZXlzW2luZGV4TmFtZV0uYXNrKHRoaXMuaWQsdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgfSwgbnVsbCwgJ25ldy0nICsgcmV2SW5kZXgsICd1cGRhdGVkLScgKyByZXZJbmRleCwgJ2RlbGV0ZWQtJyArIHJldkluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUodXRpbHMucGx1cmFsaXplKHJlZi5ieSkpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0cyA9IHt9O1xuICAgICAgICAgICAgICAgIG9wdHNbcmVmLmlkXSA9IFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0T1JNLmdldChyZWYuYnksb3B0cyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2J1aWxkaW5nIHJlZmVyZW5jZSB0byAobWFueSB0byBtYW55KSBmaWVsZHNcbiAgICAgICAgaWYgKG1vZGVsLm1hbnlUb01hbnkpIHtcbiAgICAgICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHJlZi5pbmRleE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcmVmLmZpcnN0PyAwIDogMTtcbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsTmFtZSA9IHJlZi5tb2RlbDtcbi8vICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBnZXRJbmRleChvbW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgZ2V0dGVyID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyAoMSAtIGZpcnN0KV07XG5cbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcmVmLm1vZGVsICsgJ3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZXQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0ID0gZ2V0SW5kZXgob21vZGVsTmFtZSkuZ2V0LmJpbmQoSURCW29tb2RlbE5hbWVdKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcyAmJiBnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0ID0gTGF6eShpZHMpLm1hcChnZXQpLmZpbHRlcih1dGlscy5ib29sKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgICAgICB9LCBudWxsLCAncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUsICdyZWNlaXZlZC0nICsgb21vZGVsTmFtZSk7XG5cbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShvbW9kZWxOYW1lKSldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLmdldE0yTShpbmRleE5hbWUsIFt0aHMuaWRdLCBmaXJzdCxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGdldHRlcih0aHMuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChvbW9kZWxOYW1lLCB7aWQgOiBpZHN9LG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gSURCW29tb2RlbE5hbWVdLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KFtdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgICAgIEtsYXNzLmZpZWxkc1t1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICByZWFkYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ00yTScsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcnM6IFtdXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS51bmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IFtbSUQsIGluc3RhbmNlLmlkXV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL2RlbGV0ZScsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUubGlua1JlZmVyZW5jZSA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lID09ICdBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZXMgPSBpbnN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBpbnN0YW5jZXNbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJTkRFWF9NMk0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZnMgPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykuZGlmZmVyZW5jZShMYXp5KElOREVYX00yTVtpbmRleE5hbWVdWzBdLmdldCh0aGlzLmlkKSkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBvbW9kZWwgKyAnLycgKyBLbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlZnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkocmVmcykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtJRCwgeF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUF9QT1NUKEtsYXNzLm1vZGVsTmFtZSwgb21vZGVsICsgJ3MvcHV0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGluZGV4TmFtZSBpbiBsaW5rZXIubTJtSW5kZXgpICYmIExhenkobGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKG9tb2RlbCldKGluc3RhbmNlLmlkKSkuZmluZCh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL3B1dCcsIHtjb2xsZWN0aW9uOiBbW3RoaXMuaWQsIGluc3RhbmNlLmlkXV19KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ25ldy1tb2RlbCcsIEtsYXNzKTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbmV3LW1vZGVsLScgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICByZXR1cm4gS2xhc3M7XG4gICAgfTtcblxuICAgIHRoaXMuZ290RGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBjYWxsQmFjaykge1xuICAgICAgICAvLyByZWNlaXZlIGFsbCBkYXRhIGZyb20gZXZlcnkgZW5kIHBvaW50XG4gICAgICAgIGNvbnNvbGUuaW5mbygnZ290RGF0YScpO1xuICAgICAgICBpZiAodHlwZW9mKGRhdGEpID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGF0YSAnICsgZGF0YSArICcgcmVmdXNlZCBmcm9tIGdvdERhdGEoKScpO1xuICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNsZWFuIGRhdGEgZnJvbSByZWxhdGlvbnMgYW5kIHBlcm1pc3Npb25zIGZvciB1c2luZyBpdCBhZnRlciBtb2RlbCBwYXJzaW5nXG4gICAgICAgIGlmICgnX2V4dHJhJyBpbiBkYXRhKXsgZGVsZXRlIGRhdGEuX2V4dHJhIH1cbiAgICAgICAgdmFyIFRPT05FID0gZGF0YS5UT09ORTtcbiAgICAgICAgdmFyIFRPTUFOWSA9IGRhdGEuVE9NQU5ZO1xuICAgICAgICB2YXIgTUFOWVRPTUFOWSA9IGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgdmFyIFBFUk1JU1NJT05TID0gZGF0YS5QRVJNSVNTSU9OUztcbiAgICAgICAgdmFyIFBBID0gZGF0YS5QQTtcbiAgICAgICAgZGVsZXRlIGRhdGEuVE9PTkU7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBBO1xuICAgICAgICBpZiAoIVBBKSB7IFBBID0ge307IH1cblxuICAgICAgICAvLyBjbGVhbmluZyBmcm9tIHVzZWxlc3MgZGVsZXRlZCBkYXRhXG4gICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLmZpbHRlcihmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgcmV0dXJuICghKCdkZWxldGVkJyBpbiB2KSB8fCAoKGsgaW4gbW9kZWxDYWNoZSkpKTtcbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgnbTJtJyBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbTJtID0gZGF0YS5tMm07XG4gICAgICAgICAgICBkZWxldGUgZGF0YVsnbTJtJ107XG4gICAgICAgIH1cbiAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uIChkYXRhLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsQ2xhc3MgPSBtb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXN1bHRzICYmIChkYXRhLnJlc3VsdHMubGVuZ3RoID4gMCkgJiYgKGRhdGEucmVzdWx0c1swXS5jb25zdHJ1Y3RvciA9PSBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMYXp5KG1vZGVsQ2xhc3MuZmllbGRzT3JkZXIpLnppcCh4KS50b09iamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBMYXp5KGRhdGEucmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgdmFyIGRlbGV0ZWQgPSBkYXRhLmRlbGV0ZWQ7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBQQSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgTVBBID0gUEFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShyZXN1bHRzKS5lYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmQuaWQgaW4gTVBBKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShNUEFbcmVjb3JkLmlkXSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGluZGV4aW5nIHJlZmVyZW5jZXMgYnkgaXRzIElEXG4gICAgICAgICAgICAgICAgdmFyIGl0YWIgPSBnZXRJbmRleChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZSA9IGl0YWIuc291cmNlO1xuXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGVkLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGFibGVbeF07XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuLypcbiAgICAgICAgICAgICAgICBMYXp5KGRlbGV0ZWQpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgIH0pO1xuKi9cbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gcmVzdWx0cy5pbmRleEJ5KCdpZCcpLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgdmFyIGlrID0gTGF6eShpZHgpLmtleXMoKTtcbiAgICAgICAgICAgICAgICB2YXIgbm5ldyA9IGlrLmRpZmZlcmVuY2UoaXRhYi5rZXlzKCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh4KVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB2YXIgdXBkYXRlZCA9IGlrLmRpZmZlcmVuY2Uobm5ldyk7XG4gICAgICAgICAgICAgICAgLy8gcmVtb3Zpbmcgb2xkIGlkZW50aWNhbCB2YWx1ZXNcbiAgICAgICAgICAgICAgICB1cGRhdGVkID0gdXBkYXRlZC5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICF1dGlscy5zYW1lQXMoaWR4W3hdLCB0YWJsZVt4XS5hc1JhdygpKTtcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy8gY2xhc3NpZnkgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIHZhciBwZXJtcyA9IGRhdGEucGVybWlzc2lvbnMgPyBMYXp5KGRhdGEucGVybWlzc2lvbnMpIDogTGF6eSh7fSk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld09iamVjdHMgPSBubmV3Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IG1vZGVsQ2xhc3MoaWR4W3hdLCBwZXJtcy5nZXQoeCkpXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLy8vIGNsYXNzaWZ5aW5nIHVwZGF0ZWRcbiAgICAgICAgICAgICAgICAvL3ZhciB1cGRhdGVkT2JqZWN0cyA9IHVwZGF0ZWQubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBuZXcgbW9kZWxDbGFzcyhpZHguZ2V0KHgpLHBlcm1zLmdldCh4KSl9KTtcbiAgICAgICAgICAgICAgICAvL3ZhciB1byA9IHVwZGF0ZWRPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvL3VwZGF0ZWRPYmplY3RzID0gTGF6eSh1bykubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBbeCx0YWJsZVt4LmlkXV19KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRpbmcgc2luZ2xlIG9iamVjdHNcbiAgICAgICAgICAgICAgICB2YXIgY2hhbmdlZCA9IFtdO1xuLy8gICAgICAgICAgICAgICAgdmFyIERBVEVGSUVMRFMgPSBNT0RFTF9EQVRFRklFTERTW21vZGVsTmFtZV07XG4vLyAgICAgICAgICAgICAgICB2YXIgQk9PTEZJRUxEUyA9IE1PREVMX0JPT0xGSUVMRFNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB2YXIgbW9kZWxSZWZlcmVuY2VzID0gTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5tYXAoZnVuY3Rpb24oaykgeyByZXR1cm4gW2ssMV19KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQuZm9yRWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSXRlbSA9IHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ29weSA9IG9sZEl0ZW0uY29weSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3SXRlbSA9IGlkeC5nZXQoeCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGluZyBlYWNoIGF0dHJpYnV0ZSBzaW5ndWxhcmx5XG5cbiAgICAgICAgICAgICAgICAgICAgTGF6eShtb2RlbC5maWVsZHMpLmVhY2goZnVuY3Rpb24oZmllbGQsIGZpZWxkTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGZpZWxkLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdyZWZlcmVuY2UnIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtWydfJyArIGZpZWxkTmFtZV0gPSBuZXdJdGVtW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5hTiBpcyBjb252bnRpb25hbGx5IGEgY2FjaGUgZGVsZXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtW2ZpZWxkTmFtZV0gPSBOYU47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdkYXRlJzoge29sZEl0ZW1bZmllbGROYW1lXSA9IG5ldyBEYXRlKG5ld0l0ZW1bZmllbGROYW1lXSAqIDEwMDApOyBicmVha307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGF0ZXRpbWUnOiB7b2xkSXRlbVtmaWVsZE5hbWVdID0gbmV3IERhdGUobmV3SXRlbVtmaWVsZE5hbWVdICogMTAwMCk7IGJyZWFrfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJyA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChuZXdJdGVtW2ZpZWxkTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgbnVsbCA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gbnVsbDsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdUJyA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gdHJ1ZTsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdGJyA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gZmFsc2U7IGJyZWFrOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0cnVlIDogeyBvbGRJdGVtW2ZpZWxkTmFtZV0gPSB0cnVlOyBicmVhazsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgZmFsc2UgOiB7IG9sZEl0ZW1bZmllbGROYW1lXSA9IGZhbHNlOyBicmVhazsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHtvbGRJdGVtW2ZpZWxkTmFtZV0gPSBuZXdJdGVtW2ZpZWxkTmFtZV19XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICAgICAgICAgIG9sZEl0ZW1bZmllbGROYW1lXSA9IG5ld0l0ZW1bZmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChbbmV3SXRlbSwgb2xkQ29weV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBzZW5kaW5nIHNpZ25hbCBmb3IgdXBkYXRlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAoY2hhbmdlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgndXBkYXRlZC0nICsgbW9kZWxOYW1lLCBjaGFuZ2VkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8qKioqKioqKiBVcGRhdGUgdW5pdmVyc2UgKioqKioqKipcbiAgICAgICAgICAgICAgICB2YXIgbm8gPSBuZXdPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KG5vKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRhYmxlW3guaWRdID0geFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHJlYnVsZGluZyByZXZlcnNlIGluZGV4ZXNcbiAgICAgICAgICAgICAgICBMYXp5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXS5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgICAgICAgICAgUkVWSURYW21vZGVsTmFtZSArICcuJyArIHJlZl0gPSBJREJbbW9kZWxOYW1lXS5ncm91cEJ5KCdfJyArIHJlZik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIG5ldyB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAobm8ubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCduZXctJyArIG1vZGVsTmFtZSwgTGF6eShubyksIGRhdGEudG90YWxSZXN1bHRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdkZWxldGVkLScgKyBtb2RlbE5hbWUsIGRlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgZGF0YSBhcnJpdmVkXG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtJyArIG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbi8qICAgICAgICBcbiAgICAgICAgaWYgKFRPT05FKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUT09ORScpO1xuICAgICAgICAgICAgTGF6eShUT09ORSkuZWFjaChmdW5jdGlvbiAodmFscywgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgdWR4ID0gZ2V0VW5saW5rZWQobW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChUT01BTlkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RPTUFOWScpO1xuICAgICAgICAgICAgTGF6eShUT01BTlkpLmVhY2goZnVuY3Rpb24gKHZhbHMsIGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBBU0tFRF9VTkxJTktFRCkpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfVU5MSU5LRURbaW5kZXhOYW1lXSA9IExhenkoW10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBMYXp5KHZhbHMpLmVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX1VOTElOS0VEW2luZGV4TmFtZV0uc291cmNlLnB1c2goaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE1BTllUT01BTlkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ01BTllUT01BTlknKTtcbiAgICAgICAgICAgIExhenkoTUFOWVRPTUFOWSkuZWFjaChmdW5jdGlvbiAodmFscywgaW5kZXhOYW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcGFyc2VJbnQoaW5kZXhOYW1lLnNwbGl0KCd8JylbMV0pO1xuICAgICAgICAgICAgICAgIGluZGV4TmFtZSA9IGluZGV4TmFtZS5zcGxpdCgnfCcpWzBdO1xuICAgICAgICAgICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBBU0tFRF9NMk0pKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX00yTVtpbmRleE5hbWVdID0gW3t9LCB7fV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBNSURYID0gQVNLRURfTTJNW2luZGV4TmFtZV1bZmlyc3RdO1xuICAgICAgICAgICAgICAgIExhenkodmFscykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBNSURYW3ggKyAnJ10gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBNSURYW3hdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICBcbiovXG4gICAgICAgIGlmIChtMm0pIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdE0yTShtMm0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChQRVJNSVNTSU9OUykge1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoUEVSTUlTU0lPTlMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdnb3QtZGF0YScpO1xuICAgIH07XG4gICAgdGhpcy5nb3RQZXJtaXNzaW9ucyA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbiAodiwgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBMYXp5KHZbMF0pLmVhY2goZnVuY3Rpb24gKHJvdywgaWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoKHJlc291cmNlTmFtZSBpbiBJREIpICYmIChpZCBpbiBJREJbcmVzb3VyY2VOYW1lXS5zb3VyY2UpKXtcbiAgICAgICAgICAgICAgICAgICAgSURCW3Jlc291cmNlTmFtZV0uZ2V0KGlkKS5fcGVybWlzc2lvbnMgPSBMYXp5KHJvdykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHRydWVdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoTGF6eSh2WzBdKS5zaXplKCkpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3VwZGF0ZS1wZXJtaXNzaW9ucy0nICsgcmVzb3VyY2VOYW1lLCBMYXp5KHZbMF0pLmtleXMoKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMnKTtcbiAgICB9O1xuXG5cbiAgICB0aGlzLmdvdE0yTSA9IGZ1bmN0aW9uKG0ybSl7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICB2YXIgbTJtSW5kZXggPSBsaW5rZXIubTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbihtKXtcbiAgICAgICAgICAgICAgICBMYXp5KG0pLmVhY2goZnVuY3Rpb24oZGF0YSx2ZXJiKXtcbiAgICAgICAgICAgICAgICAgICAgbTJtSW5kZXhbdmVyYl0oZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLW0ybScpO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmZldGNoID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spIHsgIC8vXG4gICAgICAgIC8vIGlmIGEgY29ubmVjdGlvbiBpcyBjdXJyZW50bHkgcnVubmluZywgd2FpdCBmb3IgY29ubmVjdGlvbi5cbiAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpe1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spO1xuICAgICAgICAgICAgfSw1MDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZmV0Y2hpbmcgYXN5bmNocm9tb3VzIG1vZGVsIGZyb20gc2VydmVyXG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIChmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgICAgICAgICAgLy8gaWYgZGF0YSBjYW1lcyBmcm9tIHJlYWx0aW1lIGNvbm5lY3Rpb25cbiAgICAgICAgICAgICAgICBpZiAoVzJQUkVTT1VSQ0UuY29ubmVjdGlvbi5jYWNoZWRTdGF0dXMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBnZXR0aW5nIGZpbHRlciBmaWx0ZXJlZCBieSBjYWNoaW5nIHN5c3RlbVxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXIgPSBsaXN0Q2FjaGUuZmlsdGVyKG1vZGVsLGZpbHRlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgc29tdGhpbmcgaXMgbWlzc2luZyBvbiBteSBsb2NhbCBEQiBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbHRlcil7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhc2sgZm9yIG1pc3NpbmdzIGFuZCBwYXJzZSBzZXJ2ZXIgcmVzcG9uc2UgaW4gb3JkZXIgdG8gZW5yaWNoIG15IGxvY2FsIERCLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGxhY2luZyBsb2NrIGZvciB0aGlzIG1vZGVsXG4gICAgICAgICAgICAgICAgICAgICAgICB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChtb2RlbE5hbWUgKyAnL2xpc3QnLCB7ZmlsdGVyIDogZmlsdGVyfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShkYXRhLGNhbGxCYWNrKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWxlYXNlIGxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHJldCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgbG9ja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2xpc3QnLCBzZW5kRGF0YSxmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdPVF9BTEwuc291cmNlLnB1c2gobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShkYXRhLCBjYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmdldCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzLCBjYWxsQmFjayl7XG4gICAgICAgIC8vIHNlYXJjaCBvYmplY3RzIGZyb20gSURCLiBJZiBzb21lIGlkIGlzIG1pc3NpbmcsIGl0IHJlc29sdmUgaXQgYnkgdGhlIHNlcnZlclxuICAgICAgICAvLyBpZiBhIHJlcXVlc3QgdG8gdGhlIHNhbWUgbW9kZWwgaXMgcGVuZGluZywgd2FpdCBmb3IgaXRzIGNvbXBsZXRpb25cbiAgICAgICAgXG4gICAgICAgIGlmIChpZHMuY29uc3RydWN0b3IgIT09IEFycmF5KXtcbiAgICAgICAgICAgIGlkcyA9IFtpZHNdO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIHNvbWUgZW50aXR5IGlzIG1pc3NpbmcgXG4gICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSAsIHtpZDogaWRzfSwgbnVsbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgdmFyIGl0YWIgPSBJREJbbW9kZWxOYW1lXVxuICAgICAgICAgICAgZm9yICh2YXIgaWQgaW4gaWRzKXtcbiAgICAgICAgICAgICAgICByZXQucHVzaChpdGFiLnNvdXJjZVtpZHNbaWRdXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsQmFjayhyZXQpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5nb3RNb2RlbCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGZvciAodmFyIG1vZGVsTmFtZSBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSBkYXRhW21vZGVsTmFtZV07XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2VbJ2Rlc2NyaXB0aW9uOicgKyBtb2RlbE5hbWVdID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBtb2RlbENhY2hlW21vZGVsTmFtZV0gPSBtYWtlTW9kZWxDbGFzcyhtb2RlbCk7XG4gICAgICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gSURCKSkge1xuICAgICAgICAgICAgICAgIElEQlttb2RlbE5hbWVdID0gTGF6eSh7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5kZXNjcmliZSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgY2FsbEJhY2spe1xuICAgICAgICB2YXIgcmV0ID0gbW9kZWxDYWNoZVttb2RlbE5hbWVdO1xuICAgICAgICBpZiAocmV0KSB7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhyZXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHdhaXRpbmdDb25uZWN0aW9ucykpe1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gZmFpbGVkTW9kZWxzKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBjYWNoZUtleSA9ICdkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChjYWNoZUtleSBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nb3RNb2RlbChKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVtjYWNoZUtleV0pKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sobW9kZWxDYWNoZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9kZXNjcmliZScsbnVsbCwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RNb2RlbChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbE5vdEZvdW5kLmhhbmRsZShtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbGVkTW9kZWxzW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGNvbm5lY3Rpb25cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gICAgICAgIFxuICAgIH07XG4gICAgdGhpcy5hZGRNb2RlbEhhbmRsZXIgPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBkZWNvcmF0b3IpIHtcbiAgICAgICAgdmFyIGtleSA9IHV0aWxzLmhhc2goZGVjb3JhdG9yKTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVycykpIGJ1aWxkZXJIYW5kbGVyc1ttb2RlbE5hbWVdID0gbmV3IEhhbmRsZXIoKTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVyVXNlZCkpIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdID0ge307XG4gICAgICAgIGlmIChrZXkgaW4gYnVpbGRlckhhbmRsZXJVc2VkW21vZGVsTmFtZV0pe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVpbGRlckhhbmRsZXJVc2VkW21vZGVsTmFtZV1ba2V5XSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBtb2RlbENhY2hlKSB7XG4gICAgICAgICAgICBkZWNvcmF0b3IobW9kZWxDYWNoZVttb2RlbE5hbWVdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyc1ttb2RlbE5hbWVdLmFkZEhhbmRsZXIoZGVjb3JhdG9yKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgYXR0cmlidXRlcyl7XG4gICAgICAgIHZhciBhZGRQcm9wZXJ0eSA9IGZ1bmN0aW9uKG1vZGVsLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgYXR0cmlidXRlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbCl7XG4gICAgICAgICAgICB2YXIga2V5ID0gJ3BBOicgKyBtb2RlbC5tb2RlbE5hbWUgKyAnOicgKyB2YWw7XG4gICAgICAgICAgICB2YXIga2F0dHIgPSAnX18nICsgdmFsO1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG1vZGVsLnByb3RvdHlwZSwgdmFsLCB7XG4gICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIShrYXR0ciBpbiB0aGlzKSl7XG4gICAgICAgICAgICAgICAgICB2YXIgdiA9IGxvY2FsU3RvcmFnZVtrZXkgKyB0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICAgIHRoaXNba2F0dHJdID0gdj9KU09OLnBhcnNlKHYpOm51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW2thdHRyXTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgICAgICAgICAgdGhpc1trYXR0cl0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Vba2V5ICsgdGhpcy5pZF0gPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gcGVyc2lzdGVudEF0dHJpYnV0ZXMpKSB7IHBlcnNpc3RlbnRBdHRyaWJ1dGVzW21vZGVsTmFtZV0gPSBbXTsgfVxuICAgICAgICB2YXIgYXR0cnMgPSBwZXJzaXN0ZW50QXR0cmlidXRlc1ttb2RlbE5hbWVdO1xuICAgICAgICBpZiAoYXR0cmlidXRlcykge1xuICAgICAgICAgICAgdmFyIG5ld0F0dHJzID0gTGF6eShhdHRyaWJ1dGVzKS5kaWZmZXJlbmNlKGF0dHJzKS50b0FycmF5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3QXR0cnMgPSBhdHRycztcbiAgICAgICAgfVxuICAgICAgICBpZiAobmV3QXR0cnMubGVuZ3RoKXtcbiAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gbW9kZWxDYWNoZSl7XG4gICAgICAgICAgICAgICAgYWRkUHJvcGVydHkobW9kZWxDYWNoZVttb2RlbE5hbWVdLCBuZXdBdHRycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlcyl7XG4gICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoYXR0cnMsbmV3QXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLm9uKCduZXctbW9kZWwnLCBmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgIGlmIChtb2RlbC5tb2RlbE5hbWUgaW4gYnVpbGRlckhhbmRsZXJzKXtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyc1ttb2RlbC5tb2RlbE5hbWVdLmhhbmRsZShtb2RlbENhY2hlW21vZGVsLm1vZGVsTmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbC5tb2RlbE5hbWUgaW4gcGVyc2lzdGVudEF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMobW9kZWwubW9kZWxOYW1lKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5xdWVyeSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spe1xuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdGhpcy5kZXNjcmliZShtb2RlbE5hbWUsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgLy8gYXJyYXlmaXkgYWxsIGZpbHRlciB2YWx1ZXNcbiAgICAgICAgICAgIGZpbHRlciA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odixrKXsgcmV0dXJuIFtrLEFycmF5LmlzQXJyYXkodik/djpbdl1dfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgIHZhciBmaWx0ZXJGdW5jdGlvbiA9IHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICB2YXIgaWR4ID0gZ2V0SW5kZXgobW9kZWxOYW1lKTtcbiAgICAgICAgICAgIHRocy5mZXRjaChtb2RlbE5hbWUsZmlsdGVyLHRvZ2V0aGVyLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhpZHguZmlsdGVyKGZpbHRlckZ1bmN0aW9uKS52YWx1ZXMoKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzLCBjYWxsQmFjayl7XG4gICAgICAgIHJldHVybiB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVsZXRlJywgeyBpZCA6IGlkc30sIGNhbGxCYWNrKTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb25uZWN0ID0gZnVuY3Rpb24gKGNhbGxCYWNrKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbm5lY3Rpb24uaXNMb2dnZWRJbikge1xuICAgICAgICAgICAgY2FsbEJhY2soKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5jb25uZWN0KGNhbGxCYWNrKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmZ1bmN0aW9uIHJlV2hlZWxPUk0oZW5kUG9pbnQsIGxvZ2luRnVuYyl7XG4gICAgdGhpcy4kb3JtID0gbmV3IGJhc2VPUk0obmV3IHV0aWxzLnJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBsb2dpbkZ1bmMpLHRoaXMpO1xuICAgIHRoaXMub24gPSB0aGlzLiRvcm0ub24uYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuZW1pdCA9IHRoaXMuJG9ybS5lbWl0LmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLnVuYmluZCA9IHRoaXMuJG9ybS51bmJpbmQuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMub25jZSA9IHRoaXMuJG9ybS5vbmNlO1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gdGhpcy4kb3JtLmFkZE1vZGVsSGFuZGxlci5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyA9IHRoaXMuJG9ybS5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcy5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy51dGlscyA9IHV0aWxzO1xuICAgIHRoaXMubG9nb3V0ID0gdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9nb3V0LmJpbmQodGhpcy4kb3JtLmNvbm5lY3Rpb24pO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXMuJG9ybS5jb25uZWN0aW9uO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoZnVuY3Rpb24oY2FsbEJhY2sscmVqZWN0KXtcbiAgICAgICAgY29ubmVjdGlvbi5jb25uZWN0KGNhbGxCYWNrKTtcbiAgICB9KSk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9naW4odXNlcm5hbWUsIHBhc3N3b3JkLCBhY2NlcHQpOyAgICBcbiAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICBcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ291dCA9IGZ1bmN0aW9uKHVybCl7XG4gICAgcmV0dXJuIHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ291dCgpO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRNb2RlbCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5kZXNjcmliZShtb2RlbE5hbWUsYWNjZXB0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obW9kZWxOYW1lLCBpZHMpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2luZ2xlID0gZmFsc2U7XG4gICAgdmFyIG1vZE5hbWUgPSBtb2RlbE5hbWU7XG4gICAgdmFyIGZpbHRlcjtcbiAgICBpZiAodHlwZW9mIGlkcyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgc2luZ2xlID0gdHJ1ZTtcbiAgICAgICAgZmlsdGVyID0geyBpZCA6IFtpZHNdfTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaWRzKSl7XG4gICAgICAgIGZpbHRlciA9IHsgaWQgOiBpZHMgfTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBpZHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGZpbHRlciA9IGlkcztcbiAgICB9IGVsc2UgaWYgKGlkcyA9PT0gbnVsbCkge1xuICAgICAgICBmaWx0ZXIgPSB7fTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIG51bGwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNpbmdsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KGRhdGEubGVuZ3RoID8gZGF0YVswXSA6IG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5xdWVyeSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgcmVsYXRlZCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHZhciB0b2dldGhlciA9IG51bGw7XG4gICAgICAgIGlmIChyZWxhdGVkICYmIChyZWxhdGVkLmNvbnN0cnVjdG9yID09PSBBcnJheSkgJiYgKHJlbGF0ZWQubGVuZ3RoKSl7XG4gICAgICAgICAgICB0b2dldGhlciA9IHJlbGF0ZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRlZCAmJiAocmVsYXRlZC5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKSAmJiAocmVsYXRlZC5sZW5ndGgpKXtcbiAgICAgICAgICAgIHRvZ2V0aGVyID0gcmVsYXRlZC5zcGxpdCgnLCcpO1xuICAgICAgICB9XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLnF1ZXJ5KG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuKi9cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgaWRzKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVsZXRlKG1vZGVsTmFtZSwgaWRzLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldExvZ2dlZFVzZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHRoaXMuJG9ybS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy51c2VyX2lkKVxuICAgICAgICByZXR1cm4gdGhpcy5nZXQoJ2F1dGhfdXNlcicsdGhpcy4kb3JtLmNvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnVzZXJfaWQpO1xuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3QpIHtcbiAgICAgICAgICAgIHNlbGYub25jZSgnbG9nZ2VkLWluJyxmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5nZXQoJ2F1dGhfdXNlcicsIHVzZXIpLnRoZW4oYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLiRzZW5kVG9FbmRwb2ludCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uJHBvc3QodXJsLCBkYXRhKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dpbih1c2VybmFtZSxwYXNzd29yZCk7XG59XG4iXX0=
