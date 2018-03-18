'use strict';

function ManyToManyRelation(relation,m2m){
    var items = [];
    this.add = items.push.bind(items);
    this.add = function(item){
  //      console.log('adding ' + item);
        if (!(Lazy(items).find(item))){
            items.push(item);
        }
    }

    this.get0 = function(id){
        m2m[1].ask(id);
        return Lazy(items).filter(function(x){
            return x[0] === id;
        }).pluck("1").toArray();
    };

    this.get1 = function(id){
        m2m[0].ask(id);
        return Lazy(items).filter(function(x){
            return x[1] === id;
        }).pluck("0").toArray();
    };
    this['get' + utils.capitalize(relation.indexName.split('/')[1])] = this.get1;
    this['get' + utils.capitalize(relation.indexName.split('/')[0])] = this.get0;

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