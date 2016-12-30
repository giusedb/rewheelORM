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
            }, function (status) {
                for (var x in status) {
                    connection.options[x] = status[x];
                }
                accept(status);
            }, function (xhr, data, status) {
                reject(xhr.responseJSON);
            }, null, connection.options.token, true);    /*        $.ajax({
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
                req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                if (!formEncode) {
                    data = { args: JSON.stringify(data) };
                }
                if (token) {
                    data.token = token;
                }
                if (application) {
                    data.application = application;
                }
                data = Lazy(data).map(function (v, k) {
                    return k + '=' + encodeURI(v.toString());
                }).toArray().join('&');
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
                        self.handlers.onMessageJson.handle($.parseJSON(x.data));    //TODO unset fromRealtime
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
                    return true;    // return !fields[x].writable;
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
                return !('deleted' in v) || k in W2PRESOURCE.modelCache;
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzLmpzIiwidXRpbHMuanMiLCJ0b3VjaGVyLmpzIiwidmFjdXVtY2FjaGVyLmpzIiwiYXV0b2xpbmtlci5qcyIsImxpc3RjYWNoZXIuanMiLCJtYW55dG9tYW55LmpzIiwiY2FjaGVyLmpzIiwib3JtLmpzIl0sIm5hbWVzIjpbIkhhbmRsZXIiLCJoYW5kbGVycyIsInN0ckhhbmRsZXJzIiwicHJvdG90eXBlIiwiYWRkSGFuZGxlciIsImhhbmRsZXIiLCJzdHJIYW5kbGVyIiwidXRpbHMiLCJoYXNoIiwidG9TdHJpbmciLCJwdXNoIiwiaGFuZGxlIiwiYXJncyIsIkFycmF5Iiwic2xpY2UiLCJjYWxsIiwiYXJndW1lbnRzIiwiZm9yRWFjaCIsImZ1bmMiLCJhcHBseSIsImhhbmRsZUJ5IiwidGhzIiwiTmFtZWRFdmVudE1hbmFnZXIiLCJldmVudHMiLCJoYW5kbGVySWQiLCJpZHhJZCIsIm9uIiwibmFtZSIsImlkIiwiZW1pdCIsImV2ZW50IiwidW5iaW5kIiwiY291bnQiLCJMYXp5IiwiZWFjaCIsInYiLCJrIiwiaWR4IiwibiIsInJldmVyc2UiLCJ4Iiwic3BsaWNlIiwiY2FjaGVkS2V5SWR4IiwiJFBPU1QiLCJ1cmwiLCJkYXRhIiwiY2FsbEJhY2siLCJlcnJvckJhY2siLCJoZWFkZXJzIiwib3B0cyIsImFjY2VwdHMiLCJKU09OIiwic3RyaW5naWZ5IiwiZGF0YVR5cGUiLCJzdWNjZXNzIiwiZXJyb3IiLCJtZXRob2QiLCJjb250ZW50VHlwZSIsImNyb3NzRG9tYWluIiwiJCIsImFqYXgiLCJyZVdoZWVsQ29ubmVjdGlvbiIsImVuZFBvaW50IiwiZ2V0TG9naW4iLCJzZWxmIiwiYmluZCIsIm9wdGlvbnMiLCJzdGF0dXMiLCJmb3JjZSIsImxvY2FsU3RvcmFnZSIsInBhcnNlIiwibGFzdFJXVFN0YXR1cyIsImUiLCJfc3RhdHVzX2NhbGxpbmciLCJzZXRUaW1lb3V0IiwidGltZXN0YW1wIiwiJHBvc3QiLCJ1c2VyX2lkIiwibG9nSW5mbyIsImNvbnN0cnVjdG9yIiwiT2JqZWN0IiwibG9naW4iLCJ1c2VybmFtZSIsInBhc3N3b3JkIiwidGhlbiIsInRva2VuIiwiYXBwbGljYXRpb24iLCJwcm9taXNlIiwieGRyIiwieGhyIiwicmVzcG9uc2VUZXh0IiwicmVzcG9uc2VEYXRhIiwiY29ubmVjdGlvbiIsIlByb21pc2UiLCJhY2NlcHQiLCJyZWplY3QiLCJyZXNwb25zZUpTT04iLCJjb25uZWN0Iiwid3Njb25uZWN0Iiwid3NDb25uZWN0aW9uIiwid3NDb25uZWN0Iiwib25Db25uZWN0Iiwib25EaXNjb25uZWN0IiwiY29uc29sZSIsImxvZyIsInJlYWx0aW1lRW5kUG9pbnQiLCJyZW5hbWVGdW5jdGlvbiIsImZuIiwiRnVuY3Rpb24iLCJjYWNoZWQiLCJrZXkiLCJ3cmFwcGVyIiwiZm9ybUVuY29kZSIsInJlcSIsIlhNTEh0dHBSZXF1ZXN0Iiwib25yZWFkeXN0YXRlY2hhbmdlIiwicmVhZHlTdGF0ZSIsImEiLCJyZXNwb25zZSIsInN0YXR1c1RleHQiLCJyZXF1ZXN0IiwiWERvbWFpblJlcXVlc3QiLCJvbmxvYWQiLCJFcnJvciIsIm9wZW4iLCJvbmVycm9yIiwic2V0UmVxdWVzdEhlYWRlciIsIm1hcCIsImVuY29kZVVSSSIsInRvQXJyYXkiLCJqb2luIiwic2VuZCIsImNhcGl0YWxpemUiLCJzIiwidG9VcHBlckNhc2UiLCJ0b0xvd2VyQ2FzZSIsInN0ciIsInJldCIsImxlbmd0aCIsImNoYXJDb2RlQXQiLCJtYWtlRmlsdGVyIiwibW9kZWwiLCJmaWx0ZXIiLCJ1bmlmaWVyIiwiZG9udFRyYW5zbGF0ZUZpbHRlciIsInNpemUiLCJzb3VyY2UiLCJ2YWxzIiwiZmllbGQiLCJpc0FycmF5IiwiZmllbGRzIiwidHlwZSIsIk51bWJlciIsInNhbWVBcyIsInkiLCJ3aXphcmQiLCJvbkNvbm5lY3Rpb24iLCJvbkRpc2Nvbm5lY3Rpb24iLCJvbk1lc3NhZ2VKc29uIiwib25NZXNzYWdlVGV4dCIsIm9uV2l6YXJkIiwiU29ja0pTIiwib25vcGVuIiwidGVuYW50Iiwib25tZXNzYWdlIiwicGFyc2VKU09OIiwib25jbG9zZSIsInBsdXJhbGl6ZSIsImJlZm9yZUNhbGwiLCJiZWZvcmUiLCJkZWNvcmF0b3IiLCJjbGVhblN0b3JhZ2UiLCJrZXlzIiwiY2hyIiwic3BsaXQiLCJwZXJtdXRhdGlvbnMiLCJhcnIiLCJib29sIiwiQm9vbGVhbiIsIm5vb3AiLCJ0ek9mZnNldCIsIkRhdGUiLCJnZXRUaW1lem9uZU9mZnNldCIsIlRvdWNoZXIiLCJ0b3VjaGVkIiwidG91Y2giLCJ0IiwiVmFjdXVtQ2FjaGVyIiwiYXNrZWQiLCJtaXNzaW5nIiwiYXNrIiwibGF6eSIsImNvbnRhaW5zIiwiZ2V0QXNrZWRJbmRleCIsIm1pc3NpbmdzIiwidW5pcXVlIiwiQXV0b0xpbmtlciIsImFjdGl2ZXMiLCJJREIiLCJXMlBSRVNPVVJDRSIsImxpc3RDYWNoZSIsIm1haW5JbmRleCIsImZvcmVpZ25LZXlzIiwibTJtIiwibTJtSW5kZXgiLCJwZXJtaXNzaW9ucyIsInBrSW5kZXgiLCJnZXRJbmRleEZvciIsInJlZmVyZW5jZXMiLCJyZWZlcmVuY2UiLCJpbmRleE5hbWUiLCJ0byIsInJlZmVyZW5jZWRCeSIsImJ5IiwibWFueVRvTWFueSIsInJlbGF0aW9uIiwiTWFueVRvTWFueVJlbGF0aW9uIiwibTJtR2V0IiwiY29sbGVjdGlvbiIsImdvdERhdGEiLCJnZXRNMk0iLCJsaW5rVW5saW5rZWQiLCJ2YWx1ZXMiLCJzdW0iLCJjaGFuZ2VkIiwiaW5kZXhlcyIsImluZGV4IiwicGFyc2VJbnQiLCJJTkRFWCIsImdldHRlciIsImlkcyIsIm90aGVySW5kZXgiLCJkZXNjcmliZSIsImZsYXR0ZW4iLCJtb2RlbE5hbWUiLCJpZGIiLCJmZXRjaCIsIm1haW5SZXNvdXJjZSIsImZpZWxkTmFtZSIsInRvT2JqZWN0IiwicmVzb3VyY2VOYW1lIiwiZ290UGVybWlzc2lvbnMiLCJQRVJNSVNTSU9OUyIsInNldEludGVydmFsIiwiTGlzdENhY2hlciIsImdvdEFsbCIsImNvbXBvc2l0ZUFza2VkIiwiY2FydGVzaWFuUHJvZHVjdDEiLCJiIiwiY2FydGVzaWFuUHJvZHVjdCIsImV4cGxvZGVGaWx0ZXIiLCJwcm9kdWN0IiwiciIsImZpbHRlclNpbmdsZSIsInRlc3RPbmx5IiwiZGlmZmVyZW5jZSIsImNsZWFuQ29tcG9zaXRlcyIsImZpbHRlckxlbiIsIml0ZW1zIiwiaXRlbSIsImdvdCIsInNpbmdsZSIsInNvbWUiLCJmIiwiZXhwbG9kZWQiLCJwYXJ0aWFscyIsImJhZCIsInBsdWNrIiwiYWRkIiwiZmluZCIsImdldDAiLCJnZXQxIiwiZGVsIiwibCIsImNhY2hlZFByb3BlcnR5QnlFdmVudHMiLCJwcm90byIsInByb3BlcnR5TmFtZSIsInNldHRlciIsInJlc3VsdCIsIm9ybSIsInByb3BlcnR5RGVmIiwiZ2V0IiwidmFsdWUiLCJkZWZpbmVQcm9wZXJ0eSIsIlZhbGlkYXRpb25FcnJvciIsInJlc291cmNlIiwiX3Jlc291cmNlIiwiZm9ybUlkeCIsImVycm9ycyIsImJhc2VPUk0iLCJleHRPUk0iLCJTdHJpbmciLCJjb25uZWN0ZWQiLCJ3cyIsImluZm8iLCJtZXNzYWdlIiwic2VudERhdGEiLCJ3YWl0aW5nQ29ubmVjdGlvbnMiLCJhdXRoX2dyb3VwIiwiSURYIiwiUkVWSURYIiwiYnVpbGRlckhhbmRsZXJzIiwiYnVpbGRlckhhbmRsZXJVc2VkIiwicGVyc2lzdGVudEF0dHJpYnV0ZXMiLCJldmVudEhhbmRsZXJzIiwicGVybWlzc2lvbldhaXRpbmciLCJtb2RlbENhY2hlIiwiZmFpbGVkTW9kZWxzIiwibGlua2VyIiwidmFsaWRhdGlvbkV2ZW50IiwiY3VycmVudENvbnRleHQiLCJzYXZpbmdFcnJvckhhbmxkZXIiLCJnZXRJbmRleCIsImdldFVubGlua2VkIiwiVU5MSU5LRUQiLCJQZXJtaXNzaW9uVGFibGUiLCJrbGFzcyIsInNhdmUiLCJjYiIsIm15UGVybXMiLCJncm91cF9pZCIsInBlcm1pc3Npb25MaXN0IiwicCIsInBlcm1zIiwiYWxsUGVybWlzc2lvbnMiLCJpbmRleE9mIiwibWFrZU1vZGVsQ2xhc3MiLCJfbW9kZWwiLCJwcml2YXRlQXJncyIsIm1lcmdlIiwiZnVuY1N0cmluZyIsIktsYXNzIiwicmVmX3RyYW5zbGF0aW9ucyIsImludmVyc2VfcmVmZXJlbmNlcyIsInJlZmVyZW50cyIsImZpZWxkc09yZGVyIiwiZmllbGRPcmRlciIsInJlcHJlc2VudGF0aW9uIiwiZGVsZXRlIiwiX3Blcm1pc3Npb25zIiwiYWxsX3Blcm1zIiwib2JqZWN0X2lkIiwiZ3JvdXBlZCIsInVua25vd25fZ3JvdXBzIiwiZ3JvdXBCeSIsIm8iLCJhc1JhdyIsIklEIiwiYXJnIiwiY29udGV4dCIsImNvcHkiLCJvYmoiLCJhc3IiLCJjb25jYXQiLCJzYXZlTXVsdGkiLCJvYmplY3RzIiwic2NvcGUiLCJyYXciLCJkZWxldGFibGUiLCJ3cml0YWJsZSIsIm11bHRpcGxlIiwiZWxlbXMiLCJ0YWIiLCJvYmpzIiwicmVzdWx0cyIsImV4dHJhX3ZlcmJzIiwiZnVuY05hbWUiLCJkZGF0YSIsInNhdmVQQSIsIlQiLCJvbyIsIlBBIiwiRnMiLCJmaWVsZElkeCIsInRhcCIsImluZGV4QnkiLCJyZWYiLCJleHRfcmVmIiwibG9jYWxfcmVmIiwiVHlwZUVycm9yIiwicmV2SW5kZXgiLCJoYXNPd25Qcm9wZXJ0eSIsIiRsb2ciLCJxdWVyeSIsImZpcnN0Iiwib21vZGVsTmFtZSIsInJlYWRhYmxlIiwidmFsaWRhdG9ycyIsInVubGlua1JlZmVyZW5jZSIsImluc3RhbmNlIiwiaW5zdGFuY2VzIiwib21vZGVsIiwibGlua1JlZmVyZW5jZSIsInJlZnMiLCJJTkRFWF9NMk0iLCJXMlBfUE9TVCIsIl9leHRyYSIsIlRPT05FIiwiVE9NQU5ZIiwiTUFOWVRPTUFOWSIsIm1vZGVsQ2xhc3MiLCJ6aXAiLCJkZWxldGVkIiwiTVBBIiwicmVjb3JkIiwiaXRhYiIsInRhYmxlIiwiaWsiLCJubmV3IiwidXBkYXRlZCIsIm5ld09iamVjdHMiLCJvbGRJdGVtIiwib2xkQ29weSIsIm5ld0l0ZW0iLCJubyIsInRvdGFsUmVzdWx0cyIsInVkeCIsIkFTS0VEX1VOTElOS0VEIiwiQVNLRURfTTJNIiwiTUlEWCIsImdvdE0yTSIsInJvdyIsIm0iLCJ2ZXJiIiwidG9nZXRoZXIiLCJzZW5kRGF0YSIsIkdPVF9BTEwiLCJnb3RNb2RlbCIsImNhY2hlS2V5IiwibW9kZWxOb3RGb3VuZCIsImFkZE1vZGVsSGFuZGxlciIsImFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzIiwiYXR0cmlidXRlcyIsImFkZFByb3BlcnR5IiwidmFsIiwia2F0dHIiLCJzZXQiLCJhdHRycyIsIm5ld0F0dHJzIiwiaXNDb25uZWN0ZWQiLCJmaWx0ZXJGdW5jdGlvbiIsInJlV2hlZWxPUk0iLCJsb2dpbkZ1bmMiLCIkb3JtIiwiZ2V0TW9kZWwiLCJtb2ROYW1lIiwicmVsYXRlZCJdLCJtYXBwaW5ncyI6Ijs7O0lBQUEsYTtJQUVBLFNBQUFBLE9BQUEsR0FBQTtBQUFBLFFBQ0EsS0FBQUMsUUFBQSxHQUFBLEVBQUEsQ0FEQTtBQUFBLFFBRUEsS0FBQUMsV0FBQSxHQUFBLEVBQUEsQ0FGQTtBQUFBLEs7SUFHQSxDO0lBRUFGLE9BQUEsQ0FBQUcsU0FBQSxDQUFBQyxVQUFBLEdBQUEsVUFBQUMsT0FBQSxFQUFBO0FBQUEsUUFDQSxJQUFBQyxVQUFBLEdBQUFDLEtBQUEsQ0FBQUMsSUFBQSxDQUFBSCxPQUFBLENBQUFJLFFBQUEsRUFBQSxDQUFBLENBREE7QUFBQSxRQUVBLElBQUEsQ0FBQSxDQUFBSCxVQUFBLElBQUEsS0FBQUosV0FBQSxDQUFBLEVBQUE7QUFBQSxZQUNBLEtBQUFBLFdBQUEsQ0FBQUksVUFBQSxJQUFBRCxPQUFBLENBREE7QUFBQSxZQUVBLEtBQUFKLFFBQUEsQ0FBQVMsSUFBQSxDQUFBTCxPQUFBLEVBRkE7QUFBQSxTQUZBO0FBQUEsS0FBQSxDO0lBT0FMLE9BQUEsQ0FBQUcsU0FBQSxDQUFBUSxNQUFBLEdBQUEsWUFBQTtBQUFBLFFBQ0EsSUFBQUMsSUFBQSxHQUFBQyxLQUFBLENBQUFWLFNBQUEsQ0FBQVcsS0FBQSxDQUFBQyxJQUFB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QUE1RixNQUFBLEVBQUEwUixRQUFBLEVBQUExVSxNQUFBLEVBREE7QUFBQSxxQkFBQSxFQURBO0FBQUEsaUJBSEE7QUFBQSxhQUFBLENBUUEsT0FBQXRCLENBQUEsRUFBQTtBQUFBLGdCQUNBdUIsTUFBQSxDQUFBdkIsQ0FBQSxFQURBO0FBQUEsYUFmQTtBQUFBLFNBQUEsQ0FBQSxDQUZBO0FBQUEsS0FBQSxDO0lBdUJBaVgsVUFBQSxDQUFBdGIsU0FBQSxDQUFBK1UsTUFBQSxHQUFBLFVBQUF4RyxTQUFBLEVBQUFKLEdBQUEsRUFBQTtBQUFBLFFBQ0EsSUFBQXRLLElBQUEsR0FBQSxJQUFBLENBREE7QUFBQSxRQUVBLE9BQUEsSUFBQTZCLE9BQUEsQ0FBQSxVQUFBQyxNQUFBLEVBQUFDLE1BQUEsRUFBQTtBQUFBLFlBQ0EsSUFBQTtBQUFBLGdCQUNBLElBQUEvQixJQUFBLENBQUEyWCxJQUFBLENBQUF2SixTQUFBLEVBQUE7QUFBQSxvQkFDQXBPLElBQUEsQ0FBQTJYLElBQUEsQ0FBQXpHLE1BQUEsQ0FBQXhHLFNBQUEsRUFBQUosR0FBQSxFQUFBeEksTUFBQSxFQURBO0FBQUEsaUJBQUEsTUFFQTtBQUFBLG9CQUNBOUIsSUFBQSxDQUFBMlgsSUFBQSxDQUFBMVYsT0FBQSxDQUFBLFlBQUE7QUFBQSx3QkFDQWpDLElBQUEsQ0FBQTJYLElBQUEsQ0FBQXpHLE1BQUEsQ0FBQXhHLFNBQUEsRUFBQUosR0FBQSxFQUFBeEksTUFBQSxFQURBO0FBQUEscUJBQUEsRUFEQTtBQUFBLGlCQUhBO0FBQUEsYUFBQSxDQVFBLE9BQUF0QixDQUFBLEVBQUE7QUFBQSxnQkFDQXVCLE1BQUEsQ0FBQXZCLENBQUEsRUFEQTtBQUFBLGFBVEE7QUFBQSxTQUFBLENBQUEsQ0FGQTtBQUFBLEtBQUEsQyIsImZpbGUiOiJyd3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEhhbmRsZXIoKXtcbiAgICB0aGlzLmhhbmRsZXJzID0gW107XG4gICAgdGhpcy5zdHJIYW5kbGVycyA9IHt9O1xufTtcblxuSGFuZGxlci5wcm90b3R5cGUuYWRkSGFuZGxlciA9IGZ1bmN0aW9uIChoYW5kbGVyKXtcbiAgICB2YXIgc3RySGFuZGxlciA9IHV0aWxzLmhhc2goaGFuZGxlci50b1N0cmluZygpKTtcbiAgICBpZiAoIShzdHJIYW5kbGVyIGluIHRoaXMuc3RySGFuZGxlcnMpKXtcbiAgICAgICAgdGhpcy5zdHJIYW5kbGVyc1tzdHJIYW5kbGVyXSA9IGhhbmRsZXI7XG4gICAgICAgIHRoaXMuaGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9XG59O1xuSGFuZGxlci5wcm90b3R5cGUuaGFuZGxlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywwKTtcbiAgICB0aGlzLmhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oZnVuYyl7XG4gICAgICAgIGZ1bmMuYXBwbHkobnVsbCxhcmdzKTtcbiAgICB9KVxufTtcbkhhbmRsZXIucHJvdG90eXBlLmhhbmRsZUJ5ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKTtcbiAgICB2YXIgdGhzID0gYXJndW1lbnRzWzBdO1xuICAgIHRoaXMuaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihmdW5jKXtcbiAgICAgICAgZnVuYy5hcHBseSh0aHMsYXJncyk7XG4gICAgfSlcbn07XG5cblxuZnVuY3Rpb24gTmFtZWRFdmVudE1hbmFnZXIgKCl7XG4gICAgdmFyIGV2ZW50cyA9IHt9O1xuICAgIHZhciBoYW5kbGVySWQgPSB7fTtcbiAgICB2YXIgaWR4SWQgPSAwO1xuICAgIHRoaXMub24gPSBmdW5jdGlvbihuYW1lLCBmdW5jKXtcbiAgICAgICAgaWYgKCEobmFtZSBpbiBldmVudHMpKXtcbiAgICAgICAgICAgIGV2ZW50c1tuYW1lXSA9IG5ldyBBcnJheSgpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpZCA9IGlkeElkICsrO1xuICAgICAgICBldmVudHNbbmFtZV0ucHVzaChmdW5jKTtcbiAgICAgICAgaGFuZGxlcklkW2lkXSA9IGZ1bmM7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9O1xuICAgIHRoaXMuZW1pdCA9IGZ1bmN0aW9uKG5hbWUpe1xuICAgICAgICBpZiAobmFtZSBpbiBldmVudHMpe1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSk7XG4gICAgICAgICAgICBldmVudHNbbmFtZV0uZm9yRWFjaChmdW5jdGlvbihldmVudCl7XG4gICAgICAgICAgICAgICAgZXZlbnQuYXBwbHkobnVsbCxhcmdzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLnVuYmluZCA9IGZ1bmN0aW9uKGhhbmRsZXIpe1xuICAgICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgICBpZiAoaGFuZGxlciBpbiBoYW5kbGVySWQpe1xuICAgICAgICAgICAgdmFyIGZ1bmMgPSBoYW5kbGVySWRbaGFuZGxlciArICcnXTtcbiAgICAgICAgICAgIExhenkoZXZlbnRzKS5lYWNoKGZ1bmN0aW9uKHYsayl7XG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIG4gaW4gdil7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2W25dID09PSBmdW5jKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkeC5wdXNoKG4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZHgucmV2ZXJzZSgpLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgIHYuc3BsaWNlKHgsMSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgaGFuZGxlcklkW2hhbmRsZXJdO1xuICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgfTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNhY2hlZEtleUlkeCA9IDA7XG5cbnZhciAkUE9TVCA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgY2FsbEJhY2ssIGVycm9yQmFjayxoZWFkZXJzKXtcbiAgICB2YXIgb3B0cyA9IHtcbiAgICAgICAgYWNjZXB0cyA6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgdXJsIDogdXJsLFxuICAgICAgICBkYXRhIDogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIGRhdGFUeXBlIDogJ2pzb24nLFxuICAgICAgICBzdWNjZXNzIDogY2FsbEJhY2ssXG4gICAgICAgIGVycm9yIDogZXJyb3JCYWNrLFxuICAgICAgICBtZXRob2QgOiAnUE9TVCcsXG4gICAgICAgIGNvbnRlbnRUeXBlIDogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgfTtcbiAgICBpZiAoaGVhZGVycyl7XG4gICAgICAgIG9wdHMuaGVhZGVycyA9IGhlYWRlcnM7XG4gICAgICAgIG9wdHMuY3Jvc3NEb21haW4gPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gJC5hamF4KG9wdHMpO1xufVxuXG5mdW5jdGlvbiByZVdoZWVsQ29ubmVjdGlvbihlbmRQb2ludCwgZ2V0TG9naW4pe1xuICAgIC8vIG1haW4gXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZ2V0TG9naW4gPSBnZXRMb2dpbjtcbiAgICB0aGlzLmV2ZW50cyA9IG5ldyBOYW1lZEV2ZW50TWFuYWdlcigpXG4gICAgdGhpcy4kUE9TVCA9ICRQT1NULmJpbmQodGhpcyk7XG4gICAgdGhpcy5vcHRpb25zID0ge2VuZFBvaW50IDogZW5kUG9pbnR9O1xuICAgIHRoaXMub24gPSB0aGlzLmV2ZW50cy5vbi5iaW5kKHRoaXMpO1xufTtcbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5zdGF0dXMgPSBmdW5jdGlvbihjYWxsQmFjaywgZm9yY2Upe1xuICAgIGlmICgoJ2xhc3RSV1RTdGF0dXMnIGluIGxvY2FsU3RvcmFnZSkgJiYgIWZvcmNlKSB7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHZhciBzdGF0dXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzKTtcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gc3RhdHVzKXsgdGhpcy5vcHRpb25zW3hdID0gc3RhdHVzW3hdOyB9XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzKGNhbGxCYWNrLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2FsbEJhY2sgJiYgY2FsbEJhY2soc3RhdHVzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3N0YXR1c19jYWxsaW5nKXtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5zdGF0dXMoY2FsbEJhY2spO1xuICAgICAgICB9LDUwKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMudGltZXN0YW1wKXtcbiAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sodGhpcy5vcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGF0dXNfY2FsbGluZyA9IHRydWU7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHRoaXMuJHBvc3QoJ2FwaS9zdGF0dXMnLG51bGwsZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgICAgIHNlbGYuX3N0YXR1c19jYWxsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IgKHZhciB4IGluIHN0YXR1cyl7IHNlbGYub3B0aW9uc1t4XSA9IHN0YXR1c1t4XTsgfVxuICAgICAgICAgICAgaWYgKCFzdGF0dXMudXNlcl9pZCAmJiBzZWxmLmdldExvZ2luKXtcbiAgICAgICAgICAgICAgICB2YXIgbG9nSW5mbyA9IHNlbGYuZ2V0TG9naW4oKTtcbiAgICAgICAgICAgICAgICBpZiAobG9nSW5mby5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5sb2dpbihsb2dJbmZvLnVzZXJuYW1lLCBsb2dJbmZvLnBhc3N3b3JkKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihzdGF0dXMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgeCBpbiBzdGF0dXMpeyBzZWxmLm9wdGlvbnNbeF0gPSBzdGF0dXNbeF07IH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5sYXN0UldUU3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHN0YXR1cylcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKHNlbGYub3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgfVxufTtcblxucmVXaGVlbENvbm5lY3Rpb24ucHJvdG90eXBlLiRwb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLGNhbGxCYWNrKXtcbiAgICB2YXIgdGhzID0gdGhpcztcbiAgICBpZiAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIGlmICghZGF0YSl7XG4gICAgICAgICAgICBkYXRhID0ge307XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy50b2tlbil7XG4gICAgICAgIHZhciBoZWFkZXJzID0geyBcbiAgICAgICAgICAgIHRva2VuIDogdGhpcy5vcHRpb25zLnRva2VuLFxuICAgICAgICAgICAgYXBwbGljYXRpb24gOiB0aGlzLm9wdGlvbnMuYXBwbGljYXRpb25cbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaGVhZGVycyA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2UgPSB1dGlscy54ZHIodGhpcy5vcHRpb25zLmVuZFBvaW50ICsgdXJsLCBkYXRhLCB0aGlzLm9wdGlvbnMuYXBwbGljYXRpb24sIHRoaXMub3B0aW9ucy50b2tlbilcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oeGhyKXtcbiAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnaHR0cC1yZXNwb25zZScsIHhoci5yZXNwb25zZVRleHQsIHhoci5zdGF0dXMsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2h0dHAtcmVzcG9uc2UtJyArIHhoci5zdGF0dXMsIHhoci5yZXNwb25zZVRleHQsIHVybCwgZGF0YSk7XG4gICAgICAgICAgICBpZiAoeGhyLnJlc3BvbnNlRGF0YSl7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdodHRwLXJlc3BvbnNlLScgKyB4aHIuc3RhdHVzICsgJy1qc29uJywgeGhyLnJlc3BvbnNlRGF0YSwgdXJsLCBkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjYWxsQmFjaykgeyBjYWxsQmFjayggeGhyLnJlc3BvbnNlRGF0YSB8fCB4aHIucmVzcG9uc2VUZXh0ICl9O1xuICAgICAgICB9LCBmdW5jdGlvbih4aHIpIHtcbiAgICAgICAgICAgIGlmICh4aHIucmVzcG9uc2VEYXRhKXtcbiAgICAgICAgICAgICAgICB0aHMuZXZlbnRzLmVtaXQoJ2Vycm9yLWpzb24nLCB4aHIucmVzcG9uc2VEYXRhLCB4aHIuc3RhdHVzLCB1cmwsIGRhdGEsIHhocik7XG4gICAgICAgICAgICAgICAgdGhzLmV2ZW50cy5lbWl0KCdlcnJvci1qc29uLScgKyB4aHIuc3RhdHVzLCB4aHIucmVzcG9uc2VEYXRhLHVybCwgZGF0YSwgeGhyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItaHR0cCcseGhyLnJlc3BvbnNlVGV4dCwgeGhyLnN0YXR1cyx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgICAgIHRocy5ldmVudHMuZW1pdCgnZXJyb3ItaHR0cC0nICsgeGhyLnN0YXR1cywgeGhyLnJlc3BvbnNlVGV4dCx1cmwsZGF0YSx4aHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5yZVdoZWVsQ29ubmVjdGlvbi5wcm90b3R5cGUubG9naW4gPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpe1xuICAgIHZhciB1cmwgPSB0aGlzLm9wdGlvbnMuZW5kUG9pbnQgKyAnYXBpL2xvZ2luJztcbiAgICB2YXIgY29ubmVjdGlvbiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCxyZWplY3Qpe1xuICAgICAgICB1dGlscy54ZHIodXJsLHsgdXNlcm5hbWU6IHVzZXJuYW1lLCBwYXNzd29yZCA6IHBhc3N3b3JkfSwgZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB4IGluIHN0YXR1cyl7IGNvbm5lY3Rpb24ub3B0aW9uc1t4XSA9IHN0YXR1c1t4XTsgfVxuICAgICAgICAgICAgICAgIGFjY2VwdChzdGF0dXMpO1xuICAgICAgICB9LCBmdW5jdGlvbih4aHIsZGF0YSwgc3RhdHVzKXtcbiAgICAgICAgICAgIHJlamVjdCh4aHIucmVzcG9uc2VKU09OKTtcbiAgICAgICAgfSxudWxsLGNvbm5lY3Rpb24ub3B0aW9ucy50b2tlbiwgdHJ1ZSk7XG4vKiAgICAgICAgJC5hamF4KHtcbi8vICAgICAgICAgICAgaGVhZGVycyA6IGhlYWRlcnMsXG4gICAgICAgICAgICB1cmwgOiB1cmwsXG4gICAgICAgICAgICBkYXRhIDogeyB1c2VybmFtZTogdXNlcm5hbWUsIHBhc3N3b3JkIDogcGFzc3dvcmR9LFxuICAgICAgICAgICAgZGF0YVR5cGUgOiAnanNvbicsXG4gICAgICAgICAgICBtZXRob2QgOiAnUE9TVCcsXG4vLyAgICAgICAgICAgIGNvbnRlbnRUeXBlIDogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgbWltZVR5cGUgOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICBjcm9zc0RvbWFpbiA6IHRydWUsXG4gICAgICAgICAgICBzdWNjZXNzIDogZnVuY3Rpb24oc3RhdHVzKXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB4IGluIHN0YXR1cyl7IGNvbm5lY3Rpb24ub3B0aW9uc1t4XSA9IHN0YXR1c1t4XTsgfVxuICAgICAgICAgICAgICAgIGFjY2VwdChzdGF0dXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yIDogZnVuY3Rpb24oeGhyLGRhdGEsIHN0YXR1cyl7XG4gICAgICAgICAgICAgICAgcmVqZWN0KHhoci5yZXNwb25zZUpTT04pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0pXG4qL1xuICAgIH0pO1xufTtcbnJlV2hlZWxDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oY2FsbEJhY2spe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgd3Njb25uZWN0ID0gZnVuY3Rpb24oc2VsZil7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uID0gbmV3IHV0aWxzLndzQ29ubmVjdChzZWxmLm9wdGlvbnMpO1xuICAgICAgICBzZWxmLndzQ29ubmVjdGlvbi5vbkNvbm5lY3QoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYuZXZlbnRzLmVtaXQoJ3dzLWNvbm5lY3RlZCcsIHNlbGYud3NDb25uZWN0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNlbGYud3NDb25uZWN0aW9uLm9uRGlzY29ubmVjdChmdW5jdGlvbigpeyBcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICB3c2Nvbm5lY3Qoc2VsZik7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSwxMDAwKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuc3RhdHVzKGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgIGlmICgndG9rZW4nIGluIHNlbGYub3B0aW9ucyl7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhzdGF0dXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3RpbmcgdG8gJyArIHNlbGYub3B0aW9ucy5lbmRQb2ludCk7XG4gICAgICAgICAgICBpZiAoc2VsZi5vcHRpb25zLnVzZXJuYW1lICYmIHNlbGYub3B0aW9ucy5wYXNzd29yZCl7XG4gICAgICAgICAgICAgICAgc2VsZi5sb2dpbihcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zLnVzZXJuYW1lLFxuICAgICAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMucGFzc3dvcmQsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2soZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncmVuZXdpbmcgY29ubmVjdGlvbicpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXR1cy50b2tlbiAmJiBzdGF0dXMucmVhbHRpbWVFbmRQb2ludCAmJiAoIXNlbGYud3NDb25uZWN0aW9uKSl7XG4gICAgICAgICAgICB3c2Nvbm5lY3Qoc2VsZik7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbnZhciB1dGlscyA9IHtcbiAgICByZW5hbWVGdW5jdGlvbiA6IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICAgICAgICByZXR1cm4gKG5ldyBGdW5jdGlvbihcInJldHVybiBmdW5jdGlvbiAoY2FsbCkgeyByZXR1cm4gZnVuY3Rpb24gXCIgKyBuYW1lICtcbiAgICAgICAgICAgIFwiICgpIHsgcmV0dXJuIGNhbGwodGhpcywgYXJndW1lbnRzKSB9OyB9O1wiKSgpKShGdW5jdGlvbi5hcHBseS5iaW5kKGZuKSk7XG4gICAgfSxcbiAgICBjYWNoZWQgOiBmdW5jdGlvbihmdW5jLCBrZXkpe1xuICAgICAgICBpZiAoIWtleSl7ICAgIFxuICAgICAgICAgICAga2V5ID0gJ18nICsgY2FjaGVkS2V5SWR4Kys7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gd3JhcHBlcigpe1xuICAgICAgICAgICAgaWYgKCF0aGlzW2tleV0pe1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IGZ1bmMuY2FsbCh0aGlzLFthcmd1bWVudHNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzW2tleV07XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB3cmFwcGVyO1xuICAgIH0sXG4gICAgJFBPU1QgOiAkUE9TVCxcbiAgICByZVdoZWVsQ29ubmVjdGlvbjogcmVXaGVlbENvbm5lY3Rpb24sXG4gICAgbG9nOiBmdW5jdGlvbigpeyBcbiAgICAgICAgY29uc29sZS5sb2coYXJndW1lbnRzKTtcbiAgICB9LFxuXG4gICAgeGRyOiBmdW5jdGlvbiAodXJsLCBkYXRhLCBhcHBsaWNhdGlvbix0b2tlbiwgZm9ybUVuY29kZSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogTWFrZSBhbiBIVFRQIFJlcXVlc3QgYW5kIHJldHVybiBpdHMgcHJvbWlzZS5cbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIHJlcTtcbiAgICAgICAgICAgIGlmICghZGF0YSkgeyBkYXRhID0ge307fVxuXG4gICAgICAgICAgICBpZihYTUxIdHRwUmVxdWVzdCkge1xuICAgICAgICAgICAgICAgIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3BvbnNlRGF0YSA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzcG9uc2VEYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXNwb25zZSA9IHtyZXNwb25zZURhdGE6IHJlc3BvbnNlRGF0YSwgcmVzcG9uc2VUZXh0OiByZXEucmVzcG9uc2VUZXh0LHN0YXR1czogcmVxLnN0YXR1c1RleHQsIHJlcXVlc3Q6IHJlcX07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVxLnN0YXR1cyA+PSAyMDAgJiYgcmVxLnN0YXR1cyA8IDQwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmKFhEb21haW5SZXF1ZXN0KXtcbiAgICAgICAgICAgICAgICByZXEgPSBuZXcgWERvbWFpblJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICByZXEub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdChyZXEucmVzcG9uc2VUZXh0LHJlcS5zdGF0dXNUZXh0LCByZXEpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0NPUlMgbm90IHN1cHBvcnRlZCcpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVxLm9wZW4oJ1BPU1QnLCB1cmwsIHRydWUpO1xuICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpO1xuICAgICAgICAgICAgaWYgKCFmb3JtRW5jb2RlKXtcbiAgICAgICAgICAgICAgICBkYXRhID0geyBhcmdzIDogSlNPTi5zdHJpbmdpZnkoZGF0YSkgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRva2VuKSB7IGRhdGEudG9rZW4gPSB0b2tlbiB9XG4gICAgICAgICAgICBpZiAoYXBwbGljYXRpb24pIHsgZGF0YS5hcHBsaWNhdGlvbiA9IGFwcGxpY2F0aW9uOyB9XG4gICAgICAgICAgICBkYXRhID0gTGF6eShkYXRhKS5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnPScgKyBlbmNvZGVVUkkodi50b1N0cmluZygpKTsgIFxuICAgICAgICAgICAgfSkudG9BcnJheSgpLmpvaW4oJyYnKTtcbiAgICAgICAgICAgIHJlcS5zZW5kKGRhdGEpO1xuICAgIC8vICAgICAgICByZXEuc2VuZChudWxsKTtcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIFxuICAgIGNhcGl0YWxpemUgOiBmdW5jdGlvbiAocykge1xuICAgICAgICByZXR1cm4gc1swXS50b1VwcGVyQ2FzZSgpICsgcy5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgIH0sXG5cbiAgICBoYXNoIDogZnVuY3Rpb24oc3RyKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhhc2hlZCBmdW5jdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgc3RyID0gc3RyLnRvU3RyaW5nKCk7XG4gICAgICAgIHZhciByZXQgPSAxO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDt4PHN0ci5sZW5ndGg7eCsrKXtcbiAgICAgICAgICAgIHJldCAqPSAoMSArIHN0ci5jaGFyQ29kZUF0KHgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKHJldCAlIDM0OTU4Mzc0OTU3KS50b1N0cmluZygpO1xuICAgIH0sXG5cbiAgICBtYWtlRmlsdGVyIDogZnVuY3Rpb24gKG1vZGVsLCBmaWx0ZXIsIHVuaWZpZXIsIGRvbnRUcmFuc2xhdGVGaWx0ZXIpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ha2UgZmlsdGVyIGZvciBBcnJheS5maWx0ZXIgZnVuY3Rpb24gYXMgYW4gYW5kIG9mIG9yXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoIXVuaWZpZXIpIHsgdW5pZmllciA9ICcgJiYgJzt9XG4gICAgICAgIGlmIChMYXp5KGZpbHRlcikuc2l6ZSgpID09PSAwKXtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih4KXsgcmV0dXJuIHRydWUgfTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc291cmNlID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2YWxzLCBmaWVsZCl7XG4gICAgICAgICAgICBpZiAoIXZhbHMpIHsgdmFscyA9IFtudWxsXX1cbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWxzKSl7XG4gICAgICAgICAgICAgICAgdmFscyA9IFt2YWxzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZG9udFRyYW5zbGF0ZUZpbHRlciAmJiAobW9kZWwuZmllbGRzW2ZpZWxkXS50eXBlID09PSAncmVmZXJlbmNlJykpIHtcbiAgICAgICAgICAgICAgICBmaWVsZCA9ICdfJyArIGZpZWxkO1xuICAgICAgICAgICAgICAgIHZhbHMgPSBMYXp5KHZhbHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHggJiYgKHguY29uc3RydWN0b3IgIT09IE51bWJlcikpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguaWQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobW9kZWwuZmllbGRzW2ZpZWxkXS50eXBlID09PSAnc3RyaW5nJyl7XG4gICAgICAgICAgICAgICAgdmFscyA9IHZhbHMubWFwKEpTT04uc3RyaW5naWZ5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAnKCcgKyAgTGF6eSh2YWxzKS5tYXAoZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcoeC4nICsgZmllbGQgKyAnID09PSAnICsgeCArICcpJztcbiAgICAgICAgICAgIH0pLmpvaW4oJyB8fCAnKSAgKycpJztcbiAgICAgICAgfSkudG9BcnJheSgpLmpvaW4odW5pZmllcik7XG4gICAgICAgIHJldHVybiBuZXcgRnVuY3Rpb24oXCJ4XCIsIFwicmV0dXJuIFwiICsgc291cmNlKTtcbiAgICB9LFxuXG4gICAgc2FtZUFzIDogZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZXAgZXF1YWxcbiAgICAgICAgICovXG4gICAgICAgIGZvciAodmFyIGsgaW4geCkge1xuICAgICAgICAgICAgaWYgKHlba10gIT0geFtrXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG5cbiAgICB3c0Nvbm5lY3QgOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICAvKipcbiAgICAgICAgICogQ29ubmVjdHMgYSB3ZWJzb2NrZXQgd2l0aCByZVdoZWVsIGNvbm5lY3Rpb25cbiAgICAgICAgICovXG4gICAgICAgIGlmKCFvcHRpb25zKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyByZWdpc3RlcmluZyBhbGwgZXZlbnQgaGFuZGxlcnNcblxuICAgICAgICB0aGlzLmhhbmRsZXJzID0ge1xuICAgICAgICAgICAgd2l6YXJkIDogbmV3IEhhbmRsZXIoKSxcbiAgICAgICAgICAgIG9uQ29ubmVjdGlvbiA6IG5ldyBIYW5kbGVyKCksXG4gICAgICAgICAgICBvbkRpc2Nvbm5lY3Rpb24gOiBuZXcgSGFuZGxlcigpLFxuICAgICAgICAgICAgb25NZXNzYWdlSnNvbiA6IG5ldyBIYW5kbGVyKCksXG4gICAgICAgICAgICBvbk1lc3NhZ2VUZXh0IDogbmV3IEhhbmRsZXIoKVxuICAgICAgICB9XG4gICAgICAgIHRoaXMub25XaXphcmQgPSB0aGlzLmhhbmRsZXJzLndpemFyZC5hZGRIYW5kbGVyLmJpbmQodGhpcy5oYW5kbGVycy53aXphcmQpO1xuICAgICAgICB0aGlzLm9uQ29ubmVjdCA9IHRoaXMuaGFuZGxlcnMub25Db25uZWN0aW9uLmFkZEhhbmRsZXIuYmluZCh0aGlzLmhhbmRsZXJzLm9uQ29ubmVjdGlvbik7XG4gICAgICAgIHRoaXMub25EaXNjb25uZWN0ID0gdGhpcy5oYW5kbGVycy5vbkRpc2Nvbm5lY3Rpb24uYWRkSGFuZGxlci5iaW5kKHRoaXMuaGFuZGxlcnMub25EaXNjb25uZWN0aW9uKTtcbiAgICAgICAgdGhpcy5vbk1lc3NhZ2VKc29uID0gdGhpcy5oYW5kbGVycy5vbk1lc3NhZ2VKc29uLmFkZEhhbmRsZXIuYmluZCh0aGlzLmhhbmRsZXJzLm9uTWVzc2FnZUpzb24pO1xuICAgICAgICB0aGlzLm9uTWVzc2FnZVRleHQgPSB0aGlzLmhhbmRsZXJzLm9uTWVzc2FnZVRleHQuYWRkSGFuZGxlci5iaW5kKHRoaXMuaGFuZGxlcnMub25NZXNzYWdlVGV4dCk7XG5cbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9uc1xuXG4gICAgICAgIHZhciBjb25uZWN0aW9uID0gbmV3IFNvY2tKUyhvcHRpb25zLnJlYWx0aW1lRW5kUG9pbnQpO1xuICAgICAgICBjb25uZWN0aW9uLm9ub3BlbiA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb3BlbiA6ICcgKyB4KTtcbiAgICAgICAgICAgIGNvbm5lY3Rpb24udGVuYW50KCk7XG4gICAgICAgICAgICBzZWxmLmhhbmRsZXJzLm9uQ29ubmVjdGlvbi5oYW5kbGUoeCk7XG4gICAgICAgIH07XG4gICAgICAgIGNvbm5lY3Rpb24ub25tZXNzYWdlID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGlmICh4LnR5cGUgPT0gJ21lc3NhZ2UnKSB7XG4gICAgICAgICAgICAgICAgLy8kLm5vdGlmeSh4LmRhdGEpO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBzZXQgZnJvbVJlYWx0aW1lXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuaGFuZGxlcnMub25NZXNzYWdlSnNvbi5oYW5kbGUoJC5wYXJzZUpTT04oeC5kYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyB1bnNldCBmcm9tUmVhbHRpbWVcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5oYW5kbGVycy5vbk1lc3NhZ2VUZXh0LmhhbmRsZSh4LmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coeCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGNvbm5lY3Rpb24ub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQodXRpbHMud3NDb25uZWN0LDEwMDApO1xuICAgICAgICAgICAgc2VsZi5oYW5kbGVycy5vbkRpc2Nvbm5lY3Rpb24uaGFuZGxlKCk7XG4gICAgICAgIH07XG4gICAgICAgIGNvbm5lY3Rpb24udGVuYW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29ubmVjdGlvbi5zZW5kKCdURU5BTlQ6JyArIHNlbGYub3B0aW9ucy5hcHBsaWNhdGlvbiArICc6JyArIHNlbGYub3B0aW9ucy50b2tlbik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcGx1cmFsaXplIDogZnVuY3Rpb24oc3RyLCBtb2RlbCl7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMZXhpY2FsbHkgcmV0dXJucyBlbmdsaXNoIHBsdXJhbCBmb3JtXG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gc3RyICsgJ3MnO1xuICAgIH0sXG5cbiAgICBiZWZvcmVDYWxsIDogZnVuY3Rpb24oZnVuYywgYmVmb3JlKXtcbiAgICAgICAgdmFyIGRlY29yYXRvciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBiZWZvcmUoKS50aGVuKGZ1bmMpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBkZWNvcmF0b3I7XG4gICAgfSxcblxuICAgIGNsZWFuU3RvcmFnZSA6IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDbGVhbiBsb2NhbFN0b3JhZ2Ugb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBMYXp5KGxvY2FsU3RvcmFnZSkua2V5cygpLmVhY2goZnVuY3Rpb24oayl7XG4gICAgICAgICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW2tdO1xuICAgICAgICB9KVxuICAgIH0sXG4gICAgXG4gICAgcmV2ZXJzZSA6IGZ1bmN0aW9uIChjaHIsIHN0cikge1xuICAgICAgICByZXR1cm4gc3RyLnNwbGl0KGNocikucmV2ZXJzZSgpLmpvaW4oY2hyKTtcbiAgICB9LFxuICAgIHBlcm11dGF0aW9uczogZnVuY3Rpb24oYXJyKXtcbiAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICBmb3IgKHZhciB4ID0gYXJyLmxlbmd0aC0xOyB4ID49IDA7eC0tKXtcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSBhcnIubGVuZ3RoLTE7IHkgPj0gMDsgeS0tKXtcbiAgICAgICAgICAgICAgICBpZiAoeCAhPT0geSlcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goW2Fyclt4XSwgYXJyW3ldXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuXG4gICAgYm9vbDogQm9vbGVhbixcblxuICAgIG5vb3AgOiBmdW5jdGlvbigpe30sXG5cbiAgICB0ek9mZnNldDogbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpICogNjAwMDBcbn07XG5cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBUb3VjaGVyKCl7XG4gICAgdmFyIHRvdWNoZWQgPSBmYWxzZVxuICAgIHRoaXMudG91Y2ggPSBmdW5jdGlvbigpe1xuICAgICAgICB0b3VjaGVkID0gdHJ1ZTtcbiAgICB9O1xuICAgIHRoaXMudG91Y2hlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB0ID0gdG91Y2hlZDtcbiAgICAgICAgdG91Y2hlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gdDtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cblxuZnVuY3Rpb24gVmFjdXVtQ2FjaGVyKHRvdWNoLCBhc2tlZCwgbmFtZSl7XG4vKlxuICAgIGlmIChuYW1lKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdjcmVhdGVkIFZhY3V1bUNhY2hlciBhcyAnICsgbmFtZSk7XG4gICAgfVxuKi9cbiAgICBpZiAoIWFza2VkKXtcbiAgICAgICAgdmFyIGFza2VkID0gW107XG4gICAgfVxuICAgIHZhciBtaXNzaW5nID0gW107XG4gICAgXG4gICAgdGhpcy5hc2sgPSBmdW5jdGlvbiAoaWQsbGF6eSl7XG4gICAgICAgIGlmICghTGF6eShhc2tlZCkuY29udGFpbnMoaWQpKXtcbi8vICAgICAgICAgICAgY29uc29sZS5pbmZvKCdhc2tpbmcgKCcgKyBpZCArICcpIGZyb20gJyArIG5hbWUpO1xuICAgICAgICAgICAgbWlzc2luZy5wdXNoKGlkKTtcbiAgICAgICAgICAgIGlmICghbGF6eSlcbiAgICAgICAgICAgICAgICBhc2tlZC5wdXNoKGlkKTtcbiAgICAgICAgICAgIHRvdWNoLnRvdWNoKCk7XG4gICAgICAgIH0gXG4vLyAgICAgICAgZWxzZSBjb25zb2xlLndhcm4oJygnICsgaWQgKyAnKSB3YXMganVzdCBhc2tlZCBvbiAnICsgbmFtZSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0QXNrZWRJbmRleCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBhc2tlZDtcbiAgICB9XG5cbiAgICB0aGlzLm1pc3NpbmdzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIExhenkobWlzc2luZy5zcGxpY2UoMCxtaXNzaW5nLmxlbmd0aCkpLnVuaXF1ZSgpLnRvQXJyYXkoKTtcbiAgICB9XG59XG4iLCJmdW5jdGlvbiBBdXRvTGlua2VyKGV2ZW50cywgYWN0aXZlcywgSURCLCBXMlBSRVNPVVJDRSwgbGlzdENhY2hlKXtcbiAgICB2YXIgdG91Y2ggPSBuZXcgVG91Y2hlcigpO1xuICAgIHZhciBtYWluSW5kZXggPSB7fTtcbiAgICB2YXIgZm9yZWlnbktleXMgPSB7fTtcbiAgICB2YXIgbTJtID0ge307XG4gICAgdmFyIG0ybUluZGV4ID0ge307XG4gICAgdmFyIHBlcm1pc3Npb25zID0ge307XG4gICAgdGhpcy5tYWluSW5kZXggPSBtYWluSW5kZXg7XG4gICAgdGhpcy5mb3JlaWduS2V5cyA9IGZvcmVpZ25LZXlzO1xuICAgIHRoaXMubTJtID0gbTJtO1xuICAgIHRoaXMubTJtSW5kZXggPSBtMm1JbmRleDtcbiAgICB0aGlzLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG5cbiAgICBldmVudHMub24oJ21vZGVsLWRlZmluaXRpb24nLGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgLy8gZGVmaW5pbmcgYWxsIGluZGV4ZXMgZm9yIHByaW1hcnkga2V5XG4gICAgICAgIHZhciBwa0luZGV4ID0gbGlzdENhY2hlLmdldEluZGV4Rm9yKG1vZGVsLm5hbWUsICdpZCcpO1xuICAgICAgICBtYWluSW5kZXhbbW9kZWwubmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBwa0luZGV4LCAnbWFpbkluZGV4LicgKyBtb2RlbC5uYW1lKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0aW5nIHBlcm1pc3Npb24gaW5kZXhlc1xuICAgICAgICBwZXJtaXNzaW9uc1ttb2RlbC5uYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwgJ3Blcm1pc3Npb25zLicgKyBtb2RlbC5uYW1lKTtcblxuICAgICAgICAvLyBjcmVhdGluZyBpbmRleGVzIGZvciBmb3JlaWduIGtleXNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VzKS5lYWNoKGZ1bmN0aW9uKHJlZmVyZW5jZSl7XG4gICAgICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWwubmFtZSArICdfJyArIHJlZmVyZW5jZS5pZDtcbiAgICAgICAgICAgIGZvcmVpZ25LZXlzW2luZGV4TmFtZV0gPSBuZXcgVmFjdXVtQ2FjaGVyKHRvdWNoLCBsaXN0Q2FjaGUuZ2V0SW5kZXhGb3IocmVmZXJlbmNlLnRvLCAnaWQnKSwgcmVmZXJlbmNlLnRvICsgJy5pZCBmb3JlaWduS2V5cy4nICsgaW5kZXhOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGNyZWF0aW5nIHJldmVyc2UgZm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkobW9kZWwucmVmZXJlbmNlZEJ5KS5lYWNoKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBmaWVsZC5ieSArICcuJyArIGZpZWxkLmlkO1xuICAgICAgICAgICAgZm9yZWlnbktleXNbaW5kZXhOYW1lXSA9IG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsIGxpc3RDYWNoZS5nZXRJbmRleEZvcihmaWVsZC5ieSxmaWVsZC5pZCksIGZpZWxkLmJ5ICsgJy4nICsgZmllbGQuaWQgKyAnIGZvcmVpZ25LZXlzLicgKyBpbmRleE5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtb2RlbC5tYW55VG9NYW55KS5lYWNoKGZ1bmN0aW9uKHJlbGF0aW9uKXtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm0pKVxuICAgICAgICAgICAgICAgIG0ybVtyZWxhdGlvbi5pbmRleE5hbWVdID0gW25ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUgKyAnWzBdJyksIG5ldyBWYWN1dW1DYWNoZXIodG91Y2gsbnVsbCwnbTJtLicgKyByZWxhdGlvbi5pbmRleE5hbWUrJ1sxXScpXTtcbiAgICAgICAgICAgIGlmICghKHJlbGF0aW9uLmluZGV4TmFtZSBpbiBtMm1JbmRleCkpXG4gICAgICAgICAgICAgICAgbTJtSW5kZXhbcmVsYXRpb24uaW5kZXhOYW1lXSA9IG5ldyBNYW55VG9NYW55UmVsYXRpb24ocmVsYXRpb24sbTJtW3JlbGF0aW9uLmluZGV4TmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB2YXIgbTJtR2V0ID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBjYWxsQmFjayl7XG4gICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KChuID8gdXRpbHMucmV2ZXJzZSgnLycsIGluZGV4TmFtZSkgOiBpbmRleE5hbWUpICsgJ3MnICsgJy9saXN0Jywge2NvbGxlY3Rpb246IGNvbGxlY3Rpb259LCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSwgY2FsbEJhY2spO1xuICAgICAgICAgICAgZGVsZXRlIGFjdGl2ZXNbaW5kZXhOYW1lXVxuICAgICAgICB9KTsgICAgICAgIFxuICAgIH07XG5cbiAgICB2YXIgZ2V0TTJNID0gZnVuY3Rpb24oaW5kZXhOYW1lLCBjb2xsZWN0aW9uLCBuLCBjYWxsQmFjayl7XG4gICAgICAgIC8vIGFzayBhbGwgaXRlbXMgaW4gY29sbGVjdGlvbiB0byBtMm0gaW5kZXhcbiAgICAgICAgTGF6eShjb2xsZWN0aW9uKS5lYWNoKG0ybVtpbmRleE5hbWVdW25dLmFzay5iaW5kKG0ybVtpbmRleE5hbWVdW25dKSk7XG4gICAgICAgIC8vIHJlbmV3aW5nIGNvbGxlY3Rpb24gd2l0aG91dCBhc2tlZFxuICAgICAgICBjb2xsZWN0aW9uID0gbTJtW2luZGV4TmFtZV1bbl0ubWlzc2luZ3MoKTtcbiAgICAgICAgLy8gY2FsbGluZyByZW1vdGUgZm9yIG0ybSBjb2xsZWN0aW9uIGlmIGFueVxuICAgICAgICBpZiAoY29sbGVjdGlvbi5sZW5ndGgpe1xuICAgICAgICAgICAgYWN0aXZlc1tpbmRleE5hbWVdID0gMTtcbiAgICAgICAgICAgIG0ybUdldChpbmRleE5hbWUsIG4sIGNvbGxlY3Rpb24sIGNhbGxCYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuZ2V0TTJNID0gZ2V0TTJNO1xuXG4gICAgdmFyIGxpbmtVbmxpbmtlZCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIHBlcmZvcm0gYSBEYXRhQmFzZSBzeW5jaHJvbml6YXRpb24gd2l0aCBzZXJ2ZXIgbG9va2luZyBmb3IgdW5rbm93biBkYXRhXG4gICAgICAgIGlmICghdG91Y2gudG91Y2hlZCgpKSByZXR1cm47XG4gICAgICAgIGlmIChMYXp5KGFjdGl2ZXMpLnZhbHVlcygpLnN1bSgpKSB7XG4gICAgICAgICAgICB0b3VjaC50b3VjaCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGluZGV4ZXMsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICBMYXp5KGluZGV4ZXMpLmVhY2goZnVuY3Rpb24gKGluZGV4LG4pIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IGluZGV4Lm1pc3NpbmdzKCk7XG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbiA9IExhenkoY29sbGVjdGlvbikuZmlsdGVyKEJvb2xlYW4pLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbGxlY3Rpb24ubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIElOREVYID0gbTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdldHRlciA9IElOREVYWydnZXQnICsgKDEgLSBuKV0uYmluZChJTkRFWCk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBtMm1HZXQoaW5kZXhOYW1lLCBuLCBjb2xsZWN0aW9uLCBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBjb2xsZWN0aW9uLm1hcChnZXR0ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvdGhlckluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcvJylbMSAtIG5dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG90aGVySW5kZXgsZnVuY3Rpb24oKXtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXp5KGlkcykuZmxhdHRlbigpLnVuaXF1ZSgpLmVhY2gobWFpbkluZGV4W290aGVySW5kZXhdLmFzayk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExhenkoaWRzKS5mbGF0dGVuKCkudW5pcXVlKCkuZWFjaChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1haW5JbmRleFtvdGhlckluZGV4XS5hc2soeCx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgTGF6eShtYWluSW5kZXgpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIHZhciBpZHMgPSBpbmRleC5taXNzaW5ncygpO1xuICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgaWRiID0gbW9kZWxOYW1lIGluIElEQiA/IElEQlttb2RlbE5hbWVdLmtleXMoKSA6IExhenkoKTtcbiAgICAgICAgICAgICAgICAvL2xvZygnbGlua2luZy4nICsgbW9kZWxOYW1lICsgJyA9ICcgKyBXMlBSRVNPVVJDRS5saW5raW5nLnNvdXJjZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5mZXRjaChtb2RlbE5hbWUsIHtpZDogaWRzfSxudWxsLHV0aWxzLm5vb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gRm9yZWlnbiBrZXlzXG4gICAgICAgIExhenkoZm9yZWlnbktleXMpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24odixrKXtcbiAgICAgICAgICAgIHJldHVybiBbaywgdi5taXNzaW5ncygpXVxuICAgICAgICB9KS5maWx0ZXIoZnVuY3Rpb24odil7XG4gICAgICAgICAgICByZXR1cm4gdlsxXS5sZW5ndGhcbiAgICAgICAgfSkuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgY2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICB2YXIgaWRzID0geFsxXTtcbiAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSB4WzBdO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gaW5kZXhOYW1lLnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgbWFpblJlc291cmNlID0gaW5kZXhbMF07XG4gICAgICAgICAgICB2YXIgZmllbGROYW1lID0gaW5kZXhbMV07XG4gICAgICAgICAgICB2YXIgZmlsdGVyID0ge307XG4gICAgICAgICAgICBmaWx0ZXJbZmllbGROYW1lXSA9IGlkcztcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1haW5SZXNvdXJjZSwgZmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBMYXp5KExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbih2LGspe1xuICAgICAgICAgICAgcmV0dXJuIFtrLCB2Lm1pc3NpbmdzKCldXG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgcmV0dXJuIHZbMV0ubGVuZ3RoXG4gICAgICAgIH0pLnRvT2JqZWN0KCkpLmVhY2goZnVuY3Rpb24gKGlkcywgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICBhY3RpdmVzW3Jlc291cmNlTmFtZV0gPSAxO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHJlc291cmNlTmFtZSArICcvbXlfcGVybXMnLCB7aWRzOiBMYXp5KGlkcykudW5pcXVlKCkudG9BcnJheSgpfSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290UGVybWlzc2lvbnMoZGF0YS5QRVJNSVNTSU9OUyk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhY3RpdmVzW3Jlc291cmNlTmFtZV1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHNldEludGVydmFsKGxpbmtVbmxpbmtlZCw1MCk7XG59O1xuXG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBMaXN0Q2FjaGVyKCl7XG4gICAgdmFyIGdvdEFsbCA9IHt9O1xuICAgIHZhciBhc2tlZCA9IHt9OyAvLyBtYXAgb2YgYXJyYXlcbiAgICB2YXIgY29tcG9zaXRlQXNrZWQgPSB7fTtcbiAgICB2YXIgY2FydGVzaWFuUHJvZHVjdDEgPSBmdW5jdGlvbih4LHksaXNBcnJheSl7XG4gICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgaWYgKGlzQXJyYXkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4geCl7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYiBpbiB5KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0LnB1c2goTGF6eShbeFthXSx5W2JdXSkuZmxhdHRlbigpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgYSBpbiB4KXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBiIGluIHkpe1xuICAgICAgICAgICAgICAgICAgICByZXQucHVzaChbeFthXSx5W2JdXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbiAgICB2YXIgY2FydGVzaWFuUHJvZHVjdCA9IGZ1bmN0aW9uKGFycil7XG4gICAgICAgIHZhciBpc0FycmF5ID0gZmFsc2U7XG4gICAgICAgIHZhciByZXQgPSBhcnJbMF07IFxuICAgICAgICBmb3IgKHZhciB4ID0gMTsgeCA8IGFyci5sZW5ndGg7ICsreCl7XG4gICAgICAgICAgICByZXQgPSBjYXJ0ZXNpYW5Qcm9kdWN0MShyZXQsIGFyclt4XSwgaXNBcnJheSk7XG4gICAgICAgICAgICBpc0FycmF5ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgICB2YXIgZXhwbG9kZUZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICB2YXIgcHJvZHVjdCA9IGNhcnRlc2lhblByb2R1Y3QoTGF6eShmaWx0ZXIpLnZhbHVlcygpLnRvQXJyYXkoKSk7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLmtleXMoKS50b0FycmF5KCk7XG4gICAgICAgIHJldHVybiBwcm9kdWN0Lm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHZhciByID0ge307XG4gICAgICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oYSxuKXtcbiAgICAgICAgICAgICAgICByW2FdID0geFtuXTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH07XG4gICAgdmFyIGZpbHRlclNpbmdsZSA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIsIHRlc3RPbmx5KXtcbiAgICAgICAgLy8gTGF6eSBhdXRvIGNyZWF0ZSBpbmRleGVzXG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG4gICAgICAgIHZhciBnZXRJbmRleEZvciA9IHRoaXMuZ2V0SW5kZXhGb3I7XG4gICAgICAgIHZhciBrZXlzID0gTGF6eShmaWx0ZXIpLm1hcChmdW5jdGlvbih2LGtleSl7IHJldHVybiBba2V5LCBtb2RlbE5hbWUgKyAnLicgKyBrZXldOyB9KS50b09iamVjdCgpO1xuICAgICAgICB2YXIgaW5kZXhlcyA9IExhenkoZmlsdGVyKS5rZXlzKCkubWFwKGZ1bmN0aW9uKGtleSl7IHJldHVybiBba2V5LCBnZXRJbmRleEZvcihtb2RlbE5hbWUsIGtleSldfSkudG9PYmplY3QoKTsgXG4gICAgICAgIC8vIGZha2UgZm9yIChpdCB3aWxsIGN5Y2xlIG9uY2UpXG4gICAgICAgIGZvciAodmFyIHggaW4gZmlsdGVyKXtcbiAgICAgICAgICAgIC8vIGdldCBhc2tlZCBpbmRleCBhbmQgY2hlY2sgcHJlc2VuY2VcbiAgICAgICAgICAgIHZhciBkaWZmZXJlbmNlID0gTGF6eShmaWx0ZXJbeF0pLmRpZmZlcmVuY2UoaW5kZXhlc1t4XSkudG9BcnJheSgpO1xuICAgICAgICAgICAgaWYgKGRpZmZlcmVuY2UubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAvLyBnZW5lcmF0ZSBuZXcgZmlsdGVyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IExhenkoW1t4LCBkaWZmZXJlbmNlXV0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgLy8gcmVtZW1iZXIgYXNrZWRcbiAgICAgICAgICAgICAgICBpZiAoIXRlc3RPbmx5KVxuICAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShpbmRleGVzW3hdLCBkaWZmZXJlbmNlKTtcbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUgZmlsdGVyIDogJyArIEpTT04uc3RyaW5naWZ5KGZpbHRlcikgKyAnXFxuT3V0IDonICsgSlNPTi5zdHJpbmdpZnkocmV0KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4vLyAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlIGZpbHRlciA6ICcgKyBKU09OLnN0cmluZ2lmeShmaWx0ZXIpICsgJ1xcbk91dCA6IG51bGwnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY2xlYW5Db21wb3NpdGVzID0gZnVuY3Rpb24obW9kZWwsZmlsdGVyKXtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGNsZWFuIGNvbXBvc2l0ZUFza2VkXG4gICAgICAgICAqL1xuICAgICAgICAvLyBsYXp5IGNyZWF0ZSBjb25kaXRpb25hbCBhc2tlZCBpbmRleFxuICAgICAgICBpZiAoIShtb2RlbC5uYW1lIGluIGNvbXBvc2l0ZUFza2VkKSkgeyBjb21wb3NpdGVBc2tlZFttb2RlbC5uYW1lXSA9IFtdIH07XG4gICAgICAgIHZhciBpbmRleCA9IGNvbXBvc2l0ZUFza2VkW21vZGVsLm5hbWVdO1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGFsbCBlbGVtZW50cyB3aG8gaGF2ZSBzYW1lIHBhcnRpYWxcbiAgICAgICAgdmFyIGZpbHRlckxlbiA9IExhenkoZmlsdGVyKS5zaXplKCk7XG4gICAgICAgIHZhciBpdGVtcyA9IGluZGV4LmZpbHRlcih1dGlscy5tYWtlRmlsdGVyKG1vZGVsLCBmaWx0ZXIsICcgJiYgJyx0cnVlKSkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0peyBMYXp5KGl0ZW0pLnNpemUoKSA+IGZpbHRlckxlbiB9KTtcbi8vICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgOicgKyBKU09OLnN0cmluZ2lmeShpdGVtcykpO1xuICAgIH07XG5cbiAgICB0aGlzLmZpbHRlciA9IGZ1bmN0aW9uKG1vZGVsLCBmaWx0ZXIpe1xuLy8gICAgICAgIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLS0tLS0tLS1cXG5maWx0ZXIgOiAnICsgSlNPTi5zdHJpbmdpZnkoZmlsdGVyKSk7XG4gICAgICAgIHZhciBtb2RlbE5hbWUgPSBtb2RlbC5tb2RlbE5hbWU7XG5cbiAgICAgICAgLy8gaWYgeW91IGZldGNoIGFsbCBvYmplY3RzIGZyb20gc2VydmVyLCB0aGlzIG1vZGVsIGhhcyB0byBiZSBtYXJrZWQgYXMgZ290IGFsbDtcbiAgICAgICAgdmFyIGZpbHRlckxlbiAgPSBMYXp5KGZpbHRlcikuc2l6ZSgpO1xuICAgICAgICBzd2l0Y2ggKGZpbHRlckxlbikge1xuICAgICAgICAgICAgY2FzZSAwIDoge1xuICAgICAgICAgICAgICAgIC8vIHJldHVybiBudWxsIG9yIGFsbFxuICAgICAgICAgICAgICAgIHZhciBnb3QgPSBnb3RBbGxbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICBnb3RBbGxbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBhc2tlZCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhc2tlZFttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvdXQgOiBudWxsIChnb3QgYWxsKScpO1xuICAgICAgICAgICAgICAgIC8vIGNvbmRpdGlvbmFsIGNsZWFuXG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBjb21wb3NpdGVBc2tlZCl7IFxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGdvdClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAxIDoge1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBmaWx0ZXJTaW5nbGUuY2FsbCh0aGlzLCBtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgICAgICBjbGVhbkNvbXBvc2l0ZXMuY2FsbCh0aGlzLCBtb2RlbCwgZmlsdGVyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0aHMgPSB0aGlzO1xuICAgICAgICB2YXIgc2luZ2xlID0gTGF6eShmaWx0ZXIpLmtleXMoKS5zb21lKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdmFyIGYgPSB7fTtcbiAgICAgICAgICAgIGZba2V5XSA9IGZpbHRlcltrZXldO1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlclNpbmdsZS5jYWxsKHRocywgbW9kZWwsIGYsIHRydWUpID09IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc2luZ2xlKSB7IHJldHVybiBudWxsIH1cbiAgICAgICAgLy8gbGF6eSBjcmVhdGUgY29tcG9zaXRlQXNrZWRcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIGNvbXBvc2l0ZUFza2VkKSl7IGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0gPSBbXTsgfVxuICAgICAgICAvLyBleHBsb2RlIGZpbHRlclxuICAgICAgICB2YXIgZXhwbG9kZWQgPSBleHBsb2RlRmlsdGVyKGZpbHRlcik7XG4gICAgICAgIC8vIGNvbGxlY3QgcGFydGlhbHNcbiAgICAgICAgdmFyIHBhcnRpYWxzID0gY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXS5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgZmlsdGVyLCAnIHx8ICcsdHJ1ZSkpO1xuICAgICAgICAvLyBjb2xsZWN0IG1pc3NpbmdzIChleHBsb2RlZCAtIHBhcnRpYWxzKVxuICAgICAgICBpZiAocGFydGlhbHMubGVuZ3RoKXtcbiAgICAgICAgICAgIHZhciBiYWQgID0gW107XG4gICAgICAgICAgICAvLyBwYXJ0aWFsIGRpZmZlcmVuY2VcbiAgICAgICAgICAgIGZvciAodmFyIHggaW4gcGFydGlhbHMpe1xuICAgICAgICAgICAgICAgIGJhZC5wdXNoLmFwcGx5KGJhZCxleHBsb2RlZC5maWx0ZXIodXRpbHMubWFrZUZpbHRlcihtb2RlbCwgcGFydGlhbHNbeF0sJyAmJiAnLCB0cnVlKSkpO1xuICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICBjb25zb2xlLmxvZygnZXhwbG9kZWQgLSBwYXJ0aWFsIDogJyArIEpTT04uc3RyaW5naWZ5KGJhZCkpO1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdzID0gTGF6eShleHBsb2RlZCkuZGlmZmVyZW5jZShiYWQpLnRvQXJyYXkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBtaXNzaW5ncyA9IGV4cGxvZGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZmlsdGVyIHBhcnRpYWxzXG4gICAgICAgIGlmIChtaXNzaW5ncy5sZW5ndGgpe1xuICAgICAgICAgICAgY29tcG9zaXRlQXNrZWRbbW9kZWxOYW1lXS5wdXNoLmFwcGx5KGNvbXBvc2l0ZUFza2VkW21vZGVsTmFtZV0sbWlzc2luZ3MpO1xuICAgICAgICAgICAgLy8gYWdncmVnYXRlIG1pc3NpbmdzXG4gICAgICAgICAgICB2YXIgbWlzc2luZ3MgPSBMYXp5KGZpbHRlcikua2V5cygpLm1hcChmdW5jdGlvbihrZXkpe1xuICAgICAgICAgICAgICAgIHZhciByZXQgPSBMYXp5KG1pc3NpbmdzKS5wbHVjayhrZXkpLnVuaXF1ZSgpLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2tleSwgcmV0Lmxlbmd0aD9yZXQ6ZmlsdGVyW2tleV1dO1xuICAgICAgICAgICAgfSkudG9PYmplY3QoKTtcbi8vICAgICAgICAgICAgY29uc29sZS5sb2coJ291dCA6ICcgKyBKU09OLnN0cmluZ2lmeShtaXNzaW5ncykpO1xuICAgICAgICAgICAgLy8gY2xlYW4gY29uZGl0aW9uYWxcbiAgICAgICAgICAgIGNsZWFuQ29tcG9zaXRlcyhtb2RlbCwgbWlzc2luZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIG1pc3NpbmdzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEluZGV4Rm9yID0gZnVuY3Rpb24obW9kZWxOYW1lLCBmaWVsZE5hbWUpe1xuICAgICAgICB2YXIgaW5kZXhOYW1lID0gbW9kZWxOYW1lICsgJy4nICsgZmllbGROYW1lO1xuICAgICAgICBpZiAoIShpbmRleE5hbWUgaW4gYXNrZWQpKXtcbiAgICAgICAgICAgIGFza2VkW2luZGV4TmFtZV0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXNrZWRbaW5kZXhOYW1lXTtcbiAgICB9XG59OyIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWFueVRvTWFueVJlbGF0aW9uKHJlbGF0aW9uLG0ybSl7XG4gICAgdmFyIGl0ZW1zID0gW107XG4gICAgdGhpcy5hZGQgPSBpdGVtcy5wdXNoLmJpbmQoaXRlbXMpO1xuICAgIHRoaXMuYWRkID0gZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgIGNvbnNvbGUubG9nKCdhZGRpbmcgJyArIGl0ZW0pO1xuICAgICAgICBpZiAoIShMYXp5KGl0ZW1zKS5maW5kKGl0ZW0pKSl7XG4gICAgICAgICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5nZXQwID0gZnVuY3Rpb24oaWQpe1xuICAgICAgICBtMm1bMV0uYXNrKGlkKTtcbiAgICAgICAgcmV0dXJuIExhenkoaXRlbXMpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHJldHVybiB4WzBdID09PSBpZDtcbiAgICAgICAgfSkucGx1Y2soXCIxXCIpLnRvQXJyYXkoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXQxID0gZnVuY3Rpb24oaWQpe1xuICAgICAgICBtMm1bMF0uYXNrKGlkKTtcbiAgICAgICAgcmV0dXJuIExhenkoaXRlbXMpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgIHJldHVybiB4WzFdID09PSBpZDtcbiAgICAgICAgfSkucGx1Y2soXCIwXCIpLnRvQXJyYXkoKTtcbiAgICB9O1xuICAgIHRoaXNbJ2dldCcgKyB1dGlscy5jYXBpdGFsaXplKHJlbGF0aW9uLmluZGV4TmFtZS5zcGxpdCgnLycpWzFdKV0gPSB0aGlzLmdldDE7XG4gICAgdGhpc1snZ2V0JyArIHV0aWxzLmNhcGl0YWxpemUocmVsYXRpb24uaW5kZXhOYW1lLnNwbGl0KCcvJylbMF0pXSA9IHRoaXMuZ2V0MDtcblxuICAgIHRoaXMuZGVsID0gZnVuY3Rpb24oaXRlbSl7XG4gICAgICAgIHZhciBsID0gaXRlbXMubGVuZ3RoO1xuICAgICAgICB2YXIgaWR4ID0gbnVsbDtcbiAgICAgICAgZm9yICh2YXIgYSA9IDA7IGEgPCBsOyBhKyspeyBcbiAgICAgICAgICAgIGlmICgoaXRlbXNbYV1bMF0gPT09IGl0ZW1bMF0pICYmIChpdGVtc1thXVsxXSA9PT0gaXRlbVsxXSkpe1xuICAgICAgICAgICAgICAgIGlkeCA9IGE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkeCl7XG4gICAgICAgICAgICBpdGVtcy5zcGxpY2UoYSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJ2RlbGV0aW5nICcsIGl0ZW0pO1xuICAgIH07XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBjYWNoZWRQcm9wZXJ0eUJ5RXZlbnRzKHByb3RvLCBwcm9wZXJ0eU5hbWUsZ2V0dGVyLCBzZXR0ZXIpe1xuICAgIHZhciBldmVudHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsNCk7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIFxuICAgIExhenkoZXZlbnRzKS5lYWNoKGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgcHJvdG8ub3JtLm9uKGV2ZW50LGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXN1bHQgPSB7fTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIHByb3BlcnR5RGVmID0ge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGNhY2hlZCgpe1xuICAgICAgICAgICAgaWYgKCEodGhpcy5pZCBpbiByZXN1bHQpKXtcbiAgICAgICAgICAgICAgICByZXN1bHRbdGhpcy5pZF0gPSBnZXR0ZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHRbdGhpcy5pZF07XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGlmIChzZXR0ZXIpe1xuICAgICAgICBwcm9wZXJ0eURlZlsnc2V0J10gPSBmdW5jdGlvbih2YWx1ZSl7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT09IHJlc3VsdFt0aGlzLmlkXSl7XG4gICAgICAgICAgICAgICAgc2V0dGVyLmNhbGwodGhpcyx2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaWQgaW4gcmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdFt0aGlzLmlkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCBwcm9wZXJ0eU5hbWUscHJvcGVydHlEZWYpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IoZGF0YSl7XG4gICAgdGhpcy5yZXNvdXJjZSA9IGRhdGEuX3Jlc291cmNlO1xuICAgIHRoaXMuZm9ybUlkeCA9IGRhdGEuZm9ybUlkeDtcbiAgICB0aGlzLmZpZWxkcyA9IGRhdGEuZXJyb3JzO1xufVxudmFyIGJhc2VPUk0gPSBmdW5jdGlvbihvcHRpb25zLCBleHRPUk0pe1xuICAgIFxuICAgIC8vIGNyZWF0aW5nIHJld2hlZWwgY29ubmVjdGlvblxuICAgIGlmIChvcHRpb25zLmNvbnN0cnVjdG9yID09PSBTdHJpbmcpe1xuICAgICAgICB2YXIgY29ubmVjdGlvbiA9IG5ldyByZVdoZWVsQ29ubmVjdGlvbihvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuY29uc3RydWN0b3IgPT09IHV0aWxzLnJlV2hlZWxDb25uZWN0aW9uKXtcbiAgICAgICAgdmFyIGNvbm5lY3Rpb24gPSBvcHRpb25zO1xuICAgIH1cbiAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICAgIGNvbm5lY3Rpb24ub24oJ2Nvbm5lY3RlZCcsIGZ1bmN0aW9uKCl7IFxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHRydWU7XG4gICAgfSk7XG4gICAgdmFyIGV2ZW50cyA9IGNvbm5lY3Rpb24uZXZlbnRzO1xuICAgIHRoaXMub24gPSBldmVudHMub24uYmluZCh0aGlzKTtcbiAgICB0aGlzLmVtaXQgPSBldmVudHMuZW1pdC5iaW5kKHRoaXMpO1xuICAgIHRoaXMudW5iaW5kID0gZXZlbnRzLnVuYmluZC5iaW5kKHRoaXMpO1xuICAgIHRoaXMuJHBvc3QgPSBjb25uZWN0aW9uLiRwb3N0LmJpbmQoY29ubmVjdGlvbik7XG5cbiAgICAvLyBoYW5kbGluZyB3ZWJzb2NrZXQgZXZlbnRzXG4gICAgZXZlbnRzLm9uKCd3cy1jb25uZWN0ZWQnLGZ1bmN0aW9uKHdzKXtcbiAgICAgICAgY29uc29sZS5pbmZvKCdXZWJzb2NrZXQgY29ubmVjdGVkJyk7XG4gICAgICAgIC8vIGFsbCBqc29uIGRhdGEgaGFzIHRvIGJlIHBhcnNlZCBieSBnb3REYXRhXG4gICAgICAgIHdzLm9uTWVzc2FnZUpzb24oVzJQUkVTT1VSQ0UuZ290RGF0YS5iaW5kKFcyUFJFU09VUkNFKSk7XG4gICAgICAgIC8vXG4gICAgICAgIHdzLm9uTWVzc2FnZVRleHQoZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8oJ1dTIG1lc3NhZ2UgOiAnICsgbWVzc2FnZSlcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgZXZlbnRzLm9uKCd3cy1kaXNjb25uZWN0ZWQnLCBmdW5jdGlvbih3cyl7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dlYnNvY2tldCBkaXNjb25uZWN0ZWQnKVxuICAgIH0pO1xuICAgIGV2ZW50cy5vbignZXJyb3ItanNvbi00MDQnLGZ1bmN0aW9uKGVycm9yLHVybCwgc2VudERhdGEsIHhocil7IFxuICAgICAgICBjb25zb2xlLmVycm9yKCdKU09OIGVycm9yICcsIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XG4gICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbdXJsLnNwbGl0KCcvJylbMF1dO1xuICAgIH0pXG5cbiAgICAvLyBpbml0aWFsaXphdGlvblxuICAgIHZhciBXMlBSRVNPVVJDRSA9IHRoaXM7XG4gICAgdmFyIElEQiA9IHthdXRoX2dyb3VwIDogTGF6eSh7fSl9OyAvLyB0YWJsZU5hbWUgLT4gZGF0YSBhcyBBcnJheVxuICAgIHZhciBJRFggPSB7fTsgLy8gdGFibGVOYW1lIC0+IExhenkoaW5kZXhCeSgnaWQnKSkgLT4gSURCW2RhdGFdXG4gICAgdmFyIFJFVklEWCA9IHt9OyAvLyB0YWJsZU5hbWUgLT4gZmllbGROYW1lIC0+IExhenkuZ3JvdXBCeSgpIC0+IElEQltEQVRBXVxuICAgIHZhciBidWlsZGVySGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgYnVpbGRlckhhbmRsZXJVc2VkID0ge307XG4gICAgdmFyIHBlcnNpc3RlbnRBdHRyaWJ1dGVzID0ge307XG4gICAgdmFyIGV2ZW50SGFuZGxlcnMgPSB7fTtcbiAgICB2YXIgcGVybWlzc2lvbldhaXRpbmcgPSB7fTtcbiAgICB2YXIgbW9kZWxDYWNoZSA9IHt9O1xuICAgIHZhciBmYWlsZWRNb2RlbHMgPSB7fTtcbiAgICB2YXIgd2FpdGluZ0Nvbm5lY3Rpb25zID0ge30gLy8gYWN0dWFsIGNvbm5lY3Rpb24gd2hvIGknbSB3YWl0aW5nIGZvclxuICAgIHZhciBsaXN0Q2FjaGUgPSBuZXcgTGlzdENhY2hlcihMYXp5KTtcbiAgICB2YXIgbGlua2VyID0gbmV3IEF1dG9MaW5rZXIoZXZlbnRzLHdhaXRpbmdDb25uZWN0aW9ucyxJREIsIHRoaXMsIGxpc3RDYWNoZSk7XG4vKiAgICB3aW5kb3cubGwgPSBsaW5rZXI7XG4gICAgd2luZG93LmxjID0gbGlzdENhY2hlO1xuKi9cbiAgICB0aGlzLnZhbGlkYXRpb25FdmVudCA9IGV2ZW50cy5vbignZXJyb3ItanNvbi01MTMnLCBmdW5jdGlvbihkYXRhLCB1cmwsIHNlbnREYXRhLCB4aHIpe1xuICAgICAgICBpZiAoY3VycmVudENvbnRleHQuc2F2aW5nRXJyb3JIYW5sZGVyKXtcbiAgICAgICAgICAgIGN1cnJlbnRDb250ZXh0LnNhdmluZ0Vycm9ySGFubGRlcihuZXcgVmFsaWRhdGlvbkVycm9yKGRhdGEpKTtcbiAgICAgICAgfVxuICAgIH0pXG5cbiAgICB2YXIgZ2V0SW5kZXggPSBmdW5jdGlvbiAoaW5kZXhOYW1lKSB7XG4gICAgICAgIGlmIChpbmRleE5hbWUgaW4gSURCKVxuICAgICAgICAgICAgcmV0dXJuIElEQltpbmRleE5hbWVdO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIElEQltpbmRleE5hbWVdID0gTGF6eSh7fSk7XG4gICAgICAgICAgICByZXR1cm4gSURCW2luZGV4TmFtZV07XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBnZXRVbmxpbmtlZCA9IGZ1bmN0aW9uIChpbmRleE5hbWUpIHtcbiAgICAgICAgaWYgKGluZGV4TmFtZSBpbiBVTkxJTktFRClcbiAgICAgICAgICAgIHJldHVybiBVTkxJTktFRFtpbmRleE5hbWVdO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIFVOTElOS0VEW2luZGV4TmFtZV0gPSB7fTtcbiAgICAgICAgICAgIHJldHVybiBVTkxJTktFRFtpbmRleE5hbWVdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIFBlcm1pc3Npb25UYWJsZShpZCwga2xhc3MsIHBlcm1pc3Npb25zKSB7XG4gICAgICAgIC8vIGNyZWF0ZSBQZXJtaXNzaW9uVGFibGUgY2xhc3NcbiAgICAgICAgdGhpcy5rbGFzcyA9IGtsYXNzO1xuICAgICAgICB0aGlzLnBlcm1pc3Npb25zID0gW107XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgZm9yICh2YXIgayBpbiBwZXJtaXNzaW9ucykge1xuICAgICAgICAgICAgdGhpcy5wdXNoLmFwcGx5KHRoaXMsIFtrLCBwZXJtaXNzaW9uc1trXV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIFBlcm1pc3Npb25UYWJsZS5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAvLyBzYXZlIE9iamVjdCB0byBzZXJ2ZXJcbiAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICBwZXJtaXNzaW9uczogTGF6eSh0aGlzLnBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3hbMF0uaWQsIHhbMV1dXG4gICAgICAgICAgICB9KS50b09iamVjdCgpXG4gICAgICAgIH07XG4gICAgICAgIGRhdGEuaWQgPSB0aGlzLmlkO1xuICAgICAgICB2YXIgbW9kZWxOYW1lID0gdGhpcy5rbGFzcy5tb2RlbE5hbWU7XG4gICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMua2xhc3MubW9kZWxOYW1lICsgJy9zZXRfcGVybWlzc2lvbnMnLCBkYXRhLCBmdW5jdGlvbiAobXlQZXJtcywgYSwgYiwgcmVxKSB7XG4gICAgICAgICAgICBjYihteVBlcm1zKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBQZXJtaXNzaW9uVGFibGUucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoZ3JvdXBfaWQsIHBlcm1pc3Npb25MaXN0KSB7XG4gICAgICAgIHZhciBwID0gTGF6eShwZXJtaXNzaW9uTGlzdCk7XG4gICAgICAgIHZhciBwZXJtcyA9IExhenkodGhpcy5rbGFzcy5hbGxQZXJtaXNzaW9ucykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW3gsIHAuY29udGFpbnMoeCldXG4gICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgIHZhciBsID0gTGF6eSh0aGlzLnBlcm1pc3Npb25zKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4WzBdLmlkXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAobC5jb250YWlucyhncm91cF9pZCkpXG4gICAgICAgICAgICB0aGlzLnBlcm1pc3Npb25zW2wuaW5kZXhPZihncm91cF9pZCldWzFdID0gcGVybXM7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMucGVybWlzc2lvbnMucHVzaChbSURCLmF1dGhfZ3JvdXAuZ2V0KGdyb3VwX2lkKSwgcGVybXNdKTtcbiAgICB9O1xuXG4gICAgLy8gY3JlYXRlcyBkeW5hbWljYWwgbW9kZWxzXG4gICAgdmFyIG1ha2VNb2RlbENsYXNzID0gZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgIHZhciBfbW9kZWwgPSBtb2RlbDtcbiAgICAgICAgdmFyIGZpZWxkcyA9IExhenkobW9kZWwuZmllbGRzKTtcbiAgICAgICAgaWYgKG1vZGVsLnByaXZhdGVBcmdzKSB7XG4gICAgICAgICAgICBmaWVsZHMgPSBmaWVsZHMubWVyZ2UobW9kZWwucHJpdmF0ZUFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ21vZGVsLWRlZmluaXRpb24nLCBtb2RlbCk7XG4gICAgICAgIC8vIGdldHRpbmcgZmllbGRzIG9mIHR5cGUgZGF0ZSBhbmQgZGF0ZXRpbWVcbi8qXG4gICAgICAgIHZhciBEQVRFRklFTERTID0gZmllbGRzLmZpbHRlcihmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuICh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGdldHRpbmcgYm9vbGVhbiBmaWVsZHNcbiAgICAgICAgdmFyIEJPT0xGSUVMRFMgPSBmaWVsZHMuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKHgudHlwZSA9PSAnYm9vbGVhbicpXG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoeCwgdikge1xuICAgICAgICAgICAgcmV0dXJuIFt2LCB0cnVlXVxuICAgICAgICB9KS50b09iamVjdCgpO1xuXG4gICAgICAgIC8vIGJvb2xlYW5zIGFuZCBkYXRldGltZXMgc3RvcmFnZSBleHRlcm5hbCBcbiAgICAgICAgTU9ERUxfREFURUZJRUxEU1ttb2RlbC5uYW1lXSA9IERBVEVGSUVMRFM7XG4gICAgICAgIE1PREVMX0JPT0xGSUVMRFNbbW9kZWwubmFtZV0gPSBCT09MRklFTERTO1xuKi9cbiAgICAgICAgLy8gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdmFyIGZ1bmNTdHJpbmcgPSBcImlmICghcm93KSB7IHJvdyA9IHt9fTtcXG5cIjtcbiAgICAgICAgZnVuY1N0cmluZyArPSBtb2RlbC5yZWZlcmVuY2VzLm1hcChmdW5jdGlvbihmaWVsZCl7XG4gICAgICAgICAgICByZXR1cm4gJ3RoaXMuXycgKyBmaWVsZC5pZCArICcgPSByb3cuJyArIGZpZWxkLmlkICsgJzsnO1xuICAgICAgICB9KS5qb2luKCc7XFxuJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBkYXRlZmllbGQgY29udmVyc2lvblxuICAgICAgICBmdW5jU3RyaW5nICs9IGZpZWxkcy5tYXAoZnVuY3Rpb24gKHgsaykge1xuICAgICAgICAgICAgaWYgKCh4LnR5cGUgPT0gJ2RhdGUnKSB8fCAoeC50eXBlID09ICdkYXRldGltZScpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gcm93LicgKyBrICsgJz9uZXcgRGF0ZShyb3cuJyArIGsgKyAnICogMTAwMCAtICcgKyB1dGlscy50ek9mZnNldCArICcpOm51bGw7XFxuJzsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHgudHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RoaXMuJyArIGsgKyAnID0gKHJvdy4nICsgayArICcgPT09IFwiVFwiKSB8fCAocm93LicgKyBrICsgJyA9PT0gdHJ1ZSk7XFxuJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0aGlzLicgKyBrICsgJyA9IHJvdy4nICsgayArICc7XFxuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudG9TdHJpbmcoJ1xcbicpOyArICdcXG4nO1xuXG4gICAgICAgIGZ1bmNTdHJpbmcgKz0gXCJpZiAocGVybWlzc2lvbnMpIHt0aGlzLl9wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zICYmIExhenkocGVybWlzc2lvbnMpLm1hcChmdW5jdGlvbiAoeCkgeyByZXR1cm4gW3gsIHRydWVdIH0pLnRvT2JqZWN0KCk7fVwiXG5cbiAgICAgICAgXG4gICAgICAgIC8vIG1hc3RlciBjbGFzcyBmdW5jdGlvblxuICAgICAgICB2YXIgS2xhc3MgPSBuZXcgRnVuY3Rpb24oJ3JvdycsICdwZXJtaXNzaW9ucycsZnVuY1N0cmluZylcblxuICAgICAgICBLbGFzcy5wcm90b3R5cGUub3JtID0gZXh0T1JNO1xuICAgICAgICBLbGFzcy5yZWZfdHJhbnNsYXRpb25zID0ge307XG4gICAgICAgIEtsYXNzLm1vZGVsTmFtZSA9IG1vZGVsLm5hbWU7XG4gICAgICAgIEtsYXNzLnJlZmVyZW5jZXMgPSBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLnBsdWNrKCdpZCcpLnRvQXJyYXkoKTtcblxuICAgICAgICBLbGFzcy5pbnZlcnNlX3JlZmVyZW5jZXMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAvLyBtYW5hZ2luZyByZWZlcmVuY2VzIHdoZXJlIFxuICAgICAgICAgICAgcmV0dXJuIHguYnkgKyAnXycgKyB4LmlkICsgJ19zZXQnXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5yZWZlcmVudHMgPSBtb2RlbC5yZWZlcmVuY2VkQnkubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW3guYnksIHguaWRdXG4gICAgICAgIH0pO1xuICAgICAgICBLbGFzcy5maWVsZHNPcmRlciA9IG1vZGVsLmZpZWxkT3JkZXI7XG4gICAgICAgIEtsYXNzLmFsbFBlcm1pc3Npb25zID0gbW9kZWwucGVybWlzc2lvbnM7XG5cbiAgICAgICAgLy8gcmVkZWZpbmluZyB0b1N0cmluZyBtZXRob2RcbiAgICAgICAgaWYgKExhenkobW9kZWwucmVwcmVzZW50YXRpb24pLnNpemUoKSl7XG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9TdHJpbmcgPSBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzLicgKyBMYXp5KG1vZGVsLnJlcHJlc2VudGF0aW9uKS50b1N0cmluZygnICsgXCIgXCIgKyB0aGlzLicpKTtcbiAgICAgICAgfVxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9VcHBlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyByZWRlZmluZSB0byBVcHBlckNhc2VcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKTtcbiAgICAgICAgfTtcbiAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUudG9Mb3dlckNhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuZGVsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gZGVsZXRlIGluc3RhbmNlIGZyb20gc2VydmVyXG4gICAgICAgICAgICByZXR1cm4gZXh0T1JNLmRlbGV0ZSh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSwgW3RoaXMuaWRdKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBwZXJtaXNzaW9uIGdldHRlciBwcm9wZXJ0eVxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoS2xhc3MucHJvdG90eXBlLCAncGVybWlzc2lvbnMnLCB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fcGVybWlzc2lvbnMpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGlua2VyLnBlcm1pc3Npb25zW3RoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lXS5hc2sodGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gZ2V0dGluZyBmdWxsIHBlcm1pc3Npb24gdGFibGUgZm9yIGFuIG9iamVjdFxuICAgICAgICBLbGFzcy5wcm90b3R5cGUuYWxsX3Blcm1zID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICB2YXIgb2JqZWN0X2lkID0gdGhpcy5pZDtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9hbGxfcGVybXMnLCB7aWQ6IHRoaXMuaWR9LCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBwZXJtaXNzaW9ucyA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGdyb3VwZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgdW5rbm93bl9ncm91cHMgPSBMYXp5KHBlcm1pc3Npb25zKS5wbHVjaygnZ3JvdXBfaWQnKS51bmlxdWUoKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnICsgeFxuICAgICAgICAgICAgICAgIH0pLmRpZmZlcmVuY2UoSURCLmF1dGhfZ3JvdXAua2V5cygpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgTGF6eShwZXJtaXNzaW9ucykuZ3JvdXBCeShmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5ncm91cF9pZFxuICAgICAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24gKHYsIGspIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBlZFtrXSA9IExhenkodikucGx1Y2soJ25hbWUnKS50b0FycmF5KClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbCA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKG5ldyBQZXJtaXNzaW9uVGFibGUob2JqZWN0X2lkLCBLbGFzcywgZ3JvdXBlZCkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKHVua25vd25fZ3JvdXBzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ2V0KCdhdXRoX2dyb3VwJyx1bmtub3duX2dyb3VwcyxjYWxsKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGNhbGwoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIHZhciBvID0gdGhpcy5hc1JhdygpO1xuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IEtsYXNzLmZpZWxkcztcbiAgICAgICAgICAgIHZhciBJRCA9IHRoaXMuaWQ7XG4gICAgICAgICAgICB2YXIgbW9kZWxOYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5tb2RlbE5hbWU7XG4gICAgICAgICAgICBpZiAoYXJncykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGFyZyBpbiBhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG9bYXJnXSA9IGFyZ3NbYXJnXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBlbGltaW5hdGUgdW53cml0YWJsZXNcbiAgICAgICAgICAgIExhenkoS2xhc3MuZmllbGRzT3JkZXIpLmZpbHRlcihmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTsvLyByZXR1cm4gIWZpZWxkc1t4XS53cml0YWJsZTtcbiAgICAgICAgICAgIH0pLmVhY2goZnVuY3Rpb24oZmllbGROYW1lKXtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGROYW1lIGluIG8pIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG9bZmllbGROYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBwcm9taXNlID0gVzJQUkVTT1VSQ0UuJHBvc3QobW9kZWxOYW1lICsgKElEID8gJy9wb3N0JyA6ICcvcHV0JyksIG8pO1xuICAgICAgICAgICAgaWYgKGFyZ3MgJiYgKGFyZ3MuY29uc3RydWN0b3IgPT09IEZ1bmN0aW9uKSl7XG4gICAgICAgICAgICAgICAgLy8gcGxhY2luZyBjYWxsYmFjayBpbiBhIGNvbW1vbiBwbGFjZVxuICAgICAgICAgICAgICAgIHByb21pc2UuY29udGV4dC5zYXZpbmdFcnJvckhhbmxkZXIgPSBhcmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2VcbiAgICAgICAgfTtcbiAgICAgICAgS2xhc3MucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb2JqID0gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy5hc1JhdygpKTtcbiAgICAgICAgICAgIG9iai5fcGVybWlzc2lvbnMgPSB0aGlzLl9wZXJtaXNzaW9ucztcbiAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYnVpbGRpbmcgc2VyaWFsaXphdGlvbiBmdW5jdGlvblxuICAgICAgICB2YXIgYXNyID0gJ3JldHVybiB7XFxuJyArIExhenkobW9kZWwucmVmZXJlbmNlcykubWFwKGZ1bmN0aW9uKGZpZWxkKXtcbiAgICAgICAgICAgIHJldHVybiBmaWVsZC5pZCArICcgOiB0aGlzLl8nICsgZmllbGQuaWQ7XG4gICAgICAgIH0pLmNvbmNhdChmaWVsZHMubWFwKGZ1bmN0aW9uICh4LGspIHtcbiAgICAgICAgICAgIGlmICgoeC50eXBlID09ICdkYXRlJykgfHwgKHgudHlwZSA9PSAnZGF0ZXRpbWUnKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogKHRoaXMuJyArIGsgKyAnPyhNYXRoLnJvdW5kKHRoaXMuJyArIGsgKyAnLmdldFRpbWUoKSAtIHRoaXMuJyArIGsgKyAnLmdldFRpbWV6b25lT2Zmc2V0KCkgKiA2MDAwMCkgLyAxMDAwKTpudWxsKSc7IFxuICAgICAgICAgICAgfSBlbHNlIGlmICh4LnR5cGUgPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGsgKyAnIDogdGhpcy4nICsgayArICc/XCJUXCI6XCJGXCInO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gayArICcgOiB0aGlzLicgKyBrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSkudG9TdHJpbmcoJyxcXG4nKSArICd9Oyc7XG4gICAgICAgIEtsYXNzLnByb3RvdHlwZS5hc1JhdyA9IG5ldyBGdW5jdGlvbihhc3IpO1xuXG4gICAgICAgIEtsYXNzLnNhdmVNdWx0aSA9IGZ1bmN0aW9uIChvYmplY3RzLCBjYiwgc2NvcGUpIHtcbiAgICAgICAgICAgIHZhciByYXcgPSBbXTtcbiAgICAgICAgICAgIHZhciBkZWxldGFibGUgPSBMYXp5KEtsYXNzLmZpZWxkcylcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAheC53cml0YWJsZVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnBsdWNrKCdpZCcpXG4gICAgICAgICAgICAgICAgLnRvQXJyYXkoKTtcbiAgICAgICAgICAgIExhenkob2JqZWN0cylcbiAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmFzUmF3KClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIExhenkoZGVsZXRhYmxlKS5lYWNoKGZ1bmN0aW9uICh5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgeFt5XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJhdy5wdXNoKHgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuJHBvc3QoS2xhc3MubW9kZWxOYW1lLCAncHV0Jywge211bHRpcGxlOiByYXcsIGZvcm1JZHggOiBXMlBSRVNPVVJDRS5mb3JtSWR4Kyt9LCBmdW5jdGlvbiAoZWxlbXMpIHtcbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3REYXRhKGVsZW1zKTtcbiAgICAgICAgICAgICAgICB2YXIgdGFiID0gSURCW0tsYXNzLm1vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgdmFyIG9ianMgPSBMYXp5KGVsZW1zW0tsYXNzLm1vZGVsTmFtZV0ucmVzdWx0cykucGx1Y2soJ2lkJykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YWIuZ2V0KHgpXG4gICAgICAgICAgICAgICAgfSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIGlmIChjYikge1xuICAgICAgICAgICAgICAgICAgICBjYihvYmpzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBzY29wZSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmICgnZXh0cmFfdmVyYnMnIGluIG1vZGVsKVxuICAgICAgICAgICAgTGF6eShtb2RlbC5leHRyYV92ZXJicykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHZhciBmdW5jTmFtZSA9IHhbMF07XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSB4WzFdO1xuICAgICAgICAgICAgICAgIHZhciBkZGF0YSA9ICdkYXRhID0ge2lkIDogdGhpcy5pZCc7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBkZGF0YSArPSAnLCAnICsgTGF6eShhcmdzKS5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geCArICcgOiAnICsgeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJywnKTtcbiAgICAgICAgICAgICAgICBkZGF0YSArPSAnfTsnO1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaCgnY2InKTtcbiAgICAgICAgICAgICAgICBLbGFzcy5wcm90b3R5cGVbZnVuY05hbWVdID0gbmV3IEZ1bmN0aW9uKGFyZ3MsIGRkYXRhICsgJ1cyUy5XMlBfUE9TVCh0aGlzLmNvbnN0cnVjdG9yLm1vZGVsTmFtZSxcIicgKyBmdW5jTmFtZSArICdcIiwgZGF0YSxmdW5jdGlvbihkYXRhLHN0YXR1cyxoZWFkZXJzLHgpeycgK1xuICAgICAgICAgICAgICAgICAgICAndHJ5e1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAnICAgaWYgKCFoZWFkZXJzKFwibm9tb2RlbFwiKSkge3dpbmRvdy5XMlMuZ290RGF0YShkYXRhLGNiKTt9XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICcgICBlbHNlIHtpZiAoY2IpIHtjYihkYXRhKX19XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICd9IGNhdGNoKGUpe1xcbicgK1xuICAgICAgICAgICAgICAgICAgICAnaWYgKGNiKSB7Y2IoZGF0YSk7fVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfVxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnfSk7XFxuJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKCdwcml2YXRlQXJncycgaW4gbW9kZWwpIHtcbiAgICAgICAgICAgIEtsYXNzLnByaXZhdGVBcmdzID0gTGF6eShtb2RlbC5wcml2YXRlQXJncykua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbeCwgdHJ1ZV07XG4gICAgICAgICAgICB9KS50b09iamVjdCgpO1xuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLnNhdmVQQSA9IGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgdmFyIFQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBvbyA9IHtpZDogdGhpcy5pZH07XG4gICAgICAgICAgICAgICAgdmFyIFBBID0gdGhpcy5jb25zdHJ1Y3Rvci5wcml2YXRlQXJncztcbiAgICAgICAgICAgICAgICB2YXIgRnMgPSB0aGlzLmNvbnN0cnVjdG9yLmZpZWxkcztcbiAgICAgICAgICAgICAgICB2YXIgdCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG8pLmFzUmF3KCk7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkSWR4ID0gTGF6eShQQSkua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIEZzW3hdXVxuICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgTGF6eShvKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoayBpbiBQQSkgJiYgZmllbGRJZHhba10ud3JpdGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9vW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KHRoaXMuY29uc3RydWN0b3IubW9kZWxOYW1lICsgJy9zYXZlUEEnLCBvbywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG9vKS5lYWNoKGZ1bmN0aW9uICh2LCBrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBUW2tdID0gdjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbW9kZWxDYWNoZVtLbGFzcy5tb2RlbE5hbWVdID0gS2xhc3M7XG4gICAgICAgIC8vIGFkZGluZyBpZCB0byBmaWVsZHNcbiAgICAgICAgZm9yICh2YXIgZiBpbiBtb2RlbC5maWVsZHMpIHtcbiAgICAgICAgICAgIG1vZGVsLmZpZWxkc1tmXS5pZCA9IGY7XG4gICAgICAgIH1cbiAgICAgICAgS2xhc3MuZmllbGRzID0gTGF6eShtb2RlbC5maWVsZHMpLmNvbmNhdChMYXp5KG1vZGVsLnByaXZhdGVBcmdzKSkuY29uY2F0KExhenkobW9kZWwucmVmZXJlbmNlcykudGFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICB4LnR5cGUgPSB4LnR5cGUgfHwgJ3JlZmVyZW5jZSdcbiAgICAgICAgfSkpLmluZGV4QnkoJ2lkJykudG9PYmplY3QoKTtcbiAgICAgICAgLy8gYnVpbGRpbmcgcmVmZXJlbmNlcyB0byAobWFueSB0byBvbmUpIGZpZWxkc1xuICAgICAgICBMYXp5KG1vZGVsLnJlZmVyZW5jZXMpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGV4dF9yZWYgPSByZWYudG87XG4gICAgICAgICAgICB2YXIgbG9jYWxfcmVmID0gJ18nICsgcmVmLmlkO1xuICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5pZCxmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZXh0X3JlZiBpbiBJREIpKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKGV4dF9yZWYsZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rZXIubWFpbkluZGV4W2V4dF9yZWZdLmFzayh0aHNbbG9jYWxfcmVmXSx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSAoZXh0X3JlZiBpbiBJREIpICYmIHRoaXNbbG9jYWxfcmVmXSAmJiBJREJbZXh0X3JlZl0uZ2V0KHRoaXNbbG9jYWxfcmVmXSk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgJiYgKGV4dF9yZWYgaW4gbGlua2VyLm1haW5JbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYXNraW5nIHRvIGxpbmtlclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGlua2VyLm1haW5JbmRleFtleHRfcmVmXS5hc2sodGhpc1tsb2NhbF9yZWZdLHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5jb25zdHJ1Y3Rvci5tb2RlbE5hbWUgIT0gZXh0X3JlZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IGNhbiBhc3NpZ24gb25seSAnICsgZXh0X3JlZiArICcgdG8gJyArIHJlZi5pZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpc1tsb2NhbF9yZWZdID0gdmFsdWUuaWQ7XG4gICAgICAgICAgICB9LCAnbmV3LScgKyBleHRfcmVmLCAnZGVsZXRlZC0nICsgZXh0X3JlZiwndXBkYXRlZC0nICsgZXh0X3JlZiwgJ25ldy1tb2RlbC0nICsgZXh0X3JlZik7XG5cblxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShyZWYuaWQpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0T1JNLmdldChleHRfcmVmLHRoaXNbbG9jYWxfcmVmXSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgICAvL2J1aWxkaW5nIHJlZmVyZW5jZXMgdG8gKG9uZSB0byBtYW55KSBmaWVsZHNcbiAgICAgICAgTGF6eShtb2RlbC5yZWZlcmVuY2VkQnkpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHJlZi5ieSArICcuJyArIHJlZi5pZDtcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSByZWYuYnkgKyAnXycgKyB1dGlscy5wbHVyYWxpemUocmVmLmlkKTtcbiAgICAgICAgICAgIHZhciByZXZJbmRleCA9IHJlZi5ieTtcbiAgICAgICAgICAgIGlmIChLbGFzcy5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgICAgICAgICRsb2cuZXJyb3IoJ1RyeWVkIHRvIHJlZGVmaW5lIHByb3BlcnR5ICcgKyBwcm9wZXJ0eU5hbWUgKyAncycgKyAnIGZvciAnICsgS2xhc3MubW9kZWxOYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHByb3BlcnR5TmFtZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gKHJldkluZGV4IGluIElEQikgPyBSRVZJRFhbaW5kZXhOYW1lXS5nZXQodGhpcy5pZCArICcnKTpudWxsO1xuICAgICAgICAgICAgICAgICAgICBsaW5rZXIuZm9yZWlnbktleXNbaW5kZXhOYW1lXS5hc2sodGhpcy5pZCx0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICB9LCBudWxsLCAnbmV3LScgKyByZXZJbmRleCwgJ3VwZGF0ZWQtJyArIHJldkluZGV4LCAnZGVsZXRlZC0nICsgcmV2SW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZSh1dGlscy5wbHVyYWxpemUocmVmLmJ5KSldID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBvcHRzID0ge307XG4gICAgICAgICAgICAgICAgb3B0c1tyZWYuaWRdID0gW3RoaXMuaWRdO1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRPUk0ucXVlcnkocmVmLmJ5LG9wdHMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9idWlsZGluZyByZWZlcmVuY2UgdG8gKG1hbnkgdG8gbWFueSkgZmllbGRzXG4gICAgICAgIGlmIChtb2RlbC5tYW55VG9NYW55KSB7XG4gICAgICAgICAgICBMYXp5KG1vZGVsLm1hbnlUb01hbnkpLmVhY2goZnVuY3Rpb24gKHJlZikge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSByZWYuaW5kZXhOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCA9IHJlZi5maXJzdD8gMCA6IDE7XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbE5hbWUgPSByZWYubW9kZWw7XG4vLyAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gZ2V0SW5kZXgob21vZGVsTmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIGdldHRlciA9IGxpbmtlci5tMm1JbmRleFtpbmRleE5hbWVdWydnZXQnICsgKDEgLSBmaXJzdCldO1xuXG4gICAgICAgICAgICAgICAgY2FjaGVkUHJvcGVydHlCeUV2ZW50cyhLbGFzcy5wcm90b3R5cGUsIHJlZi5tb2RlbCArICdzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWRzID0gZ2V0dGVyKHRocy5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ2V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1cyUFJFU09VUkNFLmZldGNoKG9tb2RlbE5hbWUsIHtpZCA6IGlkc30pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldCA9IGdldEluZGV4KG9tb2RlbE5hbWUpLmdldC5iaW5kKElEQltvbW9kZWxOYW1lXSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHMgJiYgZ2V0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldCA9IExhenkoaWRzKS5tYXAoZ2V0KS5maWx0ZXIodXRpbHMuYm9vbCkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICAgICAgICAgICAgfSwgbnVsbCwgJ3JlY2VpdmVkLW0ybS0nICsgaW5kZXhOYW1lLCAncmVjZWl2ZWQtJyArIG9tb2RlbE5hbWUpO1xuXG4gICAgICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZSh1dGlscy5wbHVyYWxpemUob21vZGVsTmFtZSkpXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRocyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtlci5nZXRNMk0oaW5kZXhOYW1lLCBbdGhzLmlkXSwgZmlyc3QsZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHMgPSBnZXR0ZXIodGhzLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkcy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gob21vZGVsTmFtZSwge2lkIDogaWRzfSxudWxsLGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdldCA9IElEQltvbW9kZWxOYW1lXS5nZXQuYmluZChJREJbb21vZGVsTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChMYXp5KGlkcykubWFwKGdldCkuZmlsdGVyKHV0aWxzLmJvb2wpLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY2VwdChbXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgICAgICBLbGFzcy5maWVsZHNbdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWxOYW1lKV0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiB1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB1dGlscy5jYXBpdGFsaXplKG9tb2RlbE5hbWUpLFxuICAgICAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcmVhZGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdNMk0nLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3JzOiBbXVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBLbGFzcy5wcm90b3R5cGUudW5saW5rUmVmZXJlbmNlID0gZnVuY3Rpb24gKGluc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIElEID0gdGhpcy5pZDtcbiAgICAgICAgICAgICAgICB2YXIgaW5zdGFuY2VzID0gW107XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmNvbnN0cnVjdG9yLm5hbWUgPT0gJ0FycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICBtdWx0aXBsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlcyA9IGluc3RhbmNlO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IGluc3RhbmNlc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG9tb2RlbCA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLm1vZGVsTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAobXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBMYXp5KGluc3RhbmNlcykucGx1Y2soJ2lkJykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW0lELCB4XVxuICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBbW0lELCBpbnN0YW5jZS5pZF1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWwgKyAncy9kZWxldGUnLCB7Y29sbGVjdGlvbjogY29sbGVjdGlvbn0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgS2xhc3MucHJvdG90eXBlLmxpbmtSZWZlcmVuY2UgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGlwbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgSUQgPSB0aGlzLmlkO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY29uc3RydWN0b3IubmFtZSA9PSAnQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIG11bHRpcGxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VzID0gaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gaW5zdGFuY2VzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb21vZGVsID0gaW5zdGFuY2UuY29uc3RydWN0b3IubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWw7XG4gICAgICAgICAgICAgICAgaWYgKG11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWZzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleE5hbWUgaW4gSU5ERVhfTTJNKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWZzID0gTGF6eShpbnN0YW5jZXMpLnBsdWNrKCdpZCcpLmRpZmZlcmVuY2UoTGF6eShJTkRFWF9NMk1baW5kZXhOYW1lXVswXS5nZXQodGhpcy5pZCkpKS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaW5kZXhOYW1lID0gb21vZGVsICsgJy8nICsgS2xhc3MubW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXhOYW1lIGluIElOREVYX00yTSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVmcyA9IExhenkoaW5zdGFuY2VzKS5wbHVjaygnaWQnKS5kaWZmZXJlbmNlKExhenkoSU5ERVhfTTJNW2luZGV4TmFtZV1bMF0uZ2V0KHRoaXMuaWQpKSkudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWZzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBMYXp5KHJlZnMpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbSUQsIHhdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBfUE9TVChLbGFzcy5tb2RlbE5hbWUsIG9tb2RlbCArICdzL3B1dCcsIHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9ufSwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChpbmRleE5hbWUgaW4gbGlua2VyLm0ybUluZGV4KSAmJiBMYXp5KGxpbmtlci5tMm1JbmRleFtpbmRleE5hbWVdWydnZXQnICsgdXRpbHMuY2FwaXRhbGl6ZShvbW9kZWwpXShpbnN0YW5jZS5pZCkpLmZpbmQodGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS4kcG9zdChLbGFzcy5tb2RlbE5hbWUgKyAnLycgKyBvbW9kZWwgKyAncy9wdXQnLCB7Y29sbGVjdGlvbjogW1t0aGlzLmlkLCBpbnN0YW5jZS5pZF1dfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBldmVudHMuZW1pdCgnbmV3LW1vZGVsJywgS2xhc3MpO1xuICAgICAgICBldmVudHMuZW1pdCgnbmV3LW1vZGVsLScgKyBLbGFzcy5tb2RlbE5hbWUpO1xuICAgICAgICByZXR1cm4gS2xhc3M7XG4gICAgfTtcblxuICAgIHRoaXMuZ290RGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBjYWxsQmFjaykge1xuICAgICAgICAvLyByZWNlaXZlIGFsbCBkYXRhIGZyb20gZXZlcnkgZW5kIHBvaW50XG4gICAgICAgIGNvbnNvbGUuaW5mbygnZ290RGF0YScpO1xuICAgICAgICBpZiAodHlwZW9mKGRhdGEpID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZGF0YSAnICsgZGF0YSArICcgcmVmdXNlZCBmcm9tIGdvdERhdGEoKScpO1xuICAgICAgICAgICAgaWYgKGNhbGxCYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNsZWFuIGRhdGEgZnJvbSByZWxhdGlvbnMgYW5kIHBlcm1pc3Npb25zIGZvciB1c2luZyBpdCBhZnRlciBtb2RlbCBwYXJzaW5nXG4gICAgICAgIGlmICgnX2V4dHJhJyBpbiBkYXRhKXsgZGVsZXRlIGRhdGEuX2V4dHJhIH1cbiAgICAgICAgdmFyIFRPT05FID0gZGF0YS5UT09ORTtcbiAgICAgICAgdmFyIFRPTUFOWSA9IGRhdGEuVE9NQU5ZO1xuICAgICAgICB2YXIgTUFOWVRPTUFOWSA9IGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgdmFyIFBFUk1JU1NJT05TID0gZGF0YS5QRVJNSVNTSU9OUztcbiAgICAgICAgdmFyIFBBID0gZGF0YS5QQTtcbiAgICAgICAgZGVsZXRlIGRhdGEuVE9PTkU7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuTUFOWVRPTUFOWTtcbiAgICAgICAgZGVsZXRlIGRhdGEuUEVSTUlTU0lPTlM7XG4gICAgICAgIGRlbGV0ZSBkYXRhLlBBO1xuICAgICAgICBpZiAoIVBBKSB7IFBBID0ge307IH1cblxuICAgICAgICAvLyBjbGVhbmluZyBmcm9tIHVzZWxlc3MgZGVsZXRlZCBkYXRhXG4gICAgICAgIGRhdGEgPSBMYXp5KGRhdGEpLmZpbHRlcihmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgcmV0dXJuICghKCdkZWxldGVkJyBpbiB2KSB8fCAoKGsgaW4gVzJQUkVTT1VSQ0UubW9kZWxDYWNoZSkpKTtcbiAgICAgICAgfSkudG9PYmplY3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgnbTJtJyBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbTJtID0gZGF0YS5tMm07XG4gICAgICAgICAgICBkZWxldGUgZGF0YVsnbTJtJ107XG4gICAgICAgIH1cbiAgICAgICAgTGF6eShkYXRhKS5lYWNoKGZ1bmN0aW9uIChkYXRhLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsQ2xhc3MgPSBtb2RlbDtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5yZXN1bHRzICYmIChkYXRhLnJlc3VsdHMubGVuZ3RoID4gMCkgJiYgKGRhdGEucmVzdWx0c1swXS5jb25zdHJ1Y3RvciA9PSBBcnJheSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5yZXN1bHRzID0gTGF6eShkYXRhLnJlc3VsdHMpLm1hcChmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBMYXp5KG1vZGVsQ2xhc3MuZmllbGRzT3JkZXIpLnppcCh4KS50b09iamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSBMYXp5KGRhdGEucmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgdmFyIGRlbGV0ZWQgPSBkYXRhLmRlbGV0ZWQ7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsTmFtZSBpbiBQQSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgTVBBID0gUEFbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgTGF6eShyZXN1bHRzKS5lYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmQuaWQgaW4gTVBBKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF6eShNUEFbcmVjb3JkLmlkXSkuZWFjaChmdW5jdGlvbiAodiwgaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmRba10gPSB2O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGluZGV4aW5nIHJlZmVyZW5jZXMgYnkgaXRzIElEXG4gICAgICAgICAgICAgICAgdmFyIGl0YWIgPSBnZXRJbmRleChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB0YWJsZSA9IGl0YWIuc291cmNlO1xuXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IGRlbGV0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGRlbGV0ZWQpe1xuICAgICAgICAgICAgICAgICAgICBkZWxldGVkLmZvckVhY2goZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGFibGVbeF07XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuLypcbiAgICAgICAgICAgICAgICBMYXp5KGRlbGV0ZWQpLmVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhYmxlW3hdO1xuICAgICAgICAgICAgICAgIH0pO1xuKi9cbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gcmVzdWx0cy5pbmRleEJ5KCdpZCcpO1xuICAgICAgICAgICAgICAgIHZhciBpayA9IGlkeC5rZXlzKCk7XG4gICAgICAgICAgICAgICAgdmFyIG5uZXcgPSBpay5kaWZmZXJlbmNlKGl0YWIua2V5cygpLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQoeClcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgdmFyIHVwZGF0ZWQgPSBpay5kaWZmZXJlbmNlKG5uZXcpO1xuICAgICAgICAgICAgICAgIC8vIHJlbW92aW5nIG9sZCBpZGVudGljYWwgdmFsdWVzXG4gICAgICAgICAgICAgICAgdXBkYXRlZCA9IHVwZGF0ZWQuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhdXRpbHMuc2FtZUFzKGlkeC5nZXQoeCksIGl0YWIuZ2V0KHgpLmFzUmF3KCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIGNsYXNzaWZ5IHJlY29yZHNcbiAgICAgICAgICAgICAgICB2YXIgcGVybXMgPSBkYXRhLnBlcm1pc3Npb25zID8gTGF6eShkYXRhLnBlcm1pc3Npb25zKSA6IExhenkoe30pO1xuICAgICAgICAgICAgICAgIHZhciBuZXdPYmplY3RzID0gbm5ldy5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCksIHBlcm1zLmdldCh4KSlcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vLy8gY2xhc3NpZnlpbmcgdXBkYXRlZFxuICAgICAgICAgICAgICAgIC8vdmFyIHVwZGF0ZWRPYmplY3RzID0gdXBkYXRlZC5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkscGVybXMuZ2V0KHgpKX0pO1xuICAgICAgICAgICAgICAgIC8vdmFyIHVvID0gdXBkYXRlZE9iamVjdHMudG9BcnJheSgpO1xuICAgICAgICAgICAgICAgIC8vdXBkYXRlZE9iamVjdHMgPSBMYXp5KHVvKS5tYXAoZnVuY3Rpb24oeCl7cmV0dXJuIFt4LHRhYmxlW3guaWRdXX0pLnRvQXJyYXkoKTtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGluZyBzaW5nbGUgb2JqZWN0c1xuICAgICAgICAgICAgICAgIHZhciBjaGFuZ2VkID0gW107XG4vLyAgICAgICAgICAgICAgICB2YXIgREFURUZJRUxEUyA9IE1PREVMX0RBVEVGSUVMRFNbbW9kZWxOYW1lXTtcbi8vICAgICAgICAgICAgICAgIHZhciBCT09MRklFTERTID0gTU9ERUxfQk9PTEZJRUxEU1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgIHVwZGF0ZWQuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSXRlbSA9IGl0YWIuZ2V0KHgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkQ29weSA9IG9sZEl0ZW0uY29weSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3SXRlbSA9IG5ldyBtb2RlbENsYXNzKGlkeC5nZXQoeCkpO1xuICAgICAgICAgICAgICAgICAgICBMYXp5KG1vZGVsLmZpZWxkcykua2V5cygpLmVhY2goZnVuY3Rpb24oayl7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbGRJdGVtW2tdID0gbmV3SXRlbVtrXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChbb2xkSXRlbSwgb2xkQ29weV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8vLyBzZW5kaW5nIHNpZ25hbCBmb3IgdXBkYXRlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBpZiAoY2hhbmdlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ3VwZGF0ZWQtJyArIG1vZGVsTmFtZSwgY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vKioqKioqKiogVXBkYXRlIHVuaXZlcnNlICoqKioqKioqXG4gICAgICAgICAgICAgICAgdmFyIG5vID0gbmV3T2JqZWN0cy50b0FycmF5KCk7XG4gICAgICAgICAgICAgICAgTGF6eShubykuZWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICB0YWJsZVt4LmlkXSA9IHhcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyByZWJ1bGRpbmcgcmV2ZXJzZSBpbmRleGVzXG4gICAgICAgICAgICAgICAgTGF6eShtb2RlbENhY2hlW21vZGVsTmFtZV0ucmVmZXJlbmNlcykuZWFjaChmdW5jdGlvbiAocmVmKSB7XG4gICAgICAgICAgICAgICAgICAgIFJFVklEWFttb2RlbE5hbWUgKyAnLicgKyByZWZdID0gSURCW21vZGVsTmFtZV0uZ3JvdXBCeSgnXycgKyByZWYpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHNlbmRpbmcgZXZlbnRzIGZvciBuZXcgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKG5vLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ25ldy0nICsgbW9kZWxOYW1lLCBMYXp5KG5vKSwgZGF0YS50b3RhbFJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIGlmIChkZWxldGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KCdkZWxldGVkLScgKyBtb2RlbE5hbWUsIGRlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBzZW5kaW5nIGV2ZW50cyBmb3IgZGF0YSBhcnJpdmVkXG4gICAgICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ3JlY2VpdmVkLScgKyBtb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoVE9PTkUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RPT05FJyk7XG4gICAgICAgICAgICBMYXp5KFRPT05FKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBtb2RlbE5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtb2RlbE5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciB1ZHggPSBnZXRVbmxpbmtlZChtb2RlbE5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFRPTUFOWSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignVE9NQU5ZJyk7XG4gICAgICAgICAgICBMYXp5KFRPTUFOWSkuZWFjaChmdW5jdGlvbiAodmFscywgaW5kZXhOYW1lKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIEFTS0VEX1VOTElOS0VEKSkge1xuICAgICAgICAgICAgICAgICAgICBBU0tFRF9VTkxJTktFRFtpbmRleE5hbWVdID0gTGF6eShbXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIExhenkodmFscykuZWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfVU5MSU5LRURbaW5kZXhOYW1lXS5zb3VyY2UucHVzaChpZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoTUFOWVRPTUFOWSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTUFOWVRPTUFOWScpO1xuICAgICAgICAgICAgTGF6eShNQU5ZVE9NQU5ZKS5lYWNoKGZ1bmN0aW9uICh2YWxzLCBpbmRleE5hbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3QgPSBwYXJzZUludChpbmRleE5hbWUuc3BsaXQoJ3wnKVsxXSk7XG4gICAgICAgICAgICAgICAgaW5kZXhOYW1lID0gaW5kZXhOYW1lLnNwbGl0KCd8JylbMF07XG4gICAgICAgICAgICAgICAgaWYgKCEoaW5kZXhOYW1lIGluIEFTS0VEX00yTSkpIHtcbiAgICAgICAgICAgICAgICAgICAgQVNLRURfTTJNW2luZGV4TmFtZV0gPSBbe30sIHt9XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIE1JRFggPSBBU0tFRF9NMk1baW5kZXhOYW1lXVtmaXJzdF07XG4gICAgICAgICAgICAgICAgTGF6eSh2YWxzKS5lYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIE1JRFhbeCArICcnXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIE1JRFhbeF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG0ybSkge1xuICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290TTJNKG0ybSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFBFUk1JU1NJT05TKSB7XG4gICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RQZXJtaXNzaW9ucyhQRVJNSVNTSU9OUyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2FsbEJhY2spIHtcbiAgICAgICAgICAgIGNhbGxCYWNrKGRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGV2ZW50cy5lbWl0KCdnb3QtZGF0YScpO1xuICAgIH07XG4gICAgdGhpcy5nb3RQZXJtaXNzaW9ucyA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbiAodiwgcmVzb3VyY2VOYW1lKSB7XG4gICAgICAgICAgICBMYXp5KHZbMF0pLmVhY2goZnVuY3Rpb24gKHJvdywgaWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoKHJlc291cmNlTmFtZSBpbiBJREIpICYmIChpZCBpbiBJREJbcmVzb3VyY2VOYW1lXS5zb3VyY2UpKXtcbiAgICAgICAgICAgICAgICAgICAgSURCW3Jlc291cmNlTmFtZV0uZ2V0KGlkKS5fcGVybWlzc2lvbnMgPSBMYXp5KHJvdykubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHRydWVdXG4gICAgICAgICAgICAgICAgICAgIH0pLnRvT2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoTGF6eSh2WzBdKS5zaXplKCkpe1xuICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmVtaXQoJ3VwZGF0ZS1wZXJtaXNzaW9ucy0nICsgcmVzb3VyY2VOYW1lLCBMYXp5KHZbMF0pLmtleXMoKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5lbWl0KCd1cGRhdGUtcGVybWlzc2lvbnMnKTtcbiAgICB9O1xuXG5cbiAgICB0aGlzLmdvdE0yTSA9IGZ1bmN0aW9uKG0ybSl7XG4gICAgICAgIExhenkobTJtKS5lYWNoKGZ1bmN0aW9uKGRhdGEsIGluZGV4TmFtZSl7XG4gICAgICAgICAgICB2YXIgbTJtSW5kZXggPSBsaW5rZXIubTJtSW5kZXhbaW5kZXhOYW1lXTtcbiAgICAgICAgICAgIExhenkoZGF0YSkuZWFjaChmdW5jdGlvbihtKXtcbiAgICAgICAgICAgICAgICBMYXp5KG0pLmVhY2goZnVuY3Rpb24oZGF0YSx2ZXJiKXtcbiAgICAgICAgICAgICAgICAgICAgbTJtSW5kZXhbdmVyYl0oZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGV2ZW50cy5lbWl0KCdyZWNlaXZlZC1tMm0nKTtcbiAgICAgICAgICAgIGV2ZW50cy5lbWl0KCdyZWNlaXZlZC1tMm0tJyArIGluZGV4TmFtZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuZmV0Y2ggPSBmdW5jdGlvbiAobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBjYWxsQmFjaykgeyAgLy9cbiAgICAgICAgLy8gaWYgYSBjb25uZWN0aW9uIGlzIGN1cnJlbnRseSBydW5uaW5nLCB3YWl0IGZvciBjb25uZWN0aW9uLlxuICAgICAgICBpZiAobW9kZWxOYW1lIGluIHdhaXRpbmdDb25uZWN0aW9ucyl7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZmV0Y2gobW9kZWxOYW1lLCBmaWx0ZXIsIHRvZ2V0aGVyLCBjYWxsQmFjayk7XG4gICAgICAgICAgICB9LDUwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBmZXRjaGluZyBhc3luY2hyb21vdXMgbW9kZWwgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmRlc2NyaWJlKG1vZGVsTmFtZSwgZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgICAgIC8vIGlmIGRhdGEgY2FtZXMgZnJvbSByZWFsdGltZSBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKFcyUFJFU09VUkNFLmNvbm5lY3Rpb24ub3B0aW9ucy5yZWFsdGltZUVuZFBvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIGdldHRpbmcgZmlsdGVyIGZpbHRlcmVkIGJ5IGNhY2hpbmcgc3lzdGVtXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlciA9IGxpc3RDYWNoZS5maWx0ZXIobW9kZWwsZmlsdGVyKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBpZiBzb210aGluZyBpcyBtaXNzaW5nIG9uIG15IGxvY2FsIERCIFxuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzayBmb3IgbWlzc2luZ3MgYW5kIHBhcnNlIHNlcnZlciByZXNwb25zZSBpbiBvcmRlciB0byBlbnJpY2ggbXkgbG9jYWwgREIuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGFjaW5nIGxvY2sgZm9yIHRoaXMgbW9kZWxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLiRwb3N0KG1vZGVsTmFtZSArICcvbGlzdCcsIHtmaWx0ZXIgOiBmaWx0ZXJ9LGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFcyUFJFU09VUkNFLmdvdERhdGEoZGF0YSxjYWxsQmFjaylcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbGVhc2UgbG9ja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVsZWFzZSBsb2NrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHdhaXRpbmdDb25uZWN0aW9uc1ttb2RlbE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcG9zdChtb2RlbE5hbWUgKyAnL2xpc3QnLCBzZW5kRGF0YSxmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdPVF9BTEwuc291cmNlLnB1c2gobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuZ290RGF0YShkYXRhLCBjYWxsQmFjayk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmdldCA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzLCBjYWxsQmFjayl7XG4gICAgICAgIC8vIHNlYXJjaCBvYmplY3RzIGZyb20gSURCLiBJZiBzb21lIGlkIGlzIG1pc3NpbmcsIGl0IHJlc29sdmUgaXQgYnkgdGhlIHNlcnZlclxuICAgICAgICAvLyBpZiBhIHJlcXVlc3QgdG8gdGhlIHNhbWUgbW9kZWwgaXMgcGVuZGluZywgd2FpdCBmb3IgaXRzIGNvbXBsZXRpb25cbiAgICAgICAgXG4gICAgICAgIGlmIChpZHMuY29uc3RydWN0b3IgIT09IEFycmF5KXtcbiAgICAgICAgICAgIGlkcyA9IFtpZHNdO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIHNvbWUgZW50aXR5IGlzIG1pc3NpbmcgXG4gICAgICAgIFcyUFJFU09VUkNFLmZldGNoKG1vZGVsTmFtZSAsIHtpZDogaWRzfSwgbnVsbCxmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xuICAgICAgICAgICAgdmFyIGl0YWIgPSBJREJbbW9kZWxOYW1lXVxuICAgICAgICAgICAgZm9yICh2YXIgaWQgaW4gaWRzKXtcbiAgICAgICAgICAgICAgICByZXQucHVzaChpdGFiLnNvdXJjZVtpZHNbaWRdXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYWxsQmFjayhyZXQpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5nb3RNb2RlbCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGZvciAodmFyIG1vZGVsTmFtZSBpbiBkYXRhKSB7XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSBkYXRhW21vZGVsTmFtZV07XG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2VbJ2Rlc2NyaXB0aW9uOicgKyBtb2RlbE5hbWVdID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgICAgICAgICBtb2RlbENhY2hlW21vZGVsTmFtZV0gPSBtYWtlTW9kZWxDbGFzcyhtb2RlbCk7XG4gICAgICAgICAgICBpZiAoIShtb2RlbE5hbWUgaW4gSURCKSkge1xuICAgICAgICAgICAgICAgIElEQlttb2RlbE5hbWVdID0gTGF6eSh7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5kZXNjcmliZSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgY2FsbEJhY2spe1xuICAgICAgICB2YXIgcmV0ID0gbW9kZWxDYWNoZVttb2RlbE5hbWVdO1xuICAgICAgICBpZiAocmV0KSB7XG4gICAgICAgICAgICBjYWxsQmFjayAmJiBjYWxsQmFjayhyZXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHdhaXRpbmdDb25uZWN0aW9ucykpe1xuICAgICAgICAgICAgICAgIGlmIChtb2RlbE5hbWUgaW4gZmFpbGVkTW9kZWxzKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBjYWNoZUtleSA9ICdkZXNjcmlwdGlvbjonICsgbW9kZWxOYW1lO1xuICAgICAgICAgICAgICAgIGlmIChjYWNoZUtleSBpbiBsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nb3RNb2RlbChKU09OLnBhcnNlKGxvY2FsU3RvcmFnZVtjYWNoZUtleV0pKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbEJhY2sgJiYgY2FsbEJhY2sobW9kZWxDYWNoZVttb2RlbE5hbWVdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB3YWl0aW5nQ29ubmVjdGlvbnNbbW9kZWxOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHBvc3QobW9kZWxOYW1lICsgJy9kZXNjcmliZScsbnVsbCwgZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5nb3RNb2RlbChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxCYWNrICYmIGNhbGxCYWNrKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgd2FpdGluZ0Nvbm5lY3Rpb25zW21vZGVsTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMubW9kZWxOb3RGb3VuZC5oYW5kbGUobW9kZWxOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxlZE1vZGVsc1ttb2RlbE5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB3YWl0IGZvciBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBXMlBSRVNPVVJDRS5kZXNjcmliZShtb2RlbE5hbWUsIGNhbGxCYWNrKTtcbiAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9ICAgICAgICBcbiAgICB9O1xuICAgIHRoaXMuYWRkTW9kZWxIYW5kbGVyID0gZnVuY3Rpb24gKG1vZGVsTmFtZSwgZGVjb3JhdG9yKSB7XG4gICAgICAgIHZhciBrZXkgPSB1dGlscy5oYXNoKGRlY29yYXRvcik7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlcnMpKSBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXSA9IG5ldyBIYW5kbGVyKCk7XG4gICAgICAgIGlmICghKG1vZGVsTmFtZSBpbiBidWlsZGVySGFuZGxlclVzZWQpKSBidWlsZGVySGFuZGxlclVzZWRbbW9kZWxOYW1lXSA9IHt9O1xuICAgICAgICBpZiAoa2V5IGluIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1aWxkZXJIYW5kbGVyVXNlZFttb2RlbE5hbWVdW2tleV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbE5hbWUgaW4gbW9kZWxDYWNoZSkge1xuICAgICAgICAgICAgZGVjb3JhdG9yKG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWxOYW1lXS5hZGRIYW5kbGVyKGRlY29yYXRvcik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuYWRkUGVyc2lzdGVudEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGF0dHJpYnV0ZXMpe1xuICAgICAgICB2YXIgYWRkUHJvcGVydHkgPSBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlcykge1xuICAgICAgICAgIGF0dHJpYnV0ZXMuZm9yRWFjaChmdW5jdGlvbih2YWwpe1xuICAgICAgICAgICAgdmFyIGtleSA9ICdwQTonICsgbW9kZWwubW9kZWxOYW1lICsgJzonICsgdmFsO1xuICAgICAgICAgICAgdmFyIGthdHRyID0gJ19fJyArIHZhbDtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtb2RlbC5wcm90b3R5cGUsIHZhbCwge1xuICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2F0dHIgaW4gdGhpcykpe1xuICAgICAgICAgICAgICAgICAgdmFyIHYgPSBsb2NhbFN0b3JhZ2Vba2V5ICsgdGhpcy5pZF07XG4gICAgICAgICAgICAgICAgICB0aGlzW2thdHRyXSA9IHY/SlNPTi5wYXJzZSh2KTpudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1trYXR0cl07XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpe1xuICAgICAgICAgICAgICAgIHRoaXNba2F0dHJdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlW2tleSArIHRoaXMuaWRdID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCEobW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKSkgeyBwZXJzaXN0ZW50QXR0cmlidXRlc1ttb2RlbE5hbWVdID0gW107IH1cbiAgICAgICAgdmFyIGF0dHJzID0gcGVyc2lzdGVudEF0dHJpYnV0ZXNbbW9kZWxOYW1lXTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIHZhciBuZXdBdHRycyA9IExhenkoYXR0cmlidXRlcykuZGlmZmVyZW5jZShhdHRycykudG9BcnJheSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5ld0F0dHJzID0gYXR0cnM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld0F0dHJzLmxlbmd0aCl7XG4gICAgICAgICAgICBpZiAobW9kZWxOYW1lIGluIG1vZGVsQ2FjaGUpe1xuICAgICAgICAgICAgICAgIGFkZFByb3BlcnR5KG1vZGVsQ2FjaGVbbW9kZWxOYW1lXSwgbmV3QXR0cnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZXMpe1xuICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGF0dHJzLG5ld0F0dHJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5vbignbmV3LW1vZGVsJywgZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIGJ1aWxkZXJIYW5kbGVycyl7XG4gICAgICAgICAgICBidWlsZGVySGFuZGxlcnNbbW9kZWwubW9kZWxOYW1lXS5oYW5kbGUobW9kZWxDYWNoZVttb2RlbC5tb2RlbE5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWwubW9kZWxOYW1lIGluIHBlcnNpc3RlbnRBdHRyaWJ1dGVzKXtcbiAgICAgICAgICAgIFcyUFJFU09VUkNFLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzKG1vZGVsLm1vZGVsTmFtZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmNvbm5lY3QgPSBmdW5jdGlvbihjYWxsQmFjayl7XG4gICAgICAgIGlmICh0aGlzLmlzQ29ubmVjdGVkKXtcbiAgICAgICAgICAgIGNhbGxCYWNrKHRoaXMuY29ubmVjdGlvbi5vcHRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5jb25uZWN0KGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgICAgICAgICAgICAgVzJQUkVTT1VSQ0UuaXNDb25uZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNhbGxCYWNrKHN0YXR1cyk7XG4gICAgICAgICAgICB9KTsgICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5xdWVyeSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgZmlsdGVyLCB0b2dldGhlciwgY2FsbEJhY2spe1xuICAgICAgICB2YXIgdGhzID0gdGhpcztcbiAgICAgICAgdGhpcy5kZXNjcmliZShtb2RlbE5hbWUsZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgLy8gYXJyYXlmaXkgYWxsIGZpbHRlciB2YWx1ZXNcbiAgICAgICAgICAgIGZpbHRlciA9IExhenkoZmlsdGVyKS5tYXAoZnVuY3Rpb24odixrKXsgcmV0dXJuIFtrLEFycmF5LmlzQXJyYXkodik/djpbdl1dfSkudG9PYmplY3QoKTtcbiAgICAgICAgICAgIHZhciBmaWx0ZXJGdW5jdGlvbiA9IHV0aWxzLm1ha2VGaWx0ZXIobW9kZWwsIGZpbHRlcik7XG4gICAgICAgICAgICB2YXIgaWR4ID0gZ2V0SW5kZXgobW9kZWxOYW1lKTtcbiAgICAgICAgICAgIHRocy5mZXRjaChtb2RlbE5hbWUsZmlsdGVyLHRvZ2V0aGVyLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgICAgICBjYWxsQmFjayhpZHguZmlsdGVyKGZpbHRlckZ1bmN0aW9uKS52YWx1ZXMoKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgfTtcbiAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKG1vZGVsTmFtZSwgaWRzLCBjYWxsQmFjayl7XG4gICAgICAgIHJldHVybiB0aGlzLiRwb3N0KG1vZGVsTmFtZSArICcvZGVsZXRlJywgeyBpZCA6IGlkc30sIGNhbGxCYWNrKTtcbiAgICB9O1xufTtcblxuZnVuY3Rpb24gcmVXaGVlbE9STShlbmRQb2ludCwgbG9naW5GdW5jKXtcbiAgICB0aGlzLiRvcm0gPSBuZXcgYmFzZU9STShuZXcgdXRpbHMucmVXaGVlbENvbm5lY3Rpb24oZW5kUG9pbnQsIGxvZ2luRnVuYyksdGhpcyk7XG4gICAgdGhpcy5vbiA9IHRoaXMuJG9ybS5vbi5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5lbWl0ID0gdGhpcy4kb3JtLmVtaXQuYmluZCh0aGlzLiRvcm0pO1xuICAgIHRoaXMudW5iaW5kID0gdGhpcy4kb3JtLnVuYmluZC5iaW5kKHRoaXMuJG9ybSk7XG4gICAgdGhpcy5hZGRNb2RlbEhhbmRsZXIgPSB0aGlzLiRvcm0uYWRkTW9kZWxIYW5kbGVyLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzID0gdGhpcy4kb3JtLmFkZFBlcnNpc3RlbnRBdHRyaWJ1dGVzLmJpbmQodGhpcy4kb3JtKTtcbiAgICB0aGlzLnV0aWxzID0gdXRpbHM7XG59XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmdldE1vZGVsID0gZnVuY3Rpb24obW9kZWxOYW1lKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGFjY2VwdCwgcmVqZWN0KXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi4kb3JtLmRlc2NyaWJlKG1vZGVsTmFtZSxhY2NlcHQpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihtb2RlbE5hbWUsIGlkcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBzaW5nbGUgPSBmYWxzZTtcbiAgICB2YXIgbW9kTmFtZSA9IG1vZGVsTmFtZTtcbiAgICBpZiAoaWRzLmNvbnN0cnVjdG9yICE9PSBBcnJheSl7XG4gICAgICAgIHNpbmdsZSA9IHRydWU7XG4gICAgICAgIGlkcyA9IFtpZHNdXG4gICAgfVxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKHNpbmdsZSl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5nZXQobW9kTmFtZSwgaWRzLCBmdW5jdGlvbihpdGVtcyl7IFxuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXB0KGl0ZW1zWzBdKTt9XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kb3JtLmdldChtb2ROYW1lLCBpZHMsIGFjY2VwdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5yZVdoZWVsT1JNLnByb3RvdHlwZS5xdWVyeSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGZpbHRlciwgcmVsYXRlZCl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHZhciB0b2dldGhlciA9IG51bGw7XG4gICAgICAgIGlmIChyZWxhdGVkICYmIChyZWxhdGVkLmNvbnN0cnVjdG9yID09PSBBcnJheSkgJiYgKHJlbGF0ZWQubGVuZ3RoKSl7XG4gICAgICAgICAgICB0b2dldGhlciA9IHJlbGF0ZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRlZCAmJiAocmVsYXRlZC5jb25zdHJ1Y3RvciA9PT0gU3RyaW5nKSAmJiAocmVsYXRlZC5sZW5ndGgpKXtcbiAgICAgICAgICAgIHRvZ2V0aGVyID0gcmVsYXRlZC5zcGxpdCgnLCcpO1xuICAgICAgICB9XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGlmIChzZWxmLiRvcm0uaXNDb25uZWN0ZWQpe1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5xdWVyeShtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGFjY2VwdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5jb25uZWN0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuJG9ybS5xdWVyeShtb2RlbE5hbWUsIGZpbHRlciwgdG9nZXRoZXIsIGFjY2VwdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgfSlcbn07XG5cbnJlV2hlZWxPUk0ucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uIChtb2RlbE5hbWUsIGlkcyl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihhY2NlcHQsIHJlamVjdCl7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGlmIChzZWxmLiRvcm0uY29ubmVjdGVkKXtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVsZXRlKG1vZGVsTmFtZSwgaWRzLCBhY2NlcHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZWxmLiRvcm0uY29ubmVjdChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRvcm0uZGVsZXRlKG1vZGVsTmFtZSwgaWRzLCBhY2NlcHQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5cbiJdfQ==
