'use strict';

function Toucher(){
    var touched = false
    this.touch = function(){
        touched = true;
    };
    this.touched = function(){
        var t = touched;
        touched = false;
        return t;
    }
}

function VacuumCacher(touch, asked, name){
/*
    if (name){
        console.info('created VacuumCacher as ' + name);
    }
*/
    if (!asked){
        var asked = [];
    }
    var missing = [];
    
    this.ask = function (id,lazy){
        if (!Lazy(asked).contains(id)){
//            console.info('asking (' + id + ') from ' + name);
            missing.push(id);
            if (!lazy)
                asked.push(id);
            touch.touch();
        } 
//        else console.warn('(' + id + ') was just asked on ' + name);
    };

    this.getAskedIndex = function(){
        return asked;
    }

    this.missings = function(){
        return Lazy(missing.splice(0,missing.length)).unique().toArray();
    }
}

function ManyToManyRelation(relation,m2m){
    var items = [];
    this.add = items.push.bind(items);
    this.add = function(item){
        console.log('adding ' + item);
        if (!(Lazy(items).find(item))){
            items.push(item);
        }
    }

    this['get' + utils.capitalize(relation.indexName.split('/')[0])] = function(id){
        m2m[1].ask(id);
        return Lazy(items).filter(function(x){
            return x[0] === id;
        }).pluck("1").toArray();
    };

    this['get' + utils.capitalize(relation.indexName.split('/')[1])] = function(id){
        m2m[0].ask(id);
        return Lazy(items).filter(function(x){
            return x[1] === id;
        }).pluck("0").toArray();
    };

    this.del = function(item){
        var l = items.length;
        var idx = null;
        for (var a = 0; a < l; a++){ 
            if ((items[a][0] === item[0]) && (items[a][1] === item[1])){
                idx = a;
                break;
            }
        }
        if (idx){
            items.splice(a, 1);
        }
        console.log('deleting ', item);
    };
}

function AutoLinker(events, actives, IDB, W2PRESOURCE, listCache){
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

    events.on('model-definition',function(model){
        // defining all indexes for primary key
        var pkIndex = listCache.getIndexFor(model.name, 'id');
        mainIndex[model.name] = new VacuumCacher(touch, pkIndex, 'mainIndex.' + model.name);
        
        // creating permission indexes
        permissions[model.name] = new VacuumCacher(touch,null, 'permissions.' + model.name);

        // creating indexes for foreign keys
        Lazy(model.references).each(function(reference){
            var indexName = model.name + '_' + reference.id;
            foreignKeys[indexName] = new VacuumCacher(touch, listCache.getIndexFor(reference.to, 'id'), reference.to + '.id foreignKeys.' + indexName);
        });
        // creating reverse foreign keys
        Lazy(model.referencedBy).each(function(field){
            var indexName = field.by + '.' + field.id;
            foreignKeys[indexName] = new VacuumCacher(touch, listCache.getIndexFor(field.by,field.id), field.by + '.' + field.id + ' foreignKeys.' + indexName);
        });
        Lazy(model.manyToMany).each(function(relation){
            if (!(relation.indexName in m2m))
                m2m[relation.indexName] = [new VacuumCacher(touch,null,'m2m.' + relation.indexName + '[0]'), new VacuumCacher(touch,null,'m2m.' + relation.indexName+'[1]')];
            if (!(relation.indexName in m2mIndex))
                m2mIndex[relation.indexName] = new ManyToManyRelation(relation,m2m[relation.indexName]);
        });
    });
    var getM2M = function(indexName, collection, n, callBack){
        // ask all items in collection to m2m index
        Lazy(collection).each(m2m[indexName][n].ask.bind(m2m[indexName][n]));
        // renewing collection without asked
        collection = m2m[indexName][n].missings();
        // calling remote for m2m collection if any
        if (collection.length){
            actives[indexName] = 1;
            W2PRESOURCE.$post((n ? utils.reverse('/', indexName) : indexName) + 's' + '/list', {collection: collection}, function(data){
                W2PRESOURCE.gotData(data, callBack);
                delete actives[indexName]
            });
        } else {
            callBack && callBack();
        }
    };
    this.getM2M = getM2M;

    var linkUnlinked = function(){
        // perform a DataBase synchronization with server looking for unknown data
        if (!touch.touched()) return;
        if (Lazy(actives).values().sum()) {
            touch.touch();
            return;
        }
        var changed = false;
        Lazy(m2m).each(function(indexes, indexName){
            Lazy(indexes).each(function (index,n) {
                var collection = index.missings();
                collection = Lazy(collection).filter(function (x) {
                    return x
                }).map(function (x) {
                    return parseInt(x)
                }).toArray();
                if (collection.length){
                    var INDEX = m2mIndex[indexName];
                    changed = true;
                    getM2M(indexName, collection, n);
                }
            });
        });
        Lazy(mainIndex).each(function (index, modelName) {
            var ids = index.missings();
            if (ids.length) {
                changed = true;
                var idb = modelName in IDB ? IDB[modelName].keys() : Lazy();
                //log('linking.' + modelName + ' = ' + W2PRESOURCE.linking.source[modelName]);
                W2PRESOURCE.fetch(modelName, {id: ids},null,utils.noop);
            }
        });
        // Foreign keys
        Lazy(foreignKeys)
        .map(function(v,k){
            return [k, v.missings()]
        }).filter(function(v){
            return v[1].length
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
/*        
        Lazy(MISSING_PERMISSIONS).filter(function (x) {
            return (x.length > 0) && (!(x in permissionWaiting));
        }).each(function (x, resourceName) {
            changed = true;
            var ids = MISSING_PERMISSIONS[resourceName].splice(0);
            permissionWaiting[resourceName] = 1;
            W2P_POST(resourceName, 'my_perms', {ids: Lazy(ids).unique().toArray()}, function (data) {
                W2PRESOURCE.gotPermissions(data.PERMISSIONS);
                delete permissionWaiting[resourceName]
            });
        });
*/
    }
    setInterval(linkUnlinked,50);
};

var ListCacher = function(){
    var gotAll = {};
    var asked = {}; // map of array
    this.filter = function(model, filter){
        var getIndexFor = this.getIndexFor;
        var modelName = model.modelName;

        // if all objects were fetched from server you have not to fetch anything
        if (modelName in gotAll){
            return null;
        }
        
//        console.info('filter for', modelName, JSON.stringify(filter));

        // if you fetch all objects from server, this model has to be marked as got all;
        if (Lazy(filter).size() == 0){
            gotAll[modelName] = true;
            if (modelName in asked){
                delete asked[modelName];
            }
            return {};
        }
        // Lazy auto create indexes
        var keys = Lazy(filter).map(function(v,key){ return [key, modelName + '.' + key]; }).toObject();
        // getting indexes
        var indexes = Lazy(filter).keys().map(function(key){ return [key, getIndexFor(modelName, key)]}).toObject();
        
        var missing = Lazy(filter).map(function(values, fieldName){
            return [fieldName, Lazy(values).difference(asked[keys[fieldName]]).unique().toArray()];
        }).filter(function(x){
            return x[1].length;
        }).toObject();

        // if only i know all elements but one
        if (Lazy(missing).size()){
            Lazy(filter).each(function(value,key){
                var uniques = Lazy(value).difference(indexes[key]).toArray();
                if (uniques.length)
                    Array.prototype.push.apply(asked[modelName + '.' + key],value);
            });
            return missing;
        }
        return null;
    };

    this.getIndexFor = function(modelName, fieldName){
        var indexName = modelName + '.' + fieldName;
        if (!(indexName in asked)){
            asked[indexName] = [];
        }
        return asked[indexName];
    }
}

function cachedPropertyByEvents(proto, propertyName,getter, setter){
    var events = Array.prototype.slice.call(arguments,4);
    var result = {};
    
    Lazy(events).each(function(event){
        proto.orm.on(event,function(){
            result = {};
        });
    });
    var propertyDef = {
        get: function cached(){
            if (!(this.id in result)){
                result[this.id] = getter.call(this);
            }
            return result[this.id];
        }
    };
    if (setter){
        propertyDef['set'] = function(value){
            if (value !== result[this.id]){
                setter.call(this,value);
                if (this.id in result){
                    delete result[this.id];
                }
            }
        }
    }
    Object.defineProperty(proto, propertyName,propertyDef);
}