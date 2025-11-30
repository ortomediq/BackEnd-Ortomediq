const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * @swagger
 * /api/opiniones:
 *   post:
 *     summary: Crear opinión sobre apartado completado
 *     tags: [Opiniones]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { apartado_id, producto_id, variante_id, calificacion, comentario } = req.body;

    if (!apartado_id || !calificacion) {
      return res.status(400).json({ error: 'apartado_id y calificacion son requeridos' });
    }

    if (calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5' });
    }

    // Verificar que el apartado existe, está completado y pertenece al usuario
    const [apartados] = await pool.query(
      'SELECT usuario_id, estado FROM apartados WHERE id = ?',
      [apartado_id]
    );

    if (apartados.length === 0) {
      return res.status(404).json({ error: 'Apartado no encontrado' });
    }

    const apartado = apartados[0];

    if (apartado.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No puede opinar sobre apartados de otros usuarios' });
    }

    if (apartado.estado !== 'completado') {
      return res.status(400).json({ error: 'Solo se puede opinar sobre apartados completados' });
    }

    // Crear opinión
    const [result] = await pool.query(
      `INSERT INTO opiniones_productos (usuario_id, apartado_id, producto_id, variante_id, calificacion, comentario)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, apartado_id, producto_id || null, variante_id || null, calificacion, comentario || null]
    );

    res.status(201).json({
      message: 'Opinión registrada exitosamente. Pendiente de aprobación.',
      opinionId: result.insertId
    });
  } catch (error) {
    console.error('Error creando opinión:', error);
    res.status(500).json({ error: 'Error al crear opinión' });
  }
});

/**
 * @swagger
 * /api/opiniones:
 *   get:
 *     summary: Listar opiniones
 *     tags: [Opiniones]
 */
router.get('/', async (req, res) => {
  try {
    const { producto_id, estado } = req.query;

    let query = `
      SELECT o.*,
        u.nombre AS usuario_nombre,
        p.nombre AS producto_nombre
      FROM opiniones_productos o
      INNER JOIN usuarios u ON o.usuario_id = u.id
      LEFT JOIN productos p ON o.producto_id = p.id
      WHERE 1=1
    `;

    const params = [];

    if (producto_id) {
      query += ' AND o.producto_id = ?';
      params.push(producto_id);
    }

    // Si no se especifica estado, mostrar solo aceptadas para público
    if (estado) {
      query += ' AND o.estado = ?';
      params.push(estado);
    } else {
      query += ' AND o.estado = "aceptada"';
    }

    query += ' ORDER BY o.creado_en DESC';

    const [opiniones] = await pool.query(query, params);
    res.json({ opiniones });
  } catch (error) {
    console.error('Error listando opiniones:', error);
    res.status(500).json({ error: 'Error al listar opiniones' });
  }
});

/**
 * @swagger
 * /api/opiniones/pendientes:
 *   get:
 *     summary: Listar opiniones pendientes de aprobación (Admin/Empleado)
 *     tags: [Opiniones]
 *     security:
 *       - bearerAuth: []
 */
router.get('/pendientes', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const [opiniones] = await pool.query(
      `SELECT o.*,
         u.nombre AS usuario_nombre,
         p.nombre AS producto_nombre
       FROM opiniones_productos o
       INNER JOIN usuarios u ON o.usuario_id = u.id
       LEFT JOIN productos p ON o.producto_id = p.id
       WHERE o.estado = 'pendiente'
       ORDER BY o.creado_en DESC`
    );

    res.json({ opiniones });
  } catch (error) {
    console.error('Error listando opiniones pendientes:', error);
    res.status(500).json({ error: 'Error al listar opiniones pendientes' });
  }
});

/**
 * @swagger
 * /api/opiniones/{id}/aprobar:
 *   patch:
 *     summary: Aprobar opinión (Admin/Empleado)
 *     tags: [Opiniones]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/aprobar', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    await pool.query('UPDATE opiniones_productos SET estado = "aceptada" WHERE id = ?', [req.params.id]);
    res.json({ message: 'Opinión aprobada exitosamente' });
  } catch (error) {
    console.error('Error aprobando opinión:', error);
    res.status(500).json({ error: 'Error al aprobar opinión' });
  }
});

/**
 * @swagger
 * /api/opiniones/{id}/rechazar:
 *   patch:
 *     summary: Rechazar opinión (Admin/Empleado)
 *     tags: [Opiniones]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/rechazar', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    await pool.query('UPDATE opiniones_productos SET estado = "denegada" WHERE id = ?', [req.params.id]);
    res.json({ message: 'Opinión rechazada exitosamente' });
  } catch (error) {
    console.error('Error rechazando opinión:', error);
    res.status(500).json({ error: 'Error al rechazar opinión' });
  }
});

// No se permite eliminar opiniones físicamente, solo cambiar su estado a 'denegada'

module.exports = router;
