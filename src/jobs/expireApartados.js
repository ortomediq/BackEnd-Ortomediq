const { pool, withTransaction } = require('../config/database');

/**
 * Job que expira apartados vencidos y libera el stock reservado
 */
async function expireApartados() {
  console.log(`[${new Date().toISOString()}] Iniciando proceso de expiración de apartados...`);
  
  try {
    const result = await withTransaction(async (connection) => {
      // Buscar apartados activos cuya fecha de expiración ya pasó
      const [apartados] = await connection.query(
        'SELECT id FROM apartados WHERE estado = "activo" AND expiracion < NOW()'
      );

      if (apartados.length === 0) {
        console.log('No hay apartados vencidos.');
        return { expired: 0 };
      }

      console.log(`Encontrados ${apartados.length} apartados vencidos.`);

      for (const apartado of apartados) {
        // Obtener detalles del apartado
        const [detalles] = await connection.query(
          'SELECT producto_id, variante_id, cantidad FROM apartado_detalles WHERE apartado_id = ?',
          [apartado.id]
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

        // Marcar apartado como vencido
        await connection.query(
          'UPDATE apartados SET estado = "vencido" WHERE id = ?',
          [apartado.id]
        );

        console.log(`  - Apartado ${apartado.id} marcado como vencido y stock liberado.`);
      }

      return { expired: apartados.length };
    });

    console.log(`✅ Proceso completado. ${result.expired} apartados expirados.`);
    return result;
  } catch (error) {
    console.error('❌ Error en proceso de expiración:', error);
    throw error;
  }
}

// Si se ejecuta directamente (no importado como módulo)
if (require.main === module) {
  (async () => {
    try {
      await expireApartados();
      process.exit(0);
    } catch (error) {
      console.error('Error ejecutando job:', error);
      process.exit(1);
    }
  })();
}

module.exports = { expireApartados };
