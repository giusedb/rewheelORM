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
                //            if (value !== result[this.id]){
                setter.call(this, value);
                if (this.id in result) {
                    delete result[this.id];
                }    //            }
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
                }, 'new-' + ext_ref, 'deleted-' + ext_ref, 'updated-' + ext_ref, 'new-model-' + ext_ref, 'updated-' + Klass.modelName);
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
                    updated.forEach(function (x) {
                        var oldItem = table[x];
                        var oldCopy = oldItem.copy();
                        var newItem = new modelClass(idx.get(x));
                        // update old item to match new item;
                        Lazy(model.fields).keys().each(function (k) {
                            oldItem[k] = newItem[k];
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJjb25uZWN0aW9uLmpzIiwidG91Y2hlci5qcyIsInZhY3V1bWNhY2hlci5qcyIsImF1dG9saW5rZXIuanMiLCJsaXN0Y2FjaGVyLmpzIiwibWFueXRvbWFueS5qcyIsImNhY2hlci5qcyIsIm9ybS5qcyJdLCJuYW1lcyI6WyJIYW5kbGVyIiwiaGFuZGxlcnMiLCJzdHJIYW5kbGVycyIsInByb3RvdHlwZSIsImFkZEhhbmRsZXIiLCJoYW5kbGVyIiwic3RySGFuZGxlciIsInV0aWxzIiwiaGFzaCIsInRvU3RyaW5nIiwicHVzaCIsImhhbmRsZSIsImFyZ3MiLCJBcnJheSIsInNsaWNlIiwiY2FsbCIsImFyZ3VtZW50cyIsImZvckVhY2giLCJmdW5jIiwiYXBwbHkiLCJoYW5kbGVCeSIsInRocyIsIk5hbWVkRXZlbnRNYW5hZ2VyIiwiZXZlbnRzIiwiaGFuZGxlcklkIiwiaWR4SWQiLCJvbiIsIm5hbWUiLCJpZCIsImVtaXQiLCJldmVudCIsInVuYmluZCIsImNvdW50IiwiTGF6eSIsImVhY2giLCJ2IiwiayIsImlkeCIsIm4iLCJyZXZlcnNlIiwieCIsInNwbGljZSIsIm9uY2UiLCJldmVudE5hbWUiLCJoYW5kbGVyRnVuY3Rpb24iLCJzZWxmIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsIm1vY2siLCJyZW5hbWVGdW5jdGlvbiIsImZuIiwiRnVuY3Rpb24iLCJiaW5kIiwiY2FjaGVkIiwia2V5Iiwid3JhcHBlciIsImxvZyIsImNvbnNvbGUiLCJ4ZHIiLCJ1cmwiLCJkYXRhIiwiYXBwbGljYXRpb24iLCJ0b2tlbiIsImZvcm1FbmNvZGUiLCJQcm9taXNlIiwiYWNjZXB0IiwicmVqZWN0IiwicmVxIiwiWE1MSHR0cFJlcXVlc3QiLCJvbnJlYWR5c3RhdGVjaGFuZ2UiLCJyZWFkeVN0YXRlIiwicmVzcG9uc2VEYXRhIiwiSlNPTiIsInBhcnNlIiwicmVzcG9uc2VUZXh0IiwiYSIsInJlc3BvbnNlIiwic3RhdHVzIiwicmVxdWVzdCIsIlhEb21haW5SZXF1ZXN0Iiwib25sb2FkIiwic3RhdHVzVGV4dCIsIkVycm9yIiwib3BlbiIsIm9uZXJyb3IiLCJzZXRSZXF1ZXN0SGVhZGVyIiwiX190b2tlbl9fIiwic2l6ZSIsInN0cmluZ2lmeSIsIm1hcCIsImVuY29kZVVSSSIsInRvQXJyYXkiLCJqb2luIiwic2VuZCIsImNhcGl0YWxpemUiLCJzIiwidG9VcHBlckNhc2UiLCJ0b0xvd2VyQ2FzZSIsInN0ciIsInJldCIsImxlbmd0aCIsImNoYXJDb2RlQXQiLCJtYWtlRmlsdGVyIiwibW9kZWwiLCJmaWx0ZXIiLCJ1bmlmaWVyIiwiZG9udFRyYW5zbGF0ZUZpbHRlciIsInNvdXJjZSIsInZhbHMiLCJmaWVsZCIsImlzQXJyYXkiLCJmaWVsZHMiLCJ0eXBlIiwiY29uc3RydWN0b3IiLCJOdW1iZXIiLCJzYW1lQXMiLCJ5IiwicGx1cmFsaXplIiwiYmVmb3JlQ2FsbCIsImJlZm9yZSIsImRlY29yYXRvciIsInRoZW4iLCJjbGVhblN0b3JhZ2UiLCJsb2NhbFN0b3JhZ2UiLCJrZXlzIiwiY2xlYW5EZXNjcmlwdGlvbiIsInN0YXJ0c1dpdGgiLCJjaHIiLCJzcGxpdCIsInBlcm11dGF0aW9ucyIsImFyciIsIndhaXRGb3IiLCJjYWxsQmFjayIsIndhaXRlciIsInNldFRpbWVvdXQiLCJib29sIiwiQm9vbGVhbiIsIm5vb3AiLCJ0ek9mZnNldCIsIkRhdGUiLCJnZXRUaW1lem9uZU9mZnNldCIsInRyYW5zRmllbGRUeXBlIiwiZGF0ZSIsImRhdGV0aW1lIiwic3RyaW5nIiwidGV4dCIsImludGVnZXIiLCJwYXJzZUludCIsImZsb2F0IiwicGFyc2VGbG9hdCIsIlNUQVRVU0tFWSIsIlJlYWx0aW1lQ29ubmVjdGlvbiIsImVuZFBvaW50Iiwicnd0Q29ubmVjdGlvbiIsImNvbm5lY3Rpb24iLCJTb2NrSlMiLCJvbm9wZW4iLCJ0ZW5hbnQiLCJvbm1lc3NhZ2UiLCJlIiwib25jbG9zZSIsIndzQ29ubmVjdCIsImNhY2hlZFN0YXR1cyIsImNsb3NlIiwicmVXaGVlbENvbm5lY3Rpb24iLCJnZXRMb2dpbiIsImVuZHNXaXRoIiwiaXNDb25uZWN0ZWQiLCJpc0xvZ2dlZEluIiwiJHBvc3QiLCJwcm9taXNlIiwieGhyIiwiZm9yY2UiLCJzdGF0dXNXYWl0aW5nIiwidXBkYXRlU3RhdHVzIiwibGFzdEJ1aWxkIiwibGFzdF9idWlsZCIsInVzZXJfaWQiLCJvbGRTdGF0dXMiLCJsb2dpbkluZm8iLCJPYmplY3QiLCJsb2dpbiIsInVzZXJuYW1lIiwicGFzc3dvcmQiLCJvYmoiLCJyZWFsdGltZUVuZFBvaW50Iiwid3NDb25uZWN0aW9uIiwidXNlcmlkIiwiZXJyb3IiLCJsb2dvdXQiLCJvayIsImNvbm5lY3QiLCJUb3VjaGVyIiwidG91Y2hlZCIsInRvdWNoIiwidCIsIlZhY3V1bUNhY2hlciIsImFza2VkIiwicGtJbmRleCIsIm1pc3NpbmciLCJhc2siLCJsYXp5IiwiY29udGFpbnMiLCJnZXRBc2tlZEluZGV4IiwibWlzc2luZ3MiLCJ1bmlxdWUiLCJBdXRvTGlua2VyIiwiYWN0aXZlcyIsIklEQiIsIlcyUFJFU09VUkNFIiwibGlzdENhY2hlIiwibWFpbkluZGV4IiwiZm9yZWlnbktleXMiLCJtMm0iLCJtMm1JbmRleCIsInBlcm1pc3Npb25zIiwiaW5kZXgiLCJnZXRJbmRleEZvciIsInJlZmVyZW5jZXMiLCJyZWZlcmVuY2UiLCJpbmRleE5hbWUiLCJ0byIsInJlZmVyZW5jZWRCeSIsImJ5IiwibWFueVRvTWFueSIsInJlbGF0aW9uIiwiTWFueVRvTWFueVJlbGF0aW9uIiwibTJtR2V0IiwiY29sbGVjdGlvbiIsImdvdERhdGEiLCJnZXRNMk0iLCJsaW5rVW5saW5rZWQiLCJ2YWx1ZXMiLCJzdW0iLCJjaGFuZ2VkIiwiaW5kZXhlcyIsIklOREVYIiwiZ2V0dGVyIiwiaWRzIiwib3RoZXJJbmRleCIsImRlc2NyaWJlIiwiZmxhdHRlbiIsIm1vZGVsTmFtZSIsImlkYiIsImZldGNoIiwibWFpblJlc291cmNlIiwiZmllbGROYW1lIiwidG9PYmplY3QiLCJyZXNvdXJjZU5hbWUiLCJnb3RQZXJtaXNzaW9ucyIsIlBFUk1JU1NJT05TIiwic2V0SW50ZXJ2YWwiLCJMaXN0Q2FjaGVyIiwiZ290QWxsIiwiY29tcG9zaXRlQXNrZWQiLCJjYXJ0ZXNpYW5Qcm9kdWN0MSIsImIiLCJjYXJ0ZXNpYW5Qcm9kdWN0IiwiZXhwbG9kZUZpbHRlciIsInByb2R1Y3QiLCJyIiwiZmlsdGVyU2luZ2xlIiwidGVzdE9ubHkiLCJkaWZmZXJlbmNlIiwiY2xlYW5Db21wb3NpdGVzIiwiZmlsdGVyTGVuIiwiaXRlbXMiLCJpdGVtIiwiZ290Iiwic2luZ2xlIiwic29tZSIsImYiLCJleHBsb2RlZCIsInBhcnRpYWxzIiwiYmFkIiwicGx1Y2siLCJhZGQiLCJmaW5kIiwiZ2V0MCIsImdldDEiLCJkZWwiLCJsIiwiY2FjaGVkUHJvcGVydHlCeUV2ZW50cyIsInByb3RvIiwicHJvcGVydHlOYW1lIiwic2V0dGVyIiwicmVzdWx0Iiwib3JtIiwicHJvcGVydHlEZWYiLCJ2YWx1ZSIsImRlZmluZVByb3BlcnR5IiwiVmFsaWRhdGlvbkVycm9yIiwicmVzb3VyY2UiLCJfcmVzb3VyY2UiLCJmb3JtSWR4IiwiZXJyb3JzIiwiYmFzZU9STSIsIm9wdGlvbnMiLCJleHRPUk0iLCJTdHJpbmciLCJjb25uZWN0ZWQiLCJ3cyIsImluZm8iLCJvbk1lc3NhZ2VKc29uIiwib25NZXNzYWdlVGV4dCIsIm1lc3NhZ2UiLCJzZW50RGF0YSIsIndhaXRpbmdDb25uZWN0aW9ucyIsImF1dGhfZ3JvdXAiLCJJRFgiLCJSRVZJRFgiLCJidWlsZGVySGFuZGxlcnMiLCJidWlsZGVySGFuZGxlclVzZWQiLCJwZXJzaXN0ZW50QXR0cmlidXRlcyIsImV2ZW50SGFuZGxlcnMiLCJwZXJtaXNzaW9uV2FpdGluZyIsIm1vZGVsQ2FjaGUiLCJmYWlsZWRNb2RlbHMiLCJsaW5rZXIiLCJ3aW5kb3ciLCJ2YWxpZGF0aW9uRXZlbnQiLCJjdXJyZW50Q29udGV4dCIsInNhdmluZ0Vycm9ySGFubGRlciIsImdldEluZGV4IiwiZ2V0VW5saW5rZWQiLCJVTkxJTktFRCIsIlBlcm1pc3Npb25UYWJsZSIsImtsYXNzIiwic2F2ZSIsImNiIiwibXlQZXJtcyIsImdyb3VwX2lkIiwicGVybWlzc2lvbkxpc3QiLCJwIiwicGVybXMiLCJhbGxQZXJtaXNzaW9ucyIsImluZGV4T2YiLCJtYWtlTW9kZWxDbGFzcyIsIl9tb2RlbCIsInJlYWRhYmxlIiwid3JpdGFibGUiLCJwcml2YXRlQXJncyIsIm1lcmdlIiwiZnVuY1N0cmluZyIsIktsYXNzIiwicmVmX3RyYW5zbGF0aW9ucyIsImludmVyc2VfcmVmZXJlbmNlcyIsInJlZmVyZW50cyIsImZpZWxkc09yZGVyIiwiZmllbGRPcmRlciIsInJlcHJlc2VudGF0aW9uIiwiZGVsZXRlIiwiX3Blcm1pc3Npb25zIiwiYWxsX3Blcm1zIiwib2JqZWN0X2lkIiwiZ3JvdXBlZCIsInVua25vd25fZ3JvdXBzIiwiZ3JvdXBCeSIsIm8iLCJhc1JhdyIsIklEIiwiYXJnIiwiY29udGV4dCIsImNvcHkiLCJhc3IiLCJjb25jYXQiLCJzYXZlTXVsdGkiLCJvYmplY3RzIiwic2NvcGUiLCJyYXciLCJkZWxldGFibGUiLCJtdWx0aXBsZSIsImVsZW1zIiwidGFiIiwib2JqcyIsInJlc3VsdHMiLCJleHRyYV92ZXJicyIsImZ1bmNOYW1lIiwiZGRhdGEiLCJzYXZlUEEiLCJUIiwib28iLCJQQSIsIkZzIiwiZmllbGRJZHgiLCJ0YXAiLCJpbmRleEJ5Iiwid2lkZ2V0IiwicmVmIiwiZXh0X3JlZiIsImxvY2FsX3JlZiIsIlR5cGVFcnJvciIsInJldkluZGV4IiwiaGFzT3duUHJvcGVydHkiLCJvcHRzIiwicXVlcnkiLCJmaXJzdCIsIm9tb2RlbE5hbWUiLCJ2YWxpZGF0b3JzIiwidW5saW5rUmVmZXJlbmNlIiwiaW5zdGFuY2UiLCJpbnN0YW5jZXMiLCJvbW9kZWwiLCJsaW5rUmVmZXJlbmNlIiwicmVmcyIsIklOREVYX00yTSIsIlcyUF9QT1NUIiwiX2V4dHJhIiwiVE9PTkUiLCJUT01BTlkiLCJNQU5ZVE9NQU5ZIiwibW9kZWxDbGFzcyIsInppcCIsImRlbGV0ZWQiLCJNUEEiLCJyZWNvcmQiLCJpdGFiIiwidGFibGUiLCJpayIsIm5uZXciLCJ1cGRhdGVkIiwibmV3T2JqZWN0cyIsIm9sZEl0ZW0iLCJvbGRDb3B5IiwibmV3SXRlbSIsIm5vIiwidG90YWxSZXN1bHRzIiwidWR4IiwiQVNLRURfVU5MSU5LRUQiLCJBU0tFRF9NMk0iLCJNSURYIiwiZ290TTJNIiwicm93IiwibSIsInZlcmIiLCJ0b2dldGhlciIsInNlbmREYXRhIiwiR09UX0FMTCIsImdvdE1vZGVsIiwiY2FjaGVLZXkiLCJtb2RlbE5vdEZvdW5kIiwiYWRkTW9kZWxIYW5kbGVyIiwiYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMiLCJhdHRyaWJ1dGVzIiwiYWRkUHJvcGVydHkiLCJ2YWwiLCJrYXR0ciIsInNldCIsImF0dHJzIiwibmV3QXR0cnMiLCJmaWx0ZXJGdW5jdGlvbiIsInJlV2hlZWxPUk0iLCJsb2dpbkZ1bmMiLCIkb3JtIiwiZ2V0TW9kZWwiLCJtb2ROYW1lIiwicmVsYXRlZCIsImdldExvZ2dlZFVzZXIiLCJ1c2VyIiwiJHNlbmRUb0VuZHBvaW50Il0sIm1hcHBpbmdzIjoiOzs7SUFBQSxhO0lBRUEsU0FBQUEsT0FBQSxHQUFBO0FBQUEsUUFDQSxLQUFBQyxRQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsUUFFQSxLQUFBQyxXQUFBLEdBQUEsRUFBQSxDQUZBO0FBQUEsSztJQUdBLEM7SUFFQUYsT0FBQSxDQUFBRyxTQUFBLENBQUFDLFVBQUEsR0FBQSxVQUFBQyxPQUFBLEVBQUE7QUFBQSxRQUNBLElBQUFDLFVBQUEsR0FBQUMsS0FBQSxDQUFBQyxJQUFBLENBQUFILE9BQUEsQ0FBQUksUUFBQSxFQUFBLENBQUEsQ0FEQTtBQUFBLFFBRUEsSUFBQSxDQUFBLENBQUFILFVBQUEsSUFBQSxLQUFBSixXQUFBLENBQUEsRUFBQTtBQUFBLFlBQ0Es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cyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gSGFuZGxlcigpe1xuICAgIHRoaXMuaGFuZGxlcnMgPSBbXTtcbiAgICB0aGlzLnN0ckhhbmRsZXJzID0ge307XG59O1xuXG5IYW5kbGVyLnByb3RvdHlwZS5hZGRIYW5kbGVyID0gZnVuY3Rpb24gKGhhbmRsZXIpe1xuICAgIHZhciBzdHJIYW5kbGVyID0gdXRpbHMuaGFzaChoYW5kbGVyLnRvU3RyaW5nKCkpO1xuICAgIGlmICghKHN0ckhhbmRsZXIgaW4gdGhpcy5zdHJIYW5kbGVycykpe1xuICAgICAgICB0aGlzLnN0ckhhbmRsZXJzW3N0ckhhbmRsZXJdID0gaGFuZGxlcjtcbiAgICAgICAgdGhpcy5oYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH1cbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApO1xuICAgIHRoaXMuaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihmdW5jKXtcbiAgICAgICAgZnVuYy5hcHBseShudWxsLGFyZ3MpO1xuICAgIH0pXG59O1xuSGFuZGxlci5wcm90b3R5cGUuaGFuZGxlQnkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgIHZhciB0aHMgPSBhcmd1bWVudHNbMF07XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KHRocyxhcmdzKTtcbiAgICB9KVxufTtcblxuXG5mdW5jdGlvbiBOYW1lZEV2ZW50TWFuYWdlciAoKXtcbiAgICB2YXIgZXZlbnRzID0ge307XG4gICAgdmFyIGhhbmRsZXJJZCA9IHt9O1xuICAgIHZhciBpZHhJZCA9IDA7XG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKG5hbWUsIGZ1bmMpe1xuICAgICAgICBpZiAoIShuYW1lIGluIGV2ZW50cykpe1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdID0gbmV3IEFycmF5KCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkID0gaWR4SWQgKys7XG4gICAgICAgIGV2ZW50c1tuYW1lXS5wdXNoKGZ1bmMpO1xuICAgICAgICBoYW5kbGVySWRbaWRdID0gZnVuYztcbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH07XG4gICAgdGhpcy5lbWl0ID0gZnVuY3Rpb24obmFtZSl7XG4gICAgICAgIGlmIChuYW1lIGluIGV2ZW50cyl7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKTtcbiAgICAgICAgICAgIGV2ZW50c1tuYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgICAgICBldmVudC5hcHBseShudWxsLGFyZ3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMudW5iaW5kID0gZnVuY3Rpb24oaGFuZGxlcil7XG4gICAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICAgIGlmIChoYW5kbGVyIGluIGhhbmRsZXJJZCl7XG4gICAgICAgICAgICB2YXIgZnVuYyA9IGhhbmRsZXJJZFtoYW5kbGVyICsgJyddO1xuICAgICAgICAgICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbiBpbiB2KXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZbbl0gPT09IGZ1bmMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWR4LnB1c2gobik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlkeC5yZXZlcnNlKCkuZm9yRWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgdi5zcGxpY2UoeCwxKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBoYW5kbGVySWRbaGFuZGxlcl07XG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIENhbGwgZXZlbnQgb25jZVxuICAgICAqL1xuICAgIHRoaXMub25jZSA9IGZ1bmN0aW9uKGV2ZW50TmFtZSwgaGFuZGxlckZ1bmN0aW9uKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGhhbmRsZXIgPSB0aGlzLm9uKGV2ZW50TmFtZSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGhhbmRsZXJGdW5jdGlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgc2VsZi51bmJpbmQoaGFuZGxlcik7XG4gICAgICAgIH0pXG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2FjaGVkS2V5SWR4ID0gMDtcblxudmFyIG51bGxTdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICcnfTtcblxuZnVuY3Rpb24gbW9ja09iamVjdCgpe1xuICAgIHJldHVybiBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbih0YXJnZXQsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbmFtZSAgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSA9PT0gJ3RvU3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbFN0cmluZztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXRpbHMubW9jaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRbbmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG4vKlxudmFyICRQT1NUID0gZnVuY3Rpb24odXJsLCBkYXRhLCBjYWxsQmFjaywgZXJyb3JCYWNrLGhlYWRlcnMpe1xuICAgIHZhciBvcHRzID0ge1xuICAgICAgICBhY2NlcHRzIDogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICB1cmwgOiB1cmwsXG4gICAgICAgIGRhdGEgOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgZGF0YVR5cGUgOiAnanNvbicsXG4gICAgICAgIHN1Y2Nlc3MgOiBjYWxsQmFjayxcbiAgICAgICAgZXJyb3IgOiBlcnJvckJhY2ssXG4gICAgICAgIG1ldGhvZCA6ICdQT1NUJyxcbiAgICAgICAgY29udGVudFR5cGUgOiAnYXBwbGljYXRpb24vanNvbidcbiAgICB9O1xuICAgIGlmIChoZWFkZXJzKXtcbiAgICAgICAgb3B0cy5oZWFkZXJzID0gaGVhZGVycztcbiAgICAgICAgb3B0cy5jcm9zc0RvbWFpbiA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiAkLmFqYXgob3B0cyk7XG59XG5cblxuZnVuY3Rpb24gcmVXaGVlbENvbm5lY3Rpb24oZW5kUG9pbnQsIGdldExvZ2luKXtcbiAgICAvLyBtYWluIFxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmdldExvZ2luID0gZ2V0TG9naW47XG4gICAgdGhpcy5ldmVudHMgPSBuZXcgTmFtZWRFdmVudE1hbmFnZXIoKVxuICAgIHRoaXMuJFBPU1QgPSAkUE9TVC5iaW5kKHRoaXMpO1xuICAgIHRoaXMub3B0aW9ucyA9IHtlbmRQb2ludCA6IGVuZFBvaW50fTtcbiAgICB0aGlzLm9uID0gdGhpcy5ldmVudHMub24uYmluZCh0aGlzKTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbihzdGF0dXMsIGNhbGxCYWNrLCBlcnJvcikge1xuICAgIGlmIChzdGF0dXMpIHtcbiAgICAgICAgdmFyIGlzTG9nZ2VkID0gKHN0YXR1cy51c2VyX2lkICYmICF0aGlzLm9wdGlvbnMudXNlcl9pZCApO1xuICAgICAgICBmb3IgKHZhciB4IGluIHN0YXR1cyl7IHRoaXMub3B0aW9uc1t4XSA9IHN0YXR1c1t4XTsgfVxuICAgICAgICBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG4gICAgICAgIGlmIChpc0xvZ2dlZCkge1xuICAgICAgICAgICAgdGhpcy5ldmVudHMuZW1pdCgnbG9naW4nLCB0aGlzLm9wdGlvbnMudXNlcl9pZCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudXNlcl9pZCAmJiB0aGlzLmdldExvZ2luKXtcbiAgICAgICAgdmFyIGxvZ0luZm8gPSB0aGlzLmdldExvZ2luKGVycm9yKTtcbiAgICAgICAgaWYgKGxvZ0luZm8uY29uc3RydWN0b3IgPT09IE9iamVjdCl7XG4gICAgICAgICAgICB0aGlzLmxvZ2luKGxvZ0luZm8udXNlcm5hbWUsIGxvZ0luZm8ucGFzc3dvcmQpXG4gICAgICAgICAgICAudGhlbigoZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhzdGF0dXMsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgICAgICB9IGVsc2UgaWYgKGxvZ0luZm8uY29uc3RydWN0b3IgPT09IFByb21pc2UpIHtcbiAgICAgICAgICAgIGxvZ0luZm8udGhlbigoZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgICAgICAgICB2YXIgeCA9IHRoaXMubG9naW4ob2JqLnVzZXJuYW1lLG9iai5wYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgdmFyIG1hbmFnZUVycm9yID0gKGZ1bmN0aW9uKGJhZCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKG51bGwsY2FsbEJhY2ssYmFkLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9KS5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgICAgIGlmIChjYWxsQmFjayl7XG4gICAgICAgICAgICAgICAgICAgIHgudGhlbihjYWxsQmFjayxtYW5hZ2VFcnJvcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgeC50aGVuKG51bGwsIG1hbmFnZUVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHRoaXMub3B0aW9ucyk7XG4gICAgfSAgICBcbn1cblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnN0YXR1cyA9IGZ1bmN0aW9uKGNhbGxCYWNrLCBmb3JjZSl7XG4gICAgaWYgKCgnbGFzdFJXVFN0YXR1cycgaW4gbG9jYWxTdG9yYWdlKSAmJiAhZm9yY2UpIHtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgdmFyIHN0YXR1cyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoc3RhdHVzLGNhbGxCYWNrKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdGF0dXMoY2FsbEJhY2ssIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYWxsQmFjayAmJiBjYWxsQmFjayhzdGF0dXMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fc3RhdHVzX2NhbGxpbmcpe1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLnN0YXR1cyhjYWxsQmFjayk7XG4gICAgICAgIH0sNTApO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy50aW1lc3RhbXApe1xuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayh0aGlzLm9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXR1c19jYWxsaW5nID0gdHJ1ZTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdCgnYXBpL3N0YXR1cycsbnVsbCxmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMgPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xuICAgICAgICAgICAgc2VsZi5fc3RhdHVzX2NhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHNlbGYudXBkYXRlU3RhdHVzKHN0YXR1cyxjYWxsQmFjayk7XG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgfVxufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLiRwb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLGNhbGxCYWNrKXtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIGlmICghZGF0YSl7XG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIHZhciBoZWFkZXJzID0geyBcbiAgICAgICAgICAgIHRva2VuIDogdGhpcy5vcHRpb25zLnRva2VuLFxuICAgICAgICAgICAgYXBwbGljYXRpb24gOiB0aGlzLm9wdGlvbnMuYXBwbGljYXRpb25cbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaGVhZGVycyA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5vcHRpb25zLmVuZFBvaW50ICsgdXJsLCBkYXRhLCB0aHMub3B0aW9ucy5hcHBsaWNhdGlvbiwgdGhzLm9wdGlvbnMudG9rZW4pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZScsIHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzICsgJy1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7IGNhbGxCYWNrKCB4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQgKX07XG4gICAgICAgICAgICAgICAgYWNjZXB0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItanNvbicsIHhoci5yZXNwb25zZURhdGEsIHhoci5zdGF0dXMsIHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1qc29uLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VEYXRhLHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1odHRwJyx4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItaHR0cC0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCl7XG4gICAgdmFyIHVybCA9IHRoaXMub3B0aW9ucy5lbmRQb2ludCArICdhcGkvbG9naW4nO1xuICAgIHZhciBjb25uZWN0aW9uID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih1cmwseyB1c2VybmFtZTogdXNlcm5hbWUsIHBhc3N3b3JkIDogcGFzc3dvcmR9LCBudWxsLGNvbm5lY3Rpb24ub3B0aW9ucy50b2tlbiwgdHJ1ZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbi51cGRhdGVTdGF0dXMoeGhyLnJlc3BvbnNlRGF0YSk7XG4gICAgICAgICAgICAgICAgYWNjZXB0KHN0YXR1cyk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKGNhbGxCYWNrKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHdzY29ubmVjdCA9IGZ1bmN0aW9uKHNlbGYpe1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbiA9IG5ldyB1dGlscy53c0Nvbm5lY3Qoc2VsZi5vcHRpb25zKTtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24ub25Db25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLmV2ZW50cy5lbWl0KCd3cy1jb25uZWN0ZWQnLCBzZWxmLndzQ29ubmVjdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbi5vbkRpc2Nvbm5lY3QoZnVuY3Rpb24oKXsgXG4gICAgICAgICAgICBpZiAoc2VsZi5vcHRpb25zICYmIHNlbGYub3B0aW9ucy5yZWFsdGltZUVuZFBvaW50KXtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHdzY29ubmVjdChzZWxmKTsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfSwxMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB0aGlzLnN0YXR1cygoZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgaWYgKCd0b2tlbicgaW4gc2VsZi5vcHRpb25zKXtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGluZyB0byAnICsgc2VsZi5vcHRpb25zLmVuZFBvaW50KTtcbiAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMudXNlcm5hbWUgJiYgc2VsZi5vcHRpb25zLnBhc3N3b3JkKXtcbiAgICAgICAgICAgICAgICBzZWxmLmxvZ2luKFxuICAgICAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucy5wYXNzd29yZCxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZW5ld2luZyBjb25uZWN0aW9uJylcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc2VsZi5vcHRpb25zLnRva2VuICYmIHNlbGYub3B0aW9ucy5yZWFsdGltZUVuZFBvaW50ICYmICghc2VsZi53c0Nvbm5lY3Rpb24pKXtcbiAgICAgICAgICAgIHdzY29ubmVjdChzZWxmKTtcbiAgICAgICAgfVxuICAgIH0pLmJpbmQodGhpcykpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ091dCA9IGZ1bmN0aW9uKHVybCwgY2FsbEJhY2spe1xuICAgIHJldHVybiB0aGlzLiRwb3N0KCdhcGkvbG9nb3V0Jyx7fSwoZnVuY3Rpb24oc3RhdHVzKSB7XG4gICAgICAgIGlmICgnbGFzdFJXVFN0YXR1cycgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0ge2VuZFBvaW50OiB0aGlzLm9wdGlvbnMuZW5kUG9pbnR9O1xuICAgICAgICBpZiAodGhpcy53c0Nvbm5lY3Rpb24pIHsgXG4gICAgICAgICAgICB0aGlzLndzQ29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24gPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cmwpIHsgbG9jYXRpb24gPSB1cmw7IH1cbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICB9KS5iaW5kKHRoaXMpKTtcbn1cbiovXG52YXIgdXRpbHMgPSB7XG4gICAgcmVuYW1lRnVuY3Rpb24gOiBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgICAgICAgcmV0dXJuIChuZXcgRnVuY3Rpb24oXCJyZXR1cm4gZnVuY3Rpb24gKGNhbGwpIHsgcmV0dXJuIGZ1bmN0aW9uIFwiICsgbmFtZSArXG4gICAgICAgICAgICBcIiAoKSB7IHJldHVybiBjYWxsKHRoaXMsIGFyZ3VtZW50cykgfTsgfTtcIikoKSkoRnVuY3Rpb24uYXBwbHkuYmluZChmbikpO1xuICAgIH0sXG4gICAgY2FjaGVkIDogZnVuY3Rpb24oZnVuYywga2V5KXtcbiAgICAgICAgaWYgKCFrZXkpeyAgICBcbiAgICAgICAgICAgIGtleSA9ICdfJyArIGNhY2hlZEtleUlkeCsrO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHdyYXBwZXIoKXtcbiAgICAgICAgICAgIGlmICghdGhpc1trZXldKXtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBmdW5jLmNhbGwodGhpcyxbYXJndW1lbnRzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpc1trZXldO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gd3JhcHBlcjtcbiAgICB9LFxuLy8gICAgJFBPU1QgOiAkUE9TVCxcbi8vICAgIHJlV2hlZWxDb25uZWN0aW9uOiByZVdoZWVsQ29ubmVjdGlvbixcbiAgICBsb2c6IGZ1bmN0aW9uKCl7IFxuICAgICAgICBjb25zb2xlLmxvZyhhcmd1bWVudHMpO1xuICAgIH0sXG5cbiAgICB4ZHI6IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGFwcGxpY2F0aW9uLHRva2VuLCBmb3JtRW5jb2RlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlIGFuIEhUVFAgUmVxdWVzdCBhbmQgcmV0dXJuIGl0cyBwcm9taXNlLlxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgcmVxO1xuICAgICAgICAgICAgaWYgKCFkYXRhKSB7IGRhdGEgPSB7fTt9XG5cbiAgICAgICAgICAgIGlmKFhNTEh0dHBSZXF1ZXN0KSB7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgICAgICAgICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2VEYXRhID0gSlNPTi5wYXJzZShyZXEucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZURhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlID0ge3Jlc3BvbnNlRGF0YTogcmVzcG9uc2VEYXRhLCByZXNwb25zZVRleHQ6IHJlcS5yZXNwb25zZVRleHQsc3RhdHVzOiByZXEuc3RhdHVzLCByZXF1ZXN0OiByZXF9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcS5zdGF0dXMgPj0gMjAwICYmIHJlcS5zdGF0dXMgPCA0MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihYRG9tYWluUmVxdWVzdCl7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFhEb21haW5SZXF1ZXN0KCk7XG4gICAgICAgICAgICAgICAgcmVxLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBhY2NlcHQocmVxLnJlc3BvbnNlVGV4dCxyZXEuc3RhdHVzVGV4dCwgcmVxKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdDT1JTIG5vdCBzdXBwb3J0ZWQnKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlcS5vcGVuKCdQT1NUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgICAgIHJlcS5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICAgIGlmICh0b2tlbikgeyBkYXRhLl9fdG9rZW5fXyA9IHRva2VuIH1cbiAgICAgICAgICAgIGlmICghZm9ybUVuY29kZSl7XG4gICAgICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ3RleHQvcGxhaW4nKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5zaXplKCk/SlNPTi5zdHJpbmdpZnkoZGF0YSk6Jyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBrICsgJz0nICsgZW5jb2RlVVJJKHYudG9TdHJpbmcoKSk7ICBcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCkuam9pbignJicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVxLnNlbmQoZGF0YSk7XG4gICAgLy8gICAgICAgIHJlcS5zZW5kKG51bGwpO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgY2FwaXRhbGl6ZSA6IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHJldHVybiBzWzBdLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgfSxcblxuICAgIGhhc2ggOiBmdW5jdGlvbihzdHIpe1xuICAgICAgICAvKipcbiAgICAgICAgICogSGFzaGVkIGZ1bmN0aW9uXG4gICAgICAgICAqL1xuICAgICAgICBzdHIgPSBzdHIudG9TdHJpbmcoKTtcbiAgICAgICAgdmFyIHJldCA9IDE7XG4gICAgICAgIGZvciAodmFyIHggPSAwO3g8c3RyLmxlbmd0aDt4Kyspe1xuICAgICAgICAgICAgcmV0ICo9ICgxICsgc3RyLmNoYXJDb2RlQXQoeCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAocmV0ICUgMzQ5NTgzNzQ5NTcpLnRvU3RyaW5nKCk7XG4gICAgfSxcblxuICAgIG1ha2VGaWx0ZXIgOiBmdW5jdGlvbiAobW9kZWwsIGZpbHRlciwgdW5pZmllciwgZG9udFRyYW5zbGF0ZUZpbHRlcikge1xuICAgICAgICAvKipcbiAgICAgICAgICogTWFrZSBmaWx0ZXIgZm9yIEFycmF5LmZpbHRlciBmdW5jdGlvbiBhcyBhbiBhbmQgb2Ygb3JcbiAgICAgICAgICovXG4gICAgICAgIGlmICghdW5pZmllcikgeyB1bmlmaWVyID0gJyAmJiAnO31cbiAgICAgICAgaWYgKExhenkoZmlsdGVyKS5zaXplKCkgPT09IDApe1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpeyByZXR1cm4gdHJ1ZSB9O1xuICAgICAgICB9XG4gICAgICAgIHZhciBzb3VyY2UgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHZhbHMsIGZpZWxkKXtcbiAgICAgICAgICAgIGlmICghdmFscykgeyB2YWxzID0gW251bGxdfVxuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHMpKXtcbiAgICAgICAgICAgICAgICB2YWxzID0gW3ZhbHNdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFkb250VHJhbnNsYXRlRmlsdGVyICYmIChtb2RlbC5maWVsZHNbZmllbGRdLnR5cGUgPT09ICdyZWZlcmVuY2UnKSkge1xuICAgICAgICAgICAgICAgIGZpZWxkID0gJ18nICsgZmllbGQ7XG4gICAgICAgICAgICAgICAgdmFscyA9IExhenkodmFscykubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoeCAmJiAoeC5jb25zdHJ1Y3RvciAhPT0gTnVtYmVyKSl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtb2RlbC5maWVsZHNbZmllbGRdLnR5cGUgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICB2YWxzID0gdmFscy5tYXAoSlNPTi5zdHJpbmdpZnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICcoJyArICBMYXp5KHZhbHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyh4LicgKyBmaWVsZCArICcgPT09ICcgKyB4ICsgJyknO1xuICAgICAgICAgICAgfSkuam9pbignIHx8ICcpICArJyknO1xuICAgICAgICB9KS50b0FycmF5KCkuam9pbih1bmlmaWVyKTtcbiAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcInhcIiwgXCJyZXR1cm4gXCIgKyBzb3VyY2UpO1xuICAgIH0sXG5cbiAgICBzYW1lQXMgOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogRGVlcCBlcXVhbFxuICAgICAgICAgKi9cbiAgICAgICAgZm9yICh2YXIgayBpbiB4KSB7XG4gICAgICAgICAgICBpZiAoeVtrXSAhPSB4W2tdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgcGx1cmFsaXplIDogZnVuY3Rpb24oc3RyLCBtb2RlbCl7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMZXhpY2FsbHkgcmV0dXJucyBlbmdsaXNoIHBsdXJhbCBmb3JtXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gc3RyICsgJ3MnO1xuICAgIH0sXG5cbiAgICBiZWZvcmVDYWxsIDogZnVuY3Rpb24oZnVuYywgYmVmb3JlKXtcbiAgICAgICAgdmFyIGRlY29yYXRvciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBiZWZvcmUoKS50aGVuKGZ1bmMpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBkZWNvcmF0b3I7XG4gICAgfSxcblxuICAgIGNsZWFuU3RvcmFnZSA6IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDbGVhbiBsb2NhbFN0b3JhZ2Ugb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBMYXp5KGxvY2FsU3RvcmFnZSkua2V5cygpLmVhY2goZnVuY3Rpb24oayl7XG4gICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW2tdO1xuICAgICAgICB9KVxuICAgIH0sXG5cbiAgICBjbGVhbkRlc2NyaXB0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgTGF6eShsb2NhbFN0b3JhZ2UpXG4gICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHYsIG4pIHsgcmV0dXJuIExhenkobikuc3RhcnRzV2l0aCgnZGVzY3JpcHRpb246Jyl9KVxuICAgICAgICAgICAgLmtleXMoKVxuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24obikgeyBkZWxldGUgbG9jYWxTdG9yYWdlW25dIH0pO1xuICAgIH0sXG4gICAgXG4gICAgcmV2ZXJzZSA6IGZ1bmN0aW9uIChjaHIsIHN0cikge1xuICAgICAgICByZXR1cm4gc3RyLnNwbGl0KGNocikucmV2ZXJzZSgpLmpvaW4oY2hyKTtcbiAgICB9LFxuICAgIHBlcm11dGF0aW9uczogZnVuY3Rpb24oYXJyKXtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBmb3IgKHZhciB4ID0gYXJyLmxlbmd0aC0xOyB4ID49IDA7eC0tKXtcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSBhcnIubGVuZ3RoLTE7IHkgPj0gMDsgeS0tKXtcbiAgICAgICAgICAgICAgICBpZiAoeCAhPT0geSlcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goW2Fyclt4XSwgYXJyW3ldXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuXG4gICAgd2FpdEZvcjogZnVuY3Rpb24oZnVuYywgY2FsbEJhY2spIHtcbiAgICAgICAgdmFyIHdhaXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGZ1bmMoKSkge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQod2FpdGVyLDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc2V0VGltZW91dCh3YWl0ZXIsIDUwMCk7XG4gICAgfSxcblxuICAgIGJvb2w6IEJvb2xlYW4sXG5cbiAgICBub29wIDogZnVuY3Rpb24oKXt9LFxuXG4gICAgdHpPZmZzZXQ6IG5ldyBEYXRlKCkuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIDYwMDAwLFxuXG4gICAgdHJhbnNGaWVsZFR5cGU6IHtcbiAgICAgICAgZGF0ZTogZnVuY3Rpb24oeCkgeyByZXR1cm4gbmV3IERhdGUoeCAqIDEwMDAgKyB1dGlscy50ek9mZnNldCApIH0sXG4gICAgICAgIGRhdGV0aW1lOiBmdW5jdGlvbih4KSB7IHJldHVybiBuZXcgRGF0ZSh4ICogMTAwMCArIHV0aWxzLnR6T2Zmc2V0ICkgfSxcbiAgICAgICAgc3RyaW5nOiBmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvU3RyaW5nKCk7IH0sXG4gICAgICAgIHRleHQ6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG9TdHJpbmcoKTsgfSxcbiAgICAgICAgaW50ZWdlcjogZnVuY3Rpb24oeCkgeyByZXR1cm4gcGFyc2VJbnQoeCk7IH0sXG4gICAgICAgIGZsb2F0OiBmdW5jdGlvbih4KSB7IHJldHVybiBwYXJzZUZsb2F0KHgpOyB9XG4gICAgfSwgXG4gICAgbW9jayA6IG1vY2tPYmplY3QoKVxufTtcblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IFNUQVRVU0tFWSA9ICdsYXN0UldUQ29ubmVjdGlvblN0YXR1cyc7XG5cbmZ1bmN0aW9uIFJlYWx0aW1lQ29ubmVjdGlvbihlbmRQb2ludCwgcnd0Q29ubmVjdGlvbil7XG4gICAgLyoqXG4gICAgICogQ29ubmVjdHMgYSB3ZWJzb2NrZXQgd2l0aCByZVdoZWVsIGNvbm5lY3Rpb25cbiAgICAgKi9cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgY29ubmVjdGlvbiA9IG5ldyBTb2NrSlMoZW5kUG9pbnQpO1xuICAgIGNvbm5lY3Rpb24ub25vcGVuID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ29wZW4gOiAnICsgeCk7XG4gICAgICAgIGNvbm5lY3Rpb24udGVuYW50KCk7XG4gICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtY29ubmVjdGlvbi1vcGVuJyx4KTtcbiAgICB9O1xuICAgIGNvbm5lY3Rpb24ub25tZXNzYWdlID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgaWYgKHgudHlwZSA9PSAnbWVzc2FnZScpIHtcbiAgICAgICAgICAgIC8vJC5ub3RpZnkoeC5kYXRhKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy9UT0RPIHNldCBmcm9tUmVhbHRpbWVcbiAgICAgICAgICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLW1lc3NhZ2UtanNvbicsIEpTT04ucGFyc2UoeC5kYXRhKSk7XG4gICAgICAgICAgICAgICAgLy9UT0RPIHVuc2V0IGZyb21SZWFsdGltZVxuICAgICAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1tZXNzYWdlLXRleHQnLCBKU09OLnBhcnNlKHguZGF0YSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Zyb20gcmVhbHRpbWUgJyx4KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgY29ubmVjdGlvbi5vbmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzZXRUaW1lb3V0KHV0aWxzLndzQ29ubmVjdCwxMDAwKTtcbiAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1jb25uZWN0aW9uLWNsb3NlZCcpO1xuICAgIH07XG4gICAgY29ubmVjdGlvbi50ZW5hbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbm5lY3Rpb24uc2VuZCgnVEVOQU5UOicgKyByd3RDb25uZWN0aW9uLmNhY2hlZFN0YXR1cy5hcHBsaWNhdGlvbiArICc6JyArIHJ3dENvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnRva2VuKTtcbiAgICB9XG4gICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgfVxufSAgICBcblxuZnVuY3Rpb24gcmVXaGVlbENvbm5lY3Rpb24oZW5kUG9pbnQsIGdldExvZ2luKXtcbiAgICAvKipcbiAgICAgKiBDb25uZWN0aW9uIGJhc2ljIGZvciByZVdoZWVsXG4gICAgICogQHBhcmFtIGVuZFBvaW50OiBzdHJpbmcgYmFzZSB1cmwgZm9yIGFsbCBjb211bmljYXRpb25cbiAgICAgKiBAcGFyYW0gZ2V0TG9naW46IGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBpbiBjYXNlIG9mIG1pc3NpbmcgbG9naW4uXG4gICAgICogIHRoaXMgZnVuY3Rpb24gY291bGQgcmV0dXJuIDpcbiAgICAgKiAgLSAgIGEgeyB1c2VybmFtZSA6IDx1c2VybmFtZT4gLCBwYXNzd29yZDogPHBhc3N3b3JkPn0gb3JcbiAgICAgKiAgLSAgIGIgUHJvbWlzZSAtPiB7IHVzZXJuYW1lIDogPHVzZXJuYW1lPiAsIHBhc3N3b3JkOiA8cGFzc3dvcmQ+fVxuICAgICAqL1xuICAgIC8vIG1haW4gaW5pdGlhbGl6YXRpb25cbiAgICB2YXIgZXZlbnRzID0gbmV3IE5hbWVkRXZlbnRNYW5hZ2VyKCk7XG4gICAgdGhpcy5nZXRMb2dpbiA9IGdldExvZ2luO1xuICAgIHRoaXMuZW5kUG9pbnQgPSBlbmRQb2ludC5lbmRzV2l0aCgnLycpPyBlbmRQb2ludDogKGVuZFBvaW50ICsgJy8nKTtcbiAgICB0aGlzLm9uID0gZXZlbnRzLm9uO1xuICAgIHRoaXMudW5iaW5kID0gZXZlbnRzLnVuYmluZDtcbiAgICB0aGlzLmVtaXQgPSBldmVudHMuZW1pdDtcbiAgICB0aGlzLm9uY2UgPSBldmVudHMub25jZTtcbiAgICB0aGlzLmNhY2hlZFN0YXR1cyA9IHt9O1xuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmlzTG9nZ2VkSW4gPSBmYWxzZTtcbiAgICAvLyByZWdpc3RlcmluZyB1cGRhdGUgc3RhdHVzXG4gICAgdmFyIHRocyA9IHRoaXM7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuJHBvc3QgPSBmdW5jdGlvbih1cmwsIGRhdGEsY2FsbEJhY2spe1xuICAgIC8qKlxuICAgICAqIEFKQVggY2FsbCBmb3IgZmV0Y2ggYWxsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAcGFyYW0gdXJsOiBsYXN0IHVybCBwYXJ0IGZvciBhamF4IGNhbGxcbiAgICAgKiBAcGFyYW0gZGF0YTogZGF0YSBvYmplY3QgdG8gYmUgc2VudFxuICAgICAqIEBwYXJhbSBjYWxsQmFjazogZnVuY3Rpb24oeGhyKSB3aWxsIGJlIGNhbGxlZCB3aGVuIGRhdGEgYXJyaXZlc1xuICAgICAqIEByZXR1cm5zIFByb21pc2U8eGhyPiBzYW1lIG9mIGNhbGxCYWNrXG4gICAgICovXG4gICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLmVuZFBvaW50ICsgdXJsLCBkYXRhLCB0aHMuY2FjaGVkU3RhdHVzLmFwcGxpY2F0aW9uLCB0aHMuY2FjaGVkU3RhdHVzLnRva2VuKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICB0aHMuZW1pdCgnaHR0cC1yZXNwb25zZScsIHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cyArICctanNvbicsIHhoci5yZXNwb25zZURhdGEsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYWxsQmFjaykgeyBjYWxsQmFjayggeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0ICl9O1xuICAgICAgICAgICAgICAgIGFjY2VwdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItanNvbicsIHhoci5yZXNwb25zZURhdGEsIHhoci5zdGF0dXMsIHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWpzb24tJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZURhdGEsdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItaHR0cCcseGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cyx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZW1pdCgnZXJyb3ItaHR0cC0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbi8qKlxuICogQ2hlY2sgY3VycmVudCBzdGF0dXMgYW5kIGNhbGxiYWNrIGZvciByZXN1bHRzLlxuICogSXQgY2FjaGVzIHJlc3VsdHMgZm9yIGZ1cnRoZXIuXG4gKiBAcGFyYW0gY2FsbGJhY2s6IChzdGF0dXMgb2JqZWN0KVxuICogQHBhcmFtIGZvcmNlOiBib29sZWFuIGlmIHRydWUgZW1wdGllcyBjYWNoZSAgXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnN0YXR1cyA9IGZ1bmN0aW9uKGNhbGxCYWNrLCBmb3JjZSkge1xuICAgIC8vIGlmIGZvcmNlLCBjbGVhciBhbGwgY2FjaGVkIHZhbHVlc1xuICAgIHZhciBrZXkgPSAndG9rZW46JyArIHRoaXMuZW5kUG9pbnQ7XG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgaWYgKGZvcmNlKSB7XG4gICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzID0ge307XG4gICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2Vba2V5XTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc3RhdHVzV2FpdGluZykge1xuICAgICAgICAvLyB3YWl0IGZvciBzdGF0dXNcbiAgICAgICAgdXRpbHMud2FpdEZvcihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAhdGhzLnN0YXR1c1dhaXRpbmc7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aHMuc3RhdHVzKGNhbGxCYWNrLGZvcmNlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gdHJ5IGZvciB2YWx1ZSByZXNvbHV0aW9uXG4gICAgLy8gZmlyc3Qgb24gbWVtb3J5XG4gICAgaWYgKExhenkodGhpcy5jYWNoZWRTdGF0dXMpLnNpemUoKSl7XG4gICAgICAgIGNhbGxCYWNrKHRoaXMuY2FjaGVkU3RhdHVzKVxuICAgIC8vIHRoZW4gaW4gbG9jYWxTdG9yYWdlXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgaWYgKGtleSBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgIGRhdGEuX190b2tlbl9fID0gbG9jYWxTdG9yYWdlW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGF0dXNXYWl0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy4kcG9zdCgnYXBpL3N0YXR1cycsZGF0YSwgZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgIHRocy51cGRhdGVTdGF0dXMoc3RhdHVzKTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtrZXldID0gc3RhdHVzLnRva2VuO1xuICAgICAgICAgICAgY2FsbEJhY2soc3RhdHVzKTtcbiAgICAgICAgICAgIHRocy5zdGF0dXNXYWl0aW5nID0gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBkb2Vzbid0IGNhbGwgY2FsbGJhY2tcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNhbGxCYWNrKHRoaXMuY2FjaGVkU3RhdHVzKTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS51cGRhdGVTdGF0dXMgPSBmdW5jdGlvbihzdGF0dXMpe1xuICAgIHZhciBsYXN0QnVpbGQgPSBwYXJzZUZsb2F0KGxvY2FsU3RvcmFnZS5sYXN0QnVpbGQpIHx8IDE7XG4gICAgaWYgKGxhc3RCdWlsZCA8IHN0YXR1cy5sYXN0X2J1aWxkKXtcbiAgICAgICAgdXRpbHMuY2xlYW5EZXNjcmlwdGlvbigpO1xuICAgICAgICBsb2NhbFN0b3JhZ2UubGFzdEJ1aWxkID0gc3RhdHVzLmxhc3RfYnVpbGQ7XG4gICAgfVxuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBCb29sZWFuKHN0YXR1cy50b2tlbik7XG4gICAgdGhpcy5pc0xvZ2dlZEluID0gQm9vbGVhbihzdGF0dXMudXNlcl9pZCk7XG4gICAgdmFyIG9sZFN0YXR1cyA9IHRoaXMuY2FjaGVkU3RhdHVzO1xuICAgIHRoaXMuY2FjaGVkU3RhdHVzID0gc3RhdHVzO1xuICAgIGlmICghb2xkU3RhdHVzLnVzZXJfaWQgJiYgc3RhdHVzLnVzZXJfaWQpe1xuICAgICAgICB0aGlzLmVtaXQoJ2xvZ2dlZC1pbicsc3RhdHVzLnVzZXJfaWQpO1xuICAgIH0gZWxzZSBpZiAob2xkU3RhdHVzLnVzZXJfaWQgJiYgIXN0YXR1cy51c2VyX2lkKXtcbiAgICAgICAgdGhpcy5lbWl0KCdsb2dnZWQtb3V0Jyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzQ29ubmVjdGVkICYmICF0aGlzLmlzTG9nZ2VkSW4pe1xuICAgICAgICB0aGlzLmVtaXQoJ2xvZ2luLXJlcXVpcmVkJyk7XG4gICAgICAgIGlmICh0aGlzLmdldExvZ2luKXtcbiAgICAgICAgICAgIHZhciBsb2dpbkluZm8gPSB0aGlzLmdldExvZ2luKCk7XG4gICAgICAgICAgICBpZiAobG9naW5JbmZvLmNvbnN0cnVjdG9yID09PSBPYmplY3Qpe1xuICAgICAgICAgICAgICAgIHRoaXMubG9naW4obG9naW5JbmZvLnVzZXJuYW1lLCBsb2dpbkluZm8ucGFzc3dvcmQsIGxvZ2luSW5mby5jYWxsQmFjayk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxvZ2luSW5mby5jb25zdHJ1Y3RvciA9PT0gUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIGxvZ2luSW5mby50aGVuKGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9naW4ob2JqLnVzZXJuYW1lLCBvYmoucGFzc3dvcmQsIG9iai5jYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyByZWFsdGltZSBjb25uZWN0aW9uIGlzIHNldHRlZFxuICAgIGlmICghb2xkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQgJiYgc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQpIHtcbiAgICAgICAgdGhpcy53c0Nvbm5lY3Rpb24gPSBuZXcgUmVhbHRpbWVDb25uZWN0aW9uKHN0YXR1cy5yZWFsdGltZUVuZFBvaW50LCB0aGlzKTtcbiAgICAvLyByZWFsdGltZSBjb25uZWN0aW9uIGlzIGNsb3NlZFxuICAgIH0gZWxzZSBpZiAob2xkU3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQgJiYgIXN0YXR1cy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgIHRoaXMud3NDb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLndzQ29ubmVjdGlvbjtcbiAgICB9XG4gICAgdGhpcy5lbWl0KCd1cGRhdGUtY29ubmVjdGlvbi1zdGF0dXMnLCBzdGF0dXMsIG9sZFN0YXR1cyk7XG4gICAgbG9jYWxTdG9yYWdlW1NUQVRVU0tFWV0gPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xufVxuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIC8qKlxuICAgICAqIG1ha2UgbG9naW4gYW5kIHJldHVybiBhIHByb21pc2UuIElmIGxvZ2luIHN1Y2NlZCwgcHJvbWlzZSB3aWxsIGJlIGFjY2VwdGVkXG4gICAgICogSWYgbG9naW4gZmFpbHMgcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGggZXJyb3JcbiAgICAgKiBAcGFyYW0gdXNlcm5hbWU6IHVzZXJuYW1lXG4gICAgICogQHBhcmFtIHBhc3N3b3JkOiBwYXNzd29yZFxuICAgICAqIEByZXR1cm4gUHJvbWlzZSAodXNlciBvYmplY3QpXG4gICAgICovXG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5lbmRQb2ludCArICdhcGkvbG9naW4nLCB7dXNlcm5hbWU6IHVzZXJuYW1lIHx8ICcnLCBwYXNzd29yZDogcGFzc3dvcmQgfHwgJyd9LG51bGwsdGhzLmNhY2hlZFN0YXR1cy50b2tlbiwgdHJ1ZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIHN0YXR1c1xuICAgICAgICAgICAgICAgIHRocy51cGRhdGVTdGF0dXMoeGhyLnJlc3BvbnNlRGF0YSk7XG4gICAgICAgICAgICAgICAgLy8gY2FsbCB3aXRoIHVzZXIgaWRcbiAgICAgICAgICAgICAgICBhY2NlcHQoe3N0YXR1cyA6ICdzdWNjZXNzJywgdXNlcmlkOiB0aHMuY2FjaGVkU3RhdHVzLnVzZXJfaWR9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIC8vIGlmIGVycm9yIGNhbGwgZXJyb3IgbWFuYWdlciB3aXRoIGVycm9yXG4gICAgICAgICAgICAgICAgYWNjZXB0KHtlcnJvcjogeGhyLnJlc3BvbnNlRGF0YS5lcnJvciwgc3RhdHVzOiAnZXJyb3InfSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dvdXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCkge1xuICAgICAgICB0aHMuJHBvc3QoJ2FwaS9sb2dvdXQnKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ob2spe1xuICAgICAgICAgICAgICAgIHRocy51cGRhdGVTdGF0dXMoe30pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2VbU1RBVFVTS0VZXTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoKVxuICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICB9KTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oY2FsbEJhY2spIHtcbiAgICBpZiAodGhpcy5pc0xvZ2dlZEluKSB7XG4gICAgICAgIGNhbGxCYWNrKHRoaXMuY2FjaGVkU3RhdHVzLnVzZXJfaWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHdhaXQgZm9yIGxvZ2luXG4gICAgICAgIHRoaXMub25jZSgnbG9nZ2VkLWluJyxmdW5jdGlvbih1c2VyX2lkKXtcbiAgICAgICAgICAgIGNhbGxCYWNrKHVzZXJfaWQpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5zdGF0dXMoY2FsbEJhY2sgfHwgdXRpbHMubm9vcCk7XG4gICAgfVxufVxuXG51dGlscy5yZVdoZWVsQ29ubmVjdGlvbiA9IHJlV2hlZWxDb25uZWN0aW9uOyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVG91Y2hlcigpe1xuICAgIHZhciB0b3VjaGVkID0gZmFsc2VcbiAgICB0aGlzLnRvdWNoID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdG91Y2hlZCA9IHRydWU7XG4gICAgfTtcbiAgICB0aGlzLnRvdWNoZWQgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdCA9IHRvdWNoZWQ7XG4gICAgICAgIHRvdWNoZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHQ7XG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5cbmZ1bmN0aW9uIFZhY3V1bUNhY2hlcih0b3VjaCwgYXNrZWQsIG5hbWUsIHBrSW5kZXgpe1xuLypcbiAgICBpZiAobmFtZSl7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnY3JlYXRlZCBWYWN1dW1DYWNoZXIgYXMgJyArIG5hbWUpO1xuICAgIH1cbiovXG4gICAgaWYgKCFhc2tlZCl7XG4gICAgICAgIHZhciBhc2tlZCA9IFtdO1xuICAgIH1cbiAgICB2YXIgbWlzc2luZyA9IFtdO1xuICAgIFxuICAgIHRoaXMuYXNrID0gZnVuY3Rpb24gKGlkLGxhenkpe1xuICAgICAgICBpZiAocGtJbmRleCAmJiAoaWQgaW4gcGtJbmRleC5zb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFMYXp5KGFza2VkKS5jb250YWlucyhpZCkpe1xuLy8gICAgICAgICAgICBjb25zb2xlLmluZm8oJ2Fza2luZyAoJyArIGlkICsgJykgZnJvbSAnICsgbmFtZSk7XG4gICAgICAgICAgICBtaXNzaW5nLnB1c2goaWQpO1xuICAgICAgICAgICAgaWYgKCFsYXp5KVxuICAgICAgICAgICAgICAgIGFza2VkLnB1c2goaWQpO1xuICAgICAgICAgICAgdG91Y2gudG91Y2goKTtcbiAgICAgICAgfSBcbi8vICAgICAgICBlbHNlIGNvbnNvbGUud2FybignKCcgKyBpZCArICcpIHdhcyBqdXN0IGFza2VkIG9uICcgKyBuYW1lKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRBc2tlZEluZGV4ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIGFza2VkO1xuICAgIH1cblxuICAgIHRoaXMubWlzc2luZ3MgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gTGF6eShtaXNzaW5nLnNwbGljZSgwLG1pc3NpbmcubGVuZ3RoKSkudW5pcXVlKCkudG9BcnJheSgpO1xuICAgIH1cbn1cbiIsImZ1bmN0aW9uIEF1dG9MaW5rZXIoYWN0aXZlcywgSURCLCBXMlBSRVNPVVJDRSwgbGlzdENhY2hlKXtcbiAgICB2YXIgdG91Y2ggPSBuZXcgVG91Y2hlcigpO1xuICAgIHZhciBtYWluSW5kZXggPSB7fTtcbiAgICB2YXIgZm9yZWlnbktleXMgPSB7fTtcbiAgICB2YXIgbTJtID0ge307XG4gICAgdmFyIG0ybUluZGV4ID0ge307XG4gICAgdmFyIHBlcm1pc3Npb25zID0ge307XG4gICAgdGhpcy5tYWluSW5kZXggPSBtYWluSW5kZXg7XG4gICAgdGhpcy5mb3JlaWduS2V5cyA9IGZvcmVpZ25LZXlzO1xuICAgIHRoaXMubTJtID0gbTJtO1xuICAgIHRoaXMubTJtSW5kZXggPSBtMm1JbmRleDtcbiAgICB0aGlzLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG5cbiAgICBXMlBSRVNPVVJDRS5vbignbW9kZWwtZGVmaW5pdGlvbicsZnVuY3Rpb24obW9kZWwsIGluZGV4KXtcbiAgICAgICAgLy8gZGVmaW5pbmcgYWxsIGluZGV4ZXMgZm9yIHByaW1hcnkga2V5XG4gICAgICAgIHZhciBwa0luZGV4ID0gbGlzdENhY2hlLmdldEluZGV4Rm9yKG1vZGVsLm5hbWUsICdpZCcpO1xuICAgICAgICBtYWluSW5kZXhbbW9kZWwubmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBwa0luZGV4LCAnbWFpbkluZGV4LicgKyBtb2RlbC5uYW1lLCBpbmRleCk7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGluZyBwZXJtaXNzaW9uIGluZGV4ZXNcbiAgICAgICAgcGVybWlzc2lvbnNbbW9kZWwubmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsICdwZXJtaXNzaW9ucy4nICsgbW9kZWwubmFtZSk7XG5cbiAgICAgICAgLy8gY3JlYXRpbmcgaW5kZXhlcyBmb3IgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbihyZWZlcmVuY2Upe1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsLm5hbWUgKyAnXycgKyByZWZlcmVuY2UuaWQ7XG4gICAgICAgICAgICBmb3JlaWduS2V5c1tpbmRleE5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgbGlzdENhY2hlLmdldEluZGV4Rm9yKHJlZmVyZW5jZS50bywgJ2lkJyksIHJlZmVyZW5jZS50byArICcuaWQgZm9yZWlnbktleXMuJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBjcmVhdGluZyByZXZlcnNlIGZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZWRCeSkuZWFjaChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gZmllbGQuYnkgKyAnLicgKyBmaWVsZC5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IoZmllbGQuYnksZmllbGQuaWQpLCBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkICsgJyBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgICAgICAgICBpZiAoIShyZWxhdGlvbi5pbmRleE5hbWUgaW4gbTJtKSlcbiAgICAgICAgICAgICAgICBtMm1bcmVsYXRpb24uaW5kZXhOYW1lXSA9IFtuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsJ20ybS4nICsgcmVsYXRpb24uaW5kZXhOYW1lICsgJ1swXScpLCBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsJ20ybS4nICsgcmVsYXRpb24uaW5kZXhOYW1lKydbMV0nKV07XG4gICAgICAgICAgICBpZiAoIShyZWxhdGlvbi5pbmRleE5hbWUgaW4gbTJtSW5kZXgpKVxuICAgICAgICAgICAgICAgIG0ybUluZGV4W3JlbGF0aW9uLmluZGV4TmFtZV0gPSBuZXcgTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIG0ybUdldCA9IGZ1bmN0aW9uKGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgY2FsbEJhY2spe1xuICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCgobiA/IHV0aWxzLnJldmVyc2UoJy8nLCBpbmRleE5hbWUpIDogaW5kZXhOYW1lKSArICdzJyArICcvbGlzdCcsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW2luZGV4TmFtZV1cbiAgICAgICAgfSk7ICAgICAgICBcbiAgICB9O1xuXG4gICAgdmFyIGdldE0yTSA9IGZ1bmN0aW9uKGluZGV4TmFtZSwgY29sbGVjdGlvbiwgbiwgY2FsbEJhY2spe1xuICAgICAgICAvLyBhc2sgYWxsIGl0ZW1zIGluIGNvbGxlY3Rpb24gdG8gbTJtIGluZGV4XG4gICAgICAgIExhenkoY29sbGVjdGlvbikuZWFjaChtMm1baW5kZXhOYW1lXVtuXS5hc2suYmluZChtMm1baW5kZXhOYW1lXVtuXSkpO1xuICAgICAgICAvLyByZW5ld2luZyBjb2xsZWN0aW9uIHdpdGhvdXQgYXNrZWRcbiAgICAgICAgY29sbGVjdGlvbiA9IG0ybVtpbmRleE5hbWVdW25dLm1pc3NpbmdzKCk7XG4gICAgICAgIC8vIGNhbGxpbmcgcmVtb3RlIGZvciBtMm0gY29sbGVjdGlvbiBpZiBhbnlcbiAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgIGFjdGl2ZXNbaW5kZXhOYW1lXSA9IDE7XG4gICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLmdldE0yTSA9IGdldE0yTTtcblxuICAgIHZhciBsaW5rVW5saW5rZWQgPSBmdW5jdGlvbigpe1xuICAgICAgICAvLyBwZXJmb3JtIGEgRGF0YUJhc2Ugc3luY2hyb25pemF0aW9uIHdpdGggc2VydmVyIGxvb2tpbmcgZm9yIHVua25vd24gZGF0YVxuICAgICAgICBpZiAoIXRvdWNoLnRvdWNoZWQoKSkgcmV0dXJuO1xuICAgICAgICBpZiAoTGF6eShhY3RpdmVzKS52YWx1ZXMoKS5zdW0oKSkge1xuICAgICAgICAgICAgdG91Y2gudG91Y2goKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihpbmRleGVzLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgTGF6eShpbmRleGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCxuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSBMYXp5KGNvbGxlY3Rpb24pLmZpbHRlcihCb29sZWFuKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjb2xsZWN0aW9uLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBJTkRFWCA9IG0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBnZXR0ZXIgPSBJTkRFWFsnZ2V0JyArICgxIC0gbildLmJpbmQoSU5ERVgpO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbTJtR2V0KGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gY29sbGVjdGlvbi5tYXAoZ2V0dGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgb3RoZXJJbmRleCA9IGluZGV4TmFtZS5zcGxpdCgnLycpWzEgLSBuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShvdGhlckluZGV4LGZ1bmN0aW9uKCl7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShpZHMpLmZsYXR0ZW4oKS51bmlxdWUoKS5lYWNoKG1haW5JbmRleFtvdGhlckluZGV4XS5hc2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYWluSW5kZXhbb3RoZXJJbmRleF0uYXNrKHgsdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIExhenkobWFpbkluZGV4KS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaWRzID0gaW5kZXgubWlzc2luZ3MoKTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIGlkYiA9IG1vZGVsTmFtZSBpbiBJREIgPyBJREJbbW9kZWxOYW1lXS5rZXlzKCkgOiBMYXp5KCk7XG4gICAgICAgICAgICAgICAgLy9sb2coJ2xpbmtpbmcuJyArIG1vZGVsTmFtZSArICcgPSAnICsgVzJQUkVTT1VSQ0UubGlua2luZy5zb3VyY2VbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lLCB7aWQ6IGlkc30sbnVsbCx1dGlscy5ub29wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KGZvcmVpZ25LZXlzKVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICByZXR1cm4gW2ssIHYubWlzc2luZ3MoKV1cbiAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uKHYpe1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGlkcyA9IHhbMV07XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0geFswXTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGluZGV4TmFtZS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgdmFyIG1haW5SZXNvdXJjZSA9IGluZGV4WzBdO1xuICAgICAgICAgICAgdmFyIGZpZWxkTmFtZSA9IGluZGV4WzFdO1xuICAgICAgICAgICAgdmFyIGZpbHRlciA9IHt9O1xuICAgICAgICAgICAgZmlsdGVyW2ZpZWxkTmFtZV0gPSBpZHM7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtYWluUmVzb3VyY2UsIGZpbHRlcik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgTGF6eShMYXp5KHBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIHJldHVybiB2WzFdLmxlbmd0aFxuICAgICAgICB9KS50b09iamVjdCgpKS5lYWNoKGZ1bmN0aW9uIChpZHMsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgYWN0aXZlc1tyZXNvdXJjZU5hbWVdID0gMTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChyZXNvdXJjZU5hbWUgKyAnL215X3Blcm1zJywge2lkczogTGF6eShpZHMpLnVuaXF1ZSgpLnRvQXJyYXkoKX0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdFBlcm1pc3Npb25zKGRhdGEuUEVSTUlTU0lPTlMpO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYWN0aXZlc1tyZXNvdXJjZU5hbWVdXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzZXRJbnRlcnZhbChsaW5rVW5saW5rZWQsNTApO1xufTtcblxuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gTGlzdENhY2hlcigpe1xuICAgIHZhciBnb3RBbGwgPSB7fTtcbiAgICB2YXIgYXNrZWQgPSB7fTsgLy8gbWFwIG9mIGFycmF5XG4gICAgdmFyIGNvbXBvc2l0ZUFza2VkID0ge307XG4gICAgdmFyIGNhcnRlc2lhblByb2R1Y3QxID0gZnVuY3Rpb24oeCx5LGlzQXJyYXkpe1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGlmIChpc0FycmF5KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhIGluIHgpe1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGIgaW4geSl7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKExhenkoW3hbYV0seVtiXV0pLmZsYXR0ZW4oKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4geCl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYiBpbiB5KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goW3hbYV0seVtiXV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgdmFyIGNhcnRlc2lhblByb2R1Y3QgPSBmdW5jdGlvbihhcnIpe1xuICAgICAgICB2YXIgaXNBcnJheSA9IGZhbHNlO1xuICAgICAgICB2YXIgcmV0ID0gYXJyWzBdOyBcbiAgICAgICAgZm9yICh2YXIgeCA9IDE7IHggPCBhcnIubGVuZ3RoOyArK3gpe1xuICAgICAgICAgICAgcmV0ID0gY2FydGVzaWFuUHJvZHVjdDEocmV0LCBhcnJbeF0sIGlzQXJyYXkpO1xuICAgICAgICAgICAgaXNBcnJheSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gICAgdmFyIGV4cGxvZGVGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgdmFyIHByb2R1Y3QgPSBjYXJ0ZXNpYW5Qcm9kdWN0KExhenkoZmlsdGVyKS52YWx1ZXMoKS50b0FycmF5KCkpO1xuICAgICAgICB2YXIga2V5cyA9IExhenkoZmlsdGVyKS5rZXlzKCkudG9BcnJheSgpO1xuICAgICAgICByZXR1cm4gcHJvZHVjdC5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YXIgciA9IHt9O1xuICAgICAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGEsbil7XG4gICAgICAgICAgICAgICAgclthXSA9IHhbbl07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9O1xuICAgIHZhciBmaWx0ZXJTaW5nbGUgPSBmdW5jdGlvbihtb2RlbCwgZmlsdGVyLCB0ZXN0T25seSl7XG4gICAgICAgIC8vIExhenkgYXV0byBjcmVhdGUgaW5kZXhlc1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gbW9kZWwubW9kZWxOYW1lO1xuICAgICAgICB2YXIgZ2V0SW5kZXhGb3IgPSB0aGlzLmdldEluZGV4Rm9yO1xuICAgICAgICB2YXIga2V5cyA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odixrZXkpeyByZXR1cm4gW2tleSwgbW9kZWxOYW1lICsgJy4nICsga2V5XTsgfSkudG9PYmplY3QoKTtcbiAgICAgICAgdmFyIGluZGV4ZXMgPSBMYXp5KGZpbHRlcikua2V5cygpLm1hcChmdW5jdGlvbihrZXkpeyByZXR1cm4gW2tleSwgZ2V0SW5kZXhGb3IobW9kZWxOYW1lLCBrZXkpXX0pLnRvT2JqZWN0KCk7IFxuICAgICAgICAvLyBmYWtlIGZvciAoaXQgd2lsbCBjeWNsZSBvbmNlKVxuICAgICAgICBmb3IgKHZhciB4IGluIGZpbHRlcil7XG4gICAgICAgICAgICAvLyBnZXQgYXNrZWQgaW5kZXggYW5kIGNoZWNrIHByZXNlbmNlXG4gICAgICAgICAgICB2YXIgZGlmZmVyZW5jZSA9IExhenkoZmlsdGVyW3hdKS5kaWZmZXJlbmNlKGluZGV4ZXNbeF0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIGlmIChkaWZmZXJlbmNlLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgLy8gZ2VuZXJhdGUgbmV3IGZpbHRlclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBMYXp5KFtbeCwgZGlmZmVyZW5jZV1dKS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIC8vIHJlbWVtYmVyIGFza2VkXG4gICAgICAgICAgICAgICAgaWYgKCF0ZXN0T25seSlcbiAgICAgICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoaW5kZXhlc1t4XSwgZGlmZmVyZW5jZSk7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6JyArIEpTT04uc3RyaW5naWZ5KHJldCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZSBmaWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSArICdcXG5PdXQgOiBudWxsJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNsZWFuQ29tcG9zaXRlcyA9IGZ1bmN0aW9uKG1vZGVsLGZpbHRlcil7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBjbGVhbiBjb21wb3NpdGVBc2tlZFxuICAgICAgICAgKi9cbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29uZGl0aW9uYWwgYXNrZWQgaW5kZXhcbiAgICAgICAgaWYgKCEobW9kZWwubmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpIHsgY29tcG9zaXRlQXNrZWRbbW9kZWwubmFtZV0gPSBbXSB9O1xuICAgICAgICB2YXIgaW5kZXggPSBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXTtcbiAgICAgICAgLy8gc2VhcmNoIGZvciBhbGwgZWxlbWVudHMgd2hvIGhhdmUgc2FtZSBwYXJ0aWFsXG4gICAgICAgIHZhciBmaWx0ZXJMZW4gPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICB2YXIgaXRlbXMgPSBpbmRleC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnICYmICcsdHJ1ZSkpLmZpbHRlcihmdW5jdGlvbihpdGVtKXsgTGF6eShpdGVtKS5zaXplKCkgPiBmaWx0ZXJMZW4gfSk7XG4vLyAgICAgICAgY29uc29sZS5sb2coJ2RlbGV0aW5nIDonICsgSlNPTi5zdHJpbmdpZnkoaXRlbXMpKTtcbiAgICB9O1xuXG4gICAgdGhpcy5maWx0ZXIgPSBmdW5jdGlvbihtb2RlbCwgZmlsdGVyKXtcbi8vICAgICAgICBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0tLS0tXFxuZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikpO1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gbW9kZWwubW9kZWxOYW1lO1xuXG4gICAgICAgIC8vIGlmIHlvdSBmZXRjaCBhbGwgb2JqZWN0cyBmcm9tIHNlcnZlciwgdGhpcyBtb2RlbCBoYXMgdG8gYmUgbWFya2VkIGFzIGdvdCBhbGw7XG4gICAgICAgIHZhciBmaWx0ZXJMZW4gID0gTGF6eShmaWx0ZXIpLnNpemUoKTtcbiAgICAgICAgc3dpdGNoIChmaWx0ZXJMZW4pIHtcbiAgICAgICAgICAgIGNhc2UgMCA6IHtcbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gbnVsbCBvciBhbGxcbiAgICAgICAgICAgICAgICB2YXIgZ290ID0gZ290QWxsW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgZ290QWxsW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gYXNrZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYXNrZWRbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb3V0IDogbnVsbCAoZ290IGFsbCknKTtcbiAgICAgICAgICAgICAgICAvLyBjb25kaXRpb25hbCBjbGVhblxuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gY29tcG9zaXRlQXNrZWQpeyBcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChnb3QpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgMSA6IHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gZmlsdGVyU2luZ2xlLmNhbGwodGhpcywgbW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICAgICAgY2xlYW5Db21wb3NpdGVzLmNhbGwodGhpcywgbW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdmFyIHNpbmdsZSA9IExhenkoZmlsdGVyKS5rZXlzKCkuc29tZShmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciBmID0ge307XG4gICAgICAgICAgICBmW2tleV0gPSBmaWx0ZXJba2V5XTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXJTaW5nbGUuY2FsbCh0aHMsIG1vZGVsLCBmLCB0cnVlKSA9PSBudWxsO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHNpbmdsZSkgeyByZXR1cm4gbnVsbCB9XG4gICAgICAgIC8vIGxhenkgY3JlYXRlIGNvbXBvc2l0ZUFza2VkXG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpeyBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgLy8gZXhwbG9kZSBmaWx0ZXJcbiAgICAgICAgdmFyIGV4cGxvZGVkID0gZXhwbG9kZUZpbHRlcihmaWx0ZXIpO1xuICAgICAgICAvLyBjb2xsZWN0IHBhcnRpYWxzXG4gICAgICAgIHZhciBwYXJ0aWFscyA9IGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0uZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlciwgJyB8fCAnLHRydWUpKTtcbiAgICAgICAgLy8gY29sbGVjdCBtaXNzaW5ncyAoZXhwbG9kZWQgLSBwYXJ0aWFscylcbiAgICAgICAgaWYgKHBhcnRpYWxzLmxlbmd0aCl7XG4gICAgICAgICAgICB2YXIgYmFkICA9IFtdO1xuICAgICAgICAgICAgLy8gcGFydGlhbCBkaWZmZXJlbmNlXG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIHBhcnRpYWxzKXtcbiAgICAgICAgICAgICAgICBiYWQucHVzaC5hcHBseShiYWQsZXhwbG9kZWQuZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIHBhcnRpYWxzW3hdLCcgJiYgJywgdHJ1ZSkpKTtcbiAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgY29uc29sZS5sb2coJ2V4cGxvZGVkIC0gcGFydGlhbCA6ICcgKyBKU09OLnN0cmluZ2lmeShiYWQpKTtcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IExhenkoZXhwbG9kZWQpLmRpZmZlcmVuY2UoYmFkKS50b0FycmF5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBleHBsb2RlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZpbHRlciBwYXJ0aWFsc1xuICAgICAgICBpZiAobWlzc2luZ3MubGVuZ3RoKXtcbiAgICAgICAgICAgIGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0ucHVzaC5hcHBseShjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLG1pc3NpbmdzKTtcbiAgICAgICAgICAgIC8vIGFnZ3JlZ2F0ZSBtaXNzaW5nc1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gTGF6eShmaWx0ZXIpLmtleXMoKS5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gTGF6eShtaXNzaW5ncykucGx1Y2soa2V5KS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtrZXksIHJldC5sZW5ndGg/cmV0OmZpbHRlcltrZXldXTtcbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdXQgOiAnICsgSlNPTi5zdHJpbmdpZnkobWlzc2luZ3MpKTtcbiAgICAgICAgICAgIC8vIGNsZWFuIGNvbmRpdGlvbmFsXG4gICAgICAgICAgICBjbGVhbkNvbXBvc2l0ZXMobW9kZWwsIG1pc3NpbmdzKTtcbiAgICAgICAgICAgIHJldHVybiBtaXNzaW5ncztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRJbmRleEZvciA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmllbGROYW1lKXtcbiAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsTmFtZSArICcuJyArIGZpZWxkTmFtZTtcbiAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIGFza2VkKSl7XG4gICAgICAgICAgICBhc2tlZFtpbmRleE5hbWVdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFza2VkW2luZGV4TmFtZV07XG4gICAgfVxufTsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1hbnlUb01hbnlSZWxhdGlvbihyZWxhdGlvbixtMm0pe1xuICAgIHZhciBpdGVtcyA9IFtdO1xuICAgIHRoaXMuYWRkID0gaXRlbXMucHVzaC5iaW5kKGl0ZW1zKTtcbiAgICB0aGlzLmFkZCA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAvLyAgICAgIGNvbnNvbGUubG9nKCdhZGRpbmcgJyArIGl0ZW0pO1xuICAgICAgICBpZiAoIShMYXp5KGl0ZW1zKS5maW5kKGl0ZW0pKSl7XG4gICAgICAgICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5nZXQwID0gZnVuY3Rpb24oaWQpe1xuICAgICAgICBtMm1bMV0uYXNrKGlkKTtcbiAgICAgICAgcmV0dXJuIExhenkoaXRlbXMpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHJldHVybiB4WzBdID09PSBpZDtcbiAgICAgICAgfSkucGx1Y2soXCIxXCIpLnRvQXJyYXkoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXQxID0gZnVuY3Rpb24oaWQpe1xuICAgICAgICBtMm1bMF0uYXNrKGlkKTtcbiAgICAgICAgcmV0dXJuIExhenkoaXRlbXMpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHJldHVybiB4WzFdID09PSBpZDtcbiAgICAgICAgfSkucGx1Y2soXCIwXCIpLnRvQXJyYXkoKTtcbiAgICB9O1xuICAgIHRoaXNbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlbGF0aW9uLmluZGV4TmFtZS5zcGxpdCgnLycpWzFdKV0gPSB0aGlzLmdldDE7XG4gICAgdGhpc1snZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVsYXRpb24uaW5kZXhOYW1lLnNwbGl0KCcvJylbMF0pXSA9IHRoaXMuZ2V0MDtcblxuICAgIHRoaXMuZGVsID0gZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgIHZhciBsID0gaXRlbXMubGVuZ3RoO1xuICAgICAgICB2YXIgaWR4ID0gbnVsbDtcbiAgICAgICAgZm9yICh2YXIgYSA9IDA7IGEgPCBsOyBhKyspeyBcbiAgICAgICAgICAgIGlmICgoaXRlbXNbYV1bMF0gPT09IGl0ZW1bMF0pICYmIChpdGVtc1thXVsxXSA9PT0gaXRlbVsxXSkpe1xuICAgICAgICAgICAgICAgIGlkeCA9IGE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkeCl7XG4gICAgICAgICAgICBpdGVtcy5zcGxpY2UoYSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ2RlbGV0aW5nICcsIGl0ZW0pO1xuICAgIH07XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKHByb3RvLCBwcm9wZXJ0eU5hbWUsZ2V0dGVyLCBzZXR0ZXIpe1xuICAgIHZhciBldmVudHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsNCk7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIFxuICAgIExhenkoZXZlbnRzKS5lYWNoKGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgcHJvdG8ub3JtLm9uKGV2ZW50LGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXN1bHQgPSB7fTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIHByb3BlcnR5RGVmID0ge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGNhY2hlZCgpe1xuICAgICAgICAgICAgaWYgKCEodGhpcy5pZCBpbiByZXN1bHQpKXtcbiAgICAgICAgICAgICAgICByZXN1bHRbdGhpcy5pZF0gPSBnZXR0ZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHRbdGhpcy5pZF07XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGlmIChzZXR0ZXIpe1xuICAgICAgICBwcm9wZXJ0eURlZlsnc2V0J10gPSBmdW5jdGlvbih2YWx1ZSl7XG4vLyAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gcmVzdWx0W3RoaXMuaWRdKXtcbiAgICAgICAgICAgICAgICBzZXR0ZXIuY2FsbCh0aGlzLHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCBpbiByZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgcHJvcGVydHlOYW1lLHByb3BlcnR5RGVmKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKGRhdGEpe1xuICAgIHRoaXMucmVzb3VyY2UgPSBkYXRhLl9yZXNvdXJjZTtcbiAgICB0aGlzLmZvcm1JZHggPSBkYXRhLmZvcm1JZHg7XG4gICAgdGhpcy5maWVsZHMgPSBkYXRhLmVycm9ycztcbn1cbnZhciBiYXNlT1JNID0gZnVuY3Rpb24ob3B0aW9ucywgZXh0T1JNKXtcbiAgICBcbiAgICAvLyBjcmVhdGluZyByZXdoZWVsIGNvbm5lY3Rpb25cbiAgICBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKXtcbiAgICAgICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgcmVXaGVlbENvbm5lY3Rpb24ob3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmNvbnN0cnVjdG9yID09PSB1dGlscy5yZVdoZWVsQ29ubmVjdGlvbil7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gb3B0aW9ucztcbiAgICB9XG4gICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICBjb25uZWN0aW9uLm9uKCdjb25uZWN0ZWQnLCBmdW5jdGlvbigpeyBcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSB0cnVlO1xuICAgIH0pO1xuICAgIHRoaXMub24gPSBjb25uZWN0aW9uLm9uO1xuICAgIHRoaXMuZW1pdCA9IGNvbm5lY3Rpb24uZW1pdDtcbiAgICB0aGlzLnVuYmluZCA9IGNvbm5lY3Rpb24udW5iaW5kO1xuICAgIHRoaXMub25jZSA9IGNvbm5lY3Rpb24ub25jZTtcbiAgICB0aGlzLiRwb3N0ID0gY29ubmVjdGlvbi4kcG9zdC5iaW5kKGNvbm5lY3Rpb24pO1xuXG4gICAgLy8gaGFuZGxpbmcgd2Vic29ja2V0IGV2ZW50c1xuICAgIHRoaXMub24oJ3dzLWNvbm5lY3RlZCcsZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmluZm8oJ1dlYnNvY2tldCBjb25uZWN0ZWQnKTtcbiAgICAgICAgLy8gYWxsIGpzb24gZGF0YSBoYXMgdG8gYmUgcGFyc2VkIGJ5IGdvdERhdGFcbiAgICAgICAgd3Mub25NZXNzYWdlSnNvbihXMlBSRVNPVVJDRS5nb3REYXRhLmJpbmQoVzJQUkVTT1VSQ0UpKTtcbiAgICAgICAgLy9cbiAgICAgICAgd3Mub25NZXNzYWdlVGV4dChmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnV1MgbWVzc2FnZSA6ICcgKyBtZXNzYWdlKVxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLm9uKCd3cy1kaXNjb25uZWN0ZWQnLCBmdW5jdGlvbih3cyl7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dlYnNvY2tldCBkaXNjb25uZWN0ZWQnKVxuICAgIH0pO1xuICAgIHRoaXMub24oJ2Vycm9yLWpzb24tNDA0JyxmdW5jdGlvbihlcnJvcix1cmwsIHNlbnREYXRhLCB4aHIpeyBcbiAgICAgICAgY29uc29sZS5lcnJvcignSlNPTiBlcnJvciAnLCBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xuICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW3VybC5zcGxpdCgnLycpWzBdXTtcbiAgICB9KTtcbiAgICB0aGlzLm9uKCdyZWFsdGltZS1tZXNzYWdlLWpzb24nLCBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShtZXNzYWdlKTtcbiAgICB9KTtcblxuICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIFcyUFJFU09VUkNFID0gdGhpcztcbiAgICB2YXIgSURCID0ge2F1dGhfZ3JvdXAgOiBMYXp5KHt9KX07IC8vIHRhYmxlTmFtZSAtPiBkYXRhIGFzIEFycmF5XG4gICAgdmFyIElEWCA9IHt9OyAvLyB0YWJsZU5hbWUgLT4gTGF6eShpbmRleEJ5KCdpZCcpKSAtPiBJREJbZGF0YV1cbiAgICB2YXIgUkVWSURYID0ge307IC8vIHRhYmxlTmFtZSAtPiBmaWVsZE5hbWUgLT4gTGF6eS5ncm91cEJ5KCkgLT4gSURCW0RBVEFdXG4gICAgdmFyIGJ1aWxkZXJIYW5kbGVycyA9IHt9O1xuICAgIHZhciBidWlsZGVySGFuZGxlclVzZWQgPSB7fTtcbiAgICB2YXIgcGVyc2lzdGVudEF0dHJpYnV0ZXMgPSB7fTtcbiAgICB2YXIgZXZlbnRIYW5kbGVycyA9IHt9O1xuICAgIHZhciBwZXJtaXNzaW9uV2FpdGluZyA9IHt9O1xuICAgIHZhciBtb2RlbENhY2hlID0ge307XG4gICAgdmFyIGZhaWxlZE1vZGVscyA9IHt9O1xuICAgIHZhciB3YWl0aW5nQ29ubmVjdGlvbnMgPSB7fSAvLyBhY3R1YWwgY29ubmVjdGlvbiB3aG8gaSdtIHdhaXRpbmcgZm9yXG4gICAgdmFyIGxpc3RDYWNoZSA9IG5ldyBMaXN0Q2FjaGVyKExhenkpO1xuICAgIHZhciBsaW5rZXIgPSBuZXcgQXV0b0xpbmtlcih3YWl0aW5nQ29ubmVjdGlvbnMsSURCLCB0aGlzLCBsaXN0Q2FjaGUpO1xuLyogICAgd2luZG93LmxsID0gbGlua2VyO1xuICAgIHdpbmRvdy5sYyA9IGxpc3RDYWNoZTtcbiovXG4gICAgd2luZG93LklEQiA9IElEQjtcbiAgICB0aGlzLnZhbGlkYXRpb25FdmVudCA9IHRoaXMub24oJ2Vycm9yLWpzb24tNTEzJywgZnVuY3Rpb24oZGF0YSwgdXJsLCBzZW50RGF0YSwgeGhyKXtcbiAgICAgICAgaWYgKGN1cnJlbnRDb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlcil7XG4gICAgICAgICAgICBjdXJyZW50Q29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIobmV3IFZhbGlkYXRpb25FcnJvcihkYXRhKSk7XG4gICAgICAgIH1cbiAgICB9KVxuXG4gICAgdmFyIGdldEluZGV4ID0gZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElEQilcbiAgICAgICAgICAgIHJldHVybiBJREJbaW5kZXhOYW1lXTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBJREJbaW5kZXhOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgcmV0dXJuIElEQltpbmRleE5hbWVdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgZ2V0VW5saW5rZWQgPSBmdW5jdGlvbiAoaW5kZXhOYW1lKSB7XG4gICAgICAgIGlmIChpbmRleE5hbWUgaW4gVU5MSU5LRUQpXG4gICAgICAgICAgICByZXR1cm4gVU5MSU5LRURbaW5kZXhOYW1lXTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBVTkxJTktFRFtpbmRleE5hbWVdID0ge307XG4gICAgICAgICAgICByZXR1cm4gVU5MSU5LRURbaW5kZXhOYW1lXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBQZXJtaXNzaW9uVGFibGUoaWQsIGtsYXNzLCBwZXJtaXNzaW9ucykge1xuICAgICAgICAvLyBjcmVhdGUgUGVybWlzc2lvblRhYmxlIGNsYXNzXG4gICAgICAgIHRoaXMua2xhc3MgPSBrbGFzcztcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IFtdO1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIGZvciAodmFyIGsgaW4gcGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgIHRoaXMucHVzaC5hcHBseSh0aGlzLCBbaywgcGVybWlzc2lvbnNba11dKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBQZXJtaXNzaW9uVGFibGUucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgLy8gc2F2ZSBPYmplY3QgdG8gc2VydmVyXG4gICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgcGVybWlzc2lvbnM6IExhenkodGhpcy5wZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFt4WzBdLmlkLCB4WzFdXVxuICAgICAgICAgICAgfSkudG9PYmplY3QoKVxuICAgICAgICB9O1xuICAgICAgICBkYXRhLmlkID0gdGhpcy5pZDtcbiAgICAgICAgdmFyIG1vZGVsTmFtZSA9IHRoaXMua2xhc3MubW9kZWxOYW1lO1xuICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmtsYXNzLm1vZGVsTmFtZSArICcvc2V0X3Blcm1pc3Npb25zJywgZGF0YSwgZnVuY3Rpb24gKG15UGVybXMsIGEsIGIsIHJlcSkge1xuICAgICAgICAgICAgY2IobXlQZXJtcyk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgUGVybWlzc2lvblRhYmxlLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKGdyb3VwX2lkLCBwZXJtaXNzaW9uTGlzdCkge1xuICAgICAgICB2YXIgcCA9IExhenkocGVybWlzc2lvbkxpc3QpO1xuICAgICAgICB2YXIgcGVybXMgPSBMYXp5KHRoaXMua2xhc3MuYWxsUGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LCBwLmNvbnRhaW5zKHgpXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICB2YXIgbCA9IExhenkodGhpcy5wZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4geFswXS5pZFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGwuY29udGFpbnMoZ3JvdXBfaWQpKVxuICAgICAgICAgICAgdGhpcy5wZXJtaXNzaW9uc1tsLmluZGV4T2YoZ3JvdXBfaWQpXVsxXSA9IHBlcm1zO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGlzLnBlcm1pc3Npb25zLnB1c2goW0lEQi5hdXRoX2dyb3VwLmdldChncm91cF9pZCksIHBlcm1zXSk7XG4gICAgfTtcblxuICAgIC8vIGNyZWF0ZXMgZHluYW1pY2FsIG1vZGVsc1xuICAgIHZhciBtYWtlTW9kZWxDbGFzcyA9IGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICB2YXIgX21vZGVsID0gbW9kZWw7XG4gICAgICAgIG1vZGVsLmZpZWxkcy5pZC5yZWFkYWJsZSA9IGZhbHNlO1xuICAgICAgICBtb2RlbC5maWVsZHMuaWQud3JpdGFibGUgPSBmYWxzZTtcbiAgICAgICAgdmFyIGZpZWxkcyA9IExhenkobW9kZWwuZmllbGRzKTtcbiAgICAgICAgaWYgKG1vZGVsLnByaXZhdGVBcmdzKSB7XG4gICAgICAgICAgICBmaWVsZHMgPSBmaWVsZHMubWVyZ2UobW9kZWwucHJpdmF0ZUFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ21vZGVsLWRlZmluaXRpb24nLCBtb2RlbCwgZ2V0SW5kZXgobW9kZWwubmFtZSkpO1xuICAgICAgICAvLyBnZXR0aW5nIGZpZWxkcyBvZiB0eXBlIGRhdGUgYW5kIGRhdGV0aW1lXG4vKlxuICAgICAgICB2YXIgREFURUZJRUxEUyA9IGZpZWxkcy5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKVxuICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKHgsIHYpIHtcbiAgICAgICAgICAgIHJldHVybiBbdiwgdHJ1ZV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcblxuICAgICAgICAvLyBnZXR0aW5nIGJvb2xlYW4gZmllbGRzXG4gICAgICAgIHZhciBCT09MRklFTERTID0gZmllbGRzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKVxuICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKHgsIHYpIHtcbiAgICAgICAgICAgIHJldHVybiBbdiwgdHJ1ZV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcblxuICAgICAgICAvLyBib29sZWFucyBhbmQgZGF0ZXRpbWVzIHN0b3JhZ2UgZXh0ZXJuYWwgXG4gICAgICAgIE1PREVMX0RBVEVGSUVMRFNbbW9kZWwubmFtZV0gPSBEQVRFRklFTERTO1xuICAgICAgICBNT0RFTF9CT09MRklFTERTW21vZGVsLm5hbWVdID0gQk9PTEZJRUxEUztcbiovXG4gICAgICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHZhciBmdW5jU3RyaW5nID0gXCJpZiAoIXJvdykgeyByb3cgPSB7fX07XFxuXCI7XG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gbW9kZWwucmVmZXJlbmNlcy5tYXAoZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgcmV0dXJuICd0aGlzLl8nICsgZmllbGQuaWQgKyAnID0gcm93LicgKyBmaWVsZC5pZCArICc7JztcbiAgICAgICAgfSkuam9pbignO1xcbicpO1xuICAgICAgICBcbiAgICAgICAgLy8gZGF0ZWZpZWxkIGNvbnZlcnNpb25cbiAgICAgICAgZnVuY1N0cmluZyArPSBmaWVsZHMubWFwKGZ1bmN0aW9uICh4LGspIHtcbiAgICAgICAgICAgIGlmICgoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IHJvdy4nICsgayArICc/bmV3IERhdGUocm93LicgKyBrICsgJyAqIDEwMDAgLSAnICsgdXRpbHMudHpPZmZzZXQgKyAnKTpudWxsO1xcbic7IFxuICAgICAgICAgICAgfSBlbHNlIGlmICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IChyb3cuJyArIGsgKyAnID09PSBcIlRcIikgfHwgKHJvdy4nICsgayArICcgPT09IHRydWUpO1xcbic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSByb3cuJyArIGsgKyAnO1xcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnRvU3RyaW5nKCdcXG4nKTsgKyAnXFxuJztcblxuICAgICAgICBmdW5jU3RyaW5nICs9IFwiaWYgKHBlcm1pc3Npb25zKSB7dGhpcy5fcGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucyAmJiBMYXp5KHBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIFt4LCB0cnVlXSB9KS50b09iamVjdCgpO31cIlxuXG4gICAgICAgIFxuICAgICAgICAvLyBtYXN0ZXIgY2xhc3MgZnVuY3Rpb25cbiAgICAgICAgdmFyIEtsYXNzID0gbmV3IEZ1bmN0aW9uKCdyb3cnLCAncGVybWlzc2lvbnMnLGZ1bmNTdHJpbmcpXG5cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLm9ybSA9IGV4dE9STTtcbiAgICAgICAgS2xhc3MucmVmX3RyYW5zbGF0aW9ucyA9IHt9O1xuICAgICAgICBLbGFzcy5tb2RlbE5hbWUgPSBtb2RlbC5uYW1lO1xuICAgICAgICBLbGFzcy5yZWZlcmVuY2VzID0gTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5wbHVjaygnaWQnKS50b0FycmF5KCk7XG5cbiAgICAgICAgS2xhc3MuaW52ZXJzZV9yZWZlcmVuY2VzID0gbW9kZWwucmVmZXJlbmNlZEJ5Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgLy8gbWFuYWdpbmcgcmVmZXJlbmNlcyB3aGVyZSBcbiAgICAgICAgICAgIHJldHVybiB4LmJ5ICsgJ18nICsgeC5pZCArICdfc2V0J1xuICAgICAgICB9KTtcbiAgICAgICAgS2xhc3MucmVmZXJlbnRzID0gbW9kZWwucmVmZXJlbmNlZEJ5Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LmJ5LCB4LmlkXVxuICAgICAgICB9KTtcbiAgICAgICAgS2xhc3MuZmllbGRzT3JkZXIgPSBtb2RlbC5maWVsZE9yZGVyO1xuICAgICAgICBLbGFzcy5hbGxQZXJtaXNzaW9ucyA9IG1vZGVsLnBlcm1pc3Npb25zO1xuXG4gICAgICAgIC8vIHJlZGVmaW5pbmcgdG9TdHJpbmcgbWV0aG9kXG4gICAgICAgIGlmIChMYXp5KG1vZGVsLnJlcHJlc2VudGF0aW9uKS5zaXplKCkpe1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnRvU3RyaW5nID0gbmV3IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcy4nICsgTGF6eShtb2RlbC5yZXByZXNlbnRhdGlvbikudG9TdHJpbmcoJyArIFwiIFwiICsgdGhpcy4nKSk7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnRvVXBwZXJDYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gcmVkZWZpbmUgdG8gVXBwZXJDYXNlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIH07XG4gICAgICBcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnRvTG93ZXJDYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGRlbGV0ZSBpbnN0YW5jZSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5kZWxldGUodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUsIFt0aGlzLmlkXSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gcGVybWlzc2lvbiBnZXR0ZXIgcHJvcGVydHlcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEtsYXNzLnByb3RvdHlwZSwgJ3Blcm1pc3Npb25zJywge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3Blcm1pc3Npb25zKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcGVybWlzc2lvbnM7XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtlci5wZXJtaXNzaW9uc1t0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZV0uYXNrKHRoaXMuaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGdldHRpbmcgZnVsbCBwZXJtaXNzaW9uIHRhYmxlIGZvciBhbiBvYmplY3RcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmFsbF9wZXJtcyA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgdmFyIG9iamVjdF9pZCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSArICcvYWxsX3Blcm1zJywge2lkOiB0aGlzLmlkfSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGVybWlzc2lvbnMgPSBkYXRhO1xuICAgICAgICAgICAgICAgIHZhciBncm91cGVkID0ge307XG4gICAgICAgICAgICAgICAgdmFyIHVua25vd25fZ3JvdXBzID0gTGF6eShwZXJtaXNzaW9ucykucGx1Y2soJ2dyb3VwX2lkJykudW5pcXVlKCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnJyArIHhcbiAgICAgICAgICAgICAgICB9KS5kaWZmZXJlbmNlKElEQi5hdXRoX2dyb3VwLmtleXMoKSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIExhenkocGVybWlzc2lvbnMpLmdyb3VwQnkoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguZ3JvdXBfaWRcbiAgICAgICAgICAgICAgICB9KS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyb3VwZWRba10gPSBMYXp5KHYpLnBsdWNrKCduYW1lJykudG9BcnJheSgpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdmFyIGNhbGwgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBjYihuZXcgUGVybWlzc2lvblRhYmxlKG9iamVjdF9pZCwgS2xhc3MsIGdyb3VwZWQpKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmICh1bmtub3duX2dyb3Vwcy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdldCgnYXV0aF9ncm91cCcsdW5rbm93bl9ncm91cHMsY2FsbCk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBjYWxsKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICB2YXIgbyA9IHRoaXMuYXNSYXcoKTtcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSBLbGFzcy5maWVsZHM7XG4gICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgdmFyIG1vZGVsTmFtZSA9IHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhcmcgaW4gYXJncykge1xuICAgICAgICAgICAgICAgICAgICBvW2FyZ10gPSBhcmdzW2FyZ107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gZWxpbWluYXRlIHVud3JpdGFibGVzXG4gICAgICAgICAgICBMYXp5KEtsYXNzLmZpZWxkc09yZGVyKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFmaWVsZHNbeF0ud3JpdGFibGU7XG4gICAgICAgICAgICB9KS5lYWNoKGZ1bmN0aW9uKGZpZWxkTmFtZSl7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSBpbiBvKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBvW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoSUQpIHsgby5pZCA9IElEOyB9XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IFcyUFJFU09VUkNFLiRwb3N0KG1vZGVsTmFtZSArIChJRCA/ICcvcG9zdCcgOiAnL3B1dCcpLCBvKTtcbiAgICAgICAgICAgIGlmIChhcmdzICYmIChhcmdzLmNvbnN0cnVjdG9yID09PSBGdW5jdGlvbikpe1xuICAgICAgICAgICAgICAgIC8vIHBsYWNpbmcgY2FsbGJhY2sgaW4gYSBjb21tb24gcGxhY2VcbiAgICAgICAgICAgICAgICBwcm9taXNlLmNvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyID0gYXJncztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlXG4gICAgICAgIH07XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG9iaiA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMuYXNSYXcoKSk7XG4gICAgICAgICAgICBvYmouX3Blcm1pc3Npb25zID0gdGhpcy5fcGVybWlzc2lvbnM7XG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGJ1aWxkaW5nIHNlcmlhbGl6YXRpb24gZnVuY3Rpb25cbiAgICAgICAgdmFyIGFzciA9ICdyZXR1cm4ge1xcbicgKyBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLm1hcChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICByZXR1cm4gZmllbGQuaWQgKyAnIDogdGhpcy5fJyArIGZpZWxkLmlkO1xuICAgICAgICB9KS5jb25jYXQoZmllbGRzLm1hcChmdW5jdGlvbiAoeCxrKSB7XG4gICAgICAgICAgICBpZiAoKHgudHlwZSA9PSAnZGF0ZScpIHx8ICh4LnR5cGUgPT0gJ2RhdGV0aW1lJykpe1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6ICh0aGlzLicgKyBrICsgJz8oTWF0aC5yb3VuZCh0aGlzLicgKyBrICsgJy5nZXRUaW1lKCkgLSB0aGlzLicgKyBrICsgJy5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDApIC8gMTAwMCk6bnVsbCknOyBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeC50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6IHRoaXMuJyArIGsgKyAnP1wiVFwiOlwiRlwiJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogdGhpcy4nICsgaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpLnRvU3RyaW5nKCcsXFxuJykgKyAnfTsnO1xuICAgICAgICBLbGFzcy5wcm90b3R5cGUuYXNSYXcgPSBuZXcgRnVuY3Rpb24oYXNyKTtcblxuICAgICAgICBLbGFzcy5zYXZlTXVsdGkgPSBmdW5jdGlvbiAob2JqZWN0cywgY2IsIHNjb3BlKSB7XG4gICAgICAgICAgICB2YXIgcmF3ID0gW107XG4gICAgICAgICAgICB2YXIgZGVsZXRhYmxlID0gTGF6eShLbGFzcy5maWVsZHMpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIXgud3JpdGFibGVcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5wbHVjaygnaWQnKVxuICAgICAgICAgICAgICAgIC50b0FycmF5KCk7XG4gICAgICAgICAgICBMYXp5KG9iamVjdHMpXG4gICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5hc1JhdygpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KGRlbGV0YWJsZSkuZWFjaChmdW5jdGlvbiAoeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHhbeV07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByYXcucHVzaCh4KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSwgJ3B1dCcsIHttdWx0aXBsZTogcmF3LCBmb3JtSWR4IDogVzJQUkVTT1VSQ0UuZm9ybUlkeCsrfSwgZnVuY3Rpb24gKGVsZW1zKSB7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShlbGVtcyk7XG4gICAgICAgICAgICAgICAgdmFyIHRhYiA9IElEQltLbGFzcy5tb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIHZhciBvYmpzID0gTGF6eShlbGVtc1tLbGFzcy5tb2RlbE5hbWVdLnJlc3VsdHMpLnBsdWNrKCdpZCcpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFiLmdldCh4KVxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBpZiAoY2IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2Iob2Jqcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgc2NvcGUpO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoJ2V4dHJhX3ZlcmJzJyBpbiBtb2RlbClcbiAgICAgICAgICAgIExhenkobW9kZWwuZXh0cmFfdmVyYnMpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZnVuY05hbWUgPSB4WzBdO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0geFsxXTtcbiAgICAgICAgICAgICAgICB2YXIgZGRhdGEgPSAnZGF0YSA9IHtpZCA6IHRoaXMuaWQnO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgZGRhdGEgKz0gJywgJyArIExhenkoYXJncykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHggKyAnIDogJyArIHg7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5qb2luKCcsJyk7XG4gICAgICAgICAgICAgICAgZGRhdGEgKz0gJ307JztcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goJ2NiJyk7XG4gICAgICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlW2Z1bmNOYW1lXSA9IG5ldyBGdW5jdGlvbihhcmdzLCBkZGF0YSArICdXMlMuVzJQX1BPU1QodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUsXCInICsgZnVuY05hbWUgKyAnXCIsIGRhdGEsZnVuY3Rpb24oZGF0YSxzdGF0dXMsaGVhZGVycyx4KXsnICtcbiAgICAgICAgICAgICAgICAgICAgJ3RyeXtcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJyAgIGlmICghaGVhZGVycyhcIm5vbW9kZWxcIikpIHt3aW5kb3cuVzJTLmdvdERhdGEoZGF0YSxjYik7fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnICAgZWxzZSB7aWYgKGNiKSB7Y2IoZGF0YSl9fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfSBjYXRjaChlKXtcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ2lmIChjYikge2NiKGRhdGEpO31cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ31cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ30pO1xcbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIGlmICgncHJpdmF0ZUFyZ3MnIGluIG1vZGVsKSB7XG4gICAgICAgICAgICBLbGFzcy5wcml2YXRlQXJncyA9IExhenkobW9kZWwucHJpdmF0ZUFyZ3MpLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHRydWVdO1xuICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS5zYXZlUEEgPSBmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgIHZhciBUID0gdGhpcztcbiAgICAgICAgICAgICAgICB2YXIgb28gPSB7aWQ6IHRoaXMuaWR9O1xuICAgICAgICAgICAgICAgIHZhciBQQSA9IHRoaXMuY29uc3RydWN0b3IucHJpdmF0ZUFyZ3M7XG4gICAgICAgICAgICAgICAgdmFyIEZzID0gdGhpcy5jb25zdHJ1Y3Rvci5maWVsZHM7XG4gICAgICAgICAgICAgICAgdmFyIHQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihvKS5hc1JhdygpO1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZElkeCA9IExhenkoUEEpLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCBGc1t4XV1cbiAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIExhenkobykuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGsgaW4gUEEpICYmIGZpZWxkSWR4W2tdLndyaXRhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvb1trXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSArICcvc2F2ZVBBJywgb28sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShvbykuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgVFtrXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1vZGVsQ2FjaGVbS2xhc3MubW9kZWxOYW1lXSA9IEtsYXNzO1xuICAgICAgICAvLyBhZGRpbmcgaWQgdG8gZmllbGRzXG4gICAgICAgIGZvciAodmFyIGYgaW4gbW9kZWwuZmllbGRzKSB7XG4gICAgICAgICAgICBtb2RlbC5maWVsZHNbZl0uaWQgPSBmO1xuICAgICAgICB9XG4gICAgICAgIEtsYXNzLmZpZWxkcyA9IExhenkobW9kZWwuZmllbGRzKS5jb25jYXQoTGF6eShtb2RlbC5wcml2YXRlQXJncykpLmNvbmNhdChMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLnRhcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgeC50eXBlID0geC50eXBlIHx8ICdyZWZlcmVuY2UnXG4gICAgICAgIH0pKS5pbmRleEJ5KCdpZCcpLnRvT2JqZWN0KCk7XG4gICAgICAgIC8vIHNldHRpbmcgd2lkZ2V0cyBmb3IgZmllbGRzXG4gICAgICAgIExhenkoS2xhc3MuZmllbGRzKS5lYWNoKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIGlmICghZmllbGQud2lkZ2V0KXtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGQudHlwZSA9PT0gJ3JlZmVyZW5jZScpe1xuICAgICAgICAgICAgICAgICAgICBmaWVsZC53aWRnZXQgPSAnY2hvaWNlcydcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmaWVsZC53aWRnZXQgPSBmaWVsZC50eXBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGJ1aWxkaW5nIHJlZmVyZW5jZXMgdG8gKG1hbnkgdG8gb25lKSBmaWVsZHNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgIHZhciBleHRfcmVmID0gcmVmLnRvO1xuICAgICAgICAgICAgdmFyIGxvY2FsX3JlZiA9ICdfJyArIHJlZi5pZDtcbiAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCByZWYuaWQsZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICghKGV4dF9yZWYgaW4gSURCKSl7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShleHRfcmVmLGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLm1haW5JbmRleFtleHRfcmVmXS5hc2sodGhzW2xvY2FsX3JlZl0sdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gKGV4dF9yZWYgaW4gSURCKSAmJiB0aGlzW2xvY2FsX3JlZl0gJiYgSURCW2V4dF9yZWZdLmdldCh0aGlzW2xvY2FsX3JlZl0pO1xuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0ICYmIChleHRfcmVmIGluIGxpbmtlci5tYWluSW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFza2luZyB0byBsaW5rZXJcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLm1haW5JbmRleFtleHRfcmVmXS5hc2sodGhpc1tsb2NhbF9yZWZdLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXRpbHMubW9jaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHZhbHVlLmNvbnN0cnVjdG9yICE9PSB1dGlscy5tb2NrKSAmJiAodmFsdWUuY29uc3RydWN0b3IubW9kZWxOYW1lICE9PSBleHRfcmVmKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IGNhbiBhc3NpZ24gb25seSAnICsgZXh0X3JlZiArICcgdG8gJyArIHJlZi5pZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpc1tsb2NhbF9yZWZdID0gdmFsdWUuaWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tsb2NhbF9yZWZdID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAnbmV3LScgKyBleHRfcmVmLCAnZGVsZXRlZC0nICsgZXh0X3JlZiwndXBkYXRlZC0nICsgZXh0X3JlZiwgJ25ldy1tb2RlbC0nICsgZXh0X3JlZiwgJ3VwZGF0ZWQtJyArIEtsYXNzLm1vZGVsTmFtZSk7XG5cblxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWYuaWQpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0T1JNLmdldChleHRfcmVmLHRoaXNbbG9jYWxfcmVmXSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2J1aWxkaW5nIHJlZmVyZW5jZXMgdG8gKG9uZSB0byBtYW55KSBmaWVsZHNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VkQnkpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHJlZi5ieSArICcuJyArIHJlZi5pZDtcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSByZWYuYnkgKyAnXycgKyB1dGlscy5wbHVyYWxpemUocmVmLmlkKTtcbiAgICAgICAgICAgIHZhciByZXZJbmRleCA9IHJlZi5ieTtcbiAgICAgICAgICAgIGlmIChLbGFzcy5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RyeWVkIHRvIHJlZGVmaW5lIHByb3BlcnR5ICcgKyBwcm9wZXJ0eU5hbWUgKyAncycgKyAnIGZvciAnICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHByb3BlcnR5TmFtZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gKHJldkluZGV4IGluIElEQikgPyBSRVZJRFhbaW5kZXhOYW1lXS5nZXQodGhpcy5pZCArICcnKTpudWxsO1xuICAgICAgICAgICAgICAgICAgICBsaW5rZXIuZm9yZWlnbktleXNbaW5kZXhOYW1lXS5hc2sodGhpcy5pZCx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICB9LCBudWxsLCAnbmV3LScgKyByZXZJbmRleCwgJ3VwZGF0ZWQtJyArIHJldkluZGV4LCAnZGVsZXRlZC0nICsgcmV2SW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZSh1dGlscy5wbHVyYWxpemUocmVmLmJ5KSldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBvcHRzID0ge307XG4gICAgICAgICAgICAgICAgb3B0c1tyZWYuaWRdID0gW3RoaXMuaWRdO1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRPUk0ucXVlcnkocmVmLmJ5LG9wdHMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9idWlsZGluZyByZWZlcmVuY2UgdG8gKG1hbnkgdG8gbWFueSkgZmllbGRzXG4gICAgICAgIGlmIChtb2RlbC5tYW55VG9NYW55KSB7XG4gICAgICAgICAgICBMYXp5KG1vZGVsLm1hbnlUb01hbnkpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSByZWYuaW5kZXhOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCA9IHJlZi5maXJzdD8gMCA6IDE7XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbE5hbWUgPSByZWYubW9kZWw7XG4vLyAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gZ2V0SW5kZXgob21vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIGdldHRlciA9IGxpbmtlci5tMm1JbmRleFtpbmRleE5hbWVdWydnZXQnICsgKDEgLSBmaXJzdCldO1xuXG4gICAgICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5tb2RlbCArICdzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gZ2V0dGVyKHRocy5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1cyUFJFU09VUkNFLmZldGNoKG9tb2RlbE5hbWUsIHtpZCA6IGlkc30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldCA9IGdldEluZGV4KG9tb2RlbE5hbWUpLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMgJiYgZ2V0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldCA9IExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICAgICAgfSwgbnVsbCwgJ3JlY2VpdmVkLW0ybS0nICsgaW5kZXhOYW1lLCAncmVjZWl2ZWQtJyArIG9tb2RlbE5hbWUpO1xuXG4gICAgICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZSh1dGlscy5wbHVyYWxpemUob21vZGVsTmFtZSkpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtlci5nZXRNMk0oaW5kZXhOYW1lLCBbdGhzLmlkXSwgZmlyc3QsZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSxudWxsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdldCA9IElEQltvbW9kZWxOYW1lXS5nZXQuYmluZChJREJbb21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChMYXp5KGlkcykubWFwKGdldCkuZmlsdGVyKHV0aWxzLmJvb2wpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChbXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgICAgICBLbGFzcy5maWVsZHNbdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWxOYW1lKV0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiB1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpLFxuICAgICAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcmVhZGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdNMk0nLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3JzOiBbXVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUudW5saW5rUmVmZXJlbmNlID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgICAgICB2YXIgaW5zdGFuY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmNvbnN0cnVjdG9yLm5hbWUgPT0gJ0FycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlcyA9IGluc3RhbmNlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IGluc3RhbmNlc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbCA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW0lELCB4XVxuICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBbW0lELCBpbnN0YW5jZS5pZF1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWwgKyAncy9kZWxldGUnLCB7Y29sbGVjdGlvbjogY29sbGVjdGlvbn0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWw7XG4gICAgICAgICAgICAgICAgaWYgKG11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWZzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaW5kZXhOYW1lID0gb21vZGVsICsgJy8nICsgS2xhc3MubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElOREVYX00yTSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVmcyA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5kaWZmZXJlbmNlKExhenkoSU5ERVhfTTJNW2luZGV4TmFtZV1bMF0uZ2V0KHRoaXMuaWQpKSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWZzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBMYXp5KHJlZnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBfUE9TVChLbGFzcy5tb2RlbE5hbWUsIG9tb2RlbCArICdzL3B1dCcsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChpbmRleE5hbWUgaW4gbGlua2VyLm0ybUluZGV4KSAmJiBMYXp5KGxpbmtlci5tMm1JbmRleFtpbmRleE5hbWVdWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWwpXShpbnN0YW5jZS5pZCkpLmZpbmQodGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWwgKyAncy9wdXQnLCB7Y29sbGVjdGlvbjogW1t0aGlzLmlkLCBpbnN0YW5jZS5pZF1dfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCduZXctbW9kZWwnLCBLbGFzcyk7XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ25ldy1tb2RlbC0nICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgcmV0dXJuIEtsYXNzO1xuICAgIH07XG5cbiAgICB0aGlzLmdvdERhdGEgPSBmdW5jdGlvbiAoZGF0YSwgY2FsbEJhY2spIHtcbiAgICAgICAgLy8gcmVjZWl2ZSBhbGwgZGF0YSBmcm9tIGV2ZXJ5IGVuZCBwb2ludFxuICAgICAgICBjb25zb2xlLmluZm8oJ2dvdERhdGEnKTtcbiAgICAgICAgaWYgKHR5cGVvZihkYXRhKSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2RhdGEgJyArIGRhdGEgKyAnIHJlZnVzZWQgZnJvbSBnb3REYXRhKCknKTtcbiAgICAgICAgICAgIGlmIChjYWxsQmFjaykge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBjbGVhbiBkYXRhIGZyb20gcmVsYXRpb25zIGFuZCBwZXJtaXNzaW9ucyBmb3IgdXNpbmcgaXQgYWZ0ZXIgbW9kZWwgcGFyc2luZ1xuICAgICAgICBpZiAoJ19leHRyYScgaW4gZGF0YSl7IGRlbGV0ZSBkYXRhLl9leHRyYSB9XG4gICAgICAgIHZhciBUT09ORSA9IGRhdGEuVE9PTkU7XG4gICAgICAgIHZhciBUT01BTlkgPSBkYXRhLlRPTUFOWTtcbiAgICAgICAgdmFyIE1BTllUT01BTlkgPSBkYXRhLk1BTllUT01BTlk7XG4gICAgICAgIHZhciBQRVJNSVNTSU9OUyA9IGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIHZhciBQQSA9IGRhdGEuUEE7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPT05FO1xuICAgICAgICBkZWxldGUgZGF0YS5UT01BTlk7XG4gICAgICAgIGRlbGV0ZSBkYXRhLk1BTllUT01BTlk7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBFUk1JU1NJT05TO1xuICAgICAgICBkZWxldGUgZGF0YS5QQTtcbiAgICAgICAgaWYgKCFQQSkgeyBQQSA9IHt9OyB9XG5cbiAgICAgICAgLy8gY2xlYW5pbmcgZnJvbSB1c2VsZXNzIGRlbGV0ZWQgZGF0YVxuICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5maWx0ZXIoZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgIHJldHVybiAoISgnZGVsZXRlZCcgaW4gdikgfHwgKChrIGluIG1vZGVsQ2FjaGUpKSk7XG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJ20ybScgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG0ybSA9IGRhdGEubTJtO1xuICAgICAgICAgICAgZGVsZXRlIGRhdGFbJ20ybSddO1xuICAgICAgICB9XG4gICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbiAoZGF0YSwgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICAgICAgICAgIHZhciBtb2RlbENsYXNzID0gbW9kZWw7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucmVzdWx0cyAmJiAoZGF0YS5yZXN1bHRzLmxlbmd0aCA+IDApICYmIChkYXRhLnJlc3VsdHNbMF0uY29uc3RydWN0b3IgPT0gQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cyA9IExhenkoZGF0YS5yZXN1bHRzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTGF6eShtb2RlbENsYXNzLmZpZWxkc09yZGVyKS56aXAoeCkudG9PYmplY3QoKVxuICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIHZhciBkZWxldGVkID0gZGF0YS5kZWxldGVkO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gUEEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIE1QQSA9IFBBW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIExhenkocmVzdWx0cykuZWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3JkLmlkIGluIE1QQSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoTVBBW3JlY29yZC5pZF0pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBpbmRleGluZyByZWZlcmVuY2VzIGJ5IGl0cyBJRFxuICAgICAgICAgICAgICAgIHZhciBpdGFiID0gZ2V0SW5kZXgobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFibGUgPSBpdGFiLnNvdXJjZTtcblxuICAgICAgICAgICAgICAgIC8vIG9iamVjdCBkZWxldGlvblxuICAgICAgICAgICAgICAgIGlmIChkZWxldGVkKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlZC5mb3JFYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbi8qXG4gICAgICAgICAgICAgICAgTGF6eShkZWxldGVkKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0YWJsZVt4XTtcbiAgICAgICAgICAgICAgICB9KTtcbiovXG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IHJlc3VsdHMuaW5kZXhCeSgnaWQnKTtcbiAgICAgICAgICAgICAgICB2YXIgaWsgPSBpZHgua2V5cygpO1xuICAgICAgICAgICAgICAgIHZhciBubmV3ID0gaWsuZGlmZmVyZW5jZShpdGFiLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgpXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkID0gaWsuZGlmZmVyZW5jZShubmV3KTtcbiAgICAgICAgICAgICAgICAvLyByZW1vdmluZyBvbGQgaWRlbnRpY2FsIHZhbHVlc1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQgPSB1cGRhdGVkLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIXV0aWxzLnNhbWVBcyhpZHguZ2V0KHgpLCBpdGFiLmdldCh4KS5hc1JhdygpKTtcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy8gY2xhc3NpZnkgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIHZhciBwZXJtcyA9IGRhdGEucGVybWlzc2lvbnMgPyBMYXp5KGRhdGEucGVybWlzc2lvbnMpIDogTGF6eSh7fSk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld09iamVjdHMgPSBubmV3Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IG1vZGVsQ2xhc3MoaWR4LmdldCh4KSwgcGVybXMuZ2V0KHgpKVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBjbGFzc2lmeWluZyB1cGRhdGVkXG4gICAgICAgICAgICAgICAgLy92YXIgdXBkYXRlZE9iamVjdHMgPSB1cGRhdGVkLm1hcChmdW5jdGlvbih4KXtyZXR1cm4gbmV3IG1vZGVsQ2xhc3MoaWR4LmdldCh4KSxwZXJtcy5nZXQoeCkpfSk7XG4gICAgICAgICAgICAgICAgLy92YXIgdW8gPSB1cGRhdGVkT2JqZWN0cy50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy91cGRhdGVkT2JqZWN0cyA9IExhenkodW8pLm1hcChmdW5jdGlvbih4KXtyZXR1cm4gW3gsdGFibGVbeC5pZF1dfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0aW5nIHNpbmdsZSBvYmplY3RzXG4gICAgICAgICAgICAgICAgdmFyIGNoYW5nZWQgPSBbXTtcbi8vICAgICAgICAgICAgICAgIHZhciBEQVRFRklFTERTID0gTU9ERUxfREFURUZJRUxEU1ttb2RlbE5hbWVdO1xuLy8gICAgICAgICAgICAgICAgdmFyIEJPT0xGSUVMRFMgPSBNT0RFTF9CT09MRklFTERTW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgdXBkYXRlZC5mb3JFYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvbGRJdGVtID0gdGFibGVbeF07XG4gICAgICAgICAgICAgICAgICAgIHZhciBvbGRDb3B5ID0gb2xkSXRlbS5jb3B5KCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdJdGVtID0gbmV3IG1vZGVsQ2xhc3MoaWR4LmdldCh4KSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBvbGQgaXRlbSB0byBtYXRjaCBuZXcgaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShtb2RlbC5maWVsZHMpLmtleXMoKS5lYWNoKGZ1bmN0aW9uKGspe1xuICAgICAgICAgICAgICAgICAgICAgICAgb2xkSXRlbVtrXSA9IG5ld0l0ZW1ba107XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkLnB1c2goW25ld0l0ZW0sIG9sZENvcHldKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vLy8gc2VuZGluZyBzaWduYWwgZm9yIHVwZGF0ZWQgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKGNoYW5nZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3VwZGF0ZWQtJyArIG1vZGVsTmFtZSwgY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vKioqKioqKiogVXBkYXRlIHVuaXZlcnNlICoqKioqKioqXG4gICAgICAgICAgICAgICAgdmFyIG5vID0gbmV3T2JqZWN0cy50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgTGF6eShubykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB0YWJsZVt4LmlkXSA9IHhcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyByZWJ1bGRpbmcgcmV2ZXJzZSBpbmRleGVzXG4gICAgICAgICAgICAgICAgTGF6eShtb2RlbENhY2hlW21vZGVsTmFtZV0ucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgICAgIFJFVklEWFttb2RlbE5hbWUgKyAnLicgKyByZWZdID0gSURCW21vZGVsTmFtZV0uZ3JvdXBCeSgnXycgKyByZWYpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHNlbmRpbmcgZXZlbnRzIGZvciBuZXcgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKG5vLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbmV3LScgKyBtb2RlbE5hbWUsIExhenkobm8pLCBkYXRhLnRvdGFsUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnZGVsZXRlZC0nICsgbW9kZWxOYW1lLCBkZWxldGVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIGRhdGEgYXJyaXZlZFxuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLScgKyBtb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoVE9PTkUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RPT05FJyk7XG4gICAgICAgICAgICBMYXp5KFRPT05FKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB1ZHggPSBnZXRVbmxpbmtlZChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFRPTUFOWSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVE9NQU5ZJyk7XG4gICAgICAgICAgICBMYXp5KFRPTUFOWSkuZWFjaChmdW5jdGlvbiAodmFscywgaW5kZXhOYW1lKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIEFTS0VEX1VOTElOS0VEKSkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9VTkxJTktFRFtpbmRleE5hbWVdID0gTGF6eShbXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIExhenkodmFscykuZWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfVU5MSU5LRURbaW5kZXhOYW1lXS5zb3VyY2UucHVzaChpZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoTUFOWVRPTUFOWSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTUFOWVRPTUFOWScpO1xuICAgICAgICAgICAgTGF6eShNQU5ZVE9NQU5ZKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBpbmRleE5hbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3QgPSBwYXJzZUludChpbmRleE5hbWUuc3BsaXQoJ3wnKVsxXSk7XG4gICAgICAgICAgICAgICAgaW5kZXhOYW1lID0gaW5kZXhOYW1lLnNwbGl0KCd8JylbMF07XG4gICAgICAgICAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIEFTS0VEX00yTSkpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfTTJNW2luZGV4TmFtZV0gPSBbe30sIHt9XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIE1JRFggPSBBU0tFRF9NMk1baW5kZXhOYW1lXVtmaXJzdF07XG4gICAgICAgICAgICAgICAgTGF6eSh2YWxzKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIE1JRFhbeCArICcnXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIE1JRFhbeF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG0ybSkge1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290TTJNKG0ybSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFBFUk1JU1NJT05TKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RQZXJtaXNzaW9ucyhQRVJNSVNTSU9OUyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2FsbEJhY2spIHtcbiAgICAgICAgICAgIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ2dvdC1kYXRhJyk7XG4gICAgfTtcbiAgICB0aGlzLmdvdFBlcm1pc3Npb25zID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uICh2LCByZXNvdXJjZU5hbWUpIHtcbiAgICAgICAgICAgIExhenkodlswXSkuZWFjaChmdW5jdGlvbiAocm93LCBpZCkge1xuICAgICAgICAgICAgICAgIGlmICgocmVzb3VyY2VOYW1lIGluIElEQikgJiYgKGlkIGluIElEQltyZXNvdXJjZU5hbWVdLnNvdXJjZSkpe1xuICAgICAgICAgICAgICAgICAgICBJREJbcmVzb3VyY2VOYW1lXS5nZXQoaWQpLl9wZXJtaXNzaW9ucyA9IExhenkocm93KS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbeCwgdHJ1ZV1cbiAgICAgICAgICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChMYXp5KHZbMF0pLnNpemUoKSl7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgndXBkYXRlLXBlcm1pc3Npb25zLScgKyByZXNvdXJjZU5hbWUsIExhenkodlswXSkua2V5cygpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmVtaXQoJ3VwZGF0ZS1wZXJtaXNzaW9ucycpO1xuICAgIH07XG5cblxuICAgIHRoaXMuZ290TTJNID0gZnVuY3Rpb24obTJtKXtcbiAgICAgICAgTGF6eShtMm0pLmVhY2goZnVuY3Rpb24oZGF0YSwgaW5kZXhOYW1lKXtcbiAgICAgICAgICAgIHZhciBtMm1JbmRleCA9IGxpbmtlci5tMm1JbmRleFtpbmRleE5hbWVdO1xuICAgICAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uKG0pe1xuICAgICAgICAgICAgICAgIExhenkobSkuZWFjaChmdW5jdGlvbihkYXRhLHZlcmIpe1xuICAgICAgICAgICAgICAgICAgICBtMm1JbmRleFt2ZXJiXShkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtbTJtJyk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdyZWNlaXZlZC1tMm0tJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuZmV0Y2ggPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBjYWxsQmFjaykgeyAgLy9cbiAgICAgICAgLy8gaWYgYSBjb25uZWN0aW9uIGlzIGN1cnJlbnRseSBydW5uaW5nLCB3YWl0IGZvciBjb25uZWN0aW9uLlxuICAgICAgICBpZiAobW9kZWxOYW1lIGluIHdhaXRpbmdDb25uZWN0aW9ucyl7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBjYWxsQmFjayk7XG4gICAgICAgICAgICB9LDUwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBmZXRjaGluZyBhc3luY2hyb21vdXMgbW9kZWwgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgKGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgICAgICAvLyBpZiBkYXRhIGNhbWVzIGZyb20gcmVhbHRpbWUgY29ubmVjdGlvblxuICAgICAgICAgICAgICAgIGlmIChXMlBSRVNPVVJDRS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIGdldHRpbmcgZmlsdGVyIGZpbHRlcmVkIGJ5IGNhY2hpbmcgc3lzdGVtXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlciA9IGxpc3RDYWNoZS5maWx0ZXIobW9kZWwsZmlsdGVyKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBpZiBzb210aGluZyBpcyBtaXNzaW5nIG9uIG15IGxvY2FsIERCIFxuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzayBmb3IgbWlzc2luZ3MgYW5kIHBhcnNlIHNlcnZlciByZXNwb25zZSBpbiBvcmRlciB0byBlbnJpY2ggbXkgbG9jYWwgREIuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGFjaW5nIGxvY2sgZm9yIHRoaXMgbW9kZWxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KG1vZGVsTmFtZSArICcvbGlzdCcsIHtmaWx0ZXIgOiBmaWx0ZXJ9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsY2FsbEJhY2spO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgbG9ja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24ocmV0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVsZWFzZSBsb2NrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvbGlzdCcsIHNlbmREYXRhLGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR09UX0FMTC5zb3VyY2UucHVzaChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0ID0gZnVuY3Rpb24obW9kZWxOYW1lLCBpZHMsIGNhbGxCYWNrKXtcbiAgICAgICAgLy8gc2VhcmNoIG9iamVjdHMgZnJvbSBJREIuIElmIHNvbWUgaWQgaXMgbWlzc2luZywgaXQgcmVzb2x2ZSBpdCBieSB0aGUgc2VydmVyXG4gICAgICAgIC8vIGlmIGEgcmVxdWVzdCB0byB0aGUgc2FtZSBtb2RlbCBpcyBwZW5kaW5nLCB3YWl0IGZvciBpdHMgY29tcGxldGlvblxuICAgICAgICBcbiAgICAgICAgaWYgKGlkcy5jb25zdHJ1Y3RvciAhPT0gQXJyYXkpe1xuICAgICAgICAgICAgaWRzID0gW2lkc107XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgc29tZSBlbnRpdHkgaXMgbWlzc2luZyBcbiAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lICwge2lkOiBpZHN9LCBudWxsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICB2YXIgaXRhYiA9IElEQlttb2RlbE5hbWVdXG4gICAgICAgICAgICBmb3IgKHZhciBpZCBpbiBpZHMpe1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKGl0YWIuc291cmNlW2lkc1tpZF1dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxCYWNrKHJldCk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLmdvdE1vZGVsID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgZm9yICh2YXIgbW9kZWxOYW1lIGluIGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBtb2RlbCA9IGRhdGFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZVsnZGVzY3JpcHRpb246JyArIG1vZGVsTmFtZV0gPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSA9IG1ha2VNb2RlbENsYXNzKG1vZGVsKTtcbiAgICAgICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBJREIpKSB7XG4gICAgICAgICAgICAgICAgSURCW21vZGVsTmFtZV0gPSBMYXp5KHt9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmRlc2NyaWJlID0gZnVuY3Rpb24obW9kZWxOYW1lLCBjYWxsQmFjayl7XG4gICAgICAgIHZhciByZXQgPSBtb2RlbENhY2hlW21vZGVsTmFtZV07XG4gICAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHJldCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gd2FpdGluZ0Nvbm5lY3Rpb25zKSl7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBmYWlsZWRNb2RlbHMpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGNhY2hlS2V5ID0gJ2Rlc2NyaXB0aW9uOicgKyBtb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKGNhY2hlS2V5IGluIGxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmdvdE1vZGVsKEpTT04ucGFyc2UobG9jYWxTdG9yYWdlW2NhY2hlS2V5XSkpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2Rlc2NyaWJlJyxudWxsLCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdE1vZGVsKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sobW9kZWxDYWNoZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGVsTm90Rm91bmQuaGFuZGxlKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsZWRNb2RlbHNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgY29ubmVjdGlvblxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUobW9kZWxOYW1lLCBjYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAgICAgICAgXG4gICAgfTtcbiAgICB0aGlzLmFkZE1vZGVsSGFuZGxlciA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGRlY29yYXRvcikge1xuICAgICAgICB2YXIga2V5ID0gdXRpbHMuaGFzaChkZWNvcmF0b3IpO1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gYnVpbGRlckhhbmRsZXJzKSkgYnVpbGRlckhhbmRsZXJzW21vZGVsTmFtZV0gPSBuZXcgSGFuZGxlcigpO1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gYnVpbGRlckhhbmRsZXJVc2VkKSkgYnVpbGRlckhhbmRsZXJVc2VkW21vZGVsTmFtZV0gPSB7fTtcbiAgICAgICAgaWYgKGtleSBpbiBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXVtrZXldID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWxOYW1lIGluIG1vZGVsQ2FjaGUpIHtcbiAgICAgICAgICAgIGRlY29yYXRvcihtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVpbGRlckhhbmRsZXJzW21vZGVsTmFtZV0uYWRkSGFuZGxlcihkZWNvcmF0b3IpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzID0gZnVuY3Rpb24obW9kZWxOYW1lLCBhdHRyaWJ1dGVzKXtcbiAgICAgICAgdmFyIGFkZFByb3BlcnR5ID0gZnVuY3Rpb24obW9kZWwsIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICBhdHRyaWJ1dGVzLmZvckVhY2goZnVuY3Rpb24odmFsKXtcbiAgICAgICAgICAgIHZhciBrZXkgPSAncEE6JyArIG1vZGVsLm1vZGVsTmFtZSArICc6JyArIHZhbDtcbiAgICAgICAgICAgIHZhciBrYXR0ciA9ICdfXycgKyB2YWw7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobW9kZWwucHJvdG90eXBlLCB2YWwsIHtcbiAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmICghKGthdHRyIGluIHRoaXMpKXtcbiAgICAgICAgICAgICAgICAgIHZhciB2ID0gbG9jYWxTdG9yYWdlW2tleSArIHRoaXMuaWRdO1xuICAgICAgICAgICAgICAgICAgdGhpc1trYXR0cl0gPSB2P0pTT04ucGFyc2Uodik6bnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNba2F0dHJdO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgICAgICAgICB0aGlzW2thdHRyXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtrZXkgKyB0aGlzLmlkXSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBwZXJzaXN0ZW50QXR0cmlidXRlcykpIHsgcGVyc2lzdGVudEF0dHJpYnV0ZXNbbW9kZWxOYW1lXSA9IFtdOyB9XG4gICAgICAgIHZhciBhdHRycyA9IHBlcnNpc3RlbnRBdHRyaWJ1dGVzW21vZGVsTmFtZV07XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICB2YXIgbmV3QXR0cnMgPSBMYXp5KGF0dHJpYnV0ZXMpLmRpZmZlcmVuY2UoYXR0cnMpLnRvQXJyYXkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBuZXdBdHRycyA9IGF0dHJzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZXdBdHRycy5sZW5ndGgpe1xuICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBtb2RlbENhY2hlKXtcbiAgICAgICAgICAgICAgICBhZGRQcm9wZXJ0eShtb2RlbENhY2hlW21vZGVsTmFtZV0sIG5ld0F0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShhdHRycyxuZXdBdHRycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMub24oJ25ldy1tb2RlbCcsIGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgaWYgKG1vZGVsLm1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlcnMpe1xuICAgICAgICAgICAgYnVpbGRlckhhbmRsZXJzW21vZGVsLm1vZGVsTmFtZV0uaGFuZGxlKG1vZGVsQ2FjaGVbbW9kZWwubW9kZWxOYW1lXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1vZGVsLm1vZGVsTmFtZSBpbiBwZXJzaXN0ZW50QXR0cmlidXRlcyl7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyhtb2RlbC5tb2RlbE5hbWUpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLnF1ZXJ5ID0gZnVuY3Rpb24obW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBjYWxsQmFjayl7XG4gICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICB0aGlzLmRlc2NyaWJlKG1vZGVsTmFtZSxmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgICAgICAvLyBhcnJheWZpeSBhbGwgZmlsdGVyIHZhbHVlc1xuICAgICAgICAgICAgZmlsdGVyID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2LGspeyByZXR1cm4gW2ssQXJyYXkuaXNBcnJheSh2KT92Olt2XV19KS50b09iamVjdCgpO1xuICAgICAgICAgICAgdmFyIGZpbHRlckZ1bmN0aW9uID0gdXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgIHZhciBpZHggPSBnZXRJbmRleChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgdGhzLmZldGNoKG1vZGVsTmFtZSxmaWx0ZXIsdG9nZXRoZXIsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKGlkeC5maWx0ZXIoZmlsdGVyRnVuY3Rpb24pLnZhbHVlcygpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICB9O1xuICAgIHRoaXMuZGVsZXRlID0gZnVuY3Rpb24obW9kZWxOYW1lLCBpZHMsIGNhbGxCYWNrKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9kZWxldGUnLCB7IGlkIDogaWRzfSwgY2FsbEJhY2spO1xuICAgIH07XG5cbiAgICB0aGlzLmNvbm5lY3QgPSBmdW5jdGlvbiAoY2FsbEJhY2spIHtcbiAgICAgICAgaWYgKHRoaXMuY29ubmVjdGlvbi5pc0xvZ2dlZEluKSB7XG4gICAgICAgICAgICBjYWxsQmFjaygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLmNvbm5lY3QoY2FsbEJhY2spO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuZnVuY3Rpb24gcmVXaGVlbE9STShlbmRQb2ludCwgbG9naW5GdW5jKXtcbiAgICB0aGlzLiRvcm0gPSBuZXcgYmFzZU9STShuZXcgdXRpbHMucmVXaGVlbENvbm5lY3Rpb24oZW5kUG9pbnQsIGxvZ2luRnVuYyksdGhpcyk7XG4gICAgdGhpcy5vbiA9IHRoaXMuJG9ybS5vbi5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5lbWl0ID0gdGhpcy4kb3JtLmVtaXQuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMudW5iaW5kID0gdGhpcy4kb3JtLnVuYmluZC5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5vbmNlID0gdGhpcy4kb3JtLm9uY2U7XG4gICAgdGhpcy5hZGRNb2RlbEhhbmRsZXIgPSB0aGlzLiRvcm0uYWRkTW9kZWxIYW5kbGVyLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzID0gdGhpcy4kb3JtLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLnV0aWxzID0gdXRpbHM7XG4gICAgdGhpcy5sb2dvdXQgPSB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dvdXQuYmluZCh0aGlzLiRvcm0uY29ubmVjdGlvbik7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbigpe1xuICAgIHZhciBjb25uZWN0aW9uID0gdGhpcy4kb3JtLmNvbm5lY3Rpb247XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChmdW5jdGlvbihjYWxsQmFjayxyZWplY3Qpe1xuICAgICAgICBjb25uZWN0aW9uLmNvbm5lY3QoY2FsbEJhY2spO1xuICAgIH0pKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dpbih1c2VybmFtZSwgcGFzc3dvcmQsIGFjY2VwdCk7ICAgIFxuICAgIH0pLmJpbmQodGhpcykpO1xuICAgIFxufTtcblxucmVXaGVlbE9STS5wcm90b3R5cGUubG9nb3V0ID0gZnVuY3Rpb24odXJsKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9nb3V0KCk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldE1vZGVsID0gZnVuY3Rpb24obW9kZWxOYW1lKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlc2NyaWJlKG1vZGVsTmFtZSxhY2NlcHQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzaW5nbGUgPSBmYWxzZTtcbiAgICB2YXIgbW9kTmFtZSA9IG1vZGVsTmFtZTtcbiAgICBpZiAoaWRzLmNvbnN0cnVjdG9yICE9PSBBcnJheSl7XG4gICAgICAgIHNpbmdsZSA9IHRydWU7XG4gICAgICAgIGlkcyA9IFtpZHNdXG4gICAgfVxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKHNpbmdsZSl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5nZXQobW9kTmFtZSwgaWRzLCBmdW5jdGlvbihpdGVtcyl7IFxuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KGl0ZW1zWzBdKTt9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kb3JtLmdldChtb2ROYW1lLCBpZHMsIGFjY2VwdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5xdWVyeSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgcmVsYXRlZCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHZhciB0b2dldGhlciA9IG51bGw7XG4gICAgICAgIGlmIChyZWxhdGVkICYmIChyZWxhdGVkLmNvbnN0cnVjdG9yID09PSBBcnJheSkgJiYgKHJlbGF0ZWQubGVuZ3RoKSl7XG4gICAgICAgICAgICB0b2dldGhlciA9IHJlbGF0ZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRlZCAmJiAocmVsYXRlZC5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKSAmJiAocmVsYXRlZC5sZW5ndGgpKXtcbiAgICAgICAgICAgIHRvZ2V0aGVyID0gcmVsYXRlZC5zcGxpdCgnLCcpO1xuICAgICAgICB9XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLnF1ZXJ5KG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBpZHMpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5kZWxldGUobW9kZWxOYW1lLCBpZHMsIGFjY2VwdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KVxufTtcblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0TG9nZ2VkVXNlciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy4kb3JtLmNvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnVzZXJfaWQpXG4gICAgICAgIHJldHVybiB0aGlzLmdldCgnYXV0aF91c2VyJyx0aGlzLiRvcm0uY29ubmVjdGlvbi5jYWNoZWRTdGF0dXMudXNlcl9pZCk7XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCkge1xuICAgICAgICAgICAgc2VsZi5vbmNlKCdsb2dnZWQtaW4nLGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmdldCgnYXV0aF91c2VyJywgdXNlcikudGhlbihhY2NlcHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuJHNlbmRUb0VuZHBvaW50ID0gZnVuY3Rpb24gKHVybCwgZGF0YSl7XG4gICAgcmV0dXJuIHRoaXMuJG9ybS4kcG9zdCh1cmwsIGRhdGEpO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCl7XG4gICAgcmV0dXJuIHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ2luKHVzZXJuYW1lLHBhc3N3b3JkKTtcbn1cbiJdfQ==
