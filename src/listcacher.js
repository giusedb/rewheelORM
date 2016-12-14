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
        var makeFilter = function(filter, unionAttr) {
            /**
             * Creates a filter function for super set filter
             */
            if (!unionAttr) { unionAttr = ' && '}
            var partial = [];
            for (var key in filter){
                var vals = filter[key];
                if (Array.isArray(vals)){
                    partial.push(vals.map(function(x){
                        return '(x.' + key + ' === ' + x +')';
                    }).join(' || '))
                } else {
                    partial.push('(x.' + key + ' === ' + vals +')');
                }
            }
            return new Function("x", 'return ' + partial.join(unionAttr))
        }
        var filterSingle = function(modelName, filter, testOnly){
            // Lazy auto create indexes
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
                    // update conditionals
                    this.conditionalClean(ret);
                    console.log('single filter : ' + JSON.stringify(filter) + '\nOut :' + JSON.stringify(ret));
                    return ret;
                } else {
                    console.log('single filter : ' + JSON.stringify(filter) + '\nOut : null');
                    return null;
                }
            }
        };

        this.conditionalClean = function(model,filter){
            /**
             * clean conditionalAsked
             */
            // lazy create conditional asked index
            if (!(model.name in conditionalAsked)) { conditionalAsked[model.name] = [] };
            var index = conditionalAsked[model.name];
        };

        this.filter = function(model, filter){
            console.log('------------------\nfilter : ' + JSON.stringify(filter));
            var modelName = model.modelName;

            // if you fetch all objects from server, this model has to be marked as got all;
            var filterLen  = Lazy(filter).size();
            switch (filterLen) {
                case 0 : {
                    // return null or all
                    var got = gotAll[modelName];
                    gotAll[modelName] = true;
                    if (modelName in asked){
                        delete asked[modelName];
                    }
                    console.log('out : null (got all)');
                    // conditional clean
                    if (modelName in conditionalAsked){ 
                        delete conditionalAsked[modelName];
                    }
                    if (got)
                        return null;
                    return {};
                }
                case 1 : {
                    return filterSingle.call(this, modelName, filter);
                }
            }
            var ths = this;
            var single = Lazy(filter).keys().some(function(key) {
                var f = {};
                f[key] = filter[key];
                return filterSingle.call(ths, modelName, f, true) == null;
            });
            if (single) { return null }
            // lazy create conditionalAsked
            if (!(modelName in conditionalAsked)){ conditionalAsked[modelName] = []; }
            // explode filter
            var exploded = explodeFilter(filter);
            // collect partials
            var partials = conditionalAsked[modelName].filter(makeFilter(filter, ' || '));
            // collect missings (exploded - partials)
            if (partials.length){
                var bad  = [];
                // partial difference
                for (var x in partials){
                    bad.push.apply(bad,exploded.filter(makeFilter(partials[x])));
                }
                console.log('exploded - partial : ' + JSON.stringify(bad));
                var missings = Lazy(exploded).difference(bad).toArray();
            } else {
                var missings = exploded;
            }

            // filter partials
            if (missings.length){
                conditionalAsked[modelName].push.apply(conditionalAsked[modelName],missings);
                // aggregate missings
                var missings = Lazy(filter).keys().map(function(key){
                    var ret = Lazy(missings).pluck(key).unique().toArray();
                    return [key, ret.length?ret:filter[key]];
                }).toObject();
                console.log('out : ' + JSON.stringify(missings));
                return missings;
            }
            // clean conditional
            return null;
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