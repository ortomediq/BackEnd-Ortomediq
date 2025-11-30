const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Rate limiting para mensajes de chat
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10,
  message: { error: 'Demasiados mensajes. Intente más tarde.' }
});

/**
 * @swagger
 * /api/chats/mi-chat:
 *   get:
 *     summary: Obtener o crear chat del usuario autenticado
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 */
router.get('/mi-chat', authenticateToken, async (req, res) => {
  try {
    let [chats] = await pool.query(
      'SELECT * FROM chats WHERE usuario_id = ?',
      [req.user.id]
    );

    // Si no existe, crear el chat
    if (chats.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO chats (usuario_id, asunto) VALUES (?, ?)',
        [req.user.id, 'Consulta general']
      );

      [chats] = await pool.query(
        'SELECT * FROM chats WHERE id = ?',
        [result.insertId]
      );
    }

    res.json({ chat: chats[0] });
  } catch (error) {
    console.error('Error obteniendo chat:', error);
    res.status(500).json({ error: 'Error al obtener chat' });
  }
});

/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Listar todos los chats (Empleado/Admin)
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { estado } = req.query;

    let query = `
      SELECT c.*,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo
      FROM chats c
      INNER JOIN usuarios u ON c.usuario_id = u.id
    `;

    const params = [];

    if (estado) {
      query += ' WHERE c.estado = ?';
      params.push(estado);
    }

    query += ' ORDER BY c.actualizado_en DESC';

    const [chats] = await pool.query(query, params);
    res.json({ chats });
  } catch (error) {
    console.error('Error listando chats:', error);
    res.status(500).json({ error: 'Error al listar chats' });
  }
});

/**
 * @swagger
 * /api/chats/{id}/mensajes:
 *   get:
 *     summary: Obtener mensajes de un chat
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/mensajes', authenticateToken, async (req, res) => {
  try {
    const chatId = req.params.id;

    // Verificar acceso al chat
    const [chats] = await pool.query('SELECT usuario_id FROM chats WHERE id = ?', [chatId]);
    if (chats.length === 0) {
      return res.status(404).json({ error: 'Chat no encontrado' });
    }

    // Usuario solo puede ver su propio chat
    if (req.user.rol === 'usuario' && chats[0].usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tiene permiso para ver este chat' });
    }

    const [mensajes] = await pool.query(
      `SELECT m.*,
         u.nombre AS emisor_nombre,
         u.rol AS emisor_rol
       FROM chats_mensajes m
       INNER JOIN usuarios u ON m.emisor_id = u.id
       WHERE m.chat_id = ?
       ORDER BY m.creado_en ASC`,
      [chatId]
    );

    res.json({ mensajes });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

/**
 * @swagger
 * /api/chats/{id}/mensajes:
 *   post:
 *     summary: Enviar mensaje en un chat
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/mensajes', authenticateToken, chatLimiter, async (req, res) => {
  try {
    const chatId = req.params.id;
    const { mensaje } = req.body;

    if (!mensaje || mensaje.trim().length === 0) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    // Verificar acceso al chat
    const [chats] = await pool.query('SELECT usuario_id FROM chats WHERE id = ?', [chatId]);
    if (chats.length === 0) {
      return res.status(404).json({ error: 'Chat no encontrado' });
    }

    // Usuario solo puede enviar mensajes a su propio chat
    if (req.user.rol === 'usuario' && chats[0].usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tiene permiso para enviar mensajes a este chat' });
    }

    // Insertar mensaje
    const [result] = await pool.query(
      'INSERT INTO chats_mensajes (chat_id, emisor_id, mensaje) VALUES (?, ?, ?)',
      [chatId, req.user.id, mensaje.trim()]
    );

    // Actualizar timestamp del chat
    await pool.query('UPDATE chats SET actualizado_en = NOW() WHERE id = ?', [chatId]);

    res.status(201).json({
      message: 'Mensaje enviado exitosamente',
      mensajeId: result.insertId
    });
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

/**
 * @swagger
 * /api/chats/{id}/cerrar:
 *   patch:
 *     summary: Cerrar chat (Empleado/Admin)
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/cerrar', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    await pool.query('UPDATE chats SET estado = "cerrado" WHERE id = ?', [req.params.id]);
    res.json({ message: 'Chat cerrado exitosamente' });
  } catch (error) {
    console.error('Error cerrando chat:', error);
    res.status(500).json({ error: 'Error al cerrar chat' });
  }
});

module.exports = router;
