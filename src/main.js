import {
  parse
} from 'smol-toml';
import tomlString from './content.toml?raw';

const config = parse(tomlString);
let currentLang = config.site.default_lang || 'en';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
} [c]));

/* ---------- Language & Fallback Resolver ---------- */
const fallbackMap = {
  en: 'fr',
  ru: 'en',
  fr: 'ru'
};
const langKeys = ['en', 'fr', 'ru'];

function resolveTranslations(obj, lang) {
  if (Array.isArray(obj)) {
    return obj.map(item => resolveTranslations(item, lang));
  }
  if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj);
    const hasLangKey = keys.some(k => langKeys.includes(k));

    if (hasLangKey) {
      const sequence = [];
      let current = lang;
      for (let i = 0; i < 3; i++) {
        sequence.push(current);
        current = fallbackMap[current] || 'en';
      }

      for (const l of sequence) {
        if (obj[l] !== undefined) {
          // If the language property is an array or primitive, return it (and its children) resolved directly
          if (Array.isArray(obj[l]) || typeof obj[l] !== 'object') {
            return resolveTranslations(obj[l], lang);
          }

          const result = {};
          // Merge base properties (non-language keys), resolved recursively
          for (const k in obj) {
            if (!langKeys.includes(k)) {
              result[k] = resolveTranslations(obj[k], lang);
            }
          }
          // Merge language-specific properties, resolved recursively
          for (const k in obj[l]) {
            result[k] = resolveTranslations(obj[l][k], lang);
          }
          return result;
        }
      }
      console.error("Missing translation in all languages", obj);
      return {};
    } else {
      // Not a language container, just resolve children
      const result = {};
      for (const k in obj) {
        result[k] = resolveTranslations(obj[k], lang);
      }
      return result;
    }
  }
  return obj;
}

let i18nConfig = resolveTranslations(config, currentLang);

/* ---------- Hero canvas placeholder ---------- */
const PLACEHOLDER_PREFIX = 'http://my.domain.name/';
const isPlaceholder = url => !url || url.startsWith(PLACEHOLDER_PREFIX);

const canvas = $('heroCanvas');
const ctx = canvas.getContext('2d');
const iframe = $('heroIframe');
let canvasW = 0,
  canvasH = 0;
let canvasAnimating = false;
let heroVisible = true;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasW = canvas.clientWidth;
  canvasH = canvas.clientHeight;
  canvas.width = canvasW * dpr;
  canvas.height = canvasH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const curves = [];
const palette = ['#E8C9B8', '#B4502A', '#D4A574', '#7B9E89', '#C8B6E2', '#F2EFE8', '#9BC58A'];

function spawnCurve(x, y) {
  curves.push({
    points: [{
      x,
      y
    }],
    angle: Math.random() * Math.PI * 2,
    color: palette[Math.floor(Math.random() * palette.length)],
    life: 1,
    width: 0.8 + Math.random() * 1.8,
    target: 80 + Math.random() * 220,
    speed: 0.8 + Math.random() * 1.8,
    drift: (Math.random() - 0.5) * 0.05
  });
  if (curves.length > 90) curves.shift();
}

let isDragging = false,
  lastSpawn = 0;
canvas.addEventListener('pointerdown', e => {
  isDragging = true;
  canvas.setPointerCapture(e.pointerId);
  const r = canvas.getBoundingClientRect();
  spawnCurve(e.clientX - r.left, e.clientY - r.top);
});
canvas.addEventListener('pointermove', e => {
  if (!isDragging) return;
  const now = performance.now();
  if (now - lastSpawn < 28) return;
  lastSpawn = now;
  const r = canvas.getBoundingClientRect();
  spawnCurve(e.clientX - r.left, e.clientY - r.top);
});
canvas.addEventListener('pointerup', () => isDragging = false);
canvas.addEventListener('pointercancel', () => isDragging = false);

function animateCanvas() {
  if (!canvasAnimating) return;
  if (heroVisible) {
    ctx.fillStyle = 'rgba(15, 14, 12, 0.045)';
    ctx.fillRect(0, 0, canvasW, canvasH);
    for (let i = curves.length - 1; i >= 0; i--) {
      const c = curves[i];
      if (c.points.length < c.target) {
        const last = c.points[c.points.length - 1];
        c.angle += (Math.random() - 0.5) * 0.32 + c.drift;
        const np = {
          x: last.x + Math.cos(c.angle) * c.speed,
          y: last.y + Math.sin(c.angle) * c.speed
        };
        if (np.x < -20) np.x = canvasW + 20;
        if (np.x > canvasW + 20) np.x = -20;
        if (np.y < -20) np.y = canvasH + 20;
        if (np.y > canvasH + 20) np.y = -20;
        c.points.push(np);
        if (c.points.length > 800) c.points.shift();
      } else {
        c.life -= 0.0045;
      }
      if (c.life <= 0) {
        curves.splice(i, 1);
        continue;
      }

      ctx.strokeStyle = c.color;
      ctx.globalAlpha = c.life * 0.85;
      ctx.lineWidth = c.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const pts = c.points;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let j = 1; j < pts.length - 1; j++) {
        const xc = (pts[j].x + pts[j + 1].x) / 2;
        const yc = (pts[j].y + pts[j + 1].y) / 2;
        ctx.quadraticCurveTo(pts[j].x, pts[j].y, xc, yc);
      }
      if (pts.length > 1) ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (Math.random() < 0.06 && curves.length < 60) {
      spawnCurve(Math.random() * canvasW, Math.random() * canvasH);
    }
  }
  requestAnimationFrame(animateCanvas);
}

function startCanvasAnim() {
  if (canvasAnimating) return;
  canvasAnimating = true;
  resizeCanvas();
  animateCanvas();
}

function stopCanvasAnim() {
  canvasAnimating = false;
}

/* ---------- Render ---------- */
function ui() {
  return i18nConfig.ui || {};
}

function renderHero() {
  const a = i18nConfig.about || {};
  const u = ui();
  const nameParts = (a.name || '—').split(' ');
  
  // Имя на первой строке, Фамилия — на второй (через flex-direction: column)
  $('heroName').innerHTML = nameParts.length > 1 ?
    `<span>${esc(nameParts[0])}</span><em>${esc(nameParts.slice(1).join(' '))}</em>` :
    `<span>${esc(a.name)}</span>`;
    
  $('heroTagline').textContent = a.tagline || '';
  $('scrollCueText').textContent = u.scroll_cue || 'Scroll to explore';

  document.fonts.ready.then(() => {
    const nameEl = $('heroName');
    const taglineEl = $('heroTagline');
    
    taglineEl.style.maxWidth = 'none';
    const nameWidth = nameEl.offsetWidth;
    
    if (nameWidth > 0) {
      taglineEl.style.maxWidth = `${nameWidth * 0.85}px`;
    }
  });

  const photo = $('heroPhoto');
  photo.src = config.site.photo;
  photo.alt = a.name || '';

  const url = (window.innerWidth < 768 && config.hero.iframe_url_mobile) ?
    config.hero.iframe_url_mobile :
    config.hero.iframe_url;

  if (isPlaceholder(url)) {
    iframe.style.display = 'none';
    iframe.removeAttribute('src');
    startCanvasAnim();
  } else {
    iframe.src = url;
    iframe.style.display = 'block';
    stopCanvasAnim();
  }
}

function renderTabs() {
  const t = (ui().tabs || {});
  document.querySelectorAll('.tab').forEach(tab => {
    const k = tab.dataset.tab;
    tab.textContent = t[k] || k.charAt(0).toUpperCase() + k.slice(1);
  });
}

function renderAbout() {
  const a = i18nConfig.about || {};
  const u = ui();
  const langs = a.spoken_languages || {};
  const langItems = Object.entries(langs).map(([n, l]) =>
    `<div class="language-item"><span>${esc(n)}</span><span class="level">${esc(l)}</span></div>`).join('');

  const edu = a.education || [];
  const eduHtml = edu.map(e => `
    <div class="edu-item">
      <div class="edu-period">${esc(e.period)}</div>
      <div class="edu-degree">${esc(e.degree)}</div>
      <div class="edu-inst">${esc(e.institution)}</div>
    </div>`).join('');

  const interests = a.interests || { items: [] };
  const interestTags = interests.items.map(i => `<span class="interest-tag">${esc(i)}</span>`).join('');

  const hobbies = a.hobbies || { items: [] };
  const hobbyTags = hobbies.items.map(i => `<span class="interest-tag">${esc(i)}</span>`).join('');

  $('panel-about').innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">${esc((u.panels_about||{}).title)}</h2>
      <span class="panel-subtitle">${esc((u.panels_about||{}).sub)}</span>
    </div>
    <div class="about-grid">
      <div class="about-bio">
        <p class="lead">${esc(a.bio_lead)}</p>
        <p>${esc(a.bio)}</p>
        
        <div class="bio-meta-block">
          <div class="meta-label">${esc(interests.title)}</div>
          <div class="interests-list">${interestTags}</div>
        </div>
        
        <div class="bio-meta-block">
          <div class="meta-label">${esc(hobbies.title)}</div>
          <div class="interests-list">${hobbyTags}</div>
        </div>
      </div>
      
      <div class="about-meta">
        <div class="meta-block">
          <div class="meta-label">${esc(u.based_in)}</div>
          <div class="meta-value"><a href="${esc(config.social.location_link)}" target="_blank" rel="noopener">${esc(a.location)}</a></div>
        </div>
        <div class="meta-block">
          <div class="meta-label">${esc(u.spoken_languages)}</div>
          <div class="languages-list">${langItems}</div>
        </div>
        <div class="meta-block">
          <div class="meta-label">Education</div>
          ${eduHtml}
        </div>
      </div>
    </div>
  `;
}

function renderSkills() {
  const s = i18nConfig.skills || {};
  const u = ui();
  const groups = [
    ['languages', u.skills_languages],
    ['frameworks', u.skills_frameworks],
    ['tools', u.skills_tools],
    ['suites', u.skills_suites]
  ].filter(([k]) => s[k] && s[k].length);
  $('panel-skills').innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">${esc((u.panels_skills||{}).title)}</h2>
      <span class="panel-subtitle">${esc((u.panels_skills||{}).sub)}</span>
    </div>
    <div class="skills-groups">
      ${groups.map(([k, label]) => `
        <div class="skill-group">
          <h3>${esc(label)}</h3>
          <div class="skill-tags">${s[k].map(t => `<span class="skill-tag">${esc(t)}</span>`).join('')}</div>
        </div>`).join('')}
    </div>
  `;
}

function renderExperience() {
  const items = i18nConfig.experience || [];
  const u = ui();
  $('panel-experience').innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">${esc((u.panels_experience||{}).title)}</h2>
      <span class="panel-subtitle">${esc((u.panels_experience||{}).sub)}</span>
    </div>
    <div class="experience-list">
      ${items.map(e => `
        <div class="exp-item">
          <div class="exp-period">${esc(e.period)}</div>
          <div>
            <div class="exp-role">${esc(e.role)}</div>
            <div class="exp-company">${esc(e.company)}</div>
            <div class="exp-desc">${esc(e.description)}</div>
          </div>
        </div>`).join('')}
    </div>
  `;
}

function renderProjects() {
  const items = i18nConfig.projects || [];
  const u = ui();
  $('proj-title').textContent = (u.panels_projects || {}).title;
  $('proj-sub').textContent = (u.panels_projects || {}).sub;
  const track = $('projectsTrack');

  track.innerHTML = items.map(p => `
    <a class="carousel-card project-card" href="${esc(p.url)}" target="_blank" rel="noopener">
      <img src="${esc(p.cover || '')}" class="project-cover" alt="${esc(p.name)}" onerror="this.style.display='none'">
      <div class="project-info">
        <div class="project-name">${esc(p.name)}</div>
        <div class="project-desc">${esc(p.description)}</div>
        <div class="project-langs">
          ${(p.languages || []).map(l => `<span class="lang-chip">${esc(l)}</span>`).join('')}
        </div>
      </div>
    </a>
  `).join('');

  setupCarousel(track, $('projPrev'), $('projNext'));
}

function renderPublications() {
  const pubs = i18nConfig.publications || [];
  const confs = i18nConfig.conferences || [];
  const u = ui();
  const panelData = u.panels_publications || {};

  const confHtml = confs.map(c => `
    <a class="conf-item" href="${esc(c.url)}" target="_blank" rel="noopener">
      <img src="${esc(c.cover || '')}" class="conf-cover" alt="${esc(c.title)}" onerror="this.style.display='none'">
      <div class="conf-details">
        <div class="conf-date">${esc(c.date)}</div>
        <div class="conf-title">${esc(c.title)}</div>
        <div class="conf-meta">
          <span class="conf-location">📍 ${esc(c.location)}</span>
          <span class="conf-role">${esc(c.role)}</span>
        </div>
      </div>
    </a>
  `).join('');

  const pubHtml = pubs.map(p => `
    <a class="pub-item" href="${esc(p.url)}" target="_blank" rel="noopener">
      <div class="pub-year">${esc(p.year)}</div>
      <div>
        <div class="pub-title">${esc(p.title)}</div>
        <div class="pub-authors">${esc(p.authors)}</div>
        <div class="pub-venue">${esc(p.venue)}</div>
      </div>
    </a>`).join('');

  $('panel-publications').innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">${esc(panelData.title)}</h2>
      <span class="panel-subtitle">${esc(panelData.sub)}</span>
    </div>
    <div class="research-grid">
      <div class="research-col">
        <h3 class="research-col-title">${esc(panelData.conferences_title)}</h3>
        <div class="conf-list">${confHtml}</div>
      </div>
      <div class="research-col">
        <h3 class="research-col-title">${esc(panelData.publications_title)}</h3>
        <div class="pub-list">${pubHtml}</div>
      </div>
    </div>
  `;
}

function renderPosts() {
  const items = i18nConfig.posts || [];
  const u = ui();
  $('posts-title').textContent = (u.panels_posts || {}).title;
  $('posts-sub').textContent = (u.panels_posts || {}).sub;
  const track = $('postsTrack');
  const locale = currentLang === 'fr' ? 'fr-FR' : (currentLang === 'ru' ? 'ru-RU' : 'en-GB');

  track.innerHTML = items.map(p => {
    const d = new Date(p.date);
    const ds = isNaN(d) ? esc(p.date) : d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    return `
      <a class="carousel-card post-card" href="${esc(p.url)}" target="_blank" rel="noopener">
        <div class="post-info">
          <div class="post-date">${ds}</div>
          <div class="post-title">${esc(p.title)}</div>
          <div class="post-full-text">${esc(p.full_text)}</div>
        </div>
      </a>`;
  }).join('');

  setupCarousel(track, $('postsPrev'), $('postsNext'));
}

function renderContact() {
  const c = ui().contact || {};
  $('contactTitle').innerHTML = c.title || '';
  $('contactIntro').textContent = c.intro || '';
  $('submitBtn').textContent = c.send || 'Send';
  $('lbl-name').textContent = c.name || 'Name';
  $('lbl-email').textContent = c.email || 'Email';
  $('lbl-subject').textContent = c.subject || 'Subject';
  $('lbl-message').textContent = c.message || 'Message';
  const gh = config.social.github,
    tg = config.social.telegram,
    em = config.social.email;
  $('channelGithub').href = gh;
  $('channelGithub').querySelector('.value').textContent = gh.replace(/^https?:\/\//, '');
  $('channelTelegram').href = tg;
  $('channelTelegram').querySelector('.value').textContent = tg.replace(/^https?:\/\//, '');
  $('channelEmail').href = em;
  $('channelEmail').querySelector('.value').textContent = em.replace(/^mailto:/, '');
}

function renderAll() {
  i18nConfig = resolveTranslations(config, currentLang);
  renderHero();
  renderTabs();
  renderAbout();
  renderSkills();
  renderExperience();
  renderProjects();
  renderPublications();
  renderPosts();
  renderContact();
  document.documentElement.lang = currentLang;
  $('footerAuthor').textContent = (i18nConfig.about || {}).name || '';
  $('footerYear').textContent = new Date().getFullYear();
}

/* ---------- Carousel Logic ---------- */
function setupCarousel(track, prevBtn, nextBtn) {
  const container = track.parentElement;
  
  // Если карусель уже была инициализирована, просто обновляем её состояние
  if (track._carouselReady) {
    if (track._updateState) track._updateState();
    return;
  }
  track._carouselReady = true;

  let isDown = false;
  let startX, scrollLeft;
  let hasDragged = false;

  // Функция для проверки краев карусели
  function updateState() {
    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    const currentScroll = track.scrollLeft;
    const tolerance = 2; // Небольшой запас для пиксельных погрешностей

    // Левый край
    if (currentScroll <= tolerance) {
      container.classList.add('at-start');
      prevBtn.classList.add('is-hidden');
    } else {
      container.classList.remove('at-start');
      prevBtn.classList.remove('is-hidden');
    }

    // Правый край
    if (currentScroll >= maxScrollLeft - tolerance) {
      container.classList.add('at-end');
      nextBtn.classList.add('is-hidden');
    } else {
      container.classList.remove('at-end');
      nextBtn.classList.remove('is-hidden');
    }
  }

  // Сохраняем функцию, чтобы вызывать её после смены языка
  track._updateState = updateState;

  // Mouse drag
  track.addEventListener('mousedown', (e) => {
    isDown = true;
    hasDragged = false;
    track.classList.add('dragging');
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
  });

  track.addEventListener('mouseleave', () => {
    isDown = false;
    track.classList.remove('dragging');
  });

  track.addEventListener('mouseup', () => {
    isDown = false;
    track.classList.remove('dragging');
  });

  track.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(x - startX) > 5) hasDragged = true;
    track.scrollLeft = scrollLeft - walk;
  });

  // Touch drag (для сенсорных устройств)
  track.addEventListener('touchstart', (e) => {
    isDown = true;
    hasDragged = false;
    startX = e.touches[0].pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    if (!isDown) return;
    const x = e.touches[0].pageX - track.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(x - startX) > 5) hasDragged = true;
    track.scrollLeft = scrollLeft - walk;
  }, { passive: true });

  track.addEventListener('touchend', () => {
    isDown = false;
  });

  // Prevent <a> navigation after drag
  track.addEventListener('click', (e) => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged = false;
    }
  }, true);

  prevBtn.addEventListener('click', () => {
    const cardWidth = track.querySelector('.carousel-card').offsetWidth + 24;
    track.scrollBy({ left: -cardWidth, behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', () => {
    const cardWidth = track.querySelector('.carousel-card').offsetWidth + 24;
    track.scrollBy({ left: cardWidth, behavior: 'smooth' });
  });

  // Обновляем состояние при прокрутке и изменении размера окна
  track.addEventListener('scroll', updateState, { passive: true });
  window.addEventListener('resize', updateState);

  // Сбрасываем прокрутку в начало при рендере и делаем первичную проверку
  track.scrollLeft = 0;
  updateState();
}

/* ---------- Interactions ---------- */
function activateTab(name) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(p =>
    p.classList.toggle('active', p.dataset.panel === name));
  const contentTop = $('contentArea').getBoundingClientRect().top + window.scrollY;
  const barH = $('topbar').offsetHeight;
  if (window.scrollY < contentTop - barH - 20) {
    window.scrollTo({
      top: contentTop - barH + 15,
      behavior: 'smooth'
    });
  }
}

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => activateTab(t.dataset.tab));
});

/* ---------- Language Dropdown Logic ---------- */
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
    currentLang = li.dataset.lang;
    langDropdown.querySelectorAll('li').forEach(x => x.classList.toggle('active', x === li));
    $('langCurrent').textContent = currentLang.toUpperCase();
    langSwitch.classList.remove('open');
    langTrigger.setAttribute('aria-expanded', 'false');
    renderAll();
  });
});

document.addEventListener('click', (e) => {
  if (!langSwitch.contains(e.target)) {
    langSwitch.classList.remove('open');
    langTrigger.setAttribute('aria-expanded', 'false');
  }
});

$('scrollCue').addEventListener('click', () => {
  const top = $('contentArea').getBoundingClientRect().top + window.scrollY;
  const barH = $('topbar').offsetHeight;
  window.scrollTo({
    top: top - barH + 15,
    behavior: 'smooth'
  });
});

window.addEventListener('scroll', () => {
  const heroBottom = $('hero').offsetHeight - 80;
  if (window.scrollY > heroBottom) {
    $('topbar').classList.add('solid');
  } else {
    $('topbar').classList.remove('solid');
  }
}, {
  passive: true
});

const heroObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    heroVisible = e.isIntersecting;
    if (heroVisible && isPlaceholder(config.hero.iframe_url)) {
      if (!canvasAnimating) startCanvasAnim();
    }
  });
}, {
  threshold: 0.01
});
heroObserver.observe($('hero'));

window.addEventListener('resize', () => {
  if (canvasAnimating) resizeCanvas();
});

$('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('formStatus');
  const btn = $('submitBtn');
  const u = ui().contact || {};

  const name = $('f-name').value.trim();
  const email = $('f-email').value.trim();
  const subject = $('f-subject').value.trim();
  const message = $('f-message').value.trim();

  if (!name || !email || !message) {
    status.textContent = u.form_invalid || "Please fill in name, email and message.";
    status.className = 'form-status error';
    return;
  }

  btn.disabled = true;
  status.textContent = u.sending || 'Sending…';
  status.className = 'form-status';

  const webhook = config.contact.webhook_url;

  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message
        })
      });
      if (res.ok) {
        status.textContent = u.success || 'Message sent.';
        status.className = 'form-status success';
        $('contactForm').reset();
      } else {
        throw new Error('Webhook failed');
      }
    } catch (err) {
      status.textContent = u.error || 'Could not send.';
      status.className = 'form-status error';
    } finally {
      btn.disabled = false;
    }
  } else if (config.contact.fallback_telegram) {
    const bot = config.contact.telegram_bot;
    const text = `New portfolio message\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`;
    window.open(`https://t.me/${bot}?start=${encodeURIComponent(text)}`, '_blank');
    status.textContent = u.success || 'Opening Telegram...';
    status.className = 'form-status success';
    btn.disabled = false;
  } else {
    status.textContent = u.error || 'Messaging is not configured.';
    status.className = 'form-status error';
    btn.disabled = false;
  }
});

renderAll();