const $ = id => document.getElementById(id);

export function initPdfModal(i18nConfigGetter) {
  const modal = $('pdfModal');
  const iframe = $('pdfFrame');

  window.openPdf = (url) => {
    if (!url) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window && window.innerWidth <= 768);

    if (isMobile) {
      window.open(url, '_blank');
      return;
    }

    iframe.src = url;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.classList.remove('open');
    iframe.src = '';
    document.body.style.overflow = '';
  };

  $('closePdfModal').addEventListener('click', closeModal);

  modal.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.pdf-modal-content')) {
      closeModal();
    }
  });

  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('[data-pdf]');
    if (target) {
      e.preventDefault();
      window.openPdf(target.dataset.pdf);
    }
  });
}