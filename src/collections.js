'use strict';

function Collection(orm, modelName, filter, partial) {
    this.modelName = modelName;
    this.initialFilter = filter
    this.filter = orm.makeFilterFunction(filter);
    this.partial = partial || false;
    orm.getModel('modelName').then((Model) => {
        this.model = Model;
        this.items = orm.$orm.IDB[modelName].values().filter(filterFunction);
    });

    orm.on('updated-' + modelName, function(items) {
        
    });

    orm.on('new-' + modelName, function(items) {
        Array.prototype.concat(this.items,items.filter(filterFunction).toArray());
    });

    orm.on('deleted-' + modelName, function(items) {

    });
}