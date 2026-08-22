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
            // Handle checkboxes
            data.tiene_jardin = document.querySelector('input[name="tiene_jardin"]').checked;
            data.tiene_recamara_bano_planta_baja = document.querySelector('input[name="tiene_recamara_bano_planta_baja"]').checked;

            fetch(API_URL + '/propiedades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(function(response) {
                if (response.ok) {
                    mostrarMensaje('Propiedad creada', 'exito');
                    formPropiedad.reset();
                } else {
                    return response.json().then(function(err) {
                        mostrarMensaje(err.details ? err.details.join(', ') : err.error || 'Error al crear', 'error');
                    });
                }
            }).catch(function(error) {
                mostrarMensaje('Error: ' + error.message, 'error');
            });
        });
    }

    function cargarPropiedades(filtros) {
        var url = API_URL + '/propiedades';
        if (filtros) {
            var params = [];
            if (filtros.cuartos_min) params.push('cuartos_min=' + filtros.cuartos_min);
            if (filtros.banos_min) params.push('banos_min=' + filtros.banos_min);
            if (filtros.precio_min) params.push('precio_min=' + filtros.precio_min);
            if (filtros.precio_max) params.push('precio_max=' + filtros.precio_max);
            if (filtros.tipo_operacion) params.push('tipo_operacion=' + filtros.tipo_operacion);
            if (filtros.tipo_inmueble) params.push('tipo_inmueble=' + filtros.tipo_inmueble);
            if (filtros.tiene_jardin) params.push('tiene_jardin=true');
            if (filtros.tiene_recamara_bano_planta_baja) params.push('tiene_recamara_bano_planta_baja=true');
            if (params.length > 0) url += '?' + params.join('&');
        }

        fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(propiedades) {
            var container = document.getElementById('propiedadesList');
            container.innerHTML = '';
            if (!propiedades || propiedades.length === 0) {
                container.innerHTML = '<p style="color:#999;text-align:center;grid-column:1/-1;">No hay propiedades</p>';
                return;
            }
            propiedades.forEach(function(prop) {
                var card = document.createElement('div');
                card.className = 'propiedad-card';
                var amenidades = [];
                if (prop.cuartos) amenidades.push(prop.cuartos + ' cuartos');
                if (prop.banos) amenidades.push(prop.banos + ' baños');
                if (prop.estacionamientos) amenidades.push(prop.estacionamientos + ' est.');
                if (prop.tiene_jardin) amenidades.push('🌳 Jardín');
                if (prop.tiene_recamara_bano_planta_baja) amenidades.push('🛏️ Rec. baño P.B.');
                var amenidadesHtml = amenidades.length > 0 ? '<div class="amenidades">' + amenidades.join(' • ') + '</div>' : '';
                card.innerHTML = '<h3>' + prop.tipo_inmueble.toUpperCase() + '</h3><p><strong>Ubicación:</strong> ' + prop.ubicacion_direccion + ', ' + prop.ubicacion_ciudad + '</p><p><strong>Propietario:</strong> ' + prop.propietario_nombre + '</p>' + amenidadesHtml + '<div class="precio">$' + parseFloat(prop.precio).toLocaleString('es-MX') + '</div><span class="badge">' + prop.estado_propiedad + '</span>';
                container.appendChild(card);
            });
        }).catch(function(error) {
            mostrarMensaje('Error al cargar propiedades: ' + error.message, 'error');
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

    window.submitCliente = function() {
        var formCliente = document.getElementById('formCliente');
        var formData = new FormData(formCliente);
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
                return response.json().then(function(err) {
                    mostrarMensaje(err.details ? err.details.join(', ') : 'Error al agregar', 'error');
                });
            }
        }).catch(function(error) {
            mostrarMensaje('Error: ' + error.message, 'error');
        });
    };

    window.aplicarFiltros = function() {
        var filtros = {
            cuartos_min: document.getElementById('filtro_cuartos_min').value,
            banos_min: document.getElementById('filtro_banos_min').value,
            precio_min: document.getElementById('filtro_precio_min').value,
            precio_max: document.getElementById('filtro_precio_max').value,
            tipo_operacion: document.getElementById('filtro_tipo_operacion').value,
            tipo_inmueble: document.getElementById('filtro_tipo_inmueble').value,
            tiene_jardin: document.getElementById('filtro_jardin').checked,
            tiene_recamara_bano_planta_baja: document.getElementById('filtro_recamara_bano').checked
        };
        cargarPropiedades(filtros);
    };

    window.limpiarFiltros = function() {
        document.getElementById('filtro_cuartos_min').value = '';
        document.getElementById('filtro_banos_min').value = '';
        document.getElementById('filtro_precio_min').value = '';
        document.getElementById('filtro_precio_max').value = '';
        document.getElementById('filtro_tipo_operacion').value = '';
        document.getElementById('filtro_tipo_inmueble').value = '';
        document.getElementById('filtro_jardin').checked = false;
        document.getElementById('filtro_recamara_bano').checked = false;
        cargarPropiedades();
    };
};