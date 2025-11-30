const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [tallas] = await pool.query('SELECT * FROM tallas ORDER BY codigo');
    res.json({ tallas });
  } catch (error) {
    console.error('Error listando tallas:', error);
    res.status(500).json({ error: 'Error al listar tallas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [tallas] = await pool.query('SELECT * FROM tallas WHERE id = ?', [req.params.id]);
    if (tallas.length === 0) {
      return res.status(404).json({ error: 'Talla no encontrada' });
    }
    res.json({ talla: tallas[0] });
  } catch (error) {
    console.error('Error obteniendo talla:', error);
    res.status(500).json({ error: 'Error al obtener talla' });
  }
});

router.post('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { codigo, descripcion } = req.body;
    if (!codigo) {
      return res.status(400).json({ error: 'El código es requerido' });
    }
    const [result] = await pool.query(
      'INSERT INTO tallas (codigo, descripcion) VALUES (?, ?)',
      [codigo, descripcion || null]
    );
    res.status(201).json({ message: 'Talla creada exitosamente', tallaId: result.insertId });
  } catch (error) {
    console.error('Error creando talla:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una talla con ese código' });
    }
    res.status(500).json({ error: 'Error al crear talla' });
  }
});

router.put('/:id', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { codigo, descripcion } = req.body;
    const updates = [];
    const values = [];
    
    if (codigo) { updates.push('codigo = ?'); values.push(codigo); }
    if (descripcion !== undefined) { updates.push('descripcion = ?'); values.push(descripcion); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    values.push(req.params.id);
    await pool.query(`UPDATE tallas SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Talla actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando talla:', error);
    res.status(500).json({ error: 'Error al actualizar talla' });
  }
});

// No se permite eliminar tallas, solo se pueden deshabilitar a través de actualización
// Para deshabilitar: PUT /:id con estado='inhabilitado' si se agrega ese campo

module.exports = router;
