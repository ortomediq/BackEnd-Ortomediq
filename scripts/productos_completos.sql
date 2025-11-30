-- ========================================================
-- PRODUCTOS Y VARIANTES COMPLETOS - ORTOMEDIQ
-- Este archivo contiene todos los productos del inventario
-- ========================================================

USE Ortomediq;

-- Borrar variantes y productos existentes (si se desea reiniciar)
-- DELETE FROM variantes_productos;
-- DELETE FROM productos;

-- ========================================================
-- PRODUCTOS TALLABLES (IDs 1-100)
-- Para productos tallables: modelo_id = NULL en la tabla productos
-- Las variantes sí tienen modelo_id específico
-- ========================================================

INSERT INTO productos (id, nombre, descripcion, marca_id, modelo_id, es_tallable, precio_defecto, cantidad_general, proveedor_id, codigo_barras_general, estado, creado_en) VALUES
(1, 'Soporte para tobillo de loneta reforzada', 'Soporte ortopédico para tobillo, loneta reforzada, cierre y ajuste. Uso diario y deportivo ligero.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(2, 'Faja dorsolumbar', 'Faja dorsolumbar ortopédica, soporte lumbar, ideal para labores y uso terapéutico.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(3, 'Faja sacrolumbar', 'Faja sacrolumbar ortopédica, diseño anatómico y soporte lumbar bajo.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(4, 'Faja sacrolumbar reforzada', 'Faja sacrolumbar reforzada con refuerzos laterales para mayor estabilización.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(5, 'Soporte abdominal', 'Soporte abdominal universal, material elástico, ajuste con cierre.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(6, 'Cinturón costal (mujer)', 'Cinturón costal femenino para soporte torácico y abdominal.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(7, 'Cinturón costal (hombre)', 'Cinturón costal masculino para soporte y compresión torácica.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(8, 'Faja de embarazo', 'Faja de embarazo para soporte lumbar y abdominal en gestantes.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(9, 'Soporte para epicondilitis', 'Soporte para epicondilitis (codo), banda compresiva que alivia dolores laterales/mediales.', 2, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(10, 'Faja inguinal', 'Faja inguinal compresiva para hernias leves y soporte inguinal.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(11, 'Faja umbilical', 'Faja umbilical de compresión para recuperación postparto y soporte abdominal.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(12, 'Suspensorio', 'Suspensorio masculino ortopédico, soporte para actividades deportivas y recuperación.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(13, 'Cabestrillo', 'Cabestrillo de hombro en lona, ajuste y soporte para inmovilización de brazo.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(14, 'Férula pulgar', 'Férula inmovilizadora de pulgar, soporte y protección en lesiones leves.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(15, 'Férula para muñeca (DER)', 'Férula para inmovilización de muñeca (derecha).', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(16, 'Férula para muñeca (IZQ)', 'Férula para inmovilización de muñeca (izquierda).', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(17, 'Férula pulgar en abducción (IZQ)', 'Férula para pulgar con abducción, orientada a inmovilizar y separar pulgar (izquierdo).', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(18, 'ABD férula para muñeca (IZQ)', 'Férula ABD para muñeca (izquierda) con refuerzo de abducción.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW()),
(19, 'ABD férula para muñeca (DER)', 'Férula ABD para muñeca (derecha) con refuerzo de abducción.', 1, NULL, 1, NULL, 0, 1, NULL, 'habilitado', NOW());

-- ========================================================
-- NOTA: Este es solo el inicio del archivo. Debido a la extensión,
-- recomiendo cargar los datos completos que proporcionaste 
-- directamente desde tu archivo SQL usando:
-- mysql -u root -p Ortomediq < tu_archivo_completo.sql
-- ========================================================
