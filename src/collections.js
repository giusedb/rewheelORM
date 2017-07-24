'use strict';

function LazyLinker(actives, IDB, orm, listCache) {
    var unsolvedFilters = {};
    this.resolve = function(modelName, filter) {
        unsolved_filters.push(filter);
    };
    
    function mergeFilters() {
        var result = [];
        for (var modelName in unsolvedFilters) {
            unsolvedFilters[modelName].forEach(function(filter) {
                
            });
        }
    }
}

function Collection(orm, modelName, filter, partial, orderby, ipp) {
    var self = this;
    var filterFunction = null;
    var updateData = new Handler();
    var page = 1;
    this.updateData = updateData.addHandler.bind(updateData);
    this.items = [];
    this.forEach = this.items.forEach.bind(this.items);
    orm.describe(modelName, function(Model){
        self.model = Model;
        filterFunction = utils.makeFilter(Model, filter);
    });
    this.modelName = modelName;
    this.initialFilter = filter
    this.partial = partial || false;


    var updateValues = function(newItems) {
        if (orderby) {
            newItems = _.orderby(newItems, _.keys(orderby), _.values(orderby));
        }
        if (ipp) {
            
        }
        self.forEach = self.items.forEach.bind(self.items);
    };

    orm.query(modelName, filter, null, function(items){
        self.items = items;
    });

    orm.on('updated-' + modelName, function(items) {
        console.warn('collection update ' + modelName, items);
    });

    orm.on('new-' + modelName, function(items) {
        console.warn('collection new ' + modelName, items);
        items = items.toArray();
        self.items = _.union(self.items, items.filter(filterFunction));
        updateData.handle(self);
    });

    orm.on('deleted-' + modelName, function(items) {
        console.warn('collection delete ' + modelName, items);
    });
}