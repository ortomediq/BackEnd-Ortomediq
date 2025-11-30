-- ======================================================
-- MIGRACIONES ORTOMEDIQ
-- Incluye todas las tablas necesarias para el sistema
-- ======================================================

-- ======================================================
-- TABLAS BASE (del DDL proporcionado)
-- ======================================================

-- 1) proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  contacto VARCHAR(150),
  correo VARCHAR(150),
  telefono VARCHAR(50),
  direccion VARCHAR(255),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) marcas
CREATE TABLE IF NOT EXISTS marcas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) modelos
CREATE TABLE IF NOT EXISTS modelos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) tallas
CREATE TABLE IF NOT EXISTS tallas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL,
  descripcion VARCHAR(200),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ux_tallas_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5) usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin','empleado','usuario') NOT NULL DEFAULT 'usuario',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_ingreso TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de sesiones para autenticación basada en tokens
CREATE TABLE IF NOT EXISTS sesiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expira_en DATETIME NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_sesiones_token (token),
  INDEX idx_sesiones_usuario (usuario_id),
  INDEX idx_sesiones_expira (expira_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de personal (información completa de empleados y administradores)
CREATE TABLE IF NOT EXISTS personal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  apellido_paterno VARCHAR(100) NOT NULL,
  apellido_materno VARCHAR(100),
  rfc VARCHAR(13) NOT NULL UNIQUE,
  curp VARCHAR(18) NOT NULL UNIQUE,
  nss VARCHAR(11) NOT NULL UNIQUE,
  fecha_nacimiento DATE NOT NULL,
  telefono VARCHAR(15),
  direccion TEXT,
  codigo_postal VARCHAR(5),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_personal_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_personal_rfc (rfc),
  INDEX idx_personal_curp (curp),
  INDEX idx_personal_nss (nss)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6) productos (con cantidad_reservada agregada)
CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  marca_id INT NULL,
  modelo_id INT NULL,
  es_tallable TINYINT(1) NOT NULL DEFAULT 0,
  precio_defecto DECIMAL(10,2) NULL,
  cantidad_general INT NOT NULL DEFAULT 0,
  cantidad_reservada INT NOT NULL DEFAULT 0,
  proveedor_id INT NULL,
  codigo_barras_general VARCHAR(128) NULL,
  estado ENUM('habilitado','inhabilitado') NOT NULL DEFAULT 'habilitado',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_marca FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE SET NULL,
  CONSTRAINT fk_productos_modelo FOREIGN KEY (modelo_id) REFERENCES modelos(id) ON DELETE SET NULL,
  CONSTRAINT fk_productos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
  INDEX idx_productos_proveedor (proveedor_id),
  INDEX idx_productos_marca (marca_id),
  INDEX idx_productos_modelo (modelo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7) variantes_productos (con cantidad_reservada agregada)
CREATE TABLE IF NOT EXISTS variantes_productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  codigo_barras VARCHAR(128) NULL,
  talla_id INT NULL,
  color VARCHAR(80) NULL,
  cantidad INT NOT NULL DEFAULT 0,
  cantidad_reservada INT NOT NULL DEFAULT 0,
  precio DECIMAL(10,2) NOT NULL,
  modelo_id INT NULL,
  estado ENUM('habilitado','inhabilitado') NOT NULL DEFAULT 'habilitado',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_variantes_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT fk_variantes_talla FOREIGN KEY (talla_id) REFERENCES tallas(id) ON DELETE SET NULL,
  CONSTRAINT fk_variantes_modelo FOREIGN KEY (modelo_id) REFERENCES modelos(id) ON DELETE SET NULL,
  UNIQUE KEY ux_variantes_producto_talla_color (producto_id, talla_id, color),
  INDEX idx_variantes_producto (producto_id),
  INDEX idx_variantes_talla (talla_id),
  INDEX idx_variantes_modelo (modelo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8) bitacoras_stock
CREATE TABLE IF NOT EXISTS bitacoras_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NULL,
  variante_id INT NULL,
  usuario_id INT NULL,
  cambio_cantidad INT NOT NULL,
  tipo_movimiento ENUM('entrada','salida','ajuste','devolucion') NOT NULL,
  referencia VARCHAR(200) NULL,
  descripcion TEXT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bitacoras_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL,
  CONSTRAINT fk_bitacoras_variante FOREIGN KEY (variante_id) REFERENCES variantes_productos(id) ON DELETE SET NULL,
  CONSTRAINT fk_bitacoras_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_bitacoras_producto (producto_id),
  INDEX idx_bitacoras_variante (variante_id),
  INDEX idx_bitacoras_usuario (usuario_id),
  INDEX idx_bitacoras_tipo_fecha (tipo_movimiento, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9) asistencias_empleados
CREATE TABLE IF NOT EXISTS asistencias_empleados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  entrada TIMESTAMP NOT NULL,
  entrada_foto VARCHAR(255) NULL,
  salida TIMESTAMP NULL,
  salida_foto VARCHAR(255) NULL,
  observaciones TEXT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_asistencias_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_asistencias_usuario (usuario_id),
  INDEX idx_asistencias_entrada (entrada),
  INDEX idx_asistencias_salida (salida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================================================
-- TABLAS NUEVAS: apartados, ventas, opiniones, chats
-- ======================================================

-- 10) apartados
CREATE TABLE IF NOT EXISTS apartados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  codigo VARCHAR(50) NULL,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado ENUM('activo','completado','cancelado','vencido') NOT NULL DEFAULT 'activo',
  expiracion DATETIME NULL,
  nota TEXT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_apartado_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_apartado_usuario (usuario_id),
  INDEX idx_apartado_estado (estado),
  INDEX idx_apartado_expiracion (expiracion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11) apartado_detalles
CREATE TABLE IF NOT EXISTS apartado_detalles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  apartado_id INT NOT NULL,
  producto_id INT NOT NULL,
  variante_id INT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_adet_apartado FOREIGN KEY (apartado_id) REFERENCES apartados(id) ON DELETE CASCADE,
  CONSTRAINT fk_adet_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
  CONSTRAINT fk_adet_variante FOREIGN KEY (variante_id) REFERENCES variantes_productos(id) ON DELETE RESTRICT,
  INDEX idx_adet_apartado (apartado_id),
  INDEX idx_adet_producto (producto_id),
  INDEX idx_adet_variante (variante_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12) ventas
CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  empleado_id INT NULL,
  apartado_id INT NULL,
  codigo VARCHAR(50) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  origen ENUM('apartado','venta_directa') NOT NULL,
  metodo_pago ENUM('efectivo','tarjeta','transferencia','paypal','otro') DEFAULT 'efectivo',
  estado ENUM('pendiente','pagado','anulado','devuelto') NOT NULL DEFAULT 'pagado',
  nota TEXT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_ventas_empleado FOREIGN KEY (empleado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_ventas_apartado FOREIGN KEY (apartado_id) REFERENCES apartados(id) ON DELETE SET NULL,
  INDEX idx_ventas_usuario (usuario_id),
  INDEX idx_ventas_empleado (empleado_id),
  INDEX idx_ventas_origen_fecha (origen, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13) ventas_detalle
CREATE TABLE IF NOT EXISTS ventas_detalle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  producto_id INT NULL,
  variante_id INT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(14,2) GENERATED ALWAYS AS ((precio_unitario - descuento) * cantidad) STORED,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vdet_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  CONSTRAINT fk_vdet_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL,
  CONSTRAINT fk_vdet_variante FOREIGN KEY (variante_id) REFERENCES variantes_productos(id) ON DELETE SET NULL,
  INDEX idx_vdet_venta (venta_id),
  INDEX idx_vdet_producto (producto_id),
  INDEX idx_vdet_variante (variante_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14) opiniones_productos (con estado para moderación)
CREATE TABLE IF NOT EXISTS opiniones_productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  apartado_id INT NOT NULL,
  producto_id INT NULL,
  variante_id INT NULL,
  calificacion TINYINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario TEXT NULL,
  estado ENUM('pendiente','aceptada','denegada') NOT NULL DEFAULT 'pendiente',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_opinion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_opinion_apartado FOREIGN KEY (apartado_id) REFERENCES apartados(id) ON DELETE CASCADE,
  CONSTRAINT fk_opinion_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL,
  CONSTRAINT fk_opinion_variante FOREIGN KEY (variante_id) REFERENCES variantes_productos(id) ON DELETE SET NULL,
  INDEX idx_opinion_usuario (usuario_id),
  INDEX idx_opinion_apartado (apartado_id),
  INDEX idx_opinion_producto (producto_id),
  INDEX idx_opinion_variante (variante_id),
  INDEX idx_opinion_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15) chats
CREATE TABLE IF NOT EXISTS chats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  asunto VARCHAR(255) NULL,
  estado ENUM('abierto','cerrado','archivado') NOT NULL DEFAULT 'abierto',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE KEY ux_chat_usuario (usuario_id),
  INDEX idx_chat_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16) chats_mensajes
CREATE TABLE IF NOT EXISTS chats_mensajes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id INT NOT NULL,
  emisor_id INT NOT NULL,
  mensaje TEXT NOT NULL,
  archivo_nombre VARCHAR(255) NULL,
  visto_en DATETIME NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mensaje_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  CONSTRAINT fk_mensaje_emisor FOREIGN KEY (emisor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_mensaje_chat (chat_id),
  INDEX idx_mensaje_emisor (emisor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
