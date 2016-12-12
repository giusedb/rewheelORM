var assert = require('assert');
var Lazy = require('../bower_components/lazy.js/lazy.js');
var ListCache = require('../src/listcacher.js');

var ls = new ListCache(Lazy);
var mockModel = { modelName : 'x'};

//ls.filter(mockModel, {a : [1,2], b: [1]});
describe('listcache', function() {
  describe('#filter', function() {
    it('should return the same', function() {
        var filter = {
            a : [1,2],
        };
        var filterOut = ls.filter(mockModel, filter);
      assert.equal(JSON.stringify(filter), JSON.stringify(filterOut));
        var filter = {
            a : [1,2],
        };
        var filterOut = ls.filter(mockModel, filter);
        assert.equal(null, filterOut);      
    });
  });
});