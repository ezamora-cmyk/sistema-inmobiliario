// Validación del webhook de Meta
/**
 * WEBHOOK META LEADS + AGENTE IA AUTOMÁTICO
 * Coloca este código en tu backend (Express)
 * 
 * Funcionalidad:
 * 1. Recibe leads de Meta Ads Lead Forms
 * 2. Responde automáticamente vía Claude + WhatsApp
 * 3. Califica el lead (caliente/tibio/frío)
 * 4. Registra en tu BD
 */

const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// ============================================
// 1. RECIBIR WEBHOOK DE META ADS
// ============================================

/**
 * POST /api/webhook/meta-lead
 * 
 * Meta Ads enviará aquí los leads en formato JSON:
 * {
 *   "entry": [{
 *     "changes": [{
 *       "value": {
 *         "form_id": "...",
 *         "field_data": [
 *           { "name": "full_name", "value": "Juan Pérez" },
 *           { "name": "phone_number", "value": "+5491234567" },
 *           { "name": "email", "value": "juan@email.com" },
 *           { "name": "leadgen_qualifying_questions": ... }
 *         ]
 *       }
 *     }]
 *   }]
 * }
 */

router.post('/meta-lead', async (req, res) => {
  try {
    const data = req.body;

    // Validar que Meta está enviando
    if (!data.entry || !data.entry[0].changes) {
      console.log('Webhook verificación de Meta (ping):', data);
      return res.sendStatus(200);
    }

    // Extraer datos del lead
    const leadData = data.entry[0].changes[0].value;
    const fieldData = leadData.field_data || [];

    // Mapear campos
    const lead = {};
    fieldData.forEach((field) => {
      const value = field.value || '';
      switch (field.name.toLowerCase()) {
        case 'full_name':
        case 'nombre':
          lead.nombre = value;
          break;
        case 'phone_number':
        case 'phone':
        case 'teléfono':
          lead.telefono = value;
          break;
        case 'email':
        case 'correo':
          lead.email = value;
          break;
        case 'message':
        case 'mensaje':
          lead.mensaje = value;
          break;
        default:
          // Preguntas personalizadas (presupuesto, zona, etc)
          if (field.name.includes('presupuesto')) {
            lead.presupuesto = value;
          }
          if (field.name.includes('tipo')) {
            lead.tipo_inmueble = value;
          }
      }
    });

    lead.formulario = leadData.form_id;
    lead.origen = 'meta_ads';
    lead.timestamp = new Date();

    console.log('📲 NUEVO LEAD RECIBIDO:', lead);

    // ============================================
    // 2. GUARDAR EN BD
    // ============================================
    
    const clienteId = await guardarLeadEnBD(lead);
    console.log(`✅ Lead guardado con ID: ${clienteId}`);

    // ============================================
    // 3. RESPUESTA AUTOMÁTICA CON CLAUDE + WHATSAPP
    // ============================================

    // No esperar a que termine (non-blocking)
    responderALeadAutomaticamente(lead, clienteId).catch((err) => {
      console.error('❌ Error en respuesta automática:', err);
    });

    // Responder inmediatamente a Meta
    res.status(200).json({ success: true, leadId: clienteId });

  } catch (error) {
    console.error('❌ Error en webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FUNCIÓN: GUARDAR LEAD EN BD
// ============================================

async function guardarLeadEnBD(lead) {
  // Aquí va tu conexión a SQLite
  // REEMPLAZA CON TU CONEXIÓN REAL

  const query = `
    INSERT INTO clientes 
    (nombre, email, telefono, whatsapp, presupuesto, tipo_inmueble, origen, respondido, calificacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    lead.nombre || 'Sin nombre',
    lead.email || '',
    lead.telefono || '',
    lead.telefono || '', // Mismo que telefono para WhatsApp
    lead.presupuesto || '',
    lead.tipo_inmueble || '',
    lead.origen,
    0, // No respondido aún
    'sin_clasificar'
  ];

  // CONEXIÓN A BD - MODIFICA SEGÚN TU SETUP
  // Ej: const result = await db.run(query, values);
  // return result.lastID;

  // PLACEHOLDER (tú lo conectas con tu BD):
  console.log('Insertando:', values);
  return Math.floor(Math.random() * 10000); // Simulado
}

// ============================================
// FUNCIÓN: RESPUESTA AUTOMÁTICA
// ============================================

async function responderALeadAutomaticamente(lead, clienteId) {
  try {
    // 1. Generar respuesta con Claude
    const respuesta = await generarRespuestaConClaude(lead);

    // 2. Enviar por WhatsApp
    if (lead.telefono) {
      await enviarWhatsApp(lead.telefono, respuesta);
      console.log('✅ WhatsApp enviado a', lead.telefono);
    } else if (lead.email) {
      console.log('⚠️ Sin teléfono, tendría que enviar por email:', lead.email);
    }

    // 3. Registrar en BD que ya respondimos
    await actualizarLeadRespondido(clienteId, respuesta);

    // 4. Calificar el lead automáticamente
    const calificacion = await calificarLead(lead);
    await actualizarCalificacionLead(clienteId, calificacion);

    // 5. Si es "caliente", notificar a agente
    if (calificacion === 'caliente') {
      await notificarAgenteLeadCaliente(lead, clienteId);
    }

  } catch (error) {
    console.error('❌ Error en respuesta automática:', error);
  }
}

// ============================================
// FUNCIÓN: GENERAR RESPUESTA CON CLAUDE API
// ============================================

async function generarRespuestaConClaude(lead) {
  const prompt = `
Soy el asistente virtual de Anahí López, tu asesora inmobiliaria profesional de 3 Raíces.

CLIENTE:
- Nombre: ${lead.nombre || 'Cliente'}
- Tipo de inmueble buscado: ${lead.tipo_inmueble || 'No especificado'}
- Presupuesto: ${lead.presupuesto || 'No especificado'}
- Mensaje del cliente: ${lead.mensaje || '(Sin mensaje)'}

Tu tarea:
1. Responde BREVEMENTE (máx 2 párrafos, 150 palabras)
2. Demuestra empatía y que entiendes su necesidad
3. Haz UNA pregunta de calificación
4. Termina con CTA suave

IMPORTANTE:
- Tono: Profesional pero amigable
- Idioma: Español
- Contexto: Mercado inmobiliario Xalapa, Veracruz
- Responde SOLO el mensaje (sin preámbulos ni aclaraciones)

Respuesta:`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ============================================
// FUNCIÓN: ENVIAR WHATSAPP
// ============================================

async function enviarWhatsApp(telefono, mensaje) {
  // OPCIÓN 1: Twilio
  // const twilio = require('twilio');
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // return client.messages.create({
  //   from: process.env.TWILIO_WHATSAPP_NUMBER,
  //   to: `whatsapp:${telefono}`,
  //   body: mensaje
  // });

  // OPCIÓN 2: Meta WhatsApp Business API
  const whatsappApiUrl = `https://graph.instagram.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: telefono.replace(/\D/g, ''), // Solo números
    type: 'text',
    text: {
      preview_url: false,
      body: mensaje,
    },
  };

  const response = await fetch(whatsappApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('WhatsApp error:', error);
    throw new Error('No se pudo enviar WhatsApp');
  }

  return response.json();
}

// ============================================
// FUNCIÓN: CALIFICAR LEAD
// ============================================

async function calificarLead(lead) {
  const prompt = `
Clasificá este lead de inmobiliaria:

Datos:
- Presupuesto: ${lead.presupuesto || 'No indicado'}
- Tipo inmueble: ${lead.tipo_inmueble || 'No especificado'}
- Mensaje: ${lead.mensaje || 'Sin mensaje'}

Clasifica en UNO de estos:
🔥 CALIENTE: Presupuesto claro + urgencia explícita
🟡 TIBIO: Interesado pero indefinido
🥶 FRÍO: Solo explorando o sin presupuesto

Responde SOLO con una palabra: caliente, tibio o frio`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const calificacion = data.content[0].text.toLowerCase().trim();

  return ['caliente', 'tibio', 'frio'].includes(calificacion) ? calificacion : 'tibio';
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

async function actualizarLeadRespondido(clienteId, respuesta) {
  // INSERT INTO seguimientos (cliente_id, tipo, mensaje, timestamp)
  // VALUES (?, 'respuesta_automatica', ?, NOW())
  console.log(`Registrando respuesta automática para cliente ${clienteId}`);
}

async function actualizarCalificacionLead(clienteId, calificacion) {
  // UPDATE clientes SET calificacion = ? WHERE id = ?
  console.log(`Lead ${clienteId} calificado como: ${calificacion}`);
}

async function notificarAgenteLeadCaliente(lead, clienteId) {
  // Enviar notificación push, SMS o email a agentes
  console.log(`🔥 LEAD CALIENTE: ${lead.nombre} - ID: ${clienteId}`);
  
  // Opcionalmente enviar notificación por email/Telegram/Slack a agentes
}

// ============================================
// VERIFICACIÓN DE WEBHOOK (Meta requiere esto)
// ============================================

router.get('/meta-lead', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Reemplaza con tu token de verificación
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'tu_token_secreto';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verificado por Meta');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

module.exports = router;