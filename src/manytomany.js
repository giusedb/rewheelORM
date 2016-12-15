'use strict';

var utils = require('./utils.js');

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
exports = module.exports = ManyToManyRelation;