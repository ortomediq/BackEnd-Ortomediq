const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigrations() {
  console.log('🔄 Iniciando migraciones...');
  
  let connection;
  
  try {
    // Conectar a MySQL sin especificar base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });
    
    const dbName = process.env.DB_NAME || 'Ortomediq';
    
    // Crear base de datos si no existe
    console.log(`📦 Creando base de datos '${dbName}' si no existe...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${dbName}\``);
    console.log(`✅ Base de datos '${dbName}' lista`);
    
    // Leer archivo de migraciones
    const migrationFile = path.join(__dirname, '../migrations/001_create_tables.sql');
    let sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Remover comentarios de línea completa
    sql = sql.split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    // Remover bloques de comentarios /* */
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Dividir por declaraciones individuales (separadas por punto y coma)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^USE\s+/i));
    
    console.log(`📝 Ejecutando ${statements.length} declaraciones SQL...`);
    
    let executedCount = 0;
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
          executedCount++;
        } catch (err) {
          console.error(`❌ Error en declaración ${executedCount + 1}:`, err.message);
          console.error('SQL:', statement.substring(0, 100) + '...');
          throw err;
        }
      }
    }
    
    console.log(`✅ ${executedCount} tablas creadas exitosamente`);
    
    console.log('✅ Migraciones completadas exitosamente');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

runMigrations();
