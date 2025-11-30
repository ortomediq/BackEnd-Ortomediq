const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * @swagger
 * /api/estadisticas/ventas-periodo:
 *   get:
 *     summary: Obtener estadísticas de ventas por período
 *     tags: [Estadísticas]
 *     security:
 *       - bearerAuth: []
 */
router.get('/ventas-periodo', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    if (!fecha_desde || !fecha_hasta) {
      return res.status(400).json({ error: 'fecha_desde y fecha_hasta son requeridos' });
    }

    const [stats] = await pool.query(
      `SELECT 
         COUNT(*) AS total_ventas,
         SUM(total) AS ingresos_totales,
         AVG(total) AS ticket_promedio,
         SUM(CASE WHEN origen = 'apartado' THEN 1 ELSE 0 END) AS ventas_apartado,
         SUM(CASE WHEN origen = 'venta_directa' THEN 1 ELSE 0 END) AS ventas_directas
       FROM ventas
       WHERE estado = 'pagado' AND fecha BETWEEN ? AND ?`,
      [fecha_desde, fecha_hasta]
    );

    res.json({ estadisticas: stats[0] });
  } catch (error) {
    console.error('Error obteniendo estadísticas de ventas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

/**
 * @swagger
 * /api/estadisticas/productos-bajo-stock:
 *   get:
 *     summary: Obtener productos con stock bajo
 *     tags: [Estadísticas]
 *     security:
 *       - bearerAuth: []
 */
router.get('/productos-bajo-stock', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const umbral = parseInt(req.query.umbral) || 5;

    // Productos sin variantes
    const [productos] = await pool.query(
      `SELECT id, nombre, cantidad_general, cantidad_reservada,
         (cantidad_general - cantidad_reservada) AS disponible
       FROM productos
       WHERE es_tallable = 0 AND estado = 'habilitado'
         AND (cantidad_general - cantidad_reservada) <= ?
       ORDER BY disponible ASC`,
      [umbral]
    );

    // Variantes
    const [variantes] = await pool.query(
      `SELECT v.id, p.nombre AS producto_nombre, v.color, t.codigo AS talla,
         v.cantidad, v.cantidad_reservada,
         (v.cantidad - v.cantidad_reservada) AS disponible
       FROM variantes_productos v
       INNER JOIN productos p ON v.producto_id = p.id
       LEFT JOIN tallas t ON v.talla_id = t.id
       WHERE v.estado = 'habilitado'
         AND (v.cantidad - v.cantidad_reservada) <= ?
       ORDER BY disponible ASC`,
      [umbral]
    );

    res.json({
      productos_bajo_stock: productos,
      variantes_bajo_stock: variantes
    });
  } catch (error) {
    console.error('Error obteniendo productos con bajo stock:', error);
    res.status(500).json({ error: 'Error al obtener productos con bajo stock' });
  }
});

/**
 * @swagger
 * /api/estadisticas/chats-abiertos:
 *   get:
 *     summary: Obtener número de chats abiertos
 *     tags: [Estadísticas]
 *     security:
 *       - bearerAuth: []
 */
router.get('/chats-abiertos', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'SELECT COUNT(*) AS total_chats_abiertos FROM chats WHERE estado = "abierto"'
    );

    res.json({ total_chats_abiertos: result[0].total_chats_abiertos });
  } catch (error) {
    console.error('Error obteniendo chats abiertos:', error);
    res.status(500).json({ error: 'Error al obtener chats abiertos' });
  }
});

/**
 * @swagger
 * /api/estadisticas/productos-mas-vendidos:
 *   get:
 *     summary: Obtener productos más vendidos
 *     tags: [Estadísticas]
 *     security:
 *       - bearerAuth: []
 */
router.get('/productos-mas-vendidos', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { limite, fecha_desde, fecha_hasta } = req.query;
    const limit = parseInt(limite) || 10;

    let query = `
      SELECT p.id, p.nombre,
        SUM(vd.cantidad) AS total_vendido,
        SUM(vd.subtotal) AS ingresos_generados
      FROM ventas_detalle vd
      INNER JOIN productos p ON vd.producto_id = p.id
      INNER JOIN ventas v ON vd.venta_id = v.id
      WHERE v.estado = 'pagado'
    `;

    const params = [];

    if (fecha_desde) {
      query += ' AND v.fecha >= ?';
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      query += ' AND v.fecha <= ?';
      params.push(fecha_hasta);
    }

    query += ` GROUP BY p.id, p.nombre
               ORDER BY total_vendido DESC
               LIMIT ?`;
    params.push(limit);

    const [productos] = await pool.query(query, params);
    res.json({ productos_mas_vendidos: productos });
  } catch (error) {
    console.error('Error obteniendo productos más vendidos:', error);
    res.status(500).json({ error: 'Error al obtener productos más vendidos' });
  }
});

/**
 * @swagger
 * /api/estadisticas/resumen-general:
 *   get:
 *     summary: Obtener resumen general del sistema
 *     tags: [Estadísticas]
 *     security:
 *       - bearerAuth: []
 */
router.get('/resumen-general', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [productos] = await pool.query('SELECT COUNT(*) AS total FROM productos WHERE estado = "habilitado"');
    const [usuarios] = await pool.query('SELECT COUNT(*) AS total FROM usuarios WHERE activo = 1');
    const [apartadosActivos] = await pool.query('SELECT COUNT(*) AS total FROM apartados WHERE estado = "activo"');
    const [ventasHoy] = await pool.query('SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS ingresos FROM ventas WHERE DATE(fecha) = CURDATE() AND estado = "pagado"');
    const [chatsAbiertos] = await pool.query('SELECT COUNT(*) AS total FROM chats WHERE estado = "abierto"');

    res.json({
      resumen: {
        productos_activos: productos[0].total,
        usuarios_activos: usuarios[0].total,
        apartados_activos: apartadosActivos[0].total,
        ventas_hoy: ventasHoy[0].total,
        ingresos_hoy: ventasHoy[0].ingresos,
        chats_abiertos: chatsAbiertos[0].total
      }
    });
  } catch (error) {
    console.error('Error obteniendo resumen general:', error);
    res.status(500).json({ error: 'Error al obtener resumen general' });
  }
});

module.exports = router;
