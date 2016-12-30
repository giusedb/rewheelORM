var orm = new rwt('http://localhost:5000/cartha/', function(){
    return {
        username : 'a@b.com',
        password : 'pippo'
    }
});



var docs = null;
var ul = $('<ul></ul>');
$('body').append(ul);

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

orm.query('doc',{parent : [35]})
    .then(function(x){
        docs = x;
        renderDocs();
    })

orm.on('received-metaclass', function(){
    renderDocs();
});


