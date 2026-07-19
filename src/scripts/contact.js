const $ = id => document.getElementById(id);

export function initContact(i18nConfigGetter) {
  let formChallenge = null;
  let formNonce = null;
  let isComputingFormPoW = false;
  let contactsRevealed = false;

  async function solvePoW(challenge) {
    const enc = new TextEncoder();
    let nonce = 0;
    while (true) {
      const data = enc.encode(challenge + nonce);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
      if (hashHex.endsWith('0000') && '012345'.includes(hashHex[hashHex.length - 5])) return nonce.toString();
      nonce++;
      if (nonce % 10000 === 0) await new Promise(r => setTimeout(r));
    }
  }

  async function prepareFormPoW() {
    if (isComputingFormPoW || (formChallenge && formNonce)) return;
    const config = i18nConfigGetter();
    const workerUrl = config.contact.worker_url;
    if (!workerUrl) return;

    isComputingFormPoW = true;
    try {
      const resCh = await fetch(`${workerUrl}/api/challenge`);
      const { challenge } = await resCh.json();
      formChallenge = challenge;
      formNonce = await solvePoW(challenge);
    } catch (err) {
      console.error('Form PoW prep failed:', err);
    } finally {
      isComputingFormPoW = false;
    }
  }

  async function prepareRevealPoW() {
    if (contactsRevealed) return;
    const config = i18nConfigGetter();
    const workerUrl = config.contact.worker_url;
    
    try {
      const resCh = await fetch(`${workerUrl}/api/challenge`);
      const { challenge } = await resCh.json();
      const nonce = await solvePoW(challenge);

      const resData = await fetch(`${workerUrl}/api/get-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge, nonce })
      });

      if (!resData.ok) throw new Error('Verification failed');
      const { email, telegram } = await resData.json();

      if (telegram) {
        const tgUsername = telegram.replace(/@/g, '');
        $('channelTelegramWrap').innerHTML = `<span class="label">Telegram</span><a class="value" href="https://telegram.me/${tgUsername}">@${tgUsername}</a>`;
      }
      if (email) {
        $('channelEmailWrap').innerHTML = `<span class="label">Email</span><a class="value" href="mailto:${email}">${email}</a>`;
      }
      contactsRevealed = true;
    } catch (err) {
      console.error('Reveal PoW prep failed:', err);
    }
  }

  // Запускаем раскрытие контактов сразу при инициализации (в фоне)
  prepareRevealPoW();

  ['f-name', 'f-email', 'f-subject', 'f-message'].forEach(id => {
    $(id)?.addEventListener('input', prepareFormPoW);
  });

  $('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('formStatus');
    const btn = $('submitBtn');
    const config = i18nConfigGetter();
    const u = config.ui.contact || {};

    const name = $('f-name').value.trim();
    const email = $('f-email').value.trim();
    const message = $('f-message').value.trim();

    if (!name || !email || !message) {
      status.textContent = u.form_invalid;
      status.className = 'form-status error';
      return;
    }

    btn.disabled = true;
    status.textContent = u.sending;
    status.className = 'form-status';

    try {
      if (!formChallenge && !isComputingFormPoW) await prepareFormPoW();
      while (isComputingFormPoW) await new Promise(r => setTimeout(r, 100));

      const res = await fetch(`${config.contact.worker_url}/api/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge: formChallenge,
          nonce: formNonce,
          name, email,
          subject: $('f-subject').value.trim(),
          message
        })
      });

      formChallenge = null;
      formNonce = null;

      if (!res.ok) throw new Error();
      status.textContent = u.success;
      status.className = 'form-status success';
      $('contactForm').reset();
    } catch (err) {
      status.textContent = u.error;
      status.className = 'form-status error';
      formChallenge = null;
      formNonce = null;
    } finally {
      btn.disabled = false;
    }
  });
}