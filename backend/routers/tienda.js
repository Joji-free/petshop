'use strict'

var express = require('express');
var ProductosController = require('../controllers/tienda');

//define rutas especificas dentro de la aplicacion
var router = express.Router();
//subida de archivos multipart/form-data
var multipart = require ('connect-multiparty');
var multiPartMiddleware = multipart({ uploadDir: './uploads'});
const { verifyToken, verifyAdmin } = require('../middleware/auth.middleware');

//pagina de inicio 
router.get('/home', ProductosController.home);

//========== PRODUCTOS ==========
router.post('/guardar-productos', verifyToken, verifyAdmin, ProductosController.saveProducto);

router.get('/productos', ProductosController.getProductos);

router.get('/producto/:id', ProductosController.getProducto);

router.put('/producto/:id', verifyToken, verifyAdmin, ProductosController.updateProducto);

router.delete('/producto/:id', verifyToken, verifyAdmin, ProductosController.deleteProducto);

//========== ACCESORIOS ==========
router.post('/guardar-accesorios', verifyToken, verifyAdmin, ProductosController.saveAccesorio);

router.get('/accesorios', ProductosController.getAccesorios);

router.get('/accesorio/:id', ProductosController.getAccesorio);

router.put('/accesorio/:id', verifyToken, verifyAdmin, ProductosController.updateAccesorio);

router.delete('/accesorio/:id', verifyToken, verifyAdmin, ProductosController.deleteAccesorio);

// ========== CARRITO ==========
router.post('/cart/add', ProductosController.addToCart);

router.get('/cart', ProductosController.getCart);

router.put('/cart/update', ProductosController.updateCart);

router.delete('/cart/remove/:itemId/:kind', ProductosController.removeFromCart);

//========== IMÁGENES ==========
router.post('/subir-imagen/:id', verifyToken, verifyAdmin, multiPartMiddleware, ProductosController.uploadImagen);

router.get('/get-imagen/:imagen', ProductosController.getImagen);

module.exports = router;
