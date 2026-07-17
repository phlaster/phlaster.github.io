export default {
  async fetch(request, env) {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID || !env.CHALLENGES) {
      throw new Error("Server configuration error: Missing required environment variables or KV namespace.");
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
      // Генерируем криптографически стойкий случайный токен
      const challenge = crypto.randomUUID();

      // Сохраняем в KV на 10 минут (600 секунд)
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

    // 2. Прием формы, проверка PoW и отправка в Telegram
    if (url.pathname === '/api/submit' && request.method === 'POST') {
      try {
        const {
          challenge,
          nonce,
          name,
          email,
          subject,
          message
        } = await request.json();

        // Проверяем, существует ли челлендж в KV и не был ли он использован
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

        // Удаляем челлендж из KV, чтобы его нельзя было использовать повторно!
        await env.CHALLENGES.delete(challenge);

        // Проверка Proof-of-Work
        const data = new TextEncoder().encode(challenge + nonce);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

        if (!(hashHex.endsWith('0000') && '012345'.includes(hashHex[hashHex.length - 5]))) {
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

        // Формируем сообщение для Telegram
        const tgText = `📩 *New Portfolio Message*\n\n*Name:* ${name}\n*Email:* ${email}\n*Subject:* ${subject || '—'}\n\n*Message:*\n${message}`;

        // Отправляем в Telegram Bot API
        const tgRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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

        return new Response(JSON.stringify({
          success: true
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });

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