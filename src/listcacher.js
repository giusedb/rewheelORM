"use strict";

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.ListCacher = factory();
  }
})(this, function(context) {
    function ListCacher(Lazy){
        var gotAll = {};
        var asked = {}; // map of array
        var conditionalAsked = {};
        this.filter = function(model, filter){
            console.log('------------------\nfilter : ' + JSON.stringify(filter));
            var getIndexFor = this.getIndexFor;
            var modelName = model.modelName;

            // if all objects were fetched from server you have not to fetch anything
            if (modelName in gotAll){
                console.log('out : null');
                return null;
            }
            // if you fetch all objects from server, this model has to be marked as got all;
            var filterLen  = Lazy(filter).size();
            if (filterLen === 0){
                var got = gotAll[modelName];
                gotAll[modelName] = true;
                if (modelName in asked){
                    delete asked[modelName];
                }
                console.log('out : null (got all)');
                if (got)
                    return null;
                return {};
            }
            // Lazy auto create indexes
            var keys = Lazy(filter).map(function(v,key){ return [key, modelName + '.' + key]; }).toObject();

            var missing = Lazy(filter).map(function(values, fieldName){
                return [fieldName, Lazy(values).difference(asked[keys[fieldName]]).unique().toArray()];
            }).filter(function(x){
                return x[1].length;
            }).toObject();
            var missingLen = Lazy(missing).size();
            
            // if i have at least an element i have all results
            if (missingLen < filterLen){
                console.log('out : null (at least one)');
                // removing unused ListCachers
                Lazy(filter).each(function(vals, field){
                    if ((!(field in missing)) && (keys[field] in conditionalAsked)){
                        for(var v in vals){
                            if (vals[v] in conditionalAsked[keys[field]]){
                                delete conditionalAsked[keys[field]][vals[v]];
                            }
                        }
                    }
                });
                return null;
            }
            // single element management
            if (missingLen == 1){
                // getting indexes
                var indexes = Lazy(filter).keys().map(function(key){ return [key, getIndexFor(modelName, key)]}).toObject();
                Lazy(missing).each(function(value,key){
                    var uniques = Lazy(value).difference(indexes[key]).toArray();
                    if (uniques.length)
                        Array.prototype.push.apply(asked[modelName + '.' + key],value);
                });
                console.log('out : ' + JSON.stringify(missing));
                return missing;
            // multiple missing management
            } else {
                // creating lazely ListCachers
                Lazy(missing).each(function(req,field){
                    var fieldName = keys[field];
                    if (!(fieldName in conditionalAsked)){
                        conditionalAsked[fieldName] = {};
                    }
                    Lazy(req).map(function(x) { return x.toString() }).difference(Lazy(conditionalAsked[fieldName]).keys()).each(function(x){
                        console.log('new ' + fieldName + ' : ' + x);
                        conditionalAsked[fieldName][x] = new ListCacher(Lazy);
                    });
                });
                // get filter for each ListCacher for a filter without self
                var l = Lazy({});
                var m = Lazy(filter).map(function(req,field){
                    // getting filter without me
                    var fieldName = keys[field];
                    var aFilter = Lazy(filter).filter(function(v,k) { return k !== field}).toObject();
                    var filterSum = Lazy(req).map(function(x){
                        return conditionalAsked[fieldName][x].filter(model,aFilter);
                    });
                    return filterSum.filter(Boolean).reduce(function(x,y) {
                        return Lazy(x).merge(y).toObject();
                    });
                }).toArray();
                console.log(Lazy(m).map(JSON.stringify).toArray().join(' + '));
                console.log('out : ' + JSON.stringify(l.merge.apply(l,m).toObject()));
                var ret = l.merge.apply(l,m).toObject();
                if (Lazy(ret).size() === 0)
                    return null;
                return ret;
            }
        };

        this.getIndexFor = function(modelName, fieldName){
            var indexName = modelName + '.' + fieldName;
            if (!(indexName in asked)){
                asked[indexName] = [];
            }
            return asked[indexName];
        }
    };
    return ListCacher;
});