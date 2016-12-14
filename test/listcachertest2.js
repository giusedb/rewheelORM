var assert = require('assert');
var Lazy = require('../bower_components/lazy.js/lazy.js');
var ListCache = require('../src/listcacher.js');

var ls = new ListCache(Lazy);
var mockModel = { modelName : 'x'};

describe('listcache ', function() {
  describe('#filter complex with single difference', function() {
    it('initial', function() {
        var filter = { a : [1], b : [1], c : [1] };
        var filterOut = ls.filter(mockModel, filter);
        assert.deepEqual(filter, filterOut);
    });
    it('with a single difference', function() {
        var filter = { a : [1], b : [1], c : [2] };
        var filterOut = ls.filter(mockModel, filter);
        assert.deepEqual(filter, filterOut);
    });
    it('with intersection', function() {
        var filter = { a : [1], b : [1,2], c : [2] };
        var filterOut = ls.filter(mockModel, filter);
        assert.deepEqual({ a : [1], b : [2], c : [2] }, filterOut);
    });
    it('other intersection', function() {
        var filter = { a : [1], b : [1], c : [1,2] };
        var filterOut = ls.filter(mockModel, filter);
        assert.deepEqual(null, filterOut);
    });
    it('one field multiple intersection ', function() {
        var filter = { a : [1], b : [1], c : [1,2,3,4,5,6] };
        var filterOut = ls.filter(mockModel, filter);
        assert.deepEqual({ a : [1], b : [1], c : [3,4,5,6] }, filterOut);
    });
    it('multiple fields multiple intersection single result', function() {
        var filter = { a : [1], b : [1,3], c : [5,6,7] };
        var filterOut = ls.filter(mockModel, filter);
        assert.deepEqual({ a : [1], b : [1,3], c : [7, 5,6] }, filterOut);
    });
    it('deletion', function() {
        var filter = { a : [1], b : [1]};
        var filterOut = ls.filter(mockModel, filter);
        var filter = { a : [1], b : [1], c : Lazy.range(10).toArray()};
        var filterOut = ls.filter(mockModel, filter);
        assert.deepEqual(null, filterOut);
    });
  });
});
