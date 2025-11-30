-- ========================================================
-- MIGRACIÓN 002: Actualizar campo aprobado a estado en opiniones
-- Esta migración convierte el campo booleano 'aprobado' 
-- al campo ENUM 'estado' con valores: pendiente, aceptada, denegada
-- ========================================================

USE Ortomediq;

-- Verificar si la columna 'aprobado' existe
SET @dbname = DATABASE();
SET @tablename = 'opiniones_productos';
SET @columnname = 'aprobado';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT ''La columna aprobado existe, procediendo con migración'' AS mensaje;',
  'SELECT ''La columna aprobado no existe, migración no necesaria'' AS mensaje;'
));
PREPARE migration_check FROM @preparedStatement;
EXECUTE migration_check;
DEALLOCATE PREPARE migration_check;

-- Si existe el campo 'aprobado', agregamos el nuevo campo 'estado' y migramos datos
ALTER TABLE opiniones_productos 
  ADD COLUMN IF NOT EXISTS estado ENUM('pendiente','aceptada','denegada') NOT NULL DEFAULT 'pendiente' AFTER comentario;

-- Migrar datos: si aprobado=1 -> aceptada, si aprobado=0 -> pendiente
UPDATE opiniones_productos 
SET estado = CASE 
  WHEN aprobado = 1 THEN 'aceptada'
  ELSE 'pendiente'
END
WHERE estado = 'pendiente';

-- Eliminar el índice viejo si existe
DROP INDEX IF EXISTS idx_opinion_aprobado ON opiniones_productos;

-- Agregar nuevo índice
CREATE INDEX IF NOT EXISTS idx_opinion_estado ON opiniones_productos(estado);

-- Eliminar la columna 'aprobado' (comentar esta línea si quieres mantener ambas columnas temporalmente)
-- ALTER TABLE opiniones_productos DROP COLUMN IF EXISTS aprobado;

SELECT 'Migración 002 completada: Campo estado agregado/actualizado en opiniones_productos' AS resultado;
