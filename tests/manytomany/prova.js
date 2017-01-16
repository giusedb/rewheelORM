var orm = new rwt('http://localhost:5000/cartha/');

orm.on('login-required',function(){ console.info('login-required')})
orm.on('logged-in',function(){ console.info('loggin in')})
orm.on('logged-out',function(){ console.info('log out')})

$(function(){
    var form = $('#form');
    var login = $('#loginForm');
    var body = $('#body');
    var docs = null;
    var ul = $('<ul></ul>');
    var logout = $('#logoutButton');
    login.hide();
    body.hide();
    $('#error').hide();
    form.submit(function(){
        orm.login($('#username').val(),$('#password').val())
            .then(function(res){
                if (res.status === 'error'){
                        $('#error').html(res.error).show();
                    } else {
                        $('#error').hide();
                    }
                });
        return false;
    });
    logout.click(function(){
        orm.logout();
    })
    orm.on('logged-in',function(){
        body.show();
        login.hide();
    });
    var log = function(){
        body.hide();
        login.show();
    }
    orm.on('logged-out',log);
    orm.on('login-required', log);
    orm.connect(function(user_id){
        body.append(ul);
        orm.query('doc',{parent : [35]})
            .then(function(x){
                console.info('docs arrived ' + x.length);
                docs = x;
                renderDocs();
            })
    });
    
    function renderDoc(doc){
        var metaclasses = '';
        if (doc.metaclasss && doc.metaclasss.length){
            metaclasses = '<b> with ' + Lazy(doc.metaclasss).pluck('title').toString(', ') + '</b>';
        }
        return '<li>' + doc.name + metaclasses + '</li>';
    }

    function renderDocs(){
        ul.children().remove();
        docs.forEach(function(doc){
            ul.append($(renderDoc(doc)));
        });
    }


    orm.on('received-metaclass', function(){
        renderDocs();
    });
})




