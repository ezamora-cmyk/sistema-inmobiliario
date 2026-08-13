const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Base de datos (usando SQLite para MVP simple)
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('inmobiliario.db');

// Inicializar base de datos
db.serialize(() => {
    // Propiedades
    db.run(`
        CREATE TABLE IF NOT EXISTS propiedades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            precio REAL NOT NULL,
            tipo_operacion TEXT NOT NULL,
            propietario_nombre TEXT NOT NULL,
            propietario_telefono TEXT,
            propietario_email TEXT,
            tipo_inmueble TEXT NOT NULL,
            m2_terreno REAL,
            m2_construccion REAL,
            ubicacion_direccion TEXT NOT NULL,
            ubicacion_ciudad TEXT,
            ubicacion_estado TEXT,
            descripcion_breve TEXT,
            descripcion_completa TEXT,
            estado_propiedad TEXT DEFAULT 'disponible',
            fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            imagen_principal_url TEXT,
            cuartos INTEGER,
            banos INTEGER,
            estacionamientos INTEGER,
            activo BOOLEAN DEFAULT 1
        )
    `);

    // Clientes
    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT,
            telefono TEXT,
            whatsapp TEXT,
            tipo_cliente TEXT,
            presupuesto_estimado REAL,
            zona_interes TEXT,
            fecha_primer_contacto DATETIME DEFAULT CURRENT_TIMESTAMP,
            origen_contacto TEXT,
            estado TEXT DEFAULT 'prospecto',
            notas TEXT
        )
    `);

    // Consultas
    db.run(`
        CREATE TABLE IF NOT EXISTS consultas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            propiedad_id INTEGER,
            fecha_consulta DATETIME DEFAULT CURRENT_TIMESTAMP,
            tipo_consulta TEXT,
            respuesta_enviada BOOLEAN DEFAULT 0,
            estado_seguimiento TEXT DEFAULT 'pendiente',
            notas TEXT,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (propiedad_id) REFERENCES propiedades(id)
        )
    `);
});

// ==================
// RUTAS API
// ==================

// GET: Todas las propiedades
app.get('/api/propiedades', (req, res) => {
    db.all('SELECT * FROM propiedades WHERE activo = 1 ORDER BY fecha_ingreso DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET: Una propiedad específica
app.get('/api/propiedades/:id', (req, res) => {
    db.get('SELECT * FROM propiedades WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'No encontrada' });
        res.json(row);
    });
});

// POST: Crear nueva propiedad
app.post('/api/propiedades', (req, res) => {
    const {
        precio, tipo_operacion, propietario_nombre, propietario_telefono,
        propietario_email, tipo_inmueble, m2_terreno, m2_construccion,
        ubicacion_direccion, ubicacion_ciudad, ubicacion_estado,
        descripcion_breve, descripcion_completa, cuartos, banos, estacionamientos
    } = req.body;

    const sql = `
        INSERT INTO propiedades (
            precio, tipo_operacion, propietario_nombre, propietario_telefono,
            propietario_email, tipo_inmueble, m2_terreno, m2_construccion,
            ubicacion_direccion, ubicacion_ciudad, ubicacion_estado,
            descripcion_breve, descripcion_completa, cuartos, banos, estacionamientos
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        precio, tipo_operacion, propietario_nombre, propietario_telefono,
        propietario_email, tipo_inmueble, m2_terreno, m2_construccion,
        ubicacion_direccion, ubicacion_ciudad, ubicacion_estado,
        descripcion_breve, descripcion_completa, cuartos, banos, estacionamientos
    ], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Propiedad creada' });
    });
});

// PUT: Actualizar propiedad
app.put('/api/propiedades/:id', (req, res) => {
    const updates = req.body;
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    const sql = `UPDATE propiedades SET ${fields}, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?`;
    
    db.run(sql, [...values, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Propiedad actualizada' });
    });
});

// DELETE: Desactivar propiedad (soft delete)
app.delete('/api/propiedades/:id', (req, res) => {
    db.run('UPDATE propiedades SET activo = 0 WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Propiedad removida' });
    });
});

// ==================
// RUTAS CLIENTES
// ==================

// GET: Todos los clientes
app.get('/api/clientes', (req, res) => {
    db.all('SELECT * FROM clientes ORDER BY fecha_primer_contacto DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT,
        telefono TEXT,
        whatsapp TEXT,
        tipo_cliente TEXT,
        presupuesto_estimado REAL,
        zona_interes TEXT,
        tipo_inmueble_buscado TEXT,
        tipo_operacion_buscada TEXT,
        fecha_primer_contacto DATETIME DEFAULT CURRENT_TIMESTAMP,
        origen_contacto TEXT,
        estado TEXT DEFAULT 'prospecto',
        notas TEXT
    )
`);


// ==================
// RUTAS CONSULTAS
// ==================

// GET: Consultas de una propiedad
app.get('/api/propiedades/:id/consultas', (req, res) => {
    db.all(
        `SELECT c.*, cl.nombre, cl.email, cl.telefono FROM consultas c
         JOIN clientes cl ON c.cliente_id = cl.id
         WHERE c.propiedad_id = ?
         ORDER BY c.fecha_consulta DESC`,
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// POST: Crear cliente
app.post('/api/clientes', (req, res) => {
    const { nombre, email, telefono, whatsapp, presupuesto_estimado, tipo_inmueble_buscado, tipo_operacion_buscada, origen_contacto } = req.body;
    
    db.run(
        `INSERT INTO clientes (nombre, email, telefono, whatsapp, presupuesto_estimado, tipo_inmueble_buscado, tipo_operacion_buscada, origen_contacto)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, email, telefono, whatsapp, presupuesto_estimado, tipo_inmueble_buscado, tipo_operacion_buscada, origen_contacto],
        function(err) {
            if (err) {
                console.error('Error inserting cliente:', err);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, message: 'Cliente creado' });
        }
    );
});

// ==================
// SERVIDOR
// ==================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 API disponible en http://localhost:${PORT}/api/propiedades`);
});