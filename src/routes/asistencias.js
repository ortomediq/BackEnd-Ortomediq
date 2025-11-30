const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * @swagger
 * /api/asistencias:
 *   post:
 *     summary: Registrar entrada de empleado
 *     tags: [Asistencias]
 *     security:
 *       - bearerAuth: []
 */
router.post('/entrada', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { entrada_foto } = req.body;
    const usuarioId = req.user.id;

    // Verificar si ya tiene una entrada abierta hoy
    const [existentes] = await pool.query(
      `SELECT id FROM asistencias_empleados 
       WHERE usuario_id = ? AND DATE(entrada) = CURDATE() AND salida IS NULL`,
      [usuarioId]
    );

    if (existentes.length > 0) {
      return res.status(400).json({ error: 'Ya tiene un registro de entrada activo hoy' });
    }

    const [result] = await pool.query(
      'INSERT INTO asistencias_empleados (usuario_id, entrada, entrada_foto) VALUES (?, NOW(), ?)',
      [usuarioId, entrada_foto || null]
    );

    res.status(201).json({
      message: 'Entrada registrada exitosamente',
      asistenciaId: result.insertId
    });
  } catch (error) {
    console.error('Error registrando entrada:', error);
    res.status(500).json({ error: 'Error al registrar entrada' });
  }
});

/**
 * @swagger
 * /api/asistencias/salida:
 *   post:
 *     summary: Registrar salida de empleado
 *     tags: [Asistencias]
 *     security:
 *       - bearerAuth: []
 */
router.post('/salida', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { salida_foto } = req.body;
    const usuarioId = req.user.id;

    // Buscar entrada abierta de hoy
    const [asistencias] = await pool.query(
      `SELECT id FROM asistencias_empleados 
       WHERE usuario_id = ? AND DATE(entrada) = CURDATE() AND salida IS NULL
       ORDER BY entrada DESC LIMIT 1`,
      [usuarioId]
    );

    if (asistencias.length === 0) {
      return res.status(400).json({ error: 'No tiene una entrada activa hoy' });
    }

    await pool.query(
      'UPDATE asistencias_empleados SET salida = NOW(), salida_foto = ? WHERE id = ?',
      [salida_foto || null, asistencias[0].id]
    );

    res.json({ message: 'Salida registrada exitosamente' });
  } catch (error) {
    console.error('Error registrando salida:', error);
    res.status(500).json({ error: 'Error al registrar salida' });
  }
});

/**
 * @swagger
 * /api/asistencias:
 *   get:
 *     summary: Listar asistencias (Admin/Empleado)
 *     tags: [Asistencias]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { usuario_id, fecha_desde, fecha_hasta } = req.query;

    let query = `
      SELECT a.*,
        u.nombre AS usuario_nombre
      FROM asistencias_empleados a
      INNER JOIN usuarios u ON a.usuario_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (usuario_id) {
      query += ' AND a.usuario_id = ?';
      params.push(usuario_id);
    }
    if (fecha_desde) {
      query += ' AND DATE(a.entrada) >= ?';
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      query += ' AND DATE(a.entrada) <= ?';
      params.push(fecha_hasta);
    }

    query += ' ORDER BY a.entrada DESC LIMIT 200';

    const [asistencias] = await pool.query(query, params);
    res.json({ asistencias });
  } catch (error) {
    console.error('Error listando asistencias:', error);
    res.status(500).json({ error: 'Error al listar asistencias' });
  }
});

/**
 * @swagger
 * /api/asistencias/mi-estado:
 *   get:
 *     summary: Obtener estado de asistencia actual del empleado
 *     tags: [Asistencias]
 *     security:
 *       - bearerAuth: []
 */
router.get('/mi-estado', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const [asistencias] = await pool.query(
      `SELECT * FROM asistencias_empleados 
       WHERE usuario_id = ? AND DATE(entrada) = CURDATE()
       ORDER BY entrada DESC LIMIT 1`,
      [req.user.id]
    );

    if (asistencias.length === 0) {
      return res.json({ estado: 'sin_registro', asistencia: null });
    }

    const asistencia = asistencias[0];
    const estado = asistencia.salida ? 'salida_registrada' : 'entrada_registrada';

    res.json({ estado, asistencia });
  } catch (error) {
    console.error('Error obteniendo estado de asistencia:', error);
    res.status(500).json({ error: 'Error al obtener estado de asistencia' });
  }
});

module.exports = router;
