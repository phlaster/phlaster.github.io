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

export function initContact(i18nConfigGetter) {
  let challengeId = null;
  let isReady = false;
  let isSending = false;
  let timerInterval = null;
  let timeoutTimer = null;

  function getErrorMessage(err) {
    const ui = i18nConfigGetter().ui.contact;

    if (!err) return ui.err_unknown || 'Unknown error occurred.';
    const msg = (typeof err === 'string') ? err : (err.message || (ui.err_unknown || 'Unknown error'));

    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg === 'NETWORK_TIMEOUT') {
      return ui.err_network || 'Network error: Server is unreachable. This may be due to a connection issue or regional blocking. Try using a VPN.';
    }

    if (msg === 'ERR_WORKER_URL') {
      return ui.err_worker_url || 'Worker URL is not configured.';
    }

    if (msg.includes('Anti-spam timer not finished')) {
      return ui.err_rate_30 || 'Please wait for the timer to finish before sending.';
    }

    const statusMatch = msg.match(/\(Error (\d+)\)/);
    if (statusMatch) {
      const code = parseInt(statusMatch[1], 10);
      let cleanMsg = msg.replace(/\(Error \d+\)/, '').trim();

      if (cleanMsg) {
        if (cleanMsg.includes('30 seconds')) return ui.err_rate_30 || 'Please wait at least 30 seconds between messages. A timer has started.';
        if (cleanMsg.includes('1 minute') || cleanMsg.includes('60 seconds') || cleanMsg.includes('try again in a minute')) return ui.err_rate_60 || 'You are sending messages too fast. Timer reset. Please try again in a minute.';
        return cleanMsg;
      }

      if (code === 404) return ui.err_404 || 'The requested resource was not found (404).';
      if (code === 400) return ui.err_400 || 'Bad request to the server (400). Please refresh the page.';
      if (code >= 500) return ui.err_500 || 'Internal server error (500). Please try again later.';
    }

    return msg;
  }

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
      const loadingMsg = (i18nConfigGetter()?.ui.contact.pow_loading || "Anti-spam check... Please wait up to 10s.").replace(/"/g, '&quot;');
      exportPdfBtn.setAttribute('data-tooltip', loadingMsg);
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
    const submitIcon = submitBtn.querySelector('.submit-icon');
    const submitLoader = submitBtn.querySelector('.submit-loader');
    const submitErrorIcon = submitBtn.querySelector('.submit-error-icon');

    submitBtn.classList.remove('is-loading', 'is-error', 'is-timed-out');
    submitBtn.removeAttribute('data-tooltip');

    if (submitIcon) submitIcon.style.display = 'none';
    if (submitLoader) submitLoader.style.display = 'none';
    if (submitErrorIcon) submitErrorIcon.style.display = 'none';

    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }

    if (state === 'loading') {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      if (submitLoader) {
        submitLoader.style.display = 'block';
        const ringFg = submitLoader.querySelector('.ring-fg');
        if (ringFg) {
          ringFg.style.animation = 'none';
          void ringFg.offsetWidth;
          ringFg.style.animation = 'fillRing 10s linear forwards';
        }
      }
      const loadingMsg = (i18nConfigGetter()?.ui.contact.pow_loading || "Anti-spam check... Please wait up to 10s.").replace(/"/g, '&quot;');
      submitBtn.setAttribute('data-tooltip', loadingMsg);
    } else if (state === 'syncing') {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      if (submitLoader) {
        submitLoader.style.display = 'block';
        const ringFg = submitLoader.querySelector('.ring-fg');
        if (ringFg) {
          ringFg.style.animation = 'none';
          void ringFg.offsetWidth;
          ringFg.style.animation = 'spin 0.8s linear infinite'; // Быстрый спиннер при отправке
        }
      }
    } else if (state === 'ready') {
      submitBtn.disabled = false;
      if (submitIcon) submitIcon.style.display = 'block';
    } else if (state === 'error') {
      submitBtn.classList.add('is-error');
      submitBtn.disabled = false; // Доступна для клика, чтобы запустить таймер заново
      if (submitErrorIcon) submitErrorIcon.style.display = 'block';
      if (message) {
        const safeMsg = message.replace(/"/g, '&quot;');
        submitBtn.setAttribute('data-tooltip', safeMsg);
      }
    } else if (state === 'default') {
      submitBtn.disabled = true;
      if (submitIcon) submitIcon.style.display = 'block';
    }
  }

  function getWorkerUrl() {
    const config = i18nConfigGetter();
    const url = config?.contact?.worker_url;
    if (!url) throw new Error('ERR_WORKER_URL');
    return url;
  }

  function applyContacts() {
    const config = i18nConfigGetter();
    const revealedEmail = config?.site?.email;
    const revealedTelegram = config?.site?.telegram;

    const tgWrap = $('channelTelegramWrap');
    const emailWrap = $('channelEmailWrap');

    const copyIconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

    if (revealedTelegram && tgWrap) {
      const tgUsername = revealedTelegram.replace(/@/g, '');
      const tgUrl = `https://telegram.me/${tgUsername}`;
      const copyVal = `@${tgUsername}`;
      tgWrap.innerHTML = `<span class="label">Telegram</span><button class="copy-contact-btn no-print" data-copy="${copyVal}" aria-label="Copy Telegram username">${copyIconSvg}</button><a class="value" href="${tgUrl}" target="_blank">${copyVal}</a>`;
    }
    if (revealedEmail && emailWrap) {
      const copyVal = revealedEmail;
      emailWrap.innerHTML = `<span class="label">Email</span><button class="copy-contact-btn no-print" data-copy="${copyVal}" aria-label="Copy Email address">${copyIconSvg}</button><a class="value" href="mailto:${revealedEmail}">${revealedEmail}</a>`;
    }

    setPdfButtonState('ready');
  }

  function reapplyContacts() {
    applyContacts();
  }
  window.reapplyContacts = reapplyContacts;

  applyContacts();

  async function initiateSendingProcess() {
    if (isSending) return;
    if (isReady) return;

    setButtonState('loading');
    clearTimeout(timerInterval);

    let workerUrl;
    try {
      workerUrl = getWorkerUrl();
    } catch (e) {
      setButtonState('error', getErrorMessage(e));
      return;
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), 10000)
      );

      const res = await Promise.race([
        fetch(`${workerUrl}/api/challenge`),
        timeoutPromise
      ]);

      await handleFetchErrors(res);
      const {
        challenge
      } = await res.json();
      challengeId = challenge;

      // Запускаем 10-секундный таймер готовности
      timerInterval = setTimeout(() => {
        isReady = true;
        setButtonState('ready');
      }, 10000);

    } catch (err) {
      console.error('Anti-spam prep failed:', err);
      const errMsg = getErrorMessage(err);
      setButtonState('error', errMsg);
      challengeId = null;
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

  const leaveContactsBtn = $('leaveContactsBtn');
  const contactExtraWrap = $('contactExtraWrap');
  let blurTimer = null;

  if (leaveContactsBtn && contactExtraWrap) {
    const checkAndHideFields = () => {
      const nameVal = $('f-name').value.trim();
      const emailVal = $('f-email').value.trim();
      const subjectVal = $('f-subject').value.trim();

      const activeEl = document.activeElement;
      const isFocusedInside = contactExtraWrap.contains(activeEl) && activeEl.tagName === 'INPUT';

      if (!nameVal && !emailVal && !subjectVal && !isFocusedInside) {
        contactExtraWrap.classList.remove('is-revealed');
      }
    };

    const startBlurTimer = () => {
      clearTimeout(blurTimer);
      blurTimer = setTimeout(checkAndHideFields, 5000);
    };

    const revealFields = () => {
      contactExtraWrap.classList.add('is-revealed');
      $('f-name')?.focus();
      startBlurTimer();
    };

    leaveContactsBtn.addEventListener('click', revealFields);
    leaveContactsBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        revealFields();
      }
    });

    ['f-name', 'f-email', 'f-subject'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('focus', () => clearTimeout(blurTimer));
      el.addEventListener('blur', () => startBlurTimer());
    });
  }

  const messageInput = $('f-message');
  const charCounter = $('charCounter');

  messageInput.addEventListener('focus', initiateSendingProcess);
  messageInput.addEventListener('input', () => {
    charCounter.textContent = `${messageInput.value.length}/2000`;
  });

  const contactForm = $('contactForm');

  // Перехватываем Enter, чтобы не отправить форму раньше времени
  contactForm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !isReady && !isSending) {
      e.preventDefault();
      initiateSendingProcess();
    }
  });

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('formStatus');
    const btn = $('submitBtn');
    const config = i18nConfigGetter();
    const u = config.ui.contact || {};

    // Если нажали на кнопку с ошибкой — перезапускаем таймер
    if (btn.classList.contains('is-error')) {
      initiateSendingProcess();
      return;
    }

    if (!isReady || isSending) return;

    const name = $('f-name').value.trim();
    const email = $('f-email').value.trim();
    const subject = $('f-subject').value.trim();
    const message = messageInput.value.trim();

    if (!message || message.length > 2000 || name.length > 30 || subject.length > 60) {
      status.textContent = u.form_invalid;
      status.className = 'form-status error';
      setButtonState('error', u.form_invalid);
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (email && (email.length > 30 || !emailRegex.test(email))) {
      status.textContent = u.form_invalid_email;
      status.className = 'form-status error';
      setButtonState('error', u.form_invalid_email);
      return;
    }

    isSending = true;
    setButtonState('syncing');
    status.textContent = u.sending;
    status.className = 'form-status';

    try {
      const res = await fetch(`${config.contact.worker_url}/api/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          challenge: challengeId,
          name,
          email,
          subject,
          message
        })
      });

      await handleFetchErrors(res);

      status.textContent = u.success;
      status.className = 'form-status success';
      contactForm.reset();
      charCounter.textContent = '0/2000';

      isReady = false;
      isSending = false;
      challengeId = null;
      setButtonState('default');

    } catch (err) {
      const errMsg = getErrorMessage(err);
      const ui = i18nConfigGetter().ui.contact;
      const rate30Msg = ui.err_rate_30 || 'Please wait at least 30 seconds between messages. A timer has started.';
      const rate60Msg = ui.err_rate_60 || 'You are sending messages too fast. Timer reset. Please try again in a minute.';

      const isRateLimit30 = errMsg === rate30Msg;
      const isRateLimit60 = errMsg === rate60Msg;

      if (isRateLimit30) {
        if (sessionStorage.getItem('rate_limit_30s')) {
          status.textContent = errMsg;
          status.className = 'form-status error';
          setButtonState('error', errMsg);
        } else {
          sessionStorage.setItem('rate_limit_30s', '1');
          setButtonState('error', errMsg); // Заменено на error, чтобы кнопка была кликабельна
          status.textContent = '';
          status.className = 'form-status';
          setTimeout(() => sessionStorage.removeItem('rate_limit_30s'), 30000);
        }
      } else if (isRateLimit60) {
        setButtonState('error', errMsg);
        status.textContent = '';
        status.className = 'form-status';
      } else {
        status.textContent = errMsg;
        status.className = 'form-status error';
        setButtonState('error', errMsg);
      }
    } finally {
      isSending = false;
    }
  });
}