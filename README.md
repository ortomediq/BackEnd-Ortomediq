# Ortomediq Backend API

Backend completo para el sistema de gestión de inventario y ventas de productos ortopédicos Ortomediq.

## 📋 Características

- **Autenticación** basada en tokens almacenados en base de datos (sin JWT)
- **Control de acceso** por roles (Admin, Empleado, Usuario)
- **Gestión de productos** con variantes (tallas, colores) y stock disponible
- **Sistema de apartados** (reservas) con expiración automática de 48 horas
- **Ventas directas** con registro en bitácoras
- **Opiniones** de clientes con moderación (pendiente/aceptada/denegada)
- **Sistema de chat** entre usuarios y personal
- **Bitácoras de stock** para rastrear movimientos
- **Asistencias** de empleados con entrada/salida
- **Estadísticas** y reportes de ventas
- **🔒 Soft Delete** - No se eliminan registros físicamente, solo se inhabilitan

## 🚀 Instalación

### Requisitos previos

- Node.js 16+ 
- MySQL 8.0+
- npm o yarn

### Pasos de instalación

1. **Clonar el repositorio**
```bash
cd ortomediq-backend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Copiar `.env.example` a `.env` y configurar:

```env
PORT=3000
NODE_ENV=development

# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=Ortomediq

# Sesiones (horas)
SESSION_EXPIRY_HOURS=24

# Apartados (horas)
APARTADO_EXPIRY_HOURS=48

# Archivos
UPLOAD_DIR=./uploads
```

4. **Crear la base de datos**
```bash
mysql -u root -p -e "CREATE DATABASE Ortomediq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

5. **Ejecutar migraciones**
```bash
npm run migrate
```

6. **Ejecutar seeds (datos de ejemplo)**
```bash
npm run seed
```

## 🏃 Ejecución

### Modo desarrollo (con nodemon)
```bash
npm run dev
```

### Modo producción
```bash
npm start
```

### Ejecutar job de expiración de apartados manualmente
```bash
npm run cron
```

El servidor estará disponible en: `http://localhost:3000`

La documentación API estará en: `http://localhost:3000/api-docs`

## 📚 Documentación API

La API está documentada con Swagger/OpenAPI. Accede a:
```
http://localhost:3000/api-docs
```

### Credenciales de prueba (después de ejecutar seeds):

- **Admin**: `admin@ortomediq.com` / `password123`
- **Empleado**: `empleado@ortomediq.com` / `password123`
- **Usuario**: `carlos@example.com` / `password123`

## 🔐 Autenticación

La API utiliza **tokens de sesión almacenados en base de datos**.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "correo": "admin@ortomediq.com",
  "contrasena": "password123"
}
```

**Respuesta:**
```json
{
  "message": "Login exitoso",
  "token": "a1b2c3d4e5f6...",
  "expiresAt": "2025-11-30T10:00:00.000Z",
  "user": {
    "id": 1,
    "nombre": "Admin Principal",
    "correo": "admin@ortomediq.com",
    "rol": "admin"
  }
}
```

### Uso del token

Incluir en el header `Authorization` de cada petición protegida:
```
Authorization: Bearer a1b2c3d4e5f6...
```

## 📊 Endpoints principales

### Autenticación (`/api/auth`)
- `POST /login` - Iniciar sesión
- `POST /logout` - Cerrar sesión
- `POST /register` - Registrar nuevo usuario
- `GET /me` - Obtener usuario autenticado
- `POST /refresh` - Renovar token

### Usuarios (`/api/usuarios`) - Admin
- `GET /` - Listar usuarios
- `POST /` - Crear usuario
- `PUT /:id` - Actualizar usuario
- `PATCH /:id/toggle-status` - Activar/desactivar
- `DELETE /:id` - Eliminar usuario

### Productos (`/api/productos`)
- `GET /` - Listar productos (público con disponibilidad)
- `GET /:id` - Obtener producto con variantes
- `POST /` - Crear producto (Admin/Empleado)
- `PUT /:id` - Actualizar producto
- `POST /:id/ajustar-stock` - Ajustar stock

### Variantes (`/api/variantes`)
- `GET /` - Listar variantes de un producto
- `POST /` - Crear variante
- `POST /:id/ajustar-stock` - Ajustar stock de variante

### Apartados (`/api/apartados`)
- `POST /` - Crear apartado (Usuario/Empleado)
- `GET /` - Listar apartados (Usuario ve los suyos)
- `GET /:id` - Obtener detalles de apartado
- `POST /:id/cancelar` - Cancelar apartado
- `POST /:id/convertir-venta` - Convertir a venta (Empleado/Admin)

### Ventas (`/api/ventas`) - Admin/Empleado
- `POST /` - Registrar venta directa
- `GET /` - Listar ventas
- `GET /:id` - Obtener detalles de venta

### Opiniones (`/api/opiniones`)
- `POST /` - Crear opinión (Usuario sobre apartado completado)
- `GET /` - Listar opiniones aprobadas
- `GET /pendientes` - Listar pendientes (Admin)
- `PATCH /:id/aprobar` - Aprobar opinión (Admin)
- `DELETE /:id` - Rechazar opinión (Admin)

### Chats (`/api/chats`)
- `GET /mi-chat` - Obtener/crear chat del usuario
- `GET /` - Listar todos los chats (Empleado/Admin)
- `GET /:id/mensajes` - Obtener mensajes
- `POST /:id/mensajes` - Enviar mensaje
- `PATCH /:id/cerrar` - Cerrar chat (Empleado/Admin)

### Bitácoras (`/api/bitacoras`) - Admin/Empleado
- `GET /` - Listar movimientos de stock
- `POST /` - Registrar movimiento manual

### Asistencias (`/api/asistencias`) - Empleado/Admin
- `POST /entrada` - Registrar entrada
- `POST /salida` - Registrar salida
- `GET /` - Listar asistencias
- `GET /mi-estado` - Estado actual

### Estadísticas (`/api/estadisticas`) - Admin/Empleado
- `GET /ventas-periodo` - Estadísticas de ventas
- `GET /productos-bajo-stock` - Productos con stock bajo
- `GET /chats-abiertos` - Chats abiertos
- `GET /productos-mas-vendidos` - Más vendidos
- `GET /resumen-general` - Resumen general (Admin)

## 🔄 Sistema de Apartados (Reglas de negocio)

### Crear apartado
1. Valida stock disponible: `disponible = cantidad - cantidad_reservada`
2. Incrementa `cantidad_reservada` (NO toca `cantidad` aún)
3. Establece expiración en 48 horas
4. Crea `apartado` y `apartado_detalles`

### Expiración automática
- Job ejecutado cada 30 minutos (configurable en `src/index.js`)
- Marca apartados vencidos como `'vencido'`
- Decrementa `cantidad_reservada` para liberar stock

### Convertir apartado a venta
1. Verifica que el apartado esté `'activo'`
2. Crea registro en `ventas` y `ventas_detalle`
3. Decrementa `cantidad_reservada`
4. Decrementa `cantidad` (o `cantidad_general`)
5. Registra en `bitacoras_stock`
6. Marca apartado como `'completado'`

### Cancelar apartado
- Solo si está `'activo'`
- Decrementa `cantidad_reservada`
- Marca como `'cancelado'`

## 💬 Sistema de Opiniones

Las opiniones están ligadas a un apartado completado:

1. Usuario solo puede opinar sobre apartados con `estado = 'completado'`
2. El apartado debe pertenecer al usuario (`apartado.usuario_id == usuario.id`)
3. Las opiniones se crean con `aprobado = 0` (pendiente)
4. Admin puede aprobar/rechazar opiniones
5. Endpoint público muestra solo opiniones aprobadas

## 🧪 Tests

```bash
npm test
```

Los tests cubren:
- Crear apartado (éxito y fallo por stock)
- Expirar apartados
- Convertir apartado a venta
- Restricciones de opiniones

## 📁 Estructura del proyecto

```
ortomediq-backend/
├── migrations/
│   └── 001_create_tables.sql
├── scripts/
│   ├── migrate.js
│   └── seed.js
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── swagger.js
│   ├── jobs/
│   │   └── expireApartados.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── apartados.js
│   │   ├── asistencias.js
│   │   ├── auth.js
│   │   ├── bitacoras.js
│   │   ├── chats.js
│   │   ├── estadisticas.js
│   │   ├── marcas.js
│   │   ├── modelos.js
│   │   ├── opiniones.js
│   │   ├── productos.js
│   │   ├── proveedores.js
│   │   ├── tallas.js
│   │   ├── usuarios.js
│   │   ├── variantes.js
│   │   └── ventas.js
│   └── index.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🌐 Integración con Frontend React

### 1. Configurar cliente HTTP

```javascript
// api/client.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### 2. Login y manejo de sesión

```javascript
// services/authService.js
import apiClient from './client';

export const login = async (correo, contrasena) => {
  const response = await apiClient.post('/auth/login', { correo, contrasena });
  const { token, user } = response.data;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  return { token, user };
};

export const logout = async () => {
  await apiClient.post('/auth/logout');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
```

### 3. Mostrar disponibilidad de productos

```javascript
// El campo "disponible" ya viene calculado en la respuesta
const ProductList = () => {
  const [productos, setProductos] = useState([]);
  
  useEffect(() => {
    apiClient.get('/productos').then(res => {
      setProductos(res.data.productos);
    });
  }, []);
  
  return (
    <div>
      {productos.map(p => (
        <div key={p.id}>
          <h3>{p.nombre}</h3>
          <p>Precio: ${p.precio_defecto}</p>
          <p>Disponible: {p.disponible} unidades</p>
        </div>
      ))}
    </div>
  );
};
```

### 4. Crear apartado

```javascript
const crearApartado = async (items, nota) => {
  const response = await apiClient.post('/apartados', { items, nota });
  return response.data;
};

// items: [{ producto_id, variante_id?, cantidad }]
```

### 5. Convertir apartado a venta (empleado)

```javascript
const convertirApartadoAVenta = async (apartadoId, metodo_pago) => {
  const response = await apiClient.post(
    `/apartados/${apartadoId}/convertir-venta`,
    { metodo_pago }
  );
  return response.data;
};
```

## 🛡️ Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Tokens de sesión únicos almacenados en BD
- ✅ Rate limiting en endpoints sensibles (login, chat)
- ✅ Validación de inputs con express-validator
- ✅ Autorización por roles
- ✅ Headers de seguridad con Helmet
- ✅ CORS configurado

## 📝 Notas importantes

1. **No usar triggers**: Toda la lógica está en el backend
2. **Transacciones**: Operaciones críticas usan transacciones para consistencia
3. **Job de expiración**: Debe ejecutarse periódicamente (cron configurado en el servidor)
4. **Stock reservado**: La disponibilidad SIEMPRE considera `cantidad_reservada`
5. **Opiniones**: Solo sobre apartados completados del usuario

## 🤝 Contribución

Para contribuir al proyecto:
1. Crear una rama feature
2. Hacer commit de cambios
3. Push a la rama
4. Crear Pull Request

## 📄 Licencia

MIT
