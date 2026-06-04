'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario');

/**
 * Router de Autenticación (Backend)
 * 
 * Maneja todas las rutas relacionadas con autenticación de usuarios:
 * - Registro de nuevos usuarios (siempre como 'user')
 * - Login con generación de JWT
 * - Logout
 * - Creación de administradores (solo por admins)
 * 
 * Seguridad:
 * - Contraseñas encriptadas con bcryptjs
 * - Tokens JWT con expiración de 7 días
 * - Validaciones de formato en backend
 * - Protección contra registro de admins no autorizados
 */

// Clave secreta para JWT (en producción usar variable de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura_2024';

/**
 * Valida el formato de un email
 * @param {string} email - Email a validar
 * @returns {boolean} true si es válido, false si no
 */
function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
}

/**
 * Valida que el nombre solo contenga letras (incluyendo acentos y ñ)
 * @param {string} name - Nombre a validar
 * @returns {boolean} true si es válido (solo letras), false si no
 */
function isValidName(name) {
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    return nameRegex.test(name);
}

/**
 * Valida que la contraseña tenga al menos 6 caracteres
 * @param {string} password - Contraseña a validar
 * @returns {boolean} true si es válida, false si no
 */
function isValidPassword(password) {
    return password && password.length >= 6;
}

/**
 * Genera un token JWT firmado para el usuario
 * @param {Object} user - Usuario de MongoDB
 * @returns {string} Token JWT firmado
 */
function generateToken(user) {
    return jwt.sign(
        { 
            id: user._id, 
            email: user.email, 
            rol: user.rol 
        },
        JWT_SECRET,
        { expiresIn: '7d' } // Token válido por 7 días
    );
}

/**
 * POST /auth/register
 * 
 * Registra un nuevo usuario en el sistema
 * 
 * IMPORTANTE: Todos los registros crean usuarios con rol 'user' (cliente).
 * El campo 'rol' se fuerza a 'user' ignorando cualquier valor del frontend.
 * Solo los admins pueden crear otros admins via /create-admin.
 * 
 * Body:
 * {
 *   nombre: string (min 3 caracteres, solo letras),
 *   email: string (formato email válido),
 *   password: string (min 6 caracteres)
 * }
 * 
 * Validaciones:
 * - Nombre: mínimo 3 caracteres, solo letras (no números)
 * - Email: formato válido, único en la BD
 * - Password: mínimo 6 caracteres
 * 
 * Respuestas:
 * - 201: Usuario creado exitosamente
 * - 400: Validación fallida o email duplicado
 * - 500: Error del servidor
 */
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        // Validación: nombre mínimo 3 caracteres
        if (!nombre || nombre.trim().length < 3) {
            return res.status(400).json({ 
                message: 'El nombre debe tener al menos 3 caracteres' 
            });
        }

        // Validación: nombre solo letras (no números ni símbolos)
        if (!isValidName(nombre.trim())) {
            return res.status(400).json({ 
                message: 'El nombre solo puede contener letras, no números ni símbolos' 
            });
        }

        // Validación: formato de email
        if (!email || !isValidEmail(email.trim())) {
            return res.status(400).json({ 
                message: 'Formato de correo electrónico inválido' 
            });
        }

        // Validación: contraseña mínimo 6 caracteres
        if (!isValidPassword(password)) {
            return res.status(400).json({ 
                message: 'La contraseña debe tener al menos 6 caracteres' 
            });
        }

        // Verificar si el email ya existe en la base de datos
        const existingUser = await Usuario.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                message: 'Este correo electrónico ya está registrado' 
            });
        }

        // Encriptar contraseña con bcrypt (10 salt rounds)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear nuevo usuario SIEMPRE como cliente (user)
        // SEGURIDAD: Ignoramos cualquier intento de enviar un rol desde el frontend
        const newUser = new Usuario({
            nombre: nombre.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            rol: 'user' // FORZAMOS que siempre sea 'user' (cliente)
        });

        // Guardar en MongoDB
        await newUser.save();

        // Respuesta exitosa (sin enviar la contraseña)
        return res.status(201).json({ 
            message: 'Usuario registrado exitosamente como cliente',
            user: {
                id: newUser._id,
                nombre: newUser.nombre,
                email: newUser.email,
                rol: newUser.rol
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        return res.status(500).json({ 
            message: 'Error al registrar usuario. Intenta nuevamente.' 
        });
    }
});

/**
 * POST /auth/login
 * 
 * Autentica un usuario y genera un token JWT
 * 
 * Body:
 * {
 *   email: string,
 *   password: string
 * }
 * 
 * Validaciones:
 * - Email: formato válido
 * - Password: no vacío
 * - Credenciales: deben coincidir con usuario en BD
 * 
 * Proceso:
 * 1. Validar formato de email
 * 2. Buscar usuario por email
 * 3. Comparar password con hash de bcrypt
 * 4. Generar token JWT
 * 5. Retornar token y datos del usuario
 * 
 * Respuestas:
 * - 200: Login exitoso (retorna token y user)
 * - 400: Formato de email inválido
 * - 401: Credenciales incorrectas
 * - 500: Error del servidor
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validación: formato de email
        if (!email || !isValidEmail(email.trim())) {
            return res.status(400).json({ 
                message: 'Formato de correo electrónico inválido' 
            });
        }

        // Validación: contraseña no vacía
        if (!password || password.trim().length === 0) {
            return res.status(400).json({ 
                message: 'La contraseña es obligatoria' 
            });
        }

        // Buscar usuario por email (case insensitive)
        const user = await Usuario.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            // No revelar si el email existe o no (seguridad)
            return res.status(401).json({ 
                message: 'Credenciales incorrectas' 
            });
        }

        // Verificar contraseña usando bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                message: 'Credenciales incorrectas' 
            });
        }

        // Generar token JWT con datos del usuario
        const token = generateToken(user);

        // Login exitoso - retornar token y datos del usuario
        return res.status(200).json({ 
            message: 'Login exitoso',
            token: token, // JWT para usar en peticiones futuras
            user: {
                id: user._id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol // 'user' o 'admin'
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ 
            message: 'Error al iniciar sesión. Intenta nuevamente.' 
        });
    }
});

/**
 * POST /auth/logout
 * 
 * Maneja el cierre de sesión del usuario
 * 
 * Nota: En una arquitectura JWT stateless, el logout se maneja principalmente
 * en el frontend eliminando el token de localStorage. Este endpoint es
 * opcional y puede usarse para logging o invalidación de tokens en BD.
 * 
 * Respuestas:
 * - 200: Logout exitoso
 */
router.post('/logout', (req, res) => {
    // En JWT stateless, el logout se maneja eliminando el token en el cliente
    // Aquí podríamos agregar lógica adicional como:
    // - Agregar el token a una lista negra en Redis
    // - Registrar la acción de logout en logs
    // - Limpiar sesiones relacionadas
    return res.status(200).json({ message: 'Logout exitoso' });
});

/**
 * Middleware de Autenticación
 * 
 * Importamos los middlewares que verifican:
 * - verifyToken: Valida que el JWT sea válido
 * - verifyAdmin: Valida que el usuario tenga rol 'admin'
 */
const { verifyToken, verifyAdmin } = require('../middleware/auth.middleware');

/**
 * POST /auth/create-admin
 * 
 * Crea un nuevo usuario con rol de administrador
 * 
 * PROTEGIDO: Solo administradores pueden crear otros administradores.
 * Requiere token JWT válido con rol 'admin'.
 * 
 * Middleware: verifyToken, verifyAdmin
 * 
 * Headers:
 * {
 *   Authorization: 'Bearer <token_jwt_admin>'
 * }
 * 
 * Body:
 * {
 *   nombre: string (min 3 caracteres, solo letras),
 *   email: string (formato email válido),
 *   password: string (min 6 caracteres)
 * }
 * 
 * Validaciones:
 * - Token JWT válido de un admin
 * - Nombre: mínimo 3 caracteres, solo letras
 * - Email: formato válido, único en la BD
 * - Password: mínimo 6 caracteres
 * 
 * Respuestas:
 * - 201: Administrador creado exitosamente
 * - 400: Validación fallida o email duplicado
 * - 401: Token inválido o no proporcionado
 * - 403: Usuario no es administrador
 * - 500: Error del servidor
 */
router.post('/create-admin', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        // Validaciones
        if (!nombre || nombre.trim().length < 3) {
            return res.status(400).json({ 
                message: 'El nombre debe tener al menos 3 caracteres' 
            });
        }

        if (!isValidName(nombre.trim())) {
            return res.status(400).json({ 
                message: 'El nombre solo puede contener letras' 
            });
        }

        if (!email || !isValidEmail(email.trim())) {
            return res.status(400).json({ 
                message: 'Formato de correo electrónico inválido' 
            });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({ 
                message: 'La contraseña debe tener al menos 6 caracteres' 
            });
        }

        // Verificar si el email ya existe
        const existingUser = await Usuario.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                message: 'Este correo electrónico ya está registrado' 
            });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear nuevo ADMIN
        const newAdmin = new Usuario({
            nombre: nombre.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            rol: 'admin' // Crear como administrador
        });

        await newAdmin.save();

        return res.status(201).json({ 
            message: 'Administrador creado exitosamente',
            user: {
                id: newAdmin._id,
                nombre: newAdmin.nombre,
                email: newAdmin.email,
                rol: newAdmin.rol
            }
        });

    } catch (error) {
        console.error('Error al crear admin:', error);
        return res.status(500).json({ 
            message: 'Error al crear administrador' 
        });
    }
});

module.exports = router;
