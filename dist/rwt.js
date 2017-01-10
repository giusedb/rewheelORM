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
    var $POST = function (url, data, callBack, errorBack, headers) {
        var opts = {
            accepts: 'application/json',
            url: url,
            data: JSON.stringify(data),
            dataType: 'json',
            success: callBack,
            error: errorBack,
            method: 'POST',
            contentType: 'application/json'
        };
        if (headers) {
            opts.headers = headers;
            opts.crossDomain = true;
        }
        return $.ajax(opts);
    };
    function reWheelConnection(endPoint, getLogin) {
        // main 
        var self = this;
        this.getLogin = getLogin;
        this.events = new NamedEventManager();
        this.$POST = $POST.bind(this);
        this.options = { endPoint: endPoint };
        this.on = this.events.on.bind(this);
    }
    ;
    reWheelConnection.prototype.status = function (callBack, force) {
        if ('lastRWTStatus' in localStorage && !force) {
            try {
                var status = JSON.parse(localStorage.lastRWTStatus);
                for (var x in status) {
                    this.options[x] = status[x];
                }
            } catch (e) {
                return this.status(callBack, true);
            }
            return callBack && callBack(status);
        }
        if (this._status_calling) {
            var self = this;
            return setTimeout(function () {
                self.status(callBack);
            }, 50);
        }
        if (this.options && this.options.timestamp) {
            callBack && callBack(this.options);
        } else {
            this._status_calling = true;
            var self = this;
            return this.$post('api/status', null, function (status) {
                localStorage.lastRWTStatus = JSON.stringify(status);
                self._status_calling = false;
                for (var x in status) {
                    self.options[x] = status[x];
                }
                if (!status.user_id && self.getLogin) {
                    var logInfo = self.getLogin();
                    if (logInfo.constructor === Object) {
                        self.login(logInfo.username, logInfo.password).then(function (status) {
                            for (var x in status) {
                                self.options[x] = status[x];
                            }
                            localStorage.lastRWTStatus = JSON.stringify(status);
                            callBack && callBack(status);
                        });
                    }
                } else {
                    callBack && callBack(self.options);
                }
            });
        }
    };
    reWheelConnection.prototype.$post = function (url, data, callBack) {
        var ths = this;
        if (this.options && this.options.token) {
            if (!data) {
                data = {};
            }
        }
        if (this.options.token) {
            var headers = {
                token: this.options.token,
                application: this.options.application
            };
        } else {
            var headers = null;
        }
        var promise = new Promise(function (accept, reject) {
            utils.xdr(ths.options.endPoint + url, data, ths.options.application, ths.options.token).then(function (xhr) {
                ths.events.emit('http-response', xhr.responseText, xhr.status, url, data);
                ths.events.emit('http-response-' + xhr.status, xhr.responseText, url, data);
                if (xhr.responseData) {
                    ths.events.emit('http-response-' + xhr.status + '-json', xhr.responseData, url, data);
                }
                if (callBack) {
                    callBack(xhr.responseData || xhr.responseText);
                }
                ;
                accept(xhr.responseData || xhr.responseText);
            }, function (xhr) {
                if (xhr.responseData) {
                    ths.events.emit('error-json', xhr.responseData, xhr.status, url, data, xhr);
                    ths.events.emit('error-json-' + xhr.status, xhr.responseData, url, data, xhr);
                } else {
                    ths.events.emit('error-http', xhr.responseText, xhr.status, url, data, xhr);
                    ths.events.emit('error-http-' + xhr.status, xhr.responseText, url, data, xhr);
                }
                reject(xhr.responseData || xhr.responseText);
            });
        });
        return promise;
    };
    reWheelConnection.prototype.login = function (username, password) {
        var url = this.options.endPoint + 'api/login';
        var connection = this;
        return new Promise(function (accept, reject) {
            utils.xdr(url, {
                username: username,
                password: password
            }, null, connection.options.token, true).then(function (xhr) {
                var status = xhr.responseData;
                for (var x in status) {
                    connection.options[x] = status[x];
                }
                accept(status);
            }, function (xhr) {
                reject(xhr.responseData || responseText);
            });    /*        $.ajax({
//            headers : headers,
            url : url,
            data : { username: username, password : password},
            dataType : 'json',
            method : 'POST',
//            contentType : 'application/json',
            mimeType : 'application/json',
            crossDomain : true,
            success : function(status){
                for (var x in status){ connection.options[x] = status[x]; }
                accept(status);
            },
            error : function(xhr,data, status){
                reject(xhr.responseJSON);
            }
            
        })
*/
        });
    };
    reWheelConnection.prototype.connect = function (callBack) {
        var self = this;
        var wsconnect = function (self) {
            self.wsConnection = new utils.wsConnect(self.options);
            self.wsConnection.onConnect(function () {
                self.events.emit('ws-connected', self.wsConnection);
            });
            self.wsConnection.onDisconnect(function () {
                setTimeout(function () {
                    wsconnect(self);
                }, 1000);
            });
        };
        return this.status(function (status) {
            if ('token' in self.options) {
                callBack && callBack(status);
            } else {
                console.log('connecting to ' + self.options.endPoint);
                if (self.options.username && self.options.password) {
                    self.login(self.options.username, self.options.password, function (data) {
                        callBack && callBack(data);
                        console.log('renewing connection');
                    });
                }
            }
            if (status.token && status.realtimeEndPoint && !self.wsConnection) {
                wsconnect(self);
            }
        });
    };
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
        $POST: $POST,
        reWheelConnection: reWheelConnection,
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
                                status: req.statusText,
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
        wsConnect: function (options) {
            /**
         * Connects a websocket with reWheel connection
         */
            if (!options) {
                return;
            }
            var self = this;
            // registering all event handlers
            this.handlers = {
                wizard: new Handler(),
                onConnection: new Handler(),
                onDisconnection: new Handler(),
                onMessageJson: new Handler(),
                onMessageText: new Handler()
            };
            this.onWizard = this.handlers.wizard.addHandler.bind(this.handlers.wizard);
            this.onConnect = this.handlers.onConnection.addHandler.bind(this.handlers.onConnection);
            this.onDisconnect = this.handlers.onDisconnection.addHandler.bind(this.handlers.onDisconnection);
            this.onMessageJson = this.handlers.onMessageJson.addHandler.bind(this.handlers.onMessageJson);
            this.onMessageText = this.handlers.onMessageText.addHandler.bind(this.handlers.onMessageText);
            this.options = options;
            var connection = new SockJS(options.realtimeEndPoint);
            connection.onopen = function (x) {
                console.log('open : ' + x);
                connection.tenant();
                self.handlers.onConnection.handle(x);
            };
            connection.onmessage = function (x) {
                if (x.type == 'message') {
                    //$.notify(x.data);
                    try {
                        //TODO set fromRealtime
                        self.handlers.onMessageJson.handle(JSON.parse(x.data));    //TODO unset fromRealtime
                    } catch (e) {
                        self.handlers.onMessageText.handle(x.data);
                    }
                } else {
                    console.log(x);
                }
            };
            connection.onclose = function () {
                setTimeout(utils.wsConnect, 1000);
                self.handlers.onDisconnection.handle();
            };
            connection.tenant = function () {
                connection.send('TENANT:' + self.options.application + ':' + self.options.token);
            };
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
    function VacuumCacher(touch, asked, name) {
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
    function AutoLinker(events, actives, IDB, W2PRESOURCE, listCache) {
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
        events.on('model-definition', function (model) {
            // defining all indexes for primary key
            var pkIndex = listCache.getIndexFor(model.name, 'id');
            mainIndex[model.name] = new VacuumCacher(touch, pkIndex, 'mainIndex.' + model.name);
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
            console.log('adding ' + item);
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
        var events = connection.events;
        this.on = events.on.bind(this);
        this.emit = events.emit.bind(this);
        this.unbind = events.unbind.bind(this);
        this.$post = connection.$post.bind(connection);
        // handling websocket events
        events.on('ws-connected', function (ws) {
            console.info('Websocket connected');
            // all json data has to be parsed by gotData
            ws.onMessageJson(W2PRESOURCE.gotData.bind(W2PRESOURCE));
            //
            ws.onMessageText(function (message) {
                console.info('WS message : ' + message);
            });
        });
        events.on('ws-disconnected', function (ws) {
            console.error('Websocket disconnected');
        });
        events.on('error-json-404', function (error, url, sentData, xhr) {
            console.error('JSON error ', JSON.stringify(error));
            delete waitingConnections[url.split('/')[0]];
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
        var linker = new AutoLinker(events, waitingConnections, IDB, this, listCache);
        /*    window.ll = linker;
    window.lc = listCache;
*/
        this.validationEvent = events.on('error-json-513', function (data, url, sentData, xhr) {
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
            W2PRESOURCE.emit('model-definition', model);
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
                    $log.error('Tryed to redefine property ' + propertyName + 's' + ' for ' + Klass.modelName);
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
            events.emit('new-model', Klass);
            events.emit('new-model-' + Klass.modelName);
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
                        events.emit('updated-' + modelName, changed);
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
                        events.emit('new-' + modelName, Lazy(no), data.totalResults);
                    if (deleted) {
                        events.emit('deleted-' + modelName, deleted);
                    }
                    // sending events for data arrived
                    events.emit('received-' + modelName);
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
            events.emit('got-data');
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
                events.emit('received-m2m');
                events.emit('received-m2m-' + indexName);
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
                    if (W2PRESOURCE.connection.options.realtimeEndPoint) {
                        // getting filter filtered by caching system
                        filter = listCache.filter(model, filter);
                        // if somthing is missing on my local DB 
                        if (filter) {
                            // ask for missings and parse server response in order to enrich my local DB.
                            // placing lock for this model
                            waitingConnections[modelName] = true;
                            W2PRESOURCE.$post(modelName + '/list', { filter: filter }, function (data) {
                                W2PRESOURCE.gotData(data, callBack);
                                // release lock
                                delete waitingConnections[modelName];
                            }, function () {
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
                });
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
                            this.events.modelNotFound.handle(modelName);
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
        this.connect = function (callBack) {
            if (this.isConnected) {
                callBack(this.connection.options);
            } else {
                this.connection.connect(function (status) {
                    W2PRESOURCE.isConnected = true;
                    callBack(status);
                });
            }
        };
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
    };
    function reWheelORM(endPoint, loginFunc) {
        this.$orm = new baseORM(new utils.reWheelConnection(endPoint, loginFunc), this);
        this.on = this.$orm.on.bind(this.$orm);
        this.emit = this.$orm.emit.bind(this.$orm);
        this.unbind = this.$orm.unbind.bind(this.$orm);
        this.addModelHandler = this.$orm.addModelHandler.bind(this.$orm);
        this.addPersistentAttributes = this.$orm.addPersistentAttributes.bind(this.$orm);
        this.utils = utils;
    }
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
                if (self.$orm.isConnected) {
                    self.$orm.query(modelName, filter, together, accept);
                } else {
                    self.$orm.connect(function () {
                        self.$orm.query(modelName, filter, together, accept);
                    });
                }
            } catch (e) {
                reject(e);
            }
        });
    };
    reWheelORM.prototype.delete = function (modelName, ids) {
        var self = this;
        return new Promise(function (accept, reject) {
            try {
                if (self.$orm.connected) {
                    self.$orm.delete(modelName, ids, accept);
                } else {
                    self.$orm.connect(function () {
                        self.$orm.delete(modelName, ids, accept);
                    });
                }
            } catch (e) {
                reject(e);
            }
        });
    };
    reWheelORM.prototype.$sendToEndpoint = function (url, data) {
        return this.$orm.$post(url, data);
    };
    root.rwt = reWheelORM;
}(window, Lazy, SockJS));
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJ0b3VjaGVyLmpzIiwidmFjdXVtY2FjaGVyLmpzIiwiYXV0b2xpbmtlci5qcyIsImxpc3RjYWNoZXIuanMiLCJtYW55dG9tYW55LmpzIiwiY2FjaGVyLmpzIiwib3JtLmpzIl0sIm5hbWVzIjpbIkhhbmRsZXIiLCJoYW5kbGVycyIsInN0ckhhbmRsZXJzIiwicHJvdG90eXBlIiwiYWRkSGFuZGxlciIsImhhbmRsZXIiLCJzdHJIYW5kbGVyIiwidXRpbHMiLCJoYXNoIiwidG9TdHJpbmciLCJwdXNoIiwiaGFuZGxlIiwiYXJncyIsIkFycmF5Iiwic2xpY2UiLCJjYWxsIiwiYXJndW1lbnRzIiwiZm9yRWFjaCIsImZ1bmMiLCJhcHBseSIsImhhbmRsZUJ5IiwidGhzIiwiTmFtZWRFdmVudE1hbmFnZXIiLCJldmVudHMiLCJoYW5kbGVySWQiLCJpZHhJZCIsIm9uIiwibmFtZSIsImlkIiwiZW1pdCIsImV2ZW50IiwidW5iaW5kIiwiY291bnQiLCJMYXp5IiwiZWFjaCIsInYiLCJrIiwiaWR4IiwibiIsInJldmVyc2UiLCJ4Iiwic3BsaWNlIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsIiRQT1NUIiwidXJsIiwiZGF0YSIsImNhbGxCYWNrIiwiZXJyb3JCYWNrIiwiaGVhZGVycyIsIm9wdHMiLCJhY2NlcHRzIiwiSlNPTiIsInN0cmluZ2lmeSIsImRhdGFUeXBlIiwic3VjY2VzcyIsImVycm9yIiwibWV0aG9kIiwiY29udGVudFR5cGUiLCJjcm9zc0RvbWFpbiIsIiQiLCJhamF4IiwicmVXaGVlbENvbm5lY3Rpb24iLCJlbmRQb2ludCIsImdldExvZ2luIiwic2VsZiIsImJpbmQiLCJvcHRpb25zIiwic3RhdHVzIiwiZm9yY2UiLCJsb2NhbFN0b3JhZ2UiLCJwYXJzZSIsImxhc3RSV1RTdGF0dXMiLCJlIiwiX3N0YXR1c19jYWxsaW5nIiwic2V0VGltZW91dCIsInRpbWVzdGFtcCIsIiRwb3N0IiwidXNlcl9pZCIsImxvZ0luZm8iLCJjb25zdHJ1Y3RvciIsIk9iamVjdCIsImxvZ2luIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsInRoZW4iLCJ0b2tlbiIsImFwcGxpY2F0aW9uIiwicHJvbWlzZSIsIlByb21pc2UiLCJhY2NlcHQiLCJyZWplY3QiLCJ4ZHIiLCJ4aHIiLCJyZXNwb25zZVRleHQiLCJyZXNwb25zZURhdGEiLCJjb25uZWN0aW9uIiwiY29ubmVjdCIsIndzY29ubmVjdCIsIndzQ29ubmVjdGlvbiIsIndzQ29ubmVjdCIsIm9uQ29ubmVjdCIsIm9uRGlzY29ubmVjdCIsImNvbnNvbGUiLCJsb2ciLCJyZWFsdGltZUVuZFBvaW50IiwicmVuYW1lRnVuY3Rpb24iLCJmbiIsIkZ1bmN0aW9uIiwiY2FjaGVkIiwia2V5Iiwid3JhcHBlciIsImZvcm1FbmNvZGUiLCJyZXEiLCJYTUxIdHRwUmVxdWVzdCIsIm9ucmVhZHlzdGF0ZWNoYW5nZSIsInJlYWR5U3RhdGUiLCJhIiwicmVzcG9uc2UiLCJzdGF0dXNUZXh0IiwicmVxdWVzdCIsIlhEb21haW5SZXF1ZXN0Iiwib25sb2FkIiwiRXJyb3IiLCJvcGVuIiwib25lcnJvciIsInNldFJlcXVlc3RIZWFkZXIiLCJfX3Rva2VuX18iLCJzaXplIiwibWFwIiwiZW5jb2RlVVJJIiwidG9BcnJheSIsImpvaW4iLCJzZW5kIiwiY2FwaXRhbGl6ZSIsInMiLCJ0b1VwcGVyQ2FzZSIsInRvTG93ZXJDYXNlIiwic3RyIiwicmV0IiwibGVuZ3RoIiwiY2hhckNvZGVBdCIsIm1ha2VGaWx0ZXIiLCJtb2RlbCIsImZpbHRlciIsInVuaWZpZXIiLCJkb250VHJhbnNsYXRlRmlsdGVyIiwic291cmNlIiwidmFscyIsImZpZWxkIiwiaXNBcnJheSIsImZpZWxkcyIsInR5cGUiLCJOdW1iZXIiLCJzYW1lQXMiLCJ5Iiwid2l6YXJkIiwib25Db25uZWN0aW9uIiwib25EaXNjb25uZWN0aW9uIiwib25NZXNzYWdlSnNvbiIsIm9uTWVzc2FnZVRleHQiLCJvbldpemFyZCIsIlNvY2tKUyIsIm9ub3BlbiIsInRlbmFudCIsIm9ubWVzc2FnZSIsIm9uY2xvc2UiLCJwbHVyYWxpemUiLCJiZWZvcmVDYWxsIiwiYmVmb3JlIiwiZGVjb3JhdG9yIiwiY2xlYW5TdG9yYWdlIiwia2V5cyIsImNociIsInNwbGl0IiwicGVybXV0YXRpb25zIiwiYXJyIiwiYm9vbCIsIkJvb2xlYW4iLCJub29wIiwidHpPZmZzZXQiLCJEYXRlIiwiZ2V0VGltZXpvbmVPZmZzZXQiLCJ0cmFuc0ZpZWxkVHlwZSIsImRhdGUiLCJkYXRldGltZSIsInN0cmluZyIsInRleHQiLCJpbnRlZ2VyIiwicGFyc2VJbnQiLCJmbG9hdCIsInBhcnNlRmxvYXQiLCJtb2NrIiwiVG91Y2hlciIsInRvdWNoZWQiLCJ0b3VjaCIsInQiLCJWYWN1dW1DYWNoZXIiLCJhc2tlZCIsIm1pc3NpbmciLCJhc2siLCJsYXp5IiwiY29udGFpbnMiLCJnZXRBc2tlZEluZGV4IiwibWlzc2luZ3MiLCJ1bmlxdWUiLCJBdXRvTGlua2VyIiwiYWN0aXZlcyIsIklEQiIsIlcyUFJFU09VUkNFIiwibGlzdENhY2hlIiwibWFpbkluZGV4IiwiZm9yZWlnbktleXMiLCJtMm0iLCJtMm1JbmRleCIsInBlcm1pc3Npb25zIiwicGtJbmRleCIsImdldEluZGV4Rm9yIiwicmVmZXJlbmNlcyIsInJlZmVyZW5jZSIsImluZGV4TmFtZSIsInRvIiwicmVmZXJlbmNlZEJ5IiwiYnkiLCJtYW55VG9NYW55IiwicmVsYXRpb24iLCJNYW55VG9NYW55UmVsYXRpb24iLCJtMm1HZXQiLCJjb2xsZWN0aW9uIiwiZ290RGF0YSIsImdldE0yTSIsImxpbmtVbmxpbmtlZCIsInZhbHVlcyIsInN1bSIsImNoYW5nZWQiLCJpbmRleGVzIiwiaW5kZXgiLCJJTkRFWCIsImdldHRlciIsImlkcyIsIm90aGVySW5kZXgiLCJkZXNjcmliZSIsImZsYXR0ZW4iLCJtb2RlbE5hbWUiLCJpZGIiLCJmZXRjaCIsIm1haW5SZXNvdXJjZSIsImZpZWxkTmFtZSIsInRvT2JqZWN0IiwicmVzb3VyY2VOYW1lIiwiZ290UGVybWlzc2lvbnMiLCJQRVJNSVNTSU9OUyIsInNldEludGVydmFsIiwiTGlzdENhY2hlciIsImdvdEFsbCIsImNvbXBvc2l0ZUFza2VkIiwiY2FydGVzaWFuUHJvZHVjdDEiLCJiIiwiY2FydGVzaWFuUHJvZHVjdCIsImV4cGxvZGVGaWx0ZXIiLCJwcm9kdWN0IiwiciIsImZpbHRlclNpbmdsZSIsInRlc3RPbmx5IiwiZGlmZmVyZW5jZSIsImNsZWFuQ29tcG9zaXRlcyIsImZpbHRlckxlbiIsIml0ZW1zIiwiaXRlbSIsImdvdCIsInNpbmdsZSIsInNvbWUiLCJmIiwiZXhwbG9kZWQiLCJwYXJ0aWFscyIsImJhZCIsInBsdWNrIiwiYWRkIiwiZmluZCIsImdldDAiLCJnZXQxIiwiZGVsIiwibCIsImNhY2hlZFByb3BlcnR5QnlFdmVudHMiLCJwcm90byIsInByb3BlcnR5TmFtZSIsInNldHRlciIsInJlc3VsdCIsIm9ybSIsInByb3BlcnR5RGVmIiwidmFsdWUiLCJkZWZpbmVQcm9wZXJ0eSIsIlZhbGlkYXRpb25FcnJvciIsInJlc291cmNlIiwiX3Jlc291cmNlIiwiZm9ybUlkeCIsImVycm9ycyIsImJhc2VPUk0iLCJleHRPUk0iLCJTdHJpbmciLCJjb25uZWN0ZWQiLCJ3cyIsImluZm8iLCJtZXNzYWdlIiwic2VudERhdGEiLCJ3YWl0aW5nQ29ubmVjdGlvbnMiLCJhdXRoX2dyb3VwIiwiSURYIiwiUkVWSURYIiwiYnVpbGRlckhhbmRsZXJzIiwiYnVpbGRlckhhbmRsZXJVc2VkIiwicGVyc2lzdGVudEF0dHJpYnV0ZXMiLCJldmVudEhhbmRsZXJzIiwicGVybWlzc2lvbldhaXRpbmciLCJtb2RlbENhY2hlIiwiZmFpbGVkTW9kZWxzIiwibGlua2VyIiwidmFsaWRhdGlvbkV2ZW50IiwiY3VycmVudENvbnRleHQiLCJzYXZpbmdFcnJvckhhbmxkZXIiLCJnZXRJbmRleCIsImdldFVubGlua2VkIiwiVU5MSU5LRUQiLCJQZXJtaXNzaW9uVGFibGUiLCJrbGFzcyIsInNhdmUiLCJjYiIsIm15UGVybXMiLCJncm91cF9pZCIsInBlcm1pc3Npb25MaXN0IiwicCIsInBlcm1zIiwiYWxsUGVybWlzc2lvbnMiLCJpbmRleE9mIiwibWFrZU1vZGVsQ2xhc3MiLCJfbW9kZWwiLCJwcml2YXRlQXJncyIsIm1lcmdlIiwiZnVuY1N0cmluZyIsIktsYXNzIiwicmVmX3RyYW5zbGF0aW9ucyIsImludmVyc2VfcmVmZXJlbmNlcyIsInJlZmVyZW50cyIsImZpZWxkc09yZGVyIiwiZmllbGRPcmRlciIsInJlcHJlc2VudGF0aW9uIiwiZGVsZXRlIiwiX3Blcm1pc3Npb25zIiwiYWxsX3Blcm1zIiwib2JqZWN0X2lkIiwiZ3JvdXBlZCIsInVua25vd25fZ3JvdXBzIiwiZ3JvdXBCeSIsIm8iLCJhc1JhdyIsIklEIiwiYXJnIiwid3JpdGFibGUiLCJjb250ZXh0IiwiY29weSIsIm9iaiIsImFzciIsImNvbmNhdCIsInNhdmVNdWx0aSIsIm9iamVjdHMiLCJzY29wZSIsInJhdyIsImRlbGV0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsInNhdmVQQSIsIlQiLCJvbyIsIlBBIiwiRnMiLCJmaWVsZElkeCIsInRhcCIsImluZGV4QnkiLCJ3aWRnZXQiLCJyZWYiLCJleHRfcmVmIiwibG9jYWxfcmVmIiwiVHlwZUVycm9yIiwicmV2SW5kZXgiLCJoYXNPd25Qcm9wZXJ0eSIsIiRsb2ciLCJxdWVyeSIsImZpcnN0Iiwib21vZGVsTmFtZSIsInJlYWRhYmxlIiwidmFsaWRhdG9ycyIsInVubGlua1JlZmVyZW5jZSIsImluc3RhbmNlIiwiaW5zdGFuY2VzIiwib21vZGVsIiwibGlua1JlZmVyZW5jZSIsInJlZnMiLCJJTkRFWF9NMk0iLCJXMlBfUE9TVCIsIl9leHRyYSIsIlRPT05FIiwiVE9NQU5ZIiwiTUFOWVRPTUFOWSIsIm1vZGVsQ2xhc3MiLCJ6aXAiLCJkZWxldGVkIiwiTVBBIiwicmVjb3JkIiwiaXRhYiIsInRhYmxlIiwiaWsiLCJubmV3IiwidXBkYXRlZCIsIm5ld09iamVjdHMiLCJvbGRJdGVtIiwib2xkQ29weSIsIm5ld0l0ZW0iLCJubyIsInRvdGFsUmVzdWx0cyIsInVkeCIsIkFTS0VEX1VOTElOS0VEIiwiQVNLRURfTTJNIiwiTUlEWCIsImdvdE0yTSIsInJvdyIsIm0iLCJ2ZXJiIiwidG9nZXRoZXIiLCJzZW5kRGF0YSIsIkdPVF9BTEwiLCJnb3RNb2RlbCIsImNhY2hlS2V5IiwibW9kZWxOb3RGb3VuZCIsImFkZE1vZGVsSGFuZGxlciIsImFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiYXR0cmlidXRlcyIsImFkZFByb3BlcnR5IiwidmFsIiwia2F0dHIiLCJzZXQiLCJhdHRycyIsIm5ld0F0dHJzIiwiaXNDb25uZWN0ZWQiLCJmaWx0ZXJGdW5jdGlvbiIsInJlV2hlZWxPUk0iLCJsb2dpbkZ1bmMiLCIkb3JtIiwiZ2V0TW9kZWwiLCJtb2ROYW1lIiwicmVsYXRlZCIsIiRzZW5kVG9FbmRwb2ludCJdLCJtYXBwaW5ncyI6Ijs7O0lBQUEsYTtJQUVBLFNBQUFBLE9BQUEsR0FBQTtBQUFBLFFBQ0EsS0FBQUMsUUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLFFBRUEsS0FBQUMsV0FBQSxHQUFBLEVBQUEsQ0FGQTtBQUFBLEs7SUFHQSxDO0lBRUFGLE9BQUEsQ0FBQUcsU0FBQSxDQUFBQyxVQUFBLEdBQUEsVUFBQUMsT0FBQSxFQUFBO0FBQUEsUUFDQSxJQUFBQyxVQUFBLEdBQUFDLEtBQUEsQ0FBQUMsSUFBQSxDQUFBSCxPQUFBLENBQUFJLFFBQUEsRUFBQSxDQUFBLENBREE7QUFBQSxRQUVBLElBQUEsQ0FBQSxDQUFBSCxVQUFBLElBQUEsS0FBQUosV0FBQSxDQUFBLEVBQUE7QUFBQSxZQUNBLEtBQUFBLFdBQUEsQ0FBQUksVUFBQSxJQUFBRCxPQUFBLENBREE7QUFBQSxZQUVBLEtBQUFKLFFBQUEsQ0FBQVMsSUFBQSxD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Q0FrQixNQUFBLENBQUFsQixDQUFBLEVBREE7QUFBQSxhQVRBO0FBQUEsU0FBQSxDQUFBLENBRkE7QUFBQSxLQUFBLEM7SUFpQkF5WCxVQUFBLENBQUFuYyxTQUFBLENBQUF5YyxlQUFBLEdBQUEsVUFBQTNaLEdBQUEsRUFBQUMsSUFBQSxFQUFBO0FBQUEsUUFDQSxPQUFBLEtBQUFzWixJQUFBLENBQUF2WCxLQUFBLENBQUFoQyxHQUFBLEVBQUFDLElBQUEsQ0FBQSxDQURBO0FBQUEsS0FBQSxDIiwiZmlsZSI6InJ3dC5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gSGFuZGxlcigpe1xuICAgIHRoaXMuaGFuZGxlcnMgPSBbXTtcbiAgICB0aGlzLnN0ckhhbmRsZXJzID0ge307XG59O1xuXG5IYW5kbGVyLnByb3RvdHlwZS5hZGRIYW5kbGVyID0gZnVuY3Rpb24gKGhhbmRsZXIpe1xuICAgIHZhciBzdHJIYW5kbGVyID0gdXRpbHMuaGFzaChoYW5kbGVyLnRvU3RyaW5nKCkpO1xuICAgIGlmICghKHN0ckhhbmRsZXIgaW4gdGhpcy5zdHJIYW5kbGVycykpe1xuICAgICAgICB0aGlzLnN0ckhhbmRsZXJzW3N0ckhhbmRsZXJdID0gaGFuZGxlcjtcbiAgICAgICAgdGhpcy5oYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH1cbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApO1xuICAgIHRoaXMuaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihmdW5jKXtcbiAgICAgICAgZnVuYy5hcHBseShudWxsLGFyZ3MpO1xuICAgIH0pXG59O1xuSGFuZGxlci5wcm90b3R5cGUuaGFuZGxlQnkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgIHZhciB0aHMgPSBhcmd1bWVudHNbMF07XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KHRocyxhcmdzKTtcbiAgICB9KVxufTtcblxuXG5mdW5jdGlvbiBOYW1lZEV2ZW50TWFuYWdlciAoKXtcbiAgICB2YXIgZXZlbnRzID0ge307XG4gICAgdmFyIGhhbmRsZXJJZCA9IHt9O1xuICAgIHZhciBpZHhJZCA9IDA7XG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKG5hbWUsIGZ1bmMpe1xuICAgICAgICBpZiAoIShuYW1lIGluIGV2ZW50cykpe1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdID0gbmV3IEFycmF5KCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkID0gaWR4SWQgKys7XG4gICAgICAgIGV2ZW50c1tuYW1lXS5wdXNoKGZ1bmMpO1xuICAgICAgICBoYW5kbGVySWRbaWRdID0gZnVuYztcbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH07XG4gICAgdGhpcy5lbWl0ID0gZnVuY3Rpb24obmFtZSl7XG4gICAgICAgIGlmIChuYW1lIGluIGV2ZW50cyl7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKTtcbiAgICAgICAgICAgIGV2ZW50c1tuYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgICAgICBldmVudC5hcHBseShudWxsLGFyZ3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMudW5iaW5kID0gZnVuY3Rpb24oaGFuZGxlcil7XG4gICAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICAgIGlmIChoYW5kbGVyIGluIGhhbmRsZXJJZCl7XG4gICAgICAgICAgICB2YXIgZnVuYyA9IGhhbmRsZXJJZFtoYW5kbGVyICsgJyddO1xuICAgICAgICAgICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbiBpbiB2KXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZbbl0gPT09IGZ1bmMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWR4LnB1c2gobik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlkeC5yZXZlcnNlKCkuZm9yRWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgdi5zcGxpY2UoeCwxKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBoYW5kbGVySWRbaGFuZGxlcl07XG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICB9O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2FjaGVkS2V5SWR4ID0gMDtcblxudmFyIG51bGxTdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICcnfTtcblxuZnVuY3Rpb24gbW9ja09iamVjdCgpe1xuICAgIHJldHVybiBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbih0YXJnZXQsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbmFtZSAgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSA9PT0gJ3RvU3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbFN0cmluZztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbW9ja09iamVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtuYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG59XG5cbnZhciAkUE9TVCA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgY2FsbEJhY2ssIGVycm9yQmFjayxoZWFkZXJzKXtcbiAgICB2YXIgb3B0cyA9IHtcbiAgICAgICAgYWNjZXB0cyA6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgdXJsIDogdXJsLFxuICAgICAgICBkYXRhIDogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIGRhdGFUeXBlIDogJ2pzb24nLFxuICAgICAgICBzdWNjZXNzIDogY2FsbEJhY2ssXG4gICAgICAgIGVycm9yIDogZXJyb3JCYWNrLFxuICAgICAgICBtZXRob2QgOiAnUE9TVCcsXG4gICAgICAgIGNvbnRlbnRUeXBlIDogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgfTtcbiAgICBpZiAoaGVhZGVycyl7XG4gICAgICAgIG9wdHMuaGVhZGVycyA9IGhlYWRlcnM7XG4gICAgICAgIG9wdHMuY3Jvc3NEb21haW4gPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gJC5hamF4KG9wdHMpO1xufVxuXG5mdW5jdGlvbiByZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgZ2V0TG9naW4pe1xuICAgIC8vIG1haW4gXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZ2V0TG9naW4gPSBnZXRMb2dpbjtcbiAgICB0aGlzLmV2ZW50cyA9IG5ldyBOYW1lZEV2ZW50TWFuYWdlcigpXG4gICAgdGhpcy4kUE9TVCA9ICRQT1NULmJpbmQodGhpcyk7XG4gICAgdGhpcy5vcHRpb25zID0ge2VuZFBvaW50IDogZW5kUG9pbnR9O1xuICAgIHRoaXMub24gPSB0aGlzLmV2ZW50cy5vbi5iaW5kKHRoaXMpO1xufTtcbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5zdGF0dXMgPSBmdW5jdGlvbihjYWxsQmFjaywgZm9yY2Upe1xuICAgIGlmICgoJ2xhc3RSV1RTdGF0dXMnIGluIGxvY2FsU3RvcmFnZSkgJiYgIWZvcmNlKSB7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHZhciBzdGF0dXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzKTtcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gc3RhdHVzKXsgdGhpcy5vcHRpb25zW3hdID0gc3RhdHVzW3hdOyB9XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzKGNhbGxCYWNrLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3N0YXR1c19jYWxsaW5nKXtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5zdGF0dXMoY2FsbEJhY2spO1xuICAgICAgICB9LDUwKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMudGltZXN0YW1wKXtcbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sodGhpcy5vcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGF0dXNfY2FsbGluZyA9IHRydWU7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHRoaXMuJHBvc3QoJ2FwaS9zdGF0dXMnLG51bGwsZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgICAgIHNlbGYuX3N0YXR1c19jYWxsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIHN0YXR1cyl7IHNlbGYub3B0aW9uc1t4XSA9IHN0YXR1c1t4XTsgfVxuICAgICAgICAgICAgaWYgKCFzdGF0dXMudXNlcl9pZCAmJiBzZWxmLmdldExvZ2luKXtcbiAgICAgICAgICAgICAgICB2YXIgbG9nSW5mbyA9IHNlbGYuZ2V0TG9naW4oKTtcbiAgICAgICAgICAgICAgICBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2dpbihsb2dJbmZvLnVzZXJuYW1lLCBsb2dJbmZvLnBhc3N3b3JkKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBzdGF0dXMpeyBzZWxmLm9wdGlvbnNbeF0gPSBzdGF0dXNbeF07IH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cylcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHNlbGYub3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgfVxufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLiRwb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLGNhbGxCYWNrKXtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIGlmICghZGF0YSl7XG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIHZhciBoZWFkZXJzID0geyBcbiAgICAgICAgICAgIHRva2VuIDogdGhpcy5vcHRpb25zLnRva2VuLFxuICAgICAgICAgICAgYXBwbGljYXRpb24gOiB0aGlzLm9wdGlvbnMuYXBwbGljYXRpb25cbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaGVhZGVycyA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRocy5vcHRpb25zLmVuZFBvaW50ICsgdXJsLCBkYXRhLCB0aHMub3B0aW9ucy5hcHBsaWNhdGlvbiwgdGhzLm9wdGlvbnMudG9rZW4pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZScsIHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzICsgJy1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7IGNhbGxCYWNrKCB4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQgKX07XG4gICAgICAgICAgICAgICAgYWNjZXB0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItanNvbicsIHhoci5yZXNwb25zZURhdGEsIHhoci5zdGF0dXMsIHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1qc29uLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VEYXRhLHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1odHRwJyx4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItaHR0cC0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIHZhciB1cmwgPSB0aGlzLm9wdGlvbnMuZW5kUG9pbnQgKyAnYXBpL2xvZ2luJztcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodXJsLHsgdXNlcm5hbWU6IHVzZXJuYW1lLCBwYXNzd29yZCA6IHBhc3N3b3JkfSwgbnVsbCxjb25uZWN0aW9uLm9wdGlvbnMudG9rZW4sIHRydWUpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHZhciBzdGF0dXMgPSB4aHIucmVzcG9uc2VEYXRhO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHggaW4gc3RhdHVzKXsgY29ubmVjdGlvbi5vcHRpb25zW3hdID0gc3RhdHVzW3hdOyB9XG4gICAgICAgICAgICAgICAgYWNjZXB0KHN0YXR1cyk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VEYXRhIHx8IHJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbi8qICAgICAgICAkLmFqYXgoe1xuLy8gICAgICAgICAgICBoZWFkZXJzIDogaGVhZGVycyxcbiAgICAgICAgICAgIHVybCA6IHVybCxcbiAgICAgICAgICAgIGRhdGEgOiB7IHVzZXJuYW1lOiB1c2VybmFtZSwgcGFzc3dvcmQgOiBwYXNzd29yZH0sXG4gICAgICAgICAgICBkYXRhVHlwZSA6ICdqc29uJyxcbiAgICAgICAgICAgIG1ldGhvZCA6ICdQT1NUJyxcbi8vICAgICAgICAgICAgY29udGVudFR5cGUgOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICBtaW1lVHlwZSA6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgIGNyb3NzRG9tYWluIDogdHJ1ZSxcbiAgICAgICAgICAgIHN1Y2Nlc3MgOiBmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHggaW4gc3RhdHVzKXsgY29ubmVjdGlvbi5vcHRpb25zW3hdID0gc3RhdHVzW3hdOyB9XG4gICAgICAgICAgICAgICAgYWNjZXB0KHN0YXR1cyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3IgOiBmdW5jdGlvbih4aHIsZGF0YSwgc3RhdHVzKXtcbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlSlNPTik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfSlcbiovXG4gICAgfSk7XG59O1xucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbihjYWxsQmFjayl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB3c2Nvbm5lY3QgPSBmdW5jdGlvbihzZWxmKXtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24gPSBuZXcgdXRpbHMud3NDb25uZWN0KHNlbGYub3B0aW9ucyk7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uLm9uQ29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5ldmVudHMuZW1pdCgnd3MtY29ubmVjdGVkJywgc2VsZi53c0Nvbm5lY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24ub25EaXNjb25uZWN0KGZ1bmN0aW9uKCl7IFxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHdzY29ubmVjdChzZWxmKTsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9LDEwMDApO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5zdGF0dXMoZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgaWYgKCd0b2tlbicgaW4gc2VsZi5vcHRpb25zKXtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdGluZyB0byAnICsgc2VsZi5vcHRpb25zLmVuZFBvaW50KTtcbiAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnMudXNlcm5hbWUgJiYgc2VsZi5vcHRpb25zLnBhc3N3b3JkKXtcbiAgICAgICAgICAgICAgICBzZWxmLmxvZ2luKFxuICAgICAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMudXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucy5wYXNzd29yZCxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZW5ld2luZyBjb25uZWN0aW9uJylcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhdHVzLnRva2VuICYmIHN0YXR1cy5yZWFsdGltZUVuZFBvaW50ICYmICghc2VsZi53c0Nvbm5lY3Rpb24pKXtcbiAgICAgICAgICAgIHdzY29ubmVjdChzZWxmKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxudmFyIHV0aWxzID0ge1xuICAgIHJlbmFtZUZ1bmN0aW9uIDogZnVuY3Rpb24gKG5hbWUsIGZuKSB7XG4gICAgICAgIHJldHVybiAobmV3IEZ1bmN0aW9uKFwicmV0dXJuIGZ1bmN0aW9uIChjYWxsKSB7IHJldHVybiBmdW5jdGlvbiBcIiArIG5hbWUgK1xuICAgICAgICAgICAgXCIgKCkgeyByZXR1cm4gY2FsbCh0aGlzLCBhcmd1bWVudHMpIH07IH07XCIpKCkpKEZ1bmN0aW9uLmFwcGx5LmJpbmQoZm4pKTtcbiAgICB9LFxuICAgIGNhY2hlZCA6IGZ1bmN0aW9uKGZ1bmMsIGtleSl7XG4gICAgICAgIGlmICgha2V5KXsgICAgXG4gICAgICAgICAgICBrZXkgPSAnXycgKyBjYWNoZWRLZXlJZHgrKztcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiB3cmFwcGVyKCl7XG4gICAgICAgICAgICBpZiAoIXRoaXNba2V5XSl7XG4gICAgICAgICAgICAgICAgdGhpc1trZXldID0gZnVuYy5jYWxsKHRoaXMsW2FyZ3VtZW50c10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNba2V5XTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHdyYXBwZXI7XG4gICAgfSxcbiAgICAkUE9TVCA6ICRQT1NULFxuICAgIHJlV2hlZWxDb25uZWN0aW9uOiByZVdoZWVsQ29ubmVjdGlvbixcbiAgICBsb2c6IGZ1bmN0aW9uKCl7IFxuICAgICAgICBjb25zb2xlLmxvZyhhcmd1bWVudHMpO1xuICAgIH0sXG5cbiAgICB4ZHI6IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGFwcGxpY2F0aW9uLHRva2VuLCBmb3JtRW5jb2RlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlIGFuIEhUVFAgUmVxdWVzdCBhbmQgcmV0dXJuIGl0cyBwcm9taXNlLlxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgcmVxO1xuICAgICAgICAgICAgaWYgKCFkYXRhKSB7IGRhdGEgPSB7fTt9XG5cbiAgICAgICAgICAgIGlmKFhNTEh0dHBSZXF1ZXN0KSB7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgICAgICAgICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2VEYXRhID0gSlNPTi5wYXJzZShyZXEucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZURhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlID0ge3Jlc3BvbnNlRGF0YTogcmVzcG9uc2VEYXRhLCByZXNwb25zZVRleHQ6IHJlcS5yZXNwb25zZVRleHQsc3RhdHVzOiByZXEuc3RhdHVzVGV4dCwgcmVxdWVzdDogcmVxfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXEuc3RhdHVzID49IDIwMCAmJiByZXEuc3RhdHVzIDwgNDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYoWERvbWFpblJlcXVlc3Qpe1xuICAgICAgICAgICAgICAgIHJlcSA9IG5ldyBYRG9tYWluUmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgIHJlcS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgYWNjZXB0KHJlcS5yZXNwb25zZVRleHQscmVxLnN0YXR1c1RleHQsIHJlcSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignQ09SUyBub3Qgc3VwcG9ydGVkJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXEub3BlbignUE9TVCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgICAgICByZXEub25lcnJvciA9IHJlamVjdDtcbiAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgICAgICBpZiAodG9rZW4pIHsgZGF0YS5fX3Rva2VuX18gPSB0b2tlbiB9XG4gICAgICAgICAgICBpZiAoIWZvcm1FbmNvZGUpe1xuICAgICAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCd0ZXh0L3BsYWluJyk7XG4gICAgICAgICAgICAgICAgZGF0YSA9IExhenkoZGF0YSkuc2l6ZSgpP0pTT04uc3RyaW5naWZ5KGRhdGEpOicnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyk7XG4gICAgICAgICAgICAgICAgZGF0YSA9IExhenkoZGF0YSkubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gayArICc9JyArIGVuY29kZVVSSSh2LnRvU3RyaW5nKCkpOyAgXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpLmpvaW4oJyYnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcS5zZW5kKGRhdGEpO1xuICAgIC8vICAgICAgICByZXEuc2VuZChudWxsKTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIGNhcGl0YWxpemUgOiBmdW5jdGlvbiAocykge1xuICAgICAgICByZXR1cm4gc1swXS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgIH0sXG5cbiAgICBoYXNoIDogZnVuY3Rpb24oc3RyKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhhc2hlZCBmdW5jdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgc3RyID0gc3RyLnRvU3RyaW5nKCk7XG4gICAgICAgIHZhciByZXQgPSAxO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDt4PHN0ci5sZW5ndGg7eCsrKXtcbiAgICAgICAgICAgIHJldCAqPSAoMSArIHN0ci5jaGFyQ29kZUF0KHgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHJldCAlIDM0OTU4Mzc0OTU3KS50b1N0cmluZygpO1xuICAgIH0sXG5cbiAgICBtYWtlRmlsdGVyIDogZnVuY3Rpb24gKG1vZGVsLCBmaWx0ZXIsIHVuaWZpZXIsIGRvbnRUcmFuc2xhdGVGaWx0ZXIpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ha2UgZmlsdGVyIGZvciBBcnJheS5maWx0ZXIgZnVuY3Rpb24gYXMgYW4gYW5kIG9mIG9yXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoIXVuaWZpZXIpIHsgdW5pZmllciA9ICcgJiYgJzt9XG4gICAgICAgIGlmIChMYXp5KGZpbHRlcikuc2l6ZSgpID09PSAwKXtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KXsgcmV0dXJuIHRydWUgfTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc291cmNlID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2YWxzLCBmaWVsZCl7XG4gICAgICAgICAgICBpZiAoIXZhbHMpIHsgdmFscyA9IFtudWxsXX1cbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWxzKSl7XG4gICAgICAgICAgICAgICAgdmFscyA9IFt2YWxzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZG9udFRyYW5zbGF0ZUZpbHRlciAmJiAobW9kZWwuZmllbGRzW2ZpZWxkXS50eXBlID09PSAncmVmZXJlbmNlJykpIHtcbiAgICAgICAgICAgICAgICBmaWVsZCA9ICdfJyArIGZpZWxkO1xuICAgICAgICAgICAgICAgIHZhbHMgPSBMYXp5KHZhbHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHggJiYgKHguY29uc3RydWN0b3IgIT09IE51bWJlcikpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobW9kZWwuZmllbGRzW2ZpZWxkXS50eXBlID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgdmFscyA9IHZhbHMubWFwKEpTT04uc3RyaW5naWZ5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAnKCcgKyAgTGF6eSh2YWxzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcoeC4nICsgZmllbGQgKyAnID09PSAnICsgeCArICcpJztcbiAgICAgICAgICAgIH0pLmpvaW4oJyB8fCAnKSAgKycpJztcbiAgICAgICAgfSkudG9BcnJheSgpLmpvaW4odW5pZmllcik7XG4gICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJ4XCIsIFwicmV0dXJuIFwiICsgc291cmNlKTtcbiAgICB9LFxuXG4gICAgc2FtZUFzIDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZXAgZXF1YWxcbiAgICAgICAgICovXG4gICAgICAgIGZvciAodmFyIGsgaW4geCkge1xuICAgICAgICAgICAgaWYgKHlba10gIT0geFtrXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG5cbiAgICB3c0Nvbm5lY3QgOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICAvKipcbiAgICAgICAgICogQ29ubmVjdHMgYSB3ZWJzb2NrZXQgd2l0aCByZVdoZWVsIGNvbm5lY3Rpb25cbiAgICAgICAgICovXG4gICAgICAgIGlmKCFvcHRpb25zKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyByZWdpc3RlcmluZyBhbGwgZXZlbnQgaGFuZGxlcnNcblxuICAgICAgICB0aGlzLmhhbmRsZXJzID0ge1xuICAgICAgICAgICAgd2l6YXJkIDogbmV3IEhhbmRsZXIoKSxcbiAgICAgICAgICAgIG9uQ29ubmVjdGlvbiA6IG5ldyBIYW5kbGVyKCksXG4gICAgICAgICAgICBvbkRpc2Nvbm5lY3Rpb24gOiBuZXcgSGFuZGxlcigpLFxuICAgICAgICAgICAgb25NZXNzYWdlSnNvbiA6IG5ldyBIYW5kbGVyKCksXG4gICAgICAgICAgICBvbk1lc3NhZ2VUZXh0IDogbmV3IEhhbmRsZXIoKVxuICAgICAgICB9XG4gICAgICAgIHRoaXMub25XaXphcmQgPSB0aGlzLmhhbmRsZXJzLndpemFyZC5hZGRIYW5kbGVyLmJpbmQodGhpcy5oYW5kbGVycy53aXphcmQpO1xuICAgICAgICB0aGlzLm9uQ29ubmVjdCA9IHRoaXMuaGFuZGxlcnMub25Db25uZWN0aW9uLmFkZEhhbmRsZXIuYmluZCh0aGlzLmhhbmRsZXJzLm9uQ29ubmVjdGlvbik7XG4gICAgICAgIHRoaXMub25EaXNjb25uZWN0ID0gdGhpcy5oYW5kbGVycy5vbkRpc2Nvbm5lY3Rpb24uYWRkSGFuZGxlci5iaW5kKHRoaXMuaGFuZGxlcnMub25EaXNjb25uZWN0aW9uKTtcbiAgICAgICAgdGhpcy5vbk1lc3NhZ2VKc29uID0gdGhpcy5oYW5kbGVycy5vbk1lc3NhZ2VKc29uLmFkZEhhbmRsZXIuYmluZCh0aGlzLmhhbmRsZXJzLm9uTWVzc2FnZUpzb24pO1xuICAgICAgICB0aGlzLm9uTWVzc2FnZVRleHQgPSB0aGlzLmhhbmRsZXJzLm9uTWVzc2FnZVRleHQuYWRkSGFuZGxlci5iaW5kKHRoaXMuaGFuZGxlcnMub25NZXNzYWdlVGV4dCk7XG5cbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9uc1xuXG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gbmV3IFNvY2tKUyhvcHRpb25zLnJlYWx0aW1lRW5kUG9pbnQpO1xuICAgICAgICBjb25uZWN0aW9uLm9ub3BlbiA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb3BlbiA6ICcgKyB4KTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24udGVuYW50KCk7XG4gICAgICAgICAgICBzZWxmLmhhbmRsZXJzLm9uQ29ubmVjdGlvbi5oYW5kbGUoeCk7XG4gICAgICAgIH07XG4gICAgICAgIGNvbm5lY3Rpb24ub25tZXNzYWdlID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGlmICh4LnR5cGUgPT0gJ21lc3NhZ2UnKSB7XG4gICAgICAgICAgICAgICAgLy8kLm5vdGlmeSh4LmRhdGEpO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBzZXQgZnJvbVJlYWx0aW1lXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuaGFuZGxlcnMub25NZXNzYWdlSnNvbi5oYW5kbGUoSlNPTi5wYXJzZSh4LmRhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIHVuc2V0IGZyb21SZWFsdGltZVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmhhbmRsZXJzLm9uTWVzc2FnZVRleHQuaGFuZGxlKHguZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgY29ubmVjdGlvbi5vbmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2V0VGltZW91dCh1dGlscy53c0Nvbm5lY3QsMTAwMCk7XG4gICAgICAgICAgICBzZWxmLmhhbmRsZXJzLm9uRGlzY29ubmVjdGlvbi5oYW5kbGUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgY29ubmVjdGlvbi50ZW5hbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25uZWN0aW9uLnNlbmQoJ1RFTkFOVDonICsgc2VsZi5vcHRpb25zLmFwcGxpY2F0aW9uICsgJzonICsgc2VsZi5vcHRpb25zLnRva2VuKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBwbHVyYWxpemUgOiBmdW5jdGlvbihzdHIsIG1vZGVsKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIExleGljYWxseSByZXR1cm5zIGVuZ2xpc2ggcGx1cmFsIGZvcm1cbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBzdHIgKyAncyc7XG4gICAgfSxcblxuICAgIGJlZm9yZUNhbGwgOiBmdW5jdGlvbihmdW5jLCBiZWZvcmUpe1xuICAgICAgICB2YXIgZGVjb3JhdG9yID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGJlZm9yZSgpLnRoZW4oZnVuYylcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGRlY29yYXRvcjtcbiAgICB9LFxuXG4gICAgY2xlYW5TdG9yYWdlIDogZnVuY3Rpb24oKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENsZWFuIGxvY2FsU3RvcmFnZSBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIExhenkobG9jYWxTdG9yYWdlKS5rZXlzKCkuZWFjaChmdW5jdGlvbihrKXtcbiAgICAgICAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2Vba107XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICByZXZlcnNlIDogZnVuY3Rpb24gKGNociwgc3RyKSB7XG4gICAgICAgIHJldHVybiBzdHIuc3BsaXQoY2hyKS5yZXZlcnNlKCkuam9pbihjaHIpO1xuICAgIH0sXG4gICAgcGVybXV0YXRpb25zOiBmdW5jdGlvbihhcnIpe1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGZvciAodmFyIHggPSBhcnIubGVuZ3RoLTE7IHggPj0gMDt4LS0pe1xuICAgICAgICAgICAgZm9yICh2YXIgeSA9IGFyci5sZW5ndGgtMTsgeSA+PSAwOyB5LS0pe1xuICAgICAgICAgICAgICAgIGlmICh4ICE9PSB5KVxuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChbYXJyW3hdLCBhcnJbeV1dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG5cbiAgICBib29sOiBCb29sZWFuLFxuXG4gICAgbm9vcCA6IGZ1bmN0aW9uKCl7fSxcblxuICAgIHR6T2Zmc2V0OiBuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCxcblxuICAgIHRyYW5zRmllbGRUeXBlOiB7XG4gICAgICAgIGRhdGU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG5ldyBEYXRlKHggKiAxMDAwICsgdXRpbHMudHpPZmZzZXQgKSB9LFxuICAgICAgICBkYXRldGltZTogZnVuY3Rpb24oeCkgeyByZXR1cm4gbmV3IERhdGUoeCAqIDEwMDAgKyB1dGlscy50ek9mZnNldCApIH0sXG4gICAgICAgIHN0cmluZzogZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b1N0cmluZygpOyB9LFxuICAgICAgICB0ZXh0OiBmdW5jdGlvbih4KSB7IHJldHVybiB4LnRvU3RyaW5nKCk7IH0sXG4gICAgICAgIGludGVnZXI6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBhcnNlSW50KHgpOyB9LFxuICAgICAgICBmbG9hdDogZnVuY3Rpb24oeCkgeyByZXR1cm4gcGFyc2VGbG9hdCh4KTsgfVxuICAgIH0sIFxuICAgIG1vY2sgOiBtb2NrT2JqZWN0XG59O1xuXG5cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVG91Y2hlcigpe1xuICAgIHZhciB0b3VjaGVkID0gZmFsc2VcbiAgICB0aGlzLnRvdWNoID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdG91Y2hlZCA9IHRydWU7XG4gICAgfTtcbiAgICB0aGlzLnRvdWNoZWQgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdCA9IHRvdWNoZWQ7XG4gICAgICAgIHRvdWNoZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHQ7XG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5cbmZ1bmN0aW9uIFZhY3V1bUNhY2hlcih0b3VjaCwgYXNrZWQsIG5hbWUpe1xuLypcbiAgICBpZiAobmFtZSl7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnY3JlYXRlZCBWYWN1dW1DYWNoZXIgYXMgJyArIG5hbWUpO1xuICAgIH1cbiovXG4gICAgaWYgKCFhc2tlZCl7XG4gICAgICAgIHZhciBhc2tlZCA9IFtdO1xuICAgIH1cbiAgICB2YXIgbWlzc2luZyA9IFtdO1xuICAgIFxuICAgIHRoaXMuYXNrID0gZnVuY3Rpb24gKGlkLGxhenkpe1xuICAgICAgICBpZiAoIUxhenkoYXNrZWQpLmNvbnRhaW5zKGlkKSl7XG4vLyAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnYXNraW5nICgnICsgaWQgKyAnKSBmcm9tICcgKyBuYW1lKTtcbiAgICAgICAgICAgIG1pc3NpbmcucHVzaChpZCk7XG4gICAgICAgICAgICBpZiAoIWxhenkpXG4gICAgICAgICAgICAgICAgYXNrZWQucHVzaChpZCk7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICB9IFxuLy8gICAgICAgIGVsc2UgY29uc29sZS53YXJuKCcoJyArIGlkICsgJykgd2FzIGp1c3QgYXNrZWQgb24gJyArIG5hbWUpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEFza2VkSW5kZXggPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gYXNrZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5taXNzaW5ncyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBMYXp5KG1pc3Npbmcuc3BsaWNlKDAsbWlzc2luZy5sZW5ndGgpKS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgfVxufVxuIiwiZnVuY3Rpb24gQXV0b0xpbmtlcihldmVudHMsIGFjdGl2ZXMsIElEQiwgVzJQUkVTT1VSQ0UsIGxpc3RDYWNoZSl7XG4gICAgdmFyIHRvdWNoID0gbmV3IFRvdWNoZXIoKTtcbiAgICB2YXIgbWFpbkluZGV4ID0ge307XG4gICAgdmFyIGZvcmVpZ25LZXlzID0ge307XG4gICAgdmFyIG0ybSA9IHt9O1xuICAgIHZhciBtMm1JbmRleCA9IHt9O1xuICAgIHZhciBwZXJtaXNzaW9ucyA9IHt9O1xuICAgIHRoaXMubWFpbkluZGV4ID0gbWFpbkluZGV4O1xuICAgIHRoaXMuZm9yZWlnbktleXMgPSBmb3JlaWduS2V5cztcbiAgICB0aGlzLm0ybSA9IG0ybTtcbiAgICB0aGlzLm0ybUluZGV4ID0gbTJtSW5kZXg7XG4gICAgdGhpcy5wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zO1xuXG4gICAgZXZlbnRzLm9uKCdtb2RlbC1kZWZpbml0aW9uJyxmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgIC8vIGRlZmluaW5nIGFsbCBpbmRleGVzIGZvciBwcmltYXJ5IGtleVxuICAgICAgICB2YXIgcGtJbmRleCA9IGxpc3RDYWNoZS5nZXRJbmRleEZvcihtb2RlbC5uYW1lLCAnaWQnKTtcbiAgICAgICAgbWFpbkluZGV4W21vZGVsLm5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgcGtJbmRleCwgJ21haW5JbmRleC4nICsgbW9kZWwubmFtZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGluZyBwZXJtaXNzaW9uIGluZGV4ZXNcbiAgICAgICAgcGVybWlzc2lvbnNbbW9kZWwubmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsICdwZXJtaXNzaW9ucy4nICsgbW9kZWwubmFtZSk7XG5cbiAgICAgICAgLy8gY3JlYXRpbmcgaW5kZXhlcyBmb3IgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbihyZWZlcmVuY2Upe1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsLm5hbWUgKyAnXycgKyByZWZlcmVuY2UuaWQ7XG4gICAgICAgICAgICBmb3JlaWduS2V5c1tpbmRleE5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgbGlzdENhY2hlLmdldEluZGV4Rm9yKHJlZmVyZW5jZS50bywgJ2lkJyksIHJlZmVyZW5jZS50byArICcuaWQgZm9yZWlnbktleXMuJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBjcmVhdGluZyByZXZlcnNlIGZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZWRCeSkuZWFjaChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gZmllbGQuYnkgKyAnLicgKyBmaWVsZC5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IoZmllbGQuYnksZmllbGQuaWQpLCBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkICsgJyBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgICAgICAgICBpZiAoIShyZWxhdGlvbi5pbmRleE5hbWUgaW4gbTJtKSlcbiAgICAgICAgICAgICAgICBtMm1bcmVsYXRpb24uaW5kZXhOYW1lXSA9IFtuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsJ20ybS4nICsgcmVsYXRpb24uaW5kZXhOYW1lICsgJ1swXScpLCBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsJ20ybS4nICsgcmVsYXRpb24uaW5kZXhOYW1lKydbMV0nKV07XG4gICAgICAgICAgICBpZiAoIShyZWxhdGlvbi5pbmRleE5hbWUgaW4gbTJtSW5kZXgpKVxuICAgICAgICAgICAgICAgIG0ybUluZGV4W3JlbGF0aW9uLmluZGV4TmFtZV0gPSBuZXcgTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIG0ybUdldCA9IGZ1bmN0aW9uKGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgY2FsbEJhY2spe1xuICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCgobiA/IHV0aWxzLnJldmVyc2UoJy8nLCBpbmRleE5hbWUpIDogaW5kZXhOYW1lKSArICdzJyArICcvbGlzdCcsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW2luZGV4TmFtZV1cbiAgICAgICAgfSk7ICAgICAgICBcbiAgICB9O1xuXG4gICAgdmFyIGdldE0yTSA9IGZ1bmN0aW9uKGluZGV4TmFtZSwgY29sbGVjdGlvbiwgbiwgY2FsbEJhY2spe1xuICAgICAgICAvLyBhc2sgYWxsIGl0ZW1zIGluIGNvbGxlY3Rpb24gdG8gbTJtIGluZGV4XG4gICAgICAgIExhenkoY29sbGVjdGlvbikuZWFjaChtMm1baW5kZXhOYW1lXVtuXS5hc2suYmluZChtMm1baW5kZXhOYW1lXVtuXSkpO1xuICAgICAgICAvLyByZW5ld2luZyBjb2xsZWN0aW9uIHdpdGhvdXQgYXNrZWRcbiAgICAgICAgY29sbGVjdGlvbiA9IG0ybVtpbmRleE5hbWVdW25dLm1pc3NpbmdzKCk7XG4gICAgICAgIC8vIGNhbGxpbmcgcmVtb3RlIGZvciBtMm0gY29sbGVjdGlvbiBpZiBhbnlcbiAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgIGFjdGl2ZXNbaW5kZXhOYW1lXSA9IDE7XG4gICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLmdldE0yTSA9IGdldE0yTTtcblxuICAgIHZhciBsaW5rVW5saW5rZWQgPSBmdW5jdGlvbigpe1xuICAgICAgICAvLyBwZXJmb3JtIGEgRGF0YUJhc2Ugc3luY2hyb25pemF0aW9uIHdpdGggc2VydmVyIGxvb2tpbmcgZm9yIHVua25vd24gZGF0YVxuICAgICAgICBpZiAoIXRvdWNoLnRvdWNoZWQoKSkgcmV0dXJuO1xuICAgICAgICBpZiAoTGF6eShhY3RpdmVzKS52YWx1ZXMoKS5zdW0oKSkge1xuICAgICAgICAgICAgdG91Y2gudG91Y2goKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihpbmRleGVzLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgTGF6eShpbmRleGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCxuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSBMYXp5KGNvbGxlY3Rpb24pLmZpbHRlcihCb29sZWFuKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjb2xsZWN0aW9uLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBJTkRFWCA9IG0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBnZXR0ZXIgPSBJTkRFWFsnZ2V0JyArICgxIC0gbildLmJpbmQoSU5ERVgpO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbTJtR2V0KGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gY29sbGVjdGlvbi5tYXAoZ2V0dGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgb3RoZXJJbmRleCA9IGluZGV4TmFtZS5zcGxpdCgnLycpWzEgLSBuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShvdGhlckluZGV4LGZ1bmN0aW9uKCl7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShpZHMpLmZsYXR0ZW4oKS51bmlxdWUoKS5lYWNoKG1haW5JbmRleFtvdGhlckluZGV4XS5hc2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYWluSW5kZXhbb3RoZXJJbmRleF0uYXNrKHgsdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIExhenkobWFpbkluZGV4KS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaWRzID0gaW5kZXgubWlzc2luZ3MoKTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIGlkYiA9IG1vZGVsTmFtZSBpbiBJREIgPyBJREJbbW9kZWxOYW1lXS5rZXlzKCkgOiBMYXp5KCk7XG4gICAgICAgICAgICAgICAgLy9sb2coJ2xpbmtpbmcuJyArIG1vZGVsTmFtZSArICcgPSAnICsgVzJQUkVTT1VSQ0UubGlua2luZy5zb3VyY2VbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lLCB7aWQ6IGlkc30sbnVsbCx1dGlscy5ub29wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KGZvcmVpZ25LZXlzKVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICByZXR1cm4gW2ssIHYubWlzc2luZ3MoKV1cbiAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uKHYpe1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGlkcyA9IHhbMV07XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0geFswXTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGluZGV4TmFtZS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgdmFyIG1haW5SZXNvdXJjZSA9IGluZGV4WzBdO1xuICAgICAgICAgICAgdmFyIGZpZWxkTmFtZSA9IGluZGV4WzFdO1xuICAgICAgICAgICAgdmFyIGZpbHRlciA9IHt9O1xuICAgICAgICAgICAgZmlsdGVyW2ZpZWxkTmFtZV0gPSBpZHM7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtYWluUmVzb3VyY2UsIGZpbHRlcik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgTGF6eShMYXp5KHBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIHJldHVybiB2WzFdLmxlbmd0aFxuICAgICAgICB9KS50b09iamVjdCgpKS5lYWNoKGZ1bmN0aW9uIChpZHMsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgYWN0aXZlc1tyZXNvdXJjZU5hbWVdID0gMTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChyZXNvdXJjZU5hbWUgKyAnL215X3Blcm1zJywge2lkczogTGF6eShpZHMpLnVuaXF1ZSgpLnRvQXJyYXkoKX0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdFBlcm1pc3Npb25zKGRhdGEuUEVSTUlTU0lPTlMpO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYWN0aXZlc1tyZXNvdXJjZU5hbWVdXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzZXRJbnRlcnZhbChsaW5rVW5saW5rZWQsNTApO1xufTtcblxuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gTGlzdENhY2hlcigpe1xuICAgIHZhciBnb3RBbGwgPSB7fTtcbiAgICB2YXIgYXNrZWQgPSB7fTsgLy8gbWFwIG9mIGFycmF5XG4gICAgdmFyIGNvbXBvc2l0ZUFza2VkID0ge307XG4gICAgdmFyIGNhcnRlc2lhblByb2R1Y3QxID0gZnVuY3Rpb24oeCx5LGlzQXJyYXkpe1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGlmIChpc0FycmF5KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhIGluIHgpe1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGIgaW4geSl7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKExhenkoW3hbYV0seVtiXV0pLmZsYXR0ZW4oKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4geCl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYiBpbiB5KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goW3hbYV0seVtiXV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgdmFyIGNhcnRlc2lhblByb2R1Y3QgPSBmdW5jdGlvbihhcnIpe1xuICAgICAgICB2YXIgaXNBcnJheSA9IGZhbHNlO1xuICAgICAgICB2YXIgcmV0ID0gYXJyWzBdOyBcbiAgICAgICAgZm9yICh2YXIgeCA9IDE7IHggPCBhcnIubGVuZ3RoOyArK3gpe1xuICAgICAgICAgICAgcmV0ID0gY2FydGVzaWFuUHJvZHVjdDEocmV0LCBhcnJbeF0sIGlzQXJyYXkpO1xuICAgICAgICAgICAgaXNBcnJheSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gICAgdmFyIGV4cGxvZGVGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgdmFyIHByb2R1Y3QgPSBjYXJ0ZXNpYW5Qcm9kdWN0KExhenkoZmlsdGVyKS52YWx1ZXMoKS50b0FycmF5KCkpO1xuICAgICAgICB2YXIga2V5cyA9IExhenkoZmlsdGVyKS5rZXlzKCkudG9BcnJheSgpO1xuICAgICAgICByZXR1cm4gcHJvZHVjdC5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YXIgciA9IHt9O1xuICAgICAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGEsbil7XG4gICAgICAgICAgICAgICAgclthXSA9IHhbbl07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9O1xuICAgIHZhciBmaWx0ZXJTaW5nbGUgPSBmdW5jdGlvbihtb2RlbCwgZmlsdGVyLCB0ZXN0T25seSl7XG4gICAgICAgIC8vIExhenkgYXV0byBjcmVhdGUgaW5kZXhlc1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gbW9kZWwubW9kZWxOYW1lO1xuICAgICAgICB2YXIgZ2V0SW5kZXhGb3IgPSB0aGlzLmdldEluZGV4Rm9yO1xuICAgICAgICB2YXIga2V5cyA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odixrZXkpeyByZXR1cm4gW2tleSwgbW9kZWxOYW1lICsgJy4nICsga2V5XTsgfSkudG9PYmplY3QoKTtcbiAgICAgICAgdmFyIGluZGV4ZXMgPSBMYXp5KGZpbHRlcikua2V5cygpLm1hcChmdW5jdGlvbihrZXkpeyByZXR1cm4gW2tleSwgZ2V0SW5kZXhGb3IobW9kZWxOYW1lLCBrZXkpXX0pLnRvT2JqZWN0KCk7IFxuICAgICAgICAvLyBmYWtlIGZvciAoaXQgd2lsbCBjeWNsZSBvbmNlKVxuICAgICAgICBmb3IgKHZhciB4IGluIGZpbHRlcil7XG4gICAgICAgICAgICAvLyBnZXQgYXNrZWQgaW5kZXggYW5kIGNoZWNrIHByZXNlbmNlXG4gICAgICAgICAgICB2YXIgZGlmZmVyZW5jZSA9IExhenkoZmlsdGVyW3hdKS5kaWZmZXJlbmNlKGluZGV4ZXNbeF0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIGlmIChkaWZmZXJlbmNlLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgLy8gZ2VuZXJhdGUgbmV3IGZpbHRlclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBMYXp5KFtbeCwgZGlmZmVyZW5jZV1dKS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIC8vIHJlbWVtYmVyIGFza2VkXG4gICAgICAgICAgICAgICAgaWYgKCF0ZXN0T25seSlcbiAgICAgICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoaW5kZXhlc1t4XSwgZGlmZmVyZW5jZSk7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6JyArIEpTT04uc3RyaW5naWZ5KHJldCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZSBmaWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSArICdcXG5PdXQgOiBudWxsJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNsZWFuQ29tcG9zaXRlcyA9IGZ1bmN0aW9uKG1vZGVsLGZpbHRlcil7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBjbGVhbiBjb21wb3NpdGVBc2tlZFxuICAgICAgICAgKi9cbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29uZGl0aW9uYWwgYXNrZWQgaW5kZXhcbiAgICAgICAgaWYgKCEobW9kZWwubmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpIHsgY29tcG9zaXRlQXNrZWRbbW9kZWwubmFtZV0gPSBbXSB9O1xuICAgICAgICB2YXIgaW5kZXggPSBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXTtcbiAgICAgICAgLy8gc2VhcmNoIGZvciBhbGwgZWxlbWVudHMgd2hvIGhhdmUgc2FtZSBwYXJ0aWFsXG4gICAgICAgIHZhciBmaWx0ZXJMZW4gPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICB2YXIgaXRlbXMgPSBpbmRleC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnICYmICcsdHJ1ZSkpLmZpbHRlcihmdW5jdGlvbihpdGVtKXsgTGF6eShpdGVtKS5zaXplKCkgPiBmaWx0ZXJMZW4gfSk7XG4vLyAgICAgICAgY29uc29sZS5sb2coJ2RlbGV0aW5nIDonICsgSlNPTi5zdHJpbmdpZnkoaXRlbXMpKTtcbiAgICB9O1xuXG4gICAgdGhpcy5maWx0ZXIgPSBmdW5jdGlvbihtb2RlbCwgZmlsdGVyKXtcbi8vICAgICAgICBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0tLS0tXFxuZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikpO1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gbW9kZWwubW9kZWxOYW1lO1xuXG4gICAgICAgIC8vIGlmIHlvdSBmZXRjaCBhbGwgb2JqZWN0cyBmcm9tIHNlcnZlciwgdGhpcyBtb2RlbCBoYXMgdG8gYmUgbWFya2VkIGFzIGdvdCBhbGw7XG4gICAgICAgIHZhciBmaWx0ZXJMZW4gID0gTGF6eShmaWx0ZXIpLnNpemUoKTtcbiAgICAgICAgc3dpdGNoIChmaWx0ZXJMZW4pIHtcbiAgICAgICAgICAgIGNhc2UgMCA6IHtcbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gbnVsbCBvciBhbGxcbiAgICAgICAgICAgICAgICB2YXIgZ290ID0gZ290QWxsW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgZ290QWxsW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gYXNrZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYXNrZWRbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb3V0IDogbnVsbCAoZ290IGFsbCknKTtcbiAgICAgICAgICAgICAgICAvLyBjb25kaXRpb25hbCBjbGVhblxuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gY29tcG9zaXRlQXNrZWQpeyBcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChnb3QpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgMSA6IHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gZmlsdGVyU2luZ2xlLmNhbGwodGhpcywgbW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICAgICAgY2xlYW5Db21wb3NpdGVzLmNhbGwodGhpcywgbW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdmFyIHNpbmdsZSA9IExhenkoZmlsdGVyKS5rZXlzKCkuc29tZShmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciBmID0ge307XG4gICAgICAgICAgICBmW2tleV0gPSBmaWx0ZXJba2V5XTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXJTaW5nbGUuY2FsbCh0aHMsIG1vZGVsLCBmLCB0cnVlKSA9PSBudWxsO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHNpbmdsZSkgeyByZXR1cm4gbnVsbCB9XG4gICAgICAgIC8vIGxhenkgY3JlYXRlIGNvbXBvc2l0ZUFza2VkXG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpeyBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgLy8gZXhwbG9kZSBmaWx0ZXJcbiAgICAgICAgdmFyIGV4cGxvZGVkID0gZXhwbG9kZUZpbHRlcihmaWx0ZXIpO1xuICAgICAgICAvLyBjb2xsZWN0IHBhcnRpYWxzXG4gICAgICAgIHZhciBwYXJ0aWFscyA9IGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0uZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlciwgJyB8fCAnLHRydWUpKTtcbiAgICAgICAgLy8gY29sbGVjdCBtaXNzaW5ncyAoZXhwbG9kZWQgLSBwYXJ0aWFscylcbiAgICAgICAgaWYgKHBhcnRpYWxzLmxlbmd0aCl7XG4gICAgICAgICAgICB2YXIgYmFkICA9IFtdO1xuICAgICAgICAgICAgLy8gcGFydGlhbCBkaWZmZXJlbmNlXG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIHBhcnRpYWxzKXtcbiAgICAgICAgICAgICAgICBiYWQucHVzaC5hcHBseShiYWQsZXhwbG9kZWQuZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIHBhcnRpYWxzW3hdLCcgJiYgJywgdHJ1ZSkpKTtcbiAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgY29uc29sZS5sb2coJ2V4cGxvZGVkIC0gcGFydGlhbCA6ICcgKyBKU09OLnN0cmluZ2lmeShiYWQpKTtcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IExhenkoZXhwbG9kZWQpLmRpZmZlcmVuY2UoYmFkKS50b0FycmF5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBleHBsb2RlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZpbHRlciBwYXJ0aWFsc1xuICAgICAgICBpZiAobWlzc2luZ3MubGVuZ3RoKXtcbiAgICAgICAgICAgIGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0ucHVzaC5hcHBseShjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLG1pc3NpbmdzKTtcbiAgICAgICAgICAgIC8vIGFnZ3JlZ2F0ZSBtaXNzaW5nc1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gTGF6eShmaWx0ZXIpLmtleXMoKS5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gTGF6eShtaXNzaW5ncykucGx1Y2soa2V5KS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtrZXksIHJldC5sZW5ndGg/cmV0OmZpbHRlcltrZXldXTtcbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdXQgOiAnICsgSlNPTi5zdHJpbmdpZnkobWlzc2luZ3MpKTtcbiAgICAgICAgICAgIC8vIGNsZWFuIGNvbmRpdGlvbmFsXG4gICAgICAgICAgICBjbGVhbkNvbXBvc2l0ZXMobW9kZWwsIG1pc3NpbmdzKTtcbiAgICAgICAgICAgIHJldHVybiBtaXNzaW5ncztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRJbmRleEZvciA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmllbGROYW1lKXtcbiAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsTmFtZSArICcuJyArIGZpZWxkTmFtZTtcbiAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIGFza2VkKSl7XG4gICAgICAgICAgICBhc2tlZFtpbmRleE5hbWVdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFza2VkW2luZGV4TmFtZV07XG4gICAgfVxufTsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1hbnlUb01hbnlSZWxhdGlvbihyZWxhdGlvbixtMm0pe1xuICAgIHZhciBpdGVtcyA9IFtdO1xuICAgIHRoaXMuYWRkID0gaXRlbXMucHVzaC5iaW5kKGl0ZW1zKTtcbiAgICB0aGlzLmFkZCA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICBjb25zb2xlLmxvZygnYWRkaW5nICcgKyBpdGVtKTtcbiAgICAgICAgaWYgKCEoTGF6eShpdGVtcykuZmluZChpdGVtKSkpe1xuICAgICAgICAgICAgaXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZ2V0MCA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgbTJtWzFdLmFzayhpZCk7XG4gICAgICAgIHJldHVybiBMYXp5KGl0ZW1zKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICByZXR1cm4geFswXSA9PT0gaWQ7XG4gICAgICAgIH0pLnBsdWNrKFwiMVwiKS50b0FycmF5KCk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0MSA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgbTJtWzBdLmFzayhpZCk7XG4gICAgICAgIHJldHVybiBMYXp5KGl0ZW1zKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICByZXR1cm4geFsxXSA9PT0gaWQ7XG4gICAgICAgIH0pLnBsdWNrKFwiMFwiKS50b0FycmF5KCk7XG4gICAgfTtcbiAgICB0aGlzWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWxhdGlvbi5pbmRleE5hbWUuc3BsaXQoJy8nKVsxXSldID0gdGhpcy5nZXQxO1xuICAgIHRoaXNbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlbGF0aW9uLmluZGV4TmFtZS5zcGxpdCgnLycpWzBdKV0gPSB0aGlzLmdldDA7XG5cbiAgICB0aGlzLmRlbCA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICB2YXIgbCA9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgdmFyIGlkeCA9IG51bGw7XG4gICAgICAgIGZvciAodmFyIGEgPSAwOyBhIDwgbDsgYSsrKXsgXG4gICAgICAgICAgICBpZiAoKGl0ZW1zW2FdWzBdID09PSBpdGVtWzBdKSAmJiAoaXRlbXNbYV1bMV0gPT09IGl0ZW1bMV0pKXtcbiAgICAgICAgICAgICAgICBpZHggPSBhO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpZHgpe1xuICAgICAgICAgICAgaXRlbXMuc3BsaWNlKGEsIDEpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdkZWxldGluZyAnLCBpdGVtKTtcbiAgICB9O1xufSIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhwcm90bywgcHJvcGVydHlOYW1lLGdldHRlciwgc2V0dGVyKXtcbiAgICB2YXIgZXZlbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDQpO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBcbiAgICBMYXp5KGV2ZW50cykuZWFjaChmdW5jdGlvbihldmVudCl7XG4gICAgICAgIHByb3RvLm9ybS5vbihldmVudCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmVzdWx0ID0ge307XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHZhciBwcm9wZXJ0eURlZiA9IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBjYWNoZWQoKXtcbiAgICAgICAgICAgIGlmICghKHRoaXMuaWQgaW4gcmVzdWx0KSl7XG4gICAgICAgICAgICAgICAgcmVzdWx0W3RoaXMuaWRdID0gZ2V0dGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpZiAoc2V0dGVyKXtcbiAgICAgICAgcHJvcGVydHlEZWZbJ3NldCddID0gZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9PSByZXN1bHRbdGhpcy5pZF0pe1xuICAgICAgICAgICAgICAgIHNldHRlci5jYWxsKHRoaXMsdmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlkIGluIHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHRbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgcHJvcGVydHlOYW1lLHByb3BlcnR5RGVmKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKGRhdGEpe1xuICAgIHRoaXMucmVzb3VyY2UgPSBkYXRhLl9yZXNvdXJjZTtcbiAgICB0aGlzLmZvcm1JZHggPSBkYXRhLmZvcm1JZHg7XG4gICAgdGhpcy5maWVsZHMgPSBkYXRhLmVycm9ycztcbn1cbnZhciBiYXNlT1JNID0gZnVuY3Rpb24ob3B0aW9ucywgZXh0T1JNKXtcbiAgICBcbiAgICAvLyBjcmVhdGluZyByZXdoZWVsIGNvbm5lY3Rpb25cbiAgICBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKXtcbiAgICAgICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgcmVXaGVlbENvbm5lY3Rpb24ob3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmNvbnN0cnVjdG9yID09PSB1dGlscy5yZVdoZWVsQ29ubmVjdGlvbil7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gb3B0aW9ucztcbiAgICB9XG4gICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICBjb25uZWN0aW9uLm9uKCdjb25uZWN0ZWQnLCBmdW5jdGlvbigpeyBcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSB0cnVlO1xuICAgIH0pO1xuICAgIHZhciBldmVudHMgPSBjb25uZWN0aW9uLmV2ZW50cztcbiAgICB0aGlzLm9uID0gZXZlbnRzLm9uLmJpbmQodGhpcyk7XG4gICAgdGhpcy5lbWl0ID0gZXZlbnRzLmVtaXQuYmluZCh0aGlzKTtcbiAgICB0aGlzLnVuYmluZCA9IGV2ZW50cy51bmJpbmQuYmluZCh0aGlzKTtcbiAgICB0aGlzLiRwb3N0ID0gY29ubmVjdGlvbi4kcG9zdC5iaW5kKGNvbm5lY3Rpb24pO1xuXG4gICAgLy8gaGFuZGxpbmcgd2Vic29ja2V0IGV2ZW50c1xuICAgIGV2ZW50cy5vbignd3MtY29ubmVjdGVkJyxmdW5jdGlvbih3cyl7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnV2Vic29ja2V0IGNvbm5lY3RlZCcpO1xuICAgICAgICAvLyBhbGwganNvbiBkYXRhIGhhcyB0byBiZSBwYXJzZWQgYnkgZ290RGF0YVxuICAgICAgICB3cy5vbk1lc3NhZ2VKc29uKFcyUFJFU09VUkNFLmdvdERhdGEuYmluZChXMlBSRVNPVVJDRSkpO1xuICAgICAgICAvL1xuICAgICAgICB3cy5vbk1lc3NhZ2VUZXh0KGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgICAgICAgY29uc29sZS5pbmZvKCdXUyBtZXNzYWdlIDogJyArIG1lc3NhZ2UpXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGV2ZW50cy5vbignd3MtZGlzY29ubmVjdGVkJywgZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmVycm9yKCdXZWJzb2NrZXQgZGlzY29ubmVjdGVkJylcbiAgICB9KTtcbiAgICBldmVudHMub24oJ2Vycm9yLWpzb24tNDA0JyxmdW5jdGlvbihlcnJvcix1cmwsIHNlbnREYXRhLCB4aHIpeyBcbiAgICAgICAgY29uc29sZS5lcnJvcignSlNPTiBlcnJvciAnLCBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xuICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW3VybC5zcGxpdCgnLycpWzBdXTtcbiAgICB9KVxuXG4gICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICB2YXIgVzJQUkVTT1VSQ0UgPSB0aGlzO1xuICAgIHZhciBJREIgPSB7YXV0aF9ncm91cCA6IExhenkoe30pfTsgLy8gdGFibGVOYW1lIC0+IGRhdGEgYXMgQXJyYXlcbiAgICB2YXIgSURYID0ge307IC8vIHRhYmxlTmFtZSAtPiBMYXp5KGluZGV4QnkoJ2lkJykpIC0+IElEQltkYXRhXVxuICAgIHZhciBSRVZJRFggPSB7fTsgLy8gdGFibGVOYW1lIC0+IGZpZWxkTmFtZSAtPiBMYXp5Lmdyb3VwQnkoKSAtPiBJREJbREFUQV1cbiAgICB2YXIgYnVpbGRlckhhbmRsZXJzID0ge307XG4gICAgdmFyIGJ1aWxkZXJIYW5kbGVyVXNlZCA9IHt9O1xuICAgIHZhciBwZXJzaXN0ZW50QXR0cmlidXRlcyA9IHt9O1xuICAgIHZhciBldmVudEhhbmRsZXJzID0ge307XG4gICAgdmFyIHBlcm1pc3Npb25XYWl0aW5nID0ge307XG4gICAgdmFyIG1vZGVsQ2FjaGUgPSB7fTtcbiAgICB2YXIgZmFpbGVkTW9kZWxzID0ge307XG4gICAgdmFyIHdhaXRpbmdDb25uZWN0aW9ucyA9IHt9IC8vIGFjdHVhbCBjb25uZWN0aW9uIHdobyBpJ20gd2FpdGluZyBmb3JcbiAgICB2YXIgbGlzdENhY2hlID0gbmV3IExpc3RDYWNoZXIoTGF6eSk7XG4gICAgdmFyIGxpbmtlciA9IG5ldyBBdXRvTGlua2VyKGV2ZW50cyx3YWl0aW5nQ29ubmVjdGlvbnMsSURCLCB0aGlzLCBsaXN0Q2FjaGUpO1xuLyogICAgd2luZG93LmxsID0gbGlua2VyO1xuICAgIHdpbmRvdy5sYyA9IGxpc3RDYWNoZTtcbiovXG4gICAgdGhpcy52YWxpZGF0aW9uRXZlbnQgPSBldmVudHMub24oJ2Vycm9yLWpzb24tNTEzJywgZnVuY3Rpb24oZGF0YSwgdXJsLCBzZW50RGF0YSwgeGhyKXtcbiAgICAgICAgaWYgKGN1cnJlbnRDb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlcil7XG4gICAgICAgICAgICBjdXJyZW50Q29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIobmV3IFZhbGlkYXRpb25FcnJvcihkYXRhKSk7XG4gICAgICAgIH1cbiAgICB9KVxuXG4gICAgdmFyIGdldEluZGV4ID0gZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElEQilcbiAgICAgICAgICAgIHJldHVybiBJREJbaW5kZXhOYW1lXTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBJREJbaW5kZXhOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgcmV0dXJuIElEQltpbmRleE5hbWVdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgZ2V0VW5saW5rZWQgPSBmdW5jdGlvbiAoaW5kZXhOYW1lKSB7XG4gICAgICAgIGlmIChpbmRleE5hbWUgaW4gVU5MSU5LRUQpXG4gICAgICAgICAgICByZXR1cm4gVU5MSU5LRURbaW5kZXhOYW1lXTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBVTkxJTktFRFtpbmRleE5hbWVdID0ge307XG4gICAgICAgICAgICByZXR1cm4gVU5MSU5LRURbaW5kZXhOYW1lXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBQZXJtaXNzaW9uVGFibGUoaWQsIGtsYXNzLCBwZXJtaXNzaW9ucykge1xuICAgICAgICAvLyBjcmVhdGUgUGVybWlzc2lvblRhYmxlIGNsYXNzXG4gICAgICAgIHRoaXMua2xhc3MgPSBrbGFzcztcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IFtdO1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIGZvciAodmFyIGsgaW4gcGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgIHRoaXMucHVzaC5hcHBseSh0aGlzLCBbaywgcGVybWlzc2lvbnNba11dKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBQZXJtaXNzaW9uVGFibGUucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgLy8gc2F2ZSBPYmplY3QgdG8gc2VydmVyXG4gICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgcGVybWlzc2lvbnM6IExhenkodGhpcy5wZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFt4WzBdLmlkLCB4WzFdXVxuICAgICAgICAgICAgfSkudG9PYmplY3QoKVxuICAgICAgICB9O1xuICAgICAgICBkYXRhLmlkID0gdGhpcy5pZDtcbiAgICAgICAgdmFyIG1vZGVsTmFtZSA9IHRoaXMua2xhc3MubW9kZWxOYW1lO1xuICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmtsYXNzLm1vZGVsTmFtZSArICcvc2V0X3Blcm1pc3Npb25zJywgZGF0YSwgZnVuY3Rpb24gKG15UGVybXMsIGEsIGIsIHJlcSkge1xuICAgICAgICAgICAgY2IobXlQZXJtcyk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgUGVybWlzc2lvblRhYmxlLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKGdyb3VwX2lkLCBwZXJtaXNzaW9uTGlzdCkge1xuICAgICAgICB2YXIgcCA9IExhenkocGVybWlzc2lvbkxpc3QpO1xuICAgICAgICB2YXIgcGVybXMgPSBMYXp5KHRoaXMua2xhc3MuYWxsUGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LCBwLmNvbnRhaW5zKHgpXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICB2YXIgbCA9IExhenkodGhpcy5wZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4geFswXS5pZFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGwuY29udGFpbnMoZ3JvdXBfaWQpKVxuICAgICAgICAgICAgdGhpcy5wZXJtaXNzaW9uc1tsLmluZGV4T2YoZ3JvdXBfaWQpXVsxXSA9IHBlcm1zO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGlzLnBlcm1pc3Npb25zLnB1c2goW0lEQi5hdXRoX2dyb3VwLmdldChncm91cF9pZCksIHBlcm1zXSk7XG4gICAgfTtcblxuICAgIC8vIGNyZWF0ZXMgZHluYW1pY2FsIG1vZGVsc1xuICAgIHZhciBtYWtlTW9kZWxDbGFzcyA9IGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICB2YXIgX21vZGVsID0gbW9kZWw7XG4gICAgICAgIHZhciBmaWVsZHMgPSBMYXp5KG1vZGVsLmZpZWxkcyk7XG4gICAgICAgIGlmIChtb2RlbC5wcml2YXRlQXJncykge1xuICAgICAgICAgICAgZmllbGRzID0gZmllbGRzLm1lcmdlKG1vZGVsLnByaXZhdGVBcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdtb2RlbC1kZWZpbml0aW9uJywgbW9kZWwpO1xuICAgICAgICAvLyBnZXR0aW5nIGZpZWxkcyBvZiB0eXBlIGRhdGUgYW5kIGRhdGV0aW1lXG4vKlxuICAgICAgICB2YXIgREFURUZJRUxEUyA9IGZpZWxkcy5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKVxuICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKHgsIHYpIHtcbiAgICAgICAgICAgIHJldHVybiBbdiwgdHJ1ZV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcblxuICAgICAgICAvLyBnZXR0aW5nIGJvb2xlYW4gZmllbGRzXG4gICAgICAgIHZhciBCT09MRklFTERTID0gZmllbGRzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKVxuICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKHgsIHYpIHtcbiAgICAgICAgICAgIHJldHVybiBbdiwgdHJ1ZV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcblxuICAgICAgICAvLyBib29sZWFucyBhbmQgZGF0ZXRpbWVzIHN0b3JhZ2UgZXh0ZXJuYWwgXG4gICAgICAgIE1PREVMX0RBVEVGSUVMRFNbbW9kZWwubmFtZV0gPSBEQVRFRklFTERTO1xuICAgICAgICBNT0RFTF9CT09MRklFTERTW21vZGVsLm5hbWVdID0gQk9PTEZJRUxEUztcbiovXG4gICAgICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHZhciBmdW5jU3RyaW5nID0gXCJpZiAoIXJvdykgeyByb3cgPSB7fX07XFxuXCI7XG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gbW9kZWwucmVmZXJlbmNlcy5tYXAoZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgcmV0dXJuICd0aGlzLl8nICsgZmllbGQuaWQgKyAnID0gcm93LicgKyBmaWVsZC5pZCArICc7JztcbiAgICAgICAgfSkuam9pbignO1xcbicpO1xuICAgICAgICBcbiAgICAgICAgLy8gZGF0ZWZpZWxkIGNvbnZlcnNpb25cbiAgICAgICAgZnVuY1N0cmluZyArPSBmaWVsZHMubWFwKGZ1bmN0aW9uICh4LGspIHtcbiAgICAgICAgICAgIGlmICgoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IHJvdy4nICsgayArICc/bmV3IERhdGUocm93LicgKyBrICsgJyAqIDEwMDAgLSAnICsgdXRpbHMudHpPZmZzZXQgKyAnKTpudWxsO1xcbic7IFxuICAgICAgICAgICAgfSBlbHNlIGlmICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IChyb3cuJyArIGsgKyAnID09PSBcIlRcIikgfHwgKHJvdy4nICsgayArICcgPT09IHRydWUpO1xcbic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSByb3cuJyArIGsgKyAnO1xcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnRvU3RyaW5nKCdcXG4nKTsgKyAnXFxuJztcblxuICAgICAgICBmdW5jU3RyaW5nICs9IFwiaWYgKHBlcm1pc3Npb25zKSB7dGhpcy5fcGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucyAmJiBMYXp5KHBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIFt4LCB0cnVlXSB9KS50b09iamVjdCgpO31cIlxuXG4gICAgICAgIFxuICAgICAgICAvLyBtYXN0ZXIgY2xhc3MgZnVuY3Rpb25cbiAgICAgICAgdmFyIEtsYXNzID0gbmV3IEZ1bmN0aW9uKCdyb3cnLCAncGVybWlzc2lvbnMnLGZ1bmNTdHJpbmcpXG5cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLm9ybSA9IGV4dE9STTtcbiAgICAgICAgS2xhc3MucmVmX3RyYW5zbGF0aW9ucyA9IHt9O1xuICAgICAgICBLbGFzcy5tb2RlbE5hbWUgPSBtb2RlbC5uYW1lO1xuICAgICAgICBLbGFzcy5yZWZlcmVuY2VzID0gTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5wbHVjaygnaWQnKS50b0FycmF5KCk7XG5cbiAgICAgICAgS2xhc3MuaW52ZXJzZV9yZWZlcmVuY2VzID0gbW9kZWwucmVmZXJlbmNlZEJ5Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgLy8gbWFuYWdpbmcgcmVmZXJlbmNlcyB3aGVyZSBcbiAgICAgICAgICAgIHJldHVybiB4LmJ5ICsgJ18nICsgeC5pZCArICdfc2V0J1xuICAgICAgICB9KTtcbiAgICAgICAgS2xhc3MucmVmZXJlbnRzID0gbW9kZWwucmVmZXJlbmNlZEJ5Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LmJ5LCB4LmlkXVxuICAgICAgICB9KTtcbiAgICAgICAgS2xhc3MuZmllbGRzT3JkZXIgPSBtb2RlbC5maWVsZE9yZGVyO1xuICAgICAgICBLbGFzcy5hbGxQZXJtaXNzaW9ucyA9IG1vZGVsLnBlcm1pc3Npb25zO1xuXG4gICAgICAgIC8vIHJlZGVmaW5pbmcgdG9TdHJpbmcgbWV0aG9kXG4gICAgICAgIGlmIChMYXp5KG1vZGVsLnJlcHJlc2VudGF0aW9uKS5zaXplKCkpe1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnRvU3RyaW5nID0gbmV3IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcy4nICsgTGF6eShtb2RlbC5yZXByZXNlbnRhdGlvbikudG9TdHJpbmcoJyArIFwiIFwiICsgdGhpcy4nKSk7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnRvVXBwZXJDYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gcmVkZWZpbmUgdG8gVXBwZXJDYXNlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIH07XG4gICAgICBcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnRvTG93ZXJDYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGRlbGV0ZSBpbnN0YW5jZSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5kZWxldGUodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUsIFt0aGlzLmlkXSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gcGVybWlzc2lvbiBnZXR0ZXIgcHJvcGVydHlcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEtsYXNzLnByb3RvdHlwZSwgJ3Blcm1pc3Npb25zJywge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3Blcm1pc3Npb25zKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcGVybWlzc2lvbnM7XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtlci5wZXJtaXNzaW9uc1t0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZV0uYXNrKHRoaXMuaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGdldHRpbmcgZnVsbCBwZXJtaXNzaW9uIHRhYmxlIGZvciBhbiBvYmplY3RcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmFsbF9wZXJtcyA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgdmFyIG9iamVjdF9pZCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSArICcvYWxsX3Blcm1zJywge2lkOiB0aGlzLmlkfSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGVybWlzc2lvbnMgPSBkYXRhO1xuICAgICAgICAgICAgICAgIHZhciBncm91cGVkID0ge307XG4gICAgICAgICAgICAgICAgdmFyIHVua25vd25fZ3JvdXBzID0gTGF6eShwZXJtaXNzaW9ucykucGx1Y2soJ2dyb3VwX2lkJykudW5pcXVlKCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnJyArIHhcbiAgICAgICAgICAgICAgICB9KS5kaWZmZXJlbmNlKElEQi5hdXRoX2dyb3VwLmtleXMoKSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIExhenkocGVybWlzc2lvbnMpLmdyb3VwQnkoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguZ3JvdXBfaWRcbiAgICAgICAgICAgICAgICB9KS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyb3VwZWRba10gPSBMYXp5KHYpLnBsdWNrKCduYW1lJykudG9BcnJheSgpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdmFyIGNhbGwgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBjYihuZXcgUGVybWlzc2lvblRhYmxlKG9iamVjdF9pZCwgS2xhc3MsIGdyb3VwZWQpKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmICh1bmtub3duX2dyb3Vwcy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdldCgnYXV0aF9ncm91cCcsdW5rbm93bl9ncm91cHMsY2FsbCk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBjYWxsKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICB2YXIgbyA9IHRoaXMuYXNSYXcoKTtcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSBLbGFzcy5maWVsZHM7XG4gICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgdmFyIG1vZGVsTmFtZSA9IHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhcmcgaW4gYXJncykge1xuICAgICAgICAgICAgICAgICAgICBvW2FyZ10gPSBhcmdzW2FyZ107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gZWxpbWluYXRlIHVud3JpdGFibGVzXG4gICAgICAgICAgICBMYXp5KEtsYXNzLmZpZWxkc09yZGVyKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFmaWVsZHNbeF0ud3JpdGFibGU7XG4gICAgICAgICAgICB9KS5lYWNoKGZ1bmN0aW9uKGZpZWxkTmFtZSl7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSBpbiBvKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBvW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IFcyUFJFU09VUkNFLiRwb3N0KG1vZGVsTmFtZSArIChJRCA/ICcvcG9zdCcgOiAnL3B1dCcpLCBvKTtcbiAgICAgICAgICAgIGlmIChhcmdzICYmIChhcmdzLmNvbnN0cnVjdG9yID09PSBGdW5jdGlvbikpe1xuICAgICAgICAgICAgICAgIC8vIHBsYWNpbmcgY2FsbGJhY2sgaW4gYSBjb21tb24gcGxhY2VcbiAgICAgICAgICAgICAgICBwcm9taXNlLmNvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyID0gYXJncztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlXG4gICAgICAgIH07XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG9iaiA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMuYXNSYXcoKSk7XG4gICAgICAgICAgICBvYmouX3Blcm1pc3Npb25zID0gdGhpcy5fcGVybWlzc2lvbnM7XG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGJ1aWxkaW5nIHNlcmlhbGl6YXRpb24gZnVuY3Rpb25cbiAgICAgICAgdmFyIGFzciA9ICdyZXR1cm4ge1xcbicgKyBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLm1hcChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICByZXR1cm4gZmllbGQuaWQgKyAnIDogdGhpcy5fJyArIGZpZWxkLmlkO1xuICAgICAgICB9KS5jb25jYXQoZmllbGRzLm1hcChmdW5jdGlvbiAoeCxrKSB7XG4gICAgICAgICAgICBpZiAoKHgudHlwZSA9PSAnZGF0ZScpIHx8ICh4LnR5cGUgPT0gJ2RhdGV0aW1lJykpe1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6ICh0aGlzLicgKyBrICsgJz8oTWF0aC5yb3VuZCh0aGlzLicgKyBrICsgJy5nZXRUaW1lKCkgLSB0aGlzLicgKyBrICsgJy5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDApIC8gMTAwMCk6bnVsbCknOyBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeC50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6IHRoaXMuJyArIGsgKyAnP1wiVFwiOlwiRlwiJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogdGhpcy4nICsgaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpLnRvU3RyaW5nKCcsXFxuJykgKyAnfTsnO1xuICAgICAgICBLbGFzcy5wcm90b3R5cGUuYXNSYXcgPSBuZXcgRnVuY3Rpb24oYXNyKTtcblxuICAgICAgICBLbGFzcy5zYXZlTXVsdGkgPSBmdW5jdGlvbiAob2JqZWN0cywgY2IsIHNjb3BlKSB7XG4gICAgICAgICAgICB2YXIgcmF3ID0gW107XG4gICAgICAgICAgICB2YXIgZGVsZXRhYmxlID0gTGF6eShLbGFzcy5maWVsZHMpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIXgud3JpdGFibGVcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5wbHVjaygnaWQnKVxuICAgICAgICAgICAgICAgIC50b0FycmF5KCk7XG4gICAgICAgICAgICBMYXp5KG9iamVjdHMpXG4gICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5hc1JhdygpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KGRlbGV0YWJsZSkuZWFjaChmdW5jdGlvbiAoeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHhbeV07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByYXcucHVzaCh4KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSwgJ3B1dCcsIHttdWx0aXBsZTogcmF3LCBmb3JtSWR4IDogVzJQUkVTT1VSQ0UuZm9ybUlkeCsrfSwgZnVuY3Rpb24gKGVsZW1zKSB7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShlbGVtcyk7XG4gICAgICAgICAgICAgICAgdmFyIHRhYiA9IElEQltLbGFzcy5tb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIHZhciBvYmpzID0gTGF6eShlbGVtc1tLbGFzcy5tb2RlbE5hbWVdLnJlc3VsdHMpLnBsdWNrKCdpZCcpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFiLmdldCh4KVxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBpZiAoY2IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2Iob2Jqcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgc2NvcGUpO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoJ2V4dHJhX3ZlcmJzJyBpbiBtb2RlbClcbiAgICAgICAgICAgIExhenkobW9kZWwuZXh0cmFfdmVyYnMpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZnVuY05hbWUgPSB4WzBdO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0geFsxXTtcbiAgICAgICAgICAgICAgICB2YXIgZGRhdGEgPSAnZGF0YSA9IHtpZCA6IHRoaXMuaWQnO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgZGRhdGEgKz0gJywgJyArIExhenkoYXJncykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHggKyAnIDogJyArIHg7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5qb2luKCcsJyk7XG4gICAgICAgICAgICAgICAgZGRhdGEgKz0gJ307JztcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goJ2NiJyk7XG4gICAgICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlW2Z1bmNOYW1lXSA9IG5ldyBGdW5jdGlvbihhcmdzLCBkZGF0YSArICdXMlMuVzJQX1BPU1QodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUsXCInICsgZnVuY05hbWUgKyAnXCIsIGRhdGEsZnVuY3Rpb24oZGF0YSxzdGF0dXMsaGVhZGVycyx4KXsnICtcbiAgICAgICAgICAgICAgICAgICAgJ3RyeXtcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJyAgIGlmICghaGVhZGVycyhcIm5vbW9kZWxcIikpIHt3aW5kb3cuVzJTLmdvdERhdGEoZGF0YSxjYik7fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnICAgZWxzZSB7aWYgKGNiKSB7Y2IoZGF0YSl9fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfSBjYXRjaChlKXtcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ2lmIChjYikge2NiKGRhdGEpO31cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ31cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ30pO1xcbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIGlmICgncHJpdmF0ZUFyZ3MnIGluIG1vZGVsKSB7XG4gICAgICAgICAgICBLbGFzcy5wcml2YXRlQXJncyA9IExhenkobW9kZWwucHJpdmF0ZUFyZ3MpLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHRydWVdO1xuICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS5zYXZlUEEgPSBmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgIHZhciBUID0gdGhpcztcbiAgICAgICAgICAgICAgICB2YXIgb28gPSB7aWQ6IHRoaXMuaWR9O1xuICAgICAgICAgICAgICAgIHZhciBQQSA9IHRoaXMuY29uc3RydWN0b3IucHJpdmF0ZUFyZ3M7XG4gICAgICAgICAgICAgICAgdmFyIEZzID0gdGhpcy5jb25zdHJ1Y3Rvci5maWVsZHM7XG4gICAgICAgICAgICAgICAgdmFyIHQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihvKS5hc1JhdygpO1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZElkeCA9IExhenkoUEEpLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCBGc1t4XV1cbiAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIExhenkobykuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGsgaW4gUEEpICYmIGZpZWxkSWR4W2tdLndyaXRhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvb1trXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSArICcvc2F2ZVBBJywgb28sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShvbykuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgVFtrXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1vZGVsQ2FjaGVbS2xhc3MubW9kZWxOYW1lXSA9IEtsYXNzO1xuICAgICAgICAvLyBhZGRpbmcgaWQgdG8gZmllbGRzXG4gICAgICAgIGZvciAodmFyIGYgaW4gbW9kZWwuZmllbGRzKSB7XG4gICAgICAgICAgICBtb2RlbC5maWVsZHNbZl0uaWQgPSBmO1xuICAgICAgICB9XG4gICAgICAgIEtsYXNzLmZpZWxkcyA9IExhenkobW9kZWwuZmllbGRzKS5jb25jYXQoTGF6eShtb2RlbC5wcml2YXRlQXJncykpLmNvbmNhdChMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLnRhcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgeC50eXBlID0geC50eXBlIHx8ICdyZWZlcmVuY2UnXG4gICAgICAgIH0pKS5pbmRleEJ5KCdpZCcpLnRvT2JqZWN0KCk7XG4gICAgICAgIC8vIHNldHRpbmcgd2lkZ2V0cyBmb3IgZmllbGRzXG4gICAgICAgIExhenkoS2xhc3MuZmllbGRzKS5lYWNoKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIGlmICghZmllbGQud2lkZ2V0KXtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGQudHlwZSA9PT0gJ3JlZmVyZW5jZScpe1xuICAgICAgICAgICAgICAgICAgICBmaWVsZC53aWRnZXQgPSAnY2hvaWNlcydcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmaWVsZC53aWRnZXQgPSBmaWVsZC50eXBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGJ1aWxkaW5nIHJlZmVyZW5jZXMgdG8gKG1hbnkgdG8gb25lKSBmaWVsZHNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgIHZhciBleHRfcmVmID0gcmVmLnRvO1xuICAgICAgICAgICAgdmFyIGxvY2FsX3JlZiA9ICdfJyArIHJlZi5pZDtcbiAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCByZWYuaWQsZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICghKGV4dF9yZWYgaW4gSURCKSl7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShleHRfcmVmLGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLm1haW5JbmRleFtleHRfcmVmXS5hc2sodGhzW2xvY2FsX3JlZl0sdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gKGV4dF9yZWYgaW4gSURCKSAmJiB0aGlzW2xvY2FsX3JlZl0gJiYgSURCW2V4dF9yZWZdLmdldCh0aGlzW2xvY2FsX3JlZl0pO1xuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0ICYmIChleHRfcmVmIGluIGxpbmtlci5tYWluSW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFza2luZyB0byBsaW5rZXJcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLm1haW5JbmRleFtleHRfcmVmXS5hc2sodGhpc1tsb2NhbF9yZWZdLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXRpbHMubW9jaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUgIT0gZXh0X3JlZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IGNhbiBhc3NpZ24gb25seSAnICsgZXh0X3JlZiArICcgdG8gJyArIHJlZi5pZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpc1tsb2NhbF9yZWZdID0gdmFsdWUuaWQ7XG4gICAgICAgICAgICB9LCAnbmV3LScgKyBleHRfcmVmLCAnZGVsZXRlZC0nICsgZXh0X3JlZiwndXBkYXRlZC0nICsgZXh0X3JlZiwgJ25ldy1tb2RlbC0nICsgZXh0X3JlZik7XG5cblxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWYuaWQpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0T1JNLmdldChleHRfcmVmLHRoaXNbbG9jYWxfcmVmXSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2J1aWxkaW5nIHJlZmVyZW5jZXMgdG8gKG9uZSB0byBtYW55KSBmaWVsZHNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VkQnkpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHJlZi5ieSArICcuJyArIHJlZi5pZDtcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSByZWYuYnkgKyAnXycgKyB1dGlscy5wbHVyYWxpemUocmVmLmlkKTtcbiAgICAgICAgICAgIHZhciByZXZJbmRleCA9IHJlZi5ieTtcbiAgICAgICAgICAgIGlmIChLbGFzcy5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgICAgICAgICRsb2cuZXJyb3IoJ1RyeWVkIHRvIHJlZGVmaW5lIHByb3BlcnR5ICcgKyBwcm9wZXJ0eU5hbWUgKyAncycgKyAnIGZvciAnICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHByb3BlcnR5TmFtZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gKHJldkluZGV4IGluIElEQikgPyBSRVZJRFhbaW5kZXhOYW1lXS5nZXQodGhpcy5pZCArICcnKTpudWxsO1xuICAgICAgICAgICAgICAgICAgICBsaW5rZXIuZm9yZWlnbktleXNbaW5kZXhOYW1lXS5hc2sodGhpcy5pZCx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICB9LCBudWxsLCAnbmV3LScgKyByZXZJbmRleCwgJ3VwZGF0ZWQtJyArIHJldkluZGV4LCAnZGVsZXRlZC0nICsgcmV2SW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZSh1dGlscy5wbHVyYWxpemUocmVmLmJ5KSldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBvcHRzID0ge307XG4gICAgICAgICAgICAgICAgb3B0c1tyZWYuaWRdID0gW3RoaXMuaWRdO1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRPUk0ucXVlcnkocmVmLmJ5LG9wdHMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9idWlsZGluZyByZWZlcmVuY2UgdG8gKG1hbnkgdG8gbWFueSkgZmllbGRzXG4gICAgICAgIGlmIChtb2RlbC5tYW55VG9NYW55KSB7XG4gICAgICAgICAgICBMYXp5KG1vZGVsLm1hbnlUb01hbnkpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSByZWYuaW5kZXhOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCA9IHJlZi5maXJzdD8gMCA6IDE7XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbE5hbWUgPSByZWYubW9kZWw7XG4vLyAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gZ2V0SW5kZXgob21vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIGdldHRlciA9IGxpbmtlci5tMm1JbmRleFtpbmRleE5hbWVdWydnZXQnICsgKDEgLSBmaXJzdCldO1xuXG4gICAgICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5tb2RlbCArICdzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gZ2V0dGVyKHRocy5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1cyUFJFU09VUkNFLmZldGNoKG9tb2RlbE5hbWUsIHtpZCA6IGlkc30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldCA9IGdldEluZGV4KG9tb2RlbE5hbWUpLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMgJiYgZ2V0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldCA9IExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICAgICAgfSwgbnVsbCwgJ3JlY2VpdmVkLW0ybS0nICsgaW5kZXhOYW1lLCAncmVjZWl2ZWQtJyArIG9tb2RlbE5hbWUpO1xuXG4gICAgICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZSh1dGlscy5wbHVyYWxpemUob21vZGVsTmFtZSkpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtlci5nZXRNMk0oaW5kZXhOYW1lLCBbdGhzLmlkXSwgZmlyc3QsZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSxudWxsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdldCA9IElEQltvbW9kZWxOYW1lXS5nZXQuYmluZChJREJbb21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChMYXp5KGlkcykubWFwKGdldCkuZmlsdGVyKHV0aWxzLmJvb2wpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChbXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgICAgICBLbGFzcy5maWVsZHNbdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWxOYW1lKV0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiB1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpLFxuICAgICAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcmVhZGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdNMk0nLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3JzOiBbXVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUudW5saW5rUmVmZXJlbmNlID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgICAgICB2YXIgaW5zdGFuY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmNvbnN0cnVjdG9yLm5hbWUgPT0gJ0FycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlcyA9IGluc3RhbmNlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IGluc3RhbmNlc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbCA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW0lELCB4XVxuICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBbW0lELCBpbnN0YW5jZS5pZF1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWwgKyAncy9kZWxldGUnLCB7Y29sbGVjdGlvbjogY29sbGVjdGlvbn0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWw7XG4gICAgICAgICAgICAgICAgaWYgKG11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWZzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaW5kZXhOYW1lID0gb21vZGVsICsgJy8nICsgS2xhc3MubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElOREVYX00yTSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVmcyA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5kaWZmZXJlbmNlKExhenkoSU5ERVhfTTJNW2luZGV4TmFtZV1bMF0uZ2V0KHRoaXMuaWQpKSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWZzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBMYXp5KHJlZnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBfUE9TVChLbGFzcy5tb2RlbE5hbWUsIG9tb2RlbCArICdzL3B1dCcsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChpbmRleE5hbWUgaW4gbGlua2VyLm0ybUluZGV4KSAmJiBMYXp5KGxpbmtlci5tMm1JbmRleFtpbmRleE5hbWVdWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWwpXShpbnN0YW5jZS5pZCkpLmZpbmQodGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWwgKyAncy9wdXQnLCB7Y29sbGVjdGlvbjogW1t0aGlzLmlkLCBpbnN0YW5jZS5pZF1dfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBldmVudHMuZW1pdCgnbmV3LW1vZGVsJywgS2xhc3MpO1xuICAgICAgICBldmVudHMuZW1pdCgnbmV3LW1vZGVsLScgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICByZXR1cm4gS2xhc3M7XG4gICAgfTtcblxuICAgIHRoaXMuZ290RGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBjYWxsQmFjaykge1xuICAgICAgICAvLyByZWNlaXZlIGFsbCBkYXRhIGZyb20gZXZlcnkgZW5kIHBvaW50XG4gICAgICAgIGNvbnNvbGUuaW5mbygnZ290RGF0YScpO1xuICAgICAgICBpZiAodHlwZW9mKGRhdGEpID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGF0YSAnICsgZGF0YSArICcgcmVmdXNlZCBmcm9tIGdvdERhdGEoKScpO1xuICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNsZWFuIGRhdGEgZnJvbSByZWxhdGlvbnMgYW5kIHBlcm1pc3Npb25zIGZvciB1c2luZyBpdCBhZnRlciBtb2RlbCBwYXJzaW5nXG4gICAgICAgIGlmICgnX2V4dHJhJyBpbiBkYXRhKXsgZGVsZXRlIGRhdGEuX2V4dHJhIH1cbiAgICAgICAgdmFyIFRPT05FID0gZGF0YS5UT09ORTtcbiAgICAgICAgdmFyIFRPTUFOWSA9IGRhdGEuVE9NQU5ZO1xuICAgICAgICB2YXIgTUFOWVRPTUFOWSA9IGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgdmFyIFBFUk1JU1NJT05TID0gZGF0YS5QRVJNSVNTSU9OUztcbiAgICAgICAgdmFyIFBBID0gZGF0YS5QQTtcbiAgICAgICAgZGVsZXRlIGRhdGEuVE9PTkU7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBBO1xuICAgICAgICBpZiAoIVBBKSB7IFBBID0ge307IH1cblxuICAgICAgICAvLyBjbGVhbmluZyBmcm9tIHVzZWxlc3MgZGVsZXRlZCBkYXRhXG4gICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLmZpbHRlcihmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgcmV0dXJuICghKCdkZWxldGVkJyBpbiB2KSB8fCAoKGsgaW4gbW9kZWxDYWNoZSkpKTtcbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgnbTJtJyBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbTJtID0gZGF0YS5tMm07XG4gICAgICAgICAgICBkZWxldGUgZGF0YVsnbTJtJ107XG4gICAgICAgIH1cbiAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uIChkYXRhLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsQ2xhc3MgPSBtb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXN1bHRzICYmIChkYXRhLnJlc3VsdHMubGVuZ3RoID4gMCkgJiYgKGRhdGEucmVzdWx0c1swXS5jb25zdHJ1Y3RvciA9PSBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMYXp5KG1vZGVsQ2xhc3MuZmllbGRzT3JkZXIpLnppcCh4KS50b09iamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBMYXp5KGRhdGEucmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgdmFyIGRlbGV0ZWQgPSBkYXRhLmRlbGV0ZWQ7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBQQSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgTVBBID0gUEFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShyZXN1bHRzKS5lYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmQuaWQgaW4gTVBBKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShNUEFbcmVjb3JkLmlkXSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGluZGV4aW5nIHJlZmVyZW5jZXMgYnkgaXRzIElEXG4gICAgICAgICAgICAgICAgdmFyIGl0YWIgPSBnZXRJbmRleChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZSA9IGl0YWIuc291cmNlO1xuXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGVkLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGFibGVbeF07XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuLypcbiAgICAgICAgICAgICAgICBMYXp5KGRlbGV0ZWQpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgIH0pO1xuKi9cbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gcmVzdWx0cy5pbmRleEJ5KCdpZCcpO1xuICAgICAgICAgICAgICAgIHZhciBpayA9IGlkeC5rZXlzKCk7XG4gICAgICAgICAgICAgICAgdmFyIG5uZXcgPSBpay5kaWZmZXJlbmNlKGl0YWIua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWQgPSBpay5kaWZmZXJlbmNlKG5uZXcpO1xuICAgICAgICAgICAgICAgIC8vIHJlbW92aW5nIG9sZCBpZGVudGljYWwgdmFsdWVzXG4gICAgICAgICAgICAgICAgdXBkYXRlZCA9IHVwZGF0ZWQuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhdXRpbHMuc2FtZUFzKGlkeC5nZXQoeCksIGl0YWIuZ2V0KHgpLmFzUmF3KCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIGNsYXNzaWZ5IHJlY29yZHNcbiAgICAgICAgICAgICAgICB2YXIgcGVybXMgPSBkYXRhLnBlcm1pc3Npb25zID8gTGF6eShkYXRhLnBlcm1pc3Npb25zKSA6IExhenkoe30pO1xuICAgICAgICAgICAgICAgIHZhciBuZXdPYmplY3RzID0gbm5ldy5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCksIHBlcm1zLmdldCh4KSlcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vLy8gY2xhc3NpZnlpbmcgdXBkYXRlZFxuICAgICAgICAgICAgICAgIC8vdmFyIHVwZGF0ZWRPYmplY3RzID0gdXBkYXRlZC5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkscGVybXMuZ2V0KHgpKX0pO1xuICAgICAgICAgICAgICAgIC8vdmFyIHVvID0gdXBkYXRlZE9iamVjdHMudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIC8vdXBkYXRlZE9iamVjdHMgPSBMYXp5KHVvKS5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIFt4LHRhYmxlW3guaWRdXX0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGluZyBzaW5nbGUgb2JqZWN0c1xuICAgICAgICAgICAgICAgIHZhciBjaGFuZ2VkID0gW107XG4vLyAgICAgICAgICAgICAgICB2YXIgREFURUZJRUxEUyA9IE1PREVMX0RBVEVGSUVMRFNbbW9kZWxOYW1lXTtcbi8vICAgICAgICAgICAgICAgIHZhciBCT09MRklFTERTID0gTU9ERUxfQk9PTEZJRUxEU1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSXRlbSA9IGl0YWIuZ2V0KHgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ29weSA9IG9sZEl0ZW0uY29weSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3SXRlbSA9IG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkpO1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG1vZGVsLmZpZWxkcykua2V5cygpLmVhY2goZnVuY3Rpb24oayl7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtW2tdID0gbmV3SXRlbVtrXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChbb2xkSXRlbSwgb2xkQ29weV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBzZW5kaW5nIHNpZ25hbCBmb3IgdXBkYXRlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAoY2hhbmdlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ3VwZGF0ZWQtJyArIG1vZGVsTmFtZSwgY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vKioqKioqKiogVXBkYXRlIHVuaXZlcnNlICoqKioqKioqXG4gICAgICAgICAgICAgICAgdmFyIG5vID0gbmV3T2JqZWN0cy50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgTGF6eShubykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB0YWJsZVt4LmlkXSA9IHhcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyByZWJ1bGRpbmcgcmV2ZXJzZSBpbmRleGVzXG4gICAgICAgICAgICAgICAgTGF6eShtb2RlbENhY2hlW21vZGVsTmFtZV0ucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgICAgIFJFVklEWFttb2RlbE5hbWUgKyAnLicgKyByZWZdID0gSURCW21vZGVsTmFtZV0uZ3JvdXBCeSgnXycgKyByZWYpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHNlbmRpbmcgZXZlbnRzIGZvciBuZXcgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKG5vLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ25ldy0nICsgbW9kZWxOYW1lLCBMYXp5KG5vKSwgZGF0YS50b3RhbFJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIGlmIChkZWxldGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KCdkZWxldGVkLScgKyBtb2RlbE5hbWUsIGRlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgZGF0YSBhcnJpdmVkXG4gICAgICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ3JlY2VpdmVkLScgKyBtb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoVE9PTkUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RPT05FJyk7XG4gICAgICAgICAgICBMYXp5KFRPT05FKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB1ZHggPSBnZXRVbmxpbmtlZChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFRPTUFOWSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVE9NQU5ZJyk7XG4gICAgICAgICAgICBMYXp5KFRPTUFOWSkuZWFjaChmdW5jdGlvbiAodmFscywgaW5kZXhOYW1lKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIEFTS0VEX1VOTElOS0VEKSkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9VTkxJTktFRFtpbmRleE5hbWVdID0gTGF6eShbXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIExhenkodmFscykuZWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfVU5MSU5LRURbaW5kZXhOYW1lXS5zb3VyY2UucHVzaChpZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoTUFOWVRPTUFOWSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTUFOWVRPTUFOWScpO1xuICAgICAgICAgICAgTGF6eShNQU5ZVE9NQU5ZKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBpbmRleE5hbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3QgPSBwYXJzZUludChpbmRleE5hbWUuc3BsaXQoJ3wnKVsxXSk7XG4gICAgICAgICAgICAgICAgaW5kZXhOYW1lID0gaW5kZXhOYW1lLnNwbGl0KCd8JylbMF07XG4gICAgICAgICAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIEFTS0VEX00yTSkpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfTTJNW2luZGV4TmFtZV0gPSBbe30sIHt9XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIE1JRFggPSBBU0tFRF9NMk1baW5kZXhOYW1lXVtmaXJzdF07XG4gICAgICAgICAgICAgICAgTGF6eSh2YWxzKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIE1JRFhbeCArICcnXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIE1JRFhbeF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG0ybSkge1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290TTJNKG0ybSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFBFUk1JU1NJT05TKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RQZXJtaXNzaW9ucyhQRVJNSVNTSU9OUyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2FsbEJhY2spIHtcbiAgICAgICAgICAgIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGV2ZW50cy5lbWl0KCdnb3QtZGF0YScpO1xuICAgIH07XG4gICAgdGhpcy5nb3RQZXJtaXNzaW9ucyA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbiAodiwgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBMYXp5KHZbMF0pLmVhY2goZnVuY3Rpb24gKHJvdywgaWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoKHJlc291cmNlTmFtZSBpbiBJREIpICYmIChpZCBpbiBJREJbcmVzb3VyY2VOYW1lXS5zb3VyY2UpKXtcbiAgICAgICAgICAgICAgICAgICAgSURCW3Jlc291cmNlTmFtZV0uZ2V0KGlkKS5fcGVybWlzc2lvbnMgPSBMYXp5KHJvdykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHRydWVdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoTGF6eSh2WzBdKS5zaXplKCkpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3VwZGF0ZS1wZXJtaXNzaW9ucy0nICsgcmVzb3VyY2VOYW1lLCBMYXp5KHZbMF0pLmtleXMoKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMnKTtcbiAgICB9O1xuXG5cbiAgICB0aGlzLmdvdE0yTSA9IGZ1bmN0aW9uKG0ybSl7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICB2YXIgbTJtSW5kZXggPSBsaW5rZXIubTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbihtKXtcbiAgICAgICAgICAgICAgICBMYXp5KG0pLmVhY2goZnVuY3Rpb24oZGF0YSx2ZXJiKXtcbiAgICAgICAgICAgICAgICAgICAgbTJtSW5kZXhbdmVyYl0oZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGV2ZW50cy5lbWl0KCdyZWNlaXZlZC1tMm0nKTtcbiAgICAgICAgICAgIGV2ZW50cy5lbWl0KCdyZWNlaXZlZC1tMm0tJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuZmV0Y2ggPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBjYWxsQmFjaykgeyAgLy9cbiAgICAgICAgLy8gaWYgYSBjb25uZWN0aW9uIGlzIGN1cnJlbnRseSBydW5uaW5nLCB3YWl0IGZvciBjb25uZWN0aW9uLlxuICAgICAgICBpZiAobW9kZWxOYW1lIGluIHdhaXRpbmdDb25uZWN0aW9ucyl7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBjYWxsQmFjayk7XG4gICAgICAgICAgICB9LDUwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBmZXRjaGluZyBhc3luY2hyb21vdXMgbW9kZWwgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgICAgIC8vIGlmIGRhdGEgY2FtZXMgZnJvbSByZWFsdGltZSBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKFcyUFJFU09VUkNFLmNvbm5lY3Rpb24ub3B0aW9ucy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIGdldHRpbmcgZmlsdGVyIGZpbHRlcmVkIGJ5IGNhY2hpbmcgc3lzdGVtXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlciA9IGxpc3RDYWNoZS5maWx0ZXIobW9kZWwsZmlsdGVyKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBpZiBzb210aGluZyBpcyBtaXNzaW5nIG9uIG15IGxvY2FsIERCIFxuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzayBmb3IgbWlzc2luZ3MgYW5kIHBhcnNlIHNlcnZlciByZXNwb25zZSBpbiBvcmRlciB0byBlbnJpY2ggbXkgbG9jYWwgREIuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGFjaW5nIGxvY2sgZm9yIHRoaXMgbW9kZWxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KG1vZGVsTmFtZSArICcvbGlzdCcsIHtmaWx0ZXIgOiBmaWx0ZXJ9LGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSxjYWxsQmFjaylcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgbG9ja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVsZWFzZSBsb2NrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2xpc3QnLCBzZW5kRGF0YSxmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdPVF9BTEwuc291cmNlLnB1c2gobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShkYXRhLCBjYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmdldCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzLCBjYWxsQmFjayl7XG4gICAgICAgIC8vIHNlYXJjaCBvYmplY3RzIGZyb20gSURCLiBJZiBzb21lIGlkIGlzIG1pc3NpbmcsIGl0IHJlc29sdmUgaXQgYnkgdGhlIHNlcnZlclxuICAgICAgICAvLyBpZiBhIHJlcXVlc3QgdG8gdGhlIHNhbWUgbW9kZWwgaXMgcGVuZGluZywgd2FpdCBmb3IgaXRzIGNvbXBsZXRpb25cbiAgICAgICAgXG4gICAgICAgIGlmIChpZHMuY29uc3RydWN0b3IgIT09IEFycmF5KXtcbiAgICAgICAgICAgIGlkcyA9IFtpZHNdO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIHNvbWUgZW50aXR5IGlzIG1pc3NpbmcgXG4gICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSAsIHtpZDogaWRzfSwgbnVsbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgdmFyIGl0YWIgPSBJREJbbW9kZWxOYW1lXVxuICAgICAgICAgICAgZm9yICh2YXIgaWQgaW4gaWRzKXtcbiAgICAgICAgICAgICAgICByZXQucHVzaChpdGFiLnNvdXJjZVtpZHNbaWRdXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsQmFjayhyZXQpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5nb3RNb2RlbCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGZvciAodmFyIG1vZGVsTmFtZSBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSBkYXRhW21vZGVsTmFtZV07XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2VbJ2Rlc2NyaXB0aW9uOicgKyBtb2RlbE5hbWVdID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBtb2RlbENhY2hlW21vZGVsTmFtZV0gPSBtYWtlTW9kZWxDbGFzcyhtb2RlbCk7XG4gICAgICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gSURCKSkge1xuICAgICAgICAgICAgICAgIElEQlttb2RlbE5hbWVdID0gTGF6eSh7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5kZXNjcmliZSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgY2FsbEJhY2spe1xuICAgICAgICB2YXIgcmV0ID0gbW9kZWxDYWNoZVttb2RlbE5hbWVdO1xuICAgICAgICBpZiAocmV0KSB7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhyZXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHdhaXRpbmdDb25uZWN0aW9ucykpe1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gZmFpbGVkTW9kZWxzKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBjYWNoZUtleSA9ICdkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChjYWNoZUtleSBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nb3RNb2RlbChKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVtjYWNoZUtleV0pKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sobW9kZWxDYWNoZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9kZXNjcmliZScsbnVsbCwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RNb2RlbChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMubW9kZWxOb3RGb3VuZC5oYW5kbGUobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxlZE1vZGVsc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9ICAgICAgICBcbiAgICB9O1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZGVjb3JhdG9yKSB7XG4gICAgICAgIHZhciBrZXkgPSB1dGlscy5oYXNoKGRlY29yYXRvcik7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlcnMpKSBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXSA9IG5ldyBIYW5kbGVyKCk7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlclVzZWQpKSBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXSA9IHt9O1xuICAgICAgICBpZiAoa2V5IGluIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdW2tleV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gbW9kZWxDYWNoZSkge1xuICAgICAgICAgICAgZGVjb3JhdG9yKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXS5hZGRIYW5kbGVyKGRlY29yYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGF0dHJpYnV0ZXMpe1xuICAgICAgICB2YXIgYWRkUHJvcGVydHkgPSBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlcykge1xuICAgICAgICAgIGF0dHJpYnV0ZXMuZm9yRWFjaChmdW5jdGlvbih2YWwpe1xuICAgICAgICAgICAgdmFyIGtleSA9ICdwQTonICsgbW9kZWwubW9kZWxOYW1lICsgJzonICsgdmFsO1xuICAgICAgICAgICAgdmFyIGthdHRyID0gJ19fJyArIHZhbDtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtb2RlbC5wcm90b3R5cGUsIHZhbCwge1xuICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2F0dHIgaW4gdGhpcykpe1xuICAgICAgICAgICAgICAgICAgdmFyIHYgPSBsb2NhbFN0b3JhZ2Vba2V5ICsgdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgICB0aGlzW2thdHRyXSA9IHY/SlNPTi5wYXJzZSh2KTpudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1trYXR0cl07XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgICAgIHRoaXNba2F0dHJdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW2tleSArIHRoaXMuaWRdID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKSkgeyBwZXJzaXN0ZW50QXR0cmlidXRlc1ttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgdmFyIGF0dHJzID0gcGVyc2lzdGVudEF0dHJpYnV0ZXNbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHZhciBuZXdBdHRycyA9IExhenkoYXR0cmlidXRlcykuZGlmZmVyZW5jZShhdHRycykudG9BcnJheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5ld0F0dHJzID0gYXR0cnM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld0F0dHJzLmxlbmd0aCl7XG4gICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIG1vZGVsQ2FjaGUpe1xuICAgICAgICAgICAgICAgIGFkZFByb3BlcnR5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSwgbmV3QXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGF0dHJzLG5ld0F0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbignbmV3LW1vZGVsJywgZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVycyl7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWwubW9kZWxOYW1lXS5oYW5kbGUobW9kZWxDYWNoZVttb2RlbC5tb2RlbE5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzKG1vZGVsLm1vZGVsTmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmNvbm5lY3QgPSBmdW5jdGlvbihjYWxsQmFjayl7XG4gICAgICAgIGlmICh0aGlzLmlzQ29ubmVjdGVkKXtcbiAgICAgICAgICAgIGNhbGxCYWNrKHRoaXMuY29ubmVjdGlvbi5vcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5jb25uZWN0KGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuaXNDb25uZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgICAgICAgICB9KTsgICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5xdWVyeSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spe1xuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdGhpcy5kZXNjcmliZShtb2RlbE5hbWUsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgLy8gYXJyYXlmaXkgYWxsIGZpbHRlciB2YWx1ZXNcbiAgICAgICAgICAgIGZpbHRlciA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odixrKXsgcmV0dXJuIFtrLEFycmF5LmlzQXJyYXkodik/djpbdl1dfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgIHZhciBmaWx0ZXJGdW5jdGlvbiA9IHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICB2YXIgaWR4ID0gZ2V0SW5kZXgobW9kZWxOYW1lKTtcbiAgICAgICAgICAgIHRocy5mZXRjaChtb2RlbE5hbWUsZmlsdGVyLHRvZ2V0aGVyLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhpZHguZmlsdGVyKGZpbHRlckZ1bmN0aW9uKS52YWx1ZXMoKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzLCBjYWxsQmFjayl7XG4gICAgICAgIHJldHVybiB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVsZXRlJywgeyBpZCA6IGlkc30sIGNhbGxCYWNrKTtcbiAgICB9O1xufTtcblxuZnVuY3Rpb24gcmVXaGVlbE9STShlbmRQb2ludCwgbG9naW5GdW5jKXtcbiAgICB0aGlzLiRvcm0gPSBuZXcgYmFzZU9STShuZXcgdXRpbHMucmVXaGVlbENvbm5lY3Rpb24oZW5kUG9pbnQsIGxvZ2luRnVuYyksdGhpcyk7XG4gICAgdGhpcy5vbiA9IHRoaXMuJG9ybS5vbi5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5lbWl0ID0gdGhpcy4kb3JtLmVtaXQuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMudW5iaW5kID0gdGhpcy4kb3JtLnVuYmluZC5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5hZGRNb2RlbEhhbmRsZXIgPSB0aGlzLiRvcm0uYWRkTW9kZWxIYW5kbGVyLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzID0gdGhpcy4kb3JtLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLnV0aWxzID0gdXRpbHM7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldE1vZGVsID0gZnVuY3Rpb24obW9kZWxOYW1lKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlc2NyaWJlKG1vZGVsTmFtZSxhY2NlcHQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzaW5nbGUgPSBmYWxzZTtcbiAgICB2YXIgbW9kTmFtZSA9IG1vZGVsTmFtZTtcbiAgICBpZiAoaWRzLmNvbnN0cnVjdG9yICE9PSBBcnJheSl7XG4gICAgICAgIHNpbmdsZSA9IHRydWU7XG4gICAgICAgIGlkcyA9IFtpZHNdXG4gICAgfVxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKHNpbmdsZSl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5nZXQobW9kTmFtZSwgaWRzLCBmdW5jdGlvbihpdGVtcyl7IFxuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KGl0ZW1zWzBdKTt9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kb3JtLmdldChtb2ROYW1lLCBpZHMsIGFjY2VwdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5xdWVyeSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgcmVsYXRlZCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHZhciB0b2dldGhlciA9IG51bGw7XG4gICAgICAgIGlmIChyZWxhdGVkICYmIChyZWxhdGVkLmNvbnN0cnVjdG9yID09PSBBcnJheSkgJiYgKHJlbGF0ZWQubGVuZ3RoKSl7XG4gICAgICAgICAgICB0b2dldGhlciA9IHJlbGF0ZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRlZCAmJiAocmVsYXRlZC5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKSAmJiAocmVsYXRlZC5sZW5ndGgpKXtcbiAgICAgICAgICAgIHRvZ2V0aGVyID0gcmVsYXRlZC5zcGxpdCgnLCcpO1xuICAgICAgICB9XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGlmIChzZWxmLiRvcm0uaXNDb25uZWN0ZWQpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5xdWVyeShtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGFjY2VwdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5xdWVyeShtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGFjY2VwdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGlkcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGlmIChzZWxmLiRvcm0uY29ubmVjdGVkKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVsZXRlKG1vZGVsTmFtZSwgaWRzLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVsZXRlKG1vZGVsTmFtZSwgaWRzLCBhY2NlcHQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS4kc2VuZFRvRW5kcG9pbnQgPSBmdW5jdGlvbiAodXJsLCBkYXRhKXtcbiAgICByZXR1cm4gdGhpcy4kb3JtLiRwb3N0KHVybCwgZGF0YSk7XG59XG5cbiJdfQ==
