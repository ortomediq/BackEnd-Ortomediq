const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');
require('dotenv').config();

async function runSeeds() {
  console.log('🌱 Iniciando seeds con datos completos de Ortomediq...');
  
  try {
    // 1) USUARIOS
    console.log('👥 Creando usuarios...');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    await pool.query(`
      INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo) VALUES
      ('Admin Principal', 'admin@ortomediq.com', ?, 'admin', 1),
      ('Juan Empleado', 'empleado@ortomediq.com', ?, 'empleado', 1),
      ('Carlos López', 'carlos@example.com', ?, 'usuario', 1),
      ('María González', 'maria@example.com', ?, 'usuario', 1),
      ('Pedro Ramírez', 'pedro@example.com', ?, 'usuario', 1)
    `, [passwordHash, passwordHash, passwordHash, passwordHash, passwordHash]);
    
    // 2) PROVEEDORES
    console.log('🏢 Creando proveedores...');
    await pool.query(`
      INSERT INTO proveedores (id, nombre, contacto, correo, telefono, direccion, creado_en) VALUES
      (1, 'Distribuidora Ortopédica del Norte S.A. de C.V.', 'Juan Pérez', 'juan.perez@ortopedicanorte.com.mx', '8711234501', 'Av. Matamoros 123, Saltillo, Coah.', NOW()),
      (2, 'Suministros Médicos La Laguna S. de R.L.', 'María González', 'maria.gonzalez@sumlaguna.mx', '8711234502', 'Calle Morelos 45, Torreón, Coah.', NOW()),
      (3, 'Central Médica Saltillo', 'Carlos Ramírez', 'contacto@centralmedica-saltillo.com', '8711234503', 'Blvd. V. Carranza 210, Saltillo, Coah.', NOW()),
      (4, 'Proveedora Ortopédica Torreón', 'Laura Morales', 'ventas@orto-torreon.mx', '8711234504', 'Av. Juárez 78, Torreón, Coah.', NOW()),
      (5, 'Insumos Médicos Coahuila S.A.', 'Ricardo Díaz', 'ricardo.diaz@insumoscoahuila.mx', '8711234505', 'Carretera Saltillo-Torreón km 5, Col. Industrial, Coah.', NOW())
    `);
    
    // 3) MARCAS
    console.log('🏷️ Creando marcas...');
    await pool.query(`
      INSERT INTO marcas (id, nombre, creado_en) VALUES
      (1, 'GENÉRICO', NOW()),
      (2, 'ORTOPEDIA', NOW()),
      (3, 'MEDIPAR', NOW()),
      (4, 'ECOFLEX', NOW()),
      (5, 'SOMA', NOW()),
      (6, 'SUNA', NOW()),
      (7, 'BIONIKA', NOW()),
      (8, 'ERGOFLEX', NOW()),
      (9, 'OP CARE AND SUPPORT', NOW()),
      (10, 'BENESTA', NOW()),
      (11, 'JEWETT', NOW()),
      (12, 'HOME CARE', NOW()),
      (13, 'DRIVE', NOW()),
      (14, 'DAVO SPORT', NOW()),
      (15, 'ORTIZ', NOW()),
      (16, 'SUPER CONFORT', NOW()),
      (17, 'BODY SECRET', NOW()),
      (18, 'DAONSA', NOW()),
      (19, 'EL AUTÉNTICO', NOW()),
      (20, 'DINKY', NOW()),
      (21, 'GUTTEK', NOW()),
      (22, 'MOBICARE', NOW()),
      (23, 'EDIGAR', NOW()),
      (24, 'ALIVIO', NOW()),
      (25, 'INVACARE', NOW())
    `);
    
    // 4) MODELOS
    console.log('📦 Creando modelos...');
    await pool.query(`
      INSERT INTO modelos (id, nombre, creado_en) VALUES
      (1,'ST-2',NOW()),(2,'DL-1',NOW()),(3,'FL-1',NOW()),(4,'FL-2',NOW()),(5,'SA-1',NOW()),
      (6,'FC-1',NOW()),(7,'FL-5',NOW()),(8,'SE-1',NOW()),(9,'FI-1',NOW()),(10,'FU-1',NOW()),
      (11,'SP-1',NOW()),(12,'CB-1',NOW()),(13,'FP-1',NOW()),(14,'SM-2B',NOW()),(15,'FPA-1',NOW()),
      (16,'SM-2B-ABD',NOW()),(17,'T00SMEI',NOW()),(18,'T00SMED',NOW()),(19,'T00SMED-IN',NOW()),(20,'SMED',NOW()),
      (21,'NSM-1',NOW()),(22,'SOMA',NOW()),(23,'SUNA',NOW()),(24,'NSC-1',NOW()),(25,'NSC-2',NOW()),
      (26,'NER-1',NOW()),(27,'NH-223',NOW()),(28,'ASG-U',NOW()),(29,'ARPAK',NOW()),(30,'48950',NOW()),
      (31,'17',NOW()),(32,'ES100-102C',NOW()),(33,'ES100102C',NOW()),(34,'NER-8',NOW()),(35,'NER-7',NOW()),
      (36,'NER-4',NOW()),(37,'NER-3',NOW()),(38,'NER-2',NOW()),(39,'NER-2SO',NOW()),(40,'NEM-1',NOW()),
      (41,'INCD-GD',NOW()),(42,'INCI-GD',NOW()),(43,'INCD-XG',NOW()),(44,'INCI-XG',NOW()),(45,'2166',NOW()),
      (46,'PWR-01-1151',NOW()),(47,'FA1',NOW()),(48,'MH-215',NOW()),(49,'MH-203',NOW()),(50,'FED2IE',NOW()),
      (51,'CAR-HP100',NOW()),(52,'WRH-RS-8782',NOW()),(53,'TST-SU8209',NOW()),(54,'S6001',NOW()),(55,'600',NOW()),
      (56,'400',NOW()),(57,'11-121',NOW()),(58,'LAMP-A',NOW()),(59,'KD-7920',NOW()),(60,'KF-50',NOW()),
      (61,'2600',NOW()),(62,'FR-2U',NOW()),(63,'BC-68005',NOW()),(64,'BC-68002',NOW()),(65,'NEB951',NOW()),
      (66,'NB851',NOW()),(67,'HF605',NOW()),(68,'COLAGU-01',NOW()),(69,'MH-528',NOW()),(70,'MH-529',NOW()),
      (71,'BAR12',NOW()),(72,'BAR16',NOW()),(73,'BAR24',NOW()),(74,'AA20600',NOW()),(75,'Taylor',NOW()),
      (76,'ENVOY',NOW()),(77,'MH-401',NOW()),(78,'MH-400',NOW()),(79,'MH-616',NOW()),(80,'FASL',NOW()),
      (81,'603',NOW()),(82,'732',NOW()),(83,'719',NOW()),(84,'728',NOW())
    `);
    
    // 5) TALLAS
    console.log('📏 Creando tallas...');
    await pool.query(`
      INSERT INTO tallas (id, codigo, descripcion, creado_en) VALUES
      (1,'CH','Chico',NOW()),(2,'CM','Chico/Medio (CM)',NOW()),(3,'P','Pequeño / Pediátrico (P)',NOW()),
      (4,'INF','Infantil (INF)',NOW()),(5,'Pediátrica','Pediátrica (texto)',NOW()),(6,'Infantil','Infantil (texto)',NOW()),
      (7,'M','Mediano',NOW()),(8,'GM','Gran Medio (GM)',NOW()),(9,'G','Grande',NOW()),
      (10,'XG','Extra Grande',NOW()),(11,'XXG','Extra Extra Grande',NOW()),(12,'XXXG','Extra Extra Extra Grande',NOW()),
      (13,'U','Única / Universal',NOW()),(14,'9.5','Calzado 9.5',NOW()),(15,'12','Calzado 12',NOW()),
      (16,'12.5','Calzado 12.5',NOW()),(17,'13','Calzado 13',NOW()),(18,'13.5','Calzado 13.5',NOW()),
      (19,'14','Calzado 14',NOW()),(20,'14.5','Calzado 14.5',NOW()),(21,'15','Calzado 15',NOW()),
      (22,'15.5','Calzado 15.5',NOW()),(23,'16','Calzado 16',NOW()),(24,'16.5','Calzado 16.5',NOW()),
      (25,'17','Calzado 17',NOW()),(26,'17.5','Calzado 17.5',NOW()),(27,'18','Calzado 18',NOW()),
      (28,'18.5','Calzado 18.5',NOW()),(29,'19','Calzado 19',NOW()),(30,'19.5','Calzado 19.5',NOW()),
      (31,'20','Calzado 20',NOW()),(32,'20.5','Calzado 20.5',NOW()),(33,'21','Calzado 21',NOW()),
      (34,'21.5','Calzado 21.5',NOW()),(35,'22','Calzado 22',NOW()),(36,'22.5','Calzado 22.5',NOW()),
      (37,'23','Calzado 23',NOW()),(38,'23.5','Calzado 23.5',NOW()),(39,'24','Calzado 24',NOW()),
      (40,'XXXXG','Extra Extra Extra Extra Grande',NOW())
    `);
    
    console.log('📝 Nota: Para cargar el inventario completo, ejecute el archivo SQL en migrations/');
    console.log('   El seeder base ha cargado: usuarios, proveedores, marcas, modelos y tallas');
    console.log('   Para productos completos: mysql -u root -p Ortomediq < scripts/productos_completos.sql');
    
    console.log('✅ Seeds completados exitosamente');
    console.log('');
    console.log('📋 Credenciales de acceso:');
    console.log('   Admin: admin@ortomediq.com / password123');
    console.log('   Empleado: empleado@ortomediq.com / password123');
    console.log('   Usuario: carlos@example.com / password123');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando seeds:', error);
    process.exit(1);
  }
}

runSeeds();
