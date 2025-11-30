const request = require('supertest');
const app = require('../src/index');
const { pool } = require('../src/config/database');

let authToken;
let userId;

describe('Ortomediq API Tests', () => {
  
  beforeAll(async () => {
    // Login como admin para obtener token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        correo: 'admin@ortomediq.com',
        contrasena: 'password123'
      });
    
    authToken = response.body.token;
    userId = response.body.user.id;
  });

  describe('Autenticación', () => {
    test('Login exitoso con credenciales válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          correo: 'admin@ortomediq.com',
          contrasena: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    test('Login fallido con credenciales inválidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          correo: 'admin@ortomediq.com',
          contrasena: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
    });

    test('Obtener información de usuario autenticado', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('correo');
    });
  });

  describe('Productos', () => {
    test('Listar productos', async () => {
      const response = await request(app)
        .get('/api/productos');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('productos');
      expect(Array.isArray(response.body.productos)).toBe(true);
    });

    test('Obtener producto por ID con disponibilidad', async () => {
      const response = await request(app)
        .get('/api/productos/1');
      
      expect(response.status).toBe(200);
      expect(response.body.producto).toHaveProperty('disponible');
    });
  });

  describe('Apartados - Flujo completo', () => {
    let apartadoId;
    let productoId;

    beforeAll(async () => {
      // Obtener un producto para el test
      const [productos] = await pool.query(
        'SELECT id FROM productos WHERE es_tallable = 0 AND cantidad_general > 5 LIMIT 1'
      );
      productoId = productos[0].id;
    });

    test('Crear apartado con stock disponible', async () => {
      const response = await request(app)
        .post('/api/apartados')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              producto_id: productoId,
              cantidad: 2
            }
          ],
          nota: 'Test apartado'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('apartadoId');
      expect(response.body).toHaveProperty('codigo');
      
      apartadoId = response.body.apartadoId;
    });

    test('Verificar que cantidad_reservada se incrementó', async () => {
      const [productos] = await pool.query(
        'SELECT cantidad_reservada FROM productos WHERE id = ?',
        [productoId]
      );
      
      expect(productos[0].cantidad_reservada).toBeGreaterThan(0);
    });

    test('Fallar al crear apartado con stock insuficiente', async () => {
      const response = await request(app)
        .post('/api/apartados')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              producto_id: productoId,
              cantidad: 999999 // Cantidad imposible
            }
          ]
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('insuficiente');
    });

    test('Cancelar apartado libera stock reservado', async () => {
      const [before] = await pool.query(
        'SELECT cantidad_reservada FROM productos WHERE id = ?',
        [productoId]
      );
      const reservadaAntes = before[0].cantidad_reservada;

      const response = await request(app)
        .post(`/api/apartados/${apartadoId}/cancelar`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);

      const [after] = await pool.query(
        'SELECT cantidad_reservada FROM productos WHERE id = ?',
        [productoId]
      );
      
      expect(after[0].cantidad_reservada).toBeLessThan(reservadaAntes);
    });
  });

  describe('Job de expiración de apartados', () => {
    test('Expirar apartados vencidos', async () => {
      // Crear apartado con expiración pasada
      const [result] = await pool.query(
        `INSERT INTO apartados (usuario_id, codigo, total, expiracion, estado)
         VALUES (?, 'TEST-EXP', 100, DATE_SUB(NOW(), INTERVAL 1 DAY), 'activo')`,
        [userId]
      );
      const apartadoId = result.insertId;

      // Insertar detalle
      const [productos] = await pool.query(
        'SELECT id FROM productos WHERE es_tallable = 0 LIMIT 1'
      );
      await pool.query(
        `INSERT INTO apartado_detalles (apartado_id, producto_id, cantidad, precio_unitario)
         VALUES (?, ?, 1, 100)`,
        [apartadoId, productos[0].id]
      );

      // Marcar como reservado
      await pool.query(
        'UPDATE productos SET cantidad_reservada = cantidad_reservada + 1 WHERE id = ?',
        [productos[0].id]
      );

      // Ejecutar job
      const { expireApartados } = require('../src/jobs/expireApartados');
      const resultado = await expireApartados();

      expect(resultado.expired).toBeGreaterThan(0);

      // Verificar que se liberó stock
      const [apartado] = await pool.query(
        'SELECT estado FROM apartados WHERE id = ?',
        [apartadoId]
      );
      expect(apartado[0].estado).toBe('vencido');
    });
  });

  describe('Opiniones - Validación de reglas', () => {
    let apartadoCompletadoId;

    beforeAll(async () => {
      // Crear apartado completado
      const [result] = await pool.query(
        `INSERT INTO apartados (usuario_id, codigo, total, estado)
         VALUES (?, 'TEST-OP', 100, 'completado')`,
        [userId]
      );
      apartadoCompletadoId = result.insertId;
    });

    test('Crear opinión sobre apartado completado', async () => {
      const response = await request(app)
        .post('/api/opiniones')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          apartado_id: apartadoCompletadoId,
          calificacion: 5,
          comentario: 'Excelente producto'
        });
      
      expect(response.status).toBe(201);
    });

    test('Fallar al opinar sobre apartado no completado', async () => {
      // Crear apartado activo
      const [result] = await pool.query(
        `INSERT INTO apartados (usuario_id, codigo, total, estado)
         VALUES (?, 'TEST-AC', 100, 'activo')`,
        [userId]
      );

      const response = await request(app)
        .post('/api/opiniones')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          apartado_id: result.insertId,
          calificacion: 5,
          comentario: 'Test'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('completado');
    });
  });

  afterAll(async () => {
    await pool.end();
  });
});
