const API_URL = 'https://sistema-inmobiliario-api.onrender.com/api';

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    if (tabName === 'inventario') cargarPropiedades();
    if (tabName === 'clientes') cargarClientes();
}

function mostrarMensaje(msg, tipo = 'exito') {
    const div = document.createElement('div');
    div.className = `mensaje ${tipo}`;
    div.textContent = msg;
    document.body.insertBefore(div, document.body.firstChild);
    setTimeout(() => div.remove(), 4000);
}

// PROPIEDADES
document.getElementById('formPropiedad').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    try {
        const response = await fetch(`${API_URL}/propiedades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            mostrarMensaje('✅ Propiedad creada', 'exito');
            e.target.reset();
        } else {
            mostrarMensaje('❌ Error', 'error');
        }
    } catch (error) {
        mostrarMensaje(`Error: ${error.message}`, 'error');
    }
});

async function cargarPropiedades() {
    try {
        const response = await fetch(`${API_URL}/propiedades`);
        const propiedades = await response.json();
        const container = document.getElementById('propiedadesList');
        container.innerHTML = '';
        propiedades.forEach(prop => {
            const card = document.createElement('div');
            card.className = 'propiedad-card';
            card.innerHTML = `<h3>${prop.tipo_inmueble.toUpperCase()}</h3><p><strong>Ubicación:</strong> ${prop.ubicacion_direccion}, ${prop.ubicacion_ciudad}</p><p><strong>Propietario:</strong> ${prop.propietario_nombre}</p><p><strong>m²:</strong> ${prop.m2_construccion || 'N/A'}</p><p><strong>Tipo:</strong> ${prop.tipo_operacion === 'venta' ? 'VENTA' : 'RENTA'}</p><div class="precio">$${parseFloat(prop.precio).toLocaleString('es-MX')}</div><span class="badge">${prop.estado_propiedad}</span>`;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// CLIENTES
document.getElementById('formCliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    try {
        const response = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            mostrarMensaje('✅ Cliente agregado', 'exito');
            e.target.reset();
            cargarClientes();
        } else {
            mostrarMensaje('❌ Error', 'error');
        }
    } catch (error) {
        mostrarMensaje(`Error: ${error.message}`, 'error');
    }
});

async function cargarClientes() {
    try {
        const response = await fetch(`${API_URL}/clientes`);
        const clientes = await response.json();
        const container = document.getElementById('clientesList');
        container.innerHTML = '';
        if (!clientes || clientes.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center;">No hay clientes</p>';
            return;
        }
        clientes.forEach(c => {
            const card = document.createElement('div');
            card.className = 'cliente-card';
            card.innerHTML = `<h3>${c.nombre}</h3><p>📧 ${c.email || 'N/A'}</p><p>📱 ${c.telefono || 'N/A'}</p><p>💬 ${c.whatsapp || 'N/A'}</p><p><strong>Presupuesto:</strong> $${c.presupuesto_estimado ? parseFloat(c.presupuesto_estimado).toLocaleString('es-MX') : 'N/A'}</p><p><strong>Tipo inmueble:</strong> ${c.tipo_inmueble_buscado || 'N/A'}</p><p><strong>Tipo operación:</strong> ${c.tipo_operacion_buscada || 'N/A'}</p><p><strong>Origen:</strong> ${c.origen_contacto || 'N/A'}</p><p><strong>Estado:</strong> <span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 4px;">${c.estado}</span></p>`;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}