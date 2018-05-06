var ORM = require('./dist/rwt.nd.js');
var orm = new ORM('http://localhost:5000/cartha/', function(){
    return { username : 'a@b.com', password : 'pippo'};
});
orm.query('doc',{ parent : [1,2,3,4,5]}).then(console.log,function(err){
    console.log('error : ' + err);
});
orm.get('folder',[1,2,3]).then(console.log,function(err){
    console.log('error : ' + err);
})