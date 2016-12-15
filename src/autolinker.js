'use strict';

var Lazy = require('lazy.js');
var Toucher = require('./toucher.js');
var VacuumCacher = require('./vacuumcacher.js');
var ManyToManyRelation = require('./manytomany.js');

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

var exports = module.exports = AutoLinker;