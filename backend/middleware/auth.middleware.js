'use strict';

const jwt = require('jsonwebtoken');

/**
 * Middleware de Autenticación (Backend)
 * 
 * Provee dos middlewares de Express para proteger rutas:
 * 1. verifyToken - Valida que el JWT sea válido
 * 2. verifyAdmin - Valida que el usuario tenga rol 'admin'
 * 
 * Uso en rutas:
 * router.get('/ruta-protegida', verifyToken, (req, res) => {...});
 * router.post('/admin-only', verifyToken, verifyAdmin, (req, res) => {...});
 * 
 * El token se envía en el header Authorization: Bearer <token>
 */

const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura_2024';

/**
 * Middleware para verificar token JWT
 * 
 * Valida que la petición incluya un token JWT válido en el header
 * Authorization. Si es válido, decodifica el token y agrega los datos
 * del usuario a req.user para uso en siguientes middlewares.
 * 
 * Header esperado:
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {Function} next - Función para continuar al siguiente middleware
 * 
 * Si el token es válido:
 * - Agrega req.user con { id, email, rol }
 * - Llama a next() para continuar
 * 
 * Si falla:
 * - 401: Token no proporcionado o inválido/expirado
 */
function verifyToken(req, res, next) {
    // Extraer token del header: "Bearer TOKEN" -> TOKEN
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            message: 'No se proporcionó token de autenticación' 
        });
    }

    try {
        // Verificar y decodificar el token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Guardar datos del usuario en req para acceso en siguientes middlewares
        // decoded contiene: { id, email, rol }
        req.user = decoded;
        
        // Continuar al siguiente middleware o ruta
        next();
    } catch (error) {
        return res.status(401).json({ 
            message: 'Token inválido o expirado' 
        });
    }
}

/**
 * Middleware para verificar rol de administrador
 * 
 * IMPORTANTE: Debe usarse DESPUÉS de verifyToken, ya que requiere
 * que req.user esté poblado con los datos del token.
 * 
 * Valida que el usuario autenticado tenga rol 'admin'.
 * 
 * @param {Request} req - Request de Express (debe tener req.user)
 * @param {Response} res - Response de Express
 * @param {Function} next - Función para continuar al siguiente middleware
 * 
 * Si es admin:
 * - Llama a next() para continuar
 * 
 * Si falla:
 * - 401: No hay usuario autenticado (falta verifyToken)
 * - 403: Usuario no tiene permisos de administrador
 */
function verifyAdmin(req, res, next) {
    // Verificar que req.user exista (debe pasar por verifyToken primero)
    if (!req.user) {
        return res.status(401).json({ 
            message: 'No autenticado' 
        });
    }

    // Verificar que el rol sea 'admin'
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ 
            message: 'No tienes permisos de administrador' 
        });
    }

    // Usuario es admin, continuar
    next();
}

module.exports = {
    verifyToken,
    verifyAdmin
};
