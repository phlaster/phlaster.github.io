const $ = id => document.getElementById(id);

export function initPdfExport() {
  $('exportPdfBtn').addEventListener('click', async () => {
    const iframe = $('heroIframe');
    const printBg = $('printBackground');

    // 1. Запросить кадр у фонового iframe (Hextiles)
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'REQUEST_FRAME' }, '*');
    }

    // 2. Подождать немного, чтобы iframe успел ответить (или использовать Promise, если настроишь)
    // Для простоты пока используем setTimeout
    await new Promise(r => setTimeout(r, 300));

    // 3. Вызов нативного диалога печати
    window.print();
  });

  // Слушатель ответа от iframe
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SEND_FRAME' && e.data.dataUrl) {
      $('printBackground').src = e.data.dataUrl;
    }
  });
}