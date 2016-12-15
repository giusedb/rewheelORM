var ORM = require('./src/orm.js');
var orm = new ORM.ORM(new ORM.connection('http://localhost:5000/cartha/', function(){
    return { username : 'a@b.com', password : 'pippo'};
}));
orm.query('doc',{ parent : [1,2,3,4,5]}).then(console.log,function(err){
    console.log('error : ' + err);
});