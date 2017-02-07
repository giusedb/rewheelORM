'use strict';

var STATUSKEY = 'lastRWTConnectionStatus';

function RealtimeConnection(endPoint, rwtConnection){
    /**
     * Connects a websocket with reWheel connection
     */
    var self = this;

    var connection = new SockJS(endPoint);
    connection.onopen = function (x) {
        console.log('open : ' + x);
        connection.tenant();
        rwtConnection.emit('realtime-connection-open',x);
    };
    connection.onmessage = function (x) {
        if (x.type == 'message') {
            //$.notify(x.data);
            try {
                //TODO set fromRealtime
                rwtConnection.emit('realtime-message-json', JSON.parse(x.data));
                //TODO unset fromRealtime
            } catch (e){
                rwtConnection.emit('realtime-message-text', JSON.parse(x.data));
            }
        } else {
            console.log('from realtime ',x);
        }
    };
    connection.onclose = function () {
        setTimeout(utils.wsConnect,1000);
        rwtConnection.emit('realtime-connection-closed');
    };
    connection.tenant = function () {
        connection.send('TENANT:' + rwtConnection.cachedStatus.application + ':' + rwtConnection.cachedStatus.token);
    }
    this.close = function() {
        connection.close();
    }
}    

function reWheelConnection(endPoint, getLogin){
    /**
     * Connection basic for reWheel
     * @param endPoint: string base url for all comunication
     * @param getLogin: function to be called in case of missing login.
     *  this function could return :
     *  -   a { username : <username> , password: <password>} or
     *  -   b Promise -> { username : <username> , password: <password>}
     */
    // main initialization
    var events = new NamedEventManager();
    this.getLogin = getLogin;
    this.endPoint = endPoint.endsWith('/')? endPoint: (endPoint + '/');
    this.on = events.on;
    this.unbind = events.unbind;
    this.emit = events.emit;
    this.once = events.once;
    this.cachedStatus = {};
    this.isConnected = false;
    this.isLoggedIn = false;
    // registering update status
    var ths = this;
};

reWheelConnection.prototype.$post = function(url, data,callBack){
    /**
     * AJAX call for fetch all data from server
     * @param url: last url part for ajax call
     * @param data: data object to be sent
     * @param callBack: function(xhr) will be called when data arrives
     * @returns Promise<xhr> same of callBack
     */
    // initialization
    var ths = this;
    var promise = new Promise(function(accept,reject){
        utils.xdr(ths.endPoint + url, data, ths.cachedStatus.application, ths.cachedStatus.token)
            .then(function(xhr){
                ths.emit('http-response', xhr.responseText, xhr.status, url, data);
                ths.emit('http-response-' + xhr.status, xhr.responseText, url, data);
                if (xhr.responseData){
                    ths.emit('http-response-' + xhr.status + '-json', xhr.responseData, url, data);
                }
                if (callBack) { callBack( xhr.responseData || xhr.responseText )};
                accept(xhr.responseData || xhr.responseText);
            }, function(xhr) {
                if (xhr.responseData){
                    ths.emit('error-json', xhr.responseData, xhr.status, url, data, xhr);
                    ths.emit('error-json-' + xhr.status, xhr.responseData,url, data, xhr);
                } else {                
                    ths.emit('error-http',xhr.responseText, xhr.status,url,data,xhr);
                    ths.emit('error-http-' + xhr.status, xhr.responseText,url,data,xhr);
                }
                reject(xhr.responseData || xhr.responseText);
            });
        });
    return promise;
};

/**
 * Check current status and callback for results.
 * It caches results for further.
 * @param callback: (status object)
 * @param force: boolean if true empties cache  
 * @return void
 */
reWheelConnection.prototype.status = function(callBack, force) {
    // if force, clear all cached values
    var key = 'token:' + this.endPoint;
    var ths = this;
    if (force) {
        this.cachedStatus = {};
        delete localStorage[key];
    }
    if (this.statusWaiting) {
        // wait for status
        utils.waitFor(function() {
            return !ths.statusWaiting;
        }, function(){
            ths.status(callBack,force);
        });
        return;
    }
    // try for value resolution
    // first on memory
    if (Lazy(this.cachedStatus).size()){
        callBack(this.cachedStatus)
    // then in localStorage
    } else {
        var data = {};
        if (key in localStorage) {
            data.__token__ = localStorage[key];
        }
        this.statusWaiting = true;
        this.$post('api/status',data, function(status){
            ths.updateStatus(status);
            localStorage[key] = status.token;
            callBack(status);
            ths.statusWaiting = false;
        });
        // doesn't call callback
        return
    }
    callBack(this.cachedStatus);
};

reWheelConnection.prototype.updateStatus = function(status){
    var lastBuild = parseFloat(localStorage.lastBuild) || 1;
    if (lastBuild < status.last_build){
        utils.cleanDescription();
        localStorage.lastBuild = status.last_build;
    }
    this.isConnected = Boolean(status.token);
    this.isLoggedIn = Boolean(status.user_id);
    var oldStatus = this.cachedStatus;
    this.cachedStatus = status;
    if (!oldStatus.user_id && status.user_id){
        this.emit('logged-in',status.user_id);
    } else if (oldStatus.user_id && !status.user_id){
        this.emit('logged-out');
    } else if (this.isConnected && !this.isLoggedIn){
        this.emit('login-required');
        if (this.getLogin){
            var loginInfo = this.getLogin();
            if (loginInfo.constructor === Object){
                this.login(loginInfo.username, loginInfo.password, loginInfo.callBack);
            } else if (loginInfo.constructor === Promise) {
                loginInfo.then(function(obj){
                    this.login(obj.username, obj.password, obj.callBack);
                })
            }
        }
    }
    // realtime connection is setted
    if (!oldStatus.realtimeEndPoint && status.realtimeEndPoint) {
        this.wsConnection = new RealtimeConnection(status.realtimeEndPoint, this);
    // realtime connection is closed
    } else if (oldStatus.realtimeEndPoint && !status.realtimeEndPoint) {
        this.wsConnection.close();
        delete this.wsConnection;
    }
    this.emit('update-connection-status', status, oldStatus);
    localStorage[STATUSKEY] = JSON.stringify(status);
}

reWheelConnection.prototype.login = function(username, password){
    /**
     * make login and return a promise. If login succed, promise will be accepted
     * If login fails promise will be rejected with error
     * @param username: username
     * @param password: password
     * @return Promise (user object)
     */
    var ths = this;
    return new Promise(function(accept, reject){
        utils.xdr(ths.endPoint + 'api/login', {username: username || '', password: password || ''},null,ths.cachedStatus.token, true)
            .then(function(xhr){
                // update status
                ths.updateStatus(xhr.responseData);
                // call with user id
                accept({status : 'success', userid: ths.cachedStatus.user_id});
            }, function(xhr) {
                // if error call error manager with error
                accept({error: xhr.responseData.error, status: 'error'});
            });
    });
};

reWheelConnection.prototype.logout = function() {
    var ths = this;
    return new Promise(function(accept,reject) {
        ths.$post('api/logout')
            .then(function(ok){
                ths.updateStatus({});
                delete localStorage[STATUSKEY];
                accept()
            }, reject);
    });
};

reWheelConnection.prototype.connect = function(callBack) {
    if (this.isLoggedIn) {
        callBack(this.cachedStatus.user_id);
    } else {
        // wait for login
        this.once('logged-in',function(user_id){
            callBack(user_id);
        });
        this.status(callBack || utils.noop);
    }
}

utils.reWheelConnection = reWheelConnection;