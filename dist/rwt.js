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
                console.info('asking (' + id + ') from ' + name);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJjb25uZWN0aW9uLmpzIiwidG91Y2hlci5qcyIsInZhY3V1bWNhY2hlci5qcyIsImF1dG9saW5rZXIuanMiLCJsaXN0Y2FjaGVyLmpzIiwibWFueXRvbWFueS5qcyIsImNhY2hlci5qcyIsIm9ybS5qcyJdLCJuYW1lcyI6WyJIYW5kbGVyIiwiaGFuZGxlcnMiLCJzdHJIYW5kbGVycyIsInByb3RvdHlwZSIsImFkZEhhbmRsZXIiLCJoYW5kbGVyIiwic3RySGFuZGxlciIsInV0aWxzIiwiaGFzaCIsInRvU3RyaW5nIiwicHVzaCIsImhhbmRsZSIsImFyZ3MiLCJBcnJheSIsInNsaWNlIiwiY2FsbCIsImFyZ3VtZW50cyIsImZvckVhY2giLCJmdW5jIiwiYXBwbHkiLCJoYW5kbGVCeSIsInRocyIsIk5hbWVkRXZlbnRNYW5hZ2VyIiwiZXZlbnRzIiwiaGFuZGxlcklkIiwiaWR4SWQiLCJvbiIsIm5hbWUiLCJpZCIsImVtaXQiLCJldmVudCIsInVuYmluZCIsImNvdW50IiwiTGF6eSIsImVhY2giLCJ2IiwiayIsImlkeCIsIm4iLCJyZXZlcnNlIiwieCIsInNwbGljZSIsIm9uY2UiLCJldmVudE5hbWUiLCJoYW5kbGVyRnVuY3Rpb24iLCJzZWxmIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsIm1vY2siLCJyZW5hbWVGdW5jdGlvbiIsImZuIiwiRnVuY3Rpb24iLCJiaW5kIiwiY2FjaGVkIiwia2V5Iiwid3JhcHBlciIsImxvZyIsImNvbnNvbGUiLCJ4ZHIiLCJ1cmwiLCJkYXRhIiwiYXBwbGljYXRpb24iLCJ0b2tlbiIsImZvcm1FbmNvZGUiLCJQcm9taXNlIiwiYWNjZXB0IiwicmVqZWN0IiwicmVxIiwiWE1MSHR0cFJlcXVlc3QiLCJvbnJlYWR5c3RhdGVjaGFuZ2UiLCJyZWFkeVN0YXRlIiwicmVzcG9uc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwicmVzcG9uc2VUZXh0IiwiYSIsInJlc3BvbnNlIiwic3RhdHVzIiwicmVxdWVzdCIsIlhEb21haW5SZXF1ZXN0Iiwib25sb2FkIiwic3RhdHVzVGV4dCIsIkVycm9yIiwib3BlbiIsIm9uZXJyb3IiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiX190b2tlbl9fIiwic2l6ZSIsInN0cmluZ2lmeSIsIm1hcCIsImVuY29kZVVSSSIsInRvQXJyYXkiLCJqb2luIiwic2VuZCIsImNhcGl0YWxpemUiLCJzIiwidG9VcHBlckNhc2UiLCJ0b0xvd2VyQ2FzZSIsInN0ciIsInJldCIsImxlbmd0aCIsImNoYXJDb2RlQXQiLCJtYWtlRmlsdGVyIiwibW9kZWwiLCJmaWx0ZXIiLCJ1bmlmaWVyIiwiZG9udFRyYW5zbGF0ZUZpbHRlciIsInNvdXJjZSIsInZhbHMiLCJmaWVsZCIsImlzQXJyYXkiLCJmaWVsZHMiLCJ0eXBlIiwiY29uc3RydWN0b3IiLCJOdW1iZXIiLCJlcnJvciIsIm9ybSIsInNhbWVBcyIsInkiLCJwbHVyYWxpemUiLCJiZWZvcmVDYWxsIiwiYmVmb3JlIiwiZGVjb3JhdG9yIiwidGhlbiIsImNsZWFuU3RvcmFnZSIsImxvY2FsU3RvcmFnZSIsImtleXMiLCJjbGVhbkRlc2NyaXB0aW9uIiwic3RhcnRzV2l0aCIsImNociIsInNwbGl0IiwicGVybXV0YXRpb25zIiwiYXJyIiwid2FpdEZvciIsImNhbGxCYWNrIiwid2FpdGVyIiwic2V0VGltZW91dCIsImJvb2wiLCJCb29sZWFuIiwibm9vcCIsInR6T2Zmc2V0IiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwidHJhbnNGaWVsZFR5cGUiLCJkYXRlIiwiZGF0ZXRpbWUiLCJzdHJpbmciLCJ0ZXh0IiwiaW50ZWdlciIsInBhcnNlSW50IiwiZmxvYXQiLCJwYXJzZUZsb2F0IiwiU1RBVFVTS0VZIiwiUmVhbHRpbWVDb25uZWN0aW9uIiwiZW5kUG9pbnQiLCJyd3RDb25uZWN0aW9uIiwiY29ubmVjdGlvbiIsIlNvY2tKUyIsIm9ub3BlbiIsInRlbmFudCIsIm9ubWVzc2FnZSIsImUiLCJvbmNsb3NlIiwid3NDb25uZWN0IiwiY2FjaGVkU3RhdHVzIiwiY2xvc2UiLCJyZVdoZWVsQ29ubmVjdGlvbiIsImdldExvZ2luIiwiZW5kc1dpdGgiLCJpc0Nvbm5lY3RlZCIsImlzTG9nZ2VkSW4iLCIkcG9zdCIsInByb21pc2UiLCJ4aHIiLCJmb3JjZSIsInN0YXR1c1dhaXRpbmciLCJ1cGRhdGVTdGF0dXMiLCJsYXN0QnVpbGQiLCJsYXN0X2J1aWxkIiwidXNlcl9pZCIsIm9sZFN0YXR1cyIsImxvZ2luSW5mbyIsIk9iamVjdCIsImxvZ2luIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsIm9iaiIsInJlYWx0aW1lRW5kUG9pbnQiLCJ3c0Nvbm5lY3Rpb24iLCJ1c2VyaWQiLCJsb2dvdXQiLCJvayIsImNvbm5lY3QiLCJUb3VjaGVyIiwidG91Y2hlZCIsInRvdWNoIiwidCIsIlZhY3V1bUNhY2hlciIsImFza2VkIiwicGtJbmRleCIsIm1pc3NpbmciLCJhc2siLCJsYXp5IiwiY29udGFpbnMiLCJpbmZvIiwiZ2V0QXNrZWRJbmRleCIsIm1pc3NpbmdzIiwidW5pcXVlIiwiQXV0b0xpbmtlciIsImFjdGl2ZXMiLCJJREIiLCJXMlBSRVNPVVJDRSIsImxpc3RDYWNoZSIsIm1haW5JbmRleCIsImZvcmVpZ25LZXlzIiwibTJtIiwibTJtSW5kZXgiLCJwZXJtaXNzaW9ucyIsImluZGV4IiwiZ2V0SW5kZXhGb3IiLCJyZWZlcmVuY2VzIiwicmVmZXJlbmNlIiwiaW5kZXhOYW1lIiwidG8iLCJyZWZlcmVuY2VkQnkiLCJieSIsIm1hbnlUb01hbnkiLCJyZWxhdGlvbiIsIk1hbnlUb01hbnlSZWxhdGlvbiIsIm0ybUdldCIsImNvbGxlY3Rpb24iLCJnb3REYXRhIiwiZ2V0TTJNIiwibGlua1VubGlua2VkIiwidmFsdWVzIiwic3VtIiwiY2hhbmdlZCIsImluZGV4ZXMiLCJJTkRFWCIsImdldHRlciIsImlkcyIsIm90aGVySW5kZXgiLCJkZXNjcmliZSIsImZsYXR0ZW4iLCJtb2RlbE5hbWUiLCJpZGIiLCJmZXRjaCIsIm1haW5SZXNvdXJjZSIsImZpZWxkTmFtZSIsInRvT2JqZWN0IiwicmVzb3VyY2VOYW1lIiwiZ290UGVybWlzc2lvbnMiLCJQRVJNSVNTSU9OUyIsInNldEludGVydmFsIiwiTGlzdENhY2hlciIsImdvdEFsbCIsImNvbXBvc2l0ZUFza2VkIiwiY2FydGVzaWFuUHJvZHVjdDEiLCJiIiwiY2FydGVzaWFuUHJvZHVjdCIsImV4cGxvZGVGaWx0ZXIiLCJwcm9kdWN0IiwiciIsImZpbHRlclNpbmdsZSIsInRlc3RPbmx5IiwiZGlmZmVyZW5jZSIsImNsZWFuQ29tcG9zaXRlcyIsImZpbHRlckxlbiIsIml0ZW1zIiwiaXRlbSIsImdvdCIsInNpbmdsZSIsInNvbWUiLCJmIiwiZXhwbG9kZWQiLCJwYXJ0aWFscyIsImJhZCIsInBsdWNrIiwiYWRkIiwiZmluZCIsImdldDAiLCJnZXQxIiwiZGVsIiwibCIsImNhY2hlZFByb3BlcnR5QnlFdmVudHMiLCJwcm90byIsInByb3BlcnR5TmFtZSIsInNldHRlciIsInJlc3VsdCIsInByb3BlcnR5RGVmIiwidmFsdWUiLCJpc0Zpbml0ZSIsImRlZmluZVByb3BlcnR5IiwiVmFsaWRhdGlvbkVycm9yIiwicmVzb3VyY2UiLCJfcmVzb3VyY2UiLCJmb3JtSWR4IiwiZXJyb3JzIiwiYmFzZU9STSIsIm9wdGlvbnMiLCJleHRPUk0iLCJTdHJpbmciLCJjb25uZWN0ZWQiLCJ3cyIsIm9uTWVzc2FnZUpzb24iLCJvbk1lc3NhZ2VUZXh0IiwibWVzc2FnZSIsInNlbnREYXRhIiwid2FpdGluZ0Nvbm5lY3Rpb25zIiwiYXV0aF9ncm91cCIsIklEWCIsIlJFVklEWCIsImJ1aWxkZXJIYW5kbGVycyIsImJ1aWxkZXJIYW5kbGVyVXNlZCIsInBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiZXZlbnRIYW5kbGVycyIsInBlcm1pc3Npb25XYWl0aW5nIiwibW9kZWxDYWNoZSIsImZhaWxlZE1vZGVscyIsImxpbmtlciIsIndpbmRvdyIsInZhbGlkYXRpb25FdmVudCIsImN1cnJlbnRDb250ZXh0Iiwic2F2aW5nRXJyb3JIYW5sZGVyIiwiZ2V0SW5kZXgiLCJnZXRVbmxpbmtlZCIsIlVOTElOS0VEIiwiUGVybWlzc2lvblRhYmxlIiwia2xhc3MiLCJzYXZlIiwiY2IiLCJteVBlcm1zIiwiZ3JvdXBfaWQiLCJwZXJtaXNzaW9uTGlzdCIsInAiLCJwZXJtcyIsImFsbFBlcm1pc3Npb25zIiwiaW5kZXhPZiIsIm1ha2VNb2RlbENsYXNzIiwiX21vZGVsIiwicmVhZGFibGUiLCJ3cml0YWJsZSIsInByaXZhdGVBcmdzIiwibWVyZ2UiLCJmdW5jU3RyaW5nIiwiS2xhc3MiLCJyZWZfdHJhbnNsYXRpb25zIiwiaW52ZXJzZV9yZWZlcmVuY2VzIiwicmVmZXJlbnRzIiwiZmllbGRzT3JkZXIiLCJmaWVsZE9yZGVyIiwicmVwcmVzZW50YXRpb24iLCJkZWxldGUiLCJfcGVybWlzc2lvbnMiLCJhbGxfcGVybXMiLCJvYmplY3RfaWQiLCJncm91cGVkIiwidW5rbm93bl9ncm91cHMiLCJncm91cEJ5IiwibyIsImFzUmF3IiwiSUQiLCJhcmciLCJjb250ZXh0IiwiY29weSIsImFzciIsImNvbmNhdCIsInNhdmVNdWx0aSIsIm9iamVjdHMiLCJzY29wZSIsInJhdyIsImRlbGV0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsInNhdmVQQSIsIlQiLCJvbyIsIlBBIiwiRnMiLCJmaWVsZElkeCIsInRhcCIsImluZGV4QnkiLCJ3aWRnZXQiLCJyZWYiLCJleHRfcmVmIiwibG9jYWxfcmVmIiwid2FybiIsIlR5cGVFcnJvciIsInJldkluZGV4IiwiaGFzT3duUHJvcGVydHkiLCJvcHRzIiwiZmlyc3QiLCJvbW9kZWxOYW1lIiwidmFsaWRhdG9ycyIsInVubGlua1JlZmVyZW5jZSIsImluc3RhbmNlIiwiaW5zdGFuY2VzIiwib21vZGVsIiwibGlua1JlZmVyZW5jZSIsInJlZnMiLCJJTkRFWF9NMk0iLCJXMlBfUE9TVCIsIl9leHRyYSIsIlRPT05FIiwiVE9NQU5ZIiwiTUFOWVRPTUFOWSIsIm1vZGVsQ2xhc3MiLCJ6aXAiLCJkZWxldGVkIiwiTVBBIiwicmVjb3JkIiwiaXRhYiIsInRhYmxlIiwiaWsiLCJubmV3IiwidXBkYXRlZCIsIm5ld09iamVjdHMiLCJtb2RlbFJlZmVyZW5jZXMiLCJvbGRJdGVtIiwib2xkQ29weSIsIm5ld0l0ZW0iLCJOYU4iLCJubyIsInRvdGFsUmVzdWx0cyIsImdvdE0yTSIsInJvdyIsIm0iLCJ2ZXJiIiwidG9nZXRoZXIiLCJzZW5kRGF0YSIsIkdPVF9BTEwiLCJnb3RNb2RlbCIsImNhY2hlS2V5IiwibW9kZWxOb3RGb3VuZCIsImFkZE1vZGVsSGFuZGxlciIsImFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiYXR0cmlidXRlcyIsImFkZFByb3BlcnR5IiwidmFsIiwia2F0dHIiLCJzZXQiLCJhdHRycyIsIm5ld0F0dHJzIiwicXVlcnkiLCJmaWx0ZXJGdW5jdGlvbiIsInJlV2hlZWxPUk0iLCJsb2dpbkZ1bmMiLCIkb3JtIiwiZ2V0TW9kZWwiLCJtb2ROYW1lIiwiZ2V0TG9nZ2VkVXNlciIsInVzZXIiLCIkc2VuZFRvRW5kcG9pbnQiXSwibWFwcGluZ3MiOiI7OztJQUFBLGE7SUFFQSxTQUFBQSxPQUFBLEdBQUE7QUFBQSxRQUNBLEtBQUFDLFFBQUEsR0FBQSxFQUFBLENBREE7QUFBQSxRQUVBLEtBQUFDLFdBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxLO0lBR0EsQztJQUVBRixPQUFBLENBQUFHLFNBQUEsQ0FBQUMsVUFBQSxHQUFBLFVBQUFDLE9BQUEsRUFBQTtBQUFBLFFBQ0EsSUFBQUMsVUFBQSxHQUFBQyxLQUFBLENBQUFDLElBQUEsQ0FBQUgsT0FBQSxDQUFBSSxRQUFBLEVBQUEsQ0FBQSxDQURBO0FBQUEsUUFFQSxJQUFBLENBQUEsQ0FBQUgsVUFBQSxJQUFBLEtBQUFKLFdBQUEsQ0FBQSxFQUFBO0FBQUEsWUFDQSxLQUFBQSxXQUFBLENBQUFJLFVBQUEsSUFBQUQsT0FBQSxDQURBO0FBQUEsWUFFQSxLQUFBSixRQUFBLENBQUFTLElBQUEsQ0FBQUwsT0FBQSxFQUZBO0FBQUEsU0FGQTtBQUFBLEtBQUEsQztJQU9BTCxPQUFBLENBQUFHLFNBQUEsQ0FBQVEsTUFBQSxHQUFBLFlBQUE7QUFBQSxRQUNBLElBQUFDLElBQUEsR0FBQUMsS0FBQSxDQUFBVixTQUFBLENBQUFXLEtBQUEsQ0FBQUMsSUFBQSxDQUFBQyxTQUFBLEVBQUEsQ0FBQSxDQUFBLENBREE7QUFBQSxRQUVBLEtBQUFmLFFBQUEsQ0FBQWdCLE9BQUEsQ0FBQSxVQUFBQyxJQUFBLEVBQUE7QUFBQSxZQUNBQSxJQUFBLENBQUFDLEtBQUEsQ0FBQSxJQUFBLEVBQUFQLElBQUEsRUFEQTtBQUFBLFNBQUEsRUFGQTtBQUFBLEtBQUEsQztJQU1BWixPQUFBLENBQUFHLFNBQUEsQ0FBQWlCLFFBQUEsR0FBQSxZQUFBO0FBQUEsUUFDQSxJQUFBUixJQUFBLEdBQUFDLEtBQUEsQ0FBQVYsU0FBQSxDQUFBVyxLQUFBLENBQUFDLElBQUEsQ0FBQUMsU0FBQSxFQUFBLENBQUEsQ0FBQSxDQURBO0FBQUEsUUFFQSxJQUFBSyxHQUFBLEdBQUFMLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FGQTtBQUFBLFFBR0EsS0FBQWYsUUFBQSxDQUFBZ0IsT0FBQSxDQUFBLFVBQUFDLElBQUEsRUFBQTtBQUFBLFlBQ0FBLElBQUEsQ0FBQUMsS0FBQSxDQUFBRSxHQUFBLEVBQUFULElBQUEsRUFEQTtBQUFBLFNBQUEsRUFIQTtBQUFBLEtBQUEsQztJQVNBLFNBQUFVLGlCQUFBLEdBQUE7QUFBQSxRQUNBLElBQUFDLE1BQUEsR0FBQSxFQUFBLENBREE7QUFBQSxRQUVBLElBQUFDLFNBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxRQUdBLElBQUFDLEtBQUEsR0FBQSxDQUFBLENBSEE7QUFBQSxRQUlBLEtBQUFDLEVBQUEsR0FBQSxVQUFBQyxJQUFBLEVBQUFULElBQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQSxDQUFB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VUFBQW1hLElBQUEsRUFBQTtBQUFBLG9CQUNBaGEsSUFBQSxDQUFBSyxHQUFBLENBQUEsV0FBQSxFQUFBMlosSUFBQSxFQUFBOVUsSUFBQSxDQUFBMUQsTUFBQSxFQURBO0FBQUEsaUJBQUEsRUFEQTtBQUFBLGFBQUEsQ0FBQSxDQURBO0FBQUEsU0FKQTtBQUFBLEtBQUEsQztJQWFBa1ksVUFBQSxDQUFBcGMsU0FBQSxDQUFBMmMsZUFBQSxHQUFBLFVBQUEvWSxHQUFBLEVBQUFDLElBQUEsRUFBQTtBQUFBLFFBQ0EsT0FBQSxLQUFBeVksSUFBQSxDQUFBMVIsS0FBQSxDQUFBaEgsR0FBQSxFQUFBQyxJQUFBLENBQUEsQ0FEQTtBQUFBLEtBQUEsQztJQUlBdVksVUFBQSxDQUFBcGMsU0FBQSxDQUFBd0wsS0FBQSxHQUFBLFVBQUFDLFFBQUEsRUFBQUMsUUFBQSxFQUFBO0FBQUEsUUFDQSxPQUFBLEtBQUE0USxJQUFBLENBQUF6UyxVQUFBLENBQUEyQixLQUFBLENBQUFDLFFBQUEsRUFBQUMsUUFBQSxDQUFBLENBREE7QUFBQSxLQUFBLEMiLCJmaWxlIjoicnd0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBIYW5kbGVyKCl7XG4gICAgdGhpcy5oYW5kbGVycyA9IFtdO1xuICAgIHRoaXMuc3RySGFuZGxlcnMgPSB7fTtcbn07XG5cbkhhbmRsZXIucHJvdG90eXBlLmFkZEhhbmRsZXIgPSBmdW5jdGlvbiAoaGFuZGxlcil7XG4gICAgdmFyIHN0ckhhbmRsZXIgPSB1dGlscy5oYXNoKGhhbmRsZXIudG9TdHJpbmcoKSk7XG4gICAgaWYgKCEoc3RySGFuZGxlciBpbiB0aGlzLnN0ckhhbmRsZXJzKSl7XG4gICAgICAgIHRoaXMuc3RySGFuZGxlcnNbc3RySGFuZGxlcl0gPSBoYW5kbGVyO1xuICAgICAgICB0aGlzLmhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfVxufTtcbkhhbmRsZXIucHJvdG90eXBlLmhhbmRsZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMCk7XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KG51bGwsYXJncyk7XG4gICAgfSlcbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGVCeSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSk7XG4gICAgdmFyIHRocyA9IGFyZ3VtZW50c1swXTtcbiAgICB0aGlzLmhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oZnVuYyl7XG4gICAgICAgIGZ1bmMuYXBwbHkodGhzLGFyZ3MpO1xuICAgIH0pXG59O1xuXG5cbmZ1bmN0aW9uIE5hbWVkRXZlbnRNYW5hZ2VyICgpe1xuICAgIHZhciBldmVudHMgPSB7fTtcbiAgICB2YXIgaGFuZGxlcklkID0ge307XG4gICAgdmFyIGlkeElkID0gMDtcbiAgICB0aGlzLm9uID0gZnVuY3Rpb24obmFtZSwgZnVuYyl7XG4gICAgICAgIGlmICghKG5hbWUgaW4gZXZlbnRzKSl7XG4gICAgICAgICAgICBldmVudHNbbmFtZV0gPSBuZXcgQXJyYXkoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWQgPSBpZHhJZCArKztcbiAgICAgICAgZXZlbnRzW25hbWVdLnB1c2goZnVuYyk7XG4gICAgICAgIGhhbmRsZXJJZFtpZF0gPSBmdW5jO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfTtcbiAgICB0aGlzLmVtaXQgPSBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgaWYgKG5hbWUgaW4gZXZlbnRzKXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICAgICAgICAgIGV2ZW50LmFwcGx5KG51bGwsYXJncyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy51bmJpbmQgPSBmdW5jdGlvbihoYW5kbGVyKXtcbiAgICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgICAgaWYgKGhhbmRsZXIgaW4gaGFuZGxlcklkKXtcbiAgICAgICAgICAgIHZhciBmdW5jID0gaGFuZGxlcklkW2hhbmRsZXIgKyAnJ107XG4gICAgICAgICAgICBMYXp5KGV2ZW50cykuZWFjaChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBuIGluIHYpe1xuICAgICAgICAgICAgICAgICAgICBpZiAodltuXSA9PT0gZnVuYyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHgucHVzaChuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWR4LnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICB2LnNwbGljZSh4LDEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGhhbmRsZXJJZFtoYW5kbGVyXTtcbiAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ2FsbCBldmVudCBvbmNlXG4gICAgICovXG4gICAgdGhpcy5vbmNlID0gZnVuY3Rpb24oZXZlbnROYW1lLCBoYW5kbGVyRnVuY3Rpb24pIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgaGFuZGxlciA9IHRoaXMub24oZXZlbnROYW1lLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaGFuZGxlckZ1bmN0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBzZWxmLnVuYmluZChoYW5kbGVyKTtcbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjYWNoZWRLZXlJZHggPSAwO1xuXG52YXIgbnVsbFN0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJyd9O1xuXG5mdW5jdGlvbiBtb2NrT2JqZWN0KCl7XG4gICAgcmV0dXJuIG5ldyBQcm94eSh7fSwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBuYW1lICA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgIGlmIChuYW1lID09PSAndG9TdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsU3RyaW5nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1dGlscy5tb2NrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtuYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG59XG5cbi8qXG52YXIgJFBPU1QgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGNhbGxCYWNrLCBlcnJvckJhY2ssaGVhZGVycyl7XG4gICAgdmFyIG9wdHMgPSB7XG4gICAgICAgIGFjY2VwdHMgOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIHVybCA6IHVybCxcbiAgICAgICAgZGF0YSA6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICBkYXRhVHlwZSA6ICdqc29uJyxcbiAgICAgICAgc3VjY2VzcyA6IGNhbGxCYWNrLFxuICAgICAgICBlcnJvciA6IGVycm9yQmFjayxcbiAgICAgICAgbWV0aG9kIDogJ1BPU1QnLFxuICAgICAgICBjb250ZW50VHlwZSA6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIH07XG4gICAgaWYgKGhlYWRlcnMpe1xuICAgICAgICBvcHRzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgICAgICBvcHRzLmNyb3NzRG9tYWluID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuICQuYWpheChvcHRzKTtcbn1cblxuXG5mdW5jdGlvbiByZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgZ2V0TG9naW4pe1xuICAgIC8vIG1haW4gXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZ2V0TG9naW4gPSBnZXRMb2dpbjtcbiAgICB0aGlzLmV2ZW50cyA9IG5ldyBOYW1lZEV2ZW50TWFuYWdlcigpXG4gICAgdGhpcy4kUE9TVCA9ICRQT1NULmJpbmQodGhpcyk7XG4gICAgdGhpcy5vcHRpb25zID0ge2VuZFBvaW50IDogZW5kUG9pbnR9O1xuICAgIHRoaXMub24gPSB0aGlzLmV2ZW50cy5vbi5iaW5kKHRoaXMpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHN0YXR1cywgY2FsbEJhY2ssIGVycm9yKSB7XG4gICAgaWYgKHN0YXR1cykge1xuICAgICAgICB2YXIgaXNMb2dnZWQgPSAoc3RhdHVzLnVzZXJfaWQgJiYgIXRoaXMub3B0aW9ucy51c2VyX2lkICk7XG4gICAgICAgIGZvciAodmFyIHggaW4gc3RhdHVzKXsgdGhpcy5vcHRpb25zW3hdID0gc3RhdHVzW3hdOyB9XG4gICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgaWYgKGlzTG9nZ2VkKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50cy5lbWl0KCdsb2dpbicsIHRoaXMub3B0aW9ucy51c2VyX2lkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VyX2lkICYmIHRoaXMuZ2V0TG9naW4pe1xuICAgICAgICB2YXIgbG9nSW5mbyA9IHRoaXMuZ2V0TG9naW4oZXJyb3IpO1xuICAgICAgICBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KXtcbiAgICAgICAgICAgIHRoaXMubG9naW4obG9nSW5mby51c2VybmFtZSwgbG9nSW5mby5wYXNzd29yZClcbiAgICAgICAgICAgIC50aGVuKChmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHN0YXR1cywgY2FsbEJhY2spO1xuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH0gZWxzZSBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gUHJvbWlzZSkge1xuICAgICAgICAgICAgbG9nSW5mby50aGVuKChmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgICAgIHZhciB4ID0gdGhpcy5sb2dpbihvYmoudXNlcm5hbWUsb2JqLnBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICB2YXIgbWFuYWdlRXJyb3IgPSAoZnVuY3Rpb24oYmFkKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMobnVsbCxjYWxsQmFjayxiYWQuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pLmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKXtcbiAgICAgICAgICAgICAgICAgICAgeC50aGVuKGNhbGxCYWNrLG1hbmFnZUVycm9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB4LnRoZW4obnVsbCwgbWFuYWdlRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sodGhpcy5vcHRpb25zKTtcbiAgICB9ICAgIFxufVxuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuc3RhdHVzID0gZnVuY3Rpb24oY2FsbEJhY2ssIGZvcmNlKXtcbiAgICBpZiAoKCdsYXN0UldUU3RhdHVzJyBpbiBsb2NhbFN0b3JhZ2UpICYmICFmb3JjZSkge1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICB2YXIgc3RhdHVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhzdGF0dXMsY2FsbEJhY2spO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YXR1cyhjYWxsQmFjaywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9zdGF0dXNfY2FsbGluZyl7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuc3RhdHVzKGNhbGxCYWNrKTtcbiAgICAgICAgfSw1MCk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnRpbWVzdGFtcCl7XG4gICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHRoaXMub3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhdHVzX2NhbGxpbmcgPSB0cnVlO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiB0aGlzLiRwb3N0KCdhcGkvc3RhdHVzJyxudWxsLGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG4gICAgICAgICAgICBzZWxmLl9zdGF0dXNfY2FsbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi51cGRhdGVTdGF0dXMoc3RhdHVzLGNhbGxCYWNrKTtcbiAgICAgICAgfSk7ICAgICAgICBcbiAgICB9XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuJHBvc3QgPSBmdW5jdGlvbih1cmwsIGRhdGEsY2FsbEJhY2spe1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnRva2VuKXtcbiAgICAgICAgaWYgKCFkYXRhKXtcbiAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnRva2VuKXtcbiAgICAgICAgdmFyIGhlYWRlcnMgPSB7IFxuICAgICAgICAgICAgdG9rZW4gOiB0aGlzLm9wdGlvbnMudG9rZW4sXG4gICAgICAgICAgICBhcHBsaWNhdGlvbiA6IHRoaXMub3B0aW9ucy5hcHBsaWNhdGlvblxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBoZWFkZXJzID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLm9wdGlvbnMuZW5kUG9pbnQgKyB1cmwsIGRhdGEsIHRocy5vcHRpb25zLmFwcGxpY2F0aW9uLCB0aHMub3B0aW9ucy50b2tlbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlJywgeGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cywgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMgKyAnLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FsbEJhY2spIHsgY2FsbEJhY2soIHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCApfTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgeGhyLnN0YXR1cywgdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWpzb24tJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZURhdGEsdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWh0dHAnLHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1odHRwLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICB2YXIgdXJsID0gdGhpcy5vcHRpb25zLmVuZFBvaW50ICsgJ2FwaS9sb2dpbic7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHVybCx7IHVzZXJuYW1lOiB1c2VybmFtZSwgcGFzc3dvcmQgOiBwYXNzd29yZH0sIG51bGwsY29ubmVjdGlvbi5vcHRpb25zLnRva2VuLCB0cnVlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uLnVwZGF0ZVN0YXR1cyh4aHIucmVzcG9uc2VEYXRhKTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoc3RhdHVzKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oY2FsbEJhY2spe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgd3Njb25uZWN0ID0gZnVuY3Rpb24oc2VsZil7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uID0gbmV3IHV0aWxzLndzQ29ubmVjdChzZWxmLm9wdGlvbnMpO1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbi5vbkNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuZXZlbnRzLmVtaXQoJ3dzLWNvbm5lY3RlZCcsIHNlbGYud3NDb25uZWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uLm9uRGlzY29ubmVjdChmdW5jdGlvbigpeyBcbiAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMgJiYgc2VsZi5vcHRpb25zLnJlYWx0aW1lRW5kUG9pbnQpe1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgd3Njb25uZWN0KHNlbGYpOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9LDEwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzKChmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICBpZiAoJ3Rva2VuJyBpbiBzZWxmLm9wdGlvbnMpe1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW5nIHRvICcgKyBzZWxmLm9wdGlvbnMuZW5kUG9pbnQpO1xuICAgICAgICAgICAgaWYgKHNlbGYub3B0aW9ucy51c2VybmFtZSAmJiBzZWxmLm9wdGlvbnMucGFzc3dvcmQpe1xuICAgICAgICAgICAgICAgIHNlbGYubG9naW4oXG4gICAgICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucy51c2VybmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLnBhc3N3b3JkLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3JlbmV3aW5nIGNvbm5lY3Rpb24nKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzZWxmLm9wdGlvbnMudG9rZW4gJiYgc2VsZi5vcHRpb25zLnJlYWx0aW1lRW5kUG9pbnQgJiYgKCFzZWxmLndzQ29ubmVjdGlvbikpe1xuICAgICAgICAgICAgd3Njb25uZWN0KHNlbGYpO1xuICAgICAgICB9XG4gICAgfSkuYmluZCh0aGlzKSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9nT3V0ID0gZnVuY3Rpb24odXJsLCBjYWxsQmFjayl7XG4gICAgcmV0dXJuIHRoaXMuJHBvc3QoJ2FwaS9sb2dvdXQnLHt9LChmdW5jdGlvbihzdGF0dXMpIHtcbiAgICAgICAgaWYgKCdsYXN0UldUU3RhdHVzJyBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB7ZW5kUG9pbnQ6IHRoaXMub3B0aW9ucy5lbmRQb2ludH07XG4gICAgICAgIGlmICh0aGlzLndzQ29ubmVjdGlvbikgeyBcbiAgICAgICAgICAgIHRoaXMud3NDb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLndzQ29ubmVjdGlvbiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVybCkgeyBsb2NhdGlvbiA9IHVybDsgfVxuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgIH0pLmJpbmQodGhpcykpO1xufVxuKi9cbnZhciB1dGlscyA9IHtcbiAgICByZW5hbWVGdW5jdGlvbiA6IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICAgICAgICByZXR1cm4gKG5ldyBGdW5jdGlvbihcInJldHVybiBmdW5jdGlvbiAoY2FsbCkgeyByZXR1cm4gZnVuY3Rpb24gXCIgKyBuYW1lICtcbiAgICAgICAgICAgIFwiICgpIHsgcmV0dXJuIGNhbGwodGhpcywgYXJndW1lbnRzKSB9OyB9O1wiKSgpKShGdW5jdGlvbi5hcHBseS5iaW5kKGZuKSk7XG4gICAgfSxcbiAgICBjYWNoZWQgOiBmdW5jdGlvbihmdW5jLCBrZXkpe1xuICAgICAgICBpZiAoIWtleSl7ICAgIFxuICAgICAgICAgICAga2V5ID0gJ18nICsgY2FjaGVkS2V5SWR4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gd3JhcHBlcigpe1xuICAgICAgICAgICAgaWYgKCF0aGlzW2tleV0pe1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IGZ1bmMuY2FsbCh0aGlzLFthcmd1bWVudHNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzW2tleV07XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB3cmFwcGVyO1xuICAgIH0sXG4vLyAgICAkUE9TVCA6ICRQT1NULFxuLy8gICAgcmVXaGVlbENvbm5lY3Rpb246IHJlV2hlZWxDb25uZWN0aW9uLFxuICAgIGxvZzogZnVuY3Rpb24oKXsgXG4gICAgICAgIGNvbnNvbGUubG9nKGFyZ3VtZW50cyk7XG4gICAgfSxcblxuICAgIHhkcjogZnVuY3Rpb24gKHVybCwgZGF0YSwgYXBwbGljYXRpb24sdG9rZW4sIGZvcm1FbmNvZGUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ha2UgYW4gSFRUUCBSZXF1ZXN0IGFuZCByZXR1cm4gaXRzIHByb21pc2UuXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciByZXE7XG4gICAgICAgICAgICBpZiAoIWRhdGEpIHsgZGF0YSA9IHt9O31cblxuICAgICAgICAgICAgaWYoWE1MSHR0cFJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZURhdGEgPSBKU09OLnBhcnNlKHJlcS5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoYSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB7cmVzcG9uc2VEYXRhOiByZXNwb25zZURhdGEsIHJlc3BvbnNlVGV4dDogcmVxLnJlc3BvbnNlVGV4dCxzdGF0dXM6IHJlcS5zdGF0dXMsIHJlcXVlc3Q6IHJlcX07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVxLnN0YXR1cyA+PSAyMDAgJiYgcmVxLnN0YXR1cyA8IDQwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmKFhEb21haW5SZXF1ZXN0KXtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWERvbWFpblJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXEucmVzcG9uc2VUZXh0LHJlcS5zdGF0dXNUZXh0LCByZXEpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0NPUlMgbm90IHN1cHBvcnRlZCcpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxLm9wZW4oJ1BPU1QnLCB1cmwsIHRydWUpO1xuICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgaWYgKHRva2VuKSB7IGRhdGEuX190b2tlbl9fID0gdG9rZW4gfVxuICAgICAgICAgICAgaWYgKCFmb3JtRW5jb2RlKXtcbiAgICAgICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLnNpemUoKT9KU09OLnN0cmluZ2lmeShkYXRhKTonJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUkkodi50b1N0cmluZygpKTsgIFxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKS5qb2luKCcmJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXEuc2VuZChkYXRhKTtcbiAgICAvLyAgICAgICAgcmVxLnNlbmQobnVsbCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBjYXBpdGFsaXplIDogZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgcmV0dXJuIHNbMF0udG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICB9LFxuXG4gICAgaGFzaCA6IGZ1bmN0aW9uKHN0cil7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIYXNoZWQgZnVuY3Rpb25cbiAgICAgICAgICovXG4gICAgICAgIHN0ciA9IHN0ci50b1N0cmluZygpO1xuICAgICAgICB2YXIgcmV0ID0gMTtcbiAgICAgICAgZm9yICh2YXIgeCA9IDA7eDxzdHIubGVuZ3RoO3grKyl7XG4gICAgICAgICAgICByZXQgKj0gKDEgKyBzdHIuY2hhckNvZGVBdCh4KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChyZXQgJSAzNDk1ODM3NDk1NykudG9TdHJpbmcoKTtcbiAgICB9LFxuXG4gICAgbWFrZUZpbHRlciA6IGZ1bmN0aW9uIChtb2RlbCwgZmlsdGVyLCB1bmlmaWVyLCBkb250VHJhbnNsYXRlRmlsdGVyKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlIGZpbHRlciBmb3IgQXJyYXkuZmlsdGVyIGZ1bmN0aW9uIGFzIGFuIGFuZCBvZiBvclxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKCF1bmlmaWVyKSB7IHVuaWZpZXIgPSAnICYmICc7fVxuICAgICAgICBpZiAoTGF6eShmaWx0ZXIpLnNpemUoKSA9PT0gMCl7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCl7IHJldHVybiB0cnVlIH07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNvdXJjZSA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odmFscywgZmllbGQpe1xuICAgICAgICAgICAgaWYgKCF2YWxzKSB7IHZhbHMgPSBbbnVsbF19XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFscykpe1xuICAgICAgICAgICAgICAgIHZhbHMgPSBbdmFsc107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWRvbnRUcmFuc2xhdGVGaWx0ZXIgJiYgKG1vZGVsLmZpZWxkc1tmaWVsZF0udHlwZSA9PT0gJ3JlZmVyZW5jZScpKSB7XG4gICAgICAgICAgICAgICAgZmllbGQgPSAnXycgKyBmaWVsZDtcbiAgICAgICAgICAgICAgICB2YWxzID0gTGF6eSh2YWxzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgIGlmICh4ICYmICh4LmNvbnN0cnVjdG9yICE9PSBOdW1iZXIpKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmlkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vZGVsLmZpZWxkc1tmaWVsZF0udHlwZSA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgIHZhbHMgPSB2YWxzLm1hcChKU09OLnN0cmluZ2lmeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJygnICsgIExhenkodmFscykubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgIGlmICgheCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdtYWtlRmlsdGVyIHggaXMgbnVsbCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZih4ID09PSBvcm0udXRpbHMubW9jaykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdtYWtlRmlsdGVyIHdpdGggTW9jayBPYmplY3QnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICcoeC4nICsgZmllbGQgKyAnID09PSAnICsgeCArICcpJztcbiAgICAgICAgICAgIH0pLmpvaW4oJyB8fCAnKSAgKycpJztcbiAgICAgICAgfSkudG9BcnJheSgpLmpvaW4odW5pZmllcik7XG4gICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJ4XCIsIFwicmV0dXJuIFwiICsgc291cmNlKTtcbiAgICB9LFxuXG4gICAgc2FtZUFzIDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZXAgZXF1YWxcbiAgICAgICAgICovXG4gICAgICAgIGZvciAodmFyIGsgaW4geCkge1xuICAgICAgICAgICAgaWYgKHlba10gIT0geFtrXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIHBsdXJhbGl6ZSA6IGZ1bmN0aW9uKHN0ciwgbW9kZWwpe1xuICAgICAgICAvKipcbiAgICAgICAgICogTGV4aWNhbGx5IHJldHVybnMgZW5nbGlzaCBwbHVyYWwgZm9ybVxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIHN0ciArICdzJztcbiAgICB9LFxuXG4gICAgYmVmb3JlQ2FsbCA6IGZ1bmN0aW9uKGZ1bmMsIGJlZm9yZSl7XG4gICAgICAgIHZhciBkZWNvcmF0b3IgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgYmVmb3JlKCkudGhlbihmdW5jKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZGVjb3JhdG9yO1xuICAgIH0sXG5cbiAgICBjbGVhblN0b3JhZ2UgOiBmdW5jdGlvbigpe1xuICAgICAgICAvKipcbiAgICAgICAgICogQ2xlYW4gbG9jYWxTdG9yYWdlIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgTGF6eShsb2NhbFN0b3JhZ2UpLmtleXMoKS5lYWNoKGZ1bmN0aW9uKGspe1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtrXTtcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgY2xlYW5EZXNjcmlwdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIExhenkobG9jYWxTdG9yYWdlKVxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbih2LCBuKSB7IHJldHVybiBMYXp5KG4pLnN0YXJ0c1dpdGgoJ2Rlc2NyaXB0aW9uOicpfSlcbiAgICAgICAgICAgIC5rZXlzKClcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKG4pIHsgZGVsZXRlIGxvY2FsU3RvcmFnZVtuXSB9KTtcbiAgICB9LFxuICAgIFxuICAgIHJldmVyc2UgOiBmdW5jdGlvbiAoY2hyLCBzdHIpIHtcbiAgICAgICAgcmV0dXJuIHN0ci5zcGxpdChjaHIpLnJldmVyc2UoKS5qb2luKGNocik7XG4gICAgfSxcbiAgICBwZXJtdXRhdGlvbnM6IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgeCA9IGFyci5sZW5ndGgtMTsgeCA+PSAwO3gtLSl7XG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gYXJyLmxlbmd0aC0xOyB5ID49IDA7IHktLSl7XG4gICAgICAgICAgICAgICAgaWYgKHggIT09IHkpXG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKFthcnJbeF0sIGFyclt5XV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcblxuICAgIHdhaXRGb3I6IGZ1bmN0aW9uKGZ1bmMsIGNhbGxCYWNrKSB7XG4gICAgICAgIHZhciB3YWl0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChmdW5jKCkpIHtcbiAgICAgICAgICAgICAgICBjYWxsQmFjaygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHdhaXRlciw1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQod2FpdGVyLCA1MDApO1xuICAgIH0sXG5cbiAgICBib29sOiBCb29sZWFuLFxuXG4gICAgbm9vcCA6IGZ1bmN0aW9uKCl7fSxcblxuICAgIHR6T2Zmc2V0OiBuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCxcblxuICAgIHRyYW5zRmllbGRUeXBlOiB7XG4gICAgICAgIGRhdGU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG5ldyBEYXRlKHggKiAxMDAwICsgdXRpbHMudHpPZmZzZXQgKSB9LFxuICAgICAgICBkYXRldGltZTogZnVuY3Rpb24oeCkgeyByZXR1cm4gbmV3IERhdGUoeCAqIDEwMDAgKyB1dGlscy50ek9mZnNldCApIH0sXG4gICAgICAgIHN0cmluZzogZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b1N0cmluZygpOyB9LFxuICAgICAgICB0ZXh0OiBmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvU3RyaW5nKCk7IH0sXG4gICAgICAgIGludGVnZXI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBhcnNlSW50KHgpOyB9LFxuICAgICAgICBmbG9hdDogZnVuY3Rpb24oeCkgeyByZXR1cm4gcGFyc2VGbG9hdCh4KTsgfVxuICAgIH0sIFxuICAgIG1vY2sgOiBtb2NrT2JqZWN0KClcbn07XG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgU1RBVFVTS0VZID0gJ2xhc3RSV1RDb25uZWN0aW9uU3RhdHVzJztcblxuZnVuY3Rpb24gUmVhbHRpbWVDb25uZWN0aW9uKGVuZFBvaW50LCByd3RDb25uZWN0aW9uKXtcbiAgICAvKipcbiAgICAgKiBDb25uZWN0cyBhIHdlYnNvY2tldCB3aXRoIHJlV2hlZWwgY29ubmVjdGlvblxuICAgICAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBjb25uZWN0aW9uID0gbmV3IFNvY2tKUyhlbmRQb2ludCk7XG4gICAgY29ubmVjdGlvbi5vbm9wZW4gPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICBjb25zb2xlLmxvZygnb3BlbiA6ICcgKyB4KTtcbiAgICAgICAgY29ubmVjdGlvbi50ZW5hbnQoKTtcbiAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1jb25uZWN0aW9uLW9wZW4nLHgpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAoeC50eXBlID09ICdtZXNzYWdlJykge1xuICAgICAgICAgICAgLy8kLm5vdGlmeSh4LmRhdGEpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvL1RPRE8gc2V0IGZyb21SZWFsdGltZVxuICAgICAgICAgICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtbWVzc2FnZS1qc29uJywgSlNPTi5wYXJzZSh4LmRhdGEpKTtcbiAgICAgICAgICAgICAgICAvL1RPRE8gdW5zZXQgZnJvbVJlYWx0aW1lXG4gICAgICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLW1lc3NhZ2UtdGV4dCcsIEpTT04ucGFyc2UoeC5kYXRhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZnJvbSByZWFsdGltZSAnLHgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9uY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNldFRpbWVvdXQodXRpbHMud3NDb25uZWN0LDEwMDApO1xuICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLWNvbm5lY3Rpb24tY2xvc2VkJyk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLnRlbmFudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29ubmVjdGlvbi5zZW5kKCdURU5BTlQ6JyArIHJ3dENvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLmFwcGxpY2F0aW9uICsgJzonICsgcnd0Q29ubmVjdGlvbi5jYWNoZWRTdGF0dXMudG9rZW4pO1xuICAgIH1cbiAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICB9XG59ICAgIFxuXG5mdW5jdGlvbiByZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgZ2V0TG9naW4pe1xuICAgIC8qKlxuICAgICAqIENvbm5lY3Rpb24gYmFzaWMgZm9yIHJlV2hlZWxcbiAgICAgKiBAcGFyYW0gZW5kUG9pbnQ6IHN0cmluZyBiYXNlIHVybCBmb3IgYWxsIGNvbXVuaWNhdGlvblxuICAgICAqIEBwYXJhbSBnZXRMb2dpbjogZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGluIGNhc2Ugb2YgbWlzc2luZyBsb2dpbi5cbiAgICAgKiAgdGhpcyBmdW5jdGlvbiBjb3VsZCByZXR1cm4gOlxuICAgICAqICAtICAgYSB7IHVzZXJuYW1lIDogPHVzZXJuYW1lPiAsIHBhc3N3b3JkOiA8cGFzc3dvcmQ+fSBvclxuICAgICAqICAtICAgYiBQcm9taXNlIC0+IHsgdXNlcm5hbWUgOiA8dXNlcm5hbWU+ICwgcGFzc3dvcmQ6IDxwYXNzd29yZD59XG4gICAgICovXG4gICAgLy8gbWFpbiBpbml0aWFsaXphdGlvblxuICAgIHZhciBldmVudHMgPSBuZXcgTmFtZWRFdmVudE1hbmFnZXIoKTtcbiAgICB0aGlzLmdldExvZ2luID0gZ2V0TG9naW47XG4gICAgdGhpcy5lbmRQb2ludCA9IGVuZFBvaW50LmVuZHNXaXRoKCcvJyk/IGVuZFBvaW50OiAoZW5kUG9pbnQgKyAnLycpO1xuICAgIHRoaXMub24gPSBldmVudHMub247XG4gICAgdGhpcy51bmJpbmQgPSBldmVudHMudW5iaW5kO1xuICAgIHRoaXMuZW1pdCA9IGV2ZW50cy5lbWl0O1xuICAgIHRoaXMub25jZSA9IGV2ZW50cy5vbmNlO1xuICAgIHRoaXMuY2FjaGVkU3RhdHVzID0ge307XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlO1xuICAgIHRoaXMuaXNMb2dnZWRJbiA9IGZhbHNlO1xuICAgIC8vIHJlZ2lzdGVyaW5nIHVwZGF0ZSBzdGF0dXNcbiAgICB2YXIgdGhzID0gdGhpcztcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS4kcG9zdCA9IGZ1bmN0aW9uKHVybCwgZGF0YSxjYWxsQmFjayl7XG4gICAgLyoqXG4gICAgICogQUpBWCBjYWxsIGZvciBmZXRjaCBhbGwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAqIEBwYXJhbSB1cmw6IGxhc3QgdXJsIHBhcnQgZm9yIGFqYXggY2FsbFxuICAgICAqIEBwYXJhbSBkYXRhOiBkYXRhIG9iamVjdCB0byBiZSBzZW50XG4gICAgICogQHBhcmFtIGNhbGxCYWNrOiBmdW5jdGlvbih4aHIpIHdpbGwgYmUgY2FsbGVkIHdoZW4gZGF0YSBhcnJpdmVzXG4gICAgICogQHJldHVybnMgUHJvbWlzZTx4aHI+IHNhbWUgb2YgY2FsbEJhY2tcbiAgICAgKi9cbiAgICAvLyBpbml0aWFsaXphdGlvblxuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih0aHMuZW5kUG9pbnQgKyB1cmwsIGRhdGEsIHRocy5jYWNoZWRTdGF0dXMuYXBwbGljYXRpb24sIHRocy5jYWNoZWRTdGF0dXMudG9rZW4pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHRocy5lbWl0KCdodHRwLXJlc3BvbnNlJywgeGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cywgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB0aHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzICsgJy1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7IGNhbGxCYWNrKCB4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQgKX07XG4gICAgICAgICAgICAgICAgYWNjZXB0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgeGhyLnN0YXR1cywgdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItanNvbi0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlRGF0YSx1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1odHRwJyx4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1odHRwLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xufTtcblxuLyoqXG4gKiBDaGVjayBjdXJyZW50IHN0YXR1cyBhbmQgY2FsbGJhY2sgZm9yIHJlc3VsdHMuXG4gKiBJdCBjYWNoZXMgcmVzdWx0cyBmb3IgZnVydGhlci5cbiAqIEBwYXJhbSBjYWxsYmFjazogKHN0YXR1cyBvYmplY3QpXG4gKiBAcGFyYW0gZm9yY2U6IGJvb2xlYW4gaWYgdHJ1ZSBlbXB0aWVzIGNhY2hlICBcbiAqIEByZXR1cm4gdm9pZFxuICovXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuc3RhdHVzID0gZnVuY3Rpb24oY2FsbEJhY2ssIGZvcmNlKSB7XG4gICAgLy8gaWYgZm9yY2UsIGNsZWFyIGFsbCBjYWNoZWQgdmFsdWVzXG4gICAgdmFyIGtleSA9ICd0b2tlbjonICsgdGhpcy5lbmRQb2ludDtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICBpZiAoZm9yY2UpIHtcbiAgICAgICAgdGhpcy5jYWNoZWRTdGF0dXMgPSB7fTtcbiAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtrZXldO1xuICAgIH1cbiAgICBpZiAodGhpcy5zdGF0dXNXYWl0aW5nKSB7XG4gICAgICAgIC8vIHdhaXQgZm9yIHN0YXR1c1xuICAgICAgICB1dGlscy53YWl0Rm9yKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICF0aHMuc3RhdHVzV2FpdGluZztcbiAgICAgICAgfSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRocy5zdGF0dXMoY2FsbEJhY2ssZm9yY2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyB0cnkgZm9yIHZhbHVlIHJlc29sdXRpb25cbiAgICAvLyBmaXJzdCBvbiBtZW1vcnlcbiAgICBpZiAoTGF6eSh0aGlzLmNhY2hlZFN0YXR1cykuc2l6ZSgpKXtcbiAgICAgICAgY2FsbEJhY2sodGhpcy5jYWNoZWRTdGF0dXMpXG4gICAgLy8gdGhlbiBpbiBsb2NhbFN0b3JhZ2VcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICBpZiAoa2V5IGluIGxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgICAgZGF0YS5fX3Rva2VuX18gPSBsb2NhbFN0b3JhZ2Vba2V5XTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0YXR1c1dhaXRpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLiRwb3N0KCdhcGkvc3RhdHVzJyxkYXRhLCBmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyhzdGF0dXMpO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlW2tleV0gPSBzdGF0dXMudG9rZW47XG4gICAgICAgICAgICBjYWxsQmFjayhzdGF0dXMpO1xuICAgICAgICAgICAgdGhzLnN0YXR1c1dhaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGRvZXNuJ3QgY2FsbCBjYWxsYmFja1xuICAgICAgICByZXR1cm5cbiAgICB9XG4gICAgY2FsbEJhY2sodGhpcy5jYWNoZWRTdGF0dXMpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgdmFyIGxhc3RCdWlsZCA9IHBhcnNlRmxvYXQobG9jYWxTdG9yYWdlLmxhc3RCdWlsZCkgfHwgMTtcbiAgICBpZiAobGFzdEJ1aWxkIDwgc3RhdHVzLmxhc3RfYnVpbGQpe1xuICAgICAgICB1dGlscy5jbGVhbkRlc2NyaXB0aW9uKCk7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0QnVpbGQgPSBzdGF0dXMubGFzdF9idWlsZDtcbiAgICB9XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IEJvb2xlYW4oc3RhdHVzLnRva2VuKTtcbiAgICB0aGlzLmlzTG9nZ2VkSW4gPSBCb29sZWFuKHN0YXR1cy51c2VyX2lkKTtcbiAgICB2YXIgb2xkU3RhdHVzID0gdGhpcy5jYWNoZWRTdGF0dXM7XG4gICAgdGhpcy5jYWNoZWRTdGF0dXMgPSBzdGF0dXM7XG4gICAgaWYgKCFvbGRTdGF0dXMudXNlcl9pZCAmJiBzdGF0dXMudXNlcl9pZCl7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9nZ2VkLWluJyxzdGF0dXMudXNlcl9pZCk7XG4gICAgfSBlbHNlIGlmIChvbGRTdGF0dXMudXNlcl9pZCAmJiAhc3RhdHVzLnVzZXJfaWQpe1xuICAgICAgICB0aGlzLmVtaXQoJ2xvZ2dlZC1vdXQnKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNDb25uZWN0ZWQgJiYgIXRoaXMuaXNMb2dnZWRJbil7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9naW4tcmVxdWlyZWQnKTtcbiAgICAgICAgaWYgKHRoaXMuZ2V0TG9naW4pe1xuICAgICAgICAgICAgdmFyIGxvZ2luSW5mbyA9IHRoaXMuZ2V0TG9naW4oKTtcbiAgICAgICAgICAgIGlmIChsb2dpbkluZm8uY29uc3RydWN0b3IgPT09IE9iamVjdCl7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2dpbihsb2dpbkluZm8udXNlcm5hbWUsIGxvZ2luSW5mby5wYXNzd29yZCwgbG9naW5JbmZvLmNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobG9naW5JbmZvLmNvbnN0cnVjdG9yID09PSBQcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgbG9naW5JbmZvLnRoZW4oZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2dpbihvYmoudXNlcm5hbWUsIG9iai5wYXNzd29yZCwgb2JqLmNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIHJlYWx0aW1lIGNvbm5lY3Rpb24gaXMgc2V0dGVkXG4gICAgaWYgKCFvbGRTdGF0dXMucmVhbHRpbWVFbmRQb2ludCAmJiBzdGF0dXMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICB0aGlzLndzQ29ubmVjdGlvbiA9IG5ldyBSZWFsdGltZUNvbm5lY3Rpb24oc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQsIHRoaXMpO1xuICAgIC8vIHJlYWx0aW1lIGNvbm5lY3Rpb24gaXMgY2xvc2VkXG4gICAgfSBlbHNlIGlmIChvbGRTdGF0dXMucmVhbHRpbWVFbmRQb2ludCAmJiAhc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICAgICAgZGVsZXRlIHRoaXMud3NDb25uZWN0aW9uO1xuICAgIH1cbiAgICB0aGlzLmVtaXQoJ3VwZGF0ZS1jb25uZWN0aW9uLXN0YXR1cycsIHN0YXR1cywgb2xkU3RhdHVzKTtcbiAgICBsb2NhbFN0b3JhZ2VbU1RBVFVTS0VZXSA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG59XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCl7XG4gICAgLyoqXG4gICAgICogbWFrZSBsb2dpbiBhbmQgcmV0dXJuIGEgcHJvbWlzZS4gSWYgbG9naW4gc3VjY2VkLCBwcm9taXNlIHdpbGwgYmUgYWNjZXB0ZWRcbiAgICAgKiBJZiBsb2dpbiBmYWlscyBwcm9taXNlIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aCBlcnJvclxuICAgICAqIEBwYXJhbSB1c2VybmFtZTogdXNlcm5hbWVcbiAgICAgKiBAcGFyYW0gcGFzc3dvcmQ6IHBhc3N3b3JkXG4gICAgICogQHJldHVybiBQcm9taXNlICh1c2VyIG9iamVjdClcbiAgICAgKi9cbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLmVuZFBvaW50ICsgJ2FwaS9sb2dpbicsIHt1c2VybmFtZTogdXNlcm5hbWUgfHwgJycsIHBhc3N3b3JkOiBwYXNzd29yZCB8fCAnJ30sbnVsbCx0aHMuY2FjaGVkU3RhdHVzLnRva2VuLCB0cnVlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgc3RhdHVzXG4gICAgICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyh4aHIucmVzcG9uc2VEYXRhKTtcbiAgICAgICAgICAgICAgICAvLyBjYWxsIHdpdGggdXNlciBpZFxuICAgICAgICAgICAgICAgIGFjY2VwdCh7c3RhdHVzIDogJ3N1Y2Nlc3MnLCB1c2VyaWQ6IHRocy5jYWNoZWRTdGF0dXMudXNlcl9pZH0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgZXJyb3IgY2FsbCBlcnJvciBtYW5hZ2VyIHdpdGggZXJyb3JcbiAgICAgICAgICAgICAgICBhY2NlcHQoe2Vycm9yOiB4aHIucmVzcG9uc2VEYXRhLmVycm9yLCBzdGF0dXM6ICdlcnJvcid9KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KSB7XG4gICAgICAgIHRocy4kcG9zdCgnYXBpL2xvZ291dCcpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihvayl7XG4gICAgICAgICAgICAgICAgdGhzLnVwZGF0ZVN0YXR1cyh7fSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtTVEFUVVNLRVldO1xuICAgICAgICAgICAgICAgIGFjY2VwdCgpXG4gICAgICAgICAgICB9LCByZWplY3QpO1xuICAgIH0pO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbihjYWxsQmFjaykge1xuICAgIGlmICh0aGlzLmlzTG9nZ2VkSW4pIHtcbiAgICAgICAgY2FsbEJhY2sodGhpcy5jYWNoZWRTdGF0dXMudXNlcl9pZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gd2FpdCBmb3IgbG9naW5cbiAgICAgICAgdGhpcy5vbmNlKCdsb2dnZWQtaW4nLGZ1bmN0aW9uKHVzZXJfaWQpe1xuICAgICAgICAgICAgY2FsbEJhY2sodXNlcl9pZCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnN0YXR1cyhjYWxsQmFjayB8fCB1dGlscy5ub29wKTtcbiAgICB9XG59XG5cbnV0aWxzLnJlV2hlZWxDb25uZWN0aW9uID0gcmVXaGVlbENvbm5lY3Rpb247IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBUb3VjaGVyKCl7XG4gICAgdmFyIHRvdWNoZWQgPSBmYWxzZVxuICAgIHRoaXMudG91Y2ggPSBmdW5jdGlvbigpe1xuICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcbiAgICB9O1xuICAgIHRoaXMudG91Y2hlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB0ID0gdG91Y2hlZDtcbiAgICAgICAgdG91Y2hlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gdDtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cblxuZnVuY3Rpb24gVmFjdXVtQ2FjaGVyKHRvdWNoLCBhc2tlZCwgbmFtZSwgcGtJbmRleCl7XG4vKlxuICAgIGlmIChuYW1lKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdjcmVhdGVkIFZhY3V1bUNhY2hlciBhcyAnICsgbmFtZSk7XG4gICAgfVxuKi9cbiAgICBpZiAoIWFza2VkKXtcbiAgICAgICAgdmFyIGFza2VkID0gW107XG4gICAgfVxuICAgIHZhciBtaXNzaW5nID0gW107XG4gICAgXG4gICAgdGhpcy5hc2sgPSBmdW5jdGlvbiAoaWQsbGF6eSl7XG4gICAgICAgIGlmIChwa0luZGV4ICYmIChpZCBpbiBwa0luZGV4LnNvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIUxhenkoYXNrZWQpLmNvbnRhaW5zKGlkKSl7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8oJ2Fza2luZyAoJyArIGlkICsgJykgZnJvbSAnICsgbmFtZSk7XG4gICAgICAgICAgICBtaXNzaW5nLnB1c2goaWQpO1xuICAgICAgICAgICAgaWYgKCFsYXp5KVxuICAgICAgICAgICAgICAgIGFza2VkLnB1c2goaWQpO1xuICAgICAgICAgICAgdG91Y2gudG91Y2goKTtcbiAgICAgICAgfSBcbi8vICAgICAgICBlbHNlIGNvbnNvbGUud2FybignKCcgKyBpZCArICcpIHdhcyBqdXN0IGFza2VkIG9uICcgKyBuYW1lKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRBc2tlZEluZGV4ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIGFza2VkO1xuICAgIH1cblxuICAgIHRoaXMubWlzc2luZ3MgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gTGF6eShtaXNzaW5nLnNwbGljZSgwLG1pc3NpbmcubGVuZ3RoKSkudW5pcXVlKCkudG9BcnJheSgpO1xuICAgIH1cbn1cbiIsImZ1bmN0aW9uIEF1dG9MaW5rZXIoYWN0aXZlcywgSURCLCBXMlBSRVNPVVJDRSwgbGlzdENhY2hlKXtcbiAgICB2YXIgdG91Y2ggPSBuZXcgVG91Y2hlcigpO1xuICAgIHZhciBtYWluSW5kZXggPSB7fTtcbiAgICB2YXIgZm9yZWlnbktleXMgPSB7fTtcbiAgICB2YXIgbTJtID0ge307XG4gICAgdmFyIG0ybUluZGV4ID0ge307XG4gICAgdmFyIHBlcm1pc3Npb25zID0ge307XG4gICAgdGhpcy5tYWluSW5kZXggPSBtYWluSW5kZXg7XG4gICAgdGhpcy5mb3JlaWduS2V5cyA9IGZvcmVpZ25LZXlzO1xuICAgIHRoaXMubTJtID0gbTJtO1xuICAgIHRoaXMubTJtSW5kZXggPSBtMm1JbmRleDtcbiAgICB0aGlzLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG5cbiAgICBXMlBSRVNPVVJDRS5vbignbW9kZWwtZGVmaW5pdGlvbicsZnVuY3Rpb24obW9kZWwsIGluZGV4KXtcbiAgICAgICAgLy8gZGVmaW5pbmcgYWxsIGluZGV4ZXMgZm9yIHByaW1hcnkga2V5XG4gICAgICAgIHZhciBwa0luZGV4ID0gbGlzdENhY2hlLmdldEluZGV4Rm9yKG1vZGVsLm5hbWUsICdpZCcpO1xuICAgICAgICBtYWluSW5kZXhbbW9kZWwubmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBwa0luZGV4LCAnbWFpbkluZGV4LicgKyBtb2RlbC5uYW1lLCBpbmRleCk7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGluZyBwZXJtaXNzaW9uIGluZGV4ZXNcbiAgICAgICAgcGVybWlzc2lvbnNbbW9kZWwubmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsICdwZXJtaXNzaW9ucy4nICsgbW9kZWwubmFtZSk7XG5cbiAgICAgICAgLy8gY3JlYXRpbmcgaW5kZXhlcyBmb3IgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbihyZWZlcmVuY2Upe1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsLm5hbWUgKyAnXycgKyByZWZlcmVuY2UuaWQ7XG4gICAgICAgICAgICBmb3JlaWduS2V5c1tpbmRleE5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgbGlzdENhY2hlLmdldEluZGV4Rm9yKHJlZmVyZW5jZS50bywgJ2lkJyksIHJlZmVyZW5jZS50byArICcuaWQgZm9yZWlnbktleXMuJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBjcmVhdGluZyByZXZlcnNlIGZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZWRCeSkuZWFjaChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gZmllbGQuYnkgKyAnLicgKyBmaWVsZC5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IoZmllbGQuYnksZmllbGQuaWQpLCBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkICsgJyBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgICAgICAgICBpZiAoIShyZWxhdGlvbi5pbmRleE5hbWUgaW4gbTJtKSlcbiAgICAgICAgICAgICAgICBtMm1bcmVsYXRpb24uaW5kZXhOYW1lXSA9IFtuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsJ20ybS4nICsgcmVsYXRpb24uaW5kZXhOYW1lICsgJ1swXScpLCBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsJ20ybS4nICsgcmVsYXRpb24uaW5kZXhOYW1lKydbMV0nKV07XG4gICAgICAgICAgICBpZiAoIShyZWxhdGlvbi5pbmRleE5hbWUgaW4gbTJtSW5kZXgpKVxuICAgICAgICAgICAgICAgIG0ybUluZGV4W3JlbGF0aW9uLmluZGV4TmFtZV0gPSBuZXcgTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIG0ybUdldCA9IGZ1bmN0aW9uKGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgY2FsbEJhY2spe1xuICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCgobiA/IHV0aWxzLnJldmVyc2UoJy8nLCBpbmRleE5hbWUpIDogaW5kZXhOYW1lKSArICdzJyArICcvbGlzdCcsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW2luZGV4TmFtZV1cbiAgICAgICAgfSk7ICAgICAgICBcbiAgICB9O1xuXG4gICAgdmFyIGdldE0yTSA9IGZ1bmN0aW9uKGluZGV4TmFtZSwgY29sbGVjdGlvbiwgbiwgY2FsbEJhY2spe1xuICAgICAgICAvLyBhc2sgYWxsIGl0ZW1zIGluIGNvbGxlY3Rpb24gdG8gbTJtIGluZGV4XG4gICAgICAgIExhenkoY29sbGVjdGlvbikuZWFjaChtMm1baW5kZXhOYW1lXVtuXS5hc2suYmluZChtMm1baW5kZXhOYW1lXVtuXSkpO1xuICAgICAgICAvLyByZW5ld2luZyBjb2xsZWN0aW9uIHdpdGhvdXQgYXNrZWRcbiAgICAgICAgY29sbGVjdGlvbiA9IG0ybVtpbmRleE5hbWVdW25dLm1pc3NpbmdzKCk7XG4gICAgICAgIC8vIGNhbGxpbmcgcmVtb3RlIGZvciBtMm0gY29sbGVjdGlvbiBpZiBhbnlcbiAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgIGFjdGl2ZXNbaW5kZXhOYW1lXSA9IDE7XG4gICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLmdldE0yTSA9IGdldE0yTTtcblxuICAgIHZhciBsaW5rVW5saW5rZWQgPSBmdW5jdGlvbigpe1xuICAgICAgICAvLyBwZXJmb3JtIGEgRGF0YUJhc2Ugc3luY2hyb25pemF0aW9uIHdpdGggc2VydmVyIGxvb2tpbmcgZm9yIHVua25vd24gZGF0YVxuICAgICAgICBpZiAoIXRvdWNoLnRvdWNoZWQoKSkgcmV0dXJuO1xuICAgICAgICBpZiAoTGF6eShhY3RpdmVzKS52YWx1ZXMoKS5zdW0oKSkge1xuICAgICAgICAgICAgdG91Y2gudG91Y2goKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihpbmRleGVzLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgTGF6eShpbmRleGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCxuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSBMYXp5KGNvbGxlY3Rpb24pLmZpbHRlcihCb29sZWFuKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjb2xsZWN0aW9uLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBJTkRFWCA9IG0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBnZXR0ZXIgPSBJTkRFWFsnZ2V0JyArICgxIC0gbildLmJpbmQoSU5ERVgpO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbTJtR2V0KGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gY29sbGVjdGlvbi5tYXAoZ2V0dGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgb3RoZXJJbmRleCA9IGluZGV4TmFtZS5zcGxpdCgnLycpWzEgLSBuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShvdGhlckluZGV4LGZ1bmN0aW9uKCl7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShpZHMpLmZsYXR0ZW4oKS51bmlxdWUoKS5lYWNoKG1haW5JbmRleFtvdGhlckluZGV4XS5hc2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYWluSW5kZXhbb3RoZXJJbmRleF0uYXNrKHgsdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIExhenkobWFpbkluZGV4KS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaWRzID0gaW5kZXgubWlzc2luZ3MoKTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIGlkYiA9IG1vZGVsTmFtZSBpbiBJREIgPyBJREJbbW9kZWxOYW1lXS5rZXlzKCkgOiBMYXp5KCk7XG4gICAgICAgICAgICAgICAgLy9sb2coJ2xpbmtpbmcuJyArIG1vZGVsTmFtZSArICcgPSAnICsgVzJQUkVTT1VSQ0UubGlua2luZy5zb3VyY2VbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lLCB7aWQ6IGlkc30sbnVsbCx1dGlscy5ub29wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KGZvcmVpZ25LZXlzKVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICByZXR1cm4gW2ssIHYubWlzc2luZ3MoKV1cbiAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uKHYpe1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGlkcyA9IHhbMV07XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0geFswXTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGluZGV4TmFtZS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgdmFyIG1haW5SZXNvdXJjZSA9IGluZGV4WzBdO1xuICAgICAgICAgICAgdmFyIGZpZWxkTmFtZSA9IGluZGV4WzFdO1xuICAgICAgICAgICAgdmFyIGZpbHRlciA9IHt9O1xuICAgICAgICAgICAgZmlsdGVyW2ZpZWxkTmFtZV0gPSBpZHM7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtYWluUmVzb3VyY2UsIGZpbHRlcik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgTGF6eShMYXp5KHBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIHJldHVybiB2WzFdLmxlbmd0aFxuICAgICAgICB9KS50b09iamVjdCgpKS5lYWNoKGZ1bmN0aW9uIChpZHMsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgYWN0aXZlc1tyZXNvdXJjZU5hbWVdID0gMTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChyZXNvdXJjZU5hbWUgKyAnL215X3Blcm1zJywge2lkczogTGF6eShpZHMpLnVuaXF1ZSgpLnRvQXJyYXkoKX0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdFBlcm1pc3Npb25zKGRhdGEuUEVSTUlTU0lPTlMpO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYWN0aXZlc1tyZXNvdXJjZU5hbWVdXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzZXRJbnRlcnZhbChsaW5rVW5saW5rZWQsNTApO1xufTtcblxuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gTGlzdENhY2hlcigpe1xuICAgIHZhciBnb3RBbGwgPSB7fTtcbiAgICB2YXIgYXNrZWQgPSB7fTsgLy8gbWFwIG9mIGFycmF5XG4gICAgdmFyIGNvbXBvc2l0ZUFza2VkID0ge307XG4gICAgdmFyIGNhcnRlc2lhblByb2R1Y3QxID0gZnVuY3Rpb24oeCx5LGlzQXJyYXkpe1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGlmIChpc0FycmF5KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhIGluIHgpe1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGIgaW4geSl7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKExhenkoW3hbYV0seVtiXV0pLmZsYXR0ZW4oKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4geCl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYiBpbiB5KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goW3hbYV0seVtiXV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgdmFyIGNhcnRlc2lhblByb2R1Y3QgPSBmdW5jdGlvbihhcnIpe1xuICAgICAgICB2YXIgaXNBcnJheSA9IGZhbHNlO1xuICAgICAgICB2YXIgcmV0ID0gYXJyWzBdOyBcbiAgICAgICAgZm9yICh2YXIgeCA9IDE7IHggPCBhcnIubGVuZ3RoOyArK3gpe1xuICAgICAgICAgICAgcmV0ID0gY2FydGVzaWFuUHJvZHVjdDEocmV0LCBhcnJbeF0sIGlzQXJyYXkpO1xuICAgICAgICAgICAgaXNBcnJheSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gICAgdmFyIGV4cGxvZGVGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgdmFyIHByb2R1Y3QgPSBjYXJ0ZXNpYW5Qcm9kdWN0KExhenkoZmlsdGVyKS52YWx1ZXMoKS50b0FycmF5KCkpO1xuICAgICAgICB2YXIga2V5cyA9IExhenkoZmlsdGVyKS5rZXlzKCkudG9BcnJheSgpO1xuICAgICAgICByZXR1cm4gcHJvZHVjdC5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YXIgciA9IHt9O1xuICAgICAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGEsbil7XG4gICAgICAgICAgICAgICAgclthXSA9IHhbbl07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9O1xuICAgIHZhciBmaWx0ZXJTaW5nbGUgPSBmdW5jdGlvbihtb2RlbCwgZmlsdGVyLCB0ZXN0T25seSl7XG4gICAgICAgIC8vIExhenkgYXV0byBjcmVhdGUgaW5kZXhlc1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gbW9kZWwubW9kZWxOYW1lO1xuICAgICAgICB2YXIgZ2V0SW5kZXhGb3IgPSB0aGlzLmdldEluZGV4Rm9yO1xuICAgICAgICB2YXIga2V5cyA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odixrZXkpeyByZXR1cm4gW2tleSwgbW9kZWxOYW1lICsgJy4nICsga2V5XTsgfSkudG9PYmplY3QoKTtcbiAgICAgICAgdmFyIGluZGV4ZXMgPSBMYXp5KGZpbHRlcikua2V5cygpLm1hcChmdW5jdGlvbihrZXkpeyByZXR1cm4gW2tleSwgZ2V0SW5kZXhGb3IobW9kZWxOYW1lLCBrZXkpXX0pLnRvT2JqZWN0KCk7IFxuICAgICAgICAvLyBmYWtlIGZvciAoaXQgd2lsbCBjeWNsZSBvbmNlKVxuICAgICAgICBmb3IgKHZhciB4IGluIGZpbHRlcil7XG4gICAgICAgICAgICAvLyBnZXQgYXNrZWQgaW5kZXggYW5kIGNoZWNrIHByZXNlbmNlXG4gICAgICAgICAgICB2YXIgZGlmZmVyZW5jZSA9IExhenkoZmlsdGVyW3hdKS5kaWZmZXJlbmNlKGluZGV4ZXNbeF0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIGlmIChkaWZmZXJlbmNlLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgLy8gZ2VuZXJhdGUgbmV3IGZpbHRlclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBMYXp5KFtbeCwgZGlmZmVyZW5jZV1dKS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIC8vIHJlbWVtYmVyIGFza2VkXG4gICAgICAgICAgICAgICAgaWYgKCF0ZXN0T25seSlcbiAgICAgICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoaW5kZXhlc1t4XSwgZGlmZmVyZW5jZSk7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6JyArIEpTT04uc3RyaW5naWZ5KHJldCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZSBmaWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSArICdcXG5PdXQgOiBudWxsJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNsZWFuQ29tcG9zaXRlcyA9IGZ1bmN0aW9uKG1vZGVsLGZpbHRlcil7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBjbGVhbiBjb21wb3NpdGVBc2tlZFxuICAgICAgICAgKi9cbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29uZGl0aW9uYWwgYXNrZWQgaW5kZXhcbiAgICAgICAgaWYgKCEobW9kZWwubmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpIHsgY29tcG9zaXRlQXNrZWRbbW9kZWwubmFtZV0gPSBbXSB9O1xuICAgICAgICB2YXIgaW5kZXggPSBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXTtcbiAgICAgICAgLy8gc2VhcmNoIGZvciBhbGwgZWxlbWVudHMgd2hvIGhhdmUgc2FtZSBwYXJ0aWFsXG4gICAgICAgIHZhciBmaWx0ZXJMZW4gPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICB2YXIgaXRlbXMgPSBpbmRleC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnICYmICcsdHJ1ZSkpLmZpbHRlcihmdW5jdGlvbihpdGVtKXsgTGF6eShpdGVtKS5zaXplKCkgPiBmaWx0ZXJMZW4gfSk7XG4vLyAgICAgICAgY29uc29sZS5sb2coJ2RlbGV0aW5nIDonICsgSlNPTi5zdHJpbmdpZnkoaXRlbXMpKTtcbiAgICB9O1xuXG4gICAgdGhpcy5maWx0ZXIgPSBmdW5jdGlvbihtb2RlbCwgZmlsdGVyKXtcbi8vICAgICAgICBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0tLS0tXFxuZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikpO1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gbW9kZWwubW9kZWxOYW1lO1xuXG4gICAgICAgIC8vIGlmIHlvdSBmZXRjaCBhbGwgb2JqZWN0cyBmcm9tIHNlcnZlciwgdGhpcyBtb2RlbCBoYXMgdG8gYmUgbWFya2VkIGFzIGdvdCBhbGw7XG4gICAgICAgIHZhciBmaWx0ZXJMZW4gID0gTGF6eShmaWx0ZXIpLnNpemUoKTtcbiAgICAgICAgc3dpdGNoIChmaWx0ZXJMZW4pIHtcbiAgICAgICAgICAgIGNhc2UgMCA6IHtcbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gbnVsbCBvciBhbGxcbiAgICAgICAgICAgICAgICB2YXIgZ290ID0gZ290QWxsW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgZ290QWxsW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gYXNrZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYXNrZWRbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb3V0IDogbnVsbCAoZ290IGFsbCknKTtcbiAgICAgICAgICAgICAgICAvLyBjb25kaXRpb25hbCBjbGVhblxuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gY29tcG9zaXRlQXNrZWQpeyBcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChnb3QpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgMSA6IHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gZmlsdGVyU2luZ2xlLmNhbGwodGhpcywgbW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICAgICAgY2xlYW5Db21wb3NpdGVzLmNhbGwodGhpcywgbW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdmFyIHNpbmdsZSA9IExhenkoZmlsdGVyKS5rZXlzKCkuc29tZShmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciBmID0ge307XG4gICAgICAgICAgICBmW2tleV0gPSBmaWx0ZXJba2V5XTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXJTaW5nbGUuY2FsbCh0aHMsIG1vZGVsLCBmLCB0cnVlKSA9PSBudWxsO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHNpbmdsZSkgeyByZXR1cm4gbnVsbCB9XG4gICAgICAgIC8vIGxhenkgY3JlYXRlIGNvbXBvc2l0ZUFza2VkXG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpeyBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgLy8gZXhwbG9kZSBmaWx0ZXJcbiAgICAgICAgdmFyIGV4cGxvZGVkID0gZXhwbG9kZUZpbHRlcihmaWx0ZXIpO1xuICAgICAgICAvLyBjb2xsZWN0IHBhcnRpYWxzXG4gICAgICAgIHZhciBwYXJ0aWFscyA9IGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0uZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlciwgJyB8fCAnLHRydWUpKTtcbiAgICAgICAgLy8gY29sbGVjdCBtaXNzaW5ncyAoZXhwbG9kZWQgLSBwYXJ0aWFscylcbiAgICAgICAgaWYgKHBhcnRpYWxzLmxlbmd0aCl7XG4gICAgICAgICAgICB2YXIgYmFkICA9IFtdO1xuICAgICAgICAgICAgLy8gcGFydGlhbCBkaWZmZXJlbmNlXG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIHBhcnRpYWxzKXtcbiAgICAgICAgICAgICAgICBiYWQucHVzaC5hcHBseShiYWQsZXhwbG9kZWQuZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIHBhcnRpYWxzW3hdLCcgJiYgJywgdHJ1ZSkpKTtcbiAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgY29uc29sZS5sb2coJ2V4cGxvZGVkIC0gcGFydGlhbCA6ICcgKyBKU09OLnN0cmluZ2lmeShiYWQpKTtcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IExhenkoZXhwbG9kZWQpLmRpZmZlcmVuY2UoYmFkKS50b0FycmF5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBleHBsb2RlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZpbHRlciBwYXJ0aWFsc1xuICAgICAgICBpZiAobWlzc2luZ3MubGVuZ3RoKXtcbiAgICAgICAgICAgIGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0ucHVzaC5hcHBseShjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLG1pc3NpbmdzKTtcbiAgICAgICAgICAgIC8vIGFnZ3JlZ2F0ZSBtaXNzaW5nc1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gTGF6eShmaWx0ZXIpLmtleXMoKS5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gTGF6eShtaXNzaW5ncykucGx1Y2soa2V5KS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtrZXksIHJldC5sZW5ndGg/cmV0OmZpbHRlcltrZXldXTtcbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdXQgOiAnICsgSlNPTi5zdHJpbmdpZnkobWlzc2luZ3MpKTtcbiAgICAgICAgICAgIC8vIGNsZWFuIGNvbmRpdGlvbmFsXG4gICAgICAgICAgICBjbGVhbkNvbXBvc2l0ZXMobW9kZWwsIG1pc3NpbmdzKTtcbiAgICAgICAgICAgIHJldHVybiBtaXNzaW5ncztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRJbmRleEZvciA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmllbGROYW1lKXtcbiAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsTmFtZSArICcuJyArIGZpZWxkTmFtZTtcbiAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIGFza2VkKSl7XG4gICAgICAgICAgICBhc2tlZFtpbmRleE5hbWVdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFza2VkW2luZGV4TmFtZV07XG4gICAgfVxufTsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1hbnlUb01hbnlSZWxhdGlvbihyZWxhdGlvbixtMm0pe1xuICAgIHZhciBpdGVtcyA9IFtdO1xuICAgIHRoaXMuYWRkID0gaXRlbXMucHVzaC5iaW5kKGl0ZW1zKTtcbiAgICB0aGlzLmFkZCA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAvLyAgICAgIGNvbnNvbGUubG9nKCdhZGRpbmcgJyArIGl0ZW0pO1xuICAgICAgICBpZiAoIShMYXp5KGl0ZW1zKS5maW5kKGl0ZW0pKSl7XG4gICAgICAgICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5nZXQwID0gZnVuY3Rpb24oaWQpe1xuICAgICAgICBtMm1bMV0uYXNrKGlkKTtcbiAgICAgICAgcmV0dXJuIExhenkoaXRlbXMpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHJldHVybiB4WzBdID09PSBpZDtcbiAgICAgICAgfSkucGx1Y2soXCIxXCIpLnRvQXJyYXkoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXQxID0gZnVuY3Rpb24oaWQpe1xuICAgICAgICBtMm1bMF0uYXNrKGlkKTtcbiAgICAgICAgcmV0dXJuIExhenkoaXRlbXMpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHJldHVybiB4WzFdID09PSBpZDtcbiAgICAgICAgfSkucGx1Y2soXCIwXCIpLnRvQXJyYXkoKTtcbiAgICB9O1xuICAgIHRoaXNbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlbGF0aW9uLmluZGV4TmFtZS5zcGxpdCgnLycpWzFdKV0gPSB0aGlzLmdldDE7XG4gICAgdGhpc1snZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVsYXRpb24uaW5kZXhOYW1lLnNwbGl0KCcvJylbMF0pXSA9IHRoaXMuZ2V0MDtcblxuICAgIHRoaXMuZGVsID0gZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgIHZhciBsID0gaXRlbXMubGVuZ3RoO1xuICAgICAgICB2YXIgaWR4ID0gbnVsbDtcbiAgICAgICAgZm9yICh2YXIgYSA9IDA7IGEgPCBsOyBhKyspeyBcbiAgICAgICAgICAgIGlmICgoaXRlbXNbYV1bMF0gPT09IGl0ZW1bMF0pICYmIChpdGVtc1thXVsxXSA9PT0gaXRlbVsxXSkpe1xuICAgICAgICAgICAgICAgIGlkeCA9IGE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkeCl7XG4gICAgICAgICAgICBpdGVtcy5zcGxpY2UoYSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ2RlbGV0aW5nICcsIGl0ZW0pO1xuICAgIH07XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKHByb3RvLCBwcm9wZXJ0eU5hbWUsZ2V0dGVyLCBzZXR0ZXIpe1xuICAgIHZhciBldmVudHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsNCk7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIFxuICAgIExhenkoZXZlbnRzKS5lYWNoKGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgcHJvdG8ub3JtLm9uKGV2ZW50LGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXN1bHQgPSB7fTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIHByb3BlcnR5RGVmID0ge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGNhY2hlZCgpe1xuLy8gICAgICAgICAgICByZXR1cm4gZ2V0dGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgICBpZiAoISh0aGlzLmlkIGluIHJlc3VsdCkpe1xuICAgICAgICAgICAgICAgIHJlc3VsdFt0aGlzLmlkXSA9IGdldHRlci5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaWYgKHNldHRlcil7XG4gICAgICAgIHByb3BlcnR5RGVmWydzZXQnXSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgICAgIGlmICghaXNGaW5pdGUodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaWQgaW4gcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHRbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgICAgaWYgKHZhbHVlICE9PSByZXN1bHRbdGhpcy5pZF0pe1xuICAgICAgICAgICAgICAgIHNldHRlci5jYWxsKHRoaXMsdmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlkIGluIHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHRbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCBwcm9wZXJ0eU5hbWUscHJvcGVydHlEZWYpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IoZGF0YSl7XG4gICAgdGhpcy5yZXNvdXJjZSA9IGRhdGEuX3Jlc291cmNlO1xuICAgIHRoaXMuZm9ybUlkeCA9IGRhdGEuZm9ybUlkeDtcbiAgICB0aGlzLmZpZWxkcyA9IGRhdGEuZXJyb3JzO1xufVxudmFyIGJhc2VPUk0gPSBmdW5jdGlvbihvcHRpb25zLCBleHRPUk0pe1xuICAgIFxuICAgIC8vIGNyZWF0aW5nIHJld2hlZWwgY29ubmVjdGlvblxuICAgIGlmIChvcHRpb25zLmNvbnN0cnVjdG9yID09PSBTdHJpbmcpe1xuICAgICAgICB2YXIgY29ubmVjdGlvbiA9IG5ldyByZVdoZWVsQ29ubmVjdGlvbihvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuY29uc3RydWN0b3IgPT09IHV0aWxzLnJlV2hlZWxDb25uZWN0aW9uKXtcbiAgICAgICAgdmFyIGNvbm5lY3Rpb24gPSBvcHRpb25zO1xuICAgIH1cbiAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICAgIGNvbm5lY3Rpb24ub24oJ2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKCl7IFxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHRydWU7XG4gICAgfSk7XG4gICAgdGhpcy5vbiA9IGNvbm5lY3Rpb24ub247XG4gICAgdGhpcy5lbWl0ID0gY29ubmVjdGlvbi5lbWl0O1xuICAgIHRoaXMudW5iaW5kID0gY29ubmVjdGlvbi51bmJpbmQ7XG4gICAgdGhpcy5vbmNlID0gY29ubmVjdGlvbi5vbmNlO1xuICAgIHRoaXMuJHBvc3QgPSBjb25uZWN0aW9uLiRwb3N0LmJpbmQoY29ubmVjdGlvbik7XG5cbiAgICAvLyBoYW5kbGluZyB3ZWJzb2NrZXQgZXZlbnRzXG4gICAgdGhpcy5vbignd3MtY29ubmVjdGVkJyxmdW5jdGlvbih3cyl7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnV2Vic29ja2V0IGNvbm5lY3RlZCcpO1xuICAgICAgICAvLyBhbGwganNvbiBkYXRhIGhhcyB0byBiZSBwYXJzZWQgYnkgZ290RGF0YVxuICAgICAgICB3cy5vbk1lc3NhZ2VKc29uKFcyUFJFU09VUkNFLmdvdERhdGEuYmluZChXMlBSRVNPVVJDRSkpO1xuICAgICAgICAvL1xuICAgICAgICB3cy5vbk1lc3NhZ2VUZXh0KGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgICAgICAgY29uc29sZS5pbmZvKCdXUyBtZXNzYWdlIDogJyArIG1lc3NhZ2UpXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMub24oJ3dzLWRpc2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKHdzKXtcbiAgICAgICAgY29uc29sZS5lcnJvcignV2Vic29ja2V0IGRpc2Nvbm5lY3RlZCcpXG4gICAgfSk7XG4gICAgdGhpcy5vbignZXJyb3ItanNvbi00MDQnLGZ1bmN0aW9uKGVycm9yLHVybCwgc2VudERhdGEsIHhocil7IFxuICAgICAgICBjb25zb2xlLmVycm9yKCdKU09OIGVycm9yICcsIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XG4gICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbdXJsLnNwbGl0KCcvJylbMF1dO1xuICAgIH0pO1xuICAgIHRoaXMub24oJ3JlYWx0aW1lLW1lc3NhZ2UtanNvbicsIGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKG1lc3NhZ2UpO1xuICAgIH0pO1xuXG4gICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICB2YXIgVzJQUkVTT1VSQ0UgPSB0aGlzO1xuICAgIHZhciBJREIgPSB7YXV0aF9ncm91cCA6IExhenkoe30pfTsgLy8gdGFibGVOYW1lIC0+IGRhdGEgYXMgQXJyYXlcbiAgICB2YXIgSURYID0ge307IC8vIHRhYmxlTmFtZSAtPiBMYXp5KGluZGV4QnkoJ2lkJykpIC0+IElEQltkYXRhXVxuICAgIHZhciBSRVZJRFggPSB7fTsgLy8gdGFibGVOYW1lIC0+IGZpZWxkTmFtZSAtPiBMYXp5Lmdyb3VwQnkoKSAtPiBJREJbREFUQV1cbiAgICB2YXIgYnVpbGRlckhhbmRsZXJzID0ge307XG4gICAgdmFyIGJ1aWxkZXJIYW5kbGVyVXNlZCA9IHt9O1xuICAgIHZhciBwZXJzaXN0ZW50QXR0cmlidXRlcyA9IHt9O1xuICAgIHZhciBldmVudEhhbmRsZXJzID0ge307XG4gICAgdmFyIHBlcm1pc3Npb25XYWl0aW5nID0ge307XG4gICAgdmFyIG1vZGVsQ2FjaGUgPSB7fTtcbiAgICB2YXIgZmFpbGVkTW9kZWxzID0ge307XG4gICAgdmFyIHdhaXRpbmdDb25uZWN0aW9ucyA9IHt9IC8vIGFjdHVhbCBjb25uZWN0aW9uIHdobyBpJ20gd2FpdGluZyBmb3JcbiAgICB2YXIgbGlzdENhY2hlID0gbmV3IExpc3RDYWNoZXIoTGF6eSk7XG4gICAgdmFyIGxpbmtlciA9IG5ldyBBdXRvTGlua2VyKHdhaXRpbmdDb25uZWN0aW9ucyxJREIsIHRoaXMsIGxpc3RDYWNoZSk7XG4vKiAgICB3aW5kb3cubGwgPSBsaW5rZXI7XG4gICAgd2luZG93LmxjID0gbGlzdENhY2hlO1xuKi9cbiAgICB3aW5kb3cuSURCID0gSURCO1xuICAgIHRoaXMudmFsaWRhdGlvbkV2ZW50ID0gdGhpcy5vbignZXJyb3ItanNvbi01MTMnLCBmdW5jdGlvbihkYXRhLCB1cmwsIHNlbnREYXRhLCB4aHIpe1xuICAgICAgICBpZiAoY3VycmVudENvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyKXtcbiAgICAgICAgICAgIGN1cnJlbnRDb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlcihuZXcgVmFsaWRhdGlvbkVycm9yKGRhdGEpKTtcbiAgICAgICAgfVxuICAgIH0pXG5cbiAgICB2YXIgZ2V0SW5kZXggPSBmdW5jdGlvbiAoaW5kZXhOYW1lKSB7XG4gICAgICAgIGlmIChpbmRleE5hbWUgaW4gSURCKVxuICAgICAgICAgICAgcmV0dXJuIElEQltpbmRleE5hbWVdO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIElEQltpbmRleE5hbWVdID0gTGF6eSh7fSk7XG4gICAgICAgICAgICByZXR1cm4gSURCW2luZGV4TmFtZV07XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBnZXRVbmxpbmtlZCA9IGZ1bmN0aW9uIChpbmRleE5hbWUpIHtcbiAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBVTkxJTktFRClcbiAgICAgICAgICAgIHJldHVybiBVTkxJTktFRFtpbmRleE5hbWVdO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIFVOTElOS0VEW2luZGV4TmFtZV0gPSB7fTtcbiAgICAgICAgICAgIHJldHVybiBVTkxJTktFRFtpbmRleE5hbWVdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIFBlcm1pc3Npb25UYWJsZShpZCwga2xhc3MsIHBlcm1pc3Npb25zKSB7XG4gICAgICAgIC8vIGNyZWF0ZSBQZXJtaXNzaW9uVGFibGUgY2xhc3NcbiAgICAgICAgdGhpcy5rbGFzcyA9IGtsYXNzO1xuICAgICAgICB0aGlzLnBlcm1pc3Npb25zID0gW107XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgZm9yICh2YXIgayBpbiBwZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgdGhpcy5wdXNoLmFwcGx5KHRoaXMsIFtrLCBwZXJtaXNzaW9uc1trXV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIFBlcm1pc3Npb25UYWJsZS5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAvLyBzYXZlIE9iamVjdCB0byBzZXJ2ZXJcbiAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICBwZXJtaXNzaW9uczogTGF6eSh0aGlzLnBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3hbMF0uaWQsIHhbMV1dXG4gICAgICAgICAgICB9KS50b09iamVjdCgpXG4gICAgICAgIH07XG4gICAgICAgIGRhdGEuaWQgPSB0aGlzLmlkO1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gdGhpcy5rbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMua2xhc3MubW9kZWxOYW1lICsgJy9zZXRfcGVybWlzc2lvbnMnLCBkYXRhLCBmdW5jdGlvbiAobXlQZXJtcywgYSwgYiwgcmVxKSB7XG4gICAgICAgICAgICBjYihteVBlcm1zKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBQZXJtaXNzaW9uVGFibGUucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoZ3JvdXBfaWQsIHBlcm1pc3Npb25MaXN0KSB7XG4gICAgICAgIHZhciBwID0gTGF6eShwZXJtaXNzaW9uTGlzdCk7XG4gICAgICAgIHZhciBwZXJtcyA9IExhenkodGhpcy5rbGFzcy5hbGxQZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW3gsIHAuY29udGFpbnMoeCldXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIHZhciBsID0gTGF6eSh0aGlzLnBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4WzBdLmlkXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAobC5jb250YWlucyhncm91cF9pZCkpXG4gICAgICAgICAgICB0aGlzLnBlcm1pc3Npb25zW2wuaW5kZXhPZihncm91cF9pZCldWzFdID0gcGVybXM7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMucGVybWlzc2lvbnMucHVzaChbSURCLmF1dGhfZ3JvdXAuZ2V0KGdyb3VwX2lkKSwgcGVybXNdKTtcbiAgICB9O1xuXG4gICAgLy8gY3JlYXRlcyBkeW5hbWljYWwgbW9kZWxzXG4gICAgdmFyIG1ha2VNb2RlbENsYXNzID0gZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgIHZhciBfbW9kZWwgPSBtb2RlbDtcbiAgICAgICAgbW9kZWwuZmllbGRzLmlkLnJlYWRhYmxlID0gZmFsc2U7XG4gICAgICAgIG1vZGVsLmZpZWxkcy5pZC53cml0YWJsZSA9IGZhbHNlO1xuICAgICAgICB2YXIgZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpO1xuICAgICAgICBpZiAobW9kZWwucHJpdmF0ZUFyZ3MpIHtcbiAgICAgICAgICAgIGZpZWxkcyA9IGZpZWxkcy5tZXJnZShtb2RlbC5wcml2YXRlQXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbW9kZWwtZGVmaW5pdGlvbicsIG1vZGVsLCBnZXRJbmRleChtb2RlbC5uYW1lKSk7XG4gICAgICAgIC8vIGdldHRpbmcgZmllbGRzIG9mIHR5cGUgZGF0ZSBhbmQgZGF0ZXRpbWVcbi8qXG4gICAgICAgIHZhciBEQVRFRklFTERTID0gZmllbGRzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGdldHRpbmcgYm9vbGVhbiBmaWVsZHNcbiAgICAgICAgdmFyIEJPT0xGSUVMRFMgPSBmaWVsZHMuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHgudHlwZSA9PSAnYm9vbGVhbicpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGJvb2xlYW5zIGFuZCBkYXRldGltZXMgc3RvcmFnZSBleHRlcm5hbCBcbiAgICAgICAgTU9ERUxfREFURUZJRUxEU1ttb2RlbC5uYW1lXSA9IERBVEVGSUVMRFM7XG4gICAgICAgIE1PREVMX0JPT0xGSUVMRFNbbW9kZWwubmFtZV0gPSBCT09MRklFTERTO1xuKi9cbiAgICAgICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdmFyIGZ1bmNTdHJpbmcgPSBcImlmICghcm93KSB7IHJvdyA9IHt9fTtcXG5cIjtcbiAgICAgICAgZnVuY1N0cmluZyArPSBtb2RlbC5yZWZlcmVuY2VzLm1hcChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICByZXR1cm4gJ3RoaXMuXycgKyBmaWVsZC5pZCArICcgPSByb3cuJyArIGZpZWxkLmlkICsgJzsnO1xuICAgICAgICB9KS5qb2luKCc7XFxuJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBkYXRlZmllbGQgY29udmVyc2lvblxuICAgICAgICBmdW5jU3RyaW5nICs9IGZpZWxkcy5tYXAoZnVuY3Rpb24gKHgsaykge1xuICAgICAgICAgICAgaWYgKCh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gcm93LicgKyBrICsgJz9uZXcgRGF0ZShyb3cuJyArIGsgKyAnICogMTAwMCAtICcgKyB1dGlscy50ek9mZnNldCArICcpOm51bGw7XFxuJzsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHgudHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gKHJvdy4nICsgayArICcgPT09IFwiVFwiKSB8fCAocm93LicgKyBrICsgJyA9PT0gdHJ1ZSk7XFxuJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IHJvdy4nICsgayArICc7XFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudG9TdHJpbmcoJ1xcbicpOyArICdcXG4nO1xuXG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gXCJpZiAocGVybWlzc2lvbnMpIHt0aGlzLl9wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zICYmIExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkgeyByZXR1cm4gW3gsIHRydWVdIH0pLnRvT2JqZWN0KCk7fVwiXG5cbiAgICAgICAgXG4gICAgICAgIC8vIG1hc3RlciBjbGFzcyBmdW5jdGlvblxuICAgICAgICB2YXIgS2xhc3MgPSBuZXcgRnVuY3Rpb24oJ3JvdycsICdwZXJtaXNzaW9ucycsZnVuY1N0cmluZylcblxuICAgICAgICBLbGFzcy5wcm90b3R5cGUub3JtID0gZXh0T1JNO1xuICAgICAgICBLbGFzcy5yZWZfdHJhbnNsYXRpb25zID0ge307XG4gICAgICAgIEtsYXNzLm1vZGVsTmFtZSA9IG1vZGVsLm5hbWU7XG4gICAgICAgIEtsYXNzLnJlZmVyZW5jZXMgPSBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLnBsdWNrKCdpZCcpLnRvQXJyYXkoKTtcblxuICAgICAgICBLbGFzcy5pbnZlcnNlX3JlZmVyZW5jZXMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAvLyBtYW5hZ2luZyByZWZlcmVuY2VzIHdoZXJlIFxuICAgICAgICAgICAgcmV0dXJuIHguYnkgKyAnXycgKyB4LmlkICsgJ19zZXQnXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5yZWZlcmVudHMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW3guYnksIHguaWRdXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5maWVsZHNPcmRlciA9IG1vZGVsLmZpZWxkT3JkZXI7XG4gICAgICAgIEtsYXNzLmFsbFBlcm1pc3Npb25zID0gbW9kZWwucGVybWlzc2lvbnM7XG5cbiAgICAgICAgLy8gcmVkZWZpbmluZyB0b1N0cmluZyBtZXRob2RcbiAgICAgICAgaWYgKExhenkobW9kZWwucmVwcmVzZW50YXRpb24pLnNpemUoKSl7XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9TdHJpbmcgPSBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzLicgKyBMYXp5KG1vZGVsLnJlcHJlc2VudGF0aW9uKS50b1N0cmluZygnICsgXCIgXCIgKyB0aGlzLicpKTtcbiAgICAgICAgfVxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9VcHBlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyByZWRlZmluZSB0byBVcHBlckNhc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKTtcbiAgICAgICAgfTtcbiAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9Mb3dlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gZGVsZXRlIGluc3RhbmNlIGZyb20gc2VydmVyXG4gICAgICAgICAgICByZXR1cm4gZXh0T1JNLmRlbGV0ZSh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSwgW3RoaXMuaWRdKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBwZXJtaXNzaW9uIGdldHRlciBwcm9wZXJ0eVxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoS2xhc3MucHJvdG90eXBlLCAncGVybWlzc2lvbnMnLCB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcGVybWlzc2lvbnMpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLnBlcm1pc3Npb25zW3RoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lXS5hc2sodGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gZ2V0dGluZyBmdWxsIHBlcm1pc3Npb24gdGFibGUgZm9yIGFuIG9iamVjdFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuYWxsX3Blcm1zID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICB2YXIgb2JqZWN0X2lkID0gdGhpcy5pZDtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9hbGxfcGVybXMnLCB7aWQ6IHRoaXMuaWR9LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBwZXJtaXNzaW9ucyA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgdW5rbm93bl9ncm91cHMgPSBMYXp5KHBlcm1pc3Npb25zKS5wbHVjaygnZ3JvdXBfaWQnKS51bmlxdWUoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnICsgeFxuICAgICAgICAgICAgICAgIH0pLmRpZmZlcmVuY2UoSURCLmF1dGhfZ3JvdXAua2V5cygpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgTGF6eShwZXJtaXNzaW9ucykuZ3JvdXBCeShmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5ncm91cF9pZFxuICAgICAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBlZFtrXSA9IExhenkodikucGx1Y2soJ25hbWUnKS50b0FycmF5KClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKG5ldyBQZXJtaXNzaW9uVGFibGUob2JqZWN0X2lkLCBLbGFzcywgZ3JvdXBlZCkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKHVua25vd25fZ3JvdXBzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ2V0KCdhdXRoX2dyb3VwJyx1bmtub3duX2dyb3VwcyxjYWxsKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGNhbGwoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIHZhciBvID0gdGhpcy5hc1JhdygpO1xuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IEtsYXNzLmZpZWxkcztcbiAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICB2YXIgbW9kZWxOYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICBpZiAoYXJncykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGFyZyBpbiBhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG9bYXJnXSA9IGFyZ3NbYXJnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBlbGltaW5hdGUgdW53cml0YWJsZXNcbiAgICAgICAgICAgIExhenkoS2xhc3MuZmllbGRzT3JkZXIpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWZpZWxkc1t4XS53cml0YWJsZTtcbiAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24oZmllbGROYW1lKXtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGROYW1lIGluIG8pIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG9bZmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChJRCkgeyBvLmlkID0gSUQ7IH1cbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgKElEID8gJy9wb3N0JyA6ICcvcHV0JyksIG8pO1xuICAgICAgICAgICAgaWYgKGFyZ3MgJiYgKGFyZ3MuY29uc3RydWN0b3IgPT09IEZ1bmN0aW9uKSl7XG4gICAgICAgICAgICAgICAgLy8gcGxhY2luZyBjYWxsYmFjayBpbiBhIGNvbW1vbiBwbGFjZVxuICAgICAgICAgICAgICAgIHByb21pc2UuY29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIgPSBhcmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2VcbiAgICAgICAgfTtcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb2JqID0gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy5hc1JhdygpKTtcbiAgICAgICAgICAgIG9iai5fcGVybWlzc2lvbnMgPSB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYnVpbGRpbmcgc2VyaWFsaXphdGlvbiBmdW5jdGlvblxuICAgICAgICB2YXIgYXNyID0gJ3JldHVybiB7XFxuJyArIExhenkobW9kZWwucmVmZXJlbmNlcykubWFwKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHJldHVybiBmaWVsZC5pZCArICcgOiB0aGlzLl8nICsgZmllbGQuaWQ7XG4gICAgICAgIH0pLmNvbmNhdChmaWVsZHMubWFwKGZ1bmN0aW9uICh4LGspIHtcbiAgICAgICAgICAgIGlmICgoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogKHRoaXMuJyArIGsgKyAnPyhNYXRoLnJvdW5kKHRoaXMuJyArIGsgKyAnLmdldFRpbWUoKSAtIHRoaXMuJyArIGsgKyAnLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCkgLyAxMDAwKTpudWxsKSc7IFxuICAgICAgICAgICAgfSBlbHNlIGlmICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogdGhpcy4nICsgayArICc/XCJUXCI6XCJGXCInO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiB0aGlzLicgKyBrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSkudG9TdHJpbmcoJyxcXG4nKSArICd9Oyc7XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5hc1JhdyA9IG5ldyBGdW5jdGlvbihhc3IpO1xuXG4gICAgICAgIEtsYXNzLnNhdmVNdWx0aSA9IGZ1bmN0aW9uIChvYmplY3RzLCBjYiwgc2NvcGUpIHtcbiAgICAgICAgICAgIHZhciByYXcgPSBbXTtcbiAgICAgICAgICAgIHZhciBkZWxldGFibGUgPSBMYXp5KEtsYXNzLmZpZWxkcylcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAheC53cml0YWJsZVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnBsdWNrKCdpZCcpXG4gICAgICAgICAgICAgICAgLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIExhenkob2JqZWN0cylcbiAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmFzUmF3KClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIExhenkoZGVsZXRhYmxlKS5lYWNoKGZ1bmN0aW9uICh5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgeFt5XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJhdy5wdXNoKHgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lLCAncHV0Jywge211bHRpcGxlOiByYXcsIGZvcm1JZHggOiBXMlBSRVNPVVJDRS5mb3JtSWR4Kyt9LCBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGVsZW1zKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFiID0gSURCW0tsYXNzLm1vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgdmFyIG9ianMgPSBMYXp5KGVsZW1zW0tsYXNzLm1vZGVsTmFtZV0ucmVzdWx0cykucGx1Y2soJ2lkJykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YWIuZ2V0KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICAgICAgICBjYihvYmpzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBzY29wZSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmICgnZXh0cmFfdmVyYnMnIGluIG1vZGVsKVxuICAgICAgICAgICAgTGF6eShtb2RlbC5leHRyYV92ZXJicykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHZhciBmdW5jTmFtZSA9IHhbMF07XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSB4WzFdO1xuICAgICAgICAgICAgICAgIHZhciBkZGF0YSA9ICdkYXRhID0ge2lkIDogdGhpcy5pZCc7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBkZGF0YSArPSAnLCAnICsgTGF6eShhcmdzKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geCArICcgOiAnICsgeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJywnKTtcbiAgICAgICAgICAgICAgICBkZGF0YSArPSAnfTsnO1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCgnY2InKTtcbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbZnVuY05hbWVdID0gbmV3IEZ1bmN0aW9uKGFyZ3MsIGRkYXRhICsgJ1cyUy5XMlBfUE9TVCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSxcIicgKyBmdW5jTmFtZSArICdcIiwgZGF0YSxmdW5jdGlvbihkYXRhLHN0YXR1cyxoZWFkZXJzLHgpeycgK1xuICAgICAgICAgICAgICAgICAgICAndHJ5e1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAnICAgaWYgKCFoZWFkZXJzKFwibm9tb2RlbFwiKSkge3dpbmRvdy5XMlMuZ290RGF0YShkYXRhLGNiKTt9XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICcgICBlbHNlIHtpZiAoY2IpIHtjYihkYXRhKX19XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICd9IGNhdGNoKGUpe1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAnaWYgKGNiKSB7Y2IoZGF0YSk7fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfSk7XFxuJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKCdwcml2YXRlQXJncycgaW4gbW9kZWwpIHtcbiAgICAgICAgICAgIEtsYXNzLnByaXZhdGVBcmdzID0gTGF6eShtb2RlbC5wcml2YXRlQXJncykua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgdHJ1ZV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmVQQSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgdmFyIFQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBvbyA9IHtpZDogdGhpcy5pZH07XG4gICAgICAgICAgICAgICAgdmFyIFBBID0gdGhpcy5jb25zdHJ1Y3Rvci5wcml2YXRlQXJncztcbiAgICAgICAgICAgICAgICB2YXIgRnMgPSB0aGlzLmNvbnN0cnVjdG9yLmZpZWxkcztcbiAgICAgICAgICAgICAgICB2YXIgdCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG8pLmFzUmF3KCk7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkSWR4ID0gTGF6eShQQSkua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIEZzW3hdXVxuICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgTGF6eShvKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoayBpbiBQQSkgJiYgZmllbGRJZHhba10ud3JpdGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9vW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9zYXZlUEEnLCBvbywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG9vKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBUW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbW9kZWxDYWNoZVtLbGFzcy5tb2RlbE5hbWVdID0gS2xhc3M7XG4gICAgICAgIC8vIGFkZGluZyBpZCB0byBmaWVsZHNcbiAgICAgICAgZm9yICh2YXIgZiBpbiBtb2RlbC5maWVsZHMpIHtcbiAgICAgICAgICAgIG1vZGVsLmZpZWxkc1tmXS5pZCA9IGY7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MuZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpLmNvbmNhdChMYXp5KG1vZGVsLnByaXZhdGVBcmdzKSkuY29uY2F0KExhenkobW9kZWwucmVmZXJlbmNlcykudGFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICB4LnR5cGUgPSB4LnR5cGUgfHwgJ3JlZmVyZW5jZSdcbiAgICAgICAgfSkpLmluZGV4QnkoJ2lkJykudG9PYmplY3QoKTtcbiAgICAgICAgLy8gc2V0dGluZyB3aWRnZXRzIGZvciBmaWVsZHNcbiAgICAgICAgTGF6eShLbGFzcy5maWVsZHMpLmVhY2goZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgaWYgKCFmaWVsZC53aWRnZXQpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZC50eXBlID09PSAncmVmZXJlbmNlJyl7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9ICdjaG9pY2VzJ1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9IGZpZWxkLnR5cGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAobWFueSB0byBvbmUpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGV4dF9yZWYgPSByZWYudG87XG4gICAgICAgICAgICB2YXIgbG9jYWxfcmVmID0gJ18nICsgcmVmLmlkO1xuICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5pZCxmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzW2xvY2FsX3JlZl0pIHsgcmV0dXJuIG51bGwgfTtcbiAgICAgICAgICAgICAgICBpZiAoIShleHRfcmVmIGluIElEQikpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUoZXh0X3JlZixmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtlci5tYWluSW5kZXhbZXh0X3JlZl0uYXNrKHRoc1tsb2NhbF9yZWZdLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IChleHRfcmVmIGluIElEQikgJiYgdGhpc1tsb2NhbF9yZWZdICYmIElEQltleHRfcmVmXS5nZXQodGhpc1tsb2NhbF9yZWZdKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdCAmJiAoZXh0X3JlZiBpbiBsaW5rZXIubWFpbkluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBhc2tpbmcgdG8gbGlua2VyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpc1tsb2NhbF9yZWZdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLm1haW5JbmRleFtleHRfcmVmXS5hc2sodGhpc1tsb2NhbF9yZWZdLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdudWxsIHJlZmVyZW5jZSBmb3IgJyArIGxvY2FsX3JlZiArICcoJyArIHRoaXMuaWQgKyAnKSByZXNvdXJjZSAnICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXRpbHMubW9jaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHZhbHVlLmNvbnN0cnVjdG9yICE9PSB1dGlscy5tb2NrKSAmJiAodmFsdWUuY29uc3RydWN0b3IubW9kZWxOYW1lICE9PSBleHRfcmVmKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IGNhbiBhc3NpZ24gb25seSAnICsgZXh0X3JlZiArICcgdG8gJyArIHJlZi5pZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpc1tsb2NhbF9yZWZdID0gdmFsdWUuaWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tsb2NhbF9yZWZdID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAnbmV3LScgKyBleHRfcmVmLCAnZGVsZXRlZC0nICsgZXh0X3JlZiwndXBkYXRlZC0nICsgZXh0X3JlZiwgJ25ldy1tb2RlbC0nICsgZXh0X3JlZi8qLCAndXBkYXRlZC0nICsgS2xhc3MubW9kZWxOYW1lKi8pO1xuXG5cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVmLmlkKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5nZXQoZXh0X3JlZix0aGlzW2xvY2FsX3JlZl0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9idWlsZGluZyByZWZlcmVuY2VzIHRvIChvbmUgdG8gbWFueSkgZmllbGRzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSByZWYuYnkgKyAnLicgKyByZWYuaWQ7XG4gICAgICAgICAgICB2YXIgcHJvcGVydHlOYW1lID0gcmVmLmJ5ICsgJ18nICsgdXRpbHMucGx1cmFsaXplKHJlZi5pZCk7XG4gICAgICAgICAgICB2YXIgcmV2SW5kZXggPSByZWYuYnk7XG4gICAgICAgICAgICBpZiAoS2xhc3MucHJvdG90eXBlLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcnllZCB0byByZWRlZmluZSBwcm9wZXJ0eSAnICsgcHJvcGVydHlOYW1lICsgJ3MnICsgJyBmb3IgJyArIEtsYXNzLm1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCBwcm9wZXJ0eU5hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IChyZXZJbmRleCBpbiBJREIpID8gUkVWSURYW2luZGV4TmFtZV0uZ2V0KHRoaXMuaWQgKyAnJyk6bnVsbDtcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLmZvcmVpZ25LZXlzW2luZGV4TmFtZV0uYXNrKHRoaXMuaWQsdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgfSwgbnVsbCwgJ25ldy0nICsgcmV2SW5kZXgsICd1cGRhdGVkLScgKyByZXZJbmRleCwgJ2RlbGV0ZWQtJyArIHJldkluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUodXRpbHMucGx1cmFsaXplKHJlZi5ieSkpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0cyA9IHt9O1xuICAgICAgICAgICAgICAgIG9wdHNbcmVmLmlkXSA9IFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0T1JNLmdldChyZWYuYnksb3B0cyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2J1aWxkaW5nIHJlZmVyZW5jZSB0byAobWFueSB0byBtYW55KSBmaWVsZHNcbiAgICAgICAgaWYgKG1vZGVsLm1hbnlUb01hbnkpIHtcbiAgICAgICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHJlZi5pbmRleE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcmVmLmZpcnN0PyAwIDogMTtcbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsTmFtZSA9IHJlZi5tb2RlbDtcbi8vICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBnZXRJbmRleChvbW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgZ2V0dGVyID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyAoMSAtIGZpcnN0KV07XG5cbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcmVmLm1vZGVsICsgJ3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZXQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0ID0gZ2V0SW5kZXgob21vZGVsTmFtZSkuZ2V0LmJpbmQoSURCW29tb2RlbE5hbWVdKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcyAmJiBnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0ID0gTGF6eShpZHMpLm1hcChnZXQpLmZpbHRlcih1dGlscy5ib29sKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgICAgICB9LCBudWxsLCAncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUsICdyZWNlaXZlZC0nICsgb21vZGVsTmFtZSk7XG5cbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShvbW9kZWxOYW1lKSldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLmdldE0yTShpbmRleE5hbWUsIFt0aHMuaWRdLCBmaXJzdCxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGdldHRlcih0aHMuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChvbW9kZWxOYW1lLCB7aWQgOiBpZHN9LG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gSURCW29tb2RlbE5hbWVdLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KFtdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgICAgIEtsYXNzLmZpZWxkc1t1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICByZWFkYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ00yTScsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcnM6IFtdXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS51bmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IFtbSUQsIGluc3RhbmNlLmlkXV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL2RlbGV0ZScsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUubGlua1JlZmVyZW5jZSA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lID09ICdBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZXMgPSBpbnN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBpbnN0YW5jZXNbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJTkRFWF9NMk0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZnMgPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykuZGlmZmVyZW5jZShMYXp5KElOREVYX00yTVtpbmRleE5hbWVdWzBdLmdldCh0aGlzLmlkKSkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBvbW9kZWwgKyAnLycgKyBLbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlZnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkocmVmcykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtJRCwgeF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUF9QT1NUKEtsYXNzLm1vZGVsTmFtZSwgb21vZGVsICsgJ3MvcHV0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGluZGV4TmFtZSBpbiBsaW5rZXIubTJtSW5kZXgpICYmIExhenkobGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKG9tb2RlbCldKGluc3RhbmNlLmlkKSkuZmluZCh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL3B1dCcsIHtjb2xsZWN0aW9uOiBbW3RoaXMuaWQsIGluc3RhbmNlLmlkXV19KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ25ldy1tb2RlbCcsIEtsYXNzKTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbmV3LW1vZGVsLScgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICByZXR1cm4gS2xhc3M7XG4gICAgfTtcblxuICAgIHRoaXMuZ290RGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBjYWxsQmFjaykge1xuICAgICAgICAvLyByZWNlaXZlIGFsbCBkYXRhIGZyb20gZXZlcnkgZW5kIHBvaW50XG4gICAgICAgIGNvbnNvbGUuaW5mbygnZ290RGF0YScpO1xuICAgICAgICBpZiAodHlwZW9mKGRhdGEpID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGF0YSAnICsgZGF0YSArICcgcmVmdXNlZCBmcm9tIGdvdERhdGEoKScpO1xuICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNsZWFuIGRhdGEgZnJvbSByZWxhdGlvbnMgYW5kIHBlcm1pc3Npb25zIGZvciB1c2luZyBpdCBhZnRlciBtb2RlbCBwYXJzaW5nXG4gICAgICAgIGlmICgnX2V4dHJhJyBpbiBkYXRhKXsgZGVsZXRlIGRhdGEuX2V4dHJhIH1cbiAgICAgICAgdmFyIFRPT05FID0gZGF0YS5UT09ORTtcbiAgICAgICAgdmFyIFRPTUFOWSA9IGRhdGEuVE9NQU5ZO1xuICAgICAgICB2YXIgTUFOWVRPTUFOWSA9IGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgdmFyIFBFUk1JU1NJT05TID0gZGF0YS5QRVJNSVNTSU9OUztcbiAgICAgICAgdmFyIFBBID0gZGF0YS5QQTtcbiAgICAgICAgZGVsZXRlIGRhdGEuVE9PTkU7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBBO1xuICAgICAgICBpZiAoIVBBKSB7IFBBID0ge307IH1cblxuICAgICAgICAvLyBjbGVhbmluZyBmcm9tIHVzZWxlc3MgZGVsZXRlZCBkYXRhXG4gICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLmZpbHRlcihmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgcmV0dXJuICghKCdkZWxldGVkJyBpbiB2KSB8fCAoKGsgaW4gbW9kZWxDYWNoZSkpKTtcbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgnbTJtJyBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbTJtID0gZGF0YS5tMm07XG4gICAgICAgICAgICBkZWxldGUgZGF0YVsnbTJtJ107XG4gICAgICAgIH1cbiAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uIChkYXRhLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsQ2xhc3MgPSBtb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXN1bHRzICYmIChkYXRhLnJlc3VsdHMubGVuZ3RoID4gMCkgJiYgKGRhdGEucmVzdWx0c1swXS5jb25zdHJ1Y3RvciA9PSBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMYXp5KG1vZGVsQ2xhc3MuZmllbGRzT3JkZXIpLnppcCh4KS50b09iamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBMYXp5KGRhdGEucmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgdmFyIGRlbGV0ZWQgPSBkYXRhLmRlbGV0ZWQ7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBQQSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgTVBBID0gUEFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShyZXN1bHRzKS5lYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmQuaWQgaW4gTVBBKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShNUEFbcmVjb3JkLmlkXSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGluZGV4aW5nIHJlZmVyZW5jZXMgYnkgaXRzIElEXG4gICAgICAgICAgICAgICAgdmFyIGl0YWIgPSBnZXRJbmRleChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZSA9IGl0YWIuc291cmNlO1xuXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGVkLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGFibGVbeF07XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuLypcbiAgICAgICAgICAgICAgICBMYXp5KGRlbGV0ZWQpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgIH0pO1xuKi9cbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gcmVzdWx0cy5pbmRleEJ5KCdpZCcpO1xuICAgICAgICAgICAgICAgIHZhciBpayA9IGlkeC5rZXlzKCk7XG4gICAgICAgICAgICAgICAgdmFyIG5uZXcgPSBpay5kaWZmZXJlbmNlKGl0YWIua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWQgPSBpay5kaWZmZXJlbmNlKG5uZXcpO1xuICAgICAgICAgICAgICAgIC8vIHJlbW92aW5nIG9sZCBpZGVudGljYWwgdmFsdWVzXG4gICAgICAgICAgICAgICAgdXBkYXRlZCA9IHVwZGF0ZWQuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhdXRpbHMuc2FtZUFzKGlkeC5nZXQoeCksIGl0YWIuZ2V0KHgpLmFzUmF3KCkpO1xuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvLyBjbGFzc2lmeSByZWNvcmRzXG4gICAgICAgICAgICAgICAgdmFyIHBlcm1zID0gZGF0YS5wZXJtaXNzaW9ucyA/IExhenkoZGF0YS5wZXJtaXNzaW9ucykgOiBMYXp5KHt9KTtcbiAgICAgICAgICAgICAgICB2YXIgbmV3T2JqZWN0cyA9IG5uZXcubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgbW9kZWxDbGFzcyhpZHguZ2V0KHgpLCBwZXJtcy5nZXQoeCkpXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLy8vIGNsYXNzaWZ5aW5nIHVwZGF0ZWRcbiAgICAgICAgICAgICAgICAvL3ZhciB1cGRhdGVkT2JqZWN0cyA9IHVwZGF0ZWQubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBuZXcgbW9kZWxDbGFzcyhpZHguZ2V0KHgpLHBlcm1zLmdldCh4KSl9KTtcbiAgICAgICAgICAgICAgICAvL3ZhciB1byA9IHVwZGF0ZWRPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvL3VwZGF0ZWRPYmplY3RzID0gTGF6eSh1bykubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBbeCx0YWJsZVt4LmlkXV19KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRpbmcgc2luZ2xlIG9iamVjdHNcbiAgICAgICAgICAgICAgICB2YXIgY2hhbmdlZCA9IFtdO1xuLy8gICAgICAgICAgICAgICAgdmFyIERBVEVGSUVMRFMgPSBNT0RFTF9EQVRFRklFTERTW21vZGVsTmFtZV07XG4vLyAgICAgICAgICAgICAgICB2YXIgQk9PTEZJRUxEUyA9IE1PREVMX0JPT0xGSUVMRFNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB2YXIgbW9kZWxSZWZlcmVuY2VzID0gTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5tYXAoZnVuY3Rpb24oaykgeyByZXR1cm4gW2ssMV19KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQuZm9yRWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSXRlbSA9IHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ29weSA9IG9sZEl0ZW0uY29weSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3SXRlbSA9IGlkeC5nZXQoeCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGluZyBlYWNoIGF0dHJpYnV0ZSBzaW5ndWxhcmx5XG5cbiAgICAgICAgICAgICAgICAgICAgTGF6eShtb2RlbC5maWVsZHMpLmVhY2goZnVuY3Rpb24oZmllbGQsIGZpZWxkTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGZpZWxkLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdyZWZlcmVuY2UnIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtWydfJyArIGZpZWxkTmFtZV0gPSBuZXdJdGVtW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5hTiBpcyBjb252bnRpb25hbGx5IGEgY2FjaGUgZGVsZXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtW2ZpZWxkTmFtZV0gPSBOYU47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdkYXRlJzoge29sZEl0ZW1bZmllbGROYW1lXSA9IG5ldyBEYXRlKG5ld0l0ZW1bZmllbGROYW1lXSAqIDEwMDApOyBicmVha307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGF0ZXRpbWUnOiB7b2xkSXRlbVtmaWVsZE5hbWVdID0gbmV3IERhdGUobmV3SXRlbVtmaWVsZE5hbWVdICogMTAwMCk7IGJyZWFrfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJyA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChuZXdJdGVtW2ZpZWxkTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgbnVsbCA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gbnVsbDsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdUJyA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gdHJ1ZTsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdGJyA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gZmFsc2U7IGJyZWFrOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0cnVlIDogeyBvbGRJdGVtW2ZpZWxkTmFtZV0gPSB0cnVlOyBicmVhazsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgZmFsc2UgOiB7IG9sZEl0ZW1bZmllbGROYW1lXSA9IGZhbHNlOyBicmVhazsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHtvbGRJdGVtW2ZpZWxkTmFtZV0gPSBuZXdJdGVtW2ZpZWxkTmFtZV19XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICAgICAgICAgIG9sZEl0ZW1bZmllbGROYW1lXSA9IG5ld0l0ZW1bZmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChbbmV3SXRlbSwgb2xkQ29weV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBzZW5kaW5nIHNpZ25hbCBmb3IgdXBkYXRlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAoY2hhbmdlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgndXBkYXRlZC0nICsgbW9kZWxOYW1lLCBjaGFuZ2VkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8qKioqKioqKiBVcGRhdGUgdW5pdmVyc2UgKioqKioqKipcbiAgICAgICAgICAgICAgICB2YXIgbm8gPSBuZXdPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KG5vKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRhYmxlW3guaWRdID0geFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHJlYnVsZGluZyByZXZlcnNlIGluZGV4ZXNcbiAgICAgICAgICAgICAgICBMYXp5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXS5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgICAgICAgICAgUkVWSURYW21vZGVsTmFtZSArICcuJyArIHJlZl0gPSBJREJbbW9kZWxOYW1lXS5ncm91cEJ5KCdfJyArIHJlZik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIG5ldyB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAobm8ubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCduZXctJyArIG1vZGVsTmFtZSwgTGF6eShubyksIGRhdGEudG90YWxSZXN1bHRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdkZWxldGVkLScgKyBtb2RlbE5hbWUsIGRlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgZGF0YSBhcnJpdmVkXG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtJyArIG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbi8qICAgICAgICBcbiAgICAgICAgaWYgKFRPT05FKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUT09ORScpO1xuICAgICAgICAgICAgTGF6eShUT09ORSkuZWFjaChmdW5jdGlvbiAodmFscywgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgdWR4ID0gZ2V0VW5saW5rZWQobW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChUT01BTlkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RPTUFOWScpO1xuICAgICAgICAgICAgTGF6eShUT01BTlkpLmVhY2goZnVuY3Rpb24gKHZhbHMsIGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBBU0tFRF9VTkxJTktFRCkpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfVU5MSU5LRURbaW5kZXhOYW1lXSA9IExhenkoW10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBMYXp5KHZhbHMpLmVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX1VOTElOS0VEW2luZGV4TmFtZV0uc291cmNlLnB1c2goaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE1BTllUT01BTlkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ01BTllUT01BTlknKTtcbiAgICAgICAgICAgIExhenkoTUFOWVRPTUFOWSkuZWFjaChmdW5jdGlvbiAodmFscywgaW5kZXhOYW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcGFyc2VJbnQoaW5kZXhOYW1lLnNwbGl0KCd8JylbMV0pO1xuICAgICAgICAgICAgICAgIGluZGV4TmFtZSA9IGluZGV4TmFtZS5zcGxpdCgnfCcpWzBdO1xuICAgICAgICAgICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBBU0tFRF9NMk0pKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX00yTVtpbmRleE5hbWVdID0gW3t9LCB7fV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBNSURYID0gQVNLRURfTTJNW2luZGV4TmFtZV1bZmlyc3RdO1xuICAgICAgICAgICAgICAgIExhenkodmFscykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBNSURYW3ggKyAnJ10gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBNSURYW3hdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICBcbiovXG4gICAgICAgIGlmIChtMm0pIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdE0yTShtMm0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChQRVJNSVNTSU9OUykge1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoUEVSTUlTU0lPTlMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdnb3QtZGF0YScpO1xuICAgIH07XG4gICAgdGhpcy5nb3RQZXJtaXNzaW9ucyA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbiAodiwgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBMYXp5KHZbMF0pLmVhY2goZnVuY3Rpb24gKHJvdywgaWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoKHJlc291cmNlTmFtZSBpbiBJREIpICYmIChpZCBpbiBJREJbcmVzb3VyY2VOYW1lXS5zb3VyY2UpKXtcbiAgICAgICAgICAgICAgICAgICAgSURCW3Jlc291cmNlTmFtZV0uZ2V0KGlkKS5fcGVybWlzc2lvbnMgPSBMYXp5KHJvdykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHRydWVdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoTGF6eSh2WzBdKS5zaXplKCkpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3VwZGF0ZS1wZXJtaXNzaW9ucy0nICsgcmVzb3VyY2VOYW1lLCBMYXp5KHZbMF0pLmtleXMoKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMnKTtcbiAgICB9O1xuXG5cbiAgICB0aGlzLmdvdE0yTSA9IGZ1bmN0aW9uKG0ybSl7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICB2YXIgbTJtSW5kZXggPSBsaW5rZXIubTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbihtKXtcbiAgICAgICAgICAgICAgICBMYXp5KG0pLmVhY2goZnVuY3Rpb24oZGF0YSx2ZXJiKXtcbiAgICAgICAgICAgICAgICAgICAgbTJtSW5kZXhbdmVyYl0oZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLW0ybScpO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmZldGNoID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spIHsgIC8vXG4gICAgICAgIC8vIGlmIGEgY29ubmVjdGlvbiBpcyBjdXJyZW50bHkgcnVubmluZywgd2FpdCBmb3IgY29ubmVjdGlvbi5cbiAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpe1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spO1xuICAgICAgICAgICAgfSw1MDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZmV0Y2hpbmcgYXN5bmNocm9tb3VzIG1vZGVsIGZyb20gc2VydmVyXG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIChmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgICAgICAgICAgLy8gaWYgZGF0YSBjYW1lcyBmcm9tIHJlYWx0aW1lIGNvbm5lY3Rpb25cbiAgICAgICAgICAgICAgICBpZiAoVzJQUkVTT1VSQ0UuY29ubmVjdGlvbi5jYWNoZWRTdGF0dXMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBnZXR0aW5nIGZpbHRlciBmaWx0ZXJlZCBieSBjYWNoaW5nIHN5c3RlbVxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXIgPSBsaXN0Q2FjaGUuZmlsdGVyKG1vZGVsLGZpbHRlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgc29tdGhpbmcgaXMgbWlzc2luZyBvbiBteSBsb2NhbCBEQiBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbHRlcil7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhc2sgZm9yIG1pc3NpbmdzIGFuZCBwYXJzZSBzZXJ2ZXIgcmVzcG9uc2UgaW4gb3JkZXIgdG8gZW5yaWNoIG15IGxvY2FsIERCLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGxhY2luZyBsb2NrIGZvciB0aGlzIG1vZGVsXG4gICAgICAgICAgICAgICAgICAgICAgICB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChtb2RlbE5hbWUgKyAnL2xpc3QnLCB7ZmlsdGVyIDogZmlsdGVyfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShkYXRhLGNhbGxCYWNrKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWxlYXNlIGxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHJldCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgbG9ja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2xpc3QnLCBzZW5kRGF0YSxmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdPVF9BTEwuc291cmNlLnB1c2gobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShkYXRhLCBjYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmdldCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzLCBjYWxsQmFjayl7XG4gICAgICAgIC8vIHNlYXJjaCBvYmplY3RzIGZyb20gSURCLiBJZiBzb21lIGlkIGlzIG1pc3NpbmcsIGl0IHJlc29sdmUgaXQgYnkgdGhlIHNlcnZlclxuICAgICAgICAvLyBpZiBhIHJlcXVlc3QgdG8gdGhlIHNhbWUgbW9kZWwgaXMgcGVuZGluZywgd2FpdCBmb3IgaXRzIGNvbXBsZXRpb25cbiAgICAgICAgXG4gICAgICAgIGlmIChpZHMuY29uc3RydWN0b3IgIT09IEFycmF5KXtcbiAgICAgICAgICAgIGlkcyA9IFtpZHNdO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIHNvbWUgZW50aXR5IGlzIG1pc3NpbmcgXG4gICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSAsIHtpZDogaWRzfSwgbnVsbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgdmFyIGl0YWIgPSBJREJbbW9kZWxOYW1lXVxuICAgICAgICAgICAgZm9yICh2YXIgaWQgaW4gaWRzKXtcbiAgICAgICAgICAgICAgICByZXQucHVzaChpdGFiLnNvdXJjZVtpZHNbaWRdXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsQmFjayhyZXQpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5nb3RNb2RlbCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGZvciAodmFyIG1vZGVsTmFtZSBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSBkYXRhW21vZGVsTmFtZV07XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2VbJ2Rlc2NyaXB0aW9uOicgKyBtb2RlbE5hbWVdID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBtb2RlbENhY2hlW21vZGVsTmFtZV0gPSBtYWtlTW9kZWxDbGFzcyhtb2RlbCk7XG4gICAgICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gSURCKSkge1xuICAgICAgICAgICAgICAgIElEQlttb2RlbE5hbWVdID0gTGF6eSh7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5kZXNjcmliZSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgY2FsbEJhY2spe1xuICAgICAgICB2YXIgcmV0ID0gbW9kZWxDYWNoZVttb2RlbE5hbWVdO1xuICAgICAgICBpZiAocmV0KSB7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhyZXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHdhaXRpbmdDb25uZWN0aW9ucykpe1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gZmFpbGVkTW9kZWxzKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBjYWNoZUtleSA9ICdkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChjYWNoZUtleSBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nb3RNb2RlbChKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVtjYWNoZUtleV0pKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sobW9kZWxDYWNoZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9kZXNjcmliZScsbnVsbCwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RNb2RlbChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbE5vdEZvdW5kLmhhbmRsZShtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbGVkTW9kZWxzW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGNvbm5lY3Rpb25cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gICAgICAgIFxuICAgIH07XG4gICAgdGhpcy5hZGRNb2RlbEhhbmRsZXIgPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBkZWNvcmF0b3IpIHtcbiAgICAgICAgdmFyIGtleSA9IHV0aWxzLmhhc2goZGVjb3JhdG9yKTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVycykpIGJ1aWxkZXJIYW5kbGVyc1ttb2RlbE5hbWVdID0gbmV3IEhhbmRsZXIoKTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVyVXNlZCkpIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdID0ge307XG4gICAgICAgIGlmIChrZXkgaW4gYnVpbGRlckhhbmRsZXJVc2VkW21vZGVsTmFtZV0pe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVpbGRlckhhbmRsZXJVc2VkW21vZGVsTmFtZV1ba2V5XSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBtb2RlbENhY2hlKSB7XG4gICAgICAgICAgICBkZWNvcmF0b3IobW9kZWxDYWNoZVttb2RlbE5hbWVdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyc1ttb2RlbE5hbWVdLmFkZEhhbmRsZXIoZGVjb3JhdG9yKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgYXR0cmlidXRlcyl7XG4gICAgICAgIHZhciBhZGRQcm9wZXJ0eSA9IGZ1bmN0aW9uKG1vZGVsLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgYXR0cmlidXRlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbCl7XG4gICAgICAgICAgICB2YXIga2V5ID0gJ3BBOicgKyBtb2RlbC5tb2RlbE5hbWUgKyAnOicgKyB2YWw7XG4gICAgICAgICAgICB2YXIga2F0dHIgPSAnX18nICsgdmFsO1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG1vZGVsLnByb3RvdHlwZSwgdmFsLCB7XG4gICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIShrYXR0ciBpbiB0aGlzKSl7XG4gICAgICAgICAgICAgICAgICB2YXIgdiA9IGxvY2FsU3RvcmFnZVtrZXkgKyB0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICAgIHRoaXNba2F0dHJdID0gdj9KU09OLnBhcnNlKHYpOm51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW2thdHRyXTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgICAgICAgICAgdGhpc1trYXR0cl0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Vba2V5ICsgdGhpcy5pZF0gPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gcGVyc2lzdGVudEF0dHJpYnV0ZXMpKSB7IHBlcnNpc3RlbnRBdHRyaWJ1dGVzW21vZGVsTmFtZV0gPSBbXTsgfVxuICAgICAgICB2YXIgYXR0cnMgPSBwZXJzaXN0ZW50QXR0cmlidXRlc1ttb2RlbE5hbWVdO1xuICAgICAgICBpZiAoYXR0cmlidXRlcykge1xuICAgICAgICAgICAgdmFyIG5ld0F0dHJzID0gTGF6eShhdHRyaWJ1dGVzKS5kaWZmZXJlbmNlKGF0dHJzKS50b0FycmF5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3QXR0cnMgPSBhdHRycztcbiAgICAgICAgfVxuICAgICAgICBpZiAobmV3QXR0cnMubGVuZ3RoKXtcbiAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gbW9kZWxDYWNoZSl7XG4gICAgICAgICAgICAgICAgYWRkUHJvcGVydHkobW9kZWxDYWNoZVttb2RlbE5hbWVdLCBuZXdBdHRycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlcyl7XG4gICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoYXR0cnMsbmV3QXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLm9uKCduZXctbW9kZWwnLCBmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgIGlmIChtb2RlbC5tb2RlbE5hbWUgaW4gYnVpbGRlckhhbmRsZXJzKXtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyc1ttb2RlbC5tb2RlbE5hbWVdLmhhbmRsZShtb2RlbENhY2hlW21vZGVsLm1vZGVsTmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbC5tb2RlbE5hbWUgaW4gcGVyc2lzdGVudEF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMobW9kZWwubW9kZWxOYW1lKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5xdWVyeSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spe1xuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdGhpcy5kZXNjcmliZShtb2RlbE5hbWUsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgLy8gYXJyYXlmaXkgYWxsIGZpbHRlciB2YWx1ZXNcbiAgICAgICAgICAgIGZpbHRlciA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odixrKXsgcmV0dXJuIFtrLEFycmF5LmlzQXJyYXkodik/djpbdl1dfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgIHZhciBmaWx0ZXJGdW5jdGlvbiA9IHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICB2YXIgaWR4ID0gZ2V0SW5kZXgobW9kZWxOYW1lKTtcbiAgICAgICAgICAgIHRocy5mZXRjaChtb2RlbE5hbWUsZmlsdGVyLHRvZ2V0aGVyLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhpZHguZmlsdGVyKGZpbHRlckZ1bmN0aW9uKS52YWx1ZXMoKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzLCBjYWxsQmFjayl7XG4gICAgICAgIHJldHVybiB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVsZXRlJywgeyBpZCA6IGlkc30sIGNhbGxCYWNrKTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb25uZWN0ID0gZnVuY3Rpb24gKGNhbGxCYWNrKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbm5lY3Rpb24uaXNMb2dnZWRJbikge1xuICAgICAgICAgICAgY2FsbEJhY2soKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5jb25uZWN0KGNhbGxCYWNrKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmZ1bmN0aW9uIHJlV2hlZWxPUk0oZW5kUG9pbnQsIGxvZ2luRnVuYyl7XG4gICAgdGhpcy4kb3JtID0gbmV3IGJhc2VPUk0obmV3IHV0aWxzLnJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBsb2dpbkZ1bmMpLHRoaXMpO1xuICAgIHRoaXMub24gPSB0aGlzLiRvcm0ub24uYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuZW1pdCA9IHRoaXMuJG9ybS5lbWl0LmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLnVuYmluZCA9IHRoaXMuJG9ybS51bmJpbmQuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMub25jZSA9IHRoaXMuJG9ybS5vbmNlO1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gdGhpcy4kb3JtLmFkZE1vZGVsSGFuZGxlci5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyA9IHRoaXMuJG9ybS5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcy5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy51dGlscyA9IHV0aWxzO1xuICAgIHRoaXMubG9nb3V0ID0gdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9nb3V0LmJpbmQodGhpcy4kb3JtLmNvbm5lY3Rpb24pO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXMuJG9ybS5jb25uZWN0aW9uO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoZnVuY3Rpb24oY2FsbEJhY2sscmVqZWN0KXtcbiAgICAgICAgY29ubmVjdGlvbi5jb25uZWN0KGNhbGxCYWNrKTtcbiAgICB9KSk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9naW4odXNlcm5hbWUsIHBhc3N3b3JkLCBhY2NlcHQpOyAgICBcbiAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICBcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ291dCA9IGZ1bmN0aW9uKHVybCl7XG4gICAgcmV0dXJuIHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ291dCgpO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRNb2RlbCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5kZXNjcmliZShtb2RlbE5hbWUsYWNjZXB0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obW9kZWxOYW1lLCBpZHMpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2luZ2xlID0gZmFsc2U7XG4gICAgdmFyIG1vZE5hbWUgPSBtb2RlbE5hbWU7XG4gICAgdmFyIGZpbHRlcjtcbiAgICBpZiAodHlwZW9mIGlkcyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgc2luZ2xlID0gdHJ1ZTtcbiAgICAgICAgZmlsdGVyID0geyBpZCA6IFtpZHNdfTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaWRzKSl7XG4gICAgICAgIGZpbHRlciA9IHsgaWQgOiBpZHMgfTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBpZHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGZpbHRlciA9IGlkcztcbiAgICB9IGVsc2UgaWYgKGlkcyA9PT0gbnVsbCkge1xuICAgICAgICBmaWx0ZXIgPSB7fTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIG51bGwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNpbmdsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KGRhdGEubGVuZ3RoID8gZGF0YVswXSA6IG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5xdWVyeSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgcmVsYXRlZCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHZhciB0b2dldGhlciA9IG51bGw7XG4gICAgICAgIGlmIChyZWxhdGVkICYmIChyZWxhdGVkLmNvbnN0cnVjdG9yID09PSBBcnJheSkgJiYgKHJlbGF0ZWQubGVuZ3RoKSl7XG4gICAgICAgICAgICB0b2dldGhlciA9IHJlbGF0ZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRlZCAmJiAocmVsYXRlZC5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKSAmJiAocmVsYXRlZC5sZW5ndGgpKXtcbiAgICAgICAgICAgIHRvZ2V0aGVyID0gcmVsYXRlZC5zcGxpdCgnLCcpO1xuICAgICAgICB9XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLnF1ZXJ5KG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuKi9cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgaWRzKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVsZXRlKG1vZGVsTmFtZSwgaWRzLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldExvZ2dlZFVzZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHRoaXMuJG9ybS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy51c2VyX2lkKVxuICAgICAgICByZXR1cm4gdGhpcy5nZXQoJ2F1dGhfdXNlcicsdGhpcy4kb3JtLmNvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnVzZXJfaWQpO1xuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3QpIHtcbiAgICAgICAgICAgIHNlbGYub25jZSgnbG9nZ2VkLWluJyxmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5nZXQoJ2F1dGhfdXNlcicsIHVzZXIpLnRoZW4oYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLiRzZW5kVG9FbmRwb2ludCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uJHBvc3QodXJsLCBkYXRhKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dpbih1c2VybmFtZSxwYXNzd29yZCk7XG59XG4iXX0=
