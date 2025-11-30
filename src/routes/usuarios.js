const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     summary: Listar todos los usuarios (Admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, nombre, correo, rol, activo, creado_en, ultimo_ingreso FROM usuarios ORDER BY creado_en DESC'
    );
    res.json({ usuarios: users });
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

/**
 * @swagger
 * /api/usuarios/{id}:
 *   get:
 *     summary: Obtener usuario por ID
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario encontrado
 */
router.get('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, nombre, correo, rol, activo, creado_en, ultimo_ingreso FROM usuarios WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ usuario: users[0] });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

/**
 * @swagger
 * /api/usuarios:
 *   post:
 *     summary: Crear nuevo usuario (Admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { nombre, correo, contrasena, rol } = req.body;

    if (!nombre || !correo || !contrasena || !rol) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const validRoles = ['admin', 'empleado', 'usuario'];
    if (!validRoles.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // Verificar si el correo ya existe
    const [existing] = await pool.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(contrasena, 10);

    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, correo, contrasena_hash, rol) VALUES (?, ?, ?, ?)',
      [nombre, correo, passwordHash, rol]
    );

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

/**
 * @swagger
 * /api/usuarios/{id}:
 *   put:
 *     summary: Actualizar usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { nombre, correo, rol, contrasena } = req.body;
    const userId = req.params.id;

    const updates = [];
    const values = [];

    if (nombre) {
      updates.push('nombre = ?');
      values.push(nombre);
    }
    if (correo) {
      updates.push('correo = ?');
      values.push(correo);
    }
    if (rol) {
      const validRoles = ['admin', 'empleado', 'usuario'];
      if (!validRoles.includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }
      updates.push('rol = ?');
      values.push(rol);
    }
    if (contrasena) {
      const passwordHash = await bcrypt.hash(contrasena, 10);
      updates.push('contrasena_hash = ?');
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(userId);

    await pool.query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

/**
 * @swagger
 * /api/usuarios/{id}/toggle-status:
 *   patch:
 *     summary: Activar/desactivar usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/toggle-status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const userId = req.params.id;

    // No permitir desactivar al propio usuario
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'No puede desactivar su propia cuenta' });
    }

    const [users] = await pool.query('SELECT activo FROM usuarios WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const newStatus = !users[0].activo;
    await pool.query('UPDATE usuarios SET activo = ? WHERE id = ?', [newStatus, userId]);

    // Si se desactiva, eliminar todas sus sesiones
    if (!newStatus) {
      await pool.query('DELETE FROM sesiones WHERE usuario_id = ?', [userId]);
    }

    res.json({
      message: `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
      activo: newStatus
    });
  } catch (error) {
    console.error('Error cambiando estado de usuario:', error);
    res.status(500).json({ error: 'Error al cambiar estado del usuario' });
  }
});

// No se permite eliminar usuarios físicamente, solo desactivarlos con toggle-status
// La desactivación ya maneja la eliminación de sesiones automáticamente

module.exports = router;
