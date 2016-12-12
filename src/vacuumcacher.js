'use strict';


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
