const $ = id => document.getElementById(id);

export function initPdfExport() {
  const btn = $('exportPdfBtn');
  if (!btn) return;

  const originalHTML = btn.innerHTML;
  let isExporting = false;

  // Универсальная функция для растеризации кадра
  const createRasterBg = (dataUrlOrSvg, applyBlur = false) => {
    return new Promise((resolve) => {
      let imgSrc = dataUrlOrSvg;
      if (dataUrlOrSvg.startsWith('<svg') || dataUrlOrSvg.startsWith('<?xml')) {
        imgSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(dataUrlOrSvg)));
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');

        canvas.width = applyBlur ? 900 : 1600;
        canvas.height = applyBlur ? 720 : 1280;
        
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#070D15';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (applyBlur) {
          ctx.filter = 'grayscale(40%) blur(2px)';
          ctx.globalAlpha = 0.7;
        } else {
          ctx.filter = 'blur(1px)';
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        try {
          // ВОЗВРАЩАЕМ JPEG! Chrome отлично встраивает его в PDF без раздувания
          resolve(canvas.toDataURL('image/jpeg', applyBlur ? 0.5 : 0.7));
        } catch (e) {
          resolve(imgSrc);
        }
      };
      img.onerror = () => resolve(imgSrc);
      img.src = imgSrc;
    });
  };

  btn.addEventListener('click', async () => {
    if (btn.classList.contains('btn-pdf-error')) {
      btn.innerHTML = originalHTML;
      btn.classList.remove('btn-pdf-error');
      btn.removeAttribute('data-tooltip');
      return;
    }

    if (isExporting) return;
    isExporting = true;

    const iframe = $('heroIframe');
    const printBg = $('printBackground');
    const heroPrintBg = $('heroPrintBg');

    if (!iframe.contentWindow) {
      isExporting = false;
      return;
    }

    btn.innerHTML = `<svg class="reveal-ring" width="14" height="14" viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="4"/><circle class="ring-fg" cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="100, 100" stroke-dashoffset="100" stroke-linecap="round" transform="rotate(-90 18 18)"/></svg>`;

    try {
      const originalWidth = iframe.style.width;
      const originalHeight = iframe.style.height;

      iframe.style.width = '1920px';
      iframe.style.height = '1080px';

      iframe.contentWindow.postMessage({ type: 'HEX_LIVE_TWIST', mode: 'normal' }, '*');
      await new Promise(r => setTimeout(r, 600));

      const framePromise = new Promise((resolve) => {
        const handler = (e) => {
          if (e.data && e.data.type === 'SEND_FRAME') {
            window.removeEventListener('message', handler);
            resolve(e.data.svg || e.data.dataUrl || null);
          }
        };
        window.addEventListener('message', handler);
      });

      iframe.contentWindow.postMessage({ type: 'REQUEST_FRAME' }, '*');
      const frameData = await Promise.race([
        framePromise,
        new Promise(r => setTimeout(() => r(null), 5000))
      ]);
      
      iframe.style.width = originalWidth;
      iframe.style.height = originalHeight;

      if (frameData) {
        // 1. Создаем четкий WebP (1280x720)
        const clearBg = await createRasterBg(frameData, false);
        if (heroPrintBg) {
          heroPrintBg.innerHTML = `<img src="${clearBg}" style="width:100%;height:100%;object-fit:fill;">`;
        }

        // 2. Создаем размытый WebP (960x540)
        const blurredBg = await createRasterBg(frameData, true);
        if (printBg) {
          printBg.innerHTML = `<img src="${blurredBg}" style="width:100%;height:100%;object-fit:fill;">`;
        }
        await new Promise(r => setTimeout(r, 100));
      }

      const emailHasLink = () => document.querySelector('#channelEmailWrap a[href^="mailto:"]');
      const tgHasLink = () => document.querySelector('#channelTelegramWrap a[href*="telegram.me"]');

      if ((!emailHasLink() || !tgHasLink()) && window.retryRevealContacts) {
        window.retryRevealContacts();
      }

      let waitCount = 0;
      while ((!emailHasLink() || !tgHasLink()) && waitCount < 100) {
        await new Promise(r => setTimeout(r, 100));
        waitCount++;
      }

      if (!emailHasLink() || !tgHasLink()) {
        throw new Error('Failed to load contacts in time');
      }

      await new Promise(r => setTimeout(r, 50));
      window.print();
      
      printBg.innerHTML = '';
      if (heroPrintBg) heroPrintBg.innerHTML = '';

      btn.innerHTML = originalHTML;

    } catch (e) {
      console.error("Export failed:", e);
      btn.classList.add('btn-pdf-error');
      btn.setAttribute('data-tooltip', e.message || 'Export failed');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--error-red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } finally {
      isExporting = false;
    }
  });
}