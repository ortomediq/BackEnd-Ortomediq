const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { pool } = require('../config/database');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');

// Rate limiting para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: { error: 'Demasiados intentos de inicio de sesión. Intente de nuevo más tarde.' }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correo
 *               - contrasena
 *             properties:
 *               correo:
 *                 type: string
 *                 format: email
 *               contrasena:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    // Buscar usuario
    const [users] = await pool.query(
      'SELECT id, nombre, correo, contrasena_hash, rol, activo FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];

    // Verificar que el usuario esté activo
    if (!user.activo) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(contrasena, user.contrasena_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expiryHours = parseInt(process.env.SESSION_EXPIRY_HOURS) || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Guardar sesión en la base de datos
    await pool.query(
      'INSERT INTO sesiones (usuario_id, token, expira_en) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    // Actualizar último ingreso
    await pool.query(
      'UPDATE usuarios SET ultimo_ingreso = NOW() WHERE id = ?',
      [user.id]
    );

    res.json({
      message: 'Login exitoso',
      token,
      expiresAt,
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Eliminar sesión de la base de datos
    await pool.query('DELETE FROM sesiones WHERE token = ?', [token]);

    res.json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtener información del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información del usuario
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, nombre, correo, rol, activo, creado_en, ultimo_ingreso FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error al obtener información del usuario' });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renovar token de sesión
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token renovado exitosamente
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const oldToken = authHeader && authHeader.split(' ')[1];

    // Generar nuevo token
    const newToken = crypto.randomBytes(32).toString('hex');
    const expiryHours = parseInt(process.env.SESSION_EXPIRY_HOURS) || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Actualizar sesión
    await pool.query(
      'UPDATE sesiones SET token = ?, expira_en = ? WHERE token = ?',
      [newToken, expiresAt, oldToken]
    );

    res.json({
      message: 'Token renovado exitosamente',
      token: newToken,
      expiresAt
    });
  } catch (error) {
    console.error('Error renovando token:', error);
    res.status(500).json({ error: 'Error al renovar token' });
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - correo
 *               - contrasena
 *             properties:
 *               nombre:
 *                 type: string
 *               correo:
 *                 type: string
 *                 format: email
 *               contrasena:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 */
router.post('/register', async (req, res) => {
  try {
    const { nombre, correo, contrasena } = req.body;

    if (!nombre || !correo || !contrasena) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Verificar si el correo ya existe
    const [existing] = await pool.query(
      'SELECT id FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(contrasena, 10);

    // Insertar usuario
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, correo, contrasena_hash, rol) VALUES (?, ?, ?, ?)',
      [nombre, correo, passwordHash, 'usuario']
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

module.exports = router;
