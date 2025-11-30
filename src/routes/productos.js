const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * @swagger
 * /api/productos:
 *   get:
 *     summary: Listar todos los productos con disponibilidad
 *     tags: [Productos]
 */
router.get('/', async (req, res) => {
  try {
    const { estado, proveedor_id, marca_id } = req.query;
    
    let query = `
      SELECT p.*,
        pr.nombre AS proveedor_nombre,
        m.nombre AS marca_nombre,
        mo.nombre AS modelo_nombre,
        (p.cantidad_general - p.cantidad_reservada) AS disponible
      FROM productos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      LEFT JOIN marcas m ON p.marca_id = m.id
      LEFT JOIN modelos mo ON p.modelo_id = mo.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (estado) {
      query += ' AND p.estado = ?';
      params.push(estado);
    }
    if (proveedor_id) {
      query += ' AND p.proveedor_id = ?';
      params.push(proveedor_id);
    }
    if (marca_id) {
      query += ' AND p.marca_id = ?';
      params.push(marca_id);
    }
    
    query += ' ORDER BY p.creado_en DESC';
    
    const [productos] = await pool.query(query, params);
    res.json({ productos });
  } catch (error) {
    console.error('Error listando productos:', error);
    res.status(500).json({ error: 'Error al listar productos' });
  }
});

/**
 * @swagger
 * /api/productos/{id}:
 *   get:
 *     summary: Obtener producto por ID con variantes
 *     tags: [Productos]
 */
router.get('/:id', async (req, res) => {
  try {
    const [productos] = await pool.query(`
      SELECT p.*,
        pr.nombre AS proveedor_nombre,
        m.nombre AS marca_nombre,
        mo.nombre AS modelo_nombre,
        (p.cantidad_general - p.cantidad_reservada) AS disponible
      FROM productos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      LEFT JOIN marcas m ON p.marca_id = m.id
      LEFT JOIN modelos mo ON p.modelo_id = mo.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const producto = productos[0];

    // Obtener variantes si es tallable
    if (producto.es_tallable) {
      const [variantes] = await pool.query(`
        SELECT v.*,
          t.codigo AS talla_codigo,
          t.descripcion AS talla_descripcion,
          mo.nombre AS modelo_nombre,
          (v.cantidad - v.cantidad_reservada) AS disponible
        FROM variantes_productos v
        LEFT JOIN tallas t ON v.talla_id = t.id
        LEFT JOIN modelos mo ON v.modelo_id = mo.id
        WHERE v.producto_id = ?
        ORDER BY t.codigo
      `, [producto.id]);
      
      producto.variantes = variantes;
    }

    res.json({ producto });
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

/**
 * @swagger
 * /api/productos:
 *   post:
 *     summary: Crear nuevo producto (Admin/Empleado)
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      marca_id,
      modelo_id,
      es_tallable,
      precio_defecto,
      cantidad_general,
      proveedor_id,
      codigo_barras_general,
      estado
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const [result] = await pool.query(`
      INSERT INTO productos (
        nombre, descripcion, marca_id, modelo_id, es_tallable,
        precio_defecto, cantidad_general, proveedor_id,
        codigo_barras_general, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nombre,
      descripcion || null,
      marca_id || null,
      modelo_id || null,
      es_tallable || 0,
      precio_defecto || null,
      cantidad_general || 0,
      proveedor_id || null,
      codigo_barras_general || null,
      estado || 'habilitado'
    ]);

    // Registrar en bitácora si se creó con cantidad
    if (cantidad_general > 0) {
      await pool.query(`
        INSERT INTO bitacoras_stock (
          producto_id, usuario_id, cambio_cantidad,
          tipo_movimiento, descripcion
        ) VALUES (?, ?, ?, 'entrada', 'Inventario inicial')
      `, [result.insertId, req.user.id, cantidad_general]);
    }

    res.status(201).json({
      message: 'Producto creado exitosamente',
      productoId: result.insertId
    });
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

/**
 * @swagger
 * /api/productos/{id}:
 *   put:
 *     summary: Actualizar producto
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      marca_id,
      modelo_id,
      precio_defecto,
      proveedor_id,
      codigo_barras_general,
      estado
    } = req.body;

    const updates = [];
    const values = [];

    if (nombre) {
      updates.push('nombre = ?');
      values.push(nombre);
    }
    if (descripcion !== undefined) {
      updates.push('descripcion = ?');
      values.push(descripcion);
    }
    if (marca_id !== undefined) {
      updates.push('marca_id = ?');
      values.push(marca_id);
    }
    if (modelo_id !== undefined) {
      updates.push('modelo_id = ?');
      values.push(modelo_id);
    }
    if (precio_defecto !== undefined) {
      updates.push('precio_defecto = ?');
      values.push(precio_defecto);
    }
    if (proveedor_id !== undefined) {
      updates.push('proveedor_id = ?');
      values.push(proveedor_id);
    }
    if (codigo_barras_general !== undefined) {
      updates.push('codigo_barras_general = ?');
      values.push(codigo_barras_general);
    }
    if (estado) {
      updates.push('estado = ?');
      values.push(estado);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(req.params.id);

    await pool.query(
      `UPDATE productos SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Producto actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

/**
 * @swagger
 * /api/productos/{id}/ajustar-stock:
 *   post:
 *     summary: Ajustar stock de producto (no tallable)
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/ajustar-stock', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { cantidad, tipo_movimiento, referencia, descripcion } = req.body;
    const productoId = req.params.id;

    if (cantidad === undefined || !tipo_movimiento) {
      return res.status(400).json({ error: 'Cantidad y tipo de movimiento son requeridos' });
    }

    const [productos] = await pool.query('SELECT es_tallable, cantidad_general FROM productos WHERE id = ?', [productoId]);
    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (productos[0].es_tallable) {
      return res.status(400).json({ error: 'Este producto es tallable. Ajuste el stock de las variantes.' });
    }

    // Calcular nueva cantidad
    const cantidadActual = productos[0].cantidad_general;
    let cambio = parseInt(cantidad);
    
    if (tipo_movimiento === 'salida' || tipo_movimiento === 'devolucion') {
      cambio = -Math.abs(cambio);
    } else {
      cambio = Math.abs(cambio);
    }

    const nuevaCantidad = cantidadActual + cambio;

    if (nuevaCantidad < 0) {
      return res.status(400).json({ error: 'Stock insuficiente' });
    }

    // Actualizar cantidad
    await pool.query('UPDATE productos SET cantidad_general = ? WHERE id = ?', [nuevaCantidad, productoId]);

    // Registrar en bitácora
    await pool.query(`
      INSERT INTO bitacoras_stock (
        producto_id, usuario_id, cambio_cantidad,
        tipo_movimiento, referencia, descripcion
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [productoId, req.user.id, cambio, tipo_movimiento, referencia || null, descripcion || null]);

    res.json({
      message: 'Stock ajustado exitosamente',
      cantidadAnterior: cantidadActual,
      cantidadNueva: nuevaCantidad
    });
  } catch (error) {
    console.error('Error ajustando stock:', error);
    res.status(500).json({ error: 'Error al ajustar stock' });
  }
});

/**
 * @swagger
 * /api/productos/{id}:
 *   delete:
 *     summary: Eliminar producto
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = router;
