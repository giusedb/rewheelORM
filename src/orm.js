'use strict';

// TODO defining Set polyfil

try {
    localStorage['test'] = 1
} catch(e) {
    var localStorage = {};
}

var utils = require('./utils.js');
var Lazy = require('lazy.js');
var ListCacher = require('./listcacher.js');
var AutoLinker = require('./autolinker.js');
var cached = require('./cacher.js');
var cachedPropertyByEvents = cached.cachedPropertyByEvents;
function ValidationError(data){
    this.resource = data._resource;
    this.formIdx = data.formIdx;
    this.fields = data.errors;
}
var baseORM = function(options, extORM){
    
    // creating rewheel connection
    if (options.constructor === String){
        var connection = new reWheelConnection(options);
    } else if (options.constructor === utils.reWheelConnection){
        var connection = options;
    }
    this.connection = connection;
    connection.on('connected', function(){ 
        this.connected = true;
    });
    var events = connection.events;

    this.on = events.on.bind(this);
    this.emit = events.emit.bind(this);
    this.$post = connection.$post.bind(connection);

    // handling websocket events
    events.on('ws-connected',function(ws){
        console.info('Websocket connected');
        // all json data has to be parsed by gotData
        ws.onMessageJson(W2PRESOURCE.gotData.bind(W2PRESOURCE));
        //
        ws.onMessageText(function(message){
            console.info('WS message : ' + message)
        });
    });
    events.on('ws-disconnected', function(ws){
        console.error('Websocket disconnected')
    });
    events.on('error-json-404',function(error,url, sentData, xhr){ 
        console.error('JSON error ', JSON.stringify(error));
        delete waitingConnections[url.split('/')[0]];
    })

    // initialization
    var W2PRESOURCE = this;
    var IDB = {auth_group : Lazy({})}; // tableName -> data as Array
    var IDX = {}; // tableName -> Lazy(indexBy('id')) -> IDB[data]
    var REVIDX = {}; // tableName -> fieldName -> Lazy.groupBy() -> IDB[DATA]
    var builderHandlers = {};
    var builderHandlerUsed = {};
    var eventHandlers = {};
    var permissionWaiting = {};
    var modelCache = {};
    var failedModels = {};
    var waitingConnections = {} // actual connection who i'm waiting for
    var listCache = new ListCacher(Lazy);
    var linker = new AutoLinker(events,waitingConnections,IDB, this, listCache);
/*    window.ll = linker;
    window.lc = listCache;
*/
    this.validationEvent = events.on('error-json-513', function(data, url, sentData, xhr){
        if (currentContext.savingErrorHanlder){
            currentContext.savingErrorHanlder(new ValidationError(data));
        }
    })

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
            this.push.apply(this, [k, permissions[k]]);
        }
    }
    PermissionTable.prototype.save = function (cb) {
        // save Object to server
        var data = {
            permissions: Lazy(this.permissions).map(function (x) {
                return [x[0].id, x[1]]
            }).toObject()
        };
        data.id = this.id;
        var modelName = this.klass.modelName;
        W2P_POST(this.klass.modelName, 'set_permissions', data, function (myPerms, a, b, req) {
            cb(myPerms);
        });
    };
    PermissionTable.prototype.push = function (group_id, permissionList) {
        var p = Lazy(permissionList);
        var perms = Lazy(this.klass.allPermissions).map(function (x) {
            return [x, p.contains(x)]
        }).toObject();
        var l = Lazy(this.permissions).map(function (x) {
            return x[0].id
        });
        if (l.contains(group_id))
            this.permissions[l.indexOf(group_id)][1] = perms;
        else
            this.permissions.push([IDB.auth_group.get(group_id), perms]);
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
        var funcString = "if (!row) { row = {}};\n";
        funcString += model.references.map(function(field){
            return 'this._' + field.id + ' = row.' + field.id + ';';
        }).join(';\n');
        
        // datefield conversion
        funcString += fields.map(function (x,k) {
            if ((x.type == 'date') || (x.type == 'datetime')){
                return 'this.' + k + ' = row.' + k + '?new Date(row.' + k + ' * 1000 - ' + utils.tzOffset + '):null;\n'; 
            } else if (x.type == 'boolean') {
                return 'this.' + k + ' = (row.' + k + ' === "T") || (row.' + k + ' === true);\n';
            } else {
                return 'this.' + k + ' = row.' + k + ';\n';
            }
        }).toString('\n'); + '\n';

        funcString += "if (permissions) {this._permissions = permissions && Lazy(permissions).map(function (x) { return [x, true] }).toObject();}"

        
        // master class function
        var Klass = new Function('row', 'permissions',funcString)

/*        
        // defining build handlers
        Klass.builderHandlers = [];

        Klass.addBuilderHandler = function (decorator) {
            if (Lazy(Klass.builderHandlers).contains(decorator)) return;
            Klass.builderHandlers.push(decorator);
        };
*/
        Klass.prototype.orm = extORM;
        Klass.ref_translations = {};
        Klass.modelName = model.name;
        Klass.references = Lazy(model.references).pluck('id').toArray();

        Klass.inverse_references = model.referencedBy.map(function (x) {
            // managing references where 
            return x.by + '_' + x.id + '_set'
        });
        Klass.referents = model.referencedBy.map(function (x) {
            return [x.by, x.id]
        });
        Klass.fieldsOrder = model.fieldOrder;
        Klass.allPermissions = model.permissions;

        // redefining toString method
        if (Lazy(model.representation).size()){
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
/*
        Object.defineProperty(Klass.prototype, 'permissions', {
            get: function () {
                if (this._permissions)
                    return this._permissions;
                else {
                    linker.askPermission(this.constructor.modelName,this.id);
                }
            }
        });
*/
        // getting full permission table for an object
        Klass.prototype.all_perms = function (cb) {
            var object_id = this.id;
            rewheel.$post(this.constructor.modelName, 'all_perms', {id: this.id}, function (data) {
                var permissions = data;
                var grouped = {};
                var unknown_groups = Lazy(permissions).pluck('group_id').unique().map(function (x) {
                    return '' + x
                }).difference(IDB.auth_group.keys()).toArray();
                Lazy(permissions).groupBy(function (x) {
                    return x.group_id
                }).each(function (v, k) {
                    grouped[k] = Lazy(v).pluck('name').toArray()
                });
                var call = function (x) {
                    cb(new PermissionTable(object_id, Klass, grouped));
                };
                if (unknown_groups.length)
                    rewheel.$get('auth_group', unknown_groups, undefined, call);
                else
                    call();
            });
        };

        Klass.prototype.save = function (args) {
            if (args) {
                for (var arg in args) {
                    this[arg] = args[arg];
                }
            }
            var obj = {};
            var o = this.asRaw();
            var fieldOrder = this.field;
            Lazy(this.constructor.fields).each(function (x) {
                var PA = Klass.privateArgs || {};
                if ((x.type != 'M2M') && x.writable && (!(x.id in PA)))
                    obj[x.id] = o[x.id];
            });
            var promise = W2PRESOURCE.$post(this.constructor.modelName + (this.id ? '/post' : '/put'), obj);
            if (args && (args.constructor === Function)){
                // placing callback in a common place
                promise.context.savingErrorHanlder = args;
            }
        };
        Klass.prototype.copy = function () {
            var obj = new this.constructor(this.asRaw());
            obj.permissions = this.permissions;
            return obj;
        };

        // building serialization function
        var asr = 'return {\n' + Lazy(model.references).map(function(field){
            return field.id + ' : this._' + field.id;
        }).concat(fields.map(function (x,k) {
            if ((x.type == 'date') || (x.type == 'datetime')){
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
            var deletable = Lazy(Klass.fields)
                .filter(function (x) {
                    return !x.writable
                })
                .pluck('id')
                .toArray();
            Lazy(objects)
                .map(function (x) {
                    return x.asRaw()
                })
                .each(function (x) {
                    Lazy(deletable).each(function (y) {
                        delete x[y];
                    });
                    raw.push(x);
                });
            W2PRESOURCE.$post(Klass.modelName, 'put', {multiple: raw, formIdx : W2PRESOURCE.formIdx++}, function (elems) {
                W2PRESOURCE.gotData(elems);
                var tab = IDB[Klass.modelName];
                var objs = Lazy(elems[Klass.modelName].results).pluck('id').map(function (x) {
                    return tab.get(x)
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
                Klass.prototype[funcName] = new Function(args, ddata + 'W2S.W2P_POST(this.constructor.modelName,"' + funcName + '", data,function(data,status,headers,x){' +
                    'try{\n' +
                    '   if (!headers("nomodel")) {window.W2S.gotData(data,cb);}\n' +
                    '   else {if (cb) {cb(data)}}\n' +
                    '} catch(e){\n' +
                    'if (cb) {cb(data);}\n' +
                    '}\n' +
                    '});\n'
                );
            });
        if ('privateArgs' in model) {
            Klass.privateArgs = Lazy(model.privateArgs).keys().map(function (x) {
                return [x, true];
            }).toObject();
            Klass.prototype.savePA = function (o) {
                var T = this;
                var oo = {id: this.id};
                var PA = this.constructor.privateArgs;
                var Fs = this.constructor.fields;
                var t = new this.constructor(o).asRaw();
                var fieldIdx = Lazy(PA).keys().map(function (x) {
                    return [x, Fs[x]]
                }).toObject();
                Lazy(o).each(function (v, k) {
                    if ((k in PA) && fieldIdx[k].writable) {
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
            x.type = x.type || 'reference'
        })).indexBy('id').toObject();
        // building references to (many to one) fields
        Lazy(model.references).each(function (ref) {
            var ext_ref = ref.to;
            var local_ref = '_' + ref.id;
            cachedPropertyByEvents(Klass.prototype, ref.id,function () {
                if (!(ext_ref in IDB)){
                    var ths = this;
                    W2PRESOURCE.describe(ext_ref,function(x){
                        linker.mainIndex[ext_ref].ask(ths[local_ref],true);
                    });
                }
                var result = (ext_ref in IDB) && this[local_ref] && IDB[ext_ref].get(this[local_ref]);
                if (!result && (ext_ref in linker.mainIndex)) {
                    // asking to linker
                    return linker.mainIndex[ext_ref].ask(this[local_ref],true);
                }
                return result;
            }, function (value) {
                if (value) {
                    if (value.constructor.modelName != ext_ref) {
                        throw new TypeError('You can assign only ' + ext_ref + ' to ' + ref.id);
                    }
                }
                this[local_ref] = value.id;
            }, 'new-' + ext_ref, 'deleted-' + ext_ref,'updated-' + ext_ref, 'new-model-' + ext_ref);


            Klass.prototype['get' + utils.capitalize(ref.id)] = function () {
                return extORM.get(ext_ref,this[local_ref]);
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
                    var ret = (revIndex in IDB) ? REVIDX[indexName].get(this.id + ''):null;
                    linker.foreignKeys[indexName].ask(this.id,true);
                    return ret;
                }, null, 'new-' + revIndex, 'updated-' + revIndex, 'deleted-' + revIndex);
            }
            Klass.prototype['get' + utils.capitalize(utils.pluralize(ref.by))] = function () {
                var opts = {};
                opts[ref.id] = [this.id];
                return extORM.query(ref.by,opts);
            };
        });

        //building reference to (many to many) fields
        if (model.manyToMany) {
            Lazy(model.manyToMany).each(function (ref) {
                var indexName = ref.indexName;
                var first = ref.first? 0 : 1;
                var omodelName = ref.model;
//                var omodel = getIndex(omodelName);
                var getter = linker.m2mIndex[indexName]['get' + utils.capitalize(omodelName)];

                cachedPropertyByEvents(Klass.prototype, ref.model + 's', function () {
                        var ths = this;
                        var ret = [];
                        var ids = null;
                        var get = null;
                        linker.getM2M(indexName, [ths.id], first,function(data){
                            ids = getter(ths.id);
                            if (ids.length){
                                W2PRESOURCE.fetch(omodelName, {id : ids});
                                get = getIndex(omodelName).get.bind(IDB[omodelName])
                            }
                        });
                        if (ids && get)
                            ret = Lazy(ids).map(get).filter(utils.bool).toArray();
                        return ret;
                    }, null, 'received-m2m-' + indexName);

                Klass.prototype['get' + utils.capitalize(utils.pluralize(omodelName))] = function () {
                    var ths = this;
                    return new Promise(function(accept, reject){
                        try {
                            linker.getM2M(indexName, [ths.id], first,function(data){
                                var ids = getter(ths.id);
                                if (ids.length){
                                    W2PRESOURCE.fetch(omodelName, {id : ids},null,function(){
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
                    })
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
                        return [ID, x]
                    }).toArray();
                } else {
                    var collection = [[ID, instance.id]];
                }
                W2PRESOURCE.$post(Klass.modelName + '/' + omodel + 's/delete', {collection: collection});
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
                            return [ID, x]
                        }).toArray();
                        W2P_POST(Klass.modelName, omodel + 's/put', {collection: collection}, function (data) {
                        });
                    }
                } else {
                    if ((indexName in linker.m2mIndex) && Lazy(linker.m2mIndex[indexName]['get' + utils.capitalize(omodel)](instance.id)).find(this)) {
                        return;
                    }
                    W2PRESOURCE.$post(Klass.modelName + '/' + omodel + 's/put', {collection: [[this.id, instance.id]]});
                }
            };
        }
        /* model handlers */
        if (Klass.modelName in builderHandlers) {
            while (builderHandlers[Klass.modelName].length) {
                var handler = builderHandlers[Klass.modelName].pop();
                if (!Lazy(builderHandlerUsed[Klass.modelName]).map(function (x) {
                        return x.toString();
                    }).contains(handler.toString())) {
                    handler(Klass);
                    builderHandlerUsed[Klass.modelName].push(handler);
                }
            }
        }
        events.emit('new-model', Klass);
        events.emit('new-model-' + Klass.modelName);
        return Klass;
    };

    this.gotData = function (data, callBack) {
        // receive all data from every end point
        console.info('gotData');
        if (typeof(data) == 'string') {
            console.log('data ' + data + ' refused from gotData()');
            if (callBack) {
                return callBack(data);
            }
            return;
        }
        // clean data from relations and permissions for using it after model parsing
        if ('_extra' in data){ delete data._extra }
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
        if (!PA) { PA = {}; }

        // cleaning from useless deleted data
        data = Lazy(data).filter(function (v, k) {
            return (!('deleted' in v) || ((k in W2PRESOURCE.modelCache)));
        }).toObject();
        
        if ('m2m' in data) {
            var m2m = data.m2m;
            delete data['m2m'];
        }
        Lazy(data).each(function (data, modelName) {
            W2PRESOURCE.describe(modelName, function (model) {
                var modelClass = model;
                if (data.results && (data.results.length > 0) && (data.results[0].constructor == Array)) {
                    data.results = Lazy(data.results).map(function(x){
                        return Lazy(modelClass.fieldsOrder).zip(x).toObject()
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
                    })
                }

                // indexing references by its ID
                var itab = getIndex(modelName);
                var table = itab.source;

                // object deletion
                if (deleted){
                    deleted.forEach(function(x){
                        delete table[x];
                    })
                }
/*
                Lazy(deleted).each(function (x) {
                    delete table[x];
                });
*/
                var idx = results.indexBy('id');
                var ik = idx.keys();
                var nnew = ik.difference(itab.keys().map(function (x) {
                    return parseInt(x)
                }));
                var updated = ik.difference(nnew);
                // removing old identical values
                updated = updated.filter(function (x) {
                    return !utils.sameAs(idx.get(x), itab.get(x).asRaw());
                });
                // classify records
                var perms = data.permissions ? Lazy(data.permissions) : Lazy({});
                var newObjects = nnew.map(function (x) {
                    return new modelClass(idx.get(x), perms.get(x))
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
                    Lazy(model.fields).keys().each(function(k){
                        oldItem[k] = newItem[k];
                    });
                    changed.push([oldItem, oldCopy]);
                });

                //// sending signal for updated values
                if (changed.length) {
                    events.emit('updated-' + modelName, changed);
                }
                //******** Update universe ********
                var no = newObjects.toArray();
                Lazy(no).each(function (x) {
                    table[x.id] = x
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
                    ASKED_M2M[indexName] = [{}, {}];
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

    this.gotM2M = function(m2m){
        Lazy(m2m).each(function(data, indexName){
            var m2mIndex = linker.m2mIndex[indexName];
            Lazy(data).each(function(m){
                Lazy(m).each(function(data,verb){
                    m2mIndex[verb](data);
                });
            });
            events.emit('received-m2m');
            events.emit('received-m2m-' + indexName);
        });
    }

    this.fetch = function (modelName, filter, together, callBack) {  //
        // if a connection is currently running, wait for connection.
        if (modelName in waitingConnections){
            setTimeout(function(){
                W2PRESOURCE.fetch(modelName, filter, together, callBack);
            },500);
        } else {
            // fetching asynchromous model from server
            W2PRESOURCE.describe(modelName, function(model){
                // if data cames from realtime connection
                if (W2PRESOURCE.connection.options.realtimeEndPoint) {
                                        
                    // getting filter filtered by caching system
                    filter = listCache.filter(model,filter);

                    // if somthing is missing on my local DB 
                    if (filter){
                        // ask for missings and parse server response in order to enrich my local DB.
                        // placing lock for this model
                        waitingConnections[modelName] = true;
                        W2PRESOURCE.$post(modelName + '/list', {filter : filter},function(data){
                            W2PRESOURCE.gotData(data,callBack)

                            // release lock
                            delete waitingConnections[modelName];
                        }, function(){
                            // release lock
                            delete waitingConnections[modelName];
                        });
                    } else {
                        callBack && callBack();
                    }
                    return filter;
                } else {
                    this.$post(modelName + '/list', sendData,function (data) {
                            if (!filter) {
                                GOT_ALL.source.push(modelName);
                            }
                            W2PRESOURCE.gotData(data, callBack);
                        });
                }
            });
        }
    };

    this.get = function(modelName, ids, callBack){
        // search objects from IDB. If some id is missing, it resolve it by the server
        // if a request to the same model is pending, wait for its completion
        
        if (ids.constructor !== Array){
            ids = [ids];
        }
        // if some entity is missing 
        W2PRESOURCE.fetch(modelName , {id: ids}, null,function(){
            var ret = [];
            var itab = IDB[modelName]
            for (var id in ids){
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

    this.describe = function(modelName, callBack){
        var ret = modelCache[modelName];
        if (ret) {
            callBack && callBack(ret);
        } else {
            if (!(modelName in waitingConnections)){
                if (modelName in failedModels){
                    return
                }
                var cacheKey = 'description:' + modelName;
                if (cacheKey in localStorage) {
                    this.gotModel(JSON.parse(localStorage[cacheKey]));
                    callBack && callBack(modelCache[modelName]);
                } else {
                    waitingConnections[modelName] = true;
                    this.$post(modelName + '/describe',null, function(data){
                        W2PRESOURCE.gotModel(data);
                        callBack && callBack(modelCache[modelName]);
                        delete waitingConnections[modelName];
                    }, function(data){
                        this.events.modelNotFound.handle(modelName);
                        failedModels[modelName] = true;
                    });
                }
            } else {
                // wait for connection
                setTimeout(function(){
                    W2PRESOURCE.describe(modelName, callBack);
                }, 500);
            }
        }        
    };
    this.addBuilderHandler = function (modelName, decorator) {
        var key = utils.hash(decorator);
        if (!(modelName in builderHandlers)) builderHandlers[modelName] = new Handler();
        if (!(modelName in builderHandlerUsed)) builderHandlerUsed[modelName] = {};
        builderHandlers.addHandler(decorator);
        if (modelName in modelCache) {
            if (!Lazy(builderHandlerUsed[modelName]).map(function (x) {
                    return x.toString();
                }).contains(decorator.toString())) {
                decorator.apply(this, [W2PRESOURCE.modelCache[modelName]]);
                builderHandlerUsed[modelName].push(key);
            }
        }
    };
    this.connect = function(callBack){
        if (this.isConnected){
            callBack(this.connection.options);
        } else {
            this.connection.connect(function(status){
                W2PRESOURCE.isConnected = true;
                callBack(status);
            });            
        }
    };
    this.query = function(modelName, filter, together, callBack){
        var ths = this;
        this.describe(modelName,function(model){
            var filterFunction = utils.makeFilter(model, filter);
            var idx = getIndex(modelName);
            ths.fetch(modelName,filter,together, function(e){
                callBack(idx.filter(filterFunction).values().toArray());
            });
        })
    };
    this.delete = function(modelName, ids, callBack){
        return this.$post(modelName + '/delete', { id : ids}, callBack);
    };
};

function reWheelORM(endPoint){
    this.$orm = new baseORM(endPoint,this);
    this.on = this.$orm.on.bind(this.$orm);
}

reWheelORM.prototype.get = function(modelName, ids){
    var self = this;
    var single = false;
    var modName = modelName;
    if (ids.constructor !== Array){
        single = true;
        ids = [ids]
    }
    return new Promise(function(accept, reject){
        try{
            self.$orm.connect(function(){
                if (single){
                    self.$orm.get(modName, ids, function(items){ 
                        accept(items[0]);}
                    );
                } else {
                    self.$orm.get(modName, ids, accept);
                }
            });
        } catch (e){
            reject(e);
        }
    });
};

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
            if (self.$orm.isConnected){
                self.$orm.query(modelName, filter, together, accept);
            } else {
                self.$orm.connect(function(){
                    self.$orm.query(modelName, filter, together, accept);
                });
            }
        } catch (e){
            reject(e);
        }
    })
};

reWheelORM.prototype.delete = function (modelName, ids){
    var self = this;
    return new Promise(function(accept, reject){
        try{
            if (self.$orm.connected){
                self.$orm.delete(modelName, ids, accept);
            } else {
                self.$orm.connect(function(){
                    self.$orm.delete(modelName, ids, accept);
                });
            }
        } catch (e){
            reject(e);
        }
    })
};

var exports = module.exports = {
    ORM : reWheelORM,
    connection : utils.reWheelConnection
};