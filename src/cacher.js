'use strict';

function cachedPropertyByEvents(proto, propertyName,getter, setter){
    var events = Array.prototype.slice.call(arguments,4);
    var result = {};
    
    Lazy(events).each(function(event){
        proto.orm.on(event,function(){
            result = {};
        });
    });
    var propertyDef = {
        get: function cached(){
            if (!(this.id in result)){
                result[this.id] = getter.call(this);
            }
            return result[this.id];
        }
    };
    if (setter){
        propertyDef['set'] = function(value){
//            if (value !== result[this.id]){
                setter.call(this,value);
                if (this.id in result){
                    delete result[this.id];
                }
//            }
        }
    }
    Object.defineProperty(proto, propertyName,propertyDef);
}
