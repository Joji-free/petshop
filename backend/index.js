'use strict'
var mongoose = require('mongoose');
var port = '3600';
//promesas nativas de JavaScript
mongoose.Promise=global.Promise;
//importar tu la aplicacion de express
var app=require('./app');
//conexio a la base de datos 
mongoose.connect('mongodb://localhost:27017/tienda')
.then(()=>{
    console.log("La conexion establecida con la bdd es correcta...");
    app.listen(port,()=>{
        console.log("Conexion establecida en el url: localhost:3600");
    })
})
.catch(err=>console.log(err));