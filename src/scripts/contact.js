const $ = id => document.getElementById(id);

async function handleFetchErrors(res) {
  if (!res.ok) {
    let serverError = '';
    try {
      const errData = await res.json();
      serverError = errData.error || '';
    } catch (e) {}

    if (serverError) throw new Error(`${serverError} (Error ${res.status})`);
    if (res.status === 404) throw new Error('Resource not found (404).');
    if (res.status === 400) throw new Error('Bad request (400).');
    if (res.status >= 500) throw new Error('Server error (500).');

    throw new Error(`Request failed (Error ${res.status}).`);
  }
  return res;
}

function getErrorMessage(err) {
  if (!err) return 'Unknown error occurred.';
  let msg = (typeof err === 'string') ? err : (err.message || 'Unknown error');

  if (msg === 'Failed to fetch' || msg.includes('NetworkError')) {
    return 'Network error: Server is unreachable. This may be due to a connection issue or regional blocking. Try using a VPN.';
  }

  const statusMatch = msg.match(/\(Error (\d+)\)/);
  if (statusMatch) {
    const code = parseInt(statusMatch[1], 10);
    let cleanMsg = msg.replace(/\(Error \d+\)/, '').trim();
    if (cleanMsg) return cleanMsg;
    if (code === 404) return 'The requested resource was not found (404).';
    if (code === 400) return 'Bad request to the server (400). Please refresh the page.';
    if (code >= 500) return `Internal server error (${code}). Please try again later.`;
  }

  return msg;
}

export function initContact(i18nConfigGetter) {
  let formChallenge = null;
  let formNonce = null;
  let isComputingFormPoW = false;
  let contactsRevealed = false;
  let timeoutTimer = null;
  let revealedEmail = null;
  let revealedTelegram = null;

  const CACHE_KEY = 'portfolio_contacts_cache';
  const CACHE_TTL = 24 * 60 * 60 * 1000;

  const GIT_HASH = import.meta.env.VITE_GIT_HASH || 'unknown';
  const IS_DIRTY = import.meta.env.VITE_IS_GIT_DIRTY === true;
  const IS_DEV = import.meta.env.DEV;

  const shouldUseCache = !(IS_DEV && IS_DIRTY);

  const exportPdfBtn = $('exportPdfBtn');
  if (exportPdfBtn) {
    exportPdfBtn.dataset.originalHtml = exportPdfBtn.innerHTML;
  }

  function setPdfButtonState(state, message = '') {
    if (!exportPdfBtn) return;
    const safeMsg = message.replace(/"/g, '&quot;');

    exportPdfBtn.classList.remove('btn-pdf-loading', 'btn-pdf-error');
    exportPdfBtn.removeAttribute('data-tooltip');

    if (state === 'loading') {
      exportPdfBtn.classList.add('btn-pdf-loading');
      exportPdfBtn.innerHTML = `<svg class="reveal-ring" width="24" height="24" viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="4"/><circle class="ring-fg" cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="100, 100" stroke-dashoffset="100" stroke-linecap="round" transform="rotate(-90 18 18)"/></svg>`;
    } else if (state === 'error') {
      exportPdfBtn.classList.add('btn-pdf-error');
      exportPdfBtn.setAttribute('data-tooltip', safeMsg);
      exportPdfBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else if (state === 'ready') {
      exportPdfBtn.innerHTML = exportPdfBtn.dataset.originalHtml;
    }
  }

  function setButtonState(state, message = '', duration = 0) {
    const submitBtn = $('submitBtn');
    const submitBtnLabel = $('submitBtnLabel');
    const submitLoader = document.querySelector('.submit-loader');
    const submitErrorIcon = document.querySelector('.submit-error-icon');

    submitBtn.classList.remove('is-loading', 'is-error', 'is-timed-out');

    if (submitLoader) submitLoader.style.display = 'none';
    if (submitErrorIcon) submitErrorIcon.style.display = 'none';
    if (submitBtnLabel) submitBtnLabel.style.display = 'inline';
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
      if (submitBtnLabel) submitBtnLabel.style.display = 'none';
      if (submitLoader) {
        submitLoader.style.display = 'block';
        const ringFg = submitLoader.querySelector('.ring-fg');
        if (ringFg) {
          ringFg.style.animation = 'none';
          void ringFg.offsetWidth;
          ringFg.style.animation = 'fillRing 10s linear forwards';
        }
      }
    } else if (state === 'syncing') {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      if (submitBtnLabel) submitBtnLabel.style.display = 'none';
      const spinner = document.createElement('span');
      spinner.className = 'btn-spinner';
      submitBtn.appendChild(spinner);
    } else if (state === 'ready') {
      submitBtn.disabled = false;
    } else if (state === 'error') {
      submitBtn.classList.add('is-error');
      submitBtn.disabled = false;
      if (submitBtnLabel) submitBtnLabel.style.display = 'none';
      if (submitErrorIcon) submitErrorIcon.style.display = 'block';
      if (message) {
        const safeMsg = message.replace(/"/g, '&quot;');
        submitBtn.setAttribute('data-tooltip', safeMsg);
      }
    } else if (state === 'timed-out') {
      submitBtn.classList.add('is-timed-out');
      submitBtn.disabled = false;
      if (submitBtnLabel) submitBtnLabel.style.display = 'none';
      if (submitLoader) {
        submitLoader.style.display = 'block';
        const ringFg = submitLoader.querySelector('.ring-fg');
        if (ringFg) {
          ringFg.style.animation = 'none';
          void ringFg.offsetWidth;
          ringFg.style.animation = `fillRing ${duration}s linear forwards`;
        }
      }
      if (message) {
        const safeMsg = message.replace(/"/g, '&quot;');
        submitBtn.setAttribute('data-tooltip', safeMsg);
      }

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
    if (email) revealedEmail = email;
    if (telegram) revealedTelegram = telegram;

    const tgWrap = $('channelTelegramWrap');
    const emailWrap = $('channelEmailWrap');

    const copyIconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    const checkIconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

    if (revealedTelegram && tgWrap) {
      const tgUsername = revealedTelegram.replace(/@/g, '');
      const tgUrl = `https://telegram.me/${tgUsername}`;
      const copyVal = `@${tgUsername}`;
      tgWrap.innerHTML = `<span class="label">Telegram</span><button class="copy-contact-btn no-print" data-copy="${copyVal}" aria-label="Copy Telegram username">${copyIconSvg}</button><a class="value" href="${tgUrl}" target="_blank">${copyVal}</a>`;
      document.querySelectorAll('.hero-social-link[data-key="telegram"]').forEach(el => {
        el.href = tgUrl;
        el.target = "_blank";
      });
    }
    if (revealedEmail && emailWrap) {
      const copyVal = revealedEmail;
      emailWrap.innerHTML = `<span class="label">Email</span><button class="copy-contact-btn no-print" data-copy="${copyVal}" aria-label="Copy Email address">${copyIconSvg}</button><a class="value" href="mailto:${revealedEmail}">${revealedEmail}</a>`;
      document.querySelectorAll('.hero-social-link[data-key="email"]').forEach(el => {
        el.href = `mailto:${revealedEmail}`;
        el.target = "_blank";
      });
    }

    setPdfButtonState('ready');

    const submitBtn = $('submitBtn');
    if (submitBtn && submitBtn.classList.contains('is-error') && !isComputingFormPoW) {
      prepareFormPoW();
    }
  }

  function reapplyContacts() {
    if (revealedEmail || revealedTelegram) {
      applyContacts();
    }
  }
  window.reapplyContacts = reapplyContacts;

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
      if (nonce % 10000 === 0) {
        await new Promise(r => setTimeout(r));
        while (document.hidden) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }
  }

  async function prepareFormPoW() {
    if (!contactsRevealed) return;
    if (isComputingFormPoW || (formChallenge && formNonce)) return;

    let workerUrl;
    try {
      workerUrl = getWorkerUrl();
    } catch (e) {
      setButtonState('error', getErrorMessage(e));
      return;
    }

    setButtonState('loading');
    isComputingFormPoW = true;
    try {
      const resCh = await fetch(`${workerUrl}/api/challenge`);
      await handleFetchErrors(resCh);
      const {
        challenge
      } = await resCh.json();
      formChallenge = challenge;

      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 10000));
      formNonce = await Promise.race([solvePoW(challenge), timeoutPromise]);

      setButtonState('ready');
    } catch (err) {
      const errMsg = getErrorMessage(err);
      setButtonState('error', errMsg);
      formChallenge = null;
    } finally {
      isComputingFormPoW = false;
    }
  }

  function setRevealState(state, message = '') {
    const tgWrap = $('channelTelegramWrap');
    const emailWrap = $('channelEmailWrap');
    if (!tgWrap || !emailWrap) return;

    const safeMsg = message.replace(/"/g, '&quot;');

    if (state === 'loading') {
      const ringHtml = `<div class="value" style="width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center;"><svg class="reveal-ring" width="20" height="20" viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(var(--color-dark-fg-rgb), 0.1)" stroke-width="3"/><circle class="ring-fg" cx="18" cy="18" r="15.9155" fill="none" stroke="var(--color-accent-soft)" stroke-width="3" stroke-dasharray="100, 100" stroke-dashoffset="100" stroke-linecap="round" transform="rotate(-90 18 18)"/></svg></div>`;
      const html = (label) => `<span class="label">${label}</span>${ringHtml}`;
      tgWrap.innerHTML = html('Telegram');
      emailWrap.innerHTML = html('Email');

      setPdfButtonState('loading');
    } else if (state === 'error') {
      const html = (label) => `<span class="label">${label}</span><button class="value reveal-error" type="button" data-tooltip="${safeMsg}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></button>`;
      tgWrap.innerHTML = html('Telegram');
      emailWrap.innerHTML = html('Email');

      setPdfButtonState('error', message);
      setButtonState('error', message);
    }
  }

  document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('.copy-contact-btn');
    if (btn) {
      const text = btn.dataset.copy;
      const checkIconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      const copyIconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

      try {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = checkIconSvg;
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = copyIconSvg;
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    }
  });

  async function prepareRevealPoW() {
    if (contactsRevealed) return;

    if (shouldUseCache) {
      try {
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          const isValid = IS_DEV ?
            (cached && cached.timestamp && (Date.now() - cached.timestamp < CACHE_TTL)) :
            (cached && cached.timestamp && (Date.now() - cached.timestamp < CACHE_TTL) && cached.hash === GIT_HASH);

          if (isValid) {
            applyContacts(cached.email, cached.telegram);
            contactsRevealed = true;
            window.contactsRevealed = true;
            return;
          }
        }
      } catch (e) {
        console.warn('Cache read failed:', e);
      }
    }

    let workerUrl;
    try {
      workerUrl = getWorkerUrl();
    } catch (err) {
      setRevealState('error', getErrorMessage(err));
      return;
    }

    setRevealState('loading');

    try {
      const fetchPromise = async () => {
        const resCh = await fetch(`${workerUrl}/api/challenge`);
        await handleFetchErrors(resCh);
        const {
          challenge
        } = await resCh.json();

        const powTimeout = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 9000));
        const nonce = await Promise.race([solvePoW(challenge), powTimeout]);

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

        await handleFetchErrors(resData);
        return await resData.json();
      };

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout: Server took too long to respond. This may be due to connection issues or regional blocking. Try using a VPN.')), 10000)
      );

      const {
        email,
        telegram
      } = await Promise.race([fetchPromise(), timeoutPromise]);

      applyContacts(email, telegram);
      contactsRevealed = true;
      window.contactsRevealed = true;

      if (shouldUseCache) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            email,
            telegram,
            timestamp: Date.now(),
            hash: GIT_HASH
          }));
        } catch (e) {
          console.warn('Cache save failed:', e);
        }
      }
    } catch (err) {
      console.error('Reveal PoW prep failed:', err);
      const errMsg = getErrorMessage(err);
      setRevealState('error', errMsg);
    }
  }

  window.retryRevealContacts = prepareRevealPoW;

  prepareRevealPoW();

  const leaveContactsBtn = $('leaveContactsBtn');
  const contactExtraFields = $('contactExtraFields');
  if (leaveContactsBtn && contactExtraFields) {
    leaveContactsBtn.addEventListener('click', () => {
      leaveContactsBtn.style.display = 'none';
      contactExtraFields.style.display = 'block';
      $('f-name')?.focus();
    });
  }

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

    if (btn.classList.contains('is-loading') || btn.classList.contains('is-syncing') || btn.classList.contains('is-timed-out')) {
      return;
    }

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

      await handleFetchErrors(res);

      status.textContent = u.success;
      status.className = 'form-status success';
      $('contactForm').reset();
      charCounter.textContent = '0/2000';

      formChallenge = null;
      formNonce = null;
      setButtonState('default');

    } catch (err) {
      const errMsg = getErrorMessage(err);

      const isRateLimit30 = errMsg.includes('30 seconds');
      const isRateLimit60 = errMsg.includes('1 minute') || errMsg.includes('60 seconds') || errMsg.includes('try again in a minute');

      if (isRateLimit30) {
        if (sessionStorage.getItem('rate_limit_30s')) {
          status.textContent = errMsg;
          status.className = 'form-status error';
          setButtonState('error', errMsg);
          invalidateAndRemine();
        } else {
          sessionStorage.setItem('rate_limit_30s', '1');
          setButtonState('timed-out', errMsg, 30);
          status.textContent = '';
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