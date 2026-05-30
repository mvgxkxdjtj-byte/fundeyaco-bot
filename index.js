const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN    = process.env.VERIFY_TOKEN    || 'fundeyaco_webhook_2026';
const INSTAGRAM_TOKEN = process.env.INSTAGRAM_TOKEN;
const CLAUDE_API_KEY  = process.env.CLAUDE_API_KEY;
const PORT            = process.env.PORT || 8080;

const conversations = new Map();

function getHistory(userId) {
  if (!conversations.has(userId)) conversations.set(userId, []);
  return conversations.get(userId);
}

function addToHistory(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });
  if (history.length > 20) history.splice(0, 2);
}

const REEL_RESPONSES = [
  '¡Hola! 😊 Te enviamos toda la info por privado ahora mismo 🌱',
  '¡Con gusto! Te mandamos los detalles por DM 📩🌿',
  '¡Gracias por tu interés! 😊 Revisa tus mensajes privados, te enviamos todo ahí 🌱',
  '¡Hola! Te compartimos el catálogo completo por privado 📦💛',
  '¡Qué bueno que te interesa! Te escribimos por DM con toda la info 😊🌿',
  '¡Claro que sí! Te enviamos los precios y presentaciones por mensaje privado 🌱✨'
];

function getReelResponse() {
  return REEL_RESPONSES[Math.floor(Math.random() * REEL_RESPONSES.length)];
}

const SYSTEM_PROMPT = `Eres el asesor de ventas virtual de Fundeyaco (Fundación de Emergencia y Ayuda a Colombia), ONG en Mocoa, Colombia, que apoya comunidades del Putumayo a través de productos agrícolas naturales.

CATÁLOGO COMPLETO:
- Cúrcuma en polvo: 50g=$10.000 | 100g=$15.000 | 500g=$42.000 | 750g=$65.000 | 1kg=$75.000
- Cúrcuma en rizoma (fresca): 1kg=$18.000
- Pimienta negra en grano: 500g=$30.000 | 1kg=$55.000
- Pimienta negra molida: 250g=$19.000 | 500g=$35.000 | 1kg=$59.000

PRECIOS MAYOREO (negocio):
- 1kg → $75.000
- 5kg → $70.000/kg
- 10kg o más → $65.000/kg (precios mejoran según volumen y frecuencia)
- Pedidos superiores a 10kg: hablar con asesor Esteban Fajardo +57 311 228 7264

ENVÍOS:
- A todo Colombia con Interrapidísimo
- Entrega en 2-3 días hábiles
- Costo envío estimado: ~$16.000 hasta 1kg, ~$4.000 por kg adicional
- IMPORTANTE: el costo de envío es indicativo — el precio final lo confirma Interrapidísimo en la entrega
- NO mencionar el costo de envío a menos que el cliente lo pregunte

FORMAS DE PAGO (mostrar solo al confirmar pedido o si preguntan):
1. Mercado Pago: https://link.mercadopago.com.co/fundeyaco
2. Transferencia BBVA: Razón social: FUNDACION DE EMERGENCIA Y AYUDA A COLOMBIA | NIT: 901084804 | Cuenta ahorros: 0073-692923
3. Contraentrega Interrapidísimo: disponible para pedidos superiores a 1kg

FORMULARIO DE PEDIDO (pedir cuando cliente confirma):
- Nombre completo
- Cédula
- Producto y cantidad
- Número de celular
- Dirección completa
- Correo electrónico

CONFIRMACIÓN (después de recibir datos):
Resumir: producto + precio + envío aprox. (indicativo) + total aprox. Preguntar si confirma.

MENSAJE FINAL (después de confirmación):
"¡Excelente! 🌱 Tu pedido queda confirmado y será despachado en las próximas horas. Te enviaremos la guía de Interrapidísimo apenas esté disponible. ¡Gracias por apoyar a las comunidades del Putumayo! 💛"

FLUJO DE VENTAS:

PASO 1 - BIENVENIDA (primer mensaje):
Saluda con calidez. Menciona que la cúrcuma es 100% natural del Putumayo. Pregunta: ¿para consumo personal o para negocio/reventa? NO dar precios todavía.

PASO 2A - SI ES PERSONAL:
Preguntar para qué la usa y cuántas personas la consumen. Recomendar 500g como la más vendida (rinde 2-3 meses para una familia).

PASO 2B - SI ES NEGOCIO:
"¡Excelente! Trabajamos con emprendedores, tiendas y restaurantes. ¿En qué ciudad estás y qué cantidad aproximada te interesaría al mes?"
Mostrar precios mayoreo. Para +10kg redirigir a Esteban Fajardo +57 311 228 7264.

PASO 3 - PROPUESTA:
Recomendar presentación ideal según respuestas. Dar precio exacto.

PASO 4 - OBJECIONES:
- Precio alto: "Es 100% pura, sin mezclas, de 30 familias del Putumayo, sin intermediarios."
- Descuento: Solo para +5kg (mayoreo).
- Calidad: "Podemos enviarte un video del cultivo 📹"

PASO 5 - CIERRE:
Pedir datos del formulario. Calcular total aprox (producto + envío indicativo). Confirmar. Mensaje final.

REGLAS:
- Siempre en español, tono cálido y cercano
- Máximo 5-6 líneas por mensaje
- Una sola pregunta por mensaje
- NO mencionar costo de envío a menos que pregunten
- NO dar todos los precios de golpe
- Si el cliente hace preguntas complejas fuera del alcance: "Para darte la mejor atención, te recomiendo hablar con nuestro asesor Esteban Fajardo 📱 +57 311 228 7264"
- Para pedidos mayoristas o negociaciones de volumen: SIEMPRE redirigir a Esteban Fajardo +57 311 228 7264
- Si ya confirmó pedido, despedirse con calidez`;

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  const body = req.body;
  if (body.object !== 'instagram') return;

  for (const entry of body.entry || []) {

    // Gestion des commentaires sur posts/reels
    for (const change of entry.changes || []) {
      if (change.field === 'comments' && change.value) {
        const comment = change.value;
        if (comment.from && comment.text && !comment.parent_id) {
          const reelReply = getReelResponse();
          console.log(`[COMMENT] ${comment.from.id}: ${comment.text} → ${reelReply}`);
          try {
            await sendInstagramMessage(comment.from.id, reelReply);
          } catch (err) {
            console.error('Comment reply error:', err.message);
          }
        }
      }
    }

    // Gestion des DMs
    for (const event of entry.messaging || []) {
      if (!event.message || event.message.is_echo) continue;
      const senderId = event.sender.id;
      const text = event.message.text;
      if (!text) continue;

      console.log(`[DM IN] ${senderId}: ${text}`);
      try {
        addToHistory(senderId, 'user', text);
        const reply = await askClaude(getHistory(senderId));
        addToHistory(senderId, 'assistant', reply);
        await sendInstagramMessage(senderId, reply);
        console.log(`[DM OUT] ${senderId}: ${reply.substring(0, 100)}`);
      } catch (err) {
        console.error('DM error:', err.message);
      }
    }
  }
});

async function askClaude(messages) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: messages
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Claude API error');
  return data.content[0].text;
}

async function sendInstagramMessage(recipientId, text) {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } })
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data.error));
  return data;
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Fundeyaco Bot v3.1', conversations: conversations.size });
});

app.listen(PORT, () => console.log(`Fundeyaco Bot v3.1 running on port ${PORT}`));
