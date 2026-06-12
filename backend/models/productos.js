'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ProductosSchema = Schema({
   categoria: String,
   animal: String,
   nombre: String, 
   sabor: String,
   kg: Number,
   precio: Number,
   stock: {
      type: Number,
      default: 0
   },
   imagen: String,
});
module.exports = mongoose.model('Productos', ProductosSchema);