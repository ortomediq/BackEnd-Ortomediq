const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Rutas para proveedores
router.get('/', async (req, res) => {
  try {
    const [proveedores] = await pool.query('SELECT * FROM proveedores ORDER BY nombre');
    res.json({ proveedores });
  } catch (error) {
    console.error('Error listando proveedores:', error);
    res.status(500).json({ error: 'Error al listar proveedores' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [proveedores] = await pool.query('SELECT * FROM proveedores WHERE id = ?', [req.params.id]);
    if (proveedores.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json({ proveedor: proveedores[0] });
  } catch (error) {
    console.error('Error obteniendo proveedor:', error);
    res.status(500).json({ error: 'Error al obtener proveedor' });
  }
});

router.post('/', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { nombre, contacto, correo, telefono, direccion } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    const [result] = await pool.query(
      'INSERT INTO proveedores (nombre, contacto, correo, telefono, direccion) VALUES (?, ?, ?, ?, ?)',
      [nombre, contacto || null, correo || null, telefono || null, direccion || null]
    );
    res.status(201).json({ message: 'Proveedor creado exitosamente', proveedorId: result.insertId });
  } catch (error) {
    console.error('Error creando proveedor:', error);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

router.put('/:id', authenticateToken, authorizeRoles('admin', 'empleado'), async (req, res) => {
  try {
    const { nombre, contacto, correo, telefono, direccion } = req.body;
    const updates = [];
    const values = [];
    
    if (nombre) { updates.push('nombre = ?'); values.push(nombre); }
    if (contacto !== undefined) { updates.push('contacto = ?'); values.push(contacto); }
    if (correo !== undefined) { updates.push('correo = ?'); values.push(correo); }
    if (telefono !== undefined) { updates.push('telefono = ?'); values.push(telefono); }
    if (direccion !== undefined) { updates.push('direccion = ?'); values.push(direccion); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    values.push(req.params.id);
    await pool.query(`UPDATE proveedores SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Proveedor actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando proveedor:', error);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

// No se permite eliminar proveedores, solo se pueden deshabilitar a través de actualización
// Para deshabilitar: PUT /:id con estado='inhabilitado' si se agrega ese campo

module.exports = router;
