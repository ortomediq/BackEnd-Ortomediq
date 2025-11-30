const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [modelos] = await pool.query('SELECT * FROM modelos ORDER BY nombre');
    res.json({ modelos });
  } catch (error) {
    console.error('Error listando modelos:', error);
    res.status(500).json({ error: 'Error al listar modelos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [modelos] = await pool.query('SELECT * FROM modelos WHERE id = ?', [req.params.id]);
    if (modelos.length === 0) {
      return res.status(404).json({ error: 'Modelo no encontrado' });
    }
    res.json({ modelo: modelos[0] });
  } catch (error) {
    console.error('Error obteniendo modelo:', error);
    res.status(500).json({ error: 'Error al obtener modelo' });
  }
});

router.post('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    const [result] = await pool.query('INSERT INTO modelos (nombre) VALUES (?)', [nombre]);
    res.status(201).json({ message: 'Modelo creado exitosamente', modeloId: result.insertId });
  } catch (error) {
    console.error('Error creando modelo:', error);
    res.status(500).json({ error: 'Error al crear modelo' });
  }
});

router.put('/:id', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    await pool.query('UPDATE modelos SET nombre = ? WHERE id = ?', [nombre, req.params.id]);
    res.json({ message: 'Modelo actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando modelo:', error);
    res.status(500).json({ error: 'Error al actualizar modelo' });
  }
});

// No se permite eliminar modelos, solo se pueden deshabilitar a través de actualización
// Para deshabilitar: PUT /:id con estado='inhabilitado' si se agrega ese campo

module.exports = router;
