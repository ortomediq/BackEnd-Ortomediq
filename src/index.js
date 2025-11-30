const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
require('dotenv').config();

const { pool } = require('./config/database');
const swaggerSetup = require('./config/swagger');

// Importar rutas
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const productosRoutes = require('./routes/productos');
const variantesRoutes = require('./routes/variantes');
const proveedoresRoutes = require('./routes/proveedores');
const marcasRoutes = require('./routes/marcas');
const modelosRoutes = require('./routes/modelos');
const tallasRoutes = require('./routes/tallas');
const apartadosRoutes = require('./routes/apartados');
const ventasRoutes = require('./routes/ventas');
const opinionesRoutes = require('./routes/opiniones');
const chatsRoutes = require('./routes/chats');
const bitacorasRoutes = require('./routes/bitacoras');
const asistenciasRoutes = require('./routes/asistencias');
const estadisticasRoutes = require('./routes/estadisticas');
const personalRoutes = require('./routes/personal');

// Job para expirar apartados
const { expireApartados } = require('./jobs/expireApartados');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
swaggerSetup(app);

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/variantes', variantesRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/marcas', marcasRoutes);
app.use('/api/modelos', modelosRoutes);
app.use('/api/tallas', tallasRoutes);
app.use('/api/apartados', apartadosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/opiniones', opinionesRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/bitacoras', bitacorasRoutes);
app.use('/api/asistencias', asistenciasRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/personal', personalRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Programar job de expiración de apartados (cada 30 minutos)
cron.schedule('*/30 * * * *', async () => {
  console.log('Ejecutando job de expiración de apartados...');
  try {
    await expireApartados();
  } catch (error) {
    console.error('Error en job de expiración:', error);
  }
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`✅ Servidor Ortomediq ejecutándose en puerto ${PORT}`);
  console.log(`📚 Documentación API: http://localhost:${PORT}/api-docs`);
  
  // Verificar conexión a base de datos
  try {
    await pool.query('SELECT 1');
    console.log('✅ Conexión a base de datos exitosa');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
  }
});

module.exports = app;
