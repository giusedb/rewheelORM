var assert = require('assert');
var Lazy = require('../bower_components/lazy.js/lazy.js');
var ListCache = require('../src/listcacher.js');

var ls = new ListCache(Lazy);
var mockModel = { modelName : 'x'};

//ls.filter(mockModel, {a : [1,2], b: [1]});
describe('listcache', function() {
  describe('#filter single', function() {
    it('should return the same', function() {
        var filter = {
            a : [1,2],
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(JSON.stringify(filter), JSON.stringify(filterOut));
    });
    it('should return null',function(){
        var filter = {
            a : [1,2],
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(null, filterOut);      
    });
    it('should return difference', function(){
        var filter = {
            a : [1,2,3],
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(JSON.stringify({a : [3]}), JSON.stringify(filterOut));      
    })
  });
  describe('#filter double', function(){
    it('shoud return null', function(){
        var filter = {
            a : [1,2,3],
            b : [1,2],
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(null, filterOut);            
    });
    it('should return semidifference', function(){
        var filter = {
            a : [4],
            b : [2],
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(JSON.stringify({b : [2], a : [4]}), JSON.stringify(filterOut));      
    });
    it('should return null', function(){
        var filter = {
            a : [4],
            b : [2],
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(null, filterOut);      
    });
    it('should return semidifference', function(){
        var filter = {
            a : [4],
            b : [2,1],
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(JSON.stringify({b : [1], a : [4]}), JSON.stringify(filterOut));      
    });
    it('should return semidifference', function(){
        var filter = {
            a : [4,5],
            b : [2,1],
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(JSON.stringify({b : [2,1], a : [5]}), JSON.stringify(filterOut));      
    });
    it('should return semidifference', function(){
        var filter = {
            a : [4],
            b : [1,2,3,4,5],
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(JSON.stringify({b : [3,4,5], a : [4]}), JSON.stringify(filterOut));      
    });
    it('should return null', function(){
        var filter = {
            a : [1],
            b : [1,2,3,4,5],
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(null, filterOut);      
    });
  });
  describe('#filter tern', function(){
    it('shoud return same', function(){
        var filter = {
            c : [1],
            d : [1],
            e : [1]
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.deepEqual(filter, filterOut);            
    });
    it('should return semidifference', function(){
        var filter = {
            c : [1],
            d : [1],
            e : [1,2]
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.deepEqual({c : [1], d : [1], e: [2]}, filterOut);      
    });
    it('should return null', function(){
        var filter = {
            c : [1],
            d : [1,2],
            e : [4,1]
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.deepEqual({c : [1], d : [1,2], e : [4]}, filterOut);      
    });
    it('should return null', function(){
        var filter = {
            c : [1],
            d : [1,2],
            e : [4,1]
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(null,filterOut);      
    });
    it('should return null because at least', function(){
        var filter = {
            a : [4,5],
            b : [2,1],
            c : [1]
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(null, filterOut);      
    });
    it('should return semidifference', function(){
        var filter = {
            c : [1,2],
            d : [1],
            e : [1]
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.deepEqual(filterOut,{ e : [1], d : [1], c : [2]});      
    });
    it('should return all 2', function(){
        var filter = {
            c : [1,2],
            d : [1,2],
            e : [1,2]
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.deepEqual(filterOut, { c : [2], d : [2], e :[2]});      
    });
  });
  describe('tern with a single difference',function(){
    it('Initialize all and make a simple',function(){
      ls = new ListCache(Lazy);
      var filter = { a : [1], b : [1], c : [1]};
      var filterOut = ls.filter(mockModel, filter);
      assert.deepEqual(filter, filterOut);
    });
    it('one change',function(){
      var filter = { a : [2], b : [1], c : [1]};
      var filterOut = ls.filter(mockModel, filter);
      assert.deepEqual(filter, filterOut);
    });
    it('one change 2',function(){
      var filter = { a : [3], b : [1], c : [1]};
      var filterOut = ls.filter(mockModel, filter);
      assert.deepEqual(filter, filterOut);
    });
    it('all three',function(){
      var filter = { a : [3,2,1], b : [1], c : [1]};
      var filterOut = ls.filter(mockModel, filter);
      assert.deepEqual(null, filterOut);
    });
    it('change another',function(){
      var filter = { a : [1], b : [2], c : [1]};
      var filterOut = ls.filter(mockModel, filter);
      assert.deepEqual(filter, filterOut);
    });
    it('change last',function(){
      var filter = { a : [1], b : [1], c : [2]};
      var filterOut = ls.filter(mockModel, filter);
      assert.deepEqual(filter, filterOut);
    });
    it('change all',function(){
      var filter = { a : [2], b : [2], c : [2]};
      var filterOut = ls.filter(mockModel, filter);
      assert.deepEqual(filter, filterOut);
    });
    it('deleting index c',function(){
      var filter = { a : [2], b : [2]};
      var filterOut = ls.filter(mockModel, filter);
      assert.deepEqual(filter, filterOut);
    });
    it('deleted c ignored',function(){
      var filter = { a : [2], b : [2], c: [3]};
      var filterOut = ls.filter(mockModel, filter);
      assert.deepEqual(null, filterOut);
    });
    it('freeing all',function(){
      var filter = {};
      var filterOut = ls.filter(mockModel, filter);
      assert.deepEqual(filter, filterOut);
    });
  });
});