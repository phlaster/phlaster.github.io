const $ = id => document.getElementById(id);

export function initContact(i18nConfigGetter) {
  let formChallenge = null;
  let formNonce = null;
  let isComputingFormPoW = false;
  let contactsRevealed = false;

  const CACHE_KEY = 'portfolio_contacts_cache';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  function applyContacts(email, telegram) {
    if (telegram) {
      const tgUsername = telegram.replace(/@/g, '');
      const tgUrl = `https://telegram.me/${tgUsername}`;
      $('channelTelegramWrap').innerHTML = `<span class="label">Telegram</span><a class="value" href="${tgUrl}">@${tgUsername}</a>`;
      document.querySelectorAll('.hero-social-link[data-key="telegram"]').forEach(el => {
        el.href = tgUrl;
        el.target = "_blank";
      });
    }
    if (email) {
      $('channelEmailWrap').innerHTML = `<span class="label">Email</span><a class="value" href="mailto:${email}">${email}</a>`;
      document.querySelectorAll('.hero-social-link[data-key="email"]').forEach(el => {
        el.href = `mailto:${email}`;
        el.target = "_blank";
      });
    }
  }

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
      const {
        challenge
      } = await resCh.json();
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

    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        // Проверяем, не истекли ли 24 часа
        if (cached && cached.timestamp && (Date.now() - cached.timestamp < CACHE_TTL)) {
          applyContacts(cached.email, cached.telegram);
          contactsRevealed = true;
          window.contactsRevealed = true;
          return;
        }
      }
    } catch (e) {
      console.warn('Cache read failed:', e);
    }

    const config = i18nConfigGetter();
    const workerUrl = config.contact.worker_url;

    try {
      const resCh = await fetch(`${workerUrl}/api/challenge`);
      const {
        challenge
      } = await resCh.json();
      const nonce = await solvePoW(challenge);

      const resData = await fetch(`${workerUrl}/api/get-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          challenge,
          nonce
        })
      });

      if (!resData.ok) throw new Error('Verification failed');
      const {
        email,
        telegram
      } = await resData.json();

      applyContacts(email, telegram);
      contactsRevealed = true;
      window.contactsRevealed = true;

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          email,
          telegram,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Cache save failed:', e);
      }

    } catch (err) {
      console.error('Reveal PoW prep failed:', err);
    }
  }

  window.retryRevealContacts = prepareRevealPoW;

  prepareRevealPoW();

  ['f-name', 'f-email', 'f-subject', 'f-message'].forEach(id => {
    $(id)?.addEventListener('input', prepareFormPoW);
  });

  const messageInput = $('f-message');
  const charCounter = $('charCounter');

  messageInput.addEventListener('input', () => {
    charCounter.textContent = `${messageInput.value.length}/2000`;
  });

  function invalidateAndRemine() {
    formChallenge = null;
    formNonce = null;
    prepareFormPoW();
  }

  $('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('formStatus');
    const btn = $('submitBtn');
    const config = i18nConfigGetter();
    const u = config.ui.contact || {};

    const name = $('f-name').value.trim();
    const email = $('f-email').value.trim();
    const subject = $('f-subject').value.trim();
    const message = messageInput.value.trim();

    if (!message || message.length > 2000 || name.length > 30 || subject.length > 60) {
      status.textContent = u.form_invalid;
      status.className = 'form-status error';
      invalidateAndRemine();
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (email && (email.length > 30 || !emailRegex.test(email))) {
      status.textContent = u.form_invalid_email;
      status.className = 'form-status error';
      invalidateAndRemine();
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          challenge: formChallenge,
          nonce: formNonce,
          name,
          email,
          subject,
          message
        })
      });

      const errData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(errData.error || 'Server error');
      }

      status.textContent = u.success;
      status.className = 'form-status success';
      $('contactForm').reset();
      charCounter.textContent = '0/2000';

      formChallenge = null;
      formNonce = null;

    } catch (err) {
      status.textContent = err.message || u.error;
      status.className = 'form-status error';
      invalidateAndRemine();
    } finally {
      btn.disabled = false;
    }
  });
}