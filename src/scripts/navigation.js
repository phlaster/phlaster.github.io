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

  const heroIframe = $('heroIframe');
  let lastTwistMode = '';

  function updateHeroTwistMode() {
    if (!heroIframe || !heroIframe.contentWindow) return;

    const scrolledHalfway = window.scrollY > window.innerHeight * 0.5;

    const isMobile = window.matchMedia("(max-width: 768px)").matches || ('ontouchstart' in window && window.innerWidth <= 768);

    let newMode = 'normal';
    if (scrolledHalfway) {
      newMode = isMobile ? 'disabled' : 'reduced';
    }

    if (newMode !== lastTwistMode) {
      lastTwistMode = newMode;
      heroIframe.contentWindow.postMessage({
        type: 'HEX_LIVE_TWIST',
        mode: newMode
      }, '*');
    }
  }

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

  function getTargetScrollTop(targetId) {
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return 0;

    if (targetId === 'contact') {
      return targetEl.getBoundingClientRect().top + window.scrollY - topbar.offsetHeight + 50;
    }

    const panelHead = targetEl.querySelector('.panel-head');
    const anchorEl = panelHead || targetEl;

    return anchorEl.getBoundingClientRect().top + window.scrollY - topbar.offsetHeight - 10;
  }

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

  const scrollCue = $('scrollCue');
  if (scrollCue) {
    scrollCue.addEventListener('click', () => {
      window.scrollTo({
        top: getTargetScrollTop('about'),
        behavior: 'smooth'
      });
    });
  }

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

  const updateTopbar = () => {
    const contentTop = contentArea.getBoundingClientRect().top;
    const footerTop = footer.getBoundingClientRect().top;
    const barHeight = topbar.offsetHeight;

    if (contentTop <= barHeight && footerTop > barHeight) {
      topbar.classList.add('solid');
    } else {
      topbar.classList.remove('solid');
    }
  };

  window.addEventListener('scroll', () => {
    updateTopbar();
    updateHeroTwistMode();
  }, {
    passive: true
  });
  updateTopbar();
  updateHeroTwistMode();
}