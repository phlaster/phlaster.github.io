const $ = id => document.getElementById(id);

export function initPdfExport(i18nConfigGetter) {
  const btn = $('exportPdfBtn');
  if (!btn) return;

  const originalHTML = btn.dataset.originalHtml || btn.innerHTML;
  let isExporting = false;

  const createRasterBg = (dataUrlOrSvg, applyBlur = false) => {
    return new Promise((resolve) => {
      let imgSrc = dataUrlOrSvg;
      if (dataUrlOrSvg.startsWith('<svg') || dataUrlOrSvg.startsWith('<?xml')) {
        imgSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(dataUrlOrSvg)));
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = applyBlur ? 1080 : 1920;
        canvas.height = applyBlur ? 720 : 1080;

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
          resolve(canvas.toDataURL('image/jpeg', applyBlur ? 0.5 : 0.7));
        } catch (e) {
          resolve(imgSrc);
        }
      };
      img.onerror = () => resolve(imgSrc);
      img.src = imgSrc;
    });
  };

  btn.addEventListener('click', async (e) => {
    if (btn.classList.contains('btn-pdf-error') || btn.classList.contains('btn-pdf-loading')) {
      e.preventDefault();
      return;
    }

    if (isExporting) return;
    isExporting = true;

    if (!import.meta.env.DEV) {
      const lang = document.documentElement.lang || 'en';
      const pdfUrl = `./pdf/cv-${lang}.pdf`;
      window.openPdf(pdfUrl);
      isExporting = false;
      return;
    }

    const iframe = $('heroIframe');
    const printBg = $('printBackground');
    const heroPrintBg = $('heroPrintBg');

    if (!iframe.contentWindow) {
      isExporting = false;
      return;
    }

    btn.innerHTML = `<span class="btn-spinner"></span>`;

    try {
      const originalWidth = iframe.style.width;
      const originalHeight = iframe.style.height;

      iframe.style.width = '1920px';
      iframe.style.height = '1080px';

      iframe.contentWindow.postMessage({
        type: 'HEX_LIVE_TWIST',
        mode: 'normal'
      }, '*');
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

      iframe.contentWindow.postMessage({
        type: 'REQUEST_FRAME'
      }, '*');
      const frameData = await Promise.race([
        framePromise,
        new Promise(r => setTimeout(() => r(null), 5000))
      ]);

      iframe.style.width = originalWidth;
      iframe.style.height = originalHeight;

      if (frameData) {
        const clearBg = await createRasterBg(frameData, false);
        if (heroPrintBg) {
          heroPrintBg.innerHTML = `<img src="${clearBg}" style="width:100%;height:100%;object-fit:fill;">`;
        }

        const blurredBg = await createRasterBg(frameData, true);
        if (printBg) {
          printBg.innerHTML = `<img src="${blurredBg}" style="width:100%;height:100%;object-fit:fill;">`;
        }
        await new Promise(r => setTimeout(r, 100));
      }

      await new Promise(r => setTimeout(r, 50));
      window.print();

      printBg.innerHTML = '';
      if (heroPrintBg) heroPrintBg.innerHTML = '';

      btn.innerHTML = originalHTML;

    } catch (err) {
      console.error("Export failed:", err);
      const exportErr = i18nConfigGetter().ui.contact.err_pdf_export || 'Export failed';
      btn.classList.add('btn-pdf-error');
      btn.setAttribute('data-tooltip', exportErr);
      btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } finally {
      isExporting = false;
    }
  });
}