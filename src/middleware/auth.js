const { pool } = require('../config/database');

/**
 * Middleware para verificar token de sesión en la base de datos
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    // Buscar sesión activa en la base de datos
    const [sessions] = await pool.query(
      `SELECT s.*, u.id, u.nombre, u.correo, u.rol, u.activo 
       FROM sesiones s
       INNER JOIN usuarios u ON s.usuario_id = u.id
       WHERE s.token = ? AND s.expira_en > NOW()`,
      [token]
    );

    if (sessions.length === 0) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }

    const session = sessions[0];

    // Verificar que el usuario esté activo
    if (!session.activo) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    // Adjuntar usuario a la petición
    req.user = {
      id: session.usuario_id,
      nombre: session.nombre,
      correo: session.correo,
      rol: session.rol
    };

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).json({ error: 'Error al verificar autenticación' });
  }
}

/**
 * Middleware para verificar roles específicos
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ 
        error: 'No tiene permisos para realizar esta acción',
        rolRequerido: allowedRoles,
        rolActual: req.user.rol
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};
