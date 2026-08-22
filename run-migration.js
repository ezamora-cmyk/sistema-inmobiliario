/**
 * SCRIPT DE MIGRACIÓN SEGURA
 * 
 * Uso: node run-migration.js
 * 
 * Esto:
 * 1. Hace backup de tu BD
 * 2. Agrega las nuevas columnas
 * 3. Verifica que todo esté bien
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = './database.sqlite';
const BACKUP_PATH = `./database.backup.${Date.now()}.sqlite`;

console.log('🔧 INICIANDO MIGRACIÓN...\n');

// ============================================
// PASO 1: BACKUP
// ============================================

console.log('1️⃣ Haciendo backup de base de datos...');
try {
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log(`   ✅ Backup creado en: ${BACKUP_PATH}\n`);
} catch (error) {
  console.error('   ❌ Error en backup:', error.message);
  process.exit(1);
}

// ============================================
// PASO 2: CONECTAR A BD
// ============================================

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error conectando a BD:', err);
    process.exit(1);
  }
  console.log('2️⃣ Conectado a base de datos\n');
});

// ============================================
// PASO 3: EJECUTAR MIGRACIONES
// ============================================

const migrations = [
  // Agregar columnas a clientes
  "ALTER TABLE clientes ADD COLUMN respondido INTEGER DEFAULT 0",
  "ALTER TABLE clientes ADD COLUMN calificacion TEXT DEFAULT 'sin_clasificar'",
  "ALTER TABLE clientes ADD COLUMN fecha_respuesta DATETIME",
  "ALTER TABLE clientes ADD COLUMN fuente_lead TEXT DEFAULT ''",
  "ALTER TABLE clientes ADD COLUMN ultima_interaccion DATETIME",

  // Crear tabla de seguimientos
  `CREATE TABLE IF NOT EXISTS seguimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    mensaje TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    enviado INTEGER DEFAULT 1,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  )`,

  // Crear tabla de intereses
  `CREATE TABLE IF NOT EXISTS propiedades_interes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    propiedad_id INTEGER,
    interes_nivel TEXT,
    fecha_consulta DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  )`,

  // Índices
  "CREATE INDEX IF NOT EXISTS idx_clientes_calificacion ON clientes(calificacion)",
  "CREATE INDEX IF NOT EXISTS idx_clientes_respondido ON clientes(respondido)",
  "CREATE INDEX IF NOT EXISTS idx_seguimientos_cliente ON seguimientos(cliente_id)",
  "CREATE INDEX IF NOT EXISTS idx_seguimientos_tipo ON seguimientos(tipo)",
];

console.log('3️⃣ Ejecutando migraciones...\n');

let executedCount = 0;
let skippedCount = 0;

// Ejecutar cada migración
const executeNextMigration = (index) => {
  if (index >= migrations.length) {
    finalizarMigracion();
    return;
  }

  const sql = migrations[index];
  db.run(sql, (err) => {
    if (err) {
      // Si el error es porque la columna ya existe, continuamos
      if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
        console.log(`   ⚠️  Ya existe: ${sql.substring(0, 50)}...`);
        skippedCount++;
      } else {
        console.error(`   ❌ Error: ${sql.substring(0, 50)}...\n      ${err.message}`);
        // Continuar de todas formas
        skippedCount++;
      }
    } else {
      console.log(`   ✅ OK: ${sql.substring(0, 50)}...`);
      executedCount++;
    }
    executeNextMigration(index + 1);
  });
};

executeNextMigration(0);

// ============================================
// PASO 4: VERIFICAR
// ============================================

function finalizarMigracion() {
  console.log(`\n4️⃣ Verificando estructura de BD...\n`);

  db.all("PRAGMA table_info(clientes)", (err, columns) => {
    if (err) {
      console.error('❌ Error verificando:', err);
      db.close();
      process.exit(1);
    }

    const columnNames = columns.map((col) => col.name);
    const requiredColumns = [
      'respondido',
      'calificacion',
      'fecha_respuesta',
      'fuente_lead',
      'ultima_interaccion',
    ];

    const allExists = requiredColumns.every((col) => columnNames.includes(col));

    if (allExists) {
      console.log('✅ Todas las columnas nuevas están presentes:\n');
      requiredColumns.forEach((col) => {
        console.log(`   ✓ ${col}`);
      });
    } else {
      const missing = requiredColumns.filter((col) => !columnNames.includes(col));
      console.log('⚠️  Faltan columnas:\n');
      missing.forEach((col) => {
        console.log(`   ✗ ${col}`);
      });
    }

    // Verificar tablas
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      const tableNames = tables.map((t) => t.name);
      console.log(`\n   Tablas existentes: ${tableNames.join(', ')}`);

      console.log(`\n5️⃣ RESUMEN:`);
      console.log(`   ✅ Migraciones ejecutadas: ${executedCount}`);
      console.log(`   ⚠️  Saltadas/Existentes: ${skippedCount}`);
      console.log(`   💾 Backup: ${BACKUP_PATH}\n`);

      if (allExists) {
        console.log('🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
      } else {
        console.log('⚠️  Migración parcial. Revisa los errores arriba.');
      }

      db.close();
      process.exit(allExists ? 0 : 1);
    });
  });
}
