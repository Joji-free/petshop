'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Modelo de Usuario (MongoDB)
 * 
 * Define el esquema para usuarios en la base de datos.
 * Incluye autenticación y sistema de roles (user/admin).
 * 
 * Campos:
 * - nombre: Nombre completo del usuario
 * - email: Email único (usado para login)
 * - password: Contraseña encriptada con bcrypt
 * - rol: Rol del usuario ('user' o 'admin')
 * - createdAt: Fecha de creación automática
 * 
 * Colección en MongoDB: usuarios
 */
const UsuarioSchema = Schema({
    /**
     * Nombre completo del usuario
     * - Requerido
     * - Se elimina espacios en blanco (trim)
     */
    nombre: { 
        type: String, 
        required: true, 
        trim: true 
    },
    
    /**
     * Email del usuario (credencial de login)
     * - Requerido
     * - Único (no puede haber duplicados)
     * - Se convierte a minúsculas automáticamente
     * - Se elimina espacios en blanco
     */
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    
    /**
     * Contraseña encriptada
     * - Requerido
     * - Se guarda hasheada con bcryptjs (nunca en texto plano)
     */
    password: { 
        type: String, 
        required: true 
    },
    
    /**
     * Rol del usuario en el sistema
     * - Default: 'user' (cliente)
     * - Valores permitidos: 'user', 'admin'
     * - Los admins tienen acceso al panel de administración
     */
    rol: { 
        type: String, 
        default: 'user', 
        enum: ['user', 'admin'] 
    },
    
    /**
     * Fecha de creación del usuario
     * - Se establece automáticamente al crear
     */
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

/**
 * Exportar modelo
 * 
 * Nombre del modelo: 'Usuario'
 * Colección en MongoDB: 'usuarios' (plural en minúsculas)
 */
module.exports = mongoose.model('Usuario', UsuarioSchema);
