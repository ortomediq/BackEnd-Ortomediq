const express = require('express');
const router = express.Router();
const { pool, withTransaction } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

function generateCode() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `VTA-${timestamp}-${random}`.toUpperCase();
}

/**
 * @swagger
 * /api/ventas:
 *   post:
 *     summary: Registrar venta directa (Empleado/Admin)
 *     tags: [Ventas]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { usuario_id, items, metodo_pago, nota } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }

    const result = await withTransaction(async (connection) => {
      // Validar stock disponible
      for (const item of items) {
        const { producto_id, variante_id, cantidad } = item;

        if (!producto_id || !cantidad || cantidad <= 0) {
          throw new Error('Datos de item inválidos');
        }

        if (variante_id) {
          const [variantes] = await connection.query(
            'SELECT cantidad, precio FROM variantes_productos WHERE id = ? AND estado = "habilitado"',
            [variante_id]
          );

          if (variantes.length === 0) {
            throw new Error(`Variante ${variante_id} no encontrada`);
          }

          if (variantes[0].cantidad < cantidad) {
            throw new Error(`Stock insuficiente para variante ${variante_id}`);
          }

          item.precio_unitario = variantes[0].precio;
        } else {
          const [productos] = await connection.query(
            'SELECT cantidad_general, precio_defecto, es_tallable FROM productos WHERE id = ? AND estado = "habilitado"',
            [producto_id]
          );

          if (productos.length === 0) {
            throw new Error(`Producto ${producto_id} no encontrado`);
          }

          if (productos[0].es_tallable) {
            throw new Error(`Producto ${producto_id} requiere variante`);
          }

          if (productos[0].cantidad_general < cantidad) {
            throw new Error(`Stock insuficiente para producto ${producto_id}`);
          }

          item.precio_unitario = productos[0].precio_defecto;
        }
      }

      // Calcular total
      const total = items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
      const codigo = generateCode();

      // Crear venta
      const [ventaResult] = await connection.query(
        `INSERT INTO ventas (usuario_id, empleado_id, codigo, total, origen, metodo_pago, nota)
         VALUES (?, ?, ?, ?, 'venta_directa', ?, ?)`,
        [usuario_id || null, req.user.id, codigo, total, metodo_pago || 'efectivo', nota || null]
      );

      const ventaId = ventaResult.insertId;

      // Insertar detalles y actualizar stock
      for (const item of items) {
        await connection.query(
          'INSERT INTO ventas_detalle (venta_id, producto_id, variante_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?)',
          [ventaId, item.producto_id, item.variante_id || null, item.cantidad, item.precio_unitario]
        );

        if (item.variante_id) {
          await connection.query(
            'UPDATE variantes_productos SET cantidad = cantidad - ? WHERE id = ?',
            [item.cantidad, item.variante_id]
          );

          await connection.query(
            `INSERT INTO bitacoras_stock (variante_id, usuario_id, cambio_cantidad, tipo_movimiento, referencia, descripcion)
             VALUES (?, ?, ?, 'salida', ?, 'Venta directa')`,
            [item.variante_id, req.user.id, -item.cantidad, codigo]
          );
        } else {
          await connection.query(
            'UPDATE productos SET cantidad_general = cantidad_general - ? WHERE id = ?',
            [item.cantidad, item.producto_id]
          );

          await connection.query(
            `INSERT INTO bitacoras_stock (producto_id, usuario_id, cambio_cantidad, tipo_movimiento, referencia, descripcion)
             VALUES (?, ?, ?, 'salida', ?, 'Venta directa')`,
            [item.producto_id, req.user.id, -item.cantidad, codigo]
          );
        }
      }

      return { ventaId, codigo, total };
    });

    res.status(201).json({
      message: 'Venta registrada exitosamente',
      ...result
    });
  } catch (error) {
    console.error('Error registrando venta:', error);
    res.status(400).json({ error: error.message || 'Error al registrar venta' });
  }
});

/**
 * @swagger
 * /api/ventas:
 *   get:
 *     summary: Listar ventas
 *     tags: [Ventas]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { origen, estado, fecha_desde, fecha_hasta } = req.query;

    let query = `
      SELECT v.*,
        u.nombre AS usuario_nombre,
        e.nombre AS empleado_nombre
      FROM ventas v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN usuarios e ON v.empleado_id = e.id
      WHERE 1=1
    `;

    const params = [];

    if (origen) {
      query += ' AND v.origen = ?';
      params.push(origen);
    }
    if (estado) {
      query += ' AND v.estado = ?';
      params.push(estado);
    }
    if (fecha_desde) {
      query += ' AND v.fecha >= ?';
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      query += ' AND v.fecha <= ?';
      params.push(fecha_hasta);
    }

    query += ' ORDER BY v.fecha DESC';

    const [ventas] = await pool.query(query, params);
    res.json({ ventas });
  } catch (error) {
    console.error('Error listando ventas:', error);
    res.status(500).json({ error: 'Error al listar ventas' });
  }
});

/**
 * @swagger
 * /api/ventas/{id}:
 *   get:
 *     summary: Obtener venta por ID con detalles
 *     tags: [Ventas]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const [ventas] = await pool.query(
      `SELECT v.*,
         u.nombre AS usuario_nombre,
         e.nombre AS empleado_nombre
       FROM ventas v
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       LEFT JOIN usuarios e ON v.empleado_id = e.id
       WHERE v.id = ?`,
      [req.params.id]
    );

    if (ventas.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const venta = ventas[0];

    const [detalles] = await pool.query(
      `SELECT vd.*,
         p.nombre AS producto_nombre,
         v.color AS variante_color,
         t.codigo AS talla_codigo
       FROM ventas_detalle vd
       INNER JOIN productos p ON vd.producto_id = p.id
       LEFT JOIN variantes_productos v ON vd.variante_id = v.id
       LEFT JOIN tallas t ON v.talla_id = t.id
       WHERE vd.venta_id = ?`,
      [venta.id]
    );

    venta.detalles = detalles;

    res.json({ venta });
  } catch (error) {
    console.error('Error obteniendo venta:', error);
    res.status(500).json({ error: 'Error al obtener venta' });
  }
});

module.exports = router;
