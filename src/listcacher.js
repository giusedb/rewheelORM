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
            console.log(JSON.stringify(filter));
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
            var missingLen = Lazy(missing).size();
            var filterLen  = Lazy(filter).size();
            // if i have at least an element i have all results
            if (missingLen < filterLen){
                return null;
            } else {
                if (missingLen == 1){
                    Lazy(filter).each(function(value,key){
                        var uniques = Lazy(value).difference(indexes[key]).toArray();
                        if (uniques.length)
                            Array.prototype.push.apply(asked[modelName + '.' + key],value);
                    });
                } else {
                    // creating lazely ListCachers
                    Lazy(missing).each(function(req,field){
                        var fieldName = keys[field];
                        if (!(fieldName in conditionalAsked)){
                            conditionalAsked[fieldName] = {};
                        }
                        Lazy(req).difference(Lazy(conditionalAsked[fieldName]).keys()).each(function(x){
                            conditionalAsked[fieldName][x] = new ListCacher(Lazy);
                        });
                    });
                    // get filter for each ListCacher for a filter without self
                    var m = Lazy(missing).map(function(req,field){
                        // getting filter without me
                        var fieldName = keys[field];
                        var aFilter = Lazy(filter).filter(function(v,k) { return k !== field}).toObject();
                        var filterSum = Lazy(req).map(function(x){
                            return conditionalAsked[fieldName][x].filter(model,aFilter);
                        });
                        return [field,Lazy(filterSum).reduce(function(x,y) { 
                            return  Lazy(x).merge(y,function(x,y) {
                                return Lazy(x).union(y).toArray()
                            }).toObject()
                        })];
                    }).toObject();
                    console.info(JSON.stringify(m));
                    return m;
                }
                return missing;
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