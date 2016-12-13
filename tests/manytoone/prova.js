utils.cleanStorage();
var orm = new reWheelORM(new reWheelConnection('http://localhost:5000/cartha/', function(){
    return {
        username : 'a@b.com',
        password : 'pippo'
    }
}));

var docs = null;
var ul = $('<ul></ul>');
$('body').append(ul);
function renderDoc(doc){
    return $('<li>(' + doc._parent + ') -- ' + doc.name + ' <b>on</b> ' + (doc.parent && doc.parent.name) +'</li>');
}

function renderDocs(docs) {
    ul.children().remove();
    docs.map(renderDoc)
        .forEach(function(li){
            ul.append(li);
        });
}

orm.query('doc',{ parent : Lazy.range(100).toArray()})
    .then(function(documents){
        docs = documents;
        renderDocs(documents)
    })

orm.on('received-folder', function(){
    renderDocs(docs);
});


