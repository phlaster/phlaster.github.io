const $ = id => document.getElementById(id);

export function initNavigation(renderCallback) {
  const langSwitch = $('langSwitch');
  const langTrigger = $('langTrigger');
  const langDropdown = $('langDropdown');

  langTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = langSwitch.classList.toggle('open');
    langTrigger.setAttribute('aria-expanded', isOpen);
  });

  langDropdown.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const newLang = li.dataset.lang;
      langDropdown.querySelectorAll('li').forEach(x => x.classList.toggle('active', x === li));

      const langAbbr = {
        en: 'ENG',
        ru: 'RUS',
        fr: 'FRA'
      };
      $('langCurrent').textContent = langAbbr[newLang] || 'ENG';

      langSwitch.classList.remove('open');
      renderCallback(newLang);
    });
  });

  document.addEventListener('click', (e) => {
    if (!langSwitch.contains(e.target)) {
      langSwitch.classList.remove('open');
      langTrigger.setAttribute('aria-expanded', 'false');
    }
  });

  const topbar = $('topbar');
  const contentArea = $('contentArea');
  const footer = document.getElementById('contact');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = Array.from(document.querySelectorAll('.content-section, #contact'));
  const scrollCue = $('scrollCue');
  const heroSection = $('hero');

  // === Клик по логотипу A.M — проматывает в самый верх ===
  const brandEl = document.querySelector('.brand');
  if (brandEl) {
    brandEl.style.cursor = 'pointer';
    brandEl.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // === Функция точного расчета позиции скролла ===
  function getTargetScrollTop(targetId) {
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return 0;

    if (targetId === 'contact') {
      return targetEl.getBoundingClientRect().top + window.scrollY - topbar.offsetHeight + 30;
    }

    const panelHead = targetEl.querySelector('.panel-head');
    const anchorEl = panelHead || targetEl;
    return anchorEl.getBoundingClientRect().top + window.scrollY - topbar.offsetHeight - 20;
  }

  // === Обработка кликов по навигации ===
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      window.scrollTo({
        top: getTargetScrollTop(targetId),
        behavior: 'smooth'
      });
    });
  });

  // === Кнопка скролла из Hero ===
  if (scrollCue) {
    scrollCue.addEventListener('click', () => {
      window.scrollTo({
        top: getTargetScrollTop('about'),
        behavior: 'smooth'
      });
    });
  }

  // === Клавиатурная навигация ===
  function getActiveSectionIndex() {
    const scrollPos = window.scrollY + topbar.offsetHeight + 50;
    let activeIndex = -1;
    for (let i = 0; i < sections.length; i++) {
      const secTop = sections[i].getBoundingClientRect().top + window.scrollY;
      if (secTop <= scrollPos) {
        activeIndex = i;
      } else {
        break;
      }
    }
    return activeIndex;
  }

  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement.tagName;
    if (['INPUT', 'TEXTAREA'].includes(activeTag)) return;

    const navKeys = ['PageDown', 'ArrowRight', 'ArrowDown', 'PageUp', 'ArrowLeft', 'ArrowUp'];
    if (!navKeys.includes(e.key)) return;

    e.preventDefault();
    if (e.repeat) return;

    let currentIndex = getActiveSectionIndex();

    if (currentIndex === -1 && ['PageDown', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
      currentIndex = 0;
    } else if (currentIndex === -1) {
      return;
    }

    if (['PageDown', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
      const nextIndex = Math.min(currentIndex + 1, sections.length - 1);
      if (sections[nextIndex]) {
        window.scrollTo({
          top: getTargetScrollTop(sections[nextIndex].id),
          behavior: 'smooth'
        });
      }
    } else if (['PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
      if (currentIndex <= 0) {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } else {
        const prevIndex = currentIndex - 1;
        window.scrollTo({
          top: getTargetScrollTop(sections[prevIndex].id),
          behavior: 'smooth'
        });
      }
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, {
    rootMargin: '-30% 0px -60% 0px'
  });

  sections.forEach(sec => observer.observe(sec));

  if (heroSection) {
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const iframe = document.getElementById('heroIframe');

        if (entry.isIntersecting && entry.intersectionRatio <= 0.5) {
          navLinks.forEach(link => link.classList.remove('active'));

          if (iframe && iframe.contentWindow) {
            const isMobile = window.matchMedia("(max-width: 768px)").matches;
            const mode = isMobile ? 'disabled' : 'reduced';
            iframe.contentWindow.postMessage({
              type: 'HEX_LIVE_TWIST',
              mode: mode
            }, '*');
          }
        } else {
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'HEX_LIVE_TWIST',
              mode: 'normal'
            }, '*');
          }
        }
      });
    }, {
      threshold: [0, 0.5, 1]
    });

    heroObserver.observe(heroSection);
  }

  let scrollTimer = null;

  const handleScroll = () => {
    const contentTop = contentArea.getBoundingClientRect().top;
    const footerTop = footer.getBoundingClientRect().top;
    const barHeight = topbar.offsetHeight;

    if (contentTop <= barHeight && footerTop > barHeight) {
      topbar.classList.add('solid');
    } else {
      topbar.classList.remove('solid');
    }

    if (scrollCue && heroSection) {
      const heroHeight = heroSection.offsetHeight;
      const isPastMidpoint = window.scrollY > heroHeight / 2;

      if (isPastMidpoint) {
        scrollCue.classList.add('paused');
      } else {
        scrollCue.classList.add('paused');
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          // Проверяем, что мы всё еще не проскроллили половину Hero
          if (window.scrollY <= heroSection.offsetHeight / 2) {
            scrollCue.classList.remove('paused');
          }
        }, 200);
      }
    }
  };

  window.addEventListener('scroll', handleScroll, {
    passive: true
  });
  handleScroll();
}