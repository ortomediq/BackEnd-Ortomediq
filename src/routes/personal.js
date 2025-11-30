const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * @swagger
 * /api/personal:
 *   get:
 *     summary: Listar todo el personal (Admin)
 *     tags: [Personal]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [personal] = await pool.query(`
      SELECT 
        p.*,
        u.correo,
        u.rol,
        u.activo AS usuario_activo,
        CONCAT(p.nombre, ' ', p.apellido_paterno, ' ', IFNULL(p.apellido_materno, '')) AS nombre_completo
      FROM personal p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.apellido_paterno, p.nombre
    `);

    res.json({ personal });
  } catch (error) {
    console.error('Error listando personal:', error);
    res.status(500).json({ error: 'Error al listar personal' });
  }
});

/**
 * @swagger
 * /api/personal/{id}:
 *   get:
 *     summary: Obtener información de personal por ID
 *     tags: [Personal]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [personal] = await pool.query(`
      SELECT 
        p.*,
        u.correo,
        u.rol,
        u.activo AS usuario_activo,
        CONCAT(p.nombre, ' ', p.apellido_paterno, ' ', IFNULL(p.apellido_materno, '')) AS nombre_completo
      FROM personal p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (personal.length === 0) {
      return res.status(404).json({ error: 'Personal no encontrado' });
    }

    res.json({ personal: personal[0] });
  } catch (error) {
    console.error('Error obteniendo personal:', error);
    res.status(500).json({ error: 'Error al obtener personal' });
  }
});

/**
 * @swagger
 * /api/personal/usuario/{usuario_id}:
 *   get:
 *     summary: Obtener información de personal por usuario_id
 *     tags: [Personal]
 *     security:
 *       - bearerAuth: []
 */
router.get('/usuario/:usuario_id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [personal] = await pool.query(`
      SELECT 
        p.*,
        u.correo,
        u.rol,
        u.activo AS usuario_activo,
        CONCAT(p.nombre, ' ', p.apellido_paterno, ' ', IFNULL(p.apellido_materno, '')) AS nombre_completo
      FROM personal p
      INNER JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.usuario_id = ?
    `, [req.params.usuario_id]);

    if (personal.length === 0) {
      return res.status(404).json({ error: 'Personal no encontrado' });
    }

    res.json({ personal: personal[0] });
  } catch (error) {
    console.error('Error obteniendo personal por usuario:', error);
    res.status(500).json({ error: 'Error al obtener personal' });
  }
});

/**
 * @swagger
 * /api/personal:
 *   post:
 *     summary: Registrar nuevo personal (Admin)
 *     tags: [Personal]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const {
      usuario_id,
      nombre,
      apellido_paterno,
      apellido_materno,
      rfc,
      curp,
      nss,
      fecha_nacimiento,
      telefono,
      direccion,
      codigo_postal
    } = req.body;

    // Validaciones
    if (!usuario_id || !nombre || !apellido_paterno || !rfc || !curp || !nss || !fecha_nacimiento) {
      return res.status(400).json({ 
        error: 'Campos requeridos: usuario_id, nombre, apellido_paterno, rfc, curp, nss, fecha_nacimiento' 
      });
    }

    // Validar formato RFC (13 caracteres)
    if (rfc.length !== 13) {
      return res.status(400).json({ error: 'El RFC debe tener 13 caracteres' });
    }

    // Validar formato CURP (18 caracteres)
    if (curp.length !== 18) {
      return res.status(400).json({ error: 'El CURP debe tener 18 caracteres' });
    }

    // Validar formato NSS (11 dígitos)
    if (nss.length !== 11 || !/^\d+$/.test(nss)) {
      return res.status(400).json({ error: 'El NSS debe tener 11 dígitos numéricos' });
    }

    // Verificar que el usuario exista y sea admin o empleado
    const [usuario] = await pool.query(
      'SELECT id, rol FROM usuarios WHERE id = ?',
      [usuario_id]
    );

    if (usuario.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuario[0].rol === 'usuario') {
      return res.status(400).json({ 
        error: 'Solo se puede registrar personal para usuarios con rol admin o empleado' 
      });
    }

    // Verificar que no exista ya un registro de personal para este usuario
    const [existente] = await pool.query(
      'SELECT id FROM personal WHERE usuario_id = ?',
      [usuario_id]
    );

    if (existente.length > 0) {
      return res.status(409).json({ error: 'Ya existe un registro de personal para este usuario' });
    }

    const [result] = await pool.query(`
      INSERT INTO personal (
        usuario_id, nombre, apellido_paterno, apellido_materno,
        rfc, curp, nss, fecha_nacimiento, telefono, direccion, codigo_postal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      usuario_id,
      nombre,
      apellido_paterno,
      apellido_materno || null,
      rfc.toUpperCase(),
      curp.toUpperCase(),
      nss,
      fecha_nacimiento,
      telefono || null,
      direccion || null,
      codigo_postal || null
    ]);

    res.status(201).json({
      message: 'Personal registrado exitosamente',
      personalId: result.insertId
    });
  } catch (error) {
    console.error('Error registrando personal:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('rfc')) {
        return res.status(409).json({ error: 'El RFC ya está registrado' });
      }
      if (error.message.includes('curp')) {
        return res.status(409).json({ error: 'El CURP ya está registrado' });
      }
      if (error.message.includes('nss')) {
        return res.status(409).json({ error: 'El NSS ya está registrado' });
      }
      return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
    }
    res.status(500).json({ error: 'Error al registrar personal' });
  }
});

/**
 * @swagger
 * /api/personal/{id}:
 *   put:
 *     summary: Actualizar información de personal (Admin)
 *     tags: [Personal]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      rfc,
      curp,
      nss,
      fecha_nacimiento,
      telefono,
      direccion,
      codigo_postal
    } = req.body;

    const updates = [];
    const values = [];

    if (nombre) {
      updates.push('nombre = ?');
      values.push(nombre);
    }
    if (apellido_paterno) {
      updates.push('apellido_paterno = ?');
      values.push(apellido_paterno);
    }
    if (apellido_materno !== undefined) {
      updates.push('apellido_materno = ?');
      values.push(apellido_materno);
    }
    if (rfc) {
      if (rfc.length !== 13) {
        return res.status(400).json({ error: 'El RFC debe tener 13 caracteres' });
      }
      updates.push('rfc = ?');
      values.push(rfc.toUpperCase());
    }
    if (curp) {
      if (curp.length !== 18) {
        return res.status(400).json({ error: 'El CURP debe tener 18 caracteres' });
      }
      updates.push('curp = ?');
      values.push(curp.toUpperCase());
    }
    if (nss) {
      if (nss.length !== 11 || !/^\d+$/.test(nss)) {
        return res.status(400).json({ error: 'El NSS debe tener 11 dígitos numéricos' });
      }
      updates.push('nss = ?');
      values.push(nss);
    }
    if (fecha_nacimiento) {
      updates.push('fecha_nacimiento = ?');
      values.push(fecha_nacimiento);
    }
    if (telefono !== undefined) {
      updates.push('telefono = ?');
      values.push(telefono);
    }
    if (direccion !== undefined) {
      updates.push('direccion = ?');
      values.push(direccion);
    }
    if (codigo_postal !== undefined) {
      updates.push('codigo_postal = ?');
      values.push(codigo_postal);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(req.params.id);

    await pool.query(
      `UPDATE personal SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Personal actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando personal:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('rfc')) {
        return res.status(409).json({ error: 'El RFC ya está registrado' });
      }
      if (error.message.includes('curp')) {
        return res.status(409).json({ error: 'El CURP ya está registrado' });
      }
      if (error.message.includes('nss')) {
        return res.status(409).json({ error: 'El NSS ya está registrado' });
      }
    }
    res.status(500).json({ error: 'Error al actualizar personal' });
  }
});

module.exports = router;
