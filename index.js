const express = require('express');
const cors = require('cors');
require('dotenv').config();
const webhookRouter = require('./routes/webhook-meta-leads'); // ← NUEVA

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api/webhook', webhookRouter); // ← NUEVA

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
            ubicacion_ciudad TEXT NOT NULL,
            ubicacion_estado TEXT NOT NULL,
            descripcion_breve TEXT,
            descripcion_completa TEXT,
            cuartos INTEGER,
            banos INTEGER,
            estacionamientos INTEGER,
            tiene_jardin BOOLEAN DEFAULT 0,
            tiene_recamara_bano_planta_baja BOOLEAN DEFAULT 0,
            estado_propiedad TEXT DEFAULT 'disponible',
            activo BOOLEAN DEFAULT 1,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Agregar columnas nuevas si no existen (para BDs existentes)
    db.all("PRAGMA table_info(propiedades)", function(err, columns) {
        const columnNames = columns.map(c => c.name);
        if (!columnNames.includes('tiene_jardin')) {
            db.run("ALTER TABLE propiedades ADD COLUMN tiene_jardin BOOLEAN DEFAULT 0");
        }
        if (!columnNames.includes('tiene_recamara_bano_planta_baja')) {
            db.run("ALTER TABLE propiedades ADD COLUMN tiene_recamara_bano_planta_baja BOOLEAN DEFAULT 0");
        }
    });

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
            tipo_inmueble_buscado TEXT,
            tipo_operacion_buscada TEXT,
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
            tipo_consulta TEXT,
            respuesta_enviada TEXT,
            estado_seguimiento TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (propiedad_id) REFERENCES propiedades(id)
        )
    `);
});

// ==================
// RUTAS API
// ==================

// GET: Todas las propiedades (con filtrado opcional)
app.get('/api/propiedades', (req, res) => {
    let query = 'SELECT * FROM propiedades WHERE activo = 1';
    const params = [];

    // Filtros por características
    if (req.query.cuartos_min) {
        query += ' AND cuartos >= ?';
        params.push(parseInt(req.query.cuartos_min));
    }
    if (req.query.banos_min) {
        query += ' AND banos >= ?';
        params.push(parseInt(req.query.banos_min));
    }
    if (req.query.precio_min) {
        query += ' AND precio >= ?';
        params.push(parseFloat(req.query.precio_min));
    }
    if (req.query.precio_max) {
        query += ' AND precio <= ?';
        params.push(parseFloat(req.query.precio_max));
    }
    if (req.query.tipo_operacion) {
        query += ' AND tipo_operacion = ?';
        params.push(req.query.tipo_operacion);
    }
    if (req.query.tipo_inmueble) {
        query += ' AND tipo_inmueble = ?';
        params.push(req.query.tipo_inmueble);
    }
    if (req.query.tiene_jardin === 'true') {
        query += ' AND tiene_jardin = 1';
    }
    if (req.query.tiene_recamara_bano_planta_baja === 'true') {
        query += ' AND tiene_recamara_bano_planta_baja = 1';
    }

    query += ' ORDER BY fecha_creacion DESC';

    db.all(query, params, (err, rows) => {
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
        descripcion_breve, descripcion_completa, cuartos, banos, estacionamientos,
        tiene_jardin, tiene_recamara_bano_planta_baja
    } = req.body;

    // Validación de campos requeridos
    const errors = [];
    if (!precio || precio <= 0) errors.push('Precio debe ser un número positivo');
    if (!tipo_operacion) errors.push('Tipo de operación es requerido');
    if (!propietario_nombre || !propietario_nombre.trim()) errors.push('Nombre del propietario es requerido');
    if (!tipo_inmueble) errors.push('Tipo de inmueble es requerido');
    if (!ubicacion_direccion || !ubicacion_direccion.trim()) errors.push('Dirección es requerida');
    if (!ubicacion_ciudad || !ubicacion_ciudad.trim()) errors.push('Ciudad es requerida');
    if (!ubicacion_estado || !ubicacion_estado.trim()) errors.push('Estado es requerido');

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validación fallida', details: errors });
    }

    const sql = `
        INSERT INTO propiedades (
            precio, tipo_operacion, propietario_nombre, propietario_telefono,
            propietario_email, tipo_inmueble, m2_terreno, m2_construccion,
            ubicacion_direccion, ubicacion_ciudad, ubicacion_estado,
            descripcion_breve, descripcion_completa, cuartos, banos, estacionamientos,
            tiene_jardin, tiene_recamara_bano_planta_baja
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        precio, tipo_operacion, propietario_nombre, propietario_telefono,
        propietario_email, tipo_inmueble, m2_terreno, m2_construccion,
        ubicacion_direccion, ubicacion_ciudad, ubicacion_estado,
        descripcion_breve, descripcion_completa, cuartos, banos, estacionamientos,
        tiene_jardin ? 1 : 0, tiene_recamara_bano_planta_baja ? 1 : 0
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

    // Validación
    const errors = [];
    if (!nombre || !nombre.trim()) errors.push('Nombre es requerido');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email inválido');
    if (telefono && !/^[0-9\-\s+]+$/.test(telefono)) errors.push('Teléfono inválido');
    if (whatsapp && !/^[0-9\-\s+]+$/.test(whatsapp)) errors.push('WhatsApp inválido');
    if (presupuesto_estimado && presupuesto_estimado <= 0) errors.push('Presupuesto debe ser positivo');

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validación fallida', details: errors });
    }

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