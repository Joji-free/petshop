'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AccesoriosSchema = Schema({
    categoria: String,
    animal : String,
    nombre: String,
    tipo: String,
    precio: Number,
    stock: Number,
    imagen: String,
});
module.exports = mongoose.model('Accesorios', AccesoriosSchema);