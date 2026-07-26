const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      if (pathname === '/api/submit' && request.method === 'POST') {
        const {
          name,
          email,
          subject,
          message,
          duration
        } = await request.json();

        // --- RATE LIMITING (10 seconds) ---
        const ip = request.headers.get('CF-Connecting-IP') || 'Unknown';
        const lastTimeKey = `last_${ip}`;
        const lastSubmitTimeStr = await env.CHALLENGES.get(lastTimeKey);

        if (lastSubmitTimeStr) {
          const diff = Date.now() - parseInt(lastSubmitTimeStr, 10);
          if (diff < 10000) {
            return json({
              error: 'Too many requests. Please wait at least 10 seconds.'
            }, 429);
          }
        }

        const cf = request.cf || {};
        const country = cf.country || 'Unknown';
        const city = cf.city || 'Unknown';
        const isp = cf.asOrganization || 'Unknown ISP';
        const userAgent = request.headers.get('User-Agent') || 'Unknown UA';
        const lang = request.headers.get('Accept-Language') || 'Unknown';

        // Переводим длительность из миллисекунд в секунды
        const durationSec = duration ? Math.round(duration / 1000) : 0;

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

        // Обновляем время последнего запроса (минимальный TTL в CF KV - 60 секунд)
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