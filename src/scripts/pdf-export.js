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
      // 1. Ждем кадр фона
      const framePromise = new Promise((resolve) => {
        const handler = (e) => {
          if (e.data && e.data.type === 'SEND_FRAME') {
            window.removeEventListener('message', handler);
            resolve(e.data.dataUrl || null);
          }
        };
        window.addEventListener('message', handler);
      });

      iframe.contentWindow.postMessage({ type: 'REQUEST_FRAME' }, '*');
      const dataUrl = await Promise.race([
        framePromise,
        new Promise(r => setTimeout(() => r(null), 2000))
      ]);

      if (dataUrl) {
        printBg.src = dataUrl;
        await new Promise((resolve) => {
          if (printBg.complete) return resolve();
          printBg.onload = resolve;
          printBg.onerror = resolve;
        });
      }

      // 2. Ждем получения контактов (PoW)
      if (!window.contactsRevealed) {
        btn.textContent = 'Fetching contacts...';
        let waitCount = 0;
        while (!window.contactsRevealed && waitCount < 50) { // Ждем максимум 5 секунд
          await new Promise(r => setTimeout(r, 100));
          waitCount++;
        }
      }

      // 3. Печать
      btn.textContent = originalText;
      btn.disabled = false;

      await new Promise(r => setTimeout(r, 50));
      window.print();

    } catch (e) {
      console.error("Export failed:", e);
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}