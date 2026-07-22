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
      $('langCurrent').textContent = newLang.toUpperCase();
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

  const scrollCue = $('scrollCue');
  const contentArea = $('contentArea');
  const topbar = $('topbar');
  const footer = document.querySelector('.site-footer');

  if (scrollCue) {
    scrollCue.addEventListener('click', () => {
      const top = contentArea.getBoundingClientRect().top + window.scrollY;
      const barH = topbar.offsetHeight;
      window.scrollTo({
        top: top - barH + 15,
        behavior: 'smooth'
      });
    });
  }

  const writeMeLink = document.querySelector('.nav-link[href="#contact"]');
  if (writeMeLink && footer && topbar) {
    writeMeLink.addEventListener('click', (e) => {
      e.preventDefault();
      const targetY = footer.offsetTop - topbar.offsetHeight + 50;
      window.scrollTo({
        top: targetY,
        behavior: 'smooth'
      });
    });
  }

  // === Клавиатурная навигация ===
  const sections = Array.from(document.querySelectorAll('.content-section, #contact'));
  let isScrolling = false;

  function getActiveSectionIndex() {
    const scrollPos = window.scrollY + window.innerHeight / 3;
    let activeIndex = 0;
    sections.forEach((sec, i) => {
      if (sec.offsetTop <= scrollPos) {
        activeIndex = i;
      }
    });
    return activeIndex;
  }

  function scrollToSection(index) {
    if (index < 0 || index >= sections.length) return;

    isScrolling = true;
    const target = sections[index];
    const top = target.getBoundingClientRect().top + window.scrollY;
    const barH = topbar.offsetHeight;

    window.scrollTo({
      top: top - barH + 15,
      behavior: 'smooth'
    });

    setTimeout(() => {
      isScrolling = false;
    }, 700);
  }

  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement.tagName;
    if (['INPUT', 'TEXTAREA'].includes(activeTag)) return;

    const navKeys = ['PageDown', 'ArrowRight', 'ArrowDown', 'PageUp', 'ArrowLeft', 'ArrowUp'];
    if (!navKeys.includes(e.key)) return;

    e.preventDefault();

    if (isScrolling) return;

    const currentIndex = getActiveSectionIndex();
    let nextIndex = currentIndex;

    if (['PageDown', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
      nextIndex = currentIndex + 1;
    } else if (['PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
      nextIndex = currentIndex - 1;
    }

    scrollToSection(nextIndex);
  });

  const navLinks = document.querySelectorAll('.nav-link');

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

  window.addEventListener('scroll', () => {
    const contentTop = contentArea.getBoundingClientRect().top;
    const footerTop = footer.getBoundingClientRect().top;
    const barHeight = topbar.offsetHeight;

    if (contentTop <= barHeight && footerTop > barHeight) {
      topbar.classList.add('solid');
    } else {
      topbar.classList.remove('solid');
    }
  }, {
    passive: true
  });
}