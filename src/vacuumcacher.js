'use strict';


function VacuumCacher(touch, asked, name, pkIndex){
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
        if (pkIndex && (id in pkIndex.source)) {
            return;
        }
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
