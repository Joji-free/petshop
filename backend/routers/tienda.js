'use strict'

var express = require('express');
var ProductosController = require('../controllers/tienda');

//define rutas especificas dentro de la aplicacion
var router = express.Router();
//subida de archivos multipart/form-data
var multipart = require ('connect-multiparty');
var multiPartMiddleware = multipart({ uploadDir: './uploads'});

//pagina de inicio 
router.get('/home', ProductosController.home);

//========== PRODUCTOS ==========
router.post('/guardar-productos', ProductosController.saveProducto);
router.get('/productos', ProductosController.getProductos);
router.get('/producto/:id', ProductosController.getProducto);
router.put('/producto/:id', ProductosController.updateProducto);
router.delete('/producto/:id', ProductosController.deleteProducto);

//========== ACCESORIOS ==========
router.post('/guardar-accesorios', ProductosController.saveAccesorio);
router.get('/accesorios', ProductosController.getAccesorios);
router.get('/accesorio/:id', ProductosController.getAccesorio);
router.put('/accesorio/:id', ProductosController.updateAccesorio);
router.delete('/accesorio/:id', ProductosController.deleteAccesorio);

// ========== CARRITO ==========
router.post('/cart/add', ProductosController.addToCart);
router.get('/cart', ProductosController.getCart);
router.put('/cart/update', ProductosController.updateCart);
router.delete('/cart/remove/:itemId/:kind', ProductosController.removeFromCart);

//========== IMÁGENES ==========
router.post('/subir-imagen/:id', multiPartMiddleware, ProductosController.uploadImagen);
router.get('/get-imagen/:imagen', ProductosController.getImagen);

module.exports = router;
