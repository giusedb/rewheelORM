"use strict";

function ListCacher(){
    var gotAll = {};
    var asked = {}; // map of array
    var compositeAsked = {};
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
    var filterSingle = function(model, filter, testOnly){
        // Lazy auto create indexes
        var modelName = model.modelName;
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
//                console.log('single filter : ' + JSON.stringify(filter) + '\nOut :' + JSON.stringify(ret));
                return ret;
            } else {
//                console.log('single filter : ' + JSON.stringify(filter) + '\nOut : null');
                return null;
            }
        }
    };

    var cleanComposites = function(model,filter){
        /**
         * clean compositeAsked
         */
        // lazy create conditional asked index
        if (!(model.name in compositeAsked)) { compositeAsked[model.name] = [] };
        var index = compositeAsked[model.name];
        // search for all elements who have same partial
        var filterLen = Lazy(filter).size();
        var items = index.filter(utils.makeFilter(model, filter, ' && ',true)).filter(function(item){ Lazy(item).size() > filterLen });
//        console.log('deleting :' + JSON.stringify(items));
    };

    this.filter = function(model, filter){
//        console.log('------------------\nfilter : ' + JSON.stringify(filter));
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
//                console.log('out : null (got all)');
                // conditional clean
                if (modelName in compositeAsked){ 
                    delete compositeAsked[modelName];
                }
                if (got)
                    return null;
                return {};
            }
            case 1 : {
                var ret = filterSingle.call(this, model, filter);
                cleanComposites.call(this, model, filter);
                return ret;
            }
        }
        var ths = this;
        var single = Lazy(filter).keys().some(function(key) {
            var f = {};
            f[key] = filter[key];
            return filterSingle.call(ths, model, f, true) == null;
        });
        if (single) { return null }
        // lazy create compositeAsked
        if (!(modelName in compositeAsked)){ compositeAsked[modelName] = []; }
        // explode filter
        var exploded = explodeFilter(filter);
        // collect partials
        var partials = compositeAsked[modelName].filter(utils.makeFilter(model, filter, ' || ',true));
        // collect missings (exploded - partials)
        if (partials.length){
            var bad  = [];
            // partial difference
            for (var x in partials){
                bad.push.apply(bad,exploded.filter(utils.makeFilter(model, partials[x],' && ', true)));
            }
//            console.log('exploded - partial : ' + JSON.stringify(bad));
            var missings = Lazy(exploded).difference(bad).toArray();
        } else {
            var missings = exploded;
        }

        // filter partials
        if (missings.length){
            compositeAsked[modelName].push.apply(compositeAsked[modelName],missings);
            // aggregate missings
            var missings = Lazy(filter).keys().map(function(key){
                var ret = Lazy(missings).pluck(key).unique().toArray();
                return [key, ret.length?ret:filter[key]];
            }).toObject();
//            console.log('out : ' + JSON.stringify(missings));
            // clean conditional
            cleanComposites(model, missings);
            return missings;
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
};

function FilterTracer() {
    /**
    *  asked filter storage
    *  { <pipe separated asked fields> : <array of array of asked values> }
    */
    this.explodedFilters = {id: []}; 
    this.askedFilters = [];
}

/**
* prepare a filter to be fetched
* @param filter: filter to add
*/
FilterTracer.prototype.add = function(filter) {
    this.askedFilters.push(filter);
}


/**
* Explode filter in single element filter
* @param filter complex filter
* @return listo of single element filter
*/

FilterTracer.prototype.explode = function(filter) {
    var ret = [];
    var keys = [];
    var values = [];
    // key and values split
    _.forIn(filter, function(v,k){
        keys.push(k); 
        values.push(v);
    });
    var vals = Combinatorics.cartesianProduct.apply(this, values);
    return vals.toArray(); // vals.map(_.partial(_.zipObject, keys));        
}

/**
* Reduce a filter excluding previously called filter
* A filter is an object like where keys are fields and values 
* are array of values
* @param filter filter
* @return a new filter or null if nothing has to be asked
*/
FilterTracer.prototype.getFilters = function(filter) {
    var keys = _.keys(filter).sort();
    var keysKey = _.join(keys, '|');
    var exploded = this.explode(filter);
    var keyset = _.keys(this.explodedFilters);
    var self = this;
    // cloning original exploded
    var originalExploded = exploded.slice(0);
    if (!(keysKey in this.explodedFilters)) {
        this.explodedFilters[keysKey] = [];
    }
    if (keyset.length) {
        // getting all subsets
        var subsets = _.intersection(keyset, Combinatorics.power(keys,function(x) { 
            return x.join('|')}
        ).slice(1));
        // removing rows from found subsets
        subsets.forEach(function(key, index) {
            var kkeys = _.split(key,'|');
            var compatibleExploded = null;
            var fromIndex = kkeys.map(_.partial(_.indexOf,keys));
            // transforming exploded to subset exploded
            if (key !== keysKey) {
                compatibleExploded = _.uniqWith(exploded.map(function(x) {
                    var ret = [];
                    for (var i in fromIndex) {
                        ret.push(x[fromIndex[i]]);
                    }
                    return ret;
                }),_.identity);
            } else {
                compatibleExploded = exploded;
            }
            var toRemove = _.intersectionBy(self.explodedFilters[key],compatibleExploded, JSON.stringify);
            if (toRemove.length) {
                //console.log('remove ' + toRemove);
                toRemove.forEach(function(y) {
                    if (exploded.length) {
                        var rf = new Function('x', 'return ' + fromIndex.map(function(i,n){
                            return '(x[' + i + '] === ' + y[n] + ')';
                        }).join(' && '));
                        _.remove(exploded, rf);
                    }
                });
            }
        });
    }
    // looking for previously asked key subset
    Array.prototype.push.apply(this.explodedFilters[keysKey], exploded);
    
    // cleaning supersets
    var supersets = keyset
        .map(function(x) {
            return x.split('|');
        })
        .filter(function(x) {
            return _.every(keys, function(v) {
                return _.includes(x,v);
            });
        })
        .filter(function(x) {
            return !_.isEqual(x, keys);
        });
    if (supersets.length) {
        // removing all values from supersets
        supersets.forEach(function(key) {
            var oldValues = self.explodedFilters[key.join('|')];
            var fromIndex = keys.map(_.partial(_.indexOf,key));
            exploded.forEach(function(y) {
                var rf = new Function('x', 'return ' + fromIndex.map(function(i,n) { 
                    return '(x[' + i  + '] === ' + y[n] + ')' 
                }).join(' && '));
                //console.log('old remove from ' + key + ' => ' + oldValues.filter(rf).json);
                _.remove(oldValues, rf);
            });
        });
    }

    // fusing result filter
    return this.implode(exploded,keys);
};

FilterTracer.prototype.implode = function (exploded, keys) {
    if (!exploded.length) { return null; }
    return _.zipObject(keys,_.unzip(exploded).map(_.uniq));
}