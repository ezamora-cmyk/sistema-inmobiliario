const API_URL = 'https://sistema-inmobiliario-api.onrender.com/api';

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'inventario') cargarPropiedades();
    if (tabName === 'clientes') cargarClientes();
}

function mostrarMensaje(mensaje, tipo = 'exito') {
    const div = document.createElement('div');
    div.className = `mensaje ${tipo}`;
    div.textContent = mensaje;
    document.body.insertBefore(div, document.body.firstChild);
    setTimeout(() => div.remove(), 4000);
}

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
            mostrarMensaje('✅ Propiedad creada exitosamente', 'exito');
            e.target.reset();
        } else {
            mostrarMensaje('❌ Error al crear propiedad', 'error');
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
            card.innerHTML = `<h3>${prop.tipo_inmueble.toUpperCase()}</h3><p><strong>Ubicación:</strong> ${prop.ubicacion_direccion}, ${prop.ubicacion_ciudad}</p><p><strong>Propietario:</strong> ${prop.propietario_nombre}</p><p><strong>m² construcción:</strong> ${prop.m2_construccion || 'N/A'}</p><p><strong>Tipo:</strong> ${prop.tipo_operacion === 'venta' ? 'VENTA' : 'RENTA'}</p><div class="precio">$${parseFloat(prop.precio).toLocaleString('es-MX')}</div><span class="badge">${prop.estado_propiedad}</span>`;
            container.appendChild(card);
        });
    } catch (error) {
        mostrarMensaje(`Error: ${error.message}`, 'error');
    }
}

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
            mostrarMensaje('❌ Error al agregar cliente', 'error');
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

        if (clientes.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center;">No hay clientes registrados aún</p>';
            return;
        }

        clientes.forEach(cliente => {
            const card = document.createElement('div');
            card.className = 'cliente-card';
            card.innerHTML = `<h3>${cliente.nombre}</h3><p>📧 ${cliente.email || 'N/A'}</p><p>📱 ${cliente.telefono || 'N/A'}</p><p>💬 ${cliente.whatsapp ? 'WhatsApp: ' + cliente.whatsapp : 'Sin WhatsApp'}</p><p><strong>Presupuesto:</strong> $${cliente.presupuesto_estimado ? parseFloat(cliente.presupuesto_estimado).toLocaleString('es-MX') : 'N/A'}</p><p><strong>Tipo inmueble:</strong> ${cliente.tipo_inmueble_buscado || 'N/A'}</p><p><strong>Tipo operación:</strong> ${cliente.tipo_operacion_buscada || 'N/A'}</p><p><strong>Origen:</strong> ${cliente.origen_contacto || 'N/A'}</p><p><strong>Estado:</strong> <span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 4px;">${cliente.estado}</span></p>`;
            container.appendChild(card);
        });
    } catch (error) {
        mostrarMensaje(`Error: ${error.message}`, 'error');
    }
}