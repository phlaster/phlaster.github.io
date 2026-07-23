const $ = id => document.getElementById(id);

export function initContact(i18nConfigGetter) {
  let formChallenge = null;
  let formNonce = null;
  let isComputingFormPoW = false;
  let contactsRevealed = false;
  let timeoutTimer = null;

  const CACHE_KEY = 'portfolio_contacts_cache';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  function setButtonState(state, message = '', duration = 0) {
    const submitBtn = $('submitBtn');
    const submitBtnLabel = $('submitBtnLabel');
    const submitLoader = document.querySelector('.submit-loader');
    const submitErrorIcon = document.querySelector('.submit-error-icon');

    submitBtn.classList.remove('is-loading', 'is-error', 'is-timed-out');
    submitLoader.style.display = 'none';
    submitErrorIcon.style.display = 'none';
    submitBtnLabel.style.display = 'inline';
    submitBtn.removeAttribute('data-tooltip');

    const existingSpinner = submitBtn.querySelector('.btn-spinner');
    if (existingSpinner) existingSpinner.remove();

    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }

    if (state === 'loading') {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      submitBtnLabel.style.display = 'none';
      submitLoader.style.display = 'block';
      const ringFg = submitLoader.querySelector('.ring-fg');
      ringFg.style.animation = 'none';
      void ringFg.offsetWidth;
      ringFg.style.animation = 'fillRing 10s linear forwards';
    } else if (state === 'syncing') {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      submitBtnLabel.style.display = 'none';
      const spinner = document.createElement('span');
      spinner.className = 'btn-spinner';
      submitBtn.appendChild(spinner);
    } else if (state === 'ready') {
      submitBtn.disabled = false;
    } else if (state === 'error') {
      submitBtn.classList.add('is-error');
      submitBtn.disabled = false;
      submitBtnLabel.style.display = 'none';
      submitErrorIcon.style.display = 'block';
      if (message) submitBtn.setAttribute('data-tooltip', message);
    } else if (state === 'timed-out') {
      submitBtn.classList.add('is-timed-out');
      submitBtn.disabled = true;
      submitBtnLabel.style.display = 'none';
      submitLoader.style.display = 'block';

      const ringFg = submitLoader.querySelector('.ring-fg');
      ringFg.style.animation = 'none';
      void ringFg.offsetWidth;
      ringFg.style.animation = `fillRing ${duration}s linear forwards`;

      if (message) submitBtn.setAttribute('data-tooltip', message);

      timeoutTimer = setTimeout(() => {
        if (messageInput.value.trim() && formChallenge && formNonce) {
          setButtonState('ready');
        } else {
          setButtonState('default');
        }
      }, duration * 1000);
    } else if (state === 'default') {
      submitBtn.disabled = true;
    }
  }

  function getWorkerUrl() {
    const config = i18nConfigGetter();
    const url = config?.contact?.worker_url;
    if (!url) throw new Error('Worker URL is not configured');
    return url;
  }

  function applyContacts(email, telegram) {
    const tgWrap = $('channelTelegramWrap');
    const emailWrap = $('channelEmailWrap');

    if (telegram && tgWrap) {
      const tgUsername = telegram.replace(/@/g, '');
      const tgUrl = `https://telegram.me/${tgUsername}`;
      tgWrap.innerHTML = `<span class="label">Telegram</span><a class="value" href="${tgUrl}">@${tgUsername}</a>`;
      document.querySelectorAll('.hero-social-link[data-key="telegram"]').forEach(el => {
        el.href = tgUrl;
        el.target = "_blank";
      });
    }
    if (email && emailWrap) {
      emailWrap.innerHTML = `<span class="label">Email</span><a class="value" href="mailto:${email}">${email}</a>`;
      document.querySelectorAll('.hero-social-link[data-key="email"]').forEach(el => {
        el.href = `mailto:${email}`;
        el.target = "_blank";
      });
    }
  }

  async function solvePoW(challenge) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Crypto API unavailable (requires HTTPS)');
    }
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

    let workerUrl;
    try {
      workerUrl = getWorkerUrl();
    } catch (e) {
      setButtonState('error', e.message);
      return;
    }

    setButtonState('loading');
    isComputingFormPoW = true;
    try {
      const resCh = await fetch(`${workerUrl}/api/challenge`);
      if (!resCh.ok) throw new Error('Failed to get challenge');
      const {
        challenge
      } = await resCh.json();
      formChallenge = challenge;

      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 10000));
      formNonce = await Promise.race([solvePoW(challenge), timeoutPromise]);

      setButtonState('ready');
    } catch (err) {
      setButtonState('error', err.message || 'PoW preparation failed');
      formChallenge = null;
    } finally {
      isComputingFormPoW = false;
    }
  }

  function setRevealState(state, message = '') {
    const tgWrap = $('channelTelegramWrap');
    const emailWrap = $('channelEmailWrap');
    if (!tgWrap || !emailWrap) return;

    if (state === 'loading') {
      const ringHtml = `<div class="value" style="width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center;"><svg class="reveal-ring" width="20" height="20" viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(244, 241, 234, 0.1)" stroke-width="3"/><circle class="ring-fg" cx="18" cy="18" r="15.9155" fill="none" stroke="var(--color-accent-soft)" stroke-width="3" stroke-dasharray="100, 100" stroke-dashoffset="100" stroke-linecap="round" transform="rotate(-90 18 18)"/></svg></div>`;
      const html = (label) => `<span class="label">${label}</span>${ringHtml}`;
      tgWrap.innerHTML = html('Telegram');
      emailWrap.innerHTML = html('Email');
    } else if (state === 'error') {
      const html = (label) => `<span class="label">${label}</span><button class="value reveal-error" type="button" data-tooltip="${message}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></button>`;
      tgWrap.innerHTML = html('Telegram');
      emailWrap.innerHTML = html('Email');
    }
  }

  async function prepareRevealPoW() {
    if (contactsRevealed) return;

    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
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

    let workerUrl;
    try {
      workerUrl = getWorkerUrl();
    } catch (err) {
      setRevealState('error', err.message);
      return;
    }

    setRevealState('loading');

    try {
      const resCh = await fetch(`${workerUrl}/api/challenge`);
      if (!resCh.ok) throw new Error('Failed to get challenge from server');
      const {
        challenge
      } = await resCh.json();

      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 10000));
      const nonce = await Promise.race([solvePoW(challenge), timeoutPromise]);

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

      if (!resData.ok) {
        const errData = await resData.json().catch(() => ({}));
        throw new Error(errData.error || 'Verification failed');
      }

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
      setRevealState('error', err.message || 'Failed to load contacts');
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
    if (!$('submitBtn').classList.contains('is-loading') && !$('submitBtn').classList.contains('is-syncing')) {
      prepareFormPoW();
    }
  }

  $('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('formStatus');
    const btn = $('submitBtn');
    const config = i18nConfigGetter();
    const u = config.ui.contact || {};

    if (btn.classList.contains('is-error')) {
      invalidateAndRemine();
      return;
    }

    const name = $('f-name').value.trim();
    const email = $('f-email').value.trim();
    const subject = $('f-subject').value.trim();
    const message = messageInput.value.trim();

    if (!message || message.length > 2000 || name.length > 30 || subject.length > 60) {
      status.textContent = u.form_invalid;
      status.className = 'form-status error';
      setButtonState('error', u.form_invalid);
      invalidateAndRemine();
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (email && (email.length > 30 || !emailRegex.test(email))) {
      status.textContent = u.form_invalid_email;
      status.className = 'form-status error';
      setButtonState('error', u.form_invalid_email);
      invalidateAndRemine();
      return;
    }

    setButtonState('syncing');
    status.textContent = u.sending;
    status.className = 'form-status';

    try {
      if (!formChallenge && !isComputingFormPoW) await prepareFormPoW();
      while (isComputingFormPoW) await new Promise(r => setTimeout(r, 100));

      if (formNonce === 'TIMEOUT') {
        setButtonState('syncing');
        formNonce = await solvePoW(formChallenge);
      }

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
      if (!res.ok) throw new Error(errData.error || 'Server error');

      status.textContent = u.success;
      status.className = 'form-status success';
      $('contactForm').reset();
      charCounter.textContent = '0/2000';

      formChallenge = null;
      formNonce = null;
      setButtonState('default');

    } catch (err) {
      const errMsg = err.message || u.error;

      const isRateLimit30 = errMsg.includes('30 seconds');
      const isRateLimit60 = errMsg.includes('1 minute') || errMsg.includes('60 seconds');

      if (isRateLimit30) {
        if (sessionStorage.getItem('rate_limit_30s')) {
          status.textContent = errMsg;
          status.className = 'form-status error';
          setButtonState('error', errMsg);
          invalidateAndRemine();
        } else {
          sessionStorage.setItem('rate_limit_30s', '1');
          setButtonState('timed-out', errMsg, 30);
          status.textContent = ''; // Прячем текстовый статус
          status.className = 'form-status';
          setTimeout(() => sessionStorage.removeItem('rate_limit_30s'), 30000);
        }
      } else if (isRateLimit60) {
        setButtonState('timed-out', errMsg, 60);
        status.textContent = '';
        status.className = 'form-status';
      } else {
        status.textContent = errMsg;
        status.className = 'form-status error';
        setButtonState('error', errMsg);
        invalidateAndRemine();
      }
    }
  });
}