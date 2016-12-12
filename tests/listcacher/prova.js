
var ls = new ListCacher();
var model = {modelName : 'cippa'};

console.warn(ls.filter(model,{
    name : ['Giuseppe'],
    last_name : ['Di Bona'],
    age : [36]
}));

console.warn(ls.filter(model,{
    name : ['Giuseppe'],
    last_name : ['Di Bona'],
    age : [36]
}));
