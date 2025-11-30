# 📢 AVISO PARA FRONTEND - CAMBIOS EN API

## ⚠️ CAMBIOS IMPORTANTES QUE AFECTAN AL FRONTEND

---

## 1. 🚫 Endpoints DELETE Eliminados

### ❌ Ya NO Funcionan estos Endpoints:

```
DELETE /api/usuarios/:id
DELETE /api/variantes/:id
DELETE /api/marcas/:id
DELETE /api/modelos/:id
DELETE /api/tallas/:id
DELETE /api/proveedores/:id
DELETE /api/opiniones/:id
```

### ✅ Usar Estos en su Lugar:

| Antes | Ahora | Método |
|-------|-------|--------|
| `DELETE /api/usuarios/:id` | `PATCH /api/usuarios/:id/toggle-status` | PATCH |
| `DELETE /api/variantes/:id` | `PUT /api/variantes/:id` con `{estado: "inhabilitado"}` | PUT |
| `DELETE /api/opiniones/:id` | `PATCH /api/opiniones/:id/rechazar` | PATCH |

**Marcas, Modelos, Tallas, Proveedores:** No se pueden "eliminar". Si se requiere, contactar al backend.

---

## 2. 📝 Cambios en Opiniones

### Campo `aprobado` → `estado`

**ANTES:**
```json
{
  "id": 1,
  "aprobado": 0,  // o 1
  ...
}
```

**AHORA:**
```json
{
  "id": 1,
  "estado": "pendiente",  // "pendiente" | "aceptada" | "denegada"
  ...
}
```

### Estados Posibles:
- `"pendiente"` - Esperando moderación (era `aprobado: 0`)
- `"aceptada"` - Aprobada y visible (era `aprobado: 1`)
- `"denegada"` - Rechazada, no visible

### Actualizar Query Params

**ANTES:**
```javascript
GET /api/opiniones?aprobado=true
```

**AHORA:**
```javascript
GET /api/opiniones?estado=aceptada
```

### Nuevos Endpoints de Opiniones

```javascript
// Listar pendientes (admin/empleado)
GET /api/opiniones/pendientes

// Aprobar opinión (cambia a "aceptada")
PATCH /api/opiniones/:id/aprobar

// Rechazar opinión (cambia a "denegada")  ← NUEVO
PATCH /api/opiniones/:id/rechazar
```

---

## 3. 🔄 Actualizar Llamadas en Frontend

### Ejemplo: Desactivar Usuario

**ANTES:**
```javascript
// ❌ Ya no funciona
async function eliminarUsuario(userId) {
  await axios.delete(`/api/usuarios/${userId}`);
}
```

**AHORA:**
```javascript
// ✅ Usar esto
async function desactivarUsuario(userId) {
  await axios.patch(`/api/usuarios/${userId}/toggle-status`);
}
```

### Ejemplo: Inhabilitar Producto

**ANTES:**
```javascript
// ❌ No había DELETE, pero si lo usaban...
async function eliminarProducto(productoId) {
  await axios.delete(`/api/productos/${productoId}`);
}
```

**AHORA:**
```javascript
// ✅ Usar esto
async function inhabilitarProducto(productoId) {
  await axios.put(`/api/productos/${productoId}`, {
    estado: 'inhabilitado'
  });
}
```

### Ejemplo: Gestionar Opiniones

**ANTES:**
```javascript
// ❌ Ya no funciona
async function eliminarOpinion(opinionId) {
  await axios.delete(`/api/opiniones/${opinionId}`);
}

// ❌ Campo aprobado ya no existe
if (opinion.aprobado) {
  mostrarOpinion();
}
```

**AHORA:**
```javascript
// ✅ Usar esto para rechazar
async function rechazarOpinion(opinionId) {
  await axios.patch(`/api/opiniones/${opinionId}/rechazar`);
}

// ✅ Usar esto para aprobar
async function aprobarOpinion(opinionId) {
  await axios.patch(`/api/opiniones/${opinionId}/aprobar`);
}

// ✅ Verificar con estado
if (opinion.estado === 'aceptada') {
  mostrarOpinion();
}
```

---

## 4. 🎨 Actualizar UI

### Botones de "Eliminar" → "Desactivar/Inhabilitar"

**ANTES:**
```jsx
<button onClick={() => eliminarUsuario(user.id)}>
  🗑️ Eliminar Usuario
</button>
```

**AHORA:**
```jsx
<button onClick={() => desactivarUsuario(user.id)}>
  {user.activo ? '🚫 Desactivar' : '✅ Activar'} Usuario
</button>
```

### Estados de Opiniones

**ANTES:**
```jsx
{opinion.aprobado ? (
  <span className="badge-success">Aprobada</span>
) : (
  <span className="badge-pending">Pendiente</span>
)}
```

**AHORA:**
```jsx
{opinion.estado === 'aceptada' && (
  <span className="badge-success">Aceptada</span>
)}
{opinion.estado === 'pendiente' && (
  <span className="badge-warning">Pendiente</span>
)}
{opinion.estado === 'denegada' && (
  <span className="badge-danger">Denegada</span>
)}
```

---

## 5. 🔍 Filtros de Listados

### Productos/Variantes - Mostrar solo habilitados

```javascript
// Listar solo productos habilitados
GET /api/productos?estado=habilitado

// O filtrar en frontend
const productosActivos = productos.filter(p => p.estado === 'habilitado');
```

### Usuarios - Mostrar solo activos

```javascript
// Filtrar usuarios activos en frontend
const usuariosActivos = usuarios.filter(u => u.activo === 1);
```

### Opiniones - Mostrar solo aceptadas (público)

```javascript
// Por defecto ya filtra aceptadas
GET /api/opiniones

// Especificar estado manualmente
GET /api/opiniones?estado=aceptada
GET /api/opiniones?estado=pendiente  // Solo admin/empleado
```

---

## 6. 📱 Notificaciones al Usuario

Actualizar mensajes de éxito:

**ANTES:**
```javascript
toast.success('Usuario eliminado correctamente');
```

**AHORA:**
```javascript
toast.success('Usuario desactivado correctamente');
// o
toast.success('Usuario activado correctamente');
```

---

## 7. ✅ Checklist de Actualización Frontend

- [ ] Eliminar todas las llamadas a `axios.delete()` para usuarios, variantes, opiniones
- [ ] Reemplazar con `axios.patch()` o `axios.put()` según corresponda
- [ ] Cambiar todas las referencias de `opinion.aprobado` a `opinion.estado`
- [ ] Actualizar query params de `?aprobado=` a `?estado=`
- [ ] Cambiar textos de botones "Eliminar" a "Desactivar/Inhabilitar"
- [ ] Actualizar badges/etiquetas de opiniones para 3 estados
- [ ] Probar flujo completo de moderación de opiniones
- [ ] Implementar botones de Activar/Desactivar en lugar de Eliminar
- [ ] Actualizar filtros para excluir registros inhabilitados
- [ ] Probar que usuarios desactivados no puedan hacer login

---

## 8. 🧪 Casos de Prueba

### Probar Usuarios
1. Desactivar usuario → No puede hacer login
2. Activar usuario → Puede hacer login nuevamente
3. No debe haber opción de "eliminar permanentemente"

### Probar Productos/Variantes
1. Inhabilitar producto → No aparece en listado público
2. Inhabilitar variante → No se puede agregar a carrito/venta
3. Admin puede ver productos inhabilitados con filtro

### Probar Opiniones
1. Usuario crea opinión → Queda en "pendiente"
2. No aparece en listado público
3. Admin/Empleado ve opiniones pendientes
4. Aprobar → Cambia a "aceptada", aparece en público
5. Rechazar → Cambia a "denegada", NO aparece en público
6. No debe haber opción de "eliminar" opinión

---

## 9. 📞 Contacto para Dudas

Si necesitas agregar funcionalidad de "eliminación" a marcas, modelos, tallas o proveedores, contactar al equipo de backend para agregar el campo `estado` en esas tablas.

---

## 🚀 Migración Rápida

### Script de Búsqueda y Reemplazo

Buscar en todo el proyecto frontend:

```bash
# Buscar todos los DELETE que puedan fallar
grep -r "delete.*usuarios" .
grep -r "delete.*variantes" .
grep -r "delete.*opiniones" .
grep -r "\.aprobado" .
```

Reemplazar:
- `opinion.aprobado` → `opinion.estado === 'aceptada'`
- `?aprobado=` → `?estado=`
- `axios.delete(/usuarios/` → `axios.patch(/usuarios/.../toggle-status`
- `axios.delete(/opiniones/` → `axios.patch(/opiniones/.../rechazar`

---

**✅ Con estos cambios el frontend estará sincronizado con el nuevo backend**
