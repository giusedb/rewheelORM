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
    return $('<li>' + doc.name + ' <b>on</b> ' + doc.parent +'</li>');
}

function renderDocs(docs) {
    ul.children().remove();
    docs.map(renderDoc)
        .forEach(function(li){
            ul.append(li);
        });
}

orm.query('doc',{})
    .then(function(documents){
        docs = documents;
        renderDocs(documents)
    })

orm.on('received-folder', function(){
    renderDocs(docs);
});


