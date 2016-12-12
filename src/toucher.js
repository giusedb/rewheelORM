'use strict';

function Toucher(){
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
