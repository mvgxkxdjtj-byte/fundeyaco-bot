const express = require('express');
const app = express();
app.use(express.json());

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
const VERIFY_TOKEN      = process.env.VERIFY_TOKEN      || 'fundeyaco_webhook_2026';
const INSTAGRAM_TOKEN   = process.env.INSTAGRAM_TOKEN;
const CLAUDE_API_KEY    = process.env.CLAUDE_API_KEY;
const PORT              = process.env.PORT || 8080;

// ─── PROMPT SYSTÈME FUNDEYACO ────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres el asistente virtual de Fundeyaco (Fundación de Emergencia y Ayuda a Colombia), una ONG con sede en Mocoa, Colombia, que apoya comunidades vulnerables promoviendo su autonomía a través de la producción agrícola natural.

Nuestros productos son 100% naturales, sin aditivos ni conservantes, cultivados localmente.

CATÁLOGO DE PRECIOS:

Cúrcuma en polvo:
  • 50 g  → $10.000
  • 100 g → $15.000
  • 500 g → $42.000
  • 750 g → $65.000
  • 1 kg  → $75.000

Cúrcuma en rizoma:
  • 1 kg  → $18.000

Pimienta negra en grano:
  • 500 g → $30.000
  • 1 kg  → $55.000

Pimienta negra molida:
  • 250 g → $19.000
  • 500 g → $35.000
  • 1 kg  → $59.000

PRECIOS AL POR MAYOR:
Para pedidos superiores a 10 kg, ofrecemos precios especiales al por mayor. Escríbenos por WhatsApp y te damos el mejor precio según cantidad y destino.

Realizamos envíos a todo Colombia.

Para hacer un pedido o solicitar cotización al por mayor:
WhatsApp Business: +57 322 881 9268

INSTRUCCIONES DE RESPUESTA:
- Responde siempre en español, con tono cálido, cercano y profesional.
- Sé conciso: máximo 4-5 líneas por respuesta.
- Si alguien pregunta por precios, muestra el listado completo del producto mencionado.
- Si alguien quiere hacer un pedido o pide más de 10 kg, redirige siempre al WhatsApp.
- Si la pregunta no tiene relación con nuestros productos o la fundación, responde amablemente que solo puedes ayudar con información sobre Fundeyaco.`;

// ─── WEBHOOK VERIFICATION ────────────────────────────────────────────────────
app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.error('Webhook verification failed');
    res.sendStatus(403);
  }
});

// ─── WEBHOOK EVENT HANDLER ───────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Acknowledge immediately

  const body = req.body;
  if (body.object !== 'instagram') return;

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message || event.message.is_echo) continue;

      const senderId = event.sender.id;
      const text     = event.message.text;

      if (!text) continue;

      console.log(`Message from ${senderId}: ${text}`);

      try {
        const reply = await askClaude(text);
        await sendInstagramMessage(senderId, reply);
        console.log(`Reply sent to ${senderId}: ${reply}`);
      } catch (err) {
        console.error('Error processing message:', err.message);
      }
    }
  }
});

// ─── CLAUDE API ──────────────────────────────────────────────────────────────
async function askClaude(userMessage) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Claude API error');
  return data.content[0].text;
}

// ─── INSTAGRAM SEND MESSAGE ──────────────────────────────────────────────────
async function sendInstagramMessage(recipientId, text) {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data.error));
  return data;
}

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Fundeyaco Bot', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`Fundeyaco Bot running on port ${PORT}`);
});
