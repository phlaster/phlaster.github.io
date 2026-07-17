export default {
  async fetch(request, env) {
    if (!env.SECRET_KEY || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      throw new Error("Server configuration error: Missing required environment variables.");
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // 1. Выдача задания
    if (url.pathname === '/api/challenge' && request.method === 'GET') {
      const ts = Date.now();
      const challenge = `${ts}.${await hmac(ts, env.SECRET_KEY)}`;
      return new Response(JSON.stringify({ challenge }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 2. Прием формы, проверка PoW и отправка в Telegram
    if (url.pathname === '/api/submit' && request.method === 'POST') {
      try {
        const { challenge, nonce, name, email, subject, message } = await request.json();
        const [tsStr, sig] = challenge.split('.');
        const ts = parseInt(tsStr);

        // Задание действительно 10 минут
        if (Date.now() - ts > 10 * 60 * 1000) {
          return new Response(JSON.stringify({ error: 'Challenge expired' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }

        // Проверка подписи
        const expectedSig = await hmac(ts, env.SECRET_KEY);
        if (sig !== expectedSig) {
          return new Response(JSON.stringify({ error: 'Invalid challenge' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }

        // Проверка Proof-of-Work (4 нуля в конце и символ перед ними от 0 до 5)
        const data = new TextEncoder().encode(challenge + nonce);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

        if (!(hashHex.endsWith('0000') && '012345'.includes(hashHex[hashHex.length - 5]))) {
          return new Response(JSON.stringify({ error: 'Invalid PoW' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }

        // Формируем сообщение для Telegram
        const tgText = `📩 *New Portfolio Message*\n\n*Name:* ${name}\n*Email:* ${email}\n*Subject:* ${subject || '—'}\n\n*Message:*\n${message}`;
        
        // Отправляем в Telegram Bot API
        const tgRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text: tgText,
            parse_mode: 'Markdown'
          })
        });

        if (!tgRes.ok) {
          const tgErr = await tgRes.json();
          console.error('Telegram API error:', tgErr);
          throw new Error('Failed to send to Telegram');
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
};

async function hmac(ts, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ts.toString()));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}