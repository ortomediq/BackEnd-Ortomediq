# 📘 GUÍA COMPLETA DE ENDPOINTS - ORTOMEDIQ BACKEND

## 🔐 Autenticación

Todos los endpoints protegidos requieren un header:
```
Authorization: Bearer <tu_token>
```

**Roles disponibles:**
- `admin` - Acceso completo
- `empleado` - Gestión de productos, ventas, apartados
- `usuario` - Cliente que puede hacer apartados y ver productos

---

## 🚀 ENDPOINTS DETALLADOS

### 1. AUTENTICACIÓN (`/api/auth`)

#### 1.1 Login
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json
```
**Body:**
```json
{
  "correo": "admin@ortomediq.com",
  "contrasena": "password123"
}
```
**Respuesta exitosa:**
```json
{
  "message": "Login exitoso",
  "token": "a1b2c3d4e5f6...",
  "expiresAt": "2025-12-01T10:30:00.000Z",
  "user": {
    "id": 1,
    "nombre": "Admin Principal",
    "correo": "admin@ortomediq.com",
    "rol": "admin"
  }
}
```

#### 1.2 Logout
```
POST http://localhost:3000/api/auth/logout
Authorization: Bearer <token>
```
**Respuesta:**
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

#### 1.3 Obtener info del usuario autenticado
```
GET http://localhost:3000/api/auth/me
Authorization: Bearer <token>
```

#### 1.4 Renovar token
```
POST http://localhost:3000/api/auth/refresh
Authorization: Bearer <token>
```

---

### 2. USUARIOS (`/api/usuarios`) - Solo Admin

#### 2.1 Listar usuarios
```
GET http://localhost:3000/api/usuarios
Authorization: Bearer <token_admin>
```

#### 2.2 Obtener usuario por ID
```
GET http://localhost:3000/api/usuarios/1
Authorization: Bearer <token_admin>
```

#### 2.3 Crear usuario
```
POST http://localhost:3000/api/usuarios
Authorization: Bearer <token_admin>
Content-Type: application/json
```
**Body:**
```json
{
  "nombre": "Laura Pérez",
  "correo": "laura@example.com",
  "contrasena": "miPassword123",
  "rol": "usuario"
}
```
**Roles válidos:** `admin`, `empleado`, `usuario`

#### 2.4 Actualizar usuario
```
PUT http://localhost:3000/api/usuarios/5
Authorization: Bearer <token_admin>
Content-Type: application/json
```
**Body:**
```json
{
  "nombre": "Laura Pérez Actualizado",
  "rol": "empleado",
  "contrasena": "nuevoPassword456"
}
```

#### 2.5 Activar/Desactivar usuario
```
PATCH http://localhost:3000/api/usuarios/5/toggle-status
Authorization: Bearer <token_admin>
```
**Nota:** Este endpoint reemplaza la eliminación. Los usuarios solo se desactivan, nunca se borran.

---

### 3. PRODUCTOS (`/api/productos`)

#### 3.1 Listar productos (público)
```
GET http://localhost:3000/api/productos
```
**Query params opcionales:**
- `?estado=habilitado` - Filtrar por estado
- `?proveedor_id=1` - Filtrar por proveedor
- `?marca_id=3` - Filtrar por marca

#### 3.2 Obtener producto por ID con variantes
```
GET http://localhost:3000/api/productos/1
```

#### 3.3 Crear producto (Admin/Empleado)
```
POST http://localhost:3000/api/productos
Authorization: Bearer <token>
Content-Type: application/json
```

**Body para producto SIN VARIANTES:**
```json
{
  "nombre": "Bastón Ortopédico Premium",
  "descripcion": "Bastón de aluminio ajustable con soporte ergonómico",
  "marca_id": 1,
  "modelo_id": 12,
  "es_tallable": 0,
  "precio_defecto": 850.00,
  "cantidad_general": 15,
  "proveedor_id": 1,
  "codigo_barras_general": "7501234567899",
  "estado": "habilitado"
}
```

**Body para producto CON VARIANTES (tallable):**
```json
{
  "nombre": "Rodillera Deportiva Premium",
  "descripcion": "Rodillera con soporte de rótula ajustable",
  "marca_id": 7,
  "es_tallable": 1,
  "proveedor_id": 1,
  "estado": "habilitado"
}
```
*Nota: Cuando `es_tallable=1`, NO enviar `precio_defecto` ni `cantidad_general`, ya que se manejan en las variantes*

#### 3.4 Actualizar producto
```
PUT http://localhost:3000/api/productos/1
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "nombre": "Nombre actualizado",
  "precio_defecto": 950.00,
  "estado": "inhabilitado"
}
```

#### 3.5 Habilitar/Inhabilitar producto (Admin)
```
PATCH http://localhost:3000/api/productos/1/toggle-estado
Authorization: Bearer <token>
```
**Respuesta:**
```json
{
  "message": "Producto inhabilitado exitosamente",
  "estado": "inhabilitado"
}
```
**Nota:** Los productos nunca se borran físicamente, solo se inhabilitan.

#### 3.6 Ajustar stock de producto (Admin/Empleado)
```
POST http://localhost:3000/api/productos/1/ajustar-stock
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "cantidad": 10,
  "tipo_movimiento": "entrada",
  "descripcion": "Reposición de inventario"
}
```
**tipo_movimiento:** `entrada`, `salida`, `ajuste`, `devolucion`

---

### 4. VARIANTES (`/api/variantes`)

#### 4.1 Listar variantes de un producto
```
GET http://localhost:3000/api/variantes?producto_id=1
```

#### 4.2 Obtener variante por ID
```
GET http://localhost:3000/api/variantes/5
```

#### 4.3 Crear variante (Admin/Empleado)
```
POST http://localhost:3000/api/variantes
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "producto_id": 1,
  "codigo_barras": "7502345678920",
  "talla_id": 7,
  "color": "Negro",
  "cantidad": 15,
  "precio": 680.00,
  "modelo_id": 1,
  "estado": "habilitado"
}
```

#### 4.4 Actualizar variante
```
PUT http://localhost:3000/api/variantes/5
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "precio": 720.00,
  "color": "Azul marino",
  "estado": "inhabilitado"
}
```

#### 4.5 Habilitar/Inhabilitar variante (Admin/Empleado)
```
PATCH http://localhost:3000/api/variantes/5/toggle-estado
Authorization: Bearer <token>
```
**Respuesta:**
```json
{
  "message": "Variante inhabilitada exitosamente",
  "estado": "inhabilitado"
}
```
**Nota:** Las variantes nunca se borran físicamente, solo se inhabilitan.

#### 4.6 Ajustar stock de variante
```
POST http://localhost:3000/api/variantes/5/ajustar-stock
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "cantidad": 5,
  "tipo_movimiento": "entrada",
  "descripcion": "Llegada de proveedor"
}
```

---

### 5. VENTAS (`/api/ventas`) - Admin/Empleado

#### 5.1 Registrar venta directa
```
POST http://localhost:3000/api/ventas
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "usuario_id": 3,
  "metodo_pago": "efectivo",
  "nota": "Venta mostrador",
  "items": [
    {
      "producto_id": 1,
      "variante_id": 2,
      "cantidad": 1
    },
    {
      "producto_id": 5,
      "variante_id": null,
      "cantidad": 2
    }
  ]
}
```
**metodo_pago opciones:** `efectivo`, `tarjeta`, `transferencia`, `mixto`

**Importante:**
- Si el producto es tallable (`es_tallable=1`), debes enviar `variante_id`
- Si el producto NO es tallable, enviar `variante_id: null`

#### 5.2 Listar ventas
```
GET http://localhost:3000/api/ventas
Authorization: Bearer <token>
```
**Query params opcionales:**
- `?origen=venta_directa` - Filtrar por origen (`venta_directa` o `apartado`)
- `?estado=pagado` - Filtrar por estado
- `?fecha_desde=2025-01-01` - Desde fecha
- `?fecha_hasta=2025-12-31` - Hasta fecha

#### 5.3 Obtener venta por ID con detalles
```
GET http://localhost:3000/api/ventas/1
Authorization: Bearer <token>
```

#### 5.4 Anular venta
```
POST http://localhost:3000/api/ventas/1/anular
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "motivo": "Cliente solicitó devolución"
}
```

---

### 6. APARTADOS (`/api/apartados`)

#### 6.1 Crear apartado (cualquier usuario autenticado)
```
POST http://localhost:3000/api/apartados
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "nota": "Quiero apartar estos productos",
  "items": [
    {
      "producto_id": 1,
      "variante_id": 2,
      "cantidad": 1
    },
    {
      "producto_id": 3,
      "variante_id": 15,
      "cantidad": 2
    }
  ]
}
```
**Importante:** El apartado expira automáticamente en 48 horas (configurable en `.env`)

#### 6.2 Listar apartados
```
GET http://localhost:3000/api/apartados
Authorization: Bearer <token>
```
- Los **usuarios** solo ven sus propios apartados
- Los **empleados/admin** ven todos los apartados

**Query params:**
- `?estado=activo` - Estados: `activo`, `completado`, `expirado`, `cancelado`

#### 6.3 Obtener apartado por ID con detalles
```
GET http://localhost:3000/api/apartados/1
Authorization: Bearer <token>
```

#### 6.4 Abonar a apartado (Admin/Empleado)
```
POST http://localhost:3000/api/apartados/1/abonar
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "monto": 500.00,
  "metodo_pago": "efectivo",
  "nota": "Abono inicial"
}
```

#### 6.5 Completar apartado (Admin/Empleado)
```
POST http://localhost:3000/api/apartados/1/completar
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "metodo_pago": "tarjeta"
}
```
*Nota: Al completar, se descuenta el stock y se genera una venta*

#### 6.6 Cancelar apartado (Admin/Empleado)
```
POST http://localhost:3000/api/apartados/1/cancelar
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "motivo": "Cliente solicitó cancelación"
}
```
*Nota: Al cancelar, se liberan las cantidades reservadas*

---

### 7. MARCAS (`/api/marcas`)

#### 7.1 Listar marcas (público)
```
GET http://localhost:3000/api/marcas
```

#### 7.2 Obtener marca por ID
```
GET http://localhost:3000/api/marcas/1
```

#### 7.3 Crear marca (Admin/Empleado)
```
POST http://localhost:3000/api/marcas
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "nombre": "NUEVA MARCA"
}
```

#### 7.4 Actualizar marca
```
PUT http://localhost:3000/api/marcas/1
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "nombre": "MARCA ACTUALIZADA"
}
```

**Nota:** Las marcas no se eliminan físicamente. Si se requiere "eliminar" una marca, se debe agregar un campo `estado` y manejarlo mediante actualización.

---

### 8. MODELOS (`/api/modelos`)

#### 8.1 Listar modelos (público)
```
GET http://localhost:3000/api/modelos
```

#### 8.2 Obtener modelo por ID
```
GET http://localhost:3000/api/modelos/1
```

#### 8.3 Crear modelo (Admin/Empleado)
```
POST http://localhost:3000/api/modelos
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "nombre": "NVO-2024"
}
```

#### 8.4 Actualizar modelo
```
PUT http://localhost:3000/api/modelos/1
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "nombre": "MOD-2024-UPD"
}
```

**Nota:** Los modelos no se eliminan físicamente. Si se requiere "eliminar" un modelo, se debe agregar un campo `estado` y manejarlo mediante actualización.

---

### 9. TALLAS (`/api/tallas`)

#### 9.1 Listar tallas (público)
```
GET http://localhost:3000/api/tallas
```

#### 9.2 Obtener talla por ID
```
GET http://localhost:3000/api/tallas/1
```

#### 9.3 Crear talla (Admin/Empleado)
```
POST http://localhost:3000/api/tallas
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "codigo": "XL-PLUS",
  "descripcion": "Extra Large Plus"
}
```

#### 9.4 Actualizar talla
```
PUT http://localhost:3000/api/tallas/1
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "codigo": "XXL",
  "descripcion": "Doble Extra Grande"
}
```

**Nota:** Las tallas no se eliminan físicamente. Si se requiere "eliminar" una talla, se debe agregar un campo `estado` y manejarlo mediante actualización.

---

### 10. PROVEEDORES (`/api/proveedores`)

#### 10.1 Listar proveedores (público)
```
GET http://localhost:3000/api/proveedores
```

#### 10.2 Obtener proveedor por ID
```
GET http://localhost:3000/api/proveedores/1
```

#### 10.3 Crear proveedor (Admin/Empleado)
```
POST http://localhost:3000/api/proveedores
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "nombre": "Suministros Médicos del Norte",
  "contacto": "Lic. Roberto García",
  "correo": "contacto@medicos-norte.com",
  "telefono": "8711234567",
  "direccion": "Av. Principal 123, Saltillo, Coah."
}
```

#### 10.4 Actualizar proveedor
```
PUT http://localhost:3000/api/proveedores/1
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "telefono": "8719876543",
  "correo": "nuevoemail@proveedor.com"
}
```

**Nota:** Los proveedores no se eliminan físicamente. Si se requiere "eliminar" un proveedor, se debe agregar un campo `estado` y manejarlo mediante actualización.

---

### 11. BITÁCORAS DE STOCK (`/api/bitacoras`) - Admin/Empleado

#### 11.1 Listar bitácoras
```
GET http://localhost:3000/api/bitacoras
Authorization: Bearer <token>
```
**Query params opcionales:**
- `?tipo_movimiento=entrada` - Tipos: `entrada`, `salida`, `ajuste`, `devolucion`
- `?fecha_desde=2025-01-01`
- `?fecha_hasta=2025-12-31`
- `?producto_id=1`
- `?variante_id=5`

#### 11.2 Registrar movimiento manual
```
POST http://localhost:3000/api/bitacoras
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "producto_id": 1,
  "variante_id": null,
  "cambio_cantidad": 10,
  "tipo_movimiento": "entrada",
  "referencia": "COMPRA-2024-001",
  "descripcion": "Entrada por compra a proveedor"
}
```

---

### 12. ESTADÍSTICAS (`/api/estadisticas`) - Admin/Empleado

#### 12.1 Estadísticas de ventas por período
```
GET http://localhost:3000/api/estadisticas/ventas-periodo?fecha_desde=2025-01-01&fecha_hasta=2025-12-31
Authorization: Bearer <token>
```

#### 12.2 Productos con bajo stock
```
GET http://localhost:3000/api/estadisticas/productos-bajo-stock?umbral=5
Authorization: Bearer <token>
```
*Muestra productos con stock disponible <= umbral (default: 5)*

#### 12.3 Chats abiertos
```
GET http://localhost:3000/api/estadisticas/chats-abiertos
Authorization: Bearer <token>
```

#### 12.4 Productos más vendidos
```
GET http://localhost:3000/api/estadisticas/productos-mas-vendidos?limite=10
Authorization: Bearer <token>
```
**Query params opcionales:**
- `?limite=20` - Cantidad de productos a mostrar
- `?fecha_desde=2025-01-01`
- `?fecha_hasta=2025-12-31`

#### 12.5 Dashboard general
```
GET http://localhost:3000/api/estadisticas/dashboard
Authorization: Bearer <token>
```

---

### 13. ASISTENCIAS (`/api/asistencias`) - Admin/Empleado

#### 13.1 Registrar entrada
```
POST http://localhost:3000/api/asistencias/entrada
Authorization: Bearer <token>
Content-Type: application/json
```
**Body (opcional):**
```json
{
  "entrada_foto": "base64_string_de_foto"
}
```

#### 13.2 Registrar salida
```
POST http://localhost:3000/api/asistencias/salida
Authorization: Bearer <token>
Content-Type: application/json
```
**Body (opcional):**
```json
{
  "salida_foto": "base64_string_de_foto"
}
```

#### 13.3 Listar asistencias
```
GET http://localhost:3000/api/asistencias
Authorization: Bearer <token>
```
**Query params opcionales:**
- `?usuario_id=2`
- `?fecha_desde=2025-01-01`
- `?fecha_hasta=2025-12-31`

#### 13.4 Mi estado actual
```
GET http://localhost:3000/api/asistencias/mi-estado
Authorization: Bearer <token>
```

---

### 14. OPINIONES (`/api/opiniones`)

#### 14.1 Crear opinión (usuario autenticado)
```
POST http://localhost:3000/api/opiniones
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "apartado_id": 1,
  "producto_id": 1,
  "variante_id": null,
  "calificacion": 5,
  "comentario": "Excelente producto, muy buena calidad"
}
```
*Nota: Solo se puede opinar sobre apartados completados. La opinión queda en estado `pendiente` hasta ser aprobada.*

#### 14.2 Listar opiniones (público)
```
GET http://localhost:3000/api/opiniones
```
**Query params opcionales:**
- `?producto_id=1`
- `?estado=aceptada` - Estados: `pendiente`, `aceptada`, `denegada` (Default: `aceptada`)

#### 14.3 Listar opiniones pendientes (Admin/Empleado)
```
GET http://localhost:3000/api/opiniones/pendientes
Authorization: Bearer <token>
```

#### 14.4 Aprobar opinión (Admin/Empleado)
```
PATCH http://localhost:3000/api/opiniones/1/aprobar
Authorization: Bearer <token>
```

#### 14.5 Rechazar opinión (Admin/Empleado)
```
PATCH http://localhost:3000/api/opiniones/1/rechazar
Authorization: Bearer <token>
```
**Nota:** Las opiniones nunca se eliminan físicamente. Se rechazar cambia el estado a `denegada`.

---

### 15. CHATS (`/api/chats`)

#### 15.1 Obtener/crear mi chat (usuario)
```
GET http://localhost:3000/api/chats/mi-chat
Authorization: Bearer <token>
```

#### 15.2 Listar todos los chats (Admin/Empleado)
```
GET http://localhost:3000/api/chats
Authorization: Bearer <token>
```
**Query params:**
- `?estado=abierto` - Estados: `abierto`, `cerrado`

#### 15.3 Obtener mensajes de un chat
```
GET http://localhost:3000/api/chats/1/mensajes
Authorization: Bearer <token>
```

#### 15.4 Enviar mensaje
```
POST http://localhost:3000/api/chats/1/mensajes
Authorization: Bearer <token>
Content-Type: application/json
```
**Body:**
```json
{
  "mensaje": "Hola, necesito información sobre un producto"
}
```

#### 15.5 Cerrar chat (Admin/Empleado)
```
POST http://localhost:3000/api/chats/1/cerrar
Authorization: Bearer <token>
```

---

## 📝 NOTAS IMPORTANTES

### ⚠️ POLÍTICA DE ELIMINACIÓN (SOFT DELETE)

**Este sistema NO permite eliminaciones físicas de registros.** Todos los registros se mantienen en la base de datos por integridad referencial y auditoría.

**Cómo "eliminar" registros:**

1. **Usuarios** → Usar `PATCH /api/usuarios/{id}/toggle-status` para desactivar (`activo=0`)
2. **Productos** → Usar `PUT /api/productos/{id}` con `estado="inhabilitado"`
3. **Variantes** → Usar `PUT /api/variantes/{id}` con `estado="inhabilitado"`
4. **Opiniones** → Usar `PATCH /api/opiniones/{id}/rechazar` para cambiar a `estado="denegada"`
5. **Marcas, Modelos, Tallas, Proveedores** → No tienen endpoint de eliminación. Si se requiere, agregar campo `estado` en migración.

**Estados de Opiniones:**
- `pendiente` - Recién creada, esperando moderación
- `aceptada` - Aprobada por admin/empleado, visible al público
- `denegada` - Rechazada, no se muestra al público

### Credenciales de prueba (después de ejecutar seed):
```
Admin:
  correo: admin@ortomediq.com
  contraseña: password123

Empleado:
  correo: empleado@ortomediq.com
  contraseña: password123

Usuario:
  correo: carlos@example.com
  contraseña: password123
```

### Flujo típico de trabajo:

1. **Login** → Obtener token
2. **Crear productos** (con o sin variantes)
3. **Crear variantes** si el producto es tallable
4. **Usuario crea apartado** → Se reserva stock
5. **Usuario/Empleado abona** al apartado
6. **Completar apartado** → Se genera venta y descuenta stock
7. **O hacer venta directa** → Descuenta stock inmediatamente

### Errores comunes a probar:

1. **Stock insuficiente** - Intentar vender más de lo disponible
2. **Producto tallable sin variante** - Debe fallar
3. **Apartado expirado** - No se puede completar
4. **Usuario inactivo** - No puede hacer login
5. **Permisos insuficientes** - Usuario intentando acceder a endpoint de admin

### Variables de entorno importantes (.env):
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=Ortomediq
PORT=3000
SESSION_EXPIRY_HOURS=24
APARTADO_EXPIRY_HOURS=48
```

---

## 🔧 COMANDOS ÚTILES

```bash
# Iniciar servidor
npm run dev

# Ejecutar migraciones
npm run migrate

# Ejecutar seeds
npm run seed

# Ejecutar tests
npm test

# Ver documentación Swagger
http://localhost:3000/api-docs
```

---

**¡Backend listo para pruebas! 🚀**
