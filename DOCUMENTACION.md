# DOCUMENTACIÓN DEL PROYECTO PETSHOP

## ÍNDICE
1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Servicios Frontend](#servicios-frontend)
4. [Guards y Validadores](#guards-y-validadores)
5. [Backend API](#backend-api)
6. [Modelos de Datos](#modelos-de-datos)
7. [Sistema de Autenticación](#sistema-de-autenticación)
8. [Integración PayPal](#integración-paypal)
9. [Flujos Principales](#flujos-principales)
10. [Configuración y Deployment](#configuración-y-deployment)

---

## DESCRIPCIÓN GENERAL

**Petshop** es una aplicación web de e-commerce para productos de mascotas que incluye:

- **Frontend**: Angular 18 (standalone components)
- **Backend**: Node.js + Express
- **Base de Datos**: MongoDB
- **Pagos**: PayPal SDK (modo sandbox)
- **Autenticación**: JWT (JSON Web Tokens)

### Funcionalidades Principales

- Catálogo de productos (alimentos y accesorios)  
- Carrito de compras con localStorage  
- Pagos con PayPal (solo cuenta, sin tarjetas)  
- Sistema de autenticación (login/register)  
- Roles de usuario (admin/cliente)  
- Panel administrativo protegido  
- Validaciones frontend y backend  
- Gestión CRUD de productos  

---

## ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────┐
│          ANGULAR FRONTEND               │
│  ┌─────────────────────────────────┐   │
│  │  Components (UI)                │   │
│  │  - Home, Login, Cart, etc.      │   │
│  └──────────────┬──────────────────┘   │
│                 │                        │
│  ┌──────────────▼──────────────────┐   │
│  │  Services (Business Logic)      │   │
│  │  - AuthService                  │   │
│  │  - AlimentoService              │   │
│  │  - CartService                  │   │
│  │  - PaypalService                │   │
│  └──────────────┬──────────────────┘   │
│                 │                        │
│  ┌──────────────▼──────────────────┐   │
│  │  Guards & Validators            │   │
│  │  - authGuard, adminGuard        │   │
│  │  - CustomValidators             │   │
│  └──────────────┬──────────────────┘   │
│                 │                        │
│  ┌──────────────▼──────────────────┐   │
│  │  HTTP Interceptor               │   │
│  │  - Auto-inject JWT token        │   │
│  └──────────────┬──────────────────┘   │
└─────────────────┼───────────────────────┘
                  │ HTTP Requests
                  │ (JSON)
┌─────────────────▼───────────────────────┐
│       NODE.JS/EXPRESS BACKEND           │
│  ┌─────────────────────────────────┐   │
│  │  Routers (Endpoints)            │   │
│  │  - /auth (login, register)      │   │
│  │  - /productos, /accesorios      │   │
│  │  - /cart (add, update, remove)  │   │
│  │  - /api/paypal (payments)       │   │
│  └──────────────┬──────────────────┘   │
│                 │                        │
│  ┌──────────────▼──────────────────┐   │
│  │  Middleware                     │   │
│  │  - verifyToken (JWT)            │   │
│  │  - verifyAdmin (Role check)     │   │
│  └──────────────┬──────────────────┘   │
│                 │                        │
│  ┌──────────────▼──────────────────┐   │
│  │  Models (Mongoose)              │   │
│  │  - Usuario                      │   │
│  │  - Alimento (Producto)          │   │
│  │  - Accesorio                    │   │
│  └──────────────┬──────────────────┘   │
└─────────────────┼───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         MONGODB DATABASE                │
│  Collections:                           │
│  - usuarios (users with roles)          │
│  - productos (pet food items)           │
│  - accesorios (accessories)             │
└─────────────────────────────────────────┘
```

---

## SERVICIOS FRONTEND

### 1. AuthService (`auth.service.ts`)
**Propósito**: Gestión de autenticación y autorización

**Métodos principales**:
- `login(email, password)` - Iniciar sesión
- `register(nombre, email, password)` - Registrar usuario
- `logout()` - Cerrar sesión
- `isLoggedIn()` - Verificar si hay sesión activa
- `isAdmin()` - Verificar si es administrador
- `getToken()` - Obtener JWT del localStorage

**Estado reactivo**:
- `currentUser: Observable<User | null>` - Observable del usuario actual

**Almacenamiento**:
- localStorage: `user` (datos del usuario), `token` (JWT)

---

### 2. AlimentoService (`alimento.service.ts`)
**Propósito**: Gestión CRUD de productos alimenticios

**Endpoints**:
- `GET /productos` - Listar todos
- `POST /guardar-productos` - Crear nuevo
- `GET /producto/:id` - Obtener uno
- `PUT /producto/:id` - Actualizar
- `DELETE /producto/:id` - Eliminar

---

### 3. AccesoriosService (`accesorios.service.ts`)
**Propósito**: Gestión CRUD de accesorios

**Endpoints**:
- `GET /accesorios` - Listar todos
- `POST /guardar-accesorios` - Crear nuevo
- `GET /accesorio/:id` - Obtener uno
- `PUT /accesorio/:id` - Actualizar
- `DELETE /accesorio/:id` - Eliminar

---

### 4. CartService (`cart.service.ts`)
**Propósito**: Gestión del carrito de compras

**Características**:
- Almacenamiento en **localStorage** (persiste entre sesiones)
- Sincronización con backend para validación
- BehaviorSubject para actualizaciones reactivas
- Notificaciones al agregar items

**Métodos**:
- `addToCart(itemId, kind, qty)` - Agregar producto/accesorio
- `getCart()` - Obtener carrito actual
- `updateItem(itemId, kind, qty)` - Actualizar cantidad
- `removeItem(itemId, kind)` - Eliminar item

**Estructura del carrito**:
```json
{
  "items": [
    {
      "itemId": "64abc123...",
      "kind": "producto",
      "nombre": "Alimento Premium",
      "precio": 299.99,
      "qty": 2,
      "image": "imagen.avif"
    }
  ]
}
```

---

### 5. PaypalService (`paypal.service.ts`)
**Propósito**: Integración con PayPal para pagos

**Métodos**:
- `createOrder(items, total, currency)` - Crear orden en PayPal
- `captureOrder(orderID)` - Capturar pago aprobado

**Flujo de pago**:
1. Frontend llama `createOrder()` con items del carrito
2. Backend crea orden en PayPal y retorna `orderID`
3. Usuario aprueba pago en ventana de PayPal
4. Frontend llama `captureOrder(orderID)` para finalizar
5. Backend captura el pago y retorna confirmación

---

### 6. PaypalLoaderService (`paypal-loader.service.ts`)
**Propósito**: Carga dinámica del SDK de PayPal

**Características**:
- Lazy loading (solo carga cuando se necesita)
- Configuración desde backend (client-id)
- Fallback a sandbox si falla
- Configuración: `disable-funding=card,credit` (solo cuenta PayPal)

**Uso**:
```typescript
await this.paypalLoaderService.loadSdk();
// Ahora window.paypal está disponible
```

---

### 7. NotificationService (`notification.service.ts`)
**Propósito**: Sistema de notificaciones tipo toast

**Tipos**:
- `success` - Operación exitosa (verde)
- `error` - Error (rojo)
- `info` - Información (azul)

**Uso**:
```typescript
// Emitir notificación
this.notificationService.notify('Producto agregado', 'success');

// Suscribirse (en AppComponent)
this.notificationService.getObservable().subscribe(notif => {
  // Mostrar toast con notif.message y notif.type
});
```

---

### 8. CargarService (`cargar.service.ts`)
**Propósito**: Subida de archivos (imágenes) al servidor

**Método**:
- `peticionRequest(url, params, files, name)` - Upload con XMLHttpRequest

**Uso**:
```typescript
this.cargarService.peticionRequest(
  'http://localhost:3600/subir-imagen',
  [],
  [fileInput.files[0]],
  'image'
).then(res => {
  console.log('Imagen subida:', res.image);
});
```

---

## GUARDS Y VALIDADORES

### Guards

#### 1. authGuard (`auth.guard.ts`)
**Propósito**: Proteger rutas que requieren autenticación

**Comportamiento**:
- Si está logueado → Permitir acceso
- Si no está logueado → Redirigir a `/login?returnUrl=<ruta>`

**Uso en routes**:
```typescript
{
  path: 'productos',
  component: ProductosComponent,
  canActivate: [authGuard]
}
```

---

#### 2. adminGuard (`admin.guard.ts`)
**Propósito**: Proteger rutas solo para administradores

**Comportamiento**:
- Si es admin → Permitir acceso
- Si no es admin → Redirigir a `/home`
- Si no está logueado → Redirigir a `/login`

**Uso en routes**:
```typescript
{
  path: 'admin',
  component: AdminComponent,
  canActivate: [adminGuard]
}
```

---

### Validadores Personalizados

#### CustomValidators (`custom-validators.ts`)

**1. onlyLetters()**
- Acepta: Letras (a-z, A-Z), acentos, ñ, ü, espacios
- Rechaza: Números, símbolos, caracteres especiales
- Uso: Campos de nombre, apellido

**2. emailFormat()**
- Valida formato: `usuario@dominio.com`
- Acepta TLDs de 2-6 letras (.com, .edu.mx, etc.)

**3. noNumbers()**
- Rechaza cualquier dígito (0-9)

**4. passwordsMatch(password1, password2)**
- Valida que dos contraseñas coincidan
- Se aplica a nivel FormGroup

**Uso en formularios**:
```typescript
this.form = this.fb.group({
  nombre: ['', [Validators.required, CustomValidators.onlyLetters()]],
  email: ['', [Validators.required, CustomValidators.emailFormat()]],
  password: ['', [Validators.required, Validators.minLength(6)]],
  confirmPassword: ['', Validators.required]
}, {
  validators: CustomValidators.passwordsMatch('password', 'confirmPassword')
});
```

---

### HTTP Interceptor

#### authInterceptor (`auth.interceptor.ts`)
**Propósito**: Inyectar automáticamente el JWT en todas las peticiones HTTP

**Funcionamiento**:
1. Intercepta toda petición saliente
2. Obtiene token de localStorage
3. Si existe token, agrega header: `Authorization: Bearer <token>`
4. Continúa con la petición

**Configuración** (en `app.config.ts`):
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
};
```

---

## BACKEND API

### Rutas de Autenticación (`/auth`)

#### POST /auth/register
**Body**:
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123"
}
```

**Validaciones**:
- Nombre: min 3 caracteres, solo letras
- Email: formato válido, único
- Password: min 6 caracteres

**Response 201**:
```json
{
  "message": "Usuario registrado exitosamente como cliente",
  "user": {
    "id": "64abc...",
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "rol": "user"
  }
}
```

**IMPORTANTE**: Siempre crea usuarios con rol `'user'` (cliente). Para crear admins usar `/auth/create-admin`.

---

#### POST /auth/login
**Body**:
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

**Response 200**:
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64abc...",
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "rol": "user"
  }
}
```

**Errores**:
- 400: Formato de email inválido
- 401: Credenciales incorrectas

---

#### POST /auth/create-admin
**Headers**:
```
Authorization: Bearer <token_admin>
```

**Body**:
```json
{
  "nombre": "Admin Nuevo",
  "email": "nuevo.admin@petshop.com",
  "password": "admin123"
}
```

**Middleware**: `verifyToken`, `verifyAdmin`

**Response 201**: Usuario creado con rol `'admin'`

**Errores**:
- 401: Token inválido
- 403: Usuario no es admin
- 400: Validación fallida

---

### Middleware de Autenticación

#### verifyToken
**Propósito**: Validar JWT en rutas protegidas

**Header esperado**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Proceso**:
1. Extraer token del header
2. Verificar con jwt.verify()
3. Decodificar payload: `{ id, email, rol }`
4. Agregar `req.user` con datos decodificados
5. Llamar `next()`

**Errores**:
- 401: Token no proporcionado o inválido/expirado

---

#### verifyAdmin
**Propósito**: Validar rol de administrador

**Requisito**: Debe usarse DESPUÉS de `verifyToken`

**Proceso**:
1. Verificar que `req.user` exista
2. Verificar que `req.user.rol === 'admin'`
3. Llamar `next()`

**Errores**:
- 401: No autenticado
- 403: No es administrador

**Uso en rutas**:
```javascript
router.post('/ruta-admin', verifyToken, verifyAdmin, (req, res) => {
  // Solo admins pueden acceder aquí
});
```

---

## MODELOS DE DATOS

### Usuario (`usuario.js`)
```javascript
{
  nombre: String,      // Nombre completo
  email: String,       // Único, lowercase
  password: String,    // Hash bcrypt
  rol: String,         // 'user' o 'admin'
  createdAt: Date      // Fecha de creación
}
```

**Colección MongoDB**: `usuarios`

---

### Producto/Alimento (`productos.js`)
```javascript
{
  nombre: String,
  descripcion: String,
  precio: Number,
  stock: Number,
  image: String,       // Nombre del archivo
  categoria: String,
  createdAt: Date
}
```

**Colección MongoDB**: `productos`

---

### Accesorio (`accesorios.js`)
```javascript
{
  nombre: String,
  descripcion: String,
  precio: Number,
  stock: Number,
  image: String,
  categoria: String,
  createdAt: Date
}
```

**Colección MongoDB**: `accesorios`

---

## SISTEMA DE AUTENTICACIÓN

### Flujo Completo

```
1. REGISTRO
   Usuario ingresa datos → Frontend valida (CustomValidators)
   → POST /auth/register → Backend valida
   → Hashea password con bcrypt → Guarda en BD
   → Retorna confirmación (sin token)

2. LOGIN
   Usuario ingresa email/password → POST /auth/login
   → Backend busca usuario → Compara password con bcrypt
   → Genera JWT firmado (expires: 7d)
   → Retorna token + user data
   → Frontend guarda en localStorage
   → AuthService actualiza BehaviorSubject
   
3. PETICIONES AUTENTICADAS
   Frontend hace petición HTTP
   → authInterceptor agrega header Authorization
   → Backend recibe petición
   → verifyToken middleware valida JWT
   → Decodifica y agrega req.user
   → Ruta procesa petición

4. VERIFICACIÓN DE ROL
   Usuario intenta acceder a ruta admin
   → adminGuard verifica isAdmin()
   → Si no es admin → Redirige a /home
   → Si es admin → Permite acceso
   
   En backend:
   → verifyToken valida JWT
   → verifyAdmin verifica rol
   → Si no es admin → 403 Forbidden
   → Si es admin → Procesa petición

5. LOGOUT
   Usuario hace click en logout
   → AuthService.logout() elimina token y user de localStorage
   → Actualiza BehaviorSubject a null
   → Redirige a /login
   → Guards bloquean rutas protegidas
```

---

### JWT (JSON Web Token)

**Payload**:
```json
{
  "id": "64abc123...",
  "email": "usuario@example.com",
  "rol": "user",
  "iat": 1701234567,
  "exp": 1701839367
}
```

**Secret**: `mi_clave_secreta_super_segura_2024` (cambiar en producción)

**Expiración**: 7 días

**Algoritmo**: HS256 (HMAC SHA256)

---

## INTEGRACIÓN PAYPAL

### Configuración SDK

**URL del SDK**:
```
https://www.paypal.com/sdk/js?client-id=<CLIENT_ID>&currency=USD&intent=capture&disable-funding=card,credit&components=buttons
```

**Parámetros importantes**:
- `client-id`: Credenciales de la app PayPal
- `currency=USD`: Moneda de transacciones
- `intent=capture`: Captura inmediata del pago
- `disable-funding=card,credit`: **Solo permite cuenta PayPal** (no tarjetas)
- `components=buttons`: Solo carga botones (más rápido)

---

### Flujo de Pago

```
1. CARGA DEL SDK
   Componente llama paypalLoaderService.loadSdk()
   → Obtiene client-id del backend
   → Inyecta script de PayPal en DOM
   → Espera carga completa

2. RENDERIZADO DE BOTONES
   await loadSdk() completa
   → window.paypal.Buttons({ ... }).render('#paypal-button-container')
   → Botones aparecen en UI

3. CREACIÓN DE ORDEN
   Usuario hace click en botón PayPal
   → createOrder() en botones
   → Frontend llama paypalService.createOrder(items, total)
   → Backend valida items y calcula total
   → Backend llama PayPal API para crear orden
   → Retorna orderID
   → PayPal abre ventana de pago

4. APROBACIÓN
   Usuario aprueba pago en PayPal
   → onApprove() se ejecuta con orderID
   → Frontend llama paypalService.captureOrder(orderID)
   → Backend captura el pago en PayPal
   → Retorna detalles de transacción
   → Frontend muestra confirmación
   → Limpia carrito

5. ERRORES
   Si hay error → onError() se ejecuta
   → Muestra mensaje de error al usuario
```

---

### Ejemplo de Configuración de Botones

```typescript
async renderButtons() {
  await this.paypalLoaderService.loadSdk();
  
  const paypal = (window as any).paypal;
  
  paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'gold',
      shape: 'rect',
      label: 'paypal'
    },
    
    createOrder: (data: any, actions: any) => {
      return this.paypalService.createOrder(
        this.cartItems,
        this.total,
        'USD'
      ).toPromise().then(order => order.orderID);
    },
    
    onApprove: (data: any, actions: any) => {
      return this.paypalService.captureOrder(data.orderID)
        .toPromise().then(details => {
          alert('Pago exitoso!');
          this.clearCart();
        });
    },
    
    onError: (err: any) => {
      console.error('Error PayPal:', err);
      alert('Error al procesar pago');
    }
  }).render('#paypal-button-container');
}
```

---

## FLUJOS PRINCIPALES

### Flujo de Compra Completo

```
1. NAVEGACIÓN
   Usuario visita /home → Ve productos destacados
   → Click en "Ver Productos" → /productos
   → Lista de productos cargada desde backend

2. AGREGAR AL CARRITO
   Usuario hace click en "Agregar al Carrito"
   → cartService.addToCart(itemId, 'producto', 1)
   → POST /cart/add (backend valida producto existe)
   → Response con datos del item
   → Guarda en localStorage
   → Actualiza BehaviorSubject
   → NotificationService muestra toast "Agregado al carrito"

3. VER CARRITO
   Usuario hace click en icono carrito → /cart
   → Suscribe a cart$ observable
   → Muestra items con precio, cantidad, subtotal
   → Botones: +/- cantidad, eliminar
   → Muestra total general

4. MODIFICAR CARRITO
   Usuario cambia cantidad
   → cartService.updateItem(itemId, kind, newQty)
   → Actualiza localStorage
   → PUT /cart/update (sincroniza backend)
   → Re-calcula total
   
   Usuario elimina item
   → cartService.removeItem(itemId, kind)
   → Remueve de localStorage
   → DELETE /cart/remove/:id/:kind
   → Re-calcula total

5. CHECKOUT
   Usuario hace click "Proceder al Pago"
   → Verifica si está logueado
   → Si no → Redirige a /login?returnUrl=/cart
   → Si sí → Navega a /checkout
   
6. PAGO CON PAYPAL
   En /checkout:
   → Carga SDK de PayPal
   → Renderiza botones
   → Usuario hace click en PayPal
   → Ventana PayPal se abre
   → Usuario se loguea en PayPal
   → Aprueba pago
   → captureOrder() procesa pago
   → Muestra confirmación
   → Limpia carrito
   → Redirige a /home

7. CONFIRMACIÓN
   Muestra mensaje "¡Compra exitosa!"
   → Email de confirmación (si implementado)
   → Usuario puede ver orden (si implementado)
```

---

### Flujo de Administración

```
1. LOGIN ADMIN
   Admin ingresa credenciales en /login
   → AuthService.login()
   → Backend valida y retorna token
   → Frontend detecta rol: 'admin'
   → Redirige a /admin (no a /home)

2. PANEL ADMIN
   Admin navega a /admin
   → adminGuard verifica rol
   → Si no es admin → Redirige a /home
   → Si es admin → Muestra panel

3. GESTIÓN DE PRODUCTOS
   Ver productos:
   → GET /productos (lista completa)
   → Muestra tabla con editar/eliminar
   
   Crear producto:
   → Click "Nuevo Producto"
   → Formulario con validaciones
   → Selecciona imagen
   → cargarService.peticionRequest() sube imagen
   → alimentoService.guardarAlimento() crea producto
   → Actualiza lista
   
   Editar producto:
   → Click "Editar"
   → GET /producto/:id (obtiene datos)
   → Formulario pre-llenado
   → Usuario modifica campos
   → Puede cambiar imagen
   → alimentoService.updateAlimento()
   → PUT /producto/:id
   → Actualiza lista
   
   Eliminar producto:
   → Click "Eliminar"
   → Confirmación
   → alimentoService.deleteAlimento()
   → DELETE /producto/:id
   → Remueve de lista

4. GESTIÓN DE ACCESORIOS
   Mismo flujo que productos, usando:
   → accesoriosService
   → Rutas /accesorios, /accesorio/:id

5. CREAR OTRO ADMIN
   Admin existente navega a ruta especial
   → Formulario de crear admin
   → POST /auth/create-admin
   → Headers: Authorization: Bearer <token_admin>
   → verifyToken + verifyAdmin validan
   → Crea nuevo admin en BD
```

---

## CONFIGURACIÓN Y DEPLOYMENT

### Variables de Entorno Recomendadas

**Backend** (`.env`):
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/tienda

# JWT
JWT_SECRET=tu_clave_secreta_super_segura_cambiar_en_produccion

# PayPal
PAYPAL_CLIENT_ID=tu_client_id_de_paypal
PAYPAL_CLIENT_SECRET=tu_client_secret_de_paypal
PAYPAL_MODE=sandbox  # o 'live' para producción

# Servidor
PORT=3600
NODE_ENV=development
```

**Frontend** (`src/app/services/global.ts`):
```typescript
export const Global = {
  url: 'http://localhost:3600/'
};
```

---

### Comandos de Ejecución

**Backend**:
```bash
cd backend
npm install
npm start  # Puerto 3600
```

**Frontend**:
```bash
cd proyecto
npm install
ng serve  # Puerto 4200
```

**Crear Admin**:
```bash
cd backend
node create-admin.js
# Credenciales: admin@petshop.com / admin123
```

---

### Checklist Pre-Producción

- Cambiar JWT_SECRET a valor seguro y aleatorio  
- Cambiar contraseña del admin por defecto  
- Configurar PayPal en modo 'live' con credenciales reales  
- Configurar CORS correctamente en backend  
- Usar HTTPS (certificado SSL)  
- Configurar rate limiting en backend  
- Habilitar logs de errores y monitoreo  
- Configurar backups de MongoDB  
- Validar todas las rutas estén protegidas correctamente  
- Sanitizar inputs para prevenir inyección SQL/NoSQL  
- Implementar refresh tokens para JWT  

---

### Estructura de Archivos Clave

```
backend/
├── app.js                    # Configuración Express
├── index.js                  # Entry point
├── package.json              # Dependencias
├── create-admin.js           # Script crear admin
├── middleware/
│   └── auth.middleware.js    # verifyToken, verifyAdmin
├── models/
│   ├── usuario.js            # Schema Usuario
│   ├── productos.js          # Schema Producto
│   └── accesorios.js         # Schema Accesorio
└── routers/
    ├── auth.js               # /auth (login, register)
    ├── tienda.js             # /productos, /accesorios
    └── paypal.js             # /api/paypal

proyecto/src/app/
├── guards/
│   ├── auth.guard.ts         # Guard autenticación
│   └── admin.guard.ts        # Guard admin
├── interceptors/
│   └── auth.interceptor.ts   # Inyectar JWT
├── services/
│   ├── auth.service.ts       # Autenticación
│   ├── alimento.service.ts   # CRUD productos
│   ├── accesorios.service.ts # CRUD accesorios
│   ├── cart.service.ts       # Carrito
│   ├── paypal.service.ts     # Pagos
│   ├── paypal-loader.service.ts # SDK PayPal
│   ├── notification.service.ts  # Notificaciones
│   ├── cargar.service.ts     # Subida archivos
│   └── global.ts             # URL backend
├── validators/
│   └── custom-validators.ts  # Validadores custom
└── components/
    ├── login/
    ├── register/
    ├── cart/
    ├── checkout/
    └── admin/
```

---

## RESUMEN DE ENDPOINTS

### Autenticación
- `POST /auth/register` - Registrar usuario (rol: user)
- `POST /auth/login` - Login (retorna JWT)
- `POST /auth/logout` - Logout
- `POST /auth/create-admin` [PROTEGIDO] - Crear admin (protegido)

### Productos
- `GET /productos` - Listar todos
- `POST /guardar-productos` - Crear nuevo
- `GET /producto/:id` - Obtener uno
- `PUT /producto/:id` - Actualizar
- `DELETE /producto/:id` - Eliminar

### Accesorios
- `GET /accesorios` - Listar todos
- `POST /guardar-accesorios` - Crear nuevo
- `GET /accesorio/:id` - Obtener uno
- `PUT /accesorio/:id` - Actualizar
- `DELETE /accesorio/:id` - Eliminar

### Carrito
- `POST /cart/add` - Agregar item
- `PUT /cart/update` - Actualizar cantidad
- `DELETE /cart/remove/:id/:kind` - Eliminar item

### PayPal
- `GET /api/paypal/config` - Obtener client-id
- `POST /api/paypal/create-order` - Crear orden
- `POST /api/paypal/capture-order` - Capturar pago

[PROTEGIDO] = Requiere autenticación (JWT)

---

## CREDENCIALES POR DEFECTO

**Administrador**:
- Email: `admin@petshop.com`
- Password: `admin123`
- Rol: `admin`

**IMPORTANTE**: Cambiar contraseña después del primer login.

---

## SOPORTE

Para preguntas o issues, contactar al equipo de desarrollo.

---

**Última actualización**: Diciembre 2024  
**Versión**: 1.0.0  
**Autor**: Rodrigo
