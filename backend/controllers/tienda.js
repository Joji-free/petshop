'use strict'

var Productos = require("../models/productos");
var Accesorios = require("../models/accesorios");
var path = require('path');
var fs = require('fs');

var controller = {
    home: function (req, res) {
        return res.status(200).send(
            "<h1>Hola Mundo</h1>"
        );
    },

    // ========== PRODUCTOS ==========
    saveProducto: function (req, res) {
        var producto = new Productos();
        var params = req.body;

        if (!params.nombre || params.precio === undefined || params.precio === null || params.precio === '') {
            return res.status(400).send({ message: 'Falta el nombre o el precio del producto' });
        }

        producto.nombre = params.nombre;
        producto.animal = params.animal;
        producto.sabor = params.sabor;
        producto.kg = params.kg;
        producto.precio = params.precio;
        producto.imagen = null;

        producto.save()
            .then(productoStored => {
                if (!productoStored) return res.status(404).send({ message: 'No se ha guardado el producto' });
                return res.status(201).send({ producto: productoStored });
            })
            .catch(err => {
                return res.status(500).send({ message: 'Error al guardar el producto', error: err });
            });
    },

    getProductos: function (req, res) {
        Productos.find({}).exec()
            .then(producto => {
                if (!producto || producto.length === 0)
                    return res.status(404).send({ message: 'No hay productos que mostrar' })
                return res.status(200).send({ producto })
            })
            .catch(err => {
                return res.status(500).send({ message: 'Error al recuperar los datos', error: err });
            });
    },

    getProducto: function (req, res) {
        var productoId = req.params.id;
        Productos.findById(productoId).exec()
            .then(producto => {
                if (!producto)
                    return res.status(404).send({ message: 'El producto no existe' })
                return res.status(200).send({ producto })
            })
            .catch(err => {
                if (err.name === 'CastError') {
                    return res.status(404).send({ message: 'Formato de ID de producto no válido' })
                }
                return res.status(500).send({ message: 'Error al recuperar los datos', error: err });
            });
    },

    updateProducto: function (req, res) {
        var productoId = req.params.id;
        var update = req.body;

        Productos.findByIdAndUpdate(productoId, update, { new: true })
            .then(productoUpdate => {
                if (!productoUpdate) return res.status(404).send({ message: 'El producto no existe para actualizar' });
                return res.status(200).send({ body: update, producto: productoUpdate });
            })
            .catch(err => {
                if (err.name === 'CastError') {
                    return res.status(404).send({ message: 'Formato de ID de producto no válido para actualizar' });
                }
                return res.status(500).send({ message: 'Error al actualizar los datos', error: err });
            });
    },

    deleteProducto: function (req, res) {
        var productoId = req.params.id;

        Productos.findByIdAndDelete(productoId)
            .then(productoRemove => {
                if (!productoRemove)
                    return res.status(404).send({ message: 'No se puede eliminar el producto porque no existe' });
                return res.status(200).send({ producto: productoRemove, message: 'Producto eliminado correctamente' });
            })
            .catch(err => {
                if (err.name === 'CastError') {
                    return res.status(404).send({ message: 'Formato de Id de producto no válido para eliminar.' });
                }
                return res.status(500).send({ message: 'Error al eliminar los datos', error: err });
            });
    },

    // ========== ACCESORIOS ==========
    saveAccesorio: function (req, res) {
        var accesorio = new Accesorios();
        var params = req.body;

        accesorio.nombre = params.nombre;
        accesorio.categoria = params.categoria;
        accesorio.tipo = params.tipo;
        accesorio.precio = params.precio;
        accesorio.imagen = null;

        accesorio.save()
            .then(accesorioStored => {
                if (!accesorioStored) return res.status(404).send({ message: 'No se ha guardado el accesorio' });
                return res.status(200).send({ accesorio: accesorioStored });
            })
            .catch(err => {
                return res.status(500).send({ message: 'Error al guardar el accesorio', error: err });
            });
    },

    getAccesorios: function (req, res) {
        Accesorios.find({}).exec()
            .then(accesorio => {
                if (!accesorio || accesorio.length === 0)
                    return res.status(404).send({ message: 'No hay accesorios que mostrar' })
                return res.status(200).send({ accesorio })
            })
            .catch(err => {
                return res.status(500).send({ message: 'Error al recuperar los datos', error: err });
            });
    },

    getAccesorio: function (req, res) {
        var accesorioId = req.params.id;
        Accesorios.findById(accesorioId).exec()
            .then(accesorio => {
                if (!accesorio)
                    return res.status(404).send({ message: 'El accesorio no existe' })
                return res.status(200).send({ accesorio })
            })
            .catch(err => {
                if (err.name === 'CastError') {
                    return res.status(404).send({ message: 'Formato de ID de accesorio no válido' })
                }
                return res.status(500).send({ message: 'Error al recuperar los datos', error: err });
            });
    },

    updateAccesorio: function (req, res) {
        var accesorioId = req.params.id;
        var update = req.body;

        Accesorios.findByIdAndUpdate(accesorioId, update, { new: true })
            .then(accesorioUpdate => {
                if (!accesorioUpdate) return res.status(404).send({ message: 'El accesorio no existe para actualizar' });
                return res.status(200).send({ accesorio: accesorioUpdate });
            })
            .catch(err => {
                if (err.name === 'CastError') {
                    return res.status(404).send({ message: 'Formato de ID de accesorio no válido para actualizar' });
                }
                return res.status(500).send({ message: 'Error al actualizar los datos', error: err });
            });
    },

    deleteAccesorio: function (req, res) {
        var accesorioId = req.params.id;

        Accesorios.findByIdAndDelete(accesorioId)
            .then(accesorioRemove => {
                if (!accesorioRemove)
                    return res.status(404).send({ message: 'No se puede eliminar el accesorio porque no existe' });
                return res.status(200).send({ accesorio: accesorioRemove, message: 'Accesorio eliminado correctamente' });
            })
            .catch(err => {
                if (err.name === 'CastError') {
                    return res.status(404).send({ message: 'Formato de Id de accesorio no válido para eliminar.' });
                }
                return res.status(500).send({ message: 'Error al eliminar los datos', error: err });
            });
    },

    // ========== CARRITO (no persistente) ==========
    addToCart: function (req, res) {
        var params = req.body || {};
        var itemId = params.itemId;
        var kind = params.kind; // 'producto' or 'accesorio'
        var qty = parseInt(params.qty) || 1;

        if (!itemId || !kind) return res.status(400).send({ message: 'Parámetros inválidos' });

        // validar que el item exista, pero no guardaremos nada en la BDD
        var itemPromise = (kind === 'producto') ? Productos.findById(itemId).exec() : Accesorios.findById(itemId).exec();

        itemPromise
            .then(item => {
                if (!item) return res.status(404).send({ message: 'Item no encontrado' });

                // devolver información útil para que el cliente la sincronice en localStorage
                return res.status(200).send({
                    success: true,
                    message: 'OK (persistencia en cliente - localStorage)',
                    item: {
                        itemId: item._id,
                        kind: kind,
                        nombre: item.nombre,
                        precio: item.precio,
                        imagen: item.imagen || null,
                        qty: qty
                    }
                });
            })
            .catch(err => {
                if (err.name === 'CastError') return res.status(404).send({ message: 'Formato de ID no válido' });
                return res.status(500).send({ message: 'Error buscando item', error: err });
            });
    },

    getCart: function (req, res) {
        // El servidor no guarda el carrito; devolvemos instructivo vacío para compatibilidad
        return res.status(200).send({ cart: { items: [] }, message: 'El servidor no persiste carrito; usa localStorage en el cliente.' });
    },

    updateCart: function (req, res) {
        // Endpoint no persistente: validamos parámetros y respondemos OK para sincronización
        var params = req.body || {};
        var itemId = params.itemId;
        var kind = params.kind;
        var qty = parseInt(params.qty);

        if (!itemId || !kind || typeof qty === 'undefined') return res.status(400).send({ message: 'Parámetros inválidos' });

        return res.status(200).send({ success: true, message: 'OK (cliente debe persistir cambios en localStorage)' });
    },

    removeFromCart: function (req, res) {
        var itemId = req.params.itemId;
        var kind = req.params.kind;

        if (!itemId || !kind) return res.status(400).send({ message: 'Parámetros inválidos' });

        return res.status(200).send({ success: true, message: 'OK (cliente debe eliminar del localStorage)' });
    },

    // ========== UPLOAD IMAGEN ==========
    uploadImagen: function (req, res) {
        var itemId = req.params.id;
        var fileName = 'Imagen no subida...';

        if (req.files) {
            var filePath = req.files.imagen.path;
            var file_split = filePath.split('\\');
            fileName = file_split[file_split.length - 1];

            var extSplit = fileName.split('.');
            var fileExt = extSplit[extSplit.length - 1];

            if (fileExt == 'png' || fileExt == 'jpg' || fileExt == 'jpeg' || fileExt == 'gif' || fileExt == 'webp' || fileExt == 'avif') {
                // Intentar actualizar en Productos primero
                Productos.findByIdAndUpdate(itemId, { imagen: fileName }, { new: true })
                    .then(itemUpdate => {
                        if (!itemUpdate) {
                            // Si no es un producto, intentar actualizar en Accesorios
                            Accesorios.findByIdAndUpdate(itemId, { imagen: fileName }, { new: true })
                                .then(accesorioUpdate => {
                                    if (!accesorioUpdate) {
                                        fs.unlink(filePath, (unlinkErr) => {
                                            return res.status(404).send({ message: 'El item no existe y no se subió la imagen' });
                                        });
                                    } else {
                                        return res.status(200).send({ accesorio: accesorioUpdate });
                                    }
                                })
                                .catch(err => {
                                    fs.unlink(filePath, (unlinkErr) => {
                                        if (unlinkErr) console.error('Error al eliminar archivo temporal', unlinkErr);
                                        return res.status(500).send({ message: 'Error al subir la imagen', error: err });
                                    });
                                });
                        } else {
                            return res.status(200).send({ producto: itemUpdate });
                        }
                    })
                    .catch(err => {
                        fs.unlink(filePath, (unlinkErr) => {
                            if (unlinkErr) console.error('Error al eliminar archivo temporal', unlinkErr);
                            return res.status(500).send({ message: 'Error al subir la imagen o actualizar el producto', error: err });
                        });
                    });
            } else {
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error al eliminar archivo con extensión no válida: ', err);
                    return res.status(200).send({ message: 'La extensión no es válida, archivo eliminado.' });
                });
            }
        } else {
            return res.status(400).send({ message: 'No se ha subido ninguna imagen.' });
        }
    },

    getImagen: function (req, res) {
        var file = req.params.imagen;
        var path_file = './uploads/' + file;

        // Verificar si el archivo existe
        if (fs.existsSync(path_file)) {
            return res.sendFile(path.resolve(path_file));
        } else {
            return res.status(404).send({ message: 'No existe la imagen' });
        }
    }
}

module.exports = controller;
