import { parse } from 'smol-toml';
import tomlString from './content.toml?raw';

const config = parse(tomlString);

let currentLang = config.site.default_lang || 'en';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- Hero canvas placeholder ---------- */
const PLACEHOLDER_PREFIX = 'http://my.domain.name/';
const isPlaceholder = url => !url || url.startsWith(PLACEHOLDER_PREFIX);

const canvas = $('heroCanvas');
const ctx = canvas.getContext('2d');
const iframe = $('heroIframe');
let canvasW = 0, canvasH = 0;
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
    points: [{ x, y }],
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

let isDragging = false, lastSpawn = 0;
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
      if (c.life <= 0) { curves.splice(i, 1); continue; }

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
function stopCanvasAnim() { canvasAnimating = false; }

/* ---------- Render ---------- */
function ui() { return config[currentLang].ui || {}; }

function renderHero() {
  const a = config[currentLang].about || {};
  const u = ui();
  const nameParts = (a.name || '—').split(' ');
  $('heroName').innerHTML = nameParts.length > 1
    ? `${esc(nameParts[0])} <em>${esc(nameParts.slice(1).join(' '))}</em>`
    : esc(a.name);
  $('heroTagline').textContent = a.tagline || '';
  $('heroLocation').textContent = a.location || '';
  $('heroLabelTop').textContent = u.hero_label || 'Portfolio';
  $('scrollCueText').textContent = u.scroll_cue || 'Scroll to explore';
  $('heroInteractHint').textContent = u.hero_interact || '';
  const photo = $('heroPhoto');
  photo.src = config.site.photo;
  photo.alt = a.name || '';

  const url = (window.innerWidth < 768 && config.hero.iframe_url_mobile)
    ? config.hero.iframe_url_mobile
    : config.hero.iframe_url;

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
  const a = config[currentLang].about || {};
  const u = ui();
  const langs = a.spoken_languages || {};
  const langItems = Object.entries(langs).map(([n, l]) =>
    `<div class="language-item"><span>${esc(n)}</span><span class="level">${esc(l)}</span></div>`).join('');
  $('panel-about').innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">${esc((u.panels_about||{}).title)}</h2>
      <span class="panel-subtitle">${esc((u.panels_about||{}).sub)}</span>
    </div>
    <div class="about-grid">
      <div class="about-bio">
        <p class="lead">${esc(a.bio_lead)}</p>
        <p>${esc(a.bio)}</p>
      </div>
      <div class="about-meta">
        <div class="meta-block">
          <div class="meta-label">${esc(u.based_in)}</div>
          <div class="meta-value"><a href="${esc(config.social.location_link)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;border-bottom:1px solid var(--line)">${esc(a.location)}</a></div>
        </div>
        <div class="meta-block">
          <div class="meta-label">${esc(u.spoken_languages)}</div>
          <div class="languages-list">${langItems}</div>
        </div>
      </div>
    </div>
  `;
}

function renderSkills() {
  const s = config[currentLang].skills || {};
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
  const items = config[currentLang].experience || [];
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
  const items = (config[currentLang].projects || []).filter(p => p.featured);
  const u = ui();
  $('panel-projects').innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">${esc((u.panels_projects||{}).title)}</h2>
      <span class="panel-subtitle">${esc((u.panels_projects||{}).sub)}</span>
    </div>
    <div class="projects-grid">
      ${items.map(p => `
        <a class="project-card" href="https://github.com/${esc(p.repo)}" target="_blank" rel="noopener">
          <div class="project-header">
            <div class="project-name">${esc(p.name)}</div>
            <div class="project-stars">★ ${esc(p.stars)}</div>
          </div>
          <div class="project-desc">${esc(p.description)}</div>
          <div class="project-meta">
            <span class="project-lang">${esc(p.language)}</span>
            <span class="project-arrow">↗</span>
          </div>
        </a>`).join('')}
    </div>
  `;
}

function renderPublications() {
  const items = config[currentLang].publications || [];
  const u = ui();
  $('panel-publications').innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">${esc((u.panels_publications||{}).title)}</h2>
      <span class="panel-subtitle">${esc((u.panels_publications||{}).sub)}</span>
    </div>
    <div class="pub-list">
      ${items.map(p => `
        <a class="pub-item" href="${esc(p.url)}" target="_blank" rel="noopener">
          <div class="pub-year">${esc(p.year)}</div>
          <div>
            <div class="pub-title">${esc(p.title)}</div>
            <div class="pub-authors">${esc(p.authors)}</div>
            <div class="pub-venue">${esc(p.venue)}</div>
          </div>
          <div class="pub-link">↗</div>
        </a>`).join('')}
    </div>
  `;
}

function renderPosts() {
  const items = config[currentLang].posts || [];
  const u = ui();
  const locale = currentLang === 'fr' ? 'fr-FR' : 'en-GB';
  $('panel-posts').innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">${esc((u.panels_posts||{}).title)}</h2>
      <span class="panel-subtitle">${esc((u.panels_posts||{}).sub)}</span>
    </div>
    <div class="posts-grid">
      ${items.map(p => {
        const d = new Date(p.date);
        const ds = isNaN(d) ? esc(p.date) : d.toLocaleDateString(locale, { year:'numeric', month:'short', day:'numeric' });
        return `
          <a class="post-card" href="${esc(p.url)}" target="_blank" rel="noopener">
            <div class="post-date">${ds}</div>
            <div class="post-title">${esc(p.title)}</div>
            <div class="post-snippet">${esc(p.snippet)}</div>
            <div class="post-arrow">↗ Telegram</div>
          </a>`;
      }).join('')}
    </div>
  `;
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
  const gh = config.social.github, tg = config.social.telegram, em = config.social.email;
  $('channelGithub').href = gh;
  $('channelGithub').querySelector('.value').textContent = gh.replace(/^https?:\/\//, '');
  $('channelTelegram').href = tg;
  $('channelTelegram').querySelector('.value').textContent = tg.replace(/^https?:\/\//, '');
  $('channelEmail').href = em;
  $('channelEmail').querySelector('.value').textContent = em.replace(/^mailto:/, '');
}

function renderAll() {
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
  $('footerAuthor').textContent = (config[currentLang].about || {}).name || '';
  $('footerYear').textContent = new Date().getFullYear();
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
    window.scrollTo({ top: contentTop - barH, behavior: 'smooth' });
  }
}

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => activateTab(t.dataset.tab));
});

document.querySelectorAll('.lang-switch button').forEach(b => {
  b.addEventListener('click', () => {
    currentLang = b.dataset.lang;
    document.querySelectorAll('.lang-switch button').forEach(x =>
      x.classList.toggle('active', x === b));
    renderAll();
  });
});

$('scrollCue').addEventListener('click', () => {
  const top = $('contentArea').getBoundingClientRect().top + window.scrollY;
  const barH = $('topbar').offsetHeight;
  window.scrollTo({ top: top - barH, behavior: 'smooth' });
});

window.addEventListener('scroll', () => {
  const heroBottom = $('hero').offsetHeight - 80;
  if (window.scrollY > heroBottom) {
    $('topbar').classList.add('solid');
  } else {
    $('topbar').classList.remove('solid');
  }
}, { passive: true });

const heroObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    heroVisible = e.isIntersecting;
    if (heroVisible && isPlaceholder(config.hero.iframe_url)) {
      if (!canvasAnimating) startCanvasAnim();
    }
  });
}, { threshold: 0.01 });
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
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