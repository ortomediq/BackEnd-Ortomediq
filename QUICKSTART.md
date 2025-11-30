# 🚀 Inicio Rápido - Ortomediq Backend

## Pasos para levantar el servidor

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar base de datos
Crear archivo `.env` desde `.env.example`:
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de MySQL:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=Ortomediq
```

### 3. Crear base de datos
```bash
mysql -u root -p -e "CREATE DATABASE Ortomediq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 4. Ejecutar migraciones
```bash
npm run migrate
```

### 5. Cargar datos de ejemplo
```bash
npm run seed
```

### 6. Iniciar servidor
```bash
npm run dev
```

El servidor estará en: **http://localhost:3000**

Documentación API: **http://localhost:3000/api-docs**

---

## 🔑 Credenciales de prueba

- **Admin**: `admin@ortomediq.com` / `password123`
- **Empleado**: `empleado@ortomediq.com` / `password123`
- **Usuario**: `carlos@example.com` / `password123`

---

## 📋 Prueba rápida con curl

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@ortomediq.com","contrasena":"password123"}'
```

### Listar productos (público)
```bash
curl http://localhost:3000/api/productos
```

### Crear apartado (requiere token)
```bash
curl -X POST http://localhost:3000/api/apartados \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "items": [
      {"producto_id": 1, "cantidad": 2}
    ],
    "nota": "Test apartado"
  }'
```

---

## 📦 Estructura de archivos importantes

```
ortomediq-backend/
├── migrations/001_create_tables.sql  # Esquema de BD
├── scripts/
│   ├── migrate.js                    # Ejecuta migraciones
│   └── seed.js                       # Carga datos de prueba
├── src/
│   ├── index.js                      # Punto de entrada
│   ├── routes/                       # Endpoints API
│   ├── middleware/auth.js            # Autenticación
│   └── jobs/expireApartados.js       # Job de expiración
├── .env                              # Configuración (crear desde .env.example)
└── README.md                         # Documentación completa
```

---

## 🐛 Solución de problemas

### Error de conexión a MySQL
- Verificar que MySQL esté ejecutándose
- Revisar credenciales en `.env`
- Verificar que la base de datos `Ortomediq` exista

### Error "Module not found"
```bash
npm install
```

### Reiniciar base de datos
```bash
mysql -u root -p Ortomediq < migrations/001_create_tables.sql
npm run seed
```

---

## 📚 Más información

Ver **README.md** para documentación completa de la API y arquitectura.
