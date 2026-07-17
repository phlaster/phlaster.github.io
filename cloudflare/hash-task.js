export default {
  async fetch(request, env) {
    // Добавили MY_GITHUB и MY_GITLAB
    if (!env.MY_EMAIL || !env.MY_TELEGRAM || !env.MY_GITHUB || !env.MY_GITLAB || !env.CHALLENGES) {
      throw new Error("Server configuration error: Missing environment variables or KV namespace.");
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);

    // 1. Выдача задания
    if (url.pathname === '/api/challenge' && request.method === 'GET') {
      const challenge = crypto.randomUUID();
      await env.CHALLENGES.put(challenge, "valid", {
        expirationTtl: 600
      });
      return new Response(JSON.stringify({
        challenge
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // 2. Проверка решения и выдача контактов
    if (url.pathname === '/api/get-email' && request.method === 'POST') {
      try {
        const {
          challenge,
          nonce
        } = await request.json();
        const challengeStatus = await env.CHALLENGES.get(challenge);
        if (!challengeStatus) {
          return new Response(JSON.stringify({
            error: 'Challenge invalid, expired, or already used'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        await env.CHALLENGES.delete(challenge);

        const data = new TextEncoder().encode(challenge + nonce);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashHex.endsWith('0000') && '012345'.includes(hashHex[hashHex.length - 5])) {
          // Отдаем все 4 значения
          return new Response(JSON.stringify({
            email: env.MY_EMAIL,
            telegram: env.MY_TELEGRAM,
            github: env.MY_GITHUB,
            gitlab: env.MY_GITLAB
          }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } else {
          return new Response(JSON.stringify({
            error: 'Invalid PoW'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      } catch (e) {
        return new Response(JSON.stringify({
          error: 'Bad request'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }

    return new Response('Not found', {
      status: 404,
      headers: corsHeaders
    });
  }
};