const $ = id => document.getElementById(id);

export function initPdfExport() {
  $('exportPdfBtn').addEventListener('click', async () => {
    const iframe = $('heroIframe');
    const printBg = $('printBackground');

    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'REQUEST_FRAME'
      }, '*');
    }

    await new Promise(r => setTimeout(r, 300));

    window.print();
  });

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SEND_FRAME' && e.data.dataUrl) {
      $('printBackground').src = e.data.dataUrl;
    }
  });
}