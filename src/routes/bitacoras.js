const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * @swagger
 * /api/bitacoras:
 *   get:
 *     summary: Listar bitácoras de stock (Admin/Empleado)
 *     tags: [Bitácoras]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { tipo_movimiento, fecha_desde, fecha_hasta, producto_id, variante_id } = req.query;

    let query = `
      SELECT b.*,
        p.nombre AS producto_nombre,
        u.nombre AS usuario_nombre
      FROM bitacoras_stock b
      LEFT JOIN productos p ON b.producto_id = p.id
      LEFT JOIN usuarios u ON b.usuario_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (tipo_movimiento) {
      query += ' AND b.tipo_movimiento = ?';
      params.push(tipo_movimiento);
    }
    if (fecha_desde) {
      query += ' AND b.creado_en >= ?';
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      query += ' AND b.creado_en <= ?';
      params.push(fecha_hasta);
    }
    if (producto_id) {
      query += ' AND b.producto_id = ?';
      params.push(producto_id);
    }
    if (variante_id) {
      query += ' AND b.variante_id = ?';
      params.push(variante_id);
    }

    query += ' ORDER BY b.creado_en DESC LIMIT 500';

    const [bitacoras] = await pool.query(query, params);
    res.json({ bitacoras });
  } catch (error) {
    console.error('Error listando bitácoras:', error);
    res.status(500).json({ error: 'Error al listar bitácoras' });
  }
});

/**
 * @swagger
 * /api/bitacoras:
 *   post:
 *     summary: Registrar movimiento manual en bitácora (Admin/Empleado)
 *     tags: [Bitácoras]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { producto_id, variante_id, cambio_cantidad, tipo_movimiento, referencia, descripcion } = req.body;

    if ((!producto_id && !variante_id) || !cambio_cantidad || !tipo_movimiento) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const [result] = await pool.query(
      `INSERT INTO bitacoras_stock (producto_id, variante_id, usuario_id, cambio_cantidad, tipo_movimiento, referencia, descripcion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [producto_id || null, variante_id || null, req.user.id, cambio_cantidad, tipo_movimiento, referencia || null, descripcion || null]
    );

    res.status(201).json({
      message: 'Movimiento registrado en bitácora',
      bitacoraId: result.insertId
    });
  } catch (error) {
    console.error('Error registrando bitácora:', error);
    res.status(500).json({ error: 'Error al registrar bitácora' });
  }
});

module.exports = router;
