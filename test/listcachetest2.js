var assert = require('assert');
var Lazy = require('../bower_components/lazy.js/lazy.js');
var ListCache = require('../src/listcacher.js');

var ls = new ListCache(Lazy);
var mockModel = { modelName : 'x'};

//ls.filter(mockModel, {a : [1,2], b: [1]});
describe('listcache 2', function() {
  describe('tern with a single difference',function(){
    it('Initialize all and make a simple',function(){
      var filter = { a : [1,2], b : [1,2]};
      var filterOut = ls.filter(mockModel, filter);
      assert.deepEqual(filter, filterOut);
    });
    it('one change',function(){
      var filter = { a : [2], b : [2], c : [3,2]};
      var filterOut = ls.filter(mockModel, filter);
      assert.deepEqual(filterOut, null);
    });
/*
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
*/
  });
});