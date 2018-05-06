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
            utils.xdr(tis.options.endPoint + url, data, ths.options.application, ths.options.token).then(function (xhr) {
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
                    field.widget = field.type;
                }
            });
            // setting choices widget for references
            Lazy(model.references).each(function (field) {
                if (!field.widget) {
                    field.widget = 'choices';
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJ0b3VjaGVyLmpzIiwidmFjdXVtY2FjaGVyLmpzIiwiYXV0b2xpbmtlci5qcyIsImxpc3RjYWNoZXIuanMiLCJtYW55dG9tYW55LmpzIiwiY2FjaGVyLmpzIiwib3JtLmpzIl0sIm5hbWVzIjpbIkhhbmRsZXIiLCJoYW5kbGVycyIsInN0ckhhbmRsZXJzIiwicHJvdG90eXBlIiwiYWRkSGFuZGxlciIsImhhbmRsZXIiLCJzdHJIYW5kbGVyIiwidXRpbHMiLCJoYXNoIiwidG9TdHJpbmciLCJwdXNoIiwiaGFuZGxlIiwiYXJncyIsIkFycmF5Iiwic2xpY2UiLCJjYWxsIiwiYXJndW1lbnRzIiwiZm9yRWFjaCIsImZ1bmMiLCJhcHBseSIsImhhbmRsZUJ5IiwidGhzIiwiTmFtZWRFdmVudE1hbmFnZXIiLCJldmVudHMiLCJoYW5kbGVySWQiLCJpZHhJZCIsIm9uIiwibmFtZSIsImlkIiwiZW1pdCIsImV2ZW50IiwidW5iaW5kIiwiY291bnQiLCJMYXp5IiwiZWFjaCIsInYiLCJrIiwiaWR4IiwibiIsInJldmVyc2UiLCJ4Iiwic3BsaWNlIiwiY2FjaGVkS2V5SWR4IiwibnVsbFN0cmluZyIsIm1vY2tPYmplY3QiLCJQcm94eSIsImdldCIsInRhcmdldCIsIiRQT1NUIiwidXJsIiwiZGF0YSIsImNhbGxCYWNrIiwiZXJyb3JCYWNrIiwiaGVhZGVycyIsIm9wdHMiLCJhY2NlcHRzIiwiSlNPTiIsInN0cmluZ2lmeSIsImRhdGFUeXBlIiwic3VjY2VzcyIsImVycm9yIiwibWV0aG9kIiwiY29udGVudFR5cGUiLCJjcm9zc0RvbWFpbiIsIiQiLCJhamF4IiwicmVXaGVlbENvbm5lY3Rpb24iLCJlbmRQb2ludCIsImdldExvZ2luIiwic2VsZiIsImJpbmQiLCJvcHRpb25zIiwic3RhdHVzIiwiZm9yY2UiLCJsb2NhbFN0b3JhZ2UiLCJwYXJzZSIsImxhc3RSV1RTdGF0dXMiLCJlIiwiX3N0YXR1c19jYWxsaW5nIiwic2V0VGltZW91dCIsInRpbWVzdGFtcCIsIiRwb3N0IiwidXNlcl9pZCIsImxvZ0luZm8iLCJjb25zdHJ1Y3RvciIsIk9iamVjdCIsImxvZ2luIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsInRoZW4iLCJ0b2tlbiIsImFwcGxpY2F0aW9uIiwicHJvbWlzZSIsIlByb21pc2UiLCJhY2NlcHQiLCJyZWplY3QiLCJ4ZHIiLCJ4aHIiLCJyZXNwb25zZVRleHQiLCJyZXNwb25zZURhdGEiLCJjb25uZWN0aW9uIiwiY29ubmVjdCIsIndzY29ubmVjdCIsIndzQ29ubmVjdGlvbiIsIndzQ29ubmVjdCIsIm9uQ29ubmVjdCIsIm9uRGlzY29ubmVjdCIsImNvbnNvbGUiLCJsb2ciLCJyZWFsdGltZUVuZFBvaW50IiwicmVuYW1lRnVuY3Rpb24iLCJmbiIsIkZ1bmN0aW9uIiwiY2FjaGVkIiwia2V5Iiwid3JhcHBlciIsImZvcm1FbmNvZGUiLCJyZXEiLCJYTUxIdHRwUmVxdWVzdCIsIm9ucmVhZHlzdGF0ZWNoYW5nZSIsInJlYWR5U3RhdGUiLCJhIiwicmVzcG9uc2UiLCJzdGF0dXNUZXh0IiwicmVxdWVzdCIsIlhEb21haW5SZXF1ZXN0Iiwib25sb2FkIiwiRXJyb3IiLCJvcGVuIiwib25lcnJvciIsInNldFJlcXVlc3RIZWFkZXIiLCJfX3Rva2VuX18iLCJzaXplIiwibWFwIiwiZW5jb2RlVVJJIiwidG9BcnJheSIsImpvaW4iLCJzZW5kIiwiY2FwaXRhbGl6ZSIsInMiLCJ0b1VwcGVyQ2FzZSIsInRvTG93ZXJDYXNlIiwic3RyIiwicmV0IiwibGVuZ3RoIiwiY2hhckNvZGVBdCIsIm1ha2VGaWx0ZXIiLCJtb2RlbCIsImZpbHRlciIsInVuaWZpZXIiLCJkb250VHJhbnNsYXRlRmlsdGVyIiwic291cmNlIiwidmFscyIsImZpZWxkIiwiaXNBcnJheSIsImZpZWxkcyIsInR5cGUiLCJOdW1iZXIiLCJzYW1lQXMiLCJ5Iiwid2l6YXJkIiwib25Db25uZWN0aW9uIiwib25EaXNjb25uZWN0aW9uIiwib25NZXNzYWdlSnNvbiIsIm9uTWVzc2FnZVRleHQiLCJvbldpemFyZCIsIlNvY2tKUyIsIm9ub3BlbiIsInRlbmFudCIsIm9ubWVzc2FnZSIsIm9uY2xvc2UiLCJwbHVyYWxpemUiLCJiZWZvcmVDYWxsIiwiYmVmb3JlIiwiZGVjb3JhdG9yIiwiY2xlYW5TdG9yYWdlIiwia2V5cyIsImNociIsInNwbGl0IiwicGVybXV0YXRpb25zIiwiYXJyIiwiYm9vbCIsIkJvb2xlYW4iLCJub29wIiwidHpPZmZzZXQiLCJEYXRlIiwiZ2V0VGltZXpvbmVPZmZzZXQiLCJ0cmFuc0ZpZWxkVHlwZSIsImRhdGUiLCJkYXRldGltZSIsInN0cmluZyIsInRleHQiLCJpbnRlZ2VyIiwicGFyc2VJbnQiLCJmbG9hdCIsInBhcnNlRmxvYXQiLCJtb2NrIiwiVG91Y2hlciIsInRvdWNoZWQiLCJ0b3VjaCIsInQiLCJWYWN1dW1DYWNoZXIiLCJhc2tlZCIsIm1pc3NpbmciLCJhc2siLCJsYXp5IiwiY29udGFpbnMiLCJnZXRBc2tlZEluZGV4IiwibWlzc2luZ3MiLCJ1bmlxdWUiLCJBdXRvTGlua2VyIiwiYWN0aXZlcyIsIklEQiIsIlcyUFJFU09VUkNFIiwibGlzdENhY2hlIiwibWFpbkluZGV4IiwiZm9yZWlnbktleXMiLCJtMm0iLCJtMm1JbmRleCIsInBlcm1pc3Npb25zIiwicGtJbmRleCIsImdldEluZGV4Rm9yIiwicmVmZXJlbmNlcyIsInJlZmVyZW5jZSIsImluZGV4TmFtZSIsInRvIiwicmVmZXJlbmNlZEJ5IiwiYnkiLCJtYW55VG9NYW55IiwicmVsYXRpb24iLCJNYW55VG9NYW55UmVsYXRpb24iLCJtMm1HZXQiLCJjb2xsZWN0aW9uIiwiZ290RGF0YSIsImdldE0yTSIsImxpbmtVbmxpbmtlZCIsInZhbHVlcyIsInN1bSIsImNoYW5nZWQiLCJpbmRleGVzIiwiaW5kZXgiLCJJTkRFWCIsImdldHRlciIsImlkcyIsIm90aGVySW5kZXgiLCJkZXNjcmliZSIsImZsYXR0ZW4iLCJtb2RlbE5hbWUiLCJpZGIiLCJmZXRjaCIsIm1haW5SZXNvdXJjZSIsImZpZWxkTmFtZSIsInRvT2JqZWN0IiwicmVzb3VyY2VOYW1lIiwiZ290UGVybWlzc2lvbnMiLCJQRVJNSVNTSU9OUyIsInNldEludGVydmFsIiwiTGlzdENhY2hlciIsImdvdEFsbCIsImNvbXBvc2l0ZUFza2VkIiwiY2FydGVzaWFuUHJvZHVjdDEiLCJiIiwiY2FydGVzaWFuUHJvZHVjdCIsImV4cGxvZGVGaWx0ZXIiLCJwcm9kdWN0IiwiciIsImZpbHRlclNpbmdsZSIsInRlc3RPbmx5IiwiZGlmZmVyZW5jZSIsImNsZWFuQ29tcG9zaXRlcyIsImZpbHRlckxlbiIsIml0ZW1zIiwiaXRlbSIsImdvdCIsInNpbmdsZSIsInNvbWUiLCJmIiwiZXhwbG9kZWQiLCJwYXJ0aWFscyIsImJhZCIsInBsdWNrIiwiYWRkIiwiZmluZCIsImdldDAiLCJnZXQxIiwiZGVsIiwibCIsImNhY2hlZFByb3BlcnR5QnlFdmVudHMiLCJwcm90byIsInByb3BlcnR5TmFtZSIsInNldHRlciIsInJlc3VsdCIsIm9ybSIsInByb3BlcnR5RGVmIiwidmFsdWUiLCJkZWZpbmVQcm9wZXJ0eSIsIlZhbGlkYXRpb25FcnJvciIsInJlc291cmNlIiwiX3Jlc291cmNlIiwiZm9ybUlkeCIsImVycm9ycyIsImJhc2VPUk0iLCJleHRPUk0iLCJTdHJpbmciLCJjb25uZWN0ZWQiLCJ3cyIsImluZm8iLCJtZXNzYWdlIiwic2VudERhdGEiLCJ3YWl0aW5nQ29ubmVjdGlvbnMiLCJhdXRoX2dyb3VwIiwiSURYIiwiUkVWSURYIiwiYnVpbGRlckhhbmRsZXJzIiwiYnVpbGRlckhhbmRsZXJVc2VkIiwicGVyc2lzdGVudEF0dHJpYnV0ZXMiLCJldmVudEhhbmRsZXJzIiwicGVybWlzc2lvbldhaXRpbmciLCJtb2RlbENhY2hlIiwiZmFpbGVkTW9kZWxzIiwibGlua2VyIiwidmFsaWRhdGlvbkV2ZW50IiwiY3VycmVudENvbnRleHQiLCJzYXZpbmdFcnJvckhhbmxkZXIiLCJnZXRJbmRleCIsImdldFVubGlua2VkIiwiVU5MSU5LRUQiLCJQZXJtaXNzaW9uVGFibGUiLCJrbGFzcyIsInNhdmUiLCJjYiIsIm15UGVybXMiLCJncm91cF9pZCIsInBlcm1pc3Npb25MaXN0IiwicCIsInBlcm1zIiwiYWxsUGVybWlzc2lvbnMiLCJpbmRleE9mIiwibWFrZU1vZGVsQ2xhc3MiLCJfbW9kZWwiLCJwcml2YXRlQXJncyIsIm1lcmdlIiwiZnVuY1N0cmluZyIsIktsYXNzIiwicmVmX3RyYW5zbGF0aW9ucyIsImludmVyc2VfcmVmZXJlbmNlcyIsInJlZmVyZW50cyIsImZpZWxkc09yZGVyIiwiZmllbGRPcmRlciIsInJlcHJlc2VudGF0aW9uIiwiZGVsZXRlIiwiX3Blcm1pc3Npb25zIiwiYWxsX3Blcm1zIiwib2JqZWN0X2lkIiwiZ3JvdXBlZCIsInVua25vd25fZ3JvdXBzIiwiZ3JvdXBCeSIsIm8iLCJhc1JhdyIsIklEIiwiYXJnIiwid3JpdGFibGUiLCJjb250ZXh0IiwiY29weSIsIm9iaiIsImFzciIsImNvbmNhdCIsInNhdmVNdWx0aSIsIm9iamVjdHMiLCJzY29wZSIsInJhdyIsImRlbGV0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsInNhdmVQQSIsIlQiLCJvbyIsIlBBIiwiRnMiLCJmaWVsZElkeCIsInRhcCIsImluZGV4QnkiLCJ3aWRnZXQiLCJyZWYiLCJleHRfcmVmIiwibG9jYWxfcmVmIiwiVHlwZUVycm9yIiwicmV2SW5kZXgiLCJoYXNPd25Qcm9wZXJ0eSIsIiRsb2ciLCJxdWVyeSIsImZpcnN0Iiwib21vZGVsTmFtZSIsInJlYWRhYmxlIiwidmFsaWRhdG9ycyIsInVubGlua1JlZmVyZW5jZSIsImluc3RhbmNlIiwiaW5zdGFuY2VzIiwib21vZGVsIiwibGlua1JlZmVyZW5jZSIsInJlZnMiLCJJTkRFWF9NMk0iLCJXMlBfUE9TVCIsIl9leHRyYSIsIlRPT05FIiwiVE9NQU5ZIiwiTUFOWVRPTUFOWSIsIm1vZGVsQ2xhc3MiLCJ6aXAiLCJkZWxldGVkIiwiTVBBIiwicmVjb3JkIiwiaXRhYiIsInRhYmxlIiwiaWsiLCJubmV3IiwidXBkYXRlZCIsIm5ld09iamVjdHMiLCJvbGRJdGVtIiwib2xkQ29weSIsIm5ld0l0ZW0iLCJubyIsInRvdGFsUmVzdWx0cyIsInVkeCIsIkFTS0VEX1VOTElOS0VEIiwiQVNLRURfTTJNIiwiTUlEWCIsImdvdE0yTSIsInJvdyIsIm0iLCJ2ZXJiIiwidG9nZXRoZXIiLCJzZW5kRGF0YSIsIkdPVF9BTEwiLCJnb3RNb2RlbCIsImNhY2hlS2V5IiwibW9kZWxOb3RGb3VuZCIsImFkZE1vZGVsSGFuZGxlciIsImFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiYXR0cmlidXRlcyIsImFkZFByb3BlcnR5IiwidmFsIiwia2F0dHIiLCJzZXQiLCJhdHRycyIsIm5ld0F0dHJzIiwiaXNDb25uZWN0ZWQiLCJmaWx0ZXJGdW5jdGlvbiIsInJlV2hlZWxPUk0iLCJsb2dpbkZ1bmMiLCIkb3JtIiwiZ2V0TW9kZWwiLCJtb2ROYW1lIiwicmVsYXRlZCIsIiRzZW5kVG9FbmRwb2ludCJdLCJtYXBwaW5ncyI6Ijs7O0lBQUEsYTtJQUVBLFNBQUFBLE9BQUEsR0FBQTtBQUFBLFFBQ0EsS0FBQUMsUUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLFFBRUEsS0FBQUMsV0FBQSxHQUFBLEVBQUEsQ0FGQTtBQUFBLEs7SUFHQSxDO0lBRUFGLE9BQUEsQ0FBQUcsU0FBQSxDQUFBQyxVQUFBLEdBQUEsVUFBQUMsT0FBQSxFQUFBO0FBQUEsUUFDQSxJQUFBQyxVQUFBLEdBQUFDLEtBQUEsQ0FBQUMsSUFBQSxDQUFBSCxPQUFBLENBQUFJLFFBQUEsRUFBQSxDQUFBLENBREE7QUFBQSxRQUVBLElBQUEsQ0FBQSxDQUFBSCxVQUFBLElBQUEsS0FBQUosV0FBQSxDQUFBLEVBQUE7QUFBQSxZQUNBLEtBQUFBLFdBQUEsQ0FBQUksVUFBQSxJQUFBRCxPQUFBLENBREE7QUFBQSxZQUVBLEtBQUFKLFFBQUEsQ0FBQVMsSUFBQSxD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QUEsRUFEQTtBQUFBLHFCQUFBLEVBREE7QUFBQSxpQkFIQTtBQUFBLGFBQUEsQ0FRQSxPQUFBakIsQ0FBQSxFQUFBO0FBQUEsZ0JBQ0FrQixNQUFBLENBQUFsQixDQUFBLEVBREE7QUFBQSxhQVRBO0FBQUEsU0FBQSxDQUFBLENBRkE7QUFBQSxLQUFBLEM7SUFpQkF5WCxVQUFBLENBQUFuYyxTQUFBLENBQUF5YyxlQUFBLEdBQUEsVUFBQTNaLEdBQUEsRUFBQUMsSUFBQSxFQUFBO0FBQUEsUUFDQSxPQUFBLEtBQUFzWixJQUFBLENBQUF2WCxLQUFBLENBQUFoQyxHQUFBLEVBQUFDLElBQUEsQ0FBQSxDQURBO0FBQUEsS0FBQSxDIiwiZmlsZSI6InJ3dC5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gSGFuZGxlcigpe1xuICAgIHRoaXMuaGFuZGxlcnMgPSBbXTtcbiAgICB0aGlzLnN0ckhhbmRsZXJzID0ge307XG59O1xuXG5IYW5kbGVyLnByb3RvdHlwZS5hZGRIYW5kbGVyID0gZnVuY3Rpb24gKGhhbmRsZXIpe1xuICAgIHZhciBzdHJIYW5kbGVyID0gdXRpbHMuaGFzaChoYW5kbGVyLnRvU3RyaW5nKCkpO1xuICAgIGlmICghKHN0ckhhbmRsZXIgaW4gdGhpcy5zdHJIYW5kbGVycykpe1xuICAgICAgICB0aGlzLnN0ckhhbmRsZXJzW3N0ckhhbmRsZXJdID0gaGFuZGxlcjtcbiAgICAgICAgdGhpcy5oYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH1cbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApO1xuICAgIHRoaXMuaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihmdW5jKXtcbiAgICAgICAgZnVuYy5hcHBseShudWxsLGFyZ3MpO1xuICAgIH0pXG59O1xuSGFuZGxlci5wcm90b3R5cGUuaGFuZGxlQnkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgIHZhciB0aHMgPSBhcmd1bWVudHNbMF07XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KHRocyxhcmdzKTtcbiAgICB9KVxufTtcblxuXG5mdW5jdGlvbiBOYW1lZEV2ZW50TWFuYWdlciAoKXtcbiAgICB2YXIgZXZlbnRzID0ge307XG4gICAgdmFyIGhhbmRsZXJJZCA9IHt9O1xuICAgIHZhciBpZHhJZCA9IDA7XG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKG5hbWUsIGZ1bmMpe1xuICAgICAgICBpZiAoIShuYW1lIGluIGV2ZW50cykpe1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdID0gbmV3IEFycmF5KCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkID0gaWR4SWQgKys7XG4gICAgICAgIGV2ZW50c1tuYW1lXS5wdXNoKGZ1bmMpO1xuICAgICAgICBoYW5kbGVySWRbaWRdID0gZnVuYztcbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH07XG4gICAgdGhpcy5lbWl0ID0gZnVuY3Rpb24obmFtZSl7XG4gICAgICAgIGlmIChuYW1lIGluIGV2ZW50cyl7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKTtcbiAgICAgICAgICAgIGV2ZW50c1tuYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgICAgICBldmVudC5hcHBseShudWxsLGFyZ3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMudW5iaW5kID0gZnVuY3Rpb24oaGFuZGxlcil7XG4gICAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICAgIGlmIChoYW5kbGVyIGluIGhhbmRsZXJJZCl7XG4gICAgICAgICAgICB2YXIgZnVuYyA9IGhhbmRsZXJJZFtoYW5kbGVyICsgJyddO1xuICAgICAgICAgICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbiBpbiB2KXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZbbl0gPT09IGZ1bmMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWR4LnB1c2gobik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlkeC5yZXZlcnNlKCkuZm9yRWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgdi5zcGxpY2UoeCwxKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBoYW5kbGVySWRbaGFuZGxlcl07XG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICB9O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2FjaGVkS2V5SWR4ID0gMDtcblxudmFyIG51bGxTdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICcnfTtcblxuZnVuY3Rpb24gbW9ja09iamVjdCgpe1xuICAgIHJldHVybiBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbih0YXJnZXQsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbmFtZSAgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSA9PT0gJ3RvU3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbFN0cmluZztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbW9ja09iamVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtuYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pXG59XG5cbnZhciAkUE9TVCA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgY2FsbEJhY2ssIGVycm9yQmFjayxoZWFkZXJzKXtcbiAgICB2YXIgb3B0cyA9IHtcbiAgICAgICAgYWNjZXB0cyA6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgdXJsIDogdXJsLFxuICAgICAgICBkYXRhIDogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIGRhdGFUeXBlIDogJ2pzb24nLFxuICAgICAgICBzdWNjZXNzIDogY2FsbEJhY2ssXG4gICAgICAgIGVycm9yIDogZXJyb3JCYWNrLFxuICAgICAgICBtZXRob2QgOiAnUE9TVCcsXG4gICAgICAgIGNvbnRlbnRUeXBlIDogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgfTtcbiAgICBpZiAoaGVhZGVycyl7XG4gICAgICAgIG9wdHMuaGVhZGVycyA9IGhlYWRlcnM7XG4gICAgICAgIG9wdHMuY3Jvc3NEb21haW4gPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gJC5hamF4KG9wdHMpO1xufVxuXG5mdW5jdGlvbiByZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgZ2V0TG9naW4pe1xuICAgIC8vIG1haW4gXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZ2V0TG9naW4gPSBnZXRMb2dpbjtcbiAgICB0aGlzLmV2ZW50cyA9IG5ldyBOYW1lZEV2ZW50TWFuYWdlcigpXG4gICAgdGhpcy4kUE9TVCA9ICRQT1NULmJpbmQodGhpcyk7XG4gICAgdGhpcy5vcHRpb25zID0ge2VuZFBvaW50IDogZW5kUG9pbnR9O1xuICAgIHRoaXMub24gPSB0aGlzLmV2ZW50cy5vbi5iaW5kKHRoaXMpO1xufTtcbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5zdGF0dXMgPSBmdW5jdGlvbihjYWxsQmFjaywgZm9yY2Upe1xuICAgIGlmICgoJ2xhc3RSV1RTdGF0dXMnIGluIGxvY2FsU3RvcmFnZSkgJiYgIWZvcmNlKSB7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHZhciBzdGF0dXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzKTtcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gc3RhdHVzKXsgdGhpcy5vcHRpb25zW3hdID0gc3RhdHVzW3hdOyB9XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzKGNhbGxCYWNrLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3N0YXR1c19jYWxsaW5nKXtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5zdGF0dXMoY2FsbEJhY2spO1xuICAgICAgICB9LDUwKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMudGltZXN0YW1wKXtcbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sodGhpcy5vcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGF0dXNfY2FsbGluZyA9IHRydWU7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHRoaXMuJHBvc3QoJ2FwaS9zdGF0dXMnLG51bGwsZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgICAgIHNlbGYuX3N0YXR1c19jYWxsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIHN0YXR1cyl7IHNlbGYub3B0aW9uc1t4XSA9IHN0YXR1c1t4XTsgfVxuICAgICAgICAgICAgaWYgKCFzdGF0dXMudXNlcl9pZCAmJiBzZWxmLmdldExvZ2luKXtcbiAgICAgICAgICAgICAgICB2YXIgbG9nSW5mbyA9IHNlbGYuZ2V0TG9naW4oKTtcbiAgICAgICAgICAgICAgICBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2dpbihsb2dJbmZvLnVzZXJuYW1lLCBsb2dJbmZvLnBhc3N3b3JkKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBzdGF0dXMpeyBzZWxmLm9wdGlvbnNbeF0gPSBzdGF0dXNbeF07IH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cylcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHNlbGYub3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgfVxufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLiRwb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLGNhbGxCYWNrKXtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIGlmICghZGF0YSl7XG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIHZhciBoZWFkZXJzID0geyBcbiAgICAgICAgICAgIHRva2VuIDogdGhpcy5vcHRpb25zLnRva2VuLFxuICAgICAgICAgICAgYXBwbGljYXRpb24gOiB0aGlzLm9wdGlvbnMuYXBwbGljYXRpb25cbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaGVhZGVycyA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHRoaXMub3B0aW9ucy5lbmRQb2ludCArIHVybCwgZGF0YSwgdGhzLm9wdGlvbnMuYXBwbGljYXRpb24sIHRocy5vcHRpb25zLnRva2VuKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UnLCB4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cyArICctanNvbicsIHhoci5yZXNwb25zZURhdGEsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjYWxsQmFjaykgeyBjYWxsQmFjayggeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0ICl9O1xuICAgICAgICAgICAgICAgIGFjY2VwdCh4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItanNvbi0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlRGF0YSx1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItaHR0cCcseGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cyx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWh0dHAtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsdXJsLGRhdGEseGhyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKXtcbiAgICB2YXIgdXJsID0gdGhpcy5vcHRpb25zLmVuZFBvaW50ICsgJ2FwaS9sb2dpbic7XG4gICAgdmFyIGNvbm5lY3Rpb24gPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQscmVqZWN0KXtcbiAgICAgICAgdXRpbHMueGRyKHVybCx7IHVzZXJuYW1lOiB1c2VybmFtZSwgcGFzc3dvcmQgOiBwYXNzd29yZH0sIG51bGwsY29ubmVjdGlvbi5vcHRpb25zLnRva2VuLCB0cnVlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICB2YXIgc3RhdHVzID0geGhyLnJlc3BvbnNlRGF0YTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB4IGluIHN0YXR1cyl7IGNvbm5lY3Rpb24ub3B0aW9uc1t4XSA9IHN0YXR1c1t4XTsgfVxuICAgICAgICAgICAgICAgIGFjY2VwdChzdGF0dXMpO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgICAgICByZWplY3QoeGhyLnJlc3BvbnNlRGF0YSB8fCByZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgfSk7XG4vKiAgICAgICAgJC5hamF4KHtcbi8vICAgICAgICAgICAgaGVhZGVycyA6IGhlYWRlcnMsXG4gICAgICAgICAgICB1cmwgOiB1cmwsXG4gICAgICAgICAgICBkYXRhIDogeyB1c2VybmFtZTogdXNlcm5hbWUsIHBhc3N3b3JkIDogcGFzc3dvcmR9LFxuICAgICAgICAgICAgZGF0YVR5cGUgOiAnanNvbicsXG4gICAgICAgICAgICBtZXRob2QgOiAnUE9TVCcsXG4vLyAgICAgICAgICAgIGNvbnRlbnRUeXBlIDogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgbWltZVR5cGUgOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICBjcm9zc0RvbWFpbiA6IHRydWUsXG4gICAgICAgICAgICBzdWNjZXNzIDogZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB4IGluIHN0YXR1cyl7IGNvbm5lY3Rpb24ub3B0aW9uc1t4XSA9IHN0YXR1c1t4XTsgfVxuICAgICAgICAgICAgICAgIGFjY2VwdChzdGF0dXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yIDogZnVuY3Rpb24oeGhyLGRhdGEsIHN0YXR1cyl7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZUpTT04pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0pXG4qL1xuICAgIH0pO1xufTtcbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oY2FsbEJhY2spe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgd3Njb25uZWN0ID0gZnVuY3Rpb24oc2VsZil7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uID0gbmV3IHV0aWxzLndzQ29ubmVjdChzZWxmLm9wdGlvbnMpO1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbi5vbkNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuZXZlbnRzLmVtaXQoJ3dzLWNvbm5lY3RlZCcsIHNlbGYud3NDb25uZWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uLm9uRGlzY29ubmVjdChmdW5jdGlvbigpeyBcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICB3c2Nvbm5lY3Qoc2VsZik7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSwxMDAwKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgIGlmICgndG9rZW4nIGluIHNlbGYub3B0aW9ucyl7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhzdGF0dXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RpbmcgdG8gJyArIHNlbGYub3B0aW9ucy5lbmRQb2ludCk7XG4gICAgICAgICAgICBpZiAoc2VsZi5vcHRpb25zLnVzZXJuYW1lICYmIHNlbGYub3B0aW9ucy5wYXNzd29yZCl7XG4gICAgICAgICAgICAgICAgc2VsZi5sb2dpbihcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLnVzZXJuYW1lLFxuICAgICAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMucGFzc3dvcmQsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncmVuZXdpbmcgY29ubmVjdGlvbicpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXR1cy50b2tlbiAmJiBzdGF0dXMucmVhbHRpbWVFbmRQb2ludCAmJiAoIXNlbGYud3NDb25uZWN0aW9uKSl7XG4gICAgICAgICAgICB3c2Nvbm5lY3Qoc2VsZik7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbnZhciB1dGlscyA9IHtcbiAgICByZW5hbWVGdW5jdGlvbiA6IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICAgICAgICByZXR1cm4gKG5ldyBGdW5jdGlvbihcInJldHVybiBmdW5jdGlvbiAoY2FsbCkgeyByZXR1cm4gZnVuY3Rpb24gXCIgKyBuYW1lICtcbiAgICAgICAgICAgIFwiICgpIHsgcmV0dXJuIGNhbGwodGhpcywgYXJndW1lbnRzKSB9OyB9O1wiKSgpKShGdW5jdGlvbi5hcHBseS5iaW5kKGZuKSk7XG4gICAgfSxcbiAgICBjYWNoZWQgOiBmdW5jdGlvbihmdW5jLCBrZXkpe1xuICAgICAgICBpZiAoIWtleSl7ICAgIFxuICAgICAgICAgICAga2V5ID0gJ18nICsgY2FjaGVkS2V5SWR4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gd3JhcHBlcigpe1xuICAgICAgICAgICAgaWYgKCF0aGlzW2tleV0pe1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IGZ1bmMuY2FsbCh0aGlzLFthcmd1bWVudHNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzW2tleV07XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB3cmFwcGVyO1xuICAgIH0sXG4gICAgJFBPU1QgOiAkUE9TVCxcbiAgICByZVdoZWVsQ29ubmVjdGlvbjogcmVXaGVlbENvbm5lY3Rpb24sXG4gICAgbG9nOiBmdW5jdGlvbigpeyBcbiAgICAgICAgY29uc29sZS5sb2coYXJndW1lbnRzKTtcbiAgICB9LFxuXG4gICAgeGRyOiBmdW5jdGlvbiAodXJsLCBkYXRhLCBhcHBsaWNhdGlvbix0b2tlbiwgZm9ybUVuY29kZSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogTWFrZSBhbiBIVFRQIFJlcXVlc3QgYW5kIHJldHVybiBpdHMgcHJvbWlzZS5cbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIHJlcTtcbiAgICAgICAgICAgIGlmICghZGF0YSkgeyBkYXRhID0ge307fVxuXG4gICAgICAgICAgICBpZihYTUxIdHRwUmVxdWVzdCkge1xuICAgICAgICAgICAgICAgIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2VEYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZSA9IHtyZXNwb25zZURhdGE6IHJlc3BvbnNlRGF0YSwgcmVzcG9uc2VUZXh0OiByZXEucmVzcG9uc2VUZXh0LHN0YXR1czogcmVxLnN0YXR1c1RleHQsIHJlcXVlc3Q6IHJlcX07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVxLnN0YXR1cyA+PSAyMDAgJiYgcmVxLnN0YXR1cyA8IDQwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmKFhEb21haW5SZXF1ZXN0KXtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWERvbWFpblJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXEucmVzcG9uc2VUZXh0LHJlcS5zdGF0dXNUZXh0LCByZXEpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0NPUlMgbm90IHN1cHBvcnRlZCcpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxLm9wZW4oJ1BPU1QnLCB1cmwsIHRydWUpO1xuICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgaWYgKHRva2VuKSB7IGRhdGEuX190b2tlbl9fID0gdG9rZW4gfVxuICAgICAgICAgICAgaWYgKCFmb3JtRW5jb2RlKXtcbiAgICAgICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC1UeXBlJywndGV4dC9wbGFpbicpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLnNpemUoKT9KU09OLnN0cmluZ2lmeShkYXRhKTonJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpO1xuICAgICAgICAgICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUkkodi50b1N0cmluZygpKTsgIFxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKS5qb2luKCcmJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXEuc2VuZChkYXRhKTtcbiAgICAvLyAgICAgICAgcmVxLnNlbmQobnVsbCk7XG4gICAgICAgIH0pXG4gICAgfSxcbiAgICBcbiAgICBjYXBpdGFsaXplIDogZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgcmV0dXJuIHNbMF0udG9VcHBlckNhc2UoKSArIHMuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICB9LFxuXG4gICAgaGFzaCA6IGZ1bmN0aW9uKHN0cil7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIYXNoZWQgZnVuY3Rpb25cbiAgICAgICAgICovXG4gICAgICAgIHN0ciA9IHN0ci50b1N0cmluZygpO1xuICAgICAgICB2YXIgcmV0ID0gMTtcbiAgICAgICAgZm9yICh2YXIgeCA9IDA7eDxzdHIubGVuZ3RoO3grKyl7XG4gICAgICAgICAgICByZXQgKj0gKDEgKyBzdHIuY2hhckNvZGVBdCh4KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIChyZXQgJSAzNDk1ODM3NDk1NykudG9TdHJpbmcoKTtcbiAgICB9LFxuXG4gICAgbWFrZUZpbHRlciA6IGZ1bmN0aW9uIChtb2RlbCwgZmlsdGVyLCB1bmlmaWVyLCBkb250VHJhbnNsYXRlRmlsdGVyKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlIGZpbHRlciBmb3IgQXJyYXkuZmlsdGVyIGZ1bmN0aW9uIGFzIGFuIGFuZCBvZiBvclxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKCF1bmlmaWVyKSB7IHVuaWZpZXIgPSAnICYmICc7fVxuICAgICAgICBpZiAoTGF6eShmaWx0ZXIpLnNpemUoKSA9PT0gMCl7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oeCl7IHJldHVybiB0cnVlIH07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNvdXJjZSA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odmFscywgZmllbGQpe1xuICAgICAgICAgICAgaWYgKCF2YWxzKSB7IHZhbHMgPSBbbnVsbF19XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFscykpe1xuICAgICAgICAgICAgICAgIHZhbHMgPSBbdmFsc107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWRvbnRUcmFuc2xhdGVGaWx0ZXIgJiYgKG1vZGVsLmZpZWxkc1tmaWVsZF0udHlwZSA9PT0gJ3JlZmVyZW5jZScpKSB7XG4gICAgICAgICAgICAgICAgZmllbGQgPSAnXycgKyBmaWVsZDtcbiAgICAgICAgICAgICAgICB2YWxzID0gTGF6eSh2YWxzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgIGlmICh4ICYmICh4LmNvbnN0cnVjdG9yICE9PSBOdW1iZXIpKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmlkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1vZGVsLmZpZWxkc1tmaWVsZF0udHlwZSA9PT0gJ3N0cmluZycpe1xuICAgICAgICAgICAgICAgIHZhbHMgPSB2YWxzLm1hcChKU09OLnN0cmluZ2lmeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJygnICsgIExhenkodmFscykubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgIHJldHVybiAnKHguJyArIGZpZWxkICsgJyA9PT0gJyArIHggKyAnKSc7XG4gICAgICAgICAgICB9KS5qb2luKCcgfHwgJykgICsnKSc7XG4gICAgICAgIH0pLnRvQXJyYXkoKS5qb2luKHVuaWZpZXIpO1xuICAgICAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKFwieFwiLCBcInJldHVybiBcIiArIHNvdXJjZSk7XG4gICAgfSxcblxuICAgIHNhbWVBcyA6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWVwIGVxdWFsXG4gICAgICAgICAqL1xuICAgICAgICBmb3IgKHZhciBrIGluIHgpIHtcbiAgICAgICAgICAgIGlmICh5W2tdICE9IHhba10pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuXG4gICAgd3NDb25uZWN0IDogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbm5lY3RzIGEgd2Vic29ja2V0IHdpdGggcmVXaGVlbCBjb25uZWN0aW9uXG4gICAgICAgICAqL1xuICAgICAgICBpZighb3B0aW9ucyl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gcmVnaXN0ZXJpbmcgYWxsIGV2ZW50IGhhbmRsZXJzXG5cbiAgICAgICAgdGhpcy5oYW5kbGVycyA9IHtcbiAgICAgICAgICAgIHdpemFyZCA6IG5ldyBIYW5kbGVyKCksXG4gICAgICAgICAgICBvbkNvbm5lY3Rpb24gOiBuZXcgSGFuZGxlcigpLFxuICAgICAgICAgICAgb25EaXNjb25uZWN0aW9uIDogbmV3IEhhbmRsZXIoKSxcbiAgICAgICAgICAgIG9uTWVzc2FnZUpzb24gOiBuZXcgSGFuZGxlcigpLFxuICAgICAgICAgICAgb25NZXNzYWdlVGV4dCA6IG5ldyBIYW5kbGVyKClcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9uV2l6YXJkID0gdGhpcy5oYW5kbGVycy53aXphcmQuYWRkSGFuZGxlci5iaW5kKHRoaXMuaGFuZGxlcnMud2l6YXJkKTtcbiAgICAgICAgdGhpcy5vbkNvbm5lY3QgPSB0aGlzLmhhbmRsZXJzLm9uQ29ubmVjdGlvbi5hZGRIYW5kbGVyLmJpbmQodGhpcy5oYW5kbGVycy5vbkNvbm5lY3Rpb24pO1xuICAgICAgICB0aGlzLm9uRGlzY29ubmVjdCA9IHRoaXMuaGFuZGxlcnMub25EaXNjb25uZWN0aW9uLmFkZEhhbmRsZXIuYmluZCh0aGlzLmhhbmRsZXJzLm9uRGlzY29ubmVjdGlvbik7XG4gICAgICAgIHRoaXMub25NZXNzYWdlSnNvbiA9IHRoaXMuaGFuZGxlcnMub25NZXNzYWdlSnNvbi5hZGRIYW5kbGVyLmJpbmQodGhpcy5oYW5kbGVycy5vbk1lc3NhZ2VKc29uKTtcbiAgICAgICAgdGhpcy5vbk1lc3NhZ2VUZXh0ID0gdGhpcy5oYW5kbGVycy5vbk1lc3NhZ2VUZXh0LmFkZEhhbmRsZXIuYmluZCh0aGlzLmhhbmRsZXJzLm9uTWVzc2FnZVRleHQpO1xuXG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnNcblxuICAgICAgICB2YXIgY29ubmVjdGlvbiA9IG5ldyBTb2NrSlMob3B0aW9ucy5yZWFsdGltZUVuZFBvaW50KTtcbiAgICAgICAgY29ubmVjdGlvbi5vbm9wZW4gPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ29wZW4gOiAnICsgeCk7XG4gICAgICAgICAgICBjb25uZWN0aW9uLnRlbmFudCgpO1xuICAgICAgICAgICAgc2VsZi5oYW5kbGVycy5vbkNvbm5lY3Rpb24uaGFuZGxlKHgpO1xuICAgICAgICB9O1xuICAgICAgICBjb25uZWN0aW9uLm9ubWVzc2FnZSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICBpZiAoeC50eXBlID09ICdtZXNzYWdlJykge1xuICAgICAgICAgICAgICAgIC8vJC5ub3RpZnkoeC5kYXRhKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gc2V0IGZyb21SZWFsdGltZVxuICAgICAgICAgICAgICAgICAgICBzZWxmLmhhbmRsZXJzLm9uTWVzc2FnZUpzb24uaGFuZGxlKEpTT04ucGFyc2UoeC5kYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyB1bnNldCBmcm9tUmVhbHRpbWVcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5oYW5kbGVycy5vbk1lc3NhZ2VUZXh0LmhhbmRsZSh4LmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGNvbm5lY3Rpb24ub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQodXRpbHMud3NDb25uZWN0LDEwMDApO1xuICAgICAgICAgICAgc2VsZi5oYW5kbGVycy5vbkRpc2Nvbm5lY3Rpb24uaGFuZGxlKCk7XG4gICAgICAgIH07XG4gICAgICAgIGNvbm5lY3Rpb24udGVuYW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29ubmVjdGlvbi5zZW5kKCdURU5BTlQ6JyArIHNlbGYub3B0aW9ucy5hcHBsaWNhdGlvbiArICc6JyArIHNlbGYub3B0aW9ucy50b2tlbik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcGx1cmFsaXplIDogZnVuY3Rpb24oc3RyLCBtb2RlbCl7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMZXhpY2FsbHkgcmV0dXJucyBlbmdsaXNoIHBsdXJhbCBmb3JtXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gc3RyICsgJ3MnO1xuICAgIH0sXG5cbiAgICBiZWZvcmVDYWxsIDogZnVuY3Rpb24oZnVuYywgYmVmb3JlKXtcbiAgICAgICAgdmFyIGRlY29yYXRvciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBiZWZvcmUoKS50aGVuKGZ1bmMpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBkZWNvcmF0b3I7XG4gICAgfSxcblxuICAgIGNsZWFuU3RvcmFnZSA6IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDbGVhbiBsb2NhbFN0b3JhZ2Ugb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBMYXp5KGxvY2FsU3RvcmFnZSkua2V5cygpLmVhY2goZnVuY3Rpb24oayl7XG4gICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW2tdO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgcmV2ZXJzZSA6IGZ1bmN0aW9uIChjaHIsIHN0cikge1xuICAgICAgICByZXR1cm4gc3RyLnNwbGl0KGNocikucmV2ZXJzZSgpLmpvaW4oY2hyKTtcbiAgICB9LFxuICAgIHBlcm11dGF0aW9uczogZnVuY3Rpb24oYXJyKXtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBmb3IgKHZhciB4ID0gYXJyLmxlbmd0aC0xOyB4ID49IDA7eC0tKXtcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSBhcnIubGVuZ3RoLTE7IHkgPj0gMDsgeS0tKXtcbiAgICAgICAgICAgICAgICBpZiAoeCAhPT0geSlcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goW2Fyclt4XSwgYXJyW3ldXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuXG4gICAgYm9vbDogQm9vbGVhbixcblxuICAgIG5vb3AgOiBmdW5jdGlvbigpe30sXG5cbiAgICB0ek9mZnNldDogbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDAsXG5cbiAgICB0cmFuc0ZpZWxkVHlwZToge1xuICAgICAgICBkYXRlOiBmdW5jdGlvbih4KSB7IHJldHVybiBuZXcgRGF0ZSh4ICogMTAwMCArIHV0aWxzLnR6T2Zmc2V0ICkgfSxcbiAgICAgICAgZGF0ZXRpbWU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIG5ldyBEYXRlKHggKiAxMDAwICsgdXRpbHMudHpPZmZzZXQgKSB9LFxuICAgICAgICBzdHJpbmc6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgudG9TdHJpbmcoKTsgfSxcbiAgICAgICAgdGV4dDogZnVuY3Rpb24oeCkgeyByZXR1cm4geC50b1N0cmluZygpOyB9LFxuICAgICAgICBpbnRlZ2VyOiBmdW5jdGlvbih4KSB7IHJldHVybiBwYXJzZUludCh4KTsgfSxcbiAgICAgICAgZmxvYXQ6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHBhcnNlRmxvYXQoeCk7IH1cbiAgICB9LCBcbiAgICBtb2NrIDogbW9ja09iamVjdFxufTtcblxuXG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFRvdWNoZXIoKXtcbiAgICB2YXIgdG91Y2hlZCA9IGZhbHNlXG4gICAgdGhpcy50b3VjaCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRvdWNoZWQgPSB0cnVlO1xuICAgIH07XG4gICAgdGhpcy50b3VjaGVkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHQgPSB0b3VjaGVkO1xuICAgICAgICB0b3VjaGVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybiB0O1xuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuXG5mdW5jdGlvbiBWYWN1dW1DYWNoZXIodG91Y2gsIGFza2VkLCBuYW1lKXtcbi8qXG4gICAgaWYgKG5hbWUpe1xuICAgICAgICBjb25zb2xlLmluZm8oJ2NyZWF0ZWQgVmFjdXVtQ2FjaGVyIGFzICcgKyBuYW1lKTtcbiAgICB9XG4qL1xuICAgIGlmICghYXNrZWQpe1xuICAgICAgICB2YXIgYXNrZWQgPSBbXTtcbiAgICB9XG4gICAgdmFyIG1pc3NpbmcgPSBbXTtcbiAgICBcbiAgICB0aGlzLmFzayA9IGZ1bmN0aW9uIChpZCxsYXp5KXtcbiAgICAgICAgaWYgKCFMYXp5KGFza2VkKS5jb250YWlucyhpZCkpe1xuLy8gICAgICAgICAgICBjb25zb2xlLmluZm8oJ2Fza2luZyAoJyArIGlkICsgJykgZnJvbSAnICsgbmFtZSk7XG4gICAgICAgICAgICBtaXNzaW5nLnB1c2goaWQpO1xuICAgICAgICAgICAgaWYgKCFsYXp5KVxuICAgICAgICAgICAgICAgIGFza2VkLnB1c2goaWQpO1xuICAgICAgICAgICAgdG91Y2gudG91Y2goKTtcbiAgICAgICAgfSBcbi8vICAgICAgICBlbHNlIGNvbnNvbGUud2FybignKCcgKyBpZCArICcpIHdhcyBqdXN0IGFza2VkIG9uICcgKyBuYW1lKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRBc2tlZEluZGV4ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIGFza2VkO1xuICAgIH1cblxuICAgIHRoaXMubWlzc2luZ3MgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gTGF6eShtaXNzaW5nLnNwbGljZSgwLG1pc3NpbmcubGVuZ3RoKSkudW5pcXVlKCkudG9BcnJheSgpO1xuICAgIH1cbn1cbiIsImZ1bmN0aW9uIEF1dG9MaW5rZXIoZXZlbnRzLCBhY3RpdmVzLCBJREIsIFcyUFJFU09VUkNFLCBsaXN0Q2FjaGUpe1xuICAgIHZhciB0b3VjaCA9IG5ldyBUb3VjaGVyKCk7XG4gICAgdmFyIG1haW5JbmRleCA9IHt9O1xuICAgIHZhciBmb3JlaWduS2V5cyA9IHt9O1xuICAgIHZhciBtMm0gPSB7fTtcbiAgICB2YXIgbTJtSW5kZXggPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbnMgPSB7fTtcbiAgICB0aGlzLm1haW5JbmRleCA9IG1haW5JbmRleDtcbiAgICB0aGlzLmZvcmVpZ25LZXlzID0gZm9yZWlnbktleXM7XG4gICAgdGhpcy5tMm0gPSBtMm07XG4gICAgdGhpcy5tMm1JbmRleCA9IG0ybUluZGV4O1xuICAgIHRoaXMucGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucztcblxuICAgIGV2ZW50cy5vbignbW9kZWwtZGVmaW5pdGlvbicsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAvLyBkZWZpbmluZyBhbGwgaW5kZXhlcyBmb3IgcHJpbWFyeSBrZXlcbiAgICAgICAgdmFyIHBrSW5kZXggPSBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IobW9kZWwubmFtZSwgJ2lkJyk7XG4gICAgICAgIG1haW5JbmRleFttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIHBrSW5kZXgsICdtYWluSW5kZXguJyArIG1vZGVsLm5hbWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRpbmcgcGVybWlzc2lvbiBpbmRleGVzXG4gICAgICAgIHBlcm1pc3Npb25zW21vZGVsLm5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCxudWxsLCAncGVybWlzc2lvbnMuJyArIG1vZGVsLm5hbWUpO1xuXG4gICAgICAgIC8vIGNyZWF0aW5nIGluZGV4ZXMgZm9yIGZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24ocmVmZXJlbmNlKXtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBtb2RlbC5uYW1lICsgJ18nICsgcmVmZXJlbmNlLmlkO1xuICAgICAgICAgICAgZm9yZWlnbktleXNbaW5kZXhOYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIGxpc3RDYWNoZS5nZXRJbmRleEZvcihyZWZlcmVuY2UudG8sICdpZCcpLCByZWZlcmVuY2UudG8gKyAnLmlkIGZvcmVpZ25LZXlzLicgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gY3JlYXRpbmcgcmV2ZXJzZSBmb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VkQnkpLmVhY2goZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IGZpZWxkLmJ5ICsgJy4nICsgZmllbGQuaWQ7XG4gICAgICAgICAgICBmb3JlaWduS2V5c1tpbmRleE5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgbGlzdENhY2hlLmdldEluZGV4Rm9yKGZpZWxkLmJ5LGZpZWxkLmlkKSwgZmllbGQuYnkgKyAnLicgKyBmaWVsZC5pZCArICcgZm9yZWlnbktleXMuJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBMYXp5KG1vZGVsLm1hbnlUb01hbnkpLmVhY2goZnVuY3Rpb24ocmVsYXRpb24pe1xuICAgICAgICAgICAgaWYgKCEocmVsYXRpb24uaW5kZXhOYW1lIGluIG0ybSkpXG4gICAgICAgICAgICAgICAgbTJtW3JlbGF0aW9uLmluZGV4TmFtZV0gPSBbbmV3IFZhY3V1bUNhY2hlcih0b3VjaCxudWxsLCdtMm0uJyArIHJlbGF0aW9uLmluZGV4TmFtZSArICdbMF0nKSwgbmV3IFZhY3V1bUNhY2hlcih0b3VjaCxudWxsLCdtMm0uJyArIHJlbGF0aW9uLmluZGV4TmFtZSsnWzFdJyldO1xuICAgICAgICAgICAgaWYgKCEocmVsYXRpb24uaW5kZXhOYW1lIGluIG0ybUluZGV4KSlcbiAgICAgICAgICAgICAgICBtMm1JbmRleFtyZWxhdGlvbi5pbmRleE5hbWVdID0gbmV3IE1hbnlUb01hbnlSZWxhdGlvbihyZWxhdGlvbixtMm1bcmVsYXRpb24uaW5kZXhOYW1lXSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHZhciBtMm1HZXQgPSBmdW5jdGlvbihpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGNhbGxCYWNrKXtcbiAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoKG4gPyB1dGlscy5yZXZlcnNlKCcvJywgaW5kZXhOYW1lKSA6IGluZGV4TmFtZSkgKyAncycgKyAnL2xpc3QnLCB7Y29sbGVjdGlvbjogY29sbGVjdGlvbn0sIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShkYXRhLCBjYWxsQmFjayk7XG4gICAgICAgICAgICBkZWxldGUgYWN0aXZlc1tpbmRleE5hbWVdXG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgfTtcblxuICAgIHZhciBnZXRNMk0gPSBmdW5jdGlvbihpbmRleE5hbWUsIGNvbGxlY3Rpb24sIG4sIGNhbGxCYWNrKXtcbiAgICAgICAgLy8gYXNrIGFsbCBpdGVtcyBpbiBjb2xsZWN0aW9uIHRvIG0ybSBpbmRleFxuICAgICAgICBMYXp5KGNvbGxlY3Rpb24pLmVhY2gobTJtW2luZGV4TmFtZV1bbl0uYXNrLmJpbmQobTJtW2luZGV4TmFtZV1bbl0pKTtcbiAgICAgICAgLy8gcmVuZXdpbmcgY29sbGVjdGlvbiB3aXRob3V0IGFza2VkXG4gICAgICAgIGNvbGxlY3Rpb24gPSBtMm1baW5kZXhOYW1lXVtuXS5taXNzaW5ncygpO1xuICAgICAgICAvLyBjYWxsaW5nIHJlbW90ZSBmb3IgbTJtIGNvbGxlY3Rpb24gaWYgYW55XG4gICAgICAgIGlmIChjb2xsZWN0aW9uLmxlbmd0aCl7XG4gICAgICAgICAgICBhY3RpdmVzW2luZGV4TmFtZV0gPSAxO1xuICAgICAgICAgICAgbTJtR2V0KGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgY2FsbEJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5nZXRNMk0gPSBnZXRNMk07XG5cbiAgICB2YXIgbGlua1VubGlua2VkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gcGVyZm9ybSBhIERhdGFCYXNlIHN5bmNocm9uaXphdGlvbiB3aXRoIHNlcnZlciBsb29raW5nIGZvciB1bmtub3duIGRhdGFcbiAgICAgICAgaWYgKCF0b3VjaC50b3VjaGVkKCkpIHJldHVybjtcbiAgICAgICAgaWYgKExhenkoYWN0aXZlcykudmFsdWVzKCkuc3VtKCkpIHtcbiAgICAgICAgICAgIHRvdWNoLnRvdWNoKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgTGF6eShtMm0pLmVhY2goZnVuY3Rpb24oaW5kZXhlcywgaW5kZXhOYW1lKXtcbiAgICAgICAgICAgIExhenkoaW5kZXhlcykuZWFjaChmdW5jdGlvbiAoaW5kZXgsbikge1xuICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gaW5kZXgubWlzc2luZ3MoKTtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uID0gTGF6eShjb2xsZWN0aW9uKS5maWx0ZXIoQm9vbGVhbikubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh4KVxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBpZiAoY29sbGVjdGlvbi5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgSU5ERVggPSBtMm1JbmRleFtpbmRleE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0dGVyID0gSU5ERVhbJ2dldCcgKyAoMSAtIG4pXS5iaW5kKElOREVYKTtcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIG0ybUdldChpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGNvbGxlY3Rpb24ubWFwKGdldHRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG90aGVySW5kZXggPSBpbmRleE5hbWUuc3BsaXQoJy8nKVsxIC0gbl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUob3RoZXJJbmRleCxmdW5jdGlvbigpe1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoaWRzKS5mbGF0dGVuKCkudW5pcXVlKCkuZWFjaChtYWluSW5kZXhbb3RoZXJJbmRleF0uYXNrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShpZHMpLmZsYXR0ZW4oKS51bmlxdWUoKS5lYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFpbkluZGV4W290aGVySW5kZXhdLmFzayh4LHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBMYXp5KG1haW5JbmRleCkuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG1vZGVsTmFtZSkge1xuICAgICAgICAgICAgdmFyIGlkcyA9IGluZGV4Lm1pc3NpbmdzKCk7XG4gICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZhciBpZGIgPSBtb2RlbE5hbWUgaW4gSURCID8gSURCW21vZGVsTmFtZV0ua2V5cygpIDogTGF6eSgpO1xuICAgICAgICAgICAgICAgIC8vbG9nKCdsaW5raW5nLicgKyBtb2RlbE5hbWUgKyAnID0gJyArIFcyUFJFU09VUkNFLmxpbmtpbmcuc291cmNlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSwge2lkOiBpZHN9LG51bGwsdXRpbHMubm9vcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBGb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShmb3JlaWduS2V5cylcbiAgICAgICAgLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgcmV0dXJuIFtrLCB2Lm1pc3NpbmdzKCldXG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbih2KXtcbiAgICAgICAgICAgIHJldHVybiB2WzFdLmxlbmd0aFxuICAgICAgICB9KS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBpZHMgPSB4WzFdO1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHhbMF07XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBpbmRleE5hbWUuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgIHZhciBtYWluUmVzb3VyY2UgPSBpbmRleFswXTtcbiAgICAgICAgICAgIHZhciBmaWVsZE5hbWUgPSBpbmRleFsxXTtcbiAgICAgICAgICAgIHZhciBmaWx0ZXIgPSB7fTtcbiAgICAgICAgICAgIGZpbHRlcltmaWVsZE5hbWVdID0gaWRzO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobWFpblJlc291cmNlLCBmaWx0ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIExhenkoTGF6eShwZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICByZXR1cm4gW2ssIHYubWlzc2luZ3MoKV1cbiAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICByZXR1cm4gdlsxXS5sZW5ndGhcbiAgICAgICAgfSkudG9PYmplY3QoKSkuZWFjaChmdW5jdGlvbiAoaWRzLCByZXNvdXJjZU5hbWUpIHtcbiAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIGFjdGl2ZXNbcmVzb3VyY2VOYW1lXSA9IDE7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QocmVzb3VyY2VOYW1lICsgJy9teV9wZXJtcycsIHtpZHM6IExhenkoaWRzKS51bmlxdWUoKS50b0FycmF5KCl9LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RQZXJtaXNzaW9ucyhkYXRhLlBFUk1JU1NJT05TKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGFjdGl2ZXNbcmVzb3VyY2VOYW1lXVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgc2V0SW50ZXJ2YWwobGlua1VubGlua2VkLDUwKTtcbn07XG5cblxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIExpc3RDYWNoZXIoKXtcbiAgICB2YXIgZ290QWxsID0ge307XG4gICAgdmFyIGFza2VkID0ge307IC8vIG1hcCBvZiBhcnJheVxuICAgIHZhciBjb21wb3NpdGVBc2tlZCA9IHt9O1xuICAgIHZhciBjYXJ0ZXNpYW5Qcm9kdWN0MSA9IGZ1bmN0aW9uKHgseSxpc0FycmF5KXtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBpZiAoaXNBcnJheSkge1xuICAgICAgICAgICAgZm9yICh2YXIgYSBpbiB4KXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBiIGluIHkpe1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChMYXp5KFt4W2FdLHlbYl1dKS5mbGF0dGVuKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhIGluIHgpe1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGIgaW4geSl7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKFt4W2FdLHlbYl1dKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9O1xuICAgIHZhciBjYXJ0ZXNpYW5Qcm9kdWN0ID0gZnVuY3Rpb24oYXJyKXtcbiAgICAgICAgdmFyIGlzQXJyYXkgPSBmYWxzZTtcbiAgICAgICAgdmFyIHJldCA9IGFyclswXTsgXG4gICAgICAgIGZvciAodmFyIHggPSAxOyB4IDwgYXJyLmxlbmd0aDsgKyt4KXtcbiAgICAgICAgICAgIHJldCA9IGNhcnRlc2lhblByb2R1Y3QxKHJldCwgYXJyW3hdLCBpc0FycmF5KTtcbiAgICAgICAgICAgIGlzQXJyYXkgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICAgIHZhciBleHBsb2RlRmlsdGVyID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgICAgIHZhciBwcm9kdWN0ID0gY2FydGVzaWFuUHJvZHVjdChMYXp5KGZpbHRlcikudmFsdWVzKCkudG9BcnJheSgpKTtcbiAgICAgICAgdmFyIGtleXMgPSBMYXp5KGZpbHRlcikua2V5cygpLnRvQXJyYXkoKTtcbiAgICAgICAgcmV0dXJuIHByb2R1Y3QubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgdmFyIHIgPSB7fTtcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihhLG4pe1xuICAgICAgICAgICAgICAgIHJbYV0gPSB4W25dO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgfTtcbiAgICB2YXIgZmlsdGVyU2luZ2xlID0gZnVuY3Rpb24obW9kZWwsIGZpbHRlciwgdGVzdE9ubHkpe1xuICAgICAgICAvLyBMYXp5IGF1dG8gY3JlYXRlIGluZGV4ZXNcbiAgICAgICAgdmFyIG1vZGVsTmFtZSA9IG1vZGVsLm1vZGVsTmFtZTtcbiAgICAgICAgdmFyIGdldEluZGV4Rm9yID0gdGhpcy5nZXRJbmRleEZvcjtcbiAgICAgICAgdmFyIGtleXMgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHYsa2V5KXsgcmV0dXJuIFtrZXksIG1vZGVsTmFtZSArICcuJyArIGtleV07IH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIHZhciBpbmRleGVzID0gTGF6eShmaWx0ZXIpLmtleXMoKS5tYXAoZnVuY3Rpb24oa2V5KXsgcmV0dXJuIFtrZXksIGdldEluZGV4Rm9yKG1vZGVsTmFtZSwga2V5KV19KS50b09iamVjdCgpOyBcbiAgICAgICAgLy8gZmFrZSBmb3IgKGl0IHdpbGwgY3ljbGUgb25jZSlcbiAgICAgICAgZm9yICh2YXIgeCBpbiBmaWx0ZXIpe1xuICAgICAgICAgICAgLy8gZ2V0IGFza2VkIGluZGV4IGFuZCBjaGVjayBwcmVzZW5jZVxuICAgICAgICAgICAgdmFyIGRpZmZlcmVuY2UgPSBMYXp5KGZpbHRlclt4XSkuZGlmZmVyZW5jZShpbmRleGVzW3hdKS50b0FycmF5KCk7XG4gICAgICAgICAgICBpZiAoZGlmZmVyZW5jZS5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIC8vIGdlbmVyYXRlIG5ldyBmaWx0ZXJcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gTGF6eShbW3gsIGRpZmZlcmVuY2VdXSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgICAgICAvLyByZW1lbWJlciBhc2tlZFxuICAgICAgICAgICAgICAgIGlmICghdGVzdE9ubHkpXG4gICAgICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGluZGV4ZXNbeF0sIGRpZmZlcmVuY2UpO1xuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZSBmaWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSArICdcXG5PdXQgOicgKyBKU09OLnN0cmluZ2lmeShyZXQpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUgZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikgKyAnXFxuT3V0IDogbnVsbCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBjbGVhbkNvbXBvc2l0ZXMgPSBmdW5jdGlvbihtb2RlbCxmaWx0ZXIpe1xuICAgICAgICAvKipcbiAgICAgICAgICogY2xlYW4gY29tcG9zaXRlQXNrZWRcbiAgICAgICAgICovXG4gICAgICAgIC8vIGxhenkgY3JlYXRlIGNvbmRpdGlvbmFsIGFza2VkIGluZGV4XG4gICAgICAgIGlmICghKG1vZGVsLm5hbWUgaW4gY29tcG9zaXRlQXNrZWQpKSB7IGNvbXBvc2l0ZUFza2VkW21vZGVsLm5hbWVdID0gW10gfTtcbiAgICAgICAgdmFyIGluZGV4ID0gY29tcG9zaXRlQXNrZWRbbW9kZWwubmFtZV07XG4gICAgICAgIC8vIHNlYXJjaCBmb3IgYWxsIGVsZW1lbnRzIHdobyBoYXZlIHNhbWUgcGFydGlhbFxuICAgICAgICB2YXIgZmlsdGVyTGVuID0gTGF6eShmaWx0ZXIpLnNpemUoKTtcbiAgICAgICAgdmFyIGl0ZW1zID0gaW5kZXguZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlciwgJyAmJiAnLHRydWUpKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSl7IExhenkoaXRlbSkuc2l6ZSgpID4gZmlsdGVyTGVuIH0pO1xuLy8gICAgICAgIGNvbnNvbGUubG9nKCdkZWxldGluZyA6JyArIEpTT04uc3RyaW5naWZ5KGl0ZW1zKSk7XG4gICAgfTtcblxuICAgIHRoaXMuZmlsdGVyID0gZnVuY3Rpb24obW9kZWwsIGZpbHRlcil7XG4vLyAgICAgICAgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tLVxcbmZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpKTtcbiAgICAgICAgdmFyIG1vZGVsTmFtZSA9IG1vZGVsLm1vZGVsTmFtZTtcblxuICAgICAgICAvLyBpZiB5b3UgZmV0Y2ggYWxsIG9iamVjdHMgZnJvbSBzZXJ2ZXIsIHRoaXMgbW9kZWwgaGFzIHRvIGJlIG1hcmtlZCBhcyBnb3QgYWxsO1xuICAgICAgICB2YXIgZmlsdGVyTGVuICA9IExhenkoZmlsdGVyKS5zaXplKCk7XG4gICAgICAgIHN3aXRjaCAoZmlsdGVyTGVuKSB7XG4gICAgICAgICAgICBjYXNlIDAgOiB7XG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIG51bGwgb3IgYWxsXG4gICAgICAgICAgICAgICAgdmFyIGdvdCA9IGdvdEFsbFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIGdvdEFsbFttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGFza2VkKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGFza2VkW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ291dCA6IG51bGwgKGdvdCBhbGwpJyk7XG4gICAgICAgICAgICAgICAgLy8gY29uZGl0aW9uYWwgY2xlYW5cbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGNvbXBvc2l0ZUFza2VkKXsgXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZ290KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIDEgOiB7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IGZpbHRlclNpbmdsZS5jYWxsKHRoaXMsIG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgICAgIGNsZWFuQ29tcG9zaXRlcy5jYWxsKHRoaXMsIG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHZhciBzaW5nbGUgPSBMYXp5KGZpbHRlcikua2V5cygpLnNvbWUoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICB2YXIgZiA9IHt9O1xuICAgICAgICAgICAgZltrZXldID0gZmlsdGVyW2tleV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyU2luZ2xlLmNhbGwodGhzLCBtb2RlbCwgZiwgdHJ1ZSkgPT0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChzaW5nbGUpIHsgcmV0dXJuIG51bGwgfVxuICAgICAgICAvLyBsYXp5IGNyZWF0ZSBjb21wb3NpdGVBc2tlZFxuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gY29tcG9zaXRlQXNrZWQpKXsgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXSA9IFtdOyB9XG4gICAgICAgIC8vIGV4cGxvZGUgZmlsdGVyXG4gICAgICAgIHZhciBleHBsb2RlZCA9IGV4cGxvZGVGaWx0ZXIoZmlsdGVyKTtcbiAgICAgICAgLy8gY29sbGVjdCBwYXJ0aWFsc1xuICAgICAgICB2YXIgcGFydGlhbHMgPSBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIsICcgfHwgJyx0cnVlKSk7XG4gICAgICAgIC8vIGNvbGxlY3QgbWlzc2luZ3MgKGV4cGxvZGVkIC0gcGFydGlhbHMpXG4gICAgICAgIGlmIChwYXJ0aWFscy5sZW5ndGgpe1xuICAgICAgICAgICAgdmFyIGJhZCAgPSBbXTtcbiAgICAgICAgICAgIC8vIHBhcnRpYWwgZGlmZmVyZW5jZVxuICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBwYXJ0aWFscyl7XG4gICAgICAgICAgICAgICAgYmFkLnB1c2guYXBwbHkoYmFkLGV4cGxvZGVkLmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBwYXJ0aWFsc1t4XSwnICYmICcsIHRydWUpKSk7XG4gICAgICAgICAgICB9XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKCdleHBsb2RlZCAtIHBhcnRpYWwgOiAnICsgSlNPTi5zdHJpbmdpZnkoYmFkKSk7XG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBMYXp5KGV4cGxvZGVkKS5kaWZmZXJlbmNlKGJhZCkudG9BcnJheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gZXhwbG9kZWQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmaWx0ZXIgcGFydGlhbHNcbiAgICAgICAgaWYgKG1pc3NpbmdzLmxlbmd0aCl7XG4gICAgICAgICAgICBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLnB1c2guYXBwbHkoY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXSxtaXNzaW5ncyk7XG4gICAgICAgICAgICAvLyBhZ2dyZWdhdGUgbWlzc2luZ3NcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IExhenkoZmlsdGVyKS5rZXlzKCkubWFwKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IExhenkobWlzc2luZ3MpLnBsdWNrKGtleSkudW5pcXVlKCkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBba2V5LCByZXQubGVuZ3RoP3JldDpmaWx0ZXJba2V5XV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuLy8gICAgICAgICAgICBjb25zb2xlLmxvZygnb3V0IDogJyArIEpTT04uc3RyaW5naWZ5KG1pc3NpbmdzKSk7XG4gICAgICAgICAgICAvLyBjbGVhbiBjb25kaXRpb25hbFxuICAgICAgICAgICAgY2xlYW5Db21wb3NpdGVzKG1vZGVsLCBtaXNzaW5ncyk7XG4gICAgICAgICAgICByZXR1cm4gbWlzc2luZ3M7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SW5kZXhGb3IgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGZpZWxkTmFtZSl7XG4gICAgICAgIHZhciBpbmRleE5hbWUgPSBtb2RlbE5hbWUgKyAnLicgKyBmaWVsZE5hbWU7XG4gICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBhc2tlZCkpe1xuICAgICAgICAgICAgYXNrZWRbaW5kZXhOYW1lXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhc2tlZFtpbmRleE5hbWVdO1xuICAgIH1cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBNYW55VG9NYW55UmVsYXRpb24ocmVsYXRpb24sbTJtKXtcbiAgICB2YXIgaXRlbXMgPSBbXTtcbiAgICB0aGlzLmFkZCA9IGl0ZW1zLnB1c2guYmluZChpdGVtcyk7XG4gICAgdGhpcy5hZGQgPSBmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgY29uc29sZS5sb2coJ2FkZGluZyAnICsgaXRlbSk7XG4gICAgICAgIGlmICghKExhenkoaXRlbXMpLmZpbmQoaXRlbSkpKXtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmdldDAgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVsxXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjFcIikudG9BcnJheSgpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldDEgPSBmdW5jdGlvbihpZCl7XG4gICAgICAgIG0ybVswXS5hc2soaWQpO1xuICAgICAgICByZXR1cm4gTGF6eShpdGVtcykuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgcmV0dXJuIHhbMV0gPT09IGlkO1xuICAgICAgICB9KS5wbHVjayhcIjBcIikudG9BcnJheSgpO1xuICAgIH07XG4gICAgdGhpc1snZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVsYXRpb24uaW5kZXhOYW1lLnNwbGl0KCcvJylbMV0pXSA9IHRoaXMuZ2V0MTtcbiAgICB0aGlzWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWxhdGlvbi5pbmRleE5hbWUuc3BsaXQoJy8nKVswXSldID0gdGhpcy5nZXQwO1xuXG4gICAgdGhpcy5kZWwgPSBmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgdmFyIGwgPSBpdGVtcy5sZW5ndGg7XG4gICAgICAgIHZhciBpZHggPSBudWxsO1xuICAgICAgICBmb3IgKHZhciBhID0gMDsgYSA8IGw7IGErKyl7IFxuICAgICAgICAgICAgaWYgKChpdGVtc1thXVswXSA9PT0gaXRlbVswXSkgJiYgKGl0ZW1zW2FdWzFdID09PSBpdGVtWzFdKSl7XG4gICAgICAgICAgICAgICAgaWR4ID0gYTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaWR4KXtcbiAgICAgICAgICAgIGl0ZW1zLnNwbGljZShhLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgJywgaXRlbSk7XG4gICAgfTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGNhY2hlZFByb3BlcnR5QnlFdmVudHMocHJvdG8sIHByb3BlcnR5TmFtZSxnZXR0ZXIsIHNldHRlcil7XG4gICAgdmFyIGV2ZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyw0KTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgXG4gICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICBwcm90by5vcm0ub24oZXZlbnQsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHJlc3VsdCA9IHt9O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgcHJvcGVydHlEZWYgPSB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gY2FjaGVkKCl7XG4gICAgICAgICAgICBpZiAoISh0aGlzLmlkIGluIHJlc3VsdCkpe1xuICAgICAgICAgICAgICAgIHJlc3VsdFt0aGlzLmlkXSA9IGdldHRlci5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaWYgKHNldHRlcil7XG4gICAgICAgIHByb3BlcnR5RGVmWydzZXQnXSA9IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gcmVzdWx0W3RoaXMuaWRdKXtcbiAgICAgICAgICAgICAgICBzZXR0ZXIuY2FsbCh0aGlzLHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZCBpbiByZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sIHByb3BlcnR5TmFtZSxwcm9wZXJ0eURlZik7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvcihkYXRhKXtcbiAgICB0aGlzLnJlc291cmNlID0gZGF0YS5fcmVzb3VyY2U7XG4gICAgdGhpcy5mb3JtSWR4ID0gZGF0YS5mb3JtSWR4O1xuICAgIHRoaXMuZmllbGRzID0gZGF0YS5lcnJvcnM7XG59XG52YXIgYmFzZU9STSA9IGZ1bmN0aW9uKG9wdGlvbnMsIGV4dE9STSl7XG4gICAgXG4gICAgLy8gY3JlYXRpbmcgcmV3aGVlbCBjb25uZWN0aW9uXG4gICAgaWYgKG9wdGlvbnMuY29uc3RydWN0b3IgPT09IFN0cmluZyl7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gbmV3IHJlV2hlZWxDb25uZWN0aW9uKG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gdXRpbHMucmVXaGVlbENvbm5lY3Rpb24pe1xuICAgICAgICB2YXIgY29ubmVjdGlvbiA9IG9wdGlvbnM7XG4gICAgfVxuICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgY29ubmVjdGlvbi5vbignY29ubmVjdGVkJywgZnVuY3Rpb24oKXsgXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICB9KTtcbiAgICB2YXIgZXZlbnRzID0gY29ubmVjdGlvbi5ldmVudHM7XG4gICAgdGhpcy5vbiA9IGV2ZW50cy5vbi5iaW5kKHRoaXMpO1xuICAgIHRoaXMuZW1pdCA9IGV2ZW50cy5lbWl0LmJpbmQodGhpcyk7XG4gICAgdGhpcy51bmJpbmQgPSBldmVudHMudW5iaW5kLmJpbmQodGhpcyk7XG4gICAgdGhpcy4kcG9zdCA9IGNvbm5lY3Rpb24uJHBvc3QuYmluZChjb25uZWN0aW9uKTtcblxuICAgIC8vIGhhbmRsaW5nIHdlYnNvY2tldCBldmVudHNcbiAgICBldmVudHMub24oJ3dzLWNvbm5lY3RlZCcsZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmluZm8oJ1dlYnNvY2tldCBjb25uZWN0ZWQnKTtcbiAgICAgICAgLy8gYWxsIGpzb24gZGF0YSBoYXMgdG8gYmUgcGFyc2VkIGJ5IGdvdERhdGFcbiAgICAgICAgd3Mub25NZXNzYWdlSnNvbihXMlBSRVNPVVJDRS5nb3REYXRhLmJpbmQoVzJQUkVTT1VSQ0UpKTtcbiAgICAgICAgLy9cbiAgICAgICAgd3Mub25NZXNzYWdlVGV4dChmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnV1MgbWVzc2FnZSA6ICcgKyBtZXNzYWdlKVxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBldmVudHMub24oJ3dzLWRpc2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKHdzKXtcbiAgICAgICAgY29uc29sZS5lcnJvcignV2Vic29ja2V0IGRpc2Nvbm5lY3RlZCcpXG4gICAgfSk7XG4gICAgZXZlbnRzLm9uKCdlcnJvci1qc29uLTQwNCcsZnVuY3Rpb24oZXJyb3IsdXJsLCBzZW50RGF0YSwgeGhyKXsgXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0pTT04gZXJyb3IgJywgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1t1cmwuc3BsaXQoJy8nKVswXV07XG4gICAgfSlcblxuICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgdmFyIFcyUFJFU09VUkNFID0gdGhpcztcbiAgICB2YXIgSURCID0ge2F1dGhfZ3JvdXAgOiBMYXp5KHt9KX07IC8vIHRhYmxlTmFtZSAtPiBkYXRhIGFzIEFycmF5XG4gICAgdmFyIElEWCA9IHt9OyAvLyB0YWJsZU5hbWUgLT4gTGF6eShpbmRleEJ5KCdpZCcpKSAtPiBJREJbZGF0YV1cbiAgICB2YXIgUkVWSURYID0ge307IC8vIHRhYmxlTmFtZSAtPiBmaWVsZE5hbWUgLT4gTGF6eS5ncm91cEJ5KCkgLT4gSURCW0RBVEFdXG4gICAgdmFyIGJ1aWxkZXJIYW5kbGVycyA9IHt9O1xuICAgIHZhciBidWlsZGVySGFuZGxlclVzZWQgPSB7fTtcbiAgICB2YXIgcGVyc2lzdGVudEF0dHJpYnV0ZXMgPSB7fTtcbiAgICB2YXIgZXZlbnRIYW5kbGVycyA9IHt9O1xuICAgIHZhciBwZXJtaXNzaW9uV2FpdGluZyA9IHt9O1xuICAgIHZhciBtb2RlbENhY2hlID0ge307XG4gICAgdmFyIGZhaWxlZE1vZGVscyA9IHt9O1xuICAgIHZhciB3YWl0aW5nQ29ubmVjdGlvbnMgPSB7fSAvLyBhY3R1YWwgY29ubmVjdGlvbiB3aG8gaSdtIHdhaXRpbmcgZm9yXG4gICAgdmFyIGxpc3RDYWNoZSA9IG5ldyBMaXN0Q2FjaGVyKExhenkpO1xuICAgIHZhciBsaW5rZXIgPSBuZXcgQXV0b0xpbmtlcihldmVudHMsd2FpdGluZ0Nvbm5lY3Rpb25zLElEQiwgdGhpcywgbGlzdENhY2hlKTtcbi8qICAgIHdpbmRvdy5sbCA9IGxpbmtlcjtcbiAgICB3aW5kb3cubGMgPSBsaXN0Q2FjaGU7XG4qL1xuICAgIHRoaXMudmFsaWRhdGlvbkV2ZW50ID0gZXZlbnRzLm9uKCdlcnJvci1qc29uLTUxMycsIGZ1bmN0aW9uKGRhdGEsIHVybCwgc2VudERhdGEsIHhocil7XG4gICAgICAgIGlmIChjdXJyZW50Q29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIpe1xuICAgICAgICAgICAgY3VycmVudENvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyKG5ldyBWYWxpZGF0aW9uRXJyb3IoZGF0YSkpO1xuICAgICAgICB9XG4gICAgfSlcblxuICAgIHZhciBnZXRJbmRleCA9IGZ1bmN0aW9uIChpbmRleE5hbWUpIHtcbiAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJREIpXG4gICAgICAgICAgICByZXR1cm4gSURCW2luZGV4TmFtZV07XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgSURCW2luZGV4TmFtZV0gPSBMYXp5KHt9KTtcbiAgICAgICAgICAgIHJldHVybiBJREJbaW5kZXhOYW1lXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGdldFVubGlua2VkID0gZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICBpZiAoaW5kZXhOYW1lIGluIFVOTElOS0VEKVxuICAgICAgICAgICAgcmV0dXJuIFVOTElOS0VEW2luZGV4TmFtZV07XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgVU5MSU5LRURbaW5kZXhOYW1lXSA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIFVOTElOS0VEW2luZGV4TmFtZV07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gUGVybWlzc2lvblRhYmxlKGlkLCBrbGFzcywgcGVybWlzc2lvbnMpIHtcbiAgICAgICAgLy8gY3JlYXRlIFBlcm1pc3Npb25UYWJsZSBjbGFzc1xuICAgICAgICB0aGlzLmtsYXNzID0ga2xhc3M7XG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSBbXTtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICBmb3IgKHZhciBrIGluIHBlcm1pc3Npb25zKSB7XG4gICAgICAgICAgICB0aGlzLnB1c2guYXBwbHkodGhpcywgW2ssIHBlcm1pc3Npb25zW2tdXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgUGVybWlzc2lvblRhYmxlLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIC8vIHNhdmUgT2JqZWN0IHRvIHNlcnZlclxuICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgIHBlcm1pc3Npb25zOiBMYXp5KHRoaXMucGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeFswXS5pZCwgeFsxXV1cbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KClcbiAgICAgICAgfTtcbiAgICAgICAgZGF0YS5pZCA9IHRoaXMuaWQ7XG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSB0aGlzLmtsYXNzLm1vZGVsTmFtZTtcbiAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5rbGFzcy5tb2RlbE5hbWUgKyAnL3NldF9wZXJtaXNzaW9ucycsIGRhdGEsIGZ1bmN0aW9uIChteVBlcm1zLCBhLCBiLCByZXEpIHtcbiAgICAgICAgICAgIGNiKG15UGVybXMpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIFBlcm1pc3Npb25UYWJsZS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChncm91cF9pZCwgcGVybWlzc2lvbkxpc3QpIHtcbiAgICAgICAgdmFyIHAgPSBMYXp5KHBlcm1pc3Npb25MaXN0KTtcbiAgICAgICAgdmFyIHBlcm1zID0gTGF6eSh0aGlzLmtsYXNzLmFsbFBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBbeCwgcC5jb250YWlucyh4KV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgdmFyIGwgPSBMYXp5KHRoaXMucGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHhbMF0uaWRcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChsLmNvbnRhaW5zKGdyb3VwX2lkKSlcbiAgICAgICAgICAgIHRoaXMucGVybWlzc2lvbnNbbC5pbmRleE9mKGdyb3VwX2lkKV1bMV0gPSBwZXJtcztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5wZXJtaXNzaW9ucy5wdXNoKFtJREIuYXV0aF9ncm91cC5nZXQoZ3JvdXBfaWQpLCBwZXJtc10pO1xuICAgIH07XG5cbiAgICAvLyBjcmVhdGVzIGR5bmFtaWNhbCBtb2RlbHNcbiAgICB2YXIgbWFrZU1vZGVsQ2xhc3MgPSBmdW5jdGlvbiAobW9kZWwpIHtcbiAgICAgICAgdmFyIF9tb2RlbCA9IG1vZGVsO1xuICAgICAgICB2YXIgZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpO1xuICAgICAgICBpZiAobW9kZWwucHJpdmF0ZUFyZ3MpIHtcbiAgICAgICAgICAgIGZpZWxkcyA9IGZpZWxkcy5tZXJnZShtb2RlbC5wcml2YXRlQXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgVzJQUkVTT1VSQ0UuZW1pdCgnbW9kZWwtZGVmaW5pdGlvbicsIG1vZGVsKTtcbiAgICAgICAgLy8gZ2V0dGluZyBmaWVsZHMgb2YgdHlwZSBkYXRlIGFuZCBkYXRldGltZVxuLypcbiAgICAgICAgdmFyIERBVEVGSUVMRFMgPSBmaWVsZHMuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHgudHlwZSA9PSAnZGF0ZScpIHx8ICh4LnR5cGUgPT0gJ2RhdGV0aW1lJylcbiAgICAgICAgfSkubWFwKGZ1bmN0aW9uICh4LCB2KSB7XG4gICAgICAgICAgICByZXR1cm4gW3YsIHRydWVdXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG5cbiAgICAgICAgLy8gZ2V0dGluZyBib29sZWFuIGZpZWxkc1xuICAgICAgICB2YXIgQk9PTEZJRUxEUyA9IGZpZWxkcy5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoeC50eXBlID09ICdib29sZWFuJylcbiAgICAgICAgfSkubWFwKGZ1bmN0aW9uICh4LCB2KSB7XG4gICAgICAgICAgICByZXR1cm4gW3YsIHRydWVdXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG5cbiAgICAgICAgLy8gYm9vbGVhbnMgYW5kIGRhdGV0aW1lcyBzdG9yYWdlIGV4dGVybmFsIFxuICAgICAgICBNT0RFTF9EQVRFRklFTERTW21vZGVsLm5hbWVdID0gREFURUZJRUxEUztcbiAgICAgICAgTU9ERUxfQk9PTEZJRUxEU1ttb2RlbC5uYW1lXSA9IEJPT0xGSUVMRFM7XG4qL1xuICAgICAgICAvLyBpbml0aWFsaXphdGlvblxuICAgICAgICB2YXIgZnVuY1N0cmluZyA9IFwiaWYgKCFyb3cpIHsgcm93ID0ge319O1xcblwiO1xuICAgICAgICBmdW5jU3RyaW5nICs9IG1vZGVsLnJlZmVyZW5jZXMubWFwKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHJldHVybiAndGhpcy5fJyArIGZpZWxkLmlkICsgJyA9IHJvdy4nICsgZmllbGQuaWQgKyAnOyc7XG4gICAgICAgIH0pLmpvaW4oJztcXG4nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGRhdGVmaWVsZCBjb252ZXJzaW9uXG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gZmllbGRzLm1hcChmdW5jdGlvbiAoeCxrKSB7XG4gICAgICAgICAgICBpZiAoKHgudHlwZSA9PSAnZGF0ZScpIHx8ICh4LnR5cGUgPT0gJ2RhdGV0aW1lJykpe1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSByb3cuJyArIGsgKyAnP25ldyBEYXRlKHJvdy4nICsgayArICcgKiAxMDAwIC0gJyArIHV0aWxzLnR6T2Zmc2V0ICsgJyk6bnVsbDtcXG4nOyBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeC50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSAocm93LicgKyBrICsgJyA9PT0gXCJUXCIpIHx8IChyb3cuJyArIGsgKyAnID09PSB0cnVlKTtcXG4nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gcm93LicgKyBrICsgJztcXG4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS50b1N0cmluZygnXFxuJyk7ICsgJ1xcbic7XG5cbiAgICAgICAgZnVuY1N0cmluZyArPSBcImlmIChwZXJtaXNzaW9ucykge3RoaXMuX3Blcm1pc3Npb25zID0gcGVybWlzc2lvbnMgJiYgTGF6eShwZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7IHJldHVybiBbeCwgdHJ1ZV0gfSkudG9PYmplY3QoKTt9XCJcblxuICAgICAgICBcbiAgICAgICAgLy8gbWFzdGVyIGNsYXNzIGZ1bmN0aW9uXG4gICAgICAgIHZhciBLbGFzcyA9IG5ldyBGdW5jdGlvbigncm93JywgJ3Blcm1pc3Npb25zJyxmdW5jU3RyaW5nKVxuXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5vcm0gPSBleHRPUk07XG4gICAgICAgIEtsYXNzLnJlZl90cmFuc2xhdGlvbnMgPSB7fTtcbiAgICAgICAgS2xhc3MubW9kZWxOYW1lID0gbW9kZWwubmFtZTtcbiAgICAgICAgS2xhc3MucmVmZXJlbmNlcyA9IExhenkobW9kZWwucmVmZXJlbmNlcykucGx1Y2soJ2lkJykudG9BcnJheSgpO1xuXG4gICAgICAgIEtsYXNzLmludmVyc2VfcmVmZXJlbmNlcyA9IG1vZGVsLnJlZmVyZW5jZWRCeS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIC8vIG1hbmFnaW5nIHJlZmVyZW5jZXMgd2hlcmUgXG4gICAgICAgICAgICByZXR1cm4geC5ieSArICdfJyArIHguaWQgKyAnX3NldCdcbiAgICAgICAgfSk7XG4gICAgICAgIEtsYXNzLnJlZmVyZW50cyA9IG1vZGVsLnJlZmVyZW5jZWRCeS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBbeC5ieSwgeC5pZF1cbiAgICAgICAgfSk7XG4gICAgICAgIEtsYXNzLmZpZWxkc09yZGVyID0gbW9kZWwuZmllbGRPcmRlcjtcbiAgICAgICAgS2xhc3MuYWxsUGVybWlzc2lvbnMgPSBtb2RlbC5wZXJtaXNzaW9ucztcblxuICAgICAgICAvLyByZWRlZmluaW5nIHRvU3RyaW5nIG1ldGhvZFxuICAgICAgICBpZiAoTGF6eShtb2RlbC5yZXByZXNlbnRhdGlvbikuc2l6ZSgpKXtcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS50b1N0cmluZyA9IG5ldyBGdW5jdGlvbigncmV0dXJuIHRoaXMuJyArIExhenkobW9kZWwucmVwcmVzZW50YXRpb24pLnRvU3RyaW5nKCcgKyBcIiBcIiArIHRoaXMuJykpO1xuICAgICAgICB9XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS50b1VwcGVyQ2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIHJlZGVmaW5lIHRvIFVwcGVyQ2FzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICB9O1xuICAgICAgXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS50b0xvd2VyQ2FzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBkZWxldGUgaW5zdGFuY2UgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIHJldHVybiBleHRPUk0uZGVsZXRlKHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lLCBbdGhpcy5pZF0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHBlcm1pc3Npb24gZ2V0dGVyIHByb3BlcnR5XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShLbGFzcy5wcm90b3R5cGUsICdwZXJtaXNzaW9ucycsIHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9wZXJtaXNzaW9ucylcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Blcm1pc3Npb25zO1xuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsaW5rZXIucGVybWlzc2lvbnNbdGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWVdLmFzayh0aGlzLmlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBnZXR0aW5nIGZ1bGwgcGVybWlzc2lvbiB0YWJsZSBmb3IgYW4gb2JqZWN0XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5hbGxfcGVybXMgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgIHZhciBvYmplY3RfaWQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUgKyAnL2FsbF9wZXJtcycsIHtpZDogdGhpcy5pZH0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBlcm1pc3Npb25zID0gZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgZ3JvdXBlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciB1bmtub3duX2dyb3VwcyA9IExhenkocGVybWlzc2lvbnMpLnBsdWNrKCdncm91cF9pZCcpLnVuaXF1ZSgpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJycgKyB4XG4gICAgICAgICAgICAgICAgfSkuZGlmZmVyZW5jZShJREIuYXV0aF9ncm91cC5rZXlzKCkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBMYXp5KHBlcm1pc3Npb25zKS5ncm91cEJ5KGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4Lmdyb3VwX2lkXG4gICAgICAgICAgICAgICAgfSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICBncm91cGVkW2tdID0gTGF6eSh2KS5wbHVjaygnbmFtZScpLnRvQXJyYXkoKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHZhciBjYWxsID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2IobmV3IFBlcm1pc3Npb25UYWJsZShvYmplY3RfaWQsIEtsYXNzLCBncm91cGVkKSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAodW5rbm93bl9ncm91cHMubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nZXQoJ2F1dGhfZ3JvdXAnLHVua25vd25fZ3JvdXBzLGNhbGwpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgY2FsbCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgdmFyIG8gPSB0aGlzLmFzUmF3KCk7XG4gICAgICAgICAgICB2YXIgZmllbGRzID0gS2xhc3MuZmllbGRzO1xuICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgIHZhciBtb2RlbE5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXJnIGluIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgb1thcmddID0gYXJnc1thcmddO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGVsaW1pbmF0ZSB1bndyaXRhYmxlc1xuICAgICAgICAgICAgTGF6eShLbGFzcy5maWVsZHNPcmRlcikuZmlsdGVyKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgIHJldHVybiAhZmllbGRzW3hdLndyaXRhYmxlO1xuICAgICAgICAgICAgfSkuZWFjaChmdW5jdGlvbihmaWVsZE5hbWUpe1xuICAgICAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgaW4gbykge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgb1tmaWVsZE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBXMlBSRVNPVVJDRS4kcG9zdChtb2RlbE5hbWUgKyAoSUQgPyAnL3Bvc3QnIDogJy9wdXQnKSwgbyk7XG4gICAgICAgICAgICBpZiAoYXJncyAmJiAoYXJncy5jb25zdHJ1Y3RvciA9PT0gRnVuY3Rpb24pKXtcbiAgICAgICAgICAgICAgICAvLyBwbGFjaW5nIGNhbGxiYWNrIGluIGEgY29tbW9uIHBsYWNlXG4gICAgICAgICAgICAgICAgcHJvbWlzZS5jb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlciA9IGFyZ3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZVxuICAgICAgICB9O1xuICAgICAgICBLbGFzcy5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBvYmogPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih0aGlzLmFzUmF3KCkpO1xuICAgICAgICAgICAgb2JqLl9wZXJtaXNzaW9ucyA9IHRoaXMuX3Blcm1pc3Npb25zO1xuICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBidWlsZGluZyBzZXJpYWxpemF0aW9uIGZ1bmN0aW9uXG4gICAgICAgIHZhciBhc3IgPSAncmV0dXJuIHtcXG4nICsgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5tYXAoZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgcmV0dXJuIGZpZWxkLmlkICsgJyA6IHRoaXMuXycgKyBmaWVsZC5pZDtcbiAgICAgICAgfSkuY29uY2F0KGZpZWxkcy5tYXAoZnVuY3Rpb24gKHgsaykge1xuICAgICAgICAgICAgaWYgKCh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiAodGhpcy4nICsgayArICc/KE1hdGgucm91bmQodGhpcy4nICsgayArICcuZ2V0VGltZSgpIC0gdGhpcy4nICsgayArICcuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIDYwMDAwKSAvIDEwMDApOm51bGwpJzsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHgudHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiB0aGlzLicgKyBrICsgJz9cIlRcIjpcIkZcIic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6IHRoaXMuJyArIGs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKS50b1N0cmluZygnLFxcbicpICsgJ307JztcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmFzUmF3ID0gbmV3IEZ1bmN0aW9uKGFzcik7XG5cbiAgICAgICAgS2xhc3Muc2F2ZU11bHRpID0gZnVuY3Rpb24gKG9iamVjdHMsIGNiLCBzY29wZSkge1xuICAgICAgICAgICAgdmFyIHJhdyA9IFtdO1xuICAgICAgICAgICAgdmFyIGRlbGV0YWJsZSA9IExhenkoS2xhc3MuZmllbGRzKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICF4LndyaXRhYmxlXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAucGx1Y2soJ2lkJylcbiAgICAgICAgICAgICAgICAudG9BcnJheSgpO1xuICAgICAgICAgICAgTGF6eShvYmplY3RzKVxuICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguYXNSYXcoKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShkZWxldGFibGUpLmVhY2goZnVuY3Rpb24gKHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB4W3ldO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmF3LnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUsICdwdXQnLCB7bXVsdGlwbGU6IHJhdywgZm9ybUlkeCA6IFcyUFJFU09VUkNFLmZvcm1JZHgrK30sIGZ1bmN0aW9uIChlbGVtcykge1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZWxlbXMpO1xuICAgICAgICAgICAgICAgIHZhciB0YWIgPSBJREJbS2xhc3MubW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB2YXIgb2JqcyA9IExhenkoZWxlbXNbS2xhc3MubW9kZWxOYW1lXS5yZXN1bHRzKS5wbHVjaygnaWQnKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhYi5nZXQoeClcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNiKSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKG9ianMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHNjb3BlKTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCdleHRyYV92ZXJicycgaW4gbW9kZWwpXG4gICAgICAgICAgICBMYXp5KG1vZGVsLmV4dHJhX3ZlcmJzKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgdmFyIGZ1bmNOYW1lID0geFswXTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHhbMV07XG4gICAgICAgICAgICAgICAgdmFyIGRkYXRhID0gJ2RhdGEgPSB7aWQgOiB0aGlzLmlkJztcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGRkYXRhICs9ICcsICcgKyBMYXp5KGFyZ3MpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4ICsgJyA6ICcgKyB4O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuam9pbignLCcpO1xuICAgICAgICAgICAgICAgIGRkYXRhICs9ICd9Oyc7XG4gICAgICAgICAgICAgICAgYXJncy5wdXNoKCdjYicpO1xuICAgICAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVtmdW5jTmFtZV0gPSBuZXcgRnVuY3Rpb24oYXJncywgZGRhdGEgKyAnVzJTLlcyUF9QT1NUKHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lLFwiJyArIGZ1bmNOYW1lICsgJ1wiLCBkYXRhLGZ1bmN0aW9uKGRhdGEsc3RhdHVzLGhlYWRlcnMseCl7JyArXG4gICAgICAgICAgICAgICAgICAgICd0cnl7XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICcgICBpZiAoIWhlYWRlcnMoXCJub21vZGVsXCIpKSB7d2luZG93LlcyUy5nb3REYXRhKGRhdGEsY2IpO31cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJyAgIGVsc2Uge2lmIChjYikge2NiKGRhdGEpfX1cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ30gY2F0Y2goZSl7XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICdpZiAoY2IpIHtjYihkYXRhKTt9XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICd9XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICd9KTtcXG4nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBpZiAoJ3ByaXZhdGVBcmdzJyBpbiBtb2RlbCkge1xuICAgICAgICAgICAgS2xhc3MucHJpdmF0ZUFyZ3MgPSBMYXp5KG1vZGVsLnByaXZhdGVBcmdzKS5rZXlzKCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFt4LCB0cnVlXTtcbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUuc2F2ZVBBID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICB2YXIgVCA9IHRoaXM7XG4gICAgICAgICAgICAgICAgdmFyIG9vID0ge2lkOiB0aGlzLmlkfTtcbiAgICAgICAgICAgICAgICB2YXIgUEEgPSB0aGlzLmNvbnN0cnVjdG9yLnByaXZhdGVBcmdzO1xuICAgICAgICAgICAgICAgIHZhciBGcyA9IHRoaXMuY29uc3RydWN0b3IuZmllbGRzO1xuICAgICAgICAgICAgICAgIHZhciB0ID0gbmV3IHRoaXMuY29uc3RydWN0b3IobykuYXNSYXcoKTtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRJZHggPSBMYXp5KFBBKS5rZXlzKCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbeCwgRnNbeF1dXG4gICAgICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgICAgICBMYXp5KG8pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChrIGluIFBBKSAmJiBmaWVsZElkeFtrXS53cml0YWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb29ba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUgKyAnL3NhdmVQQScsIG9vLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIExhenkob28pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFRba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBtb2RlbENhY2hlW0tsYXNzLm1vZGVsTmFtZV0gPSBLbGFzcztcbiAgICAgICAgLy8gYWRkaW5nIGlkIHRvIGZpZWxkc1xuICAgICAgICBmb3IgKHZhciBmIGluIG1vZGVsLmZpZWxkcykge1xuICAgICAgICAgICAgbW9kZWwuZmllbGRzW2ZdLmlkID0gZjtcbiAgICAgICAgfVxuICAgICAgICBLbGFzcy5maWVsZHMgPSBMYXp5KG1vZGVsLmZpZWxkcykuY29uY2F0KExhenkobW9kZWwucHJpdmF0ZUFyZ3MpKS5jb25jYXQoTGF6eShtb2RlbC5yZWZlcmVuY2VzKS50YXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHgudHlwZSA9IHgudHlwZSB8fCAncmVmZXJlbmNlJ1xuICAgICAgICB9KSkuaW5kZXhCeSgnaWQnKS50b09iamVjdCgpO1xuICAgICAgICAvLyBzZXR0aW5nIHdpZGdldHMgZm9yIGZpZWxkc1xuICAgICAgICBMYXp5KEtsYXNzLmZpZWxkcykuZWFjaChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICBpZiAoIWZpZWxkLndpZGdldCl7XG4gICAgICAgICAgICAgICAgZmllbGQud2lkZ2V0ID0gZmllbGQudHlwZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIHNldHRpbmcgY2hvaWNlcyB3aWRnZXQgZm9yIHJlZmVyZW5jZXNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIGlmICghZmllbGQud2lkZ2V0KXsgZmllbGQud2lkZ2V0ID0gJ2Nob2ljZXMnOyB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBidWlsZGluZyByZWZlcmVuY2VzIHRvIChtYW55IHRvIG9uZSkgZmllbGRzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICB2YXIgZXh0X3JlZiA9IHJlZi50bztcbiAgICAgICAgICAgIHZhciBsb2NhbF9yZWYgPSAnXycgKyByZWYuaWQ7XG4gICAgICAgICAgICBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKEtsYXNzLnByb3RvdHlwZSwgcmVmLmlkLGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShleHRfcmVmIGluIElEQikpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUoZXh0X3JlZixmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtlci5tYWluSW5kZXhbZXh0X3JlZl0uYXNrKHRoc1tsb2NhbF9yZWZdLHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IChleHRfcmVmIGluIElEQikgJiYgdGhpc1tsb2NhbF9yZWZdICYmIElEQltleHRfcmVmXS5nZXQodGhpc1tsb2NhbF9yZWZdKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdCAmJiAoZXh0X3JlZiBpbiBsaW5rZXIubWFpbkluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBhc2tpbmcgdG8gbGlua2VyXG4gICAgICAgICAgICAgICAgICAgIGxpbmtlci5tYWluSW5kZXhbZXh0X3JlZl0uYXNrKHRoaXNbbG9jYWxfcmVmXSx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHV0aWxzLm1vY2soKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUuY29uc3RydWN0b3IubW9kZWxOYW1lICE9IGV4dF9yZWYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBjYW4gYXNzaWduIG9ubHkgJyArIGV4dF9yZWYgKyAnIHRvICcgKyByZWYuaWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXNbbG9jYWxfcmVmXSA9IHZhbHVlLmlkO1xuICAgICAgICAgICAgfSwgJ25ldy0nICsgZXh0X3JlZiwgJ2RlbGV0ZWQtJyArIGV4dF9yZWYsJ3VwZGF0ZWQtJyArIGV4dF9yZWYsICduZXctbW9kZWwtJyArIGV4dF9yZWYpO1xuXG5cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVmLmlkKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5nZXQoZXh0X3JlZix0aGlzW2xvY2FsX3JlZl0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9idWlsZGluZyByZWZlcmVuY2VzIHRvIChvbmUgdG8gbWFueSkgZmllbGRzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSByZWYuYnkgKyAnLicgKyByZWYuaWQ7XG4gICAgICAgICAgICB2YXIgcHJvcGVydHlOYW1lID0gcmVmLmJ5ICsgJ18nICsgdXRpbHMucGx1cmFsaXplKHJlZi5pZCk7XG4gICAgICAgICAgICB2YXIgcmV2SW5kZXggPSByZWYuYnk7XG4gICAgICAgICAgICBpZiAoS2xhc3MucHJvdG90eXBlLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmVycm9yKCdUcnllZCB0byByZWRlZmluZSBwcm9wZXJ0eSAnICsgcHJvcGVydHlOYW1lICsgJ3MnICsgJyBmb3IgJyArIEtsYXNzLm1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCBwcm9wZXJ0eU5hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IChyZXZJbmRleCBpbiBJREIpID8gUkVWSURYW2luZGV4TmFtZV0uZ2V0KHRoaXMuaWQgKyAnJyk6bnVsbDtcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLmZvcmVpZ25LZXlzW2luZGV4TmFtZV0uYXNrKHRoaXMuaWQsdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgfSwgbnVsbCwgJ25ldy0nICsgcmV2SW5kZXgsICd1cGRhdGVkLScgKyByZXZJbmRleCwgJ2RlbGV0ZWQtJyArIHJldkluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUodXRpbHMucGx1cmFsaXplKHJlZi5ieSkpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0cyA9IHt9O1xuICAgICAgICAgICAgICAgIG9wdHNbcmVmLmlkXSA9IFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0T1JNLnF1ZXJ5KHJlZi5ieSxvcHRzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vYnVpbGRpbmcgcmVmZXJlbmNlIHRvIChtYW55IHRvIG1hbnkpIGZpZWxkc1xuICAgICAgICBpZiAobW9kZWwubWFueVRvTWFueSkge1xuICAgICAgICAgICAgTGF6eShtb2RlbC5tYW55VG9NYW55KS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gcmVmLmluZGV4TmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3QgPSByZWYuZmlyc3Q/IDAgOiAxO1xuICAgICAgICAgICAgICAgIHZhciBvbW9kZWxOYW1lID0gcmVmLm1vZGVsO1xuLy8gICAgICAgICAgICAgICAgdmFyIG9tb2RlbCA9IGdldEluZGV4KG9tb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciBnZXR0ZXIgPSBsaW5rZXIubTJtSW5kZXhbaW5kZXhOYW1lXVsnZ2V0JyArICgxIC0gZmlyc3QpXTtcblxuICAgICAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCByZWYubW9kZWwgKyAncycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGdldHRlcih0aHMuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdldCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9XMlBSRVNPVVJDRS5mZXRjaChvbW9kZWxOYW1lLCB7aWQgOiBpZHN9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXQgPSBnZXRJbmRleChvbW9kZWxOYW1lKS5nZXQuYmluZChJREJbb21vZGVsTmFtZV0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzICYmIGdldClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXQgPSBMYXp5KGlkcykubWFwKGdldCkuZmlsdGVyKHV0aWxzLmJvb2wpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgICAgIH0sIG51bGwsICdyZWNlaXZlZC1tMm0tJyArIGluZGV4TmFtZSwgJ3JlY2VpdmVkLScgKyBvbW9kZWxOYW1lKTtcblxuICAgICAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUodXRpbHMucGx1cmFsaXplKG9tb2RlbE5hbWUpKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5rZXIuZ2V0TTJNKGluZGV4TmFtZSwgW3Rocy5pZF0sIGZpcnN0LGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gZ2V0dGVyKHRocy5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG9tb2RlbE5hbWUsIHtpZCA6IGlkc30sbnVsbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZXQgPSBJREJbb21vZGVsTmFtZV0uZ2V0LmJpbmQoSURCW29tb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQoTGF6eShpZHMpLm1hcChnZXQpLmZpbHRlcih1dGlscy5ib29sKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQoW10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfTtcblxuXG4gICAgICAgICAgICAgICAgS2xhc3MuZmllbGRzW3V0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSldID0ge1xuICAgICAgICAgICAgICAgICAgICBpZDogdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWxOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWxOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHJlYWRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnTTJNJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yczogW11cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnVubGlua1JlZmVyZW5jZSA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lID09ICdBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZXMgPSBpbnN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBpbnN0YW5jZXNbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKG11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtJRCwgeF1cbiAgICAgICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gW1tJRCwgaW5zdGFuY2UuaWRdXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lICsgJy8nICsgb21vZGVsICsgJ3MvZGVsZXRlJywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS5saW5rUmVmZXJlbmNlID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgICAgICB2YXIgaW5zdGFuY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmNvbnN0cnVjdG9yLm5hbWUgPT0gJ0FycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlcyA9IGluc3RhbmNlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IGluc3RhbmNlc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbCA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gS2xhc3MubW9kZWxOYW1lICsgJy8nICsgb21vZGVsO1xuICAgICAgICAgICAgICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVmcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElOREVYX00yTSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVmcyA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5kaWZmZXJlbmNlKExhenkoSU5ERVhfTTJNW2luZGV4TmFtZV1bMF0uZ2V0KHRoaXMuaWQpKSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGluZGV4TmFtZSA9IG9tb2RlbCArICcvJyArIEtsYXNzLm1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJTkRFWF9NMk0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZnMgPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykuZGlmZmVyZW5jZShMYXp5KElOREVYX00yTVtpbmRleE5hbWVdWzBdLmdldCh0aGlzLmlkKSkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVmcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gTGF6eShyZWZzKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW0lELCB4XVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQX1BPU1QoS2xhc3MubW9kZWxOYW1lLCBvbW9kZWwgKyAncy9wdXQnLCB7Y29sbGVjdGlvbjogY29sbGVjdGlvbn0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoaW5kZXhOYW1lIGluIGxpbmtlci5tMm1JbmRleCkgJiYgTGF6eShsaW5rZXIubTJtSW5kZXhbaW5kZXhOYW1lXVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUob21vZGVsKV0oaW5zdGFuY2UuaWQpKS5maW5kKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lICsgJy8nICsgb21vZGVsICsgJ3MvcHV0Jywge2NvbGxlY3Rpb246IFtbdGhpcy5pZCwgaW5zdGFuY2UuaWRdXX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZXZlbnRzLmVtaXQoJ25ldy1tb2RlbCcsIEtsYXNzKTtcbiAgICAgICAgZXZlbnRzLmVtaXQoJ25ldy1tb2RlbC0nICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgcmV0dXJuIEtsYXNzO1xuICAgIH07XG5cbiAgICB0aGlzLmdvdERhdGEgPSBmdW5jdGlvbiAoZGF0YSwgY2FsbEJhY2spIHtcbiAgICAgICAgLy8gcmVjZWl2ZSBhbGwgZGF0YSBmcm9tIGV2ZXJ5IGVuZCBwb2ludFxuICAgICAgICBjb25zb2xlLmluZm8oJ2dvdERhdGEnKTtcbiAgICAgICAgaWYgKHR5cGVvZihkYXRhKSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2RhdGEgJyArIGRhdGEgKyAnIHJlZnVzZWQgZnJvbSBnb3REYXRhKCknKTtcbiAgICAgICAgICAgIGlmIChjYWxsQmFjaykge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBjbGVhbiBkYXRhIGZyb20gcmVsYXRpb25zIGFuZCBwZXJtaXNzaW9ucyBmb3IgdXNpbmcgaXQgYWZ0ZXIgbW9kZWwgcGFyc2luZ1xuICAgICAgICBpZiAoJ19leHRyYScgaW4gZGF0YSl7IGRlbGV0ZSBkYXRhLl9leHRyYSB9XG4gICAgICAgIHZhciBUT09ORSA9IGRhdGEuVE9PTkU7XG4gICAgICAgIHZhciBUT01BTlkgPSBkYXRhLlRPTUFOWTtcbiAgICAgICAgdmFyIE1BTllUT01BTlkgPSBkYXRhLk1BTllUT01BTlk7XG4gICAgICAgIHZhciBQRVJNSVNTSU9OUyA9IGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIHZhciBQQSA9IGRhdGEuUEE7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPT05FO1xuICAgICAgICBkZWxldGUgZGF0YS5UT01BTlk7XG4gICAgICAgIGRlbGV0ZSBkYXRhLk1BTllUT01BTlk7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBFUk1JU1NJT05TO1xuICAgICAgICBkZWxldGUgZGF0YS5QQTtcbiAgICAgICAgaWYgKCFQQSkgeyBQQSA9IHt9OyB9XG5cbiAgICAgICAgLy8gY2xlYW5pbmcgZnJvbSB1c2VsZXNzIGRlbGV0ZWQgZGF0YVxuICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5maWx0ZXIoZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgIHJldHVybiAoISgnZGVsZXRlZCcgaW4gdikgfHwgKChrIGluIG1vZGVsQ2FjaGUpKSk7XG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJ20ybScgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG0ybSA9IGRhdGEubTJtO1xuICAgICAgICAgICAgZGVsZXRlIGRhdGFbJ20ybSddO1xuICAgICAgICB9XG4gICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbiAoZGF0YSwgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICAgICAgICAgIHZhciBtb2RlbENsYXNzID0gbW9kZWw7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucmVzdWx0cyAmJiAoZGF0YS5yZXN1bHRzLmxlbmd0aCA+IDApICYmIChkYXRhLnJlc3VsdHNbMF0uY29uc3RydWN0b3IgPT0gQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cyA9IExhenkoZGF0YS5yZXN1bHRzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTGF6eShtb2RlbENsYXNzLmZpZWxkc09yZGVyKS56aXAoeCkudG9PYmplY3QoKVxuICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIHZhciBkZWxldGVkID0gZGF0YS5kZWxldGVkO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gUEEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIE1QQSA9IFBBW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIExhenkocmVzdWx0cykuZWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3JkLmlkIGluIE1QQSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoTVBBW3JlY29yZC5pZF0pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBpbmRleGluZyByZWZlcmVuY2VzIGJ5IGl0cyBJRFxuICAgICAgICAgICAgICAgIHZhciBpdGFiID0gZ2V0SW5kZXgobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFibGUgPSBpdGFiLnNvdXJjZTtcblxuICAgICAgICAgICAgICAgIC8vIG9iamVjdCBkZWxldGlvblxuICAgICAgICAgICAgICAgIGlmIChkZWxldGVkKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlZC5mb3JFYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbi8qXG4gICAgICAgICAgICAgICAgTGF6eShkZWxldGVkKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0YWJsZVt4XTtcbiAgICAgICAgICAgICAgICB9KTtcbiovXG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IHJlc3VsdHMuaW5kZXhCeSgnaWQnKTtcbiAgICAgICAgICAgICAgICB2YXIgaWsgPSBpZHgua2V5cygpO1xuICAgICAgICAgICAgICAgIHZhciBubmV3ID0gaWsuZGlmZmVyZW5jZShpdGFiLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgpXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkID0gaWsuZGlmZmVyZW5jZShubmV3KTtcbiAgICAgICAgICAgICAgICAvLyByZW1vdmluZyBvbGQgaWRlbnRpY2FsIHZhbHVlc1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQgPSB1cGRhdGVkLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIXV0aWxzLnNhbWVBcyhpZHguZ2V0KHgpLCBpdGFiLmdldCh4KS5hc1JhdygpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyBjbGFzc2lmeSByZWNvcmRzXG4gICAgICAgICAgICAgICAgdmFyIHBlcm1zID0gZGF0YS5wZXJtaXNzaW9ucyA/IExhenkoZGF0YS5wZXJtaXNzaW9ucykgOiBMYXp5KHt9KTtcbiAgICAgICAgICAgICAgICB2YXIgbmV3T2JqZWN0cyA9IG5uZXcubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgbW9kZWxDbGFzcyhpZHguZ2V0KHgpLCBwZXJtcy5nZXQoeCkpXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLy8vIGNsYXNzaWZ5aW5nIHVwZGF0ZWRcbiAgICAgICAgICAgICAgICAvL3ZhciB1cGRhdGVkT2JqZWN0cyA9IHVwZGF0ZWQubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBuZXcgbW9kZWxDbGFzcyhpZHguZ2V0KHgpLHBlcm1zLmdldCh4KSl9KTtcbiAgICAgICAgICAgICAgICAvL3ZhciB1byA9IHVwZGF0ZWRPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvL3VwZGF0ZWRPYmplY3RzID0gTGF6eSh1bykubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBbeCx0YWJsZVt4LmlkXV19KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRpbmcgc2luZ2xlIG9iamVjdHNcbiAgICAgICAgICAgICAgICB2YXIgY2hhbmdlZCA9IFtdO1xuLy8gICAgICAgICAgICAgICAgdmFyIERBVEVGSUVMRFMgPSBNT0RFTF9EQVRFRklFTERTW21vZGVsTmFtZV07XG4vLyAgICAgICAgICAgICAgICB2YXIgQk9PTEZJRUxEUyA9IE1PREVMX0JPT0xGSUVMRFNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB1cGRhdGVkLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZEl0ZW0gPSBpdGFiLmdldCh4KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZENvcHkgPSBvbGRJdGVtLmNvcHkoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0l0ZW0gPSBuZXcgbW9kZWxDbGFzcyhpZHguZ2V0KHgpKTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShtb2RlbC5maWVsZHMpLmtleXMoKS5lYWNoKGZ1bmN0aW9uKGspe1xuICAgICAgICAgICAgICAgICAgICAgICAgb2xkSXRlbVtrXSA9IG5ld0l0ZW1ba107XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkLnB1c2goW29sZEl0ZW0sIG9sZENvcHldKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vLy8gc2VuZGluZyBzaWduYWwgZm9yIHVwZGF0ZWQgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKGNoYW5nZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KCd1cGRhdGVkLScgKyBtb2RlbE5hbWUsIGNoYW5nZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyoqKioqKioqIFVwZGF0ZSB1bml2ZXJzZSAqKioqKioqKlxuICAgICAgICAgICAgICAgIHZhciBubyA9IG5ld09iamVjdHMudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIExhenkobm8pLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFibGVbeC5pZF0gPSB4XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gcmVidWxkaW5nIHJldmVyc2UgaW5kZXhlc1xuICAgICAgICAgICAgICAgIExhenkobW9kZWxDYWNoZVttb2RlbE5hbWVdLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgICAgICAgICBSRVZJRFhbbW9kZWxOYW1lICsgJy4nICsgcmVmXSA9IElEQlttb2RlbE5hbWVdLmdyb3VwQnkoJ18nICsgcmVmKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgbmV3IHZhbHVlc1xuICAgICAgICAgICAgICAgIGlmIChuby5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KCduZXctJyArIG1vZGVsTmFtZSwgTGF6eShubyksIGRhdGEudG90YWxSZXN1bHRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBldmVudHMuZW1pdCgnZGVsZXRlZC0nICsgbW9kZWxOYW1lLCBkZWxldGVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIGRhdGEgYXJyaXZlZFxuICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KCdyZWNlaXZlZC0nICsgbW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKFRPT05FKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUT09ORScpO1xuICAgICAgICAgICAgTGF6eShUT09ORSkuZWFjaChmdW5jdGlvbiAodmFscywgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgdWR4ID0gZ2V0VW5saW5rZWQobW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChUT01BTlkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RPTUFOWScpO1xuICAgICAgICAgICAgTGF6eShUT01BTlkpLmVhY2goZnVuY3Rpb24gKHZhbHMsIGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBBU0tFRF9VTkxJTktFRCkpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfVU5MSU5LRURbaW5kZXhOYW1lXSA9IExhenkoW10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBMYXp5KHZhbHMpLmVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX1VOTElOS0VEW2luZGV4TmFtZV0uc291cmNlLnB1c2goaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE1BTllUT01BTlkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ01BTllUT01BTlknKTtcbiAgICAgICAgICAgIExhenkoTUFOWVRPTUFOWSkuZWFjaChmdW5jdGlvbiAodmFscywgaW5kZXhOYW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcGFyc2VJbnQoaW5kZXhOYW1lLnNwbGl0KCd8JylbMV0pO1xuICAgICAgICAgICAgICAgIGluZGV4TmFtZSA9IGluZGV4TmFtZS5zcGxpdCgnfCcpWzBdO1xuICAgICAgICAgICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBBU0tFRF9NMk0pKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX00yTVtpbmRleE5hbWVdID0gW3t9LCB7fV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBNSURYID0gQVNLRURfTTJNW2luZGV4TmFtZV1bZmlyc3RdO1xuICAgICAgICAgICAgICAgIExhenkodmFscykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBNSURYW3ggKyAnJ10gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBNSURYW3hdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtMm0pIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdE0yTShtMm0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChQRVJNSVNTSU9OUykge1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoUEVSTUlTU0lPTlMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBldmVudHMuZW1pdCgnZ290LWRhdGEnKTtcbiAgICB9O1xuICAgIHRoaXMuZ290UGVybWlzc2lvbnMgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24gKHYsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgTGF6eSh2WzBdKS5lYWNoKGZ1bmN0aW9uIChyb3csIGlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKChyZXNvdXJjZU5hbWUgaW4gSURCKSAmJiAoaWQgaW4gSURCW3Jlc291cmNlTmFtZV0uc291cmNlKSl7XG4gICAgICAgICAgICAgICAgICAgIElEQltyZXNvdXJjZU5hbWVdLmdldChpZCkuX3Blcm1pc3Npb25zID0gTGF6eShyb3cpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCB0cnVlXVxuICAgICAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKExhenkodlswXSkuc2l6ZSgpKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMtJyArIHJlc291cmNlTmFtZSwgTGF6eSh2WzBdKS5rZXlzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZW1pdCgndXBkYXRlLXBlcm1pc3Npb25zJyk7XG4gICAgfTtcblxuXG4gICAgdGhpcy5nb3RNMk0gPSBmdW5jdGlvbihtMm0pe1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihkYXRhLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgdmFyIG0ybUluZGV4ID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24obSl7XG4gICAgICAgICAgICAgICAgTGF6eShtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsdmVyYil7XG4gICAgICAgICAgICAgICAgICAgIG0ybUluZGV4W3ZlcmJdKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBldmVudHMuZW1pdCgncmVjZWl2ZWQtbTJtJyk7XG4gICAgICAgICAgICBldmVudHMuZW1pdCgncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmZldGNoID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spIHsgIC8vXG4gICAgICAgIC8vIGlmIGEgY29ubmVjdGlvbiBpcyBjdXJyZW50bHkgcnVubmluZywgd2FpdCBmb3IgY29ubmVjdGlvbi5cbiAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpe1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spO1xuICAgICAgICAgICAgfSw1MDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZmV0Y2hpbmcgYXN5bmNocm9tb3VzIG1vZGVsIGZyb20gc2VydmVyXG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgICAgICAvLyBpZiBkYXRhIGNhbWVzIGZyb20gcmVhbHRpbWUgY29ubmVjdGlvblxuICAgICAgICAgICAgICAgIGlmIChXMlBSRVNPVVJDRS5jb25uZWN0aW9uLm9wdGlvbnMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBnZXR0aW5nIGZpbHRlciBmaWx0ZXJlZCBieSBjYWNoaW5nIHN5c3RlbVxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXIgPSBsaXN0Q2FjaGUuZmlsdGVyKG1vZGVsLGZpbHRlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgc29tdGhpbmcgaXMgbWlzc2luZyBvbiBteSBsb2NhbCBEQiBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbHRlcil7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhc2sgZm9yIG1pc3NpbmdzIGFuZCBwYXJzZSBzZXJ2ZXIgcmVzcG9uc2UgaW4gb3JkZXIgdG8gZW5yaWNoIG15IGxvY2FsIERCLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGxhY2luZyBsb2NrIGZvciB0aGlzIG1vZGVsXG4gICAgICAgICAgICAgICAgICAgICAgICB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChtb2RlbE5hbWUgKyAnL2xpc3QnLCB7ZmlsdGVyIDogZmlsdGVyfSxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsY2FsbEJhY2spXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWxlYXNlIGxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgbG9ja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywgc2VuZERhdGEsZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbHRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHT1RfQUxMLnNvdXJjZS5wdXNoKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXQgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICAvLyBzZWFyY2ggb2JqZWN0cyBmcm9tIElEQi4gSWYgc29tZSBpZCBpcyBtaXNzaW5nLCBpdCByZXNvbHZlIGl0IGJ5IHRoZSBzZXJ2ZXJcbiAgICAgICAgLy8gaWYgYSByZXF1ZXN0IHRvIHRoZSBzYW1lIG1vZGVsIGlzIHBlbmRpbmcsIHdhaXQgZm9yIGl0cyBjb21wbGV0aW9uXG4gICAgICAgIFxuICAgICAgICBpZiAoaWRzLmNvbnN0cnVjdG9yICE9PSBBcnJheSl7XG4gICAgICAgICAgICBpZHMgPSBbaWRzXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBzb21lIGVudGl0eSBpcyBtaXNzaW5nIFxuICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUgLCB7aWQ6IGlkc30sIG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgIHZhciBpdGFiID0gSURCW21vZGVsTmFtZV1cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIGlkcyl7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goaXRhYi5zb3VyY2VbaWRzW2lkXV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ290TW9kZWwgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBmb3IgKHZhciBtb2RlbE5hbWUgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gZGF0YVttb2RlbE5hbWVdO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlWydkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lXSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgbW9kZWxDYWNoZVttb2RlbE5hbWVdID0gbWFrZU1vZGVsQ2xhc3MobW9kZWwpO1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIElEQikpIHtcbiAgICAgICAgICAgICAgICBJREJbbW9kZWxOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZGVzY3JpYmUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHJldCA9IG1vZGVsQ2FjaGVbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpKXtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGZhaWxlZE1vZGVscyl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY2FjaGVLZXkgPSAnZGVzY3JpcHRpb246JyArIG1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoY2FjaGVLZXkgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ290TW9kZWwoSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbY2FjaGVLZXldKSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVzY3JpYmUnLG51bGwsIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290TW9kZWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLm1vZGVsTm90Rm91bmQuaGFuZGxlKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsZWRNb2RlbHNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgY29ubmVjdGlvblxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUobW9kZWxOYW1lLCBjYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAgICAgICAgXG4gICAgfTtcbiAgICB0aGlzLmFkZE1vZGVsSGFuZGxlciA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGRlY29yYXRvcikge1xuICAgICAgICB2YXIga2V5ID0gdXRpbHMuaGFzaChkZWNvcmF0b3IpO1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gYnVpbGRlckhhbmRsZXJzKSkgYnVpbGRlckhhbmRsZXJzW21vZGVsTmFtZV0gPSBuZXcgSGFuZGxlcigpO1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gYnVpbGRlckhhbmRsZXJVc2VkKSkgYnVpbGRlckhhbmRsZXJVc2VkW21vZGVsTmFtZV0gPSB7fTtcbiAgICAgICAgaWYgKGtleSBpbiBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXVtrZXldID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWxOYW1lIGluIG1vZGVsQ2FjaGUpIHtcbiAgICAgICAgICAgIGRlY29yYXRvcihtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVpbGRlckhhbmRsZXJzW21vZGVsTmFtZV0uYWRkSGFuZGxlcihkZWNvcmF0b3IpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzID0gZnVuY3Rpb24obW9kZWxOYW1lLCBhdHRyaWJ1dGVzKXtcbiAgICAgICAgdmFyIGFkZFByb3BlcnR5ID0gZnVuY3Rpb24obW9kZWwsIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICBhdHRyaWJ1dGVzLmZvckVhY2goZnVuY3Rpb24odmFsKXtcbiAgICAgICAgICAgIHZhciBrZXkgPSAncEE6JyArIG1vZGVsLm1vZGVsTmFtZSArICc6JyArIHZhbDtcbiAgICAgICAgICAgIHZhciBrYXR0ciA9ICdfXycgKyB2YWw7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobW9kZWwucHJvdG90eXBlLCB2YWwsIHtcbiAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmICghKGthdHRyIGluIHRoaXMpKXtcbiAgICAgICAgICAgICAgICAgIHZhciB2ID0gbG9jYWxTdG9yYWdlW2tleSArIHRoaXMuaWRdO1xuICAgICAgICAgICAgICAgICAgdGhpc1trYXR0cl0gPSB2P0pTT04ucGFyc2Uodik6bnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNba2F0dHJdO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgICAgICAgICB0aGlzW2thdHRyXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtrZXkgKyB0aGlzLmlkXSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBwZXJzaXN0ZW50QXR0cmlidXRlcykpIHsgcGVyc2lzdGVudEF0dHJpYnV0ZXNbbW9kZWxOYW1lXSA9IFtdOyB9XG4gICAgICAgIHZhciBhdHRycyA9IHBlcnNpc3RlbnRBdHRyaWJ1dGVzW21vZGVsTmFtZV07XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICB2YXIgbmV3QXR0cnMgPSBMYXp5KGF0dHJpYnV0ZXMpLmRpZmZlcmVuY2UoYXR0cnMpLnRvQXJyYXkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBuZXdBdHRycyA9IGF0dHJzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZXdBdHRycy5sZW5ndGgpe1xuICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBtb2RlbENhY2hlKXtcbiAgICAgICAgICAgICAgICBhZGRQcm9wZXJ0eShtb2RlbENhY2hlW21vZGVsTmFtZV0sIG5ld0F0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShhdHRycyxuZXdBdHRycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMub24oJ25ldy1tb2RlbCcsIGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgaWYgKG1vZGVsLm1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlcnMpe1xuICAgICAgICAgICAgYnVpbGRlckhhbmRsZXJzW21vZGVsLm1vZGVsTmFtZV0uaGFuZGxlKG1vZGVsQ2FjaGVbbW9kZWwubW9kZWxOYW1lXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1vZGVsLm1vZGVsTmFtZSBpbiBwZXJzaXN0ZW50QXR0cmlidXRlcyl7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyhtb2RlbC5tb2RlbE5hbWUpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5jb25uZWN0ID0gZnVuY3Rpb24oY2FsbEJhY2spe1xuICAgICAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCl7XG4gICAgICAgICAgICBjYWxsQmFjayh0aGlzLmNvbm5lY3Rpb24ub3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29ubmVjdChmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmlzQ29ubmVjdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhzdGF0dXMpO1xuICAgICAgICAgICAgfSk7ICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMucXVlcnkgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHRoaXMuZGVzY3JpYmUobW9kZWxOYW1lLGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgIC8vIGFycmF5Zml5IGFsbCBmaWx0ZXIgdmFsdWVzXG4gICAgICAgICAgICBmaWx0ZXIgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHYsayl7IHJldHVybiBbayxBcnJheS5pc0FycmF5KHYpP3Y6W3ZdXX0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICB2YXIgZmlsdGVyRnVuY3Rpb24gPSB1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgdmFyIGlkeCA9IGdldEluZGV4KG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB0aHMuZmV0Y2gobW9kZWxOYW1lLGZpbHRlcix0b2dldGhlciwgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soaWR4LmZpbHRlcihmaWx0ZXJGdW5jdGlvbikudmFsdWVzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2RlbGV0ZScsIHsgaWQgOiBpZHN9LCBjYWxsQmFjayk7XG4gICAgfTtcbn07XG5cbmZ1bmN0aW9uIHJlV2hlZWxPUk0oZW5kUG9pbnQsIGxvZ2luRnVuYyl7XG4gICAgdGhpcy4kb3JtID0gbmV3IGJhc2VPUk0obmV3IHV0aWxzLnJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBsb2dpbkZ1bmMpLHRoaXMpO1xuICAgIHRoaXMub24gPSB0aGlzLiRvcm0ub24uYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuZW1pdCA9IHRoaXMuJG9ybS5lbWl0LmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLnVuYmluZCA9IHRoaXMuJG9ybS51bmJpbmQuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gdGhpcy4kb3JtLmFkZE1vZGVsSGFuZGxlci5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyA9IHRoaXMuJG9ybS5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcy5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy51dGlscyA9IHV0aWxzO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRNb2RlbCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5kZXNjcmliZShtb2RlbE5hbWUsYWNjZXB0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obW9kZWxOYW1lLCBpZHMpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2luZ2xlID0gZmFsc2U7XG4gICAgdmFyIG1vZE5hbWUgPSBtb2RlbE5hbWU7XG4gICAgaWYgKGlkcy5jb25zdHJ1Y3RvciAhPT0gQXJyYXkpe1xuICAgICAgICBzaW5nbGUgPSB0cnVlO1xuICAgICAgICBpZHMgPSBbaWRzXVxuICAgIH1cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmIChzaW5nbGUpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZ2V0KG1vZE5hbWUsIGlkcywgZnVuY3Rpb24oaXRlbXMpeyBcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChpdGVtc1swXSk7fVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5nZXQobW9kTmFtZSwgaWRzLCBhY2NlcHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxucmVXaGVlbE9STS5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBmaWx0ZXIsIHJlbGF0ZWQpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB2YXIgdG9nZXRoZXIgPSBudWxsO1xuICAgICAgICBpZiAocmVsYXRlZCAmJiAocmVsYXRlZC5jb25zdHJ1Y3RvciA9PT0gQXJyYXkpICYmIChyZWxhdGVkLmxlbmd0aCkpe1xuICAgICAgICAgICAgdG9nZXRoZXIgPSByZWxhdGVkO1xuICAgICAgICB9IGVsc2UgaWYgKHJlbGF0ZWQgJiYgKHJlbGF0ZWQuY29uc3RydWN0b3IgPT09IFN0cmluZykgJiYgKHJlbGF0ZWQubGVuZ3RoKSl7XG4gICAgICAgICAgICB0b2dldGhlciA9IHJlbGF0ZWQuc3BsaXQoJywnKTtcbiAgICAgICAgfVxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBpZiAoc2VsZi4kb3JtLmlzQ29ubmVjdGVkKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBhY2NlcHQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBpZHMpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBpZiAoc2VsZi4kb3JtLmNvbm5lY3RlZCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlbGV0ZShtb2RlbE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlbGV0ZShtb2RlbE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KVxufTtcblxucmVXaGVlbE9STS5wcm90b3R5cGUuJHNlbmRUb0VuZHBvaW50ID0gZnVuY3Rpb24gKHVybCwgZGF0YSl7XG4gICAgcmV0dXJuIHRoaXMuJG9ybS4kcG9zdCh1cmwsIGRhdGEpO1xufVxuXG4iXX0=
