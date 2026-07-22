const $ = id => document.getElementById(id);

export function initPdfExport() {
  $('exportPdfBtn').addEventListener('click', async () => {
    const iframe = $('heroIframe');
    const printBg = $('printBackground');
    const btn = $('exportPdfBtn');

    if (!iframe.contentWindow) return;

    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="btn-spinner"></span>';
    btn.disabled = true;

    try {
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

      if (frameData) {
        if (frameData.startsWith('<svg') || frameData.startsWith('<?xml')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(frameData, "image/svg+xml");
          const svgElement = doc.documentElement;

          printBg.innerHTML = '';
          printBg.appendChild(svgElement);

          await new Promise(r => setTimeout(r, 100));
        } else {
          printBg.innerHTML = `<img src="${frameData}" style="width:100%;height:100%;object-fit:cover;">`;
        }
        await new Promise(r => setTimeout(r, 100));
      } else {
        console.warn("PDF Export: Failed to get background frame.");
      }

      btn.innerHTML = '<span class="btn-spinner"></span> Fetching contacts...';

      const emailHasLink = () => document.querySelector('#channelEmailWrap a[href^="mailto:"]');
      const tgHasLink = () => document.querySelector('#channelTelegramWrap a[href*="telegram.me"]');

      let waitCount = 0;

      if ((!emailHasLink() || !tgHasLink()) && window.retryRevealContacts) {
        window.retryRevealContacts();
      }

      while ((!emailHasLink() || !tgHasLink()) && waitCount < 200) {
        await new Promise(r => setTimeout(r, 100));
        waitCount++;
      }

      if (!emailHasLink() || !tgHasLink()) {
        console.warn("PDF Export: Contacts could not be fetched in time.");
      }

      btn.innerHTML = originalHTML;
      btn.disabled = false;

      await new Promise(r => setTimeout(r, 50));
      window.print();

      printBg.innerHTML = '';

    } catch (e) {
      console.error("Export failed:", e);
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  });
}