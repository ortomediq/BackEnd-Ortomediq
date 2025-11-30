const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

/**
 * @swagger
 * /api/variantes:
 *   get:
 *     summary: Listar variantes de un producto
 *     tags: [Variantes]
 */
router.get('/', async (req, res) => {
  try {
    const { producto_id } = req.query;

    if (!producto_id) {
      return res.status(400).json({ error: 'producto_id es requerido' });
    }

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
    `, [producto_id]);

    res.json({ variantes });
  } catch (error) {
    console.error('Error listando variantes:', error);
    res.status(500).json({ error: 'Error al listar variantes' });
  }
});

/**
 * @swagger
 * /api/variantes/{id}:
 *   get:
 *     summary: Obtener variante por ID
 *     tags: [Variantes]
 */
router.get('/:id', async (req, res) => {
  try {
    const [variantes] = await pool.query(`
      SELECT v.*,
        t.codigo AS talla_codigo,
        t.descripcion AS talla_descripcion,
        mo.nombre AS modelo_nombre,
        p.nombre AS producto_nombre,
        (v.cantidad - v.cantidad_reservada) AS disponible
      FROM variantes_productos v
      LEFT JOIN tallas t ON v.talla_id = t.id
      LEFT JOIN modelos mo ON v.modelo_id = mo.id
      LEFT JOIN productos p ON v.producto_id = p.id
      WHERE v.id = ?
    `, [req.params.id]);

    if (variantes.length === 0) {
      return res.status(404).json({ error: 'Variante no encontrada' });
    }

    res.json({ variante: variantes[0] });
  } catch (error) {
    console.error('Error obteniendo variante:', error);
    res.status(500).json({ error: 'Error al obtener variante' });
  }
});

/**
 * @swagger
 * /api/variantes:
 *   post:
 *     summary: Crear nueva variante (Admin/Empleado)
 *     tags: [Variantes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const {
      producto_id,
      codigo_barras,
      talla_id,
      color,
      cantidad,
      precio,
      modelo_id,
      estado
    } = req.body;

    if (!producto_id || !precio) {
      return res.status(400).json({ error: 'producto_id y precio son requeridos' });
    }

    const [result] = await pool.query(`
      INSERT INTO variantes_productos (
        producto_id, codigo_barras, talla_id, color,
        cantidad, precio, modelo_id, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      producto_id,
      codigo_barras || null,
      talla_id || null,
      color || null,
      cantidad || 0,
      precio,
      modelo_id || null,
      estado || 'habilitado'
    ]);

    // Registrar en bitácora si se creó con cantidad
    if (cantidad > 0) {
      await pool.query(`
        INSERT INTO bitacoras_stock (
          variante_id, usuario_id, cambio_cantidad,
          tipo_movimiento, descripcion
        ) VALUES (?, ?, ?, 'entrada', 'Inventario inicial de variante')
      `, [result.insertId, req.user.id, cantidad]);
    }

    res.status(201).json({
      message: 'Variante creada exitosamente',
      varianteId: result.insertId
    });
  } catch (error) {
    console.error('Error creando variante:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una variante con esa combinación de talla y color' });
    }
    res.status(500).json({ error: 'Error al crear variante' });
  }
});

/**
 * @swagger
 * /api/variantes/{id}:
 *   put:
 *     summary: Actualizar variante
 *     tags: [Variantes]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const {
      codigo_barras,
      talla_id,
      color,
      precio,
      modelo_id,
      estado
    } = req.body;

    const updates = [];
    const values = [];

    if (codigo_barras !== undefined) {
      updates.push('codigo_barras = ?');
      values.push(codigo_barras);
    }
    if (talla_id !== undefined) {
      updates.push('talla_id = ?');
      values.push(talla_id);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }
    if (precio !== undefined) {
      updates.push('precio = ?');
      values.push(precio);
    }
    if (modelo_id !== undefined) {
      updates.push('modelo_id = ?');
      values.push(modelo_id);
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
      `UPDATE variantes_productos SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Variante actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando variante:', error);
    res.status(500).json({ error: 'Error al actualizar variante' });
  }
});

/**
 * @swagger
 * /api/variantes/{id}/ajustar-stock:
 *   post:
 *     summary: Ajustar stock de variante
 *     tags: [Variantes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/ajustar-stock', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { cantidad, tipo_movimiento, referencia, descripcion } = req.body;
    const varianteId = req.params.id;

    if (cantidad === undefined || !tipo_movimiento) {
      return res.status(400).json({ error: 'Cantidad y tipo de movimiento son requeridos' });
    }

    const [variantes] = await pool.query('SELECT cantidad FROM variantes_productos WHERE id = ?', [varianteId]);
    if (variantes.length === 0) {
      return res.status(404).json({ error: 'Variante no encontrada' });
    }

    const cantidadActual = variantes[0].cantidad;
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

    await pool.query('UPDATE variantes_productos SET cantidad = ? WHERE id = ?', [nuevaCantidad, varianteId]);

    await pool.query(`
      INSERT INTO bitacoras_stock (
        variante_id, usuario_id, cambio_cantidad,
        tipo_movimiento, referencia, descripcion
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [varianteId, req.user.id, cambio, tipo_movimiento, referencia || null, descripcion || null]);

    res.json({
      message: 'Stock de variante ajustado exitosamente',
      cantidadAnterior: cantidadActual,
      cantidadNueva: nuevaCantidad
    });
  } catch (error) {
    console.error('Error ajustando stock de variante:', error);
    res.status(500).json({ error: 'Error al ajustar stock de variante' });
  }
});

/**
 * @swagger
 * /api/variantes/{id}/toggle-estado:
 *   patch:
 *     summary: Habilitar/Inhabilitar variante
 *     tags: [Variantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.patch('/:id/toggle-estado', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const [variante] = await pool.query('SELECT estado FROM variantes_productos WHERE id = ?', [req.params.id]);
    
    if (variante.length === 0) {
      return res.status(404).json({ error: 'Variante no encontrada' });
    }

    const nuevoEstado = variante[0].estado === 'habilitado' ? 'inhabilitado' : 'habilitado';
    await pool.query('UPDATE variantes_productos SET estado = ? WHERE id = ?', [nuevoEstado, req.params.id]);
    
    res.json({ 
      message: `Variante ${nuevoEstado === 'habilitado' ? 'habilitada' : 'inhabilitada'} exitosamente`,
      estado: nuevoEstado
    });
  } catch (error) {
    console.error('Error cambiando estado de la variante:', error);
    res.status(500).json({ error: 'Error al cambiar estado de la variante' });
  }
});

module.exports = router;
