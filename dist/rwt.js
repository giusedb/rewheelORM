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
        if ('DEBUG' in window) {
            var emit = this.emit;
            this.emit = function () {
                var args = Array.prototype.slice.call(arguments, 0);
                //console.info('Event : ' + args)
                return emit.apply(this, args);
            }.bind(this);
        }
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
            console.log('open : websocket');
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
        /*
    this.getM2mIndex = function(indexName, relation) {
        if (!(indexName in m2mIndex)) {
            m2mIndex[indexName] = new ManyToManyRelation(relation,m2m[relation.indexName]);
        }
    }
*/
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
        var tracers = {};
        function getTracer(modelName) {
            if (!(modelName in tracers)) {
                tracers[modelName] = new FilterTracer();
            }
            return tracers[modelName];
        }
        this.filter = function (model, filter) {
            //        console.log('------------------\nfilter : ' + JSON.stringify(filter));
            var modelName = model.modelName;
            // if you fetch all objects from server, this model has to be marked as got all;
            var got = gotAll[modelName];
            if (got) {
                return null;
            }
            var filterLen = _.size(filter);
            if (filterLen === 0) {
                gotAll[modelName] = true;
                if (modelName in asked) {
                    delete asked[modelName];
                }
                return {};
            }
            var ret = getTracer(modelName).getFilters(filter);
            return ret;
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
    function FilterTracer() {
        /**
    *  asked filter storage
    *  { <pipe separated asked fields> : <array of array of asked values> }
    */
        this.explodedFilters = { id: [] };
        this.askedFilters = [];
    }
    /**
* prepare a filter to be fetched
* @param filter: filter to add
*/
    FilterTracer.prototype.add = function (filter) {
        this.askedFilters.push(filter);
    };
    /**
* Explode filter in single element filter
* @param filter complex filter
* @return listo of single element filter
*/
    FilterTracer.prototype.explode = function (filter) {
        var ret = [];
        var keys = [];
        var values = [];
        // key and values split
        _.forIn(filter, function (v, k) {
            keys.push(k);
            values.push(v);
        });
        var vals = Combinatorics.cartesianProduct.apply(this, values);
        return vals.toArray();    // vals.map(_.partial(_.zipObject, keys));        
    };
    /**
* Reduce a filter excluding previously called filter
* A filter is an object like where keys are fields and values 
* are array of values
* @param filter filter
* @return a new filter or null if nothing has to be asked
*/
    FilterTracer.prototype.getFilters = function (filter) {
        var keys = _.keys(filter).sort();
        var keysKey = _.join(keys, '|');
        var exploded = this.explode(filter);
        var keyset = _.keys(this.explodedFilters);
        var self = this;
        // cloning original exploded
        var originalExploded = exploded.slice(0);
        if (!(keysKey in this.explodedFilters)) {
            this.explodedFilters[keysKey] = [];
        }
        if (keyset.length) {
            // getting all subsets
            var subsets = _.intersection(keyset, Combinatorics.power(keys, function (x) {
                return x.join('|');
            }).slice(1));
            // removing rows from found subsets
            subsets.forEach(function (key, index) {
                var kkeys = _.split(key, '|');
                var compatibleExploded = null;
                var fromIndex = kkeys.map(_.partial(_.indexOf, keys));
                // transforming exploded to subset exploded
                if (key !== keysKey) {
                    compatibleExploded = _.uniqWith(exploded.map(function (x) {
                        var ret = [];
                        for (var i in fromIndex) {
                            ret.push(x[fromIndex[i]]);
                        }
                        return ret;
                    }), _.identity);
                } else {
                    compatibleExploded = exploded;
                }
                var toRemove = _.intersectionBy(self.explodedFilters[key], compatibleExploded, JSON.stringify);
                if (toRemove.length) {
                    //console.log('remove ' + toRemove);
                    toRemove.forEach(function (y) {
                        if (exploded.length) {
                            var rf = new Function('x', 'return ' + fromIndex.map(function (i, n) {
                                return '(x[' + i + '] === ' + y[n] + ')';
                            }).join(' && '));
                            _.remove(exploded, rf);
                        }
                    });
                }
            });
        }
        // looking for previously asked key subset
        Array.prototype.push.apply(this.explodedFilters[keysKey], exploded);
        // cleaning supersets
        var supersets = keyset.map(function (x) {
            return x.split('|');
        }).filter(function (x) {
            return _.every(keys, function (v) {
                return _.includes(x, v);
            });
        }).filter(function (x) {
            return !_.isEqual(x, keys);
        });
        if (supersets.length) {
            // removing all values from supersets
            supersets.forEach(function (key) {
                var oldValues = self.explodedFilters[key.join('|')];
                var fromIndex = keys.map(_.partial(_.indexOf, key));
                exploded.forEach(function (y) {
                    var rf = new Function('x', 'return ' + fromIndex.map(function (i, n) {
                        return '(x[' + i + '] === ' + y[n] + ')';
                    }).join(' && '));
                    //console.log('old remove from ' + key + ' => ' + oldValues.filter(rf).json);
                    _.remove(oldValues, rf);
                });
            });
        }
        // fusing result filter
        return this.implode(exploded, keys);
    };
    FilterTracer.prototype.implode = function (exploded, keys) {
        if (!exploded.length) {
            return null;
        }
        return _.zipObject(keys, _.unzip(exploded).map(_.uniq));
    };
    /*
this was part of listCache.filter method
        switch (filterLen) {
            case 0 : {
                // return null or all
                
                gotAll[modelName] = true;
                if (modelName in asked){
                    delete asked[modelName];
                }
//                console.log('out : null (got all)');
                // conditional clean
                if (modelName in compositeAsked){ 
                    delete compositeAsked[modelName];
                }
                if (got)
                    return null;
                return {};
            }
            case 1 : {
                var ret = filterSingle.call(this, model, filter);
                cleanComposites.call(this, model, filter);
                return ret;
            }
        }
        var ths = this;
        var single = Lazy(filter).keys().some(function(key) {
            var f = {};
            f[key] = filter[key];
            return filterSingle.call(ths, model, f, true) == null;
        });
        if (single) { return null }
        // lazy create compositeAsked
        if (!(modelName in compositeAsked)){ compositeAsked[modelName] = []; }
        // explode filter
        var exploded = explodeFilter(filter);
        // collect partials
        var partials = compositeAsked[modelName].filter(utils.makeFilter(model, filter, ' || ',true));
        // collect missings (exploded - partials)
        if (partials.length){
            var bad  = [];
            // partial difference
            for (var x in partials){
                bad.push.apply(bad,exploded.filter(utils.makeFilter(model, partials[x],' && ', true)));
            }
//            console.log('exploded - partial : ' + JSON.stringify(bad));
            var missings = Lazy(exploded).difference(bad).toArray();
        } else {
            var missings = exploded;
        }

        // filter partials
        if (missings.length){
            compositeAsked[modelName].push.apply(compositeAsked[modelName],missings);
            // aggregate missings
            var missings = Lazy(filter).keys().map(function(key){
                var ret = Lazy(missings).pluck(key).unique().toArray();
                return [key, ret.length?ret:filter[key]];
            }).toObject();
//            console.log('out : ' + JSON.stringify(missings));
            // clean conditional
            cleanComposites(model, missings);
            return missings;
        }
        return null;
*/
    /*
    var cartesianProduct1 = function(x,y,isArray){
        var ret = [];
        if (isArray) {
            for (var a in x){
                for (var b in y){
                    ret.push(Lazy([x[a],y[b]]).flatten().toArray());
                }
            }
        } else {
            for (var a in x){
                for (var b in y){
                    ret.push([x[a],y[b]]);
                }
            }
        }
        return ret;
    };
    var cartesianProduct = function(arr){
        var isArray = false;
        var ret = arr[0]; 
        for (var x = 1; x < arr.length; ++x){
            ret = cartesianProduct1(ret, arr[x], isArray);
            isArray = true;
        }
        return ret;
    }
    var explodeFilter = function(filter) {
        var product = cartesianProduct(Lazy(filter).values().toArray());
        var keys = Lazy(filter).keys().toArray();
        return product.map(function(x){
            var r = {};
            keys.forEach(function(a,n){
                r[a] = x[n];
            })
            return r;
        });
    };

    var filterSingle = function(model, filter, testOnly){
        // Lazy auto create indexes
        var modelName = model.modelName;
        var getIndexFor = this.getIndexFor;
        var keys = Lazy(filter).map(function(v,key){ return [key, modelName + '.' + key]; }).toObject();
        var indexes = Lazy(filter).keys().map(function(key){ return [key, getIndexFor(modelName, key)]}).toObject(); 
        // fake for (it will cycle once)
        for (var x in filter){
            // get asked index and check presence
            var difference = Lazy(filter[x]).difference(indexes[x]).toArray();
            if (difference.length){
                // generate new filter
                var ret = Lazy([[x, difference]]).toObject();
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

    var cleanComposites = function(model,filter){
        // lazy create conditional asked index
        if (!(model.name in compositeAsked)) { compositeAsked[model.name] = [] };
        var index = compositeAsked[model.name];
        // search for all elements who have same partial
        var filterLen = Lazy(filter).size();
        var items = index.filter(utils.makeFilter(model, filter, ' && ',true)).filter(function(item){ Lazy(item).size() > filterLen });
//        console.log('deleting :' + JSON.stringify(items));
    };

*/
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
    function LazyLinker(actives, IDB, orm, listCache) {
        var unsolvedFilters = {};
        this.resolve = function (modelName, filter) {
            unsolved_filters.push(filter);
        };
        function mergeFilters() {
            var result = [];
            for (var modelName in unsolvedFilters) {
                unsolvedFilters[modelName].forEach(function (filter) {
                });
            }
        }
    }
    function Collection(orm, modelName, filter, partial, orderby, ipp) {
        var self = this;
        var filterFunction = null;
        var updateData = new Handler();
        var page = 1;
        var $orm = orm.$orm;
        this.updateData = updateData.addHandler.bind(updateData);
        this.items = [];
        //    this.forEach = this.items.forEach.bind(this.items);
        $orm.describe(modelName, function (Model) {
            self.model = Model;
            filterFunction = utils.makeFilter(Model, filter);
        });
        this.modelName = modelName;
        this.initialFilter = filter;
        this.partial = partial || false;
        var updateValues = function (newItems) {
            if (orderby) {
                newItems = _.orderby(newItems, _.keys(orderby), _.values(orderby));
            }
            if (ipp) {
            }
            self.forEach = self.items.forEach.bind(self.items);
        };
        $orm.query(modelName, filter, null, function (items) {
            self.items = items;
        });
        orm.on('updated-' + modelName, function (items) {
            console.warn('collection update ' + modelName, items);
        });
        orm.on('new-' + modelName, function (items) {
            console.warn('collection new ' + modelName, items);
            items = items.toArray();
            self.items = _.union(self.items, items.filter(filterFunction));
            updateData.handle(self);
        });
        orm.on('deleted-' + modelName, function (items) {
            console.warn('collection delete ' + modelName, items);
        });
    }
    ;
    Collection.prototype.forEach = function (f) {
        return this.items.forEach(f);
    };
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
        /*
    window.IDB = IDB;
*/
        this.IDB = IDB;
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
            W2PRESOURCE.$post(this.klass.modelName + '.set_permissions', data, function (myPerms, a, b, req) {
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
            var Klass = utils.renameFunction(utils.capitalize(model.name), new Function('row', 'permissions', funcString));
            //var Klass = new Function('row', 'permissions',funcString);
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
                W2PRESOURCE.$post(this.constructor.modelName + '.all_perms', { id: this.id }, function (data) {
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
                var promise = W2PRESOURCE.$post(modelName + (ID ? '.post' : '.put'), o);
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
                    var code = ddata + ' return post("' + Klass.modelName + '.' + funcName + '", data,cb);';
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
                    W2PRESOURCE.$post(this.constructor.modelName + '.savePA', oo, function () {
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
                        /*
                    var filter = {}; 
                    filter[ref.id] = this.id;
                    return new Collection(W2PRESOURCE, ref.by, filter);
*/
                        var ret = revIndex in IDB ? REVIDX[indexName].get(this.id + '') : null;
                        linker.foreignKeys[indexName].ask(this.id, true);
                        return ret;
                    }, null    /*, 'new-' + revIndex, 'updated-' + revIndex, 'deleted-' + revIndex*/);
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
                        W2PRESOURCE.$post(Klass.modelName + '/' + omodel + 's.put', {
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
        /**
     * fetch requested data with a single filter
     */
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
                            W2PRESOURCE.$post(modelName + '.list', { filter: filter }).then(function (data) {
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
                        this.$post(modelName + '.list', sendData, function (data) {
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
                if (this.connection.isConnected && !(modelName in waitingConnections)) {
                    if (modelName in failedModels) {
                        return;
                    }
                    var cacheKey = 'description:' + modelName;
                    if (cacheKey in localStorage) {
                        this.gotModel(JSON.parse(localStorage[cacheKey]));
                        callBack && callBack(modelCache[modelName]);
                    } else {
                        waitingConnections[modelName] = true;
                        this.$post(modelName + '.describe', null, function (data) {
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
            return this.$post(modelName + '.delete', { id: ids }, callBack);
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
    reWheelORM.prototype.getResources = function () {
        var orm = this.$orm;
        return new Promise(function (accept, reject) {
            var connection = orm.connection;
            utils.xdr(connection.endPoint + 'api/resources', null).then(function (xhr) {
                if (xhr.responseData) {
                    accept(xhr.responseData.sort());
                } else {
                    reject(xhr);
                }
            });
        });
    };
    reWheelORM.prototype.getCollection = function (modelName, filterOrIds) {
        return new Collection(orm.$orm, filterOrIds || {});
    };
    root.rwt = reWheelORM;
}(window, Lazy, SockJS));
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJjb25uZWN0aW9uLmpzIiwidG91Y2hlci5qcyIsInZhY3V1bWNhY2hlci5qcyIsImF1dG9saW5rZXIuanMiLCJsaXN0Y2FjaGVyLmpzIiwibWFueXRvbWFueS5qcyIsImNhY2hlci5qcyIsImNvbGxlY3Rpb25zLmpzIiwib3JtLmpzIl0sIm5hbWVzIjpbIkhhbmRsZXIiLCJoYW5kbGVycyIsInN0ckhhbmRsZXJzIiwicHJvdG90eXBlIiwiYWRkSGFuZGxlciIsImhhbmRsZXIiLCJzdHJIYW5kbGVyIiwidXRpbHMiLCJoYXNoIiwidG9TdHJpbmciLCJwdXNoIiwiaGFuZGxlIiwiYXJncyIsIkFycmF5Iiwic2xpY2UiLCJjYWxsIiwiYXJndW1lbnRzIiwiZm9yRWFjaCIsImZ1bmMiLCJhcHBseSIsImhhbmRsZUJ5IiwidGhzIiwiTmFtZWRFdmVudE1hbmFnZXIiLCJldmVudHMiLCJoYW5kbGVySWQiLCJpZHhJZCIsIm9uIiwibmFtZSIsImlkIiwiZW1pdCIsImV2ZW50IiwidW5iaW5kIiwiY291bnQiLCJMYXp5IiwiZWFjaCIsInYiLCJrIiwiaWR4IiwibiIsInJldmVyc2UiLCJ4Iiwic3BsaWNlIiwib25jZSIsImV2ZW50TmFtZSIsImhhbmRsZXJGdW5jdGlvbiIsInNlbGYiLCJ3aW5kb3ciLCJiaW5kIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsIm1vY2siLCJyZW5hbWVGdW5jdGlvbiIsImZuIiwiRnVuY3Rpb24iLCJjYWNoZWQiLCJrZXkiLCJ3cmFwcGVyIiwibG9nIiwiY29uc29sZSIsInhkciIsInVybCIsImRhdGEiLCJhcHBsaWNhdGlvbiIsInRva2VuIiwiZm9ybUVuY29kZSIsIlByb21pc2UiLCJhY2NlcHQiLCJyZWplY3QiLCJyZXEiLCJYTUxIdHRwUmVxdWVzdCIsIm9ucmVhZHlzdGF0ZWNoYW5nZSIsInJlYWR5U3RhdGUiLCJyZXNwb25zZURhdGEiLCJKU09OIiwicGFyc2UiLCJyZXNwb25zZVRleHQiLCJhIiwicmVzcG9uc2UiLCJzdGF0dXMiLCJyZXF1ZXN0IiwiWERvbWFpblJlcXVlc3QiLCJvbmxvYWQiLCJzdGF0dXNUZXh0IiwiRXJyb3IiLCJvcGVuIiwib25lcnJvciIsInNldFJlcXVlc3RIZWFkZXIiLCJfX3Rva2VuX18iLCJzaXplIiwic3RyaW5naWZ5IiwibWFwIiwiZW5jb2RlVVJJIiwidG9BcnJheSIsImpvaW4iLCJzZW5kIiwiY2FwaXRhbGl6ZSIsInMiLCJ0b1VwcGVyQ2FzZSIsInRvTG93ZXJDYXNlIiwic3RyIiwicmV0IiwibGVuZ3RoIiwiY2hhckNvZGVBdCIsIm1ha2VGaWx0ZXIiLCJtb2RlbCIsImZpbHRlciIsInVuaWZpZXIiLCJkb250VHJhbnNsYXRlRmlsdGVyIiwic291cmNlIiwidmFscyIsImZpZWxkIiwiaXNBcnJheSIsImZpZWxkcyIsInR5cGUiLCJjb25zdHJ1Y3RvciIsIk51bWJlciIsImVycm9yIiwib3JtIiwic2FtZUFzIiwieSIsInBsdXJhbGl6ZSIsImJlZm9yZUNhbGwiLCJiZWZvcmUiLCJkZWNvcmF0b3IiLCJ0aGVuIiwiY2xlYW5TdG9yYWdlIiwibG9jYWxTdG9yYWdlIiwia2V5cyIsImNsZWFuRGVzY3JpcHRpb24iLCJzdGFydHNXaXRoIiwiY2hyIiwic3BsaXQiLCJwZXJtdXRhdGlvbnMiLCJhcnIiLCJ3YWl0Rm9yIiwiY2FsbEJhY2siLCJ3YWl0ZXIiLCJzZXRUaW1lb3V0IiwiYm9vbCIsIkJvb2xlYW4iLCJub29wIiwidHpPZmZzZXQiLCJEYXRlIiwiZ2V0VGltZXpvbmVPZmZzZXQiLCJ0cmFuc0ZpZWxkVHlwZSIsImRhdGUiLCJkYXRldGltZSIsInN0cmluZyIsInRleHQiLCJpbnRlZ2VyIiwicGFyc2VJbnQiLCJmbG9hdCIsInBhcnNlRmxvYXQiLCJTVEFUVVNLRVkiLCJSZWFsdGltZUNvbm5lY3Rpb24iLCJlbmRQb2ludCIsInJ3dENvbm5lY3Rpb24iLCJjb25uZWN0aW9uIiwiU29ja0pTIiwib25vcGVuIiwidGVuYW50Iiwib25tZXNzYWdlIiwiZSIsIm9uY2xvc2UiLCJ3c0Nvbm5lY3QiLCJjYWNoZWRTdGF0dXMiLCJjbG9zZSIsInJlV2hlZWxDb25uZWN0aW9uIiwiZ2V0TG9naW4iLCJlbmRzV2l0aCIsImlzQ29ubmVjdGVkIiwiaXNMb2dnZWRJbiIsIiRwb3N0IiwicHJvbWlzZSIsInhociIsImZvcmNlIiwic3RhdHVzV2FpdGluZyIsInVwZGF0ZVN0YXR1cyIsImxhc3RCdWlsZCIsImxhc3RfYnVpbGQiLCJ1c2VyX2lkIiwib2xkU3RhdHVzIiwibG9naW5JbmZvIiwiT2JqZWN0IiwibG9naW4iLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwib2JqIiwicmVhbHRpbWVFbmRQb2ludCIsIndzQ29ubmVjdGlvbiIsInVzZXJpZCIsImxvZ291dCIsIm9rIiwiY29ubmVjdCIsIlRvdWNoZXIiLCJ0b3VjaGVkIiwidG91Y2giLCJ0IiwiVmFjdXVtQ2FjaGVyIiwiYXNrZWQiLCJwa0luZGV4IiwibWlzc2luZyIsImFzayIsImxhenkiLCJjb250YWlucyIsImdldEFza2VkSW5kZXgiLCJtaXNzaW5ncyIsInVuaXF1ZSIsIkF1dG9MaW5rZXIiLCJhY3RpdmVzIiwiSURCIiwiVzJQUkVTT1VSQ0UiLCJsaXN0Q2FjaGUiLCJtYWluSW5kZXgiLCJmb3JlaWduS2V5cyIsIm0ybSIsIm0ybUluZGV4IiwicGVybWlzc2lvbnMiLCJpbmRleCIsImdldEluZGV4Rm9yIiwicmVmZXJlbmNlcyIsInJlZmVyZW5jZSIsImluZGV4TmFtZSIsInRvIiwicmVmZXJlbmNlZEJ5IiwiYnkiLCJtYW55VG9NYW55IiwicmVsYXRpb24iLCJNYW55VG9NYW55UmVsYXRpb24iLCJtMm1HZXQiLCJjb2xsZWN0aW9uIiwiZ290RGF0YSIsImdldE0yTSIsImxpbmtVbmxpbmtlZCIsInZhbHVlcyIsInN1bSIsImNoYW5nZWQiLCJpbmRleGVzIiwiSU5ERVgiLCJnZXR0ZXIiLCJpZHMiLCJvdGhlckluZGV4IiwiZGVzY3JpYmUiLCJmbGF0dGVuIiwibW9kZWxOYW1lIiwiaWRiIiwiZmV0Y2giLCJtYWluUmVzb3VyY2UiLCJmaWVsZE5hbWUiLCJ0b09iamVjdCIsInJlc291cmNlTmFtZSIsImdvdFBlcm1pc3Npb25zIiwiUEVSTUlTU0lPTlMiLCJzZXRJbnRlcnZhbCIsIkxpc3RDYWNoZXIiLCJnb3RBbGwiLCJjb21wb3NpdGVBc2tlZCIsInRyYWNlcnMiLCJnZXRUcmFjZXIiLCJGaWx0ZXJUcmFjZXIiLCJnb3QiLCJmaWx0ZXJMZW4iLCJfIiwiZ2V0RmlsdGVycyIsImV4cGxvZGVkRmlsdGVycyIsImFza2VkRmlsdGVycyIsImFkZCIsImV4cGxvZGUiLCJmb3JJbiIsIkNvbWJpbmF0b3JpY3MiLCJjYXJ0ZXNpYW5Qcm9kdWN0Iiwic29ydCIsImtleXNLZXkiLCJleHBsb2RlZCIsImtleXNldCIsIm9yaWdpbmFsRXhwbG9kZWQiLCJzdWJzZXRzIiwiaW50ZXJzZWN0aW9uIiwicG93ZXIiLCJra2V5cyIsImNvbXBhdGlibGVFeHBsb2RlZCIsImZyb21JbmRleCIsInBhcnRpYWwiLCJpbmRleE9mIiwidW5pcVdpdGgiLCJpIiwiaWRlbnRpdHkiLCJ0b1JlbW92ZSIsImludGVyc2VjdGlvbkJ5IiwicmYiLCJyZW1vdmUiLCJzdXBlcnNldHMiLCJldmVyeSIsImluY2x1ZGVzIiwiaXNFcXVhbCIsIm9sZFZhbHVlcyIsImltcGxvZGUiLCJ6aXBPYmplY3QiLCJ1bnppcCIsInVuaXEiLCJpdGVtcyIsIml0ZW0iLCJmaW5kIiwiZ2V0MCIsInBsdWNrIiwiZ2V0MSIsImRlbCIsImwiLCJjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzIiwicHJvdG8iLCJwcm9wZXJ0eU5hbWUiLCJzZXR0ZXIiLCJyZXN1bHQiLCJwcm9wZXJ0eURlZiIsInZhbHVlIiwiaXNGaW5pdGUiLCJkZWZpbmVQcm9wZXJ0eSIsIkxhenlMaW5rZXIiLCJ1bnNvbHZlZEZpbHRlcnMiLCJyZXNvbHZlIiwidW5zb2x2ZWRfZmlsdGVycyIsIm1lcmdlRmlsdGVycyIsIkNvbGxlY3Rpb24iLCJvcmRlcmJ5IiwiaXBwIiwiZmlsdGVyRnVuY3Rpb24iLCJ1cGRhdGVEYXRhIiwicGFnZSIsIiRvcm0iLCJNb2RlbCIsImluaXRpYWxGaWx0ZXIiLCJ1cGRhdGVWYWx1ZXMiLCJuZXdJdGVtcyIsInF1ZXJ5Iiwid2FybiIsInVuaW9uIiwiZiIsIlZhbGlkYXRpb25FcnJvciIsInJlc291cmNlIiwiX3Jlc291cmNlIiwiZm9ybUlkeCIsImVycm9ycyIsImJhc2VPUk0iLCJvcHRpb25zIiwiZXh0T1JNIiwiU3RyaW5nIiwiY29ubmVjdGVkIiwid3MiLCJpbmZvIiwib25NZXNzYWdlSnNvbiIsIm9uTWVzc2FnZVRleHQiLCJtZXNzYWdlIiwic2VudERhdGEiLCJ3YWl0aW5nQ29ubmVjdGlvbnMiLCJhdXRoX2dyb3VwIiwiSURYIiwiUkVWSURYIiwiYnVpbGRlckhhbmRsZXJzIiwiYnVpbGRlckhhbmRsZXJVc2VkIiwicGVyc2lzdGVudEF0dHJpYnV0ZXMiLCJldmVudEhhbmRsZXJzIiwicGVybWlzc2lvbldhaXRpbmciLCJtb2RlbENhY2hlIiwiZmFpbGVkTW9kZWxzIiwibGlua2VyIiwidmFsaWRhdGlvbkV2ZW50IiwiY3VycmVudENvbnRleHQiLCJzYXZpbmdFcnJvckhhbmxkZXIiLCJnZXRJbmRleCIsImdldFVubGlua2VkIiwiVU5MSU5LRUQiLCJQZXJtaXNzaW9uVGFibGUiLCJrbGFzcyIsInNhdmUiLCJjYiIsIm15UGVybXMiLCJiIiwiZ3JvdXBfaWQiLCJwZXJtaXNzaW9uTGlzdCIsInAiLCJwZXJtcyIsImFsbFBlcm1pc3Npb25zIiwibWFrZU1vZGVsQ2xhc3MiLCJfbW9kZWwiLCJyZWFkYWJsZSIsIndyaXRhYmxlIiwicHJpdmF0ZUFyZ3MiLCJtZXJnZSIsImZ1bmNTdHJpbmciLCJLbGFzcyIsInJlZl90cmFuc2xhdGlvbnMiLCJpbnZlcnNlX3JlZmVyZW5jZXMiLCJyZWZlcmVudHMiLCJmaWVsZHNPcmRlciIsImZpZWxkT3JkZXIiLCJyZXByZXNlbnRhdGlvbiIsImRlbGV0ZSIsIl9wZXJtaXNzaW9ucyIsImFsbF9wZXJtcyIsIm9iamVjdF9pZCIsImdyb3VwZWQiLCJ1bmtub3duX2dyb3VwcyIsImRpZmZlcmVuY2UiLCJncm91cEJ5IiwibyIsImFzUmF3IiwiSUQiLCJhcmciLCJjb250ZXh0IiwiY29weSIsImFzciIsImNvbmNhdCIsInNhdmVNdWx0aSIsIm9iamVjdHMiLCJzY29wZSIsInJhdyIsImRlbGV0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsImNvZGUiLCJzYXZlUEEiLCJUIiwib28iLCJQQSIsIkZzIiwiZmllbGRJZHgiLCJ0YXAiLCJpbmRleEJ5Iiwid2lkZ2V0IiwicmVmIiwiZXh0X3JlZiIsImxvY2FsX3JlZiIsIlR5cGVFcnJvciIsInJldkluZGV4IiwiaGFzT3duUHJvcGVydHkiLCJvcHRzIiwiZmlyc3QiLCJvbW9kZWxOYW1lIiwidmFsaWRhdG9ycyIsInVubGlua1JlZmVyZW5jZSIsImluc3RhbmNlIiwiaW5zdGFuY2VzIiwib21vZGVsIiwibGlua1JlZmVyZW5jZSIsInJlZnMiLCJJTkRFWF9NMk0iLCJXMlBfUE9TVCIsIl9leHRyYSIsIlRPT05FIiwiVE9NQU5ZIiwiTUFOWVRPTUFOWSIsIm1vZGVsQ2xhc3MiLCJ6aXAiLCJkZWxldGVkIiwiTVBBIiwicmVjb3JkIiwiaXRhYiIsInRhYmxlIiwiaWsiLCJubmV3IiwidXBkYXRlZCIsIm5ld09iamVjdHMiLCJtb2RlbFJlZmVyZW5jZXMiLCJvbGRJdGVtIiwib2xkQ29weSIsIm5ld0l0ZW0iLCJOYU4iLCJubyIsInRvdGFsUmVzdWx0cyIsImdvdE0yTSIsInJvdyIsIm0iLCJ2ZXJiIiwidG9nZXRoZXIiLCJzZW5kRGF0YSIsIkdPVF9BTEwiLCJnb3RNb2RlbCIsImNhY2hlS2V5IiwibW9kZWxOb3RGb3VuZCIsImFkZE1vZGVsSGFuZGxlciIsImFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiYXR0cmlidXRlcyIsImFkZFByb3BlcnR5IiwidmFsIiwia2F0dHIiLCJzZXQiLCJhdHRycyIsIm5ld0F0dHJzIiwicmVXaGVlbE9STSIsImxvZ2luRnVuYyIsImdldE1vZGVsIiwic2luZ2xlIiwibW9kTmFtZSIsImdldExvZ2dlZFVzZXIiLCJ1c2VyIiwiJHNlbmRUb0VuZHBvaW50IiwiZ2V0UmVzb3VyY2VzIiwiZ2V0Q29sbGVjdGlvbiIsImZpbHRlck9ySWRzIl0sIm1hcHBpbmdzIjoiOzs7SUFBQSxhO0lBRUEsU0FBQUEsT0FBQSxHQUFBO0FBQUEsUUFDQSxLQUFBQyxRQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsUUFFQSxLQUFBQyxXQUFBLEdBQUEsRUFBQSxDQUZBO0FBQUEsSztJQUdBLEM7SUFFQUYsT0FBQSxDQUFBRyxTQUFBLENBQUFDLFVBQUEsR0FBQSxVQUFBQyxPQUFBLEVBQUE7QUFBQSxRQUNBLElBQUFDLFVBQUEsR0FBQUMsS0FBQSxDQUFBQyxJQUFBLENBQUFILE9BQUEsQ0FBQUksUUFBQSxFQUFBLENBQUEsQ0FEQTtBQUFBLFFBRUEsSUFBQSxDQUFBLENBQUFILFVBQUEsSUFBQSxLQUFBSixXQUFBLENBQUEsRUFBQTtBQUFBLFlBQ0EsS0FBQUEsV0FBQSxDQUFBSSxVQUFBLElBQUFELE9BQUEsQ0FEQTtBQUFBLFlBRUEsS0FBQUosUUFBQSxDQUFBUyxJQUFBLENBQUFMLE9BQUEsRUFGQTtBQUFBLFNBRkE7QUFBQSxLQUFBLEM7SUFPQUwsT0FBQSxDQUFBRyxTQUFBLENBQUFRLE1BQUEsR0FBQSxZQUFBO0FBQUEsUUFDQSxJQUFBQyxJQUFBLEdBQUFDLEtBQUEsQ0FBQVYsU0FBQSxDQUFBVyxLQUFBLENBQUFDLElBQUEsQ0FBQUMsU0FBQSxFQUFBLENBQUEsQ0FBQSxDQURBO0FBQUEsUUFFQSxLQUFBZixRQUFBLENBQUFnQixPQUFBLENBQUEsVUFBQUMsSUFBQSxFQUFBO0FBQUEsWUFDQUEsSUFBQSxDQUFBQyxLQUFBLENBQUEsSUFBQSxFQUFBUCxJQUFBLEVBREE7QUFBQSxTQUFBLEVBRkE7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QUFBLEVBQUExQixJQUFBLEVBQUE7QUFBQSxnQkFDQSxJQUFBLE9BQUFBLElBQUEsS0FBQSxRQUFBLEVBQUE7QUFBQSxvQkFDQSxJQUFBQSxJQUFBLEtBQUEsVUFBQSxFQUFBO0FBQUEsd0JBQ0EsT0FBQXNCLFVBQUEsQ0FEQTtBQUFBLHFCQUFBLE1BRUE7QUFBQSx3QkFDQSxPQUFBMUMsS0FBQSxDQUFBK0MsSUFBQSxDQURBO0FBQUEscUJBSEE7QUFBQSxpQkFBQSxNQU1BO0FBQUEsb0JBQ0EsT0FBQUQsTUFBQSxDQUFBMUIsSUFBQSxDQUFBLENBREE7QUFBQSxpQkFQQTtBQUFBLGFBREE7QUFBQSxTQUFBLENBQUEsQ0FEQTtBQUFBLEs7SUF1TkE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtB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QUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUI7SUFFQSxTQUFBdkUsa0JBQUEsQ0FBQUQsUUFBQSxFQUFBWixHQUFBLEVBQUE7QUFBQSxRQUNBLElBQUFxRixLQUFBLEdBQUEsRUFBQSxDQURBO0FBQUEsUUFFQSxLQUFBbEMsR0FBQSxHQUFBa0MsS0FBQSxDQUFBdFMsSUFBQSxDQUFBcUMsSUFBQSxDQUFBaVEsS0FBQSxDQUFBLENBRkE7QUFBQSxRQUdBLEtBQUFsQyxHQUFBLEdBQUEsVUFBQW1DLElBQUEsRUFBQTtBQUFBLFlBRUE7QUFBQSxnQkFBQSxDQUFBaFIsSUFBQSxDQUFBK1EsS0FBQSxFQUFBRSxJQUFBLENBQUFELElBQUEsQ0FBQSxF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QSxRQUNBLE9BQUEsS0FBQThJLElBQUEsQ0FBQTNLLFVBQUEsQ0FBQTJCLEtBQUEsQ0FBQUMsUUFBQSxFQUFBQyxRQUFBLENBQUEsQ0FEQTtBQUFBLEtBQUEsQztJQUlBb1QsVUFBQSxDQUFBL2UsU0FBQSxDQUFBdWYsWUFBQSxHQUFBLFlBQUE7QUFBQSxRQUNBLElBQUFqWSxHQUFBLEdBQUEsS0FBQW1OLElBQUEsQ0FEQTtBQUFBLFFBRUEsT0FBQSxJQUFBdlEsT0FBQSxDQUFBLFVBQUFDLE1BQUEsRUFBQUMsTUFBQSxFQUFBO0FBQUEsWUFDQSxJQUFBMEYsVUFBQSxHQUFBeEMsR0FBQSxDQUFBd0MsVUFBQSxDQURBO0FBQUEsWUFFQTFKLEtBQUEsQ0FBQXdELEdBQUEsQ0FBQWtHLFVBQUEsQ0FBQUYsUUFBQSxHQUFBLGVBQUEsRUFBQSxJQUFBLEVBQUEvQixJQUFBLENBQUEsVUFBQWtELEdBQUEsRUFBQTtBQUFBLGdCQUNBLElBQUFBLEdBQUEsQ0FBQXRHLFlBQUEsRUFBQTtBQUFBLG9CQUNBTixNQUFBLENBQUE0RyxHQUFBLENBQUF0RyxZQUFBLENBQUF1TSxJQUFBLEVBQUEsRUFEQTtBQUFBLGlCQUFBLE1BRUE7QUFBQSxvQkFDQTVNLE1BQUEsQ0FBQTJHLEdBQUEsRUFEQTtBQUFBLGlCQUhBO0FBQUEsYUFBQSxFQUZBO0FBQUEsU0FBQSxDQUFBLENBRkE7QUFBQSxLQUFBLEM7SUFjQWdVLFVBQUEsQ0FBQS9lLFNBQUEsQ0FBQXdmLGFBQUEsR0FBQSxVQUFBblEsU0FBQSxFQUFBb1EsV0FBQSxFQUFBO0FBQUEsUUFDQSxPQUFBLElBQUF0TCxVQUFBLENBQUE3TSxHQUFBLENBQUFtTixJQUFBLEVBQUFnTCxXQUFBLElBQUEsRUFBQSxDQUFBLENBREE7QUFBQSxLQUFBLEMiLCJmaWxlIjoicnd0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBIYW5kbGVyKCl7XG4gICAgdGhpcy5oYW5kbGVycyA9IFtdO1xuICAgIHRoaXMuc3RySGFuZGxlcnMgPSB7fTtcbn07XG5cbkhhbmRsZXIucHJvdG90eXBlLmFkZEhhbmRsZXIgPSBmdW5jdGlvbiAoaGFuZGxlcil7XG4gICAgdmFyIHN0ckhhbmRsZXIgPSB1dGlscy5oYXNoKGhhbmRsZXIudG9TdHJpbmcoKSk7XG4gICAgaWYgKCEoc3RySGFuZGxlciBpbiB0aGlzLnN0ckhhbmRsZXJzKSl7XG4gICAgICAgIHRoaXMuc3RySGFuZGxlcnNbc3RySGFuZGxlcl0gPSBoYW5kbGVyO1xuICAgICAgICB0aGlzLmhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gICAgfVxufTtcbkhhbmRsZXIucHJvdG90eXBlLmhhbmRsZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMCk7XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KG51bGwsYXJncyk7XG4gICAgfSlcbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGVCeSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSk7XG4gICAgdmFyIHRocyA9IGFyZ3VtZW50c1swXTtcbiAgICB0aGlzLmhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oZnVuYyl7XG4gICAgICAgIGZ1bmMuYXBwbHkodGhzLGFyZ3MpO1xuICAgIH0pXG59O1xuXG5cbmZ1bmN0aW9uIE5hbWVkRXZlbnRNYW5hZ2VyICgpe1xuICAgIHZhciBldmVudHMgPSB7fTtcbiAgICB2YXIgaGFuZGxlcklkID0ge307XG4gICAgdmFyIGlkeElkID0gMDtcbiAgICB0aGlzLm9uID0gZnVuY3Rpb24obmFtZSwgZnVuYyl7XG4gICAgICAgIGlmICghKG5hbWUgaW4gZXZlbnRzKSl7XG4gICAgICAgICAgICBldmVudHNbbmFtZV0gPSBuZXcgQXJyYXkoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaWQgPSBpZHhJZCArKztcbiAgICAgICAgZXZlbnRzW25hbWVdLnB1c2goZnVuYyk7XG4gICAgICAgIGhhbmRsZXJJZFtpZF0gPSBmdW5jO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfTtcbiAgICB0aGlzLmVtaXQgPSBmdW5jdGlvbihuYW1lKXtcbiAgICAgICAgaWYgKG5hbWUgaW4gZXZlbnRzKXtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICAgICAgICAgIGV2ZW50LmFwcGx5KG51bGwsYXJncyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy51bmJpbmQgPSBmdW5jdGlvbihoYW5kbGVyKXtcbiAgICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgICAgaWYgKGhhbmRsZXIgaW4gaGFuZGxlcklkKXtcbiAgICAgICAgICAgIHZhciBmdW5jID0gaGFuZGxlcklkW2hhbmRsZXIgKyAnJ107XG4gICAgICAgICAgICBMYXp5KGV2ZW50cykuZWFjaChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBuIGluIHYpe1xuICAgICAgICAgICAgICAgICAgICBpZiAodltuXSA9PT0gZnVuYyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZHgucHVzaChuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWR4LnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICB2LnNwbGljZSh4LDEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGhhbmRsZXJJZFtoYW5kbGVyXTtcbiAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQ2FsbCBldmVudCBvbmNlXG4gICAgICovXG4gICAgdGhpcy5vbmNlID0gZnVuY3Rpb24oZXZlbnROYW1lLCBoYW5kbGVyRnVuY3Rpb24pIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgaGFuZGxlciA9IHRoaXMub24oZXZlbnROYW1lLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgaGFuZGxlckZ1bmN0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBzZWxmLnVuYmluZChoYW5kbGVyKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBpZiAoJ0RFQlVHJyBpbiB3aW5kb3cpIHtcbiAgICAgICAgdmFyIGVtaXQgPSB0aGlzLmVtaXQ7XG4gICAgICAgIHRoaXMuZW1pdCA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApO1xuICAgICAgICAgICAgLy9jb25zb2xlLmluZm8oJ0V2ZW50IDogJyArIGFyZ3MpXG4gICAgICAgICAgICByZXR1cm4gZW1pdC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfSkuYmluZCh0aGlzKTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjYWNoZWRLZXlJZHggPSAwO1xuXG52YXIgbnVsbFN0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJyd9O1xuXG5mdW5jdGlvbiBtb2NrT2JqZWN0KCl7XG4gICAgcmV0dXJuIG5ldyBQcm94eSh7fSwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBuYW1lICA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgIGlmIChuYW1lID09PSAndG9TdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsU3RyaW5nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1dGlscy5tb2NrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtuYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG59XG5cbi8qXG52YXIgJFBPU1QgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGNhbGxCYWNrLCBlcnJvckJhY2ssaGVhZGVycyl7XG4gICAgdmFyIG9wdHMgPSB7XG4gICAgICAgIGFjY2VwdHMgOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIHVybCA6IHVybCxcbiAgICAgICAgZGF0YSA6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICBkYXRhVHlwZSA6ICdqc29uJyxcbiAgICAgICAgc3VjY2VzcyA6IGNhbGxCYWNrLFxuICAgICAgICBlcnJvciA6IGVycm9yQmFjayxcbiAgICAgICAgbWV0aG9kIDogJ1BPU1QnLFxuICAgICAgICBjb250ZW50VHlwZSA6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIH07XG4gICAgaWYgKGhlYWRlcnMpe1xuICAgICAgICBvcHRzLmhlYWRlcnMgPSBoZWFkZXJzO1xuICAgICAgICBvcHRzLmNyb3NzRG9tYWluID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuICQuYWpheChvcHRzKTtcbn1cblxuXG5mdW5jdGlvbiByZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgZ2V0TG9naW4pe1xuICAgIC8vIG1haW4gXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZ2V0TG9naW4gPSBnZXRMb2dpbjtcbiAgICB0aGlzLmV2ZW50cyA9IG5ldyBOYW1lZEV2ZW50TWFuYWdlcigpXG4gICAgdGhpcy4kUE9TVCA9ICRQT1NULmJpbmQodGhpcyk7XG4gICAgdGhpcy5vcHRpb25zID0ge2VuZFBvaW50IDogZW5kUG9pbnR9O1xuICAgIHRoaXMub24gPSB0aGlzLmV2ZW50cy5vbi5iaW5kKHRoaXMpO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnVwZGF0ZVN0YXR1cyA9IGZ1bmN0aW9uKHN0YXR1cywgY2FsbEJhY2ssIGVycm9yKSB7XG4gICAgaWYgKHN0YXR1cykge1xuICAgICAgICB2YXIgaXNMb2dnZWQgPSAoc3RhdHVzLnVzZXJfaWQgJiYgIXRoaXMub3B0aW9ucy51c2VyX2lkICk7XG4gICAgICAgIGZvciAodmFyIHggaW4gc3RhdHVzKXsgdGhpcy5vcHRpb25zW3hdID0gc3RhdHVzW3hdOyB9XG4gICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgaWYgKGlzTG9nZ2VkKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50cy5lbWl0KCdsb2dpbicsIHRoaXMub3B0aW9ucy51c2VyX2lkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMub3B0aW9ucy51c2VyX2lkICYmIHRoaXMuZ2V0TG9naW4pe1xuICAgICAgICB2YXIgbG9nSW5mbyA9IHRoaXMuZ2V0TG9naW4oZXJyb3IpO1xuICAgICAgICBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KXtcbiAgICAgICAgICAgIHRoaXMubG9naW4obG9nSW5mby51c2VybmFtZSwgbG9nSW5mby5wYXNzd29yZClcbiAgICAgICAgICAgIC50aGVuKChmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHN0YXR1cywgY2FsbEJhY2spO1xuICAgICAgICAgICAgfSkuYmluZCh0aGlzKSk7XG4gICAgICAgIH0gZWxzZSBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gUHJvbWlzZSkge1xuICAgICAgICAgICAgbG9nSW5mby50aGVuKChmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgICAgIHZhciB4ID0gdGhpcy5sb2dpbihvYmoudXNlcm5hbWUsb2JqLnBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICB2YXIgbWFuYWdlRXJyb3IgPSAoZnVuY3Rpb24oYmFkKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMobnVsbCxjYWxsQmFjayxiYWQuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pLmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKXtcbiAgICAgICAgICAgICAgICAgICAgeC50aGVuKGNhbGxCYWNrLG1hbmFnZUVycm9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB4LnRoZW4obnVsbCwgbWFuYWdlRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sodGhpcy5vcHRpb25zKTtcbiAgICB9ICAgIFxufVxuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuc3RhdHVzID0gZnVuY3Rpb24oY2FsbEJhY2ssIGZvcmNlKXtcbiAgICBpZiAoKCdsYXN0UldUU3RhdHVzJyBpbiBsb2NhbFN0b3JhZ2UpICYmICFmb3JjZSkge1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICB2YXIgc3RhdHVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhzdGF0dXMsY2FsbEJhY2spO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0YXR1cyhjYWxsQmFjaywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9zdGF0dXNfY2FsbGluZyl7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuc3RhdHVzKGNhbGxCYWNrKTtcbiAgICAgICAgfSw1MCk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnRpbWVzdGFtcCl7XG4gICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHRoaXMub3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhdHVzX2NhbGxpbmcgPSB0cnVlO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiB0aGlzLiRwb3N0KCdhcGkvc3RhdHVzJyxudWxsLGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cyA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG4gICAgICAgICAgICBzZWxmLl9zdGF0dXNfY2FsbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgc2VsZi51cGRhdGVTdGF0dXMoc3RhdHVzLGNhbGxCYWNrKTtcbiAgICAgICAgfSk7ICAgICAgICBcbiAgICB9XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuJHBvc3QgPSBmdW5jdGlvbih1cmwsIGRhdGEsY2FsbEJhY2spe1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnRva2VuKXtcbiAgICAgICAgaWYgKCFkYXRhKXtcbiAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnRva2VuKXtcbiAgICAgICAgdmFyIGhlYWRlcnMgPSB7IFxuICAgICAgICAgICAgdG9rZW4gOiB0aGlzLm9wdGlvbnMudG9rZW4sXG4gICAgICAgICAgICBhcHBsaWNhdGlvbiA6IHRoaXMub3B0aW9ucy5hcHBsaWNhdGlvblxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBoZWFkZXJzID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodGhzLm9wdGlvbnMuZW5kUG9pbnQgKyB1cmwsIGRhdGEsIHRocy5vcHRpb25zLmFwcGxpY2F0aW9uLCB0aHMub3B0aW9ucy50b2tlbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlJywgeGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cywgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMgKyAnLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FsbEJhY2spIHsgY2FsbEJhY2soIHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCApfTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgeGhyLnN0YXR1cywgdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWpzb24tJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZURhdGEsdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWh0dHAnLHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1odHRwLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICB2YXIgdXJsID0gdGhpcy5vcHRpb25zLmVuZFBvaW50ICsgJ2FwaS9sb2dpbic7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHVybCx7IHVzZXJuYW1lOiB1c2VybmFtZSwgcGFzc3dvcmQgOiBwYXNzd29yZH0sIG51bGwsY29ubmVjdGlvbi5vcHRpb25zLnRva2VuLCB0cnVlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uLnVwZGF0ZVN0YXR1cyh4aHIucmVzcG9uc2VEYXRhKTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoc3RhdHVzKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oY2FsbEJhY2spe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgd3Njb25uZWN0ID0gZnVuY3Rpb24oc2VsZil7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uID0gbmV3IHV0aWxzLndzQ29ubmVjdChzZWxmLm9wdGlvbnMpO1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbi5vbkNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuZXZlbnRzLmVtaXQoJ3dzLWNvbm5lY3RlZCcsIHNlbGYud3NDb25uZWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uLm9uRGlzY29ubmVjdChmdW5jdGlvbigpeyBcbiAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMgJiYgc2VsZi5vcHRpb25zLnJlYWx0aW1lRW5kUG9pbnQpe1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgd3Njb25uZWN0KHNlbGYpOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9LDEwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzKChmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICBpZiAoJ3Rva2VuJyBpbiBzZWxmLm9wdGlvbnMpe1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW5nIHRvICcgKyBzZWxmLm9wdGlvbnMuZW5kUG9pbnQpO1xuICAgICAgICAgICAgaWYgKHNlbGYub3B0aW9ucy51c2VybmFtZSAmJiBzZWxmLm9wdGlvbnMucGFzc3dvcmQpe1xuICAgICAgICAgICAgICAgIHNlbGYubG9naW4oXG4gICAgICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucy51c2VybmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLnBhc3N3b3JkLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3JlbmV3aW5nIGNvbm5lY3Rpb24nKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzZWxmLm9wdGlvbnMudG9rZW4gJiYgc2VsZi5vcHRpb25zLnJlYWx0aW1lRW5kUG9pbnQgJiYgKCFzZWxmLndzQ29ubmVjdGlvbikpe1xuICAgICAgICAgICAgd3Njb25uZWN0KHNlbGYpO1xuICAgICAgICB9XG4gICAgfSkuYmluZCh0aGlzKSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9nT3V0ID0gZnVuY3Rpb24odXJsLCBjYWxsQmFjayl7XG4gICAgcmV0dXJuIHRoaXMuJHBvc3QoJ2FwaS9sb2dvdXQnLHt9LChmdW5jdGlvbihzdGF0dXMpIHtcbiAgICAgICAgaWYgKCdsYXN0UldUU3RhdHVzJyBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2UubGFzdFJXVFN0YXR1cztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB7ZW5kUG9pbnQ6IHRoaXMub3B0aW9ucy5lbmRQb2ludH07XG4gICAgICAgIGlmICh0aGlzLndzQ29ubmVjdGlvbikgeyBcbiAgICAgICAgICAgIHRoaXMud3NDb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLndzQ29ubmVjdGlvbiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVybCkgeyBsb2NhdGlvbiA9IHVybDsgfVxuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgIH0pLmJpbmQodGhpcykpO1xufVxuKi9cbnZhciB1dGlscyA9IHtcbiAgICByZW5hbWVGdW5jdGlvbiA6IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICAgICAgICByZXR1cm4gKG5ldyBGdW5jdGlvbihcInJldHVybiBmdW5jdGlvbiAoY2FsbCkgeyByZXR1cm4gZnVuY3Rpb24gXCIgKyBuYW1lICtcbiAgICAgICAgICAgIFwiICgpIHsgcmV0dXJuIGNhbGwodGhpcywgYXJndW1lbnRzKSB9OyB9O1wiKSgpKShGdW5jdGlvbi5hcHBseS5iaW5kKGZuKSk7XG4gICAgfSxcbiAgICBjYWNoZWQgOiBmdW5jdGlvbihmdW5jLCBrZXkpe1xuICAgICAgICBpZiAoIWtleSl7ICAgIFxuICAgICAgICAgICAga2V5ID0gJ18nICsgY2FjaGVkS2V5SWR4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gd3JhcHBlcigpe1xuICAgICAgICAgICAgaWYgKCF0aGlzW2tleV0pe1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IGZ1bmMuY2FsbCh0aGlzLFthcmd1bWVudHNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzW2tleV07XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB3cmFwcGVyO1xuICAgIH0sXG4vLyAgICAkUE9TVCA6ICRQT1NULFxuLy8gICAgcmVXaGVlbENvbm5lY3Rpb246IHJlV2hlZWxDb25uZWN0aW9uLFxuICAgIGxvZzogZnVuY3Rpb24oKXsgXG4gICAgICAgIGNvbnNvbGUubG9nKGFyZ3VtZW50cyk7XG4gICAgfSxcblxuICAgIHhkcjogZnVuY3Rpb24gKHVybCwgZGF0YSwgYXBwbGljYXRpb24sdG9rZW4sIGZvcm1FbmNvZGUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ha2UgYW4gSFRUUCBSZXF1ZXN0IGFuZCByZXR1cm4gaXRzIHByb21pc2UuXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciByZXE7XG4gICAgICAgICAgICBpZiAoIWRhdGEpIHsgZGF0YSA9IHt9O31cblxuICAgICAgICAgICAgaWYoWE1MSHR0cFJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZURhdGEgPSBKU09OLnBhcnNlKHJlcS5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoYSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB7cmVzcG9uc2VEYXRhOiByZXNwb25zZURhdGEsIHJlc3BvbnNlVGV4dDogcmVxLnJlc3BvbnNlVGV4dCxzdGF0dXM6IHJlcS5zdGF0dXMsIHJlcXVlc3Q6IHJlcX07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVxLnN0YXR1cyA+PSAyMDAgJiYgcmVxLnN0YXR1cyA8IDQwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmKFhEb21haW5SZXF1ZXN0KXtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWERvbWFpblJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXEucmVzcG9uc2VUZXh0LHJlcS5zdGF0dXNUZXh0LCByZXEpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0NPUlMgbm90IHN1cHBvcnRlZCcpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxLm9wZW4oJ1BPU1QnLCB1cmwsIHRydWUpO1xuICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgaWYgKHRva2VuKSB7IGRhdGEuX190b2tlbl9fID0gdG9rZW4gfVxuICAgICAgICAgICAgaWYgKCFmb3JtRW5jb2RlKXtcbiAgICAgICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLnNpemUoKT9KU09OLnN0cmluZ2lmeShkYXRhKTonJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUkkodi50b1N0cmluZygpKTsgIFxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKS5qb2luKCcmJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXEuc2VuZChkYXRhKTtcbiAgICAvLyAgICAgICAgcmVxLnNlbmQobnVsbCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBjYXBpdGFsaXplIDogZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgcmV0dXJuIHNbMF0udG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICB9LFxuXG4gICAgaGFzaCA6IGZ1bmN0aW9uKHN0cil7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIYXNoZWQgZnVuY3Rpb25cbiAgICAgICAgICovXG4gICAgICAgIHN0ciA9IHN0ci50b1N0cmluZygpO1xuICAgICAgICB2YXIgcmV0ID0gMTtcbiAgICAgICAgZm9yICh2YXIgeCA9IDA7eDxzdHIubGVuZ3RoO3grKyl7XG4gICAgICAgICAgICByZXQgKj0gKDEgKyBzdHIuY2hhckNvZGVBdCh4KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChyZXQgJSAzNDk1ODM3NDk1NykudG9TdHJpbmcoKTtcbiAgICB9LFxuXG4gICAgbWFrZUZpbHRlciA6IGZ1bmN0aW9uIChtb2RlbCwgZmlsdGVyLCB1bmlmaWVyLCBkb250VHJhbnNsYXRlRmlsdGVyKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlIGZpbHRlciBmb3IgQXJyYXkuZmlsdGVyIGZ1bmN0aW9uIGFzIGFuIGFuZCBvZiBvclxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKCF1bmlmaWVyKSB7IHVuaWZpZXIgPSAnICYmICc7fVxuICAgICAgICBpZiAoTGF6eShmaWx0ZXIpLnNpemUoKSA9PT0gMCl7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCl7IHJldHVybiB0cnVlIH07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNvdXJjZSA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odmFscywgZmllbGQpe1xuICAgICAgICAgICAgaWYgKCF2YWxzKSB7IHZhbHMgPSBbbnVsbF19XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFscykpe1xuICAgICAgICAgICAgICAgIHZhbHMgPSBbdmFsc107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWRvbnRUcmFuc2xhdGVGaWx0ZXIgJiYgKG1vZGVsLmZpZWxkc1tmaWVsZF0udHlwZSA9PT0gJ3JlZmVyZW5jZScpKSB7XG4gICAgICAgICAgICAgICAgZmllbGQgPSAnXycgKyBmaWVsZDtcbiAgICAgICAgICAgICAgICB2YWxzID0gTGF6eSh2YWxzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgIGlmICh4ICYmICh4LmNvbnN0cnVjdG9yICE9PSBOdW1iZXIpKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmlkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vZGVsLmZpZWxkc1tmaWVsZF0udHlwZSA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgIHZhbHMgPSB2YWxzLm1hcChKU09OLnN0cmluZ2lmeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJygnICsgIExhenkodmFscykubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgIGlmICgheCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdtYWtlRmlsdGVyIHggaXMgbnVsbCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZih4ID09PSBvcm0udXRpbHMubW9jaykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdtYWtlRmlsdGVyIHdpdGggTW9jayBPYmplY3QnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICcoeC4nICsgZmllbGQgKyAnID09PSAnICsgeCArICcpJztcbiAgICAgICAgICAgIH0pLmpvaW4oJyB8fCAnKSAgKycpJztcbiAgICAgICAgfSkudG9BcnJheSgpLmpvaW4odW5pZmllcik7XG4gICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJ4XCIsIFwicmV0dXJuIFwiICsgc291cmNlKTtcbiAgICB9LFxuXG4gICAgc2FtZUFzIDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZXAgZXF1YWxcbiAgICAgICAgICovXG4gICAgICAgIGZvciAodmFyIGsgaW4geCkge1xuICAgICAgICAgICAgaWYgKHlba10gIT0geFtrXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIHBsdXJhbGl6ZSA6IGZ1bmN0aW9uKHN0ciwgbW9kZWwpe1xuICAgICAgICAvKipcbiAgICAgICAgICogTGV4aWNhbGx5IHJldHVybnMgZW5nbGlzaCBwbHVyYWwgZm9ybVxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIHN0ciArICdzJztcbiAgICB9LFxuXG4gICAgYmVmb3JlQ2FsbCA6IGZ1bmN0aW9uKGZ1bmMsIGJlZm9yZSl7XG4gICAgICAgIHZhciBkZWNvcmF0b3IgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgYmVmb3JlKCkudGhlbihmdW5jKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZGVjb3JhdG9yO1xuICAgIH0sXG5cbiAgICBjbGVhblN0b3JhZ2UgOiBmdW5jdGlvbigpe1xuICAgICAgICAvKipcbiAgICAgICAgICogQ2xlYW4gbG9jYWxTdG9yYWdlIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgTGF6eShsb2NhbFN0b3JhZ2UpLmtleXMoKS5lYWNoKGZ1bmN0aW9uKGspe1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtrXTtcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgY2xlYW5EZXNjcmlwdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIExhenkobG9jYWxTdG9yYWdlKVxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbih2LCBuKSB7IHJldHVybiBMYXp5KG4pLnN0YXJ0c1dpdGgoJ2Rlc2NyaXB0aW9uOicpfSlcbiAgICAgICAgICAgIC5rZXlzKClcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKG4pIHsgZGVsZXRlIGxvY2FsU3RvcmFnZVtuXSB9KTtcbiAgICB9LFxuICAgIFxuICAgIHJldmVyc2UgOiBmdW5jdGlvbiAoY2hyLCBzdHIpIHtcbiAgICAgICAgcmV0dXJuIHN0ci5zcGxpdChjaHIpLnJldmVyc2UoKS5qb2luKGNocik7XG4gICAgfSxcbiAgICBwZXJtdXRhdGlvbnM6IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgeCA9IGFyci5sZW5ndGgtMTsgeCA+PSAwO3gtLSl7XG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gYXJyLmxlbmd0aC0xOyB5ID49IDA7IHktLSl7XG4gICAgICAgICAgICAgICAgaWYgKHggIT09IHkpXG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKFthcnJbeF0sIGFyclt5XV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcblxuICAgIHdhaXRGb3I6IGZ1bmN0aW9uKGZ1bmMsIGNhbGxCYWNrKSB7XG4gICAgICAgIHZhciB3YWl0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChmdW5jKCkpIHtcbiAgICAgICAgICAgICAgICBjYWxsQmFjaygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHdhaXRlciw1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQod2FpdGVyLCA1MDApO1xuICAgIH0sXG5cbiAgICBib29sOiBCb29sZWFuLFxuXG4gICAgbm9vcCA6IGZ1bmN0aW9uKCl7fSxcblxuICAgIHR6T2Zmc2V0OiBuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCxcblxuICAgIHRyYW5zRmllbGRUeXBlOiB7XG4gICAgICAgIGRhdGU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG5ldyBEYXRlKHggKiAxMDAwICsgdXRpbHMudHpPZmZzZXQgKSB9LFxuICAgICAgICBkYXRldGltZTogZnVuY3Rpb24oeCkgeyByZXR1cm4gbmV3IERhdGUoeCAqIDEwMDAgKyB1dGlscy50ek9mZnNldCApIH0sXG4gICAgICAgIHN0cmluZzogZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b1N0cmluZygpOyB9LFxuICAgICAgICB0ZXh0OiBmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvU3RyaW5nKCk7IH0sXG4gICAgICAgIGludGVnZXI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBhcnNlSW50KHgpOyB9LFxuICAgICAgICBmbG9hdDogZnVuY3Rpb24oeCkgeyByZXR1cm4gcGFyc2VGbG9hdCh4KTsgfVxuICAgIH0sIFxuICAgIG1vY2sgOiBtb2NrT2JqZWN0KClcbn07XG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgU1RBVFVTS0VZID0gJ2xhc3RSV1RDb25uZWN0aW9uU3RhdHVzJztcblxuZnVuY3Rpb24gUmVhbHRpbWVDb25uZWN0aW9uKGVuZFBvaW50LCByd3RDb25uZWN0aW9uKXtcbiAgICAvKipcbiAgICAgKiBDb25uZWN0cyBhIHdlYnNvY2tldCB3aXRoIHJlV2hlZWwgY29ubmVjdGlvblxuICAgICAqL1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBjb25uZWN0aW9uID0gbmV3IFNvY2tKUyhlbmRQb2ludCk7XG4gICAgY29ubmVjdGlvbi5vbm9wZW4gPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICBjb25zb2xlLmxvZygnb3BlbiA6IHdlYnNvY2tldCcpO1xuICAgICAgICBjb25uZWN0aW9uLnRlbmFudCgpO1xuICAgICAgICByd3RDb25uZWN0aW9uLmVtaXQoJ3JlYWx0aW1lLWNvbm5lY3Rpb24tb3BlbicseCk7XG4gICAgfTtcbiAgICBjb25uZWN0aW9uLm9ubWVzc2FnZSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGlmICh4LnR5cGUgPT0gJ21lc3NhZ2UnKSB7XG4gICAgICAgICAgICAvLyQubm90aWZ5KHguZGF0YSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vVE9ETyBzZXQgZnJvbVJlYWx0aW1lXG4gICAgICAgICAgICAgICAgcnd0Q29ubmVjdGlvbi5lbWl0KCdyZWFsdGltZS1tZXNzYWdlLWpzb24nLCBKU09OLnBhcnNlKHguZGF0YSkpO1xuICAgICAgICAgICAgICAgIC8vVE9ETyB1bnNldCBmcm9tUmVhbHRpbWVcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtbWVzc2FnZS10ZXh0JywgSlNPTi5wYXJzZSh4LmRhdGEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmcm9tIHJlYWx0aW1lICcseCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGNvbm5lY3Rpb24ub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2V0VGltZW91dCh1dGlscy53c0Nvbm5lY3QsMTAwMCk7XG4gICAgICAgIHJ3dENvbm5lY3Rpb24uZW1pdCgncmVhbHRpbWUtY29ubmVjdGlvbi1jbG9zZWQnKTtcbiAgICB9O1xuICAgIGNvbm5lY3Rpb24udGVuYW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25uZWN0aW9uLnNlbmQoJ1RFTkFOVDonICsgcnd0Q29ubmVjdGlvbi5jYWNoZWRTdGF0dXMuYXBwbGljYXRpb24gKyAnOicgKyByd3RDb25uZWN0aW9uLmNhY2hlZFN0YXR1cy50b2tlbik7XG4gICAgfVxuICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29ubmVjdGlvbi5jbG9zZSgpO1xuICAgIH1cbn0gICAgXG5cbmZ1bmN0aW9uIHJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBnZXRMb2dpbil7XG4gICAgLyoqXG4gICAgICogQ29ubmVjdGlvbiBiYXNpYyBmb3IgcmVXaGVlbFxuICAgICAqIEBwYXJhbSBlbmRQb2ludDogc3RyaW5nIGJhc2UgdXJsIGZvciBhbGwgY29tdW5pY2F0aW9uXG4gICAgICogQHBhcmFtIGdldExvZ2luOiBmdW5jdGlvbiB0byBiZSBjYWxsZWQgaW4gY2FzZSBvZiBtaXNzaW5nIGxvZ2luLlxuICAgICAqICB0aGlzIGZ1bmN0aW9uIGNvdWxkIHJldHVybiA6XG4gICAgICogIC0gICBhIHsgdXNlcm5hbWUgOiA8dXNlcm5hbWU+ICwgcGFzc3dvcmQ6IDxwYXNzd29yZD59IG9yXG4gICAgICogIC0gICBiIFByb21pc2UgLT4geyB1c2VybmFtZSA6IDx1c2VybmFtZT4gLCBwYXNzd29yZDogPHBhc3N3b3JkPn1cbiAgICAgKi9cbiAgICAvLyBtYWluIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIGV2ZW50cyA9IG5ldyBOYW1lZEV2ZW50TWFuYWdlcigpO1xuICAgIHRoaXMuZ2V0TG9naW4gPSBnZXRMb2dpbjtcbiAgICB0aGlzLmVuZFBvaW50ID0gZW5kUG9pbnQuZW5kc1dpdGgoJy8nKT8gZW5kUG9pbnQ6IChlbmRQb2ludCArICcvJyk7XG4gICAgdGhpcy5vbiA9IGV2ZW50cy5vbjtcbiAgICB0aGlzLnVuYmluZCA9IGV2ZW50cy51bmJpbmQ7XG4gICAgdGhpcy5lbWl0ID0gZXZlbnRzLmVtaXQ7XG4gICAgdGhpcy5vbmNlID0gZXZlbnRzLm9uY2U7XG4gICAgdGhpcy5jYWNoZWRTdGF0dXMgPSB7fTtcbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2U7XG4gICAgdGhpcy5pc0xvZ2dlZEluID0gZmFsc2U7XG4gICAgLy8gcmVnaXN0ZXJpbmcgdXBkYXRlIHN0YXR1c1xuICAgIHZhciB0aHMgPSB0aGlzO1xufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLiRwb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLGNhbGxCYWNrKXtcbiAgICAvKipcbiAgICAgKiBBSkFYIGNhbGwgZm9yIGZldGNoIGFsbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICogQHBhcmFtIHVybDogbGFzdCB1cmwgcGFydCBmb3IgYWpheCBjYWxsXG4gICAgICogQHBhcmFtIGRhdGE6IGRhdGEgb2JqZWN0IHRvIGJlIHNlbnRcbiAgICAgKiBAcGFyYW0gY2FsbEJhY2s6IGZ1bmN0aW9uKHhocikgd2lsbCBiZSBjYWxsZWQgd2hlbiBkYXRhIGFycml2ZXNcbiAgICAgKiBAcmV0dXJucyBQcm9taXNlPHhocj4gc2FtZSBvZiBjYWxsQmFja1xuICAgICAqL1xuICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5lbmRQb2ludCArIHVybCwgZGF0YSwgdGhzLmNhY2hlZFN0YXR1cy5hcHBsaWNhdGlvbiwgdGhzLmNhY2hlZFN0YXR1cy50b2tlbilcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2h0dHAtcmVzcG9uc2UnLCB4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIHRocy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMgKyAnLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY2FsbEJhY2spIHsgY2FsbEJhY2soIHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCApfTtcbiAgICAgICAgICAgICAgICBhY2NlcHQoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5lbWl0KCdlcnJvci1qc29uLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VEYXRhLHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWh0dHAnLHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmVtaXQoJ2Vycm9yLWh0dHAtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xuXG4vKipcbiAqIENoZWNrIGN1cnJlbnQgc3RhdHVzIGFuZCBjYWxsYmFjayBmb3IgcmVzdWx0cy5cbiAqIEl0IGNhY2hlcyByZXN1bHRzIGZvciBmdXJ0aGVyLlxuICogQHBhcmFtIGNhbGxiYWNrOiAoc3RhdHVzIG9iamVjdClcbiAqIEBwYXJhbSBmb3JjZTogYm9vbGVhbiBpZiB0cnVlIGVtcHRpZXMgY2FjaGUgIFxuICogQHJldHVybiB2b2lkXG4gKi9cbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5zdGF0dXMgPSBmdW5jdGlvbihjYWxsQmFjaywgZm9yY2UpIHtcbiAgICAvLyBpZiBmb3JjZSwgY2xlYXIgYWxsIGNhY2hlZCB2YWx1ZXNcbiAgICB2YXIga2V5ID0gJ3Rva2VuOicgKyB0aGlzLmVuZFBvaW50O1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIGlmIChmb3JjZSkge1xuICAgICAgICB0aGlzLmNhY2hlZFN0YXR1cyA9IHt9O1xuICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW2tleV07XG4gICAgfVxuICAgIGlmICh0aGlzLnN0YXR1c1dhaXRpbmcpIHtcbiAgICAgICAgLy8gd2FpdCBmb3Igc3RhdHVzXG4gICAgICAgIHV0aWxzLndhaXRGb3IoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gIXRocy5zdGF0dXNXYWl0aW5nO1xuICAgICAgICB9LCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhzLnN0YXR1cyhjYWxsQmFjayxmb3JjZSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIHRyeSBmb3IgdmFsdWUgcmVzb2x1dGlvblxuICAgIC8vIGZpcnN0IG9uIG1lbW9yeVxuICAgIGlmIChMYXp5KHRoaXMuY2FjaGVkU3RhdHVzKS5zaXplKCkpe1xuICAgICAgICBjYWxsQmFjayh0aGlzLmNhY2hlZFN0YXR1cylcbiAgICAvLyB0aGVuIGluIGxvY2FsU3RvcmFnZVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBkYXRhID0ge307XG4gICAgICAgIGlmIChrZXkgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICBkYXRhLl9fdG9rZW5fXyA9IGxvY2FsU3RvcmFnZVtrZXldO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhdHVzV2FpdGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuJHBvc3QoJ2FwaS9zdGF0dXMnLGRhdGEsIGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICB0aHMudXBkYXRlU3RhdHVzKHN0YXR1cyk7XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Vba2V5XSA9IHN0YXR1cy50b2tlbjtcbiAgICAgICAgICAgIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgICAgICAgICB0aHMuc3RhdHVzV2FpdGluZyA9IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gZG9lc24ndCBjYWxsIGNhbGxiYWNrXG4gICAgICAgIHJldHVyblxuICAgIH1cbiAgICBjYWxsQmFjayh0aGlzLmNhY2hlZFN0YXR1cyk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUudXBkYXRlU3RhdHVzID0gZnVuY3Rpb24oc3RhdHVzKXtcbiAgICB2YXIgbGFzdEJ1aWxkID0gcGFyc2VGbG9hdChsb2NhbFN0b3JhZ2UubGFzdEJ1aWxkKSB8fCAxO1xuICAgIGlmIChsYXN0QnVpbGQgPCBzdGF0dXMubGFzdF9idWlsZCl7XG4gICAgICAgIHV0aWxzLmNsZWFuRGVzY3JpcHRpb24oKTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLmxhc3RCdWlsZCA9IHN0YXR1cy5sYXN0X2J1aWxkO1xuICAgIH1cbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gQm9vbGVhbihzdGF0dXMudG9rZW4pO1xuICAgIHRoaXMuaXNMb2dnZWRJbiA9IEJvb2xlYW4oc3RhdHVzLnVzZXJfaWQpO1xuICAgIHZhciBvbGRTdGF0dXMgPSB0aGlzLmNhY2hlZFN0YXR1cztcbiAgICB0aGlzLmNhY2hlZFN0YXR1cyA9IHN0YXR1cztcbiAgICBpZiAoIW9sZFN0YXR1cy51c2VyX2lkICYmIHN0YXR1cy51c2VyX2lkKXtcbiAgICAgICAgdGhpcy5lbWl0KCdsb2dnZWQtaW4nLHN0YXR1cy51c2VyX2lkKTtcbiAgICB9IGVsc2UgaWYgKG9sZFN0YXR1cy51c2VyX2lkICYmICFzdGF0dXMudXNlcl9pZCl7XG4gICAgICAgIHRoaXMuZW1pdCgnbG9nZ2VkLW91dCcpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0Nvbm5lY3RlZCAmJiAhdGhpcy5pc0xvZ2dlZEluKXtcbiAgICAgICAgdGhpcy5lbWl0KCdsb2dpbi1yZXF1aXJlZCcpO1xuICAgICAgICBpZiAodGhpcy5nZXRMb2dpbil7XG4gICAgICAgICAgICB2YXIgbG9naW5JbmZvID0gdGhpcy5nZXRMb2dpbigpO1xuICAgICAgICAgICAgaWYgKGxvZ2luSW5mby5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KXtcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ2luKGxvZ2luSW5mby51c2VybmFtZSwgbG9naW5JbmZvLnBhc3N3b3JkLCBsb2dpbkluZm8uY2FsbEJhY2spO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsb2dpbkluZm8uY29uc3RydWN0b3IgPT09IFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICBsb2dpbkluZm8udGhlbihmdW5jdGlvbihvYmope1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ2luKG9iai51c2VybmFtZSwgb2JqLnBhc3N3b3JkLCBvYmouY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gcmVhbHRpbWUgY29ubmVjdGlvbiBpcyBzZXR0ZWRcbiAgICBpZiAoIW9sZFN0YXR1cy5yZWFsdGltZUVuZFBvaW50ICYmIHN0YXR1cy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgIHRoaXMud3NDb25uZWN0aW9uID0gbmV3IFJlYWx0aW1lQ29ubmVjdGlvbihzdGF0dXMucmVhbHRpbWVFbmRQb2ludCwgdGhpcyk7XG4gICAgLy8gcmVhbHRpbWUgY29ubmVjdGlvbiBpcyBjbG9zZWRcbiAgICB9IGVsc2UgaWYgKG9sZFN0YXR1cy5yZWFsdGltZUVuZFBvaW50ICYmICFzdGF0dXMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICB0aGlzLndzQ29ubmVjdGlvbi5jbG9zZSgpO1xuICAgICAgICBkZWxldGUgdGhpcy53c0Nvbm5lY3Rpb247XG4gICAgfVxuICAgIHRoaXMuZW1pdCgndXBkYXRlLWNvbm5lY3Rpb24tc3RhdHVzJywgc3RhdHVzLCBvbGRTdGF0dXMpO1xuICAgIGxvY2FsU3RvcmFnZVtTVEFUVVNLRVldID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbn1cblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICAvKipcbiAgICAgKiBtYWtlIGxvZ2luIGFuZCByZXR1cm4gYSBwcm9taXNlLiBJZiBsb2dpbiBzdWNjZWQsIHByb21pc2Ugd2lsbCBiZSBhY2NlcHRlZFxuICAgICAqIElmIGxvZ2luIGZhaWxzIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoIGVycm9yXG4gICAgICogQHBhcmFtIHVzZXJuYW1lOiB1c2VybmFtZVxuICAgICAqIEBwYXJhbSBwYXNzd29yZDogcGFzc3dvcmRcbiAgICAgKiBAcmV0dXJuIFByb21pc2UgKHVzZXIgb2JqZWN0KVxuICAgICAqL1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih0aHMuZW5kUG9pbnQgKyAnYXBpL2xvZ2luJywge3VzZXJuYW1lOiB1c2VybmFtZSB8fCAnJywgcGFzc3dvcmQ6IHBhc3N3b3JkIHx8ICcnfSxudWxsLHRocy5jYWNoZWRTdGF0dXMudG9rZW4sIHRydWUpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBzdGF0dXNcbiAgICAgICAgICAgICAgICB0aHMudXBkYXRlU3RhdHVzKHhoci5yZXNwb25zZURhdGEpO1xuICAgICAgICAgICAgICAgIC8vIGNhbGwgd2l0aCB1c2VyIGlkXG4gICAgICAgICAgICAgICAgYWNjZXB0KHtzdGF0dXMgOiAnc3VjY2VzcycsIHVzZXJpZDogdGhzLmNhY2hlZFN0YXR1cy51c2VyX2lkfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiBlcnJvciBjYWxsIGVycm9yIG1hbmFnZXIgd2l0aCBlcnJvclxuICAgICAgICAgICAgICAgIGFjY2VwdCh7ZXJyb3I6IHhoci5yZXNwb25zZURhdGEuZXJyb3IsIHN0YXR1czogJ2Vycm9yJ30pO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9nb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRocyA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3QpIHtcbiAgICAgICAgdGhzLiRwb3N0KCdhcGkvbG9nb3V0JylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKG9rKXtcbiAgICAgICAgICAgICAgICB0aHMudXBkYXRlU3RhdHVzKHt9KTtcbiAgICAgICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW1NUQVRVU0tFWV07XG4gICAgICAgICAgICAgICAgYWNjZXB0KClcbiAgICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKGNhbGxCYWNrKSB7XG4gICAgaWYgKHRoaXMuaXNMb2dnZWRJbikge1xuICAgICAgICBjYWxsQmFjayh0aGlzLmNhY2hlZFN0YXR1cy51c2VyX2lkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyB3YWl0IGZvciBsb2dpblxuICAgICAgICB0aGlzLm9uY2UoJ2xvZ2dlZC1pbicsZnVuY3Rpb24odXNlcl9pZCl7XG4gICAgICAgICAgICBjYWxsQmFjayh1c2VyX2lkKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc3RhdHVzKGNhbGxCYWNrIHx8IHV0aWxzLm5vb3ApO1xuICAgIH1cbn1cblxudXRpbHMucmVXaGVlbENvbm5lY3Rpb24gPSByZVdoZWVsQ29ubmVjdGlvbjsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFRvdWNoZXIoKXtcbiAgICB2YXIgdG91Y2hlZCA9IGZhbHNlXG4gICAgdGhpcy50b3VjaCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRvdWNoZWQgPSB0cnVlO1xuICAgIH07XG4gICAgdGhpcy50b3VjaGVkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHQgPSB0b3VjaGVkO1xuICAgICAgICB0b3VjaGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybiB0O1xuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuXG5mdW5jdGlvbiBWYWN1dW1DYWNoZXIodG91Y2gsIGFza2VkLCBuYW1lLCBwa0luZGV4KXtcbi8qXG4gICAgaWYgKG5hbWUpe1xuICAgICAgICBjb25zb2xlLmluZm8oJ2NyZWF0ZWQgVmFjdXVtQ2FjaGVyIGFzICcgKyBuYW1lKTtcbiAgICB9XG4qL1xuICAgIGlmICghYXNrZWQpe1xuICAgICAgICB2YXIgYXNrZWQgPSBbXTtcbiAgICB9XG4gICAgdmFyIG1pc3NpbmcgPSBbXTtcbiAgICBcbiAgICB0aGlzLmFzayA9IGZ1bmN0aW9uIChpZCxsYXp5KXtcbiAgICAgICAgaWYgKHBrSW5kZXggJiYgKGlkIGluIHBrSW5kZXguc291cmNlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghTGF6eShhc2tlZCkuY29udGFpbnMoaWQpKXtcbi8vICAgICAgICAgICAgY29uc29sZS5pbmZvKCdhc2tpbmcgKCcgKyBpZCArICcpIGZyb20gJyArIG5hbWUpO1xuICAgICAgICAgICAgbWlzc2luZy5wdXNoKGlkKTtcbiAgICAgICAgICAgIGlmICghbGF6eSlcbiAgICAgICAgICAgICAgICBhc2tlZC5wdXNoKGlkKTtcbiAgICAgICAgICAgIHRvdWNoLnRvdWNoKCk7XG4gICAgICAgIH0gXG4vLyAgICAgICAgZWxzZSBjb25zb2xlLndhcm4oJygnICsgaWQgKyAnKSB3YXMganVzdCBhc2tlZCBvbiAnICsgbmFtZSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0QXNrZWRJbmRleCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBhc2tlZDtcbiAgICB9XG5cbiAgICB0aGlzLm1pc3NpbmdzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIExhenkobWlzc2luZy5zcGxpY2UoMCxtaXNzaW5nLmxlbmd0aCkpLnVuaXF1ZSgpLnRvQXJyYXkoKTtcbiAgICB9XG59XG4iLCJmdW5jdGlvbiBBdXRvTGlua2VyKGFjdGl2ZXMsIElEQiwgVzJQUkVTT1VSQ0UsIGxpc3RDYWNoZSl7XG4gICAgdmFyIHRvdWNoID0gbmV3IFRvdWNoZXIoKTtcbiAgICB2YXIgbWFpbkluZGV4ID0ge307XG4gICAgdmFyIGZvcmVpZ25LZXlzID0ge307XG4gICAgdmFyIG0ybSA9IHt9O1xuICAgIHZhciBtMm1JbmRleCA9IHt9O1xuICAgIHZhciBwZXJtaXNzaW9ucyA9IHt9O1xuICAgIHRoaXMubWFpbkluZGV4ID0gbWFpbkluZGV4O1xuICAgIHRoaXMuZm9yZWlnbktleXMgPSBmb3JlaWduS2V5cztcbiAgICB0aGlzLm0ybSA9IG0ybTtcbiAgICB0aGlzLm0ybUluZGV4ID0gbTJtSW5kZXg7XG4gICAgdGhpcy5wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zO1xuLypcbiAgICB0aGlzLmdldE0ybUluZGV4ID0gZnVuY3Rpb24oaW5kZXhOYW1lLCByZWxhdGlvbikge1xuICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gbTJtSW5kZXgpKSB7XG4gICAgICAgICAgICBtMm1JbmRleFtpbmRleE5hbWVdID0gbmV3IE1hbnlUb01hbnlSZWxhdGlvbihyZWxhdGlvbixtMm1bcmVsYXRpb24uaW5kZXhOYW1lXSk7XG4gICAgICAgIH1cbiAgICB9XG4qL1xuICAgIFcyUFJFU09VUkNFLm9uKCdtb2RlbC1kZWZpbml0aW9uJyxmdW5jdGlvbihtb2RlbCwgaW5kZXgpe1xuICAgICAgICAvLyBkZWZpbmluZyBhbGwgaW5kZXhlcyBmb3IgcHJpbWFyeSBrZXlcbiAgICAgICAgdmFyIHBrSW5kZXggPSBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IobW9kZWwubmFtZSwgJ2lkJyk7XG4gICAgICAgIG1haW5JbmRleFttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIHBrSW5kZXgsICdtYWluSW5kZXguJyArIG1vZGVsLm5hbWUsIGluZGV4KTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0aW5nIHBlcm1pc3Npb24gaW5kZXhlc1xuICAgICAgICBwZXJtaXNzaW9uc1ttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwgJ3Blcm1pc3Npb25zLicgKyBtb2RlbC5uYW1lKTtcblxuICAgICAgICAvLyBjcmVhdGluZyBpbmRleGVzIGZvciBmb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uKHJlZmVyZW5jZSl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWwubmFtZSArICdfJyArIHJlZmVyZW5jZS5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IocmVmZXJlbmNlLnRvLCAnaWQnKSwgcmVmZXJlbmNlLnRvICsgJy5pZCBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGNyZWF0aW5nIHJldmVyc2UgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkO1xuICAgICAgICAgICAgZm9yZWlnbktleXNbaW5kZXhOYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIGxpc3RDYWNoZS5nZXRJbmRleEZvcihmaWVsZC5ieSxmaWVsZC5pZCksIGZpZWxkLmJ5ICsgJy4nICsgZmllbGQuaWQgKyAnIGZvcmVpZ25LZXlzLicgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtb2RlbC5tYW55VG9NYW55KS5lYWNoKGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm0pKVxuICAgICAgICAgICAgICAgIG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdID0gW25ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUgKyAnWzBdJyksIG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUrJ1sxXScpXTtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm1JbmRleCkpXG4gICAgICAgICAgICAgICAgbTJtSW5kZXhbcmVsYXRpb24uaW5kZXhOYW1lXSA9IG5ldyBNYW55VG9NYW55UmVsYXRpb24ocmVsYXRpb24sbTJtW3JlbGF0aW9uLmluZGV4TmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgbTJtR2V0ID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayl7XG4gICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KChuID8gdXRpbHMucmV2ZXJzZSgnLycsIGluZGV4TmFtZSkgOiBpbmRleE5hbWUpICsgJ3MnICsgJy9saXN0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgZGVsZXRlIGFjdGl2ZXNbaW5kZXhOYW1lXVxuICAgICAgICB9KTsgICAgICAgIFxuICAgIH07XG5cbiAgICB2YXIgZ2V0TTJNID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBjb2xsZWN0aW9uLCBuLCBjYWxsQmFjayl7XG4gICAgICAgIC8vIGFzayBhbGwgaXRlbXMgaW4gY29sbGVjdGlvbiB0byBtMm0gaW5kZXhcbiAgICAgICAgTGF6eShjb2xsZWN0aW9uKS5lYWNoKG0ybVtpbmRleE5hbWVdW25dLmFzay5iaW5kKG0ybVtpbmRleE5hbWVdW25dKSk7XG4gICAgICAgIC8vIHJlbmV3aW5nIGNvbGxlY3Rpb24gd2l0aG91dCBhc2tlZFxuICAgICAgICBjb2xsZWN0aW9uID0gbTJtW2luZGV4TmFtZV1bbl0ubWlzc2luZ3MoKTtcbiAgICAgICAgLy8gY2FsbGluZyByZW1vdGUgZm9yIG0ybSBjb2xsZWN0aW9uIGlmIGFueVxuICAgICAgICBpZiAoY29sbGVjdGlvbi5sZW5ndGgpe1xuICAgICAgICAgICAgYWN0aXZlc1tpbmRleE5hbWVdID0gMTtcbiAgICAgICAgICAgIG0ybUdldChpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGNhbGxCYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuZ2V0TTJNID0gZ2V0TTJNO1xuXG4gICAgdmFyIGxpbmtVbmxpbmtlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIHBlcmZvcm0gYSBEYXRhQmFzZSBzeW5jaHJvbml6YXRpb24gd2l0aCBzZXJ2ZXIgbG9va2luZyBmb3IgdW5rbm93biBkYXRhXG4gICAgICAgIGlmICghdG91Y2gudG91Y2hlZCgpKSByZXR1cm47XG4gICAgICAgIGlmIChMYXp5KGFjdGl2ZXMpLnZhbHVlcygpLnN1bSgpKSB7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGluZGV4ZXMsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICBMYXp5KGluZGV4ZXMpLmVhY2goZnVuY3Rpb24gKGluZGV4LG4pIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IGluZGV4Lm1pc3NpbmdzKCk7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IExhenkoY29sbGVjdGlvbikuZmlsdGVyKEJvb2xlYW4pLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIElOREVYID0gbTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdldHRlciA9IElOREVYWydnZXQnICsgKDEgLSBuKV0uYmluZChJTkRFWCk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBjb2xsZWN0aW9uLm1hcChnZXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvdGhlckluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcvJylbMSAtIG5dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG90aGVySW5kZXgsZnVuY3Rpb24oKXtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2gobWFpbkluZGV4W290aGVySW5kZXhdLmFzayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoaWRzKS5mbGF0dGVuKCkudW5pcXVlKCkuZWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1haW5JbmRleFtvdGhlckluZGV4XS5hc2soeCx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtYWluSW5kZXgpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIHZhciBpZHMgPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgaWRiID0gbW9kZWxOYW1lIGluIElEQiA/IElEQlttb2RlbE5hbWVdLmtleXMoKSA6IExhenkoKTtcbiAgICAgICAgICAgICAgICAvL2xvZygnbGlua2luZy4nICsgbW9kZWxOYW1lICsgJyA9ICcgKyBXMlBSRVNPVVJDRS5saW5raW5nLnNvdXJjZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIHtpZDogaWRzfSxudWxsLHV0aWxzLm5vb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gRm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkoZm9yZWlnbktleXMpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICAgICAgICByZXR1cm4gdlsxXS5sZW5ndGhcbiAgICAgICAgfSkuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICB2YXIgaWRzID0geFsxXTtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSB4WzBdO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgbWFpblJlc291cmNlID0gaW5kZXhbMF07XG4gICAgICAgICAgICB2YXIgZmllbGROYW1lID0gaW5kZXhbMV07XG4gICAgICAgICAgICB2YXIgZmlsdGVyID0ge307XG4gICAgICAgICAgICBmaWx0ZXJbZmllbGROYW1lXSA9IGlkcztcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1haW5SZXNvdXJjZSwgZmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBMYXp5KExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgcmV0dXJuIFtrLCB2Lm1pc3NpbmdzKCldXG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLnRvT2JqZWN0KCkpLmVhY2goZnVuY3Rpb24gKGlkcywgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICBhY3RpdmVzW3Jlc291cmNlTmFtZV0gPSAxO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHJlc291cmNlTmFtZSArICcvbXlfcGVybXMnLCB7aWRzOiBMYXp5KGlkcykudW5pcXVlKCkudG9BcnJheSgpfSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoZGF0YS5QRVJNSVNTSU9OUyk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW3Jlc291cmNlTmFtZV1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHNldEludGVydmFsKGxpbmtVbmxpbmtlZCw1MCk7XG59O1xuXG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBMaXN0Q2FjaGVyKCl7XG4gICAgdmFyIGdvdEFsbCA9IHt9O1xuICAgIHZhciBhc2tlZCA9IHt9OyAvLyBtYXAgb2YgYXJyYXlcbiAgICB2YXIgY29tcG9zaXRlQXNrZWQgPSB7fTtcbiAgICB2YXIgdHJhY2VycyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gZ2V0VHJhY2VyKG1vZGVsTmFtZSkge1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gdHJhY2VycykpIHtcbiAgICAgICAgICAgIHRyYWNlcnNbbW9kZWxOYW1lXSA9IG5ldyBGaWx0ZXJUcmFjZXIoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJhY2Vyc1ttb2RlbE5hbWVdO1xuICAgIH1cblxuICAgIHRoaXMuZmlsdGVyID0gZnVuY3Rpb24obW9kZWwsIGZpbHRlcil7XG4vLyAgICAgICAgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tLVxcbmZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpKTtcbiAgICAgICAgdmFyIG1vZGVsTmFtZSA9IG1vZGVsLm1vZGVsTmFtZTtcblxuICAgICAgICAvLyBpZiB5b3UgZmV0Y2ggYWxsIG9iamVjdHMgZnJvbSBzZXJ2ZXIsIHRoaXMgbW9kZWwgaGFzIHRvIGJlIG1hcmtlZCBhcyBnb3QgYWxsO1xuICAgICAgICB2YXIgZ290ID0gZ290QWxsW21vZGVsTmFtZV07XG4gICAgICAgIGlmIChnb3QpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHZhciBmaWx0ZXJMZW4gID0gXy5zaXplKGZpbHRlcik7XG4gICAgICAgIGlmIChmaWx0ZXJMZW4gPT09IDApe1xuICAgICAgICAgICAgZ290QWxsW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBhc2tlZCl7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGFza2VkW21vZGVsTmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJldCA9IGdldFRyYWNlcihtb2RlbE5hbWUpLmdldEZpbHRlcnMoZmlsdGVyKTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRJbmRleEZvciA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmllbGROYW1lKXtcbiAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsTmFtZSArICcuJyArIGZpZWxkTmFtZTtcbiAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIGFza2VkKSl7XG4gICAgICAgICAgICBhc2tlZFtpbmRleE5hbWVdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFza2VkW2luZGV4TmFtZV07XG4gICAgfVxufTtcblxuZnVuY3Rpb24gRmlsdGVyVHJhY2VyKCkge1xuICAgIC8qKlxuICAgICogIGFza2VkIGZpbHRlciBzdG9yYWdlXG4gICAgKiAgeyA8cGlwZSBzZXBhcmF0ZWQgYXNrZWQgZmllbGRzPiA6IDxhcnJheSBvZiBhcnJheSBvZiBhc2tlZCB2YWx1ZXM+IH1cbiAgICAqL1xuICAgIHRoaXMuZXhwbG9kZWRGaWx0ZXJzID0ge2lkOiBbXX07IFxuICAgIHRoaXMuYXNrZWRGaWx0ZXJzID0gW107XG59XG5cbi8qKlxuKiBwcmVwYXJlIGEgZmlsdGVyIHRvIGJlIGZldGNoZWRcbiogQHBhcmFtIGZpbHRlcjogZmlsdGVyIHRvIGFkZFxuKi9cbkZpbHRlclRyYWNlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgdGhpcy5hc2tlZEZpbHRlcnMucHVzaChmaWx0ZXIpO1xufVxuXG5cbi8qKlxuKiBFeHBsb2RlIGZpbHRlciBpbiBzaW5nbGUgZWxlbWVudCBmaWx0ZXJcbiogQHBhcmFtIGZpbHRlciBjb21wbGV4IGZpbHRlclxuKiBAcmV0dXJuIGxpc3RvIG9mIHNpbmdsZSBlbGVtZW50IGZpbHRlclxuKi9cblxuRmlsdGVyVHJhY2VyLnByb3RvdHlwZS5leHBsb2RlID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIC8vIGtleSBhbmQgdmFsdWVzIHNwbGl0XG4gICAgXy5mb3JJbihmaWx0ZXIsIGZ1bmN0aW9uKHYsayl7XG4gICAgICAgIGtleXMucHVzaChrKTsgXG4gICAgICAgIHZhbHVlcy5wdXNoKHYpO1xuICAgIH0pO1xuICAgIHZhciB2YWxzID0gQ29tYmluYXRvcmljcy5jYXJ0ZXNpYW5Qcm9kdWN0LmFwcGx5KHRoaXMsIHZhbHVlcyk7XG4gICAgcmV0dXJuIHZhbHMudG9BcnJheSgpOyAvLyB2YWxzLm1hcChfLnBhcnRpYWwoXy56aXBPYmplY3QsIGtleXMpKTsgICAgICAgIFxufVxuXG4vKipcbiogUmVkdWNlIGEgZmlsdGVyIGV4Y2x1ZGluZyBwcmV2aW91c2x5IGNhbGxlZCBmaWx0ZXJcbiogQSBmaWx0ZXIgaXMgYW4gb2JqZWN0IGxpa2Ugd2hlcmUga2V5cyBhcmUgZmllbGRzIGFuZCB2YWx1ZXMgXG4qIGFyZSBhcnJheSBvZiB2YWx1ZXNcbiogQHBhcmFtIGZpbHRlciBmaWx0ZXJcbiogQHJldHVybiBhIG5ldyBmaWx0ZXIgb3IgbnVsbCBpZiBub3RoaW5nIGhhcyB0byBiZSBhc2tlZFxuKi9cbkZpbHRlclRyYWNlci5wcm90b3R5cGUuZ2V0RmlsdGVycyA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKGZpbHRlcikuc29ydCgpO1xuICAgIHZhciBrZXlzS2V5ID0gXy5qb2luKGtleXMsICd8Jyk7XG4gICAgdmFyIGV4cGxvZGVkID0gdGhpcy5leHBsb2RlKGZpbHRlcik7XG4gICAgdmFyIGtleXNldCA9IF8ua2V5cyh0aGlzLmV4cGxvZGVkRmlsdGVycyk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIFxuICAgIC8vIGNsb25pbmcgb3JpZ2luYWwgZXhwbG9kZWRcbiAgICB2YXIgb3JpZ2luYWxFeHBsb2RlZCA9IGV4cGxvZGVkLnNsaWNlKDApO1xuICAgIFxuICAgIGlmICghKGtleXNLZXkgaW4gdGhpcy5leHBsb2RlZEZpbHRlcnMpKSB7XG4gICAgICAgIHRoaXMuZXhwbG9kZWRGaWx0ZXJzW2tleXNLZXldID0gW107XG4gICAgfVxuICAgIFxuICAgIGlmIChrZXlzZXQubGVuZ3RoKSB7XG4gICAgICAgIC8vIGdldHRpbmcgYWxsIHN1YnNldHNcbiAgICAgICAgdmFyIHN1YnNldHMgPSBfLmludGVyc2VjdGlvbihrZXlzZXQsIENvbWJpbmF0b3JpY3MucG93ZXIoa2V5cyxmdW5jdGlvbih4KSB7IFxuICAgICAgICAgICAgcmV0dXJuIHguam9pbignfCcpfVxuICAgICAgICApLnNsaWNlKDEpKTtcbiAgICAgICAgLy8gcmVtb3Zpbmcgcm93cyBmcm9tIGZvdW5kIHN1YnNldHNcbiAgICAgICAgc3Vic2V0cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSwgaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBra2V5cyA9IF8uc3BsaXQoa2V5LCd8Jyk7XG4gICAgICAgICAgICB2YXIgY29tcGF0aWJsZUV4cGxvZGVkID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBmcm9tSW5kZXggPSBra2V5cy5tYXAoXy5wYXJ0aWFsKF8uaW5kZXhPZixrZXlzKSk7XG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm1pbmcgZXhwbG9kZWQgdG8gc3Vic2V0IGV4cGxvZGVkXG4gICAgICAgICAgICBpZiAoa2V5ICE9PSBrZXlzS2V5KSB7XG4gICAgICAgICAgICAgICAgY29tcGF0aWJsZUV4cGxvZGVkID0gXy51bmlxV2l0aChleHBsb2RlZC5tYXAoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gZnJvbUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXQucHVzaCh4W2Zyb21JbmRleFtpXV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgfSksXy5pZGVudGl0eSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbXBhdGlibGVFeHBsb2RlZCA9IGV4cGxvZGVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHRvUmVtb3ZlID0gXy5pbnRlcnNlY3Rpb25CeShzZWxmLmV4cGxvZGVkRmlsdGVyc1trZXldLGNvbXBhdGlibGVFeHBsb2RlZCwgSlNPTi5zdHJpbmdpZnkpO1xuICAgICAgICAgICAgaWYgKHRvUmVtb3ZlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3JlbW92ZSAnICsgdG9SZW1vdmUpO1xuICAgICAgICAgICAgICAgIHRvUmVtb3ZlLmZvckVhY2goZnVuY3Rpb24oeSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXhwbG9kZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmYgPSBuZXcgRnVuY3Rpb24oJ3gnLCAncmV0dXJuICcgKyBmcm9tSW5kZXgubWFwKGZ1bmN0aW9uKGksbil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcoeFsnICsgaSArICddID09PSAnICsgeVtuXSArICcpJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJyAmJiAnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLnJlbW92ZShleHBsb2RlZCwgcmYpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBsb29raW5nIGZvciBwcmV2aW91c2x5IGFza2VkIGtleSBzdWJzZXRcbiAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseSh0aGlzLmV4cGxvZGVkRmlsdGVyc1trZXlzS2V5XSwgZXhwbG9kZWQpO1xuICAgIFxuICAgIC8vIGNsZWFuaW5nIHN1cGVyc2V0c1xuICAgIHZhciBzdXBlcnNldHMgPSBrZXlzZXRcbiAgICAgICAgLm1hcChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICByZXR1cm4geC5zcGxpdCgnfCcpO1xuICAgICAgICB9KVxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBfLmV2ZXJ5KGtleXMsIGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXy5pbmNsdWRlcyh4LHYpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgcmV0dXJuICFfLmlzRXF1YWwoeCwga2V5cyk7XG4gICAgICAgIH0pO1xuICAgIGlmIChzdXBlcnNldHMubGVuZ3RoKSB7XG4gICAgICAgIC8vIHJlbW92aW5nIGFsbCB2YWx1ZXMgZnJvbSBzdXBlcnNldHNcbiAgICAgICAgc3VwZXJzZXRzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICB2YXIgb2xkVmFsdWVzID0gc2VsZi5leHBsb2RlZEZpbHRlcnNba2V5LmpvaW4oJ3wnKV07XG4gICAgICAgICAgICB2YXIgZnJvbUluZGV4ID0ga2V5cy5tYXAoXy5wYXJ0aWFsKF8uaW5kZXhPZixrZXkpKTtcbiAgICAgICAgICAgIGV4cGxvZGVkLmZvckVhY2goZnVuY3Rpb24oeSkge1xuICAgICAgICAgICAgICAgIHZhciByZiA9IG5ldyBGdW5jdGlvbigneCcsICdyZXR1cm4gJyArIGZyb21JbmRleC5tYXAoZnVuY3Rpb24oaSxuKSB7IFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJyh4WycgKyBpICArICddID09PSAnICsgeVtuXSArICcpJyBcbiAgICAgICAgICAgICAgICB9KS5qb2luKCcgJiYgJykpO1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ29sZCByZW1vdmUgZnJvbSAnICsga2V5ICsgJyA9PiAnICsgb2xkVmFsdWVzLmZpbHRlcihyZikuanNvbik7XG4gICAgICAgICAgICAgICAgXy5yZW1vdmUob2xkVmFsdWVzLCByZik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gZnVzaW5nIHJlc3VsdCBmaWx0ZXJcbiAgICByZXR1cm4gdGhpcy5pbXBsb2RlKGV4cGxvZGVkLGtleXMpO1xufTtcblxuRmlsdGVyVHJhY2VyLnByb3RvdHlwZS5pbXBsb2RlID0gZnVuY3Rpb24gKGV4cGxvZGVkLCBrZXlzKSB7XG4gICAgaWYgKCFleHBsb2RlZC5sZW5ndGgpIHsgcmV0dXJuIG51bGw7IH1cbiAgICByZXR1cm4gXy56aXBPYmplY3Qoa2V5cyxfLnVuemlwKGV4cGxvZGVkKS5tYXAoXy51bmlxKSk7XG59XG5cblxuXG4vKlxudGhpcyB3YXMgcGFydCBvZiBsaXN0Q2FjaGUuZmlsdGVyIG1ldGhvZFxuICAgICAgICBzd2l0Y2ggKGZpbHRlckxlbikge1xuICAgICAgICAgICAgY2FzZSAwIDoge1xuICAgICAgICAgICAgICAgIC8vIHJldHVybiBudWxsIG9yIGFsbFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGdvdEFsbFttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGFza2VkKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGFza2VkW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ291dCA6IG51bGwgKGdvdCBhbGwpJyk7XG4gICAgICAgICAgICAgICAgLy8gY29uZGl0aW9uYWwgY2xlYW5cbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGNvbXBvc2l0ZUFza2VkKXsgXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZ290KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIDEgOiB7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IGZpbHRlclNpbmdsZS5jYWxsKHRoaXMsIG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgICAgIGNsZWFuQ29tcG9zaXRlcy5jYWxsKHRoaXMsIG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHZhciBzaW5nbGUgPSBMYXp5KGZpbHRlcikua2V5cygpLnNvbWUoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICB2YXIgZiA9IHt9O1xuICAgICAgICAgICAgZltrZXldID0gZmlsdGVyW2tleV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyU2luZ2xlLmNhbGwodGhzLCBtb2RlbCwgZiwgdHJ1ZSkgPT0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChzaW5nbGUpIHsgcmV0dXJuIG51bGwgfVxuICAgICAgICAvLyBsYXp5IGNyZWF0ZSBjb21wb3NpdGVBc2tlZFxuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gY29tcG9zaXRlQXNrZWQpKXsgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXSA9IFtdOyB9XG4gICAgICAgIC8vIGV4cGxvZGUgZmlsdGVyXG4gICAgICAgIHZhciBleHBsb2RlZCA9IGV4cGxvZGVGaWx0ZXIoZmlsdGVyKTtcbiAgICAgICAgLy8gY29sbGVjdCBwYXJ0aWFsc1xuICAgICAgICB2YXIgcGFydGlhbHMgPSBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIsICcgfHwgJyx0cnVlKSk7XG4gICAgICAgIC8vIGNvbGxlY3QgbWlzc2luZ3MgKGV4cGxvZGVkIC0gcGFydGlhbHMpXG4gICAgICAgIGlmIChwYXJ0aWFscy5sZW5ndGgpe1xuICAgICAgICAgICAgdmFyIGJhZCAgPSBbXTtcbiAgICAgICAgICAgIC8vIHBhcnRpYWwgZGlmZmVyZW5jZVxuICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBwYXJ0aWFscyl7XG4gICAgICAgICAgICAgICAgYmFkLnB1c2guYXBwbHkoYmFkLGV4cGxvZGVkLmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBwYXJ0aWFsc1t4XSwnICYmICcsIHRydWUpKSk7XG4gICAgICAgICAgICB9XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKCdleHBsb2RlZCAtIHBhcnRpYWwgOiAnICsgSlNPTi5zdHJpbmdpZnkoYmFkKSk7XG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBMYXp5KGV4cGxvZGVkKS5kaWZmZXJlbmNlKGJhZCkudG9BcnJheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gZXhwbG9kZWQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmaWx0ZXIgcGFydGlhbHNcbiAgICAgICAgaWYgKG1pc3NpbmdzLmxlbmd0aCl7XG4gICAgICAgICAgICBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLnB1c2guYXBwbHkoY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXSxtaXNzaW5ncyk7XG4gICAgICAgICAgICAvLyBhZ2dyZWdhdGUgbWlzc2luZ3NcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IExhenkoZmlsdGVyKS5rZXlzKCkubWFwKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IExhenkobWlzc2luZ3MpLnBsdWNrKGtleSkudW5pcXVlKCkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBba2V5LCByZXQubGVuZ3RoP3JldDpmaWx0ZXJba2V5XV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuLy8gICAgICAgICAgICBjb25zb2xlLmxvZygnb3V0IDogJyArIEpTT04uc3RyaW5naWZ5KG1pc3NpbmdzKSk7XG4gICAgICAgICAgICAvLyBjbGVhbiBjb25kaXRpb25hbFxuICAgICAgICAgICAgY2xlYW5Db21wb3NpdGVzKG1vZGVsLCBtaXNzaW5ncyk7XG4gICAgICAgICAgICByZXR1cm4gbWlzc2luZ3M7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4qL1xuXG4vKlxuICAgIHZhciBjYXJ0ZXNpYW5Qcm9kdWN0MSA9IGZ1bmN0aW9uKHgseSxpc0FycmF5KXtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBpZiAoaXNBcnJheSkge1xuICAgICAgICAgICAgZm9yICh2YXIgYSBpbiB4KXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBiIGluIHkpe1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChMYXp5KFt4W2FdLHlbYl1dKS5mbGF0dGVuKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhIGluIHgpe1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGIgaW4geSl7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKFt4W2FdLHlbYl1dKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIHZhciBjYXJ0ZXNpYW5Qcm9kdWN0ID0gZnVuY3Rpb24oYXJyKXtcbiAgICAgICAgdmFyIGlzQXJyYXkgPSBmYWxzZTtcbiAgICAgICAgdmFyIHJldCA9IGFyclswXTsgXG4gICAgICAgIGZvciAodmFyIHggPSAxOyB4IDwgYXJyLmxlbmd0aDsgKyt4KXtcbiAgICAgICAgICAgIHJldCA9IGNhcnRlc2lhblByb2R1Y3QxKHJldCwgYXJyW3hdLCBpc0FycmF5KTtcbiAgICAgICAgICAgIGlzQXJyYXkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICAgIHZhciBleHBsb2RlRmlsdGVyID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgICAgIHZhciBwcm9kdWN0ID0gY2FydGVzaWFuUHJvZHVjdChMYXp5KGZpbHRlcikudmFsdWVzKCkudG9BcnJheSgpKTtcbiAgICAgICAgdmFyIGtleXMgPSBMYXp5KGZpbHRlcikua2V5cygpLnRvQXJyYXkoKTtcbiAgICAgICAgcmV0dXJuIHByb2R1Y3QubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFyIHIgPSB7fTtcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihhLG4pe1xuICAgICAgICAgICAgICAgIHJbYV0gPSB4W25dO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIGZpbHRlclNpbmdsZSA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIsIHRlc3RPbmx5KXtcbiAgICAgICAgLy8gTGF6eSBhdXRvIGNyZWF0ZSBpbmRleGVzXG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG4gICAgICAgIHZhciBnZXRJbmRleEZvciA9IHRoaXMuZ2V0SW5kZXhGb3I7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2LGtleSl7IHJldHVybiBba2V5LCBtb2RlbE5hbWUgKyAnLicgKyBrZXldOyB9KS50b09iamVjdCgpO1xuICAgICAgICB2YXIgaW5kZXhlcyA9IExhenkoZmlsdGVyKS5rZXlzKCkubWFwKGZ1bmN0aW9uKGtleSl7IHJldHVybiBba2V5LCBnZXRJbmRleEZvcihtb2RlbE5hbWUsIGtleSldfSkudG9PYmplY3QoKTsgXG4gICAgICAgIC8vIGZha2UgZm9yIChpdCB3aWxsIGN5Y2xlIG9uY2UpXG4gICAgICAgIGZvciAodmFyIHggaW4gZmlsdGVyKXtcbiAgICAgICAgICAgIC8vIGdldCBhc2tlZCBpbmRleCBhbmQgY2hlY2sgcHJlc2VuY2VcbiAgICAgICAgICAgIHZhciBkaWZmZXJlbmNlID0gTGF6eShmaWx0ZXJbeF0pLmRpZmZlcmVuY2UoaW5kZXhlc1t4XSkudG9BcnJheSgpO1xuICAgICAgICAgICAgaWYgKGRpZmZlcmVuY2UubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAvLyBnZW5lcmF0ZSBuZXcgZmlsdGVyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IExhenkoW1t4LCBkaWZmZXJlbmNlXV0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgLy8gcmVtZW1iZXIgYXNrZWRcbiAgICAgICAgICAgICAgICBpZiAoIXRlc3RPbmx5KVxuICAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShpbmRleGVzW3hdLCBkaWZmZXJlbmNlKTtcbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUgZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikgKyAnXFxuT3V0IDonICsgSlNPTi5zdHJpbmdpZnkocmV0KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6IG51bGwnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY2xlYW5Db21wb3NpdGVzID0gZnVuY3Rpb24obW9kZWwsZmlsdGVyKXtcbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29uZGl0aW9uYWwgYXNrZWQgaW5kZXhcbiAgICAgICAgaWYgKCEobW9kZWwubmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpIHsgY29tcG9zaXRlQXNrZWRbbW9kZWwubmFtZV0gPSBbXSB9O1xuICAgICAgICB2YXIgaW5kZXggPSBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXTtcbiAgICAgICAgLy8gc2VhcmNoIGZvciBhbGwgZWxlbWVudHMgd2hvIGhhdmUgc2FtZSBwYXJ0aWFsXG4gICAgICAgIHZhciBmaWx0ZXJMZW4gPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICB2YXIgaXRlbXMgPSBpbmRleC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnICYmICcsdHJ1ZSkpLmZpbHRlcihmdW5jdGlvbihpdGVtKXsgTGF6eShpdGVtKS5zaXplKCkgPiBmaWx0ZXJMZW4gfSk7XG4vLyAgICAgICAgY29uc29sZS5sb2coJ2RlbGV0aW5nIDonICsgSlNPTi5zdHJpbmdpZnkoaXRlbXMpKTtcbiAgICB9O1xuXG4qLyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybSl7XG4gICAgdmFyIGl0ZW1zID0gW107XG4gICAgdGhpcy5hZGQgPSBpdGVtcy5wdXNoLmJpbmQoaXRlbXMpO1xuICAgIHRoaXMuYWRkID0gZnVuY3Rpb24oaXRlbSl7XG4gIC8vICAgICAgY29uc29sZS5sb2coJ2FkZGluZyAnICsgaXRlbSk7XG4gICAgICAgIGlmICghKExhenkoaXRlbXMpLmZpbmQoaXRlbSkpKXtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmdldDAgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVsxXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjFcIikudG9BcnJheSgpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldDEgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVswXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMV0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjBcIikudG9BcnJheSgpO1xuICAgIH07XG4gICAgdGhpc1snZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVsYXRpb24uaW5kZXhOYW1lLnNwbGl0KCcvJylbMV0pXSA9IHRoaXMuZ2V0MTtcbiAgICB0aGlzWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWxhdGlvbi5pbmRleE5hbWUuc3BsaXQoJy8nKVswXSldID0gdGhpcy5nZXQwO1xuXG4gICAgdGhpcy5kZWwgPSBmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgdmFyIGwgPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgIHZhciBpZHggPSBudWxsO1xuICAgICAgICBmb3IgKHZhciBhID0gMDsgYSA8IGw7IGErKyl7IFxuICAgICAgICAgICAgaWYgKChpdGVtc1thXVswXSA9PT0gaXRlbVswXSkgJiYgKGl0ZW1zW2FdWzFdID09PSBpdGVtWzFdKSl7XG4gICAgICAgICAgICAgICAgaWR4ID0gYTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaWR4KXtcbiAgICAgICAgICAgIGl0ZW1zLnNwbGljZShhLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgJywgaXRlbSk7XG4gICAgfTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGNhY2hlZFByb3BlcnR5QnlFdmVudHMocHJvdG8sIHByb3BlcnR5TmFtZSxnZXR0ZXIsIHNldHRlcil7XG4gICAgdmFyIGV2ZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyw0KTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgXG4gICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICBwcm90by5vcm0ub24oZXZlbnQsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJlc3VsdCA9IHt9O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgcHJvcGVydHlEZWYgPSB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gY2FjaGVkKCl7XG4vLyAgICAgICAgICAgIHJldHVybiBnZXR0ZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIGlmICghKHRoaXMuaWQgaW4gcmVzdWx0KSl7XG4gICAgICAgICAgICAgICAgcmVzdWx0W3RoaXMuaWRdID0gZ2V0dGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpZiAoc2V0dGVyKXtcbiAgICAgICAgcHJvcGVydHlEZWZbJ3NldCddID0gZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgaWYgKCFpc0Zpbml0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCBpbiByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICBpZiAodmFsdWUgIT09IHJlc3VsdFt0aGlzLmlkXSl7XG4gICAgICAgICAgICAgICAgc2V0dGVyLmNhbGwodGhpcyx2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaWQgaW4gcmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIHByb3BlcnR5TmFtZSxwcm9wZXJ0eURlZik7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIExhenlMaW5rZXIoYWN0aXZlcywgSURCLCBvcm0sIGxpc3RDYWNoZSkge1xuICAgIHZhciB1bnNvbHZlZEZpbHRlcnMgPSB7fTtcbiAgICB0aGlzLnJlc29sdmUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGZpbHRlcikge1xuICAgICAgICB1bnNvbHZlZF9maWx0ZXJzLnB1c2goZmlsdGVyKTtcbiAgICB9O1xuICAgIFxuICAgIGZ1bmN0aW9uIG1lcmdlRmlsdGVycygpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBtb2RlbE5hbWUgaW4gdW5zb2x2ZWRGaWx0ZXJzKSB7XG4gICAgICAgICAgICB1bnNvbHZlZEZpbHRlcnNbbW9kZWxOYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIENvbGxlY3Rpb24ob3JtLCBtb2RlbE5hbWUsIGZpbHRlciwgcGFydGlhbCwgb3JkZXJieSwgaXBwKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBmaWx0ZXJGdW5jdGlvbiA9IG51bGw7XG4gICAgdmFyIHVwZGF0ZURhdGEgPSBuZXcgSGFuZGxlcigpO1xuICAgIHZhciBwYWdlID0gMTtcbiAgICB2YXIgJG9ybSA9IG9ybS4kb3JtO1xuICAgIHRoaXMudXBkYXRlRGF0YSA9IHVwZGF0ZURhdGEuYWRkSGFuZGxlci5iaW5kKHVwZGF0ZURhdGEpO1xuICAgIHRoaXMuaXRlbXMgPSBbXTtcbi8vICAgIHRoaXMuZm9yRWFjaCA9IHRoaXMuaXRlbXMuZm9yRWFjaC5iaW5kKHRoaXMuaXRlbXMpO1xuICAgICRvcm0uZGVzY3JpYmUobW9kZWxOYW1lLCBmdW5jdGlvbihNb2RlbCl7XG4gICAgICAgIHNlbGYubW9kZWwgPSBNb2RlbDtcbiAgICAgICAgZmlsdGVyRnVuY3Rpb24gPSB1dGlscy5tYWtlRmlsdGVyKE1vZGVsLCBmaWx0ZXIpO1xuICAgIH0pO1xuICAgIHRoaXMubW9kZWxOYW1lID0gbW9kZWxOYW1lO1xuICAgIHRoaXMuaW5pdGlhbEZpbHRlciA9IGZpbHRlclxuICAgIHRoaXMucGFydGlhbCA9IHBhcnRpYWwgfHwgZmFsc2U7XG5cblxuICAgIHZhciB1cGRhdGVWYWx1ZXMgPSBmdW5jdGlvbihuZXdJdGVtcykge1xuICAgICAgICBpZiAob3JkZXJieSkge1xuICAgICAgICAgICAgbmV3SXRlbXMgPSBfLm9yZGVyYnkobmV3SXRlbXMsIF8ua2V5cyhvcmRlcmJ5KSwgXy52YWx1ZXMob3JkZXJieSkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpcHApIHtcbiAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgICAgIHNlbGYuZm9yRWFjaCA9IHNlbGYuaXRlbXMuZm9yRWFjaC5iaW5kKHNlbGYuaXRlbXMpO1xuICAgIH07XG5cbiAgICAkb3JtLnF1ZXJ5KG1vZGVsTmFtZSwgZmlsdGVyLCBudWxsLCBmdW5jdGlvbihpdGVtcyl7XG4gICAgICAgIHNlbGYuaXRlbXMgPSBpdGVtcztcbiAgICB9KTtcblxuICAgIG9ybS5vbigndXBkYXRlZC0nICsgbW9kZWxOYW1lLCBmdW5jdGlvbihpdGVtcykge1xuICAgICAgICBjb25zb2xlLndhcm4oJ2NvbGxlY3Rpb24gdXBkYXRlICcgKyBtb2RlbE5hbWUsIGl0ZW1zKTtcbiAgICB9KTtcblxuICAgIG9ybS5vbignbmV3LScgKyBtb2RlbE5hbWUsIGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignY29sbGVjdGlvbiBuZXcgJyArIG1vZGVsTmFtZSwgaXRlbXMpO1xuICAgICAgICBpdGVtcyA9IGl0ZW1zLnRvQXJyYXkoKTtcbiAgICAgICAgc2VsZi5pdGVtcyA9IF8udW5pb24oc2VsZi5pdGVtcywgaXRlbXMuZmlsdGVyKGZpbHRlckZ1bmN0aW9uKSk7XG4gICAgICAgIHVwZGF0ZURhdGEuaGFuZGxlKHNlbGYpO1xuICAgIH0pO1xuXG4gICAgb3JtLm9uKCdkZWxldGVkLScgKyBtb2RlbE5hbWUsIGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignY29sbGVjdGlvbiBkZWxldGUgJyArIG1vZGVsTmFtZSwgaXRlbXMpO1xuICAgIH0pO1xufTtcblxuQ29sbGVjdGlvbi5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIChmKSB7XG4gICAgcmV0dXJuIHRoaXMuaXRlbXMuZm9yRWFjaChmKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvcihkYXRhKXtcbiAgICB0aGlzLnJlc291cmNlID0gZGF0YS5fcmVzb3VyY2U7XG4gICAgdGhpcy5mb3JtSWR4ID0gZGF0YS5mb3JtSWR4O1xuICAgIHRoaXMuZmllbGRzID0gZGF0YS5lcnJvcnM7XG59XG52YXIgYmFzZU9STSA9IGZ1bmN0aW9uKG9wdGlvbnMsIGV4dE9STSl7XG4gICAgXG4gICAgLy8gY3JlYXRpbmcgcmV3aGVlbCBjb25uZWN0aW9uXG4gICAgaWYgKG9wdGlvbnMuY29uc3RydWN0b3IgPT09IFN0cmluZyl7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gbmV3IHJlV2hlZWxDb25uZWN0aW9uKG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gdXRpbHMucmVXaGVlbENvbm5lY3Rpb24pe1xuICAgICAgICB2YXIgY29ubmVjdGlvbiA9IG9wdGlvbnM7XG4gICAgfVxuICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgY29ubmVjdGlvbi5vbignY29ubmVjdGVkJywgZnVuY3Rpb24oKXsgXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICB9KTtcbiAgICB0aGlzLm9uID0gY29ubmVjdGlvbi5vbjtcbiAgICB0aGlzLmVtaXQgPSBjb25uZWN0aW9uLmVtaXQ7XG4gICAgdGhpcy51bmJpbmQgPSBjb25uZWN0aW9uLnVuYmluZDtcbiAgICB0aGlzLm9uY2UgPSBjb25uZWN0aW9uLm9uY2U7XG4gICAgdGhpcy4kcG9zdCA9IGNvbm5lY3Rpb24uJHBvc3QuYmluZChjb25uZWN0aW9uKTtcblxuICAgIC8vIGhhbmRsaW5nIHdlYnNvY2tldCBldmVudHNcbiAgICB0aGlzLm9uKCd3cy1jb25uZWN0ZWQnLGZ1bmN0aW9uKHdzKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdXZWJzb2NrZXQgY29ubmVjdGVkJyk7XG4gICAgICAgIC8vIGFsbCBqc29uIGRhdGEgaGFzIHRvIGJlIHBhcnNlZCBieSBnb3REYXRhXG4gICAgICAgIHdzLm9uTWVzc2FnZUpzb24oVzJQUkVTT1VSQ0UuZ290RGF0YS5iaW5kKFcyUFJFU09VUkNFKSk7XG4gICAgICAgIC8vXG4gICAgICAgIHdzLm9uTWVzc2FnZVRleHQoZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8oJ1dTIG1lc3NhZ2UgOiAnICsgbWVzc2FnZSlcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5vbignd3MtZGlzY29ubmVjdGVkJywgZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmVycm9yKCdXZWJzb2NrZXQgZGlzY29ubmVjdGVkJylcbiAgICB9KTtcbiAgICB0aGlzLm9uKCdlcnJvci1qc29uLTQwNCcsZnVuY3Rpb24oZXJyb3IsdXJsLCBzZW50RGF0YSwgeGhyKXsgXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0pTT04gZXJyb3IgJywgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1t1cmwuc3BsaXQoJy8nKVswXV07XG4gICAgfSk7XG4gICAgdGhpcy5vbigncmVhbHRpbWUtbWVzc2FnZS1qc29uJywgZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEobWVzc2FnZSk7XG4gICAgfSk7XG5cbiAgICAvLyBpbml0aWFsaXphdGlvblxuICAgIHZhciBXMlBSRVNPVVJDRSA9IHRoaXM7XG4gICAgdmFyIElEQiA9IHthdXRoX2dyb3VwIDogTGF6eSh7fSl9OyAvLyB0YWJsZU5hbWUgLT4gZGF0YSBhcyBBcnJheVxuICAgIHZhciBJRFggPSB7fTsgLy8gdGFibGVOYW1lIC0+IExhenkoaW5kZXhCeSgnaWQnKSkgLT4gSURCW2RhdGFdXG4gICAgdmFyIFJFVklEWCA9IHt9OyAvLyB0YWJsZU5hbWUgLT4gZmllbGROYW1lIC0+IExhenkuZ3JvdXBCeSgpIC0+IElEQltEQVRBXVxuICAgIHZhciBidWlsZGVySGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgYnVpbGRlckhhbmRsZXJVc2VkID0ge307XG4gICAgdmFyIHBlcnNpc3RlbnRBdHRyaWJ1dGVzID0ge307XG4gICAgdmFyIGV2ZW50SGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbldhaXRpbmcgPSB7fTtcbiAgICB2YXIgbW9kZWxDYWNoZSA9IHt9O1xuICAgIHZhciBmYWlsZWRNb2RlbHMgPSB7fTtcbiAgICB2YXIgd2FpdGluZ0Nvbm5lY3Rpb25zID0ge30gLy8gYWN0dWFsIGNvbm5lY3Rpb24gd2hvIGknbSB3YWl0aW5nIGZvclxuICAgIHZhciBsaXN0Q2FjaGUgPSBuZXcgTGlzdENhY2hlcihMYXp5KTtcbiAgICB2YXIgbGlua2VyID0gbmV3IEF1dG9MaW5rZXIod2FpdGluZ0Nvbm5lY3Rpb25zLElEQiwgdGhpcywgbGlzdENhY2hlKTtcbi8qICAgIHdpbmRvdy5sbCA9IGxpbmtlcjtcbiAgICB3aW5kb3cubGMgPSBsaXN0Q2FjaGU7XG4qL1xuLypcbiAgICB3aW5kb3cuSURCID0gSURCO1xuKi9cbiAgICB0aGlzLklEQiA9IElEQjtcbiAgICB0aGlzLnZhbGlkYXRpb25FdmVudCA9IHRoaXMub24oJ2Vycm9yLWpzb24tNTEzJywgZnVuY3Rpb24oZGF0YSwgdXJsLCBzZW50RGF0YSwgeGhyKXtcbiAgICAgICAgaWYgKGN1cnJlbnRDb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlcil7XG4gICAgICAgICAgICBjdXJyZW50Q29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIobmV3IFZhbGlkYXRpb25FcnJvcihkYXRhKSk7XG4gICAgICAgIH1cbiAgICB9KVxuXG4gICAgdmFyIGdldEluZGV4ID0gZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElEQilcbiAgICAgICAgICAgIHJldHVybiBJREJbaW5kZXhOYW1lXTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBJREJbaW5kZXhOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgcmV0dXJuIElEQltpbmRleE5hbWVdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgZ2V0VW5saW5rZWQgPSBmdW5jdGlvbiAoaW5kZXhOYW1lKSB7XG4gICAgICAgIGlmIChpbmRleE5hbWUgaW4gVU5MSU5LRUQpXG4gICAgICAgICAgICByZXR1cm4gVU5MSU5LRURbaW5kZXhOYW1lXTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBVTkxJTktFRFtpbmRleE5hbWVdID0ge307XG4gICAgICAgICAgICByZXR1cm4gVU5MSU5LRURbaW5kZXhOYW1lXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBQZXJtaXNzaW9uVGFibGUoaWQsIGtsYXNzLCBwZXJtaXNzaW9ucykge1xuICAgICAgICAvLyBjcmVhdGUgUGVybWlzc2lvblRhYmxlIGNsYXNzXG4gICAgICAgIHRoaXMua2xhc3MgPSBrbGFzcztcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IFtdO1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIGZvciAodmFyIGsgaW4gcGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgIHRoaXMucHVzaC5hcHBseSh0aGlzLCBbaywgcGVybWlzc2lvbnNba11dKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBQZXJtaXNzaW9uVGFibGUucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgLy8gc2F2ZSBPYmplY3QgdG8gc2VydmVyXG4gICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgcGVybWlzc2lvbnM6IExhenkodGhpcy5wZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFt4WzBdLmlkLCB4WzFdXVxuICAgICAgICAgICAgfSkudG9PYmplY3QoKVxuICAgICAgICB9O1xuICAgICAgICBkYXRhLmlkID0gdGhpcy5pZDtcbiAgICAgICAgdmFyIG1vZGVsTmFtZSA9IHRoaXMua2xhc3MubW9kZWxOYW1lO1xuICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmtsYXNzLm1vZGVsTmFtZSArICcuc2V0X3Blcm1pc3Npb25zJywgZGF0YSwgZnVuY3Rpb24gKG15UGVybXMsIGEsIGIsIHJlcSkge1xuICAgICAgICAgICAgY2IobXlQZXJtcyk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgUGVybWlzc2lvblRhYmxlLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKGdyb3VwX2lkLCBwZXJtaXNzaW9uTGlzdCkge1xuICAgICAgICB2YXIgcCA9IExhenkocGVybWlzc2lvbkxpc3QpO1xuICAgICAgICB2YXIgcGVybXMgPSBMYXp5KHRoaXMua2xhc3MuYWxsUGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LCBwLmNvbnRhaW5zKHgpXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICB2YXIgbCA9IExhenkodGhpcy5wZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4geFswXS5pZFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGwuY29udGFpbnMoZ3JvdXBfaWQpKVxuICAgICAgICAgICAgdGhpcy5wZXJtaXNzaW9uc1tsLmluZGV4T2YoZ3JvdXBfaWQpXVsxXSA9IHBlcm1zO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGlzLnBlcm1pc3Npb25zLnB1c2goW0lEQi5hdXRoX2dyb3VwLmdldChncm91cF9pZCksIHBlcm1zXSk7XG4gICAgfTtcblxuICAgIC8vIGNyZWF0ZXMgZHluYW1pY2FsIG1vZGVsc1xuICAgIHZhciBtYWtlTW9kZWxDbGFzcyA9IGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICB2YXIgX21vZGVsID0gbW9kZWw7XG4gICAgICAgIG1vZGVsLmZpZWxkcy5pZC5yZWFkYWJsZSA9IGZhbHNlO1xuICAgICAgICBtb2RlbC5maWVsZHMuaWQud3JpdGFibGUgPSBmYWxzZTtcbiAgICAgICAgdmFyIGZpZWxkcyA9IExhenkobW9kZWwuZmllbGRzKTtcbiAgICAgICAgaWYgKG1vZGVsLnByaXZhdGVBcmdzKSB7XG4gICAgICAgICAgICBmaWVsZHMgPSBmaWVsZHMubWVyZ2UobW9kZWwucHJpdmF0ZUFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ21vZGVsLWRlZmluaXRpb24nLCBtb2RlbCwgZ2V0SW5kZXgobW9kZWwubmFtZSkpO1xuICAgICAgICAvLyBnZXR0aW5nIGZpZWxkcyBvZiB0eXBlIGRhdGUgYW5kIGRhdGV0aW1lXG4vKlxuICAgICAgICB2YXIgREFURUZJRUxEUyA9IGZpZWxkcy5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKVxuICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKHgsIHYpIHtcbiAgICAgICAgICAgIHJldHVybiBbdiwgdHJ1ZV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcblxuICAgICAgICAvLyBnZXR0aW5nIGJvb2xlYW4gZmllbGRzXG4gICAgICAgIHZhciBCT09MRklFTERTID0gZmllbGRzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKVxuICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKHgsIHYpIHtcbiAgICAgICAgICAgIHJldHVybiBbdiwgdHJ1ZV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcblxuICAgICAgICAvLyBib29sZWFucyBhbmQgZGF0ZXRpbWVzIHN0b3JhZ2UgZXh0ZXJuYWwgXG4gICAgICAgIE1PREVMX0RBVEVGSUVMRFNbbW9kZWwubmFtZV0gPSBEQVRFRklFTERTO1xuICAgICAgICBNT0RFTF9CT09MRklFTERTW21vZGVsLm5hbWVdID0gQk9PTEZJRUxEUztcbiovXG4gICAgICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHZhciBmdW5jU3RyaW5nID0gXCJpZiAoIXJvdykgeyByb3cgPSB7fX07XFxuXCI7XG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gbW9kZWwucmVmZXJlbmNlcy5tYXAoZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgcmV0dXJuICd0aGlzLl8nICsgZmllbGQuaWQgKyAnID0gcm93LicgKyBmaWVsZC5pZCArICc7JztcbiAgICAgICAgfSkuam9pbignO1xcbicpO1xuICAgICAgICBcbiAgICAgICAgLy8gZGF0ZWZpZWxkIGNvbnZlcnNpb25cbiAgICAgICAgZnVuY1N0cmluZyArPSBmaWVsZHMubWFwKGZ1bmN0aW9uICh4LGspIHtcbiAgICAgICAgICAgIGlmICgoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IHJvdy4nICsgayArICc/bmV3IERhdGUocm93LicgKyBrICsgJyAqIDEwMDAgLSAnICsgdXRpbHMudHpPZmZzZXQgKyAnKTpudWxsO1xcbic7IFxuICAgICAgICAgICAgfSBlbHNlIGlmICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IChyb3cuJyArIGsgKyAnID09PSBcIlRcIikgfHwgKHJvdy4nICsgayArICcgPT09IHRydWUpO1xcbic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSByb3cuJyArIGsgKyAnO1xcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnRvU3RyaW5nKCdcXG4nKTsgKyAnXFxuJztcblxuICAgICAgICBmdW5jU3RyaW5nICs9IFwiaWYgKHBlcm1pc3Npb25zKSB7dGhpcy5fcGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucyAmJiBMYXp5KHBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIFt4LCB0cnVlXSB9KS50b09iamVjdCgpO31cIlxuXG4gICAgICAgIFxuICAgICAgICAvLyBtYXN0ZXIgY2xhc3MgZnVuY3Rpb25cbiAgICAgICAgdmFyIEtsYXNzID0gdXRpbHMucmVuYW1lRnVuY3Rpb24odXRpbHMuY2FwaXRhbGl6ZShtb2RlbC5uYW1lKSwgbmV3IEZ1bmN0aW9uKCdyb3cnLCAncGVybWlzc2lvbnMnLGZ1bmNTdHJpbmcpKTtcbiAgICAgICAgLy92YXIgS2xhc3MgPSBuZXcgRnVuY3Rpb24oJ3JvdycsICdwZXJtaXNzaW9ucycsZnVuY1N0cmluZyk7XG4gICAgICAgIFxuXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5vcm0gPSBleHRPUk07XG4gICAgICAgIEtsYXNzLnJlZl90cmFuc2xhdGlvbnMgPSB7fTtcbiAgICAgICAgS2xhc3MubW9kZWxOYW1lID0gbW9kZWwubmFtZTtcbiAgICAgICAgS2xhc3MucmVmZXJlbmNlcyA9IExhenkobW9kZWwucmVmZXJlbmNlcykucGx1Y2soJ2lkJykudG9BcnJheSgpO1xuXG4gICAgICAgIEtsYXNzLmludmVyc2VfcmVmZXJlbmNlcyA9IG1vZGVsLnJlZmVyZW5jZWRCeS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIC8vIG1hbmFnaW5nIHJlZmVyZW5jZXMgd2hlcmUgXG4gICAgICAgICAgICByZXR1cm4geC5ieSArICdfJyArIHguaWQgKyAnX3NldCdcbiAgICAgICAgfSk7XG4gICAgICAgIEtsYXNzLnJlZmVyZW50cyA9IG1vZGVsLnJlZmVyZW5jZWRCeS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBbeC5ieSwgeC5pZF1cbiAgICAgICAgfSk7XG4gICAgICAgIEtsYXNzLmZpZWxkc09yZGVyID0gbW9kZWwuZmllbGRPcmRlcjtcbiAgICAgICAgS2xhc3MuYWxsUGVybWlzc2lvbnMgPSBtb2RlbC5wZXJtaXNzaW9ucztcblxuICAgICAgICAvLyByZWRlZmluaW5nIHRvU3RyaW5nIG1ldGhvZFxuICAgICAgICBpZiAoTGF6eShtb2RlbC5yZXByZXNlbnRhdGlvbikuc2l6ZSgpKXtcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS50b1N0cmluZyA9IG5ldyBGdW5jdGlvbigncmV0dXJuIHRoaXMuJyArIExhenkobW9kZWwucmVwcmVzZW50YXRpb24pLnRvU3RyaW5nKCcgKyBcIiBcIiArIHRoaXMuJykpO1xuICAgICAgICB9XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS50b1VwcGVyQ2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIHJlZGVmaW5lIHRvIFVwcGVyQ2FzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICB9O1xuICAgICAgXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS50b0xvd2VyQ2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBkZWxldGUgaW5zdGFuY2UgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIHJldHVybiBleHRPUk0uZGVsZXRlKHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lLCBbdGhpcy5pZF0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHBlcm1pc3Npb24gZ2V0dGVyIHByb3BlcnR5XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShLbGFzcy5wcm90b3R5cGUsICdwZXJtaXNzaW9ucycsIHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9wZXJtaXNzaW9ucylcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Blcm1pc3Npb25zO1xuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsaW5rZXIucGVybWlzc2lvbnNbdGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWVdLmFzayh0aGlzLmlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBnZXR0aW5nIGZ1bGwgcGVybWlzc2lvbiB0YWJsZSBmb3IgYW4gb2JqZWN0XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5hbGxfcGVybXMgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgIHZhciBvYmplY3RfaWQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUgKyAnLmFsbF9wZXJtcycsIHtpZDogdGhpcy5pZH0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBlcm1pc3Npb25zID0gZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXBlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciB1bmtub3duX2dyb3VwcyA9IExhenkocGVybWlzc2lvbnMpLnBsdWNrKCdncm91cF9pZCcpLnVuaXF1ZSgpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJycgKyB4XG4gICAgICAgICAgICAgICAgfSkuZGlmZmVyZW5jZShJREIuYXV0aF9ncm91cC5rZXlzKCkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KHBlcm1pc3Npb25zKS5ncm91cEJ5KGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4Lmdyb3VwX2lkXG4gICAgICAgICAgICAgICAgfSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICBncm91cGVkW2tdID0gTGF6eSh2KS5wbHVjaygnbmFtZScpLnRvQXJyYXkoKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHZhciBjYWxsID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2IobmV3IFBlcm1pc3Npb25UYWJsZShvYmplY3RfaWQsIEtsYXNzLCBncm91cGVkKSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAodW5rbm93bl9ncm91cHMubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nZXQoJ2F1dGhfZ3JvdXAnLHVua25vd25fZ3JvdXBzLGNhbGwpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgY2FsbCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgdmFyIG8gPSB0aGlzLmFzUmF3KCk7XG4gICAgICAgICAgICB2YXIgZmllbGRzID0gS2xhc3MuZmllbGRzO1xuICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgIHZhciBtb2RlbE5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXJnIGluIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgb1thcmddID0gYXJnc1thcmddO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGVsaW1pbmF0ZSB1bndyaXRhYmxlc1xuICAgICAgICAgICAgTGF6eShLbGFzcy5maWVsZHNPcmRlcikuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgIHJldHVybiAhZmllbGRzW3hdLndyaXRhYmxlO1xuICAgICAgICAgICAgfSkuZWFjaChmdW5jdGlvbihmaWVsZE5hbWUpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgaW4gbykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgb1tmaWVsZE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKElEKSB7IG8uaWQgPSBJRDsgfVxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBXMlBSRVNPVVJDRS4kcG9zdChtb2RlbE5hbWUgKyAoSUQgPyAnLnBvc3QnIDogJy5wdXQnKSwgbyk7XG4gICAgICAgICAgICBpZiAoYXJncyAmJiAoYXJncy5jb25zdHJ1Y3RvciA9PT0gRnVuY3Rpb24pKXtcbiAgICAgICAgICAgICAgICAvLyBwbGFjaW5nIGNhbGxiYWNrIGluIGEgY29tbW9uIHBsYWNlXG4gICAgICAgICAgICAgICAgcHJvbWlzZS5jb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlciA9IGFyZ3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZVxuICAgICAgICB9O1xuICAgICAgICBLbGFzcy5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBvYmogPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih0aGlzLmFzUmF3KCkpO1xuICAgICAgICAgICAgb2JqLl9wZXJtaXNzaW9ucyA9IHRoaXMuX3Blcm1pc3Npb25zO1xuICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBidWlsZGluZyBzZXJpYWxpemF0aW9uIGZ1bmN0aW9uXG4gICAgICAgIHZhciBhc3IgPSAncmV0dXJuIHtcXG4nICsgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5tYXAoZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgcmV0dXJuIGZpZWxkLmlkICsgJyA6IHRoaXMuXycgKyBmaWVsZC5pZDtcbiAgICAgICAgfSkuY29uY2F0KGZpZWxkcy5tYXAoZnVuY3Rpb24gKHgsaykge1xuICAgICAgICAgICAgaWYgKCh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiAodGhpcy4nICsgayArICc/KE1hdGgucm91bmQodGhpcy4nICsgayArICcuZ2V0VGltZSgpIC0gdGhpcy4nICsgayArICcuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIDYwMDAwKSAvIDEwMDApOm51bGwpJzsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHgudHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiB0aGlzLicgKyBrICsgJz9cIlRcIjpcIkZcIic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6IHRoaXMuJyArIGs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKS50b1N0cmluZygnLFxcbicpICsgJ307JztcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmFzUmF3ID0gbmV3IEZ1bmN0aW9uKGFzcik7XG5cbiAgICAgICAgS2xhc3Muc2F2ZU11bHRpID0gZnVuY3Rpb24gKG9iamVjdHMsIGNiLCBzY29wZSkge1xuICAgICAgICAgICAgdmFyIHJhdyA9IFtdO1xuICAgICAgICAgICAgdmFyIGRlbGV0YWJsZSA9IExhenkoS2xhc3MuZmllbGRzKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICF4LndyaXRhYmxlXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAucGx1Y2soJ2lkJylcbiAgICAgICAgICAgICAgICAudG9BcnJheSgpO1xuICAgICAgICAgICAgTGF6eShvYmplY3RzKVxuICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguYXNSYXcoKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShkZWxldGFibGUpLmVhY2goZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB4W3ldO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmF3LnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUsICdwdXQnLCB7bXVsdGlwbGU6IHJhdywgZm9ybUlkeCA6IFcyUFJFU09VUkNFLmZvcm1JZHgrK30sIGZ1bmN0aW9uIChlbGVtcykge1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZWxlbXMpO1xuICAgICAgICAgICAgICAgIHZhciB0YWIgPSBJREJbS2xhc3MubW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB2YXIgb2JqcyA9IExhenkoZWxlbXNbS2xhc3MubW9kZWxOYW1lXS5yZXN1bHRzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhYi5nZXQoeClcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNiKSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKG9ianMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHNjb3BlKTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCdleHRyYV92ZXJicycgaW4gbW9kZWwpXG4gICAgICAgICAgICBMYXp5KG1vZGVsLmV4dHJhX3ZlcmJzKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGZ1bmNOYW1lID0geFswXTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHhbMV07XG4gICAgICAgICAgICAgICAgdmFyIGRkYXRhID0gJ3ZhciBkYXRhID0ge2lkIDogdGhpcy5pZCc7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBkZGF0YSArPSAnLCAnICsgTGF6eShhcmdzKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geCArICcgOiAnICsgeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJywnKTtcbiAgICAgICAgICAgICAgICBkZGF0YSArPSAnfTtcXG4nO1xuICAgICAgICAgICAgICAgIGFyZ3MgPSBbJ3Bvc3QnLCdnb3REYXRhJ10uY29uY2F0KGFyZ3MpO1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCgnY2InKTtcbiAgICAgICAgICAgICAgICB2YXIgY29kZSA9IGRkYXRhICsgJyByZXR1cm4gcG9zdChcIicgKyBLbGFzcy5tb2RlbE5hbWUgKyAnLicgKyBmdW5jTmFtZSArICdcIiwgZGF0YSxjYik7JztcbiAgICAgICAgICAgICAgICB2YXIgZnVuYyA9IG5ldyBGdW5jdGlvbihhcmdzLCBjb2RlKTtcbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbZnVuY05hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gW1cyUFJFU09VUkNFLiRwb3N0LCBXMlBSRVNPVVJDRS5nb3REYXRhXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJncylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKCdwcml2YXRlQXJncycgaW4gbW9kZWwpIHtcbiAgICAgICAgICAgIEtsYXNzLnByaXZhdGVBcmdzID0gTGF6eShtb2RlbC5wcml2YXRlQXJncykua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgdHJ1ZV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmVQQSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgdmFyIFQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBvbyA9IHtpZDogdGhpcy5pZH07XG4gICAgICAgICAgICAgICAgdmFyIFBBID0gdGhpcy5jb25zdHJ1Y3Rvci5wcml2YXRlQXJncztcbiAgICAgICAgICAgICAgICB2YXIgRnMgPSB0aGlzLmNvbnN0cnVjdG9yLmZpZWxkcztcbiAgICAgICAgICAgICAgICB2YXIgdCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG8pLmFzUmF3KCk7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkSWR4ID0gTGF6eShQQSkua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIEZzW3hdXVxuICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgTGF6eShvKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoayBpbiBQQSkgJiYgZmllbGRJZHhba10ud3JpdGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9vW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy5zYXZlUEEnLCBvbywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG9vKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBUW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbW9kZWxDYWNoZVtLbGFzcy5tb2RlbE5hbWVdID0gS2xhc3M7XG4gICAgICAgIC8vIGFkZGluZyBpZCB0byBmaWVsZHNcbiAgICAgICAgZm9yICh2YXIgZiBpbiBtb2RlbC5maWVsZHMpIHtcbiAgICAgICAgICAgIG1vZGVsLmZpZWxkc1tmXS5pZCA9IGY7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MuZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpLmNvbmNhdChMYXp5KG1vZGVsLnByaXZhdGVBcmdzKSkuY29uY2F0KExhenkobW9kZWwucmVmZXJlbmNlcykudGFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICB4LnR5cGUgPSB4LnR5cGUgfHwgJ3JlZmVyZW5jZSdcbiAgICAgICAgfSkpLmluZGV4QnkoJ2lkJykudG9PYmplY3QoKTtcbiAgICAgICAgLy8gc2V0dGluZyB3aWRnZXRzIGZvciBmaWVsZHNcbiAgICAgICAgTGF6eShLbGFzcy5maWVsZHMpLmVhY2goZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgaWYgKCFmaWVsZC53aWRnZXQpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZC50eXBlID09PSAncmVmZXJlbmNlJyl7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9ICdjaG9pY2VzJ1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkLndpZGdldCA9IGZpZWxkLnR5cGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAobWFueSB0byBvbmUpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGV4dF9yZWYgPSByZWYudG87XG4gICAgICAgICAgICB2YXIgbG9jYWxfcmVmID0gJ18nICsgcmVmLmlkO1xuICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5pZCxmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzW2xvY2FsX3JlZl0pIHsgcmV0dXJuIHV0aWxzLm1vY2sgfTtcbiAgICAgICAgICAgICAgICBpZiAoIShleHRfcmVmIGluIElEQikpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUoZXh0X3JlZixmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtlci5tYWluSW5kZXhbZXh0X3JlZl0uYXNrKHRoc1tsb2NhbF9yZWZdLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IChleHRfcmVmIGluIElEQikgJiYgdGhpc1tsb2NhbF9yZWZdICYmIElEQltleHRfcmVmXS5nZXQodGhpc1tsb2NhbF9yZWZdKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdCAmJiAoZXh0X3JlZiBpbiBsaW5rZXIubWFpbkluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBhc2tpbmcgdG8gbGlua2VyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpc1tsb2NhbF9yZWZdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLm1haW5JbmRleFtleHRfcmVmXS5hc2sodGhpc1tsb2NhbF9yZWZdLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdudWxsIHJlZmVyZW5jZSBmb3IgJyArIGxvY2FsX3JlZiArICcoJyArIHRoaXMuaWQgKyAnKSByZXNvdXJjZSAnICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXRpbHMubW9jaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHZhbHVlLmNvbnN0cnVjdG9yICE9PSB1dGlscy5tb2NrKSAmJiAodmFsdWUuY29uc3RydWN0b3IubW9kZWxOYW1lICE9PSBleHRfcmVmKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IGNhbiBhc3NpZ24gb25seSAnICsgZXh0X3JlZiArICcgdG8gJyArIHJlZi5pZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpc1tsb2NhbF9yZWZdID0gdmFsdWUuaWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tsb2NhbF9yZWZdID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAnbmV3LScgKyBleHRfcmVmLCAnZGVsZXRlZC0nICsgZXh0X3JlZiwndXBkYXRlZC0nICsgZXh0X3JlZiwgJ25ldy1tb2RlbC0nICsgZXh0X3JlZi8qLCAndXBkYXRlZC0nICsgS2xhc3MubW9kZWxOYW1lKi8pO1xuXG5cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVmLmlkKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5nZXQoZXh0X3JlZix0aGlzW2xvY2FsX3JlZl0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9idWlsZGluZyByZWZlcmVuY2VzIHRvIChvbmUgdG8gbWFueSkgZmllbGRzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSByZWYuYnkgKyAnLicgKyByZWYuaWQ7XG4gICAgICAgICAgICB2YXIgcHJvcGVydHlOYW1lID0gcmVmLmJ5ICsgJ18nICsgdXRpbHMucGx1cmFsaXplKHJlZi5pZCk7XG4gICAgICAgICAgICB2YXIgcmV2SW5kZXggPSByZWYuYnk7XG4gICAgICAgICAgICBpZiAoS2xhc3MucHJvdG90eXBlLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcnllZCB0byByZWRlZmluZSBwcm9wZXJ0eSAnICsgcHJvcGVydHlOYW1lICsgJ3MnICsgJyBmb3IgJyArIEtsYXNzLm1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCBwcm9wZXJ0eU5hbWUsIGZ1bmN0aW9uICgpIHtcbi8qXG4gICAgICAgICAgICAgICAgICAgIHZhciBmaWx0ZXIgPSB7fTsgXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcltyZWYuaWRdID0gdGhpcy5pZDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDb2xsZWN0aW9uKFcyUFJFU09VUkNFLCByZWYuYnksIGZpbHRlcik7XG4qL1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gKHJldkluZGV4IGluIElEQikgPyBSRVZJRFhbaW5kZXhOYW1lXS5nZXQodGhpcy5pZCArICcnKTpudWxsO1xuICAgICAgICAgICAgICAgICAgICBsaW5rZXIuZm9yZWlnbktleXNbaW5kZXhOYW1lXS5hc2sodGhpcy5pZCx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcblxuICAgICAgICAgICAgICAgIH0sIG51bGwgLyosICduZXctJyArIHJldkluZGV4LCAndXBkYXRlZC0nICsgcmV2SW5kZXgsICdkZWxldGVkLScgKyByZXZJbmRleCovKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUodXRpbHMucGx1cmFsaXplKHJlZi5ieSkpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0cyA9IHt9O1xuICAgICAgICAgICAgICAgIG9wdHNbcmVmLmlkXSA9IFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0T1JNLmdldChyZWYuYnksb3B0cyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2J1aWxkaW5nIHJlZmVyZW5jZSB0byAobWFueSB0byBtYW55KSBmaWVsZHNcbiAgICAgICAgaWYgKG1vZGVsLm1hbnlUb01hbnkpIHtcbiAgICAgICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHJlZi5pbmRleE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcmVmLmZpcnN0PyAwIDogMTtcbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsTmFtZSA9IHJlZi5tb2RlbDtcbi8vICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBnZXRJbmRleChvbW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgZ2V0dGVyID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyAoMSAtIGZpcnN0KV07XG5cbiAgICAgICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcmVmLm1vZGVsICsgJ3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZXQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0ID0gZ2V0SW5kZXgob21vZGVsTmFtZSkuZ2V0LmJpbmQoSURCW29tb2RlbE5hbWVdKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcyAmJiBnZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0ID0gTGF6eShpZHMpLm1hcChnZXQpLmZpbHRlcih1dGlscy5ib29sKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgICAgICAgICB9LCBudWxsLCAncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUsICdyZWNlaXZlZC0nICsgb21vZGVsTmFtZSk7XG5cbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHV0aWxzLnBsdXJhbGl6ZShvbW9kZWxOYW1lKSldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLmdldE0yTShpbmRleE5hbWUsIFt0aHMuaWRdLCBmaXJzdCxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGdldHRlcih0aHMuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChvbW9kZWxOYW1lLCB7aWQgOiBpZHN9LG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gSURCW29tb2RlbE5hbWVdLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KFtdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgICAgIEtsYXNzLmZpZWxkc1t1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHV0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSksXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICByZWFkYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ00yTScsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcnM6IFtdXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS51bmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IFtbSUQsIGluc3RhbmNlLmlkXV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzL2RlbGV0ZScsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUubGlua1JlZmVyZW5jZSA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lID09ICdBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZXMgPSBpbnN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBpbnN0YW5jZXNbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlZnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJTkRFWF9NMk0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZnMgPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykuZGlmZmVyZW5jZShMYXp5KElOREVYX00yTVtpbmRleE5hbWVdWzBdLmdldCh0aGlzLmlkKSkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbmRleE5hbWUgPSBvbW9kZWwgKyAnLycgKyBLbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlZnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IExhenkocmVmcykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtJRCwgeF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUF9QT1NUKEtsYXNzLm1vZGVsTmFtZSwgb21vZGVsICsgJ3MvcHV0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGluZGV4TmFtZSBpbiBsaW5rZXIubTJtSW5kZXgpICYmIExhenkobGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV1bJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKG9tb2RlbCldKGluc3RhbmNlLmlkKSkuZmluZCh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSArICcvJyArIG9tb2RlbCArICdzLnB1dCcsIHtjb2xsZWN0aW9uOiBbW3RoaXMuaWQsIGluc3RhbmNlLmlkXV19KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ25ldy1tb2RlbCcsIEtsYXNzKTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbmV3LW1vZGVsLScgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICByZXR1cm4gS2xhc3M7XG4gICAgfTtcblxuICAgIHRoaXMuZ290RGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBjYWxsQmFjaykge1xuICAgICAgICAvLyByZWNlaXZlIGFsbCBkYXRhIGZyb20gZXZlcnkgZW5kIHBvaW50XG4gICAgICAgIGNvbnNvbGUuaW5mbygnZ290RGF0YScpO1xuICAgICAgICBpZiAodHlwZW9mKGRhdGEpID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGF0YSAnICsgZGF0YSArICcgcmVmdXNlZCBmcm9tIGdvdERhdGEoKScpO1xuICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNsZWFuIGRhdGEgZnJvbSByZWxhdGlvbnMgYW5kIHBlcm1pc3Npb25zIGZvciB1c2luZyBpdCBhZnRlciBtb2RlbCBwYXJzaW5nXG4gICAgICAgIGlmICgnX2V4dHJhJyBpbiBkYXRhKXsgZGVsZXRlIGRhdGEuX2V4dHJhIH1cbiAgICAgICAgdmFyIFRPT05FID0gZGF0YS5UT09ORTtcbiAgICAgICAgdmFyIFRPTUFOWSA9IGRhdGEuVE9NQU5ZO1xuICAgICAgICB2YXIgTUFOWVRPTUFOWSA9IGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgdmFyIFBFUk1JU1NJT05TID0gZGF0YS5QRVJNSVNTSU9OUztcbiAgICAgICAgdmFyIFBBID0gZGF0YS5QQTtcbiAgICAgICAgZGVsZXRlIGRhdGEuVE9PTkU7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBBO1xuICAgICAgICBpZiAoIVBBKSB7IFBBID0ge307IH1cblxuICAgICAgICAvLyBjbGVhbmluZyBmcm9tIHVzZWxlc3MgZGVsZXRlZCBkYXRhXG4gICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLmZpbHRlcihmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgcmV0dXJuICghKCdkZWxldGVkJyBpbiB2KSB8fCAoKGsgaW4gbW9kZWxDYWNoZSkpKTtcbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgnbTJtJyBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbTJtID0gZGF0YS5tMm07XG4gICAgICAgICAgICBkZWxldGUgZGF0YVsnbTJtJ107XG4gICAgICAgIH1cbiAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uIChkYXRhLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsQ2xhc3MgPSBtb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXN1bHRzICYmIChkYXRhLnJlc3VsdHMubGVuZ3RoID4gMCkgJiYgKGRhdGEucmVzdWx0c1swXS5jb25zdHJ1Y3RvciA9PSBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMYXp5KG1vZGVsQ2xhc3MuZmllbGRzT3JkZXIpLnppcCh4KS50b09iamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBMYXp5KGRhdGEucmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgdmFyIGRlbGV0ZWQgPSBkYXRhLmRlbGV0ZWQ7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBQQSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgTVBBID0gUEFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShyZXN1bHRzKS5lYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmQuaWQgaW4gTVBBKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShNUEFbcmVjb3JkLmlkXSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGluZGV4aW5nIHJlZmVyZW5jZXMgYnkgaXRzIElEXG4gICAgICAgICAgICAgICAgdmFyIGl0YWIgPSBnZXRJbmRleChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZSA9IGl0YWIuc291cmNlO1xuXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGVkLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGFibGVbeF07XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuLypcbiAgICAgICAgICAgICAgICBMYXp5KGRlbGV0ZWQpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgIH0pO1xuKi9cbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gcmVzdWx0cy5pbmRleEJ5KCdpZCcpLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgdmFyIGlrID0gTGF6eShpZHgpLmtleXMoKTtcbiAgICAgICAgICAgICAgICB2YXIgbm5ldyA9IGlrLmRpZmZlcmVuY2UoaXRhYi5rZXlzKCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh4KVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB2YXIgdXBkYXRlZCA9IGlrLmRpZmZlcmVuY2Uobm5ldyk7XG4gICAgICAgICAgICAgICAgLy8gcmVtb3Zpbmcgb2xkIGlkZW50aWNhbCB2YWx1ZXNcbiAgICAgICAgICAgICAgICB1cGRhdGVkID0gdXBkYXRlZC5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICF1dGlscy5zYW1lQXMoaWR4W3hdLCB0YWJsZVt4XS5hc1JhdygpKTtcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy8gY2xhc3NpZnkgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIHZhciBwZXJtcyA9IGRhdGEucGVybWlzc2lvbnMgPyBMYXp5KGRhdGEucGVybWlzc2lvbnMpIDogTGF6eSh7fSk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld09iamVjdHMgPSBubmV3Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IG1vZGVsQ2xhc3MoaWR4W3hdLCBwZXJtcy5nZXQoeCkpXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLy8vIGNsYXNzaWZ5aW5nIHVwZGF0ZWRcbiAgICAgICAgICAgICAgICAvL3ZhciB1cGRhdGVkT2JqZWN0cyA9IHVwZGF0ZWQubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBuZXcgbW9kZWxDbGFzcyhpZHguZ2V0KHgpLHBlcm1zLmdldCh4KSl9KTtcbiAgICAgICAgICAgICAgICAvL3ZhciB1byA9IHVwZGF0ZWRPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvL3VwZGF0ZWRPYmplY3RzID0gTGF6eSh1bykubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBbeCx0YWJsZVt4LmlkXV19KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRpbmcgc2luZ2xlIG9iamVjdHNcbiAgICAgICAgICAgICAgICB2YXIgY2hhbmdlZCA9IFtdO1xuLy8gICAgICAgICAgICAgICAgdmFyIERBVEVGSUVMRFMgPSBNT0RFTF9EQVRFRklFTERTW21vZGVsTmFtZV07XG4vLyAgICAgICAgICAgICAgICB2YXIgQk9PTEZJRUxEUyA9IE1PREVMX0JPT0xGSUVMRFNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB2YXIgbW9kZWxSZWZlcmVuY2VzID0gTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5tYXAoZnVuY3Rpb24oaykgeyByZXR1cm4gW2ssMV19KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQuZm9yRWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSXRlbSA9IHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ29weSA9IG9sZEl0ZW0uY29weSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3SXRlbSA9IGlkeC5nZXQoeCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGluZyBlYWNoIGF0dHJpYnV0ZSBzaW5ndWxhcmx5XG5cbiAgICAgICAgICAgICAgICAgICAgTGF6eShtb2RlbC5maWVsZHMpLmVhY2goZnVuY3Rpb24oZmllbGQsIGZpZWxkTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGZpZWxkLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdyZWZlcmVuY2UnIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtWydfJyArIGZpZWxkTmFtZV0gPSBuZXdJdGVtW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5hTiBpcyBjb252bnRpb25hbGx5IGEgY2FjaGUgZGVsZXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtW2ZpZWxkTmFtZV0gPSBOYU47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdkYXRlJzoge29sZEl0ZW1bZmllbGROYW1lXSA9IG5ldyBEYXRlKG5ld0l0ZW1bZmllbGROYW1lXSAqIDEwMDApOyBicmVha307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGF0ZXRpbWUnOiB7b2xkSXRlbVtmaWVsZE5hbWVdID0gbmV3IERhdGUobmV3SXRlbVtmaWVsZE5hbWVdICogMTAwMCk7IGJyZWFrfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJyA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChuZXdJdGVtW2ZpZWxkTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgbnVsbCA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gbnVsbDsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdUJyA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gdHJ1ZTsgYnJlYWs7IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdGJyA6IHsgb2xkSXRlbVtmaWVsZE5hbWVdID0gZmFsc2U7IGJyZWFrOyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSB0cnVlIDogeyBvbGRJdGVtW2ZpZWxkTmFtZV0gPSB0cnVlOyBicmVhazsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgZmFsc2UgOiB7IG9sZEl0ZW1bZmllbGROYW1lXSA9IGZhbHNlOyBicmVhazsgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHtvbGRJdGVtW2ZpZWxkTmFtZV0gPSBuZXdJdGVtW2ZpZWxkTmFtZV19XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICAgICAgICAgIG9sZEl0ZW1bZmllbGROYW1lXSA9IG5ld0l0ZW1bZmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChbbmV3SXRlbSwgb2xkQ29weV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBzZW5kaW5nIHNpZ25hbCBmb3IgdXBkYXRlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAoY2hhbmdlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgndXBkYXRlZC0nICsgbW9kZWxOYW1lLCBjaGFuZ2VkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8qKioqKioqKiBVcGRhdGUgdW5pdmVyc2UgKioqKioqKipcbiAgICAgICAgICAgICAgICB2YXIgbm8gPSBuZXdPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KG5vKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHRhYmxlW3guaWRdID0geFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHJlYnVsZGluZyByZXZlcnNlIGluZGV4ZXNcbiAgICAgICAgICAgICAgICBMYXp5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXS5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgICAgICAgICAgUkVWSURYW21vZGVsTmFtZSArICcuJyArIHJlZl0gPSBJREJbbW9kZWxOYW1lXS5ncm91cEJ5KCdfJyArIHJlZik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIG5ldyB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAobm8ubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCduZXctJyArIG1vZGVsTmFtZSwgTGF6eShubyksIGRhdGEudG90YWxSZXN1bHRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdkZWxldGVkLScgKyBtb2RlbE5hbWUsIGRlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgZGF0YSBhcnJpdmVkXG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtJyArIG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbi8qICAgICAgICBcbiAgICAgICAgaWYgKFRPT05FKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUT09ORScpO1xuICAgICAgICAgICAgTGF6eShUT09ORSkuZWFjaChmdW5jdGlvbiAodmFscywgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgdWR4ID0gZ2V0VW5saW5rZWQobW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChUT01BTlkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RPTUFOWScpO1xuICAgICAgICAgICAgTGF6eShUT01BTlkpLmVhY2goZnVuY3Rpb24gKHZhbHMsIGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBBU0tFRF9VTkxJTktFRCkpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfVU5MSU5LRURbaW5kZXhOYW1lXSA9IExhenkoW10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBMYXp5KHZhbHMpLmVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX1VOTElOS0VEW2luZGV4TmFtZV0uc291cmNlLnB1c2goaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE1BTllUT01BTlkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ01BTllUT01BTlknKTtcbiAgICAgICAgICAgIExhenkoTUFOWVRPTUFOWSkuZWFjaChmdW5jdGlvbiAodmFscywgaW5kZXhOYW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcGFyc2VJbnQoaW5kZXhOYW1lLnNwbGl0KCd8JylbMV0pO1xuICAgICAgICAgICAgICAgIGluZGV4TmFtZSA9IGluZGV4TmFtZS5zcGxpdCgnfCcpWzBdO1xuICAgICAgICAgICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBBU0tFRF9NMk0pKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX00yTVtpbmRleE5hbWVdID0gW3t9LCB7fV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBNSURYID0gQVNLRURfTTJNW2luZGV4TmFtZV1bZmlyc3RdO1xuICAgICAgICAgICAgICAgIExhenkodmFscykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBNSURYW3ggKyAnJ10gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBNSURYW3hdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICBcbiovXG4gICAgICAgIGlmIChtMm0pIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdE0yTShtMm0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChQRVJNSVNTSU9OUykge1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoUEVSTUlTU0lPTlMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdnb3QtZGF0YScpO1xuICAgIH07XG4gICAgdGhpcy5nb3RQZXJtaXNzaW9ucyA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbiAodiwgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBMYXp5KHZbMF0pLmVhY2goZnVuY3Rpb24gKHJvdywgaWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoKHJlc291cmNlTmFtZSBpbiBJREIpICYmIChpZCBpbiBJREJbcmVzb3VyY2VOYW1lXS5zb3VyY2UpKXtcbiAgICAgICAgICAgICAgICAgICAgSURCW3Jlc291cmNlTmFtZV0uZ2V0KGlkKS5fcGVybWlzc2lvbnMgPSBMYXp5KHJvdykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHRydWVdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoTGF6eSh2WzBdKS5zaXplKCkpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3VwZGF0ZS1wZXJtaXNzaW9ucy0nICsgcmVzb3VyY2VOYW1lLCBMYXp5KHZbMF0pLmtleXMoKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMnKTtcbiAgICB9O1xuXG5cbiAgICB0aGlzLmdvdE0yTSA9IGZ1bmN0aW9uKG0ybSl7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICB2YXIgbTJtSW5kZXggPSBsaW5rZXIubTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbihtKXtcbiAgICAgICAgICAgICAgICBMYXp5KG0pLmVhY2goZnVuY3Rpb24oZGF0YSx2ZXJiKXtcbiAgICAgICAgICAgICAgICAgICAgbTJtSW5kZXhbdmVyYl0oZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3JlY2VpdmVkLW0ybScpO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBmZXRjaCByZXF1ZXN0ZWQgZGF0YSB3aXRoIGEgc2luZ2xlIGZpbHRlclxuICAgICAqL1xuICAgIHRoaXMuZmV0Y2ggPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBjYWxsQmFjaykgeyAgLy9cbiAgICAgICAgLy8gaWYgYSBjb25uZWN0aW9uIGlzIGN1cnJlbnRseSBydW5uaW5nLCB3YWl0IGZvciBjb25uZWN0aW9uLlxuICAgICAgICBpZiAobW9kZWxOYW1lIGluIHdhaXRpbmdDb25uZWN0aW9ucyl7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBjYWxsQmFjayk7XG4gICAgICAgICAgICB9LDUwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBmZXRjaGluZyBhc3luY2hyb21vdXMgbW9kZWwgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgKGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgICAgICAvLyBpZiBkYXRhIGNhbWVzIGZyb20gcmVhbHRpbWUgY29ubmVjdGlvblxuICAgICAgICAgICAgICAgIGlmIChXMlBSRVNPVVJDRS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIGdldHRpbmcgZmlsdGVyIGZpbHRlcmVkIGJ5IGNhY2hpbmcgc3lzdGVtXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlciA9IGxpc3RDYWNoZS5maWx0ZXIobW9kZWwsZmlsdGVyKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBpZiBzb210aGluZyBpcyBtaXNzaW5nIG9uIG15IGxvY2FsIERCIFxuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzayBmb3IgbWlzc2luZ3MgYW5kIHBhcnNlIHNlcnZlciByZXNwb25zZSBpbiBvcmRlciB0byBlbnJpY2ggbXkgbG9jYWwgREIuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGFjaW5nIGxvY2sgZm9yIHRoaXMgbW9kZWxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KG1vZGVsTmFtZSArICcubGlzdCcsIHtmaWx0ZXIgOiBmaWx0ZXJ9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsY2FsbEJhY2spO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgbG9ja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24ocmV0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVsZWFzZSBsb2NrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbHRlcjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcubGlzdCcsIHNlbmREYXRhLGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR09UX0FMTC5zb3VyY2UucHVzaChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0ID0gZnVuY3Rpb24obW9kZWxOYW1lLCBpZHMsIGNhbGxCYWNrKXtcbiAgICAgICAgLy8gc2VhcmNoIG9iamVjdHMgZnJvbSBJREIuIElmIHNvbWUgaWQgaXMgbWlzc2luZywgaXQgcmVzb2x2ZSBpdCBieSB0aGUgc2VydmVyXG4gICAgICAgIC8vIGlmIGEgcmVxdWVzdCB0byB0aGUgc2FtZSBtb2RlbCBpcyBwZW5kaW5nLCB3YWl0IGZvciBpdHMgY29tcGxldGlvblxuICAgICAgICBcbiAgICAgICAgaWYgKGlkcy5jb25zdHJ1Y3RvciAhPT0gQXJyYXkpe1xuICAgICAgICAgICAgaWRzID0gW2lkc107XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgc29tZSBlbnRpdHkgaXMgbWlzc2luZyBcbiAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lICwge2lkOiBpZHN9LCBudWxsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICB2YXIgaXRhYiA9IElEQlttb2RlbE5hbWVdXG4gICAgICAgICAgICBmb3IgKHZhciBpZCBpbiBpZHMpe1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKGl0YWIuc291cmNlW2lkc1tpZF1dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxCYWNrKHJldCk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLmdvdE1vZGVsID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgZm9yICh2YXIgbW9kZWxOYW1lIGluIGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBtb2RlbCA9IGRhdGFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZVsnZGVzY3JpcHRpb246JyArIG1vZGVsTmFtZV0gPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICAgICAgICAgIG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSA9IG1ha2VNb2RlbENsYXNzKG1vZGVsKTtcbiAgICAgICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBJREIpKSB7XG4gICAgICAgICAgICAgICAgSURCW21vZGVsTmFtZV0gPSBMYXp5KHt9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmRlc2NyaWJlID0gZnVuY3Rpb24obW9kZWxOYW1lLCBjYWxsQmFjayl7XG4gICAgICAgIHZhciByZXQgPSBtb2RlbENhY2hlW21vZGVsTmFtZV07XG4gICAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHJldCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmlzQ29ubmVjdGVkICYmICEobW9kZWxOYW1lIGluIHdhaXRpbmdDb25uZWN0aW9ucykpe1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gZmFpbGVkTW9kZWxzKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBjYWNoZUtleSA9ICdkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChjYWNoZUtleSBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nb3RNb2RlbChKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVtjYWNoZUtleV0pKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sobW9kZWxDYWNoZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy5kZXNjcmliZScsbnVsbCwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RNb2RlbChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbE5vdEZvdW5kLmhhbmRsZShtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbGVkTW9kZWxzW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHdhaXQgZm9yIGNvbm5lY3Rpb25cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gICAgICAgIFxuICAgIH07XG4gICAgdGhpcy5hZGRNb2RlbEhhbmRsZXIgPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBkZWNvcmF0b3IpIHtcbiAgICAgICAgdmFyIGtleSA9IHV0aWxzLmhhc2goZGVjb3JhdG9yKTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVycykpIGJ1aWxkZXJIYW5kbGVyc1ttb2RlbE5hbWVdID0gbmV3IEhhbmRsZXIoKTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVyVXNlZCkpIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdID0ge307XG4gICAgICAgIGlmIChrZXkgaW4gYnVpbGRlckhhbmRsZXJVc2VkW21vZGVsTmFtZV0pe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVpbGRlckhhbmRsZXJVc2VkW21vZGVsTmFtZV1ba2V5XSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBtb2RlbENhY2hlKSB7XG4gICAgICAgICAgICBkZWNvcmF0b3IobW9kZWxDYWNoZVttb2RlbE5hbWVdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyc1ttb2RlbE5hbWVdLmFkZEhhbmRsZXIoZGVjb3JhdG9yKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgdGhpcy5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgYXR0cmlidXRlcyl7XG4gICAgICAgIHZhciBhZGRQcm9wZXJ0eSA9IGZ1bmN0aW9uKG1vZGVsLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgYXR0cmlidXRlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbCl7XG4gICAgICAgICAgICB2YXIga2V5ID0gJ3BBOicgKyBtb2RlbC5tb2RlbE5hbWUgKyAnOicgKyB2YWw7XG4gICAgICAgICAgICB2YXIga2F0dHIgPSAnX18nICsgdmFsO1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG1vZGVsLnByb3RvdHlwZSwgdmFsLCB7XG4gICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZiAoIShrYXR0ciBpbiB0aGlzKSl7XG4gICAgICAgICAgICAgICAgICB2YXIgdiA9IGxvY2FsU3RvcmFnZVtrZXkgKyB0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICAgIHRoaXNba2F0dHJdID0gdj9KU09OLnBhcnNlKHYpOm51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW2thdHRyXTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgICAgICAgICAgdGhpc1trYXR0cl0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Vba2V5ICsgdGhpcy5pZF0gPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gcGVyc2lzdGVudEF0dHJpYnV0ZXMpKSB7IHBlcnNpc3RlbnRBdHRyaWJ1dGVzW21vZGVsTmFtZV0gPSBbXTsgfVxuICAgICAgICB2YXIgYXR0cnMgPSBwZXJzaXN0ZW50QXR0cmlidXRlc1ttb2RlbE5hbWVdO1xuICAgICAgICBpZiAoYXR0cmlidXRlcykge1xuICAgICAgICAgICAgdmFyIG5ld0F0dHJzID0gTGF6eShhdHRyaWJ1dGVzKS5kaWZmZXJlbmNlKGF0dHJzKS50b0FycmF5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3QXR0cnMgPSBhdHRycztcbiAgICAgICAgfVxuICAgICAgICBpZiAobmV3QXR0cnMubGVuZ3RoKXtcbiAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gbW9kZWxDYWNoZSl7XG4gICAgICAgICAgICAgICAgYWRkUHJvcGVydHkobW9kZWxDYWNoZVttb2RlbE5hbWVdLCBuZXdBdHRycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlcyl7XG4gICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoYXR0cnMsbmV3QXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLm9uKCduZXctbW9kZWwnLCBmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgIGlmIChtb2RlbC5tb2RlbE5hbWUgaW4gYnVpbGRlckhhbmRsZXJzKXtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyc1ttb2RlbC5tb2RlbE5hbWVdLmhhbmRsZShtb2RlbENhY2hlW21vZGVsLm1vZGVsTmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbC5tb2RlbE5hbWUgaW4gcGVyc2lzdGVudEF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMobW9kZWwubW9kZWxOYW1lKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5xdWVyeSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spe1xuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdGhpcy5kZXNjcmliZShtb2RlbE5hbWUsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgLy8gYXJyYXlmaXkgYWxsIGZpbHRlciB2YWx1ZXNcbiAgICAgICAgICAgIGZpbHRlciA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odixrKXsgcmV0dXJuIFtrLEFycmF5LmlzQXJyYXkodik/djpbdl1dfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgIHZhciBmaWx0ZXJGdW5jdGlvbiA9IHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICB2YXIgaWR4ID0gZ2V0SW5kZXgobW9kZWxOYW1lKTtcbiAgICAgICAgICAgIHRocy5mZXRjaChtb2RlbE5hbWUsZmlsdGVyLHRvZ2V0aGVyLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhpZHguZmlsdGVyKGZpbHRlckZ1bmN0aW9uKS52YWx1ZXMoKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzLCBjYWxsQmFjayl7XG4gICAgICAgIHJldHVybiB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcuZGVsZXRlJywgeyBpZCA6IGlkc30sIGNhbGxCYWNrKTtcbiAgICB9O1xuXG4gICAgdGhpcy5jb25uZWN0ID0gZnVuY3Rpb24gKGNhbGxCYWNrKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbm5lY3Rpb24uaXNMb2dnZWRJbikge1xuICAgICAgICAgICAgY2FsbEJhY2soKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5jb25uZWN0KGNhbGxCYWNrKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmZ1bmN0aW9uIHJlV2hlZWxPUk0oZW5kUG9pbnQsIGxvZ2luRnVuYyl7XG4gICAgdGhpcy4kb3JtID0gbmV3IGJhc2VPUk0obmV3IHV0aWxzLnJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBsb2dpbkZ1bmMpLHRoaXMpO1xuICAgIHRoaXMub24gPSB0aGlzLiRvcm0ub24uYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuZW1pdCA9IHRoaXMuJG9ybS5lbWl0LmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLnVuYmluZCA9IHRoaXMuJG9ybS51bmJpbmQuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMub25jZSA9IHRoaXMuJG9ybS5vbmNlO1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gdGhpcy4kb3JtLmFkZE1vZGVsSGFuZGxlci5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyA9IHRoaXMuJG9ybS5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcy5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy51dGlscyA9IHV0aWxzO1xuICAgIHRoaXMubG9nb3V0ID0gdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9nb3V0LmJpbmQodGhpcy4kb3JtLmNvbm5lY3Rpb24pO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXMuJG9ybS5jb25uZWN0aW9uO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoZnVuY3Rpb24oY2FsbEJhY2sscmVqZWN0KXtcbiAgICAgICAgY29ubmVjdGlvbi5jb25uZWN0KGNhbGxCYWNrKTtcbiAgICB9KSk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdGhpcy4kb3JtLmNvbm5lY3Rpb24ubG9naW4odXNlcm5hbWUsIHBhc3N3b3JkLCBhY2NlcHQpOyAgICBcbiAgICB9KS5iaW5kKHRoaXMpKTtcbiAgICBcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmxvZ291dCA9IGZ1bmN0aW9uKHVybCl7XG4gICAgcmV0dXJuIHRoaXMuJG9ybS5jb25uZWN0aW9uLmxvZ291dCgpO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRNb2RlbCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5kZXNjcmliZShtb2RlbE5hbWUsYWNjZXB0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obW9kZWxOYW1lLCBpZHMpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2luZ2xlID0gZmFsc2U7XG4gICAgdmFyIG1vZE5hbWUgPSBtb2RlbE5hbWU7XG4gICAgdmFyIGZpbHRlcjtcbiAgICBpZiAodHlwZW9mIGlkcyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgc2luZ2xlID0gdHJ1ZTtcbiAgICAgICAgZmlsdGVyID0geyBpZCA6IFtpZHNdfTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaWRzKSl7XG4gICAgICAgIGZpbHRlciA9IHsgaWQgOiBpZHMgfTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBpZHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGZpbHRlciA9IGlkcztcbiAgICB9IGVsc2UgaWYgKGlkcyA9PT0gbnVsbCkge1xuICAgICAgICBmaWx0ZXIgPSB7fTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIG51bGwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNpbmdsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KGRhdGEubGVuZ3RoID8gZGF0YVswXSA6IG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5xdWVyeSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgcmVsYXRlZCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHZhciB0b2dldGhlciA9IG51bGw7XG4gICAgICAgIGlmIChyZWxhdGVkICYmIChyZWxhdGVkLmNvbnN0cnVjdG9yID09PSBBcnJheSkgJiYgKHJlbGF0ZWQubGVuZ3RoKSl7XG4gICAgICAgICAgICB0b2dldGhlciA9IHJlbGF0ZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRlZCAmJiAocmVsYXRlZC5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKSAmJiAocmVsYXRlZC5sZW5ndGgpKXtcbiAgICAgICAgICAgIHRvZ2V0aGVyID0gcmVsYXRlZC5zcGxpdCgnLCcpO1xuICAgICAgICB9XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLnF1ZXJ5KG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuKi9cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgaWRzKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVsZXRlKG1vZGVsTmFtZSwgaWRzLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldExvZ2dlZFVzZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHRoaXMuJG9ybS5jb25uZWN0aW9uLmNhY2hlZFN0YXR1cy51c2VyX2lkKVxuICAgICAgICByZXR1cm4gdGhpcy5nZXQoJ2F1dGhfdXNlcicsdGhpcy4kb3JtLmNvbm5lY3Rpb24uY2FjaGVkU3RhdHVzLnVzZXJfaWQpO1xuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3QpIHtcbiAgICAgICAgICAgIHNlbGYub25jZSgnbG9nZ2VkLWluJyxmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5nZXQoJ2F1dGhfdXNlcicsIHVzZXIpLnRoZW4oYWNjZXB0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLiRzZW5kVG9FbmRwb2ludCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uJHBvc3QodXJsLCBkYXRhKTtcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIHJldHVybiB0aGlzLiRvcm0uY29ubmVjdGlvbi5sb2dpbih1c2VybmFtZSxwYXNzd29yZCk7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldFJlc291cmNlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvcm0gPSB0aGlzLiRvcm07XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KSB7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gb3JtLmNvbm5lY3Rpb247XG4gICAgICAgIHV0aWxzLnhkcihjb25uZWN0aW9uLmVuZFBvaW50ICsgJ2FwaS9yZXNvdXJjZXMnLG51bGwpLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKSB7XG4gICAgICAgICAgICAgICAgYWNjZXB0KHhoci5yZXNwb25zZURhdGEuc29ydCgpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhocik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRDb2xsZWN0aW9uID0gZnVuY3Rpb24obW9kZWxOYW1lLCBmaWx0ZXJPcklkcykge1xuICAgIHJldHVybiBuZXcgQ29sbGVjdGlvbihvcm0uJG9ybSwgZmlsdGVyT3JJZHMgfHwge30pOyAgXG59O1xuIl19
