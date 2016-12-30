//utils.cleanStorage();
var orm = new rwt('http://localhost:5000/cartha/', function(){
    return {
        username : 'a@b.com',
        password : 'pippo'
    }
});


var docs = null;
var doc = null;
var ul = $('<ul></ul>');
$('body').append(ul);
function renderDoc(doc){
    orm.addModelHandler('folder', function(model){
        Object.defineProperty(model.prototype, 'cippa', { get : function(){
            return 2;
        }})
    });
    var btn = $('<div class="btn btn-warning">Salva</div>');
    var ret = $('<li>(' + doc._parent + ') -- ' + doc.name + ' <b>on</b> ' + (doc.parent && doc.parent.name) + ' --- ' + JSON.stringify(doc.permissions) + '</li>')
    ret.append(btn);
    btn.click(function(){
        doc.save();
    });
    return ret;
}

function renderDocs() {
    ul.children().remove();
    docs.map(renderDoc)
        .forEach(function(li){
            ul.append(li);
        });
}

orm.query('doc',{})
    .then(function(documents){
        docs = documents;
        doc = docs[0];
        renderDocs(documents)
    })

orm.on('received-folder', renderDocs);
orm.on('update-permissions-doc', renderDocs);


