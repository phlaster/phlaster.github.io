const $ = id => document.getElementById(id);

export function initPdfExport() {
  $('exportPdfBtn').addEventListener('click', async () => {
    const iframe = $('heroIframe');
    const printBg = $('printBackground');
    const btn = $('exportPdfBtn');

    if (!iframe.contentWindow) return;

    const originalText = btn.textContent;
    btn.textContent = 'Loading PDF...';
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

      iframe.contentWindow.postMessage({ type: 'REQUEST_FRAME' }, '*');
      const frameData = await Promise.race([
        framePromise,
        new Promise(r => setTimeout(() => r(null), 5000))
      ]);

      if (frameData) {
        if (frameData.startsWith('<svg') || frameData.startsWith('<?xml')) {
          // Удаляем XML заголовок для безопасности innerHTML
          let cleanSvg = frameData.replace(/^<\?xml[^>]+\?>/, '').trim();
          printBg.innerHTML = cleanSvg;
        } else {
          printBg.innerHTML = `<img src="${frameData}" style="width:100%;height:100%;object-fit:cover;">`;
        }
        await new Promise(r => setTimeout(r, 100));
      } else {
        console.warn("PDF Export: Failed to get background frame.");
      }

      // Ждем получения контактов (PoW)
      if (!window.contactsRevealed) {
        btn.textContent = 'Fetching contacts...';
        let waitCount = 0;
        while (!window.contactsRevealed && waitCount < 50) {
          await new Promise(r => setTimeout(r, 100));
          waitCount++;
        }
      }

      // Печать
      btn.textContent = originalText;
      btn.disabled = false;

      await new Promise(r => setTimeout(r, 50));
      window.print();

      // Очищаем DOM после печати
      printBg.innerHTML = '';

    } catch (e) {
      console.error("Export failed:", e);
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}