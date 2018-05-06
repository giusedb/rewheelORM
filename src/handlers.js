'use strict';

function Handler(){
    this.handlers = [];
    this.strHandlers = {};
};

Handler.prototype.addHandler = function (handler){
    var strHandler = utils.hash(handler.toString());
    if (!(strHandler in this.strHandlers)){
        this.strHandlers[strHandler] = handler;
        this.handlers.push(handler);
    }
};
Handler.prototype.handle = function(){
    var args = Array.prototype.slice.call(arguments,0);
    this.handlers.forEach(function(func){
        func.apply(null,args);
    })
};
Handler.prototype.handleBy = function(){
    var args = Array.prototype.slice.call(arguments,1);
    var ths = arguments[0];
    this.handlers.forEach(function(func){
        func.apply(ths,args);
    })
};


function NamedEventManager (){
    var events = {};
    var handlerId = {};
    var idxId = 0;
    this.on = function(name, func){
        if (!(name in events)){
            events[name] = new Array();
        }
        var id = idxId ++;
        events[name].push(func);
        handlerId[id] = func;
        return id;
    };
    this.emit = function(name){
        if (name in events){
            var args = Array.prototype.slice.call(arguments,1);
            events[name].forEach(function(event){
                event.apply(null,args);
            });
        }
    };
    this.unbind = function(handler){
        var count = 0;
        if (handler in handlerId){
            var func = handlerId[handler + ''];
            Lazy(events).each(function(v,k){
                var idx = [];
                for (var n in v){
                    if (v[n] === func){
                        idx.push(n);
                        count++;
                    }
                }
                idx.reverse().forEach(function(x){
                    v.splice(x,1);
                });
            });
        }
        delete handlerId[handler];
        return count;
    };
    /**
     * Call event once
     */
    this.once = function(eventName, handlerFunction) {
        var self = this;
        var handler = this.on(eventName, function(){
            handlerFunction.apply(this, arguments);
            self.unbind(handler);
        })
    }

    if ('DEBUG' in window) {
        var emit = this.emit;
        this.emit = (function() {
            var args = Array.prototype.slice.call(arguments,0);
            //console.info('Event : ' + args)
            return emit.apply(this, args);
        }).bind(this);
    }
}
