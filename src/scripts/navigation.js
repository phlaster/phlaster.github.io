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

  const sections = document.querySelectorAll('.content-section, #contact');
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
    if (contentArea.getBoundingClientRect().top <= topbar.offsetHeight) {
      topbar.classList.add('solid');
    } else {
      topbar.classList.remove('solid');
    }
  }, {
    passive: true
  });
}