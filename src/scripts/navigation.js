import {
  config
} from './i18n.js';

const $ = id => document.getElementById(id);

export function initNavigation(renderCallback) {
  const langSwitch = $('langSwitch');
  const langTrigger = $('langTrigger');
  const langDropdown = $('langDropdown');
  const topbar = $('topbar');
  const mobileMenuToggle = $('mobileMenuToggle');

  // === Language Switcher ===
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
      langTrigger.setAttribute('aria-expanded', 'false');

      // === Предотвращение сдвига страницы при смене языка ===
      const barHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 60;
      const scrollPos = window.scrollY + barHeight + 50;

      let activeSection = document.getElementById('hero');
      const sectionsList = Array.from(document.querySelectorAll('.content-section, #contact'));
      for (let i = 0; i < sectionsList.length; i++) {
        if (sectionsList[i].offsetTop <= scrollPos) {
          activeSection = sectionsList[i];
        } else {
          break;
        }
      }

      const offsetIn = window.scrollY - activeSection.offsetTop;
      renderCallback(newLang);

      const newScrollTop = activeSection.offsetTop + offsetIn;
      window.scrollTo(0, newScrollTop);
    });
  });

  document.addEventListener('click', (e) => {
    if (!langSwitch.contains(e.target)) {
      langSwitch.classList.remove('open');
      langTrigger.setAttribute('aria-expanded', 'false');
    }
  });

  // === Логика мобильного меню ===
  if (mobileMenuToggle) {
    const closeMobileMenu = () => {
      if (topbar.classList.contains('mobile-menu-open')) {
        topbar.classList.remove('mobile-menu-open');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        langSwitch.classList.remove('open');
        langTrigger.setAttribute('aria-expanded', 'false');
      }
    };

    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      langSwitch.classList.remove('open');
      langTrigger.setAttribute('aria-expanded', 'false');

      const isOpen = topbar.classList.toggle('mobile-menu-open');
      mobileMenuToggle.setAttribute('aria-expanded', isOpen);

      if (isOpen) {
        mobileMenuToggle.focus();
      }
    });

    const handleOutsideInteraction = (e) => {
      if (!topbar.contains(e.target)) {
        closeMobileMenu();
      }
    };

    document.addEventListener('click', handleOutsideInteraction);
    document.addEventListener('touchstart', handleOutsideInteraction, {
      passive: true
    });

    window.addEventListener('blur', () => {
      if (topbar.classList.contains('mobile-menu-open')) {
        closeMobileMenu();
      }
    });

    let touchStartY = 0;
    topbar.addEventListener('touchstart', (e) => {
      if (topbar.classList.contains('mobile-menu-open')) {
        touchStartY = e.touches[0].clientY;
      }
    }, {
      passive: true
    });

    topbar.addEventListener('touchend', (e) => {
      if (!topbar.classList.contains('mobile-menu-open')) return;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchEndY - touchStartY;
      if (deltaY < -50) {
        closeMobileMenu();
      }
    }, {
      passive: true
    });
  }

  const contentArea = $('contentArea');
  const footer = document.getElementById('contact');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = Array.from(document.querySelectorAll('.content-section, #contact'));
  const scrollCue = $('scrollCue');
  const heroSection = $('hero');

  const brandEl = document.querySelector('.brand');
  if (brandEl) {
    brandEl.style.cursor = 'pointer';
    brandEl.addEventListener('click', () => {
      if (topbar.classList.contains('mobile-menu-open')) {
        topbar.classList.remove('mobile-menu-open');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      }
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  function getTargetScrollTop(targetId) {
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return 0;
    const barHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 60;
    if (targetId === 'contact') {
      return targetEl.getBoundingClientRect().top + window.scrollY - barHeight + 30;
    }
    const panelHead = targetEl.querySelector('.panel-head');
    const anchorEl = panelHead || targetEl;
    return anchorEl.getBoundingClientRect().top + window.scrollY - barHeight - 20;
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      if (topbar.classList.contains('mobile-menu-open')) {
        topbar.classList.remove('mobile-menu-open');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      }
      window.scrollTo({
        top: getTargetScrollTop(targetId),
        behavior: 'smooth'
      });
    });
  });

  if (scrollCue) {
    scrollCue.addEventListener('click', () => {
      window.scrollTo({
        top: getTargetScrollTop('about'),
        behavior: 'smooth'
      });
    });
  }

  function getActiveSectionIndex() {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 5) {
      return sections.length - 1;
    }
    const barHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 60;
    const scrollPos = window.scrollY + barHeight + 50;
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

    if (['PageDown', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
      const nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, sections.length - 1);
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
        if (sections[prevIndex]) {
          window.scrollTo({
            top: getTargetScrollTop(sections[prevIndex].id),
            behavior: 'smooth'
          });
        }
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
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'HEX_LIVE_TWIST',
              mode: 'normal'
            }, '*');
          }
        } else {
          navLinks.forEach(link => link.classList.remove('active'));
          if (iframe && iframe.contentWindow) {
            const isMobile = window.matchMedia("(max-width: 768px)").matches;
            const mode = isMobile ? 'disabled' : 'reduced';
            iframe.contentWindow.postMessage({
              type: 'HEX_LIVE_TWIST',
              mode: mode
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
  let heroSnapTimer = null;

  const handleScroll = () => {
    const contentTop = contentArea.getBoundingClientRect().top;
    const footerTop = footer.getBoundingClientRect().top;
    const barHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 60;

    if (contentTop <= barHeight && footerTop > barHeight) {
      topbar.classList.add('solid');
    } else {
      topbar.classList.remove('solid');
    }

    if (heroSection) {
      const heroHeight = heroSection.offsetHeight;
      const scrollProgress = Math.min(window.scrollY / (heroHeight * 0.75), 1);
      const wrap = document.getElementById('canvasWrap');

      if (wrap) {
        const effects = config.config?.background_effects || {};
        const minOpacity = effects.scroll_min_opacity ?? 0.7;
        const maxGrayscale = effects.scroll_grayscale ?? 40;
        const maxBlur = effects.scroll_blur ?? 2;

        wrap.style.opacity = String(1 - (1 - minOpacity) * scrollProgress);
        wrap.style.filter = `grayscale(${maxGrayscale * scrollProgress}%) blur(${maxBlur * scrollProgress}px)`;
      }

      const drawHint = $('heroDrawHint');
      if (drawHint) {
        const fadeProgress = Math.min(window.scrollY / (heroHeight * 0.5), 1);
        drawHint.style.opacity = String(0.5 * (1 - fadeProgress));
        drawHint.style.transform = `translateY(${10 * fadeProgress}px)`;
      }

      const snapThreshold = heroHeight * 0.25;
      if (window.scrollY > 0 && window.scrollY <= snapThreshold) {
        clearTimeout(heroSnapTimer);
        heroSnapTimer = setTimeout(() => {
          if (window.scrollY > 0 && window.scrollY <= snapThreshold) {
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }
        }, 500);
      } else {
        clearTimeout(heroSnapTimer);
      }
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
          if (window.scrollY <= heroSection.offsetHeight / 2) {
            scrollCue.classList.remove('paused');
          }
        }, 200);
      }
    }
  };

  document.addEventListener('visibilitychange', () => {
    const iframe = document.getElementById('heroIframe');
    if (document.hidden) {
      document.body.classList.add('tab-hidden');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'HEX_LIVE_TWIST',
          mode: 'disabled'
        }, '*');
      }
    } else {
      document.body.classList.remove('tab-hidden');
      if (iframe && iframe.contentWindow) {
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        const mode = isMobile ? 'reduced' : 'normal';
        iframe.contentWindow.postMessage({
          type: 'HEX_LIVE_TWIST',
          mode: mode
        }, '*');
      }
      handleScroll();
    }
  });

  window.addEventListener('scroll', handleScroll, {
    passive: true
  });
  handleScroll();
}

let _careerResizeHandler = null;
let _careerObserver = null;
let _careerMediaHandler = null;

export function initCareerHighlighting() {
  if (_careerResizeHandler) {
    window.removeEventListener('resize', _careerResizeHandler);
    _careerResizeHandler = null;
  }
  if (_careerObserver) {
    _careerObserver.disconnect();
    _careerObserver = null;
  }
  if (_careerMediaHandler) {
    window.matchMedia('(min-width: 769px)').removeEventListener('change', _careerMediaHandler);
    _careerMediaHandler = null;
  }

  const timelineItems = document.querySelectorAll('.timeline-item');
  const skillTags = document.querySelectorAll('.skill-tag[data-places]');
  const careerGrid = document.querySelector('.career-grid');

  if (!timelineItems.length || !skillTags.length || !careerGrid) return;

  careerGrid.style.position = 'relative';
  let svg = careerGrid.querySelector('.career-lines-svg');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('career-lines-svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '0';
    careerGrid.appendChild(svg);
  }

  const clearLines = () => {
    if (svg) svg.innerHTML = '';
  };

  const drawLines = (item) => {
    clearLines();
    const gridRect = careerGrid.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const placeId = item.dataset.place;
    if (!placeId) return;

    const matchingTags = Array.from(skillTags).filter(tag =>
      tag.dataset.places.split(' ').includes(placeId)
    );

    if (matchingTags.length === 0) return;

    const shuffled = [...matchingTags].sort(() => 0.5 - Math.random());
    const tagsToAnimate = shuffled.slice(0, 10);

    const totalDuration = 800;
    const lineDuration = 600;
    const stagger = tagsToAnimate.length > 1 ? (totalDuration - lineDuration) / (tagsToAnimate.length - 1) : 0;

    tagsToAnimate.forEach((tag, index) => {
      setTimeout(() => {
        const tagRect = tag.getBoundingClientRect();
        const startX = itemRect.left + Math.random() * itemRect.width - gridRect.left;
        const startY = itemRect.top + Math.random() * itemRect.height - gridRect.top;
        const endX = tagRect.left + Math.random() * tagRect.width - gridRect.left;
        const endY = tagRect.top + Math.random() * tagRect.height - gridRect.top;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        line.setAttribute('stroke', 'var(--color-accent)');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-linecap', 'round');

        const length = Math.hypot(endX - startX, endY - startY);
        const segLength = Math.max(10, length * 0.3);

        line.style.strokeDasharray = `${segLength} ${length + segLength}`;
        line.style.strokeDashoffset = '0';
        line.style.opacity = '0';
        svg.appendChild(line);

        requestAnimationFrame(() => {
          line.style.transition = 'opacity 0.2s ease-out, stroke-dashoffset 0.3s ease-in';
          line.style.opacity = '0.6';
          line.style.strokeDashoffset = `${-(length - segLength)}`;
        });

        setTimeout(() => {
          line.style.transition = 'opacity 0.1s ease-out';
          line.style.opacity = '0';
        }, 300);

        setTimeout(() => {
          if (line.parentNode) line.remove();
        }, 450);
      }, index * stagger);
    });
  };

  // Очистка только визуального подсвечивания (для ховера)
  const clearVisuals = () => {
    timelineItems.forEach(i => i.classList.remove('is-highlighted'));
    skillTags.forEach(t => t.classList.remove('highlight'));
    careerGrid.classList.remove('is-hovering');
    clearLines();
  };

  // Применение визуального подсвечивания (для ховера)
  const applyVisuals = (item) => {
    clearVisuals();
    careerGrid.classList.add('is-hovering');
    item.classList.add('is-highlighted');
    const placeId = item.dataset.place;
    if (placeId) {
      Array.from(skillTags).forEach(tag => {
        if (tag.dataset.places.split(' ').includes(placeId)) {
          tag.classList.add('highlight');
        }
      });
    }
    drawLines(item);
  };

  // Полная очистка (снимает фиксацию клика и визуал)
  const clearActive = () => {
    timelineItems.forEach(i => i.classList.remove('is-active'));
    clearVisuals();
  };

  // Фиксация элемента (по клику или тапу)
  const setActive = (item) => {
    clearActive();
    item.classList.add('is-active');
    applyVisuals(item);
  };

  timelineItems.forEach(item => {
    item.onmouseenter = null;
    item.onmouseleave = null;
    item.onclick = null;
    item.onpointerenter = null;
    item.onpointerleave = null;

    // Ховер только для мыши и только если нет зафиксированного (is-active) элемента
    item.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && !document.querySelector('.timeline-item.is-active')) {
        applyVisuals(item);
      }
    });

    item.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !document.querySelector('.timeline-item.is-active')) {
        clearVisuals();
      }
    });

    // Унифицированное поведение для кликов и тапов
    item.addEventListener('click', (e) => {
      if (e.target.closest('.timeline-link-btn')) return;

      if (item.classList.contains('is-active')) {
        clearActive();
      } else {
        setActive(item);
      }
    });
  });

  const sections = document.querySelectorAll('.content-section');
  _careerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) clearActive();
    });
  }, {
    threshold: 0.3
  });
  sections.forEach(sec => _careerObserver.observe(sec));

  _careerMediaHandler = (e) => {
    if (e.matches) clearActive();
  };
  window.matchMedia('(min-width: 769px)').addEventListener('change', _careerMediaHandler);

  let resizeTimer;
  _careerResizeHandler = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (careerGrid.classList.contains('is-hovering')) clearLines();
    }, 100);
  };
  window.addEventListener('resize', _careerResizeHandler);
}