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

  // === Drag Scroll Cue Logic ===
  let isDraggingCue = false;
  let dragStartY = 0;
  let dragStartScrollY = 0;

  if (scrollCue) {
    scrollCue.addEventListener('click', (e) => {
      if (scrollCue.dataset.dragged === 'true') {
        e.preventDefault();
        scrollCue.dataset.dragged = 'false';
        return;
      }
      window.scrollTo({
        top: getTargetScrollTop('about'),
        behavior: 'smooth'
      });
    });

    scrollCue.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDraggingCue = true;
      scrollCue.classList.add('is-dragging');
      scrollCue.dataset.dragged = 'false';

      dragStartY = e.clientY;
      dragStartScrollY = window.scrollY;

      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDraggingCue) return;
      e.preventDefault();

      const deltaY = e.clientY - dragStartY;

      if (Math.abs(deltaY) > 5) {
        scrollCue.dataset.dragged = 'true';
      }

      const newScrollY = dragStartScrollY - deltaY;
      window.scrollTo(0, newScrollY);
    });

    window.addEventListener('mouseup', () => {
      if (isDraggingCue) {
        isDraggingCue = false;
        scrollCue.classList.remove('is-dragging');
        document.body.style.userSelect = '';
      }
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
  let footerSnapTimer = null;

  const footerSnapThreshold = 150;

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
      if (!isDraggingCue && window.scrollY > 0 && window.scrollY <= snapThreshold) {
        clearTimeout(heroSnapTimer);
        heroSnapTimer = setTimeout(() => {
          if (!isDraggingCue && window.scrollY > 0 && window.scrollY <= snapThreshold) {
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

    const distanceToBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);

    if (!isDraggingCue && distanceToBottom > 0 && distanceToBottom < footerSnapThreshold) {
      clearTimeout(footerSnapTimer);
      footerSnapTimer = setTimeout(() => {
        const currentDistance = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
        if (!isDraggingCue && currentDistance > 0 && currentDistance < footerSnapThreshold) {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 300);
    } else {
      clearTimeout(footerSnapTimer);
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
let _careerMediaHandler = null;

export function initCareerHighlighting() {
  if (_careerResizeHandler) {
    window.removeEventListener('resize', _careerResizeHandler);
    _careerResizeHandler = null;
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

  let activeTimeout = null;
  let drawTimeout = null;
  let highlightTimeout = null;

  const clearVisuals = () => {
    timelineItems.forEach(i => i.classList.remove('is-hovered'));
    skillTags.forEach(t => t.classList.remove('highlight'));
    careerGrid.classList.remove('is-hovering');
  };

  const clearActive = () => {
    if (activeTimeout) clearTimeout(activeTimeout);
    if (drawTimeout) clearTimeout(drawTimeout);
    if (highlightTimeout) clearTimeout(highlightTimeout);
    activeTimeout = null;
    drawTimeout = null;
    highlightTimeout = null;

    timelineItems.forEach(i => i.classList.remove('is-active'));
    clearVisuals();

    svg.querySelectorAll('path').forEach(p => {
      p.style.transition = 'opacity 0.2s';
      p.style.opacity = '0';
      setTimeout(() => p.remove(), 250);
    });
  };

  const drawLines = (item, drawDuration, eraseDuration) => {
    const gridRect = careerGrid.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const placeId = item.dataset.place;
    if (!placeId) return;

    const matchingTags = Array.from(skillTags).filter(tag =>
      tag.dataset.places.split(' ').includes(placeId)
    );

    if (matchingTags.length === 0) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (isMobile) {
      matchingTags.forEach(tag => {
        const tagRect = tag.getBoundingClientRect();
        const x = tagRect.left + Math.random() * tagRect.width - gridRect.left;
        const startY = itemRect.top - gridRect.top;
        const endY = tagRect.bottom - gridRect.top;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${x} ${startY} L ${x} ${endY}`;
        line.setAttribute('d', d);
        line.setAttribute('stroke', 'var(--color-accent)');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('fill', 'none');

        svg.appendChild(line);

        const length = line.getTotalLength();
        line.style.strokeDasharray = length;
        line.style.strokeDashoffset = length;
        line.style.opacity = '0.5';

        line.animate([{
            strokeDashoffset: length
          },
          {
            strokeDashoffset: 0
          }
        ], {
          duration: drawDuration,
          easing: 'linear',
          fill: 'forwards'
        });

        line.animate([{
            strokeDashoffset: 0
          },
          {
            strokeDashoffset: -length
          }
        ], {
          duration: eraseDuration,
          delay: drawDuration,
          easing: 'linear',
          fill: 'forwards'
        });
      });
    } else {
      const startX = itemRect.right - gridRect.left;
      const topY = itemRect.top - gridRect.top + 10;
      const bottomY = itemRect.bottom - gridRect.top - 10;
      const count = matchingTags.length;

      matchingTags.forEach((tag, index) => {
        const tagRect = tag.getBoundingClientRect();
        const endX = tagRect.left - gridRect.left;
        const endY = tagRect.top + Math.random() * tagRect.height - gridRect.top;

        const startY = count === 1 ? (topY + bottomY) / 2 : topY + (index / (count - 1)) * (bottomY - topY);

        const cp1x = startX + (endX - startX) * 0.5;
        const cp1y = startY;
        const cp2x = endX - (endX - startX) * 0.5;
        const cp2y = endY;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

        line.setAttribute('d', d);
        line.setAttribute('stroke', 'var(--color-accent)');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('fill', 'none');

        svg.appendChild(line);

        const length = line.getTotalLength();
        line.style.strokeDasharray = length;
        line.style.strokeDashoffset = length;
        line.style.opacity = '0.5';

        line.animate([{
            strokeDashoffset: length
          },
          {
            strokeDashoffset: 0
          }
        ], {
          duration: drawDuration,
          easing: 'linear',
          fill: 'forwards'
        });

        line.animate([{
            strokeDashoffset: 0
          },
          {
            strokeDashoffset: -length
          }
        ], {
          duration: eraseDuration,
          delay: drawDuration,
          easing: 'linear',
          fill: 'forwards'
        });
      });
    }

    highlightTimeout = setTimeout(() => {
      matchingTags.forEach(tag => tag.classList.add('highlight'));
    }, drawDuration);
  };

  const setActive = (item) => {
    if (item.classList.contains('is-active')) {
      clearActive();
      return;
    }

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const isInterrupting = !!document.querySelector('.timeline-item.is-active');

    const fadeDuration = isInterrupting ? 200 : 300;
    const stateTransitionDuration = isInterrupting ? 200 : 400;
    const drawDuration = 400;
    const eraseDuration = 600;

    careerGrid.style.setProperty('--anim-fade', `${fadeDuration}ms`);
    careerGrid.style.setProperty('--anim-draw', `${stateTransitionDuration}ms`);
    careerGrid.style.setProperty('--anim-erase', `${eraseDuration}ms`);

    svg.querySelectorAll('path').forEach(p => {
      p.style.transition = 'opacity 0.2s';
      p.style.opacity = '0';
      setTimeout(() => p.remove(), 250);
    });

    timelineItems.forEach(i => i.classList.remove('is-active'));
    skillTags.forEach(t => t.classList.remove('highlight'));

    item.classList.add('is-active');

    if (drawTimeout) clearTimeout(drawTimeout);
    if (highlightTimeout) clearTimeout(highlightTimeout);
    if (activeTimeout) clearTimeout(activeTimeout);

    drawTimeout = setTimeout(() => {
      careerGrid.classList.add('is-hovering');
      drawLines(item, drawDuration, eraseDuration);
    }, fadeDuration);

    activeTimeout = setTimeout(() => {
      clearActive();
    }, fadeDuration + drawDuration + eraseDuration + 10000);
  };

  timelineItems.forEach(item => {
    item.onmouseenter = null;
    item.onmouseleave = null;
    item.onclick = null;
    item.onpointerenter = null;
    item.onpointerleave = null;

    item.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && !document.querySelector('.timeline-item.is-active')) {
        clearVisuals();
        item.classList.add('is-hovered');
      }
    });

    item.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !document.querySelector('.timeline-item.is-active')) {
        item.classList.remove('is-hovered');
      }
    });

    // Клик/тап (запуск анимации)
    item.addEventListener('click', (e) => {
      if (e.target.closest('.timeline-link-btn')) return;
      setActive(item);
    });
  });


  _careerMediaHandler = (e) => {
    if (e.matches) clearActive();
  };
  window.matchMedia('(min-width: 769px)').addEventListener('change', _careerMediaHandler);

  let resizeTimer;
  _careerResizeHandler = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      svg.innerHTML = '';
    }, 100);
  };
  window.addEventListener('resize', _careerResizeHandler);
}