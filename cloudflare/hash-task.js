export default {
  async fetch(request, env) {
    // Строгая проверка переменных окружения.
    if (!env.SECRET_KEY || !env.MY_EMAIL || !env.MY_TELEGRAM) {
      throw new Error("Server configuration error: Missing SECRET_KEY, MY_EMAIL or MY_TELEGRAM environment variables.");
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

    // 2. Проверка решения и выдача email
    if (url.pathname === '/api/get-email' && request.method === 'POST') {
      try {
        const { challenge, nonce } = await request.json();
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

        // Проверка Proof-of-Work
        const data = new TextEncoder().encode(challenge + nonce);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

        // Сложность вычислений регулируется здесь
        if (hashHex.endsWith('0000') && '012345'.includes(hashHex[hashHex.length - 5])) {
          return new Response(JSON.stringify({ 
            email: env.MY_EMAIL, 
            telegram: env.MY_TELEGRAM 
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } else {
          return new Response(JSON.stringify({ error: 'Invalid PoW' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }
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