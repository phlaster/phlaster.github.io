const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
} [c]));

const formatText = (s) => {
  if (!s) return '';
  let str = esc(s);
  str = str.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  str = str.replace(/__([^_]+)__/g, '<em>$1</em>');
  str = str.replace(/\r\n/g, '\n');
  const paragraphs = str.split(/\n{2,}/).map(p => p.trim()).filter(p => p !== '');
  const formatted = paragraphs.map(p => p.replace(/\s*\n\s*/g, ' '));
  return formatted.join('</p><p>');
};

function updateFavicon(fullName) {
  const css = getComputedStyle(document.documentElement);
  const darkBg = css.getPropertyValue('--color-dark-bg').trim() || '#070D15';
  const lightFg = css.getPropertyValue('--color-dark-fg').trim() || '#EDEDEE';
  const accent = css.getPropertyValue('--color-accent').trim() || '#5F9F59';

  const letter = esc((fullName || '').trim().charAt(0).toUpperCase() || '?');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<rect x="3" y="3" width="94" height="94" rx="21" fill="${darkBg}" stroke="${lightFg}" stroke-opacity="0.35" stroke-width="3"/>` +
    `<text x="50" y="50" dy=".35em" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-size="75" font-weight="700" fill="${accent}">${letter}</text>` +
    `</svg>`;

  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export function renderContent(i18nConfig, lang) {
  document.documentElement.lang = lang;

  const a = i18nConfig.about || {};
  const fullName = a.name || '—';
  updateFavicon(fullName);
  const nameParts = fullName.split(/\s+/).filter(p => p.length > 0);

  const firstWord = nameParts[0] || '';
  const lastWord = nameParts[nameParts.length - 1] || '';
  document.title = firstWord ?
    `${firstWord[0]}.${nameParts.length >= 2 ? ' ' + lastWord : ''}, CV` :
    'CV';

  const brandEl = document.querySelector('.brand');
  if (brandEl) {
    if (nameParts.length >= 2) {
      const firstInitial = nameParts[0].charAt(0).toUpperCase();
      const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
      brandEl.innerHTML = `${firstInitial}<span class="dot">·</span>${lastInitial}`;
    } else if (nameParts.length === 1) {
      brandEl.innerHTML = `${nameParts[0].charAt(0).toUpperCase()}<span class="dot">·</span>`;
    } else {
      brandEl.innerHTML = `?<span class="dot">·</span>?`;
    }
  }

  const ui = i18nConfig.ui || {};
  const sections = ui.sections || {};

  const navTitles = {
    about: sections.about?.nav || sections.about?.title,
    career: sections.career?.nav || sections.career?.title,
    projects: sections.projects?.nav || sections.projects?.title,
    research: sections.research?.nav || sections.research?.title,
    documents: sections.documents?.nav || sections.documents?.title,
    contact: ui.write_me
  };

  document.querySelectorAll('.nav-link').forEach(link => {
    const key = link.dataset.nav;
    if (navTitles[key]) link.textContent = navTitles[key];
  });

  // HERO
  $('heroName').innerHTML = nameParts.length > 1 ? `<span>${esc(nameParts[0])}</span><em>${esc(nameParts.slice(1).join(' '))}</em>` : `<span>${esc(a.name)}</span>`;
  $('heroTagline').textContent = a.tagline || '';
  $('heroPhoto').src = i18nConfig.site.photo_top;
  $('scrollCueText').textContent = ui.scroll_cue;

  const iframe = $('heroIframe');
  const heroUrl = i18nConfig.hero?.iframe_url;
  if (heroUrl && !heroUrl.includes('...')) {
    if (iframe.dataset.src !== heroUrl) {
      iframe.dataset.src = heroUrl;
      iframe.classList.remove('is-loaded');
      
      iframe.onload = () => {
        requestAnimationFrame(() => {
          iframe.classList.add('is-loaded');
        });
      };
      
      iframe.src = heroUrl;
    }
    iframe.style.display = 'block';
  } else {
    iframe.style.display = 'none';
  }

  // === Draw Hint Text ===
  const drawHint = $('heroDrawHint');
  if (drawHint) {
    drawHint.textContent = ui.draw_hint || 'Try drawing on the background';
  }

  // ABOUT
  $('about-title').textContent = sections.about?.title || '';
  $('about-sub').textContent = sections.about?.sub || '';

  const interests = a.interests || {
    items: []
  };
  const hobbies = a.hobbies || {
    items: []
  };
  const social = a.social || {
    items: []
  };

  $('about-content').innerHTML = `
    <div class="about-grid">
      <div class="about-bio">
        <p>${formatText(a.bio)}</p>
      </div>
      <div class="about-meta">
        <div class="meta-block">
          <div class="meta-label">${esc(ui.based_in)}</div>
          <div class="meta-value"><a href="https://www.openstreetmap.org/?query=${esc(a.location)}" target="_blank">${esc(a.location)}</a></div>
        </div>
        <div class="meta-block">
          <div class="meta-label">${esc(interests.title)}</div>
          <div class="skill-tags">${interests.items.map(i => `<span class="skill-tag">${esc(i)}</span>`).join('')}</div>
        </div>
        <div class="meta-block">
          <div class="meta-label">${esc(hobbies.title)}</div>
          <div class="skill-tags">${hobbies.items.map(i => `<span class="skill-tag">${esc(i)}</span>`).join('')}</div>
        </div>
        <div class="meta-block">
          <div class="meta-label">${esc(social.title)}</div>
          <div class="about-socials">
            ${social.items.map(icon => `
              <a href="${esc(icon.url)}" class="about-social-link" target="_blank" rel="noopener noreferrer" title="${esc(icon.key)}">
                <img src="${esc(icon.icon)}" alt="${esc(icon.key)}" loading="lazy">
              </a>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // CAREER & SKILLS (Education and career)
  $('career-title').textContent = sections.career?.title || '';
  $('career-sub').textContent = sections.career?.sub || '';
  const timeline = i18nConfig.timeline || [];
  const skillGroups = i18nConfig.skill_groups || [];

  const timelineHtml = timeline.map(e => `
    <div class="timeline-item" data-place="${esc(e.place_id || '')}" data-url="${esc(e.url || '#')}">
      <div class="timeline-period">${esc(e.period)}</div>
      <div class="timeline-content">
        <div class="timeline-org">${esc(e.organization)}</div>
        <div class="timeline-role">${esc(e.role)}</div>
        <div class="timeline-desc">${esc(e.description)}</div>
      </div>
      <a class="timeline-link-btn" href="${esc(e.url || '#')}" target="_blank" rel="noopener" aria-label="Open link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </a>
      ${e.url && e.url !== '#' ? `<a href="${esc(e.url)}" class="print-only-block-link" target="_blank" rel="noopener"></a>` : ''}
    </div>
  `).join('');

  const skillsHtml = skillGroups.map(g => `
    <div class="skill-group">
      <div class="timeline-period">${esc(g.title)}</div>
      <div class="skill-tags">${(g.items||[]).map(i => `<span class="skill-tag" data-places="${esc((i.places || []).join(' '))}">${esc(i.name)}</span>`).join('')}</div>
    </div>
  `).join('');

  $('career-content').innerHTML = `
    <div class="career-grid">
      <div class="career-col">
        <h3 class="research-col-title">${esc(ui.timeline_title || 'Timeline')}</h3>
        <div class="timeline-list">${timelineHtml}</div>
      </div>
      <div class="career-col">
        <h3 class="research-col-title">${esc(ui.expertise_title || 'Expertise')}</h3>
        <div class="skills-groups">${skillsHtml}</div>
      </div>
    </div>
  `;
  // PROJECTS
  $('proj-title').textContent = sections.projects?.title || '';
  $('proj-sub').textContent = sections.projects?.sub || '';
  $('projects-content').innerHTML = `
    <div class="projects-grid">
      ${(i18nConfig.projects || []).map(p => `
        <article class="project-card" data-repo-url="${esc(p.url)}" tabindex="0" role="button" aria-label="View README for ${esc(p.name)}">
          <img src="${esc(p.cover)}" class="project-cover" alt="${esc(p.name)}" loading="lazy">
          <div class="project-info">
            <div class="project-name">${esc(p.name)}</div>
            <div class="project-desc">${esc(p.description)}</div>
            <div class="project-langs">${(p.languages || []).map(l => `<span class="lang-chip">${esc(l)}</span>`).join('')}</div>
          </div>
          <a class="project-link-btn" href="${esc(p.url)}" target="_blank" rel="noopener" aria-label="Open GitHub repository">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
          <a href="${esc(p.url)}" class="print-only-block-link" target="_blank" rel="noopener"></a>
        </article>`).join('')}
    </div>
  `;

  // RESEARCH
  $('research-title').textContent = sections.research?.title || '';
  $('research-sub').textContent = sections.research?.sub || '';
  const pubs = i18nConfig.publications || [];
  const confs = i18nConfig.conferences || [];
  const grants = i18nConfig.grants || [];

  const renderItem = (item, showImage = false) => {
    const date = item.date || item.year;
    const meta = [item.authors, item.role, item.venue, item.location ? `${item.location}` : ''].filter(Boolean).join(' · ');
    return `
      <a class="research-item" href="${esc(item.url || '#')}" target="_blank" rel="noopener">
        ${showImage && item.cover ? `<img src="${esc(item.cover)}" class="research-cover" alt="${esc(item.title)}" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="research-details">
          ${date ? `<div class="research-date">${esc(date)}</div>` : ''}
          <div class="research-title">${esc(item.title)}</div>
          ${meta ? `<div class="research-meta">${esc(meta)}</div>` : ''}
          ${item.description ? `<div class="research-meta">${esc(item.description)}</div>` : ''}
          ${item.pdf ? `<button class="view-pdf-btn" data-pdf="${esc(item.pdf)}" type="button">${esc(ui.view_pdf || 'Open PDF')}</button>` : ''}
        </div>
      </a>
    `;
  };

  $('research-content').innerHTML = `
  <div class="research-grid">
    <div class="research-col">
      <h3 class="research-col-title">${esc(sections.research?.conf || '')}</h3>
      <div class="research-list">${confs.map(c => renderItem(c, true)).join('')}</div>
    </div>
    <div class="research-col">
      <h3 class="research-col-title">${esc(sections.research?.pubs || '')}</h3>
      <div class="research-list">${pubs.map(p => renderItem(p, false)).join('')}</div>
    </div>
    <div class="research-col">
      <h3 class="research-col-title">${esc(sections.research?.grants || '')}</h3>
      <div class="research-list">${grants.map(g => renderItem(g, false)).join('')}</div>
    </div>
  </div>
`;

  // Функция для формирования абсолютного URL для печатной версии PDF
  const deploySiteUrl = import.meta.env.VITE_SITE_URL || '';
  const getPrintUrl = (url) => {
    if (!url) return '#';
    if (url.startsWith('http')) return url;
    
    // Если мы знаем URL сайта (GitHub Pages), используем его
    if (deploySiteUrl) {
      const base = deploySiteUrl.endsWith('/') ? deploySiteUrl : deploySiteUrl + '/';
      return new URL(url.replace(/^\.\//, ''), base).href;
    }
    
    // Fallback: если деплой неизвестен (локальная печать), используем текущий адрес
    const origin = window.location.origin;
    const base = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/';
    return new URL(url.replace(/^\.\//, ''), origin + base).href;
  };

  // DOCUMENTS
  $('docs-title').textContent = sections.documents?.title || '';
  $('docs-sub').textContent = sections.documents?.sub || '';

  const docGroupsConfig = i18nConfig.document_groups || {};
  const docs = (i18nConfig.documents || []).filter(d => !d.languages || d.languages.includes(lang));

  // Распределяем документы по группам
  const groupedDocs = {};
  docs.forEach(d => {
    (d.groups || []).forEach(g => {
      if (!groupedDocs[g]) groupedDocs[g] = [];
      groupedDocs[g].push(d);
    });
  });

  // Сортируем документы внутри каждой группы по дате (от новых к старым).
  // Если даты совпадают, исходный порядок сохраняется (стабильная сортировка).
  Object.keys(groupedDocs).forEach(gKey => {
    groupedDocs[gKey].sort((a, b) => {
      const dateA = String(a.date || '');
      const dateB = String(b.date || '');
      return dateB.localeCompare(dateA);
    });
  });

  // Генерируем HTML для групп
  const docGroupsHtml = Object.keys(docGroupsConfig).map(gKey => {
    const groupConfig = docGroupsConfig[gKey];
    const items = groupedDocs[gKey] || [];

    if (items.length === 0) return '';

    const renderDocItem = (d) => `
      <div class="doc-item">
        <span class="doc-date">${esc(d.date || '')}</span>
        <div class="doc-title">${esc(d.title)}</div>
        ${d.url ? `<button class="view-pdf-btn" data-pdf="${esc(d.url)}" type="button">${esc(ui.view_pdf || 'Open PDF')}</button>` : ''}
        ${d.url ? `<a href="${esc(getPrintUrl(d.url))}" class="print-only-block-link" target="_blank" rel="noopener"></a>` : ''}
      </div>
    `;

    // Оборачиваем заголовок и ПЕРВЫЙ документ в неразрывный блок
    const startBlock = `
      <div class="doc-group-start">
        <h3 class="doc-group-title">${esc(groupConfig.title)}</h3>
        ${renderDocItem(items[0])}
      </div>
    `;

    // Остальные документы (если они есть)
    const restItemsHtml = items.slice(1).map(renderDocItem).join('');

    return `
      <div class="doc-group">
        ${startBlock}
        ${restItemsHtml}
      </div>
    `;
  }).filter(Boolean).join('');

  $('documents-content').innerHTML = `
    <div class="documents-grid">
      ${docGroupsHtml}
    </div>
  `;

  // CONTACT UI
  const c = ui.contact || {};
  $('contactTitle').innerHTML = c.title;
  $('contactIntro').textContent = c.intro;
  $('printContactText').textContent = c.print_contact_text || c.intro;
  $('leaveContactsBtn').querySelector('span').textContent = c.leave_contacts || 'Leave contacts';
  $('lbl-name').textContent = c.name;
  $('lbl-email').textContent = c.email;
  $('lbl-subject').textContent = c.subject;
  $('lbl-message').textContent = c.message;

  const contactPhoto = $('contactPhoto');
  if (contactPhoto) {
    contactPhoto.src = i18nConfig.site.photo_bottom;
  }

  $('footerAuthor').textContent = a.name || '';
  $('footerYear').textContent = new Date().getFullYear();

  // === DEPLOY INFO ===
  const deployDate = import.meta.env.VITE_DEPLOY_DATE || 'Local Dev';
  const repoUrl = import.meta.env.VITE_REPO_URL || '#';

  const ghPagesLink = $('ghPagesLink');
  if (ghPagesLink) ghPagesLink.href = repoUrl;

  const deployDateText = $('deployDateText');
  if (deployDateText) deployDateText.textContent = ` · ${deployDate}`;

  // === PDF FOOTER ===
  const genDate = new Date().toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const siteUrl = window.location.origin;

  const pdfFooterTemplate = ui.pdf?.footer_text || "Generated from interactive <a href=\"{url}\" target=\"_blank\">portfolio</a> on {gen_date} · Last update: {deploy_date}";
  const pdfFooterText = pdfFooterTemplate
    .replace('{url}', siteUrl)
    .replace('{gen_date}', genDate)
    .replace('{deploy_date}', deployDate);

  const pdfFooterInfo = $('pdfFooterInfo');
  if (pdfFooterInfo) pdfFooterInfo.innerHTML = pdfFooterText;
}