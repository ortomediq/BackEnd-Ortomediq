const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [marcas] = await pool.query('SELECT * FROM marcas ORDER BY nombre');
    res.json({ marcas });
  } catch (error) {
    console.error('Error listando marcas:', error);
    res.status(500).json({ error: 'Error al listar marcas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [marcas] = await pool.query('SELECT * FROM marcas WHERE id = ?', [req.params.id]);
    if (marcas.length === 0) {
      return res.status(404).json({ error: 'Marca no encontrada' });
    }
    res.json({ marca: marcas[0] });
  } catch (error) {
    console.error('Error obteniendo marca:', error);
    res.status(500).json({ error: 'Error al obtener marca' });
  }
});

router.post('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    const [result] = await pool.query('INSERT INTO marcas (nombre) VALUES (?)', [nombre]);
    res.status(201).json({ message: 'Marca creada exitosamente', marcaId: result.insertId });
  } catch (error) {
    console.error('Error creando marca:', error);
    res.status(500).json({ error: 'Error al crear marca' });
  }
});

router.put('/:id', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    await pool.query('UPDATE marcas SET nombre = ? WHERE id = ?', [nombre, req.params.id]);
    res.json({ message: 'Marca actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando marca:', error);
    res.status(500).json({ error: 'Error al actualizar marca' });
  }
});

// No se permite eliminar marcas, solo se pueden deshabilitar a través de actualización
// Para deshabilitar: PUT /:id con estado='inhabilitado' si se agrega ese campo

module.exports = router;
