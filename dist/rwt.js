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
        var promise = utils.xdr(this.options.endPoint + url, data, this.options.application, this.options.token).then(function (xhr) {
            ths.events.emit('http-response', xhr.responseText, xhr.status, url, data);
            ths.events.emit('http-response-' + xhr.status, xhr.responseText, url, data);
            if (xhr.responseData) {
                ths.events.emit('http-response-' + xhr.status + '-json', xhr.responseData, url, data);
            }
            if (callBack) {
                callBack(xhr.responseData || xhr.responseText);
            }
            ;
        }, function (xhr) {
            if (xhr.responseData) {
                ths.events.emit('error-json', xhr.responseData, xhr.status, url, data, xhr);
                ths.events.emit('error-json-' + xhr.status, xhr.responseData, url, data, xhr);
            } else {
                ths.events.emit('error-http', xhr.responseText, xhr.status, url, data, xhr);
                ths.events.emit('error-http-' + xhr.status, xhr.responseText, url, data, xhr);
            }
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
        tzOffset: new Date().getTimezoneOffset() * 60000
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
                        return linker.mainIndex[ext_ref].ask(this[local_ref], true);
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
    root.rwt = reWheelORM;
}(window, Lazy, SockJS));
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJ0b3VjaGVyLmpzIiwidmFjdXVtY2FjaGVyLmpzIiwiYXV0b2xpbmtlci5qcyIsImxpc3RjYWNoZXIuanMiLCJtYW55dG9tYW55LmpzIiwiY2FjaGVyLmpzIiwib3JtLmpzIl0sIm5hbWVzIjpbIkhhbmRsZXIiLCJoYW5kbGVycyIsInN0ckhhbmRsZXJzIiwicHJvdG90eXBlIiwiYWRkSGFuZGxlciIsImhhbmRsZXIiLCJzdHJIYW5kbGVyIiwidXRpbHMiLCJoYXNoIiwidG9TdHJpbmciLCJwdXNoIiwiaGFuZGxlIiwiYXJncyIsIkFycmF5Iiwic2xpY2UiLCJjYWxsIiwiYXJndW1lbnRzIiwiZm9yRWFjaCIsImZ1bmMiLCJhcHBseSIsImhhbmRsZUJ5IiwidGhzIiwiTmFtZWRFdmVudE1hbmFnZXIiLCJldmVudHMiLCJoYW5kbGVySWQiLCJpZHhJZCIsIm9uIiwibmFtZSIsImlkIiwiZW1pdCIsImV2ZW50IiwidW5iaW5kIiwiY291bnQiLCJMYXp5IiwiZWFjaCIsInYiLCJrIiwiaWR4IiwibiIsInJldmVyc2UiLCJ4Iiwic3BsaWNlIiwiY2FjaGVkS2V5SWR4IiwiJFBPU1QiLCJ1cmwiLCJkYXRhIiwiY2FsbEJhY2siLCJlcnJvckJhY2siLCJoZWFkZXJzIiwib3B0cyIsImFjY2VwdHMiLCJKU09OIiwic3RyaW5naWZ5IiwiZGF0YVR5cGUiLCJzdWNjZXNzIiwiZXJyb3IiLCJtZXRob2QiLCJjb250ZW50VHlwZSIsImNyb3NzRG9tYWluIiwiJCIsImFqYXgiLCJyZVdoZWVsQ29ubmVjdGlvbiIsImVuZFBvaW50IiwiZ2V0TG9naW4iLCJzZWxmIiwiYmluZCIsIm9wdGlvbnMiLCJzdGF0dXMiLCJmb3JjZSIsImxvY2FsU3RvcmFnZSIsInBhcnNlIiwibGFzdFJXVFN0YXR1cyIsImUiLCJfc3RhdHVzX2NhbGxpbmciLCJzZXRUaW1lb3V0IiwidGltZXN0YW1wIiwiJHBvc3QiLCJ1c2VyX2lkIiwibG9nSW5mbyIsImNvbnN0cnVjdG9yIiwiT2JqZWN0IiwibG9naW4iLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwidGhlbiIsInRva2VuIiwiYXBwbGljYXRpb24iLCJwcm9taXNlIiwieGRyIiwieGhyIiwicmVzcG9uc2VUZXh0IiwicmVzcG9uc2VEYXRhIiwiY29ubmVjdGlvbiIsIlByb21pc2UiLCJhY2NlcHQiLCJyZWplY3QiLCJjb25uZWN0Iiwid3Njb25uZWN0Iiwid3NDb25uZWN0aW9uIiwid3NDb25uZWN0Iiwib25Db25uZWN0Iiwib25EaXNjb25uZWN0IiwiY29uc29sZSIsImxvZyIsInJlYWx0aW1lRW5kUG9pbnQiLCJyZW5hbWVGdW5jdGlvbiIsImZuIiwiRnVuY3Rpb24iLCJjYWNoZWQiLCJrZXkiLCJ3cmFwcGVyIiwiZm9ybUVuY29kZSIsInJlcSIsIlhNTEh0dHBSZXF1ZXN0Iiwib25yZWFkeXN0YXRlY2hhbmdlIiwicmVhZHlTdGF0ZSIsImEiLCJyZXNwb25zZSIsInN0YXR1c1RleHQiLCJyZXF1ZXN0IiwiWERvbWFpblJlcXVlc3QiLCJvbmxvYWQiLCJFcnJvciIsIm9wZW4iLCJvbmVycm9yIiwic2V0UmVxdWVzdEhlYWRlciIsIl9fdG9rZW5fXyIsInNpemUiLCJtYXAiLCJlbmNvZGVVUkkiLCJ0b0FycmF5Iiwiam9pbiIsInNlbmQiLCJjYXBpdGFsaXplIiwicyIsInRvVXBwZXJDYXNlIiwidG9Mb3dlckNhc2UiLCJzdHIiLCJyZXQiLCJsZW5ndGgiLCJjaGFyQ29kZUF0IiwibWFrZUZpbHRlciIsIm1vZGVsIiwiZmlsdGVyIiwidW5pZmllciIsImRvbnRUcmFuc2xhdGVGaWx0ZXIiLCJzb3VyY2UiLCJ2YWxzIiwiZmllbGQiLCJpc0FycmF5IiwiZmllbGRzIiwidHlwZSIsIk51bWJlciIsInNhbWVBcyIsInkiLCJ3aXphcmQiLCJvbkNvbm5lY3Rpb24iLCJvbkRpc2Nvbm5lY3Rpb24iLCJvbk1lc3NhZ2VKc29uIiwib25NZXNzYWdlVGV4dCIsIm9uV2l6YXJkIiwiU29ja0pTIiwib25vcGVuIiwidGVuYW50Iiwib25tZXNzYWdlIiwib25jbG9zZSIsInBsdXJhbGl6ZSIsImJlZm9yZUNhbGwiLCJiZWZvcmUiLCJkZWNvcmF0b3IiLCJjbGVhblN0b3JhZ2UiLCJrZXlzIiwiY2hyIiwic3BsaXQiLCJwZXJtdXRhdGlvbnMiLCJhcnIiLCJib29sIiwiQm9vbGVhbiIsIm5vb3AiLCJ0ek9mZnNldCIsIkRhdGUiLCJnZXRUaW1lem9uZU9mZnNldCIsIlRvdWNoZXIiLCJ0b3VjaGVkIiwidG91Y2giLCJ0IiwiVmFjdXVtQ2FjaGVyIiwiYXNrZWQiLCJtaXNzaW5nIiwiYXNrIiwibGF6eSIsImNvbnRhaW5zIiwiZ2V0QXNrZWRJbmRleCIsIm1pc3NpbmdzIiwidW5pcXVlIiwiQXV0b0xpbmtlciIsImFjdGl2ZXMiLCJJREIiLCJXMlBSRVNPVVJDRSIsImxpc3RDYWNoZSIsIm1haW5JbmRleCIsImZvcmVpZ25LZXlzIiwibTJtIiwibTJtSW5kZXgiLCJwZXJtaXNzaW9ucyIsInBrSW5kZXgiLCJnZXRJbmRleEZvciIsInJlZmVyZW5jZXMiLCJyZWZlcmVuY2UiLCJpbmRleE5hbWUiLCJ0byIsInJlZmVyZW5jZWRCeSIsImJ5IiwibWFueVRvTWFueSIsInJlbGF0aW9uIiwiTWFueVRvTWFueVJlbGF0aW9uIiwibTJtR2V0IiwiY29sbGVjdGlvbiIsImdvdERhdGEiLCJnZXRNMk0iLCJsaW5rVW5saW5rZWQiLCJ2YWx1ZXMiLCJzdW0iLCJjaGFuZ2VkIiwiaW5kZXhlcyIsImluZGV4IiwicGFyc2VJbnQiLCJJTkRFWCIsImdldHRlciIsImlkcyIsIm90aGVySW5kZXgiLCJkZXNjcmliZSIsImZsYXR0ZW4iLCJtb2RlbE5hbWUiLCJpZGIiLCJmZXRjaCIsIm1haW5SZXNvdXJjZSIsImZpZWxkTmFtZSIsInRvT2JqZWN0IiwicmVzb3VyY2VOYW1lIiwiZ290UGVybWlzc2lvbnMiLCJQRVJNSVNTSU9OUyIsInNldEludGVydmFsIiwiTGlzdENhY2hlciIsImdvdEFsbCIsImNvbXBvc2l0ZUFza2VkIiwiY2FydGVzaWFuUHJvZHVjdDEiLCJiIiwiY2FydGVzaWFuUHJvZHVjdCIsImV4cGxvZGVGaWx0ZXIiLCJwcm9kdWN0IiwiciIsImZpbHRlclNpbmdsZSIsInRlc3RPbmx5IiwiZGlmZmVyZW5jZSIsImNsZWFuQ29tcG9zaXRlcyIsImZpbHRlckxlbiIsIml0ZW1zIiwiaXRlbSIsImdvdCIsInNpbmdsZSIsInNvbWUiLCJmIiwiZXhwbG9kZWQiLCJwYXJ0aWFscyIsImJhZCIsInBsdWNrIiwiYWRkIiwiZmluZCIsImdldDAiLCJnZXQxIiwiZGVsIiwibCIsImNhY2hlZFByb3BlcnR5QnlFdmVudHMiLCJwcm90byIsInByb3BlcnR5TmFtZSIsInNldHRlciIsInJlc3VsdCIsIm9ybSIsInByb3BlcnR5RGVmIiwiZ2V0IiwidmFsdWUiLCJkZWZpbmVQcm9wZXJ0eSIsIlZhbGlkYXRpb25FcnJvciIsInJlc291cmNlIiwiX3Jlc291cmNlIiwiZm9ybUlkeCIsImVycm9ycyIsImJhc2VPUk0iLCJleHRPUk0iLCJTdHJpbmciLCJjb25uZWN0ZWQiLCJ3cyIsImluZm8iLCJtZXNzYWdlIiwic2VudERhdGEiLCJ3YWl0aW5nQ29ubmVjdGlvbnMiLCJhdXRoX2dyb3VwIiwiSURYIiwiUkVWSURYIiwiYnVpbGRlckhhbmRsZXJzIiwiYnVpbGRlckhhbmRsZXJVc2VkIiwicGVyc2lzdGVudEF0dHJpYnV0ZXMiLCJldmVudEhhbmRsZXJzIiwicGVybWlzc2lvbldhaXRpbmciLCJtb2RlbENhY2hlIiwiZmFpbGVkTW9kZWxzIiwibGlua2VyIiwidmFsaWRhdGlvbkV2ZW50IiwiY3VycmVudENvbnRleHQiLCJzYXZpbmdFcnJvckhhbmxkZXIiLCJnZXRJbmRleCIsImdldFVubGlua2VkIiwiVU5MSU5LRUQiLCJQZXJtaXNzaW9uVGFibGUiLCJrbGFzcyIsInNhdmUiLCJjYiIsIm15UGVybXMiLCJncm91cF9pZCIsInBlcm1pc3Npb25MaXN0IiwicCIsInBlcm1zIiwiYWxsUGVybWlzc2lvbnMiLCJpbmRleE9mIiwibWFrZU1vZGVsQ2xhc3MiLCJfbW9kZWwiLCJwcml2YXRlQXJncyIsIm1lcmdlIiwiZnVuY1N0cmluZyIsIktsYXNzIiwicmVmX3RyYW5zbGF0aW9ucyIsImludmVyc2VfcmVmZXJlbmNlcyIsInJlZmVyZW50cyIsImZpZWxkc09yZGVyIiwiZmllbGRPcmRlciIsInJlcHJlc2VudGF0aW9uIiwiZGVsZXRlIiwiX3Blcm1pc3Npb25zIiwiYWxsX3Blcm1zIiwib2JqZWN0X2lkIiwiZ3JvdXBlZCIsInVua25vd25fZ3JvdXBzIiwiZ3JvdXBCeSIsIm8iLCJhc1JhdyIsIklEIiwiYXJnIiwid3JpdGFibGUiLCJjb250ZXh0IiwiY29weSIsIm9iaiIsImFzciIsImNvbmNhdCIsInNhdmVNdWx0aSIsIm9iamVjdHMiLCJzY29wZSIsInJhdyIsImRlbGV0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsInNhdmVQQSIsIlQiLCJvbyIsIlBBIiwiRnMiLCJmaWVsZElkeCIsInRhcCIsImluZGV4QnkiLCJyZWYiLCJleHRfcmVmIiwibG9jYWxfcmVmIiwiVHlwZUVycm9yIiwicmV2SW5kZXgiLCJoYXNPd25Qcm9wZXJ0eSIsIiRsb2ciLCJxdWVyeSIsImZpcnN0Iiwib21vZGVsTmFtZSIsInJlYWRhYmxlIiwidmFsaWRhdG9ycyIsInVubGlua1JlZmVyZW5jZSIsImluc3RhbmNlIiwiaW5zdGFuY2VzIiwib21vZGVsIiwibGlua1JlZmVyZW5jZSIsInJlZnMiLCJJTkRFWF9NMk0iLCJXMlBfUE9TVCIsIl9leHRyYSIsIlRPT05FIiwiVE9NQU5ZIiwiTUFOWVRPTUFOWSIsIm1vZGVsQ2xhc3MiLCJ6aXAiLCJkZWxldGVkIiwiTVBBIiwicmVjb3JkIiwiaXRhYiIsInRhYmxlIiwiaWsiLCJubmV3IiwidXBkYXRlZCIsIm5ld09iamVjdHMiLCJvbGRJdGVtIiwib2xkQ29weSIsIm5ld0l0ZW0iLCJubyIsInRvdGFsUmVzdWx0cyIsInVkeCIsIkFTS0VEX1VOTElOS0VEIiwiQVNLRURfTTJNIiwiTUlEWCIsImdvdE0yTSIsInJvdyIsIm0iLCJ2ZXJiIiwidG9nZXRoZXIiLCJzZW5kRGF0YSIsIkdPVF9BTEwiLCJnb3RNb2RlbCIsImNhY2hlS2V5IiwibW9kZWxOb3RGb3VuZCIsImFkZE1vZGVsSGFuZGxlciIsImFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiYXR0cmlidXRlcyIsImFkZFByb3BlcnR5IiwidmFsIiwia2F0dHIiLCJzZXQiLCJhdHRycyIsIm5ld0F0dHJzIiwiaXNDb25uZWN0ZWQiLCJmaWx0ZXJGdW5jdGlvbiIsInJlV2hlZWxPUk0iLCJsb2dpbkZ1bmMiLCIkb3JtIiwiZ2V0TW9kZWwiLCJtb2ROYW1lIiwicmVsYXRlZCJdLCJtYXBwaW5ncyI6Ijs7O0lBQUEsYTtJQUVBLFNBQUFBLE9BQUEsR0FBQTtBQUFBLFFBQ0EsS0FBQUMsUUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLFFBRUEsS0FBQUMsV0FBQSxHQUFBLEVBQUEsQ0FGQTtBQUFBLEs7SUFHQSxDO0lBRUFGLE9BQUEsQ0FBQUcsU0FBQSxDQUFBQyxVQUFBLEdBQUEsVUFBQUMsT0FBQSxFQUFBO0FBQUEsUUFDQSxJQUFBQyxVQUFBLEdBQUFDLEtBQUEsQ0FBQUMsSUFBQSxDQUFBSCxPQUFBLENBQUFJLFFBQUEsRUFBQSxDQUFBLENBREE7QUFBQSxRQUVBLElBQUEsQ0FBQSxDQUFBSCxVQUFBLElBQUEsS0FBQUosV0FBQSxDQUFBLEVBQUE7QUFBQSxZQUNBLEtBQUFBLFdBQUEsQ0FBQUksVUFBQSxJQUFBRCxPQUFBLENBREE7QUFBQSxZQUVBLEtBQUFKLFFBQUEsQ0FBQVMsSUFBQSxDQUFBTCxPQUFBLEVBRkE7QUFBQSxTQUZBO0FBQUEsS0FBQSxDO0lBT0FMLE9BQUEsQ0FBQUcsU0FBQSxDQUFBUSxNQUFBLEdBQUEsWUFBQTtBQUFBLFFBQ0EsSUFBQUMsSUFBQSxHQUFBQyxLQUFBLENBQUFWLFNBQUEsQ0FBQVcsS0FBQSxDQUFBQyxJQUFBLENBQUFDLFNBQUEsRUFB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b24gSGFuZGxlcigpe1xuICAgIHRoaXMuaGFuZGxlcnMgPSBbXTtcbiAgICB0aGlzLnN0ckhhbmRsZXJzID0ge307XG59O1xuXG5IYW5kbGVyLnByb3RvdHlwZS5hZGRIYW5kbGVyID0gZnVuY3Rpb24gKGhhbmRsZXIpe1xuICAgIHZhciBzdHJIYW5kbGVyID0gdXRpbHMuaGFzaChoYW5kbGVyLnRvU3RyaW5nKCkpO1xuICAgIGlmICghKHN0ckhhbmRsZXIgaW4gdGhpcy5zdHJIYW5kbGVycykpe1xuICAgICAgICB0aGlzLnN0ckhhbmRsZXJzW3N0ckhhbmRsZXJdID0gaGFuZGxlcjtcbiAgICAgICAgdGhpcy5oYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH1cbn07XG5IYW5kbGVyLnByb3RvdHlwZS5oYW5kbGUgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDApO1xuICAgIHRoaXMuaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihmdW5jKXtcbiAgICAgICAgZnVuYy5hcHBseShudWxsLGFyZ3MpO1xuICAgIH0pXG59O1xuSGFuZGxlci5wcm90b3R5cGUuaGFuZGxlQnkgPSBmdW5jdGlvbigpe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO1xuICAgIHZhciB0aHMgPSBhcmd1bWVudHNbMF07XG4gICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICBmdW5jLmFwcGx5KHRocyxhcmdzKTtcbiAgICB9KVxufTtcblxuXG5mdW5jdGlvbiBOYW1lZEV2ZW50TWFuYWdlciAoKXtcbiAgICB2YXIgZXZlbnRzID0ge307XG4gICAgdmFyIGhhbmRsZXJJZCA9IHt9O1xuICAgIHZhciBpZHhJZCA9IDA7XG4gICAgdGhpcy5vbiA9IGZ1bmN0aW9uKG5hbWUsIGZ1bmMpe1xuICAgICAgICBpZiAoIShuYW1lIGluIGV2ZW50cykpe1xuICAgICAgICAgICAgZXZlbnRzW25hbWVdID0gbmV3IEFycmF5KCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkID0gaWR4SWQgKys7XG4gICAgICAgIGV2ZW50c1tuYW1lXS5wdXNoKGZ1bmMpO1xuICAgICAgICBoYW5kbGVySWRbaWRdID0gZnVuYztcbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH07XG4gICAgdGhpcy5lbWl0ID0gZnVuY3Rpb24obmFtZSl7XG4gICAgICAgIGlmIChuYW1lIGluIGV2ZW50cyl7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKTtcbiAgICAgICAgICAgIGV2ZW50c1tuYW1lXS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgICAgICAgICBldmVudC5hcHBseShudWxsLGFyZ3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMudW5iaW5kID0gZnVuY3Rpb24oaGFuZGxlcil7XG4gICAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICAgIGlmIChoYW5kbGVyIGluIGhhbmRsZXJJZCl7XG4gICAgICAgICAgICB2YXIgZnVuYyA9IGhhbmRsZXJJZFtoYW5kbGVyICsgJyddO1xuICAgICAgICAgICAgTGF6eShldmVudHMpLmVhY2goZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgbiBpbiB2KXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZbbl0gPT09IGZ1bmMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWR4LnB1c2gobik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlkeC5yZXZlcnNlKCkuZm9yRWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgdi5zcGxpY2UoeCwxKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBoYW5kbGVySWRbaGFuZGxlcl07XG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICB9O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2FjaGVkS2V5SWR4ID0gMDtcblxudmFyICRQT1NUID0gZnVuY3Rpb24odXJsLCBkYXRhLCBjYWxsQmFjaywgZXJyb3JCYWNrLGhlYWRlcnMpe1xuICAgIHZhciBvcHRzID0ge1xuICAgICAgICBhY2NlcHRzIDogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICB1cmwgOiB1cmwsXG4gICAgICAgIGRhdGEgOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgZGF0YVR5cGUgOiAnanNvbicsXG4gICAgICAgIHN1Y2Nlc3MgOiBjYWxsQmFjayxcbiAgICAgICAgZXJyb3IgOiBlcnJvckJhY2ssXG4gICAgICAgIG1ldGhvZCA6ICdQT1NUJyxcbiAgICAgICAgY29udGVudFR5cGUgOiAnYXBwbGljYXRpb24vanNvbidcbiAgICB9O1xuICAgIGlmIChoZWFkZXJzKXtcbiAgICAgICAgb3B0cy5oZWFkZXJzID0gaGVhZGVycztcbiAgICAgICAgb3B0cy5jcm9zc0RvbWFpbiA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiAkLmFqYXgob3B0cyk7XG59XG5cbmZ1bmN0aW9uIHJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBnZXRMb2dpbil7XG4gICAgLy8gbWFpbiBcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5nZXRMb2dpbiA9IGdldExvZ2luO1xuICAgIHRoaXMuZXZlbnRzID0gbmV3IE5hbWVkRXZlbnRNYW5hZ2VyKClcbiAgICB0aGlzLiRQT1NUID0gJFBPU1QuYmluZCh0aGlzKTtcbiAgICB0aGlzLm9wdGlvbnMgPSB7ZW5kUG9pbnQgOiBlbmRQb2ludH07XG4gICAgdGhpcy5vbiA9IHRoaXMuZXZlbnRzLm9uLmJpbmQodGhpcyk7XG59O1xucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLnN0YXR1cyA9IGZ1bmN0aW9uKGNhbGxCYWNrLCBmb3JjZSl7XG4gICAgaWYgKCgnbGFzdFJXVFN0YXR1cycgaW4gbG9jYWxTdG9yYWdlKSAmJiAhZm9yY2UpIHtcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgdmFyIHN0YXR1cyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMpO1xuICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBzdGF0dXMpeyB0aGlzLm9wdGlvbnNbeF0gPSBzdGF0dXNbeF07IH1cbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdGF0dXMoY2FsbEJhY2ssIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYWxsQmFjayAmJiBjYWxsQmFjayhzdGF0dXMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fc3RhdHVzX2NhbGxpbmcpe1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLnN0YXR1cyhjYWxsQmFjayk7XG4gICAgICAgIH0sNTApO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy50aW1lc3RhbXApe1xuICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayh0aGlzLm9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXR1c19jYWxsaW5nID0gdHJ1ZTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdCgnYXBpL3N0YXR1cycsbnVsbCxmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMgPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xuICAgICAgICAgICAgc2VsZi5fc3RhdHVzX2NhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gc3RhdHVzKXsgc2VsZi5vcHRpb25zW3hdID0gc3RhdHVzW3hdOyB9XG4gICAgICAgICAgICBpZiAoIXN0YXR1cy51c2VyX2lkICYmIHNlbGYuZ2V0TG9naW4pe1xuICAgICAgICAgICAgICAgIHZhciBsb2dJbmZvID0gc2VsZi5nZXRMb2dpbigpO1xuICAgICAgICAgICAgICAgIGlmIChsb2dJbmZvLmNvbnN0cnVjdG9yID09PSBPYmplY3Qpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmxvZ2luKGxvZ0luZm8udXNlcm5hbWUsIGxvZ0luZm8ucGFzc3dvcmQpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciB4IGluIHN0YXR1cyl7IHNlbGYub3B0aW9uc1t4XSA9IHN0YXR1c1t4XTsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmxhc3RSV1RTdGF0dXMgPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soc2VsZi5vcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7ICAgICAgICBcbiAgICB9XG59O1xuXG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuJHBvc3QgPSBmdW5jdGlvbih1cmwsIGRhdGEsY2FsbEJhY2spe1xuICAgIHZhciB0aHMgPSB0aGlzO1xuICAgIGlmICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnRva2VuKXtcbiAgICAgICAgaWYgKCFkYXRhKXtcbiAgICAgICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnRva2VuKXtcbiAgICAgICAgdmFyIGhlYWRlcnMgPSB7IFxuICAgICAgICAgICAgdG9rZW4gOiB0aGlzLm9wdGlvbnMudG9rZW4sXG4gICAgICAgICAgICBhcHBsaWNhdGlvbiA6IHRoaXMub3B0aW9ucy5hcHBsaWNhdGlvblxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBoZWFkZXJzID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZSA9IHV0aWxzLnhkcih0aGlzLm9wdGlvbnMuZW5kUG9pbnQgKyB1cmwsIGRhdGEsIHRoaXMub3B0aW9ucy5hcHBsaWNhdGlvbiwgdGhpcy5vcHRpb25zLnRva2VuKVxuICAgICAgICAudGhlbihmdW5jdGlvbih4aHIpe1xuICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlJywgeGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cywgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZS0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMgKyAnLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB1cmwsIGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7IGNhbGxCYWNrKCB4aHIucmVzcG9uc2VEYXRhIHx8IHhoci5yZXNwb25zZVRleHQgKX07XG4gICAgICAgIH0sIGZ1bmN0aW9uKHhocikge1xuICAgICAgICAgICAgaWYgKHhoci5yZXNwb25zZURhdGEpe1xuICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItanNvbicsIHhoci5yZXNwb25zZURhdGEsIHhoci5zdGF0dXMsIHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWpzb24tJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZURhdGEsdXJsLCBkYXRhLCB4aHIpO1xuICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1odHRwJyx4aHIucmVzcG9uc2VUZXh0LCB4aHIuc3RhdHVzLHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1odHRwLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VUZXh0LHVybCxkYXRhLHhocik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xufTtcbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwYXNzd29yZCl7XG4gICAgdmFyIHVybCA9IHRoaXMub3B0aW9ucy5lbmRQb2ludCArICdhcGkvbG9naW4nO1xuICAgIHZhciBjb25uZWN0aW9uID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LHJlamVjdCl7XG4gICAgICAgIHV0aWxzLnhkcih1cmwseyB1c2VybmFtZTogdXNlcm5hbWUsIHBhc3N3b3JkIDogcGFzc3dvcmR9LCBudWxsLGNvbm5lY3Rpb24ub3B0aW9ucy50b2tlbiwgdHJ1ZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXR1cyA9IHhoci5yZXNwb25zZURhdGE7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBzdGF0dXMpeyBjb25uZWN0aW9uLm9wdGlvbnNbeF0gPSBzdGF0dXNbeF07IH1cbiAgICAgICAgICAgICAgICBhY2NlcHQoc3RhdHVzKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHhocil7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZURhdGEgfHwgcmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH0pO1xuLyogICAgICAgICQuYWpheCh7XG4vLyAgICAgICAgICAgIGhlYWRlcnMgOiBoZWFkZXJzLFxuICAgICAgICAgICAgdXJsIDogdXJsLFxuICAgICAgICAgICAgZGF0YSA6IHsgdXNlcm5hbWU6IHVzZXJuYW1lLCBwYXNzd29yZCA6IHBhc3N3b3JkfSxcbiAgICAgICAgICAgIGRhdGFUeXBlIDogJ2pzb24nLFxuICAgICAgICAgICAgbWV0aG9kIDogJ1BPU1QnLFxuLy8gICAgICAgICAgICBjb250ZW50VHlwZSA6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgIG1pbWVUeXBlIDogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgY3Jvc3NEb21haW4gOiB0cnVlLFxuICAgICAgICAgICAgc3VjY2VzcyA6IGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBzdGF0dXMpeyBjb25uZWN0aW9uLm9wdGlvbnNbeF0gPSBzdGF0dXNbeF07IH1cbiAgICAgICAgICAgICAgICBhY2NlcHQoc3RhdHVzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvciA6IGZ1bmN0aW9uKHhocixkYXRhLCBzdGF0dXMpe1xuICAgICAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VKU09OKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuKi9cbiAgICB9KTtcbn07XG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKGNhbGxCYWNrKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHdzY29ubmVjdCA9IGZ1bmN0aW9uKHNlbGYpe1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbiA9IG5ldyB1dGlscy53c0Nvbm5lY3Qoc2VsZi5vcHRpb25zKTtcbiAgICAgICAgc2VsZi53c0Nvbm5lY3Rpb24ub25Db25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBzZWxmLmV2ZW50cy5lbWl0KCd3cy1jb25uZWN0ZWQnLCBzZWxmLndzQ29ubmVjdGlvbik7XG4gICAgICAgIH0pO1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbi5vbkRpc2Nvbm5lY3QoZnVuY3Rpb24oKXsgXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgd3Njb25uZWN0KHNlbGYpOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0sMTAwMCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnN0YXR1cyhmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICBpZiAoJ3Rva2VuJyBpbiBzZWxmLm9wdGlvbnMpe1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW5nIHRvICcgKyBzZWxmLm9wdGlvbnMuZW5kUG9pbnQpO1xuICAgICAgICAgICAgaWYgKHNlbGYub3B0aW9ucy51c2VybmFtZSAmJiBzZWxmLm9wdGlvbnMucGFzc3dvcmQpe1xuICAgICAgICAgICAgICAgIHNlbGYubG9naW4oXG4gICAgICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucy51c2VybmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLnBhc3N3b3JkLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3JlbmV3aW5nIGNvbm5lY3Rpb24nKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdGF0dXMudG9rZW4gJiYgc3RhdHVzLnJlYWx0aW1lRW5kUG9pbnQgJiYgKCFzZWxmLndzQ29ubmVjdGlvbikpe1xuICAgICAgICAgICAgd3Njb25uZWN0KHNlbGYpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG52YXIgdXRpbHMgPSB7XG4gICAgcmVuYW1lRnVuY3Rpb24gOiBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgICAgICAgcmV0dXJuIChuZXcgRnVuY3Rpb24oXCJyZXR1cm4gZnVuY3Rpb24gKGNhbGwpIHsgcmV0dXJuIGZ1bmN0aW9uIFwiICsgbmFtZSArXG4gICAgICAgICAgICBcIiAoKSB7IHJldHVybiBjYWxsKHRoaXMsIGFyZ3VtZW50cykgfTsgfTtcIikoKSkoRnVuY3Rpb24uYXBwbHkuYmluZChmbikpO1xuICAgIH0sXG4gICAgY2FjaGVkIDogZnVuY3Rpb24oZnVuYywga2V5KXtcbiAgICAgICAgaWYgKCFrZXkpeyAgICBcbiAgICAgICAgICAgIGtleSA9ICdfJyArIGNhY2hlZEtleUlkeCsrO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHdyYXBwZXIoKXtcbiAgICAgICAgICAgIGlmICghdGhpc1trZXldKXtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBmdW5jLmNhbGwodGhpcyxbYXJndW1lbnRzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpc1trZXldO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gd3JhcHBlcjtcbiAgICB9LFxuICAgICRQT1NUIDogJFBPU1QsXG4gICAgcmVXaGVlbENvbm5lY3Rpb246IHJlV2hlZWxDb25uZWN0aW9uLFxuICAgIGxvZzogZnVuY3Rpb24oKXsgXG4gICAgICAgIGNvbnNvbGUubG9nKGFyZ3VtZW50cyk7XG4gICAgfSxcblxuICAgIHhkcjogZnVuY3Rpb24gKHVybCwgZGF0YSwgYXBwbGljYXRpb24sdG9rZW4sIGZvcm1FbmNvZGUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ha2UgYW4gSFRUUCBSZXF1ZXN0IGFuZCByZXR1cm4gaXRzIHByb21pc2UuXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciByZXE7XG4gICAgICAgICAgICBpZiAoIWRhdGEpIHsgZGF0YSA9IHt9O31cblxuICAgICAgICAgICAgaWYoWE1MSHR0cFJlcXVlc3QpIHtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZURhdGEgPSBKU09OLnBhcnNlKHJlcS5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoYSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2UgPSB7cmVzcG9uc2VEYXRhOiByZXNwb25zZURhdGEsIHJlc3BvbnNlVGV4dDogcmVxLnJlc3BvbnNlVGV4dCxzdGF0dXM6IHJlcS5zdGF0dXNUZXh0LCByZXF1ZXN0OiByZXF9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlcS5zdGF0dXMgPj0gMjAwICYmIHJlcS5zdGF0dXMgPCA0MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihYRG9tYWluUmVxdWVzdCl7XG4gICAgICAgICAgICAgICAgcmVxID0gbmV3IFhEb21haW5SZXF1ZXN0KCk7XG4gICAgICAgICAgICAgICAgcmVxLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBhY2NlcHQocmVxLnJlc3BvbnNlVGV4dCxyZXEuc3RhdHVzVGV4dCwgcmVxKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdDT1JTIG5vdCBzdXBwb3J0ZWQnKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlcS5vcGVuKCdQT1NUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgICAgIHJlcS5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICAgIGlmICh0b2tlbikgeyBkYXRhLl9fdG9rZW5fXyA9IHRva2VuIH1cbiAgICAgICAgICAgIGlmICghZm9ybUVuY29kZSl7XG4gICAgICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ3RleHQvcGxhaW4nKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5zaXplKCk/SlNPTi5zdHJpbmdpZnkoZGF0YSk6Jyc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKTtcbiAgICAgICAgICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBrICsgJz0nICsgZW5jb2RlVVJJKHYudG9TdHJpbmcoKSk7ICBcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCkuam9pbignJicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVxLnNlbmQoZGF0YSk7XG4gICAgLy8gICAgICAgIHJlcS5zZW5kKG51bGwpO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgY2FwaXRhbGl6ZSA6IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHJldHVybiBzWzBdLnRvVXBwZXJDYXNlKCkgKyBzLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgfSxcblxuICAgIGhhc2ggOiBmdW5jdGlvbihzdHIpe1xuICAgICAgICAvKipcbiAgICAgICAgICogSGFzaGVkIGZ1bmN0aW9uXG4gICAgICAgICAqL1xuICAgICAgICBzdHIgPSBzdHIudG9TdHJpbmcoKTtcbiAgICAgICAgdmFyIHJldCA9IDE7XG4gICAgICAgIGZvciAodmFyIHggPSAwO3g8c3RyLmxlbmd0aDt4Kyspe1xuICAgICAgICAgICAgcmV0ICo9ICgxICsgc3RyLmNoYXJDb2RlQXQoeCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAocmV0ICUgMzQ5NTgzNzQ5NTcpLnRvU3RyaW5nKCk7XG4gICAgfSxcblxuICAgIG1ha2VGaWx0ZXIgOiBmdW5jdGlvbiAobW9kZWwsIGZpbHRlciwgdW5pZmllciwgZG9udFRyYW5zbGF0ZUZpbHRlcikge1xuICAgICAgICAvKipcbiAgICAgICAgICogTWFrZSBmaWx0ZXIgZm9yIEFycmF5LmZpbHRlciBmdW5jdGlvbiBhcyBhbiBhbmQgb2Ygb3JcbiAgICAgICAgICovXG4gICAgICAgIGlmICghdW5pZmllcikgeyB1bmlmaWVyID0gJyAmJiAnO31cbiAgICAgICAgaWYgKExhenkoZmlsdGVyKS5zaXplKCkgPT09IDApe1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHgpeyByZXR1cm4gdHJ1ZSB9O1xuICAgICAgICB9XG4gICAgICAgIHZhciBzb3VyY2UgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHZhbHMsIGZpZWxkKXtcbiAgICAgICAgICAgIGlmICghdmFscykgeyB2YWxzID0gW251bGxdfVxuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHMpKXtcbiAgICAgICAgICAgICAgICB2YWxzID0gW3ZhbHNdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFkb250VHJhbnNsYXRlRmlsdGVyICYmIChtb2RlbC5maWVsZHNbZmllbGRdLnR5cGUgPT09ICdyZWZlcmVuY2UnKSkge1xuICAgICAgICAgICAgICAgIGZpZWxkID0gJ18nICsgZmllbGQ7XG4gICAgICAgICAgICAgICAgdmFscyA9IExhenkodmFscykubWFwKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoeCAmJiAoeC5jb25zdHJ1Y3RvciAhPT0gTnVtYmVyKSl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5pZDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtb2RlbC5maWVsZHNbZmllbGRdLnR5cGUgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgICAgICAgICB2YWxzID0gdmFscy5tYXAoSlNPTi5zdHJpbmdpZnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICcoJyArICBMYXp5KHZhbHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyh4LicgKyBmaWVsZCArICcgPT09ICcgKyB4ICsgJyknO1xuICAgICAgICAgICAgfSkuam9pbignIHx8ICcpICArJyknO1xuICAgICAgICB9KS50b0FycmF5KCkuam9pbih1bmlmaWVyKTtcbiAgICAgICAgcmV0dXJuIG5ldyBGdW5jdGlvbihcInhcIiwgXCJyZXR1cm4gXCIgKyBzb3VyY2UpO1xuICAgIH0sXG5cbiAgICBzYW1lQXMgOiBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogRGVlcCBlcXVhbFxuICAgICAgICAgKi9cbiAgICAgICAgZm9yICh2YXIgayBpbiB4KSB7XG4gICAgICAgICAgICBpZiAoeVtrXSAhPSB4W2tdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cblxuICAgIHdzQ29ubmVjdCA6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb25uZWN0cyBhIHdlYnNvY2tldCB3aXRoIHJlV2hlZWwgY29ubmVjdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgaWYoIW9wdGlvbnMpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIHJlZ2lzdGVyaW5nIGFsbCBldmVudCBoYW5kbGVyc1xuXG4gICAgICAgIHRoaXMuaGFuZGxlcnMgPSB7XG4gICAgICAgICAgICB3aXphcmQgOiBuZXcgSGFuZGxlcigpLFxuICAgICAgICAgICAgb25Db25uZWN0aW9uIDogbmV3IEhhbmRsZXIoKSxcbiAgICAgICAgICAgIG9uRGlzY29ubmVjdGlvbiA6IG5ldyBIYW5kbGVyKCksXG4gICAgICAgICAgICBvbk1lc3NhZ2VKc29uIDogbmV3IEhhbmRsZXIoKSxcbiAgICAgICAgICAgIG9uTWVzc2FnZVRleHQgOiBuZXcgSGFuZGxlcigpXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vbldpemFyZCA9IHRoaXMuaGFuZGxlcnMud2l6YXJkLmFkZEhhbmRsZXIuYmluZCh0aGlzLmhhbmRsZXJzLndpemFyZCk7XG4gICAgICAgIHRoaXMub25Db25uZWN0ID0gdGhpcy5oYW5kbGVycy5vbkNvbm5lY3Rpb24uYWRkSGFuZGxlci5iaW5kKHRoaXMuaGFuZGxlcnMub25Db25uZWN0aW9uKTtcbiAgICAgICAgdGhpcy5vbkRpc2Nvbm5lY3QgPSB0aGlzLmhhbmRsZXJzLm9uRGlzY29ubmVjdGlvbi5hZGRIYW5kbGVyLmJpbmQodGhpcy5oYW5kbGVycy5vbkRpc2Nvbm5lY3Rpb24pO1xuICAgICAgICB0aGlzLm9uTWVzc2FnZUpzb24gPSB0aGlzLmhhbmRsZXJzLm9uTWVzc2FnZUpzb24uYWRkSGFuZGxlci5iaW5kKHRoaXMuaGFuZGxlcnMub25NZXNzYWdlSnNvbik7XG4gICAgICAgIHRoaXMub25NZXNzYWdlVGV4dCA9IHRoaXMuaGFuZGxlcnMub25NZXNzYWdlVGV4dC5hZGRIYW5kbGVyLmJpbmQodGhpcy5oYW5kbGVycy5vbk1lc3NhZ2VUZXh0KTtcblxuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zXG5cbiAgICAgICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgU29ja0pTKG9wdGlvbnMucmVhbHRpbWVFbmRQb2ludCk7XG4gICAgICAgIGNvbm5lY3Rpb24ub25vcGVuID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvcGVuIDogJyArIHgpO1xuICAgICAgICAgICAgY29ubmVjdGlvbi50ZW5hbnQoKTtcbiAgICAgICAgICAgIHNlbGYuaGFuZGxlcnMub25Db25uZWN0aW9uLmhhbmRsZSh4KTtcbiAgICAgICAgfTtcbiAgICAgICAgY29ubmVjdGlvbi5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgaWYgKHgudHlwZSA9PSAnbWVzc2FnZScpIHtcbiAgICAgICAgICAgICAgICAvLyQubm90aWZ5KHguZGF0YSk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIHNldCBmcm9tUmVhbHRpbWVcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5oYW5kbGVycy5vbk1lc3NhZ2VKc29uLmhhbmRsZShKU09OLnBhcnNlKHguZGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gdW5zZXQgZnJvbVJlYWx0aW1lXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuaGFuZGxlcnMub25NZXNzYWdlVGV4dC5oYW5kbGUoeC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBjb25uZWN0aW9uLm9uY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KHV0aWxzLndzQ29ubmVjdCwxMDAwKTtcbiAgICAgICAgICAgIHNlbGYuaGFuZGxlcnMub25EaXNjb25uZWN0aW9uLmhhbmRsZSgpO1xuICAgICAgICB9O1xuICAgICAgICBjb25uZWN0aW9uLnRlbmFudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24uc2VuZCgnVEVOQU5UOicgKyBzZWxmLm9wdGlvbnMuYXBwbGljYXRpb24gKyAnOicgKyBzZWxmLm9wdGlvbnMudG9rZW4pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHBsdXJhbGl6ZSA6IGZ1bmN0aW9uKHN0ciwgbW9kZWwpe1xuICAgICAgICAvKipcbiAgICAgICAgICogTGV4aWNhbGx5IHJldHVybnMgZW5nbGlzaCBwbHVyYWwgZm9ybVxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIHN0ciArICdzJztcbiAgICB9LFxuXG4gICAgYmVmb3JlQ2FsbCA6IGZ1bmN0aW9uKGZ1bmMsIGJlZm9yZSl7XG4gICAgICAgIHZhciBkZWNvcmF0b3IgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgYmVmb3JlKCkudGhlbihmdW5jKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZGVjb3JhdG9yO1xuICAgIH0sXG5cbiAgICBjbGVhblN0b3JhZ2UgOiBmdW5jdGlvbigpe1xuICAgICAgICAvKipcbiAgICAgICAgICogQ2xlYW4gbG9jYWxTdG9yYWdlIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgTGF6eShsb2NhbFN0b3JhZ2UpLmtleXMoKS5lYWNoKGZ1bmN0aW9uKGspe1xuICAgICAgICAgICAgZGVsZXRlIGxvY2FsU3RvcmFnZVtrXTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIHJldmVyc2UgOiBmdW5jdGlvbiAoY2hyLCBzdHIpIHtcbiAgICAgICAgcmV0dXJuIHN0ci5zcGxpdChjaHIpLnJldmVyc2UoKS5qb2luKGNocik7XG4gICAgfSxcbiAgICBwZXJtdXRhdGlvbnM6IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgeCA9IGFyci5sZW5ndGgtMTsgeCA+PSAwO3gtLSl7XG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gYXJyLmxlbmd0aC0xOyB5ID49IDA7IHktLSl7XG4gICAgICAgICAgICAgICAgaWYgKHggIT09IHkpXG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKFthcnJbeF0sIGFyclt5XV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcblxuICAgIGJvb2w6IEJvb2xlYW4sXG5cbiAgICBub29wIDogZnVuY3Rpb24oKXt9LFxuXG4gICAgdHpPZmZzZXQ6IG5ldyBEYXRlKCkuZ2V0VGltZXpvbmVPZmZzZXQoKSAqIDYwMDAwXG59O1xuXG5cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVG91Y2hlcigpe1xuICAgIHZhciB0b3VjaGVkID0gZmFsc2VcbiAgICB0aGlzLnRvdWNoID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdG91Y2hlZCA9IHRydWU7XG4gICAgfTtcbiAgICB0aGlzLnRvdWNoZWQgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdCA9IHRvdWNoZWQ7XG4gICAgICAgIHRvdWNoZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHQ7XG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5cbmZ1bmN0aW9uIFZhY3V1bUNhY2hlcih0b3VjaCwgYXNrZWQsIG5hbWUpe1xuLypcbiAgICBpZiAobmFtZSl7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnY3JlYXRlZCBWYWN1dW1DYWNoZXIgYXMgJyArIG5hbWUpO1xuICAgIH1cbiovXG4gICAgaWYgKCFhc2tlZCl7XG4gICAgICAgIHZhciBhc2tlZCA9IFtdO1xuICAgIH1cbiAgICB2YXIgbWlzc2luZyA9IFtdO1xuICAgIFxuICAgIHRoaXMuYXNrID0gZnVuY3Rpb24gKGlkLGxhenkpe1xuICAgICAgICBpZiAoIUxhenkoYXNrZWQpLmNvbnRhaW5zKGlkKSl7XG4vLyAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnYXNraW5nICgnICsgaWQgKyAnKSBmcm9tICcgKyBuYW1lKTtcbiAgICAgICAgICAgIG1pc3NpbmcucHVzaChpZCk7XG4gICAgICAgICAgICBpZiAoIWxhenkpXG4gICAgICAgICAgICAgICAgYXNrZWQucHVzaChpZCk7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICB9IFxuLy8gICAgICAgIGVsc2UgY29uc29sZS53YXJuKCcoJyArIGlkICsgJykgd2FzIGp1c3QgYXNrZWQgb24gJyArIG5hbWUpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEFza2VkSW5kZXggPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gYXNrZWQ7XG4gICAgfVxuXG4gICAgdGhpcy5taXNzaW5ncyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBMYXp5KG1pc3Npbmcuc3BsaWNlKDAsbWlzc2luZy5sZW5ndGgpKS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgfVxufVxuIiwiZnVuY3Rpb24gQXV0b0xpbmtlcihldmVudHMsIGFjdGl2ZXMsIElEQiwgVzJQUkVTT1VSQ0UsIGxpc3RDYWNoZSl7XG4gICAgdmFyIHRvdWNoID0gbmV3IFRvdWNoZXIoKTtcbiAgICB2YXIgbWFpbkluZGV4ID0ge307XG4gICAgdmFyIGZvcmVpZ25LZXlzID0ge307XG4gICAgdmFyIG0ybSA9IHt9O1xuICAgIHZhciBtMm1JbmRleCA9IHt9O1xuICAgIHZhciBwZXJtaXNzaW9ucyA9IHt9O1xuICAgIHRoaXMubWFpbkluZGV4ID0gbWFpbkluZGV4O1xuICAgIHRoaXMuZm9yZWlnbktleXMgPSBmb3JlaWduS2V5cztcbiAgICB0aGlzLm0ybSA9IG0ybTtcbiAgICB0aGlzLm0ybUluZGV4ID0gbTJtSW5kZXg7XG4gICAgdGhpcy5wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zO1xuXG4gICAgZXZlbnRzLm9uKCdtb2RlbC1kZWZpbml0aW9uJyxmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgIC8vIGRlZmluaW5nIGFsbCBpbmRleGVzIGZvciBwcmltYXJ5IGtleVxuICAgICAgICB2YXIgcGtJbmRleCA9IGxpc3RDYWNoZS5nZXRJbmRleEZvcihtb2RlbC5uYW1lLCAnaWQnKTtcbiAgICAgICAgbWFpbkluZGV4W21vZGVsLm5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgcGtJbmRleCwgJ21haW5JbmRleC4nICsgbW9kZWwubmFtZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGluZyBwZXJtaXNzaW9uIGluZGV4ZXNcbiAgICAgICAgcGVybWlzc2lvbnNbbW9kZWwubmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsICdwZXJtaXNzaW9ucy4nICsgbW9kZWwubmFtZSk7XG5cbiAgICAgICAgLy8gY3JlYXRpbmcgaW5kZXhlcyBmb3IgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbihyZWZlcmVuY2Upe1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsLm5hbWUgKyAnXycgKyByZWZlcmVuY2UuaWQ7XG4gICAgICAgICAgICBmb3JlaWduS2V5c1tpbmRleE5hbWVdID0gbmV3IFZhY3V1bUNhY2hlcih0b3VjaCwgbGlzdENhY2hlLmdldEluZGV4Rm9yKHJlZmVyZW5jZS50bywgJ2lkJyksIHJlZmVyZW5jZS50byArICcuaWQgZm9yZWlnbktleXMuJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBjcmVhdGluZyByZXZlcnNlIGZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZWRCeSkuZWFjaChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gZmllbGQuYnkgKyAnLicgKyBmaWVsZC5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IoZmllbGQuYnksZmllbGQuaWQpLCBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkICsgJyBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIExhenkobW9kZWwubWFueVRvTWFueSkuZWFjaChmdW5jdGlvbihyZWxhdGlvbil7XG4gICAgICAgICAgICBpZiAoIShyZWxhdGlvbi5pbmRleE5hbWUgaW4gbTJtKSlcbiAgICAgICAgICAgICAgICBtMm1bcmVsYXRpb24uaW5kZXhOYW1lXSA9IFtuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsJ20ybS4nICsgcmVsYXRpb24uaW5kZXhOYW1lICsgJ1swXScpLCBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLG51bGwsJ20ybS4nICsgcmVsYXRpb24uaW5kZXhOYW1lKydbMV0nKV07XG4gICAgICAgICAgICBpZiAoIShyZWxhdGlvbi5pbmRleE5hbWUgaW4gbTJtSW5kZXgpKVxuICAgICAgICAgICAgICAgIG0ybUluZGV4W3JlbGF0aW9uLmluZGV4TmFtZV0gPSBuZXcgTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIG0ybUdldCA9IGZ1bmN0aW9uKGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgY2FsbEJhY2spe1xuICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCgobiA/IHV0aWxzLnJldmVyc2UoJy8nLCBpbmRleE5hbWUpIDogaW5kZXhOYW1lKSArICdzJyArICcvbGlzdCcsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW2luZGV4TmFtZV1cbiAgICAgICAgfSk7ICAgICAgICBcbiAgICB9O1xuXG4gICAgdmFyIGdldE0yTSA9IGZ1bmN0aW9uKGluZGV4TmFtZSwgY29sbGVjdGlvbiwgbiwgY2FsbEJhY2spe1xuICAgICAgICAvLyBhc2sgYWxsIGl0ZW1zIGluIGNvbGxlY3Rpb24gdG8gbTJtIGluZGV4XG4gICAgICAgIExhenkoY29sbGVjdGlvbikuZWFjaChtMm1baW5kZXhOYW1lXVtuXS5hc2suYmluZChtMm1baW5kZXhOYW1lXVtuXSkpO1xuICAgICAgICAvLyByZW5ld2luZyBjb2xsZWN0aW9uIHdpdGhvdXQgYXNrZWRcbiAgICAgICAgY29sbGVjdGlvbiA9IG0ybVtpbmRleE5hbWVdW25dLm1pc3NpbmdzKCk7XG4gICAgICAgIC8vIGNhbGxpbmcgcmVtb3RlIGZvciBtMm0gY29sbGVjdGlvbiBpZiBhbnlcbiAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgIGFjdGl2ZXNbaW5kZXhOYW1lXSA9IDE7XG4gICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLmdldE0yTSA9IGdldE0yTTtcblxuICAgIHZhciBsaW5rVW5saW5rZWQgPSBmdW5jdGlvbigpe1xuICAgICAgICAvLyBwZXJmb3JtIGEgRGF0YUJhc2Ugc3luY2hyb25pemF0aW9uIHdpdGggc2VydmVyIGxvb2tpbmcgZm9yIHVua25vd24gZGF0YVxuICAgICAgICBpZiAoIXRvdWNoLnRvdWNoZWQoKSkgcmV0dXJuO1xuICAgICAgICBpZiAoTGF6eShhY3RpdmVzKS52YWx1ZXMoKS5zdW0oKSkge1xuICAgICAgICAgICAgdG91Y2gudG91Y2goKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihpbmRleGVzLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgTGF6eShpbmRleGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCxuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24gPSBMYXp5KGNvbGxlY3Rpb24pLmZpbHRlcihCb29sZWFuKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjb2xsZWN0aW9uLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBJTkRFWCA9IG0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBnZXR0ZXIgPSBJTkRFWFsnZ2V0JyArICgxIC0gbildLmJpbmQoSU5ERVgpO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbTJtR2V0KGluZGV4TmFtZSwgbiwgY29sbGVjdGlvbiwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gY29sbGVjdGlvbi5tYXAoZ2V0dGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgb3RoZXJJbmRleCA9IGluZGV4TmFtZS5zcGxpdCgnLycpWzEgLSBuXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShvdGhlckluZGV4LGZ1bmN0aW9uKCl7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShpZHMpLmZsYXR0ZW4oKS51bmlxdWUoKS5lYWNoKG1haW5JbmRleFtvdGhlckluZGV4XS5hc2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYWluSW5kZXhbb3RoZXJJbmRleF0uYXNrKHgsdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIExhenkobWFpbkluZGV4KS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICB2YXIgaWRzID0gaW5kZXgubWlzc2luZ3MoKTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFyIGlkYiA9IG1vZGVsTmFtZSBpbiBJREIgPyBJREJbbW9kZWxOYW1lXS5rZXlzKCkgOiBMYXp5KCk7XG4gICAgICAgICAgICAgICAgLy9sb2coJ2xpbmtpbmcuJyArIG1vZGVsTmFtZSArICcgPSAnICsgVzJQUkVTT1VSQ0UubGlua2luZy5zb3VyY2VbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lLCB7aWQ6IGlkc30sbnVsbCx1dGlscy5ub29wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEZvcmVpZ24ga2V5c1xuICAgICAgICBMYXp5KGZvcmVpZ25LZXlzKVxuICAgICAgICAubWFwKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICByZXR1cm4gW2ssIHYubWlzc2luZ3MoKV1cbiAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uKHYpe1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIGlkcyA9IHhbMV07XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0geFswXTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGluZGV4TmFtZS5zcGxpdCgnLicpO1xuICAgICAgICAgICAgdmFyIG1haW5SZXNvdXJjZSA9IGluZGV4WzBdO1xuICAgICAgICAgICAgdmFyIGZpZWxkTmFtZSA9IGluZGV4WzFdO1xuICAgICAgICAgICAgdmFyIGZpbHRlciA9IHt9O1xuICAgICAgICAgICAgZmlsdGVyW2ZpZWxkTmFtZV0gPSBpZHM7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtYWluUmVzb3VyY2UsIGZpbHRlcik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgTGF6eShMYXp5KHBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIHJldHVybiB2WzFdLmxlbmd0aFxuICAgICAgICB9KS50b09iamVjdCgpKS5lYWNoKGZ1bmN0aW9uIChpZHMsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgYWN0aXZlc1tyZXNvdXJjZU5hbWVdID0gMTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChyZXNvdXJjZU5hbWUgKyAnL215X3Blcm1zJywge2lkczogTGF6eShpZHMpLnVuaXF1ZSgpLnRvQXJyYXkoKX0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdFBlcm1pc3Npb25zKGRhdGEuUEVSTUlTU0lPTlMpO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYWN0aXZlc1tyZXNvdXJjZU5hbWVdXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzZXRJbnRlcnZhbChsaW5rVW5saW5rZWQsNTApO1xufTtcblxuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gTGlzdENhY2hlcigpe1xuICAgIHZhciBnb3RBbGwgPSB7fTtcbiAgICB2YXIgYXNrZWQgPSB7fTsgLy8gbWFwIG9mIGFycmF5XG4gICAgdmFyIGNvbXBvc2l0ZUFza2VkID0ge307XG4gICAgdmFyIGNhcnRlc2lhblByb2R1Y3QxID0gZnVuY3Rpb24oeCx5LGlzQXJyYXkpe1xuICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgIGlmIChpc0FycmF5KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhIGluIHgpe1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGIgaW4geSl7XG4gICAgICAgICAgICAgICAgICAgIHJldC5wdXNoKExhenkoW3hbYV0seVtiXV0pLmZsYXR0ZW4oKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4geCl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYiBpbiB5KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goW3hbYV0seVtiXV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH07XG4gICAgdmFyIGNhcnRlc2lhblByb2R1Y3QgPSBmdW5jdGlvbihhcnIpe1xuICAgICAgICB2YXIgaXNBcnJheSA9IGZhbHNlO1xuICAgICAgICB2YXIgcmV0ID0gYXJyWzBdOyBcbiAgICAgICAgZm9yICh2YXIgeCA9IDE7IHggPCBhcnIubGVuZ3RoOyArK3gpe1xuICAgICAgICAgICAgcmV0ID0gY2FydGVzaWFuUHJvZHVjdDEocmV0LCBhcnJbeF0sIGlzQXJyYXkpO1xuICAgICAgICAgICAgaXNBcnJheSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gICAgdmFyIGV4cGxvZGVGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgdmFyIHByb2R1Y3QgPSBjYXJ0ZXNpYW5Qcm9kdWN0KExhenkoZmlsdGVyKS52YWx1ZXMoKS50b0FycmF5KCkpO1xuICAgICAgICB2YXIga2V5cyA9IExhenkoZmlsdGVyKS5rZXlzKCkudG9BcnJheSgpO1xuICAgICAgICByZXR1cm4gcHJvZHVjdC5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICB2YXIgciA9IHt9O1xuICAgICAgICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGEsbil7XG4gICAgICAgICAgICAgICAgclthXSA9IHhbbl07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9O1xuICAgIHZhciBmaWx0ZXJTaW5nbGUgPSBmdW5jdGlvbihtb2RlbCwgZmlsdGVyLCB0ZXN0T25seSl7XG4gICAgICAgIC8vIExhenkgYXV0byBjcmVhdGUgaW5kZXhlc1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gbW9kZWwubW9kZWxOYW1lO1xuICAgICAgICB2YXIgZ2V0SW5kZXhGb3IgPSB0aGlzLmdldEluZGV4Rm9yO1xuICAgICAgICB2YXIga2V5cyA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odixrZXkpeyByZXR1cm4gW2tleSwgbW9kZWxOYW1lICsgJy4nICsga2V5XTsgfSkudG9PYmplY3QoKTtcbiAgICAgICAgdmFyIGluZGV4ZXMgPSBMYXp5KGZpbHRlcikua2V5cygpLm1hcChmdW5jdGlvbihrZXkpeyByZXR1cm4gW2tleSwgZ2V0SW5kZXhGb3IobW9kZWxOYW1lLCBrZXkpXX0pLnRvT2JqZWN0KCk7IFxuICAgICAgICAvLyBmYWtlIGZvciAoaXQgd2lsbCBjeWNsZSBvbmNlKVxuICAgICAgICBmb3IgKHZhciB4IGluIGZpbHRlcil7XG4gICAgICAgICAgICAvLyBnZXQgYXNrZWQgaW5kZXggYW5kIGNoZWNrIHByZXNlbmNlXG4gICAgICAgICAgICB2YXIgZGlmZmVyZW5jZSA9IExhenkoZmlsdGVyW3hdKS5kaWZmZXJlbmNlKGluZGV4ZXNbeF0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIGlmIChkaWZmZXJlbmNlLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgLy8gZ2VuZXJhdGUgbmV3IGZpbHRlclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBMYXp5KFtbeCwgZGlmZmVyZW5jZV1dKS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIC8vIHJlbWVtYmVyIGFza2VkXG4gICAgICAgICAgICAgICAgaWYgKCF0ZXN0T25seSlcbiAgICAgICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoaW5kZXhlc1t4XSwgZGlmZmVyZW5jZSk7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6JyArIEpTT04uc3RyaW5naWZ5KHJldCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZSBmaWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSArICdcXG5PdXQgOiBudWxsJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNsZWFuQ29tcG9zaXRlcyA9IGZ1bmN0aW9uKG1vZGVsLGZpbHRlcil7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBjbGVhbiBjb21wb3NpdGVBc2tlZFxuICAgICAgICAgKi9cbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29uZGl0aW9uYWwgYXNrZWQgaW5kZXhcbiAgICAgICAgaWYgKCEobW9kZWwubmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpIHsgY29tcG9zaXRlQXNrZWRbbW9kZWwubmFtZV0gPSBbXSB9O1xuICAgICAgICB2YXIgaW5kZXggPSBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXTtcbiAgICAgICAgLy8gc2VhcmNoIGZvciBhbGwgZWxlbWVudHMgd2hvIGhhdmUgc2FtZSBwYXJ0aWFsXG4gICAgICAgIHZhciBmaWx0ZXJMZW4gPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICB2YXIgaXRlbXMgPSBpbmRleC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnICYmICcsdHJ1ZSkpLmZpbHRlcihmdW5jdGlvbihpdGVtKXsgTGF6eShpdGVtKS5zaXplKCkgPiBmaWx0ZXJMZW4gfSk7XG4vLyAgICAgICAgY29uc29sZS5sb2coJ2RlbGV0aW5nIDonICsgSlNPTi5zdHJpbmdpZnkoaXRlbXMpKTtcbiAgICB9O1xuXG4gICAgdGhpcy5maWx0ZXIgPSBmdW5jdGlvbihtb2RlbCwgZmlsdGVyKXtcbi8vICAgICAgICBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0tLS0tXFxuZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikpO1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gbW9kZWwubW9kZWxOYW1lO1xuXG4gICAgICAgIC8vIGlmIHlvdSBmZXRjaCBhbGwgb2JqZWN0cyBmcm9tIHNlcnZlciwgdGhpcyBtb2RlbCBoYXMgdG8gYmUgbWFya2VkIGFzIGdvdCBhbGw7XG4gICAgICAgIHZhciBmaWx0ZXJMZW4gID0gTGF6eShmaWx0ZXIpLnNpemUoKTtcbiAgICAgICAgc3dpdGNoIChmaWx0ZXJMZW4pIHtcbiAgICAgICAgICAgIGNhc2UgMCA6IHtcbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gbnVsbCBvciBhbGxcbiAgICAgICAgICAgICAgICB2YXIgZ290ID0gZ290QWxsW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgZ290QWxsW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gYXNrZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYXNrZWRbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb3V0IDogbnVsbCAoZ290IGFsbCknKTtcbiAgICAgICAgICAgICAgICAvLyBjb25kaXRpb25hbCBjbGVhblxuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gY29tcG9zaXRlQXNrZWQpeyBcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChnb3QpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgMSA6IHtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gZmlsdGVyU2luZ2xlLmNhbGwodGhpcywgbW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICAgICAgY2xlYW5Db21wb3NpdGVzLmNhbGwodGhpcywgbW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdmFyIHNpbmdsZSA9IExhenkoZmlsdGVyKS5rZXlzKCkuc29tZShmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciBmID0ge307XG4gICAgICAgICAgICBmW2tleV0gPSBmaWx0ZXJba2V5XTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXJTaW5nbGUuY2FsbCh0aHMsIG1vZGVsLCBmLCB0cnVlKSA9PSBudWxsO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHNpbmdsZSkgeyByZXR1cm4gbnVsbCB9XG4gICAgICAgIC8vIGxhenkgY3JlYXRlIGNvbXBvc2l0ZUFza2VkXG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBjb21wb3NpdGVBc2tlZCkpeyBjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgLy8gZXhwbG9kZSBmaWx0ZXJcbiAgICAgICAgdmFyIGV4cGxvZGVkID0gZXhwbG9kZUZpbHRlcihmaWx0ZXIpO1xuICAgICAgICAvLyBjb2xsZWN0IHBhcnRpYWxzXG4gICAgICAgIHZhciBwYXJ0aWFscyA9IGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0uZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlciwgJyB8fCAnLHRydWUpKTtcbiAgICAgICAgLy8gY29sbGVjdCBtaXNzaW5ncyAoZXhwbG9kZWQgLSBwYXJ0aWFscylcbiAgICAgICAgaWYgKHBhcnRpYWxzLmxlbmd0aCl7XG4gICAgICAgICAgICB2YXIgYmFkICA9IFtdO1xuICAgICAgICAgICAgLy8gcGFydGlhbCBkaWZmZXJlbmNlXG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIHBhcnRpYWxzKXtcbiAgICAgICAgICAgICAgICBiYWQucHVzaC5hcHBseShiYWQsZXhwbG9kZWQuZmlsdGVyKHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIHBhcnRpYWxzW3hdLCcgJiYgJywgdHJ1ZSkpKTtcbiAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgY29uc29sZS5sb2coJ2V4cGxvZGVkIC0gcGFydGlhbCA6ICcgKyBKU09OLnN0cmluZ2lmeShiYWQpKTtcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IExhenkoZXhwbG9kZWQpLmRpZmZlcmVuY2UoYmFkKS50b0FycmF5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBleHBsb2RlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZpbHRlciBwYXJ0aWFsc1xuICAgICAgICBpZiAobWlzc2luZ3MubGVuZ3RoKXtcbiAgICAgICAgICAgIGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0ucHVzaC5hcHBseShjb21wb3NpdGVBc2tlZFttb2RlbE5hbWVdLG1pc3NpbmdzKTtcbiAgICAgICAgICAgIC8vIGFnZ3JlZ2F0ZSBtaXNzaW5nc1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gTGF6eShmaWx0ZXIpLmtleXMoKS5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gTGF6eShtaXNzaW5ncykucGx1Y2soa2V5KS51bmlxdWUoKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtrZXksIHJldC5sZW5ndGg/cmV0OmZpbHRlcltrZXldXTtcbiAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdXQgOiAnICsgSlNPTi5zdHJpbmdpZnkobWlzc2luZ3MpKTtcbiAgICAgICAgICAgIC8vIGNsZWFuIGNvbmRpdGlvbmFsXG4gICAgICAgICAgICBjbGVhbkNvbXBvc2l0ZXMobW9kZWwsIG1pc3NpbmdzKTtcbiAgICAgICAgICAgIHJldHVybiBtaXNzaW5ncztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRJbmRleEZvciA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmllbGROYW1lKXtcbiAgICAgICAgdmFyIGluZGV4TmFtZSA9IG1vZGVsTmFtZSArICcuJyArIGZpZWxkTmFtZTtcbiAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIGFza2VkKSl7XG4gICAgICAgICAgICBhc2tlZFtpbmRleE5hbWVdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFza2VkW2luZGV4TmFtZV07XG4gICAgfVxufTsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1hbnlUb01hbnlSZWxhdGlvbihyZWxhdGlvbixtMm0pe1xuICAgIHZhciBpdGVtcyA9IFtdO1xuICAgIHRoaXMuYWRkID0gaXRlbXMucHVzaC5iaW5kKGl0ZW1zKTtcbiAgICB0aGlzLmFkZCA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICBjb25zb2xlLmxvZygnYWRkaW5nICcgKyBpdGVtKTtcbiAgICAgICAgaWYgKCEoTGF6eShpdGVtcykuZmluZChpdGVtKSkpe1xuICAgICAgICAgICAgaXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZ2V0MCA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgbTJtWzFdLmFzayhpZCk7XG4gICAgICAgIHJldHVybiBMYXp5KGl0ZW1zKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICByZXR1cm4geFswXSA9PT0gaWQ7XG4gICAgICAgIH0pLnBsdWNrKFwiMVwiKS50b0FycmF5KCk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0MSA9IGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgbTJtWzBdLmFzayhpZCk7XG4gICAgICAgIHJldHVybiBMYXp5KGl0ZW1zKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICByZXR1cm4geFsxXSA9PT0gaWQ7XG4gICAgICAgIH0pLnBsdWNrKFwiMFwiKS50b0FycmF5KCk7XG4gICAgfTtcbiAgICB0aGlzWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWxhdGlvbi5pbmRleE5hbWUuc3BsaXQoJy8nKVsxXSldID0gdGhpcy5nZXQxO1xuICAgIHRoaXNbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlbGF0aW9uLmluZGV4TmFtZS5zcGxpdCgnLycpWzBdKV0gPSB0aGlzLmdldDA7XG5cbiAgICB0aGlzLmRlbCA9IGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICB2YXIgbCA9IGl0ZW1zLmxlbmd0aDtcbiAgICAgICAgdmFyIGlkeCA9IG51bGw7XG4gICAgICAgIGZvciAodmFyIGEgPSAwOyBhIDwgbDsgYSsrKXsgXG4gICAgICAgICAgICBpZiAoKGl0ZW1zW2FdWzBdID09PSBpdGVtWzBdKSAmJiAoaXRlbXNbYV1bMV0gPT09IGl0ZW1bMV0pKXtcbiAgICAgICAgICAgICAgICBpZHggPSBhO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpZHgpe1xuICAgICAgICAgICAgaXRlbXMuc3BsaWNlKGEsIDEpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdkZWxldGluZyAnLCBpdGVtKTtcbiAgICB9O1xufSIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhwcm90bywgcHJvcGVydHlOYW1lLGdldHRlciwgc2V0dGVyKXtcbiAgICB2YXIgZXZlbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDQpO1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBcbiAgICBMYXp5KGV2ZW50cykuZWFjaChmdW5jdGlvbihldmVudCl7XG4gICAgICAgIHByb3RvLm9ybS5vbihldmVudCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmVzdWx0ID0ge307XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHZhciBwcm9wZXJ0eURlZiA9IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBjYWNoZWQoKXtcbiAgICAgICAgICAgIGlmICghKHRoaXMuaWQgaW4gcmVzdWx0KSl7XG4gICAgICAgICAgICAgICAgcmVzdWx0W3RoaXMuaWRdID0gZ2V0dGVyLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0W3RoaXMuaWRdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpZiAoc2V0dGVyKXtcbiAgICAgICAgcHJvcGVydHlEZWZbJ3NldCddID0gZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9PSByZXN1bHRbdGhpcy5pZF0pe1xuICAgICAgICAgICAgICAgIHNldHRlci5jYWxsKHRoaXMsdmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlkIGluIHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHRbdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgcHJvcGVydHlOYW1lLHByb3BlcnR5RGVmKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKGRhdGEpe1xuICAgIHRoaXMucmVzb3VyY2UgPSBkYXRhLl9yZXNvdXJjZTtcbiAgICB0aGlzLmZvcm1JZHggPSBkYXRhLmZvcm1JZHg7XG4gICAgdGhpcy5maWVsZHMgPSBkYXRhLmVycm9ycztcbn1cbnZhciBiYXNlT1JNID0gZnVuY3Rpb24ob3B0aW9ucywgZXh0T1JNKXtcbiAgICBcbiAgICAvLyBjcmVhdGluZyByZXdoZWVsIGNvbm5lY3Rpb25cbiAgICBpZiAob3B0aW9ucy5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKXtcbiAgICAgICAgdmFyIGNvbm5lY3Rpb24gPSBuZXcgcmVXaGVlbENvbm5lY3Rpb24ob3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmNvbnN0cnVjdG9yID09PSB1dGlscy5yZVdoZWVsQ29ubmVjdGlvbil7XG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gb3B0aW9ucztcbiAgICB9XG4gICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICBjb25uZWN0aW9uLm9uKCdjb25uZWN0ZWQnLCBmdW5jdGlvbigpeyBcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSB0cnVlO1xuICAgIH0pO1xuICAgIHZhciBldmVudHMgPSBjb25uZWN0aW9uLmV2ZW50cztcbiAgICB0aGlzLm9uID0gZXZlbnRzLm9uLmJpbmQodGhpcyk7XG4gICAgdGhpcy5lbWl0ID0gZXZlbnRzLmVtaXQuYmluZCh0aGlzKTtcbiAgICB0aGlzLnVuYmluZCA9IGV2ZW50cy51bmJpbmQuYmluZCh0aGlzKTtcbiAgICB0aGlzLiRwb3N0ID0gY29ubmVjdGlvbi4kcG9zdC5iaW5kKGNvbm5lY3Rpb24pO1xuXG4gICAgLy8gaGFuZGxpbmcgd2Vic29ja2V0IGV2ZW50c1xuICAgIGV2ZW50cy5vbignd3MtY29ubmVjdGVkJyxmdW5jdGlvbih3cyl7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnV2Vic29ja2V0IGNvbm5lY3RlZCcpO1xuICAgICAgICAvLyBhbGwganNvbiBkYXRhIGhhcyB0byBiZSBwYXJzZWQgYnkgZ290RGF0YVxuICAgICAgICB3cy5vbk1lc3NhZ2VKc29uKFcyUFJFU09VUkNFLmdvdERhdGEuYmluZChXMlBSRVNPVVJDRSkpO1xuICAgICAgICAvL1xuICAgICAgICB3cy5vbk1lc3NhZ2VUZXh0KGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgICAgICAgY29uc29sZS5pbmZvKCdXUyBtZXNzYWdlIDogJyArIG1lc3NhZ2UpXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGV2ZW50cy5vbignd3MtZGlzY29ubmVjdGVkJywgZnVuY3Rpb24od3Mpe1xuICAgICAgICBjb25zb2xlLmVycm9yKCdXZWJzb2NrZXQgZGlzY29ubmVjdGVkJylcbiAgICB9KTtcbiAgICBldmVudHMub24oJ2Vycm9yLWpzb24tNDA0JyxmdW5jdGlvbihlcnJvcix1cmwsIHNlbnREYXRhLCB4aHIpeyBcbiAgICAgICAgY29uc29sZS5lcnJvcignSlNPTiBlcnJvciAnLCBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xuICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW3VybC5zcGxpdCgnLycpWzBdXTtcbiAgICB9KVxuXG4gICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICB2YXIgVzJQUkVTT1VSQ0UgPSB0aGlzO1xuICAgIHZhciBJREIgPSB7YXV0aF9ncm91cCA6IExhenkoe30pfTsgLy8gdGFibGVOYW1lIC0+IGRhdGEgYXMgQXJyYXlcbiAgICB2YXIgSURYID0ge307IC8vIHRhYmxlTmFtZSAtPiBMYXp5KGluZGV4QnkoJ2lkJykpIC0+IElEQltkYXRhXVxuICAgIHZhciBSRVZJRFggPSB7fTsgLy8gdGFibGVOYW1lIC0+IGZpZWxkTmFtZSAtPiBMYXp5Lmdyb3VwQnkoKSAtPiBJREJbREFUQV1cbiAgICB2YXIgYnVpbGRlckhhbmRsZXJzID0ge307XG4gICAgdmFyIGJ1aWxkZXJIYW5kbGVyVXNlZCA9IHt9O1xuICAgIHZhciBwZXJzaXN0ZW50QXR0cmlidXRlcyA9IHt9O1xuICAgIHZhciBldmVudEhhbmRsZXJzID0ge307XG4gICAgdmFyIHBlcm1pc3Npb25XYWl0aW5nID0ge307XG4gICAgdmFyIG1vZGVsQ2FjaGUgPSB7fTtcbiAgICB2YXIgZmFpbGVkTW9kZWxzID0ge307XG4gICAgdmFyIHdhaXRpbmdDb25uZWN0aW9ucyA9IHt9IC8vIGFjdHVhbCBjb25uZWN0aW9uIHdobyBpJ20gd2FpdGluZyBmb3JcbiAgICB2YXIgbGlzdENhY2hlID0gbmV3IExpc3RDYWNoZXIoTGF6eSk7XG4gICAgdmFyIGxpbmtlciA9IG5ldyBBdXRvTGlua2VyKGV2ZW50cyx3YWl0aW5nQ29ubmVjdGlvbnMsSURCLCB0aGlzLCBsaXN0Q2FjaGUpO1xuLyogICAgd2luZG93LmxsID0gbGlua2VyO1xuICAgIHdpbmRvdy5sYyA9IGxpc3RDYWNoZTtcbiovXG4gICAgdGhpcy52YWxpZGF0aW9uRXZlbnQgPSBldmVudHMub24oJ2Vycm9yLWpzb24tNTEzJywgZnVuY3Rpb24oZGF0YSwgdXJsLCBzZW50RGF0YSwgeGhyKXtcbiAgICAgICAgaWYgKGN1cnJlbnRDb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlcil7XG4gICAgICAgICAgICBjdXJyZW50Q29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIobmV3IFZhbGlkYXRpb25FcnJvcihkYXRhKSk7XG4gICAgICAgIH1cbiAgICB9KVxuXG4gICAgdmFyIGdldEluZGV4ID0gZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElEQilcbiAgICAgICAgICAgIHJldHVybiBJREJbaW5kZXhOYW1lXTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBJREJbaW5kZXhOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgcmV0dXJuIElEQltpbmRleE5hbWVdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgZ2V0VW5saW5rZWQgPSBmdW5jdGlvbiAoaW5kZXhOYW1lKSB7XG4gICAgICAgIGlmIChpbmRleE5hbWUgaW4gVU5MSU5LRUQpXG4gICAgICAgICAgICByZXR1cm4gVU5MSU5LRURbaW5kZXhOYW1lXTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBVTkxJTktFRFtpbmRleE5hbWVdID0ge307XG4gICAgICAgICAgICByZXR1cm4gVU5MSU5LRURbaW5kZXhOYW1lXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBQZXJtaXNzaW9uVGFibGUoaWQsIGtsYXNzLCBwZXJtaXNzaW9ucykge1xuICAgICAgICAvLyBjcmVhdGUgUGVybWlzc2lvblRhYmxlIGNsYXNzXG4gICAgICAgIHRoaXMua2xhc3MgPSBrbGFzcztcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IFtdO1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIGZvciAodmFyIGsgaW4gcGVybWlzc2lvbnMpIHtcbiAgICAgICAgICAgIHRoaXMucHVzaC5hcHBseSh0aGlzLCBbaywgcGVybWlzc2lvbnNba11dKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBQZXJtaXNzaW9uVGFibGUucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgLy8gc2F2ZSBPYmplY3QgdG8gc2VydmVyXG4gICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgcGVybWlzc2lvbnM6IExhenkodGhpcy5wZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFt4WzBdLmlkLCB4WzFdXVxuICAgICAgICAgICAgfSkudG9PYmplY3QoKVxuICAgICAgICB9O1xuICAgICAgICBkYXRhLmlkID0gdGhpcy5pZDtcbiAgICAgICAgdmFyIG1vZGVsTmFtZSA9IHRoaXMua2xhc3MubW9kZWxOYW1lO1xuICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmtsYXNzLm1vZGVsTmFtZSArICcvc2V0X3Blcm1pc3Npb25zJywgZGF0YSwgZnVuY3Rpb24gKG15UGVybXMsIGEsIGIsIHJlcSkge1xuICAgICAgICAgICAgY2IobXlQZXJtcyk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgUGVybWlzc2lvblRhYmxlLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKGdyb3VwX2lkLCBwZXJtaXNzaW9uTGlzdCkge1xuICAgICAgICB2YXIgcCA9IExhenkocGVybWlzc2lvbkxpc3QpO1xuICAgICAgICB2YXIgcGVybXMgPSBMYXp5KHRoaXMua2xhc3MuYWxsUGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LCBwLmNvbnRhaW5zKHgpXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICB2YXIgbCA9IExhenkodGhpcy5wZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4geFswXS5pZFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGwuY29udGFpbnMoZ3JvdXBfaWQpKVxuICAgICAgICAgICAgdGhpcy5wZXJtaXNzaW9uc1tsLmluZGV4T2YoZ3JvdXBfaWQpXVsxXSA9IHBlcm1zO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGlzLnBlcm1pc3Npb25zLnB1c2goW0lEQi5hdXRoX2dyb3VwLmdldChncm91cF9pZCksIHBlcm1zXSk7XG4gICAgfTtcblxuICAgIC8vIGNyZWF0ZXMgZHluYW1pY2FsIG1vZGVsc1xuICAgIHZhciBtYWtlTW9kZWxDbGFzcyA9IGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICB2YXIgX21vZGVsID0gbW9kZWw7XG4gICAgICAgIHZhciBmaWVsZHMgPSBMYXp5KG1vZGVsLmZpZWxkcyk7XG4gICAgICAgIGlmIChtb2RlbC5wcml2YXRlQXJncykge1xuICAgICAgICAgICAgZmllbGRzID0gZmllbGRzLm1lcmdlKG1vZGVsLnByaXZhdGVBcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCdtb2RlbC1kZWZpbml0aW9uJywgbW9kZWwpO1xuICAgICAgICAvLyBnZXR0aW5nIGZpZWxkcyBvZiB0eXBlIGRhdGUgYW5kIGRhdGV0aW1lXG4vKlxuICAgICAgICB2YXIgREFURUZJRUxEUyA9IGZpZWxkcy5maWx0ZXIoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiAoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKVxuICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKHgsIHYpIHtcbiAgICAgICAgICAgIHJldHVybiBbdiwgdHJ1ZV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcblxuICAgICAgICAvLyBnZXR0aW5nIGJvb2xlYW4gZmllbGRzXG4gICAgICAgIHZhciBCT09MRklFTERTID0gZmllbGRzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKVxuICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKHgsIHYpIHtcbiAgICAgICAgICAgIHJldHVybiBbdiwgdHJ1ZV1cbiAgICAgICAgfSkudG9PYmplY3QoKTtcblxuICAgICAgICAvLyBib29sZWFucyBhbmQgZGF0ZXRpbWVzIHN0b3JhZ2UgZXh0ZXJuYWwgXG4gICAgICAgIE1PREVMX0RBVEVGSUVMRFNbbW9kZWwubmFtZV0gPSBEQVRFRklFTERTO1xuICAgICAgICBNT0RFTF9CT09MRklFTERTW21vZGVsLm5hbWVdID0gQk9PTEZJRUxEUztcbiovXG4gICAgICAgIC8vIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHZhciBmdW5jU3RyaW5nID0gXCJpZiAoIXJvdykgeyByb3cgPSB7fX07XFxuXCI7XG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gbW9kZWwucmVmZXJlbmNlcy5tYXAoZnVuY3Rpb24oZmllbGQpe1xuICAgICAgICAgICAgcmV0dXJuICd0aGlzLl8nICsgZmllbGQuaWQgKyAnID0gcm93LicgKyBmaWVsZC5pZCArICc7JztcbiAgICAgICAgfSkuam9pbignO1xcbicpO1xuICAgICAgICBcbiAgICAgICAgLy8gZGF0ZWZpZWxkIGNvbnZlcnNpb25cbiAgICAgICAgZnVuY1N0cmluZyArPSBmaWVsZHMubWFwKGZ1bmN0aW9uICh4LGspIHtcbiAgICAgICAgICAgIGlmICgoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IHJvdy4nICsgayArICc/bmV3IERhdGUocm93LicgKyBrICsgJyAqIDEwMDAgLSAnICsgdXRpbHMudHpPZmZzZXQgKyAnKTpudWxsO1xcbic7IFxuICAgICAgICAgICAgfSBlbHNlIGlmICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IChyb3cuJyArIGsgKyAnID09PSBcIlRcIikgfHwgKHJvdy4nICsgayArICcgPT09IHRydWUpO1xcbic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAndGhpcy4nICsgayArICcgPSByb3cuJyArIGsgKyAnO1xcbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnRvU3RyaW5nKCdcXG4nKTsgKyAnXFxuJztcblxuICAgICAgICBmdW5jU3RyaW5nICs9IFwiaWYgKHBlcm1pc3Npb25zKSB7dGhpcy5fcGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucyAmJiBMYXp5KHBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHsgcmV0dXJuIFt4LCB0cnVlXSB9KS50b09iamVjdCgpO31cIlxuXG4gICAgICAgIFxuICAgICAgICAvLyBtYXN0ZXIgY2xhc3MgZnVuY3Rpb25cbiAgICAgICAgdmFyIEtsYXNzID0gbmV3IEZ1bmN0aW9uKCdyb3cnLCAncGVybWlzc2lvbnMnLGZ1bmNTdHJpbmcpXG5cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLm9ybSA9IGV4dE9STTtcbiAgICAgICAgS2xhc3MucmVmX3RyYW5zbGF0aW9ucyA9IHt9O1xuICAgICAgICBLbGFzcy5tb2RlbE5hbWUgPSBtb2RlbC5uYW1lO1xuICAgICAgICBLbGFzcy5yZWZlcmVuY2VzID0gTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5wbHVjaygnaWQnKS50b0FycmF5KCk7XG5cbiAgICAgICAgS2xhc3MuaW52ZXJzZV9yZWZlcmVuY2VzID0gbW9kZWwucmVmZXJlbmNlZEJ5Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgLy8gbWFuYWdpbmcgcmVmZXJlbmNlcyB3aGVyZSBcbiAgICAgICAgICAgIHJldHVybiB4LmJ5ICsgJ18nICsgeC5pZCArICdfc2V0J1xuICAgICAgICB9KTtcbiAgICAgICAgS2xhc3MucmVmZXJlbnRzID0gbW9kZWwucmVmZXJlbmNlZEJ5Lm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LmJ5LCB4LmlkXVxuICAgICAgICB9KTtcbiAgICAgICAgS2xhc3MuZmllbGRzT3JkZXIgPSBtb2RlbC5maWVsZE9yZGVyO1xuICAgICAgICBLbGFzcy5hbGxQZXJtaXNzaW9ucyA9IG1vZGVsLnBlcm1pc3Npb25zO1xuXG4gICAgICAgIC8vIHJlZGVmaW5pbmcgdG9TdHJpbmcgbWV0aG9kXG4gICAgICAgIGlmIChMYXp5KG1vZGVsLnJlcHJlc2VudGF0aW9uKS5zaXplKCkpe1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnRvU3RyaW5nID0gbmV3IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcy4nICsgTGF6eShtb2RlbC5yZXByZXNlbnRhdGlvbikudG9TdHJpbmcoJyArIFwiIFwiICsgdGhpcy4nKSk7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnRvVXBwZXJDYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gcmVkZWZpbmUgdG8gVXBwZXJDYXNlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIH07XG4gICAgICBcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLnRvTG93ZXJDYXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIGRlbGV0ZSBpbnN0YW5jZSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5kZWxldGUodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUsIFt0aGlzLmlkXSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gcGVybWlzc2lvbiBnZXR0ZXIgcHJvcGVydHlcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEtsYXNzLnByb3RvdHlwZSwgJ3Blcm1pc3Npb25zJywge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3Blcm1pc3Npb25zKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcGVybWlzc2lvbnM7XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtlci5wZXJtaXNzaW9uc1t0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZV0uYXNrKHRoaXMuaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGdldHRpbmcgZnVsbCBwZXJtaXNzaW9uIHRhYmxlIGZvciBhbiBvYmplY3RcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmFsbF9wZXJtcyA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgdmFyIG9iamVjdF9pZCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSArICcvYWxsX3Blcm1zJywge2lkOiB0aGlzLmlkfSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGVybWlzc2lvbnMgPSBkYXRhO1xuICAgICAgICAgICAgICAgIHZhciBncm91cGVkID0ge307XG4gICAgICAgICAgICAgICAgdmFyIHVua25vd25fZ3JvdXBzID0gTGF6eShwZXJtaXNzaW9ucykucGx1Y2soJ2dyb3VwX2lkJykudW5pcXVlKCkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnJyArIHhcbiAgICAgICAgICAgICAgICB9KS5kaWZmZXJlbmNlKElEQi5hdXRoX2dyb3VwLmtleXMoKSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIExhenkocGVybWlzc2lvbnMpLmdyb3VwQnkoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguZ3JvdXBfaWRcbiAgICAgICAgICAgICAgICB9KS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyb3VwZWRba10gPSBMYXp5KHYpLnBsdWNrKCduYW1lJykudG9BcnJheSgpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdmFyIGNhbGwgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBjYihuZXcgUGVybWlzc2lvblRhYmxlKG9iamVjdF9pZCwgS2xhc3MsIGdyb3VwZWQpKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmICh1bmtub3duX2dyb3Vwcy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdldCgnYXV0aF9ncm91cCcsdW5rbm93bl9ncm91cHMsY2FsbCk7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBjYWxsKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICB2YXIgbyA9IHRoaXMuYXNSYXcoKTtcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSBLbGFzcy5maWVsZHM7XG4gICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgdmFyIG1vZGVsTmFtZSA9IHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhcmcgaW4gYXJncykge1xuICAgICAgICAgICAgICAgICAgICBvW2FyZ10gPSBhcmdzW2FyZ107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gZWxpbWluYXRlIHVud3JpdGFibGVzXG4gICAgICAgICAgICBMYXp5KEtsYXNzLmZpZWxkc09yZGVyKS5maWx0ZXIoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFmaWVsZHNbeF0ud3JpdGFibGU7XG4gICAgICAgICAgICB9KS5lYWNoKGZ1bmN0aW9uKGZpZWxkTmFtZSl7XG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSBpbiBvKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBvW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9IFcyUFJFU09VUkNFLiRwb3N0KG1vZGVsTmFtZSArIChJRCA/ICcvcG9zdCcgOiAnL3B1dCcpLCBvKTtcbiAgICAgICAgICAgIGlmIChhcmdzICYmIChhcmdzLmNvbnN0cnVjdG9yID09PSBGdW5jdGlvbikpe1xuICAgICAgICAgICAgICAgIC8vIHBsYWNpbmcgY2FsbGJhY2sgaW4gYSBjb21tb24gcGxhY2VcbiAgICAgICAgICAgICAgICBwcm9taXNlLmNvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyID0gYXJncztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlXG4gICAgICAgIH07XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG9iaiA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKHRoaXMuYXNSYXcoKSk7XG4gICAgICAgICAgICBvYmouX3Blcm1pc3Npb25zID0gdGhpcy5fcGVybWlzc2lvbnM7XG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGJ1aWxkaW5nIHNlcmlhbGl6YXRpb24gZnVuY3Rpb25cbiAgICAgICAgdmFyIGFzciA9ICdyZXR1cm4ge1xcbicgKyBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLm1hcChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICByZXR1cm4gZmllbGQuaWQgKyAnIDogdGhpcy5fJyArIGZpZWxkLmlkO1xuICAgICAgICB9KS5jb25jYXQoZmllbGRzLm1hcChmdW5jdGlvbiAoeCxrKSB7XG4gICAgICAgICAgICBpZiAoKHgudHlwZSA9PSAnZGF0ZScpIHx8ICh4LnR5cGUgPT0gJ2RhdGV0aW1lJykpe1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6ICh0aGlzLicgKyBrICsgJz8oTWF0aC5yb3VuZCh0aGlzLicgKyBrICsgJy5nZXRUaW1lKCkgLSB0aGlzLicgKyBrICsgJy5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDApIC8gMTAwMCk6bnVsbCknOyBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeC50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBrICsgJyA6IHRoaXMuJyArIGsgKyAnP1wiVFwiOlwiRlwiJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogdGhpcy4nICsgaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpLnRvU3RyaW5nKCcsXFxuJykgKyAnfTsnO1xuICAgICAgICBLbGFzcy5wcm90b3R5cGUuYXNSYXcgPSBuZXcgRnVuY3Rpb24oYXNyKTtcblxuICAgICAgICBLbGFzcy5zYXZlTXVsdGkgPSBmdW5jdGlvbiAob2JqZWN0cywgY2IsIHNjb3BlKSB7XG4gICAgICAgICAgICB2YXIgcmF3ID0gW107XG4gICAgICAgICAgICB2YXIgZGVsZXRhYmxlID0gTGF6eShLbGFzcy5maWVsZHMpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIXgud3JpdGFibGVcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5wbHVjaygnaWQnKVxuICAgICAgICAgICAgICAgIC50b0FycmF5KCk7XG4gICAgICAgICAgICBMYXp5KG9iamVjdHMpXG4gICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5hc1JhdygpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KGRlbGV0YWJsZSkuZWFjaChmdW5jdGlvbiAoeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHhbeV07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByYXcucHVzaCh4KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KEtsYXNzLm1vZGVsTmFtZSwgJ3B1dCcsIHttdWx0aXBsZTogcmF3LCBmb3JtSWR4IDogVzJQUkVTT1VSQ0UuZm9ybUlkeCsrfSwgZnVuY3Rpb24gKGVsZW1zKSB7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShlbGVtcyk7XG4gICAgICAgICAgICAgICAgdmFyIHRhYiA9IElEQltLbGFzcy5tb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIHZhciBvYmpzID0gTGF6eShlbGVtc1tLbGFzcy5tb2RlbE5hbWVdLnJlc3VsdHMpLnBsdWNrKCdpZCcpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFiLmdldCh4KVxuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICBpZiAoY2IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2Iob2Jqcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgc2NvcGUpO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoJ2V4dHJhX3ZlcmJzJyBpbiBtb2RlbClcbiAgICAgICAgICAgIExhenkobW9kZWwuZXh0cmFfdmVyYnMpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZnVuY05hbWUgPSB4WzBdO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0geFsxXTtcbiAgICAgICAgICAgICAgICB2YXIgZGRhdGEgPSAnZGF0YSA9IHtpZCA6IHRoaXMuaWQnO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgZGRhdGEgKz0gJywgJyArIExhenkoYXJncykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHggKyAnIDogJyArIHg7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5qb2luKCcsJyk7XG4gICAgICAgICAgICAgICAgZGRhdGEgKz0gJ307JztcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goJ2NiJyk7XG4gICAgICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlW2Z1bmNOYW1lXSA9IG5ldyBGdW5jdGlvbihhcmdzLCBkZGF0YSArICdXMlMuVzJQX1BPU1QodGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUsXCInICsgZnVuY05hbWUgKyAnXCIsIGRhdGEsZnVuY3Rpb24oZGF0YSxzdGF0dXMsaGVhZGVycyx4KXsnICtcbiAgICAgICAgICAgICAgICAgICAgJ3RyeXtcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJyAgIGlmICghaGVhZGVycyhcIm5vbW9kZWxcIikpIHt3aW5kb3cuVzJTLmdvdERhdGEoZGF0YSxjYik7fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnICAgZWxzZSB7aWYgKGNiKSB7Y2IoZGF0YSl9fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfSBjYXRjaChlKXtcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ2lmIChjYikge2NiKGRhdGEpO31cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ31cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ30pO1xcbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIGlmICgncHJpdmF0ZUFyZ3MnIGluIG1vZGVsKSB7XG4gICAgICAgICAgICBLbGFzcy5wcml2YXRlQXJncyA9IExhenkobW9kZWwucHJpdmF0ZUFyZ3MpLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHRydWVdO1xuICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS5zYXZlUEEgPSBmdW5jdGlvbiAobykge1xuICAgICAgICAgICAgICAgIHZhciBUID0gdGhpcztcbiAgICAgICAgICAgICAgICB2YXIgb28gPSB7aWQ6IHRoaXMuaWR9O1xuICAgICAgICAgICAgICAgIHZhciBQQSA9IHRoaXMuY29uc3RydWN0b3IucHJpdmF0ZUFyZ3M7XG4gICAgICAgICAgICAgICAgdmFyIEZzID0gdGhpcy5jb25zdHJ1Y3Rvci5maWVsZHM7XG4gICAgICAgICAgICAgICAgdmFyIHQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihvKS5hc1JhdygpO1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZElkeCA9IExhenkoUEEpLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCBGc1t4XV1cbiAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIExhenkobykuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGsgaW4gUEEpICYmIGZpZWxkSWR4W2tdLndyaXRhYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvb1trXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSArICcvc2F2ZVBBJywgb28sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShvbykuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgVFtrXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1vZGVsQ2FjaGVbS2xhc3MubW9kZWxOYW1lXSA9IEtsYXNzO1xuICAgICAgICAvLyBhZGRpbmcgaWQgdG8gZmllbGRzXG4gICAgICAgIGZvciAodmFyIGYgaW4gbW9kZWwuZmllbGRzKSB7XG4gICAgICAgICAgICBtb2RlbC5maWVsZHNbZl0uaWQgPSBmO1xuICAgICAgICB9XG4gICAgICAgIEtsYXNzLmZpZWxkcyA9IExhenkobW9kZWwuZmllbGRzKS5jb25jYXQoTGF6eShtb2RlbC5wcml2YXRlQXJncykpLmNvbmNhdChMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLnRhcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgeC50eXBlID0geC50eXBlIHx8ICdyZWZlcmVuY2UnXG4gICAgICAgIH0pKS5pbmRleEJ5KCdpZCcpLnRvT2JqZWN0KCk7XG4gICAgICAgIC8vIGJ1aWxkaW5nIHJlZmVyZW5jZXMgdG8gKG1hbnkgdG8gb25lKSBmaWVsZHNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgIHZhciBleHRfcmVmID0gcmVmLnRvO1xuICAgICAgICAgICAgdmFyIGxvY2FsX3JlZiA9ICdfJyArIHJlZi5pZDtcbiAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCByZWYuaWQsZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICghKGV4dF9yZWYgaW4gSURCKSl7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShleHRfcmVmLGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlua2VyLm1haW5JbmRleFtleHRfcmVmXS5hc2sodGhzW2xvY2FsX3JlZl0sdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gKGV4dF9yZWYgaW4gSURCKSAmJiB0aGlzW2xvY2FsX3JlZl0gJiYgSURCW2V4dF9yZWZdLmdldCh0aGlzW2xvY2FsX3JlZl0pO1xuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0ICYmIChleHRfcmVmIGluIGxpbmtlci5tYWluSW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFza2luZyB0byBsaW5rZXJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpbmtlci5tYWluSW5kZXhbZXh0X3JlZl0uYXNrKHRoaXNbbG9jYWxfcmVmXSx0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUuY29uc3RydWN0b3IubW9kZWxOYW1lICE9IGV4dF9yZWYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1lvdSBjYW4gYXNzaWduIG9ubHkgJyArIGV4dF9yZWYgKyAnIHRvICcgKyByZWYuaWQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXNbbG9jYWxfcmVmXSA9IHZhbHVlLmlkO1xuICAgICAgICAgICAgfSwgJ25ldy0nICsgZXh0X3JlZiwgJ2RlbGV0ZWQtJyArIGV4dF9yZWYsJ3VwZGF0ZWQtJyArIGV4dF9yZWYsICduZXctbW9kZWwtJyArIGV4dF9yZWYpO1xuXG5cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVmLmlkKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dE9STS5nZXQoZXh0X3JlZix0aGlzW2xvY2FsX3JlZl0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9idWlsZGluZyByZWZlcmVuY2VzIHRvIChvbmUgdG8gbWFueSkgZmllbGRzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSByZWYuYnkgKyAnLicgKyByZWYuaWQ7XG4gICAgICAgICAgICB2YXIgcHJvcGVydHlOYW1lID0gcmVmLmJ5ICsgJ18nICsgdXRpbHMucGx1cmFsaXplKHJlZi5pZCk7XG4gICAgICAgICAgICB2YXIgcmV2SW5kZXggPSByZWYuYnk7XG4gICAgICAgICAgICBpZiAoS2xhc3MucHJvdG90eXBlLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICAkbG9nLmVycm9yKCdUcnllZCB0byByZWRlZmluZSBwcm9wZXJ0eSAnICsgcHJvcGVydHlOYW1lICsgJ3MnICsgJyBmb3IgJyArIEtsYXNzLm1vZGVsTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCBwcm9wZXJ0eU5hbWUsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IChyZXZJbmRleCBpbiBJREIpID8gUkVWSURYW2luZGV4TmFtZV0uZ2V0KHRoaXMuaWQgKyAnJyk6bnVsbDtcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLmZvcmVpZ25LZXlzW2luZGV4TmFtZV0uYXNrKHRoaXMuaWQsdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgfSwgbnVsbCwgJ25ldy0nICsgcmV2SW5kZXgsICd1cGRhdGVkLScgKyByZXZJbmRleCwgJ2RlbGV0ZWQtJyArIHJldkluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUodXRpbHMucGx1cmFsaXplKHJlZi5ieSkpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0cyA9IHt9O1xuICAgICAgICAgICAgICAgIG9wdHNbcmVmLmlkXSA9IFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0T1JNLnF1ZXJ5KHJlZi5ieSxvcHRzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vYnVpbGRpbmcgcmVmZXJlbmNlIHRvIChtYW55IHRvIG1hbnkpIGZpZWxkc1xuICAgICAgICBpZiAobW9kZWwubWFueVRvTWFueSkge1xuICAgICAgICAgICAgTGF6eShtb2RlbC5tYW55VG9NYW55KS5lYWNoKGZ1bmN0aW9uIChyZWYpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gcmVmLmluZGV4TmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3QgPSByZWYuZmlyc3Q/IDAgOiAxO1xuICAgICAgICAgICAgICAgIHZhciBvbW9kZWxOYW1lID0gcmVmLm1vZGVsO1xuLy8gICAgICAgICAgICAgICAgdmFyIG9tb2RlbCA9IGdldEluZGV4KG9tb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciBnZXR0ZXIgPSBsaW5rZXIubTJtSW5kZXhbaW5kZXhOYW1lXVsnZ2V0JyArICgxIC0gZmlyc3QpXTtcblxuICAgICAgICAgICAgICAgIGNhY2hlZFByb3BlcnR5QnlFdmVudHMoS2xhc3MucHJvdG90eXBlLCByZWYubW9kZWwgKyAncycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkcyA9IGdldHRlcih0aHMuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdldCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9XMlBSRVNPVVJDRS5mZXRjaChvbW9kZWxOYW1lLCB7aWQgOiBpZHN9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXQgPSBnZXRJbmRleChvbW9kZWxOYW1lKS5nZXQuYmluZChJREJbb21vZGVsTmFtZV0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRzICYmIGdldClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXQgPSBMYXp5KGlkcykubWFwKGdldCkuZmlsdGVyKHV0aWxzLmJvb2wpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgICAgICAgICAgICAgIH0sIG51bGwsICdyZWNlaXZlZC1tMm0tJyArIGluZGV4TmFtZSwgJ3JlY2VpdmVkLScgKyBvbW9kZWxOYW1lKTtcblxuICAgICAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUodXRpbHMucGx1cmFsaXplKG9tb2RlbE5hbWUpKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5rZXIuZ2V0TTJNKGluZGV4TmFtZSwgW3Rocy5pZF0sIGZpcnN0LGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gZ2V0dGVyKHRocy5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG9tb2RlbE5hbWUsIHtpZCA6IGlkc30sbnVsbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZXQgPSBJREJbb21vZGVsTmFtZV0uZ2V0LmJpbmQoSURCW29tb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQoTGF6eShpZHMpLm1hcChnZXQpLmZpbHRlcih1dGlscy5ib29sKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHQoW10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfTtcblxuXG4gICAgICAgICAgICAgICAgS2xhc3MuZmllbGRzW3V0aWxzLmNhcGl0YWxpemUob21vZGVsTmFtZSldID0ge1xuICAgICAgICAgICAgICAgICAgICBpZDogdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWxOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWxOYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHJlYWRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnTTJNJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yczogW11cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnVubGlua1JlZmVyZW5jZSA9IGZ1bmN0aW9uIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBtdWx0aXBsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jb25zdHJ1Y3Rvci5uYW1lID09ICdBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZXMgPSBpbnN0YW5jZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBpbnN0YW5jZXNbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBvbW9kZWwgPSBpbnN0YW5jZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKG11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtJRCwgeF1cbiAgICAgICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gW1tJRCwgaW5zdGFuY2UuaWRdXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lICsgJy8nICsgb21vZGVsICsgJ3MvZGVsZXRlJywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIEtsYXNzLnByb3RvdHlwZS5saW5rUmVmZXJlbmNlID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgICAgICB2YXIgaW5zdGFuY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmNvbnN0cnVjdG9yLm5hbWUgPT0gJ0FycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlcyA9IGluc3RhbmNlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IGluc3RhbmNlc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbCA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gS2xhc3MubW9kZWxOYW1lICsgJy8nICsgb21vZGVsO1xuICAgICAgICAgICAgICAgIGlmIChtdWx0aXBsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVmcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElOREVYX00yTSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVmcyA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5kaWZmZXJlbmNlKExhenkoSU5ERVhfTTJNW2luZGV4TmFtZV1bMF0uZ2V0KHRoaXMuaWQpKSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGluZGV4TmFtZSA9IG9tb2RlbCArICcvJyArIEtsYXNzLm1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBJTkRFWF9NMk0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZnMgPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykuZGlmZmVyZW5jZShMYXp5KElOREVYX00yTVtpbmRleE5hbWVdWzBdLmdldCh0aGlzLmlkKSkpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVmcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gTGF6eShyZWZzKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW0lELCB4XVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQX1BPU1QoS2xhc3MubW9kZWxOYW1lLCBvbW9kZWwgKyAncy9wdXQnLCB7Y29sbGVjdGlvbjogY29sbGVjdGlvbn0sIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoaW5kZXhOYW1lIGluIGxpbmtlci5tMm1JbmRleCkgJiYgTGF6eShsaW5rZXIubTJtSW5kZXhbaW5kZXhOYW1lXVsnZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUob21vZGVsKV0oaW5zdGFuY2UuaWQpKS5maW5kKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lICsgJy8nICsgb21vZGVsICsgJ3MvcHV0Jywge2NvbGxlY3Rpb246IFtbdGhpcy5pZCwgaW5zdGFuY2UuaWRdXX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZXZlbnRzLmVtaXQoJ25ldy1tb2RlbCcsIEtsYXNzKTtcbiAgICAgICAgZXZlbnRzLmVtaXQoJ25ldy1tb2RlbC0nICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgcmV0dXJuIEtsYXNzO1xuICAgIH07XG5cbiAgICB0aGlzLmdvdERhdGEgPSBmdW5jdGlvbiAoZGF0YSwgY2FsbEJhY2spIHtcbiAgICAgICAgLy8gcmVjZWl2ZSBhbGwgZGF0YSBmcm9tIGV2ZXJ5IGVuZCBwb2ludFxuICAgICAgICBjb25zb2xlLmluZm8oJ2dvdERhdGEnKTtcbiAgICAgICAgaWYgKHR5cGVvZihkYXRhKSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2RhdGEgJyArIGRhdGEgKyAnIHJlZnVzZWQgZnJvbSBnb3REYXRhKCknKTtcbiAgICAgICAgICAgIGlmIChjYWxsQmFjaykge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBjbGVhbiBkYXRhIGZyb20gcmVsYXRpb25zIGFuZCBwZXJtaXNzaW9ucyBmb3IgdXNpbmcgaXQgYWZ0ZXIgbW9kZWwgcGFyc2luZ1xuICAgICAgICBpZiAoJ19leHRyYScgaW4gZGF0YSl7IGRlbGV0ZSBkYXRhLl9leHRyYSB9XG4gICAgICAgIHZhciBUT09ORSA9IGRhdGEuVE9PTkU7XG4gICAgICAgIHZhciBUT01BTlkgPSBkYXRhLlRPTUFOWTtcbiAgICAgICAgdmFyIE1BTllUT01BTlkgPSBkYXRhLk1BTllUT01BTlk7XG4gICAgICAgIHZhciBQRVJNSVNTSU9OUyA9IGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIHZhciBQQSA9IGRhdGEuUEE7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPT05FO1xuICAgICAgICBkZWxldGUgZGF0YS5UT01BTlk7XG4gICAgICAgIGRlbGV0ZSBkYXRhLk1BTllUT01BTlk7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBFUk1JU1NJT05TO1xuICAgICAgICBkZWxldGUgZGF0YS5QQTtcbiAgICAgICAgaWYgKCFQQSkgeyBQQSA9IHt9OyB9XG5cbiAgICAgICAgLy8gY2xlYW5pbmcgZnJvbSB1c2VsZXNzIGRlbGV0ZWQgZGF0YVxuICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5maWx0ZXIoZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgIHJldHVybiAoISgnZGVsZXRlZCcgaW4gdikgfHwgKChrIGluIG1vZGVsQ2FjaGUpKSk7XG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJ20ybScgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG0ybSA9IGRhdGEubTJtO1xuICAgICAgICAgICAgZGVsZXRlIGRhdGFbJ20ybSddO1xuICAgICAgICB9XG4gICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbiAoZGF0YSwgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICAgICAgICAgIHZhciBtb2RlbENsYXNzID0gbW9kZWw7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEucmVzdWx0cyAmJiAoZGF0YS5yZXN1bHRzLmxlbmd0aCA+IDApICYmIChkYXRhLnJlc3VsdHNbMF0uY29uc3RydWN0b3IgPT0gQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucmVzdWx0cyA9IExhenkoZGF0YS5yZXN1bHRzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTGF6eShtb2RlbENsYXNzLmZpZWxkc09yZGVyKS56aXAoeCkudG9PYmplY3QoKVxuICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIHZhciBkZWxldGVkID0gZGF0YS5kZWxldGVkO1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gUEEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIE1QQSA9IFBBW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIExhenkocmVzdWx0cykuZWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3JkLmlkIGluIE1QQSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoTVBBW3JlY29yZC5pZF0pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBpbmRleGluZyByZWZlcmVuY2VzIGJ5IGl0cyBJRFxuICAgICAgICAgICAgICAgIHZhciBpdGFiID0gZ2V0SW5kZXgobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFibGUgPSBpdGFiLnNvdXJjZTtcblxuICAgICAgICAgICAgICAgIC8vIG9iamVjdCBkZWxldGlvblxuICAgICAgICAgICAgICAgIGlmIChkZWxldGVkKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlZC5mb3JFYWNoKGZ1bmN0aW9uKHgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbi8qXG4gICAgICAgICAgICAgICAgTGF6eShkZWxldGVkKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0YWJsZVt4XTtcbiAgICAgICAgICAgICAgICB9KTtcbiovXG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IHJlc3VsdHMuaW5kZXhCeSgnaWQnKTtcbiAgICAgICAgICAgICAgICB2YXIgaWsgPSBpZHgua2V5cygpO1xuICAgICAgICAgICAgICAgIHZhciBubmV3ID0gaWsuZGlmZmVyZW5jZShpdGFiLmtleXMoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHgpXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIHZhciB1cGRhdGVkID0gaWsuZGlmZmVyZW5jZShubmV3KTtcbiAgICAgICAgICAgICAgICAvLyByZW1vdmluZyBvbGQgaWRlbnRpY2FsIHZhbHVlc1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQgPSB1cGRhdGVkLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIXV0aWxzLnNhbWVBcyhpZHguZ2V0KHgpLCBpdGFiLmdldCh4KS5hc1JhdygpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyBjbGFzc2lmeSByZWNvcmRzXG4gICAgICAgICAgICAgICAgdmFyIHBlcm1zID0gZGF0YS5wZXJtaXNzaW9ucyA/IExhenkoZGF0YS5wZXJtaXNzaW9ucykgOiBMYXp5KHt9KTtcbiAgICAgICAgICAgICAgICB2YXIgbmV3T2JqZWN0cyA9IG5uZXcubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgbW9kZWxDbGFzcyhpZHguZ2V0KHgpLCBwZXJtcy5nZXQoeCkpXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLy8vIGNsYXNzaWZ5aW5nIHVwZGF0ZWRcbiAgICAgICAgICAgICAgICAvL3ZhciB1cGRhdGVkT2JqZWN0cyA9IHVwZGF0ZWQubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBuZXcgbW9kZWxDbGFzcyhpZHguZ2V0KHgpLHBlcm1zLmdldCh4KSl9KTtcbiAgICAgICAgICAgICAgICAvL3ZhciB1byA9IHVwZGF0ZWRPYmplY3RzLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvL3VwZGF0ZWRPYmplY3RzID0gTGF6eSh1bykubWFwKGZ1bmN0aW9uKHgpe3JldHVybiBbeCx0YWJsZVt4LmlkXV19KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRpbmcgc2luZ2xlIG9iamVjdHNcbiAgICAgICAgICAgICAgICB2YXIgY2hhbmdlZCA9IFtdO1xuLy8gICAgICAgICAgICAgICAgdmFyIERBVEVGSUVMRFMgPSBNT0RFTF9EQVRFRklFTERTW21vZGVsTmFtZV07XG4vLyAgICAgICAgICAgICAgICB2YXIgQk9PTEZJRUxEUyA9IE1PREVMX0JPT0xGSUVMRFNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB1cGRhdGVkLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZEl0ZW0gPSBpdGFiLmdldCh4KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZENvcHkgPSBvbGRJdGVtLmNvcHkoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0l0ZW0gPSBuZXcgbW9kZWxDbGFzcyhpZHguZ2V0KHgpKTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShtb2RlbC5maWVsZHMpLmtleXMoKS5lYWNoKGZ1bmN0aW9uKGspe1xuICAgICAgICAgICAgICAgICAgICAgICAgb2xkSXRlbVtrXSA9IG5ld0l0ZW1ba107XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkLnB1c2goW29sZEl0ZW0sIG9sZENvcHldKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vLy8gc2VuZGluZyBzaWduYWwgZm9yIHVwZGF0ZWQgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKGNoYW5nZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KCd1cGRhdGVkLScgKyBtb2RlbE5hbWUsIGNoYW5nZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyoqKioqKioqIFVwZGF0ZSB1bml2ZXJzZSAqKioqKioqKlxuICAgICAgICAgICAgICAgIHZhciBubyA9IG5ld09iamVjdHMudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIExhenkobm8pLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFibGVbeC5pZF0gPSB4XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gcmVidWxkaW5nIHJldmVyc2UgaW5kZXhlc1xuICAgICAgICAgICAgICAgIExhenkobW9kZWxDYWNoZVttb2RlbE5hbWVdLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgICAgICAgICBSRVZJRFhbbW9kZWxOYW1lICsgJy4nICsgcmVmXSA9IElEQlttb2RlbE5hbWVdLmdyb3VwQnkoJ18nICsgcmVmKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgbmV3IHZhbHVlc1xuICAgICAgICAgICAgICAgIGlmIChuby5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KCduZXctJyArIG1vZGVsTmFtZSwgTGF6eShubyksIGRhdGEudG90YWxSZXN1bHRzKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBldmVudHMuZW1pdCgnZGVsZXRlZC0nICsgbW9kZWxOYW1lLCBkZWxldGVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gc2VuZGluZyBldmVudHMgZm9yIGRhdGEgYXJyaXZlZFxuICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KCdyZWNlaXZlZC0nICsgbW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKFRPT05FKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUT09ORScpO1xuICAgICAgICAgICAgTGF6eShUT09ORSkuZWFjaChmdW5jdGlvbiAodmFscywgbW9kZWxOYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgdWR4ID0gZ2V0VW5saW5rZWQobW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChUT01BTlkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RPTUFOWScpO1xuICAgICAgICAgICAgTGF6eShUT01BTlkpLmVhY2goZnVuY3Rpb24gKHZhbHMsIGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBBU0tFRF9VTkxJTktFRCkpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfVU5MSU5LRURbaW5kZXhOYW1lXSA9IExhenkoW10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBMYXp5KHZhbHMpLmVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX1VOTElOS0VEW2luZGV4TmFtZV0uc291cmNlLnB1c2goaWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE1BTllUT01BTlkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ01BTllUT01BTlknKTtcbiAgICAgICAgICAgIExhenkoTUFOWVRPTUFOWSkuZWFjaChmdW5jdGlvbiAodmFscywgaW5kZXhOYW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ID0gcGFyc2VJbnQoaW5kZXhOYW1lLnNwbGl0KCd8JylbMV0pO1xuICAgICAgICAgICAgICAgIGluZGV4TmFtZSA9IGluZGV4TmFtZS5zcGxpdCgnfCcpWzBdO1xuICAgICAgICAgICAgICAgIGlmICghKGluZGV4TmFtZSBpbiBBU0tFRF9NMk0pKSB7XG4gICAgICAgICAgICAgICAgICAgIEFTS0VEX00yTVtpbmRleE5hbWVdID0gW3t9LCB7fV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBNSURYID0gQVNLRURfTTJNW2luZGV4TmFtZV1bZmlyc3RdO1xuICAgICAgICAgICAgICAgIExhenkodmFscykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICBNSURYW3ggKyAnJ10gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBNSURYW3hdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtMm0pIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdE0yTShtMm0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChQRVJNSVNTSU9OUykge1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoUEVSTUlTU0lPTlMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICBjYWxsQmFjayhkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBldmVudHMuZW1pdCgnZ290LWRhdGEnKTtcbiAgICB9O1xuICAgIHRoaXMuZ290UGVybWlzc2lvbnMgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24gKHYsIHJlc291cmNlTmFtZSkge1xuICAgICAgICAgICAgTGF6eSh2WzBdKS5lYWNoKGZ1bmN0aW9uIChyb3csIGlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKChyZXNvdXJjZU5hbWUgaW4gSURCKSAmJiAoaWQgaW4gSURCW3Jlc291cmNlTmFtZV0uc291cmNlKSl7XG4gICAgICAgICAgICAgICAgICAgIElEQltyZXNvdXJjZU5hbWVdLmdldChpZCkuX3Blcm1pc3Npb25zID0gTGF6eShyb3cpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt4LCB0cnVlXVxuICAgICAgICAgICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKExhenkodlswXSkuc2l6ZSgpKXtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMtJyArIHJlc291cmNlTmFtZSwgTGF6eSh2WzBdKS5rZXlzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZW1pdCgndXBkYXRlLXBlcm1pc3Npb25zJyk7XG4gICAgfTtcblxuXG4gICAgdGhpcy5nb3RNMk0gPSBmdW5jdGlvbihtMm0pe1xuICAgICAgICBMYXp5KG0ybSkuZWFjaChmdW5jdGlvbihkYXRhLCBpbmRleE5hbWUpe1xuICAgICAgICAgICAgdmFyIG0ybUluZGV4ID0gbGlua2VyLm0ybUluZGV4W2luZGV4TmFtZV07XG4gICAgICAgICAgICBMYXp5KGRhdGEpLmVhY2goZnVuY3Rpb24obSl7XG4gICAgICAgICAgICAgICAgTGF6eShtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsdmVyYil7XG4gICAgICAgICAgICAgICAgICAgIG0ybUluZGV4W3ZlcmJdKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBldmVudHMuZW1pdCgncmVjZWl2ZWQtbTJtJyk7XG4gICAgICAgICAgICBldmVudHMuZW1pdCgncmVjZWl2ZWQtbTJtLScgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmZldGNoID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spIHsgIC8vXG4gICAgICAgIC8vIGlmIGEgY29ubmVjdGlvbiBpcyBjdXJyZW50bHkgcnVubmluZywgd2FpdCBmb3IgY29ubmVjdGlvbi5cbiAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpe1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spO1xuICAgICAgICAgICAgfSw1MDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZmV0Y2hpbmcgYXN5bmNocm9tb3VzIG1vZGVsIGZyb20gc2VydmVyXG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgICAgICAvLyBpZiBkYXRhIGNhbWVzIGZyb20gcmVhbHRpbWUgY29ubmVjdGlvblxuICAgICAgICAgICAgICAgIGlmIChXMlBSRVNPVVJDRS5jb25uZWN0aW9uLm9wdGlvbnMucmVhbHRpbWVFbmRQb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBnZXR0aW5nIGZpbHRlciBmaWx0ZXJlZCBieSBjYWNoaW5nIHN5c3RlbVxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXIgPSBsaXN0Q2FjaGUuZmlsdGVyKG1vZGVsLGZpbHRlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgc29tdGhpbmcgaXMgbWlzc2luZyBvbiBteSBsb2NhbCBEQiBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbHRlcil7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhc2sgZm9yIG1pc3NpbmdzIGFuZCBwYXJzZSBzZXJ2ZXIgcmVzcG9uc2UgaW4gb3JkZXIgdG8gZW5yaWNoIG15IGxvY2FsIERCLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGxhY2luZyBsb2NrIGZvciB0aGlzIG1vZGVsXG4gICAgICAgICAgICAgICAgICAgICAgICB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChtb2RlbE5hbWUgKyAnL2xpc3QnLCB7ZmlsdGVyIDogZmlsdGVyfSxmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGRhdGEsY2FsbEJhY2spXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZWxlYXNlIGxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgbG9ja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9saXN0Jywgc2VuZERhdGEsZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbHRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHT1RfQUxMLnNvdXJjZS5wdXNoKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXQgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICAvLyBzZWFyY2ggb2JqZWN0cyBmcm9tIElEQi4gSWYgc29tZSBpZCBpcyBtaXNzaW5nLCBpdCByZXNvbHZlIGl0IGJ5IHRoZSBzZXJ2ZXJcbiAgICAgICAgLy8gaWYgYSByZXF1ZXN0IHRvIHRoZSBzYW1lIG1vZGVsIGlzIHBlbmRpbmcsIHdhaXQgZm9yIGl0cyBjb21wbGV0aW9uXG4gICAgICAgIFxuICAgICAgICBpZiAoaWRzLmNvbnN0cnVjdG9yICE9PSBBcnJheSl7XG4gICAgICAgICAgICBpZHMgPSBbaWRzXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBzb21lIGVudGl0eSBpcyBtaXNzaW5nIFxuICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUgLCB7aWQ6IGlkc30sIG51bGwsZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgIHZhciBpdGFiID0gSURCW21vZGVsTmFtZV1cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIGlkcyl7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goaXRhYi5zb3VyY2VbaWRzW2lkXV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ290TW9kZWwgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBmb3IgKHZhciBtb2RlbE5hbWUgaW4gZGF0YSkge1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gZGF0YVttb2RlbE5hbWVdO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlWydkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lXSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgICAgICAgICAgbW9kZWxDYWNoZVttb2RlbE5hbWVdID0gbWFrZU1vZGVsQ2xhc3MobW9kZWwpO1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIElEQikpIHtcbiAgICAgICAgICAgICAgICBJREJbbW9kZWxOYW1lXSA9IExhenkoe30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZGVzY3JpYmUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHJldCA9IG1vZGVsQ2FjaGVbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2socmV0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiB3YWl0aW5nQ29ubmVjdGlvbnMpKXtcbiAgICAgICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIGZhaWxlZE1vZGVscyl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgY2FjaGVLZXkgPSAnZGVzY3JpcHRpb246JyArIG1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoY2FjaGVLZXkgaW4gbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ290TW9kZWwoSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2VbY2FjaGVLZXldKSk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVzY3JpYmUnLG51bGwsIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290TW9kZWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLm1vZGVsTm90Rm91bmQuaGFuZGxlKG1vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsZWRNb2RlbHNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgY29ubmVjdGlvblxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZGVzY3JpYmUobW9kZWxOYW1lLCBjYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAgICAgICAgXG4gICAgfTtcbiAgICB0aGlzLmFkZE1vZGVsSGFuZGxlciA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGRlY29yYXRvcikge1xuICAgICAgICB2YXIga2V5ID0gdXRpbHMuaGFzaChkZWNvcmF0b3IpO1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gYnVpbGRlckhhbmRsZXJzKSkgYnVpbGRlckhhbmRsZXJzW21vZGVsTmFtZV0gPSBuZXcgSGFuZGxlcigpO1xuICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gYnVpbGRlckhhbmRsZXJVc2VkKSkgYnVpbGRlckhhbmRsZXJVc2VkW21vZGVsTmFtZV0gPSB7fTtcbiAgICAgICAgaWYgKGtleSBpbiBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXSl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXVtrZXldID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWxOYW1lIGluIG1vZGVsQ2FjaGUpIHtcbiAgICAgICAgICAgIGRlY29yYXRvcihtb2RlbENhY2hlW21vZGVsTmFtZV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVpbGRlckhhbmRsZXJzW21vZGVsTmFtZV0uYWRkSGFuZGxlcihkZWNvcmF0b3IpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzID0gZnVuY3Rpb24obW9kZWxOYW1lLCBhdHRyaWJ1dGVzKXtcbiAgICAgICAgdmFyIGFkZFByb3BlcnR5ID0gZnVuY3Rpb24obW9kZWwsIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICBhdHRyaWJ1dGVzLmZvckVhY2goZnVuY3Rpb24odmFsKXtcbiAgICAgICAgICAgIHZhciBrZXkgPSAncEE6JyArIG1vZGVsLm1vZGVsTmFtZSArICc6JyArIHZhbDtcbiAgICAgICAgICAgIHZhciBrYXR0ciA9ICdfXycgKyB2YWw7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobW9kZWwucHJvdG90eXBlLCB2YWwsIHtcbiAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmICghKGthdHRyIGluIHRoaXMpKXtcbiAgICAgICAgICAgICAgICAgIHZhciB2ID0gbG9jYWxTdG9yYWdlW2tleSArIHRoaXMuaWRdO1xuICAgICAgICAgICAgICAgICAgdGhpc1trYXR0cl0gPSB2P0pTT04ucGFyc2Uodik6bnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNba2F0dHJdO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAgICAgICAgICAgICB0aGlzW2thdHRyXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVtrZXkgKyB0aGlzLmlkXSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBwZXJzaXN0ZW50QXR0cmlidXRlcykpIHsgcGVyc2lzdGVudEF0dHJpYnV0ZXNbbW9kZWxOYW1lXSA9IFtdOyB9XG4gICAgICAgIHZhciBhdHRycyA9IHBlcnNpc3RlbnRBdHRyaWJ1dGVzW21vZGVsTmFtZV07XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICB2YXIgbmV3QXR0cnMgPSBMYXp5KGF0dHJpYnV0ZXMpLmRpZmZlcmVuY2UoYXR0cnMpLnRvQXJyYXkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBuZXdBdHRycyA9IGF0dHJzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZXdBdHRycy5sZW5ndGgpe1xuICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBtb2RlbENhY2hlKXtcbiAgICAgICAgICAgICAgICBhZGRQcm9wZXJ0eShtb2RlbENhY2hlW21vZGVsTmFtZV0sIG5ld0F0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShhdHRycyxuZXdBdHRycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMub24oJ25ldy1tb2RlbCcsIGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgaWYgKG1vZGVsLm1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlcnMpe1xuICAgICAgICAgICAgYnVpbGRlckhhbmRsZXJzW21vZGVsLm1vZGVsTmFtZV0uaGFuZGxlKG1vZGVsQ2FjaGVbbW9kZWwubW9kZWxOYW1lXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1vZGVsLm1vZGVsTmFtZSBpbiBwZXJzaXN0ZW50QXR0cmlidXRlcyl7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyhtb2RlbC5tb2RlbE5hbWUpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5jb25uZWN0ID0gZnVuY3Rpb24oY2FsbEJhY2spe1xuICAgICAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCl7XG4gICAgICAgICAgICBjYWxsQmFjayh0aGlzLmNvbm5lY3Rpb24ub3B0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uY29ubmVjdChmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmlzQ29ubmVjdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhzdGF0dXMpO1xuICAgICAgICAgICAgfSk7ICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMucXVlcnkgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGNhbGxCYWNrKXtcbiAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgIHRoaXMuZGVzY3JpYmUobW9kZWxOYW1lLGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgICAgIC8vIGFycmF5Zml5IGFsbCBmaWx0ZXIgdmFsdWVzXG4gICAgICAgICAgICBmaWx0ZXIgPSBMYXp5KGZpbHRlcikubWFwKGZ1bmN0aW9uKHYsayl7IHJldHVybiBbayxBcnJheS5pc0FycmF5KHYpP3Y6W3ZdXX0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICB2YXIgZmlsdGVyRnVuY3Rpb24gPSB1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIpO1xuICAgICAgICAgICAgdmFyIGlkeCA9IGdldEluZGV4KG1vZGVsTmFtZSk7XG4gICAgICAgICAgICB0aHMuZmV0Y2gobW9kZWxOYW1lLGZpbHRlcix0b2dldGhlciwgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICAgICAgY2FsbEJhY2soaWR4LmZpbHRlcihmaWx0ZXJGdW5jdGlvbikudmFsdWVzKCkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgIH07XG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcywgY2FsbEJhY2spe1xuICAgICAgICByZXR1cm4gdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2RlbGV0ZScsIHsgaWQgOiBpZHN9LCBjYWxsQmFjayk7XG4gICAgfTtcbn07XG5cbmZ1bmN0aW9uIHJlV2hlZWxPUk0oZW5kUG9pbnQsIGxvZ2luRnVuYyl7XG4gICAgdGhpcy4kb3JtID0gbmV3IGJhc2VPUk0obmV3IHV0aWxzLnJlV2hlZWxDb25uZWN0aW9uKGVuZFBvaW50LCBsb2dpbkZ1bmMpLHRoaXMpO1xuICAgIHRoaXMub24gPSB0aGlzLiRvcm0ub24uYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuZW1pdCA9IHRoaXMuJG9ybS5lbWl0LmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLnVuYmluZCA9IHRoaXMuJG9ybS51bmJpbmQuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gdGhpcy4kb3JtLmFkZE1vZGVsSGFuZGxlci5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcyA9IHRoaXMuJG9ybS5hZGRQZXJzaXN0ZW50QXR0cmlidXRlcy5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy51dGlscyA9IHV0aWxzO1xufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXRNb2RlbCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5kZXNjcmliZShtb2RlbE5hbWUsYWNjZXB0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn1cblxucmVXaGVlbE9STS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obW9kZWxOYW1lLCBpZHMpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc2luZ2xlID0gZmFsc2U7XG4gICAgdmFyIG1vZE5hbWUgPSBtb2RlbE5hbWU7XG4gICAgaWYgKGlkcy5jb25zdHJ1Y3RvciAhPT0gQXJyYXkpe1xuICAgICAgICBzaW5nbGUgPSB0cnVlO1xuICAgICAgICBpZHMgPSBbaWRzXVxuICAgIH1cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmIChzaW5nbGUpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZ2V0KG1vZE5hbWUsIGlkcywgZnVuY3Rpb24oaXRlbXMpeyBcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChpdGVtc1swXSk7fVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5nZXQobW9kTmFtZSwgaWRzLCBhY2NlcHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxucmVXaGVlbE9STS5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBmaWx0ZXIsIHJlbGF0ZWQpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB2YXIgdG9nZXRoZXIgPSBudWxsO1xuICAgICAgICBpZiAocmVsYXRlZCAmJiAocmVsYXRlZC5jb25zdHJ1Y3RvciA9PT0gQXJyYXkpICYmIChyZWxhdGVkLmxlbmd0aCkpe1xuICAgICAgICAgICAgdG9nZXRoZXIgPSByZWxhdGVkO1xuICAgICAgICB9IGVsc2UgaWYgKHJlbGF0ZWQgJiYgKHJlbGF0ZWQuY29uc3RydWN0b3IgPT09IFN0cmluZykgJiYgKHJlbGF0ZWQubGVuZ3RoKSl7XG4gICAgICAgICAgICB0b2dldGhlciA9IHJlbGF0ZWQuc3BsaXQoJywnKTtcbiAgICAgICAgfVxuICAgICAgICB0cnl7XG4gICAgICAgICAgICBpZiAoc2VsZi4kb3JtLmlzQ29ubmVjdGVkKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRvcm0ucXVlcnkobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBhY2NlcHQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBpZHMpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oYWNjZXB0LCByZWplY3Qpe1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBpZiAoc2VsZi4kb3JtLmNvbm5lY3RlZCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlbGV0ZShtb2RlbE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlbGV0ZShtb2RlbE5hbWUsIGlkcywgYWNjZXB0KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KVxufTtcblxuXG4iXX0=
