const express = require('express');
const router = express.Router();
const { pool, withTransaction } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * Genera un código único para el apartado
 */
function generateCode() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `APT-${timestamp}-${random}`.toUpperCase();
}

/**
 * @swagger
 * /api/apartados:
 *   post:
 *     summary: Crear nuevo apartado (reserva)
 *     tags: [Apartados]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { items, nota } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }

    const result = await withTransaction(async (connection) => {
      // Validar stock disponible para cada item
      for (const item of items) {
        const { producto_id, variante_id, cantidad } = item;
        
        if (!producto_id || !cantidad || cantidad <= 0) {
          throw new Error('Datos de item inválidos');
        }

        if (variante_id) {
          // Producto con variante
          const [variantes] = await connection.query(
            'SELECT cantidad, cantidad_reservada, precio FROM variantes_productos WHERE id = ? AND estado = "habilitado"',
            [variante_id]
          );
          
          if (variantes.length === 0) {
            throw new Error(`Variante ${variante_id} no encontrada o inhabilitada`);
          }
          
          const disponible = variantes[0].cantidad - variantes[0].cantidad_reservada;
          if (disponible < cantidad) {
            throw new Error(`Stock insuficiente para variante ${variante_id}. Disponible: ${disponible}`);
          }
          
          item.precio_unitario = variantes[0].precio;
        } else {
          // Producto sin variante
          const [productos] = await connection.query(
            'SELECT cantidad_general, cantidad_reservada, precio_defecto, es_tallable FROM productos WHERE id = ? AND estado = "habilitado"',
            [producto_id]
          );
          
          if (productos.length === 0) {
            throw new Error(`Producto ${producto_id} no encontrado o inhabilitado`);
          }
          
          if (productos[0].es_tallable) {
            throw new Error(`Producto ${producto_id} requiere seleccionar una variante`);
          }
          
          const disponible = productos[0].cantidad_general - productos[0].cantidad_reservada;
          if (disponible < cantidad) {
            throw new Error(`Stock insuficiente para producto ${producto_id}. Disponible: ${disponible}`);
          }
          
          item.precio_unitario = productos[0].precio_defecto;
        }
      }

      // Calcular total
      const total = items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);

      // Calcular expiración (48 horas)
      const expiryHours = parseInt(process.env.APARTADO_EXPIRY_HOURS) || 48;
      const expiracion = new Date();
      expiracion.setHours(expiracion.getHours() + expiryHours);

      // Crear apartado
      const codigo = generateCode();
      const [apartadoResult] = await connection.query(
        'INSERT INTO apartados (usuario_id, codigo, total, expiracion, nota) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, codigo, total, expiracion, nota || null]
      );

      const apartadoId = apartadoResult.insertId;

      // Insertar detalles e incrementar cantidad_reservada
      for (const item of items) {
        await connection.query(
          'INSERT INTO apartado_detalles (apartado_id, producto_id, variante_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?)',
          [apartadoId, item.producto_id, item.variante_id || null, item.cantidad, item.precio_unitario]
        );

        if (item.variante_id) {
          await connection.query(
            'UPDATE variantes_productos SET cantidad_reservada = cantidad_reservada + ? WHERE id = ?',
            [item.cantidad, item.variante_id]
          );
        } else {
          await connection.query(
            'UPDATE productos SET cantidad_reservada = cantidad_reservada + ? WHERE id = ?',
            [item.cantidad, item.producto_id]
          );
        }
      }

      return { apartadoId, codigo, total, expiracion };
    });

    res.status(201).json({
      message: 'Apartado creado exitosamente',
      ...result
    });
  } catch (error) {
    console.error('Error creando apartado:', error);
    res.status(400).json({ error: error.message || 'Error al crear apartado' });
  }
});

/**
 * @swagger
 * /api/apartados:
 *   get:
 *     summary: Listar apartados
 *     tags: [Apartados]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { estado } = req.query;
    
    let query = `
      SELECT a.*, u.nombre AS usuario_nombre, u.correo AS usuario_correo
      FROM apartados a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
    `;
    
    const params = [];
    const conditions = [];

    // Usuario solo ve sus propios apartados; empleados y admin ven todos
    if (req.user.rol === 'usuario') {
      conditions.push('a.usuario_id = ?');
      params.push(req.user.id);
    }

    if (estado) {
      conditions.push('a.estado = ?');
      params.push(estado);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.creado_en DESC';

    const [apartados] = await pool.query(query, params);
    res.json({ apartados });
  } catch (error) {
    console.error('Error listando apartados:', error);
    res.status(500).json({ error: 'Error al listar apartados' });
  }
});

/**
 * @swagger
 * /api/apartados/{id}:
 *   get:
 *     summary: Obtener apartado por ID con detalles
 *     tags: [Apartados]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [apartados] = await pool.query(
      `SELECT a.*, u.nombre AS usuario_nombre, u.correo AS usuario_correo
       FROM apartados a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (apartados.length === 0) {
      return res.status(404).json({ error: 'Apartado no encontrado' });
    }

    const apartado = apartados[0];

    // Usuario solo puede ver sus propios apartados
    if (req.user.rol === 'usuario' && apartado.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tiene permiso para ver este apartado' });
    }

    // Obtener detalles
    const [detalles] = await pool.query(
      `SELECT ad.*,
         p.nombre AS producto_nombre,
         v.color AS variante_color,
         t.codigo AS talla_codigo
       FROM apartado_detalles ad
       INNER JOIN productos p ON ad.producto_id = p.id
       LEFT JOIN variantes_productos v ON ad.variante_id = v.id
       LEFT JOIN tallas t ON v.talla_id = t.id
       WHERE ad.apartado_id = ?`,
      [apartado.id]
    );

    apartado.detalles = detalles;

    res.json({ apartado });
  } catch (error) {
    console.error('Error obteniendo apartado:', error);
    res.status(500).json({ error: 'Error al obtener apartado' });
  }
});

/**
 * @swagger
 * /api/apartados/{id}/cancelar:
 *   post:
 *     summary: Cancelar apartado y liberar stock reservado
 *     tags: [Apartados]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/cancelar', authenticateToken, async (req, res) => {
  try {
    const apartadoId = req.params.id;

    await withTransaction(async (connection) => {
      const [apartados] = await connection.query(
        'SELECT usuario_id, estado FROM apartados WHERE id = ?',
        [apartadoId]
      );

      if (apartados.length === 0) {
        throw new Error('Apartado no encontrado');
      }

      const apartado = apartados[0];

      // Verificar permisos
      if (req.user.rol === 'usuario' && apartado.usuario_id !== req.user.id) {
        throw new Error('No tiene permiso para cancelar este apartado');
      }

      if (apartado.estado !== 'activo') {
        throw new Error('Solo se pueden cancelar apartados activos');
      }

      // Obtener detalles
      const [detalles] = await connection.query(
        'SELECT producto_id, variante_id, cantidad FROM apartado_detalles WHERE apartado_id = ?',
        [apartadoId]
      );

      // Liberar stock reservado
      for (const detalle of detalles) {
        if (detalle.variante_id) {
          await connection.query(
            'UPDATE variantes_productos SET cantidad_reservada = cantidad_reservada - ? WHERE id = ?',
            [detalle.cantidad, detalle.variante_id]
          );
        } else {
          await connection.query(
            'UPDATE productos SET cantidad_reservada = cantidad_reservada - ? WHERE id = ?',
            [detalle.cantidad, detalle.producto_id]
          );
        }
      }

      // Marcar apartado como cancelado
      await connection.query(
        'UPDATE apartados SET estado = "cancelado" WHERE id = ?',
        [apartadoId]
      );
    });

    res.json({ message: 'Apartado cancelado exitosamente' });
  } catch (error) {
    console.error('Error cancelando apartado:', error);
    res.status(400).json({ error: error.message || 'Error al cancelar apartado' });
  }
});

/**
 * @swagger
 * /api/apartados/{id}/convertir-venta:
 *   post:
 *     summary: Convertir apartado a venta (Empleado/Admin)
 *     tags: [Apartados]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/convertir-venta', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const apartadoId = req.params.id;
    const { metodo_pago } = req.body;

    const result = await withTransaction(async (connection) => {
      const [apartados] = await connection.query(
        'SELECT * FROM apartados WHERE id = ?',
        [apartadoId]
      );

      if (apartados.length === 0) {
        throw new Error('Apartado no encontrado');
      }

      const apartado = apartados[0];

      if (apartado.estado !== 'activo') {
        throw new Error('Solo se pueden convertir apartados activos');
      }

      // Obtener detalles
      const [detalles] = await connection.query(
        'SELECT * FROM apartado_detalles WHERE apartado_id = ?',
        [apartadoId]
      );

      // Generar código de venta
      const codigoVenta = `VTA-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();

      // Crear venta
      const [ventaResult] = await connection.query(
        `INSERT INTO ventas (usuario_id, empleado_id, apartado_id, codigo, total, origen, metodo_pago, estado)
         VALUES (?, ?, ?, ?, ?, 'apartado', ?, 'pagado')`,
        [apartado.usuario_id, req.user.id, apartadoId, codigoVenta, apartado.total, metodo_pago || 'efectivo']
      );

      const ventaId = ventaResult.insertId;

      // Insertar detalles de venta y actualizar stock
      for (const detalle of detalles) {
        await connection.query(
          'INSERT INTO ventas_detalle (venta_id, producto_id, variante_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?)',
          [ventaId, detalle.producto_id, detalle.variante_id, detalle.cantidad, detalle.precio_unitario]
        );

        // Disminuir cantidad_reservada y cantidad real
        if (detalle.variante_id) {
          await connection.query(
            'UPDATE variantes_productos SET cantidad = cantidad - ?, cantidad_reservada = cantidad_reservada - ? WHERE id = ?',
            [detalle.cantidad, detalle.cantidad, detalle.variante_id]
          );

          // Registrar en bitácora
          await connection.query(
            `INSERT INTO bitacoras_stock (variante_id, usuario_id, cambio_cantidad, tipo_movimiento, referencia, descripcion)
             VALUES (?, ?, ?, 'salida', ?, ?)`,
            [detalle.variante_id, req.user.id, -detalle.cantidad, codigoVenta, `Venta de apartado ${apartado.codigo}`]
          );
        } else {
          await connection.query(
            'UPDATE productos SET cantidad_general = cantidad_general - ?, cantidad_reservada = cantidad_reservada - ? WHERE id = ?',
            [detalle.cantidad, detalle.cantidad, detalle.producto_id]
          );

          // Registrar en bitácora
          await connection.query(
            `INSERT INTO bitacoras_stock (producto_id, usuario_id, cambio_cantidad, tipo_movimiento, referencia, descripcion)
             VALUES (?, ?, ?, 'salida', ?, ?)`,
            [detalle.producto_id, req.user.id, -detalle.cantidad, codigoVenta, `Venta de apartado ${apartado.codigo}`]
          );
        }
      }

      // Marcar apartado como completado
      await connection.query(
        'UPDATE apartados SET estado = "completado" WHERE id = ?',
        [apartadoId]
      );

      return { ventaId, codigoVenta };
    });

    res.json({
      message: 'Apartado convertido a venta exitosamente',
      ...result
    });
  } catch (error) {
    console.error('Error convirtiendo apartado a venta:', error);
    res.status(400).json({ error: error.message || 'Error al convertir apartado' });
  }
});

module.exports = router;
