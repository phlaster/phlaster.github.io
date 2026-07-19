const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json', ...corsHeaders }
});

async function verifyPoW(challenge, nonce, env) {
  const isValid = await env.CHALLENGES.get(challenge);
  if (!isValid) return false;
  await env.CHALLENGES.delete(challenge);

  const data = new TextEncoder().encode(challenge + nonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex.endsWith('0000') && '012345'.includes(hashHex[hashHex.length - 5]);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const { pathname } = url;

    try {
      if (pathname === '/api/challenge' && request.method === 'GET') {
        const challenge = crypto.randomUUID();
        await env.CHALLENGES.put(challenge, "valid", { expirationTtl: 600 });
        return json({ challenge });
      }

      if (pathname === '/api/get-email' && request.method === 'POST') {
        const { challenge, nonce } = await request.json();
        if (!(await verifyPoW(challenge, nonce, env))) {
          return json({ error: 'Invalid or expired challenge' }, 400);
        }
        
        return json({ 
          email: env.MY_EMAIL, 
          telegram: env.MY_TELEGRAM,
          github: env.MY_GITHUB,
          gitlab: env.MY_GITLAB
        });
      }

      if (pathname === '/api/submit' && request.method === 'POST') {
        const { challenge, nonce, name, email, subject, message } = await request.json();
        if (!(await verifyPoW(challenge, nonce, env))) {
          return json({ error: 'Invalid or expired challenge' }, 400);
        }

        const tgText = `📩 *New Portfolio Message*\n\n*Name:* ${name}\n*Email:* ${email}\n*Subject:* ${subject || '—'}\n\n*Message:*\n${message}`;
        
        const tgRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text: tgText,
            parse_mode: 'Markdown'
          })
        });

        if (!tgRes.ok) throw new Error('Telegram API error');
        
        return json({ success: true });
      }

      return json({ error: 'Not found' }, 404);

    } catch (e) {
      console.error(e);
      return json({ error: 'Internal Server Error' }, 500);
    }
  }
};