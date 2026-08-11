// v2.0 window.onload
window.onload = function() {
    var API_URL = 'https://sistema-inmobiliario-api.onrender.com/api';

    window.showTab = function(tabName) {
        document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
        document.querySelectorAll('.tab-btn').forEach(function(el) { el.classList.remove('active'); });
        document.getElementById(tabName).classList.add('active');
        event.target.classList.add('active');
        if (tabName === 'inventario') cargarPropiedades();
        if (tabName === 'clientes') cargarClientes();
    };

    function mostrarMensaje(msg, tipo) {
        tipo = tipo || 'exito';
        var div = document.createElement('div');
        div.className = 'mensaje ' + tipo;
        div.textContent = msg;
        document.body.insertBefore(div, document.body.firstChild);
        setTimeout(function() { div.remove(); }, 4000);
    }

    var formPropiedad = document.getElementById('formPropiedad');
    if (formPropiedad) {
        formPropiedad.addEventListener('submit', function(e) {
            e.preventDefault();
            var formData = new FormData(e.target);
            var data = {};
            formData.forEach(function(value, key) { data[key] = value; });
            fetch(API_URL + '/propiedades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(function(response) {
                if (response.ok) {
                    mostrarMensaje('Propiedad creada', 'exito');
                    formPropiedad.reset();
                } else {
                    mostrarMensaje('Error al crear', 'error');
                }
            }).catch(function(error) {
                mostrarMensaje('Error: ' + error.message, 'error');
            });
        });
    }

    function cargarPropiedades() {
        fetch(API_URL + '/propiedades')
        .then(function(r) { return r.json(); })
        .then(function(propiedades) {
            var container = document.getElementById('propiedadesList');
            container.innerHTML = '';
            propiedades.forEach(function(prop) {
                var card = document.createElement('div');
                card.className = 'propiedad-card';
                card.innerHTML = '<h3>' + prop.tipo_inmueble.toUpperCase() + '</h3><p><strong>Ubicación:</strong> ' + prop.ubicacion_direccion + ', ' + prop.ubicacion_ciudad + '</p><p><strong>Propietario:</strong> ' + prop.propietario_nombre + '</p><div class="precio">$' + parseFloat(prop.precio).toLocaleString('es-MX') + '</div><span class="badge">' + prop.estado_propiedad + '</span>';
                container.appendChild(card);
            });
        });
    }

    var formCliente = document.getElementById('formCliente');
    if (formCliente) {
        formCliente.addEventListener('submit', function(e) {
            e.preventDefault();
            var formData = new FormData(e.target);
            var data = {};
            formData.forEach(function(value, key) { data[key] = value; });
            fetch(API_URL + '/clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(function(response) {
                if (response.ok) {
                    mostrarMensaje('Cliente agregado', 'exito');
                    formCliente.reset();
                    cargarClientes();
                } else {
                    mostrarMensaje('Error al agregar', 'error');
                }
            }).catch(function(error) {
                mostrarMensaje('Error: ' + error.message, 'error');
            });
        });
    }

    function cargarClientes() {
        fetch(API_URL + '/clientes')
        .then(function(r) { return r.json(); })
        .then(function(clientes) {
            var container = document.getElementById('clientesList');
            container.innerHTML = '';
            if (!clientes || clientes.length === 0) {
                container.innerHTML = '<p style="color:#999;text-align:center;">No hay clientes</p>';
                return;
            }
            clientes.forEach(function(c) {
                var card = document.createElement('div');
                card.className = 'cliente-card';
                card.innerHTML = '<h3>' + c.nombre + '</h3><p>Email: ' + (c.email || 'N/A') + '</p><p>Tel: ' + (c.telefono || 'N/A') + '</p><p>WhatsApp: ' + (c.whatsapp || 'N/A') + '</p><p><strong>Presupuesto:</strong> $' + (c.presupuesto_estimado ? parseFloat(c.presupuesto_estimado).toLocaleString('es-MX') : 'N/A') + '</p><p><strong>Inmueble:</strong> ' + (c.tipo_inmueble_buscado || 'N/A') + '</p><p><strong>Operación:</strong> ' + (c.tipo_operacion_buscada || 'N/A') + '</p><p><strong>Origen:</strong> ' + (c.origen_contacto || 'N/A') + '</p><p><strong>Estado:</strong> ' + c.estado + '</p>';
                container.appendChild(card);
            });
        });
    }
};