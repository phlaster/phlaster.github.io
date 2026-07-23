const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json',
    ...corsHeaders
  }
});

const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function verifyPoW(challenge, nonce, env) {
  const startTimeStr = await env.CHALLENGES.get(challenge);
  if (!startTimeStr) return null;

  await env.CHALLENGES.delete(challenge);
  const startTime = parseInt(startTimeStr, 10);
  const elapsed = Date.now() - startTime;

  if (nonce === 'TIMEOUT') {
    if (elapsed >= 10000) {
      return startTime;
    }
    return null;
  }

  const data = new TextEncoder().encode(challenge + nonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

  if (hashHex.endsWith('0000') && '012345'.includes(hashHex[hashHex.length - 5])) {
    return startTime;
  }
  return null;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const {
      pathname
    } = url;

    try {
      if (pathname === '/api/challenge' && request.method === 'GET') {
        const challenge = crypto.randomUUID();
        const startTime = Date.now().toString();
        await env.CHALLENGES.put(challenge, startTime, {
          expirationTtl: 600
        });
        return json({
          challenge
        });
      }

      if (pathname === '/api/get-email' && request.method === 'POST') {
        const {
          challenge,
          nonce
        } = await request.json();
        const startTime = await verifyPoW(challenge, nonce, env);
        if (!startTime) return json({
          error: 'Invalid or expired challenge'
        }, 400);

        return json({
          email: env.MY_EMAIL,
          telegram: env.MY_TELEGRAM
        });
      }

      if (pathname === '/api/submit' && request.method === 'POST') {
        const {
          challenge,
          nonce,
          name,
          email,
          subject,
          message
        } = await request.json();

        // --- RATE LIMITING ---
        const ip = request.headers.get('CF-Connecting-IP') || 'Unknown';
        const blockKey = `block_${ip}`;
        const lastTimeKey = `last_${ip}`;

        const isBlocked = await env.CHALLENGES.get(blockKey);
        const lastSubmitTimeStr = await env.CHALLENGES.get(lastTimeKey);

        if (isBlocked) {
          await env.CHALLENGES.put(blockKey, '1', {
            expirationTtl: 60
          });
          return json({
            error: 'You are sending messages too fast. Timer reset. Please try again in a minute.'
          }, 429);
        }

        if (lastSubmitTimeStr) {
          const diff = Date.now() - parseInt(lastSubmitTimeStr, 10);
          if (diff < 30000) {
            await env.CHALLENGES.put(blockKey, '1', {
              expirationTtl: 60
            });
            return json({
              error: 'Please wait at least 30 seconds between messages. A timer has started.'
            }, 429);
          }
        }

        const startTime = await verifyPoW(challenge, nonce, env);
        if (!startTime) return json({
          error: 'Invalid or expired challenge'
        }, 400);

        const durationSec = Math.round((Date.now() - startTime) / 1000);

        const cf = request.cf || {};
        const country = cf.country || 'Unknown';
        const city = cf.city || 'Unknown';
        const isp = cf.asOrganization || 'Unknown ISP';
        const userAgent = request.headers.get('User-Agent') || 'Unknown UA';
        const lang = request.headers.get('Accept-Language') || 'Unknown';

        let tgText = `📩 <b>New Portfolio Message</b>\n\n`;
        tgText += `<b>Name:</b> ${escHtml(name || '—')}\n`;
        tgText += `<b>Email:</b> ${escHtml(email || '—')}\n`;
        tgText += `<b>Subject:</b> ${escHtml(subject || '—')}\n\n`;
        tgText += `<b>Message:</b>\n${escHtml(message)}`;

        tgText += `\n\n<b>Meta:</b>\n`;
        tgText += `<b>Time Spent:</b> <code>${durationSec} sec</code>\n`;
        tgText += `<b>IP:</b> <code>${escHtml(ip)}</code>\n`;
        tgText += `<b>Location:</b> <code>${escHtml(city)}, ${escHtml(country)}</code>\n`;
        tgText += `<b>ISP:</b> <code>${escHtml(isp)}</code>\n`;
        tgText += `<b>Browser Lang:</b> <code>${escHtml(lang.split(',')[0])}</code>\n`;
        tgText += `<b>UA:</b> <code>${escHtml(userAgent)}</code>`;

        const tgRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text: tgText,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        });

        const tgResponseBody = await tgRes.text();
        if (!tgRes.ok) {
          console.error('Telegram API error:', tgResponseBody);
          throw new Error('Telegram API error');
        }

        await env.CHALLENGES.put(lastTimeKey, Date.now().toString(), {
          expirationTtl: 60
        });

        return json({
          success: true
        });
      }

      return json({
        error: 'Not found'
      }, 404);

    } catch (e) {
      console.error(e);
      return json({
        error: 'Internal Server Error'
      }, 500);
    }
  }
};