var assert = require('assert');
var Lazy = require('../bower_components/lazy.js/lazy.js');
var ListCache = require('../src/listcacher.js');

var ls = new ListCache(Lazy);
var mockModel = { modelName : 'x'};

function sortFilter(dict){
    if (dict)
        return Lazy(dict).map(function(v, k){
            return [k, Lazy(v).sort().toArray()];
        }).toObject();
    return null;
}

var testCase = [
    [{ a:[1], b : [1], c : [1]},  { a:[1], b : [1], c : [1]}, 'initial'],
    [{ a:[1], b : [1], c : [1]},  null, 'previous'],
    [{ a:[1], b : [1], c : [1,2]}, { a:[1], b : [1], c : [2]} , 'single change'],
    [{ a:[1], b : [1], c : [1,2,3,4]}, { a:[1], b : [1], c : [3,4]} , 'single difference'],
    [{ a:[1], b : [2], c : [1]}, { a:[1], b : [2], c : [1]} , 'new subitem'],
    [{ a:[1], b : [2], c : [1]}, null , 'same subitem'],
    [{ a:[1], b : [2], c : [1,2,3]}, { a:[1], b : [2], c : [2,3]} , 'subitem difference'],
    [{ a:[1], b : [1,2,3], c : [1,2,3]}, { a:[1], b : [3], c : [1,2,3]} , 'multi subdifference'],
    [{ a:[1], b : [4], c : [1,2]}, { a:[1], b : [4], c : [1,2]} , 'closing difference'],
    
]

describe('all tests', function(){
    function makeTest (inn, out, text){
        return it(text, function(){
            outFilter = ls.filter(mockModel, inn);
            assert.deepEqual(sortFilter(outFilter),sortFilter(out));
        });
    }
    testCase.map(function(x){
        return makeTest.apply(this,x);
    });
});