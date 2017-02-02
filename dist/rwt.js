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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJjb25uZWN0aW9uLmpzIiwidG91Y2hlci5qcyIsInZhY3V1bWNhY2hlci5qcyIsImF1dG9saW5rZXIuanMiLCJsaXN0Y2FjaGVyLmpzIiwibWFueXRvbWFueS5qcyIsImNhY2hlci5qcyIsIm9ybS5qcyJdLCJuYW1lcyI6WyJIYW5kbGVyIiwiaGFuZGxlcnMiLCJzdHJIYW5kbGVycyIsInByb3RvdHlwZSIsImFkZEhhbmRsZXIiLCJoYW5kbGVyIiwic3RySGFuZGxlciIsInV0aWxzIiwiaGFzaCIsInRvU3RyaW5nIiwicHVzaCIsImhhbmRsZSIsImFyZ3MiLCJBcnJheSIsInNsaWNlIiwiY2FsbCIsImFyZ3VtZW50cyIsImZvckVhY2giLCJmdW5jIiwiYXBwbHkiLCJoYW5kbGVCeSIsInRocyIsIk5hbWVkRXZlbnRNYW5hZ2VyIiwiZXZlbnRzIiwiaGFuZGxlcklkIiwiaWR4SWQiLCJvbiIsIm5hbWUiLCJpZCIsImVtaXQiLCJldmVudCIsInVuYmluZCIsImNvdW50IiwiTGF6eSIsImVhY2giLCJ2IiwiayIsImlkeCIsIm4iLCJyZXZlcnNlIiwieCIsInNwbGljZSIsIm9uY2UiLCJldmVudE5hbWUiLCJoYW5kbGVyRnVuY3Rpb24iLCJzZWxmIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsIm1vY2siLCJyZW5hbWVGdW5jdGlvbiIsImZuIiwiRnVuY3Rpb24iLCJiaW5kIiwiY2FjaGVkIiwia2V5Iiwid3JhcHBlciIsImxvZyIsImNvbnNvbGUiLCJ4ZHIiLCJ1cmwiLCJkYXRhIiwiYXBwbGljYXRpb24iLCJ0b2tlbiIsImZvcm1FbmNvZGUiLCJQcm9taXNlIiwiYWNjZXB0IiwicmVqZWN0IiwicmVxIiwiWE1MSHR0cFJlcXVlc3QiLCJvbnJlYWR5c3RhdGVjaGFuZ2UiLCJyZWFkeVN0YXRlIiwicmVzcG9uc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwicmVzcG9uc2VUZXh0IiwiYSIsInJlc3BvbnNlIiwic3RhdHVzIiwicmVxdWVzdCIsIlhEb21haW5SZXF1ZXN0Iiwib25sb2FkIiwic3RhdHVzVGV4dCIsIkVycm9yIiwib3BlbiIsIm9uZXJyb3IiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiX190b2tlbl9fIiwic2l6ZSIsInN0cmluZ2lmeSIsIm1hcCIsImVuY29kZVVSSSIsInRvQXJyYXkiLCJqb2luIiwic2VuZCIsImNhcGl0YWxpemUiLCJzIiwidG9VcHBlckNhc2UiLCJ0b0xvd2VyQ2FzZSIsInN0ciIsInJldCIsImxlbmd0aCIsImNoYXJDb2RlQXQiLCJtYWtlRmlsdGVyIiwibW9kZWwiLCJmaWx0ZXIiLCJ1bmlmaWVyIiwiZG9udFRyYW5zbGF0ZUZpbHRlciIsInNvdXJjZSIsInZhbHMiLCJmaWVsZCIsImlzQXJyYXkiLCJmaWVsZHMiLCJ0eXBlIiwiY29uc3RydWN0b3IiLCJOdW1iZXIiLCJlcnJvciIsIm9ybSIsInNhbWVBcyIsInkiLCJwbHVyYWxpemUiLCJiZWZvcmVDYWxsIiwiYmVmb3JlIiwiZGVjb3JhdG9yIiwidGhlbiIsImNsZWFuU3RvcmFnZSIsImxvY2FsU3RvcmFnZSIsImtleXMiLCJjbGVhbkRlc2NyaXB0aW9uIiwic3RhcnRzV2l0aCIsImNociIsInNwbGl0IiwicGVybXV0YXRpb25zIiwiYXJyIiwid2FpdEZvciIsImNhbGxCYWNrIiwid2FpdGVyIiwic2V0VGltZW91dCIsImJvb2wiLCJCb29sZWFuIiwibm9vcCIsInR6T2Zmc2V0IiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwidHJhbnNGaWVsZFR5cGUiLCJkYXRlIiwiZGF0ZXRpbWUiLCJzdHJpbmciLCJ0ZXh0IiwiaW50ZWdlciIsInBhcnNlSW50IiwiZmxvYXQiLCJwYXJzZUZsb2F0IiwiU1RBVFVTS0VZIiwiUmVhbHRpbWVDb25uZWN0aW9uIiwiZW5kUG9pbnQiLCJyd3RDb25uZWN0aW9uIiwiY29ubmVjdGlvbiIsIlNvY2tKUyIsIm9ub3BlbiIsInRlbmFudCIsIm9ubWVzc2FnZSIsImUiLCJvbmNsb3NlIiwid3NDb25uZWN0IiwiY2FjaGVkU3RhdHVzIiwiY2xvc2UiLCJyZVdoZWVsQ29ubmVjdGlvbiIsImdldExvZ2luIiwiZW5kc1dpdGgiLCJpc0Nvbm5lY3RlZCIsImlzTG9nZ2VkSW4iLCIkcG9zdCIsInByb21pc2UiLCJ4aHIiLCJmb3JjZSIsInN0YXR1c1dhaXRpbmciLCJ1cGRhdGVTdGF0dXMiLCJsYXN0QnVpbGQiLCJsYXN0X2J1aWxkIiwidXNlcl9pZCIsIm9sZFN0YXR1cyIsImxvZ2luSW5mbyIsIk9iamVjdCIsImxvZ2luIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsIm9iaiIsInJlYWx0aW1lRW5kUG9pbnQiLCJ3c0Nvbm5lY3Rpb24iLCJ1c2VyaWQiLCJsb2dvdXQiLCJvayIsImNvbm5lY3QiLCJUb3VjaGVyIiwidG91Y2hlZCIsInRvdWNoIiwidCIsIlZhY3V1bUNhY2hlciIsImFza2VkIiwicGtJbmRleCIsIm1pc3NpbmciLCJhc2siLCJsYXp5IiwiY29udGFpbnMiLCJpbmZvIiwiZ2V0QXNrZWRJbmRleCIsIm1pc3NpbmdzIiwidW5pcXVlIiwiQXV0b0xpbmtlciIsImFjdGl2ZXMiLCJJREIiLCJXMlBSRVNPVVJDRSIsImxpc3RDYWNoZSIsIm1haW5JbmRleCIsImZvcmVpZ25LZXlzIiwibTJtIiwibTJtSW5kZXgiLCJwZXJtaXNzaW9ucyIsImluZGV4IiwiZ2V0SW5kZXhGb3IiLCJyZWZlcmVuY2VzIiwicmVmZXJlbmNlIiwiaW5kZXhOYW1lIiwidG8iLCJyZWZlcmVuY2VkQnkiLCJieSIsIm1hbnlUb01hbnkiLCJyZWxhdGlvbiIsIk1hbnlUb01hbnlSZWxhdGlvbiIsIm0ybUdldCIsImNvbGxlY3Rpb24iLCJnb3REYXRhIiwiZ2V0TTJNIiwibGlua1VubGlua2VkIiwidmFsdWVzIiwic3VtIiwiY2hhbmdlZCIsImluZGV4ZXMiLCJJTkRFWCIsImdldHRlciIsImlkcyIsIm90aGVySW5kZXgiLCJkZXNjcmliZSIsImZsYXR0ZW4iLCJtb2RlbE5hbWUiLCJpZGIiLCJmZXRjaCIsIm1haW5SZXNvdXJjZSIsImZpZWxkTmFtZSIsInRvT2JqZWN0IiwicmVzb3VyY2VOYW1lIiwiZ290UGVybWlzc2lvbnMiLCJQRVJNSVNTSU9OUyIsInNldEludGVydmFsIiwiTGlzdENhY2hlciIsImdvdEFsbCIsImNvbXBvc2l0ZUFza2VkIiwiY2FydGVzaWFuUHJvZHVjdDEiLCJiIiwiY2FydGVzaWFuUHJvZHVjdCIsImV4cGxvZGVGaWx0ZXIiLCJwcm9kdWN0IiwiciIsImZpbHRlclNpbmdsZSIsInRlc3RPbmx5IiwiZGlmZmVyZW5jZSIsImNsZWFuQ29tcG9zaXRlcyIsImZpbHRlckxlbiIsIml0ZW1zIiwiaXRlbSIsImdvdCIsInNpbmdsZSIsInNvbWUiLCJmIiwiZXhwbG9kZWQiLCJwYXJ0aWFscyIsImJhZCIsInBsdWNrIiwiYWRkIiwiZmluZCIsImdldDAiLCJnZXQxIiwiZGVsIiwibCIsImNhY2hlZFByb3BlcnR5QnlFdmVudHMiLCJwcm90byIsInByb3BlcnR5TmFtZSIsInNldHRlciIsInJlc3VsdCIsInByb3BlcnR5RGVmIiwidmFsdWUiLCJpc0Zpbml0ZSIsImRlZmluZVByb3BlcnR5IiwiVmFsaWRhdGlvbkVycm9yIiwicmVzb3VyY2UiLCJfcmVzb3VyY2UiLCJmb3JtSWR4IiwiZXJyb3JzIiwiYmFzZU9STSIsIm9wdGlvbnMiLCJleHRPUk0iLCJTdHJpbmciLCJjb25uZWN0ZWQiLCJ3cyIsIm9uTWVzc2FnZUpzb24iLCJvbk1lc3NhZ2VUZXh0IiwibWVzc2FnZSIsInNlbnREYXRhIiwid2FpdGluZ0Nvbm5lY3Rpb25zIiwiYXV0aF9ncm91cCIsIklEWCIsIlJFVklEWCIsImJ1aWxkZXJIYW5kbGVycyIsImJ1aWxkZXJIYW5kbGVyVXNlZCIsInBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiZXZlbnRIYW5kbGVycyIsInBlcm1pc3Npb25XYWl0aW5nIiwibW9kZWxDYWNoZSIsImZhaWxlZE1vZGVscyIsImxpbmtlciIsIndpbmRvdyIsInZhbGlkYXRpb25FdmVudCIsImN1cnJlbnRDb250ZXh0Iiwic2F2aW5nRXJyb3JIYW5sZGVyIiwiZ2V0SW5kZXgiLCJnZXRVbmxpbmtlZCIsIlVOTElOS0VEIiwiUGVybWlzc2lvblRhYmxlIiwia2xhc3MiLCJzYXZlIiwiY2IiLCJteVBlcm1zIiwiZ3JvdXBfaWQiLCJwZXJtaXNzaW9uTGlzdCIsInAiLCJwZXJtcyIsImFsbFBlcm1pc3Npb25zIiwiaW5kZXhPZiIsIm1ha2VNb2RlbENsYXNzIiwiX21vZGVsIiwicmVhZGFibGUiLCJ3cml0YWJsZSIsInByaXZhdGVBcmdzIiwibWVyZ2UiLCJmdW5jU3RyaW5nIiwiS2xhc3MiLCJyZWZfdHJhbnNsYXRpb25zIiwiaW52ZXJzZV9yZWZlcmVuY2VzIiwicmVmZXJlbnRzIiwiZmllbGRzT3JkZXIiLCJmaWVsZE9yZGVyIiwicmVwcmVzZW50YXRpb24iLCJkZWxldGUiLCJfcGVybWlzc2lvbnMiLCJhbGxfcGVybXMiLCJvYmplY3RfaWQiLCJncm91cGVkIiwidW5rbm93bl9ncm91cHMiLCJncm91cEJ5IiwibyIsImFzUmF3IiwiSUQiLCJhcmciLCJjb250ZXh0IiwiY29weSIsImFzciIsImNvbmNhdCIsInNhdmVNdWx0aSIsIm9iamVjdHMiLCJzY29wZSIsInJhdyIsImRlbGV0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsInNhdmVQQSIsIlQiLCJvbyIsIlBBIiwiRnMiLCJmaWVsZElkeCIsInRhcCIsImluZGV4QnkiLCJ3aWRnZXQiLCJyZWYiLCJleHRfcmVmIiwibG9jYWxfcmVmIiwid2FybiIsIlR5cGVFcnJvciIsInJldkluZGV4IiwiaGFzT3duUHJvcGVydHkiLCJvcHRzIiwiZmlyc3QiLCJvbW9kZWxOYW1lIiwidmFsaWRhdG9ycyIsInVubGlua1JlZmVyZW5jZSIsImluc3RhbmNlIiwiaW5zdGFuY2VzIiwib21vZGVsIiwibGlua1JlZmVyZW5jZSIsInJlZnMiLCJJTkRFWF9NMk0iLCJXMlBfUE9TVCIsIl9leHRyYSIsIlRPT05FIiwiVE9NQU5ZIiwiTUFOWVRPTUFOWSIsIm1vZGVsQ2xhc3MiLCJ6aXAiLCJkZWxldGVkIiwiTVBBIiwicmVjb3JkIiwiaXRhYiIsInRhYmxlIiwiaWsiLCJubmV3IiwidXBkYXRlZCIsIm5ld09iamVjdHMiLCJtb2RlbFJlZmVyZW5jZXMiLCJvbGRJdGVtIiwib2xkQ29weSIsIm5ld0l0ZW0iLCJOYU4iLCJubyIsInRvdGFsUmVzdWx0cyIsImdvdE0yTSIsInJvdyIsIm0iLCJ2ZXJiIiwidG9nZXRoZXIiLCJzZW5kRGF0YSIsIkdPVF9BTEwiLCJnb3RNb2RlbCIsImNhY2hlS2V5IiwibW9kZWxOb3RGb3VuZCIsImFkZE1vZGVsSGFuZGxlciIsImFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiYXR0cmlidXRlcyIsImFkZFByb3BlcnR5IiwidmFsIiwia2F0dHIiLCJzZXQiLCJhdHRycyIsIm5ld0F0dHJzIiwicXVlcnkiLCJmaWx0ZXJGdW5jdGlvbiIsInJlV2hlZWxPUk0iLCJsb2dpbkZ1bmMiLCIkb3JtIiwiZ2V0TW9kZWwiLCJtb2ROYW1lIiwiZ2V0TG9nZ2VkVXNlciIsInVzZXIiLCIkc2VuZFRvRW5kcG9pbnQiXSwibWFwcGluZ3MiOiI7OztJQUFBLGE7SUFFQSxTQUFBQSxPQUFBLEdBQUE7QUFBQSxRQUNBLEtBQUFDLFFBQUEsR0FBQSxFQUFBLENBREE7QUFBQSxRQUVBLEtBQUFDLFdBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxLO0lBR0EsQztJQUVBRixPQUFBLENBQUFHLFNBQUEsQ0FBQUMsVUFBQSxHQUFBLFVBQUFDLE9BQUEsRUFBQTtBQUFBLFFBQ0EsSUFBQUMsVUFBQSxHQUFBQyxLQUFBLENBQUFDLElBQUEsQ0FBQUgsT0FBQSxDQUFBSSxRQUFBLEVBQUEsQ0FBQSxDQURBO0FBQUEsUUFFQSxJQUFBLENBQUEsQ0FBQUgsVUFBQSxJQUFBLEtBQUFKLFdBQUEsQ0FBQSxFQUFBO0FBQUEsWUFDQSxLQUFBQSxXQUFBLENBQUFJLFVBQUEsSUFBQUQsT0FBQSxDQURBO0FBQUEsWUFFQSxLQUFBSixRQUFBLENBQUFTLElBQUEsQ0FBQUwsT0FBQSxFQUZBO0FBQUEsU0FGQTtBQUFBLEtBQUEsQztJQU9BTCxPQUFBLENBQUFHLFNBQUEsQ0FBQVEsTUFBQSxHQUFBLFlBQUE7QUFBQSxRQUNBLElBQUFDLElBQUEsR0FBQUMsS0FBQSxDQUFBVixTQUFBLENBQUFXLEtBQUEsQ0FBQUMsSUFBQSxDQUFBQyxTQUFBLEVBQUEsQ0FBQSxDQUFBLENBREE7QUFBQSxRQUVBLEtBQUFmLFFBQUEsQ0FBQWdCLE9BQUEsQ0FBQSxVQUFBQyxJQUFBLEVBQUE7QUFBQSxZQUNBQSxJQUFBLENBQUFDLEtBQUEsQ0FBQSxJQUFBLEVBQUFQLElBQUEsRUFEQTtBQUFBLFNBQUEsRUFGQTtBQUFBLEtBQUEsQztJQU1BWixPQUFBLENBQUFHLFNBQUEsQ0FBQWlCLFFBQUEsR0FBQSxZQUFBO0FBQUEsUUFDQSxJQUFBUixJQUFBLEdBQUFDLEtBQUEsQ0FBQVYsU0FBQSxDQUFBVyxLQUFBLENBQUFDLElBQUEsQ0FBQUMsU0FBQSxFQUFBLENBQUEsQ0FBQSxDQURBO0FBQUEsUUFFQSxJQUFBSyxHQUFBLEdBQUFMLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FGQTtBQUFBLFFBR0EsS0FBQWYsUUFBQSxDQUFBZ0IsT0FBQSxDQUFBLFVBQUFDLElBQUEsRUFBQTtBQUFBLFlBQ0FBLElBQUEsQ0FBQUMsS0FBQSxDQUFBRSxHQUFBLEVBQUFULElBQUEsRUFEQTtBQUFBLFNBQUEsRUFIQTtBQUFBLEtBQUEsQztJQVNBLFNBQUFVLGlCQUFBLEdBQUE7QUFBQSxRQUNBLElBQUFDLE1BQUEsR0FBQSxFQUFBLENBREE7QUFBQSxRQUVBLElBQUFDLFNBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxRQUdBLElBQUFDLEtBQUEsR0FBQSxDQUFBLENBSEE7QUFBQSxRQUlBLEtBQUFDLEVBQUEsR0FBQSxVQUFBQyxJQUFBLEVBQUFULElBQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQSxDQUFBLENBQUFTLElBQUEsSUFBQUosTUFBQSxDQUFBLEVBQUE7QUFBQSxnQkFDQUEsTUFBQSxDQUFBSSxJQUFBLElBQUEsSUFBQWQsS0FBQSxFQUFBLENBREE7QUFBQSxhQURBO0FBQUEsWUFJQSxJQUFBZSxFQUFBLEdBQUFILEtBQUEsRUFBQSxDQUpBO0FBQUEsWUFLQUYsTUFBQSxDQUFBSSxJQUFBLEVBQUFqQixJQUFBLENBQUFRLElBQUEsRUFMQTtBQUFBLFlBTUFNLFNBQUEsQ0FBQUksRUFBQSxJQUFBVixJQUFBLENBTkE7QUFBQSxZQU9BLE9BQUFVLEVBQUEsQ0FQQTtBQUFBLFNBQUEsQ0FKQTtBQUFBLFFBYUEsS0FBQUMsSUFBQSxHQUFBLFVBQUFGLElBQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQUEsSUFBQSxJQUFBSixNQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBWCxJQUFBLEdBQUFDLEtBQUEsQ0FBQVYsU0FBQSxDQUFBVyxLQUFBLENBQUFDLElBQUEsQ0FBQUMsU0FBQSxFQUFBLENBQUEsQ0FBQSxDQURBO0FBQUEsZ0JBRUFPLE1BQUEsQ0FBQUksSUFBQSxFQUFBVixPQUFBLENBQUEsVUFBQWEsS0FBQSxFQUFBO0FBQUEsb0JBQ0FBLEtBQUEsQ0FBQVgsS0FBQSxDQUFBLElBQUEsRUFBQVAsSUFBQSxFQURBO0FBQUEsaUJBQUEsRUFGQTtBQUFBLGFBREE7QUFBQSxTQUFBLENBYkE7QUFBQSxRQXFCQSxLQUFBbUIsTUFBQSxHQUFBLFVBQUExQixPQUFBLEVBQUE7QUFBQSxZQUNBLElBQUEyQixLQUFBLEdBQUEsQ0FBQSxDQURBO0FBQUEsWUFFQSxJQUFBM0IsT0FBQSxJQUFBbUIsU0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQU4sSUFBQSxHQUFBTSxTQUFBLENBQUFuQixPQUFBLEdBQUEsRUFBQSxDQUFBLENBREE7QUFBQSxnQkFFQTRCLElBQUEsQ0FBQVYsTUFBQSxFQUFBVyxJQUFBLENBQUEsVUFBQUMsQ0FBQSxFQUFBQyxDQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBQyxHQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsb0JBRUEsU0FBQUMsQ0FBQSxJQUFBSCxDQUFBLEVBQUE7QUFBQSx3QkFDQSxJQUFBQSxDQUFBLENBQUFHLENBQUEsTUFBQXBCLElBQUEsRUFBQTtBQUFBLDRCQUNBbUIsR0FBQSxDQUFBM0IsSUFBQSxDQUFBNEIsQ0FBQSxFQURBO0FBQUEsNEJBRUFOLEtBQUEsR0FGQTtBQUFBLHlCQURBO0FBQUEscUJBRkE7QUFBQSxvQkFRQUssR0FBQSxDQUFBRSxPQUFBLEdBQUF0QixPQUFBLENBQUEsVUFBQXVCLENBQUEsRUFBQTtBQUFBLHdCQUNBTCxDQUFBLENBQUFNLE1BQUEsQ0FBQUQsQ0FBQSxFQUFBLENBQUEsRUFEQTtBQUFBLHFCQUFBLEVBUkE7QUFBQSxpQkFBQSxFQUZBO0FBQUEsYUFGQTtBQUFBLFlBaUJBLE9BQUFoQixTQUFBLENBQUFuQixPQUFBLENBQUEsQ0FqQkE7QUFBQSxZQWtCQSxPQUFBMkIsS0FBQSxDQWxCQTtBQUFBLFNBQUEsQ0FyQkE7QUFBQSxRQTRDQTtBQUFBO0FBQUE7QUFBQSxhQUFBVSxJQUFBLEdBQUEsVUFBQUMsU0FBQSxFQUFBQyxlQUFBLEVBQUE7QUFBQSxZQUNBLElBQUFDLElBQUEsR0FBQSxJQUFBLENBREE7QUFBQSxZQUVBLElBQUF4QyxPQUFBLEdBQUEsS0FBQXFCLEVBQUEsQ0FBQWlCLFNBQUEsRUFBQSxZQUFBO0FBQUEsZ0JBQ0FDLGVBQUEsQ0FBQXpCLEtBQUEsQ0FBQSxJQUFBLEVBQUFILFNBQUEsRUFEQTtBQUFBLGdCQUVBNkIsSUFBQSxDQUFBZCxNQUFBLENBQUExQixPQUFBLEVBRkE7QUFBQSxhQUFBLENBQUEsQ0FGQTtBQUFBLFNBQUEsQ0E1Q0E7QUFBQSxLO0lDN0JBLGE7SUFFQSxJQUFBeUMsWUFBQSxHQUFBLENBQUEsQztJQUVBLElBQUFDLFVBQUEsR0FBQSxZQUFBO0FBQUEsUUFBQSxPQUFBLEVBQUEsQ0FBQTtBQUFBLEtBQUEsQztJQUVBLFNBQUFDLFVBQUEsR0FBQTtBQUFBLFFBQ0EsT0FBQSxJQUFBQyxLQUFBLENBQUEsRUFBQSxFQUFBO0FBQUEsWUFDQUMsR0FBQSxFQUFBLFVBQUFDLE1BQUEsRUFBQXhCLElBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUEsT0FBQUEsSUFBQSxLQUFBLFFBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFBLElBQUEsS0FBQSxVQUFBLEVBQUE7QUFBQSx3QkFDQSxPQUFBb0IsVUFBQSxDQURBO0FBQUEscUJBQUEsTUFFQTtBQUFBLHdCQUNBLE9BQUF4QyxLQUFBLENBQUE2QyxJQUFBLENBREE7QUFBQSxxQkFIQTtBQUFBLGlCQUFBLE1BTUE7QUFBQSxvQkFDQSxPQUFBRCxNQUFBLENBQUF4QixJQUFBLENBQUEsQ0FEQTtBQUFBLGlCQVBBO0FBQUEsYUFEQTtBQUFBLFNBQUEsQ0FBQSxDQURBO0FBQUEsSztJQXVOQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBQUFwQixLQUFBLEdBQUE7QUFBQSxRQUNBOEMsY0FBQSxFQUFBLFVBQUExQixJQUFBLEVBQUEyQixFQUFBLEVBQUE7QUFBQSxZQUNBLE9BQUEsSUFBQUMsUUFBQSxDQUFBLDhDQUFBNUIsSUFBQSxHQUNBLDBDQURBLEdBQUEsQ0FDQTRCLFFBQUEsQ0FBQXBDLEtBQUEsQ0FBQXFDLElBQUEsQ0FBQUYsRUFBQSxDQURBLENBQUEsQ0FEQTtBQUFBLFNBREE7QUFBQSxRQUtBRyxNQUFBLEVBQUEsVUFBQXZDLElBQUEsRUFBQXdDLEdBQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQSxDQUFBQSxHQUFBLEVBQUE7QUFBQSxnQkFDQUEsR0FBQSxHQUFBLE1BQUFaLFlBQUEsRUFBQSxDQURBO0FBQUEsYUFEQTtBQUFBLFlBSUEsU0FBQWEsT0FBQSxHQUFBO0FBQUEsZ0JBQ0EsSUFBQSxDQUFBLEtBQUFELEdBQUEsQ0FBQSxFQUFBO0FBQUEsb0JBQ0EsS0FBQUEsR0FBQSxJQUFBeEMsSUFBQSxDQUFBSCxJQUFBLENBQUEsSUFBQSxFQUFBLENBQUFDLFNBQUEsQ0FBQSxDQUFBLENBREE7QUFBQSxpQkFEQTtBQUFBLGdCQUlBLE9BQUEsS0FBQTBDLEdBQUEsQ0FBQSxDQUpBO0FBQUEsYUFKQTtBQUFBLFlBU0EsQ0FUQTtBQUFBLFlBVUEsT0FBQUMsT0FBQSxDQVZBO0FBQUEsU0FMQTtBQUFBLFFBbUJBO0FBQUE7QUFBQSxRQUFBQyxHQUFBLEVBQUEsWUFBQTtBQUFBLFlBQ0FDLE9BQUEsQ0FBQUQsR0FBQSxDQUFBNUMsU0FBQSxFQURBO0FBQUEsU0FuQkE7QUFBQSxRQXVCQThDLEdBQUEsRUFBQSxVQUFBQyxHQUFBLEVBQUFDLElBQUEsRUFBQUMsV0FBQSxFQUFBQyxLQUFBLEVBQUFDLFVBQUEsRUFBQTtBQUFBLFlBSUE7QUFBQTtBQUFBO0FBQUEsbUJBQUEsSUFBQUMsT0FBQSxDQUFBLFVBQUFDLE1BQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQUMsR0FBQSxDQURBO0FBQUEsZ0JBRUEsSUFBQSxDQUFBUCxJQUFBLEVBQUE7QUFBQSxvQkFBQUEsSUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUFBLGlCQUZBO0FBQUEsZ0JBSUEsSUFBQVEsY0FBQSxFQUFBO0FBQUEsb0JBQ0FELEdBQUEsR0FBQSxJQUFBQyxjQUFBLEVBQUEsQ0FEQTtBQUFBLG9CQUVBRCxHQUFBLENBQUFFLGtCQUFBLEdBQUEsWUFBQTtBQUFBLHdCQUNBLElBQUFGLEdBQUEsQ0FBQUcsVUFBQSxLQUFBLENBQUEsRUFBQTtBQUFBLDRCQUNBLElBQUE7QUFBQSxnQ0FDQSxJQUFBQyxZQUFBLEdBQUFDLElBQUEsQ0FBQUMsS0FBQSxDQUFBTixHQUFBLENBQUFPLFlBQUEsQ0FBQSxDQURBO0FBQUEsNkJBQUEsQ0FFQSxPQUFBQyxDQUFBLEVBQUE7QUFBQSxnQ0FDQSxJQUFBSixZQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsNkJBSEE7QUFBQSw0QkFNQSxJQUFBSyxRQUFBLEdBQUE7QUFBQSxnQ0FBQUwsWUFBQSxFQUFBQSxZQUFBO0FBQUEsZ0NBQUFHLFlBQUEsRUFBQVAsR0FBQSxDQUFBTyxZQUFBO0FBQUEsZ0NBQUFHLE1BQUEsRUFBQVYsR0FBQSxDQUFBVSxNQUFBO0FBQUEsZ0NBQUFDLE9BQUEsRUFBQVgsR0FBQTtBQUFBLDZCQUFBLENBTkE7QUFBQSw0QkFPQSxJQUFBQSxHQUFBLENBQUFVLE1BQUEsSUFBQSxHQUFBLElBQUFWLEdBQUEsQ0FBQVUsTUFBQSxHQUFBLEdBQUEsRUFBQTtBQUFBLGdDQUNBWixNQUFBLENBQUFXLFFBQUEsRUFEQTtBQUFBLDZCQUFBLE1BRUE7QUFBQSxnQ0FDQVYsTUFBQSxDQUFBVSxRQUFBLEVBREE7QUFBQSw2QkFUQTtBQUFBLHlCQURBO0FBQUEscUJBQUEsQ0FGQTtBQUFBLGlCQUFBLE1BaUJBLElBQUFHLGNBQUEsRUFBQTtBQUFBLG9CQUNBWixHQUFBLEdBQUEsSUFBQVksY0FBQSxFQUFBLENBREE7QUFBQSxvQkFFQVosR0FBQSxDQUFBYSxNQUFBLEdBQUEsWUFBQTtBQUFBLHdCQUNBZixNQUFBLENBQUFFLEdBQUEsQ0FBQU8sWUFBQSxFQUFBUCxHQUFBLENBQUFjLFVBQUEsRUFBQWQsR0FBQSxFQURBO0FBQUEscUJBQUEsQ0FGQTtBQUFBLGlCQUFBLE1BS0E7QUFBQSxvQkFDQUQsTUFBQSxDQUFBLElBQUFnQixLQUFBLENBQUEsb0JBQUEsQ0FBQSxFQURBO0FBQUEsaUJBMUJBO0FBQUEsZ0JBOEJBZixHQUFBLENBQUFnQixJQUFBLENBQUEsTUFBQSxFQUFBeEIsR0FBQSxFQUFBLElBQUEsRUE5QkE7QUFBQSxnQkErQkFRLEdBQUEsQ0FBQWlCLE9BQUEsR0FBQWxCLE1BQUEsQ0EvQkE7QUFBQSxnQkFnQ0FDLEdBQUEsQ0FBQWtCLGdCQUFBLENBQUEsUUFBQSxFQUFBLGtCQUFBLEVBaENBO0FBQUEsZ0JBaUNBLElBQUF2QixLQUFBLEVBQUE7QUFBQSxvQkFBQUYsSUFBQSxDQUFBMEIsU0FBQSxHQUFBeEIsS0FBQSxDQUFBO0FBQUEsaUJBakNBO0FBQUEsZ0JBa0NBLElBQUEsQ0FBQUMsVUFBQSxFQUFBO0FBQUEsb0JBQ0FJLEdBQUEsQ0FBQWtCLGdCQUFBLENBQUEsY0FBQSxFQUFBLFlBQUEsRUFEQTtBQUFBLG9CQUVBekIsSUFBQSxHQUFBL0IsSUFBQSxDQUFBK0IsSUFBQSxFQUFBMkIsSUFBQSxLQUFBZixJQUFBLENBQUFnQixTQUFBLENBQUE1QixJQUFBLENBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxpQkFBQSxNQUdBO0FBQUEsb0JBQ0FPLEdBQUEsQ0FBQWtCLGdCQUFBLENBQUEsY0FBQSxFQUFBLG1DQUFBLEVBREE7QUFBQSxvQkFFQXpCLElBQUEsR0FBQS9CLElBQUEsQ0FBQStCLElBQUEsRUFBQTZCLEdBQUEsQ0FBQSxVQUFBMUQsQ0FBQSxFQUFBQyxDQUFBLEVBQUE7QUFBQSx3QkFDQSxPQUFBQSxDQUFBLEdBQUEsR0FBQSxHQUFBMEQsU0FBQSxDQUFBM0QsQ0FBQSxDQUFBMUIsUUFBQSxFQUFBLENBQUEsQ0FEQTtBQUFBLHFCQUFBLEVBRUFzRixPQUZBLEdBRUFDLElBRkEsQ0FFQSxHQUZBLENBQUEsQ0FGQTtBQUFBLGlCQXJDQTtBQUFBLGdCQTJDQXpCLEdBQUEsQ0FBQTBCLElBQUEsQ0FBQWpDLElBQUE7QUEzQ0EsYUFBQSxDQUFBLENBSkE7QUFBQSxTQXZCQTtBQUFBLFFBMkVBa0MsVUFBQSxFQUFBLFVBQUFDLENBQUEsRUFBQTtBQUFBLFlBQ0EsT0FBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQUMsV0FBQSxLQUFBRCxDQUFBLENBQUFyRixLQUFBLENBQUEsQ0FBQSxFQUFBdUYsV0FBQSxFQUFBLENBREE7QUFBQSxTQTNFQTtBQUFBLFFBK0VBN0YsSUFBQSxFQUFBLFVBQUE4RixHQUFBLEVBQUE7QUFBQSxZQUlBO0FBQUE7QUFBQTtBQUFBLFlBQUFBLEdBQUEsR0FBQUEsR0FBQSxDQUFBN0YsUUFBQSxFQUFBLENBSkE7QUFBQSxZQUtBLElBQUE4RixHQUFBLEdBQUEsQ0FBQSxDQUxBO0FBQUEsWUFNQSxLQUFBLElBQUEvRCxDQUFBLEdBQUEsQ0FBQSxDQUFBLENBQUFBLENBQUEsR0FBQThELEdBQUEsQ0FBQUUsTUFBQSxFQUFBaEUsQ0FBQSxFQUFBLEVBQUE7QUFBQSxnQkFDQStELEdBQUEsSUFBQSxJQUFBRCxHQUFBLENBQUFHLFVBQUEsQ0FBQWpFLENBQUEsQ0FBQSxDQURBO0FBQUEsYUFOQTtBQUFBLFlBU0EsT0FBQSxDQUFBK0QsR0FBQSxHQUFBLFdBQUEsQ0FBQSxDQUFBOUYsUUFBQSxFQUFBLENBVEE7QUFBQSxTQS9FQTtBQUFBLFFBMkZBaUcsVUFBQSxFQUFBLFVBQUFDLEtBQUEsRUFBQUMsTUFBQSxFQUFBQyxPQUFBLEVBQUFDLG1CQUFBLEVBQUE7QUFBQSxZQUlBO0FBQUE7QUFBQTtBQUFBLGdCQUFBLENBQUFELE9BQUEsRUFBQTtBQUFBLGdCQUFBQSxPQUFBLEdBQUEsTUFBQSxDQUFBO0FBQUEsYUFKQTtBQUFBLFlBS0EsSUFBQTVFLElBQUEsQ0FBQTJFLE1BQUEsRUFBQWpCLElBQUEsT0FBQSxDQUFBLEVBQUE7QUFBQSxnQkFDQSxPQUFBLFVBQUFuRCxDQUFBLEVBQUE7QUFBQSxvQkFBQSxPQUFBLElBQUEsQ0FBQTtBQUFBLGlCQUFBLENBREE7QUFBQSxhQUxBO0FBQUEsWUFRQSxJQUFBdUUsTUFBQSxHQUFBOUUsSUFBQSxDQUFBMkUsTUFBQSxFQUFBZixHQUFBLENBQUEsVUFBQW1CLElBQUEsRUFBQUMsS0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQSxDQUFBRCxJQUFBLEVBQUE7QUFBQSxvQkFBQUEsSUFBQSxHQUFBLENBQUEsSUFBQSxDQUFBLENBQUE7QUFBQSxpQkFEQTtBQUFBLGdCQUVBLElBQUEsQ0FBQW5HLEtBQUEsQ0FBQXFHLE9BQUEsQ0FBQUYsSUFBQSxDQUFBLEVBQUE7QUFBQSxvQkFDQUEsSUFBQSxHQUFBLENBQUFBLElBQUEsQ0FBQSxDQURBO0FBQUEsaUJBRkE7QUFBQSxnQkFLQSxJQUFBLENBQUFGLG1CQUFBLElBQUFILEtBQUEsQ0FBQVEsTUFBQSxDQUFBRixLQUFBLEVBQUFHLElBQUEsS0FBQSxXQUFBLEVBQUE7QUFBQSxvQkFDQUgsS0FBQSxHQUFBLE1BQUFBLEtBQUEsQ0FEQTtBQUFBLG9CQUVBRCxJQUFBLEdBQUEvRSxJQUFBLENBQUErRSxJQUFBLEVBQUFuQixHQUFBLENBQUEsVUFBQXJELENBQUEsRUFBQTtBQUFBLHdCQUNBLElBQUFBLENBQUEsSUFBQUEsQ0FBQSxDQUFBNkUsV0FBQSxLQUFBQyxNQUFBLEVBQUE7QUFBQSw0QkFDQSxPQUFBOUUsQ0FBQSxDQUFBWixFQUFBLENBREE7QUFBQSx5QkFBQTtBQUFBLDRCQUdBLE9BQUFZLENBQUEsQ0FKQTtBQUFBLHFCQUFBLEVBS0F1RCxPQUxBLEVBQUEsQ0FGQTtBQUFBLGlCQUFBLE1BUUEsSUFBQVksS0FBQSxDQUFBUSxNQUFBLENBQUFGLEtBQUEsRUFBQUcsSUFBQSxLQUFBLFFBQUEsRUFBQTtBQUFBLG9CQUNBSixJQUFBLEdBQUFBLElBQUEsQ0FBQW5CLEdBQUEsQ0FBQWpCLElBQUEsQ0FBQWdCLFNBQUEsQ0FBQSxDQURBO0FBQUEsaUJBYkE7QUFBQSxnQkFnQkEsT0FBQSxNQUFBM0QsSUFBQSxDQUFBK0UsSUFBQSxFQUFBbkIsR0FBQSxDQUFBLFVBQUFyRCxDQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBLENBQUFBLENBQUEsRUFBQTtBQUFBLHdCQUNBcUIsT0FBQSxDQUFBMEQsS0FBQSxDQUFBLHNCQUFBLEVBREE7QUFBQSxxQkFBQSxNQUVBLElBQUEvRSxDQUFBLEtBQUFnRixHQUFBLENBQUFqSCxLQUFBLENBQUE2QyxJQUFBLEVBQUE7QUFBQSx3QkFDQVMsT0FBQSxDQUFBMEQsS0FBQSxDQUFBLDZCQUFBLEVBREE7QUFBQSxxQkFIQTtBQUFBLG9CQU1BLE9BQUEsUUFBQU4sS0FBQSxHQUFBLE9BQUEsR0FBQXpFLENBQUEsR0FBQSxHQUFBLENBTkE7QUFBQSxpQkFBQSxFQU9Bd0QsSUFQQSxDQU9BLE1BUEEsQ0FBQSxHQU9BLEdBUEEsQ0FoQkE7QUFBQSxhQUFBLEVBd0JBRCxPQXhCQSxHQXdCQUMsSUF4QkEsQ0F3QkFhLE9BeEJBLENBQUEsQ0FSQTtBQUFBLFlBaUNBLE9BQUEsSUFBQXRELFFBQUEsQ0FBQSxHQUFBLEVBQUEsWUFBQXdELE1BQUEsQ0FBQSxDQWpDQTtBQUFBLFNBM0ZBO0FBQUEsUUErSEFVLE1BQUEsRUFBQSxVQUFBakYsQ0FBQSxFQUFBa0YsQ0FBQSxFQUFBO0FBQUEsWUFJQTtBQUFBO0FBQUE7QUFBQSxxQkFBQXRGLENBQUEsSUFBQUksQ0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQWtGLENBQUEsQ0FBQXRGLENBQUEsS0FBQUksQ0FBQSxDQUFBSixDQUFBLENBQUEsRUFBQTtBQUFBLG9CQUNBLE9BQUEsS0FBQSxDQURBO0FBQUEsaUJBREE7QUFBQSxhQUpBO0FBQUEsWUFTQSxPQUFBLElBQUEsQ0FUQTtBQUFBLFNBL0hBO0FBQUEsUUEySUF1RixTQUFBLEVBQUEsVUFBQXJCLEdBQUEsRUFBQUssS0FBQSxFQUFBO0FBQUEsWUFJQTtBQUFBO0FBQUE7QUFBQSxtQkFBQUwsR0FBQSxHQUFBLEdBQUEsQ0FKQTtBQUFBLFNBM0lBO0FBQUEsUUFrSkFzQixVQUFBLEVBQUEsVUFBQTFHLElBQUEsRUFBQTJHLE1BQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQUMsU0FBQSxHQUFBLFlBQUE7QUFBQSxnQkFDQUQsTUFBQSxHQUFBRSxJQUFBLENBQUE3RyxJQUFBLEVBREE7QUFBQSxhQUFBLENBREE7QUFBQSxZQUlBLE9BQUE0RyxTQUFBLENBSkE7QUFBQSxTQWxKQTtBQUFBLFFBeUpBRSxZQUFBLEVBQUEsWUFBQTtBQUFBLFlBSUE7QUFBQTtBQUFBO0FBQUEsWUFBQS9GLElBQUEsQ0FBQWdHLFlBQUEsRUFBQUMsSUFBQSxHQUFBaEcsSUFBQSxDQUFBLFVBQUFFLENBQUEsRUFBQTtBQUFBLGdCQUNBLE9BQUE2RixZQUFBLENBQUE3RixDQUFBLENBQUEsQ0FEQTtBQUFBLGFBQUEsRUFKQTtBQUFBLFNBekpBO0FBQUEsUUFrS0ErRixnQkFBQSxFQUFBLFlBQUE7QUFBQSxZQUNBbEcsSUFBQSxDQUFBZ0csWUFBQSxFQUNBckIsTUFEQSxDQUNBLFVBQUF6RSxDQUFBLEVBQUFHLENBQUEsRUFBQTtBQUFBLGdCQUFBLE9BQUFMLElBQUEsQ0FBQUssQ0FBQSxFQUFBOEYsVUFBQSxDQUFBLGNBQUEsQ0FBQSxDQUFBO0FBQUEsYUFEQSxFQUVBRixJQUZBLEdBR0FoRyxJQUhBLENBR0EsVUFBQUksQ0FBQSxFQUFBO0FBQUEsZ0JBQUEsT0FBQTJGLFlBQUEsQ0FBQTNGLENBQUEsQ0FBQSxDQUFBO0FBQUEsYUFIQSxFQURBO0FBQUEsU0FsS0E7QUFBQSxRQXlLQUMsT0FBQSxFQUFBLFVBQUE4RixHQUFBLEVBQUEvQixHQUFBLEVBQUE7QUFBQSxZQUNBLE9BQUFBLEdBQUEsQ0FBQWdDLEtBQUEsQ0FBQUQsR0FBQSxFQUFBOUYsT0FBQSxHQUFBeUQsSUFBQSxDQUFBcUMsR0FBQSxDQUFBLENBREE7QUFBQSxTQXpLQTtBQUFBLFFBNEtBRSxZQUFBLEVBQUEsVUFBQUMsR0FBQSxFQUFBO0FBQUEsWUFDQSxJQUFBakMsR0FBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLFlBRUEsS0FBQSxJQUFBL0QsQ0FBQSxHQUFBZ0csR0FBQSxDQUFBaEMsTUFBQSxHQUFBLENBQUEsQ0FBQSxDQUFBaEUsQ0FBQSxJQUFBLENBQUEsRUFBQUEsQ0FBQSxFQUFBLEVBQUE7QUFBQSxnQkFDQSxLQUFBLElBQUFrRixDQUFBLEdBQUFjLEdBQUEsQ0FBQWhDLE1BQUEsR0FBQSxDQUFBLENBQUEsQ0FBQWtCLENBQUEsSUFBQSxDQUFBLEVBQUFBLENBQUEsRUFBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQWxGLENBQUEsS0FBQWtGLENBQUE7QUFBQSx3QkFDQW5CLEdBQUEsQ0FBQTdGLElBQUEsQ0FBQTtBQUFBLDRCQUFBOEgsR0FBQSxDQUFBaEcsQ0FBQSxDQUFBO0FBQUEsNEJBQUFnRyxHQUFBLENBQUFkLENBQUEsQ0FBQTtBQUFBLHlCQUFBLEVBRkE7QUFBQSxpQkFEQTtBQUFBLGFBRkE7QUFBQSxZQVFBLE9BQUFuQixHQUFBLENBUkE7QUFBQSxTQTVLQTtBQUFBLFFBdUxBa0MsT0FBQSxFQUFBLFVBQUF2SCxJQUFBLEVBQUF3SCxRQUFBLEVBQUE7QUFBQSxZQUNBLElBQUFDLE1BQUEsR0FBQSxZQUFBO0FBQUEsZ0JBQ0EsSUFBQXpILElBQUEsRUFBQSxFQUFBO0FBQUEsb0JBQ0F3SCxRQUFBLEdBREE7QUFBQSxpQkFBQSxNQUVBO0FBQUEsb0JBQ0FFLFVBQUEsQ0FBQUQsTUFBQSxFQUFBLEdBQUEsRUFEQTtBQUFBLGlCQUhBO0FBQUEsYUFBQSxDQURBO0FBQUEsWUFRQUMsVUFBQSxDQUFBRCxNQUFBLEVBQUEsR0FBQSxFQVJBO0FBQUEsU0F2TEE7QUFBQSxRQWtNQUUsSUFBQSxFQUFBQyxPQWxNQTtBQUFBLFFBb01BQyxJQUFBLEVBQUEsWUFBQTtBQUFBLFNBcE1BO0FBQUEsUUFzTUFDLFFBQUEsRUFBQSxJQUFBQyxJQUFBLEdBQUFDLGlCQUFBLEtBQUEsS0F0TUE7QUFBQSxRQXdNQUMsY0FBQSxFQUFBO0FBQUEsWUFDQUMsSUFBQSxFQUFBLFVBQUE1RyxDQUFBLEVBQUE7QUFBQSxnQkFBQSxPQUFBLElBQUF5RyxJQUFBLENBQUF6RyxDQUFBLEdBQUEsSUFBQSxHQUFBakMsS0FBQSxDQUFBeUksUUFBQSxDQUFBLENBQUE7QUFBQSxhQURBO0FBQUEsWUFFQUssUUFBQSxFQUFBLFVBQUE3RyxDQUFBLEVBQUE7QUFBQSxnQkFBQSxPQUFBLElBQUF5RyxJQUFBLENBQUF6RyxDQUFBLEdBQUEsSUFBQSxHQUFBakMsS0FBQSxDQUFBeUksUUFBQSxDQUFBLENBQUE7QUFBQSxhQUZBO0FBQUEsWUFHQU0sTUFBQSxFQUFBLFVBQUE5RyxDQUFBLEVBQUE7QUFBQSxnQkFBQSxPQUFBQSxDQUFBLENBQUEvQixRQUFBLEVBQUEsQ0FBQTtBQUFBLGFBSEE7QUFBQSxZQUlBOEksSUFBQSxFQUFBLFVBQUEvRyxDQUFBLEVBQUE7QUFBQSxnQkFBQSxPQUFBQSxDQUFBLENBQUEvQixRQUFBLEVBQUEsQ0FBQTtBQUFBLGFBSkE7QUFBQSxZQUtBK0ksT0FBQSxFQUFBLFVBQUFoSCxDQUFBLEVBQUE7QUFBQSxnQkFBQSxPQUFBaUgsUUFBQSxDQUFBakgsQ0FBQSxDQUFBLENBQUE7QUFBQSxhQUxBO0FBQUEsWUFNQWtILEtBQUEsRUFBQSxVQUFBbEgsQ0FBQSxFQUFBO0FBQUEsZ0JBQUEsT0FBQW1ILFVBQUEsQ0FBQW5ILENBQUEsQ0FBQSxDQUFBO0FBQUEsYUFOQTtBQUFBLFNBeE1BO0FBQUEsUUFnTkFZLElBQUEsRUFBQUosVUFBQSxFQWhOQTtBQUFBLEtBQUEsQztJQzdOQSxhO0lBRUEsTUFBQTRHLFNBQUEsR0FBQSx5QkFBQSxDO0lBRUEsU0FBQUMsa0JBQUEsQ0FBQUMsUUFBQSxFQUFBQyxhQUFBLEVBQUE7QUFBQSxRQUlBO0FBQUE7QUFBQTtBQUFBLFlBQUFsSCxJQUFBLEdBQUEsSUFBQSxDQUpBO0FBQUEsUUFNQSxJQUFBbUgsVUFBQSxHQUFBLElBQUFDLE1BQUEsQ0FBQUgsUUFBQSxDQUFBLENBTkE7QUFBQSxRQU9BRSxVQUFBLENBQUFFLE1BQUEsR0FBQSxVQUFBMUgsQ0FBQSxFQUFBO0FBQUEsWUFDQXFCLE9BQUEsQ0FBQUQsR0FBQSxDQUFBLFlBQUFwQixDQUFBLEVBREE7QUFBQSxZQUVBd0gsVUFBQSxDQUFBRyxNQUFBLEdBRkE7QUFBQSxZQUdBSixhQUFBLENBQUFsSSxJQUFBLENBQUEsMEJBQUEsRUFBQVcsQ0FBQSxFQUhBO0FBQUEsU0FBQSxDQVBBO0FBQUEsUUFZQXdILFVBQUEsQ0FBQUksU0FBQSxHQUFBLFVBQUE1SCxDQUFBLEVBQUE7QUFBQSxZQUNBLElBQUFBLENBQUEsQ0FBQTRFLElBQUEsSUFBQSxTQUFBLEVBQUE7QUFBQSxnQkFFQTtBQUFBLG9CQUFBO0FBQUEsb0JBRUE7QUFBQSxvQkFBQTJDLGFBQUEsQ0FBQWxJLElBQUEsQ0FBQSx1QkFBQSxFQUFBK0MsSUFBQSxDQUFBQyxLQUFBLENBQUFyQyxDQUFBLENBQUF3QixJQUFBLENBQUE7QUFGQSxpQkFBQSxDQUlBLE9BQUFxRyxDQUFBLEVBQUE7QUFBQSxvQkFDQU4sYUFBQSxDQUFBbEksSUFBQSxDQUFBLHVCQUFBLEVBQUErQyxJQUFBLENBQUFDLEtBQUEsQ0FBQXJDLENBQUEsQ0FBQXdCLElBQUEsQ0FBQSxFQURBO0FBQUEsaUJBTkE7QUFBQSxhQUFBLE1BU0E7QUFBQSxnQkFDQUgsT0FBQSxDQUFBRCxHQUFBLENBQUEsZ0JBQUEsRUFBQXBCLENBQUEsRUFEQTtBQUFBLGFBVkE7QUFBQSxTQUFBLENBWkE7QUFBQSxRQTBCQXdILFVBQUEsQ0FBQU0sT0FBQSxHQUFBLFlBQUE7QUFBQSxZQUNBMUIsVUFBQSxDQUFBckksS0FBQSxDQUFBZ0ssU0FBQSxFQUFBLElBQUEsRUFEQTtBQUFBLFlBRUFSLGFBQUEsQ0FBQWxJLElBQUEsQ0FBQSw0QkFBQSxFQUZBO0FBQUEsU0FBQSxDQTFCQTtBQUFBLFFBOEJBbUksVUFBQSxDQUFBRyxNQUFBLEdBQUEsWUFBQTtBQUFBLFlBQ0FILFVBQUEsQ0FBQS9ELElBQUEsQ0FBQSxZQUFBOEQsYUFBQSxDQUFBUyxZQUFBLENBQUF2RyxXQUFBLEdBQUEsR0FBQSxHQUFBOEYsYUFBQSxDQUFBUyxZQUFBLENBQUF0RyxLQUFBLEVBREE7QUFBQSxTQUFBLENBOUJBO0FBQUEsUUFpQ0EsS0FBQXVHLEtBQUEsR0FBQSxZQUFBO0FBQUEsWUFDQVQsVUFBQSxDQUFBUyxLQUFBLEdBREE7QUFBQSxTQUFBLENBakNBO0FBQUEsSztJQXNDQSxTQUFBQyxpQkFBQSxDQUFBWixRQUFBLEVBQUFhLFFBQUEsRUFBQTtBQUFBLFFBVUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsWUFBQXBKLE1BQUEsR0FBQSxJQUFBRCxpQkFBQSxFQUFBLENBVkE7QUFBQSxRQVdBLEtBQUFxSixRQUFBLEdBQUFBLFFBQUEsQ0FYQTtBQUFBLFFBWUEsS0FBQWIsUUFBQSxHQUFBQSxRQUFBLENBQUFjLFFBQUEsQ0FBQSxHQUFBLElBQUFkLFFBQUEsR0FBQUEsUUFBQSxHQUFBLEdBQUEsQ0FaQTtBQUFBLFFBYUEsS0FBQXBJLEVBQUEsR0FBQUgsTUFBQSxDQUFBRyxFQUFBLENBYkE7QUFBQSxRQWNBLEtBQUFLLE1BQUEsR0FBQVIsTUFBQSxDQUFBUSxNQUFBLENBZEE7QUFBQSxRQWVBLEtBQUFGLElBQUEsR0FBQU4sTUFBQSxDQUFBTSxJQUFBLENBZkE7QUFBQSxRQWdCQSxLQUFBYSxJQUFBLEdBQUFuQixNQUFBLENBQUFtQixJQUFBLENBaEJBO0FBQUEsUUFpQkEsS0FBQThILFlBQUEsR0FBQSxFQUFBLENBakJBO0FBQUEsUUFrQkEsS0FBQUssV0FBQSxHQUFBLEtBQUEsQ0FsQkE7QUFBQSxRQW1CQSxLQUFBQyxVQUFBLEdBQUEsS0FBQSxDQW5CQTtBQUFBLFFBcUJBO0FBQUEsWUFBQXpKLEdBQUEsR0FBQSxJQUFBLENBckJBO0FBQUEsSztJQXNCQSxDO0lBRUFxSixpQkFBQSxDQUFBdkssU0FBQSxDQUFBNEssS0FBQSxHQUFBLFVBQUFoSCxHQUFBLEVBQUFDLElBQUEsRUFBQTBFLFFBQUEsRUFBQTtBQUFBLFFBU0E7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBQUFySCxHQUFBLEdBQUEsSUFBQSxDQVRBO0FBQUEsUUFVQSxJQUFBMkosT0FBQSxHQUFBLElBQUE1RyxPQUFBLENBQUEsVUFBQUMsTUFBQSxFQUFBQyxNQUFBLEVBQUE7QUFBQSxZQUNBL0QsS0FBQSxDQUFBdUQsR0FBQSxDQUFBekMsR0FBQSxDQUFBeUksUUFBQSxHQUFBL0YsR0FBQSxFQUFBQyxJQUFBLEVBQUEzQyxHQUFBLENBQUFtSixZQUFBLENBQUF2RyxXQUFBLEVBQUE1QyxHQUFBLENBQUFtSixZQUFBLENBQUF0RyxLQUFBLEVBQ0E2RCxJQURBLENBQ0EsVUFBQWtELEdBQUEsRUFBQTtBQUFBLGdCQUNBNUosR0FBQSxDQUFBUSxJQUFBLENBQUEsZUFBQSxFQUFBb0osR0FBQSxDQUFBbkcsWUFBQSxFQUFBbUcsR0FBQSxDQUFBaEcsTUFBQSxFQUFBbEIsR0FBQSxFQUFBQyxJQUFBLEVBREE7QUFBQSxnQkFFQTNDLEdBQUEsQ0FBQVEsSUFBQSxDQUFBLG1CQUFBb0osR0FBQSxDQUFBaEcsTUFBQSxFQUFBZ0csR0FBQSxDQUFBbkcsWUFBQSxFQUFBZixHQUFBLEVBQUFDLElBQUEsRUFGQTtBQUFBLGdCQUdBLElBQUFpSCxHQUFBLENBQUF0RyxZQUFBLEVBQUE7QUFBQSxvQkFDQXRELEdBQUEsQ0FBQVEsSUFBQSxDQUFBLG1CQUFBb0osR0FBQSxDQUFBaEcsTUFBQSxHQUFBLE9BQUEsRUFBQWdHLEdBQUEsQ0FBQXRHLFlBQUEsRUFBQVosR0FBQSxFQUFBQyxJQUFBLEVBREE7QUFBQSxpQkFIQTtBQUFBLGdCQU1BLElBQUEwRSxRQUFBLEVBQUE7QUFBQSxvQkFBQUEsUUFBQSxDQUFBdUMsR0FBQSxDQUFBdEcsWUFBQSxJQUFBc0csR0FBQSxDQUFBbkcsWUFBQSxFQUFBO0FBQUEsaUJBTkE7QUFBQSxnQkFNQSxDQU5BO0FBQUEsZ0JBT0FULE1BQUEsQ0FBQTRHLEdBQUEsQ0FBQXRHLFlBQUEsSUFBQXNHLEdBQUEsQ0FBQW5HLFlBQUEsRUFQQTtBQUFBLGFBREEsRUFTQSxVQUFBbUcsR0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQUEsR0FBQSxDQUFBdEcsWUFBQSxFQUFBO0FBQUEsb0JBQ0F0RCxHQUFBLENBQUFRLElBQUEsQ0FBQSxZQUFBLEVBQUFvSixHQUFBLENBQUF0RyxZQUFBLEVBQUFzRyxHQUFBLENBQUFoRyxNQUFBLEVBQUFsQixHQUFBLEVBQUFDLElBQUEsRUFBQWlILEdBQUEsRUFEQTtBQUFBLG9CQUVBNUosR0FBQSxDQUFBUSxJQUFBLENBQUEsZ0JBQUFvSixHQUFBLENBQUFoRyxNQUFBLEVBQUFnRyxHQUFBLENBQUF0RyxZQUFBLEVBQUFaLEdBQUEsRUFBQUMsSUFBQSxFQUFBaUgsR0FBQSxFQUZBO0FBQUEsaUJBQUEsTUFHQTtBQUFBLG9CQUNBNUosR0FBQSxDQUFBUSxJQUFBLENBQUEsWUFBQSxFQUFBb0osR0FBQSxDQUFBbkcsWUFBQSxFQUFBbUcsR0FBQSxDQUFBaEcsTUFBQSxFQUFBbEIsR0FBQSxFQUFBQyxJQUFBLEVBQUFpSCxHQUFBLEVBREE7QUFBQSxvQkFFQTVKLEdBQUEsQ0FBQVEsSUFBQSxDQUFBLGdCQUFBb0osR0FBQSxDQUFBaEcsTUFBQSxFQUFBZ0csR0FBQSxDQUFBbkcsWUFBQSxFQUFBZixHQUFBLEVBQUFDLElBQUEsRUFBQWlILEdBQUEsRUFGQTtBQUFBLGlCQUpBO0FBQUEsZ0JBUUEzRyxNQUFBLENBQUEyRyxHQUFBLENBQUF0RyxZQUFBLElBQUFzRyxHQUFBLENBQUFuRyxZQUFBLEVBUkE7QUFBQSxhQVRBLEVBREE7QUFBQSxTQUFBLENBQUEsQ0FWQTtBQUFBLFFBK0JBLE9BQUFrRyxPQUFBLENBL0JBO0FBQUEsS0FBQSxDO0lBeUNBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQU4saUJBQUEsQ0FBQXZLLFNBQUEsQ0FBQThFLE1BQUEsR0FBQSxVQUFBeUQsUUFBQSxFQUFBd0MsS0FBQSxFQUFBO0FBQUEsUUFFQTtBQUFBLFlBQUF4SCxHQUFBLEdBQUEsV0FBQSxLQUFBb0csUUFBQSxDQUZBO0FBQUEsUUFHQSxJQUFBekksR0FBQSxHQUFBLElBQUEsQ0FIQTtBQUFBLFFBSUEsSUFBQTZKLEtBQUEsRUFBQTtBQUFBLFlBQ0EsS0FBQVYsWUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLFlBRUEsT0FBQXZDLFlBQUEsQ0FBQXZFLEdBQUEsQ0FBQSxDQUZBO0FBQUEsU0FKQTtBQUFBLFFBUUEsSUFBQSxLQUFBeUgsYUFBQSxFQUFBO0FBQUEsWUFFQTtBQUFBLFlBQUE1SyxLQUFBLENBQUFrSSxPQUFBLENBQUEsWUFBQTtBQUFBLGdCQUNBLE9BQUEsQ0FBQXBILEdBQUEsQ0FBQThKLGFBQUEsQ0FEQTtBQUFBLGFBQUEsRUFFQSxZQUFBO0FBQUEsZ0JBQ0E5SixHQUFBLENBQUE0RCxNQUFBLENBQUF5RCxRQUFBLEVBQUF3QyxLQUFBLEVBREE7QUFBQSxhQUZBLEVBRkE7QUFBQSxZQU9BLE9BUEE7QUFBQSxTQVJBO0FBQUEsUUFtQkE7QUFBQTtBQUFBLFlBQUFqSixJQUFBLENBQUEsS0FBQXVJLFlBQUEsRUFBQTdFLElBQUEsRUFBQSxFQUFBO0FBQUEsWUFDQStDLFFBQUEsQ0FBQSxLQUFBOEIsWUFBQTtBQUFBLENBREE7QUFBQSxTQUFBLE1BR0E7QUFBQSxZQUNBLElBQUF4RyxJQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsWUFFQSxJQUFBTixHQUFBLElBQUF1RSxZQUFBLEVBQUE7QUFBQSxnQkFDQWpFLElBQUEsQ0FBQTBCLFNBQUEsR0FBQXVDLFlBQUEsQ0FBQXZFLEdBQUEsQ0FBQSxDQURBO0FBQUEsYUFGQTtBQUFBLFlBS0EsS0FBQXlILGFBQUEsR0FBQSxJQUFBLENBTEE7QUFBQSxZQU1BLEtBQUFKLEtBQUEsQ0FBQSxZQUFBLEVBQUEvRyxJQUFBLEVBQUEsVUFBQWlCLE1BQUEsRUFBQTtBQUFBLGdCQUNBNUQsR0FBQSxDQUFBK0osWUFBQSxDQUFBbkcsTUFBQSxFQURBO0FBQUEsZ0JBRUFnRCxZQUFBLENBQUF2RSxHQUFBLElBQUF1QixNQUFBLENBQUFmLEtBQUEsQ0FGQTtBQUFBLGdCQUdBd0UsUUFBQSxDQUFBekQsTUFBQSxFQUhBO0FBQUEsZ0JBSUE1RCxHQUFBLENBQUE4SixhQUFBLEdBQUEsS0FBQSxDQUpBO0FBQUEsYUFBQSxFQU5BO0FBQUEsWUFhQTtBQUFBLG1CQWJBO0FBQUEsU0F0QkE7QUFBQSxRQXFDQXpDLFFBQUEsQ0FBQSxLQUFBOEIsWUFBQSxFQXJDQTtBQUFBLEtBQUEsQztJQXdDQUUsaUJBQUEsQ0FBQXZLLFNBQUEsQ0FBQWlMLFlBQUEsR0FBQSxVQUFBbkcsTUFBQSxFQUFBO0FBQUEsUUFDQSxJQUFBb0csU0FBQSxHQUFBMUIsVUFBQSxDQUFBMUIsWUFBQSxDQUFBb0QsU0FBQSxLQUFBLENBQUEsQ0FEQTtBQUFBLFFBRUEsSUFBQUEsU0FBQSxHQUFBcEcsTUFBQSxDQUFBcUcsVUFBQSxFQUFBO0FBQUEsWUFDQS9LLEtBQUEsQ0FBQTRILGdCQUFBLEdBREE7QUFBQSxZQUVBRixZQUFBLENBQUFvRCxTQUFBLEdBQUFwRyxNQUFBLENBQUFxRyxVQUFBLENBRkE7QUFBQSxTQUZBO0FBQUEsUUFNQSxLQUFBVCxXQUFBLEdBQUEvQixPQUFBLENBQUE3RCxNQUFBLENBQUFmLEtBQUEsQ0FBQSxDQU5BO0FBQUEsUUFPQSxLQUFBNEcsVUFBQSxHQUFBaEMsT0FBQSxDQUFBN0QsTUFBQSxDQUFBc0csT0FBQSxDQUFBLENBUEE7QUFBQSxRQVFBLElBQUFDLFNBQUEsR0FBQSxLQUFBaEIsWUFBQSxDQVJBO0FBQUEsUUFTQSxLQUFBQSxZQUFBLEdBQUF2RixNQUFBLENBVEE7QUFBQSxRQVVBLElBQUEsQ0FBQXVHLFNBQUEsQ0FBQUQsT0FBQSxJQUFBdEcsTUFBQSxDQUFBc0csT0FBQSxFQUFBO0FBQUEsWUFDQSxLQUFBMUosSUFBQSxDQUFBLFdBQUEsRUFBQW9ELE1BQUEsQ0FBQXNHLE9BQUEsRUFEQTtBQUFBLFNBQUEsTUFFQSxJQUFBQyxTQUFBLENBQUFELE9BQUEsSUFBQSxDQUFBdEcsTUFBQSxDQUFBc0csT0FBQSxFQUFBO0FBQUEsWUFDQSxLQUFBMUosSUFBQSxDQUFBLFlBQUEsRUFEQTtBQUFBLFNBQUEsTUFFQSxJQUFBLEtBQUFnSixXQUFBLElBQUEsQ0FBQSxLQUFBQyxVQUFBLEVBQUE7QUFBQSxZQUNBLEtBQUFqSixJQUFBLENBQUEsZ0JBQUEsRUFEQTtBQUFBLFlBRUEsSUFBQSxLQUFBOEksUUFBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQWMsU0FBQSxHQUFBLEtBQUFkLFFBQUEsRUFBQSxDQURBO0FBQUEsZ0JBRUEsSUFBQWMsU0FBQSxDQUFBcEUsV0FBQSxLQUFBcUUsTUFBQSxFQUFBO0FBQUEsb0JBQ0EsS0FBQUMsS0FBQSxDQUFBRixTQUFBLENBQUFHLFFBQUEsRUFBQUgsU0FBQSxDQUFBSSxRQUFBLEVBQUFKLFNBQUEsQ0FBQS9DLFFBQUEsRUFEQTtBQUFBLGlCQUFBLE1BRUEsSUFBQStDLFNBQUEsQ0FBQXBFLFdBQUEsS0FBQWpELE9BQUEsRUFBQTtBQUFBLG9CQUNBcUgsU0FBQSxDQUFBMUQsSUFBQSxDQUFBLFVBQUErRCxHQUFBLEVBQUE7QUFBQSx3QkFDQSxLQUFBSCxLQUFBLENBQUFHLEdBQUEsQ0FBQUYsUUFBQSxFQUFBRSxHQUFBLENBQUFELFFBQUEsRUFBQUMsR0FBQSxDQUFBcEQsUUFBQSxFQURBO0FBQUEscUJBQUEsRUFEQTtBQUFBLGlCQUpBO0FBQUEsYUFGQTtBQUFBLFNBZEE7QUFBQSxRQTRCQTtBQUFBLFlBQUEsQ0FBQThDLFNBQUEsQ0FBQU8sZ0JBQUEsSUFBQTlHLE1BQUEsQ0FBQThHLGdCQUFBLEVBQUE7QUFBQSxZQUNBLEtBQUFDLFlBQUEsR0FBQSxJQUFBbkMsa0JBQUEsQ0FBQTVFLE1BQUEsQ0FBQThHLGdCQUFBLEVBQUEsSUFBQSxDQUFBO0FBREEsU0FBQSxNQUdBLElBQUFQLFNBQUEsQ0FBQU8sZ0JBQUEsSUFBQSxDQUFBOUcsTUFBQSxDQUFBOEcsZ0JBQUEsRUFBQTtBQUFBLFlBQ0EsS0FBQUMsWUFBQSxDQUFBdkIsS0FBQSxHQURBO0FBQUEsWUFFQSxPQUFBLEtBQUF1QixZQUFBLENBRkE7QUFBQSxTQS9CQTtBQUFBLFFBbUNBLEtBQUFuSyxJQUFBLENBQUEsMEJBQUEsRUFBQW9ELE1BQUEsRUFBQXVHLFNBQUEsRUFuQ0E7QUFBQSxRQW9DQXZELFlBQUEsQ0FBQTJCLFNBQUEsSUFBQWhGLElBQUEsQ0FBQWdCLFNBQUEsQ0FBQVgsTUFBQSxDQUFBLENBcENBO0FBQUEsS0FBQSxDO0lBdUNBeUYsaUJBQUEsQ0FBQXZLLFNBQUEsQ0FBQXdMLEtBQUEsR0FBQSxVQUFBQyxRQUFBLEVBQUFDLFFBQUEsRUFBQTtBQUFBLFFBUUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxZQUFBeEssR0FBQSxHQUFBLElBQUEsQ0FSQTtBQUFBLFFBU0EsT0FBQSxJQUFBK0MsT0FBQSxDQUFBLFVBQUFDLE1BQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsWUFDQS9ELEtBQUEsQ0FBQXVELEdBQUEsQ0FBQXpDLEdBQUEsQ0FBQXlJLFFBQUEsR0FBQSxXQUFBLEVBQUE7QUFBQSxnQkFBQThCLFFBQUEsRUFBQUEsUUFBQSxJQUFBLEVBQUE7QUFBQSxnQkFBQUMsUUFBQSxFQUFBQSxRQUFBLElBQUEsRUFBQTtBQUFBLGFBQUEsRUFBQSxJQUFBLEVBQUF4SyxHQUFBLENBQUFtSixZQUFBLENBQUF0RyxLQUFBLEVBQUEsSUFBQSxFQUNBNkQsSUFEQSxDQUNBLFVBQUFrRCxHQUFBLEVBQUE7QUFBQSxnQkFFQTtBQUFBLGdCQUFBNUosR0FBQSxDQUFBK0osWUFBQSxDQUFBSCxHQUFBLENBQUF0RyxZQUFBLEVBRkE7QUFBQSxnQkFJQTtBQUFBLGdCQUFBTixNQUFBLENBQUE7QUFBQSxvQkFBQVksTUFBQSxFQUFBLFNBQUE7QUFBQSxvQkFBQWdILE1BQUEsRUFBQTVLLEdBQUEsQ0FBQW1KLFlBQUEsQ0FBQWUsT0FBQTtBQUFBLGlCQUFBLEVBSkE7QUFBQSxhQURBLEVBTUEsVUFBQU4sR0FBQSxFQUFBO0FBQUEsZ0JBRUE7QUFBQSxnQkFBQTVHLE1BQUEsQ0FBQTtBQUFBLG9CQUFBa0QsS0FBQSxFQUFBMEQsR0FBQSxDQUFBdEcsWUFBQSxDQUFBNEMsS0FBQTtBQUFBLG9CQUFBdEMsTUFBQSxFQUFBLE9BQUE7QUFBQSxpQkFBQSxFQUZBO0FBQUEsYUFOQSxFQURBO0FBQUEsU0FBQSxDQUFBLENBVEE7QUFBQSxLQUFBLEM7SUF1QkF5RixpQkFBQSxDQUFBdkssU0FBQSxDQUFBK0wsTUFBQSxHQUFBLFlBQUE7QUFBQSxRQUNBLElBQUE3SyxHQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsUUFFQSxPQUFBLElBQUErQyxPQUFBLENBQUEsVUFBQUMsTUFBQSxFQUFBQyxNQUFBLEVBQUE7QUFBQSxZQUNBakQsR0FBQSxDQUFBMEosS0FBQSxDQUFBLFlBQUEsRUFDQWhELElBREEsQ0FDQSxVQUFBb0UsRUFBQSxFQUFBO0FBQUEsZ0JBQ0E5SyxHQUFBLENBQUErSixZQUFBLENBQUEsRUFBQSxFQURBO0FBQUEsZ0JBRUEsT0FBQW5ELFlBQUEsQ0FBQTJCLFNBQUEsQ0FBQSxDQUZBO0FBQUEsZ0JBR0F2RixNQUFBLEdBSEE7QUFBQSxhQURBLEVBS0FDLE1BTEEsRUFEQTtBQUFBLFNBQUEsQ0FBQSxDQUZBO0FBQUEsS0FBQSxDO0lBWUFvRyxpQkFBQSxDQUFBdkssU0FBQSxDQUFBaU0sT0FBQSxHQUFBLFVBQUExRCxRQUFBLEVBQUE7QUFBQSxRQUNBLElBQUEsS0FBQW9DLFVBQUEsRUFBQTtBQUFBLFlBQ0FwQyxRQUFBLENBQUEsS0FBQThCLFlBQUEsQ0FBQWUsT0FBQSxFQURBO0FBQUEsU0FBQSxNQUVBO0FBQUEsWUFFQTtBQUFBLGlCQUFBN0ksSUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBNkksT0FBQSxFQUFBO0FBQUEsZ0JBQ0E3QyxRQUFBLENBQUE2QyxPQUFBLEVBREE7QUFBQSxhQUFBLEVBRkE7QUFBQSxZQUtBLEtBQUF0RyxNQUFBLENBQUF5RCxRQUFBLElBQUFuSSxLQUFBLENBQUF3SSxJQUFBLEVBTEE7QUFBQSxTQUhBO0FBQUEsS0FBQSxDO0lBWUF4SSxLQUFBLENBQUFtSyxpQkFBQSxHQUFBQSxpQkFBQSxDO0lDek9BLGE7SUFFQSxTQUFBMkIsT0FBQSxHQUFBO0FBQUEsUUFDQSxJQUFBQyxPQUFBLEdBQUEsS0FBQSxDQURBO0FBQUEsUUFFQSxLQUFBQyxLQUFBLEdBQUEsWUFBQTtBQUFBLFlBQ0FELE9BQUEsR0FBQSxJQUFBLENBREE7QUFBQSxTQUFBLENBRkE7QUFBQSxRQUtBLEtBQUFBLE9BQUEsR0FBQSxZQUFBO0FBQUEsWUFDQSxJQUFBRSxDQUFBLEdBQUFGLE9BQUEsQ0FEQTtBQUFBLFlBRUFBLE9BQUEsR0FBQSxLQUFBLENBRkE7QUFBQSxZQUdBLE9BQUFFLENBQUEsQ0FIQTtBQUFBLFNBQUEsQ0FMQTtBQUFBLEs7SUNGQSxhO0lBR0EsU0FBQUMsWUFBQSxDQUFBRixLQUFBLEVBQUFHLEtBQUEsRUFBQS9LLElBQUEsRUFBQWdMLE9BQUEsRUFBQTtBQUFBLFFBTUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBQUEsQ0FBQUQsS0FBQSxFQUFBO0FBQUEsWUFDQSxJQUFBQSxLQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsU0FOQTtBQUFBLFFBU0EsSUFBQUUsT0FBQSxHQUFBLEVBQUEsQ0FUQTtBQUFBLFFBV0EsS0FBQUMsR0FBQSxHQUFBLFVBQUFqTCxFQUFBLEVBQUFrTCxJQUFBLEVBQUE7QUFBQSxZQUNBLElBQUFILE9BQUEsSUFBQS9LLEVBQUEsSUFBQStLLE9BQUEsQ0FBQTVGLE1BQUEsRUFBQTtBQUFBLGdCQUNBLE9BREE7QUFBQSxhQURBO0FBQUEsWUFJQSxJQUFBLENBQUE5RSxJQUFBLENBQUF5SyxLQUFBLEVBQUFLLFFBQUEsQ0FBQW5MLEVBQUEsQ0FBQSxFQUFBO0FBQUEsZ0JBQ0FpQyxPQUFBLENBQUFtSixJQUFBLENBQUEsYUFBQXBMLEVBQUEsR0FBQSxTQUFBLEdBQUFELElBQUEsRUFEQTtBQUFBLGdCQUVBaUwsT0FBQSxDQUFBbE0sSUFBQSxDQUFBa0IsRUFBQSxFQUZBO0FBQUEsZ0JBR0EsSUFBQSxDQUFBa0wsSUFBQTtBQUFBLG9CQUNBSixLQUFBLENBQUFoTSxJQUFBLENBQUFrQixFQUFBLEVBSkE7QUFBQSxnQkFLQTJLLEtBQUEsQ0FBQUEsS0FBQSxHQUxBO0FBQUE7QUFKQSxTQUFBLENBWEE7QUFBQSxRQXlCQSxLQUFBVSxhQUFBLEdBQUEsWUFBQTtBQUFBLFlBQ0EsT0FBQVAsS0FBQSxDQURBO0FBQUEsU0FBQSxDQXpCQTtBQUFBLFFBNkJBLEtBQUFRLFFBQUEsR0FBQSxZQUFBO0FBQUEsWUFDQSxPQUFBakwsSUFBQSxDQUFBMkssT0FBQSxDQUFBbkssTUFBQSxDQUFBLENBQUEsRUFBQW1LLE9BQUEsQ0FBQXBHLE1BQUEsQ0FBQSxFQUFBMkcsTUFBQSxHQUFBcEgsT0FBQSxFQUFBLENBREE7QUFBQSxTQUFBLENBN0JBO0FBQUEsSztJQ0hBLFNBQUFxSCxVQUFBLENBQUFDLE9BQUEsRUFBQUMsR0FBQSxFQUFBQyxXQUFBLEVBQUFDLFNBQUEsRUFBQTtBQUFBLFFBQ0EsSUFBQWpCLEtBQUEsR0FBQSxJQUFBRixPQUFBLEVBQUEsQ0FEQTtBQUFBLFFBRUEsSUFBQW9CLFNBQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxRQUdBLElBQUFDLFdBQUEsR0FBQSxFQUFBLENBSEE7QUFBQSxRQUlBLElBQUFDLEdBQUEsR0FBQSxFQUFBLENBSkE7QUFBQSxRQUtBLElBQUFDLFFBQUEsR0FBQSxFQUFBLENBTEE7QUFBQSxRQU1BLElBQUFDLFdBQUEsR0FBQSxFQUFBLENBTkE7QUFBQSxRQU9BLEtBQUFKLFNBQUEsR0FBQUEsU0FBQSxDQVBBO0FBQUEsUUFRQSxLQUFBQyxXQUFBLEdBQUFBLFdBQUEsQ0FSQTtBQUFBLFFBU0EsS0FBQUMsR0FBQSxHQUFBQSxHQUFBLENBVEE7QUFBQSxRQVVBLEtBQUFDLFFBQUEsR0FBQUEsUUFBQSxDQVZBO0FBQUEsUUFXQSxLQUFBQyxXQUFBLEdBQUFBLFdBQUEsQ0FYQTtBQUFBLFFBYUFOLFdBQUEsQ0FBQTdMLEVBQUEsQ0FBQSxrQkFBQSxFQUFBLFVBQUFpRixLQUFBLEVBQUFtSCxLQUFBLEVBQUE7QUFBQSxZQUVBO0FBQUEsZ0JBQUFuQixPQUFBLEdBQUFhLFNBQUEsQ0FBQU8sV0FBQSxDQUFBcEgsS0FBQSxDQUFBaEYsSUFBQSxFQUFBLElBQUEsQ0FBQSxDQUZBO0FBQUEsWUFHQThMLFNBQUEsQ0FBQTlHLEtBQUEsQ0FBQWhGLElBQUEsSUFBQSxJQUFBOEssWUFBQSxDQUFBRixLQUFBLEVBQUFJLE9BQUEsRUFBQSxlQUFBaEcsS0FBQSxDQUFBaEYsSUFBQSxFQUFBbU0sS0FBQSxDQUFBLENBSEE7QUFBQSxZQU1BO0FBQUEsWUFBQUQsV0FBQSxDQUFBbEgsS0FBQSxDQUFBaEYsSUFBQSxJQUFBLElBQUE4SyxZQUFBLENBQUFGLEtBQUEsRUFBQSxJQUFBLEVBQUEsaUJBQUE1RixLQUFBLENBQUFoRixJQUFBLENBQUEsQ0FOQTtBQUFBLFlBU0E7QUFBQSxZQUFBTSxJQUFBLENBQUEwRSxLQUFBLENBQUFxSCxVQUFBLEVBQUE5TCxJQUFBLENBQUEsVUFBQStMLFNBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUFDLFNBQUEsR0FBQXZILEtBQUEsQ0FBQWhGLElBQUEsR0FBQSxHQUFBLEdBQUFzTSxTQUFBLENBQUFyTSxFQUFBLENBREE7QUFBQSxnQkFFQThMLFdBQUEsQ0FBQVEsU0FBQSxJQUFBLElBQUF6QixZQUFBLENBQUFGLEtBQUEsRUFBQWlCLFNBQUEsQ0FBQU8sV0FBQSxDQUFBRSxTQUFBLENBQUFFLEVBQUEsRUFBQSxJQUFBLENBQUEsRUFBQUYsU0FBQSxDQUFBRSxFQUFBLEdBQUEsa0JBQUEsR0FBQUQsU0FBQSxDQUFBLENBRkE7QUFBQSxhQUFBLEVBVEE7QUFBQSxZQWNBO0FBQUEsWUFBQWpNLElBQUEsQ0FBQTBFLEtBQUEsQ0FBQXlILFlBQUEsRUFBQWxNLElBQUEsQ0FBQSxVQUFBK0UsS0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQWlILFNBQUEsR0FBQWpILEtBQUEsQ0FBQW9ILEVBQUEsR0FBQSxHQUFBLEdBQUFwSCxLQUFBLENBQUFyRixFQUFBLENBREE7QUFBQSxnQkFFQThMLFdBQUEsQ0FBQVEsU0FBQSxJQUFBLElBQUF6QixZQUFBLENBQUFGLEtBQUEsRUFBQWlCLFNBQUEsQ0FBQU8sV0FBQSxDQUFBOUcsS0FBQSxDQUFBb0gsRUFBQSxFQUFBcEgsS0FBQSxDQUFBckYsRUFBQSxDQUFBLEVBQUFxRixLQUFBLENBQUFvSCxFQUFBLEdBQUEsR0FBQSxHQUFBcEgsS0FBQSxDQUFBckYsRUFBQSxHQUFBLGVBQUEsR0FBQXNNLFNBQUEsQ0FBQSxDQUZBO0FBQUEsYUFBQSxFQWRBO0FBQUEsWUFrQkFqTSxJQUFBLENBQUEwRSxLQUFBLENBQUEySCxVQUFBLEVBQUFwTSxJQUFBLENBQUEsVUFBQXFNLFFBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUEsQ0FBQSxDQUFBQSxRQUFBLENBQUFMLFNBQUEsSUFBQVAsR0FBQSxDQUFBO0FBQUEsb0JBQ0FBLEdBQUEsQ0FBQVksUUFBQSxDQUFBTCxTQUFBLElBQUE7QUFBQSx3QkFBQSxJQUFBekIsWUFBQSxDQUFBRixLQUFBLEVBQUEsSUFBQSxFQUFBLFNBQUFnQyxRQUFBLENBQUFMLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFBQSx3QkFBQSxJQUFBekIsWUFBQSxDQUFBRixLQUFBLEVBQUEsSUFBQSxFQUFBLFNBQUFnQyxRQUFBLENBQUFMLFNBQUEsR0FBQSxLQUFBLENBQUE7QUFBQSxxQkFBQSxDQUZBO0FBQUEsZ0JBR0EsSUFBQSxDQUFBLENBQUFLLFFBQUEsQ0FBQUwsU0FBQSxJQUFBTixRQUFBLENBQUE7QUFBQSxvQkFDQUEsUUFBQSxDQUFBVyxRQUFBLENBQUFMLFNBQUEsSUFBQSxJQUFBTSxrQkFBQSxDQUFBRCxRQUFBLEVBQUFaLEdBQUEsQ0FBQVksUUFBQSxDQUFBTCxTQUFBLENBQUEsQ0FBQSxDQUpBO0FBQUEsYUFBQSxFQWxCQTtBQUFBLFNBQUEsRUFiQTtBQUFBLFFBc0NBLElBQUFPLE1BQUEsR0FBQSxVQUFBUCxTQUFBLEVBQUE1TCxDQUFBLEVBQUFvTSxVQUFBLEVBQUFoRyxRQUFBLEVBQUE7QUFBQSxZQUNBNkUsV0FBQSxDQUFBeEMsS0FBQSxDQUFBLENBQUF6SSxDQUFBLEdBQUEvQixLQUFBLENBQUFnQyxPQUFBLENBQUEsR0FBQSxFQUFBMkwsU0FBQSxDQUFBLEdBQUFBLFNBQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxPQUFBLEVBQUEsRUFBQVEsVUFBQSxFQUFBQSxVQUFBLEVBQUEsRUFBQSxVQUFBMUssSUFBQSxFQUFBO0FBQUEsZ0JBQ0F1SixXQUFBLENBQUFvQixPQUFBLENBQUEzSyxJQUFBLEVBQUEwRSxRQUFBLEVBREE7QUFBQSxnQkFFQSxPQUFBMkUsT0FBQSxDQUFBYSxTQUFBLENBQUEsQ0FGQTtBQUFBLGFBQUEsRUFEQTtBQUFBLFNBQUEsQ0F0Q0E7QUFBQSxRQTZDQSxJQUFBVSxNQUFBLEdBQUEsVUFBQVYsU0FBQSxFQUFBUSxVQUFBLEVBQUFwTSxDQUFBLEVBQUFvRyxRQUFBLEVBQUE7QUFBQSxZQUVBO0FBQUEsWUFBQXpHLElBQUEsQ0FBQXlNLFVBQUEsRUFBQXhNLElBQUEsQ0FBQXlMLEdBQUEsQ0FBQU8sU0FBQSxFQUFBNUwsQ0FBQSxFQUFBdUssR0FBQSxDQUFBckosSUFBQSxDQUFBbUssR0FBQSxDQUFBTyxTQUFBLEVBQUE1TCxDQUFBLENBQUEsQ0FBQSxFQUZBO0FBQUEsWUFJQTtBQUFBLFlBQUFvTSxVQUFBLEdBQUFmLEdBQUEsQ0FBQU8sU0FBQSxFQUFBNUwsQ0FBQSxFQUFBNEssUUFBQSxFQUFBLENBSkE7QUFBQSxZQU1BO0FBQUEsZ0JBQUF3QixVQUFBLENBQUFsSSxNQUFBLEVBQUE7QUFBQSxnQkFDQTZHLE9BQUEsQ0FBQWEsU0FBQSxJQUFBLENBQUEsQ0FEQTtBQUFBLGdCQUVBTyxNQUFBLENBQUFQLFNBQUEsRUFBQTVMLENBQUEsRUFBQW9NLFVBQUEsRUFBQWhHLFFBQUEsRUFGQTtBQUFBLGFBQUEsTUFHQTtBQUFBLGdCQUNBQSxRQUFBLElBQUFBLFFBQUEsRUFBQSxDQURBO0FBQUEsYUFUQTtBQUFBLFNBQUEsQ0E3Q0E7QUFBQSxRQTBEQSxLQUFBa0csTUFBQSxHQUFBQSxNQUFBLENBMURBO0FBQUEsUUE0REEsSUFBQUMsWUFBQSxHQUFBLFlBQUE7QUFBQSxZQUVBO0FBQUEsZ0JBQUEsQ0FBQXRDLEtBQUEsQ0FBQUQsT0FBQSxFQUFBO0FBQUEsZ0JBQUEsT0FGQTtBQUFBLFlBR0EsSUFBQXJLLElBQUEsQ0FBQW9MLE9BQUEsRUFBQXlCLE1BQUEsR0FBQUMsR0FBQSxFQUFBLEVBQUE7QUFBQSxnQkFDQXhDLEtBQUEsQ0FBQUEsS0FBQSxHQURBO0FBQUEsZ0JBRUEsT0FGQTtBQUFBLGFBSEE7QUFBQSxZQU9BLElBQUF5QyxPQUFBLEdBQUEsS0FBQSxDQVBBO0FBQUEsWUFRQS9NLElBQUEsQ0FBQTBMLEdBQUEsRUFBQXpMLElBQUEsQ0FBQSxVQUFBK00sT0FBQSxFQUFBZixTQUFBLEVBQUE7QUFBQSxnQkFDQWpNLElBQUEsQ0FBQWdOLE9BQUEsRUFBQS9NLElBQUEsQ0FBQSxVQUFBNEwsS0FBQSxFQUFBeEwsQ0FBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQW9NLFVBQUEsR0FBQVosS0FBQSxDQUFBWixRQUFBLEVBQUEsQ0FEQTtBQUFBLG9CQUVBd0IsVUFBQSxHQUFBek0sSUFBQSxDQUFBeU0sVUFBQSxFQUFBOUgsTUFBQSxDQUFBa0MsT0FBQSxFQUFBakQsR0FBQSxDQUFBLFVBQUFyRCxDQUFBLEVBQUE7QUFBQSx3QkFDQSxPQUFBaUgsUUFBQSxDQUFBakgsQ0FBQSxDQUFBLENBREE7QUFBQSxxQkFBQSxFQUVBdUQsT0FGQSxFQUFBLENBRkE7QUFBQSxvQkFLQSxJQUFBMkksVUFBQSxDQUFBbEksTUFBQSxFQUFBO0FBQUEsd0JBQ0EsSUFBQTBJLEtBQUEsR0FBQXRCLFFBQUEsQ0FBQU0sU0FBQSxDQUFBLENBREE7QUFBQSx3QkFFQSxJQUFBaUIsTUFBQSxHQUFBRCxLQUFBLENBQUEsUUFBQSxLQUFBNU0sQ0FBQSxDQUFBLEVBQUFrQixJQUFBLENBQUEwTCxLQUFBLENBQUEsQ0FGQTtBQUFBLHdCQUdBRixPQUFBLEdBQUEsSUFBQSxDQUhBO0FBQUEsd0JBSUFQLE1BQUEsQ0FBQVAsU0FBQSxFQUFBNUwsQ0FBQSxFQUFBb00sVUFBQSxFQUFBLFVBQUExSyxJQUFBLEVBQUE7QUFBQSw0QkFDQSxJQUFBb0wsR0FBQSxHQUFBVixVQUFBLENBQUE3SSxHQUFBLENBQUFzSixNQUFBLENBQUEsQ0FEQTtBQUFBLDRCQUVBLElBQUFDLEdBQUEsQ0FBQTVJLE1BQUEsRUFBQTtBQUFBLGdDQUNBLElBQUE2SSxVQUFBLEdBQUFuQixTQUFBLENBQUE1RixLQUFBLENBQUEsR0FBQSxFQUFBLElBQUFoRyxDQUFBLENBQUEsQ0FEQTtBQUFBLGdDQUVBaUwsV0FBQSxDQUFBK0IsUUFBQSxDQUFBRCxVQUFBLEVBQUEsWUFBQTtBQUFBLG9DQUVBO0FBQUEsb0NBQUFwTixJQUFBLENBQUFtTixHQUFBLEVBQUFHLE9BQUEsR0FBQXBDLE1BQUEsR0FBQWpMLElBQUEsQ0FBQSxVQUFBTSxDQUFBLEVBQUE7QUFBQSx3Q0FDQWlMLFNBQUEsQ0FBQTRCLFVBQUEsRUFBQXhDLEdBQUEsQ0FBQXJLLENBQUEsRUFBQSxJQUFBLEVBREE7QUFBQSxxQ0FBQSxFQUZBO0FBQUEsaUNBQUEsRUFGQTtBQUFBLDZCQUZBO0FBQUEseUJBQUEsRUFKQTtBQUFBLHFCQUxBO0FBQUEsaUJBQUEsRUFEQTtBQUFBLGFBQUEsRUFSQTtBQUFBLFlBaUNBUCxJQUFBLENBQUF3TCxTQUFBLEVBQUF2TCxJQUFBLENBQUEsVUFBQTRMLEtBQUEsRUFBQTBCLFNBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUFKLEdBQUEsR0FBQXRCLEtBQUEsQ0FBQVosUUFBQSxFQUFBLENBREE7QUFBQSxnQkFFQSxJQUFBa0MsR0FBQSxDQUFBNUksTUFBQSxFQUFBO0FBQUEsb0JBQ0F3SSxPQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsb0JBRUEsSUFBQVMsR0FBQSxHQUFBRCxTQUFBLElBQUFsQyxHQUFBLEdBQUFBLEdBQUEsQ0FBQWtDLFNBQUEsRUFBQXRILElBQUEsRUFBQSxHQUFBakcsSUFBQSxFQUFBLENBRkE7QUFBQSxvQkFJQTtBQUFBLG9CQUFBc0wsV0FBQSxDQUFBbUMsS0FBQSxDQUFBRixTQUFBLEVBQUEsRUFBQTVOLEVBQUEsRUFBQXdOLEdBQUEsRUFBQSxFQUFBLElBQUEsRUFBQTdPLEtBQUEsQ0FBQXdJLElBQUEsRUFKQTtBQUFBLGlCQUZBO0FBQUEsYUFBQSxFQWpDQTtBQUFBLFlBMkNBO0FBQUEsWUFBQTlHLElBQUEsQ0FBQXlMLFdBQUEsRUFDQTdILEdBREEsQ0FDQSxVQUFBMUQsQ0FBQSxFQUFBQyxDQUFBLEVBQUE7QUFBQSxnQkFDQSxPQUFBO0FBQUEsb0JBQUFBLENBQUE7QUFBQSxvQkFBQUQsQ0FBQSxDQUFBK0ssUUFBQSxFQUFBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGFBREEsRUFHQXRHLE1BSEEsQ0FHQSxVQUFBekUsQ0FBQSxFQUFBO0FBQUEsZ0JBQ0EsT0FBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQXFFLE1BQUEsQ0FEQTtBQUFBLGFBSEEsRUFLQXRFLElBTEEsQ0FLQSxVQUFBTSxDQUFBLEVBQUE7QUFBQSxnQkFDQXdNLE9BQUEsR0FBQSxJQUFBLENBREE7QUFBQSxnQkFFQSxJQUFBSSxHQUFBLEdBQUE1TSxDQUFBLENBQUEsQ0FBQSxDQUFBLENBRkE7QUFBQSxnQkFHQSxJQUFBMEwsU0FBQSxHQUFBMUwsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQUhBO0FBQUEsZ0JBSUEsSUFBQXNMLEtBQUEsR0FBQUksU0FBQSxDQUFBNUYsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUpBO0FBQUEsZ0JBS0EsSUFBQXFILFlBQUEsR0FBQTdCLEtBQUEsQ0FBQSxDQUFBLENBQUEsQ0FMQTtBQUFBLGdCQU1BLElBQUE4QixTQUFBLEdBQUE5QixLQUFBLENBQUEsQ0FBQSxDQUFBLENBTkE7QUFBQSxnQkFPQSxJQUFBbEgsTUFBQSxHQUFBLEVBQUEsQ0FQQTtBQUFBLGdCQVFBQSxNQUFBLENBQUFnSixTQUFBLElBQUFSLEdBQUEsQ0FSQTtBQUFBLGdCQVNBN0IsV0FBQSxDQUFBbUMsS0FBQSxDQUFBQyxZQUFBLEVBQUEvSSxNQUFBLEVBVEE7QUFBQSxhQUxBLEVBM0NBO0FBQUEsWUE0REEzRSxJQUFBLENBQUFBLElBQUEsQ0FBQTRMLFdBQUEsRUFBQWhJLEdBQUEsQ0FBQSxVQUFBMUQsQ0FBQSxFQUFBQyxDQUFBLEVBQUE7QUFBQSxnQkFDQSxPQUFBO0FBQUEsb0JBQUFBLENBQUE7QUFBQSxvQkFBQUQsQ0FBQSxDQUFBK0ssUUFBQSxFQUFBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGFBQUEsRUFFQXRHLE1BRkEsQ0FFQSxVQUFBekUsQ0FBQSxFQUFBO0FBQUEsZ0JBQ0EsT0FBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQXFFLE1BQUEsQ0FEQTtBQUFBLGFBRkEsRUFJQXFKLFFBSkEsRUFBQSxFQUlBM04sSUFKQSxDQUlBLFVBQUFrTixHQUFBLEVBQUFVLFlBQUEsRUFBQTtBQUFBLGdCQUNBZCxPQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsZ0JBRUEsSUFBQUksR0FBQSxDQUFBNUksTUFBQSxFQUFBO0FBQUEsb0JBQ0E2RyxPQUFBLENBQUF5QyxZQUFBLElBQUEsQ0FBQSxDQURBO0FBQUEsb0JBRUF2QyxXQUFBLENBQUF4QyxLQUFBLENBQUErRSxZQUFBLEdBQUEsV0FBQSxFQUFBLEVBQUFWLEdBQUEsRUFBQW5OLElBQUEsQ0FBQW1OLEdBQUEsRUFBQWpDLE1BQUEsR0FBQXBILE9BQUEsRUFBQSxFQUFBLEVBQUEsVUFBQS9CLElBQUEsRUFBQTtBQUFBLHdCQUNBdUosV0FBQSxDQUFBd0MsY0FBQSxDQUFBL0wsSUFBQSxDQUFBZ00sV0FBQSxFQURBO0FBQUEsd0JBRUEsT0FBQTNDLE9BQUEsQ0FBQXlDLFlBQUEsQ0FBQSxDQUZBO0FBQUEscUJBQUEsRUFGQTtBQUFBLGlCQUZBO0FBQUEsYUFKQSxFQTVEQTtBQUFBLFNBQUEsQ0E1REE7QUFBQSxRQXVJQUcsV0FBQSxDQUFBcEIsWUFBQSxFQUFBLEVBQUEsRUF2SUE7QUFBQSxLO0lBd0lBLEM7SUN4SUEsYTtJQUVBLFNBQUFxQixVQUFBLEdBQUE7QUFBQSxRQUNBLElBQUFDLE1BQUEsR0FBQSxFQUFBLENBREE7QUFBQSxRQUVBLElBQUF6RCxLQUFBLEdBQUEsRUFBQSxDQUZBO0FBQUEsUUFHQTtBQUFBLFlBQUEwRCxjQUFBLEdBQUEsRUFBQSxDQUhBO0FBQUEsUUFJQSxJQUFBQyxpQkFBQSxHQUFBLFVBQUE3TixDQUFBLEVBQUFrRixDQUFBLEVBQUFSLE9BQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQVgsR0FBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLFlBRUEsSUFBQVcsT0FBQSxFQUFBO0FBQUEsZ0JBQ0EsU0FBQW5DLENBQUEsSUFBQXZDLENBQUEsRUFBQTtBQUFBLG9CQUNBLFNBQUE4TixDQUFBLElBQUE1SSxDQUFBLEVBQUE7QUFBQSx3QkFDQW5CLEdBQUEsQ0FBQTdGLElBQUEsQ0FBQXVCLElBQUEsQ0FBQTtBQUFBLDRCQUFBTyxDQUFBLENBQUF1QyxDQUFBLENBQUE7QUFBQSw0QkFBQTJDLENBQUEsQ0FBQTRJLENBQUEsQ0FBQTtBQUFBLHlCQUFBLEVBQUFmLE9BQUEsR0FBQXhKLE9BQUEsRUFBQSxFQURBO0FBQUEscUJBREE7QUFBQSxpQkFEQTtBQUFBLGFBQUEsTUFNQTtBQUFBLGdCQUNBLFNBQUFoQixDQUFBLElBQUF2QyxDQUFBLEVBQUE7QUFBQSxvQkFDQSxTQUFBOE4sQ0FBQSxJQUFBNUksQ0FBQSxFQUFBO0FBQUEsd0JBQ0FuQixHQUFBLENBQUE3RixJQUFBLENBQUE7QUFBQSw0QkFBQThCLENBQUEsQ0FBQXVDLENBQUEsQ0FBQTtBQUFBLDRCQUFBMkMsQ0FBQSxDQUFBNEksQ0FBQSxDQUFBO0FBQUEseUJBQUEsRUFEQTtBQUFBLHFCQURBO0FBQUEsaUJBREE7QUFBQSxhQVJBO0FBQUEsWUFlQSxPQUFBL0osR0FBQSxDQWZBO0FBQUEsU0FBQSxDQUpBO0FBQUEsUUFxQkEsSUFBQWdLLGdCQUFBLEdBQUEsVUFBQS9ILEdBQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQXRCLE9BQUEsR0FBQSxLQUFBLENBREE7QUFBQSxZQUVBLElBQUFYLEdBQUEsR0FBQWlDLEdBQUEsQ0FBQSxDQUFBLENBQUEsQ0FGQTtBQUFBLFlBR0EsS0FBQSxJQUFBaEcsQ0FBQSxHQUFBLENBQUEsQ0FBQSxDQUFBQSxDQUFBLEdBQUFnRyxHQUFBLENBQUFoQyxNQUFBLEVBQUEsRUFBQWhFLENBQUEsRUFBQTtBQUFBLGdCQUNBK0QsR0FBQSxHQUFBOEosaUJBQUEsQ0FBQTlKLEdBQUEsRUFBQWlDLEdBQUEsQ0FBQWhHLENBQUEsQ0FBQSxFQUFBMEUsT0FBQSxDQUFBLENBREE7QUFBQSxnQkFFQUEsT0FBQSxHQUFBLElBQUEsQ0FGQTtBQUFBLGFBSEE7QUFBQSxZQU9BLE9BQUFYLEdBQUEsQ0FQQTtBQUFBLFNBQUEsQ0FyQkE7QUFBQSxRQThCQSxJQUFBaUssYUFBQSxHQUFBLFVBQUE1SixNQUFBLEVBQUE7QUFBQSxZQUNBLElBQUE2SixPQUFBLEdBQUFGLGdCQUFBLENBQUF0TyxJQUFBLENBQUEyRSxNQUFBLEVBQUFrSSxNQUFBLEdBQUEvSSxPQUFBLEVBQUEsQ0FBQSxDQURBO0FBQUEsWUFFQSxJQUFBbUMsSUFBQSxHQUFBakcsSUFBQSxDQUFBMkUsTUFBQSxFQUFBc0IsSUFBQSxHQUFBbkMsT0FBQSxFQUFBLENBRkE7QUFBQSxZQUdBLE9BQUEwSyxPQUFBLENBQUE1SyxHQUFBLENBQUEsVUFBQXJELENBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUFrTyxDQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsZ0JBRUF4SSxJQUFBLENBQUFqSCxPQUFBLENBQUEsVUFBQThELENBQUEsRUFBQXpDLENBQUEsRUFBQTtBQUFBLG9CQUNBb08sQ0FBQSxDQUFBM0wsQ0FBQSxJQUFBdkMsQ0FBQSxDQUFBRixDQUFBLENBQUEsQ0FEQTtBQUFBLGlCQUFBLEVBRkE7QUFBQSxnQkFLQSxPQUFBb08sQ0FBQSxDQUxBO0FBQUEsYUFBQSxDQUFBLENBSEE7QUFBQSxTQUFBLENBOUJBO0FBQUEsUUEwQ0EsSUFBQUMsWUFBQSxHQUFBLFVBQUFoSyxLQUFBLEVBQUFDLE1BQUEsRUFBQWdLLFFBQUEsRUFBQTtBQUFBLFlBRUE7QUFBQSxnQkFBQXBCLFNBQUEsR0FBQTdJLEtBQUEsQ0FBQTZJLFNBQUEsQ0FGQTtBQUFBLFlBR0EsSUFBQXpCLFdBQUEsR0FBQSxLQUFBQSxXQUFBLENBSEE7QUFBQSxZQUlBLElBQUE3RixJQUFBLEdBQUFqRyxJQUFBLENBQUEyRSxNQUFBLEVBQUFmLEdBQUEsQ0FBQSxVQUFBMUQsQ0FBQSxFQUFBdUIsR0FBQSxFQUFBO0FBQUEsZ0JBQUEsT0FBQTtBQUFBLG9CQUFBQSxHQUFBO0FBQUEsb0JBQUE4TCxTQUFBLEdBQUEsR0FBQSxHQUFBOUwsR0FBQTtBQUFBLGlCQUFBLENBQUE7QUFBQSxhQUFBLEVBQUFtTSxRQUFBLEVBQUEsQ0FKQTtBQUFBLFlBS0EsSUFBQVosT0FBQSxHQUFBaE4sSUFBQSxDQUFBMkUsTUFBQSxFQUFBc0IsSUFBQSxHQUFBckMsR0FBQSxDQUFBLFVBQUFuQyxHQUFBLEVBQUE7QUFBQSxnQkFBQSxPQUFBO0FBQUEsb0JBQUFBLEdBQUE7QUFBQSxvQkFBQXFLLFdBQUEsQ0FBQXlCLFNBQUEsRUFBQTlMLEdBQUEsQ0FBQTtBQUFBLGlCQUFBLENBQUE7QUFBQSxhQUFBLEVBQUFtTSxRQUFBLEVBQUEsQ0FMQTtBQUFBLFlBT0E7QUFBQSxxQkFBQXJOLENBQUEsSUFBQW9FLE1BQUEsRUFBQTtBQUFBLGdCQUVBO0FBQUEsb0JBQUFpSyxVQUFBLEdBQUE1TyxJQUFBLENBQUEyRSxNQUFBLENBQUFwRSxDQUFBLENBQUEsRUFBQXFPLFVBQUEsQ0FBQTVCLE9BQUEsQ0FBQXpNLENBQUEsQ0FBQSxFQUFBdUQsT0FBQSxFQUFBLENBRkE7QUFBQSxnQkFHQSxJQUFBOEssVUFBQSxDQUFBckssTUFBQSxFQUFBO0FBQUEsb0JBRUE7QUFBQSx3QkFBQUQsR0FBQSxHQUFBdEUsSUFBQSxDQUFBLENBQUE7QUFBQSw0QkFBQU8sQ0FBQTtBQUFBLDRCQUFBcU8sVUFBQTtBQUFBLHlCQUFBLENBQUEsRUFBQWhCLFFBQUEsRUFBQSxDQUZBO0FBQUEsb0JBSUE7QUFBQSx3QkFBQSxDQUFBZSxRQUFBO0FBQUEsd0JBQ0EvUCxLQUFBLENBQUFWLFNBQUEsQ0FBQU8sSUFBQSxDQUFBUyxLQUFBLENBQUE4TixPQUFBLENBQUF6TSxDQUFBLENBQUEsRUFBQXFPLFVBQUEsRUFMQTtBQUFBLG9CQU9BO0FBQUEsMkJBQUF0SyxHQUFBLENBUEE7QUFBQSxpQkFBQSxNQVFBO0FBQUEsb0JBRUE7QUFBQSwyQkFBQSxJQUFBLENBRkE7QUFBQSxpQkFYQTtBQUFBLGFBUEE7QUFBQSxTQUFBLENBMUNBO0FBQUEsUUFtRUEsSUFBQXVLLGVBQUEsR0FBQSxVQUFBbkssS0FBQSxFQUFBQyxNQUFBLEVBQUE7QUFBQSxZQUtBO0FBQUE7QUFBQTtBQUFBO0FBQUEsZ0JBQUEsQ0FBQSxDQUFBRCxLQUFBLENBQUFoRixJQUFBLElBQUF5TyxjQUFBLENBQUEsRUFBQTtBQUFBLGdCQUFBQSxjQUFBLENBQUF6SixLQUFBLENBQUFoRixJQUFBLElBQUEsRUFBQSxDQUFBO0FBQUEsYUFMQTtBQUFBLFlBS0EsQ0FMQTtBQUFBLFlBTUEsSUFBQW1NLEtBQUEsR0FBQXNDLGNBQUEsQ0FBQXpKLEtBQUEsQ0FBQWhGLElBQUEsQ0FBQSxDQU5BO0FBQUEsWUFRQTtBQUFBLGdCQUFBb1AsU0FBQSxHQUFBOU8sSUFBQSxDQUFBMkUsTUFBQSxFQUFBakIsSUFBQSxFQUFBLENBUkE7QUFBQSxZQVNBLElBQUFxTCxLQUFBLEdBQUFsRCxLQUFBLENBQUFsSCxNQUFBLENBQUFyRyxLQUFBLENBQUFtRyxVQUFBLENBQUFDLEtBQUEsRUFBQUMsTUFBQSxFQUFBLE1BQUEsRUFBQSxJQUFBLENBQUEsRUFBQUEsTUFBQSxDQUFBLFVBQUFxSyxJQUFBLEVBQUE7QUFBQSxnQkFBQWhQLElBQUEsQ0FBQWdQLElBQUEsRUFBQXRMLElBQUEsS0FBQW9MLFNBQUEsQ0FBQTtBQUFBLGFBQUEsQ0FBQTtBQVRBLFNBQUEsQ0FuRUE7QUFBQSxRQWdGQSxLQUFBbkssTUFBQSxHQUFBLFVBQUFELEtBQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsWUFFQTtBQUFBLGdCQUFBNEksU0FBQSxHQUFBN0ksS0FBQSxDQUFBNkksU0FBQSxDQUZBO0FBQUEsWUFLQTtBQUFBLGdCQUFBdUIsU0FBQSxHQUFBOU8sSUFBQSxDQUFBMkUsTUFBQSxFQUFBakIsSUFBQSxFQUFBLENBTEE7QUFBQSxZQU1BLFFBQUFvTCxTQUFBO0FBQUEsWUFDQSxLQUFBLENBQUEsRUFBQTtBQUFBLG9CQUVBO0FBQUEsd0JBQUFHLEdBQUEsR0FBQWYsTUFBQSxDQUFBWCxTQUFBLENBQUEsQ0FGQTtBQUFBLG9CQUdBVyxNQUFBLENBQUFYLFNBQUEsSUFBQSxJQUFBLENBSEE7QUFBQSxvQkFJQSxJQUFBQSxTQUFBLElBQUE5QyxLQUFBLEVBQUE7QUFBQSx3QkFDQSxPQUFBQSxLQUFBLENBQUE4QyxTQUFBLENBQUEsQ0FEQTtBQUFBLHFCQUpBO0FBQUEsb0JBU0E7QUFBQTtBQUFBLHdCQUFBQSxTQUFBLElBQUFZLGNBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUFBLGNBQUEsQ0FBQVosU0FBQSxDQUFBLENBREE7QUFBQSxxQkFUQTtBQUFBLG9CQVlBLElBQUEwQixHQUFBO0FBQUEsd0JBQ0EsT0FBQSxJQUFBLENBYkE7QUFBQSxvQkFjQSxPQUFBLEVBQUEsQ0FkQTtBQUFBLGlCQURBO0FBQUEsWUFpQkEsS0FBQSxDQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBM0ssR0FBQSxHQUFBb0ssWUFBQSxDQUFBNVAsSUFBQSxDQUFBLElBQUEsRUFBQTRGLEtBQUEsRUFBQUMsTUFBQSxDQUFBLENBREE7QUFBQSxvQkFFQWtLLGVBQUEsQ0FBQS9QLElBQUEsQ0FBQSxJQUFBLEVBQUE0RixLQUFBLEVBQUFDLE1BQUEsRUFGQTtBQUFBLG9CQUdBLE9BQUFMLEdBQUEsQ0FIQTtBQUFBLGlCQWpCQTtBQUFBLGFBTkE7QUFBQSxZQTZCQSxJQUFBbEYsR0FBQSxHQUFBLElBQUEsQ0E3QkE7QUFBQSxZQThCQSxJQUFBOFAsTUFBQSxHQUFBbFAsSUFBQSxDQUFBMkUsTUFBQSxFQUFBc0IsSUFBQSxHQUFBa0osSUFBQSxDQUFBLFVBQUExTixHQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBMk4sQ0FBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLGdCQUVBQSxDQUFBLENBQUEzTixHQUFBLElBQUFrRCxNQUFBLENBQUFsRCxHQUFBLENBQUEsQ0FGQTtBQUFBLGdCQUdBLE9BQUFpTixZQUFBLENBQUE1UCxJQUFBLENBQUFNLEdBQUEsRUFBQXNGLEtBQUEsRUFBQTBLLENBQUEsRUFBQSxJQUFBLEtBQUEsSUFBQSxDQUhBO0FBQUEsYUFBQSxDQUFBLENBOUJBO0FBQUEsWUFtQ0EsSUFBQUYsTUFBQSxFQUFBO0FBQUEsZ0JBQUEsT0FBQSxJQUFBLENBQUE7QUFBQSxhQW5DQTtBQUFBLFlBcUNBO0FBQUEsZ0JBQUEsQ0FBQSxDQUFBM0IsU0FBQSxJQUFBWSxjQUFBLENBQUEsRUFBQTtBQUFBLGdCQUFBQSxjQUFBLENBQUFaLFNBQUEsSUFBQSxFQUFBLENBQUE7QUFBQSxhQXJDQTtBQUFBLFlBdUNBO0FBQUEsZ0JBQUE4QixRQUFBLEdBQUFkLGFBQUEsQ0FBQTVKLE1BQUEsQ0FBQSxDQXZDQTtBQUFBLFlBeUNBO0FBQUEsZ0JBQUEySyxRQUFBLEdBQUFuQixjQUFBLENBQUFaLFNBQUEsRUFBQTVJLE1BQUEsQ0FBQXJHLEtBQUEsQ0FBQW1HLFVBQUEsQ0FBQUMsS0FBQSxFQUFBQyxNQUFBLEVBQUEsTUFBQSxFQUFBLElBQUEsQ0FBQSxDQUFBLENBekNBO0FBQUEsWUEyQ0E7QUFBQSxnQkFBQTJLLFFBQUEsQ0FBQS9LLE1BQUEsRUFBQTtBQUFBLGdCQUNBLElBQUFnTCxHQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsZ0JBR0E7QUFBQSx5QkFBQWhQLENBQUEsSUFBQStPLFFBQUEsRUFBQTtBQUFBLG9CQUNBQyxHQUFBLENBQUE5USxJQUFBLENBQUFTLEtBQUEsQ0FBQXFRLEdBQUEsRUFBQUYsUUFBQSxDQUFBMUssTUFBQSxDQUFBckcsS0FBQSxDQUFBbUcsVUFBQSxDQUFBQyxLQUFBLEVBQUE0SyxRQUFBLENBQUEvTyxDQUFBLENBQUEsRUFBQSxNQUFBLEVBQUEsSUFBQSxDQUFBLENBQUEsRUFEQTtBQUFBLGlCQUhBO0FBQUEsZ0JBT0E7QUFBQSxvQkFBQTBLLFFBQUEsR0FBQWpMLElBQUEsQ0FBQXFQLFFBQUEsRUFBQVQsVUFBQSxDQUFBVyxHQUFBLEVBQUF6TCxPQUFBLEVBQUEsQ0FQQTtBQUFBLGFBQUEsTUFRQTtBQUFBLGdCQUNBLElBQUFtSCxRQUFBLEdBQUFvRSxRQUFBLENBREE7QUFBQSxhQW5EQTtBQUFBLFlBd0RBO0FBQUEsZ0JBQUFwRSxRQUFBLENBQUExRyxNQUFBLEVBQUE7QUFBQSxnQkFDQTRKLGNBQUEsQ0FBQVosU0FBQSxFQUFBOU8sSUFBQSxDQUFBUyxLQUFBLENBQUFpUCxjQUFBLENBQUFaLFNBQUEsQ0FBQSxFQUFBdEMsUUFBQSxFQURBO0FBQUEsZ0JBR0E7QUFBQSxvQkFBQUEsUUFBQSxHQUFBakwsSUFBQSxDQUFBMkUsTUFBQSxFQUFBc0IsSUFBQSxHQUFBckMsR0FBQSxDQUFBLFVBQUFuQyxHQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBNkMsR0FBQSxHQUFBdEUsSUFBQSxDQUFBaUwsUUFBQSxFQUFBdUUsS0FBQSxDQUFBL04sR0FBQSxFQUFBeUosTUFBQSxHQUFBcEgsT0FBQSxFQUFBLENBREE7QUFBQSxvQkFFQSxPQUFBO0FBQUEsd0JBQUFyQyxHQUFBO0FBQUEsd0JBQUE2QyxHQUFBLENBQUFDLE1BQUEsR0FBQUQsR0FBQSxHQUFBSyxNQUFBLENBQUFsRCxHQUFBLENBQUE7QUFBQSxxQkFBQSxDQUZBO0FBQUEsaUJBQUEsRUFHQW1NLFFBSEEsRUFBQSxDQUhBO0FBQUEsZ0JBU0E7QUFBQTtBQUFBLGdCQUFBaUIsZUFBQSxDQUFBbkssS0FBQSxFQUFBdUcsUUFBQSxFQVRBO0FBQUEsZ0JBVUEsT0FBQUEsUUFBQSxDQVZBO0FBQUEsYUF4REE7QUFBQSxZQW9FQSxPQUFBLElBQUEsQ0FwRUE7QUFBQSxTQUFBLENBaEZBO0FBQUEsUUF1SkEsS0FBQWEsV0FBQSxHQUFBLFVBQUF5QixTQUFBLEVBQUFJLFNBQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQTFCLFNBQUEsR0FBQXNCLFNBQUEsR0FBQSxHQUFBLEdBQUFJLFNBQUEsQ0FEQTtBQUFBLFlBRUEsSUFBQSxDQUFBLENBQUExQixTQUFBLElBQUF4QixLQUFBLENBQUEsRUFBQTtBQUFBLGdCQUNBQSxLQUFBLENBQUF3QixTQUFBLElBQUEsRUFBQSxDQURBO0FBQUEsYUFGQTtBQUFBLFlBS0EsT0FBQXhCLEtBQUEsQ0FBQXdCLFNBQUEsQ0FBQSxDQUxBO0FBQUEsU0FBQSxDQXZKQTtBQUFBLEs7SUE4SkEsQztJQ2hLQSxhO0lBRUEsU0FBQU0sa0JBQUEsQ0FBQUQsUUFBQSxFQUFBWixHQUFBLEVBQUE7QUFBQSxRQUNBLElBQUFxRCxLQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsUUFFQSxLQUFBVSxHQUFBLEdBQUFWLEtBQUEsQ0FBQXRRLElBQUEsQ0FBQThDLElBQUEsQ0FBQXdOLEtBQUEsQ0FBQSxDQUZBO0FBQUEsUUFHQSxLQUFBVSxHQUFBLEdBQUEsVUFBQVQsSUFBQSxFQUFBO0FBQUEsWUFFQTtBQUFBLGdCQUFBLENBQUFoUCxJQUFBLENBQUErTyxLQUFBLEVBQUFXLElBQUEsQ0FBQVYsSUFBQSxDQUFBLEVBQUE7QUFBQSxnQkFDQUQsS0FBQSxDQUFBdFEsSUFBQSxDQUFBdVEsSUFBQSxFQURBO0FBQUEsYUFGQTtBQUFBLFNBQUEsQ0FIQTtBQUFBLFFBVUEsS0FBQVcsSUFBQSxHQUFBLFVBQUFoUSxFQUFBLEVBQUE7QUFBQSxZQUNBK0wsR0FBQSxDQUFBLENBQUEsRUFBQWQsR0FBQSxDQUFBakwsRUFBQSxFQURBO0FBQUEsWUFFQSxPQUFBSyxJQUFBLENBQUErTyxLQUFBLEVBQUFwSyxNQUFBLENBQUEsVUFBQXBFLENBQUEsRUFBQTtBQUFBLGdCQUNBLE9BQUFBLENBQUEsQ0FBQSxDQUFBLE1BQUFaLEVBQUEsQ0FEQTtBQUFBLGFBQUEsRUFFQTZQLEtBRkEsQ0FFQSxHQUZBLEVBRUExTCxPQUZBLEVBQUEsQ0FGQTtBQUFBLFNBQUEsQ0FWQTtBQUFBLFFBaUJBLEtBQUE4TCxJQUFBLEdBQUEsVUFBQWpRLEVBQUEsRUFBQTtBQUFBLFlBQ0ErTCxHQUFBLENBQUEsQ0FBQSxFQUFBZCxHQUFBLENBQUFqTCxFQUFBLEVBREE7QUFBQSxZQUVBLE9BQUFLLElBQUEsQ0FBQStPLEtBQUEsRUFBQXBLLE1BQUEsQ0FBQSxVQUFBcEUsQ0FBQSxFQUFBO0FBQUEsZ0JBQ0EsT0FBQUEsQ0FBQSxDQUFBLENBQUEsTUFBQVosRUFBQSxDQURBO0FBQUEsYUFBQSxFQUVBNlAsS0FGQSxDQUVBLEdBRkEsRUFFQTFMLE9BRkEsRUFBQSxDQUZBO0FBQUEsU0FBQSxDQWpCQTtBQUFBLFFBdUJBLEtBQUEsUUFBQXhGLEtBQUEsQ0FBQTJGLFVBQUEsQ0FBQXFJLFFBQUEsQ0FBQUwsU0FBQSxDQUFBNUYsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLEtBQUF1SixJQUFBLENBdkJBO0FBQUEsUUF3QkEsS0FBQSxRQUFBdFIsS0FBQSxDQUFBMkYsVUFBQSxDQUFBcUksUUFBQSxDQUFBTCxTQUFBLENBQUE1RixLQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsS0FBQXNKLElBQUEsQ0F4QkE7QUFBQSxRQTBCQSxLQUFBRSxHQUFBLEdBQUEsVUFBQWIsSUFBQSxFQUFBO0FBQUEsWUFDQSxJQUFBYyxDQUFBLEdBQUFmLEtBQUEsQ0FBQXhLLE1BQUEsQ0FEQTtBQUFBLFlBRUEsSUFBQW5FLEdBQUEsR0FBQSxJQUFBLENBRkE7QUFBQSxZQUdBLEtBQUEsSUFBQTBDLENBQUEsR0FBQSxDQUFBLENBQUEsQ0FBQUEsQ0FBQSxHQUFBZ04sQ0FBQSxFQUFBaE4sQ0FBQSxFQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBaU0sS0FBQSxDQUFBak0sQ0FBQSxFQUFBLENBQUEsTUFBQWtNLElBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQUQsS0FBQSxDQUFBak0sQ0FBQSxFQUFBLENBQUEsTUFBQWtNLElBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQTtBQUFBLG9CQUNBNU8sR0FBQSxHQUFBMEMsQ0FBQSxDQURBO0FBQUEsb0JBRUEsTUFGQTtBQUFBLGlCQURBO0FBQUEsYUFIQTtBQUFBLFlBU0EsSUFBQTFDLEdBQUEsRUFBQTtBQUFBLGdCQUNBMk8sS0FBQSxDQUFBdk8sTUFBQSxDQUFBc0MsQ0FBQSxFQUFBLENBQUEsRUFEQTtBQUFBLGFBVEE7QUFBQSxZQVlBbEIsT0FBQSxDQUFBRCxHQUFBLENBQUEsV0FBQSxFQUFBcU4sSUFBQSxFQVpBO0FBQUEsU0FBQSxDQTFCQTtBQUFBLEs7SUNGQSxhO0lBRUEsU0FBQWUsc0JBQUEsQ0FBQUMsS0FBQSxFQUFBQyxZQUFBLEVBQUEvQyxNQUFBLEVBQUFnRCxNQUFBLEVBQUE7QUFBQSxRQUNBLElBQUE1USxNQUFBLEdBQUFWLEtBQUEsQ0FBQVYsU0FBQSxDQUFBVyxLQUFBLENBQUFDLElBQUEsQ0FBQUMsU0FBQSxFQUFBLENBQUEsQ0FBQSxDQURBO0FBQUEsUUFFQSxJQUFBb1IsTUFBQSxHQUFBLEVBQUEsQ0FGQTtBQUFBLFFBSUFuUSxJQUFBLENBQUFWLE1BQUEsRUFBQVcsSUFBQSxDQUFBLFVBQUFKLEtBQUEsRUFBQTtBQUFBLFlBQ0FtUSxLQUFBLENBQUF6SyxHQUFBLENBQUE5RixFQUFBLENBQUFJLEtBQUEsRUFBQSxZQUFBO0FBQUEsZ0JBQ0FzUSxNQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsYUFBQSxFQURBO0FBQUEsU0FBQSxFQUpBO0FBQUEsUUFTQSxJQUFBQyxXQUFBLEdBQUE7QUFBQSxZQUNBblAsR0FBQSxFQUFBLFNBQUFPLE1BQUEsR0FBQTtBQUFBLGdCQUVBO0FBQUEsb0JBQUEsQ0FBQSxNQUFBN0IsRUFBQSxJQUFBd1EsTUFBQSxDQUFBLEVBQUE7QUFBQSxvQkFDQUEsTUFBQSxDQUFBLEtBQUF4USxFQUFBLElBQUF1TixNQUFBLENBQUFwTyxJQUFBLENBQUEsSUFBQSxDQUFBLENBREE7QUFBQSxpQkFGQTtBQUFBLGdCQUtBLE9BQUFxUixNQUFBLENBQUEsS0FBQXhRLEVBQUEsQ0FBQSxDQUxBO0FBQUEsYUFEQTtBQUFBLFNBQUEsQ0FUQTtBQUFBLFFBa0JBLElBQUF1USxNQUFBLEVBQUE7QUFBQSxZQUNBRSxXQUFBLENBQUEsS0FBQSxJQUFBLFVBQUFDLEtBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUEsQ0FBQUMsUUFBQSxDQUFBRCxLQUFBLENBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUEsS0FBQTFRLEVBQUEsSUFBQXdRLE1BQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUFBLE1BQUEsQ0FBQSxLQUFBeFEsRUFBQSxDQUFBLENBREE7QUFBQSxxQkFEQTtBQUFBLGlCQUFBLE1BSUE7QUFBQSxvQkFFQTtBQUFBLG9CQUFBdVEsTUFBQSxDQUFBcFIsSUFBQSxDQUFBLElBQUEsRUFBQXVSLEtBQUEsRUFGQTtBQUFBLG9CQUdBLElBQUEsS0FBQTFRLEVBQUEsSUFBQXdRLE1BQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUFBLE1BQUEsQ0FBQSxLQUFBeFEsRUFBQSxDQUFBLENBREE7QUFBQTtBQUhBLGlCQUxBO0FBQUEsYUFBQSxDQURBO0FBQUEsU0FsQkE7QUFBQSxRQWtDQThKLE1BQUEsQ0FBQThHLGNBQUEsQ0FBQVAsS0FBQSxFQUFBQyxZQUFBLEVBQUFHLFdBQUEsRUFsQ0E7QUFBQSxLO0lDRkEsYTtJQUVBLFNBQUFJLGVBQUEsQ0FBQXpPLElBQUEsRUFBQTtBQUFBLFFBQ0EsS0FBQTBPLFFBQUEsR0FBQTFPLElBQUEsQ0FBQTJPLFNBQUEsQ0FEQTtBQUFBLFFBRUEsS0FBQUMsT0FBQSxHQUFBNU8sSUFBQSxDQUFBNE8sT0FBQSxDQUZBO0FBQUEsUUFHQSxLQUFBekwsTUFBQSxHQUFBbkQsSUFBQSxDQUFBNk8sTUFBQSxDQUhBO0FBQUEsSztJQUtBLElBQUFDLE9BQUEsR0FBQSxVQUFBQyxPQUFBLEVBQUFDLE1BQUEsRUFBQTtBQUFBLFFBR0E7QUFBQSxZQUFBRCxPQUFBLENBQUExTCxXQUFBLEtBQUE0TCxNQUFBLEVBQUE7QUFBQSxZQUNBLElBQUFqSixVQUFBLEdBQUEsSUFBQVUsaUJBQUEsQ0FBQXFJLE9BQUEsQ0FBQSxDQURBO0FBQUEsU0FBQSxNQUVBLElBQUFBLE9BQUEsQ0FBQTFMLFdBQUEsS0FBQTlHLEtBQUEsQ0FBQW1LLGlCQUFBLEVBQUE7QUFBQSxZQUNBLElBQUFWLFVBQUEsR0FBQStJLE9BQUEsQ0FEQTtBQUFBLFNBTEE7QUFBQSxRQVFBLEtBQUEvSSxVQUFBLEdBQUFBLFVBQUEsQ0FSQTtBQUFBLFFBU0FBLFVBQUEsQ0FBQXRJLEVBQUEsQ0FBQSxXQUFBLEVBQUEsWUFBQTtBQUFBLFlBQ0EsS0FBQXdSLFNBQUEsR0FBQSxJQUFBLENBREE7QUFBQSxTQUFBLEVBVEE7QUFBQSxRQVlBLEtBQUF4UixFQUFBLEdBQUFzSSxVQUFBLENBQUF0SSxFQUFBLENBWkE7QUFBQSxRQWFBLEtBQUFHLElBQUEsR0FBQW1JLFVBQUEsQ0FBQW5JLElBQUEsQ0FiQTtBQUFBLFFBY0EsS0FBQUUsTUFBQSxHQUFBaUksVUFBQSxDQUFBakksTUFBQSxDQWRBO0FBQUEsUUFlQSxLQUFBVyxJQUFBLEdBQUFzSCxVQUFBLENBQUF0SCxJQUFBLENBZkE7QUFBQSxRQWdCQSxLQUFBcUksS0FBQSxHQUFBZixVQUFBLENBQUFlLEtBQUEsQ0FBQXZILElBQUEsQ0FBQXdHLFVBQUEsQ0FBQSxDQWhCQTtBQUFBLFFBbUJBO0FBQUEsYUFBQXRJLEVBQUEsQ0FBQSxjQUFBLEVBQUEsVUFBQXlSLEVBQUEsRUFBQTtBQUFBLFlBQ0F0UCxPQUFBLENBQUFtSixJQUFBLENBQUEscUJBQUEsRUFEQTtBQUFBLFlBR0E7QUFBQSxZQUFBbUcsRUFBQSxDQUFBQyxhQUFBLENBQUE3RixXQUFBLENBQUFvQixPQUFBLENBQUFuTCxJQUFBLENBQUErSixXQUFBLENBQUEsRUFIQTtBQUFBLFlBS0E7QUFBQSxZQUFBNEYsRUFBQSxDQUFBRSxhQUFBLENBQUEsVUFBQUMsT0FBQSxFQUFBO0FBQUEsZ0JBQ0F6UCxPQUFBLENBQUFtSixJQUFBLENBQUEsa0JBQUFzRyxPQUFBLEVBREE7QUFBQSxhQUFBLEVBTEE7QUFBQSxTQUFBLEVBbkJBO0FBQUEsUUE0QkEsS0FBQTVSLEVBQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUF5UixFQUFBLEVBQUE7QUFBQSxZQUNBdFAsT0FBQSxDQUFBMEQsS0FBQSxDQUFBLHdCQUFBLEVBREE7QUFBQSxTQUFBLEVBNUJBO0FBQUEsUUErQkEsS0FBQTdGLEVBQUEsQ0FBQSxnQkFBQSxFQUFBLFVBQUE2RixLQUFBLEVBQUF4RCxHQUFBLEVBQUF3UCxRQUFBLEVBQUF0SSxHQUFBLEVBQUE7QUFBQSxZQUNBcEgsT0FBQSxDQUFBMEQsS0FBQSxDQUFBLGFBQUEsRUFBQTNDLElBQUEsQ0FBQWdCLFNBQUEsQ0FBQTJCLEtBQUEsQ0FBQSxFQURBO0FBQUEsWUFFQSxPQUFBaU0sa0JBQUEsQ0FBQXpQLEdBQUEsQ0FBQXVFLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBLENBQUEsQ0FGQTtBQUFBLFNBQUEsRUEvQkE7QUFBQSxRQW1DQSxLQUFBNUcsRUFBQSxDQUFBLHVCQUFBLEVBQUEsVUFBQTRSLE9BQUEsRUFBQTtBQUFBLFlBQ0EvRixXQUFBLENBQUFvQixPQUFBLENBQUEyRSxPQUFBLEVBREE7QUFBQSxTQUFBLEVBbkNBO0FBQUEsUUF3Q0E7QUFBQSxZQUFBL0YsV0FBQSxHQUFBLElBQUEsQ0F4Q0E7QUFBQSxRQXlDQSxJQUFBRCxHQUFBLEdBQUEsRUFBQW1HLFVBQUEsRUFBQXhSLElBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQXpDQTtBQUFBLFFBMENBO0FBQUEsWUFBQXlSLEdBQUEsR0FBQSxFQUFBLENBMUNBO0FBQUEsUUEyQ0E7QUFBQSxZQUFBQyxNQUFBLEdBQUEsRUFBQSxDQTNDQTtBQUFBLFFBNENBO0FBQUEsWUFBQUMsZUFBQSxHQUFBLEVBQUEsQ0E1Q0E7QUFBQSxRQTZDQSxJQUFBQyxrQkFBQSxHQUFBLEVBQUEsQ0E3Q0E7QUFBQSxRQThDQSxJQUFBQyxvQkFBQSxHQUFBLEVBQUEsQ0E5Q0E7QUFBQSxRQStDQSxJQUFBQyxhQUFBLEdBQUEsRUFBQSxDQS9DQTtBQUFBLFFBZ0RBLElBQUFDLGlCQUFBLEdBQUEsRUFBQSxDQWhEQTtBQUFBLFFBaURBLElBQUFDLFVBQUEsR0FBQSxFQUFBLENBakRBO0FBQUEsUUFrREEsSUFBQUMsWUFBQSxHQUFBLEVBQUEsQ0FsREE7QUFBQSxRQW1EQSxJQUFBVixrQkFBQSxHQUFBLEVBQUEsQ0FuREE7QUFBQSxRQW9EQTtBQUFBLFlBQUFoRyxTQUFBLEdBQUEsSUFBQTBDLFVBQUEsQ0FBQWpPLElBQUEsQ0FBQSxDQXBEQTtBQUFBLFFBcURBLElBQUFrUyxNQUFBLEdBQUEsSUFBQS9HLFVBQUEsQ0FBQW9HLGtCQUFBLEVBQUFsRyxHQUFBLEVBQUEsSUFBQSxFQUFBRSxTQUFBLENBQUEsQ0FyREE7QUFBQSxRQXlEQTtBQUFBO0FBQUE7QUFBQSxRQUFBNEcsTUFBQSxDQUFBOUcsR0FBQSxHQUFBQSxHQUFBLENBekRBO0FBQUEsUUEwREEsS0FBQStHLGVBQUEsR0FBQSxLQUFBM1MsRUFBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQXNDLElBQUEsRUFBQUQsR0FBQSxFQUFBd1AsUUFBQSxFQUFBdEksR0FBQSxFQUFBO0FBQUEsWUFDQSxJQUFBcUosY0FBQSxDQUFBQyxrQkFBQSxFQUFBO0FBQUEsZ0JBQ0FELGNBQUEsQ0FBQUMsa0JBQUEsQ0FBQSxJQUFBOUIsZUFBQSxDQUFBek8sSUFBQSxDQUFBLEVBREE7QUFBQSxhQURBO0FBQUEsU0FBQSxDQUFBLENBMURBO0FBQUEsUUFnRUEsSUFBQXdRLFFBQUEsR0FBQSxVQUFBdEcsU0FBQSxFQUFBO0FBQUEsWUFDQSxJQUFBQSxTQUFBLElBQUFaLEdBQUE7QUFBQSxnQkFDQSxPQUFBQSxHQUFBLENBQUFZLFNBQUEsQ0FBQSxDQURBO0FBQUEsaUJBRUE7QUFBQSxnQkFDQVosR0FBQSxDQUFBWSxTQUFBLElBQUFqTSxJQUFBLENBQUEsRUFBQSxDQUFBLENBREE7QUFBQSxnQkFFQSxPQUFBcUwsR0FBQSxDQUFBWSxTQUFBLENBQUEsQ0FGQTtBQUFBLGFBSEE7QUFBQSxTQUFBLENBaEVBO0FBQUEsUUF3RUEsSUFBQXVHLFdBQUEsR0FBQSxVQUFBdkcsU0FBQSxFQUFBO0FBQUEsWUFDQSxJQUFBQSxTQUFBLElBQUF3RyxRQUFBO0FBQUEsZ0JBQ0EsT0FBQUEsUUFBQSxDQUFBeEcsU0FBQSxDQUFBLENBREE7QUFBQSxpQkFFQTtBQUFBLGdCQUNBd0csUUFBQSxDQUFBeEcsU0FBQSxJQUFBLEVBQUEsQ0FEQTtBQUFBLGdCQUVBLE9BQUF3RyxRQUFBLENBQUF4RyxTQUFBLENBQUEsQ0FGQTtBQUFBLGFBSEE7QUFBQSxTQUFBLENBeEVBO0FBQUEsUUFpRkEsU0FBQXlHLGVBQUEsQ0FBQS9TLEVBQUEsRUFBQWdULEtBQUEsRUFBQS9HLFdBQUEsRUFBQTtBQUFBLFlBRUE7QUFBQSxpQkFBQStHLEtBQUEsR0FBQUEsS0FBQSxDQUZBO0FBQUEsWUFHQSxLQUFBL0csV0FBQSxHQUFBLEVBQUEsQ0FIQTtBQUFBLFlBSUEsS0FBQWpNLEVBQUEsR0FBQUEsRUFBQSxDQUpBO0FBQUEsWUFLQSxTQUFBUSxDQUFBLElBQUF5TCxXQUFBLEVBQUE7QUFBQSxnQkFDQSxLQUFBbk4sSUFBQSxDQUFBUyxLQUFBLENBQUEsSUFBQSxFQUFBO0FBQUEsb0JBQUFpQixDQUFBO0FBQUEsb0JBQUF5TCxXQUFBLENBQUF6TCxDQUFBLENBQUE7QUFBQSxpQkFBQSxFQURBO0FBQUEsYUFMQTtBQUFBLFNBakZBO0FBQUEsUUEwRkF1UyxlQUFBLENBQUF4VSxTQUFBLENBQUEwVSxJQUFBLEdBQUEsVUFBQUMsRUFBQSxFQUFBO0FBQUEsWUFFQTtBQUFBLGdCQUFBOVEsSUFBQSxHQUFBO0FBQUEsZ0JBQ0E2SixXQUFBLEVBQUE1TCxJQUFBLENBQUEsS0FBQTRMLFdBQUEsRUFBQWhJLEdBQUEsQ0FBQSxVQUFBckQsQ0FBQSxFQUFBO0FBQUEsb0JBQ0EsT0FBQTtBQUFBLHdCQUFBQSxDQUFBLENBQUEsQ0FBQSxFQUFBWixFQUFBO0FBQUEsd0JBQUFZLENBQUEsQ0FBQSxDQUFBLENBQUE7QUFBQSxxQkFBQSxDQURBO0FBQUEsaUJBQUEsRUFFQXFOLFFBRkEsRUFEQTtBQUFBLGFBQUEsQ0FGQTtBQUFBLFlBT0E3TCxJQUFBLENBQUFwQyxFQUFBLEdBQUEsS0FBQUEsRUFBQSxDQVBBO0FBQUEsWUFRQSxJQUFBNE4sU0FBQSxHQUFBLEtBQUFvRixLQUFBLENBQUFwRixTQUFBLENBUkE7QUFBQSxZQVNBakMsV0FBQSxDQUFBeEMsS0FBQSxDQUFBLEtBQUE2SixLQUFBLENBQUFwRixTQUFBLEdBQUEsa0JBQUEsRUFBQXhMLElBQUEsRUFBQSxVQUFBK1EsT0FBQSxFQUFBaFEsQ0FBQSxFQUFBdUwsQ0FBQSxFQUFBL0wsR0FBQSxFQUFBO0FBQUEsZ0JBQ0F1USxFQUFBLENBQUFDLE9BQUEsRUFEQTtBQUFBLGFBQUEsRUFUQTtBQUFBLFNBQUEsQ0ExRkE7QUFBQSxRQXVHQUosZUFBQSxDQUFBeFUsU0FBQSxDQUFBTyxJQUFBLEdBQUEsVUFBQXNVLFFBQUEsRUFBQUMsY0FBQSxFQUFBO0FBQUEsWUFDQSxJQUFBQyxDQUFBLEdBQUFqVCxJQUFBLENBQUFnVCxjQUFBLENBQUEsQ0FEQTtBQUFBLFlBRUEsSUFBQUUsS0FBQSxHQUFBbFQsSUFBQSxDQUFBLEtBQUEyUyxLQUFBLENBQUFRLGNBQUEsRUFBQXZQLEdBQUEsQ0FBQSxVQUFBckQsQ0FBQSxFQUFBO0FBQUEsZ0JBQ0EsT0FBQTtBQUFBLG9CQUFBQSxDQUFBO0FBQUEsb0JBQUEwUyxDQUFBLENBQUFuSSxRQUFBLENBQUF2SyxDQUFBLENBQUE7QUFBQSxpQkFBQSxDQURBO0FBQUEsYUFBQSxFQUVBcU4sUUFGQSxFQUFBLENBRkE7QUFBQSxZQUtBLElBQUFrQyxDQUFBLEdBQUE5UCxJQUFBLENBQUEsS0FBQTRMLFdBQUEsRUFBQWhJLEdBQUEsQ0FBQSxVQUFBckQsQ0FBQSxFQUFBO0FBQUEsZ0JBQ0EsT0FBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQVosRUFBQSxDQURBO0FBQUEsYUFBQSxDQUFBLENBTEE7QUFBQSxZQVFBLElBQUFtUSxDQUFBLENBQUFoRixRQUFBLENBQUFpSSxRQUFBLENBQUE7QUFBQSxnQkFDQSxLQUFBbkgsV0FBQSxDQUFBa0UsQ0FBQSxDQUFBc0QsT0FBQSxDQUFBTCxRQUFBLENBQUEsRUFBQSxDQUFBLElBQUFHLEtBQUEsQ0FEQTtBQUFBO0FBQUEsZ0JBR0EsS0FBQXRILFdBQUEsQ0FBQW5OLElBQUEsQ0FBQTtBQUFBLG9CQUFBNE0sR0FBQSxDQUFBbUcsVUFBQSxDQUFBdlEsR0FBQSxDQUFBOFIsUUFBQSxDQUFBO0FBQUEsb0JBQUFHLEtBQUE7QUFBQSxpQkFBQSxFQVhBO0FBQUEsU0FBQSxDQXZHQTtBQUFBLFFBc0hBO0FBQUEsWUFBQUcsY0FBQSxHQUFBLFVBQUEzTyxLQUFBLEVBQUE7QUFBQSxZQUNBLElBQUE0TyxNQUFBLEdBQUE1TyxLQUFBLENBREE7QUFBQSxZQUVBQSxLQUFBLENBQUFRLE1BQUEsQ0FBQXZGLEVBQUEsQ0FBQTRULFFBQUEsR0FBQSxLQUFBLENBRkE7QUFBQSxZQUdBN08sS0FBQSxDQUFBUSxNQUFBLENBQUF2RixFQUFBLENBQUE2VCxRQUFBLEdBQUEsS0FBQSxDQUhBO0FBQUEsWUFJQSxJQUFBdE8sTUFBQSxHQUFBbEYsSUFBQSxDQUFBMEUsS0FBQSxDQUFBUSxNQUFBLENBQUEsQ0FKQTtBQUFBLFlBS0EsSUFBQVIsS0FBQSxDQUFBK08sV0FBQSxFQUFBO0FBQUEsZ0JBQ0F2TyxNQUFBLEdBQUFBLE1BQUEsQ0FBQXdPLEtBQUEsQ0FBQWhQLEtBQUEsQ0FBQStPLFdBQUEsQ0FBQSxDQURBO0FBQUEsYUFMQTtBQUFBLFlBUUFuSSxXQUFBLENBQUExTCxJQUFBLENBQUEsa0JBQUEsRUFBQThFLEtBQUEsRUFBQTZOLFFBQUEsQ0FBQTdOLEtBQUEsQ0FBQWhGLElBQUEsQ0FBQSxFQVJBO0FBQUEsWUE2QkE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGdCQUFBaVUsVUFBQSxHQUFBLDBCQUFBLENBN0JBO0FBQUEsWUE4QkFBLFVBQUEsSUFBQWpQLEtBQUEsQ0FBQXFILFVBQUEsQ0FBQW5JLEdBQUEsQ0FBQSxVQUFBb0IsS0FBQSxFQUFBO0FBQUEsZ0JBQ0EsT0FBQSxXQUFBQSxLQUFBLENBQUFyRixFQUFBLEdBQUEsU0FBQSxHQUFBcUYsS0FBQSxDQUFBckYsRUFBQSxHQUFBLEdBQUEsQ0FEQTtBQUFBLGFBQUEsRUFFQW9FLElBRkEsQ0FFQSxLQUZBLENBQUEsQ0E5QkE7QUFBQSxZQW1DQTtBQUFBLFlBQUE0UCxVQUFBLElBQUF6TyxNQUFBLENBQUF0QixHQUFBLENBQUEsVUFBQXJELENBQUEsRUFBQUosQ0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQUksQ0FBQSxDQUFBNEUsSUFBQSxJQUFBLE1BQUEsSUFBQTVFLENBQUEsQ0FBQTRFLElBQUEsSUFBQSxVQUFBLEVBQUE7QUFBQSxvQkFDQSxPQUFBLFVBQUFoRixDQUFBLEdBQUEsU0FBQSxHQUFBQSxDQUFBLEdBQUEsZ0JBQUEsR0FBQUEsQ0FBQSxHQUFBLFlBQUEsR0FBQTdCLEtBQUEsQ0FBQXlJLFFBQUEsR0FBQSxXQUFBLENBREE7QUFBQSxpQkFBQSxNQUVBLElBQUF4RyxDQUFBLENBQUE0RSxJQUFBLElBQUEsU0FBQSxFQUFBO0FBQUEsb0JBQ0EsT0FBQSxVQUFBaEYsQ0FBQSxHQUFBLFVBQUEsR0FBQUEsQ0FBQSxHQUFBLG9CQUFBLEdBQUFBLENBQUEsR0FBQSxlQUFBLENBREE7QUFBQSxpQkFBQSxNQUVBO0FBQUEsb0JBQ0EsT0FBQSxVQUFBQSxDQUFBLEdBQUEsU0FBQSxHQUFBQSxDQUFBLEdBQUEsS0FBQSxDQURBO0FBQUEsaUJBTEE7QUFBQSxhQUFBLEVBUUEzQixRQVJBLENBUUEsSUFSQSxDQUFBLENBbkNBO0FBQUEsWUEyQ0EsQ0FBQSxJQUFBLENBM0NBO0FBQUEsWUE2Q0FtVixVQUFBLElBQUEsNEhBQUEsQ0E3Q0E7QUFBQSxZQWlEQTtBQUFBLGdCQUFBQyxLQUFBLEdBQUEsSUFBQXRTLFFBQUEsQ0FBQSxLQUFBLEVBQUEsYUFBQSxFQUFBcVMsVUFBQSxDQUFBLENBakRBO0FBQUEsWUFtREFDLEtBQUEsQ0FBQTFWLFNBQUEsQ0FBQXFILEdBQUEsR0FBQXdMLE1BQUEsQ0FuREE7QUFBQSxZQW9EQTZDLEtBQUEsQ0FBQUMsZ0JBQUEsR0FBQSxFQUFBLENBcERBO0FBQUEsWUFxREFELEtBQUEsQ0FBQXJHLFNBQUEsR0FBQTdJLEtBQUEsQ0FBQWhGLElBQUEsQ0FyREE7QUFBQSxZQXNEQWtVLEtBQUEsQ0FBQTdILFVBQUEsR0FBQS9MLElBQUEsQ0FBQTBFLEtBQUEsQ0FBQXFILFVBQUEsRUFBQXlELEtBQUEsQ0FBQSxJQUFBLEVBQUExTCxPQUFBLEVBQUEsQ0F0REE7QUFBQSxZQXdEQThQLEtBQUEsQ0FBQUUsa0JBQUEsR0FBQXBQLEtBQUEsQ0FBQXlILFlBQUEsQ0FBQXZJLEdBQUEsQ0FBQSxVQUFBckQsQ0FBQSxFQUFBO0FBQUEsZ0JBRUE7QUFBQSx1QkFBQUEsQ0FBQSxDQUFBNkwsRUFBQSxHQUFBLEdBQUEsR0FBQTdMLENBQUEsQ0FBQVosRUFBQSxHQUFBLE1BQUEsQ0FGQTtBQUFBLGFBQUEsQ0FBQSxDQXhEQTtBQUFBLFlBNERBaVUsS0FBQSxDQUFBRyxTQUFBLEdBQUFyUCxLQUFBLENBQUF5SCxZQUFBLENBQUF2SSxHQUFBLENBQUEsVUFBQXJELENBQUEsRUFBQTtBQUFBLGdCQUNBLE9BQUE7QUFBQSxvQkFBQUEsQ0FBQSxDQUFBNkwsRUFBQTtBQUFBLG9CQUFBN0wsQ0FBQSxDQUFBWixFQUFBO0FBQUEsaUJBQUEsQ0FEQTtBQUFBLGFBQUEsQ0FBQSxDQTVEQTtBQUFBLFlBK0RBaVUsS0FBQSxDQUFBSSxXQUFBLEdBQUF0UCxLQUFBLENBQUF1UCxVQUFBLENBL0RBO0FBQUEsWUFnRUFMLEtBQUEsQ0FBQVQsY0FBQSxHQUFBek8sS0FBQSxDQUFBa0gsV0FBQSxDQWhFQTtBQUFBLFlBbUVBO0FBQUEsZ0JBQUE1TCxJQUFBLENBQUEwRSxLQUFBLENBQUF3UCxjQUFBLEVBQUF4USxJQUFBLEVBQUEsRUFBQTtBQUFBLGdCQUNBa1EsS0FBQSxDQUFBMVYsU0FBQSxDQUFBTSxRQUFBLEdBQUEsSUFBQThDLFFBQUEsQ0FBQSxpQkFBQXRCLElBQUEsQ0FBQTBFLEtBQUEsQ0FBQXdQLGNBQUEsRUFBQTFWLFFBQUEsQ0FBQSxnQkFBQSxDQUFBLENBQUEsQ0FEQTtBQUFBLGFBbkVBO0FBQUEsWUFzRUFvVixLQUFBLENBQUExVixTQUFBLENBQUFpRyxXQUFBLEdBQUEsWUFBQTtBQUFBLGdCQUVBO0FBQUEsdUJBQUEsS0FBQTNGLFFBQUEsR0FBQTJGLFdBQUEsRUFBQSxDQUZBO0FBQUEsYUFBQSxDQXRFQTtBQUFBLFlBMkVBeVAsS0FBQSxDQUFBMVYsU0FBQSxDQUFBa0csV0FBQSxHQUFBLFlBQUE7QUFBQSxnQkFDQSxPQUFBLEtBQUE1RixRQUFBLEdBQUE0RixXQUFBLEVBQUEsQ0FEQTtBQUFBLGFBQUEsQ0EzRUE7QUFBQSxZQStFQXdQLEtBQUEsQ0FBQTFWLFNBQUEsQ0FBQWlXLE1BQUEsR0FBQSxZQUFBO0FBQUEsZ0JBRUE7QUFBQSx1QkFBQXBELE1BQUEsQ0FBQW9ELE1BQUEsQ0FBQSxLQUFBL08sV0FBQSxDQUFBbUksU0FBQSxFQUFBLENBQUEsS0FBQTVOLEVBQUEsQ0FBQSxDQUFBLENBRkE7QUFBQSxhQUFBLENBL0VBO0FBQUEsWUFxRkE7QUFBQSxZQUFBOEosTUFBQSxDQUFBOEcsY0FBQSxDQUFBcUQsS0FBQSxDQUFBMVYsU0FBQSxFQUFBLGFBQUEsRUFBQTtBQUFBLGdCQUNBK0MsR0FBQSxFQUFBLFlBQUE7QUFBQSxvQkFDQSxJQUFBLEtBQUFtVCxZQUFBO0FBQUEsd0JBQ0EsT0FBQSxLQUFBQSxZQUFBLENBREE7QUFBQSx5QkFFQTtBQUFBLHdCQUNBbEMsTUFBQSxDQUFBdEcsV0FBQSxDQUFBLEtBQUF4RyxXQUFBLENBQUFtSSxTQUFBLEVBQUEzQyxHQUFBLENBQUEsS0FBQWpMLEVBQUEsRUFEQTtBQUFBLHFCQUhBO0FBQUEsaUJBREE7QUFBQSxhQUFBLEVBckZBO0FBQUEsWUErRkE7QUFBQSxZQUFBaVUsS0FBQSxDQUFBMVYsU0FBQSxDQUFBbVcsU0FBQSxHQUFBLFVBQUF4QixFQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBeUIsU0FBQSxHQUFBLEtBQUEzVSxFQUFBLENBREE7QUFBQSxnQkFFQTJMLFdBQUEsQ0FBQXhDLEtBQUEsQ0FBQSxLQUFBMUQsV0FBQSxDQUFBbUksU0FBQSxHQUFBLFlBQUEsRUFBQSxFQUFBNU4sRUFBQSxFQUFBLEtBQUFBLEVBQUEsRUFBQSxFQUFBLFVBQUFvQyxJQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBNkosV0FBQSxHQUFBN0osSUFBQSxDQURBO0FBQUEsb0JBRUEsSUFBQXdTLE9BQUEsR0FBQSxFQUFBLENBRkE7QUFBQSxvQkFHQSxJQUFBQyxjQUFBLEdBQUF4VSxJQUFBLENBQUE0TCxXQUFBLEVBQUE0RCxLQUFBLENBQUEsVUFBQSxFQUFBdEUsTUFBQSxHQUFBdEgsR0FBQSxDQUFBLFVBQUFyRCxDQUFBLEVBQUE7QUFBQSx3QkFDQSxPQUFBLEtBQUFBLENBQUEsQ0FEQTtBQUFBLHFCQUFBLEVBRUFxTyxVQUZBLENBRUF2RCxHQUFBLENBQUFtRyxVQUFBLENBQUF2TCxJQUFBLEVBRkEsRUFFQW5DLE9BRkEsRUFBQSxDQUhBO0FBQUEsb0JBTUE5RCxJQUFBLENBQUE0TCxXQUFBLEVBQUE2SSxPQUFBLENBQUEsVUFBQWxVLENBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUFBLENBQUEsQ0FBQXdTLFFBQUEsQ0FEQTtBQUFBLHFCQUFBLEVBRUE5UyxJQUZBLENBRUEsVUFBQUMsQ0FBQSxFQUFBQyxDQUFBLEVBQUE7QUFBQSx3QkFDQW9VLE9BQUEsQ0FBQXBVLENBQUEsSUFBQUgsSUFBQSxDQUFBRSxDQUFBLEVBQUFzUCxLQUFBLENBQUEsTUFBQSxFQUFBMUwsT0FBQSxFQUFBLENBREE7QUFBQSxxQkFGQSxFQU5BO0FBQUEsb0JBV0EsSUFBQWhGLElBQUEsR0FBQSxVQUFBeUIsQ0FBQSxFQUFBO0FBQUEsd0JBQ0FzUyxFQUFBLENBQUEsSUFBQUgsZUFBQSxDQUFBNEIsU0FBQSxFQUFBVixLQUFBLEVBQUFXLE9BQUEsQ0FBQSxFQURBO0FBQUEscUJBQUEsQ0FYQTtBQUFBLG9CQWNBLElBQUFDLGNBQUEsQ0FBQWpRLE1BQUE7QUFBQSx3QkFDQStHLFdBQUEsQ0FBQXJLLEdBQUEsQ0FBQSxZQUFBLEVBQUF1VCxjQUFBLEVBQUExVixJQUFBLEVBREE7QUFBQTtBQUFBLHdCQUdBQSxJQUFBLEdBakJBO0FBQUEsaUJBQUEsRUFGQTtBQUFBLGFBQUEsQ0EvRkE7QUFBQSxZQXNIQThVLEtBQUEsQ0FBQTFWLFNBQUEsQ0FBQTBVLElBQUEsR0FBQSxVQUFBalUsSUFBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQStWLENBQUEsR0FBQSxLQUFBQyxLQUFBLEVBQUEsQ0FEQTtBQUFBLGdCQUVBLElBQUF6UCxNQUFBLEdBQUEwTyxLQUFBLENBQUExTyxNQUFBLENBRkE7QUFBQSxnQkFHQSxJQUFBMFAsRUFBQSxHQUFBLEtBQUFqVixFQUFBLENBSEE7QUFBQSxnQkFJQSxJQUFBNE4sU0FBQSxHQUFBLEtBQUFuSSxXQUFBLENBQUFtSSxTQUFBLENBSkE7QUFBQSxnQkFLQSxJQUFBNU8sSUFBQSxFQUFBO0FBQUEsb0JBQ0EsU0FBQWtXLEdBQUEsSUFBQWxXLElBQUEsRUFBQTtBQUFBLHdCQUNBK1YsQ0FBQSxDQUFBRyxHQUFBLElBQUFsVyxJQUFBLENBQUFrVyxHQUFBLENBQUEsQ0FEQTtBQUFBLHFCQURBO0FBQUEsaUJBTEE7QUFBQSxnQkFXQTtBQUFBLGdCQUFBN1UsSUFBQSxDQUFBNFQsS0FBQSxDQUFBSSxXQUFBLEVBQUFyUCxNQUFBLENBQUEsVUFBQXBFLENBQUEsRUFBQTtBQUFBLG9CQUNBLE9BQUEsQ0FBQTJFLE1BQUEsQ0FBQTNFLENBQUEsRUFBQWlULFFBQUEsQ0FEQTtBQUFBLGlCQUFBLEVBRUF2VCxJQUZBLENBRUEsVUFBQTBOLFNBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFBLFNBQUEsSUFBQStHLENBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUFBLENBQUEsQ0FBQS9HLFNBQUEsQ0FBQSxDQURBO0FBQUEscUJBREE7QUFBQSxpQkFGQSxFQVhBO0FBQUEsZ0JBa0JBLElBQUFpSCxFQUFBLEVBQUE7QUFBQSxvQkFBQUYsQ0FBQSxDQUFBL1UsRUFBQSxHQUFBaVYsRUFBQSxDQUFBO0FBQUEsaUJBbEJBO0FBQUEsZ0JBbUJBLElBQUE3TCxPQUFBLEdBQUF1QyxXQUFBLENBQUF4QyxLQUFBLENBQUF5RSxTQUFBLEdBQUEsQ0FBQXFILEVBQUEsR0FBQSxPQUFBLEdBQUEsTUFBQSxDQUFBLEVBQUFGLENBQUEsQ0FBQSxDQW5CQTtBQUFBLGdCQW9CQSxJQUFBL1YsSUFBQSxJQUFBQSxJQUFBLENBQUF5RyxXQUFBLEtBQUE5RCxRQUFBLEVBQUE7QUFBQSxvQkFFQTtBQUFBLG9CQUFBeUgsT0FBQSxDQUFBK0wsT0FBQSxDQUFBeEMsa0JBQUEsR0FBQTNULElBQUEsQ0FGQTtBQUFBLGlCQXBCQTtBQUFBLGdCQXdCQSxPQUFBb0ssT0FBQSxDQXhCQTtBQUFBLGFBQUEsQ0F0SEE7QUFBQSxZQWdKQTZLLEtBQUEsQ0FBQTFWLFNBQUEsQ0FBQTZXLElBQUEsR0FBQSxZQUFBO0FBQUEsZ0JBQ0EsSUFBQWxMLEdBQUEsR0FBQSxJQUFBLEtBQUF6RSxXQUFBLENBQUEsS0FBQXVQLEtBQUEsRUFBQSxDQUFBLENBREE7QUFBQSxnQkFFQTlLLEdBQUEsQ0FBQXVLLFlBQUEsR0FBQSxLQUFBQSxZQUFBLENBRkE7QUFBQSxnQkFHQSxPQUFBdkssR0FBQSxDQUhBO0FBQUEsYUFBQSxDQWhKQTtBQUFBLFlBdUpBO0FBQUEsZ0JBQUFtTCxHQUFBLEdBQUEsZUFBQWhWLElBQUEsQ0FBQTBFLEtBQUEsQ0FBQXFILFVBQUEsRUFBQW5JLEdBQUEsQ0FBQSxVQUFBb0IsS0FBQSxFQUFBO0FBQUEsZ0JBQ0EsT0FBQUEsS0FBQSxDQUFBckYsRUFBQSxHQUFBLFdBQUEsR0FBQXFGLEtBQUEsQ0FBQXJGLEVBQUEsQ0FEQTtBQUFBLGFBQUEsRUFFQXNWLE1BRkEsQ0FFQS9QLE1BQUEsQ0FBQXRCLEdBQUEsQ0FBQSxVQUFBckQsQ0FBQSxFQUFBSixDQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBSSxDQUFBLENBQUE0RSxJQUFBLElBQUEsTUFBQSxJQUFBNUUsQ0FBQSxDQUFBNEUsSUFBQSxJQUFBLFVBQUEsRUFBQTtBQUFBLG9CQUNBLE9BQUFoRixDQUFBLEdBQUEsV0FBQSxHQUFBQSxDQUFBLEdBQUEsb0JBQUEsR0FBQUEsQ0FBQSxHQUFBLG9CQUFBLEdBQUFBLENBQUEsR0FBQSw2Q0FBQSxDQURBO0FBQUEsaUJBQUEsTUFFQSxJQUFBSSxDQUFBLENBQUE0RSxJQUFBLElBQUEsU0FBQSxFQUFBO0FBQUEsb0JBQ0EsT0FBQWhGLENBQUEsR0FBQSxVQUFBLEdBQUFBLENBQUEsR0FBQSxVQUFBLENBREE7QUFBQSxpQkFBQSxNQUVBO0FBQUEsb0JBQ0EsT0FBQUEsQ0FBQSxHQUFBLFVBQUEsR0FBQUEsQ0FBQSxDQURBO0FBQUEsaUJBTEE7QUFBQSxhQUFBLENBRkEsRUFVQTNCLFFBVkEsQ0FVQSxLQVZBLENBQUEsR0FVQSxJQVZBLENBdkpBO0FBQUEsWUFrS0FvVixLQUFBLENBQUExVixTQUFBLENBQUF5VyxLQUFBLEdBQUEsSUFBQXJULFFBQUEsQ0FBQTBULEdBQUEsQ0FBQSxDQWxLQTtBQUFBLFlBb0tBcEIsS0FBQSxDQUFBc0IsU0FBQSxHQUFBLFVBQUFDLE9BQUEsRUFBQXRDLEVBQUEsRUFBQXVDLEtBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUFDLEdBQUEsR0FBQSxFQUFBLENBREE7QUFBQSxnQkFFQSxJQUFBQyxTQUFBLEdBQUF0VixJQUFBLENBQUE0VCxLQUFBLENBQUExTyxNQUFBLEVBQ0FQLE1BREEsQ0FDQSxVQUFBcEUsQ0FBQSxFQUFBO0FBQUEsb0JBQ0EsT0FBQSxDQUFBQSxDQUFBLENBQUFpVCxRQUFBLENBREE7QUFBQSxpQkFEQSxFQUlBaEUsS0FKQSxDQUlBLElBSkEsRUFLQTFMLE9BTEEsRUFBQSxDQUZBO0FBQUEsZ0JBUUE5RCxJQUFBLENBQUFtVixPQUFBLEVBQ0F2UixHQURBLENBQ0EsVUFBQXJELENBQUEsRUFBQTtBQUFBLG9CQUNBLE9BQUFBLENBQUEsQ0FBQW9VLEtBQUEsRUFBQSxDQURBO0FBQUEsaUJBREEsRUFJQTFVLElBSkEsQ0FJQSxVQUFBTSxDQUFBLEVBQUE7QUFBQSxvQkFDQVAsSUFBQSxDQUFBc1YsU0FBQSxFQUFBclYsSUFBQSxDQUFBLFVBQUF3RixDQUFBLEVBQUE7QUFBQSx3QkFDQSxPQUFBbEYsQ0FBQSxDQUFBa0YsQ0FBQSxDQUFBLENBREE7QUFBQSxxQkFBQSxFQURBO0FBQUEsb0JBSUE0UCxHQUFBLENBQUE1VyxJQUFBLENBQUE4QixDQUFBLEVBSkE7QUFBQSxpQkFKQSxFQVJBO0FBQUEsZ0JBa0JBK0ssV0FBQSxDQUFBeEMsS0FBQSxDQUFBOEssS0FBQSxDQUFBckcsU0FBQSxFQUFBLEtBQUEsRUFBQTtBQUFBLG9CQUFBZ0ksUUFBQSxFQUFBRixHQUFBO0FBQUEsb0JBQUExRSxPQUFBLEVBQUFyRixXQUFBLENBQUFxRixPQUFBLEVBQUE7QUFBQSxpQkFBQSxFQUFBLFVBQUE2RSxLQUFBLEVBQUE7QUFBQSxvQkFDQWxLLFdBQUEsQ0FBQW9CLE9BQUEsQ0FBQThJLEtBQUEsRUFEQTtBQUFBLG9CQUVBLElBQUFDLEdBQUEsR0FBQXBLLEdBQUEsQ0FBQXVJLEtBQUEsQ0FBQXJHLFNBQUEsQ0FBQSxDQUZBO0FBQUEsb0JBR0EsSUFBQW1JLElBQUEsR0FBQTFWLElBQUEsQ0FBQXdWLEtBQUEsQ0FBQTVCLEtBQUEsQ0FBQXJHLFNBQUEsRUFBQW9JLE9BQUEsRUFBQW5HLEtBQUEsQ0FBQSxJQUFBLEVBQUE1TCxHQUFBLENBQUEsVUFBQXJELENBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUFrVixHQUFBLENBQUF4VSxHQUFBLENBQUFWLENBQUEsQ0FBQSxDQURBO0FBQUEscUJBQUEsRUFFQXVELE9BRkEsRUFBQSxDQUhBO0FBQUEsb0JBTUEsSUFBQStPLEVBQUEsRUFBQTtBQUFBLHdCQUNBQSxFQUFBLENBQUE2QyxJQUFBLEVBREE7QUFBQSxxQkFOQTtBQUFBLGlCQUFBLEVBU0FOLEtBVEEsRUFsQkE7QUFBQSxhQUFBLENBcEtBO0FBQUEsWUFpTUEsSUFBQSxpQkFBQTFRLEtBQUE7QUFBQSxnQkFDQTFFLElBQUEsQ0FBQTBFLEtBQUEsQ0FBQWtSLFdBQUEsRUFBQTNWLElBQUEsQ0FBQSxVQUFBTSxDQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBc1YsUUFBQSxHQUFBdFYsQ0FBQSxDQUFBLENBQUEsQ0FBQSxDQURBO0FBQUEsb0JBRUEsSUFBQTVCLElBQUEsR0FBQTRCLENBQUEsQ0FBQSxDQUFBLENBQUEsQ0FGQTtBQUFBLG9CQUdBLElBQUF1VixLQUFBLEdBQUEsc0JBQUEsQ0FIQTtBQUFBLG9CQUlBLElBQUFuWCxJQUFBLENBQUE0RixNQUFBO0FBQUEsd0JBQ0F1UixLQUFBLElBQUEsT0FBQTlWLElBQUEsQ0FBQXJCLElBQUEsRUFBQWlGLEdBQUEsQ0FBQSxVQUFBckQsQ0FBQSxFQUFBO0FBQUEsNEJBQ0EsT0FBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQUEsQ0FBQSxDQURBO0FBQUEseUJBQUEsRUFFQXdELElBRkEsQ0FFQSxHQUZBLENBQUEsQ0FMQTtBQUFBLG9CQVFBK1IsS0FBQSxJQUFBLElBQUEsQ0FSQTtBQUFBLG9CQVNBblgsSUFBQSxDQUFBRixJQUFBLENBQUEsSUFBQSxFQVRBO0FBQUEsb0JBVUFtVixLQUFBLENBQUExVixTQUFBLENBQUEyWCxRQUFBLElBQUEsSUFBQXZVLFFBQUEsQ0FBQTNDLElBQUEsRUFBQW1YLEtBQUEsR0FBQSwyQ0FBQSxHQUFBRCxRQUFBLEdBQUEsMENBQUEsR0FDQSxRQURBLEdBRUEsOERBRkEsR0FHQSxnQ0FIQSxHQUlBLGVBSkEsR0FLQSx1QkFMQSxHQU1BLEtBTkEsR0FPQSxPQVBBLENBQUEsQ0FWQTtBQUFBLGlCQUFBLEVBbE1BO0FBQUEsWUFzTkEsSUFBQSxpQkFBQW5SLEtBQUEsRUFBQTtBQUFBLGdCQUNBa1AsS0FBQSxDQUFBSCxXQUFBLEdBQUF6VCxJQUFBLENBQUEwRSxLQUFBLENBQUErTyxXQUFBLEVBQUF4TixJQUFBLEdBQUFyQyxHQUFBLENBQUEsVUFBQXJELENBQUEsRUFBQTtBQUFBLG9CQUNBLE9BQUE7QUFBQSx3QkFBQUEsQ0FBQTtBQUFBLHdCQUFBLElBQUE7QUFBQSxxQkFBQSxDQURBO0FBQUEsaUJBQUEsRUFFQXFOLFFBRkEsRUFBQSxDQURBO0FBQUEsZ0JBSUFnRyxLQUFBLENBQUExVixTQUFBLENBQUE2WCxNQUFBLEdBQUEsVUFBQXJCLENBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFzQixDQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsb0JBRUEsSUFBQUMsRUFBQSxHQUFBLEVBQUF0VyxFQUFBLEVBQUEsS0FBQUEsRUFBQSxFQUFBLENBRkE7QUFBQSxvQkFHQSxJQUFBdVcsRUFBQSxHQUFBLEtBQUE5USxXQUFBLENBQUFxTyxXQUFBLENBSEE7QUFBQSxvQkFJQSxJQUFBMEMsRUFBQSxHQUFBLEtBQUEvUSxXQUFBLENBQUFGLE1BQUEsQ0FKQTtBQUFBLG9CQUtBLElBQUFxRixDQUFBLEdBQUEsSUFBQSxLQUFBbkYsV0FBQSxDQUFBc1AsQ0FBQSxFQUFBQyxLQUFBLEVBQUEsQ0FMQTtBQUFBLG9CQU1BLElBQUF5QixRQUFBLEdBQUFwVyxJQUFBLENBQUFrVyxFQUFBLEVBQUFqUSxJQUFBLEdBQUFyQyxHQUFBLENBQUEsVUFBQXJELENBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUE7QUFBQSw0QkFBQUEsQ0FBQTtBQUFBLDRCQUFBNFYsRUFBQSxDQUFBNVYsQ0FBQSxDQUFBO0FBQUEseUJBQUEsQ0FEQTtBQUFBLHFCQUFBLEVBRUFxTixRQUZBLEVBQUEsQ0FOQTtBQUFBLG9CQVNBNU4sSUFBQSxDQUFBMFUsQ0FBQSxFQUFBelUsSUFBQSxDQUFBLFVBQUFDLENBQUEsRUFBQUMsQ0FBQSxFQUFBO0FBQUEsd0JBQ0EsSUFBQUEsQ0FBQSxJQUFBK1YsRUFBQSxJQUFBRSxRQUFBLENBQUFqVyxDQUFBLEVBQUFxVCxRQUFBLEVBQUE7QUFBQSw0QkFDQXlDLEVBQUEsQ0FBQTlWLENBQUEsSUFBQUQsQ0FBQSxDQURBO0FBQUEseUJBREE7QUFBQSxxQkFBQSxFQVRBO0FBQUEsb0JBY0FvTCxXQUFBLENBQUF4QyxLQUFBLENBQUEsS0FBQTFELFdBQUEsQ0FBQW1JLFNBQUEsR0FBQSxTQUFBLEVBQUEwSSxFQUFBLEVBQUEsWUFBQTtBQUFBLHdCQUNBalcsSUFBQSxDQUFBaVcsRUFBQSxFQUFBaFcsSUFBQSxDQUFBLFVBQUFDLENBQUEsRUFBQUMsQ0FBQSxFQUFBO0FBQUEsNEJBQ0E2VixDQUFBLENBQUE3VixDQUFBLElBQUFELENBQUEsQ0FEQTtBQUFBLHlCQUFBLEVBREE7QUFBQSxxQkFBQSxFQWRBO0FBQUEsaUJBQUEsQ0FKQTtBQUFBLGFBdE5BO0FBQUEsWUFnUEE4UixVQUFBLENBQUE0QixLQUFBLENBQUFyRyxTQUFBLElBQUFxRyxLQUFBLENBaFBBO0FBQUEsWUFrUEE7QUFBQSxxQkFBQXhFLENBQUEsSUFBQTFLLEtBQUEsQ0FBQVEsTUFBQSxFQUFBO0FBQUEsZ0JBQ0FSLEtBQUEsQ0FBQVEsTUFBQSxDQUFBa0ssQ0FBQSxFQUFBelAsRUFBQSxHQUFBeVAsQ0FBQSxDQURBO0FBQUEsYUFsUEE7QUFBQSxZQXFQQXdFLEtBQUEsQ0FBQTFPLE1BQUEsR0FBQWxGLElBQUEsQ0FBQTBFLEtBQUEsQ0FBQVEsTUFBQSxFQUFBK1AsTUFBQSxDQUFBalYsSUFBQSxDQUFBMEUsS0FBQSxDQUFBK08sV0FBQSxDQUFBLEVBQUF3QixNQUFBLENBQUFqVixJQUFBLENBQUEwRSxLQUFBLENBQUFxSCxVQUFBLEVBQUFzSyxHQUFBLENBQUEsVUFBQTlWLENBQUEsRUFBQTtBQUFBLGdCQUNBQSxDQUFBLENBQUE0RSxJQUFBLEdBQUE1RSxDQUFBLENBQUE0RSxJQUFBLElBQUEsV0FBQSxDQURBO0FBQUEsYUFBQSxDQUFBLEVBRUFtUixPQUZBLENBRUEsSUFGQSxFQUVBMUksUUFGQSxFQUFBLENBclBBO0FBQUEsWUF5UEE7QUFBQSxZQUFBNU4sSUFBQSxDQUFBNFQsS0FBQSxDQUFBMU8sTUFBQSxFQUFBakYsSUFBQSxDQUFBLFVBQUErRSxLQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBLENBQUFBLEtBQUEsQ0FBQXVSLE1BQUEsRUFBQTtBQUFBLG9CQUNBLElBQUF2UixLQUFBLENBQUFHLElBQUEsS0FBQSxXQUFBLEVBQUE7QUFBQSx3QkFDQUgsS0FBQSxDQUFBdVIsTUFBQSxHQUFBLFNBQUEsQ0FEQTtBQUFBLHFCQUFBLE1BRUE7QUFBQSx3QkFDQXZSLEtBQUEsQ0FBQXVSLE1BQUEsR0FBQXZSLEtBQUEsQ0FBQUcsSUFBQSxDQURBO0FBQUEscUJBSEE7QUFBQSxpQkFEQTtBQUFBLGFBQUEsRUF6UEE7QUFBQSxZQW1RQTtBQUFBLFlBQUFuRixJQUFBLENBQUEwRSxLQUFBLENBQUFxSCxVQUFBLEVBQUE5TCxJQUFBLENBQUEsVUFBQXVXLEdBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUFDLE9BQUEsR0FBQUQsR0FBQSxDQUFBdEssRUFBQSxDQURBO0FBQUEsZ0JBRUEsSUFBQXdLLFNBQUEsR0FBQSxNQUFBRixHQUFBLENBQUE3VyxFQUFBLENBRkE7QUFBQSxnQkFHQW9RLHNCQUFBLENBQUE2RCxLQUFBLENBQUExVixTQUFBLEVBQUFzWSxHQUFBLENBQUE3VyxFQUFBLEVBQUEsWUFBQTtBQUFBLG9CQUNBLElBQUEsQ0FBQSxLQUFBK1csU0FBQSxDQUFBLEVBQUE7QUFBQSx3QkFBQSxPQUFBLElBQUEsQ0FBQTtBQUFBLHFCQURBO0FBQUEsb0JBQ0EsQ0FEQTtBQUFBLG9CQUVBLElBQUEsQ0FBQSxDQUFBRCxPQUFBLElBQUFwTCxHQUFBLENBQUEsRUFBQTtBQUFBLHdCQUNBLElBQUFqTSxHQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsd0JBRUFrTSxXQUFBLENBQUErQixRQUFBLENBQUFvSixPQUFBLEVBQUEsVUFBQWxXLENBQUEsRUFBQTtBQUFBLDRCQUNBMlIsTUFBQSxDQUFBMUcsU0FBQSxDQUFBaUwsT0FBQSxFQUFBN0wsR0FBQSxDQUFBeEwsR0FBQSxDQUFBc1gsU0FBQSxDQUFBLEVBQUEsSUFBQSxFQURBO0FBQUEseUJBQUEsRUFGQTtBQUFBLHFCQUZBO0FBQUEsb0JBUUEsSUFBQXZHLE1BQUEsR0FBQXNHLE9BQUEsSUFBQXBMLEdBQUEsSUFBQSxLQUFBcUwsU0FBQSxDQUFBLElBQUFyTCxHQUFBLENBQUFvTCxPQUFBLEVBQUF4VixHQUFBLENBQUEsS0FBQXlWLFNBQUEsQ0FBQSxDQUFBLENBUkE7QUFBQSxvQkFTQSxJQUFBLENBQUF2RyxNQUFBLElBQUFzRyxPQUFBLElBQUF2RSxNQUFBLENBQUExRyxTQUFBLEVBQUE7QUFBQSx3QkFFQTtBQUFBLDRCQUFBLE9BQUEsS0FBQWtMLFNBQUEsQ0FBQSxLQUFBLFFBQUEsRUFBQTtBQUFBLDRCQUNBeEUsTUFBQSxDQUFBMUcsU0FBQSxDQUFBaUwsT0FBQSxFQUFBN0wsR0FBQSxDQUFBLEtBQUE4TCxTQUFBLENBQUEsRUFBQSxJQUFBLEVBREE7QUFBQSx5QkFBQSxNQUVBO0FBQUEsNEJBQ0E5VSxPQUFBLENBQUErVSxJQUFBLENBQUEsd0JBQUFELFNBQUEsR0FBQSxHQUFBLEdBQUEsS0FBQS9XLEVBQUEsR0FBQSxhQUFBLEdBQUFpVSxLQUFBLENBQUFyRyxTQUFBLEVBREE7QUFBQSx5QkFKQTtBQUFBLHdCQU9BLE9BQUFqUCxLQUFBLENBQUE2QyxJQUFBLENBUEE7QUFBQSxxQkFUQTtBQUFBLG9CQWtCQSxPQUFBZ1AsTUFBQSxDQWxCQTtBQUFBLGlCQUFBLEVBbUJBLFVBQUFFLEtBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFBLEtBQUEsRUFBQTtBQUFBLHdCQUNBLElBQUFBLEtBQUEsQ0FBQWpMLFdBQUEsS0FBQTlHLEtBQUEsQ0FBQTZDLElBQUEsSUFBQWtQLEtBQUEsQ0FBQWpMLFdBQUEsQ0FBQW1JLFNBQUEsS0FBQWtKLE9BQUEsRUFBQTtBQUFBLDRCQUNBLE1BQUEsSUFBQUcsU0FBQSxDQUFBLHlCQUFBSCxPQUFBLEdBQUEsTUFBQSxHQUFBRCxHQUFBLENBQUE3VyxFQUFBLENBQUEsQ0FEQTtBQUFBLHlCQURBO0FBQUEsd0JBSUEsS0FBQStXLFNBQUEsSUFBQXJHLEtBQUEsQ0FBQTFRLEVBQUEsQ0FKQTtBQUFBLHFCQUFBLE1BS0E7QUFBQSx3QkFDQSxLQUFBK1csU0FBQSxJQUFBLElBQUEsQ0FEQTtBQUFBLHFCQU5BO0FBQUEsaUJBbkJBLEVBNEJBLFNBQUFELE9BNUJBLEVBNEJBLGFBQUFBLE9BNUJBLEVBNEJBLGFBQUFBLE9BNUJBLEVBNEJBLGVBQUFBLDZDQTVCQSxFQUhBO0FBQUEsZ0JBa0NBN0MsS0FBQSxDQUFBMVYsU0FBQSxDQUFBLFFBQUFJLEtBQUEsQ0FBQTJGLFVBQUEsQ0FBQXVTLEdBQUEsQ0FBQTdXLEVBQUEsQ0FBQSxJQUFBLFlBQUE7QUFBQSxvQkFDQSxPQUFBb1IsTUFBQSxDQUFBOVAsR0FBQSxDQUFBd1YsT0FBQSxFQUFBLEtBQUFDLFNBQUEsQ0FBQSxDQUFBLENBREE7QUFBQSxpQkFBQSxDQWxDQTtBQUFBLGFBQUEsRUFuUUE7QUFBQSxZQTJTQTtBQUFBLFlBQUExVyxJQUFBLENBQUEwRSxLQUFBLENBQUF5SCxZQUFBLEVBQUFsTSxJQUFBLENBQUEsVUFBQXVXLEdBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUF2SyxTQUFBLEdBQUF1SyxHQUFBLENBQUFwSyxFQUFBLEdBQUEsR0FBQSxHQUFBb0ssR0FBQSxDQUFBN1csRUFBQSxDQURBO0FBQUEsZ0JBRUEsSUFBQXNRLFlBQUEsR0FBQXVHLEdBQUEsQ0FBQXBLLEVBQUEsR0FBQSxHQUFBLEdBQUE5TixLQUFBLENBQUFvSCxTQUFBLENBQUE4USxHQUFBLENBQUE3VyxFQUFBLENBQUEsQ0FGQTtBQUFBLGdCQUdBLElBQUFrWCxRQUFBLEdBQUFMLEdBQUEsQ0FBQXBLLEVBQUEsQ0FIQTtBQUFBLGdCQUlBLElBQUF3SCxLQUFBLENBQUExVixTQUFBLENBQUE0WSxjQUFBLENBQUE3RyxZQUFBLENBQUEsRUFBQTtBQUFBLG9CQUNBck8sT0FBQSxDQUFBMEQsS0FBQSxDQUFBLGdDQUFBMkssWUFBQSxHQUFBLEdBQUEsR0FBQSxPQUFBLEdBQUEyRCxLQUFBLENBQUFyRyxTQUFBLEVBREE7QUFBQSxpQkFBQSxNQUVBO0FBQUEsb0JBQ0F3QyxzQkFBQSxDQUFBNkQsS0FBQSxDQUFBMVYsU0FBQSxFQUFBK1IsWUFBQSxFQUFBLFlBQUE7QUFBQSx3QkFDQSxJQUFBM0wsR0FBQSxHQUFBdVMsUUFBQSxJQUFBeEwsR0FBQSxHQUFBcUcsTUFBQSxDQUFBekYsU0FBQSxFQUFBaEwsR0FBQSxDQUFBLEtBQUF0QixFQUFBLEdBQUEsRUFBQSxDQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsd0JBRUF1UyxNQUFBLENBQUF6RyxXQUFBLENBQUFRLFNBQUEsRUFBQXJCLEdBQUEsQ0FBQSxLQUFBakwsRUFBQSxFQUFBLElBQUEsRUFGQTtBQUFBLHdCQUdBLE9BQUEyRSxHQUFBLENBSEE7QUFBQSxxQkFBQSxFQUlBLElBSkEsRUFJQSxTQUFBdVMsUUFKQSxFQUlBLGFBQUFBLFFBSkEsRUFJQSxhQUFBQSxRQUpBLEVBREE7QUFBQSxpQkFOQTtBQUFBLGdCQWFBakQsS0FBQSxDQUFBMVYsU0FBQSxDQUFBLFFBQUFJLEtBQUEsQ0FBQTJGLFVBQUEsQ0FBQTNGLEtBQUEsQ0FBQW9ILFNBQUEsQ0FBQThRLEdBQUEsQ0FBQXBLLEVBQUEsQ0FBQSxDQUFBLElBQUEsWUFBQTtBQUFBLG9CQUNBLElBQUEySyxJQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsb0JBRUFBLElBQUEsQ0FBQVAsR0FBQSxDQUFBN1csRUFBQSxJQUFBLENBQUEsS0FBQUEsRUFBQSxDQUFBLENBRkE7QUFBQSxvQkFHQSxPQUFBb1IsTUFBQSxDQUFBOVAsR0FBQSxDQUFBdVYsR0FBQSxDQUFBcEssRUFBQSxFQUFBMkssSUFBQSxDQUFBLENBSEE7QUFBQSxpQkFBQSxDQWJBO0FBQUEsYUFBQSxFQTNTQTtBQUFBLFlBZ1VBO0FBQUEsZ0JBQUFyUyxLQUFBLENBQUEySCxVQUFBLEVBQUE7QUFBQSxnQkFDQXJNLElBQUEsQ0FBQTBFLEtBQUEsQ0FBQTJILFVBQUEsRUFBQXBNLElBQUEsQ0FBQSxVQUFBdVcsR0FBQSxFQUFBO0FBQUEsb0JBQ0EsSUFBQXZLLFNBQUEsR0FBQXVLLEdBQUEsQ0FBQXZLLFNBQUEsQ0FEQTtBQUFBLG9CQUVBLElBQUErSyxLQUFBLEdBQUFSLEdBQUEsQ0FBQVEsS0FBQSxHQUFBLENBQUEsR0FBQSxDQUFBLENBRkE7QUFBQSxvQkFHQSxJQUFBQyxVQUFBLEdBQUFULEdBQUEsQ0FBQTlSLEtBQUEsQ0FIQTtBQUFBLG9CQUtBO0FBQUEsd0JBQUF3SSxNQUFBLEdBQUFnRixNQUFBLENBQUF2RyxRQUFBLENBQUFNLFNBQUEsRUFBQSxRQUFBLEtBQUErSyxLQUFBLENBQUEsQ0FBQSxDQUxBO0FBQUEsb0JBT0FqSCxzQkFBQSxDQUFBNkQsS0FBQSxDQUFBMVYsU0FBQSxFQUFBc1ksR0FBQSxDQUFBOVIsS0FBQSxHQUFBLEdBQUEsRUFBQSxZQUFBO0FBQUEsd0JBQ0EsSUFBQXRGLEdBQUEsR0FBQSxJQUFBLENBREE7QUFBQSx3QkFFQSxJQUFBa0YsR0FBQSxHQUFBLEVBQUEsQ0FGQTtBQUFBLHdCQUdBLElBQUE2SSxHQUFBLEdBQUFELE1BQUEsQ0FBQTlOLEdBQUEsQ0FBQU8sRUFBQSxDQUFBLENBSEE7QUFBQSx3QkFJQSxJQUFBc0IsR0FBQSxHQUFBLElBQUEsQ0FKQTtBQUFBLHdCQUtBLElBQUFrTSxHQUFBLENBQUE1SSxNQUFBLEVBQUE7QUFBQSw0QkFFQTtBQUFBLDRCQUFBdEQsR0FBQSxHQUFBc1IsUUFBQSxDQUFBMEUsVUFBQSxFQUFBaFcsR0FBQSxDQUFBTSxJQUFBLENBQUE4SixHQUFBLENBQUE0TCxVQUFBLENBQUEsQ0FBQSxDQUZBO0FBQUEseUJBTEE7QUFBQSx3QkFTQSxJQUFBOUosR0FBQSxJQUFBbE0sR0FBQTtBQUFBLDRCQUNBcUQsR0FBQSxHQUFBdEUsSUFBQSxDQUFBbU4sR0FBQSxFQUFBdkosR0FBQSxDQUFBM0MsR0FBQSxFQUFBMEQsTUFBQSxDQUFBckcsS0FBQSxDQUFBc0ksSUFBQSxFQUFBOUMsT0FBQSxFQUFBLENBVkE7QUFBQSx3QkFXQSxPQUFBUSxHQUFBLENBWEE7QUFBQSxxQkFBQSxFQVlBLElBWkEsRUFZQSxrQkFBQTJILFNBWkEsRUFZQSxjQUFBZ0wsVUFaQSxFQVBBO0FBQUEsb0JBcUJBckQsS0FBQSxDQUFBMVYsU0FBQSxDQUFBLFFBQUFJLEtBQUEsQ0FBQTJGLFVBQUEsQ0FBQTNGLEtBQUEsQ0FBQW9ILFNBQUEsQ0FBQXVSLFVBQUEsQ0FBQSxDQUFBLElBQUEsWUFBQTtBQUFBLHdCQUNBLElBQUE3WCxHQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsd0JBRUEsT0FBQSxJQUFBK0MsT0FBQSxDQUFBLFVBQUFDLE1BQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsNEJBQ0EsSUFBQTtBQUFBLGdDQUNBNlAsTUFBQSxDQUFBdkYsTUFBQSxDQUFBVixTQUFBLEVBQUEsQ0FBQTdNLEdBQUEsQ0FBQU8sRUFBQSxDQUFBLEVBQUFxWCxLQUFBLEVBQUEsVUFBQWpWLElBQUEsRUFBQTtBQUFBLG9DQUNBLElBQUFvTCxHQUFBLEdBQUFELE1BQUEsQ0FBQTlOLEdBQUEsQ0FBQU8sRUFBQSxDQUFBLENBREE7QUFBQSxvQ0FFQSxJQUFBd04sR0FBQSxDQUFBNUksTUFBQSxFQUFBO0FBQUEsd0NBQ0ErRyxXQUFBLENBQUFtQyxLQUFBLENBQUF3SixVQUFBLEVBQUEsRUFBQXRYLEVBQUEsRUFBQXdOLEdBQUEsRUFBQSxFQUFBLElBQUEsRUFBQSxZQUFBO0FBQUEsNENBQ0EsSUFBQWxNLEdBQUEsR0FBQW9LLEdBQUEsQ0FBQTRMLFVBQUEsRUFBQWhXLEdBQUEsQ0FBQU0sSUFBQSxDQUFBOEosR0FBQSxDQUFBNEwsVUFBQSxDQUFBLENBQUEsQ0FEQTtBQUFBLDRDQUVBN1UsTUFBQSxDQUFBcEMsSUFBQSxDQUFBbU4sR0FBQSxFQUFBdkosR0FBQSxDQUFBM0MsR0FBQSxFQUFBMEQsTUFBQSxDQUFBckcsS0FBQSxDQUFBc0ksSUFBQSxFQUFBOUMsT0FBQSxFQUFBLEVBRkE7QUFBQSx5Q0FBQSxFQURBO0FBQUEscUNBQUEsTUFLQTtBQUFBLHdDQUNBMUIsTUFBQSxDQUFBLEVBQUEsRUFEQTtBQUFBLHFDQVBBO0FBQUEsaUNBQUEsRUFEQTtBQUFBLDZCQUFBLENBWUEsT0FBQWdHLENBQUEsRUFBQTtBQUFBLGdDQUNBeEcsT0FBQSxDQUFBMEQsS0FBQSxDQUFBOEMsQ0FBQSxFQURBO0FBQUEsZ0NBRUEvRixNQUFBLENBQUErRixDQUFBLEVBRkE7QUFBQSw2QkFiQTtBQUFBLHlCQUFBLENBQUEsQ0FGQTtBQUFBLHFCQUFBLENBckJBO0FBQUEsb0JBNENBd0wsS0FBQSxDQUFBMU8sTUFBQSxDQUFBNUcsS0FBQSxDQUFBMkYsVUFBQSxDQUFBZ1QsVUFBQSxDQUFBLElBQUE7QUFBQSx3QkFDQXRYLEVBQUEsRUFBQXJCLEtBQUEsQ0FBQTJGLFVBQUEsQ0FBQWdULFVBQUEsQ0FEQTtBQUFBLHdCQUVBdlgsSUFBQSxFQUFBcEIsS0FBQSxDQUFBMkYsVUFBQSxDQUFBZ1QsVUFBQSxDQUZBO0FBQUEsd0JBR0F6RCxRQUFBLEVBQUEsSUFIQTtBQUFBLHdCQUlBRCxRQUFBLEVBQUEsSUFKQTtBQUFBLHdCQUtBcE8sSUFBQSxFQUFBLEtBTEE7QUFBQSx3QkFNQStSLFVBQUEsRUFBQSxFQU5BO0FBQUEscUJBQUEsQ0E1Q0E7QUFBQSxpQkFBQSxFQURBO0FBQUEsZ0JBd0RBdEQsS0FBQSxDQUFBMVYsU0FBQSxDQUFBaVosZUFBQSxHQUFBLFVBQUFDLFFBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUE3QixRQUFBLEdBQUEsS0FBQSxDQURBO0FBQUEsb0JBRUEsSUFBQVgsRUFBQSxHQUFBLEtBQUFqVixFQUFBLENBRkE7QUFBQSxvQkFHQSxJQUFBMFgsU0FBQSxHQUFBLEVBQUEsQ0FIQTtBQUFBLG9CQUlBLElBQUFELFFBQUEsQ0FBQWhTLFdBQUEsQ0FBQTFGLElBQUEsSUFBQSxPQUFBLEVBQUE7QUFBQSx3QkFDQTZWLFFBQUEsR0FBQSxJQUFBLENBREE7QUFBQSx3QkFFQThCLFNBQUEsR0FBQUQsUUFBQSxDQUZBO0FBQUEsd0JBR0FBLFFBQUEsR0FBQUMsU0FBQSxDQUFBLENBQUEsQ0FBQSxDQUhBO0FBQUEscUJBSkE7QUFBQSxvQkFTQSxJQUFBQyxNQUFBLEdBQUFGLFFBQUEsQ0FBQWhTLFdBQUEsQ0FBQW1JLFNBQUEsQ0FUQTtBQUFBLG9CQVVBLElBQUFnSSxRQUFBLEVBQUE7QUFBQSx3QkFDQSxJQUFBOUksVUFBQSxHQUFBek0sSUFBQSxDQUFBcVgsU0FBQSxFQUFBN0gsS0FBQSxDQUFBLElBQUEsRUFBQTVMLEdBQUEsQ0FBQSxVQUFBckQsQ0FBQSxFQUFBO0FBQUEsNEJBQ0EsT0FBQTtBQUFBLGdDQUFBcVUsRUFBQTtBQUFBLGdDQUFBclUsQ0FBQTtBQUFBLDZCQUFBLENBREE7QUFBQSx5QkFBQSxFQUVBdUQsT0FGQSxFQUFBLENBREE7QUFBQSxxQkFBQSxNQUlBO0FBQUEsd0JBQ0EsSUFBQTJJLFVBQUEsR0FBQSxDQUFBO0FBQUEsZ0NBQUFtSSxFQUFBO0FBQUEsZ0NBQUF3QyxRQUFBLENBQUF6WCxFQUFBO0FBQUEsNkJBQUEsQ0FBQSxDQURBO0FBQUEscUJBZEE7QUFBQSxvQkFpQkEyTCxXQUFBLENBQUF4QyxLQUFBLENBQUE4SyxLQUFBLENBQUFyRyxTQUFBLEdBQUEsR0FBQSxHQUFBK0osTUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBN0ssVUFBQSxFQUFBQSxVQUFBLEVBQUEsRUFqQkE7QUFBQSxpQkFBQSxDQXhEQTtBQUFBLGdCQTRFQW1ILEtBQUEsQ0FBQTFWLFNBQUEsQ0FBQXFaLGFBQUEsR0FBQSxVQUFBSCxRQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBN0IsUUFBQSxHQUFBLEtBQUEsQ0FEQTtBQUFBLG9CQUVBLElBQUFYLEVBQUEsR0FBQSxLQUFBalYsRUFBQSxDQUZBO0FBQUEsb0JBR0EsSUFBQTBYLFNBQUEsR0FBQSxFQUFBLENBSEE7QUFBQSxvQkFJQSxJQUFBRCxRQUFBLENBQUFoUyxXQUFBLENBQUExRixJQUFBLElBQUEsT0FBQSxFQUFBO0FBQUEsd0JBQ0E2VixRQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsd0JBRUE4QixTQUFBLEdBQUFELFFBQUEsQ0FGQTtBQUFBLHdCQUdBQSxRQUFBLEdBQUFDLFNBQUEsQ0FBQSxDQUFBLENBQUEsQ0FIQTtBQUFBLHFCQUpBO0FBQUEsb0JBU0EsSUFBQUMsTUFBQSxHQUFBRixRQUFBLENBQUFoUyxXQUFBLENBQUFtSSxTQUFBLENBVEE7QUFBQSxvQkFVQSxJQUFBdEIsU0FBQSxHQUFBMkgsS0FBQSxDQUFBckcsU0FBQSxHQUFBLEdBQUEsR0FBQStKLE1BQUEsQ0FWQTtBQUFBLG9CQVdBLElBQUEvQixRQUFBLEVBQUE7QUFBQSx3QkFDQSxJQUFBaUMsSUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLHdCQUVBLElBQUF2TCxTQUFBLElBQUF3TCxTQUFBLEVBQUE7QUFBQSw0QkFDQUQsSUFBQSxHQUFBeFgsSUFBQSxDQUFBcVgsU0FBQSxFQUFBN0gsS0FBQSxDQUFBLElBQUEsRUFBQVosVUFBQSxDQUFBNU8sSUFBQSxDQUFBeVgsU0FBQSxDQUFBeEwsU0FBQSxFQUFBLENBQUEsRUFBQWhMLEdBQUEsQ0FBQSxLQUFBdEIsRUFBQSxDQUFBLENBQUEsRUFBQW1FLE9BQUEsRUFBQSxDQURBO0FBQUEseUJBRkE7QUFBQSx3QkFLQW1JLFNBQUEsR0FBQXFMLE1BQUEsR0FBQSxHQUFBLEdBQUExRCxLQUFBLENBQUFyRyxTQUFBLENBTEE7QUFBQSx3QkFNQSxJQUFBdEIsU0FBQSxJQUFBd0wsU0FBQSxFQUFBO0FBQUEsNEJBQ0FELElBQUEsR0FBQXhYLElBQUEsQ0FBQXFYLFNBQUEsRUFBQTdILEtBQUEsQ0FBQSxJQUFBLEVBQUFaLFVBQUEsQ0FBQTVPLElBQUEsQ0FBQXlYLFNBQUEsQ0FBQXhMLFNBQUEsRUFBQSxDQUFBLEVBQUFoTCxHQUFBLENBQUEsS0FBQXRCLEVBQUEsQ0FBQSxDQUFBLEVBQUFtRSxPQUFBLEVBQUEsQ0FEQTtBQUFBLHlCQU5BO0FBQUEsd0JBU0EsSUFBQTBULElBQUEsQ0FBQWpULE1BQUEsRUFBQTtBQUFBLDRCQUNBLElBQUFrSSxVQUFBLEdBQUF6TSxJQUFBLENBQUF3WCxJQUFBLEVBQUE1VCxHQUFBLENBQUEsVUFBQXJELENBQUEsRUFBQTtBQUFBLGdDQUNBLE9BQUE7QUFBQSxvQ0FBQXFVLEVBQUE7QUFBQSxvQ0FBQXJVLENBQUE7QUFBQSxpQ0FBQSxDQURBO0FBQUEsNkJBQUEsRUFFQXVELE9BRkEsRUFBQSxDQURBO0FBQUEsNEJBSUE0VCxRQUFBLENBQUE5RCxLQUFBLENBQUFyRyxTQUFBLEVBQUErSixNQUFBLEdBQUEsT0FBQSxFQUFBLEVBQUE3SyxVQUFBLEVBQUFBLFVBQUEsRUFBQSxFQUFBLFVBQUExSyxJQUFBLEVBQUE7QUFBQSw2QkFBQSxFQUpBO0FBQUEseUJBVEE7QUFBQSxxQkFBQSxNQWdCQTtBQUFBLHdCQUNBLElBQUFrSyxTQUFBLElBQUFpRyxNQUFBLENBQUF2RyxRQUFBLElBQUEzTCxJQUFBLENBQUFrUyxNQUFBLENBQUF2RyxRQUFBLENBQUFNLFNBQUEsRUFBQSxRQUFBM04sS0FBQSxDQUFBMkYsVUFBQSxDQUFBcVQsTUFBQSxDQUFBLEVBQUFGLFFBQUEsQ0FBQXpYLEVBQUEsQ0FBQSxFQUFBK1AsSUFBQSxDQUFBLElBQUEsQ0FBQSxFQUFBO0FBQUEsNEJBQ0EsT0FEQTtBQUFBLHlCQURBO0FBQUEsd0JBSUFwRSxXQUFBLENBQUF4QyxLQUFBLENBQUE4SyxLQUFBLENBQUFyRyxTQUFBLEdBQUEsR0FBQSxHQUFBK0osTUFBQSxHQUFBLE9BQUEsRUFBQTtBQUFBLDRCQUFBN0ssVUFBQSxFQUFBLENBQUE7QUFBQSxvQ0FBQSxLQUFBOU0sRUFBQTtBQUFBLG9DQUFBeVgsUUFBQSxDQUFBelgsRUFBQTtBQUFBLGlDQUFBLENBQUE7QUFBQSx5QkFBQSxFQUpBO0FBQUEscUJBM0JBO0FBQUEsaUJBQUEsQ0E1RUE7QUFBQSxhQWhVQTtBQUFBLFlBK2FBMkwsV0FBQSxDQUFBMUwsSUFBQSxDQUFBLFdBQUEsRUFBQWdVLEtBQUEsRUEvYUE7QUFBQSxZQWdiQXRJLFdBQUEsQ0FBQTFMLElBQUEsQ0FBQSxlQUFBZ1UsS0FBQSxDQUFBckcsU0FBQSxFQWhiQTtBQUFBLFlBaWJBLE9BQUFxRyxLQUFBLENBamJBO0FBQUEsU0FBQSxDQXRIQTtBQUFBLFFBMGlCQSxLQUFBbEgsT0FBQSxHQUFBLFVBQUEzSyxJQUFBLEVBQUEwRSxRQUFBLEVBQUE7QUFBQSxZQUVBO0FBQUEsWUFBQTdFLE9BQUEsQ0FBQW1KLElBQUEsQ0FBQSxTQUFBLEVBRkE7QUFBQSxZQUdBLElBQUEsT0FBQWhKLElBQUEsSUFBQSxRQUFBLEVBQUE7QUFBQSxnQkFDQUgsT0FBQSxDQUFBRCxHQUFBLENBQUEsVUFBQUksSUFBQSxHQUFBLHlCQUFBLEVBREE7QUFBQSxnQkFFQSxJQUFBMEUsUUFBQSxFQUFBO0FBQUEsb0JBQ0EsT0FBQUEsUUFBQSxDQUFBMUUsSUFBQSxDQUFBLENBREE7QUFBQSxpQkFGQTtBQUFBLGdCQUtBLE9BTEE7QUFBQSxhQUhBO0FBQUEsWUFXQTtBQUFBLGdCQUFBLFlBQUFBLElBQUEsRUFBQTtBQUFBLGdCQUFBLE9BQUFBLElBQUEsQ0FBQTRWLE1BQUEsQ0FBQTtBQUFBLGFBWEE7QUFBQSxZQVlBLElBQUFDLEtBQUEsR0FBQTdWLElBQUEsQ0FBQTZWLEtBQUEsQ0FaQTtBQUFBLFlBYUEsSUFBQUMsTUFBQSxHQUFBOVYsSUFBQSxDQUFBOFYsTUFBQSxDQWJBO0FBQUEsWUFjQSxJQUFBQyxVQUFBLEdBQUEvVixJQUFBLENBQUErVixVQUFBLENBZEE7QUFBQSxZQWVBLElBQUEvSixXQUFBLEdBQUFoTSxJQUFBLENBQUFnTSxXQUFBLENBZkE7QUFBQSxZQWdCQSxJQUFBbUksRUFBQSxHQUFBblUsSUFBQSxDQUFBbVUsRUFBQSxDQWhCQTtBQUFBLFlBaUJBLE9BQUFuVSxJQUFBLENBQUE2VixLQUFBLENBakJBO0FBQUEsWUFrQkEsT0FBQTdWLElBQUEsQ0FBQThWLE1BQUEsQ0FsQkE7QUFBQSxZQW1CQSxPQUFBOVYsSUFBQSxDQUFBK1YsVUFBQSxDQW5CQTtBQUFBLFlBb0JBLE9BQUEvVixJQUFBLENBQUFnTSxXQUFBLENBcEJBO0FBQUEsWUFxQkEsT0FBQWhNLElBQUEsQ0FBQW1VLEVBQUEsQ0FyQkE7QUFBQSxZQXNCQSxJQUFBLENBQUFBLEVBQUEsRUFBQTtBQUFBLGdCQUFBQSxFQUFBLEdBQUEsRUFBQSxDQUFBO0FBQUEsYUF0QkE7QUFBQSxZQXlCQTtBQUFBLFlBQUFuVSxJQUFBLEdBQUEvQixJQUFBLENBQUErQixJQUFBLEVBQUE0QyxNQUFBLENBQUEsVUFBQXpFLENBQUEsRUFBQUMsQ0FBQSxFQUFBO0FBQUEsZ0JBQ0EsT0FBQSxDQUFBLGNBQUFELENBQUEsQ0FBQSxJQUFBQyxDQUFBLElBQUE2UixVQUFBLENBREE7QUFBQSxhQUFBLEVBRUFwRSxRQUZBLEVBQUEsQ0F6QkE7QUFBQSxZQTZCQSxJQUFBLFNBQUE3TCxJQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBMkosR0FBQSxHQUFBM0osSUFBQSxDQUFBMkosR0FBQSxDQURBO0FBQUEsZ0JBRUEsT0FBQTNKLElBQUEsQ0FBQSxLQUFBLENBQUEsQ0FGQTtBQUFBLGFBN0JBO0FBQUEsWUFpQ0EvQixJQUFBLENBQUErQixJQUFBLEVBQUE5QixJQUFBLENBQUEsVUFBQThCLElBQUEsRUFBQXdMLFNBQUEsRUFBQTtBQUFBLGdCQUNBakMsV0FBQSxDQUFBK0IsUUFBQSxDQUFBRSxTQUFBLEVBQUEsVUFBQTdJLEtBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFxVCxVQUFBLEdBQUFyVCxLQUFBLENBREE7QUFBQSxvQkFFQSxJQUFBM0MsSUFBQSxDQUFBNFQsT0FBQSxJQUFBNVQsSUFBQSxDQUFBNFQsT0FBQSxDQUFBcFIsTUFBQSxHQUFBLENBQUEsSUFBQXhDLElBQUEsQ0FBQTRULE9BQUEsQ0FBQSxDQUFBLEVBQUF2USxXQUFBLElBQUF4RyxLQUFBLEVBQUE7QUFBQSx3QkFDQW1ELElBQUEsQ0FBQTRULE9BQUEsR0FBQTNWLElBQUEsQ0FBQStCLElBQUEsQ0FBQTRULE9BQUEsRUFBQS9SLEdBQUEsQ0FBQSxVQUFBckQsQ0FBQSxFQUFBO0FBQUEsNEJBQ0EsT0FBQVAsSUFBQSxDQUFBK1gsVUFBQSxDQUFBL0QsV0FBQSxFQUFBZ0UsR0FBQSxDQUFBelgsQ0FBQSxFQUFBcU4sUUFBQSxFQUFBLENBREE7QUFBQSx5QkFBQSxFQUVBOUosT0FGQSxFQUFBLENBREE7QUFBQSxxQkFGQTtBQUFBLG9CQU9BLElBQUE2UixPQUFBLEdBQUEzVixJQUFBLENBQUErQixJQUFBLENBQUE0VCxPQUFBLENBQUEsQ0FQQTtBQUFBLG9CQVFBLElBQUFzQyxPQUFBLEdBQUFsVyxJQUFBLENBQUFrVyxPQUFBLENBUkE7QUFBQSxvQkFTQSxJQUFBMUssU0FBQSxJQUFBMkksRUFBQSxFQUFBO0FBQUEsd0JBQ0EsSUFBQWdDLEdBQUEsR0FBQWhDLEVBQUEsQ0FBQTNJLFNBQUEsQ0FBQSxDQURBO0FBQUEsd0JBRUF2TixJQUFBLENBQUEyVixPQUFBLEVBQUExVixJQUFBLENBQUEsVUFBQWtZLE1BQUEsRUFBQTtBQUFBLDRCQUNBLElBQUFBLE1BQUEsQ0FBQXhZLEVBQUEsSUFBQXVZLEdBQUEsRUFBQTtBQUFBLGdDQUNBbFksSUFBQSxDQUFBa1ksR0FBQSxDQUFBQyxNQUFBLENBQUF4WSxFQUFBLENBQUEsRUFBQU0sSUFBQSxDQUFBLFVBQUFDLENBQUEsRUFBQUMsQ0FBQSxFQUFBO0FBQUEsb0NBQ0FnWSxNQUFBLENBQUFoWSxDQUFBLElBQUFELENBQUEsQ0FEQTtBQUFBLGlDQUFBLEVBREE7QUFBQSw2QkFEQTtBQUFBLHlCQUFBLEVBRkE7QUFBQSxxQkFUQTtBQUFBLG9CQXFCQTtBQUFBLHdCQUFBa1ksSUFBQSxHQUFBN0YsUUFBQSxDQUFBaEYsU0FBQSxDQUFBLENBckJBO0FBQUEsb0JBc0JBLElBQUE4SyxLQUFBLEdBQUFELElBQUEsQ0FBQXRULE1BQUEsQ0F0QkE7QUFBQSxvQkF5QkE7QUFBQSx3QkFBQW1ULE9BQUEsRUFBQTtBQUFBLHdCQUNBQSxPQUFBLENBQUFqWixPQUFBLENBQUEsVUFBQXVCLENBQUEsRUFBQTtBQUFBLDRCQUNBLE9BQUE4WCxLQUFBLENBQUE5WCxDQUFBLENBQUEsQ0FEQTtBQUFBLHlCQUFBLEVBREE7QUFBQSxxQkF6QkE7QUFBQSxvQkFtQ0E7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHdCQUFBSCxHQUFBLEdBQUF1VixPQUFBLENBQUFXLE9BQUEsQ0FBQSxJQUFBLENBQUEsQ0FuQ0E7QUFBQSxvQkFvQ0EsSUFBQWdDLEVBQUEsR0FBQWxZLEdBQUEsQ0FBQTZGLElBQUEsRUFBQSxDQXBDQTtBQUFBLG9CQXFDQSxJQUFBc1MsSUFBQSxHQUFBRCxFQUFBLENBQUExSixVQUFBLENBQUF3SixJQUFBLENBQUFuUyxJQUFBLEdBQUFyQyxHQUFBLENBQUEsVUFBQXJELENBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUFpSCxRQUFBLENBQUFqSCxDQUFBLENBQUEsQ0FEQTtBQUFBLHFCQUFBLENBQUEsQ0FBQSxDQXJDQTtBQUFBLG9CQXdDQSxJQUFBaVksT0FBQSxHQUFBRixFQUFBLENBQUExSixVQUFBLENBQUEySixJQUFBLENBQUEsQ0F4Q0E7QUFBQSxvQkEwQ0E7QUFBQSxvQkFBQUMsT0FBQSxHQUFBQSxPQUFBLENBQUE3VCxNQUFBLENBQUEsVUFBQXBFLENBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUEsQ0FBQWpDLEtBQUEsQ0FBQWtILE1BQUEsQ0FBQXBGLEdBQUEsQ0FBQWEsR0FBQSxDQUFBVixDQUFBLENBQUEsRUFBQTZYLElBQUEsQ0FBQW5YLEdBQUEsQ0FBQVYsQ0FBQSxFQUFBb1UsS0FBQSxFQUFBLENBQUEsQ0FEQTtBQUFBLHFCQUFBLEVBRUE3USxPQUZBLEVBQUEsQ0ExQ0E7QUFBQSxvQkE4Q0E7QUFBQSx3QkFBQW9QLEtBQUEsR0FBQW5SLElBQUEsQ0FBQTZKLFdBQUEsR0FBQTVMLElBQUEsQ0FBQStCLElBQUEsQ0FBQTZKLFdBQUEsQ0FBQSxHQUFBNUwsSUFBQSxDQUFBLEVBQUEsQ0FBQSxDQTlDQTtBQUFBLG9CQStDQSxJQUFBeVksVUFBQSxHQUFBRixJQUFBLENBQUEzVSxHQUFBLENBQUEsVUFBQXJELENBQUEsRUFBQTtBQUFBLHdCQUNBLE9BQUEsSUFBQXdYLFVBQUEsQ0FBQTNYLEdBQUEsQ0FBQWEsR0FBQSxDQUFBVixDQUFBLENBQUEsRUFBQTJTLEtBQUEsQ0FBQWpTLEdBQUEsQ0FBQVYsQ0FBQSxDQUFBLENBQUEsQ0FEQTtBQUFBLHFCQUFBLENBQUEsQ0EvQ0E7QUFBQSxvQkF3REE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHdCQUFBd00sT0FBQSxHQUFBLEVBQUEsQ0F4REE7QUFBQSxvQkEyREE7QUFBQTtBQUFBLHdCQUFBMkwsZUFBQSxHQUFBMVksSUFBQSxDQUFBMEUsS0FBQSxDQUFBcUgsVUFBQSxFQUFBbkksR0FBQSxDQUFBLFVBQUF6RCxDQUFBLEVBQUE7QUFBQSx3QkFBQSxPQUFBO0FBQUEsNEJBQUFBLENBQUE7QUFBQSw0QkFBQSxDQUFBO0FBQUEseUJBQUEsQ0FBQTtBQUFBLHFCQUFBLEVBQUF5TixRQUFBLEVBQUEsQ0EzREE7QUFBQSxvQkE0REE0SyxPQUFBLENBQUF4WixPQUFBLENBQUEsVUFBQXVCLENBQUEsRUFBQTtBQUFBLHdCQUNBLElBQUFvWSxPQUFBLEdBQUFOLEtBQUEsQ0FBQTlYLENBQUEsQ0FBQSxDQURBO0FBQUEsd0JBRUEsSUFBQXFZLE9BQUEsR0FBQUQsT0FBQSxDQUFBNUQsSUFBQSxFQUFBLENBRkE7QUFBQSx3QkFHQSxJQUFBOEQsT0FBQSxHQUFBelksR0FBQSxDQUFBYSxHQUFBLENBQUFWLENBQUEsQ0FBQSxDQUhBO0FBQUEsd0JBT0E7QUFBQSx3QkFBQVAsSUFBQSxDQUFBMEUsS0FBQSxDQUFBUSxNQUFBLEVBQUFqRixJQUFBLENBQUEsVUFBQStFLEtBQUEsRUFBQTJJLFNBQUEsRUFBQTtBQUFBLDRCQUNBLFFBQUEzSSxLQUFBLENBQUFHLElBQUE7QUFBQSw0QkFDQSxLQUFBLFdBQUEsRUFBQTtBQUFBLG9DQUNBd1QsT0FBQSxDQUFBLE1BQUFoTCxTQUFBLElBQUFrTCxPQUFBLENBQUFsTCxTQUFBLENBQUEsQ0FEQTtBQUFBLG9DQUdBO0FBQUEsb0NBQUFnTCxPQUFBLENBQUFoTCxTQUFBLElBQUFtTCxHQUFBLENBSEE7QUFBQSxvQ0FJQSxNQUpBO0FBQUEsaUNBQUE7QUFBQSxnQ0FLQSxDQU5BO0FBQUEsNEJBT0EsS0FBQSxNQUFBLEVBQUE7QUFBQSxvQ0FBQUgsT0FBQSxDQUFBaEwsU0FBQSxJQUFBLElBQUEzRyxJQUFBLENBQUE2UixPQUFBLENBQUFsTCxTQUFBLElBQUEsSUFBQSxDQUFBLENBQUE7QUFBQSxvQ0FBQSxNQUFBO0FBQUEsaUNBQUE7QUFBQSxnQ0FBQSxDQVBBO0FBQUEsNEJBUUEsS0FBQSxVQUFBLEVBQUE7QUFBQSxvQ0FBQWdMLE9BQUEsQ0FBQWhMLFNBQUEsSUFBQSxJQUFBM0csSUFBQSxDQUFBNlIsT0FBQSxDQUFBbEwsU0FBQSxJQUFBLElBQUEsQ0FBQSxDQUFBO0FBQUEsb0NBQUEsTUFBQTtBQUFBLGlDQUFBO0FBQUEsZ0NBQUEsQ0FSQTtBQUFBLDRCQVNBLEtBQUEsU0FBQSxFQUFBO0FBQUEsb0NBQ0EsUUFBQWtMLE9BQUEsQ0FBQWxMLFNBQUEsQ0FBQTtBQUFBLG9DQUNBLEtBQUEsSUFBQSxFQUFBO0FBQUEsNENBQUFnTCxPQUFBLENBQUFoTCxTQUFBLElBQUEsSUFBQSxDQUFBO0FBQUEsNENBQUEsTUFBQTtBQUFBLHlDQUFBO0FBQUEsd0NBQUEsQ0FEQTtBQUFBLG9DQUVBLEtBQUEsR0FBQSxFQUFBO0FBQUEsNENBQUFnTCxPQUFBLENBQUFoTCxTQUFBLElBQUEsSUFBQSxDQUFBO0FBQUEsNENBQUEsTUFBQTtBQUFBLHlDQUFBO0FBQUEsd0NBQUEsQ0FGQTtBQUFBLG9DQUdBLEtBQUEsR0FBQSxFQUFBO0FBQUEsNENBQUFnTCxPQUFBLENBQUFoTCxTQUFBLElBQUEsS0FBQSxDQUFBO0FBQUEsNENBQUEsTUFBQTtBQUFBLHlDQUFBO0FBQUEsd0NBQUEsQ0FIQTtBQUFBLG9DQUlBLEtBQUEsSUFBQSxFQUFBO0FBQUEsNENBQUFnTCxPQUFBLENBQUFoTCxTQUFBLElBQUEsSUFBQSxDQUFBO0FBQUEsNENBQUEsTUFBQTtBQUFBLHlDQUFBO0FBQUEsd0NBQUEsQ0FKQTtBQUFBLG9DQUtBLEtBQUEsS0FBQSxFQUFBO0FBQUEsNENBQUFnTCxPQUFBLENBQUFoTCxTQUFBLElBQUEsS0FBQSxDQUFBO0FBQUEsNENBQUEsTUFBQTtBQUFBLHlDQUFBO0FBQUEsd0NBQUEsQ0FMQTtBQUFBLHFDQURBO0FBQUEsb0NBUUEsTUFSQTtBQUFBLGlDQUFBO0FBQUEsZ0NBU0EsQ0FsQkE7QUFBQSw0QkFtQkEsU0FBQTtBQUFBLG9DQUFBZ0wsT0FBQSxDQUFBaEwsU0FBQSxJQUFBa0wsT0FBQSxDQUFBbEwsU0FBQSxDQUFBLENBQUE7QUFBQSxpQ0FuQkE7QUFBQTtBQURBLHlCQUFBLEVBUEE7QUFBQSx3QkErQkFaLE9BQUEsQ0FBQXRPLElBQUEsQ0FBQTtBQUFBLDRCQUFBb2EsT0FBQTtBQUFBLDRCQUFBRCxPQUFBO0FBQUEseUJBQUEsRUEvQkE7QUFBQSxxQkFBQSxFQTVEQTtBQUFBLG9CQStGQTtBQUFBLHdCQUFBN0wsT0FBQSxDQUFBeEksTUFBQSxFQUFBO0FBQUEsd0JBQ0ErRyxXQUFBLENBQUExTCxJQUFBLENBQUEsYUFBQTJOLFNBQUEsRUFBQVIsT0FBQSxFQURBO0FBQUEscUJBL0ZBO0FBQUEsb0JBbUdBO0FBQUEsd0JBQUFnTSxFQUFBLEdBQUFOLFVBQUEsQ0FBQTNVLE9BQUEsRUFBQSxDQW5HQTtBQUFBLG9CQW9HQTlELElBQUEsQ0FBQStZLEVBQUEsRUFBQTlZLElBQUEsQ0FBQSxVQUFBTSxDQUFBLEVBQUE7QUFBQSx3QkFDQThYLEtBQUEsQ0FBQTlYLENBQUEsQ0FBQVosRUFBQSxJQUFBWSxDQUFBLENBREE7QUFBQSxxQkFBQSxFQXBHQTtBQUFBLG9CQXdHQTtBQUFBLG9CQUFBUCxJQUFBLENBQUFnUyxVQUFBLENBQUF6RSxTQUFBLEVBQUF4QixVQUFBLEVBQUE5TCxJQUFBLENBQUEsVUFBQXVXLEdBQUEsRUFBQTtBQUFBLHdCQUNBOUUsTUFBQSxDQUFBbkUsU0FBQSxHQUFBLEdBQUEsR0FBQWlKLEdBQUEsSUFBQW5MLEdBQUEsQ0FBQWtDLFNBQUEsRUFBQWtILE9BQUEsQ0FBQSxNQUFBK0IsR0FBQSxDQUFBLENBREE7QUFBQSxxQkFBQSxFQXhHQTtBQUFBLG9CQTRHQTtBQUFBLHdCQUFBdUMsRUFBQSxDQUFBeFUsTUFBQTtBQUFBLHdCQUNBK0csV0FBQSxDQUFBMUwsSUFBQSxDQUFBLFNBQUEyTixTQUFBLEVBQUF2TixJQUFBLENBQUErWSxFQUFBLENBQUEsRUFBQWhYLElBQUEsQ0FBQWlYLFlBQUEsRUE3R0E7QUFBQSxvQkE4R0EsSUFBQWYsT0FBQSxFQUFBO0FBQUEsd0JBQ0EzTSxXQUFBLENBQUExTCxJQUFBLENBQUEsYUFBQTJOLFNBQUEsRUFBQTBLLE9BQUEsRUFEQTtBQUFBLHFCQTlHQTtBQUFBLG9CQWtIQTtBQUFBLG9CQUFBM00sV0FBQSxDQUFBMUwsSUFBQSxDQUFBLGNBQUEyTixTQUFBLEVBbEhBO0FBQUEsaUJBQUEsRUFEQTtBQUFBLGFBQUEsRUFqQ0E7QUFBQSxZQTRMQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxnQkFBQTdCLEdBQUEsRUFBQTtBQUFBLGdCQUNBSixXQUFBLENBQUEyTixNQUFBLENBQUF2TixHQUFBLEVBREE7QUFBQSxhQTVMQTtBQUFBLFlBK0xBLElBQUFxQyxXQUFBLEVBQUE7QUFBQSxnQkFDQXpDLFdBQUEsQ0FBQXdDLGNBQUEsQ0FBQUMsV0FBQSxFQURBO0FBQUEsYUEvTEE7QUFBQSxZQW1NQSxJQUFBdEgsUUFBQSxFQUFBO0FBQUEsZ0JBQ0FBLFFBQUEsQ0FBQTFFLElBQUEsRUFEQTtBQUFBLGFBbk1BO0FBQUEsWUFzTUF1SixXQUFBLENBQUExTCxJQUFBLENBQUEsVUFBQSxFQXRNQTtBQUFBLFNBQUEsQ0ExaUJBO0FBQUEsUUFrdkJBLEtBQUFrTyxjQUFBLEdBQUEsVUFBQS9MLElBQUEsRUFBQTtBQUFBLFlBQ0EvQixJQUFBLENBQUErQixJQUFBLEVBQUE5QixJQUFBLENBQUEsVUFBQUMsQ0FBQSxFQUFBMk4sWUFBQSxFQUFBO0FBQUEsZ0JBQ0E3TixJQUFBLENBQUFFLENBQUEsQ0FBQSxDQUFBLENBQUEsRUFBQUQsSUFBQSxDQUFBLFVBQUFpWixHQUFBLEVBQUF2WixFQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBa08sWUFBQSxJQUFBeEMsR0FBQSxJQUFBMUwsRUFBQSxJQUFBMEwsR0FBQSxDQUFBd0MsWUFBQSxFQUFBL0ksTUFBQSxFQUFBO0FBQUEsd0JBQ0F1RyxHQUFBLENBQUF3QyxZQUFBLEVBQUE1TSxHQUFBLENBQUF0QixFQUFBLEVBQUF5VSxZQUFBLEdBQUFwVSxJQUFBLENBQUFrWixHQUFBLEVBQUF0VixHQUFBLENBQUEsVUFBQXJELENBQUEsRUFBQTtBQUFBLDRCQUNBLE9BQUE7QUFBQSxnQ0FBQUEsQ0FBQTtBQUFBLGdDQUFBLElBQUE7QUFBQSw2QkFBQSxDQURBO0FBQUEseUJBQUEsRUFFQXFOLFFBRkEsRUFBQSxDQURBO0FBQUEscUJBREE7QUFBQSxpQkFBQSxFQURBO0FBQUEsZ0JBUUEsSUFBQTVOLElBQUEsQ0FBQUUsQ0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBd0QsSUFBQSxFQUFBLEVBQUE7QUFBQSxvQkFDQTRILFdBQUEsQ0FBQTFMLElBQUEsQ0FBQSx3QkFBQWlPLFlBQUEsRUFBQTdOLElBQUEsQ0FBQUUsQ0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBK0YsSUFBQSxHQUFBbkMsT0FBQSxFQUFBLEVBREE7QUFBQSxpQkFSQTtBQUFBLGFBQUEsRUFEQTtBQUFBLFlBYUEsS0FBQWxFLElBQUEsQ0FBQSxvQkFBQSxFQWJBO0FBQUEsU0FBQSxDQWx2QkE7QUFBQSxRQW13QkEsS0FBQXFaLE1BQUEsR0FBQSxVQUFBdk4sR0FBQSxFQUFBO0FBQUEsWUFDQTFMLElBQUEsQ0FBQTBMLEdBQUEsRUFBQXpMLElBQUEsQ0FBQSxVQUFBOEIsSUFBQSxFQUFBa0ssU0FBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQU4sUUFBQSxHQUFBdUcsTUFBQSxDQUFBdkcsUUFBQSxDQUFBTSxTQUFBLENBQUEsQ0FEQTtBQUFBLGdCQUVBak0sSUFBQSxDQUFBK0IsSUFBQSxFQUFBOUIsSUFBQSxDQUFBLFVBQUFrWixDQUFBLEVBQUE7QUFBQSxvQkFDQW5aLElBQUEsQ0FBQW1aLENBQUEsRUFBQWxaLElBQUEsQ0FBQSxVQUFBOEIsSUFBQSxFQUFBcVgsSUFBQSxFQUFBO0FBQUEsd0JBQ0F6TixRQUFBLENBQUF5TixJQUFBLEVBQUFyWCxJQUFBLEVBREE7QUFBQSxxQkFBQSxFQURBO0FBQUEsaUJBQUEsRUFGQTtBQUFBLGdCQU9BdUosV0FBQSxDQUFBMUwsSUFBQSxDQUFBLGNBQUEsRUFQQTtBQUFBLGdCQVFBMEwsV0FBQSxDQUFBMUwsSUFBQSxDQUFBLGtCQUFBcU0sU0FBQSxFQVJBO0FBQUEsYUFBQSxFQURBO0FBQUEsU0FBQSxDQW53QkE7QUFBQSxRQWd4QkEsS0FBQXdCLEtBQUEsR0FBQSxVQUFBRixTQUFBLEVBQUE1SSxNQUFBLEVBQUEwVSxRQUFBLEVBQUE1UyxRQUFBLEVBQUE7QUFBQSxZQUVBO0FBQUE7QUFBQSxnQkFBQThHLFNBQUEsSUFBQWdFLGtCQUFBLEVBQUE7QUFBQSxnQkFDQTVLLFVBQUEsQ0FBQSxZQUFBO0FBQUEsb0JBQ0EyRSxXQUFBLENBQUFtQyxLQUFBLENBQUFGLFNBQUEsRUFBQTVJLE1BQUEsRUFBQTBVLFFBQUEsRUFBQTVTLFFBQUEsRUFEQTtBQUFBLGlCQUFBLEVBRUEsR0FGQSxFQURBO0FBQUEsYUFBQSxNQUlBO0FBQUEsZ0JBRUE7QUFBQSxnQkFBQTZFLFdBQUEsQ0FBQStCLFFBQUEsQ0FBQUUsU0FBQSxFQUFBLFVBQUE3SSxLQUFBLEVBQUE7QUFBQSxvQkFFQTtBQUFBLHdCQUFBNEcsV0FBQSxDQUFBdkQsVUFBQSxDQUFBUSxZQUFBLENBQUF1QixnQkFBQSxFQUFBO0FBQUEsd0JBR0E7QUFBQSx3QkFBQW5GLE1BQUEsR0FBQTRHLFNBQUEsQ0FBQTVHLE1BQUEsQ0FBQUQsS0FBQSxFQUFBQyxNQUFBLENBQUEsQ0FIQTtBQUFBLHdCQU1BO0FBQUEsNEJBQUFBLE1BQUEsRUFBQTtBQUFBLDRCQUdBO0FBQUE7QUFBQSw0QkFBQTRNLGtCQUFBLENBQUFoRSxTQUFBLElBQUEsSUFBQSxDQUhBO0FBQUEsNEJBSUFqQyxXQUFBLENBQUF4QyxLQUFBLENBQUF5RSxTQUFBLEdBQUEsT0FBQSxFQUFBLEVBQUE1SSxNQUFBLEVBQUFBLE1BQUEsRUFBQSxFQUNBbUIsSUFEQSxDQUNBLFVBQUEvRCxJQUFBLEVBQUE7QUFBQSxnQ0FDQXVKLFdBQUEsQ0FBQW9CLE9BQUEsQ0FBQTNLLElBQUEsRUFBQTBFLFFBQUEsRUFEQTtBQUFBLGdDQUlBO0FBQUEsdUNBQUE4SyxrQkFBQSxDQUFBaEUsU0FBQSxDQUFBLENBSkE7QUFBQSw2QkFEQSxFQU1BLFVBQUFqSixHQUFBLEVBQUE7QUFBQSxnQ0FFQTtBQUFBLHVDQUFBaU4sa0JBQUEsQ0FBQWhFLFNBQUEsQ0FBQSxDQUZBO0FBQUEsNkJBTkEsRUFKQTtBQUFBLHlCQUFBLE1BY0E7QUFBQSw0QkFDQTlHLFFBQUEsSUFBQUEsUUFBQSxFQUFBLENBREE7QUFBQSx5QkFwQkE7QUFBQSx3QkF1QkEsT0FBQTlCLE1BQUEsQ0F2QkE7QUFBQSxxQkFBQSxNQXdCQTtBQUFBLHdCQUNBLEtBQUFtRSxLQUFBLENBQUF5RSxTQUFBLEdBQUEsT0FBQSxFQUFBK0wsUUFBQSxFQUFBLFVBQUF2WCxJQUFBLEVBQUE7QUFBQSw0QkFDQSxJQUFBLENBQUE0QyxNQUFBLEVBQUE7QUFBQSxnQ0FDQTRVLE9BQUEsQ0FBQXpVLE1BQUEsQ0FBQXJHLElBQUEsQ0FBQThPLFNBQUEsRUFEQTtBQUFBLDZCQURBO0FBQUEsNEJBSUFqQyxXQUFBLENBQUFvQixPQUFBLENBQUEzSyxJQUFBLEVBQUEwRSxRQUFBLEVBSkE7QUFBQSx5QkFBQSxFQURBO0FBQUEscUJBMUJBO0FBQUEsaUJBQUEsQ0FrQ0FsRixJQWxDQSxDQWtDQSxJQWxDQSxDQUFBLEVBRkE7QUFBQSxhQU5BO0FBQUEsU0FBQSxDQWh4QkE7QUFBQSxRQTh6QkEsS0FBQU4sR0FBQSxHQUFBLFVBQUFzTSxTQUFBLEVBQUFKLEdBQUEsRUFBQTFHLFFBQUEsRUFBQTtBQUFBLFlBSUE7QUFBQTtBQUFBLGdCQUFBMEcsR0FBQSxDQUFBL0gsV0FBQSxLQUFBeEcsS0FBQSxFQUFBO0FBQUEsZ0JBQ0F1TyxHQUFBLEdBQUEsQ0FBQUEsR0FBQSxDQUFBLENBREE7QUFBQSxhQUpBO0FBQUEsWUFRQTtBQUFBLFlBQUE3QixXQUFBLENBQUFtQyxLQUFBLENBQUFGLFNBQUEsRUFBQSxFQUFBNU4sRUFBQSxFQUFBd04sR0FBQSxFQUFBLEVBQUEsSUFBQSxFQUFBLFlBQUE7QUFBQSxnQkFDQSxJQUFBN0ksR0FBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLGdCQUVBLElBQUE4VCxJQUFBLEdBQUEvTSxHQUFBLENBQUFrQyxTQUFBLENBQUEsQ0FGQTtBQUFBLGdCQUdBLFNBQUE1TixFQUFBLElBQUF3TixHQUFBLEVBQUE7QUFBQSxvQkFDQTdJLEdBQUEsQ0FBQTdGLElBQUEsQ0FBQTJaLElBQUEsQ0FBQXRULE1BQUEsQ0FBQXFJLEdBQUEsQ0FBQXhOLEVBQUEsQ0FBQSxDQUFBLEVBREE7QUFBQSxpQkFIQTtBQUFBLGdCQU1BOEcsUUFBQSxDQUFBbkMsR0FBQSxFQU5BO0FBQUEsYUFBQSxFQVJBO0FBQUEsU0FBQSxDQTl6QkE7QUFBQSxRQWcxQkEsS0FBQWtWLFFBQUEsR0FBQSxVQUFBelgsSUFBQSxFQUFBO0FBQUEsWUFDQSxTQUFBd0wsU0FBQSxJQUFBeEwsSUFBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQTJDLEtBQUEsR0FBQTNDLElBQUEsQ0FBQXdMLFNBQUEsQ0FBQSxDQURBO0FBQUEsZ0JBRUF2SCxZQUFBLENBQUEsaUJBQUF1SCxTQUFBLElBQUE1SyxJQUFBLENBQUFnQixTQUFBLENBQUE1QixJQUFBLENBQUEsQ0FGQTtBQUFBLGdCQUdBaVEsVUFBQSxDQUFBekUsU0FBQSxJQUFBOEYsY0FBQSxDQUFBM08sS0FBQSxDQUFBLENBSEE7QUFBQSxnQkFJQSxJQUFBLENBQUEsQ0FBQTZJLFNBQUEsSUFBQWxDLEdBQUEsQ0FBQSxFQUFBO0FBQUEsb0JBQ0FBLEdBQUEsQ0FBQWtDLFNBQUEsSUFBQXZOLElBQUEsQ0FBQSxFQUFBLENBQUEsQ0FEQTtBQUFBLGlCQUpBO0FBQUEsYUFEQTtBQUFBLFNBQUEsQ0FoMUJBO0FBQUEsUUEyMUJBLEtBQUFxTixRQUFBLEdBQUEsVUFBQUUsU0FBQSxFQUFBOUcsUUFBQSxFQUFBO0FBQUEsWUFDQSxJQUFBbkMsR0FBQSxHQUFBME4sVUFBQSxDQUFBekUsU0FBQSxDQUFBLENBREE7QUFBQSxZQUVBLElBQUFqSixHQUFBLEVBQUE7QUFBQSxnQkFDQW1DLFFBQUEsSUFBQUEsUUFBQSxDQUFBbkMsR0FBQSxDQUFBLENBREE7QUFBQSxhQUFBLE1BRUE7QUFBQSxnQkFDQSxJQUFBLENBQUEsQ0FBQWlKLFNBQUEsSUFBQWdFLGtCQUFBLENBQUEsRUFBQTtBQUFBLG9CQUNBLElBQUFoRSxTQUFBLElBQUEwRSxZQUFBLEVBQUE7QUFBQSx3QkFDQSxPQURBO0FBQUEscUJBREE7QUFBQSxvQkFJQSxJQUFBd0gsUUFBQSxHQUFBLGlCQUFBbE0sU0FBQSxDQUpBO0FBQUEsb0JBS0EsSUFBQWtNLFFBQUEsSUFBQXpULFlBQUEsRUFBQTtBQUFBLHdCQUNBLEtBQUF3VCxRQUFBLENBQUE3VyxJQUFBLENBQUFDLEtBQUEsQ0FBQW9ELFlBQUEsQ0FBQXlULFFBQUEsQ0FBQSxDQUFBLEVBREE7QUFBQSx3QkFFQWhULFFBQUEsSUFBQUEsUUFBQSxDQUFBdUwsVUFBQSxDQUFBekUsU0FBQSxDQUFBLENBQUEsQ0FGQTtBQUFBLHFCQUFBLE1BR0E7QUFBQSx3QkFDQWdFLGtCQUFBLENBQUFoRSxTQUFBLElBQUEsSUFBQSxDQURBO0FBQUEsd0JBRUEsS0FBQXpFLEtBQUEsQ0FBQXlFLFNBQUEsR0FBQSxXQUFBLEVBQUEsSUFBQSxFQUFBLFVBQUF4TCxJQUFBLEVBQUE7QUFBQSw0QkFDQXVKLFdBQUEsQ0FBQWtPLFFBQUEsQ0FBQXpYLElBQUEsRUFEQTtBQUFBLDRCQUVBMEUsUUFBQSxJQUFBQSxRQUFBLENBQUF1TCxVQUFBLENBQUF6RSxTQUFBLENBQUEsQ0FBQSxDQUZBO0FBQUEsNEJBR0EsT0FBQWdFLGtCQUFBLENBQUFoRSxTQUFBLENBQUEsQ0FIQTtBQUFBLHlCQUFBLEVBSUEsVUFBQXhMLElBQUEsRUFBQTtBQUFBLDRCQUNBLEtBQUEyWCxhQUFBLENBQUFoYixNQUFBLENBQUE2TyxTQUFBLEVBREE7QUFBQSw0QkFFQTBFLFlBQUEsQ0FBQTFFLFNBQUEsSUFBQSxJQUFBLENBRkE7QUFBQSx5QkFKQSxFQUZBO0FBQUEscUJBUkE7QUFBQSxpQkFBQSxNQW1CQTtBQUFBLG9CQUVBO0FBQUEsb0JBQUE1RyxVQUFBLENBQUEsWUFBQTtBQUFBLHdCQUNBMkUsV0FBQSxDQUFBK0IsUUFBQSxDQUFBRSxTQUFBLEVBQUE5RyxRQUFBLEVBREE7QUFBQSxxQkFBQSxFQUVBLEdBRkEsRUFGQTtBQUFBLGlCQXBCQTtBQUFBLGFBSkE7QUFBQSxTQUFBLENBMzFCQTtBQUFBLFFBMjNCQSxLQUFBa1QsZUFBQSxHQUFBLFVBQUFwTSxTQUFBLEVBQUExSCxTQUFBLEVBQUE7QUFBQSxZQUNBLElBQUFwRSxHQUFBLEdBQUFuRCxLQUFBLENBQUFDLElBQUEsQ0FBQXNILFNBQUEsQ0FBQSxDQURBO0FBQUEsWUFFQSxJQUFBLENBQUEsQ0FBQTBILFNBQUEsSUFBQW9FLGVBQUEsQ0FBQTtBQUFBLGdCQUFBQSxlQUFBLENBQUFwRSxTQUFBLElBQUEsSUFBQXhQLE9BQUEsRUFBQSxDQUZBO0FBQUEsWUFHQSxJQUFBLENBQUEsQ0FBQXdQLFNBQUEsSUFBQXFFLGtCQUFBLENBQUE7QUFBQSxnQkFBQUEsa0JBQUEsQ0FBQXJFLFNBQUEsSUFBQSxFQUFBLENBSEE7QUFBQSxZQUlBLElBQUE5TCxHQUFBLElBQUFtUSxrQkFBQSxDQUFBckUsU0FBQSxDQUFBLEVBQUE7QUFBQSxnQkFDQSxPQURBO0FBQUEsYUFBQSxNQUVBO0FBQUEsZ0JBQ0FxRSxrQkFBQSxDQUFBckUsU0FBQSxFQUFBOUwsR0FBQSxJQUFBLElBQUEsQ0FEQTtBQUFBLGFBTkE7QUFBQSxZQVNBLElBQUE4TCxTQUFBLElBQUF5RSxVQUFBLEVBQUE7QUFBQSxnQkFDQW5NLFNBQUEsQ0FBQW1NLFVBQUEsQ0FBQXpFLFNBQUEsQ0FBQSxFQURBO0FBQUEsYUFBQSxNQUVBO0FBQUEsZ0JBQ0FvRSxlQUFBLENBQUFwRSxTQUFBLEVBQUFwUCxVQUFBLENBQUEwSCxTQUFBLEVBREE7QUFBQSxhQVhBO0FBQUEsU0FBQSxDQTMzQkE7QUFBQSxRQTA0QkEsS0FBQStULHVCQUFBLEdBQUEsVUFBQXJNLFNBQUEsRUFBQXNNLFVBQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQUMsV0FBQSxHQUFBLFVBQUFwVixLQUFBLEVBQUFtVixVQUFBLEVBQUE7QUFBQSxnQkFDQUEsVUFBQSxDQUFBN2EsT0FBQSxDQUFBLFVBQUErYSxHQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBdFksR0FBQSxHQUFBLFFBQUFpRCxLQUFBLENBQUE2SSxTQUFBLEdBQUEsR0FBQSxHQUFBd00sR0FBQSxDQURBO0FBQUEsb0JBRUEsSUFBQUMsS0FBQSxHQUFBLE9BQUFELEdBQUEsQ0FGQTtBQUFBLG9CQUdBdFEsTUFBQSxDQUFBOEcsY0FBQSxDQUFBN0wsS0FBQSxDQUFBeEcsU0FBQSxFQUFBNmIsR0FBQSxFQUFBO0FBQUEsd0JBQ0E5WSxHQUFBLEVBQUEsWUFBQTtBQUFBLDRCQUNBLElBQUEsQ0FBQSxDQUFBK1ksS0FBQSxJQUFBLElBQUEsQ0FBQSxFQUFBO0FBQUEsZ0NBQ0EsSUFBQTlaLENBQUEsR0FBQThGLFlBQUEsQ0FBQXZFLEdBQUEsR0FBQSxLQUFBOUIsRUFBQSxDQUFBLENBREE7QUFBQSxnQ0FFQSxLQUFBcWEsS0FBQSxJQUFBOVosQ0FBQSxHQUFBeUMsSUFBQSxDQUFBQyxLQUFBLENBQUExQyxDQUFBLENBQUEsR0FBQSxJQUFBLENBRkE7QUFBQSw2QkFEQTtBQUFBLDRCQUtBLE9BQUEsS0FBQThaLEtBQUEsQ0FBQSxDQUxBO0FBQUEseUJBREE7QUFBQSx3QkFRQUMsR0FBQSxFQUFBLFVBQUE1SixLQUFBLEVBQUE7QUFBQSw0QkFDQSxLQUFBMkosS0FBQSxJQUFBM0osS0FBQSxDQURBO0FBQUEsNEJBRUFySyxZQUFBLENBQUF2RSxHQUFBLEdBQUEsS0FBQTlCLEVBQUEsSUFBQWdELElBQUEsQ0FBQWdCLFNBQUEsQ0FBQTBNLEtBQUEsQ0FBQSxDQUZBO0FBQUEseUJBUkE7QUFBQSxxQkFBQSxFQUhBO0FBQUEsaUJBQUEsRUFEQTtBQUFBLGFBQUEsQ0FEQTtBQUFBLFlBb0JBLElBQUEsQ0FBQSxDQUFBOUMsU0FBQSxJQUFBc0Usb0JBQUEsQ0FBQSxFQUFBO0FBQUEsZ0JBQUFBLG9CQUFBLENBQUF0RSxTQUFBLElBQUEsRUFBQSxDQUFBO0FBQUEsYUFwQkE7QUFBQSxZQXFCQSxJQUFBMk0sS0FBQSxHQUFBckksb0JBQUEsQ0FBQXRFLFNBQUEsQ0FBQSxDQXJCQTtBQUFBLFlBc0JBLElBQUFzTSxVQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBTSxRQUFBLEdBQUFuYSxJQUFBLENBQUE2WixVQUFBLEVBQUFqTCxVQUFBLENBQUFzTCxLQUFBLEVBQUFwVyxPQUFBLEVBQUEsQ0FEQTtBQUFBLGFBQUEsTUFFQTtBQUFBLGdCQUNBLElBQUFxVyxRQUFBLEdBQUFELEtBQUEsQ0FEQTtBQUFBLGFBeEJBO0FBQUEsWUEyQkEsSUFBQUMsUUFBQSxDQUFBNVYsTUFBQSxFQUFBO0FBQUEsZ0JBQ0EsSUFBQWdKLFNBQUEsSUFBQXlFLFVBQUEsRUFBQTtBQUFBLG9CQUNBOEgsV0FBQSxDQUFBOUgsVUFBQSxDQUFBekUsU0FBQSxDQUFBLEVBQUE0TSxRQUFBLEVBREE7QUFBQSxpQkFEQTtBQUFBLGdCQUlBLElBQUFOLFVBQUEsRUFBQTtBQUFBLG9CQUNBamIsS0FBQSxDQUFBVixTQUFBLENBQUFPLElBQUEsQ0FBQVMsS0FBQSxDQUFBZ2IsS0FBQSxFQUFBQyxRQUFBLEVBREE7QUFBQSxpQkFKQTtBQUFBLGFBM0JBO0FBQUEsU0FBQSxDQTE0QkE7QUFBQSxRQTg2QkEsS0FBQTFhLEVBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQWlGLEtBQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQUEsS0FBQSxDQUFBNkksU0FBQSxJQUFBb0UsZUFBQSxFQUFBO0FBQUEsZ0JBQ0FBLGVBQUEsQ0FBQWpOLEtBQUEsQ0FBQTZJLFNBQUEsRUFBQTdPLE1BQUEsQ0FBQXNULFVBQUEsQ0FBQXROLEtBQUEsQ0FBQTZJLFNBQUEsQ0FBQSxFQURBO0FBQUEsYUFEQTtBQUFBLFlBSUEsSUFBQTdJLEtBQUEsQ0FBQTZJLFNBQUEsSUFBQXNFLG9CQUFBLEVBQUE7QUFBQSxnQkFDQXZHLFdBQUEsQ0FBQXNPLHVCQUFBLENBQUFsVixLQUFBLENBQUE2SSxTQUFBLEVBREE7QUFBQSxhQUpBO0FBQUEsU0FBQSxFQTk2QkE7QUFBQSxRQXU3QkEsS0FBQTZNLEtBQUEsR0FBQSxVQUFBN00sU0FBQSxFQUFBNUksTUFBQSxFQUFBMFUsUUFBQSxFQUFBNVMsUUFBQSxFQUFBO0FBQUEsWUFDQSxJQUFBckgsR0FBQSxHQUFBLElBQUEsQ0FEQTtBQUFBLFlBRUEsS0FBQWlPLFFBQUEsQ0FBQUUsU0FBQSxFQUFBLFVBQUE3SSxLQUFBLEVBQUE7QUFBQSxnQkFFQTtBQUFBLGdCQUFBQyxNQUFBLEdBQUEzRSxJQUFBLENBQUEyRSxNQUFBLEVBQUFmLEdBQUEsQ0FBQSxVQUFBMUQsQ0FBQSxFQUFBQyxDQUFBLEVBQUE7QUFBQSxvQkFBQSxPQUFBO0FBQUEsd0JBQUFBLENBQUE7QUFBQSx3QkFBQXZCLEtBQUEsQ0FBQXFHLE9BQUEsQ0FBQS9FLENBQUEsSUFBQUEsQ0FBQSxHQUFBLENBQUFBLENBQUEsQ0FBQTtBQUFBLHFCQUFBLENBQUE7QUFBQSxpQkFBQSxFQUFBME4sUUFBQSxFQUFBLENBRkE7QUFBQSxnQkFHQSxJQUFBeU0sY0FBQSxHQUFBL2IsS0FBQSxDQUFBbUcsVUFBQSxDQUFBQyxLQUFBLEVBQUFDLE1BQUEsQ0FBQSxDQUhBO0FBQUEsZ0JBSUEsSUFBQXZFLEdBQUEsR0FBQW1TLFFBQUEsQ0FBQWhGLFNBQUEsQ0FBQSxDQUpBO0FBQUEsZ0JBS0FuTyxHQUFBLENBQUFxTyxLQUFBLENBQUFGLFNBQUEsRUFBQTVJLE1BQUEsRUFBQTBVLFFBQUEsRUFBQSxVQUFBalIsQ0FBQSxFQUFBO0FBQUEsb0JBQ0EzQixRQUFBLENBQUFyRyxHQUFBLENBQUF1RSxNQUFBLENBQUEwVixjQUFBLEVBQUF4TixNQUFBLEdBQUEvSSxPQUFBLEVBQUEsRUFEQTtBQUFBLGlCQUFBLEVBTEE7QUFBQSxhQUFBLEVBRkE7QUFBQSxTQUFBLENBdjdCQTtBQUFBLFFBbThCQSxLQUFBcVEsTUFBQSxHQUFBLFVBQUE1RyxTQUFBLEVBQUFKLEdBQUEsRUFBQTFHLFFBQUEsRUFBQTtBQUFBLFlBQ0EsT0FBQSxLQUFBcUMsS0FBQSxDQUFBeUUsU0FBQSxHQUFBLFNBQUEsRUFBQSxFQUFBNU4sRUFBQSxFQUFBd04sR0FBQSxFQUFBLEVBQUExRyxRQUFBLENBQUEsQ0FEQTtBQUFBLFNBQUEsQ0FuOEJBO0FBQUEsUUF1OEJBLEtBQUEwRCxPQUFBLEdBQUEsVUFBQTFELFFBQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQSxLQUFBc0IsVUFBQSxDQUFBYyxVQUFBLEVBQUE7QUFBQSxnQkFDQXBDLFFBQUEsR0FEQTtBQUFBLGFBQUEsTUFFQTtBQUFBLGdCQUNBLEtBQUFzQixVQUFBLENBQUFvQyxPQUFBLENBQUExRCxRQUFBLEVBREE7QUFBQSxhQUhBO0FBQUEsU0FBQSxDQXY4QkE7QUFBQSxLQUFBLEM7SUFnOUJBLFNBQUE2VCxVQUFBLENBQUF6UyxRQUFBLEVBQUEwUyxTQUFBLEVBQUE7QUFBQSxRQUNBLEtBQUFDLElBQUEsR0FBQSxJQUFBM0osT0FBQSxDQUFBLElBQUF2UyxLQUFBLENBQUFtSyxpQkFBQSxDQUFBWixRQUFBLEVBQUEwUyxTQUFBLENBQUEsRUFBQSxJQUFBLENBQUEsQ0FEQTtBQUFBLFFBRUEsS0FBQTlhLEVBQUEsR0FBQSxLQUFBK2EsSUFBQSxDQUFBL2EsRUFBQSxDQUFBOEIsSUFBQSxDQUFBLEtBQUFpWixJQUFBLENBQUEsQ0FGQTtBQUFBLFFBR0EsS0FBQTVhLElBQUEsR0FBQSxLQUFBNGEsSUFBQSxDQUFBNWEsSUFBQSxDQUFBMkIsSUFBQSxDQUFBLEtBQUFpWixJQUFBLENBQUEsQ0FIQTtBQUFBLFFBSUEsS0FBQTFhLE1BQUEsR0FBQSxLQUFBMGEsSUFBQSxDQUFBMWEsTUFBQSxDQUFBeUIsSUFBQSxDQUFBLEtBQUFpWixJQUFBLENBQUEsQ0FKQTtBQUFBLFFBS0EsS0FBQS9aLElBQUEsR0FBQSxLQUFBK1osSUFBQSxDQUFBL1osSUFBQSxDQUxBO0FBQUEsUUFNQSxLQUFBa1osZUFBQSxHQUFBLEtBQUFhLElBQUEsQ0FBQWIsZUFBQSxDQUFBcFksSUFBQSxDQUFBLEtBQUFpWixJQUFBLENBQUEsQ0FOQTtBQUFBLFFBT0EsS0FBQVosdUJBQUEsR0FBQSxLQUFBWSxJQUFBLENBQUFaLHVCQUFBLENBQUFyWSxJQUFBLENBQUEsS0FBQWlaLElBQUEsQ0FBQSxDQVBBO0FBQUEsUUFRQSxLQUFBbGMsS0FBQSxHQUFBQSxLQUFBLENBUkE7QUFBQSxRQVNBLEtBQUEyTCxNQUFBLEdBQUEsS0FBQXVRLElBQUEsQ0FBQXpTLFVBQUEsQ0FBQWtDLE1BQUEsQ0FBQTFJLElBQUEsQ0FBQSxLQUFBaVosSUFBQSxDQUFBelMsVUFBQSxDQUFBLENBVEE7QUFBQSxLO0lBWUF1UyxVQUFBLENBQUFwYyxTQUFBLENBQUFpTSxPQUFBLEdBQUEsWUFBQTtBQUFBLFFBQ0EsSUFBQXBDLFVBQUEsR0FBQSxLQUFBeVMsSUFBQSxDQUFBelMsVUFBQSxDQURBO0FBQUEsUUFFQSxPQUFBLElBQUE1RixPQUFBLENBQUEsVUFBQXNFLFFBQUEsRUFBQXBFLE1BQUEsRUFBQTtBQUFBLFlBQ0EwRixVQUFBLENBQUFvQyxPQUFBLENBQUExRCxRQUFBLEVBREE7QUFBQSxTQUFBLENBQUEsQ0FGQTtBQUFBLEtBQUEsQztJQU9BNlQsVUFBQSxDQUFBcGMsU0FBQSxDQUFBd0wsS0FBQSxHQUFBLFVBQUFDLFFBQUEsRUFBQUMsUUFBQSxFQUFBO0FBQUEsUUFDQSxPQUFBLElBQUF6SCxPQUFBLENBQUEsVUFBQUMsTUFBQSxFQUFBQyxNQUFBLEVBQUE7QUFBQSxZQUNBLEtBQUFtWSxJQUFBLENBQUF6UyxVQUFBLENBQUEyQixLQUFBLENBQUFDLFFBQUEsRUFBQUMsUUFBQSxFQUFBeEgsTUFBQSxFQURBO0FBQUEsU0FBQSxDQUVBYixJQUZBLENBRUEsSUFGQSxDQUFBLENBQUEsQ0FEQTtBQUFBLEtBQUEsQztJQU9BK1ksVUFBQSxDQUFBcGMsU0FBQSxDQUFBK0wsTUFBQSxHQUFBLFVBQUFuSSxHQUFBLEVBQUE7QUFBQSxRQUNBLE9BQUEsS0FBQTBZLElBQUEsQ0FBQXpTLFVBQUEsQ0FBQWtDLE1BQUEsRUFBQSxDQURBO0FBQUEsS0FBQSxDO0lBSUFxUSxVQUFBLENBQUFwYyxTQUFBLENBQUF1YyxRQUFBLEdBQUEsVUFBQWxOLFNBQUEsRUFBQTtBQUFBLFFBQ0EsSUFBQTNNLElBQUEsR0FBQSxJQUFBLENBREE7QUFBQSxRQUVBLE9BQUEsSUFBQXVCLE9BQUEsQ0FBQSxVQUFBQyxNQUFBLEVBQUFDLE1BQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQTtBQUFBLGdCQUNBekIsSUFBQSxDQUFBNFosSUFBQSxDQUFBclEsT0FBQSxDQUFBLFlBQUE7QUFBQSxvQkFDQXZKLElBQUEsQ0FBQTRaLElBQUEsQ0FBQW5OLFFBQUEsQ0FBQUUsU0FBQSxFQUFBbkwsTUFBQSxFQURBO0FBQUEsaUJBQUEsRUFEQTtBQUFBLGFBQUEsQ0FJQSxPQUFBZ0csQ0FBQSxFQUFBO0FBQUEsZ0JBQ0EvRixNQUFBLENBQUErRixDQUFBLEVBREE7QUFBQSxhQUxBO0FBQUEsU0FBQSxDQUFBLENBRkE7QUFBQSxLQUFBLEM7SUFhQWtTLFVBQUEsQ0FBQXBjLFNBQUEsQ0FBQStDLEdBQUEsR0FBQSxVQUFBc00sU0FBQSxFQUFBSixHQUFBLEVBQUE7QUFBQSxRQUNBLElBQUF2TSxJQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsUUFFQSxJQUFBc08sTUFBQSxHQUFBLEtBQUEsQ0FGQTtBQUFBLFFBR0EsSUFBQXdMLE9BQUEsR0FBQW5OLFNBQUEsQ0FIQTtBQUFBLFFBSUEsSUFBQTVJLE1BQUEsQ0FKQTtBQUFBLFFBS0EsSUFBQSxPQUFBd0ksR0FBQSxLQUFBLFFBQUEsRUFBQTtBQUFBLFlBQ0ErQixNQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsWUFFQXZLLE1BQUEsR0FBQSxFQUFBaEYsRUFBQSxFQUFBLENBQUF3TixHQUFBLENBQUEsRUFBQSxDQUZBO0FBQUEsU0FBQSxNQUdBLElBQUF2TyxLQUFBLENBQUFxRyxPQUFBLENBQUFrSSxHQUFBLENBQUEsRUFBQTtBQUFBLFlBQ0F4SSxNQUFBLEdBQUEsRUFBQWhGLEVBQUEsRUFBQXdOLEdBQUEsRUFBQSxDQURBO0FBQUEsU0FBQSxNQUVBLElBQUEsT0FBQUEsR0FBQSxLQUFBLFFBQUEsRUFBQTtBQUFBLFlBQ0F4SSxNQUFBLEdBQUF3SSxHQUFBLENBREE7QUFBQSxTQUFBLE1BRUEsSUFBQUEsR0FBQSxLQUFBLElBQUEsRUFBQTtBQUFBLFlBQ0F4SSxNQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsU0FaQTtBQUFBLFFBZUEsT0FBQSxJQUFBeEMsT0FBQSxDQUFBLFVBQUFDLE1BQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsWUFDQSxJQUFBO0FBQUEsZ0JBQ0F6QixJQUFBLENBQUE0WixJQUFBLENBQUFyUSxPQUFBLENBQUEsWUFBQTtBQUFBLG9CQUNBdkosSUFBQSxDQUFBNFosSUFBQSxDQUFBSixLQUFBLENBQUE3TSxTQUFBLEVBQUE1SSxNQUFBLEVBQUEsSUFBQSxFQUFBLFVBQUE1QyxJQUFBLEVBQUE7QUFBQSx3QkFDQSxJQUFBbU4sTUFBQSxFQUFBO0FBQUEsNEJBQ0E5TSxNQUFBLENBQUFMLElBQUEsQ0FBQXdDLE1BQUEsR0FBQXhDLElBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxJQUFBLEVBREE7QUFBQSx5QkFBQSxNQUVBO0FBQUEsNEJBQ0FLLE1BQUEsQ0FBQUwsSUFBQSxFQURBO0FBQUEseUJBSEE7QUFBQSxxQkFBQSxFQURBO0FBQUEsaUJBQUEsRUFEQTtBQUFBLGFBQUEsQ0FVQSxPQUFBcUcsQ0FBQSxFQUFBO0FBQUEsZ0JBQ0EvRixNQUFBLENBQUErRixDQUFBLEVBREE7QUFBQSxhQVhBO0FBQUEsU0FBQSxDQUFBLENBZkE7QUFBQSxLQUFBLEM7SUFxREE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFrUyxVQUFBLENBQUFwYyxTQUFBLENBQUFpVyxNQUFBLEdBQUEsVUFBQTVHLFNBQUEsRUFBQUosR0FBQSxFQUFBO0FBQUEsUUFDQSxJQUFBdk0sSUFBQSxHQUFBLElBQUEsQ0FEQTtBQUFBLFFBRUEsT0FBQSxJQUFBdUIsT0FBQSxDQUFBLFVBQUFDLE1BQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsWUFDQSxJQUFBO0FBQUEsZ0JBQ0F6QixJQUFBLENBQUE0WixJQUFBLENBQUFyUSxPQUFBLENBQUEsWUFBQTtBQUFBLG9CQUNBdkosSUFBQSxDQUFBNFosSUFBQSxDQUFBckcsTUFBQSxDQUFBNUcsU0FBQSxFQUFBSixHQUFBLEVBQUEvSyxNQUFBLEVBREE7QUFBQSxpQkFBQSxFQURBO0FBQUEsYUFBQSxDQUlBLE9BQUFnRyxDQUFBLEVBQUE7QUFBQSxnQkFDQS9GLE1BQUEsQ0FBQStGLENBQUEsRUFEQTtBQUFBLGFBTEE7QUFBQSxTQUFBLENBQUEsQ0FGQTtBQUFBLEtBQUEsQztJQWFBa1MsVUFBQSxDQUFBcGMsU0FBQSxDQUFBeWMsYUFBQSxHQUFBLFlBQUE7QUFBQSxRQUNBLElBQUEvWixJQUFBLEdBQUEsSUFBQSxDQURBO0FBQUEsUUFFQSxJQUFBLEtBQUE0WixJQUFBLENBQUF6UyxVQUFBLENBQUFRLFlBQUEsQ0FBQWUsT0FBQTtBQUFBLFlBQ0EsT0FBQSxLQUFBckksR0FBQSxDQUFBLFdBQUEsRUFBQSxLQUFBdVosSUFBQSxDQUFBelMsVUFBQSxDQUFBUSxZQUFBLENBQUFlLE9BQUEsQ0FBQSxDQURBO0FBQUEsYUFFQTtBQUFBLFlBQ0EsT0FBQSxJQUFBbkgsT0FBQSxDQUFBLFVBQUFDLE1BQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsZ0JBQ0F6QixJQUFBLENBQUFILElBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQW1hLElBQUEsRUFBQTtBQUFBLG9CQUNBaGEsSUFBQSxDQUFBSyxHQUFBLENBQUEsV0FBQSxFQUFBMlosSUFBQSxFQUFBOVUsSUFBQSxDQUFBMUQsTUFBQSxFQURBO0FBQUEsaUJBQUEsRUFEQTtBQUFBLGFBQUEsQ0FBQSxDQURBO0FBQUEsU0FKQTtBQUFBLEtBQUEsQztJQWFBa1ksVUFBQSxDQUFBcGMsU0FBQSxDQUFBMmMsZUFBQSxHQUFBLFVBQUEvWSxHQUFBLEVBQUFDLElBQUEsRUFBQTtBQUFBLFFBQ0EsT0FBQSxLQUFBeVksSUFBQSxDQUFBMVIsS0FBQSxDQUFBaEgsR0FBQSxFQUFBQyxJQUFBLENBQUEsQ0FEQTtBQUFBLEtBQUEsQztJQUlBdVksVUFBQSxDQUFBcGMsU0FBQSxDQUFBd0wsS0FBQSxHQUFBLFVBQUFDLFFBQUEsRUFBQUMsUUFBQSxFQUFBO0FBQUEsUUFDQSxPQUFBLEtBQUE0USxJQUFBLENBQUF6UyxVQUFBLENBQUEyQixLQUFBLENBQUFDLFFBQUEsRUFBQUMsUUFBQSxDQUFBLENBREE7QUFBQSxLQUFBLEMiLCJmaWxlIjoicnd0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBIYW5kbGVyKCl7XG4gICAgdGhpcy5oYW5kbGVycyA9IFtdO1xuICAgIHRoaXMuc3RySGFuZGxlcnMgPSB7fTtcbn07XG5cbkhhbmRsZXIucHJvdG90eXBlLmFkZEhhbmRsZXIgPSBmdW5jdGlvbiAoaGFuZGxlcil7XG4gICAgdmFyIHN0ckhhbmRsZXIgPSB1dGlscy5oYXNoKGhhbmRsZXIudG9TdHJpbmcoKSk7XG4gICAgaWYgKCEoc3RySGFuZGxlciBpbiB0aGlzLnN0ckhhbmRsZXJzKSl7XG4gICAgICAgIHRoaXMuc3RySGFuZGxlcnNbc3RySGFuZGxlcl0gPSBoYW5kbGVyO1xuICAgICAgICB0aGlzLmhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfVxufTtcbkhhbmRsZXIucHJvdG90eXBlLmhhbmRsZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMCk7XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KG51bGwsYXJncyk7XG4gICAgfSlcbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGVCeSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSk7XG4gICAgdmFyIHRocyA9IGFyZ3VtZW50c1swXTtcbiAgICB0aGlzLmhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oZnVuYyl7XG4gICAgICAgIGZ1bmMuYXBwbHkodGhzLGFyZ3MpO1xuICAgIH0pXG59O1xuXG5cbmZ1bmN0aW9uIE5hbWVkRXZlbnRNYW5hZ2VyICgpe1xuICAgIHZhciBldmVudHMgPSB7fTtcbiAgICB2YXIgaGFuZGxlcklkID0ge307XG4gICAgdmFyIGlkeElkID0gMDtcbiAgICB0aGlzLm9uID0gZnVuY3Rpb24obmFtZSwgZnVuYyl7XG4gICAgICAgIGlmICghKG5hbWUgaW4gZXZlbnRzKSl7XG4gICAgICAgICAgICBldmVudHNbbmFtZV0gPSBuZXcgQXJyYXkoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWQgPSBpZHhJZCArKztcbiAgICAgICAgZXZlbnRzW25hbWVdLnB1c2goZnVuYyk7XG4gICAgICAgIGhhbmRsZXJJZFtpZF0gPSBmdW5jO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfTtcbiAgICB0aGlzLmVtaXQgPSBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgaWYgKG5hbWUgaW4gZXZlbnRzKXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICAgICAgICAgIGV2ZW50LmFwcGx5KG51bGwsYXJncyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy51bmJpbmQgPSBmdW5jdGlvbihoYW5kbGVyKXtcbiAgICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgICAgaWYgKGhhbmRsZXIgaW4gaGFuZGxlcklkKXtcbiAgICAgICAgICAgIHZhciBmdW5jID0gaGFuZGxlcklkW2hhbmRsZXIgKyAnJ107XG4gICAgICAgICAgICBMYXp5KGV2ZW50cykuZWFjaChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBuIGluIHYpe1xuICAgICAgICAgICAgICAgICAgICBpZiAodltuXSA9PT0gZnVuYyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHgucHVzaChuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWR4LnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICB2LnNwbGljZSh4LDEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGhhbmRsZXJJZFtoYW5kbGVyXTtcbiAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ2FsbCBldmVudCBvbmNlXG4gICAgICovXG4gICAgdGhpcy5vbmNlID0gZnVuY3Rpb24oZXZlbnROYW1lLCBoYW5kbGVyRnVuY3Rpb24pIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgaGFuZGxlciA9IHRoaXMub24oZXZlbnROYW1lLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaGFuZGxlckZ1bmN0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBzZWxmLnVuYmluZChoYW5kbGVyKTtcbiAgICAgICAgfSlcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjYWNoZWRLZXlJZHggPSAwO1xuXG52YXIgbnVsbFN0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJyd9O1xuXG5mdW5jdGlvbiBtb2NrT2JqZWN0KCl7XG4gICAgcmV0dXJuIG5ldyBQcm94eSh7fSwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBuYW1lICA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgIGlmIChuYW1lID09PSAndG9TdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsU3RyaW5nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1dGlscy5tb2NrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtuYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG59XG5cbi8qXG52YXIgJFBPU1QgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGNhbGxCYWNrLCBlcnJvckJhY2ssaGVhZGVycyl7XG4gICAgdmFyIG9wdHMgPSB7XG4gICAgICAgIGFjY2VwdHMgOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIHVybCA6IHVybCxcbiAgICAgICAgZGF0YSA6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICBkYXRhVHlwZSA6ICdqc29uJyxcbiAgICAgICAgc3VjY2VzcyA6IGNhbGxCYWNrLFxuICAgICAgICBlcnJvciA6IGVycm9yQmFjayxcbiAgICAgICAgbWV0aG9kIDogJ1BPU1QnLFxuICAgICAgICBjb250ZW50VHlwZSA6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIH07XG4gICAgaWYgKGhlYWRlcnMpe1xuICAgICAgICBvcHRzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgICAgICBvcHRzLmNyb3NzRG9tYWluID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuICQuYWpheChvcHRzKTtcbn1cblxuXG5mdW5jdGlvbiByZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgZ2V0TG9naW4pe1xuICAgIC8vIG1haW4gXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZ2V0TG9naW4gPSBnZXRMb2dpbjtcbiAgICB0aGlzLmV2ZW50cyA9IG5ldyBOYW1lZEV2ZW50TWFuYWdlcigpXG4gICAgdGhpcy4kUE9TVCA9ICRQT1NULmJpbmQodGhpcyk7XG4gICAgdGhpcy5vcHRpb25zID0ge2VuZFBvaW50IDogZW5kUG9pbnR9O1xuICAgIHRoaXMub24gPSB0aGlzLmV2ZW50cy5vbi5iaW5kKHRoaXMpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHN0YXR1cywgY2FsbEJhY2ssIGVycm9yKSB7XG4gICAgaWYgKHN0YXR1cykge1xuICAgICAgICB2YXIgaXNMb2dnZWQgPSAoc3RhdHVzLnVzZXJfaWQgJiYgIXRoaXMub3B0aW9ucy51c2VyX2lkICk7XG4gICAgICAgIGZvciAodmFyIHggaW4gc3RhdHVzKXsgdGhpcy5vcHRpb25zW3hdID0gc3RhdHVzW3hdOyB9XG4gICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgaWYgKGlzTG9nZ2VkKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50cy5lbWl0KCdsb2dpbicsIHRoaXMub3B0aW9ucy51c2VyX2lkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VyX2lkICYmIHRoaXMuZ2V0TG9naW4pe1xuICAgICAgICB2YXIgbG9nSW5mbyA9IHRoaXMuZ2V0TG9naW4oZXJyb3IpO1xuICAgICAgICBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KXtcbiAgICAgICAgICAgIHRoaXMubG9naW4obG9nSW5mby51c2VybmFtZSwgbG9nSW5mby5wYXNzd29yZClcbiAgICAgICAgICAgIC50aGVuKChmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHN0YXR1cywgY2FsbEJhY2spO1xuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH0gZWxzZSBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gUHJvbWlzZSkge1xuICAgICAgICAgICAgbG9nSW5mby50aGVuKChmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgICAgIHZhciB4ID0gdGhpcy5sb2dpbihvYmoudXNlcm5hbWUsb2JqLnBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICB2YXIgbWFuYWdlRXJyb3IgPSAoZnVuY3Rpb24oYmFkKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMobnVsbCxjYWxsQmFjayxiYWQuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pLmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKXtcbiAgICAgICAgICAgICAgICAgICAgeC50aGVuKGNhbGxCYWNrLG1hbmFnZUVycm9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB4LnRoZW4obnVsbCwgbWFuYWdlRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sodGhpcy5vcHRpb25zKTtcbiAgICB9ICAgIFxufVxuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuc3RhdHVzID0gZnVuY3Rpb24oY2FsbEJhY2ssIGZvcmNlKXtcbiAgICBpZiAoKCdsYXN0UldUU3RhdHVzJyBpbiBsb2NhbFN0b3JhZ2UpICYmICFmb3JjZSkge1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICB2YXIgc3RhdHVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhzdGF0dXMsY2FsbEJhY2spO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YXR1cyhjYWxsQmFjaywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9zdGF0dXNfY2FsbGluZyl7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuc3RhdHVzKGNhbGxCYWNrKTtcbiAgICAgICAgfSw1MCk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnRpbWVzdGFtcCl7XG4gICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHRoaXMub3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhdHVzX2NhbGxpbmcgPSB0cnVlO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiB0aGlzLiRwb3N0KCdhcGkvc3RhdHVzJyxudWxsLGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG4gICAgICAgICAgICBzZWxmLl9zdGF0dXNfY2FsbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi51cGRhdGVTdGF0dXMoc3RhdHVzLGNhbGxCYWNrKTtcbiAgICAgICAgfSk7ICAgICAgICBcbiAgICB9XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuJHBvc3QgPSBmdW5jdGlvbih1cmwsIGRhdGEsY2FsbEJhY2spe1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnRva2VuKXtcbiAgICAgICAgaWYgKCFkYXRhKXtcbiAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnRva2VuKXtcbiAgICAgICAgdmFyIGhlYWRlcnMgPSB7IFxuICAgICAgICAgICAgdG9rZW4gOiB0aGlzLm9wdGlvbnMudG9rZW4sXG4gICAgICAgICAgICBhcHBsaWNhdGlvbiA6IHRoaXMub3B0aW9ucy5hcHBsaWNhdGlvblxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBoZWFkZXJzID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLm9wdGlvbnMuZW5kUG9pbnQgKyB1cmwsIGRhdGEsIHRocy5vcHRpb25zLmFwcGxpY2F0aW9uLCB0aHMub3B0aW9ucy50b2tlbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlJywgeGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cywgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMgKyAnLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FsbEJhY2spIHsgY2FsbEJhY2soIHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCApfTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgeGhyLnN0YXR1cywgdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWpzb24tJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZURhdGEsdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWh0dHAnLHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1odHRwLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICB2YXIgdXJsID0gdGhpcy5vcHRpb25zLmVuZFBvaW50ICsgJ2FwaS9sb2dpbic7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHVybCx7IHVzZXJuYW1lOiB1c2VybmFtZSwgcGFzc3dvcmQgOiBwYXNzd29yZH0sIG51bGwsY29ubmVjdGlvbi5vcHRpb25zLnRva2VuLCB0cnVlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uLnVwZGF0ZVN0YXR1cyh4aHIucmVzcG9uc2VEYXRhKTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoc3RhdHVzKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oY2FsbEJhY2spe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgd3Njb25uZWN0ID0gZnVuY3Rpb24oc2VsZil7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uID0gbmV3IHV0aWxzLndzQ29ubmVjdChzZWxmLm9wdGlvbnMpO1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbi5vbkNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuZXZlbnRzLmVtaXQoJ3dzLWNvbm5lY3RlZCcsIHNlbGYud3NDb25uZWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uLm9uRGlzY29ubmVjdChmdW5jdGlvbigpeyBcbiAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMgJiYgc2VsZi5vcHRpb25zLnJlYWx0aW1lRW5kUG9pbnQpe1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgd3Njb25uZWN0KHNlbGYpOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9LDEwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzKChmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICBpZiAoJ3Rva2VuJyBpbiBzZWxmLm9wdGlvbnMpe1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW5nIHRvICcgKyBzZWxmLm9wdGlvbnMuZW5kUG9pbnQpO1xuICAgICAgICAgICAgaWYgKHNlbGYub3B0aW9ucy51c2VybmFtZSAmJiBzZWxmLm9wdGlvbnMucGFzc3dvcmQpe1xuICAgICAgICAgICAgICAgIHNlbGYubG9naW4oXG4gICAgICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucy51c2VybmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLnBhc3N3b3JkLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3JlbmV3aW5nIGNvbm5lY3Rpb24nKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzZWxmLm9wdGlvbnMudG9rZW4gJiYgc2VsZi5vcHRpb25zLnJlYWx0aW1lRW5kUG9pbnQgJiYgKCFzZWxmLndzQ29ubmVjdGlvbikpe1xuICAgICAgICAgICAgd3Njb25uZWN0KHNlbGYpO1xuICAgICAgICB9XG4gICAgfSkuYmluZCh0aGlzKSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9nT3V0ID0gZnVuY3Rpb24odXJsLCBjYWxsQmFjayl7XG4gICAgcmV0dXJuIHRoaXMuJHBvc3QoJ2FwaS9sb2dvdXQnLHt9LChmdW5jdGlvbihzdGF0dXMpIHtcbiAgICAgICAgaWYgKCdsYXN0UldUU3RhdHVzJyBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB7ZW5kUG9pbnQ6IHRoaXMub3B0aW9ucy5lbmRQb2ludH07XG4gICAgICAgIGlmICh0aGlzLndzQ29ubmVjdGlvbikgeyBcbiAgICAgICAgICAgIHRoaXMud3NDb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLndzQ29ubmVjdGlvbiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVybCkgeyBsb2NhdGlvbiA9IHVybDsgfVxuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgIH0pLmJpbmQodGhpcykpO1xufVxuKi9cbnZhciB1dGlscyA9IHtcbiAgICByZW5hbWVGdW5jdGlvbiA6IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICAgICAgICByZXR1cm4gKG5ldyBGdW5jdGlvbihcInJldHVybiBmdW5jdGlvbiAoY2FsbCkgeyByZXR1cm4gZnVuY3Rpb24gXCIgKyBuYW1lICtcbiAgICAgICAgICAgIFwiICgpIHsgcmV0dXJuIGNhbGwodGhpcywgYXJndW1lbnRzKSB9OyB9O1wiKSgpKShGdW5jdGlvbi5hcHBseS5iaW5kKGZuKSk7XG4gICAgfSxcbiAgICBjYWNoZWQgOiBmdW5jdGlvbihmdW5jLCBrZXkpe1xuICAgICAgICBpZiAoIWtleSl7ICAgIFxuICAgICAgICAgICAga2V5ID0gJ18nICsgY2FjaGVkS2V5SWR4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gd3JhcHBlcigpe1xuICAgICAgICAgICAgaWYgKCF0aGlzW2tleV0pe1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IGZ1bmMuY2FsbCh0aGlzLFthcmd1bWVudHNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzW2tleV07XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB3cmFwcGVyO1xuICAgIH0sXG4vLyAgICAkUE9TVCA6ICRQT1NULFxuLy8gICAgcmVXaGVlbENvbm5lY3Rpb246IHJlV2hlZWxDb25uZWN0aW9uLFxuICAgIGxvZzogZnVuY3Rpb24oKXsgXG4gICAgICAgIGNvbnNvbGUubG9nKGFyZ3VtZW50cyk7XG4gICAgfSxcblxuICAgIHhkcjogZnVuY3Rpb24gKHVybCwgZGF0YSwgYXBwbGljYXRpb24sdG9rZW4sIGZvcm1FbmNvZGUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ha2UgYW4gSFRUUCBSZXF1ZXN0IGFuZCByZXR1cm4gaXRzIHByb21pc2UuXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciByZXE7XG4gICAgICAgICAgICBpZiAoIWRhdGEpIHsgZGF0YSA9IHt9O31cblxuICAgICAgICAgICAgaWYoWE1MSHR0cFJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZURhdGEgPSBKU09OLnBhcnNlKHJlcS5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoYSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB7cmVzcG9uc2VEYXRhOiByZXNwb25zZURhdGEsIHJlc3BvbnNlVGV4dDogcmVxLnJlc3BvbnNlVGV4dCxzdGF0dXM6IHJlcS5zdGF0dXMsIHJlcXVlc3Q6IHJlcX07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVxLnN0YXR1cyA+PSAyMDAgJiYgcmVxLnN0YXR1cyA8IDQwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmKFhEb21haW5SZXF1ZXN0KXtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWERvbWFpblJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXEucmVzcG9uc2VUZXh0LHJlcS5zdGF0dXNUZXh0LCByZXEpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0NPUlMgbm90IHN1cHBvcnRlZCcpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxLm9wZW4oJ1BPU1QnLCB1cmwsIHRydWUpO1xuICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgaWYgKHRva2VuKSB7IGRhdGEuX190b2tlbl9fID0gdG9rZW4gfVxuICAgICAgICAgICAgaWYgKCFmb3JtRW5jb2RlKXtcbiAgICAgICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLnNpemUoKT9KU09OLnN0cmluZ2lmeShkYXRhKTonJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUkkodi50b1N0cmluZygpKTsgIFxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKS5qb2luKCcmJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXEuc2VuZChkYXRhKTtcbiAgICAvLyAgICAgICAgcmVxLnNlbmQobnVsbCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBjYXBpdGFsaXplIDogZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgcmV0dXJuIHNbMF0udG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICB9LFxuXG4gICAgaGFzaCA6IGZ1bmN0aW9uKHN0cil7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIYXNoZWQgZnVuY3Rpb25cbiAgICAgICAgICovXG4gICAgICAgIHN0ciA9IHN0ci50b1N0cmluZygpO1xuICAgICAgICB2YXIgcmV0ID0gMTtcbiAgICAgICAgZm9yICh2YXIgeCA9IDA7eDxzdHIubGVuZ3RoO3grKyl7XG4gICAgICAgICAgICByZXQgKj0gKDEgKyBzdHIuY2hhckNvZGVBdCh4KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChyZXQgJSAzNDk1ODM3NDk1NykudG9TdHJpbmcoKTtcbiAgICB9LFxuXG4gICAgbWFrZUZpbHRlciA6IGZ1bmN0aW9uIChtb2RlbCwgZmlsdGVyLCB1bmlmaWVyLCBkb250VHJhbnNsYXRlRmlsdGVyKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlIGZpbHRlciBmb3IgQXJyYXkuZmlsdGVyIGZ1bmN0aW9uIGFzIGFuIGFuZCBvZiBvclxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKCF1bmlmaWVyKSB7IHVuaWZpZXIgPSAnICYmICc7fVxuICAgICAgICBpZiAoTGF6eShmaWx0ZXIpLnNpemUoKSA9PT0gMCl7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCl7IHJldHVybiB0cnVlIH07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNvdXJjZSA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odmFscywgZmllbGQpe1xuICAgICAgICAgICAgaWYgKCF2YWxzKSB7IHZhbHMgPSBbbnVsbF19XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFscykpe1xuICAgICAgICAgICAgICAgIHZhbHMgPSBbdmFsc107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWRvbnRUcmFuc2xhdGVGaWx0ZXIgJiYgKG1vZGVsLmZpZWxkc1tmaWVsZF0udHlwZSA9PT0gJ3JlZmVyZW5jZScpKSB7XG4gICAgICAgICAgICAgICAgZmllbGQgPSAnXycgKyBmaWVsZDtcbiAgICAgICAgICAgICAgICB2YWxzID0gTGF6eSh2YWxzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgIGlmICh4ICYmICh4LmNvbnN0cnVjdG9yICE9PSBOdW1iZXIpKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmlkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vZGVsLmZpZWxkc1tmaWVsZF0udHlwZSA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgIHZhbHMgPSB2YWxzLm1hcChKU09OLnN0cmluZ2lmeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJygnICsgIExhenkodmFscykubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgIGlmICgheCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdtYWtlRmlsdGVyIHggaXMgbnVsbCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZih4ID09PSBvcm0udXRpbHMubW9jaykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdtYWtlRmlsdGVyIHdpdGggTW9jayBPYmplY3QnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICcoeC4nICsgZmllbGQgKyAnID09PSAnICsgeCArICcpJztcbiAgICAgICAgICAgIH0pLmpvaW4oJyB8fCAnKSAgKycpJztcbiAgICAgICAgfSkudG9BcnJheSgpLmpvaW4odW5pZmllcik7XG4gICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJ4XCIsIFwicmV0dXJuIFwiICsgc291cmNlKTtcbiAgICB9LFxuXG4gICAgc2FtZUFzIDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZXAgZXF1YWxcbiAgICAgICAgICovXG4gICAgICAgIGZvciAodmFyIGsgaW4geCkge1xuICAgICAgICAgICAgaWYgKHlba10gIT0geFtrXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIHBsdXJhbGl6ZSA6IGZ1bmN0aW9uKHN0ciwgbW9kZWwpe1xuICAgICAgICAvKipcbiAgICAgICAgICogTGV4aWNhbGx5IHJldHVybnMgZW5nbGlzaCBwbHVyYWwgZm9ybVxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIHN0ciArICdzJztcbiAgICB9LFxuXG4gICAgYmVmb3JlQ2FsbCA6IGZ1bmN0aW9uKGZ1bmMsIGJlZm9yZSl7XG4gICAgICAgIHZhciBkZWNvcmF0b3IgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgYmVmb3JlKCkudGhlbihmdW5jKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZGVjb3JhdG9yO1xuICAgIH0sXG5cbiAgICBjbGVhblN0b3JhZ2UgOiBmdW5jdGlvbigpe1xuICAgICAgICAvKipcbiAgICAgICAgICogQ2xlYW4gbG9jYWxTdG9yYWdlIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgTGF6eShsb2NhbFN0b3JhZ2UpLmtleXMoKS5lYWNoKGZ1bmN0aW9uKGspe1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtrXTtcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgY2xlYW5EZXNjcmlwdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIExhenkobG9jYWxTdG9yYWdlKVxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbih2LCBuKSB7IHJldHVybiBMYXp5KG4pLnN0YXJ0c1dpdGgoJ2Rlc2NyaXB0aW9uOicpfSlcbiAgICAgICAgICAgIC5rZXlzKClcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKG4pIHsgZGVsZXRlIGxvY2FsU3RvcmFnZVtuXSB9KTtcbiAgICB9LFxuICAgIFxuICAgIHJldmVyc2UgOiBmdW5jdGlvbiAoY2hyLCBzdHIpIHtcbiAgICAgICAgcmV0dXJuIHN0ci5zcGxpdChjaHIpLnJldmVyc2UoKS5qb2luKGNocik7XG4gICAgfSxcbiAgICBwZXJtdXRhdGlvbnM6IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgeCA9IGFyci5sZW5ndGgtMTsgeCA+PSAwO3gtLSl7XG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gYXJyLmxlbmd0aC0xOyB5ID49IDA7IHktLSl7XG4gICAgICAgICAgICAgICAgaWYgKHggIT09IHkpXG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKFthcnJbeF0sIGFyclt5XV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcblxuICAgIHdhaXRGb3I6IGZ1bmN0aW9uKGZ1bmMsIGNhbGxCYWNrKSB7XG4gICAgICAgIHZhciB3YWl0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChmdW5jKCkpIHtcbiAgICAgICAgICAgICAgICBjYWxsQmFjaygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHdhaXRlciw1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQod2FpdGVyLCA1MDApO1xuICAgIH0sXG5cbiAgICBib29sOiBCb29sZWFuLFxuXG4gICAgbm9vcCA6IGZ1bmN0aW9uKCl7fSxcblxuICAgIHR6T2Zmc2V0OiBuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCxcblxuICAgIHRyYW5zRmllbGRUeXBlOiB7XG4gICAgICAgIGRhdGU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG5ldyBEYXRlKHggKiAxMDAwICsgdXRpbHMudHpPZmZzZXQgKSB9LFxuICAgICAgICBkYXRldGltZTogZnVuY3Rpb24oeCkgeyByZXR1cm4gbmV3IERhdGUoeCAqIDEwMDAgKyB1dGlscy50ek9mZnNldCApIH0sXG4gICAgICAgIHN0cmluZzogZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b1N0cmluZygpOyB9LFxuICAgICAgICB0ZXh0OiBmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvU3RyaW5nKCk7IH0sXG4gICAgICAgIGludGVnZXI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBhcnNlSW50KHgpOyB9LFxuICAgICAgICBmbG9hdDogZnVuY3Rpb24oeCkgeyByZXR1cm4gcGFyc2VGbG9hdCh4KTsgfVxuICAgIH0sIFxuICAgIG1vY2sgOiBtb2NrT2JqZWN0KClcbn07XG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBTVEFUVVNLRVkgPSAnbGFzdFJXVENvbm5lY3Rpb25TdGF0dXMnO1xuXG5mdW5jdGlvbiBSZWFsdGltZUNvbm5lY3Rpb24oZW5kUG9pbnQsIHJ3dENvbm5lY3Rpb24pe1xuICAgIC8qKlxuICAgICAqIENvbm5lY3RzIGEgd2Vic29ja2V0IHdpdGggcmVXaGVlbCBjb25uZWN0aW9uXG4gICAgICovXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgU29ja0pTKGVuZFBvaW50KTtcbiAgICBjb25uZWN0aW9uLm9ub3BlbiA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdvcGVuIDogJyArIHgpO1xuICAgICAgICBjb25uZWN0aW9uLnRlbmFudCgpO1xuICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLWNvbm5lY3Rpb24tb3BlbicseCk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9ubWVzc2FnZSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGlmICh4LnR5cGUgPT0gJ21lc3NhZ2UnKSB7XG4gICAgICAgICAgICAvLyQubm90aWZ5KHguZGF0YSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vVE9ETyBzZXQgZnJvbVJlYWx0aW1lXG4gICAgICAgICAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1tZXNzYWdlLWpzb24nLCBKU09OLnBhcnNlKHguZGF0YSkpO1xuICAgICAgICAgICAgICAgIC8vVE9ETyB1bnNldCBmcm9tUmVhbHRpbWVcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtbWVzc2FnZS10ZXh0JywgSlNPTi5wYXJzZSh4LmRhdGEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmcm9tIHJlYWx0aW1lICcseCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGNvbm5lY3Rpb24ub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2V0VGltZW91dCh1dGlscy53c0Nvbm5lY3QsMTAwMCk7XG4gICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtY29ubmVjdGlvbi1jbG9zZWQnKTtcbiAgICB9O1xuICAgIGNvbm5lY3Rpb24udGVuYW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25uZWN0aW9uLnNlbmQoJ1RFTkFOVDonICsgcnd0Q29ubmVjdGlvbi5jYWNoZWRTdGF0dXMuYXBwbGljYXRpb24gKyAnOicgKyByd3RDb25uZWN0aW9uLmNhY2hlZFN0YXR1cy50b2tlbik7XG4gICAgfVxuICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgIH1cbn0gICAgXG5cbmZ1bmN0aW9uIHJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBnZXRMb2dpbil7XG4gICAgLyoqXG4gICAgICogQ29ubmVjdGlvbiBiYXNpYyBmb3IgcmVXaGVlbFxuICAgICAqIEBwYXJhbSBlbmRQb2ludDogc3RyaW5nIGJhc2UgdXJsIGZvciBhbGwgY29tdW5pY2F0aW9uXG4gICAgICogQHBhcmFtIGdldExvZ2luOiBmdW5jdGlvbiB0byBiZSBjYWxsZWQgaW4gY2FzZSBvZiBtaXNzaW5nIGxvZ2luLlxuICAgICAqICB0aGlzIGZ1bmN0aW9uIGNvdWxkIHJldHVybiA6XG4gICAgICogIC0gICBhIHsgdXNlcm5hbWUgOiA8dXNlcm5hbWU+ICwgcGFzc3dvcmQ6IDxwYXNzd29yZD59IG9yXG4gICAgICogIC0gICBiIFByb21pc2UgLT4geyB1c2VybmFtZSA6IDx1c2VybmFtZT4gLCBwYXNzd29yZDogPHBhc3N3b3JkPn1cbiAgICAgKi9cbiAgICAvLyBtYWluIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIGV2ZW50cyA9IG5ldyBOYW1lZEV2ZW50TWFuYWdlcigpO1xuICAgIHRoaXMuZ2V0TG9naW4gPSBnZXRMb2dpbjtcbiAgICB0aGlzLmVuZFBvaW50ID0gZW5kUG9pbnQuZW5kc1dpdGgoJy8nKT8gZW5kUG9pbnQ6IChlbmRQb2ludCArICcvJyk7XG4gICAgdGhpcy5vbiA9IGV2ZW50cy5vbjtcbiAgICB0aGlzLnVuYmluZCA9IGV2ZW50cy51bmJpbmQ7XG4gICAgdGhpcy5lbWl0ID0gZXZlbnRzLmVtaXQ7XG4gICAgdGhpcy5vbmNlID0gZXZlbnRzLm9uY2U7XG4gICAgdGhpcy5jYWNoZWRTdGF0dXMgPSB7fTtcbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2U7XG4gICAgdGhpcy5pc0xvZ2dlZEluID0gZmFsc2U7XG4gICAgLy8gcmVnaXN0ZXJpbmcgdXBkYXRlIHN0YXR1c1xuICAgIHZhciB0aHMgPSB0aGlzO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLiRwb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLGNhbGxCYWNrKXtcbiAgICAvKipcbiAgICAgKiBBSkFYIGNhbGwgZm9yIGZldGNoIGFsbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICogQHBhcmFtIHVybDogbGFzdCB1cmwgcGFydCBmb3IgYWpheCBjYWxsXG4gICAgICogQHBhcmFtIGRhdGE6IGRhdGEgb2JqZWN0IHRvIGJlIHNlbnRcbiAgICAgKiBAcGFyYW0gY2FsbEJhY2s6IGZ1bmN0aW9uKHhocikgd2lsbCBiZSBjYWxsZWQgd2hlbiBkYXRhIGFycml2ZXNcbiAgICAgKiBAcmV0dXJucyBQcm9taXNlPHhocj4gc2FtZSBvZiBjYWxsQmFja1xuICAgICAqL1xuICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5lbmRQb2ludCArIHVybCwgZGF0YSwgdGhzLmNhY2hlZFN0YXR1cy5hcHBsaWNhdGlvbiwgdGhzLmNhY2hlZFN0YXR1cy50b2tlbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2h0dHAtcmVzcG9uc2UnLCB4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIHRocy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMgKyAnLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FsbEJhY2spIHsgY2FsbEJhY2soIHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCApfTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1qc29uLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VEYXRhLHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWh0dHAnLHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWh0dHAtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xuXG4vKipcbiAqIENoZWNrIGN1cnJlbnQgc3RhdHVzIGFuZCBjYWxsYmFjayBmb3IgcmVzdWx0cy5cbiAqIEl0IGNhY2hlcyByZXN1bHRzIGZvciBmdXJ0aGVyLlxuICogQHBhcmFtIGNhbGxiYWNrOiAoc3RhdHVzIG9iamVjdClcbiAqIEBwYXJhbSBmb3JjZTogYm9vbGVhbiBpZiB0cnVlIGVtcHRpZXMgY2FjaGUgIFxuICogQHJldHVybiB2b2lkXG4gKi9cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5zdGF0dXMgPSBmdW5jdGlvbihjYWxsQmFjaywgZm9yY2UpIHtcbiAgICAvLyBpZiBmb3JjZSwgY2xlYXIgYWxsIGNhY2hlZCB2YWx1ZXNcbiAgICB2YXIga2V5ID0gJ3Rva2VuOicgKyB0aGlzLmVuZFBvaW50O1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIGlmIChmb3JjZSkge1xuICAgICAgICB0aGlzLmNhY2hlZFN0YXR1cyA9IHt9O1xuICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW2tleV07XG4gICAgfVxuICAgIGlmICh0aGlzLnN0YXR1c1dhaXRpbmcpIHtcbiAgICAgICAgLy8gd2FpdCBmb3Igc3RhdHVzXG4gICAgICAgIHV0aWxzLndhaXRGb3IoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gIXRocy5zdGF0dXNXYWl0aW5nO1xuICAgICAgICB9LCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhzLnN0YXR1cyhjYWxsQmFjayxmb3JjZSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIHRyeSBmb3IgdmFsdWUgcmVzb2x1dGlvblxuICAgIC8vIGZpcnN0IG9uIG1lbW9yeVxuICAgIGlmIChMYXp5KHRoaXMuY2FjaGVkU3RhdHVzKS5zaXplKCkpe1xuICAgICAgICBjYWxsQmFjayh0aGlzLmNhY2hlZFN0YXR1cylcbiAgICAvLyB0aGVuIGluIGxvY2FsU3RvcmFnZVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBkYXRhID0ge307XG4gICAgICAgIGlmIChrZXkgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICBkYXRhLl9fdG9rZW5fXyA9IGxvY2FsU3RvcmFnZVtrZXldO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhdHVzV2FpdGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuJHBvc3QoJ2FwaS9zdGF0dXMnLGRhdGEsIGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICB0aHMudXBkYXRlU3RhdHVzKHN0YXR1cyk7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Vba2V5XSA9IHN0YXR1cy50b2tlbjtcbiAgICAgICAgICAgIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgICAgICAgICB0aHMuc3RhdHVzV2FpdGluZyA9IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gZG9lc24ndCBjYWxsIGNhbGxiYWNrXG4gICAgICAgIHJldHVyblxuICAgIH1cbiAgICBjYWxsQmFjayh0aGlzLmNhY2hlZFN0YXR1cyk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24oc3RhdHVzKXtcbiAgICB2YXIgbGFzdEJ1aWxkID0gcGFyc2VGbG9hdChsb2NhbFN0b3JhZ2UubGFzdEJ1aWxkKSB8fCAxO1xuICAgIGlmIChsYXN0QnVpbGQgPCBzdGF0dXMubGFzdF9idWlsZCl7XG4gICAgICAgIHV0aWxzLmNsZWFuRGVzY3JpcHRpb24oKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLmxhc3RCdWlsZCA9IHN0YXR1cy5sYXN0X2J1aWxkO1xuICAgIH1cbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gQm9vbGVhbihzdGF0dXMudG9rZW4pO1xuICAgIHRoaXMuaXNMb2dnZWRJbiA9IEJvb2xlYW4oc3RhdHVzLnVzZXJfaWQpO1xuICAgIHZhciBvbGRTdGF0dXMgPSB0aGlzLmNhY2hlZFN0YXR1cztcbiAgICB0aGlzLmNhY2hlZFN0YXR1cyA9IHN0YXR1cztcbiAgICBpZiAoIW9sZFN0YXR1cy51c2VyX2lkICYmIHN0YXR1cy51c2VyX2lkKXtcbiAgICAgICAgdGhpcy5lbWl0KCdsb2dnZWQtaW4nLHN0YXR1cy51c2VyX2lkKTtcbiAgICB9IGVsc2UgaWYgKG9sZFN0YXR1cy51c2VyX2lkICYmICFzdGF0dXMudXNlcl9pZCl7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9nZ2VkLW91dCcpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0Nvbm5lY3RlZCAmJiAhdGhpcy5pc0xvZ2dlZEluKXtcbiAgICAgICAgdGhpcy5lbWl0KCdsb2dpbi1yZXF1aXJlZCcpO1xuICAgICAgICBpZiAodGhpcy5nZXRMb2dpbil7XG4gICAgICAgICAgICB2YXIgbG9naW5JbmZvID0gdGhpcy5nZXRMb2dpbigpO1xuICAgICAgICAgICAgaWYgKGxvZ2luSW5mby5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KXtcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ2luKGxvZ2luSW5mby51c2VybmFtZSwgbG9naW5JbmZvLnBhc3N3b3JkLCBsb2dpbkluZm8uY2FsbEJhY2spO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb2dpbkluZm8uY29uc3RydWN0b3IgPT09IFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICBsb2dpbkluZm8udGhlbihmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ2luKG9iai51c2VybmFtZSwgb2JqLnBhc3N3b3JkLCBvYmouY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gcmVhbHRpbWUgY29ubmVjdGlvbiBpcyBzZXR0ZWRcbiAgICBpZiAoIW9sZFN0YXR1cy5yZWFsdGltZUVuZFBvaW50ICYmIHN0YXR1cy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgIHRoaXMud3NDb25uZWN0aW9uID0gbmV3IFJlYWx0aW1lQ29ubmVjdGlvbihzdGF0dXMucmVhbHRpbWVFbmRQb2ludCwgdGhpcyk7XG4gICAgLy8gcmVhbHRpbWUgY29ubmVjdGlvbiBpcyBjbG9zZWRcbiAgICB9IGVsc2UgaWYgKG9sZFN0YXR1cy5yZWFsdGltZUVuZFBvaW50ICYmICFzdGF0dXMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICB0aGlzLndzQ29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICBkZWxldGUgdGhpcy53c0Nvbm5lY3Rpb247XG4gICAgfVxuICAgIHRoaXMuZW1pdCgndXBkYXRlLWNvbm5lY3Rpb24tc3RhdHVzJywgc3RhdHVzLCBvbGRTdGF0dXMpO1xuICAgIGxvY2FsU3RvcmFnZVtTVEFUVVNLRVldID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbn1cblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICAvKipcbiAgICAgKiBtYWtlIGxvZ2luIGFuZCByZXR1cm4gYSBwcm9taXNlLiBJZiBsb2dpbiBzdWNjZWQsIHByb21pc2Ugd2lsbCBiZSBhY2NlcHRlZFxuICAgICAqIElmIGxvZ2luIGZhaWxzIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoIGVycm9yXG4gICAgICogQHBhcmFtIHVzZXJuYW1lOiB1c2VybmFtZVxuICAgICAqIEBwYXJhbSBwYXNzd29yZDogcGFzc3dvcmRcbiAgICAgKiBAcmV0dXJuIFByb21pc2UgKHVzZXIgb2JqZWN0KVxuICAgICAqL1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih0aHMuZW5kUG9pbnQgKyAnYXBpL2xvZ2luJywge3VzZXJuYW1lOiB1c2VybmFtZSB8fCAnJywgcGFzc3dvcmQ6IHBhc3N3b3JkIHx8ICcnfSxudWxsLHRocy5jYWNoZWRTdGF0dXMudG9rZW4sIHRydWUpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBzdGF0dXNcbiAgICAgICAgICAgICAgICB0aHMudXBkYXRlU3RhdHVzKHhoci5yZXNwb25zZURhdGEpO1xuICAgICAgICAgICAgICAgIC8vIGNhbGwgd2l0aCB1c2VyIGlkXG4gICAgICAgICAgICAgICAgYWNjZXB0KHtzdGF0dXMgOiAnc3VjY2VzcycsIHVzZXJpZDogdGhzLmNhY2hlZFN0YXR1cy51c2VyX2lkfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiBlcnJvciBjYWxsIGVycm9yIG1hbmFnZXIgd2l0aCBlcnJvclxuICAgICAgICAgICAgICAgIGFjY2VwdCh7ZXJyb3I6IHhoci5yZXNwb25zZURhdGEuZXJyb3IsIHN0YXR1czogJ2Vycm9yJ30pO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9nb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3QpIHtcbiAgICAgICAgdGhzLiRwb3N0KCdhcGkvbG9nb3V0JylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKG9rKXtcbiAgICAgICAgICAgICAgICB0aHMudXBkYXRlU3RhdHVzKHt9KTtcbiAgICAgICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW1NUQVRVU0tFWV07XG4gICAgICAgICAgICAgICAgYWNjZXB0KClcbiAgICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKGNhbGxCYWNrKSB7XG4gICAgaWYgKHRoaXMuaXNMb2dnZWRJbikge1xuICAgICAgICBjYWxsQmFjayh0aGlzLmNhY2hlZFN0YXR1cy51c2VyX2lkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyB3YWl0IGZvciBsb2dpblxuICAgICAgICB0aGlzLm9uY2UoJ2xvZ2dlZC1pbicsZnVuY3Rpb24odXNlcl9pZCl7XG4gICAgICAgICAgICBjYWxsQmFjayh1c2VyX2lkKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc3RhdHVzKGNhbGxCYWNrIHx8IHV0aWxzLm5vb3ApO1xuICAgIH1cbn1cblxudXRpbHMucmVXaGVlbENvbm5lY3Rpb24gPSByZVdoZWVsQ29ubmVjdGlvbjsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFRvdWNoZXIoKXtcbiAgICB2YXIgdG91Y2hlZCA9IGZhbHNlXG4gICAgdGhpcy50b3VjaCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRvdWNoZWQgPSB0cnVlO1xuICAgIH07XG4gICAgdGhpcy50b3VjaGVkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHQgPSB0b3VjaGVkO1xuICAgICAgICB0b3VjaGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybiB0O1xuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuXG5mdW5jdGlvbiBWYWN1dW1DYWNoZXIodG91Y2gsIGFza2VkLCBuYW1lLCBwa0luZGV4KXtcbi8qXG4gICAgaWYgKG5hbWUpe1xuICAgICAgICBjb25zb2xlLmluZm8oJ2NyZWF0ZWQgVmFjdXVtQ2FjaGVyIGFzICcgKyBuYW1lKTtcbiAgICB9XG4qL1xuICAgIGlmICghYXNrZWQpe1xuICAgICAgICB2YXIgYXNrZWQgPSBbXTtcbiAgICB9XG4gICAgdmFyIG1pc3NpbmcgPSBbXTtcbiAgICBcbiAgICB0aGlzLmFzayA9IGZ1bmN0aW9uIChpZCxsYXp5KXtcbiAgICAgICAgaWYgKHBrSW5kZXggJiYgKGlkIGluIHBrSW5kZXguc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghTGF6eShhc2tlZCkuY29udGFpbnMoaWQpKXtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnYXNraW5nICgnICsgaWQgKyAnKSBmcm9tICcgKyBuYW1lKTtcbiAgICAgICAgICAgIG1pc3NpbmcucHVzaChpZCk7XG4gICAgICAgICAgICBpZiAoIWxhenkpXG4gICAgICAgICAgICAgICAgYXNrZWQucHVzaChpZCk7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICB9IFxuLy8gICAgICAgIGVsc2UgY29uc29sZS53YXJuKCcoJyArIGlkICsgJykgd2FzIGp1c3QgYXNrZWQgb24gJyArIG5hbWUpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEFza2VkSW5kZXggPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gYXNrZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5taXNzaW5ncyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBMYXp5KG1pc3Npbmcuc3BsaWNlKDAsbWlzc2luZy5sZW5ndGgpKS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgfVxufVxuIiwiZnVuY3Rpb24gQXV0b0xpbmtlcihhY3RpdmVzLCBJREIsIFcyUFJFU09VUkNFLCBsaXN0Q2FjaGUpe1xuICAgIHZhciB0b3VjaCA9IG5ldyBUb3VjaGVyKCk7XG4gICAgdmFyIG1haW5JbmRleCA9IHt9O1xuICAgIHZhciBmb3JlaWduS2V5cyA9IHt9O1xuICAgIHZhciBtMm0gPSB7fTtcbiAgICB2YXIgbTJtSW5kZXggPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbnMgPSB7fTtcbiAgICB0aGlzLm1haW5JbmRleCA9IG1haW5JbmRleDtcbiAgICB0aGlzLmZvcmVpZ25LZXlzID0gZm9yZWlnbktleXM7XG4gICAgdGhpcy5tMm0gPSBtMm07XG4gICAgdGhpcy5tMm1JbmRleCA9IG0ybUluZGV4O1xuICAgIHRoaXMucGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucztcblxuICAgIFcyUFJFU09VUkNFLm9uKCdtb2RlbC1kZWZpbml0aW9uJyxmdW5jdGlvbihtb2RlbCwgaW5kZXgpe1xuICAgICAgICAvLyBkZWZpbmluZyBhbGwgaW5kZXhlcyBmb3IgcHJpbWFyeSBrZXlcbiAgICAgICAgdmFyIHBrSW5kZXggPSBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IobW9kZWwubmFtZSwgJ2lkJyk7XG4gICAgICAgIG1haW5JbmRleFttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIHBrSW5kZXgsICdtYWluSW5kZXguJyArIG1vZGVsLm5hbWUsIGluZGV4KTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0aW5nIHBlcm1pc3Npb24gaW5kZXhlc1xuICAgICAgICBwZXJtaXNzaW9uc1ttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwgJ3Blcm1pc3Npb25zLicgKyBtb2RlbC5uYW1lKTtcblxuICAgICAgICAvLyBjcmVhdGluZyBpbmRleGVzIGZvciBmb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uKHJlZmVyZW5jZSl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWwubmFtZSArICdfJyArIHJlZmVyZW5jZS5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IocmVmZXJlbmNlLnRvLCAnaWQnKSwgcmVmZXJlbmNlLnRvICsgJy5pZCBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGNyZWF0aW5nIHJldmVyc2UgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkO1xuICAgICAgICAgICAgZm9yZWlnbktleXNbaW5kZXhOYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIGxpc3RDYWNoZS5nZXRJbmRleEZvcihmaWVsZC5ieSxmaWVsZC5pZCksIGZpZWxkLmJ5ICsgJy4nICsgZmllbGQuaWQgKyAnIGZvcmVpZ25LZXlzLicgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtb2RlbC5tYW55VG9NYW55KS5lYWNoKGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm0pKVxuICAgICAgICAgICAgICAgIG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdID0gW25ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUgKyAnWzBdJyksIG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUrJ1sxXScpXTtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm1JbmRleCkpXG4gICAgICAgICAgICAgICAgbTJtSW5kZXhbcmVsYXRpb24uaW5kZXhOYW1lXSA9IG5ldyBNYW55VG9NYW55UmVsYXRpb24ocmVsYXRpb24sbTJtW3JlbGF0aW9uLmluZGV4TmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgbTJtR2V0ID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayl7XG4gICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KChuID8gdXRpbHMucmV2ZXJzZSgnLycsIGluZGV4TmFtZSkgOiBpbmRleE5hbWUpICsgJ3MnICsgJy9saXN0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgZGVsZXRlIGFjdGl2ZXNbaW5kZXhOYW1lXVxuICAgICAgICB9KTsgICAgICAgIFxuICAgIH07XG5cbiAgICB2YXIgZ2V0TTJNID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBjb2xsZWN0aW9uLCBuLCBjYWxsQmFjayl7XG4gICAgICAgIC8vIGFzayBhbGwgaXRlbXMgaW4gY29sbGVjdGlvbiB0byBtMm0gaW5kZXhcbiAgICAgICAgTGF6eShjb2xsZWN0aW9uKS5lYWNoKG0ybVtpbmRleE5hbWVdW25dLmFzay5iaW5kKG0ybVtpbmRleE5hbWVdW25dKSk7XG4gICAgICAgIC8vIHJlbmV3aW5nIGNvbGxlY3Rpb24gd2l0aG91dCBhc2tlZFxuICAgICAgICBjb2xsZWN0aW9uID0gbTJtW2luZGV4TmFtZV1bbl0ubWlzc2luZ3MoKTtcbiAgICAgICAgLy8gY2FsbGluZyByZW1vdGUgZm9yIG0ybSBjb2xsZWN0aW9uIGlmIGFueVxuICAgICAgICBpZiAoY29sbGVjdGlvbi5sZW5ndGgpe1xuICAgICAgICAgICAgYWN0aXZlc1tpbmRleE5hbWVdID0gMTtcbiAgICAgICAgICAgIG0ybUdldChpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGNhbGxCYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuZ2V0TTJNID0gZ2V0TTJNO1xuXG4gICAgdmFyIGxpbmtVbmxpbmtlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIHBlcmZvcm0gYSBEYXRhQmFzZSBzeW5jaHJvbml6YXRpb24gd2l0aCBzZXJ2ZXIgbG9va2luZyBmb3IgdW5rbm93biBkYXRhXG4gICAgICAgIGlmICghdG91Y2gudG91Y2hlZCgpKSByZXR1cm47XG4gICAgICAgIGlmIChMYXp5KGFjdGl2ZXMpLnZhbHVlcygpLnN1bSgpKSB7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGluZGV4ZXMsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICBMYXp5KGluZGV4ZXMpLmVhY2goZnVuY3Rpb24gKGluZGV4LG4pIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IGluZGV4Lm1pc3NpbmdzKCk7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IExhenkoY29sbGVjdGlvbikuZmlsdGVyKEJvb2xlYW4pLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIElOREVYID0gbTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdldHRlciA9IElOREVYWydnZXQnICsgKDEgLSBuKV0uYmluZChJTkRFWCk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBjb2xsZWN0aW9uLm1hcChnZXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvdGhlckluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcvJylbMSAtIG5dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG90aGVySW5kZXgsZnVuY3Rpb24oKXtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2gobWFpbkluZGV4W290aGVySW5kZXhdLmFzayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoaWRzKS5mbGF0dGVuKCkudW5pcXVlKCkuZWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1haW5JbmRleFtvdGhlckluZGV4XS5hc2soeCx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtYWluSW5kZXgpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIHZhciBpZHMgPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgaWRiID0gbW9kZWxOYW1lIGluIElEQiA/IElEQlttb2RlbE5hbWVdLmtleXMoKSA6IExhenkoKTtcbiAgICAgICAgICAgICAgICAvL2xvZygnbGlua2luZy4nICsgbW9kZWxOYW1lICsgJyA9ICcgKyBXMlBSRVNPVVJDRS5saW5raW5nLnNvdXJjZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIHtpZDogaWRzfSxudWxsLHV0aWxzLm5vb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gRm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkoZm9yZWlnbktleXMpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICAgICAgICByZXR1cm4gdlsxXS5sZW5ndGhcbiAgICAgICAgfSkuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICB2YXIgaWRzID0geFsxXTtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSB4WzBdO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgbWFpblJlc291cmNlID0gaW5kZXhbMF07XG4gICAgICAgICAgICB2YXIgZmllbGROYW1lID0gaW5kZXhbMV07XG4gICAgICAgICAgICB2YXIgZmlsdGVyID0ge307XG4gICAgICAgICAgICBmaWx0ZXJbZmllbGROYW1lXSA9IGlkcztcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1haW5SZXNvdXJjZSwgZmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBMYXp5KExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgcmV0dXJuIFtrLCB2Lm1pc3NpbmdzKCldXG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLnRvT2JqZWN0KCkpLmVhY2goZnVuY3Rpb24gKGlkcywgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICBhY3RpdmVzW3Jlc291cmNlTmFtZV0gPSAxO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHJlc291cmNlTmFtZSArICcvbXlfcGVybXMnLCB7aWRzOiBMYXp5KGlkcykudW5pcXVlKCkudG9BcnJheSgpfSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoZGF0YS5QRVJNSVNTSU9OUyk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW3Jlc291cmNlTmFtZV1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHNldEludGVydmFsKGxpbmtVbmxpbmtlZCw1MCk7XG59O1xuXG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBMaXN0Q2FjaGVyKCl7XG4gICAgdmFyIGdvdEFsbCA9IHt9O1xuICAgIHZhciBhc2tlZCA9IHt9OyAvLyBtYXAgb2YgYXJyYXlcbiAgICB2YXIgY29tcG9zaXRlQXNrZWQgPSB7fTtcbiAgICB2YXIgY2FydGVzaWFuUHJvZHVjdDEgPSBmdW5jdGlvbih4LHksaXNBcnJheSl7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgaWYgKGlzQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4geCl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYiBpbiB5KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goTGF6eShbeFthXSx5W2JdXSkuZmxhdHRlbigpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgYSBpbiB4KXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBiIGluIHkpe1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChbeFthXSx5W2JdXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICB2YXIgY2FydGVzaWFuUHJvZHVjdCA9IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciBpc0FycmF5ID0gZmFsc2U7XG4gICAgICAgIHZhciByZXQgPSBhcnJbMF07IFxuICAgICAgICBmb3IgKHZhciB4ID0gMTsgeCA8IGFyci5sZW5ndGg7ICsreCl7XG4gICAgICAgICAgICByZXQgPSBjYXJ0ZXNpYW5Qcm9kdWN0MShyZXQsIGFyclt4XSwgaXNBcnJheSk7XG4gICAgICAgICAgICBpc0FycmF5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgICB2YXIgZXhwbG9kZUZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICB2YXIgcHJvZHVjdCA9IGNhcnRlc2lhblByb2R1Y3QoTGF6eShmaWx0ZXIpLnZhbHVlcygpLnRvQXJyYXkoKSk7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLmtleXMoKS50b0FycmF5KCk7XG4gICAgICAgIHJldHVybiBwcm9kdWN0Lm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhciByID0ge307XG4gICAgICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oYSxuKXtcbiAgICAgICAgICAgICAgICByW2FdID0geFtuXTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH07XG4gICAgdmFyIGZpbHRlclNpbmdsZSA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIsIHRlc3RPbmx5KXtcbiAgICAgICAgLy8gTGF6eSBhdXRvIGNyZWF0ZSBpbmRleGVzXG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG4gICAgICAgIHZhciBnZXRJbmRleEZvciA9IHRoaXMuZ2V0SW5kZXhGb3I7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2LGtleSl7IHJldHVybiBba2V5LCBtb2RlbE5hbWUgKyAnLicgKyBrZXldOyB9KS50b09iamVjdCgpO1xuICAgICAgICB2YXIgaW5kZXhlcyA9IExhenkoZmlsdGVyKS5rZXlzKCkubWFwKGZ1bmN0aW9uKGtleSl7IHJldHVybiBba2V5LCBnZXRJbmRleEZvcihtb2RlbE5hbWUsIGtleSldfSkudG9PYmplY3QoKTsgXG4gICAgICAgIC8vIGZha2UgZm9yIChpdCB3aWxsIGN5Y2xlIG9uY2UpXG4gICAgICAgIGZvciAodmFyIHggaW4gZmlsdGVyKXtcbiAgICAgICAgICAgIC8vIGdldCBhc2tlZCBpbmRleCBhbmQgY2hlY2sgcHJlc2VuY2VcbiAgICAgICAgICAgIHZhciBkaWZmZXJlbmNlID0gTGF6eShmaWx0ZXJbeF0pLmRpZmZlcmVuY2UoaW5kZXhlc1t4XSkudG9BcnJheSgpO1xuICAgICAgICAgICAgaWYgKGRpZmZlcmVuY2UubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAvLyBnZW5lcmF0ZSBuZXcgZmlsdGVyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IExhenkoW1t4LCBkaWZmZXJlbmNlXV0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgLy8gcmVtZW1iZXIgYXNrZWRcbiAgICAgICAgICAgICAgICBpZiAoIXRlc3RPbmx5KVxuICAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShpbmRleGVzW3hdLCBkaWZmZXJlbmNlKTtcbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUgZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikgKyAnXFxuT3V0IDonICsgSlNPTi5zdHJpbmdpZnkocmV0KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6IG51bGwnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY2xlYW5Db21wb3NpdGVzID0gZnVuY3Rpb24obW9kZWwsZmlsdGVyKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGNsZWFuIGNvbXBvc2l0ZUFza2VkXG4gICAgICAgICAqL1xuICAgICAgICAvLyBsYXp5IGNyZWF0ZSBjb25kaXRpb25hbCBhc2tlZCBpbmRleFxuICAgICAgICBpZiAoIShtb2RlbC5uYW1lIGluIGNvbXBvc2l0ZUFza2VkKSkgeyBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXSA9IFtdIH07XG4gICAgICAgIHZhciBpbmRleCA9IGNvbXBvc2l0ZUFza2VkW21vZGVsLm5hbWVdO1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGFsbCBlbGVtZW50cyB3aG8gaGF2ZSBzYW1lIHBhcnRpYWxcbiAgICAgICAgdmFyIGZpbHRlckxlbiA9IExhenkoZmlsdGVyKS5zaXplKCk7XG4gICAgICAgIHZhciBpdGVtcyA9IGluZGV4LmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIsICcgJiYgJyx0cnVlKSkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0peyBMYXp5KGl0ZW0pLnNpemUoKSA+IGZpbHRlckxlbiB9KTtcbi8vICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgOicgKyBKU09OLnN0cmluZ2lmeShpdGVtcykpO1xuICAgIH07XG5cbiAgICB0aGlzLmZpbHRlciA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIpe1xuLy8gICAgICAgIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLS0tLS0tLS1cXG5maWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSk7XG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG5cbiAgICAgICAgLy8gaWYgeW91IGZldGNoIGFsbCBvYmplY3RzIGZyb20gc2VydmVyLCB0aGlzIG1vZGVsIGhhcyB0byBiZSBtYXJrZWQgYXMgZ290IGFsbDtcbiAgICAgICAgdmFyIGZpbHRlckxlbiAgPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICBzd2l0Y2ggKGZpbHRlckxlbikge1xuICAgICAgICAgICAgY2FzZSAwIDoge1xuICAgICAgICAgICAgICAgIC8vIHJldHVybiBudWxsIG9yIGFsbFxuICAgICAgICAgICAgICAgIHZhciBnb3QgPSBnb3RBbGxbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICBnb3RBbGxbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBhc2tlZCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhc2tlZFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdXQgOiBudWxsIChnb3QgYWxsKScpO1xuICAgICAgICAgICAgICAgIC8vIGNvbmRpdGlvbmFsIGNsZWFuXG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBjb21wb3NpdGVBc2tlZCl7IFxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGdvdClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAxIDoge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBmaWx0ZXJTaW5nbGUuY2FsbCh0aGlzLCBtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgICAgICBjbGVhbkNvbXBvc2l0ZXMuY2FsbCh0aGlzLCBtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICB2YXIgc2luZ2xlID0gTGF6eShmaWx0ZXIpLmtleXMoKS5zb21lKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdmFyIGYgPSB7fTtcbiAgICAgICAgICAgIGZba2V5XSA9IGZpbHRlcltrZXldO1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlclNpbmdsZS5jYWxsKHRocywgbW9kZWwsIGYsIHRydWUpID09IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc2luZ2xlKSB7IHJldHVybiBudWxsIH1cbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29tcG9zaXRlQXNrZWRcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGNvbXBvc2l0ZUFza2VkKSl7IGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0gPSBbXTsgfVxuICAgICAgICAvLyBleHBsb2RlIGZpbHRlclxuICAgICAgICB2YXIgZXhwbG9kZWQgPSBleHBsb2RlRmlsdGVyKGZpbHRlcik7XG4gICAgICAgIC8vIGNvbGxlY3QgcGFydGlhbHNcbiAgICAgICAgdmFyIHBhcnRpYWxzID0gY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXS5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnIHx8ICcsdHJ1ZSkpO1xuICAgICAgICAvLyBjb2xsZWN0IG1pc3NpbmdzIChleHBsb2RlZCAtIHBhcnRpYWxzKVxuICAgICAgICBpZiAocGFydGlhbHMubGVuZ3RoKXtcbiAgICAgICAgICAgIHZhciBiYWQgID0gW107XG4gICAgICAgICAgICAvLyBwYXJ0aWFsIGRpZmZlcmVuY2VcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gcGFydGlhbHMpe1xuICAgICAgICAgICAgICAgIGJhZC5wdXNoLmFwcGx5KGJhZCxleHBsb2RlZC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgcGFydGlhbHNbeF0sJyAmJiAnLCB0cnVlKSkpO1xuICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICBjb25zb2xlLmxvZygnZXhwbG9kZWQgLSBwYXJ0aWFsIDogJyArIEpTT04uc3RyaW5naWZ5KGJhZCkpO1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gTGF6eShleHBsb2RlZCkuZGlmZmVyZW5jZShiYWQpLnRvQXJyYXkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IGV4cGxvZGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZmlsdGVyIHBhcnRpYWxzXG4gICAgICAgIGlmIChtaXNzaW5ncy5sZW5ndGgpe1xuICAgICAgICAgICAgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXS5wdXNoLmFwcGx5KGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0sbWlzc2luZ3MpO1xuICAgICAgICAgICAgLy8gYWdncmVnYXRlIG1pc3NpbmdzXG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBMYXp5KGZpbHRlcikua2V5cygpLm1hcChmdW5jdGlvbihrZXkpe1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBMYXp5KG1pc3NpbmdzKS5wbHVjayhrZXkpLnVuaXF1ZSgpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2tleSwgcmV0Lmxlbmd0aD9yZXQ6ZmlsdGVyW2tleV1dO1xuICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbi8vICAgICAgICAgICAgY29uc29sZS5sb2coJ291dCA6ICcgKyBKU09OLnN0cmluZ2lmeShtaXNzaW5ncykpO1xuICAgICAgICAgICAgLy8gY2xlYW4gY29uZGl0aW9uYWxcbiAgICAgICAgICAgIGNsZWFuQ29tcG9zaXRlcyhtb2RlbCwgbWlzc2luZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIG1pc3NpbmdzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEluZGV4Rm9yID0gZnVuY3Rpb24obW9kZWxOYW1lLCBmaWVsZE5hbWUpe1xuICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWxOYW1lICsgJy4nICsgZmllbGROYW1lO1xuICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gYXNrZWQpKXtcbiAgICAgICAgICAgIGFza2VkW2luZGV4TmFtZV0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXNrZWRbaW5kZXhOYW1lXTtcbiAgICB9XG59OyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybSl7XG4gICAgdmFyIGl0ZW1zID0gW107XG4gICAgdGhpcy5hZGQgPSBpdGVtcy5wdXNoLmJpbmQoaXRlbXMpO1xuICAgIHRoaXMuYWRkID0gZnVuY3Rpb24oaXRlbSl7XG4gIC8vICAgICAgY29uc29sZS5sb2coJ2FkZGluZyAnICsgaXRlbSk7XG4gICAgICAgIGlmICghKExhenkoaXRlbXMpLmZpbmQoaXRlbSkpKXtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmdldDAgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVsxXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjFcIikudG9BcnJheSgpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldDEgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVswXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMV0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjBcIikudG9BcnJheSgpO1xuICAgIH07XG4gICAgdGhpc1snZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVsYXRpb24uaW5kZXhOYW1lLnNwbGl0KCcvJylbMV0pXSA9IHRoaXMuZ2V0MTtcbiAgICB0aGlzWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWxhdGlvbi5pbmRleE5hbWUuc3BsaXQoJy8nKVswXSldID0gdGhpcy5nZXQwO1xuXG4gICAgdGhpcy5kZWwgPSBmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgdmFyIGwgPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgIHZhciBpZHggPSBudWxsO1xuICAgICAgICBmb3IgKHZhciBhID0gMDsgYSA8IGw7IGErKyl7IFxuICAgICAgICAgICAgaWYgKChpdGVtc1thXVswXSA9PT0gaXRlbVswXSkgJiYgKGl0ZW1zW2FdWzFdID09PSBpdGVtWzFdKSl7XG4gICAgICAgICAgICAgICAgaWR4ID0gYTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaWR4KXtcbiAgICAgICAgICAgIGl0ZW1zLnNwbGljZShhLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgJywgaXRlbSk7XG4gICAgfTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGNhY2hlZFByb3BlcnR5QnlFdmVudHMocHJvdG8sIHByb3BlcnR5TmFtZSxnZXR0ZXIsIHNldHRlcil7XG4gICAgdmFyIGV2ZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyw0KTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgXG4gICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICBwcm90by5vcm0ub24oZXZlbnQsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJlc3VsdCA9IHt9O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgcHJvcGVydHlEZWYgPSB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gY2FjaGVkKCl7XG4vLyAgICAgICAgICAgIHJldHVybiBnZXR0ZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIGlmICghKHRoaXMuaWQgaW4gcmVzdWx0KSl7XG4gICAgICAgICAgICAgICAgcmVzdWx0W3RoaXMuaWRdID0gZ2V0dGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpZiAoc2V0dGVyKXtcbiAgICAgICAgcHJvcGVydHlEZWZbJ3NldCddID0gZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCBpbiByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICBpZiAodmFsdWUgIT09IHJlc3VsdFt0aGlzLmlkXSl7XG4gICAgICAgICAgICAgICAgc2V0dGVyLmNhbGwodGhpcyx2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaWQgaW4gcmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIHByb3BlcnR5TmFtZSxwcm9wZXJ0eURlZik7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvcihkYXRhKXtcbiAgICB0aGlzLnJlc291cmNlID0gZGF0YS5fcmVzb3VyY2U7XG4gICAgdGhpcy5mb3JtSWR4ID0gZGF0YS5mb3JtSWR4O1xuICAgIHRoaXMuZmllbGRzID0gZGF0YS5lcnJvcnM7XG59XG52YXIgYmFzZU9STSA9IGZ1bmN0aW9uKG9wdGlvbnMsIGV4dE9STSl7XG4gICAgXG4gICAgLy8gY3JlYXRpbmcgcmV3aGVlbCBjb25uZWN0aW9uXG4gICAgaWYgKG9wdGlvbnMuY29uc3RydWN0b3IgPT09IFN0cmluZyl7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gbmV3IHJlV2hlZWxDb25uZWN0aW9uKG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gdXRpbHMucmVXaGVlbENvbm5lY3Rpb24pe1xuICAgICAgICB2YXIgY29ubmVjdGlvbiA9IG9wdGlvbnM7XG4gICAgfVxuICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgY29ubmVjdGlvbi5vbignY29ubmVjdGVkJywgZnVuY3Rpb24oKXsgXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICB9KTtcbiAgICB0aGlzLm9uID0gY29ubmVjdGlvbi5vbjtcbiAgICB0aGlzLmVtaXQgPSBjb25uZWN0aW9uLmVtaXQ7XG4gICAgdGhpcy51bmJpbmQgPSBjb25uZWN0aW9uLnVuYmluZDtcbiAgICB0aGlzLm9uY2UgPSBjb25uZWN0aW9uLm9uY2U7XG4gICAgdGhpcy4kcG9zdCA9IGNvbm5lY3Rpb24uJHBvc3QuYmluZChjb25uZWN0aW9uKTtcblxuICAgIC8vIGhhbmRsaW5nIHdlYnNvY2tldCBldmVudHNcbiAgICB0aGlzLm9uKCd3cy1jb25uZWN0ZWQnLGZ1bmN0aW9uKHdzKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdXZWJzb2NrZXQgY29ubmVjdGVkJyk7XG4gICAgICAgIC8vIGFsbCBqc29uIGRhdGEgaGFzIHRvIGJlIHBhcnNlZCBieSBnb3REYXRhXG4gICAgICAgIHdzLm9uTWVzc2FnZUpzb24oVzJQUkVTT1VSQ0UuZ290RGF0YS5iaW5kKFcyUFJFU09VUkNFKSk7XG4gICAgICAgIC8vXG4gICAgICAgIHdzLm9uTWVzc2FnZVRleHQoZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8oJ1dTIG1lc3NhZ2UgOiAnICsgbWVzc2FnZSlcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5vbignd3MtZGlzY29ubmVjdGVkJywgZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmVycm9yKCdXZWJzb2NrZXQgZGlzY29ubmVjdGVkJylcbiAgICB9KTtcbiAgICB0aGlzLm9uKCdlcnJvci1qc29uLTQwNCcsZnVuY3Rpb24oZXJyb3IsdXJsLCBzZW50RGF0YSwgeGhyKXsgXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0pTT04gZXJyb3IgJywgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1t1cmwuc3BsaXQoJy8nKVswXV07XG4gICAgfSk7XG4gICAgdGhpcy5vbigncmVhbHRpbWUtbWVzc2FnZS1qc29uJywgZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEobWVzc2FnZSk7XG4gICAgfSk7XG5cbiAgICAvLyBpbml0aWFsaXphdGlvblxuICAgIHZhciBXMlBSRVNPVVJDRSA9IHRoaXM7XG4gICAgdmFyIElEQiA9IHthdXRoX2dyb3VwIDogTGF6eSh7fSl9OyAvLyB0YWJsZU5hbWUgLT4gZGF0YSBhcyBBcnJheVxuICAgIHZhciBJRFggPSB7fTsgLy8gdGFibGVOYW1lIC0+IExhenkoaW5kZXhCeSgnaWQnKSkgLT4gSURCW2RhdGFdXG4gICAgdmFyIFJFVklEWCA9IHt9OyAvLyB0YWJsZU5hbWUgLT4gZmllbGROYW1lIC0+IExhenkuZ3JvdXBCeSgpIC0+IElEQltEQVRBXVxuICAgIHZhciBidWlsZGVySGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgYnVpbGRlckhhbmRsZXJVc2VkID0ge307XG4gICAgdmFyIHBlcnNpc3RlbnRBdHRyaWJ1dGVzID0ge307XG4gICAgdmFyIGV2ZW50SGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbldhaXRpbmcgPSB7fTtcbiAgICB2YXIgbW9kZWxDYWNoZSA9IHt9O1xuICAgIHZhciBmYWlsZWRNb2RlbHMgPSB7fTtcbiAgICB2YXIgd2FpdGluZ0Nvbm5lY3Rpb25zID0ge30gLy8gYWN0dWFsIGNvbm5lY3Rpb24gd2hvIGknbSB3YWl0aW5nIGZvclxuICAgIHZhciBsaXN0Q2FjaGUgPSBuZXcgTGlzdENhY2hlcihMYXp5KTtcbiAgICB2YXIgbGlua2VyID0gbmV3IEF1dG9MaW5rZXIod2FpdGluZ0Nvbm5lY3Rpb25zLElEQiwgdGhpcywgbGlzdENhY2hlKTtcbi8qICAgIHdpbmRvdy5sbCA9IGxpbmtlcjtcbiAgICB3aW5kb3cubGMgPSBsaXN0Q2FjaGU7XG4qL1xuICAgIHdpbmRvdy5JREIgPSBJREI7XG4gICAgdGhpcy52YWxpZGF0aW9uRXZlbnQgPSB0aGlzLm9uKCdlcnJvci1qc29uLTUxMycsIGZ1bmN0aW9uKGRhdGEsIHVybCwgc2VudERhdGEsIHhocil7XG4gICAgICAgIGlmIChjdXJyZW50Q29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIpe1xuICAgICAgICAgICAgY3VycmVudENvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyKG5ldyBWYWxpZGF0aW9uRXJyb3IoZGF0YSkpO1xuICAgICAgICB9XG4gICAgfSlcblxuICAgIHZhciBnZXRJbmRleCA9IGZ1bmN0aW9uIChpbmRleE5hbWUpIHtcbiAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJREIpXG4gICAgICAgICAgICByZXR1cm4gSURCW2luZGV4TmFtZV07XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSURCW2luZGV4TmFtZV0gPSBMYXp5KHt9KTtcbiAgICAgICAgICAgIHJldHVybiBJREJbaW5kZXhOYW1lXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGdldFVubGlua2VkID0gZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICBpZiAoaW5kZXhOYW1lIGluIFVOTElOS0VEKVxuICAgICAgICAgICAgcmV0dXJuIFVOTElOS0VEW2luZGV4TmFtZV07XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgVU5MSU5LRURbaW5kZXhOYW1lXSA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIFVOTElOS0VEW2luZGV4TmFtZV07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gUGVybWlzc2lvblRhYmxlKGlkLCBrbGFzcywgcGVybWlzc2lvbnMpIHtcbiAgICAgICAgLy8gY3JlYXRlIFBlcm1pc3Npb25UYWJsZSBjbGFzc1xuICAgICAgICB0aGlzLmtsYXNzID0ga2xhc3M7XG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICBmb3IgKHZhciBrIGluIHBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICB0aGlzLnB1c2guYXBwbHkodGhpcywgW2ssIHBlcm1pc3Npb25zW2tdXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgUGVybWlzc2lvblRhYmxlLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIC8vIHNhdmUgT2JqZWN0IHRvIHNlcnZlclxuICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgIHBlcm1pc3Npb25zOiBMYXp5KHRoaXMucGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeFswXS5pZCwgeFsxXV1cbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KClcbiAgICAgICAgfTtcbiAgICAgICAgZGF0YS5pZCA9IHRoaXMuaWQ7XG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSB0aGlzLmtsYXNzLm1vZGVsTmFtZTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5rbGFzcy5tb2RlbE5hbWUgKyAnL3NldF9wZXJtaXNzaW9ucycsIGRhdGEsIGZ1bmN0aW9uIChteVBlcm1zLCBhLCBiLCByZXEpIHtcbiAgICAgICAgICAgIGNiKG15UGVybXMpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIFBlcm1pc3Npb25UYWJsZS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChncm91cF9pZCwgcGVybWlzc2lvbkxpc3QpIHtcbiAgICAgICAgdmFyIHAgPSBMYXp5KHBlcm1pc3Npb25MaXN0KTtcbiAgICAgICAgdmFyIHBlcm1zID0gTGF6eSh0aGlzLmtsYXNzLmFsbFBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBbeCwgcC5jb250YWlucyh4KV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgdmFyIGwgPSBMYXp5KHRoaXMucGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0uaWRcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChsLmNvbnRhaW5zKGdyb3VwX2lkKSlcbiAgICAgICAgICAgIHRoaXMucGVybWlzc2lvbnNbbC5pbmRleE9mKGdyb3VwX2lkKV1bMV0gPSBwZXJtcztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5wZXJtaXNzaW9ucy5wdXNoKFtJREIuYXV0aF9ncm91cC5nZXQoZ3JvdXBfaWQpLCBwZXJtc10pO1xuICAgIH07XG5cbiAgICAvLyBjcmVhdGVzIGR5bmFtaWNhbCBtb2RlbHNcbiAgICB2YXIgbWFrZU1vZGVsQ2xhc3MgPSBmdW5jdGlvbiAobW9kZWwpIHtcbiAgICAgICAgdmFyIF9tb2RlbCA9IG1vZGVsO1xuICAgICAgICBtb2RlbC5maWVsZHMuaWQucmVhZGFibGUgPSBmYWxzZTtcbiAgICAgICAgbW9kZWwuZmllbGRzLmlkLndyaXRhYmxlID0gZmFsc2U7XG4gICAgICAgIHZhciBmaWVsZHMgPSBMYXp5KG1vZGVsLmZpZWxkcyk7XG4gICAgICAgIGlmIChtb2RlbC5wcml2YXRlQXJncykge1xuICAgICAgICAgICAgZmllbGRzID0gZmllbGRzLm1lcmdlKG1vZGVsLnByaXZhdGVBcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdtb2RlbC1kZWZpbml0aW9uJywgbW9kZWwsIGdldEluZGV4KG1vZGVsLm5hbWUpKTtcbiAgICAgICAgLy8gZ2V0dGluZyBmaWVsZHMgb2YgdHlwZSBkYXRlIGFuZCBkYXRldGltZVxuLypcbiAgICAgICAgdmFyIERBVEVGSUVMRFMgPSBmaWVsZHMuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHgudHlwZSA9PSAnZGF0ZScpIHx8ICh4LnR5cGUgPT0gJ2RhdGV0aW1lJylcbiAgICAgICAgfSkubWFwKGZ1bmN0aW9uICh4LCB2KSB7XG4gICAgICAgICAgICByZXR1cm4gW3YsIHRydWVdXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG5cbiAgICAgICAgLy8gZ2V0dGluZyBib29sZWFuIGZpZWxkc1xuICAgICAgICB2YXIgQk9PTEZJRUxEUyA9IGZpZWxkcy5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoeC50eXBlID09ICdib29sZWFuJylcbiAgICAgICAgfSkubWFwKGZ1bmN0aW9uICh4LCB2KSB7XG4gICAgICAgICAgICByZXR1cm4gW3YsIHRydWVdXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG5cbiAgICAgICAgLy8gYm9vbGVhbnMgYW5kIGRhdGV0aW1lcyBzdG9yYWdlIGV4dGVybmFsIFxuICAgICAgICBNT0RFTF9EQVRFRklFTERTW21vZGVsLm5hbWVdID0gREFURUZJRUxEUztcbiAgICAgICAgTU9ERUxfQk9PTEZJRUxEU1ttb2RlbC5uYW1lXSA9IEJPT0xGSUVMRFM7XG4qL1xuICAgICAgICAvLyBpbml0aWFsaXphdGlvblxuICAgICAgICB2YXIgZnVuY1N0cmluZyA9IFwiaWYgKCFyb3cpIHsgcm93ID0ge319O1xcblwiO1xuICAgICAgICBmdW5jU3RyaW5nICs9IG1vZGVsLnJlZmVyZW5jZXMubWFwKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHJldHVybiAndGhpcy5fJyArIGZpZWxkLmlkICsgJyA9IHJvdy4nICsgZmllbGQuaWQgKyAnOyc7XG4gICAgICAgIH0pLmpvaW4oJztcXG4nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGRhdGVmaWVsZCBjb252ZXJzaW9uXG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gZmllbGRzLm1hcChmdW5jdGlvbiAoeCxrKSB7XG4gICAgICAgICAgICBpZiAoKHgudHlwZSA9PSAnZGF0ZScpIHx8ICh4LnR5cGUgPT0gJ2RhdGV0aW1lJykpe1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSByb3cuJyArIGsgKyAnP25ldyBEYXRlKHJvdy4nICsgayArICcgKiAxMDAwIC0gJyArIHV0aWxzLnR6T2Zmc2V0ICsgJyk6bnVsbDtcXG4nOyBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeC50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSAocm93LicgKyBrICsgJyA9PT0gXCJUXCIpIHx8IChyb3cuJyArIGsgKyAnID09PSB0cnVlKTtcXG4nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gcm93LicgKyBrICsgJztcXG4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS50b1N0cmluZygnXFxuJyk7ICsgJ1xcbic7XG5cbiAgICAgICAgZnVuY1N0cmluZyArPSBcImlmIChwZXJtaXNzaW9ucykge3RoaXMuX3Blcm1pc3Npb25zID0gcGVybWlzc2lvbnMgJiYgTGF6eShwZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7IHJldHVybiBbeCwgdHJ1ZV0gfSkudG9PYmplY3QoKTt9XCJcblxuICAgICAgICBcbiAgICAgICAgLy8gbWFzdGVyIGNsYXNzIGZ1bmN0aW9uXG4gICAgICAgIHZhciBLbGFzcyA9IG5ldyBGdW5jdGlvbigncm93JywgJ3Blcm1pc3Npb25zJyxmdW5jU3RyaW5nKVxuXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5vcm0gPSBleHRPUk07XG4gICAgICAgIEtsYXNzLnJlZl90cmFuc2xhdGlvbnMgPSB7fTtcbiAgICAgICAgS2xhc3MubW9kZWxOYW1lID0gbW9kZWwubmFtZTtcbiAgICAgICAgS2xhc3MucmVmZXJlbmNlcyA9IExhenkobW9kZWwucmVmZXJlbmNlcykucGx1Y2soJ2lkJykudG9BcnJheSgpO1xuXG4gICAgICAgIEtsYXNzLmludmVyc2VfcmVmZXJlbmNlcyA9IG1vZGVsLnJlZmVyZW5jZWRCeS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIC8vIG1hbmFnaW5nIHJlZmVyZW5jZXMgd2hlcmUgXG4gICAgICAgICAgICByZXR1cm4geC5ieSArICdfJyArIHguaWQgKyAnX3NldCdcbiAgICAgICAgfSk7XG4gICAgICAgIEtsYXNzLnJlZmVyZW50cyA9IG1vZGVsLnJlZmVyZW5jZWRCeS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBbeC5ieSwgeC5pZF1cbiAgICAgICAgfSk7XG4gICAgICAgIEtsYXNzLmZpZWxkc09yZGVyID0gbW9kZWwuZmllbGRPcmRlcjtcbiAgICAgICAgS2xhc3MuYWxsUGVybWlzc2lvbnMgPSBtb2RlbC5wZXJtaXNzaW9ucztcblxuICAgICAgICAvLyByZWRlZmluaW5nIHRvU3RyaW5nIG1ldGhvZFxuICAgICAgICBpZiAoTGF6eShtb2RlbC5yZXByZXNlbnRhdGlvbikuc2l6ZSgpKXtcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS50b1N0cmluZyA9IG5ldyBGdW5jdGlvbigncmV0dXJuIHRoaXMuJyArIExhenkobW9kZWwucmVwcmVzZW50YXRpb24pLnRvU3RyaW5nKCcgKyBcIiBcIiArIHRoaXMuJykpO1xuICAgICAgICB9XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS50b1VwcGVyQ2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIHJlZGVmaW5lIHRvIFVwcGVyQ2FzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICB9O1xuICAgICAgXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS50b0xvd2VyQ2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBkZWxldGUgaW5zdGFuY2UgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIHJldHVybiBleHRPUk0uZGVsZXRlKHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lLCBbdGhpcy5pZF0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHBlcm1pc3Npb24gZ2V0dGVyIHByb3BlcnR5XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShLbGFzcy5wcm90b3R5cGUsICdwZXJtaXNzaW9ucycsIHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9wZXJtaXNzaW9ucylcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Blcm1pc3Npb25zO1xuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsaW5rZXIucGVybWlzc2lvbnNbdGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWVdLmFzayh0aGlzLmlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBnZXR0aW5nIGZ1bGwgcGVybWlzc2lvbiB0YWJsZSBmb3IgYW4gb2JqZWN0XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5hbGxfcGVybXMgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgIHZhciBvYmplY3RfaWQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUgKyAnL2FsbF9wZXJtcycsIHtpZDogdGhpcy5pZH0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBlcm1pc3Npb25zID0gZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXBlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciB1bmtub3duX2dyb3VwcyA9IExhenkocGVybWlzc2lvbnMpLnBsdWNrKCdncm91cF9pZCcpLnVuaXF1ZSgpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJycgKyB4XG4gICAgICAgICAgICAgICAgfSkuZGlmZmVyZW5jZShJREIuYXV0aF9ncm91cC5rZXlzKCkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KHBlcm1pc3Npb25zKS5ncm91cEJ5KGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4Lmdyb3VwX2lkXG4gICAgICAgICAgICAgICAgfSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICBncm91cGVkW2tdID0gTGF6eSh2KS5wbHVjaygnbmFtZScpLnRvQXJyYXkoKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHZhciBjYWxsID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2IobmV3IFBlcm1pc3Npb25UYWJsZShvYmplY3RfaWQsIEtsYXNzLCBncm91cGVkKSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAodW5rbm93bl9ncm91cHMubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nZXQoJ2F1dGhfZ3JvdXAnLHVua25vd25fZ3JvdXBzLGNhbGwpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgY2FsbCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgdmFyIG8gPSB0aGlzLmFzUmF3KCk7XG4gICAgICAgICAgICB2YXIgZmllbGRzID0gS2xhc3MuZmllbGRzO1xuICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgIHZhciBtb2RlbE5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXJnIGluIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgb1thcmddID0gYXJnc1thcmddO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGVsaW1pbmF0ZSB1bndyaXRhYmxlc1xuICAgICAgICAgICAgTGF6eShLbGFzcy5maWVsZHNPcmRlcikuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgIHJldHVybiAhZmllbGRzW3hdLndyaXRhYmxlO1xuICAgICAgICAgICAgfSkuZWFjaChmdW5jdGlvbihmaWVsZE5hbWUpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgaW4gbykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgb1tmaWVsZE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKElEKSB7IG8uaWQgPSBJRDsgfVxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBXMlBSRVNPVVJDRS4kcG9zdChtb2RlbE5hbWUgKyAoSUQgPyAnL3Bvc3QnIDogJy9wdXQnKSwgbyk7XG4gICAgICAgICAgICBpZiAoYXJncyAmJiAoYXJncy5jb25zdHJ1Y3RvciA9PT0gRnVuY3Rpb24pKXtcbiAgICAgICAgICAgICAgICAvLyBwbGFjaW5nIGNhbGxiYWNrIGluIGEgY29tbW9uIHBsYWNlXG4gICAgICAgICAgICAgICAgcHJvbWlzZS5jb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlciA9IGFyZ3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZVxuICAgICAgICB9O1xuICAgICAgICBLbGFzcy5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBvYmogPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih0aGlzLmFzUmF3KCkpO1xuICAgICAgICAgICAgb2JqLl9wZXJtaXNzaW9ucyA9IHRoaXMuX3Blcm1pc3Npb25zO1xuICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBidWlsZGluZyBzZXJpYWxpemF0aW9uIGZ1bmN0aW9uXG4gICAgICAgIHZhciBhc3IgPSAncmV0dXJuIHtcXG4nICsgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5tYXAoZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgcmV0dXJuIGZpZWxkLmlkICsgJyA6IHRoaXMuXycgKyBmaWVsZC5pZDtcbiAgICAgICAgfSkuY29uY2F0KGZpZWxkcy5tYXAoZnVuY3Rpb24gKHgsaykge1xuICAgICAgICAgICAgaWYgKCh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiAodGhpcy4nICsgayArICc/KE1hdGgucm91bmQodGhpcy4nICsgayArICcuZ2V0VGltZSgpIC0gdGhpcy4nICsgayArICcuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIDYwMDAwKSAvIDEwMDApOm51bGwpJzsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHgudHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiB0aGlzLicgKyBrICsgJz9cIlRcIjpcIkZcIic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6IHRoaXMuJyArIGs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKS50b1N0cmluZygnLFxcbicpICsgJ307JztcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmFzUmF3ID0gbmV3IEZ1bmN0aW9uKGFzcik7XG5cbiAgICAgICAgS2xhc3Muc2F2ZU11bHRpID0gZnVuY3Rpb24gKG9iamVjdHMsIGNiLCBzY29wZSkge1xuICAgICAgICAgICAgdmFyIHJhdyA9IFtdO1xuICAgICAgICAgICAgdmFyIGRlbGV0YWJsZSA9IExhenkoS2xhc3MuZmllbGRzKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICF4LndyaXRhYmxlXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAucGx1Y2soJ2lkJylcbiAgICAgICAgICAgICAgICAudG9BcnJheSgpO1xuICAgICAgICAgICAgTGF6eShvYmplY3RzKVxuICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguYXNSYXcoKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShkZWxldGFibGUpLmVhY2goZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB4W3ldO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmF3LnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUsICdwdXQnLCB7bXVsdGlwbGU6IHJhdywgZm9ybUlkeCA6IFcyUFJFU09VUkNFLmZvcm1JZHgrK30sIGZ1bmN0aW9uIChlbGVtcykge1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZWxlbXMpO1xuICAgICAgICAgICAgICAgIHZhciB0YWIgPSBJREJbS2xhc3MubW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB2YXIgb2JqcyA9IExhenkoZWxlbXNbS2xhc3MubW9kZWxOYW1lXS5yZXN1bHRzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhYi5nZXQoeClcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNiKSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKG9ianMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHNjb3BlKTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCdleHRyYV92ZXJicycgaW4gbW9kZWwpXG4gICAgICAgICAgICBMYXp5KG1vZGVsLmV4dHJhX3ZlcmJzKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGZ1bmNOYW1lID0geFswXTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHhbMV07XG4gICAgICAgICAgICAgICAgdmFyIGRkYXRhID0gJ2RhdGEgPSB7aWQgOiB0aGlzLmlkJztcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGRkYXRhICs9ICcsICcgKyBMYXp5KGFyZ3MpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4ICsgJyA6ICcgKyB4O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuam9pbignLCcpO1xuICAgICAgICAgICAgICAgIGRkYXRhICs9ICd9Oyc7XG4gICAgICAgICAgICAgICAgYXJncy5wdXNoKCdjYicpO1xuICAgICAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVtmdW5jTmFtZV0gPSBuZXcgRnVuY3Rpb24oYXJncywgZGRhdGEgKyAnVzJTLlcyUF9QT1NUKHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lLFwiJyArIGZ1bmNOYW1lICsgJ1wiLCBkYXRhLGZ1bmN0aW9uKGRhdGEsc3RhdHVzLGhlYWRlcnMseCl7JyArXG4gICAgICAgICAgICAgICAgICAgICd0cnl7XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICcgICBpZiAoIWhlYWRlcnMoXCJub21vZGVsXCIpKSB7d2luZG93LlcyUy5nb3REYXRhKGRhdGEsY2IpO31cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJyAgIGVsc2Uge2lmIChjYikge2NiKGRhdGEpfX1cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ30gY2F0Y2goZSl7XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICdpZiAoY2IpIHtjYihkYXRhKTt9XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICd9XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICd9KTtcXG4nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBpZiAoJ3ByaXZhdGVBcmdzJyBpbiBtb2RlbCkge1xuICAgICAgICAgICAgS2xhc3MucHJpdmF0ZUFyZ3MgPSBMYXp5KG1vZGVsLnByaXZhdGVBcmdzKS5rZXlzKCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFt4LCB0cnVlXTtcbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUuc2F2ZVBBID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICB2YXIgVCA9IHRoaXM7XG4gICAgICAgICAgICAgICAgdmFyIG9vID0ge2lkOiB0aGlzLmlkfTtcbiAgICAgICAgICAgICAgICB2YXIgUEEgPSB0aGlzLmNvbnN0cnVjdG9yLnByaXZhdGVBcmdzO1xuICAgICAgICAgICAgICAgIHZhciBGcyA9IHRoaXMuY29uc3RydWN0b3IuZmllbGRzO1xuICAgICAgICAgICAgICAgIHZhciB0ID0gbmV3IHRoaXMuY29uc3RydWN0b3IobykuYXNSYXcoKTtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRJZHggPSBMYXp5KFBBKS5rZXlzKCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbeCwgRnNbeF1dXG4gICAgICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgICAgICBMYXp5KG8pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChrIGluIFBBKSAmJiBmaWVsZElkeFtrXS53cml0YWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb29ba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUgKyAnL3NhdmVQQScsIG9vLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIExhenkob28pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFRba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBtb2RlbENhY2hlW0tsYXNzLm1vZGVsTmFtZV0gPSBLbGFzcztcbiAgICAgICAgLy8gYWRkaW5nIGlkIHRvIGZpZWxkc1xuICAgICAgICBmb3IgKHZhciBmIGluIG1vZGVsLmZpZWxkcykge1xuICAgICAgICAgICAgbW9kZWwuZmllbGRzW2ZdLmlkID0gZjtcbiAgICAgICAgfVxuICAgICAgICBLbGFzcy5maWVsZHMgPSBMYXp5KG1vZGVsLmZpZWxkcykuY29uY2F0KExhenkobW9kZWwucHJpdmF0ZUFyZ3MpKS5jb25jYXQoTGF6eShtb2RlbC5yZWZlcmVuY2VzKS50YXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHgudHlwZSA9IHgudHlwZSB8fCAncmVmZXJlbmNlJ1xuICAgICAgICB9KSkuaW5kZXhCeSgnaWQnKS50b09iamVjdCgpO1xuICAgICAgICAvLyBzZXR0aW5nIHdpZGdldHMgZm9yIGZpZWxkc1xuICAgICAgICBMYXp5KEtsYXNzLmZpZWxkcykuZWFjaChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICBpZiAoIWZpZWxkLndpZGdldCl7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkLnR5cGUgPT09ICdyZWZlcmVuY2UnKXtcbiAgICAgICAgICAgICAgICAgICAgZmllbGQud2lkZ2V0ID0gJ2Nob2ljZXMnXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZmllbGQud2lkZ2V0ID0gZmllbGQudHlwZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBidWlsZGluZyByZWZlcmVuY2VzIHRvIChtYW55IHRvIG9uZSkgZmllbGRzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICB2YXIgZXh0X3JlZiA9IHJlZi50bztcbiAgICAgICAgICAgIHZhciBsb2NhbF9yZWYgPSAnXycgKyByZWYuaWQ7XG4gICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcmVmLmlkLGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXNbbG9jYWxfcmVmXSkgeyByZXR1cm4gbnVsbCB9O1xuICAgICAgICAgICAgICAgIGlmICghKGV4dF9yZWYgaW4gSURCKSl7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShleHRfcmVmLGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLm1haW5JbmRleFtleHRfcmVmXS5hc2sodGhzW2xvY2FsX3JlZl0sdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gKGV4dF9yZWYgaW4gSURCKSAmJiB0aGlzW2xvY2FsX3JlZl0gJiYgSURCW2V4dF9yZWZdLmdldCh0aGlzW2xvY2FsX3JlZl0pO1xuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0ICYmIChleHRfcmVmIGluIGxpbmtlci5tYWluSW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFza2luZyB0byBsaW5rZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzW2xvY2FsX3JlZl0gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rZXIubWFpbkluZGV4W2V4dF9yZWZdLmFzayh0aGlzW2xvY2FsX3JlZl0sdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ251bGwgcmVmZXJlbmNlIGZvciAnICsgbG9jYWxfcmVmICsgJygnICsgdGhpcy5pZCArICcpIHJlc291cmNlICcgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1dGlscy5tb2NrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgodmFsdWUuY29uc3RydWN0b3IgIT09IHV0aWxzLm1vY2spICYmICh2YWx1ZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUgIT09IGV4dF9yZWYpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgY2FuIGFzc2lnbiBvbmx5ICcgKyBleHRfcmVmICsgJyB0byAnICsgcmVmLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzW2xvY2FsX3JlZl0gPSB2YWx1ZS5pZDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzW2xvY2FsX3JlZl0gPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sICduZXctJyArIGV4dF9yZWYsICdkZWxldGVkLScgKyBleHRfcmVmLCd1cGRhdGVkLScgKyBleHRfcmVmLCAnbmV3LW1vZGVsLScgKyBleHRfcmVmLyosICd1cGRhdGVkLScgKyBLbGFzcy5tb2RlbE5hbWUqLyk7XG5cblxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWYuaWQpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0T1JNLmdldChleHRfcmVmLHRoaXNbbG9jYWxfcmVmXSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2J1aWxkaW5nIHJlZmVyZW5jZXMgdG8gKG9uZSB0byBtYW55KSBmaWVsZHNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VkQnkpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHJlZi5ieSArICcuJyArIHJlZi5pZDtcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSByZWYuYnkgKyAnXycgKyB1dGlscy5wbHVyYWxpemUocmVmLmlkKTtcbiAgICAgICAgICAgIHZhciByZXZJbmRleCA9IHJlZi5ieTtcbiAgICAgICAgICAgIGlmIChLbGFzcy5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RyeWVkIHRvIHJlZGVmaW5lIHByb3BlcnR5ICcgKyBwcm9wZXJ0eU5hbWUgKyAncycgKyAnIGZvciAnICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHByb3BlcnR5TmFtZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gKHJldkluZGV4IGluIElEQikgPyBSRVZJRFhbaW5kZXhOYW1lXS5nZXQodGhpcy5pZCArICcnKTpudWxsO1xuICAgICAgICAgICAgICAgICAgICBsaW5rZXIuZm9yZWlnbktleXNbaW5kZXhOYW1lXS5hc2sodGhpcy5pZCx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICB9LCBudWxsLCAnbmV3LScgKyByZXZJbmRleCwgJ3VwZGF0ZWQtJyArIHJldkluZGV4LCAnZGVsZXRlZC0nICsgcmV2SW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZSh1dGlscy5wbHVyYWxpemUocmVmLmJ5KSldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBvcHRzID0ge307XG4gICAgICAgICAgICAgICAgb3B0c1tyZWYuaWRdID0gW3RoaXMuaWRdO1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRPUk0uZ2V0KHJlZi5ieSxvcHRzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vYnVpbGRpbmcgcmVmZXJlbmNlIHRvIChtYW55IHRvIG1hbnkpIGZpZWxkc1xuICAgICAgICBpZiAobW9kZWwubWFueVRvTWFueSkge1xuICAgICAgICAgICAgTGF6eShtb2RlbC5tYW55VG9NYW55KS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gcmVmLmluZGV4TmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3QgPSByZWYuZmlyc3Q/IDAgOiAxO1xuICAgICAgICAgICAgICAgIHZhciBvbW9kZWxOYW1lID0gcmVmLm1vZGVsO1xuLy8gICAgICAgICAgICAgICAgdmFyIG9tb2RlbCA9IGdldEluZGV4KG9tb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciBnZXR0ZXIgPSBsaW5rZXIubTJtSW5kZXhbaW5kZXhOYW1lXVsnZ2V0JyArICgxIC0gZmlyc3QpXTtcblxuICAgICAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCByZWYubW9kZWwgKyAncycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGdldHRlcih0aHMuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdldCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9XMlBSRVNPVVJDRS5mZXRjaChvbW9kZWxOYW1lLCB7aWQgOiBpZHN9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXQgPSBnZXRJbmRleChvbW9kZWxOYW1lKS5nZXQuYmluZChJREJbb21vZGVsTmFtZV0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzICYmIGdldClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXQgPSBMYXp5KGlkcykubWFwKGdldCkuZmlsdGVyKHV0aWxzLmJvb2wpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgICAgIH0sIG51bGwsICdyZWNlaXZlZC1tMm0tJyArIGluZGV4TmFtZSwgJ3JlY2VpdmVkLScgKyBvbW9kZWxOYW1lKTtcblxuICAgICAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUodXRpbHMucGx1cmFsaXplKG9tb2RlbE5hbWUpKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5rZXIuZ2V0TTJNKGluZGV4TmFtZSwgW3Rocy5pZF0sIGZpcnN0LGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gZ2V0dGVyKHRocy5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG9tb2RlbE5hbWUsIHtpZCA6IGlkc30sbnVsbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZXQgPSBJREJbb21vZGVsTmFtZV0uZ2V0LmJpbmQoSURCW29tb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQoTGF6eShpZHMpLm1hcChnZXQpLmZpbHRlcih1dGlscy5ib29sKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQoW10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfTtcblxuXG4gICAgICAgICAgICAgICAgS2xhc3MuZmllbGRzW3V0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSldID0ge1xuICAgICAgICAgICAgICAgICAgICBpZDogdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWxOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWxOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHJlYWRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnTTJNJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yczogW11cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnVubGlua1JlZmVyZW5jZSA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lID09ICdBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZXMgPSBpbnN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBpbnN0YW5jZXNbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKG11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtJRCwgeF1cbiAgICAgICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gW1tJRCwgaW5zdGFuY2UuaWRdXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lICsgJy8nICsgb21vZGVsICsgJ3MvZGVsZXRlJywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS5saW5rUmVmZXJlbmNlID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgICAgICB2YXIgaW5zdGFuY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmNvbnN0cnVjdG9yLm5hbWUgPT0gJ0FycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlcyA9IGluc3RhbmNlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IGluc3RhbmNlc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbCA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gS2xhc3MubW9kZWxOYW1lICsgJy8nICsgb21vZGVsO1xuICAgICAgICAgICAgICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVmcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElOREVYX00yTSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVmcyA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5kaWZmZXJlbmNlKExhenkoSU5ERVhfTTJNW2luZGV4TmFtZV1bMF0uZ2V0KHRoaXMuaWQpKSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGluZGV4TmFtZSA9IG9tb2RlbCArICcvJyArIEtsYXNzLm1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJTkRFWF9NMk0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZnMgPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykuZGlmZmVyZW5jZShMYXp5KElOREVYX00yTVtpbmRleE5hbWVdWzBdLmdldCh0aGlzLmlkKSkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVmcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gTGF6eShyZWZzKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW0lELCB4XVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQX1BPU1QoS2xhc3MubW9kZWxOYW1lLCBvbW9kZWwgKyAncy9wdXQnLCB7Y29sbGVjdGlvbjogY29sbGVjdGlvbn0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoaW5kZXhOYW1lIGluIGxpbmtlci5tMm1JbmRleCkgJiYgTGF6eShsaW5rZXIubTJtSW5kZXhbaW5kZXhOYW1lXVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUob21vZGVsKV0oaW5zdGFuY2UuaWQpKS5maW5kKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lICsgJy8nICsgb21vZGVsICsgJ3MvcHV0Jywge2NvbGxlY3Rpb246IFtbdGhpcy5pZCwgaW5zdGFuY2UuaWRdXX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbmV3LW1vZGVsJywgS2xhc3MpO1xuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCduZXctbW9kZWwtJyArIEtsYXNzLm1vZGVsTmFtZSk7XG4gICAgICAgIHJldHVybiBLbGFzcztcbiAgICB9O1xuXG4gICAgdGhpcy5nb3REYXRhID0gZnVuY3Rpb24gKGRhdGEsIGNhbGxCYWNrKSB7XG4gICAgICAgIC8vIHJlY2VpdmUgYWxsIGRhdGEgZnJvbSBldmVyeSBlbmQgcG9pbnRcbiAgICAgICAgY29uc29sZS5pbmZvKCdnb3REYXRhJyk7XG4gICAgICAgIGlmICh0eXBlb2YoZGF0YSkgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkYXRhICcgKyBkYXRhICsgJyByZWZ1c2VkIGZyb20gZ290RGF0YSgpJyk7XG4gICAgICAgICAgICBpZiAoY2FsbEJhY2spIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbEJhY2soZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2xlYW4gZGF0YSBmcm9tIHJlbGF0aW9ucyBhbmQgcGVybWlzc2lvbnMgZm9yIHVzaW5nIGl0IGFmdGVyIG1vZGVsIHBhcnNpbmdcbiAgICAgICAgaWYgKCdfZXh0cmEnIGluIGRhdGEpeyBkZWxldGUgZGF0YS5fZXh0cmEgfVxuICAgICAgICB2YXIgVE9PTkUgPSBkYXRhLlRPT05FO1xuICAgICAgICB2YXIgVE9NQU5ZID0gZGF0YS5UT01BTlk7XG4gICAgICAgIHZhciBNQU5ZVE9NQU5ZID0gZGF0YS5NQU5ZVE9NQU5ZO1xuICAgICAgICB2YXIgUEVSTUlTU0lPTlMgPSBkYXRhLlBFUk1JU1NJT05TO1xuICAgICAgICB2YXIgUEEgPSBkYXRhLlBBO1xuICAgICAgICBkZWxldGUgZGF0YS5UT09ORTtcbiAgICAgICAgZGVsZXRlIGRhdGEuVE9NQU5ZO1xuICAgICAgICBkZWxldGUgZGF0YS5NQU5ZVE9NQU5ZO1xuICAgICAgICBkZWxldGUgZGF0YS5QRVJNSVNTSU9OUztcbiAgICAgICAgZGVsZXRlIGRhdGEuUEE7XG4gICAgICAgIGlmICghUEEpIHsgUEEgPSB7fTsgfVxuXG4gICAgICAgIC8vIGNsZWFuaW5nIGZyb20gdXNlbGVzcyBkZWxldGVkIGRhdGFcbiAgICAgICAgZGF0YSA9IExhenkoZGF0YSkuZmlsdGVyKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICByZXR1cm4gKCEoJ2RlbGV0ZWQnIGluIHYpIHx8ICgoayBpbiBtb2RlbENhY2hlKSkpO1xuICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCdtMm0nIGluIGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBtMm0gPSBkYXRhLm0ybTtcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhWydtMm0nXTtcbiAgICAgICAgfVxuICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24gKGRhdGEsIG1vZGVsTmFtZSkge1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUobW9kZWxOYW1lLCBmdW5jdGlvbiAobW9kZWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgbW9kZWxDbGFzcyA9IG1vZGVsO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLnJlc3VsdHMgJiYgKGRhdGEucmVzdWx0cy5sZW5ndGggPiAwKSAmJiAoZGF0YS5yZXN1bHRzWzBdLmNvbnN0cnVjdG9yID09IEFycmF5KSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhLnJlc3VsdHMgPSBMYXp5KGRhdGEucmVzdWx0cykubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIExhenkobW9kZWxDbGFzcy5maWVsZHNPcmRlcikuemlwKHgpLnRvT2JqZWN0KClcbiAgICAgICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0cyA9IExhenkoZGF0YS5yZXN1bHRzKTtcbiAgICAgICAgICAgICAgICB2YXIgZGVsZXRlZCA9IGRhdGEuZGVsZXRlZDtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIFBBKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBNUEEgPSBQQVttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICBMYXp5KHJlc3VsdHMpLmVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlY29yZC5pZCBpbiBNUEEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KE1QQVtyZWNvcmQuaWRdKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY29yZFtrXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gaW5kZXhpbmcgcmVmZXJlbmNlcyBieSBpdHMgSURcbiAgICAgICAgICAgICAgICB2YXIgaXRhYiA9IGdldEluZGV4KG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIHRhYmxlID0gaXRhYi5zb3VyY2U7XG5cbiAgICAgICAgICAgICAgICAvLyBvYmplY3QgZGVsZXRpb25cbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZWQuZm9yRWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0YWJsZVt4XTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4vKlxuICAgICAgICAgICAgICAgIExhenkoZGVsZXRlZCkuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGFibGVbeF07XG4gICAgICAgICAgICAgICAgfSk7XG4qL1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSByZXN1bHRzLmluZGV4QnkoJ2lkJyk7XG4gICAgICAgICAgICAgICAgdmFyIGlrID0gaWR4LmtleXMoKTtcbiAgICAgICAgICAgICAgICB2YXIgbm5ldyA9IGlrLmRpZmZlcmVuY2UoaXRhYi5rZXlzKCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh4KVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB2YXIgdXBkYXRlZCA9IGlrLmRpZmZlcmVuY2Uobm5ldyk7XG4gICAgICAgICAgICAgICAgLy8gcmVtb3Zpbmcgb2xkIGlkZW50aWNhbCB2YWx1ZXNcbiAgICAgICAgICAgICAgICB1cGRhdGVkID0gdXBkYXRlZC5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICF1dGlscy5zYW1lQXMoaWR4LmdldCh4KSwgaXRhYi5nZXQoeCkuYXNSYXcoKSk7XG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIC8vIGNsYXNzaWZ5IHJlY29yZHNcbiAgICAgICAgICAgICAgICB2YXIgcGVybXMgPSBkYXRhLnBlcm1pc3Npb25zID8gTGF6eShkYXRhLnBlcm1pc3Npb25zKSA6IExhenkoe30pO1xuICAgICAgICAgICAgICAgIHZhciBuZXdPYmplY3RzID0gbm5ldy5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCksIHBlcm1zLmdldCh4KSlcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vLy8gY2xhc3NpZnlpbmcgdXBkYXRlZFxuICAgICAgICAgICAgICAgIC8vdmFyIHVwZGF0ZWRPYmplY3RzID0gdXBkYXRlZC5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkscGVybXMuZ2V0KHgpKX0pO1xuICAgICAgICAgICAgICAgIC8vdmFyIHVvID0gdXBkYXRlZE9iamVjdHMudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIC8vdXBkYXRlZE9iamVjdHMgPSBMYXp5KHVvKS5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIFt4LHRhYmxlW3guaWRdXX0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGluZyBzaW5nbGUgb2JqZWN0c1xuICAgICAgICAgICAgICAgIHZhciBjaGFuZ2VkID0gW107XG4vLyAgICAgICAgICAgICAgICB2YXIgREFURUZJRUxEUyA9IE1PREVMX0RBVEVGSUVMRFNbbW9kZWxOYW1lXTtcbi8vICAgICAgICAgICAgICAgIHZhciBCT09MRklFTERTID0gTU9ERUxfQk9PTEZJRUxEU1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIHZhciBtb2RlbFJlZmVyZW5jZXMgPSBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLm1hcChmdW5jdGlvbihrKSB7IHJldHVybiBbaywxXX0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgdXBkYXRlZC5mb3JFYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvbGRJdGVtID0gdGFibGVbeF07XG4gICAgICAgICAgICAgICAgICAgIHZhciBvbGRDb3B5ID0gb2xkSXRlbS5jb3B5KCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdJdGVtID0gaWR4LmdldCh4KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0aW5nIGVhY2ggYXR0cmlidXRlIHNpbmd1bGFybHlcblxuICAgICAgICAgICAgICAgICAgICBMYXp5KG1vZGVsLmZpZWxkcykuZWFjaChmdW5jdGlvbihmaWVsZCwgZmllbGROYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2goZmllbGQudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JlZmVyZW5jZScgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9sZEl0ZW1bJ18nICsgZmllbGROYW1lXSA9IG5ld0l0ZW1bZmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTmFOIGlzIGNvbnZudGlvbmFsbHkgYSBjYWNoZSBkZWxldGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9sZEl0ZW1bZmllbGROYW1lXSA9IE5hTjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2RhdGUnOiB7b2xkSXRlbVtmaWVsZE5hbWVdID0gbmV3IERhdGUobmV3SXRlbVtmaWVsZE5hbWVdICogMTAwMCk7IGJyZWFrfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdkYXRldGltZSc6IHtvbGRJdGVtW2ZpZWxkTmFtZV0gPSBuZXcgRGF0ZShuZXdJdGVtW2ZpZWxkTmFtZV0gKiAxMDAwKTsgYnJlYWt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKG5ld0l0ZW1bZmllbGROYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBudWxsIDogeyBvbGRJdGVtW2ZpZWxkTmFtZV0gPSBudWxsOyBicmVhazsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ1QnIDogeyBvbGRJdGVtW2ZpZWxkTmFtZV0gPSB0cnVlOyBicmVhazsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ0YnIDogeyBvbGRJdGVtW2ZpZWxkTmFtZV0gPSBmYWxzZTsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIHRydWUgOiB7IG9sZEl0ZW1bZmllbGROYW1lXSA9IHRydWU7IGJyZWFrOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBmYWxzZSA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gZmFsc2U7IGJyZWFrOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDoge29sZEl0ZW1bZmllbGROYW1lXSA9IG5ld0l0ZW1bZmllbGROYW1lXX1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgICAgICAgICAgb2xkSXRlbVtmaWVsZE5hbWVdID0gbmV3SXRlbVtmaWVsZE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlZC5wdXNoKFtuZXdJdGVtLCBvbGRDb3B5XSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLy8vIHNlbmRpbmcgc2lnbmFsIGZvciB1cGRhdGVkIHZhbHVlc1xuICAgICAgICAgICAgICAgIGlmIChjaGFuZ2VkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCd1cGRhdGVkLScgKyBtb2RlbE5hbWUsIGNoYW5nZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyoqKioqKioqIFVwZGF0ZSB1bml2ZXJzZSAqKioqKioqKlxuICAgICAgICAgICAgICAgIHZhciBubyA9IG5ld09iamVjdHMudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIExhenkobm8pLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFibGVbeC5pZF0gPSB4XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gcmVidWxkaW5nIHJldmVyc2UgaW5kZXhlc1xuICAgICAgICAgICAgICAgIExhenkobW9kZWxDYWNoZVttb2RlbE5hbWVdLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgICAgICAgICBSRVZJRFhbbW9kZWxOYW1lICsgJy4nICsgcmVmXSA9IElEQlttb2RlbE5hbWVdLmdyb3VwQnkoJ18nICsgcmVmKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgbmV3IHZhbHVlc1xuICAgICAgICAgICAgICAgIGlmIChuby5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ25ldy0nICsgbW9kZWxOYW1lLCBMYXp5KG5vKSwgZGF0YS50b3RhbFJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIGlmIChkZWxldGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ2RlbGV0ZWQtJyArIG1vZGVsTmFtZSwgZGVsZXRlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHNlbmRpbmcgZXZlbnRzIGZvciBkYXRhIGFycml2ZWRcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdyZWNlaXZlZC0nICsgbW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuLyogICAgICAgIFxuICAgICAgICBpZiAoVE9PTkUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RPT05FJyk7XG4gICAgICAgICAgICBMYXp5KFRPT05FKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB1ZHggPSBnZXRVbmxpbmtlZChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFRPTUFOWSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVE9NQU5ZJyk7XG4gICAgICAgICAgICBMYXp5KFRPTUFOWSkuZWFjaChmdW5jdGlvbiAodmFscywgaW5kZXhOYW1lKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIEFTS0VEX1VOTElOS0VEKSkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9VTkxJTktFRFtpbmRleE5hbWVdID0gTGF6eShbXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIExhenkodmFscykuZWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfVU5MSU5LRURbaW5kZXhOYW1lXS5zb3VyY2UucHVzaChpZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoTUFOWVRPTUFOWSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTUFOWVRPTUFOWScpO1xuICAgICAgICAgICAgTGF6eShNQU5ZVE9NQU5ZKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBpbmRleE5hbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3QgPSBwYXJzZUludChpbmRleE5hbWUuc3BsaXQoJ3wnKVsxXSk7XG4gICAgICAgICAgICAgICAgaW5kZXhOYW1lID0gaW5kZXhOYW1lLnNwbGl0KCd8JylbMF07XG4gICAgICAgICAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIEFTS0VEX00yTSkpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfTTJNW2luZGV4TmFtZV0gPSBbe30sIHt9XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIE1JRFggPSBBU0tFRF9NMk1baW5kZXhOYW1lXVtmaXJzdF07XG4gICAgICAgICAgICAgICAgTGF6eSh2YWxzKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIE1JRFhbeCArICcnXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIE1JRFhbeF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIFxuKi9cbiAgICAgICAgaWYgKG0ybSkge1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290TTJNKG0ybSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFBFUk1JU1NJT05TKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RQZXJtaXNzaW9ucyhQRVJNSVNTSU9OUyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2FsbEJhY2spIHtcbiAgICAgICAgICAgIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ2dvdC1kYXRhJyk7XG4gICAgfTtcbiAgICB0aGlzLmdvdFBlcm1pc3Npb25zID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uICh2LCByZXNvdXJjZU5hbWUpIHtcbiAgICAgICAgICAgIExhenkodlswXSkuZWFjaChmdW5jdGlvbiAocm93LCBpZCkge1xuICAgICAgICAgICAgICAgIGlmICgocmVzb3VyY2VOYW1lIGluIElEQikgJiYgKGlkIGluIElEQltyZXNvdXJjZU5hbWVdLnNvdXJjZSkpe1xuICAgICAgICAgICAgICAgICAgICBJREJbcmVzb3VyY2VOYW1lXS5nZXQoaWQpLl9wZXJtaXNzaW9ucyA9IExhenkocm93KS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbeCwgdHJ1ZV1cbiAgICAgICAgICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChMYXp5KHZbMF0pLnNpemUoKSl7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgndXBkYXRlLXBlcm1pc3Npb25zLScgKyByZXNvdXJjZU5hbWUsIExhenkodlswXSkua2V5cygpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmVtaXQoJ3VwZGF0ZS1wZXJtaXNzaW9ucycpO1xuICAgIH07XG5cblxuICAgIHRoaXMuZ290TTJNID0gZnVuY3Rpb24obTJtKXtcbiAgICAgICAgTGF6eShtMm0pLmVhY2goZnVuY3Rpb24oZGF0YSwgaW5kZXhOYW1lKXtcbiAgICAgICAgICAgIHZhciBtMm1JbmRleCA9IGxpbmtlci5tMm1JbmRleFtpbmRleE5hbWVdO1xuICAgICAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uKG0pe1xuICAgICAgICAgICAgICAgIExhenkobSkuZWFjaChmdW5jdGlvbihkYXRhLHZlcmIpe1xuICAgICAgICAgICAgICAgICAgICBtMm1JbmRleFt2ZXJiXShkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtbTJtJyk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdyZWNlaXZlZC1tMm0tJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuZmV0Y2ggPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBjYWxsQmFjaykgeyAgLy9cbiAgICAgICAgLy8gaWYgYSBjb25uZWN0aW9uIGlzIGN1cnJlbnRseSBydW5uaW5nLCB3YWl0IGZvciBjb25uZWN0aW9uLlxuICAgICAgICBpZiAobW9kZWxOYW1lIGluIHdhaXRpbmdDb25uZWN0aW9ucyl7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBjYWxsQmFjayk7XG4gICAgICAgICAgICB9LDUwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBmZXRjaGluZyBhc3luY2hyb21vdXMgbW9kZWwgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgKGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgICAgICAvLyBpZiBkYXRhIGNhbWVzIGZyb20gcmVhbHRpbWUgY29ubmVjdGlvblxuICAgICAgICAgICAgICAgIGlmIChXMlBSRVNPVVJDRS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIGdldHRpbmcgZmlsdGVyIGZpbHRlcmVkIGJ5IGNhY2hpbmcgc3lzdGVtXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlciA9IGxpc3RDYWNoZS5maWx0ZXIobW9kZWwsZmlsdGVyKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBpZiBzb210aGluZyBpcyBtaXNzaW5nIG9uIG15IGxvY2FsIERCIFxuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzayBmb3IgbWlzc2luZ3MgYW5kIHBhcnNlIHNlcnZlciByZXNwb25zZSBpbiBvcmRlciB0byBlbnJpY2ggbXkgbG9jYWwgREIuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGFjaW5nIGxvY2sgZm9yIHRoaXMgbW9kZWxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KG1vZGVsTmFtZSArICcvbGlzdCcsIHtmaWx0ZXIgOiBmaWx0ZXJ9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsY2FsbEJhY2spO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgbG9ja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24ocmV0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVsZWFzZSBsb2NrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvbGlzdCcsIHNlbmREYXRhLGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR09UX0FMTC5zb3VyY2UucHVzaChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0ID0gZnVuY3Rpb24obW9kZWxOYW1lLCBpZHMsIGNhbGxCYWNrKXtcbiAgICAgICAgLy8gc2VhcmNoIG9iamVjdHMgZnJvbSBJREIuIElmIHNvbWUgaWQgaXMgbWlzc2luZywgaXQgcmVzb2x2ZSBpdCBieSB0aGUgc2VydmVyXG4gICAgICAgIC8vIGlmIGEgcmVxdWVzdCB0byB0aGUgc2FtZSBtb2RlbCBpcyBwZW5kaW5nLCB3YWl0IGZvciBpdHMgY29tcGxldGlvblxuICAgICAgICBcbiAgICAgICAgaWYgKGlkcy5jb25zdHJ1Y3RvciAhPT0gQXJyYXkpe1xuICAgICAgICAgICAgaWRzID0gW2lkc107XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgc29tZSBlbnRpdHkgaXMgbWlzc2luZyBcbiAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lICwge2lkOiBpZHN9LCBudWxsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICB2YXIgaXRhYiA9IElEQlttb2RlbE5hbWVdXG4gICAgICAgICAgICBmb3IgKHZhciBpZCBpbiBpZHMpe1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKGl0YWIuc291cmNlW2lkc1tpZF1dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxCYWNrKHJldCk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLmdvdE1vZGVsID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgZm9yICh2YXIgbW9kZWxOYW1lIGluIGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBtb2RlbCA9IGRhdGFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZVsnZGVzY3JpcHRpb246JyArIG1vZGVsTmFtZV0gPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSA9IG1ha2VNb2RlbENsYXNzKG1vZGVsKTtcbiAgICAgICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBJREIpKSB7XG4gICAgICAgICAgICAgICAgSURCW21vZGVsTmFtZV0gPSBMYXp5KHt9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmRlc2NyaWJlID0gZnVuY3Rpb24obW9kZWxOYW1lLCBjYWxsQmFjayl7XG4gICAgICAgIHZhciByZXQgPSBtb2RlbENhY2hlW21vZGVsTmFtZV07XG4gICAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHJldCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gd2FpdGluZ0Nvbm5lY3Rpb25zKSl7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBmYWlsZWRNb2RlbHMpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGNhY2hlS2V5ID0gJ2Rlc2NyaXB0aW9uOicgKyBtb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKGNhY2hlS2V5IGluIGxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmdvdE1vZGVsKEpTT04ucGFyc2UobG9jYWxTdG9yYWdlW2NhY2hlS2V5XSkpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2Rlc2NyaWJlJyxudWxsLCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdE1vZGVsKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sobW9kZWxDYWNoZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGVsTm90Rm91bmQuaGFuZGxlKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsZWRNb2RlbHNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgY29ubmVjdGlvblxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUobW9kZWxOYW1lLCBjYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAgICAgICAgXG4gICAgfTtcbiAgICB0aGlzLmFkZE1vZGVsSGFuZGxlciA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGRlY29yYXRvcikge1xuICAgICAgICB2YXIga2V5ID0gdXRpbHMuaGFzaChkZWNvcmF0b3IpO1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gYnVpbGRlckhhbmRsZXJzKSkgYnVpbGRlckhhbmRsZXJzW21vZGVsTmFtZV0gPSBuZXcgSGFuZGxlcigpO1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gYnVpbGRlckhhbmRsZXJVc2VkKSkgYnVpbGRlckhhbmRsZXJVc2VkW21vZGVsTmFtZV0gPSB7fTtcbiAgICAgICAgaWYgKGtleSBpbiBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXVtrZXldID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWxOYW1lIGluIG1vZGVsQ2FjaGUpIHtcbiAgICAgICAgICAgIGRlY29yYXRvcihtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVpbGRlckhhbmRsZXJzW21vZGVsTmFtZV0uYWRkSGFuZGxlcihkZWNvcmF0b3IpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzID0gZnVuY3Rpb24obW9kZWxOYW1lLCBhdHRyaWJ1dGVzKXtcbiAgICAgICAgdmFyIGFkZFByb3BlcnR5ID0gZnVuY3Rpb24obW9kZWwsIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICBhdHRyaWJ1dGVzLmZvckVhY2goZnVuY3Rpb24odmFsKXtcbiAgICAgICAgICAgIHZhciBrZXkgPSAncEE6JyArIG1vZGVsLm1vZGVsTmFtZSArICc6JyArIHZhbDtcbiAgICAgICAgICAgIHZhciBrYXR0ciA9ICdfXycgKyB2YWw7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobW9kZWwucHJvdG90eXBlLCB2YWwsIHtcbiAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmICghKGthdHRyIGluIHRoaXMpKXtcbiAgICAgICAgICAgICAgICAgIHZhciB2ID0gbG9jYWxTdG9yYWdlW2tleSArIHRoaXMuaWRdO1xuICAgICAgICAgICAgICAgICAgdGhpc1trYXR0cl0gPSB2P0pTT04ucGFyc2Uodik6bnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNba2F0dHJdO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgICAgICAgICB0aGlzW2thdHRyXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtrZXkgKyB0aGlzLmlkXSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBwZXJzaXN0ZW50QXR0cmlidXRlcykpIHsgcGVyc2lzdGVudEF0dHJpYnV0ZXNbbW9kZWxOYW1lXSA9IFtdOyB9XG4gICAgICAgIHZhciBhdHRycyA9IHBlcnNpc3RlbnRBdHRyaWJ1dGVzW21vZGVsTmFtZV07XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICB2YXIgbmV3QXR0cnMgPSBMYXp5KGF0dHJpYnV0ZXMpLmRpZmZlcmVuY2UoYXR0cnMpLnRvQXJyYXkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBuZXdBdHRycyA9IGF0dHJzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZXdBdHRycy5sZW5ndGgpe1xuICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBtb2RlbENhY2hlKXtcbiAgICAgICAgICAgICAgICBhZGRQcm9wZXJ0eShtb2RlbENhY2hlW21vZGVsTmFtZV0sIG5ld0F0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShhdHRycyxuZXdBdHRycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMub24oJ25ldy1tb2RlbCcsIGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgaWYgKG1vZGVsLm1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlcnMpe1xuICAgICAgICAgICAgYnVpbGRlckhhbmRsZXJzW21vZGVsLm1vZGVsTmFtZV0uaGFuZGxlKG1vZGVsQ2FjaGVbbW9kZWwubW9kZWxOYW1lXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1vZGVsLm1vZGVsTmFtZSBpbiBwZXJzaXN0ZW50QXR0cmlidXRlcyl7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyhtb2RlbC5tb2RlbE5hbWUpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLnF1ZXJ5ID0gZnVuY3Rpb24obW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBjYWxsQmFjayl7XG4gICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICB0aGlzLmRlc2NyaWJlKG1vZGVsTmFtZSxmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgICAgICAvLyBhcnJheWZpeSBhbGwgZmlsdGVyIHZhbHVlc1xuICAgICAgICAgICAgZmlsdGVyID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2LGspeyByZXR1cm4gW2ssQXJyYXkuaXNBcnJheSh2KT92Olt2XV19KS50b09iamVjdCgpO1xuICAgICAgICAgICAgdmFyIGZpbHRlckZ1bmN0aW9uID0gdXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgIHZhciBpZHggPSBnZXRJbmRleChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgdGhzLmZldGNoKG1vZGVsTmFtZSxmaWx0ZXIsdG9nZXRoZXIsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKGlkeC5maWx0ZXIoZmlsdGVyRnVuY3Rpb24pLnZhbHVlcygpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICB9O1xuICAgIHRoaXMuZGVsZXRlID0gZnVuY3Rpb24obW9kZWxOYW1lLCBpZHMsIGNhbGxCYWNrKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9kZWxldGUnLCB7IGlkIDogaWRzfSwgY2FsbEJhY2spO1xuICAgIH07XG5cbiAgICB0aGlzLmNvbm5lY3QgPSBmdW5jdGlvbiAoY2FsbEJhY2spIHtcbiAgICAgICAgaWYgKHRoaXMuY29ubmVjdGlvbi5pc0xvZ2dlZEluKSB7XG4gICAgICAgICAgICBjYWxsQmFjaygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmNvbm5lY3QoY2FsbEJhY2spO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZnVuY3Rpb24gcmVXaGVlbE9STShlbmRQb2ludCwgbG9naW5GdW5jKXtcbiAgICB0aGlzLiRvcm0gPSBuZXcgYmFzZU9STShuZXcgdXRpbHMucmVXaGVlbENvbm5lY3Rpb24oZW5kUG9pbnQsIGxvZ2luRnVuYyksdGhpcyk7XG4gICAgdGhpcy5vbiA9IHRoaXMuJG9ybS5vbi5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5lbWl0ID0gdGhpcy4kb3JtLmVtaXQuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMudW5iaW5kID0gdGhpcy4kb3JtLnVuYmluZC5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5vbmNlID0gdGhpcy4kb3JtLm9uY2U7XG4gICAgdGhpcy5hZGRNb2RlbEhhbmRsZXIgPSB0aGlzLiRvcm0uYWRkTW9kZWxIYW5kbGVyLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzID0gdGhpcy4kb3JtLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLnV0aWxzID0gdXRpbHM7XG4gICAgdGhpcy5sb2dvdXQgPSB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dvdXQuYmluZCh0aGlzLiRvcm0uY29ubmVjdGlvbik7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbigpe1xuICAgIHZhciBjb25uZWN0aW9uID0gdGhpcy4kb3JtLmNvbm5lY3Rpb247XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChmdW5jdGlvbihjYWxsQmFjayxyZWplY3Qpe1xuICAgICAgICBjb25uZWN0aW9uLmNvbm5lY3QoY2FsbEJhY2spO1xuICAgIH0pKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dpbih1c2VybmFtZSwgcGFzc3dvcmQsIGFjY2VwdCk7ICAgIFxuICAgIH0pLmJpbmQodGhpcykpO1xuICAgIFxufTtcblxucmVXaGVlbE9STS5wcm90b3R5cGUubG9nb3V0ID0gZnVuY3Rpb24odXJsKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9nb3V0KCk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldE1vZGVsID0gZnVuY3Rpb24obW9kZWxOYW1lKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlc2NyaWJlKG1vZGVsTmFtZSxhY2NlcHQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzaW5nbGUgPSBmYWxzZTtcbiAgICB2YXIgbW9kTmFtZSA9IG1vZGVsTmFtZTtcbiAgICB2YXIgZmlsdGVyO1xuICAgIGlmICh0eXBlb2YgaWRzID09PSAnbnVtYmVyJykge1xuICAgICAgICBzaW5nbGUgPSB0cnVlO1xuICAgICAgICBmaWx0ZXIgPSB7IGlkIDogW2lkc119O1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShpZHMpKXtcbiAgICAgICAgZmlsdGVyID0geyBpZCA6IGlkcyB9O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGlkcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgZmlsdGVyID0gaWRzO1xuICAgIH0gZWxzZSBpZiAoaWRzID09PSBudWxsKSB7XG4gICAgICAgIGZpbHRlciA9IHt9O1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5xdWVyeShtb2RlbE5hbWUsIGZpbHRlciwgbnVsbCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2luZ2xlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQoZGF0YS5sZW5ndGggPyBkYXRhWzBdIDogbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLypcbnJlV2hlZWxPUk0ucHJvdG90eXBlLnF1ZXJ5ID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZmlsdGVyLCByZWxhdGVkKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdmFyIHRvZ2V0aGVyID0gbnVsbDtcbiAgICAgICAgaWYgKHJlbGF0ZWQgJiYgKHJlbGF0ZWQuY29uc3RydWN0b3IgPT09IEFycmF5KSAmJiAocmVsYXRlZC5sZW5ndGgpKXtcbiAgICAgICAgICAgIHRvZ2V0aGVyID0gcmVsYXRlZDtcbiAgICAgICAgfSBlbHNlIGlmIChyZWxhdGVkICYmIChyZWxhdGVkLmNvbnN0cnVjdG9yID09PSBTdHJpbmcpICYmIChyZWxhdGVkLmxlbmd0aCkpe1xuICAgICAgICAgICAgdG9nZXRoZXIgPSByZWxhdGVkLnNwbGl0KCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn07XG4qL1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBpZHMpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5kZWxldGUobW9kZWxOYW1lLCBpZHMsIGFjY2VwdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KVxufTtcblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0TG9nZ2VkVXNlciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy4kb3JtLmNvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnVzZXJfaWQpXG4gICAgICAgIHJldHVybiB0aGlzLmdldCgnYXV0aF91c2VyJyx0aGlzLiRvcm0uY29ubmVjdGlvbi5jYWNoZWRTdGF0dXMudXNlcl9pZCk7XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCkge1xuICAgICAgICAgICAgc2VsZi5vbmNlKCdsb2dnZWQtaW4nLGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmdldCgnYXV0aF91c2VyJywgdXNlcikudGhlbihhY2NlcHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuJHNlbmRUb0VuZHBvaW50ID0gZnVuY3Rpb24gKHVybCwgZGF0YSl7XG4gICAgcmV0dXJuIHRoaXMuJG9ybS4kcG9zdCh1cmwsIGRhdGEpO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCl7XG4gICAgcmV0dXJuIHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ2luKHVzZXJuYW1lLHBhc3N3b3JkKTtcbn1cbiJdfQ==
