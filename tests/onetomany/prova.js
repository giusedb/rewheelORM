var orm = new reWheelORM(new reWheelConnection('http://localhost:5000/cartha/', function(){
    return {
        username : 'a@b.com',
        password : 'pippo'
    }
}));

var folders = null;
var ul = $('<ul></ul>');
$('body').append(ul);
function renderFolder(folder){
    var docs = ' (<i>no documents</i>) ' 
    if (folder.doc_parents){
        docs = '<ul>' + folder.doc_parents.map(function(doc){
            return '<li>' + doc.name + '</li>';
        }).join('') + '</ul>'
    }
    return $('<li>' + folder.name + docs +'</li>');
}

function renderFolders() {
    ul.children().remove();
    folders.map(renderFolder)
        .forEach(function(li){
            ul.append(li);
        });
}

orm.query('folder',{})
    .then(function(x){
        folders = x;
        renderFolders()
    })

orm.on('received-doc', function(){
    renderFolders();
});


