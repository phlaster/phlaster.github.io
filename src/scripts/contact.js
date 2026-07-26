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
    if (res.status === 429) throw new Error('Too many requests (429).');
    if (res.status >= 500) throw new Error('Server error (500).');

    throw new Error(`Request failed (Error ${res.status}).`);
  }
  return res;
}

export function initContact(i18nConfigGetter) {
  let isSending = false;
  let startTime = null;

  function getErrorMessage(err) {
    const ui = i18nConfigGetter().ui.contact;
    if (!err) return ui.err_unknown || 'Unknown error occurred.';
    const msg = (typeof err === 'string') ? err : (err.message || (ui.err_unknown || 'Unknown error'));

    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg === 'NETWORK_TIMEOUT') {
      return ui.err_network || 'Network error or timeout.';
    }

    if (msg === 'ERR_WORKER_URL') {
      return ui.err_worker_url || 'Worker URL is not configured.';
    }

    if (msg.includes('Too many requests') || msg.includes('429')) {
      return ui.err_rate_limit || 'You are sending messages too fast. Please wait at least 10 seconds.';
    }

    const statusMatch = msg.match(/\(Error (\d+)\)/);
    if (statusMatch) {
      const code = parseInt(statusMatch[1], 10);
      if (code === 404) return ui.err_404 || 'The requested resource was not found (404).';
      if (code === 400) return ui.err_400 || 'Bad request to the server (400).';
      if (code >= 500) return ui.err_500 || 'Internal server error (500).';
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
      const loadingMsg = (i18nConfigGetter()?.ui.contact.pow_loading || "Loading...").replace(/"/g, '&quot;');
      exportPdfBtn.setAttribute('data-tooltip', loadingMsg);
      exportPdfBtn.innerHTML = `<span class="btn-spinner"></span>`;
    } else if (state === 'error') {
      exportPdfBtn.classList.add('btn-pdf-error');
      exportPdfBtn.setAttribute('data-tooltip', safeMsg);
      exportPdfBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else if (state === 'ready') {
      exportPdfBtn.innerHTML = exportPdfBtn.dataset.originalHtml;
    }
  }

  function setButtonState(state) {
    const submitBtn = $('submitBtn');
    const submitIcon = submitBtn.querySelector('.submit-icon');
    const submitLoader = submitBtn.querySelector('.submit-loader');
    const submitErrorIcon = submitBtn.querySelector('.submit-error-icon');

    submitBtn.classList.remove('is-active', 'is-loading', 'is-error');

    if (submitIcon) submitIcon.style.display = 'none';
    if (submitLoader) submitLoader.style.display = 'none';
    if (submitErrorIcon) submitErrorIcon.style.display = 'none';

    if (state === 'loading') {
      submitBtn.classList.add('is-loading');
      if (submitLoader) submitLoader.style.display = 'inline-block';
    } else if (state === 'error') {
      submitBtn.classList.add('is-error');
      if (submitErrorIcon) submitErrorIcon.style.display = 'block';
    } else if (state === 'active') {
      submitBtn.classList.add('is-active');
      if (submitIcon) submitIcon.style.display = 'block';
    } else { // default
      if (submitIcon) submitIcon.style.display = 'block';
    }
  }

  function setInputsDisabled(disabled) {
    $('f-name').disabled = disabled;
    $('f-email').disabled = disabled;
    $('f-subject').disabled = disabled;
    $('f-message').disabled = disabled;
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

  // === Инициализация состояния полей после перезагрузки ===
  if (messageInput.value.length > 0) {
    startTime = Date.now();
    charCounter.textContent = `${messageInput.value.length}/2000`;
    setButtonState('active');
  }

  // Снимаем размытие, если во вспомогательных полях остался текст
  const nameVal = $('f-name').value.trim();
  const emailVal = $('f-email').value.trim();
  const subjectVal = $('f-subject').value.trim();
  if ((nameVal || emailVal || subjectVal) && contactExtraWrap) {
    contactExtraWrap.classList.add('is-revealed');
  }

  messageInput.addEventListener('input', () => {
    const len = messageInput.value.length;
    charCounter.textContent = `${len}/2000`;

    if (len > 0 && !startTime) {
      startTime = Date.now();
    } else if (len === 0) {
      startTime = null;
    }

    if (len > 0) {
      setButtonState('active');
    } else {
      setButtonState('default');
    }
  });

  // === Логика крестиков для очистки полей ===
  document.querySelectorAll('.field-clear').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const target = $(targetId);
      if (target) {
        target.value = '';
        // Триггерим событие input, чтобы обновить счётчик и состояние кнопки отправки
        target.dispatchEvent(new Event('input', {
          bubbles: true
        }));
        target.focus();
      }
    });
  });

  const contactForm = $('contactForm');

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('formStatus');
    const btn = $('submitBtn');
    const config = i18nConfigGetter();
    const u = config.ui.contact || {};

    if (btn.classList.contains('is-error')) {
      setButtonState('loading');
      setTimeout(() => {
        if (messageInput.value.length > 0) {
          setButtonState('active');
        } else {
          setButtonState('default');
        }
      }, 500);
      return;
    }

    if (isSending) return;

    const name = $('f-name').value.trim();
    const email = $('f-email').value.trim();
    const subject = $('f-subject').value.trim();
    const message = messageInput.value.trim();

    if (!message || message.length > 2000 || name.length > 30 || subject.length > 60) {
      status.textContent = u.form_invalid || 'Invalid form data.';
      status.className = 'form-status error';
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (email && (email.length > 30 || !emailRegex.test(email))) {
      status.textContent = u.form_invalid_email || 'Invalid email.';
      status.className = 'form-status error';
      return;
    }

    isSending = true;
    setButtonState('loading');
    setInputsDisabled(true);
    status.textContent = u.sending || 'Sending...';
    status.className = 'form-status';

    const duration = startTime ? Date.now() - startTime : 0;

    let workerUrl;
    try {
      workerUrl = getWorkerUrl();
    } catch (err) {
      isSending = false;
      setButtonState('error');
      setInputsDisabled(false);
      status.textContent = getErrorMessage(err);
      status.className = 'form-status error';
      return;
    }

    try {
      const res = await Promise.race([
        fetch(`${workerUrl}/api/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            email,
            subject,
            message,
            duration
          })
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), 5000))
      ]);

      await handleFetchErrors(res);

      status.textContent = u.success || 'Message sent successfully!';
      status.className = 'form-status success';
      contactForm.reset();
      charCounter.textContent = '0/2000';
      startTime = null;

      setButtonState('default');
      setInputsDisabled(false);

    } catch (err) {
      const errMsg = getErrorMessage(err);
      status.textContent = errMsg;
      status.className = 'form-status error';
      setButtonState('error');
      setInputsDisabled(false);
    } finally {
      isSending = false;
    }
  });
}