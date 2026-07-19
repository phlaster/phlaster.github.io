import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const $ = id => document.getElementById(id);
let pdfDoc = null;
let currentScale = 1.0;
let baseViewport = null;
let isScrolling = false; // Флаг для программной прокрутки

export function initPdfModal(i18nConfigGetter) {
  const modal = $('pdfModal');
  const container = $('pdf-viewer-container');
  const viewerWrapper = $('pdf-viewer-wrapper');
  const loader = $('pdf-loader');
  const downloadBtn = $('pdfDownload');

  function calcDims() {
    if (!baseViewport) return { width: 0, height: 0, scale: 1 };
    const containerWidth = container.clientWidth;
    const scale = (containerWidth / baseViewport.width) * currentScale;
    return { 
      width: baseViewport.width * scale, 
      height: baseViewport.height * scale, 
      scale 
    };
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        renderPage(entry.target.dataset.pageNum, entry.target);
      } else {
        const canvas = entry.target.querySelector('canvas');
        if (canvas) {
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
          canvas.remove();
        }
      }
    });
  }, { root: viewerWrapper, rootMargin: '500px 0px' });

  async function renderPage(numStr, wrapper) {
    if (wrapper.querySelector('canvas')) return;
    try {
      const num = parseInt(numStr, 10);
      const page = await pdfDoc.getPage(num);
      const { scale } = calcDims();
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      wrapper.appendChild(canvas);
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error(`Error rendering page ${numStr}:`, err);
    }
  }

  async function loadPdf(url) {
    downloadBtn.href = url;
    modal.classList.add('open');
    loader.style.display = 'block';
    container.innerHTML = '';

    try {
      const loadingTask = pdfjsLib.getDocument({ url });
      pdfDoc = await loadingTask.promise;
      
      const page1 = await pdfDoc.getPage(1);
      baseViewport = page1.getViewport({ scale: 1 });
      
      loader.style.display = 'none';
      
      // НОВОЕ: Обновляем счетчик страниц
      $('pdfTotalPages').textContent = pdfDoc.numPages;
      $('pdfCurrentPage').value = 1;
      
      const { width, height } = calcDims();
      
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page-wrapper';
        pageDiv.dataset.pageNum = i;
        pageDiv.style.width = width + 'px';
        pageDiv.style.height = height + 'px';
        container.appendChild(pageDiv);
        observer.observe(pageDiv);
      }
    } catch (err) {
      console.error('PDF load error:', err);
      loader.textContent = 'Error loading PDF.';
    }
  }

  window.openPdf = (url) => {
    if (!url) return;
    loadPdf(url);
  };

  // НОВОЕ: Отслеживание скролла для обновления счетчика
  viewerWrapper.addEventListener('scroll', () => {
    if (isScrolling) return; // Игнорируем, если скролл вызвван кнопками

    const scrollTop = viewerWrapper.scrollTop;
    const pages = document.querySelectorAll('.pdf-page-wrapper');
    if (pages.length === 0) return;

    // Вычисляем, какая страница сейчас ближе всего к верху
    let closestPage = 1;
    let minDistance = Infinity;

    pages.forEach(page => {
      const top = page.offsetTop;
      const distance = Math.abs(top - scrollTop);
      if (distance < minDistance) {
        minDistance = distance;
        closestPage = parseInt(page.dataset.pageNum, 10);
      }
    });

    $('pdfCurrentPage').value = closestPage;
  });

  // НОВОЕ: Функция программного перехода к странице
  function goToPage(num) {
    const target = document.querySelector(`.pdf-page-wrapper[data-page-num="${num}"]`);
    if (target) {
      isScrolling = true;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('pdfCurrentPage').value = num;
      // Снимаем флаг через некоторое время, чтобы пользователь мог снова крутить мышью
      setTimeout(() => { isScrolling = false; }, 500);
    }
  }

  // НОВОЕ: Обработчики стрелок
  $('pdfPrev').addEventListener('click', () => {
    const curr = parseInt($('pdfCurrentPage').value, 10);
    if (curr > 1) goToPage(curr - 1);
  });

  $('pdfNext').addEventListener('click', () => {
    const curr = parseInt($('pdfCurrentPage').value, 10);
    const total = pdfDoc ? pdfDoc.numPages : 1;
    if (curr < total) goToPage(curr + 1);
  });

  function changeZoom(delta) {
    currentScale = Math.max(0.5, Math.min(2.5, currentScale + delta));
    $('pdfZoomLevel').textContent = `${Math.round(currentScale * 100)}%`;
    
    const { width, height } = calcDims();
    
    document.querySelectorAll('.pdf-page-wrapper').forEach(wrapper => {
      wrapper.style.width = width + 'px';
      wrapper.style.height = height + 'px';
      const canvas = wrapper.querySelector('canvas');
      if (canvas) {
        canvas.remove();
        observer.unobserve(wrapper);
        observer.observe(wrapper);
      }
    });
  }

  $('pdfZoomIn').addEventListener('click', () => changeZoom(0.2));
  $('pdfZoomOut').addEventListener('click', () => changeZoom(-0.2));

  $('closePdfModal').addEventListener('click', () => {
    modal.classList.remove('open');
    pdfDoc = null;
    baseViewport = null;
    container.innerHTML = '';
    currentScale = 1.0;
    $('pdfZoomLevel').textContent = '100%';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) $('closePdfModal').click();
  });

  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('[data-pdf]');
    if (target) {
      e.preventDefault();
      window.openPdf(target.dataset.pdf);
    }
  });
}