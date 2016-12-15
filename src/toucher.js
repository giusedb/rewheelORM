'use strict';

var exports = module.exports = function (){
    var touched = false
    this.touch = function(){
        touched = true;
    };
    this.touched = function(){
        var t = touched;
        touched = false;
        return t;
    }
}
