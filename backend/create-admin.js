'use strict';

/**
 * Script de Creación de Administrador
 * 
 * Script Node.js para crear el primer usuario administrador en la base de datos.
 * Este script es independiente de la aplicación principal y se ejecuta una sola vez.
 * 
 * Uso:
 * node create-admin.js
 * 
 * Funcionalidad:
 * 1. Conecta a MongoDB
 * 2. Verifica que no exista ya un admin con ese email
 * 3. Encripta la contraseña con bcrypt
 * 4. Crea el usuario con rol 'admin'
 * 5. Cierra la conexión
 * 
 * Credenciales creadas:
 * - Email: admin@petshop.com
 * - Password: admin123 (CAMBIAR después del primer login)
 * 
 * SEGURIDAD: Este script solo debe ejecutarse en entornos de desarrollo/configuración.
 * En producción, las credenciales deben cambiarse inmediatamente.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Conectar a la base de datos MongoDB
 * 
 * Base de datos: tienda
 * Host: localhost:27017
 */
mongoose.connect('mongodb://localhost:27017/tienda')
    .then(() => {
        console.log('Conexión a MongoDB establecida');
        crearAdmin(); // Ejecutar función principal
    })
    .catch(err => {
        console.error('Error de conexión:', err);
        process.exit(1); // Salir con error
    });

/**
 * Definir el esquema de Usuario
 * 
 * Mismo esquema que en models/usuario.js
 * Se define aquí para independencia del script.
 */
const UsuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    rol: { type: String, default: 'user', enum: ['user', 'admin'] },
    createdAt: { type: Date, default: Date.now }
});

// Crear modelo
const Usuario = mongoose.model('Usuario', UsuarioSchema);

/**
 * Función principal para crear el administrador
 * 
 * Proceso:
 * 1. Define datos del admin
 * 2. Verifica que no exista duplicado
 * 3. Encripta contraseña
 * 4. Guarda en BD
 * 5. Muestra credenciales
 * 6. Cierra conexión
 */
async function crearAdmin() {
    try {
        // Datos del administrador a crear
        const adminData = {
            nombre: 'Administrador',
            email: 'admin@petshop.com',
            password: 'admin123', // Contraseña temporal - CAMBIAR después del primer login
            rol: 'admin'
        };

        // Verificar si ya existe un admin con ese email
        const existingAdmin = await Usuario.findOne({ email: adminData.email });
        
        if (existingAdmin) {
            console.log('Ya existe un administrador con el email:', adminData.email);
            console.log('Usuario existente:');
            console.log('  - Nombre:', existingAdmin.nombre);
            console.log('  - Email:', existingAdmin.email);
            console.log('  - Rol:', existingAdmin.rol);
            mongoose.connection.close();
            return;
        }

        // Encriptar contraseña con bcrypt (10 salt rounds)
        const hashedPassword = await bcrypt.hash(adminData.password, 10);

        // Crear objeto de administrador
        const admin = new Usuario({
            nombre: adminData.nombre,
            email: adminData.email,
            password: hashedPassword, // Contraseña encriptada, nunca en texto plano
            rol: 'admin'
        });

        // Guardar en la base de datos
        await admin.save();

        // Mostrar credenciales creadas (solo para desarrollo)
        console.log('\nAdministrador creado exitosamente!\n');
        console.log('═══════════════════════════════════════');
        console.log('CREDENCIALES DE ADMINISTRADOR:');
        console.log('═══════════════════════════════════════');
        console.log('  Email:    ', adminData.email);
        console.log('  Password: ', adminData.password);
        console.log('  Rol:      ', 'admin');
        console.log('═══════════════════════════════════════');
        console.log('\nIMPORTANTE: Cambia la contraseña después del primer login\n');

        // Cerrar conexión a MongoDB
        mongoose.connection.close();
        process.exit(0); // Salir exitosamente

    } catch (error) {
        console.error('Error al crear administrador:', error);
        mongoose.connection.close();
        process.exit(1); // Salir con error
    }
}
