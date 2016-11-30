'use strict';
window.currentContext = null;

function addContext(c){
    Lazy(c).each(function(v,k){
        currentContext[k] = v;
    });
};

function Context(parent){
    var ths = this;
    this.parentContext = parent;
    this.after = new Handler();
    this.consume = function(){
        ths.after.handleBy(ths);
        ths.after = new Handler();
    };
    this.createSubContext = function(){
        ths.childContext = new Context(ths);
    };
}

function contexted(func, obj){
    if (obj)
        func = func.bind(obj);
    return function(){
        if (currentContext){
            currentContext.createSubContext();
        } else {
            window.currentContext = new Context();
        }
        var ret = func.call(arguments);
        currentContext.consume();
        return ret;
    }
};
