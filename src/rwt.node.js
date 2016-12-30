var Lazy = require('lazy.js');
var request = require('request');
var sockjs = require('sockjs');
var SockJS = sockjs.listen;
var localStorage = {};

exports = module.exports = reWheelORM;
exports.utils = utils;
exports.ListCacher = ListCacher;
exports.NamedHandler = NamedEventManager;
utils.xdr = function (url, data, callback, errback, application,token,form){
    var request = require('request');
    var headers = {};
    if (application) {
        headers.application = application;
    }
    if (token) {
        headers.token = token;
    }
    var options = {
        url : url,
        method : 'POST',
        headers : headers
    };
    if (data){
        if (form)
            options.form = data;
        else {
            options.json = data;
        }
    }
    var res = request(options, function(error, response, body){
        try {
            body = JSON.parse(body);
        } catch (e) { }
        callback(body, 'Ok', res);
    }, function(body){
        errorBack(body, 'Boh', res);
    });
};