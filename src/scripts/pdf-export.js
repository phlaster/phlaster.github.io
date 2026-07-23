const $ = id => document.getElementById(id);

export function initPdfExport() {
  const btn = $('exportPdfBtn');
  if (!btn) return;

  const originalHTML = btn.innerHTML;
  let isExporting = false;

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

      await new Promise(r => setTimeout(r, 300));

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
        if (frameData.startsWith('<svg') || frameData.startsWith('<?xml')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(frameData, "image/svg+xml");
          const svgElement = doc.documentElement;

          svgElement.removeAttribute('width');
          svgElement.removeAttribute('height');

          svgElement.setAttribute('width', '100%');
          svgElement.setAttribute('height', '100%');
          svgElement.setAttribute('preserveAspectRatio', 'none');

          printBg.innerHTML = '';
          printBg.appendChild(svgElement);
          await new Promise(r => setTimeout(r, 100));
        } else {
          printBg.innerHTML = `<img src="${frameData}" style="width:100%;height:100%;object-fit:fill;">`;
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

      btn.innerHTML = originalHTML;

    } catch (e) {
      console.error("Export failed:", e);
      btn.classList.add('btn-pdf-error');
      btn.setAttribute('data-tooltip', e.message || 'Export failed');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } finally {
      isExporting = false;
    }
  });
}