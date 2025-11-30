# 🔄 CAMBIOS REALIZADOS - SOFT DELETE Y ESTADOS

## Resumen de Modificaciones

Se han implementado cambios para **eliminar todas las operaciones DELETE físicas** del sistema, reemplazándolas con **soft deletes** (eliminaciones lógicas mediante cambios de estado).

---

## 📋 Cambios en Base de Datos

### 1. Tabla `opiniones_productos`
**Antes:**
```sql
aprobado TINYINT(1) NOT NULL DEFAULT 0
```

**Después:**
```sql
estado ENUM('pendiente','aceptada','denegada') NOT NULL DEFAULT 'pendiente'
```

**Estados:**
- `pendiente` - Opinión recién creada, esperando moderación
- `aceptada` - Aprobada por admin/empleado, visible públicamente
- `denegada` - Rechazada, no se muestra al público

**Archivo de migración:** `migrations/002_update_opiniones_estado.sql`

---

## 🚫 Endpoints DELETE Eliminados

### Antes → Después

| Módulo | Endpoint Eliminado | Alternativa |
|--------|-------------------|-------------|
| **Usuarios** | `DELETE /api/usuarios/:id` | `PATCH /api/usuarios/:id/toggle-status` |
| **Productos** | *(No había DELETE)* | `PUT /api/productos/:id` con `estado="inhabilitado"` |
| **Variantes** | `DELETE /api/variantes/:id` | `PUT /api/variantes/:id` con `estado="inhabilitado"` |
| **Marcas** | `DELETE /api/marcas/:id` | *Eliminado, no se pueden borrar* |
| **Modelos** | `DELETE /api/modelos/:id` | *Eliminado, no se pueden borrar* |
| **Tallas** | `DELETE /api/tallas/:id` | *Eliminado, no se pueden borrar* |
| **Proveedores** | `DELETE /api/proveedores/:id` | *Eliminado, no se pueden borrar* |
| **Opiniones** | `DELETE /api/opiniones/:id` | `PATCH /api/opiniones/:id/rechazar` |

---

## 📝 Archivos Modificados

### 1. **migrations/001_create_tables.sql**
- ✅ Cambiado campo `aprobado` por `estado` en tabla `opiniones_productos`

### 2. **migrations/002_update_opiniones_estado.sql** (NUEVO)
- ✅ Script de migración para actualizar bases de datos existentes
- Convierte `aprobado` → `estado`
- Migra datos existentes automáticamente

### 3. **src/routes/usuarios.js**
- ❌ Eliminado endpoint `DELETE /:id`
- ℹ️ Se mantiene `PATCH /:id/toggle-status` para activar/desactivar

### 4. **src/routes/variantes.js**
- ❌ Eliminado endpoint `DELETE /:id`
- ℹ️ Usar `PUT /:id` con `estado="inhabilitado"`

### 5. **src/routes/marcas.js**
- ❌ Eliminado endpoint `DELETE /:id`
- ℹ️ Comentario agregado indicando que no se permiten eliminaciones

### 6. **src/routes/modelos.js**
- ❌ Eliminado endpoint `DELETE /:id`
- ℹ️ Comentario agregado indicando que no se permiten eliminaciones

### 7. **src/routes/tallas.js**
- ❌ Eliminado endpoint `DELETE /:id`
- ℹ️ Comentario agregado indicando que no se permiten eliminaciones

### 8. **src/routes/proveedores.js**
- ❌ Eliminado endpoint `DELETE /:id`
- ℹ️ Comentario agregado indicando que no se permiten eliminaciones

### 9. **src/routes/opiniones.js**
- ❌ Eliminado endpoint `DELETE /:id`
- ✅ Actualizado `GET /` para usar `estado` en lugar de `aprobado`
- ✅ Actualizado `GET /pendientes` para filtrar por `estado='pendiente'`
- ✅ Actualizado `PATCH /:id/aprobar` para cambiar a `estado='aceptada'`
- ✅ Agregado `PATCH /:id/rechazar` para cambiar a `estado='denegada'`

### 10. **ENDPOINTS_INSOMNIA.md**
- ✅ Eliminadas todas las referencias a endpoints DELETE
- ✅ Actualizada sección de Opiniones con nuevos estados
- ✅ Agregada sección **POLÍTICA DE ELIMINACIÓN (SOFT DELETE)**
- ✅ Actualizados ejemplos de cómo "eliminar" registros por módulo

---

## 🚀 Cómo Aplicar los Cambios

### Si estás iniciando desde cero:
```bash
# 1. Ejecutar migraciones (incluye el cambio de opiniones)
npm run migrate

# 2. Ejecutar seeds
npm run seed

# 3. Iniciar servidor
npm run dev
```

### Si ya tienes una base de datos con el campo `aprobado`:
```bash
# 1. Ejecutar migración de actualización
mysql -u root -p Ortomediq < migrations/002_update_opiniones_estado.sql

# 2. Reiniciar servidor
npm run dev
```

---

## ✅ Ventajas del Sistema de Soft Delete

1. **Auditoría Completa** - Se mantiene historial completo de todos los registros
2. **Integridad Referencial** - No se rompen relaciones entre tablas
3. **Recuperación** - Posibilidad de reactivar registros si fue un error
4. **Análisis de Datos** - Se pueden analizar productos descontinuados, usuarios inactivos, etc.
5. **Cumplimiento Legal** - Algunos datos no deben borrarse por regulaciones

---

## 🔍 Cómo Verificar que Funciona

### 1. Probar Desactivación de Usuario
```bash
# Login como admin
POST /api/auth/login
{ "correo": "admin@ortomediq.com", "contrasena": "password123" }

# Desactivar usuario
PATCH /api/usuarios/3/toggle-status
Authorization: Bearer <token>

# Verificar que el usuario no puede hacer login
POST /api/auth/login
{ "correo": "carlos@example.com", "contrasena": "password123" }
# Debería retornar error "Usuario inactivo"
```

### 2. Probar Inhabilitación de Producto
```bash
# Inhabilitar producto
PUT /api/productos/1
{ "estado": "inhabilitado" }

# Verificar que no aparece en listado público
GET /api/productos?estado=habilitado
```

### 3. Probar Estados de Opiniones
```bash
# Crear opinión (queda en 'pendiente')
POST /api/opiniones
{ "apartado_id": 1, "calificacion": 5, "comentario": "Excelente" }

# Aprobar opinión (cambia a 'aceptada')
PATCH /api/opiniones/1/aprobar

# Rechazar opinión (cambia a 'denegada')
PATCH /api/opiniones/2/rechazar

# Listar solo aceptadas (público)
GET /api/opiniones
# Solo muestra estado='aceptada'
```

---

## 📌 Notas Finales

- ✅ **No hay endpoints DELETE** en el sistema
- ✅ **Todos los cambios son reversibles** (excepto ventas/apartados que tienen lógica de negocio)
- ✅ **Swagger actualizado automáticamente** - Los endpoints DELETE ya no aparecerán
- ⚠️ **Marcas, Modelos, Tallas y Proveedores** no tienen campo `estado` en la BD actual. Si se requiere inhabilitarlos, agregar ese campo en una futura migración.

---

**🎉 Sistema actualizado con política de Soft Delete completa!**
