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

      // Находим секцию, в которой сейчас находится пользователь
      let activeSection = document.getElementById('hero');
      const sectionsList = Array.from(document.querySelectorAll('.content-section, #contact'));
      for (let i = 0; i < sectionsList.length; i++) {
        if (sectionsList[i].offsetTop <= scrollPos) {
          activeSection = sectionsList[i];
        } else {
          break;
        }
      }

      // Запоминаем отступ от начала этой секции до текущего скролла
      const offsetIn = window.scrollY - activeSection.offsetTop;

      // Перерисовываем контент (вызывает rerender в main.js)
      renderCallback(newLang);

      // Восстанавливаем позицию скролла с учетом новых размеров секции
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

  // === Логика мобильного меню (гамбургер) ===
  if (mobileMenuToggle) {
    const closeMobileMenu = () => {
      if (topbar.classList.contains('mobile-menu-open')) {
        topbar.classList.remove('mobile-menu-open');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');

        // Триггерим закрытие меню выбора языка при закрытии мобильного меню
        langSwitch.classList.remove('open');
        langTrigger.setAttribute('aria-expanded', 'false');
      }
    };

    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();

      // Любое нажатие на гамбургер (открытие или закрытие) закрывает меню языка
      langSwitch.classList.remove('open');
      langTrigger.setAttribute('aria-expanded', 'false');

      const isOpen = topbar.classList.toggle('mobile-menu-open');
      mobileMenuToggle.setAttribute('aria-expanded', isOpen);

      // Снимаем фокус с iframe, чтобы следующее касание по нему снова вызвало blur
      if (isOpen) {
        mobileMenuToggle.focus();
      }
    });

    // Закрываем меню при клике или касании вне области топбара (по документу)
    const handleOutsideInteraction = (e) => {
      if (!topbar.contains(e.target)) {
        closeMobileMenu();
      }
    };

    document.addEventListener('click', handleOutsideInteraction);
    document.addEventListener('touchstart', handleOutsideInteraction, {
      passive: true
    });

    // Особый случай: касание внутри iframe (например, для рисования).
    // Если iframe получает фокус, родительское окно теряет фокус (событие blur).
    // Это позволяет закрыть меню, не блокируя само касание внутри iframe.
    window.addEventListener('blur', () => {
      if (topbar.classList.contains('mobile-menu-open')) {
        closeMobileMenu();
      }
    });

    // === Закрытие меню свайпом вверх ===
    let touchStartY = 0;

    topbar.addEventListener('touchstart', (e) => {
      // Запоминаем начальную точку касания, только если меню открыто
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

      // Если свайп вверх (отрицательное значение) больше 50px
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

  // === Клик по логотипу A.M — проматывает в самый верх ===
  const brandEl = document.querySelector('.brand');
  if (brandEl) {
    brandEl.style.cursor = 'pointer';
    brandEl.addEventListener('click', () => {
      // Закрываем мобильное меню при клике на бренд
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

  // === Функция точного расчета позиции скролла ===
  function getTargetScrollTop(targetId) {
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return 0;

    // Берем высоту из CSS-переменной, чтобы раскрытое мобильное меню не ломало расчет отступа
    const barHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 60;

    if (targetId === 'contact') {
      return targetEl.getBoundingClientRect().top + window.scrollY - barHeight + 30;
    }

    const panelHead = targetEl.querySelector('.panel-head');
    const anchorEl = panelHead || targetEl;
    return anchorEl.getBoundingClientRect().top + window.scrollY - barHeight - 20;
  }

  // === Обработка кликов по навигации ===
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);

      // Закрываем мобильное меню при клике на пункт навигации
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
    // Если мы в самом низу страницы, активным считается последний раздел (контакты)
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
      // Если мы в самом верху (Hero), currentIndex равен -1. 
      // В таком случае нам нужен самый первый раздел (0 — About), а не +1 к нему.
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

      // === Прилипание перемотки (Snap to top) ===
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

export function initCareerHighlighting() {
  const timelineItems = document.querySelectorAll('.timeline-item');
  const skillTags = document.querySelectorAll('.skill-tag[data-places]');
  const careerGrid = document.querySelector('.career-grid');

  if (!timelineItems.length || !skillTags.length || !careerGrid) return;

  const isWideScreen = () => window.matchMedia('(min-width: 769px)').matches;

  // === Создаем SVG слой для линий ===
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
    svg.style.zIndex = '0'; // Под текстом, но над фоном
    careerGrid.appendChild(svg);
  }

  const clearLines = () => {
    if (svg) svg.innerHTML = '';
  };

  const drawLines = (item) => {
    clearLines();
    // Линии рисуются только на узких экранах
    if (isWideScreen()) return;

    const gridRect = careerGrid.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const placeId = item.dataset.place;
    if (!placeId) return;

    // Находим только те скиллы, которые относятся к нажатому элементу
    const matchingTags = Array.from(skillTags).filter(tag =>
      tag.dataset.places.split(' ').includes(placeId)
    );

    if (matchingTags.length === 0) return;

    // Перемешиваем скиллы и выбираем до 10 случайных
    const shuffled = [...matchingTags].sort(() => 0.5 - Math.random());
    const tagsToAnimate = shuffled.slice(0, 10);

    const totalDuration = 800; // Общая длительность всей анимации (0.7 сек)
    const lineDuration = 600; // Длительность полета одного отрезка
    const stagger = tagsToAnimate.length > 1 ? (totalDuration - lineDuration) / (tagsToAnimate.length - 1) : 0;

    tagsToAnimate.forEach((tag, index) => {
      setTimeout(() => {
        const tagRect = tag.getBoundingClientRect();

        // Случайные координаты внутри нажатого блока (старт)
        const startX = itemRect.left + Math.random() * itemRect.width - gridRect.left;
        const startY = itemRect.top + Math.random() * itemRect.height - gridRect.top;

        // Случайные координаты внутри скилла (финиш)
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
        // Длина летящего отрезка (20% от длины пути, но не менее 15px)
        const segLength = Math.max(10, length * 0.3);

        // Видим только короткий отрезок в самом начале пути
        line.style.strokeDasharray = `${segLength} ${length + segLength}`;
        line.style.strokeDashoffset = '0';
        line.style.opacity = '0';

        svg.appendChild(line);

        // Запускаем анимацию полета и появления
        requestAnimationFrame(() => {
          // Появление (0.1с) и движение (0.3с)
          line.style.transition = 'opacity 0.2s ease-out, stroke-dashoffset 0.3s ease-in';
          line.style.opacity = '0.6';

          // Сдвигаем отрезок к концу линии
          line.style.strokeDashoffset = `${-(length - segLength)}`;
        });

        // После того как отрезок долетел, он исчезает
        setTimeout(() => {
          line.style.transition = 'opacity 0.1s ease-out';
          line.style.opacity = '0';
        }, 300); // 0.1s появление + 0.3s движение = 0.4s (lineDuration)

        // Удаляем линию из DOM после завершения всех анимаций
        setTimeout(() => {
          if (line.parentNode) line.remove();
        }, 450);

      }, index * stagger); // Каждая линия стартует со своей задержкой
    });
  };

  const clearActive = () => {
    timelineItems.forEach(i => i.classList.remove('is-active'));
    skillTags.forEach(t => t.classList.remove('highlight'));
    careerGrid.classList.remove('is-hovering');
    clearLines();
  };

  const setActive = (item) => {
    clearActive();
    item.classList.add('is-active');
    careerGrid.classList.add('is-hovering');
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

  timelineItems.forEach(item => {
    // Поведение мыши (только десктоп)
    item.addEventListener('mouseenter', () => {
      if (isWideScreen()) {
        setActive(item);
      }
    });

    item.addEventListener('mouseleave', () => {
      if (isWideScreen()) {
        clearActive();
      }
    });

    // Клик / Тап
    item.addEventListener('click', (e) => {
      if (e.target.closest('.timeline-link-btn')) return;

      if (isWideScreen()) {
        const url = item.dataset.url;
        if (url && url !== '#') {
          window.open(url, '_blank', 'noopener');
        }
      } else {
        if (item.classList.contains('is-active')) {
          clearActive();
        } else {
          setActive(item);
        }
      }
    });
  });

  // Сброс при прокрутке до другого раздела
  const sections = document.querySelectorAll('.content-section');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        clearActive();
      }
    });
  }, {
    threshold: 0.3
  });
  sections.forEach(sec => sectionObserver.observe(sec));

  // Сброс при переходе на широкий экран
  window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => {
    if (e.matches) {
      clearActive();
    }
  });

  // Сброс линий при ресайзе, чтобы они не "отрывались" от элементов
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (careerGrid.classList.contains('is-hovering')) {
        clearLines();
      }
    }, 100);
  });
}