'use strict';
// Load environment variables early
try { require('dotenv').config(); } catch (e) { /* ignore */ }
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');  // Para sesiones
const passport = require('passport'); //  Para autenticación
const cors = require('cors');//ruta cors

var app= express();
var tienda_routes = require('./routers/tienda');
var auth_routes = require('./routers/auth');//ruta autenticacion
var paypal_routes = require('./routers/paypal');


require('./config/passport-setup');


app.use(cors());

//todo lo que llega y se envia se convierte en json
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(session({
    secret: 'TU_CLAVE_SECRETA_LARGA', 
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

//configuracion de cabeceras




/*app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');

    // --- ESTA ES LA PARTE QUE FALTABA ---
    // Si el navegador está preguntando (Preflight), respondemos OK y cortamos la ejecución.
    if (req.method === 'OPTIONS') {
        return res.status(200).send({});
    }
    // ------------------------------------

    next();
});
*/
app.use('/',tienda_routes);
app.use('/auth', auth_routes);
app.use('/api/paypal', paypal_routes);

module.exports=app;