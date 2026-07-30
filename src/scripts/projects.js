import {
    marked
} from 'marked';

const $ = id => document.getElementById(id);

export function initProjects() {
    const modal = $('mdModal');
    const mdContent = $('mdContent');

    const closeModal = () => {
        modal.classList.remove('open');
        mdContent.innerHTML = '';
        document.body.style.overflow = '';
    };

    $('closeMdModal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (!e.target.closest('.md-modal-content')) closeModal();
    });

    document.body.addEventListener('click', async (e) => {
        const card = e.target.closest('.project-card');
        if (!card) return;

        // Если кликнули по кнопке-ссылке, не открываем модалку
        if (e.target.closest('.project-link-btn')) return;

        e.preventDefault();
        const repoUrl = card.dataset.repoUrl;
        if (!repoUrl) return;

        // Извлекаем owner и repo из URL (например, https://github.com/user/repo)
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) {
            window.open(repoUrl, '_blank');
            return;
        }

        const [_, owner, repo] = match;

        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        mdContent.innerHTML = '<div class="md-loading">Loading README...</div>';

    try {
      let mdText = null;

      // 1. Пытаемся загрузить через raw.githubusercontent.com (без лимитов API)
      const rawUrls = [
        `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/readme.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/master/readme.md`
      ];

      for (const url of rawUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            mdText = await res.text();
            break;
          }
        } catch (err) { /* Игнорируем */ }
      }

      // 2. Фолбэк на GitHub API
      if (!mdText) {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
        const apiRes = await fetch(apiUrl, {
          headers: { 'Accept': 'application/vnd.github.v3.raw' }
        });
        if (!apiRes.ok) throw new Error('Failed to fetch README');
        mdText = await apiRes.text();
      }

      const html = marked.parse(mdText);
      
      // === ОБРАБОТКА HTML ПЕРЕД ВСТАВКОЙ В DOM ===
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Фиксим ссылки
      doc.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');

        if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('#') && !href.startsWith('mailto:')) {
          let cleanPath = href.replace(/^(\.\.?\/)+/, '').replace(/^\//, '');
          a.setAttribute('href', `https://github.com/${owner}/${repo}/blob/HEAD/${cleanPath}`);
        }
      });

      // Подготавливаем картинки (вычисляем правильный URL и кладем в data-атрибут)
      doc.querySelectorAll('img').forEach(img => {
        let src = img.getAttribute('src');
        if (src) {
          img.setAttribute('referrerpolicy', 'no-referrer');
          
          let finalSrc = src;
          if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
            let cleanPath = src.replace(/^(\.\.?\/)+/, '').replace(/^\//, '');
            finalSrc = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${cleanPath}`;
          }
          
          img.setAttribute('data-final-src', finalSrc);
          img.removeAttribute('src'); // Временно убираем src, чтобы не загрузился до установки onerror
        }
      });

      // 3. Вставляем подготовленный HTML на страницу
      mdContent.innerHTML = doc.body.innerHTML;

      // 4. ВЕШАЕМ ОБРАБОТЧИКИ НА "ЖИВОЙ" DOM
      mdContent.querySelectorAll('img').forEach(img => {
        const finalSrc = img.getAttribute('data-final-src');
        if (!finalSrc) return;

        // Устанавливаем прямой путь
        img.setAttribute('src', finalSrc);

        // Если прямая загрузка падает — меняем на прокси wsrv.nl
        img.addEventListener('error', function() {
          if (!this.dataset.proxyTried) {
            this.dataset.proxyTried = 'true';
            const encodedUrl = encodeURIComponent(finalSrc);
            this.setAttribute('src', `https://wsrv.nl/?url=${encodedUrl}`);
          } else {
            // Если и прокси упал, скрываем битую иконку
            this.style.display = 'none';
          }
        });
      });

    } catch (err) {
      mdContent.innerHTML = `<div class="md-error">Failed to load README. <a href="${repoUrl}" target="_blank">Open repository directly</a>.</div>`;
    }
    });
}